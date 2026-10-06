import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { when } from './Bits.jsx';
import { dateRequestStatusLabel, periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';

// The customer's link to a sent quote (Phase C), its views and the customer's date requests.
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
  const closeRequest = (request) => {
    if (!window.confirm(`Close the date request for ${weekdayDate(request.date)}, ${periodLabel(request.period)}? The customer is not emailed.`)) return;
    act(() => api.closeDateRequest(request.id), 'Date request closed.');
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

      <h3 className="ad-h3">Date requests</h3>
      {data.dateRequests.length ? (
        <ul className="ad-rows">
          {data.dateRequests.map((request) => (
            <li key={request.id} className="ad-request">
              <div>
                <strong>
                  {weekdayDate(request.date)}, {periodLabel(request.period)}
                </strong>{' '}
                <span className={`ad-tag ad-tag--request-${request.status}`}>{dateRequestStatusLabel(request.status)}</span>
                {request.status === 'pending' && request.slotStatus === 'closed' ? <span className="ad-tag ad-tag--slot-closed">Slot closed</span> : null}
              </div>
              <div className="ad-muted">Requested {when(request.createdAt, true)}</div>
              {request.note ? <p className="ad-pre">{request.note}</p> : null}
              {request.status === 'pending' ? (
                <button type="button" className="ad-button ad-button--quiet ad-button--small" onClick={() => closeRequest(request)} disabled={busy}>
                  Close request
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ad-muted">No date requests.</p>
      )}
      <p className="ad-note">A date request books nothing. Confirm the date with the customer yourself, then close the slot on the Availability page.</p>
    </section>
  );
}
