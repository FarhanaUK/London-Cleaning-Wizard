import { useState } from 'react';
import { MKT, FONT, SERIF, SLabel, usePersisted } from './MktShared';
import { DEFAULT_SECTIONS } from './AnalyticsContent';

function dotColor(value, field) {
  if (value === '' || value === null) return MKT.dark4;
  const v = parseFloat(value);
  if (isNaN(v)) return MKT.dark4;
  if (field.invert) return v <= field.targetMax ? MKT.green : v <= field.targetMax * 1.3 ? MKT.amber : MKT.red;
  if (v >= field.targetMin) return MKT.green;
  if (v >= field.targetMin * 0.7) return MKT.amber;
  return MKT.red;
}

function weeklyTarget(n) {
  if (n <= 4)  return 1;
  if (n <= 8)  return 2;
  if (n <= 12) return 3;
  if (n <= 16) return 4;
  if (n <= 20) return 5;
  return 6;
}

// Campaign weeks run Sun–Sat · Week 1 starts Sun 17 May 2026
const CAMPAIGN_WEEK1_SUN = '2026-05-17';

function trueWeekNum(dateStr) {
  const ms = new Date(dateStr).getTime() - new Date(CAMPAIGN_WEEK1_SUN).getTime();
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
}

function TrendChart({ enriched }) {
  if (enriched.length < 2) return null;
  const W = 560, H = 100;
  const PAD = { top: 10, right: 16, bottom: 26, left: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const bkgs = enriched.map(h => parseFloat(h.bookings) || 0);
  const maxB = Math.max(...bkgs, 4);
  const n = enriched.length;
  const px = i => PAD.left + (n < 2 ? cW / 2 : (i / (n - 1)) * cW);
  const py = b => PAD.top + cH * (1 - b / maxB);
  const linePoints = bkgs.map((b, i) => `${px(i)},${py(b)}`).join(' ');
  const areaPoints = [
    `${px(0)},${PAD.top + cH}`,
    ...bkgs.map((b, i) => `${px(i)},${py(b)}`),
    `${px(n - 1)},${PAD.top + cH}`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 0.5, 1].map(f => {
        const y = PAD.top + cH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={MKT.border} strokeWidth={1} />
            <text x={PAD.left - 5} y={y + 4} fontSize={8} fill={MKT.dim} textAnchor="end" fontFamily={FONT}>{Math.round(f * maxB)}</text>
          </g>
        );
      })}
      <polygon points={areaPoints} fill="rgba(22,163,74,0.08)" />
      {n > 1 && <polyline points={linePoints} fill="none" stroke={MKT.green} strokeWidth={2} strokeLinejoin="round" />}
      {enriched.map((h, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(parseFloat(h.bookings) || 0)} r={3.5} fill={h.hit ? MKT.green : h.hasData ? MKT.red : MKT.dim} />
          <text x={px(i)} y={H - 4} fontSize={7} fill={MKT.dim} textAnchor="middle" fontFamily={FONT}>W{h.weekNum}</text>
        </g>
      ))}
    </svg>
  );
}

export default function HistoryContent() {
  const [sections] = usePersisted('mkt_analytics_sections', DEFAULT_SECTIONS);
  const [history]  = usePersisted('mkt_weekly_history', []);
  const [allOpen,  setAllOpen]  = useState(true);
  const [openSet,  setOpenSet]  = useState(new Set());

  const chronological = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const enriched = chronological.map((w) => {
    const weekNum = trueWeekNum(w.date);
    const target  = weeklyTarget(weekNum);
    const bkgs    = parseFloat(w.bookings);
    return {
      ...w,
      weekNum,
      target,
      hasData: w.bookings !== '',
      hit:     w.bookings !== '' && bkgs >= target,
    };
  });
  const sorted = [...enriched].reverse();

  const weeksHit      = enriched.filter(w => w.hit).length;
  const weeksMissed   = enriched.filter(w => w.hasData && !w.hit).length;
  const totalBookings = enriched.reduce((s, w) => s + (parseFloat(w.bookings) || 0), 0);
  const avgBookings   = enriched.length > 0 ? (totalBookings / enriched.length).toFixed(1) : '—';

  function toggle(date) {
    setOpenSet(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }
  function isOpen(date) { return allOpen ? !openSet.has(date) : openSet.has(date); }
  function toggleAll()  { setAllOpen(v => !v); setOpenSet(new Set()); }

  if (!history.length) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 14, color: MKT.muted, lineHeight: 1.8 }}>
          No weekly history yet. Go to the Analytics tab, fill in your numbers, and click "Save week &amp; check performance".
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Weeks recorded',  value: enriched.length,  color: MKT.gold  },
          { label: 'Total bookings',  value: totalBookings,    color: MKT.gold  },
          { label: 'Avg / week',      value: avgBookings,      color: MKT.muted },
          { label: 'Weeks on target', value: `${weeksHit} / ${enriched.filter(w => w.hasData).length}`, color: weeksHit > weeksMissed ? MKT.green : MKT.amber },
        ].map(m => (
          <div key={m.label} style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 6 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {enriched.length >= 2 && (
        <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 6 }}>Bookings per week — green dot = hit target, red = missed</div>
          <TrendChart enriched={enriched} />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim }}>
          {enriched.length} week{enriched.length !== 1 ? 's' : ''} — newest first
        </span>
        <button
          onClick={toggleAll}
          style={{ background: 'transparent', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '4px 12px', color: MKT.muted, fontFamily: FONT, fontSize: 12, cursor: 'pointer' }}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {/* Week cards */}
      {sorted.map(w => {
        const open     = isOpen(w.date);
        const hitColor = !w.hasData ? MKT.border : w.hit ? MKT.green : MKT.red;
        const hitLabel = !w.hasData ? '—' : w.hit ? `Hit (${w.bookings})` : `Missed (${w.bookings || 0})`;

        return (
          <div
            key={w.date}
            style={{ marginBottom: 8, border: `0.5px solid ${MKT.border}`, borderLeft: `3px solid ${hitColor}`, borderRadius: 8, background: MKT.card, overflow: 'hidden' }}
          >
            {/* Header row */}
            <div
              onClick={() => toggle(w.date)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, flexShrink: 0, width: 28 }}>W{w.weekNum}</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.blue, flexShrink: 0 }}>{w.date}</span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                {w.bookings || '0'} booking{w.bookings !== '1' ? 's' : ''} &nbsp;
                <span style={{ color: MKT.dim }}>target: {w.target}+</span>
              </span>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: hitColor, marginLeft: 'auto', flexShrink: 0 }}>
                {hitLabel}
              </span>
              <span style={{ color: MKT.dim, fontSize: 12, flexShrink: 0, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </div>

            {/* Expanded body */}
            {open && (
              <div style={{ borderTop: `0.5px solid ${MKT.border}`, padding: '14px 14px 12px', background: MKT.dark3 }}>
                {w.all && sections.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {sections.map(s => {
                      const fields = s.fields.filter(f => w.all[f.id] !== undefined && w.all[f.id] !== '');
                      if (!fields.length) return null;
                      return (
                        <div key={s.id}>
                          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.dim, marginBottom: 8, paddingBottom: 4, borderBottom: `0.5px solid ${MKT.border}` }}>
                            {s.title}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '7px 16px' }}>
                            {fields.map(f => (
                              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor(w.all[f.id], f), flexShrink: 0, border: `0.5px solid ${MKT.borderStrong}` }} />
                                <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, flexShrink: 0 }}>{f.label}:</span>
                                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: MKT.text }}>{w.all[f.id]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 8 }}>
                      {[
                        { label: 'Bookings',    val: w.bookings    },
                        { label: 'Impressions', val: w.impressions },
                        { label: 'CTR %',       val: w.ctr         },
                        { label: 'Spend £',     val: w.spend       },
                        { label: 'Reviews',     val: w.reviews     },
                      ].filter(f => f.val).map(f => (
                        <span key={f.label} style={{ fontFamily: FONT, fontSize: 12 }}>
                          <span style={{ color: MKT.dim }}>{f.label}: </span>
                          <span style={{ color: MKT.text, fontWeight: 500 }}>{f.val}</span>
                        </span>
                      ))}
                    </div>
                    <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, fontStyle: 'italic' }}>
                      Re-save this week in Analytics to capture all channel data going forward.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
