-- ROSS 360 Admin, Phase B: quotes (version 2).
--
-- Additive only: no Phase A table or column is changed. Apply after 0001, by hand, with:
--   npx wrangler d1 execute <database-name> --remote --file=migrations/0002_quotes.sql
-- or paste it into the database's Console in the Cloudflare dashboard. Every statement is safe to
-- run twice. The file ends by recording version 2.

-- Sequential quote references: Q-0001, Q-0002, ... (separate from the enquiry counter).
INSERT OR IGNORE INTO counters (name, value) VALUES ('quote', 0);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY,
  quote_number INTEGER NOT NULL UNIQUE,
  reference TEXT NOT NULL UNIQUE,
  enquiry_id INTEGER NOT NULL REFERENCES enquiries (id),
  revision_of INTEGER REFERENCES quotes (id),
  -- draft | sending | sent | superseded | discarded (checked in code, so later phases can add more)
  status TEXT NOT NULL DEFAULT 'draft',
  -- Raised on every saved change to a draft; a save or send naming an older version is refused.
  version INTEGER NOT NULL DEFAULT 1,
  package TEXT,
  -- Shown to the customer.
  customer_name TEXT NOT NULL DEFAULT '',
  customer_business TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_location TEXT NOT NULL DEFAULT '',
  service_description TEXT NOT NULL DEFAULT '',
  -- Never shown to the customer: not rendered, emailed or stored in the sent snapshot.
  internal_notes TEXT NOT NULL DEFAULT '',
  -- Money is whole pence. Subtotal and total are always calculated on the server.
  travel_pence INTEGER NOT NULL DEFAULT 0,
  discount_pence INTEGER NOT NULL DEFAULT 0,
  discount_label TEXT NOT NULL DEFAULT '',
  subtotal_pence INTEGER NOT NULL DEFAULT 0,
  total_pence INTEGER NOT NULL DEFAULT 0,
  valid_days INTEGER NOT NULL DEFAULT 14,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  previewed_version INTEGER,
  -- Set when sending starts and never changed once the quote is sent.
  issued_on TEXT,
  valid_until TEXT,
  sending_started_at TEXT,
  sent_at TEXT,
  sent_by TEXT,
  sent_to TEXT,
  sent_subject TEXT,
  sent_html TEXT,
  sent_text TEXT,
  sent_snapshot TEXT,
  resend_message_id TEXT
);

CREATE INDEX IF NOT EXISTS quotes_enquiry ON quotes (enquiry_id);
CREATE INDEX IF NOT EXISTS quotes_status ON quotes (status);
CREATE INDEX IF NOT EXISTS quotes_revision_of ON quotes (revision_of);

CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes (id),
  position INTEGER NOT NULL,
  kind TEXT NOT NULL, -- package | custom
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_pence INTEGER NOT NULL,
  amount_pence INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS quote_items_quote ON quote_items (quote_id, position);

-- A sent quote is a record of what the customer received. These triggers protect it even from a bug
-- in the code: once sent (or superseded), its content cannot be changed, its status can only move
-- from sent to superseded, and its line items cannot be added to or changed. Deleting rows is left
-- possible for the manual erasure procedure in the README.
CREATE TRIGGER IF NOT EXISTS quotes_sent_content_locked
BEFORE UPDATE OF quote_number, reference, enquiry_id, revision_of, version, package, customer_name,
  customer_business, customer_email, customer_location, service_description, internal_notes,
  travel_pence, discount_pence, discount_label, subtotal_pence, total_pence, valid_days, created_at,
  previewed_version, issued_on, valid_until, sending_started_at, sent_at, sent_by, sent_to,
  sent_subject, sent_html, sent_text, sent_snapshot, resend_message_id
ON quotes
WHEN OLD.status IN ('sent', 'superseded')
BEGIN
  SELECT RAISE(ABORT, 'A sent quote cannot be changed.');
END;

CREATE TRIGGER IF NOT EXISTS quotes_sent_status_locked
BEFORE UPDATE OF status ON quotes
WHEN OLD.status IN ('sent', 'superseded') AND NOT (OLD.status = 'sent' AND NEW.status = 'superseded')
BEGIN
  SELECT RAISE(ABORT, 'A sent quote cannot be changed.');
END;

CREATE TRIGGER IF NOT EXISTS quote_items_insert_draft_only
BEFORE INSERT ON quote_items
WHEN (SELECT status FROM quotes WHERE id = NEW.quote_id) <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Only a draft quote can be changed.');
END;

CREATE TRIGGER IF NOT EXISTS quote_items_update_draft_only
BEFORE UPDATE ON quote_items
WHEN (SELECT status FROM quotes WHERE id = OLD.quote_id) <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Only a draft quote can be changed.');
END;

INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (2, '0002_quotes', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
