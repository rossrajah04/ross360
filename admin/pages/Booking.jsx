import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { when } from '../components/Bits.jsx';
import { BookingTag } from './Bookings.jsx';
import { formatMoney } from '../../src/lib/admin/model.js';
import { longDate } from '../../src/lib/admin/quotes.js';
import { periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import { CANCEL_REASONS, LATE_CANCELLATION_MAX_PERCENT, PAYMENT_KINDS } from '../../src/lib/admin/booking.js';

const slotText = (date, period) => `${weekdayDate(date)}, ${periodLabel(period)}`;
const reminderText = (on, sentAt) => {
  if (!on) return 'Not applicable';
  if (sentAt === 'skipped') return `Skipped (${longDate(on)}; the 8-day reminder went instead)`;
  return sentAt ? `Sent ${when(sentAt, true)}` : `Due ${longDate(on)}`;
};

/** Pounds typed by the administrator ("120", "120.50") to pence, or null. */
function toPence(value) {
  const text = String(value).trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

// One booking: slot, payments, balance and deadline, refunds; and the controls ROSS 360 needs —
// decide a cancellation request (keep up to 50%), cancel, move to another open slot, retry a refund.
export default function Booking() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.booking(id).then((result) => {
      if (result.status === 401) return;
      if (result.ok) setData(result);
      else setError(result.message || 'Could not load the booking.');
    });
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !data) return <p className="ad-error" role="alert">{error}</p>;
  if (!data) return <p className="ad-muted">Loading…</p>;
  const b = data.booking;

  const act = async (run, done) => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await run();
    setBusy(false);
    if (result.status === 401) return false;
    if (result.booking) setData((d) => ({ ...d, booking: result.booking }));
    if (!result.ok) {
      setError(result.message || 'Something went wrong.');
      return false;
    }
    setMessage(done);
    await load();
    return true;
  };

  const active = b.status === 'confirmed' || b.status === 'cancel_requested';

  return (
    <>
      <p className="ad-muted">
        <Link className="ad-link" to="/bookings">
          Bookings
        </Link>
      </p>
      <div className="ad-head">
        <h1 className="ad-h1">{slotText(b.slotDate, b.period)}</h1>
        <BookingTag status={b.status} />
      </div>
      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {message ? <p className="ad-ok" role="status">{message}</p> : null}

      <dl className="ad-facts">
        <dt>Customer</dt>
        <dd>
          {[b.customerName, b.customerBusiness].filter(Boolean).join(', ')} · {b.customerEmail}
        </dd>
        <dt>Quote</dt>
        <dd>
          <Link className="ad-link" to={`/quotes/${b.quoteReference}`}>
            {b.quoteReference}
          </Link>{' '}
          (
          <Link className="ad-link" to={`/enquiries/${b.enquiryReference}`}>
            {b.enquiryReference}
          </Link>
          )
        </dd>
        <dt>Payment</dt>
        <dd>{b.plan === 'deposit' ? `Deposit of ${formatMoney(b.depositPence)}, then the balance` : 'In full'}</dd>
        <dt>Total</dt>
        <dd>{formatMoney(b.totalPence)}</dd>
        <dt>Paid</dt>
        <dd>{formatMoney(b.paidPence)}</dd>
        {b.status !== 'cancelled' && b.plan === 'deposit' ? (
          <>
            <dt>Balance</dt>
            <dd>{b.balancePence ? `${formatMoney(b.balancePence)}, due by the end of ${longDate(b.balanceDueOn)}` : 'Paid'}</dd>
            {b.balancePence ? (
              <>
                <dt>14-day reminder</dt>
                <dd>{reminderText(b.reminder14On, b.reminder14SentAt)}</dd>
                <dt>8-day reminder</dt>
                <dd>{reminderText(b.reminder8On, b.reminder8SentAt)}</dd>
              </>
            ) : null}
          </>
        ) : null}
        {b.status === 'holding' ? (
          <>
            <dt>Held until</dt>
            <dd>{when(b.holdExpiresAt, true)}</dd>
          </>
        ) : null}
        {b.confirmedAt ? (
          <>
            <dt>Booked</dt>
            <dd>{when(b.confirmedAt, true)}</dd>
          </>
        ) : null}
        {b.cancelRequestedAt ? (
          <>
            <dt>Cancellation asked</dt>
            <dd>{when(b.cancelRequestedAt, true)}</dd>
          </>
        ) : null}
        {b.status === 'cancelled' ? (
          <>
            <dt>Cancelled</dt>
            <dd>
              {when(b.cancelledAt, true)}: {CANCEL_REASONS[b.cancelReason] || b.cancelReason}
            </dd>
            <dt>Kept</dt>
            <dd>{formatMoney(b.retainedPence)}</dd>
            <dt>Refunded</dt>
            <dd>{formatMoney(b.refundedPence)}</dd>
          </>
        ) : null}
      </dl>

      {b.status === 'cancel_requested' ? <Decide b={b} busy={busy} act={act} /> : null}
      {b.status === 'confirmed' ? <CancelByUs b={b} busy={busy} act={act} /> : null}
      {b.status === 'confirmed' ? <Move b={b} targets={data.moveTargets} busy={busy} act={act} /> : null}

      <section className="ad-section">
        <h2 className="ad-h2">Payments</h2>
        {b.payments.length ? (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>When</th>
                  <th>Stripe</th>
                </tr>
              </thead>
              <tbody>
                {b.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{PAYMENT_KINDS[p.kind] || p.kind}</td>
                    <td>{formatMoney(p.amountPence)}</td>
                    <td>{{ open: 'Checkout open', paid: 'Paid', expired: 'Not completed', failed: 'Could not start' }[p.status] || p.status}</td>
                    <td>{when(p.paidAt || p.createdAt, true)}</td>
                    <td className="ad-muted">{p.paymentIntent || p.sessionId || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-muted">No payments.</p>
        )}
      </section>

      {b.refunds.length ? (
        <section className="ad-section">
          <h2 className="ad-h2">Refunds</h2>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {b.refunds.map((r) => (
                  <tr key={r.id}>
                    <td>{PAYMENT_KINDS[r.paymentKind] || r.paymentKind}</td>
                    <td>{formatMoney(r.amountPence)}</td>
                    <td>
                      {{ succeeded: 'Refunded', pending: 'Waiting for Stripe (retried hourly)', failed: 'Failed' }[r.status] || r.status}
                      {r.lastError ? <span className="ad-muted"> · {r.lastError}</span> : null}
                    </td>
                    <td>
                      {r.status === 'failed' ? (
                        <button
                          type="button"
                          className="ad-button ad-button--quiet ad-button--small"
                          disabled={busy}
                          onClick={() => act(() => api.retryRefund(b.id, r.id), 'Refund sent to Stripe again.')}
                        >
                          Retry refund
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {active ? (
        <p className="ad-note">
          Refunds go back to the card the customer paid with. Stripe does not return its own fee on a refund.
        </p>
      ) : null}
    </>
  );
}

// A customer asked to cancel within 48 hours: ROSS 360 decides how much to keep. Nothing is kept
// unless an amount is entered here.
function Decide({ b, busy, act }) {
  const [keep, setKeep] = useState('0');
  const [problem, setProblem] = useState('');
  const pence = toPence(keep);
  const valid = pence !== null && pence <= b.maxRetentionPence;
  const refund = valid ? b.paidPence - pence : null;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) {
      setProblem(`Enter an amount from £0 to ${formatMoney(b.maxRetentionPence)}.`);
      return;
    }
    setProblem('');
    if (!window.confirm(`Cancel this booking, keep ${formatMoney(pence)} and refund ${formatMoney(refund)} to the customer's card? The customer is emailed.`)) return;
    await act(
      () => api.cancelBooking(b.id, { reason: 'customer_late', retainPence: pence, expect: 'cancel_requested' }),
      `Cancelled. ${formatMoney(refund)} refunded, ${formatMoney(pence)} kept.`,
    );
  };

  return (
    <form className="ad-panel" onSubmit={submit} noValidate>
      <h2 className="ad-h2">Cancellation request</h2>
      <p>
        The customer asked to cancel within 48 hours of the slot. You may keep up to {LATE_CANCELLATION_MAX_PERCENT}% of the booking price (
        {formatMoney(b.maxRetentionPence)}); the rest of what they paid is refunded. Nothing is kept unless you enter an amount.
      </p>
      <p className="ad-note">
        If the customer is a consumer and booked within the last 14 days, their statutory cancellation rights may limit what you can keep. Check
        before keeping anything.
      </p>
      <div className="ad-field">
        <label className="ad-label" htmlFor="keep">
          Amount to keep (£)
        </label>
        <input id="keep" className="ad-input" inputMode="decimal" value={keep} onChange={(e) => setKeep(e.target.value)} />
        {problem ? <span className="ad-field__error">{problem}</span> : null}
      </div>
      <dl className="ad-sum">
        <dt>Paid</dt>
        <dd>{formatMoney(b.paidPence)}</dd>
        <dt>Kept</dt>
        <dd>{valid ? formatMoney(pence) : '—'}</dd>
        <dt>Refunded</dt>
        <dd>{valid ? formatMoney(refund) : '—'}</dd>
      </dl>
      <button type="submit" className="ad-button" disabled={busy}>
        Cancel and refund
      </button>
    </form>
  );
}

// ROSS 360 cancels a confirmed booking: on the customer's behalf (they asked by email or phone) or
// its own cancellation. Outside 48 hours everything paid is refunded; within 48 hours a customer's
// cancellation follows the same decision as an online request.
function CancelByUs({ b, busy, act }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('customer');
  const [keep, setKeep] = useState('0');
  const late = b.cancellationWindow !== 'free';
  const customerLate = reason === 'customer' && late;
  const pence = customerLate ? toPence(keep) : 0;
  const valid = pence !== null && pence <= b.maxRetentionPence;

  if (!open) {
    return (
      <p>
        <button type="button" className="ad-button ad-button--quiet" onClick={() => setOpen(true)}>
          Cancel booking…
        </button>
      </p>
    );
  }
  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    const refund = b.paidPence - pence;
    if (!window.confirm(`Cancel this booking and refund ${formatMoney(refund)}${pence ? `, keeping ${formatMoney(pence)}` : ''}? The customer is emailed.`)) return;
    const ok = await act(
      () => api.cancelBooking(b.id, { reason: customerLate ? 'customer_late' : reason, retainPence: pence, expect: 'confirmed' }),
      `Cancelled. ${formatMoney(refund)} refunded.`,
    );
    if (ok) setOpen(false);
  };
  return (
    <form className="ad-panel" onSubmit={submit} noValidate>
      <h2 className="ad-h2">Cancel booking</h2>
      <div className="ad-choice">
        <label className="ad-choice__option">
          <input type="radio" name="reason" checked={reason === 'customer'} onChange={() => setReason('customer')} />
          The customer asked to cancel
        </label>
        <label className="ad-choice__option">
          <input type="radio" name="reason" checked={reason === 'ross360'} onChange={() => setReason('ross360')} />
          ROSS 360 is cancelling
        </label>
      </div>
      {customerLate ? (
        <>
          <p>This is within 48 hours of the slot. You may keep up to {formatMoney(b.maxRetentionPence)}; nothing is kept unless you enter an amount.</p>
          <div className="ad-field">
            <label className="ad-label" htmlFor="keep-late">
              Amount to keep (£)
            </label>
            <input id="keep-late" className="ad-input" inputMode="decimal" value={keep} onChange={(e) => setKeep(e.target.value)} />
            {!valid ? <span className="ad-field__error">Enter an amount from £0 to {formatMoney(b.maxRetentionPence)}.</span> : null}
          </div>
        </>
      ) : (
        <p>Everything paid ({formatMoney(b.paidPence)}) is refunded in full.</p>
      )}
      <div className="ad-actions">
        <button type="submit" className="ad-button" disabled={busy || !valid}>
          Cancel and refund
        </button>
        <button type="button" className="ad-button ad-button--quiet" onClick={() => setOpen(false)} disabled={busy}>
          Keep booking
        </button>
      </div>
    </form>
  );
}

// Move to another open slot, keeping the payments. The customer is emailed the new date.
function Move({ b, targets, busy, act }) {
  const [slotId, setSlotId] = useState('');
  if (!targets?.length) return null;
  const submit = async (event) => {
    event.preventDefault();
    const target = targets.find((s) => String(s.id) === slotId);
    if (!target || !window.confirm(`Move this booking to ${target.label}? Payments are kept and the customer is emailed.`)) return;
    await act(() => api.moveBooking(b.id, target.id), `Moved to ${target.label}.`);
    setSlotId('');
  };
  return (
    <form className="ad-panel" onSubmit={submit}>
      <h2 className="ad-h2">Move to another slot</h2>
      <div className="ad-field">
        <label className="ad-label" htmlFor="move-slot">
          Open slot
        </label>
        <select id="move-slot" className="ad-input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
          <option value="">Choose a slot</option>
          {targets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="ad-button" disabled={busy || !slotId}>
        Move booking
      </button>
    </form>
  );
}
