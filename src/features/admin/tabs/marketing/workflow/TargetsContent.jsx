import { SLabel, MktMetric, MktAlert, Divider, AddBtn, DragHandle, useDragSort, MKT, FONT, SERIF, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const DEFAULT_MONTHLY = [
  { id: 'm1', value: '1–3',   label: 'Weeks 1–2'     },
  { id: 'm2', value: '4–8',   label: 'Month 1 total'  },
  { id: 'm3', value: '8–15',  label: 'Month 2 total'  },
  { id: 'm4', value: '15–25', label: 'Month 3 total'  },
];

const DEFAULT_CARDS = [
  { id: 'tc1', title: 'Month 1 — weeks 1 & 2', items: [{ id: 'i1', text: 'Google Ads: 30–50 impressions/day, CTR 3–7%', amber: false }, { id: 'i2', text: '1–2 bookings total', amber: false }, { id: 'i3', text: 'LSA verification submitted', amber: false }, { id: 'i4', text: 'Bark.com profile live', amber: false }, { id: 'i5', text: "Steven's campaign urgent fixes done", amber: false }, { id: 'i6', text: 'Nextdoor business page set up', amber: false }, { id: 'i7', text: 'Flyers designed and distributed', amber: false }], danger: 'Zero bookings after 2 weeks → copy your Analytics tab data and share it with Claude: "Here is my weekly marketing data, tell me exactly what to fix on each channel."' },
  { id: 'tc2', title: 'Month 1 — weeks 3 & 4', items: [{ id: 'j1', text: '3–6 bookings total for the month', amber: false }, { id: 'j2', text: 'LSA live and generating 2+ leads/week', amber: false }, { id: 'j3', text: 'At least 1 enquiry from Nextdoor or Facebook', amber: false }, { id: 'j4', text: 'At least 1 new Google review from a real client', amber: false }, { id: 'j5', text: 'Follow up every booking with recurring offer within 24hrs', amber: true }], danger: 'Under 3 bookings → shift £30 from Facebook boost to LSA. Share Analytics tab data with Claude for a full channel-by-channel review.' },
  { id: 'tc3', title: 'Month 2', items: [{ id: 'k1', text: '6–12 bookings total', amber: false }, { id: 'k2', text: '1–2 recurring weekly clients confirmed', amber: false }, { id: 'k3', text: 'Switch Google Ads to Maximise Conversions', amber: false }, { id: 'k4', text: 'First TikTok content posted after real clean', amber: false }, { id: 'k5', text: '5+ Google reviews live', amber: false }, { id: 'k6', text: 'Start building General Residential campaign', amber: false }], danger: 'No recurring clients → send the follow-up message to every past client within 24hrs of their clean. Share Analytics data with Claude for a review.' },
  { id: 'tc4', title: 'Month 3 — scaling', items: [{ id: 'l1', text: '12–20 bookings total', amber: false }, { id: 'l2', text: '3–5 recurring weekly clients', amber: false }, { id: 'l3', text: 'Ad spend covered by recurring revenue', amber: false }, { id: 'l4', text: '10+ Google reviews', amber: false }, { id: 'l5', text: 'Deep Clean campaign built', amber: false }, { id: 'l6', text: 'Recruit 2 more vetted cleaners', amber: false }], danger: 'Bookings plateau → add Airbnb campaign, increase LSA to £200/month, increase Instagram boost to £100/month. Share Analytics data with Claude.' },
];

const DEFAULT_ROADMAP = [
  { id: 'cr1', text: 'Campaign 1 (live) — LCW Premium Areas Residential · Farhana · premium London postcodes', tag: 'Now', green: true },
  { id: 'cr2', text: "Campaign 2 — LCW General Residential · Steven · fix urgently · broader London keywords", tag: 'Month 2', green: false },
  { id: 'cr3', text: 'Campaign 3 — LCW Airbnb London · Shoreditch, City, Canary Wharf · £75/month', tag: 'Month 3', green: false },
  { id: 'cr4', text: 'Campaign 4 — LCW Deep Clean London · all London within 8 miles · £75/month', tag: 'Month 3', green: false },
  { id: 'cr5', text: 'Campaign 5 — LCW Office London · business districts · £50/month', tag: 'Month 4+', green: false },
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
  const [monthly,  setMonthly]  = usePersisted('mkt_targets_monthly',  DEFAULT_MONTHLY);
  const [cards,    setCards]    = usePersisted('mkt_targets_cards',    DEFAULT_CARDS);
  const [roadmap,  setRoadmap]  = usePersisted('mkt_campaigns',        DEFAULT_ROADMAP);
  const { dragHandlers: rmDrag, isOver: rmOver } = useDragSort(roadmap, setRoadmap);

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
      <SLabel>Google Ads campaigns roadmap</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        {roadmap.map((item, i) => (
          <div key={item.id} {...rmDrag(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: i < roadmap.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', outline: rmOver(i) ? `1px dashed rgba(201,169,110,0.4)` : 'none' }}>
            <DragHandle style={{ marginTop: 2 }} />
            <span style={{ color: MKT.gold, fontSize: 12, flexShrink: 0, marginTop: editMode ? 6 : 2 }}>→</span>
            {editMode ? (
              <>
                <input value={item.text} onChange={e => setRoadmap(rs => rs.map(r => r.id === item.id ? { ...r, text: e.target.value } : r))} style={{ ...EDIT_INPUT, flex: 1, fontSize: 13 }} />
                <input value={item.tag || ''} onChange={e => setRoadmap(rs => rs.map(r => r.id === item.id ? { ...r, tag: e.target.value } : r))} style={{ ...EDIT_INPUT, width: 70, fontSize: 10, flexShrink: 0 }} placeholder="tag" />
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
