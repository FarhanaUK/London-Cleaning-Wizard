import { useState, useEffect } from 'react';
import { todayUK } from '../../../utils/time';
import { PACKAGES, FREQUENCIES, ADDONS, calculateTotal, DEEP_SUPPLIES_FEE } from '../../../data/siteData';
import { TIMES } from '../../../constants/timeOptions';
import { useBookingActions, fmtDate } from '../hooks/useBookingActions';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

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

const fmtCreatedAt = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
};

const HOW_HEARD_OPTIONS = ['Google Search','Instagram','Facebook','TikTok','Word of Mouth','Leaflet','Nextdoor','Other'];

const BLANK_BOOKING = { firstName:'', lastName:'', email:'', phone:'', addr1:'', postcode:'', propertyType:'flat', floor:'', parking:'', keys:'', notes:'', packageId:'refresh', sizeId:'', frequency:'one-off', cleanDate:'', cleanTime:'9:00 AM', addons:[], hasPets:null, petTypes:'', signatureTouch:true, signatureTouchNotes:'', hearAbout:'', supplies:'customer' };

const isValidUKPhone    = p => /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/.test(p.trim()) || /^(\+44\s?[12]\d{2,4}|\(?0[12]\d{2,4}\)?)\s?\d{3,4}\s?\d{3,4}$/.test(p.trim());
const isValidEmail      = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const isValidUKPostcode = p => /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(p.trim());

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
    selected, toggleSelect,
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
  const [nb,             setNb]             = useState(BLANK_BOOKING);
  const [nbSaving,       setNbSaving]       = useState(false);
  const [nbErr,          setNbErr]          = useState('');
  const [nbSubmitted,    setNbSubmitted]    = useState(false);
  const [nbTouched,      setNbTouched]      = useState({});
  const [nbBlockedDates, setNbBlockedDates] = useState([]);
  const [nbCalYear,      setNbCalYear]      = useState(() => new Date().getFullYear());
  const [nbCalMonth,     setNbCalMonth]     = useState(() => new Date().getMonth());

  // Persist filters
  useEffect(() => { localStorage.setItem('bkPreset', preset);       }, [preset]);
  useEffect(() => { localStorage.setItem('bkStatus', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('bkFreq',   freqFilter);   }, [freqFilter]);

  // Fetch blocked dates when calendar month changes
  useEffect(() => {
    fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${nbCalYear}&month=${nbCalMonth + 1}`)
      .then(r => r.json()).then(data => setNbBlockedDates(data.blocked || [])).catch(() => {});
  }, [nbCalYear, nbCalMonth]);

  // New booking computed values
  const nbPkg   = PACKAGES.find(p => p.id === nb.packageId);
  const nbTotal = nbPkg?.sizes.find(s => s.id === nb.sizeId)
    ? calculateTotal({ sizePrice: nbPkg.sizes.find(s => s.id === nb.sizeId).basePrice, propertyType: nb.propertyType, frequency: null, addons: nb.addons, supplies: nb.supplies, suppliesFeeOverride: nb.suppliesFee })
    : null;

  const closeNewBooking = () => { setShowNewBooking(false); setNb(BLANK_BOOKING); setNbErr(''); setNbSubmitted(false); setNbTouched({}); };

  const handleNewBooking = async () => {
    setNbSubmitted(true);
    if (!nb.firstName || !nb.lastName || !nb.email || !nb.phone || !nb.addr1 || !nb.postcode || !nb.sizeId || !nb.cleanDate || !nb.cleanTime || !nb.hearAbout || nb.hasPets === null) {
      setNbErr('Please fill in all required fields.'); return;
    }
    if (!isValidEmail(nb.email))         { setNbErr('Email address is not valid — e.g. name@example.com'); return; }
    if (!isValidUKPhone(nb.phone))       { setNbErr('Phone number is not a valid UK number — e.g. 07700 900123 or 020 8137 0026'); return; }
    if (!isValidUKPostcode(nb.postcode)) { setNbErr('Postcode is not valid — e.g. E1 6AN or SW1A 1AA'); return; }
    if (nbBlockedDates.includes(nb.cleanDate)) { setNbErr('This date is blocked in the calendar. Please choose a different date.'); return; }
    setNbSaving(true); setNbErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_SAVE_BOOKING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nb,
          package: nb.packageId, packageName: nbPkg?.name,
          size: nb.sizeId,
          frequency: nb.frequency,
          total: nbTotal?.subtotal || 0,
          deposit: nbTotal?.deposit || 0,
          remaining: nbTotal?.remaining || 0,
          stripeDepositIntentId: 'manual',
          stripeCustomerId: '',
          isReturning: false,
          source: nb.hearAbout,
          isPhoneBooking: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setNbErr(data.error || 'Failed to create booking.'); setNbSaving(false); return; }
      closeNewBooking();
    } catch (err) { setNbErr(`Something went wrong: ${err?.message || err}`); }
    setNbSaving(false);
  };

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

  const DATE_INPUT = { fontFamily: FONT, fontSize: 13, padding: '7px 10px', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 6, color: C.text, outline: 'none', cursor: 'pointer' };
  const BTN = { fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: C.text, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 6 };
  const LABEL = { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 };
  const VALUE = { fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 600, color: C.text };
  const INPUT = { width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: '#fff', border: '1px solid #d4c4ae', borderRadius: 6, color: '#1a1410', outline: 'none', marginBottom: 16, boxSizing: 'border-box' };

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
        <div style={{ display: 'flex', gap: 1, background: C.border, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
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
                <div style={{ padding: isMobile ? '0 14px 16px' : '0 18px 18px', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 16px', marginTop: 16 }}>
                    {[
                      { l: 'Booked On',        v: fmtCreatedAt(b.createdAt) },
                      { l: 'Booking Ref',      v: b.bookingRef },
                      { l: 'Phone',            v: b.phone },
                      { l: 'Email',            v: b.email },
                      { l: 'Clean Date',       v: fmtDate(b.cleanDate) },
                      { l: 'Clean Time',       v: b.cleanTime },
                      { l: 'Property',         v: `${b.propertyType} · ${b.size}` },
                      { l: 'Floor/Access',     v: b.floor || '—' },
                      { l: 'Parking',          v: b.parking || '—' },
                      { l: 'Keys',             v: b.keys || '—' },
                      { l: 'Frequency',        v: b.frequency || 'one-off' },
                      { l: 'Add-ons',          v: b.addons?.length ? b.addons.map(a => a.name).join(', ') : 'None' },
                      { l: 'Pets',             v: b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No' },
                      { l: 'Signature Touch',  v: b.signatureTouch === false ? `Opted out${b.signatureTouchNotes ? ` — ${b.signatureTouchNotes}` : ''}` : '✓ Opted in' },
                      { l: 'Marketing Opt-in', v: b.marketingOptOut ? '✕ Opted out at booking' : '✓ Opted in at booking' },
                      { l: 'Total',            v: `£${parseFloat(b.total).toFixed(2)}` },
                      { l: 'Deposit paid',     v: b.status === 'pending_deposit' ? 'Pending' : `£${parseFloat(b.deposit).toFixed(2)}`, highlight: b.status === 'pending_deposit' },
                      { l: 'Remaining',        v: `£${parseFloat(b.remaining).toFixed(2)}` },
                      { l: 'Source',           v: b.source || '—' },
                      b.stripeDepositIntentId   && { l: 'Stripe Deposit PI',  v: b.stripeDepositIntentId },
                      b.stripeRemainingIntentId && { l: 'Stripe Remaining PI', v: b.stripeRemainingIntentId },
                      b.stripeCustomerId        && { l: 'Stripe Customer ID',  v: b.stripeCustomerId },
                    ].filter(Boolean).map((r, i) => (
                      <div key={i}>
                        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                        <div style={{ fontFamily: FONT, fontSize: 13, color: r.highlight ? '#fff' : C.text, fontWeight: 400, ...(r.highlight ? { background: C.danger, display: 'inline-block', padding: '2px 8px', borderRadius: 4 } : {}) }}>{r.v}</div>
                      </div>
                    ))}
                  </div>

                  {b.notes && (
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', marginTop: 14, fontFamily: FONT, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                      Notes: {b.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => openEdit(b)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                      ✏️ Edit
                    </button>

                    {staff?.length > 0 && (
                      <select value={b.assignedStaff || ''} onChange={e => handleAssignStaff(b, e.target.value)} style={{ fontFamily: FONT, fontSize: 12, padding: '7px 10px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                        <option value="">👤 Assign cleaner…</option>
                        {staff.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    )}

                    {b.status === 'deposit_paid' && (
                      <button onClick={() => handleComplete(b)} disabled={completing === b.id} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        {completing === b.id ? 'Charging…' : '✓ Complete Job'}
                      </button>
                    )}

                    {b.status === 'pending_deposit' && !depositLinks[b.id] && (
                      <button onClick={() => handleGenerateLink(b)} disabled={generatingLink === b.id} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        {generatingLink === b.id ? 'Generating…' : '🔗 Generate Payment Link'}
                      </button>
                    )}

                    {depositLinks[b.id] && (
                      <button onClick={() => handleEmailDepositLink(b)} disabled={emailingLink === b.id || emailedLinks[b.id]} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: emailedLinks[b.id] ? '#6b7280' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: emailedLinks[b.id] ? 'default' : 'pointer' }}>
                        {emailingLink === b.id ? 'Sending…' : emailedLinks[b.id] ? '✓ Link Sent' : '📧 Email Link'}
                      </button>
                    )}

                    {b.status === 'pending_deposit' && (
                      <button onClick={() => handleMarkDepositPaid(b)} disabled={markingDeposit === b.id} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                        {markingDeposit === b.id ? 'Saving…' : '💷 Mark Deposit Paid'}
                      </button>
                    )}

                    {b.isAutoRecurring && !stoppedRecurring.has(b.id) && (
                      <button onClick={() => handleStopRecurring(b)} disabled={stoppingRecurring === b.id} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.warning, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                        {stoppingRecurring === b.id ? 'Stopping…' : '⏹ Stop Recurring'}
                      </button>
                    )}

                    {!b.status?.startsWith('cancelled') && (
                      <button onClick={() => handleCancel(b)} disabled={cancelling === b.id} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.danger, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                        {cancelling === b.id ? 'Cancelling…' : '✕ Cancel'}
                      </button>
                    )}

                    <button onClick={() => handleDelete(b)} disabled={deleting === b.id} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 6, cursor: 'pointer' }}>
                      {deleting === b.id ? 'Deleting…' : '🗑 Delete'}
                    </button>
                  </div>

                  {/* Inline error messages */}
                  {(completeErr || cancelErr || linkErr || depositErr || stopRecurringErr) && (
                    <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 8 }}>
                      {completeErr || cancelErr || linkErr || depositErr || stopRecurringErr}
                    </div>
                  )}

                  {depositLinks[b.id] && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: FONT, fontSize: 11, color: C.muted, wordBreak: 'break-all' }}>
                      {depositLinks[b.id]}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Booking Modal */}
      {showNewBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 540, background: '#FAF8F4', overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' }}>New Booking</div>
              <button onClick={closeNewBooking} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8b7355' }}>✕</button>
            </div>

            {/* Customer */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 12 }}>Customer Details</div>
            {[
              { label: 'First Name *', key: 'firstName', placeholder: 'Sophie' },
              { label: 'Last Name *',  key: 'lastName',  placeholder: 'Lewis' },
              { label: 'Email *',      key: 'email',    type: 'email', placeholder: 'name@example.com',
                validate: v => !v || isValidEmail(v),
                hint: 'e.g. name@example.com' },
              { label: 'Phone *',      key: 'phone', placeholder: '07700 900 123',
                validate: v => !v || isValidUKPhone(v),
                hint: 'e.g. 07700 900123 or 020 8137 0026' },
              { label: 'Address *',    key: 'addr1',    placeholder: 'Flat 3, 42 Mare Street' },
              { label: 'Postcode *',   key: 'postcode', placeholder: 'E8 1HL',
                validate: v => !v || isValidUKPostcode(v),
                hint: 'e.g. E1 6AN or SW1A 1AA' },
              { label: 'Floor / Lift', key: 'floor',   placeholder: '2nd floor, no lift' },
              { label: 'Parking',      key: 'parking', placeholder: 'Free street parking nearby' },
              { label: 'Keys',         key: 'keys',    placeholder: 'Key with concierge, smart lock code 1234' },
            ].map(f => {
              const isEmpty  = f.label.includes('*') && !nb[f.key];
              const touched  = nbTouched[f.key] || nbSubmitted;
              const invalid  = f.validate && nb[f.key] && touched && !f.validate(nb[f.key]);
              const showErr  = nbSubmitted && isEmpty;
              return (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: showErr ? C.danger : '#8b7355', marginBottom: 4 }}>{f.label}</div>
                  <input
                    type={f.type || 'text'}
                    value={nb[f.key]}
                    placeholder={f.placeholder}
                    onChange={e => setNb(p => ({ ...p, [f.key]: e.target.value }))}
                    onBlur={() => setNbTouched(p => ({ ...p, [f.key]: true }))}
                    style={{ ...INPUT, marginBottom: 0, borderColor: (invalid || showErr) ? C.danger : undefined }}
                  />
                  {showErr
                    ? <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>This field is required</div>
                    : invalid
                      ? <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>Not valid — {f.hint}</div>
                      : f.hint && !nb[f.key] && <div style={{ fontFamily: FONT, fontSize: 11, color: '#a89070', marginTop: 4 }}>{f.hint}</div>
                  }
                </div>
              );
            })}

            {/* Property type */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Property Type</div>
              <select value={nb.propertyType} onChange={e => setNb(p => ({ ...p, propertyType: e.target.value, sizeId: e.target.value === 'house' && p.sizeId === 'studio' ? '' : p.sizeId }))} style={{ ...INPUT, marginBottom: 0 }}>
                <option value="flat">Flat / Apartment / Studio</option>
                <option value="house">House (+10%)</option>
              </select>
            </div>

            {/* Package */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Service</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Package *</div>
              <select value={nb.packageId} onChange={e => {
                const pkg = PACKAGES.find(p => p.id === e.target.value);
                const isDeep = e.target.value === 'deep';
                setNb(p => ({ ...p, packageId: e.target.value, sizeId: '', addons: [], frequency: pkg?.showFreq ? p.frequency : 'one-off', supplies: isDeep ? 'cleaner' : p.supplies, suppliesFee: isDeep ? DEEP_SUPPLIES_FEE : undefined }));
              }} style={{ ...INPUT, marginBottom: 0 }}>
                {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && !nb.sizeId ? C.danger : '#8b7355', marginBottom: 4 }}>Size *</div>
              <select value={nb.sizeId} onChange={e => setNb(p => ({ ...p, sizeId: e.target.value }))} style={{ ...INPUT, marginBottom: 0, borderColor: nbSubmitted && !nb.sizeId ? C.danger : undefined }}>
                <option value="">— Select size —</option>
                {(nbPkg?.sizes || []).filter(s => !(nb.propertyType === 'house' && s.id === 'studio')).map(s => {
                  const price = Math.round(s.basePrice * (nb.propertyType === 'house' ? 1.10 : 1.0));
                  return <option key={s.id} value={s.id}>{s.label} — £{price}</option>;
                })}
              </select>
              {nbSubmitted && !nb.sizeId && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>This field is required</div>}
            </div>
            {nbPkg?.showFreq ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Frequency</div>
                <select value={nb.frequency} onChange={e => setNb(p => ({ ...p, frequency: e.target.value }))} style={{ ...INPUT, marginBottom: 8 }}>
                  {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', padding: '10px 12px', borderRadius: 4, fontFamily: FONT, fontSize: 11, color: '#166534', lineHeight: 1.7 }}>
                  <strong>Frequency discounts (from 2nd clean onwards):</strong><br />
                  Weekly — save £30 per clean<br />
                  Fortnightly — save £15 per clean<br />
                  Monthly — save £7 per clean<br />
                  <span style={{ color: C.warning }}>First clean is always charged at full price.</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: '#f5f0e8', border: '1px solid #d4c4ae', borderRadius: 6, fontFamily: FONT, fontSize: 12, color: '#8b7355' }}>
                Frequency: One-off only for this package
              </div>
            )}

            {/* Date & Time */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Date & Time</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && !nb.cleanDate ? C.danger : '#8b7355', marginBottom: 8 }}>Date *</div>
              {/* Mini calendar */}
              {(() => {
                const MONTHS_CAL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const DAYS_CAL   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
                const todayStr   = todayUK();
                const firstDay   = new Date(nbCalYear, nbCalMonth, 1).getDay();
                const daysInMon  = new Date(nbCalYear, nbCalMonth + 1, 0).getDate();
                const calDays    = [];
                for (let i = 0; i < firstDay; i++) calDays.push(null);
                for (let d = 1; d <= daysInMon; d++) {
                  const mm = String(nbCalMonth + 1).padStart(2, '0');
                  const dd = String(d).padStart(2, '0');
                  calDays.push(`${nbCalYear}-${mm}-${dd}`);
                }
                const changeMonth = (dir) => {
                  let m = nbCalMonth + dir, y = nbCalYear;
                  if (m < 0)  { m = 11; y--; }
                  if (m > 11) { m = 0;  y++; }
                  setNbCalMonth(m); setNbCalYear(y);
                  fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${y}&month=${m + 1}`)
                    .then(r => r.json()).then(data => setNbBlockedDates(data.blocked || [])).catch(() => {});
                };
                return (
                  <div style={{ border: '1px solid rgba(200,184,154,0.3)', background: '#fdf8f3', borderRadius: 8, padding: '12px 14px', marginBottom: 4 }}>
                    {/* Month nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <button type="button" onClick={() => changeMonth(-1)} style={{ background: 'none', border: '1px solid #d4c4ae', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', color: '#8b7355', fontSize: 12 }}>←</button>
                      <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: '#1a1410' }}>{MONTHS_CAL[nbCalMonth]} {nbCalYear}</div>
                      <button type="button" onClick={() => changeMonth(1)}  style={{ background: 'none', border: '1px solid #d4c4ae', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', color: '#8b7355', fontSize: 12 }}>→</button>
                    </div>
                    {/* Day headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                      {DAYS_CAL.map(d => <div key={d} style={{ textAlign: 'center', fontFamily: FONT, fontSize: 9, color: '#8b7355', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d}</div>)}
                    </div>
                    {/* Day grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                      {calDays.map((dateStr, i) => {
                        if (!dateStr) return <div key={`e-${i}`} />;
                        const isPast    = dateStr < todayStr;
                        const isBlocked = nbBlockedDates.includes(dateStr);
                        const isOff     = isPast || isBlocked;
                        const isSel     = nb.cleanDate === dateStr;
                        return (
                          <div
                            key={dateStr}
                            onClick={() => {
                              if (isOff) return;
                              setNb(p => ({ ...p, cleanDate: dateStr, cleanTime: '9:00 AM' }));
                            }}
                            style={{
                              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontFamily: FONT, fontWeight: 300,
                              cursor: isOff ? 'not-allowed' : 'pointer',
                              background: isSel ? '#c8b89a' : isBlocked ? 'rgba(220,38,38,0.1)' : 'transparent',
                              color: isBlocked ? C.danger : isPast ? '#c4b89e' : isSel ? '#1a1410' : '#2c2420',
                              textDecoration: isBlocked ? 'line-through' : 'none',
                              border: isSel ? 'none' : '1px solid transparent',
                              borderRadius: 1,
                            }}
                            onMouseEnter={e => { if (!isOff && !isSel) e.currentTarget.style.border = '1px solid #8b7355'; }}
                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.border = '1px solid transparent'; }}
                          >
                            {parseInt(dateStr.split('-')[2])}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {nb.cleanDate && <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Selected: {nb.cleanDate.split('-').reverse().join('/')}</div>}
              {nbSubmitted && !nb.cleanDate && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 2 }}>This field is required</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Time *</div>
              <select value={nb.cleanTime} onChange={e => setNb(p => ({ ...p, cleanTime: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
                {TIMES.filter(t => {
                  if (nb.cleanDate !== todayUK()) return true;
                  const [time, period] = t.split(' ');
                  let h = parseInt(time.split(':')[0]);
                  if (period === 'PM' && h !== 12) h += 12;
                  if (period === 'AM' && h === 12) h = 0;
                  return h > new Date().getHours();
                }).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Add-ons */}
            {nbPkg?.showAddons && (
              <>
                <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Add-ons</div>
                {ADDONS.filter(a => !(a.id === 'microwave' && nb.packageId === 'standard')).map(a => {
                  const allSizesSmall = (nbPkg?.sizes || []).every(s => ['studio', '1bed'].includes(s.id));
                  const isSmall = ['studio', '1bed'].includes(nb.sizeId) || allSizesSmall;
                  const price   = a.id === 'windows' ? (isSmall ? 35 : 55) : a.price;
                  return (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: '#1a1410' }}>
                    <input type="checkbox" checked={nb.addons.some(x => x.id === a.id)} onChange={e => setNb(p => ({ ...p, addons: e.target.checked ? [...p.addons, { ...a, price }] : p.addons.filter(x => x.id !== a.id) }))} style={{ accentColor: '#c8b89a' }} />
                    {a.name} — £{price}
                  </label>
                  );
                })}
              </>
            )}

            {/* Supplies */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Cleaning Supplies</div>
            {nb.packageId === 'deep' ? (
              <div style={{ fontFamily: FONT, fontSize: 13, color: '#1a1410', marginBottom: 8 }}>
                Specialist supplies included <span style={{ color: '#8b7355', fontSize: 11, fontWeight: 300 }}>— +£{DEEP_SUPPLIES_FEE} (automatically applied)</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {[
                  { id: 'customer', label: 'Customer provides supplies', note: 'No extra charge' },
                  { id: 'cleaner',  label: 'Cleaner brings supplies',    note: '+£8' },
                ].map(opt => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: '#1a1410' }}>
                    <input type="radio" name="supplies" value={opt.id} checked={nb.supplies === opt.id} onChange={() => setNb(p => ({ ...p, supplies: opt.id }))} style={{ accentColor: '#c8b89a' }} />
                    {opt.label} <span style={{ color: '#8b7355', fontSize: 11, fontWeight: 300 }}>— {opt.note}</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ background: '#fffbeb', border: '1px solid #d97706', borderLeft: '3px solid #d97706', borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontFamily: FONT, fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
              Remind the customer: our cleaners do not bring mops or vacuums. The customer must have a working mop and vacuum available at the property.
            </div>

            {/* Live price summary */}
            {nbTotal ? (
              <div style={{ background: '#2c2420', padding: '16px 18px', margin: '20px 0', borderRadius: 8 }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,184,154,0.5)', marginBottom: 10 }}>Running Total</div>
                {nbTotal.houseExtra > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                    <span>House surcharge (+10%)</span><span>+£{nbTotal.houseExtra.toFixed(2)}</span>
                  </div>
                )}
                {nbTotal.freqSave > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                    <span>Frequency discount</span><span>−£{nbTotal.freqSave.toFixed(2)}</span>
                  </div>
                )}
                {nbTotal.addnSum > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                    <span>Add-ons</span><span>+£{nbTotal.addnSum.toFixed(2)}</span>
                  </div>
                )}
                {nbTotal.suppliesFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                    <span>Cleaning supplies</span><span>+£{nbTotal.suppliesFee.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid rgba(200,184,154,0.2)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#f5f0e8' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, alignSelf: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</span><span>£{nbTotal.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginTop: 4 }}>
                  <span>Deposit due now (30%)</span><span>£{nbTotal.deposit.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginTop: 2 }}>
                  <span>Remaining after clean (70%)</span><span>£{nbTotal.remaining.toFixed(2)}</span>
                </div>
                {FREQUENCIES.find(f => f.id === nb.frequency && f.saving > 0) && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(200,184,154,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: '#6fcf97' }}>
                      <span>From your 2nd clean ({FREQUENCIES.find(f => f.id === nb.frequency).label})</span>
                      <span>£{(nbTotal.subtotal - FREQUENCIES.find(f => f.id === nb.frequency).saving).toFixed(2)} / visit</span>
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(111,207,151,0.7)', marginTop: 3 }}>
                      £{FREQUENCIES.find(f => f.id === nb.frequency).saving} {FREQUENCIES.find(f => f.id === nb.frequency).label.toLowerCase()} discount applied
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: '#f5f0e8', border: '1px solid #d4c4ae', borderRadius: 6, padding: '12px 14px', margin: '20px 0', fontFamily: FONT, fontSize: 12, color: '#8b7355' }}>
                Select a package and size to see the total
              </div>
            )}

            {/* Pets */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Pets & Notes</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && nb.hasPets === null ? C.danger : '#8b7355', marginBottom: 8 }}>Any pets at the property? *</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['Yes','No'].map(v => (
                  <button key={v} onClick={() => setNb(p => ({ ...p, hasPets: v === 'Yes', petTypes: v === 'No' ? '' : p.petTypes }))}
                    style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', flex: 1, background: (v === 'Yes' ? nb.hasPets === true : nb.hasPets === false) ? '#c8b89a' : 'transparent', color: '#1a1410', border: '1px solid #d4c4ae', cursor: 'pointer', borderRadius: 6 }}>
                    {v}
                  </button>
                ))}
              </div>
              {nbSubmitted && nb.hasPets === null && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 6 }}>This field is required</div>}
              {nb.hasPets && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>What type of pets?</div>
                  <input value={nb.petTypes} onChange={e => setNb(p => ({ ...p, petTypes: e.target.value }))} placeholder="e.g. cats, dogs" style={{ ...INPUT, marginBottom: 0 }} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Notes</div>
              <textarea value={nb.notes} onChange={e => setNb(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...INPUT, marginBottom: 0, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && !nb.hearAbout ? C.danger : '#8b7355', marginBottom: 4 }}>How did they hear about us? *</div>
              <select value={nb.hearAbout} onChange={e => setNb(p => ({ ...p, hearAbout: e.target.value }))} style={{ ...INPUT, marginBottom: 0, borderColor: nbSubmitted && !nb.hearAbout ? C.danger : undefined }}>
                <option value="">— Select —</option>
                {HOW_HEARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {nbSubmitted && !nb.hearAbout && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>This field is required</div>}
            </div>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f5f0e8', border: '1px solid #d4c4ae', borderRadius: 6, fontFamily: FONT, fontSize: 12, color: '#8b7355' }}>
              📞 This booking will be marked as a <strong>Phone booking</strong> in all emails and records.
            </div>

            {/* Terms & Conditions */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>
              Terms & Conditions — Read to the customer before proceeding
            </div>
            <div style={{ height: 200, overflowY: 'scroll', border: '1px solid #d4c4ae', borderRadius: 6, background: '#ffffff', padding: '14px 16px', marginBottom: 10 }}>
              {[
                { heading: '1. Deposit & Payment', body: 'A 30% deposit is required to secure your booking and is charged immediately upon confirmation. The remaining balance will be charged automatically once your clean has been completed and marked as done by our team. By proceeding, you authorise London Cleaning Wizard to charge the remaining balance to your saved payment method upon job completion.' },
                { heading: '2. Cancellation & Rescheduling Policy', body: 'One-off bookings / First Booking: Full refund if cancelled more than 48 hours before the scheduled clean. No refund if cancelled less than 48 hours before the clean.\n\nRegular services (weekly, fortnightly or monthly): You may cancel your recurring arrangement at any time with at least 48 hours notice before your next scheduled clean. For cancellations with less than 48 hours notice, a charge of 30% of that clean\'s price will be applied to your saved payment method, as your cleaner\'s time will have been reserved.\n\nCancelling two consecutive cleans will end your recurring arrangement and your recurring discount. A new booking will be required, subject to standard first-clean pricing.\n\nIf our cleaner arrives at the scheduled time and is refused access or the clean is declined for any reason, this will be treated as a late cancellation and the applicable charge will apply.\n\nAll cancellations must be made by phone call only on 020 8137 0026. Cancellation requests made by email, text, WhatsApp or any other method will not be accepted as valid notice and will not waive any applicable charges. We reserve the right to review pricing with a minimum of 4 weeks written notice.' },
                { heading: '3. Pet Policy', body: 'All pets must be secured and kept away from our cleaning team for the entire duration of the clean. This is for the safety of both your pet and our staff. Failure to secure pets may result in the clean being abandoned without refund of the deposit.' },
                { heading: '4. Access to Property', body: 'You agree to ensure our team has full access to the property at the agreed time. If access is not provided within 15 minutes of the scheduled start time, the clean may be abandoned and no refund will be issued.' },
                { heading: '5. Property Condition & Liability', body: 'You confirm that the property details provided are accurate. London Cleaning Wizard carries full public liability insurance. Any damage must be reported within 24 hours of the clean. We are not liable for pre-existing damage or items of exceptional value not declared prior to the clean.' },
                { heading: '6. Service Standards', body: 'If you are not satisfied with any aspect of your clean, you must notify us within 24 hours and we will arrange a complimentary re-clean of the affected areas. We do not offer refunds after a clean has been completed.' },
                { heading: '7. Cleaner Allocation', body: 'While we always strive to send the same dedicated cleaner for recurring bookings, this cannot be guaranteed. In the event that your usual cleaner is unavailable, we will contact you in advance and arrange an equally skilled replacement.' },
                { heading: '8. Privacy', body: 'Your personal data is processed in accordance with our Privacy Policy. We use your contact details to manage your booking and send confirmations only. We do not sell or share your data with third parties.' },
              ].map(({ heading, body }) => (
                <div key={heading} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#1a1410', marginBottom: 4 }}>{heading}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: '#8b7355', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</div>
                </div>
              ))}
              <div style={{ fontFamily: FONT, fontSize: 11, color: '#a89070', fontStyle: 'italic', marginTop: 8 }}>
                London Cleaning Wizard · Registered in England & Wales
              </div>
            </div>

            <div style={{ background: '#fff0f0', border: '1px solid #cc0000', borderLeft: '4px solid #cc0000', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#cc0000', marginBottom: 4 }}>
                ⚠ Before clicking "Create Booking"
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: '#cc0000', fontWeight: 600, lineHeight: 1.6 }}>
                Do <strong>not</strong> confirm the booking with the customer yet. Once created, go to the booking and use <strong>Generate Payment Link</strong> to send them the deposit link. Only confirm once payment is received.
              </div>
            </div>

            {nbErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{nbErr}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeNewBooking} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: 'transparent', color: '#8b7355', border: '1px solid #d4c4ae', cursor: 'pointer', borderRadius: 6 }}>
                Cancel
              </button>
              <button onClick={handleNewBooking} disabled={nbSaving} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', flex: 1, background: '#c8b89a', color: '#1a1410', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
                {nbSaving ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 480, background: C.bg, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: 24, color: C.text }}>Edit Booking</div>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 24 }}>
              {editBooking.firstName} {editBooking.lastName} · {editBooking.bookingRef}
            </div>

            {/* Date & Time */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>Date & Time</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Clean Date</div>
              <input type="date" value={editData.cleanDate || ''} onChange={e => setEditData(p => ({ ...p, cleanDate: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Clean Time</div>
              <select value={editData.cleanTime || ''} onChange={e => setEditData(p => ({ ...p, cleanTime: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Customer Details */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Customer Details</div>
            {[
              { label: 'First Name', key: 'firstName' },
              { label: 'Last Name',  key: 'lastName' },
              { label: 'Email',      key: 'email' },
              { label: 'Phone',      key: 'phone' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>{f.label}</div>
                <input value={editData[f.key] ?? ''} onChange={e => setEditData(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}

            {/* Service */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Service</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Package</div>
              <select value={editData.packageId || ''} onChange={e => {
                const pkg = PACKAGES.find(p => p.id === e.target.value);
                setEditData(p => ({ ...p, packageId: e.target.value, packageName: pkg?.name || '', sizeId: '', addons: [], frequency: pkg?.showFreq ? p.frequency : 'one-off' }));
              }} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }}>
                {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Size</div>
              <select value={editData.sizeId || ''} onChange={e => setEditData(p => ({ ...p, sizeId: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Select size</option>
                {(PACKAGES.find(p => p.id === editData.packageId)?.sizes || []).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            {PACKAGES.find(p => p.id === editData.packageId)?.showFreq && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Frequency</div>
                <select value={editData.frequency || 'one-off'} onChange={e => setEditData(p => ({ ...p, frequency: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }}>
                  {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            )}
            {PACKAGES.find(p => p.id === editData.packageId)?.showAddons && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 8 }}>Add-ons</div>
                {ADDONS.filter(a => !(a.id === 'microwave' && editData.packageId === 'standard')).map(a => {
                  const isSmall = ['studio', '1bed'].includes(editData.sizeId);
                  const price   = a.id === 'windows' ? (isSmall ? 35 : 55) : a.price;
                  return (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: C.text }}>
                      <input type="checkbox" checked={(editData.addons||[]).some(x => x.id === a.id)} onChange={e => setEditData(p => ({ ...p, addons: e.target.checked ? [...(p.addons||[]), { id: a.id, name: a.name, price }] : (p.addons||[]).filter(x => x.id !== a.id) }))} />
                      {a.name} — £{price}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Address & Access */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Address & Access</div>
            {[
              { label: 'Address',      key: 'addr1' },
              { label: 'Postcode',     key: 'postcode' },
              { label: 'Floor / Lift', key: 'floor' },
              { label: 'Parking',      key: 'parking' },
              { label: 'Keys',         key: 'keys' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>{f.label}</div>
                <input value={editData[f.key] ?? ''} onChange={e => setEditData(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}

            {/* Pets & Preferences */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Pets & Preferences</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 8 }}>Pets at property?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: false, l: 'No' }, { v: true, l: 'Yes' }].map(opt => (
                  <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, hasPets: opt.v }))} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 20px', background: editData.hasPets === opt.v ? C.text : 'transparent', color: editData.hasPets === opt.v ? '#fff' : C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>{opt.l}</button>
                ))}
              </div>
            </div>
            {editData.hasPets && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Pet description</div>
                <input value={editData.petTypes ?? ''} onChange={e => setEditData(p => ({ ...p, petTypes: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 8 }}>Signature Touch</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: true, l: 'Opted in' }, { v: false, l: 'Opted out' }].map(opt => (
                  <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, signatureTouch: opt.v }))} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 20px', background: editData.signatureTouch === opt.v ? C.text : 'transparent', color: editData.signatureTouch === opt.v ? '#fff' : C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>{opt.l}</button>
                ))}
              </div>
            </div>
            {editData.signatureTouch === false && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Opt-out reason</div>
                <input value={editData.signatureTouchNotes ?? ''} onChange={e => setEditData(p => ({ ...p, signatureTouchNotes: e.target.value }))} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Notes */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Notes</div>
            <textarea value={editData.notes ?? ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', marginBottom: 14, resize: 'vertical', boxSizing: 'border-box' }} />

            {editBooking.frequency && editBooking.frequency !== 'one-off' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>Apply changes to</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'this', label: 'This booking only', sub: 'Other future bookings stay the same.' },
                    { id: 'all',  label: 'This and all future bookings', sub: `Updates their ${editBooking.frequency} recurring schedule — time, address, and access details.` },
                  ].map(opt => (
                    <div key={opt.id} onClick={() => setEditScope(opt.id)} style={{ display: 'flex', gap: 12, padding: '12px 14px', border: `1px solid ${editScope === opt.id ? C.accent : C.border}`, borderRadius: 6, background: editScope === opt.id ? '#f8f9fa' : C.card, cursor: 'pointer' }}>
                      <div style={{ width: 16, height: 16, border: editScope === opt.id ? 'none' : `1px solid ${C.border}`, background: editScope === opt.id ? C.accent : 'transparent', borderRadius: '50%', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {editScope === opt.id && <div style={{ width: 6, height: 6, background: C.text, borderRadius: '50%' }} />}
                      </div>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{opt.label}</div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, fontWeight: 300, marginTop: 2 }}>{opt.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{editErr}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeEdit} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', flex: 1, background: C.accent, color: C.text, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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

