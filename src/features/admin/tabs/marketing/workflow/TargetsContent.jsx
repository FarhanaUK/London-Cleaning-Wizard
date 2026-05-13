import { SLabel, MktMetric, MktAlert, ActionList, Divider, MKT, FONT, SERIF } from './MktShared';

const MONTHLY_TARGETS = [
  { value: '1–3',   label: 'Weeks 1–2'    },
  { value: '4–8',   label: 'Month 1 total' },
  { value: '8–15',  label: 'Month 2 total' },
  { value: '15–25', label: 'Month 3 total' },
];

const TARGET_CARDS = [
  {
    title: 'Month 1 — weeks 1 & 2',
    items: [
      'Google Ads: 30–50 impressions/day, CTR 3–7%',
      '1–2 bookings total',
      'LSA verification submitted',
      'Bark.com profile live',
      "Steven's campaign urgent fixes done",
      'Nextdoor business page set up',
      'Flyers designed and distributed',
    ],
    danger: 'Zero bookings after 2 weeks → copy your Analytics tab data and share it with Claude: "Here is my weekly marketing data, tell me exactly what to fix on each channel."',
  },
  {
    title: 'Month 1 — weeks 3 & 4',
    items: [
      '3–6 bookings total for the month',
      'LSA live and generating 2+ leads/week',
      'At least 1 enquiry from Nextdoor or Facebook',
      'At least 1 new Google review from a real client',
      'Follow up every booking with recurring offer within 24hrs',
    ],
    danger: 'Under 3 bookings → shift £30 from Facebook boost to LSA. Share Analytics tab data with Claude for a full channel-by-channel review.',
    lastItemAmber: true,
  },
  {
    title: 'Month 2',
    items: [
      '6–12 bookings total',
      '1–2 recurring weekly clients confirmed',
      'Switch Google Ads to Maximise Conversions',
      'First TikTok content posted after real clean',
      '5+ Google reviews live',
      'Start building General Residential campaign',
    ],
    danger: 'No recurring clients → send the follow-up message to every past client within 24hrs of their clean. Share Analytics data with Claude for a review.',
  },
  {
    title: 'Month 3 — scaling',
    items: [
      '12–20 bookings total',
      '3–5 recurring weekly clients',
      'Ad spend covered by recurring revenue',
      '10+ Google reviews',
      'Deep Clean campaign built',
      'Recruit 2 more vetted cleaners',
    ],
    danger: 'Bookings plateau → add Airbnb campaign, increase LSA to £200/month, increase Instagram boost to £100/month. Share Analytics data with Claude.',
  },
];

const CAMPAIGNS = [
  { text: 'Campaign 1 (live) — LCW Premium Areas Residential · Farhana · premium London postcodes', tag: 'Now', green: true },
  { text: "Campaign 2 — LCW General Residential · Steven · fix urgently · broader London keywords", tag: 'Month 2' },
  { text: 'Campaign 3 — LCW Airbnb London · Shoreditch, City, Canary Wharf · £75/month', tag: 'Month 3' },
  { text: 'Campaign 4 — LCW Deep Clean London · all London within 8 miles · £75/month', tag: 'Month 3' },
  { text: 'Campaign 5 — LCW Office London · business districts · £50/month', tag: 'Month 4+' },
];

function TargetCard({ card }) {
  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: MKT.gold, marginBottom: 10 }}>{card.title}</div>
      {card.items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, fontFamily: FONT, fontSize: 12, color: MKT.muted, padding: '4px 0', lineHeight: 1.5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: card.lastItemAmber && i === card.items.length - 1 ? MKT.amber : MKT.green, flexShrink: 0, marginTop: 5 }} />
          {item}
        </div>
      ))}
      {card.danger && (
        <div style={{ marginTop: 12 }}>
          <MktAlert type="danger">{card.danger}</MktAlert>
        </div>
      )}
    </div>
  );
}

export default function TargetsContent() {
  return (
    <div>
      <SLabel first>Monthly booking targets</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 4 }}>
        {MONTHLY_TARGETS.map(t => <MktMetric key={t.label} value={t.value} label={t.label} />)}
      </div>

      <Divider />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {TARGET_CARDS.map(card => <TargetCard key={card.title} card={card} />)}
      </div>

      <Divider />
      <SLabel>Google Ads campaigns roadmap</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {CAMPAIGNS.map((c, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: i < CAMPAIGNS.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', fontSize: 13, fontFamily: FONT, color: MKT.muted, lineHeight: 1.5 }}>
              <span style={{ color: MKT.gold, fontSize: 12, flexShrink: 0, marginTop: 2 }}>→</span>
              <span style={{ flex: 1, color: c.green ? MKT.green : MKT.muted }}>{c.text}</span>
              <span style={{ fontSize: 10, background: MKT.dark4, color: MKT.dim, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>{c.tag}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
