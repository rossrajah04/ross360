import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { DASHBOARD_GROUPS, formatMoney, statusFilter } from '../../src/lib/admin/model.js';
import { EnquiryRows } from '../components/Bits.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then((result) => (result.ok ? setData(result) : setError(result.message || 'Could not load the dashboard.')));
  }, []);

  if (error) return <p className="ad-error" role="alert">{error}</p>;
  if (!data) return <p className="ad-muted">Loading…</p>;

  const { counts } = data;
  const monthName = new Date(`${data.month}-01T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  // Each figure links to the list of exactly the statuses it counts (DASHBOARD_GROUPS).
  const list = (group) => `/enquiries?status=${statusFilter(DASHBOARD_GROUPS[group])}`;
  const figures = [
    { label: 'New enquiries', value: counts.newEnquiries, to: list('newEnquiries') },
    { label: 'Quotes awaiting response', value: counts.quotesAwaiting, to: list('quotesAwaiting') },
    { label: 'Upcoming bookings', value: counts.upcomingBookings, to: list('upcomingBookings') },
    { label: 'Jobs in production', value: counts.inProduction, to: list('inProduction') },
    { label: 'Payments outstanding', value: formatMoney(data.paymentsOutstandingPence) },
    { label: `Revenue, ${monthName}`, value: formatMoney(data.monthlyRevenuePence) },
  ];

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Dashboard</h1>
        <Link className="ad-button" to="/enquiries/new">
          Add an enquiry
        </Link>
      </div>

      <ul className="ad-figures">
        {figures.map((figure) => (
          <li key={figure.label} className="ad-figure">
            {figure.to ? (
              <Link to={figure.to} className="ad-figure__link">
                <span className="ad-figure__value">{figure.value}</span>
                <span className="ad-figure__label">{figure.label}</span>
              </Link>
            ) : (
              <>
                <span className="ad-figure__value">{figure.value}</span>
                <span className="ad-figure__label">{figure.label}</span>
              </>
            )}
          </li>
        ))}
      </ul>

      <p className="ad-note">
        Payment figures come from the agreed price, amount received and date received recorded on each enquiry.
      </p>

      <section className="ad-section">
        <h2 className="ad-h2">New enquiries</h2>
        <EnquiryRows enquiries={data.lists.newEnquiries} empty="No new enquiries." />
      </section>

      <section className="ad-section">
        <h2 className="ad-h2">Upcoming bookings</h2>
        <EnquiryRows enquiries={data.lists.upcomingBookings} empty="No bookings yet." />
      </section>

      <section className="ad-section">
        <h2 className="ad-h2">Jobs in production</h2>
        <EnquiryRows enquiries={data.lists.inProduction} empty="Nothing in production." />
      </section>
    </>
  );
}
