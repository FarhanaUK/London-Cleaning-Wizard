import { SLabel, MktMetric, MktAlert, Divider, AddBtn, DragHandle, useDragSort, MKT, FONT, SERIF, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const DEFAULT_MONTHLY = [
  { id: 'm1', value: '1–3',   label: 'Weeks 1–2'     },
  { id: 'm2', value: '4–8',   label: 'Month 1 total'  },
  { id: 'm3', value: '8–15',  label: 'Month 2 total'  },
  { id: 'm4', value: '15–25', label: 'Month 3 total'  },
];

const DEFAULT_CARDS = [
  { id: 'nc1', title: 'Weeks 1-4 — building volume', items: [
    { id: 'ni1', text: '30-40 calls per week consistently — not once, every week', amber: false },
    { id: 'ni2', text: '3-5 face-to-face visits per week to letting agencies', amber: false },
    { id: 'ni3', text: 'First letting agent genuinely interested — asked for pricing or said "send me info"', amber: false },
    { id: 'ni4', text: 'First Facebook Airbnb enquiry received and replied to within 1 hour', amber: false },
    { id: 'ni5', text: 'Same-day follow-up emails sent before getting home from every visit', amber: true },
  ], danger: 'Zero responses after 4 weeks of 30+ calls/week → review your opening line. Log the data in Outreach Tracker and bring it to Claude for an honest channel review.' },
  { id: 'nc2', title: 'Weeks 5-8 — first conversions', items: [
    { id: 'nj1', text: 'First booking from Facebook Airbnb group post', amber: false },
    { id: 'nj2', text: '1-2 letting agents at quote stage — prices sent, follow-up in progress', amber: false },
    { id: 'nj3', text: 'Google reviews at 10+ from personal WhatsApp requests after cleans', amber: false },
    { id: 'nj4', text: 'First trial clean confirmed with a letting agent', amber: true },
  ], danger: 'No bookings from any channel after 8 weeks → log all data in Outreach Tracker and review with Claude. Volume or follow-up cadence is likely the bottleneck.' },
  { id: 'nc3', title: 'Month 3 — first partnerships', items: [
    { id: 'nk1', text: 'One letting agent sending regular work — EOT or routine property cleans', amber: false },
    { id: 'nk2', text: '3-5 Airbnb bookings from Facebook groups this month', amber: false },
    { id: 'nk3', text: '15+ Google reviews live', amber: false },
    { id: 'nk4', text: 'Booking funnel fixed — test Google Ads restart at £5/day', amber: false },
  ], danger: '' },
  { id: 'nc4', title: 'Month 4+ — scaling', items: [
    { id: 'nl1', text: '2-3 letting agents sending regular work', amber: false },
    { id: 'nl2', text: 'Facebook groups producing 4-6 bookings per month', amber: false },
    { id: 'nl3', text: '20+ Google reviews', amber: false },
    { id: 'nl4', text: 'Google Ads active at £150/month with confirmed conversions', amber: false },
    { id: 'nl5', text: 'Recruit an additional cleaner to handle volume', amber: false },
  ], danger: '' },
];

const DEFAULT_ROADMAP = [
  { id: 'nr1', text: 'Cold calling — letting agents · 30-40 calls/week · active now', tag: 'Active', green: false },
  { id: 'nr2', text: 'Face-to-face visits — letting agents · 3-5 visits/week · active now', tag: 'Active', green: false },
  { id: 'nr3', text: 'Facebook groups — Airbnb hosts · 2-3 posts/week · active now', tag: 'Active', green: false },
  { id: 'nr4', text: 'Email outreach — letting agents · cold emails to named contacts · active now', tag: 'Active', green: false },
  { id: 'nr5', text: 'Google Ads — paused · restart after fixing Deep Reset prices, surcharge disclosure, and booking URL', tag: 'Paused', green: false },
  { id: 'nr6', text: 'LSA (Local Services Ads) — activate once 15+ Google reviews are live', tag: 'Month 3+', green: false },
];

function TargetCard({ card, setCards, editMode }) {
  const update = (changes) => setCards(cs => cs.map(c => c.id === card.id ? { ...c, ...changes } : c));
  const updateItem = (itemId, changes) => update({ items: card.items.map(i => i.id === itemId ? { ...i, ...changes } : i) });

  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', position: 'relative' }}>
      {editMode && <button onClick={() => setCards(cs => cs.filter(c => c.id !== card.id))} style={{ ...DEL_BTN, position: 'absolute', top: 12, right: 12 }}>×</button>}
      {editMode ? (
        <input value={card.title} onChange={e => update({ title: e.target.value })} style={{ ...EDIT_INPUT, fontFamily: SERIF, fontSize: 16, color: MKT.gold, marginBottom: 10 }} />
      ) : (
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: MKT.gold, marginBottom: 10 }}>{card.title}</div>
      )}
      {card.items.map((item, i) => (
        <div key={item.id} style={{ display: 'flex', gap: 8, fontFamily: FONT, fontSize: 12, color: MKT.muted, padding: '3px 0', lineHeight: 1.5, alignItems: 'flex-start' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.amber ? MKT.amber : MKT.green, flexShrink: 0, marginTop: 5 }} />
          {editMode ? (
            <>
              <input value={item.text} onChange={e => updateItem(item.id, { text: e.target.value })} style={{ ...EDIT_INPUT, flex: 1 }} />
              <button onClick={() => update({ items: card.items.filter(i => i.id !== item.id) })} style={DEL_BTN}>×</button>
            </>
          ) : item.text}
        </div>
      ))}
      {editMode && <AddBtn onClick={() => update({ items: [...card.items, { id: genId(), text: 'New milestone', amber: false }] })} label="Add milestone" />}
      {editMode ? (
        <div style={{ marginTop: 10 }}>
          <textarea value={card.danger || ''} onChange={e => update({ danger: e.target.value })} placeholder="Danger / fallback note (optional)" style={{ ...EDIT_INPUT, resize: 'vertical', minHeight: 48, borderBottom: 'none', border: '1px solid rgba(192,91,91,0.3)', borderRadius: 6, padding: '6px 8px', fontSize: 12, background: 'rgba(192,91,91,0.05)', color: '#d9908a', width: '100%', boxSizing: 'border-box' }} />
        </div>
      ) : card.danger && (
        <div style={{ marginTop: 12, background: 'rgba(192,91,91,0.08)', border: '0.5px solid rgba(192,91,91,0.25)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: 12, fontFamily: FONT, color: MKT.red, lineHeight: 1.6 }}>
          {card.danger}
        </div>
      )}
    </div>
  );
}

export default function TargetsContent({ editMode }) {
  const [monthly,  setMonthly]  = usePersisted('mkt_targets_monthly',   DEFAULT_MONTHLY);
  const [cards,    setCards]    = usePersisted('mkt_targets_cards_v2',  DEFAULT_CARDS);
  const [roadmap,  setRoadmap]  = usePersisted('mkt_campaigns_v2',      DEFAULT_ROADMAP);
  const { dragHandlers: rmDrag, isOver: rmOver, isAfter: rmAfter } = useDragSort(roadmap, setRoadmap);

  return (
    <div>
      <SLabel first>Monthly booking targets</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 4 }}>
        {monthly.map(t => (
          <div key={t.id} style={{ position: 'relative' }}>
            {editMode && <button onClick={() => setMonthly(ms => ms.filter(m => m.id !== t.id))} style={{ ...DEL_BTN, position: 'absolute', top: 4, right: 4, fontSize: 14, zIndex: 1 }}>×</button>}
            <MktMetric value={t.value} label={t.label} editMode={editMode} onUpdate={changes => setMonthly(ms => ms.map(m => m.id === t.id ? { ...m, ...changes } : m))} />
          </div>
        ))}
        {editMode && (
          <div onClick={() => setMonthly(ms => [...ms, { id: genId(), value: '0', label: 'New target' }])} style={{ background: MKT.dark3, border: '1px dashed rgba(201,169,110,0.3)', borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer', color: MKT.dim, fontSize: 12, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            + Add target
          </div>
        )}
      </div>

      <Divider />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {cards.map(card => <TargetCard key={card.id} card={card} setCards={setCards} editMode={editMode} />)}
        {editMode && (
          <div onClick={() => setCards(cs => [...cs, { id: genId(), title: 'New milestone card', items: [{ id: genId(), text: 'New milestone', amber: false }], danger: '' }])} style={{ background: MKT.card, border: '1px dashed rgba(201,169,110,0.3)', borderRadius: 10, padding: '1.25rem', cursor: 'pointer', color: MKT.dim, fontSize: 12, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
            + Add milestone card
          </div>
        )}
      </div>

      <Divider />
      <SLabel>Channel roadmap</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        {roadmap.map((item, i) => (
          <div key={item.id} {...rmDrag(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderTop: rmOver(i) && !rmAfter(i) ? '2px solid rgba(201,169,110,0.6)' : '0.5px solid transparent', borderBottom: rmOver(i) && rmAfter(i) ? '2px solid rgba(201,169,110,0.6)' : i < roadmap.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : '0.5px solid transparent' }}>
            <DragHandle style={{ marginTop: 2 }} />
            <span style={{ color: MKT.gold, fontSize: 12, flexShrink: 0, marginTop: editMode ? 6 : 2 }}>→</span>
            {editMode ? (
              <>
                <input value={item.text} onChange={e => setRoadmap(rs => rs.map(r => r.id === item.id ? { ...r, text: e.target.value } : r))} style={{ ...EDIT_INPUT, flex: 1, fontSize: 13 }} />
                <select
                  value={item.tag || ''}
                  onChange={e => setRoadmap(rs => rs.map(r => r.id === item.id ? { ...r, tag: e.target.value, green: e.target.value === 'Now' } : r))}
                  style={{ ...EDIT_INPUT, width: 80, fontSize: 10, flexShrink: 0, color: item.tag === 'Now' ? MKT.green : MKT.muted, cursor: 'pointer' }}
                >
                  {['Active', 'Paused', 'Month 2', 'Month 3', 'Month 4+', 'Month 5+'].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <button onClick={() => setRoadmap(rs => rs.filter(r => r.id !== item.id))} style={DEL_BTN}>×</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: item.green ? MKT.green : MKT.muted, lineHeight: 1.5 }}>{item.text}</span>
                {item.tag && <span style={{ fontSize: 10, background: MKT.dark4, color: MKT.dim, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.tag}</span>}
              </>
            )}
          </div>
        ))}
        {editMode && <AddBtn onClick={() => setRoadmap(rs => [...rs, { id: genId(), text: 'New campaign', tag: 'Month X', green: false }])} label="Add campaign" />}
      </div>
    </div>
  );
}
