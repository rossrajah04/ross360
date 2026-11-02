import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { when } from '../components/Bits.jsx';
import { SLOT_NOTE_MAX, periodLabel, weekdayDate } from '../../src/lib/admin/availability.js';
import {
  CALENDAR_WEEKDAYS,
  SHOOT_PERIODS,
  SHOOT_WEEKDAYS,
  WEEKDAY_SHORT,
  indexSlots,
  monthGrid,
  monthKey,
  planBulk,
  planTidy,
  shiftMonth,
  slotState,
  weekdayOf,
} from '../../src/lib/admin/availabilityPlan.js';
import { addDays, ukToday } from '../../src/lib/admin/quotes.js';
import { BookingTag } from './Bookings.jsx';

const monthName = (key) =>
  new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const shortDate = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

const STATE_LABELS = { open: 'Open', closed: 'Closed', booked: 'Booked', holding: 'Paying now' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The dates offered to customers (Phase C), as a month calendar. Each date has a Morning and an
// Afternoon button: tap to open, tap again to close. Booked slots can't be closed here. On any date
// the open slots are one Full day, or Morning and/or Afternoon; the server enforces this.
export default function Availability() {
  const today = ukToday();
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [month, setMonth] = useState(monthKey(today));
  const [selected, setSelected] = useState(null);
  const [pending, setPending] = useState({});
  const [progress, setProgress] = useState(null);

  const load = () =>
    api.availability().then((result) => {
      if (result.status === 401) return;
      if (result.ok) setSlots(result.slots);
      else setError(result.message || 'Could not load availability.');
    });
  useEffect(() => {
    load();
  }, []);

  const byDate = useMemo(() => indexSlots(slots || []), [slots]);

  const upsert = (slot) =>
    setSlots((list) => (list.some((s) => s.id === slot.id) ? list.map((s) => (s.id === slot.id ? slot : s)) : [...list, slot]));

  // One step through the existing slot API. Returns the API result.
  const runStep = (step) => {
    if (step.kind === 'add') return api.addSlot({ date: step.date, period: step.period, note: '' });
    if (step.kind === 'reopen') return api.reopenSlot(step.slot.id);
    return api.closeSlot(step.slot.id);
  };

  const toggle = async (date, period) => {
    const slot = byDate.get(date)?.[period];
    const state = slotState(slot);
    if (state === 'booked' || state === 'holding') {
      setSelected(date);
      return;
    }
    const key = `${date}:${period}`;
    if (pending[key] || progress) return;
    setError('');
    setMessage('');
    setPending((p) => ({ ...p, [key]: true }));
    const step = state === 'open' ? { kind: 'close', slot } : slot ? { kind: 'reopen', slot } : { kind: 'add', date, period };
    const result = await runStep(step);
    setPending((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    if (result.status === 401) return;
    if (result.slot) upsert(result.slot);
    if (!result.ok) setError(`${shortDate(date)}, ${periodLabel(period)}: ${result.message || 'Something went wrong.'}`);
  };

  // Carry out a list of steps one at a time, then reload.
  const runAll = async (steps, done) => {
    setError('');
    setMessage('');
    if (!steps.length) {
      setMessage(done(0, []));
      return;
    }
    setProgress({ done: 0, total: steps.length });
    const failed = [];
    for (let i = 0; i < steps.length; i++) {
      const result = await runStep(steps[i]);
      if (result.status === 401) {
        setProgress(null);
        return;
      }
      if (!result.ok) failed.push({ step: steps[i], message: result.message });
      setProgress({ done: i + 1, total: steps.length });
    }
    await load();
    setProgress(null);
    setMessage(done(steps.length - failed.length, failed));
    if (failed.length) {
      const first = failed[0];
      const date = first.step.date || first.step.slot.date;
      const period = first.step.period || first.step.slot.period;
      setError(`${plural(failed.length, 'slot')} could not be changed, for example ${shortDate(date)}, ${periodLabel(period)}: ${first.message || 'Something went wrong.'}`);
    }
  };

  if (error && !slots) return <p className="ad-error" role="alert">{error}</p>;
  if (!slots) return <p className="ad-muted">Loading…</p>;

  const busy = Boolean(progress);
  const weeks = monthGrid(month);
  const inMonth = slots.filter((s) => monthKey(s.date) === month);
  const openCount = inMonth.filter((s) => slotState(s) === 'open').length;
  const bookedCount = inMonth.filter((s) => ['booked', 'holding'].includes(slotState(s))).length;
  const tidy = planTidy(slots, { today });

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Availability</h1>
      </div>
      <p className="ad-note">
        Customers with a valid quote can book and pay for any open slot from 2 days to 8 weeks ahead. A slot is booked only once Stripe
        confirms payment; while a customer is paying, it is held for them for up to 30 minutes.
      </p>

      <QuickActions
        slots={slots}
        today={today}
        tidy={tidy}
        busy={busy}
        progress={progress}
        onRun={runAll}
      />

      {error ? <p className="ad-error" role="alert">{error}</p> : null}
      {message ? <p className="ad-ok" role="status">{message}</p> : null}

      <section className="ad-section" aria-labelledby="cal-month">
        <div className="ad-cal__nav">
          <button
            type="button"
            className="ad-button ad-button--quiet ad-button--small"
            onClick={() => setMonth(shiftMonth(month, -1))}
            disabled={month <= monthKey(today)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="ad-h2 ad-cal__month" id="cal-month">
            {monthName(month)}
          </h2>
          <button
            type="button"
            className="ad-button ad-button--quiet ad-button--small"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <p className="ad-muted ad-cal__summary">
          {plural(openCount, 'open slot')}
          {bookedCount ? `, ${bookedCount} booked` : ''} this month. Tap Morning or Afternoon to open or close it.
        </p>
        <ul className="ad-cal__legend" aria-label="Key">
          <li>
            <span className="ad-pill ad-pill--open" aria-hidden="true" /> Open
          </li>
          <li>
            <span className="ad-pill ad-pill--closed" aria-hidden="true" /> Closed
          </li>
          <li>
            <span className="ad-pill ad-pill--booked" aria-hidden="true" /> Booked
          </li>
          <li>
            <span className="ad-pill ad-pill--holding" aria-hidden="true" /> Paying now
          </li>
        </ul>

        <div className="ad-cal" role="grid" aria-labelledby="cal-month">
          <div className="ad-cal__row" role="row">
            {CALENDAR_WEEKDAYS.map((d) => (
              <div
                key={d}
                role="columnheader"
                className={`ad-cal__weekday${SHOOT_WEEKDAYS.includes(d) ? ' ad-cal__weekday--shoot' : ''}`}
              >
                {WEEKDAY_SHORT[d]}
              </div>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div className="ad-cal__row" role="row" key={i}>
              {week.map((date, j) =>
                date ? (
                  <DayCell
                    key={date}
                    date={date}
                    day={byDate.get(date) || {}}
                    past={date < today}
                    isToday={date === today}
                    selected={selected === date}
                    pending={pending}
                    busy={busy}
                    onSelect={() => setSelected(selected === date ? null : date)}
                    onToggle={(period) => toggle(date, period)}
                  />
                ) : (
                  <div className="ad-cal__cell ad-cal__cell--empty" role="gridcell" key={`e${j}`} />
                ),
              )}
            </div>
          ))}
        </div>

        {selected && monthKey(selected) === month ? (
          <DayPanel
            date={selected}
            day={byDate.get(selected) || {}}
            past={selected < today}
            pending={pending}
            busy={busy}
            onToggle={(period) => toggle(selected, period)}
            onSaved={upsert}
            onError={setError}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </section>
    </>
  );
}

function QuickActions({ slots, today, tidy, busy, progress, onRun }) {
  const [weeks, setWeeks] = useState(8);
  const [custom, setCustom] = useState(false);
  const [range, setRange] = useState({ from: today, to: addDays(today, 55), weekdays: SHOOT_WEEKDAYS, periods: SHOOT_PERIODS });

  const openShootDays = () => {
    // Close any Full day slot on a shoot day first, so Morning and Afternoon can open there.
    const to = addDays(today, weeks * 7 - 1);
    const clearDays = planBulk(slots, { action: 'close', from: today, to, weekdays: SHOOT_WEEKDAYS, periods: ['day'], today });
    const open = planBulk(slots, { action: 'open', from: today, to, weekdays: SHOOT_WEEKDAYS, periods: SHOOT_PERIODS, today });
    const reopenable = clearDays.steps.length
      ? planBulk(
          slots.map((s) => (clearDays.steps.some((c) => c.slot.id === s.id) ? { ...s, status: 'closed' } : s)),
          { action: 'open', from: today, to, weekdays: SHOOT_WEEKDAYS, periods: SHOOT_PERIODS, today },
        )
      : open;
    onRun([...clearDays.steps, ...reopenable.steps], (n) =>
      n ? `Done. Thursday to Saturday, Morning and Afternoon, are open for the next ${weeks} weeks.` : 'Those slots were already open.',
    );
  };

  const closeOthers = () =>
    onRun(tidy.steps, (n) =>
      n
        ? `Closed ${plural(n, 'slot')}. Only Thursday to Saturday, Morning and Afternoon, are open now${
            tidy.booked.length ? `, plus ${plural(tidy.booked.length, 'booked slot')}` : ''
          }.`
        : 'Nothing to close.',
    );

  const runCustom = (action) => {
    const plan = planBulk(slots, { action, ...range, today });
    const { already, booked, fullDay } = plan.skipped;
    const notes = [
      already ? `${already} already ${action === 'open' ? 'open' : 'closed'}` : '',
      booked ? `${booked} booked, left open` : '',
      fullDay ? `${fullDay} skipped because of a Full day slot` : '',
    ].filter(Boolean);
    onRun(plan.steps, (n) => `${action === 'open' ? 'Opened' : 'Closed'} ${plural(n, 'slot')}.${notes.length ? ` ${notes.join(', ')}.` : ''}`);
  };

  const toggleIn = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <section className="ad-section" aria-labelledby="quick-h">
      <h2 className="ad-h2" id="quick-h">
        Quick actions
      </h2>
      <div className="ad-quick">
        <div className="ad-quick__item">
          <p>Open Thursday, Friday and Saturday, Morning and Afternoon, for the next</p>
          <div className="ad-actions">
            <select className="ad-input ad-quick__weeks" aria-label="Weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              {[4, 8, 12, 16].map((w) => (
                <option key={w} value={w}>
                  {w} weeks
                </option>
              ))}
            </select>
            <button type="button" className="ad-button" onClick={openShootDays} disabled={busy}>
              Open
            </button>
          </div>
        </div>
        <div className="ad-quick__item">
          <p>
            Close everything else (Sunday to Wednesday, and Full day slots).{' '}
            <span className="ad-muted">
              {tidy.steps.length ? `${plural(tidy.steps.length, 'slot')} to close.` : 'Nothing to close.'}
              {tidy.booked.length ? ` ${plural(tidy.booked.length, 'booked slot')} will stay as booked.` : ''}
            </span>
          </p>
          <div className="ad-actions">
            <button type="button" className="ad-button ad-button--quiet" onClick={closeOthers} disabled={busy || !tidy.steps.length}>
              Close the rest
            </button>
          </div>
        </div>
      </div>

      {progress ? (
        <p className="ad-muted" role="status">
          Working… {progress.done} of {progress.total}
        </p>
      ) : null}

      <button type="button" className="ad-link ad-link--button ad-quick__more" onClick={() => setCustom(!custom)} aria-expanded={custom}>
        {custom ? 'Hide other dates' : 'Open or close other dates'}
      </button>
      {custom ? (
        <div className="ad-panel">
          <div className="ad-grid">
            <div className="ad-field">
              <label className="ad-label" htmlFor="bulk-from">
                From
              </label>
              <input
                id="bulk-from"
                className="ad-input"
                type="date"
                min={today}
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
            </div>
            <div className="ad-field">
              <label className="ad-label" htmlFor="bulk-to">
                To
              </label>
              <input
                id="bulk-to"
                className="ad-input"
                type="date"
                min={range.from || today}
                value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
            </div>
          </div>
          <fieldset className="ad-checks">
            <legend className="ad-label">Days</legend>
            {CALENDAR_WEEKDAYS.map((d) => (
              <label key={d} className="ad-check">
                <input type="checkbox" checked={range.weekdays.includes(d)} onChange={() => setRange({ ...range, weekdays: toggleIn(range.weekdays, d) })} />
                {WEEKDAY_SHORT[d]}
              </label>
            ))}
          </fieldset>
          <fieldset className="ad-checks">
            <legend className="ad-label">Slots</legend>
            {['am', 'pm', 'day'].map((p) => (
              <label key={p} className="ad-check">
                <input
                  type="checkbox"
                  checked={range.periods.includes(p)}
                  onChange={() => {
                    // Full day can't be open with Morning or Afternoon, so it is chosen on its own.
                    const next = toggleIn(range.periods, p);
                    setRange({ ...range, periods: p === 'day' ? (next.includes('day') ? ['day'] : []) : next.filter((v) => v !== 'day') });
                  }}
                />
                {periodLabel(p)}
              </label>
            ))}
          </fieldset>
          <div className="ad-actions">
            <button
              type="button"
              className="ad-button"
              onClick={() => runCustom('open')}
              disabled={busy || !range.from || !range.to || range.from > range.to || !range.weekdays.length || !range.periods.length}
            >
              Open these
            </button>
            <button
              type="button"
              className="ad-button ad-button--quiet"
              onClick={() => runCustom('close')}
              disabled={busy || !range.from || !range.to || range.from > range.to || !range.weekdays.length || !range.periods.length}
            >
              Close these
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PeriodButton({ date, period, slot, past, pending, busy, onToggle, short }) {
  const state = slotState(slot);
  const working = pending[`${date}:${period}`];
  const locked = state === 'booked' || state === 'holding';
  const label = `${shortDate(date)}, ${periodLabel(period)}: ${STATE_LABELS[state]}`;
  return (
    <button
      type="button"
      className={`ad-pill ad-pill--${state}${working ? ' ad-pill--working' : ''}`}
      onClick={() => onToggle(period)}
      disabled={(past && !locked) || (busy && !locked) || working}
      aria-pressed={locked ? undefined : state === 'open'}
      aria-label={locked ? `${label}. Show booking.` : label}
      title={label}
    >
      {short ? <span aria-hidden="true">{period === 'day' ? 'Day' : period.toUpperCase()}</span> : periodLabel(period)}
    </button>
  );
}

function DayCell({ date, day, past, isToday, selected, pending, busy, onSelect, onToggle }) {
  const fullDay = day.day && slotState(day.day) !== 'closed';
  const periods = fullDay ? ['day'] : ['am', 'pm'];
  const hasNote = Object.values(day).some((s) => s.note);
  const shoot = SHOOT_WEEKDAYS.includes(weekdayOf(date));
  return (
    <div
      role="gridcell"
      className={`ad-cal__cell${past ? ' ad-cal__cell--past' : ''}${shoot ? ' ad-cal__cell--shoot' : ''}${selected ? ' ad-cal__cell--selected' : ''}`}
    >
      <button type="button" className={`ad-cal__date${isToday ? ' ad-cal__date--today' : ''}`} onClick={onSelect} aria-label={`${weekdayDate(date)}, details`}>
        {Number(date.slice(8))}
        {hasNote ? <span className="ad-cal__dot" aria-hidden="true" /> : null}
      </button>
      <div className="ad-cal__pills">
        {periods.map((period) => (
          <PeriodButton key={period} date={date} period={period} slot={day[period]} past={past} pending={pending} busy={busy} onToggle={onToggle} short />
        ))}
      </div>
    </div>
  );
}

function DayPanel({ date, day, past, pending, busy, onToggle, onSaved, onError, onClose }) {
  const fullDayOpen = day.day && slotState(day.day) !== 'closed';
  const halfOpen = ['am', 'pm'].some((p) => day[p] && slotState(day[p]) !== 'closed');
  const periods = fullDayOpen ? ['day'] : halfOpen ? ['am', 'pm'] : ['am', 'pm', 'day'];
  return (
    <div className="ad-panel ad-day" aria-label={weekdayDate(date)}>
      <div className="ad-day__head">
        <h3 className="ad-day__title">{weekdayDate(date)}</h3>
        <button type="button" className="ad-button ad-button--quiet ad-button--small" onClick={onClose}>
          Close panel
        </button>
      </div>
      <ul className="ad-slots">
        {periods.map((period) => {
          const slot = day[period];
          const state = slotState(slot);
          return (
            <li key={period} className="ad-slot">
              <div className="ad-slot__head">
                <span className="ad-slot__when">{periodLabel(period)}</span>
                <span className={`ad-tag ad-tag--state-${state}`}>{STATE_LABELS[state]}</span>
                {state === 'open' || state === 'closed' ? (
                  <button
                    type="button"
                    className="ad-button ad-button--quiet ad-button--small"
                    onClick={() => onToggle(period)}
                    disabled={past || busy || pending[`${date}:${period}`]}
                  >
                    {state === 'open' ? 'Close' : 'Open'}
                  </button>
                ) : null}
              </div>
              {slot ? <SlotNote slot={slot} onSaved={onSaved} onError={onError} /> : null}
              {slot?.booking ? <SlotBooking booking={slot.booking} /> : null}
            </li>
          );
        })}
      </ul>
      {periods.includes('day') && periods.length > 1 ? (
        <p className="ad-muted ad-day__hint">Full day can be open only when Morning and Afternoon are closed.</p>
      ) : null}
    </div>
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

function SlotNote({ slot, onSaved, onError }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slot.note);
  if (!editing) {
    return (
      <p className="ad-muted ad-slot__note">
        {slot.note ? `Note: ${slot.note} ` : ''}
        <button
          type="button"
          className="ad-link ad-link--button"
          onClick={() => {
            setValue(slot.note);
            setEditing(true);
          }}
        >
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
        const result = await api.slotNote(slot.id, value);
        if (result.status === 401) return;
        if (!result.ok) onError(result.message || 'Something went wrong.');
        else onSaved(result.slot);
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
