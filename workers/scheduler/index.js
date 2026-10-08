// ROSS 360 booking scheduler: a Cloudflare Worker with a Cron Trigger (hourly).
//
// It does one thing: POST <SCHEDULER_TARGET>/api/scheduler/run with the shared SCHEDULER_SECRET. All
// the work (reminders, unpaid-balance cancellations, refunds) runs in the Pages project, with its own
// database and keys, so this Worker needs no database or Stripe access. See README: Booking scheduler.
//
// Variables: SCHEDULER_TARGET (e.g. https://phase-c-customer-links.ross360.pages.dev for Preview, or
// https://ross360.co.uk for Production). Secret: SCHEDULER_SECRET (the same value as the Pages project's).

async function run(env) {
  if (!env.SCHEDULER_TARGET || !env.SCHEDULER_SECRET) throw new Error('SCHEDULER_TARGET and SCHEDULER_SECRET must be set.');
  const res = await fetch(`${env.SCHEDULER_TARGET.replace(/\/$/, '')}/api/scheduler/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SCHEDULER_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Scheduler run failed with status ${res.status}: ${body.slice(0, 300)}`);
  console.log(`Scheduler run: ${body.slice(0, 500)}`);
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(run(env));
  },
};
