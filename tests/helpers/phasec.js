// Shared set-up for the Phase C tests: a signed-in Admin, a sent quote with its customer link, and
// calls to the customer page exactly as Cloudflare Pages makes them. Resend and Stripe are never
// called for real (see services.js).

import assert from 'node:assert/strict';
import { FakeD1, adminEnv, callAdmin, cookieFrom } from './d1.js';
import { createEnquiry } from '../../server/admin/enquiries.js';
import { packageItem, ukToday, addDays } from '../../src/lib/admin/quotes.js';
import { TEST_STRIPE } from './services.js';

export const NOTE = 'INTERNAL-ONLY: margin is thin';
export const OVERRIDE_REASON = 'PRIVATE-REASON: friend of the owner';

export async function setUp({ db = new FakeD1() } = {}) {
  const { env, email, password } = await adminEnv(db);
  env.RESEND_API_KEY = 'test-key-not-real';
  env.QUOTE_FROM_EMAIL = 'ROSS 360 <enquiries@ross360.test>';
  Object.assign(env, TEST_STRIPE);
  const signIn = await callAdmin(env, '/api/admin/session', { method: 'POST', body: { email, password } });
  const cookie = cookieFrom(signIn.headers);
  const { reference: enquiry } = await createEnquiry(
    db,
    { name: 'Alex Customer', business: 'Test Café', email: 'alex@example.test', location: 'M1 1AA' },
    { origin: 'admin', actor: email },
  );
  const call = (path, options = {}) => callAdmin(env, `/api/admin${path}`, { cookie, ...options });
  return { db, env, email, cookie, enquiry, call };
}

/** Run with fetch replaced by a Resend stub; `respond(n, call)` answers the n-th request. */
export async function withResend(run, respond = () => new Response(JSON.stringify({ id: 'resend-1' }), { status: 200 })) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const call = { url: String(url), headers: init.headers, body: JSON.parse(init.body) };
    calls.push(call);
    return respond(calls.length, call);
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

/** A previewed draft for the set-up enquiry. Returns the quote (API form). */
export async function previewedDraft(t, extra = {}) {
  const created = await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const ref = created.data.quote.reference;
  const saved = await t.call(`/quotes/${ref}`, {
    method: 'PATCH',
    body: {
      version: created.data.quote.version,
      package: 'professional',
      customerType: 'business',
      items: [packageItem('professional'), { kind: 'custom', description: 'Additional floor', quantity: 2, unitPence: 5000 }],
      travelMode: 'mileage',
      travelOneWayTenths: 236,
      travelOverride: true,
      travelOverrideReason: OVERRIDE_REASON,
      travelPence: 2000,
      discountPence: 3000,
      discountLabel: 'Returning customer',
      serviceDescription: 'A 360° virtual tour of the dining room, bar and terrace.',
      internalNotes: NOTE,
      ...extra,
    },
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const preview = await t.call(`/quotes/${ref}/preview`);
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  return { quote: preview.data.quote, preview: preview.data };
}

/** A sent quote. Returns { reference, url, token, email } where email is what Resend was given. */
export async function sentQuote(t, extra = {}) {
  const { quote } = await previewedDraft(t, extra);
  return withResend(async (calls) => {
    const sent = await t.call(`/quotes/${quote.reference}/send`, {
      method: 'POST',
      body: { version: quote.version, previewedOn: ukToday(), confirm: true },
    });
    assert.equal(sent.status, 200, JSON.stringify(sent.data));
    const email = calls[0].body;
    // Quotes booked by email carry no link in the email; the Admin shows it.
    const url =
      email.text.match(/https:\/\/ross360\.test\/q\/\S+/)?.[0] ?? (await t.call(`/quotes/${quote.reference}/customer`)).data.customer.link.url;
    return { reference: quote.reference, url, token: url.split('/q/')[1], email, quote: sent.data.quote };
  });
}

/** Call the customer page function. Returns { status, html, headers, location }. */
export async function callPage(env, path, { method = 'GET', form, origin = 'https://ross360.test', contentType } = {}) {
  const { onRequest } = await import('../../functions/q/[[path]].js');
  const headers = {};
  if (origin) headers.Origin = origin;
  let body;
  if (form) {
    headers['Content-Type'] = contentType || 'application/x-www-form-urlencoded';
    body = new URLSearchParams(form).toString();
  }
  const request = new Request(`https://ross360.test${path}`, { method, headers, body });
  const segments = path.split('?')[0].replace(/^\/q\/?/, '').split('/').filter(Boolean);
  const response = await onRequest({ request, env, params: { path: segments } });
  const html = method === 'HEAD' ? '' : await response.text();
  return { status: response.status, html, headers: response.headers, location: response.headers.get('Location') };
}

/** The form nonce, slot ids and payment choices on a booking page. */
export function formOf(html) {
  const nonce = html.match(/name="nonce" value="([^"]+)"/)?.[1] ?? null;
  const slots = [...html.matchAll(/name="slot" value="(\d+)"/g)].map((m) => Number(m[1]));
  const plans = [...html.matchAll(/name="plan" value="(\w+)"/g)].map((m) => m[1]);
  return { nonce, slots, plans };
}

/** Add an open slot directly through the Admin API, `days` from today. Returns the slot. */
export async function addSlot(t, days, period = 'am') {
  const result = await t.call('/availability', { method: 'POST', body: { date: addDays(ukToday(), days), period } });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data.slot;
}

/**
 * Go through the booking pages for a slot and submit the payment form (inside withServices).
 * Returns the POST response; on success its location is Stripe's page.
 */
export async function checkout(env, token, slotId, plan = 'full', { agree = true } = {}) {
  const page = await callPage(env, `/q/${token}/pay?slot=${slotId}`);
  assert.equal(page.status, 200, page.html);
  const { nonce } = formOf(page.html);
  const form = { nonce, slot: String(slotId), plan };
  if (agree) form.agree = 'yes';
  return callPage(env, `/q/${token}/pay`, { method: 'POST', form });
}

/** Post a small form (release, balance, cancel) with a fresh nonce from `fromPath`. */
export async function postForm(env, token, page, fromPath = `/q/${token}`) {
  const from = await callPage(env, fromPath);
  const { nonce } = formOf(from.html);
  return callPage(env, `/q/${token}/${page}`, { method: 'POST', form: { nonce } });
}

/** Let a sent quote's dates be moved, for expiry tests only (the triggers lock them otherwise). */
export function setSentDates(db, reference, { issuedOn, validUntil }) {
  db.db.exec('DROP TRIGGER quotes_sent_content_locked');
  db.db.prepare(`UPDATE quotes SET issued_on = ?, valid_until = ? WHERE reference = ?`).run(issuedOn, validUntil, reference);
  const snapshot = JSON.parse(db.db.prepare(`SELECT sent_snapshot FROM quotes WHERE reference = ?`).get(reference).sent_snapshot);
  snapshot.issuedOn = issuedOn;
  snapshot.validUntil = validUntil;
  db.db.prepare(`UPDATE quotes SET sent_snapshot = ? WHERE reference = ?`).run(JSON.stringify(snapshot), reference);
}
