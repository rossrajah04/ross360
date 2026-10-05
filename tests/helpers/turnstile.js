// Test stand-in for Cloudflare Turnstile. The quote form refuses to store enquiries without
// Turnstile, so tests that use the database set a (fake) secret and answer siteverify here.

export const TEST_TURNSTILE_SECRET = 'turnstile-secret-not-real';
export const TEST_TURNSTILE_TOKEN = 'turnstile-token-not-real';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Wrap a fetch stub so Turnstile's siteverify answers `success` and everything else goes to `next`. */
export const withTurnstile = (next, { success = true } = {}) =>
  async (url, init) =>
    String(url) === SITEVERIFY
      ? new Response(JSON.stringify(success ? { success: true } : { success: false, 'error-codes': ['invalid-input-response'] }), {
          status: 200,
        })
      : next(url, init);
