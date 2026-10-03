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
  // Used only where the operator's identity is needed: the Privacy Notice and Terms & Conditions.
  // Not shown in the footer or marketing pages.
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

  // The homepage "Step inside" tour. An external example used with its creator's permission; it is not
  // ROSS 360's work, so it is labelled as such and credited under the frame. It is not used on any other
  // page. Replace it with a ROSS 360 tour once one exists.
  stepInsideTour: {
    isRealProject: false,
    external: true,
    embedUrl: 'https://tour.panoee.com/avalon-hotel/',
    openUrl: 'https://tour.panoee.com/avalon-hotel/',
    title: 'Avalon Hotel',
    label: 'External example',
    credit: 'Example tour by OCEAN.LV / Avalon Hotel.',
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

