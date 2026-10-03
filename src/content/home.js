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

  // Directly after the tour: why it matters.
  explore: {
    title: 'Let people explore before they arrive.',
    text: 'A 360° tour gives customers, clients, buyers and tenants a clearer sense of a space before they visit.',
  },

  delivers: {
    title: 'What ROSS 360 delivers',
    items: [
      '360° photography',
      'Interactive virtual tour',
      'Website integration',
      'Google Street View where appropriate',
    ],
  },

  spaces: {
    title: 'Built for business & property',
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
    title: 'From capture to tour',
    steps: [
      { title: 'Capture', text: 'We photograph the agreed space in 360°.' },
      { title: 'Build', text: 'The imagery is processed and assembled into an interactive tour.' },
      { title: 'Deliver', text: 'Your finished tour is ready to share, embed and use online.' },
    ],
  },

  pricing: {
    title: 'Pricing',
    // Package names, starting prices and the property line come from pricing.js.
    link: 'View pricing',
  },

  about: {
    title: site.brand,
    lead: 'Professional 360° photography and virtual tours for businesses and property.',
    text: 'ROSS 360 creates interactive virtual tours that allow people to explore physical spaces online before they visit.',
    link: 'About ROSS 360',
  },

  closing: {
    title: 'Ready to show people your space?',
    cta: 'Request a Quote',
  },
};
