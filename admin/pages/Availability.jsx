import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { when } from '../components/Bits.jsx';
import { PERIODS, SLOT_NOTE_MAX, periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import { ukToday } from '../../src/lib/admin/quotes.js';

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
        Customers with a valid quote can send a date request for any open slot from 2 days to 8 weeks ahead. A request books nothing:
        confirm the date with the customer yourself, then close the slot.
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
                    {slot.status === 'open' ? (
                      <button
                        type="button"
                        className="ad-button ad-button--quiet ad-button--small"
                        onClick={() => setClosing(closing?.id === slot.id ? null : slot)}
                      >
                        Close
                      </button>
                    ) : (
                      <button type="button" className="ad-button ad-button--quiet ad-button--small" onClick={() => reopen(slot)}>
                        Reopen
                      </button>
                    )}
                  </div>
                  <SlotNote slot={slot} onSave={saveNote} />
                  {slot.pendingRequests.length ? (
                    <ul className="ad-list">
                      {slot.pendingRequests.map((request) => (
                        <PendingRequest key={request.id} request={request} slotClosed={slot.status === 'closed'} />
                      ))}
                    </ul>
                  ) : null}
                  {closing?.id === slot.id ? (
                    <CloseSlot
                      slot={closing}
                      onCancel={() => setClosing(null)}
                      onChanged={(latest) => {
                        replace(latest);
                        setClosing(latest);
                      }}
                      onClosed={(latest, closedRequests) => {
                        replace(latest);
                        setClosing(null);
                        setMessage(
                          `${weekdayDate(latest.date)}, ${periodLabel(latest.period)} closed${
                            closedRequests ? `, with ${closedRequests} date request${closedRequests === 1 ? '' : 's'}` : ''
                          }.`,
                        );
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

function PendingRequest({ request, slotClosed }) {
  return (
    <li>
      Date request from {request.customer || 'a customer'} on{' '}
      <Link className="ad-link" to={`/quotes/${request.quoteReference}`}>
        {request.quoteReference}
      </Link>{' '}
      (
      <Link className="ad-link" to={`/enquiries/${request.enquiryReference}`}>
        {request.enquiryReference}
      </Link>
      ), {when(request.createdAt, true)}
      {slotClosed ? <span className="ad-tag ad-tag--slot-closed">Slot closed</span> : null}
      {request.note ? <span className="ad-muted"> · “{request.note}”</span> : null}
    </li>
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

// Closing a slot: the administrator decides what happens to its pending date requests. The choice
// applies only to the requests shown here; if another arrives first, the server refuses the close and
// this reloads with it.
function CloseSlot({ slot, onCancel, onChanged, onClosed }) {
  const [requests, setRequests] = useState('close');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = slot.pendingRequests;

  const confirm = async () => {
    setBusy(true);
    setError('');
    const result = await api.closeSlot(slot, pending.length ? requests : 'close');
    setBusy(false);
    if (result.status === 401) return;
    if (result.ok) {
      onClosed(result.slot, result.closedRequests);
      return;
    }
    setError(result.message || 'Something went wrong.');
    if (result.changed && result.slot) onChanged(result.slot);
  };

  return (
    <div className="ad-close-slot" role="group" aria-label={`Close ${weekdayDate(slot.date)}, ${periodLabel(slot.period)}`}>
      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {pending.length ? (
        <>
          <p>
            {pending.length === 1 ? 'This slot has 1 pending date request.' : `This slot has ${pending.length} pending date requests.`}
          </p>
          <div className="ad-choice">
            <label className="ad-choice__option">
              <input type="radio" name={`close-${slot.id}`} checked={requests === 'close'} onChange={() => setRequests('close')} />
              Close the slot and its pending requests
            </label>
            <label className="ad-choice__option">
              <input type="radio" name={`close-${slot.id}`} checked={requests === 'keep'} onChange={() => setRequests('keep')} />
              Close the slot and keep its pending requests (marked “Slot closed”, for you to settle with the customer)
            </label>
          </div>
        </>
      ) : (
        <p>Close this slot? Customers will no longer be able to choose it.</p>
      )}
      <p className="ad-note">Customers are not emailed.</p>
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
