// ROSS 360 Admin database schema (Cloudflare D1, bound to the Pages project as `DB`).
// Tables are created on first use, so a new, empty D1 database needs no manual setup.
// Every statement is idempotent. To change the schema later, add new statements here
// (for example `ALTER TABLE … ADD COLUMN`) and guard them so they can run more than once.

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  )`,
  `INSERT OR IGNORE INTO counters (name, value) VALUES ('enquiry', 0)`,
  `CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY,
    ref_number INTEGER NOT NULL UNIQUE,
    reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'new',
    origin TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    business TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    project_type TEXT,
    project_other TEXT NOT NULL DEFAULT '',
    space_type TEXT,
    location TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    areas TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    preferred_date TEXT NOT NULL DEFAULT '',
    source TEXT,
    premises_condition TEXT,
    daylight TEXT,
    flexible_timing TEXT,
    preferred_datetime TEXT NOT NULL DEFAULT '',
    scheduling_notes TEXT NOT NULL DEFAULT '',
    project_value_pence INTEGER,
    amount_paid_pence INTEGER,
    paid_on TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status_changed_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS enquiries_status ON enquiries (status)`,
  `CREATE INDEX IF NOT EXISTS enquiries_paid_on ON enquiries (paid_on)`,
  `CREATE TABLE IF NOT EXISTS enquiry_events (
    id INTEGER PRIMARY KEY,
    enquiry_id INTEGER NOT NULL REFERENCES enquiries (id),
    created_at TEXT NOT NULL,
    actor TEXT NOT NULL,
    type TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS enquiry_events_enquiry ON enquiry_events (enquiry_id, id)`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_login_failures (
    id INTEGER PRIMARY KEY,
    client_key TEXT NOT NULL,
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS admin_login_failures_key ON admin_login_failures (client_key, at)`,
];

// Run the schema once per database binding per worker instance.
const ready = new WeakMap();

export function ensureSchema(db) {
  if (!ready.has(db)) {
    const pending = db.batch(SCHEMA.map((sql) => db.prepare(sql))).catch((error) => {
      ready.delete(db);
      throw error;
    });
    ready.set(db, pending);
  }
  return ready.get(db);
}
