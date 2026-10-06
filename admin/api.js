// Calls to the Admin API. The session cookie is sent automatically; nothing is kept in
// localStorage, so closing the browser leaves no admin data behind on the device.

const BASE = '/api/admin';

// Fired when the server says the session has ended (it expired, or was signed out elsewhere).
// App listens for it and returns to the sign-in screen.
export const SESSION_ENDED = 'ross360-admin:session-ended';

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
  // Any 401 except from the session check and sign-in themselves means the session has ended.
  if (response.status === 401 && path !== '/session') window.dispatchEvent(new Event(SESSION_ENDED));
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

  // Quotes (Phase B)
  quotes: (reference) => call(`/enquiries/${encodeURIComponent(reference)}/quotes`),
  createQuote: (reference) => call(`/enquiries/${encodeURIComponent(reference)}/quotes`, { method: 'POST', body: {} }),
  quote: (reference) => call(`/quotes/${encodeURIComponent(reference)}`),
  saveQuote: (reference, values) => call(`/quotes/${encodeURIComponent(reference)}`, { method: 'PATCH', body: values }),
  previewQuote: (reference) => call(`/quotes/${encodeURIComponent(reference)}/preview`),
  sendQuote: (reference, version, previewedOn) =>
    call(`/quotes/${encodeURIComponent(reference)}/send`, { method: 'POST', body: { version, previewedOn, confirm: true } }),
  checkSend: (reference) => call(`/quotes/${encodeURIComponent(reference)}/check-send`, { method: 'POST', body: { confirm: true } }),
  reviseQuote: (reference) => call(`/quotes/${encodeURIComponent(reference)}/revise`, { method: 'POST', body: {} }),
  discardQuote: (reference) => call(`/quotes/${encodeURIComponent(reference)}/discard`, { method: 'POST', body: {} }),

  // Customer links and availability (Phase C)
  customerLink: (reference) => call(`/quotes/${encodeURIComponent(reference)}/customer`),
  newLink: (reference) => call(`/quotes/${encodeURIComponent(reference)}/link/new`, { method: 'POST', body: { confirm: true } }),
  revokeLink: (reference) => call(`/quotes/${encodeURIComponent(reference)}/link/revoke`, { method: 'POST', body: { confirm: true } }),
  links: () => call('/links'),
  availability: () => call('/availability'),
  addSlot: (values) => call('/availability', { method: 'POST', body: values }),
  slotNote: (id, note) => call(`/availability/${id}`, { method: 'PATCH', body: { note } }),
  closeSlot: (slot, requests) =>
    call(`/availability/${slot.id}/close`, {
      method: 'POST',
      body: { requests, pendingCount: slot.pendingCount, pendingMaxId: slot.pendingMaxId },
    }),
  reopenSlot: (id) => call(`/availability/${id}/reopen`, { method: 'POST', body: {} }),
  closeDateRequest: (id) => call(`/date-requests/${id}/close`, { method: 'POST', body: {} }),
};

// The customer email of a quote, for the preview frame.
export const quotePreviewUrl = (reference, version) =>
  `${BASE}/quotes/${encodeURIComponent(reference)}/preview.html?v=${encodeURIComponent(version)}`;
