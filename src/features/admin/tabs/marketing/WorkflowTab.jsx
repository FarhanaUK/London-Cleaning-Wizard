import { useState, useMemo } from 'react';
import { MKT, FONT, SERIF } from './workflow/MktShared';
import WorkflowContent  from './workflow/WorkflowContent';
import BudgetContent    from './workflow/BudgetContent';
import TargetsContent   from './workflow/TargetsContent';
import TrackerContent   from './workflow/TrackerContent';
import AnalyticsContent from './workflow/AnalyticsContent';
import ForecastContent  from './workflow/ForecastContent';
import SOPContent       from './workflow/SOPContent';

const TABS = [
  { id: 'workflow', label: 'Workflow'        },
  { id: 'budget',   label: 'Budget'          },
  { id: 'targets',  label: 'Targets'         },
  { id: 'tracker',  label: 'Weekly tracker'  },
  { id: 'analytics',label: 'Analytics'       },
  { id: 'forecast', label: 'Booking forecast'},
  { id: 'sop',      label: 'SOP'            },
];

const PILLS = [
  { label: 'Budget', value: '£500/mo shared' },
  { label: 'Campaign', value: 'Live' },
  { label: 'Week 1', value: '1 booking' },
  { label: 'Offer ends', value: '1 Jun' },
];

export default function WorkflowTab() {
  const [tab,      setTab]      = useState('workflow');
  const [editMode, setEditMode] = useState(false);

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

  const barColor = progress.pct >= 100 ? MKT.green : progress.pct >= 60 ? MKT.amber : '#5a9c7a';

  return (
    <div style={{ background: MKT.bg, minHeight: '100%', color: MKT.text, fontFamily: FONT, fontSize: 14, lineHeight: 1.6 }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: `0.5px solid ${MKT.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: MKT.gold }}>Marketing Dashboard</div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginTop: 2 }}>Farhana + Steven · £500/month shared · Updated May 2026</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {PILLS.map(p => (
            <span key={p.label} style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: FONT, color: MKT.muted, display: 'inline-block' }}>
              {p.label} <strong style={{ color: MKT.gold }}>{p.value}</strong>
            </span>
          ))}
          <button
            onClick={() => setEditMode(e => !e)}
            style={{ background: editMode ? 'rgba(201,169,110,0.2)' : 'transparent', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '5px 14px', color: editMode ? MKT.gold : MKT.muted, fontSize: 12, fontFamily: FONT, cursor: 'pointer', transition: 'all 0.2s' }}
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
        {tab === 'forecast'  && <ForecastContent  editMode={editMode} />}
        {tab === 'sop'       && <SOPContent />}
      </div>
    </div>
  );
}
