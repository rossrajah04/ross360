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
//
// Quotes (Phase B): it creates a quote, saves lines, previews it and discards it. No quote is emailed
// unless ADMIN_SMOKE_SEND_TO is set, in which case one quote is really sent, to that address only
// (use your own), and a second send is checked to be refused.
//
// Customer links and availability (Phase C): it checks the signed-out refusals, the overlap rule, the
// preview's link and the pages for a draft and a forged link. With ADMIN_SMOKE_SEND_TO set, it also
// opens the sent quote's page, sends date requests and checks both orderings of a request against a
// slot being closed. Each date request sends the internal email to newquote@ (or QUOTE_TO_EMAIL); no
// email goes to any customer.

const base = (process.env.ADMIN_SMOKE_URL || '').replace(/\/+$/, '');
const email = process.env.ADMIN_SMOKE_EMAIL || '';
const password = process.env.ADMIN_SMOKE_PASSWORD || '';
const sendTo = process.env.ADMIN_SMOKE_SEND_TO || '';
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
  ['GET', '/api/admin/enquiries/ROSS-0001/quotes'],
  ['POST', '/api/admin/enquiries/ROSS-0001/quotes'],
  ['GET', '/api/admin/quotes/Q-0001'],
  ['PATCH', '/api/admin/quotes/Q-0001'],
  ['GET', '/api/admin/quotes/Q-0001/preview'],
  ['GET', '/api/admin/quotes/Q-0001/preview.html'],
  ['POST', '/api/admin/quotes/Q-0001/send'],
  ['POST', '/api/admin/quotes/Q-0001/revise'],
  ['POST', '/api/admin/quotes/Q-0001/discard'],
  ['POST', '/api/admin/quotes/Q-0001/check-send'],
  ['GET', '/api/admin/quotes/Q-0001/customer'],
  ['POST', '/api/admin/quotes/Q-0001/link/new'],
  ['POST', '/api/admin/quotes/Q-0001/link/revoke'],
  ['GET', '/api/admin/links'],
  ['GET', '/api/admin/availability'],
  ['POST', '/api/admin/availability'],
  ['PATCH', '/api/admin/availability/1'],
  ['POST', '/api/admin/availability/1/close'],
  ['POST', '/api/admin/availability/1/reopen'],
  ['POST', '/api/admin/date-requests/1/close'],
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

// Quotes: create, save, preview and discard. Nothing is emailed here.
const NOTE = 'Smoke internal note: never sent';
const created = await call(`/api/admin/enquiries/${ref1}/quotes`, { method: 'POST', body: {} });
const qref = created.data.quote?.reference;
check('create quote', created.status === 201 && /^Q-\d{4,}$/.test(qref || ''), `status ${created.status} ${created.data.message || ''}`);
check('quote copies the customer details', created.data.quote?.customerEmail === 'smoke-one@example.test');
const lines = {
  version: 1,
  package: 'professional',
  customerType: 'business',
  items: [
    { kind: 'package', description: 'Professional 360° virtual tour', quantity: 1, unitPence: 34900 },
    { kind: 'custom', description: 'Additional floor', quantity: 2, unitPence: 5000 },
  ],
  travelPence: 2500,
  discountPence: 3000,
  discountLabel: 'Smoke discount',
  serviceDescription: 'Smoke test service description',
  internalNotes: NOTE,
  totalPence: 1,
};
const savedQuote = await call(`/api/admin/quotes/${qref}`, { method: 'PATCH', body: lines });
check(
  'save quote: totals calculated on the server',
  savedQuote.status === 200 && savedQuote.data.quote?.totalPence === 44400 && savedQuote.data.quote?.version === 2,
  `status ${savedQuote.status} total ${savedQuote.data.quote?.totalPence}`,
);
const stale = await call(`/api/admin/quotes/${qref}`, { method: 'PATCH', body: { ...lines, version: 1 } });
check('stale save refused', stale.status === 409, `status ${stale.status}`);
const badMoney = await call(`/api/admin/quotes/${qref}`, { method: 'PATCH', body: { version: 2, travelPence: 12.5 } });
check('fractional pence refused', badMoney.status === 400, `status ${badMoney.status}`);
// Travel from mileage: 23.6 miles one way -> 27.2 chargeable miles -> £13.60 -> £14, whatever is sent.
const overLimit = await call(`/api/admin/quotes/${qref}`, {
  method: 'PATCH',
  body: { version: 2, travelMode: 'mileage', travelOneWayTenths: 3001 },
});
check('mileage over 300 miles refused', overLimit.status === 422, `status ${overLimit.status}`);
const noReason = await call(`/api/admin/quotes/${qref}`, {
  method: 'PATCH',
  body: { version: 2, travelMode: 'mileage', travelOneWayTenths: 236, travelOverride: true, travelPence: 2000 },
});
check('mileage override without a reason refused', noReason.status === 422, `status ${noReason.status}`);
const mileage = await call(`/api/admin/quotes/${qref}`, {
  method: 'PATCH',
  body: { version: 2, travelMode: 'mileage', travelOneWayTenths: 236, travelPence: 1 },
});
check(
  'mileage travel calculated on the server',
  mileage.status === 200 && mileage.data.quote?.travelPence === 1400 && mileage.data.quote?.totalPence === 43300,
  `status ${mileage.status} travel ${mileage.data.quote?.travelPence} total ${mileage.data.quote?.totalPence}`,
);
const backToManual = await call(`/api/admin/quotes/${qref}`, {
  method: 'PATCH',
  body: { version: 3, travelMode: 'manual', travelPence: 2500 },
});
check('manual travel still available', backToManual.status === 200 && backToManual.data.quote?.totalPence === 44400, `status ${backToManual.status}`);

const preview = await call(`/api/admin/quotes/${qref}/preview`);
const mail = preview.data.email || {};
// The preview carries the customer link the email will be sent with.
const draftLink = (mail.text || '').match(/https?:\/\/\S+\/q\/[A-Za-z0-9._-]+/)?.[0] || '';
check('preview carries the customer link and the approved lines', Boolean(draftLink) &&
  mail.text.includes('View your quotation and choose a preferred date online.') &&
  mail.text.includes('To go ahead, choose a preferred date online or reply to this email. Nothing is booked until ROSS 360 confirms the date with you.'),
  draftLink || 'no link');
const draftToken = draftLink.split('/q/')[1] || 'none';
const draftPage = await fetch(`${base}/q/${draftToken}`, { redirect: 'manual' });
check('a draft quote is not shown online', (await draftPage.text()).includes('available online'), `status ${draftPage.status}`);
check('customer page never cached or indexed', draftPage.headers.get('Cache-Control') === 'no-store' && /noindex/.test(draftPage.headers.get('X-Robots-Tag') || ''));
const forged = await fetch(`${base}/q/${draftToken.slice(0, -2)}AA`, { redirect: 'manual' });
check('a forged link is answered "no longer available"', forged.status === 404 && (await forged.text()).includes('no longer available'), `status ${forged.status}`);
check('preview', preview.status === 200 && mail.to === 'smoke-one@example.test' && mail.bcc === 'newquote@ross360.co.uk', `status ${preview.status}`);
check('preview text has no internal notes', mail.text && !mail.text.includes(NOTE));
const frame = await fetch(`${base}/api/admin/quotes/${qref}/preview.html`, { headers: { Cookie: cookie } });
const frameHtml = await frame.text();
check('preview HTML served with its own policy', /default-src 'none'/.test(frame.headers.get('Content-Security-Policy') || ''));
check('preview HTML shows VAT wording and total', frameHtml.includes('VAT is not charged.') && frameHtml.includes('£444.00'));
check('preview HTML has no internal notes', !frameHtml.includes(NOTE));
const frameSignedOut = await fetch(`${base}/api/admin/quotes/${qref}/preview.html`);
check('preview HTML refused when signed out', frameSignedOut.status === 401, `status ${frameSignedOut.status}`);

const discarded = await call(`/api/admin/quotes/${qref}/discard`, { method: 'POST', body: {} });
check('discard draft', discarded.data.quote?.status === 'discarded', `status ${discarded.status}`);
const sendDiscarded = await call(`/api/admin/quotes/${qref}/send`, {
  method: 'POST',
  body: { version: 4, confirm: true, previewedOn: preview.data.issuedOn },
});
check('discarded quote cannot be sent', sendDiscarded.status === 409, `status ${sendDiscarded.status}`);
const quoteEvents = ((await call(`/api/admin/enquiries/${ref1}`)).data.enquiry?.events || []).map((event) => event.type);
check(
  'timeline records quote created, updated, previewed and discarded',
  ['quote_created', 'quote_updated', 'quote_previewed', 'quote_discarded'].every((t) => quoteEvents.includes(t)),
  quoteEvents.join(','),
);

// Availability: the overlap rule.
const addDays = (n) => {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
};
const slotDay = addDays(20 + (Date.now() % 20));
const slotAm = await call('/api/admin/availability', { method: 'POST', body: { date: slotDay, period: 'am' } });
const slotPm = await call('/api/admin/availability', { method: 'POST', body: { date: slotDay, period: 'pm' } });
check('add Morning and Afternoon on one date', slotAm.status === 201 && slotPm.status === 201, `${slotAm.status} ${slotPm.status} ${slotAm.data.message || ''}`);
const slotDayRefused = await call('/api/admin/availability', { method: 'POST', body: { date: slotDay, period: 'day' } });
check('Full day refused while Morning or Afternoon is open', slotDayRefused.status === 409, `status ${slotDayRefused.status}`);
const closeEmpty = async (slot) =>
  call(`/api/admin/availability/${slot.id}/close`, { method: 'POST', body: {} });
await closeEmpty(slotAm.data.slot);
await closeEmpty(slotPm.data.slot);
const slotFull = await call('/api/admin/availability', { method: 'POST', body: { date: slotDay, period: 'day' } });
check('Full day allowed once both are closed', slotFull.status === 201, `status ${slotFull.status}`);
const reopenAm = await call(`/api/admin/availability/${slotAm.data.slot?.id}/reopen`, { method: 'POST', body: {} });
check('reopening Morning refused while Full day is open', reopenAm.status === 409, `status ${reopenAm.status}`);
if (slotFull.data.slot) await closeEmpty(slotFull.data.slot);

// Optional real send, to ADMIN_SMOKE_SEND_TO only.
if (sendTo) {
  const draft = await call(`/api/admin/enquiries/${ref1}/quotes`, { method: 'POST', body: {} });
  const ref = draft.data.quote?.reference;
  await call(`/api/admin/quotes/${ref}`, { method: 'PATCH', body: { ...lines, customerEmail: sendTo } });
  const unpreviewed = await call(`/api/admin/quotes/${ref}/send`, {
    method: 'POST',
    body: { version: 2, confirm: true, previewedOn: preview.data.issuedOn },
  });
  check('send refused before this version is previewed', unpreviewed.status === 409, `status ${unpreviewed.status}`);
  const sendPreview = await call(`/api/admin/quotes/${ref}/preview`);
  const sent = await call(`/api/admin/quotes/${ref}/send`, {
    method: 'POST',
    body: { version: 2, confirm: true, previewedOn: sendPreview.data.issuedOn },
  });
  check(`send ${ref} to ${sendTo}`, sent.status === 200 && sent.data.quote?.status === 'sent', `status ${sent.status} ${sent.data.message || ''}`);
  const again = await call(`/api/admin/quotes/${ref}/send`, {
    method: 'POST',
    body: { version: 2, confirm: true, previewedOn: sendPreview.data.issuedOn },
  });
  check('second send refused', again.status === 409, `status ${again.status}`);

  // The customer's page and booking, up to Stripe's test Checkout page. Nothing is paid: the hold is released.
  const quoteUrl = (sendPreview.data.email?.text || '').match(/https?:\/\/\S+\/q\/[A-Za-z0-9._-]+/)?.[0] || '';
  const path = quoteUrl ? new URL(quoteUrl).pathname : '/q/none';
  const quotePage = await fetch(`${base}${path}`, { redirect: 'manual' });
  const quoteHtml = await quotePage.text();
  check('sent quote page shows the quote', quotePage.status === 200 && quoteHtml.includes(ref), `status ${quotePage.status}`);
  check('sent quote page has no internal notes', !quoteHtml.includes(NOTE));
  const payments = (await call('/api/admin/payments')).data;
  if (payments.available && payments.mode === 'test') {
    check('quote page offers Book a slot', quoteHtml.includes('Book a slot'));
    const slotA = (await call('/api/admin/availability', { method: 'POST', body: { date: addDays(10), period: 'am' } })).data.slot;
    const slotB = (await call('/api/admin/availability', { method: 'POST', body: { date: addDays(11), period: 'pm' } })).data.slot;
    const book = await (await fetch(`${base}${path}/book`, { redirect: 'manual' })).text();
    check('booking page lists the open slots', book.includes(`value="${slotA?.id}"`) && book.includes(`value="${slotB?.id}"`));
    const payPage = async (slotId) => {
      const res = await fetch(`${base}${path}/pay?slot=${slotId}`, { redirect: 'manual' });
      const html = await res.text();
      return { status: res.status, html, nonce: html.match(/name="nonce" value="([^"]+)"/)?.[1] || '' };
    };
    const pay = (slotId, nonce) =>
      fetch(`${base}${path}/pay`, {
        method: 'POST',
        redirect: 'manual',
        headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ slot: String(slotId), plan: 'full', agree: 'yes', nonce }),
      });
    const pageA = await payPage(slotA.id);
    await closeEmpty(slotA);
    const refused = await pay(slotA.id, pageA.nonce);
    check('payment for a closed slot is refused', refused.status === 409, `status ${refused.status}`);
    const pageB = await payPage(slotB.id);
    check('payment page shows the total and amount due now', pageB.status === 200 && pageB.html.includes('Pay'), `status ${pageB.status}`);
    const started = await pay(slotB.id, pageB.nonce);
    const location = started.headers.get('Location') || '';
    check('payment opens Stripe test Checkout', started.status === 303 && location.startsWith('https://checkout.stripe.com/'), `status ${started.status} ${location}`);
    const held = await closeEmpty(slotB);
    check('a held slot cannot be closed', held.status === 409, `status ${held.status}`);
    const page = await (await fetch(`${base}${path}`, { redirect: 'manual' })).text();
    const releaseNonce = page.match(/name="nonce" value="([^"]+)"/)?.[1] || '';
    const released = await fetch(`${base}${path}/release`, {
      method: 'POST',
      redirect: 'manual',
      headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ nonce: releaseNonce }),
    });
    check('leaving checkout releases the slot', released.status === 303, `status ${released.status}`);
    const closedB = await closeEmpty(slotB);
    check('released slot can be closed', closedB.status === 200, `status ${closedB.status}`);
  } else {
    console.log(`      (booking not tested: online payment is ${payments.available ? `in ${payments.mode} mode` : 'off'}; it runs only with a Stripe test key)`);
  }
} else {
  console.log('      (no quote emailed: set ADMIN_SMOKE_SEND_TO to your own address to test a real send)');
}

// Sign out
const out = await call('/api/admin/session', { method: 'DELETE' });
check('sign out', out.status === 200 && /Max-Age=0/.test(out.headers.get('Set-Cookie') || ''));
const after = await call('/api/admin/enquiries');
check('old session refused after sign-out', after.status === 401, `status ${after.status}`);

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
