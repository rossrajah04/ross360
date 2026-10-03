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

  // Below the tour. Directly after it, on the same ground, so the tour is the visual for this point.
  why: {
    title: 'More than photographs.',
    text: 'A 360° virtual tour lets people move through a space themselves — understanding the layout, proportions and details before they visit.',
  },

  uses: [
    {
      title: 'Business',
      text: 'Give customers a better sense of your premises before they visit.',
      link: 'Business tours',
      to: '/businesses',
    },
    {
      title: 'Property',
      text: 'Let buyers, tenants and clients explore a property remotely before arranging a viewing.',
      link: 'Property tours',
      to: '/property',
    },
  ],

  receive: {
    title: 'What you receive',
    // Written for the homepage; replace with ROSS 360's own wording if preferred.
    text: 'A finished tour, delivered ready to use online.',
    items: [
      '360° photography',
      'Interactive virtual tour',
      'Website-ready embed',
      'Google Street View publication where appropriate',
    ],
    example: 'See the example tour',
  },

  pricing: {
    title: 'Business tours from £249',
    text: 'Straightforward pricing for professional 360° tours. Property projects are quoted individually.',
    view: 'View pricing',
    quote: 'Request a Quote',
  },

  closing: {
    title: 'Have a space worth exploring?',
    text: 'Request a quote for a professional 360° virtual tour.',
    cta: 'Request a Quote',
  },
};
