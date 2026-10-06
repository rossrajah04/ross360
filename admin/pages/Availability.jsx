import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { when } from '../components/Bits.jsx';
import { PERIODS, SLOT_NOTE_MAX, periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import { ukToday } from '../../src/lib/admin/quotes.js';
import { BookingTag } from './Bookings.jsx';

const monthOf = (date) =>
  new Date(`${date.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });

// The dates offered to customers (Phase C). On any date the open slots are one Full day, or Morning
// and/or Afternoon; the server enforces this. Customers see open slots from 2 days to 8 weeks ahead.
export default function Availability() {
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ date: '', period: 'am', note: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(null);

  const load = () =>
    api.availability().then((result) => {
      if (result.status === 401) return;
      if (result.ok) setSlots(result.slots);
      else setError(result.message || 'Could not load availability.');
    });
  useEffect(() => {
    load();
  }, []);

  const replace = (slot) => setSlots((list) => list.map((s) => (s.id === slot.id ? slot : s)));

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setErrors({});
    const result = await api.addSlot(form);
    setBusy(false);
    if (result.status === 401) return;
    if (!result.ok) {
      setErrors(result.errors || {});
      setError(result.message || 'Something went wrong.');
      return;
    }
    setMessage(`${weekdayDate(result.slot.date)}, ${periodLabel(result.slot.period)} is open.`);
    setForm({ ...form, note: '' });
    load();
  };

  const reopen = async (slot) => {
    setError('');
    setMessage('');
    const result = await api.reopenSlot(slot.id);
    if (result.status === 401) return;
    if (!result.ok) setError(result.message || 'Something went wrong.');
    else {
      setMessage(`${weekdayDate(slot.date)}, ${periodLabel(slot.period)} reopened.`);
      replace(result.slot);
    }
  };

  const saveNote = async (slot, note) => {
    const result = await api.slotNote(slot.id, note);
    if (result.status === 401) return;
    if (!result.ok) setError(result.message || 'Something went wrong.');
    else replace(result.slot);
  };

  if (error && !slots) return <p className="ad-error" role="alert">{error}</p>;
  if (!slots) return <p className="ad-muted">Loading…</p>;

  const months = [];
  for (const slot of slots) {
    const name = monthOf(slot.date);
    if (!months.length || months[months.length - 1].name !== name) months.push({ name, slots: [] });
    months[months.length - 1].slots.push(slot);
  }

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Availability</h1>
      </div>
      <p className="ad-note">
        Customers with a valid quote can book and pay for any open slot from 2 days to 8 weeks ahead. A slot is booked only once Stripe
        confirms payment; while a customer is paying, it is held for them for up to 30 minutes.
      </p>

      <form className="ad-section" onSubmit={add} noValidate>
        <h2 className="ad-h2">Add a slot</h2>
        <div className="ad-grid">
          <div className="ad-field">
            <label className="ad-label" htmlFor="slot-date">
              Date
            </label>
            <input
              id="slot-date"
              className="ad-input"
              type="date"
              min={ukToday()}
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            {errors.date ? <span className="ad-field__error">{errors.date}</span> : null}
          </div>
          <div className="ad-field">
            <label className="ad-label" htmlFor="slot-period">
              Period
            </label>
            <select id="slot-period" className="ad-input" value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {errors.period ? <span className="ad-field__error">{errors.period}</span> : null}
          </div>
          <div className="ad-field">
            <label className="ad-label" htmlFor="slot-note">
              Internal note (optional)
            </label>
            <input
              id="slot-note"
              className="ad-input"
              maxLength={SLOT_NOTE_MAX}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
            {errors.note ? <span className="ad-field__error">{errors.note}</span> : null}
          </div>
        </div>
        <button type="submit" className="ad-button" disabled={busy}>
          {busy ? 'Adding…' : 'Add slot'}
        </button>
      </form>

      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {message ? <p className="ad-ok" role="status">{message}</p> : null}

      {months.length ? (
        months.map((month) => (
          <section className="ad-section" key={month.name}>
            <h2 className="ad-h2">{month.name}</h2>
            <ul className="ad-slots">
              {month.slots.map((slot) => (
                <li key={slot.id} className={`ad-slot ad-slot--${slot.status}`}>
                  <div className="ad-slot__head">
                    <span className="ad-slot__when">
                      {weekdayDate(slot.date)}, {periodLabel(slot.period)}
                    </span>
                    <span className={`ad-tag ad-tag--slot-${slot.status}`}>{slot.status === 'open' ? 'Open' : 'Closed'}</span>
                    {slot.status === 'open' && !slot.booking ? (
                      <button
                        type="button"
                        className="ad-button ad-button--quiet ad-button--small"
                        onClick={() => setClosing(closing?.id === slot.id ? null : slot)}
                      >
                        Close
                      </button>
                    ) : slot.status === 'closed' ? (
                      <button type="button" className="ad-button ad-button--quiet ad-button--small" onClick={() => reopen(slot)}>
                        Reopen
                      </button>
                    ) : null}
                  </div>
                  <SlotNote slot={slot} onSave={saveNote} />
                  {slot.booking ? <SlotBooking booking={slot.booking} /> : null}
                  {closing?.id === slot.id ? (
                    <CloseSlot
                      slot={closing}
                      onCancel={() => setClosing(null)}
                      onClosed={(latest) => {
                        replace(latest);
                        setClosing(null);
                        setMessage(`${weekdayDate(latest.date)}, ${periodLabel(latest.period)} closed.`);
                      }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="ad-muted">No slots yet.</p>
      )}
    </>
  );
}

function SlotBooking({ booking }) {
  return (
    <p className="ad-slot__booking">
      <BookingTag status={booking.status} />{' '}
      <Link className="ad-link" to={`/bookings/${booking.id}`}>
        {booking.customer || 'A customer'}, {booking.quoteReference}
      </Link>
      {booking.status === 'holding' ? <span className="ad-muted"> · paying now, held until {when(booking.holdExpiresAt, true)}</span> : null}
    </p>
  );
}

function SlotNote({ slot, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slot.note);
  if (!editing) {
    return (
      <p className="ad-muted ad-slot__note">
        {slot.note ? `Note: ${slot.note} ` : ''}
        <button type="button" className="ad-link ad-link--button" onClick={() => setEditing(true)}>
          {slot.note ? 'Edit note' : 'Add note'}
        </button>
      </p>
    );
  }
  return (
    <form
      className="ad-slot__note-form"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(slot, value);
        setEditing(false);
      }}
    >
      <input className="ad-input" aria-label="Internal note" maxLength={SLOT_NOTE_MAX} value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="submit" className="ad-button ad-button--small">
        Save
      </button>
    </form>
  );
}

// Closing a slot stops new bookings for it. A slot with a booking, or a customer paying for it now,
// can't be closed: cancel or move the booking first.
function CloseSlot({ slot, onCancel, onClosed }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError('');
    const result = await api.closeSlot(slot.id);
    setBusy(false);
    if (result.status === 401) return;
    if (result.ok) onClosed(result.slot);
    else setError(result.message || 'Something went wrong.');
  };

  return (
    <div className="ad-close-slot" role="group" aria-label={`Close ${weekdayDate(slot.date)}, ${periodLabel(slot.period)}`}>
      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      <p>Close this slot? Customers will no longer be able to book it.</p>
      <div className="ad-actions">
        <button type="button" className="ad-button" onClick={confirm} disabled={busy}>
          {busy ? 'Closing…' : 'Close slot'}
        </button>
        <button type="button" className="ad-button ad-button--quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
