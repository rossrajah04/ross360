// About page wording. Supplied by ROSS 360 (4 October 2026) unless marked "written for this page".
// A brand page, not a biography: no personal name, history, years of experience, client numbers,
// awards or statistics. The sectors describe who the service is for, not past clients. No hosting.

import { virtualTours } from './virtualTours.js';

export const about = {
  hero: {
    title: 'About ROSS 360',
    lead: 'ROSS 360 creates professional 360° virtual tours for businesses and property, giving people a more immersive way to explore spaces online.',
  },

  does: {
    title: 'Built to make spaces easier to explore',
    paragraphs: [
      'ROSS 360 combines 360° photography with interactive virtual tour production to create finished experiences that businesses and property professionals can share online.',
      'We focus on the complete process, from planning the areas to capture through to production, quality checking and delivery.',
    ],
    objectiveLabel: 'The objective is simple:',
    objective: 'Give visitors a clearer way to understand and explore a space before they visit.',
  },

  approach: {
    title: 'A considered approach to every space',
    // Written for this page.
    intro:
      'A good tour is not a matter of capturing as many 360° images as possible. It starts with how visitors should move through the space.',
    steps: [
      {
        title: 'Plan',
        text: 'We consider how visitors should move through the space before capture, identifying the areas and viewpoints that matter.',
      },
      {
        title: 'Capture',
        text: 'We photograph the agreed areas carefully and consistently, with the finished visitor experience in mind.',
      },
      {
        title: 'Produce',
        text: 'We connect the imagery into an interactive tour that is easy to navigate and ready to use online.',
      },
      {
        title: 'Check',
        text: 'We review the finished experience before delivery, checking the agreed areas, navigation, imagery and overall experience across desktop and mobile.',
      },
    ],
  },

  expect: {
    title: 'From first enquiry to finished tour',
    items: [
      {
        title: 'One point of contact',
        text: 'You deal with one person throughout the project, from initial enquiry through to delivery.',
      },
      { title: 'Clear scope', text: 'We confirm the areas, requirements and project scope before the work begins.' },
      {
        title: 'Professional production',
        text: 'The captured imagery is processed and built into a connected interactive tour.',
      },
      { title: 'Quality checked', text: 'The finished tour is reviewed before it is delivered.' },
      {
        title: 'Ready to use',
        text: 'Customers receive the finished tour with a shareable URL and website embed information, with Google Street View publication where appropriate and authorised.',
      },
    ],
  },

  who: {
    title: 'For businesses and property professionals',
    // Group labels written for this page.
    groups: [
      {
        label: 'Businesses',
        items: [
          'Restaurants & cafés',
          'Gyms & studios',
          'Hotels',
          'Wedding & event venues',
          'Retail & showrooms',
          'Clinics & professional spaces',
          'Offices & commercial premises',
        ],
      },
      {
        label: 'Property',
        items: [
          'Estate agents',
          'Letting agents',
          'Property developers',
          'Commercial property professionals',
          'Property managers',
        ],
      },
    ],
  },

  // The same four standards as the Virtual Tours, Businesses and Property pages.
  standard: {
    title: 'The ROSS 360 Standard',
    items: virtualTours.why.items,
  },

  ukWide: {
    title: 'UK-wide service',
    paragraphs: [
      'ROSS 360 provides 360° virtual tour services across the UK.',
      'Projects are quoted according to the space, requirements, access and location. Any additional travel or project costs are confirmed before booking.',
    ],
  },

  closing: {
    title: 'Have a space worth exploring?',
    text: "Tell us about your space and we'll confirm the most suitable option for your project.",
    cta: 'Get a Quote',
    to: '/get-a-quote',
  },
};
