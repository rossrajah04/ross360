// HTML for the customer's quotation page (/q/<token>) and its date list. Server-rendered, with no
// scripts. The quotation is drawn only from the sent snapshot: what was emailed to the customer.

import { site } from '../../src/content/site.js';
import { quoteEmail } from '../../src/content/quoteEmail.js';
import { customerQuote as C } from '../../src/content/customerQuote.js';
import { formatMoney } from '../../src/lib/admin/model.js';
import { longDate } from '../../src/lib/admin/quotes.js';
import { CUSTOMER_NOTE_MAX, periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';

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

/**
 * The quotation page. `state` is 'valid' or 'expired'; `pending` is the customer's pending date
 * request ({ slot_date, period }) or null; `datesUrl` is the Choose a date page.
 */
export function renderQuotePage({ snapshot, state, pending, datesUrl }) {
  let action = '';
  if (state === 'expired') {
    action = `<div class="notice" role="status"><p>${escapeHtml(C.expired(longDate(snapshot.validUntil)))}</p></div>`;
  } else if (pending) {
    action =
      '<div class="notice" role="status">' +
      `<p>${escapeHtml(C.received)}</p>` +
      `<p><span class="label">${escapeHtml(C.yourDate)}</span>${escapeHtml(slotText(pending.slot_date, pending.period))}</p>` +
      `<p class="small"><a href="${escapeHtml(datesUrl)}">${escapeHtml(C.changeDate)}</a></p>` +
      '</div>';
  } else {
    action = `<p><a class="button" href="${escapeHtml(datesUrl)}">${escapeHtml(C.chooseDate)}</a></p>`;
  }
  return shell(`${quoteEmail.title} ${snapshot.reference}`, quotation(snapshot) + action);
}

/**
 * The Choose a date page: open slots as a list of choices, an optional note and the submit button.
 * `error` is shown above the form; `values` keeps what the customer entered after a refusal.
 */
export function renderDatesPage({ snapshot, slots, nonce, quoteUrl, error = '', values = {} }) {
  const body =
    `<p class="muted small"><a href="${escapeHtml(quoteUrl)}">${escapeHtml(C.back)}</a></p>` +
    `<h1>${escapeHtml(C.datesHeading)}</h1>` +
    `<p class="meta">${escapeHtml(quoteEmail.title)} ${escapeHtml(snapshot.reference)}</p>` +
    `<p>${escapeHtml(C.datesIntro)}</p>` +
    (error ? `<div class="notice notice--error" role="alert"><p>${escapeHtml(error)}</p></div>` : '') +
    (slots.length
      ? '<form method="post">' +
        `<input type="hidden" name="nonce" value="${escapeHtml(nonce)}">` +
        `<fieldset><legend>${escapeHtml(C.chooseDate)}</legend><ul class="slots">` +
        slots
          .map(
            (slot) =>
              `<li class="slot"><label><input type="radio" name="slot" value="${slot.id}" required${
                String(values.slot) === String(slot.id) ? ' checked' : ''
              }><span>${escapeHtml(slotText(slot.slot_date, slot.period))}</span></label></li>`,
          )
          .join('') +
        '</ul></fieldset>' +
        `<label for="note">${escapeHtml(C.noteLabel)}</label>` +
        `<textarea id="note" name="note" maxlength="${CUSTOMER_NOTE_MAX}">${escapeHtml(values.note || '')}</textarea>` +
        `<p><button class="button" type="submit">${escapeHtml(C.submit)}</button></p>` +
        '</form>'
      : `<div class="notice" role="status"><p>${escapeHtml(C.noDates)}</p></div>`);
  return shell(C.datesHeading, body);
}
