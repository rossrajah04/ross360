import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proposed online-booking wording in the Terms and Privacy notice (src/content/legalPreview.js):
// shown on Cloudflare Pages preview builds (any branch except main), never on main (Production).
// PREVIEW_LEGAL_WORDING=1 turns it on for a local build.
const branch = process.env.CF_PAGES_BRANCH;
const previewLegalWording = (Boolean(branch) && branch !== 'main') || process.env.PREVIEW_LEGAL_WORDING === '1';

// Standard Vite + React setup. Output goes to /dist, which is what Cloudflare Pages serves.
export default defineConfig({
  plugins: [react()],
  define: {
    __PREVIEW_LEGAL_WORDING__: JSON.stringify(previewLegalWording),
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
