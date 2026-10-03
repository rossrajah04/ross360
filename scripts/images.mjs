// Homepage image pipeline: `npm run images`
//
// Put original photographs in images/source/ (not committed; keep the originals elsewhere too).
// The file name is the image's key, e.g. hero.jpg, space-hospitality.jpg. Which key appears where on the
// homepage is set in src/content/media.js.
//
// Ordinary photographs are written to public/images/home/ as AVIF, WebP and JPEG at several widths.
// 360° images: name them pano-<name>.jpg (equirectangular, 2:1). They are written as JPEG textures for the
// interactive 360° preview, plus a flat perspective view of the same space (<name>-view) for the
// photography-versus-360° comparison. An optional pano-<name>.json beside it can set the view:
//   { "yaw": 0, "pitch": 0, "fov": 70 }   (degrees; yaw 0 is the centre of the image)
//
// Wide photographs that visitors drag sideways (the temporary "Step inside" and comparison views): name
// them wide-<name>.jpg. They are kept at larger widths, because they are shown taller than the screen
// is wide.
//
// The sizes and colours of everything generated are recorded in src/content/media.generated.json,
// which the site reads. Re-run this script after adding, replacing or removing a source image.

import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'images', 'source');
const outDir = join(root, 'public', 'images', 'home');
const manifestPath = join(root, 'src', 'content', 'media.generated.json');

const PHOTO_WIDTHS = [640, 1024, 1600, 2400];
const WIDE_WIDTHS = [1600, 2800, 4400];
const PANO_WIDTHS = [2048, 4096, 8192];
const VIEW = { width: 1600, height: 2000 };

const hex = ({ r, g, b }) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

async function writePhoto(input, name, steps = PHOTO_WIDTHS) {
  const image = sharp(input).rotate();
  const { width, height } = await image.metadata();
  const cap = steps[steps.length - 1];
  const widths = steps.filter((w) => w < width).concat(Math.min(width, cap));
  const unique = [...new Set(widths)].sort((a, b) => a - b);
  for (const w of unique) {
    const resized = sharp(input).rotate().resize({ width: w });
    await resized.clone().avif({ quality: 50, effort: 4 }).toFile(join(outDir, `${name}-${w}.avif`));
    await resized.clone().webp({ quality: 74 }).toFile(join(outDir, `${name}-${w}.webp`));
    await resized.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(join(outDir, `${name}-${w}.jpg`));
  }
  const { dominant } = await sharp(input).stats();
  const largest = unique[unique.length - 1];
  return { width: largest, height: Math.round((height / width) * largest), widths: unique, color: hex(dominant) };
}

// Renders a rectilinear (ordinary camera) view from an equirectangular image.
async function renderView(input, { yaw = 0, pitch = 0, fov = 70 }) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const out = Buffer.alloc(VIEW.width * VIEW.height * 3);
  const rad = Math.PI / 180;
  const aspect = VIEW.width / VIEW.height;
  const tanHalf = Math.tan((fov * rad) / 2);
  const [cy, sy, cp, sp] = [Math.cos(yaw * rad), Math.sin(yaw * rad), Math.cos(pitch * rad), Math.sin(pitch * rad)];
  for (let y = 0; y < VIEW.height; y++) {
    for (let x = 0; x < VIEW.width; x++) {
      const nx = ((x + 0.5) / VIEW.width) * 2 - 1;
      const ny = 1 - ((y + 0.5) / VIEW.height) * 2;
      let dx = nx * tanHalf * aspect;
      let dy = ny * tanHalf;
      let dz = -1;
      [dy, dz] = [dy * cp - dz * sp, dy * sp + dz * cp];
      [dx, dz] = [dx * cy + dz * sy, -dx * sy + dz * cy];
      const len = Math.hypot(dx, dy, dz);
      const lon = Math.atan2(dx, -dz);
      const lat = Math.asin(dy / len);
      const u = ((lon / (2 * Math.PI) + 0.5) % 1) * (W - 1);
      const v = (0.5 - lat / Math.PI) * (H - 1);
      // Bilinear sample
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const x1 = (x0 + 1) % W;
      const y1 = Math.min(y0 + 1, H - 1);
      const fx = u - x0;
      const fy = v - y0;
      for (let c = 0; c < 3; c++) {
        const a = data[(y0 * W + x0) * 3 + c] * (1 - fx) + data[(y0 * W + x1) * 3 + c] * fx;
        const b = data[(y1 * W + x0) * 3 + c] * (1 - fx) + data[(y1 * W + x1) * 3 + c] * fx;
        out[(y * VIEW.width + x) * 3 + c] = a * (1 - fy) + b * fy;
      }
    }
  }
  return sharp(out, { raw: { width: VIEW.width, height: VIEW.height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
}

async function writePano(input, name, file) {
  const { width, height } = await sharp(input).metadata();
  if (Math.abs(width / height - 2) > 0.02) throw new Error(`${file} is not a 2:1 equirectangular image.`);
  const widths = PANO_WIDTHS.filter((w) => w <= width);
  if (!widths.length) widths.push(width);
  for (const w of widths) {
    await sharp(input).resize({ width: w }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(outDir, `${name}-${w}.jpg`));
  }
  const settingsFile = join(sourceDir, `${parse(file).name}.json`);
  const settings = existsSync(settingsFile) ? JSON.parse(await readFile(settingsFile, 'utf8')) : {};
  const view = await writePhoto(await renderView(input, settings), `${name}-view`);
  const { dominant } = await sharp(input).stats();
  return { pano: { width: widths[widths.length - 1], widths, color: hex(dominant) }, view };
}

if (!existsSync(sourceDir)) {
  console.error('images/source/ not found. Add the original photographs there first.');
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const manifest = {};
const files = (await readdir(sourceDir)).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f)).sort();
for (const file of files) {
  const input = join(sourceDir, file);
  const key = parse(file).name.toLowerCase();
  if (key.startsWith('pano-')) {
    const name = key.slice(5);
    const { pano, view } = await writePano(input, `pano-${name}`, file);
    manifest[`pano-${name}`] = pano;
    manifest[`pano-${name}-view`] = view;
  } else if (key.startsWith('wide-')) {
    manifest[key] = await writePhoto(input, key, WIDE_WIDTHS);
  } else {
    manifest[key] = await writePhoto(input, key);
  }
  console.log('✓', file);
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${Object.keys(manifest).length} entries to src/content/media.generated.json`);
