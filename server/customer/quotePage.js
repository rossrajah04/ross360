// The customer's side of Phase C: resolving a quote link and recording views. Booking and payment
// are in server/booking/bookings.js.
//
// Nothing here reads a quote's live fields: the page is built from the stored `sent_snapshot` (what
// was emailed), and only the reference, status and validity are read besides. Internal notes, travel
// working and draft fields are never selected.

import { requireSchema } from '../admin/schema.js';
import { linksConfigured, verifyToken, viewable } from '../admin/quoteLinks.js';
import { addDays, ukToday } from '../../src/lib/admin/quotes.js';

/**
 * Resolve a token to what the customer may see. Returns { state, ... } where state is:
 * - 'valid': sent and within "valid until" (a slot can be booked);
 * - 'expired': sent, past "valid until" but within the 90-day viewing window (no new bookings; an
 *   existing booking can still be managed);
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
  // Past the viewing window the page stays available only while the quote has an active booking
  // (one moved to a later date, for example), so the customer can still manage it.
  if (!viewable(row.status, row.valid_until, today)) {
    const booked = await env.DB.prepare(
      `SELECT 1 FROM bookings WHERE quote_id = ? AND status IN ('confirmed', 'cancel_requested')`,
    )
      .bind(row.quote_id)
      .first();
    if (!booked) return { state: 'gone' };
  }

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
