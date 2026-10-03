// Business tour packages. Prices are STARTING prices — final pricing is confirmed in the quote.
// Every package includes the same deliverables (see coreDeliverable in services.js);
// packages differ by the size and complexity of the space.
// Change a price here and it updates everywhere it is shown.

export const plans = [
  {
    id: 'essential',
    name: 'Essential',
    price: 249,
    summary: 'For smaller spaces with a straightforward layout.',
    scope: 'A compact premises that can be shown clearly from a small number of viewpoints.',
    suitableFor: ['Smaller cafés and shops', 'Single studios or treatment rooms', 'Compact offices'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 349,
    featured: true,
    tag: 'Main package',
    summary: 'For most commercial premises.',
    scope: 'A typical single-site business with several rooms or distinct areas to connect.',
    suitableFor: ['Restaurants', 'Gyms', 'Studios', 'Showrooms', 'Larger retail', 'Offices', 'Similar premises'],
  },
  {
    id: 'bespoke',
    name: 'Large / Bespoke',
    price: 499,
    summary: 'For larger, more complex or multi-building sites.',
    scope: 'Scope is planned individually around the site, its layout and what needs to be shown.',
    suitableFor: [
      'Larger venues',
      'Hotels',
      'Large gyms',
      'Large showrooms',
      'Commercial properties',
      'Complex layouts',
      'Multiple buildings',
    ],
  },
];

export const lowestPrice = plans[0].price;

export const pricingNote = `Our packages start from £${lowestPrice}. Final pricing depends on the size and complexity of the space, location and any additional requirements. Your exact price is confirmed before booking.`;

// What moves a quote within or between packages.
export const priceFactors = [
  { title: 'Size', text: 'The floor area and number of rooms or areas to capture.' },
  { title: 'Complexity', text: 'How the space is laid out and how many viewpoints it needs to read clearly.' },
  { title: 'Location', text: 'Where the site is. Any additional travel charge is confirmed in the quote.' },
  { title: 'Additional requirements', text: 'Anything beyond a standard single tour, agreed with you in advance.' },
];

export const travelNote =
  'ROSS 360 works UK-wide. Travel is assessed before your quote is finalised, and any additional travel charge is confirmed in the quote before you pay.';

export const formatFrom = (price) => `From £${price}`;
