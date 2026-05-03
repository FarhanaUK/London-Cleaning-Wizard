import { useState, useEffect } from 'react';
import { getPayPeriod, calcHours, fmtDate, fmtDuration, toDisplayTime, toInputTime } from '../utils';

const FONT = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN   = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };

export default function MyJobsTab({ staff, bookings, setBookings, isMobile, C }) {
  const [myJobsCleaner,    setMyJobsCleaner]    = useState(() => localStorage.getItem('mjCleaner') || '');
  const [myJobsWeekOffset, setMyJobsWeekOffset] = useState(() => { const s = localStorage.getItem('mjWeekOffset'); return s ? parseInt(s) : 0; });

  useEffect(() => { localStorage.setItem('mjCleaner', myJobsCleaner); }, [myJobsCleaner]);
  useEffect(() => { localStorage.setItem('mjWeekOffset', myJobsWeekOffset); }, [myJobsWeekOffset]);
  const refDate = new Date(); refDate.setDate(refDate.getDate() + myJobsWeekOffset * 7);
  const period  = getPayPeriod(refDate);

  const allStaff = [...staff].filter(s => s.status === 'Active').sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const member     = myJobsCleaner ? staff.find(s => s.name === myJobsCleaner) : null;
  const rate       = member && member.hourlyRate !== 'N/A' ? parseFloat(member.hourlyRate) : null;
  const hasNARate  = member && member.hourlyRate === 'N/A';
  const assignedToSelected = bookings.filter(b => b.assignedStaff === myJobsCleaner);
  console.log('[MyJobs] cleaner:', myJobsCleaner, '| period:', period.start, '→', period.end);
  console.log('[MyJobs] all assigned to cleaner:', assignedToSelected.map(b => ({ id: b.id, cleanDate: b.cleanDate, status: b.status, assignedStaff: b.assignedStaff })));
  const periodJobs = myJobsCleaner
    ? assignedToSelected
        .filter(b => b.cleanDate >= period.start && b.cleanDate <= period.end && !b.status?.startsWith('cancelled'))
        .sort((a, b) => a.cleanDate.localeCompare(b.cleanDate))
    : [];

  const totalHours  = periodJobs.reduce((s, b) => { const h = calcHours(b.actualStart || b.cleanTime, b.actualFinish); return s + (h || 0); }, 0);
  const totalEarned = rate !== null ? totalHours * rate : null;

  const exportAll = () => {
    const rows = [['Cleaner','Date','Booking Ref','Customer','Package','Scheduled Time','Actual Start','Actual Finish','Hours','Rate (£/hr)','Earned (£)','Payday']];
    allStaff.forEach(s => {
      const r = s.hourlyRate !== 'N/A' ? parseFloat(s.hourlyRate) : null;
      bookings
        .filter(b => b.assignedStaff === s.name && b.cleanDate >= period.start && b.cleanDate <= period.end && !b.status?.startsWith('cancelled'))
        .sort((a, b) => a.cleanDate.localeCompare(b.cleanDate))
        .forEach(b => {
          const hrs    = calcHours(b.actualStart || b.cleanTime, b.actualFinish);
          const earned = r !== null && hrs !== null ? (hrs * r).toFixed(2) : '';
          rows.push([s.name, fmtDate(b.cleanDate), b.bookingRef || '', `"${(b.firstName||'')+' '+(b.lastName||'')}"`, b.package || '', b.cleanTime || '', b.actualStart || '', b.actualFinish || '', hrs !== null ? hrs.toFixed(2) : '', r !== null ? r.toFixed(2) : 'N/A', earned, fmtDate(period.payDay)]);
        });
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = `jobs-all-cleaners-${period.start}-to-${period.end}.csv`;
    a.click();
  };

  const exportOne = () => {
    const rows = [['Cleaner','Date','Booking Ref','Customer','Package','Scheduled Time','Actual Start','Actual Finish','Hours','Rate (£/hr)','Earned (£)','Payday']];
    periodJobs.forEach(b => {
      const hrs    = calcHours(b.actualStart || b.cleanTime, b.actualFinish);
      const earned = rate !== null && hrs !== null ? (hrs * rate).toFixed(2) : '';
      rows.push([myJobsCleaner, fmtDate(b.cleanDate), b.bookingRef || '', `"${(b.firstName||'')+' '+(b.lastName||'')}"`, b.package || '', b.cleanTime || '', b.actualStart || '', b.actualFinish || '', hrs !== null ? hrs.toFixed(2) : '', rate !== null ? rate.toFixed(2) : 'N/A', earned, fmtDate(period.payDay)]);
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = `jobs-${myJobsCleaner.replace(/ /g,'-')}-${period.start}-to-${period.end}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>My Jobs</div>
        <button onClick={exportAll} style={{ ...BTN, background: '#1e40af', color: '#fff', fontSize: 12 }}>
          ⬇ Export All Cleaners — {fmtDate(period.start)} to {fmtDate(period.end)}
        </button>
      </div>

      {/* Cleaner selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {allStaff.map(s => (
          <button
            key={s.id}
            onClick={() => setMyJobsCleaner(s.name)}
            style={{ fontFamily: FONT, fontSize: 13, fontWeight: myJobsCleaner === s.name ? 700 : 400, padding: '8px 16px', borderRadius: 99, border: `2px solid ${myJobsCleaner === s.name ? C.accent : C.border}`, background: myJobsCleaner === s.name ? C.accent : C.card, color: myJobsCleaner === s.name ? '#fff' : C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {s.photoURL && <img src={s.photoURL} alt={s.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />}
            {s.name}
            {s.hourlyRate === 'N/A' && <span style={{ fontSize: 10, opacity: 0.6 }}>N/A</span>}
          </button>
        ))}
      </div>

      {!myJobsCleaner ? (
        <div style={{ background: C.card, borderRadius: 8, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>Select a cleaner above to see their jobs and earnings.</div>
        </div>
      ) : (
        <div>
          {/* Week nav + summary */}
          <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setMyJobsWeekOffset(o => o - 1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: FONT, fontSize: 14, color: C.text }}>‹</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{fmtDate(period.start)} → {fmtDate(period.end)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Payday: {fmtDate(period.payDay)}{myJobsWeekOffset === 0 ? ' (this week)' : ''}</div>
              </div>
              <button onClick={() => setMyJobsWeekOffset(o => o + 1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: FONT, fontSize: 14, color: C.text }}>›</button>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text }}>{periodJobs.length}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Jobs</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text }}>{fmtDuration(totalHours) || '—'}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Hours</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: totalEarned !== null ? '#16a34a' : C.muted }}>
                  {hasNARate ? 'N/A' : totalEarned !== null ? `£${totalEarned.toFixed(2)}` : '—'}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Earned{rate !== null ? ` @ £${rate}/hr` : ''}</div>
              </div>
            </div>
          </div>

          {/* Single cleaner CSV export */}
          {periodJobs.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button onClick={exportOne} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>⬇ Export CSV</button>
            </div>
          )}

          {/* Job list */}
          {periodJobs.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 8, padding: 32, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No jobs assigned to {myJobsCleaner} this week.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {periodJobs.map(b => {
                const hrs    = calcHours(b.actualStart || b.cleanTime, b.actualFinish);
                const earned = rate !== null && hrs !== null ? hrs * rate : null;

                const saveTime = async (field, val) => {
                  const prev = b[field];
                  setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: val } : x));
                  try {
                    const res = await fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: b.id, [field]: val }) });
                    if (!res.ok) throw new Error('Server error');
                  } catch {
                    setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: prev } : x));
                    alert('Failed to save time — check your connection and try again.');
                  }
                };

                return (
                  <div key={b.id} style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.text }}>{b.customerName || `${b.firstName || ''} ${b.lastName || ''}`.trim()}</div>
                        {b.bookingRef && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 7px' }}>{b.bookingRef}</div>}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 10 }}>{fmtDate(b.cleanDate)} · {b.packageName || b.package} · {b.addr1}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Booked</div>
                          <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{toDisplayTime(b.cleanTime)}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Actual Start</div>
                          <input type="time" value={toInputTime(b.actualStart)} onChange={e => saveTime('actualStart', e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 110, fontSize: 12 }} />
                        </div>
                        <div>
                          <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Actual Finish</div>
                          <input type="time" value={toInputTime(b.actualFinish)} onChange={e => saveTime('actualFinish', e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 110, fontSize: 12 }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      {hrs !== null
                        ? <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.text }}>{fmtDuration(hrs)}</div>
                        : <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>No times yet</div>}
                      {earned !== null && <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>£{earned.toFixed(2)}</div>}
                      {hasNARate && hrs !== null && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>N/A</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
