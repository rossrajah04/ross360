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
      'Professional 360° virtual tours and 360° photography for businesses, estate agents and commercial property. UK-wide. Business tours from £' + lowestPrice + '.',
  },
  virtualTours: {
    path: '/virtual-tours',
    title: '360° Virtual Tour Services | ROSS 360',
    description:
      'What a ROSS 360 virtual tour includes: 360° photography, connected viewpoints, website integration, 12 months of hosting, and how it differs from Google Street View.',
  },
  businesses: {
    path: '/businesses',
    title: '360° Virtual Tours for Businesses | ROSS 360',
    description: `360° virtual tours for restaurants, cafés, gyms, hotels, venues, retail, clinics and offices, UK-wide. Business packages from £${lowestPrice}.`,
  },
  property: {
    path: '/property',
    title: '360° Property Tours for Estate Agents & Developers | ROSS 360',
    description:
      '360° property tours for estate agents, developers and commercial property, UK-wide. Single properties or ongoing agency work, individually quoted.',
  },
  portfolio: {
    path: '/portfolio',
    title: 'Our Work | ROSS 360',
    description:
      'Completed ROSS 360 virtual tour projects for businesses and property, published with each client\'s permission.',
  },
  pricing: {
    path: '/pricing',
    title: '360° Virtual Tour Pricing | ROSS 360',
    description: `Business 360° virtual tour packages from £${lowestPrice}, what each package suits, what affects the final price, and how property tours are quoted.`,
  },
  about: {
    path: '/about',
    title: 'About ROSS 360 | Founded by Ross Rajah',
    description:
      'ROSS 360 is a UK-wide 360° virtual tour service founded and run by Ross Rajah, who handles every project from enquiry to delivery.',
  },
  quote: {
    path: '/get-a-quote',
    title: 'Get a Quote | ROSS 360',
    description:
      'Request a quote for a 360° virtual tour of your business or property. No obligation. We reply within 1 business day.',
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

// Social sharing image (1200 × 630), served from /public.
export const shareImage = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'ROSS 360: 360° Virtual Tours for Businesses & Property',
};

export const canonicalFor = (path) => (path === '/' ? `${site.url}/` : `${site.url}${path}`);

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.brand,
  url: site.url,
  email: site.email,
  description: '360° virtual tours and 360° photography for businesses and property, UK-wide.',
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
