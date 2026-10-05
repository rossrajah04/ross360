// The Admin app returns to the sign-in screen whenever the API says the session has ended.

import { test } from 'node:test';
import assert from 'node:assert/strict';

test('a 401 from any Admin API call except the session itself signals that the session ended', async () => {
  const fired = [];
  globalThis.window = new EventTarget();
  const { api, SESSION_ENDED } = await import('../admin/api.js');
  window.addEventListener(SESSION_ENDED, () => fired.push('ended'));
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"ok":false,"message":"Please sign in."}', { status: 401 });
  try {
    await api.session();
    await api.signIn('a@b.test', 'wrong');
    assert.equal(fired.length, 0, 'checking or signing in is not an ended session');

    await api.dashboard();
    await api.enquiries({ status: 'new' });
    await api.enquiry('ROSS-0001');
    assert.equal(fired.length, 3);
  } finally {
    globalThis.fetch = original;
    delete globalThis.window;
  }
});
