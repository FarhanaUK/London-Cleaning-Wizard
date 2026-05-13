import { useState } from 'react';
import { SLabel, MktMetric, MktAlert, Divider, MKT, FONT, SERIF } from './MktShared';

const FORECAST_BARS = [
  { label: 'Weeks 1–2',   pct: 8,  text: '1–3 bookings'  },
  { label: 'Weeks 3–4',   pct: 14, text: '2–4 bookings'  },
  { label: 'Weeks 5–6',   pct: 22, text: '3–5 bookings'  },
  { label: 'Weeks 7–8',   pct: 30, text: '4–6 bookings'  },
  { label: 'Weeks 9–10',  pct: 42, text: '5–8 bookings'  },
  { label: 'Weeks 11–12', pct: 55, text: '7–10 bookings' },
];

const MILESTONES = [
  { value: '£500',   label: 'Break even on ad spend',  sub: '~3–4 bookings/month' },
  { value: '£1,000', label: 'First profitable month',  sub: '~6–8 bookings/month' },
  { value: '£3,000', label: 'Scaling point',           sub: '~15–20 bookings/month' },
  { value: '£7,000', label: 'Booking a day',           sub: '30+ bookings + recurring' },
];

// Cumulative booking targets by week (conservative)
const WEEK_TARGETS = {1:1,2:2,3:3,4:5,5:7,6:9,7:11,8:13,9:17,10:21,11:25,12:30};

function calcForecast(week, bookings, recurring, reviews) {
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

export default function ForecastContent() {
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

  return (
    <div>
      <SLabel first>Are we on track for a booking a day?</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
        <p style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7, marginBottom: 14 }}>
          Enter your current numbers. The forecast will tell you if you are on track, ahead, or behind — and what to do.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Current week (1–12)', value: week,      set: setWeek,      placeholder: '2'  },
            { label: 'Total bookings to date', value: bookings, set: setBookings,  placeholder: '1'  },
            { label: 'Recurring clients',    value: recurring, set: setRecurring, placeholder: '0'  },
            { label: 'Google reviews',       value: reviews,   set: setReviews,   placeholder: '5'  },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 }}>{label}</div>
              <input type="number" min="0" placeholder={placeholder} value={value} onChange={e => set(e.target.value)} style={INPUT_STYLE} />
            </div>
          ))}
          <button
            onClick={runForecast}
            style={{ background: 'rgba(201,169,110,0.15)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 16px', color: MKT.gold, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}
          >
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
        {FORECAST_BARS.map(bar => (
          <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0' }}>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, width: 90, flexShrink: 0, textAlign: 'right' }}>{bar.label}</div>
            <div style={{ flex: 1, background: MKT.dark3, borderRadius: 4, height: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${bar.pct}%`, borderRadius: 4, background: 'linear-gradient(90deg, #7fb069, #5a8c48)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#fff' }}>{Math.round(bar.pct / 8)}</span>
              </div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted, width: 80, flexShrink: 0 }}>{bar.text}</div>
          </div>
        ))}
      </div>

      <SLabel>Revenue milestones</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 4 }}>
        {MILESTONES.map(m => <MktMetric key={m.value} value={m.value} label={m.label} sub={m.sub} />)}
      </div>

      <Divider />
      <SLabel>What actually gets you to a booking a day</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
          <div style={{ fontFamily: SERIF, fontSize: 16, color: MKT.gold, marginBottom: 8 }}>The recurring client multiplier</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7 }}>
            Each recurring weekly client at £245/clean equals £12,740 per year. You do not need 365 one-off bookings to reach a booking a day. You need 5–7 solid recurring clients plus regular new one-off bookings. That is achievable by Month 3–4.
          </div>
        </div>
        <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
          <div style={{ fontFamily: SERIF, fontSize: 16, color: MKT.gold, marginBottom: 8 }}>The review flywheel</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7 }}>
            Each new Google review lifts your click-through rate from search. 10+ reviews with a high rating puts you above competitors in local results. Send the review link within 2 hours of every clean — that timing gets a 3x higher response rate. Reviews compound: the more you have, the more you get.
          </div>
        </div>
      </div>
    </div>
  );
}
