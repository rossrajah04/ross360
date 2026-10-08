import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { when } from '../components/Bits.jsx';
import { formatMoney } from '../../src/lib/admin/model.js';
import { longDate } from '../../src/lib/admin/quotes.js';
import { periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import { CANCEL_REASONS, bookingStatusLabel } from '../../src/lib/admin/booking.js';

export const BookingTag = ({ status }) => <span className={`ad-tag ad-tag--booking-${status}`}>{bookingStatusLabel(status)}</span>;

// Bookings made and paid by customers on Stripe (Phase C): cancellation requests to decide first,
// then checkouts in progress, confirmed bookings by date, and recent cancellations.
export default function Bookings() {
  const [bookings, setBookings] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api.bookings(), api.payments()]).then(([list, setup]) => {
      if (list.status === 401) return;
      if (list.ok) setBookings(list.bookings);
      else setError(list.message || 'Could not load bookings.');
      if (setup.ok) setPayments(setup);
    });
  useEffect(() => {
    load();
  }, []);

  const runNow = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await api.runScheduler();
    setBusy(false);
    if (result.status === 401) return;
    if (!result.ok) {
      setError(result.message || 'Something went wrong.');
      return;
    }
    const s = result.summary;
    setMessage(
      `Done: ${s.reminders} reminder${s.reminders === 1 ? '' : 's'} sent, ${s.cancelled} unpaid booking${s.cancelled === 1 ? '' : 's'} cancelled, ` +
        `${s.holdsReleased} expired hold${s.holdsReleased === 1 ? '' : 's'} released, ${s.refunds.succeeded} refund${s.refunds.succeeded === 1 ? '' : 's'} completed.`,
    );
    load();
  };

  if (error && !bookings) return <p className="ad-error" role="alert">{error}</p>;
  if (!bookings) return <p className="ad-muted">Loading…</p>;

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Bookings</h1>
        <button type="button" className="ad-button ad-button--quiet" onClick={runNow} disabled={busy}>
          {busy ? 'Running…' : 'Run scheduled tasks now'}
        </button>
      </div>
      {payments && !payments.available ? (
        <p className="ad-error">Online payment is off: {payments.problem} Customers see “Online booking is not available”.</p>
      ) : null}
      {payments?.mode === 'test' ? (
        <p className="ad-note">
          Stripe test mode. No real card is charged. Customer emails go only to the {payments.emailAllowlist} address
          {payments.emailAllowlist === 1 ? '' : 'es'} on EMAIL_TEST_ALLOWLIST.
        </p>
      ) : null}
      <p className="ad-note">
        Reminders, unpaid-balance cancellations and refund retries run every hour. “Run scheduled tasks now” runs the same tasks at once;
        it never does anything twice.
      </p>
      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {message ? <p className="ad-ok" role="status">{message}</p> : null}

      {bookings.length ? (
        <ul className="ad-bookings">
          {bookings.map((b) => (
            <li key={b.id} className="ad-booking-row">
              <Link className="ad-booking-row__link" to={`/bookings/${b.id}`}>
                <span className="ad-booking-row__head">
                  <span className="ad-booking-row__when">
                    {weekdayDate(b.slotDate)}, {periodLabel(b.period)}
                  </span>
                  <BookingTag status={b.status} />
                  {b.refundIssue ? <span className="ad-tag ad-tag--warn">Refund needs attention</span> : null}
                </span>
                <span>
                  {b.customerBusiness || b.customerName} · {b.quoteReference}
                </span>
                <span className="ad-muted">
                  {b.status === 'cancelled'
                    ? `${CANCEL_REASONS[b.cancelReason] || b.cancelReason} on ${when(b.cancelledAt)}. Paid ${formatMoney(b.paidPence)}, refunded ${formatMoney(b.refundedPence)}${b.retainedPence ? `, kept ${formatMoney(b.retainedPence)}` : ''}.`
                    : b.status === 'holding'
                      ? `Paying now; slot held until ${when(b.holdExpiresAt, true)}.`
                      : `Paid ${formatMoney(b.paidPence)} of ${formatMoney(b.totalPence)}${
                          b.balancePence ? `. Balance ${formatMoney(b.balancePence)} due by the end of ${longDate(b.balanceDueOn)}` : ' (in full)'
                        }.`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ad-muted">No bookings yet.</p>
      )}
    </>
  );
}
