import { useRef, useState } from 'react';
import { MktCard, ActionList, SLabel, MktAlert, Divider, AddBtn, DragHandle, reorder, useDragSort, MKT, FONT, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const DEFAULT_SECTIONS = {
  active: [
    {
      id: 'ac1', ownerType: 'f',
      title: 'Cold calling — letting agents',
      sub: 'Target: property managers and letting agents across London',
      items: [
        { id: 'ac1a', text: 'Aim for 30-40 calls per week minimum — below this you will not see consistent results', tag: 'Weekly target' },
        { id: 'ac1b', text: 'Best call windows: 10am-12pm and 2pm-4pm on weekdays only', tag: 'Every day' },
        { id: 'ac1c', text: 'Opening line: "We have seven five-star Google reviews and we\'re looking to partner with letting agents in the area — do you use external cleaners for your managed properties?"', tag: 'Script' },
        { id: 'ac1d', text: 'If they show interest (ask a question or say "send me info"): email pricing + Google review link the same day before you do anything else', tag: 'Same day' },
        { id: 'ac1e', text: 'Follow up 3-4 days later if no reply to your email', tag: 'Day 3-4' },
        { id: 'ac1f', text: 'Total touchpoints before writing someone off: 3-5 over 4-6 weeks (call, email, call, email, final call)', tag: 'Process' },
        { id: 'ac1g', text: 'Log calls made, answered, interested, and quotes sent in Outreach Tracker every Sunday', tag: 'Weekly' },
      ],
      alert: { type: 'warn', text: 'Realistic expectation: 50-80 calls before a single trial booking. This is a 4-8 week channel. Consistency every week matters more than volume in any single week.' },
    },
    {
      id: 'ac2', ownerType: 'f',
      title: 'Face-to-face visits — letting agents',
      sub: 'Highest-converting channel for this audience — more memorable than a call or email',
      items: [
        { id: 'ac2a', text: 'Before visiting: look up the property manager\'s name on their website — ask for them by name at the door', tag: 'Prep' },
        { id: 'ac2b', text: 'Bring a pricing card with your Google review link printed on it', tag: 'Always' },
        { id: 'ac2c', text: 'Email them before you get back to your car — same day, no exceptions. Subject: "Great to meet you today — London Cleaning Wizard"', tag: 'Same day' },
        { id: 'ac2d', text: 'Call 3 days later to confirm they received your email and ask if they have questions', tag: 'Day 3' },
        { id: 'ac2e', text: 'One more email at week 2 if still no response', tag: 'Week 2' },
        { id: 'ac2f', text: 'Target: 3-5 visits per week', tag: 'Weekly' },
        { id: 'ac2g', text: 'Log visits and same-day follow-ups in Outreach Tracker every Sunday', tag: 'Weekly' },
      ],
      alert: null,
    },
    {
      id: 'ac3', ownerType: 'f',
      title: 'Facebook groups — Airbnb hosts',
      sub: 'Fastest channel — can produce enquiries the same day as the post',
      items: [
        { id: 'ac3a', text: 'Post in 2-3 London Airbnb host Facebook groups per week', tag: '2-3/week' },
        { id: 'ac3b', text: 'Write it as a personal introduction, not an advertisement. It must read like a person, not a business listing.', tag: 'Tone — always' },
        { id: 'ac3c', text: 'Template: "Hi everyone — I\'m a local cleaner in [area] looking to take on 2 Airbnb clients. Happy to do an initial clean at a reduced rate to show the standard. Anyone looking?" Adjust area each time.', tag: 'Post template' },
        { id: 'ac3d', text: 'Do NOT include prices in the post — let people message you', tag: 'Always' },
        { id: 'ac3e', text: 'Reply to every enquiry within 1 hour. Airbnb hosts contact multiple cleaners at once — first to reply has the best chance.', tag: 'Urgent' },
        { id: 'ac3f', text: 'If they go quiet after your reply: one follow-up at 48 hours, then move on', tag: 'Day 2' },
        { id: 'ac3g', text: 'Log posts made and enquiries received in Outreach Tracker every Sunday', tag: 'Weekly' },
      ],
      alert: { type: 'info', text: 'A conversational post gets 1-5 enquiries. A promotional post gets zero. The difference is entirely in the tone — it must not look like a business advert.' },
    },
    {
      id: 'ac4', ownerType: 'f',
      title: 'Email outreach — letting agents',
      sub: 'Cold email to named contacts at letting agencies',
      items: [
        { id: 'ac4a', text: 'Always find the property manager\'s name before emailing — named contacts reply at 3x the rate of generic info@ addresses', tag: 'Always' },
        { id: 'ac4b', text: 'Subject line: "End-of-tenancy cleaning for your managed properties — [their specific area]"', tag: 'Template' },
        { id: 'ac4c', text: 'First line: "We have seven five-star Google reviews and are looking to partner with letting agents in [area] for end-of-tenancy and routine property cleans."', tag: 'Template' },
        { id: 'ac4d', text: 'Keep the email to 3-4 short lines — include your pricing link and Google reviews link', tag: 'Always' },
        { id: 'ac4e', text: 'Realistic reply rate: 2-5% cold. You need to send 100 emails to get 2-5 conversations.', tag: 'Expectation' },
        { id: 'ac4f', text: 'Follow up once at day 5 if no reply. No second follow-up after that.', tag: 'Day 5' },
        { id: 'ac4g', text: 'Log all emails sent and replies received in Outreach Tracker every Sunday', tag: 'Weekly' },
      ],
      alert: null,
    },
  ],
  alwaysOn: [
    {
      id: 'ao1', ownerType: 'f',
      title: 'Google Business Profile',
      sub: '2 posts per week + review request after every clean',
      items: [
        { id: 'ao1a', text: '2 posts per week — keep them fresh, never repeat the same post', tag: '2/week' },
        { id: 'ao1b', text: 'After every clean: send a personal WhatsApp or text with a direct Google review link. Personal message gets 3x the response of a generic ask.', tag: 'After every clean' },
        { id: 'ao1c', text: 'Reply to every review within 24 hours', tag: 'Always' },
        { id: 'ao1d', text: 'Goal: grow from 7 reviews to 20+ over the next 2 months', tag: 'Ongoing' },
        { id: 'ao1e', text: 'Update your photos when you have good before/after shots from a clean', tag: 'Monthly' },
      ],
      alert: null,
    },
    {
      id: 'ao2', ownerType: 'f',
      title: 'Personal network',
      sub: 'The warmest possible leads — do not underestimate this channel',
      items: [
        { id: 'ao2a', text: 'WhatsApp status update weekly — mention you have availability and your Google reviews', tag: 'Weekly' },
        { id: 'ao2b', text: 'Message anyone in your network who manages a property, hosts on Airbnb, or works at an estate agent', tag: 'Ongoing' },
        { id: 'ao2c', text: 'For anyone willing to leave a Google review: offer a first clean at reduced rate — your reviews are worth more than the margin right now', tag: 'When relevant' },
      ],
      alert: null,
    },
  ],
  paused: [
    {
      id: 'pa1', ownerType: 'f',
      title: 'Google Ads — currently paused',
      sub: 'Reactivate once the booking flow conversion issues are fixed',
      items: [
        { id: 'pa1a', text: 'Status: paused. Previous result: 53 visitors from ads, 0 converted — all dropped at service selection.', tag: 'Current status' },
        { id: 'pa1b', text: 'Before reactivating: fix Deep Reset price display — show per-bedroom prices, not just "from £225"', tag: 'Required first' },
        { id: 'pa1c', text: 'Before reactivating: move the 10% house surcharge disclosure to the service card, not after property type selection', tag: 'Required first' },
        { id: 'pa1d', text: 'Before reactivating: confirm ad destination URL goes to the booking flow service page, not the homepage', tag: 'Required first' },
        { id: 'pa1e', text: 'Recommended restart: £5/day to test conversion before increasing budget', tag: 'When ready' },
      ],
      alert: { type: 'warn', text: 'Do not reactivate until the booking flow friction is fixed. The same funnel that produced 0 conversions before will produce 0 conversions again.' },
    },
  ],
};

const DEFAULT_RHYTHM = [
  { id: 'nr1', time: '10am-12pm\nWeekdays',         action: 'Cold calling block — best pick-up rate for letting agents. Target 10-15 calls in this window.' },
  { id: 'nr2', time: '2pm-4pm\nWeekdays',           action: 'Second calling block or face-to-face visits. Send follow-up emails from morning calls if you have not already.' },
  { id: 'nr3', time: 'Same day\nAfter every visit', action: 'Email every business you visited before you get home. No exceptions. Subject: "Great to meet you today — London Cleaning Wizard."' },
  { id: 'nr4', time: 'Evening\nDaily',              action: 'Check Facebook group replies and DMs. Reply to any Airbnb enquiries immediately — speed of reply is the biggest factor in converting these leads.' },
  { id: 'nr5', time: 'After every clean\nFarhana',  action: 'Send client a personal WhatsApp with your Google review link. Do it while the clean is still fresh in their mind.' },
  { id: 'nr6', time: 'Sunday evening\nFarhana',     action: 'Log the week in the Outreach Tracker tab — calls, emails, Facebook posts, visits, enquiries received. The reading cannot be accurate without weekly data.' },
  { id: 'nr7', time: 'Monday · 10 min\nFarhana',    action: 'Review last week\'s numbers. Which channel produced responses? Double that activity this week. Which produced nothing? Adjust the approach, not the volume.' },
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
  const [active,   setActive]   = usePersisted('mkt_active_v2',      DEFAULT_SECTIONS.active);
  const [alwaysOn, setAlwaysOn] = usePersisted('mkt_always_on_v2',   DEFAULT_SECTIONS.alwaysOn);
  const [paused,   setPaused]   = usePersisted('mkt_paused_v2',      DEFAULT_SECTIONS.paused);
  const [rhythm,   setRhythm]   = usePersisted('mkt_daily_rhythm_v2', DEFAULT_RHYTHM);

  const dragSrc  = useRef(null);
  const [overInfo, setOverInfo] = useState(null);

  const { dragHandlers: rhDrag, isOver: rhOver } = useDragSort(rhythm, setRhythm);

  const sectionState = {
    active:   { cards: active,   setCards: setActive   },
    alwaysOn: { cards: alwaysOn, setCards: setAlwaysOn },
    paused:   { cards: paused,   setCards: setPaused   },
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
      <CardSection label="Active channels" sectionKey="active"   cards={active}   setCards={setActive}   editMode={editMode} first makeDragHandlers={makeDragHandlers} isCardOver={isCardOver} />
      <CardSection label="Always on"       sectionKey="alwaysOn" cards={alwaysOn} setCards={setAlwaysOn} editMode={editMode}       makeDragHandlers={makeDragHandlers} isCardOver={isCardOver} />
      <CardSection label="Paused"          sectionKey="paused"   cards={paused}   setCards={setPaused}   editMode={editMode}       makeDragHandlers={makeDragHandlers} isCardOver={isCardOver} />

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
