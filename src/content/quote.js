// Get a Quote page wording. Supplied by ROSS 360 (4 October 2026) unless marked "written for this page".
// No response-time promise, no booking or payment on this page, no telephone number and no hosting.

import { lowestPrice } from './pricing.js';

export const quote = {
  hero: {
    title: 'Get a Quote',
    lead: "Tell us about your space and what you'd like to achieve. We'll review the requirements and come back with the most suitable option for your project.",
    fact: 'UK-wide service',
  },

  formTitle: 'Tell us about your project',

  // Written for this page.
  businessHint: 'For a private property, enter “Private”.',
  locationNote: 'The location helps us plan the visit and any travel. Addresses are used only to prepare your quotation.',

  consent:
    'By submitting this form, you agree that ROSS 360 can use the information provided to respond to your enquiry and prepare your quotation.',

  next: {
    title: 'What happens next',
    steps: [
      'Tell us about your space',
      'We review the requirements and confirm the most suitable option',
      'We provide a quotation',
    ],
  },

  email: {
    label: 'Prefer email?',
  },

  pricing: {
    text: `Business tours from £${lowestPrice} · Property tours individually quoted`,
    link: 'View pricing',
    to: '/pricing',
  },

  success: {
    title: 'Enquiry received',
    text: "Thanks for getting in touch. We've received your project details and will review them before getting back to you.",
    home: 'Return to Home',
    explore: 'Explore Virtual Tours',
  },
};
