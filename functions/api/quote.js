// Cloudflare Pages Function: POST /api/quote
// Website form -> validate -> Resend -> newquote@ross360.co.uk (+ optional customer acknowledgement
// from contact@ross360.co.uk).
//
// Secrets are read from environment variables (Cloudflare Pages -> Settings -> Variables and Secrets):
//   RESEND_API_KEY        (secret, required)
//   QUOTE_FROM_EMAIL      (required; sender of the internal enquiry email, on a domain verified in Resend)
//   QUOTE_TO_EMAIL        (optional; overrides the internal recipient, newquote@ross360.co.uk)
//   SEND_ACKNOWLEDGEMENT  (optional; "true" sends the customer an acknowledgement email)
//   TURNSTILE_SECRET_KEY  (optional; enables Cloudflare Turnstile verification. Set it, with the build
//                          variable VITE_TURNSTILE_SITE_KEY, before the DB binding is used in production)
//   DB                    (optional D1 binding; when present the enquiry is also saved for the Admin)
//
// No key is ever sent to the browser or committed to the repository.

import { validateQuote, PROJECT_TYPES } from '../../src/lib/quoteSchema.js';
import { site } from '../../src/content/site.js';
import { createEnquiry, recordEvent } from '../../server/admin/enquiries.js';

// Internal enquiries go to a dedicated mailbox. The public address (site.email, contact@) is what
// customers see: the acknowledgement is sent from it and replies to it, and the error message shows it.
const INTERNAL_TO = 'newquote@ross360.co.uk';
const ACK_FROM = `${site.brand} <${site.email}>`;
const ACK_TEXT =
  'Thanks for getting in touch with ROSS 360. We’ve received your enquiry and will review the details you’ve provided. We’ll be back in touch within 1 working day with your quotation. If we need any additional information before preparing your quote, we’ll let you know.';
const SEND_ERROR = `We couldn't send your enquiry just now. Please try again or email ${site.email} directly.`;
const MIN_FILL_MS = 3000; // a human cannot complete this form faster than this
const MAX_BODY_CHARS = 20000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // non-browser clients; other checks still apply
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function buildEnquiry(values, reference = '') {
  const projectLabel = PROJECT_TYPES.find((t) => t.value === values.projectType)?.label ?? values.projectType;
  const projectType = values.projectOther ? `${projectLabel}: ${values.projectOther}` : projectLabel;
  const rows = [
    ...(reference ? [['Reference', reference]] : []),
    ['Name', values.name],
    ['Business / organisation', values.business],
    ['Email', values.email],
    ['Phone', values.phone || '—'],
    ['Project type', projectType],
    ['Business / property type', values.spaceType],
    ['Address / postcode', values.location],
    ['Approximate size', values.size],
    ['Areas to be photographed', values.areas],
    ['Anything else', values.message || '—'],
    ['Preferred date', values.preferredDate || '—'],
    ['How they heard about ROSS 360', values.source || '—'],
  ];
  // Longer answers start on their own line so they read cleanly in a plain-text client.
  const text = rows
    .map(([label, value]) => (String(value).includes('\n') ? `${label}:\n${value}\n` : `${label}: ${value}`))
    .join('\n');
  const html =
    '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">' +
    rows
      .map(
        ([label, value]) =>
          '<tr style="border-bottom:1px solid #e4e2dc">' +
          `<td style="vertical-align:top;color:#555;white-space:nowrap"><strong>${escapeHtml(label)}</strong></td>` +
          `<td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
      )
      .join('') +
    '</table>';
  return { text, html };
}

// Text from Resend's error response, made safe for the logs: customer email addresses are masked
// (ROSS 360's own addresses are kept, because they show which sender or recipient was refused),
// anything shaped like an API key is removed, and the length is capped.
export function safeResendDetail(text) {
  let detail = String(text || '').trim();
  try {
    const parsed = JSON.parse(detail);
    detail = [parsed.name, parsed.message || parsed.error].filter(Boolean).join(': ') || detail;
  } catch {
    // Not JSON: use the raw text.
  }
  return detail
    .replace(/[^\s@<>"'`(),;:]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, (match, domain) =>
      domain.toLowerCase() === 'ross360.co.uk' ? match : '[email]',
    )
    .replace(/re_[A-Za-z0-9_]{8,}/g, '[key]')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

// The sending domain only, for the logs.
const fromDomain = (from) => (String(from || '').match(/@([A-Za-z0-9.-]+)/)?.[1] || 'not set').toLowerCase();

// `label` says which email this is ('internal' or 'acknowledgement') so a failure log is unambiguous.
// Returns { ok, status }: status is Resend's HTTP status, or 'not sent' if the request never got there.
async function sendEmail(env, payload, label) {
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // The request never reached Resend (network or runtime error).
    console.error(`Resend request (${label}) could not be sent: ${safeResendDetail(`${error?.name}: ${error?.message}`)}`);
    return { ok: false, status: 'not sent' };
  }
  if (!res.ok) {
    // Status plus Resend's own error name and message. Never the API key or the customer's details.
    let detail = '';
    try {
      detail = safeResendDetail(await res.text());
    } catch {
      detail = '(no response body)';
    }
    console.error(
      `Resend request (${label}) failed with status ${res.status}; from domain ${fromDomain(payload.from)}; ${detail || '(empty response body)'}`,
    );
  }
  return { ok: res.ok, status: res.status };
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, message: 'Request not allowed.' }, 403);

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return json({ ok: false, message: 'Unsupported request.' }, 415);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return json({ ok: false, message: 'Request too large.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: 'Invalid request.' }, 400);
  }
  // The form always sends a JSON object; null, an array or a bare value is refused.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return json({ ok: false, message: 'Invalid request.' }, 400);
  }

  // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
  if (typeof body.hp === 'string' && body.hp.trim() !== '') return json({ ok: true });

  // Timing check
  const elapsed = Date.now() - Number(body.startedAt);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return json({ ok: false, message: 'Please check your details and send the form again.' }, 400);
  }

  // Cloudflare Turnstile. When TURNSTILE_SECRET_KEY is set, every submission must carry a token that
  // Cloudflare confirms, before anything is validated, saved or emailed. The form shows the widget
  // when the build has VITE_TURNSTILE_SITE_KEY, so the two must be set together.
  if (env.TURNSTILE_SECRET_KEY) {
    if (!body.turnstileToken) {
      console.error('Turnstile token missing. If this is a real visitor, check VITE_TURNSTILE_SITE_KEY is set for this build.');
    }
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const passed = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, body.turnstileToken, ip);
    if (!passed) {
      return json({ ok: false, message: 'The spam check did not pass. Please try again.' }, 400);
    }
  } else if (env.DB) {
    // Enquiries are being saved with no spam check. Set up Turnstile before production uses the database.
    console.warn('Turnstile is not configured: enquiries are saved to the database without a spam check.');
  }

  const result = validateQuote(body);
  if (!result.valid) {
    return json({ ok: false, message: 'Please check the highlighted fields.', errors: result.errors }, 422);
  }

  if (!env.RESEND_API_KEY || !env.QUOTE_FROM_EMAIL) {
    console.error('Email is not configured: RESEND_API_KEY and QUOTE_FROM_EMAIL are required.');
    return json({ ok: false, message: SEND_ERROR }, 503);
  }

  const { values } = result;

  // Save the enquiry for the Admin and give it its ROSS reference. Without the D1 binding the form
  // behaves exactly as before: the enquiry is emailed and nothing is stored.
  let reference = '';
  if (env.DB) {
    try {
      ({ reference } = await createEnquiry(env.DB, values, { origin: 'website', actor: 'website' }));
    } catch (error) {
      // Never lose an enquiry because the database is unavailable; the email still goes out.
      console.error(`Could not save the enquiry: ${error.message}`);
    }
  }

  const { text, html } = buildEnquiry(values, reference);

  const internal = await sendEmail(env, {
    from: env.QUOTE_FROM_EMAIL,
    to: [env.QUOTE_TO_EMAIL || INTERNAL_TO],
    reply_to: values.email,
    subject: oneLine(`New ROSS 360 enquiry — ${values.business}`),
    text,
    html,
  }, 'internal');

  if (!internal.ok) {
    // Not saved either: the enquiry would be lost, so the customer is asked to try again.
    if (!reference) return json({ ok: false, message: SEND_ERROR }, 502);
    // Saved, so it has been received: the customer is told so, and the missing notification is
    // recorded on the enquiry's timeline for the Admin.
    try {
      await recordEvent(env.DB, reference, 'website', 'notification_failed', {
        email: 'internal',
        status: internal.status,
      });
    } catch (error) {
      console.error(`Could not record the failed notification on ${reference}: ${error.message}`);
    }
    console.error(`Enquiry ${reference} was saved, but its internal email notification failed.`);
  }

  // Optional acknowledgement to the customer. A failure here does not fail the enquiry.
  if (env.SEND_ACKNOWLEDGEMENT === 'true') {
    await sendEmail(env, {
      from: ACK_FROM,
      to: [values.email],
      reply_to: site.email,
      subject: 'ROSS 360 — Enquiry received',
      text: `${ACK_TEXT}\n\n${site.brand}\n${site.email}`,
    }, 'acknowledgement').catch(() => false);
  }

  return json({ ok: true });
}

// Any other method
export function onRequest() {
  return json({ ok: false, message: 'Method not allowed.' }, 405);
}
