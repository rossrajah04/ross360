// Travel calculated from mileage (src/lib/admin/quotes.js): the agreed rule, its edge cases and the
// validation the server applies. 10 miles each way free, 50p a mile for the rest of the round trip,
// rounded up to the next whole pound; over 300 miles one way, travel is entered by hand.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MILEAGE_RULE,
  formatMiles,
  mileageTravel,
  typedMilesTenths,
  validateQuoteDraft,
} from '../src/lib/admin/quotes.js';

const line = { kind: 'custom', description: 'Tour', quantity: 1, unitPence: 34900 };
const mileage = (extra = {}) => validateQuoteDraft({ items: [line], travelMode: 'mileage', ...extra });

test('the agreed rule: 10 miles each way free, 50p a mile, round trip, up to the next whole pound', () => {
  assert.deepEqual(MILEAGE_RULE, { ratePence: 50, freeOneWayTenths: 100, maxOneWayTenths: 3000 });
  // The agreed example: (23.6 − 10) × 2 = 27.2 miles -> £13.60 -> £14.
  assert.deepEqual(mileageTravel(236), { chargeableTenths: 272, exactPence: 1360, calculatedPence: 1400 });
});

test('mileage edge cases', () => {
  const amount = (tenths) => mileageTravel(tenths).calculatedPence;
  assert.equal(amount(0), 0);
  assert.equal(amount(74), 0, 'inside the free distance');
  assert.equal(amount(100), 0, 'exactly the free distance');
  assert.equal(amount(101), 100, '0.2 chargeable miles is 10p, rounded up to £1');
  assert.equal(amount(200), 1000, '20 chargeable miles is exactly £10, not rounded further');
  assert.equal(amount(201), 1100, 'a penny over a pound rounds up');
  assert.equal(amount(850), 7500);
  assert.equal(amount(3000), 29000, '300 miles one way: 580 chargeable miles, £290');
  for (let tenths = 0; tenths <= 3000; tenths += 1) {
    const { exactPence, calculatedPence } = mileageTravel(tenths);
    assert.ok(Number.isInteger(calculatedPence) && calculatedPence % 100 === 0, `${tenths}: whole pounds`);
    assert.ok(calculatedPence >= exactPence && calculatedPence - exactPence < 100, `${tenths}: rounded up, by under £1`);
  }
});

test('miles as typed become whole tenths, to one decimal place', () => {
  assert.equal(typedMilesTenths('23.6'), 236);
  assert.equal(typedMilesTenths(' 85 '), 850);
  assert.equal(typedMilesTenths('12.0'), 120);
  assert.equal(typedMilesTenths(''), null);
  for (const bad of ['23.65', '-1', 'abc', '1e3', '23,6', '.5']) assert.ok(Number.isNaN(typedMilesTenths(bad)), bad);
  assert.equal(formatMiles(236), '23.6');
  assert.equal(formatMiles(850), '85.0');
});

test('mileage travel is recalculated from the distance; an amount sent with it is ignored', () => {
  const result = mileage({ travelOneWayTenths: 236, travelPence: 1 });
  assert.equal(result.valid, true);
  assert.equal(result.values.travelPence, 1400);
  assert.equal(result.values.travelCalculatedPence, 1400);
  assert.equal(result.values.travelRatePence, 50);
  assert.equal(result.values.travelFreeTenths, 100);
  assert.equal(result.values.travelOverride, false);
  assert.equal(result.values.totalPence, 34900 + 1400);
});

test('mileage needs a distance, and over 300 miles one way needs travel entered by hand', () => {
  assert.match(mileage({}).errors.travelOneWayTenths, /one-way distance/);
  assert.match(mileage({ travelOneWayTenths: -5 }).errors.travelOneWayTenths, /one-way distance/);
  assert.equal(mileage({ travelOneWayTenths: 3000 }).valid, true);
  const over = mileage({ travelOneWayTenths: 3001 });
  assert.match(over.errors.travelOneWayTenths, /Over 300 miles one way: please enter the travel amount by hand/);
  // Overriding does not get round the limit; manual entry does.
  assert.ok(mileage({ travelOneWayTenths: 3001, travelOverride: true, travelPence: 50000, travelOverrideReason: 'Long trip' }).errors.travelOneWayTenths);
  assert.equal(validateQuoteDraft({ items: [line], travelMode: 'manual', travelPence: 50000 }).valid, true);
});

test('wrong types are rejected outright', () => {
  assert.equal(mileage({ travelOneWayTenths: 23.6 }).badType, true);
  assert.equal(mileage({ travelOneWayTenths: '236' }).badType, true);
  assert.equal(validateQuoteDraft({ travelMode: 'automatic' }).badType, true);
  assert.equal(mileage({ travelOneWayTenths: 236, travelOverride: 'yes' }).badType, true);
  assert.equal(mileage({ travelOneWayTenths: 236, travelOverrideReason: 5 }).badType, true);
});

test('an override uses the amount entered, keeps the calculated amount, and needs a reason', () => {
  const noReason = mileage({ travelOneWayTenths: 236, travelOverride: true, travelPence: 2000 });
  assert.match(noReason.errors.travelOverrideReason, /reason for overriding/);
  const blank = mileage({ travelOneWayTenths: 236, travelOverride: true, travelPence: 2000, travelOverrideReason: '   ' });
  assert.ok(blank.errors.travelOverrideReason);

  const ok = mileage({ travelOneWayTenths: 236, travelOverride: true, travelPence: 2000, travelOverrideReason: 'Toll bridge' });
  assert.equal(ok.valid, true);
  assert.equal(ok.values.travelPence, 2000);
  assert.equal(ok.values.travelCalculatedPence, 1400);
  assert.equal(ok.values.travelOverride, true);
  assert.equal(ok.values.travelOverrideReason, 'Toll bridge');
  assert.equal(ok.values.totalPence, 34900 + 2000);

  // The overriding amount is still checked like any travel amount.
  assert.ok(mileage({ travelOneWayTenths: 236, travelOverride: true, travelPence: -1, travelOverrideReason: 'x' }).errors.travelPence);
  assert.equal(mileage({ travelOneWayTenths: 236, travelOverride: true, travelPence: 12.5, travelOverrideReason: 'x' }).badType, true);
  assert.ok(
    mileage({ travelOneWayTenths: 236, travelOverride: true, travelPence: 2000, travelOverrideReason: 'x'.repeat(301) }).errors
      .travelOverrideReason,
  );
});

test('without an override, or in manual mode, the reason and the mileage working are cleared', () => {
  const notOverridden = mileage({ travelOneWayTenths: 236, travelOverride: false, travelOverrideReason: 'left over' });
  assert.equal(notOverridden.values.travelOverrideReason, '');

  const manual = validateQuoteDraft({
    items: [line],
    travelMode: 'manual',
    travelPence: 2500,
    travelOneWayTenths: 236,
    travelOverride: true,
    travelOverrideReason: 'left over',
  });
  assert.equal(manual.valid, true);
  assert.equal(manual.values.travelPence, 2500);
  assert.equal(manual.values.travelOneWayTenths, null);
  assert.equal(manual.values.travelCalculatedPence, null);
  assert.equal(manual.values.travelOverride, false);
  assert.equal(manual.values.travelOverrideReason, '');
});

test('manual travel works exactly as before when no travel method is given', () => {
  const result = validateQuoteDraft({ items: [line], travelPence: 2500 });
  assert.equal(result.valid, true);
  assert.equal(result.values.travelMode, 'manual');
  assert.equal(result.values.travelPence, 2500);
  assert.equal(result.values.totalPence, 34900 + 2500);
  assert.ok(validateQuoteDraft({ travelPence: -1 }).errors.travelPence);
});
