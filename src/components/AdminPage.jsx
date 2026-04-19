import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { todayUK } from '../utils/time';
import { Sparkle, LogoMark } from './Icons';
import { PACKAGES, FREQUENCIES, ADDONS, calculateTotal, DEEP_SUPPLIES_FEE } from '../data/siteData';

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
  pending_deposit:         { bg: '#8b2020', color: '#fff', label: 'Pending Deposit' },
  scheduled:               { bg: '#f0fdf4', color: '#166534', label: 'Scheduled' },
  deposit_paid:            { bg: '#fff8eb', color: '#7a5c00', label: 'Deposit Paid' },
  fully_paid:              { bg: '#f3faf6', color: '#1a5234', label: 'Fully Paid' },
  payment_failed:          { bg: '#fdf5f5', color: '#6b1010', label: 'Payment Failed' },
  cancelled_full_refund:   { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Full Refund' },
  cancelled_partial_refund:{ bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Partial Refund' },
  cancelled_no_refund:     { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — No Refund' },
  cancelled_late_fee:      { bg: '#fff3e0', color: '#7c3d00', label: 'Cancelled — Late Fee Charged' },
};

export default function AdminPage() {
  const [user,        setUser]        = useState(null);
  const [bookings,       setBookings]       = useState([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [preset,      setPreset]      = useState('today');
  const [dateFrom,    setDateFrom]    = useState(todayUK());
  const [dateTo,      setDateTo]      = useState(todayUK());
  const [email,       setEmail]       = useState('');
  const [pass,        setPass]        = useState('');
  const [loginErr,    setLoginErr]    = useState('');
  const [completing,       setCompleting]       = useState(null);
  const [completeErr,      setCompleteErr]      = useState('');
  const [cancelling,       setCancelling]       = useState(null);
  const [cancelErr,        setCancelErr]        = useState('');
  const [deleting,         setDeleting]         = useState(null);
  const [deleteProgress,   setDeleteProgress]   = useState(null); // { done, total } or null
  const [expanded,         setExpanded]         = useState(null);
  const [markingDeposit,   setMarkingDeposit]   = useState(null);
  const [depositErr,       setDepositErr]       = useState('');
  const [generatingLink,   setGeneratingLink]   = useState(null);
  const [depositLinks,     setDepositLinks]     = useState({});
  const [linkErr,          setLinkErr]          = useState('');
  const [emailingLink,     setEmailingLink]     = useState(null);
  const [emailedLinks,     setEmailedLinks]     = useState({});
  const [editBooking,      setEditBooking]      = useState(null);
  const [editData,         setEditData]         = useState({});
  const [editScope,        setEditScope]        = useState('this');
  const [editSaving,       setEditSaving]       = useState(false);
  const [editErr,          setEditErr]          = useState('');
  const [welcomeMsg,   setWelcomeMsg]   = useState('');
  const [welcomeColor, setWelcomeColor] = useState('#6b5e56');
  const [authLoading,   setAuthLoading]   = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [schedulerLogs,     setSchedulerLogs]     = useState([]);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);
  const [triggerResult,       setTriggerResult]       = useState(null);
  const [stoppingRecurring,  setStoppingRecurring]  = useState(null);
  const [stopRecurringErr,   setStopRecurringErr]   = useState('');
  const [stoppedRecurring,   setStoppedRecurring]   = useState(new Set());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const WELCOME_COLORS = ['#2563eb','#be185d','#16a34a','#4f46e5','#0e7490','#7c3aed','#b45309'];
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [freqFilter,    setFreqFilter]    = useState('all');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [showNewBooking, setShowNewBooking] = useState(false);
  const TIMES = (() => {
    const times = [];
    for (let h = 7; h <= 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 21 && m > 0) break;
        const period = h < 12 ? 'AM' : 'PM';
        const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
        times.push(`${hour}:${m.toString().padStart(2, '0')} ${period}`);
      }
    }
    return times;
  })();
  const HOW_HEARD_OPTIONS = ['Google Search','Instagram','Facebook','TikTok','Word of Mouth','Leaflet','Nextdoor','Other'];
  const BLANK_BOOKING = { firstName:'', lastName:'', email:'', phone:'', addr1:'', postcode:'', propertyType:'flat', floor:'', parking:'', keys:'', notes:'', packageId:'refresh', sizeId:'', frequency:'one-off', cleanDate:'', cleanTime:'9:00 AM', addons:[], hasPets:null, petTypes:'', signatureTouch:true, signatureTouchNotes:'', hearAbout:'', supplies:'customer' };
  const [nb, setNb] = useState(BLANK_BOOKING);
  const [nbSaving,       setNbSaving]       = useState(false);
  const [nbErr,          setNbErr]          = useState('');
  const [nbSubmitted,    setNbSubmitted]    = useState(false);
  const [nbTouched,      setNbTouched]      = useState({});
  const [nbBlockedDates, setNbBlockedDates] = useState([]);
  const [nbCalYear,      setNbCalYear]      = useState(() => new Date().getFullYear());
  const [nbCalMonth,     setNbCalMonth]     = useState(() => new Date().getMonth());

  const nbPkg   = PACKAGES.find(p => p.id === nb.packageId);
  const nbSize  = nbPkg?.sizes.find(s => s.id === nb.sizeId);
  // First booking always full price — discount applies from 2nd clean
  const nbTotal = nbSize ? calculateTotal({ sizePrice: nbSize.basePrice, propertyType: nb.propertyType, frequency: null, addons: nb.addons, supplies: nb.supplies, suppliesFeeOverride: nb.suppliesFee }) : null;

  const isValidUKPhone    = p => /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/.test(p.trim()) || /^(\+44\s?[12]\d{2,4}|\(?0[12]\d{2,4}\)?)\s?\d{3,4}\s?\d{3,4}$/.test(p.trim());
  const isValidEmail      = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const isValidUKPostcode = p => /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(p.trim());

  const handleNewBooking = async () => {
    setNbSubmitted(true);
    if (!nb.firstName || !nb.lastName || !nb.email || !nb.phone || !nb.addr1 || !nb.postcode || !nb.sizeId || !nb.cleanDate || !nb.cleanTime || !nb.hearAbout || nb.hasPets === null) {
      setNbErr('Please fill in all required fields.'); return;
    }
    if (!isValidEmail(nb.email))      { setNbErr('Email address is not valid — e.g. name@example.com'); return; }
    if (!isValidUKPhone(nb.phone))    { setNbErr('Phone number is not a valid UK number — e.g. 07700 900123 or 020 8137 0026'); return; }
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
      setShowNewBooking(false);
      setNb(BLANK_BOOKING);
      setNbSubmitted(false);
      setNbTouched({});
    } catch (err) { setNbErr(`Something went wrong: ${err?.message || err}`); }
    setNbSaving(false);
  };
  const [selected,      setSelected]      = useState(new Set());

  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    setAuthLoading(false);
    if (u) {
      setWelcomeMsg(WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
      setWelcomeColor(WELCOME_COLORS[Math.floor(Math.random() * WELCOME_COLORS.length)]);
      setTimeout(() => setBannerVisible(true), 50);
    } else {
      setBannerVisible(false);
    }
  }), []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBookingsLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'schedulerLogs'), orderBy('runAt', 'desc'), limit(10));
    return onSnapshot(q, snap =>
      setSchedulerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  // Fetch blocked dates when calendar month changes
  useEffect(() => {
    if (!user) return;
    fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${nbCalYear}&month=${nbCalMonth + 1}`)
      .then(r => r.json()).then(data => setNbBlockedDates(data.blocked || [])).catch(() => {});
  }, [user, nbCalYear, nbCalMonth]);

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
    const ids = [...selected];
    const total = ids.length;
    setDeleteProgress({ done: 0, total });
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await fetch(import.meta.env.VITE_CF_DELETE_BOOKING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: ids[i] }),
        });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
      setDeleteProgress({ done: i + 1, total });
    }
    if (failed > 0) setCompleteErr(`${failed} booking${failed > 1 ? 's' : ''} could not be deleted.`);
    setSelected(new Set());
    setExpanded(null);
    setDeleteProgress(null);
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

  const handleGenerateLink = async (booking) => {
    setGeneratingLink(booking.id);
    setLinkErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_GENERATE_DEPOSIT_LINK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) { setLinkErr(data.error || 'Failed to generate link.'); }
      else {
        const link = `${window.location.origin}/pay-deposit?bookingId=${booking.id}`;
        setDepositLinks(prev => ({ ...prev, [booking.id]: link }));
      }
    } catch {
      setLinkErr('Something went wrong. Please try again.');
    } finally {
      setGeneratingLink(null);
    }
  };

  const handleEmailDepositLink = async (booking) => {
    setEmailingLink(booking.id);
    try {
      const res = await fetch(import.meta.env.VITE_CF_EMAIL_DEPOSIT_LINK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) setLinkErr(data.error || 'Failed to send email.');
      else setEmailedLinks(prev => ({ ...prev, [booking.id]: true }));
    } catch {
      setLinkErr('Something went wrong. Please try again.');
    } finally {
      setEmailingLink(null);
    }
  };

  const handleMarkDepositPaid = async (booking) => {
    if (!window.confirm(`Mark deposit of £${booking.deposit} as collected for ${booking.firstName} ${booking.lastName}?\n\nThis confirms you have received the deposit manually.`)) return;
    setMarkingDeposit(booking.id);
    setDepositErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_MARK_DEPOSIT_PAID, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) setDepositErr(data.error || 'Failed to update booking.');
    } catch {
      setDepositErr('Something went wrong. Please try again.');
    } finally {
      setMarkingDeposit(null);
    }
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    setEditErr('');
    try {
      const payload = { bookingId: editBooking.id, ...editData, updateCustomerProfile: editScope === 'all' };

      // Recalculate total if package, size or addons changed
      const pkg  = PACKAGES.find(p => p.id === editData.packageId);
      const size = pkg?.sizes?.find(s => s.id === editData.sizeId);
      if (size) {
        const freqObj = FREQUENCIES.find(f => f.id === editData.frequency) || { saving: 0 };
        const { subtotal } = calculateTotal({
          sizePrice:           size.basePrice,
          propertyType:        editBooking.propertyType,
          frequency:           freqObj,
          addons:              editData.addons || [],
          supplies:            editBooking.supplies,
          suppliesFeeOverride: editBooking.suppliesFee,
        });
        payload.total     = subtotal;
        payload.remaining = Math.max(0, subtotal - (editBooking.deposit || 0));
      }

      const res  = await fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error || 'Failed to update booking.'); setEditSaving(false); return; }
      setEditBooking(null);
      setEditData({});
      setEditScope('this');
    } catch {
      setEditErr('Something went wrong. Please try again.');
    }
    setEditSaving(false);
  };

  const handleStopRecurring = async (booking) => {
    if (!window.confirm(`Stop recurring cleans for ${booking.firstName} ${booking.lastName}?\n\nNo more bookings will be auto-created for this customer. Any existing scheduled bookings remain and must be cancelled separately.`)) return;
    setStoppingRecurring(booking.id);
    setStopRecurringErr('');
    try {
      const res = await fetch(import.meta.env.VITE_CF_STOP_RECURRING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: booking.email, fromDate: booking.cleanDate }),
      });
      const data = await res.json();
      console.log('stopRecurring response:', data);
      if (!data.success) throw new Error(data.error || 'Failed');
      setStoppedRecurring(prev => new Set([...prev, booking.id]));
      console.log('stoppedRecurring updated for:', booking.id);
    } catch {
      setStopRecurringErr('Failed to stop recurring series. Please try again.');
    } finally {
      setStoppingRecurring(null);
    }
  };

  const handleCancel = async (booking) => {
    const hoursUntil = (new Date(booking.cleanDateUTC) - new Date()) / 3600000;
    let msg;
    if (booking.isAutoRecurring) {
      if (hoursUntil >= 48) {
        msg = `No charge — more than 48 hours notice given.`;
      } else {
        const fee = (booking.total * 0.5).toFixed(2);
        msg = `⚠️ Less than 48 hours notice — a late cancellation fee of £${fee} (50% of £${booking.total}) will be charged to the customer's saved card.`;
      }
    } else if (booking.status === 'pending_deposit' || !booking.deposit) {
      msg = `No payment has been taken — booking will be cancelled with no refund required.`;
    } else {
      const refundPct = hoursUntil >= 48 ? 100 : 0;
      const refundAmt = (booking.deposit * refundPct / 100).toFixed(2);
      msg = refundPct === 100
        ? `Full refund of £${refundAmt} will be issued (more than 48hrs notice).`
        : `No refund will be issued (less than 48hrs notice).`;
    }
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
      if (!res.ok) {
        setCancelErr(data.error || 'Failed to cancel booking.');
      } else if (data.consecutiveAlert) {
        window.alert(`⚠️ 2 consecutive cancellations for ${booking.firstName} ${booking.lastName}.\n\nTheir recurring series has been automatically stopped and all future scheduled bookings have been removed. They will need to rebook from scratch at full price.`);
      }
    } catch (err) {
      setCancelErr(`Something went wrong: ${err?.message || 'Unknown error'}`);
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

  const searchTerm = searchQuery.trim().toLowerCase();
  const displayedBookings = (preset === 'all' ? bookings : bookings.filter(b => b.cleanDate >= dateFrom && b.cleanDate <= dateTo))
    .filter(b => {
      if (!searchTerm) return true;
      return (
        (b.email        || '').toLowerCase().includes(searchTerm) ||
        (b.bookingRef   || '').toLowerCase().includes(searchTerm) ||
        (b.firstName    || '').toLowerCase().includes(searchTerm) ||
        (b.lastName     || '').toLowerCase().includes(searchTerm) ||
        (`${b.firstName} ${b.lastName}`).toLowerCase().includes(searchTerm) ||
        (b.phone        || '').includes(searchTerm) ||
        (b.postcode     || '').toLowerCase().includes(searchTerm) ||
        (b.addr1        || '').toLowerCase().includes(searchTerm)
      );
    })
    .filter(b => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'regular') return b.isAutoRecurring === true;
      if (statusFilter === 'refunded') return b.status === 'cancelled_full_refund' || b.status === 'cancelled_partial_refund';
      if (statusFilter === 'phone') return b.isPhoneBooking === true;
      if (statusFilter === 'website') return !b.isPhoneBooking;
      return b.status === statusFilter;
    })
    .filter(b => {
      if (freqFilter === 'all') return true;
      if (freqFilter === 'cancelled-recurring') return b.status && b.status.startsWith('cancelled') && b.frequency && b.frequency !== 'one-off';
      return (b.frequency || 'one-off') === freqFilter;
    })
    .sort((a, b) => a.cleanDate === b.cleanDate
      ? (a.cleanTime || '').localeCompare(b.cleanTime || '')
      : a.cleanDate.localeCompare(b.cleanDate));

  const totalValue  = displayedBookings.reduce((s, b) => s + (parseFloat(b.total)   || 0), 0);
  const collected   = displayedBookings.reduce((s, b) => {
    if (b.status === 'fully_paid') return s + (parseFloat(b.total) || 0);
    if (['deposit_paid', 'payment_failed'].includes(b.status)) return s + (parseFloat(b.deposit) || 0);
    return s;
  }, 0);
  const outstanding = displayedBookings
    .filter(b => b.status === 'deposit_paid')
    .reduce((s, b) => s + (parseFloat(b.remaining) || 0), 0);

  const LABEL = { fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 6 };
  const VALUE = { fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 22 : 28, fontWeight: 300, color: '#1a1410' };
  const DATE_INPUT = {
    fontFamily: "'Jost',sans-serif", fontSize: 12, padding: '7px 10px',
    border: '1px solid rgba(200,184,154,0.4)', background: 'white',
    color: '#2c2420', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F4' }}>

      {/* Header */}
      <div style={{ background: '#1a1410', padding: isMobile ? '12px 16px' : '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 12px' : '32px 28px' }}>

        {/* Welcome banner */}
        <div style={{
          marginBottom: 20, padding: isMobile ? '16px 16px' : '24px 28px',
          background: 'white', border: '1px solid rgba(200,184,154,0.25)',
          opacity: bannerVisible ? 1 : 0,
          transform: bannerVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 1.2s ease, transform 1.4s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 24 : 32, fontWeight: 400, color: '#1a1410', lineHeight: 1.2 }}>
            Welcome, {user.displayName?.split(' ')[0] || user.email.split('@')[0]}.
          </div>
          <div style={{
            fontFamily: "'Jost',sans-serif", fontSize: 14, color: welcomeColor, fontWeight: 400, marginTop: 8, lineHeight: 1.6,
            opacity: bannerVisible ? 1 : 0,
            transform: bannerVisible ? 'translateX(0)' : 'translateX(-60px)',
            transition: 'opacity 1.4s ease 0.4s, transform 1.6s cubic-bezier(0.22,1,0.36,1) 0.4s',
          }}>
            {welcomeMsg}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search by name, email, booking ref, phone, postcode…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 300,
              padding: '12px 40px 12px 16px', border: '1px solid rgba(200,184,154,0.4)',
              background: 'white', color: '#2c2420', outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#8b7355', lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Date filter */}
        <div style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)', padding: '16px 20px', marginBottom: 20 }}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select value={preset} onChange={e => applyPreset(e.target.value)} style={{ ...DATE_INPUT, width: '100%' }}>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
              {preset !== 'all' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="date" value={dateFrom} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }} style={{ ...DATE_INPUT, flex: 1 }} />
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355' }}>to</span>
                  <input type="date" value={dateTo} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateTo(e.target.value); setPreset('custom'); }} style={{ ...DATE_INPUT, flex: 1 }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'week',  label: 'This Week' },
                  { id: 'month', label: 'This Month' },
                  { id: 'all',   label: 'All Time' },
                ].map(p => (
                  <button key={p.id} onClick={() => applyPreset(p.id)} style={{ ...BTN, padding: '7px 14px', background: preset === p.id ? '#2c2420' : 'transparent', color: preset === p.id ? '#f5f0e8' : '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {preset !== 'all' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <input type="date" value={dateFrom} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }} style={DATE_INPUT} />
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355' }}>to</span>
                  <input type="date" value={dateTo} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateTo(e.target.value); setPreset('custom'); }} style={DATE_INPUT} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status filter */}
        {isMobile ? (
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...DATE_INPUT, width: '100%', marginBottom: 10 }}>
            <option value="all">All Statuses</option>
            <option value="pending_deposit">Awaiting Deposit</option>
            <option value="deposit_paid">Deposit Paid</option>
            <option value="fully_paid">All Paid</option>
            <option value="regular">Recurring Clients</option>
            <option value="refunded">Refunded</option>
            <option value="phone">Phone Bookings</option>
            <option value="website">Website Bookings</option>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { id: 'all',             label: 'All' },
              { id: 'pending_deposit', label: '⏳ Awaiting Deposit' },
              { id: 'deposit_paid',    label: 'Deposit Paid' },
              { id: 'fully_paid',      label: 'All Paid' },
              { id: 'regular',         label: '🔄 Recurring Clients' },
              { id: 'refunded',        label: 'Refunded' },
              { id: 'phone',           label: '📞 Phone' },
              { id: 'website',         label: '🌐 Website' },
            ].map(s => (
              <button key={s.id} onClick={() => setStatusFilter(s.id)} style={{ ...BTN, padding: '7px 14px', background: statusFilter === s.id ? '#2c2420' : 'transparent', color: statusFilter === s.id ? '#f5f0e8' : '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Frequency filter */}
        {isMobile ? (
          <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)} style={{ ...DATE_INPUT, width: '100%', marginBottom: 16 }}>
            <option value="all">All Types</option>
            <option value="one-off">One-off</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
            <option value="cancelled-recurring">Cancelled Recurring</option>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { id: 'all',                label: 'All Types' },
              { id: 'one-off',            label: 'One-off' },
              { id: 'weekly',             label: 'Weekly' },
              { id: 'fortnightly',        label: 'Fortnightly' },
              { id: 'monthly',            label: 'Monthly' },
              { id: 'cancelled-recurring',label: 'Cancelled Recurring' },
            ].map(f => (
              <button key={f.id} onClick={() => setFreqFilter(f.id)} style={{ ...BTN, padding: '7px 14px', background: freqFilter === f.id ? '#2c2420' : 'transparent', color: freqFilter === f.id ? '#f5f0e8' : '#2c2420', border: freqFilter === f.id ? '1px solid #2c2420' : '1px solid rgba(200,184,154,0.4)' }}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(180px,1fr))', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 28 }}>
          {[
            { label: 'Bookings',    value: displayedBookings.length },
            { label: 'Total Value', value: `£${totalValue.toFixed(2)}` },
            { label: 'Collected',   value: `£${collected.toFixed(2)}` },
            { label: 'Outstanding', value: `£${outstanding.toFixed(2)}` },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)', padding: isMobile ? '12px 14px' : '16px 20px' }}>
              <div style={LABEL}>{s.label}</div>
              <div style={VALUE}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Scheduler log panel */}
        {schedulerLogs.length > 0 && (() => {
          const latest = schedulerLogs[0];
          const runAt  = latest.runAt?.toDate ? latest.runAt.toDate() : new Date(latest.runAt);
          const hasErr = latest.failed > 0;
          return (
            <div style={{ background: 'white', border: `1px solid ${hasErr ? 'rgba(139,32,32,0.3)' : 'rgba(200,184,154,0.25)'}`, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasErr ? '#8b2020' : '#2d6a4f', flexShrink: 0 }} />
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355' }}>
                    Recurring Scheduler — Last Run
                  </div>
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300 }}>
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
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: s.bad ? '#8b2020' : s.good && latest.created > 0 ? '#2d6a4f' : '#1a1410' }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {hasErr && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#fdf5f5', border: '1px solid rgba(139,32,32,0.15)' }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b2020', marginBottom: 6 }}>Errors — action required</div>
                  {latest.errors?.map((e, i) => (
                    <div key={i} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#6b1010', fontWeight: 300, marginBottom: 4 }}>
                      {e.email} — {e.error}
                    </div>
                  ))}
                </div>
              )}
              {latest.created === 0 && latest.attempted === 0 && !hasErr && (
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', fontWeight: 300, marginTop: 8, fontStyle: 'italic' }}>
                  No recurring bookings were due today.
                </div>
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
            style={{ ...BTN, background: '#f2ede6', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)', cursor: triggeringScheduler ? 'not-allowed' : 'pointer' }}
          >
            {triggeringScheduler ? 'Running…' : '⚙ Run Scheduler Now'}
          </button>
          {triggerResult && (
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: triggerResult.startsWith('Error') ? '#8b2020' : '#2d6a4f', fontWeight: 300 }}>
              {triggerResult}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 10 }}>
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
                disabled={!!deleteProgress}
                style={{ ...BTN, background: '#8b2020', color: 'white', border: 'none', opacity: deleteProgress ? 0.6 : 1, cursor: deleteProgress ? 'not-allowed' : 'pointer' }}
              >
                {deleteProgress ? `Deleting… ${deleteProgress.done}/${deleteProgress.total}` : `Delete Selected (${selected.size})`}
              </button>
            )}
            {deleteProgress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(200,184,154,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#8b2020', borderRadius: 2, width: `${(deleteProgress.done / deleteProgress.total) * 100}%`, transition: 'width 0.2s ease' }} />
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', whiteSpace: 'nowrap' }}>
                  {Math.round((deleteProgress.done / deleteProgress.total) * 100)}%
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            {displayedBookings.length > 0 && (
              <button onClick={handleExportCSV} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)', textAlign: 'center' }}>
                Export CSV
              </button>
            )}
            <button onClick={() => setShowNewBooking(true)} style={{ ...BTN, background: '#c8b89a', color: '#1a1410', border: 'none', textAlign: 'center' }}>
              + New Booking
            </button>
          </div>
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
        {!bookingsLoaded && (
          <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300 }}>
            Loading bookings…
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookingsLoaded && displayedBookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300 }}>
              No bookings found.
            </div>
          )}
          {displayedBookings.map(b => {
            const sc = STATUS_COLOURS[b.status] || { bg: '#f5f5f5', color: '#5a5a5a', label: b.status };
            const isOpen = expanded === b.id;
            return (
              <div key={b.id} style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)' }}>

                {/* Booking row */}
                <div
                  style={{ padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer', accentColor: '#c8b89a', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <div onClick={() => { setExpanded(isOpen ? null : b.id); setStopRecurringErr(''); }} style={{ flex: 1, cursor: 'pointer' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 17 : 19, fontWeight: 400, color: '#1a1410', marginBottom: 2 }}>
                      {b.firstName} {b.lastName}
                    </div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#6b5e56', fontWeight: 300, lineHeight: 1.6 }}>
                      {b.packageName} · {b.size}<br />
                      {fmtDate(b.cleanDate)} at {b.cleanTime}<br />
                      {b.addr1}, {b.postcode}
                    </div>
                    {b.cancelledAt && (
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', fontWeight: 300, marginTop: 3 }}>
                        Refund processed: {fmtCreatedAt(b.cancelledAt)}{b.refundAmount > 0 ? ` — £${b.refundAmount} refunded` : ' — No refund'}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {b.isAutoRecurring && (
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', background: stoppedRecurring.has(b.id) ? '#fef3c7' : '#f0fdf4', color: stoppedRecurring.has(b.id) ? '#92400e' : '#166534' }}>
                        {stoppedRecurring.has(b.id) ? '⛔ Series Stopped' : '🔄 Auto-recurring'}
                      </span>
                    )}
                    {b.isPhoneBooking && !b.isAutoRecurring && (
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', background: '#f0f4ff', color: '#1e3a8a' }}>
                        📞 Phone
                      </span>
                    )}
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
                  <div style={{ padding: isMobile ? '0 14px 16px' : '0 20px 20px', borderTop: '1px solid rgba(200,184,154,0.15)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 16px', marginTop: 16, marginBottom: 16 }}>
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
                        { l: 'Total',            v: `£${parseFloat(b.total).toFixed(2)}` },
                        { l: 'Deposit paid',     v: b.status === 'pending_deposit' ? 'Pending' : `£${parseFloat(b.deposit).toFixed(2)}`, highlight: b.status === 'pending_deposit' },
                        { l: 'Remaining',        v: `£${parseFloat(b.remaining).toFixed(2)}` },
                        { l: 'Source',           v: b.source || '—' },
                        b.stripeDepositIntentId   && { l: 'Stripe Deposit PI',   v: b.stripeDepositIntentId },
                        b.stripeRemainingIntentId && { l: 'Stripe Remaining PI',  v: b.stripeRemainingIntentId },
                        b.stripeCustomerId        && { l: 'Stripe Customer ID',   v: b.stripeCustomerId },
                      ].filter(Boolean).map((r, i) => (
                        <div key={i}>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 2 }}>{r.l}</div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: r.highlight ? '#fff' : '#2c2420', fontWeight: 300, ...(r.highlight ? { background: '#c0392b', display: 'inline-block', padding: '2px 8px', borderRadius: 3 } : {}) }}>{r.v}</div>
                        </div>
                      ))}
                    </div>

                    {b.notes && (
                      <div style={{ background: '#faf9f7', padding: '10px 14px', marginBottom: 14, fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, fontStyle: 'italic' }}>
                        Notes: {b.notes}
                      </div>
                    )}

                    {b.status && b.status.startsWith('cancelled') && (
                      <div style={{ background: '#fdf5f5', border: '1px solid rgba(139,32,32,0.15)', padding: '12px 16px', marginBottom: 14 }}>
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b2020', marginBottom: 10 }}>Cancellation Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 16px' }}>
                          {[
                            { l: 'Cancelled At', v: fmtCreatedAt(b.cancelledAt) },
                            b.cancellationReason && { l: 'Reason', v: b.cancellationReason },
                            b.cleanDateUTC && b.cancelledAt && (() => {
                              const hrs = ((new Date(b.cleanDateUTC) - (b.cancelledAt?.toDate ? b.cancelledAt.toDate() : new Date(b.cancelledAt))) / 3600000);
                              const policy = hrs >= 48 ? 'Full refund (48hrs+ notice)' : 'No refund (under 48hrs notice)';
                              return { l: 'Notice Given', v: `${hrs > 0 ? hrs.toFixed(1) : '0'} hrs before clean — ${policy}` };
                            })(),
                            { l: 'Refund Amount', v: b.refundAmount != null ? `£${b.refundAmount}` : '—' },
                          ].filter(Boolean).map((r, i) => (
                            <div key={i}>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 2 }}>{r.l}</div>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420', fontWeight: 300 }}>{r.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {b.status === 'pending_deposit' && (
                        <>
                          {b.isAutoRecurring && (
                            <div style={{ width: '100%', background: '#f0fdf4', border: '1px solid rgba(22,101,52,0.2)', padding: '12px 16px', marginBottom: 4 }}>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                                🔄 Auto-created recurring booking
                              </div>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#14532d', fontWeight: 300, lineHeight: 1.6 }}>
                                This booking was created automatically by the recurring scheduler. Send the customer their deposit link or mark as paid if collecting manually.
                              </div>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleGenerateLink(b); }}
                            disabled={generatingLink === b.id}
                            style={{ ...BTN, background: generatingLink === b.id ? '#8b7355' : '#2c2420', color: '#f5f0e8' }}
                          >
                            {generatingLink === b.id ? 'Generating...' : '🔗 Send Deposit Link'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleMarkDepositPaid(b); }}
                            disabled={markingDeposit === b.id}
                            style={{ ...BTN, background: 'transparent', color: '#1e3a8a', border: '1px solid rgba(30,58,138,0.3)' }}
                          >
                            {markingDeposit === b.id ? 'Updating...' : `✓ Mark Deposit Paid — £${b.deposit}`}
                          </button>
                          {depositLinks[b.id] && (
                            <div style={{ width: '100%', marginTop: 8, background: '#f0f4ff', border: '1px solid rgba(30,58,138,0.2)', padding: '10px 14px' }}>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1e3a8a', marginBottom: 6 }}>
                                Payment link — send this to the customer
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  readOnly
                                  value={depositLinks[b.id]}
                                  style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#2c2420', background: 'white', border: '1px solid rgba(200,184,154,0.4)', padding: '6px 10px', outline: 'none' }}
                                />
                                <button
                                  onClick={() => { navigator.clipboard.writeText(depositLinks[b.id]); }}
                                  style={{ ...BTN, padding: '6px 14px', background: '#1e3a8a', color: 'white', border: 'none', flexShrink: 0 }}
                                >
                                  Copy
                                </button>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); handleEmailDepositLink(b); }}
                                disabled={emailingLink === b.id || emailedLinks[b.id]}
                                style={{ ...BTN, marginTop: 8, padding: '8px 16px', background: emailedLinks[b.id] ? '#2d6a4f' : '#1a56a0', color: '#f5f0e8', fontSize: 10, width: '100%' }}
                              >
                                {emailingLink === b.id ? 'Sending...' : emailedLinks[b.id] ? '✓ Email Sent to Customer' : '✉ Email Link to Customer'}
                              </button>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', marginTop: 6, fontWeight: 700 }}>
                                Read to customer before sending link:
                              </div>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#5a6e9a', marginTop: 4, fontWeight: 300 }}>
                                I'm sending you a secure payment link. Once you pay the deposit, your booking is confirmed and your card will be saved for the final payment after the clean.
                              </div>
                            </div>
                          )}
                          {linkErr && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', margin: '6px 0 0' }}>{linkErr}</p>}
                        </>
                      )}
                      {b.status === 'deposit_paid' && (
                        <>
                          {b.stripeDepositIntentId === 'manual' && (
                            <div style={{ width: '100%', background: '#fdf5f5', border: '1px solid rgba(139,32,32,0.3)', padding: '12px 16px', marginBottom: 4 }}>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 600, color: '#8b2020', marginBottom: 4, letterSpacing: '0.05em' }}>
                                ⚠ Manual Payment — Action Required Before Completing
                              </div>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#6b1010', fontWeight: 300, lineHeight: 1.6 }}>
                                The deposit for this booking was collected manually (cash or card reader). The remaining balance of <strong>£{b.remaining}</strong> must also be collected manually before you mark this job as complete. Once you click Mark as Complete, no automatic charge will be made.
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleComplete(b)}
                            disabled={completing === b.id}
                            style={{ ...BTN, background: completing === b.id ? '#8b7355' : '#2d6a4f', display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            <Sparkle size={8} color="#f5f0e8" />
                            {completing === b.id ? 'Charging...' : b.stripeDepositIntentId === 'manual' ? `Mark as Complete — £${b.remaining} collected manually` : `Mark as Complete — Charge £${b.remaining}`}
                          </button>
                        </>
                      )}
                      {b.status === 'fully_paid' && (
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#2d6a4f', display: 'flex', alignItems: 'center', gap: 6 }}>
                          ✓ Job complete — full payment received
                        </div>
                      )}
                      {b.status === 'scheduled' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{ ...BTN, background: completing === b.id ? '#8b7355' : '#2d6a4f', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <Sparkle size={8} color="#f5f0e8" />
                          {completing === b.id ? 'Charging...' : `Mark as Complete — Charge £${parseFloat(b.total).toFixed(2)}`}
                        </button>
                      )}
                      {b.status === 'payment_failed' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{ ...BTN, background: '#8b2020', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {completing === b.id ? 'Retrying...' : b.isAutoRecurring ? `Retry Payment — £${parseFloat(b.total).toFixed(2)}` : `Retry Payment — £${parseFloat(b.remaining).toFixed(2)}`}
                        </button>
                      )}
                      {['deposit_paid', 'pending_deposit', 'scheduled'].includes(b.status) && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); setEditBooking(b); setEditData({ cleanDate: b.cleanDate, cleanTime: b.cleanTime, firstName: b.firstName, lastName: b.lastName, email: b.email, phone: b.phone, packageId: b.package, packageName: b.packageName, sizeId: b.size, frequency: b.frequency || 'one-off', addons: b.addons || [], hasPets: b.hasPets || false, petTypes: b.petTypes || '', signatureTouch: b.signatureTouch !== false, signatureTouchNotes: b.signatureTouchNotes || '', addr1: b.addr1, postcode: b.postcode, floor: b.floor || '', parking: b.parking || '', keys: b.keys || '', notes: b.notes || '' }); setEditScope('this'); setEditErr(''); }}
                            style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}
                          >
                            Edit Booking
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleCancel(b); }}
                            disabled={cancelling === b.id}
                            style={{ ...BTN, background: 'transparent', color: '#8b2020', border: '1px solid rgba(139,32,32,0.3)' }}
                          >
                            {cancelling === b.id ? 'Cancelling...' : (b.status === 'pending_deposit' || b.status === 'scheduled') ? 'Cancel Booking' : 'Cancel & Refund'}
                          </button>
                          {b.isAutoRecurring && (
                            stoppedRecurring.has(b.id)
                              ? <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#166534', background: '#f0fdf4', padding: '6px 12px', borderRadius: 4, margin: 0 }}>✓ Recurring series stopped — no more bookings will be auto-created for this customer.</p>
                              : <button
                                  onClick={e => { e.stopPropagation(); handleStopRecurring(b); }}
                                  disabled={stoppingRecurring === b.id}
                                  style={{ ...BTN, background: 'transparent', color: '#7c3d00', border: '1px solid rgba(124,61,0,0.3)' }}
                                >
                                  {stoppingRecurring === b.id ? 'Stopping...' : 'Stop Recurring Series'}
                                </button>
                          )}
                        </>
                      )}
                      {stopRecurringErr && expanded === b.id && (
                        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginTop: 8, width: '100%' }}>{stopRecurringErr}</p>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(b); }}
                        disabled={deleting === b.id}
                        style={{ ...BTN, background: 'transparent', color: '#8b2020', border: '1px solid rgba(139,32,32,0.3)', marginLeft: 'auto' }}
                      >
                        {deleting === b.id ? 'Deleting...' : 'Delete Booking'}
                      </button>
                    </div>
                    {depositErr && expanded === b.id && (
                      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginTop: 8 }}>{depositErr}</p>
                    )}
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

      {/* New Booking Modal */}
      {showNewBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 540, background: '#FAF8F4', overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: '#1a1410' }}>New Booking</div>
              <button onClick={() => { setShowNewBooking(false); setNb(BLANK_BOOKING); setNbErr(''); setNbSubmitted(false); setNbTouched({}); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8b7355' }}>✕</button>
            </div>

            {/* Customer */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 12 }}>Customer Details</div>
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
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: showErr ? '#8b2020' : '#8b7355', marginBottom: 4 }}>{f.label}</div>
                  <input
                    type={f.type || 'text'}
                    value={nb[f.key]}
                    placeholder={f.placeholder}
                    onChange={e => setNb(p => ({ ...p, [f.key]: e.target.value }))}
                    onBlur={() => setNbTouched(p => ({ ...p, [f.key]: true }))}
                    style={{ ...INPUT, marginBottom: 0, borderBottomColor: (invalid || showErr) ? '#8b2020' : undefined }}
                  />
                  {showErr
                    ? <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', marginTop: 4 }}>This field is required</div>
                    : invalid
                      ? <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', marginTop: 4 }}>Not valid — {f.hint}</div>
                      : f.hint && !nb[f.key] && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(139,115,85,0.6)', marginTop: 4 }}>{f.hint}</div>
                  }
                </div>
              );
            })}

            {/* Property type */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Property Type</div>
              <select value={nb.propertyType} onChange={e => setNb(p => ({ ...p, propertyType: e.target.value, sizeId: e.target.value === 'house' && p.sizeId === 'studio' ? '' : p.sizeId }))} style={{ ...INPUT, marginBottom: 0 }}>
                <option value="flat">Flat / Apartment / Studio</option>
                <option value="house">House (+10%)</option>
              </select>
            </div>

            {/* Package */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Service</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Package *</div>
              <select value={nb.packageId} onChange={e => {
                const pkg = PACKAGES.find(p => p.id === e.target.value);
                const isDeep = e.target.value === 'deep';
                setNb(p => ({ ...p, packageId: e.target.value, sizeId: '', addons: [], frequency: pkg?.showFreq ? p.frequency : 'one-off', supplies: isDeep ? 'cleaner' : p.supplies, suppliesFee: isDeep ? DEEP_SUPPLIES_FEE : undefined }));
              }} style={{ ...INPUT, marginBottom: 0 }}>
                {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: nbSubmitted && !nb.sizeId ? '#8b2020' : '#8b7355', marginBottom: 4 }}>Size *</div>
              <select value={nb.sizeId} onChange={e => setNb(p => ({ ...p, sizeId: e.target.value }))} style={{ ...INPUT, marginBottom: 0, borderBottomColor: nbSubmitted && !nb.sizeId ? '#8b2020' : undefined }}>
                <option value="">— Select size —</option>
                {(nbPkg?.sizes || []).filter(s => !(nb.propertyType === 'house' && s.id === 'studio')).map(s => {
                  const price = Math.round(s.basePrice * (nb.propertyType === 'house' ? 1.10 : 1.0));
                  return <option key={s.id} value={s.id}>{s.label} — £{price}</option>;
                })}
              </select>
              {nbSubmitted && !nb.sizeId && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', marginTop: 4 }}>This field is required</div>}
            </div>
            {nbPkg?.showFreq ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Frequency</div>
                <select value={nb.frequency} onChange={e => setNb(p => ({ ...p, frequency: e.target.value }))} style={{ ...INPUT, marginBottom: 8 }}>
                  {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', padding: '10px 12px', borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#166534', lineHeight: 1.7 }}>
                  <strong>Frequency discounts (from 2nd clean onwards):</strong><br />
                  Weekly — save £30 per clean<br />
                  Fortnightly — save £15 per clean<br />
                  Monthly — save £7 per clean<br />
                  <span style={{ color: '#7a5c00' }}>First clean is always charged at full price.</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: '#f5f0e8', fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355' }}>
                Frequency: One-off only for this package
              </div>
            )}

            {/* Date & Time */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Date & Time</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: nbSubmitted && !nb.cleanDate ? '#8b2020' : '#8b7355', marginBottom: 8 }}>Date *</div>
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
                  <div style={{ border: '1px solid rgba(200,184,154,0.3)', background: '#fdf8f3', padding: '12px 14px', marginBottom: 4 }}>
                    {/* Month nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <button type="button" onClick={() => changeMonth(-1)} style={{ background: 'none', border: '1px solid rgba(200,184,154,0.3)', width: 26, height: 26, cursor: 'pointer', color: '#2c2420', fontSize: 12 }}>←</button>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: '#1a1410' }}>{MONTHS_CAL[nbCalMonth]} {nbCalYear}</div>
                      <button type="button" onClick={() => changeMonth(1)}  style={{ background: 'none', border: '1px solid rgba(200,184,154,0.3)', width: 26, height: 26, cursor: 'pointer', color: '#2c2420', fontSize: 12 }}>→</button>
                    </div>
                    {/* Day headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                      {DAYS_CAL.map(d => <div key={d} style={{ textAlign: 'center', fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#8b7355', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d}</div>)}
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
                              fontSize: 12, fontFamily: "'Jost',sans-serif", fontWeight: 300,
                              cursor: isOff ? 'not-allowed' : 'pointer',
                              background: isSel ? '#c8b89a' : isBlocked ? '#fdecea' : 'transparent',
                              color: isBlocked ? '#c0392b' : isPast ? '#ccc' : isSel ? '#1a1410' : '#2c2420',
                              textDecoration: isBlocked ? 'line-through' : 'none',
                              border: isSel ? 'none' : '1px solid transparent',
                              borderRadius: 1,
                            }}
                            onMouseEnter={e => { if (!isOff && !isSel) e.currentTarget.style.border = '1px solid #c8b89a'; }}
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
              {nb.cleanDate && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Selected: {nb.cleanDate.split('-').reverse().join('/')}</div>}
              {nbSubmitted && !nb.cleanDate && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', marginTop: 2 }}>This field is required</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Time *</div>
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
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Add-ons</div>
                {ADDONS.map(a => {
                  const allSizesSmall = (nbPkg?.sizes || []).every(s => ['studio', '1bed'].includes(s.id));
                  const isSmall = ['studio', '1bed'].includes(nb.sizeId) || allSizesSmall;
                  const price   = a.id === 'windows' ? (isSmall ? 35 : 55) : a.price;
                  return (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420' }}>
                    <input type="checkbox" checked={nb.addons.some(x => x.id === a.id)} onChange={e => setNb(p => ({ ...p, addons: e.target.checked ? [...p.addons, { ...a, price }] : p.addons.filter(x => x.id !== a.id) }))} style={{ accentColor: '#c8b89a' }} />
                    {a.name} — £{price}
                  </label>
                  );
                })}
              </>
            )}

            {/* Supplies */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Cleaning Supplies</div>
            {nb.packageId === 'deep' ? (
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420', marginBottom: 8 }}>
                Specialist supplies included <span style={{ color: '#8b7355', fontSize: 11, fontWeight: 300 }}>— +£{DEEP_SUPPLIES_FEE} (automatically applied)</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {[
                  { id: 'customer', label: 'Customer provides supplies', note: 'No extra charge' },
                  { id: 'cleaner',  label: 'Cleaner brings supplies',    note: '+£8' },
                ].map(opt => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420' }}>
                    <input type="radio" name="supplies" value={opt.id} checked={nb.supplies === opt.id} onChange={() => setNb(p => ({ ...p, supplies: opt.id }))} style={{ accentColor: '#c8b89a' }} />
                    {opt.label} <span style={{ color: '#8b7355', fontSize: 11, fontWeight: 300 }}>— {opt.note}</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ background: '#fff8eb', border: '1px solid rgba(200,184,154,0.4)', padding: '10px 12px', marginBottom: 14, fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#7a5c00', lineHeight: 1.6 }}>
              Remind the customer: our cleaners do not bring mops or vacuums. The customer must have a working mop and vacuum available at the property.
            </div>

            {/* Live price summary */}
            {nbTotal ? (
              <div style={{ background: '#2c2420', padding: '14px 16px', margin: '20px 0', borderRadius: 2 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,184,154,0.5)', marginBottom: 10 }}>Running Total</div>
                {nbTotal.houseExtra > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.55)', marginBottom: 3 }}>
                    <span>House surcharge (+10%)</span><span>+£{nbTotal.houseExtra.toFixed(2)}</span>
                  </div>
                )}
                {nbTotal.freqSave > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.55)', marginBottom: 3 }}>
                    <span>Frequency discount</span><span>−£{nbTotal.freqSave.toFixed(2)}</span>
                  </div>
                )}
                {nbTotal.addnSum > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.55)', marginBottom: 3 }}>
                    <span>Add-ons</span><span>+£{nbTotal.addnSum.toFixed(2)}</span>
                  </div>
                )}
                {nbTotal.suppliesFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.55)', marginBottom: 3 }}>
                    <span>Cleaning supplies</span><span>+£{nbTotal.suppliesFee.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid rgba(200,184,154,0.2)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 15, fontWeight: 600, color: '#f5f0e8' }}>
                  <span>Total</span><span>£{nbTotal.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.55)', marginTop: 4 }}>
                  <span>Deposit due now (30%)</span><span>£{nbTotal.deposit.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.55)', marginTop: 2 }}>
                  <span>Remaining after clean (70%)</span><span>£{nbTotal.remaining.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: '#f5f0e8', padding: '12px 14px', margin: '20px 0', fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355' }}>
                Select a package and size to see the total
              </div>
            )}

            {/* Pets */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Pets & Notes</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: nbSubmitted && nb.hasPets === null ? '#8b2020' : '#8b7355', marginBottom: 8 }}>Any pets at the property? *</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['Yes','No'].map(v => (
                  <button key={v} onClick={() => setNb(p => ({ ...p, hasPets: v === 'Yes', petTypes: v === 'No' ? '' : p.petTypes }))}
                    style={{ ...BTN, flex: 1, background: (v === 'Yes' ? nb.hasPets === true : nb.hasPets === false) ? '#c8b89a' : 'transparent', color: (v === 'Yes' ? nb.hasPets === true : nb.hasPets === false) ? '#1a1410' : '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
                    {v}
                  </button>
                ))}
              </div>
              {nbSubmitted && nb.hasPets === null && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', marginTop: 6 }}>This field is required</div>}
              {nb.hasPets && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>What type of pets?</div>
                  <input value={nb.petTypes} onChange={e => setNb(p => ({ ...p, petTypes: e.target.value }))} placeholder="e.g. cats, dogs" style={{ ...INPUT, marginBottom: 0 }} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Notes</div>
              <textarea value={nb.notes} onChange={e => setNb(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...INPUT, marginBottom: 0, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: nbSubmitted && !nb.hearAbout ? '#8b2020' : '#8b7355', marginBottom: 4 }}>How did they hear about us? *</div>
              <select value={nb.hearAbout} onChange={e => setNb(p => ({ ...p, hearAbout: e.target.value }))} style={{ ...INPUT, marginBottom: 0, borderBottomColor: nbSubmitted && !nb.hearAbout ? '#8b2020' : undefined }}>
                <option value="">— Select —</option>
                {HOW_HEARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {nbSubmitted && !nb.hearAbout && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b2020', marginTop: 4 }}>This field is required</div>}
            </div>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f2ede6', fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355' }}>
              📞 This booking will be marked as a <strong>Phone booking</strong> in all emails and records.
            </div>

            {/* Terms & Conditions */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>
              Terms & Conditions — Read to the customer before proceeding
            </div>
            <div
              style={{ height: 200, overflowY: 'scroll', border: '1px solid rgba(200,184,154,0.4)', background: '#fdf8f3', padding: '14px 16px', marginBottom: 10 }}
            >
              {[
                { heading: '1. Deposit & Payment', body: 'A 30% deposit is required to secure your booking and is charged immediately upon confirmation. The remaining balance will be charged automatically once your clean has been completed and marked as done by our team. By proceeding, you authorise London Cleaning Wizard to charge the remaining balance to your saved payment method upon job completion.' },
                { heading: '2. Cancellation & Rescheduling Policy', body: 'One-off bookings: Full refund if cancelled more than 48 hours before the scheduled clean. No refund if cancelled less than 48 hours before the clean.\n\nRegular services (weekly, fortnightly or monthly): You may cancel your recurring arrangement at any time with at least 48 hours notice before your next scheduled clean. No refund will be issued for cancellations or skipped cleans with less than 48 hours notice, as your cleaner\'s time will have been reserved.\n\nCancelling two consecutive cleans will end your recurring arrangement and your recurring discount. A new booking will be required, subject to standard first-clean pricing.\n\nAll cancellations must be made by contacting us directly. We reserve the right to review pricing with a minimum of 4 weeks written notice.' },
                { heading: '3. Pet Policy', body: 'All pets must be secured and kept away from our cleaning team for the entire duration of the clean. This is for the safety of both your pet and our staff. Failure to secure pets may result in the clean being abandoned without refund of the deposit.' },
                { heading: '4. Access to Property', body: 'You agree to ensure our team has full access to the property at the agreed time. If access is not provided within 15 minutes of the scheduled start time, the clean may be abandoned and no refund will be issued.' },
                { heading: '5. Property Condition & Liability', body: 'You confirm that the property details provided are accurate. London Cleaning Wizard carries full public liability insurance. Any damage must be reported within 24 hours of the clean. We are not liable for pre-existing damage or items of exceptional value not declared prior to the clean.' },
                { heading: '6. Service Standards', body: 'If you are not satisfied with any aspect of your clean, you must notify us within 24 hours and we will arrange a complimentary re-clean of the affected areas. We do not offer refunds after a clean has been completed.' },
                { heading: '7. Cleaner Allocation', body: 'While we always strive to send the same dedicated cleaner for recurring bookings, this cannot be guaranteed. In the event that your usual cleaner is unavailable, we will contact you in advance and arrange an equally skilled replacement.' },
                { heading: '8. Privacy', body: 'Your personal data is processed in accordance with our Privacy Policy. We use your contact details to manage your booking and send confirmations only. We do not sell or share your data with third parties.' },
              ].map(({ heading, body }) => (
                <div key={heading} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 600, color: '#2c2420', marginBottom: 4 }}>{heading}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</div>
                </div>
              ))}
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontStyle: 'italic', marginTop: 8 }}>
                London Cleaning Wizard · Registered in England & Wales
              </div>
            </div>

            <div style={{ background: '#fff0f0', border: '1px solid #cc0000', borderLeft: '4px solid #cc0000', padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 700, color: '#cc0000', marginBottom: 4 }}>
                ⚠ Before clicking "Create Booking"
              </div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#cc0000', fontWeight: 600, lineHeight: 1.6 }}>
                Do <strong>not</strong> confirm the booking with the customer yet. Once created, go to the booking and use <strong>Generate Payment Link</strong> to send them the deposit link. Only confirm once payment is received.
              </div>
            </div>

            {nbErr && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{nbErr}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowNewBooking(false); setNb(BLANK_BOOKING); setNbErr(''); setNbSubmitted(false); setNbTouched({}); }} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
                Cancel
              </button>
              <button onClick={handleNewBooking} disabled={nbSaving} style={{ ...BTN, flex: 1, background: '#c8b89a', color: '#1a1410', border: 'none' }}>
                {nbSaving ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 480, background: '#FAF8F4', overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: '#1a1410' }}>Edit Booking</div>
              <button onClick={() => { setEditBooking(null); setEditData({}); setEditScope('this'); setEditErr(''); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8b7355' }}>✕</button>
            </div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', marginBottom: 24 }}>
              {editBooking.firstName} {editBooking.lastName} · {editBooking.bookingRef}
            </div>

            {/* Date & Time */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 12 }}>Date & Time</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Clean Date</div>
              <input type="date" value={editData.cleanDate || ''} onChange={e => setEditData(p => ({ ...p, cleanDate: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Clean Time</div>
              <select value={editData.cleanTime || ''} onChange={e => setEditData(p => ({ ...p, cleanTime: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Customer Details */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Customer Details</div>
            {[
              { label: 'First Name', key: 'firstName' },
              { label: 'Last Name',  key: 'lastName' },
              { label: 'Email',      key: 'email' },
              { label: 'Phone',      key: 'phone' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>{f.label}</div>
                <input value={editData[f.key] ?? ''} onChange={e => setEditData(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            ))}

            {/* Service */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Service</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Package</div>
              <select value={editData.packageId || ''} onChange={e => {
                const pkg = PACKAGES.find(p => p.id === e.target.value);
                setEditData(p => ({ ...p, packageId: e.target.value, packageName: pkg?.name || '', sizeId: '', addons: [], frequency: pkg?.showFreq ? p.frequency : 'one-off' }));
              }} style={{ ...INPUT, marginBottom: 0 }}>
                {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Size</div>
              <select value={editData.sizeId || ''} onChange={e => setEditData(p => ({ ...p, sizeId: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
                <option value="">Select size</option>
                {(PACKAGES.find(p => p.id === editData.packageId)?.sizes || []).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            {PACKAGES.find(p => p.id === editData.packageId)?.showFreq && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Frequency</div>
                <select value={editData.frequency || 'one-off'} onChange={e => setEditData(p => ({ ...p, frequency: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
                  {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            )}
            {PACKAGES.find(p => p.id === editData.packageId)?.showAddons && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 8 }}>Add-ons</div>
                {ADDONS.map(a => {
                  const isSmall = ['studio', '1bed'].includes(editData.sizeId);
                  const price   = a.id === 'windows' ? (isSmall ? 35 : 55) : a.price;
                  return (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420' }}>
                      <input type="checkbox" checked={(editData.addons||[]).some(x => x.id === a.id)} onChange={e => setEditData(p => ({ ...p, addons: e.target.checked ? [...(p.addons||[]), { id: a.id, name: a.name, price }] : (p.addons||[]).filter(x => x.id !== a.id) }))} />
                      {a.name} — £{price}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Address & Access */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Address & Access</div>
            {[
              { label: 'Address',      key: 'addr1' },
              { label: 'Postcode',     key: 'postcode' },
              { label: 'Floor / Lift', key: 'floor' },
              { label: 'Parking',      key: 'parking' },
              { label: 'Keys',         key: 'keys' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>{f.label}</div>
                <input value={editData[f.key] ?? ''} onChange={e => setEditData(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            ))}

            {/* Pets & Preferences */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Pets & Preferences</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 8 }}>Pets at property?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: false, l: 'No' }, { v: true, l: 'Yes' }].map(opt => (
                  <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, hasPets: opt.v }))} style={{ ...BTN, padding: '8px 20px', background: editData.hasPets === opt.v ? '#2c2420' : 'transparent', color: editData.hasPets === opt.v ? '#f5f0e8' : '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>{opt.l}</button>
                ))}
              </div>
            </div>
            {editData.hasPets && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Pet description</div>
                <input value={editData.petTypes ?? ''} onChange={e => setEditData(p => ({ ...p, petTypes: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 8 }}>Signature Touch</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: true, l: 'Opted in' }, { v: false, l: 'Opted out' }].map(opt => (
                  <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, signatureTouch: opt.v }))} style={{ ...BTN, padding: '8px 20px', background: editData.signatureTouch === opt.v ? '#2c2420' : 'transparent', color: editData.signatureTouch === opt.v ? '#f5f0e8' : '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>{opt.l}</button>
                ))}
              </div>
            </div>
            {editData.signatureTouch === false && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Opt-out reason</div>
                <input value={editData.signatureTouchNotes ?? ''} onChange={e => setEditData(p => ({ ...p, signatureTouchNotes: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            )}

            {/* Notes */}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Notes</div>
            <textarea value={editData.notes ?? ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...INPUT, marginBottom: 14, resize: 'vertical' }} />

            {editBooking && editBooking.frequency && editBooking.frequency !== 'one-off' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 12 }}>Apply changes to</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'this', label: 'This booking only', sub: 'Other future bookings stay the same.' },
                    { id: 'all',  label: 'This and all future bookings', sub: `Updates their ${editBooking.frequency} recurring schedule — time, address, and access details.` },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setEditScope(opt.id)}
                      style={{ display: 'flex', gap: 12, padding: '12px 14px', border: `1px solid ${editScope === opt.id ? '#c8b89a' : 'rgba(200,184,154,0.3)'}`, background: editScope === opt.id ? '#fdf8f3' : 'white', cursor: 'pointer' }}
                    >
                      <div style={{ width: 16, height: 16, border: editScope === opt.id ? 'none' : '1px solid rgba(200,184,154,0.5)', background: editScope === opt.id ? '#c8b89a' : 'transparent', borderRadius: '50%', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {editScope === opt.id && <div style={{ width: 6, height: 6, background: '#1a1410', borderRadius: '50%' }} />}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420', fontWeight: 500 }}>{opt.label}</div>
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300, marginTop: 2 }}>{opt.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editErr && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{editErr}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setEditBooking(null); setEditData({}); setEditScope('this'); setEditErr(''); }} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ ...BTN, flex: 1, background: '#c8b89a', color: '#1a1410', border: 'none' }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
