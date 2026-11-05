import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { when } from './Bits.jsx';
import { periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import { formatMoney } from '../../src/lib/admin/model.js';
import { BookingTag } from '../pages/Bookings.jsx';

// The customer's link to a sent quote (Phase C), its views and the customer's bookings.
// Nothing here emails the customer: a new link is copied and sent by hand.
export default function CustomerLink({ quote }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.customerLink(quote.reference).then((result) => {
      if (result.status === 401) return;
      if (result.ok) setData(result.customer);
      else setError(result.message || 'Could not load the customer link.');
    });

  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.reference, quote.status]);

  if (error && !data) return <p className="ad-error" role="alert">{error}</p>;
  if (!data) return null;

  const act = async (run, done) => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await run();
    setBusy(false);
    if (result.status === 401) return;
    if (!result.ok) {
      setError(result.message || 'Something went wrong.');
      return;
    }
    if (result.customer) setData(result.customer);
    else await load();
    setMessage(done);
  };

  const revoke = () => {
    if (!window.confirm(`Disable the customer link for ${quote.reference}? It stops working at once, including the link in the email already sent.`)) return;
    act(() => api.revokeLink(quote.reference), 'Link disabled.');
  };
  const create = () => {
    const replacing = data.link ? ' The current link stops working.' : '';
    if (!window.confirm(`Create a new customer link for ${quote.reference}?${replacing} Nothing is emailed: copy the new link and send it yourself.`)) return;
    act(() => api.newLink(quote.reference), 'New link created. Copy it and send it to the customer yourself.');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.link.url);
      setMessage('Link copied.');
    } catch {
      setMessage('Select the link and copy it.');
    }
  };

  const { link } = data;
  return (
    <section className="ad-section">
      <h2 className="ad-h2">Customer link</h2>
      {!data.configured ? (
        <p className="ad-error">Customer links are not set up (QUOTE_LINK_SECRET and QUOTE_LINK_KEY_ID). Customer pages show as unavailable.</p>
      ) : null}
      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {message ? <p className="ad-ok" role="status">{message}</p> : null}

      {link ? (
        <>
          {link.url ? (
            <div className="ad-link-copy">
              <input className="ad-input" readOnly value={link.url} aria-label="Customer link" onFocus={(e) => e.target.select()} />
              <button type="button" className="ad-button ad-button--quiet" onClick={copy}>
                Copy
              </button>
            </div>
          ) : (
            <p className="ad-error">
              This link was signed with key {link.keyId}, which is no longer configured, so it no longer works. Create a new link and send it to
              the customer.
            </p>
          )}
          <dl className="ad-facts">
            <dt>Key</dt>
            <dd>{link.keyId}</dd>
            <dt>Created</dt>
            <dd>{when(link.createdAt, true)}</dd>
            <dt>Views</dt>
            <dd>
              {link.viewCount}
              {link.firstViewedAt ? ` (first ${when(link.firstViewedAt, true)}, last ${when(link.lastViewedAt, true)})` : ''}
            </dd>
          </dl>
          {!data.viewable && quote.status === 'sent' ? (
            <p className="ad-note">This quote is more than 90 days past its validity, so the page shows as no longer available.</p>
          ) : null}
        </>
      ) : (
        <p className="ad-note">
          This quote has no working customer link.
          {data.revokedLinks.length ? ` ${data.revokedLinks.length} earlier link${data.revokedLinks.length === 1 ? ' was' : 's were'} disabled.` : ''}
        </p>
      )}

      {quote.status === 'sent' ? (
        <div className="ad-actions">
          {link ? (
            <button type="button" className="ad-button ad-button--quiet" onClick={revoke} disabled={busy}>
              Disable link
            </button>
          ) : null}
          <button type="button" className="ad-button ad-button--quiet" onClick={create} disabled={busy || !data.configured}>
            {link ? 'Create new link' : 'Create customer link'}
          </button>
        </div>
      ) : null}

      {quote.status === 'sent' && quote.customerType === 'business' && !data.bookings.some((b) => ['holding', 'confirmed', 'cancel_requested'].includes(b.status)) ? (
        <BookWithoutDeposit quote={quote} onBooked={load} />
      ) : null}

      <h3 className="ad-h3">Bookings</h3>
      {data.bookings.length ? (
        <ul className="ad-rows">
          {data.bookings.map((b) => (
            <li key={b.id}>
              <Link className="ad-link" to={`/bookings/${b.id}`}>
                {weekdayDate(b.date)}, {periodLabel(b.period)}
              </Link>{' '}
              <BookingTag status={b.status} />
              <div className="ad-muted">
                Paid {formatMoney(b.paidPence)} of {formatMoney(b.totalPence)}
                {b.refundedPence ? `, refunded ${formatMoney(b.refundedPence)}` : ''}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ad-muted">No bookings.</p>
      )}
    </section>
  );
}

// Book a slot with nothing to pay now (a founding offer, or another agreed arrangement). The whole
// total becomes the balance, requested from the booking once the tour is ready.
function BookWithoutDeposit({ quote, onBooked }) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState(null);
  const [slotId, setSlotId] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setOpen(true);
    setError('');
    const result = await api.openSlots();
    if (result.ok) setSlots(result.slots);
    else if (result.status !== 401) setError(result.message || 'Could not load the open slots.');
  };

  if (!open) {
    return (
      <p>
        <button type="button" className="ad-button ad-button--quiet" onClick={start}>
          Book without deposit…
        </button>
      </p>
    );
  }
  const submit = async (event) => {
    event.preventDefault();
    const target = slots?.find((s) => String(s.id) === slotId);
    if (!target) return;
    const emailed = notify ? ' The customer is emailed a booking confirmation.' : ' Nothing is emailed.';
    if (!window.confirm(`Book ${quote.reference} for ${target.label} with no deposit?${emailed}`)) return;
    setBusy(true);
    setError('');
    const result = await api.bookWithoutDeposit(quote.reference, target.id, notify);
    setBusy(false);
    if (result.status === 401) return;
    if (!result.ok) {
      setError(result.message || 'Something went wrong.');
      return;
    }
    setOpen(false);
    onBooked();
  };
  return (
    <form className="ad-panel" onSubmit={submit}>
      <h3 className="ad-h3">Book without deposit</h3>
      <p>
        For a founding offer or another agreed arrangement. The slot is booked at once with nothing paid; the whole total is the balance, requested
        from the booking once the tour is ready.
      </p>
      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {slots && !slots.length ? <p className="ad-muted">No open slots. Open one in Availability first.</p> : null}
      {slots?.length ? (
        <>
          <div className="ad-field">
            <label className="ad-label" htmlFor="nodeposit-slot">
              Open slot
            </label>
            <select id="nodeposit-slot" className="ad-input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              <option value="">Choose a slot</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <label className="ad-check">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Email the customer a booking confirmation
          </label>
        </>
      ) : null}
      <div className="ad-actions">
        <button type="submit" className="ad-button" disabled={busy || !slotId}>
          Book slot
        </button>
        <button type="button" className="ad-button ad-button--quiet" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
