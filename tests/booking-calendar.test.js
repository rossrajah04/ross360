// The customer's "Choose a slot" calendar: open dates in a month grid, a chosen date's times, and
// moving between months within the booking window.

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSlotsPage } from '../server/customer/render.js';

const urls = { self: '/q/x', book: '/q/x/book', pay: '/q/x/pay' };
const snapshot = { reference: 'Q-0001' };
const slots = [
  { id: 1, slot_date: '2026-11-10', period: 'am' },
  { id: 2, slot_date: '2026-11-10', period: 'pm' },
  { id: 3, slot_date: '2026-11-21', period: 'day' },
  { id: 4, slot_date: '2026-12-03', period: 'am' },
];
const page = (view = {}) => renderSlotsPage({ snapshot, slots, urls, today: '2026-10-30', view });
const radios = (html) => [...html.matchAll(/name="slot" value="(\d+)"/g)].map((m) => Number(m[1]));

test('the earliest open date is selected, with its times; other open dates are links', () => {
  const html = page();
  assert.match(html, /<h2 aria-live="polite">November 2026<\/h2>/);
  assert.match(html, /day--open day--selected" href="\/q\/x\/book\?date=2026-11-10#calendar"[^>]*aria-current="date">10</);
  assert.match(html, /day--open" href="\/q\/x\/book\?date=2026-11-21#calendar"/);
  assert.match(html, /<span class="day">11<\/span>/);
  assert.deepEqual(radios(html), [1, 2]);
  assert.match(html, /Times available on Tuesday 10 November 2026/);
  assert.ok(!/checked/.test(html), 'two times: neither is chosen for the customer');
  // November 2026 starts on a Sunday: six empty cells before it.
  assert.match(html, /<tbody><tr>(<td><\/td>){6}<td><span class="day">1</);
});

test('a date with one time has it ticked; a date in the link chooses the month', () => {
  const html = page({ date: '2026-12-03' });
  assert.match(html, /December 2026/);
  assert.deepEqual(radios(html), [4]);
  assert.match(html, /value="4" required checked/);
});

test('moving between months stays within the booking window', () => {
  const nov = page({ month: '2026-11' });
  assert.deepEqual(radios(nov), []);
  assert.match(nov, /Select an available date/);
  assert.match(nov, /<span class="cal-nav" aria-hidden="true">&#8249;<\/span>/, 'no month before the window');
  assert.match(nov, /href="\/q\/x\/book\?month=2026-12#calendar" aria-label="Next month"/);
  const dec = page({ month: '2026-12' });
  assert.match(dec, /<span class="cal-nav" aria-hidden="true">&#8250;<\/span>/, 'no month after the window');
  // An unknown date or a month outside the window falls back to the earliest open date.
  assert.deepEqual(radios(page({ date: '2026-11-11' })), [1, 2]);
  assert.deepEqual(radios(page({ month: '2027-03' })), [1, 2]);
});

test('a month with nothing open points to the next available date', () => {
  const html = renderSlotsPage({ snapshot, slots: [slots[3]], urls, today: '2026-10-30', view: { month: '2026-11' } });
  assert.match(html, /No dates are available in November\./);
  assert.match(html, /href="\/q\/x\/book\?date=2026-12-03#calendar">Next available date: Thursday 3 December 2026</);
});

test('no open slots at all: the notice, and no calendar', () => {
  const html = renderSlotsPage({ snapshot, slots: [], urls, today: '2026-10-30' });
  assert.match(html, /No slots are available online/);
  assert.ok(!html.includes('<table class="cal-grid"'));
});
