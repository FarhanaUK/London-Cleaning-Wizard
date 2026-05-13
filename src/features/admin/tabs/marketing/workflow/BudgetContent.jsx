import { SLabel, MktMetric, ActionList, MKT, FONT, SERIF } from './MktShared';

const BUDGET_ROWS = [
  { name: "Google Ads — Farhana's campaign", owner: 'Farhana', ownerType: 'f', note: 'LCW Premium Areas Residential · £5/day · live and working', amount: 150 },
  { name: "Google Ads — Steven's campaign",  owner: 'Steven',  ownerType: 's', note: 'LCW Campaign 2 · broader London · fix urgently before spending more', amount: 100 },
  { name: 'Local Services Ads (LSA)',         owner: 'Farhana', ownerType: 'f', note: 'Pay per lead · Google Guaranteed badge · £25/week', amount: 100 },
  { name: 'Instagram paid boosts',            owner: 'Steven',  ownerType: 's', note: 'Boost best performing posts only · London homeowners 28–55', amount: 50  },
  { name: 'Bark.com credits',                 owner: 'Farhana', ownerType: 'f', note: 'Active leads from people ready to book now', amount: 50  },
  { name: 'Facebook paid boosts',             owner: 'Steven',  ownerType: 's', note: '1–2 boosted posts/month · local London community targeting', amount: 30  },
  { name: 'TikTok (month 2 only)',            owner: 'Farhana', ownerType: 'f', note: 'Small test budget · start only after first real clean is filmed', amount: 20  },
];

const OWNER_COLOR = {
  f: '#6a9bc4',
  s: '#7fb069',
};

const FREE_CHANNELS = [
  { label: 'Instagram organic', sub: 'Steven' },
  { label: 'Facebook groups',   sub: 'Steven' },
  { label: 'Nextdoor organic',  sub: 'Steven' },
  { label: 'Google Business',   sub: 'Farhana' },
  { label: 'Personal network',  sub: 'Both' },
  { label: 'TikTok organic',    sub: 'Month 2' },
];

const CUT_ORDER = [
  { text: 'Cut TikTok £20 first — it is month 2 anyway, save it until organic content is ready' },
  { text: 'Cut Facebook boost from £30 to £15 — run 1 boosted post instead of 2' },
  { text: 'Cut Bark.com from £50 to £25 — respond to fewer but stay active on the platform' },
  { text: 'Never cut LSA — pay per lead means zero wasted spend even on a tight budget' },
  { text: 'Never cut Google Ads below £75/month per campaign — too little data to learn from' },
];

const SCALE_UP = [
  { text: 'Increase LSA from £100 to £200/month once live and generating 3+ leads/week' },
  { text: "Increase Farhana's Google Ads to £250/month after 15+ tracked conversions confirm it is profitable" },
  { text: 'Scale Instagram boost to £100/month if boosted posts are converting to bookings' },
  { text: 'Scale TikTok to £50/month if organic content gets 1,000+ views consistently' },
];

export default function BudgetContent() {
  return (
    <div>
      <SLabel first>Shared £500/month — full breakdown</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        {BUDGET_ROWS.map(row => (
          <div key={row.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: `0.5px solid rgba(255,255,255,0.04)`, gap: 12 }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text, fontWeight: 500 }}>
                {row.name}{' '}
                <span style={{ fontSize: 10, color: OWNER_COLOR[row.ownerType], marginLeft: 6 }}>{row.owner}</span>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted, marginTop: 2 }}>{row.note}</div>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: MKT.gold, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>£{row.amount}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4, borderTop: `0.5px solid ${MKT.borderStrong}`, fontFamily: FONT, fontSize: 14, fontWeight: 500, color: MKT.text }}>
          <span>Total shared</span>
          <span>£500/month</span>
        </div>
      </div>

      <SLabel>All free channels (zero cost)</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 4 }}>
        {FREE_CHANNELS.map(ch => (
          <MktMetric key={ch.label} value="£0" label={ch.label} sub={ch.sub} />
        ))}
      </div>

      <SLabel>If budget feels too tight — cut in this order</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        <ActionList items={CUT_ORDER} />
      </div>

      <SLabel>When to scale up</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <ActionList items={SCALE_UP} />
      </div>
    </div>
  );
}
