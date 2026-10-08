// Availability (Phase C), shared by the Admin, the API and the customer pages.

export const PERIODS = [
  { value: 'am', label: 'Morning' },
  { value: 'pm', label: 'Afternoon' },
  { value: 'day', label: 'Full day' },
];
export const PERIOD_VALUES = PERIODS.map((p) => p.value);
export const periodLabel = (value) => PERIODS.find((p) => p.value === value)?.label ?? value;

// Overlap rule: on any date the open slots are either one Full day, or Morning and/or Afternoon.
export const conflictingPeriods = (period) => (period === 'day' ? ['am', 'pm'] : ['day']);

// Customers can book open slots from today + 2 days to today + 8 weeks (UK dates).
export const REQUEST_WINDOW = { minDays: 2, maxDays: 56 };

export const SLOT_NOTE_MAX = 300;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-10-14" -> "Wednesday 14 October 2026" (the same in every runtime, whatever its locale data). */
export function weekdayDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
