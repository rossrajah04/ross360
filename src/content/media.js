// Homepage imagery: which photograph appears where.
//
// To add or replace an image:
//   1. put the original in images/source/ using the file name for its slot (e.g. hero.jpg);
//   2. run `npm run images`;
//   3. update the slot's alt text below, and set `temporary: false` once it is genuine ROSS 360 work.
// Layouts never change: a slot shows the first of its file names that exists.
//
// Kinds of image:
//   ordinary photographs   any name, e.g. hero.jpg
//   wide-<name>.jpg        very wide photographs, kept at larger widths
//   pano-<name>.jpg        equirectangular 360° images (2:1). When pano-tour.jpg exists, the comparison uses
//                          an interactive 360° view, and so does "Step inside" until a Panoee tour is set.
//
// TEMPORARY IMAGERY (October 2026): the current images are illustrative design assets cut from the
// ROSS 360 moodboard. They are not photographs of real premises and not ROSS 360 work. While
// `temporary` is true the page labels them "Illustrative" and never describes them as projects or tours.

import generated from './media.generated.json';

function resolve(slot) {
  const file = [].concat(slot.file).find((name) => generated[name]);
  return file ? { ...slot, file, data: generated[file] } : null;
}

const slots = {
  hero: { file: 'hero', alt: 'Hotel lounge with low lighting and large windows', temporary: true, position: '60% 55%' },

  // Step inside. A Panoee tour (site.exampleTour) or a pano-tour image takes the place of the still.
  pano: { file: 'pano-tour', alt: 'A 360° view of an interior', temporary: true },
  tourStill: {
    file: 'wide-tour',
    alt: 'Open-plan living space with a view over trees',
    temporary: true,
    position: '30% 70%',
  },

  understanding: { file: 'understand-wide', alt: 'Showroom with clothing rails and planting', temporary: true },

  // Comparison: one photograph of a space against the whole space. A pano-tour image replaces the
  // right-hand still with the interactive 360° view, and its flat view replaces the photograph.
  comparePhoto: {
    file: ['pano-tour-view', 'compare-photo'],
    alt: 'A single photograph of a restaurant bar, showing one view',
    temporary: true,
  },
  compareSpace: { file: 'wide-compare', alt: 'The same restaurant seen along its full length', temporary: true },

  // Spaces we photograph. Each image is used once on the page.
  spaceHospitality: {
    file: 'space-hospitality',
    alt: 'Restaurant interior with warm lighting',
    temporary: true,
    position: '50% 75%',
  },
  spaceFitness: { file: 'space-fitness', alt: 'Gym with racks and tall windows', temporary: true, position: '30% 50%' },
  spaceProperty: { file: 'space-property', alt: 'Kitchen with an island and pendant lights', temporary: true },

  closing: { file: 'closing', alt: '', temporary: true },
};

export const media = Object.fromEntries(Object.entries(slots).map(([key, slot]) => [key, resolve(slot)]));
