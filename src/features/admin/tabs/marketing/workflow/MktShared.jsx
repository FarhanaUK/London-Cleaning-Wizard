import { useState, useEffect, useRef } from 'react';

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

export function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export function usePersisted(key, defaults) {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || defaults; }
    catch { return defaults; }
  });
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    localStorage.setItem(key, JSON.stringify(data));
  }, [key, data]);
  return [data, setData];
}

export const EDIT_INPUT = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(201,169,110,0.35)',
  color: '#f0ebe0',
  fontFamily: "'Jost', sans-serif",
  fontSize: 13,
  outline: 'none',
  width: '100%',
  padding: '1px 0',
};

export const DEL_BTN = {
  background: 'transparent',
  border: 'none',
  color: '#c05b5b',
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
  const dragIdx = useRef(null);
  const [overIdx, setOverIdx] = useState(null);

  function dragHandlers(i) {
    return {
      draggable: true,
      onDragStart: (e) => { dragIdx.current = i; e.dataTransfer.effectAllowed = 'move'; },
      onDragOver:  (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overIdx !== i) setOverIdx(i); },
      onDragLeave: ()  => setOverIdx(null),
      onDrop:      (e) => { e.preventDefault(); if (dragIdx.current !== null && dragIdx.current !== i) setList(l => reorder(l, dragIdx.current, i)); dragIdx.current = null; setOverIdx(null); },
      onDragEnd:   ()  => { dragIdx.current = null; setOverIdx(null); },
    };
  }

  function isOver(i) { return overIdx === i && dragIdx.current !== null && dragIdx.current !== i; }

  return { dragHandlers, isOver };
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
