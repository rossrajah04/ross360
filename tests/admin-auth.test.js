// Admin authentication: no customer data without a valid session.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1, adminEnv, callAdmin, cookieFrom } from './helpers/d1.js';
import { COOKIE_NAME, verifyPassword, derive } from '../server/admin/auth.js';

const setUp = async () => {
  const db = new FakeD1();
  const { env, email, password } = await adminEnv(db);
  return { db, env, email, password };
};

const signIn = (env, email, password) =>
  callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } });

test('a correct email and password starts a session', async () => {
  const { env, email, password } = await setUp();
  const result = await signIn(env, email, password);
  assert.equal(result.status, 200);
  assert.equal(result.data.ok, true);

  const cookie = result.headers.get('Set-Cookie');
  assert.match(cookie, new RegExp(`^${COOKIE_NAME}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);

  const session = await callAdmin(env, '/api/admin/session', { cookie: cookieFrom(result.headers) });
  assert.equal(session.data.email, email);
});

test('the session token itself is never stored', async () => {
  const { db, env, email, password } = await setUp();
  const result = await signIn(env, email, password);
  const token = cookieFrom(result.headers).split('=').slice(1).join('=');
  const rows = await db.prepare('SELECT token_hash FROM admin_sessions').all();
  assert.equal(rows.results.length, 1);
  assert.notEqual(rows.results[0].token_hash, token);
});

test('a wrong password is refused, with the same message as a wrong email', async () => {
  const { env, email, password } = await setUp();
  const wrongPassword = await signIn(env, email, 'not the password');
  const wrongEmail = await signIn(env, 'someone@else.test', password);
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongEmail.status, 401);
  assert.equal(wrongPassword.data.message, wrongEmail.data.message);
  assert.equal(wrongPassword.headers.get('Set-Cookie'), null);
});

test('the email address is not case sensitive', async () => {
  const { env, email, password } = await setUp();
  const result = await signIn(env, ` ${email.toUpperCase()} `, password);
  assert.equal(result.data.ok, true);
});

test('repeated failures are locked out', async () => {
  const { env, email } = await setUp();
  for (let i = 0; i < 8; i += 1) {
    const attempt = await signIn(env, email, `guess-${i}`);
    assert.equal(attempt.status, 401);
  }
  const locked = await signIn(env, email, 'guess-again');
  assert.equal(locked.status, 429);
});

test('a made-up or expired cookie gives no access', async () => {
  const { db, env, email, password } = await setUp();
  const invented = await callAdmin(env, '/api/admin/enquiries', { cookie: `${COOKIE_NAME}=made-up-token` });
  assert.equal(invented.status, 401);

  const signedIn = await signIn(env, email, password);
  const cookie = cookieFrom(signedIn.headers);
  await db.prepare('UPDATE admin_sessions SET expires_at = ?').bind(Date.now() - 1000).run();
  const expired = await callAdmin(env, '/api/admin/enquiries', { cookie });
  assert.equal(expired.status, 401);
});

test('signing out ends the session', async () => {
  const { env, email, password } = await setUp();
  const cookie = cookieFrom((await signIn(env, email, password)).headers);
  const out = await callAdmin(env, '/api/admin/session', { method: 'DELETE', cookie });
  assert.match(out.headers.get('Set-Cookie'), /Max-Age=0/);
  const after = await callAdmin(env, '/api/admin/enquiries', { cookie });
  assert.equal(after.status, 401);
});

test('every data route refuses an unauthenticated request', async () => {
  const { db, env, email, password } = await setUp();
  // Put a real enquiry in place, so a leak would have something to leak.
  const cookie = cookieFrom((await signIn(env, email, password)).headers);
  await callAdmin(env, '/api/admin/enquiries', {
    method: 'POST',
    cookie,
    body: { name: 'Private Customer', email: 'private@example.test', business: 'Secret Ltd' },
  });

  const routes = [
    ['GET', '/api/admin/dashboard'],
    ['GET', '/api/admin/enquiries'],
    ['GET', '/api/admin/enquiries?q=Private'],
    ['GET', '/api/admin/enquiries/ROSS-0001'],
    ['POST', '/api/admin/enquiries'],
    ['PATCH', '/api/admin/enquiries/ROSS-0001'],
    ['POST', '/api/admin/enquiries/ROSS-0001/status'],
    ['POST', '/api/admin/enquiries/ROSS-0001/notes'],
  ];
  for (const [method, path] of routes) {
    const result = await callAdmin(env, path, { method, body: method === 'GET' ? undefined : {} });
    assert.equal(result.status, 401, `${method} ${path} should need a session`);
    const body = JSON.stringify(result.data);
    assert.ok(!body.includes('Private Customer'), `${method} ${path} leaked a name`);
    assert.ok(!body.includes('private@example.test'), `${method} ${path} leaked an email address`);
  }
  db.close();
});

test('writes from another site are refused', async () => {
  const { env, email, password } = await setUp();
  const cookie = cookieFrom((await signIn(env, email, password)).headers);
  const crossSite = await callAdmin(env, '/api/admin/enquiries/ROSS-0001/status', {
    method: 'POST',
    cookie,
    body: { status: 'lost' },
    origin: 'https://ross360.test',
  });
  // Same origin works…
  assert.notEqual(crossSite.status, 403);

  const { onRequest } = await import('../functions/api/admin/[[route]].js');
  const request = new Request('https://ross360.test/api/admin/enquiries/ROSS-0001/status', {
    method: 'POST',
    headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ status: 'lost' }),
  });
  const response = await onRequest({ request, env, params: { route: ['enquiries', 'ROSS-0001', 'status'] } });
  assert.equal(response.status, 403);
});

test('admin responses are never cached or indexed', async () => {
  const { env, email, password } = await setUp();
  const cookie = cookieFrom((await signIn(env, email, password)).headers);
  const result = await callAdmin(env, '/api/admin/dashboard', { cookie });
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.match(result.headers.get('X-Robots-Tag'), /noindex/);
});

test('without ADMIN_EMAIL, ADMIN_PASSWORD_HASH and DB nothing is reachable', async () => {
  const db = new FakeD1();
  for (const env of [{}, { DB: db }, { DB: db, ADMIN_EMAIL: 'a@b.test' }]) {
    const session = await callAdmin(env, '/api/admin/session');
    assert.equal(session.status, 503);
    const enquiries = await callAdmin(env, '/api/admin/enquiries');
    assert.equal(enquiries.status, 503);
  }
  db.close();
});

test('password hashes are verified, and a malformed hash never matches', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = Buffer.from(await derive('a real password', salt, 10000)).toString('base64');
  const stored = `pbkdf2$10000$${Buffer.from(salt).toString('base64')}$${hash}`;
  assert.equal(await verifyPassword('a real password', stored), true);
  assert.equal(await verifyPassword('a real password ', stored), false);
  for (const bad of ['', 'plaintext', 'pbkdf2$10000$only-three$', 'pbkdf2$1$c2FsdA==$aGFzaA==', 'md5$10000$x$y']) {
    assert.equal(await verifyPassword('a real password', bad), false, bad);
  }
});
