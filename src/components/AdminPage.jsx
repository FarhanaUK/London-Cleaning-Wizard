import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { todayUK } from '../utils/time';
import { Sparkle, LogoMark } from './Icons';

const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
const fmtCreatedAt = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
};

const INPUT = {
  width: '100%', padding: '10px 0',
  fontFamily: "'Jost',sans-serif", fontSize: 14,
  background: 'transparent', border: 'none',
  borderBottom: '1px solid rgba(200,184,154,0.4)',
  color: '#2c2420', outline: 'none', marginBottom: 20,
};

const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  fontWeight: 500, padding: '10px 22px',
  background: '#2c2420', color: '#f5f0e8',
  border: 'none', cursor: 'pointer',
};

const WELCOME_MESSAGES = [
  'Look at how much you\'ve made! Keep up the good work.',
  'London is cleaner because of you. No pressure, but also — yes, pressure.',
  'Another day, another spotless empire. Let\'s get it.',
  'Today\'s mess is tomorrow\'s five-star review.',
  'You turned elbow grease into a business. Respect.',
  'Every booking is someone trusting you with their home. That\'s huge.',
  'Dirt fears you. Clients love you. Enough said.',
  'Behind every clean home is a boss who made it happen — that\'s you.',
  'Running a business AND keeping London spotless? Superhuman.',
  'Your five-star reviews didn\'t write themselves. Oh wait, they kind of did.',
  'The cleaning wizard strikes again. What\'s on the books today?',
  'You didn\'t just start a cleaning business, you started a happiness business.',
  'Time to turn chaos into calm. You\'ve got this.',
  'Your clients sleep better knowing you exist. That\'s a gift.',
  'Another booking? Another win. You\'re on a roll.',
  'You built something real here. Be proud of it.',
  'Some people clean houses. You built a business doing it. Big difference.',
  'The mess doesn\'t stand a chance against you.',
  'Don\'t forget to thank God for giving you the health, energy, and strength to build all of this. It\'s a blessing.',
  'You are on a roll! Keep this up and millionaire status is just around the corner.',
  'One of you manages life. Two of you together? You\'re building an empire.',
];

const STATUS_COLOURS = {
  deposit_paid:            { bg: '#fff8eb', color: '#7a5c00', label: 'Deposit Paid' },
  fully_paid:              { bg: '#f3faf6', color: '#1a5234', label: 'Fully Paid' },
  payment_failed:          { bg: '#fdf5f5', color: '#6b1010', label: 'Payment Failed' },
  cancelled_full_refund:   { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Full Refund' },
  cancelled_partial_refund:{ bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Partial Refund' },
  cancelled_no_refund:     { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — No Refund' },
};

export default function AdminPage() {
  const [user,        setUser]        = useState(null);
  const [bookings,    setBookings]    = useState([]);
  const [preset,      setPreset]      = useState('today');
  const [dateFrom,    setDateFrom]    = useState(todayUK());
  const [dateTo,      setDateTo]      = useState(todayUK());
  const [email,       setEmail]       = useState('');
  const [pass,        setPass]        = useState('');
  const [loginErr,    setLoginErr]    = useState('');
  const [completing,  setCompleting]  = useState(null);
  const [completeErr, setCompleteErr] = useState('');
  const [cancelling,  setCancelling]  = useState(null);
  const [cancelErr,   setCancelErr]   = useState('');
  const [deleting,    setDeleting]    = useState(null);
  const [expanded,    setExpanded]    = useState(null);
  const [welcomeMsg,   setWelcomeMsg]   = useState('');
  const [authLoading,   setAuthLoading]   = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [selected,      setSelected]      = useState(new Set());

  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    setAuthLoading(false);
    if (u) {
      setWelcomeMsg(WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
      setTimeout(() => setBannerVisible(true), 50);
    } else {
      setBannerVisible(false);
    }
  }), []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  const handleLogin = async () => {
    setLoginErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch {
      setLoginErr('Incorrect email or password.');
    }
  };

  const handleDelete = async (booking) => {
    if (!window.confirm(`Delete booking for ${booking.firstName} ${booking.lastName} on ${fmtDate(booking.cleanDate)}? This cannot be undone.`)) return;
    setDeleting(booking.id);
    try {
      const res = await fetch(import.meta.env.VITE_CF_DELETE_BOOKING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompleteErr(data.error || 'Failed to delete booking.');
      } else {
        if (expanded === booking.id) setExpanded(null);
        setSelected(prev => { const s = new Set(prev); s.delete(booking.id); return s; });
      }
    } catch {
      setCompleteErr('Failed to delete booking.');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.size} selected booking${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setCompleteErr('');
    for (const id of selected) {
      try {
        const res = await fetch(import.meta.env.VITE_CF_DELETE_BOOKING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: id }),
        });
        if (!res.ok) setCompleteErr('Some bookings could not be deleted.');
      } catch {
        setCompleteErr('Some bookings could not be deleted.');
      }
    }
    setSelected(new Set());
    setExpanded(null);
  };

  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const handleExportCSV = () => {
    const headers = [
      'Booked On', 'Booking Ref', 'First Name', 'Last Name', 'Email', 'Phone',
      'Clean Date', 'Clean Time', 'Package', 'Property Type', 'Size',
      'Address', 'Postcode', 'Floor/Access', 'Parking', 'Keys',
      'Frequency', 'Add-ons', 'Pets', 'Signature Touch', 'Notes', 'Total', 'Deposit', 'Remaining', 'Status',
    ];
    const escape = v => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = displayedBookings.map(b => [
      fmtCreatedAt(b.createdAt), b.bookingRef, b.firstName, b.lastName, b.email, b.phone,
      fmtDate(b.cleanDate), b.cleanTime, b.packageName, b.propertyType, b.size,
      b.addr1, b.postcode, b.floor || '', b.parking || '', b.keys || '',
      b.frequency || 'one-off',
      b.addons?.length ? b.addons.map(a => a.name).join('; ') : '',
      b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No',
      b.signatureTouch === false ? `Opted out${b.signatureTouchNotes ? ` — ${b.signatureTouchNotes}` : ''}` : 'Opted in',
      b.notes || '',
      b.total, b.deposit, b.remaining,
      STATUS_COLOURS[b.status]?.label || b.status,
    ].map(escape).join(','));
    const csv = [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplete = async (booking) => {
    setCompleting(booking.id);
    setCompleteErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_COMPLETE_JOB, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompleteErr(data.error || 'Failed to charge remaining balance.');
      }
    } catch {
      setCompleteErr('Something went wrong. Please try again.');
    } finally {
      setCompleting(null);
    }
  };

  const handleCancel = async (booking) => {
    const hoursUntil = (new Date(booking.cleanDateUTC) - new Date()) / 3600000;
    const refundPct  = hoursUntil >= 48 ? 100 : hoursUntil >= 24 ? 50 : 0;
    const refundAmt  = (booking.deposit * refundPct / 100).toFixed(2);
    const msg        = refundPct === 100
      ? `Full refund of £${refundAmt} will be issued (more than 48hrs notice).`
      : refundPct === 50
      ? `50% refund of £${refundAmt} will be issued (24–48hrs notice).`
      : `No refund will be issued (less than 24hrs notice).`;
    if (!window.confirm(`Cancel this booking?\n\n${msg}\n\nThis cannot be undone.`)) return;
    setCancelling(booking.id);
    setCancelErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_CANCEL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, reason: 'Cancelled by admin' }),
      });
      const data = await res.json();
      if (!res.ok) setCancelErr(data.error || 'Failed to cancel booking.');
    } catch {
      setCancelErr('Something went wrong. Please try again.');
    } finally {
      setCancelling(null);
    }
  };

  // ── Auth loading (prevents flash of login screen on refresh) ──
  if (authLoading) return <div style={{ minHeight: '100vh', background: '#FAF8F4' }} />;

  // ── Login screen ──────────────────────────────────────────────
  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#FAF8F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '48px 36px', background: 'white', border: '1px solid rgba(200,184,154,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <LogoMark size={32} color="#c8b89a" />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#1a1410' }}>London Cleaning Wizard</div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8b7355' }}>Admin</div>
          </div>
        </div>

        <input
          type="email" value={email} placeholder="Email"
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={INPUT}
        />
        <input
          type="password" value={pass} placeholder="Password"
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={INPUT}
        />
        {loginErr && (
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 14 }}>
            {loginErr}
          </p>
        )}
        <button onClick={handleLogin} style={{ ...BTN, width: '100%', padding: '13px' }}>
          Sign In
        </button>
      </div>
    </div>
  );

  // ── Admin dashboard ───────────────────────────────────────────
  const today = todayUK();
  const year  = today.slice(0, 4);

  const applyPreset = (p) => {
    setPreset(p);
    if (p === 'today') {
      setDateFrom(today); setDateTo(today);
    } else if (p === 'week') {
      const d   = new Date(`${today}T12:00:00Z`);
      const day = d.getUTCDay();
      const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
      const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
      const fmt = x => x.toISOString().slice(0, 10);
      setDateFrom(fmt(mon)); setDateTo(fmt(sun));
    } else if (p === 'month') {
      const [y, m] = today.split('-').map(Number);
      const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      setDateFrom(`${today.slice(0, 7)}-01`); setDateTo(last);
    }
    // 'all' uses no date filter — no dateFrom/dateTo needed
  };

  const displayedBookings = (preset === 'all' ? bookings : bookings.filter(b => b.cleanDate >= dateFrom && b.cleanDate <= dateTo))
    .filter(b => statusFilter === 'all' ? true : b.status === statusFilter)
    .sort((a, b) => a.cleanDate === b.cleanDate
      ? (a.cleanTime || '').localeCompare(b.cleanTime || '')
      : a.cleanDate.localeCompare(b.cleanDate));

  const totalValue  = displayedBookings.reduce((s, b) => s + (b.total   || 0), 0);
  const collected   = displayedBookings.reduce((s, b) => {
    if (b.status === 'fully_paid') return s + (b.total || 0);
    if (['deposit_paid', 'payment_failed'].includes(b.status)) return s + (b.deposit || 0);
    return s;
  }, 0);
  const outstanding = displayedBookings
    .filter(b => b.status === 'deposit_paid')
    .reduce((s, b) => s + (b.remaining || 0), 0);

  const LABEL = { fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 6 };
  const VALUE = { fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' };
  const DATE_INPUT = {
    fontFamily: "'Jost',sans-serif", fontSize: 12, padding: '7px 10px',
    border: '1px solid rgba(200,184,154,0.4)', background: 'white',
    color: '#2c2420', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F4' }}>

      {/* Header */}
      <div style={{ background: '#1a1410', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark size={28} color="#c8b89a" />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: '#f5f0e8' }}>
            London Cleaning Wizard <span style={{ color: '#c8b89a', fontSize: 12, letterSpacing: '0.1em' }}>· Admin</span>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{ ...BTN, background: '#c8b89a', color: '#1a1410', border: 'none', fontSize: 11 }}
        >
          Log Out
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px' }}>

        {/* Welcome banner */}
        <div style={{
          marginBottom: 28, padding: '24px 28px',
          background: 'white', border: '1px solid rgba(200,184,154,0.25)',
          opacity: bannerVisible ? 1 : 0,
          transform: bannerVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 1.2s ease, transform 1.4s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 400, color: '#1a1410', lineHeight: 1.2 }}>
            Welcome, {user.displayName?.split(' ')[0] || user.email.split('@')[0]}.
          </div>
          <div style={{
            fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#6b5e56', fontWeight: 400, marginTop: 8, lineHeight: 1.6,
            opacity: bannerVisible ? 1 : 0,
            transform: bannerVisible ? 'translateX(0)' : 'translateX(-60px)',
            transition: 'opacity 1.4s ease 0.4s, transform 1.6s cubic-bezier(0.22,1,0.36,1) 0.4s',
          }}>
            {welcomeMsg}
          </div>
        </div>

        {/* Date filter */}
        <div style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week',  label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'all',   label: 'All Time' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  style={{
                    ...BTN, padding: '7px 14px',
                    background: preset === p.id ? '#2c2420' : 'transparent',
                    color: preset === p.id ? '#f5f0e8' : '#2c2420',
                    border: '1px solid rgba(200,184,154,0.4)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <input
                  type="date" value={dateFrom}
                  min={`${year}-01-01`} max={`${year}-12-31`}
                  onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }}
                  style={DATE_INPUT}
                />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355' }}>to</span>
                <input
                  type="date" value={dateTo}
                  min={`${year}-01-01`} max={`${year}-12-31`}
                  onChange={e => { setDateTo(e.target.value); setPreset('custom'); }}
                  style={DATE_INPUT}
                />
              </div>
            )}
          </div>
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { id: 'all',          label: 'All Statuses' },
            { id: 'deposit_paid', label: 'Deposit Paid' },
            { id: 'fully_paid',   label: 'Fully Paid' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              style={{
                ...BTN, padding: '7px 14px',
                background: statusFilter === s.id ? '#2c2420' : 'transparent',
                color: statusFilter === s.id ? '#f5f0e8' : '#2c2420',
                border: '1px solid rgba(200,184,154,0.4)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Bookings',    value: displayedBookings.length },
            { label: 'Total Value', value: `£${totalValue}` },
            { label: 'Collected',   value: `£${collected}` },
            { label: 'Outstanding', value: `£${outstanding}` },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)', padding: '16px 20px' }}>
              <div style={LABEL}>{s.label}</div>
              <div style={VALUE}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {displayedBookings.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={selected.size === displayedBookings.length && displayedBookings.length > 0}
                  onChange={e => setSelected(e.target.checked ? new Set(displayedBookings.map(b => b.id)) : new Set())}
                  style={{ cursor: 'pointer', accentColor: '#c8b89a', width: 15, height: 15 }}
                />
                Select All
              </label>
            )}
            {selected.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                style={{ ...BTN, background: '#8b2020', color: 'white', border: 'none' }}
              >
                Delete Selected ({selected.size})
              </button>
            )}
          </div>
          {displayedBookings.length > 0 && (
            <button onClick={handleExportCSV} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
              Export CSV
            </button>
          )}
        </div>

        {completeErr && (
          <div style={{ background: '#fdf5f5', borderLeft: '2px solid #8b2020', padding: '10px 14px', marginBottom: 16, fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#6b1010' }}>
            {completeErr}
          </div>
        )}

        {displayedBookings.length === 0 && (
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontStyle: 'italic' }}>
            No bookings found for this date range.
          </p>
        )}

        {/* Bookings list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayedBookings.map(b => {
            const sc = STATUS_COLOURS[b.status] || { bg: '#f5f5f5', color: '#5a5a5a', label: b.status };
            const isOpen = expanded === b.id;
            return (
              <div key={b.id} style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)' }}>

                {/* Booking row */}
                <div
                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer', accentColor: '#c8b89a', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <div onClick={() => setExpanded(isOpen ? null : b.id)} style={{ flex: 1, cursor: 'pointer' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 400, color: '#1a1410', marginBottom: 2 }}>
                      {b.firstName} {b.lastName}
                    </div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#6b5e56', fontWeight: 300 }}>
                      {b.packageName} · {b.size} · {fmtDate(b.cleanDate)} at {b.cleanTime} · {b.addr1}, {b.postcode}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <span onClick={() => setExpanded(isOpen ? null : b.id)} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#c8b89a', cursor: 'pointer' }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(200,184,154,0.15)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 24px', marginTop: 16, marginBottom: 16 }}>
                      {[
                        { l: 'Booked On',    v: fmtCreatedAt(b.createdAt) },
                        { l: 'Booking Ref',  v: b.bookingRef },
                        { l: 'Phone',        v: b.phone },
                        { l: 'Email',        v: b.email },
                        { l: 'Clean Date',   v: fmtDate(b.cleanDate) },
                        { l: 'Clean Time',   v: b.cleanTime },
                        { l: 'Property',     v: `${b.propertyType} · ${b.size}` },
                        { l: 'Floor/Access', v: b.floor || '—' },
                        { l: 'Parking',      v: b.parking || '—' },
                        { l: 'Keys',         v: b.keys || '—' },
                        { l: 'Frequency',        v: b.frequency || 'one-off' },
                        { l: 'Add-ons',          v: b.addons?.length ? b.addons.map(a => a.name).join(', ') : 'None' },
                        { l: 'Pets',             v: b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No' },
                        { l: 'Signature Touch',  v: b.signatureTouch === false ? `Opted out${b.signatureTouchNotes ? ` — ${b.signatureTouchNotes}` : ''}` : '✓ Opted in' },
                        { l: 'Total',            v: `£${b.total}` },
                        { l: 'Deposit paid',     v: `£${b.deposit}` },
                        { l: 'Remaining',        v: `£${b.remaining}` },
                      ].map((r, i) => (
                        <div key={i}>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 2 }}>{r.l}</div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420', fontWeight: 300 }}>{r.v}</div>
                        </div>
                      ))}
                    </div>

                    {b.notes && (
                      <div style={{ background: '#faf9f7', padding: '10px 14px', marginBottom: 14, fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, fontStyle: 'italic' }}>
                        Notes: {b.notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {b.status === 'deposit_paid' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{ ...BTN, background: completing === b.id ? '#8b7355' : '#2d6a4f', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <Sparkle size={8} color="#f5f0e8" />
                          {completing === b.id ? 'Charging...' : `Mark as Complete — Charge £${b.remaining}`}
                        </button>
                      )}
                      {b.status === 'fully_paid' && (
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#2d6a4f', display: 'flex', alignItems: 'center', gap: 6 }}>
                          ✓ Job complete — full payment received
                        </div>
                      )}
                      {b.status === 'payment_failed' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{ ...BTN, background: '#8b2020', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {completing === b.id ? 'Retrying...' : `Retry Payment — £${b.remaining}`}
                        </button>
                      )}
                      {b.status === 'deposit_paid' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleCancel(b); }}
                          disabled={cancelling === b.id}
                          style={{ ...BTN, background: 'transparent', color: '#8b2020', border: '1px solid rgba(139,32,32,0.3)' }}
                        >
                          {cancelling === b.id ? 'Cancelling...' : 'Cancel & Refund'}
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(b); }}
                        disabled={deleting === b.id}
                        style={{ ...BTN, background: 'transparent', color: '#8b2020', border: '1px solid rgba(139,32,32,0.3)', marginLeft: 'auto' }}
                      >
                        {deleting === b.id ? 'Deleting...' : 'Delete Booking'}
                      </button>
                    </div>
                    {cancelErr && expanded === b.id && (
                      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginTop: 8 }}>{cancelErr}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
