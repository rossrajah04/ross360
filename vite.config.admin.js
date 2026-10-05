import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate build for the private Admin app. It is kept apart from the public site's build so the
// public bundle, prerendered pages and sitemap are completely unaffected.
// Output: dist/admin/ (Cloudflare Pages serves dist/admin/index.html at /admin).
export default defineConfig({
  root: 'admin',
  base: '/admin/',
  plugins: [react()],
  build: {
    outDir: '../dist/admin',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
  },
});
