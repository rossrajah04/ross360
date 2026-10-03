// Portfolio data. This is intentionally EMPTY: there is no completed client work yet.
// While the array is empty, the site shows a clearly labelled demo state.
//
// Add a project ONLY when it is genuine ROSS 360 work and you have the client's
// portfolio permission. Shape of a project:
//
// {
//   id: 'unique-slug',
//   name: 'Project name',
//   category: 'business' | 'property',   // used by the All | Business | Property filter
//   type: 'Restaurant',                  // free-text type label
//   location: 'Town or city',
//   image: '/images/projects/slug.jpg',  // optimised hero image (keep under ~300 KB)
//   imageAlt: 'Describe what the image shows',
//   embedUrl: 'https://…',               // Panoee embed URL (optional)
//   description: 'Short description',
//   captured: 'What was captured',
//   usage: 'How the tour can be used',
// }

export const projects = [];

// Planned project types (NOT completed projects). Shown only as a labelled outline in the demo state.
export const plannedProjectTypes = [
  'Restaurant or café',
  'Gym, studio or showroom',
  'Venue or hotel',
  'Residential property',
  'Commercial property',
];

export const portfolioFilters = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Business' },
  { id: 'property', label: 'Property' },
];
