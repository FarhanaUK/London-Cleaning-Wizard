import { useState, useEffect, useRef } from 'react';
import { db } from '../../../../../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ── Firestore sync ────────────────────────────────────────────────────────────

const MKT_DOC = doc(db, 'mkt_data', 'lcw');

// Keys that must never leave the device
const LOCAL_ONLY = new Set(['mkt_analytics_current', 'lcw_anthropic_key']);

// Keys worth tracking in the change log (so AI knows when settings were last updated)
const TRACKED_CHANGES = {
  'mkt_budget_rows':          'Marketing budget',
  'mkt_campaigns':            'Campaign roadmap',
  'mkt_targets_monthly':      'Booking targets',
  'mkt_investment_channels':  'Investment channels',
  'mkt_budget_cut':           'Budget cut order',
  'mkt_budget_scale':         'Scale-up rules',
  'mkt_priority_actions':     'Priority actions',
};

export function recordChange(label) {
  try {
    const log  = JSON.parse(localStorage.getItem('mkt_change_log')) || [];
    const next = [{ label, date: new Date().toISOString() }, ...log.filter(e => e.label !== label)].slice(0, 30);
    localStorage.setItem('mkt_change_log', JSON.stringify(next));
  } catch {}
}

// Shared one-time Firestore load — all usePersisted instances share one read
let _fsPromise = null;
let _fsCache   = null;

export function loadFirestoreData() {
  if (_fsCache  !== null) return Promise.resolve(_fsCache);
  if (_fsPromise)          return _fsPromise;
  _fsPromise = getDoc(MKT_DOC)
    .then(s  => { _fsCache = s.exists() ? s.data() : {}; return _fsCache; })
    .catch(() => { _fsCache = {};                          return _fsCache; });
  return _fsPromise;
}

export const FONT  = "system-ui, -apple-system, 'Segoe UI', sans-serif";
export const SERIF = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const MKT = {
  bg:           '#f1f5f9',
  card:         '#ffffff',
  dark3:        '#f8fafc',
  dark4:        '#f1f5f9',
  text:         '#0f172a',
  muted:        '#64748b',
  dim:          '#94a3b8',
  gold:         '#2563eb',
  green:        '#16a34a',
  amber:        '#d97706',
  red:          '#dc2626',
  blue:         '#2563eb',
  border:       '#e2e8f0',
  borderStrong: '#cbd5e1',
};

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function usePersisted(key, defaults, onChange) {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? defaults; }
    catch { return defaults; }
  });
  const isMounted  = useRef(false);
  const skipWrite  = useRef(false); // true when a change came FROM Firestore (don't write back)

  // On mount: pull from Firestore once and override localStorage if cloud data exists
  useEffect(() => {
    if (LOCAL_ONLY.has(key)) return;
    loadFirestoreData().then(fsData => {
      if (fsData[key] !== undefined) {
        skipWrite.current = true;
        setData(fsData[key]);
        localStorage.setItem(key, JSON.stringify(fsData[key]));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Write to localStorage + Firestore on every user-driven change
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    if (skipWrite.current)  { skipWrite.current = false; return; }
    localStorage.setItem(key, JSON.stringify(data));
    if (!LOCAL_ONLY.has(key)) {
      setDoc(MKT_DOC, { [key]: data }, { merge: true }).catch(() => {});
    }
    if (TRACKED_CHANGES[key]) recordChange(TRACKED_CHANGES[key]);
    onChange?.();
  }, [key, data]); // eslint-disable-line react-hooks/exhaustive-deps

  return [data, setData];
}

export const EDIT_INPUT = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid #cbd5e1',
  color: '#0f172a',
  fontFamily: "'Jost', sans-serif",
  fontSize: 13,
  outline: 'none',
  width: '100%',
  padding: '1px 0',
};

export const DEL_BTN = {
  background: 'transparent',
  border: 'none',
  color: '#dc2626',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  padding: '0 2px',
  flexShrink: 0,
  opacity: 0.8,
};

export function reorder(list, from, to) {
  if (from === to) return list;
  const r = [...list];
  r.splice(to, 0, r.splice(from, 1)[0]);
  return r;
}

export function useDragSort(list, setList) {
  const dragIdx  = useRef(null);
  const [drop, setDrop] = useState(null); // { idx, after }

  function dragHandlers(i) {
    return {
      draggable: true,
      onDragStart: (e) => { dragIdx.current = i; e.dataTransfer.effectAllowed = 'move'; },
      onDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect  = e.currentTarget.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        setDrop(prev => (prev?.idx === i && prev?.after === after ? prev : { idx: i, after }));
      },
      onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); },
      onDrop: (e) => {
        e.preventDefault();
        if (dragIdx.current !== null && drop !== null) {
          const from = dragIdx.current;
          let to = drop.after ? drop.idx + 1 : drop.idx;
          if (from < to) to -= 1;
          if (from !== to) setList(l => reorder(l, from, to));
        }
        dragIdx.current = null;
        setDrop(null);
      },
      onDragEnd: () => { dragIdx.current = null; setDrop(null); },
    };
  }

  const isOver  = (i) => drop !== null && drop.idx === i && dragIdx.current !== null && dragIdx.current !== i;
  const isAfter = (i) => isOver(i) && drop.after;

  return { dragHandlers, isOver, isAfter };
}

export function DragHandle({ style }) {
  return <span style={{ cursor: 'grab', color: MKT.dim, fontSize: 16, userSelect: 'none', padding: '0 2px', flexShrink: 0, opacity: 0.5, ...style }}>⠿</span>;
}

export function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent',
      border: '1px dashed rgba(201,169,110,0.3)',
      borderRadius: 6,
      color: '#9a9080',
      cursor: 'pointer',
      fontSize: 12,
      fontFamily: "'Jost', sans-serif",
      padding: '6px 12px',
      width: '100%',
      marginTop: 8,
      textAlign: 'left',
    }}>
      + {label}
    </button>
  );
}

const OWNER_COLORS = {
  f: { background: 'rgba(106,155,196,0.15)', color: MKT.blue,  border: '0.5px solid rgba(106,155,196,0.3)' },
  s: { background: 'rgba(127,176,105,0.15)', color: MKT.green, border: '0.5px solid rgba(127,176,105,0.3)' },
  b: { background: 'rgba(212,160,58,0.12)',  color: MKT.amber, border: '0.5px solid rgba(212,160,58,0.3)'  },
};

const OWNER_LABELS = { f: 'Farhana', s: 'Steven', b: 'Both' };

const ALERT_STYLES = {
  warn:   { background: 'rgba(212,160,58,0.08)',  border: '0.5px solid rgba(212,160,58,0.3)',   color: MKT.amber },
  danger: { background: 'rgba(192,91,91,0.08)',   border: '0.5px solid rgba(192,91,91,0.25)',   color: MKT.red   },
  good:   { background: 'rgba(127,176,105,0.08)', border: '0.5px solid rgba(127,176,105,0.25)', color: MKT.green },
  info:   { background: 'rgba(106,155,196,0.08)', border: '0.5px solid rgba(106,155,196,0.25)', color: MKT.blue  },
};

export function SLabel({ children, first }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: MKT.dim, margin: first ? '0 0 0.75rem' : '1.5rem 0 0.75rem' }}>
      {children}
    </div>
  );
}

export function MktAlert({ type, style: extra, children }) {
  return (
    <div style={{ ...ALERT_STYLES[type], borderRadius: 8, padding: '0.75rem 1rem', fontSize: 12, fontFamily: FONT, lineHeight: 1.6, ...extra }}>
      {children}
    </div>
  );
}

export function MktCard({ ownerType = 'f', title, sub, children, editMode, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false);
  const oc = OWNER_COLORS[ownerType] || OWNER_COLORS.f;
  const isOpen = open || editMode;

  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {editMode ? (
          <select
            value={ownerType}
            onChange={e => onUpdate?.({ ownerType: e.target.value })}
            style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 20, padding: '2px 8px', color: oc.color, fontSize: 10, fontFamily: FONT, outline: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="f">Farhana</option>
            <option value="s">Steven</option>
            <option value="b">Both</option>
          </select>
        ) : (
          <span onClick={() => setOpen(o => !o)} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', ...oc }}>
            {OWNER_LABELS[ownerType]}
          </span>
        )}

        <div style={{ flex: 1, minWidth: 0, cursor: editMode ? 'default' : 'pointer' }} onClick={editMode ? undefined : () => setOpen(o => !o)}>
          {editMode ? (
            <>
              <input value={title} onChange={e => onUpdate?.({ title: e.target.value })} style={{ ...EDIT_INPUT, fontSize: 14, fontWeight: 500, marginBottom: 4 }} placeholder="Card title" />
              <input value={sub || ''} onChange={e => onUpdate?.({ sub: e.target.value })} style={{ ...EDIT_INPUT, fontSize: 12 }} placeholder="Subtitle (optional)" />
            </>
          ) : (
            <>
              <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: MKT.text }}>{title}</div>
              {sub && <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginTop: 1 }}>{sub}</div>}
            </>
          )}
        </div>

        {editMode ? (
          <button onClick={onDelete} style={DEL_BTN} title="Delete card">×</button>
        ) : (
          <span onClick={() => setOpen(o => !o)} style={{ color: MKT.dim, fontSize: 16, flexShrink: 0, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', cursor: 'pointer' }}>▾</span>
        )}
      </div>

      {isOpen && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `0.5px solid ${MKT.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MktMetric({ value, label, sub, editMode, onUpdate }) {
  return (
    <div style={{ background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
      {editMode ? (
        <>
          <input value={value} onChange={e => onUpdate?.({ value: e.target.value })} style={{ ...EDIT_INPUT, fontFamily: SERIF, fontSize: 22, textAlign: 'center', color: MKT.gold }} />
          <input value={label} onChange={e => onUpdate?.({ label: e.target.value })} style={{ ...EDIT_INPUT, fontSize: 11, textAlign: 'center', color: MKT.dim, marginTop: 4 }} />
          {sub !== undefined && <input value={sub || ''} onChange={e => onUpdate?.({ sub: e.target.value })} style={{ ...EDIT_INPUT, fontSize: 10, textAlign: 'center', color: MKT.dim, marginTop: 2 }} placeholder="Sub-label" />}
        </>
      ) : (
        <>
          <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: MKT.gold, lineHeight: 1 }}>{value}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>{label}</div>
          {sub && <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginTop: 2 }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

export function ActionList({ items, editMode, onAdd, onDelete, onUpdate }) {
  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={item.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: i < items.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ color: MKT.gold, fontSize: 12, flexShrink: 0, marginTop: editMode ? 6 : 2 }}>→</span>
            {editMode ? (
              <>
                <input value={item.text} onChange={e => onUpdate?.(item.id, { text: e.target.value })} style={{ ...EDIT_INPUT, flex: 1, fontSize: 13 }} placeholder="Action text" />
                <input value={item.tag || ''} onChange={e => onUpdate?.(item.id, { tag: e.target.value })} style={{ ...EDIT_INPUT, width: 80, fontSize: 10, flexShrink: 0 }} placeholder="tag" />
                <button onClick={() => onDelete?.(item.id)} style={DEL_BTN}>×</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.5 }}>{item.text}</span>
                {item.tag && <span style={{ marginLeft: 'auto', fontSize: 10, background: MKT.dark4, color: MKT.dim, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.tag}</span>}
              </>
            )}
          </li>
        ))}
      </ul>
      {editMode && <AddBtn onClick={onAdd} label="Add action" />}
    </div>
  );
}

export function Divider() {
  return <div style={{ height: '0.5px', background: MKT.border, margin: '1.5rem 0' }} />;
}

const TOOL_KEYS = [
  { key: 'lcw_ai_debrief',  label: 'Weekly debrief'        },
  { key: 'lcw_ai_budget',   label: 'Budget recommendations' },
  { key: 'lcw_ai_adcopy',   label: 'Ad copy review'         },
  { key: 'lcw_ai_content',  label: 'Content plan'           },
  { key: 'lcw_ai_diagnose', label: 'Performance diagnosis'  },
  { key: 'lcw_ai_monthly',  label: 'Monthly review'         },
];

export function addNotification(message) {
  try {
    const existing = JSON.parse(localStorage.getItem('mkt_notifications')) || [];
    const n = { id: Math.random().toString(36).slice(2, 9), message, date: new Date().toISOString(), read: false };
    localStorage.setItem('mkt_notifications', JSON.stringify([n, ...existing].slice(0, 50)));
    window.dispatchEvent(new CustomEvent('mkt-notification-added'));
  } catch {}
}

// Field IDs available as auto-triggers — shared with BudgetContent
export const TRIGGER_FIELDS = [
  { id: '',       label: 'No auto-trigger' },
  { id: 'lsa1',   label: 'LSA leads/week' },
  { id: 'lsa3',   label: 'LSA bookings/week' },
  { id: 'f6',     label: "Farhana's Ads bookings/week" },
  { id: 'f6_cum', label: "Farhana's Ads total conversions (all time)" },
  { id: 'g4',     label: "Steven's Ads bookings/week" },
  { id: 'h6',     label: 'Instagram bookings/week' },
  { id: 'i3',     label: 'Facebook bookings/week' },
  { id: 'j3',     label: 'Nextdoor bookings/week' },
  { id: 'bk2',    label: 'Bark bookings/week' },
  { id: 'l1',     label: 'Total bookings/week' },
  { id: 'l1_cum',   label: 'Total bookings all time' },
  { id: 'l1_month', label: 'Total bookings this month' },
];

export function checkScaleNotifications(weekAll) {
  try {
    const items = JSON.parse(localStorage.getItem('mkt_budget_scale')) || [];
    let changed = false;
    const updated = items.map(item => {
      if (!item.triggerField || item.notified) return item;
      let val = 0;
      if (item.triggerField === 'f6_cum') {
        const history = JSON.parse(localStorage.getItem('mkt_weekly_history')) || [];
        val = history.reduce((s, w) => s + (parseFloat(w.all?.f6) || 0), 0);
      } else if (item.triggerField === 'l1_cum') {
        const history = JSON.parse(localStorage.getItem('mkt_weekly_history')) || [];
        val = history.reduce((s, w) => s + (parseFloat(w.all?.l1) || parseFloat(w.bookings) || 0), 0);
      } else if (item.triggerField === 'l1_month') {
        const history = JSON.parse(localStorage.getItem('mkt_weekly_history')) || [];
        const thisMonth = new Date().toISOString().slice(0, 7);
        val = history.filter(w => w.date && w.date.slice(0, 7) === thisMonth)
                     .reduce((s, w) => s + (parseFloat(w.all?.l1) || parseFloat(w.bookings) || 0), 0);
      } else {
        val = parseFloat(weekAll[item.triggerField]) || 0;
      }
      const threshold = parseFloat(item.triggerValue);
      if (!isNaN(threshold) && threshold > 0 && val >= threshold) {
        addNotification(`Scale-up milestone reached — ${item.text}`);
        changed = true;
        return { ...item, notified: true };
      }
      return item;
    });
    if (changed) localStorage.setItem('mkt_budget_scale', JSON.stringify(updated));
  } catch {}
}

export function buildContext() {
  const now = new Date();
  const CAMPAIGN_WEEK1_SUN = '2026-05-17';
  const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
  const thisSun = sun.toISOString().slice(0, 10);
  const elapsed = Math.floor((new Date(thisSun).getTime() - new Date(CAMPAIGN_WEEK1_SUN).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const campaignWeek = Math.max(1, elapsed + 1);

  let history = [], channels = [], invHistory = [], budgetRows = [], budgetCut = [], budgetScale = [], roadmap = [], actions = [], targets = [], changeLog = [], weeklyReviews = [];
  try { history       = JSON.parse(localStorage.getItem('mkt_weekly_history'))      || []; } catch {}
  try { channels      = JSON.parse(localStorage.getItem('mkt_investment_channels')) || []; } catch {}
  try { invHistory    = JSON.parse(localStorage.getItem('mkt_investment_history'))  || []; } catch {}
  try { budgetRows    = JSON.parse(localStorage.getItem('mkt_budget_rows'))         || []; } catch {}
  try { budgetCut     = JSON.parse(localStorage.getItem('mkt_budget_cut'))          || []; } catch {}
  try { budgetScale   = JSON.parse(localStorage.getItem('mkt_budget_scale'))        || []; } catch {}
  try { roadmap       = JSON.parse(localStorage.getItem('mkt_campaigns'))           || []; } catch {}
  try { actions       = JSON.parse(localStorage.getItem('mkt_priority_actions'))    || []; } catch {}
  try { targets       = JSON.parse(localStorage.getItem('mkt_targets_monthly'))     || []; } catch {}
  try { changeLog     = JSON.parse(localStorage.getItem('mkt_change_log'))          || []; } catch {}
  try { weeklyReviews = JSON.parse(localStorage.getItem('lcw_weekly_reviews'))      || []; } catch {}

  let sections = [];
  try { sections = JSON.parse(localStorage.getItem('mkt_analytics_sections')) || []; } catch {}

  const lines = [
    `[LIVE DATA — ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}]`,
    `Campaign week: ${campaignWeek} (W1 starts Sun 17 May · weeks run Sun–Sat · this week commencing ${thisSun})`,
    '',
  ];

  if (budgetRows.length) {
    const total = budgetRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    lines.push(`Marketing budget — £${total}/month total:`);
    budgetRows.forEach(r => lines.push(`  ${r.name}: £${r.amount}/month (${r.owner}) — ${r.note || ''}`));
    lines.push('');
  }

  const liveCampaigns = roadmap.filter(r => r.green);
  if (liveCampaigns.length) {
    lines.push('Active campaigns:');
    liveCampaigns.forEach(r => lines.push(`  → ${r.text}`));
    lines.push('');
  }

  const activeActions = actions.filter(a => a && a.trim());
  if (activeActions.length) {
    lines.push('Current priority actions:');
    activeActions.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
    lines.push('');
  }

  if (history.length) {
    lines.push('Weekly history (all channels):');
    [...history].sort((a, b) => a.date.localeCompare(b.date)).forEach((w, i) => {
      lines.push(`  W${i + 1} (${w.date}) — ${w.bookings || '0'} bookings total:`);
      if (w.all && sections.length) {
        for (const s of sections) {
          const rows = s.fields
            .filter(f => w.all[f.id] !== undefined && w.all[f.id] !== '')
            .map(f => `      ${f.label}: ${w.all[f.id]}`);
          if (rows.length) { lines.push(`    ${s.title}:`); lines.push(...rows); }
        }
      } else {
        const p = [];
        if (w.impressions) p.push(`imp: ${w.impressions}`);
        if (w.ctr)         p.push(`CTR: ${w.ctr}%`);
        if (w.spend)       p.push(`spend: £${w.spend}`);
        if (w.reviews)     p.push(`reviews: ${w.reviews}`);
        if (p.length) lines.push('    ' + p.join(' | '));
      }
    });
    lines.push('');
  } else {
    lines.push('No weekly history saved yet.', '');
  }

  const active = channels.filter(c => c.spend || c.bookings);
  if (active.length) {
    lines.push('Monthly investment data (current month):');
    active.forEach(c => {
      const s = parseFloat(c.spend) || 0, b = parseFloat(c.bookings) || 0;
      lines.push(`  ${c.label}: £${s} spend | ${b} bookings | CPB: ${b > 0 ? `£${(s / b).toFixed(0)}` : 'no bookings'}`);
    });
    lines.push('');
  }

  const pastMonths = [...invHistory].sort((a, b) => a.month.localeCompare(b.month));
  if (pastMonths.length > 1) {
    lines.push('Monthly investment history:');
    pastMonths.forEach(entry => {
      lines.push(`  ${entry.month}:`);
      entry.channels.filter(c => c.spend !== '' || c.bookings !== '').forEach(c => {
        const s = parseFloat(c.spend) || 0, b = parseFloat(c.bookings) || 0;
        lines.push(`    ${c.label}: £${s} | ${b} bookings | CPB: ${b > 0 ? `£${(s / b).toFixed(0)}` : 'no bookings'}`);
      });
    });
    lines.push('');
  }

  const toolOutputs = TOOL_KEYS.map(({ key, label }) => {
    try {
      const hist = JSON.parse(localStorage.getItem(key)) || [];
      if (!hist.length) return null;
      const latest = hist[0];
      const snippet = latest.text.slice(0, 400).replace(/\n+/g, ' ').trim();
      const date = new Date(latest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `  [${label} — ${date}]: ${snippet}${latest.text.length > 400 ? '…' : ''}`;
    } catch { return null; }
  }).filter(Boolean);
  if (toolOutputs.length) {
    lines.push('Recent AI tool outputs:');
    toolOutputs.forEach(t => lines.push(t));
    lines.push('');
  }

  if (targets.length) {
    lines.push('Booking targets by phase:');
    targets.forEach(t => lines.push(`  ${t.label}: ${t.value} bookings`));
    lines.push('');
  }

  if (changeLog.length) {
    lines.push('Recent changes (do not recommend reversing within 2 weeks):');
    changeLog.forEach(c => {
      const days = Math.floor((Date.now() - new Date(c.date).getTime()) / (1000 * 60 * 60 * 24));
      const when = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
      lines.push(`  ${c.label}: last updated ${when}`);
    });
    lines.push('');
  }

  if (weeklyReviews.length) {
    lines.push('Past weekly reviews:');
    weeklyReviews.forEach(r => {
      lines.push(`--- ${r.date} ---`);
      if (r.messages) {
        r.messages.filter(m => m.role === 'assistant' && m.content).forEach(m => lines.push(m.content));
      } else if (r.analysis) {
        lines.push(r.analysis);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}
