import { useState, useMemo, useEffect } from 'react';
import { MKT, FONT, SERIF } from './workflow/MktShared';
import { db } from '../../../../firebase/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import WorkflowContent  from './workflow/WorkflowContent';
import BudgetContent    from './workflow/BudgetContent';
import TargetsContent   from './workflow/TargetsContent';
import TrackerContent   from './workflow/TrackerContent';
import AnalyticsContent from './workflow/AnalyticsContent';
import ForecastContent  from './workflow/ForecastContent';
import SOPContent       from './workflow/SOPContent';
import ROIContent       from './workflow/ROIContent';
import LCWizardChat        from './workflow/LCWizardChat';
import HistoryContent      from './workflow/HistoryContent';
import WeeklyReviewContent from './workflow/WeeklyReviewContent';

const TABS = [
  { id: 'workflow', label: 'Workflow'        },
  { id: 'budget',   label: 'Budget'          },
  { id: 'targets',  label: 'Targets'         },
  { id: 'tracker',  label: 'Weekly tracker'  },
  { id: 'analytics',label: 'Analytics'       },
  { id: 'roi',      label: 'ROI'             },
  { id: 'history',  label: 'History'         },
  { id: 'forecast', label: 'Booking forecast'},
  { id: 'review',   label: 'Weekly review'  },
  { id: 'sop',      label: 'SOP'            },
];

function readNotifications() {
  try { return JSON.parse(localStorage.getItem('mkt_notifications')) || []; } catch { return []; }
}

export default function WorkflowTab() {
  const [tab,          setTab]          = useState('workflow');
  const [editMode,     setEditMode]     = useState(false);
  const [activePromo,  setActivePromo]  = useState(undefined);
  const [pillTick,     setPillTick]     = useState(0);
  const [notifs,       setNotifs]       = useState(readNotifications);
  const [bellOpen,     setBellOpen]     = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'promotions'), where('active', '==', true));
    return onSnapshot(q, snap => setActivePromo(snap.docs[0]?.data() || null));
  }, []);

  useEffect(() => {
    const bump = () => setPillTick(n => n + 1);
    window.addEventListener('lcw-data-saved', bump);
    const id = setInterval(bump, 4000);
    return () => { window.removeEventListener('lcw-data-saved', bump); clearInterval(id); };
  }, []);

  useEffect(() => {
    const refresh = () => setNotifs(readNotifications());
    window.addEventListener('mkt-notification-added', refresh);
    return () => window.removeEventListener('mkt-notification-added', refresh);
  }, []);

  function markAllRead() {
    const updated = notifs.map(n => ({ ...n, read: true }));
    setNotifs(updated);
    localStorage.setItem('mkt_notifications', JSON.stringify(updated));
  }

  function clearNotif(id) {
    const updated = notifs.filter(n => n.id !== id);
    setNotifs(updated);
    localStorage.setItem('mkt_notifications', JSON.stringify(updated));
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  const progress = useMemo(() => {
    try {
      const history = JSON.parse(localStorage.getItem('mkt_weekly_history')) || [];
      const sorted  = [...history].sort((a, b) => b.date.localeCompare(a.date));
      const last4   = sorted.slice(0, 4);
      const total   = last4.reduce((s, w) => s + (parseFloat(w.bookings) || 0), 0);
      const pct     = Math.min(100, Math.round((total / 30) * 100));
      const weeks   = last4.length;
      return { total, pct, weeks };
    } catch { return { total: 0, pct: 0, weeks: 0 }; }
  }, [tab]); // recalculates whenever you switch tabs

  const barColor = progress.pct >= 100 ? MKT.green : progress.pct >= 60 ? MKT.amber : MKT.blue;

  const pills = useMemo(() => {
    // Budget — sum of paid channel rows
    let budgetTotal = 0;
    try {
      const rows = JSON.parse(localStorage.getItem('mkt_budget_rows')) || [];
      budgetTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    } catch {}

    // Campaign week number + bookings for current week
    // Campaign launched Sun 10 May 2026 · data entered each Sunday for previous week
    // W1 (10–16 May) entered Sun 17 May · W2 (17–23 May) entered Sun 24 May
    const CAMPAIGN_WEEK1_SUN = '2026-05-17'; // First Sunday of data entry = Week 1
    let campaignWeek = 1, weekBookings = 0;
    try {
      const history  = JSON.parse(localStorage.getItem('mkt_weekly_history')) || [];
      const now      = new Date();
      const sun      = new Date(now); sun.setDate(now.getDate() - now.getDay());
      const weekDate = sun.toISOString().slice(0, 10);
      const startMs  = new Date(CAMPAIGN_WEEK1_SUN).getTime();
      const todayMs  = new Date(weekDate).getTime();
      const elapsed  = Math.floor((todayMs - startMs) / (7 * 24 * 60 * 60 * 1000));
      campaignWeek   = Math.max(1, elapsed + 1);
      const thisWeek = history.find(w => w.date === weekDate);
      weekBookings   = thisWeek ? (parseFloat(thisWeek.bookings) || 0) : 0;
    } catch {}

    // Offer — from Firestore live listener
    const offerValue = activePromo === undefined
      ? '…'
      : activePromo
        ? activePromo.name || 'Active'
        : 'No offer';

    return [
      { label: 'Budget',                value: budgetTotal > 0 ? `£${budgetTotal}/mo shared` : '—' },
      { label: 'Campaign',              value: 'Live' },
      { label: `Week ${campaignWeek}`,  value: `${weekBookings} booking${weekBookings !== 1 ? 's' : ''}` },
      { label: 'Offer',                 value: offerValue },
    ];
  }, [tab, activePromo, pillTick]);

  return (
    <div style={{ background: MKT.bg, minHeight: '100%', color: MKT.text, fontFamily: FONT, fontSize: 14, lineHeight: 1.6 }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: `0.5px solid ${MKT.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', position: 'relative' }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: MKT.gold }}>Marketing Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {pills.map((p, i) => (
            <span key={i} style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: FONT, color: MKT.muted, display: 'inline-block' }}>
              {p.label} <strong style={{ color: p.value === 'No offer' ? MKT.muted : MKT.gold }}>{p.value}</strong>
            </span>
          ))}

          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setBellOpen(o => !o); if (unreadCount > 0) markAllRead(); }}
              style={{ background: bellOpen ? 'rgba(37,99,235,0.1)' : 'transparent', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '5px 10px', color: unreadCount > 0 ? MKT.gold : MKT.muted, fontSize: 14, fontFamily: FONT, cursor: 'pointer', position: 'relative' }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 1, right: 1, width: 16, height: 16, borderRadius: '50%', background: MKT.red, color: '#fff', fontSize: 9, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unreadCount}</span>
              )}
            </button>

            {bellOpen && (
              <div style={{ position: 'absolute', top: '110%', right: 0, width: 340, background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `0.5px solid ${MKT.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: MKT.text }}>Notifications</span>
                  {notifs.length > 0 && <button onClick={() => { setNotifs([]); localStorage.removeItem('mkt_notifications'); }} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: 10, color: MKT.dim, cursor: 'pointer' }}>Clear all</button>}
                </div>
                {notifs.length === 0 ? (
                  <div style={{ padding: '20px 14px', fontFamily: FONT, fontSize: 12, color: MKT.dim, textAlign: 'center' }}>No notifications yet</div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifs.map(n => (
                      <div key={n.id} style={{ padding: '10px 14px', borderBottom: `0.5px solid ${MKT.border}`, display: 'flex', gap: 10, alignItems: 'flex-start', background: n.read ? 'transparent' : 'rgba(37,99,235,0.04)' }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>🎯</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.text, lineHeight: 1.5 }}>{n.message}</div>
                          <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginTop: 3 }}>{new Date(n.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <button onClick={() => clearNotif(n.id)} style={{ background: 'none', border: 'none', color: MKT.dim, fontSize: 14, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setEditMode(e => !e)}
            style={{ background: editMode ? 'rgba(37,99,235,0.1)' : 'transparent', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '5px 14px', color: editMode ? MKT.gold : MKT.muted, fontSize: 12, fontFamily: FONT, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {editMode ? 'Done editing' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 1.5rem 12px', borderBottom: `0.5px solid ${MKT.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted }}>
            Progress toward booking a day
            {progress.weeks > 0 && <span style={{ color: MKT.dim }}> — last {progress.weeks} week{progress.weeks > 1 ? 's' : ''}</span>}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11, color: progress.pct >= 100 ? MKT.green : MKT.gold, fontWeight: 500 }}>
            {progress.pct >= 100
              ? 'Booking a day achieved this month'
              : progress.weeks === 0
                ? 'Save your first week in the Analytics tab'
                : `${progress.pct}% toward booking a day · ${progress.total} of 30 bookings`}
          </span>
        </div>
        <div style={{ background: MKT.dark3, borderRadius: 4, height: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress.pct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`, borderRadius: 4, transition: 'width 0.5s ease', minWidth: progress.total > 0 ? 4 : 0 }} />
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', padding: '0 1.5rem', borderBottom: `0.5px solid ${MKT.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontFamily: FONT, fontSize: 13, color: tab === t.id ? MKT.gold : MKT.muted,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '1rem 1.1rem',
            borderBottom: `2px solid ${tab === t.id ? MKT.gold : 'transparent'}`,
            whiteSpace: 'nowrap', transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem 1.5rem 3rem', maxWidth: 1100 }}>
        {tab === 'workflow'  && <WorkflowContent  editMode={editMode} />}
        {tab === 'budget'    && <BudgetContent    editMode={editMode} />}
        {tab === 'targets'   && <TargetsContent   editMode={editMode} />}
        {tab === 'tracker'   && <TrackerContent   editMode={editMode} />}
        {tab === 'analytics' && <AnalyticsContent editMode={editMode} />}
        {tab === 'roi'       && <ROIContent />}
        {tab === 'history'   && <HistoryContent />}
        {tab === 'forecast'  && <ForecastContent  editMode={editMode} />}
        {tab === 'review'    && <WeeklyReviewContent />}
        {tab === 'sop'       && <SOPContent />}
      </div>

      {/* LC Wizard chat — visible on all tabs except SOP */}
      {tab !== 'sop' && <LCWizardChat />}
    </div>
  );
}
