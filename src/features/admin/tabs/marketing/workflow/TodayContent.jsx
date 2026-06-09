import { useState, useEffect } from 'react';
import { MKT, FONT, SERIF, SLabel } from './MktShared';
import { readBusinessData, readOutreachPulse, computePrediction, MILESTONES, getMilestoneIndex } from './businessIntelligence';

const STORAGE_CHECKS = 'mkt_weekly_checks';

function readAll(bookings) {
  const data     = readBusinessData(bookings);
  const pulse    = readOutreachPulse();
  const pred     = computePrediction(data, pulse);
  const midx     = getMilestoneIndex(data);
  let checklist = [], checked = [], priorities = [];
  try { checklist  = JSON.parse(localStorage.getItem('mkt_generated_checklist')) || []; } catch {}
  try { checked    = JSON.parse(localStorage.getItem(STORAGE_CHECKS)) || []; } catch {}
  try { priorities = (JSON.parse(localStorage.getItem('mkt_priority_actions')) || []).filter(Boolean); } catch {}
  return { data, pulse, pred, midx, checklist, checked, priorities };
}

function SigCol(urgency) {
  if (urgency === 2) return '#c05b5b';
  if (urgency === 1) return MKT.amber;
  if (urgency === 0) return MKT.green;
  return MKT.dim;
}

function DaysBadge({ days }) {
  const col = days === null ? MKT.dim : days <= 7 ? MKT.green : days <= 14 ? MKT.amber : '#c05b5b';
  const label = days === null ? 'No bookings yet' : days === 0 ? 'Today' : `${days}d ago`;
  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 1rem', background: MKT.dark3, borderRadius: 10, flex: '0 0 auto' }}>
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: col, lineHeight: 1 }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last booking</div>
    </div>
  );
}

function MilestoneSteps({ midx }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {MILESTONES.map((m, i) => {
          const done    = i <= midx;
          const current = i === midx + 1;
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', flex: i < MILESTONES.length - 1 ? 1 : '0 0 auto', minWidth: 0 }}>
              <div title={m.desc} style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: done ? MKT.gold : 'transparent',
                border: current ? `2px solid ${MKT.gold}` : done ? 'none' : `1px solid ${MKT.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontFamily: FONT, fontWeight: 700,
                color: done ? MKT.bg : current ? MKT.gold : MKT.dim,
              }}>
                {done ? '✓' : i + 1}
              </div>
              {i < MILESTONES.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < midx ? MKT.gold : MKT.dark4, minWidth: 6 }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim }}>
          {midx >= 0 ? `Milestone ${midx + 1} complete` : 'Not started'}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 10, color: midx >= MILESTONES.length - 1 ? MKT.green : MKT.gold }}>
          {midx >= MILESTONES.length - 1
            ? 'All done'
            : `Next: ${MILESTONES[midx + 1]?.label}`}
        </span>
      </div>
    </div>
  );
}

function PredictionCard({ pred }) {
  const col = SigCol(pred.urgency);
  return (
    <div style={{ background: pred.urgency === 2 ? 'rgba(192,91,91,0.07)' : pred.urgency === 1 ? 'rgba(217,119,6,0.06)' : 'rgba(22,163,74,0.06)', border: `0.5px solid ${col}40`, borderRadius: 10, padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{pred.headline}</span>
      </div>
      <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.65 }}>{pred.text}</div>
    </div>
  );
}

function OutreachPulse({ pulse }) {
  const rows = [
    { label: 'Calls / week', val: Math.round(pulse.callsPerWeek), target: 30, unit: '' },
    { label: 'Facebook posts / week', val: Math.round(pulse.fbPostsPerWeek), target: 2, unit: '' },
    { label: 'Visits / week', val: Math.round(pulse.visitsPerWeek), target: 3, unit: '' },
    { label: 'Emails / week', val: Math.round(pulse.emailsPerWeek), target: 3, unit: '' },
  ];
  if (!pulse.active) {
    return <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, padding: '0.5rem 0' }}>No outreach weeks logged yet. Log your first week in the Outreach Tracker tab.</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
      {rows.map(r => {
        const pct = Math.min(100, Math.round((r.val / r.target) * 100));
        const col = pct >= 100 ? MKT.green : pct >= 60 ? MKT.amber : '#c05b5b';
        return (
          <div key={r.label} style={{ background: MKT.dark3, borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 }}>{r.label}</div>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: col, lineHeight: 1 }}>{r.val}<span style={{ fontSize: 11, color: MKT.dim }}> / {r.target}</span></div>
            <div style={{ background: MKT.dark4, borderRadius: 3, height: 3, marginTop: 6 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChecklistSection({ checklist, checked, onToggle }) {
  const remaining = checklist.filter(c => !checked.includes(c.id));
  const done = checklist.filter(c => checked.includes(c.id));
  const pct = checklist.length > 0 ? Math.round((done.length / checklist.length) * 100) : 0;

  return (
    <div>
      {checklist.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>{done.length} of {checklist.length} done this week</span>
          <span style={{ fontFamily: FONT, fontSize: 11, color: pct === 100 ? MKT.green : MKT.gold }}>{pct}%</span>
        </div>
      )}
      {checklist.length > 0 && (
        <div style={{ background: MKT.dark4, borderRadius: 3, height: 3, marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? MKT.green : MKT.gold, borderRadius: 3 }} />
        </div>
      )}
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
        {checklist.length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim }}>No checklist generated yet — open the Weekly tracker tab to generate your checklist.</div>
        )}
        {remaining.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < remaining.length - 1 ? `0.5px solid rgba(255,255,255,0.04)` : 'none', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={false} onChange={() => onToggle(item.id)} style={{ width: 15, height: 15, flexShrink: 0, accentColor: MKT.gold, cursor: 'pointer', marginTop: 2 }} />
            <span onClick={() => onToggle(item.id)} style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.5, cursor: 'pointer', flex: 1 }}>{item.text}</span>
          </div>
        ))}
        {done.length > 0 && remaining.length > 0 && (
          <div style={{ borderTop: `0.5px solid rgba(255,255,255,0.04)`, marginTop: 4, paddingTop: 8 }}>
            <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{done.length} completed</div>
            {done.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 10, padding: '5px 0', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={true} onChange={() => onToggle(item.id)} style={{ width: 15, height: 15, flexShrink: 0, accentColor: MKT.gold, cursor: 'pointer', marginTop: 2 }} />
                <span onClick={() => onToggle(item.id)} style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, lineHeight: 1.5, textDecoration: 'line-through', cursor: 'pointer', flex: 1 }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TodayContent({ bookings = [] }) {
  const [state, setState] = useState(() => readAll(bookings));

  useEffect(() => { setState(readAll(bookings)); }, [bookings]);

  useEffect(() => {
    const refresh = () => setState(readAll(bookings));
    window.addEventListener('lcw-data-saved', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('lcw-data-saved', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [bookings]);

  function toggleCheck(id) {
    setState(prev => {
      const newChecked = prev.checked.includes(id)
        ? prev.checked.filter(x => x !== id)
        : [...prev.checked, id];
      localStorage.setItem(STORAGE_CHECKS, JSON.stringify(newChecked));
      return { ...prev, checked: newChecked };
    });
  }

  const { data, pulse, pred, midx, checklist, checked, priorities } = state;
  const today = new Date();
  const dayOfWeek = today.getDay();

  return (
    <div>
      {/* Header metrics */}
      <SLabel first>Business health</SLabel>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <DaysBadge days={data.daysSinceLast} />
        <div style={{ flex: 1, minWidth: 200, background: MKT.dark3, borderRadius: 10, padding: '0.75rem 1rem' }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Confirmed bookings</div>
          <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: MKT.gold, lineHeight: 1 }}>{data.bookingCount}</div>
          {data.lastBookingLabel && <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>Last: {data.lastBookingLabel}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 200, background: MKT.dark3, borderRadius: 10, padding: '0.75rem 1rem' }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Revenue last 30 days</div>
          <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: data.monthlyRevenue > 0 ? MKT.gold : MKT.dim, lineHeight: 1 }}>
            £{data.monthlyRevenue.toLocaleString()}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>Target: £1,000/month</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, background: MKT.dark3, borderRadius: 10, padding: '0.75rem 1rem' }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Google reviews</div>
          <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: data.googleReviews >= 10 ? MKT.green : MKT.amber, lineHeight: 1 }}>{data.googleReviews}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>Target: 20+</div>
        </div>
      </div>

      {/* Milestone ladder */}
      <SLabel>Milestone progress</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 4 }}>
        <MilestoneSteps midx={midx} />
        {midx < MILESTONES.length - 1 && (
          <div style={{ marginTop: 12, background: MKT.dark3, borderRadius: 8, padding: '0.75rem 1rem' }}>
            <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Current focus — {MILESTONES[midx + 1]?.timeframe}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted }}>{MILESTONES[midx + 1]?.desc}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>
              Progress: {(() => {
                const m = MILESTONES[midx + 1];
                const n = m.progressNum(data);
                const t = m.target;
                if (t === 1) return n >= 1 ? 'Done' : 'Not yet';
                if (t >= 1000) return `£${n.toLocaleString()} / £${t.toLocaleString()}`;
                return `${n} / ${t}`;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Prediction */}
      <SLabel>AI prediction</SLabel>
      <PredictionCard pred={pred} />

      {/* Outreach pulse */}
      <SLabel style={{ marginTop: 16 }}>Outreach pulse <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(avg last {Math.min(pulse.weeksLogged, 2)} weeks logged)</span></SLabel>
      <OutreachPulse pulse={pulse} />

      {/* Priority actions from analytics tab */}
      {priorities.length > 0 && (
        <>
          <SLabel style={{ marginTop: 16 }}>This week's priority actions</SLabel>
          <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
            {priorities.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: i < priorities.length - 1 ? `0.5px solid rgba(255,255,255,0.04)` : 'none', alignItems: 'flex-start' }}>
                <span style={{ color: MKT.gold, flexShrink: 0, fontSize: 12, marginTop: 2 }}>→</span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.5 }}>{a}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Full checklist */}
      <SLabel style={{ marginTop: 16 }}>Weekly checklist</SLabel>
      <ChecklistSection checklist={checklist} checked={checked} onToggle={toggleCheck} />

      {/* Sunday reminder */}
      {dayOfWeek === 0 && (
        <div style={{ marginTop: 12, background: 'rgba(217,119,6,0.06)', border: '0.5px solid rgba(217,119,6,0.3)', borderRadius: 10, padding: '0.75rem 1.25rem' }}>
          <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.amber }}>
            Log this week in the Outreach Tracker before the numbers fade. The AI reads those logs to predict your next booking.
          </div>
        </div>
      )}
    </div>
  );
}
