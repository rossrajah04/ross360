// Phase C availability: the overlap rule and slot management. Booking a slot is tested in
// booking.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addSlot, callPage, sentQuote, setUp } from './helpers/phasec.js';
import { getEnquiry } from '../server/admin/enquiries.js';
import { closeSlot } from '../server/admin/availability.js';
import { addDays, ukToday } from '../src/lib/admin/quotes.js';
import { createEnquiry } from '../server/admin/enquiries.js';

const day = (n) => addDays(ukToday(), n);
const rows = (t, sql, ...params) => t.db.db.prepare(sql).all(...params);
const one = (t, sql, ...params) => t.db.db.prepare(sql).get(...params);
const events = async (t, type) => (await getEnquiry(t.db, t.enquiry)).events.filter((e) => !type || e.type === type);
const slotOf = async (t, id) => (await t.call('/availability')).data.slots.find((s) => s.id === id);
const close = (t, slot) => t.call(`/availability/${slot.id}/close`, { method: 'POST', body: {} });

// --- The overlap rule ---------------------------------------------------------------------------

test('Full day cannot be open with Morning or Afternoon on the same date, and the reverse', async () => {
  const t = await setUp();
  const add = (date, period) => t.call('/availability', { method: 'POST', body: { date, period } });
  assert.equal((await add(day(5), 'am')).status, 201);
  assert.equal((await add(day(5), 'pm')).status, 201, 'Morning and Afternoon together are allowed');
  const fullDay = await add(day(5), 'day');
  assert.equal(fullDay.status, 409);
  assert.equal(fullDay.data.message, 'Close the morning and afternoon slots on this date first.');

  assert.equal((await add(day(6), 'day')).status, 201);
  for (const period of ['am', 'pm']) {
    const half = await add(day(6), period);
    assert.equal(half.status, 409);
    assert.equal(half.data.message, 'Close the full-day slot on this date first.');
  }
  const duplicate = await add(day(5), 'am');
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.data.message, 'This slot is already open.');
});

test('closing one kind lets the other be added; reopening follows the same rule', async () => {
  const t = await setUp();
  const am = await addSlot(t, 5, 'am');
  const pm = await addSlot(t, 5, 'pm');
  assert.equal((await close(t, am)).status, 200);
  assert.equal((await t.call('/availability', { method: 'POST', body: { date: day(5), period: 'day' } })).status, 409, 'pm still open');
  assert.equal((await close(t, pm)).status, 200);
  const full = await t.call('/availability', { method: 'POST', body: { date: day(5), period: 'day' } });
  assert.equal(full.status, 201);

  // Reopening Morning while Full day is open is refused; after closing Full day it is allowed.
  const reopen = await t.call(`/availability/${am.id}/reopen`, { method: 'POST', body: {} });
  assert.equal(reopen.status, 409);
  assert.equal(reopen.data.message, 'Close the full-day slot on this date first.');
  assert.equal((await close(t, full.data.slot)).status, 200);
  assert.equal((await t.call(`/availability/${am.id}/reopen`, { method: 'POST', body: {} })).status, 200);
  // Adding a closed slot again reopens it rather than duplicating it.
  const again = await t.call('/availability', { method: 'POST', body: { date: day(5), period: 'pm' } });
  assert.equal(again.status, 201);
  assert.equal(again.data.slot.id, pm.id);
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM availability_slots`).n, 3);
});

test('two conflicting adds at once: exactly one succeeds', async () => {
  const t = await setUp();
  const results = await Promise.all([
    t.call('/availability', { method: 'POST', body: { date: day(9), period: 'day' } }),
    t.call('/availability', { method: 'POST', body: { date: day(9), period: 'am' } }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM availability_slots WHERE status = 'open'`).n, 1);
});

test('the database refuses an overlap even from hand-written SQL', async () => {
  const t = await setUp();
  await addSlot(t, 7, 'am');
  const at = new Date().toISOString();
  assert.throws(
    () => t.db.db.prepare(`INSERT INTO availability_slots (slot_date, period, status, created_at, updated_at) VALUES (?, 'day', 'open', ?, ?)`).run(day(7), at, at),
    /availability_overlap/,
  );
  t.db.db.prepare(`INSERT INTO availability_slots (slot_date, period, status, created_at, updated_at) VALUES (?, 'day', 'closed', ?, ?)`).run(day(7), at, at);
  assert.throws(() => t.db.db.exec(`UPDATE availability_slots SET status = 'open' WHERE period = 'day'`), /availability_overlap/);
});

test('past dates and bad input are refused', async () => {
  const t = await setUp();
  const past = await t.call('/availability', { method: 'POST', body: { date: day(-1), period: 'am' } });
  assert.equal(past.status, 422);
  assert.equal(past.data.errors.date, 'This date has passed.');
  for (const body of [{ date: '2026-02-30', period: 'am' }, { date: day(3), period: 'evening' }, { date: day(3), period: 'am', note: 'x'.repeat(301) }]) {
    assert.equal((await t.call('/availability', { method: 'POST', body })).status, 422, JSON.stringify(body));
  }
  // A note can be added; it is internal and never shown to customers.
  const slot = await addSlot(t, 3, 'am');
  const noted = await t.call(`/availability/${slot.id}`, { method: 'PATCH', body: { note: 'INTERNAL: parking at rear' } });
  assert.equal(noted.data.slot.note, 'INTERNAL: parking at rear');
  const { token } = await sentQuote(t);
  assert.ok(!(await callPage(t.env, `/q/${token}/book`)).html.includes('INTERNAL'));
});
