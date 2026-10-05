// ROSS 360 Admin authentication.
//
// One admin account, configured as Cloudflare Pages environment variables. No password,
// hash or salt appears in this repository:
//   ADMIN_EMAIL          the sign-in email address
//   ADMIN_PASSWORD_HASH  "pbkdf2$<iterations>$<salt-base64>$<hash-base64>" from `npm run admin:hash`
//
// Sign-in gives the browser a random 32-byte token in an HttpOnly, Secure, SameSite=Strict cookie.
// Only the token's SHA-256 hash is stored, so the session table cannot be used to sign in.

import { requireSchema } from './schema.js';

export const COOKIE_NAME = 'ross360_admin';
export const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours
const PBKDF2_HASH = 'SHA-256';
const MAX_FAILURES = 8;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

const encoder = new TextEncoder();

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

async function sha256Base64(value) {
  return toBase64(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

/** Derive a PBKDF2 hash. Shared with scripts/admin-hash.mjs so both sides agree. */
export async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: PBKDF2_HASH }, key, 256);
  return new Uint8Array(bits);
}

// Comparison that takes the same time whether or not the values match.
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1000) return false;
  let salt;
  let expected;
  try {
    salt = fromBase64(parts[2]);
    expected = fromBase64(parts[3]);
  } catch {
    return false;
  }
  return equalBytes(await derive(password, salt, iterations), expected);
}

export const isConfigured = (env) => Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH && env.DB);

const clientKey = (request) => request.headers.get('CF-Connecting-IP') || 'unknown';

export function cookieToken(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return rest.join('=');
  }
  return '';
}

const cookie = (value, maxAge) =>
  `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

export const sessionCookie = (token) => cookie(token, Math.floor(SESSION_MS / 1000));
export const clearedCookie = () => cookie('', 0);

async function tooManyFailures(db, key, at) {
  await db.prepare(`DELETE FROM admin_login_failures WHERE at < ?`).bind(at - FAILURE_WINDOW_MS).run();
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM admin_login_failures WHERE client_key = ? AND at >= ?`)
    .bind(key, at - FAILURE_WINDOW_MS)
    .first();
  return (row?.n ?? 0) >= MAX_FAILURES;
}

/**
 * Check an email and password and start a session.
 * Returns { ok: true, token } or { ok: false, reason: 'unconfigured' | 'locked' | 'invalid' }.
 */
export async function signIn(env, request, { email, password }) {
  if (!isConfigured(env)) return { ok: false, reason: 'unconfigured' };
  const db = env.DB;
  await requireSchema(db);
  const at = Date.now();
  const key = clientKey(request);
  if (await tooManyFailures(db, key, at)) return { ok: false, reason: 'locked' };

  const emailMatches = String(email || '').trim().toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase();
  // Check the password even when the email is wrong, so a wrong email is not quicker to detect.
  const passwordMatches = await verifyPassword(String(password || ''), env.ADMIN_PASSWORD_HASH);
  if (!emailMatches || !passwordMatches) {
    await db.prepare(`INSERT INTO admin_login_failures (client_key, at) VALUES (?, ?)`).bind(key, at).run();
    return { ok: false, reason: 'invalid' };
  }

  const token = toBase64(crypto.getRandomValues(new Uint8Array(32)));
  await db.batch([
    db.prepare(`DELETE FROM admin_sessions WHERE expires_at < ?`).bind(at),
    db.prepare(`DELETE FROM admin_login_failures WHERE client_key = ?`).bind(key),
    db
      .prepare(`INSERT INTO admin_sessions (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)`)
      .bind(await sha256Base64(token), env.ADMIN_EMAIL, at, at + SESSION_MS),
  ]);
  return { ok: true, token };
}

/** Return the signed-in admin for a request, or null. */
export async function currentSession(env, request) {
  if (!isConfigured(env)) return null;
  const token = cookieToken(request);
  if (!token) return null;
  await requireSchema(env.DB);
  const row = await env.DB.prepare(`SELECT email, expires_at FROM admin_sessions WHERE token_hash = ?`)
    .bind(await sha256Base64(token))
    .first();
  if (!row || row.expires_at < Date.now()) return null;
  return { email: row.email };
}

export async function signOut(env, request) {
  if (!env.DB) return;
  const token = cookieToken(request);
  if (!token) return;
  await requireSchema(env.DB);
  await env.DB.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(await sha256Base64(token)).run();
}
