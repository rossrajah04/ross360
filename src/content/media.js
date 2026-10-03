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
//   wide-<name>.jpg        very wide photographs that visitors drag sideways (temporary stand-in for 360°)
//   pano-<name>.jpg        equirectangular 360° images (2:1). When pano-tour.jpg exists, "Step inside" and
//                          the comparison use a true 360° view instead of the wide photographs.
//
// TEMPORARY IMAGERY (October 2026): the current images are illustrative design assets cut from the
// ROSS 360 moodboard. They are not photographs of real premises and not ROSS 360 work. While
// `temporary` is true the page says "Illustrative" beside them and never describes them as projects.

import generated from './media.generated.json';

function resolve(slot) {
  const file = [].concat(slot.file).find((name) => generated[name]);
  return file ? { ...slot, file, data: generated[file] } : null;
}

const slots = {
  hero: { file: 'hero', alt: 'Hotel lounge with low lighting and large windows', temporary: true, position: '60% 55%' },

  // Step inside
  pano: { file: 'pano-tour', alt: 'A 360° view of an interior', temporary: true },
  tourWide: { file: 'wide-tour', alt: 'Open-plan living space with a kitchen and a view over trees', temporary: true },

  // Comparison: one photograph against the same space explored
  comparePhoto: {
    file: ['pano-tour-view', 'compare-photo'],
    alt: 'A single photograph of a restaurant, showing one view',
    temporary: true,
  },
  compareWide: { file: 'wide-compare', alt: 'The same restaurant seen along its full length', temporary: true },

  understandTall: { file: 'understand-tall', alt: 'Restaurant bar with shelving and an indoor tree', temporary: true },
  understandWide: { file: 'understand-wide', alt: 'Showroom with clothing rails and planting', temporary: true },

  spaceHospitality: { file: 'space-hospitality', alt: 'Restaurant interior with warm lighting', temporary: true },
  spaceFitness: { file: 'space-fitness', alt: 'Gym with racks and tall windows', temporary: true, position: '30% 50%' },
  spaceFitnessDetail: { file: 'space-fitness-detail', alt: 'Studio detail', temporary: true },
  spaceProperty: { file: 'space-property', alt: 'Kitchen with an island and pendant lights', temporary: true },

  typeRestaurant: { file: ['type-restaurant', 'space-hospitality'], alt: 'Restaurant interior', temporary: true },
  typeGym: { file: ['type-gym', 'space-fitness'], alt: 'Gym interior', temporary: true },
  typeHotel: { file: 'type-hotel', alt: 'Hotel reception and lounge', temporary: true },
  typeRetail: { file: 'type-retail', alt: 'Retail showroom', temporary: true },
  typeClinic: { file: 'type-clinic', alt: 'Quiet seating area', temporary: true },
  typeAgent: { file: 'type-agent', alt: 'Living room with a view', temporary: true },
  typeProperty: { file: ['type-property', 'space-property'], alt: 'Residential kitchen', temporary: true },
  typeDeveloper: { file: 'type-developer', alt: 'Living space opening onto a terrace', temporary: true },

  closing: { file: ['closing', 'type-hotel'], alt: '', temporary: true },
};

export const media = Object.fromEntries(Object.entries(slots).map(([key, slot]) => [key, resolve(slot)]));
