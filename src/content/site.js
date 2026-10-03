// Single source of truth for business details and site-wide wording.
// Edit values here — components read from this file rather than hard-coding them.

export const site = {
  brand: 'ROSS 360',
  descriptor: '360° Virtual Tours for Businesses & Property',
  url: 'https://ross360.co.uk',
  domain: 'ross360.co.uk',
  // Public contact address. Also the default destination for quote enquiries (functions/api/quote.js),
  // unless QUOTE_TO_EMAIL is set in Cloudflare.
  email: 'contact@ross360.co.uk',
  founder: 'Ross Rajah',
  legalName: 'Ross Rajah, sole trader trading as ROSS 360',
  serviceArea: 'UK-wide',
  responseTime: 'within 1 business day',

  // Call-to-action wording
  cta: {
    primary: 'Get a Quote',
    work: 'View Our Work',
    example: 'View Example Tour',
    pricing: 'View Pricing',
    business: 'Explore Business Tours',
    property: 'Explore Property Tours',
    agency: 'Enquire about agency requirements',
    finalHeading: 'Tell us about the space and we’ll send you a clear price',
  },

  // Main navigation (the quote link is rendered separately as the prominent button)
  nav: [
    { label: 'Home', to: '/' },
    { label: 'Virtual Tours', to: '/virtual-tours' },
    { label: 'Businesses', to: '/businesses' },
    { label: 'Property', to: '/property' },
    { label: 'Portfolio', to: '/portfolio' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'About', to: '/about' },
  ],
  quoteLink: { label: 'Get a Quote', to: '/get-a-quote' },

  // Example tour. A demonstration only — never a client project.
  // Paste a Panoee embed URL into `embedUrl` to show it on the homepage and Portfolio page.
  // While it is empty, the homepage explains how a tour works instead, and nothing links to it.
  exampleTour: {
    isRealProject: false,
    embedUrl: '',
    openUrl: '', // optional: link to open the tour in a new tab
    title: 'Example tour',
  },

  // Genuine photography only. Each slot stays hidden (or uses the line illustration, for the
  // homepage hero) until a real image is added. Put files in /public/images/ and set
  // { src: '/images/name.jpg', alt: 'What the photo shows', width: 1600, height: 1000 }.
  images: {
    hero: null,
    business: null,
    property: null,
    founder: null,
  },

  // Hosting wording. No renewal price is published; terms after the first 12 months are agreed separately.
  hosting: {
    includedMonths: 12,
    afterwards: 'Hosting after the first 12 months is agreed separately.',
  },

  // Google wording
  google: {
    summary:
      'Where appropriate, and only with your separate authorisation, suitable imagery can also be published to Google Street View. Street View is a Google platform and is separate from your ROSS 360 tour.',
    disclaimer:
      'Google decides whether imagery is accepted and controls processing time, placement and availability. None of these can be guaranteed, and publishing does not guarantee any change in search rankings.',
  },

  // Property pricing wording (property prices are not final)
  propertyPricingNote:
    'Property tours are individually quoted based on the size, layout and requirements of each property.',

  // Working policy — reflected in the Terms & Conditions
  policy: {
    freeCancellationHours: 48,
    lateCancellationMaxPercent: 50,
  },

  payment: {
    upfrontPercent: 100,
  },
};

export const hostingIncludedLine = `${site.hosting.includedMonths} months of ROSS 360 interactive-tour hosting is included.`;
