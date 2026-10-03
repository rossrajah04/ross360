import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PROJECT_TYPES,
  PREMISES_TYPES,
  TIMEFRAMES,
  TYPE_PARAM_MAP,
  validateQuote,
} from '../lib/quoteSchema.js';
import { site } from '../content/site.js';
import { TextField, TextAreaField, SelectField, RadioGroup } from './FormFields.jsx';
import TurnstileWidget from './TurnstileWidget.jsx';
import Button from './Button.jsx';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const GENERIC_ERROR = `Your enquiry could not be sent. Please try again, or email ${site.email}.`;

// Field order, used to focus the first invalid field.
const FIELD_ORDER = [
  'name',
  'business',
  'email',
  'phone',
  'projectType',
  'address',
  'postcode',
  'premisesType',
  'size',
  'areas',
  'timeframe',
  'website',
  'googleLink',
  'message',
];

export default function QuoteForm() {
  const [searchParams] = useSearchParams();
  const initialType = TYPE_PARAM_MAP[searchParams.get('type')] || '';

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [serverMessage, setServerMessage] = useState('');
  const [token, setToken] = useState('');
  // Recorded once when the form first renders; the server uses it as a basic anti-bot timing check.
  const [startedAt] = useState(() => Date.now());

  const successRef = useRef(null);
  // Move focus to the confirmation once it appears, so screen-reader and keyboard users hear it.
  useEffect(() => {
    if (status === 'success' && successRef.current) successRef.current.focus();
  }, [status]);

  const handleToken = useCallback((value) => setToken(value), []);

  // Clear a field's error as soon as the visitor edits it. Returns the same object when
  // nothing changes, so React skips the re-render.
  const handleChange = useCallback((event) => {
    const field = event.target.name;
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (status === 'submitting') return;

      const form = event.currentTarget;
      const raw = Object.fromEntries(new FormData(form).entries());
      const result = validateQuote(raw);

      if (!result.valid) {
        setErrors(result.errors);
        setStatus('idle');
        setServerMessage('');
        const first = FIELD_ORDER.find((field) => result.errors[field]);
        const target = first ? form.querySelector(`[name="${first}"]`) : null;
        if (target) target.focus();
        return;
      }

      if (TURNSTILE_SITE_KEY && !token) {
        setStatus('error');
        setServerMessage('Please complete the spam check before sending.');
        return;
      }

      setErrors({});
      setServerMessage('');
      setStatus('submitting');

      try {
        const response = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...result.values,
            hp: raw.hp_field || '',
            startedAt,
            turnstileToken: token,
          }),
        });
        const data = await response.json().catch(() => null);

        if (response.ok && data && data.ok) {
          setStatus('success');
          return;
        }
        if (data && data.errors) setErrors(data.errors);
        setServerMessage((data && data.message) || GENERIC_ERROR);
        setStatus('error');
      } catch {
        setServerMessage(GENERIC_ERROR);
        setStatus('error');
      }
    },
    [status, startedAt, token],
  );

  if (status === 'success') {
    return (
      <div className="form-success" role="status" tabIndex={-1} ref={successRef}>
        <h2>Thank you.</h2>
        <p>Your enquiry has been received.</p>
        <p>We’ll review the details and respond with a quotation or any information we need to prepare one.</p>
        <Button to="/" variant="secondary">
          Return to the home page
        </Button>
      </div>
    );
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <form className="form" onSubmit={handleSubmit} onChange={handleChange} noValidate>
      {hasErrors ? (
        <p className="form-alert" role="alert">
          Please check the highlighted fields and try again.
        </p>
      ) : null}
      {status === 'error' && serverMessage ? (
        <p className="form-alert" role="alert">
          {serverMessage}
        </p>
      ) : null}

      <fieldset className="form-group">
        <legend>Your details</legend>
        <TextField id="name" label="Name" required autoComplete="name" error={errors.name} />
        <TextField
          id="business"
          label="Business / organisation"
          required
          autoComplete="organization"
          error={errors.business}
        />
        <TextField
          id="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          inputMode="email"
          error={errors.email}
        />
        <TextField
          id="phone"
          type="tel"
          label="Phone"
          autoComplete="tel"
          inputMode="tel"
          error={errors.phone}
        />
      </fieldset>

      <fieldset className="form-group">
        <legend>Project</legend>
        <RadioGroup
          name="projectType"
          legend="Project type"
          required
          options={PROJECT_TYPES}
          defaultValue={initialType}
          error={errors.projectType}
        />
      </fieldset>

      <fieldset className="form-group">
        <legend>Location</legend>
        <p className="form-group__hint">Used to assess travel and plan the visit. ROSS 360 works UK-wide.</p>
        <TextField
          id="address"
          label="Property / business address"
          required
          autoComplete="street-address"
          error={errors.address}
        />
        <TextField
          id="postcode"
          label="Postcode"
          required
          autoComplete="postal-code"
          autoCapitalize="characters"
          error={errors.postcode}
        />
      </fieldset>

      <fieldset className="form-group">
        <legend>About the space</legend>
        <SelectField
          id="premisesType"
          label="Type"
          options={PREMISES_TYPES}
          placeholder="Select a type"
          error={errors.premisesType}
        />
        <TextField
          id="size"
          label="Approximate size / rooms"
          hint="For example: about 120 m², or a 3-bedroom house."
          error={errors.size}
        />
        <TextAreaField
          id="areas"
          label="Areas to capture"
          rows={3}
          hint="For example: dining room, bar and terrace, or every room plus the garden."
          error={errors.areas}
        />
        <SelectField
          id="timeframe"
          label="Preferred timeframe"
          options={TIMEFRAMES}
          placeholder="Select a timeframe"
          error={errors.timeframe}
        />
      </fieldset>

      <fieldset className="form-group">
        <legend>Anything else</legend>
        <TextField
          id="website"
          label="Website"
          autoComplete="url"
          inputMode="url"
          error={errors.website}
        />
        <TextField
          id="googleLink"
          label="Google Maps / Business Profile link"
          inputMode="url"
          error={errors.googleLink}
        />
        <TextAreaField
          id="message"
          label="Additional information"
          rows={4}
          hint="Access arrangements, deadlines, or anything else that would help us quote accurately."
          error={errors.message}
        />
      </fieldset>

      {/* Honeypot: hidden from people and assistive technology. Bots tend to fill it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="hp_field">Leave this field empty</label>
        <input id="hp_field" name="hp_field" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {TURNSTILE_SITE_KEY ? <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={handleToken} /> : null}

      <p className="small">
        There is no obligation to proceed. Fields marked * are required. See our{' '}
        <Link to="/privacy">Privacy Notice</Link>.
      </p>

      <button type="submit" className="btn btn--primary btn--block" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Request a Quote'}
      </button>
      <p className="visually-hidden" aria-live="polite">
        {status === 'submitting' ? 'Sending your enquiry' : ''}
      </p>
    </form>
  );
}
