// Portfolio. The Portfolio page opens on two photographs, Businesses and Properties; each leads to its own
// page listing that category's projects. A category with no projects shows the "in progress" band.
//
// Add a project ONLY when it is genuine ROSS 360 work and the client has given portfolio permission.
// Only include the client's name and location if they have agreed to them being shown.
// No placeholders, stock images, AI images or other people's tours.
//
// {
//   id: 'unique-slug',
//   name: 'Project or client name',      // client name only with permission
//   category: 'business' | 'property',  // which category page lists it
//   sector: 'Restaurant',               // short sector label
//   location: 'Town or city',           // optional, only with permission
//   description: 'One or two sentences about the project.',
//   image: '/images/projects/slug.jpg', // optional photograph, 3:2, ideally under ~300 KB
//   imageAlt: 'What the image shows',
//   embedUrl: 'https://…',              // optional Panoee embed URL, shown live in place of the image
//   tourUrl: 'https://…',               // public link to the tour (View tour, opens in a new tab)
// }

import { site } from './site.js';

export const projects = [
  {
    id: 'kinetic-sports-health',
    name: 'Kinetic Sports & Health',
    category: 'business',
    sector: 'Sports and health',
    description: '',
    embedUrl: site.stepInsideTour.embedUrl,
  },
];

// The two photographs on the Portfolio page.
//
// TEMPORARY IMAGERY (October 2026): both are free photographs from Unsplash (Unsplash License), used until
// ROSS 360 has its own photography of business and property spaces. They are not ROSS 360 work and not
// photographs of ROSS 360 clients. The page shows no credit (the owner asked for none; the Unsplash
// License does not require one); `credit` records the source. Replace `image` with a local file (and
// remove `credit`) once there is a ROSS 360 photograph for each.
export const categories = [
  {
    key: 'business',
    path: '/portfolio/businesses',
    seo: 'portfolioBusinesses',
    label: 'Businesses',
    title: 'Businesses',
    lead: '360° virtual tours of commercial premises completed by ROSS 360.',
    empty: 'Business projects will be added here as they are completed.',
    image:
      'https://images.unsplash.com/photo-1660557989695-14fac79c086d?fm=jpg&q=70&w=1800&auto=format&fit=crop',
    imageAlt: 'Hotel reception with a black marble desk and warm lighting',
    credit: { name: 'Dylan Calluy', url: 'https://unsplash.com/photos/reception-desk-in-hotel-lobby-8BYahZcwYgI' },
  },
  {
    key: 'property',
    path: '/portfolio/properties',
    seo: 'portfolioProperties',
    label: 'Properties',
    title: 'Properties',
    lead: '360° virtual tours of residential and commercial property completed by ROSS 360.',
    empty: 'Property projects will be added here as they are completed.',
    image:
      'https://images.unsplash.com/photo-1564078516393-cf04bd966897?fm=jpg&q=70&w=1800&auto=format&fit=crop',
    imageAlt: 'Living room with a grey chaise beside a tall window in evening light',
    credit: { name: 'Roberto Nickson', url: 'https://unsplash.com/photos/gray-padded-chaise-couch-beside-window-rEJxpBskj3Q' },
  },
];

export const portfolio = {
  hero: {
    title: 'Our Work',
    lead: 'Explore examples of 360° virtual tours created by ROSS 360.',
  },

  chooser: {
    title: 'Portfolio categories',
    view: 'View work',
  },

  empty: {
    title: 'Portfolio in progress',
    quote: 'Request a Quote',
    tours: 'Explore Virtual Tours',
  },

  back: 'Portfolio',
  projectsTitle: 'Projects',
  viewTour: 'View tour',
  categories: { business: 'Business', property: 'Property' },
};
