// Response helpers for the Admin API. Nothing from the Admin may be cached or indexed.

export const ADMIN_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...ADMIN_HEADERS, ...extraHeaders },
  });

// A request body must be a JSON object (or empty). Anything else, such as null, an array or a bare
// value, is refused, so the caller answers 400 rather than failing later.
export const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export async function readJson(request, maxChars = 20000) {
  const raw = await request.text();
  if (raw.length > maxChars) throw new Error('too large');
  if (!raw) return {};
  const body = JSON.parse(raw);
  if (!isPlainObject(body)) throw new Error('not an object');
  return body;
}

// Writes must come from a page on the same site. Browsers always send Origin on POST/PATCH/DELETE,
// so a missing Origin on a write is refused too.
export function sameOriginWrite(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
