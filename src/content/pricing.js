// Business tour packages. Prices are STARTING prices; final pricing is confirmed in the quotation.
// Change a price here and it updates everywhere it is shown.

export const plans = [
  {
    id: 'essential',
    name: 'Essential',
    price: 249,
    summary: 'For smaller premises and straightforward requirements.',
    includes: [
      '360° photography',
      'Interactive virtual tour',
      'Website embed',
      'Google publishing where appropriate',
      '12 months’ hosting',
      'Final tour URL',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 349,
    featured: true,
    tag: 'Main package',
    summary: 'For larger premises requiring broader coverage.',
    includes: [
      'Everything in Essential',
      'Additional viewpoints and areas',
      'More comprehensive tour coverage',
      'Google publishing where appropriate',
      '12 months’ hosting',
    ],
  },
  {
    id: 'bespoke',
    name: 'Large / Bespoke',
    price: 499,
    summary: 'For larger or more complex premises.',
    scope: 'Scope and pricing are agreed according to the property and requirements.',
    includes: [],
  },
];

export const lowestPrice = plans[0].price;

export const pricingHeading = 'Business Virtual Tours';
export const pricingIntro = 'Straightforward starting prices for commercial premises.';

export const priceFactors = [
  'Size of the premises',
  'Number of areas and viewpoints',
  'Complexity of the space',
  'Location and travel requirements',
  'Any additional requirements',
];

export const propertyPricingLine = 'Property tours are individually quoted.';

export const formatFrom = (price) => `From £${price}`;
