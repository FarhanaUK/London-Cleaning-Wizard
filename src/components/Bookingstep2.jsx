import { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../utils/funnelTrack';
import { validateStep2 } from '../utils/validation';
import { toUTCISO, showDate, todayUK } from '../utils/time';
import { Sparkle, WandIcon } from './Icons';
import { TIMES } from '../constants/timeOptions';
import { FREQUENCIES } from '../data/siteData';

const LABEL = {
  fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#5a4e44', marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 7,
};

const BTN_DARK = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', fontWeight: 500, padding: '14px 32px',
  background: '#2c2420', color: '#f5f0e8', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};

const BTN_GHOST = {
  ...BTN_DARK,
  background: 'transparent', color: '#2c2420',
  border: '1px solid rgba(200,184,154,0.4)',
};

const STEP_WRAP_STYLE = {
  display: 'flex', flexDirection: 'column', flex: 1,
};

const CARD = (selected) => ({
  border: selected ? '2px solid #c8b89a' : '2px solid rgba(200,184,154,0.2)',
  background: selected ? 'rgba(200,184,154,0.22)' : '#fdf8f3',
  boxShadow: selected ? '0 2px 10px rgba(200,184,154,0.25)' : 'none',
  padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s',
});

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function BookingStep2({ booking, onUpdate, onNext, onBack, isMobile }) {
  const today        = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [blockedDates, setBlockedDates] = useState([]);
  const [errors,       setErrors]       = useState([]);

  const [calendarRevealed, setCalendarRevealed] = useState(false);

  const bookingRef    = useRef(booking);
  const calendarRef   = useRef(null);
  const timeRef       = useRef(null);
  useEffect(() => { bookingRef.current = booking; }, [booking]);

  // Auto-reveal calendar when frequency is selected; reset date/time if frequency changes
  useEffect(() => {
    if (!booking.pkg?.showFreq) return;
    if (!booking.freq) return;
    onUpdate({ cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null });
    setCalendarRevealed(true);
    setTimeout(() => scrollTo(calendarRef), 200);
  }, [booking.freq?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollTo = (ref) => {
    if (!ref.current) return;
    const offset = window.innerWidth < 768 ? 260 : 180;
    const top = ref.current.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const revealCalendar = () => {
    setCalendarRevealed(true);
    setTimeout(() => scrollTo(calendarRef), 200);
  };

  const prevCleanDate = useRef(booking.cleanDate);
  useEffect(() => {
    if (booking.cleanDate && booking.cleanDate !== prevCleanDate.current && timeRef.current) {
      setTimeout(() => scrollTo(timeRef), 50);
    }
    prevCleanDate.current = booking.cleanDate;
  }, [booking.cleanDate]);

  useEffect(() => {
    if (booking.pkg?.showFreq) onUpdate({ freq: null, cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlocked = (y, m) =>
    fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${y}&month=${m + 1}`)
      .then(r => r.json())
      .then(data => {
        const dates = data.blocked || [];
        setBlockedDates(dates);
        if (bookingRef.current.cleanDate && dates.includes(bookingRef.current.cleanDate)) {
          onUpdate({ cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null });
          setErrors(['The date you selected is no longer available. Please choose another day.']);
        }
      })
      .catch(() => {});

  useEffect(() => {
    fetchBlocked(year, month);
    const interval = setInterval(() => fetchBlocked(year, month), 30000);
    return () => clearInterval(interval);
  }, [year, month]);

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setMonth(m); setYear(y);
  };

  const handleDateClick = (dateStr) => {
    setErrors([]);
    trackEvent('date_selected', { changed: !!booking.cleanDate });
    onUpdate({
      cleanDate:        dateStr,
      cleanDateDisplay: showDate(dateStr),
      cleanTime:        null,
      cleanDateUTC:     null,
    });
  };

  const handleTimeSelect = (time) => {
    setErrors([]);
    trackEvent('time_selected', { time, from: booking.cleanTime || null });
    onUpdate({
      cleanTime:    time,
      cleanDateUTC: toUTCISO(booking.cleanDate, time),
    });
  };

  const handleNext = async () => {
    const errs = [];
    if (booking.pkg?.showFreq && !booking.freq) errs.push('Please select how often you would like us to clean.');
    if (!booking.cleanDate) errs.push('Please select a date.');
    if (!booking.cleanTime) errs.push('Please select a time slot.');
    if (errs.length) { setErrors(errs); return; }
    try {
      const res  = await fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${year}&month=${month + 1}`);
      const data = await res.json();
      const latest = data.blocked || [];
      setBlockedDates(latest);
      if (booking.cleanDate && latest.includes(booking.cleanDate)) {
        onUpdate({ cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null });
        setErrors(['The date you selected is no longer available. Please choose another day.']);
        return;
      }
    } catch {
      // allow through on network error
    }
    setErrors([]);
    onNext();
  };

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = todayUK();
  const tomorrowStr = (() => {
    const d = new Date(`${todayStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    calDays.push(`${year}-${mm}-${dd}`);
  }

  return (
    <div style={STEP_WRAP_STYLE}>
      <style>{`
        @media (max-width:640px) {
          .step-heading { margin-top: 24px; }
          .step2-btn { padding: 11px 20px !important; font-size: 11px; }
          .bk-back-btn { margin-top: 24px; }
        }
      `}</style>
      <button className="bk-back-btn" onClick={onBack} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', padding: 0, marginBottom: 8, alignSelf: 'flex-start' }}>
        ← Back
      </button>
      {/* Frequency - only for packages that support it */}
      {booking.pkg?.showFreq && (
        <>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#1a1410', marginBottom: 14 }}>How often?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 12 }}>
            {FREQUENCIES.map(freq => (
              <div
                key={freq.id}
                onClick={() => { trackEvent('freq_selected', { freq: freq.label, from: booking.freq?.label || null }); onUpdate({ freq }); }}
                style={CARD(booking.freq?.id === freq.id)}
              >
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410', marginBottom: 3 }}>
                  {freq.label}
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 300, color: freq.saving > 0 ? '#2d6a4f' : '#8b7355' }}>
                  {freq.note}
                </div>
              </div>
            ))}
          </div>
          {booking.freq && !calendarRevealed && booking.freq.id !== 'one-off' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', padding: '10px 14px', marginBottom: 12, fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
              Your first clean is at the full price. The <strong>£{booking.freq.saving} discount</strong> applies from your second clean onwards.
              <div style={{ marginTop: 6, color: '#4b5563', fontWeight: 300 }}>
                <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" style={{ color: '#4b5563', fontWeight: 400, textDecoration: 'underline' }}>T&Cs apply</a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Calendar — shown immediately for non-frequency packages, or after user clicks Continue to Date */}
      {(!booking.pkg?.showFreq || calendarRevealed) && (
      <div ref={calendarRef}>
      <div className={!booking.pkg?.showFreq ? 'step-heading' : ''} style={LABEL}><Sparkle size={7} color="#c8b89a" /> Select Date</div>
      <div style={{ border: '1px solid rgba(200,184,154,0.35)', background: 'white', padding: 20, marginBottom: 24 }}>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => changeMonth(-1)} style={{
            background: 'none', border: '1px solid rgba(200,184,154,0.3)',
            width: 32, height: 32, cursor: 'pointer', color: '#2c2420', fontSize: 14,
          }}>←</button>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 400, color: '#1a1410' }}>
            {MONTHS[month]} {year}
          </div>
          <button onClick={() => changeMonth(1)} style={{
            background: 'none', border: '1px solid rgba(200,184,154,0.3)',
            width: 32, height: 32, cursor: 'pointer', color: '#2c2420', fontSize: 14,
          }}>→</button>
        </div>

        {/* Day names */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontFamily: "'Jost',sans-serif",
              fontSize: 10, color: '#8b7355', letterSpacing: '0.06em',
              textTransform: 'uppercase', padding: '4px 0',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {calDays.map((dateStr, i) => {
            if (!dateStr) return <div key={`empty-${i}`} />;
            const isPast         = dateStr < todayStr;
            const isTooSoon      = dateStr === todayStr || dateStr === tomorrowStr;
            const isFullyBlocked = blockedDates.includes(dateStr);
            const isBlocked      = isPast || isTooSoon || isFullyBlocked;
            const isSelected     = booking.cleanDate === dateStr;
            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (isFullyBlocked) { setErrors(['We are not available on this date. Please select another day.']); return; }
                  if (isTooSoon) { setErrors(['For cleaning jobs required urgently, please contact us directly so we can ensure we have available cleaning wizards in your area.']); return; }
                  if (!isBlocked) handleDateClick(dateStr);
                }}
                style={{
                  aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontFamily: "'Jost',sans-serif", fontWeight: 300,
                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                  background: isSelected ? '#c8b89a' : isFullyBlocked ? '#f0ece6' : 'transparent',
                  color: isBlocked ? '#ccc' : isSelected ? '#1a1410' : '#2c2420',
                  border: isSelected ? 'none' : '1px solid transparent',
                  transition: 'all 0.15s',
                  textDecoration: isFullyBlocked ? 'line-through' : 'none',
                }}
                onMouseEnter={e => { if (!isBlocked && !isSelected) e.currentTarget.style.border = '1px solid #c8b89a'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.border = '1px solid transparent'; }}
              >
                {parseInt(dateStr.split('-')[2])}
              </div>
            );
          })}
        </div>
      </div>
      </div>
      )}

      {/* Time selection — grouped Morning / Afternoon / Evening */}
      {booking.cleanDate && (
        <div ref={timeRef}>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Select Time</div>
          <div style={{ maxHeight: 190, overflowY: 'auto', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
              {TIMES.map(time => (
                <div
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  style={{
                    padding: '10px 8px', textAlign: 'center',
                    fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 300,
                    border: booking.cleanTime === time ? '1.5px solid #c8b89a' : '1px solid rgba(200,184,154,0.25)',
                    background: booking.cleanTime === time ? '#c8b89a' : '#fdf8f3',
                    color: booking.cleanTime === time ? '#1a1410' : '#2c2420',
                    cursor: 'pointer', transition: 'border 0.12s',
                  }}
                  onMouseEnter={e => { if (booking.cleanTime !== time) e.currentTarget.style.border = '1px solid #c8b89a'; }}
                  onMouseLeave={e => { if (booking.cleanTime !== time) e.currentTarget.style.border = '1px solid rgba(200,184,154,0.25)'; }}
                >
                  {time}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {errors.map((e, i) => (
            <p key={i} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 4 }}>
              {e}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 32 }}>
        <button onClick={handleNext} className="step2-btn" style={BTN_DARK}>
          <WandIcon size={14} color="#c8b89a" /> Continue to Checkout
        </button>
      </div>
    </div>
  );
}
