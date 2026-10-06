// Phase C availability and date requests: the overlap rule, the request window, one pending request
// per quote, the internal notification, and the race between a customer's request and the
// administrator closing that slot (both orderings, mid-dialog arrivals and concurrent interleavings).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addSlot, callPage, formOf, requestDate, sentQuote, setUp, withResend } from './helpers/phasec.js';
import { getEnquiry } from '../server/admin/enquiries.js';
import { closeSlot } from '../server/admin/availability.js';
import { addDays, ukToday } from '../src/lib/admin/quotes.js';
import { createEnquiry } from '../server/admin/enquiries.js';

const day = (n) => addDays(ukToday(), n);
const rows = (t, sql, ...params) => t.db.db.prepare(sql).all(...params);
const one = (t, sql, ...params) => t.db.db.prepare(sql).get(...params);
const events = async (t, type) => (await getEnquiry(t.db, t.enquiry)).events.filter((e) => !type || e.type === type);
const slotOf = async (t, id) => (await t.call('/availability')).data.slots.find((s) => s.id === id);
const close = (t, slot, requests = 'close') =>
  t.call(`/availability/${slot.id}/close`, {
    method: 'POST',
    body: { requests, pendingCount: slot.pendingCount, pendingMaxId: slot.pendingMaxId },
  });

// --- The overlap rule ---------------------------------------------------------------------------

test('Full day cannot be open with Morning or Afternoon on the same date, and the reverse', async () => {
  const t = await setUp();
  const add = (date, period) => t.call('/availability', { method: 'POST', body: { date, period } });
  assert.equal((await add(day(5), 'am')).status, 201);
  assert.equal((await add(day(5), 'pm')).status, 201, 'Morning and Afternoon together are allowed');
  const fullDay = await add(day(5), 'day');
  assert.equal(fullDay.status, 409);
  assert.equal(fullDay.data.message, 'Close the morning and afternoon slots on this date first.');

  assert.equal((await add(day(6), 'day')).status, 201);
  for (const period of ['am', 'pm']) {
    const half = await add(day(6), period);
    assert.equal(half.status, 409);
    assert.equal(half.data.message, 'Close the full-day slot on this date first.');
  }
  const duplicate = await add(day(5), 'am');
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.data.message, 'This slot is already open.');
});

test('closing one kind lets the other be added; reopening follows the same rule', async () => {
  const t = await setUp();
  const am = await addSlot(t, 5, 'am');
  const pm = await addSlot(t, 5, 'pm');
  assert.equal((await close(t, am)).status, 200);
  assert.equal((await t.call('/availability', { method: 'POST', body: { date: day(5), period: 'day' } })).status, 409, 'pm still open');
  assert.equal((await close(t, pm)).status, 200);
  const full = await t.call('/availability', { method: 'POST', body: { date: day(5), period: 'day' } });
  assert.equal(full.status, 201);

  // Reopening Morning while Full day is open is refused; after closing Full day it is allowed.
  const reopen = await t.call(`/availability/${am.id}/reopen`, { method: 'POST', body: {} });
  assert.equal(reopen.status, 409);
  assert.equal(reopen.data.message, 'Close the full-day slot on this date first.');
  assert.equal((await close(t, full.data.slot)).status, 200);
  assert.equal((await t.call(`/availability/${am.id}/reopen`, { method: 'POST', body: {} })).status, 200);
  // Adding a closed slot again reopens it rather than duplicating it.
  const again = await t.call('/availability', { method: 'POST', body: { date: day(5), period: 'pm' } });
  assert.equal(again.status, 201);
  assert.equal(again.data.slot.id, pm.id);
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM availability_slots`).n, 3);
});

test('two conflicting adds at once: exactly one succeeds', async () => {
  const t = await setUp();
  const results = await Promise.all([
    t.call('/availability', { method: 'POST', body: { date: day(9), period: 'day' } }),
    t.call('/availability', { method: 'POST', body: { date: day(9), period: 'am' } }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM availability_slots WHERE status = 'open'`).n, 1);
});

test('the database refuses an overlap even from hand-written SQL', async () => {
  const t = await setUp();
  await addSlot(t, 7, 'am');
  const at = new Date().toISOString();
  assert.throws(
    () => t.db.db.prepare(`INSERT INTO availability_slots (slot_date, period, status, created_at, updated_at) VALUES (?, 'day', 'open', ?, ?)`).run(day(7), at, at),
    /availability_overlap/,
  );
  t.db.db.prepare(`INSERT INTO availability_slots (slot_date, period, status, created_at, updated_at) VALUES (?, 'day', 'closed', ?, ?)`).run(day(7), at, at);
  assert.throws(() => t.db.db.exec(`UPDATE availability_slots SET status = 'open' WHERE period = 'day'`), /availability_overlap/);
});

test('past dates and bad input are refused', async () => {
  const t = await setUp();
  const past = await t.call('/availability', { method: 'POST', body: { date: day(-1), period: 'am' } });
  assert.equal(past.status, 422);
  assert.equal(past.data.errors.date, 'This date has passed.');
  for (const body of [{ date: '2026-02-30', period: 'am' }, { date: day(3), period: 'evening' }, { date: day(3), period: 'am', note: 'x'.repeat(301) }]) {
    assert.equal((await t.call('/availability', { method: 'POST', body })).status, 422, JSON.stringify(body));
  }
  // A note can be added; it is internal and never shown to customers.
  const slot = await addSlot(t, 3, 'am');
  const noted = await t.call(`/availability/${slot.id}`, { method: 'PATCH', body: { note: 'INTERNAL: parking at rear' } });
  assert.equal(noted.data.slot.note, 'INTERNAL: parking at rear');
  const { token } = await sentQuote(t);
  assert.ok(!(await callPage(t.env, `/q/${token}/date`)).html.includes('INTERNAL'));
});

// --- Date requests --------------------------------------------------------------------------------

test('only open slots from 2 days to 8 weeks ahead are offered, and only those can be requested', async () => {
  const t = await setUp();
  const { token } = await sentQuote(t);
  const ok = [await addSlot(t, 2, 'am'), await addSlot(t, 56, 'day')];
  const outside = [await addSlot(t, 0, 'am'), await addSlot(t, 1, 'pm'), await addSlot(t, 57, 'am')];
  const closed = await addSlot(t, 10, 'pm');
  await close(t, closed);

  const page = await callPage(t.env, `/q/${token}/date`);
  assert.deepEqual(formOf(page.html).slots, ok.map((s) => s.id));
  assert.ok(page.html.includes('Nothing is booked until ROSS 360 confirms the date with you.'));

  for (const slot of [...outside, closed]) {
    const refused = await requestDate(t, token, slot.id);
    assert.equal(refused.status, 409, `${slot.date} ${slot.period}`);
    assert.ok(refused.html.includes('This date is no longer available. Please choose another date.'));
  }
  assert.equal((await requestDate(t, token, 99999)).status, 409, 'unknown slot');
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM date_requests`).n, 0);

  const accepted = await requestDate(t, token, ok[0].id, 'Side entrance, please.');
  assert.equal(accepted.status, 303);
  assert.equal(accepted.location, `https://ross360.test/q/${token}`);
  const after = await callPage(t.env, `/q/${token}`);
  assert.ok(after.html.includes('Thank you. We&#39;ve received your preferred date. Nothing is booked until ROSS 360 confirms the date with you.'));
  assert.ok(after.html.includes('Your preferred date'));
  assert.ok(after.html.includes('Choose a different date'));
});

test('one pending request per quote: a new choice replaces the earlier one, even when sent together', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  const a = await addSlot(t, 3, 'am');
  const b = await addSlot(t, 4, 'pm');
  await requestDate(t, token, a.id);
  await requestDate(t, token, b.id);
  assert.deepEqual(
    rows(t, `SELECT slot_id, status FROM date_requests ORDER BY id`).map((r) => [r.slot_id, r.status]),
    [
      [a.id, 'replaced'],
      [b.id, 'pending'],
    ],
  );
  assert.equal((await events(t, 'date_request_replaced')).length, 1);

  // Two submits at once: both are saved in turn, and exactly one is left pending.
  const page = await callPage(t.env, `/q/${token}/date`);
  const { nonce } = formOf(page.html);
  await withResend(() =>
    Promise.all([
      callPage(t.env, `/q/${token}/date`, { method: 'POST', form: { slot: String(a.id), nonce } }),
      callPage(t.env, `/q/${token}/date`, { method: 'POST', form: { slot: String(b.id), nonce } }),
    ]),
  );
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM date_requests WHERE status = 'pending'`).n, 1);
  const info = await t.call(`/quotes/${reference}/customer`);
  assert.equal(info.data.customer.dateRequests.filter((r) => r.status === 'pending').length, 1);
});

test('the date form needs the same origin, a valid nonce, a chosen slot and a short note', async () => {
  const t = await setUp();
  const { token } = await sentQuote(t);
  const slot = await addSlot(t, 3, 'am');
  const { nonce } = formOf((await callPage(t.env, `/q/${token}/date`)).html);
  const post = (form, options = {}) => callPage(t.env, `/q/${token}/date`, { method: 'POST', form, ...options });
  assert.equal((await post({ slot: String(slot.id), nonce }, { origin: 'https://evil.test' })).status, 403);
  assert.equal((await post({ slot: String(slot.id), nonce }, { origin: null })).status, 403);
  assert.equal((await post({ slot: String(slot.id), nonce }, { contentType: 'application/json' })).status, 415);
  const badNonce = await post({ slot: String(slot.id), nonce: 'nope' });
  assert.equal(badNonce.status, 400);
  assert.ok(badNonce.html.includes('This page has expired. Please choose your date again.'));
  assert.equal((await post({ nonce })).status, 422);
  const long = await post({ slot: String(slot.id), nonce, note: 'x'.repeat(501) });
  assert.equal(long.status, 422);
  assert.ok(long.html.includes('Please keep the note under 500 characters.'));
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM date_requests`).n, 0);
});

test('expired and superseded quotes cannot request a date', async () => {
  const t = await setUp();
  const first = await sentQuote(t);
  const slot = await addSlot(t, 3, 'am');
  const { nonce } = formOf((await callPage(t.env, `/q/${first.token}/date`)).html);
  // Supersede it by sending a revision.
  const revised = await t.call(`/quotes/${first.reference}/revise`, { method: 'POST', body: {} });
  const rev = revised.data.quote;
  await t.call(`/quotes/${rev.reference}/preview`);
  await withResend(() =>
    t.call(`/quotes/${rev.reference}/send`, { method: 'POST', body: { version: rev.version, previewedOn: ukToday(), confirm: true } }),
  );
  const refused = await withResend((calls) =>
    callPage(t.env, `/q/${first.token}/date`, { method: 'POST', form: { slot: String(slot.id), nonce } }).then((r) => ({ r, calls })),
  );
  assert.ok(refused.r.html.includes('replaced'));
  assert.equal(refused.calls.length, 0);
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM date_requests`).n, 0);
});

test('customers never see other customers’ requests', async () => {
  const t = await setUp();
  const slot = await addSlot(t, 3, 'am');
  const a = await sentQuote(t);
  await requestDate(t, a.token, slot.id, 'ALPHA-NOTE');
  const { reference: other } = await createEnquiry(t.db, { name: 'Bea Other', email: 'bea@example.test' }, { origin: 'admin', actor: 'test' });
  t.enquiry = other;
  const b = await sentQuote(t);
  const pages = [await callPage(t.env, `/q/${b.token}`), await callPage(t.env, `/q/${b.token}/date`)];
  for (const { html } of pages) {
    for (const leak of ['ALPHA-NOTE', 'Alex', a.reference, 'Your preferred date']) assert.ok(!html.includes(leak), leak);
  }
  assert.deepEqual(formOf(pages[1].html).slots, [slot.id], 'a requested slot is still offered');
});

// --- Notification ----------------------------------------------------------------------------------

test('a date request emails newquote@ (or QUOTE_TO_EMAIL), never the customer, and leaves the enquiry status alone', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  const slot = await addSlot(t, 3, 'pm');
  const statusBefore = (await getEnquiry(t.db, t.enquiry)).status;
  const { nonce } = formOf((await callPage(t.env, `/q/${token}/date`)).html);
  const calls = await withResend(async (c) => {
    await callPage(t.env, `/q/${token}/date`, { method: 'POST', form: { slot: String(slot.id), nonce, note: 'Ring on arrival.\nThanks' } });
    return c;
  });
  assert.equal(calls.length, 1);
  const email = calls[0].body;
  assert.deepEqual(email.to, ['newquote@ross360.co.uk']);
  assert.equal(email.from, 'ROSS 360 <enquiries@ross360.test>');
  assert.equal(email.reply_to, 'alex@example.test');
  assert.ok(!JSON.stringify(email.to).includes('alex@'));
  assert.ok(email.subject.includes(reference));
  for (const part of [reference, t.enquiry, 'Alex Customer', 'Afternoon', 'Ring on arrival.', `https://ross360.test/admin#/quotes/${reference}`]) {
    assert.ok(email.text.includes(part), part);
  }
  assert.match(calls[0].headers['Idempotency-Key'], /^date-request-\d+$/);
  assert.equal((await getEnquiry(t.db, t.enquiry)).status, statusBefore);

  // The override, and a failure that leaves the request saved and logged.
  t.env.QUOTE_TO_EMAIL = 'someone@ross360.test';
  const other = await addSlot(t, 4, 'am');
  const page = await callPage(t.env, `/q/${token}/date`);
  const failed = await withResend(
    async (c) => {
      const r = await callPage(t.env, `/q/${token}/date`, { method: 'POST', form: { slot: String(other.id), nonce: formOf(page.html).nonce } });
      return { r, c };
    },
    () => new Response('{"message":"down"}', { status: 500 }),
  );
  assert.deepEqual(failed.c[0].body.to, ['someone@ross360.test']);
  assert.equal(failed.r.status, 303, 'the customer still sees their request as received');
  assert.equal(one(t, `SELECT COUNT(*) AS n FROM date_requests WHERE status = 'pending' AND slot_id = ?`, other.id).n, 1);
  const logged = await events(t, 'notification_failed');
  assert.equal(logged.length, 1);
  assert.equal(logged[0].detail.email, 'date_request');
  // The timeline records the request but never the note text.
  const requested = await events(t, 'date_requested');
  assert.equal(requested.length, 2);
  assert.equal(requested[requested.length - 1].detail.note !== undefined, true);
  assert.ok(!JSON.stringify(await events(t)).includes('Ring on arrival'));
});

// --- The race: a request against the administrator closing that slot -------------------------------

test('close commits first: the request is refused, nothing is saved, logged or emailed, and the earlier request stays', async () => {
  const t = await setUp();
  const { token } = await sentQuote(t);
  const earlier = await addSlot(t, 3, 'am');
  const target = await addSlot(t, 4, 'am');
  await requestDate(t, token, earlier.id);
  const { nonce } = formOf((await callPage(t.env, `/q/${token}/date`)).html); // the customer loaded the list
  assert.equal((await close(t, await slotOf(t, target.id))).status, 200); // then the slot closed
  const eventsBefore = (await events(t)).length;
  const { r, calls } = await withResend(async (c) => ({
    r: await callPage(t.env, `/q/${token}/date`, { method: 'POST', form: { slot: String(target.id), nonce } }),
    calls: c,
  }));
  assert.equal(r.status, 409);
  assert.ok(r.html.includes('This date is no longer available. Please choose another date.'));
  assert.equal(calls.length, 0);
  assert.equal((await events(t)).length, eventsBefore);
  assert.deepEqual(rows(t, `SELECT slot_id, status FROM date_requests`).map((x) => [x.slot_id, x.status]), [[earlier.id, 'pending']]);
});

test('the database itself refuses the request when the close lands between the check and the insert', async () => {
  const t = await setUp();
  const { token } = await sentQuote(t);
  const earlier = await addSlot(t, 3, 'am');
  const target = await addSlot(t, 4, 'pm');
  await requestDate(t, token, earlier.id);
  const { nonce } = formOf((await callPage(t.env, `/q/${token}/date`)).html);
  // Close the slot at the exact moment the request's transaction starts (after its own check passed).
  const original = t.db.batch.bind(t.db);
  let fired = false;
  t.db.batch = async (statements) => {
    if (!fired && statements.length === 4) {
      fired = true;
      t.db.db.prepare(`UPDATE availability_slots SET status = 'closed' WHERE id = ?`).run(target.id);
    }
    return original(statements);
  };
  const { r, calls } = await withResend(async (c) => ({
    r: await callPage(t.env, `/q/${token}/date`, { method: 'POST', form: { slot: String(target.id), nonce } }),
    calls: c,
  }));
  assert.ok(fired);
  assert.equal(r.status, 409);
  assert.equal(calls.length, 0);
  // Rolled back as a whole: the earlier request was not marked replaced.
  assert.deepEqual(rows(t, `SELECT slot_id, status FROM date_requests`).map((x) => [x.slot_id, x.status]), [[earlier.id, 'pending']]);
  assert.equal((await events(t, 'date_request_replaced')).length, 0);
});

test('request commits first, close with "close requests": the request is closed, once, on the timeline', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  const slot = await addSlot(t, 3, 'am');
  await requestDate(t, token, slot.id);
  const shown = await slotOf(t, slot.id);
  assert.equal(shown.pendingCount, 1);
  assert.equal(shown.pendingRequests[0].quoteReference, reference);
  const closed = await close(t, shown, 'close');
  assert.equal(closed.status, 200);
  assert.equal(closed.data.closedRequests, 1);
  assert.equal(one(t, `SELECT status FROM date_requests`).status, 'closed');
  assert.equal((await events(t, 'date_request_closed')).length, 1);
  const page = await callPage(t.env, `/q/${token}`);
  assert.ok(!page.html.includes('Your preferred date'));
  assert.ok(page.html.includes('Choose a date'));
});

test('request commits first, close with "keep requests": it stays pending, shown as Slot closed', async () => {
  const t = await setUp();
  const { token, reference } = await sentQuote(t);
  const slot = await addSlot(t, 3, 'day');
  await requestDate(t, token, slot.id);
  const kept = await close(t, await slotOf(t, slot.id), 'keep');
  assert.equal(kept.status, 200);
  assert.equal(kept.data.closedRequests, 0);
  assert.equal(one(t, `SELECT status FROM availability_slots WHERE id = ?`, slot.id).status, 'closed');
  assert.equal(one(t, `SELECT status FROM date_requests`).status, 'pending');
  const info = await t.call(`/quotes/${reference}/customer`);
  assert.equal(info.data.customer.dateRequests[0].slotStatus, 'closed');
  assert.ok((await callPage(t.env, `/q/${token}`)).html.includes('Your preferred date'));
  assert.equal((await t.call('/dashboard')).data.pendingDateRequests, 1);
  // The administrator later closes it by hand.
  const id = info.data.customer.dateRequests[0].id;
  assert.equal((await t.call(`/date-requests/${id}/close`, { method: 'POST', body: {} })).status, 200);
  assert.equal((await t.call(`/date-requests/${id}/close`, { method: 'POST', body: {} })).status, 409);
  assert.equal((await t.call('/dashboard')).data.pendingDateRequests, 0);
});

test('a request that arrives while the close dialog is open stops the close; nothing changes until it is reviewed', async () => {
  for (const requests of ['close', 'keep']) {
    const t = await setUp();
    const a = await sentQuote(t);
    const slot = await addSlot(t, 3, 'am');
    await requestDate(t, a.token, slot.id);
    const shown = await slotOf(t, slot.id); // the dialog loads with one request

    const { reference: other } = await createEnquiry(t.db, { name: 'Bea', email: 'bea@example.test' }, { origin: 'admin', actor: 'test' });
    t.enquiry = other;
    const b = await sentQuote(t);
    await requestDate(t, b.token, slot.id); // a second arrives before the administrator confirms

    const refused = await close(t, shown, requests);
    assert.equal(refused.status, 409, requests);
    assert.equal(refused.data.changed, true);
    assert.equal(refused.data.message, 'A new date request has arrived for this slot. Review it and close the slot again.');
    assert.equal(refused.data.slot.pendingCount, 2);
    assert.equal(one(t, `SELECT status FROM availability_slots WHERE id = ?`, slot.id).status, 'open');
    assert.equal(one(t, `SELECT COUNT(*) AS n FROM date_requests WHERE status = 'pending'`).n, 2);
    assert.equal(one(t, `SELECT COUNT(*) AS n FROM enquiry_events WHERE type = 'date_request_closed'`).n, 0);

    // Closing again with what is now shown succeeds.
    const again = await close(t, refused.data.slot, requests);
    assert.equal(again.status, 200, requests);
    assert.equal(
      one(t, `SELECT COUNT(*) AS n FROM date_requests WHERE status = 'pending'`).n,
      requests === 'close' ? 0 : 2,
    );
  }
});

test('the database refuses a pending request on a closed slot, by insert or by update', async () => {
  const t = await setUp();
  const { reference } = await sentQuote(t);
  const slot = await addSlot(t, 3, 'am');
  await close(t, await slotOf(t, slot.id));
  const quoteId = one(t, `SELECT id FROM quotes WHERE reference = ?`, reference).id;
  const at = new Date().toISOString();
  assert.throws(
    () => t.db.db.prepare(`INSERT INTO date_requests (quote_id, slot_id, status, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?)`).run(quoteId, slot.id, at, at),
    /slot_not_open/,
  );
  t.db.db.prepare(`INSERT INTO date_requests (quote_id, slot_id, status, created_at, updated_at) VALUES (?, ?, 'closed', ?, ?)`).run(quoteId, slot.id, at, at);
  assert.throws(() => t.db.db.exec(`UPDATE date_requests SET status = 'pending'`), /slot_not_open/);
  // A pending request cannot be moved onto a closed slot either.
  const open = await addSlot(t, 4, 'am');
  t.db.db.exec(`DELETE FROM date_requests`);
  t.db.db.prepare(`INSERT INTO date_requests (quote_id, slot_id, status, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?)`).run(quoteId, open.id, at, at);
  assert.throws(() => t.db.db.exec(`UPDATE date_requests SET slot_id = ${slot.id}`), /slot_not_open/);
  // Closing a request whose slot is closed is always allowed.
  t.db.db.exec(`UPDATE availability_slots SET status = 'closed' WHERE id = ${open.id}`);
  t.db.db.exec(`UPDATE date_requests SET status = 'closed'`);
});

test('interleaved requests and closes never leave a request accepted after its slot closed', async () => {
  for (let round = 0; round < 12; round += 1) {
    const t = await setUp();
    const quotes = [];
    for (let i = 0; i < 4; i += 1) {
      if (i) {
        const { reference } = await createEnquiry(t.db, { name: `C${i}`, email: `c${i}@example.test` }, { origin: 'admin', actor: 'test' });
        t.enquiry = reference;
      }
      quotes.push(await sentQuote(t));
    }
    const slot = await addSlot(t, 3, 'am');
    const nonces = [];
    for (const q of quotes) nonces.push(formOf((await callPage(t.env, `/q/${q.token}/date`)).html).nonce);
    const shown = await slotOf(t, slot.id);
    const requests = round % 2 ? 'keep' : 'close';

    // The close's batch is recorded at the moment it commits, against the requests saved by then.
    const order = [];
    const original = t.db.batch.bind(t.db);
    t.db.batch = async (statements) => {
      const result = await original(statements);
      order.push(statements.length === 4 ? 'request' : 'other');
      return result;
    };
    const posts = quotes.map((q, i) => async () =>
      callPage(t.env, `/q/${q.token}/date`, { method: 'POST', form: { slot: String(slot.id), nonce: nonces[i] } }),
    );
    const closing = async () => closeSlot(t.db, slot.id, { requests, pendingCount: shown.pendingCount, pendingMaxId: shown.pendingMaxId }, 'admin');
    const tasks = [...posts];
    tasks.splice(round % (tasks.length + 1), 0, closing);
    const { calls } = await withResend(async (c) => {
      await Promise.all(tasks.map((task) => task()));
      return { calls: c };
    });

    const slotRow = one(t, `SELECT status, updated_at FROM availability_slots WHERE id = ?`, slot.id);
    const saved = rows(t, `SELECT id, status, created_at FROM date_requests WHERE slot_id = ?`, slot.id);
    if (slotRow.status === 'closed') {
      // Every request on the slot was created before the close committed…
      for (const r of saved) assert.ok(r.created_at <= slotRow.updated_at, `round ${round}: request after close`);
      // …and with "close requests" none is left pending.
      if (requests === 'close') assert.ok(saved.every((r) => r.status !== 'pending'), `round ${round}`);
    }
    // Every internal email matches a saved request, and every saved request was emailed once.
    const emailed = calls.map((c) => Number(c.headers['Idempotency-Key'].replace('date-request-', ''))).sort();
    assert.deepEqual(emailed, saved.map((r) => r.id).sort(), `round ${round}`);
    assert.equal(one(t, `SELECT COUNT(*) AS n FROM enquiry_events WHERE type = 'date_requested'`).n, saved.length);
  }
});
