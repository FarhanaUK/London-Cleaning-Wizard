import { useState, useEffect } from 'react';
import { SLabel, MktAlert, AddBtn, DragHandle, useDragSort, MKT, FONT, SERIF, EDIT_INPUT, DEL_BTN, genId, usePersisted, checkScaleNotifications } from './MktShared';
import AIBrain from './AIBrain';

export const DEFAULT_SECTIONS = [
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
    { id: 'g1', label: 'Impressions',            placeholder: '200',  targetMin: 150, targetMax: 350, targetText: 'Target: 150–350/week', invert: false },
    { id: 'g2', label: 'Clicks',                 placeholder: '10',   targetMin: 10,  targetMax: 25,  targetText: 'Target: 10–25/week',  invert: false },
    { id: 'g3', label: 'CTR %',                  placeholder: '3.5',  targetMin: 3,   targetMax: 6,   targetText: 'Target: 3–6%',        invert: false },
    { id: 'g5', label: 'Avg CPC £',              placeholder: '2.50', targetMin: 0,   targetMax: 2.5, targetText: 'Target: under £2.50', invert: true  },
    { id: 'g6', label: 'Total spend £',          placeholder: '35',   targetMin: 35,  targetMax: 50,  targetText: 'Target: £35–50/week', invert: false },
    { id: 'g4', label: 'Bookings from campaign', placeholder: '0',    targetMin: 1,   targetMax: 999, targetText: 'Target: 1+/week by month 2', invert: false },
    { id: 'g7', label: 'Optimisation score %',   placeholder: '95',   targetMin: 90,  targetMax: 100, targetText: 'Target: 90%+',        invert: false },
  ]},
  { id: 's_lsa', title: 'Local Services Ads (LSA)', fields: [
    { id: 'lsa1', label: 'Leads received',      placeholder: '5',  targetMin: 3,  targetMax: 999, targetText: 'Target: 3+/week',              invert: false },
    { id: 'lsa2', label: 'Leads responded to',  placeholder: '5',  targetMin: 1,  targetMax: 999, targetText: 'Respond to every lead <1 hour', invert: false },
    { id: 'lsa3', label: 'Bookings from LSA',   placeholder: '1',  targetMin: 1,  targetMax: 999, targetText: 'Target: 1+/week',              invert: false },
    { id: 'lsa4', label: 'Cost per lead £',     placeholder: '20', targetMin: 0,  targetMax: 30,  targetText: 'Target: under £30/lead',       invert: true  },
    { id: 'lsa5', label: 'Total spend £',       placeholder: '25', targetMin: 20, targetMax: 30,  targetText: 'Target: £20–30/week',          invert: false },
  ]},
  { id: 's3', title: 'Instagram', fields: [
    { id: 'h1', label: 'Posts this week',        placeholder: '3',    targetMin: 3,  targetMax: 4,   targetText: 'Target: 3–4/week',           invert: false },
    { id: 'h5', label: 'Impressions',            placeholder: '1200', targetMin: 500,targetMax: 999, targetText: 'Target: growing week on week', invert: false },
    { id: 'h2', label: 'Reach (unique accounts)',placeholder: '500',  targetMin: 1,  targetMax: 999, targetText: 'Target: growing week on week', invert: false },
    { id: 'h3', label: 'Link clicks to /book',   placeholder: '10',   targetMin: 5,  targetMax: 999, targetText: 'Target: 5+ per week',         invert: false },
    { id: 'h4', label: 'Enquiries received',      placeholder: '0',    targetMin: 1,  targetMax: 999, targetText: 'Target: 1+ enquiry/week',     invert: false },
    { id: 'h6', label: 'Confirmed bookings',      placeholder: '0',    targetMin: 1,  targetMax: 999, targetText: 'Only count paid/confirmed jobs', invert: false },
  ]},
  { id: 's4', title: 'Facebook', fields: [
    { id: 'i1', label: 'Group posts this week',  placeholder: '4', targetMin: 3, targetMax: 5,   targetText: 'Target: 3–5/week',          invert: false },
    { id: 'i2', label: 'Enquiries received',     placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Target: 1+ enquiry/week',    invert: false },
    { id: 'i3', label: 'Confirmed bookings',     placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Only count paid/confirmed jobs', invert: false },
  ]},
  { id: 's5', title: 'Nextdoor', fields: [
    { id: 'j1', label: 'Posts this week',    placeholder: '1', targetMin: 1, targetMax: 999, targetText: 'Target: 1/week',                invert: false },
    { id: 'j2', label: 'Enquiries received', placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Target: 1+ enquiry/week',       invert: false },
    { id: 'j3', label: 'Confirmed bookings', placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Only count paid/confirmed jobs', invert: false },
  ]},
  { id: 's6', title: 'Google Business Profile', fields: [
    { id: 'k1', label: 'Posts this week',        placeholder: '2',  targetMin: 2,  targetMax: 999, targetText: 'Target: 2/week',              invert: false },
    { id: 'k2', label: 'Profile views this week',placeholder: '50', targetMin: 1,  targetMax: 999, targetText: 'Target: growing week on week', invert: false },
    { id: 'k3', label: 'Total Google reviews',   placeholder: '5',  targetMin: 10, targetMax: 999, targetText: 'Target: 10+ by month 3',      invert: false },
  ]},
  { id: 's8', title: 'Bark.com', fields: [
    { id: 'bk1', label: 'Leads responded to',    placeholder: '3',  targetMin: 3,  targetMax: 999, targetText: 'Target: respond to every lead',  invert: false },
    { id: 'bk2', label: 'Bookings from Bark',    placeholder: '0',  targetMin: 1,  targetMax: 999, targetText: 'Target: 1+/week',               invert: false },
  ]},
  { id: 's7', title: 'Overall results', fields: [
    { id: 'l1', label: 'Total bookings this week',    placeholder: '1',   targetMin: 1,   targetMax: 999, targetText: 'auto-calculated from all channels above', invert: false },
    { id: 'l2', label: 'Recurring clients confirmed', placeholder: '0',   targetMin: 1,   targetMax: 999, targetText: 'Target: 1–2 by month 2',       invert: false },
    { id: 'l3', label: 'Total revenue this week £',   placeholder: '165', targetMin: 300, targetMax: 999, targetText: 'Target: £300+/week by month 3', invert: false },
  ]},
];

// IDs of confirmed booking fields only — enquiries/leads are excluded
const BOOKING_IDS = ['f6', 'g4', 'lsa3', 'h6', 'i3', 'j3', 'bk2'];
const BOOKING_LABELS = { f6: "Farhana's Ads", g4: "Steven's Ads", lsa3: 'LSA', h6: 'Instagram', i3: 'Facebook', j3: 'Nextdoor', bk2: 'Bark' };

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

// Campaign launched Sun 10 May 2026 · weeks run Sun–Sat · data entered each Sunday for previous week
// W1 covers 10–16 May, entered on Sun 17 May · W2 covers 17–23 May, entered on Sun 24 May
const CAMPAIGN_WEEK1_SUN = '2026-05-17'; // First Sunday of data entry = Week 1

function getThisWeekSunday() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d.toISOString().slice(0, 10);
}

function trueWeekNum(dateStr) {
  const ms = new Date(dateStr).getTime() - new Date(CAMPAIGN_WEEK1_SUN).getTime();
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
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
const GRID      = '30px 165px 80px 65px 65px 24px'; // bookings summary table
const HIST_GRID = '30px 165px 90px 60px 65px 68px 75px'; // per-campaign tables

function formatDateRange(dateStr) {
  const sun = new Date(dateStr);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(sun)} – ${fmt(sat)}`;
}

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
  const [history,  setHistory]  = usePersisted('mkt_weekly_history', [],  () => window.dispatchEvent(new Event('lcw-data-saved')));
  const [actions,  setActions]  = usePersisted('mkt_priority_actions', ['', '', '']);
  const [channels,           setChannels]           = usePersisted('mkt_investment_channels', DEFAULT_CHANNELS);
  const [investmentHistory,  setInvestmentHistory]  = usePersisted('mkt_investment_history',  []);
  const allIds = sections.flatMap(s => s.fields.map(f => f.id));
  const [values, setValues] = useState(() => {
    const empty = Object.fromEntries(allIds.map(id => [id, '']));
    try {
      const saved = JSON.parse(localStorage.getItem('mkt_analytics_current'));
      // Only restore if saved data is from THIS week (Sun–Sat) — never carry old weeks forward
      if (saved && typeof saved === 'object' && saved._weekDate === getThisWeekSunday()) {
        return { ...empty, ...saved };
      }
    } catch {}
    return empty;
  });
  const [weekDate,      setWeekDate]      = useState(getThisWeekSunday);
  const [checked,       setChecked]       = useState(false);
  const [expandedWeek,  setExpandedWeek]  = useState(null);
  const { dragHandlers: secDrag, isOver: secOver } = useDragSort(sections, setSections);

  // One-time migration: add missing fields/sections for users with old persisted data
  useEffect(() => {
    setSections(prev => {
      let changed = false;
      let next = prev.map(s => {
        const ids = new Set(s.fields.map(f => f.id));
        const add = [];
        if (s.id === 's2') {
          if (!ids.has('g5')) add.push({ id: 'g5', label: 'Avg CPC £',           placeholder: '2.50', targetMin: 0,  targetMax: 2.5,  targetText: 'Target: under £2.50', invert: true  });
          if (!ids.has('g6')) add.push({ id: 'g6', label: 'Total spend £',        placeholder: '35',   targetMin: 35, targetMax: 50,   targetText: 'Target: £35–50/week', invert: false });
          if (!ids.has('g7')) add.push({ id: 'g7', label: 'Optimisation score %', placeholder: '95',   targetMin: 90, targetMax: 100,  targetText: 'Target: 90%+',        invert: false });
        }
        if (s.id === 's3') {
          if (!ids.has('h5')) add.push({ id: 'h5', label: 'Impressions', placeholder: '1200', targetMin: 500, targetMax: 999, targetText: 'Target: growing week on week', invert: false });
          if (!ids.has('h6')) add.push({ id: 'h6', label: 'Confirmed bookings', placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Only count paid/confirmed jobs', invert: false });
          changed = true;
          return { ...s, fields: s.fields.map(f => f.id === 'h4' ? { ...f, label: 'Enquiries received', targetText: 'Target: 1+ enquiry/week' } : f).concat(add) };
        }
        // Facebook: rename old 'Bookings' (i2) to 'Enquiries received', add 'Confirmed bookings' (i3)
        if (s.id === 's4') {
          if (!ids.has('i3')) add.push({ id: 'i3', label: 'Confirmed bookings', placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Only count paid/confirmed jobs', invert: false });
          changed = true;
          return { ...s, fields: s.fields.map(f => f.id === 'i2' ? { ...f, label: 'Enquiries received', targetText: 'Target: 1+ enquiry/week' } : f).concat(add) };
        }
        // Nextdoor: rename old 'Bookings' (j2) to 'Enquiries received', add 'Confirmed bookings' (j3)
        if (s.id === 's5') {
          if (!ids.has('j3')) add.push({ id: 'j3', label: 'Confirmed bookings', placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Only count paid/confirmed jobs', invert: false });
          changed = true;
          return { ...s, fields: s.fields.map(f => f.id === 'j2' ? { ...f, label: 'Enquiries received', targetText: 'Target: 1+ enquiry/week' } : f).concat(add) };
        }
        if (add.length) { changed = true; return { ...s, fields: [...s.fields, ...add] }; }
        return s;
      });
      // Add LSA section if missing (insert after Steven's campaign)
      if (!next.find(s => s.id === 's_lsa')) {
        changed = true;
        const idx = next.findIndex(s => s.id === 's2');
        const lsa = { id: 's_lsa', title: 'Local Services Ads (LSA)', fields: [
          { id: 'lsa1', label: 'Leads received',     placeholder: '5',  targetMin: 3,  targetMax: 999, targetText: 'Target: 3+/week',              invert: false },
          { id: 'lsa2', label: 'Leads responded to', placeholder: '5',  targetMin: 1,  targetMax: 999, targetText: 'Respond to every lead <1 hour', invert: false },
          { id: 'lsa3', label: 'Bookings from LSA',  placeholder: '1',  targetMin: 1,  targetMax: 999, targetText: 'Target: 1+/week',              invert: false },
          { id: 'lsa4', label: 'Cost per lead £',    placeholder: '20', targetMin: 0,  targetMax: 30,  targetText: 'Target: under £30/lead',        invert: true  },
          { id: 'lsa5', label: 'Total spend £',      placeholder: '25', targetMin: 20, targetMax: 30,  targetText: 'Target: £20–30/week',           invert: false },
        ]};
        next = [...next.slice(0, idx + 1), lsa, ...next.slice(idx + 1)];
      }
      // Add Bark section if missing (insert before Overall results)
      if (!next.find(s => s.id === 's8')) {
        changed = true;
        const idx = next.findIndex(s => s.id === 's7');
        const bark = { id: 's8', title: 'Bark.com', fields: [
          { id: 'bk1', label: 'Leads responded to', placeholder: '3', targetMin: 3, targetMax: 999, targetText: 'Target: respond to every lead', invert: false },
          { id: 'bk2', label: 'Bookings from Bark', placeholder: '0', targetMin: 1, targetMax: 999, targetText: 'Target: 1+/week',              invert: false },
        ]};
        next = [...next.slice(0, idx), bark, ...next.slice(idx)];
      }
      return changed ? next : prev;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('mkt_analytics_current', JSON.stringify({ ...values, _weekDate: weekDate }));
  }, [values, weekDate]);

  const [investmentSaved, setInvestmentSaved] = useState(false);

  function saveInvestmentSnapshot() {
    const month = new Date().toISOString().slice(0, 7);
    setInvestmentHistory(prev => {
      const idx = prev.findIndex(e => e.month === month);
      const entry = { month, channels };
      if (idx >= 0) { const next = [...prev]; next[idx] = entry; return next; }
      return [...prev, entry];
    });
    setInvestmentSaved(true);
    setTimeout(() => setInvestmentSaved(false), 3000);
  }

  function setValue(id, v) {
    if (v !== '' && parseFloat(v) < 0) return;
    setValues(p => {
      const next = { ...p, [id]: v };
      if (BOOKING_IDS.includes(id)) {
        const total = BOOKING_IDS.reduce((s, bid) => s + (parseFloat(next[bid]) || 0), 0);
        next['l1'] = total > 0 ? String(total) : '';
      }
      return next;
    });
    setChecked(false);
  }
  function updateSection(sId, ch) { setSections(ss => ss.map(s => s.id === sId ? { ...s, ...ch } : s)); }
  function updateField(sId, fId, ch) { setSections(ss => ss.map(s => s.id === sId ? { ...s, fields: s.fields.map(f => f.id === fId ? { ...f, ...ch } : f) } : s)); }
  function deleteField(sId, fId) { setSections(ss => ss.map(s => s.id === sId ? { ...s, fields: s.fields.filter(f => f.id !== fId) } : s)); }
  function addField(sId) { setSections(ss => ss.map(s => s.id === sId ? { ...s, fields: [...s.fields, { id: genId(), label: 'New metric', placeholder: '0', targetMin: 0, targetMax: 999, targetText: 'Target: —', invert: false }] } : s)); }

  function deleteWeek(date) {
    setHistory(h => h.filter(w => w.date !== date));
  }

  function clearAll() {
    const empty = Object.fromEntries(allIds.map(id => [id, '']));
    setValues(empty);
    setChecked(false);
    localStorage.removeItem('mkt_analytics_current');
  }

  function clearChannels() {
    setChannels(cs => cs.map(c => ({ ...c, spend: '', bookings: '' })));
  }

  function checkAndSave() {
    setChecked(true);
    const date = weekDate || getThisWeekSunday();
    const all = Object.fromEntries(
      Object.entries(values).filter(([k, v]) => v !== '' && v !== undefined && k !== '_weekDate')
    );
    const snap = {
      date,
      bookings:    values['l1'] || '',
      impressions: values['f1'] || '',
      ctr:         values['f3'] || '',
      spend:       values['f5'] || '',
      reviews:     values['k3'] || '',
      all,
    };
    setHistory(h => {
      const idx = h.findIndex(w => w.date === date);
      let newHistory;
      if (idx >= 0) {
        const prev = h[idx];
        const merged = {
          date,
          bookings:    snap.bookings    || prev.bookings,
          impressions: snap.impressions || prev.impressions,
          ctr:         snap.ctr         || prev.ctr,
          spend:       snap.spend       || prev.spend,
          reviews:     snap.reviews     || prev.reviews,
          all:         { ...(prev.all || {}), ...snap.all },
        };
        newHistory = [...h];
        newHistory[idx] = merged;
      } else {
        newHistory = [...h, snap];
      }
      // Write directly so pill reads fresh data immediately
      localStorage.setItem('mkt_weekly_history', JSON.stringify(newHistory));
      window.dispatchEvent(new Event('lcw-data-saved'));
      checkScaleNotifications(all);
      return newHistory;
    });
  }

  // Enrich history with week number, target, hit/miss
  const chronological = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const enriched = chronological.map((w) => {
    const weekNum = trueWeekNum(w.date);
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
          <div>
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text }}>Week commencing (Sunday)</span>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 1 }}>Enter each Sunday for the previous week · W1 (10–16 May) entered 17 May · W2 entered 24 May</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} style={{ ...INPUT_BASE, width: 140 }} />
            <button onClick={clearAll} style={{ background: 'transparent', border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '5px 12px', color: MKT.muted, fontSize: 12, fontFamily: FONT, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Clear all
            </button>
          </div>
        </div>

        {sections.map((section, si) => (
          <div key={section.id || si} {...secDrag(si)} style={{ marginBottom: '1.25rem', outline: secOver(si) ? `1px dashed rgba(201,169,110,0.4)` : 'none', borderRadius: 4 }}>
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
            {section.fields.map((field, fi) => {
              const v = values[field.id] ?? '';
              const dot = checked || v !== '' ? dotColor(v, field) : MKT.dark4;
              const breakdown = field.id === 'l1'
                ? BOOKING_IDS.filter(id => parseFloat(values[id]) > 0).map(id => `${BOOKING_LABELS[id]}: ${values[id]}`).join(' · ')
                : '';
              const isBooking = BOOKING_IDS.includes(field.id) || field.id === 'l1';
              return (
                <div key={field.id || fi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', background: isBooking ? MKT.dark4 : 'transparent', borderRadius: isBooking ? 6 : 0, marginBottom: isBooking ? 2 : 0 }}>
                  {editMode ? (
                    <>
                      <input value={field.label} onChange={e => updateField(section.id, field.id, { label: e.target.value })} style={{ ...EDIT_INPUT, width: 175, flexShrink: 0 }} />
                      <input value={field.targetText} onChange={e => updateField(section.id, field.id, { targetText: e.target.value })} style={{ ...EDIT_INPUT, flex: 1, fontSize: 11 }} />
                      <button onClick={() => deleteField(section.id, field.id)} style={DEL_BTN}>×</button>
                    </>
                  ) : field.id === 'l1' ? (
                    <>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.text, fontWeight: 500, width: 175, flexShrink: 0 }}>{field.label}</span>
                      <span style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: v ? MKT.blue : MKT.dim, minWidth: 50 }}>{v || '0'}</span>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, flex: 1, minWidth: 100, fontStyle: 'italic' }}>{breakdown || 'enter bookings per channel above'}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, border: `0.5px solid ${MKT.borderStrong}`, transition: 'background 0.3s' }} />
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
              Save week &amp; check performance
            </button>
            {checked && <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted }}>{onCount} on target · {offCount} need attention · saved</span>}
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

          {/* Per-campaign history tables */}
          <SLabel>Google Ads campaign history</SLabel>
          <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14, overflowX: 'auto' }}>

            {[
              { label: "Farhana's campaign — LCW Premium Areas Residential", ids: { impr: 'f1', clicks: 'f2', ctr: 'f3', spend: 'f5', bookings: 'f6' } },
              { label: "Steven's campaign — LCW General Residential",         ids: { impr: 'g1', clicks: 'g2', ctr: 'g3', spend: 'g6', bookings: 'g4' } },
            ].map((campaign, ci) => (
              <div key={ci}>
                {ci > 0 && <div style={{ height: '0.5px', background: MKT.border, margin: '16px 0' }} />}
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: MKT.text, marginBottom: 8 }}>{campaign.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: HIST_GRID, gap: 6, paddingBottom: 6, borderBottom: `0.5px solid ${MKT.borderStrong}`, marginBottom: 0, minWidth: 560 }}>
                  {['Wk', 'Date range', 'Impressions', 'Clicks', 'CTR %', 'Spend', 'Bookings'].map(h => (
                    <span key={h} style={TH}>{h}</span>
                  ))}
                </div>
                <div style={{ maxHeight: 132, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                {tableHistory.map(w => {
                  const ids = campaign.ids;
                  return (
                    <div key={w.date} style={{ display: 'grid', gridTemplateColumns: HIST_GRID, gap: 6, padding: '7px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)', minWidth: 560, alignItems: 'center' }}>
                      <span style={{ ...TD, color: MKT.dim }}>W{w.weekNum}</span>
                      <span style={{ ...TD, color: MKT.blue }}>{w.date ? formatDateRange(w.date) : '—'}</span>
                      <span style={TD}>{w.all?.[ids.impr]    || '—'}</span>
                      <span style={TD}>{w.all?.[ids.clicks]  || '—'}</span>
                      <span style={TD}>{w.all?.[ids.ctr]     ? `${w.all[ids.ctr]}%` : '—'}</span>
                      <span style={TD}>{w.all?.[ids.spend]   ? `£${w.all[ids.spend]}` : '—'}</span>
                      <span style={TD}>{w.all?.[ids.bookings] || '—'}</span>
                    </div>
                  );
                })}
                </div>
              </div>
            ))}
          </div>

          {/* Bookings summary table — click to expand all channel data */}
          <SLabel>Weekly bookings summary — click any row to see full data</SLabel>
          <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14, overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, paddingBottom: 8, borderBottom: `0.5px solid ${MKT.borderStrong}`, marginBottom: 0, minWidth: 430 }}>
              {['Wk', 'Date range', 'Bookings', 'Target', 'Status', ''].map((h, hi) => (
                <span key={hi} style={TH}>{h}</span>
              ))}
            </div>
            <div style={{ maxHeight: 148, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {tableHistory.map((w, i) => {
              const isOpen = expandedWeek === w.date;
              const statusColor = !w.hasData ? MKT.dim : w.hit ? MKT.green : MKT.red;
              return (
                <div key={w.date} style={{ borderBottom: i < tableHistory.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
                  <div
                    onClick={() => setExpandedWeek(isOpen ? null : w.date)}
                    style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, padding: '9px 0', minWidth: 430, alignItems: 'center', cursor: 'pointer' }}
                  >
                    <span style={{ ...TD, color: MKT.dim }}>W{w.weekNum}</span>
                    <span style={{ ...TD, color: MKT.blue, fontWeight: 500 }}>{w.date ? formatDateRange(w.date) : '—'}</span>
                    <span style={{ ...TD, color: MKT.text, fontWeight: 500 }}>{w.bookings || '—'}</span>
                    <span style={TD}>{w.target}+</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: statusColor }}>
                      {!w.hasData ? '—' : w.hit ? 'Hit' : 'Miss'}
                    </span>
                    <span style={{ color: MKT.dim, fontSize: 12 }}>{isOpen ? '▴' : '▾'}</span>
                  </div>

                  {/* Expanded detail — all fields saved for this week */}
                  {isOpen && (
                    <div style={{ background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 8, margin: '0 0 10px', padding: '1rem' }}>
                      {w.all && sections.length ? (
                        sections.map((s, si) => {
                          const rows = s.fields.filter(f => w.all[f.id] !== undefined && w.all[f.id] !== '');
                          if (!rows.length) return null;
                          return (
                            <div key={s.id || si} style={{ marginBottom: 12 }}>
                              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.dim, marginBottom: 6 }}>{s.title}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                                {rows.map((f, fi) => (
                                  <span key={f.id || fi} style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                                    <span style={{ color: MKT.dim }}>{f.label}: </span>
                                    <span style={{ color: MKT.text, fontWeight: 500 }}>{w.all[f.id]}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // Legacy entry — show the summary fields we do have
                        <div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 8 }}>
                            {[
                              { label: 'Bookings',          val: w.bookings    },
                              { label: 'Impressions (Ads)', val: w.impressions },
                              { label: 'CTR %',             val: w.ctr         },
                              { label: 'Spend £',           val: w.spend       },
                              { label: 'Google reviews',    val: w.reviews     },
                            ].filter(f => f.val).map(f => (
                              <span key={f.label} style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                                <span style={{ color: MKT.dim }}>{f.label}: </span>
                                <span style={{ color: MKT.text, fontWeight: 500 }}>{f.val}</span>
                              </span>
                            ))}
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, fontStyle: 'italic' }}>
                            Re-save this week in the form above to capture all channel data going forward.
                          </span>
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); deleteWeek(w.date); setExpandedWeek(null); }}
                        style={{ marginTop: 10, background: 'none', border: `0.5px solid ${MKT.border}`, borderRadius: 5, color: MKT.red, cursor: 'pointer', fontSize: 11, fontFamily: FONT, padding: '4px 10px', opacity: 0.7 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                      >
                        Delete this week
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text, marginBottom: 4 }}>
              {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} — end of month totals
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>
              Fill this in at the end of each month with your final totals — total spent and total bookings per channel for the whole month. You can update it mid-month as a draft, but save it once at month end to lock in the final numbers. The ROI tab reads this data.
            </div>
          </div>
          <button onClick={clearChannels} style={{ background: 'transparent', border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '5px 12px', color: MKT.muted, fontSize: 12, fontFamily: FONT, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Clear all
          </button>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 12 }}>
          Cost per booking calculates automatically. Under £30 is green · £30–£60 amber · over £60 red.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 130px', gap: 8, paddingBottom: 8, borderBottom: `0.5px solid ${MKT.borderStrong}`, marginBottom: 4, minWidth: 420 }}>
          {['Channel', 'Spend £/mo', 'Bookings', 'Cost per booking'].map(h => (
            <span key={h} style={TH}>{h}</span>
          ))}
        </div>
        {channels.map((ch, ci) => {
          const s = parseFloat(ch.spend);
          const b = parseFloat(ch.bookings);
          const hasS = ch.spend !== '' && !isNaN(s);
          const hasB = ch.bookings !== '' && !isNaN(b);
          const cpb = (hasS && hasB && b > 0) ? s / b : null;
          const zeroBookings = hasB && b === 0;
          const cpbText = cpb !== null ? `£${cpb.toFixed(0)}` : '—';
          const cpbCol  = cpb !== null ? cpbColor(cpb) : (zeroBookings ? MKT.red : MKT.dim);
          return (
            <div key={ch.id || ci} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 130px', gap: 8, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center', minWidth: 420 }}>
              {editMode ? (
                <>
                  <input value={ch.label} onChange={e => setChannels(cs => cs.map(c => c.id === ch.id ? { ...c, label: e.target.value } : c))} style={{ ...EDIT_INPUT, fontSize: 13 }} />
                  <span /><span />
                  <button onClick={() => setChannels(cs => cs.filter(c => c.id !== ch.id))} style={DEL_BTN}>×</button>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted }}>{ch.label}</span>
                  <input type="number" min="0" placeholder="0" value={ch.spend}    onChange={e => { if (e.target.value !== '' && parseFloat(e.target.value) < 0) return; setChannels(cs => cs.map(c => c.id === ch.id ? { ...c, spend:    e.target.value } : c)); }} style={{ ...INPUT_BASE, width: 80 }} />
                  <input type="number" min="0" placeholder="0" value={ch.bookings} onChange={e => { if (e.target.value !== '' && parseFloat(e.target.value) < 0) return; setChannels(cs => cs.map(c => c.id === ch.id ? { ...c, bookings: e.target.value } : c)); }} style={{ ...INPUT_BASE, width: 70 }} />
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: cpbCol }}>{cpbText}</span>
                </>
              )}
            </div>
          );
        })}
        {editMode && <AddBtn onClick={() => setChannels(cs => [...cs, { id: genId(), label: 'New channel', spend: '', bookings: '' }])} label="Add channel" />}
        {!editMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button
              onClick={saveInvestmentSnapshot}
              style={{ background: 'rgba(37,99,235,0.1)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 16px', color: MKT.blue, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}
            >
              Save {new Date().toLocaleDateString('en-GB', { month: 'long' })} snapshot
            </button>
            {investmentSaved && <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.green }}>Saved — ROI tab updated</span>}
          </div>
        )}
      </div>

      {/* Monthly investment history */}
      {investmentHistory.length > 1 && (() => {
        const past = [...investmentHistory].sort((a, b) => b.month.localeCompare(a.month)).slice(1);
        return (
          <>
            <SLabel>Past months — cost per booking</SLabel>
            <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
              {past.map(entry => (
                <div key={entry.month} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.blue, marginBottom: 6 }}>
                    {new Date(entry.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                    {entry.channels.filter(c => c.spend !== '' || c.bookings !== '').map((c, ci) => {
                      const s = parseFloat(c.spend) || 0;
                      const b = parseFloat(c.bookings) || 0;
                      const cpb = (b > 0 && s > 0) ? `£${(s / b).toFixed(0)}/booking` : b === 0 ? 'no bookings' : '—';
                      const cpbColor = (b > 0 && s > 0) ? (s / b < 30 ? MKT.green : s / b <= 60 ? MKT.amber : MKT.red) : MKT.dim;
                      return (
                        <span key={c.id || ci} style={{ fontFamily: FONT, fontSize: 12 }}>
                          <span style={{ color: MKT.dim }}>{c.label}: </span>
                          <span style={{ color: MKT.text }}>£{s} spend · {b} booking{b !== 1 ? 's' : ''} · </span>
                          <span style={{ color: cpbColor, fontWeight: 500 }}>{cpb}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      <SLabel>Investment recommendations</SLabel>
      {hasEnoughData ? (
        <div style={{ marginBottom: 14 }}>
          {channels.map((ch, ci) => {
            if (ch.spend === '' && ch.bookings === '') return null;
            const s   = parseFloat(ch.spend) || 0;
            const b   = parseFloat(ch.bookings) || 0;
            const cpb = (b > 0 && s > 0) ? s / b : null;
            const rec = investmentRec(ch.label, cpb, b, s, isGrowing);
            return (
              <div key={ch.id || ci} style={{ marginBottom: 8 }}>
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
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 0 }}>
        {WEEK1.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: i < WEEK1.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, width: 90, flexShrink: 0 }}>{row.day}</span>
            <span style={{ fontFamily: FONT, fontSize: 12, color: row.green ? MKT.green : MKT.muted, fontWeight: row.green ? 500 : 300 }}>{row.data}</span>
          </div>
        ))}
      </div>

      {/* AI Marketing Brain */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: `0.5px solid ${MKT.border}` }}>
        <AIBrain
          sections={sections}
          values={values}
          history={history}
          enriched={enriched}
          channels={channels}
          weekDate={weekDate}
        />
      </div>
    </div>
  );
}
