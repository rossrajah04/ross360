// Virtual Tours page wording. Body copy is the wording supplied by ROSS 360 (3 October 2026), shared
// with src/content/services.js and src/content/home.js. Section headings marked "written for this page"
// can be replaced with ROSS 360's own wording.

import { home } from './home.js';

export const virtualTours = {
  intro: {
    title: '360° Virtual Tours',
    lead: 'Interactive photography that allows visitors to explore a space online.',
    open: 'Open full tour',
  },

  // Written for this page.
  how: {
    title: 'How a virtual tour works',
    text: 'A ROSS 360 virtual tour combines high-resolution 360° photography with an interactive interface, allowing visitors to move between viewpoints and examine the premises from different positions.',
  },

  // Written for this page (heading only).
  included: { title: 'What is included' },

  // Written for this page (heading only).
  uses: { title: 'Where it can be used' },

  // Written for this page (heading and column titles).
  compare: {
    title: 'Photographs, Google Street View and a virtual tour',
    photos: [
      'Traditional photographs show selected views. A 360° tour allows a visitor to look around the space themselves.',
      'This can be particularly useful for businesses and property where the layout, size and condition of the premises are important to the decision being made.',
    ],
    tourTitle: 'ROSS 360 virtual tour',
    streetViewTitle: 'Google Street View',
  },

  // Written for this page (heading only).
  process: { title: 'What happens after you enquire' },

  // Written for this page (heading and the pricing link title).
  next: {
    title: 'Where to go next',
    links: [
      { title: 'Business tours', text: home.uses[0].text, to: '/businesses' },
      { title: 'Property tours', text: home.uses[1].text, to: '/property' },
      { title: 'Pricing', text: home.pricing.text, to: '/pricing' },
    ],
  },
};
