import { site } from './site.js';
import { lowestPrice } from './pricing.js';

// Per-page SEO. Used by the client (src/lib/applySeo.js) AND by the build-time prerender
// script (scripts/prerender.mjs), so titles/descriptions are defined in exactly one place.
// Keep this file free of JSX and framework imports.

export const pages = {
  home: {
    path: '/',
    title: 'ROSS 360 | 360° Virtual Tours for Businesses & Property',
    description:
      'Professional 360° virtual tours for businesses and property, UK-wide. Let customers, buyers and visitors explore your space online before they visit.',
  },
  virtualTours: {
    path: '/virtual-tours',
    title: '360° Virtual Tour Services | ROSS 360',
    description:
      'Professional 360° virtual tours: 360° photography, connected viewpoints, interactive navigation and website-ready delivery. Get a quote from ROSS 360.',
  },
  businesses: {
    path: '/businesses',
    title: '360° Virtual Tours for Businesses | ROSS 360',
    description: `Virtual tours for restaurants, cafés, gyms, hotels, venues, retail, clinics and offices. Packages from £${lowestPrice}. Get a quote from ROSS 360.`,
  },
  property: {
    path: '/property',
    title: '360° Property Tours for Estate Agents | ROSS 360',
    description:
      '360° property tours for estate agents, developers and property professionals, including multi-property agency work. Individually quoted.',
  },
  portfolio: {
    path: '/portfolio',
    title: 'Our Work | ROSS 360',
    description:
      'Explore ROSS 360 virtual tours for businesses and property. Filter by business or property projects.',
  },
  pricing: {
    path: '/pricing',
    title: '360° Virtual Tour Pricing | ROSS 360',
    description: `Business 360° virtual tour packages from £${lowestPrice}, with clear explanations of what affects final pricing. Property tours are individually quoted.`,
  },
  about: {
    path: '/about',
    title: 'About ROSS 360 | Founded by Ross Rajah',
    description:
      'ROSS 360 was founded by Ross Rajah, who handles communication, planning, capture, tour production, quality control and delivery.',
  },
  quote: {
    path: '/get-a-quote',
    title: 'Get a Quote | ROSS 360',
    description:
      'Request a quote for a 360° virtual tour for your business or property. Tell us about your space and we will get back to you within 1 business day.',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Notice | ROSS 360',
    description: 'How ROSS 360 collects, uses and protects personal information.',
  },
  terms: {
    path: '/terms',
    title: 'Terms & Conditions | ROSS 360',
    description: 'The terms that apply to ROSS 360 virtual tour services.',
  },
  notFound: {
    path: '/404',
    title: 'Page not found | ROSS 360',
    description: 'This page could not be found.',
    noindex: true,
  },
};

export const canonicalFor = (path) => (path === '/' ? `${site.url}/` : `${site.url}${path}`);

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.brand,
  url: site.url,
  email: site.email,
  description: '360° virtual tours for businesses and property.',
  founder: { '@type': 'Person', name: site.founder },
  areaServed: { '@type': 'Country', name: 'United Kingdom' },
};

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: site.brand,
  url: site.url,
};

const tourService = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: '360° Virtual Tours',
  serviceType: '360° virtual tour photography and production',
  provider: { '@type': 'Organization', name: site.brand, url: site.url },
  areaServed: { '@type': 'Country', name: 'United Kingdom' },
};

// Truthful structured data only: no ratings, reviews or customer counts, and no LocalBusiness.
export function jsonLdFor(key) {
  if (key === 'notFound') return [];
  const items = [organization, website];
  if (key === 'virtualTours') items.push(tourService);
  return items;
}
