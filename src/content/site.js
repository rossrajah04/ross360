// Single source of truth for business details and site-wide wording.
// Edit values here — components read from this file rather than hard-coding them.

export const site = {
  brand: 'ROSS 360',
  descriptor: '360° Virtual Tours for Businesses & Property',
  url: 'https://ross360.co.uk',
  domain: 'ross360.co.uk',
  // Public contact address. Customer acknowledgements are sent from it; internal quote enquiries go to
  // newquote@ross360.co.uk (functions/api/quote.js).
  email: 'contact@ross360.co.uk',
  // Business mobile, for calls and WhatsApp. Shown in the footer and the floating WhatsApp link; the Get a Quote
  // page stays form-only.
  phone: {
    display: '07925 213557',
    tel: '+447925213557',
    whatsapp: 'https://wa.me/447925213557',
  },
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

  // The tour shown on the homepage ("Step inside" and the phone view), Virtual Tours and Businesses:
  // Kinetic Sports & Health, ROSS 360's own work: no external label, just the line under the frame. It loads
  // straight away.
  // Also listed on the Portfolio (src/content/portfolio.js).
  stepInsideTour: {
    isRealProject: true,
    autoload: true,
    embedUrl: 'https://tour.panoee.net/iframe/6ad4ba76ea1add2da542e2cf?embedFullscreen=1&embedVr=1&embedGyro=1',
    openUrl: 'https://tour.panoee.net/iframe/6ad4ba76ea1add2da542e2cf?embedFullscreen=1&embedVr=1&embedGyro=1',
    title: 'Kinetic Sports & Health',
    credit: 'Kinetic Sports & Health. Created by ROSS 360.',
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

