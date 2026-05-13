import { useState, useEffect, useRef } from 'react';
import { getPayPeriod, calcHours, fmtDate, fmtDuration, toDisplayTime, toInputTime } from '../utils';
import html2canvas from 'html2canvas';

const FONT = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN   = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };

export default function MyJobsTab({ staff, bookings, setBookings, isMobile, C }) {
  const [myJobsCleaner,    setMyJobsCleaner]    = useState(() => localStorage.getItem('mjCleaner') || '');
  const [myJobsWeekOffset, setMyJobsWeekOffset] = useState(() => { const s = localStorage.getItem('mjWeekOffset'); return s ? parseInt(s) : 0; });
  const [jobCard, setJobCard] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [search, setSearch] = useState('');
  const cardRef = useRef(null);
  const timeInputRefs = useRef({});

  const shareAsImage = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'job-card.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Job Card' }); setSharing(false); return; } catch {}
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'job-card.png'; a.click();
        URL.revokeObjectURL(url);
        setSharing(false);
      }, 'image/png');
    } catch {
      setSharing(false);
      alert('Could not generate image — try again.');
    }
  };

  const shareJobCard = async (b) => {
    const lines = [
      `JOB CARD — London Cleaning Wizard`,
      `Customer: ${b.customerName || `${b.firstName || ''} ${b.lastName || ''}`.trim()}${b.bookingRef ? ` (${b.bookingRef})` : ''}`,
      `Date: ${fmtDate(b.cleanDate)}  |  Time: ${toDisplayTime(b.cleanTime)}`,
      `Service: ${b.packageName || b.package || '—'}  |  Frequency: ${b.frequency || b.freq || 'One-off'}`,
      ``,
      `Address: ${[b.addr1, b.postcode].filter(Boolean).join(', ')}`,
      `Property: ${[b.propertyType, b.size].filter(Boolean).join(' · ') || '—'}`,
      `Floor / Lift: ${b.floor || '—'}`,
      `Parking: ${b.parking || '—'}`,
      `Keys: ${b.keys || '—'}`,
      `Bathrooms: ${b.bathrooms || '—'}`,
      `Add-ons: ${b.addons?.length ? b.addons.map(a => a.name || a).join(', ') : 'None'}`,
      `Supplies: ${b.supplies === 'cleaner' ? `Cleaner brings (+£${b.suppliesFee || 8})` : 'Customer provides'}`,
      `Pets: ${b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No'}`,
      ``,
      `Cleaner(s): ${[b.assignedStaff, b.secondCleaner].filter(Boolean).join(' & ') || '—'}`,
      b.notes ? `Notes: ${b.notes}` : '',
      `Media Consent: ${b.mediaConsent ? 'Yes' : 'No'}`,
    ].filter(l => l !== '').join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: 'Job Card', text: lines }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(lines);
      alert('Job card copied to clipboard!');
    } catch {
      alert('Could not share — please copy manually.');
    }
  };

  useEffect(() => { localStorage.setItem('mjCleaner', myJobsCleaner); }, [myJobsCleaner]);
  useEffect(() => { localStorage.setItem('mjWeekOffset', myJobsWeekOffset); }, [myJobsWeekOffset]);

  const refDate = new Date(); refDate.setDate(refDate.getDate() + myJobsWeekOffset * 7);
  const period  = getPayPeriod(refDate);

  const allStaff = [...staff].filter(s => s.status === 'Active').sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const member     = myJobsCleaner ? staff.find(s => s.name === myJobsCleaner) : null;
  const rate       = member && member.hourlyRate !== 'N/A' ? parseFloat(member.hourlyRate) : null;
  const hasNARate  = member && member.hourlyRate === 'N/A';
  const assignedToSelected = bookings.filter(b => b.assignedStaff === myJobsCleaner || b.secondCleaner === myJobsCleaner);
  const unassignedJobs = bookings
    .filter(b => !b.assignedStaff && b.cleanDate >= period.start && b.cleanDate <= period.end && !b.status?.startsWith('cancelled'))
    .sort((a, b) => a.cleanDate.localeCompare(b.cleanDate));
  const periodJobs = myJobsCleaner
    ? assignedToSelected
        .filter(b => b.cleanDate >= period.start && b.cleanDate <= period.end && !b.status?.startsWith('cancelled'))
        .sort((a, b) => a.cleanDate.localeCompare(b.cleanDate))
    : [];

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? bookings
        .filter(b => !b.status?.startsWith('cancelled'))
        .filter(b => [b.customerName, b.firstName, b.lastName, b.addr1, b.postcode, b.bookingRef, b.packageName, b.package, b.freq, b.frequency]
          .some(v => v?.toLowerCase().includes(q)))
        .sort((a, b) => b.cleanDate.localeCompare(a.cleanDate))
    : null;

  const displayJobs = searchResults ?? periodJobs;

  const firstResultDate = searchResults?.[0]?.cleanDate;
  useEffect(() => {
    if (!firstResultDate) return;
    for (let o = -104; o <= 104; o++) {
      const ref = new Date(); ref.setDate(ref.getDate() + o * 7);
      const p = getPayPeriod(ref);
      if (firstResultDate >= p.start && firstResultDate <= p.end) {
        setMyJobsWeekOffset(o);
        break;
      }
    }
  }, [firstResultDate]);

  const totalHours  = periodJobs.reduce((s, b) => {
    const sec = myJobsCleaner && b.secondCleaner && myJobsCleaner === b.secondCleaner && myJobsCleaner !== b.assignedStaff;
    const h = calcHours((sec ? b.actualStart2 : b.actualStart) || b.cleanTime, sec ? b.actualFinish2 : b.actualFinish);
    return s + (h || 0);
  }, 0);
  const totalEarned = rate !== null ? totalHours * rate : null;

  const exportAll = () => {
    const rows = [['Cleaner','Date','Booking Ref','Customer','Package','Scheduled Time','Actual Start','Actual Finish','Hours','Rate (£/hr)','Earned (£)','Payday']];
    allStaff.forEach(s => {
      const r = s.hourlyRate !== 'N/A' ? parseFloat(s.hourlyRate) : null;
      bookings
        .filter(b => (b.assignedStaff === s.name || b.secondCleaner === s.name) && b.cleanDate >= period.start && b.cleanDate <= period.end && !b.status?.startsWith('cancelled'))
        .sort((a, b) => a.cleanDate.localeCompare(b.cleanDate))
        .forEach(b => {
          const isPrimary = b.assignedStaff === s.name;
          const aStart  = isPrimary ? b.actualStart  : b.actualStart2;
          const aFinish = isPrimary ? b.actualFinish : b.actualFinish2;
          const hrs    = calcHours(aStart || b.cleanTime, aFinish);
          const earned = r !== null && hrs !== null ? (hrs * r).toFixed(2) : '';
          rows.push([s.name, fmtDate(b.cleanDate), b.bookingRef || '', `"${(b.firstName||'')+' '+(b.lastName||'')}"`, b.package || '', b.cleanTime || '', aStart || '', aFinish || '', hrs !== null ? hrs.toFixed(2) : '', r !== null ? r.toFixed(2) : 'N/A', earned, fmtDate(period.payDay)]);
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
      const isPrimary = b.assignedStaff === myJobsCleaner;
      const aStart  = isPrimary ? b.actualStart  : b.actualStart2;
      const aFinish = isPrimary ? b.actualFinish : b.actualFinish2;
      const hrs    = calcHours(aStart || b.cleanTime, aFinish);
      const earned = rate !== null && hrs !== null ? (hrs * rate).toFixed(2) : '';
      rows.push([myJobsCleaner, fmtDate(b.cleanDate), b.bookingRef || '', `"${(b.firstName||'')+' '+(b.lastName||'')}"`, b.package || '', b.cleanTime || '', aStart || '', aFinish || '', hrs !== null ? hrs.toFixed(2) : '', rate !== null ? rate.toFixed(2) : 'N/A', earned, fmtDate(period.payDay)]);
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by name, address, postcode, booking ref, service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...INPUT, marginBottom: 0, paddingRight: search ? 36 : 12 }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 16, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Unassigned Jobs */}
      {unassignedJobs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>Unassigned Jobs</div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#fff', background: '#f59e0b', borderRadius: 99, padding: '2px 9px' }}>{unassignedJobs.length}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{fmtDate(period.start)} to {fmtDate(period.end)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {unassignedJobs.map(b => (
              <div key={b.id} style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #fcd34d', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.text }}>{b.customerName || `${b.firstName || ''} ${b.lastName || ''}`.trim()}</div>
                    {b.bookingRef && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 7px' }}>{b.bookingRef}</div>}
                    <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 4, padding: '1px 7px' }}>Unassigned</div>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{fmtDate(b.cleanDate)} · {toDisplayTime(b.cleanTime)} · {b.packageName || b.package || '—'} · {b.addr1 || '—'}</div>
                </div>
                <button onClick={() => setJobCard(b)} style={{ ...BTN, fontSize: 12, padding: '6px 14px', background: C.accent, color: '#fff', borderRadius: 6, alignSelf: 'center' }}>
                  Job Card
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week nav + summary — always visible */}
      <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMyJobsWeekOffset(o => o - 1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: isMobile ? '10px 18px' : '4px 10px', cursor: 'pointer', fontFamily: FONT, fontSize: isMobile ? 20 : 14, color: C.text, touchAction: 'manipulation', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>
              {myJobsWeekOffset === 0 ? 'This Week' : myJobsWeekOffset === -1 ? 'Last Week' : myJobsWeekOffset === 1 ? 'Next Week' : myJobsWeekOffset < 0 ? `${Math.abs(myJobsWeekOffset)} weeks ago` : `In ${myJobsWeekOffset} weeks`}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{fmtDate(period.start)} – {fmtDate(period.end)}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Payday: {fmtDate(period.payDay)}</div>
          </div>
          <button onClick={() => setMyJobsWeekOffset(o => o + 1)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: isMobile ? '10px 18px' : '4px 10px', cursor: 'pointer', fontFamily: FONT, fontSize: isMobile ? 20 : 14, color: C.text, touchAction: 'manipulation', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          {myJobsWeekOffset !== 0 && (
            <button onClick={() => setMyJobsWeekOffset(0)} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '4px 10px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.muted }}>Today</button>
          )}
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
      {myJobsCleaner && !searchResults && periodJobs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={exportOne} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>⬇ Export CSV</button>
        </div>
      )}

      {/* Search results label */}
      {searchResults && (
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 10 }}>
          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
        </div>
      )}

      {/* Job list — search results always visible; period jobs only when cleaner selected */}
      {!searchResults && !myJobsCleaner ? (
        <div style={{ background: C.card, borderRadius: 8, padding: 40, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>Select a cleaner above to see their jobs and earnings.</div>
        </div>
      ) : displayJobs.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 8, padding: 32, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>
            {searchResults ? `No results for "${search}".` : `No jobs assigned to ${myJobsCleaner} this week.`}
          </div>
        </div>
      ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayJobs.map(b => {
                const sec    = myJobsCleaner && b.secondCleaner && myJobsCleaner === b.secondCleaner && myJobsCleaner !== b.assignedStaff;
                const hrs    = calcHours((sec ? b.actualStart2 : b.actualStart) || b.cleanTime, sec ? b.actualFinish2 : b.actualFinish);
                const earned = rate !== null && hrs !== null ? hrs * rate : null;

                const saveTime = async (field, val) => {
                  if (!val) return;
                  const prev = b[field];
                  setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: val } : x));
                  try {
                    const res = await fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: b.id, [field]: val }) });
                    if (!res.ok) throw new Error('err');
                  } catch {
                    setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: prev } : x));
                    alert('Failed to save time.');
                  }
                };

                const clearTimes = async (sf, ff) => {
                  const prevS = b[sf], prevF = b[ff];
                  const rSf = timeInputRefs.current[b.id + sf];
                  const rFf = timeInputRefs.current[b.id + ff];
                  if (rSf) rSf.value = '';
                  if (rFf) rFf.value = '';
                  setBookings(all => all.map(x => x.id === b.id ? { ...x, [sf]: '', [ff]: '' } : x));
                  try {
                    const res = await fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: b.id, [sf]: '', [ff]: '' }) });
                    if (!res.ok) throw new Error('err');
                  } catch {
                    setBookings(all => all.map(x => x.id === b.id ? { ...x, [sf]: prevS, [ff]: prevF } : x));
                    if (rSf) rSf.value = toInputTime(prevS);
                    if (rFf) rFf.value = toInputTime(prevF);
                    alert('Failed to clear times.');
                  }
                };

                const timeInput = (field) => (
                  <input
                    key={b.id + field}
                    ref={el => { timeInputRefs.current[b.id + field] = el; }}
                    type="time"
                    defaultValue={toInputTime(b[field])}
                    onChange={e => saveTime(field, e.target.value)}
                    style={{ ...INPUT, marginBottom: 0, width: 110, fontSize: 12 }}
                  />
                );

                return (
                  <div key={b.id} style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.text }}>{b.customerName || `${b.firstName || ''} ${b.lastName || ''}`.trim()}</div>
                          {b.bookingRef && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 7px' }}>{b.bookingRef}</div>}
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{fmtDate(b.cleanDate)} · {b.packageName || b.package} · {b.addr1}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {hrs !== null
                          ? <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text }}>{fmtDuration(hrs)}</div>
                          : <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>No times</div>}
                        {earned !== null && <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>£{earned.toFixed(2)}</div>}
                        {hasNARate && hrs !== null && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>N/A</div>}
                      </div>
                    </div>
                    {b.secondCleaner ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 6 }}>Booked: {toDisplayTime(b.cleanTime)}</div>
                        {[
                          { name: b.assignedStaff, sf: 'actualStart',  ff: 'actualFinish'  },
                          { name: b.secondCleaner,  sf: 'actualStart2', ff: 'actualFinish2' },
                        ].map(({ name, sf, ff }) => (
                          <div key={name} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.text, minWidth: 80 }}>{name}</div>
                            <div><div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Start</div>{timeInput(sf)}</div>
                            <div><div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Finish</div>{timeInput(ff)}</div>
                            {(b[sf] || b[ff]) && (
                              <button onClick={() => clearTimes(sf, ff)} style={{ fontFamily: FONT, fontSize: 11, padding: '6px 10px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.muted }}>Clear</button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Booked</div>
                          <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{toDisplayTime(b.cleanTime)}</div>
                        </div>
                        <div><div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Actual Start</div>{timeInput('actualStart')}</div>
                        <div><div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Actual Finish</div>{timeInput('actualFinish')}</div>
                        {(b.actualStart || b.actualFinish) && (
                          <button onClick={() => clearTimes('actualStart', 'actualFinish')} style={{ fontFamily: FONT, fontSize: 11, padding: '6px 10px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.muted }}>Clear</button>
                        )}
                      </div>
                    )}
                    <button onClick={() => setJobCard(b)} style={{ ...BTN, width: '100%', fontSize: 13, padding: '10px 14px', background: C.accent, color: '#fff', borderRadius: 6, touchAction: 'manipulation' }}>
                      Job Card
                    </button>
                  </div>
                );
              })}
            </div>
          )}

      {/* Job Card Modal */}
      {jobCard && (
        <div onClick={() => setJobCard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ background: '#1a1410', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c8b89a', marginBottom: 4 }}>London Cleaning Wizard</div>
                <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: '#f5f0e8' }}>Job Card</div>
              </div>
              <button onClick={() => setJobCard(null)} style={{ background: 'none', border: 'none', color: '#c8b89a', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Body */}
            <div ref={cardRef} style={{ padding: '24px 24px 20px', background: '#fff' }}>

              {/* Customer + ref */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                  {jobCard.customerName || `${jobCard.firstName || ''} ${jobCard.lastName || ''}`.trim()}
                </div>
                {jobCard.bookingRef && <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>Ref: {jobCard.bookingRef}</div>}
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px 12px', marginBottom: 20 }}>
                {[
                  ['Date',          fmtDate(jobCard.cleanDate)],
                  ['Time',          toDisplayTime(jobCard.cleanTime)],
                  ['Service',       jobCard.packageName || jobCard.package || '—'],
                  ['Frequency',     jobCard.frequency || jobCard.freq || 'One-off'],
                  ['Address',       [jobCard.addr1, jobCard.postcode].filter(Boolean).join(', ')],
                  ['Property',      [jobCard.propertyType, jobCard.size].filter(Boolean).join(' · ') || '—'],
                  ['Floor / Lift',  jobCard.floor || '—'],
                  ['Parking',       jobCard.parking || '—'],
                  ['Keys',          jobCard.keys || '—'],
                  ['Bathrooms',     jobCard.bathrooms || '—'],
                  ['Add-ons',       jobCard.addons?.length ? jobCard.addons.map(a => a.name || a).join(', ') : 'None'],
                  ['Supplies',      jobCard.supplies === 'cleaner' ? `Cleaner brings (+£${jobCard.suppliesFee || 8})` : 'Customer provides'],
                  ['Pets',          jobCard.hasPets ? `Yes — ${jobCard.petTypes || 'not specified'}` : 'No'],
                  ['Cleaner(s)',     [jobCard.assignedStaff, jobCard.secondCleaner].filter(Boolean).join(' & ') || '—'],
                  ['Notes',         jobCard.notes || '—'],
                  ['Media Consent', jobCard.mediaConsent ? 'Yes' : 'No'],
                  ['Signature Touch', (jobCard.package === 'standard' || jobCard.packageId === 'standard') ? 'Eligible' : 'Not eligible'],
                ].map(([label, value]) => (
                  <>
                    <div key={label + '_l'} style={{ fontFamily: FONT, fontSize: 11, color: C.muted, fontWeight: 600, paddingTop: 2 }}>{label}</div>
                    <div key={label + '_v'} style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{value}</div>
                  </>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={shareAsImage} disabled={sharing} style={{ ...BTN, flex: 1, background: '#1a1410', color: '#f5f0e8', borderRadius: 8, opacity: sharing ? 0.6 : 1 }}>
                  {sharing ? 'Generating...' : 'Share as Image'}
                </button>
                <button onClick={() => shareJobCard(jobCard)} style={{ ...BTN, padding: '9px 16px', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  Copy Text
                </button>
                <button onClick={() => setJobCard(null)} style={{ ...BTN, padding: '9px 16px', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
