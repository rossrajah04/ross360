// End-to-end check of a deployed ROSS 360 Admin (for example a Cloudflare Pages preview).
//
//   ADMIN_SMOKE_URL=https://admin-phase-a.ross360.pages.dev \
//   ADMIN_SMOKE_EMAIL=you@example.com ADMIN_SMOKE_PASSWORD=... \
//   npm run admin:smoke
//
// Run it against a preview with a fresh, migrated D1 database. It creates two enquiries through the
// Admin (never through the public quote form, so no email is sent), then changes, searches and reads
// them, and checks that signed-out requests are refused. The password is read from the environment
// and never printed.

const base = (process.env.ADMIN_SMOKE_URL || '').replace(/\/+$/, '');
const email = process.env.ADMIN_SMOKE_EMAIL || '';
const password = process.env.ADMIN_SMOKE_PASSWORD || '';
if (!base || !email || !password) {
  console.error('Set ADMIN_SMOKE_URL, ADMIN_SMOKE_EMAIL and ADMIN_SMOKE_PASSWORD.');
  process.exit(2);
}

let cookie = '';
let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) console.log(`PASS  ${label}`);
  else {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` (${detail})` : ''}`);
  }
};

async function call(path, { method = 'GET', body, withCookie = true } = {}) {
  const headers = { Origin: base };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withCookie && cookie) headers.Cookie = cookie;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  return { status: response.status, data, headers: response.headers };
}

const stamp = `Smoke ${new Date().toISOString().slice(0, 16)}`;

// The Admin page itself
const page = await fetch(`${base}/admin`, { redirect: 'manual' });
check('/admin loads', page.status === 200, `status ${page.status}`);
check('/admin is noindex', /noindex/.test(page.headers.get('X-Robots-Tag') || ''), page.headers.get('X-Robots-Tag'));

// Signed-out requests are refused
const routes = [
  ['GET', '/api/admin/dashboard'],
  ['GET', '/api/admin/enquiries'],
  ['GET', '/api/admin/enquiries/ROSS-0001'],
  ['POST', '/api/admin/enquiries'],
  ['PATCH', '/api/admin/enquiries/ROSS-0001'],
  ['POST', '/api/admin/enquiries/ROSS-0001/status'],
  ['POST', '/api/admin/enquiries/ROSS-0001/notes'],
];
for (const [method, path] of routes) {
  const result = await call(path, { method, body: method === 'GET' ? undefined : {}, withCookie: false });
  check(`signed out: ${method} ${path} refused`, result.status === 401, `status ${result.status}`);
}

// Wrong password
const wrong = await call('/api/admin/session', { method: 'POST', body: { email, password: `${password}-wrong` } });
check('wrong password refused', wrong.status === 401 && !wrong.headers.get('Set-Cookie'), `status ${wrong.status}`);

// Sign in
const signIn = await call('/api/admin/session', { method: 'POST', body: { email, password } });
cookie = (signIn.headers.get('Set-Cookie') || '').split(';')[0];
check('sign in', signIn.status === 200 && Boolean(cookie), `status ${signIn.status} ${signIn.data.message || ''}`);
const setCookie = signIn.headers.get('Set-Cookie') || '';
check('cookie is HttpOnly, Secure, SameSite=Strict', /HttpOnly/.test(setCookie) && /Secure/.test(setCookie) && /SameSite=Strict/.test(setCookie));
if (!cookie) {
  console.log(`\n${failures} check(s) failed. Stopping: could not sign in.`);
  process.exit(1);
}

// Dashboard
const dash = await call('/api/admin/dashboard');
check('dashboard', dash.status === 200 && dash.data.counts && 'monthlyRevenuePence' in dash.data, `status ${dash.status}`);

// Create and read two enquiries
const first = await call('/api/admin/enquiries', {
  method: 'POST',
  body: { name: `${stamp} One`, business: 'Smoke Test Café', email: 'smoke-one@example.test', location: 'M1 1AA' },
});
check('create first enquiry', first.status === 201, `status ${first.status} ${first.data.message || ''}`);
const second = await call('/api/admin/enquiries', {
  method: 'POST',
  body: { name: `${stamp} Two`, business: 'Smoke Test Gym', phone: '07000 000000', location: 'LS1 4AB' },
});
check('create second enquiry', second.status === 201, `status ${second.status}`);
const ref1 = first.data.reference;
const ref2 = second.data.reference;
console.log(`      references: ${ref1}, ${ref2}`);
check('first reference is ROSS-0001 (fresh database)', ref1 === 'ROSS-0001', ref1);
check('second reference is ROSS-0002 (fresh database)', ref2 === 'ROSS-0002', ref2);
check('references are consecutive', Number(ref2?.slice(5)) === Number(ref1?.slice(5)) + 1, `${ref1} then ${ref2}`);

const read = await call(`/api/admin/enquiries/${ref1}`);
check('read enquiry', read.status === 200 && read.data.enquiry?.business === 'Smoke Test Café', `status ${read.status}`);

// Status
const status = await call(`/api/admin/enquiries/${ref1}/status`, { method: 'POST', body: { status: 'quoted' } });
check('change status', status.data.enquiry?.status === 'quoted', `status ${status.status}`);

// Scheduling fields
const schedule = await call(`/api/admin/enquiries/${ref1}`, {
  method: 'PATCH',
  body: {
    premisesCondition: 'quiet',
    daylight: 'essential',
    flexibleTiming: 'yes',
    preferredDateTime: 'Tuesday morning',
    schedulingNotes: 'Smoke test',
  },
});
const e = schedule.data.enquiry || {};
check(
  'save scheduling fields',
  e.premisesCondition === 'quiet' && e.daylight === 'essential' && e.flexibleTiming === 'yes' && e.preferredDateTime === 'Tuesday morning',
  `status ${schedule.status}`,
);

// Note
const note = await call(`/api/admin/enquiries/${ref1}/notes`, { method: 'POST', body: { text: 'Smoke test note' } });
check('add note', note.data.enquiry?.events?.[0]?.detail?.text === 'Smoke test note', `status ${note.status}`);
const types = (note.data.enquiry?.events || []).map((event) => event.type);
check('timeline records creation, status, update and note', ['created', 'status', 'updated', 'note'].every((t) => types.includes(t)), types.join(','));

// Search
const byRef = await call(`/api/admin/enquiries?q=${encodeURIComponent(ref2)}`);
check('search by reference', byRef.data.enquiries?.length === 1 && byRef.data.enquiries[0].reference === ref2);
const byBusiness = await call(`/api/admin/enquiries?q=${encodeURIComponent('Smoke Test Gym')}`);
check('search by business', byBusiness.data.enquiries?.some((x) => x.reference === ref2));
const byEmail = await call(`/api/admin/enquiries?q=${encodeURIComponent('smoke-one@example.test')}`);
check('search by email', byEmail.data.enquiries?.some((x) => x.reference === ref1));
const byAddress = await call(`/api/admin/enquiries?q=LS1`);
check('search by address', byAddress.data.enquiries?.some((x) => x.reference === ref2));
const byStatus = await call(`/api/admin/enquiries?status=quoted`);
check('filter by status', byStatus.data.enquiries?.some((x) => x.reference === ref1));

// Sign out
const out = await call('/api/admin/session', { method: 'DELETE' });
check('sign out', out.status === 200 && /Max-Age=0/.test(out.headers.get('Set-Cookie') || ''));
const after = await call('/api/admin/enquiries');
check('old session refused after sign-out', after.status === 401, `status ${after.status}`);

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
