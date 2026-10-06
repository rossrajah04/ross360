-- ROSS 360 Admin: who a quote is for (version 6).
--
-- Additive only: one new column on `quotes` and one new trigger. Apply after 0005, by hand, with:
--   npx wrangler d1 execute <database-name> --remote --file=migrations/0006_quote_customer_type.sql
--
-- Like 0003, this file is NOT safe to run twice: a second run stops at the first statement with
-- "duplicate column name" and changes nothing. Check first that version 6 is not already recorded:
--   SELECT version, name FROM schema_migrations ORDER BY version;

-- business | consumer, chosen by the administrator on each quote (NULL until chosen; a quote cannot
-- be sent without it). Only 'business' quotes can be booked and paid online. It is copied into the
-- sent snapshot, which is what the customer's page reads.
ALTER TABLE quotes ADD COLUMN customer_type TEXT CHECK (customer_type IS NULL OR customer_type IN ('business', 'consumer'));

CREATE TRIGGER IF NOT EXISTS quotes_sent_customer_type_locked
BEFORE UPDATE OF customer_type
ON quotes
WHEN OLD.status IN ('sent', 'superseded')
BEGIN
  SELECT RAISE(ABORT, 'A sent quote cannot be changed.');
END;

INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (6, '0006_quote_customer_type', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
