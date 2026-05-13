import { SLabel, MktMetric, ActionList, AddBtn, DragHandle, useDragSort, MKT, FONT, SERIF, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const OWNER_COLOR = { f: '#6a9bc4', s: '#7fb069', b: '#d4a03a' };

const DEFAULT_BUDGET = [
  { id: 'b1', name: "Google Ads — Farhana's campaign", owner: 'Farhana', ownerType: 'f', note: 'LCW Premium Areas Residential · £5/day · live and working', amount: 150 },
  { id: 'b2', name: "Google Ads — Steven's campaign",  owner: 'Steven',  ownerType: 's', note: 'LCW Campaign 2 · broader London · fix urgently before spending more', amount: 100 },
  { id: 'b3', name: 'Local Services Ads (LSA)',         owner: 'Farhana', ownerType: 'f', note: 'Pay per lead · Google Guaranteed badge · £25/week', amount: 100 },
  { id: 'b4', name: 'Instagram paid boosts',            owner: 'Steven',  ownerType: 's', note: 'Boost best performing posts only · London homeowners 28–55', amount: 50 },
  { id: 'b5', name: 'Bark.com credits',                 owner: 'Farhana', ownerType: 'f', note: 'Active leads from people ready to book now', amount: 50 },
  { id: 'b6', name: 'Facebook paid boosts',             owner: 'Steven',  ownerType: 's', note: '1–2 boosted posts/month · local London community targeting', amount: 30 },
  { id: 'b7', name: 'TikTok (month 2 only)',            owner: 'Farhana', ownerType: 'f', note: 'Small test budget · start only after first real clean is filmed', amount: 20 },
];

const DEFAULT_FREE = [
  { id: 'f1', label: 'Instagram organic', sub: 'Steven'   },
  { id: 'f2', label: 'Facebook groups',   sub: 'Steven'   },
  { id: 'f3', label: 'Nextdoor organic',  sub: 'Steven'   },
  { id: 'f4', label: 'Google Business',   sub: 'Farhana'  },
  { id: 'f5', label: 'Personal network',  sub: 'Both'     },
  { id: 'f6', label: 'TikTok organic',    sub: 'Month 2'  },
];

const DEFAULT_CUT  = [
  { id: 'c1', text: 'Cut TikTok £20 first — it is month 2 anyway, save it until organic content is ready' },
  { id: 'c2', text: 'Cut Facebook boost from £30 to £15 — run 1 boosted post instead of 2' },
  { id: 'c3', text: 'Cut Bark.com from £50 to £25 — respond to fewer but stay active on the platform' },
  { id: 'c4', text: 'Never cut LSA — pay per lead means zero wasted spend even on a tight budget' },
  { id: 'c5', text: 'Never cut Google Ads below £75/month per campaign — too little data to learn from' },
];

const DEFAULT_SCALE = [
  { id: 's1', text: 'Increase LSA from £100 to £200/month once live and generating 3+ leads/week' },
  { id: 's2', text: "Increase Farhana's Google Ads to £250/month after 15+ tracked conversions confirm it is profitable" },
  { id: 's3', text: 'Scale Instagram boost to £100/month if boosted posts are converting to bookings' },
  { id: 's4', text: 'Scale TikTok to £50/month if organic content gets 1,000+ views consistently' },
];

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

export default function BudgetContent({ editMode }) {
  const [budget,   setBudget]   = usePersisted('mkt_budget_rows',  DEFAULT_BUDGET);
  const [free,     setFree]     = usePersisted('mkt_budget_free',  DEFAULT_FREE);
  const [cutOrder, setCutOrder] = usePersisted('mkt_budget_cut',   DEFAULT_CUT);
  const [scaleUp,  setScaleUp]  = usePersisted('mkt_budget_scale', DEFAULT_SCALE);

  const { dragHandlers: bdDrag, isOver: bdOver } = useDragSort(budget, setBudget);

  const total = budget.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return (
    <div>
      <SLabel first>Shared budget — full breakdown</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        {budget.map((row, i) => (
          <div
            key={row.id}
            {...bdDrag(i)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', gap: 12, outline: bdOver(i) ? `1px dashed rgba(201,169,110,0.4)` : 'none' }}
          >
            <DragHandle style={{ marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {editMode ? (
                <>
                  <input value={row.name} onChange={e => setBudget(bs => bs.map(b => b.id === row.id ? { ...b, name: e.target.value } : b))} style={{ ...EDIT_INPUT, fontSize: 13, fontWeight: 500, marginBottom: 4 }} placeholder="Channel name" />
                  <input value={row.note} onChange={e => setBudget(bs => bs.map(b => b.id === row.id ? { ...b, note: e.target.value } : b))} style={{ ...EDIT_INPUT, fontSize: 11 }} placeholder="Note" />
                </>
              ) : (
                <>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text, fontWeight: 500 }}>{row.name} <span style={{ fontSize: 10, color: OWNER_COLOR[row.ownerType], marginLeft: 6 }}>{row.owner}</span></div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted, marginTop: 2 }}>{row.note}</div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {editMode ? (
                <>
                  <span style={{ fontFamily: SERIF, fontSize: 18, color: MKT.gold }}>£</span>
                  <input type="number" value={row.amount} onChange={e => setBudget(bs => bs.map(b => b.id === row.id ? { ...b, amount: e.target.value } : b))} style={{ ...EDIT_INPUT, width: 60, textAlign: 'right', fontFamily: SERIF, fontSize: 18, color: MKT.gold }} />
                  <button onClick={() => setBudget(bs => bs.filter(b => b.id !== row.id))} style={DEL_BTN}>×</button>
                </>
              ) : (
                <div style={{ fontFamily: SERIF, fontSize: 20, color: MKT.gold }}>£{row.amount}</div>
              )}
            </div>
          </div>
        ))}
        {editMode && <AddBtn onClick={() => setBudget(bs => [...bs, { id: genId(), name: 'New channel', owner: 'Farhana', ownerType: 'f', note: '', amount: 0 }])} label="Add budget row" />}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4, borderTop: `0.5px solid ${MKT.borderStrong}`, fontFamily: FONT, fontSize: 14, fontWeight: 500, color: MKT.text }}>
          <span>Total</span>
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
        <SimpleList items={scaleUp} setItems={setScaleUp} editMode={editMode} addLabel="Add scale rule" />
      </div>
    </div>
  );
}
