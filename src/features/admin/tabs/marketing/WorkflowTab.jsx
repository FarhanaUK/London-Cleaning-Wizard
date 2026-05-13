import { useState } from 'react';
import { MKT, FONT, SERIF } from './workflow/MktShared';
import WorkflowContent  from './workflow/WorkflowContent';
import BudgetContent    from './workflow/BudgetContent';
import TargetsContent   from './workflow/TargetsContent';
import TrackerContent   from './workflow/TrackerContent';
import AnalyticsContent from './workflow/AnalyticsContent';
import ForecastContent  from './workflow/ForecastContent';

const TABS = [
  { id: 'workflow', label: 'Workflow'        },
  { id: 'budget',   label: 'Budget'          },
  { id: 'targets',  label: 'Targets'         },
  { id: 'tracker',  label: 'Weekly tracker'  },
  { id: 'analytics',label: 'Analytics'       },
  { id: 'forecast', label: 'Booking forecast'},
];

const PILLS = [
  { label: 'Budget', value: '£500/mo shared' },
  { label: 'Campaign', value: 'Live' },
  { label: 'Week 1', value: '1 booking' },
  { label: 'Offer ends', value: '1 Jun' },
];

export default function WorkflowTab() {
  const [tab, setTab] = useState('workflow');

  return (
    <div style={{ background: MKT.bg, minHeight: '100%', color: MKT.text, fontFamily: FONT, fontSize: 14, lineHeight: 1.6 }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: `0.5px solid ${MKT.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: MKT.gold }}>Marketing Dashboard</div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginTop: 2 }}>Farhana + Steven · £500/month shared · Updated May 2026</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PILLS.map(p => (
            <span key={p.label} style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: FONT, color: MKT.muted, display: 'inline-block' }}>
              {p.label} <strong style={{ color: MKT.gold }}>{p.value}</strong>
            </span>
          ))}
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
        {tab === 'workflow'  && <WorkflowContent  />}
        {tab === 'budget'    && <BudgetContent    />}
        {tab === 'targets'   && <TargetsContent   />}
        {tab === 'tracker'   && <TrackerContent   />}
        {tab === 'analytics' && <AnalyticsContent />}
        {tab === 'forecast'  && <ForecastContent  />}
      </div>
    </div>
  );
}
