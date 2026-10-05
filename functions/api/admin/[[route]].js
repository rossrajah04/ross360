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
import { STATUS_VALUES, REFERENCE_RE, parseStatusFilter, validateEnquiryPatch, validateManualEnquiry } from '../../../src/lib/admin/model.js';

const UNCONFIGURED = 'The Admin is not set up yet. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH and the DB binding in Cloudflare.';

// Deliberately the same message whether the email or the password was wrong.
const SIGN_IN_FAILED = 'Email address or password not recognised.';

const notFound = () => json({ ok: false, message: 'Not found.' }, 404);

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
        if (!result.valid) {
          return json({ ok: false, message: 'Please check the highlighted fields.', errors: result.errors }, 422);
        }
        if (!Object.keys(result.values).length) return json({ ok: false, message: 'Nothing to change.' }, 400);
        const enquiry = await updateEnquiry(db, reference, result.values, actor);
        return enquiry ? json({ ok: true, enquiry }) : notFound();
      }
      return json({ ok: false, message: 'Method not allowed.' }, 405);
    }

    if (segments.length === 3 && method === 'POST') {
      if (segments[2] === 'status') {
        const status = String(body.status || '');
        if (!STATUS_VALUES.includes(status)) return json({ ok: false, message: 'Unknown status.' }, 400);
        const enquiry = await changeStatus(db, reference, status, actor);
        return enquiry ? json({ ok: true, enquiry }) : notFound();
      }
      if (segments[2] === 'notes') {
        const text = String(body.text || '').trim();
        if (!text) return json({ ok: false, message: 'Please enter a note.' }, 422);
        if (text.length > 2000) return json({ ok: false, message: 'Please shorten the note.' }, 422);
        const enquiry = await addNote(db, reference, text, actor);
        return enquiry ? json({ ok: true, enquiry }) : notFound();
      }
    }
  }

  return notFound();
}
