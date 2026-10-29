// Guides: short, factual articles answering what people search for before buying a 360° tour.
// Written 29 October 2026. Same rules as the rest of the site: plain UK professional wording, no slogans,
// no invented statistics or claims, no hosting or travel wording. Prices come from pricing.js.
//
// Each guide is rendered by src/pages/Guide.jsx at /guides/<slug>, with blocks as on the legal pages:
// { h } sub-heading, { p } paragraph, { ul } list. {quote}, {pricing}, {streetview} and {virtualtours}
// become links. Add a guide's SEO entry automatically by adding it here (see seo.js).

import { plans, streetView, lowestPrice } from './pricing.js';

const plan = (id) => plans.find((p) => p.id === id);

export const guidesIndex = {
  title: 'Guides',
  lead: 'Plain answers to the questions businesses ask before booking a 360° virtual tour or Google Street View photography.',
  read: 'Read the guide',
};

export const guides = [
  {
    slug: 'how-much-does-a-360-virtual-tour-cost',
    title: 'How much does a 360° virtual tour cost?',
    description: `What a professional 360° virtual tour costs in the UK, what affects the price, and ROSS 360's prices: Google Street View photography from £${streetView.price}, business tours from £${lowestPrice}.`,
    lead: 'The price of a 360° virtual tour depends mainly on the size of the space and how much of it needs to be covered. This guide sets out what affects the price and what ROSS 360 charges.',
    published: '2026-10-29',
    updated: '29 October 2026',
    sections: [
      {
        id: 'street-view',
        title: 'Google Street View photography',
        blocks: [
          {
            p: `If the main aim is for customers to see inside your premises on Google Maps, 360° photographs published to your Google Business Profile are the simplest option. ROSS 360 charges from £${streetView.price} for smaller premises; larger premises need more photographs and are quoted accordingly.`,
          },
          { p: 'This option does not include an interactive tour, a website embed or a shareable tour link. See {streetview} for how it looks on a real listing.' },
        ],
      },
      {
        id: 'business-tours',
        title: 'Business virtual tours',
        blocks: [
          { p: 'Business tours are priced by the size and complexity of the premises:' },
          {
            ul: [
              `${plan('essential').name}, from £${plan('essential').price}: smaller premises and straightforward layouts, such as cafés, small studios and boutiques.`,
              `${plan('professional').name}, from £${plan('professional').price}: multiple areas or rooms, such as restaurants, gyms, studios and showrooms.`,
              `${plan('bespoke').name}, from £${plan('bespoke').price}: larger premises, multiple connected areas or more involved layouts.`,
            ],
          },
          {
            p: 'Every business tour includes the 360° photography, an interactive tour visitors can move through, a shareable link, the information needed to embed the tour on your website, and a quality check before delivery.',
          },
        ],
      },
      {
        id: 'property',
        title: 'Property tours',
        blocks: [{ p: 'Property tours are quoted individually, because properties vary so much in size, layout and requirements.' }],
      },
      {
        id: 'price-factors',
        title: 'What affects the final price',
        blocks: [
          {
            ul: [
              'The size of the space',
              'The number of areas to capture',
              'The layout and how complex it is',
              'Access requirements',
              'Any additional project requirements',
            ],
          },
        ],
      },
      {
        id: 'getting-a-price',
        title: 'Getting a price',
        blocks: [
          { p: 'Send a few details about your premises through {quote} and you will receive a fixed quotation before you book. Full details are on {pricing}.' },
        ],
      },
    ],
  },

  {
    slug: 'prepare-premises-for-360-shoot',
    title: 'How to prepare your premises for a 360° shoot',
    description:
      'A short checklist for getting your premises ready for 360° photography, so the finished virtual tour or Google Street View images show the space at its best.',
    lead: '360° photography captures the whole room at once, so everything in the space is in the picture. A little preparation makes a noticeable difference to the finished result.',
    published: '2026-10-29',
    updated: '29 October 2026',
    sections: [
      {
        id: 'before-the-day',
        title: 'Before the day',
        blocks: [
          {
            ul: [
              'Choose a time when the premises is closed or quiet, usually before or after opening hours.',
              'Decide which areas you want included, and any that should stay out, such as staff rooms or storage.',
              'Let staff know when the photography is taking place.',
            ],
          },
        ],
      },
      {
        id: 'tidy',
        title: 'Tidy every angle',
        blocks: [
          { p: 'A 360° image shows the floor, the ceiling and every wall, including the corners an ordinary photograph would leave out.' },
          {
            ul: [
              'Clear counters, desks and floors of bags, boxes and paperwork.',
              'Put away cleaning equipment, cables and bins where possible.',
              'Straighten furniture and equipment so the space looks ready for customers.',
            ],
          },
        ],
      },
      {
        id: 'lighting',
        title: 'Lighting',
        blocks: [
          {
            ul: [
              'Switch on all the lights in each area, and replace any bulbs that have gone.',
              'Open blinds and curtains, unless the view outside is better hidden.',
            ],
          },
        ],
      },
      {
        id: 'privacy',
        title: 'Privacy',
        blocks: [
          {
            ul: [
              'Remove or cover anything personal or confidential: documents, whiteboards, customer details and computer screens.',
              'Keep customers and staff out of the areas being photographed.',
            ],
          },
        ],
      },
      {
        id: 'on-the-day',
        title: 'On the day',
        blocks: [
          {
            p: 'The photography needs very little from you beyond access to each area. Afterwards, ROSS 360 produces and checks the finished tour or images before delivery.',
          },
          { p: 'Send a few details about your premises through {quote} for a fixed quotation.' },
        ],
      },
    ],
  },

  {
    slug: 'virtual-tour-or-google-street-view',
    title: 'Virtual tour or Google Street View: which do you need?',
    description:
      'The difference between a 360° virtual tour and Google Street View photography, and how to decide which suits your business.',
    lead: 'Both use 360° photography, and both let people look around your premises before they visit. The difference is where people see them and what you can do with them.',
    published: '2026-10-29',
    updated: '29 October 2026',
    sections: [
      {
        id: 'street-view',
        title: 'Google Street View photography',
        blocks: [
          {
            p: '360° photographs published to your Google Business Profile. They appear on your Google Maps listing, under the Street View & 360° tab, alongside your opening hours, reviews and directions, and are seen by people who find you on Google.',
          },
          { p: 'They are not a tour you can share by link or add to your own website.' },
        ],
      },
      {
        id: 'virtual-tour',
        title: 'A 360° virtual tour',
        blocks: [
          {
            p: 'An interactive tour in which visitors look around and move between connected viewpoints. You receive a shareable link and the information needed to embed it on your website, so it can be used on your site, in emails and on social media. Where appropriate, the photographs can also be published to Google.',
          },
        ],
      },
      {
        id: 'which-to-choose',
        title: 'Which to choose',
        blocks: [
          {
            ul: [
              'Google Street View, if most customers find you through Google Maps and you want them to see inside before they visit.',
              'A virtual tour, if you want something to show on your own website and send to customers, or your premises has several areas worth exploring.',
            ],
          },
          { p: 'You can start with Street View photography and add a full tour later.' },
        ],
      },
      {
        id: 'prices',
        title: 'Prices',
        blocks: [
          {
            p: `Google Street View photography starts at £${streetView.price}. Business virtual tours start at £${lowestPrice}. Full details are on {pricing}, and {virtualtours} explains what a tour includes.`,
          },
        ],
      },
    ],
  },
];

export const guideBySlug = (slug) => guides.find((guide) => guide.slug === slug);
