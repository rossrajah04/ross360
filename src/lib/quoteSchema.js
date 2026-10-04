// Quote form schema + validation.
// Shared by the browser form (src/components/QuoteForm.jsx) AND the Cloudflare Pages Function
// (functions/api/quote.js), so the rules cannot drift apart. Keep it dependency-free.

export const PROJECT_TYPES = [
  { value: 'business', label: 'Business' },
  { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other' },
];

// Examples only: "Other" covers any space not listed.
export const SPACE_TYPES = [
  'Restaurant / café',
  'Gym / studio',
  'Hotel',
  'Wedding / event venue',
  'Retail / showroom',
  'Clinic / professional space',
  'Office / commercial premises',
  'Estate / letting agency',
  'Property / residential',
  'Commercial property',
  'Other',
];

export const SOURCES = ['Google', 'Referral', 'Social media', 'Website', 'Other'];

// Map of ?type= query values on the quote page to a project type value.
export const TYPE_PARAM_MAP = {
  business: 'business',
  property: 'property',
  agency: 'property',
};

export const LIMITS = {
  short: 120,
  medium: 300,
  long: 2000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function checkLength(errors, values, key, max, message = 'Please shorten this answer.') {
  if (values[key].length > max) errors[key] = message;
}

/**
 * Validate and normalise quote form values.
 * Returns { valid, errors, values } — `errors` maps field name -> message.
 */
export function validateQuote(input = {}) {
  const errors = {};
  const values = {
    name: clean(input.name),
    business: clean(input.business),
    email: clean(input.email),
    phone: clean(input.phone),
    projectType: clean(input.projectType),
    projectOther: clean(input.projectOther),
    spaceType: clean(input.spaceType),
    location: clean(input.location),
    size: clean(input.size),
    areas: clean(input.areas),
    message: clean(input.message),
    preferredDate: clean(input.preferredDate),
    source: clean(input.source),
  };

  if (!values.name) errors.name = 'Please enter your full name.';
  else checkLength(errors, values, 'name', LIMITS.short, 'Please use a shorter name.');

  if (!values.business) errors.business = 'Please enter your business or organisation.';
  else checkLength(errors, values, 'business', LIMITS.short, 'Please use a shorter name.');

  if (!values.email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(values.email) || values.email.length > 254)
    errors.email = 'Please enter a valid email address, like name@example.com.';

  if (values.phone && !PHONE_RE.test(values.phone))
    errors.phone = 'Please enter a valid phone number, or leave this blank.';

  if (!PROJECT_TYPES.some((t) => t.value === values.projectType))
    errors.projectType = 'Please choose the type of project.';

  // The explanation only applies to "Other"; it is dropped for the other project types.
  if (values.projectType !== 'other') values.projectOther = '';
  checkLength(errors, values, 'projectOther', LIMITS.medium);

  if (!values.spaceType) errors.spaceType = 'Please choose the type of business or property.';
  else if (!SPACE_TYPES.includes(values.spaceType)) errors.spaceType = 'Please choose one of the listed types.';

  if (!values.location) errors.location = 'Please enter the address or postcode.';
  else checkLength(errors, values, 'location', LIMITS.medium, 'Please shorten the address.');

  checkLength(errors, values, 'size', LIMITS.medium);

  if (!values.areas) errors.areas = 'Please tell us which areas you’d like photographed.';
  else checkLength(errors, values, 'areas', LIMITS.long);

  checkLength(errors, values, 'message', LIMITS.long);
  checkLength(errors, values, 'preferredDate', LIMITS.short);

  if (values.source && !SOURCES.includes(values.source)) errors.source = 'Please choose one of the listed options.';

  return { valid: Object.keys(errors).length === 0, errors, values };
}
