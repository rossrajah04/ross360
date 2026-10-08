-- ROSS 360 Admin, Phase C: bookings and Stripe payments (version 5).
--
-- Additive only: three new tables, their indexes and triggers. No existing table, column or trigger
-- is changed: quote links and availability come from 0004_customer_links, and its date_requests table
-- and rows are kept as they are (no longer used by the code). Apply after 0004, by hand, with:
--   npx wrangler d1 execute <database-name> --remote --file=migrations/0005_bookings.sql
-- Every statement is safe to run twice. The file ends by recording version 5.

-- A booking of one slot for one sent quote.
-- status: holding (on Stripe Checkout until hold_expires_at) | expired (checkout not completed; slot
-- released) | confirmed (paid) | cancel_requested (customer asked within 48 hours; ROSS 360 decides)
-- | cancelled. plan: full | deposit. Money is in pence; total_pence is the quote total, travel included.
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes (id),
  slot_id INTEGER NOT NULL REFERENCES availability_slots (id),
  status TEXT NOT NULL,
  plan TEXT NOT NULL,
  total_pence INTEGER NOT NULL,
  deposit_pence INTEGER, -- the fixed deposit (deposit plan only)
  paid_pence INTEGER NOT NULL DEFAULT 0,
  refunded_pence INTEGER NOT NULL DEFAULT 0,
  retained_pence INTEGER NOT NULL DEFAULT 0, -- kept on a late cancellation, as ROSS 360 decided
  balance_due_on TEXT, -- UK date; the balance is due by the end of it (deposit plan only)
  reminder_14_on TEXT, -- UK date of each balance reminder that applies; NULL if it does not
  reminder_14_sent_at TEXT,
  reminder_8_on TEXT,
  reminder_8_sent_at TEXT,
  hold_expires_at TEXT,
  booked_on TEXT, -- UK date the booking was confirmed
  confirmed_at TEXT,
  cancel_requested_at TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT, -- customer | customer_late | unpaid_balance | ross360 | slot_unavailable
  cancelled_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (paid_pence >= 0 AND refunded_pence >= 0 AND retained_pence >= 0 AND refunded_pence <= paid_pence)
);

-- No two active bookings (a checkout in progress counts) on one slot, or for one quote. This is what
-- stops two customers booking the same slot: the second insert fails, whatever the timing.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_slot ON bookings (slot_id)
  WHERE status IN ('holding', 'confirmed', 'cancel_requested');
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_quote ON bookings (quote_id)
  WHERE status IN ('holding', 'confirmed', 'cancel_requested');
CREATE INDEX IF NOT EXISTS bookings_status ON bookings (status, balance_due_on);

-- A booking can only become active on (or move to) an open slot. Closing a slot with an active
-- booking is refused in code; together, a close and a booking cannot both succeed.
CREATE TRIGGER IF NOT EXISTS bookings_slot_open
BEFORE INSERT ON bookings
WHEN NEW.status IN ('holding', 'confirmed', 'cancel_requested')
  AND NOT EXISTS (SELECT 1 FROM availability_slots WHERE id = NEW.slot_id AND status = 'open')
BEGIN
  SELECT RAISE(ABORT, 'slot_not_open');
END;

CREATE TRIGGER IF NOT EXISTS bookings_slot_open_update
BEFORE UPDATE OF status, slot_id ON bookings
WHEN NEW.status IN ('holding', 'confirmed', 'cancel_requested')
  AND (OLD.status NOT IN ('holding', 'confirmed', 'cancel_requested') OR NEW.slot_id <> OLD.slot_id)
  AND NOT EXISTS (SELECT 1 FROM availability_slots WHERE id = NEW.slot_id AND status = 'open')
BEGIN
  SELECT RAISE(ABORT, 'slot_not_open');
END;

-- One Stripe Checkout payment for a booking. kind: full | deposit | balance.
-- status: open (Checkout session created or being created) | paid | expired | failed.
-- No card details are ever stored: only Stripe's ids.
CREATE TABLE IF NOT EXISTS booking_payments (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings (id),
  kind TEXT NOT NULL,
  amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
  status TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_session_url TEXT,
  stripe_payment_intent TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS booking_payments_booking ON booking_payments (booking_id);
-- At most one Checkout session open per booking at a time.
CREATE UNIQUE INDEX IF NOT EXISTS booking_payments_one_open ON booking_payments (booking_id) WHERE status = 'open';

-- A refund of (part of) one payment. status: pending (to be sent to Stripe, or sent with no answer
-- yet) | succeeded | failed (Stripe refused it; shown in the Admin to retry or settle by hand).
-- Retries reuse the same Stripe Idempotency-Key (refund-<id>), so a refund is never made twice.
CREATE TABLE IF NOT EXISTS booking_refunds (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings (id),
  payment_id INTEGER NOT NULL REFERENCES booking_payments (id),
  amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
  status TEXT NOT NULL,
  stripe_refund_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS booking_refunds_booking ON booking_refunds (booking_id);
CREATE INDEX IF NOT EXISTS booking_refunds_status ON booking_refunds (status);

INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (5, '0005_bookings', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
