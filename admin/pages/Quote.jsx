import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, quotePreviewUrl } from '../api.js';
import { formatMoney, penceToPounds } from '../../src/lib/admin/model.js';
import {
  PACKAGES,
  QUOTE_LIMITS,
  calculateTotals,
  longDate,
  packageById,
  packageItem,
  typedPence,
} from '../../src/lib/admin/quotes.js';
import { QuoteTag, when } from '../components/Bits.jsx';

// The quote as the form edits it: money in pounds as typed, quantities as typed.
function toForm(quote) {
  return {
    package: quote.package || '',
    customerName: quote.customerName,
    customerBusiness: quote.customerBusiness,
    customerEmail: quote.customerEmail,
    customerLocation: quote.customerLocation,
    serviceDescription: quote.serviceDescription,
    internalNotes: quote.internalNotes,
    travel: penceToPounds(quote.travelPence || null),
    discount: penceToPounds(quote.discountPence || null),
    discountLabel: quote.discountLabel,
    validDays: String(quote.validDays),
    items: quote.items.map((item) => ({
      kind: item.kind,
      description: item.description,
      quantity: String(item.quantity),
      unit: penceToPounds(item.unitPence),
    })),
  };
}

const QUANTITY_RE = /^\d{1,2}$/;
const DAYS_RE = /^\d{1,2}$/;

// Convert the form to what the API takes (whole pence, integers). Anything that is not a valid
// number is reported here, before anything is sent.
function fromForm(form) {
  const errors = {};
  const pence = (value, key) => {
    const result = typedPence(value);
    if (Number.isNaN(result)) {
      errors[key] = 'Please enter an amount in pounds, like 349 or 349.50.';
      return 0;
    }
    return result;
  };
  const items = form.items.map((item, index) => {
    if (!QUANTITY_RE.test(item.quantity.trim())) errors[`items.${index}.quantity`] = 'Please enter a whole number from 1 to 99.';
    return {
      kind: item.kind,
      description: item.description,
      quantity: Number(item.quantity.trim()) || 0,
      unitPence: pence(item.unit, `items.${index}.unitPence`),
    };
  });
  if (!DAYS_RE.test(form.validDays.trim())) errors.validDays = 'Please enter a number of days.';
  const values = {
    package: form.package || null,
    customerName: form.customerName,
    customerBusiness: form.customerBusiness,
    customerEmail: form.customerEmail,
    customerLocation: form.customerLocation,
    serviceDescription: form.serviceDescription,
    internalNotes: form.internalNotes,
    travelPence: pence(form.travel, 'travelPence'),
    discountPence: pence(form.discount, 'discountPence'),
    discountLabel: form.discountLabel,
    validDays: Number(form.validDays.trim()) || 0,
    items,
  };
  return { values, errors };
}

export default function Quote() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [busy, setBusy] = useState(false);

  const take = (next) => {
    setQuote(next);
    const nextForm = toForm(next);
    setForm(nextForm);
    setSaved(JSON.stringify(nextForm));
  };

  // A message passed on navigation (for example after sending or revising) is shown on arrival.
  useEffect(() => {
    setMessage(location.state?.message || '');
    setError('');
  }, [location.key, location.state]);

  useEffect(() => {
    setQuote(null);
    api.quote(reference).then((result) => {
      if (result.status === 401) return;
      if (result.status === 404) setError('That quote does not exist.');
      else if (result.ok) take(result.quote);
      else setError(result.message || 'Something went wrong.');
    });
  }, [reference]);

  const live = useMemo(() => {
    if (!form) return null;
    const { values, errors: local } = fromForm(form);
    if (Object.keys(local).length) return null;
    return calculateTotals(values);
  }, [form]);

  if (error && !quote) {
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
  if (!quote || !form) return <p className="ad-muted">Loading…</p>;

  const draft = quote.status === 'draft';
  const dirty = JSON.stringify(form) !== saved;
  const set = (key, value) => setForm({ ...form, [key]: value });
  const setItem = (index, key, value) =>
    setForm({ ...form, items: form.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)) });

  // Choosing a package adds its line at the published starting price, or replaces the package line.
  const choosePackage = (id) => {
    const rest = form.items.filter((item) => item.kind !== 'package');
    const line = packageItem(id);
    setForm({
      ...form,
      package: id,
      items: line
        ? [{ kind: 'package', description: line.description, quantity: '1', unit: penceToPounds(line.unitPence) }, ...rest]
        : rest,
    });
  };
  const addLine = () =>
    setForm({ ...form, items: [...form.items, { kind: 'custom', description: '', quantity: '1', unit: '' }] });
  const removeLine = (index) => {
    const removed = form.items[index];
    setForm({
      ...form,
      package: removed.kind === 'package' ? '' : form.package,
      items: form.items.filter((_, i) => i !== index),
    });
  };
  const moveLine = (index, by) => {
    const items = [...form.items];
    const [line] = items.splice(index, 1);
    items.splice(index + by, 0, line);
    setForm({ ...form, items });
  };

  const save = async () => {
    const { values, errors: local } = fromForm(form);
    setError('');
    setMessage('');
    if (Object.keys(local).length) {
      setErrors(local);
      setError('Please check the highlighted fields.');
      return false;
    }
    setBusy(true);
    const result = await api.saveQuote(reference, { ...values, version: quote.version });
    setBusy(false);
    if (result.status === 401) return false;
    if (result.ok) {
      setErrors({});
      take(result.quote);
      setMessage('Draft saved.');
      return true;
    }
    setErrors(result.errors || {});
    setError(result.message || 'The draft could not be saved.');
    return false;
  };

  const preview = async () => {
    if (dirty && !(await save())) return;
    navigate(`/quotes/${reference}/preview`);
  };

  const discard = async () => {
    if (!window.confirm(`Discard ${reference}? It will be kept for the record but can no longer be sent.`)) return;
    setBusy(true);
    const result = await api.discardQuote(reference);
    setBusy(false);
    if (result.status === 401) return;
    if (result.quote) take(result.quote);
    if (result.ok) setMessage('Quote discarded.');
    else setError(result.message);
  };

  // Repeats the stored request under the same Idempotency-Key: Resend either reports the original
  // email (nothing new is sent) or, if the original never arrived, delivers that same email once.
  const checkSend = async () => {
    const ok = window.confirm(
      `This can deliver ${reference} to ${quote.sentTo} once.\n\nThe exact stored email is sent to Resend again with the same Idempotency-Key. If Resend already has the original request, nothing is sent again and the quote is marked sent. If the original never reached Resend, the stored email is delivered now.\n\nCheck the send status?`,
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    setMessage('');
    const result = await api.checkSend(reference);
    setBusy(false);
    if (result.status === 401) return;
    if (result.quote) take(result.quote);
    if (result.ok) setMessage(`Confirmed: ${reference} was sent to ${result.quote.sentTo}.`);
    else setError(result.message || 'The send could not be confirmed.');
  };

  const revise = async () => {
    setBusy(true);
    setError('');
    const result = await api.reviseQuote(reference);
    setBusy(false);
    if (result.status === 401) return;
    if (result.ok) navigate(`/quotes/${result.quote.reference}`, { state: { message: `Revision of ${reference} created.` } });
    else setError(result.message || 'The quote could not be revised.');
  };

  const fieldError = (key) => (errors[key] ? <span className="ad-field__error">{errors[key]}</span> : null);
  const input = (key, label, { type = 'text', area = false, hint } = {}) => (
    <div className="ad-field">
      <label className="ad-label" htmlFor={`q-${key}`}>
        {label}
      </label>
      {area ? (
        <textarea
          id={`q-${key}`}
          className="ad-input ad-input--area"
          rows={4}
          value={form[key]}
          disabled={!draft}
          onChange={(event) => set(key, event.target.value)}
        />
      ) : (
        <input
          id={`q-${key}`}
          className="ad-input"
          type={type}
          inputMode={key === 'travel' || key === 'discount' ? 'decimal' : key === 'validDays' ? 'numeric' : undefined}
          value={form[key]}
          disabled={!draft}
          onChange={(event) => set(key, event.target.value)}
        />
      )}
      {hint ? <span className="ad-note ad-note--tight">{hint}</span> : null}
      {fieldError(key === 'travel' ? 'travelPence' : key === 'discount' ? 'discountPence' : key)}
    </div>
  );

  return (
    <>
      <div className="ad-head">
        <div>
          <p className="ad-muted">
            <Link className="ad-link" to={`/enquiries/${quote.enquiryReference}`}>
              {quote.enquiryReference}
            </Link>
          </p>
          <h1 className="ad-h1">
            Quote {quote.reference}
            <QuoteTag status={quote.status} />
          </h1>
          <p className="ad-muted">
            Created {when(quote.createdAt, true)}
            {quote.revisionOf ? (
              <>
                {' '}
                · revises{' '}
                <Link className="ad-link" to={`/quotes/${quote.revisionOf}`}>
                  {quote.revisionOf}
                </Link>
              </>
            ) : null}
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

      {draft ? null : <SentSummary quote={quote} busy={busy} onRevise={revise} onCheckSend={checkSend} />}

      {draft ? (
        <>
          <section className="ad-section">
            <h2 className="ad-h2">Shown to the customer</h2>
            <p className="ad-note">Everything in this section appears on the quote the customer receives.</p>
            <div className="ad-grid">
              {input('customerName', 'Customer name')}
              {input('customerBusiness', 'Business / organisation')}
              {input('customerEmail', 'Customer email (the quote is sent here)', { type: 'email' })}
              {input('customerLocation', 'Address / postcode')}
            </div>
            <div className="ad-grid ad-grid--single">
              {input('serviceDescription', 'Service description', { area: true })}
            </div>

            <h3 className="ad-h3">Lines</h3>
            <div className="ad-field ad-field--inline">
              <label className="ad-label" htmlFor="q-package">
                Package
              </label>
              <select
                id="q-package"
                className="ad-input"
                value={form.package}
                onChange={(event) => choosePackage(event.target.value)}
              >
                <option value="">No package</option>
                {PACKAGES.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} (from {formatMoney(pkg.pence)})
                  </option>
                ))}
              </select>
              {fieldError('package')}
            </div>
            {form.package ? (
              <p className="ad-note ad-note--tight">
                The {packageById(form.package)?.name} line starts at the published price. Change its price below if
                this project needs a different figure.
              </p>
            ) : null}

            <div className="ad-lines" role="group" aria-label="Quote lines">
              {form.items.map((item, index) => (
                <div className="ad-line" key={index}>
                  <div className="ad-field ad-line__description">
                    <label className="ad-label" htmlFor={`q-item-${index}-description`}>
                      {item.kind === 'package' ? 'Package line' : `Line ${index + 1}`}
                    </label>
                    <input
                      id={`q-item-${index}-description`}
                      className="ad-input"
                      value={item.description}
                      maxLength={QUOTE_LIMITS.description}
                      onChange={(event) => setItem(index, 'description', event.target.value)}
                    />
                    {fieldError(`items.${index}.description`)}
                  </div>
                  <div className="ad-field ad-line__qty">
                    <label className="ad-label" htmlFor={`q-item-${index}-quantity`}>
                      Qty
                    </label>
                    <input
                      id={`q-item-${index}-quantity`}
                      className="ad-input"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(event) => setItem(index, 'quantity', event.target.value)}
                    />
                    {fieldError(`items.${index}.quantity`)}
                  </div>
                  <div className="ad-field ad-line__unit">
                    <label className="ad-label" htmlFor={`q-item-${index}-unit`}>
                      Unit price (£)
                    </label>
                    <input
                      id={`q-item-${index}-unit`}
                      className="ad-input"
                      inputMode="decimal"
                      value={item.unit}
                      onChange={(event) => setItem(index, 'unit', event.target.value)}
                    />
                    {fieldError(`items.${index}.unitPence`)}
                  </div>
                  <div className="ad-line__amount">
                    <span className="ad-label">Amount</span>
                    <span>{live ? formatMoney(live.items[index]?.amountPence) : '—'}</span>
                  </div>
                  <div className="ad-line__actions">
                    <button
                      type="button"
                      className="ad-button ad-button--quiet ad-button--small"
                      onClick={() => moveLine(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move line ${index + 1} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ad-button ad-button--quiet ad-button--small"
                      onClick={() => moveLine(index, 1)}
                      disabled={index === form.items.length - 1}
                      aria-label={`Move line ${index + 1} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ad-button ad-button--quiet ad-button--small"
                      onClick={() => removeLine(index)}
                      aria-label={`Remove line ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {fieldError('items')}
              <button
                type="button"
                className="ad-button ad-button--quiet"
                onClick={addLine}
                disabled={form.items.length >= QUOTE_LIMITS.maxItems}
              >
                Add line
              </button>
            </div>

            <div className="ad-grid">
              {input('travel', 'Travel (£)', { hint: 'Leave blank for none. Not shown when zero.' })}
              {input('validDays', 'Valid for (days)', { hint: 'Terms: 14 days unless the quotation says otherwise.' })}
              {input('discount', 'Discount (£, fixed amount)')}
              {input('discountLabel', 'Discount description (shown to the customer)')}
            </div>

            <dl className="ad-totals" aria-live="polite">
              <dt>Subtotal</dt>
              <dd>{live ? formatMoney(live.subtotalPence) : '—'}</dd>
              <dt>Travel</dt>
              <dd>{live ? formatMoney(typedPence(form.travel)) : '—'}</dd>
              <dt>Discount</dt>
              <dd>{live ? `−${formatMoney(typedPence(form.discount))}` : '—'}</dd>
              <dt className="ad-totals__total">Total</dt>
              <dd className="ad-totals__total">{live ? formatMoney(live.totalPence) : '—'}</dd>
            </dl>
            <p className="ad-note ad-note--tight">VAT is not charged. The total is checked again on the server when you save.</p>
          </section>

          <section className="ad-section ad-section--internal">
            <h2 className="ad-h2">Internal notes</h2>
            <p className="ad-note">Never shown to the customer: not in the preview, the email or the sent record.</p>
            <div className="ad-grid ad-grid--single">{input('internalNotes', 'Internal notes', { area: true })}</div>
          </section>

          <div className="ad-actions ad-actions--sticky">
            <button type="button" className="ad-button" onClick={save} disabled={busy || !dirty}>
              Save draft
            </button>
            <button type="button" className="ad-button" onClick={preview} disabled={busy}>
              {dirty ? 'Save and preview' : 'Preview'}
            </button>
            <button type="button" className="ad-button ad-button--quiet" onClick={discard} disabled={busy}>
              Discard draft
            </button>
            {dirty ? <span className="ad-muted">Unsaved changes</span> : null}
          </div>
        </>
      ) : (
        <section className="ad-section">
          <h2 className="ad-h2">
            {quote.status === 'discarded'
              ? 'Discarded draft'
              : quote.status === 'sent' || quote.status === 'superseded'
                ? 'Email as sent'
                : 'Email as stored for sending'}
          </h2>
          {quote.status === 'discarded' ? (
            <p className="ad-note">This draft was discarded and was never sent.</p>
          ) : null}
          <iframe
            className="ad-preview-frame"
            title={`Quote ${quote.reference}`}
            sandbox=""
            src={quotePreviewUrl(quote.reference, quote.version)}
          />
          {quote.internalNotes ? (
            <div className="ad-section--internal ad-internal-read">
              <h3 className="ad-h3">Internal notes (never sent)</h3>
              <p className="ad-pre">{quote.internalNotes}</p>
            </div>
          ) : null}
        </section>
      )}
    </>
  );
}

function SentSummary({ quote, busy, onRevise, onCheckSend }) {
  if (quote.status === 'sending' && !quote.sendStatusUnknown) {
    return (
      <p className="ad-ok" role="status">
        This quote is being sent.
      </p>
    );
  }
  if (quote.sendStatusUnknown) {
    return (
      <section className="ad-section">
        <h2 className="ad-h2">Send status unknown</h2>
        <p className="ad-error" role="status">
          We could not confirm whether this email reached {quote.sentTo}. The quote is locked: it cannot be edited,
          discarded or sent again from here.
        </p>
        <dl className="ad-facts">
          <dt>Send started</dt>
          <dd>{when(quote.sendingStartedAt, true)}</dd>
          <dt>To</dt>
          <dd>{quote.sentTo}</dd>
          <dt>Subject</dt>
          <dd>{quote.sentSubject}</dd>
        </dl>
        {quote.canCheckSend ? (
          <>
            <p className="ad-error">
              Checking can deliver this quote once. If the original request never reached Resend, checking sends the
              exact stored email to {quote.sentTo}, with the same Idempotency-Key.
            </p>
            <p className="ad-note">
              If Resend already has the original request, nothing is sent again and the quote is marked sent. Any other
              answer leaves the quote locked. This check is available until {when(quote.checkSendUntil, true)}; after
              that, reconcile it by hand as the README describes.
            </p>
            <button type="button" className="ad-button" onClick={onCheckSend} disabled={busy}>
              Check send status
            </button>
          </>
        ) : (
          <p className="ad-note">
            More than 23 hours have passed, so this can no longer be checked safely from the Admin. Look for the email
            in Resend (Emails, search for {quote.sentTo}) and for the copy in newquote@ross360.co.uk, then reconcile it by
            hand as the README describes.
          </p>
        )}
      </section>
    );
  }
  if (quote.status !== 'sent' && quote.status !== 'superseded') return null;
  const replacedBy = quote.revisions.filter((r) => r.status !== 'discarded');
  return (
    <section className="ad-section">
      <h2 className="ad-h2">Sent</h2>
      <dl className="ad-facts">
        <dt>Sent</dt>
        <dd>
          {when(quote.sentAt, true)} by {quote.sentBy}
        </dd>
        <dt>To</dt>
        <dd>{quote.sentTo}</dd>
        <dt>Total</dt>
        <dd>{formatMoney(quote.totalPence)}</dd>
        <dt>Valid until</dt>
        <dd>
          {longDate(quote.validUntil)} ({quote.validDays} days)
        </dd>
      </dl>
      {replacedBy.length ? (
        <p className="ad-note">
          Revisions:{' '}
          {replacedBy.map((r, i) => (
            <span key={r.reference}>
              {i ? ', ' : ''}
              <Link className="ad-link" to={`/quotes/${r.reference}`}>
                {r.reference}
              </Link>{' '}
              ({r.status})
            </span>
          ))}
        </p>
      ) : null}
      {quote.status === 'sent' ? (
        <>
          <p className="ad-note">A sent quote cannot be changed. To change it, revise it: you get a new draft with a new reference, and this quote is marked superseded once the revision is sent.</p>
          <button type="button" className="ad-button" onClick={onRevise} disabled={busy}>
            Revise
          </button>
        </>
      ) : null}
    </section>
  );
}
