// Quote pricing and validation (src/lib/admin/quotes.js), shared by the Admin app and the server.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PACKAGES,
  QUOTE_LIMITS,
  QUOTE_REFERENCE_RE,
  addDays,
  calculateTotals,
  formatQuoteReference,
  longDate,
  packageItem,
  sendProblems,
  typedPence,
  ukToday,
  validateQuoteDraft,
} from '../src/lib/admin/quotes.js';
import { plans } from '../src/content/pricing.js';

const line = (overrides = {}) => ({ kind: 'custom', description: 'Extra area', quantity: 1, unitPence: 5000, ...overrides });

test('packages come from the published starting prices, in pence', () => {
  assert.deepEqual(
    PACKAGES.map((p) => [p.id, p.pence]),
    [
      ['essential', 24900],
      ['professional', 34900],
      ['bespoke', 49900],
    ],
  );
  assert.equal(PACKAGES.length, plans.length);
  assert.deepEqual(packageItem('professional'), {
    kind: 'package',
    description: 'Professional 360° virtual tour',
    quantity: 1,
    unitPence: 34900,
  });
  assert.equal(packageItem('nope'), null);
});

test('a package price can be changed for one quote', () => {
  const { valid, values } = validateQuoteDraft({ package: 'professional', items: [{ ...packageItem('professional'), unitPence: 39900 }] });
  assert.equal(valid, true);
  assert.equal(values.totalPence, 39900);
});

test('totals: quantity × unit, subtotal, travel and discount, all in whole pence', () => {
  const totals = calculateTotals({
    items: [line({ quantity: 1, unitPence: 34900 }), line({ quantity: 3, unitPence: 1999 })],
    travelPence: 2500,
    discountPence: 3000,
  });
  assert.deepEqual(totals.items.map((i) => i.amountPence), [34900, 5997]);
  assert.equal(totals.subtotalPence, 40897);
  assert.equal(totals.totalPence, 40897 + 2500 - 3000);
  assert.ok(Number.isInteger(totals.totalPence));
});

test('validated drafts carry server-calculated totals and ignore totals sent with them', () => {
  const { valid, values } = validateQuoteDraft({
    items: [line({ quantity: 2, unitPence: 12345 })],
    travelPence: 1000,
    subtotalPence: 1,
    totalPence: 1,
  });
  assert.equal(valid, true);
  assert.equal(values.subtotalPence, 24690);
  assert.equal(values.totalPence, 25690);
});

test('money must be whole pence: floats, numeric strings and other types are refused as bad requests', () => {
  for (const bad of [349.5, 0.1 + 0.2, '34900', NaN, Infinity, {}, [], true]) {
    const result = validateQuoteDraft({ items: [line({ unitPence: bad })] });
    assert.equal(result.badType, true, `unitPence ${String(bad)}`);
  }
  assert.equal(validateQuoteDraft({ travelPence: 10.5 }).badType, true);
  assert.equal(validateQuoteDraft({ discountPence: '100' }).badType, true);
  assert.equal(validateQuoteDraft({ items: [line({ quantity: 1.5 })] }).badType, true);
  assert.equal(validateQuoteDraft({ validDays: '14' }).badType, true);
  assert.equal(validateQuoteDraft({ customerName: 42 }).badType, true);
  assert.equal(validateQuoteDraft({ items: 'one' }).badType, true);
  assert.equal(validateQuoteDraft({ items: [null] }).badType, true);
  assert.equal(validateQuoteDraft({ items: [line({ kind: 'percentage' })] }).badType, true);
  assert.equal(validateQuoteDraft({ package: 3 }).badType, true);
});

test('limits: quantity, unit price, travel, number of lines, descriptions and validity', () => {
  const errorsOf = (input) => validateQuoteDraft(input).errors;
  assert.ok(errorsOf({ items: [line({ quantity: 0 })] })['items.0.quantity']);
  assert.ok(errorsOf({ items: [line({ quantity: 100 })] })['items.0.quantity']);
  assert.equal(validateQuoteDraft({ items: [line({ quantity: 99 })] }).valid, true);
  assert.ok(errorsOf({ items: [line({ unitPence: -1 })] })['items.0.unitPence']);
  assert.ok(errorsOf({ items: [line({ unitPence: QUOTE_LIMITS.maxUnitPence + 1 })] })['items.0.unitPence']);
  assert.equal(validateQuoteDraft({ items: [line({ unitPence: 0 })] }).valid, true);
  assert.ok(errorsOf({ travelPence: -1 }).travelPence);
  assert.ok(errorsOf({ items: Array.from({ length: 21 }, () => line()) }).items);
  assert.equal(validateQuoteDraft({ items: Array.from({ length: 20 }, () => line()) }).valid, true);
  assert.ok(errorsOf({ items: [line({ description: '   ' })] })['items.0.description']);
  assert.ok(errorsOf({ items: [line({ description: 'x'.repeat(201) })] })['items.0.description']);
  assert.ok(errorsOf({ validDays: 0 }).validDays);
  assert.ok(errorsOf({ validDays: 91 }).validDays);
  assert.equal(validateQuoteDraft({}).values.validDays, 14);
  assert.ok(errorsOf({ package: 'gold' }).package);
  assert.ok(errorsOf({ items: [packageItem('essential'), packageItem('professional')] }).items);
  assert.ok(errorsOf({ customerEmail: 'not-an-email' }).customerEmail);
  assert.ok(errorsOf({ serviceDescription: 'x'.repeat(2001) }).serviceDescription);
  assert.ok(errorsOf({ internalNotes: 'x'.repeat(2001) }).internalNotes);
});

test('discount: a fixed amount, never more than subtotal plus travel, and always described', () => {
  const base = { items: [line({ unitPence: 10000 })], travelPence: 2000 };
  assert.equal(validateQuoteDraft({ ...base, discountPence: 12000, discountLabel: 'Launch' }).valid, true);
  assert.equal(validateQuoteDraft({ ...base, discountPence: 12000, discountLabel: 'Launch' }).values.totalPence, 0);
  assert.ok(validateQuoteDraft({ ...base, discountPence: 12001, discountLabel: 'Too much' }).errors.discountPence);
  assert.ok(validateQuoteDraft({ ...base, discountPence: -1, discountLabel: 'x' }).errors.discountPence);
  assert.ok(validateQuoteDraft({ ...base, discountPence: 500 }).errors.discountLabel);
  // No discount: any label is dropped so it can never show on the quote.
  assert.equal(validateQuoteDraft({ ...base, discountPence: 0, discountLabel: 'Stale' }).values.discountLabel, '');
});

test('amounts typed in pounds convert to pence without floating-point error', () => {
  assert.equal(typedPence('349'), 34900);
  assert.equal(typedPence('£1,249.50'), 124950);
  assert.equal(typedPence('0.30'), 30);
  assert.equal(typedPence(''), 0);
  assert.ok(Number.isNaN(typedPence('12.345')));
  assert.ok(Number.isNaN(typedPence('-5')));
});

test('quote references are Q-0001 onwards and grow past 9999', () => {
  assert.equal(formatQuoteReference(1), 'Q-0001');
  assert.equal(formatQuoteReference(10000), 'Q-10000');
  assert.match('Q-0001', QUOTE_REFERENCE_RE);
  assert.doesNotMatch('Q-1', QUOTE_REFERENCE_RE);
  assert.doesNotMatch('ROSS-0001', QUOTE_REFERENCE_RE);
});

test('UK dates: issue date in UK time, validity added in calendar days', () => {
  assert.equal(ukToday(new Date('2026-10-04T23:30:00Z')), '2026-10-05'); // BST
  assert.equal(ukToday(new Date('2026-12-31T23:30:00Z')), '2026-12-31'); // GMT
  assert.equal(addDays('2026-10-05', 14), '2026-10-19');
  assert.equal(addDays('2026-12-25', 14), '2027-01-08');
  assert.equal(longDate('2026-10-19'), '19 October 2026');
});

test('a quote needs a name, a valid email, at least one line and a customer type before it can be sent', () => {
  assert.equal(sendProblems({ customerName: '', customerEmail: 'x', items: [] }).length, 4);
  assert.deepEqual(sendProblems({ customerName: 'Alex', customerEmail: 'alex@example.test', items: [line()], customerType: 'business' }), []);
  assert.deepEqual(sendProblems({ customerName: 'Alex', customerEmail: 'alex@example.test', items: [line()], customerType: 'consumer' }), []);
  assert.deepEqual(sendProblems({ customerName: 'Alex', customerEmail: 'alex@example.test', items: [line()] }), [
    'Choose whether the customer is a business or a consumer.',
  ]);
  // Never inferred from the business name.
  assert.equal(sendProblems({ customerName: 'Alex', customerBusiness: 'Alex Ltd', customerEmail: 'alex@example.test', items: [line()] }).length, 1);
  assert.equal(validateQuoteDraft({ customerType: 'company' }).valid, false);
});
