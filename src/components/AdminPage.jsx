import { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { todayUK } from '../utils/time';
import { Sparkle, LogoMark } from './Icons';
import { PACKAGES, FREQUENCIES, ADDONS, calculateTotal, DEEP_SUPPLIES_FEE } from '../data/siteData';

function DoNotContactToggle({ value, onChange }) {
  const [on, setOn] = useState(value);
  const handle = () => { const next = !on; setOn(next); onChange(next); };
  return (
    <div onClick={handle} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14, padding: '8px 14px', background: on ? '#fdf5f5' : '#f5f9f5', border: `1px solid ${on ? 'rgba(139,32,32,0.2)' : 'rgba(26,82,52,0.2)'}` }}>
      <div style={{ width: 16, height: 16, borderRadius: 3, background: on ? '#8b2020' : '#1a5234', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{on ? '✕' : '✓'}</div>
      <span style={{ fontFamily: FONT, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: on ? '#8b2020' : '#1a5234', fontWeight: 500 }}>
        {on ? 'Do Not Contact — click to allow contact' : 'Contact allowed — click to mark do not contact'}
      </span>
    </div>
  );
}

const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
const fmtCreatedAt = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
};

// ── Themes ────────────────────────────────────────────────────
const THEMES = {
  look1: {
    bg: '#faf9f7', sidebar: '#f5f0e8', card: '#ffffff', border: '#d4c4ae',
    text: '#1a1410', muted: '#8b7355', faint: '#a89070',
    accent: '#c8b89a', accentDark: '#a89578',
    success: '#16a34a', danger: '#dc2626', warning: '#d97706',
    sidebarText: '#1a1410', sidebarMuted: '#8b7355', sidebarBorder: 'rgba(26,20,16,0.1)',
    sidebarActive: 'rgba(26,20,16,0.07)', sidebarActiveBorder: '#8b7355',
  },
  look2: {
    bg: '#f2ede6', sidebar: '#2c2420', card: '#fdf8f3', border: '#d4c4ae',
    text: '#1a1410', muted: '#8b7355', faint: '#a89070',
    accent: '#c8b89a', accentDark: '#a89578',
    success: '#16a34a', danger: '#dc2626', warning: '#d97706',
    sidebarText: '#fff', sidebarMuted: 'rgba(200,184,154,0.6)', sidebarBorder: 'rgba(200,184,154,0.12)',
    sidebarActive: 'rgba(200,184,154,0.12)', sidebarActiveBorder: '#c8b89a',
  },
  look3: {
    bg: '#f1f5f9', sidebar: '#1e293b', card: '#ffffff', border: '#e2e8f0',
    text: '#0f172a', muted: '#64748b', faint: '#94a3b8',
    accent: '#c8b89a', accentDark: '#a89578',
    success: '#16a34a', danger: '#dc2626', warning: '#d97706',
    sidebarText: '#fff', sidebarMuted: '#94a3b8', sidebarBorder: 'rgba(255,255,255,0.08)',
    sidebarActive: 'rgba(200,184,154,0.12)', sidebarActiveBorder: '#c8b89a',
  },
};

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'bookings',  label: 'Bookings',  icon: '📋' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'calendar',  label: 'Calendar',  icon: '📅' },
  { id: 'staff',     label: 'Staff',     icon: '👤' },
  { id: 'myJobs',    label: 'My Jobs',   icon: '📝' },
  { id: 'expenses',  label: 'Expenses',  icon: '🧾' },
  { id: 'reports',   label: 'Reports',   icon: '📈' },
];

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
  const [themeKey, setThemeKey] = useState('look3');
  const C = THEMES[themeKey];
  const INPUT = { width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', marginBottom: 16, boxSizing: 'border-box' };
  const BTN   = { fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: C.text, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 6 };
  const switchTheme = (key) => {
    setThemeKey(key);
    if (user?.uid) {
      localStorage.setItem(`theme_${user.uid}`, key);
      setDoc(doc(db, 'userPrefs', user.uid), { theme: key }, { merge: true }).catch(() => {});
    }
  };

  const [statusFilter,  setStatusFilter]  = useState('all');
  const [freqFilter,    setFreqFilter]    = useState('all');
  const [statTip,       setStatTip]       = useState(null);
  const [statsOpen,     setStatsOpen]     = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [activeView,       setActiveView]       = useState(() => localStorage.getItem('crmActiveView') || 'dashboard');
  const [calViewYear,      setCalViewYear]      = useState(new Date().getFullYear());
  const [calViewMonth,     setCalViewMonth]     = useState(new Date().getMonth());
  const [calBlockedDates,  setCalBlockedDates]  = useState([]);
  const [calSelectedId,    setCalSelectedId]    = useState(null);
  const [calActionBusy,    setCalActionBusy]    = useState(false);
  const [calActionErr,     setCalActionErr]     = useState('');
  const [calPackageFilter, setCalPackageFilter] = useState('');
  const [staff,            setStaff]            = useState([]);
  const [staffModal,       setStaffModal]       = useState(null); // null | { mode: 'add'|'edit', data: {} }
  const [staffSaving,      setStaffSaving]      = useState(false);
  const [staffErr,         setStaffErr]         = useState('');
  const [staffSearch,      setStaffSearch]      = useState('');
  const [staffDragIdx,     setStaffDragIdx]     = useState(null);
  const [staffOrdered,     setStaffOrdered]     = useState([]);
  const [staffView,        setStaffView]        = useState(null); // staff member to view full profile
  const [staffAssignPending,   setStaffAssignPending]   = useState(null); // { booking, staffName }
  const [staffHolidayConflicts, setStaffHolidayConflicts] = useState(null); // { staffName, conflicts: [booking] }
  const [blockModal,       setBlockModal]       = useState(null); // { date, isBlocked }
  const [blockReason,      setBlockReason]      = useState('');
  const [blockSaving,      setBlockSaving]      = useState(false);
  const [blockErr,         setBlockErr]         = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch,   setCustomerSearch]   = useState('');
  const [editClient,       setEditClient]       = useState(null);
  const [editClientData,   setEditClientData]   = useState({});
  const [editClientSaving, setEditClientSaving] = useState(false);
  const [editClientErr,    setEditClientErr]    = useState('');
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

  useEffect(() => onAuthStateChanged(auth, async u => {
    setUser(u);
    setAuthLoading(false);
    if (u) {
      // Load from localStorage instantly, then override with Firestore if available
      const localSaved = localStorage.getItem(`theme_${u.uid}`);
      setThemeKey(localSaved || 'look3');
      getDoc(doc(db, 'userPrefs', u.uid)).then(snap => {
        if (snap.exists() && snap.data().theme) {
          setThemeKey(snap.data().theme);
          localStorage.setItem(`theme_${u.uid}`, snap.data().theme);
        }
      }).catch(() => {});
      setWelcomeMsg(WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
      setWelcomeColor(WELCOME_COLORS[Math.floor(Math.random() * WELCOME_COLORS.length)]);
      setTimeout(() => setBannerVisible(true), 50);
    } else {
      setBannerVisible(false);
      setThemeKey('look3');
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
    return onSnapshot(collection(db, 'staff'), snap => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'schedulerLogs'), orderBy('runAt', 'desc'), limit(10));
    return onSnapshot(q, snap =>
      setSchedulerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  // Fetch blocked dates when new-booking calendar month changes
  useEffect(() => {
    if (!user) return;
    fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${nbCalYear}&month=${nbCalMonth + 1}`)
      .then(r => r.json()).then(data => setNbBlockedDates(data.blocked || [])).catch(() => {});
  }, [user, nbCalYear, nbCalMonth]);

  // Fetch blocked dates for the calendar tab view
  useEffect(() => {
    if (!user) return;
    fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${calViewYear}&month=${calViewMonth + 1}`)
      .then(r => r.json()).then(data => setCalBlockedDates(data.blocked || [])).catch(() => {});
  }, [user, calViewYear, calViewMonth]);

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
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
        const fee = (booking.total * 0.3).toFixed(2);
        msg = `⚠️ Less than 48 hours notice — a late cancellation fee of £${fee} (30% of £${booking.total}) will be charged to the customer's saved card.`;
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
  if (authLoading) return <div style={{ minHeight: '100vh', background: C.bg }} />;

  // ── Login screen ──────────────────────────────────────────────
  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1a1410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '48px 36px', background: C.card, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <LogoMark size={32} color={C.accent} />
          <div>
            <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, color: C.text }}>London Cleaning Wizard</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, letterSpacing: '0.04em' }}>CRM · Admin Login</div>
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
          <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 14 }}>
            {loginErr}
          </p>
        )}
        <button onClick={handleLogin} style={{ ...BTN, width: '100%', padding: '13px', background: C.accent, color: C.text, borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
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
      if (statusFilter === 'cancelled') return b.status && b.status.startsWith('cancelled') && (b.frequency === 'one-off' || !b.frequency);
      if (statusFilter === 'cancelled-recurring') return b.status && b.status.startsWith('cancelled') && b.frequency && b.frequency !== 'one-off';
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

  const activeBookings  = displayedBookings.filter(b => !b.status?.startsWith('cancelled'));
  const cancelledCount  = displayedBookings.filter(b => b.status?.startsWith('cancelled')).length;
  const totalRevenue    = activeBookings.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
  const collected       = displayedBookings.reduce((s, b) => {
    if (b.status === 'fully_paid') return s + (parseFloat(b.total) || 0);
    if (['deposit_paid', 'payment_failed'].includes(b.status)) return s + (parseFloat(b.deposit) || 0);
    return s;
  }, 0);
  const outstanding     = displayedBookings
    .filter(b => b.status === 'deposit_paid')
    .reduce((s, b) => s + (parseFloat(b.remaining) || 0), 0);
  const refunded        = displayedBookings
    .filter(b => b.status === 'cancelled_full_refund' || b.status === 'cancelled_partial_refund')
    .reduce((s, b) => s + (parseFloat(b.refundAmount) || 0), 0);
  const cancellationRate = displayedBookings.length > 0
    ? ((cancelledCount / displayedBookings.length) * 100).toFixed(1)
    : '0.0';
  const paidBookings    = displayedBookings.filter(b => b.status === 'fully_paid');
  const aov             = paidBookings.length > 0
    ? (paidBookings.reduce((s, b) => s + (parseFloat(b.total) || 0), 0) / paidBookings.length)
    : 0;
  const activeRecurringClients = new Set(
    displayedBookings.filter(b => b.isAutoRecurring && !b.status?.startsWith('cancelled')).map(b => b.email)
  ).size;
  const everRecurringClients = new Set(
    displayedBookings.filter(b => b.isAutoRecurring).map(b => b.email)
  ).size;

  const LABEL = { fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4, letterSpacing: 0 };
  const VALUE = { fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 600, color: C.text };
  const DATE_INPUT = {
    fontFamily: FONT, fontSize: 13, padding: '7px 10px',
    border: `1px solid ${C.border}`, background: '#fff', borderRadius: 6,
    color: C.text, outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>

      {/* Header */}
      <div style={{ background: C.sidebar, padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.accent, fontSize: 18, lineHeight: 1 }}>☰</button>
          )}
          <LogoMark size={26} color={C.accent} />
          <div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.sidebarText, lineHeight: 1.2 }}>London Cleaning Wizard</div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: C.accent, fontWeight: 400, letterSpacing: '0.06em' }}>CRM</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {window.innerWidth >= 480 && (
            <a href="https://londoncleaningwizard.com/book" target="_blank" rel="noopener noreferrer" style={{ ...BTN, background: 'transparent', color: C.sidebarText, fontSize: 12, border: `1px solid ${C.sidebarBorder}`, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Website
            </a>
          )}
          <button onClick={() => signOut(auth)} style={{ ...BTN, background: 'transparent', color: C.sidebarText, fontSize: 12, border: `1px solid ${C.sidebarBorder}` }}>
            Log Out
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {isMobile && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: C.sidebar, zIndex: 201, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 32 }}>
              <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.sidebarText }}>Menu</div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: C.sidebarMuted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            {NAV_ITEMS.map(v => (
              <button key={v.id} onClick={() => { setActiveView(v.id); localStorage.setItem('crmActiveView', v.id); setDrawerOpen(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 20px', border: 'none', cursor: 'pointer',
                background: activeView === v.id ? C.sidebarActive : 'transparent',
                borderLeft: activeView === v.id ? `3px solid ${C.sidebarActiveBorder}` : '3px solid transparent',
                fontFamily: FONT, fontSize: 14, fontWeight: activeView === v.id ? 600 : 400,
                color: activeView === v.id ? C.sidebarText : C.sidebarMuted, textAlign: 'left',
              }}>
                <span style={{ fontSize: 16 }}>{v.icon}</span>{v.label}
              </button>
            ))}
            <div style={{ marginTop: 'auto', padding: '20px 20px 8px', borderTop: `1px solid ${C.sidebarBorder}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.sidebarMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'look1', label: '1', bg: '#f5f0e8', dot: '#1a1410' },
                  { key: 'look2', label: '2', bg: '#2c2420', dot: '#c8b89a' },
                  { key: 'look3', label: '3', bg: '#1e293b', dot: '#c8b89a' },
                ].map(t => (
                  <button key={t.key} onClick={() => switchTheme(t.key)} title={`Look ${t.label}`} style={{
                    width: 32, height: 32, borderRadius: 6, background: t.bg,
                    border: themeKey === t.key ? `2px solid ${C.accent}` : `2px solid transparent`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT, fontSize: 11, fontWeight: 700, color: t.dot,
                    boxShadow: themeKey === t.key ? `0 0 0 2px ${C.accent}` : 'none',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: isMobile ? undefined : '240px 1fr', minHeight: 'calc(100vh - 54px)', alignItems: 'start' }}>

        {/* Nav + Stats sidebar */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: 0, background: C.sidebar, minHeight: 'calc(100vh - 54px)', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>

            {/* Nav links */}
            <div style={{ marginBottom: 8, paddingBottom: 16, borderBottom: `1px solid ${C.sidebarBorder}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 20px', marginBottom: 8 }}>Navigation</div>
              {NAV_ITEMS.map(v => (
                <button key={v.id} onClick={() => { setActiveView(v.id); localStorage.setItem('crmActiveView', v.id); }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', border: 'none', cursor: 'pointer',
                  background: activeView === v.id ? C.sidebarActive : 'transparent',
                  borderLeft: activeView === v.id ? `3px solid ${C.sidebarActiveBorder}` : '3px solid transparent',
                  fontFamily: FONT, fontSize: 13, fontWeight: activeView === v.id ? 600 : 400,
                  color: activeView === v.id ? C.sidebarText : C.sidebarMuted, textAlign: 'left',
                  marginBottom: 2,
                }}>
                  <span style={{ fontSize: 15 }}>{v.icon}</span>{v.label}
                </button>
              ))}
            </div>

            {/* Theme switcher */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.sidebarBorder}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.sidebarMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'look1', label: '1', bg: '#f5f0e8', dot: '#1a1410' },
                  { key: 'look2', label: '2', bg: '#2c2420', dot: '#c8b89a' },
                  { key: 'look3', label: '3', bg: '#1e293b', dot: '#c8b89a' },
                ].map(t => (
                  <button key={t.key} onClick={() => switchTheme(t.key)} title={`Look ${t.label}`} style={{
                    width: 32, height: 32, borderRadius: 6, background: t.bg,
                    border: themeKey === t.key ? `2px solid ${C.accent}` : `2px solid transparent`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT, fontSize: 11, fontWeight: 700, color: t.dot,
                    boxShadow: themeKey === t.key ? `0 0 0 2px ${C.accent}` : 'none',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Stats — only shown on bookings view */}
            {activeView === 'bookings' && (
              <>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 20px 8px' }}>Stats</div>
            {[
              { section: 'Financial', stats: [
                { label: 'Total Revenue',     value: `£${totalRevenue.toFixed(2)}`,  note: 'All active bookings excl. cancellations' },
                { label: 'Gross Revenue',     value: `£${collected.toFixed(2)}`,     note: 'Money actually received to date' },
                { label: 'Outstanding',       value: `£${outstanding.toFixed(2)}`,   note: 'Remaining balances yet to be collected' },
                { label: 'Refunded',          value: `£${refunded.toFixed(2)}`,      note: 'Total refunded to customers' },
              ]},
              { section: 'Performance', stats: [
                { label: 'Bookings',          value: displayedBookings.length,       note: 'Total bookings in selected period' },
                { label: 'Avg. Order Value',  value: `£${aov.toFixed(2)}`,           note: 'Average value per completed booking' },
                { label: 'Cancellation Rate', value: `${cancellationRate}%`,         note: '% of bookings that were cancelled' },
              ]},
              { section: 'Clients', stats: [
                { label: 'Active Recurring',     value: activeRecurringClients,      note: 'Unique clients with a live recurring arrangement' },
                { label: 'Total Ever Recurring', value: everRecurringClients,        note: 'All clients who ever had a recurring booking, incl. cancelled' },
              ]},
            ].map(({ section, stats }, gi) => (
              <div key={gi} style={{ marginBottom: 16, padding: '0 20px' }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.sidebarMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{section}</div>
                {stats.map((s, i) => {
                  const tipKey = `${gi}-${i}`;
                  return (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.sidebarBorder}`, position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.sidebarMuted }}>{s.label}</div>
                        <div onMouseEnter={() => setStatTip(tipKey)} onMouseLeave={() => setStatTip(null)}
                          style={{ width: 12, height: 12, borderRadius: '50%', border: `1px solid ${C.sidebarMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: C.sidebarMuted, cursor: 'default', flexShrink: 0 }}>i</div>
                        {statTip === tipKey && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: C.text, color: C.card, fontFamily: FONT, fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap', lineHeight: 1.5, marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', borderRadius: 4 }}>
                            {s.note}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.sidebarText }}>{s.value}</div>
                    </div>
                  );
                })}
              </div>
            ))}
              </>
            )}

          </div>
        )}

        <div style={{ padding: isMobile ? '16px 12px' : '28px 28px', minHeight: 'calc(100vh - 54px)' }}>

        {/* Customers view */}
        {activeView === 'customers' && (() => {
          // Group all bookings by email
          const customerMap = {};
          bookings.forEach(b => {
            const key = (b.email || '').toLowerCase().trim();
            if (!key) return;
            if (!customerMap[key]) {
              customerMap[key] = {
                email: key,
                firstName: b.firstName,
                lastName: b.lastName,
                phone: b.phone,
                addr1: b.addr1,
                postcode: b.postcode,
                bookings: [],
              };
            }
            customerMap[key].bookings.push(b);
          });

          const customers = Object.values(customerMap).map(c => {
            const active = c.bookings.filter(b => !b.status?.startsWith('cancelled'));
            const totalSpend = active.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
            const collected  = c.bookings.reduce((s, b) => {
              if (b.status === 'fully_paid') return s + (parseFloat(b.total) || 0);
              if (['deposit_paid','payment_failed'].includes(b.status)) return s + (parseFloat(b.deposit) || 0);
              return s;
            }, 0);
            const sorted = [...c.bookings].sort((a, b) => (b.cleanDate || '') > (a.cleanDate || '') ? 1 : -1);
            const lastClean = sorted[0]?.cleanDate;
            const firstClean = sorted[sorted.length - 1]?.cleanDate;
            const isRecurring = c.bookings.some(b => b.isAutoRecurring);
            const hasActive = c.bookings.some(b => b.isAutoRecurring && !b.status?.startsWith('cancelled'));
            // Prefer active/pending booking over cancelled for contact prefs & notes
            const activeBooking = sorted.find(b => !b.status?.startsWith('cancelled')) || sorted[0];
            const doNotContact = activeBooking?.doNotContact ?? activeBooking?.marketingOptOut ?? false;
            const latestNotes = activeBooking?.notes || '';
            return { ...c, totalSpend, collected, lastClean, firstClean, isRecurring, hasActive, totalBookings: c.bookings.length, doNotContact, latestNotes, latestBookingId: activeBooking?.id };
          }).sort((a, b) => (b.lastClean || '') > (a.lastClean || '') ? 1 : -1);

          const filtered = customers.filter(c => {
            const q = customerSearch.toLowerCase();
            return !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.includes(q) || (c.phone || '').includes(q) || (c.postcode || '').toLowerCase().includes(q);
          });

          const sc = selectedCustomer ? customers.find(c => c.email === selectedCustomer) : null;

          return (
            <div style={{ display: 'grid', gridTemplateColumns: sc && !isMobile ? '320px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

              {/* Customer list */}
              {(!sc || !isMobile) && (
                <div>
                  <div style={{ marginBottom: 12, position: 'relative' }}>
                    <input
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, email, phone, postcode…"
                      style={{ ...INPUT, marginBottom: 0, padding: '10px 36px 10px 14px', borderRadius: 8 }}
                    />
                    {customerSearch && <button onClick={() => setCustomerSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted }}>×</button>}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 10, marginTop: 8 }}>{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</div>
                  {filtered.map(c => (
                    <div
                      key={c.email}
                      onClick={() => setSelectedCustomer(c.email)}
                      style={{ background: C.card, border: `1px solid ${selectedCustomer === c.email ? C.accent : C.border}`, borderLeft: `3px solid ${selectedCustomer === c.email ? C.accent : 'transparent'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{c.firstName} {c.lastName}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.hasActive && <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, background: '#f0fdf4', color: C.success, padding: '2px 8px', borderRadius: 20, border: `1px solid rgba(22,163,74,0.2)` }}>Recurring</div>}
                        </div>
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 6 }}>{c.email}</div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.faint }}>{c.totalBookings} booking{c.totalBookings !== 1 ? 's' : ''}</div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.faint }}>£{c.totalSpend.toFixed(2)} total</div>
                        {c.lastClean && <div style={{ fontFamily: FONT, fontSize: 11, color: C.faint }}>Last: {fmtDate(c.lastClean)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer detail */}
              {sc && (
                <div>
                  {isMobile && (
                    <button onClick={() => setSelectedCustomer(null)} style={{ ...BTN, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, marginBottom: 16, fontSize: 12 }}>← Back to customers</button>
                  )}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{sc.firstName} {sc.lastName}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, background: '#f8fafc', color: C.muted, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}` }}>Residential</div>
                          {sc.hasActive && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, background: '#f0fdf4', color: C.success, padding: '3px 10px', borderRadius: 20, border: `1px solid rgba(22,163,74,0.2)` }}>Active Recurring</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => { setEditClient(sc); setEditClientData({ firstName: sc.firstName, lastName: sc.lastName, phone: sc.phone || '', addr1: sc.addr1 || '', postcode: sc.postcode || '' }); setEditClientErr(''); }}
                        style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}
                      >
                        Edit Client
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
                      {[
                        { label: 'Total Bookings',   value: sc.totalBookings },
                        { label: 'Total Value',       value: `£${sc.totalSpend.toFixed(2)}` },
                        { label: 'Revenue Collected', value: `£${sc.collected.toFixed(2)}` },
                        { label: 'Customer Since',    value: fmtDate(sc.firstClean) },
                        { label: 'Last Clean',        value: fmtDate(sc.lastClean) },
                      ].map((s, i) => (
                        <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, fontFamily: FONT, color: C.muted, marginBottom: 16 }}>
                      {sc.phone && <div><span style={{ fontWeight: 600, color: C.text }}>Phone: </span>{sc.phone}</div>}
                      {sc.addr1 && <div><span style={{ fontWeight: 600, color: C.text }}>Address: </span>{sc.addr1}{sc.postcode ? `, ${sc.postcode}` : ''}</div>}
                    </div>

                    {/* Do Not Contact toggle */}
                    <DoNotContactToggle
                      value={sc.doNotContact}
                      onChange={next => {
                        setBookings(prev => prev.map(x => x.id === sc.latestBookingId ? { ...x, doNotContact: next } : x));
                        fetch(import.meta.env.VITE_CF_SET_DO_NOT_CONTACT, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bookingId: sc.latestBookingId, doNotContact: next }),
                        }).catch(() => {});
                      }}
                    />

                    {/* Notes from most recent booking */}
                    {sc.latestNotes && (
                      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', fontFamily: FONT, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                        <span style={{ fontWeight: 600, fontStyle: 'normal', color: C.text }}>Notes: </span>{sc.latestNotes}
                      </div>
                    )}
                  </div>

                  {/* Booking history */}
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Booking History</div>
                  {[...sc.bookings].sort((a, b) => (b.cleanDate || '') > (a.cleanDate || '') ? 1 : -1).map(b => (
                    <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{b.packageName} · {fmtDate(b.cleanDate)}</div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{b.bookingRef} · {b.cleanTime}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.text }}>£{b.total}</div>
                        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: STATUS_COLOURS[b.status]?.bg || '#f5f5f5', color: STATUS_COLOURS[b.status]?.color || '#5a5a5a', border: '1px solid rgba(0,0,0,0.06)' }}>
                          {STATUS_COLOURS[b.status]?.label || b.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Calendar view */}
        {activeView === 'calendar' && (() => {
          const today = todayUK();
          const [calYear,  setCalYear]  = [calViewYear,  setCalViewYear];
          const [calMonth, setCalMonth] = [calViewMonth, setCalViewMonth];
          const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

          const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
          const startOffset = (firstDay === 0 ? 6 : firstDay - 1); // Mon-based
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

          const DOT_COLOURS = {
            pending_deposit:  '#d97706',
            deposit_paid:     '#2563eb',
            fully_paid:       '#16a34a',
            payment_failed:   '#dc2626',
            cancelled_full:   '#94a3b8',
            cancelled_late:   '#94a3b8',
            cancelled_noshow: '#94a3b8',
            completed:        '#16a34a',
          };
          const getDot = (b) => {
            const isRecurring = b.frequency && b.frequency !== 'one-off';
            if (isRecurring) {
              const depositCollected = b.status === 'deposit_paid' || b.status === 'fully_paid';
              return depositCollected ? '#7c3aed' : '#eab308'; // purple = recurring paid, indigo = scheduled recurring (future, deposit pending)
            }
            return DOT_COLOURS[b.status] || '#94a3b8';
          };

          return (
            <div style={{ background: C.card, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: isMobile ? 16 : 24 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button onClick={prevMonth} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, padding: '6px 14px' }}>←</button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 600, color: C.text }}>{MONTHS[calMonth]} {calYear}</div>
                  <button onClick={() => { setCalViewYear(new Date().getFullYear()); setCalViewMonth(new Date().getMonth()); }} style={{ fontFamily: FONT, fontSize: 10, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Today</button>
                </div>
                <button onClick={nextMonth} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, padding: '6px 14px' }}>→</button>
              </div>

              {/* Month stats */}
              {(() => {
                const prefix = `${String(calYear)}-${String(calMonth + 1).padStart(2, '0')}`;
                const monthBookings = bookings.filter(b => b.cleanDate?.startsWith(prefix));
                const active = monthBookings.filter(b => !b.status?.startsWith('cancelled'));
                const revenue = active.reduce((s, b) => s + parseFloat(b.total || 0), 0);
                const pendingCount = monthBookings.filter(b => b.status === 'pending_deposit').length;
                const stats = [
                  { label: 'Bookings', value: active.length },
                  { label: 'Expected revenue', value: `£${revenue.toFixed(2)}` },
                  { label: 'Pending deposit', value: pendingCount, alert: pendingCount > 0 },
                ];
                return (
                  <div style={{ display: 'flex', gap: isMobile ? 8 : 16, marginBottom: 16, flexWrap: 'wrap' }}>
                    {stats.map(s => (
                      <div key={s.label} style={{ flex: 1, minWidth: 100, background: s.alert ? '#fef3c7' : C.bg, border: `1px solid ${s.alert ? '#d97706' : C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: s.alert ? '#92400e' : C.muted, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: s.alert ? '#92400e' : C.text }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

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
                    <div key={dateStr}
                      onClick={() => setBlockModal({ date: dateStr, isBlocked })}
                      title={isBlocked ? `${dateStr} — Blocked (click to unblock)` : `${dateStr} — Click to block`}
                      style={{
                        background: isBlocked ? '#fee2e2' : C.card,
                        minHeight: isMobile ? 56 : 80,
                        padding: isMobile ? '4px 4px' : '6px 8px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      {/* Day number */}
                      <div style={{
                        fontFamily: FONT, fontSize: isMobile ? 11 : 13, fontWeight: isToday ? 700 : 400,
                        color: isBlocked ? '#dc2626' : isToday ? '#1d4ed8' : isPast ? C.faint : C.text,
                        marginBottom: 2,
                      }}>{parseInt(dateStr.split('-')[2])}</div>

                      {/* Blocked indicator */}
                      {isBlocked && (
                        <div style={{ fontFamily: FONT, fontSize: 9, color: '#dc2626', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 2 }}>BLOCKED</div>
                      )}

                      {/* Booking chips */}
                      {dayBookings.slice(0, isMobile ? 1 : 3).map(b => {
                        const dot = getDot(b);
                        const cancelled = b.status?.startsWith('cancelled');
                        return (
                          <div
                            key={b.id}
                            onClick={e => { e.stopPropagation(); setCalSelectedId(b.id === calSelectedId ? null : b.id); }}
                            title={`${b.firstName} ${b.lastName} — ${b.packageName || ''} ${b.cleanTime || ''}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              background: cancelled ? C.bg : `${dot}18`,
                              border: `1px solid ${dot}44`,
                              borderRadius: 4, padding: isMobile ? '1px 4px' : '2px 6px',
                              marginBottom: 2, cursor: 'pointer',
                              opacity: cancelled ? 0.5 : 1,
                            }}
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
                  { label: 'Pending deposit', color: '#d97706' },
                  { label: 'Deposit paid',    color: '#2563eb' },
                  { label: 'Fully paid',      color: '#16a34a' },
                  { label: 'Failed payment',  color: '#dc2626' },
                  { label: 'Cancelled',       color: '#94a3b8' },
                  { label: 'Recurring',  color: '#7c3aed' },
                  { label: 'Scheduled recurring', color: '#eab308' },
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
              {(() => {
                const sel = calSelectedId && bookings.find(x => x.id === calSelectedId);
                if (!sel) return null;
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
                        { l: 'Booking Ref',  v: sel.bookingRef },
                        { l: 'Clean Date',   v: fmtDate(sel.cleanDate) },
                        { l: 'Clean Time',   v: sel.cleanTime },
                        { l: 'Package',      v: sel.packageName },
                        { l: 'Property',     v: `${sel.propertyType || ''} · ${sel.size || ''}` },
                        { l: 'Address',      v: `${sel.addr1}, ${sel.postcode}` },
                        { l: 'Phone',        v: sel.phone },
                        { l: 'Email',        v: sel.email },
                        { l: 'Frequency',    v: sel.frequency || 'one-off' },
                        { l: 'Add-ons',      v: sel.addons?.length ? sel.addons.map(a => a.name).join(', ') : 'None' },
                        { l: 'Pets',         v: sel.hasPets ? `Yes — ${sel.petTypes || 'not specified'}` : 'No' },
                        { l: 'Total',        v: `£${parseFloat(sel.total || 0).toFixed(2)}` },
                        { l: 'Deposit',      v: sel.status === 'pending_deposit' ? 'Pending' : `£${parseFloat(sel.deposit || 0).toFixed(2)}` },
                        { l: 'Remaining',    v: `£${parseFloat(sel.remaining || 0).toFixed(2)}` },
                        sel.notes && { l: 'Notes', v: sel.notes },
                      ].filter(Boolean).map((r, i) => (
                        <div key={i}>
                          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                          <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{r.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Quick actions */}
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
                            >
                              {calActionBusy ? 'Saving…' : 'Mark Deposit Paid'}
                            </button>
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
                            >
                              {calActionBusy ? 'Saving…' : 'Complete Job'}
                            </button>
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
                          >
                            Cancel Booking
                          </button>
                        </div>
                        {calActionErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 8 }}>{calActionErr}</div>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Dashboard placeholder */}
        {activeView === 'dashboard' && (
          <div style={{ background: C.card, borderRadius: 8, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT, fontSize: 28, marginBottom: 8 }}>📊</div>
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Dashboard</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Coming soon — at-a-glance stats, today's jobs, revenue summary and pending actions.</div>
          </div>
        )}

        {/* Staff view */}
        {activeView === 'staff' && (() => {
          const ordered = [...staff].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          const filtered = ordered.filter(s => !staffSearch || s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.role?.toLowerCase().includes(staffSearch.toLowerCase()));

          const move = async (i, dir) => {
            const next = [...ordered];
            const target = i + dir;
            if (target < 0 || target >= next.length) return;
            [next[i], next[target]] = [next[target], next[i]];
            await Promise.all(next.map((s, idx) => updateDoc(doc(db, 'staff', s.id), { order: idx }).catch(() => {})));
          };

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>Staff</div>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginTop: 2 }}>{staff.length} team member{staff.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search staff…" style={{ ...INPUT, marginBottom: 0, width: 180, fontSize: 13 }} />
                  <button onClick={() => { setStaffModal({ mode: 'add', data: { name: '', phone: '', email: '', role: 'Cleaner', hourlyRate: '', status: 'Active', joinDate: '', holidays: [] } }); setStaffErr(''); }} style={{ ...BTN, background: C.accent, color: '#fff', fontSize: 13 }}>+ Add Staff</button>
                </div>
              </div>

              {staff.length === 0 ? (
                <div style={{ background: C.card, borderRadius: 8, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>No staff added yet. Click "Add Staff" to get started.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map((s, i) => (
                    <div key={s.id} onClick={() => setStaffView(s)} style={{ background: s.status === 'Inactive' ? '#fff5f5' : C.card, borderRadius: 8, padding: isMobile ? '14px 16px' : '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, cursor: 'pointer', borderLeft: s.status === 'Inactive' ? '3px solid #dc2626' : '3px solid transparent' }} onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.08)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? C.faint : C.muted, fontSize: 12, padding: '1px 4px', lineHeight: 1 }}>▲</button>
                          <button onClick={() => move(i, 1)} disabled={i === filtered.length - 1} style={{ background: 'none', border: 'none', cursor: i === filtered.length - 1 ? 'default' : 'pointer', color: i === filtered.length - 1 ? C.faint : C.muted, fontSize: 12, padding: '1px 4px', lineHeight: 1 }}>▼</button>
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {s.photoURL ? <img src={s.photoURL} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>👤</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: s.status === 'Inactive' ? '#dc2626' : C.text }}>{s.name}</div>
                            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: s.status === 'Active' ? '#dcfce7' : '#fee2e2', color: s.status === 'Active' ? '#166534' : '#dc2626' }}>{s.status}</span>
                            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8' }}>{s.role}</span>
                            {(() => { const yr = new Date().getFullYear(); const days = (s.holidays || []).filter(d => d.startsWith(yr)).length; return days > 0 ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#fef9c3', color: '#854d0e' }}>🏖 {days}d off {yr}</span> : null; })()}
                          </div>
                          <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {s.phone && <span>📞 {s.phone}</span>}
                            {s.email && <span>✉️ {s.email}</span>}
                            <span>💷 {s.hourlyRate && s.hourlyRate !== 'N/A' ? `£${s.hourlyRate}/hr` : 'N/A'}</span>
                            {s.joinDate && <span>📅 Joined {s.joinDate.split('-').reverse().join('/')}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setStaffModal({ mode: 'edit', data: { ...s } }); setStaffErr(''); }} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>Edit</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* My Jobs placeholder */}
        {activeView === 'myJobs' && (
          <div style={{ background: C.card, borderRadius: 8, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT, fontSize: 28, marginBottom: 8 }}>📝</div>
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>My Jobs</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Coming soon — select a cleaner to view their assigned jobs, hours and earnings.</div>
          </div>
        )}

        {/* Expenses placeholder */}
        {activeView === 'expenses' && (
          <div style={{ background: C.card, borderRadius: 8, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT, fontSize: 28, marginBottom: 8 }}>🧾</div>
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Expenses</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Coming soon — log costs by category, track spending and view totals.</div>
          </div>
        )}

        {/* Reports placeholder */}
        {activeView === 'reports' && (
          <div style={{ background: C.card, borderRadius: 8, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT, fontSize: 28, marginBottom: 8 }}>📈</div>
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Reports</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Coming soon — revenue vs expenses, profit charts, busiest days and performance analytics.</div>
          </div>
        )}

        {activeView === 'bookings' && <div>

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
            Welcome back, {user.displayName?.split(' ')[0] || user.email.split('@')[0]} 👋
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

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search by name, email, booking ref, phone, postcode…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...INPUT, marginBottom: 0, padding: '10px 36px 10px 14px', borderRadius: 8 }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted, lineHeight: 1 }}>×</button>
          )}
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
                  <input type="date" value={dateFrom} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }} style={{ ...DATE_INPUT, flex: 1, marginBottom: 0 }} />
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>to</span>
                  <input type="date" value={dateTo} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateTo(e.target.value); setPreset('custom'); }} style={{ ...DATE_INPUT, flex: 1, marginBottom: 0 }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'week',  label: 'This Week' },
                  { id: 'month', label: 'This Month' },
                  { id: 'all',   label: 'All Time' },
                ].map(p => (
                  <button key={p.id} onClick={() => applyPreset(p.id)} style={{ ...BTN, padding: '6px 14px', fontSize: 12, background: preset === p.id ? C.text : 'transparent', color: preset === p.id ? '#fff' : C.muted, border: `1px solid ${preset === p.id ? C.text : C.border}`, borderRadius: 6 }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {preset !== 'all' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <input type="date" value={dateFrom} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }} style={{ ...DATE_INPUT, marginBottom: 0 }} />
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>to</span>
                  <input type="date" value={dateTo} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => { setDateTo(e.target.value); setPreset('custom'); }} style={{ ...DATE_INPUT, marginBottom: 0 }} />
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

        {/* Mobile stats (collapsible) */}
        {isMobile && activeView === 'bookings' && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setStatsOpen(o => !o)} style={{ ...BTN, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.sidebar, color: C.accent, border: 'none', borderRadius: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>Overview</span>
              <span style={{ fontSize: 12 }}>{statsOpen ? '▲' : '▼'}</span>
            </button>
            {statsOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1, background: C.border, marginTop: 1, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                {[
                  { label: 'Total Revenue',     value: `£${totalRevenue.toFixed(2)}` },
                  { label: 'Gross Revenue',     value: `£${collected.toFixed(2)}` },
                  { label: 'Outstanding',       value: `£${outstanding.toFixed(2)}` },
                  { label: 'Refunded',          value: `£${refunded.toFixed(2)}` },
                  { label: 'Bookings',          value: displayedBookings.length },
                  { label: 'Avg. Order Value',  value: `£${aov.toFixed(2)}` },
                  { label: 'Cancellation Rate', value: `${cancellationRate}%` },
                  { label: 'Active Recurring',  value: activeRecurringClients },
                ].map((s, i) => (
                  <div key={i} style={{ background: C.card, padding: '12px 14px' }}>
                    <div style={LABEL}>{s.label}</div>
                    <div style={VALUE}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scheduler log panel */}
        {schedulerLogs.length > 0 && (() => {
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
                    <div key={i} style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 4 }}>
                      {e.email} — {e.error}
                    </div>
                  ))}
                </div>
              )}
              {latest.created === 0 && latest.attempted === 0 && !hasErr && (
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>
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
            style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, cursor: triggeringScheduler ? 'not-allowed' : 'pointer', borderRadius: 6 }}
          >
            {triggeringScheduler ? 'Running…' : '⚙ Run Scheduler Now'}
          </button>
          {triggerResult && (
            <div style={{ fontFamily: FONT, fontSize: 12, color: triggerResult.startsWith('Error') ? C.danger : C.success }}>
              {triggerResult}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {displayedBookings.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 13, color: C.muted, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={selected.size === displayedBookings.length && displayedBookings.length > 0} onChange={e => setSelected(e.target.checked ? new Set(displayedBookings.map(b => b.id)) : new Set())} style={{ cursor: 'pointer', accentColor: C.accent, width: 15, height: 15 }} />
                Select All
              </label>
            )}
            {selected.size > 0 && (
              <button onClick={handleDeleteSelected} disabled={!!deleteProgress} style={{ ...BTN, background: C.danger, color: 'white', border: 'none', opacity: deleteProgress ? 0.6 : 1, cursor: deleteProgress ? 'not-allowed' : 'pointer', borderRadius: 6 }}>
                {deleteProgress ? `Deleting… ${deleteProgress.done}/${deleteProgress.total}` : `Delete Selected (${selected.size})`}
              </button>
            )}
            {deleteProgress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
                <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: C.danger, borderRadius: 2, width: `${(deleteProgress.done / deleteProgress.total) * 100}%`, transition: 'width 0.2s ease' }} />
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, whiteSpace: 'nowrap' }}>
                  {Math.round((deleteProgress.done / deleteProgress.total) * 100)}%
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            {displayedBookings.length > 0 && (
              <button onClick={handleExportCSV} style={{ ...BTN, background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                Export CSV
              </button>
            )}
            <button onClick={() => setShowNewBooking(true)} style={{ ...BTN, background: C.success, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>
              + New Booking
            </button>
          </div>
        </div>

        {completeErr && (
          <div style={{ background: '#fef2f2', borderLeft: `3px solid ${C.danger}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontFamily: FONT, fontSize: 13, color: C.danger }}>
            {completeErr}
          </div>
        )}

        {/* Bookings list */}
        {!bookingsLoaded && (
          <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: FONT, fontSize: 13, color: C.muted }}>
            Loading bookings…
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {bookingsLoaded && displayedBookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: FONT, fontSize: 13, color: C.muted }}>
              No bookings found.
            </div>
          )}
          {displayedBookings.map(b => {
            const sc = STATUS_COLOURS[b.status] || { bg: '#f5f5f5', color: '#5a5a5a', label: b.status };
            const isOpen = expanded === b.id;
            return (
              <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>

                {/* Booking row */}
                <div style={{ padding: isMobile ? '12px 14px' : '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleSelect(b.id)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: C.accent, width: 15, height: 15, flexShrink: 0 }} />
                  <div onClick={() => { setExpanded(isOpen ? null : b.id); setStopRecurringErr(''); }} style={{ flex: 1, cursor: 'pointer' }}>
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
                      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, background: stoppedRecurring.has(b.id) ? '#fef3c7' : '#dcfce7', color: stoppedRecurring.has(b.id) ? '#92400e' : '#166534' }}>
                        {stoppedRecurring.has(b.id) ? 'Series Stopped' : 'Recurring'}
                      </span>
                    )}
                    {b.isPhoneBooking && !b.isAutoRecurring && (
                      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8' }}>Phone</span>
                    )}
                    {b.assignedStaff && (
                      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, background: '#f5f3ff', color: '#6d28d9' }}>👤 {b.assignedStaff}</span>
                    )}
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    <span onClick={() => setExpanded(isOpen ? null : b.id)} style={{ fontSize: 14, color: C.muted, cursor: 'pointer', padding: '0 4px' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{ padding: isMobile ? '0 14px 16px' : '0 18px 18px', borderTop: `1px solid ${C.border}` }}>
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
                        { l: 'Marketing Opt-in', v: b.marketingOptOut ? '✕ Opted out at booking' : '✓ Opted in at booking' },
                        { l: 'Total',            v: `£${parseFloat(b.total).toFixed(2)}` },
                        { l: 'Deposit paid',     v: b.status === 'pending_deposit' ? 'Pending' : `£${parseFloat(b.deposit).toFixed(2)}`, highlight: b.status === 'pending_deposit' },
                        { l: 'Remaining',        v: `£${parseFloat(b.remaining).toFixed(2)}` },
                        { l: 'Source',           v: b.source || '—' },
                        b.stripeDepositIntentId   && { l: 'Stripe Deposit PI',   v: b.stripeDepositIntentId },
                        b.stripeRemainingIntentId && { l: 'Stripe Remaining PI',  v: b.stripeRemainingIntentId },
                        b.stripeCustomerId        && { l: 'Stripe Customer ID',   v: b.stripeCustomerId },
                      ].filter(Boolean).map((r, i) => (
                        <div key={i}>
                          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                          <div style={{ fontFamily: FONT, fontSize: 13, color: r.highlight ? '#fff' : C.text, fontWeight: 400, ...(r.highlight ? { background: C.danger, display: 'inline-block', padding: '2px 8px', borderRadius: 4 } : {}) }}>{r.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Cleaner assignment */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, whiteSpace: 'nowrap' }}>Assigned Cleaner</div>
                      <select
                        value={b.assignedStaff || ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (b.isAutoRecurring && val) {
                            setStaffAssignPending({ booking: b, staffName: val });
                          } else {
                            setBookings(prev => prev.map(x => x.id === b.id ? { ...x, assignedStaff: val } : x));
                            fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ bookingId: b.id, assignedStaff: val }),
                            }).catch(() => {});
                          }
                        }}
                        style={{ ...INPUT, marginBottom: 0, width: 'auto', maxWidth: 220, fontSize: 13 }}
                      >
                        <option value="">— Unassigned —</option>
                        {staff.filter(s => s.status === 'Active' && !(s.holidays || []).includes(b.cleanDate)).map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                        {/* Show on-holiday staff as disabled so admin can see who's off */}
                        {staff.filter(s => s.status === 'Active' && (s.holidays || []).includes(b.cleanDate)).map(s => (
                          <option key={s.id} value={s.name} disabled>🏖 {s.name} (on holiday)</option>
                        ))}
                      </select>
                    </div>

                    {/* Do Not Contact toggle */}
                    <DoNotContactToggle
                      value={b.doNotContact != null ? b.doNotContact : (b.marketingOptOut || false)}
                      onChange={next => {
                        setBookings(prev => prev.map(x => x.id === b.id ? { ...x, doNotContact: next } : x));
                        fetch(import.meta.env.VITE_CF_SET_DO_NOT_CONTACT, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bookingId: b.id, doNotContact: next }),
                        }).then(r => r.json()).then(d => console.log('doNotContact result', d)).catch(e => console.error('doNotContact error', e));
                      }}
                    />

                    {b.notes && (
                      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontFamily: FONT, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                        Notes: {b.notes}
                      </div>
                    )}

                    {b.status && b.status.startsWith('cancelled') && (
                      <div style={{ background: '#fef2f2', border: `1px solid rgba(220,38,38,0.2)`, borderRadius: 6, padding: '12px 16px', marginBottom: 14 }}>
                        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.danger, marginBottom: 10 }}>Cancellation Details</div>
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
                              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                              <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{r.v}</div>
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
                              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                                🔄 Auto-created recurring booking
                              </div>
                              <div style={{ fontFamily: FONT, fontSize: 12, color: '#14532d', fontWeight: 300, lineHeight: 1.6 }}>
                                This booking was created automatically by the recurring scheduler. Send the customer their deposit link or mark as paid if collecting manually.
                              </div>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleGenerateLink(b); }}
                            disabled={generatingLink === b.id}
                            style={{ ...BTN, background: generatingLink === b.id ? C.muted : C.text, color: '#fff' }}
                          >
                            {generatingLink === b.id ? 'Generating...' : '🔗 Send Deposit Link'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleMarkDepositPaid(b); }}
                            disabled={markingDeposit === b.id}
                            style={{ ...BTN, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}
                          >
                            {markingDeposit === b.id ? 'Updating...' : `✓ Mark Deposit Paid — £${b.deposit}`}
                          </button>
                          {depositLinks[b.id] && (
                            <div style={{ width: '100%', marginTop: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 14px' }}>
                              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 8 }}>
                                Payment link — send this to the customer
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  readOnly
                                  value={depositLinks[b.id]}
                                  style={{ ...INPUT, flex: 1, marginBottom: 0, fontSize: 11 }}
                                />
                                <button
                                  onClick={() => { navigator.clipboard.writeText(depositLinks[b.id]); }}
                                  style={{ ...BTN, padding: '8px 14px', background: C.text, color: 'white', flexShrink: 0, borderRadius: 6 }}
                                >
                                  Copy
                                </button>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); handleEmailDepositLink(b); }}
                                disabled={emailingLink === b.id || emailedLinks[b.id]}
                                style={{ ...BTN, marginTop: 8, padding: '8px 16px', background: emailedLinks[b.id] ? C.success : C.text, color: '#fff', fontSize: 12, width: '100%', borderRadius: 6 }}
                              >
                                {emailingLink === b.id ? 'Sending...' : emailedLinks[b.id] ? '✓ Email Sent to Customer' : '✉ Email Link to Customer'}
                              </button>
                              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.danger, marginTop: 8 }}>
                                Read to customer before sending link:
                              </div>
                              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>
                                I'm sending you a secure payment link. Once you pay the deposit, your booking is confirmed and your card will be saved for the final payment after the clean.
                              </div>
                            </div>
                          )}
                          {linkErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, margin: '6px 0 0' }}>{linkErr}</p>}
                        </>
                      )}
                      {b.status === 'deposit_paid' && (
                        <>
                          {b.stripeDepositIntentId === 'manual' && (
                            <div style={{ width: '100%', background: '#fef2f2', border: `1px solid rgba(220,38,38,0.2)`, borderRadius: 6, padding: '12px 16px', marginBottom: 4 }}>
                              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.danger, marginBottom: 4, letterSpacing: '0.05em' }}>
                                ⚠ Manual Payment — Action Required Before Completing
                              </div>
                              <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, lineHeight: 1.6 }}>
                                The deposit for this booking was collected manually (cash or card reader). The remaining balance of <strong>£{b.remaining}</strong> must also be collected manually before you mark this job as complete. Once you click Mark as Complete, no automatic charge will be made.
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleComplete(b)}
                            disabled={completing === b.id}
                            style={{ ...BTN, background: completing === b.id ? C.muted : C.success, display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            <Sparkle size={8} color="#fff" />
                            {completing === b.id ? 'Charging...' : b.stripeDepositIntentId === 'manual' ? `Mark as Complete — £${b.remaining} collected manually` : `Mark as Complete — Charge £${b.remaining}`}
                          </button>
                        </>
                      )}
                      {b.status === 'fully_paid' && (
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.success, display: 'flex', alignItems: 'center', gap: 6 }}>
                          ✓ Job complete — full payment received
                        </div>
                      )}
                      {b.status === 'scheduled' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{ ...BTN, background: completing === b.id ? C.muted : C.success, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <Sparkle size={8} color="#fff" />
                          {completing === b.id ? 'Charging...' : `Mark as Complete — Charge £${parseFloat(b.total).toFixed(2)}`}
                        </button>
                      )}
                      {b.status === 'payment_failed' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{ ...BTN, background: C.danger, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {completing === b.id ? 'Retrying...' : b.isAutoRecurring ? `Retry Payment — £${parseFloat(b.total).toFixed(2)}` : `Retry Payment — £${parseFloat(b.remaining).toFixed(2)}`}
                        </button>
                      )}
                      {['deposit_paid', 'pending_deposit', 'scheduled'].includes(b.status) && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); setEditBooking(b); setEditData({ cleanDate: b.cleanDate, cleanTime: b.cleanTime, firstName: b.firstName, lastName: b.lastName, email: b.email, phone: b.phone, packageId: b.package, packageName: b.packageName, sizeId: b.size, frequency: b.frequency || 'one-off', addons: b.addons || [], hasPets: b.hasPets || false, petTypes: b.petTypes || '', signatureTouch: b.signatureTouch !== false, signatureTouchNotes: b.signatureTouchNotes || '', addr1: b.addr1, postcode: b.postcode, floor: b.floor || '', parking: b.parking || '', keys: b.keys || '', notes: b.notes || '' }); setEditScope('this'); setEditErr(''); }}
                            style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}
                          >
                            Edit Booking
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleCancel(b); }}
                            disabled={cancelling === b.id}
                            style={{ ...BTN, background: 'transparent', color: C.danger, border: `1px solid rgba(220,38,38,0.3)` }}
                          >
                            {cancelling === b.id ? 'Cancelling...' : (b.status === 'pending_deposit' || b.status === 'scheduled') ? 'Cancel Booking' : 'Cancel & Refund'}
                          </button>
                          {b.isAutoRecurring && (
                            stoppedRecurring.has(b.id)
                              ? <p style={{ fontFamily: FONT, fontSize: 12, color: '#166534', background: '#f0fdf4', padding: '6px 12px', borderRadius: 4, margin: 0 }}>✓ Recurring series stopped — no more bookings will be auto-created for this customer.</p>
                              : <button
                                  onClick={e => { e.stopPropagation(); handleStopRecurring(b); }}
                                  disabled={stoppingRecurring === b.id}
                                  style={{ ...BTN, background: 'transparent', color: C.warning, border: `1px solid rgba(217,119,6,0.3)` }}
                                >
                                  {stoppingRecurring === b.id ? 'Stopping...' : 'Stop Recurring Series'}
                                </button>
                          )}
                        </>
                      )}
                      {stopRecurringErr && expanded === b.id && (
                        <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 8, width: '100%' }}>{stopRecurringErr}</p>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(b); }}
                        disabled={deleting === b.id}
                        style={{ ...BTN, background: 'transparent', color: C.danger, border: `1px solid rgba(220,38,38,0.3)`, marginLeft: 'auto' }}
                      >
                        {deleting === b.id ? 'Deleting...' : 'Delete Booking'}
                      </button>
                    </div>
                    {depositErr && expanded === b.id && (
                      <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 8 }}>{depositErr}</p>
                    )}
                    {cancelErr && expanded === b.id && (
                      <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 8 }}>{cancelErr}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>} {/* end bookings view */}
        </div> {/* end main content column */}
      </div>

      {/* Edit Client Modal */}
      {editClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420, background: C.card, borderRadius: 12, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text }}>Edit Client Details</div>
              <button onClick={() => setEditClient(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 24 }}>
              {editClient.email} · changes apply to all their bookings
            </div>
            {[
              { label: 'First Name', key: 'firstName' },
              { label: 'Last Name',  key: 'lastName' },
              { label: 'Phone',      key: 'phone' },
              { label: 'Address',    key: 'addr1' },
              { label: 'Postcode',   key: 'postcode' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>{f.label}</div>
                <input value={editClientData[f.key] || ''} onChange={e => setEditClientData(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            ))}
            {editClientErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{editClientErr}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setEditClient(null)} style={{ ...BTN, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
              <button
                disabled={editClientSaving}
                onClick={async () => {
                  setEditClientSaving(true); setEditClientErr('');
                  try {
                    const sorted = [...editClient.bookings].sort((a, b) => (b.cleanDate || '') > (a.cleanDate || '') ? 1 : -1);
                    const results = await Promise.all(editClient.bookings.map(bk =>
                      fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookingId: bk.id, ...editClientData, ...(bk.id === sorted[0].id ? { updateCustomerProfile: true } : {}) }),
                      })
                    ));
                    const failed = results.find(r => !r.ok);
                    if (failed) { const d = await failed.json(); setEditClientErr(d.error || 'Failed to update.'); setEditClientSaving(false); return; }
                    setEditClient(null); setEditClientData({});
                  } catch { setEditClientErr('Something went wrong.'); }
                  setEditClientSaving(false);
                }}
                style={{ ...BTN, flex: 1, background: C.accent, color: C.text, fontWeight: 600, borderRadius: 6 }}
              >
                {editClientSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {showNewBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 540, background: '#FAF8F4', overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' }}>New Booking</div>
              <button onClick={() => { setShowNewBooking(false); setNb(BLANK_BOOKING); setNbErr(''); setNbSubmitted(false); setNbTouched({}); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8b7355' }}>✕</button>
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
                    style={{ ...BTN, flex: 1, background: (v === 'Yes' ? nb.hasPets === true : nb.hasPets === false) ? '#c8b89a' : 'transparent', color: (v === 'Yes' ? nb.hasPets === true : nb.hasPets === false) ? '#1a1410' : '#1a1410', border: '1px solid #d4c4ae' }}>
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
            <div
              style={{ height: 200, overflowY: 'scroll', border: '1px solid #d4c4ae', borderRadius: 6, background: '#ffffff', padding: '14px 16px', marginBottom: 10 }}
            >
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
              <button onClick={() => { setShowNewBooking(false); setNb(BLANK_BOOKING); setNbErr(''); setNbSubmitted(false); setNbTouched({}); }} style={{ ...BTN, background: 'transparent', color: '#8b7355', border: '1px solid #d4c4ae' }}>
                Cancel
              </button>
              <button onClick={handleNewBooking} disabled={nbSaving} style={{ ...BTN, flex: 1, background: '#c8b89a', color: '#1a1410', border: 'none', fontWeight: 600, borderRadius: 6 }}>
                {nbSaving ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Profile View */}
      {staffView && (
        <div onClick={() => setStaffView(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 16, padding: isMobile ? '32px 24px' : '48px 40px', maxWidth: 400, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.25)', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setStaffView(null)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>

            <div style={{ width: 140, height: 140, borderRadius: '50%', background: C.bg, border: `3px solid ${C.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              {staffView.photoURL ? <img src={staffView.photoURL} alt={staffView.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 64 }}>👤</span>}
            </div>

            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>{staffView.name}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 99, background: staffView.status === 'Active' ? '#dcfce7' : '#fee2e2', color: staffView.status === 'Active' ? '#166534' : '#dc2626' }}>{staffView.status}</span>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8' }}>{staffView.role}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', background: C.bg, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              {[
                { label: 'Phone',       value: staffView.phone },
                { label: 'Email',       value: staffView.email },
                { label: 'Hourly Rate', value: staffView.hourlyRate && staffView.hourlyRate !== 'N/A' ? `£${staffView.hourlyRate}/hr` : 'N/A' },
                { label: 'Joined',      value: staffView.joinDate ? staffView.joinDate.split('-').reverse().join('/') : null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>{r.label}</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Holidays */}
            {(() => {
              const yr = new Date().getFullYear();
              const allDays = staffView.holidays || [];
              const thisYear = allDays.filter(d => d.startsWith(yr));
              return (
                <div style={{ textAlign: 'left', background: '#fef9c3', borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#854d0e', marginBottom: 6 }}>
                    🏖 Days Off {yr} — {thisYear.length} day{thisYear.length !== 1 ? 's' : ''}
                  </div>
                  {thisYear.length > 0 ? (() => {
                    const sorted = [...thisYear].sort();
                    const grouped = [];
                    let i = 0;
                    while (i < sorted.length) {
                      let j = i;
                      while (j + 1 < sorted.length) {
                        const a = new Date(sorted[j] + 'T12:00:00');
                        const b = new Date(sorted[j+1] + 'T12:00:00');
                        if ((b - a) / 86400000 === 1) j++; else break;
                      }
                      grouped.push({ from: sorted[i], to: sorted[j] });
                      i = j + 1;
                    }
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {grouped.map(({ from, to }) => (
                          <span key={from} style={{ fontFamily: FONT, fontSize: 12, background: '#fef08a', color: '#854d0e', borderRadius: 6, padding: '2px 8px' }}>
                            {from === to ? from.split('-').reverse().join('/') : `${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`}
                          </span>
                        ))}
                      </div>
                    );
                  })() : (
                    <div style={{ fontFamily: FONT, fontSize: 12, color: '#a16207' }}>No days logged yet</div>
                  )}
                </div>
              );
            })()}

            <button onClick={() => { setStaffView(null); setStaffModal({ mode: 'edit', data: { ...staffView } }); setStaffErr(''); }} style={{ ...BTN, background: C.accent, color: '#fff', width: '100%' }}>Edit Profile</button>
          </div>
        </div>
      )}

      {/* Recurring Cleaner Assignment Confirmation Modal */}
      {staffAssignPending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 440, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              Assign {staffAssignPending.staffName}?
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.5 }}>
              This is a recurring booking for <strong>{staffAssignPending.booking.customerName}</strong>. Apply this assignment to just this date, or to all future bookings in this series?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={async () => {
                const { booking: b, staffName } = staffAssignPending;
                setBookings(prev => prev.map(x => x.id === b.id ? { ...x, assignedStaff: staffName } : x));
                fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ bookingId: b.id, assignedStaff: staffName }),
                }).catch(() => {});
                setStaffAssignPending(null);
              }} style={{ ...BTN, background: C.accent, color: '#fff', textAlign: 'left', padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>This booking only</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Updates just {staffAssignPending.booking.cleanDate}</div>
              </button>
              <button onClick={async () => {
                const { booking: b, staffName } = staffAssignPending;
                const today = new Date().toISOString().split('T')[0];
                const futures = bookings.filter(x =>
                  x.email === b.email &&
                  x.frequency === b.frequency &&
                  x.isAutoRecurring &&
                  x.cleanDate >= today
                );
                setBookings(prev => prev.map(x => futures.find(f => f.id === x.id) ? { ...x, assignedStaff: staffName } : x));
                for (const f of futures) {
                  fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId: f.id, assignedStaff: staffName }),
                  }).catch(() => {});
                }
                // Store on customer doc so the scheduler picks it up for future auto-created bookings
                updateDoc(doc(db, 'customers', b.email), { assignedStaff: staffName }).catch(() => {});
                setStaffAssignPending(null);
              }} style={{ ...BTN, background: '#7c3aed', color: '#fff', textAlign: 'left', padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>All future bookings in this series</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Updates {bookings.filter(x => x.email === staffAssignPending.booking.email && x.frequency === staffAssignPending.booking.frequency && x.isAutoRecurring && x.cleanDate >= new Date().toISOString().split('T')[0]).length} upcoming bookings</div>
              </button>
              <button onClick={() => setStaffAssignPending(null)} style={{ ...BTN, background: 'none', color: C.muted, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {staffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 10, padding: '28px 28px 24px', maxWidth: 480, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text }}>{staffModal.mode === 'add' ? 'Add Staff' : 'Edit Staff'}</div>
              <button onClick={() => setStaffModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>

            {/* Photo upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.bg, border: `2px dashed ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {staffModal.data.photoURL
                  ? <img src={staffModal.data.photoURL} alt="staff" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 28 }}>👤</span>}
              </div>
              <div>
                <label style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12, cursor: 'pointer', display: 'inline-block' }}>
                  {staffModal.data.photoURL ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const previewUrl = URL.createObjectURL(file);
                    setStaffModal(m => ({ ...m, data: { ...m.data, photoURL: previewUrl, _photoFile: file } }));
                  }} />
                </label>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>Passport size · max 5MB</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Name *</div>
                <input value={staffModal.data.name} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="Full name" />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Phone *</div>
                <input value={staffModal.data.phone} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, phone: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="07xxx" />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Email</div>
                <input value={staffModal.data.email} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="email@example.com" />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Role</div>
                <select value={staffModal.data.role} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, role: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                  <option>Cleaner</option>
                  <option>Senior Cleaner</option>
                  <option>Team Leader</option>
                  <option>Manager</option>
                  <option>Co-founder</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Hourly Rate (£)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type={staffModal.data.hourlyRate === 'N/A' ? 'text' : 'number'}
                    value={staffModal.data.hourlyRate === 'N/A' ? 'N/A' : staffModal.data.hourlyRate}
                    disabled={staffModal.data.hourlyRate === 'N/A'}
                    onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, hourlyRate: e.target.value } }))}
                    style={{ ...INPUT, marginBottom: 0, flex: 1, opacity: staffModal.data.hourlyRate === 'N/A' ? 0.5 : 1 }}
                    placeholder="15"
                  />
                  <label style={{ fontFamily: FONT, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <input type="checkbox" checked={staffModal.data.hourlyRate === 'N/A'} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, hourlyRate: e.target.checked ? 'N/A' : '' } }))} />
                    N/A
                  </label>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Status</div>
                <select value={staffModal.data.status} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, status: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Joined Company</div>
                <input type="date" value={staffModal.data.joinDate || ''} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, joinDate: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            </div>

            {/* Holidays */}
            {(() => {
              const yr = new Date().getFullYear();
              const daysThisYear = (staffModal.data.holidays || []).filter(d => d.startsWith(yr)).length;

              const addRange = (from, to) => {
                if (!from || !to || from > to) return;
                const days = [];
                const cur = new Date(from + 'T12:00:00');
                const end = new Date(to + 'T12:00:00');
                while (cur <= end) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
                const current = staffModal.data.holidays || [];
                const merged = [...new Set([...current, ...days])].sort();
                setStaffModal(m => ({ ...m, data: { ...m.data, holidays: merged } }));
              };

              // Group consecutive days into ranges for display
              const grouped = [];
              const sorted = [...(staffModal.data.holidays || [])].sort();
              let i = 0;
              while (i < sorted.length) {
                let j = i;
                while (j + 1 < sorted.length) {
                  const a = new Date(sorted[j] + 'T12:00:00');
                  const b = new Date(sorted[j + 1] + 'T12:00:00');
                  if ((b - a) / 86400000 === 1) j++; else break;
                }
                grouped.push({ from: sorted[i], to: sorted[j] });
                i = j + 1;
              }

              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 8 }}>
                    Days Off · {yr} — {daysThisYear} day{daysThisYear !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 3 }}>From</div>
                      <input type="date" id="holidayFrom" style={{ ...INPUT, marginBottom: 0, fontSize: 12 }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 3 }}>To</div>
                      <input type="date" id="holidayTo" style={{ ...INPUT, marginBottom: 0, fontSize: 12 }} />
                    </div>
                    <button type="button" onClick={() => {
                      const from = document.getElementById('holidayFrom').value;
                      const to   = document.getElementById('holidayTo').value || from;
                      addRange(from, to);
                      document.getElementById('holidayFrom').value = '';
                      document.getElementById('holidayTo').value = '';
                    }} style={{ fontFamily: FONT, fontSize: 12, background: C.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', marginTop: 14 }}>Add</button>
                  </div>
                  {grouped.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {grouped.map(({ from, to }) => {
                        const label = from === to ? from.split('-').reverse().join('/') : `${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`;
                        const daysInRange = [];
                        const cur = new Date(from + 'T12:00:00');
                        const end = new Date(to + 'T12:00:00');
                        while (cur <= end) { daysInRange.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
                        return (
                          <span key={from} style={{ fontFamily: FONT, fontSize: 11, background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {label}
                            <button type="button" onClick={() => setStaffModal(m => ({ ...m, data: { ...m.data, holidays: (m.data.holidays || []).filter(x => !daysInRange.includes(x)) } }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#854d0e', fontSize: 12, lineHeight: 1, padding: 0 }}>✕</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {staffErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 10 }}>{staffErr}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              {staffModal.mode === 'edit' ? (
                <button disabled={staffSaving} onClick={async () => {
                  if (!window.confirm(`Delete ${staffModal.data.name}? This cannot be undone.`)) return;
                  setStaffSaving(true);
                  try { await deleteDoc(doc(db, 'staff', staffModal.data.id)); setStaffModal(null); }
                  catch (e) { setStaffErr(e.message); }
                  finally { setStaffSaving(false); }
                }} style={{ fontFamily: FONT, fontSize: 12, color: C.danger, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
              ) : <div />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStaffModal(null)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
                <button disabled={staffSaving} onClick={async () => {
                  const d = staffModal.data;
                  if (!d.name || !d.phone) { setStaffErr('Name and phone are required.'); return; }
                  setStaffSaving(true); setStaffErr('');
                  try {
                    let photoURL = d.photoURL && !d._photoFile ? d.photoURL : '';
                    if (d._photoFile) {
                      const ext = d._photoFile.name.split('.').pop();
                      const fileName = `staff/${Date.now()}.${ext}`;
                      const storageRef = ref(storage, fileName);
                      await uploadBytes(storageRef, d._photoFile);
                      photoURL = await getDownloadURL(storageRef);
                    }
                    if (staffModal.mode === 'add') {
                      await addDoc(collection(db, 'staff'), { name: d.name, phone: d.phone, email: d.email || '', role: d.role, hourlyRate: d.hourlyRate === 'N/A' ? 'N/A' : parseFloat(d.hourlyRate) || 0, status: d.status, photoURL, joinDate: d.joinDate || '', holidays: d.holidays || [], createdAt: new Date().toISOString() });
                    } else {
                      const { id, _photoFile, ...rest } = d;
                      await updateDoc(doc(db, 'staff', id), { ...rest, hourlyRate: d.hourlyRate === 'N/A' ? 'N/A' : parseFloat(d.hourlyRate) || 0, photoURL });
                      // Check for bookings assigned to this cleaner that fall on their new holiday dates
                      const newHolidays = new Set(d.holidays || []);
                      const conflicts = bookings.filter(bk => bk.assignedStaff === d.name && newHolidays.has(bk.cleanDate) && bk.cleanDate >= new Date().toISOString().split('T')[0]);
                      if (conflicts.length > 0) setStaffHolidayConflicts({ staffName: d.name, conflicts });
                    }
                    setStaffModal(null);
                  } catch (e) { setStaffErr(e.message); }
                  finally { setStaffSaving(false); }
                }} style={{ ...BTN, background: C.accent, color: '#fff', opacity: staffSaving ? 0.6 : 1 }}>{staffSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Conflict Modal */}
      {staffHolidayConflicts && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 500, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>⚠️ Holiday Conflict</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>
              <strong>{staffHolidayConflicts.staffName}</strong> is now on holiday on {staffHolidayConflicts.conflicts.length} upcoming booking{staffHolidayConflicts.conflicts.length !== 1 ? 's' : ''}. Reassign each one to a different cleaner:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staffHolidayConflicts.conflicts.map(bk => (
                <div key={bk.id} style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{bk.customerName}</div>
                    <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{bk.cleanDate?.split('-').reverse().join('/')} · {bk.packageName || bk.package}</div>
                  </div>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      setBookings(prev => prev.map(x => x.id === bk.id ? { ...x, assignedStaff: val } : x));
                      fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookingId: bk.id, assignedStaff: val }),
                      }).catch(() => {});
                      setStaffHolidayConflicts(prev => ({ ...prev, conflicts: prev.conflicts.filter(x => x.id !== bk.id) }));
                    }}
                    style={{ ...INPUT, marginBottom: 0, width: 'auto', minWidth: 160, fontSize: 13 }}
                  >
                    <option value="">— Reassign to… —</option>
                    {staff.filter(s => s.status === 'Active' && s.name !== staffHolidayConflicts.staffName && !(s.holidays || []).includes(bk.cleanDate)).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {staffHolidayConflicts.conflicts.length === 0 && (
              <div style={{ fontFamily: FONT, fontSize: 13, color: C.success, marginTop: 12 }}>✓ All bookings reassigned.</div>
            )}
            <button onClick={() => setStaffHolidayConflicts(null)} style={{ ...BTN, background: C.accent, color: '#fff', width: '100%', marginTop: 20 }}>
              {staffHolidayConflicts.conflicts.length === 0 ? 'Done' : 'Close (reassign later)'}
            </button>
          </div>
        </div>
      )}

      {/* Block / Unblock Date Modal */}
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
              <button onClick={() => { setBlockModal(null); setBlockReason(''); setBlockErr(''); }} style={{ ...BTN, background: 'transparent', color: '#8b7355', border: '1px solid #d4c4ae' }}>
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
                    // Refresh blocked dates for both calendar tab and new-booking calendar
                    const [calRes, nbRes] = await Promise.all([
                      fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${calViewYear}&month=${calViewMonth + 1}`),
                      fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${nbCalYear}&month=${nbCalMonth + 1}`),
                    ]);
                    const [calData, nbData] = await Promise.all([calRes.json(), nbRes.json()]);
                    setCalBlockedDates(calData.blocked || []);
                    setNbBlockedDates(nbData.blocked || []);
                    setBlockModal(null); setBlockReason(''); setBlockErr('');
                  } catch (e) {
                    setBlockErr(e.message || 'Something went wrong');
                  } finally {
                    setBlockSaving(false);
                  }
                }}
                style={{ ...BTN, flex: 1, background: blockModal.isBlocked ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', fontWeight: 600 }}
              >
                {blockSaving ? 'Saving...' : blockModal.isBlocked ? 'Unblock Date' : 'Block Date'}
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
              <button onClick={() => { setEditBooking(null); setEditData({}); setEditScope('this'); setEditErr(''); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 24 }}>
              {editBooking.firstName} {editBooking.lastName} · {editBooking.bookingRef}
            </div>

            {/* Date & Time */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>Date & Time</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Clean Date</div>
              <input type="date" value={editData.cleanDate || ''} onChange={e => setEditData(p => ({ ...p, cleanDate: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Clean Time</div>
              <select value={editData.cleanTime || ''} onChange={e => setEditData(p => ({ ...p, cleanTime: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
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
                <input value={editData[f.key] ?? ''} onChange={e => setEditData(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            ))}

            {/* Service */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Service</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Package</div>
              <select value={editData.packageId || ''} onChange={e => {
                const pkg = PACKAGES.find(p => p.id === e.target.value);
                setEditData(p => ({ ...p, packageId: e.target.value, packageName: pkg?.name || '', sizeId: '', addons: [], frequency: pkg?.showFreq ? p.frequency : 'one-off' }));
              }} style={{ ...INPUT, marginBottom: 0 }}>
                {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Size</div>
              <select value={editData.sizeId || ''} onChange={e => setEditData(p => ({ ...p, sizeId: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
                <option value="">Select size</option>
                {(PACKAGES.find(p => p.id === editData.packageId)?.sizes || []).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            {PACKAGES.find(p => p.id === editData.packageId)?.showFreq && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Frequency</div>
                <select value={editData.frequency || 'one-off'} onChange={e => setEditData(p => ({ ...p, frequency: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
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
                <input value={editData[f.key] ?? ''} onChange={e => setEditData(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            ))}

            {/* Pets & Preferences */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Pets & Preferences</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 8 }}>Pets at property?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: false, l: 'No' }, { v: true, l: 'Yes' }].map(opt => (
                  <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, hasPets: opt.v }))} style={{ ...BTN, padding: '8px 20px', background: editData.hasPets === opt.v ? C.text : 'transparent', color: editData.hasPets === opt.v ? '#fff' : C.text, border: `1px solid ${C.border}` }}>{opt.l}</button>
                ))}
              </div>
            </div>
            {editData.hasPets && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Pet description</div>
                <input value={editData.petTypes ?? ''} onChange={e => setEditData(p => ({ ...p, petTypes: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 8 }}>Signature Touch</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: true, l: 'Opted in' }, { v: false, l: 'Opted out' }].map(opt => (
                  <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, signatureTouch: opt.v }))} style={{ ...BTN, padding: '8px 20px', background: editData.signatureTouch === opt.v ? C.text : 'transparent', color: editData.signatureTouch === opt.v ? '#fff' : C.text, border: `1px solid ${C.border}` }}>{opt.l}</button>
                ))}
              </div>
            </div>
            {editData.signatureTouch === false && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Opt-out reason</div>
                <input value={editData.signatureTouchNotes ?? ''} onChange={e => setEditData(p => ({ ...p, signatureTouchNotes: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            )}

            {/* Notes */}
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '20px 0 12px' }}>Notes</div>
            <textarea value={editData.notes ?? ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...INPUT, marginBottom: 14, resize: 'vertical' }} />

            {editBooking && editBooking.frequency && editBooking.frequency !== 'one-off' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 }}>Apply changes to</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'this', label: 'This booking only', sub: 'Other future bookings stay the same.' },
                    { id: 'all',  label: 'This and all future bookings', sub: `Updates their ${editBooking.frequency} recurring schedule — time, address, and access details.` },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setEditScope(opt.id)}
                      style={{ display: 'flex', gap: 12, padding: '12px 14px', border: `1px solid ${editScope === opt.id ? C.accent : C.border}`, borderRadius: 6, background: editScope === opt.id ? '#f8f9fa' : C.card, cursor: 'pointer' }}
                    >
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
              <button onClick={() => { setEditBooking(null); setEditData({}); setEditScope('this'); setEditErr(''); }} style={{ ...BTN, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ ...BTN, flex: 1, background: C.accent, color: C.text, border: 'none', fontWeight: 600, borderRadius: 6 }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
