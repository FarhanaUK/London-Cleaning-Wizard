import { MktCard, ActionList, SLabel, MktAlert, Divider, MKT, FONT } from './MktShared';

const PAID_FARHANA = [
  {
    title: 'Google Ads — LCW Premium Areas Residential',
    sub: '£150/month · £5/day · premium London postcodes',
    items: [
      { text: 'Check search terms report — add new negatives', tag: 'Every Monday' },
      { text: 'Record impressions, clicks, CTR in Analytics tab', tag: 'Weekly' },
      { text: 'Do NOT change bidding or budget during first 14-day learning phase', tag: 'Days 1–14' },
      { text: 'After 15–30 tracked conversions: switch to Maximise Conversions', tag: 'Month 2' },
      { text: 'Build General Residential campaign once 5–10 bookings confirmed', tag: 'Month 2' },
      { text: 'Future campaigns: Airbnb, Deep Clean, Office, Hourly Clean', tag: 'Month 3+' },
    ],
    alert: { type: 'good', text: 'Live — 99.3% optimisation · 1 booking · 484 impressions · 18 clicks · 3.72% CTR · £44 spent' },
  },
  {
    title: 'Local Services Ads (LSA)',
    sub: '£100/month · pay per lead · Google Guaranteed',
    items: [
      { text: 'Complete identity + insurance verification (2–4 weeks)', tag: 'Urgent' },
      { text: 'Add all London boroughs within 8 miles of E14', tag: 'Once' },
      { text: 'Set weekly budget to £25 once live', tag: 'Once live' },
      { text: 'Respond to every lead within 5 minutes', tag: 'Daily' },
      { text: 'Mark jobs completed to build LSA ranking', tag: 'After every clean' },
    ],
    alert: { type: 'warn', text: 'LSA shows above regular Google Ads. Highest-converting channel once live. Get verification done this week.' },
  },
  {
    title: 'Bark.com',
    sub: '£50/month · active leads ready to book now',
    items: [
      { text: 'Complete profile with photos and description', tag: 'Once' },
      { text: 'Check for new leads daily', tag: 'Daily' },
      { text: 'Only spend credits on leads in your service area', tag: 'Always' },
      { text: 'Respond within 1 hour — first responder wins most leads', tag: 'Daily' },
    ],
  },
];

const PAID_STEVEN = [
  {
    title: "Google Ads — LCW Campaign 2",
    sub: '£100/month · broader London residential keywords',
    ownerType: 's',
    items: [
      { text: 'Remove "#1 London" claim from ad copy', tag: 'Urgent' },
      { text: 'Fix final URL — must go to londoncleaningwizard.com/book', tag: 'Urgent' },
      { text: 'Improve ad strength from "Poor" — add headlines and descriptions', tag: 'Urgent' },
      { text: 'Add all negative keywords from shared master list', tag: 'This week' },
      { text: "Confirm no keyword overlap with Farhana's campaign", tag: 'Every Monday' },
    ],
    alert: { type: 'danger', text: 'Urgent fixes needed before this campaign will work', position: 'top' },
  },
  {
    title: 'Instagram paid boosts',
    sub: '£50/month · boost best performing posts only',
    ownerType: 's',
    items: [
      { text: 'Only boost posts already performing well organically', tag: 'Monthly' },
      { text: 'Target London homeowners aged 28–55 in target postcodes', tag: 'Always' },
      { text: 'Best to boost: before/after, candle reveal, offer deadline posts', tag: 'Monthly' },
      { text: '£5–10/day per boost, run 5–7 days', tag: 'Per boost' },
      { text: 'Record reach and bookings in Analytics tab', tag: 'Weekly' },
    ],
    alert: { type: 'warn', text: "Never boost underperforming posts. Boosting amplifies what's already working." },
  },
  {
    title: 'Facebook paid boosts',
    sub: '£30/month · local London community targeting',
    ownerType: 's',
    items: [
      { text: 'Boost 1–2 posts/month into target London postcodes', tag: 'Monthly' },
      { text: 'Target homeowners/renters 25–55, London, interested in home services', tag: 'Always' },
      { text: 'Best to boost: offer posts, testimonials, before/after photos', tag: 'Monthly' },
      { text: 'Record reach and any bookings in Analytics tab', tag: 'Weekly' },
    ],
  },
  {
    title: 'TikTok paid (month 2 only)',
    sub: '£20/month · only after first real clean is filmed',
    ownerType: 'f',
    items: [
      { text: 'Do NOT spend on TikTok ads until organic content is posted first', tag: 'Month 2' },
      { text: 'Film first real clean — before, during, after, candle and gift reveal', tag: 'First clean' },
      { text: 'Post organically first — if 500+ views then boost it', tag: 'Month 2' },
      { text: 'Target London homeowners/renters aged 22–45', tag: 'When ready' },
    ],
    alert: { type: 'info', text: 'One viral before/after video can bring more bookings than a month of paid ads. Build organic first then boost what resonates.' },
  },
];

const FREE_STEVEN = [
  {
    title: 'Instagram organic',
    sub: '3–4 posts/week · before/after, candle/gift, founder story',
    items: [
      { text: 'Before/after cleaning photos — most engaging content in this niche', tag: '3–4/week' },
      { text: 'The candle, scent and gift — the Signature Touch reveal', tag: 'Weekly' },
      { text: 'Founder story and behind the scenes', tag: 'Weekly' },
      { text: '50% off offer in every caption until 1 June', tag: 'Always' },
      { text: 'Link to londoncleaningwizard.com/book in bio and every post', tag: 'Always' },
      { text: 'TikTok organic — start after first real clean is filmed', tag: 'Month 2' },
    ],
    alert: { type: 'warn', text: 'Never "affordable" or "cheap". Always "reset" not just "clean". Signature Hotel Reset is the hero product.' },
  },
  {
    title: 'Facebook community groups',
    sub: '3–5 posts/week in local London groups',
    items: [
      { text: 'Post in Canary Wharf, Islington, Chelsea, Hackney, Hampstead groups', tag: '3–5/week' },
      { text: 'Mention the specific area in each post', tag: 'Always' },
      { text: 'Include 50% off offer and booking link in every post', tag: 'Always' },
      { text: 'Reply to every comment within 1 hour', tag: 'Daily' },
    ],
  },
  {
    title: 'Nextdoor',
    sub: '1 post/week · set up at business.nextdoor.com',
    items: [
      { text: 'Set up business page at business.nextdoor.com not the personal app', tag: 'Urgent' },
      { text: 'Post Local Deal — 50% off Signature Hotel Reset ends 1 June', tag: '1/week' },
      { text: 'Target postcodes: E14, E1, N1, W1, SW3, SW7, NW3, W8, W11', tag: 'Always' },
      { text: 'Respond to any cleaning requests from neighbours', tag: 'Daily check' },
    ],
  },
];

const FREE_FARHANA = [
  {
    title: 'Google Business Profile',
    sub: '2 fresh posts/week · ask for reviews after every clean',
    items: [
      { text: '2 fresh unique posts per week — never repeat the same post', tag: '2/week' },
      { text: '50% off offer post live until 1 June', tag: 'Live now' },
      { text: 'Reply to every review within 24 hours', tag: 'Always' },
      { text: 'Send review link within 2 hours of every clean completing', tag: 'After every clean' },
      { text: 'Update photos and services monthly', tag: 'Monthly' },
    ],
  },
  {
    title: 'Personal network + flyers',
    sub: 'Free — most underrated channel right now',
    ownerType: 'b',
    items: [
      { text: 'Message every contact in your phone about the launch', tag: 'Once — now' },
      { text: 'WhatsApp status — 50% off offer every week until 1 June', tag: 'Weekly' },
      { text: 'Offer friends/family discounted clean for a genuine Google review', tag: 'This week' },
      { text: 'Design flyer on Canva with QR code to /book — print 500 at Vistaprint (~£30)', tag: 'This week' },
      { text: 'Distribute in Canary Wharf, Wapping, Islington apartment buildings', tag: 'This week' },
      { text: 'Leave flyers with local estate agents', tag: 'This week' },
    ],
  },
];

const DAILY_RHYTHM = [
  { time: 'Morning · 5 min\nFarhana', action: "Check for overnight bookings. Reply to any enquiry immediately — never wait more than 30 minutes." },
  { time: 'Morning · 5 min\nSteven',  action: "Post on Instagram or Facebook. Reply to all comments from the day before." },
  { time: 'Midday · 5 min\nFarhana',  action: "Check Bark.com leads. Respond to anything in your service area within 1 hour." },
  { time: 'Evening · 10 min\nFarhana',action: "Check Google Ads spend, impressions, clicks. Add search term negatives if needed." },
  { time: 'Weekend · priority\nBoth', action: "Be near your phones. Weekends convert at 3x weekday rate. Reply to every enquiry within 10 minutes." },
  { time: 'Monday · 10 min\nBoth',    action: "Share keyword lists. Confirm no campaign overlap. Review previous week. Record numbers in Analytics tab." },
];

export default function WorkflowContent() {
  return (
    <div>
      <div style={{ background: 'rgba(192,91,91,0.08)', border: '0.5px solid rgba(192,91,91,0.3)', borderLeft: '3px solid #c05b5b', borderRadius: '0 8px 8px 0', padding: '0.75rem 1rem', fontSize: 12, fontFamily: FONT, color: '#d9908a', lineHeight: 1.6, marginBottom: 20 }}>
        <strong>Keyword coordination — every Monday.</strong> Farhana owns premium area keywords (cleaner mayfair, cleaner canary wharf, cleaner chelsea etc). Steven owns broader London keywords (house cleaning london, domestic cleaner london etc). If both campaigns bid on the same keywords you compete against each other and push both costs up. Share keyword lists every Monday morning.
      </div>

      <SLabel first>Paid — Farhana</SLabel>
      {PAID_FARHANA.map(card => (
        <MktCard key={card.title} owner="Farhana" ownerType="f" title={card.title} sub={card.sub}>
          <ActionList items={card.items} />
          {card.alert && <div style={{ marginTop: 12 }}><MktAlert type={card.alert.type}>{card.alert.text}</MktAlert></div>}
        </MktCard>
      ))}

      <SLabel>Paid — Steven</SLabel>
      {PAID_STEVEN.map(card => (
        <MktCard key={card.title} owner={card.ownerType === 'f' ? 'Farhana' : 'Steven'} ownerType={card.ownerType || 's'} title={card.title} sub={card.sub}>
          {card.alert?.position === 'top' && <div style={{ marginBottom: 12 }}><MktAlert type={card.alert.type}>{card.alert.text}</MktAlert></div>}
          <ActionList items={card.items} />
          {card.alert && card.alert.position !== 'top' && <div style={{ marginTop: 12 }}><MktAlert type={card.alert.type}>{card.alert.text}</MktAlert></div>}
        </MktCard>
      ))}

      <SLabel>Free — Steven</SLabel>
      {FREE_STEVEN.map(card => (
        <MktCard key={card.title} owner="Steven" ownerType="s" title={card.title} sub={card.sub}>
          <ActionList items={card.items} />
          {card.alert && <div style={{ marginTop: 12 }}><MktAlert type={card.alert.type}>{card.alert.text}</MktAlert></div>}
        </MktCard>
      ))}

      <SLabel>Free — Farhana</SLabel>
      {FREE_FARHANA.map(card => (
        <MktCard key={card.title} owner={card.ownerType === 'b' ? 'Both' : 'Farhana'} ownerType={card.ownerType || 'f'} title={card.title} sub={card.sub}>
          <ActionList items={card.items} />
        </MktCard>
      ))}

      <Divider />
      <SLabel>Daily rhythm</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        {DAILY_RHYTHM.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 12, padding: '10px 0', borderBottom: i < DAILY_RHYTHM.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', fontSize: 12, fontFamily: FONT }}>
            <div style={{ color: MKT.gold, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{row.time}</div>
            <div style={{ color: MKT.muted }}>{row.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
