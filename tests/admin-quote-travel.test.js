// Travel from mileage in the Admin quote API: saving and recalculating on the server, overrides with
// an internal reason, privacy (the customer sees one Travel line only), the timeline, sent-quote
// immutability and revisions. Resend is never called for real.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1, adminEnv, callAdmin, cookieFrom } from './helpers/d1.js';
import { createEnquiry, getEnquiry } from '../server/admin/enquiries.js';
import { getQuote } from '../server/admin/quotes.js';
import { packageItem, ukToday } from '../src/lib/admin/quotes.js';

const REASON = 'PRIVATE-REASON: parking at the venue costs extra';

async function setUp() {
  const db = new FakeD1();
  const { env, email, password } = await adminEnv(db);
  env.RESEND_API_KEY = 'test-key-not-real';
  const signIn = await callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } });
  const cookie = cookieFrom(signIn.headers);
  const { reference: enquiry } = await createEnquiry(
    db,
    { name: 'Alex Customer', email: 'alex@example.test', location: 'M1 1AA' },
    { origin: 'admin', actor: email },
  );
  const call = (path, options = {}) => callAdmin(env, `/api/admin${path}`, { cookie, ...options });
  const created = await call(`/enquiries/${enquiry}/quotes`, { method: 'POST', body: {} });
  return { db, enquiry, call, reference: created.data.quote.reference };
}

async function withResend(run) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: init.body });
    return new Response(JSON.stringify({ id: 'resend-message-1' }), { status: 200 });
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const essentials = { package: 'essential', customerType: 'business', items: [packageItem('essential')] }; // £249
const save = (t, version, body) => t.call(`/quotes/${t.reference}`, { method: 'PATCH', body: { version, ...body } });
const row = (t, reference = t.reference) => t.db.db.prepare(`SELECT * FROM quotes WHERE reference = ?`).get(reference);
// Oldest first (the timeline lists newest first).
const updates = async (t) => (await getEnquiry(t.db, t.enquiry)).events.filter((e) => e.type === 'quote_updated').reverse();

async function sendIt(t, quote) {
  await t.call(`/quotes/${t.reference}/preview`);
  return withResend(async (calls) => {
    const sent = await t.call(`/quotes/${t.reference}/send`, {
      method: 'POST',
      body: { version: quote.version, confirm: true, previewedOn: ukToday() },
    });
    assert.equal(sent.status, 200, JSON.stringify(sent.data));
    return { sent: sent.data.quote, payload: JSON.parse(calls[0].body) };
  });
}

test('a new quote starts with manual travel, as before', async () => {
  const t = await setUp();
  const quote = await getQuote(t.db, t.reference);
  assert.equal(quote.travelMode, 'manual');
  assert.equal(quote.travelOneWayTenths, null);
  assert.equal(quote.travelOverride, false);
  assert.equal(quote.travelOverrideReason, '');
});

test('saving mileage travel calculates it on the server, ignoring any amount the browser sends', async () => {
  const t = await setUp();
  const saved = await save(t, 1, { ...essentials, travelMode: 'mileage', travelOneWayTenths: 236, travelPence: 1 });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const q = saved.data.quote;
  assert.equal(q.version, 2);
  assert.equal(q.travelMode, 'mileage');
  assert.equal(q.travelOneWayTenths, 236);
  assert.equal(q.travelRatePence, 50);
  assert.equal(q.travelFreeTenths, 100);
  assert.equal(q.travelCalculatedPence, 1400);
  assert.equal(q.travelPence, 1400);
  assert.equal(q.totalPence, 24900 + 1400);
  const r = row(t);
  assert.equal(r.travel_pence, 1400);
  assert.equal(r.travel_mode, 'mileage');
  assert.equal(r.travel_override, 0);

  // A later edit of the distance recalculates.
  const edited = await save(t, 2, { travelOneWayTenths: 850 });
  assert.equal(edited.data.quote.travelPence, 7500);
  assert.equal(edited.data.quote.totalPence, 24900 + 7500);
  // Saving other fields leaves the calculated travel in place.
  const other = await save(t, 3, { serviceDescription: 'Ground floor' });
  assert.equal(other.data.quote.travelPence, 7500);
});

test('over 300 miles one way is refused; manual travel is still available', async () => {
  const t = await setUp();
  const over = await save(t, 1, { ...essentials, travelMode: 'mileage', travelOneWayTenths: 3001 });
  assert.equal(over.status, 422);
  assert.match(over.data.errors.travelOneWayTenths, /enter the travel amount by hand/);
  assert.equal((await getQuote(t.db, t.reference)).version, 1, 'nothing saved');

  const manual = await save(t, 1, { ...essentials, travelMode: 'manual', travelPence: 30000 });
  assert.equal(manual.status, 200);
  assert.equal(manual.data.quote.travelPence, 30000);
  assert.equal(manual.data.quote.travelMode, 'manual');
});

test('an override needs an internal reason, keeps the calculated amount, and can be removed', async () => {
  const t = await setUp();
  const noReason = await save(t, 1, { ...essentials, travelMode: 'mileage', travelOneWayTenths: 236, travelOverride: true, travelPence: 2000 });
  assert.equal(noReason.status, 422);
  assert.match(noReason.data.errors.travelOverrideReason, /reason/);

  const saved = await save(t, 1, {
    ...essentials,
    travelMode: 'mileage',
    travelOneWayTenths: 236,
    travelOverride: true,
    travelPence: 2000,
    travelOverrideReason: REASON,
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const q = saved.data.quote;
  assert.equal(q.travelPence, 2000);
  assert.equal(q.travelCalculatedPence, 1400);
  assert.equal(q.travelOverride, true);
  assert.equal(q.travelOverrideReason, REASON);
  assert.equal(q.totalPence, 24900 + 2000);

  // Removing the override goes back to the calculated amount and clears the reason.
  const back = await save(t, 2, { travelOverride: false });
  assert.equal(back.data.quote.travelPence, 1400);
  assert.equal(back.data.quote.travelOverrideReason, '');
  // Switching to manual clears the mileage working.
  const manual = await save(t, 3, { travelMode: 'manual', travelPence: 1000 });
  assert.equal(manual.data.quote.travelOneWayTenths, null);
  assert.equal(manual.data.quote.travelCalculatedPence, null);
  assert.equal(row(t).travel_rate_pence, null);
});

test('calculator changes are on the timeline, without the private override reason', async () => {
  const t = await setUp();
  await save(t, 1, { ...essentials, travelMode: 'mileage', travelOneWayTenths: 236 });
  await save(t, 2, { travelOverride: true, travelPence: 2000, travelOverrideReason: REASON });
  await save(t, 3, { serviceDescription: 'No travel change' });

  const [first, second, third] = await updates(t);
  assert.ok(first.detail.fields.includes('Travel method'));
  assert.ok(first.detail.fields.includes('Travel distance'));
  assert.deepEqual(first.detail.travel, {
    mode: 'mileage',
    oneWayTenths: 236,
    ratePence: 50,
    freeTenths: 100,
    calculatedPence: 1400,
    travelPence: 1400,
    overridden: false,
  });
  assert.equal(second.detail.travel.overridden, true);
  assert.equal(second.detail.travel.travelPence, 2000);
  assert.equal(second.detail.travel.calculatedPence, 1400);
  assert.equal(third.detail.travel, undefined, 'no travel detail when travel did not change');

  const events = JSON.stringify((await getEnquiry(t.db, t.enquiry)).events);
  assert.ok(!events.includes('PRIVATE-REASON'), 'the override reason is never on the timeline');
});

test('the customer sees one Travel line: no mileage, rate, working or reason in the preview, email or snapshot', async () => {
  const t = await setUp();
  const saved = await save(t, 1, {
    ...essentials,
    travelMode: 'mileage',
    travelOneWayTenths: 236,
    travelOverride: true,
    travelPence: 2000,
    travelOverrideReason: REASON,
  });
  const preview = await t.call(`/quotes/${t.reference}/preview`);
  const html = (await t.call(`/quotes/${t.reference}/preview.html`)).data.raw;
  const customerFacing = [html, preview.data.email.text, preview.data.email.subject];
  assert.ok(html.includes('£20.00') && preview.data.email.text.includes('Travel: £20.00'), 'the final travel amount is shown');
  for (const content of customerFacing) {
    for (const hidden of ['PRIVATE-REASON', '23.6', 'mile', '50p', '£14', 'calculated', 'override']) {
      assert.ok(!content.toLowerCase().includes(hidden.toLowerCase()), `must not show "${hidden}"`);
    }
  }
  assert.equal((preview.data.email.text.match(/^Travel: /gm) || []).length, 1, 'a single Travel line');

  const { sent, payload } = await sendIt(t, saved.data.quote);
  assert.equal(sent.status, 'sent');
  const r = row(t);
  const snapshot = JSON.parse(r.sent_snapshot);
  assert.equal(snapshot.travelPence, 2000);
  assert.deepEqual(
    Object.keys(snapshot).filter((key) => key.toLowerCase().includes('travel')),
    ['travelPence'],
  );
  for (const stored of [r.sent_html, r.sent_text, r.sent_snapshot, JSON.stringify(payload)]) {
    assert.ok(!stored.includes('PRIVATE-REASON'));
    assert.ok(!stored.includes('23.6'));
  }
  // The working stays on the quote, for the Admin.
  assert.equal(sent.travelOneWayTenths, 236);
  assert.equal(sent.travelOverrideReason, REASON);
});

test('a sent quote’s travel working cannot be changed, through the API or in the database', async () => {
  const t = await setUp();
  const saved = await save(t, 1, { ...essentials, travelMode: 'mileage', travelOneWayTenths: 236 });
  await sendIt(t, saved.data.quote);
  const version = (await getQuote(t.db, t.reference)).version;
  assert.equal((await save(t, version, { travelOneWayTenths: 500 })).status, 409);
  assert.equal((await save(t, version, { travelMode: 'manual', travelPence: 0 })).status, 409);
  const id = row(t).id;
  for (const change of [
    `travel_mode = 'manual'`,
    'travel_one_way_tenths = 1',
    'travel_rate_pence = 1',
    'travel_free_tenths = 1',
    'travel_calculated_pence = 1',
    'travel_override = 1',
    `travel_override_reason = 'x'`,
    'travel_pence = 1',
  ]) {
    assert.throws(() => t.db.db.prepare(`UPDATE quotes SET ${change} WHERE id = ?`).run(id), /cannot be changed/, change);
  }
  const after = await getQuote(t.db, t.reference);
  assert.equal(after.travelPence, 1400);
  assert.equal(after.travelOneWayTenths, 236);
});

test('a revision copies the travel working into the new draft, where it can be edited', async () => {
  const t = await setUp();
  const saved = await save(t, 1, {
    ...essentials,
    travelMode: 'mileage',
    travelOneWayTenths: 236,
    travelOverride: true,
    travelPence: 2000,
    travelOverrideReason: REASON,
  });
  await sendIt(t, saved.data.quote);
  const revised = await t.call(`/quotes/${t.reference}/revise`, { method: 'POST', body: {} });
  assert.equal(revised.status, 201);
  const draft = revised.data.quote;
  assert.equal(draft.travelMode, 'mileage');
  assert.equal(draft.travelOneWayTenths, 236);
  assert.equal(draft.travelCalculatedPence, 1400);
  assert.equal(draft.travelOverride, true);
  assert.equal(draft.travelOverrideReason, REASON);
  assert.equal(draft.travelPence, 2000);

  const edited = await t.call(`/quotes/${draft.reference}`, { method: 'PATCH', body: { version: 1, travelOverride: false } });
  assert.equal(edited.data.quote.travelPence, 1400);
  // The original is untouched.
  assert.equal((await getQuote(t.db, t.reference)).travelPence, 2000);
});
