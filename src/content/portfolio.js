// Portfolio. Intentionally EMPTY until there is completed ROSS 360 client work. While it is empty the
// Portfolio page shows the launch-stage message; once a project is added it lists the projects instead.
//
// Add a project ONLY when it is genuine ROSS 360 work and the client has given portfolio permission.
// Only include the client's name and location if they have agreed to them being shown.
// No placeholders, stock images, AI images or external examples (the Avalon Hotel tour is not ours).
//
// {
//   id: 'unique-slug',
//   name: 'Project or client name',      // client name only with permission
//   category: 'business' | 'property',  // shown before the sector
//   sector: 'Restaurant',               // short sector label
//   location: 'Town or city',           // optional, only with permission
//   description: 'One or two sentences about the project.',
//   image: '/images/projects/slug.jpg', // optional photograph, 3:2, ideally under ~300 KB
//   imageAlt: 'What the image shows',
//   embedUrl: 'https://…',              // optional Panoee embed URL, shown live in place of the image
//   tourUrl: 'https://…',               // public link to the tour (View tour, opens in a new tab)
// }

export const projects = [];

export const portfolio = {
  hero: {
    title: 'Our Work',
    // Shown once there are projects.
    lead: 'Explore examples of 360° virtual tours created by ROSS 360.',
    // Shown while the portfolio is empty.
    launch: [
      'Our portfolio is currently being built.',
      'We’re completing our first projects across business and property spaces, with genuine examples being added as they are completed.',
    ],
  },

  empty: {
    title: 'Portfolio in progress',
    text: 'Our first ROSS 360 projects are currently being completed. Genuine tours and case studies will be added here as the portfolio grows.',
    quote: 'Request a Quote',
    tours: 'Explore Virtual Tours',
  },

  // Written for this page.
  projectsTitle: 'Projects',
  viewTour: 'View tour',
  categories: { business: 'Business', property: 'Property' },

  closing: {
    title: 'Have a space worth exploring?',
    text: 'Request a quote for a professional 360° virtual tour.',
    cta: 'Get a Quote',
    to: '/get-a-quote',
  },
};
