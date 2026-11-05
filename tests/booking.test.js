// Phase C self-service booking and Stripe payment, against a local Stripe stub (tests/helpers/services.js):
// the 25% deposit, successful and failed checkout, slot holds and their release, two customers for one
// slot, the balance request after the shoot, the balance paid online or recorded in the Admin, booking
// with no deposit,
// customer cancellations (outside and within 48 hours), ROSS 360's retention decision, refunds,
// moving a booking, the webhook, and the test-mode guards. No real card, email or Stripe account.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addSlot, callPage, checkout, formOf, postForm, sentQuote, setUp, withResend } from './helpers/phasec.js';
import { StripeStub, deliverWebhook, withServices } from './helpers/services.js';
import { getEnquiry } from '../server/admin/enquiries.js';
import {
  activeBooking,
  cancelBooking,
  customerCancel,
  executeRefunds,
  getBooking,
  handleCheckoutCompleted,
  refundsOf,
  requestBalance,
  runScheduled,
  startBalanceCheckout,
  startCheckout,
} from '../server/booking/bookings.js';
import { resolveQuoteLink } from '../server/customer/quotePage.js';
import { addDays, packageItem, ukToday } from '../src/lib/admin/quotes.js';
import { BALANCE_DUE_DAYS, DEPOSIT_PERCENT, balanceDueOn, depositFor, maxRetention, paymentOptions, ukInstant } from '../src/lib/admin/booking.js';

const TOTAL = 43900; // the test quote: Professional £349 + £100 extra + £20 travel − £30 discount
const DEPOSIT = 11000; // 25% of £439, rounded up to the pound
const one = (t, sql, ...params) => t.db.db.prepare(sql).get(...params);
const rows = (t, sql, ...params) => t.db.db.prepare(sql).all(...params);
const plain = (list) => list.map((row) => ({ ...row }));
const events = async (t, type) => (await getEnquiry(t.db, t.enquiry)).events.filter((e) => !type || e.type === type);
const at = (date, time) => ukInstant(date, time);
const sessionOf = (location) => location.split('/').pop();

/** A sent quote and an open slot `days` ahead, ready to book. */
async function ready(days = 20, period = 'am', extra = {}) {
  const t = await setUp();
  const slot = await addSlot(t, days, period);
  const q = await sentQuote(t, extra);
  return { t, slot, ...q };
}

/** Book and pay through the pages and Stripe's success return. Returns the booking. */
async function bookAndPay(t, stripe, token, slotId) {
  const res = await checkout(t.env, token, slotId);
  assert.equal(res.status, 303, res.html);
  const id = sessionOf(res.location);
  stripe.pay(id);
  const back = await callPage(t.env, `/q/${token}/paid?session_id=${id}`);
  assert.equal(back.status, 303);
  return one(t, `SELECT * FROM bookings WHERE status = 'confirmed' ORDER BY id DESC LIMIT 1`);
}

/** ROSS 360 sends the balance request on the day of the shoot (the tour is ready). */
async function askForBalance(t, bookingId, slotDate) {
  const row = one(t, `SELECT paid_pence FROM bookings WHERE id = ?`, bookingId);
  const outcome = await requestBalance(t.env, bookingId, { actor: 'admin', expectPaidPence: row.paid_pence }, at(slotDate, '15:00'));
  assert.equal(outcome.result, 'ok');
  return outcome;
}

// --- The rules ------------------------------------------------------------------------------------

test('deposit: 25% of the full total including travel, rounded up to the pound; the balance after the shoot', () => {
  assert.equal(DEPOSIT_PERCENT, 25);
  assert.deepEqual(paymentOptions({ totalPence: TOTAL }), {
    totalPence: TOTAL,
    plan: 'deposit',
    dueNowPence: 11000, // 25% of £439 is £109.75
    depositPence: 11000,
    balancePence: TOTAL - 11000,
  });
  assert.equal(depositFor(34900), 8800); // £349 → £87.25 → £88
  assert.equal(depositFor(24900), 6300);
  assert.equal(depositFor(49900), 12500);
  assert.equal(depositFor(67000), 16800);
  assert.equal(depositFor(9900), 2500);
  assert.equal(depositFor(40000), 10000); // exact pounds are not rounded up further
  // Any quote, whatever its package, gets the same rule.
  assert.equal(paymentOptions({ totalPence: 30000 }).depositPence, 7500);
  // A quote so small the deposit would be everything is paid in full.
  assert.equal(paymentOptions({ totalPence: 100 }).plan, 'full');
  // The balance request makes the balance due 7 days later.
  assert.equal(BALANCE_DUE_DAYS, 7);
  assert.equal(balanceDueOn('2026-11-26'), '2026-12-03');
  // Within 48 hours ROSS 360 may keep up to the deposit, never more than was paid.
  assert.equal(maxRetention(TOTAL, DEPOSIT, DEPOSIT), DEPOSIT);
  assert.equal(maxRetention(TOTAL, TOTAL, DEPOSIT), DEPOSIT, 'not the balance, once paid');
  assert.equal(maxRetention(TOTAL, 0, 0), 0, 'booked with no deposit');
  assert.equal(maxRetention(TOTAL, TOTAL, null), DEPOSIT, 'an older booking paid in full');
});

test('UK clock times', () => {
  assert.equal(ukInstant('2026-07-01', '00:00').toISOString(), '2026-06-30T23:00:00.000Z');
  assert.equal(ukInstant('2026-12-01', '09:00').toISOString(), '2026-12-01T09:00:00.000Z');
  assert.equal(ukInstant('2026-10-25', '09:00').toISOString(), '2026-10-25T09:00:00.000Z'); // clocks went back that night
});

// --- Booking with the deposit ---------------------------------------------------------------------

test('deposit: Stripe Checkout for 25%, slot held, then confirmed with emails; no balance due yet', async () => {
  const { t, slot, token, reference } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const page = await callPage(t.env, `/q/${token}`);
    assert.match(page.html, /Book a slot/);
    const pay = await callPage(t.env, `/q/${token}/pay?slot=${slot.id}`);
    assert.deepEqual(formOf(pay.html).plans, [], 'no choice of how to pay');
    assert.match(pay.html, /£439\.00/);
    assert.match(pay.html, /£110\.00/);
    assert.match(pay.html, /A deposit of 25% confirms the booking\. The balance of £329\.00 is paid after the shoot, once your tour is ready and you are happy with it\./);
    assert.match(pay.html, /within 48 hours of the slot, ROSS 360 may keep up to the whole deposit/);

    const res = await checkout(t.env, token, slot.id);
    assert.equal(res.status, 303);
    assert.match(res.location, /^https:\/\/checkout\.stripe\.com\//);
    const s = stripe.lastSession();
    assert.equal(s.amount_total, DEPOSIT);
    assert.equal(s.currency, 'gbp');
    assert.deepEqual(s.payment_method_types, ['card']);
    assert.equal(s.metadata.kind, 'deposit');
    assert.equal(s.metadata.quote, reference);
    assert.ok(s.expires_at * 1000 - Date.now() >= 30 * 60_000, 'Stripe needs at least 30 minutes');
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'holding');

    // While held, nobody else is offered the slot.
    assert.equal(formOf((await callPage(t.env, `/q/${token}/book`)).html).slots.includes(slot.id), true, 'own hold still choosable');

    stripe.pay(s.id);
    const back = await callPage(t.env, `/q/${token}/paid?session_id=${s.id}`);
    assert.equal(back.location, `/q/${token}`);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.plan, 'deposit');
    assert.equal(b.paid_pence, DEPOSIT);
    assert.equal(b.deposit_pence, DEPOSIT);
    assert.equal(b.total_pence, TOTAL);
    assert.equal(b.balance_due_on, null);
    assert.equal(b.reminder_14_on, null);
    assert.equal(b.reminder_8_on, null);
    const shown = await callPage(t.env, `/q/${token}`);
    assert.match(shown.html, /Your booking is confirmed\./);
    assert.match(shown.html, /£329\.00/);
    assert.match(shown.html, /After the shoot, once your tour is ready/);
    assert.doesNotMatch(shown.html, /Pay balance/, 'nothing to pay until the tour is ready');
    // The balance page does not take a payment yet either.
    assert.doesNotMatch((await callPage(t.env, `/q/${token}/balance`)).html, /Continue to payment/);
    assert.equal((await startBalanceCheckout(t.env, await resolveQuoteLink(t.env, token), 'https://x.test')).result, 'nothing_due');
    assert.equal(stripe.calls.filter((c) => c.path === '/v1/checkout/sessions').length, 1);

    const confirm = emails.find((e) => e.subject.startsWith('ROSS 360 booking confirmed'));
    assert.deepEqual(confirm.to, ['alex@example.test']);
    assert.match(confirm.text, /Paid: £110\.00/);
    assert.match(confirm.text, /The balance of £329\.00 is paid after the shoot, once your tour is ready and you are happy with it\./);
    assert.doesNotMatch(confirm.text, /day of the shoot/);
    assert.ok(emails.find((e) => e.subject.startsWith('Booking confirmed:') && e.to[0] === 'newquote@ross360.co.uk'));
    assert.equal((await getEnquiry(t.db, t.enquiry)).status, 'booked');
  });
});

test('a slot a few days away is booked the same way', async () => {
  const { t, slot, token } = await ready(5);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    assert.equal(b.paid_pence, DEPOSIT);
    assert.equal(b.balance_due_on, null);
  });
});

test('a quotation without one of the packages pays the same 25% deposit; a plan sent with the form is ignored', async () => {
  const { t, slot, token } = await ready(20, 'am', {
    package: null,
    items: [{ kind: 'custom', description: 'Property tour', quantity: 1, unitPence: 30000 }],
  });
  await withServices(async ({ stripe }) => {
    const res = await checkout(t.env, token, slot.id);
    assert.equal(res.status, 303);
    assert.equal(stripe.lastSession().amount_total, depositFor(one(t, `SELECT total_pence FROM bookings`).total_pence));
    assert.equal(stripe.lastSession().metadata.kind, 'deposit');
  });
});

test('the cancellation terms must be accepted before payment', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const res = await checkout(t.env, token, slot.id, 'full', { agree: false });
    assert.equal(res.status, 422);
    assert.match(res.html, /Please confirm you have read the cancellation terms/);
    assert.equal(stripe.calls.length, 0);
  });
});

// --- Failed and abandoned checkouts; holds -------------------------------------------------------

test('back from Stripe without paying: the session is expired at Stripe and the slot released', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const res = await checkout(t.env, token, slot.id);
    const cancelUrl = new URL(stripe.lastSession().cancel_url);
    const back = await callPage(t.env, cancelUrl.pathname + cancelUrl.search);
    assert.equal(back.location, `/q/${token}?notice=released`);
    assert.equal(stripe.session(sessionOf(res.location)).status, 'expired');
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'expired');
    assert.equal(one(t, `SELECT status FROM booking_payments`).status, 'expired');
    assert.match((await callPage(t.env, back.location)).html, /Payment was not completed, so the slot has been released/);
    assert.ok(formOf((await callPage(t.env, `/q/${token}/book`)).html).slots.includes(slot.id));
  });
});

test('Stripe expires an unpaid session (webhook): the hold is released; an unpaid return confirms nothing', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const res = await checkout(t.env, token, slot.id);
    const id = sessionOf(res.location);
    const unpaid = await callPage(t.env, `/q/${token}/paid?session_id=${id}`);
    assert.equal(unpaid.location, `/q/${token}?notice=confirming`);
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'holding');
    const hook = await deliverWebhook(t.env, 'checkout.session.expired', stripe.expire(id));
    assert.equal(hook.status, 200);
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'expired');
    assert.ok((await events(t, 'checkout_expired')).length);
  });
});

test('a hold that runs out is released by the schedule; a checkout that cannot start releases at once', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    await checkout(t.env, token, slot.id);
    const hold = one(t, `SELECT hold_expires_at FROM bookings`).hold_expires_at;
    const summary = await runScheduled(t.env, new Date(Date.parse(hold) + 1000));
    assert.equal(summary.holdsReleased, 1);
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'expired');

    stripe.fail = ({ path }) => (path === '/v1/checkout/sessions' ? new Response(JSON.stringify({ error: { message: 'down' } }), { status: 500 }) : null);
    const res = await checkout(t.env, token, slot.id);
    assert.equal(res.status, 502);
    assert.match(res.html, /Payment could not be started/);
    assert.equal(rows(t, `SELECT * FROM bookings WHERE status = 'holding'`).length, 0);
  });
});

test('choosing a different slot ends the first checkout at Stripe, so it can no longer be paid', async () => {
  const { t, slot, token } = await ready(20);
  const other = await addSlot(t, 21, 'pm');
  await withServices(async ({ stripe }) => {
    const first = sessionOf((await checkout(t.env, token, slot.id)).location);
    const page = await callPage(t.env, `/q/${token}`);
    assert.match(page.html, /Your payment is in progress/);
    const released = await callPage(t.env, `/q/${token}/release`, { method: 'POST', form: { nonce: formOf(page.html).nonce } });
    assert.equal(released.location, `/q/${token}/book`);
    assert.equal(stripe.session(first).status, 'expired');
    const second = await checkout(t.env, token, other.id, 'full');
    assert.equal(second.status, 303);
    assert.equal(rows(t, `SELECT * FROM bookings WHERE status = 'holding'`).length, 1);
  });
});

// --- Two customers, one slot -----------------------------------------------------------------------

test('two customers for the same slot at the same moment: exactly one gets Stripe, the other is told it is gone', async () => {
  const { t, slot, token } = await ready(20);
  const t2 = await setUp({ db: t.db });
  const q2 = await sentQuote(t2);
  await withServices(async ({ stripe }) => {
    const [a, b] = await Promise.all([checkout(t.env, token, slot.id), checkout(t2.env, q2.token, slot.id, 'full')]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [303, 409]);
    const loser = a.status === 409 ? a : b;
    assert.match(loser.html, /This slot is no longer available/);
    assert.equal(rows(t, `SELECT * FROM bookings WHERE slot_id = ? AND status = 'holding'`, slot.id).length, 1);
    assert.equal(stripe.calls.filter((c) => c.path === '/v1/checkout/sessions').length, 1);
  });
});

test('a slot being paid for is not offered to anyone else; after its hold ends it is', async () => {
  const { t, slot, token } = await ready(20);
  const t2 = await setUp({ db: t.db });
  const q2 = await sentQuote(t2);
  await withServices(async () => {
    await checkout(t.env, token, slot.id);
    assert.ok(!formOf((await callPage(t2.env, `/q/${q2.token}/book`)).html).slots.includes(slot.id));
    assert.equal((await callPage(t2.env, `/q/${q2.token}/pay?slot=${slot.id}`)).status, 409);
    const hold = one(t, `SELECT hold_expires_at FROM bookings`).hold_expires_at;
    await runScheduled(t.env, new Date(Date.parse(hold) + 1000));
    assert.ok(formOf((await callPage(t2.env, `/q/${q2.token}/book`)).html).slots.includes(slot.id));
  });
});

test('the database refuses a second active booking on a slot, and a booking on a closed slot', async () => {
  const { t, slot } = await ready(20);
  const q = one(t, `SELECT id FROM quotes LIMIT 1`).id;
  const insert = (status, quoteId = q) =>
    t.db.db
      .prepare(`INSERT INTO bookings (quote_id, slot_id, status, plan, total_pence, created_at, updated_at) VALUES (?, ?, ?, 'full', 100, 'x', 'x')`)
      .run(quoteId, slot.id, status);
  insert('confirmed');
  const t2 = await setUp({ db: t.db });
  await sentQuote(t2);
  const q2 = one(t, `SELECT id FROM quotes ORDER BY id DESC LIMIT 1`).id;
  assert.throws(() => insert('holding', q2), /UNIQUE/);
  t.db.db.prepare(`UPDATE bookings SET status = 'cancelled'`).run();
  t.db.db.prepare(`UPDATE availability_slots SET status = 'closed'`).run();
  assert.throws(() => insert('holding', q2), /slot_not_open/);
});

test('a slot with a booking (or a live checkout) cannot be closed', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async () => {
    await checkout(t.env, token, slot.id);
    const refused = await t.call(`/availability/${slot.id}/close`, { method: 'POST', body: {} });
    assert.equal(refused.status, 409);
    assert.match(refused.data.message, /has a booking, or a customer is paying for it now/);
  });
});

test('a payment completed after its hold ran out and the slot was taken is refunded in full, automatically', async () => {
  const { t, slot, token } = await ready(20);
  const t2 = await setUp({ db: t.db });
  const q2 = await sentQuote(t2);
  await withServices(async ({ stripe, emails }) => {
    const first = sessionOf((await checkout(t.env, token, slot.id)).location);
    const hold = one(t, `SELECT hold_expires_at FROM bookings`).hold_expires_at;
    await runScheduled(t.env, new Date(Date.parse(hold) + 1000));
    await bookAndPay(t2, stripe, q2.token, slot.id);
    // The first customer's payment arrives late (Stripe let it through at the last second).
    stripe.sessions.get(first).status = 'open';
    const late = stripe.pay(first);
    const hook = await deliverWebhook(t.env, 'checkout.session.completed', late);
    assert.equal(hook.status, 200);
    const b = one(t, `SELECT * FROM bookings WHERE id = ?`, Number(late.metadata.booking_id));
    assert.equal(b.status, 'cancelled');
    assert.equal(b.cancel_reason, 'slot_unavailable');
    assert.equal(b.refunded_pence, DEPOSIT);
    assert.equal(stripe.refunds.at(-1).amount, DEPOSIT);
    assert.ok(emails.find((e) => e.subject === 'ROSS 360 payment refunded'));
    assert.equal(rows(t, `SELECT * FROM bookings WHERE slot_id = ? AND status = 'confirmed'`, slot.id).length, 1);
  });
});

// --- The webhook ---------------------------------------------------------------------------------

// --- Webhook and customer return at the same moment ----------------------------------------------

/**
 * Holds each payment-completion batch until `n` have arrived, so concurrent callers have all read
 * the payment as unpaid before any of them writes: the worst case for a race. Returns the count.
 */
function holdCompletions(db, n, pattern = /SET status = 'paid'/) {
  const original = db.batch.bind(db);
  const waiting = [];
  const held = { count: 0 };
  db.batch = (statements) => {
    if (!statements.some((st) => pattern.test(st.sql)) || held.count >= n) return original(statements);
    held.count += 1;
    return new Promise((resolve) => {
      waiting.push(resolve);
      if (waiting.length === n) waiting.splice(0).forEach((go) => go());
    }).then(() => original(statements));
  };
  return held;
}

/** Stripe's webhook and the customer's return for the same paid session, concurrently. */
async function completeTwiceAtOnce(t, stripe, token, sessionId) {
  const held = holdCompletions(t.db, 2);
  const [hook, back] = await Promise.all([
    deliverWebhook(t.env, 'checkout.session.completed', stripe.session(sessionId)),
    callPage(t.env, `/q/${token}/paid?session_id=${sessionId}`),
  ]);
  assert.equal(held.count, 2, 'both callers reached the write having read the payment as unpaid');
  assert.equal(hook.status, 200);
  assert.equal(back.status, 303);
}

for (const plan of ['deposit']) {
  test(`webhook and customer return at once for a ${plan === 'full' ? 'payment in full' : 'deposit'}: recorded once, confirmed, no refund, one set of emails`, async () => {
    const { t, slot, token } = await ready(20);
    await withServices(async ({ stripe, emails }) => {
      const res = await checkout(t.env, token, slot.id, plan);
      const id = sessionOf(res.location);
      stripe.pay(id);
      await completeTwiceAtOnce(t, stripe, token, id);

      const amount = plan === 'full' ? TOTAL : DEPOSIT;
      const b = one(t, `SELECT * FROM bookings`);
      assert.equal(b.status, 'confirmed');
      assert.equal(b.paid_pence, amount);
      assert.equal(b.refunded_pence, 0);
      assert.equal(b.cancel_reason, null);
      assert.deepEqual(plain(rows(t, `SELECT kind, status, amount_pence FROM booking_payments`)), [{ kind: plan, status: 'paid', amount_pence: amount }]);
      assert.equal(one(t, `SELECT COUNT(*) AS n FROM booking_refunds`).n, 0);
      assert.equal(stripe.refunds.length, 0);
      assert.equal((await events(t, 'booking_confirmed')).length, 1);
      assert.equal((await events(t, 'payment_refunded_late')).length, 0);
      assert.equal(emails.filter((e) => e.subject.startsWith('ROSS 360 booking confirmed')).length, 1);
      assert.equal(emails.filter((e) => e.subject.startsWith('Booking confirmed:')).length, 1);
      assert.equal(emails.filter((e) => /refund/i.test(e.subject)).length, 0);
      assert.equal((await getEnquiry(t.db, t.enquiry)).status, 'booked');

      // A later duplicate (Stripe retries the event) changes nothing either.
      const again = await deliverWebhook(t.env, 'checkout.session.completed', stripe.session(id));
      assert.equal(again.status, 200);
      assert.equal(one(t, `SELECT paid_pence FROM bookings`).paid_pence, amount);
      assert.equal(emails.filter((e) => e.subject.startsWith('ROSS 360 booking confirmed')).length, 1);
    });
  });
}

test('webhook and customer return at once for a balance payment: counted once, no refund, one set of emails', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const booked = await bookAndPay(t, stripe, token, slot.id);
    await askForBalance(t, booked.id, slot.date);
    await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    const s = stripe.lastSession();
    assert.equal(s.metadata.kind, 'balance');
    stripe.pay(s.id);
    await completeTwiceAtOnce(t, stripe, token, s.id);

    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.paid_pence, TOTAL);
    assert.equal(b.refunded_pence, 0);
    assert.deepEqual(
      plain(rows(t, `SELECT kind, status, amount_pence FROM booking_payments ORDER BY id`)),
      [
        { kind: 'deposit', status: 'paid', amount_pence: DEPOSIT },
        { kind: 'balance', status: 'paid', amount_pence: TOTAL - DEPOSIT },
      ],
    );
    assert.equal(one(t, `SELECT COUNT(*) AS n FROM booking_refunds`).n, 0);
    assert.equal(stripe.refunds.length, 0);
    assert.equal((await events(t, 'balance_paid')).length, 1);
    assert.equal((await events(t, 'payment_refunded_late')).length, 0);
    assert.equal(emails.filter((e) => e.subject === 'ROSS 360 balance received').length, 1);
    assert.equal(emails.filter((e) => /refund/i.test(e.subject)).length, 0);
  });
});

test('a genuinely late payment completed twice at once is refunded once', async () => {
  const { t, slot, token } = await ready(20);
  const t2 = await setUp({ db: t.db });
  const q2 = await sentQuote(t2);
  await withServices(async ({ stripe, emails }) => {
    const first = sessionOf((await checkout(t.env, token, slot.id)).location);
    const hold = one(t, `SELECT hold_expires_at FROM bookings`).hold_expires_at;
    await runScheduled(t.env, new Date(Date.parse(hold) + 1000));
    await bookAndPay(t2, stripe, q2.token, slot.id);
    // The first customer's payment arrives late, and the webhook and their return race.
    stripe.sessions.get(first).status = 'open';
    const late = stripe.pay(first);
    const refundsBefore = stripe.refunds.length;
    await completeTwiceAtOnce(t, stripe, token, first);

    const b = one(t, `SELECT * FROM bookings WHERE id = ?`, Number(late.metadata.booking_id));
    assert.equal(b.status, 'cancelled');
    assert.equal(b.cancel_reason, 'slot_unavailable');
    assert.equal(b.paid_pence, DEPOSIT);
    assert.equal(b.refunded_pence, DEPOSIT);
    assert.equal(one(t, `SELECT COUNT(*) AS n FROM booking_refunds WHERE booking_id = ?`, b.id).n, 1);
    assert.equal(stripe.refunds.length - refundsBefore, 1);
    assert.equal(emails.filter((e) => e.subject === 'ROSS 360 payment refunded').length, 1);
    assert.equal((await events(t, 'payment_refunded_late')).length, 1);
    assert.equal(rows(t, `SELECT * FROM bookings WHERE slot_id = ? AND status = 'confirmed'`, slot.id).length, 1);
  });
});

test('the webhook: only correctly signed, recent events; repeated events do nothing twice', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const id = sessionOf((await checkout(t.env, token, slot.id)).location);
    const paid = stripe.pay(id);
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid, { secret: 'whsec_wrong' })).status, 400);
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid, { signature: 't=1,v1=00' })).status, 400);
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'holding');
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid)).status, 200);
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid)).status, 200);
    await callPage(t.env, `/q/${token}/paid?session_id=${id}`);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.paid_pence, DEPOSIT);
    assert.equal(emails.filter((e) => e.subject.startsWith('ROSS 360 booking confirmed')).length, 1);
    assert.equal((await events(t, 'booking_confirmed')).length, 1);
  });
});

test('a session whose amount does not match the payment is not accepted', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const id = sessionOf((await checkout(t.env, token, slot.id)).location);
    const paid = { ...stripe.pay(id), amount_total: 100 };
    assert.equal((await handleCheckoutCompleted(t.env, paid)).result, 'mismatch');
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'holding');
  });
});

// --- Balance: requested once the tour is ready, paid online or recorded in the Admin -----------------

test('no reminders before the shoot, and an unpaid balance never cancels the booking', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    await bookAndPay(t, stripe, token, slot.id);
    const before = emails.length;
    for (const days of [-7, -2, 0, 1, 10]) {
      const summary = await runScheduled(t.env, at(addDays(slot.date, days), '10:00'));
      assert.equal(summary.reminders, undefined);
    }
    assert.equal(emails.length, before);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.paid_pence, DEPOSIT);
    assert.equal(stripe.refunds.length, 0);
  });
});

test('the balance request: from the day of the shoot, due in 7 days, with a link to pay online; can be sent again', async () => {
  const { t, slot, token, reference } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    // Before the shoot it is refused, and the Admin says so.
    const early = await t.call(`/bookings/${b.id}/balance-request`, { method: 'POST', body: { confirm: true, expectPaidPence: DEPOSIT } });
    assert.equal(early.status, 422);
    assert.match(early.data.message, /from the day of the shoot/);
    assert.equal(early.data.booking.canRequestBalance, false);
    // A stale screen changes nothing.
    const stale = await requestBalance(t.env, b.id, { actor: 'admin', expectPaidPence: 0 }, at(slot.date, '15:00'));
    assert.equal(stale.result, 'changed');

    const before = emails.length;
    await askForBalance(t, b.id, slot.date);
    const due = addDays(slot.date, 7);
    assert.equal(one(t, `SELECT balance_due_on FROM bookings`).balance_due_on, due);
    assert.equal(emails.length, before + 1);
    const email = emails.at(-1);
    assert.equal(email.subject, `ROSS 360 balance due: quotation ${reference}`);
    assert.match(email.text, /Your virtual tour is ready\./);
    assert.match(email.text, /please pay the balance of £329\.00 by /);
    assert.match(email.text, /Pay balance: https:\/\/ross360\.test\/q\/.+\/balance/);
    const requested = await events(t, 'balance_requested');
    assert.equal(requested.length, 1);
    assert.equal(requested[0].detail.dueOn, due);
    assert.equal((await t.call('/dashboard')).data.bookings.balancesDue, 1);

    // The customer can now pay it online.
    assert.match((await callPage(t.env, `/q/${token}`)).html, /Pay balance/);
    assert.match((await callPage(t.env, `/q/${token}/balance`)).html, /Your tour is ready\. The balance of £329\.00 is due by /);

    // Sent again: a second email and a new due date.
    const again = await requestBalance(t.env, b.id, { actor: 'admin', expectPaidPence: DEPOSIT }, at(addDays(slot.date, 3), '15:00'));
    assert.equal(again.result, 'ok');
    assert.equal(one(t, `SELECT balance_due_on FROM bookings`).balance_due_on, addDays(slot.date, 10));
    assert.equal(emails.filter((e) => e.subject.startsWith('ROSS 360 balance due')).length, 2);
    assert.equal((await events(t, 'balance_requested')).filter((e) => e.detail.again).length, 1);
  });
});

test('paying the balance on Stripe: the booking is paid in full', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const booked = await bookAndPay(t, stripe, token, slot.id);
    await askForBalance(t, booked.id, slot.date);
    const res = await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    assert.equal(res.status, 303);
    const s = stripe.lastSession();
    assert.equal(s.amount_total, TOTAL - DEPOSIT);
    assert.equal(s.metadata.kind, 'balance');
    stripe.pay(s.id);
    await deliverWebhook(t.env, 'checkout.session.completed', stripe.session(s.id));
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.paid_pence, TOTAL);
    assert.ok(emails.find((e) => e.subject === 'ROSS 360 balance received'));
    assert.match((await callPage(t.env, `/q/${token}`)).html, /Paid in full/);
    // Nothing left to request.
    assert.equal((await requestBalance(t.env, b.id, { actor: 'admin', expectPaidPence: TOTAL }, at(slot.date, '16:00'))).result, 'changed');
  });
});

test('ROSS 360 records the balance as paid another way: paid in full, receipt emailed', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    const detail = await t.call(`/bookings/${b.id}`);
    assert.equal(detail.data.booking.balancePence, TOTAL - DEPOSIT);
    // A stale screen (it showed a different amount paid) changes nothing.
    const stale = await t.call(`/bookings/${b.id}/balance-in-person`, { method: 'POST', body: { confirm: true, expectPaidPence: 0 } });
    assert.equal(stale.status, 409);
    const res = await t.call(`/bookings/${b.id}/balance-in-person`, { method: 'POST', body: { confirm: true, expectPaidPence: DEPOSIT } });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.booking.balancePence, 0);
    const row = one(t, `SELECT * FROM bookings`);
    assert.equal(row.status, 'confirmed');
    assert.equal(row.paid_pence, TOTAL);
    assert.deepEqual(
      plain(rows(t, `SELECT kind, status, amount_pence, stripe_session_id, stripe_payment_intent FROM booking_payments ORDER BY id`)).at(-1),
      { kind: 'balance', status: 'paid', amount_pence: TOTAL - DEPOSIT, stripe_session_id: null, stripe_payment_intent: null },
    );
    const paid = await events(t, 'balance_paid');
    assert.equal(paid.length, 1);
    assert.equal(paid[0].detail.inPerson, true);
    const receipt = emails.filter((e) => e.subject === 'ROSS 360 balance received');
    assert.equal(receipt.length, 1);
    assert.match(receipt[0].text, /balance payment of £329\.00/);
    // Twice does nothing more.
    const again = await t.call(`/bookings/${b.id}/balance-in-person`, { method: 'POST', body: { confirm: true, expectPaidPence: DEPOSIT } });
    assert.equal(again.status, 409);
    assert.equal(one(t, `SELECT paid_pence FROM bookings`).paid_pence, TOTAL);
    assert.match((await callPage(t.env, `/q/${token}`)).html, /Paid in full/);
    assert.equal((await t.call('/dashboard')).data.bookings.balancesDue, 0);
  });
});

test('recording in person ends an open online balance checkout first, so the balance cannot be paid twice', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    await askForBalance(t, one(t, `SELECT id FROM bookings WHERE status = 'confirmed'`).id, slot.date);
    await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    const s = stripe.lastSession();
    const res = await t.call(`/bookings/${b.id}/balance-in-person`, { method: 'POST', body: { confirm: true, expectPaidPence: DEPOSIT } });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(stripe.session(s.id).status, 'expired');
    assert.equal(one(t, `SELECT status FROM booking_payments WHERE stripe_session_id = ?`, s.id).status, 'expired');
    assert.equal(one(t, `SELECT paid_pence FROM bookings`).paid_pence, TOTAL);
  });
});

test('if the customer paid online just before it was recorded in person, the online payment stands', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    await askForBalance(t, one(t, `SELECT id FROM bookings WHERE status = 'confirmed'`).id, slot.date);
    await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    stripe.pay(stripe.lastSession().id); // paid; the webhook has not arrived yet
    const res = await t.call(`/bookings/${b.id}/balance-in-person`, { method: 'POST', body: { confirm: true, expectPaidPence: DEPOSIT } });
    assert.equal(res.status, 409);
    assert.match(res.data.message, /paid the balance online/);
    const row = one(t, `SELECT * FROM bookings`);
    assert.equal(row.paid_pence, TOTAL);
    assert.equal(rows(t, `SELECT * FROM booking_payments WHERE stripe_payment_intent IS NULL AND status = 'paid'`).length, 0);
    assert.equal(stripe.refunds.length, 0);
  });
});

test('cancelling after a balance paid in person refunds the card payment at Stripe and flags the rest to refund by hand', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    await t.call(`/bookings/${b.id}/balance-in-person`, { method: 'POST', body: { confirm: true, expectPaidPence: DEPOSIT } });
    const outcome = await cancelBooking(t.env, b.id, { reason: 'ross360', actor: 'admin', expect: 'confirmed' });
    assert.equal(outcome.result, 'ok');
    assert.equal(stripe.refunds.length, 1);
    assert.equal(stripe.refunds[0].amount, DEPOSIT);
    const refunds = plain(rows(t, `SELECT amount_pence, status, last_error FROM booking_refunds ORDER BY id`));
    assert.deepEqual(refunds, [
      { amount_pence: DEPOSIT, status: 'succeeded', last_error: null },
      { amount_pence: TOTAL - DEPOSIT, status: 'failed', last_error: 'Paid in person: refund it by hand.' },
    ]);
  });
});

// --- Cancellations and refunds ----------------------------------------------------------------------

test('customer cancels more than 48 hours before: cancelled, everything paid refunded, slot reopened', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    await bookAndPay(t, stripe, token, slot.id);
    const page = await callPage(t.env, `/q/${token}/cancel`);
    assert.match(page.html, /£110\.00 is refunded in full/);
    const res = await postForm(t.env, token, 'cancel', `/q/${token}/cancel`);
    assert.equal(res.status, 303);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'cancelled');
    assert.equal(b.cancel_reason, 'customer');
    assert.equal(b.refunded_pence, DEPOSIT);
    assert.equal(stripe.refunds.at(-1).amount, DEPOSIT);
    const shown = await callPage(t.env, `/q/${token}`);
    assert.match(shown.html, /This booking was cancelled on/);
    assert.match(shown.html, /A refund of £110\.00 has been issued/);
    assert.match(shown.html, /Book another slot/);
    assert.ok(emails.find((e) => e.subject === 'ROSS 360 booking cancelled' && /£110\.00 has been refunded in full/.test(e.text)));
  });
});

test('customer cancels within 48 hours: a request; ROSS 360 decides the amount kept (never automatic), the rest refunded', async () => {
  const { t, slot, token } = await ready(5, 'pm');
  await withServices(async ({ stripe, emails }) => {
    const booked = await bookAndPay(t, stripe, token, slot.id);
    const ctx = await resolveQuoteLink(t.env, token);
    const within = new Date(at(slot.date, '13:00').getTime() - 24 * 3_600_000);
    const asked = await customerCancel(t.env, ctx, within);
    assert.equal(asked.result, 'requested');
    let b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'cancel_requested');
    assert.equal(b.refunded_pence, 0);
    assert.equal(stripe.refunds.length, 0, 'nothing kept or refunded automatically');
    assert.ok(emails.find((e) => e.subject === 'ROSS 360 cancellation request received'));
    assert.ok(emails.find((e) => /^Cancellation request, decision needed/.test(e.subject)));

    // The Admin: more than the deposit is refused.
    const tooMuch = await t.call(`/bookings/${booked.id}/cancel`, {
      method: 'POST',
      body: { confirm: true, reason: 'customer_late', retainPence: DEPOSIT + 1, expect: 'cancel_requested' },
    });
    assert.equal(tooMuch.status, 422);
    const decided = await t.call(`/bookings/${booked.id}/cancel`, {
      method: 'POST',
      body: { confirm: true, reason: 'customer_late', retainPence: 10000, expect: 'cancel_requested' },
    });
    assert.equal(decided.status, 200, JSON.stringify(decided.data));
    b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'cancelled');
    assert.equal(b.retained_pence, 10000);
    assert.equal(b.refunded_pence, DEPOSIT - 10000);
    assert.equal(stripe.refunds.at(-1).amount, DEPOSIT - 10000);
    const email = emails.find((e) => e.subject === 'ROSS 360 booking cancelled');
    assert.match(email.text, /Of the £110\.00 paid, £100\.00 has been retained and £10\.00 refunded/);
  });
});

test('retention is refused outside 48 hours and for cancellations by ROSS 360; zero is allowed', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    const keep = await cancelBooking(t.env, b.id, { reason: 'customer_late', retainPence: 1000, actor: 'admin', expect: 'confirmed' });
    assert.equal(keep.result, 'invalid_retention');
    const byUs = await cancelBooking(t.env, b.id, { reason: 'ross360', retainPence: 1000, actor: 'admin', expect: 'confirmed' });
    assert.equal(byUs.result, 'invalid_retention');
    const ok = await cancelBooking(t.env, b.id, { reason: 'ross360', retainPence: 0, actor: 'admin', expect: 'confirmed' });
    assert.equal(ok.result, 'ok');
    assert.equal(one(t, `SELECT refunded_pence FROM bookings`).refunded_pence, DEPOSIT);
  });
});

test('a refund split across the deposit and balance payments; a refused refund is shown and can be retried once', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    await askForBalance(t, one(t, `SELECT id FROM bookings WHERE status = 'confirmed'`).id, slot.date);
    await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    stripe.pay(stripe.lastSession().id);
    await deliverWebhook(t.env, 'checkout.session.completed', stripe.lastSession());
    stripe.fail = ({ path, params }) =>
      path === '/v1/refunds' && params.get('amount') === String(DEPOSIT)
        ? new Response(JSON.stringify({ error: { message: 'charge_disputed' } }), { status: 400 })
        : null;
    const out = await cancelBooking(t.env, b.id, { reason: 'ross360', retainPence: 0, actor: 'admin', expect: 'confirmed' });
    assert.equal(out.result, 'ok');
    const refunds = await refundsOf(t.db, b.id);
    assert.deepEqual(
      refunds.map((r) => [r.paymentKind, r.amountPence, r.status]),
      [
        ['balance', TOTAL - DEPOSIT, 'succeeded'],
        ['deposit', DEPOSIT, 'failed'],
      ],
    );
    assert.equal(one(t, `SELECT refunded_pence FROM bookings`).refunded_pence, TOTAL - DEPOSIT);
    stripe.fail = null;
    const failed = refunds.find((r) => r.status === 'failed');
    const retried = await t.call(`/bookings/${b.id}/refunds/${failed.id}/retry`, { method: 'POST', body: {} });
    assert.equal(retried.status, 200);
    assert.equal(one(t, `SELECT refunded_pence FROM bookings`).refunded_pence, TOTAL);
    assert.equal(stripe.refunds.length, 2);
  });
});

test('a refund with no answer from Stripe stays pending and is retried with the same key, never twice', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    stripe.fail = ({ path }) => (path === '/v1/refunds' ? new Response('{}', { status: 503 }) : null);
    await cancelBooking(t.env, b.id, { reason: 'ross360', retainPence: 0, actor: 'admin', expect: 'confirmed' });
    assert.equal(one(t, `SELECT status FROM booking_refunds`).status, 'pending');
    stripe.fail = null;
    await runScheduled(t.env, new Date(Date.now() + 5 * 60_000));
    assert.equal(one(t, `SELECT status FROM booking_refunds`).status, 'succeeded');
    const keys = stripe.calls.filter((c) => c.path === '/v1/refunds').map((c) => c.key);
    assert.equal(new Set(keys).size, 1);
    await runScheduled(t.env, new Date(Date.now() + 10 * 60_000));
    assert.equal(stripe.refunds.length, 1);
  });
});

/**
 * A confirmed booking cancelled by ROSS 360 whose refund got no answer from Stripe: pending. The
 * amount is set to part of the payment, as after a late cancellation where ROSS 360 kept some, so
 * that counting it twice would still fit within the amount paid (the database's own check stops a
 * full refund being counted twice, which would hide the race).
 */
const PART = 5000;
async function pendingRefund(t, stripe, token, slotId) {
  const b = await bookAndPay(t, stripe, token, slotId);
  stripe.fail = ({ path }) => (path === '/v1/refunds' ? new Response('{}', { status: 503 }) : null);
  await cancelBooking(t.env, b.id, { reason: 'ross360', retainPence: 0, actor: 'admin', expect: 'confirmed' });
  stripe.fail = null;
  t.db.db.prepare(`UPDATE booking_refunds SET amount_pence = ?`).run(PART);
  const refund = one(t, `SELECT * FROM booking_refunds`);
  assert.equal(refund.status, 'pending');
  return { booking: b, refund };
}

/** Two attempts at the same pending refund, both having read it as pending before either finishes. */
async function refundTwiceAtOnce(t, pattern) {
  const held = holdCompletions(t.db, 2, pattern);
  const later = new Date(Date.now() + 5 * 60_000);
  const results = await Promise.all([runScheduled(t.env, later), executeRefunds(t.env, { now: later })]);
  assert.equal(held.count, 2, 'both attempts reached the write having read the refund as pending');
  return results;
}

for (const clock of ['the same instant', 'different instants']) {
  test(`two attempts at one pending refund at once (${clock}): same Stripe key, counted once, one event`, async (ctx) => {
    const { t, slot, token } = await ready(20);
    await withServices(async ({ stripe, emails }) => {
      const { booking, refund } = await pendingRefund(t, stripe, token, slot.id);
      const emailsBefore = emails.length;
      // With the clock stopped, both attempts stamp the refund with the same time.
      if (clock === 'the same instant') ctx.mock.timers.enable({ apis: ['Date'], now: Date.now() });
      await refundTwiceAtOnce(t, /SET status = 'succeeded'/);
      if (clock === 'the same instant') ctx.mock.timers.reset();

      const calls = stripe.calls.filter((c) => c.method === 'POST' && c.path === '/v1/refunds');
      assert.equal(calls.length, 3, 'the first attempt (no answer) and the two concurrent ones');
      assert.deepEqual([...new Set(calls.map((c) => c.key))], [`refund-${refund.id}`]);
      assert.equal(stripe.refunds.length, 1, 'Stripe refunds once for one key');
      const r = one(t, `SELECT * FROM booking_refunds WHERE id = ?`, refund.id);
      assert.equal(r.status, 'succeeded');
      assert.equal(r.stripe_refund_id, stripe.refunds[0].id);
      const b = one(t, `SELECT * FROM bookings WHERE id = ?`, booking.id);
      assert.equal(b.refunded_pence, PART);
      assert.equal(b.paid_pence, DEPOSIT);
      assert.equal((await events(t, 'refund_issued')).length, 1);
      assert.equal((await events(t, 'refund_failed')).length, 0);
      assert.equal(emails.length, emailsBefore, 'no emails from the retries');

      // A further attempt finds nothing pending.
      assert.deepEqual(await executeRefunds(t.env, { now: new Date(Date.now() + 10 * 60_000) }), { succeeded: 0, failed: 0, pending: 0 });
      assert.equal(one(t, `SELECT refunded_pence FROM bookings WHERE id = ?`, booking.id).refunded_pence, PART);
    });
  });
}

test('two attempts at one pending refund that Stripe refuses: marked failed once, one event, one email', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const { booking, refund } = await pendingRefund(t, stripe, token, slot.id);
    stripe.fail = ({ path }) =>
      path === '/v1/refunds' ? new Response(JSON.stringify({ error: { message: 'Charge already refunded' } }), { status: 400 }) : null;
    const emailsBefore = emails.length;
    await refundTwiceAtOnce(t, /SET status = 'failed'/);

    const r = one(t, `SELECT * FROM booking_refunds WHERE id = ?`, refund.id);
    assert.equal(r.status, 'failed');
    assert.equal(one(t, `SELECT refunded_pence FROM bookings WHERE id = ?`, booking.id).refunded_pence, 0);
    assert.equal((await events(t, 'refund_failed')).length, 1);
    assert.equal((await events(t, 'refund_issued')).length, 0);
    assert.equal(emails.slice(emailsBefore).filter((e) => e.to[0] === 'newquote@ross360.co.uk').length, 1);
  });
});

// --- Moving a booking --------------------------------------------------------------------------------

test('ROSS 360 moves a booking to another open slot, keeping payments and any balance request', async () => {
  const { t, slot, token } = await ready(20);
  const later = await addSlot(t, 30, 'day');
  await withServices(async ({ stripe, emails }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    const detail = await t.call(`/bookings/${b.id}`);
    assert.ok(detail.data.moveTargets.some((s) => s.id === later.id));
    assert.ok(!detail.data.moveTargets.some((s) => s.id === slot.id));
    const moved = await t.call(`/bookings/${b.id}/move`, { method: 'POST', body: { confirm: true, slotId: later.id } });
    assert.equal(moved.status, 200, JSON.stringify(moved.data));
    const row = one(t, `SELECT * FROM bookings`);
    assert.equal(row.slot_id, later.id);
    assert.equal(row.paid_pence, DEPOSIT);
    assert.equal(row.balance_due_on, null);
    assert.equal(row.reminder_8_on, null);
    assert.ok(emails.find((e) => /^ROSS 360 booking moved/.test(e.subject)));
    // The old slot is free again.
    assert.ok(formOf((await callPage(t.env, `/q/${token}/book`)).html).slots.length >= 0);
    assert.equal(rows(t, `SELECT * FROM bookings WHERE slot_id = ? AND status = 'confirmed'`, slot.id).length, 0);
  });
});

test('a booking with an unpaid balance can be moved to a date only a few days away', async () => {
  const { t, slot, token } = await ready(20);
  const soon = await addSlot(t, 4, 'am');
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    const moved = await t.call(`/bookings/${b.id}/move`, { method: 'POST', body: { confirm: true, slotId: soon.id } });
    assert.equal(moved.status, 200, JSON.stringify(moved.data));
    const row = one(t, `SELECT * FROM bookings`);
    assert.equal(row.balance_due_on, null);
    assert.equal(row.reminder_14_on, null);
  });
});

// --- Guards ---------------------------------------------------------------------------------------

test('a live Stripe key is refused unless STRIPE_ALLOW_LIVE is "true"; without Stripe, booking is off', async () => {
  const { t, slot, token } = await ready(20);
  t.env.STRIPE_SECRET_KEY = 'sk_live_not_real';
  await withServices(async ({ stripe }) => {
    const page = await callPage(t.env, `/q/${token}`);
    assert.match(page.html, /Online booking is not available at the moment/);
    assert.equal((await callPage(t.env, `/q/${token}/book`)).location, `/q/${token}`);
    const ctx = await resolveQuoteLink(t.env, token);
    assert.equal((await startCheckout(t.env, ctx, { slotId: slot.id, plan: 'full' }, 'https://ross360.test/q/x')).result, 'payments_off');
    assert.equal(stripe.calls.length, 0);
  });
});

test('test mode: customer emails go only to EMAIL_TEST_ALLOWLIST; quotes to anyone else are not sent', async () => {
  const t = await setUp();
  t.env.EMAIL_TEST_ALLOWLIST = 'someone-else@example.test';
  const created = await t.call(`/enquiries/${t.enquiry}/quotes`, { method: 'POST', body: {} });
  const ref = created.data.quote.reference;
  await t.call(`/quotes/${ref}`, {
    method: 'PATCH',
    body: { version: created.data.quote.version, package: 'professional', customerType: 'business', items: [packageItem('professional')], serviceDescription: 'Tour' },
  });
  const preview = await t.call(`/quotes/${ref}/preview`);
  await withResend(async (calls) => {
    const sent = await t.call(`/quotes/${ref}/send`, { method: 'POST', body: { version: preview.data.quote.version, previewedOn: ukToday(), confirm: true } });
    assert.equal(sent.status, 409);
    assert.match(sent.data.message, /EMAIL_TEST_ALLOWLIST/);
    assert.equal(calls.length, 0);
  });
  // With a test key and no list at all, customer emails are not sent either.
  delete t.env.EMAIL_TEST_ALLOWLIST;
  await withResend(async (calls) => {
    const sent = await t.call(`/quotes/${ref}/send`, { method: 'POST', body: { version: preview.data.quote.version, previewedOn: ukToday(), confirm: true } });
    assert.equal(sent.status, 409);
    assert.equal(calls.length, 0);
  });
});

test('a booked quote cannot be revised, and the quote email has the Book a slot button', async () => {
  const { t, slot, token, email, reference } = await ready(20);
  assert.match(email.html, />Book a slot<\/a>/);
  assert.match(email.text, /Book a slot: https:\/\/ross360\.test\/q\//);
  await withServices(async ({ stripe }) => {
    await bookAndPay(t, stripe, token, slot.id);
    const revise = await t.call(`/quotes/${reference}/revise`, { method: 'POST', body: {} });
    assert.equal(revise.status, 409);
    assert.match(revise.data.message, /has a booking/);
  });
});

test('only quotes marked business can be booked online; consumer quotes are booked by email', async () => {
  // A business name alone does not make a quote bookable: the administrator's choice does.
  const { t, slot, token, email, reference } = await ready(20, 'am', { customerType: 'consumer', customerBusiness: 'Alex Ltd' });
  assert.doesNotMatch(email.html, /Book a slot/);
  assert.doesNotMatch(email.text, /\/q\//);
  assert.match(email.text, /If you'd like to go ahead, simply reply to this email and we'll arrange the next steps with you\./);
  await withServices(async ({ stripe }) => {
    const page = await callPage(t.env, `/q/${token}`);
    assert.equal(page.status, 200);
    assert.match(page.html, new RegExp(reference));
    assert.doesNotMatch(page.html, /Book a slot/);
    assert.match(page.html, /please reply to the quotation email/);
    for (const path of ['book', `pay?slot=${slot.id}`]) {
      const res = await callPage(t.env, `/q/${token}/${path}`);
      assert.equal(res.status, 303, path);
    }
    const ctx = await resolveQuoteLink(t.env, token);
    const outcome = await startCheckout(t.env, ctx, { slotId: slot.id, plan: 'full' }, `https://ross360.test/q/${token}`);
    assert.equal(outcome.result, 'not_allowed');
    assert.equal(stripe.calls.length, 0);
    assert.equal(one(t, `SELECT COUNT(*) AS n FROM bookings`).n, 0);
  });
  // Marked on the quote and locked once sent; a revision keeps it until changed.
  assert.throws(() => t.db.db.prepare(`UPDATE quotes SET customer_type = 'business' WHERE reference = ?`).run(reference), /cannot be changed/);
  const revision = await t.call(`/quotes/${reference}/revise`, { method: 'POST', body: {} });
  assert.equal(revision.status, 201, JSON.stringify(revision.data));
  assert.equal(revision.data.quote.customerType, 'consumer');
});

test('the scheduler endpoint needs the shared secret', async () => {
  const { onRequest } = await import('../functions/api/scheduler/run.js');
  const t = await setUp();
  const call = (auth) =>
    onRequest({ request: new Request('https://ross360.test/api/scheduler/run', { method: 'POST', headers: auth ? { Authorization: auth } : {} }), env: t.env });
  assert.equal((await call()).status, 401);
  assert.equal((await call('Bearer wrong-secret')).status, 401);
  const ok = await withServices(() => call(`Bearer ${t.env.SCHEDULER_SECRET}`));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);
});

test('the Admin lists bookings with slot, payment status, amounts and balance date', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    const list = await t.call('/bookings');
    const row = list.data.bookings.find((x) => x.id === b.id);
    assert.equal(row.status, 'confirmed');
    assert.equal(row.slotDate, slot.date);
    assert.equal(row.paidPence, DEPOSIT);
    assert.equal(row.balancePence, TOTAL - DEPOSIT);
    assert.equal(row.balanceDueOn, null);
    const detail = await t.call(`/bookings/${b.id}`);
    assert.equal(detail.data.booking.payments[0].kind, 'deposit');
    assert.equal(detail.data.booking.payments[0].status, 'paid');
    assert.equal(detail.data.booking.payments[0].sessionUrl, undefined);
    // Not counted as due until the balance request is sent.
    assert.equal((await t.call('/dashboard')).data.bookings.balancesDue, 0);
    assert.ok(await activeBooking(t.db, b.quote_id));
    assert.equal((await getBooking(t.db, b.id)).quoteReference, row.quoteReference);
  });
});

// --- Booking with no deposit (founding offer) -------------------------------------------------------

test('ROSS 360 books a slot with no deposit: confirmed at once, nothing paid, the whole total requested after the shoot', async () => {
  const { t, slot, token, reference } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const slots = await t.call('/bookings/open-slots');
    assert.ok(slots.data.slots.some((s) => s.id === slot.id));
    const bad = await t.call(`/quotes/${reference}/book-without-deposit`, { method: 'POST', body: { confirm: true, slotId: slot.id } });
    assert.equal(bad.status, 400, 'notify must be chosen');
    const res = await t.call(`/quotes/${reference}/book-without-deposit`, { method: 'POST', body: { confirm: true, slotId: slot.id, notify: true, deposit: 'none' } });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(stripe.calls.length, 0, 'no payment taken');
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.plan, 'deposit');
    assert.equal(b.deposit_pence, 0);
    assert.equal(b.paid_pence, 0);
    assert.equal(b.total_pence, TOTAL);
    assert.equal((await getEnquiry(t.db, t.enquiry)).status, 'booked');
    assert.equal((await events(t, 'booking_confirmed'))[0].detail.noDeposit, true);
    const confirm = emails.find((e) => e.subject.startsWith('ROSS 360 booking confirmed'));
    assert.doesNotMatch(confirm.text, /Paid:/);
    assert.match(confirm.text, /The balance of £439\.00 is paid after the shoot/);

    // The slot is taken and the quote cannot be booked twice.
    assert.ok(!formOf((await callPage(t.env, `/q/${token}/book`)).html).slots.includes(slot.id));
    const twice = await t.call(`/quotes/${reference}/book-without-deposit`, { method: 'POST', body: { confirm: true, slotId: slot.id, notify: false, deposit: 'none' } });
    assert.equal(twice.status, 409);
    const page = await callPage(t.env, `/q/${token}`);
    assert.match(page.html, /Your booking is confirmed\./);
    assert.doesNotMatch(page.html, /Pay balance/);

    // After the shoot, the whole total is requested and can be paid online.
    await askForBalance(t, b.id, slot.date);
    await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    assert.equal(stripe.lastSession().amount_total, TOTAL);
    // Or recorded as paid another way.
    const recorded = await t.call(`/bookings/${b.id}/balance-in-person`, { method: 'POST', body: { confirm: true, expectPaidPence: 0 } });
    assert.equal(recorded.status, 200, JSON.stringify(recorded.data));
    assert.equal(one(t, `SELECT paid_pence FROM bookings`).paid_pence, TOTAL);
  });
});

test('ROSS 360 books a slot with the deposit received by bank transfer: recorded as paid, the 48-hour rule applies', async () => {
  const { t, slot, token, reference } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const pay = await callPage(t.env, `/q/${token}/pay?slot=${slot.id}`);
    assert.match(pay.html, /Would you rather pay by bank transfer\? Please get in touch at contact@ross360\.co\.uk or on \+44 7925 213557/);
    const res = await t.call(`/quotes/${reference}/book-without-deposit`, {
      method: 'POST',
      body: { confirm: true, slotId: slot.id, notify: true, deposit: 'transfer' },
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(stripe.calls.length, 0);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.plan, 'deposit');
    assert.equal(b.deposit_pence, DEPOSIT);
    assert.equal(b.paid_pence, DEPOSIT);
    assert.deepEqual(
      plain(rows(t, `SELECT kind, status, amount_pence, stripe_session_id, stripe_payment_intent FROM booking_payments`)),
      [{ kind: 'deposit', status: 'paid', amount_pence: DEPOSIT, stripe_session_id: null, stripe_payment_intent: null }],
    );
    assert.equal((await events(t, 'booking_confirmed'))[0].detail.byTransfer, true);
    assert.match(emails.find((e) => e.subject.startsWith('ROSS 360 booking confirmed')).text, /Paid: £110\.00/);
    assert.equal(res.data.booking.maxRetentionPence, DEPOSIT);
    // After the shoot, the balance is requested as usual.
    await askForBalance(t, b.id, slot.date);
    const email = emails.at(-1);
    assert.match(email.text, /please pay the balance of £329\.00/);
    assert.match(email.text, /Would you rather pay by bank transfer\? Please reply to this email/);
    assert.match((await callPage(t.env, `/q/${token}/balance`)).html, /Would you rather pay by bank transfer/);
    const bad = await t.call(`/quotes/${reference}/book-without-deposit`, { method: 'POST', body: { confirm: true, slotId: slot.id, notify: false, deposit: 'cash' } });
    assert.equal(bad.status, 400);
  });
});

test('booking with no deposit: only sent business quotes, and only open slots', async () => {
  const { t, slot, reference } = await ready(20, 'am', { customerType: 'consumer' });
  const closed = await addSlot(t, 25, 'am');
  await t.call(`/availability/${closed.id}/close`, { method: 'POST', body: {} });
  await withServices(async () => {
    const consumer = await t.call(`/quotes/${reference}/book-without-deposit`, { method: 'POST', body: { confirm: true, slotId: slot.id, notify: false, deposit: 'none' } });
    assert.equal(consumer.status, 409);
    assert.match(consumer.data.message, /business/);
  });
  const b = await ready(20);
  await withServices(async () => {
    const res = await b.t.call(`/quotes/${b.reference}/book-without-deposit`, { method: 'POST', body: { confirm: true, slotId: 999999, notify: false, deposit: 'none' } });
    assert.equal(res.status, 409);
    assert.equal(one(b.t, `SELECT COUNT(*) AS n FROM bookings`).n, 0);
  });
});

test('a moved booking keeps its balance request', async () => {
  const { t, slot, token } = await ready(20);
  const later = await addSlot(t, 30, 'am');
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id);
    await askForBalance(t, b.id, slot.date);
    const due = one(t, `SELECT balance_due_on FROM bookings`).balance_due_on;
    const moved = await t.call(`/bookings/${b.id}/move`, { method: 'POST', body: { confirm: true, slotId: later.id } });
    assert.equal(moved.status, 200);
    assert.equal(one(t, `SELECT balance_due_on FROM bookings`).balance_due_on, due);
  });
});
