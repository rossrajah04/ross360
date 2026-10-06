// Availability for the ROSS 360 Admin (Phase C): the slots offered to customers to book.
//
// The overlap rule (one Full day, or Morning and/or Afternoon, never both open on a date) is checked in
// the same statement that adds or reopens a slot, so two tabs at once cannot both succeed; the 0004
// triggers are the backstop. A slot with an active booking (a checkout in progress counts) cannot be
// closed: the close is one conditional statement, and the database refuses a booking on a slot that
// is not open, so a close and a booking can never both succeed.

import { requireSchema } from './schema.js';
import { isCalendarDate } from '../../src/lib/admin/model.js';
import { ukToday } from '../../src/lib/admin/quotes.js';
import { PERIOD_VALUES, SLOT_NOTE_MAX, conflictingPeriods } from '../../src/lib/admin/availability.js';

const now = () => new Date().toISOString();

const PERIOD_ORDER = `CASE s.period WHEN 'am' THEN 1 WHEN 'pm' THEN 2 ELSE 3 END`;

// An active booking: confirmed, awaiting a cancellation decision, or a checkout whose hold is live.
const ACTIVE_BOOKING = (alias = 'b') =>
  `(${alias}.status IN ('confirmed', 'cancel_requested') OR (${alias}.status = 'holding' AND ${alias}.hold_expires_at > ?))`;

function slotToApi(row, booking = null) {
  return {
    id: row.id,
    date: row.slot_date,
    period: row.period,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    booking,
  };
}

async function bookingsFor(db, slotIds) {
  if (!slotIds.length) return [];
  const { results } = await db
    .prepare(
      `SELECT b.id, b.slot_id, b.status, b.plan, b.paid_pence, b.total_pence, b.hold_expires_at,
         q.reference AS quote_reference, q.customer_name, q.customer_business, e.reference AS enquiry_reference
       FROM bookings b
       JOIN quotes q ON q.id = b.quote_id
       JOIN enquiries e ON e.id = q.enquiry_id
       WHERE ${ACTIVE_BOOKING()} AND b.slot_id IN (${slotIds.map(() => '?').join(', ')})`,
    )
    .bind(now(), ...slotIds)
    .all();
  return results.map((b) => ({
    id: b.id,
    slotId: b.slot_id,
    status: b.status,
    plan: b.plan,
    paidPence: b.paid_pence,
    totalPence: b.total_pence,
    holdExpiresAt: b.hold_expires_at,
    quoteReference: b.quote_reference,
    enquiryReference: b.enquiry_reference,
    customer: b.customer_business || b.customer_name,
  }));
}

/** Slots from `from` (default today, UK) onwards, earliest first, each with its active booking. */
export async function listSlots(db, { from = ukToday() } = {}) {
  await requireSchema(db);
  const { results } = await db
    .prepare(`SELECT s.* FROM availability_slots s WHERE s.slot_date >= ? ORDER BY s.slot_date, ${PERIOD_ORDER} LIMIT 500`)
    .bind(from)
    .all();
  const bookings = await bookingsFor(db, results.map((r) => r.id));
  return results.map((row) => slotToApi(row, bookings.find((b) => b.slotId === row.id) || null));
}

export async function getSlot(db, id) {
  const row = await db.prepare(`SELECT * FROM availability_slots WHERE id = ?`).bind(id).first();
  if (!row) return null;
  const [booking] = await bookingsFor(db, [row.id]);
  return slotToApi(row, booking || null);
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
 * Close a slot, so it is no longer offered to customers. A slot with an active booking (or a
 * checkout in progress) is not closed: move or cancel the booking first, or wait for the checkout to
 * end. Returns { result: 'ok' | 'not_found' | 'already_closed' | 'booked', slot? }.
 */
export async function closeSlot(db, id) {
  await requireSchema(db);
  const at = now();
  const row = await db
    .prepare(
      `UPDATE availability_slots SET status = 'closed', updated_at = ?
       WHERE id = ? AND status = 'open' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = ? AND ${ACTIVE_BOOKING()})
       RETURNING id`,
    )
    .bind(at, id, id, at)
    .first();
  const slot = await getSlot(db, id);
  if (!slot) return { result: 'not_found' };
  if (!row) return { result: slot.status === 'closed' ? 'already_closed' : 'booked', slot };
  return { result: 'ok', slot };
}
