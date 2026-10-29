import { site } from './site.js';
import { lowestPrice, streetView } from './pricing.js';
import { guides, guidesIndex } from './guides.js';

// Per-page SEO. Used by the client (src/lib/applySeo.js) AND by the build-time prerender
// script (scripts/prerender.mjs), so titles/descriptions are defined in exactly one place.
// Keep this file free of JSX and framework imports.

export const pages = {
  home: {
    path: '/',
    title: 'ROSS 360 | 360° Virtual Tours, Manchester & UK-wide',
    description: `Professional 360° virtual tours and Google Street View photography for businesses and property. Based in Manchester, working across the North West and UK-wide. Business tours from £${lowestPrice}.`,
  },
  virtualTours: {
    path: '/virtual-tours',
    title: '360° Virtual Tours in Manchester & UK-wide | ROSS 360',
    description:
      'Interactive 360° virtual tours that let visitors explore your premises online, and how a tour differs from Google Street View. Based in Manchester, working UK-wide.',
  },
  businesses: {
    path: '/businesses',
    title: '360° Virtual Tours for Businesses | Manchester & UK-wide | ROSS 360',
    description: `Professional 360° virtual tours for businesses: restaurants, hotels, gyms, venues, retail, clinics and offices. Based in Manchester, working UK-wide. Business tours from £${lowestPrice}.`,
  },
  property: {
    path: '/property',
    title: '360° Virtual Tours for Property | ROSS 360',
    description:
      'Interactive 360° virtual tours for property: estate agents, letting agents, developers and commercial property professionals. UK-wide, individually quoted.',
  },
  googleStreetView: {
    path: '/google-street-view',
    title: 'Google Street View Photography in Manchester & UK-wide | ROSS 360',
    description: `Professional 360° photographs of your premises, published to your Google Business Profile so people can look inside before they visit. From £${streetView.price}. Based in Manchester, working UK-wide.`,
  },
  portfolio: {
    path: '/portfolio',
    title: 'Portfolio | ROSS 360',
    description:
      'The ROSS 360 portfolio of 360° virtual tours and 360° photography for businesses and property.',
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
    title: 'Get a Quote | ROSS 360',
    description: `Request a quotation for a professional 360° virtual tour. Business tours from £${lowestPrice}; property tours individually quoted. UK-wide service.`,
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Notice | ROSS 360',
    description:
      'How ROSS 360 collects, uses, stores and shares personal information, including enquiries made through the Get a Quote form, and the rights you have under UK data protection law.',
  },
  terms: {
    path: '/terms',
    title: 'Terms & Conditions | ROSS 360',
    description:
      'The terms that apply to ROSS 360 360° photography and virtual tour services: quotations, payment, booking, cancellation, Google Street View, licensing and liability.',
  },
  guides: {
    path: '/guides',
    title: '360° Virtual Tour Guides | ROSS 360',
    description: guidesIndex.lead,
  },
  ...Object.fromEntries(
    guides.map((guide) => [
      `guide:${guide.slug}`,
      { path: `/guides/${guide.slug}`, title: `${guide.title} | ROSS 360`, description: guide.description },
    ]),
  ),
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

// Where ROSS 360 works: based in Manchester, covering the North West and the rest of the UK.
// No street address is published, so this stays an Organization rather than a LocalBusiness.
const areaServed = [
  { '@type': 'City', name: 'Manchester' },
  { '@type': 'AdministrativeArea', name: 'North West England' },
  { '@type': 'Country', name: 'United Kingdom' },
];

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.brand,
  url: site.url,
  email: site.email,
  telephone: site.phone.tel,
  description:
    'Professional 360° photography, interactive virtual tours and Google Street View photography for commercial premises and property. Based in Manchester, working UK-wide.',
  areaServed,
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
  areaServed,
};

const streetViewService = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Google Street View photography',
  serviceType: '360° photography published to Google Business Profiles',
  provider: { '@type': 'Organization', name: site.brand, url: site.url },
  areaServed,
};

const guideArticle = (guide) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: guide.title,
  description: guide.description,
  datePublished: guide.published,
  url: canonicalFor(`/guides/${guide.slug}`),
  author: { '@type': 'Organization', name: site.brand, url: site.url },
  publisher: { '@type': 'Organization', name: site.brand, url: site.url },
});

// Truthful structured data only: no ratings, reviews or customer counts, and no LocalBusiness.
export function jsonLdFor(key) {
  if (key === 'notFound') return [];
  const items = [organization, website];
  if (['virtualTours', 'businesses', 'property'].includes(key)) items.push(tourService);
  if (key === 'googleStreetView') items.push(streetViewService);
  if (key.startsWith('guide:')) {
    const guide = guides.find((g) => `guide:${g.slug}` === key);
    if (guide) items.push(guideArticle(guide));
  }
  return items;
}
