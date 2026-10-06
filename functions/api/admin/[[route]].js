// Cloudflare Pages Function: the ROSS 360 Admin API at /api/admin/*.
//
// Every route except POST /api/admin/session requires a valid admin session, so no customer
// data is reachable without signing in. Secrets come from environment variables; see server/admin/auth.js.

import { json, readJson, sameOriginWrite, ADMIN_HEADERS } from '../../../server/admin/http.js';
import {
  currentSession,
  isConfigured,
  signIn,
  signOut,
  sessionCookie,
  clearedCookie,
} from '../../../server/admin/auth.js';
import {
  changeStatus,
  createEnquiry,
  dashboard,
  getEnquiry,
  listEnquiries,
  addNote,
  updateEnquiry,
} from '../../../server/admin/enquiries.js';
import { SchemaNotReady, requireSchema } from '../../../server/admin/schema.js';
import {
  createQuote,
  discardQuote,
  getQuote,
  listQuotes,
  previewOf,
  reconcileQuote,
  recordPreview,
  reviseQuote,
  sendQuote,
  sentEmail,
  updateQuote,
} from '../../../server/admin/quotes.js';
import { QUOTE_FROM, QUOTE_BCC } from '../../../server/admin/quoteRender.js';
import { QUOTE_REFERENCE_RE } from '../../../src/lib/admin/quotes.js';
import { STATUS_VALUES, REFERENCE_RE, parseStatusFilter, validateEnquiryPatch, validateManualEnquiry } from '../../../src/lib/admin/model.js';

const UNCONFIGURED = 'The Admin is not set up yet. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH and the DB binding in Cloudflare.';

// Deliberately the same message whether the email or the password was wrong.
const SIGN_IN_FAILED = 'Email address or password not recognised.';

const notFound = () => json({ ok: false, message: 'Not found.' }, 404);

// How each outcome of a quote action is answered. 409s carry the quote as it now is, so the Admin
// can show the latest state.
const QUOTE_OUTCOMES = {
  not_draft: [409, 'This quote has been sent or discarded, so it can no longer be changed.'],
  stale: [409, 'This quote has changed since you opened it. Reload it to see the latest version; nothing was saved or sent.'],
  conflict: [409, 'This quote is already being sent, has been sent, or has changed since you previewed it. Nothing was sent again.'],
  not_sent: [409, 'Only a sent quote can be revised.'],
  not_previewed: [409, 'Preview this version of the quote before sending it. Nothing was sent.'],
  preview_outdated: [409, 'The preview was for a different day, so its dates are out of date. Preview it again before sending. Nothing was sent.'],
  not_unknown: [409, 'This quote does not have an unknown send to check.'],
  window_passed: [
    409,
    'This send can no longer be checked automatically (more than 23 hours have passed). It stays locked: check Resend and the newquote@ copy, then reconcile it by hand as the README describes.',
  ],
  unconfigured: [503, 'Email sending is not set up (RESEND_API_KEY). Nothing was sent.'],
};

function quoteOutcome(outcome) {
  if (outcome.result === 'not_found') return notFound();
  if (outcome.result === 'open_revision') {
    return json({ ok: false, message: `${outcome.revision} is already an open revision of this quote.`, revision: outcome.revision, quote: outcome.quote }, 409);
  }
  if (outcome.result === 'invalid') {
    const { validation } = outcome;
    return validation.badType
      ? json({ ok: false, message: 'Invalid request.', errors: validation.errors }, 400)
      : json({ ok: false, message: 'Please check the highlighted fields.', errors: validation.errors }, 422);
  }
  if (outcome.result === 'incomplete') {
    return json({ ok: false, message: 'This quote is not ready to send.', problems: outcome.problems, quote: outcome.quote }, 422);
  }
  if (outcome.result === 'unknown') {
    return json(
      {
        ok: false,
        unknown: true,
        message: `We could not confirm whether the email was sent (${outcome.status}). The quote is locked as "Send status unknown" and will not be sent again. Use "Check send status" to find out safely.`,
        quote: outcome.quote,
      },
      502,
    );
  }
  if (outcome.result === 'failed') {
    return json(
      {
        ok: false,
        message: `The quote was not sent: the email service did not accept it (status ${outcome.status}). It is still a draft, so you can try again.`,
        quote: outcome.quote,
      },
      502,
    );
  }
  const known = QUOTE_OUTCOMES[outcome.result];
  if (known) return json({ ok: false, message: known[1], quote: outcome.quote }, known[0]);
  return json({ ok: true, quote: outcome.quote });
}

// The quote preview is shown in a sandboxed frame inside the Admin. It is served with its own strict
// policy: no scripts, no remote content, inline styles only, and framing only by the Admin itself.
const PREVIEW_HEADERS = {
  ...ADMIN_HEADERS,
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
};

const isVersion = (value) => Number.isSafeInteger(value) && value > 0;

export async function onRequest(context) {
  try {
    return await handle(context);
  } catch (error) {
    // The database exists but its migrations have not been applied. Nothing is created here.
    if (error instanceof SchemaNotReady) {
      console.error(error.message);
      return json({ ok: false, message: error.message }, 503);
    }
    throw error;
  }
}

async function handle(context) {
  const { request, env, params } = context;
  const segments = [].concat(params.route || []).filter(Boolean);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...ADMIN_HEADERS, Allow: 'GET, POST, PATCH, DELETE' } });
  }
  if (method !== 'GET' && !sameOriginWrite(request)) {
    return json({ ok: false, message: 'Request not allowed.' }, 403);
  }

  let body = {};
  if (method === 'POST' || method === 'PATCH') {
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) return json({ ok: false, message: 'Unsupported request.' }, 415);
    try {
      body = await readJson(request);
    } catch {
      return json({ ok: false, message: 'Invalid request.' }, 400);
    }
  }

  // Every route, signed in or not, needs the database at the expected schema version.
  if (isConfigured(env)) await requireSchema(env.DB);

  // --- Session: the only routes that work without one ----------------------------------------
  if (segments[0] === 'session' && segments.length === 1) {
    if (method === 'POST') {
      const notText = (value) => value !== undefined && typeof value !== 'string';
      if (notText(body.email) || notText(body.password)) return json({ ok: false, message: 'Invalid request.' }, 400);
      const result = await signIn(env, request, body);
      if (result.ok) {
        return json({ ok: true, email: env.ADMIN_EMAIL }, 200, { 'Set-Cookie': sessionCookie(result.token) });
      }
      if (result.reason === 'unconfigured') return json({ ok: false, message: UNCONFIGURED }, 503);
      if (result.reason === 'locked') {
        return json({ ok: false, message: 'Too many attempts. Please try again in 15 minutes.' }, 429);
      }
      return json({ ok: false, message: SIGN_IN_FAILED }, 401);
    }
    if (method === 'GET') {
      if (!isConfigured(env)) return json({ ok: false, configured: false, message: UNCONFIGURED }, 503);
      const session = await currentSession(env, request);
      return session
        ? json({ ok: true, configured: true, email: session.email })
        : json({ ok: false, configured: true }, 401);
    }
    if (method === 'DELETE') {
      await signOut(env, request);
      return json({ ok: true }, 200, { 'Set-Cookie': clearedCookie() });
    }
    return json({ ok: false, message: 'Method not allowed.' }, 405);
  }

  // --- Everything below needs a session ------------------------------------------------------
  if (!isConfigured(env)) return json({ ok: false, message: UNCONFIGURED }, 503);
  const session = await currentSession(env, request);
  if (!session) return json({ ok: false, message: 'Please sign in.' }, 401);

  const db = env.DB;
  const actor = session.email;
  const url = new URL(request.url);

  if (segments[0] === 'dashboard' && segments.length === 1 && method === 'GET') {
    return json({ ok: true, ...(await dashboard(db)) });
  }

  if (segments[0] === 'enquiries') {
    if (segments.length === 1) {
      if (method === 'GET') {
        const status = parseStatusFilter(url.searchParams.get('status'));
        if (!status) return json({ ok: false, message: 'Unknown status.' }, 400);
        const enquiries = await listEnquiries(db, { q: url.searchParams.get('q') || '', status });
        return json({ ok: true, enquiries });
      }
      if (method === 'POST') {
        const result = validateManualEnquiry(body);
        if (result.badType) return json({ ok: false, message: 'Invalid request.', errors: result.errors }, 400);
        if (!result.valid) {
          return json({ ok: false, message: 'Please check the highlighted fields.', errors: result.errors }, 422);
        }
        const { reference } = await createEnquiry(db, result.values, { origin: 'admin', actor });
        return json({ ok: true, reference, enquiry: await getEnquiry(db, reference) }, 201);
      }
      return json({ ok: false, message: 'Method not allowed.' }, 405);
    }

    const reference = decodeURIComponent(segments[1]);
    if (!REFERENCE_RE.test(reference)) return notFound();

    if (segments.length === 2) {
      if (method === 'GET') {
        const enquiry = await getEnquiry(db, reference);
        return enquiry ? json({ ok: true, enquiry }) : notFound();
      }
      if (method === 'PATCH') {
        const result = validateEnquiryPatch(body);
        if (result.badType) return json({ ok: false, message: 'Invalid request.', errors: result.errors }, 400);
        if (!result.valid) {
          return json({ ok: false, message: 'Please check the highlighted fields.', errors: result.errors }, 422);
        }
        if (!Object.keys(result.values).length) return json({ ok: false, message: 'Nothing to change.' }, 400);
        const enquiry = await updateEnquiry(db, reference, result.values, actor);
        return enquiry ? json({ ok: true, enquiry }) : notFound();
      }
      return json({ ok: false, message: 'Method not allowed.' }, 405);
    }

    if (segments.length === 3 && segments[2] === 'quotes') {
      if (method === 'GET') {
        const quotes = await listQuotes(db, reference);
        return quotes ? json({ ok: true, quotes }) : notFound();
      }
      if (method === 'POST') {
        const quote = await createQuote(db, reference, actor);
        return quote ? json({ ok: true, quote }, 201) : notFound();
      }
      return json({ ok: false, message: 'Method not allowed.' }, 405);
    }

    if (segments.length === 3 && method === 'POST') {
      if (segments[2] === 'status') {
        const status = body.status;
        if (typeof status !== 'string' || !STATUS_VALUES.includes(status)) return json({ ok: false, message: 'Unknown status.' }, 400);
        const enquiry = await changeStatus(db, reference, status, actor);
        return enquiry ? json({ ok: true, enquiry }) : notFound();
      }
      if (segments[2] === 'notes') {
        if (typeof body.text !== 'string') return json({ ok: false, message: 'Invalid request.' }, 400);
        const text = body.text.trim();
        if (!text) return json({ ok: false, message: 'Please enter a note.' }, 422);
        if (text.length > 2000) return json({ ok: false, message: 'Please shorten the note.' }, 422);
        const enquiry = await addNote(db, reference, text, actor);
        return enquiry ? json({ ok: true, enquiry }) : notFound();
      }
    }
  }

  if (segments[0] === 'quotes' && (segments.length === 2 || segments.length === 3)) {
    const reference = decodeURIComponent(segments[1]);
    if (!QUOTE_REFERENCE_RE.test(reference)) return notFound();
    const action = segments[2];

    if (!action) {
      if (method === 'GET') {
        const quote = await getQuote(db, reference);
        return quote ? json({ ok: true, quote }) : notFound();
      }
      if (method === 'PATCH') {
        if (!isVersion(body.version)) return json({ ok: false, message: 'Invalid request.' }, 400);
        return quoteOutcome(await updateQuote(db, reference, body, body.version, actor));
      }
      return json({ ok: false, message: 'Method not allowed.' }, 405);
    }

    if (action === 'preview' || action === 'preview.html') {
      if (method !== 'GET') return json({ ok: false, message: 'Method not allowed.' }, 405);
      const quote = await getQuote(db, reference);
      if (!quote) return notFound();
      // A draft (or discarded draft) is rendered now; anything sent or being sent shows exactly what
      // was stored for sending.
      const email = previewOf(quote) || (await sentEmail(db, reference));
      if (action === 'preview.html') return new Response(email.html, { status: 200, headers: PREVIEW_HEADERS });
      if (quote.status === 'draft') await recordPreview(db, reference, actor);
      return json({
        ok: true,
        quote,
        email: {
          from: QUOTE_FROM,
          to: quote.status === 'draft' || quote.status === 'discarded' ? quote.customerEmail : email.to,
          bcc: QUOTE_BCC,
          subject: email.subject,
          text: email.text,
        },
        // The UK date the preview was rendered for; sending must happen on the same date.
        issuedOn: quote.status === 'draft' ? email.snapshot.issuedOn : quote.issuedOn,
      });
    }

    if (method !== 'POST') return json({ ok: false, message: 'Method not allowed.' }, 405);
    if (action === 'send') {
      if (body.confirm !== true || !isVersion(body.version) || typeof body.previewedOn !== 'string') {
        return json({ ok: false, message: 'Invalid request.' }, 400);
      }
      return quoteOutcome(await sendQuote(env, reference, { version: body.version, previewedOn: body.previewedOn }, actor));
    }
    if (action === 'check-send') {
      if (body.confirm !== true) return json({ ok: false, message: 'Invalid request.' }, 400);
      return quoteOutcome(await reconcileQuote(env, reference, actor));
    }
    if (action === 'revise') {
      const outcome = await reviseQuote(db, reference, actor);
      return outcome.result === 'ok' ? json({ ok: true, quote: outcome.quote }, 201) : quoteOutcome(outcome);
    }
    if (action === 'discard') return quoteOutcome(await discardQuote(db, reference, actor));
  }

  return notFound();
}
