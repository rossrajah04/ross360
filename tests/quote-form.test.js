// The public quote form: it still emails the enquiry, and now also stores it with its reference.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1 } from './helpers/d1.js';
import { onRequestPost } from '../functions/api/quote.js';
import { getEnquiry, listEnquiries } from '../server/admin/enquiries.js';
import { TEST_TURNSTILE_SECRET, TEST_TURNSTILE_TOKEN, withTurnstile } from './helpers/turnstile.js';

const FORM = {
  name: 'Alex Customer',
  business: 'Test Café',
  email: 'alex@example.test',
  phone: '',
  projectType: 'business',
  spaceType: 'Restaurant / café',
  location: 'M1 1AA',
  size: '8 rooms',
  areas: 'Dining room\nBar',
  message: '',
  preferredDate: 'Late October',
  source: 'Google',
  hp: '',
};

const request = (overrides = {}) =>
  new Request('https://ross360.test/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://ross360.test' },
    body: JSON.stringify({ ...FORM, startedAt: Date.now() - 10000, turnstileToken: TEST_TURNSTILE_TOKEN, ...overrides }),
  });

// Captures what would have been sent to Resend.
function stubResend({ fail = false } = {}) {
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = withTurnstile(async (url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response('{}', { status: fail ? 500 : 200 });
  });
  return { sent, restore: () => (globalThis.fetch = original) };
}

// With the database bound, Turnstile is required, so a (fake) secret is set too.
const env = (extra = {}) => ({
  RESEND_API_KEY: 'test-key-not-real',
  QUOTE_FROM_EMAIL: 'ROSS 360 <enquiries@ross360.test>',
  ...(extra.DB ? { TURNSTILE_SECRET_KEY: TEST_TURNSTILE_SECRET } : {}),
  ...extra,
});

test('a submitted form is stored with the next ROSS reference', async () => {
  const db = new FakeD1();
  const resend = stubResend();
  try {
    const first = await onRequestPost({ request: request(), env: env({ DB: db }) });
    assert.equal(first.status, 200);
    const second = await onRequestPost({ request: request({ business: 'Second Business' }), env: env({ DB: db }) });
    assert.equal(second.status, 200);

    const enquiries = await listEnquiries(db);
    assert.deepEqual(
      enquiries.map((e) => e.reference),
      ['ROSS-0002', 'ROSS-0001'],
    );
    assert.equal(enquiries[1].business, 'Test Café');
    assert.equal(enquiries[1].status, 'new');
    assert.equal(enquiries[1].origin, 'website');
  } finally {
    resend.restore();
    db.close();
  }
});

test('the internal email shows the reference first', async () => {
  const db = new FakeD1();
  const resend = stubResend();
  try {
    await onRequestPost({ request: request(), env: env({ DB: db }) });
    const [internal] = resend.sent;
    assert.match(internal.subject, /^New ROSS 360 enquiry — Test Café$/);
    assert.match(internal.text, /^Reference: ROSS-0001\n/);
    assert.match(internal.html, /ROSS-0001/);
  } finally {
    resend.restore();
    db.close();
  }
});

test('without the database the form behaves exactly as before', async () => {
  const resend = stubResend();
  try {
    const response = await onRequestPost({ request: request(), env: env() });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    const [internal] = resend.sent;
    assert.ok(!internal.text.includes('Reference:'));
    assert.match(internal.text, /^Name: Alex Customer\n/);
  } finally {
    resend.restore();
  }
});

test('an enquiry is still emailed if storing it fails', async () => {
  const resend = stubResend();
  const broken = {
    prepare() {
      throw new Error('database unavailable');
    },
    batch() {
      throw new Error('database unavailable');
    },
  };
  try {
    const response = await onRequestPost({ request: request(), env: env({ DB: broken }) });
    assert.equal(response.status, 200);
    assert.equal(resend.sent.length, 1);
  } finally {
    resend.restore();
  }
});

test('an invalid form stores nothing', async () => {
  const db = new FakeD1();
  const resend = stubResend();
  try {
    const response = await onRequestPost({ request: request({ email: 'not-an-email' }), env: env({ DB: db }) });
    assert.equal(response.status, 422);
    assert.equal(resend.sent.length, 0);
    assert.deepEqual(await listEnquiries(db), []);
  } finally {
    resend.restore();
    db.close();
  }
});

test('a honeypot submission stores nothing', async () => {
  const db = new FakeD1();
  const resend = stubResend();
  try {
    const response = await onRequestPost({ request: request({ hp: 'bot' }), env: env({ DB: db }) });
    assert.equal(response.status, 200);
    assert.equal(resend.sent.length, 0);
    assert.deepEqual(await listEnquiries(db), []);
  } finally {
    resend.restore();
    db.close();
  }
});

// --- When Resend refuses the email -------------------------------------------------------------

// Run a submission with Resend answering `respond`, capturing console.error output.
// Pass { db: null } for a site without the D1 binding.
async function submitWithResend(respond, { db = new FakeD1(), extraEnv = {} } = {}) {
  const logs = [];
  const originalError = console.error;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  console.error = (...args) => logs.push(args.join(' '));
  globalThis.fetch = withTurnstile(async (url, init) => {
    calls += 1;
    return respond(url, init);
  });
  try {
    const response = await onRequestPost({
      request: request({ name: 'Private Person', email: 'private.person@example.test' }),
      env: env({ ...(db ? { DB: db } : {}), RESEND_API_KEY: 're_SECRETKEY_not_real_123456', ...extraEnv }),
    });
    return { response, body: await response.json(), logs: logs.join('\n'), calls, db };
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
}

const resend403 = () =>
  new Response(
    JSON.stringify({
      statusCode: 403,
      name: 'validation_error',
      message: 'The ross360.co.uk domain is not verified. Echo: private.person@example.test re_SECRETKEY_not_real_123456',
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );

const SEND_ERROR_BODY = {
  ok: false,
  message: "We couldn't send your enquiry just now. Please try again or email contact@ross360.co.uk directly.",
};

test('a Resend error is logged with its status and message, safely', async () => {
  const { response, body, logs, calls } = await submitWithResend(resend403, { db: null });

  // Without the database nothing has been kept, so the customer is asked to try again, as before.
  assert.equal(response.status, 502);
  assert.deepEqual(body, SEND_ERROR_BODY);
  assert.equal(calls, 1, 'only the internal email is attempted');

  // The log says what went wrong…
  assert.match(logs, /Resend request \(internal\) failed with status 403/);
  assert.match(logs, /validation_error: The ross360\.co\.uk domain is not verified/);
  assert.match(logs, /from domain ross360\.test/);
  // …and nothing it shouldn't.
  assert.ok(!logs.includes('re_SECRETKEY_not_real_123456'), 'API key must not be logged');
  assert.ok(!logs.includes('private.person@example.test'), 'customer email must not be logged');
  assert.ok(!logs.includes('Private Person'), 'customer name must not be logged');
});

test('a saved enquiry whose internal email fails is still received, once, and the failure is on its timeline', async () => {
  const { response, body, logs, calls, db } = await submitWithResend(resend403);

  // The customer is told it was received: it has been stored.
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(calls, 1);

  // Exactly one enquiry, with the failure recorded.
  const enquiries = await listEnquiries(db);
  assert.deepEqual(
    enquiries.map((e) => e.reference),
    ['ROSS-0001'],
  );
  const { events } = await getEnquiry(db, 'ROSS-0001');
  const failed = events.find((e) => e.type === 'notification_failed');
  assert.ok(failed, 'timeline records the failed notification');
  assert.deepEqual(failed.detail, { email: 'internal', status: 403 });
  assert.equal(failed.actor, 'website');

  // The diagnostic log is still there, and still safe.
  assert.match(logs, /Resend request \(internal\) failed with status 403/);
  assert.match(logs, /Enquiry ROSS-0001 was saved, but its internal email notification failed/);
  assert.ok(!logs.includes('re_SECRETKEY_not_real_123456'));
  assert.ok(!logs.includes('private.person@example.test'));
  db.close();
});

test('the customer acknowledgement still goes out when only the internal email failed', async () => {
  const sent = [];
  const { response, calls, db } = await submitWithResend(
    (url, init) => {
      sent.push(JSON.parse(init.body));
      return sent.length === 1 ? new Response('{}', { status: 500 }) : new Response('{"id":"ok"}', { status: 200 });
    },
    { extraEnv: { SEND_ACKNOWLEDGEMENT: 'true' } },
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.equal(sent[1].subject, 'ROSS 360 — Enquiry received');
  assert.equal((await listEnquiries(db)).length, 1);
  db.close();
});

test('if the enquiry could not be saved and the email fails, the customer is asked to try again', async () => {
  const broken = {
    prepare() {
      throw new Error('database unavailable');
    },
    batch() {
      throw new Error('database unavailable');
    },
  };
  const { response, body } = await submitWithResend(resend403, { db: broken });
  assert.equal(response.status, 502);
  assert.deepEqual(body, SEND_ERROR_BODY);
});

test('a Resend error with a non-JSON body is still logged safely', async () => {
  const { response, logs } = await submitWithResend(
    () => new Response('Unauthorized: bad key re_SECRETKEY_not_real_123456', { status: 401 }),
    { db: null },
  );
  assert.equal(response.status, 502);
  assert.match(logs, /failed with status 401; from domain ross360\.test; Unauthorized: bad key \[key\]/);
  assert.ok(!logs.includes('re_SECRETKEY_not_real_123456'));
});

test('a request that never reaches Resend is logged and answered with the usual error', async () => {
  const { response, body, logs } = await submitWithResend(
    () => {
      throw new TypeError('Network connection lost.');
    },
    { db: null },
  );
  assert.equal(response.status, 502);
  assert.match(body.message, /^We couldn't send your enquiry just now/);
  assert.match(logs, /Resend request \(internal\) could not be sent: TypeError: Network connection lost\./);

  // With the database, the same failure is recorded against the saved enquiry instead.
  const saved = await submitWithResend(() => {
    throw new TypeError('Network connection lost.');
  });
  assert.equal(saved.response.status, 200);
  const { events } = await getEnquiry(saved.db, 'ROSS-0001');
  assert.deepEqual(events.find((e) => e.type === 'notification_failed').detail, { email: 'internal', status: 'not sent' });
  saved.db.close();
});

test('a failed acknowledgement is logged but the enquiry still succeeds', async () => {
  let call = 0;
  const { response, logs, calls, db } = await submitWithResend(
    () => {
      call += 1;
      return call === 1
        ? new Response('{"id":"ok"}', { status: 200 })
        : new Response(JSON.stringify({ name: 'validation_error', message: 'Invalid `to`: private.person@example.test' }), {
            status: 422,
          });
    },
    { extraEnv: { SEND_ACKNOWLEDGEMENT: 'true' } },
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.match(logs, /Resend request \(acknowledgement\) failed with status 422; from domain ross360\.co\.uk; validation_error: Invalid `to`: \[email\]/);
  assert.ok(!logs.includes('private.person@example.test'));
  db.close();
});

// --- The successful flow, unchanged ------------------------------------------------------------

test('a successful submission saves once, emails the team, acknowledges the customer and returns 200', async () => {
  const db = new FakeD1();
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = withTurnstile(async (url, init) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return new Response('{"id":"ok"}', { status: 200 });
  });
  try {
    const response = await onRequestPost({
      request: request(),
      env: env({ DB: db, SEND_ACKNOWLEDGEMENT: 'true' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });

    assert.equal(sent.length, 2);
    const [internal, ack] = sent.map((s) => s.body);
    assert.equal(sent[0].url, 'https://api.resend.com/emails');
    assert.deepEqual(internal.to, ['newquote@ross360.co.uk']);
    assert.equal(internal.reply_to, 'alex@example.test');
    assert.equal(internal.subject, 'New ROSS 360 enquiry — Test Café');
    assert.match(internal.text, /^Reference: ROSS-0001\n/);
    assert.equal(ack.from, 'ROSS 360 <contact@ross360.co.uk>');
    assert.deepEqual(ack.to, ['alex@example.test']);
    assert.equal(ack.subject, 'ROSS 360 — Enquiry received');

    const enquiries = await listEnquiries(db);
    assert.equal(enquiries.length, 1);
    const { events } = await getEnquiry(db, 'ROSS-0001');
    assert.deepEqual(
      events.map((e) => e.type),
      ['created'],
      'nothing but the creation on the timeline',
    );
  } finally {
    globalThis.fetch = original;
    db.close();
  }
});

test('a request body that is not a JSON object is refused with 400', async () => {
  const resend = stubResend();
  try {
    for (const body of ['null', '[]', '"text"', '5']) {
      const response = await onRequestPost({
        request: new Request('https://ross360.test/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://ross360.test' },
          body,
        }),
        env: env(),
      });
      assert.equal(response.status, 400, body);
    }
    assert.equal(resend.sent.length, 0);
  } finally {
    resend.restore();
  }
});

// --- Cloudflare Turnstile ------------------------------------------------------------------------

// Answers Turnstile's siteverify with `success` and Resend with 200, recording both.
async function submitWithTurnstile({ success, token = 'turnstile-token', db = new FakeD1() }) {
  const calls = { verify: [], resend: 0 };
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://challenges.cloudflare.com/')) {
      calls.verify.push(Object.fromEntries(init.body));
      return new Response(JSON.stringify({ success }), { status: 200 });
    }
    calls.resend += 1;
    return new Response('{"id":"ok"}', { status: 200 });
  };
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(' '));
  try {
    const response = await onRequestPost({
      request: request({ turnstileToken: token }),
      env: env({ DB: db, TURNSTILE_SECRET_KEY: 'turnstile-secret-not-real' }),
    });
    return { response, calls, db, errors: errors.join('\n') };
  } finally {
    globalThis.fetch = original;
    console.error = originalError;
  }
}

test('with Turnstile set up, a confirmed submission is saved and emailed as normal', async () => {
  const { response, calls, db } = await submitWithTurnstile({ success: true });
  assert.equal(response.status, 200);
  assert.equal(calls.verify.length, 1);
  assert.equal(calls.verify[0].secret, 'turnstile-secret-not-real');
  assert.equal(calls.verify[0].response, 'turnstile-token');
  assert.equal(calls.resend, 1);
  assert.equal((await listEnquiries(db)).length, 1);
  db.close();
});

test('with Turnstile set up, a submission it rejects is neither saved nor emailed', async () => {
  const { response, calls, db } = await submitWithTurnstile({ success: false });
  assert.equal(response.status, 400);
  assert.equal(calls.resend, 0);
  assert.deepEqual(await listEnquiries(db), []);
  db.close();
});

test('with Turnstile set up, a submission without a token is neither saved nor emailed', async () => {
  const { response, calls, db, errors } = await submitWithTurnstile({ success: true, token: '' });
  assert.equal(response.status, 400);
  assert.equal(calls.verify.length, 0, 'no token, so Cloudflare is not asked');
  assert.equal(calls.resend, 0);
  assert.deepEqual(await listEnquiries(db), []);
  assert.match(errors, /Turnstile token missing/);
  db.close();
});

// --- Turnstile is required whenever enquiries are stored ----------------------------------------

// Runs one submission, recording every outgoing request and every console.error line.
async function submitWith({ env: extraEnv, respond = () => new Response('{"id":"ok"}', { status: 200 }) }) {
  const requests = [];
  const errors = [];
  const original = globalThis.fetch;
  const originalError = console.error;
  globalThis.fetch = async (url, init) => {
    requests.push(String(url));
    return respond(url, init);
  };
  console.error = (...args) => errors.push(args.join(' '));
  try {
    const response = await onRequestPost({ request: request(), env: env(extraEnv) });
    return { response, body: await response.json(), requests, errors: errors.join('\n') };
  } finally {
    globalThis.fetch = original;
    console.error = originalError;
  }
}

test('D1 with the Turnstile secret: the enquiry is checked, saved and emailed', async () => {
  const db = new FakeD1();
  const { response, requests } = await submitWith({
    env: { DB: db, TURNSTILE_SECRET_KEY: TEST_TURNSTILE_SECRET },
    respond: withTurnstile(() => new Response('{"id":"ok"}', { status: 200 })),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(requests, [
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    'https://api.resend.com/emails',
  ]);
  assert.equal((await listEnquiries(db)).length, 1);
  db.close();
});

test('D1 without the Turnstile secret: refused, nothing saved, counted or emailed', async () => {
  const db = new FakeD1();
  const { response, body, requests, errors } = await submitWith({
    env: { DB: db, TURNSTILE_SECRET_KEY: undefined, SEND_ACKNOWLEDGEMENT: 'true' },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(body, SEND_ERROR_BODY);
  assert.deepEqual(requests, [], 'no Turnstile, internal or acknowledgement request');
  assert.deepEqual(await listEnquiries(db), []);
  assert.equal(db.db.prepare(`SELECT value FROM counters WHERE name = 'enquiry'`).get().value, 0, 'counter unchanged');
  assert.match(errors, /DB binding is set but TURNSTILE_SECRET_KEY is not/);
  assert.ok(!errors.includes('alex@example.test'));
  db.close();
});

test('no D1 and no Turnstile secret: the form emails the enquiry as before', async () => {
  const { response, body, requests } = await submitWith({ env: {} });
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.deepEqual(requests, ['https://api.resend.com/emails']);
});

test('a Turnstile rejection logs only Cloudflare’s error codes', async () => {
  const db = new FakeD1();
  const { response, requests, errors } = await submitWith({
    env: { DB: db, TURNSTILE_SECRET_KEY: TEST_TURNSTILE_SECRET },
    respond: withTurnstile(() => new Response('{}'), { success: false }),
  });
  assert.equal(response.status, 400);
  assert.equal(requests.length, 1, 'only siteverify; no email');
  assert.deepEqual(await listEnquiries(db), []);
  assert.match(errors, /Turnstile verification failed \(status 200\); error codes: invalid-input-response/);
  for (const secret of [TEST_TURNSTILE_SECRET, TEST_TURNSTILE_TOKEN, 'alex@example.test', 'Alex Customer']) {
    assert.ok(!errors.includes(secret), `${secret} must not be logged`);
  }
  db.close();
});

test('unexpected Turnstile error codes are not logged as given', async () => {
  const db = new FakeD1();
  const { response, errors } = await submitWith({
    env: { DB: db, TURNSTILE_SECRET_KEY: TEST_TURNSTILE_SECRET },
    respond: () =>
      new Response(JSON.stringify({ success: false, 'error-codes': ['bad <script>', 'alex@example.test', 'timeout-or-duplicate'] })),
  });
  assert.equal(response.status, 400);
  assert.match(errors, /error codes: timeout-or-duplicate$/m);
  assert.ok(!errors.includes('alex@example.test') && !errors.includes('<script>'));
  db.close();
});

test('if Cloudflare cannot be reached, the submission is refused and the failure logged', async () => {
  const db = new FakeD1();
  const { response, requests, errors } = await submitWith({
    env: { DB: db, TURNSTILE_SECRET_KEY: TEST_TURNSTILE_SECRET },
    respond: () => {
      throw new TypeError('Network connection lost.');
    },
  });
  assert.equal(response.status, 400);
  assert.equal(requests.length, 1);
  assert.deepEqual(await listEnquiries(db), []);
  assert.match(errors, /Turnstile verification could not be completed: TypeError/);
  db.close();
});
