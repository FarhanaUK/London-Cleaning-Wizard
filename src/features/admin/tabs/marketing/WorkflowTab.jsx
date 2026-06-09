import { useState, useMemo, useEffect, useRef } from 'react';
import { MKT, FONT, SERIF } from './workflow/MktShared';
import { db } from '../../../../firebase/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { readBusinessData, readOutreachPulse, computePrediction, readMarketingCost, getDaysSinceUrgency, getMilestonePacing, MILESTONES, getMilestoneIndex } from './workflow/businessIntelligence';
import WorkflowContent  from './workflow/WorkflowContent';
import BudgetContent    from './workflow/BudgetContent';
import TargetsContent   from './workflow/TargetsContent';
import TrackerContent   from './workflow/TrackerContent';
import AnalyticsContent from './workflow/AnalyticsContent';
import ForecastContent  from './workflow/ForecastContent';
import SOPContent       from './workflow/SOPContent';
import ROIContent       from './workflow/ROIContent';
import TodayContent              from './workflow/TodayContent';
import LCWizardChat              from './workflow/LCWizardChat';
import HistoryContent            from './workflow/HistoryContent';
import WeeklyReviewContent       from './workflow/WeeklyReviewContent';
import FunnelIntelligenceContent from './workflow/FunnelIntelligenceContent';
import OutreachTrackerContent    from './workflow/OutreachTrackerContent';
import ActionPlanContent         from './workflow/ActionPlanContent';

const TABS = [
  { id: 'today',    label: 'Today'           },
  { id: 'funnel',   label: 'Funnel Intel'    },
  { id: 'outreach', label: 'Outreach Tracker'},
  { id: 'plan',     label: 'Action Plan'     },
  { id: 'workflow', label: 'Workflow'        },
  { id: 'budget',   label: 'Budget'          },
  { id: 'targets',  label: 'Targets'         },
  { id: 'tracker',  label: 'Weekly tracker'  },
  { id: 'analytics',label: 'Analytics'       },
  { id: 'roi',      label: 'ROI'             },
  { id: 'history',  label: 'History'         },
  { id: 'forecast', label: 'Booking forecast'},
  { id: 'review',   label: 'Weekly review'   },
  { id: 'sop',      label: 'SOP'             },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function sigCol(urgency) {
  if (urgency === 2) return '#c05b5b';
  if (urgency === 1) return MKT.amber;
  if (urgency === 0) return MKT.green;
  return MKT.dim;
}

// ── MilestoneBar ──────────────────────────────────────────────────────────────

const MILESTONE_COLORS = [
  '#c9a96e', // gold  — 1st booking
  '#f59e0b', // amber — 5 bookings
  '#3b82f6', // blue  — 10 reviews
  '#8b5cf6', // purple — agent referral
  '#10b981', // green — £1k/month
  '#34d399', // light green — £2k/month
  '#6ee7b7', // bright teal — £3k/month
];

function milestoneProgressText(m, data) {
  if (!m) return '';
  const v = m.progressNum(data);
  const id = m.id;
  if (id === 'm1') return v >= 1 ? 'First booking confirmed!' : 'No confirmed bookings yet';
  if (id === 'm2') return `${v} of 5 bookings by Month 2${v < 5 ? ` — ${5 - v} more to go` : '!'}`;
  if (id === 'm3') return `${v} of 3 bookings this month${v < 3 ? ` — ${3 - v} more needed` : ' — target hit!'}`;
  if (id === 'm4') return v ? 'First agent referral done!' : 'First letting agent referral — keep building';
  if (id === 'm5') return `£${v.toLocaleString()} of £1,000 this month`;
  if (id === 'm6') return `£${v.toLocaleString()} of £2,000 this month`;
  if (id === 'm7') return `£${v.toLocaleString()} of £3,000 this month`;
  return '';
}

function MilestoneBar({ bookings }) {
  const isMobile   = useIsMobile();
  const data       = readBusinessData(bookings);
  const mktCost    = readMarketingCost();
  const netProfit  = data.monthlyRevenue - mktCost;
  const midx       = getMilestoneIndex(data);
  const currentIdx = midx + 1;
  const allDone    = midx >= MILESTONES.length - 1;
  const currentM   = MILESTONES[Math.min(currentIdx, MILESTONES.length - 1)];
  const currentCol = MILESTONE_COLORS[Math.min(currentIdx, MILESTONE_COLORS.length - 1)];
  const pacing     = getMilestonePacing(currentM, data);

  const progressPct = !allDone && currentM
    ? Math.min(100, Math.round((currentM.progressNum(data) / currentM.target) * 100))
    : 100;

  return (
    <div style={{ borderBottom: `0.5px solid ${MKT.border}` }}>

      {/* Milestone chips row */}
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', padding: isMobile ? '14px 1rem 10px' : '16px 1.5rem 10px', gap: 0 }}>
        {MILESTONES.map((m, i) => {
          const done    = i <= midx;
          const current = i === currentIdx;
          const col     = MILESTONE_COLORS[i];
          const faded   = !done && !current && i > currentIdx + 1;

          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', opacity: faded ? 0.3 : 1 }}>
              {i > 0 && (
                <div style={{ width: isMobile ? 6 : 12, height: 2, flexShrink: 0, background: i <= midx ? MILESTONE_COLORS[i - 1] : 'rgba(255,255,255,0.07)', borderRadius: 1 }} />
              )}
              <div
                title={`${m.label} — ${m.desc}`}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 4, padding: isMobile ? '6px 8px' : '8px 14px',
                  minWidth: isMobile ? 58 : 82, flexShrink: 0,
                  background: done ? `${col}1a` : current ? `${col}10` : 'rgba(255,255,255,0.02)',
                  border: done
                    ? `1px solid ${col}55`
                    : current
                      ? `2px solid ${col}`
                      : `0.5px solid rgba(255,255,255,0.07)`,
                  borderRadius: 10,
                  boxShadow: current ? `0 0 18px ${col}28, inset 0 0 12px ${col}08` : 'none',
                }}
              >
                {/* NEXT badge */}
                {current && (
                  <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: col, color: '#0d0b08', fontFamily: FONT, fontSize: 7, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                    NEXT GOAL
                  </div>
                )}

                {/* Status mark */}
                <div style={{ fontFamily: FONT, fontSize: isMobile ? 13 : 15, color: done ? col : current ? col : MKT.dim, fontWeight: 700, lineHeight: 1 }}>
                  {done ? '✓' : `${i + 1}`}
                </div>

                {/* Label */}
                <div style={{ fontFamily: FONT, fontSize: isMobile ? 8 : 9, color: done ? col : current ? col : MKT.dim, textAlign: 'center', lineHeight: 1.3, fontWeight: done || current ? 600 : 400, whiteSpace: isMobile ? 'nowrap' : 'normal' }}>
                  {m.shortLabel}
                </div>

                {/* "Done" badge on last completed */}
                {done && i === midx && (
                  <div style={{ fontFamily: FONT, fontSize: 7, color: col, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Done!</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress strip for current milestone */}
      {!allDone && currentM && (
        <div style={{ padding: isMobile ? '0 1rem 8px' : '0 1.5rem 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, color: currentCol, fontWeight: 500 }}>
                {milestoneProgressText(currentM, data)}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, flexShrink: 0, marginLeft: 8 }}>
                {midx + 1} / {MILESTONES.length}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: currentCol, borderRadius: 4, minWidth: progressPct > 0 ? 6 : 0, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${currentCol}60` }} />
            </div>
            {/* Pacing warning */}
            {pacing && pacing.message && (
              <div style={{ fontFamily: FONT, fontSize: 10, color: pacing.status === 'behind' || pacing.status === 'overdue' ? '#c05b5b' : MKT.amber, marginTop: 5, fontWeight: 600 }}>
                {pacing.status === 'overdue' || pacing.status === 'behind' ? '⚠ ' : '! '}{pacing.message}
              </div>
            )}
          </div>
        </div>
      )}

      {allDone && (
        <div style={{ padding: isMobile ? '0 1rem 4px' : '0 1.5rem 4px', fontFamily: FONT, fontSize: 12, color: MILESTONE_COLORS[6], fontWeight: 600 }}>
          All milestones complete. Full-time income achieved.
        </div>
      )}

      {/* Always-visible key metrics strip — bookings + money only */}
      <div style={{ padding: isMobile ? '4px 1rem 12px' : '4px 1.5rem 12px', display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20, flexWrap: 'wrap' }}>
        <Stat label="Bookings this month" value={`${data.monthlyBookings}`} col={data.monthlyBookings >= 3 ? MKT.green : data.monthlyBookings >= 1 ? MKT.amber : MKT.dim} />
        <Stat label="Revenue this month" value={`£${data.monthlyRevenue.toLocaleString()}`} col={MKT.gold} />
        <Stat label="Net profit" value={`£${netProfit.toLocaleString()}`} col={netProfit > 0 ? MKT.green : netProfit < 0 ? '#c05b5b' : MKT.dim} />
      </div>
    </div>
  );
}

function Stat({ label, value, col }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, letterSpacing: '0.04em' }}>{label}:</span>
      <span style={{ fontFamily: FONT, fontSize: 12, color: col, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ── DailyBrief ────────────────────────────────────────────────────────────────

function DailyBrief({ onDismiss, onOpenToday, bookings }) {
  const isMobile = useIsMobile();
  const today     = new Date();
  const dayOfWeek = today.getDay();
  const daysLeft  = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const data  = readBusinessData(bookings);
  const pulse = readOutreachPulse();
  const pred  = computePrediction(data, pulse);

  const checklist    = (() => { try { return JSON.parse(localStorage.getItem('mkt_generated_checklist')) || []; } catch { return []; } })();
  const checked      = (() => { try { return JSON.parse(localStorage.getItem('mkt_weekly_checks')) || []; } catch { return []; } })();
  const priorities   = (() => { try { return (JSON.parse(localStorage.getItem('mkt_priority_actions')) || []).filter(Boolean); } catch { return []; } })();
  const remaining    = checklist.filter(c => !checked.includes(c.id));
  const doneCount    = checklist.length - remaining.length;
  const pct          = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  const monday = (() => { const d = new Date(today); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return d.toISOString().slice(0, 10); })();
  const log            = (() => { try { return JSON.parse(localStorage.getItem('lcw_outreach_log')) || []; } catch { return []; } })();
  const thisWeekLogged = log.some(w => w.weekOf === monday);

  const col         = sigCol(pred.urgency);
  const dayUrgency  = getDaysSinceUrgency(data.daysSinceLast, data.bookingCount);

  // Combined task list: prediction action + checklist items + priority actions
  const tasks = [];
  if (pred.urgency > 0) tasks.push({ id: 'pred', text: pred.text, highlight: pred.urgency === 2 });
  priorities.slice(0, 2).forEach((a, i) => tasks.push({ id: `pri_${i}`, text: a, highlight: false }));
  remaining.slice(0, 4).forEach(item => tasks.push({ id: item.id, text: item.text, highlight: false }));
  const topTasks = tasks.slice(0, 6);

  const boxW = isMobile ? 'min(96vw, 460px)' : '460px';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 9999, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '1rem' }}>
      <div style={{ background: MKT.bg, border: `1px solid ${MKT.borderStrong}`, borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: '1.5rem', width: boxW, maxHeight: isMobile ? '90vh' : '85vh', overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Greeting */}
        <div>
          <div style={{ fontFamily: SERIF, fontSize: isMobile ? 18 : 20, color: MKT.gold }}>{getGreeting()}, Farhana</div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, marginTop: 2 }}>
            {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            {daysLeft > 0 ? ` · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left this week` : ' · Log your week in Outreach Tracker tonight'}
          </div>
        </div>

        {/* Business health strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: dayUrgency.level === 2 ? 'rgba(192,91,91,0.10)' : dayUrgency.level === 1 ? 'rgba(217,119,6,0.08)' : MKT.dark3, border: dayUrgency.level > 0 ? `0.5px solid ${dayUrgency.level === 2 ? '#c05b5b' : MKT.amber}40` : 'none', borderRadius: 8, padding: '0.65rem 0.85rem' }}>
            <div style={{ fontFamily: FONT, fontSize: 9, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Last booking</div>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: data.daysSinceLast === null ? MKT.dim : data.daysSinceLast <= 7 ? MKT.green : data.daysSinceLast <= 14 ? MKT.amber : '#c05b5b', lineHeight: 1 }}>
              {data.daysSinceLast === null ? 'None yet' : data.daysSinceLast === 0 ? 'Today' : `${data.daysSinceLast}d ago`}
            </div>
            {dayUrgency.message && (
              <div style={{ fontFamily: FONT, fontSize: 10, color: dayUrgency.level === 2 ? '#c05b5b' : MKT.amber, marginTop: 4, lineHeight: 1.4, fontWeight: 600 }}>
                {dayUrgency.level === 2 ? '⚠ ' : '! '}{dayUrgency.message}
              </div>
            )}
          </div>
          <div style={{ background: MKT.dark3, borderRadius: 8, padding: '0.65rem 0.85rem' }}>
            <div style={{ fontFamily: FONT, fontSize: 9, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Total bookings</div>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: MKT.gold, lineHeight: 1 }}>{data.bookingCount}</div>
          </div>
        </div>

        {/* Prediction signal */}
        <div style={{ background: `${col}10`, border: `0.5px solid ${col}40`, borderRadius: 8, padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI prediction: {pred.headline}</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>{pred.text}</div>
        </div>

        {/* Checklist progress */}
        {checklist.length > 0 && (
          <div style={{ background: MKT.dark3, borderRadius: 8, padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Weekly checklist</span>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: pct === 100 ? MKT.green : MKT.amber }}>{doneCount} / {checklist.length}</span>
            </div>
            <div style={{ background: MKT.dark4, borderRadius: 3, height: 4 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? MKT.green : MKT.amber, borderRadius: 3, minWidth: doneCount > 0 ? 4 : 0 }} />
            </div>
          </div>
        )}

        {/* Combined task list */}
        {topTasks.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {remaining.length + priorities.length} action{(remaining.length + priorities.length) !== 1 ? 's' : ''} this week
            </div>
            <div style={{ background: MKT.dark3, borderRadius: 8, padding: '0.5rem 0.85rem' }}>
              {topTasks.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < topTasks.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ color: t.highlight ? '#c05b5b' : MKT.gold, flexShrink: 0, fontSize: 11, marginTop: 2 }}>→</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: t.highlight ? '#d9908a' : MKT.muted, lineHeight: 1.5 }}>{t.text}</span>
                </div>
              ))}
            </div>
            {(remaining.length + priorities.length) > topTasks.length && (
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 6, paddingLeft: 4 }}>
                + {(remaining.length + priorities.length) - topTasks.length} more — open the Today tab
              </div>
            )}
          </div>
        )}

        {/* Sunday reminder */}
        {dayOfWeek === 0 && !thisWeekLogged && (
          <div style={{ background: 'rgba(217,119,6,0.07)', border: '0.5px solid rgba(217,119,6,0.3)', borderRadius: 8, padding: '0.65rem 0.85rem' }}>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.amber }}>Log this week in the Outreach Tracker before the numbers fade from memory.</div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
          <button
            onClick={() => { onDismiss(); onOpenToday(); }}
            style={{ flex: 1, background: 'rgba(201,169,110,0.08)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 8, padding: '10px', color: MKT.dim, fontFamily: FONT, fontSize: 12, cursor: 'pointer' }}
          >
            Open Today tab
          </button>
          <button
            onClick={onDismiss}
            style={{ flex: 1, background: 'rgba(201,169,110,0.14)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 8, padding: '10px', color: MKT.gold, fontFamily: FONT, fontSize: 13, cursor: 'pointer' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WorkflowTab ───────────────────────────────────────────────────────────────

export default function WorkflowTab({ funnelData = [], bookings = [] }) {
  const [tab,         setTab]         = useState('today');
  const [editMode,    setEditMode]    = useState(false);
  const [activePromo, setActivePromo] = useState(undefined);
  const [pillTick,    setPillTick]    = useState(0);
  const BRIEF_KEY = 'lcw_brief_dismissed_date';
  const todayStr  = () => new Date().toISOString().slice(0, 10);

  const [showBrief, setShowBrief] = useState(() => {
    try {
      const stored = localStorage.getItem(BRIEF_KEY);
      return !stored || stored !== new Date().toISOString().slice(0, 10);
    } catch { return true; }
  });

  function dismissBrief() {
    try { localStorage.setItem(BRIEF_KEY, todayStr()); } catch {}
    setShowBrief(false);
  }

  // Re-show when the user returns on a new calendar day (tab still open)
  useEffect(() => {
    const check = () => {
      if (!document.hidden) {
        try {
          const stored = localStorage.getItem(BRIEF_KEY);
          if (!stored || stored !== todayStr()) setShowBrief(true);
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

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

  const pills = useMemo(() => {
    let budgetTotal = 0;
    try {
      const rows = JSON.parse(localStorage.getItem('mkt_budget_rows_v2')) || [];
      budgetTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    } catch {}

    const CAMPAIGN_WEEK1_SUN = '2026-05-17';
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

    const offerValue = activePromo === undefined ? '…' : activePromo ? activePromo.name || 'Active' : 'No offer';

    return [
      { label: 'Budget',               value: budgetTotal > 0 ? `£${budgetTotal}/mo` : 'All free' },
      { label: 'Google Ads',           value: 'Paused' },
      { label: `Week ${campaignWeek}`, value: `${weekBookings} booking${weekBookings !== 1 ? 's' : ''}` },
      { label: 'Offer',                value: offerValue },
    ];
  }, [tab, activePromo, pillTick]);

  const isMobile = useIsMobile();

  return (
    <div style={{ background: MKT.bg, minHeight: '100%', color: MKT.text, fontFamily: FONT, fontSize: 14, lineHeight: 1.6 }}>
      {showBrief && (
        <DailyBrief
          onDismiss={dismissBrief}
          onOpenToday={() => setTab('today')}
          bookings={bookings}
        />
      )}

      {/* Header */}
      <div style={{ padding: isMobile ? '1rem 1rem 0.75rem' : '1.5rem 1.5rem 1rem', borderBottom: `0.5px solid ${MKT.border}`, display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontFamily: SERIF, fontSize: isMobile ? 20 : 24, fontWeight: 500, color: MKT.gold }}>Marketing Dashboard</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {!isMobile && pills.map((p, i) => (
            <span key={i} style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: FONT, color: MKT.muted, display: 'inline-block' }}>
              {p.label} <strong style={{ color: p.value === 'No offer' ? MKT.muted : MKT.gold }}>{p.value}</strong>
            </span>
          ))}
          <button
            onClick={() => setEditMode(e => !e)}
            style={{ background: editMode ? 'rgba(37,99,235,0.1)' : 'transparent', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '5px 14px', color: editMode ? MKT.gold : MKT.muted, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}
          >
            {editMode ? 'Done editing' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Milestone bar */}
      <MilestoneBar bookings={bookings} />

      {/* Sub-tabs */}
      <div style={{ display: 'flex', padding: `0 ${isMobile ? '0.75rem' : '1.5rem'}`, borderBottom: `0.5px solid ${MKT.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontFamily: FONT, fontSize: isMobile ? 12 : 13, color: tab === t.id ? MKT.gold : MKT.muted,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: isMobile ? '0.75rem 0.75rem' : '1rem 1.1rem',
            borderBottom: `2px solid ${tab === t.id ? MKT.gold : 'transparent'}`,
            whiteSpace: 'nowrap', transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: isMobile ? '1rem 1rem 3rem' : '1.5rem 1.5rem 3rem', maxWidth: 1100 }}>
        {tab === 'today'    && <TodayContent     bookings={bookings} />}
        {tab === 'funnel'   && <FunnelIntelligenceContent funnelData={funnelData} bookings={bookings} />}
        {tab === 'outreach' && <OutreachTrackerContent />}
        {tab === 'plan'     && <ActionPlanContent funnelData={funnelData} bookings={bookings} />}
        {tab === 'workflow' && <WorkflowContent  editMode={editMode} />}
        {tab === 'budget'   && <BudgetContent    editMode={editMode} />}
        {tab === 'targets'  && <TargetsContent   editMode={editMode} />}
        {tab === 'tracker'  && <TrackerContent   editMode={editMode} />}
        {tab === 'analytics'&& <AnalyticsContent editMode={editMode} />}
        {tab === 'roi'      && <ROIContent />}
        {tab === 'history'  && <HistoryContent />}
        {tab === 'forecast' && <ForecastContent  editMode={editMode} />}
        {tab === 'review'   && <WeeklyReviewContent bookings={bookings} />}
        {tab === 'sop'      && <SOPContent />}
      </div>

      {tab !== 'sop' && <LCWizardChat />}
    </div>
  );
}
