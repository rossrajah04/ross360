// Homepage wording. Supplied by ROSS 360 for the homepage redesign (3 October 2026); use it as written.
// Headings are stored in sentence case; the homepage styles set some of them in capitals.
// Images are assigned in src/content/media.js. The Step inside tour is configured in src/content/site.js.

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
    // Shown in the tour frame until the Panoee tour is set in site.exampleTour.
    placeholderLabel: '360° virtual tour',
    placeholder: 'The interactive tour will be embedded here.',
    demoNote: 'This is a demonstration tour.',
  },

  understanding: {
    title: 'We turn physical spaces into interactive digital experiences.',
    text: 'ROSS 360 creates professional 360° photography and interactive virtual tours for commercial premises and property.',
    // From "What you receive" (services.js), as written.
    provides: [
      'Professional 360° photography',
      'Interactive tour production',
      'Website embed capability',
      'Google Street View publishing where appropriate and separately authorised',
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
      { label: 'Restaurants', to: '/businesses' },
      { label: 'Gyms & Studios', to: '/businesses' },
      { label: 'Hotels & Venues', to: '/businesses' },
      { label: 'Retail & Showrooms', to: '/businesses' },
      { label: 'Clinics', to: '/businesses' },
      { label: 'Estate Agents', to: '/property' },
      { label: 'Property Professionals', to: '/property' },
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
    label: 'Pricing',
    title: 'Business tours',
    property: 'Property projects are individually quoted based on size, location and requirements.',
    link: 'View pricing',
  },

  about: {
    title: site.brand,
    text: 'Professional 360° photography and virtual tours for businesses and property.',
    link: 'About ROSS 360',
  },

  closing: {
    title: 'Ready to show people your space?',
    cta: 'Request a Quote',
    note: 'Business & property projects · UK-wide',
  },
};
