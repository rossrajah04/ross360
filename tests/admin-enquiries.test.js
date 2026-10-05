// Enquiry creation, sequential ROSS references, search and status changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1, adminEnv, callAdmin, cookieFrom } from './helpers/d1.js';
import { createEnquiry, listEnquiries, getEnquiry, changeStatus, dashboard, ukMonth } from '../server/admin/enquiries.js';
import { formatReference, REFERENCE_RE, STATUS_VALUES, validateEnquiryPatch, poundsToPence } from '../src/lib/admin/model.js';
import { validateQuote } from '../src/lib/quoteSchema.js';

const formValues = (overrides = {}) =>
  validateQuote({
    name: 'Alex Customer',
    business: 'Test Café',
    email: 'alex@example.test',
    phone: '0161 000 0000',
    projectType: 'business',
    spaceType: 'Restaurant / café',
    location: 'M1 1AA',
    size: '8 rooms',
    areas: 'Dining room\nBar',
    preferredDate: 'Late October',
    source: 'Google',
    ...overrides,
  }).values;

const website = { origin: 'website', actor: 'website' };

test('the first enquiry is ROSS-0001 and references then run in sequence', async () => {
  const db = new FakeD1();
  const references = [];
  for (let i = 0; i < 12; i += 1) {
    const { reference } = await createEnquiry(db, formValues({ business: `Business ${i}` }), website);
    references.push(reference);
  }
  assert.equal(references[0], 'ROSS-0001');
  assert.equal(references[1], 'ROSS-0002');
  assert.equal(references[11], 'ROSS-0012');
  assert.deepEqual(new Set(references).size, references.length);
  for (const reference of references) assert.match(reference, REFERENCE_RE);
  db.close();
});

test('references are padded to four digits and keep growing beyond 9999', () => {
  assert.equal(formatReference(1), 'ROSS-0001');
  assert.equal(formatReference(42), 'ROSS-0042');
  assert.equal(formatReference(9999), 'ROSS-9999');
  assert.equal(formatReference(10000), 'ROSS-10000');
  assert.match(formatReference(10000), REFERENCE_RE);
});

test('references are never reused, even after an enquiry is deleted', async () => {
  const db = new FakeD1();
  await createEnquiry(db, formValues(), website);
  await createEnquiry(db, formValues(), website);
  await db.prepare(`DELETE FROM enquiry_events`).run();
  await db.prepare(`DELETE FROM enquiries WHERE reference = 'ROSS-0002'`).run();
  const { reference } = await createEnquiry(db, formValues(), website);
  assert.equal(reference, 'ROSS-0003');
  db.close();
});

test('enquiries created at the same moment get different references', async () => {
  const db = new FakeD1();
  const created = await Promise.all(
    Array.from({ length: 6 }, (_, i) => createEnquiry(db, formValues({ business: `Parallel ${i}` }), website)),
  );
  const references = created.map((c) => c.reference);
  assert.equal(new Set(references).size, 6, `expected 6 different references, got ${references.join(', ')}`);
  db.close();
});

test('a website enquiry stores the customer and project details and starts as New', async () => {
  const db = new FakeD1();
  const { reference } = await createEnquiry(db, formValues(), website);
  const enquiry = await getEnquiry(db, reference);
  assert.equal(enquiry.status, 'new');
  assert.equal(enquiry.origin, 'website');
  assert.equal(enquiry.name, 'Alex Customer');
  assert.equal(enquiry.business, 'Test Café');
  assert.equal(enquiry.email, 'alex@example.test');
  assert.equal(enquiry.phone, '0161 000 0000');
  assert.equal(enquiry.projectType, 'business');
  assert.equal(enquiry.spaceType, 'Restaurant / café');
  assert.equal(enquiry.location, 'M1 1AA');
  assert.equal(enquiry.size, '8 rooms');
  assert.equal(enquiry.areas, 'Dining room\nBar');
  assert.equal(enquiry.source, 'Google');
  assert.equal(enquiry.preferredDate, 'Late October');
  // The preferred date from the form becomes the starting point for scheduling.
  assert.equal(enquiry.preferredDateTime, 'Late October');
  // Scheduling answers the form does not ask for start empty, to be filled in by hand.
  assert.equal(enquiry.premisesCondition, null);
  assert.equal(enquiry.daylight, null);
  assert.equal(enquiry.flexibleTiming, null);
  assert.equal(enquiry.events.at(-1).type, 'created');
  db.close();
});

test('an enquiry can be searched by reference, customer, business, email and address', async () => {
  const db = new FakeD1();
  await createEnquiry(db, formValues(), website);
  await createEnquiry(
    db,
    formValues({ name: 'Blair Other', business: 'Northern Gym', email: 'blair@gym.test', location: 'LS1 4AB' }),
    website,
  );

  const find = async (q) => (await listEnquiries(db, { q })).map((e) => e.reference);
  assert.deepEqual(await find('ROSS-0002'), ['ROSS-0002']);
  assert.deepEqual(await find('blair'), ['ROSS-0002']);
  assert.deepEqual(await find('Northern'), ['ROSS-0002']);
  assert.deepEqual(await find('gym.test'), ['ROSS-0002']);
  assert.deepEqual(await find('LS1'), ['ROSS-0002']);
  assert.deepEqual(await find('alex@example.test'), ['ROSS-0001']);
  // Newest first, and a wildcard character is treated as ordinary text.
  assert.deepEqual(await find(''), ['ROSS-0002', 'ROSS-0001']);
  assert.deepEqual(await find('%'), []);
  db.close();
});

test('statuses can be set by hand and are recorded in the timeline', async () => {
  const db = new FakeD1();
  const { reference } = await createEnquiry(db, formValues(), website);
  for (const status of STATUS_VALUES) {
    const updated = await changeStatus(db, reference, status, 'admin@example.test');
    assert.equal(updated.status, status);
  }
  const enquiry = await getEnquiry(db, reference);
  const changes = enquiry.events.filter((event) => event.type === 'status');
  // One entry per actual change: 'new' was already the status, so it is not recorded again.
  assert.equal(changes.length, STATUS_VALUES.length - 1);
  assert.deepEqual(changes.at(-1).detail, { from: 'new', to: 'reviewing' });
  await assert.rejects(() => changeStatus(db, reference, 'not-a-status', 'admin@example.test'), RangeError);
  db.close();
});

test('scheduling requirements and money fields are stored', async () => {
  const db = new FakeD1();
  const { env, email, password } = await adminEnv(db);
  const cookie = cookieFrom(
    (await callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } })).headers,
  );
  await createEnquiry(db, formValues(), website);

  const patch = {
    premisesCondition: 'quiet',
    daylight: 'essential',
    flexibleTiming: 'yes',
    preferredDateTime: '2026-11-03 09:00',
    schedulingNotes: 'Closed Mondays.',
    projectValue: '349',
    amountPaid: '174.50',
    paidOn: '2026-11-01',
  };
  const saved = await callAdmin(env, '/api/admin/enquiries/ROSS-0001', { method: 'PATCH', cookie, body: patch });
  assert.equal(saved.status, 200);
  const enquiry = saved.data.enquiry;
  assert.equal(enquiry.premisesCondition, 'quiet');
  assert.equal(enquiry.daylight, 'essential');
  assert.equal(enquiry.flexibleTiming, 'yes');
  assert.equal(enquiry.preferredDateTime, '2026-11-03 09:00');
  assert.equal(enquiry.schedulingNotes, 'Closed Mondays.');
  assert.equal(enquiry.projectValue, 34900);
  assert.equal(enquiry.amountPaid, 17450);
  assert.equal(enquiry.paidOn, '2026-11-01');
  assert.ok(enquiry.events.some((event) => event.type === 'updated'));

  const rejected = await callAdmin(env, '/api/admin/enquiries/ROSS-0001', {
    method: 'PATCH',
    cookie,
    body: { premisesCondition: 'whatever', projectValue: 'lots', paidOn: 'soon' },
  });
  assert.equal(rejected.status, 422);
  assert.deepEqual(Object.keys(rejected.data.errors).sort(), ['paidOn', 'premisesCondition', 'projectValue']);
  db.close();
});

test('amounts in pounds become whole pence', () => {
  assert.equal(poundsToPence('349'), 34900);
  assert.equal(poundsToPence('349.5'), 34950);
  assert.equal(poundsToPence('£1,249.99'), 124999);
  assert.ok(Number.isNaN(poundsToPence('')));
  assert.ok(Number.isNaN(poundsToPence('12.345')));
  assert.ok(Number.isNaN(poundsToPence('-5')));
  // An empty value clears the field rather than storing zero.
  assert.equal(validateEnquiryPatch({ projectValue: '' }).values.projectValue, null);
});

test('an enquiry added by hand needs a name and a way to reply', async () => {
  const db = new FakeD1();
  const { env, email, password } = await adminEnv(db);
  const cookie = cookieFrom(
    (await callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } })).headers,
  );

  const empty = await callAdmin(env, '/api/admin/enquiries', { method: 'POST', cookie, body: {} });
  assert.equal(empty.status, 422);
  assert.ok(empty.data.errors.name);
  assert.ok(empty.data.errors.email);

  const created = await callAdmin(env, '/api/admin/enquiries', {
    method: 'POST',
    cookie,
    body: { name: 'Phone Caller', phone: '07000 000000', business: 'Caller Ltd' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.reference, 'ROSS-0001');
  assert.equal(created.data.enquiry.origin, 'admin');
  assert.equal(created.data.enquiry.status, 'new');
  db.close();
});

test('notes are added to the timeline, and a missing reference is a 404', async () => {
  const db = new FakeD1();
  const { env, email, password } = await adminEnv(db);
  const cookie = cookieFrom(
    (await callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } })).headers,
  );
  await createEnquiry(db, formValues(), website);

  const noted = await callAdmin(env, '/api/admin/enquiries/ROSS-0001/notes', {
    method: 'POST',
    cookie,
    body: { text: 'Rang back, capture on the 3rd.' },
  });
  assert.equal(noted.data.enquiry.events[0].detail.text, 'Rang back, capture on the 3rd.');

  const missing = await callAdmin(env, '/api/admin/enquiries/ROSS-9999', { cookie });
  assert.equal(missing.status, 404);
  const nonsense = await callAdmin(env, '/api/admin/enquiries/not-a-reference', { cookie });
  assert.equal(nonsense.status, 404);
  db.close();
});

test('the dashboard counts the right statuses and totals the money', async () => {
  const db = new FakeD1();
  const plan = [
    ['new', null, null, null],
    ['new', null, null, null],
    ['quoted', null, null, null],
    ['booked', null, null, null],
    ['in_production', null, null, null],
    ['quality_check', null, null, null],
    ['payment_pending', '400', '100', null],
    ['accepted', '300', null, null],
    ['complete', '500', '500', `${ukMonth()}-15`],
    ['complete', '250', '250', '2001-01-10'],
  ];
  for (const [status, value, paid, paidOn] of plan) {
    const { reference } = await createEnquiry(db, formValues(), website);
    await changeStatus(db, reference, status, 'test');
    if (value) {
      const { values } = validateEnquiryPatch({ projectValue: value, amountPaid: paid ?? '', paidOn: paidOn ?? '' });
      const columns = { projectValue: 'project_value_pence', amountPaid: 'amount_paid_pence', paidOn: 'paid_on' };
      for (const [key, column] of Object.entries(columns)) {
        await db.prepare(`UPDATE enquiries SET ${column} = ? WHERE reference = ?`).bind(values[key], reference).run();
      }
    }
  }

  const data = await dashboard(db);
  assert.equal(data.counts.newEnquiries, 2);
  assert.equal(data.counts.quotesAwaiting, 1);
  assert.equal(data.counts.upcomingBookings, 1);
  assert.equal(data.counts.inProduction, 2);
  assert.equal(data.counts.paymentsOutstanding, 2);
  // £400 - £100 still due, plus £300 agreed and nothing received.
  assert.equal(data.paymentsOutstandingPence, 60000);
  // Only the payment received this month counts towards monthly revenue.
  assert.equal(data.monthlyRevenuePence, 50000);
  assert.equal(data.lists.newEnquiries.length, 2);
  db.close();
});

test('each dashboard figure and the list it opens use the same statuses', async () => {
  const { DASHBOARD_GROUPS, statusFilter } = await import('../src/lib/admin/model.js');
  const db = new FakeD1();
  const { env, email, password } = await adminEnv(db);
  for (const status of ['new', 'quoted', 'booked', 'captured', 'in_production', 'quality_check', 'quality_check', 'complete']) {
    const { reference } = await createEnquiry(db, formValues(), website);
    await changeStatus(db, reference, status, 'test');
  }
  const signIn = await callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } });
  const cookie = cookieFrom(signIn.headers);
  const { counts } = await dashboard(db);
  assert.equal(counts.inProduction, 4);
  for (const group of ['newEnquiries', 'quotesAwaiting', 'upcomingBookings', 'inProduction']) {
    const filter = statusFilter(DASHBOARD_GROUPS[group]);
    const list = await callAdmin(env, `/api/admin/enquiries?status=${encodeURIComponent(filter)}`, { cookie });
    assert.equal(list.status, 200);
    assert.equal(list.data.enquiries.length, counts[group], group);
  }
  const unknown = await callAdmin(env, '/api/admin/enquiries?status=booked,nonsense', { cookie });
  assert.equal(unknown.status, 400);
  db.close();
});
