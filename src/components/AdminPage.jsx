import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { readNotifications, addNotification, markAllRead, clearNotification, clearAll, EVENT as NOTIF_EVENT } from '../features/admin/notifications';
import { db, auth } from '../firebase/firebase';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { LogoMark } from './Icons';
import DailyBrief from '../features/admin/tabs/marketing/workflow/DailyBrief';
import { calcHours } from '../features/admin/utils';

const ReportsTab   = lazy(() => import('../features/admin/tabs/ReportsTab'));
const SOPTab       = lazy(() => import('../features/admin/tabs/SOPTab'));
const StaffTab     = lazy(() => import('../features/admin/tabs/StaffTab'));
const MyJobsTab    = lazy(() => import('../features/admin/tabs/MyJobsTab'));
const SuppliesTab  = lazy(() => import('../features/admin/tabs/SuppliesTab'));
const DashboardTab = lazy(() => import('../features/admin/tabs/DashboardTab'));
const ExpensesTab  = lazy(() => import('../features/admin/tabs/ExpensesTab'));
const CustomersTab = lazy(() => import('../features/admin/tabs/CustomersTab'));
const CalendarTab  = lazy(() => import('../features/admin/tabs/CalendarTab'));
const BookingsTab    = lazy(() => import('../features/admin/tabs/BookingsTab'));
const MarketingTab       = lazy(() => import('../features/admin/tabs/MarketingTab'));
const CampaignWorkflow   = lazy(() => import('../features/admin/tabs/marketing/WorkflowTab'));
const PromotionsTab      = lazy(() => import('../features/admin/tabs/PromotionsTab'));
const SignatureTouchTab  = lazy(() => import('../features/admin/tabs/SignatureTouchTab'));
const TrashTab           = lazy(() => import('../features/admin/tabs/TrashTab'));
const MarketingSpendTab  = lazy(() => import('../features/admin/tabs/MarketingSpendTab'));
const QuotesTab          = lazy(() => import('../features/admin/tabs/QuotesTab'));
const ActionsTab         = lazy(() => import('../features/admin/tabs/ActionsTab'));


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
    accent: '#2563eb', accentDark: '#1d4ed8',
    success: '#16a34a', danger: '#dc2626', warning: '#d97706',
    sidebarText: '#fff', sidebarMuted: '#94a3b8', sidebarBorder: 'rgba(255,255,255,0.08)',
    sidebarActive: 'rgba(200,184,154,0.12)', sidebarActiveBorder: '#c8b89a',
  },
};

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const NAV_ITEMS = [
  { id: 'actions',   label: 'Actions',   icon: '✅' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'bookings',  label: 'Bookings',  icon: '📋' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'calendar',  label: 'Calendar',  icon: '📅' },
  { id: 'staff',     label: 'Staff',     icon: '👤' },
  { id: 'myJobs',    label: 'My Jobs',   icon: '📝' },
  { id: 'expenses',  label: 'Expenses',  icon: '🧾' },
  { id: 'supplies',  label: 'Supplies',  icon: '🧴' },
  { id: 'adSpend',        label: 'Ad Spend',           icon: '💸' },
  { id: 'reports',   label: 'Reports',   icon: '📈' },
  { id: 'marketing',       label: 'Marketing',       icon: '📣' },
  { id: 'campaigns',      label: 'Marketing Workflow', icon: '🎯' },
  { id: 'promotions',     label: 'Promotions',     icon: '🎁' },
  { id: 'signatureTouch', label: 'Signature Touch', icon: '✦'  },
  { id: 'sop',       label: 'SOP',       icon: '📖' },
  { id: 'quotes',         label: 'Quotes / Enquiries & Pricing', icon: '💰' },
  { id: 'trash',          label: 'Trash',           icon: '🗑'  },
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

export default function AdminPage() {
  const [user,        setUser]        = useState(null);
  const [bookings,       setBookings]       = useState([]);
  const [email,       setEmail]       = useState('');
  const [pass,        setPass]        = useState('');
  const [loginErr,    setLoginErr]    = useState('');
  const [welcomeMsg,   setWelcomeMsg]   = useState('');
  const [welcomeColor, setWelcomeColor] = useState('#6b5e56');
  const [authLoading,   setAuthLoading]   = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [emailFailures, setEmailFailures] = useState([]);
  const [schedulerLogs,     setSchedulerLogs]     = useState([]);
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

  const [notifs,    setNotifs]    = useState(readNotifications);
  const [bellOpen,  setBellOpen]  = useState(false);
  const refreshNotifs = useCallback(() => {
    const own = readNotifications();
    let mkt = [];
    try { mkt = JSON.parse(localStorage.getItem('mkt_notifications')) || []; } catch {}
    const mktMapped = mkt.map(n => ({ ...n, source: 'marketing', link: 'campaigns' }));
    setNotifs([...own, ...mktMapped].sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || '')));
  }, []);

  useEffect(() => {
    refreshNotifs();
    window.addEventListener(NOTIF_EVENT, refreshNotifs);
    window.addEventListener('mkt-notification-added', refreshNotifs);
    return () => {
      window.removeEventListener(NOTIF_EVENT, refreshNotifs);
      window.removeEventListener('mkt-notification-added', refreshNotifs);
    };
  }, [refreshNotifs]);

  const BRIEF_SS_KEY = 'lcw_brief_session';
  const [briefShown, setBriefShown] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (window._lcwBriefDate === today) return true;
    try {
      const stored = sessionStorage.getItem('lcw_brief_session');
      if (stored === today) { window._lcwBriefDate = today; return true; }
    } catch {}
    return false;
  });

  useEffect(() => {
    const check = () => {
      if (!document.hidden) {
        const today = new Date().toISOString().slice(0, 10);
        if (window._lcwBriefDate !== today) {
          window._lcwBriefDate = today;
          try { sessionStorage.setItem(BRIEF_SS_KEY, today); } catch {}
          setBriefShown(false);
        }
      }
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [activeView,       setActiveView]       = useState(() => localStorage.getItem('crmActiveView') || 'dashboard');
  const [staff,            setStaff]            = useState([]);
  const [expenses,              setExpenses]              = useState([]);

  const [fixedCosts,            setFixedCosts]            = useState([]);
  const [marketingSpend,        setMarketingSpend]        = useState([]);
  const [supplies,              setSupplies]              = useState([]);
  const [abandonmentStats,      setAbandonmentStats]      = useState([]);
  const [funnelData,            setFunnelData]            = useState([]);
  const [stDistributions,       setStDistributions]       = useState([]);
  const [savedQuotes,           setSavedQuotes]           = useState([]);
  const [incidents,             setIncidents]             = useState([]);
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
      try { sessionStorage.removeItem('lcw_brief_session'); } catch {}
      window._lcwBriefDate = null;
      setBriefShown(false);
    }
  }), []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // Phase notifications for Quotes Calculator -- each fires at most once (deduped by ID)
  useEffect(() => {
    if (!user || bookings.length === 0) return;
    const active = bookings.filter(b => !b.deleted);

    // Phase 2: 3+ returning clients (same customer booked 2+ times)
    const clientCounts = {};
    active.forEach(b => {
      const key = `${(b.firstName || '').toLowerCase().trim()}_${(b.lastName || '').toLowerCase().trim()}`;
      if (key !== '_') clientCounts[key] = (clientCounts[key] || 0) + 1;
    });
    const returningClients = Object.values(clientCounts).filter(n => n >= 2).length;
    if (returningClients >= 3) {
      addNotification({
        id: 'quotes_phase2_ready',
        icon: '💰',
        title: 'Time to raise your profit margin',
        message: `You now have ${returningClients} returning clients -- your reputation is building. Go to the Quotes Calculator and raise your profit margin from 25% to 30-35%. You have earned it.`,
        link: 'quotes',
      });
    }

    // Phase 3: 15+ bookings in current month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthCount = active.filter(b => b.cleanDate?.startsWith(thisMonth)).length;
    if (thisMonthCount >= 15) {
      addNotification({
        id: 'quotes_phase3_ready',
        icon: '📊',
        title: 'Raise your margin to 40%',
        message: `You have ${thisMonthCount} bookings this month. At this volume your overhead is spread across enough jobs that you can push your profit margin to 35-40% without pricing yourself out. Update it in the Quotes Calculator now.`,
        link: 'quotes',
      });
    }

  }, [user, bookings]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'savedQuotes'), orderBy('createdAt', 'desc')),
      snap => setSavedQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  useEffect(() => {
    if (!user || savedQuotes.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = savedQuotes.filter(sq => sq.status === 'quote_sent' && sq.followUpDate && sq.followUpDate <= today);
    if (overdue.length > 0) {
      addNotification({
        id: 'quote_followup_due',
        icon: '📋',
        title: `${overdue.length} quote follow-up${overdue.length > 1 ? 's' : ''} due`,
        message: overdue.map(sq => sq.bizName).join(', ') + (overdue.length === 1 ? ' -- follow up today.' : ' -- follow up with these clients today.'),
        link: 'actions',
      });
    }
  }, [user, savedQuotes]);

  useEffect(() => {
    if (!user || !bookings.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const in30str = in30.toISOString().slice(0, 10);
    const expiring = bookings.filter(b =>
      b.isContract && b.contractEndDate &&
      b.contractEndDate >= today && b.contractEndDate <= in30str &&
      !b.status?.startsWith('cancelled')
    );
    if (expiring.length > 0) {
      addNotification({
        id: 'contract_expiring',
        icon: '🏢',
        title: `${expiring.length} contract${expiring.length > 1 ? 's' : ''} ending soon`,
        message: expiring.map(b => b.bizName || b.firstName).join(', ') + ' -- discuss renewal.',
        link: 'actions',
      });
    }
  }, [user, bookings]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'emailFailures'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, snap => {
      setEmailFailures(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.resolved));
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
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'fixedCosts'), snap => setFixedCosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const isLastDay = tomorrow.getMonth() !== today.getMonth();
    if (isLastDay) {
      const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const monthName = today.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      addNotification({
        id: `monthly_expense_reminder_${monthKey}`,
        type: 'expense_reminder',
        title: 'Month-end expense reminder',
        message: `Today is the last day of ${monthName}. Log any variable expenses before the month closes — Google Ads, fuel, supplies, anything paid this month.`,
        link: 'expenses',
        icon: '📝',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!fixedCosts.length) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in30 = new Date(today); in30.setDate(today.getDate() + 30);
    fixedCosts.forEach(fc => {
      if (!fc.endDate || !fc.active) return;
      const end = new Date(fc.endDate); end.setHours(0, 0, 0, 0);
      if (end >= today && end <= in30) {
        const monthKey = fc.endDate.slice(0, 7);
        addNotification({
          id: `expense_end_${fc.id}_${monthKey}`,
          type: 'expense_ending',
          title: `${fc.name} ending soon`,
          message: `Direct debit "${fc.name}" ends on ${new Date(fc.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Review or renew it in Expenses.`,
          link: 'expenses',
          icon: '📅',
        });
      }
    });
  }, [fixedCosts]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'supplies'), snap => setSupplies(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'marketingSpend'), snap => setMarketingSpend(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'incidents'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user || !incidents.length) return;
    const today = new Date().toISOString().slice(0, 10);
    incidents.forEach(inc => {
      if (!inc.createdAt) return;
      const created = inc.createdAt.slice(0, 10);
      const days = Math.round((new Date(today) - new Date(created)) / 86400000);

      if (inc.status === 'open') {
        if (days >= 3 && days <= 6) {
          addNotification({
            id: `incident_chase_${inc.id}`,
            icon: '⚠️',
            title: 'Incident needs a chase',
            message: `"${inc.description}" has been open for ${days} days. Follow up for a progress update.`,
            link: 'expenses',
            tabKey: 'incidents',
          });
        }
        if (days >= 10) {
          addNotification({
            id: `incident_escalate_${inc.id}`,
            icon: '🔴',
            title: `Incident unresolved — ${days} days`,
            message: `"${inc.description}" is still open after ${days} days. Consider escalating or marking as pending reimbursement.`,
            link: 'expenses',
            tabKey: 'incidents',
          });
        }
      }
      if (inc.status === 'pending_reimbursement' && days >= 7) {
        addNotification({
          id: `incident_reimb_${inc.id}`,
          icon: '💰',
          title: 'Customer payout still pending',
          message: `${days} days since "${inc.description}" was marked for payout. Confirm payment has been sent.`,
          link: 'expenses',
          tabKey: 'incidents',
        });
      }
    });
  }, [user, incidents]);


  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'abandonmentStats'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => setAbandonmentStats(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bookingFunnel'), orderBy('updatedAt', 'desc'), limit(5000));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFunnelData(data);

      // Weekly funnel notification — fires at most once per week when 10+ visitors in last 7 days
      try {
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        const recent = data.filter(s => {
          const d = s.date || (s.updatedAt?.seconds ? new Date(s.updatedAt.seconds * 1000).toISOString().slice(0, 10) : null);
          return d && d >= cutoffStr;
        });
        if (recent.length >= 10) {
          const now = new Date();
          const weekKey = `${now.getFullYear()}-W${Math.ceil((now.getDate()) / 7)}`;
          addNotification({
            id: `funnel_intel_${weekKey}`,
            type: 'funnel_intel',
            icon: '📊',
            title: 'Funnel Intel — weekly reading ready',
            message: `${recent.length} visitors in the last 7 days. Check Funnel Intel for your automated reading and next steps.`,
            link: 'campaigns',
          });
        }
      } catch {}
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Weekly check-in reminder — fires if no action plan check-in or outreach log in 7 days
    try {
      const now = new Date();
      const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;

      const checkins = JSON.parse(localStorage.getItem('lcw_action_checkins') || '[]');
      const lastCheckin = checkins.sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
      const daysSinceCheckin = lastCheckin
        ? Math.floor((Date.now() - new Date(lastCheckin.weekOf).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const outreach = JSON.parse(localStorage.getItem('lcw_outreach_log') || '[]');
      const lastOutreach = outreach.sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
      const daysSinceOutreach = lastOutreach
        ? Math.floor((Date.now() - new Date(lastOutreach.weekOf).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceCheckin >= 7) {
        addNotification({
          id: `action_plan_checkin_${weekKey}`,
          type: 'action_checkin',
          icon: '✅',
          title: 'Weekly check-in due',
          message: `Log what you did this week in the Action Plan tab. Without it, the combined reading cannot tell whether results are flat because actions were skipped or because the strategy needs changing.`,
          link: 'campaigns',
        });
      }

      if (daysSinceOutreach >= 7) {
        addNotification({
          id: `outreach_log_due_${weekKey}`,
          type: 'outreach_due',
          icon: '📞',
          title: 'Outreach data not logged this week',
          message: `Log your calls, emails, visits, and group posts in the Outreach Tracker. The reading needs weekly data to be accurate.`,
          link: 'campaigns',
        });
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'stDistributions'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => setStDistributions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'schedulerLogs'), orderBy('runAt', 'desc'), limit(10));
    return onSnapshot(q, snap =>
      setSchedulerLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeView]);

  // ── Staff cost % alert — fires on 1st of each month if anyone exceeded 40% last month ──
  useEffect(() => {
    if (!user || !bookings.length || !staff.length) return;
    const now        = new Date();
    if (now.getDate() !== 1) return;
    const lm         = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmKey      = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}`;
    const lastDay    = new Date(lm.getFullYear(), lm.getMonth() + 1, 0).getDate();
    const pStart     = `${lmKey}-01`;
    const pEnd       = `${lmKey}-${String(lastDay).padStart(2, '0')}`;
    const notifId    = `staff-cost-over40-${lmKey}`;

    const toMins = t => { if (!t) return null; const m = t.match(/(\d+):(\d+)\s*(am|pm)?/i); if (!m) return null; let h = parseInt(m[1]), mn = parseInt(m[2]); const p = (m[3]||'').toUpperCase(); if (p==='PM'&&h!==12) h+=12; if (p==='AM'&&h===12) h=0; return h*60+mn; };
    const hrs    = (s, f) => { const sm=toMins(s), fm=toMins(f); if (sm===null||fm===null||fm<=sm) return null; return (fm-sm)/60; };
    const share  = (b, rev, name) => { if (!b.secondCleaner||!b.assignedStaff) return rev; const h1=hrs(b.actualStart,b.actualFinish)||0, h2=hrs(b.actualStart2,b.actualFinish2)||0, tot=h1+h2; if (tot===0) return rev/2; return (b.assignedStaff===name?h1:h2)/tot*rev; };

    const periodJobs     = bookings.filter(b => !b.isContract && !b.isContractVisit && b.cleanDate >= pStart && b.cleanDate <= pEnd);
    const contractVisits = bookings.filter(b => b.isContractVisit && b.cleanDate >= pStart && b.cleanDate <= pEnd);
    const collectedAmt   = b => { if (b.status==='fully_paid') return parseFloat(b.total)||0; if (b.status==='deposit_paid') return parseFloat(b.total)||0; return 0; };

    const overLimit = staff.filter(s => s.status === 'Active').filter(s => {
      const sRate = s.hourlyRate !== 'N/A' ? parseFloat(s.hourlyRate) : 0;
      const sJobs = periodJobs.filter(b => b.assignedStaff===s.name||b.secondCleaner===s.name);
      const sCVs  = contractVisits.filter(v => v.assignedStaff===s.name||v.secondCleaner===s.name);
      const sH    = [...sJobs.map(b=>(b.assignedStaff===s.name?hrs(b.actualStart,b.actualFinish):hrs(b.actualStart2,b.actualFinish2))||0),
                     ...sCVs.map(v=>(v.assignedStaff===s.name?hrs(v.actualStart,v.actualFinish):hrs(v.actualStart2,v.actualFinish2))||0)].reduce((a,b)=>a+b,0);
      const sCost = sH * sRate;
      const sRev  = sJobs.reduce((t,b)=>t+share(b,collectedAmt(b),s.name),0)
                  + sCVs.reduce((t,v)=>t+share(v,parseFloat(v.total||v.totalPerVisit||0),s.name),0);
      if (sRev === 0) return false;
      return (sCost / sRev) > 0.40;
    });

    if (!overLimit.length) return;
    const names    = overLimit.map(s => s.name).join(', ');
    const monthFmt = lm.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    addNotification({
      id:      notifId,
      type:    'staff_cost_alert',
      icon:    '⚠️',
      title:   `Staff cost over 40% — ${monthFmt}`,
      message: `${names} exceeded 40% labour cost last month. Review their jobs in Reports to identify low-margin work.`,
      link:    'reports',
    });
  }, [user, bookings, staff]);

  const handleLogin = async () => {
    setLoginErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch {
      setLoginErr('Incorrect email or password.');
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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, paddingTop: 54 }}>

      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 54, background: C.sidebar, padding: isMobile ? '0 16px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {window.innerWidth >= 480 && (
            <a href="https://londoncleaningwizard.com/book" target="_blank" rel="noopener noreferrer" style={{ ...BTN, background: 'transparent', color: C.sidebarText, fontSize: 12, border: `1px solid ${C.sidebarBorder}`, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Website
            </a>
          )}

          {/* Global notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setBellOpen(o => !o); markAllRead(); refreshNotifs(); }}
              style={{ background: bellOpen ? 'rgba(255,255,255,0.1)' : 'transparent', border: `1px solid ${C.sidebarBorder}`, borderRadius: 6, padding: '6px 10px', color: C.sidebarText, fontSize: 15, cursor: 'pointer', position: 'relative', lineHeight: 1 }}
              title="Notifications"
            >
              🔔
              {notifs.filter(n => !n.read).length > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, width: 15, height: 15, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: FONT }}>
                  {notifs.filter(n => !n.read).length > 9 ? '9+' : notifs.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {bellOpen && (
              <div style={{ position: 'absolute', top: '110%', right: 0, width: 340, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 300, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>Notifications</span>
                  {notifs.length > 0 && (
                    <button onClick={() => { clearAll(); localStorage.removeItem('mkt_notifications'); refreshNotifs(); }} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: 11, color: C.muted, cursor: 'pointer' }}>Clear all</button>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div style={{ padding: '24px 14px', fontFamily: FONT, fontSize: 13, color: C.muted, textAlign: 'center' }}>No notifications</div>
                ) : (
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifs.map(n => (
                      <div key={n.id} onClick={() => { if (n.link) { setActiveView(n.link); localStorage.setItem('crmActiveView', n.link); if (n.tabKey) localStorage.setItem('expenseTab', n.tabKey); setBellOpen(false); } }} style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'flex-start', background: n.read ? 'transparent' : `${C.accent}11`, cursor: n.link ? 'pointer' : 'default' }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon || (n.source === 'marketing' ? '🎯' : '🔔')}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {n.title && <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{n.title}</div>}
                          <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{n.message}</div>
                          {n.link && <div style={{ fontFamily: FONT, fontSize: 10, color: C.accent, marginTop: 3 }}>Tap to go to {n.link} →</div>}
                        </div>
                        {!n.source && (
                          <button onClick={e => { e.stopPropagation(); clearNotification(n.id); refreshNotifs(); }} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 15, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={() => signOut(auth)} style={{ ...BTN, background: 'transparent', color: C.sidebarText, fontSize: 12, border: `1px solid ${C.sidebarBorder}` }}>
            Log Out
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {isMobile && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: C.sidebar, zIndex: 201, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 12px', flexShrink: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.sidebarText }}>Menu</div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: C.sidebarMuted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            {NAV_ITEMS.map(v => (
              <button key={v.id} onClick={() => { setActiveView(v.id); localStorage.setItem('crmActiveView', v.id); setDrawerOpen(false); window.scrollTo(0, 0); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 20px', border: 'none', cursor: 'pointer',
                background: activeView === v.id ? C.sidebarActive : 'transparent',
                borderLeft: activeView === v.id ? `3px solid ${C.sidebarActiveBorder}` : '3px solid transparent',
                fontFamily: FONT, fontSize: 14, fontWeight: activeView === v.id ? 600 : 400,
                color: activeView === v.id ? C.sidebarText : C.sidebarMuted, textAlign: 'left', flexShrink: 0,
              }}>
                <span style={{ fontSize: 16 }}>{v.icon}</span>{v.label}
              </button>
            ))}
            <div style={{ padding: '20px 20px 16px', borderTop: `1px solid ${C.sidebarBorder}`, marginTop: 'auto', flexShrink: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.sidebarMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'look1', label: '1', bg: '#f5f0e8', dot: '#1a1410' },
                  { key: 'look2', label: '2', bg: '#2c2420', dot: '#c8b89a' },
                  { key: 'look3', label: '3', bg: '#1e293b', dot: '#2563eb' },
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

      {/* Fixed sidebar */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: 54, left: 0, width: 240, height: 'calc(100vh - 54px)', overflowY: 'auto', background: C.sidebar, zIndex: 50, padding: '24px 0', display: 'flex', flexDirection: 'column' }}>

            {/* Nav links */}
            <div style={{ marginBottom: 8, paddingBottom: 16, borderBottom: `1px solid ${C.sidebarBorder}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 20px', marginBottom: 8 }}>Navigation</div>
              {NAV_ITEMS.map(v => {
                const tabNotifs = notifs.filter(n => n.link === v.id && !n.read);
                return (
                <button key={v.id} onClick={() => { setActiveView(v.id); localStorage.setItem('crmActiveView', v.id); window.scrollTo(0, 0); }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', border: 'none', cursor: 'pointer',
                  background: activeView === v.id ? C.sidebarActive : 'transparent',
                  borderLeft: activeView === v.id ? `3px solid ${C.sidebarActiveBorder}` : '3px solid transparent',
                  fontFamily: FONT, fontSize: 13, fontWeight: activeView === v.id ? 600 : 400,
                  color: activeView === v.id ? C.sidebarText : C.sidebarMuted, textAlign: 'left',
                  marginBottom: 2,
                }}>
                  <span style={{ fontSize: 15 }}>{v.icon}</span>
                  <span style={{ flex: 1 }}>{v.label}</span>
                  {tabNotifs.length > 0 && (
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                      {tabNotifs.length > 9 ? '9+' : tabNotifs.length}
                    </span>
                  )}
                </button>
              );
              })}
            </div>

            {/* Theme switcher */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.sidebarBorder}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.sidebarMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'look1', label: '1', bg: '#f5f0e8', dot: '#1a1410' },
                  { key: 'look2', label: '2', bg: '#2c2420', dot: '#c8b89a' },
                  { key: 'look3', label: '3', bg: '#1e293b', dot: '#2563eb' },
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
      )}

      <div style={{ marginLeft: isMobile ? 0 : 240, minHeight: 'calc(100vh - 54px)' }}>
        <div style={{ padding: isMobile ? '16px 12px' : '28px 28px' }}>

        {emailFailures.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', borderRadius: 6, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                {emailFailures.length === 1 ? '1 email failed to send' : `${emailFailures.length} emails failed to send`}
              </div>
              {emailFailures.slice(0, 3).map(f => (
                <div key={f.id} style={{ fontFamily: FONT, fontSize: 12, color: '#7f1d1d', marginBottom: 2 }}>
                  {f.fn} — {f.customer} — {f.error}
                </div>
              ))}
            </div>
            <button
              onClick={() => emailFailures.forEach(f => updateDoc(doc(db, 'emailFailures', f.id), { resolved: true }).catch(() => {}))}
              style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 4, padding: '4px 10px', fontFamily: FONT, fontSize: 11, color: '#991b1b', cursor: 'pointer', flexShrink: 0 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {user && !briefShown && (
          <DailyBrief
            bookings={bookings.filter(b => !b.deleted)}
            onDismiss={() => {
              const today = new Date().toISOString().slice(0, 10);
              window._lcwBriefDate = today;
              try { sessionStorage.setItem(BRIEF_SS_KEY, today); } catch {}
              setBriefShown(true);
            }}
            onOpenToday={() => {
              setActiveView('campaigns');
              localStorage.setItem('crmActiveView', 'campaigns');
              setTimeout(() => window.dispatchEvent(new Event('lcw-open-today-tab')), 100);
            }}
          />
        )}

        <Suspense fallback={<div style={{ padding: 40, fontFamily: FONT, fontSize: 13, color: C.muted }}>Loading…</div>}>
          {(() => {
            const deletedContractIds = new Set(bookings.filter(b => b.isContract && b.deleted).map(b => b.id));
            const activeBookings = bookings.filter(b => !b.deleted && !(b.contractId && deletedContractIds.has(b.contractId)));
            return <>
              {activeView === 'actions'   && <ActionsTab savedQuotes={savedQuotes} bookings={activeBookings} isMobile={isMobile} C={C} onNavigate={setActiveView} />}
              {activeView === 'calendar'  && <CalendarTab bookings={activeBookings} isMobile={isMobile} C={C} />}
              {activeView === 'dashboard' && <DashboardTab bookings={activeBookings} staff={staff} isMobile={isMobile} C={C} />}
              {activeView === 'customers' && <CustomersTab bookings={activeBookings} setBookings={setBookings} isMobile={isMobile} C={C} />}
              {activeView === 'staff'     && <StaffTab staff={staff} bookings={activeBookings} setBookings={setBookings} stDistributions={stDistributions} isMobile={isMobile} C={C} />}
              {activeView === 'myJobs'    && <MyJobsTab staff={staff} bookings={activeBookings} setBookings={setBookings} isMobile={isMobile} C={C} />}
              {activeView === 'expenses'  && <ExpensesTab expenses={expenses} fixedCosts={fixedCosts} bookings={activeBookings} staff={staff} supplies={supplies} marketingSpend={marketingSpend} incidents={incidents} isMobile={isMobile} C={C} />}
              {activeView === 'supplies'  && <SuppliesTab supplies={supplies} isMobile={isMobile} C={C} />}
              {activeView === 'sop'       && <SOPTab isMobile={isMobile} C={C} />}
              {activeView === 'reports'   && <ReportsTab bookings={activeBookings} expenses={expenses} staff={staff} fixedCosts={fixedCosts} supplies={supplies} marketingSpend={marketingSpend} incidents={incidents} isMobile={isMobile} C={C} />}
              {activeView === 'bookings'  && <BookingsTab bookings={activeBookings} setBookings={setBookings} staff={staff} isMobile={isMobile} C={C} user={user} schedulerLogs={schedulerLogs} bannerVisible={bannerVisible} welcomeMsg={welcomeMsg} welcomeColor={welcomeColor} />}
              {activeView === 'marketing'       && <MarketingTab abandonmentStats={abandonmentStats} funnelData={funnelData} bookings={activeBookings} isMobile={isMobile} C={C} />}
              {activeView === 'campaigns'      && <CampaignWorkflow funnelData={funnelData} bookings={activeBookings} />}
              {activeView === 'adSpend'        && <MarketingSpendTab isMobile={isMobile} C={C} />}
              {activeView === 'promotions'     && <PromotionsTab isMobile={isMobile} C={C} />}
              {activeView === 'signatureTouch' && <SignatureTouchTab bookings={activeBookings} staff={staff} stDistributions={stDistributions} C={C} />}
              {activeView === 'quotes'         && <QuotesTab isMobile={isMobile} C={C} expenses={expenses} fixedCosts={fixedCosts} marketingSpend={marketingSpend} supplies={supplies} bookings={bookings} savedQuotes={savedQuotes} onNavigate={setActiveView} />}
              {activeView === 'trash'          && <TrashTab bookings={bookings} setBookings={setBookings} isMobile={isMobile} C={C} />}
            </>;
          })()}
        </Suspense>

        </div> {/* end main content column */}
      </div>






    </div>
  );
}
