// Planning for the Admin Availability calendar: the month grid, each date's slot state, and the
// changes a bulk action needs. Pure functions, so they are tested without a browser or database.
// The changes are carried out one at a time through the existing slot API, which keeps every
// server-side rule (overlap, bookings, past dates) exactly as it is.

import { addDays } from './quotes.js';

// Shoot days: Thursday, Friday and Saturday (0 = Sunday), Morning and Afternoon.
export const SHOOT_WEEKDAYS = [4, 5, 6];
export const SHOOT_PERIODS = ['am', 'pm'];

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Calendar columns run Monday to Sunday.
export const CALENDAR_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export const weekdayOf = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();
export const monthKey = (isoDate) => isoDate.slice(0, 7);

/** "2026-11" -> "2026-12" (step may be negative). */
export function shiftMonth(key, step) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + step, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The weeks of a month ("2026-11"), Monday first; days outside the month are null. */
export function monthGrid(key) {
  const first = `${key}-01`;
  const lead = (weekdayOf(first) + 6) % 7;
  const days = [];
  for (let i = 0; i < lead; i++) days.push(null);
  for (let date = first; monthKey(date) === key; date = addDays(date, 1)) days.push(date);
  while (days.length % 7) days.push(null);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

const ACTIVE = new Set(['confirmed', 'cancel_requested', 'holding']);
export const isBooked = (slot) => Boolean(slot?.booking && ACTIVE.has(slot.booking.status));

/**
 * What a period on a date shows: 'open', 'closed' (never added, or closed), 'booked' (paid or
 * awaiting a cancellation decision) or 'holding' (a customer is paying now).
 */
export function slotState(slot) {
  if (!slot) return 'closed';
  if (isBooked(slot)) return slot.booking.status === 'holding' ? 'holding' : 'booked';
  return slot.status === 'open' ? 'open' : 'closed';
}

/** Slots indexed by date, then period. */
export function indexSlots(slots) {
  const byDate = new Map();
  for (const slot of slots) {
    if (!byDate.has(slot.date)) byDate.set(slot.date, {});
    byDate.get(slot.date)[slot.period] = slot;
  }
  return byDate;
}

function datesBetween(from, to) {
  const dates = [];
  for (let date = from; date <= to && dates.length < 400; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/**
 * The changes to open or close the chosen weekdays and periods between two dates (inclusive).
 * Returns { steps, skipped } where steps are { kind: 'add', date, period } | { kind: 'reopen' |
 * 'close', slot }, and skipped counts { already, booked, fullDay, past }.
 */
export function planBulk(slots, { action, from, to, weekdays, periods, today }) {
  const byDate = indexSlots(slots);
  const steps = [];
  const skipped = { already: 0, booked: 0, fullDay: 0, past: 0 };
  if (!from || !to || from > to) return { steps, skipped };
  for (const date of datesBetween(from, to)) {
    if (!weekdays.includes(weekdayOf(date))) continue;
    for (const period of periods) {
      if (date < today) {
        skipped.past++;
        continue;
      }
      const day = byDate.get(date) || {};
      const slot = day[period];
      if (action === 'open') {
        if (slot?.status === 'open') skipped.already++;
        else if (period !== 'day' && day.day?.status === 'open') skipped.fullDay++;
        else if (period === 'day' && (day.am?.status === 'open' || day.pm?.status === 'open')) skipped.fullDay++;
        else steps.push(slot ? { kind: 'reopen', slot } : { kind: 'add', date, period });
      } else {
        if (!slot || slot.status !== 'open') skipped.already++;
        else if (isBooked(slot)) skipped.booked++;
        else steps.push({ kind: 'close', slot });
      }
    }
  }
  return { steps, skipped };
}

/**
 * Close every open slot from today that is not a shoot slot (Thu/Fri/Sat Morning or Afternoon),
 * leaving booked slots alone. Returns { steps, booked } where booked lists the slots kept open.
 */
export function planTidy(slots, { today, weekdays = SHOOT_WEEKDAYS, periods = SHOOT_PERIODS }) {
  const steps = [];
  const booked = [];
  for (const slot of slots) {
    if (slot.date < today || slot.status !== 'open') continue;
    if (weekdays.includes(weekdayOf(slot.date)) && periods.includes(slot.period)) continue;
    if (isBooked(slot)) booked.push(slot);
    else steps.push({ kind: 'close', slot });
  }
  return { steps, booked };
}
