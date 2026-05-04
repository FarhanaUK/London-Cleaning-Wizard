import { useState, useEffect } from 'react';
import { todayUK } from '../../../utils/time';
import { PACKAGES } from '../../../data/siteData';
import { fmtDate } from '../utils';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const STATUS_COLOURS = {
  pending_deposit:          { bg: '#8b2020', color: '#fff',     label: 'Pending Deposit' },
  scheduled:                { bg: '#f0fdf4', color: '#166534',  label: 'Scheduled' },
  deposit_paid:             { bg: '#fff8eb', color: '#7a5c00',  label: 'Deposit Paid' },
  fully_paid:               { bg: '#f3faf6', color: '#1a5234',  label: 'Fully Paid' },
  payment_failed:           { bg: '#fdf5f5', color: '#6b1010',  label: 'Payment Failed' },
  cancelled_full_refund:    { bg: '#f5f5f5', color: '#5a5a5a',  label: 'Cancelled — Full Refund' },
  cancelled_partial_refund: { bg: '#f5f5f5', color: '#5a5a5a',  label: 'Cancelled — Partial Refund' },
  cancelled_no_refund:      { bg: '#f5f5f5', color: '#5a5a5a',  label: 'Cancelled — No Refund' },
  cancelled_late_fee:       { bg: '#fff3e0', color: '#7c3d00',  label: 'Cancelled — Late Fee Charged' },
};

const DOT_COLOURS = {
  pending_deposit:          '#d97706',
  deposit_paid:             '#2563eb',
  fully_paid:               '#16a34a',
  payment_failed:           '#dc2626',
  cancelled_full_refund:    '#94a3b8',
  cancelled_partial_refund: '#94a3b8',
  cancelled_no_refund:      '#94a3b8',
  cancelled_late_fee:       '#94a3b8',
  completed:                '#16a34a',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function getDot(b) {
  if (b.frequency && b.frequency !== 'one-off') {
    const depositCollected = b.status === 'deposit_paid' || b.status === 'fully_paid';
    return depositCollected ? '#7c3aed' : '#eab308';
  }
  if (b.status === 'scheduled') {
    return parseFloat(b.deposit) > 0 ? '#2563eb' : '#d97706';
  }
  return DOT_COLOURS[b.status] || '#94a3b8';
}

export default function CalendarTab({ bookings, isMobile, C, onAfterBlock }) {
  const [calYear,         setCalYear]         = useState(() => { const s = localStorage.getItem('calYear');  return s ? parseInt(s) : new Date().getFullYear(); });
  const [calMonth,        setCalMonth]        = useState(() => { const s = localStorage.getItem('calMonth'); return s ? parseInt(s) : new Date().getMonth(); });
  const [calPackageFilter, setCalPackageFilter] = useState('');
  const [calSelectedId,   setCalSelectedId]   = useState(null);
  const [calActionBusy,   setCalActionBusy]   = useState(false);
  const [calActionErr,    setCalActionErr]     = useState('');
  const [calBlockedDates, setCalBlockedDates] = useState([]);
  const [blockModal,      setBlockModal]      = useState(null); // { date, isBlocked }
  const [blockReason,     setBlockReason]     = useState('');
  const [blockSaving,     setBlockSaving]     = useState(false);
  const [blockErr,        setBlockErr]        = useState('');

  useEffect(() => { localStorage.setItem('calYear',  calYear);  }, [calYear]);
  useEffect(() => { localStorage.setItem('calMonth', calMonth); }, [calMonth]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${calYear}&month=${calMonth + 1}`)
      .then(r => r.json()).then(data => setCalBlockedDates(data.blocked || [])).catch(() => {});
  }, [calYear, calMonth]);

  const BTN   = { fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: C.text, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 6 };
  const INPUT = { width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', marginBottom: 16, boxSizing: 'border-box' };

  const today = todayUK();

  const firstDay   = new Date(calYear, calMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${calYear}-${mm}-${dd}`);
  }

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const calPackages = PACKAGES.map(p => p.name);

  const bookingsByDate = {};
  bookings.forEach(b => {
    if (!b.cleanDate) return;
    if (calPackageFilter && b.packageName !== calPackageFilter) return;
    if (!bookingsByDate[b.cleanDate]) bookingsByDate[b.cleanDate] = [];
    bookingsByDate[b.cleanDate].push(b);
  });

  const prefix       = `${String(calYear)}-${String(calMonth + 1).padStart(2, '0')}`;
  const monthBookings = bookings.filter(b => b.cleanDate?.startsWith(prefix));
  const active        = monthBookings.filter(b => !b.status?.startsWith('cancelled'));
  const revenue       = active.reduce((s, b) => s + parseFloat(b.total || 0), 0);
  const pendingCount  = monthBookings.filter(b => b.status === 'pending_deposit').length;

  const sel = calSelectedId && bookings.find(x => x.id === calSelectedId);

  return (
    <div style={{ background: C.card, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: isMobile ? 16 : 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, padding: '6px 14px' }}>←</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 600, color: C.text }}>{MONTHS[calMonth]} {calYear}</div>
          <button
            onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }}
            style={{ fontFamily: FONT, fontSize: 10, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >Today</button>
        </div>
        <button onClick={nextMonth} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, padding: '6px 14px' }}>→</button>
      </div>

      {/* Month stats */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Bookings',         value: active.length },
          { label: 'Expected revenue', value: `£${revenue.toFixed(2)}` },
          { label: 'Pending deposit',  value: pendingCount, alert: pendingCount > 0 },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 100, background: s.alert ? '#fef3c7' : C.bg, border: `1px solid ${s.alert ? '#d97706' : C.border}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: s.alert ? '#92400e' : C.muted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: s.alert ? '#92400e' : C.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Package filter */}
      {calPackages.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            onClick={() => setCalPackageFilter('')}
            style={{ fontFamily: FONT, fontSize: 11, padding: '4px 12px', borderRadius: 99, border: `1px solid ${C.border}`, cursor: 'pointer', background: calPackageFilter === '' ? C.accent : C.bg, color: calPackageFilter === '' ? '#fff' : C.text, fontWeight: calPackageFilter === '' ? 600 : 400 }}
          >All</button>
          {calPackages.map(pkg => (
            <button
              key={pkg}
              onClick={() => setCalPackageFilter(calPackageFilter === pkg ? '' : pkg)}
              style={{ fontFamily: FONT, fontSize: 11, padding: '4px 12px', borderRadius: 99, border: `1px solid ${C.border}`, cursor: 'pointer', background: calPackageFilter === pkg ? C.accent : C.bg, color: calPackageFilter === pkg ? '#fff' : C.text, fontWeight: calPackageFilter === pkg ? 600 : 400 }}
            >{pkg}</button>
          ))}
        </div>
      )}

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 1 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: C.border }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`e-${i}`} style={{ background: C.bg, minHeight: isMobile ? 56 : 80 }} />;
          const dayBookings = bookingsByDate[dateStr] || [];
          const isToday   = dateStr === today;
          const isPast    = dateStr < today;
          const isBlocked = calBlockedDates.includes(dateStr);
          return (
            <div
              key={dateStr}
              onClick={() => setBlockModal({ date: dateStr, isBlocked })}
              title={isBlocked ? `${dateStr} — Blocked (click to unblock)` : `${dateStr} — Click to block`}
              style={{ background: isBlocked ? '#fee2e2' : C.card, minHeight: isMobile ? 56 : 80, padding: isMobile ? '4px 4px' : '6px 8px', position: 'relative', cursor: 'pointer', transition: 'opacity 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <div style={{ fontFamily: FONT, fontSize: isMobile ? 11 : 13, fontWeight: isToday ? 700 : 400, color: isBlocked ? '#dc2626' : isToday ? '#1d4ed8' : isPast ? C.faint : C.text, marginBottom: 2 }}>
                {parseInt(dateStr.split('-')[2])}
              </div>
              {isBlocked && (
                <div style={{ fontFamily: FONT, fontSize: 9, color: '#dc2626', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 2 }}>BLOCKED</div>
              )}
              {dayBookings.slice(0, isMobile ? 1 : 3).map(b => {
                const dot       = getDot(b);
                const cancelled = b.status?.startsWith('cancelled');
                return (
                  <div
                    key={b.id}
                    onClick={e => { e.stopPropagation(); setCalSelectedId(b.id === calSelectedId ? null : b.id); }}
                    title={`${b.firstName} ${b.lastName} — ${b.packageName || ''} ${b.cleanTime || ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: cancelled ? C.bg : `${dot}18`, border: `1px solid ${dot}44`, borderRadius: 4, padding: isMobile ? '1px 4px' : '2px 6px', marginBottom: 2, cursor: 'pointer', opacity: cancelled ? 0.5 : 1 }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    {!isMobile && (
                      <span style={{ fontFamily: FONT, fontSize: 11, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                        {b.packageName || `${b.firstName} ${b.lastName}`}
                      </span>
                    )}
                  </div>
                );
              })}
              {dayBookings.length > (isMobile ? 1 : 3) && (
                <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>+{dayBookings.length - (isMobile ? 1 : 3)} more</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        {[
          { label: 'Pending deposit',      color: '#d97706' },
          { label: 'Deposit paid',         color: '#2563eb' },
          { label: 'Fully paid',           color: '#16a34a' },
          { label: 'Failed payment',       color: '#dc2626' },
          { label: 'Cancelled',            color: '#94a3b8' },
          { label: 'Recurring',            color: '#7c3aed' },
          { label: 'Scheduled recurring',  color: '#eab308' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11, color: C.muted }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11, color: C.muted }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fee2e2', border: '1px solid #dc2626' }} />
          Blocked (click any day to block/unblock)
        </div>
      </div>

      {/* Booking detail panel */}
      {sel && (() => {
        const sc = STATUS_COLOURS[sel.status] || { bg: '#f5f5f5', color: '#5a5a5a', label: sel.status };
        return (
          <div style={{ marginTop: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: isMobile ? 14 : 20, position: 'relative' }}>
            <button onClick={() => setCalSelectedId(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.muted }}>✕</button>
            <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{sel.firstName} {sel.lastName}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: sc.bg, color: sc.color }}>{sc.label}</span>
              {sel.isAutoRecurring && <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>Recurring</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(180px,1fr))', gap: '8px 16px', marginBottom: 16 }}>
              {[
                { l: 'Booking Ref', v: sel.bookingRef },
                { l: 'Clean Date',  v: fmtDate(sel.cleanDate) },
                { l: 'Clean Time',  v: sel.cleanTime },
                { l: 'Package',     v: sel.packageName },
                { l: 'Property',    v: `${sel.propertyType || ''} · ${sel.size || ''}` },
                { l: 'Address',     v: `${sel.addr1}, ${sel.postcode}` },
                { l: 'Phone',       v: sel.phone },
                { l: 'Email',       v: sel.email },
                { l: 'Frequency',   v: sel.frequency || 'one-off' },
                { l: 'Add-ons',     v: sel.addons?.length ? sel.addons.map(a => a.name).join(', ') : 'None' },
                { l: 'Cleaner',     v: sel.assignedStaff || 'Unassigned' },
                { l: 'Pets',        v: sel.hasPets ? `Yes — ${sel.petTypes || 'not specified'}` : 'No' },
                (sel.package === 'standard' || sel.packageId === 'standard') && { l: 'Signature Touch', v: sel.signatureTouch !== false ? 'Opted in' : 'Opted out' },
                { l: 'Total',       v: `£${parseFloat(sel.total || 0).toFixed(2)}` },
                { l: 'Deposit',     v: sel.status === 'pending_deposit' ? 'Pending' : `£${parseFloat(sel.deposit || 0).toFixed(2)}` },
                { l: 'Remaining',   v: `£${parseFloat(sel.remaining || 0).toFixed(2)}` },
                sel.notes && { l: 'Notes', v: sel.notes },
              ].filter(Boolean).map((r, i) => (
                <div key={i}>
                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{r.v}</div>
                </div>
              ))}
            </div>

            {!sel.status?.startsWith('cancelled') && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {sel.status === 'pending_deposit' && (
                    <button
                      disabled={calActionBusy}
                      onClick={async () => {
                        if (!window.confirm(`Mark deposit of £${sel.deposit} as collected for ${sel.firstName} ${sel.lastName}?`)) return;
                        setCalActionBusy(true); setCalActionErr('');
                        try {
                          const r = await fetch(import.meta.env.VITE_CF_MARK_DEPOSIT_PAID, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: sel.id }) });
                          const d = await r.json();
                          if (!r.ok) setCalActionErr(d.error || 'Failed');
                        } catch { setCalActionErr('Something went wrong'); }
                        finally { setCalActionBusy(false); }
                      }}
                      style={{ ...BTN, background: '#2563eb', color: '#fff', fontSize: 12, padding: '6px 14px', opacity: calActionBusy ? 0.6 : 1 }}
                    >{calActionBusy ? 'Saving…' : 'Mark Deposit Paid'}</button>
                  )}
                  {sel.status === 'deposit_paid' && (
                    <button
                      disabled={calActionBusy}
                      onClick={async () => {
                        if (!window.confirm(`Complete job and charge remaining £${sel.remaining} for ${sel.firstName} ${sel.lastName}?`)) return;
                        setCalActionBusy(true); setCalActionErr('');
                        try {
                          const r = await fetch(import.meta.env.VITE_CF_COMPLETE_JOB, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: sel.id }) });
                          const d = await r.json();
                          if (!r.ok) setCalActionErr(d.error || 'Failed');
                        } catch { setCalActionErr('Something went wrong'); }
                        finally { setCalActionBusy(false); }
                      }}
                      style={{ ...BTN, background: '#16a34a', color: '#fff', fontSize: 12, padding: '6px 14px', opacity: calActionBusy ? 0.6 : 1 }}
                    >{calActionBusy ? 'Saving…' : 'Complete Job'}</button>
                  )}
                  <button
                    disabled={calActionBusy}
                    onClick={async () => {
                      if (!window.confirm(`Cancel this booking for ${sel.firstName} ${sel.lastName}? This cannot be undone.`)) return;
                      setCalActionBusy(true); setCalActionErr('');
                      try {
                        const r = await fetch(import.meta.env.VITE_CF_CANCEL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: sel.id, reason: 'Cancelled by admin' }) });
                        const d = await r.json();
                        if (!r.ok) setCalActionErr(d.error || 'Failed');
                        else setCalSelectedId(null);
                      } catch { setCalActionErr('Something went wrong'); }
                      finally { setCalActionBusy(false); }
                    }}
                    style={{ ...BTN, background: C.bg, color: C.danger, border: `1px solid ${C.danger}`, fontSize: 12, padding: '6px 14px', opacity: calActionBusy ? 0.6 : 1 }}
                  >Cancel Booking</button>
                </div>
                {calActionErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 8 }}>{calActionErr}</div>}
              </div>
            )}
          </div>
        );
      })()}

      {/* Block / Unblock date modal */}
      {blockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FAF8F4', borderRadius: 10, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, color: '#1a1410', marginBottom: 6 }}>
              {blockModal.isBlocked ? 'Unblock Date' : 'Block Date'}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: '#8b7355', marginBottom: 20 }}>
              {blockModal.date.split('-').reverse().join('/')}
            </div>
            {blockModal.isBlocked ? (
              <p style={{ fontFamily: FONT, fontSize: 13, color: '#5a4e44', lineHeight: 1.7, marginBottom: 20 }}>
                This date is currently blocked — no bookings can be made. Unblocking it will remove the block from Google Calendar and make it available again on the booking form immediately.
              </p>
            ) : (
              <>
                <p style={{ fontFamily: FONT, fontSize: 13, color: '#5a4e44', lineHeight: 1.7, marginBottom: 16 }}>
                  Blocking this date will prevent customers from booking it. The block will appear in Google Calendar and take effect on the booking form immediately.
                </p>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 6 }}>Reason (optional — shown in Google Calendar)</div>
                  <input
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="e.g. Holiday, Staff training..."
                    style={{ ...INPUT, marginBottom: 0 }}
                    autoFocus
                  />
                </div>
              </>
            )}
            {blockErr && <p style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{blockErr}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setBlockModal(null); setBlockReason(''); setBlockErr(''); }} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 7, cursor: 'pointer', background: 'transparent', color: '#8b7355', border: '1px solid #d4c4ae' }}>
                Cancel
              </button>
              <button
                disabled={blockSaving}
                onClick={async () => {
                  setBlockSaving(true); setBlockErr('');
                  try {
                    const res = await fetch(import.meta.env.VITE_CF_SET_BLOCKED_DATE, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ date: blockModal.date, blocked: !blockModal.isBlocked, reason: blockReason || undefined }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed');
                    const refreshed = await fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${calYear}&month=${calMonth + 1}`);
                    const refreshedData = await refreshed.json();
                    setCalBlockedDates(refreshedData.blocked || []);
                    setBlockModal(null); setBlockReason(''); setBlockErr('');
                    onAfterBlock?.();
                  } catch (e) {
                    setBlockErr(e.message || 'Something went wrong');
                  } finally {
                    setBlockSaving(false);
                  }
                }}
                style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 7, cursor: 'pointer', flex: 1, background: blockModal.isBlocked ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', opacity: blockSaving ? 0.6 : 1 }}
              >
                {blockSaving ? 'Saving...' : blockModal.isBlocked ? 'Unblock Date' : 'Block Date'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
