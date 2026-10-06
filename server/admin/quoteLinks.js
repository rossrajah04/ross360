// Customer links to sent quotes (Phase C): https://ross360.co.uk/q/<token>.
//
// A token is three parts joined by dots: the key id, a random 128-bit link id, and an HMAC-SHA-256
// signature of both made with the secret that key id names. D1 stores the link id and key id only,
// never the signature, so neither a copy of the database nor the secret alone can make a working link.
//
// Secrets (Cloudflare Pages, different for Preview and Production; never in this repository):
//   QUOTE_LINK_SECRET, QUOTE_LINK_KEY_ID                    the key new links are signed with
//   QUOTE_LINK_SECRET_PREVIOUS, QUOTE_LINK_KEY_ID_PREVIOUS  optional: an earlier key whose links keep working
//   QUOTE_LINK_BASE_URL                                     optional: the site address links point to
//                                                           (default https://ross360.co.uk)
// A link is checked only against the secret its key id names. If neither configured key has that id,
// the link stops working (see README: rotating QUOTE_LINK_SECRET).

import { site } from '../../src/content/site.js';
import { addDays, ukToday } from '../../src/lib/admin/quotes.js';

const encoder = new TextEncoder();
const now = () => new Date().toISOString();

export const KEY_ID_RE = /^[A-Za-z0-9]{1,16}$/;
export const MIN_SECRET_LENGTH = 32;
const LINK_ID_RE = /^[A-Za-z0-9_-]{22}$/;
const SIGNATURE_RE = /^[A-Za-z0-9_-]{43}$/;

// A sent quote's page stays viewable this long after its "valid until" date (date requests are off).
export const VIEW_GRACE_DAYS = 90;

const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

function fromBase64Url(value) {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

function keyFrom(id, secret) {
  if (typeof id !== 'string' || !KEY_ID_RE.test(id)) return null;
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) return null;
  return { id, secret };
}

/** The configured signing keys: { current, previous }, each { id, secret } or null. */
export function linkKeys(env) {
  const current = keyFrom(env.QUOTE_LINK_KEY_ID, env.QUOTE_LINK_SECRET);
  let previous = keyFrom(env.QUOTE_LINK_KEY_ID_PREVIOUS, env.QUOTE_LINK_SECRET_PREVIOUS);
  if (previous && current && previous.id === current.id) previous = null;
  return { current, previous };
}

export const linksConfigured = (env) => Boolean(linkKeys(env).current);

export function keyById(env, keyId) {
  const { current, previous } = linkKeys(env);
  return [current, previous].find((key) => key && key.id === keyId) || null;
}

const hmacKeys = new Map();
async function hmacKey(secret) {
  if (!hmacKeys.has(secret)) {
    hmacKeys.set(
      secret,
      crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']),
    );
  }
  return hmacKeys.get(secret);
}

async function sign(secret, message) {
  return toBase64Url(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(message)));
}

// crypto.subtle.verify compares in constant time.
async function verify(secret, message, signature) {
  return crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64Url(signature), encoder.encode(message));
}

export const newLinkId = () => toBase64Url(crypto.getRandomValues(new Uint8Array(16)));

/** The token for a stored link, or null when its key is no longer configured. */
export async function tokenFor(env, keyId, linkId) {
  const key = keyById(env, keyId);
  if (!key) return null;
  return `${keyId}.${linkId}.${await sign(key.secret, `quote-link.${keyId}.${linkId}`)}`;
}

/** { keyId, linkId } when the token is well formed and correctly signed by a configured key, else null. */
export async function verifyToken(env, token) {
  if (typeof token !== 'string' || token.length > 100) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [keyId, linkId, signature] = parts;
  if (!KEY_ID_RE.test(keyId) || !LINK_ID_RE.test(linkId) || !SIGNATURE_RE.test(signature)) return null;
  const key = keyById(env, keyId);
  if (!key) return null;
  return (await verify(key.secret, `quote-link.${keyId}.${linkId}`, signature)) ? { keyId, linkId } : null;
}

/** The address customer links point to: QUOTE_LINK_BASE_URL (an https origin) or the website. */
export function linkBaseUrl(env) {
  const configured = env.QUOTE_LINK_BASE_URL;
  if (typeof configured === 'string' && configured) {
    try {
      const url = new URL(configured);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (url.protocol === 'https:' || (local && url.protocol === 'http:')) return url.origin;
    } catch {
      // Not a URL: fall back to the website.
    }
  }
  return site.url;
}

export async function quoteUrl(env, keyId, linkId) {
  const token = await tokenFor(env, keyId, linkId);
  return token ? `${linkBaseUrl(env)}/q/${token}` : null;
}

// --- The date request form nonce -----------------------------------------------------------------
// Ties a form to the page it was served on: the link id and the time it was served, signed. It is
// checked on submit, with the same-origin check, and lasts FORM_NONCE_MS.

export const FORM_NONCE_MS = 2 * 60 * 60 * 1000;

export async function formNonce(env, linkId, at = Date.now()) {
  const { current } = linkKeys(env);
  if (!current) return null;
  return `${at}.${await sign(current.secret, `date-form.${linkId}.${at}`)}`;
}

export async function checkFormNonce(env, linkId, nonce, at = Date.now()) {
  if (typeof nonce !== 'string' || nonce.length > 80) return false;
  const [issued, signature, extra] = nonce.split('.');
  if (extra !== undefined || !/^\d{13}$/.test(issued || '') || !SIGNATURE_RE.test(signature || '')) return false;
  const age = at - Number(issued);
  if (age < 0 || age > FORM_NONCE_MS) return false;
  const { current, previous } = linkKeys(env);
  for (const key of [current, previous]) {
    if (key && (await verify(key.secret, `date-form.${linkId}.${issued}`, signature))) return true;
  }
  return false;
}

// --- Stored links --------------------------------------------------------------------------------

const eventStatement = (db, enquiryId, at, actor, type, detail) =>
  db
    .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, ?, ?, ?)`)
    .bind(enquiryId, at, actor, type, JSON.stringify(detail));

/** The working (not revoked) link of a quote, or null. */
export async function activeLink(db, quoteId) {
  return db.prepare(`SELECT * FROM quote_links WHERE quote_id = ? AND revoked_at IS NULL`).bind(quoteId).first();
}

/**
 * The link a draft's email will carry, created the first time the draft is previewed so the preview
 * and the email sent are the same. Returns the link row, or null when links are not configured.
 */
export async function ensureDraftLink(env, quote, actor) {
  const db = env.DB;
  const existing = await activeLink(db, quote.id);
  if (existing && keyById(env, existing.key_id)) return existing;
  const { current } = linkKeys(env);
  if (!current) return null;
  const at = now();
  const draft = `EXISTS (SELECT 1 FROM quotes WHERE id = ? AND status = 'draft')`;
  const statements = [];
  // A draft's link whose key has since been removed can no longer be shown, so it is replaced.
  if (existing) {
    statements.push(
      db
        .prepare(`UPDATE quote_links SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL AND ${draft}`)
        .bind(at, actor, existing.id, quote.id),
    );
  }
  const noneYet = `NOT EXISTS (SELECT 1 FROM quote_links WHERE quote_id = ? AND revoked_at IS NULL)`;
  // The event is written first, on the same conditions as the link, so two previews at once record one.
  statements.push(
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, ?, 'quote_link_created', ? WHERE ${noneYet} AND ${draft}`,
      )
      .bind(quote.enquiryId, at, actor, JSON.stringify({ quote: quote.reference, keyId: current.id }), quote.id, quote.id),
    db
      .prepare(
        `INSERT INTO quote_links (quote_id, link_id, key_id, created_at, created_by)
         SELECT ?, ?, ?, ?, ? WHERE ${noneYet} AND ${draft}`,
      )
      .bind(quote.id, newLinkId(), current.id, at, actor, quote.id, quote.id),
  );
  await db.batch(statements);
  return activeLink(db, quote.id);
}

const quoteRow = (db, reference) =>
  db.prepare(`SELECT id, enquiry_id, reference, status, valid_until FROM quotes WHERE reference = ?`).bind(reference).first();

/**
 * Replace a sent quote's link with a new one (after a revocation, a compromised key, or for a quote
 * sent before Phase C). Any working link is revoked in the same transaction. Nothing is emailed: the
 * administrator copies the new link and sends it.
 * Returns { result: 'ok' | 'not_found' | 'not_sent' | 'unconfigured' }.
 */
export async function createLink(env, reference, actor) {
  const db = env.DB;
  const row = await quoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  if (row.status !== 'sent') return { result: 'not_sent' };
  const { current } = linkKeys(env);
  if (!current) return { result: 'unconfigured' };
  const at = now();
  const sent = `EXISTS (SELECT 1 FROM quotes WHERE id = ? AND status = 'sent')`;
  const old = await activeLink(db, row.id);
  const statements = [];
  if (old) {
    statements.push(
      eventStatement(db, row.enquiry_id, at, actor, 'quote_link_revoked', { quote: reference, keyId: old.key_id }),
      db
        .prepare(`UPDATE quote_links SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL`)
        .bind(at, actor, old.id),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) SELECT ?, ?, ?, 'quote_link_created', ? WHERE ${sent}`,
      )
      .bind(row.enquiry_id, at, actor, JSON.stringify({ quote: reference, keyId: current.id, replaced: Boolean(old) }), row.id),
    db
      .prepare(`INSERT INTO quote_links (quote_id, link_id, key_id, created_at, created_by) SELECT ?, ?, ?, ?, ? WHERE ${sent}`)
      .bind(row.id, newLinkId(), current.id, at, actor, row.id),
  );
  await db.batch(statements);
  return { result: 'ok' };
}

/** Revoke a quote's working link. The customer then sees "no longer available". */
export async function revokeLink(env, reference, actor) {
  const db = env.DB;
  const row = await quoteRow(db, reference);
  if (!row) return { result: 'not_found' };
  const link = await activeLink(db, row.id);
  if (!link) return { result: 'no_link' };
  const at = now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, ?, 'quote_link_revoked', ? WHERE EXISTS (SELECT 1 FROM quote_links WHERE id = ? AND revoked_at IS NULL)`,
      )
      .bind(row.enquiry_id, at, actor, JSON.stringify({ quote: reference, keyId: link.key_id }), link.id),
    db.prepare(`UPDATE quote_links SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL`).bind(at, actor, link.id),
  ]);
  return { result: 'ok' };
}

/** Whether a quote's page can be viewed today: sent, and no more than VIEW_GRACE_DAYS past its validity. */
export function viewable(status, validUntil, today = ukToday()) {
  return status === 'sent' && Boolean(validUntil) && today <= addDays(validUntil, VIEW_GRACE_DAYS);
}

/** The customer link of a quote as the Admin shows it, with its date requests. */
export async function customerLinkInfo(env, reference) {
  const db = env.DB;
  const row = await quoteRow(db, reference);
  if (!row) return null;
  const { current, previous } = linkKeys(env);
  const link = await activeLink(db, row.id);
  const { results: revoked } = await db
    .prepare(`SELECT created_at, revoked_at, revoked_by, key_id, view_count FROM quote_links WHERE quote_id = ? AND revoked_at IS NOT NULL ORDER BY id DESC`)
    .bind(row.id)
    .all();
  const { results: requests } = await db
    .prepare(
      `SELECT r.id, r.status, r.customer_note, r.created_at, r.updated_at, s.slot_date, s.period, s.status AS slot_status
       FROM date_requests r JOIN availability_slots s ON s.id = r.slot_id
       WHERE r.quote_id = ? ORDER BY r.id DESC`,
    )
    .bind(row.id)
    .all();
  return {
    configured: Boolean(current),
    currentKeyId: current?.id ?? null,
    previousKeyId: previous?.id ?? null,
    viewable: viewable(row.status, row.valid_until),
    link: link
      ? {
          url: await quoteUrl(env, link.key_id, link.link_id),
          keyId: link.key_id,
          keyAvailable: Boolean(keyById(env, link.key_id)),
          createdAt: link.created_at,
          createdBy: link.created_by,
          firstViewedAt: link.first_viewed_at,
          lastViewedAt: link.last_viewed_at,
          viewCount: link.view_count,
        }
      : null,
    revokedLinks: revoked.map((r) => ({
      keyId: r.key_id,
      createdAt: r.created_at,
      revokedAt: r.revoked_at,
      revokedBy: r.revoked_by,
      viewCount: r.view_count,
    })),
    dateRequests: requests.map(requestToApi),
  };
}

export const requestToApi = (r) => ({
  id: r.id,
  status: r.status,
  note: r.customer_note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  date: r.slot_date,
  period: r.period,
  slotStatus: r.slot_status,
});

/**
 * Links by signing key, for rotating QUOTE_LINK_SECRET. Only links customers can still use count:
 * not revoked, and their quote is sent and within its viewing window.
 * `affected` lists those not signed with the current key: on the previous key they stop working when
 * it is removed; on a key no longer configured they have already stopped.
 */
export async function linkKeyReport(env) {
  const db = env.DB;
  const { current, previous } = linkKeys(env);
  const today = ukToday();
  const { results } = await db
    .prepare(
      `SELECT l.key_id, q.reference, q.status, q.valid_until, q.customer_name, q.customer_business, e.reference AS enquiry_reference
       FROM quote_links l JOIN quotes q ON q.id = l.quote_id JOIN enquiries e ON e.id = q.enquiry_id
       WHERE l.revoked_at IS NULL AND q.status = 'sent' AND date(q.valid_until, '+${VIEW_GRACE_DAYS} days') >= ?
       ORDER BY q.quote_number`,
    )
    .bind(today)
    .all();
  const counts = {};
  for (const r of results) counts[r.key_id] = (counts[r.key_id] || 0) + 1;
  return {
    configured: Boolean(current),
    currentKeyId: current?.id ?? null,
    previousKeyId: previous?.id ?? null,
    counts,
    affected: results
      .filter((r) => r.key_id !== current?.id)
      .map((r) => ({
        reference: r.reference,
        enquiryReference: r.enquiry_reference,
        customer: r.customer_business || r.customer_name,
        validUntil: r.valid_until,
        keyId: r.key_id,
        state: r.key_id === previous?.id ? 'previous' : 'unavailable',
      })),
  };
}
