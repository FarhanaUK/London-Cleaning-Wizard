import { useState, useMemo, useEffect } from 'react';

import { MKT, FONT, SERIF } from './workflow/MktShared';
import { db } from '../../../../firebase/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { readBusinessData, readMarketingCost, getDaysSinceUrgency, getMilestonePacing, getMilestoneTargetDate, MILESTONES, getMilestoneIndex } from './workflow/businessIntelligence';
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

function dayUrgencyCol(level) {
  if (level === 3) return '#c05b5b';
  if (level === 2) return MKT.amber;
  if (level === 1) return '#d4a017';
  return MKT.green;
}

function gbp(n) {
  return Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── MilestoneBar ──────────────────────────────────────────────────────────────

const MILESTONE_COLORS = [
  '#c9a96e', // gold -- 1st booking
  '#f59e0b', // amber -- 5 bookings
  '#3b82f6', // blue -- monthly bookings
  '#8b5cf6', // purple -- agent referral
  '#10b981', // green -- £1k/month
  '#34d399', // light green -- £2k/month
  '#6ee7b7', // bright teal -- £3k/month
];

function milestoneProgressText(m, data) {
  if (!m) return '';
  const v = m.progressNum(data);
  const id = m.id;
  if (id === 'm1') return v >= 1 ? 'First booking confirmed!' : 'No confirmed bookings yet';
  if (id === 'm2') return `${v} of 5 bookings by Month 2${v < 5 ? ` -- ${5 - v} more to go` : '!'}`;
  if (id === 'm3') return `${v} of 4 bookings this month${v < 4 ? ` -- ${4 - v} more needed` : ' -- target hit!'}`;
  if (id === 'm4') return v ? 'First letting agent relationship confirmed!' : 'First letting agent referral -- keep visiting';
  if (id === 'm5') return `£${gbp(v)} of £1,000 this month`;
  if (id === 'm6') return `£${gbp(v)} of £2,000 this month`;
  if (id === 'm7') return `£${gbp(v)} of £3,000 this month`;
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
                title={`${m.label} -- ${m.desc}`}
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
                <div style={{ fontFamily: FONT, fontSize: isMobile ? 8 : 9, color: done ? col : current ? col : MKT.dim, textAlign: 'center', lineHeight: 1.3, fontWeight: done || current ? 700 : 400, whiteSpace: isMobile ? 'nowrap' : 'normal' }}>
                  {m.shortLabel}
                </div>

                {/* Equiv */}
                {m.equiv && (
                  <>
                    <div style={{ fontFamily: FONT, fontSize: 6, color: done ? `${col}55` : current ? `${col}55` : 'rgba(255,255,255,0.1)', textAlign: 'center', lineHeight: 1 }}>or</div>
                    <div style={{ fontFamily: FONT, fontSize: isMobile ? 8 : 9, color: done ? `${col}cc` : current ? `${col}cc` : 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.2, fontWeight: done || current ? 600 : 400 }}>
                      {m.equiv}
                    </div>
                  </>
                )}

                {/* Target date */}
                {!done && getMilestoneTargetDate(m) && (
                  <div style={{ fontFamily: FONT, fontSize: 6, color: current ? `${col}66` : 'rgba(255,255,255,0.1)', textAlign: 'center', lineHeight: 1, whiteSpace: 'nowrap' }}>
                    by {getMilestoneTargetDate(m)}
                  </div>
                )}

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
            {/* Pacing -- always show days remaining; escalate colour when behind */}
            {pacing && pacing.status !== 'complete' && (
              <div style={{
                fontFamily: FONT, fontSize: 13, marginTop: 6,
                color: pacing.status === 'behind' || pacing.status === 'overdue' ? '#c05b5b'
                     : pacing.status === 'slow' ? MKT.amber
                     : MKT.gold,
                fontWeight: 600,
              }}>
                {pacing.message
                  ? <>{pacing.status === 'overdue' || pacing.status === 'behind' ? '⚠ ' : '! '}{pacing.message}</>
                  : pacing.daysLeft > 0 ? `${pacing.daysLeft} day${pacing.daysLeft !== 1 ? 's' : ''} to hit ${currentM.shortLabel} -- target by ${getMilestoneTargetDate(currentM)}` : null
                }
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

      {/* Always-visible key metrics strip -- bookings + money only */}
      <div style={{ padding: isMobile ? '4px 1rem 12px' : '4px 1.5rem 12px', display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20, flexWrap: 'wrap' }}>
        <Stat label="Bookings this month" value={`${data.monthlyBookings}`} col={data.monthlyBookings >= 3 ? MKT.green : data.monthlyBookings >= 1 ? MKT.amber : MKT.dim} />
        <Stat label="Revenue this month" value={`£${gbp(data.monthlyRevenue)}`} col={MKT.gold} />
        <Stat label="Net profit" value={`£${gbp(netProfit)}`} col={netProfit > 0 ? MKT.green : netProfit < 0 ? '#c05b5b' : MKT.dim} />
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

// ── WorkflowTab ───────────────────────────────────────────────────────────────

export default function WorkflowTab({ funnelData = [], bookings = [] }) {
  const [tab,         setTab]         = useState('today');
  const [editMode,    setEditMode]    = useState(false);
  const [activePromo, setActivePromo] = useState(undefined);
  const [pillTick,    setPillTick]    = useState(0);

  // Listen for AdminPage's "open Today tab" signal (fired when user clicks the brief button)
  useEffect(() => {
    const handler = () => setTab('today');
    window.addEventListener('lcw-open-today-tab', handler);
    return () => window.removeEventListener('lcw-open-today-tab', handler);
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
