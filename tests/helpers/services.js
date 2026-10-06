// Local stand-ins for Stripe and Resend, so booking and payment can be tested without either.
// Nothing here talks to the network: fetch is replaced while a test runs, and any other URL fails.

import { signWebhook } from '../../server/booking/stripe.js';

export const TEST_STRIPE = {
  STRIPE_SECRET_KEY: 'sk_test_local_stub_only',
  STRIPE_WEBHOOK_SECRET: 'whsec_local_stub_only',
  EMAIL_TEST_ALLOWLIST: 'alex@example.test',
  SCHEDULER_SECRET: 'local-scheduler-secret-0123456789abcdef',
};

/** A minimal Stripe: Checkout Sessions (create, retrieve, expire) and Refunds, with idempotency keys. */
export class StripeStub {
  constructor() {
    this.sessions = new Map();
    this.refunds = [];
    this.calls = [];
    this.byKey = new Map();
    this.n = 0;
    // Set to a function (call) => Response to make Stripe fail.
    this.fail = null;
  }

  session(id) {
    return this.sessions.get(id);
  }

  /** The customer pays on Stripe's page. Returns the completed session. */
  pay(id) {
    const s = this.sessions.get(id);
    if (!s) throw new Error(`No session ${id}`);
    if (s.status !== 'open') throw new Error(`Session ${id} is ${s.status}`);
    this.n += 1;
    Object.assign(s, { status: 'complete', payment_status: 'paid', payment_intent: `pi_test_${this.n}` });
    return { ...s };
  }

  /** Stripe expires a session (its time ran out). */
  expire(id) {
    const s = this.sessions.get(id);
    if (s.status === 'open') s.status = 'expired';
    return { ...s };
  }

  lastSession() {
    return [...this.sessions.values()].at(-1);
  }

  async handle(method, path, params, key) {
    this.calls.push({ method, path, params, key });
    if (this.fail) {
      const response = this.fail({ method, path, params, key });
      if (response) return response;
    }
    if (key && this.byKey.has(key)) return json(this.byKey.get(key));
    let out;
    if (method === 'POST' && path === '/v1/checkout/sessions') {
      this.n += 1;
      const id = `cs_test_${this.n}`;
      out = {
        id,
        object: 'checkout.session',
        url: `https://checkout.stripe.com/c/pay/${id}`,
        status: 'open',
        payment_status: 'unpaid',
        amount_total: Number(params.get('line_items[0][price_data][unit_amount]')),
        currency: params.get('line_items[0][price_data][currency]'),
        expires_at: Number(params.get('expires_at')),
        success_url: params.get('success_url'),
        cancel_url: params.get('cancel_url'),
        customer_email: params.get('customer_email'),
        payment_method_types: params.getAll('payment_method_types[0]'),
        metadata: {
          booking_id: params.get('metadata[booking_id]'),
          payment_id: params.get('metadata[payment_id]'),
          quote: params.get('metadata[quote]'),
          kind: params.get('metadata[kind]'),
        },
        payment_intent: null,
      };
      this.sessions.set(id, out);
    } else if (method === 'GET' && path.startsWith('/v1/checkout/sessions/')) {
      const s = this.sessions.get(decodeURIComponent(path.split('/')[4]));
      if (!s) return json({ error: { message: 'No such session' } }, 404);
      return json({ ...s });
    } else if (method === 'POST' && /^\/v1\/checkout\/sessions\/[^/]+\/expire$/.test(path)) {
      const s = this.sessions.get(decodeURIComponent(path.split('/')[4]));
      if (!s) return json({ error: { message: 'No such session' } }, 404);
      if (s.status !== 'open') return json({ error: { message: `Session is ${s.status}` } }, 400);
      s.status = 'expired';
      return json({ ...s });
    } else if (method === 'POST' && path === '/v1/refunds') {
      this.n += 1;
      out = {
        id: `re_test_${this.n}`,
        object: 'refund',
        status: 'succeeded',
        amount: Number(params.get('amount')),
        payment_intent: params.get('payment_intent'),
      };
      this.refunds.push(out);
    } else {
      return json({ error: { message: `Stub has no ${method} ${path}` } }, 404);
    }
    if (key) this.byKey.set(key, out);
    return json(out);
  }
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Run with fetch replaced: Stripe goes to `stripe` (a StripeStub), Resend to a recorder.
 * `emails` collects every Resend request body (with its Idempotency-Key as .key).
 * `resendRespond(n, body)` can answer the n-th email differently.
 */
export async function withServices(run, { stripe = new StripeStub(), resendRespond = null } = {}) {
  const emails = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const headers = init.headers || {};
    if (u.host === 'api.stripe.com') {
      const params = new URLSearchParams(typeof init.body === 'string' ? init.body : '');
      return stripe.handle(init.method || 'GET', u.pathname, params, headers['Idempotency-Key']);
    }
    if (u.host === 'api.resend.com') {
      const body = JSON.parse(init.body);
      body.key = headers['Idempotency-Key'];
      emails.push(body);
      if (resendRespond) {
        const response = resendRespond(emails.length, body);
        if (response) return response;
      }
      return new Response(JSON.stringify({ id: `resend-${emails.length}` }), { status: 200 });
    }
    throw new Error(`Unexpected fetch in a test: ${u.host}`);
  };
  try {
    return await run({ stripe, emails });
  } finally {
    globalThis.fetch = original;
  }
}

/** Deliver a signed Stripe event to the webhook function. Returns { status, data }. */
export async function deliverWebhook(env, type, object, { secret = env.STRIPE_WEBHOOK_SECRET, signature } = {}) {
  const { onRequest } = await import('../../functions/api/stripe/webhook.js');
  const payload = JSON.stringify({ id: `evt_${Math.random().toString(36).slice(2)}`, type, data: { object } });
  const header = signature ?? (await signWebhook(secret, payload));
  const request = new Request('https://ross360.test/api/stripe/webhook', {
    method: 'POST',
    headers: { 'Stripe-Signature': header, 'Content-Type': 'application/json' },
    body: payload,
  });
  const response = await onRequest({ request, env });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}
