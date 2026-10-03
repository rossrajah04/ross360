// Cloudflare Pages Function: POST /api/quote
// Website form -> validate -> Resend -> contact@ross360.co.uk (+ optional customer acknowledgement).
//
// Secrets are read from environment variables (Cloudflare Pages -> Settings -> Variables and Secrets):
//   RESEND_API_KEY        (secret, required)
//   QUOTE_FROM_EMAIL      (required; an address on a domain verified in Resend)
//   QUOTE_TO_EMAIL        (optional; defaults to contact@ross360.co.uk)
//   SEND_ACKNOWLEDGEMENT  (optional; "true" sends the customer an acknowledgement email)
//   TURNSTILE_SECRET_KEY  (optional; enables Cloudflare Turnstile verification)
//
// No key is ever sent to the browser or committed to the repository.

import { validateQuote, PROJECT_TYPES } from '../../src/lib/quoteSchema.js';
import { site } from '../../src/content/site.js';

const DEFAULT_TO = site.email;
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

function buildEnquiry(values) {
  const projectLabel = PROJECT_TYPES.find((t) => t.value === values.projectType)?.label ?? values.projectType;
  const rows = [
    ['Name', values.name],
    ['Business / organisation', values.business],
    ['Email', values.email],
    ['Phone', values.phone || '—'],
    ['Project type', projectLabel],
    ['Address', values.address],
    ['Postcode', values.postcode],
    ['Premises type', values.premisesType || '—'],
    ['Approximate size / rooms', values.size || '—'],
    ['Areas to capture', values.areas || '—'],
    ['Preferred timeframe', values.timeframe || '—'],
    ['Website', values.website || '—'],
    ['Google Maps / Business Profile', values.googleLink || '—'],
    ['Additional information', values.message || '—'],
  ];
  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html =
    '<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' +
    rows
      .map(
        ([label, value]) =>
          `<tr><td style="vertical-align:top;color:#555;white-space:nowrap"><strong>${escapeHtml(label)}</strong></td>` +
          `<td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
      )
      .join('') +
    '</table>';
  return { projectLabel, text, html };
}

async function sendEmail(env, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // Log the status only — never the key or the customer's details.
    console.error(`Resend request failed with status ${res.status}`);
  }
  return res.ok;
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

  // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
  if (typeof body.hp === 'string' && body.hp.trim() !== '') return json({ ok: true });

  // Timing check
  const elapsed = Date.now() - Number(body.startedAt);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return json({ ok: false, message: 'Please check your details and send the form again.' }, 400);
  }

  // Optional Turnstile
  if (env.TURNSTILE_SECRET_KEY) {
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const passed = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, body.turnstileToken, ip);
    if (!passed) {
      return json({ ok: false, message: 'The spam check did not pass. Please try again.' }, 400);
    }
  }

  const result = validateQuote(body);
  if (!result.valid) {
    return json({ ok: false, message: 'Please check the highlighted fields.', errors: result.errors }, 422);
  }

  if (!env.RESEND_API_KEY || !env.QUOTE_FROM_EMAIL) {
    console.error('Email is not configured: RESEND_API_KEY and QUOTE_FROM_EMAIL are required.');
    return json(
      {
        ok: false,
        message: `Enquiries cannot be sent from this page at present. Please email ${DEFAULT_TO}.`,
      },
      503,
    );
  }

  const { values } = result;
  const { projectLabel, text, html } = buildEnquiry(values);

  const delivered = await sendEmail(env, {
    from: env.QUOTE_FROM_EMAIL,
    to: [env.QUOTE_TO_EMAIL || DEFAULT_TO],
    reply_to: values.email,
    subject: oneLine(`New quote enquiry: ${values.business} (${projectLabel})`),
    text,
    html,
  });

  if (!delivered) {
    return json(
      {
        ok: false,
        message: `Your enquiry could not be sent. Please try again, or email ${DEFAULT_TO}.`,
      },
      502,
    );
  }

  // Optional acknowledgement. A failure here does not fail the enquiry.
  if (env.SEND_ACKNOWLEDGEMENT === 'true') {
    await sendEmail(env, {
      from: env.QUOTE_FROM_EMAIL,
      to: [values.email],
      reply_to: env.QUOTE_TO_EMAIL || DEFAULT_TO,
      subject: 'Your enquiry to ROSS 360',
      text:
        `Hello ${oneLine(values.name)},\n\n` +
        'Thank you. Your enquiry has been received.\n\n' +
        'We will review the details and respond with a quotation or any information we need to prepare one.\n\n' +
        `${site.brand}\n${site.domain}`,
    }).catch(() => false);
  }

  return json({ ok: true });
}

// Any other method
export function onRequest() {
  return json({ ok: false, message: 'Method not allowed.' }, 405);
}
