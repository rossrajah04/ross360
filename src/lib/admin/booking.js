// Booking and payment rules (Phase C), shared by the customer page, the Admin, the API and the
// scheduled tasks. Keep it dependency-free apart from the date helpers.
//
// Simplified by ROSS 360 on 5 November 2026:
// - A booking is confirmed by a deposit: a percentage of the quote total (which already includes
//   travel), rounded up to the whole pound. It counts towards the total.
// - The balance is paid after the shoot, once the tour is ready and the customer is happy with it.
//   Nothing about the balance is due at booking and no reminders are sent before the shoot. When the
//   tour is ready, ROSS 360 sends a balance request from the Admin; the balance is then due within
//   BALANCE_DUE_DAYS, online from the link, or recorded in the Admin when paid another way.
// - ROSS 360 can also book a slot with no deposit (a founding offer or an agreed arrangement); the
//   whole total is then the balance, requested the same way.
// - Cancelling more than 48 hours before the slot refunds everything paid. Within 48 hours ROSS 360
//   decides what to keep, up to the whole deposit (ROSS 360, 5 November 2026); nothing is kept
//   automatically.

import { addDays, ukToday } from './quotes.js';
import { site } from '../../content/site.js';

// The deposit, as a percentage of the quote total (ROSS 360, 5 November 2026).
export const DEPOSIT_PERCENT = 25;

// Days the customer has to pay the balance after ROSS 360 sends the balance request.
export const BALANCE_DUE_DAYS = 7;

// The slot is held while the customer is on Stripe Checkout. Stripe's shortest Checkout expiry is 30
// minutes, so the session is created to expire 30 minutes after it starts (plus a few seconds for the
// request itself) and the hold lasts until just after that, so the slot cannot go to anyone else while
// the session can still be paid.
export const CHECKOUT_MINUTES = 30;
export const CHECKOUT_SLACK_SECONDS = 20;
export const HOLD_MARGIN_SECONDS = 60;

export const FREE_CANCELLATION_HOURS = site.policy.freeCancellationHours; // 48

// When each period starts, for the 48-hour cancellation rule (UK local time), as set by ROSS 360
// (6 October 2026).
export const SLOT_START = { am: '09:00', pm: '13:00', day: '09:00' };

export const BOOKING_STATUSES = [
  { value: 'holding', label: 'Checkout in progress' },
  { value: 'expired', label: 'Checkout not completed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancel_requested', label: 'Cancellation requested' },
  { value: 'cancelled', label: 'Cancelled' },
];
export const ACTIVE_BOOKING_STATUSES = ['holding', 'confirmed', 'cancel_requested'];
export const bookingStatusLabel = (value) => BOOKING_STATUSES.find((s) => s.value === value)?.label ?? value;

export const CANCEL_REASONS = {
  customer: 'Cancelled by the customer',
  customer_late: 'Cancelled by the customer within 48 hours',
  unpaid_balance: 'Balance not paid by the deadline', // bookings cancelled before 30 October 2026
  ross360: 'Cancelled by ROSS 360',
  slot_unavailable: 'Paid after the slot was taken',
};

export const PAYMENT_KINDS = { full: 'Payment in full', deposit: 'Deposit', balance: 'Balance' };

/** Whole calendar days from `from` to `to` (YYYY-MM-DD). */
export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The deposit for a quote total: DEPOSIT_PERCENT of it, rounded up to the whole pound. */
export function depositFor(totalPence) {
  if (!Number.isSafeInteger(totalPence) || totalPence <= 0) return 0;
  return Math.ceil((totalPence * DEPOSIT_PERCENT) / 10_000) * 100;
}

/**
 * What a customer pays to book a quote total: { totalPence, depositPence, balancePence }. When the
 * deposit would be the whole total (a very small quote), the booking is paid in full: depositPence is
 * null and plan is 'full'.
 */
export function paymentOptions({ totalPence }) {
  const deposit = depositFor(totalPence);
  if (deposit <= 0 || deposit >= totalPence) return { totalPence, plan: 'full', dueNowPence: totalPence, depositPence: null, balancePence: 0 };
  return { totalPence, plan: 'deposit', dueNowPence: deposit, depositPence: deposit, balancePence: totalPence - deposit };
}

/** The UK date the balance is due when ROSS 360 sends the balance request on `requestedOn`. */
export const balanceDueOn = (requestedOn) => addDays(requestedOn, BALANCE_DUE_DAYS);

/**
 * Whether ROSS 360 can send the balance request for a booking today: confirmed, something left to
 * pay, and the shoot date reached.
 */
export const canRequestBalance = (b, today = ukToday()) =>
  Boolean(b) && b.status === 'confirmed' && b.totalPence - b.paidPence > 0 && b.slotDate <= today;

// --- UK clock times -------------------------------------------------------------------------------

function londonOffsetMinutes(at) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .formatToParts(at)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** The instant (Date) of a UK wall-clock time on a UK date, e.g. ukInstant('2026-10-25', '09:00'). */
export function ukInstant(date, time = '00:00') {
  const [h, m] = time.split(':').map(Number);
  const guess = new Date(Date.parse(`${date}T00:00:00Z`) + (h * 60 + m) * 60000);
  const first = new Date(guess.getTime() - londonOffsetMinutes(guess) * 60000);
  // Re-check once in case the guess and the answer fall either side of a clock change.
  return new Date(guess.getTime() - londonOffsetMinutes(first) * 60000);
}

/** The UK hour (0–23) at an instant. */
export const ukHour = (at = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hourCycle: 'h23', hour: '2-digit' }).format(at));

/** The end of a UK date: the first instant of the next day. */
export const ukEndOfDay = (date) => ukInstant(addDays(date, 1), '00:00');

/** When a slot starts. */
export const slotStart = (date, period) => ukInstant(date, SLOT_START[period] || '09:00');

/**
 * Which cancellation rule applies at `at`: 'free' (more than 48 hours before the slot), 'late' (within
 * 48 hours, before it starts) or 'started' (the slot has started).
 */
export function cancellationWindow(date, period, at = new Date()) {
  const start = slotStart(date, period).getTime();
  if (at.getTime() >= start) return 'started';
  return start - at.getTime() > FREE_CANCELLATION_HOURS * 3_600_000 ? 'free' : 'late';
}

/**
 * The most ROSS 360 may keep on a late cancellation: the deposit, and never more than was paid. A
 * booking made with no deposit keeps nothing; one paid in full before 5 November 2026 (no deposit
 * recorded) is treated as if it had paid the deposit for its total.
 */
export const maxRetention = (totalPence, paidPence, depositPence = null) =>
  Math.max(0, Math.min(paidPence, depositPence ?? depositFor(totalPence)));

/**
 * Whether a sent quotation can be booked and paid online: only quotes the administrator explicitly
 * marked as for a business (CUSTOMER_TYPES in quotes.js). Consumer and property bookings are arranged
 * by email until the consumer cancellation wording has had legal review (ROSS 360, 6 October 2026).
 */
export const onlineBooking = (snapshot) => snapshot?.customerType === 'business';
