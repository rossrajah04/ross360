// The public quote form: it still emails the enquiry, and now also stores it with its reference.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeD1 } from './helpers/d1.js';
import { onRequestPost } from '../functions/api/quote.js';
import { listEnquiries } from '../server/admin/enquiries.js';

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
    body: JSON.stringify({ ...FORM, startedAt: Date.now() - 10000, ...overrides }),
  });

// Captures what would have been sent to Resend.
function stubResend({ fail = false } = {}) {
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response('{}', { status: fail ? 500 : 200 });
  };
  return { sent, restore: () => (globalThis.fetch = original) };
}

const env = (extra = {}) => ({
  RESEND_API_KEY: 'test-key-not-real',
  QUOTE_FROM_EMAIL: 'ROSS 360 <enquiries@ross360.test>',
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
async function submitWithResend(respond, { db = new FakeD1(), extraEnv = {} } = {}) {
  const logs = [];
  const originalError = console.error;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  console.error = (...args) => logs.push(args.join(' '));
  globalThis.fetch = async (url, init) => {
    calls += 1;
    return respond(url, init);
  };
  try {
    const response = await onRequestPost({
      request: request({ name: 'Private Person', email: 'private.person@example.test' }),
      env: env({ DB: db, RESEND_API_KEY: 're_SECRETKEY_not_real_123456', ...extraEnv }),
    });
    return { response, body: await response.json(), logs: logs.join('\n'), calls, db };
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
}

test('a Resend error is logged with its status and message, safely', async () => {
  const { response, body, logs, calls, db } = await submitWithResend(
    () =>
      new Response(
        JSON.stringify({
          statusCode: 403,
          name: 'validation_error',
          message:
            'The ross360.co.uk domain is not verified. Echo: private.person@example.test re_SECRETKEY_not_real_123456',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
  );

  // The customer sees exactly the same message as before.
  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    ok: false,
    message: "We couldn't send your enquiry just now. Please try again or email contact@ross360.co.uk directly.",
  });
  assert.equal(calls, 1, 'only the internal email is attempted');

  // The log says what went wrong…
  assert.match(logs, /Resend request \(internal\) failed with status 403/);
  assert.match(logs, /validation_error: The ross360\.co\.uk domain is not verified/);
  assert.match(logs, /from domain ross360\.test/);
  // …and nothing it shouldn't.
  assert.ok(!logs.includes('re_SECRETKEY_not_real_123456'), 'API key must not be logged');
  assert.ok(!logs.includes('private.person@example.test'), 'customer email must not be logged');
  assert.ok(!logs.includes('Private Person'), 'customer name must not be logged');

  // The enquiry is saved once, exactly as before.
  const enquiries = await listEnquiries(db);
  assert.deepEqual(
    enquiries.map((e) => e.reference),
    ['ROSS-0001'],
  );
  db.close();
});

test('a Resend error with a non-JSON body is still logged safely', async () => {
  const { response, logs, db } = await submitWithResend(
    () => new Response('Unauthorized: bad key re_SECRETKEY_not_real_123456', { status: 401 }),
  );
  assert.equal(response.status, 502);
  assert.match(logs, /failed with status 401; from domain ross360\.test; Unauthorized: bad key \[key\]/);
  assert.ok(!logs.includes('re_SECRETKEY_not_real_123456'));
  db.close();
});

test('a request that never reaches Resend is logged and answered with the usual error', async () => {
  const { response, body, logs, db } = await submitWithResend(() => {
    throw new TypeError('Network connection lost.');
  });
  assert.equal(response.status, 502);
  assert.match(body.message, /^We couldn't send your enquiry just now/);
  assert.match(logs, /Resend request \(internal\) could not be sent: TypeError: Network connection lost\./);
  assert.equal((await listEnquiries(db)).length, 1, 'still exactly one saved enquiry');
  db.close();
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
