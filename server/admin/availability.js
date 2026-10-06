// Availability for the ROSS 360 Admin (Phase C): the dates offered to customers, and the date
// requests made against them.
//
// The overlap rule (one Full day, or Morning and/or Afternoon, never both open on a date) is checked in
// the same statement that adds or reopens a slot, so two tabs at once cannot both succeed; the 0004
// triggers are the backstop. Closing a slot and a customer's date request are each one transaction,
// and the database refuses a pending request on a slot that is not open, so whichever commits first
// decides (see closeSlot).

import { requireSchema } from './schema.js';
import { isCalendarDate } from '../../src/lib/admin/model.js';
import { ukToday } from '../../src/lib/admin/quotes.js';
import { PERIOD_VALUES, SLOT_NOTE_MAX, conflictingPeriods } from '../../src/lib/admin/availability.js';
import { requestToApi } from './quoteLinks.js';

const now = () => new Date().toISOString();

const PERIOD_ORDER = `CASE s.period WHEN 'am' THEN 1 WHEN 'pm' THEN 2 ELSE 3 END`;

function slotToApi(row, requests = []) {
  const pending = requests.filter((r) => r.status === 'pending');
  return {
    id: row.id,
    date: row.slot_date,
    period: row.period,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pendingRequests: pending,
    // What the close dialog sends back, so a close applies only to the requests it showed.
    pendingCount: pending.length,
    pendingMaxId: pending.reduce((max, r) => Math.max(max, r.id), 0),
  };
}

async function pendingFor(db, slotIds) {
  if (!slotIds.length) return [];
  const { results } = await db
    .prepare(
      `SELECT r.id, r.slot_id, r.status, r.customer_note, r.created_at, r.updated_at, s.slot_date, s.period, s.status AS slot_status,
         q.reference AS quote_reference, q.customer_name, q.customer_business, e.reference AS enquiry_reference
       FROM date_requests r
       JOIN availability_slots s ON s.id = r.slot_id
       JOIN quotes q ON q.id = r.quote_id
       JOIN enquiries e ON e.id = q.enquiry_id
       WHERE r.status = 'pending' AND r.slot_id IN (${slotIds.map(() => '?').join(', ')})
       ORDER BY r.id`,
    )
    .bind(...slotIds)
    .all();
  return results.map((r) => ({
    ...requestToApi(r),
    slotId: r.slot_id,
    quoteReference: r.quote_reference,
    enquiryReference: r.enquiry_reference,
    customer: r.customer_business || r.customer_name,
  }));
}

/** Slots from `from` (default today, UK) onwards, earliest first, each with its pending requests. */
export async function listSlots(db, { from = ukToday() } = {}) {
  await requireSchema(db);
  const { results } = await db
    .prepare(`SELECT s.* FROM availability_slots s WHERE s.slot_date >= ? ORDER BY s.slot_date, ${PERIOD_ORDER} LIMIT 500`)
    .bind(from)
    .all();
  const requests = await pendingFor(db, results.map((r) => r.id));
  return results.map((row) => slotToApi(row, requests.filter((r) => r.slotId === row.id)));
}

export async function getSlot(db, id) {
  const row = await db.prepare(`SELECT * FROM availability_slots WHERE id = ?`).bind(id).first();
  if (!row) return null;
  return slotToApi(row, await pendingFor(db, [row.id]));
}

/** Validate a new slot. Returns { valid, values, errors }. */
export function validateSlot(input = {}) {
  const errors = {};
  const date = typeof input.date === 'string' ? input.date.trim() : '';
  const period = typeof input.period === 'string' ? input.period : '';
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (!isCalendarDate(date)) errors.date = 'Please choose a date.';
  else if (date < ukToday()) errors.date = 'This date has passed.';
  if (!PERIOD_VALUES.includes(period)) errors.period = 'Please choose Morning, Afternoon or Full day.';
  if (input.note !== undefined && typeof input.note !== 'string') errors.note = 'Invalid note.';
  else if (note.length > SLOT_NOTE_MAX) errors.note = `Please keep the note under ${SLOT_NOTE_MAX} characters.`;
  return { valid: !Object.keys(errors).length, values: { date, period, note }, errors };
}

const isOverlapError = (error) => /availability_overlap/.test(String(error?.message));

const noConflict = (period) => {
  const others = conflictingPeriods(period);
  return `NOT EXISTS (SELECT 1 FROM availability_slots c WHERE c.slot_date = ? AND c.status = 'open' AND c.period IN (${others
    .map(() => '?')
    .join(', ')}))`;
};

/**
 * Add a slot. Adding a date and period that exists but is closed reopens it.
 * Returns { result: 'ok' | 'exists' | 'overlap' | 'past' | 'not_found', slot? }.
 */
export async function addSlot(db, values) {
  await requireSchema(db);
  const existing = await db
    .prepare(`SELECT id, status FROM availability_slots WHERE slot_date = ? AND period = ?`)
    .bind(values.date, values.period)
    .first();
  if (existing) {
    if (existing.status === 'open') return { result: 'exists', slot: await getSlot(db, existing.id) };
    const reopened = await reopenSlot(db, existing.id);
    if (reopened.result === 'ok' && values.note) return setSlotNote(db, existing.id, values.note);
    return reopened;
  }
  const at = now();
  let row;
  try {
    row = await db
      .prepare(
        `INSERT INTO availability_slots (slot_date, period, status, note, created_at, updated_at)
         SELECT ?, ?, 'open', ?, ?, ? WHERE ${noConflict(values.period)}
         RETURNING id`,
      )
      .bind(values.date, values.period, values.note, at, at, values.date, ...conflictingPeriods(values.period))
      .first();
  } catch (error) {
    if (isOverlapError(error)) return { result: 'overlap', period: values.period };
    // Added at the same moment from another tab.
    if (/UNIQUE/i.test(String(error?.message))) return { result: 'exists' };
    throw error;
  }
  if (!row) return { result: 'overlap', period: values.period };
  return { result: 'ok', slot: await getSlot(db, row.id) };
}

/** Reopen a closed slot, under the same overlap rule as adding it. */
export async function reopenSlot(db, id) {
  await requireSchema(db);
  const slot = await db.prepare(`SELECT * FROM availability_slots WHERE id = ?`).bind(id).first();
  if (!slot) return { result: 'not_found' };
  if (slot.status === 'open') return { result: 'ok', slot: await getSlot(db, id) };
  if (slot.slot_date < ukToday()) return { result: 'past', slot: await getSlot(db, id) };
  let row;
  try {
    row = await db
      .prepare(
        `UPDATE availability_slots SET status = 'open', updated_at = ?
         WHERE id = ? AND status = 'closed' AND ${noConflict(slot.period)}
         RETURNING id`,
      )
      .bind(now(), id, slot.slot_date, ...conflictingPeriods(slot.period))
      .first();
  } catch (error) {
    if (isOverlapError(error)) return { result: 'overlap', period: slot.period, slot: await getSlot(db, id) };
    throw error;
  }
  if (!row) {
    const latest = await getSlot(db, id);
    return latest.status === 'open' ? { result: 'ok', slot: latest } : { result: 'overlap', period: slot.period, slot: latest };
  }
  return { result: 'ok', slot: await getSlot(db, id) };
}

export async function setSlotNote(db, id, note) {
  await requireSchema(db);
  const row = await db
    .prepare(`UPDATE availability_slots SET note = ?, updated_at = ? WHERE id = ? RETURNING id`)
    .bind(note, now(), id)
    .first();
  return row ? { result: 'ok', slot: await getSlot(db, id) } : { result: 'not_found' };
}

/**
 * Close a slot, so it is no longer offered to customers.
 *
 * `requests` says what happens to its pending date requests: 'close' (the default in the Admin) closes
 * them; 'keep' leaves them pending, shown as "Slot closed", for the administrator to settle with the
 * customer. `pendingCount` and `pendingMaxId` are the pending requests the administrator was shown.
 *
 * Everything is one transaction:
 * - If a customer's request committed first, it is one of the pending requests here and is handled as
 *   chosen, provided the administrator was shown it.
 * - If a request arrived after the dialog was loaded (the pending requests no longer match what was
 *   shown), nothing changes and the result is 'changed': the administrator reviews it and closes again.
 * - If the close commits first, a later request is refused by the database (date_requests_slot_open).
 *
 * Returns { result: 'ok' | 'not_found' | 'already_closed' | 'changed', slot?, closedRequests? }.
 */
export async function closeSlot(db, id, { requests, pendingCount, pendingMaxId }, actor) {
  await requireSchema(db);
  const at = now();
  const pendingNow = `(SELECT COUNT(*) FROM date_requests WHERE slot_id = ? AND status = 'pending')`;
  const maxPendingNow = `(SELECT COALESCE(MAX(id), 0) FROM date_requests WHERE slot_id = ? AND status = 'pending')`;
  const asShown = `EXISTS (SELECT 1 FROM availability_slots WHERE id = ? AND status = 'open')
    AND ${pendingNow} = ? AND ${maxPendingNow} = ?`;
  const asShownParams = [id, id, pendingCount, id, pendingMaxId];
  const statements = [];
  let closeStatement;

  if (requests === 'close') {
    // The requests are closed first, only if they are exactly the ones shown; the slot is then closed
    // only if no pending request is left, so a request that arrived since stops the whole close.
    statements.push(
      db
        .prepare(
          `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
           SELECT q.enquiry_id, ?, ?, 'date_request_closed',
             json_object('quote', q.reference, 'date', s.slot_date, 'period', s.period, 'reason', 'slot_closed')
           FROM date_requests r JOIN quotes q ON q.id = r.quote_id JOIN availability_slots s ON s.id = r.slot_id
           WHERE r.slot_id = ? AND r.status = 'pending' AND ${asShown}`,
        )
        .bind(at, actor, id, ...asShownParams),
      db
        .prepare(
          `UPDATE date_requests SET status = 'closed', updated_at = ? WHERE slot_id = ? AND status = 'pending' AND ${asShown} RETURNING id`,
        )
        .bind(at, id, ...asShownParams),
    );
    closeStatement = db
      .prepare(
        `UPDATE availability_slots SET status = 'closed', updated_at = ?
         WHERE id = ? AND status = 'open' AND ${pendingNow} = 0
         RETURNING id`,
      )
      .bind(at, id, id);
  } else {
    // Kept requests stay pending; the slot closes only if they are exactly the ones shown.
    closeStatement = db
      .prepare(
        `UPDATE availability_slots SET status = 'closed', updated_at = ?
         WHERE id = ? AND ${asShown}
         RETURNING id`,
      )
      .bind(at, id, ...asShownParams);
  }
  statements.push(closeStatement);

  const results = await db.batch(statements);
  const closed = results[results.length - 1].results?.[0];
  const slot = await getSlot(db, id);
  if (!slot) return { result: 'not_found' };
  if (!closed) return { result: slot.status === 'closed' ? 'already_closed' : 'changed', slot };
  return { result: 'ok', slot, closedRequests: requests === 'close' ? results[1].results?.length ?? 0 : 0 };
}

/** Close one pending date request (for example one kept when its slot was closed). */
export async function closeDateRequest(db, id, actor) {
  await requireSchema(db);
  const at = now();
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT q.enquiry_id, ?, ?, 'date_request_closed',
           json_object('quote', q.reference, 'date', s.slot_date, 'period', s.period, 'reason', 'admin')
         FROM date_requests r JOIN quotes q ON q.id = r.quote_id JOIN availability_slots s ON s.id = r.slot_id
         WHERE r.id = ? AND r.status = 'pending'`,
      )
      .bind(at, actor, id),
    db.prepare(`UPDATE date_requests SET status = 'closed', updated_at = ? WHERE id = ? AND status = 'pending' RETURNING id`).bind(at, id),
  ]);
  if (results[1].results?.[0]) return { result: 'ok' };
  const row = await db.prepare(`SELECT status FROM date_requests WHERE id = ?`).bind(id).first();
  return { result: row ? 'not_pending' : 'not_found' };
}

/** Pending date requests, for the dashboard. */
export async function pendingDateRequestCount(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM date_requests WHERE status = 'pending'`).first();
  return row?.n ?? 0;
}
