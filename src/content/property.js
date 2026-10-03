// Property page wording. Supplied by ROSS 360 (3 October 2026) unless marked "written for this page".
// No claims of faster sales, higher valuations, more enquiries, fewer viewings or better SEO.
// Google Street View is optional for property, never the default deliverable. No published property price.

import { virtualTours } from './virtualTours.js';

const [, , , handled] = virtualTours.why.items;

export const property = {
  hero: {
    title: '360° Virtual Tours for Property',
    lead: 'Give buyers, tenants and clients a better way to explore a property remotely. ROSS 360 creates interactive 360° property tours that let people move through a space and understand it before arranging a viewing.',
    quote: 'Get a Quote',
    fact: 'Property tours individually quoted',
  },

  explore: {
    title: 'Let people explore before they visit',
    // Written for this page from ROSS 360's explanation.
    items: [
      { title: 'A standard property listing', text: 'Photographs and basic information about the property.' },
      {
        title: 'A 360° property tour',
        text: 'A way for prospective buyers or tenants to move through connected areas themselves and get a stronger sense of the space and layout.',
        ours: true,
      },
    ],
  },

  who: {
    title: 'For property professionals',
    items: [
      { title: 'Estate agents', text: 'Create a more immersive way for prospective buyers to explore properties.' },
      { title: 'Letting agents', text: 'Help prospective tenants understand a property before arranging a viewing.' },
      { title: 'Property developers', text: 'Show completed or staged spaces to prospective buyers and stakeholders.' },
      {
        title: 'Commercial property professionals',
        text: 'Give prospective occupiers a clearer view of commercial premises.',
      },
      { title: 'Property managers', text: 'Provide an accessible way to showcase spaces where appropriate.' },
      { title: 'Property sellers', text: 'For selected private property projects, subject to quotation and requirements.' },
    ],
  },

  includes: {
    title: 'A property tour built around the space',
    items: [
      { title: '360° property photography', text: 'Capture the agreed rooms and areas in 360°.' },
      { title: 'Connected interactive tour', text: 'Allow visitors to move between connected viewpoints.' },
      { title: 'Shareable tour URL', text: 'A direct link for prospective buyers, tenants or clients.' },
      {
        title: 'Website/listing integration',
        text: 'Provide the tour in a format suitable for embedding or linking where supported.',
      },
      {
        title: 'Optional Google publication',
        text: 'Only where appropriate, authorised and technically suitable.',
      },
    ],
  },

  how: {
    title: 'From property to published tour',
    steps: [
      {
        title: 'Property details',
        text: 'Tell us about the property, areas required and what the tour needs to achieve.',
      },
      { title: 'Plan', text: 'We review the property, scope and access requirements and provide a quotation.' },
      { title: 'Capture', text: 'We photograph the agreed rooms and areas in 360°.' },
      {
        title: 'Produce & deliver',
        text: 'We connect the imagery into an interactive tour and provide the finished tour ready to share.',
      },
    ],
  },

  // The same four standards as the Virtual Tours page, with the first three worded for property
  // (written for this page).
  standard: {
    title: 'The ROSS 360 Standard',
    items: [
      {
        title: 'Planned around your space',
        text: 'We plan the capture around how buyers and tenants should move through the property, connecting rooms and areas into a natural journey.',
      },
      {
        title: 'Ready to use from day one',
        text: 'Your finished tour comes with a shareable URL and the files you need to add it to your website or listing where supported.',
      },
      {
        title: 'Checked before delivery',
        text: 'Every tour is reviewed before it reaches you, including navigation, imagery, agreed rooms and areas and the experience across desktop and mobile.',
      },
      handled,
    ],
  },

  pricing: {
    label: 'Property tours',
    title: 'Individually quoted',
    text: 'Every property is different. Pricing depends on the size of the property, number of areas, access, location and project requirements.',
    cta: 'Request a Quote',
    to: '/get-a-quote?type=property',
  },

  closing: {
    title: 'Have a property worth exploring?',
    text: 'Request a quote for a professional 360° property tour.',
    cta: 'Get a Quote',
    to: '/get-a-quote?type=property',
  },
};
