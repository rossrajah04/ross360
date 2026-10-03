// Homepage content and image slots. Wording supplied by ROSS 360 for the homepage redesign (3 October 2026).
// Use it as written. Headings are stored in sentence case; the homepage styles set some of them in capitals.
//
// Images: every `image: null` renders a plain, clearly labelled placeholder so a temporary area is never
// mistaken for ROSS 360 work. Use genuine ROSS 360 photography only. Put the file in /public/images/ and set
//   image: { src: '/images/name.jpg', alt: 'What the photograph shows', width: 2400, height: 1600 }
// The example tour itself is configured in src/content/site.js (exampleTour.embedUrl / openUrl).

import { site } from './site.js';

export const home = {
  hero: {
    label: site.brand,
    title: site.descriptor,
    lead: 'Professional 360° photography and interactive virtual tours.',
    scroll: 'Scroll to explore',
    // Architectural or interior photograph, landscape, at least 2400px wide. Shown full screen.
    image: null,
    spec: 'Hero photograph · architectural interior · landscape',
  },

  tour: {
    title: 'Step inside',
    text: 'Explore an interactive 360° tour and experience how customers, clients, buyers and tenants can view a space online before visiting.',
    open: 'Open full tour',
    demoNote: 'This is a demonstration tour.',
  },

  statement: {
    title: 'We turn physical spaces into interactive digital experiences.',
    text: 'ROSS 360 creates professional 360° photography and interactive virtual tours for commercial premises and property.',
  },

  // Selected work. These are sector slots, not projects: no client is named or implied.
  // When a genuine project is ready, add its image and tour URL; "Explore space" appears only with a tourUrl.
  work: {
    title: 'Selected work',
    note: 'Client projects will be added to the portfolio as they are completed.',
    link: 'Explore space',
    items: [
      {
        sector: 'Hospitality',
        type: 'Restaurant / Café',
        layout: 'full',
        image: null,
        tourUrl: '',
        spec: 'Hospitality interior · landscape',
      },
      {
        sector: 'Fitness',
        type: 'Gym / Studio',
        layout: 'right',
        image: null,
        tourUrl: '',
        spec: 'Gym or studio interior · landscape',
      },
      {
        sector: 'Property',
        type: 'Residential / Commercial',
        layout: 'left',
        image: null,
        tourUrl: '',
        spec: 'Property interior · landscape',
      },
    ],
  },

  view: {
    title: 'A more complete view',
    photo: {
      label: 'Traditional photography',
      text: 'Photography shows selected views.',
      image: null,
      spec: 'Single photograph · portrait crop',
    },
    tour: {
      label: '360° tour',
      text: 'A 360° tour allows visitors to look around the space themselves.',
      // An equirectangular 360° image (2:1). It pans slowly and loops, as if looking around the room.
      image: null,
      spec: 'Equirectangular 360° image · 2:1',
    },
  },

  audience: {
    title: 'Built for spaces that need to be experienced.',
    items: [
      { label: 'Restaurants', to: '/businesses' },
      { label: 'Gyms & studios', to: '/businesses' },
      { label: 'Hotels & venues', to: '/businesses' },
      { label: 'Retail & showrooms', to: '/businesses' },
      { label: 'Clinics', to: '/businesses' },
      { label: 'Estate agents', to: '/property' },
      { label: 'Property professionals', to: '/property' },
      { label: 'Developers', to: '/property' },
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

  about: {
    title: site.brand,
    text: 'Professional 360° photography and virtual tours for businesses and property.',
    link: 'About ROSS 360',
    // Founder or company image, portrait.
    image: null,
    spec: 'Founder or company photograph · portrait',
  },

  closing: {
    title: 'Ready to show people your space?',
    cta: 'Request a Quote',
    note: 'Business & property projects · UK-wide',
  },
};
