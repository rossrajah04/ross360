// Cloudflare Pages Function: the customer's quotation page and self-service booking (Phase C).
//
//   GET  /q/<token>                          the quotation as sent, with the booking
//   GET  /q/<token>/book                     open slots
//   GET  /q/<token>/pay?slot=<id>            payment summary for a slot (in full, or the deposit)
//   POST /q/<token>/pay                      hold the slot and go to Stripe Checkout
//   POST /q/<token>/release                  end a checkout in progress, to choose a different slot
//   GET  /q/<token>/paid?session_id=…        back from Stripe (the payment is checked with Stripe)
//   GET  /q/<token>/checkout-cancelled       back from Stripe without paying: the slot is released
//   GET  /q/<token>/balance, POST            pay a deposit booking's balance on Stripe Checkout
//   GET  /q/<token>/cancel, POST             cancel the booking (or ask to, within 48 hours)
//
// Every invalid, unknown, revoked or expired-past-window link gets the same answer. Pages are never
// cached or indexed, run no scripts, and cannot be framed. Forms need the same origin and a signed,
// short-lived nonce. Card details are only ever entered on Stripe's own page.

import { SchemaNotReady } from '../../server/admin/schema.js';
import { checkFormNonce, formNonce } from '../../server/admin/quoteLinks.js';
import { recordView, resolveQuoteLink } from '../../server/customer/quotePage.js';
import {
  activeBooking,
  bookableSlot,
  bookableSlots,
  confirmReturn,
  customerCancel,
  latestBooking,
  paymentsAvailable,
  releaseCheckout,
  startBalanceCheckout,
  startCheckout,
} from '../../server/booking/bookings.js';
import { renderBalancePage, renderCancelPage, renderNotice, renderPayPage, renderQuotePage, renderSlotsPage } from '../../server/customer/render.js';
import { customerQuote as C } from '../../src/content/customerQuote.js';
import { booking as B } from '../../src/content/booking.js';
import { quoteEmail } from '../../src/content/quoteEmail.js';
import { site } from '../../src/content/site.js';
import { cancellationWindow, maxRetention, onlineBooking, paymentOptions } from '../../src/lib/admin/booking.js';
import { ukToday } from '../../src/lib/admin/quotes.js';

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  // Same-origin, so the browser sends this site's Origin with the forms (no-referrer would send
  // "null"); the token never leaves the site in a Referer.
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // form-action allows Stripe Checkout, where the payment form redirects.
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'none'; base-uri 'none'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'",
};

const MAX_FORM_CHARS = 2000;
const PAGES = ['book', 'pay', 'release', 'paid', 'checkout-cancelled', 'balance', 'cancel'];
const POSTS = ['pay', 'release', 'balance', 'cancel'];

const html = (body, status = 200) => new Response(body, { status, headers: HEADERS });
const notice = (message, status) => html(renderNotice(message), status);
const gone = () => notice(C.gone, 404);
const redirect = (url) => new Response(null, { status: 303, headers: { ...HEADERS, Location: url } });

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function onRequest(context) {
  try {
    return await handle(context);
  } catch (error) {
    if (error instanceof SchemaNotReady) {
      console.error(error.message);
      return notice(C.unavailable, 503);
    }
    console.error(`Customer quote page failed: ${error?.name || 'Error'}: ${error?.message || ''}`);
    return notice(B.error, 500);
  }
}

async function handle({ request, env, params }) {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, POST' } });
  }
  const parts = [].concat(params.path || []);
  const [token, page] = parts;
  if (!token || parts.length > 2 || (page !== undefined && !PAGES.includes(page))) return gone();
  if (method === 'POST' && !POSTS.includes(page)) return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET' } });

  const ctx = await resolveQuoteLink(env, token);
  if (ctx.state === 'gone') return gone();
  if (ctx.state === 'unavailable') return notice(C.unavailable, 200);
  if (ctx.state === 'replaced') return notice(C.replaced, 200);

  const db = env.DB;
  const url = new URL(request.url);
  const base = `${url.origin}/q/${token}`;
  const urls = {
    self: `/q/${token}`,
    book: `/q/${token}/book`,
    pay: `/q/${token}/pay`,
    release: `/q/${token}/release`,
    balance: `/q/${token}/balance`,
    cancel: `/q/${token}/cancel`,
  };
  const termsUrl = `${site.url}${quoteEmail.termsPath}`;
  const nonce = () => formNonce(env, ctx.linkId);

  // --- The quotation page ---------------------------------------------------------------------
  if (!page) {
    await recordView(db, ctx);
    const booking = await withSession(db, await activeBooking(db, ctx.quoteId));
    const latest = booking ? null : await latestBooking(db, ctx.quoteId);
    const n = url.searchParams.get('notice');
    return html(
      renderQuotePage({
        snapshot: ctx.snapshot,
        state: ctx.state,
        booking,
        latest,
        urls,
        notice: n === 'released' || n === 'confirming' ? n : null,
        paymentsOn: paymentsAvailable(env),
        nonce: await nonce(),
      }),
    );
  }

  // --- Back from Stripe --------------------------------------------------------------------------
  if (page === 'paid') {
    const outcome = await confirmReturn(env, ctx, url.searchParams.get('session_id'));
    return redirect(`${urls.self}${outcome.result === 'confirmed' ? '' : '?notice=confirming'}`);
  }
  if (page === 'checkout-cancelled') {
    const outcome = await releaseCheckout(env, ctx);
    if (outcome.result === 'paid') return redirect(urls.self);
    return redirect(`${urls.self}${outcome.result === 'released' ? '?notice=released' : ''}`);
  }

  // Every form below needs the same origin, a form body and a valid nonce.
  let form = null;
  if (method === 'POST') {
    if (!sameOrigin(request)) return notice(B.error, 403);
    if (!(request.headers.get('Content-Type') || '').includes('application/x-www-form-urlencoded')) return notice(B.error, 415);
    const raw = await request.text();
    if (raw.length > MAX_FORM_CHARS) return notice(B.error, 413);
    form = new URLSearchParams(raw);
    if (!(await checkFormNonce(env, ctx.linkId, form.get('nonce')))) return notice(B.formExpired, 400);
  }

  // --- Managing an existing booking (works after the quotation's validity too) -------------------
  if (page === 'release') {
    await releaseCheckout(env, ctx);
    return redirect(urls.book);
  }

  if (page === 'balance') {
    const booking = await activeBooking(db, ctx.quoteId);
    if (!booking || booking.status !== 'confirmed' || booking.plan !== 'deposit') return redirect(urls.self);
    if (method === 'GET') return html(renderBalancePage({ snapshot: ctx.snapshot, booking, nonce: await nonce(), urls }));
    const outcome = await startBalanceCheckout(env, ctx, base);
    if (outcome.result === 'ok') return redirect(outcome.url);
    if (outcome.result === 'nothing_due') return redirect(urls.self);
    const state = outcome.result === 'too_late' ? 'too_late' : 'due';
    const error = outcome.result === 'payments_off' ? B.paymentsOff : outcome.result === 'too_late' ? '' : B.paymentStartFailed;
    return html(renderBalancePage({ snapshot: ctx.snapshot, booking, nonce: await nonce(), urls, error, state }), outcome.result === 'too_late' ? 409 : 502);
  }

  if (page === 'cancel') {
    const booking = await activeBooking(db, ctx.quoteId);
    if (!booking || booking.status !== 'confirmed') return redirect(urls.self);
    if (method === 'GET') {
      return html(
        renderCancelPage({
          snapshot: ctx.snapshot,
          booking,
          window: cancellationWindow(booking.slotDate, booking.period),
          maxRetentionPence: maxRetention(booking.totalPence, booking.paidPence),
          nonce: await nonce(),
          urls,
        }),
      );
    }
    await customerCancel(env, ctx);
    return redirect(urls.self);
  }

  // --- Booking: only while the quotation is valid and has no booking ----------------------------
  if (ctx.state !== 'valid') return redirect(urls.self);
  if (!onlineBooking(ctx.snapshot)) return redirect(urls.self);
  if (!paymentsAvailable(env)) return redirect(urls.self);
  const current = await activeBooking(db, ctx.quoteId);
  if (current && current.status !== 'holding') return redirect(urls.self);

  if (page === 'book') {
    return html(renderSlotsPage({ snapshot: ctx.snapshot, slots: await bookableSlots(db, new Date(), ctx.quoteId), urls }));
  }

  // page === 'pay'
  const slotParam = method === 'GET' ? url.searchParams.get('slot') : form.get('slot');
  const slotsPage = async (error, status) =>
    html(renderSlotsPage({ snapshot: ctx.snapshot, slots: await bookableSlots(db, new Date(), ctx.quoteId), urls, error }), status);
  if (!/^\d{1,10}$/.test(slotParam || '')) return slotsPage(B.chooseOne, 422);
  const slot = await bookableSlot(db, Number(slotParam), new Date(), ctx.quoteId);
  if (!slot) return slotsPage(B.slotGone, 409);
  const options = paymentOptions({ totalPence: ctx.snapshot.totalPence, pkg: ctx.snapshot.package, slotDate: slot.slot_date, today: ukToday() });
  const payPage = async (error, status, values = {}) =>
    html(renderPayPage({ snapshot: ctx.snapshot, slot, options, nonce: await nonce(), urls, termsUrl, error, values }), status);

  if (method === 'GET') return payPage('', 200);

  const values = { plan: form.get('plan') || '', agree: form.get('agree') === 'yes' };
  if (!['full', 'deposit'].includes(values.plan) || (values.plan === 'deposit' && !options.deposit)) return payPage(B.choosePlan, 422, values);
  if (!values.agree) return payPage(B.mustAgree, 422, values);
  const outcome = await startCheckout(env, ctx, { slotId: slot.id, plan: values.plan }, base);
  if (outcome.result === 'ok') return redirect(outcome.url);
  if (outcome.result === 'slot_unavailable') return slotsPage(B.slotGone, 409);
  if (outcome.result === 'already_booked') return redirect(urls.self);
  if (outcome.result === 'invalid_plan') return payPage(B.choosePlan, 422, values);
  if (outcome.result === 'in_progress') return redirect(urls.self);
  if (outcome.result === 'payments_off') return notice(B.paymentsOff, 503);
  if (outcome.result === 'not_allowed') return notice(B.notAllowed, 409);
  return payPage(B.paymentStartFailed, 502, values);
}

/** Add the Stripe page of a checkout in progress, so the customer can go back to it. */
async function withSession(db, booking) {
  if (!booking || booking.status !== 'holding') return booking;
  const row = await db.prepare(`SELECT stripe_session_url FROM booking_payments WHERE booking_id = ? AND status = 'open'`).bind(booking.id).first();
  return { ...booking, sessionUrl: row?.stripe_session_url || null };
}
