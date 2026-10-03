// Homepage wording. Supplied by ROSS 360 for the homepage redesign (3 October 2026); use it as written.
// Headings are stored in sentence case; the homepage styles set some of them in capitals.
// Images are assigned in src/content/media.js. The example tour is configured in src/content/site.js.

import { site } from './site.js';

export const home = {
  hero: {
    title: site.descriptor,
    lead: 'Professional 360° photography and interactive virtual tours.',
  },

  tour: {
    title: 'Step inside',
    text: 'Explore an interactive 360° tour and experience how customers, clients, buyers and tenants can view a space online before visiting.',
    open: 'Open full tour',
    hint: 'Drag to look around',
    illustrative: 'Illustrative 360° preview',
    demoNote: 'This is a demonstration tour.',
  },

  understanding: {
    title: 'We turn physical spaces into interactive digital experiences.',
    text: 'ROSS 360 creates professional 360° photography and interactive virtual tours for commercial premises and property.',
  },

  // Work. While the images are temporary this is a collection of spaces, not a portfolio: no project or
  // client is named or implied, and the note below says the imagery is illustrative.
  // When a genuine project is ready: add its photographs (media.js), set temporary: false, and add tourUrl.
  work: {
    title: 'Spaces',
    note: 'Illustrative imagery. Client projects will be added to the portfolio as they are completed.',
    imageLabel: 'Illustrative image',
    link: 'Explore space',
    items: [
      { sector: 'Hospitality', type: 'Restaurant / Café', media: ['spaceHospitality'], tourUrl: '' },
      { sector: 'Fitness', type: 'Gym / Studio', media: ['spaceFitness', 'spaceFitnessDetail'], tourUrl: '' },
      { sector: 'Property', type: 'Residential / Commercial', media: ['spaceProperty'], tourUrl: '' },
    ],
  },

  compare: {
    title: 'A more complete view',
    photo: { label: 'Traditional photography', text: 'Photography shows selected views.' },
    tour: { label: '360° tour', text: 'A 360° tour allows visitors to explore the space themselves.' },
  },

  spaces: {
    title: 'Built for spaces that need to be experienced.',
    items: [
      { label: 'Restaurant', to: '/businesses', media: 'typeRestaurant' },
      { label: 'Gym / Studio', to: '/businesses', media: 'typeGym' },
      { label: 'Hotel / Venue', to: '/businesses', media: 'typeHotel' },
      { label: 'Retail / Showroom', to: '/businesses', media: 'typeRetail' },
      { label: 'Clinic', to: '/businesses', media: 'typeClinic' },
      { label: 'Estate Agent', to: '/property', media: 'typeAgent' },
      { label: 'Property', to: '/property', media: 'typeProperty' },
      { label: 'Developer', to: '/property', media: 'typeDeveloper' },
    ],
  },

  process: {
    title: 'From space to online',
    steps: [
      { title: 'Discover', text: 'We understand the space and what needs to be captured.' },
      { title: 'Photograph', text: '360° photography is captured throughout the agreed areas.' },
      { title: 'Produce', text: 'The imagery is processed and assembled into an interactive tour.' },
      { title: 'Publish', text: 'Where required, the tour can be prepared for Google Street View.' },
      {
        title: 'Deliver',
        text: 'You receive the finished tour, shareable URL and website integration information.',
      },
    ],
  },

  pricing: {
    title: 'Business tours',
    property: 'Property projects are individually quoted based on size, location and requirements.',
    link: 'View pricing',
  },

  closing: {
    title: 'Ready to show people your space?',
    cta: 'Request a Quote',
    note: 'Business & property projects · UK-wide',
  },
};
