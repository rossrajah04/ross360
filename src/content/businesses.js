// Businesses page wording. Supplied by ROSS 360 (3 October 2026) unless marked "written for this page".
// The sectors are the kinds of premises ROSS 360 photographs; they do not imply past clients.
// No claims about rankings, footfall or conversions, and no hosting: see src/content/virtualTours.js.

import { virtualTours } from './virtualTours.js';
import { lowestPrice } from './pricing.js';

export const businesses = {
  hero: {
    title: '360° Virtual Tours for Businesses',
    lead: 'Give customers a better way to explore your space before they visit. ROSS 360 creates professional 360° virtual tours for businesses, designed around the way visitors experience your premises.',
    quote: 'Get a Quote',
    work: 'View Our Work',
    facts: ['UK-wide service', `Business tours from £${lowestPrice}`],
  },

  view: {
    title: 'Give customers a better view of your space',
    // Written for this page, from the point ROSS 360 asked it to make.
    text: 'Traditional photographs show selected views of your premises. An interactive tour lets visitors look around and move between connected areas for themselves.',
    items: [
      {
        title: 'Show your space before the visit',
        text: 'Help potential customers understand the layout and atmosphere before they arrive.',
      },
      {
        title: 'Make your website more useful',
        text: 'Give visitors something interactive to explore instead of relying only on photographs.',
      },
      {
        title: 'Showcase the full premises',
        text: 'Connect the important areas of your business into one navigable experience.',
      },
      {
        title: 'Support Google visibility',
        text: 'Where appropriate and authorised, tours can be prepared for publication on Google Street View.',
      },
    ],
  },

  who: {
    title: 'Built for spaces people want to explore',
    items: [
      { title: 'Restaurants & cafés', text: 'Let customers explore the dining space, layout and atmosphere before visiting.' },
      { title: 'Gyms & studios', text: 'Show equipment, training areas and the overall environment.' },
      { title: 'Hotels', text: 'Give prospective guests a better sense of rooms, shared spaces and facilities.' },
      { title: 'Wedding & event venues', text: 'Let prospective clients explore the venue before arranging a viewing.' },
      { title: 'Retail & showrooms', text: 'Show customers the environment, layout and products around the space.' },
      { title: 'Clinics & professional spaces', text: 'Help visitors understand the environment and layout before they arrive.' },
      { title: 'Offices & commercial premises', text: 'Give clients, visitors and prospective tenants a clearer view of the space.' },
    ],
  },

  uses: {
    title: 'Put your tour to work',
    items: [
      { title: 'Website', text: 'Embed the interactive tour directly into your website.' },
      {
        title: 'Google Street View',
        text: 'Where appropriate and authorised, imagery can be prepared for publication through Google.',
      },
      { title: 'Direct sharing', text: 'Share the tour URL with customers, clients, prospects or tenants.' },
      {
        title: 'Marketing',
        text: 'Use the tour as an additional way to showcase your premises across digital marketing channels.',
      },
    ],
  },

  receive: {
    title: 'What you receive',
    items: [
      { title: '360° photography', text: 'Professional 360° imagery of the agreed areas.' },
      { title: 'Interactive virtual tour', text: 'A connected experience visitors can navigate themselves.' },
      { title: 'Website-ready embed', text: 'Your tour can be embedded directly into your website.' },
      { title: 'Shareable tour URL', text: 'A direct link you can send to customers, clients or prospects.' },
      { title: 'Google Street View publication', text: 'Where appropriate and authorised.' },
    ],
  },

  // The same four standards as the Virtual Tours page.
  standard: { title: 'The ROSS 360 Standard', items: virtualTours.why.items },

  how: { title: 'How it works', steps: virtualTours.how.steps },

  closing: {
    title: 'Ready to show people around?',
    text: 'Request a quote for a professional 360° virtual tour of your business.',
    cta: 'Get a Quote',
    to: '/get-a-quote?type=business',
  },
};
