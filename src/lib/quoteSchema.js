// Quote form schema + validation.
// Shared by the browser form (src/components/QuoteForm.jsx) AND the Cloudflare Pages Function
// (functions/api/quote.js), so the rules cannot drift apart. Keep it dependency-free.

export const PROJECT_TYPES = [
  { value: 'business', label: 'Business 360° Tour' },
  { value: 'property', label: 'Property 360° Tour' },
  { value: 'commercial-property', label: 'Commercial Property' },
  { value: 'agency', label: 'Estate Agent / Multiple Properties' },
  { value: 'not-sure', label: 'Not sure' },
];

export const PREMISES_TYPES = [
  'Restaurant or café',
  'Gym or studio',
  'Hotel',
  'Wedding or event venue',
  'Retail or showroom',
  'Clinic',
  'Office',
  'Residential property',
  'Commercial property',
  'Other',
];

export const TIMEFRAMES = [
  'As soon as possible',
  'Within the next month',
  'In 1–3 months',
  'Flexible',
];

// Map of ?type= query values on the quote page to a project type value.
export const TYPE_PARAM_MAP = {
  business: 'business',
  property: 'property',
  agency: 'agency',
};

export const LIMITS = {
  short: 120,
  address: 300,
  long: 2000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/;
// Lenient UK postcode check (format only — we are not verifying it exists).
const POSTCODE_RE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function normaliseUrl(value) {
  if (!value) return { ok: true, value: '' };
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes('.')) return { ok: false, value };
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, value };
  }
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
    address: clean(input.address),
    postcode: clean(input.postcode).toUpperCase(),
    premisesType: clean(input.premisesType),
    size: clean(input.size),
    areas: clean(input.areas),
    timeframe: clean(input.timeframe),
    website: clean(input.website),
    googleLink: clean(input.googleLink),
    message: clean(input.message),
  };

  if (!values.name) errors.name = 'Please enter your name.';
  else if (values.name.length > LIMITS.short) errors.name = 'Please use a shorter name.';

  if (!values.business) errors.business = 'Please enter your business or organisation.';
  else if (values.business.length > LIMITS.short) errors.business = 'Please use a shorter name.';

  if (!values.email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(values.email) || values.email.length > 254)
    errors.email = 'Please enter a valid email address, like name@example.com.';

  if (values.phone && !PHONE_RE.test(values.phone))
    errors.phone = 'Please enter a valid phone number, or leave this blank.';

  if (!PROJECT_TYPES.some((t) => t.value === values.projectType))
    errors.projectType = 'Please choose the type of project.';

  if (!values.address) errors.address = 'Please enter the property or business address.';
  else if (values.address.length > LIMITS.address) errors.address = 'Please shorten the address.';

  if (!values.postcode) errors.postcode = 'Please enter the postcode.';
  else if (!POSTCODE_RE.test(values.postcode))
    errors.postcode = 'Please enter a valid UK postcode, like M1 1AA.';

  if (values.premisesType && !PREMISES_TYPES.includes(values.premisesType))
    errors.premisesType = 'Please choose one of the listed types.';

  if (values.timeframe && !TIMEFRAMES.includes(values.timeframe))
    errors.timeframe = 'Please choose one of the listed timeframes.';

  for (const key of ['size', 'areas']) {
    if (values[key].length > LIMITS.long) errors[key] = 'Please shorten this answer.';
  }

  const site = normaliseUrl(values.website);
  if (!site.ok) errors.website = 'Please enter a valid website address, like example.co.uk.';
  else values.website = site.value;

  const google = normaliseUrl(values.googleLink);
  if (!google.ok) errors.googleLink = 'Please enter a valid link.';
  else values.googleLink = google.value;

  if (values.message.length > LIMITS.long) errors.message = 'Please shorten your message.';

  return { valid: Object.keys(errors).length === 0, errors, values };
}
