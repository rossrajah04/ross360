import { site } from './site.js';
import { lowestPrice } from './pricing.js';

// Per-page SEO. Used by the client (src/lib/applySeo.js) AND by the build-time prerender
// script (scripts/prerender.mjs), so titles/descriptions are defined in exactly one place.
// Keep this file free of JSX and framework imports.

export const pages = {
  home: {
    path: '/',
    title: 'ROSS 360 | 360° Virtual Tours for Businesses & Property',
    description: `Professional 360° photography and interactive virtual tours for commercial premises and property. UK-wide service. Business tours from £${lowestPrice}.`,
  },
  virtualTours: {
    path: '/virtual-tours',
    title: '360° Virtual Tours | ROSS 360',
    description:
      'Interactive 360° photography that allows visitors to explore a space online, and how a ROSS 360 virtual tour differs from Google Street View.',
  },
  businesses: {
    path: '/businesses',
    title: '360° Virtual Tours for Businesses | ROSS 360',
    description: `Professional 360° virtual tours for businesses: restaurants, hotels, gyms, venues, retail, clinics and offices. UK-wide. Business tours from £${lowestPrice}.`,
  },
  property: {
    path: '/property',
    title: '360° Virtual Tours for Property | ROSS 360',
    description:
      'Interactive 360° virtual tours for property: estate agents, letting agents, developers and commercial property professionals. UK-wide, individually quoted.',
  },
  portfolio: {
    path: '/portfolio',
    title: 'Portfolio | ROSS 360',
    description:
      'The ROSS 360 portfolio of 360° virtual tours and 360° photography. Genuine business and property projects are added as they are completed.',
  },
  pricing: {
    path: '/pricing',
    title: 'Pricing | ROSS 360',
    description: `360° virtual tour pricing. Business tours from £${lowestPrice}, confirmed in a quotation once the scope is agreed. Property tours are individually quoted. UK-wide service.`,
  },
  about: {
    path: '/about',
    title: 'About | ROSS 360',
    description:
      'ROSS 360 creates professional 360° virtual tours for businesses and property: planned, captured, produced and checked as one service, UK-wide.',
  },
  quote: {
    path: '/get-a-quote',
    title: 'Request a Quote | ROSS 360',
    description:
      'Tell us about the property or premises you would like photographed. There is no obligation to proceed.',
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
  description: 'Professional 360° photography and interactive virtual tours for commercial premises and property, UK-wide.',
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
  if (['virtualTours', 'businesses', 'property'].includes(key)) items.push(tourService);
  return items;
}
