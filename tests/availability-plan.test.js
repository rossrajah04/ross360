// The Admin Availability calendar's planning helpers: the month grid and bulk actions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthGrid, planBulk, planTidy, shiftMonth, slotState } from '../src/lib/admin/availabilityPlan.js';

let id = 0;
const slot = (date, period, status = 'open', booking = null) => ({ id: ++id, date, period, status, note: '', booking });
const today = '2026-11-02'; // a Monday

test('month grid starts on Monday and pads the edges', () => {
  const weeks = monthGrid('2026-11');
  assert.equal(weeks[0].filter(Boolean)[0], '2026-11-01');
  assert.equal(weeks[0].indexOf('2026-11-01'), 6, '1 Nov 2026 is a Sunday');
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2027-01', -1), '2026-12');
});

test('slot state: booked and paying slots are not shown as open', () => {
  assert.equal(slotState(undefined), 'closed');
  assert.equal(slotState(slot('2026-11-05', 'am')), 'open');
  assert.equal(slotState(slot('2026-11-05', 'am', 'closed')), 'closed');
  assert.equal(slotState(slot('2026-11-05', 'am', 'open', { status: 'confirmed' })), 'booked');
  assert.equal(slotState(slot('2026-11-05', 'am', 'open', { status: 'holding' })), 'holding');
});

test('opening Thu–Sat for two weeks adds, reopens and skips correctly', () => {
  const closed = slot('2026-11-05', 'am', 'closed');
  const slots = [closed, slot('2026-11-05', 'pm'), slot('2026-11-07', 'day'), slot('2026-11-03', 'am')];
  const { steps, skipped } = planBulk(slots, { action: 'open', from: today, to: '2026-11-15', weekdays: [4, 5, 6], periods: ['am', 'pm'], today });
  assert.deepEqual(steps[0], { kind: 'reopen', slot: closed });
  const added = steps.filter((s) => s.kind === 'add').map((s) => `${s.date} ${s.period}`);
  assert.deepEqual(added, ['2026-11-06 am', '2026-11-06 pm', '2026-11-12 am', '2026-11-12 pm', '2026-11-13 am', '2026-11-13 pm', '2026-11-14 am', '2026-11-14 pm']);
  assert.equal(skipped.already, 1);
  assert.equal(skipped.fullDay, 2, 'Saturday 7th has a Full day slot');
});

test('closing a range leaves booked slots alone', () => {
  const slots = [slot('2026-11-05', 'am', 'open', { status: 'confirmed' }), slot('2026-11-05', 'pm'), slot('2026-11-06', 'am', 'closed')];
  const { steps, skipped } = planBulk(slots, { action: 'close', from: today, to: '2026-11-06', weekdays: [4, 5], periods: ['am', 'pm'], today });
  assert.deepEqual(steps.map((s) => s.slot.id), [slots[1].id]);
  assert.equal(skipped.booked, 1);
  assert.equal(skipped.already, 2);
});

test('past dates are never changed', () => {
  const { steps, skipped } = planBulk([], { action: 'open', from: '2026-10-29', to: '2026-11-01', weekdays: [4, 5, 6], periods: ['am'], today });
  assert.equal(steps.length, 0);
  assert.equal(skipped.past, 3);
});

test('close the rest: only Thu–Sat Morning and Afternoon stay open, booked slots are kept', () => {
  const keep = [slot('2026-11-05', 'am'), slot('2026-11-07', 'pm')];
  const close = [slot('2026-11-03', 'am'), slot('2026-11-08', 'pm'), slot('2026-11-06', 'day')];
  const booked = slot('2026-11-04', 'am', 'open', { status: 'confirmed' });
  const ignored = [slot('2026-11-03', 'pm', 'closed'), slot('2026-11-01', 'am')];
  const plan = planTidy([...keep, ...close, booked, ...ignored], { today });
  assert.deepEqual(plan.steps.map((s) => s.slot.id).sort(), close.map((s) => s.id).sort());
  assert.deepEqual(plan.booked, [booked]);
});
