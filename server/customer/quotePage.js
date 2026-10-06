// The customer's side of Phase C: resolving a quote link, recording views, the dates offered, and
// date requests.
//
// Nothing here reads a quote's live fields: the page is built from the stored `sent_snapshot` (what
// was emailed), and only the reference, status and validity are read besides. Internal notes, travel
// working and draft fields are never selected.

import { requireSchema } from '../admin/schema.js';
import { linkBaseUrl, linksConfigured, verifyToken, viewable } from '../admin/quoteLinks.js';
import { safeResendDetail } from '../../functions/api/quote.js';
import { addDays, ukToday } from '../../src/lib/admin/quotes.js';
import { CUSTOMER_NOTE_MAX, REQUEST_WINDOW, cleanNote, periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';

const now = () => new Date().toISOString();
const INTERNAL_TO = 'newquote@ross360.co.uk';

/**
 * Resolve a token to what the customer may see. Returns { state, ... } where state is:
 * - 'valid': sent and within "valid until" (dates can be requested);
 * - 'expired': sent, past "valid until" but within the 90-day viewing window (no date requests);
 * - 'replaced': superseded by a sent revision;
 * - 'unavailable': not sent (draft, sending, send unknown, discarded), or links not set up;
 * - 'gone': any invalid, unknown, revoked, wrong-key or past-window link (all answered the same).
 */
export async function resolveQuoteLink(env, token, today = ukToday()) {
  if (!env.DB || !linksConfigured(env)) return { state: 'unavailable' };
  await requireSchema(env.DB);
  const verified = await verifyToken(env, token);
  if (!verified) return { state: 'gone' };
  const row = await env.DB.prepare(
    `SELECT l.id AS link_row_id, l.key_id, l.revoked_at, l.first_viewed_at, l.last_viewed_at,
       q.id AS quote_id, q.enquiry_id, q.reference, q.status, q.valid_until, q.sent_snapshot
     FROM quote_links l JOIN quotes q ON q.id = l.quote_id
     WHERE l.link_id = ?`,
  )
    .bind(verified.linkId)
    .first();
  if (!row || row.key_id !== verified.keyId || row.revoked_at) return { state: 'gone' };

  const withinWindow = Boolean(row.valid_until) && today <= addDays(row.valid_until, 90);
  if (row.status === 'superseded') return withinWindow ? { state: 'replaced' } : { state: 'gone' };
  if (row.status !== 'sent') return { state: 'unavailable' };
  if (!viewable(row.status, row.valid_until, today)) return { state: 'gone' };

  let snapshot;
  try {
    snapshot = JSON.parse(row.sent_snapshot);
  } catch {
    return { state: 'unavailable' };
  }
  return {
    state: today <= row.valid_until ? 'valid' : 'expired',
    linkId: verified.linkId,
    linkRowId: row.link_row_id,
    quoteId: row.quote_id,
    enquiryId: row.enquiry_id,
    reference: row.reference,
    validUntil: row.valid_until,
    lastViewedAt: row.last_viewed_at,
    snapshot,
  };
}

/**
 * Count a view of the quote page. The timeline gets an entry for the first view, then at most one a
 * day. No IP address or browser details are recorded.
 */
export async function recordView(db, ctx, at = new Date()) {
  const iso = at.toISOString();
  const logIt = !ctx.lastViewedAt || ukToday(new Date(ctx.lastViewedAt)) < ukToday(at);
  const statements = [
    db
      .prepare(
        `UPDATE quote_links SET view_count = view_count + 1, first_viewed_at = COALESCE(first_viewed_at, ?), last_viewed_at = ?
         WHERE id = ?`,
      )
      .bind(iso, iso, ctx.linkRowId),
  ];
  if (logIt) {
    statements.push(
      db
        .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, 'customer', 'quote_viewed', ?)`)
        .bind(ctx.enquiryId, iso, JSON.stringify({ quote: ctx.reference, first: !ctx.lastViewedAt })),
    );
  }
  await db.batch(statements);
}

/** The customer's pending date request for a quote, or null. */
export async function pendingRequest(db, quoteId) {
  return db
    .prepare(
      `SELECT r.id, r.customer_note, s.slot_date, s.period
       FROM date_requests r JOIN availability_slots s ON s.id = r.slot_id
       WHERE r.quote_id = ? AND r.status = 'pending'`,
    )
    .bind(quoteId)
    .first();
}

/** The first and last dates a customer can request, today (UK). */
export function requestWindow(today = ukToday()) {
  return { from: addDays(today, REQUEST_WINDOW.minDays), to: addDays(today, REQUEST_WINDOW.maxDays) };
}

/** Open slots within the request window. Other customers' requests are never shown or counted. */
export async function openSlots(db, today = ukToday()) {
  const { from, to } = requestWindow(today);
  const { results } = await db
    .prepare(
      `SELECT id, slot_date, period FROM availability_slots
       WHERE status = 'open' AND slot_date >= ? AND slot_date <= ?
       ORDER BY slot_date, CASE period WHEN 'am' THEN 1 WHEN 'pm' THEN 2 ELSE 3 END`,
    )
    .bind(from, to)
    .all();
  return results;
}

const isSlotNotOpen = (error) => /slot_not_open/.test(String(error?.message));

/**
 * Save a date request for a valid quote. `slotId` is the chosen slot, `note` the customer's note.
 *
 * One transaction: the quote's earlier pending request (if any) is marked replaced, the new request
 * is inserted, and both are written to the timeline. The database refuses the insert if the slot is
 * not open at that moment (date_requests_slot_open), which rolls the whole request back: a slot
 * closed first always wins, and the customer's earlier request is left as it was.
 *
 * Returns { result: 'ok' | 'invalid' | 'note_too_long' | 'slot_unavailable' | 'not_allowed', requestId? }.
 */
export async function submitDateRequest(env, ctx, { slotId, note }, today = ukToday()) {
  const db = env.DB;
  if (ctx.state !== 'valid') return { result: 'not_allowed' };
  if (!Number.isSafeInteger(slotId) || slotId < 1) return { result: 'invalid' };
  const text = cleanNote(note);
  if (text.length > CUSTOMER_NOTE_MAX) return { result: 'note_too_long' };

  // A clear answer for a slot that is already closed or outside the window. The database check below
  // is what makes the refusal atomic.
  const slot = await db.prepare(`SELECT id, slot_date, period, status FROM availability_slots WHERE id = ?`).bind(slotId).first();
  const { from, to } = requestWindow(today);
  if (!slot || slot.status !== 'open' || slot.slot_date < from || slot.slot_date > to) return { result: 'slot_unavailable' };

  const at = now();
  const stillSent = `EXISTS (SELECT 1 FROM quotes WHERE id = ? AND status = 'sent')`;
  let results;
  try {
    results = await db.batch([
      db
        .prepare(
          `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
           SELECT ?, ?, 'customer', 'date_request_replaced', json_object('quote', ?, 'date', s.slot_date, 'period', s.period)
           FROM date_requests r JOIN availability_slots s ON s.id = r.slot_id
           WHERE r.quote_id = ? AND r.status = 'pending' AND ${stillSent}`,
        )
        .bind(ctx.enquiryId, at, ctx.reference, ctx.quoteId, ctx.quoteId),
      db
        .prepare(`UPDATE date_requests SET status = 'replaced', updated_at = ? WHERE quote_id = ? AND status = 'pending' AND ${stillSent}`)
        .bind(at, ctx.quoteId, ctx.quoteId),
      db
        .prepare(
          `INSERT INTO date_requests (quote_id, slot_id, customer_note, status, created_at, updated_at)
           SELECT ?, ?, ?, 'pending', ?, ? WHERE ${stillSent}
           RETURNING id`,
        )
        .bind(ctx.quoteId, slot.id, text, at, at, ctx.quoteId),
      db
        .prepare(
          `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
           SELECT ?, ?, 'customer', 'date_requested', ? WHERE ${stillSent}`,
        )
        .bind(
          ctx.enquiryId,
          at,
          JSON.stringify({ quote: ctx.reference, date: slot.slot_date, period: slot.period, note: Boolean(text) }),
          ctx.quoteId,
        ),
    ]);
  } catch (error) {
    if (isSlotNotOpen(error)) return { result: 'slot_unavailable' };
    throw error;
  }
  const created = results[2].results?.[0];
  if (!created) return { result: 'not_allowed' };

  const request = { id: created.id, date: slot.slot_date, period: slot.period, note: text };
  const sent = await notifyDateRequest(env, ctx, request);
  if (!sent.ok) {
    try {
      await db
        .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, 'customer', 'notification_failed', ?)`)
        .bind(ctx.enquiryId, now(), JSON.stringify({ email: 'date_request', quote: ctx.reference, status: sent.status }))
        .run();
    } catch (error) {
      console.error(`Could not record the failed date request notification on ${ctx.reference}: ${error.message}`);
    }
  }
  return { result: 'ok', requestId: created.id };
}

const oneLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** The internal email to newquote@ (QUOTE_TO_EMAIL overrides it). Nothing is ever sent to the customer. */
export function dateRequestEmail(env, ctx, request) {
  const { customer = {} } = ctx.snapshot;
  const when = `${weekdayDate(request.date)}, ${periodLabel(request.period)}`;
  const adminUrl = `${linkBaseUrl(env)}/admin#/quotes/${ctx.reference}`;
  const rows = [
    ['Quote', ctx.reference],
    ['Enquiry reference', ctx.snapshot.enquiryReference || ''],
    ['Customer', [customer.name, customer.business].filter(Boolean).join(', ')],
    ['Preferred date', when],
    ['Note', request.note || '—'],
  ];
  const text = [
    ...rows.map(([label, value]) => (String(value).includes('\n') ? `${label}:\n${value}` : `${label}: ${value}`)),
    '',
    'Nothing is booked. Confirm the date with the customer, then close the slot in the Admin if it is no longer available.',
    '',
    `Admin: ${adminUrl}`,
  ].join('\n');
  const html =
    '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">' +
    rows
      .map(
        ([label, value]) =>
          '<tr style="border-bottom:1px solid #e4e2dc">' +
          `<td style="vertical-align:top;color:#555;white-space:nowrap"><strong>${escapeHtml(label)}</strong></td>` +
          `<td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
      )
      .join('') +
    '</table>' +
    '<p style="font-family:Arial,sans-serif;font-size:14px">Nothing is booked. Confirm the date with the customer, then close the slot in the Admin if it is no longer available.</p>' +
    `<p style="font-family:Arial,sans-serif;font-size:14px"><a href="${escapeHtml(adminUrl)}">Open ${escapeHtml(ctx.reference)} in the Admin</a></p>`;
  return {
    from: env.QUOTE_FROM_EMAIL,
    to: [env.QUOTE_TO_EMAIL || INTERNAL_TO],
    ...(customer.email ? { reply_to: customer.email } : {}),
    subject: oneLine(`Date request: ${ctx.reference}, ${when}`),
    text,
    html,
  };
}

const RESEND_URL = 'https://api.resend.com/emails';

/** Returns { ok, status }. A failure never undoes the saved request; it is recorded on the timeline. */
async function notifyDateRequest(env, ctx, request) {
  if (!env.RESEND_API_KEY || !env.QUOTE_FROM_EMAIL) {
    console.error('Date request saved, but email is not configured (RESEND_API_KEY and QUOTE_FROM_EMAIL).');
    return { ok: false, status: 'not configured' };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `date-request-${request.id}`,
      },
      body: JSON.stringify(dateRequestEmail(env, ctx, request)),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      let detail = '';
      try {
        detail = safeResendDetail(await res.text());
      } catch {
        detail = '';
      }
      console.error(`Resend request (date request) failed with status ${res.status}; ${detail || '(empty response body)'}`);
    }
    return { ok: res.ok, status: res.status };
  } catch (error) {
    console.error(`Resend request (date request) could not be sent: ${safeResendDetail(`${error?.name}: ${error?.message}`)}`);
    return { ok: false, status: 'not sent' };
  }
}
