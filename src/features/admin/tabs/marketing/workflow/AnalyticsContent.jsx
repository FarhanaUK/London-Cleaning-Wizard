import { useState } from 'react';
import { SLabel, MktAlert, AddBtn, DragHandle, useDragSort, MKT, FONT, SERIF, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const DEFAULT_SECTIONS = [
  { id: 's1', title: "Google Ads — Farhana's campaign (LCW Premium Areas)", fields: [
    { id: 'f1', label: 'Impressions',            placeholder: '480',  targetMin: 200, targetMax: 400, targetText: 'Target: 200–400/week', invert: false },
    { id: 'f2', label: 'Clicks',                 placeholder: '18',   targetMin: 15,  targetMax: 30,  targetText: 'Target: 15–30/week',  invert: false },
    { id: 'f3', label: 'CTR %',                  placeholder: '3.7',  targetMin: 3,   targetMax: 7,   targetText: 'Target: 3–7%',        invert: false },
    { id: 'f4', label: 'Avg CPC £',              placeholder: '2.46', targetMin: 0,   targetMax: 2.5, targetText: 'Target: under £2.50', invert: true  },
    { id: 'f5', label: 'Total spend £',          placeholder: '44',   targetMin: 35,  targetMax: 50,  targetText: 'Target: £35–50/week', invert: false },
    { id: 'f6', label: 'Bookings from campaign', placeholder: '1',    targetMin: 1,   targetMax: 999, targetText: 'Target: 1+/week by month 2', invert: false },
    { id: 'f7', label: 'Optimisation score %',   placeholder: '99',   targetMin: 90,  targetMax: 100, targetText: 'Target: 90%+',        invert: false },
  ]},
  { id: 's2', title: "Google Ads — Steven's campaign (LCW Campaign 2)", fields: [
    { id: 'g1', label: 'Impressions',            placeholder: '200', targetMin: 150, targetMax: 350, targetText: 'Target: 150–350/week', invert: false },
    { id: 'g2', label: 'Clicks',                 placeholder: '10',  targetMin: 10,  targetMax: 25,  targetText: 'Target: 10–25/week',  invert: false },
    { id: 'g3', label: 'CTR %',                  placeholder: '3.5', targetMin: 3,   targetMax: 6,   targetText: 'Target: 3–6%',        invert: false },
    { id: 'g4', label: 'Bookings from campaign', placeholder: '0',   targetMin: 1,   targetMax: 999, targetText: 'Target: 1+/week by month 2', invert: false },
  ]},
  { id: 's3', title: 'Instagram', fields: [
    { id: 'h1', label: 'Posts this week',        placeholder: '3',   targetMin: 3,  targetMax: 4,   targetText: 'Target: 3–4/week',           invert: false },
    { id: 'h2', label: 'Total reach',            placeholder: '500', targetMin: 1,  targetMax: 999, targetText: 'Target: growing week on week', invert: false },
    { id: 'h3', label: 'Link clicks to /book',   placeholder: '10',  targetMin: 5,  targetMax: 999, targetText: 'Target: 5+ per week',         invert: false },
    { id: 'h4', label: 'Enquiries',              placeholder: '0',   targetMin: 1,  targetMax: 999, targetText: 'Target: 1+/week by month 2',  invert: false },
  ]},
  { id: 's4', title: 'Facebook', fields: [
    { id: 'i1', label: 'Group posts this week',  placeholder: '4', targetMin: 3, targetMax: 5,   targetText: 'Target: 3–5/week', invert: false },
    { id: 'i2', label: 'Enquiries',              placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Target: 1+/week',  invert: false },
  ]},
  { id: 's5', title: 'Nextdoor', fields: [
    { id: 'j1', label: 'Posts this week', placeholder: '1', targetMin: 1, targetMax: 999, targetText: 'Target: 1/week',  invert: false },
    { id: 'j2', label: 'Enquiries',       placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Target: 1+/week', invert: false },
  ]},
  { id: 's6', title: 'Google Business Profile', fields: [
    { id: 'k1', label: 'Posts this week',        placeholder: '2',  targetMin: 2,  targetMax: 999, targetText: 'Target: 2/week',              invert: false },
    { id: 'k2', label: 'Profile views this week',placeholder: '50', targetMin: 1,  targetMax: 999, targetText: 'Target: growing week on week', invert: false },
    { id: 'k3', label: 'Total Google reviews',   placeholder: '5',  targetMin: 10, targetMax: 999, targetText: 'Target: 10+ by month 3',      invert: false },
  ]},
  { id: 's7', title: 'Overall results', fields: [
    { id: 'l1', label: 'Total bookings this week',    placeholder: '1',   targetMin: 1,   targetMax: 999, targetText: 'Target: 1–2/week by month 2',  invert: false },
    { id: 'l2', label: 'Recurring clients confirmed', placeholder: '0',   targetMin: 1,   targetMax: 999, targetText: 'Target: 1–2 by month 2',       invert: false },
    { id: 'l3', label: 'Total revenue this week £',   placeholder: '165', targetMin: 300, targetMax: 999, targetText: 'Target: £300+/week by month 3', invert: false },
  ]},
];

const WEEK1 = [
  { day: 'Sun 10 May',   data: '85 impressions · 6 clicks · 7.06% CTR · 1 booking', green: false },
  { day: 'Mon 11 May',   data: '136 impressions · 5 clicks · 3.68% CTR', green: false },
  { day: 'Tue 12 May',   data: '156 impressions · 4 clicks · 2.56% CTR', green: false },
  { day: 'Week 1 total', data: '377 impressions · 15 clicks · 3.98% avg CTR · £44 spend · 1 booking', green: true },
  { day: 'Key finding',  data: '"regular cleaner london" 11.36% CTR — best keyword. Weekends convert at 3x weekday rate.', green: false },
];

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

function getThisMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_CHANNELS = [
  { id: 'ch1', label: "Farhana's Google Ads", spend: '', bookings: '' },
  { id: 'ch2', label: "Steven's Google Ads",  spend: '', bookings: '' },
  { id: 'ch3', label: 'LSA',                  spend: '', bookings: '' },
  { id: 'ch4', label: 'Instagram boost',       spend: '', bookings: '' },
  { id: 'ch5', label: 'Facebook boost',        spend: '', bookings: '' },
  { id: 'ch6', label: 'Bark',                  spend: '', bookings: '' },
  { id: 'ch7', label: 'Flyer',                 spend: '', bookings: '' },
];

function cpbColor(cpb) {
  if (cpb < 30)  return MKT.green;
  if (cpb <= 60) return MKT.amber;
  return MKT.red;
}

function investmentRec(label, cpb, bookings, spend, isGrowing) {
  if (bookings === 0) {
    return { type: 'danger', text: `No bookings recorded this month. Pause and reallocate this budget to your lowest cost-per-booking channel.` };
  }
  if (cpb === null || cpb > 60) {
    return { type: 'danger', text: `Cost per booking is £${cpb ? cpb.toFixed(0) : '?'} — too high to scale. Pause and reallocate this budget to your lowest cost-per-booking channel.` };
  }
  if (cpb < 30 && isGrowing) {
    const newBudget = Math.round(spend + 50);
    const extra     = Math.round((bookings / spend) * 50);
    const newTotal  = bookings + extra;
    return {
      type: 'good',
      text: `Scale — ${label} is generating bookings at £${cpb.toFixed(0)} each. Increasing budget from £${Math.round(spend)} to £${newBudget}/month should generate ${extra} additional booking${extra !== 1 ? 's' : ''} per month based on your current conversion rate. New monthly target from ${label}: ${newTotal} booking${newTotal !== 1 ? 's' : ''}.`,
    };
  }
  if (cpb < 30) {
    return { type: 'good', text: `Hold and watch — excellent cost per booking at £${cpb.toFixed(0)}. Bookings are not yet growing week on week. Once they are, increase budget by £50/month.` };
  }
  return { type: 'warn', text: `Hold — keep current budget at £${Math.round(spend)}/month. Cost per booking is £${cpb.toFixed(0)}. Review again in 2 weeks.` };
}

const INPUT_BASE = { background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '5px 10px', color: MKT.text, fontSize: 13, fontFamily: FONT, width: 90, outline: 'none' };
const TH = { fontFamily: FONT, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim };
const TD = { fontFamily: FONT, fontSize: 12, color: MKT.muted };
const GRID = '42px 100px 78px 65px 52px 95px 58px 65px 65px';

function BookingChart({ history }) {
  if (!history.length) return null;

  const W = 560, H = 150;
  const PAD = { top: 12, right: 16, bottom: 32, left: 34 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const n = history.length;
  const bkgs = history.map(h => parseFloat(h.bookings) || 0);
  const maxB = Math.max(...bkgs, 4);

  const px = i => PAD.left + (n < 2 ? cW / 2 : (i / (n - 1)) * cW);
  const py = b => PAD.top + cH * (1 - b / maxB);

  const linePoints = bkgs.map((b, i) => `${px(i)},${py(b)}`).join(' ');
  const areaPoints = [`${px(0)},${PAD.top + cH}`, ...bkgs.map((b, i) => `${px(i)},${py(b)}`), `${px(n - 1)},${PAD.top + cH}`].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 0.5, 1].map(f => {
        const y = PAD.top + cH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={PAD.left - 5} y={y + 4} fontSize={9} fill={MKT.dim} textAnchor="end" fontFamily={FONT}>{Math.round(f * maxB)}</text>
          </g>
        );
      })}
      <polygon points={areaPoints} fill="rgba(127,176,105,0.1)" />
      {n > 1 && <polyline points={linePoints} fill="none" stroke={MKT.green} strokeWidth={2} strokeLinejoin="round" />}
      {history.map((h, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(parseFloat(h.bookings) || 0)} r={3.5} fill={MKT.green} />
          <text x={px(i)} y={H - 6} fontSize={8} fill={MKT.dim} textAnchor="middle" fontFamily={FONT}>
            {h.date ? h.date.slice(5).replace('-', '/') : `W${i + 1}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function AnalyticsContent({ editMode }) {
  const [sections, setSections] = usePersisted('mkt_analytics_sections', DEFAULT_SECTIONS);
  const [history,  setHistory]  = usePersisted('mkt_weekly_history', []);
  const [actions,  setActions]  = usePersisted('mkt_priority_actions', ['', '', '']);
  const [channels, setChannels] = usePersisted('mkt_investment_channels', DEFAULT_CHANNELS);
  const allIds = sections.flatMap(s => s.fields.map(f => f.id));
  const [values,   setValues]   = useState(() => Object.fromEntries(allIds.map(id => [id, ''])));
  const [weekDate, setWeekDate] = useState(getThisMonday);
  const [checked,  setChecked]  = useState(false);
  const { dragHandlers: secDrag, isOver: secOver } = useDragSort(sections, setSections);

  function setValue(id, v) { setValues(p => ({ ...p, [id]: v })); setChecked(false); }
  function updateSection(sId, ch) { setSections(ss => ss.map(s => s.id === sId ? { ...s, ...ch } : s)); }
  function updateField(sId, fId, ch) { setSections(ss => ss.map(s => s.id === sId ? { ...s, fields: s.fields.map(f => f.id === fId ? { ...f, ...ch } : f) } : s)); }
  function deleteField(sId, fId) { setSections(ss => ss.map(s => s.id === sId ? { ...s, fields: s.fields.filter(f => f.id !== fId) } : s)); }
  function addField(sId) { setSections(ss => ss.map(s => s.id === sId ? { ...s, fields: [...s.fields, { id: genId(), label: 'New metric', placeholder: '0', targetMin: 0, targetMax: 999, targetText: 'Target: —', invert: false }] } : s)); }

  function checkAndSave() {
    setChecked(true);
    const date = weekDate || getThisMonday();
    const snap = {
      date,
      bookings:    values['l1'] || '',
      impressions: values['f1'] || '',
      ctr:         values['f3'] || '',
      spend:       values['f5'] || '',
      reviews:     values['k3'] || '',
    };
    setHistory(h => {
      const idx = h.findIndex(w => w.date === date);
      if (idx >= 0) {
        // Merge — only overwrite a field if the new value is non-empty
        const prev = h[idx];
        const merged = {
          date,
          bookings:    snap.bookings    || prev.bookings,
          impressions: snap.impressions || prev.impressions,
          ctr:         snap.ctr         || prev.ctr,
          spend:       snap.spend       || prev.spend,
          reviews:     snap.reviews     || prev.reviews,
        };
        const updated = [...h];
        updated[idx] = merged;
        return updated;
      }
      return [...h, snap];
    });
  }

  // Enrich history with week number, target, hit/miss
  const chronological = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const enriched = chronological.map((w, i) => {
    const weekNum = i + 1;
    const bkgs    = parseFloat(w.bookings);
    const target  = weeklyTarget(weekNum);
    const hasData = w.bookings !== '';
    const hit     = hasData && bkgs >= target;
    return { ...w, weekNum, target, hasData, hit };
  });

  const weeksOnTarget = enriched.filter(w => w.hit).length;
  const weeksMissed   = enriched.filter(w => w.hasData && !w.hit).length;
  let streak = 0;
  for (const w of [...enriched].reverse()) {
    if (!w.hasData) continue;
    if (w.hit) streak++; else break;
  }

  const isGrowing = (() => {
    if (chronological.length < 4) return false;
    const recent = chronological.slice(-2).reduce((s, w) => s + (parseFloat(w.bookings) || 0), 0);
    const prior  = chronological.slice(-4, -2).reduce((s, w) => s + (parseFloat(w.bookings) || 0), 0);
    return recent > prior;
  })();
  const hasEnoughData = history.length >= 4;

  const tableHistory = [...enriched].reverse(); // newest first
  const allFields    = sections.flatMap(s => s.fields);
  const offCount     = checked ? allFields.filter(f => values[f.id] !== '' && dotColor(values[f.id], f) === MKT.red).length : 0;
  const onCount      = checked ? allFields.filter(f => values[f.id] !== '' && dotColor(values[f.id], f) === MKT.green).length : 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <MktAlert type="info">If numbers are not hitting targets: copy all data from this tab and share it with Claude — "Here is my weekly marketing data, please review every channel and tell me exactly what to do to improve."</MktAlert>
      </div>

      {/* Metric inputs */}
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 10px', borderBottom: `0.5px solid ${MKT.border}`, marginBottom: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text }}>Week commencing</span>
          <input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} style={{ ...INPUT_BASE, width: 140 }} />
        </div>

        {sections.map((section, si) => (
          <div key={section.id} {...secDrag(si)} style={{ marginBottom: '1.25rem', outline: secOver(si) ? `1px dashed rgba(201,169,110,0.4)` : 'none', borderRadius: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `0.5px solid ${MKT.border}` }}>
              <DragHandle />
              {editMode ? (
                <>
                  <input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })} style={{ ...EDIT_INPUT, flex: 1, fontSize: 12, fontWeight: 500 }} />
                  <button onClick={() => setSections(ss => ss.filter(s => s.id !== section.id))} style={DEL_BTN}>×</button>
                </>
              ) : (
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: MKT.muted }}>{section.title}</div>
              )}
            </div>
            {section.fields.map(field => {
              const v = values[field.id] ?? '';
              const dot = checked || v !== '' ? dotColor(v, field) : MKT.dark4;
              return (
                <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                  {editMode ? (
                    <>
                      <input value={field.label} onChange={e => updateField(section.id, field.id, { label: e.target.value })} style={{ ...EDIT_INPUT, width: 175, flexShrink: 0 }} />
                      <input value={field.targetText} onChange={e => updateField(section.id, field.id, { targetText: e.target.value })} style={{ ...EDIT_INPUT, flex: 1, fontSize: 11 }} />
                      <button onClick={() => deleteField(section.id, field.id)} style={DEL_BTN}>×</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, width: 175, flexShrink: 0 }}>{field.label}</span>
                      <input type="number" placeholder={field.placeholder} value={v} onChange={e => setValue(field.id, e.target.value)} style={INPUT_BASE} />
                      <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, flex: 1, minWidth: 100 }}>{field.targetText}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, border: `0.5px solid ${MKT.borderStrong}`, transition: 'background 0.3s' }} />
                    </>
                  )}
                </div>
              );
            })}
            {editMode && <AddBtn onClick={() => addField(section.id)} label="Add metric" />}
          </div>
        ))}

        {editMode && (
          <AddBtn onClick={() => setSections(ss => [...ss, { id: genId(), title: 'New section', fields: [{ id: genId(), label: 'New metric', placeholder: '0', targetMin: 0, targetMax: 999, targetText: 'Target: —', invert: false }] }])} label="Add section" />
        )}

        {!editMode && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={checkAndSave} style={{ background: 'rgba(201,169,110,0.15)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 16px', color: MKT.gold, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>
              Check all performance
            </button>
            {checked && <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted }}>{onCount} on target · {offCount} need attention · week saved</span>}
          </div>
        )}
      </div>

      {/* Priority actions */}
      <SLabel>This week's priority actions</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
        <p style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 14, lineHeight: 1.6 }}>
          Based on this week's numbers — what are you committing to change? Write 1–3 actions. Check next Monday whether they moved the numbers.
        </p>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.gold, fontWeight: 500, flexShrink: 0, width: 16 }}>{i + 1}.</span>
            <input
              value={actions[i]}
              onChange={e => setActions(a => { const n = [...a]; n[i] = e.target.value; return n; })}
              placeholder={[
                'e.g. Pause the worst-performing keyword and reallocate £10/day to LSA',
                'e.g. Post before/after reel — it outperformed static posts last week',
                'e.g. Reply to Bark.com within 15 min this week — response time was slow',
              ][i]}
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid rgba(201,169,110,0.25)`, color: MKT.text, fontFamily: FONT, fontSize: 13, outline: 'none', padding: '4px 0' }}
            />
          </div>
        ))}
      </div>

      {/* Scorecard + history + chart — only once data exists */}
      {history.length > 0 && (
        <>
          {/* Running scorecard */}
          <SLabel>Running scorecard</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Weeks on target', value: weeksOnTarget, color: MKT.green },
              { label: 'Weeks missed',    value: weeksMissed,   color: weeksMissed > 0 ? MKT.red : MKT.muted },
              { label: 'Current streak',  value: `${streak} week${streak !== 1 ? 's' : ''}`, color: streak >= 2 ? MKT.green : streak === 1 ? MKT.amber : MKT.muted },
            ].map(m => (
              <div key={m.label} style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 6 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* History table */}
          <SLabel>Weekly history</SLabel>
          <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14, overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, paddingBottom: 8, borderBottom: `0.5px solid ${MKT.borderStrong}`, marginBottom: 2, minWidth: 600 }}>
              {['Wk', 'Date', 'Bookings', 'Target', 'Status', 'Impressions', 'CTR %', 'Spend', 'Reviews'].map(h => (
                <span key={h} style={TH}>{h}</span>
              ))}
            </div>
            {tableHistory.map((w, i) => (
              <div key={w.date} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, padding: '8px 0', borderBottom: i < tableHistory.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', minWidth: 600, alignItems: 'center' }}>
                <span style={{ ...TD, color: MKT.dim }}>W{w.weekNum}</span>
                <span style={{ ...TD, color: MKT.gold }}>{w.date}</span>
                <span style={{ ...TD, color: MKT.text, fontWeight: 500 }}>{w.bookings || '—'}</span>
                <span style={{ ...TD }}>{w.target}+</span>
                <span style={{ fontFamily: FONT, fontSize: 12, color: !w.hasData ? MKT.dim : w.hit ? MKT.green : MKT.red }}>
                  {!w.hasData ? '—' : w.hit ? 'Hit' : 'Miss'}
                </span>
                <span style={TD}>{w.impressions || '—'}</span>
                <span style={TD}>{w.ctr ? `${w.ctr}%` : '—'}</span>
                <span style={TD}>{w.spend ? `£${w.spend}` : '—'}</span>
                <span style={TD}>{w.reviews || '—'}</span>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          <SLabel>Booking trend</SLabel>
          <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
            <BookingChart history={enriched} />
          </div>
        </>
      )}

      {/* Investment decisions */}
      <SLabel>Investment decisions — cost per booking</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14, overflowX: 'auto' }}>
        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 12, lineHeight: 1.6 }}>
          Enter total spend and bookings per channel this month. Cost per booking calculates automatically. Under £30 is green · £30–£60 amber · over £60 red.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 130px', gap: 8, paddingBottom: 8, borderBottom: `0.5px solid ${MKT.borderStrong}`, marginBottom: 4, minWidth: 420 }}>
          {['Channel', 'Spend £/mo', 'Bookings', 'Cost per booking'].map(h => (
            <span key={h} style={TH}>{h}</span>
          ))}
        </div>
        {channels.map(ch => {
          const s = parseFloat(ch.spend);
          const b = parseFloat(ch.bookings);
          const hasS = ch.spend !== '' && !isNaN(s);
          const hasB = ch.bookings !== '' && !isNaN(b);
          const cpb = (hasS && hasB && b > 0) ? s / b : null;
          const zeroBookings = hasB && b === 0;
          const cpbText = cpb !== null ? `£${cpb.toFixed(0)}` : '—';
          const cpbCol  = cpb !== null ? cpbColor(cpb) : (zeroBookings ? MKT.red : MKT.dim);
          return (
            <div key={ch.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 130px', gap: 8, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center', minWidth: 420 }}>
              {editMode ? (
                <>
                  <input value={ch.label} onChange={e => setChannels(cs => cs.map(c => c.id === ch.id ? { ...c, label: e.target.value } : c))} style={{ ...EDIT_INPUT, fontSize: 13 }} />
                  <span /><span />
                  <button onClick={() => setChannels(cs => cs.filter(c => c.id !== ch.id))} style={DEL_BTN}>×</button>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted }}>{ch.label}</span>
                  <input type="number" min="0" placeholder="0" value={ch.spend} onChange={e => setChannels(cs => cs.map(c => c.id === ch.id ? { ...c, spend: e.target.value } : c))} style={{ ...INPUT_BASE, width: 80 }} />
                  <input type="number" min="0" placeholder="0" value={ch.bookings} onChange={e => setChannels(cs => cs.map(c => c.id === ch.id ? { ...c, bookings: e.target.value } : c))} style={{ ...INPUT_BASE, width: 70 }} />
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: cpbCol }}>{cpbText}</span>
                </>
              )}
            </div>
          );
        })}
        {editMode && <AddBtn onClick={() => setChannels(cs => [...cs, { id: genId(), label: 'New channel', spend: '', bookings: '' }])} label="Add channel" />}
      </div>

      <SLabel>Investment recommendations</SLabel>
      {hasEnoughData ? (
        <div style={{ marginBottom: 14 }}>
          {channels.map(ch => {
            if (ch.spend === '' && ch.bookings === '') return null;
            const s   = parseFloat(ch.spend) || 0;
            const b   = parseFloat(ch.bookings) || 0;
            const cpb = (b > 0 && s > 0) ? s / b : null;
            const rec = investmentRec(ch.label, cpb, b, s, isGrowing);
            return (
              <div key={ch.id} style={{ marginBottom: 8 }}>
                <MktAlert type={rec.type}>
                  <span style={{ fontWeight: 500 }}>{ch.label} —</span> {rec.text}
                </MktAlert>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <MktAlert type="info">
            Investment recommendations unlock after 4 weeks of data. Keep recording your weekly numbers.
            {history.length > 0 && <span style={{ color: MKT.dim }}> ({history.length} of 4 weeks recorded.)</span>}
          </MktAlert>
        </div>
      )}

      {/* Week 1 reference */}
      <SLabel>Week 1 actual data — for reference</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        {WEEK1.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: i < WEEK1.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, width: 90, flexShrink: 0 }}>{row.day}</span>
            <span style={{ fontFamily: FONT, fontSize: 12, color: row.green ? MKT.green : MKT.muted, fontWeight: row.green ? 500 : 300 }}>{row.data}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
