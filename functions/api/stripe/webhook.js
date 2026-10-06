// Cloudflare Pages Function: Stripe webhook, POST /api/stripe/webhook (Phase C).
//
// Stripe signs every event with STRIPE_WEBHOOK_SECRET; anything unsigned, wrongly signed or older
// than five minutes is refused. Handled events (subscribe the endpoint to exactly these):
//   checkout.session.completed  a payment succeeded: confirm the booking or record the balance
//   checkout.session.expired    a checkout was not completed: release the slot
//   charge.refund.updated       a refund failed after it was made
// Handling is idempotent, so Stripe's retries and the customer's own return never double-count.

import { SchemaNotReady } from '../../../server/admin/schema.js';
import { verifyWebhook } from '../../../server/booking/stripe.js';
import { handleCheckoutCompleted, handleCheckoutExpired, handleRefundUpdated } from '../../../server/booking/bookings.js';

const reply = (status, body = { received: true }) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (!env.DB || !env.STRIPE_WEBHOOK_SECRET) return reply(503, { error: 'not configured' });
  const payload = await request.text();
  if (payload.length > 512 * 1024) return reply(413, { error: 'too large' });
  const event = await verifyWebhook(env, payload, request.headers.get('Stripe-Signature'));
  if (!event) return reply(400, { error: 'bad signature' });

  try {
    const object = event.data?.object;
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await handleCheckoutCompleted(env, object);
    } else if (event.type === 'checkout.session.expired') {
      await handleCheckoutExpired(env, object);
    } else if (event.type === 'charge.refund.updated' || event.type === 'refund.updated' || event.type === 'refund.failed') {
      await handleRefundUpdated(env, object);
    }
    return reply(200);
  } catch (error) {
    // A non-2xx answer makes Stripe retry later, which is safe.
    if (error instanceof SchemaNotReady) console.error(error.message);
    else console.error(`Stripe webhook ${event.type} failed: ${error?.name}: ${error?.message}`);
    return reply(500, { error: 'not handled' });
  }
}
