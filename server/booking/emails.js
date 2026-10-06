// The booking emails (Phase C): to the customer, and to ROSS 360 (newquote@, or QUOTE_TO_EMAIL).
// Wording is in src/content/booking.js. Inline styles only, no images or remote content, matching
// the quotation email.

import { site } from '../../src/content/site.js';
import { quoteEmail } from '../../src/content/quoteEmail.js';
import { booking as B, bookingEmails as E } from '../../src/content/booking.js';
import { formatMoney } from '../../src/lib/admin/model.js';
import { longDate } from '../../src/lib/admin/quotes.js';
import { periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import { CANCEL_REASONS, PAYMENT_KINDS } from '../../src/lib/admin/booking.js';
import { QUOTE_FROM } from '../admin/quoteRender.js';
import { internalTo } from './mail.js';

const INK = '#141413';
const MUTED = '#64625d';
const LINE = '#dddbd6';
const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const oneLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

export const slotText = (date, period) => `${weekdayDate(date)}, ${periodLabel(period)}`;
const money = formatMoney;

/**
 * A customer email: paragraphs, an optional table of rows ([label, value]), an optional button
 * ({ label, url }), more paragraphs, then the closing line and footer.
 */
function customerMessage({ to, subject, intro = [], rows = [], button = null, after = [] }) {
  const termsUrl = `${site.url}${quoteEmail.termsPath}`;
  const text = [
    site.brand,
    '',
    ...intro.flatMap((line) => [line, '']),
    ...(rows.length ? [...rows.map(([label, value]) => `${label}: ${value}`), ''] : []),
    ...(button ? [`${button.label}: ${button.url}`, ''] : []),
    ...after.flatMap((line) => [line, '']),
    E.closing,
    '',
    site.brand,
    site.email,
    site.domain,
    `${quoteEmail.labels.terms}: ${termsUrl}`,
  ].join('\n');

  const p = (content, extra = '') =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};${extra}">${content}</p>`;
  const html =
    '<!doctype html><html lang="en-GB"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:#ffffff">` +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td style="padding:24px 16px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto"><tr><td>' +
    `<p style="margin:0 0 28px;font-family:${FONT};font-size:18px;font-weight:700;letter-spacing:0.02em;color:${INK}">${escapeHtml(site.brand)}</p>` +
    intro.map((line) => p(escapeHtml(line))).join('') +
    (rows.length
      ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4px 0 20px">' +
        rows
          .map(
            ([label, value]) =>
              '<tr>' +
              `<td style="padding:8px 12px 8px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;color:${MUTED};white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>` +
              `<td style="padding:8px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;color:${INK};vertical-align:top">${escapeHtml(value)}</td>` +
              '</tr>',
          )
          .join('') +
        '</table>'
      : '') +
    (button
      ? `<p style="margin:8px 0 24px"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 20px;border-radius:6px;background:${INK};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(button.label)}</a></p>`
      : '') +
    after.map((line) => p(escapeHtml(line))).join('') +
    p(escapeHtml(E.closing)) +
    `<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid ${LINE};font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED}">` +
    `${escapeHtml(site.brand)}<br><a href="mailto:${escapeHtml(site.email)}" style="color:${MUTED}">${escapeHtml(site.email)}</a><br>` +
    `<a href="${escapeHtml(site.url)}" style="color:${MUTED}">${escapeHtml(site.domain)}</a><br>` +
    `<a href="${escapeHtml(termsUrl)}" style="color:${MUTED}">${escapeHtml(quoteEmail.labels.terms)}</a></p>` +
    '</td></tr></table></td></tr></table></body></html>';
  return { from: QUOTE_FROM, to: [to], reply_to: site.email, subject: oneLine(subject), text, html };
}

/** An internal email to ROSS 360: a table of facts and a link to the Admin. */
function internalMessage(env, { subject, rows, note = '', adminUrl, replyTo }) {
  const text = [...rows.map(([label, value]) => `${label}: ${value}`), '', ...(note ? [note, ''] : []), `Admin: ${adminUrl}`].join('\n');
  const html =
    '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">' +
    rows
      .map(
        ([label, value]) =>
          `<tr style="border-bottom:1px solid #e4e2dc"><td style="vertical-align:top;color:#555;white-space:nowrap"><strong>${escapeHtml(label)}</strong></td><td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
      )
      .join('') +
    '</table>' +
    (note ? `<p style="font-family:Arial,sans-serif;font-size:14px">${escapeHtml(note)}</p>` : '') +
    `<p style="font-family:Arial,sans-serif;font-size:14px"><a href="${escapeHtml(adminUrl)}">Open in the Admin</a></p>`;
  return {
    to: [internalTo(env)],
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: oneLine(subject),
    text,
    html,
  };
}

// --- What each email says -----------------------------------------------------------------------

/** b: the booking view from bookings.js (bookingView). */
const balanceOf = (b) => Math.max(0, b.totalPence - b.paidPence);

function bookingRows(b, { paidLabel = B.labels.paid } = {}) {
  const rows = [
    [B.labels.slot, slotText(b.slotDate, b.period)],
    [B.labels.quotation, b.quoteReference],
    [B.labels.total, money(b.totalPence)],
    [paidLabel, money(b.paidPence)],
  ];
  if (b.plan === 'deposit' && balanceOf(b) > 0) {
    rows.push([B.labels.balance, money(balanceOf(b))], [B.labels.balanceDue, `End of ${longDate(b.balanceDueOn)}`]);
  }
  return rows;
}

const viewButton = (pageUrl) => (pageUrl ? { label: E.viewBooking, url: pageUrl } : null);

export function confirmedEmail(b, pageUrl) {
  const slot = slotText(b.slotDate, b.period);
  const balance = balanceOf(b);
  return customerMessage({
    to: b.customerEmail,
    subject: E.confirmed.subject(slot),
    intro: [E.confirmed.lead],
    rows: bookingRows(b),
    button: viewButton(pageUrl),
    after: [
      balance > 0 ? E.confirmed.balance(money(balance), longDate(b.balanceDueOn)) : E.confirmed.paidInFull,
      ...B.cancellationTerms,
    ],
  });
}

export function reminderEmail(b, balanceUrl) {
  const slot = slotText(b.slotDate, b.period);
  return customerMessage({
    to: b.customerEmail,
    subject: E.reminder.subject(longDate(b.balanceDueOn)),
    intro: [E.reminder.lead(slot, longDate(b.balanceDueOn))],
    rows: bookingRows(b),
    button: balanceUrl ? { label: E.payBalance, url: balanceUrl } : null,
    after: [E.reminder.consequence(money(b.depositPence))],
  });
}

export function balancePaidEmail(b, amountPence, pageUrl) {
  return customerMessage({
    to: b.customerEmail,
    subject: E.balancePaid.subject,
    intro: [E.balancePaid.lead(money(amountPence), slotText(b.slotDate, b.period))],
    rows: bookingRows(b),
    button: viewButton(pageUrl),
  });
}

/** The refund sentence for a cancellation. */
export function refundLine(b, refunds) {
  if (b.paidPence === 0) return E.refund.none;
  const refundTotal = refunds.reduce((sum, r) => sum + r.amountPence, 0);
  if (refunds.some((r) => r.status !== 'succeeded')) return E.refund.pending(money(refundTotal));
  if (b.retainedPence > 0) return E.refund.partial(money(b.paidPence), money(b.retainedPence), money(refundTotal));
  return E.refund.full(money(refundTotal));
}

export function cancelledEmail(b, refunds, { pageUrl } = {}) {
  const slot = slotText(b.slotDate, b.period);
  if (b.cancelReason === 'unpaid_balance') {
    return customerMessage({
      to: b.customerEmail,
      subject: E.overdue.subject,
      intro: [E.overdue.lead(slot, longDate(b.balanceDueOn)), refundLine(b, refunds)],
      after: [E.overdue.again],
    });
  }
  if (b.cancelReason === 'ross360') {
    return customerMessage({
      to: b.customerEmail,
      subject: E.cancelledByUs.subject,
      intro: [E.cancelledByUs.lead(slot), refundLine(b, refunds)],
      after: [E.cancelledByUs.again],
    });
  }
  if (b.cancelReason === 'slot_unavailable') {
    return customerMessage({
      to: b.customerEmail,
      subject: E.lateRefund.subject,
      intro: [E.lateRefund.lead(slot)],
      button: pageUrl ? { label: E.chooseSlot, url: pageUrl } : null,
    });
  }
  return customerMessage({
    to: b.customerEmail,
    subject: E.cancelled.subject,
    intro: [E.cancelled.lead(slot), refundLine(b, refunds)],
  });
}

export function cancelRequestEmail(b) {
  return customerMessage({
    to: b.customerEmail,
    subject: E.cancelRequest.subject,
    intro: [E.cancelRequest.lead(slotText(b.slotDate, b.period))],
  });
}

export function movedEmail(b, pageUrl) {
  const slot = slotText(b.slotDate, b.period);
  const balance = balanceOf(b);
  return customerMessage({
    to: b.customerEmail,
    subject: E.moved.subject(slot),
    intro: [E.moved.lead(slot)],
    rows: bookingRows(b),
    button: viewButton(pageUrl),
    after: balance > 0 ? [E.confirmed.balance(money(balance), longDate(b.balanceDueOn))] : [],
  });
}

/** A payment made after its booking had ended (the slot taken, or the booking cancelled): refunded. */
export function lateRefundEmail(b, pageUrl) {
  return customerMessage({
    to: b.customerEmail,
    subject: E.lateRefund.subject,
    intro: [E.lateRefund.lead(slotText(b.slotDate, b.period))],
    button: pageUrl ? { label: E.chooseSlot, url: pageUrl } : null,
  });
}

// --- Internal ---------------------------------------------------------------------------------

const INTERNAL_SUBJECTS = {
  confirmed: (b) => `Booking confirmed: ${b.quoteReference}, ${slotText(b.slotDate, b.period)}`,
  balance_paid: (b) => `Balance paid: ${b.quoteReference}, ${slotText(b.slotDate, b.period)}`,
  cancel_requested: (b) => `Cancellation request, decision needed: ${b.quoteReference}, ${slotText(b.slotDate, b.period)}`,
  cancelled: (b) => `Booking cancelled: ${b.quoteReference}, ${slotText(b.slotDate, b.period)}`,
  refund_failed: (b) => `Refund failed: ${b.quoteReference}`,
  late_payment: (b) => `Late payment refunded: ${b.quoteReference}`,
};

const INTERNAL_NOTES = {
  cancel_requested:
    'The customer asked to cancel within 48 hours of the slot. Decide in the Admin how much to keep (up to 50% of the booking price); the rest is refunded. Nothing is kept automatically.',
  refund_failed: 'Stripe did not complete a refund. Retry it from the booking in the Admin, or settle it in Stripe.',
  late_payment: 'A payment completed after its booking had ended (slot taken or booking cancelled). It has been refunded in full.',
};

export function internalEmail(env, kind, b, { adminUrl, refunds = [] } = {}) {
  const rows = [
    ['Quote', b.quoteReference],
    ['Enquiry', b.enquiryReference],
    ['Customer', [b.customerName, b.customerBusiness].filter(Boolean).join(', ')],
    ['Slot', slotText(b.slotDate, b.period)],
    ['Payment', b.plan === 'deposit' ? 'Deposit' : 'Paid in full'],
    ['Total', money(b.totalPence)],
    ['Paid', money(b.paidPence)],
  ];
  if (b.plan === 'deposit' && b.paidPence < b.totalPence && b.status !== 'cancelled') {
    rows.push(['Balance', money(b.totalPence - b.paidPence)], ['Balance due by', `End of ${longDate(b.balanceDueOn)}`]);
  }
  if (b.status === 'cancelled') {
    rows.push(['Reason', CANCEL_REASONS[b.cancelReason] || b.cancelReason], ['Retained', money(b.retainedPence)]);
    for (const r of refunds) rows.push([`Refund (${PAYMENT_KINDS[r.paymentKind] || r.paymentKind})`, `${money(r.amountPence)}, ${r.status}`]);
  }
  return internalMessage(env, {
    subject: INTERNAL_SUBJECTS[kind](b),
    rows,
    note: INTERNAL_NOTES[kind] || '',
    adminUrl,
    replyTo: b.customerEmail,
  });
}
