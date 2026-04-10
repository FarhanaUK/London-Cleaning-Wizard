import { useState, useEffect, useRef } from 'react';
import { validateStep2 } from '../utils/validation';
import { toUTCISO, showDate, todayUK } from '../utils/time';
import { Sparkle, WandIcon } from './Icons';

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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TIMES  = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM'];

export default function BookingStep2({ booking, onUpdate, onNext, onBack }) {
  const today        = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [blockedDates, setBlockedDates] = useState([]);
  const [error,        setError]        = useState('');

  const bookingRef = useRef(booking);
  useEffect(() => { bookingRef.current = booking; }, [booking]);

  const fetchBlocked = (y, m) =>
    fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${y}&month=${m + 1}`)
      .then(r => r.json())
      .then(data => {
        const dates = data.blocked || [];
        setBlockedDates(dates);
        if (bookingRef.current.cleanDate && dates.includes(bookingRef.current.cleanDate)) {
          onUpdate({ cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null });
          setError('The date you selected is no longer available. Please choose another day.');
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
    setError('');
    onUpdate({
      cleanDate:        dateStr,
      cleanDateDisplay: showDate(dateStr),
      cleanTime:        null,
      cleanDateUTC:     null,
    });
  };

  const handleTimeSelect = (time) => {
    onUpdate({
      cleanTime:    time,
      cleanDateUTC: toUTCISO(booking.cleanDate, time),
    });
  };

  const handleNext = async () => {
    const err = validateStep2(booking);
    if (err) { setError(err); return; }
    try {
      const res  = await fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${year}&month=${month + 1}`);
      const data = await res.json();
      const latest = data.blocked || [];
      setBlockedDates(latest);
      if (booking.cleanDate && latest.includes(booking.cleanDate)) {
        onUpdate({ cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null });
        setError('The date you selected is no longer available. Please choose another day.');
        return;
      }
    } catch {
      // allow through on network error
    }
    setError('');
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
    <div>
      {/* Calendar */}
      <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Select Date</div>
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
                  if (isFullyBlocked) { setError('We are not available on this date. Please select another day.'); return; }
                  if (isTooSoon) { setError('For cleaning jobs required urgently, please contact us directly so we can ensure we have available cleaning wizards in your area.'); return; }
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

      {/* Time selection */}
      {booking.cleanDate && (
        <>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Select Time</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 }}>
            {TIMES.map(time => (
              <div
                key={time}
                onClick={() => handleTimeSelect(time)}
                style={{
                  padding: '13px 8px', textAlign: 'center',
                  fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 300,
                  border: booking.cleanTime === time ? '1.5px solid #c8b89a' : '1px solid rgba(200,184,154,0.35)',
                  background: booking.cleanTime === time ? '#c8b89a' : '#fdf8f3',
                  color: booking.cleanTime === time ? '#1a1410' : '#2c2420',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { if (booking.cleanTime !== time) e.currentTarget.style.border = '1px solid #c8b89a'; }}
                onMouseLeave={e => { if (booking.cleanTime !== time) e.currentTarget.style.border = '1px solid rgba(200,184,154,0.35)'; }}
              >
                {time}
              </div>
            ))}
          </div>
        </>
      )}

      {error && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={BTN_GHOST}>← Back</button>
        <button onClick={handleNext} style={BTN_DARK}>
          <WandIcon size={14} color="#c8b89a" /> Continue to Details
        </button>
      </div>
    </div>
  );
}
