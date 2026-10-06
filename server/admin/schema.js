// ROSS 360 Admin database schema check (Cloudflare D1, bound to the Pages project as `DB`).
//
// The schema is defined and versioned in migrations/*.sql and applied by hand (see README: Admin).
// The website never creates or changes tables. It only checks, read-only, that the database has
// the schema version this code expects, and refuses to run against anything older.

// Raise this when a new migration file is added, to the version that file records.
export const LATEST_SCHEMA_VERSION = 5;
export const FIRST_MIGRATION = 'migrations/0001_admin_phase_a.sql';
export const LATEST_MIGRATION = 'migrations/0005_quote_customer_type.sql';

export class SchemaNotReady extends Error {
  constructor(found) {
    super(
      found === null
        ? `The Admin database has no schema yet. Apply every file in migrations/, in order, from ${FIRST_MIGRATION} to ${LATEST_MIGRATION}.`
        : `The Admin database is at schema version ${found}; this code needs version ${LATEST_SCHEMA_VERSION}. Apply the newer files in migrations/, up to ${LATEST_MIGRATION}.`,
    );
    this.name = 'SchemaNotReady';
    this.found = found;
  }
}

// Remember a successful check for each database binding for the life of the worker instance.
// A failed check is not remembered, so it is retried once the migration has been applied.
const verified = new WeakSet();

export async function schemaVersion(db) {
  const table = await db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'`)
    .first();
  if (!table) return null;
  const row = await db.prepare(`SELECT MAX(version) AS version FROM schema_migrations`).first();
  return row?.version ?? null;
}

/** Throws SchemaNotReady unless the database is at the expected schema version. Read-only. */
export async function requireSchema(db) {
  if (verified.has(db)) return;
  const found = await schemaVersion(db);
  if (found === null || found < LATEST_SCHEMA_VERSION) throw new SchemaNotReady(found);
  verified.add(db);
}
