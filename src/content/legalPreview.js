// Whether this build shows the proposed online-booking wording in the Terms and Privacy notice.
//
// ROSS 360 approved the business payment and cancellation wording for Preview testing only (6 October
// 2026). It stays out of Production until ROSS 360 has reviewed it and the consumer wording has had
// legal review. vite.config.js turns it on for Cloudflare Pages builds of any branch other than main
// (the Production branch), and never for main, so merging this code does not publish the wording.
// To publish once approved: make the approved wording the only wording in terms.js and privacy.js,
// and delete this file.
/* global __PREVIEW_LEGAL_WORDING__ */
export const previewLegalWording = typeof __PREVIEW_LEGAL_WORDING__ !== 'undefined' && __PREVIEW_LEGAL_WORDING__ === true;
