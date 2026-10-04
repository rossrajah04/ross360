// Pricing page wording and business tour packages. Supplied by ROSS 360 (4 October 2026).
// Prices are STARTING prices; the final price is confirmed in the quotation. Change a price here and
// it updates everywhere it is shown. No hosting, no room or panorama limits, no discounts or offers,
// and no property packages or prices.

const businessIncludes = [
  '360° photography',
  'Interactive virtual tour',
  'Agreed areas captured',
  'Website-ready embed',
  'Shareable tour URL',
  'Google Street View publication where appropriate and authorised',
];

export const plans = [
  {
    id: 'essential',
    name: 'Essential',
    price: 249,
    bestFor: 'Smaller commercial spaces',
    description: 'A professional 360° virtual tour for smaller premises with a straightforward layout.',
    includes: businessIncludes,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 349,
    featured: true,
    tag: 'Most popular',
    bestFor: 'Most businesses',
    description:
      'A more comprehensive tour for businesses that want visitors to explore multiple areas of their premises.',
    includes: businessIncludes,
  },
  {
    id: 'bespoke',
    name: 'Large / Bespoke',
    price: 499,
    bestFor: 'Large or more complex spaces',
    description:
      'A tailored 360° virtual tour for larger premises, multiple areas or projects with additional requirements.',
    includes: businessIncludes,
  },
];

export const lowestPrice = plans[0].price;

export const formatFrom = (price) => `From £${price}`;

export const pricing = {
  hero: {
    title: '360° Virtual Tour Pricing',
    lead: "Straightforward pricing for professional 360° virtual tours. Choose the package that best matches your space, then we'll confirm the final scope and quotation.",
    fact: 'UK-wide service',
  },

  business: {
    title: 'Business 360° Tours',
    intro:
      'Our business packages are designed around the size and complexity of your space. All prices are starting prices, with the final quotation confirmed once we understand the premises and areas required.',
    bestForLabel: 'Best for',
    cta: 'Get a Quote',
    to: '/get-a-quote?type=business',
  },

  includes: {
    title: 'Every business tour includes',
    items: [
      { title: '360° photography', text: 'Professional 360° imagery of the agreed areas.' },
      { title: 'Interactive virtual tour', text: 'A connected tour visitors can navigate themselves.' },
      { title: 'Website-ready embed', text: 'Information/code needed to embed the finished tour into a website.' },
      { title: 'Shareable tour URL', text: 'A direct link that can be shared with customers, clients or prospects.' },
      { title: 'Quality check', text: 'The finished tour is reviewed before delivery.' },
      { title: 'Google Street View', text: 'Where appropriate, authorised and technically suitable.' },
    ],
  },

  factors: {
    title: 'What affects the final price?',
    text: 'Every space is different. The final quotation depends on the size of the premises, number of areas, layout, access, location, travel requirements and any additional project requirements.',
    items: [
      'Size of the space',
      'Number of areas to capture',
      'Layout and complexity',
      'Access requirements',
      'Location and travel',
      'Additional project requirements',
    ],
    note: "We'll confirm any additional travel or project costs before you book.",
  },

  property: {
    title: 'Property tours',
    price: 'Individually quoted',
    text: 'Property projects vary significantly in size, layout and requirements, so property tours are quoted individually.',
    listLabel: 'A property quotation may take into account:',
    items: ['Property size', 'Number of rooms/areas', 'Location', 'Access', 'Required coverage', 'Project requirements'],
    cta: 'Request a Quote',
    to: '/get-a-quote?type=property',
  },

  closing: {
    title: 'Ready to get a quote?',
    text: "Tell us about your space and we'll confirm the most suitable option for your project.",
    cta: 'Get a Quote',
    to: '/get-a-quote',
  },
};
