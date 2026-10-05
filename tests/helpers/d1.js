// A small stand-in for a Cloudflare D1 binding, backed by node:sqlite in memory.
// It implements the parts of the D1 API this project uses — prepare().bind().first()/all()/run()
// and batch() inside a transaction — so the real server code can be tested without Cloudflare.

import { DatabaseSync } from 'node:sqlite';

class Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    return new Statement(this.db, this.sql, params);
  }

  #prepared() {
    return this.db.prepare(this.sql);
  }

  async first(column) {
    const row = this.#prepared().get(...this.params);
    if (!row) return null;
    const plain = { ...row };
    return column === undefined ? plain : plain[column];
  }

  async all() {
    const statement = this.#prepared();
    // node:sqlite throws on .all() for statements that return nothing, so fall back to run().
    try {
      return { results: statement.all(...this.params).map((row) => ({ ...row })), success: true };
    } catch {
      statement.run(...this.params);
      return { results: [], success: true };
    }
  }

  async run() {
    return this.all();
  }
}

export class FakeD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  prepare(sql) {
    return new Statement(this.db, sql);
  }

  // D1 runs a batch as a single transaction, and so does this. Batches are queued one after
  // another, because D1 runs each batch as its own transaction rather than nesting them.
  async batch(statements) {
    const run = async () => {
      this.db.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        this.db.exec('COMMIT');
        return results;
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    };
    const queued = (this.queue || Promise.resolve()).then(run, run);
    // Keep the queue alive whether this batch succeeded or failed.
    this.queue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  close() {
    this.db.close();
  }
}

/** An env with the Admin configured. The password is only ever used inside these tests. */
export async function adminEnv(db, { email = 'admin@example.test', password = 'correct horse battery' } = {}) {
  const { derive } = await import('../../server/admin/auth.js');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 10000; // lower than production, to keep the tests quick
  const hash = await derive(password, salt, iterations);
  const b64 = (bytes) => Buffer.from(bytes).toString('base64');
  return {
    env: { DB: db, ADMIN_EMAIL: email, ADMIN_PASSWORD_HASH: `pbkdf2$${iterations}$${b64(salt)}$${b64(hash)}` },
    email,
    password,
  };
}

/** Build a request for the Admin API. */
export function adminRequest(path, { method = 'GET', body, cookie, origin = 'https://ross360.test' } = {}) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  return new Request(`${origin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Call the Admin API function the way Cloudflare Pages would, and return { status, data, headers }. */
export async function callAdmin(env, path, options = {}) {
  const { onRequest } = await import('../../functions/api/admin/[[route]].js');
  const request = adminRequest(path, options);
  const route = new URL(request.url).pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean);
  const response = await onRequest({ request, env, params: { route } });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: response.status, data, headers: response.headers };
}

/** The session cookie value from a sign-in response, ready to send back as Cookie. */
export function cookieFrom(headers) {
  const header = headers.get('Set-Cookie') || '';
  return header.split(';')[0];
}
