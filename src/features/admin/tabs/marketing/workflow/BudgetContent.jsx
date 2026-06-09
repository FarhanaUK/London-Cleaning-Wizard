import { useState } from 'react';
import { SLabel, MktMetric, ActionList, AddBtn, DragHandle, useDragSort, MKT, FONT, SERIF, EDIT_INPUT, DEL_BTN, genId, usePersisted, TRIGGER_FIELDS } from './MktShared';

const OWNER_COLOR = { f: '#6a9bc4', s: '#7fb069', b: '#d4a03a' };

const DEFAULT_BUDGET = [
  { id: 'nb1', name: 'Cold calling — letting agents',        owner: 'Farhana', ownerType: 'f', note: 'No direct cost — time investment. Target 30-40 calls/week.', amount: 0, active: true },
  { id: 'nb2', name: 'Face-to-face visits — letting agents', owner: 'Farhana', ownerType: 'f', note: 'No direct cost — travel time and fuel. Target 3-5 visits/week.', amount: 0, active: true },
  { id: 'nb3', name: 'Facebook groups — Airbnb hosts',       owner: 'Farhana', ownerType: 'f', note: 'No cost — conversational posts only. 2-3 groups per week.', amount: 0, active: true },
  { id: 'nb4', name: 'Email outreach — letting agents',      owner: 'Farhana', ownerType: 'f', note: 'No direct cost — named contacts only, not info@ addresses.', amount: 0, active: true },
  { id: 'nb5', name: 'Google Business Profile',              owner: 'Farhana', ownerType: 'f', note: '2 fresh posts/week + review request after every clean.', amount: 0, active: true },
  { id: 'nb6', name: 'Personal network',                     owner: 'Farhana', ownerType: 'f', note: 'WhatsApp status updates + direct messages to warm contacts.', amount: 0, active: true },
  { id: 'nb7', name: 'Google Ads',                           owner: 'Farhana', ownerType: 'f', note: 'Paused. Restart at £5/day only after fixing Deep Reset prices, surcharge disclosure, and ad destination URL.', amount: 0, active: false },
];

const DEFAULT_FREE = [
  { id: 'nf1', label: 'Cold calling',     sub: 'Farhana' },
  { id: 'nf2', label: 'Face-to-face',     sub: 'Farhana' },
  { id: 'nf3', label: 'Facebook groups',  sub: 'Farhana' },
  { id: 'nf4', label: 'Email outreach',   sub: 'Farhana' },
  { id: 'nf5', label: 'Google Business',  sub: 'Farhana' },
  { id: 'nf6', label: 'Personal network', sub: 'Farhana' },
];

const DEFAULT_CUT = [
  { id: 'nc1', text: 'Cut time on cold calling before cutting face-to-face visits — visits convert at a higher rate' },
  { id: 'nc2', text: 'Cut Facebook posting frequency before cutting follow-up calls — follow-ups convert warm leads that already exist' },
  { id: 'nc3', text: 'Never skip the review request after every clean — costs nothing and compounds over time' },
  { id: 'nc4', text: 'When Google Ads restarts: never cut below £75/month per campaign — too little data to learn from at lower spend' },
];

const DEFAULT_SCALE = [
  { id: 'ns1', text: 'Restart Google Ads at £5/day once: Deep Reset per-bedroom prices are shown, house surcharge is disclosed on the service card, and ad destination URL points to the booking flow — not the homepage', triggerField: '', triggerValue: '', notified: false },
  { id: 'ns2', text: 'Increase Google Ads to £150/month after the first 5 paid-ad conversions confirm the funnel is working', triggerField: '', triggerValue: '', notified: false },
  { id: 'ns3', text: 'Add LSA (Local Services Ads) once 15+ Google reviews are live — LSA ranking depends heavily on review count', triggerField: '', triggerValue: '', notified: false },
  { id: 'ns4', text: 'Add Instagram paid boosts only if an organic post gets strong engagement first — boost what is already working', triggerField: '', triggerValue: '', notified: false },
];

function ScaleList({ items, setItems, editMode }) {
  const { dragHandlers, isOver } = useDragSort(items, setItems);
  function upd(id, patch) { setItems(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l)); }
  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => {
          const fieldLabel = TRIGGER_FIELDS.find(f => f.id === item.triggerField)?.label;
          return (
            <li key={item.id} {...dragHandlers(i)} style={{ padding: '10px 0', borderBottom: i < items.length - 1 ? `0.5px solid ${MKT.border}` : 'none', outline: isOver(i) ? `1px dashed rgba(201,169,110,0.4)` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <DragHandle style={{ marginTop: 2 }} />
                <span style={{ color: MKT.gold, fontSize: 12, flexShrink: 0, marginTop: editMode ? 6 : 2 }}>→</span>
                {editMode ? (
                  <>
                    <input value={item.text} onChange={e => upd(item.id, { text: e.target.value })} style={{ ...EDIT_INPUT, flex: 1, fontSize: 13 }} />
                    <button onClick={() => setItems(ls => ls.filter(l => l.id !== item.id))} style={DEL_BTN}>×</button>
                  </>
                ) : (
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: item.notified ? MKT.green : MKT.muted, lineHeight: 1.5 }}>{item.text}</span>
                    {item.notified && <span style={{ marginLeft: 8, fontSize: 10, color: MKT.green, fontFamily: FONT }}>✓ reached</span>}
                    {!item.notified && item.triggerField && (
                      <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginTop: 3 }}>
                        Auto-notify when {fieldLabel} ≥ {item.triggerValue}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {editMode && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, marginLeft: 36 }}>
                  <select
                    value={item.triggerField || ''}
                    onChange={e => upd(item.id, { triggerField: e.target.value, notified: false })}
                    style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 5, padding: '3px 6px', color: MKT.muted, fontFamily: FONT, fontSize: 11, outline: 'none', cursor: 'pointer' }}
                  >
                    {TRIGGER_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  {item.triggerField && (
                    <>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>≥</span>
                      <input
                        type="number"
                        value={item.triggerValue || ''}
                        onChange={e => upd(item.id, { triggerValue: e.target.value, notified: false })}
                        style={{ ...EDIT_INPUT, width: 52, fontSize: 11 }}
                        placeholder="0"
                      />
                    </>
                  )}
                  {item.notified && (
                    <button onClick={() => upd(item.id, { notified: false })} style={{ background: 'transparent', border: `0.5px solid ${MKT.border}`, borderRadius: 5, padding: '2px 8px', color: MKT.dim, fontFamily: FONT, fontSize: 10, cursor: 'pointer' }}>Reset</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {editMode && <AddBtn onClick={() => setItems(ls => [...ls, { id: genId(), text: 'New scale rule', triggerField: '', triggerValue: '', notified: false }])} label="Add scale rule" />}
    </div>
  );
}

function SimpleList({ items, setItems, editMode, addLabel }) {
  const { dragHandlers, isOver } = useDragSort(items, setItems);

  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li
            key={item.id}
            {...dragHandlers(i)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: i < items.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', outline: isOver(i) ? `1px dashed rgba(201,169,110,0.4)` : 'none' }}
          >
            <DragHandle style={{ marginTop: 2 }} />
            <span style={{ color: MKT.gold, fontSize: 12, flexShrink: 0, marginTop: editMode ? 6 : 2 }}>→</span>
            {editMode ? (
              <>
                <input value={item.text} onChange={e => setItems(ls => ls.map(l => l.id === item.id ? { ...l, text: e.target.value } : l))} style={{ ...EDIT_INPUT, flex: 1, fontSize: 13 }} />
                <button onClick={() => setItems(ls => ls.filter(l => l.id !== item.id))} style={DEL_BTN}>×</button>
              </>
            ) : (
              <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.5 }}>{item.text}</span>
            )}
          </li>
        ))}
      </ul>
      {editMode && <AddBtn onClick={() => setItems(ls => [...ls, { id: genId(), text: 'New item' }])} label={addLabel} />}
    </div>
  );
}

const DEFAULT_WEIGHTS_TOTAL = DEFAULT_BUDGET.reduce((s, r) => s + r.amount, 0);

export default function BudgetContent({ editMode }) {
  const [budget,   setBudget]   = usePersisted('mkt_budget_rows_v2',  DEFAULT_BUDGET, () => window.dispatchEvent(new Event('lcw-data-saved')));
  const [free,     setFree]     = usePersisted('mkt_budget_free_v2',  DEFAULT_FREE);
  const [cutOrder, setCutOrder] = usePersisted('mkt_budget_cut_v2',   DEFAULT_CUT);
  const [scaleUp,  setScaleUp]  = usePersisted('mkt_budget_scale_v2', DEFAULT_SCALE);
  const [planInput, setPlanInput] = useState('');
  const [applied,   setApplied]   = useState(false);

  const { dragHandlers: bdDrag, isOver: bdOver } = useDragSort(budget, setBudget);

  const isActive = row => row.active !== false;
  const total    = budget.filter(isActive).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  function toggleActive(id) {
    setBudget(bs => bs.map(r => r.id === id ? { ...r, active: r.active === false ? true : false } : r));
  }

  const planTotal   = parseFloat(planInput) || 0;
  const activeCount = budget.filter(isActive).length;
  const suggested   = planTotal > 0 && activeCount > 0
    ? budget.map(row => {
        if (!isActive(row)) return { id: row.id, name: row.name, amount: 0, inactive: true };
        return { id: row.id, name: row.name, amount: Math.round(planTotal / activeCount) };
      })
    : [];
  const suggestedTotal = suggested.filter(r => !r.inactive).reduce((s, r) => s + r.amount, 0);

  function applyPlan() {
    if (!planTotal) return;
    setBudget(bs => bs.map(row => {
      const s = suggested.find(r => r.id === row.id);
      return s && !s.inactive ? { ...row, amount: s.amount } : row;
    }));
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  }

  return (
    <div>
      <SLabel first>Budget — channels &amp; allocation</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>

        {/* Total input + apply row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 14, borderBottom: `0.5px solid ${MKT.border}`, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>Total monthly budget</span>
            <span style={{ fontFamily: SERIF, fontSize: 16, color: MKT.gold }}>£</span>
            <input
              type="number" min="0" placeholder="e.g. 200"
              value={planInput}
              onChange={e => { setPlanInput(e.target.value); setApplied(false); }}
              style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '5px 10px', color: MKT.text, fontSize: 14, fontFamily: FONT, width: 110, outline: 'none' }}
            />
          </div>
          {planTotal > 0 && (
            <>
              <button
                onClick={applyPlan}
                style={{ background: applied ? 'rgba(22,163,74,0.1)' : 'rgba(201,169,110,0.12)', border: `0.5px solid ${applied ? 'rgba(22,163,74,0.3)' : MKT.borderStrong}`, borderRadius: 6, padding: '5px 16px', color: applied ? MKT.green : MKT.gold, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}
              >
                {applied ? 'Applied' : 'Apply suggestions'}
              </button>
              {suggestedTotal !== planTotal && (
                <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>£{planTotal - suggestedTotal} rounding difference — adjust manually</span>
              )}
            </>
          )}
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px', gap: 8, padding: '6px 0 4px', marginLeft: 20 }}>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim }}>Channel</span>
          {planTotal > 0 && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim, textAlign: 'center' }}>Suggested</span>}
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim, textAlign: 'right' }}>Amount</span>
        </div>

        {budget.map((row, i) => {
          const sug = suggested.find(r => r.id === row.id);
          return (
            <div
              key={row.id}
              {...bdDrag(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', outline: bdOver(i) ? `1px dashed rgba(201,169,110,0.4)` : 'none', opacity: isActive(row) ? 1 : 0.4 }}
            >
              <DragHandle />
              <div style={{ flex: 1, minWidth: 0 }}>
                {editMode ? (
                  <>
                    <input value={row.name} onChange={e => setBudget(bs => bs.map(b => b.id === row.id ? { ...b, name: e.target.value } : b))} style={{ ...EDIT_INPUT, fontSize: 13, fontWeight: 500, marginBottom: 3 }} placeholder="Channel name" />
                    <input value={row.note} onChange={e => setBudget(bs => bs.map(b => b.id === row.id ? { ...b, note: e.target.value } : b))} style={{ ...EDIT_INPUT, fontSize: 11 }} placeholder="Note" />
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text, fontWeight: 500 }}>{row.name} <span style={{ fontSize: 10, color: OWNER_COLOR[row.ownerType], marginLeft: 4 }}>{row.owner}</span></div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted, marginTop: 1 }}>{row.note}</div>
                  </>
                )}
              </div>

              {/* Suggested amount */}
              {planTotal > 0 && (
                <div style={{ width: 90, textAlign: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: sug && !sug.inactive ? MKT.blue : MKT.dim }}>
                    {sug && !sug.inactive && sug.amount > 0 ? `£${sug.amount}` : '—'}
                  </span>
                </div>
              )}

              {/* Active toggle + amount */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => toggleActive(row.id)}
                  style={{ background: isActive(row) ? 'rgba(22,163,74,0.1)' : MKT.dark3, border: `0.5px solid ${isActive(row) ? 'rgba(22,163,74,0.3)' : MKT.border}`, borderRadius: 20, padding: '2px 10px', color: isActive(row) ? MKT.green : MKT.dim, fontSize: 11, fontFamily: FONT, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {isActive(row) ? 'Active' : 'Inactive'}
                </button>
                {editMode ? (
                  <>
                    <span style={{ fontFamily: SERIF, fontSize: 16, color: MKT.gold }}>£</span>
                    <input type="number" value={row.amount} onChange={e => setBudget(bs => bs.map(b => b.id === row.id ? { ...b, amount: e.target.value } : b))} style={{ ...EDIT_INPUT, width: 55, textAlign: 'right', fontFamily: SERIF, fontSize: 16, color: MKT.gold }} />
                    <button onClick={() => setBudget(bs => bs.filter(b => b.id !== row.id))} style={DEL_BTN}>×</button>
                  </>
                ) : (
                  <div style={{ fontFamily: SERIF, fontSize: 18, color: isActive(row) ? MKT.gold : MKT.dim, minWidth: 48, textAlign: 'right' }}>£{row.amount}</div>
                )}
              </div>
            </div>
          );
        })}

        {editMode && <AddBtn onClick={() => setBudget(bs => [...bs, { id: genId(), name: 'New channel', owner: 'Farhana', ownerType: 'f', note: '', amount: 0, active: true }])} label="Add channel" />}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4, borderTop: `0.5px solid ${MKT.borderStrong}`, fontFamily: FONT, fontSize: 14, fontWeight: 500, color: MKT.text }}>
          <span>Active total</span>
          <span>£{total}/month</span>
        </div>
      </div>

      <SLabel>All free channels</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 4 }}>
        {free.map(ch => (
          <div key={ch.id} style={{ background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 8, padding: '1rem', textAlign: 'center', position: 'relative' }}>
            {editMode && <button onClick={() => setFree(fs => fs.filter(f => f.id !== ch.id))} style={{ ...DEL_BTN, position: 'absolute', top: 4, right: 4, fontSize: 14 }}>×</button>}
            <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: MKT.gold, lineHeight: 1 }}>£0</div>
            {editMode ? (
              <>
                <input value={ch.label} onChange={e => setFree(fs => fs.map(f => f.id === ch.id ? { ...f, label: e.target.value } : f))} style={{ ...EDIT_INPUT, fontSize: 11, textAlign: 'center', color: MKT.dim, marginTop: 4 }} />
                <input value={ch.sub || ''} onChange={e => setFree(fs => fs.map(f => f.id === ch.id ? { ...f, sub: e.target.value } : f))} style={{ ...EDIT_INPUT, fontSize: 10, textAlign: 'center', color: MKT.dim, marginTop: 2 }} />
              </>
            ) : (
              <>
                <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>{ch.label}</div>
                {ch.sub && <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginTop: 2 }}>{ch.sub}</div>}
              </>
            )}
          </div>
        ))}
        {editMode && (
          <div onClick={() => setFree(fs => [...fs, { id: genId(), label: 'Channel', sub: 'Owner' }])} style={{ background: MKT.dark3, border: '1px dashed rgba(201,169,110,0.3)', borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer', color: MKT.dim, fontSize: 12, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            + Add channel
          </div>
        )}
      </div>

      <SLabel>If budget feels tight — cut in this order</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        <SimpleList items={cutOrder} setItems={setCutOrder} editMode={editMode} addLabel="Add cut rule" />
      </div>

      <SLabel>When to scale up</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <ScaleList items={scaleUp} setItems={setScaleUp} editMode={editMode} />
      </div>
    </div>
  );
}
