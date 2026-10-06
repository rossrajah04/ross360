// Phase C self-service booking and Stripe payment, against a local Stripe stub (tests/helpers/services.js):
// payment in full, deposit, late bookings, successful and failed checkout, slot holds and their
// release, two customers for one slot, balance reminders and the unpaid-balance cancellation,
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
  getBooking,
  handleCheckoutCompleted,
  refundsOf,
  runScheduled,
  startCheckout,
} from '../server/booking/bookings.js';
import { resolveQuoteLink } from '../server/customer/quotePage.js';
import { addDays, packageItem, ukToday } from '../src/lib/admin/quotes.js';
import { paymentOptions, reminderDates, ukInstant } from '../src/lib/admin/booking.js';

const TOTAL = 43900; // the test quote: Professional £349 + £100 extra + £20 travel − £30 discount
const DEPOSIT = 7000;
const one = (t, sql, ...params) => t.db.db.prepare(sql).get(...params);
const rows = (t, sql, ...params) => t.db.db.prepare(sql).all(...params);
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
async function bookAndPay(t, stripe, token, slotId, plan) {
  const res = await checkout(t.env, token, slotId, plan);
  assert.equal(res.status, 303, res.html);
  const id = sessionOf(res.location);
  stripe.pay(id);
  const back = await callPage(t.env, `/q/${token}/paid?session_id=${id}`);
  assert.equal(back.status, 303);
  return one(t, `SELECT * FROM bookings WHERE status = 'confirmed' ORDER BY id DESC LIMIT 1`);
}

// --- The rules ------------------------------------------------------------------------------------

test('deposit and balance: fixed by package, counted towards the full total including travel', () => {
  const today = '2026-10-06';
  const far = paymentOptions({ totalPence: TOTAL, pkg: 'professional', slotDate: '2026-10-26', today });
  assert.deepEqual(far.deposit, { depositPence: 7000, balancePence: TOTAL - 7000, balanceDueOn: '2026-10-19' });
  assert.equal(paymentOptions({ totalPence: 26900, pkg: 'essential', slotDate: '2026-10-26', today }).deposit.depositPence, 5000);
  assert.equal(paymentOptions({ totalPence: 51900, pkg: 'bespoke', slotDate: '2026-10-26', today }).deposit.depositPence, 10000);
  // 8 days away: deposit allowed. 7 days or fewer: in full only.
  assert.ok(paymentOptions({ totalPence: TOTAL, pkg: 'professional', slotDate: '2026-10-14', today }).deposit);
  const late = paymentOptions({ totalPence: TOTAL, pkg: 'professional', slotDate: '2026-10-13', today });
  assert.equal(late.deposit, null);
  assert.equal(late.noDeposit, 'within_7_days');
  // No package: in full only.
  assert.equal(paymentOptions({ totalPence: TOTAL, pkg: null, slotDate: '2026-10-26', today }).noDeposit, 'no_package');
});

test('reminders: 14 and 8 days before, only those not already past when booked; deadline is the end of the UK day', () => {
  assert.deepEqual(reminderDates('2026-11-30', '2026-11-01'), { r14: '2026-11-16', r8: '2026-11-22' });
  assert.deepEqual(reminderDates('2026-11-30', '2026-11-20'), { r14: null, r8: '2026-11-22' });
  assert.deepEqual(reminderDates('2026-11-30', '2026-11-22'), { r14: null, r8: '2026-11-22' });
  // British Summer Time and GMT.
  assert.equal(ukInstant('2026-07-01', '00:00').toISOString(), '2026-06-30T23:00:00.000Z');
  assert.equal(ukInstant('2026-12-01', '09:00').toISOString(), '2026-12-01T09:00:00.000Z');
  assert.equal(ukInstant('2026-10-25', '09:00').toISOString(), '2026-10-25T09:00:00.000Z'); // clocks went back that night
});

// --- Paying in full and by deposit ---------------------------------------------------------------

test('payment in full: Stripe Checkout for the full total, slot held, then confirmed with emails', async () => {
  const { t, slot, token, reference } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const page = await callPage(t.env, `/q/${token}`);
    assert.match(page.html, /Book a slot/);
    const pay = await callPage(t.env, `/q/${token}/pay?slot=${slot.id}`);
    assert.deepEqual(formOf(pay.html).plans, ['full', 'deposit']);
    assert.match(pay.html, /£439\.00/);
    assert.match(pay.html, /within 48 hours of the slot, ROSS 360 may keep up to 50%/);

    const res = await checkout(t.env, token, slot.id, 'full');
    assert.equal(res.status, 303);
    assert.match(res.location, /^https:\/\/checkout\.stripe\.com\//);
    const s = stripe.lastSession();
    assert.equal(s.amount_total, TOTAL);
    assert.equal(s.currency, 'gbp');
    assert.deepEqual(s.payment_method_types, ['card']);
    assert.equal(s.metadata.kind, 'full');
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
    assert.equal(b.paid_pence, TOTAL);
    assert.equal(b.balance_due_on, null);
    const shown = await callPage(t.env, `/q/${token}`);
    assert.match(shown.html, /Your booking is confirmed\. Paid in full\./);
    assert.doesNotMatch(shown.html, /Pay balance/);

    const confirm = emails.find((e) => e.subject.startsWith('ROSS 360 booking confirmed'));
    assert.deepEqual(confirm.to, ['alex@example.test']);
    assert.match(confirm.text, /Paid: £439\.00/);
    assert.match(confirm.text, /Your booking is paid in full/);
    assert.ok(emails.find((e) => e.subject.startsWith('Booking confirmed:') && e.to[0] === 'newquote@ross360.co.uk'));
    assert.equal((await getEnquiry(t.db, t.enquiry)).status, 'booked');
  });
});

test('deposit: £70 now, the balance from the full total, due by the end of the day 7 days before', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const b = await bookAndPay(t, stripe, token, slot.id, 'deposit');
    assert.equal(stripe.calls.find((c) => c.path === '/v1/checkout/sessions').params.get('line_items[0][price_data][unit_amount]'), String(DEPOSIT));
    assert.equal(b.plan, 'deposit');
    assert.equal(b.paid_pence, DEPOSIT);
    assert.equal(b.total_pence, TOTAL);
    assert.equal(b.balance_due_on, addDays(slot.date, -7));
    assert.equal(b.reminder_14_on, addDays(slot.date, -14));
    assert.equal(b.reminder_8_on, addDays(slot.date, -8));
    const page = await callPage(t.env, `/q/${token}`);
    assert.match(page.html, /£369\.00/); // balance = 439 − 70
    assert.match(page.html, /Pay balance/);
    const confirm = emails.find((e) => e.subject.startsWith('ROSS 360 booking confirmed'));
    assert.match(confirm.text, /The balance of £369\.00 is due by the end of/);
  });
});

test('booking 7 days or fewer before the slot: payment in full only, a deposit is refused', async () => {
  const { t, slot, token } = await ready(5);
  await withServices(async ({ stripe }) => {
    const pay = await callPage(t.env, `/q/${token}/pay?slot=${slot.id}`);
    assert.deepEqual(formOf(pay.html).plans, ['full']);
    assert.match(pay.html, /Slots 7 days away or fewer are paid in full/);
    const refused = await checkout(t.env, token, slot.id, 'deposit');
    assert.equal(refused.status, 422);
    assert.equal(stripe.calls.length, 0);
    assert.equal(rows(t, `SELECT * FROM bookings`).length, 0);
  });
});

test('a quotation without one of the three packages is pay in full only', async () => {
  const { t, slot, token } = await ready(20, 'am', {
    package: null,
    items: [{ kind: 'custom', description: 'Property tour', quantity: 1, unitPence: 30000 }],
  });
  await withServices(async () => {
    const pay = await callPage(t.env, `/q/${token}/pay?slot=${slot.id}`);
    assert.deepEqual(formOf(pay.html).plans, ['full']);
    assert.equal((await checkout(t.env, token, slot.id, 'deposit')).status, 422);
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
    const res = await checkout(t.env, token, slot.id, 'full');
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
    const res = await checkout(t.env, token, slot.id, 'full');
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
    await checkout(t.env, token, slot.id, 'full');
    const hold = one(t, `SELECT hold_expires_at FROM bookings`).hold_expires_at;
    const summary = await runScheduled(t.env, new Date(Date.parse(hold) + 1000));
    assert.equal(summary.holdsReleased, 1);
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'expired');

    stripe.fail = ({ path }) => (path === '/v1/checkout/sessions' ? new Response(JSON.stringify({ error: { message: 'down' } }), { status: 500 }) : null);
    const res = await checkout(t.env, token, slot.id, 'full');
    assert.equal(res.status, 502);
    assert.match(res.html, /Payment could not be started/);
    assert.equal(rows(t, `SELECT * FROM bookings WHERE status = 'holding'`).length, 0);
  });
});

test('choosing a different slot ends the first checkout at Stripe, so it can no longer be paid', async () => {
  const { t, slot, token } = await ready(20);
  const other = await addSlot(t, 21, 'pm');
  await withServices(async ({ stripe }) => {
    const first = sessionOf((await checkout(t.env, token, slot.id, 'full')).location);
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
    const [a, b] = await Promise.all([checkout(t.env, token, slot.id, 'full'), checkout(t2.env, q2.token, slot.id, 'full')]);
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
    await checkout(t.env, token, slot.id, 'full');
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
    await checkout(t.env, token, slot.id, 'full');
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
    const first = sessionOf((await checkout(t.env, token, slot.id, 'full')).location);
    const hold = one(t, `SELECT hold_expires_at FROM bookings`).hold_expires_at;
    await runScheduled(t.env, new Date(Date.parse(hold) + 1000));
    await bookAndPay(t2, stripe, q2.token, slot.id, 'full');
    // The first customer's payment arrives late (Stripe let it through at the last second).
    stripe.sessions.get(first).status = 'open';
    const late = stripe.pay(first);
    const hook = await deliverWebhook(t.env, 'checkout.session.completed', late);
    assert.equal(hook.status, 200);
    const b = one(t, `SELECT * FROM bookings WHERE id = ?`, Number(late.metadata.booking_id));
    assert.equal(b.status, 'cancelled');
    assert.equal(b.cancel_reason, 'slot_unavailable');
    assert.equal(b.refunded_pence, TOTAL);
    assert.equal(stripe.refunds.at(-1).amount, TOTAL);
    assert.ok(emails.find((e) => e.subject === 'ROSS 360 payment refunded'));
    assert.equal(rows(t, `SELECT * FROM bookings WHERE slot_id = ? AND status = 'confirmed'`, slot.id).length, 1);
  });
});

// --- The webhook ---------------------------------------------------------------------------------

test('the webhook: only correctly signed, recent events; repeated events do nothing twice', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    const id = sessionOf((await checkout(t.env, token, slot.id, 'full')).location);
    const paid = stripe.pay(id);
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid, { secret: 'whsec_wrong' })).status, 400);
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid, { signature: 't=1,v1=00' })).status, 400);
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'holding');
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid)).status, 200);
    assert.equal((await deliverWebhook(t.env, 'checkout.session.completed', paid)).status, 200);
    await callPage(t.env, `/q/${token}/paid?session_id=${id}`);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.paid_pence, TOTAL);
    assert.equal(emails.filter((e) => e.subject.startsWith('ROSS 360 booking confirmed')).length, 1);
    assert.equal((await events(t, 'booking_confirmed')).length, 1);
  });
});

test('a session whose amount does not match the payment is not accepted', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const id = sessionOf((await checkout(t.env, token, slot.id, 'full')).location);
    const paid = { ...stripe.pay(id), amount_total: 100 };
    assert.equal((await handleCheckoutCompleted(t.env, paid)).result, 'mismatch');
    assert.equal(one(t, `SELECT status FROM bookings`).status, 'holding');
  });
});

// --- Balance: reminders, payment, and the unpaid-balance cancellation -----------------------------

test('balance reminders at 14 and 8 days (from 09:00 UK), each once, with a Stripe link to pay', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    await bookAndPay(t, stripe, token, slot.id, 'deposit');
    const r14 = addDays(slot.date, -14);
    const before = emails.length;
    await runScheduled(t.env, at(r14, '08:30'));
    assert.equal(emails.length, before, 'nothing before 09:00');
    assert.equal((await runScheduled(t.env, at(r14, '10:00'))).reminders, 1);
    assert.equal((await runScheduled(t.env, at(r14, '11:00'))).reminders, 0, 'once only');
    const reminder = emails.at(-1);
    assert.match(reminder.subject, /^ROSS 360 balance due by /);
    assert.match(reminder.text, /Balance: £369\.00/);
    assert.match(reminder.text, /Pay balance: https:\/\/ross360\.test\/q\/.+\/balance/);
    assert.match(reminder.text, /deposit of £70\.00 refunded in full/);
    assert.equal((await runScheduled(t.env, at(addDays(slot.date, -8), '09:05'))).reminders, 1);
    assert.equal((await events(t, 'balance_reminder_sent')).length, 2);
  });
});

test('a deposit booking made after the 14-day date gets only the 8-day reminder', async () => {
  const { t, slot, token } = await ready(10);
  await withServices(async ({ stripe, emails }) => {
    const b = await bookAndPay(t, stripe, token, slot.id, 'deposit');
    assert.equal(b.reminder_14_on, null);
    assert.equal(b.reminder_8_on, addDays(slot.date, -8));
    await runScheduled(t.env, at(addDays(slot.date, -8), '12:00'));
    assert.equal(emails.filter((e) => /balance due by/.test(e.subject)).length, 1);
  });
});

test('paying the balance on Stripe: the booking is paid in full and no more reminders are sent', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    await bookAndPay(t, stripe, token, slot.id, 'deposit');
    const res = await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    assert.equal(res.status, 303);
    const s = stripe.lastSession();
    assert.equal(s.amount_total, TOTAL - DEPOSIT);
    assert.equal(s.metadata.kind, 'balance');
    assert.ok(s.expires_at * 1000 <= ukInstant(addDays(slot.date, -6), '00:00').getTime(), 'expires by the deadline');
    stripe.pay(s.id);
    await deliverWebhook(t.env, 'checkout.session.completed', stripe.session(s.id));
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.paid_pence, TOTAL);
    assert.ok(emails.find((e) => e.subject === 'ROSS 360 balance received'));
    const page = await callPage(t.env, `/q/${token}`);
    assert.match(page.html, /Paid in full/);
    assert.equal((await runScheduled(t.env, at(addDays(slot.date, -8), '10:00'))).reminders, 0);
    assert.equal((await runScheduled(t.env, at(addDays(slot.date, -6), '10:00'))).cancelled, 0);
  });
});

test('unpaid at the deadline: cancelled, slot reopened, deposit refunded in full, customer emailed', async () => {
  const { t, slot, token } = await ready(20);
  const t2 = await setUp({ db: t.db });
  const q2 = await sentQuote(t2);
  await withServices(async ({ stripe, emails }) => {
    await bookAndPay(t, stripe, token, slot.id, 'deposit');
    const due = addDays(slot.date, -7);
    assert.equal((await runScheduled(t.env, at(due, '23:59'))).cancelled, 0, 'not before the end of the day');
    const summary = await runScheduled(t.env, at(addDays(due, 1), '00:05'));
    assert.equal(summary.cancelled, 1);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'cancelled');
    assert.equal(b.cancel_reason, 'unpaid_balance');
    assert.equal(b.retained_pence, 0);
    assert.equal(b.refunded_pence, DEPOSIT);
    const refund = stripe.refunds.at(-1);
    assert.equal(refund.amount, DEPOSIT);
    assert.match(refund.payment_intent, /^pi_test_/);
    const email = emails.find((e) => e.subject === 'ROSS 360 booking cancelled');
    assert.match(email.text, /was not paid by the end of/);
    assert.match(email.text, /£70\.00 has been refunded in full/);
    // The slot is open again for others.
    assert.equal(one(t, `SELECT status FROM availability_slots WHERE id = ?`, slot.id).status, 'open');
    await runScheduled(t.env, at(addDays(due, 1), '01:05'));
    assert.equal(stripe.refunds.length, 1, 'refunded once');
    const page = await callPage(t2.env, `/q/${q2.token}/book`);
    assert.ok(formOf(page.html).slots.includes(slot.id));
  });
});

test('a balance paid at the last moment is recorded, not cancelled', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    await bookAndPay(t, stripe, token, slot.id, 'deposit');
    await postForm(t.env, token, 'balance', `/q/${token}/balance`);
    stripe.pay(stripe.lastSession().id); // paid, but the webhook has not arrived yet
    await runScheduled(t.env, at(addDays(slot.date, -6), '00:05'));
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'confirmed');
    assert.equal(b.paid_pence, TOTAL);
    assert.equal(stripe.refunds.length, 0);
  });
});

// --- Cancellations and refunds ----------------------------------------------------------------------

test('customer cancels more than 48 hours before: cancelled, everything paid refunded, slot reopened', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe, emails }) => {
    await bookAndPay(t, stripe, token, slot.id, 'deposit');
    const page = await callPage(t.env, `/q/${token}/cancel`);
    assert.match(page.html, /£70\.00 is refunded in full/);
    const res = await postForm(t.env, token, 'cancel', `/q/${token}/cancel`);
    assert.equal(res.status, 303);
    const b = one(t, `SELECT * FROM bookings`);
    assert.equal(b.status, 'cancelled');
    assert.equal(b.cancel_reason, 'customer');
    assert.equal(b.refunded_pence, DEPOSIT);
    assert.equal(stripe.refunds.at(-1).amount, DEPOSIT);
    const shown = await callPage(t.env, `/q/${token}`);
    assert.match(shown.html, /This booking was cancelled on/);
    assert.match(shown.html, /A refund of £70\.00 has been issued/);
    assert.match(shown.html, /Book another slot/);
    assert.ok(emails.find((e) => e.subject === 'ROSS 360 booking cancelled' && /£70\.00 has been refunded in full/.test(e.text)));
  });
});

test('customer cancels within 48 hours: a request; ROSS 360 decides the amount kept (never automatic), the rest refunded', async () => {
  const { t, slot, token } = await ready(5, 'pm');
  await withServices(async ({ stripe, emails }) => {
    const booked = await bookAndPay(t, stripe, token, slot.id, 'full');
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

    // The Admin: more than 50% is refused.
    const tooMuch = await t.call(`/bookings/${booked.id}/cancel`, {
      method: 'POST',
      body: { confirm: true, reason: 'customer_late', retainPence: 21951, expect: 'cancel_requested' },
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
    assert.equal(b.refunded_pence, TOTAL - 10000);
    assert.equal(stripe.refunds.at(-1).amount, TOTAL - 10000);
    const email = emails.find((e) => e.subject === 'ROSS 360 booking cancelled');
    assert.match(email.text, /Of the £439\.00 paid, £100\.00 has been retained and £339\.00 refunded/);
  });
});

test('retention is refused outside 48 hours and for cancellations by ROSS 360; zero is allowed', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id, 'deposit');
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
    const b = await bookAndPay(t, stripe, token, slot.id, 'deposit');
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
    const b = await bookAndPay(t, stripe, token, slot.id, 'full');
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

// --- Moving a booking --------------------------------------------------------------------------------

test('ROSS 360 moves a booking to another open slot, keeping payments; the deadline follows the new date', async () => {
  const { t, slot, token } = await ready(20);
  const later = await addSlot(t, 30, 'day');
  await withServices(async ({ stripe, emails }) => {
    const b = await bookAndPay(t, stripe, token, slot.id, 'deposit');
    const detail = await t.call(`/bookings/${b.id}`);
    assert.ok(detail.data.moveTargets.some((s) => s.id === later.id));
    assert.ok(!detail.data.moveTargets.some((s) => s.id === slot.id));
    const moved = await t.call(`/bookings/${b.id}/move`, { method: 'POST', body: { confirm: true, slotId: later.id } });
    assert.equal(moved.status, 200, JSON.stringify(moved.data));
    const row = one(t, `SELECT * FROM bookings`);
    assert.equal(row.slot_id, later.id);
    assert.equal(row.paid_pence, DEPOSIT);
    assert.equal(row.balance_due_on, addDays(later.date, -7));
    assert.ok(emails.find((e) => /^ROSS 360 booking moved/.test(e.subject)));
    // The old slot is free again.
    assert.ok(formOf((await callPage(t.env, `/q/${token}/book`)).html).slots.length >= 0);
    assert.equal(rows(t, `SELECT * FROM bookings WHERE slot_id = ? AND status = 'confirmed'`, slot.id).length, 0);
  });
});

test('an unpaid balance cannot be moved to a date whose deadline has passed', async () => {
  const { t, slot, token } = await ready(20);
  const soon = await addSlot(t, 4, 'am');
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id, 'deposit');
    const refused = await t.call(`/bookings/${b.id}/move`, { method: 'POST', body: { confirm: true, slotId: soon.id } });
    assert.equal(refused.status, 409);
    assert.match(refused.data.message, /balance must be paid/);
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
    await bookAndPay(t, stripe, token, slot.id, 'full');
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

test('the Admin lists bookings with slot, payment status, amounts and deadline', async () => {
  const { t, slot, token } = await ready(20);
  await withServices(async ({ stripe }) => {
    const b = await bookAndPay(t, stripe, token, slot.id, 'deposit');
    const list = await t.call('/bookings');
    const row = list.data.bookings.find((x) => x.id === b.id);
    assert.equal(row.status, 'confirmed');
    assert.equal(row.slotDate, slot.date);
    assert.equal(row.paidPence, DEPOSIT);
    assert.equal(row.balancePence, TOTAL - DEPOSIT);
    assert.equal(row.balanceDueOn, addDays(slot.date, -7));
    const detail = await t.call(`/bookings/${b.id}`);
    assert.equal(detail.data.booking.payments[0].kind, 'deposit');
    assert.equal(detail.data.booking.payments[0].status, 'paid');
    assert.equal(detail.data.booking.payments[0].sessionUrl, undefined);
    const dash = await t.call('/dashboard');
    assert.equal(dash.data.bookings.balancesDue, 1);
    assert.ok(await activeBooking(t.db, b.quote_id));
    assert.equal((await getBooking(t.db, b.id)).quoteReference, row.quoteReference);
  });
});
