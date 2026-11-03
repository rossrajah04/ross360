// Businesses page wording. Supplied by ROSS 360 (3 October 2026) unless marked "written for this page".
// The sectors are the kinds of premises ROSS 360 photographs; they do not imply past clients.
// No claims about rankings, footfall or conversions, and no hosting: see src/content/virtualTours.js.
// Each section is worded for businesses so it does not repeat the Virtual Tours or About pages.

import { lowestPrice } from './pricing.js';

export const businesses = {
  hero: {
    title: '360° Virtual Tours for Businesses',
    lead: '360° virtual tours of restaurants, gyms, clinics, hotels and other premises, planned around the way your customers move through the building.',
    quote: 'Get a Quote',
    work: 'View Our Work',
    facts: ['UK-wide service', `Business tours from £${lowestPrice}`],
  },

  view: {
    title: 'Give customers a better view of your space',
    // Written for this page, from the point ROSS 360 asked it to make.
    text: 'Customers decide where to go from what they find online. A tour shows them the whole layout, not a few selected photographs.',
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
        title: 'Every area in one tour',
        text: 'Connect the entrance, main rooms and facilities so visitors can move between them.',
      },
      {
        title: 'On your Google listing',
        text: 'Customers can look inside from Google Maps, next to your reviews and opening hours.',
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
        text: 'Customers see inside from the listing they already use to find you.',
      },
      { title: 'Direct sharing', text: 'Share the tour URL with customers, clients, prospects or tenants.' },
      {
        title: 'Marketing',
        text: 'Use the tour in emails, social posts and adverts.',
      },
    ],
  },

  receive: {
    title: 'What you receive',
    items: [
      { title: '360° photography', text: 'Your customer areas, photographed outside trading hours.' },
      {
        title: 'Interactive virtual tour',
        text: 'Visitors move from the entrance through each area, the way you would show them round.',
      },
      {
        title: 'Website-ready embed',
        text: 'A short piece of code you or your web developer can paste into any page.',
      },
      { title: 'Shareable tour URL', text: 'Send it in booking confirmations, emails and social posts.' },
      { title: 'Google Street View publication', text: 'Published to your Google listing on request.' },
    ],
  },

  // How ROSS 360 works with a business (written for this page, 3 November 2026, so it does not repeat
  // the Virtual Tours page's "Why ROSS 360").
  standard: {
    title: 'Working with your business',
    items: [
      {
        title: 'Around your trading hours',
        text: 'We photograph before opening or after closing, so customers and staff are not affected.',
      },
      {
        title: 'The areas you choose',
        text: 'You decide what is included. We plan the route so visitors see each area in the order a customer would.',
      },
      {
        title: 'Ready for your website and Google',
        text: 'You receive a link to share, the code to add the tour to your website, and Street View publishing where requested.',
      },
      {
        title: 'One person throughout',
        text: 'The person who quotes your project is the person who photographs, builds and checks it.',
      },
    ],
  },

  how: {
    title: 'How it works',
    steps: [
      { title: 'Enquire', text: 'Send your business name, address and the areas you’d like included.' },
      { title: 'Quote and book', text: 'We confirm the scope and price. You choose a date online and pay the deposit.' },
      { title: 'Capture', text: 'We photograph before opening or after closing, so trading is not disrupted.' },
      {
        title: 'Deliver',
        text: 'You receive the tour link and embed code, and we publish to Google where requested.',
      },
    ],
  },

  closing: {
    title: 'Ready to show people around?',
    text: 'Request a quote for a professional 360° virtual tour of your business.',
    cta: 'Get a Quote',
    to: '/get-a-quote?type=business',
  },
};
