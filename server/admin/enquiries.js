// Enquiry records for the ROSS 360 Admin (Cloudflare D1).
// Used by the quote form handler (functions/api/quote.js) and the Admin API (functions/api/admin).

import {
  FIELDS,
  STATUS_VALUES,
  DASHBOARD_GROUPS,
  statusLabel,
} from '../../src/lib/admin/model.js';
import { ensureSchema } from './schema.js';

const now = () => new Date().toISOString();

// API field name -> column, for every editable field.
const COLUMNS = Object.fromEntries(Object.entries(FIELDS).map(([key, field]) => [key, field.column]));

// Fields copied from a quote form submission (src/lib/quoteSchema.js) into a new record.
const FORM_FIELDS = [
  'name',
  'business',
  'email',
  'phone',
  'projectType',
  'projectOther',
  'spaceType',
  'location',
  'size',
  'areas',
  'message',
  'preferredDate',
  'source',
];

function toApi(row) {
  if (!row) return null;
  const record = {
    reference: row.reference,
    status: row.status,
    origin: row.origin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusChangedAt: row.status_changed_at,
  };
  for (const [key, column] of Object.entries(COLUMNS)) record[key] = row[column] ?? null;
  return record;
}

const eventToApi = (row) => ({
  id: row.id,
  at: row.created_at,
  actor: row.actor,
  type: row.type,
  detail: JSON.parse(row.detail || '{}'),
});

/**
 * Create an enquiry and give it the next ROSS reference.
 * The counter update, the insert and the first timeline entry run in one D1 batch, which D1 executes
 * as a single transaction: two enquiries arriving together can never share a number, and a failed
 * insert does not use one up.
 *
 * `values` uses the API field names (as returned by validateQuote or validateManualEnquiry).
 * Returns { id, reference }.
 */
export async function createEnquiry(db, values, { origin, actor }) {
  await ensureSchema(db);
  const at = now();
  const data = {};
  const source = origin === 'website' ? FORM_FIELDS : Object.keys(COLUMNS);
  for (const key of source) {
    if (values[key] !== undefined) data[key] = values[key];
  }
  // The preferred date from the form is the starting point for scheduling.
  if (origin === 'website' && data.preferredDate && data.preferredDateTime === undefined) {
    data.preferredDateTime = data.preferredDate;
  }

  const keys = Object.keys(data);
  const columns = keys.map((key) => COLUMNS[key]);
  const placeholders = keys.map(() => '?');
  const insert = db
    .prepare(
      `INSERT INTO enquiries (ref_number, reference, status, origin, ${columns.join(', ')}${columns.length ? ', ' : ''}created_at, updated_at, status_changed_at)
       SELECT value, printf('ROSS-%04d', value), 'new', ?, ${placeholders.join(', ')}${placeholders.length ? ', ' : ''}?, ?, ?
       FROM counters WHERE name = 'enquiry'
       RETURNING id, reference`,
    )
    .bind(origin, ...keys.map((key) => data[key] ?? null), at, at, at);

  const results = await db.batch([
    db.prepare(`UPDATE counters SET value = value + 1 WHERE name = 'enquiry'`),
    insert,
    db
      .prepare(
        `INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail)
         SELECT id, ?, ?, 'created', ? FROM enquiries
         WHERE ref_number = (SELECT value FROM counters WHERE name = 'enquiry')`,
      )
      .bind(at, actor, JSON.stringify({ origin })),
  ]);
  const created = results[1].results?.[0];
  if (!created) throw new Error('Enquiry was not created.');
  return { id: created.id, reference: created.reference };
}

export async function addEvent(db, enquiryId, actor, type, detail = {}) {
  await db
    .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, ?, ?, ?)`)
    .bind(enquiryId, now(), actor, type, JSON.stringify(detail))
    .run();
}

async function findRow(db, reference) {
  return db.prepare(`SELECT * FROM enquiries WHERE reference = ?`).bind(reference).first();
}

export async function getEnquiry(db, reference) {
  await ensureSchema(db);
  const row = await findRow(db, reference);
  if (!row) return null;
  const { results } = await db
    .prepare(`SELECT * FROM enquiry_events WHERE enquiry_id = ? ORDER BY id DESC`)
    .bind(row.id)
    .all();
  return { ...toApi(row), events: results.map(eventToApi) };
}

// LIKE treats % and _ as wildcards; escape them so a search for "50%" means exactly that.
const likeTerm = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * Search by reference, customer name, business, email and address, optionally filtered by status.
 * Newest first.
 */
export async function listEnquiries(db, { q = '', status = '', limit = 200 } = {}) {
  await ensureSchema(db);
  const where = [];
  const params = [];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const term = q.trim();
  if (term) {
    const like = likeTerm(term);
    where.push(
      `(reference LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR business LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\')`,
    );
    params.push(like, like, like, like, like);
  }
  const sql = `SELECT * FROM enquiries ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ref_number DESC LIMIT ?`;
  const { results } = await db
    .prepare(sql)
    .bind(...params, Math.min(Math.max(Number(limit) || 200, 1), 500))
    .all();
  return results.map(toApi);
}

/** Change the status. Returns the updated record, or null if the reference does not exist. */
export async function changeStatus(db, reference, status, actor) {
  if (!STATUS_VALUES.includes(status)) throw new RangeError('Unknown status');
  await ensureSchema(db);
  const row = await findRow(db, reference);
  if (!row) return null;
  if (row.status !== status) {
    const at = now();
    await db.batch([
      db
        .prepare(`UPDATE enquiries SET status = ?, status_changed_at = ?, updated_at = ? WHERE id = ?`)
        .bind(status, at, at, row.id),
      db
        .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, ?, 'status', ?)`)
        .bind(row.id, at, actor, JSON.stringify({ from: row.status, to: status })),
    ]);
  }
  return getEnquiry(db, reference);
}

/**
 * Update details. `values` comes from validateEnquiryPatch (API field name -> database value).
 * Only fields whose value actually changes are written and listed in the timeline.
 */
export async function updateEnquiry(db, reference, values, actor) {
  await ensureSchema(db);
  const row = await findRow(db, reference);
  if (!row) return null;
  const changed = Object.keys(values).filter((key) => (row[COLUMNS[key]] ?? null) !== (values[key] ?? null));
  if (changed.length) {
    const at = now();
    await db.batch([
      db
        .prepare(
          `UPDATE enquiries SET ${changed.map((key) => `${COLUMNS[key]} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
        )
        .bind(...changed.map((key) => values[key]), at, row.id),
      db
        .prepare(`INSERT INTO enquiry_events (enquiry_id, created_at, actor, type, detail) VALUES (?, ?, ?, 'updated', ?)`)
        .bind(row.id, at, actor, JSON.stringify({ fields: changed.map((key) => FIELDS[key].label) })),
    ]);
  }
  return getEnquiry(db, reference);
}

export async function addNote(db, reference, text, actor) {
  await ensureSchema(db);
  const row = await findRow(db, reference);
  if (!row) return null;
  await addEvent(db, row.id, actor, 'note', { text });
  return getEnquiry(db, reference);
}

// Current month in UK time, as YYYY-MM.
export function ukMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' })
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}`;
}

/**
 * Dashboard figures. Payment and revenue figures come from the manual "Agreed price", "Amount received"
 * and "Date received" fields until payments are taken through the website.
 */
export async function dashboard(db, { month = ukMonth() } = {}) {
  await ensureSchema(db);
  const counts = {};
  const { results: byStatus } = await db
    .prepare(`SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status`)
    .all();
  const statusCounts = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
  for (const [key, statuses] of Object.entries(DASHBOARD_GROUPS)) {
    counts[key] = statuses.reduce((sum, s) => sum + (statusCounts[s] || 0), 0);
  }

  const outstandingStatuses = DASHBOARD_GROUPS.paymentsOutstanding;
  const outstanding = await db
    .prepare(
      `SELECT COALESCE(SUM(MAX(COALESCE(project_value_pence, 0) - COALESCE(amount_paid_pence, 0), 0)), 0) AS pence
       FROM enquiries WHERE status IN (${outstandingStatuses.map(() => '?').join(', ')})`,
    )
    .bind(...outstandingStatuses)
    .first();

  const revenue = await db
    .prepare(`SELECT COALESCE(SUM(amount_paid_pence), 0) AS pence FROM enquiries WHERE paid_on LIKE ?`)
    .bind(`${month}-%`)
    .first();

  const pick = async (statuses, order) => {
    const { results } = await db
      .prepare(
        `SELECT * FROM enquiries WHERE status IN (${statuses.map(() => '?').join(', ')}) ORDER BY ${order} LIMIT 8`,
      )
      .bind(...statuses)
      .all();
    return results.map(toApi);
  };

  return {
    month,
    counts,
    paymentsOutstandingPence: outstanding?.pence ?? 0,
    monthlyRevenuePence: revenue?.pence ?? 0,
    lists: {
      newEnquiries: await pick(DASHBOARD_GROUPS.newEnquiries, 'ref_number DESC'),
      upcomingBookings: await pick(DASHBOARD_GROUPS.upcomingBookings, 'status_changed_at ASC'),
      inProduction: await pick(DASHBOARD_GROUPS.inProduction, 'status_changed_at ASC'),
    },
    statusCounts: Object.fromEntries(STATUS_VALUES.map((s) => [s, statusCounts[s] || 0])),
  };
}

export { statusLabel };
