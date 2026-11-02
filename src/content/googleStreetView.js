// Google Street View page wording (rewritten 29 October 2026 from ROSS 360's own first version of the page,
// at their request). First person, as ROSS 360 wrote it. No photograph counts, no slogans, and no promise
// that Google will publish: Google decides (site.google.disclaimer).

import { streetView, streetViewPointsText, lowestPrice } from './pricing.js';

export const googleStreetView = {
  hero: {
    title: 'Google Street View photography',
    lead: 'Professional 360° photographs of your premises, published to your Google Business Profile so people can look inside before they visit.',
    quote: 'Get a Quote',
    whatsapp: 'Ask on WhatsApp',
    facts: [`From £${streetView.price}`, 'UK-wide service', 'No logins needed from you'],
  },

  why: {
    title: 'Why it helps',
    items: [
      {
        title: 'People see inside first',
        text: 'People often look a business up on Google Maps before they visit. 360° photographs let them see your entrance and main areas from the listing.',
      },
      {
        title: 'A fuller Google listing',
        text: 'Photographs of the inside of your premises sit alongside your opening hours, reviews and directions, on the listing people already use.',
      },
      {
        title: 'Nothing for you to manage',
        text: 'I take the photographs, prepare them and publish them. You do not need to upload anything or share account details.',
      },
      {
        title: 'Works on any device',
        text: 'Street View opens on phones, tablets and computers, with nothing for your customers to install.',
      },
    ],
  },

  // Screenshots of Sabai Studio's Google listing (October 2026), shown with their agreement.
  example: {
    title: 'How it looks on Google',
    text: 'These are the 360° photographs I took for Sabai Studio, as they appear on their Google listing.',
    images: [
      {
        name: 'sabai-360-view',
        width: 920,
        height: 1805,
        alt: 'A 360° photograph of the Sabai Studio Pilates room open in Google Maps above the map and listing, credited to ROSS 360',
        caption: 'A 360° photograph open in Google Maps',
      },
      {
        name: 'sabai-listing',
        width: 920,
        height: 1373,
        alt: 'Sabai Studio’s Google Maps listing, showing the Street View & 360° photos tab',
        caption: 'The Street View & 360° tab on the listing',
      },
    ],
    link: 'View Sabai Studio on Google Maps',
    href: 'https://maps.app.goo.gl/ruMZ8PPf3mWSNLBRA',
  },

  receive: {
    title: 'What you receive',
    items: [
      { title: '360° photography', text: 'Your entrance and customer areas, photographed at a time that suits you.' },
      { title: 'Published for you', text: 'Added to your Google Business Profile. No logins or passwords needed from you.' },
      { title: 'Quality check', text: 'Every photograph is checked before publication.' },
    ],
  },

  how: {
    title: 'How it works',
    steps: [
      {
        title: 'Tell me about your premises',
        text: 'Send your business name, address and the areas you would like included. I will reply with a fixed quote.',
      },
      {
        title: 'I photograph the premises',
        text: 'At a time that suits you, usually before or after opening hours so customers are not affected.',
      },
      {
        title: 'I publish to Google',
        text: 'I check the photographs and publish them to your Google Business Profile. Google then processes them before they appear on Maps.',
      },
    ],
  },

  price: {
    label: 'Google Street View only',
    title: `From £${streetView.price}`,
    text: `${streetViewPointsText} Premises that need more are better suited to a full virtual tour, from £${lowestPrice}.`,
    link: 'View all pricing',
    to: '/pricing',
  },

  faqs: {
    title: 'Questions',
    items: [
      {
        question: 'Do I need to give you a password or login?',
        answer: 'No. I publish the photographs myself, so you do not need to share any account details.',
      },
      {
        question: 'Will the photographs definitely appear on Google?',
        answer: 'Google decides whether imagery is accepted and how long processing takes, so publication cannot be guaranteed. I follow Google’s requirements for every upload.',
      },
      {
        question: 'How is this different from a virtual tour?',
        answer: `Street View photography puts a few 360° photographs of your premises on Google Maps. A virtual tour is a complete walkthrough, with several points in each room, that you can add to your own website, share by link and use on Google as well. Tours start at £${lowestPrice}.`,
        link: { label: 'About virtual tours', to: '/virtual-tours' },
      },
      {
        question: 'What is a photo point?',
        answer: `One position where I take a 360° photograph. Most rooms need one, so a three-room studio or clinic is usually covered by the £${streetView.price} price.`,
      },
      {
        question: 'Do you cover my area?',
        answer: 'Yes. ROSS 360 is based in Manchester and works UK-wide.',
      },
    ],
  },

  closing: {
    title: 'Put your premises on Google Maps',
    text: 'Tell me about your business and I will send you a fixed quote.',
    cta: 'Get a Quote',
    to: '/get-a-quote?type=streetview',
  },
};
