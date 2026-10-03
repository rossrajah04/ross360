// Homepage imagery: the opening and closing photographs.
//
// To replace an image:
//   1. put the original in images/source/ using the slot's file name (hero.jpg, closing.jpg);
//   2. run `npm run images`;
//   3. update the slot's alt text below.
// The homepage deliberately shows no other spaces: the Step inside tour (src/content/site.js) is the one
// example, and completed projects belong on the Portfolio page.
//
// TEMPORARY IMAGERY (October 2026): both photographs are illustrative design assets cut from the
// ROSS 360 moodboard. They are not photographs of real premises and not ROSS 360 work.

import generated from './media.generated.json';

function resolve(slot) {
  const file = [].concat(slot.file).find((name) => generated[name]);
  return file ? { ...slot, file, data: generated[file] } : null;
}

const slots = {
  hero: { file: 'hero', alt: 'Hotel lounge with low lighting and large windows', temporary: true, position: '60% 55%' },
  closing: { file: 'closing', alt: '', temporary: true },
};

export const media = Object.fromEntries(Object.entries(slots).map(([key, slot]) => [key, resolve(slot)]));
