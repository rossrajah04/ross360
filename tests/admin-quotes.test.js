// Phase B quotes: drafts, preview, sending, duplicate-send protection, revisions, timeline and auth.
// Resend is never called for real: fetch is replaced by a stub that records each request.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1, adminEnv, callAdmin, cookieFrom } from './helpers/d1.js';
import { createEnquiry, getEnquiry, changeStatus } from '../server/admin/enquiries.js';
import { createQuote, getQuote } from '../server/admin/quotes.js';
import { renderQuote } from '../server/admin/quoteRender.js';
import { quoteEmail } from '../src/content/quoteEmail.js';
import { packageItem, ukToday, addDays, longDate } from '../src/lib/admin/quotes.js';

const NOTE = 'INTERNAL-ONLY: margin is thin, do not discount again';

async function setUp({ resend = true } = {}) {
  const db = new FakeD1();
  const { env, email, password } = await adminEnv(db);
  if (resend) env.RESEND_API_KEY = 'test-key-not-real';
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

// Replace fetch with a Resend stub for the duration of `run`.
async function withResend(respond, run) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return respond(calls.length);
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}
const accepted = () => new Response(JSON.stringify({ id: 'resend-message-1' }), { status: 200 });

async function readyDraft(t, extra = {}) {
  const created = await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const ref = created.data.quote.reference;
  const saved = await t.call(`/quotes/${ref}`, {
    method: 'PATCH',
    body: {
      version: 1,
      package: 'professional',
      items: [packageItem('professional'), { kind: 'custom', description: 'Additional floor', quantity: 2, unitPence: 5000 }],
      travelPence: 2500,
      discountPence: 3000,
      discountLabel: 'Returning customer',
      serviceDescription: 'A 360° virtual tour of the dining room, bar and terrace.',
      internalNotes: NOTE,
      ...extra,
    },
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  // Sending requires the current version to have been previewed.
  const preview = await t.call(`/quotes/${saved.data.quote.reference}/preview`);
  assert.equal(preview.status, 200);
  return preview.data.quote;
}

const eventsOf = async (t) => (await getEnquiry(t.db, t.enquiry)).events;

// --- Auth -------------------------------------------------------------------------------------

test('every quote route refuses requests without a session, and returns no quote data', async () => {
  const t = await setUp();
  await createQuote(t.db, t.enquiry, 'test');
  const routes = [
    ['GET', `/enquiries/${t.enquiry}/quotes`],
    ['POST', `/enquiries/${t.enquiry}/quotes`],
    ['GET', '/quotes/Q-0001'],
    ['PATCH', '/quotes/Q-0001'],
    ['GET', '/quotes/Q-0001/preview'],
    ['GET', '/quotes/Q-0001/preview.html'],
    ['POST', '/quotes/Q-0001/send'],
    ['POST', '/quotes/Q-0001/revise'],
    ['POST', '/quotes/Q-0001/discard'],
  ];
  for (const [method, path] of routes) {
    const result = await callAdmin(t.env, `/api/admin${path}`, { method, body: method === 'GET' ? undefined : { version: 1, confirm: true, previewedOn: ukToday() } });
    assert.equal(result.status, 401, `${method} ${path}`);
    assert.equal(result.data.quote, undefined);
    assert.ok(!JSON.stringify(result.data).includes('Alex'), `${method} ${path} leaked data`);
  }
});

test('quote writes from another site are refused', async () => {
  const t = await setUp();
  await createQuote(t.db, t.enquiry, 'test');
  const { onRequest } = await import('../functions/api/admin/[[route]].js');
  for (const [method, path] of [
    ['POST', `/enquiries/${t.enquiry}/quotes`],
    ['PATCH', '/quotes/Q-0001'],
    ['POST', '/quotes/Q-0001/send'],
    ['POST', '/quotes/Q-0001/discard'],
  ]) {
    const request = new Request(`https://ross360.test/api/admin${path}`, {
      method,
      headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json', Cookie: t.cookie },
      body: JSON.stringify({ version: 1, confirm: true, previewedOn: ukToday() }),
    });
    const response = await onRequest({ request, env: t.env, params: { route: path.split('/').filter(Boolean) } });
    assert.equal(response.status, 403, `${method} ${path}`);
  }
  assert.equal((await t.call(`/enquiries/${t.enquiry}/quotes`)).data.quotes.length, 1);
  assert.equal((await getQuote(t.db, 'Q-0001')).status, 'draft');
});

test('malformed and unknown references are 404, never a lookup by raw id', async () => {
  const t = await setUp();
  for (const path of ['/quotes/1', '/quotes/Q-1', '/quotes/ROSS-0001', '/quotes/Q-9999', '/enquiries/ROSS-9999/quotes']) {
    assert.equal((await t.call(path)).status, 404, path);
  }
  assert.equal((await t.call('/enquiries/ROSS-9999/quotes', { method: 'POST', body: {} })).status, 404);
});

// --- Drafts -----------------------------------------------------------------------------------

test('a new draft gets Q-0001, then Q-0002, copies the customer details and is logged', async () => {
  const t = await setUp();
  const first = await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  assert.equal(first.status, 201);
  const q = first.data.quote;
  assert.equal(q.reference, 'Q-0001');
  assert.equal(q.status, 'draft');
  assert.equal(q.version, 1);
  assert.equal(q.validDays, 14);
  assert.equal(q.customerName, 'Alex Customer');
  assert.equal(q.customerBusiness, 'Test Café');
  assert.equal(q.customerEmail, 'alex@example.test');
  assert.equal(q.customerLocation, 'M1 1AA');
  assert.equal(q.enquiryReference, t.enquiry);
  const second = await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  assert.equal(second.data.quote.reference, 'Q-0002');

  const list = await t.call(`/enquiries/${t.enquiry}/quotes`);
  assert.deepEqual(list.data.quotes.map((x) => x.reference), ['Q-0002', 'Q-0001']);
  const created = (await eventsOf(t)).filter((e) => e.type === 'quote_created');
  assert.deepEqual(created.map((e) => e.detail.quote).sort(), ['Q-0001', 'Q-0002']);
});

test('quote and enquiry references use separate counters, and simultaneous drafts never share one', async () => {
  const t = await setUp();
  const made = await Promise.all(Array.from({ length: 8 }, () => createQuote(t.db, t.enquiry, 'test')));
  const refs = made.map((q) => q.reference);
  assert.equal(new Set(refs).size, 8, refs.join(', '));
  const { reference } = await createEnquiry(t.db, { name: 'Next', email: 'n@example.test' }, { origin: 'admin', actor: 'test' });
  assert.equal(reference, 'ROSS-0002');
  const next = await createQuote(t.db, reference, 'test');
  assert.equal(next.reference, 'Q-0009');
});

test('saving a draft recalculates totals on the server and raises the version', async () => {
  const t = await setUp();
  await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const saved = await t.call('/quotes/Q-0001', {
    method: 'PATCH',
    body: {
      version: 1,
      items: [packageItem('professional'), { kind: 'custom', description: 'Extra', quantity: 2, unitPence: 5000 }],
      travelPence: 2500,
      discountPence: 3000,
      discountLabel: 'Returning customer',
      subtotalPence: 1,
      totalPence: 1,
      status: 'sent',
    },
  });
  assert.equal(saved.status, 200);
  const q = saved.data.quote;
  assert.equal(q.version, 2);
  assert.equal(q.status, 'draft');
  assert.equal(q.subtotalPence, 44900);
  assert.equal(q.totalPence, 44900 + 2500 - 3000);
  assert.deepEqual(q.items.map((i) => i.amountPence), [34900, 10000]);

  const updated = (await eventsOf(t)).find((e) => e.type === 'quote_updated');
  assert.equal(updated.detail.quote, 'Q-0001');
  assert.equal(updated.detail.totalPence, 44400);
  assert.ok(updated.detail.fields.includes('Lines'));

  // Fields left out keep their values.
  const partial = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 2, validDays: 21 } });
  assert.equal(partial.data.quote.validDays, 21);
  assert.equal(partial.data.quote.items.length, 2);
  assert.equal(partial.data.quote.version, 3);

  // No change: nothing written, version kept.
  const same = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 3, validDays: 21 } });
  assert.equal(same.data.quote.version, 3);
});

test('a save naming an older version is refused, so two tabs cannot overwrite each other', async () => {
  const t = await setUp();
  await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const tabA = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 1, items: [packageItem('essential')] } });
  assert.equal(tabA.status, 200);
  const tabB = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 1, items: [packageItem('bespoke')] } });
  assert.equal(tabB.status, 409);
  assert.equal(tabB.data.quote.items[0].unitPence, 24900);
  assert.equal((await getQuote(t.db, 'Q-0001')).items.length, 1);
});

test('two saves of the same version at once: exactly one wins, with its own lines', async () => {
  const t = await setUp();
  await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const results = await Promise.all(
    ['essential', 'professional', 'bespoke'].map((id) =>
      t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 1, items: [packageItem(id)] } }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409]);
  const q = await getQuote(t.db, 'Q-0001');
  assert.equal(q.version, 2);
  assert.equal(q.items.length, 1);
  assert.equal(q.totalPence, q.items[0].unitPence);
});

test('bad quote input: wrong types are 400, out-of-range values are 422, a missing version is 400', async () => {
  const t = await setUp();
  await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const bad = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 1, travelPence: 12.5 } });
  assert.equal(bad.status, 400);
  const range = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 1, items: [{ kind: 'custom', description: 'x', quantity: 100, unitPence: 1 }] } });
  assert.equal(range.status, 422);
  assert.ok(range.data.errors['items.0.quantity']);
  const discount = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version: 1, discountPence: 100, discountLabel: 'x' } });
  assert.equal(discount.status, 422);
  for (const version of [undefined, '1', 1.5, 0, null]) {
    const result = await t.call('/quotes/Q-0001', { method: 'PATCH', body: { version, validDays: 10 } });
    assert.equal(result.status, 400, `version ${version}`);
  }
  const nullBody = await callAdmin(t.env, '/api/admin/quotes/Q-0001', { method: 'PATCH', body: null, cookie: t.cookie });
  assert.equal(nullBody.status, 400);
  assert.equal((await getQuote(t.db, 'Q-0001')).version, 1);
});

test('a draft can be discarded; it is kept, logged, and can no longer be changed or sent', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  const discarded = await t.call(`/quotes/${q.reference}/discard`, { method: 'POST', body: {} });
  assert.equal(discarded.status, 200);
  assert.equal(discarded.data.quote.status, 'discarded');
  assert.equal((await t.call(`/quotes/${q.reference}/discard`, { method: 'POST', body: {} })).status, 409);
  assert.equal((await t.call(`/quotes/${q.reference}`, { method: 'PATCH', body: { version: q.version, validDays: 3 } })).status, 409);
  await withResend(accepted, async (calls) => {
    const sent = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } });
    assert.equal(sent.status, 409);
    assert.equal(calls.length, 0);
  });
  assert.equal((await eventsOf(t)).filter((e) => e.type === 'quote_discarded').length, 1);
});

// --- Preview ----------------------------------------------------------------------------------

test('the preview shows the customer quote with the agreed wording, and never the internal notes', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  const preview = await t.call(`/quotes/${q.reference}/preview`);
  assert.equal(preview.status, 200);
  const { email } = preview.data;
  assert.equal(email.subject, `ROSS 360 quotation ${q.reference}`);
  assert.equal(email.to, 'alex@example.test');
  assert.equal(email.bcc, 'newquote@ross360.co.uk');
  assert.equal(email.from, 'ROSS 360 <contact@ross360.co.uk>');

  const page = await t.call(`/quotes/${q.reference}/preview.html`);
  const html = page.data.raw;
  for (const content of [html, email.text]) {
    assert.ok(content.includes('Thanks for the opportunity to provide a quotation for your 360° virtual tour project.'));
    assert.ok(content.includes('VAT is not charged.'));
    assert.ok(
      content.includes(
        'To go ahead, choose a preferred date online or reply to this email. Nothing is booked until ROSS 360 confirms the date with you.',
      ),
    );
    assert.ok(content.includes('View your quotation and choose a preferred date online.'));
    assert.match(content, /https:\/\/ross360\.test\/q\/k1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/);
    assert.ok(content.includes('We look forward to working with you.'));
    assert.ok(content.includes(q.reference));
    assert.ok(content.includes(t.enquiry));
    assert.ok(content.includes('Professional 360° virtual tour'));
    assert.ok(content.includes('£449.00')); // subtotal
    assert.ok(content.includes('£25.00')); // travel
    assert.ok(content.includes('Returning customer'));
    assert.ok(content.includes('£444.00')); // total
    assert.ok(content.includes(`Valid until ${longDate(addDays(ukToday(), 14))} (14 days)`));
    assert.ok(content.includes('contact@ross360.co.uk'));
    assert.ok(content.includes('https://ross360.co.uk/terms'));
    assert.ok(!content.includes(NOTE), 'internal notes must never be shown');
    assert.ok(!content.includes('INTERNAL-ONLY'));
  }
  assert.ok(!JSON.stringify(preview.data.email).includes('INTERNAL-ONLY'));
});

test('the preview frame is served with a strict policy of its own', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  const page = await t.call(`/quotes/${q.reference}/preview.html`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('Content-Type'), /text\/html/);
  const csp = page.headers.get('Content-Security-Policy');
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.doesNotMatch(csp, /script-src/);
  assert.equal(page.headers.get('Cache-Control'), 'no-store');
  assert.doesNotMatch(page.data.raw, /<script|<img|src=/i);
});

test('customer text is escaped in the quote', async () => {
  const t = await setUp();
  const q = await readyDraft(t, {
    customerName: '<script>alert(1)</script>',
    serviceDescription: '<img src=x onerror=alert(1)> & "quotes"',
    items: [{ kind: 'custom', description: '<b>bold</b>', quantity: 1, unitPence: 100 }],
    discountPence: 0,
  });
  const html = (await t.call(`/quotes/${q.reference}/preview.html`)).data.raw;
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<b>bold'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&amp; &quot;quotes&quot;'));
});

test('previewing is logged once per version', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await t.call(`/quotes/${q.reference}/preview`);
  await t.call(`/quotes/${q.reference}/preview`);
  let previews = (await eventsOf(t)).filter((e) => e.type === 'quote_previewed');
  assert.equal(previews.length, 1);
  assert.deepEqual(previews[0].detail, { quote: q.reference, version: q.version });
  await t.call(`/quotes/${q.reference}`, { method: 'PATCH', body: { version: q.version, validDays: 7 } });
  await t.call(`/quotes/${q.reference}/preview`);
  previews = (await eventsOf(t)).filter((e) => e.type === 'quote_previewed');
  assert.equal(previews.length, 2);
});

// --- Sending ----------------------------------------------------------------------------------

test('sending emails the customer from contact@, BCCs newquote@, stores the snapshot and marks the enquiry Quoted', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  const previewHtml = (await t.call(`/quotes/${q.reference}/preview.html`)).data.raw;

  await withResend(accepted, async (calls) => {
    const sent = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } });
    assert.equal(sent.status, 200, JSON.stringify(sent.data));
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.url, 'https://api.resend.com/emails');
    assert.equal(call.headers['Idempotency-Key'], `quote-${q.reference}-v${q.version}`);
    assert.equal(call.body.from, 'ROSS 360 <contact@ross360.co.uk>');
    assert.equal(call.body.reply_to, 'ROSS 360 <contact@ross360.co.uk>');
    assert.deepEqual(call.body.to, ['alex@example.test']);
    assert.deepEqual(call.body.bcc, ['newquote@ross360.co.uk']);
    assert.equal(call.body.subject, `ROSS 360 quotation ${q.reference}`);
    assert.ok(!JSON.stringify(call.body).includes('INTERNAL-ONLY'));
    // What was previewed is exactly what was sent (same day).
    assert.equal(call.body.html, previewHtml);

    const quote = sent.data.quote;
    assert.equal(quote.status, 'sent');
    assert.equal(quote.sentTo, 'alex@example.test');
    assert.equal(quote.resendMessageId, 'resend-message-1');
    assert.equal(quote.issuedOn, ukToday());
    assert.equal(quote.validUntil, addDays(ukToday(), 14));
    assert.ok(quote.sentAt);
  });

  const row = t.db.db.prepare(`SELECT * FROM quotes WHERE reference = ?`).get(q.reference);
  assert.equal(row.sent_html, previewHtml);
  const snapshot = JSON.parse(row.sent_snapshot);
  assert.equal(snapshot.totalPence, 44400);
  assert.equal(snapshot.items.length, 2);
  assert.equal(snapshot.vat, 'VAT is not charged.');
  assert.equal(snapshot.bcc, 'newquote@ross360.co.uk');
  for (const column of ['sent_html', 'sent_text', 'sent_snapshot', 'sent_subject']) {
    assert.ok(!String(row[column]).includes('INTERNAL-ONLY'), `${column} must not hold internal notes`);
  }
  assert.ok(!('internalNotes' in snapshot));

  const enquiry = await getEnquiry(t.db, t.enquiry);
  assert.equal(enquiry.status, 'quoted');
  const sentEvent = enquiry.events.find((e) => e.type === 'quote_sent');
  assert.deepEqual(sentEvent.detail, { quote: q.reference, totalPence: 44400, to: 'alex@example.test' });
  const status = enquiry.events.find((e) => e.type === 'status');
  assert.deepEqual(status.detail, { from: 'new', to: 'quoted' });

  // A sent quote's preview is the stored email.
  assert.equal((await t.call(`/quotes/${q.reference}/preview.html`)).data.raw, previewHtml);
});

test('sending moves Reviewing to Quoted but leaves later statuses alone', async () => {
  const t = await setUp();
  await changeStatus(t.db, t.enquiry, 'reviewing', 'test');
  let q = await readyDraft(t);
  await withResend(accepted, () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } }));
  assert.equal((await getEnquiry(t.db, t.enquiry)).status, 'quoted');

  await changeStatus(t.db, t.enquiry, 'booked', 'test');
  q = await readyDraft(t);
  await withResend(accepted, () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } }));
  const enquiry = await getEnquiry(t.db, t.enquiry);
  assert.equal(enquiry.status, 'booked');
  assert.equal(enquiry.events.filter((e) => e.type === 'status' && e.detail.to === 'quoted').length, 1);
});

test('if Resend refuses, the quote goes back to the same draft, the failure is logged and a retry uses the same key', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(
    (n) => (n === 1 ? new Response(JSON.stringify({ name: 'validation_error', message: 'bad' }), { status: 422 }) : accepted()),
    async (calls) => {
      const failed = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } });
      assert.equal(failed.status, 502);
      assert.equal(failed.data.quote.status, 'draft');
      assert.equal(failed.data.quote.version, q.version);
      const row = t.db.db.prepare(`SELECT * FROM quotes WHERE reference = ?`).get(q.reference);
      assert.equal(row.sent_html, null);
      assert.equal(row.issued_on, null);
      const failure = (await eventsOf(t)).find((e) => e.type === 'quote_send_failed');
      assert.deepEqual(failure.detail, { quote: q.reference, status: 422 });
      assert.equal((await getEnquiry(t.db, t.enquiry)).status, 'new');

      const retry = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } });
      assert.equal(retry.status, 200);
      assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
    },
  );
});

// --- Ambiguous outcomes, stale previews and safe recovery --------------------------------------

const sendBody = (q, extra = {}) => ({ version: q.version, confirm: true, previewedOn: ukToday(), ...extra });
const row = (t, ref) => t.db.db.prepare(`SELECT * FROM quotes WHERE reference = ?`).get(ref);
const failing = (status, body = { name: 'error', message: 'stub' }) => () => new Response(JSON.stringify(body), { status });

test('ambiguous Resend outcomes lock the quote as send status unknown, keeping the stored email', async () => {
  const ambiguous = [
    ['no response', () => Promise.reject(new TypeError('network down'))],
    ['timeout', () => Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'))],
    ['500', failing(500)],
    ['502', failing(502)],
    ['503', failing(503)],
    ['408', failing(408)],
    ['409 concurrent', failing(409, { name: 'concurrent_idempotent_requests' })],
    ['409 key reused', failing(409, { name: 'invalid_idempotent_request' })],
  ];
  for (const [label, respond] of ambiguous) {
    const t = await setUp();
    const q = await readyDraft(t);
    await withResend(respond, async (calls) => {
      const result = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) });
      assert.equal(result.status, 502, label);
      assert.equal(result.data.unknown, true, label);
      const quote = result.data.quote;
      assert.equal(quote.status, 'send_unknown', label);
      assert.equal(quote.sendStatusUnknown, true, label);
      assert.equal(quote.canCheckSend, true, label);
      assert.equal(
        Date.parse(quote.checkSendUntil) - Date.parse(quote.sendingStartedAt),
        23 * 60 * 60 * 1000,
        `${label}: the check is offered for 23 hours from the send`,
      );
      // The email as it was (perhaps) sent is kept.
      const stored = row(t, q.reference);
      assert.ok(stored.sent_html && stored.sent_snapshot && stored.sent_text, label);
      assert.equal(stored.sent_to, 'alex@example.test', label);
      assert.equal(stored.issued_on, ukToday(), label);

      // Locked: no edit, discard, second send or revision while unknown.
      assert.equal((await t.call(`/quotes/${q.reference}`, { method: 'PATCH', body: { version: q.version, validDays: 3 } })).status, 409, label);
      assert.equal((await t.call(`/quotes/${q.reference}/discard`, { method: 'POST', body: {} })).status, 409, label);
      assert.equal((await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) })).status, 409, label);
      assert.equal((await t.call(`/quotes/${q.reference}/revise`, { method: 'POST', body: {} })).status, 409, label);
      assert.equal(calls.length, 1, `${label}: exactly one request to Resend`);
    });
    const events = await eventsOf(t);
    assert.deepEqual(events.find((e) => e.type === 'quote_send_unknown').detail.quote, q.reference);
    assert.ok(!events.some((e) => e.type === 'quote_send_failed' || e.type === 'quote_sent'), label);
    assert.equal((await getEnquiry(t.db, t.enquiry)).status, 'new', label);
  }
});

test('only a definite refusal returns the quote to draft', async () => {
  for (const status of [400, 401, 403, 422, 429]) {
    const t = await setUp();
    const q = await readyDraft(t);
    await withResend(failing(status), async () => {
      const result = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) });
      assert.equal(result.status, 502);
      assert.equal(result.data.quote.status, 'draft', `status ${status}`);
      assert.equal(row(t, q.reference).sent_html, null);
    });
  }
});

test('the server refuses to send a version that was not previewed, atomically', async () => {
  const t = await setUp();
  const q = await readyDraft(t); // previewed at this version
  // Changed after the preview: the new version has not been previewed.
  const saved = await t.call(`/quotes/${q.reference}`, { method: 'PATCH', body: { version: q.version, travelPence: 0 } });
  const v = saved.data.quote.version;
  await withResend(accepted, async (calls) => {
    const stale = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) });
    assert.equal(stale.status, 409, 'the previewed (old) version is no longer current');
    const unpreviewed = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody({ version: v }) });
    assert.equal(unpreviewed.status, 409);
    assert.match(unpreviewed.data.message, /Preview this version/);
    assert.equal(calls.length, 0);

    // The claim itself re-checks previewed_version: if it changes after the pre-checks pass but
    // before the claim runs, nothing is sent.
    await t.call(`/quotes/${q.reference}/preview`);
    const prepare = t.db.prepare.bind(t.db);
    t.db.prepare = (sql) => {
      if (sql.includes("SET status = 'sending'")) {
        t.db.db.prepare(`UPDATE quotes SET previewed_version = NULL WHERE reference = ?`).run(q.reference);
      }
      return prepare(sql);
    };
    const raced = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody({ version: v }) });
    t.db.prepare = prepare;
    assert.equal(raced.status, 409);
    assert.equal(calls.length, 0);
    assert.equal(row(t, q.reference).status, 'draft');

    // Previewed: now it sends.
    await t.call(`/quotes/${q.reference}/preview`);
    assert.equal((await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody({ version: v }) })).status, 200);
    assert.equal(calls.length, 1);
  });
});

test('a preview from another day must be refreshed before sending', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(accepted, async (calls) => {
    const old = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q, { previewedOn: addDays(ukToday(), -1) }) });
    assert.equal(old.status, 409);
    assert.match(old.data.message, /different day/);
    const missing = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true } });
    assert.equal(missing.status, 400);
    assert.equal(calls.length, 0);
  });
  // The preview says which day it was rendered for.
  assert.equal((await t.call(`/quotes/${q.reference}/preview`)).data.issuedOn, ukToday());
});

test('checking an unknown send repeats the exact stored request under the same key, and confirms it as sent', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(
    (n) => (n === 1 ? Promise.reject(new TypeError('network down')) : accepted()),
    async (calls) => {
      await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) });
      const before = row(t, q.reference);
      const checked = await t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } });
      assert.equal(checked.status, 200, JSON.stringify(checked.data));
      assert.equal(checked.data.quote.status, 'sent');
      assert.equal(checked.data.quote.resendMessageId, 'resend-message-1');
      assert.equal(calls.length, 2);
      assert.equal(calls[1].headers['Idempotency-Key'], calls[0].headers['Idempotency-Key']);
      assert.deepEqual(calls[1].body, calls[0].body, 'byte-identical request, so Resend cannot send twice');

      // The sent snapshot is exactly what was stored when sending started.
      const after = row(t, q.reference);
      for (const column of ['sent_html', 'sent_text', 'sent_subject', 'sent_snapshot', 'sent_to', 'issued_on', 'valid_until']) {
        assert.equal(after[column], before[column], column);
      }
    },
  );
  const enquiry = await getEnquiry(t.db, t.enquiry);
  assert.equal(enquiry.status, 'quoted');
  const types = enquiry.events.map((e) => e.type);
  assert.ok(types.includes('quote_send_unknown'));
  assert.equal(types.filter((e) => e === 'quote_sent').length, 1);
  assert.equal(enquiry.events.find((e) => e.type === 'quote_sent').detail.confirmedByCheck, true);
});

test('a check that cannot confirm delivery leaves the quote locked, whatever Resend answers', async () => {
  for (const respond of [failing(422), failing(401), failing(500), failing(409, { name: 'concurrent_idempotent_requests' }), () => Promise.reject(new TypeError('down'))]) {
    const t = await setUp();
    const q = await readyDraft(t);
    await withResend(failing(503), () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) }));
    await withResend(respond, async () => {
      const checked = await t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } });
      assert.equal(checked.status, 502);
      assert.equal(checked.data.quote.status, 'send_unknown');
    });
    assert.ok((await eventsOf(t)).some((e) => e.type === 'quote_send_check'));
  }
});

test('two checks at once record the send once', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(failing(500), () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) }));
  await withResend(accepted, async () => {
    const results = await Promise.all(
      [1, 2, 3].map(() => t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } })),
    );
    assert.ok(results.some((r) => r.status === 200));
  });
  const events = await eventsOf(t);
  assert.equal(events.filter((e) => e.type === 'quote_sent').length, 1);
  assert.equal(events.filter((e) => e.type === 'status' && e.detail.to === 'quoted').length, 1);
});

test('a quote stuck in sending can be checked after 10 minutes; outside the 24-hour window it stays locked', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  // A send that stopped after claiming (for example, the worker was stopped mid-request).
  await withResend(accepted, async () => {
    t.db.db.prepare(`UPDATE quotes SET status = 'sending', sending_started_at = ?, sent_to = 'alex@example.test', sent_subject = 's', sent_html = 'h', sent_text = 't', sent_snapshot = '{}' WHERE reference = ?`)
      .run(new Date().toISOString(), q.reference);
    // Too early: it may still be in progress.
    assert.equal((await t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } })).status, 409);
    t.db.db.prepare(`UPDATE quotes SET sending_started_at = ? WHERE reference = ?`).run(new Date(Date.now() - 11 * 60 * 1000).toISOString(), q.reference);
    const checked = await t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } });
    assert.equal(checked.data.quote.status, 'sent');
  });

  const u = await setUp();
  const r = await readyDraft(u);
  await withResend(failing(500), () => u.call(`/quotes/${r.reference}/send`, { method: 'POST', body: sendBody(r) }));
  u.db.db.prepare(`UPDATE quotes SET sending_started_at = ? WHERE reference = ?`).run(new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(), r.reference);
  await withResend(accepted, async (calls) => {
    const late = await u.call(`/quotes/${r.reference}/check-send`, { method: 'POST', body: { confirm: true } });
    assert.equal(late.status, 409);
    assert.match(late.data.message, /no longer be checked automatically/);
    assert.equal(late.data.quote.status, 'send_unknown');
    assert.equal(late.data.quote.canCheckSend, false);
    assert.equal(calls.length, 0, 'never resent once the idempotency window may have passed');
  });
});

test('only an unknown send can be checked, and the check needs confirmation', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(accepted, async (calls) => {
    assert.equal((await t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } })).status, 409);
    await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: sendBody(q) });
    assert.equal((await t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } })).status, 409);
    assert.equal((await t.call(`/quotes/${q.reference}/check-send`, { method: 'POST', body: {} })).status, 400);
    assert.equal(calls.length, 1);
  });
  assert.equal((await callAdmin(t.env, `/api/admin/quotes/${q.reference}/check-send`, { method: 'POST', body: { confirm: true } })).status, 401);
});

test('two sends at once deliver exactly one email', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(accepted, async (calls) => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } })),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409, 409]);
    assert.equal(calls.length, 1);
  });
  assert.equal((await eventsOf(t)).filter((e) => e.type === 'quote_sent').length, 1);
});

test('a second send, a stale version or a missing confirmation sends nothing', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(accepted, async (calls) => {
    assert.equal((await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version } })).status, 400);
    assert.equal((await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: 'yes' } })).status, 400);
    assert.equal((await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version - 1, confirm: true, previewedOn: ukToday() } })).status, 409);
    assert.equal(calls.length, 0);
    assert.equal((await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } })).status, 200);
    assert.equal((await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } })).status, 409);
    assert.equal(calls.length, 1);
  });
});

test('a quote stuck in sending shows its status as unknown and is never sent again automatically', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  const longAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  t.db.db.prepare(`UPDATE quotes SET status = 'sending', sending_started_at = ? WHERE reference = ?`).run(longAgo, q.reference);
  const read = await t.call(`/quotes/${q.reference}`);
  assert.equal(read.data.quote.sendStatusUnknown, true);
  await withResend(accepted, async (calls) => {
    const result = await t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } });
    assert.equal(result.status, 409);
    assert.equal(calls.length, 0);
  });
  // A recent one is just "sending".
  t.db.db.prepare(`UPDATE quotes SET sending_started_at = ? WHERE reference = ?`).run(new Date().toISOString(), q.reference);
  assert.equal((await t.call(`/quotes/${q.reference}`)).data.quote.sendStatusUnknown, false);
});

test('an incomplete draft is not sent, and nothing is sent without Resend configured', async () => {
  const t = await setUp();
  await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  await withResend(accepted, async (calls) => {
    await t.call('/quotes/Q-0001/preview');
    const empty = await t.call('/quotes/Q-0001/send', { method: 'POST', body: { version: 1, confirm: true, previewedOn: ukToday() } });
    assert.equal(empty.status, 422);
    assert.ok(empty.data.problems.some((p) => /line/.test(p)));
    assert.equal(calls.length, 0);
  });

  const u = await setUp({ resend: false });
  const q = await readyDraft(u);
  const result = await u.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } });
  assert.equal(result.status, 503);
  assert.equal((await getQuote(u.db, q.reference)).status, 'draft');
});

// --- Sent quotes are immutable; revisions ----------------------------------------------------

test('a sent quote cannot be changed, through the API or directly in the database', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(accepted, () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } }));
  assert.equal((await t.call(`/quotes/${q.reference}`, { method: 'PATCH', body: { version: q.version, validDays: 3 } })).status, 409);
  assert.equal((await t.call(`/quotes/${q.reference}/discard`, { method: 'POST', body: {} })).status, 409);

  const id = t.db.db.prepare(`SELECT id FROM quotes WHERE reference = ?`).get(q.reference).id;
  assert.throws(() => t.db.db.prepare(`UPDATE quotes SET sent_html = 'x' WHERE id = ?`).run(id), /cannot be changed/);
  assert.throws(() => t.db.db.prepare(`UPDATE quotes SET total_pence = 1 WHERE id = ?`).run(id), /cannot be changed/);
  assert.throws(() => t.db.db.prepare(`UPDATE quotes SET status = 'draft' WHERE id = ?`).run(id), /cannot be changed/);
  assert.throws(() => t.db.db.prepare(`UPDATE quote_items SET unit_pence = 1 WHERE quote_id = ?`).run(id), /Only a draft/);
  assert.throws(
    () => t.db.db.prepare(`INSERT INTO quote_items (quote_id, position, kind, description, quantity, unit_pence, amount_pence) VALUES (?, 9, 'custom', 'x', 1, 1, 1)`).run(id),
    /Only a draft/,
  );
  assert.equal((await getQuote(t.db, q.reference)).totalPence, 44400);
});

test('revising a sent quote makes a linked draft with a new reference; sending it supersedes the original', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await withResend(accepted, () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } }));

  assert.equal((await t.call(`/quotes/${q.reference}/revise`, { method: 'POST', body: {} })).status, 201);
  const revision = await getQuote(t.db, 'Q-0002');
  assert.equal(revision.status, 'draft');
  assert.equal(revision.revisionOf, q.reference);
  assert.equal(revision.version, 1);
  assert.equal(revision.totalPence, 44400);
  assert.equal(revision.internalNotes, NOTE);
  assert.deepEqual(revision.items.map((i) => i.description), q.items.map((i) => i.description));
  assert.equal(revision.issuedOn, null);

  // Only one open revision at a time, and drafts cannot be revised.
  const again = await t.call(`/quotes/${q.reference}/revise`, { method: 'POST', body: {} });
  assert.equal(again.status, 409);
  assert.equal(again.data.revision, 'Q-0002');
  assert.equal((await t.call('/quotes/Q-0002/revise', { method: 'POST', body: {} })).status, 409);

  // The original is still the live quote until the revision is sent.
  assert.equal((await getQuote(t.db, q.reference)).status, 'sent');
  const saved = await t.call('/quotes/Q-0002', { method: 'PATCH', body: { version: 1, travelPence: 0 } });
  assert.equal(saved.data.quote.totalPence, 41900);
  await t.call('/quotes/Q-0002/preview');
  await withResend(accepted, () => t.call('/quotes/Q-0002/send', { method: 'POST', body: { version: 2, confirm: true, previewedOn: ukToday() } }));
  const original = await getQuote(t.db, q.reference);
  assert.equal(original.status, 'superseded');
  assert.deepEqual(original.revisions, [{ reference: 'Q-0002', status: 'sent' }]);
  // The original's sent record is untouched.
  const row = t.db.db.prepare(`SELECT sent_snapshot FROM quotes WHERE reference = ?`).get(q.reference);
  assert.equal(JSON.parse(row.sent_snapshot).totalPence, 44400);

  const events = await eventsOf(t);
  assert.deepEqual(events.find((e) => e.type === 'quote_revised').detail, { from: q.reference, to: 'Q-0002' });
  assert.equal(events.find((e) => e.type === 'quote_sent' && e.detail.quote === 'Q-0002').detail.supersedes, q.reference);
});

// --- Timeline ---------------------------------------------------------------------------------

test('every quote action is on the enquiry timeline, without email bodies, notes or secrets', async () => {
  const t = await setUp();
  const q = await readyDraft(t);
  await t.call(`/quotes/${q.reference}/preview`);
  await withResend(accepted, () => t.call(`/quotes/${q.reference}/send`, { method: 'POST', body: { version: q.version, confirm: true, previewedOn: ukToday() } }));
  await t.call(`/quotes/${q.reference}/revise`, { method: 'POST', body: {} });
  await t.call('/quotes/Q-0002/discard', { method: 'POST', body: {} });
  const events = await eventsOf(t);
  const types = events.map((e) => e.type);
  for (const type of ['quote_created', 'quote_updated', 'quote_previewed', 'quote_sent', 'quote_revised', 'quote_discarded']) {
    assert.ok(types.includes(type), `missing ${type}`);
  }
  const details = JSON.stringify(events.map((e) => e.detail));
  assert.ok(!details.includes('<'), 'no HTML in the timeline');
  assert.ok(!details.includes('Thanks for the opportunity'));
  assert.ok(!details.includes('INTERNAL-ONLY'));
  assert.ok(!details.includes('test-key-not-real'));
});

test('the render function never reads internal notes or the travel working', () => {
  const quote = new Proxy(
    {
      reference: 'Q-0001',
      validDays: 14,
      customerName: 'A',
      customerBusiness: '',
      customerEmail: 'a@example.test',
      customerLocation: '',
      serviceDescription: '',
      package: null,
      items: [{ kind: 'custom', description: 'x', quantity: 1, unitPence: 100, amountPence: 100 }],
      subtotalPence: 100,
      travelPence: 0,
      discountPence: 0,
      discountLabel: '',
      totalPence: 100,
    },
    {
      get(target, key) {
        if (key === 'internalNotes') throw new Error('internal notes were read');
        // Only the final travel amount reaches the customer, never how it was worked out.
        if (typeof key === 'string' && key.startsWith('travel') && key !== 'travelPence') throw new Error(`${key} was read`);
        return target[key];
      },
    },
  );
  const out = renderQuote(quote, { enquiryReference: 'ROSS-0001', issuedOn: '2026-10-05' });
  assert.ok(out.html.includes('Valid until 19 October 2026 (14 days)'));
  assert.equal(quoteEmail.vat, 'VAT is not charged.');
});
