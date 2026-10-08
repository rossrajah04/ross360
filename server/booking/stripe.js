// Stripe, for Phase C bookings: hosted Checkout for payments and the Refunds API. No card details
// ever reach this site: customers pay on Stripe's own page, and only Stripe's ids are stored.
//
// Environment:
//   STRIPE_SECRET_KEY      secret (sk_…) or restricted (rk_…) key. Test keys (sk_test_/rk_test_) on
//                          Preview. A live key is refused unless STRIPE_ALLOW_LIVE is "true", which is
//                          set only in Production, so Preview can never take a real payment.
//   STRIPE_WEBHOOK_SECRET  the signing secret (whsec_…) of the webhook endpoint /api/stripe/webhook.
//   STRIPE_ALLOW_LIVE      "true" in Production only.

const API = 'https://api.stripe.com/v1';
const TIMEOUT_MS = 20_000;
const SIGNATURE_TOLERANCE_SECONDS = 300;

export const stripeMode = (key) => {
  if (/^(sk|rk)_test_/.test(key || '')) return 'test';
  if (/^(sk|rk)_live_/.test(key || '')) return 'live';
  return null;
};

/** 'test', 'live' or null (not set up, not a Stripe key, or a live key where live is not allowed). */
export function stripeReady(env) {
  const mode = stripeMode(env.STRIPE_SECRET_KEY);
  if (mode === 'live' && env.STRIPE_ALLOW_LIVE !== 'true') return null;
  return mode;
}

/** Why payments are unavailable, for logs and the Admin; null when they are available. */
export function stripeProblem(env) {
  const mode = stripeMode(env.STRIPE_SECRET_KEY);
  if (!env.STRIPE_SECRET_KEY) return 'STRIPE_SECRET_KEY is not set.';
  if (!mode) return 'STRIPE_SECRET_KEY is not a Stripe secret or restricted key.';
  if (mode === 'live' && env.STRIPE_ALLOW_LIVE !== 'true') return 'A live Stripe key is set but STRIPE_ALLOW_LIVE is not "true"; payments are off.';
  if (!env.STRIPE_WEBHOOK_SECRET) return 'STRIPE_WEBHOOK_SECRET is not set.';
  return null;
}

/** Stripe's form encoding: nested objects and arrays as a[b][0]=c. */
export function formEncode(params, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) value.forEach((item, i) => (typeof item === 'object' ? formEncode(item, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(item))));
    else if (typeof value === 'object') formEncode(value, name, out);
    else out.append(name, String(value));
  }
  return out;
}

export class StripeError extends Error {
  /** `definite` is true when Stripe answered and refused; false when there was no clear answer. */
  constructor(message, { status = null, code = null, definite = false } = {}) {
    super(message);
    this.name = 'StripeError';
    this.status = status;
    this.code = code;
    this.definite = definite;
  }
}

async function call(env, method, path, params, idempotencyKey) {
  if (!stripeReady(env)) throw new StripeError(stripeProblem(env) || 'Stripe is not set up.', { definite: true });
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  let body;
  if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = formEncode(params).toString();
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  let res;
  try {
    res = await fetch(`${API}${path}`, { method, headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw new StripeError(`Stripe could not be reached (${error?.name || 'Error'}).`);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = data?.error?.message ? String(data.error.message).slice(0, 300) : `HTTP ${res.status}`;
    // 4xx is a definite refusal (nothing happened); 5xx or 429 may or may not have taken effect.
    throw new StripeError(`Stripe refused the request: ${message}`, {
      status: res.status,
      code: data?.error?.code || null,
      definite: res.status >= 400 && res.status < 500 && res.status !== 409 && res.status !== 429,
    });
  }
  return data;
}

/** Create a Checkout Session. `idempotencyKey` makes a retry return the same session. */
export const createCheckoutSession = (env, params, idempotencyKey) => call(env, 'POST', '/checkout/sessions', params, idempotencyKey);

export const retrieveCheckoutSession = (env, id) => call(env, 'GET', `/checkout/sessions/${encodeURIComponent(id)}`);

/** Expire an open Checkout Session so it can no longer be paid. */
export const expireCheckoutSession = (env, id) => call(env, 'POST', `/checkout/sessions/${encodeURIComponent(id)}/expire`, {});

/** Refund part or all of a payment. The Idempotency-Key makes retries safe. */
export const createRefund = (env, params, idempotencyKey) => call(env, 'POST', '/refunds', params, idempotencyKey);

// --- Webhook signatures ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const toHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

function equalHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Check a webhook's Stripe-Signature header against STRIPE_WEBHOOK_SECRET (t=…,v1=…), within five
 * minutes. Returns the parsed event, or null if the signature does not match.
 */
export async function verifyWebhook(env, payload, header, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!env.STRIPE_WEBHOOK_SECRET || !header) return null;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v || '');
  if (!Number.isSafeInteger(t) || !signatures.length) return null;
  if (Math.abs(nowSeconds - t) > SIGNATURE_TOLERANCE_SECONDS) return null;
  const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${t}.${payload}`);
  if (!signatures.some((s) => equalHex(s, expected))) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/** Sign a payload as Stripe does (for tests and the local stub). */
export async function signWebhook(secret, payload, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${payload}`)}`;
}
