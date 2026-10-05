// After the Admin build, also write dist/admin.html.
// Cloudflare Pages then serves the Admin at /admin with no redirect, matching the rest of the
// site's no-trailing-slash URLs. The file is a copy of dist/admin/index.html, whose asset links
// are absolute (/admin/assets/...), so it works from either path.

import { copyFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const source = join(dist, 'admin', 'index.html');

try {
  await access(source);
} catch {
  console.error('dist/admin/index.html not found. Run `npm run build:admin` first.');
  process.exit(1);
}

await copyFile(source, join(dist, 'admin.html'));
console.log('Wrote dist/admin.html for the /admin URL.');
