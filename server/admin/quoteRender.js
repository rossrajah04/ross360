// The customer-facing quotation: one template for the Admin preview and the email that is sent, so
// what the administrator previews is exactly what the customer receives.
//
// Only fields listed here reach the customer. Internal notes are never read by this module, so they
// cannot appear in the preview, the email or the sent snapshot.

import { site } from '../../src/content/site.js';
import { quoteEmail } from '../../src/content/quoteEmail.js';
import { formatMoney } from '../../src/lib/admin/model.js';
import { addDays, longDate } from '../../src/lib/admin/quotes.js';

export const QUOTE_FROM = `${site.brand} <${site.email}>`;
export const QUOTE_BCC = 'newquote@ross360.co.uk';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const oneLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

// Colours and type match the website and the Admin.
const INK = '#141413';
const MUTED = '#64625d';
const LINE = '#dddbd6';
const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

/**
 * The customer-facing content of a quote, and nothing else. This is what is stored as the sent
 * snapshot. `quote` is the API form of the quote (server/admin/quotes.js).
 */
export function customerSnapshot(quote, { enquiryReference, issuedOn }) {
  const validUntil = addDays(issuedOn, quote.validDays);
  return {
    reference: quote.reference,
    enquiryReference,
    issuedOn,
    validDays: quote.validDays,
    validUntil,
    customer: {
      name: quote.customerName,
      business: quote.customerBusiness,
      email: quote.customerEmail,
      location: quote.customerLocation,
    },
    serviceDescription: quote.serviceDescription,
    package: quote.package,
    items: quote.items.map((item) => ({
      kind: item.kind,
      description: item.description,
      quantity: item.quantity,
      unitPence: item.unitPence,
      amountPence: item.amountPence,
    })),
    subtotalPence: quote.subtotalPence,
    travelPence: quote.travelPence,
    discountPence: quote.discountPence,
    discountLabel: quote.discountLabel,
    totalPence: quote.totalPence,
    vat: quoteEmail.vat,
  };
}

/**
 * Render a quote for the customer. Returns { subject, html, text, snapshot }.
 * `issuedOn` is the UK date (YYYY-MM-DD) the quote is, or would be, issued. `quoteUrl` is the
 * customer's link to the quote page (Phase C); a quote cannot be sent without one.
 */
export function renderQuote(quote, { enquiryReference, issuedOn, quoteUrl = null }) {
  const s = customerSnapshot(quote, { enquiryReference, issuedOn });
  const L = quoteEmail.labels;
  const termsUrl = `${site.url}${quoteEmail.termsPath}`;
  const subject = oneLine(quoteEmail.subject(s.reference));
  const validity = L.validUntil(longDate(s.validUntil), s.validDays);
  const preparedFor = [s.customer.name, s.customer.business, s.customer.location].filter(Boolean);

  const totals = [
    [L.subtotal, formatMoney(s.subtotalPence)],
    ...(s.travelPence ? [[L.travel, formatMoney(s.travelPence)]] : []),
    ...(s.discountPence ? [[`${L.discount} (${s.discountLabel})`, `−${formatMoney(s.discountPence)}`]] : []),
  ];

  // --- Plain text --------------------------------------------------------------------------------
  const text = [
    site.brand,
    '',
    `${quoteEmail.title} ${s.reference}`,
    `${L.date}: ${longDate(s.issuedOn)}`,
    `${L.enquiry}: ${s.enquiryReference}`,
    '',
    `${L.preparedFor}:`,
    ...preparedFor,
    '',
    quoteEmail.opening,
    ...(s.serviceDescription ? ['', `${L.project}:`, s.serviceDescription] : []),
    '',
    ...s.items.map(
      (item) =>
        `${item.description}\n  ${item.quantity} × ${formatMoney(item.unitPence)} = ${formatMoney(item.amountPence)}`,
    ),
    '',
    ...totals.map(([label, value]) => `${label}: ${value}`),
    `${L.total}: ${formatMoney(s.totalPence)}`,
    '',
    quoteEmail.vat,
    validity,
    '',
    ...(quoteUrl ? [quoteEmail.linkLine, quoteUrl, ''] : []),
    quoteEmail.nextSteps,
    '',
    quoteEmail.closing,
    '',
    site.brand,
    site.email,
    site.domain,
    `${L.terms}: ${termsUrl}`,
  ].join('\n');

  // --- HTML (inline styles only; no images or remote content) ------------------------------------
  const p = (content, extra = '') =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};${extra}">${content}</p>`;
  const cell = (content, extra = '') =>
    `<td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;line-height:1.5;color:${INK};vertical-align:top;${extra}">${content}</td>`;
  const head = (content, extra = '') =>
    `<th style="padding:8px 0;border-bottom:1px solid ${INK};font-family:${FONT};font-size:12px;font-weight:600;color:${MUTED};text-align:left;${extra}">${content}</th>`;
  const multiline = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>');

  const itemRows = s.items
    .map(
      (item) =>
        '<tr>' +
        cell(multiline(item.description)) +
        cell(String(item.quantity), 'text-align:right;padding-left:12px;white-space:nowrap') +
        cell(escapeHtml(formatMoney(item.unitPence)), 'text-align:right;padding-left:12px;white-space:nowrap') +
        cell(escapeHtml(formatMoney(item.amountPence)), 'text-align:right;padding-left:12px;white-space:nowrap') +
        '</tr>',
    )
    .join('');

  const totalRows =
    totals
      .map(
        ([label, value]) =>
          '<tr>' +
          `<td colspan="3" style="padding:6px 0;font-family:${FONT};font-size:14px;color:${MUTED};text-align:right">${escapeHtml(label)}</td>` +
          `<td style="padding:6px 0 6px 12px;font-family:${FONT};font-size:14px;color:${INK};text-align:right;white-space:nowrap">${escapeHtml(value)}</td>` +
          '</tr>',
      )
      .join('') +
    '<tr>' +
    `<td colspan="3" style="padding:10px 0;border-top:1px solid ${INK};font-family:${FONT};font-size:16px;font-weight:600;color:${INK};text-align:right">${escapeHtml(L.total)}</td>` +
    `<td style="padding:10px 0 10px 12px;border-top:1px solid ${INK};font-family:${FONT};font-size:16px;font-weight:600;color:${INK};text-align:right;white-space:nowrap">${escapeHtml(formatMoney(s.totalPence))}</td>` +
    '</tr>';

  const html =
    '<!doctype html><html lang="en-GB"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${escapeHtml(subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:#ffffff">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td style="padding:24px 16px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto"><tr><td>` +
    `<p style="margin:0 0 28px;font-family:${FONT};font-size:18px;font-weight:700;letter-spacing:0.02em;color:${INK}">${escapeHtml(site.brand)}</p>` +
    `<h1 style="margin:0 0 8px;font-family:${FONT};font-size:22px;font-weight:600;color:${INK}">${escapeHtml(quoteEmail.title)} ${escapeHtml(s.reference)}</h1>` +
    p(
      `${escapeHtml(L.date)}: ${escapeHtml(longDate(s.issuedOn))}<br>${escapeHtml(L.enquiry)}: ${escapeHtml(s.enquiryReference)}`,
      `color:${MUTED};font-size:14px`,
    ) +
    (preparedFor.length
      ? p(
          `<span style="color:${MUTED};font-size:13px">${escapeHtml(L.preparedFor)}</span><br>${preparedFor.map(multiline).join('<br>')}`,
          'margin-bottom:24px',
        )
      : '') +
    p(escapeHtml(quoteEmail.opening)) +
    (s.serviceDescription
      ? p(`<span style="color:${MUTED};font-size:13px">${escapeHtml(L.project)}</span><br>${multiline(s.serviceDescription)}`)
      : '') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 20px">` +
    `<tr>${head(escapeHtml(L.description))}${head(escapeHtml(L.quantity), 'text-align:right;padding-left:12px')}${head(escapeHtml(L.unit), 'text-align:right;padding-left:12px')}${head(escapeHtml(L.amount), 'text-align:right;padding-left:12px')}</tr>` +
    itemRows +
    totalRows +
    '</table>' +
    p(`${escapeHtml(quoteEmail.vat)}<br>${escapeHtml(validity)}`) +
    (quoteUrl ? p(`<a href="${escapeHtml(quoteUrl)}" style="color:${INK};font-weight:600">${escapeHtml(quoteEmail.linkLine)}</a>`) : '') +
    p(escapeHtml(quoteEmail.nextSteps)) +
    p(escapeHtml(quoteEmail.closing)) +
    `<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid ${LINE};font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED}">` +
    `${escapeHtml(site.brand)}<br>` +
    `<a href="mailto:${escapeHtml(site.email)}" style="color:${MUTED}">${escapeHtml(site.email)}</a><br>` +
    `<a href="${escapeHtml(site.url)}" style="color:${MUTED}">${escapeHtml(site.domain)}</a><br>` +
    `<a href="${escapeHtml(termsUrl)}" style="color:${MUTED}">${escapeHtml(L.terms)}</a>` +
    '</p>' +
    '</td></tr></table></td></tr></table></body></html>';

  return { subject, html, text, snapshot: s };
}
