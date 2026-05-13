import { useState } from 'react';

export const FONT  = "'Jost', sans-serif";
export const SERIF = "'Cormorant Garamond', serif";

export const MKT = {
  bg:           '#1a1410',
  card:         '#242018',
  dark3:        '#2e2a24',
  dark4:        '#3a3530',
  text:         '#f0ebe0',
  muted:        '#9a9080',
  dim:          '#6a6258',
  gold:         '#c8b89a',
  green:        '#7fb069',
  amber:        '#d4a03a',
  red:          '#c05b5b',
  blue:         '#6a9bc4',
  border:       'rgba(201,169,110,0.15)',
  borderStrong: 'rgba(201,169,110,0.3)',
};

const OWNER_COLORS = {
  f: { background: 'rgba(106,155,196,0.15)', color: MKT.blue,  border: '0.5px solid rgba(106,155,196,0.3)' },
  s: { background: 'rgba(127,176,105,0.15)', color: MKT.green, border: '0.5px solid rgba(127,176,105,0.3)' },
  b: { background: 'rgba(212,160,58,0.12)',  color: MKT.amber, border: '0.5px solid rgba(212,160,58,0.3)'  },
};

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

export function MktAlert({ type, style: extraStyle, children }) {
  return (
    <div style={{ ...ALERT_STYLES[type], borderRadius: 8, padding: '0.75rem 1rem', fontSize: 12, fontFamily: FONT, lineHeight: 1.6, ...extraStyle }}>
      {children}
    </div>
  );
}

export function MktCard({ owner, ownerType, title, sub, children }) {
  const [open, setOpen] = useState(false);
  const oc = OWNER_COLORS[ownerType] || {};
  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {owner && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, ...oc }}>{owner}</span>}
          <div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: MKT.text }}>{title}</div>
            {sub && <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginTop: 1 }}>{sub}</div>}
          </div>
        </div>
        <span style={{ color: MKT.dim, fontSize: 16, flexShrink: 0, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>▾</span>
      </div>
      {open && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `0.5px solid ${MKT.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MktMetric({ value, label, sub }) {
  return (
    <div style={{ background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: MKT.gold, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function ActionList({ items }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map(({ text, tag }, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: i < items.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', fontSize: 13, fontFamily: FONT, color: MKT.muted, lineHeight: 1.5 }}>
          <span style={{ color: MKT.gold, fontSize: 12, flexShrink: 0, marginTop: 2 }}>→</span>
          <span style={{ flex: 1 }}>{text}</span>
          {tag && <span style={{ marginLeft: 'auto', fontSize: 10, background: MKT.dark4, color: MKT.dim, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>{tag}</span>}
        </li>
      ))}
    </ul>
  );
}

export function Divider() {
  return <div style={{ height: '0.5px', background: MKT.border, margin: '1.5rem 0' }} />;
}
