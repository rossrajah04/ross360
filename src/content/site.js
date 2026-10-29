
 // Single source of truth for business details and site-wide wording.
 // Edit values here — components read from this file rather than hard-coding them.

export const site = {
  brand: 'ROSS 360',
  descriptor: '360° Virtual Tours for Businesses & Property',
  url: 'https://ross360.co.uk',
  domain: 'ross360.co.uk',

  email: 'contact@ross360.co.uk',

  phone: {
    display: '07925 213557',
    tel: '+447925213557',
    whatsapp: 'https://wa.me/447925213557',
  },

  founder: 'Ross Rajah',
  legalName: 'Ross Rajah, sole trader trading as ROSS 360',
  serviceArea: 'UK-wide',
  base: 'Based in Manchester',
  responseTime: 'within 1 business day',

  cta: {
    primary: 'Get a Quote',
    quote: 'Request a Quote',
    work: 'View Our Work',
    example: 'Open Example Tour',
    property: 'Request a Property Quote',
    finalHeading: 'Tell us about the property or premises you would like photographed.',
  },

  // Main navigation
  nav: [
    { label: 'Home', to: '/' },
    { label: 'Virtual Tours', to: '/virtual-tours' },
    { label: 'Google Street View', to: '/google-street-view' },
    { label: 'Businesses', to: '/businesses' },
    { label: 'Property', to: '/property' },
    { label: 'Portfolio', to: '/portfolio' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'About', to: '/about' },
  ],

  quoteLink: { label: 'Get a Quote', to: '/get-a-quote' },

  exampleTour: {
    isRealProject: false,
    embedUrl: '',
    openUrl: '',
    title: 'Example tour',
  },

  stepInsideTour: {
    isRealProject: true,
    autoload: true,
    embedUrl: 'https://tour.panoee.net/iframe/6ad4ba76ea1add2da542e2cf?embedFullscreen=1&embedVr=1&embedGyro=1',
    openUrl: 'https://tour.panoee.net/iframe/6ad4ba76ea1add2da542e2cf?embedFullscreen=1&embedVr=1&embedGyro=1',
    title: 'Kinetic Sports & Health',
    credit: 'Kinetic Sports & Health. Created by ROSS 360.',
  },

  images: {
    business: null,
    property: null,
    founder: null,
  },

  google: {
    disclaimer:
      'Google decides whether imagery is accepted and controls processing time, placement and availability. Publication cannot be guaranteed and does not guarantee any change in search rankings.',
  },

  policy: {
    freeCancellationHours: 48,
    lateCancellationMaxPercent: 50,
  },

  payment: {
    upfrontPercent: 100,
  },
};
