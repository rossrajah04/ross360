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
    quote: 'Request a Quote',
    work: 'View Our Work',
    example: 'Open Example Tour',
    property: 'Request a Property Quote',
    finalHeading: 'Tell us about the property or premises you would like photographed.',
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

  // Example tour. While `isRealProject` is false it is labelled as a demonstration.
  // `embedUrl`: the Panoee embed address (the src="…" of Panoee's iframe code), e.g.
  //   https://tour.panoee.net/…  It fills the homepage "Step inside" frame, which shows a placeholder
  //   until this is set, and the "Explore a 360° Tour" section on the Portfolio page.
  // `openUrl`: the tour's own page, opened in a new tab.
  // While both are empty the Portfolio section is not shown, so nothing links to a tour that does not exist.
  exampleTour: {
    isRealProject: false,
    embedUrl: '',
    openUrl: '',
    title: 'Example tour',
  },

  // Genuine photography only, for the inner pages. Each slot shows a reserved image area until a real
  // image is added. Put files in /public/images/ and set
  // { src: '/images/name.jpg', alt: 'What the photo shows', width: 1600, height: 1000 }.
  // Homepage images are set in src/content/home.js.
  images: {
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
    disclaimer:
      'Google decides whether imagery is accepted and controls processing time, placement and availability. Publication cannot be guaranteed and does not guarantee any change in search rankings.',
  },

  // Working policy — reflected in the Terms & Conditions
  policy: {
    freeCancellationHours: 48,
    lateCancellationMaxPercent: 50,
  },

  payment: {
    upfrontPercent: 100,
  },
};

