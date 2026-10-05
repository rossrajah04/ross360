// ROSS 360 Admin: enquiry statuses, scheduling options and validation.
// Shared by the Admin app (admin/) and the Pages Functions (functions/api/admin, server/admin),
// so the rules cannot drift apart. Keep it dependency-free.

import { PROJECT_TYPES, SPACE_TYPES, SOURCES, LIMITS } from '../quoteSchema.js';

export const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'payment_pending', label: 'Payment Pending' },
  { value: 'booked', label: 'Booked' },
  { value: 'captured', label: 'Captured' },
  { value: 'in_production', label: 'In Production' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'complete', label: 'Complete' },
  { value: 'lost', label: 'Lost' },
  { value: 'declined', label: 'Declined' },
];

export const STATUS_VALUES = STATUSES.map((s) => s.value);
export const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label ?? value;

// Which statuses each dashboard figure counts.
export const DASHBOARD_GROUPS = {
  newEnquiries: ['new'],
  quotesAwaiting: ['quoted'],
  upcomingBookings: ['booked'],
  inProduction: ['captured', 'in_production', 'quality_check'],
  paymentsOutstanding: ['accepted', 'payment_pending'],
};

export const PREMISES_CONDITIONS = [
  { value: 'operating', label: 'Operating' },
  { value: 'quiet', label: 'Quiet period' },
  { value: 'empty', label: 'Empty' },
  { value: 'no_preference', label: 'No preference' },
];

export const DAYLIGHT_OPTIONS = [
  { value: 'preferred', label: 'Natural daylight preferred' },
  { value: 'essential', label: 'Daylight essential' },
  { value: 'no_preference', label: 'No preference' },
];

export const FLEXIBLE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const optionLabel = (options, value) => options.find((o) => o.value === value)?.label ?? '';

// Sequential enquiry references: ROSS-0001, ROSS-0002 … ROSS-9999, ROSS-10000.
export const formatReference = (n) => `ROSS-${String(n).padStart(4, '0')}`;
export const REFERENCE_RE = /^ROSS-\d{4,}$/;

// Fields the Admin can edit, with their API name, database column and rules.
// type: text (free text up to max), choice (one of options, or empty), money (pounds -> pence), date (YYYY-MM-DD).
export const FIELDS = {
  name: { column: 'name', label: 'Name', type: 'text', max: LIMITS.short },
  business: { column: 'business', label: 'Business / organisation', type: 'text', max: LIMITS.short },
  email: { column: 'email', label: 'Email', type: 'email', max: 254 },
  phone: { column: 'phone', label: 'Phone', type: 'text', max: 40 },
  projectType: {
    column: 'project_type',
    label: 'Project type',
    type: 'choice',
    options: PROJECT_TYPES.map((t) => t.value),
  },
  projectOther: { column: 'project_other', label: 'Project type (other)', type: 'text', max: LIMITS.medium },
  spaceType: { column: 'space_type', label: 'Business / property type', type: 'choice', options: SPACE_TYPES },
  location: { column: 'location', label: 'Address / postcode', type: 'text', max: LIMITS.medium },
  size: { column: 'size', label: 'Approximate size', type: 'text', max: LIMITS.medium },
  areas: { column: 'areas', label: 'Areas to be photographed', type: 'text', max: LIMITS.long },
  message: { column: 'message', label: 'Anything else', type: 'text', max: LIMITS.long },
  preferredDate: { column: 'preferred_date', label: 'Preferred date (from enquiry)', type: 'text', max: LIMITS.short },
  source: { column: 'source', label: 'How they heard about ROSS 360', type: 'choice', options: SOURCES },

  premisesCondition: {
    column: 'premises_condition',
    label: 'Premises condition',
    type: 'choice',
    options: PREMISES_CONDITIONS.map((o) => o.value),
  },
  daylight: {
    column: 'daylight',
    label: 'Daylight preference',
    type: 'choice',
    options: DAYLIGHT_OPTIONS.map((o) => o.value),
  },
  flexibleTiming: {
    column: 'flexible_timing',
    label: 'Flexible timing',
    type: 'choice',
    options: FLEXIBLE_OPTIONS.map((o) => o.value),
  },
  preferredDateTime: { column: 'preferred_datetime', label: 'Preferred date / time', type: 'text', max: LIMITS.short },
  schedulingNotes: { column: 'scheduling_notes', label: 'Scheduling notes', type: 'text', max: LIMITS.long },

  projectValue: { column: 'project_value_pence', label: 'Agreed price', type: 'money' },
  amountPaid: { column: 'amount_paid_pence', label: 'Amount received', type: 'money' },
  paidOn: { column: 'paid_on', label: 'Date received', type: 'date' },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY_RE = /^\d{1,7}(\.\d{1,2})?$/;

// "1,249.50" or "£249" -> 124950 pence. Returns NaN when it is not a valid amount.
export function poundsToPence(input) {
  const cleaned = String(input).replace(/[£,\s]/g, '');
  if (!MONEY_RE.test(cleaned)) return NaN;
  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export const penceToPounds = (pence) =>
  pence === null || pence === undefined ? '' : (pence / 100).toFixed(2).replace(/\.00$/, '');

export const formatMoney = (pence) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((pence || 0) / 100);

/**
 * Validate a partial update from the Admin. Only keys present in `input` are checked.
 * Empty strings clear a field (null in the database for choice, money and date fields).
 * Returns { valid, errors, values } where `values` maps API field name -> database value.
 */
export function validateEnquiryPatch(input = {}) {
  const errors = {};
  const values = {};
  for (const [key, raw] of Object.entries(input)) {
    const field = FIELDS[key];
    if (!field) continue;
    const value = typeof raw === 'string' ? raw.trim() : raw === null || raw === undefined ? '' : String(raw);
    switch (field.type) {
      case 'text':
        if (value.length > field.max) errors[key] = 'Please shorten this.';
        else values[key] = value;
        break;
      case 'email':
        if (value && (!EMAIL_RE.test(value) || value.length > field.max)) errors[key] = 'Please enter a valid email address.';
        else values[key] = value;
        break;
      case 'choice':
        if (value && !field.options.includes(value)) errors[key] = 'Please choose one of the listed options.';
        else values[key] = value || null;
        break;
      case 'money': {
        if (!value) values[key] = null;
        else {
          const pence = poundsToPence(value);
          if (Number.isNaN(pence)) errors[key] = 'Please enter an amount in pounds, like 349 or 349.50.';
          else values[key] = pence;
        }
        break;
      }
      case 'date':
        if (value && (!DATE_RE.test(value) || Number.isNaN(Date.parse(value)))) errors[key] = 'Please enter a valid date.';
        else values[key] = value || null;
        break;
      default:
        break;
    }
  }
  // Fields from the original enquiry that the record cannot be without.
  if ('name' in values && !values.name) errors.name = 'Please enter a name.';
  return { valid: Object.keys(errors).length === 0, errors, values };
}

/**
 * Validate an enquiry entered by hand in the Admin (for example, one taken by phone).
 * Only a name and a way to contact the customer are required.
 */
export function validateManualEnquiry(input = {}) {
  const known = Object.fromEntries(Object.entries(input).filter(([key]) => key in FIELDS));
  const result = validateEnquiryPatch({ name: '', ...known });
  const { values, errors } = result;
  if (!values.email && !values.phone && !errors.email) errors.email = 'Please enter an email address or phone number.';
  return { valid: Object.keys(errors).length === 0, errors, values };
}
