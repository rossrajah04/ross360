// Build-time prerender: gives every route its own HTML file with the correct <title>,
// meta description, canonical URL, social tags and JSON-LD already in the page source.
// The React app still renders the page content in the browser as normal.
//
// Runs after `vite build` (see "build" in package.json). Output on Cloudflare Pages:
//   dist/index.html, dist/virtual-tours.html, ... and dist/404.html
// Cloudflare Pages serves dist/virtual-tours.html at /virtual-tours (no trailing slash), which matches the
// canonical URLs and sitemap. A folder with index.html would instead redirect /virtual-tours to /virtual-tours/.
// With a 404.html present, Cloudflare Pages serves it (with a 404 status) for unknown URLs.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, canonicalFor, jsonLdFor, shareImage } from '../src/content/seo.js';
import { site } from '../src/content/site.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const templatePath = join(dist, 'index.html');

if (!existsSync(templatePath)) {
  console.error('dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

const template = await readFile(templatePath, 'utf8');
const startMarker = '<!--seo:start-->';
const endMarker = '<!--seo:end-->';
const start = template.indexOf(startMarker);
const end = template.indexOf(endMarker);

if (start === -1 || end === -1 || end < start) {
  console.error('SEO markers missing from dist/index.html.');
  process.exit(1);
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Prevents "</script>" in JSON from ending the script block early.
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function headFor(key) {
  const page = pages[key];
  const url = canonicalFor(page.path);
  const lines = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
  ];
  if (page.noindex) {
    lines.push('<meta name="robots" content="noindex" />');
  } else {
    lines.push(`<link rel="canonical" href="${url}" />`);
  }
  lines.push(
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escapeHtml(site.brand)}" />`,
    '<meta property="og:locale" content="en_GB" />',
    `<meta property="og:image" content="${site.url}${shareImage.path}" />`,
    `<meta property="og:image:width" content="${shareImage.width}" />`,
    `<meta property="og:image:height" content="${shareImage.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(shareImage.alt)}" />`,
  );
  if (!page.noindex) lines.push(`<meta property="og:url" content="${url}" />`);
  lines.push('<meta name="twitter:card" content="summary_large_image" />');
  for (const item of jsonLdFor(key)) {
    lines.push(`<script type="application/ld+json" data-seo-ld="true">${safeJson(item)}</script>`);
  }
  return lines.join('\n    ');
}

function render(key) {
  return (
    template.slice(0, start + startMarker.length) +
    '\n    ' +
    headFor(key) +
    '\n    ' +
    template.slice(end)
  );
}

let count = 0;
for (const [key, page] of Object.entries(pages)) {
  if (key === 'notFound') {
    await writeFile(join(dist, '404.html'), render(key));
  } else if (page.path === '/') {
    await writeFile(templatePath, render(key));
  } else {
    const file = join(dist, `${page.path.replace(/^\//, '')}.html`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, render(key));
  }
  count += 1;
}

// sitemap.xml is generated from the same page list, so it always matches the routes.
const urls = Object.values(pages)
  .filter((page) => !page.noindex)
  .map((page) => `  <url><loc>${canonicalFor(page.path)}</loc></url>`)
  .join('\n');
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

console.log(`Prerendered head metadata for ${count} routes and generated sitemap.xml.`);
