-- ROSS 360 Admin, Phase C: customer quote links, availability and date requests (version 4).
--
-- Additive only: three new tables, their indexes and triggers. No existing table, column or trigger
-- is changed, and the code from version 3 keeps working against it. Apply after 0003, by hand, with:
--   npx wrangler d1 execute <database-name> --remote --file=migrations/0004_customer_links.sql
-- Every statement is safe to run twice. The file ends by recording version 4.

-- A customer link to a sent quote: /q/<token>. The token is the key id, this random link id and an
-- HMAC signature made with QUOTE_LINK_SECRET. Only the link id and key id are stored, never the
-- signature or the secret, so this table alone cannot produce a working link.
CREATE TABLE IF NOT EXISTS quote_links (
  id INTEGER PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes (id),
  link_id TEXT NOT NULL UNIQUE,
  key_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by TEXT,
  first_viewed_at TEXT,
  last_viewed_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS quote_links_quote ON quote_links (quote_id);
-- At most one working (not revoked) link per quote.
CREATE UNIQUE INDEX IF NOT EXISTS quote_links_one_active ON quote_links (quote_id) WHERE revoked_at IS NULL;

-- Dates ROSS 360 offers for capture. period: am (Morning) | pm (Afternoon) | day (Full day).
-- status: open | closed (checked in code, so later phases can add more).
CREATE TABLE IF NOT EXISTS availability_slots (
  id INTEGER PRIMARY KEY,
  slot_date TEXT NOT NULL, -- YYYY-MM-DD (UK date)
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  note TEXT NOT NULL DEFAULT '', -- internal; never shown to customers
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (slot_date, period)
);

CREATE INDEX IF NOT EXISTS availability_slots_date ON availability_slots (slot_date, status);

-- Overlap rule: on any date, the open slots are either one Full day, or Morning and/or Afternoon,
-- never both. The code checks this in the same statement that adds or reopens a slot; these triggers
-- are the backstop, so not even a bug or a hand-written SQL change can break it.
CREATE TRIGGER IF NOT EXISTS availability_slots_overlap_insert
BEFORE INSERT ON availability_slots
WHEN NEW.status = 'open' AND EXISTS (
  SELECT 1 FROM availability_slots s
  WHERE s.slot_date = NEW.slot_date AND s.status = 'open'
    AND ((NEW.period = 'day' AND s.period IN ('am', 'pm')) OR (NEW.period IN ('am', 'pm') AND s.period = 'day'))
)
BEGIN
  SELECT RAISE(ABORT, 'availability_overlap');
END;

CREATE TRIGGER IF NOT EXISTS availability_slots_overlap_update
BEFORE UPDATE OF status, period, slot_date ON availability_slots
WHEN NEW.status = 'open' AND EXISTS (
  SELECT 1 FROM availability_slots s
  WHERE s.id <> NEW.id AND s.slot_date = NEW.slot_date AND s.status = 'open'
    AND ((NEW.period = 'day' AND s.period IN ('am', 'pm')) OR (NEW.period IN ('am', 'pm') AND s.period = 'day'))
)
BEGIN
  SELECT RAISE(ABORT, 'availability_overlap');
END;

-- A customer's preferred date for a sent quote. Nothing is booked by it.
-- status: pending | replaced | withdrawn | closed (checked in code).
CREATE TABLE IF NOT EXISTS date_requests (
  id INTEGER PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes (id),
  slot_id INTEGER NOT NULL REFERENCES availability_slots (id),
  customer_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One pending request per quote; a new choice replaces the earlier one.
CREATE UNIQUE INDEX IF NOT EXISTS date_requests_one_pending ON date_requests (quote_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS date_requests_slot ON date_requests (slot_id, status);

-- The race guard: no pending request can be created against a slot that is not open, or moved back
-- to pending (or to another slot) unless that slot is open. A request and the closing of its slot are
-- each one transaction, so whichever commits first decides: a close first refuses the request.
CREATE TRIGGER IF NOT EXISTS date_requests_slot_open
BEFORE INSERT ON date_requests
WHEN NEW.status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM availability_slots WHERE id = NEW.slot_id AND status = 'open')
BEGIN
  SELECT RAISE(ABORT, 'slot_not_open');
END;

CREATE TRIGGER IF NOT EXISTS date_requests_slot_open_update
BEFORE UPDATE OF status, slot_id ON date_requests
WHEN NEW.status = 'pending'
  AND (OLD.status <> 'pending' OR NEW.slot_id <> OLD.slot_id)
  AND NOT EXISTS (SELECT 1 FROM availability_slots WHERE id = NEW.slot_id AND status = 'open')
BEGIN
  SELECT RAISE(ABORT, 'slot_not_open');
END;

INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (4, '0004_customer_links', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
