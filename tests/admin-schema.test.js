// The D1 schema lives in migrations/ and is applied by hand. The website must never create or change it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1, adminEnv, applyMigrations, callAdmin } from './helpers/d1.js';
import { LATEST_SCHEMA_VERSION, schemaVersion } from '../server/admin/schema.js';
import { onRequestPost } from '../functions/api/quote.js';

test('the migrations bring an empty database to the latest schema version', async () => {
  const db = new FakeD1();
  assert.equal(await schemaVersion(db), LATEST_SCHEMA_VERSION);
  assert.deepEqual(db.tables(), [
    'admin_login_failures',
    'admin_sessions',
    'counters',
    'enquiries',
    'enquiry_events',
    'schema_migrations',
  ]);
  db.close();
});

test('applying the migrations twice is harmless and keeps the reference counter', async () => {
  const db = new FakeD1();
  await db.prepare(`UPDATE counters SET value = 7 WHERE name = 'enquiry'`).run();
  applyMigrations(db);
  const counter = await db.prepare(`SELECT value FROM counters WHERE name = 'enquiry'`).first();
  assert.equal(counter.value, 7);
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

test('the quote form still emails when the database has not been migrated, and creates nothing', async () => {
  const db = new FakeD1({ migrated: false });
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response('{}', { status: 200 });
  };
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
      }),
    });
    const response = await onRequestPost({
      request,
      env: { DB: db, RESEND_API_KEY: 'test-key-not-real', QUOTE_FROM_EMAIL: 'ROSS 360 <enquiries@ross360.test>' },
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
