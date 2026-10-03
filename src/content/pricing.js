// Business tour packages. Prices are STARTING prices — final pricing is confirmed in the quote.
// Change a price here and it updates everywhere it is shown.

export const plans = [
  {
    id: 'essential',
    name: 'Essential',
    price: 249,
    summary: 'For smaller, straightforward spaces.',
    suitableFor: [],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 349,
    featured: true,
    tag: 'Main package',
    summary: 'Our main package for most commercial spaces.',
    suitableFor: [
      'Restaurants',
      'Gyms',
      'Studios',
      'Showrooms',
      'Larger retail',
      'Offices',
      'Similar premises',
    ],
  },
  {
    id: 'bespoke',
    name: 'Large / Bespoke',
    price: 499,
    summary: 'For larger or more complex spaces.',
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

export const travelNote =
  'ROSS 360 works UK-wide. Travel is assessed before your quote is finalised, and any additional travel charge is confirmed in the quote before you pay.';

export const formatFrom = (price) => `From £${price}`;
