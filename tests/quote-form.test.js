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
