// Virtual Tours page wording. Supplied by ROSS 360 (3 October 2026) unless marked "written for this page";
// those lines can be replaced with ROSS 360's own wording.
// Hosting is not part of the ROSS 360 offer: the customer receives the finished tour with its shareable
// URL and website embed, and Google Street View is hosted by Google.

import { tourVsStreetView } from './services.js';

export const virtualTours = {
  intro: {
    title: '360° Virtual Tours',
    lead: 'An interactive 360° tour that lets visitors explore a space online.',
    open: 'Open full tour',
  },

  // Written for this page.
  how: {
    title: 'How a virtual tour works',
    text: 'A ROSS 360 virtual tour combines high-resolution 360° photography with an interactive interface, allowing visitors to move between viewpoints and examine the premises from different positions.',
  },

  compare: {
    title: 'One experience, different ways to explore',
    text: 'Traditional photographs show selected views of a space. A 360° virtual tour allows visitors to look around for themselves and move between connected viewpoints.',
    // Written for this page, from the facts in services.js and site.js.
    items: [
      {
        title: 'Traditional photography',
        text: 'Still images of selected views, chosen and framed in advance.',
      },
      {
        title: 'ROSS 360 virtual tour',
        text: 'Connected 360° viewpoints that visitors move between at their own pace, shared by link or embedded on your website.',
      },
      {
        title: 'Google Street View',
        text: '360° imagery published through Google Maps where appropriate and authorised, hosted by Google and subject to its requirements.',
      },
    ],
    note: tourVsStreetView.note,
  },

  why: {
    title: 'Why ROSS 360',
    items: [
      {
        title: 'Professional capture',
        text: 'Your space is photographed carefully in 360° to create a consistent, high-quality experience.',
      },
      {
        title: 'Built around your space',
        text: 'Each tour is produced around the areas and requirements agreed for your project.',
      },
      {
        title: 'Ready to use online',
        text: 'Your finished tour can be shared directly, embedded into your website and, where appropriate, prepared for Google Street View.',
      },
      {
        title: 'A complete service',
        text: 'From photography through to the finished interactive tour, we handle the production process from capture to delivery.',
      },
    ],
  },

  // Heading written for this page. The list is the supplied "What you receive" list without hosting.
  included: {
    title: 'What is included',
    items: [
      'Professional 360° photography',
      'Interactive tour production',
      'Agreed areas captured and connected',
      'Mobile and desktop compatibility',
      'Website embed capability',
      'Final tour URL for sharing',
      'Google Street View publishing where appropriate and separately authorised',
    ],
  },

  uses: { title: 'Where your tour can be used' },

  // Heading written for this page.
  process: {
    title: 'What happens after you enquire',
    steps: [
      { title: 'Enquire', text: 'Provide details about your space and what you need.' },
      { title: 'Plan', text: 'We review the location, scope and requirements and provide a quotation.' },
      { title: 'Capture', text: 'We photograph the agreed areas of your premises in 360°.' },
      { title: 'Produce', text: 'The imagery is processed and assembled into the interactive tour.' },
      { title: 'Deliver', text: 'Your completed tour is provided ready to share, embed and use online.' },
    ],
  },

  next: {
    title: 'Explore ROSS 360',
    links: [
      { title: 'Business Tours', text: '360° tours for businesses and commercial premises.', to: '/businesses' },
      {
        title: 'Property Tours',
        text: '360° property tours for estate agents, property professionals and developments.',
        to: '/property',
      },
      { title: 'Pricing', text: 'Straightforward pricing for professional 360° tours.', to: '/pricing' },
    ],
  },
};
