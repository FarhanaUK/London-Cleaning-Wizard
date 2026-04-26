import { useState, useEffect } from 'react';
import { todayUK } from '../../../utils/time';
import { useBookingActions, fmtDate } from '../hooks/useBookingActions';
import NewBookingModal from '../modals/NewBookingModal';
import EditBookingModal from '../modals/EditBookingModal';
import BookingExpandedPanel from '../components/BookingExpandedPanel';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const fmtCreatedAt = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
};

const STATUS_COLOURS = {
  pending_deposit:          { bg: '#8b2020', color: '#fff',    label: 'Pending Deposit' },
  scheduled:                { bg: '#f0fdf4', color: '#166534', label: 'Scheduled' },
  deposit_paid:             { bg: '#fff8eb', color: '#7a5c00', label: 'Deposit Paid' },
  fully_paid:               { bg: '#f3faf6', color: '#1a5234', label: 'Fully Paid' },
  payment_failed:           { bg: '#fdf5f5', color: '#6b1010', label: 'Payment Failed' },
  cancelled_full_refund:    { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Full Refund' },
  cancelled_partial_refund: { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Partial Refund' },
  cancelled_no_refund:      { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — No Refund' },
  cancelled_late_fee:       { bg: '#fff3e0', color: '#7c3d00', label: 'Cancelled — Late Fee Charged' },
};


export default function BookingsTab({ bookings, setBookings, staff, isMobile, C, user, schedulerLogs, bannerVisible, welcomeMsg, welcomeColor }) {
  const today = todayUK();
  const year  = today.slice(0, 4);

  // Scheduler trigger state
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);
  const [triggerResult,       setTriggerResult]       = useState(null);

  // Filter state
  const [preset,       setPreset]       = useState(() => localStorage.getItem('bkPreset') || 'today');
  const [dateFrom,     setDateFrom]     = useState(today);
  const [dateTo,       setDateTo]       = useState(today);
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('bkStatus') || 'all');
  const [freqFilter,   setFreqFilter]   = useState(() => localStorage.getItem('bkFreq')   || 'all');
  const [searchQuery,  setSearchQuery]  = useState('');

  // Expand / UI state
  const [expanded,  setExpanded]  = useState(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statTip,   setStatTip]   = useState(null);

  const {
    selected, setSelected, toggleSelect,
    deleting, deleteProgress, completeErr, handleDelete, handleDeleteSelected,
    completing, handleComplete,
    cancelling, cancelErr, handleCancel,
    markingDeposit, depositErr, generatingLink, depositLinks, linkErr, emailingLink, emailedLinks,
    handleGenerateLink, handleEmailDepositLink, handleMarkDepositPaid,
    stoppingRecurring, stopRecurringErr, stoppedRecurring, handleStopRecurring,
    staffAssignPending, setStaffAssignPending, handleAssignStaff, handleConfirmAssignThis, handleConfirmAssignAll,
    editBooking, editData, setEditData, editScope, setEditScope, editSaving, editErr,
    openEdit, closeEdit, handleEditSave,
  } = useBookingActions({ bookings, setBookings, setExpanded });

  // New Booking modal state
  const [showNewBooking, setShowNewBooking] = useState(false);

  // Persist filters
  useEffect(() => { localStorage.setItem('bkPreset', preset);       }, [preset]);
  useEffect(() => { localStorage.setItem('bkStatus', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('bkFreq',   freqFilter);   }, [freqFilter]);

  const applyPreset = p => {
    setPreset(p);
    if (p === 'today') {
      setDateFrom(today); setDateTo(today);
    } else if (p === 'week') {
      const d = new Date(`${today}T12:00:00Z`), day = d.getUTCDay();
      const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
      const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
      const fmt = x => x.toISOString().slice(0, 10);
      setDateFrom(fmt(mon)); setDateTo(fmt(sun));
    } else if (p === 'month') {
      const [y, m] = today.split('-').map(Number);
      setDateFrom(`${today.slice(0, 7)}-01`);
      setDateTo(new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10));
    }
  };

  const bookingApi = {
    getBlockedDates: import.meta.env.VITE_CF_GET_BLOCKED_DATES,
    saveBooking:     import.meta.env.VITE_CF_SAVE_BOOKING,
  };

  const DATE_INPUT = { fontFamily: FONT, fontSize: 13, padding: '7px 10px', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 6, color: C.text, outline: 'none', cursor: 'pointer' };
  const BTN = { fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: C.text, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 6 };
  const LABEL = { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 };
  const VALUE = { fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 600, color: C.text };
  const searchTerm = searchQuery.trim().toLowerCase();
  const displayedBookings = (preset === 'all' ? bookings : bookings.filter(b => b.cleanDate >= dateFrom && b.cleanDate <= dateTo))
    .filter(b => {
      if (!searchTerm) return true;
      return (
        (b.email      || '').toLowerCase().includes(searchTerm) ||
        (b.bookingRef || '').toLowerCase().includes(searchTerm) ||
        (b.firstName  || '').toLowerCase().includes(searchTerm) ||
        (b.lastName   || '').toLowerCase().includes(searchTerm) ||
        (`${b.firstName} ${b.lastName}`).toLowerCase().includes(searchTerm) ||
        (b.phone      || '').includes(searchTerm) ||
        (b.postcode   || '').toLowerCase().includes(searchTerm) ||
        (b.addr1      || '').toLowerCase().includes(searchTerm)
      );
    })
    .filter(b => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'regular')             return b.isAutoRecurring === true;
      if (statusFilter === 'cancelled')           return b.status?.startsWith('cancelled') && (b.frequency === 'one-off' || !b.frequency);
      if (statusFilter === 'cancelled-recurring') return b.status?.startsWith('cancelled') && b.frequency && b.frequency !== 'one-off';
      if (statusFilter === 'refunded')            return b.status === 'cancelled_full_refund' || b.status === 'cancelled_partial_refund';
      if (statusFilter === 'phone')               return b.isPhoneBooking === true;
      if (statusFilter === 'website')             return !b.isPhoneBooking;
      return b.status === statusFilter;
    })
    .filter(b => {
      if (freqFilter === 'all') return true;
      if (freqFilter === 'cancelled-recurring') return b.status?.startsWith('cancelled') && b.frequency && b.frequency !== 'one-off';
      return (b.frequency || 'one-off') === freqFilter;
    })
    .sort((a, b) => a.cleanDate === b.cleanDate
      ? (a.cleanTime || '').localeCompare(b.cleanTime || '')
      : a.cleanDate.localeCompare(b.cleanDate));

  // Derived stats
  const activeBookings         = displayedBookings.filter(b => !b.status?.startsWith('cancelled'));
  const cancelledCount         = displayedBookings.filter(b =>  b.status?.startsWith('cancelled')).length;
  const totalRevenue           = activeBookings.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
  const collected              = displayedBookings.reduce((s, b) => {
    if (b.status === 'fully_paid') return s + (parseFloat(b.total) || 0);
    if (['deposit_paid','payment_failed'].includes(b.status)) return s + (parseFloat(b.deposit) || 0);
    return s;
  }, 0);
  const outstanding            = displayedBookings.filter(b => b.status === 'deposit_paid').reduce((s, b) => s + (parseFloat(b.remaining) || 0), 0);
  const refunded               = displayedBookings.filter(b => ['cancelled_full_refund','cancelled_partial_refund'].includes(b.status)).reduce((s, b) => s + (parseFloat(b.refundAmount) || 0), 0);
  const cancellationRate       = displayedBookings.length > 0 ? ((cancelledCount / displayedBookings.length) * 100).toFixed(1) : '0.0';
  const paidBookings           = displayedBookings.filter(b => b.status === 'fully_paid');
  const aov                    = paidBookings.length > 0 ? paidBookings.reduce((s, b) => s + (parseFloat(b.total) || 0), 0) / paidBookings.length : 0;
  const activeRecurringClients = new Set(displayedBookings.filter(b => b.isAutoRecurring && !b.status?.startsWith('cancelled')).map(b => b.email)).size;
  const everRecurringClients   = new Set(displayedBookings.filter(b => b.isAutoRecurring).map(b => b.email)).size;

  const STATS_SECTIONS = [
    { section: 'Financial', items: [
      { label: 'Total Revenue',     value: `£${totalRevenue.toFixed(2)}`,  note: 'All active bookings excl. cancellations' },
      { label: 'Gross Revenue',     value: `£${collected.toFixed(2)}`,     note: 'Money actually received to date' },
      { label: 'Outstanding',       value: `£${outstanding.toFixed(2)}`,   note: 'Remaining balances yet to be collected' },
      { label: 'Refunded',          value: `£${refunded.toFixed(2)}`,      note: 'Total refunded to customers' },
    ]},
    { section: 'Performance', items: [
      { label: 'Bookings',          value: displayedBookings.length,        note: 'Total bookings in selected period' },
      { label: 'Avg. Order Value',  value: `£${aov.toFixed(2)}`,            note: 'Average value per completed booking' },
      { label: 'Cancellation Rate', value: `${cancellationRate}%`,          note: '% of bookings that were cancelled' },
    ]},
    { section: 'Clients', items: [
      { label: 'Active Recurring',     value: activeRecurringClients, note: 'Unique clients with a live recurring arrangement' },
      { label: 'Total Ever Recurring', value: everRecurringClients,   note: 'All clients who ever had a recurring booking, incl. cancelled' },
    ]},
  ];

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        marginBottom: 24, padding: isMobile ? '16px' : '20px 24px',
        background: C.card, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${C.accent}`,
        opacity: bannerVisible ? 1 : 0,
        transform: bannerVisible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 1.2s ease, transform 1.4s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>
          Welcome back, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0]} 👋
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 13, color: welcomeColor, fontWeight: 400, marginTop: 6, lineHeight: 1.6,
          opacity: bannerVisible ? 1 : 0,
          transform: bannerVisible ? 'translateX(0)' : 'translateX(-60px)',
          transition: 'opacity 1.4s ease 0.4s, transform 1.6s cubic-bezier(0.22,1,0.36,1) 0.4s',
        }}>
          {welcomeMsg}
        </div>
      </div>

      {/* Scheduler log panel */}
      {schedulerLogs?.length > 0 && (() => {
        const latest = schedulerLogs[0];
        const runAt  = latest.runAt?.toDate ? latest.runAt.toDate() : new Date(latest.runAt);
        const hasErr = latest.failed > 0;
        return (
          <div style={{ background: C.card, border: `1px solid ${hasErr ? 'rgba(220,38,38,0.3)' : C.border}`, borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasErr ? C.danger : C.success, flexShrink: 0 }} />
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>Recurring Scheduler — Last Run</div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
                {runAt.toLocaleDateString('en-GB')} at {runAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(auto-fill,minmax(120px,1fr))', gap: '8px 12px', marginTop: 12 }}>
              {[
                { l: 'Customers checked', v: latest.customersChecked ?? '—' },
                { l: 'Attempted',         v: latest.attempted ?? '—' },
                { l: 'Created',           v: latest.created ?? '—', good: true },
                { l: 'Skipped (exists)',  v: latest.skipped ?? '—' },
                { l: 'Failed',            v: latest.failed ?? '—', bad: latest.failed > 0 },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, color: s.bad ? C.danger : s.good && latest.created > 0 ? C.success : C.text }}>{s.v}</div>
                </div>
              ))}
            </div>
            {hasErr && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.danger, marginBottom: 6 }}>Errors — action required</div>
                {latest.errors?.map((e, i) => (
                  <div key={i} style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 4 }}>{e.email} — {e.error}</div>
                ))}
              </div>
            )}
            {latest.created === 0 && latest.attempted === 0 && !hasErr && (
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>No recurring bookings were due today.</div>
            )}
          </div>
        );
      })()}

      {/* Manual scheduler trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={async () => {
            setTriggeringScheduler(true); setTriggerResult(null);
            try {
              const res  = await fetch(import.meta.env.VITE_CF_TRIGGER_SCHEDULER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
              const data = await res.json();
              setTriggerResult(data.success ? `Done — ${data.created} created, ${data.skipped} already existed${data.failed > 0 ? `, ${data.failed} failed` : ''}` : `Error: ${data.error}`);
            } catch (e) { setTriggerResult(`Error: ${e.message}`); }
            setTriggeringScheduler(false);
          }}
          disabled={triggeringScheduler}
          style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: C.bg, color: C.text, border: `1px solid ${C.border}`, cursor: triggeringScheduler ? 'not-allowed' : 'pointer', borderRadius: 6 }}
        >
          {triggeringScheduler ? 'Running…' : '⚙ Run Scheduler Now'}
        </button>
        {triggerResult && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: triggerResult.startsWith('Error') ? C.danger : C.success }}>
            {triggerResult}
          </div>
        )}
      </div>

      {/* Toolbar: search + new booking button */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Search by name, email, booking ref, phone, postcode…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 36px 10px 14px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, outline: 'none', boxSizing: 'border-box' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted, lineHeight: 1 }}>×</button>
          )}
        </div>
        <button onClick={() => setShowNewBooking(true)} style={{ ...BTN, whiteSpace: 'nowrap', background: C.accent || C.text, color: '#fff', fontWeight: 600 }}>
          + New Booking
        </button>
      </div>

      {/* Date filter */}
      <div style={{ background: C.card, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '14px 18px', marginBottom: 16 }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select value={preset} onChange={e => applyPreset(e.target.value)} style={{ ...DATE_INPUT, width: '100%', marginBottom: 0 }}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            {preset !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="date" value={dateFrom} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }} style={{ ...DATE_INPUT, flex: 1 }} />
                <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>to</span>
                <input type="date" value={dateTo}   min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateTo(e.target.value);   setPreset('custom'); }} style={{ ...DATE_INPUT, flex: 1 }} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }, { id: 'all', label: 'All Time' }].map(p => (
                <button key={p.id} onClick={() => applyPreset(p.id)} style={{ ...BTN, padding: '6px 14px', fontSize: 12, background: preset === p.id ? C.text : 'transparent', color: preset === p.id ? '#fff' : C.muted, border: `1px solid ${preset === p.id ? C.text : C.border}` }}>
                  {p.label}
                </button>
              ))}
            </div>
            {preset !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <input type="date" value={dateFrom} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }} style={DATE_INPUT} />
                <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>to</span>
                <input type="date" value={dateTo}   min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateTo(e.target.value);   setPreset('custom'); }} style={DATE_INPUT} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status + Frequency filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...DATE_INPUT, flex: 1, minWidth: 160 }}>
          <option value="all">All Statuses</option>
          <option value="pending_deposit">Awaiting Deposit</option>
          <option value="deposit_paid">Deposit Paid — Balance Due</option>
          <option value="fully_paid">All Paid</option>
          <option value="regular">Recurring Clients</option>
          <option value="cancelled">Cancelled</option>
          <option value="cancelled-recurring">Cancelled Recurring</option>
          <option value="refunded">Refunded</option>
          <option value="phone">Phone Bookings</option>
          <option value="website">Website Bookings</option>
        </select>
        <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)} style={{ ...DATE_INPUT, flex: 1, minWidth: 160 }}>
          <option value="all">All Frequencies</option>
          <option value="one-off">One-off</option>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* Stats — mobile collapsible */}
      {isMobile && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setStatsOpen(o => !o)} style={{ ...BTN, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.sidebar, color: C.accent, border: 'none', borderRadius: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>Overview</span>
            <span style={{ fontSize: 12 }}>{statsOpen ? '▲' : '▼'}</span>
          </button>
          {statsOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1, background: C.border, marginTop: 1, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              {STATS_SECTIONS.flatMap(s => s.items).slice(0, 8).map((s, i) => (
                <div key={i} style={{ background: C.card, padding: '12px 14px' }}>
                  <div style={LABEL}>{s.label}</div>
                  <div style={VALUE}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats — desktop always visible */}
      {!isMobile && (
        <div style={{ display: 'flex', gap: 1, background: C.border, borderRadius: 8, marginBottom: 16 }}>
          {STATS_SECTIONS.flatMap(s => s.items).map((s, i) => {
            const tipKey = `stat-${i}`;
            return (
              <div key={i} style={{ flex: 1, background: C.card, padding: '12px 14px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{s.label}</div>
                  <div
                    onMouseEnter={() => setStatTip(tipKey)}
                    onMouseLeave={() => setStatTip(null)}
                    style={{ width: 12, height: 12, borderRadius: '50%', border: `1px solid ${C.muted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: C.muted, cursor: 'default', flexShrink: 0 }}
                  >i</div>
                  {statTip === tipKey && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: C.text, color: C.card, fontFamily: FONT, fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap', lineHeight: 1.5, marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', borderRadius: 4 }}>
                      {s.note}
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.text }}>{s.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{selected.size} selected</span>
          <button
            onClick={handleDeleteSelected}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '6px 14px', background: C.danger, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            🗑 Delete Selected
          </button>
          {deleteProgress && (
            <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
              Deleting {deleteProgress.done}/{deleteProgress.total}…
            </span>
          )}
          <button
            onClick={() => setSelected(new Set())}
            style={{ fontFamily: FONT, fontSize: 12, padding: '6px 10px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', marginLeft: 'auto' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Select all */}
      {displayedBookings.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
          <input
            type="checkbox"
            checked={displayedBookings.length > 0 && displayedBookings.every(b => selected.has(b.id))}
            onChange={e => setSelected(e.target.checked ? new Set(displayedBookings.map(b => b.id)) : new Set())}
            style={{ width: 15, height: 15, accentColor: C.accent, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted, cursor: 'pointer' }}
            onClick={() => {
              const allSelected = displayedBookings.every(b => selected.has(b.id));
              setSelected(allSelected ? new Set() : new Set(displayedBookings.map(b => b.id)));
            }}
          >
            Select all ({displayedBookings.length})
          </span>
        </div>
      )}

      {/* Bookings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {displayedBookings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: FONT, fontSize: 13, color: C.muted }}>
            No bookings found.
          </div>
        )}
        {displayedBookings.map(b => {
          const sc = STATUS_COLOURS[b.status] || { bg: '#f5f5f5', color: '#5a5a5a', label: b.status };
          const isOpen = expanded === b.id;
          return (
            <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>

              {/* Row */}
              <div
                onClick={() => setExpanded(isOpen ? null : b.id)}
                style={{ padding: isMobile ? '12px 14px' : '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => toggleSelect(b.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ flexShrink: 0, width: 15, height: 15, accentColor: C.accent, cursor: 'pointer', marginRight: 4 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: isMobile ? 14 : 15, fontWeight: 600, color: C.text, marginBottom: 3 }}>
                    {b.firstName} {b.lastName}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                    {b.packageName} · {b.size} &nbsp;·&nbsp; {fmtDate(b.cleanDate)} at {b.cleanTime}<br />
                    {b.addr1}, {b.postcode}
                  </div>
                  {b.cancelledAt && (
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 3 }}>
                      Refund processed: {fmtCreatedAt(b.cancelledAt)}{b.refundAmount > 0 ? ` — £${b.refundAmount} refunded` : ' — No refund'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {b.isAutoRecurring && (
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, background: '#dcfce7', color: '#166534' }}>Recurring</span>
                  )}
                  {b.isPhoneBooking && !b.isAutoRecurring && (
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8' }}>Phone</span>
                  )}
                  {b.assignedStaff && (
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, background: '#f5f3ff', color: '#6d28d9' }}>👤 {b.assignedStaff}</span>
                  )}
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  <span style={{ fontSize: 14, color: C.muted, padding: '0 4px' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <BookingExpandedPanel
                  b={b} C={C} isMobile={isMobile} staff={staff} setBookings={setBookings}
                  openEdit={openEdit}
                  completing={completing} handleComplete={handleComplete}
                  cancelling={cancelling} handleCancel={handleCancel}
                  deleting={deleting} handleDelete={handleDelete}
                  markingDeposit={markingDeposit} depositErr={depositErr} handleMarkDepositPaid={handleMarkDepositPaid}
                  generatingLink={generatingLink} depositLinks={depositLinks} linkErr={linkErr}
                  emailingLink={emailingLink} emailedLinks={emailedLinks}
                  handleGenerateLink={handleGenerateLink} handleEmailDepositLink={handleEmailDepositLink}
                  stoppingRecurring={stoppingRecurring} stoppedRecurring={stoppedRecurring} handleStopRecurring={handleStopRecurring}
                  staffAssignPending={staffAssignPending} handleAssignStaff={handleAssignStaff}
                  completeErr={completeErr} cancelErr={cancelErr} stopRecurringErr={stopRecurringErr}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        isMobile={isMobile}
        C={C}
        api={bookingApi}
      />


      {/* Edit Booking Modal */}
      <EditBookingModal
        editBooking={editBooking} editData={editData} setEditData={setEditData}
        editScope={editScope} setEditScope={setEditScope}
        editSaving={editSaving} editErr={editErr}
        onClose={closeEdit} onSave={handleEditSave}
        isMobile={isMobile} C={C}
      />

      {/* Staff Assignment Confirmation Modal */}
      {staffAssignPending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 440, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              Assign {staffAssignPending.staffName}?
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.5 }}>
              This is a recurring booking for <strong>{staffAssignPending.booking.firstName} {staffAssignPending.booking.lastName}</strong>. Apply this assignment to just this date, or to all future bookings in this series?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleConfirmAssignThis} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '12px 16px', background: C.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>This booking only</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Updates just {staffAssignPending.booking.cleanDate}</div>
              </button>
              <button onClick={handleConfirmAssignAll} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '12px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>All future bookings in this series</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                  Updates {bookings.filter(x => x.email === staffAssignPending.booking.email && x.frequency === staffAssignPending.booking.frequency && x.isAutoRecurring && x.cleanDate >= new Date().toISOString().split('T')[0]).length} upcoming bookings
                </div>
              </button>
              <button onClick={() => setStaffAssignPending(null)} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: '10px 16px', background: 'none', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

