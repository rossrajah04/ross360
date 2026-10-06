import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { longDate } from '../../src/lib/admin/quotes.js';

// Customer links by signing key, for rotating QUOTE_LINK_SECRET (see README). Only links customers
// can still use are counted: not disabled, on a sent quote within its viewing window.
export default function Links() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  const load = () =>
    api.links().then((result) => {
      if (result.status === 401) return;
      if (result.ok) setData(result);
      else setError(result.message || 'Could not load customer links.');
    });
  useEffect(() => {
    load();
  }, []);

  if (error && !data) return <p className="ad-error" role="alert">{error}</p>;
  if (!data) return <p className="ad-muted">Loading…</p>;

  const create = async (reference) => {
    if (!window.confirm(`Create a new customer link for ${reference}? Nothing is emailed: copy the new link from the quote and send it yourself.`)) return;
    setBusy(reference);
    setError('');
    const result = await api.newLink(reference);
    setBusy('');
    if (result.status === 401) return;
    if (!result.ok) setError(result.message || 'Something went wrong.');
    else {
      setMessage(`New link created for ${reference}. Open the quote to copy it.`);
      load();
    }
  };

  const keys = Object.entries(data.counts);
  const previous = data.affected.filter((a) => a.state === 'previous');
  const unavailable = data.affected.filter((a) => a.state === 'unavailable');

  return (
    <>
      <h1 className="ad-h1">Customer links</h1>
      {!data.configured ? (
        <p className="ad-error">Customer links are not set up (QUOTE_LINK_SECRET and QUOTE_LINK_KEY_ID). Customer pages show as unavailable.</p>
      ) : (
        <dl className="ad-facts">
          <dt>Current key</dt>
          <dd>{data.currentKeyId}</dd>
          <dt>Previous key</dt>
          <dd>{data.previousKeyId || 'None'}</dd>
        </dl>
      )}
      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {message ? <p className="ad-ok" role="status">{message}</p> : null}

      <section className="ad-section">
        <h2 className="ad-h2">Working links by key</h2>
        {keys.length ? (
          <ul className="ad-list">
            {keys.map(([key, n]) => (
              <li key={key}>
                {key}: {n} link{n === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ad-muted">No customer links in use.</p>
        )}
      </section>

      {previous.length ? (
        <section className="ad-section">
          <h2 className="ad-h2">Links that stop working when key {data.previousKeyId} is removed</h2>
          <AffectedList items={previous} busy={busy} onCreate={create} />
        </section>
      ) : data.previousKeyId ? (
        <p className="ad-note">No working link uses key {data.previousKeyId}. It can be removed.</p>
      ) : null}

      {unavailable.length ? (
        <section className="ad-section">
          <h2 className="ad-h2">Links that no longer work (their key was removed)</h2>
          <p className="ad-note">Create a new link for each quote and send it to the customer yourself.</p>
          <AffectedList items={unavailable} busy={busy} onCreate={create} />
        </section>
      ) : null}
    </>
  );
}

function AffectedList({ items, busy, onCreate }) {
  return (
    <ul className="ad-rows">
      {items.map((item) => (
        <li key={item.reference} className="ad-request">
          <div>
            <Link className="ad-link" to={`/quotes/${item.reference}`}>
              {item.reference}
            </Link>{' '}
            {item.customer} · <span className="ad-muted">valid until {longDate(item.validUntil)} · key {item.keyId}</span>
          </div>
          <button type="button" className="ad-button ad-button--quiet ad-button--small" disabled={busy === item.reference} onClick={() => onCreate(item.reference)}>
            Create new link
          </button>
        </li>
      ))}
    </ul>
  );
}
