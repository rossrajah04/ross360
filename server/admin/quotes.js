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
    // Left in "sending" for over 10 minutes: the result was never recorded. Never retried automatically.
    sendStatusUnknown:
      row.status === 'sending' &&
      Date.now() - new Date(row.sending_started_at || row.updated_at).getTime() > SEND_UNKNOWN_AFTER_MS,
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

// The editable parts of a quote, in the form validateQuoteDraft takes.
const EDITABLE = [...Object.keys(QUOTE_TEXT_FIELDS), 'package', 'travelPence', 'discountPence', 'validDays', 'items'];
const CHANGE_LABELS = {
  ...Object.fromEntries(Object.entries(QUOTE_TEXT_FIELDS).map(([key, field]) => [key, field.label])),
  package: 'Package',
  travelPence: 'Travel',
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
        JSON.stringify({ quote: reference, fields: changed.map((key) => CHANGE_LABELS[key]), totalPence: values.totalPence }),
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

/** Render the customer email for a quote as it stands. Drafts use today's UK date. */
export function previewOf(quote) {
  if (quote.status === 'draft' || quote.status === 'discarded') {
    return renderQuote(quote, { enquiryReference: quote.enquiryReference, issuedOn: ukToday() });
  }
  return null;
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
    .prepare(`SELECT reference FROM quotes WHERE revision_of = ? AND status IN ('draft', 'sending')`)
    .bind(row.id)
    .first();
  if (open) return { result: 'open_revision', revision: open.reference, quote: await loadQuote(db, row) };

  const at = now();
  const newId = `(SELECT id FROM quotes WHERE quote_number = (SELECT value FROM counters WHERE name = 'quote'))`;
  const results = await db.batch([
    db.prepare(`UPDATE counters SET value = value + 1 WHERE name = 'quote'`),
    db
      .prepare(
        `INSERT INTO quotes (quote_number, reference, enquiry_id, revision_of, status, version, package,
           customer_name, customer_business, customer_email, customer_location, service_description, internal_notes,
           travel_pence, discount_pence, discount_label, subtotal_pence, total_pence, valid_days, created_at, updated_at)
         SELECT c.value, printf('Q-%04d', c.value), q.enquiry_id, q.id, 'draft', 1, q.package,
           q.customer_name, q.customer_business, q.customer_email, q.customer_location, q.service_description, q.internal_notes,
           q.travel_pence, q.discount_pence, q.discount_label, q.subtotal_pence, q.total_pence, q.valid_days, ?, ?
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

async function callResend(env, payload, idempotencyKey) {
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        // Resend drops a repeated request with the same key (kept for 24 hours), so a retried send
        // of the same quote version cannot deliver a second email.
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`Resend request (quote) could not be sent: ${safeResendDetail(`${error?.name}: ${error?.message}`)}`);
    return { ok: false, status: 'not sent' };
  }
  let data = {};
  let raw = '';
  try {
    raw = await res.text();
    data = JSON.parse(raw);
  } catch {
    data = {};
  }
  if (!res.ok) {
    console.error(`Resend request (quote) failed with status ${res.status}; ${safeResendDetail(raw) || '(empty response body)'}`);
  }
  return { ok: res.ok, status: res.status, id: typeof data.id === 'string' ? data.id.slice(0, 100) : null };
}

/**
 * Send a draft quote to the customer.
 *
 * Duplicate sends are prevented in layers: the draft must be at the version the administrator
 * previewed; it is claimed with one atomic update (draft -> sending), so a double click, a second tab
 * or a repeated request finds nothing to claim; the rendered email is stored before Resend is called;
 * and Resend is given an Idempotency-Key for this quote version.
 *
 * Returns { result, quote?, problems?, status? } where result is one of
 * 'sent', 'not_found', 'not_draft', 'stale', 'incomplete', 'unconfigured', 'conflict', 'failed'.
 */
export async function sendQuote(env, reference, version, actor) {
  const db = env.DB;
  await requireSchema(db);
  const row = await findQuoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  const quote = await loadQuote(db, row);
  if (quote.status !== 'draft') return { result: 'not_draft', quote };
  if (quote.version !== version) return { result: 'stale', quote };
  const problems = sendProblems(quote);
  if (problems.length) return { result: 'incomplete', problems, quote };
  if (!env.RESEND_API_KEY) {
    console.error('Quote not sent: RESEND_API_KEY is not set.');
    return { result: 'unconfigured', quote };
  }

  const issuedOn = ukToday();
  const email = renderQuote(quote, { enquiryReference: quote.enquiryReference, issuedOn });
  const snapshot = { ...email.snapshot, subject: email.subject, from: QUOTE_FROM, to: quote.customerEmail, bcc: QUOTE_BCC };
  const startedAt = now();

  // 1. Claim the draft, storing exactly what will be sent. Only one request can do this.
  const claimed = await db
    .prepare(
      `UPDATE quotes SET status = 'sending', sending_started_at = ?, updated_at = ?, issued_on = ?, valid_until = ?,
         sent_to = ?, sent_subject = ?, sent_html = ?, sent_text = ?, sent_snapshot = ?
       WHERE id = ? AND status = 'draft' AND version = ?
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
    )
    .first();
  if (!claimed) return { result: 'conflict', quote: await getQuote(db, reference) };

  // 2. Send.
  const sent = await callResend(
    env,
    {
      from: QUOTE_FROM,
      to: [quote.customerEmail],
      bcc: [QUOTE_BCC],
      reply_to: QUOTE_FROM,
      subject: email.subject,
      html: email.html,
      text: email.text,
    },
    `quote-${reference}-v${version}`,
  );

  const at = now();
  if (!sent.ok) {
    // 3a. Nothing was accepted by Resend: back to the same draft (same version, so a retry uses the
    // same Idempotency-Key), with the failure on the timeline.
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

  // 3b. Sent: record it, supersede the quote this one revises, and move a New or Reviewing enquiry
  // to Quoted (with its own status entry on the timeline).
  const statements = [
    db
      .prepare(
        `UPDATE quotes SET status = 'sent', sent_at = ?, sent_by = ?, resend_message_id = ?, updated_at = ?
         WHERE id = ? AND status = 'sending'`,
      )
      .bind(at, actor, sent.id, at, row.id),
  ];
  if (row.revision_of) {
    statements.push(
      db.prepare(`UPDATE quotes SET status = 'superseded', updated_at = ? WHERE id = ? AND status = 'sent'`).bind(at, row.revision_of),
    );
  }
  statements.push(
    eventStatement(db, row.enquiry_id, at, actor, 'quote_sent', {
      quote: reference,
      totalPence: quote.totalPence,
      to: quote.customerEmail,
      ...(quote.revisionOf ? { supersedes: quote.revisionOf } : {}),
    }),
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT id, ?, ?, 'status', json_object('from', status, 'to', 'quoted')
         FROM enquiries WHERE id = ? AND status IN ('new', 'reviewing')`,
      )
      .bind(at, actor, row.enquiry_id),
    db
      .prepare(
        `UPDATE enquiries SET status = 'quoted', status_changed_at = ?, updated_at = ?
         WHERE id = ? AND status IN ('new', 'reviewing')`,
      )
      .bind(at, at, row.enquiry_id),
  );
  try {
    await db.batch(statements);
  } catch (error) {
    // The email has gone but the result could not be recorded. The quote stays "sending" and will
    // show "Send status unknown", so nobody sends it again without checking Resend.
    console.error(`Quote ${reference} was sent (Resend accepted it) but recording the result failed: ${error.message}`);
    throw error;
  }
  return { result: 'sent', quote: await getQuote(db, reference) };
}
