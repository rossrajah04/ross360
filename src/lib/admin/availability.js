// Availability and date requests (Phase C), shared by the Admin, the API and the customer page.

export const PERIODS = [
  { value: 'am', label: 'Morning' },
  { value: 'pm', label: 'Afternoon' },
  { value: 'day', label: 'Full day' },
];
export const PERIOD_VALUES = PERIODS.map((p) => p.value);
export const periodLabel = (value) => PERIODS.find((p) => p.value === value)?.label ?? value;

// Overlap rule: on any date the open slots are either one Full day, or Morning and/or Afternoon.
export const conflictingPeriods = (period) => (period === 'day' ? ['am', 'pm'] : ['day']);

// Customers are offered open slots from today + 2 days to today + 8 weeks (UK dates).
export const REQUEST_WINDOW = { minDays: 2, maxDays: 56 };

export const DATE_REQUEST_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'replaced', label: 'Replaced by the customer' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'closed', label: 'Closed' },
];
export const dateRequestStatusLabel = (value) => DATE_REQUEST_STATUSES.find((s) => s.value === value)?.label ?? value;

export const SLOT_NOTE_MAX = 300;
export const CUSTOMER_NOTE_MAX = 500;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-10-14" -> "Wednesday 14 October 2026" (the same in every runtime, whatever its locale data). */
export function weekdayDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** A customer's note as stored: trimmed, line breaks kept, other control characters removed. */
export function cleanNote(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .trim();
}
