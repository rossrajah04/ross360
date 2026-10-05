// Calls to the Admin API. The session cookie is sent automatically; nothing is kept in
// localStorage, so closing the browser leaves no admin data behind on the device.

const BASE = '/api/admin';

async function call(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = { ok: false, message: 'The server sent an unexpected response.' };
  }
  return { status: response.status, ...data };
}

export const api = {
  session: () => call('/session'),
  signIn: (email, password) => call('/session', { method: 'POST', body: { email, password } }),
  signOut: () => call('/session', { method: 'DELETE' }),
  dashboard: () => call('/dashboard'),
  enquiries: ({ q = '', status = '' } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    const query = params.toString();
    return call(`/enquiries${query ? `?${query}` : ''}`);
  },
  enquiry: (reference) => call(`/enquiries/${encodeURIComponent(reference)}`),
  create: (values) => call('/enquiries', { method: 'POST', body: values }),
  update: (reference, values) => call(`/enquiries/${encodeURIComponent(reference)}`, { method: 'PATCH', body: values }),
  setStatus: (reference, status) =>
    call(`/enquiries/${encodeURIComponent(reference)}/status`, { method: 'POST', body: { status } }),
  addNote: (reference, text) =>
    call(`/enquiries/${encodeURIComponent(reference)}/notes`, { method: 'POST', body: { text } }),
};
