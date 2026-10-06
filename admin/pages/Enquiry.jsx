import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import {
  DAYLIGHT_OPTIONS,
  FIELDS,
  FLEXIBLE_OPTIONS,
  PREMISES_CONDITIONS,
  STATUSES,
  formatMoney,
  optionLabel,
  penceToPounds,
  statusLabel,
} from '../../src/lib/admin/model.js';
import { PROJECT_TYPES, SPACE_TYPES, SOURCES } from '../../src/lib/quoteSchema.js';
import { QuoteTag, StatusTag, when } from '../components/Bits.jsx';
import { periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';

const CUSTOMER_FIELDS = ['name', 'business', 'email', 'phone'];
const PROJECT_FIELDS = ['projectType', 'projectOther', 'spaceType', 'location', 'size', 'areas', 'message', 'source'];
const SCHEDULING_FIELDS = ['premisesCondition', 'daylight', 'flexibleTiming', 'preferredDateTime', 'schedulingNotes'];
const MONEY_FIELDS = ['projectValue', 'amountPaid', 'paidOn'];

const CHOICES = {
  projectType: PROJECT_TYPES,
  spaceType: SPACE_TYPES.map((value) => ({ value, label: value })),
  source: SOURCES.map((value) => ({ value, label: value })),
  premisesCondition: PREMISES_CONDITIONS,
  daylight: DAYLIGHT_OPTIONS,
  flexibleTiming: FLEXIBLE_OPTIONS,
};

const LONG_FIELDS = new Set(['areas', 'message', 'schedulingNotes']);

// Turn the stored record into the values the form inputs use.
function toForm(enquiry) {
  const values = {};
  for (const key of Object.keys(FIELDS)) {
    const raw = enquiry[key];
    values[key] = FIELDS[key].type === 'money' ? penceToPounds(raw) : raw ?? '';
  }
  return values;
}

export default function Enquiry() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const take = (result) => {
    // An ended session returns to sign-in (see api.js).
    if (result.status === 401) return false;
    if (result.ok) {
      setEnquiry(result.enquiry);
      setForm(toForm(result.enquiry));
      return true;
    }
    setError(result.message || 'Something went wrong.');
    if (result.errors) setErrors(result.errors);
    return false;
  };

  useEffect(() => {
    api.enquiry(reference).then((result) => {
      if (result.status === 404) setError('That reference does not exist.');
      else take(result);
    });
    api.quotes(reference).then((result) => {
      if (result.ok) setQuotes(result.quotes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (error && !enquiry) {
    return (
      <>
        <p className="ad-error" role="alert">
          {error}
        </p>
        <Link className="ad-link" to="/enquiries">
          Back to enquiries
        </Link>
      </>
    );
  }
  if (!enquiry) return <p className="ad-muted">Loading…</p>;

  const act = async (run, note) => {
    setBusy(true);
    setError('');
    setErrors({});
    setMessage('');
    const result = await run();
    setBusy(false);
    const ok = take(result);
    if (ok) setMessage(note);
    return ok;
  };

  const createQuote = async () => {
    setBusy(true);
    setError('');
    const result = await api.createQuote(reference);
    setBusy(false);
    if (result.status === 401) return;
    if (result.ok) navigate(`/quotes/${result.quote.reference}`);
    else setError(result.message || 'The quote could not be created.');
  };

  const save = (keys) => {
    const patch = Object.fromEntries(keys.map((key) => [key, form[key]]));
    return act(() => api.update(reference, patch), 'Saved.');
  };

  const field = (key) => {
    const spec = FIELDS[key];
    const choices = CHOICES[key];
    const id = `field-${key}`;
    return (
      <div className="ad-field" key={key}>
        <label className="ad-label" htmlFor={id}>
          {spec.label}
        </label>
        {choices ? (
          <select
            id={id}
            className="ad-input"
            value={form[key] ?? ''}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          >
            <option value="">Not set</option>
            {choices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : LONG_FIELDS.has(key) ? (
          <textarea
            id={id}
            className="ad-input ad-input--area"
            rows={4}
            value={form[key] ?? ''}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          />
        ) : (
          <input
            id={id}
            className="ad-input"
            type={spec.type === 'date' ? 'date' : spec.type === 'email' ? 'email' : 'text'}
            inputMode={spec.type === 'money' ? 'decimal' : undefined}
            value={form[key] ?? ''}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          />
        )}
        {errors[key] ? <span className="ad-field__error">{errors[key]}</span> : null}
      </div>
    );
  };

  const group = (title, keys, hint) => (
    <section className="ad-section">
      <h2 className="ad-h2">{title}</h2>
      {hint ? <p className="ad-note">{hint}</p> : null}
      <div className="ad-grid">{keys.map(field)}</div>
      <button type="button" className="ad-button" onClick={() => save(keys)} disabled={busy}>
        Save
      </button>
    </section>
  );

  return (
    <>
      <div className="ad-head">
        <div>
          <p className="ad-muted">
            <Link className="ad-link" to="/enquiries">
              Enquiries
            </Link>
          </p>
          <h1 className="ad-h1">
            {enquiry.reference}
            <StatusTag status={enquiry.status} />
          </h1>
          <p className="ad-muted">
            {enquiry.origin === 'website' ? 'From the website quote form' : 'Added in the Admin'} ·{' '}
            {when(enquiry.createdAt, true)}
          </p>
        </div>
      </div>

      {message ? (
        <p className="ad-ok" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="ad-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="ad-section">
        <h2 className="ad-h2">Status</h2>
        <div className="ad-field ad-field--inline">
          <label className="ad-label" htmlFor="status">
            Current status
          </label>
          <select
            id="status"
            className="ad-input"
            value={enquiry.status}
            disabled={busy}
            onChange={(event) =>
              act(() => api.setStatus(reference, event.target.value), `Status set to ${statusLabel(event.target.value)}.`)
            }
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <p className="ad-note">Last changed {when(enquiry.statusChangedAt, true)}.</p>
      </section>

      <section className="ad-section">
        <h2 className="ad-h2">Quotes</h2>
        {quotes === null ? (
          <p className="ad-muted">Loading…</p>
        ) : quotes.length ? (
          <ul className="ad-rows ad-quote-rows">
            {quotes.map((quote) => (
              <li key={quote.reference} className="ad-row">
                <Link className="ad-row__link ad-quote-row" to={`/quotes/${quote.reference}`}>
                  <span className="ad-row__ref">{quote.reference}</span>
                  <span>
                    {formatMoney(quote.totalPence)}
                    {quote.revisionOf ? <span className="ad-muted"> · revises {quote.revisionOf}</span> : null}
                  </span>
                  <QuoteTag status={quote.status} />
                  <span className="ad-row__date ad-muted">
                    {quote.sentAt ? `Sent ${when(quote.sentAt)}` : `Created ${when(quote.createdAt)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ad-muted">No quotes yet.</p>
        )}
        <p className="ad-actions">
          <button type="button" className="ad-button" onClick={createQuote} disabled={busy}>
            Create quote
          </button>
        </p>
      </section>

      {group('Customer', CUSTOMER_FIELDS)}
      {group('Project', PROJECT_FIELDS)}
      {group(
        'Photography scheduling',
        SCHEDULING_FIELDS,
        enquiry.preferredDate
          ? `The customer's preferred date from the form: ${enquiry.preferredDate}`
          : 'The customer gave no preferred date on the form.',
      )}
      {group('Price and payment', MONEY_FIELDS, 'Recorded by hand until payments are taken through the website.')}

      <section className="ad-section">
        <h2 className="ad-h2">Activity</h2>
        <form
          className="ad-note-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) return;
            // The typed note is kept if saving fails, and cleared only once it has been added.
            act(() => api.addNote(reference, note.trim()), 'Note added.').then((added) => {
              if (added) setNote('');
            });
          }}
        >
          <div className="ad-field">
            <label className="ad-label" htmlFor="note">
              Add a note
            </label>
            <textarea
              id="note"
              className="ad-input ad-input--area"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <button className="ad-button" type="submit" disabled={busy || !note.trim()}>
            Add note
          </button>
        </form>

        <ol className="ad-timeline">
          {enquiry.events.map((event) => (
            <li key={event.id} className="ad-timeline__item">
              <span className="ad-timeline__when ad-muted">{when(event.at, true)}</span>
              <span className="ad-timeline__what">{describe(event)}</span>
              <span className="ad-timeline__who ad-muted">{event.actor}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

// Travel as recorded on the timeline. The override reason is never recorded here; it stays on the quote.
function describeTravel(travel) {
  if (travel.mode !== 'mileage') return `Travel entered by hand: ${formatMoney(travel.travelPence)}`;
  const miles = `${(travel.oneWayTenths / 10).toFixed(1)} miles each way`;
  if (travel.overridden) {
    return `Travel: ${miles}, calculated ${formatMoney(travel.calculatedPence)}, overridden to ${formatMoney(travel.travelPence)}`;
  }
  return `Travel: ${miles}, calculated ${formatMoney(travel.travelPence)}`;
}

const slotText = (detail) => `${weekdayDate(detail.date)}, ${periodLabel(detail.period)}`;

function describe(event) {
  const { type, detail } = event;
  if (type === 'created') return detail.origin === 'website' ? 'Enquiry received from the website' : 'Enquiry added';
  if (type === 'status') return `Status changed from ${statusLabel(detail.from)} to ${statusLabel(detail.to)}`;
  if (type === 'updated') return `Updated ${detail.fields?.join(', ') || 'details'}`;
  if (type === 'note') return detail.text;
  if (type === 'notification_failed') {
    return detail.email === 'date_request'
      ? `Quote ${detail.quote}: internal email about the date request failed (${detail.status})`
      : 'Internal email notification failed';
  }
  if (type === 'quote_created') return `Quote ${detail.quote} created`;
  if (type === 'quote_updated') {
    const travel = detail.travel ? `. ${describeTravel(detail.travel)}` : '';
    return `Quote ${detail.quote} updated: ${detail.fields?.join(', ') || 'details'} (total ${formatMoney(detail.totalPence)})${travel}`;
  }
  if (type === 'quote_previewed') return `Quote ${detail.quote} previewed`;
  if (type === 'quote_sent') {
    const supersedes = detail.supersedes ? `, replacing ${detail.supersedes}` : '';
    const checked = detail.confirmedByCheck ? ' (confirmed by checking with the email service)' : '';
    return `Quote ${detail.quote} sent to ${detail.to} for ${formatMoney(detail.totalPence)}${supersedes}${checked}`;
  }
  if (type === 'quote_send_unknown') {
    return `Quote ${detail.quote}: could not confirm whether the email was sent (${detail.status}). Locked until checked`;
  }
  if (type === 'quote_send_check') return `Quote ${detail.quote}: send status checked, still not confirmed (${detail.status})`;
  if (type === 'quote_send_failed') return `Quote ${detail.quote} could not be sent (email service status ${detail.status})`;
  if (type === 'quote_revised') return `Quote ${detail.from} revised as ${detail.to}`;
  if (type === 'quote_discarded') return `Quote ${detail.quote} discarded`;
  if (type === 'quote_link_created') return `Quote ${detail.quote}: ${detail.replaced ? 'new ' : ''}customer link created (key ${detail.keyId})`;
  if (type === 'quote_link_revoked') return `Quote ${detail.quote}: customer link disabled`;
  if (type === 'quote_viewed') return `Quote ${detail.quote} viewed by the customer${detail.first ? ' for the first time' : ''}`;
  if (type === 'date_requested') {
    return `Quote ${detail.quote}: date requested, ${slotText(detail)}${detail.note ? ', with a note' : ''}. Nothing is booked`;
  }
  if (type === 'date_request_replaced') return `Quote ${detail.quote}: earlier date request (${slotText(detail)}) replaced by the customer`;
  if (type === 'date_request_closed') {
    return `Quote ${detail.quote}: date request (${slotText(detail)}) closed${detail.reason === 'slot_closed' ? ' with its slot' : ''}`;
  }
  return type;
}

export { optionLabel };
