// Single source of truth for business details and site-wide wording.
// Edit values here — components read from this file rather than hard-coding them.

export const site = {
  brand: 'ROSS 360',
  descriptor: '360° Virtual Tours for Businesses & Property',
  url: 'https://ross360.co.uk',
  domain: 'ross360.co.uk',
  email: 'ross@ross360.co.uk',
  founder: 'Ross Rajah',
  legalName: 'Ross Rajah — sole trader trading as ROSS 360',
  responseTime: 'within 1 business day',

  // Call-to-action wording
  cta: {
    primary: 'Get a Quote',
    secondary: 'View Our Work',
    business: 'Explore Business Tours',
    property: 'Explore Property Tours',
    agency: 'Enquire about agency requirements',
    finalHeading: 'Ready to give people a better way to explore your space?',
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

  // Show a "draft for review" notice on the Privacy Notice and Terms pages.
  // Set to false once the final legal wording has been reviewed and approved.
  legalDraft: true,
  legalDraftDate: '3 October 2026',

  // Example / demo tour. Nothing here is a client project.
  // When a real Panoee tour is ready: paste its embed URL into `embedUrl`,
  // set `isRealProject` to true ONLY if it is genuine ROSS 360 work you have permission to show,
  // and update `title` / `openUrl`.
  exampleTour: {
    isRealProject: false,
    embedUrl: '', // e.g. the Panoee embed/share URL
    openUrl: '', // optional: link to open the tour in a new tab
    title: 'Example Tour',
  },

  // Hosting wording — the model after the initial period is still under review,
  // so no renewal price is hard-coded anywhere.
  hosting: {
    includedMonths: 12,
    afterwards: 'Hosting options after the initial 12 months are confirmed in your quote.',
  },

  // Google wording
  google: {
    summary:
      'Where appropriate, imagery from your tour can also be published to Google Street View, which is a separate third-party Google platform.',
    disclaimer:
      'Google controls approval, processing time, placement and availability, so none of these can be guaranteed, and publishing does not guarantee any change in search rankings.',
  },

  // Property pricing wording (property prices are not final)
  propertyPricingNote:
    'Property tours are individually quoted based on the size, layout and requirements of each property.',
  propertyPricingShort:
    'Property tours are individually quoted based on the property, size, layout and requirements.',

  // Working policy — exact legal wording is finalised separately in the Terms
  policy: {
    freeCancellationHours: 48,
    lateCancellationMaxPercent: 50,
  },

  payment: {
    upfrontPercent: 100,
  },
};

export const hostingIncludedLine = `${site.hosting.includedMonths} months of ROSS 360 interactive-tour hosting included.`;
