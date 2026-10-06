// ROSS 360 Admin: quote pricing and validation (Phase B).
// Shared by the Admin app (admin/) and the Pages Functions (functions/api/admin, server/admin), so the
// browser shows exactly the totals the server will store. The server always recalculates the totals
// itself and ignores any the browser sends. Keep it dependency-free.
//
// All money is whole pence (integers). Amounts typed in pounds are converted with poundsToPence.

import { plans } from '../../content/pricing.js';
import { poundsToPence } from './model.js';

export const QUOTE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sending', label: 'Sending' },
  { value: 'send_unknown', label: 'Send status unknown' },
  { value: 'sent', label: 'Sent' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'discarded', label: 'Discarded' },
];
export const quoteStatusLabel = (value) => QUOTE_STATUSES.find((s) => s.value === value)?.label ?? value;

// Sequential quote references: Q-0001, Q-0002 … Q-9999, Q-10000.
export const formatQuoteReference = (n) => `Q-${String(n).padStart(4, '0')}`;
export const QUOTE_REFERENCE_RE = /^Q-\d{4,}$/;

// The published packages (src/content/pricing.js) are the starting prices. Choosing one adds a line at
// that price, which can then be changed for the quote in hand.
export const PACKAGES = plans.map((plan) => ({
  id: plan.id,
  name: plan.name,
  pence: plan.price * 100,
  description: `${plan.name} 360° virtual tour`,
}));
export const PACKAGE_IDS = PACKAGES.map((p) => p.id);
export const packageById = (id) => PACKAGES.find((p) => p.id === id) || null;

/** The line a package adds to a quote, at its published starting price. */
export function packageItem(id) {
  const pkg = packageById(id);
  if (!pkg) return null;
  return { kind: 'package', description: pkg.description, quantity: 1, unitPence: pkg.pence };
}

export const QUOTE_LIMITS = {
  maxItems: 20,
  description: 200,
  minQuantity: 1,
  maxQuantity: 99,
  maxUnitPence: 10_000_000, // £100,000
  maxTravelPence: 10_000_000,
  minValidDays: 1,
  maxValidDays: 90,
  defaultValidDays: 14,
  name: 200,
  business: 200,
  email: 254,
  location: 300,
  serviceDescription: 2000,
  internalNotes: 2000,
  discountLabel: 100,
  travelOverrideReason: 300,
};

// The text fields of a quote: API name -> { column, label, max }.
export const QUOTE_TEXT_FIELDS = {
  customerName: { column: 'customer_name', label: 'Customer name', max: QUOTE_LIMITS.name },
  customerBusiness: { column: 'customer_business', label: 'Business / organisation', max: QUOTE_LIMITS.business },
  customerEmail: { column: 'customer_email', label: 'Customer email', max: QUOTE_LIMITS.email },
  customerLocation: { column: 'customer_location', label: 'Address / postcode', max: QUOTE_LIMITS.location },
  serviceDescription: { column: 'service_description', label: 'Service description', max: QUOTE_LIMITS.serviceDescription },
  internalNotes: { column: 'internal_notes', label: 'Internal notes', max: QUOTE_LIMITS.internalNotes },
  discountLabel: { column: 'discount_label', label: 'Discount description', max: QUOTE_LIMITS.discountLabel },
  // Internal, like internal notes: never shown to the customer.
  travelOverrideReason: { column: 'travel_override_reason', label: 'Travel override reason', max: QUOTE_LIMITS.travelOverrideReason },
};

export const QUOTE_NUMBER_FIELDS = {
  travelPence: { column: 'travel_pence', label: 'Travel' },
  discountPence: { column: 'discount_pence', label: 'Discount' },
  validDays: { column: 'valid_days', label: 'Validity' },
};

// --- Travel from mileage ------------------------------------------------------------------------
//
// The administrator enters the one-way driving distance (from Google Maps). The first 10 miles each
// way are free; the rest of the round trip is charged at 50p a mile, rounded up to the next whole
// pound. Over 300 miles one way, travel is entered by hand instead. Distances are whole tenths of a
// mile (23.6 miles = 236) and money whole pence, so the calculation is exact integer arithmetic.
export const MILEAGE_RULE = {
  ratePence: 50,
  freeOneWayTenths: 100,
  maxOneWayTenths: 3000,
};
export const TRAVEL_MODES = ['manual', 'mileage'];

/**
 * Travel for a one-way distance under a rule.
 * Returns { chargeableTenths, exactPence, calculatedPence }:
 *   chargeableTenths = max(0, one way − free) × 2
 *   exactPence       = chargeable miles × rate (rounded up to a whole penny)
 *   calculatedPence  = exactPence rounded up to the next whole pound
 */
export function mileageTravel(oneWayTenths, rule = MILEAGE_RULE) {
  const chargeableTenths = Math.max(0, oneWayTenths - rule.freeOneWayTenths) * 2;
  const tenthPence = chargeableTenths * rule.ratePence; // tenths of a mile × pence a mile = tenths of a penny
  return {
    chargeableTenths,
    exactPence: Math.ceil(tenthPence / 10),
    calculatedPence: Math.floor((tenthPence + 999) / 1000) * 100,
  };
}

const MILES_RE = /^\d{1,5}(\.\d)?$/;

/** Miles as typed ("23.6", "85") -> whole tenths of a mile; null when blank; NaN when not valid. */
export function typedMilesTenths(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!MILES_RE.test(text)) return NaN;
  const [whole, tenth = '0'] = text.split('.');
  return Number(whole) * 10 + Number(tenth);
}

/** 236 -> "23.6" */
export const formatMiles = (tenths) => (tenths / 10).toFixed(1);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isInt = (value) => Number.isSafeInteger(value);

/**
 * Line amounts, subtotal and total, in whole pence.
 * subtotal = Σ quantity × unit; total = subtotal + travel − discount.
 */
export function calculateTotals({ items = [], travelPence = 0, discountPence = 0 }) {
  const lines = items.map((item) => ({ ...item, amountPence: item.quantity * item.unitPence }));
  const subtotalPence = lines.reduce((sum, item) => sum + item.amountPence, 0);
  return { items: lines, subtotalPence, totalPence: subtotalPence + travelPence - discountPence };
}

/**
 * Validate a whole quote draft as the API receives it: text fields as strings, money as integer pence,
 * quantity and validity as integers, and `items` as a list of { kind, description, quantity, unitPence }.
 * A missing text field is treated as empty and missing money as 0. Any other type (a float, a number
 * given as text, an object) sets `badType`, so the API answers 400 rather than guessing.
 *
 * Returns { valid, errors, values, badType }. `values` holds the cleaned draft plus the calculated
 * item amounts, subtotalPence and totalPence.
 */
export function validateQuoteDraft(input = {}) {
  const errors = {};
  const values = {};
  let badType = false;
  const wrongType = (key) => {
    errors[key] = 'Invalid value.';
    badType = true;
  };

  for (const [key, field] of Object.entries(QUOTE_TEXT_FIELDS)) {
    const raw = input[key];
    if (raw !== undefined && raw !== null && typeof raw !== 'string') {
      wrongType(key);
      continue;
    }
    const value = (raw ?? '').trim();
    if (value.length > field.max) errors[key] = 'Please shorten this.';
    values[key] = value;
  }
  if (values.customerEmail && !EMAIL_RE.test(values.customerEmail)) {
    errors.customerEmail = 'Please enter a valid email address.';
  }

  const pkg = input.package;
  if (pkg !== undefined && pkg !== null && typeof pkg !== 'string') wrongType('package');
  else if (pkg && !PACKAGE_IDS.includes(pkg)) errors.package = 'Please choose one of the listed packages.';
  else values.package = pkg || null;

  const integer = (key, fallback, min, max, message) => {
    const raw = input[key];
    if (raw === undefined || raw === null) return fallback;
    if (!isInt(raw)) {
      wrongType(key);
      return fallback;
    }
    if (raw < min || raw > max) errors[key] = message;
    return raw;
  };
  const mode = input.travelMode === undefined || input.travelMode === null ? 'manual' : input.travelMode;
  if (!TRAVEL_MODES.includes(mode)) wrongType('travelMode');
  const override = input.travelOverride === undefined || input.travelOverride === null ? false : input.travelOverride;
  if (typeof override !== 'boolean') wrongType('travelOverride');
  // The amount typed by hand: always in manual mode, and in mileage mode only when it overrides.
  const typedTravel = mode !== 'mileage' || override === true;
  values.travelPence = typedTravel
    ? integer('travelPence', 0, 0, QUOTE_LIMITS.maxTravelPence, 'Please enter a travel amount between £0 and £100,000.')
    : 0;
  values.discountPence = integer('discountPence', 0, 0, Number.MAX_SAFE_INTEGER, 'The discount cannot be negative.');
  values.validDays = integer(
    'validDays',
    QUOTE_LIMITS.defaultValidDays,
    QUOTE_LIMITS.minValidDays,
    QUOTE_LIMITS.maxValidDays,
    `Please enter between ${QUOTE_LIMITS.minValidDays} and ${QUOTE_LIMITS.maxValidDays} days.`,
  );

  const items = [];
  const rawItems = input.items === undefined || input.items === null ? [] : input.items;
  if (!Array.isArray(rawItems)) wrongType('items');
  else {
    if (rawItems.length > QUOTE_LIMITS.maxItems) errors.items = `A quote can have up to ${QUOTE_LIMITS.maxItems} lines.`;
    let packageLines = 0;
    rawItems.slice(0, QUOTE_LIMITS.maxItems).forEach((raw, index) => {
      const at = (name) => `items.${index}.${name}`;
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        wrongType(`items.${index}`);
        return;
      }
      const kind = raw.kind === undefined ? 'custom' : raw.kind;
      if (kind !== 'custom' && kind !== 'package') {
        wrongType(at('kind'));
        return;
      }
      if (kind === 'package') packageLines += 1;
      if (typeof raw.description !== 'string') wrongType(at('description'));
      if (!isInt(raw.quantity)) wrongType(at('quantity'));
      if (!isInt(raw.unitPence)) wrongType(at('unitPence'));
      if (badType) return;
      const description = raw.description.trim();
      if (!description) errors[at('description')] = 'Please describe this line.';
      else if (description.length > QUOTE_LIMITS.description) errors[at('description')] = 'Please shorten this.';
      if (raw.quantity < QUOTE_LIMITS.minQuantity || raw.quantity > QUOTE_LIMITS.maxQuantity) {
        errors[at('quantity')] = `Please enter a whole number from ${QUOTE_LIMITS.minQuantity} to ${QUOTE_LIMITS.maxQuantity}.`;
      }
      if (raw.unitPence < 0 || raw.unitPence > QUOTE_LIMITS.maxUnitPence) {
        errors[at('unitPence')] = 'Please enter a price between £0 and £100,000.';
      }
      items.push({ kind, description, quantity: raw.quantity, unitPence: raw.unitPence });
    });
    if (packageLines > 1) errors.items = 'A quote can have only one package line.';
  }

  // Travel. Mileage is recalculated here from the distance, whatever amount the browser sent.
  values.travelMode = TRAVEL_MODES.includes(mode) ? mode : 'manual';
  values.travelOverride = false;
  values.travelOneWayTenths = null;
  values.travelRatePence = null;
  values.travelFreeTenths = null;
  values.travelCalculatedPence = null;
  if (values.travelMode === 'mileage') {
    const tenths = input.travelOneWayTenths;
    if (tenths === undefined || tenths === null) {
      errors.travelOneWayTenths = 'Please enter the one-way distance in miles.';
    } else if (!isInt(tenths)) {
      wrongType('travelOneWayTenths');
    } else if (tenths < 0) {
      errors.travelOneWayTenths = 'Please enter the one-way distance in miles.';
    } else if (tenths > MILEAGE_RULE.maxOneWayTenths) {
      errors.travelOneWayTenths = `Over ${MILEAGE_RULE.maxOneWayTenths / 10} miles one way: please enter the travel amount by hand instead.`;
    } else {
      const calc = mileageTravel(tenths);
      values.travelOneWayTenths = tenths;
      values.travelRatePence = MILEAGE_RULE.ratePence;
      values.travelFreeTenths = MILEAGE_RULE.freeOneWayTenths;
      values.travelCalculatedPence = calc.calculatedPence;
      values.travelOverride = override === true;
      if (!values.travelOverride) values.travelPence = calc.calculatedPence;
    }
  }
  if (values.travelOverride) {
    if (!values.travelOverrideReason) errors.travelOverrideReason = 'Please give a reason for overriding the calculated amount.';
  } else {
    values.travelOverrideReason = '';
  }

  const totals = calculateTotals({ items, travelPence: values.travelPence, discountPence: values.discountPence });
  values.items = totals.items;
  values.subtotalPence = totals.subtotalPence;
  values.totalPence = totals.totalPence;

  if (!errors.discountPence && values.discountPence > values.subtotalPence + values.travelPence) {
    errors.discountPence = 'The discount cannot be more than the subtotal plus travel.';
  }
  if (values.discountPence > 0 && !values.discountLabel) {
    errors.discountLabel = 'Please describe the discount.';
  }
  if (values.discountPence === 0) values.discountLabel = '';

  return { valid: Object.keys(errors).length === 0, errors, values, badType };
}

/** What still stops a valid draft from being sent. An empty list means it can be sent. */
export function sendProblems(quote) {
  const problems = [];
  if (!String(quote.customerName || '').trim()) problems.push('Add the customer’s name.');
  if (!EMAIL_RE.test(String(quote.customerEmail || ''))) problems.push('Add a valid customer email address.');
  if (!quote.items?.length) problems.push('Add at least one line.');
  return problems;
}

/** Amounts typed in pounds in the Admin ("349", "1,249.50") -> pence, or NaN. */
export const typedPence = (value) => (String(value ?? '').trim() === '' ? 0 : poundsToPence(value));

// --- Dates (UK) ---------------------------------------------------------------------------------

/** Today's date in the UK, as YYYY-MM-DD. */
export function ukToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** YYYY-MM-DD plus a number of calendar days. */
export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "2026-10-19" -> "19 October 2026". */
export function longDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// A quote left in "sending" this long most likely means the request stopped before the result was
// recorded. It is treated like "send_unknown": never sent again automatically, only checked.
export const SEND_UNKNOWN_AFTER_MS = 10 * 60 * 1000;
