-- ROSS 360 Admin, Phase A: initial schema (version 1).
--
-- Migrations are applied by hand, never by the website. Apply this file to a D1 database with:
--   npx wrangler d1 execute <database-name> --remote --file=migrations/0001_admin_phase_a.sql
-- or paste it into the database's Console in the Cloudflare dashboard.
--
-- The website only checks that the schema version it expects has been recorded in
-- schema_migrations; it never creates or changes tables itself. Every statement here is safe to run
-- twice. Later changes go in new files (0002_..., 0003_...), each ending by recording its version,
-- and LATEST_SCHEMA_VERSION in server/admin/schema.js is raised to match.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

-- Sequential enquiry references: ROSS-0001, ROSS-0002, ...
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT OR IGNORE INTO counters (name, value) VALUES ('enquiry', 0);

CREATE TABLE IF NOT EXISTS enquiries (
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
);

CREATE INDEX IF NOT EXISTS enquiries_status ON enquiries (status);
CREATE INDEX IF NOT EXISTS enquiries_paid_on ON enquiries (paid_on);

CREATE TABLE IF NOT EXISTS enquiry_events (
  id INTEGER PRIMARY KEY,
  enquiry_id INTEGER NOT NULL REFERENCES enquiries (id),
  created_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS enquiry_events_enquiry ON enquiry_events (enquiry_id, id);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_login_failures (
  id INTEGER PRIMARY KEY,
  client_key TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_login_failures_key ON admin_login_failures (client_key, at);

INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (1, '0001_admin_phase_a', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
