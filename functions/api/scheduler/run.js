// Cloudflare Pages Function: POST /api/scheduler/run (Phase C).
//
// Runs the scheduled booking tasks: releases expired checkout holds, emails balance reminders,
// cancels bookings whose balance is unpaid after the deadline (refunding the deposit) and retries
// refunds. Called hourly by the Cron Worker in workers/scheduler, with
// "Authorization: Bearer <SCHEDULER_SECRET>". Safe to call at any time and any number of times.

import { SchemaNotReady } from '../../../server/admin/schema.js';
import { runScheduled } from '../../../server/booking/bookings.js';

const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const MIN_SECRET_LENGTH = 32;

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const ax = new Uint8Array(x);
  const by = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i += 1) diff |= ax[i] ^ by[i];
  return diff === 0;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const secret = env.SCHEDULER_SECRET || '';
  if (!env.DB || secret.length < MIN_SECRET_LENGTH) return reply(503, { ok: false, error: 'not configured' });
  const header = request.headers.get('Authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!given || !(await sameSecret(given, secret))) return reply(401, { ok: false });
  try {
    return reply(200, { ok: true, ...(await runScheduled(env)) });
  } catch (error) {
    if (error instanceof SchemaNotReady) return reply(503, { ok: false, error: error.message });
    console.error(`Scheduled booking tasks failed: ${error?.name}: ${error?.message}`);
    return reply(500, { ok: false });
  }
}
