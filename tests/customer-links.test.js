// Phase C customer links: signing and checking tokens, every quote state, the page drawn from the
// sent snapshot, key rotation and compromise, revocation, views, and the email carrying the link.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callAdmin } from './helpers/d1.js';
import { NOTE, OVERRIDE_REASON, callPage, previewedDraft, sentQuote, setSentDates, setUp, withResend } from './helpers/phasec.js';
import { getEnquiry } from '../server/admin/enquiries.js';
import { tokenFor, verifyToken, newLinkId, checkFormNonce, formNonce, FORM_NONCE_MS } from '../server/admin/quoteLinks.js';
import { renderQuotePage } from '../server/customer/render.js';
import { addDays, ukToday, longDate } from '../src/lib/admin/quotes.js';
import { formatMoney } from '../src/lib/admin/model.js';

const KEY2 = { QUOTE_LINK_SECRET: 'second-test-only-secret-abcdefghijklmnop', QUOTE_LINK_KEY_ID: 'k2' };

// --- Tokens -------------------------------------------------------------------------------------

test('a token is the key id, a 128-bit link id and an HMAC signature, and only that exact token verifies', async () => {
  const t = await setUp();
  const linkId = newLinkId();
  const token = await tokenFor(t.env, 'k1', linkId);
  assert.match(token, /^k1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(await verifyToken(t.env, token), { keyId: 'k1', linkId });

  const [keyId, id, signature] = token.split('.');
  const flip = (s, i) => s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1);
  for (const bad of [
    `${keyId}.${flip(id, 3)}.${signature}`, // another link id, same signature
    `${keyId}.${id}.${flip(signature, 5)}`, // altered signature
    `k2.${id}.${signature}`, // unknown key id
    `${keyId}.${id}`, // malformed
    `${token}.x`,
    '',
    'k1..',
    'x'.repeat(200),
  ]) {
    assert.equal(await verifyToken(t.env, bad), null, bad);
  }
  // The same link id signed with a different secret does not verify.
  const forged = await tokenFor({ ...t.env, QUOTE_LINK_SECRET: 'another-secret-entirely-0123456789abcdef' }, 'k1', linkId);
  assert.equal(await verifyToken(t.env, forged), null);
});

test('signatures are checked with crypto.subtle.verify, which compares in constant time', async () => {
  const t = await setUp();
  const token = await tokenFor(t.env, 'k1', newLinkId());
  const original = crypto.subtle.verify;
  let calls = 0;
  crypto.subtle.verify = function (...args) {
    calls += 1;
    return original.apply(this, args);
  };
  try {
    await verifyToken(t.env, token);
    await verifyToken(t.env, `${token.slice(0, -1)}A`);
  } finally {
    crypto.subtle.verify = original;
  }
  assert.equal(calls, 2);
});

test('forged, unknown, revoked, malformed and wrong-key links all get the same answer', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  const answers = [];
  const unknown = await tokenFor(t.env, 'k1', newLinkId()); // correctly signed, never issued
  for (const path of [`/q/${unknown}`, `/q/${token.slice(0, -2)}AA`, '/q/nonsense', `/q/k9.${token.split('.')[1]}.${token.split('.')[2]}`]) {
    answers.push(await callPage(t.env, path));
  }
  await t.call(`/quotes/${reference}/link/revoke`, { method: 'POST', body: { confirm: true } });
  answers.push(await callPage(t.env, `/q/${token}`));
  for (const answer of answers) {
    assert.equal(answer.status, 404);
    assert.equal(answer.html, answers[0].html);
    assert.ok(answer.html.includes('This link is no longer available.'));
    assert.ok(!answer.html.includes(reference));
  }
});

// --- The page ----------------------------------------------------------------------------------

test('the emailed link opens the quotation exactly as sent, with Choose a date, and nothing internal', async () => {
  const t = await setUp();
  const { token, email, reference } = await sentQuote(t);
  const page = await callPage(t.env, `/q/${token}`);
  assert.equal(page.status, 200);
  const { html } = page;
  assert.ok(html.includes(`Quotation ${reference}`));
  assert.ok(html.includes('Choose a date'));
  assert.ok(html.includes(`href="/q/${token}/date"`));
  // Every amount on the page is in the email that was sent.
  const amounts = [...html.matchAll(/£[\d,]+\.\d\d/g)].map((m) => m[0]);
  assert.ok(amounts.length >= 5);
  for (const amount of amounts) assert.ok(email.text.includes(amount), amount);
  for (const amount of ['£349.00', '£100.00', '£449.00', '£20.00', '£439.00']) assert.ok(html.includes(amount), amount);
  assert.ok(html.includes('Travel'));
  assert.ok(html.includes('VAT is not charged.'));
  assert.ok(html.includes(`Valid until ${longDate(addDays(ukToday(), 14))} (14 days)`));
  assert.ok(html.includes('https://ross360.co.uk/terms'));
  // Internal-only fields never reach the customer.
  for (const secret of [NOTE, OVERRIDE_REASON, '23.6', 'mileage', 'INTERNAL', 'PRIVATE']) {
    assert.ok(!html.includes(secret), secret);
  }
  // No scripts, never cached or indexed, cannot be framed.
  assert.ok(!/<script/i.test(html));
  assert.equal(page.headers.get('Cache-Control'), 'no-store');
  assert.match(page.headers.get('X-Robots-Tag'), /noindex/);
  assert.equal(page.headers.get('Referrer-Policy'), 'same-origin');
  assert.equal(page.headers.get('X-Frame-Options'), 'DENY');
  const csp = page.headers.get('Content-Security-Policy');
  for (const part of ["default-src 'none'", "form-action 'self'", "frame-ancestors 'none'", "base-uri 'none'"]) assert.ok(csp.includes(part), part);
  assert.ok(!csp.includes('script-src'));
  // The wording never claims a booking.
  assert.ok(!/booking confirmed|booked for|is confirmed/i.test(html));
});

test('the page is drawn only from the sent snapshot, never from the quote as it stands', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  // Change the live columns behind the snapshot (only possible with the triggers removed).
  t.db.db.exec('DROP TRIGGER quotes_sent_content_locked');
  t.db.db.exec(`UPDATE quotes SET total_pence = 99999, internal_notes = 'CHANGED-LIVE', customer_name = 'Live Name' WHERE reference = '${reference}'`);
  const { html } = await callPage(t.env, `/q/${token}`);
  assert.ok(html.includes('£439.00'));
  assert.ok(!html.includes('£999.99'));
  assert.ok(!html.includes('CHANGED-LIVE'));
  assert.ok(!html.includes('Live Name'));

  // The renderer reads only customer fields: reading anything else throws.
  const row = t.db.db.prepare(`SELECT sent_snapshot FROM quotes WHERE reference = ?`).get(reference);
  const snapshot = JSON.parse(row.sent_snapshot);
  const allowed = new Set([...Object.keys(snapshot)]);
  const guarded = new Proxy(snapshot, {
    get(target, key) {
      if (typeof key === 'string' && !allowed.has(key)) throw new Error(`read ${key}`);
      return target[key];
    },
  });
  for (const forbidden of ['internalNotes', 'travelOverrideReason', 'travelOneWayTenths', 'travelMode']) {
    assert.ok(!allowed.has(forbidden), forbidden);
  }
  assert.doesNotThrow(() => renderQuotePage({ snapshot: guarded, state: 'valid', pending: null, datesUrl: '/q/x/date' }));
});

test('every quote state gets the right page', async () => {
  const t = await setUp();
  const { quote: draft } = await previewedDraft(t);
  const link = t.db.db.prepare(`SELECT key_id, link_id FROM quote_links WHERE quote_id = (SELECT id FROM quotes WHERE reference = ?)`).get(draft.reference);
  const draftToken = await tokenFor(t.env, link.key_id, link.link_id);
  const page = (token) => callPage(t.env, `/q/${token}`);

  // A draft (or one being sent, unknown or discarded) is not shown, even with a correct link.
  for (const status of ['draft', 'sending', 'send_unknown', 'discarded']) {
    t.db.db.prepare(`UPDATE quotes SET status = ? WHERE reference = ?`).run(status, draft.reference);
    const answer = await page(draftToken);
    assert.equal(answer.status, 200, status);
    assert.ok(answer.html.includes("This quotation isn&#39;t available online."), status);
    assert.ok(!answer.html.includes(draft.reference), status);
  }

  // Superseded by a sent revision: replaced, with no link to the new one.
  const t2 = await setUp();
  const first = await sentQuote(t2);
  const revised = await t2.call(`/quotes/${first.reference}/revise`, { method: 'POST', body: {} });
  const rev = revised.data.quote;
  await t2.call(`/quotes/${rev.reference}/preview`);
  await withResend(() =>
    t2.call(`/quotes/${rev.reference}/send`, { method: 'POST', body: { version: rev.version, previewedOn: ukToday(), confirm: true } }),
  );
  const replaced = await callPage(t2.env, `/q/${first.token}`);
  assert.ok(replaced.html.includes('This quotation has been replaced by a newer one.'));
  assert.ok(!replaced.html.includes(rev.reference));
  assert.ok(!replaced.html.includes('/q/k1.'));
  const replacedDates = await callPage(t2.env, `/q/${first.token}/date`);
  assert.ok(replacedDates.html.includes('replaced'));
});

test('expiry: valid through "valid until", then viewable for 90 days without dates, then gone', async () => {
  const today = ukToday();
  const cases = [
    [today, 'valid'],
    [addDays(today, -1), 'expired'],
    [addDays(today, -90), 'expired'],
    [addDays(today, -91), 'gone'],
  ];
  for (const [validUntil, expected] of cases) {
    const t = await setUp();
    const { token, reference } = await sentQuote(t);
    setSentDates(t.db, reference, { issuedOn: addDays(validUntil, -14), validUntil });
    const page = await callPage(t.env, `/q/${token}`);
    const dates = await callPage(t.env, `/q/${token}/date`);
    if (expected === 'valid') {
      assert.equal(page.status, 200);
      assert.ok(page.html.includes('Choose a date'));
      assert.equal(dates.status, 200);
    } else if (expected === 'expired') {
      assert.equal(page.status, 200, validUntil);
      assert.ok(page.html.includes(`This quotation expired on ${longDate(validUntil)}.`));
      assert.ok(!page.html.includes(`/q/${token}/date`));
      assert.equal(dates.status, 303);
      assert.equal(dates.location, `https://ross360.test/q/${token}`);
      const post = await callPage(t.env, `/q/${token}/date`, { method: 'POST', form: { slot: '1', nonce: 'x' } });
      assert.equal(post.status, 303);
    } else {
      assert.equal(page.status, 404, validUntil);
      assert.ok(page.html.includes('This link is no longer available.'));
    }
  }
});

// --- Configuration, rotation and revocation ------------------------------------------------------

test('without QUOTE_LINK_SECRET the page is unavailable and sending is refused; the preview carries no link', async () => {
  const t = await setUp();
  const { token } = await sentQuote(t);
  for (const missing of [{ QUOTE_LINK_SECRET: undefined }, { QUOTE_LINK_KEY_ID: undefined }, { QUOTE_LINK_SECRET: 'too-short' }]) {
    const env = { ...t.env, ...missing };
    const page = await callPage(env, `/q/${token}`);
    assert.ok(page.html.includes("This quotation isn&#39;t available online."));
  }
  const unset = { ...t.env, QUOTE_LINK_SECRET: undefined };
  const call = (path, options = {}) => callAdmin(unset, `/api/admin${path}`, { cookie: t.cookie, ...options });
  const created = await call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const ref = created.data.quote.reference;
  await call(`/quotes/${ref}`, { method: 'PATCH', body: { version: 1, items: [{ kind: 'custom', description: 'Tour', quantity: 1, unitPence: 30000 }] } });
  const preview = await call(`/quotes/${ref}/preview`);
  assert.ok(!preview.data.email.text.includes('/q/'));
  const q = preview.data.quote;
  await withResend(async (calls) => {
    const sent = await call(`/quotes/${ref}/send`, { method: 'POST', body: { version: q.version, previewedOn: ukToday(), confirm: true } });
    assert.equal(sent.status, 503);
    assert.match(sent.data.message, /QUOTE_LINK_SECRET/);
    assert.equal(calls.length, 0);
  });
});

test('routine rotation: links on the previous key keep working until it is removed, and the Admin lists them first', async () => {
  const t = await setUp();
  const old = await sentQuote(t);
  // Rotate: k1 becomes the previous key, k2 the current one.
  t.env.QUOTE_LINK_SECRET_PREVIOUS = t.env.QUOTE_LINK_SECRET;
  t.env.QUOTE_LINK_KEY_ID_PREVIOUS = 'k1';
  Object.assign(t.env, KEY2);
  assert.equal((await callPage(t.env, `/q/${old.token}`)).status, 200);
  const fresh = await sentQuote(t);
  assert.match(fresh.token, /^k2\./);

  const report = await t.call('/links');
  assert.deepEqual(report.data.counts, { k1: 1, k2: 1 });
  assert.deepEqual(
    report.data.affected.map((a) => [a.reference, a.keyId, a.state]),
    [[old.reference, 'k1', 'previous']],
  );
  const info = await t.call(`/quotes/${old.reference}/customer`);
  assert.equal(info.data.customer.link.url, old.url);
  assert.equal(info.data.customer.link.keyAvailable, true);

  // Removing the previous key stops its links; the Admin still lists the quote, now unavailable.
  delete t.env.QUOTE_LINK_SECRET_PREVIOUS;
  delete t.env.QUOTE_LINK_KEY_ID_PREVIOUS;
  assert.equal((await callPage(t.env, `/q/${old.token}`)).status, 404);
  assert.equal((await callPage(t.env, `/q/${fresh.token}`)).status, 200);
  const after = await t.call('/links');
  assert.deepEqual(after.data.affected.map((a) => [a.reference, a.state]), [[old.reference, 'unavailable']]);
  const gone = await t.call(`/quotes/${old.reference}/customer`);
  assert.equal(gone.data.customer.link.url, null);
  assert.equal(gone.data.customer.link.keyAvailable, false);
});

test('a compromised key: its links stop, and Create new link issues a working replacement to copy', async () => {
  const t = await setUp();
  const old = await sentQuote(t);
  Object.assign(t.env, KEY2); // k1 dropped entirely, not kept as previous
  assert.equal((await callPage(t.env, `/q/${old.token}`)).status, 404);

  const created = await withResend(async (calls) => {
    const result = await t.call(`/quotes/${old.reference}/link/new`, { method: 'POST', body: { confirm: true } });
    assert.equal(calls.length, 0, 'no email is sent');
    return result;
  });
  assert.equal(created.status, 200);
  const url = created.data.customer.link.url;
  assert.match(url, /^https:\/\/ross360\.test\/q\/k2\./);
  assert.equal((await callPage(t.env, new URL(url).pathname)).status, 200);
  assert.equal((await callPage(t.env, `/q/${old.token}`)).status, 404);
  assert.equal(created.data.customer.revokedLinks.length, 1);
  assert.deepEqual((await t.call('/links')).data.affected, []);

  // Create new link needs confirmation and a sent quote.
  assert.equal((await t.call(`/quotes/${old.reference}/link/new`, { method: 'POST', body: {} })).status, 400);
});

test('one link: Disable link stops it, and Create new link replaces it; the old one stays dead', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  const revoked = await t.call(`/quotes/${reference}/link/revoke`, { method: 'POST', body: { confirm: true } });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.data.customer.link, null);
  assert.equal((await callPage(t.env, `/q/${token}`)).status, 404);
  assert.equal((await t.call(`/quotes/${reference}/link/revoke`, { method: 'POST', body: { confirm: true } })).status, 409);

  const created = await t.call(`/quotes/${reference}/link/new`, { method: 'POST', body: { confirm: true } });
  const url = created.data.customer.link.url;
  assert.notEqual(new URL(url).pathname, `/q/${token}`);
  assert.equal((await callPage(t.env, new URL(url).pathname)).status, 200);
  assert.equal((await callPage(t.env, `/q/${token}`)).status, 404);
});

test('a quote sent before Phase C has no link; Create customer link issues one, without emailing', async () => {
  const t = await setUp();
  const { reference } = await sentQuote(t);
  t.db.db.exec(`DELETE FROM quote_links`); // as for a quote sent by the Phase B code
  const info = await t.call(`/quotes/${reference}/customer`);
  assert.equal(info.data.customer.link, null);
  const created = await withResend(async (calls) => {
    const result = await t.call(`/quotes/${reference}/link/new`, { method: 'POST', body: { confirm: true } });
    assert.equal(calls.length, 0);
    return result;
  });
  assert.equal((await callPage(t.env, new URL(created.data.customer.link.url).pathname)).status, 200);
});

test('a draft cannot be given a new link by hand; its link comes from the preview', async () => {
  const t = await setUp();
  const { quote } = await previewedDraft(t);
  assert.equal((await t.call(`/quotes/${quote.reference}/link/new`, { method: 'POST', body: { confirm: true } })).status, 409);
  // Previewing again keeps the same link, so the preview and the email agree.
  const first = await t.call(`/quotes/${quote.reference}/preview`);
  const second = await t.call(`/quotes/${quote.reference}/preview`);
  assert.equal(first.data.email.text, second.data.email.text);
  const links = t.db.db.prepare(`SELECT COUNT(*) AS n FROM quote_links`).get().n;
  assert.equal(links, 1);
});

// --- Email -----------------------------------------------------------------------------------------

test('the email sent carries the link line, the approved next steps and the same link as the preview', async () => {
  const t = await setUp();
  const { quote, preview } = await previewedDraft(t);
  const frame = await t.call(`/quotes/${quote.reference}/preview.html`);
  await withResend(async (calls) => {
    await t.call(`/quotes/${quote.reference}/send`, { method: 'POST', body: { version: quote.version, previewedOn: ukToday(), confirm: true } });
    const sent = calls[0].body;
    assert.equal(sent.text, preview.email.text);
    assert.equal(sent.html, frame.data.raw);
    for (const content of [sent.text, sent.html]) {
      assert.ok(content.includes('View your quotation and choose a preferred date online.'));
      assert.ok(
        content.includes(
          'To go ahead, choose a preferred date online or reply to this email. Nothing is booked until ROSS 360 confirms the date with you.',
        ),
      );
      assert.ok(content.includes('Thanks for the opportunity to provide a quotation for your 360° virtual tour project.'));
      assert.ok(content.includes('We look forward to working with you.'));
    }
    const url = sent.text.match(/https:\/\/ross360\.test\/q\/\S+/)[0];
    assert.ok(sent.html.includes(`href="${url}"`));
  });
});

test('a send whose link was removed after the preview is refused until it is previewed again', async () => {
  const t = await setUp();
  const { quote } = await previewedDraft(t);
  t.db.db.exec(`DELETE FROM quote_links`);
  await withResend(async (calls) => {
    const refused = await t.call(`/quotes/${quote.reference}/send`, { method: 'POST', body: { version: quote.version, previewedOn: ukToday(), confirm: true } });
    assert.equal(refused.status, 409);
    assert.equal(calls.length, 0);
  });
});

// --- Views, timeline and the form nonce --------------------------------------------------------------

test('views are counted; the timeline records the first view, then at most one a day, without tokens or IPs', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  await callPage(t.env, `/q/${token}`);
  await callPage(t.env, `/q/${token}`);
  await callPage(t.env, `/q/${token}/date`); // the date list is not counted as a view
  const info = await t.call(`/quotes/${reference}/customer`);
  assert.equal(info.data.customer.link.viewCount, 2);
  assert.ok(info.data.customer.link.firstViewedAt);
  const events = (await getEnquiry(t.db, t.enquiry)).events;
  const viewed = events.filter((e) => e.type === 'quote_viewed');
  assert.equal(viewed.length, 1);
  const timeline = JSON.stringify(events);
  assert.ok(!timeline.includes(token));
  assert.ok(!timeline.includes(token.split('.')[1]));
  assert.ok(!timeline.includes(NOTE));
  assert.ok(!timeline.includes(OVERRIDE_REASON));
  assert.ok(events.some((e) => e.type === 'quote_link_created'));
});

test('the form nonce is tied to its link and expires', async () => {
  const t = await setUp();
  const linkId = newLinkId();
  const nonce = await formNonce(t.env, linkId);
  assert.equal(await checkFormNonce(t.env, linkId, nonce), true);
  assert.equal(await checkFormNonce(t.env, newLinkId(), nonce), false);
  assert.equal(await checkFormNonce(t.env, linkId, `${nonce}x`), false);
  assert.equal(await checkFormNonce(t.env, linkId, nonce, Date.now() + FORM_NONCE_MS + 1000), false);
  assert.equal(await checkFormNonce(t.env, linkId, 'garbage'), false);
});

// --- Admin routes ---------------------------------------------------------------------------------

test('every Phase C Admin route refuses requests without a session or from another site', async () => {
  const t = await setUp();
  const { reference } = await sentQuote(t);
  const routes = [
    ['GET', '/links'],
    ['GET', '/availability'],
    ['POST', '/availability'],
    ['PATCH', '/availability/1'],
    ['POST', '/availability/1/close'],
    ['POST', '/availability/1/reopen'],
    ['POST', '/date-requests/1/close'],
    ['GET', `/quotes/${reference}/customer`],
    ['POST', `/quotes/${reference}/link/new`],
    ['POST', `/quotes/${reference}/link/revoke`],
  ];
  for (const [method, path] of routes) {
    const body = method === 'GET' ? undefined : { confirm: true };
    const anonymous = await callAdmin(t.env, `/api/admin${path}`, { method, body });
    assert.equal(anonymous.status, 401, `${method} ${path}`);
    assert.ok(!JSON.stringify(anonymous.data).includes('/q/'), `${method} ${path}`);
    if (method !== 'GET') {
      const { onRequest } = await import('../functions/api/admin/[[route]].js');
      const request = new Request(`https://ross360.test/api/admin${path}`, {
        method,
        headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json', Cookie: t.cookie },
        body: JSON.stringify(body),
      });
      const response = await onRequest({ request, env: t.env, params: { route: path.split('/').filter(Boolean) } });
      assert.equal(response.status, 403, `${method} ${path}`);
    }
  }
});

test('the customer page refuses other methods and unknown paths', async () => {
  const t = await setUp();
  const { token } = await sentQuote(t);
  assert.equal((await callPage(t.env, `/q/${token}`, { method: 'PUT' })).status, 405);
  assert.equal((await callPage(t.env, `/q/${token}`, { method: 'POST', form: {} })).status, 405);
  assert.equal((await callPage(t.env, `/q/${token}/other`)).status, 404);
  assert.equal((await callPage(t.env, `/q/${token}/date/x`)).status, 404);
  assert.equal((await callPage(t.env, '/q')).status, 404);
});

test('money on the page matches the formatted snapshot amounts', async () => {
  const t = await setUp();
  const { token, quote } = await sentQuote(t);
  const { html } = await callPage(t.env, `/q/${token}`);
  assert.ok(html.includes(formatMoney(quote.totalPence)));
});
