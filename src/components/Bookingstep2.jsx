import { useState, useEffect } from 'react';
import { validateStep2 } from '../utils/validation';
import { isWeekend, isToday, toUTCISO, showDate, todayUK } from '../utils/time';
import { SkeletonSlots } from './LoadingStates';
import { SURCHARGES } from '../data/siteData';
import { Sparkle, WandIcon } from './Icons';

const LABEL = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.2em',
  textTransform: 'uppercase', color: '#8b7355', marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 7,
};

const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', fontWeight: 500, padding: '14px 32px',
  background: '#2c2420', color: '#f5f0e8', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function BookingStep2({ booking, onUpdate, onNext, onBack }) {
  const today        = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [slots,     setSlots]     = useState([]);
  const [loadSlots, setLoadSlots] = useState(false);
  const [error,     setError]     = useState('');

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setMonth(m); setYear(y);
  };

  const handleDateClick = async (dateStr) => {
    const weekend = isWeekend(dateStr);
    const sameDay = isToday(dateStr);
    const surcharge = sameDay ? SURCHARGES.sameDay : weekend ? SURCHARGES.weekend : 0;

    onUpdate({
      cleanDate: dateStr,
      cleanDateDisplay: showDate(dateStr),
      cleanTime: null,
      cleanDateUTC: null,
      surcharge,
    });

    setSlots([]);
    setLoadSlots(true);

    try {
      const url = `${import.meta.env.VITE_CF_GET_SLOTS}?date=${dateStr}`;
      const res  = await fetch(url);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (e) {
      setSlots([]);
    } finally {
      setLoadSlots(false);
    }
  };

  const handleTimeSelect = (slot) => {
    if (slot.booked) return;
    onUpdate({
      cleanTime:    slot.time,
      cleanDateUTC: toUTCISO(booking.cleanDate, slot.time),
    });
  };

  const handleNext = () => {
    const err = validateStep2(booking);
    if (err) { setError(err); return; }
    setError('');
    onNext();
  };

  // Build calendar days
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr   = todayUK();

  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm  = String(month + 1).padStart(2, '0');
    const dd  = String(d).padStart(2, '0');
    calDays.push(`${year}-${mm}-${dd}`);
  }

  return (
    <div>
      <div style={{
        background: '#fff8eb', borderLeft: '2px solid #c8b89a',
        padding: '10px 14px', marginBottom: 20,
        fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#7a5c00', fontWeight: 300,
      }}>
        Weekend bookings carry a <strong>+£{SURCHARGES.weekend} surcharge</strong>. Same-day bookings carry a <strong>+£{SURCHARGES.sameDay} surcharge</strong>.
      </div>

      {/* Calendar */}
      <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Select Date</div>
      <div style={{ border: '1px solid rgba(200,184,154,0.3)', padding: 20, marginBottom: 20 }}>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: '1px solid rgba(200,184,154,0.3)', width: 32, height: 32, cursor: 'pointer', color: '#2c2420', fontSize: 14 }}>←</button>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 400 }}>
            {MONTHS[month]} {year}
          </div>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: '1px solid rgba(200,184,154,0.3)', width: 32, height: 32, cursor: 'pointer', color: '#2c2420', fontSize: 14 }}>→</button>
        </div>

        {/* Day names */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontFamily: "'Jost',sans-serif", fontSize: 10, color: '#8b7355', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {calDays.map((dateStr, i) => {
            if (!dateStr) return <div key={`empty-${i}`} />;
            const isPast     = dateStr < todayStr;
            const isSelected = booking.cleanDate === dateStr;
            const isWknd     = isWeekend(dateStr);
            return (
              <div
                key={dateStr}
                onClick={() => !isPast && handleDateClick(dateStr)}
                style={{
                  aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontFamily: "'Jost',sans-serif", cursor: isPast ? 'not-allowed' : 'pointer',
                  background: isSelected ? '#c8b89a' : 'transparent',
                  color: isPast ? '#ccc' : isSelected ? '#1a1410' : isWknd ? '#8b7355' : '#2c2420',
                  border: isSelected ? 'none' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isPast && !isSelected) e.currentTarget.style.border = '1px solid #c8b89a'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.border = '1px solid transparent'; }}
              >
                {parseInt(dateStr.split('-')[2])}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {(booking.cleanDate || loadSlots) && (
        <>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Available Times</div>
          {loadSlots ? (
            <SkeletonSlots />
          ) : slots.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
              {slots.map(slot => (
                <div
                  key={slot.time}
                  onClick={() => handleTimeSelect(slot)}
                  style={{
                    padding: '10px 8px', textAlign: 'center',
                    fontFamily: "'Jost',sans-serif", fontSize: 13,
                    border: booking.cleanTime === slot.time
                      ? '1px solid #c8b89a'
                      : slot.booked
                        ? '1px solid rgba(200,184,154,0.15)'
                        : '1px solid rgba(200,184,154,0.3)',
                    background: booking.cleanTime === slot.time
                      ? '#c8b89a'
                      : slot.booked
                        ? '#f5f5f0'
                        : 'transparent',
                    color: booking.cleanTime === slot.time
                      ? '#1a1410'
                      : slot.booked
                        ? '#ccc'
                        : '#2c2420',
                    cursor: slot.booked ? 'not-allowed' : 'pointer',
                  }}
                >
                  {slot.booked ? 'Booked' : slot.time}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300, marginBottom: 24 }}>
              No slots available for this date. Please select another day.
            </p>
          )}
        </>
      )}

      {error && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
          ← Back
        </button>
        <button onClick={handleNext} style={BTN}>
          <WandIcon size={14} color="#c8b89a" /> Continue to Details
        </button>
      </div>
    </div>
  );
}