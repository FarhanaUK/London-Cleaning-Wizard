import { useState } from 'react';
import { SLabel, MktMetric, MktAlert, Divider, AddBtn, DragHandle, useDragSort, MKT, FONT, SERIF, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const DEFAULT_BARS = [
  { id: 'b1', label: 'Weeks 1–2',   pct: 8,  text: '1–3 bookings'  },
  { id: 'b2', label: 'Weeks 3–4',   pct: 14, text: '2–4 bookings'  },
  { id: 'b3', label: 'Weeks 5–6',   pct: 22, text: '3–5 bookings'  },
  { id: 'b4', label: 'Weeks 7–8',   pct: 30, text: '4–6 bookings'  },
  { id: 'b5', label: 'Weeks 9–10',  pct: 42, text: '5–8 bookings'  },
  { id: 'b6', label: 'Weeks 11–12', pct: 55, text: '7–10 bookings' },
];

const DEFAULT_MILESTONES = [
  { id: 'm1', value: '£500',   label: 'Break even on ad spend',  sub: '~3–4 bookings/month' },
  { id: 'm2', value: '£1,000', label: 'First profitable month',  sub: '~6–8 bookings/month' },
  { id: 'm3', value: '£3,000', label: 'Scaling point',           sub: '~15–20 bookings/month' },
  { id: 'm4', value: '£7,000', label: 'Booking a day',           sub: '30+ bookings + recurring' },
];

const DEFAULT_CARDS = [
  { id: 'c1', title: 'The recurring client multiplier', body: 'Each recurring weekly client at £245/clean equals £12,740 per year. You do not need 365 one-off bookings to reach a booking a day. You need 5–7 solid recurring clients plus regular new one-off bookings. That is achievable by Month 3–4.' },
  { id: 'c2', title: 'The review flywheel', body: 'Each new Google review lifts your click-through rate from search. 10+ reviews with a high rating puts you above competitors in local results. Send the review link within 2 hours of every clean — that timing gets a 3x higher response rate. Reviews compound: the more you have, the more you get.' },
];

const WEEK_TARGETS = {
  1:1,  2:2,  3:3,  4:5,  5:7,  6:9,  7:11, 8:13, 9:17, 10:21, 11:25, 12:30,
  13:34,14:38,15:43,16:48,17:53,18:59,19:65,20:72,21:79,22:86, 23:94, 24:102,
};

function calcForecast(week, bookings) {
  const expected = WEEK_TARGETS[week] || 0;
  const diff = bookings - expected;
  if (diff >= 3)  return { type: 'good',   msg: `Ahead by ${diff} bookings. Keep the current approach and stay consistent. Consider pushing recurring conversations harder now.` };
  if (diff >= 0)  return { type: 'good',   msg: `On track. ${bookings} bookings in week ${week} is right where you should be. Focus on converting one-off clients to recurring.` };
  if (diff >= -2) return { type: 'warn',   msg: `Slightly behind — ${Math.abs(diff)} booking${Math.abs(diff) > 1 ? 's' : ''} short of the target for week ${week}. Double down on personal network and Facebook groups — these are the fastest channels right now.` };
  return { type: 'danger', msg: `Behind target by ${Math.abs(diff)} bookings. Share your Analytics tab data with Claude for a channel-by-channel review. Focus all energy on LSA and personal outreach this week.` };
}

const INPUT_STYLE = {
  background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6,
  padding: '5px 10px', color: MKT.text, fontSize: 13, fontFamily: FONT,
  width: 80, outline: 'none',
};

export default function ForecastContent({ editMode }) {
  const [bars,       setBars]       = usePersisted('mkt_forecast_bars',       DEFAULT_BARS);
  const [milestones, setMilestones] = usePersisted('mkt_forecast_milestones', DEFAULT_MILESTONES);
  const [cards,      setCards]      = usePersisted('mkt_forecast_cards',      DEFAULT_CARDS);
  const { dragHandlers: barDrag, isOver: barOver } = useDragSort(bars, setBars);

  const [week,      setWeek]      = useState('');
  const [bookings,  setBookings]  = useState('');
  const [recurring, setRecurring] = useState('');
  const [reviews,   setReviews]   = useState('');
  const [status,    setStatus]    = useState(null);

  function runForecast() {
    const w = parseInt(week);
    const b = parseInt(bookings);
    if (!w || !b) return;
    setStatus(calcForecast(w, b, parseInt(recurring) || 0, parseInt(reviews) || 0));
  }

  function updateBar(id, changes) { setBars(bs => bs.map(b => b.id === id ? { ...b, ...changes } : b)); }
  function updateCard(id, changes) { setCards(cs => cs.map(c => c.id === id ? { ...c, ...changes } : c)); }

  return (
    <div>
      <SLabel first>Are we on track for a booking a day?</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
        <p style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7, marginBottom: 14 }}>
          Enter your current numbers. The forecast will tell you if you are on track, ahead, or behind — and what to do.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Current week (1–24)', value: week,      set: setWeek,      placeholder: '2'  },
            { label: 'Total bookings to date', value: bookings, set: setBookings,  placeholder: '1'  },
            { label: 'Recurring clients',    value: recurring, set: setRecurring, placeholder: '0'  },
            { label: 'Google reviews',       value: reviews,   set: setReviews,   placeholder: '5'  },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 }}>{label}</div>
              <input type="number" min="0" placeholder={placeholder} value={value} onChange={e => set(e.target.value)} style={INPUT_STYLE} />
            </div>
          ))}
          <button onClick={runForecast} style={{ background: 'rgba(201,169,110,0.15)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 16px', color: MKT.gold, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>
            Update forecast
          </button>
        </div>
      </div>

      {status && (
        <div style={{ marginBottom: 14 }}>
          <MktAlert type={status.type}>{status.msg}</MktAlert>
        </div>
      )}

      <SLabel>12-week booking forecast — with all channels active</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, marginBottom: 12 }}>Conservative estimates based on £500/month shared budget + free channel activity</div>
        {bars.map((bar, bi) => (
          <div key={bar.id} {...barDrag(bi)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', outline: barOver(bi) ? `1px dashed rgba(201,169,110,0.4)` : 'none' }}>
            <DragHandle />
            {editMode ? (
              <>
                <input value={bar.label} onChange={e => updateBar(bar.id, { label: e.target.value })} style={{ ...EDIT_INPUT, width: 90, flexShrink: 0, textAlign: 'right' }} />
                <div style={{ flex: 1, background: MKT.dark3, borderRadius: 4, height: 20, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, bar.pct)}%`, borderRadius: 4, background: 'linear-gradient(90deg, #7fb069, #5a8c48)' }} />
                </div>
                <input type="number" value={bar.pct} onChange={e => updateBar(bar.id, { pct: parseFloat(e.target.value) || 0 })} style={{ ...EDIT_INPUT, width: 50, flexShrink: 0 }} placeholder="%" />
                <input value={bar.text} onChange={e => updateBar(bar.id, { text: e.target.value })} style={{ ...EDIT_INPUT, width: 90, flexShrink: 0 }} />
                <button onClick={() => setBars(bs => bs.filter(b => b.id !== bar.id))} style={DEL_BTN}>×</button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, width: 90, flexShrink: 0, textAlign: 'right' }}>{bar.label}</div>
                <div style={{ flex: 1, background: MKT.dark3, borderRadius: 4, height: 20, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, bar.pct)}%`, borderRadius: 4, background: 'linear-gradient(90deg, #7fb069, #5a8c48)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#fff' }}>{Math.round(bar.pct / 8)}</span>
                  </div>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted, width: 80, flexShrink: 0 }}>{bar.text}</div>
              </>
            )}
          </div>
        ))}
        {editMode && <AddBtn onClick={() => setBars(bs => [...bs, { id: genId(), label: 'Weeks X–Y', pct: 10, text: 'N bookings' }])} label="Add row" />}
      </div>

      <SLabel>Revenue milestones</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 4 }}>
        {milestones.map(m => (
          <div key={m.id} style={{ position: 'relative' }}>
            {editMode && <button onClick={() => setMilestones(ms => ms.filter(x => x.id !== m.id))} style={{ ...DEL_BTN, position: 'absolute', top: 4, right: 4, fontSize: 14, zIndex: 1 }}>×</button>}
            <MktMetric value={m.value} label={m.label} sub={m.sub} editMode={editMode} onUpdate={changes => setMilestones(ms => ms.map(x => x.id === m.id ? { ...x, ...changes } : x))} />
          </div>
        ))}
        {editMode && (
          <div onClick={() => setMilestones(ms => [...ms, { id: genId(), value: '£0', label: 'New milestone', sub: '' }])} style={{ background: MKT.dark3, border: '1px dashed rgba(201,169,110,0.3)', borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer', color: MKT.dim, fontSize: 12, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            + Add milestone
          </div>
        )}
      </div>

      <Divider />
      <SLabel>What actually gets you to a booking a day</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {cards.map(card => (
          <div key={card.id} style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', position: 'relative' }}>
            {editMode ? (
              <>
                <button onClick={() => setCards(cs => cs.filter(c => c.id !== card.id))} style={{ ...DEL_BTN, position: 'absolute', top: 10, right: 10 }}>×</button>
                <input value={card.title} onChange={e => updateCard(card.id, { title: e.target.value })} style={{ ...EDIT_INPUT, fontFamily: SERIF, fontSize: 16, color: MKT.gold, marginBottom: 8 }} />
                <textarea value={card.body} onChange={e => updateCard(card.id, { body: e.target.value })} style={{ ...EDIT_INPUT, resize: 'vertical', minHeight: 80, borderBottom: 'none', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 4, padding: '6px 8px', fontSize: 13, lineHeight: 1.7, color: MKT.muted, background: MKT.dark3, width: '100%', boxSizing: 'border-box' }} />
              </>
            ) : (
              <>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: MKT.gold, marginBottom: 8 }}>{card.title}</div>
                <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7 }}>{card.body}</div>
              </>
            )}
          </div>
        ))}
        {editMode && (
          <div onClick={() => setCards(cs => [...cs, { id: genId(), title: 'New insight', body: 'Add your insight here.' }])} style={{ background: MKT.card, border: '1px dashed rgba(201,169,110,0.3)', borderRadius: 10, padding: '1.25rem', cursor: 'pointer', color: MKT.dim, fontSize: 12, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
            + Add card
          </div>
        )}
      </div>
    </div>
  );
}
