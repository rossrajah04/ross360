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
    text: 'A 360° tour gives customers, clients, buyers and tenants a clearer understanding of a space before they make the journey.',
    points: [
      {
        title: 'Understand the space',
        text: 'See the layout, scale and details that conventional photography can’t fully communicate.',
      },
      {
        title: 'Build confidence',
        text: 'Give people a more realistic sense of the environment before they visit.',
      },
      {
        title: 'Keep it working online',
        text: 'Use the tour on your website, in enquiries and, where appropriate, on Google Street View.',
      },
    ],
  },

  compare: {
    title: 'A more complete view',
    photo: { label: 'Traditional photography', text: 'Shows selected views.' },
    tour: { label: '360° tour', text: 'Lets visitors explore the space themselves.' },
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
      {
        title: 'Discovery',
        text: 'We understand the space, what needs to be captured and how the tour will be used.',
      },
      { title: 'Photography', text: '360° imagery is captured throughout the agreed areas.' },
      { title: 'Production', text: 'The imagery is processed and assembled into an interactive tour.' },
      { title: 'Review', text: 'The completed tour is checked across desktop and mobile.' },
      { title: 'Publish', text: 'Where required, the tour can be prepared for Google Street View publication.' },
      { title: 'Delivery', text: 'You receive the finished tour URL and website embed information.' },
    ],
  },

  pricing: {
    label: 'Pricing',
    title: 'Business tours',
    // From the Pricing page; each package's summary also comes from pricing.js.
    intro: 'Straightforward starting prices for commercial premises.',
    property: 'Property projects are individually quoted based on size, location and requirements.',
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
    note: 'Business & property projects · UK-wide',
  },
};
