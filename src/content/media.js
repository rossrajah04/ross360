// Homepage imagery: which photograph appears where.
//
// To add or replace an image:
//   1. put the original in images/source/ using the file name shown for its slot (e.g. hero.jpg);
//   2. run `npm run images`;
//   3. update the slot's alt text below, and set `temporary: false` once it is genuine ROSS 360 work.
// Layouts never change: a slot simply shows whichever photograph has that name.
//
// 360° images are equirectangular (2:1) and named pano-<name>.jpg. They power the interactive preview and
// the photography-versus-360° comparison.
//
// TEMPORARY IMAGERY: while `temporary` is true the image is a design asset, not ROSS 360 work. The work
// section then says so beside the images, and no image is described as a client project.

import generated from './media.generated.json';

// Resolves a slot to the first file name that has been generated, so a section still looks complete
// while only some photographs exist.
function resolve(slot) {
  const file = [].concat(slot.file).find((name) => generated[name]);
  return file ? { ...slot, file, data: generated[file] } : null;
}

const slots = {
  hero: { file: 'hero', alt: 'Interior with natural light', temporary: true, position: '50% 55%' },

  // "Step inside" and the comparison share one 360° image of a single space.
  pano: { file: 'pano-tour', alt: 'A 360° view of an interior', temporary: true },
  panoView: {
    file: 'pano-tour-view',
    alt: 'A single photograph of the same interior, taken from one position',
    temporary: true,
  },

  understandWide: { file: ['understand-wide', 'space-property'], alt: 'Interior space', temporary: true },
  understandTall: { file: ['understand-tall', 'space-hospitality'], alt: 'Interior detail', temporary: true },

  spaceHospitality: { file: 'space-hospitality', alt: 'Restaurant interior', temporary: true },
  spaceFitness: { file: 'space-fitness', alt: 'Gym interior', temporary: true },
  spaceFitnessDetail: { file: ['space-fitness-detail', 'space-fitness'], alt: 'Studio detail', temporary: true },
  spaceProperty: { file: 'space-property', alt: 'Residential interior', temporary: true },

  typeRestaurant: { file: ['type-restaurant', 'space-hospitality'], alt: 'Restaurant interior', temporary: true },
  typeGym: { file: ['type-gym', 'space-fitness'], alt: 'Gym or studio interior', temporary: true },
  typeHotel: { file: ['type-hotel', 'understand-tall', 'hero'], alt: 'Hotel interior', temporary: true },
  typeRetail: { file: ['type-retail', 'understand-wide'], alt: 'Retail or showroom interior', temporary: true },
  typeClinic: { file: ['type-clinic', 'space-fitness-detail'], alt: 'Clinic interior', temporary: true },
  typeAgent: { file: ['type-agent', 'space-property'], alt: 'Residential interior', temporary: true },
  typeProperty: { file: ['type-property', 'pano-tour-view', 'space-property'], alt: 'Property interior', temporary: true },
  typeDeveloper: { file: ['type-developer', 'understand-wide'], alt: 'New development interior', temporary: true },

  closing: { file: ['closing', 'understand-wide', 'hero'], alt: '', temporary: true },
};

export const media = Object.fromEntries(Object.entries(slots).map(([key, slot]) => [key, resolve(slot)]));
