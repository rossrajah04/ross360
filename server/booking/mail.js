// Booking emails through Resend, and the test-email guard.
//
// EMAIL_TEST_ALLOWLIST (Preview): a comma-separated list of the only addresses customer emails may go
// to (quotes and booking emails). Anything else is skipped and logged, so no real customer can be
// emailed while testing. As a second guard, while Stripe is in test mode customer emails are skipped
// unless this list is set. Internal emails (to newquote@, or QUOTE_TO_EMAIL) are not affected.

import { safeResendDetail } from '../../functions/api/quote.js';
import { stripeMode } from './stripe.js';

const RESEND_URL = 'https://api.resend.com/emails';
export const INTERNAL_TO = 'newquote@ross360.co.uk';

const addressOf = (value) => {
  const text = String(value || '').trim();
  const angled = text.match(/<([^>]+)>/);
  return (angled ? angled[1] : text).trim().toLowerCase();
};

export const allowlist = (env) =>
  String(env.EMAIL_TEST_ALLOWLIST || '')
    .split(',')
    .map(addressOf)
    .filter(Boolean);

/**
 * Whether a customer email may be sent to `to`. Returns { ok: true } or { ok: false, reason }.
 */
export function customerEmailAllowed(env, to) {
  const list = allowlist(env);
  if (list.length) {
    return list.includes(addressOf(to)) ? { ok: true } : { ok: false, reason: 'not_on_allowlist' };
  }
  if (stripeMode(env.STRIPE_SECRET_KEY) === 'test') return { ok: false, reason: 'test_mode_without_allowlist' };
  return { ok: true };
}

export const internalTo = (env) => env.QUOTE_TO_EMAIL || INTERNAL_TO;

/**
 * Send one email. `customer` marks a customer email (checked against the test guard).
 * Returns { ok, status, skipped? }. Never throws.
 */
export async function sendEmail(env, message, { idempotencyKey, customer = false, label = 'booking' } = {}) {
  if (customer) {
    const allowed = customerEmailAllowed(env, message.to?.[0]);
    if (!allowed.ok) {
      console.warn(`Email (${label}) not sent: the recipient is not allowed (${allowed.reason}).`);
      return { ok: false, status: allowed.reason, skipped: true };
    }
  }
  if (!env.RESEND_API_KEY || !env.QUOTE_FROM_EMAIL) {
    console.error(`Email (${label}) not sent: RESEND_API_KEY and QUOTE_FROM_EMAIL are not set.`);
    return { ok: false, status: 'not configured' };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: env.QUOTE_FROM_EMAIL, ...message }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      let detail = '';
      try {
        detail = safeResendDetail(await res.text());
      } catch {
        detail = '';
      }
      console.error(`Resend request (${label}) failed with status ${res.status}; ${detail || '(empty response body)'}`);
    }
    return { ok: res.ok, status: res.status };
  } catch (error) {
    console.error(`Resend request (${label}) could not be sent: ${safeResendDetail(`${error?.name}: ${error?.message}`)}`);
    return { ok: false, status: 'not sent' };
  }
}
