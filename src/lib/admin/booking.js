// Booking and payment rules (Phase C), shared by the customer page, the Admin, the API and the
// scheduled tasks. Agreed with ROSS 360 on 6 October 2026. Keep it dependency-free apart from the
// date helpers.
//
// - Deposits are fixed by package and count towards the quote total (which already includes travel).
// - A slot more than 7 days away can be paid in full or by deposit; 7 days or fewer: in full only.
// - A deposit booking's balance is due by the end of the UK day 7 days before the slot. Reminders go
//   14 and 8 days before the slot, where those dates are not already past when the booking is made.
// - Cancelling more than 48 hours before the slot refunds everything paid. Within 48 hours ROSS 360
//   decides what to keep, up to 50% of the booking price; nothing is kept automatically.

import { addDays, ukToday } from './quotes.js';
import { site } from '../../content/site.js';

// Fixed deposits, by package id (src/content/pricing.js): £249 / £349 / £499.
export const DEPOSITS = { essential: 5000, professional: 7000, bespoke: 10000 };

export const FULL_PAYMENT_WITHIN_DAYS = 7; // 7 days or fewer before the slot: pay in full
export const BALANCE_DUE_DAYS = 7; // balance due by the end of the day this many days before the slot
export const REMINDER_DAYS = [14, 8]; // balance reminders, days before the slot
export const REMINDER_FROM_HOUR = 9; // reminders are not emailed before 09:00 UK time

// The slot is held while the customer is on Stripe Checkout. Stripe's shortest Checkout expiry is 30
// minutes, so the session is created to expire 30 minutes after it starts (plus a few seconds for the
// request itself) and the hold lasts until just after that, so the slot cannot go to anyone else while
// the session can still be paid.
export const CHECKOUT_MINUTES = 30;
export const CHECKOUT_SLACK_SECONDS = 20;
export const HOLD_MARGIN_SECONDS = 60;

export const FREE_CANCELLATION_HOURS = site.policy.freeCancellationHours; // 48
export const LATE_CANCELLATION_MAX_PERCENT = site.policy.lateCancellationMaxPercent; // 50

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
  unpaid_balance: 'Balance not paid by the deadline',
  ross360: 'Cancelled by ROSS 360',
  slot_unavailable: 'Paid after the slot was taken',
};

export const PAYMENT_KINDS = { full: 'Payment in full', deposit: 'Deposit', balance: 'Balance' };

/** Whole calendar days from `from` to `to` (YYYY-MM-DD). */
export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The fixed deposit for a quote's package, or null when the package has none. */
export const depositFor = (pkg) => (Object.hasOwn(DEPOSITS, pkg || '') ? DEPOSITS[pkg] : null);

/**
 * The payment choices for a quote total and a slot date, booked on `today` (UK).
 * Returns { totalPence, full: { dueNowPence }, deposit: { depositPence, balancePence, balanceDueOn } | null,
 *   noDeposit: null | 'no_package' | 'within_7_days' | 'total_too_low' }.
 */
export function paymentOptions({ totalPence, pkg, slotDate, today = ukToday() }) {
  const full = { dueNowPence: totalPence };
  const depositPence = depositFor(pkg);
  let noDeposit = null;
  if (depositPence === null) noDeposit = 'no_package';
  else if (daysBetween(today, slotDate) <= FULL_PAYMENT_WITHIN_DAYS) noDeposit = 'within_7_days';
  else if (totalPence <= depositPence) noDeposit = 'total_too_low';
  return {
    totalPence,
    full,
    deposit: noDeposit
      ? null
      : { depositPence, balancePence: totalPence - depositPence, balanceDueOn: balanceDueOn(slotDate) },
    noDeposit,
  };
}

/** The UK date by the end of which a deposit booking's balance must be paid. */
export const balanceDueOn = (slotDate) => addDays(slotDate, -BALANCE_DUE_DAYS);

/**
 * The reminder dates that apply to a deposit booking made on `bookedOn`: each reminder whose date is
 * not already past. Returns { r14: date | null, r8: date | null }.
 */
export function reminderDates(slotDate, bookedOn) {
  const [first, second] = REMINDER_DAYS.map((days) => addDays(slotDate, -days));
  return { r14: bookedOn <= first ? first : null, r8: bookedOn <= second ? second : null };
}

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

/** Whether a deposit's balance deadline has passed at `at`. */
export const balanceOverdue = (balanceDueOnDate, at = new Date()) => at.getTime() >= ukEndOfDay(balanceDueOnDate).getTime();

/**
 * Which cancellation rule applies at `at`: 'free' (more than 48 hours before the slot), 'late' (within
 * 48 hours, before it starts) or 'started' (the slot has started).
 */
export function cancellationWindow(date, period, at = new Date()) {
  const start = slotStart(date, period).getTime();
  if (at.getTime() >= start) return 'started';
  return start - at.getTime() > FREE_CANCELLATION_HOURS * 3_600_000 ? 'free' : 'late';
}

/** The most ROSS 360 may keep on a late cancellation: 50% of the booking price, and never more than was paid. */
export const maxRetention = (totalPence, paidPence) =>
  Math.max(0, Math.min(paidPence, Math.floor((totalPence * LATE_CANCELLATION_MAX_PERCENT) / 100)));

/**
 * Whether a sent quotation can be booked and paid online: only quotes the administrator explicitly
 * marked as for a business (CUSTOMER_TYPES in quotes.js). Consumer and property bookings are arranged
 * by email until the consumer cancellation wording has had legal review (ROSS 360, 6 October 2026).
 */
export const onlineBooking = (snapshot) => snapshot?.customerType === 'business';
