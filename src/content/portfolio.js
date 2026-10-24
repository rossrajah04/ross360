// Portfolio. The Portfolio page lists every project with its live tour (October 2026: the Businesses and
// Properties photographs and category pages were removed at ROSS 360's request until there is property
// work to show; /portfolio/businesses and /portfolio/properties redirect to /portfolio).
//
// Add a project ONLY when it is genuine ROSS 360 work and the client has given portfolio permission.
// Only include the client's name and location if they have agreed to them being shown.
// No placeholders, stock images, AI images or other people's tours.
//
// {
//   id: 'unique-slug',
//   name: 'Project or client name',      // client name only with permission
//   category: 'business' | 'property',  // kept for when the categories return
//   sector: 'Restaurant',               // short sector label
//   location: 'Town or city',           // optional, only with permission
//   description: 'One or two sentences about the project.',
//   image: '/images/projects/slug.jpg', // optional photograph, 3:2, ideally under ~300 KB
//   imageAlt: 'What the image shows',
//   embedUrl: 'https://…',              // optional Panoee embed URL, shown live in place of the image
//   tourUrl: 'https://…',               // optional public link for "Open the full tour" (defaults to embedUrl)
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
  {
    id: 'sabai-studio',
    name: 'Sabai Studio',
    category: 'business',
    sector: 'Pilates studio',
    description: '',
    embedUrl: 'https://tour.panoee.net/iframe/6ad763402ae6ddc50a7908a8?embedFullscreen=1&embedVr=1&embedGyro=1',
  },
];

export const portfolio = {
  hero: {
    title: 'Our Work',
    lead: 'Explore examples of 360° virtual tours created by ROSS 360.',
  },

  projectsTitle: 'Projects',
  openTour: 'Open the full tour',
  createdBy: 'Created by ROSS 360.',
};
