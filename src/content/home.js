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

  // Below the tour.
  create: {
    title: '360° virtual tours, produced for your space.',
    text: 'We photograph your premises in 360° and produce an interactive virtual tour that customers, clients, buyers and tenants can explore online.',
    items: ['360° Photography', 'Interactive Virtual Tour', 'Website Integration', 'Google Street View'],
  },

  process: {
    title: 'From photography to finished tour.',
    steps: [
      { title: 'Capture', text: 'We photograph the agreed areas of your space in 360°.' },
      { title: 'Produce', text: 'Your imagery is processed and assembled into an interactive virtual tour.' },
      {
        title: 'Deliver',
        text: 'You receive a finished tour ready to share, embed on your website and, where appropriate, publish to Google Street View.',
      },
    ],
  },

  // Package names and prices come from pricing.js; these short descriptions are for the homepage.
  pricing: {
    title: 'Business 360° tours',
    plans: {
      essential: { text: 'For smaller premises and straightforward tours.' },
      professional: { text: 'For larger spaces requiring a more comprehensive tour.' },
      bespoke: { text: 'For larger or more complex premises.', plus: true },
    },
    property: 'Property projects are individually quoted based on size, location and requirements.',
    cta: 'Request a Quote',
    link: 'Full pricing details',
  },

  about: {
    title: site.brand,
    lead: 'Professional 360° photography and virtual tours for businesses and property.',
    // Written for the homepage; replace with ROSS 360's own wording if preferred.
    text: 'ROSS 360 photographs commercial premises and properties in 360° and produces interactive virtual tours that can be shared online, embedded on a website and, where appropriate, published to Google Street View.',
    link: 'About ROSS 360',
  },

  closing: {
    title: 'Give people a better way to understand your space.',
    text: 'Request a quote for a professional 360° virtual tour.',
    cta: 'Request a Quote',
  },
};
