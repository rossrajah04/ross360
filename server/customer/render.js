// HTML for the customer's quotation page (/q/<token>) and its booking pages. Server-rendered, with no
// scripts. The quotation is drawn only from the sent snapshot: what was emailed to the customer.

import { site } from '../../src/content/site.js';
import { quoteEmail } from '../../src/content/quoteEmail.js';
import { customerQuote as C } from '../../src/content/customerQuote.js';
import { booking as B } from '../../src/content/booking.js';
import { formatMoney } from '../../src/lib/admin/model.js';
import { longDate } from '../../src/lib/admin/quotes.js';
import { periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import { onlineBooking } from '../../src/lib/admin/booking.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const multiline = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>');

// Colours and type match the website, the Admin and the quote email.
const STYLE = `
@font-face{font-family:'Hanken Grotesk';src:url('/fonts/hanken-grotesk-latin-wght.woff2') format('woff2');font-weight:100 900;font-display:swap}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#fff;color:#141413;font-family:'Hanken Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;-webkit-text-size-adjust:100%}
.page{max-width:680px;margin:0 auto;padding:28px 16px 48px}
.brand{margin:0 0 32px;font-size:18px;font-weight:700;letter-spacing:.02em}
h1{margin:0 0 6px;font-size:24px;font-weight:600;line-height:1.25}
h2{margin:32px 0 12px;font-size:18px;font-weight:600}
p{margin:0 0 14px}
.muted{color:#64625d}
.small{font-size:14px}
.meta{margin:0 0 24px;color:#64625d;font-size:14px}
.block{margin:0 0 20px}
.label{display:block;color:#64625d;font-size:13px}
table{width:100%;border-collapse:collapse;margin:8px 0 20px}
th{padding:8px 0;border-bottom:1px solid #141413;color:#64625d;font-size:12px;font-weight:600;text-align:left}
td{padding:10px 0;border-bottom:1px solid #dddbd6;vertical-align:top;font-size:15px}
.num{text-align:right;padding-left:16px;white-space:nowrap}
.sum td{border-bottom:0;padding:5px 0;color:#64625d;font-size:14px}
.sum td.num{color:#141413}
.total td{border-top:1px solid #141413;border-bottom:0;font-size:17px;font-weight:600;color:#141413}
.notice{margin:24px 0;padding:14px 16px;border:1px solid #dddbd6;border-radius:6px;background:#f4f3f0}
.notice--error{border-color:#b42318;background:#fdf3f2;color:#7a1a12}
.button{display:inline-block;margin:4px 0 0;padding:12px 20px;border:1px solid #141413;border-radius:6px;background:#141413;color:#fff;font:inherit;font-weight:600;text-decoration:none;cursor:pointer}
.button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #1d4ed8;outline-offset:2px}
a{color:#141413}
fieldset{margin:0 0 20px;padding:0;border:0}
legend{padding:0;margin:0 0 8px;font-weight:600}
.slots{list-style:none;margin:0;padding:0}
.slot{border-bottom:1px solid #dddbd6}
.slot label{display:flex;gap:12px;align-items:center;padding:12px 0;cursor:pointer}
.slot input{width:20px;height:20px;margin:0;flex:none;accent-color:#141413}
.slot .sub{display:block;color:#64625d;font-size:14px}
.check{display:flex;gap:12px;align-items:flex-start;margin:0 0 20px}
.check input{width:20px;height:20px;margin:2px 0 0;flex:none;accent-color:#141413}
.facts{margin:0 0 20px}
.facts div{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #dddbd6;font-size:15px}
.facts dt{color:#64625d}
.facts dd{margin:0;text-align:right}
.linkbutton{padding:0;border:0;background:none;color:#141413;font:inherit;text-decoration:underline;cursor:pointer}
ul.terms{margin:0 0 20px;padding-left:20px}
ul.terms li{margin:0 0 6px}
textarea{display:block;width:100%;min-height:96px;margin:6px 0 4px;padding:10px 12px;border:1px solid #c9c6bf;border-radius:6px;font:inherit;color:inherit;resize:vertical}
.foot{margin-top:40px;padding-top:16px;border-top:1px solid #dddbd6;color:#64625d;font-size:13px;line-height:1.7}
.foot a{color:#64625d}
`;

function shell(title, body) {
  return (
    '<!doctype html><html lang="en-GB"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    `<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>` +
    `<body><main class="page"><p class="brand">${escapeHtml(site.brand)}</p>${body}${footer()}</main></body></html>`
  );
}

function footer() {
  return (
    '<p class="foot">' +
    `${escapeHtml(site.brand)}<br>` +
    `<a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a><br>` +
    `<a href="${escapeHtml(site.url)}${quoteEmail.termsPath}" rel="noreferrer">${escapeHtml(quoteEmail.labels.terms)}</a>` +
    '</p>'
  );
}

const slotText = (date, period) => `${weekdayDate(date)}, ${periodLabel(period)}`;

/** A page with one message: an invalid or revoked link, a replaced quote, and so on. */
export function renderNotice(message) {
  return shell(site.brand, `<div class="notice" role="status"><p>${escapeHtml(message)}</p></div>`);
}

/** The quotation itself, from the sent snapshot. */
function quotation(s) {
  const L = quoteEmail.labels;
  const preparedFor = [s.customer?.name, s.customer?.business, s.customer?.location].filter(Boolean);
  const rows = (s.items || [])
    .map(
      (item) =>
        '<tr>' +
        `<td>${multiline(item.description)}<br><span class="muted small">${escapeHtml(item.quantity)} × ${escapeHtml(formatMoney(item.unitPence))}</span></td>` +
        `<td class="num">${escapeHtml(formatMoney(item.amountPence))}</td>` +
        '</tr>',
    )
    .join('');
  const sums = [
    [L.subtotal, formatMoney(s.subtotalPence)],
    ...(s.travelPence ? [[L.travel, formatMoney(s.travelPence)]] : []),
    ...(s.discountPence ? [[`${L.discount} (${s.discountLabel})`, `−${formatMoney(s.discountPence)}`]] : []),
  ]
    .map(([label, value]) => `<tr class="sum"><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td></tr>`)
    .join('');
  return (
    `<h1>${escapeHtml(quoteEmail.title)} ${escapeHtml(s.reference)}</h1>` +
    `<p class="meta">${escapeHtml(L.date)}: ${escapeHtml(longDate(s.issuedOn))}<br>${escapeHtml(L.enquiry)}: ${escapeHtml(s.enquiryReference)}</p>` +
    (preparedFor.length
      ? `<p class="block"><span class="label">${escapeHtml(L.preparedFor)}</span>${preparedFor.map(multiline).join('<br>')}</p>`
      : '') +
    (s.serviceDescription ? `<p class="block"><span class="label">${escapeHtml(L.project)}</span>${multiline(s.serviceDescription)}</p>` : '') +
    '<table>' +
    `<thead><tr><th>${escapeHtml(L.description)}</th><th class="num">${escapeHtml(L.amount)}</th></tr></thead>` +
    `<tbody>${rows}${sums}` +
    `<tr class="total"><td>${escapeHtml(L.total)}</td><td class="num">${escapeHtml(formatMoney(s.totalPence))}</td></tr>` +
    '</tbody></table>' +
    `<p>${escapeHtml(s.vat)}<br>${escapeHtml(L.validUntil(longDate(s.validUntil), s.validDays))}</p>`
  );
}

const money = formatMoney;
const ukTime = (isoString) =>
  new Date(isoString).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });

const facts = (rows) =>
  `<dl class="facts">${rows.map(([dt, dd]) => `<div><dt>${escapeHtml(dt)}</dt><dd>${escapeHtml(dd)}</dd></div>`).join('')}</dl>`;

const errorBox = (error) => (error ? `<div class="notice notice--error" role="alert"><p>${escapeHtml(error)}</p></div>` : '');
const noticeBox = (...lines) =>
  `<div class="notice" role="status">${lines.filter(Boolean).map((l) => `<p>${l}</p>`).join('')}</div>`;
const postButton = (action, nonce, label, cls = 'button') =>
  `<form method="post" action="${escapeHtml(action)}"><input type="hidden" name="nonce" value="${escapeHtml(nonce)}">` +
  `<button class="${cls}" type="submit">${escapeHtml(label)}</button></form>`;

function bookingFacts(b) {
  const balance = Math.max(0, b.totalPence - b.paidPence);
  const rows = [
    [B.labels.slot, slotText(b.slotDate, b.period)],
    [B.labels.total, money(b.totalPence)],
    [B.labels.paid, money(b.paidPence)],
  ];
  if (b.plan === 'deposit' && balance > 0) rows.push([B.labels.balance, money(balance)], [B.labels.balanceDue, `End of ${longDate(b.balanceDueOn)}`]);
  return facts(rows);
}

/**
 * The quotation page, with the booking box.
 * state: 'valid' | 'expired'. booking: the quote's active booking or null. latest: its most recent
 * booking of any status (to show a cancellation). urls: { book, pay, release, balance, cancel, self }.
 * notice: 'released' | 'confirming' | null. paymentsOn: whether online booking is available.
 * nonce: the signed form nonce (for the release button).
 */
export function renderQuotePage({ snapshot, state, booking, latest, urls, notice = null, paymentsOn = true, nonce = '', now = new Date() }) {
  const parts = [];
  if (notice === 'released') parts.push(noticeBox(escapeHtml(B.checkoutCancelled)));
  if (notice === 'confirming' && (!booking || booking.status === 'holding')) {
    parts.push(noticeBox(escapeHtml(B.confirming), `<a href="${escapeHtml(urls.self)}">${escapeHtml(B.refresh)}</a>`));
  }

  if (booking && booking.status === 'holding' && Date.parse(booking.holdExpiresAt) > now.getTime()) {
    parts.push(
      `<h2>${escapeHtml(B.bookingHeading)}</h2>` +
        noticeBox(escapeHtml(B.holding(ukTime(booking.holdExpiresAt)))) +
        facts([[B.labels.slot, slotText(booking.slotDate, booking.period)]]) +
        (booking.sessionUrl ? `<p><a class="button" href="${escapeHtml(booking.sessionUrl)}">${escapeHtml(B.continuePayment)}</a></p>` : '') +
        postButton(urls.release, nonce, B.chooseDifferent, 'linkbutton'),
    );
  } else if (booking && booking.status === 'confirmed') {
    const balance = Math.max(0, booking.totalPence - booking.paidPence);
    parts.push(
      `<h2>${escapeHtml(B.bookingHeading)}</h2>` +
        `<p>${escapeHtml(B.confirmed)}${balance === 0 ? ` ${escapeHtml(B.paidInFull)}` : ''}</p>` +
        bookingFacts(booking) +
        (balance > 0 ? `<p><a class="button" href="${escapeHtml(urls.balance)}">${escapeHtml(B.payBalance)}</a></p>` : '') +
        `<p class="small"><a href="${escapeHtml(urls.cancel)}">${escapeHtml(B.cancelBooking)}</a></p>`,
    );
  } else if (booking && booking.status === 'cancel_requested') {
    parts.push(`<h2>${escapeHtml(B.bookingHeading)}</h2>` + noticeBox(escapeHtml(B.cancelRequested)) + bookingFacts(booking));
  } else {
    if (latest && latest.status === 'cancelled') {
      const refunded = latest.refundedPence;
      const owed = latest.paidPence - latest.retainedPence;
      const lines = [escapeHtml(latest.cancelReason === 'slot_unavailable' ? B.lateRefund : B.cancelled(longDate(latest.cancelledAt.slice(0, 10))))];
      if (latest.cancelReason !== 'slot_unavailable' && owed > 0) {
        lines.push(escapeHtml(refunded >= owed ? B.refundIssued(money(refunded)) : B.refundPending(money(owed))));
      }
      parts.push(`<h2>${escapeHtml(B.bookingHeading)}</h2>` + noticeBox(...lines));
    }
    if (state === 'expired') {
      parts.push(noticeBox(escapeHtml(C.expired(longDate(snapshot.validUntil)))));
    } else if (!onlineBooking(snapshot)) {
      parts.push(`<p>${escapeHtml(B.byEmail)}</p>`);
    } else if (!paymentsOn) {
      parts.push(noticeBox(escapeHtml(B.paymentsOff)));
    } else {
      parts.push(`<p><a class="button" href="${escapeHtml(urls.book)}">${escapeHtml(latest?.status === 'cancelled' ? B.bookAgain : B.bookSlot)}</a></p>`);
    }
  }
  return shell(`${quoteEmail.title} ${snapshot.reference}`, quotation(snapshot) + parts.join(''));
}

/** Choose a slot: open slots as choices; the form goes (GET) to the payment summary. */
export function renderSlotsPage({ snapshot, slots, urls, error = '' }) {
  const body =
    `<p class="muted small"><a href="${escapeHtml(urls.self)}">${escapeHtml(B.back)}</a></p>` +
    `<h1>${escapeHtml(B.slotsHeading)}</h1>` +
    `<p class="meta">${escapeHtml(quoteEmail.title)} ${escapeHtml(snapshot.reference)}</p>` +
    `<p>${escapeHtml(B.slotsIntro)}</p>` +
    errorBox(error) +
    (slots.length
      ? `<form method="get" action="${escapeHtml(urls.pay)}">` +
        `<fieldset><legend>${escapeHtml(B.slotsHeading)}</legend><ul class="slots">` +
        slots
          .map(
            (slot) =>
              `<li class="slot"><label><input type="radio" name="slot" value="${slot.id}" required><span>${escapeHtml(
                slotText(slot.slot_date, slot.period),
              )}</span></label></li>`,
          )
          .join('') +
        '</ul></fieldset>' +
        `<p><button class="button" type="submit">${escapeHtml(B.continue)}</button></p>` +
        '</form>'
      : noticeBox(escapeHtml(B.noSlots)));
  return shell(B.slotsHeading, body);
}

/**
 * The payment summary for one slot: the total, the choice of payment in full or the deposit (when
 * allowed), what is due now and later, the cancellation terms, and the button to Stripe.
 * options: paymentOptions() from src/lib/admin/booking.js.
 */
export function renderPayPage({ snapshot, slot, options, nonce, urls, termsUrl, error = '', values = {} }) {
  const deposit = options.deposit;
  const chosen = values.plan || (deposit ? '' : 'full');
  const planChoice = deposit
    ? `<fieldset><legend>${escapeHtml(B.payHeading)}</legend><ul class="slots">` +
      `<li class="slot"><label><input type="radio" name="plan" value="full" required${chosen === 'full' ? ' checked' : ''}><span>${escapeHtml(
        B.payFull,
      )}<span class="sub">${escapeHtml(B.fullOption(money(options.totalPence)))}</span></span></label></li>` +
      `<li class="slot"><label><input type="radio" name="plan" value="deposit" required${chosen === 'deposit' ? ' checked' : ''}><span>${escapeHtml(
        B.payDeposit,
      )}<span class="sub">${escapeHtml(B.depositOption(money(deposit.depositPence), money(deposit.balancePence), longDate(deposit.balanceDueOn)))}</span></span></label></li>` +
      '</ul></fieldset>'
    : `<input type="hidden" name="plan" value="full">` +
      facts([[B.labels.dueNow, money(options.totalPence)]]) +
      `<p class="small muted">${escapeHtml(B.fullOnly[options.noDeposit] || '')}</p>`;
  const body =
    `<p class="muted small"><a href="${escapeHtml(urls.book)}">${escapeHtml(B.chooseDifferent)}</a></p>` +
    `<h1>${escapeHtml(B.payHeading)}</h1>` +
    `<p class="meta">${escapeHtml(quoteEmail.title)} ${escapeHtml(snapshot.reference)}</p>` +
    errorBox(error) +
    facts([
      [B.labels.slot, slotText(slot.slot_date, slot.period)],
      [B.labels.total, money(options.totalPence)],
    ]) +
    `<form method="post" action="${escapeHtml(urls.pay)}">` +
    `<input type="hidden" name="nonce" value="${escapeHtml(nonce)}">` +
    `<input type="hidden" name="slot" value="${slot.id}">` +
    planChoice +
    `<h2>${escapeHtml(B.cancellationHeading)}</h2>` +
    `<ul class="terms">${B.cancellationTerms.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}${
      deposit ? `<li>${escapeHtml(B.depositTerm(longDate(deposit.balanceDueOn)))}</li>` : ''
    }</ul>` +
    `<label class="check"><input type="checkbox" name="agree" value="yes" required${values.agree ? ' checked' : ''}><span>${escapeHtml(B.agree)} <a href="${escapeHtml(
      termsUrl,
    )}" rel="noreferrer" target="_blank">${escapeHtml(B.agreeLink)}</a>.</span></label>` +
    `<p class="small muted">${escapeHtml(B.holdNote)} ${escapeHtml(B.stripeNote)}</p>` +
    `<p><button class="button" type="submit">${escapeHtml(B.toPayment)}</button></p>` +
    '</form>';
  return shell(B.payHeading, body);
}

/** Pay the balance of a deposit booking. */
export function renderBalancePage({ snapshot, booking, nonce, urls, error = '', state = 'due' }) {
  const balance = Math.max(0, booking.totalPence - booking.paidPence);
  let action;
  if (state === 'too_late') action = noticeBox(escapeHtml(B.balanceTooLate));
  else if (balance === 0) action = noticeBox(escapeHtml(B.balanceNothingDue));
  else {
    action =
      `<p>${escapeHtml(B.balanceIntro(money(balance), longDate(booking.balanceDueOn)))}</p>` +
      `<p class="small muted">${escapeHtml(B.stripeNote)}</p>` +
      postButton(urls.balance, nonce, B.toPayment);
  }
  const body =
    `<p class="muted small"><a href="${escapeHtml(urls.self)}">${escapeHtml(B.back)}</a></p>` +
    `<h1>${escapeHtml(B.balanceHeading)}</h1>` +
    `<p class="meta">${escapeHtml(quoteEmail.title)} ${escapeHtml(snapshot.reference)}</p>` +
    errorBox(error) +
    bookingFacts(booking) +
    action;
  return shell(B.balanceHeading, body);
}

/** Cancel a booking: what will happen, then the confirmation button. window: free | late | started. */
export function renderCancelPage({ snapshot, booking, window, maxRetentionPence, nonce, urls, error = '' }) {
  let action;
  if (window === 'started') action = noticeBox(escapeHtml(B.cancelStarted));
  else if (window === 'free') {
    action =
      `<p>${escapeHtml(booking.paidPence > 0 ? B.cancelFree(money(booking.paidPence)) : B.cancelFreeNothingPaid)}</p>` +
      postButton(urls.cancel, nonce, B.confirmCancel);
  } else {
    action = `<p>${escapeHtml(B.cancelLate(money(maxRetentionPence)))}</p>` + postButton(urls.cancel, nonce, B.confirmCancelRequest);
  }
  const body =
    `<p class="muted small"><a href="${escapeHtml(urls.self)}">${escapeHtml(B.keepBooking)}</a></p>` +
    `<h1>${escapeHtml(B.cancelHeading)}</h1>` +
    `<p class="meta">${escapeHtml(quoteEmail.title)} ${escapeHtml(snapshot.reference)}</p>` +
    errorBox(error) +
    bookingFacts(booking) +
    action;
  return shell(B.cancelHeading, body);
}
