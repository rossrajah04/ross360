import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { STATUSES, parseStatusFilter, statusLabel } from '../../src/lib/admin/model.js';
import { EnquiryRows } from '../components/Bits.jsx';

export default function Enquiries() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  // A dashboard figure can link to several statuses at once; show that filter as its own option.
  const group = (parseStatusFilter(status) || []).length > 1 ? parseStatusFilter(status) : null;
  const [term, setTerm] = useState(q);
  const [enquiries, setEnquiries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setTerm(q);
  }, [q]);

  useEffect(() => {
    let current = true;
    setError('');
    api.enquiries({ q, status }).then((result) => {
      if (!current) return;
      if (result.ok) setEnquiries(result.enquiries);
      else setError(result.message || 'Could not load the enquiries.');
    });
    return () => {
      current = false;
    };
  }, [q, status]);

  const update = (next) => {
    const merged = { q, status, ...next };
    const clean = Object.fromEntries(Object.entries(merged).filter(([, value]) => value));
    setParams(clean, { replace: true });
  };

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Enquiries</h1>
        <Link className="ad-button" to="/enquiries/new">
          Add an enquiry
        </Link>
      </div>

      <form
        className="ad-search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: term.trim() });
        }}
        role="search"
      >
        <label className="ad-field ad-search__field">
          <span className="ad-label">Search by reference, customer, business, email or address</span>
          <input className="ad-input" type="search" value={term} onChange={(event) => setTerm(event.target.value)} />
        </label>
        <label className="ad-field">
          <span className="ad-label">Status</span>
          <select className="ad-input" value={status} onChange={(event) => update({ status: event.target.value })}>
            <option value="">All statuses</option>
            {group ? <option value={status}>{group.map(statusLabel).join(', ')}</option> : null}
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="ad-button" type="submit">
          Search
        </button>
        {q || status ? (
          <button type="button" className="ad-button ad-button--quiet" onClick={() => setParams({}, { replace: true })}>
            Clear
          </button>
        ) : null}
      </form>

      {error ? (
        <p className="ad-error" role="alert">
          {error}
        </p>
      ) : null}
      {enquiries === null && !error ? (
        <p className="ad-muted">Loading…</p>
      ) : (
        <EnquiryRows enquiries={enquiries || []} empty="No enquiries match." />
      )}
    </>
  );
}
