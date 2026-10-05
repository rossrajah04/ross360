import { Link } from 'react-router-dom';
import { formatMoney, statusLabel } from '../../src/lib/admin/model.js';

export const StatusTag = ({ status }) => (
  <span className={`ad-tag ad-tag--${status}`}>{statusLabel(status)}</span>
);

export const Money = ({ pence }) => <>{formatMoney(pence)}</>;

// Dates are stored as ISO strings; show them in UK format.
export function when(value, withTime = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function EnquiryRows({ enquiries, empty }) {
  if (!enquiries.length) return <p className="ad-muted">{empty}</p>;
  return (
    <ul className="ad-rows">
      {enquiries.map((enquiry) => (
        <li key={enquiry.reference} className="ad-row">
          <Link className="ad-row__link" to={`/enquiries/${enquiry.reference}`}>
            <span className="ad-row__ref">{enquiry.reference}</span>
            <span className="ad-row__name">
              {enquiry.business || enquiry.name}
              {enquiry.business && enquiry.name ? <span className="ad-muted"> · {enquiry.name}</span> : null}
            </span>
            <span className="ad-row__place ad-muted">{enquiry.location}</span>
            <StatusTag status={enquiry.status} />
            <span className="ad-row__date ad-muted">{when(enquiry.createdAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
