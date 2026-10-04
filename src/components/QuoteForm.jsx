import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PROJECT_TYPES, SPACE_TYPES, SOURCES, TYPE_PARAM_MAP, validateQuote } from '../lib/quoteSchema.js';
import { site } from '../content/site.js';
import { quote } from '../content/quote.js';
import { TextField, TextAreaField, SelectField, RadioGroup } from './FormFields.jsx';
import TurnstileWidget from './TurnstileWidget.jsx';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const GENERIC_ERROR = `We couldn't send your enquiry just now. Please try again or email ${site.email} directly.`;

// Field order, used to focus the first invalid field.
const FIELD_ORDER = [
  'name',
  'business',
  'email',
  'phone',
  'projectType',
  'projectOther',
  'spaceType',
  'location',
  'size',
  'areas',
  'message',
  'preferredDate',
  'source',
];

export default function QuoteForm() {
  const [searchParams] = useSearchParams();
  const initialType = TYPE_PARAM_MAP[searchParams.get('type')] || '';

  const [projectType, setProjectType] = useState(initialType);
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
    if (field === 'projectType') setProjectType(event.target.value);
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
    const { success } = quote;
    return (
      <div className="form-success qt-success" role="status" tabIndex={-1} ref={successRef}>
        <h2 className="h-h2">{success.title}</h2>
        <p className="qt-success__text">{success.text}</p>
        <div className="qt-success__actions">
          <Link className="h-button" to="/">
            {success.home}
          </Link>
          <Link className="h-button h-button--quiet" to="/virtual-tours">
            {success.explore}
          </Link>
        </div>
      </div>
    );
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <form className="form qt-form" onSubmit={handleSubmit} onChange={handleChange} noValidate>
      {hasErrors ? (
        <p className="form-alert" role="alert">
          Please check the highlighted fields and try again.
        </p>
      ) : null}
      {status === 'error' && serverMessage && !hasErrors ? (
        <p className="form-alert" role="alert">
          {serverMessage}
        </p>
      ) : null}

      <fieldset className="form-group">
        <legend>Contact details</legend>
        <div className="qt-row">
          <TextField id="name" label="Full name" required autoComplete="name" maxLength={120} error={errors.name} />
          <TextField
            id="business"
            label="Business / organisation"
            required
            autoComplete="organization"
            maxLength={120}
            hint={quote.businessHint}
            error={errors.business}
          />
        </div>
        <div className="qt-row">
          <TextField
            id="email"
            type="email"
            label="Email address"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            error={errors.email}
          />
          <TextField
            id="phone"
            type="tel"
            label="Phone number"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            error={errors.phone}
          />
        </div>
      </fieldset>

      <fieldset className="form-group">
        <legend>The project</legend>
        <RadioGroup
          name="projectType"
          legend="What type of project is this?"
          required
          options={PROJECT_TYPES}
          defaultValue={initialType}
          error={errors.projectType}
          className="qt-radios"
        />
        {projectType === 'other' ? (
          <TextField
            id="projectOther"
            label="Please tell us briefly what the project is"
            maxLength={300}
            error={errors.projectOther}
          />
        ) : null}
        <div className="qt-row">
          <SelectField
            id="spaceType"
            label="Business / property type"
            required
            options={SPACE_TYPES}
            placeholder="Select a type"
            error={errors.spaceType}
          />
          <TextField
            id="location"
            label="Property / business address or postcode"
            required
            autoComplete="street-address"
            maxLength={300}
            error={errors.location}
          />
        </div>
        <p className="form-group__hint qt-note">{quote.locationNote}</p>
      </fieldset>

      <fieldset className="form-group">
        <legend>The space</legend>
        <TextField
          id="size"
          label="Approximate size / number of areas"
          placeholder="e.g. 8 rooms / 1,500 sq ft / 2 floors"
          maxLength={300}
          error={errors.size}
        />
        <TextAreaField
          id="areas"
          label="Areas you'd like photographed"
          required
          rows={5}
          placeholder="Tell us which rooms, areas or parts of the space you'd like included."
          maxLength={2000}
          error={errors.areas}
        />
        <TextAreaField
          id="message"
          label="Anything else we should know?"
          rows={4}
          hint="For example: access requirements, multiple floors, an unusual layout or preferred dates."
          placeholder="Tell us anything else that may help us understand the project."
          maxLength={2000}
          error={errors.message}
        />
        <div className="qt-row">
          <TextField
            id="preferredDate"
            label="Preferred date / timing"
            hint="A preference only, to help us plan. It is not a booking."
            maxLength={120}
            error={errors.preferredDate}
          />
          <SelectField
            id="source"
            label="How did you hear about us?"
            options={SOURCES}
            placeholder="Select an option"
            error={errors.source}
          />
        </div>
      </fieldset>

      {/* Honeypot: hidden from people and assistive technology. Bots tend to fill it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="hp_field">Leave this field empty</label>
        <input id="hp_field" name="hp_field" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {TURNSTILE_SITE_KEY ? <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={handleToken} /> : null}

      <div className="qt-submit">
        <p className="qt-consent">
          {quote.consent} See our <Link to="/privacy">Privacy Notice</Link>.
        </p>
        <p className="qt-required">Fields marked * are required.</p>
        <button type="submit" className="h-button qt-submit__button" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Request a Quote'}
        </button>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {status === 'submitting' ? 'Sending your enquiry' : ''}
      </p>
    </form>
  );
}
