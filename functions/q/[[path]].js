// Cloudflare Pages Function: the customer's quotation page (Phase C).
//
//   GET  /q/<token>        the quotation as sent, with Choose a date while it is valid
//   GET  /q/<token>/date   the open dates
//   POST /q/<token>/date   send a date request (form post; same origin and a signed form nonce)
//
// Every invalid, unknown, revoked or expired-past-window link gets the same answer. Pages are never
// cached or indexed, run no scripts, and cannot be framed. Nothing here books a date.

import { SchemaNotReady } from '../../server/admin/schema.js';
import { checkFormNonce, formNonce } from '../../server/admin/quoteLinks.js';
import { openSlots, pendingRequest, recordView, resolveQuoteLink, submitDateRequest } from '../../server/customer/quotePage.js';
import { renderDatesPage, renderNotice, renderQuotePage } from '../../server/customer/render.js';
import { customerQuote as C } from '../../src/content/customerQuote.js';
import { CUSTOMER_NOTE_MAX } from '../../src/lib/admin/availability.js';

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  // Same-origin, so the browser sends this site's Origin with the date form (no-referrer would send
  // "null"); the token never leaves the site in a Referer.
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

const MAX_FORM_CHARS = 4000;

const html = (body, status = 200) => new Response(body, { status, headers: HEADERS });
const notice = (message, status) => html(renderNotice(message), status);
const gone = () => notice(C.gone, 404);

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
    console.error(`Customer quote page failed: ${error?.name || 'Error'}`);
    return notice(C.error, 500);
  }
}

async function handle({ request, env, params }) {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, POST' } });
  }
  const parts = [].concat(params.path || []);
  const [token, page] = parts;
  if (!token || parts.length > 2 || (page !== undefined && page !== 'date')) return gone();
  if (method === 'POST' && page !== 'date') return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET' } });

  const ctx = await resolveQuoteLink(env, token);
  if (ctx.state === 'gone') return gone();
  if (ctx.state === 'unavailable') return notice(C.unavailable, 200);
  if (ctx.state === 'replaced') return notice(C.replaced, 200);

  const origin = new URL(request.url).origin;
  const quoteUrl = `/q/${token}`;
  const datesUrl = `/q/${token}/date`;

  if (!page) {
    await recordView(env.DB, ctx);
    const pending = ctx.state === 'valid' ? await pendingRequest(env.DB, ctx.quoteId) : null;
    return html(renderQuotePage({ snapshot: ctx.snapshot, state: ctx.state, pending, datesUrl }));
  }

  // The date list and the date request: only while the quote is valid.
  if (ctx.state !== 'valid') return Response.redirect(`${origin}${quoteUrl}`, 303);

  const datesPage = async (status, error = '', values = {}) =>
    html(
      renderDatesPage({
        snapshot: ctx.snapshot,
        slots: await openSlots(env.DB),
        nonce: await formNonce(env, ctx.linkId),
        quoteUrl,
        error,
        values,
      }),
      status,
    );

  if (method === 'GET') return datesPage(200);

  // POST: a date request.
  if (!sameOrigin(request)) return notice(C.error, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/x-www-form-urlencoded')) return notice(C.error, 415);
  const raw = await request.text();
  if (raw.length > MAX_FORM_CHARS) return datesPage(413, C.noteTooLong(CUSTOMER_NOTE_MAX));
  const form = new URLSearchParams(raw);
  const values = { slot: form.get('slot') || '', note: form.get('note') || '' };
  if (!(await checkFormNonce(env, ctx.linkId, form.get('nonce')))) return datesPage(400, C.formExpired, values);
  if (!/^\d{1,10}$/.test(values.slot)) return datesPage(422, C.chooseOne, values);

  const outcome = await submitDateRequest(env, ctx, { slotId: Number(values.slot), note: values.note });
  if (outcome.result === 'ok') return Response.redirect(`${origin}${quoteUrl}`, 303);
  if (outcome.result === 'slot_unavailable') return datesPage(409, C.slotGone, { note: values.note });
  if (outcome.result === 'note_too_long') return datesPage(422, C.noteTooLong(CUSTOMER_NOTE_MAX), values);
  if (outcome.result === 'not_allowed') return notice(C.notAllowed, 409);
  return datesPage(422, C.chooseOne, values);
}
