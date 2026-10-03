// Portfolio data. Intentionally EMPTY until there is completed ROSS 360 client work.
// While it is empty the Portfolio page shows a short, professional empty state, the filters are hidden,
// and the homepage portfolio section is not shown.
//
// Add a project ONLY when it is genuine ROSS 360 work and the client has given portfolio permission.
// Only include the client's name and location if they have agreed to them being shown.
//
// {
//   id: 'unique-slug',
//   name: 'Project or client name',     // client name only with permission
//   category: 'business' | 'property', // used by the All | Business | Property filter
//   type: 'Restaurant',                // short type label
//   location: 'Town or city',          // optional, only with permission
//   image: '/images/projects/slug.jpg',// optimised image, ideally under ~300 KB
//   imageAlt: 'Describe what the image shows',
//   tourUrl: 'https://…',              // public link to the tour (opens in a new tab)
//   embedUrl: 'https://…',             // optional Panoee embed URL (shown in place of the image)
//   description: 'One or two sentences about the project',
// }
// The first project is shown full width; the rest in two columns. Images are cropped to 3:2 (16:9 for the first).

export const projects = [];

export const portfolioFilters = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Business' },
  { id: 'property', label: 'Property' },
];
