// Quotes for the ROSS 360 Admin (Cloudflare D1), Phase B.
//
// A quote belongs to an enquiry and has its own reference (Q-0001, Q-0002, …). Drafts can be changed;
// every saved change raises `version`, and a save or send naming an older version is refused, so two
// tabs cannot overwrite each other and a stale preview cannot be sent. Sending is claimed atomically
// (draft -> sending) before Resend is called, and a sent quote is never changed again: to change it,
// it is revised into a new draft with a new reference. Every action is written to the enquiry's
// timeline. Totals are always calculated here, never taken from the browser.

import { requireSchema } from './schema.js';
import { renderQuote, QUOTE_FROM, QUOTE_BCC } from './quoteRender.js';
import { safeResendDetail } from '../../functions/api/quote.js';
import { activeLink, ensureDraftLink, linksConfigured, quoteUrl } from './quoteLinks.js';
import { customerEmailAllowed } from '../booking/mail.js';
import {
  QUOTE_TEXT_FIELDS,
  SEND_UNKNOWN_AFTER_MS,
  sendProblems,
  ukToday,
  validateQuoteDraft,
} from '../../src/lib/admin/quotes.js';

const now = () => new Date().toISOString();

const SELECT_QUOTE = `
  SELECT q.*, e.reference AS enquiry_reference, e.status AS enquiry_status, o.reference AS revision_of_reference
  FROM quotes q
  JOIN enquiries e ON e.id = q.enquiry_id
  LEFT JOIN quotes o ON o.id = q.revision_of`;

function itemToApi(row) {
  return {
    position: row.position,
    kind: row.kind,
    description: row.description,
    quantity: row.quantity,
    unitPence: row.unit_pence,
    amountPence: row.amount_pence,
  };
}

function toApi(row, items, revisions = []) {
  const quote = {
    reference: row.reference,
    enquiryReference: row.enquiry_reference,
    revisionOf: row.revision_of_reference || null,
    revisions,
    status: row.status,
    version: row.version,
    package: row.package,
    travelPence: row.travel_pence,
    // How the travel amount was arrived at (Admin only; the customer sees only travelPence).
    travelMode: row.travel_mode ?? 'manual',
    travelOneWayTenths: row.travel_one_way_tenths ?? null,
    travelRatePence: row.travel_rate_pence ?? null,
    travelFreeTenths: row.travel_free_tenths ?? null,
    travelCalculatedPence: row.travel_calculated_pence ?? null,
    travelOverride: row.travel_override === 1,
    discountPence: row.discount_pence,
    subtotalPence: row.subtotal_pence,
    totalPence: row.total_pence,
    validDays: row.valid_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    issuedOn: row.issued_on,
    validUntil: row.valid_until,
    sendingStartedAt: row.sending_started_at,
    sentAt: row.sent_at,
    sentBy: row.sent_by,
    sentTo: row.sent_to,
    sentSubject: row.sent_subject,
    resendMessageId: row.resend_message_id,
    // Resend gave no proof either way, or the request stopped before the result was recorded.
    // Never resent automatically; it can only be checked (reconcileQuote).
    sendStatusUnknown: isSendUnknown(row),
    canCheckSend: canReconcile(row),
    checkSendUntil: row.sending_started_at
      ? new Date(new Date(row.sending_started_at).getTime() + RECONCILE_WINDOW_MS).toISOString()
      : null,
    previewedVersion: row.previewed_version ?? null,
    items: items.map(itemToApi),
  };
  for (const [key, field] of Object.entries(QUOTE_TEXT_FIELDS)) quote[key] = row[field.column] ?? '';
  return quote;
}

async function findQuoteRow(db, reference) {
  return db.prepare(`${SELECT_QUOTE} WHERE q.reference = ?`).bind(reference).first();
}

async function loadQuote(db, row) {
  const { results: items } = await db
    .prepare(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY position`)
    .bind(row.id)
    .all();
  const { results: revisions } = await db
    .prepare(`SELECT reference, status FROM quotes WHERE revision_of = ? ORDER BY quote_number`)
    .bind(row.id)
    .all();
  return toApi(row, items, revisions.map((r) => ({ reference: r.reference, status: r.status })));
}

/** One quote with its lines, or null. */
export async function getQuote(db, reference) {
  await requireSchema(db);
  const row = await findQuoteRow(db, reference);
  return row ? loadQuote(db, row) : null;
}

/** The quotes of one enquiry (newest first), or null if the enquiry does not exist. */
export async function listQuotes(db, enquiryReference) {
  await requireSchema(db);
  const enquiry = await db.prepare(`SELECT id FROM enquiries WHERE reference = ?`).bind(enquiryReference).first();
  if (!enquiry) return null;
  const { results } = await db
    .prepare(`${SELECT_QUOTE} WHERE q.enquiry_id = ? ORDER BY q.quote_number DESC`)
    .bind(enquiry.id)
    .all();
  return results.map((row) => ({
    reference: row.reference,
    status: row.status,
    revisionOf: row.revision_of_reference || null,
    totalPence: row.total_pence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at,
  }));
}

const eventStatement = (db, enquiryId, at, actor, type, detail) =>
  db
    .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, ?, ?, ?)`)
    .bind(enquiryId, at, actor, type, JSON.stringify(detail));

/**
 * Start a draft quote for an enquiry, with the next Q reference and the customer's details copied
 * from the enquiry. The counter, the quote and the timeline entry are written in one batch (one
 * transaction), so two quotes created together never share a reference.
 * Returns the new quote, or null if the enquiry does not exist.
 */
export async function createQuote(db, enquiryReference, actor) {
  await requireSchema(db);
  const enquiry = await db.prepare(`SELECT id FROM enquiries WHERE reference = ?`).bind(enquiryReference).first();
  if (!enquiry) return null;
  const at = now();
  const results = await db.batch([
    db.prepare(`UPDATE counters SET value = value + 1 WHERE name = 'quote'`),
    db
      .prepare(
        `INSERT INTO quotes (quote_number, reference, enquiry_id, status, version, customer_name, customer_business,
           customer_email, customer_location, created_at, updated_at)
         SELECT c.value, printf('Q-%04d', c.value), e.id, 'draft', 1, e.name, e.business, e.email, e.location, ?, ?
         FROM counters c, enquiries e WHERE c.name = 'quote' AND e.id = ?
         RETURNING reference`,
      )
      .bind(at, at, enquiry.id),
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, ?, 'quote_created', json_object('quote', printf('Q-%04d', value)) FROM counters WHERE name = 'quote'`,
      )
      .bind(enquiry.id, at, actor),
  ]);
  const created = results[1].results?.[0];
  if (!created) throw new Error('Quote was not created.');
  return getQuote(db, created.reference);
}

// What the timeline records about travel when it changes. The override reason is deliberately left
// out: it stays on the quote, in the Admin, like internal notes.
function travelDetail(values) {
  if (values.travelMode !== 'mileage') return { mode: 'manual', travelPence: values.travelPence };
  return {
    mode: 'mileage',
    oneWayTenths: values.travelOneWayTenths,
    ratePence: values.travelRatePence,
    freeTenths: values.travelFreeTenths,
    calculatedPence: values.travelCalculatedPence,
    travelPence: values.travelPence,
    overridden: values.travelOverride,
  };
}

// The editable parts of a quote, in the form validateQuoteDraft takes.
const EDITABLE = [
  ...Object.keys(QUOTE_TEXT_FIELDS),
  'package',
  'travelMode',
  'travelOneWayTenths',
  'travelOverride',
  'travelPence',
  'discountPence',
  'validDays',
  'items',
];
const TRAVEL_KEYS = ['travelMode', 'travelOneWayTenths', 'travelOverride', 'travelOverrideReason', 'travelPence'];
const CHANGE_LABELS = {
  ...Object.fromEntries(Object.entries(QUOTE_TEXT_FIELDS).map(([key, field]) => [key, field.label])),
  package: 'Package',
  travelPence: 'Travel',
  travelMode: 'Travel method',
  travelOneWayTenths: 'Travel distance',
  travelOverride: 'Travel override',
  discountPence: 'Discount',
  validDays: 'Validity',
  items: 'Lines',
};
const comparable = (key, value) =>
  key === 'items'
    ? JSON.stringify(value.map(({ kind, description, quantity, unitPence }) => ({ kind, description, quantity, unitPence })))
    : value ?? null;

/**
 * Save changes to a draft. `input` holds any of the editable fields (others are ignored, including
 * any totals); fields left out keep their current value. `version` must be the version the
 * administrator last loaded.
 * Returns { result: 'ok' | 'not_found' | 'not_draft' | 'stale' | 'invalid', quote?, validation? }.
 */
export async function updateQuote(db, reference, input, version, actor) {
  await requireSchema(db);
  const row = await findQuoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  const current = await loadQuote(db, row);
  if (current.status !== 'draft') return { result: 'not_draft', quote: current };
  if (current.version !== version) return { result: 'stale', quote: current };

  const merged = {};
  for (const key of EDITABLE) merged[key] = key in input ? input[key] : current[key];
  const validation = validateQuoteDraft(merged);
  if (!validation.valid) return { result: 'invalid', validation };
  const values = validation.values;

  const changed = EDITABLE.filter((key) => comparable(key, values[key]) !== comparable(key, current[key]));
  if (!changed.length) return { result: 'ok', quote: current };

  const at = now();
  // The line writes come first and only run if the quote is still this draft at this version; the
  // quote update then raises the version. All in one transaction, so a concurrent save either wins
  // completely or not at all.
  const stillThisDraft = `EXISTS (SELECT 1 FROM quotes WHERE id = ? AND status = 'draft' AND version = ?)`;
  const statements = [];
  if (changed.includes('items')) {
    statements.push(db.prepare(`DELETE FROM quote_items WHERE quote_id = ? AND ${stillThisDraft}`).bind(row.id, row.id, version));
    values.items.forEach((item, position) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO quote_items (quote_id, position, kind, description, quantity, unit_pence, amount_pence)
             SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${stillThisDraft}`,
          )
          .bind(row.id, position, item.kind, item.description, item.quantity, item.unitPence, item.amountPence, row.id, version),
      );
    });
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, ?, 'quote_updated', ? WHERE ${stillThisDraft}`,
      )
      .bind(
        row.enquiry_id,
        at,
        actor,
        JSON.stringify({
          quote: reference,
          fields: changed.map((key) => CHANGE_LABELS[key]),
          totalPence: values.totalPence,
          ...(changed.some((key) => TRAVEL_KEYS.includes(key)) ? { travel: travelDetail(values) } : {}),
        }),
        row.id,
        version,
      ),
  );
  const textColumns = Object.entries(QUOTE_TEXT_FIELDS);
  statements.push(
    db
      .prepare(
        `UPDATE quotes SET ${textColumns.map(([, field]) => `${field.column} = ?`).join(', ')},
           package = ?, travel_pence = ?, discount_pence = ?, valid_days = ?, subtotal_pence = ?, total_pence = ?,
           travel_mode = ?, travel_one_way_tenths = ?, travel_rate_pence = ?, travel_free_tenths = ?,
           travel_calculated_pence = ?, travel_override = ?,
           version = version + 1, updated_at = ?
         WHERE id = ? AND status = 'draft' AND version = ?
         RETURNING version`,
      )
      .bind(
        ...textColumns.map(([key]) => values[key]),
        values.package,
        values.travelPence,
        values.discountPence,
        values.validDays,
        values.subtotalPence,
        values.totalPence,
        values.travelMode,
        values.travelOneWayTenths,
        values.travelRatePence,
        values.travelFreeTenths,
        values.travelCalculatedPence,
        values.travelOverride ? 1 : 0,
        at,
        row.id,
        version,
      ),
  );
  const results = await db.batch(statements);
  const saved = results[results.length - 1].results?.[0];
  const quote = await getQuote(db, reference);
  if (!saved) return { result: quote.status === 'draft' ? 'stale' : 'not_draft', quote };
  return { result: 'ok', quote };
}

/**
 * Render the customer email for a draft (or discarded draft) as it stands, with today's UK date, or
 * null for any other quote (its stored email is shown instead). Previewing a draft creates its
 * customer link, so the preview carries exactly the link the email will be sent with.
 */
export async function previewOf(env, quote, actor) {
  if (quote.status !== 'draft' && quote.status !== 'discarded') return null;
  const row = await findQuoteRow(env.DB, quote.reference);
  const link =
    quote.status === 'draft'
      ? await ensureDraftLink(env, { id: row.id, enquiryId: row.enquiry_id, reference: quote.reference }, actor)
      : await activeLink(env.DB, row.id);
  const url = link ? await quoteUrl(env, link.key_id, link.link_id) : null;
  return renderQuote(quote, { enquiryReference: quote.enquiryReference, issuedOn: ukToday(), quoteUrl: url });
}

/** The stored email of a quote that has been (or is being) sent. */
export async function sentEmail(db, reference) {
  return db
    .prepare(`SELECT sent_subject AS subject, sent_html AS html, sent_text AS text, sent_to AS "to" FROM quotes WHERE reference = ?`)
    .bind(reference)
    .first();
}

/** Record that a draft was previewed: at most one timeline entry per version. */
export async function recordPreview(db, reference, actor) {
  const row = await db
    .prepare(
      `UPDATE quotes SET previewed_version = version
       WHERE reference = ? AND status = 'draft' AND (previewed_version IS NULL OR previewed_version <> version)
       RETURNING enquiry_id, version`,
    )
    .bind(reference)
    .first();
  if (row) await eventStatement(db, row.enquiry_id, now(), actor, 'quote_previewed', { quote: reference, version: row.version }).run();
}

/** Discard a draft. It is kept (and its reference is not reused), but can no longer be changed or sent. */
export async function discardQuote(db, reference, actor) {
  await requireSchema(db);
  const row = await findQuoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  const discarded = await db
    .prepare(`UPDATE quotes SET status = 'discarded', updated_at = ? WHERE id = ? AND status = 'draft' RETURNING id`)
    .bind(now(), row.id)
    .first();
  if (discarded) await eventStatement(db, row.enquiry_id, now(), actor, 'quote_discarded', { quote: reference }).run();
  return { result: discarded ? 'ok' : 'not_draft', quote: await getQuote(db, reference) };
}

/**
 * Revise a sent quote: copy it into a new draft with a new reference, linked to the original. The
 * original stays as it is until the revision is sent, when it is marked superseded.
 * Returns { result: 'ok' | 'not_found' | 'not_sent' | 'open_revision', quote? }.
 */
export async function reviseQuote(db, reference, actor) {
  await requireSchema(db);
  const row = await findQuoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  if (row.status !== 'sent') return { result: 'not_sent', quote: await loadQuote(db, row) };
  const open = await db
    .prepare(`SELECT reference FROM quotes WHERE revision_of = ? AND status IN ('draft', 'sending', 'send_unknown')`)
    .bind(row.id)
    .first();
  if (open) return { result: 'open_revision', revision: open.reference, quote: await loadQuote(db, row) };
  // A booked quote cannot be replaced: its booking page would disappear.
  const booked = await db
    .prepare(`SELECT 1 FROM bookings WHERE quote_id = ? AND status IN ('holding', 'confirmed', 'cancel_requested')`)
    .bind(row.id)
    .first();
  if (booked) return { result: 'has_booking', quote: await loadQuote(db, row) };

  const at = now();
  const newId = `(SELECT id FROM quotes WHERE quote_number = (SELECT value FROM counters WHERE name = 'quote'))`;
  const results = await db.batch([
    db.prepare(`UPDATE counters SET value = value + 1 WHERE name = 'quote'`),
    db
      .prepare(
        `INSERT INTO quotes (quote_number, reference, enquiry_id, revision_of, status, version, package,
           customer_name, customer_business, customer_email, customer_location, service_description, internal_notes,
           travel_pence, discount_pence, discount_label, subtotal_pence, total_pence, valid_days,
           travel_mode, travel_one_way_tenths, travel_rate_pence, travel_free_tenths, travel_calculated_pence,
           travel_override, travel_override_reason, created_at, updated_at)
         SELECT c.value, printf('Q-%04d', c.value), q.enquiry_id, q.id, 'draft', 1, q.package,
           q.customer_name, q.customer_business, q.customer_email, q.customer_location, q.service_description, q.internal_notes,
           q.travel_pence, q.discount_pence, q.discount_label, q.subtotal_pence, q.total_pence, q.valid_days,
           q.travel_mode, q.travel_one_way_tenths, q.travel_rate_pence, q.travel_free_tenths, q.travel_calculated_pence,
           q.travel_override, q.travel_override_reason, ?, ?
         FROM counters c, quotes q WHERE c.name = 'quote' AND q.id = ? AND q.status = 'sent'
         RETURNING reference`,
      )
      .bind(at, at, row.id),
    db
      .prepare(
        `INSERT INTO quote_items (quote_id, position, kind, description, quantity, unit_pence, amount_pence)
         SELECT ${newId}, position, kind, description, quantity, unit_pence, amount_pence
         FROM quote_items WHERE quote_id = ? ORDER BY position`,
      )
      .bind(row.id),
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, ?, 'quote_revised', json_object('from', ?, 'to', printf('Q-%04d', value)) FROM counters WHERE name = 'quote'`,
      )
      .bind(row.enquiry_id, at, actor, reference),
  ]);
  const created = results[1].results?.[0];
  if (!created) throw new Error('Revision was not created.');
  return { result: 'ok', quote: await getQuote(db, created.reference) };
}

// --- Sending ------------------------------------------------------------------------------------
//
// What Resend's answer proves:
// - 2xx: Resend accepted the email. It is sent.
// - REFUSED statuses: Resend rejected the request before sending anything (bad request, bad key,
//   validation error, rate limit). It is definitely not sent, so the quote can safely go back to draft.
// - Anything else (no answer, a timeout, a network error, a 5xx, a 409 about the idempotency key, or
//   an unexpected status): the email may or may not have gone. The quote is locked as "send status
//   unknown" and can never be edited, discarded or sent again from the Admin. It can only be checked
//   (see reconcileQuote), which never risks a second email.

const RESEND_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 20_000;
const REFUSED = new Set([400, 401, 403, 404, 405, 422, 429]);

// Resend keeps an Idempotency-Key for 24 hours; checking an unknown send relies on it, so it is only
// offered well inside that window.
export const RECONCILE_WINDOW_MS = 23 * 60 * 60 * 1000;

const idempotencyKey = (reference, version) => `quote-${reference}-v${version}`;

// The exact Resend request for a quote. Built from the stored email only, so a later check sends a
// byte-identical request under the same Idempotency-Key.
function resendPayload({ to, subject, html, text }) {
  return { from: QUOTE_FROM, to: [to], bcc: [QUOTE_BCC], reply_to: QUOTE_FROM, subject, html, text };
}

/** Returns { outcome: 'accepted' | 'refused' | 'unknown', status, id }. */
async function callResend(env, payload, key) {
  let res;
  try {
    res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        // Resend answers a repeated request with the same key and payload with the original
        // response, without sending again (keys are kept for 24 hours).
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
  } catch (error) {
    // No answer: the request may still have reached Resend.
    console.error(`Resend request (quote) got no answer: ${safeResendDetail(`${error?.name}: ${error?.message}`)}`);
    return { outcome: 'unknown', status: error?.name === 'TimeoutError' ? 'timeout' : 'no response', id: null };
  }
  let raw = '';
  let data = {};
  try {
    raw = await res.text();
    data = JSON.parse(raw);
  } catch {
    data = {};
  }
  const id = typeof data.id === 'string' ? data.id.slice(0, 100) : null;
  if (res.ok) return { outcome: 'accepted', status: res.status, id };
  console.error(`Resend request (quote) failed with status ${res.status}; ${safeResendDetail(raw) || '(empty response body)'}`);
  return { outcome: REFUSED.has(res.status) ? 'refused' : 'unknown', status: res.status, id: null };
}

/** True when a quote's send may have happened but was never confirmed. */
export function isSendUnknown(row, at = Date.now()) {
  if (row.status === 'send_unknown') return true;
  return row.status === 'sending' && at - new Date(row.sending_started_at || row.updated_at).getTime() > SEND_UNKNOWN_AFTER_MS;
}

/** True while an unknown send can still be checked safely through Resend's Idempotency-Key. */
export function canReconcile(row, at = Date.now()) {
  return isSendUnknown(row, at) && at - new Date(row.sending_started_at).getTime() < RECONCILE_WINDOW_MS;
}

// Statements that record a confirmed send: the quote becomes sent, the quote it revises becomes
// superseded, and a New or Reviewing enquiry moves to Quoted. Every write is conditional on the quote
// still being in one of `from`, so running this twice (two checks at once) records it only once.
function recordSent(db, row, { at, actor, id, from, detail }) {
  const states = from.map(() => '?').join(', ');
  const stillOpen = `EXISTS (SELECT 1 FROM quotes WHERE id = ? AND status IN (${states}))`;
  const statements = [
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, ?, 'quote_sent', ? WHERE ${stillOpen}`,
      )
      .bind(row.enquiry_id, at, actor, JSON.stringify(detail), row.id, ...from),
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT id, ?, ?, 'status', json_object('from', status, 'to', 'quoted')
         FROM enquiries WHERE id = ? AND status IN ('new', 'reviewing') AND ${stillOpen}`,
      )
      .bind(at, actor, row.enquiry_id, row.id, ...from),
    db
      .prepare(
        `UPDATE enquiries SET status = 'quoted', status_changed_at = ?, updated_at = ?
         WHERE id = ? AND status IN ('new', 'reviewing') AND ${stillOpen}`,
      )
      .bind(at, at, row.enquiry_id, row.id, ...from),
  ];
  if (row.revision_of) {
    statements.push(
      db
        .prepare(`UPDATE quotes SET status = 'superseded', updated_at = ? WHERE id = ? AND status = 'sent' AND ${stillOpen}`)
        .bind(at, row.revision_of, row.id, ...from),
    );
  }
  statements.push(
    db
      .prepare(
        `UPDATE quotes SET status = 'sent', sent_at = ?, sent_by = ?, resend_message_id = ?, updated_at = ?
         WHERE id = ? AND status IN (${states})`,
      )
      .bind(at, actor, id, at, row.id, ...from),
  );
  return statements;
}

async function markUnknown(db, row, actor, reference, status, type = 'quote_send_unknown') {
  const at = now();
  await db.batch([
    eventStatement(db, row.enquiry_id, at, actor, type, { quote: reference, status }),
    db
      .prepare(`UPDATE quotes SET status = 'send_unknown', updated_at = ? WHERE id = ? AND status IN ('sending', 'send_unknown')`)
      .bind(at, row.id),
  ]);
}

/**
 * Send a draft quote to the customer.
 *
 * Duplicate and stale sends are prevented in layers:
 * - the request must name the current version, and that version must be the one last previewed
 *   (previewed_version), on the same UK day the preview was rendered for;
 * - the draft is claimed with one atomic update (draft -> sending) that re-checks status, version and
 *   previewed version, so a double click, a second tab, a stale preview or a repeated request finds
 *   nothing to claim;
 * - the rendered email and snapshot are stored before Resend is called;
 * - Resend is given an Idempotency-Key for this quote version;
 * - an answer that does not prove whether the email went locks the quote as "send status unknown".
 *
 * Returns { result, quote?, problems?, status? } where result is one of 'sent', 'not_found',
 * 'not_draft', 'stale', 'not_previewed', 'preview_outdated', 'incomplete', 'unconfigured',
 * 'link_unconfigured', 'recipient_not_allowed', 'conflict',
 * 'failed' (definitely not sent; back to draft) or 'unknown' (may have been sent; locked).
 */
export async function sendQuote(env, reference, { version, previewedOn }, actor) {
  const db = env.DB;
  await requireSchema(db);
  const row = await findQuoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  const quote = await loadQuote(db, row);
  if (quote.status !== 'draft') return { result: 'not_draft', quote };
  if (quote.version !== version) return { result: 'stale', quote };
  if (row.previewed_version !== version) return { result: 'not_previewed', quote };
  const issuedOn = ukToday();
  // The preview showed the issue and valid-until dates for the day it was rendered.
  if (previewedOn !== issuedOn) return { result: 'preview_outdated', quote };
  const problems = sendProblems(quote);
  if (problems.length) return { result: 'incomplete', problems, quote };
  if (!env.RESEND_API_KEY) {
    console.error('Quote not sent: RESEND_API_KEY is not set.');
    return { result: 'unconfigured', quote };
  }
  // Preview: customer emails go only to approved test addresses (EMAIL_TEST_ALLOWLIST).
  if (!customerEmailAllowed(env, quote.customerEmail).ok) {
    console.error('Quote not sent: the customer address is not allowed in test mode.');
    return { result: 'recipient_not_allowed', quote };
  }
  // Every quote email carries the customer's link, so none can go out unsigned.
  if (!linksConfigured(env)) {
    console.error('Quote not sent: QUOTE_LINK_SECRET and QUOTE_LINK_KEY_ID are not set.');
    return { result: 'link_unconfigured', quote };
  }
  // The link is created by the preview; without it (or if its key has since been removed) the preview
  // did not show what would be sent.
  const link = await activeLink(db, row.id);
  const url = link ? await quoteUrl(env, link.key_id, link.link_id) : null;
  if (!url) return { result: 'not_previewed', quote };

  const email = renderQuote(quote, { enquiryReference: quote.enquiryReference, issuedOn, quoteUrl: url });
  const snapshot = { ...email.snapshot, subject: email.subject, from: QUOTE_FROM, to: quote.customerEmail, bcc: QUOTE_BCC };
  const startedAt = now();

  // 1. Claim the draft, storing exactly what will be sent. Only one request can do this, and only for
  //    the version that was previewed.
  const claimed = await db
    .prepare(
      `UPDATE quotes SET status = 'sending', sending_started_at = ?, updated_at = ?, issued_on = ?, valid_until = ?,
         sent_to = ?, sent_subject = ?, sent_html = ?, sent_text = ?, sent_snapshot = ?
       WHERE id = ? AND status = 'draft' AND version = ? AND previewed_version = ?
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.quote_id = quotes.revision_of AND b.status IN ('holding', 'confirmed', 'cancel_requested'))
       RETURNING id`,
    )
    .bind(
      startedAt,
      startedAt,
      issuedOn,
      email.snapshot.validUntil,
      quote.customerEmail,
      email.subject,
      email.html,
      email.text,
      JSON.stringify(snapshot),
      row.id,
      version,
      version,
    )
    .first();
  if (!claimed) {
    const booked = row.revision_of
      ? await db
          .prepare(`SELECT 1 FROM bookings WHERE quote_id = ? AND status IN ('holding', 'confirmed', 'cancel_requested')`)
          .bind(row.revision_of)
          .first()
      : null;
    return { result: booked ? 'revision_booked' : 'conflict', quote: await getQuote(db, reference) };
  }

  // 2. Send.
  const sent = await callResend(
    env,
    resendPayload({ to: quote.customerEmail, subject: email.subject, html: email.html, text: email.text }),
    idempotencyKey(reference, version),
  );

  // 3a. Resend refused the request: nothing was sent. Back to the same draft (same version), with the
  //     failure on the timeline. The stored email is cleared because it was never delivered.
  if (sent.outcome === 'refused') {
    const at = now();
    await db.batch([
      db
        .prepare(
          `UPDATE quotes SET status = 'draft', sending_started_at = NULL, issued_on = NULL, valid_until = NULL,
             sent_to = NULL, sent_subject = NULL, sent_html = NULL, sent_text = NULL, sent_snapshot = NULL, updated_at = ?
           WHERE id = ? AND status = 'sending'`,
        )
        .bind(at, row.id),
      eventStatement(db, row.enquiry_id, at, actor, 'quote_send_failed', { quote: reference, status: sent.status }),
    ]);
    return { result: 'failed', status: sent.status, quote: await getQuote(db, reference) };
  }

  // 3b. No proof either way: keep everything stored and lock the quote.
  if (sent.outcome === 'unknown') {
    await markUnknown(db, row, actor, reference, sent.status);
    return { result: 'unknown', status: sent.status, quote: await getQuote(db, reference) };
  }

  // 3c. Sent.
  const detail = {
    quote: reference,
    totalPence: quote.totalPence,
    to: quote.customerEmail,
    ...(quote.revisionOf ? { supersedes: quote.revisionOf } : {}),
  };
  try {
    await db.batch(recordSent(db, row, { at: now(), actor, id: sent.id, from: ['sending'], detail }));
  } catch (error) {
    // Resend accepted the email but the result could not be recorded. The quote stays "sending",
    // shows "Send status unknown" after 10 minutes, and can then be checked, never resent.
    console.error(`Quote ${reference} was accepted by Resend but recording the result failed: ${error.message}`);
    throw error;
  }
  return { result: 'sent', quote: await getQuote(db, reference) };
}

/**
 * Check a quote whose send is unknown, without any risk of a second email.
 *
 * Within Resend's 24-hour idempotency window, the exact stored request is repeated under the same
 * Idempotency-Key. If the original reached Resend, Resend returns the original response and sends
 * nothing; if it never arrived, this delivers that same stored email, once. Only an accepted answer
 * resolves the quote (to sent). Any other answer leaves it locked as unknown: a refusal now does not
 * prove the original was refused (for example, the API key may have changed since).
 *
 * Outside the window this does nothing; the quote stays locked for manual reconciliation (README).
 * Returns { result: 'sent' | 'unknown' | 'not_found' | 'not_unknown' | 'window_passed' | 'unconfigured', quote, status? }.
 */
export async function reconcileQuote(env, reference, actor) {
  const db = env.DB;
  await requireSchema(db);
  const row = await findQuoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  if (!isSendUnknown(row)) return { result: 'not_unknown', quote: await loadQuote(db, row) };
  if (!canReconcile(row)) return { result: 'window_passed', quote: await loadQuote(db, row) };
  if (!env.RESEND_API_KEY) return { result: 'unconfigured', quote: await loadQuote(db, row) };

  // A quote stuck in "sending" (the request stopped) is first marked unknown, so it shows as such
  // whatever happens next.
  if (row.status === 'sending') await markUnknown(db, row, actor, reference, 'no result recorded');

  const snapshot = JSON.parse(row.sent_snapshot || '{}');
  const checked = await callResend(
    env,
    resendPayload({ to: row.sent_to, subject: row.sent_subject, html: row.sent_html, text: row.sent_text }),
    idempotencyKey(reference, row.version),
  );
  if (checked.outcome !== 'accepted') {
    await eventStatement(db, row.enquiry_id, now(), actor, 'quote_send_check', { quote: reference, status: checked.status }).run();
    return { result: 'unknown', status: checked.status, quote: await getQuote(db, reference) };
  }
  const detail = {
    quote: reference,
    totalPence: snapshot.totalPence ?? row.total_pence,
    to: row.sent_to,
    confirmedByCheck: true,
    ...(row.revision_of_reference ? { supersedes: row.revision_of_reference } : {}),
  };
  await db.batch(recordSent(db, row, { at: now(), actor, id: checked.id, from: ['send_unknown', 'sending'], detail }));
  return { result: 'sent', quote: await getQuote(db, reference) };
}
