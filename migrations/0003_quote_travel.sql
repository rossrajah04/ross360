-- ROSS 360 Admin: travel calculated from mileage (version 3).
--
-- Additive only: seven new columns on `quotes`, each with a default, and one new trigger. No existing
-- column, table or trigger is changed, and the code from version 2 keeps working against it.
-- Apply after 0002, by hand, with:
--   npx wrangler d1 execute <database-name> --remote --file=migrations/0003_quote_travel.sql
--
-- Unlike 0001 and 0002, this file is NOT safe to run twice: SQLite cannot add a column only if it is
-- missing, so a second run stops at the first statement with "duplicate column name" and changes
-- nothing. Check first that version 3 is not already recorded:
--   SELECT version, name FROM schema_migrations ORDER BY version;

-- How the travel amount was arrived at. Internal only: never rendered, emailed or stored in the sent
-- snapshot; the customer sees only travel_pence, as one Travel line.
-- manual | mileage. Existing quotes are manual, exactly as before.
ALTER TABLE quotes ADD COLUMN travel_mode TEXT NOT NULL DEFAULT 'manual';
-- One-way driving distance in tenths of a mile (23.6 miles = 236), as entered.
ALTER TABLE quotes ADD COLUMN travel_one_way_tenths INTEGER;
-- The rule the amount was calculated with, recorded so a later change of rate never alters the
-- working of an existing quote: pence per chargeable mile, and free distance each way in tenths.
ALTER TABLE quotes ADD COLUMN travel_rate_pence INTEGER;
ALTER TABLE quotes ADD COLUMN travel_free_tenths INTEGER;
-- The amount the rule gives, in whole pence (always calculated on the server).
ALTER TABLE quotes ADD COLUMN travel_calculated_pence INTEGER;
-- 1 when travel_pence was entered by hand in place of the calculated amount, with the reason.
ALTER TABLE quotes ADD COLUMN travel_override INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN travel_override_reason TEXT NOT NULL DEFAULT '';

-- quotes_sent_content_locked (0002) lists the columns that existed then. The new ones are locked the
-- same way: once a quote is sent (or superseded), its travel working cannot be changed.
CREATE TRIGGER IF NOT EXISTS quotes_sent_travel_locked
BEFORE UPDATE OF travel_mode, travel_one_way_tenths, travel_rate_pence, travel_free_tenths,
  travel_calculated_pence, travel_override, travel_override_reason
ON quotes
WHEN OLD.status IN ('sent', 'superseded')
BEGIN
  SELECT RAISE(ABORT, 'A sent quote cannot be changed.');
END;

INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (3, '0003_quote_travel', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
