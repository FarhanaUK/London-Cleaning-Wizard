import { useRef, useState, useEffect } from 'react';
import { MktCard, ActionList, SLabel, MktAlert, Divider, AddBtn, DragHandle, reorder, useDragSort, MKT, FONT, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const DEFAULT_SECTIONS = {
  paidFarhana: [
    { id: 'pf1', ownerType: 'f', title: 'Google Ads — LCW Premium Areas Residential', sub: '£150/month · £5/day · premium London postcodes', items: [{ id: 'a1', text: 'Check search terms report — add new negatives', tag: 'Every Monday' }, { id: 'a2', text: 'Record impressions, clicks, CTR in Analytics tab', tag: 'Weekly' }, { id: 'a3', text: 'Do NOT change bidding or budget during first 14-day learning phase', tag: 'Days 1–14' }, { id: 'a4', text: 'After 15–30 tracked conversions: switch to Maximise Conversions', tag: 'Month 2' }, { id: 'a5', text: 'Build General Residential campaign once 5–10 bookings confirmed', tag: 'Month 2' }, { id: 'a6', text: 'Future campaigns: Airbnb, Deep Clean, Office, Hourly Clean', tag: 'Month 3+' }], alert: { type: 'good', text: 'Live — 99.3% optimisation · 1 booking · 484 impressions · 18 clicks · 3.72% CTR · £44 spent' } },
    { id: 'pf2', ownerType: 'f', title: 'Local Services Ads (LSA)', sub: '£100/month · pay per lead · Google Guaranteed', items: [{ id: 'b1', text: 'Complete identity + insurance verification (2–4 weeks)', tag: 'Urgent' }, { id: 'b2', text: 'Add all London boroughs within 8 miles of E14', tag: 'Once' }, { id: 'b3', text: 'Set weekly budget to £25 once live', tag: 'Once live' }, { id: 'b4', text: 'Respond to every lead within 5 minutes', tag: 'Daily' }, { id: 'b5', text: 'Mark jobs completed to build LSA ranking', tag: 'After every clean' }], alert: { type: 'warn', text: 'LSA shows above regular Google Ads. Highest-converting channel once live. Get verification done this week.' } },
    { id: 'pf3', ownerType: 'f', title: 'Bark.com', sub: '£50/month · active leads ready to book now', items: [{ id: 'c1', text: 'Complete profile with photos and description', tag: 'Once' }, { id: 'c2', text: 'Check for new leads daily', tag: 'Daily' }, { id: 'c3', text: 'Only spend credits on leads in your service area', tag: 'Always' }, { id: 'c4', text: 'Respond within 1 hour — first responder wins most leads', tag: 'Daily' }], alert: null },
  ],
  paidSteven: [
    { id: 'ps1', ownerType: 's', title: 'Google Ads — LCW Campaign 2', sub: '£100/month · broader London residential keywords', items: [{ id: 'd1', text: 'Remove "#1 London" claim from ad copy', tag: 'Urgent' }, { id: 'd2', text: 'Fix final URL — must go to londoncleaningwizard.com/book', tag: 'Urgent' }, { id: 'd3', text: 'Improve ad strength from "Poor" — add headlines and descriptions', tag: 'Urgent' }, { id: 'd4', text: 'Add all negative keywords from shared master list', tag: 'This week' }, { id: 'd5', text: "Confirm no keyword overlap with Farhana's campaign", tag: 'Every Monday' }], alert: { type: 'danger', text: 'Urgent fixes needed before this campaign will work', position: 'top' } },
    { id: 'ps2', ownerType: 's', title: 'Instagram paid boosts', sub: '£50/month · boost best performing posts only', items: [{ id: 'e1', text: 'Only boost posts already performing well organically', tag: 'Monthly' }, { id: 'e2', text: 'Target London homeowners aged 28–55 in target postcodes', tag: 'Always' }, { id: 'e3', text: 'Best to boost: before/after, candle reveal, offer deadline posts', tag: 'Monthly' }, { id: 'e4', text: '£5–10/day per boost, run 5–7 days', tag: 'Per boost' }, { id: 'e5', text: 'Record reach and bookings in Analytics tab', tag: 'Weekly' }], alert: { type: 'warn', text: "Never boost underperforming posts. Boosting amplifies what's already working." } },
    { id: 'ps3', ownerType: 's', title: 'Facebook paid boosts', sub: '£30/month · local London community targeting', items: [{ id: 'f1', text: 'Boost 1–2 posts/month into target London postcodes', tag: 'Monthly' }, { id: 'f2', text: 'Target homeowners/renters 25–55, London, interested in home services', tag: 'Always' }, { id: 'f3', text: 'Best to boost: offer posts, testimonials, before/after photos', tag: 'Monthly' }, { id: 'f4', text: 'Record reach and any bookings in Analytics tab', tag: 'Weekly' }], alert: null },
    { id: 'ps4', ownerType: 'f', title: 'TikTok paid (month 2 only)', sub: '£20/month · only after first real clean is filmed', items: [{ id: 'g1', text: 'Do NOT spend on TikTok ads until organic content is posted first', tag: 'Month 2' }, { id: 'g2', text: 'Film first real clean — before, during, after, candle and gift reveal', tag: 'First clean' }, { id: 'g3', text: 'Post organically first — if 500+ views then boost it', tag: 'Month 2' }, { id: 'g4', text: 'Target London homeowners/renters aged 22–45', tag: 'When ready' }], alert: { type: 'info', text: 'One viral before/after video can bring more bookings than a month of paid ads. Build organic first then boost what resonates.' } },
  ],
  freeSteven: [
    { id: 'fs1', ownerType: 's', title: 'Instagram organic', sub: '3–4 posts/week · before/after, candle/gift, founder story', items: [{ id: 'h1', text: 'Before/after cleaning photos — most engaging content in this niche', tag: '3–4/week' }, { id: 'h2', text: 'The candle, scent and gift — the Signature Touch reveal', tag: 'Weekly' }, { id: 'h3', text: 'Founder story and behind the scenes', tag: 'Weekly' }, { id: 'h4', text: '50% off offer in every caption until 1 June', tag: 'Always' }, { id: 'h5', text: 'Link to londoncleaningwizard.com/book in bio and every post', tag: 'Always' }], alert: { type: 'warn', text: 'Never "affordable" or "cheap". Always "reset" not just "clean". Signature Hotel Reset is the hero product.' } },
    { id: 'fs2', ownerType: 's', title: 'Facebook community groups', sub: '3–5 posts/week in local London groups', items: [{ id: 'i1', text: 'Post in Canary Wharf, Islington, Chelsea, Hackney, Hampstead groups', tag: '3–5/week' }, { id: 'i2', text: 'Mention the specific area in each post', tag: 'Always' }, { id: 'i3', text: 'Include 50% off offer and booking link in every post', tag: 'Always' }, { id: 'i4', text: 'Reply to every comment within 1 hour', tag: 'Daily' }], alert: null },
    { id: 'fs3', ownerType: 's', title: 'Nextdoor', sub: '1 post/week · set up at business.nextdoor.com', items: [{ id: 'j1', text: 'Set up business page at business.nextdoor.com not the personal app', tag: 'Urgent' }, { id: 'j2', text: 'Post Local Deal — 50% off Signature Hotel Reset ends 1 June', tag: '1/week' }, { id: 'j3', text: 'Target postcodes: E14, E1, N1, W1, SW3, SW7, NW3, W8, W11', tag: 'Always' }, { id: 'j4', text: 'Respond to any cleaning requests from neighbours', tag: 'Daily check' }], alert: null },
  ],
  freeFarhana: [
    { id: 'ff1', ownerType: 'f', title: 'Google Business Profile', sub: '2 fresh posts/week · ask for reviews after every clean', items: [{ id: 'k1', text: '2 fresh unique posts per week — never repeat the same post', tag: '2/week' }, { id: 'k2', text: '50% off offer post live until 1 June', tag: 'Live now' }, { id: 'k3', text: 'Reply to every review within 24 hours', tag: 'Always' }, { id: 'k4', text: 'Send review link within 2 hours of every clean completing', tag: 'After every clean' }, { id: 'k5', text: 'Update photos and services monthly', tag: 'Monthly' }], alert: null },
    { id: 'ff2', ownerType: 'b', title: 'Personal network + flyers', sub: 'Free — most underrated channel right now', items: [{ id: 'l1', text: 'Message every contact in your phone about the launch', tag: 'Once — now' }, { id: 'l2', text: 'WhatsApp status — 50% off offer every week until 1 June', tag: 'Weekly' }, { id: 'l3', text: 'Offer friends/family discounted clean for a genuine Google review', tag: 'This week' }, { id: 'l4', text: 'Design flyer on Canva with QR code to /book — print 500 at Vistaprint (~£30)', tag: 'This week' }, { id: 'l5', text: 'Distribute in Canary Wharf, Wapping, Islington apartment buildings', tag: 'This week' }, { id: 'l6', text: 'Leave flyers with local estate agents', tag: 'This week' }], alert: null },
  ],
};

const DEFAULT_RHYTHM = [
  { id: 'r1', time: 'Morning · 5 min\nFarhana',  action: "Check for overnight bookings. Reply to any enquiry immediately — never wait more than 30 minutes." },
  { id: 'r2', time: 'Morning · 5 min\nSteven',   action: "Post on Instagram or Facebook. Reply to all comments from the day before." },
  { id: 'r3', time: 'Midday · 5 min\nFarhana',   action: "Check Bark.com leads. Respond to anything in your service area within 1 hour." },
  { id: 'r4', time: 'Evening · 10 min\nFarhana', action: "Check Google Ads spend, impressions, clicks. Add search term negatives if needed." },
  { id: 'r5', time: 'Weekend · priority\nBoth',  action: "Be near your phones. Weekends convert at 3x weekday rate. Reply to every enquiry within 10 minutes." },
  { id: 'r6', time: 'Monday · 10 min\nBoth',     action: "Share keyword lists. Confirm no campaign overlap. Review previous week. Record numbers in Analytics tab." },
  { id: 'r7', time: 'Monday · 15 min\nBoth',     action: "Answer the 4 questions together: (1) How many bookings came in last week and where from? (2) Which channel sent the most traffic to the booking page? (3) Which channel cost the most time or money with the least return? (4) What one thing do we do differently this week?" },
];

function cardActions(setCards, cardId) {
  return {
    onDelete:     () => setCards(cs => cs.filter(c => c.id !== cardId)),
    onUpdate:     (changes) => setCards(cs => cs.map(c => c.id === cardId ? { ...c, ...changes } : c)),
    onAddItem:    () => setCards(cs => cs.map(c => c.id === cardId ? { ...c, items: [...c.items, { id: genId(), text: 'New action', tag: '' }] } : c)),
    onDeleteItem: (itemId) => setCards(cs => cs.map(c => c.id === cardId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c)),
    onUpdateItem: (itemId, changes) => setCards(cs => cs.map(c => c.id === cardId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...changes } : i) } : c)),
  };
}

function CardSection({ label, sectionKey, cards, setCards, editMode, first, makeDragHandlers, isCardOver }) {
  return (
    <>
      <SLabel first={first}>{label}</SLabel>
      {cards.map((card, i) => {
        const actions = cardActions(setCards, card.id);
        return (
          <div
            key={card.id}
            {...makeDragHandlers(sectionKey, i)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 4,
              borderRadius: 10,
              outline: isCardOver(sectionKey, i) ? '2px dashed rgba(201,169,110,0.4)' : '2px solid transparent',
              transition: 'outline 0.1s',
            }}
          >
            <DragHandle style={{ paddingTop: 14 }} />
            <div style={{ flex: 1 }}>
              <MktCard ownerType={card.ownerType} title={card.title} sub={card.sub} editMode={editMode} onDelete={actions.onDelete} onUpdate={actions.onUpdate}>
                {card.alert?.position === 'top' && <div style={{ marginBottom: 12 }}><MktAlert type={card.alert.type}>{card.alert.text}</MktAlert></div>}
                <ActionList items={card.items} editMode={editMode} onAdd={actions.onAddItem} onDelete={actions.onDeleteItem} onUpdate={actions.onUpdateItem} />
                {card.alert && card.alert.position !== 'top' && <div style={{ marginTop: 12 }}><MktAlert type={card.alert.type}>{card.alert.text}</MktAlert></div>}
              </MktCard>
            </div>
          </div>
        );
      })}
      {editMode && (
        <AddBtn onClick={() => setCards(cs => [...cs, { id: genId(), ownerType: 'f', title: 'New card', sub: '', items: [], alert: null }])} label="Add card" />
      )}
    </>
  );
}

export default function WorkflowContent({ editMode }) {
  const [paidFarhana, setPaidFarhana] = usePersisted('mkt_paid_farhana', DEFAULT_SECTIONS.paidFarhana);
  const [paidSteven,  setPaidSteven]  = usePersisted('mkt_paid_steven',  DEFAULT_SECTIONS.paidSteven);
  const [freeSteven,  setFreeSteven]  = usePersisted('mkt_free_steven',  DEFAULT_SECTIONS.freeSteven);
  const [freeFarhana, setFreeFarhana] = usePersisted('mkt_free_farhana', DEFAULT_SECTIONS.freeFarhana);
  const [rhythm,      setRhythm]      = usePersisted('mkt_daily_rhythm', DEFAULT_RHYTHM);

  const dragSrc  = useRef(null);
  const [overInfo, setOverInfo] = useState(null);

  useEffect(() => {
    if (!rhythm.find(r => r.id === 'r7')) {
      setRhythm(rs => [...rs, { id: 'r7', time: 'Monday · 15 min\nBoth', action: "Answer the 4 questions together: (1) How many bookings came in last week and where from? (2) Which channel sent the most traffic to the booking page? (3) Which channel cost the most time or money with the least return? (4) What one thing do we do differently this week?" }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { dragHandlers: rhDrag, isOver: rhOver } = useDragSort(rhythm, setRhythm);

  const sectionState = {
    paidFarhana: { cards: paidFarhana, setCards: setPaidFarhana },
    paidSteven:  { cards: paidSteven,  setCards: setPaidSteven  },
    freeSteven:  { cards: freeSteven,  setCards: setFreeSteven  },
    freeFarhana: { cards: freeFarhana, setCards: setFreeFarhana },
  };

  function makeDragHandlers(sectionKey, i) {
    return {
      draggable: true,
      onDragStart: (e) => { dragSrc.current = { key: sectionKey, idx: i }; e.dataTransfer.effectAllowed = 'move'; },
      onDragOver:  (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverInfo({ key: sectionKey, idx: i }); },
      onDragLeave: ()  => setOverInfo(null),
      onDragEnd:   ()  => { dragSrc.current = null; setOverInfo(null); },
      onDrop: (e) => {
        e.preventDefault();
        if (!dragSrc.current) return;
        const { key: srcKey, idx: srcIdx } = dragSrc.current;
        dragSrc.current = null;
        setOverInfo(null);
        if (srcKey === sectionKey && srcIdx === i) return;
        if (srcKey === sectionKey) {
          sectionState[srcKey].setCards(l => reorder(l, srcIdx, i));
        } else {
          const card = sectionState[srcKey].cards[srcIdx];
          sectionState[srcKey].setCards(l => l.filter((_, j) => j !== srcIdx));
          sectionState[sectionKey].setCards(l => { const r = [...l]; r.splice(i, 0, card); return r; });
        }
      },
    };
  }

  function isCardOver(sectionKey, i) {
    if (!overInfo || overInfo.key !== sectionKey || overInfo.idx !== i) return false;
    if (!dragSrc.current) return false;
    return !(dragSrc.current.key === sectionKey && dragSrc.current.idx === i);
  }

  return (
    <div>
      {!editMode && (
        <div style={{ background: 'rgba(192,91,91,0.08)', border: '0.5px solid rgba(192,91,91,0.3)', borderLeft: '3px solid #c05b5b', borderRadius: '0 8px 8px 0', padding: '0.75rem 1rem', fontSize: 12, fontFamily: FONT, color: '#d9908a', lineHeight: 1.6, marginBottom: 20 }}>
          <strong>Keyword coordination — every Monday.</strong> Farhana owns premium area keywords. Steven owns broader London keywords. If both campaigns bid on the same keywords you compete and push costs up. Share keyword lists every Monday.
        </div>
      )}

      <CardSection label="Paid — Farhana" sectionKey="paidFarhana" cards={paidFarhana} setCards={setPaidFarhana} editMode={editMode} first makeDragHandlers={makeDragHandlers} isCardOver={isCardOver} />
      <CardSection label="Paid — Steven"  sectionKey="paidSteven"  cards={paidSteven}  setCards={setPaidSteven}  editMode={editMode}       makeDragHandlers={makeDragHandlers} isCardOver={isCardOver} />
      <CardSection label="Free — Steven"  sectionKey="freeSteven"  cards={freeSteven}  setCards={setFreeSteven}  editMode={editMode}       makeDragHandlers={makeDragHandlers} isCardOver={isCardOver} />
      <CardSection label="Free — Farhana" sectionKey="freeFarhana" cards={freeFarhana} setCards={setFreeFarhana} editMode={editMode}       makeDragHandlers={makeDragHandlers} isCardOver={isCardOver} />

      <Divider />
      <SLabel>Daily rhythm</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        {rhythm.map((row, i) => (
          <div
            key={row.id}
            {...rhDrag(i)}
            style={{
              display: 'grid',
              gridTemplateColumns: editMode ? 'auto 1fr 1fr auto' : 'auto 170px 1fr',
              gap: 12,
              padding: '10px 0',
              borderBottom: i < rhythm.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
              fontSize: 12,
              fontFamily: FONT,
              outline: rhOver(i) ? `1px dashed rgba(201,169,110,0.4)` : 'none',
            }}
          >
            <DragHandle style={{ alignSelf: 'center' }} />
            {editMode ? (
              <>
                <input value={row.time}   onChange={e => setRhythm(rs => rs.map(r => r.id === row.id ? { ...r, time:   e.target.value } : r))} style={{ ...EDIT_INPUT, color: MKT.gold }} placeholder="Time / person" />
                <input value={row.action} onChange={e => setRhythm(rs => rs.map(r => r.id === row.id ? { ...r, action: e.target.value } : r))} style={{ ...EDIT_INPUT }} placeholder="Action" />
                <button onClick={() => setRhythm(rs => rs.filter(r => r.id !== row.id))} style={DEL_BTN}>×</button>
              </>
            ) : (
              <>
                <div style={{ color: MKT.gold, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{row.time}</div>
                <div style={{ color: MKT.muted }}>{row.action}</div>
              </>
            )}
          </div>
        ))}
        {editMode && <AddBtn onClick={() => setRhythm(rs => [...rs, { id: genId(), time: 'Time · duration\nPerson', action: 'Action description' }])} label="Add rhythm row" />}
      </div>
    </div>
  );
}
