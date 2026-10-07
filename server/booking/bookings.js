// Self-service booking and payment (Phase C).
//
// A customer with a valid quotation chooses an open slot and pays on Stripe Checkout, in full or by
// the fixed deposit (src/lib/admin/booking.js has the rules). The slot is held while they pay and the
// booking is confirmed only when Stripe confirms the payment. Balance reminders, the unpaid-balance
// cancellation and refunds run on a schedule (runScheduled), triggered hourly by the Cron Worker.
//
// Double booking is impossible by construction: an active booking (a checkout in progress counts) is
// one row, and the database allows one per slot and one per quote (bookings_one_per_slot / _per_quote)
// and only on an open slot (bookings_slot_open). Every state change is a single conditional statement
// or one D1 batch (one transaction), so a webhook, the customer's return from Stripe and the schedule
// can all handle the same payment without doing anything twice. Stripe calls carry idempotency keys.

import { requireSchema } from '../admin/schema.js';
import { activeLink, linkBaseUrl, quoteUrl as signedQuoteUrl } from '../admin/quoteLinks.js';
import { addDays, ukToday } from '../../src/lib/admin/quotes.js';
import { REQUEST_WINDOW, periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import {
  ACTIVE_BOOKING_STATUSES,
  CHECKOUT_MINUTES,
  CHECKOUT_SLACK_SECONDS,
  HOLD_MARGIN_SECONDS,
  REMINDER_FROM_HOUR,
  balanceDueOn,
  balanceOverdue,
  cancellationWindow,
  maxRetention,
  onlineBooking,
  paymentOptions,
  reminderDates,
  ukEndOfDay,
  ukHour,
} from '../../src/lib/admin/booking.js';
import {
  StripeError,
  createCheckoutSession,
  createRefund,
  expireCheckoutSession,
  retrieveCheckoutSession,
  stripeProblem,
} from './stripe.js';
import { sendEmail } from './mail.js';
import {
  balancePaidEmail,
  cancelRequestEmail,
  cancelledEmail,
  confirmedEmail,
  internalEmail,
  lateRefundEmail,
  movedEmail,
  reminderEmail,
  slotText,
} from './emails.js';

const ACTIVE = `('holding', 'confirmed', 'cancel_requested')`;
const iso = (date) => date.toISOString();

export const paymentsAvailable = (env) => stripeProblem(env) === null;

// --- Reading ------------------------------------------------------------------------------------

const SELECT_BOOKING = `
  SELECT b.*, s.slot_date, s.period, s.status AS slot_status,
    q.reference AS quote_reference, q.enquiry_id, q.customer_name, q.customer_business, q.customer_email,
    q.status AS quote_status, e.reference AS enquiry_reference
  FROM bookings b
  JOIN availability_slots s ON s.id = b.slot_id
  JOIN quotes q ON q.id = b.quote_id
  JOIN enquiries e ON e.id = q.enquiry_id`;

/** A booking row as the rest of the code uses it. */
export function bookingView(row) {
  if (!row) return null;
  return {
    id: row.id,
    quoteId: row.quote_id,
    enquiryId: row.enquiry_id,
    quoteReference: row.quote_reference,
    enquiryReference: row.enquiry_reference,
    customerName: row.customer_name,
    customerBusiness: row.customer_business,
    customerEmail: row.customer_email,
    slotId: row.slot_id,
    slotDate: row.slot_date,
    period: row.period,
    status: row.status,
    plan: row.plan,
    totalPence: row.total_pence,
    depositPence: row.deposit_pence,
    paidPence: row.paid_pence,
    refundedPence: row.refunded_pence,
    retainedPence: row.retained_pence,
    balanceDueOn: row.balance_due_on,
    reminder14On: row.reminder_14_on,
    reminder14SentAt: row.reminder_14_sent_at,
    reminder8On: row.reminder_8_on,
    reminder8SentAt: row.reminder_8_sent_at,
    holdExpiresAt: row.hold_expires_at,
    bookedOn: row.booked_on,
    confirmedAt: row.confirmed_at,
    cancelRequestedAt: row.cancel_requested_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    cancelledBy: row.cancelled_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBooking(db, id) {
  return bookingView(await db.prepare(`${SELECT_BOOKING} WHERE b.id = ?`).bind(id).first());
}

/** The quote's active booking (a checkout in progress counts), or null. */
export async function activeBooking(db, quoteId) {
  return bookingView(await db.prepare(`${SELECT_BOOKING} WHERE b.quote_id = ? AND b.status IN ${ACTIVE}`).bind(quoteId).first());
}

/** The quote's most recent booking of any status, or null. */
export async function latestBooking(db, quoteId) {
  return bookingView(await db.prepare(`${SELECT_BOOKING} WHERE b.quote_id = ? ORDER BY b.id DESC LIMIT 1`).bind(quoteId).first());
}

const paymentView = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  kind: row.kind,
  amountPence: row.amount_pence,
  status: row.status,
  sessionId: row.stripe_session_id,
  sessionUrl: row.stripe_session_url,
  paymentIntent: row.stripe_payment_intent,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  paidAt: row.paid_at,
});

const refundView = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  paymentId: row.payment_id,
  paymentKind: row.payment_kind,
  amountPence: row.amount_pence,
  status: row.status,
  stripeRefundId: row.stripe_refund_id,
  attempts: row.attempts,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function paymentsOf(db, bookingId) {
  const { results } = await db.prepare(`SELECT * FROM booking_payments WHERE booking_id = ? ORDER BY id`).bind(bookingId).all();
  return results.map(paymentView);
}

export async function refundsOf(db, bookingId) {
  const { results } = await db
    .prepare(`SELECT r.*, p.kind AS payment_kind FROM booking_refunds r JOIN booking_payments p ON p.id = r.payment_id WHERE r.booking_id = ? ORDER BY r.id`)
    .bind(bookingId)
    .all();
  return results.map(refundView);
}

/** The open Checkout payment of a booking, or null. */
async function openPayment(db, bookingId) {
  const row = await db.prepare(`SELECT * FROM booking_payments WHERE booking_id = ? AND status = 'open'`).bind(bookingId).first();
  return row ? paymentView(row) : null;
}

const event = (db, enquiryId, at, actor, type, detail) =>
  db
    .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, ?, ?, ?)`)
    .bind(enquiryId, at, actor, type, JSON.stringify(detail));

// --- Links in emails ------------------------------------------------------------------------------

/** The customer's quotation page for a quote (its working link), or null. */
export async function customerPageUrl(env, quoteId) {
  const link = await activeLink(env.DB, quoteId);
  return link ? signedQuoteUrl(env, link.key_id, link.link_id) : null;
}

const adminUrl = (env, b) => `${linkBaseUrl(env)}/admin#/bookings/${b.id}`;

async function notifyCustomer(env, b, message, key, label) {
  const sent = await sendEmail(env, message, { idempotencyKey: key, customer: true, label });
  if (!sent.ok && !sent.skipped) await recordEmailFailure(env, b, label, sent.status);
  return sent;
}

async function notifyInternal(env, b, kind, extra = {}) {
  const message = internalEmail(env, kind, b, { adminUrl: adminUrl(env, b), ...extra });
  const sent = await sendEmail(env, message, { idempotencyKey: extra.key, label: `internal ${kind}` });
  if (!sent.ok) await recordEmailFailure(env, b, `internal ${kind}`, sent.status);
  return sent;
}

async function recordEmailFailure(env, b, email, status) {
  try {
    await event(env.DB, b.enquiryId, iso(new Date()), 'system', 'notification_failed', { email, quote: b.quoteReference, status: String(status) }).run();
  } catch (error) {
    console.error(`Could not record a failed booking email on ${b.quoteReference}: ${error.message}`);
  }
}

// --- Slots offered to customers ---------------------------------------------------------------------

/** The first and last slot dates a customer can book, today (UK). */
export function bookingWindow(today = ukToday()) {
  return { from: addDays(today, REQUEST_WINDOW.minDays), to: addDays(today, REQUEST_WINDOW.maxDays) };
}

/**
 * Slots a customer can book: open, within the window, and without an active booking (a checkout in
 * progress whose hold has run out does not count). Nothing about other customers is shown.
 */
export async function bookableSlots(db, now = new Date(), quoteId = 0) {
  const { from, to } = bookingWindow(ukToday(now));
  const { results } = await db
    .prepare(
      `SELECT s.id, s.slot_date, s.period FROM availability_slots s
       WHERE s.status = 'open' AND s.slot_date >= ? AND s.slot_date <= ?
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND (b.status IN ('confirmed', 'cancel_requested')
           OR (b.status = 'holding' AND b.hold_expires_at > ? AND b.quote_id <> ?)))
       ORDER BY s.slot_date, CASE s.period WHEN 'am' THEN 1 WHEN 'pm' THEN 2 ELSE 3 END`,
    )
    .bind(from, to, iso(now), quoteId)
    .all();
  return results;
}

/** A slot the customer of `quoteId` may book now (their own checkout in progress aside), or null. */
export async function bookableSlot(db, slotId, now = new Date(), quoteId = 0) {
  if (!Number.isSafeInteger(slotId) || slotId < 1) return null;
  return (await bookableSlots(db, now, quoteId)).find((s) => s.id === slotId) || null;
}

/**
 * Release checkouts whose hold has run out (Stripe has expired their sessions by then). Returns the
 * statements, to run on their own or at the start of a batch.
 */
function releaseExpiredHolds(db, at) {
  const t = iso(at);
  return [
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT q.enquiry_id, ?, 'system', 'checkout_expired', json_object('quote', q.reference, 'date', s.slot_date, 'period', s.period)
         FROM bookings b JOIN quotes q ON q.id = b.quote_id JOIN availability_slots s ON s.id = b.slot_id
         WHERE b.status = 'holding' AND b.hold_expires_at <= ?`,
      )
      .bind(t, t),
    db
      .prepare(
        `UPDATE booking_payments SET status = 'expired', updated_at = ?
         WHERE status = 'open' AND booking_id IN (SELECT id FROM bookings WHERE status = 'holding' AND hold_expires_at <= ?)`,
      )
      .bind(t, t),
    db.prepare(`UPDATE bookings SET status = 'expired', updated_at = ? WHERE status = 'holding' AND hold_expires_at <= ? RETURNING id`).bind(t, t),
  ];
}

export async function releaseHolds(db, at = new Date()) {
  await db.batch(releaseExpiredHolds(db, at));
}

// --- Starting a checkout ------------------------------------------------------------------------------

const constraintOf = (error) => {
  const message = String(error?.message || '');
  if (/slot_not_open/.test(message)) return 'slot';
  if (/bookings\.slot_id|bookings_one_per_slot/.test(message)) return 'slot';
  if (/bookings\.quote_id|bookings_one_per_quote/.test(message)) return 'quote';
  if (/booking_payments\.booking_id|booking_payments_one_open/.test(message)) return 'payment';
  return null;
};

/**
 * Hold a slot and start Stripe Checkout for a valid quotation.
 *
 * ctx: the resolved quote link (server/customer/quotePage.js). pageUrl: the absolute URL of the
 * customer's quotation page (/q/<token>), for Stripe's return links. plan: 'full' | 'deposit'.
 *
 * Returns { result, url? } where result is 'ok' (url is Stripe's page), 'not_allowed',
 * 'payments_off', 'slot_unavailable', 'invalid_plan', 'already_booked', 'in_progress' or
 * 'payment_start_failed'.
 */
export async function startCheckout(env, ctx, { slotId, plan }, pageUrl, now = new Date()) {
  const db = env.DB;
  if (ctx.state !== 'valid' || !onlineBooking(ctx.snapshot)) return { result: 'not_allowed' };
  if (!paymentsAvailable(env)) return { result: 'payments_off' };
  if (plan !== 'full' && plan !== 'deposit') return { result: 'invalid_plan' };
  if (!(await bookableSlot(db, slotId, now, ctx.quoteId))) return { result: 'slot_unavailable' };

  // A checkout already in progress for this quote (another tab, or the customer came back) is ended
  // first, at Stripe too, so it can no longer be paid.
  const existing = await activeBooking(db, ctx.quoteId);
  if (existing && existing.status !== 'holding') return { result: 'already_booked' };
  if (existing) {
    const ended = await endCheckout(env, existing, now);
    if (ended === 'paid') return { result: 'already_booked' };
    if (ended === 'open') return { result: 'in_progress' };
  }
  const slot = await bookableSlot(db, slotId, now, ctx.quoteId);
  if (!slot) return { result: 'slot_unavailable' };
  const options = paymentOptions({ totalPence: ctx.snapshot.totalPence, pkg: ctx.snapshot.package, slotDate: slot.slot_date, today: ukToday(now) });
  if (plan === 'deposit' && !options.deposit) return { result: 'invalid_plan' };
  const amount = plan === 'deposit' ? options.deposit.depositPence : options.totalPence;
  if (!Number.isSafeInteger(amount) || amount <= 0) return { result: 'not_allowed' };

  const at = iso(now);
  const sessionExpires = Math.floor(now.getTime() / 1000) + CHECKOUT_MINUTES * 60 + CHECKOUT_SLACK_SECONDS;
  const holdExpires = iso(new Date((sessionExpires + HOLD_MARGIN_SECONDS) * 1000));
  // Still sent, and not being replaced by a revision that is being (or has been) sent.
  const stillSent = `EXISTS (SELECT 1 FROM quotes WHERE id = ? AND status = 'sent')
    AND NOT EXISTS (SELECT 1 FROM quotes r WHERE r.revision_of = ${Number(ctx.quoteId)} AND r.status IN ('sending', 'send_unknown', 'sent'))`;
  let results;
  try {
    results = await db.batch([
      ...releaseExpiredHolds(db, now),
      db
        .prepare(
          `INSERT INTO bookings (quote_id, slot_id, status, plan, total_pence, deposit_pence, hold_expires_at, created_at, updated_at)
           SELECT ?, ?, 'holding', ?, ?, ?, ?, ?, ? WHERE ${stillSent}
           RETURNING id`,
        )
        .bind(ctx.quoteId, slot.id, plan, options.totalPence, plan === 'deposit' ? amount : null, holdExpires, at, at, ctx.quoteId),
      db
        .prepare(
          `INSERT INTO booking_payments (booking_id, kind, amount_pence, status, expires_at, created_at, updated_at)
           SELECT id, ?, ?, 'open', ?, ?, ? FROM bookings WHERE quote_id = ? AND status = 'holding' AND created_at = ?
           RETURNING id`,
        )
        .bind(plan, amount, iso(new Date(sessionExpires * 1000)), at, at, ctx.quoteId, at),
      db
        .prepare(
          `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
           SELECT ?, ?, 'customer', 'checkout_started', ? WHERE EXISTS (SELECT 1 FROM bookings WHERE quote_id = ? AND status = 'holding' AND created_at = ?)`,
        )
        .bind(
          ctx.enquiryId,
          at,
          JSON.stringify({ quote: ctx.reference, date: slot.slot_date, period: slot.period, plan, amountPence: amount }),
          ctx.quoteId,
          at,
        ),
    ]);
  } catch (error) {
    const which = constraintOf(error);
    if (which === 'slot') return { result: 'slot_unavailable' };
    if (which === 'quote' || which === 'payment') return { result: 'in_progress' };
    throw error;
  }
  const bookingId = results[3].results?.[0]?.id;
  const paymentId = results[4].results?.[0]?.id;
  if (!bookingId || !paymentId) return { result: 'not_allowed' };

  const when = slotText(slot.slot_date, slot.period);
  const name = `${plan === 'deposit' ? 'Deposit' : 'Payment in full'}: 360° virtual tour, ${when} (quotation ${ctx.reference})`;
  const metadata = { booking_id: String(bookingId), payment_id: String(paymentId), quote: ctx.reference, kind: plan };
  try {
    const session = await createCheckoutSession(
      env,
      {
        mode: 'payment',
        payment_method_types: ['card'],
        locale: 'en-GB',
        customer_email: ctx.snapshot.customer?.email || undefined,
        client_reference_id: `booking-${bookingId}`,
        line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: amount, product_data: { name } } }],
        metadata,
        payment_intent_data: { description: name, metadata },
        success_url: `${pageUrl}/paid?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${pageUrl}/checkout-cancelled?payment=${paymentId}`,
        expires_at: sessionExpires,
      },
      `checkout-${paymentId}`,
    );
    if (!session?.id || !session?.url) throw new StripeError('Stripe returned no session.');
    await db
      .prepare(`UPDATE booking_payments SET stripe_session_id = ?, stripe_session_url = ?, updated_at = ? WHERE id = ? AND status = 'open'`)
      .bind(session.id, session.url, iso(new Date()), paymentId)
      .run();
    return { result: 'ok', url: session.url };
  } catch (error) {
    console.error(`Checkout could not be started for ${ctx.reference}: ${error.message}`);
    // The customer never received a payment page, so the hold is released at once.
    const t = iso(new Date());
    await db.batch([
      db.prepare(`UPDATE booking_payments SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'open'`).bind(t, paymentId),
      db.prepare(`UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'holding'`).bind(t, bookingId),
    ]);
    return { result: 'payment_start_failed' };
  }
}

/**
 * End a checkout that is in progress: expire its session at Stripe, then settle it from Stripe's own
 * answer. Returns 'released', 'paid' (it had been paid, and is now confirmed) or 'open' (Stripe could
 * not be reached; the hold stays until it runs out).
 */
async function endCheckout(env, holding, now = new Date()) {
  const payment = await openPayment(env.DB, holding.id);
  if (payment?.sessionId) {
    try {
      await expireCheckoutSession(env, payment.sessionId);
    } catch (error) {
      // Already complete or expired: Stripe refuses to expire it. Its own state decides below.
      if (!error.definite) return 'open';
    }
    let session;
    try {
      session = await retrieveCheckoutSession(env, payment.sessionId);
    } catch {
      return 'open';
    }
    if (session.status === 'complete' && session.payment_status === 'paid') {
      await handleCheckoutCompleted(env, session, now);
      return 'paid';
    }
    if (session.status === 'open') return 'open';
  }
  const t = iso(now);
  await env.DB.batch([
    event(env.DB, holding.enquiryId, t, 'customer', 'checkout_released', { quote: holding.quoteReference, date: holding.slotDate, period: holding.period }),
    env.DB.prepare(`UPDATE booking_payments SET status = 'expired', updated_at = ? WHERE booking_id = ? AND status = 'open'`).bind(t, holding.id),
    env.DB.prepare(`UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'holding'`).bind(t, holding.id),
  ]);
  return 'released';
}

/** The customer chose a different slot, or came back from Stripe without paying. */
export async function releaseCheckout(env, ctx, now = new Date()) {
  const holding = await activeBooking(env.DB, ctx.quoteId);
  if (!holding || holding.status !== 'holding') return { result: 'none' };
  return { result: await endCheckout(env, holding, now) };
}

// --- Stripe's answers -----------------------------------------------------------------------------

async function paymentForSession(db, session) {
  const byId = session?.id
    ? await db.prepare(`SELECT * FROM booking_payments WHERE stripe_session_id = ?`).bind(session.id).first()
    : null;
  if (byId) return byId;
  // The session id is stored just after Stripe creates the session; if that write was lost, the
  // metadata identifies the payment (and must agree with it).
  const paymentId = Number(session?.metadata?.payment_id);
  if (!Number.isSafeInteger(paymentId)) return null;
  const row = await db.prepare(`SELECT * FROM booking_payments WHERE id = ? AND stripe_session_id IS NULL`).bind(paymentId).first();
  return row && String(row.booking_id) === String(session.metadata?.booking_id) ? row : null;
}

/**
 * A Checkout session was paid (from the webhook, the customer's return, or a check). Safe to call
 * any number of times, including at the same moment: only the call that records the payment acts on
 * it. Returns { result }.
 *
 * How the race is closed: each batch below runs as one transaction, and D1 runs batches one at a
 * time. Every statement in a batch is conditional on the payment still being unpaid at that point
 * (`unpaid`), and the statement that marks it paid comes last and reports whether it did. So of two
 * calls that both read the payment as unpaid, the first batch applies everything; the second finds
 * the payment already paid, changes nothing, and returns 'duplicate': no second count of the amount,
 * no refund, no emails.
 */
export async function handleCheckoutCompleted(env, session, now = new Date()) {
  const db = env.DB;
  await requireSchema(db);
  if (session?.payment_status !== 'paid') return { result: 'not_paid' };
  const payment = await paymentForSession(db, session);
  if (!payment) {
    console.error(`Stripe session ${session?.id} does not match any booking payment.`);
    return { result: 'unknown_session' };
  }
  if (payment.status === 'paid') return { result: 'duplicate' };
  if (session.amount_total !== payment.amount_pence || String(session.currency).toLowerCase() !== 'gbp') {
    console.error(`Stripe session ${session.id} amount does not match payment ${payment.id}.`);
    return { result: 'mismatch' };
  }
  const booking = await getBooking(db, payment.booking_id);
  const at = iso(now);
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
  const claim = { db, payment, at, intent, sessionId: session.id };

  if (payment.kind === 'balance') return completeBalance(env, booking, payment, claim, now);

  // Deposit or payment in full: confirm the booking. A hold that had run out is confirmed too if the
  // slot is still free; otherwise the database refuses and the payment is refunded below.
  const bookedOn = ukToday(now);
  const deposit = booking.plan === 'deposit';
  const due = deposit ? balanceDueOn(booking.slotDate) : null;
  const reminders = deposit ? reminderDates(booking.slotDate, bookedOn) : { r14: null, r8: null };
  const unpaid = unpaidSql(payment.id);
  // Confirmed by this batch: the booking update above it ran (its confirmed_at is this call's time).
  const confirmedHere = `${unpaid} AND EXISTS (SELECT 1 FROM bookings WHERE id = ${Number(booking.id)} AND status = 'confirmed' AND confirmed_at = '${at}')`;
  let results;
  try {
    results = await db.batch([
      db
        .prepare(
          `UPDATE bookings SET status = 'confirmed', paid_pence = paid_pence + ?, confirmed_at = ?, booked_on = ?, hold_expires_at = NULL,
             balance_due_on = ?, reminder_14_on = ?, reminder_8_on = ?, updated_at = ?
           WHERE id = ? AND status IN ('holding', 'expired') AND ${unpaid}
           RETURNING id`,
        )
        .bind(payment.amount_pence, at, bookedOn, due, reminders.r14, reminders.r8, at, booking.id),
      db
        .prepare(
          `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
           SELECT ?, ?, 'customer', 'booking_confirmed', ? WHERE ${confirmedHere}`,
        )
        .bind(
          booking.enquiryId,
          at,
          JSON.stringify({ quote: booking.quoteReference, date: booking.slotDate, period: booking.period, plan: booking.plan, paidPence: payment.amount_pence }),
        ),
      db
        .prepare(
          `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
           SELECT id, ?, 'system', 'status', json_object('from', status, 'to', 'booked')
           FROM enquiries WHERE id = ? AND status IN ('new', 'reviewing', 'quoted', 'accepted', 'payment_pending') AND ${confirmedHere}`,
        )
        .bind(at, booking.enquiryId),
      db
        .prepare(
          `UPDATE enquiries SET status = 'booked', status_changed_at = ?, updated_at = ?
           WHERE id = ? AND status IN ('new', 'reviewing', 'quoted', 'accepted', 'payment_pending') AND ${confirmedHere}`,
        )
        .bind(at, at, booking.enquiryId),
      markPaidSql(claim),
    ]);
  } catch (error) {
    if (!constraintOf(error)) throw error;
    // The hold had run out and the slot (or this quote) has another booking now. Nothing was written.
    return refundLatePayment(env, booking, payment, claim, now);
  }
  if (!results[results.length - 1].results?.[0]) return { result: 'duplicate' };
  if (!results[0].results?.[0]) {
    // This call recorded the payment, but the booking is no longer waiting for it (it was cancelled
    // meanwhile).
    return refundLatePayment(env, booking, payment, { ...claim, recorded: true }, now);
  }

  const confirmed = await getBooking(db, booking.id);
  const pageUrl = await customerPageUrl(env, confirmed.quoteId);
  await notifyCustomer(env, confirmed, confirmedEmail(confirmed, pageUrl), `booking-confirmed-${payment.id}`, 'booking confirmed');
  await notifyInternal(env, confirmed, 'confirmed', { key: `internal-booking-confirmed-${payment.id}` });
  return { result: 'confirmed', bookingId: booking.id };
}

/** True while the payment is not yet marked paid (evaluated inside a batch, before markPaidSql). */
const unpaidSql = (paymentId) => `EXISTS (SELECT 1 FROM booking_payments WHERE id = ${Number(paymentId)} AND status <> 'paid')`;

/** Marks the payment paid; the last statement of a batch. Returns a row only for the call that did. */
const markPaidSql = ({ db, payment, at, intent, sessionId }) =>
  db
    .prepare(
      `UPDATE booking_payments SET status = 'paid', paid_at = ?, stripe_payment_intent = ?, stripe_session_id = COALESCE(stripe_session_id, ?), updated_at = ?
       WHERE id = ? AND status <> 'paid'
       RETURNING id`,
    )
    .bind(at, intent, sessionId, at, payment.id);

async function completeBalance(env, booking, payment, claim, now) {
  const { db, at } = claim;
  const unpaid = unpaidSql(payment.id);
  const active = `EXISTS (SELECT 1 FROM bookings WHERE id = ${Number(booking.id)} AND status IN ('confirmed', 'cancel_requested'))`;
  const results = await db.batch([
    db
      .prepare(
        `UPDATE bookings SET paid_pence = paid_pence + ?, updated_at = ?
         WHERE id = ? AND status IN ('confirmed', 'cancel_requested') AND ${unpaid}
         RETURNING id`,
      )
      .bind(payment.amount_pence, at, booking.id),
    db
      .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) SELECT ?, ?, 'customer', 'balance_paid', ? WHERE ${unpaid} AND ${active}`)
      .bind(booking.enquiryId, at, JSON.stringify({ quote: booking.quoteReference, paidPence: payment.amount_pence })),
    markPaidSql(claim),
  ]);
  if (!results[results.length - 1].results?.[0]) return { result: 'duplicate' };
  if (!results[0].results?.[0]) {
    // The booking was cancelled (for example at the balance deadline) before this payment completed.
    return refundLatePayment(env, booking, payment, { ...claim, recorded: true }, now);
  }
  const updated = await getBooking(db, booking.id);
  const pageUrl = await customerPageUrl(env, updated.quoteId);
  await notifyCustomer(env, updated, balancePaidEmail(updated, payment.amount_pence, pageUrl), `balance-paid-${payment.id}`, 'balance received');
  await notifyInternal(env, updated, 'balance_paid', { key: `internal-balance-paid-${payment.id}` });
  return { result: 'balance_paid', bookingId: booking.id };
}

/**
 * A payment that completed after its booking had ended: record it, refund it in full, and tell the
 * customer and ROSS 360. A booking whose hold ran out is cancelled ('slot_unavailable') so the
 * payment and its refund belong to it.
 *
 * `claim.recorded` is true when this call has just marked the payment paid itself. Otherwise this
 * batch records it, last and only if still unpaid, so a concurrent duplicate refunds nothing.
 */
async function refundLatePayment(env, booking, payment, claim, now) {
  const { db, at, recorded = false } = claim;
  const once = recorded ? '1 = 1' : unpaidSql(payment.id);
  const noRefund = `NOT EXISTS (SELECT 1 FROM booking_refunds WHERE payment_id = ${Number(payment.id)})`;
  const statements = [
    db
      .prepare(
        `UPDATE bookings SET paid_pence = paid_pence + ?, updated_at = ?,
           status = CASE WHEN status = 'expired' THEN 'cancelled' ELSE status END,
           cancel_reason = CASE WHEN status = 'expired' THEN 'slot_unavailable' ELSE cancel_reason END,
           cancelled_at = CASE WHEN status = 'expired' THEN ? ELSE cancelled_at END,
           cancelled_by = CASE WHEN status = 'expired' THEN 'system' ELSE cancelled_by END
         WHERE id = ? AND ${once} AND ${noRefund}`,
      )
      .bind(payment.amount_pence, at, at, booking.id),
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, 'system', 'payment_refunded_late', ? WHERE ${once} AND ${noRefund}`,
      )
      .bind(booking.enquiryId, at, JSON.stringify({ quote: booking.quoteReference, paidPence: payment.amount_pence, kind: payment.kind })),
    db
      .prepare(
        `INSERT INTO booking_refunds (booking_id, payment_id, amount_pence, status, created_at, updated_at)
         SELECT ?, ?, ?, 'pending', ?, ? WHERE ${once} AND ${noRefund}
         RETURNING id`,
      )
      .bind(booking.id, payment.id, payment.amount_pence, at, at),
  ];
  if (!recorded) statements.push(markPaidSql(claim));
  const results = await db.batch(statements);
  if (!recorded && !results[results.length - 1].results?.[0]) return { result: 'duplicate' };
  if (!results[2].results?.[0]) return { result: 'duplicate' };
  await executeRefunds(env, { bookingId: booking.id, now });
  const updated = await getBooking(db, booking.id);
  const pageUrl = await customerPageUrl(env, updated.quoteId);
  await notifyCustomer(env, updated, lateRefundEmail(updated, pageUrl), `late-refund-${payment.id}`, 'late payment refunded');
  await notifyInternal(env, updated, 'late_payment', { key: `internal-late-refund-${payment.id}`, refunds: await refundsOf(db, booking.id) });
  return { result: 'refunded_late', bookingId: booking.id };
}

/** A Checkout session expired unpaid: release its hold (a balance payment simply lapses). */
export async function handleCheckoutExpired(env, session, now = new Date()) {
  const db = env.DB;
  await requireSchema(db);
  const payment = await paymentForSession(db, session);
  if (!payment || payment.status !== 'open') return { result: 'ignored' };
  const t = iso(now);
  await db.batch([
    db.prepare(`UPDATE booking_payments SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'open'`).bind(t, payment.id),
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT q.enquiry_id, ?, 'system', 'checkout_expired', json_object('quote', q.reference, 'date', s.slot_date, 'period', s.period)
         FROM bookings b JOIN quotes q ON q.id = b.quote_id JOIN availability_slots s ON s.id = b.slot_id
         WHERE b.id = ? AND b.status = 'holding'`,
      )
      .bind(t, payment.booking_id),
    db.prepare(`UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'holding'`).bind(t, payment.booking_id),
  ]);
  return { result: 'expired' };
}

/**
 * The customer is back from Stripe (success_url). The session is checked with Stripe directly, so the
 * booking is confirmed even if the webhook is late. Returns { result: 'confirmed' | 'pending' | 'other' }.
 */
export async function confirmReturn(env, ctx, sessionId, now = new Date()) {
  if (typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]{1,200}$/.test(sessionId)) return { result: 'other' };
  const row = await env.DB.prepare(
    `SELECT p.id FROM booking_payments p JOIN bookings b ON b.id = p.booking_id WHERE p.stripe_session_id = ? AND b.quote_id = ?`,
  )
    .bind(sessionId, ctx.quoteId)
    .first();
  if (!row) return { result: 'other' };
  let session;
  try {
    session = await retrieveCheckoutSession(env, sessionId);
  } catch {
    return { result: 'pending' };
  }
  if (session.status === 'complete' && session.payment_status === 'paid') {
    await handleCheckoutCompleted(env, session, now);
    return { result: 'confirmed' };
  }
  return { result: 'pending' };
}

/** A refund changed at Stripe after it was made (a refund can fail later). */
export async function handleRefundUpdated(env, refund, now = new Date()) {
  const db = env.DB;
  if (!refund?.id || !['failed', 'canceled'].includes(refund.status)) return { result: 'ignored' };
  const row = await db.prepare(`SELECT * FROM booking_refunds WHERE stripe_refund_id = ?`).bind(refund.id).first();
  if (!row || row.status !== 'succeeded') return { result: 'ignored' };
  const t = iso(now);
  const results = await db.batch([
    db
      .prepare(`UPDATE booking_refunds SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ? AND status = 'succeeded' RETURNING id`)
      .bind(`Stripe reported the refund ${refund.status}${refund.failure_reason ? ` (${String(refund.failure_reason).slice(0, 60)})` : ''}.`, t, row.id),
    db
      .prepare(
        `UPDATE bookings SET refunded_pence = refunded_pence - ?, updated_at = ?
         WHERE id = ? AND EXISTS (SELECT 1 FROM booking_refunds WHERE id = ? AND status = 'failed' AND updated_at = ?)`,
      )
      .bind(row.amount_pence, t, row.booking_id, row.id, t),
  ]);
  if (results[0].results?.[0]) {
    const b = await getBooking(db, row.booking_id);
    await event(db, b.enquiryId, t, 'system', 'refund_failed', { quote: b.quoteReference, amountPence: row.amount_pence }).run();
    await notifyInternal(env, b, 'refund_failed', { key: `internal-refund-failed-${row.id}-late`, refunds: await refundsOf(db, b.id) });
  }
  return { result: 'updated' };
}

// --- Balance ------------------------------------------------------------------------------------

/**
 * Start Stripe Checkout for a deposit booking's balance. The session expires by the deadline, so a
 * balance cannot be paid after the booking has been cancelled for non-payment.
 * Returns { result: 'ok' | 'nothing_due' | 'too_late' | 'payments_off' | 'payment_start_failed', url? }.
 */
export async function startBalanceCheckout(env, ctx, pageUrl, now = new Date()) {
  const db = env.DB;
  if (!paymentsAvailable(env)) return { result: 'payments_off' };
  const b = await activeBooking(db, ctx.quoteId);
  if (!b || b.status !== 'confirmed' || b.plan !== 'deposit') return { result: 'nothing_due' };
  const balance = b.totalPence - b.paidPence;
  if (balance <= 0) return { result: 'nothing_due' };
  const deadline = ukEndOfDay(b.balanceDueOn).getTime();
  // Stripe sessions last at least 30 minutes, so the last half hour before the deadline is too late.
  const latestStart = deadline - (CHECKOUT_MINUTES * 60 + CHECKOUT_SLACK_SECONDS + 60) * 1000;
  if (now.getTime() > latestStart) return { result: 'too_late' };

  const open = await openPayment(db, b.id);
  if (open) {
    if (open.sessionUrl && Date.parse(open.expiresAt) - now.getTime() > 5 * 60_000) return { result: 'ok', url: open.sessionUrl };
    if (open.sessionId) {
      try {
        await expireCheckoutSession(env, open.sessionId);
      } catch {
        // Already expired or complete; the webhook settles a completed one.
      }
    }
    await db.prepare(`UPDATE booking_payments SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'open'`).bind(iso(now), open.id).run();
  }

  const at = iso(now);
  const sessionExpires = Math.floor(Math.min(now.getTime() + 23 * 3_600_000, deadline - 60_000) / 1000);
  let paymentId;
  try {
    const row = await db
      .prepare(
        `INSERT INTO booking_payments (booking_id, kind, amount_pence, status, expires_at, created_at, updated_at)
         SELECT ?, 'balance', ?, 'open', ?, ?, ? WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'confirmed' AND paid_pence = ?)
         RETURNING id`,
      )
      .bind(b.id, balance, iso(new Date(sessionExpires * 1000)), at, at, b.id, b.paidPence)
      .first();
    paymentId = row?.id;
  } catch (error) {
    if (constraintOf(error) === 'payment') return { result: 'payment_start_failed' };
    throw error;
  }
  if (!paymentId) return { result: 'nothing_due' };
  const name = `Balance: 360° virtual tour, ${slotText(b.slotDate, b.period)} (quotation ${b.quoteReference})`;
  const metadata = { booking_id: String(b.id), payment_id: String(paymentId), quote: b.quoteReference, kind: 'balance' };
  try {
    const session = await createCheckoutSession(
      env,
      {
        mode: 'payment',
        payment_method_types: ['card'],
        locale: 'en-GB',
        customer_email: b.customerEmail || undefined,
        client_reference_id: `booking-${b.id}`,
        line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: balance, product_data: { name } } }],
        metadata,
        payment_intent_data: { description: name, metadata },
        success_url: `${pageUrl}/paid?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: pageUrl,
        expires_at: sessionExpires,
      },
      `checkout-${paymentId}`,
    );
    if (!session?.id || !session?.url) throw new StripeError('Stripe returned no session.');
    await db
      .prepare(`UPDATE booking_payments SET stripe_session_id = ?, stripe_session_url = ?, updated_at = ? WHERE id = ? AND status = 'open'`)
      .bind(session.id, session.url, iso(new Date()), paymentId)
      .run();
    return { result: 'ok', url: session.url };
  } catch (error) {
    console.error(`Balance checkout could not be started for ${b.quoteReference}: ${error.message}`);
    await db.prepare(`UPDATE booking_payments SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'open'`).bind(iso(new Date()), paymentId).run();
    return { result: 'payment_start_failed' };
  }
}

// --- Cancellations and refunds --------------------------------------------------------------------

/**
 * The customer cancels online. More than 48 hours before the slot: cancelled and refunded in full at
 * once. Within 48 hours: a request for ROSS 360 to decide. After the slot has started: refused.
 * Returns { result: 'cancelled' | 'requested' | 'started' | 'not_allowed', booking? }.
 */
export async function customerCancel(env, ctx, now = new Date()) {
  const db = env.DB;
  const b = await activeBooking(db, ctx.quoteId);
  if (!b || b.status !== 'confirmed') return { result: 'not_allowed' };
  const window = cancellationWindow(b.slotDate, b.period, now);
  if (window === 'started') return { result: 'started' };
  if (window === 'free') {
    const outcome = await cancelBooking(env, b.id, { reason: 'customer', retainPence: 0, actor: 'customer', expect: 'confirmed' }, now);
    return { ...outcome, result: outcome.result === 'ok' ? 'cancelled' : 'not_allowed' };
  }
  const at = iso(now);
  const results = await db.batch([
    db
      .prepare(`UPDATE bookings SET status = 'cancel_requested', cancel_requested_at = ?, updated_at = ? WHERE id = ? AND status = 'confirmed' RETURNING id`)
      .bind(at, at, b.id),
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT ?, ?, 'customer', 'booking_cancel_requested', ? WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'cancel_requested' AND cancel_requested_at = ?)`,
      )
      .bind(b.enquiryId, at, JSON.stringify({ quote: b.quoteReference, date: b.slotDate, period: b.period }), b.id, at),
  ]);
  if (!results[0].results?.[0]) return { result: 'not_allowed' };
  const updated = await getBooking(db, b.id);
  await notifyCustomer(env, updated, cancelRequestEmail(updated), `cancel-request-${b.id}`, 'cancellation request received');
  await notifyInternal(env, updated, 'cancel_requested', { key: `internal-cancel-request-${b.id}` });
  return { result: 'requested', booking: updated };
}

/**
 * Split a refund across a booking's paid payments, most recent first. Returns [{ paymentId, amount }].
 */
function allocateRefund(payments, total) {
  const allocation = [];
  let left = total;
  for (const p of [...payments].filter((x) => x.status === 'paid').reverse()) {
    if (left <= 0) break;
    const amount = Math.min(left, p.amountPence);
    allocation.push({ paymentId: p.id, amount });
    left -= amount;
  }
  return allocation;
}

/**
 * Cancel a booking and refund what is due.
 *
 * reason: 'customer' (outside 48 hours: full refund), 'customer_late' (ROSS 360 decides retainPence,
 * at most 50% of the booking price and never more than was paid), 'ross360' (full refund) or
 * 'unpaid_balance' (the deposit refunded in full). Only 'customer_late' may keep anything.
 * expect: the status the caller saw ('confirmed' or 'cancel_requested'), so a stale screen cannot act.
 *
 * The booking, the refund rows and the timeline are written in one transaction; the refunds are then
 * sent to Stripe (and retried by the schedule if Stripe gives no answer).
 * Returns { result: 'ok' | 'not_found' | 'changed' | 'invalid_retention', booking?, refunds? }.
 */
export async function cancelBooking(env, bookingId, { reason, retainPence = 0, actor, expect }, now = new Date()) {
  const db = env.DB;
  await requireSchema(db);
  const b = await getBooking(db, bookingId);
  if (!b) return { result: 'not_found' };
  if (!['confirmed', 'cancel_requested'].includes(b.status) || (expect && b.status !== expect)) return { result: 'changed', booking: b };
  const retain = Number(retainPence) || 0;
  if (!Number.isSafeInteger(retain) || retain < 0) return { result: 'invalid_retention', booking: b };
  // Only a customer's cancellation within 48 hours of the slot (or after it started) may keep anything.
  const lateAllowed = b.status === 'cancel_requested' || cancellationWindow(b.slotDate, b.period, now) !== 'free';
  if (reason === 'customer_late' && !lateAllowed) return { result: 'invalid_retention', booking: b, max: 0 };
  if (retain > 0 && (reason !== 'customer_late' || retain > maxRetention(b.totalPence, b.paidPence))) {
    return { result: 'invalid_retention', booking: b, max: reason === 'customer_late' ? maxRetention(b.totalPence, b.paidPence) : 0 };
  }
  const payments = await paymentsOf(db, b.id);
  const refundTotal = b.paidPence - b.refundedPence - retain;
  const allocation = allocateRefund(payments, refundTotal);
  const at = iso(now);
  const cancelledNow = `EXISTS (SELECT 1 FROM bookings WHERE id = ${Number(b.id)} AND status = 'cancelled' AND cancelled_at = '${at}')`;
  const results = await db.batch([
    db
      .prepare(
        `UPDATE bookings SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?, cancelled_by = ?, retained_pence = ?, updated_at = ?
         WHERE id = ? AND status = ? AND paid_pence = ?
         RETURNING id`,
      )
      .bind(at, reason, actor, retain, at, b.id, b.status, b.paidPence),
    ...allocation.map(({ paymentId, amount }) =>
      db
        .prepare(`INSERT INTO booking_refunds (booking_id, payment_id, amount_pence, status, created_at, updated_at) SELECT ?, ?, ?, 'pending', ?, ? WHERE ${cancelledNow}`)
        .bind(b.id, paymentId, amount, at, at),
    ),
    db
      .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) SELECT ?, ?, ?, 'booking_cancelled', ? WHERE ${cancelledNow}`)
      .bind(
        b.enquiryId,
        at,
        actor,
        JSON.stringify({ quote: b.quoteReference, date: b.slotDate, period: b.period, reason, paidPence: b.paidPence, retainedPence: retain, refundPence: refundTotal }),
      ),
  ]);
  if (!results[0].results?.[0]) return { result: 'changed', booking: await getBooking(db, b.id) };

  // A balance checkout still open can no longer be paid.
  const open = payments.find((p) => p.status === 'open');
  if (open) {
    if (open.sessionId) {
      try {
        await expireCheckoutSession(env, open.sessionId);
      } catch {
        // Already ended; a late payment is refunded when Stripe reports it.
      }
    }
    await db.prepare(`UPDATE booking_payments SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'open'`).bind(at, open.id).run();
  }

  await executeRefunds(env, { bookingId: b.id, now });
  const cancelled = await getBooking(db, b.id);
  const refunds = await refundsOf(db, b.id);
  await notifyCustomer(env, cancelled, cancelledEmail(cancelled, refunds), `booking-cancelled-${b.id}`, 'booking cancelled');
  await notifyInternal(env, cancelled, 'cancelled', { key: `internal-booking-cancelled-${b.id}`, refunds });
  return { result: 'ok', booking: cancelled, refunds };
}

/**
 * Send pending refunds to Stripe (all of them, or one booking's). Each uses Idempotency-Key
 * refund-<id>, so a retry after a lost answer never refunds twice. A definite refusal marks the refund
 * failed (shown in the Admin); no answer leaves it pending for the next run.
 */
export async function executeRefunds(env, { bookingId = null, refundId = null, olderThanMs = 0, now = new Date() } = {}) {
  const db = env.DB;
  const cutoff = iso(new Date(now.getTime() - olderThanMs));
  const where = ["r.status = 'pending'", 'r.updated_at <= ?'];
  const params = [cutoff];
  if (bookingId) {
    where.push('r.booking_id = ?');
    params.push(bookingId);
  }
  if (refundId) {
    where.push('r.id = ?');
    params.push(refundId);
  }
  const { results } = await db
    .prepare(
      `SELECT r.*, p.stripe_payment_intent FROM booking_refunds r JOIN booking_payments p ON p.id = r.payment_id
       WHERE ${where.join(' AND ')} ORDER BY r.id LIMIT 50`,
    )
    .bind(...params)
    .all();
  const outcome = { succeeded: 0, failed: 0, pending: 0 };
  for (const r of results) {
    const t = iso(new Date());
    await db.prepare(`UPDATE booking_refunds SET attempts = attempts + 1, updated_at = ? WHERE id = ?`).bind(t, r.id).run();
    if (!r.stripe_payment_intent) {
      await db.prepare(`UPDATE booking_refunds SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ? AND status = 'pending'`).bind('No Stripe payment to refund.', t, r.id).run();
      outcome.failed += 1;
      continue;
    }
    try {
      const refund = await createRefund(
        env,
        { payment_intent: r.stripe_payment_intent, amount: r.amount_pence, metadata: { booking_id: String(r.booking_id), refund_id: String(r.id) } },
        `refund-${r.id}`,
      );
      if (refund?.status === 'failed' || refund?.status === 'canceled') throw new StripeError(`Refund ${refund.status}.`, { definite: true });
      await db.batch([
        db
          .prepare(`UPDATE booking_refunds SET status = 'succeeded', stripe_refund_id = ?, last_error = NULL, updated_at = ? WHERE id = ? AND status = 'pending'`)
          .bind(refund?.id || null, t, r.id),
        db
          .prepare(
            `UPDATE bookings SET refunded_pence = refunded_pence + ?, updated_at = ?
             WHERE id = ? AND EXISTS (SELECT 1 FROM booking_refunds WHERE id = ? AND status = 'succeeded' AND updated_at = ?)`,
          )
          .bind(r.amount_pence, t, r.booking_id, r.id, t),
        db
          .prepare(
            `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
             SELECT q.enquiry_id, ?, 'system', 'refund_issued', json_object('quote', q.reference, 'amountPence', ?)
             FROM bookings b JOIN quotes q ON q.id = b.quote_id WHERE b.id = ?`,
          )
          .bind(t, r.amount_pence, r.booking_id),
      ]);
      outcome.succeeded += 1;
    } catch (error) {
      if (error instanceof StripeError && error.definite) {
        await db.batch([
          db
            .prepare(`UPDATE booking_refunds SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ? AND status = 'pending'`)
            .bind(String(error.message).slice(0, 300), t, r.id),
          db
            .prepare(
              `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
               SELECT q.enquiry_id, ?, 'system', 'refund_failed', json_object('quote', q.reference, 'amountPence', ?)
               FROM bookings b JOIN quotes q ON q.id = b.quote_id WHERE b.id = ?`,
            )
            .bind(t, r.amount_pence, r.booking_id),
        ]);
        const b = await getBooking(db, r.booking_id);
        await notifyInternal(env, b, 'refund_failed', { key: `internal-refund-failed-${r.id}-${r.attempts + 1}`, refunds: await refundsOf(db, b.id) });
        outcome.failed += 1;
      } else {
        console.error(`Refund ${r.id} got no clear answer from Stripe; it will be retried. ${error.message}`);
        outcome.pending += 1;
      }
    }
  }
  return outcome;
}

/** The Admin retries a failed refund (same Stripe idempotency key). */
export async function retryRefund(env, refundId, bookingId, now = new Date()) {
  const db = env.DB;
  const row = await db
    .prepare(`UPDATE booking_refunds SET status = 'pending', updated_at = ? WHERE id = ? AND booking_id = ? AND status = 'failed' RETURNING booking_id`)
    .bind(iso(now), refundId, bookingId)
    .first();
  if (!row) return { result: 'not_failed' };
  await executeRefunds(env, { refundId, now });
  return { result: 'ok', booking: await getBooking(db, row.booking_id) };
}

// --- Moving a booking ---------------------------------------------------------------------------

/**
 * Move a confirmed booking to another open slot, keeping its payments. A deposit booking's balance
 * deadline and reminders follow the new date; an unpaid balance cannot be moved past its deadline.
 * Returns { result: 'ok' | 'not_found' | 'changed' | 'slot_unavailable' | 'balance_first' | 'past', booking? }.
 */
export async function moveBooking(env, bookingId, slotId, actor, now = new Date()) {
  const db = env.DB;
  await requireSchema(db);
  const b = await getBooking(db, bookingId);
  if (!b) return { result: 'not_found' };
  if (b.status !== 'confirmed') return { result: 'changed', booking: b };
  const slot = await db.prepare(`SELECT * FROM availability_slots WHERE id = ?`).bind(slotId).first();
  if (!slot || slot.id === b.slotId) return { result: 'slot_unavailable', booking: b };
  const today = ukToday(now);
  if (slot.slot_date < today) return { result: 'past', booking: b };
  const unpaid = b.totalPence - b.paidPence > 0;
  const due = b.plan === 'deposit' ? balanceDueOn(slot.slot_date) : null;
  if (unpaid && due && balanceOverdue(due, now)) return { result: 'balance_first', booking: b };
  const reminders = unpaid && due ? reminderDates(slot.slot_date, today) : { r14: null, r8: null };
  const at = iso(now);
  await releaseHolds(db, now);
  let results;
  try {
    results = await db.batch([
      db
        .prepare(
          `UPDATE bookings SET slot_id = ?, balance_due_on = ?, reminder_14_on = ?, reminder_14_sent_at = NULL, reminder_8_on = ?, reminder_8_sent_at = NULL, updated_at = ?
           WHERE id = ? AND status = 'confirmed' AND slot_id = ?
           RETURNING id`,
        )
        .bind(slot.id, due, reminders.r14, reminders.r8, at, b.id, b.slotId),
      db
        .prepare(
          `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
           SELECT ?, ?, ?, 'booking_moved', ? WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ? AND slot_id = ? AND updated_at = ?)`,
        )
        .bind(
          b.enquiryId,
          at,
          actor,
          JSON.stringify({ quote: b.quoteReference, fromDate: b.slotDate, fromPeriod: b.period, date: slot.slot_date, period: slot.period }),
          b.id,
          slot.id,
          at,
        ),
    ]);
  } catch (error) {
    if (constraintOf(error) === 'slot') return { result: 'slot_unavailable', booking: b };
    throw error;
  }
  if (!results[0].results?.[0]) return { result: 'changed', booking: await getBooking(db, b.id) };
  const moved = await getBooking(db, b.id);
  await notifyCustomer(env, moved, movedEmail(moved, await customerPageUrl(env, moved.quoteId)), `booking-moved-${b.id}-${slot.id}-${at}`, 'booking moved');
  return { result: 'ok', booking: moved };
}

// --- The schedule ---------------------------------------------------------------------------------

/**
 * The hourly run (Cron Worker -> POST /api/scheduler/run, or "Run scheduled tasks" in the Admin).
 * Safe to run at any time and any number of times:
 * 1. releases checkout holds that have run out;
 * 2. emails balance reminders that are due (from 09:00 UK time), each once;
 * 3. cancels deposit bookings whose balance is unpaid after the deadline, refunding the deposit;
 * 4. retries refunds Stripe has not answered.
 * Returns a summary of what it did.
 */
export async function runScheduled(env, now = new Date()) {
  const db = env.DB;
  await requireSchema(db);
  const summary = { holdsReleased: 0, reminders: 0, cancelled: 0, refunds: null };
  const today = ukToday(now);

  const released = await db.batch(releaseExpiredHolds(db, now));
  summary.holdsReleased = released[2].results?.length ?? 0;

  // Overdue balances first, so a booking past its deadline gets no reminder.
  const { results: overdue } = await db
    .prepare(
      `SELECT id, balance_due_on FROM bookings
       WHERE status = 'confirmed' AND plan = 'deposit' AND paid_pence < total_pence AND balance_due_on <= ?`,
    )
    .bind(today)
    .all();
  for (const row of overdue) {
    if (!balanceOverdue(row.balance_due_on, now)) continue;
    // A balance payment completed at the last moment is recorded first.
    const open = await openPayment(db, row.id);
    if (open?.sessionId) {
      try {
        const session = await retrieveCheckoutSession(env, open.sessionId);
        if (session.status === 'complete' && session.payment_status === 'paid') {
          await handleCheckoutCompleted(env, session, now);
          continue;
        }
      } catch {
        continue; // Stripe unreachable: decide on the next run rather than risk cancelling a paid booking.
      }
    }
    const outcome = await cancelBooking(env, row.id, { reason: 'unpaid_balance', retainPence: 0, actor: 'system', expect: 'confirmed' }, now);
    if (outcome.result === 'ok') summary.cancelled += 1;
  }

  if (ukHour(now) >= REMINDER_FROM_HOUR) {
    const { results: due } = await db
      .prepare(
        `SELECT id FROM bookings
         WHERE status = 'confirmed' AND plan = 'deposit' AND paid_pence < total_pence
           AND ((reminder_14_on IS NOT NULL AND reminder_14_on <= ? AND reminder_14_sent_at IS NULL)
             OR (reminder_8_on IS NOT NULL AND reminder_8_on <= ? AND reminder_8_sent_at IS NULL))`,
      )
      .bind(today, today)
      .all();
    for (const { id } of due) {
      if (await sendReminder(env, id, now)) summary.reminders += 1;
    }
  }

  summary.refunds = await executeRefunds(env, { olderThanMs: 2 * 60_000, now });
  return summary;
}

/**
 * Send the reminder that is due for a booking. If the 14-day reminder was missed and the 8-day one is
 * now due, only the 8-day one is sent. The reminder is claimed before it is emailed, so two runs at
 * once send it once; a failed email is released to be tried again on the next run.
 */
async function sendReminder(env, bookingId, now) {
  const db = env.DB;
  const b = await getBooking(db, bookingId);
  if (!b || balanceOverdue(b.balanceDueOn, now)) return false;
  const today = ukToday(now);
  const which = b.reminder8On && b.reminder8On <= today && !b.reminder8SentAt ? 8 : 14;
  const at = iso(now);
  const claimed = await db
    .prepare(
      which === 8
        ? `UPDATE bookings SET reminder_8_sent_at = ?, reminder_14_sent_at = COALESCE(reminder_14_sent_at, CASE WHEN reminder_14_on IS NULL THEN NULL ELSE 'skipped' END), updated_at = ?
           WHERE id = ? AND reminder_8_sent_at IS NULL AND status = 'confirmed' RETURNING id`
        : `UPDATE bookings SET reminder_14_sent_at = ?, updated_at = ? WHERE id = ? AND reminder_14_sent_at IS NULL AND status = 'confirmed' RETURNING id`,
    )
    .bind(at, at, b.id)
    .first();
  if (!claimed) return false;
  const pageUrl = await customerPageUrl(env, b.quoteId);
  const sent = await sendEmail(env, reminderEmail(b, pageUrl ? `${pageUrl}/balance` : null), {
    idempotencyKey: `balance-reminder-${which}-${b.id}-${b.balanceDueOn}`,
    customer: true,
    label: `balance reminder ${which}`,
  });
  if (!sent.ok && !sent.skipped) {
    await db
      .prepare(`UPDATE bookings SET ${which === 8 ? 'reminder_8_sent_at' : 'reminder_14_sent_at'} = NULL WHERE id = ? AND ${which === 8 ? 'reminder_8_sent_at' : 'reminder_14_sent_at'} = ?`)
      .bind(b.id, at)
      .run();
    await recordEmailFailure(env, b, `balance reminder ${which}`, sent.status);
    return false;
  }
  await event(db, b.enquiryId, at, 'system', 'balance_reminder_sent', {
    quote: b.quoteReference,
    days: which,
    balanceDueOn: b.balanceDueOn,
    skipped: Boolean(sent.skipped),
  }).run();
  return true;
}

// --- The Admin --------------------------------------------------------------------------------------

/** A booking with its payments and refunds, as the Admin shows it. */
export async function bookingDetail(env, id, now = new Date()) {
  const b = await getBooking(env.DB, id);
  if (!b) return null;
  return {
    ...b,
    balancePence: Math.max(0, b.totalPence - b.paidPence),
    maxRetentionPence: maxRetention(b.totalPence, b.paidPence),
    cancellationWindow: ['confirmed', 'cancel_requested'].includes(b.status) ? cancellationWindow(b.slotDate, b.period, now) : null,
    holdActive: b.status === 'holding' && Date.parse(b.holdExpiresAt) > now.getTime(),
    payments: (await paymentsOf(env.DB, id)).map(({ sessionUrl, ...p }) => p),
    refunds: await refundsOf(env.DB, id),
  };
}

/**
 * Bookings for the Admin: active ones (and checkouts whose hold is live), then those cancelled in the
 * last 60 days, each with its money totals.
 */
export async function listBookings(db, now = new Date()) {
  await requireSchema(db);
  const since = addDays(ukToday(now), -60);
  const { results } = await db
    .prepare(
      `${SELECT_BOOKING}
       WHERE b.status IN ('confirmed', 'cancel_requested')
          OR (b.status = 'holding' AND b.hold_expires_at > ?)
          OR (b.status = 'cancelled' AND b.cancelled_at >= ?)
       ORDER BY CASE b.status WHEN 'cancel_requested' THEN 0 WHEN 'holding' THEN 1 WHEN 'confirmed' THEN 2 ELSE 3 END, s.slot_date, b.id
       LIMIT 300`,
    )
    .bind(iso(now), since)
    .all();
  const { results: failed } = await db.prepare(`SELECT DISTINCT booking_id FROM booking_refunds WHERE status IN ('failed', 'pending')`).all();
  const refundIssues = new Set(failed.map((r) => r.booking_id));
  return results.map((row) => {
    const b = bookingView(row);
    return { ...b, balancePence: Math.max(0, b.totalPence - b.paidPence), refundIssue: refundIssues.has(b.id) };
  });
}

/** Figures for the dashboard. */
export async function bookingCounts(db, now = new Date()) {
  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'cancel_requested' THEN 1 ELSE 0 END) AS cancel_requests,
         SUM(CASE WHEN status = 'confirmed' AND plan = 'deposit' AND paid_pence < total_pence THEN 1 ELSE 0 END) AS balances_due
       FROM bookings`,
    )
    .first();
  const refunds = await db.prepare(`SELECT COUNT(*) AS n FROM booking_refunds WHERE status = 'failed'`).first();
  return { cancelRequests: row?.cancel_requests ?? 0, balancesDue: row?.balances_due ?? 0, failedRefunds: refunds?.n ?? 0 };
}

/** Slots a booking can be moved to: open, today or later, with no active booking. */
export async function moveTargets(db, now = new Date()) {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.slot_date, s.period FROM availability_slots s
       WHERE s.status = 'open' AND s.slot_date >= ?
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND (b.status IN ('confirmed', 'cancel_requested') OR (b.status = 'holding' AND b.hold_expires_at > ?)))
       ORDER BY s.slot_date, CASE s.period WHEN 'am' THEN 1 WHEN 'pm' THEN 2 ELSE 3 END LIMIT 200`,
    )
    .bind(ukToday(now), iso(now))
    .all();
  return results.map((s) => ({ id: s.id, date: s.slot_date, period: s.period, label: `${weekdayDate(s.slot_date)}, ${periodLabel(s.period)}` }));
}
