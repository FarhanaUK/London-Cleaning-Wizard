import { useState, useEffect } from 'react';
import { MKT, FONT, SERIF } from './MktShared';
import { readBusinessData, readOutreachPulse, computePrediction, getDaysSinceUrgency } from './businessIntelligence';

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

function dayUrgencyCol(level) {
  if (level === 3) return '#c05b5b';
  if (level === 2) return MKT.amber;
  if (level === 1) return '#d4a017';
  return MKT.green;
}

export default function DailyBrief({ onDismiss, onOpenToday, bookings }) {
  const isMobile  = useIsMobile();
  const today     = new Date();
  const dayOfWeek = today.getDay();
  const daysLeft  = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const data  = readBusinessData(bookings);
  const pulse = readOutreachPulse();
  const pred  = computePrediction(data, pulse);

  const checklist  = (() => { try { return JSON.parse(localStorage.getItem('mkt_generated_checklist')) || []; } catch { return []; } })();
  const checked    = (() => { try { return JSON.parse(localStorage.getItem('mkt_weekly_checks')) || []; } catch { return []; } })();
  const priorities = (() => { try { return (JSON.parse(localStorage.getItem('mkt_priority_actions')) || []).filter(Boolean); } catch { return []; } })();
  const remaining  = checklist.filter(c => !checked.includes(c.id));
  const doneCount  = checklist.length - remaining.length;
  const pct        = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  const monday         = (() => { const d = new Date(today); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return d.toISOString().slice(0, 10); })();
  const log            = (() => { try { return JSON.parse(localStorage.getItem('lcw_outreach_log')) || []; } catch { return []; } })();
  const thisWeekLogged = log.some(w => w.weekOf === monday);

  const col        = sigCol(pred.urgency);
  const dayUrgency = getDaysSinceUrgency(data.daysSinceLast, data.bookingCount);

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
          <div style={{ background: dayUrgency.level >= 3 ? 'rgba(192,91,91,0.10)' : dayUrgency.level === 2 ? 'rgba(217,119,6,0.08)' : dayUrgency.level === 1 ? 'rgba(212,160,23,0.06)' : 'rgba(16,185,129,0.06)', border: `0.5px solid ${dayUrgencyCol(dayUrgency.level)}30`, borderRadius: 8, padding: '0.65rem 0.85rem' }}>
            <div style={{ fontFamily: FONT, fontSize: 9, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Last booking</div>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: dayUrgencyCol(dayUrgency.level), lineHeight: 1 }}>
              {data.daysSinceLast === null ? 'None yet' : data.daysSinceLast === 0 ? 'Today' : `${data.daysSinceLast}d ago`}
            </div>
            {dayUrgency.message && (
              <div style={{ fontFamily: FONT, fontSize: 10, color: dayUrgencyCol(dayUrgency.level), marginTop: 4, lineHeight: 1.5, fontWeight: dayUrgency.level >= 2 ? 600 : 400 }}>
                {dayUrgency.level >= 3 ? '⚠ ' : dayUrgency.level === 0 ? '' : '! '}{dayUrgency.message}
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
                + {(remaining.length + priorities.length) - topTasks.length} more -- open the Marketing Workflow tab
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
            Open Marketing Workflow
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
