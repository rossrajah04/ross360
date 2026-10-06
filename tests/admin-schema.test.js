// The D1 schema lives in migrations/ and is applied by hand. The website must never create or change it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1, adminEnv, applyMigrations, callAdmin } from './helpers/d1.js';
import { LATEST_SCHEMA_VERSION, schemaVersion } from '../server/admin/schema.js';
import { onRequestPost } from '../functions/api/quote.js';
import { TEST_TURNSTILE_SECRET, TEST_TURNSTILE_TOKEN, withTurnstile } from './helpers/turnstile.js';

test('the migrations bring an empty database to the latest schema version', async () => {
  const db = new FakeD1();
  assert.equal(await schemaVersion(db), LATEST_SCHEMA_VERSION);
  assert.deepEqual(db.tables(), [
    'admin_login_failures',
    'admin_sessions',
    'availability_slots',
    'booking_payments',
    'booking_refunds',
    'bookings',
    'counters',
    'enquiries',
    'enquiry_events',
    'quote_items',
    'quote_links',
    'quotes',
    'schema_migrations',
  ]);
  assert.equal(LATEST_SCHEMA_VERSION, 5);
  db.close();
});

test('running 0001, 0002 and 0004 again is harmless; running 0003 or 0005 again stops at once and changes nothing', async () => {
  const { readFileSync } = await import('node:fs');
  const sql = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
  const db = new FakeD1();
  await db.prepare(`UPDATE counters SET value = 7 WHERE name = 'enquiry'`).run();
  await db.prepare(`UPDATE counters SET value = 3 WHERE name = 'quote'`).run();
  db.db.exec(sql('0001_admin_phase_a.sql'));
  db.db.exec(sql('0002_quotes.sql'));
  // SQLite cannot add a column only if it is missing: the first ALTER fails, before anything else runs.
  assert.throws(() => db.db.exec(sql('0003_quote_travel.sql')), /duplicate column name: travel_mode/);
  db.db.exec(sql('0004_bookings.sql'));
  assert.throws(() => db.db.exec(sql('0005_quote_customer_type.sql')), /duplicate column name: customer_type/);
  assert.equal(await schemaVersion(db), 5);
  const counter = await db.prepare(`SELECT value FROM counters WHERE name = 'enquiry'`).first();
  assert.equal(counter.value, 7);
  const quoteCounter = await db.prepare(`SELECT value FROM counters WHERE name = 'quote'`).first();
  assert.equal(quoteCounter.value, 3);
  const versions = await db.prepare(`SELECT COUNT(*) AS n FROM schema_migrations`).first();
  assert.equal(versions.n, LATEST_SCHEMA_VERSION);
  db.close();
});

test('the Admin refuses to run on an unmigrated database and creates nothing', async () => {
  const db = new FakeD1({ migrated: false });
  const { env, email, password } = await adminEnv(db);

  const session = await callAdmin(env, '/api/admin/session');
  assert.equal(session.status, 503);
  assert.match(session.data.message, /0001_admin_phase_a\.sql/);

  const signIn = await callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } });
  assert.equal(signIn.status, 503);
  assert.equal(signIn.headers.get('Set-Cookie'), null);

  const list = await callAdmin(env, '/api/admin/enquiries');
  assert.equal(list.status, 503);

  assert.deepEqual(db.tables(), [], 'no table may be created by a request');
  db.close();
});

test('an older schema version is refused rather than changed', async () => {
  const db = new FakeD1({ migrated: false });
  db.db.exec(`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
  db.db.exec(`INSERT INTO schema_migrations VALUES (0, 'older', '2026-01-01T00:00:00Z')`);
  const { env } = await adminEnv(db);
  const session = await callAdmin(env, '/api/admin/session');
  assert.equal(session.status, 503);
  assert.match(session.data.message, /version 0/);
  assert.deepEqual(db.tables(), ['schema_migrations']);
  db.close();
});

test('0002 to 0005 bring a version 1 database with data to version 5 without touching Phase A records', async () => {
  const { readFileSync } = await import('node:fs');
  const { createEnquiry, getEnquiry } = await import('../server/admin/enquiries.js');
  const db = new FakeD1({ migrated: false });
  db.db.exec(readFileSync(new URL('../migrations/0001_admin_phase_a.sql', import.meta.url), 'utf8'));
  assert.equal(await schemaVersion(db), 1);

  // Phase A code (the quote form and the Admin) refuses a version 1 database once this code is deployed.
  const { env } = await adminEnv(db);
  const refused = await callAdmin(env, '/api/admin/session');
  assert.equal(refused.status, 503);
  assert.match(refused.data.message, /version 1/);
  assert.match(refused.data.message, /0005_quote_customer_type\.sql/);

  // Records written by Phase A at version 1.
  const before = db.db.prepare(`SELECT COUNT(*) AS n FROM enquiries`).get().n;
  db.db.exec(`UPDATE counters SET value = 5 WHERE name = 'enquiry'`);
  db.db.exec(`INSERT INTO enquiries (ref_number, reference, origin, name, created_at, updated_at, status_changed_at)
              VALUES (5, 'ROSS-0005', 'website', 'Existing', 'a', 'a', 'a')`);
  db.db.exec(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type) VALUES (1, 'a', 'website', 'created')`);

  db.db.exec(readFileSync(new URL('../migrations/0002_quotes.sql', import.meta.url), 'utf8'));
  assert.equal(await schemaVersion(db), 2);
  db.db.exec(readFileSync(new URL('../migrations/0003_quote_travel.sql', import.meta.url), 'utf8'));
  assert.equal(await schemaVersion(db), 3);
  db.db.exec(readFileSync(new URL('../migrations/0004_bookings.sql', import.meta.url), 'utf8'));
  assert.equal(await schemaVersion(db), 4);
  db.db.exec(readFileSync(new URL('../migrations/0005_quote_customer_type.sql', import.meta.url), 'utf8'));
  assert.equal(await schemaVersion(db), 5);
  assert.equal(db.db.prepare(`SELECT COUNT(*) AS n FROM enquiries`).get().n, before + 1);
  assert.equal((await getEnquiry(db, 'ROSS-0005')).name, 'Existing');
  assert.equal((await getEnquiry(db, 'ROSS-0005')).events.length, 1);
  const { reference } = await createEnquiry(db, { name: 'Next', email: 'n@example.test' }, { origin: 'admin', actor: 'test' });
  assert.equal(reference, 'ROSS-0006');
  db.close();
});

test('0003 upgrades a version 2 database with a sent quote, leaving it as it was and still locked', async () => {
  const { readFileSync } = await import('node:fs');
  const db = new FakeD1({ migrated: false });
  for (const file of ['0001_admin_phase_a.sql', '0002_quotes.sql']) {
    db.db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  // As Production and Preview are today: an enquiry and a sent quote written by the version 2 code.
  db.db.exec(`UPDATE counters SET value = 1 WHERE name IN ('enquiry', 'quote')`);
  db.db.exec(`INSERT INTO enquiries (ref_number, reference, origin, name, created_at, updated_at, status_changed_at)
              VALUES (1, 'ROSS-0001', 'website', 'Existing', 'a', 'a', 'a')`);
  db.db.exec(`INSERT INTO quotes (quote_number, reference, enquiry_id, status, version, travel_pence, subtotal_pence, total_pence,
                created_at, updated_at, sent_snapshot, sent_html)
              VALUES (1, 'Q-0001', 1, 'sent', 3, 1000, 27400, 27900, 'a', 'a', '{"travelPence":1000}', '<p>sent</p>')`);
  const before = db.db.prepare(`SELECT * FROM quotes WHERE reference = 'Q-0001'`).get();

  db.db.exec(readFileSync(new URL('../migrations/0003_quote_travel.sql', import.meta.url), 'utf8'));
  assert.equal(await schemaVersion(db), 3);
  const after = db.db.prepare(`SELECT * FROM quotes WHERE reference = 'Q-0001'`).get();
  for (const [column, value] of Object.entries(before)) assert.equal(after[column], value, column);
  assert.equal(after.travel_mode, 'manual');
  assert.equal(after.travel_override, 0);
  assert.equal(after.travel_one_way_tenths, null);
  // The new columns are locked on a sent quote, and so is everything that was locked before.
  assert.throws(() => db.db.exec(`UPDATE quotes SET travel_mode = 'mileage' WHERE reference = 'Q-0001'`), /cannot be changed/);
  assert.throws(() => db.db.exec(`UPDATE quotes SET travel_override_reason = 'x' WHERE reference = 'Q-0001'`), /cannot be changed/);
  assert.throws(() => db.db.exec(`UPDATE quotes SET travel_pence = 0 WHERE reference = 'Q-0001'`), /cannot be changed/);
  db.close();
});

test('the quote form still emails when the database has not been migrated, and creates nothing', async () => {
  const db = new FakeD1({ migrated: false });
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = withTurnstile(async (url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response('{}', { status: 200 });
  });
  try {
    const request = new Request('https://ross360.test/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://ross360.test' },
      body: JSON.stringify({
        name: 'Alex Customer',
        business: 'Test Café',
        email: 'alex@example.test',
        projectType: 'business',
        spaceType: 'Hotel',
        location: 'M1 1AA',
        size: '8 rooms',
        areas: 'Lobby',
        hp: '',
        startedAt: Date.now() - 10000,
        turnstileToken: TEST_TURNSTILE_TOKEN,
      }),
    });
    const response = await onRequestPost({
      request,
      env: {
        DB: db,
        TURNSTILE_SECRET_KEY: TEST_TURNSTILE_SECRET,
        RESEND_API_KEY: 'test-key-not-real',
        QUOTE_FROM_EMAIL: 'ROSS 360 <enquiries@ross360.test>',
      },
    });
    assert.equal(response.status, 200);
    assert.equal(sent.length, 1);
    assert.ok(!sent[0].text.includes('Reference:'));
    assert.deepEqual(db.tables(), []);
  } finally {
    globalThis.fetch = original;
    db.close();
  }
});

test('the README erasure procedure removes one enquiry, its quotes and its timeline, and references are not reused', async () => {
  const { createEnquiry, listEnquiries } = await import('../server/admin/enquiries.js');
  const { createQuote, updateQuote, reviseQuote } = await import('../server/admin/quotes.js');
  const db = new FakeD1();
  for (const name of ['One', 'Two', 'Three']) {
    await createEnquiry(db, { name, email: 'a@example.test' }, { origin: 'admin', actor: 'test' });
  }
  // ROSS-0002 has a sent quote (with lines, locked by the triggers) and a revision of it.
  await createQuote(db, 'ROSS-0002', 'test');
  await updateQuote(db, 'Q-0001', { items: [{ kind: 'custom', description: 'Tour', quantity: 1, unitPence: 100 }] }, 1, 'test');
  db.db.exec(`UPDATE quotes SET status = 'sent' WHERE reference = 'Q-0001'`);
  await reviseQuote(db, 'Q-0001', 'test');
  await createQuote(db, 'ROSS-0003', 'test');

  // Phase C: a customer link, an availability slot, and a booking with a payment and a refund.
  const at = 'a';
  db.db.exec(`INSERT INTO quote_links (quote_id, link_id, key_id, created_at, created_by) VALUES (1, 'link-1', 'k1', '${at}', 'test')`);
  db.db.exec(`INSERT INTO availability_slots (slot_date, period, status, created_at, updated_at) VALUES ('2099-01-01', 'am', 'open', '${at}', '${at}')`);
  db.db.exec(`INSERT INTO bookings (quote_id, slot_id, status, plan, total_pence, paid_pence, refunded_pence, created_at, updated_at) VALUES (1, 1, 'cancelled', 'full', 100, 100, 100, '${at}', '${at}')`);
  db.db.exec(`INSERT INTO booking_payments (booking_id, kind, amount_pence, status, created_at, updated_at) VALUES (1, 'full', 100, 'paid', '${at}', '${at}')`);
  db.db.exec(`INSERT INTO booking_refunds (booking_id, payment_id, amount_pence, status, created_at, updated_at) VALUES (1, 1, 100, 'succeeded', '${at}', '${at}')`);
  assert.throws(() => db.db.exec(`DELETE FROM quotes WHERE id = 1`), /FOREIGN KEY/);

  // The foreign keys stop the enquiry being deleted before its quotes and timeline.
  assert.throws(() => db.db.exec(`DELETE FROM enquiries WHERE reference = 'ROSS-0002'`), /FOREIGN KEY/);

  // The statements documented in the README, in order.
  const id = `(SELECT id FROM enquiries WHERE reference = 'ROSS-0002')`;
  const bookingIds = `(SELECT id FROM bookings WHERE quote_id IN (SELECT id FROM quotes WHERE enquiry_id = ${id}))`;
  db.db.exec(`DELETE FROM booking_refunds WHERE booking_id IN ${bookingIds};`);
  db.db.exec(`DELETE FROM booking_payments WHERE booking_id IN ${bookingIds};`);
  db.db.exec(`DELETE FROM bookings WHERE quote_id IN (SELECT id FROM quotes WHERE enquiry_id = ${id});`);
  db.db.exec(`DELETE FROM quote_links WHERE quote_id IN (SELECT id FROM quotes WHERE enquiry_id = ${id});`);
  db.db.exec(`DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE enquiry_id = ${id});`);
  db.db.exec(`DELETE FROM quotes WHERE enquiry_id = ${id};`);
  db.db.exec(`DELETE FROM enquiry_events WHERE enquiry_id = ${id};`);
  db.db.exec(`DELETE FROM enquiries WHERE reference = 'ROSS-0002';`);
  assert.deepEqual(
    db.db.prepare('SELECT reference FROM quotes').all().map((r) => r.reference),
    ['Q-0003'],
  );

  assert.deepEqual(
    (await listEnquiries(db)).map((e) => e.reference),
    ['ROSS-0003', 'ROSS-0001'],
  );
  assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM enquiry_events').get().n, 3);
  const { reference } = await createEnquiry(db, { name: 'Four', email: 'a@example.test' }, { origin: 'admin', actor: 'test' });
  assert.equal(reference, 'ROSS-0004');
  db.close();
});
