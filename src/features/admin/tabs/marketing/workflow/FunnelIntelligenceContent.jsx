import { useState, useMemo } from 'react';
import { MKT, FONT, SERIF, SLabel } from './MktShared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLastStep(session) {
  const events = [...(session.events || [])].sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  let last = null;
  for (const e of events) { if (e.type === 'step_entered') last = e.step; }
  return last;
}

function getSource(session) {
  return session.utm?.channel || session.utm?.source || 'Direct / Unknown';
}

function getDateStr(session) {
  return session.date || (session.updatedAt?.seconds
    ? new Date(session.updatedAt.seconds * 1000).toISOString().slice(0, 10)
    : null);
}

function periodFilter(sessions, days) {
  if (days === 0) return sessions;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return sessions.filter(s => {
    const d = getDateStr(s);
    return d && d >= cutoffStr;
  });
}

const STEP_ORDER = ['Landing', 'Service', 'Property', 'Schedule', 'Checkout', 'Confirm'];

function stepRank(step) {
  if (!step) return -1;
  const idx = STEP_ORDER.findIndex(s => step.toLowerCase().includes(s.toLowerCase()));
  return idx === -1 ? STEP_ORDER.length : idx;
}

// ── Insight generation ────────────────────────────────────────────────────────

function generateReading(sessions, bookings) {
  const total = sessions.length;
  if (total === 0) return null;

  const converted = sessions.filter(s => s.converted).length;
  const dropped   = total - converted;
  const convRate  = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';

  // Drop stage breakdown
  const stageCounts = {};
  sessions.filter(s => !s.converted).forEach(s => {
    const step = getLastStep(s) || 'Unknown';
    stageCounts[step] = (stageCounts[step] || 0) + 1;
  });
  const stages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);
  const topStage = stages[0];

  // Source breakdown
  const sourceCounts = {};
  sessions.forEach(s => {
    const src = getSource(s);
    if (!sourceCounts[src]) sourceCounts[src] = { total: 0, converted: 0, stages: {} };
    sourceCounts[src].total++;
    if (s.converted) sourceCounts[src].converted++;
    const step = getLastStep(s) || 'Unknown';
    sourceCounts[src].stages[step] = (sourceCounts[src].stages[step] || 0) + 1;
  });
  const sources = Object.entries(sourceCounts).sort((a, b) => b[1].total - a[1].total);
  const topSource = sources[0];

  // ── Build narrative ──
  const lines = [];

  // Headline
  if (converted === 0) {
    lines.push({ type: 'headline', text: `${total} visitor${total !== 1 ? 's' : ''}, 0 bookings. Every single one dropped.` });
  } else {
    lines.push({ type: 'headline', text: `${total} visitor${total !== 1 ? 's' : ''}, ${converted} booking${converted !== 1 ? 's' : ''} — ${convRate}% conversion rate.` });
  }

  // Top drop stage insight
  if (topStage) {
    const [stage, count] = topStage;
    const pct = Math.round((count / dropped) * 100);
    const stageLower = stage.toLowerCase();

    let insight = '';
    if (stageLower.includes('landing')) {
      insight = `${pct}% of drop-offs are happening right at the landing page. The ad or link is getting the click, but the first impression isn't connecting — people are arriving and leaving immediately. This is almost always a mismatch between what the ad promised and what the page delivers, or the page takes too long to communicate the value.`;
    } else if (stageLower.includes('service')) {
      insight = `${pct}% of drop-offs are at the Service page — people got past the landing, which means they were interested. Something about the service options, pricing, or framing is where the hesitation kicks in. This is the most important page to look at right now.`;
    } else if (stageLower.includes('schedule') || stageLower.includes('property')) {
      insight = `${pct}% of drop-offs are at the ${stage} step — people got deep into the funnel before leaving. This is a high-intent signal. They wanted to book but something in the form or the scheduling process stopped them. Small friction here (too many fields, no preferred time available, uncertainty) can kill a conversion at this stage.`;
    } else if (stageLower.includes('checkout') || stageLower.includes('confirm')) {
      insight = `${pct}% of drop-offs are at Checkout — these are your warmest visitors. They went almost all the way. A price surprise, a missing trust signal, or a confusing payment step is likely the reason. These are the people closest to converting.`;
    } else {
      insight = `${pct}% of drop-offs are at the ${stage} stage.`;
    }
    lines.push({ type: 'insight', label: `Top drop-off: ${stage}`, text: insight });
  }

  // Source-specific insights
  sources.slice(0, 3).forEach(([src, data]) => {
    const srcDropStages = Object.entries(data.stages).sort((a, b) => b[1] - a[1]);
    const topSrcStage = srcDropStages[0]?.[0] || 'unknown stage';
    const convPct = data.total > 0 ? ((data.converted / data.total) * 100).toFixed(0) : '0';
    const srcLower = src.toLowerCase();

    let text = '';
    if (srcLower.includes('google ads') || srcLower.includes('google_ads')) {
      if (data.converted === 0 && data.total >= 5) {
        const stgLower = topSrcStage.toLowerCase();
        let fixHow = '';
        if (stgLower.includes('service') || stgLower === '2') {
          fixHow = `Pricing is already visible on the service selection page, so that is not the problem. The specific friction points: (1) Deep Reset shows "from £225" with a 4-10 hour range but no upper limit — price ambiguity at the premium end pushes people out; show realistic prices per bedroom size instead. (2) Houses get a 10% surcharge that only appears after property type is selected — an unexpected price increase mid-flow causes abandonment; disclose this on the service card, not after. (3) The page opens with a Home/Commercial tab choice — if Google Ads are sending residential traffic, pre-select the Home tab so visitors land directly on the relevant options. Fix these three points and test with a small budget before scaling spend again.`;
        } else if (stgLower.includes('landing') || stgLower === '1') {
          fixHow = `Your homepage already has a starting price ("from £115") and trust signals, so those are not the issue. The most likely cause for landing-page drops is that Google Ads traffic is going to the homepage rather than directly into the booking flow — check your ad destination URLs and point them to the service selection step instead, which puts visitors one click closer to booking.`;
        } else if (stgLower.includes('checkout') || stgLower.includes('confirm')) {
          fixHow = `People got all the way to Checkout and left. This is the most recoverable drop-off. To fix it: (1) show the total price before the payment step — surprises at checkout lose the sale; (2) add a cancellation policy line near the submit button ("Free cancellation up to 24 hours before"); (3) make sure the payment page loads inline rather than redirecting — a redirect breaks trust at the critical moment; (4) reduce required fields to the minimum needed to actually book.`;
        } else {
          fixHow = `Before running more spend, review the ${topSrcStage} page for: unclear pricing, missing trust signals, a booking button that requires scrolling to find, or anything that adds uncertainty at the moment of decision.`;
        }
        text = `Sent ${data.total} visitor${data.total !== 1 ? 's' : ''}, 0 converted — all dropped at the ${topSrcStage} stage. The ad is working (people clicked through). The page is not converting them. Pause spend until the page issue is resolved. ${fixHow}`;
      } else {
        text = `Sent ${data.total} visitor${data.total !== 1 ? 's' : ''}, ${data.converted} converted (${convPct}%). Most dropped at ${topSrcStage}.`;
      }
    } else if (srcLower.includes('organic') || srcLower.includes('google organic')) {
      text = `Organic visitors reached ${topSrcStage} before dropping — these are higher-intent people who found you through search without an ad. If organic visitors are dropping at Service, your service page is the problem, not your traffic quality.`;
    } else if (srcLower.includes('tiktok')) {
      if (data.total > 0 && stepRank(topSrcStage) >= stepRank('Schedule')) {
        text = `Your TikTok visitor went the furthest of anyone, reaching ${topSrcStage}. Social and visual content may resonate better with your audience than search ads for a premium brand. Worth noting.`;
      } else {
        text = `TikTok sent ${data.total} visitor${data.total !== 1 ? 's' : ''}, dropped at ${topSrcStage}.`;
      }
    } else if (srcLower.includes('instagram')) {
      text = `Instagram sent ${data.total} visitor${data.total !== 1 ? 's' : ''}, dropped at ${topSrcStage}. Visual content from Instagram can work well for a premium service — consider whether the page they landed on matched the aesthetic of the post.`;
    } else {
      text = `${src}: ${data.total} visitor${data.total !== 1 ? 's' : ''}, ${data.converted} converted. Most dropped at ${topSrcStage}.`;
    }
    lines.push({ type: 'source', label: src, text });
  });

  // Suggestions — generated per traffic source so advice always matches the actual drop
  const suggestions = [];

  sources.forEach(([src, data]) => {
    if (data.total < 3) return;
    const srcDropStages = Object.entries(data.stages).sort((a, b) => b[1] - a[1]);
    const topSrcDrop    = srcDropStages[0]?.[0]?.toLowerCase() || '';
    const srcLower      = src.toLowerCase();
    const isAds         = srcLower.includes('google ads') || srcLower.includes('google_ads');
    const isDirect      = srcLower.includes('direct') || srcLower.includes('unknown');
    const isOrganic     = srcLower.includes('organic');

    if (isAds && data.converted === 0) {
      if (topSrcDrop.includes('service') || topSrcDrop === '2') {
        suggestions.push(`Google Ads — ${data.total} visitor${data.total !== 1 ? 's' : ''}, 0 converted, all stopped at service selection. Pricing is visible on this step so that is not the issue. Three specific friction points to fix: (1) Deep Reset shows "from £225" with a 4-10 hour window but no upper cost — for a premium service, an unclear maximum is as off-putting as no price at all; show the realistic range per bedroom size instead. (2) Houses get a 10% surcharge that only appears after the visitor selects property type — a price increase mid-flow reads as a hidden fee and causes abandonment; disclose the surcharge on the service card before selection. (3) The page opens with a Home/Commercial tab choice; if your ads target residential clients, pre-select the Home tab so visitors land on the right packages immediately.`);
      } else if (topSrcDrop.includes('landing') || topSrcDrop === '1') {
        suggestions.push(`Google Ads — ${data.total} visitor${data.total !== 1 ? 's' : ''} dropped at the landing page. Your homepage already has a starting price and trust signals. The most likely cause is the ad destination URL — check that your Google Ads point directly to the service selection step in the booking flow, not the homepage. Paid traffic landing on the homepage has one extra click to reach booking, which costs conversions.`);
      } else if (topSrcDrop.includes('property')) {
        suggestions.push(`Google Ads — ${data.total} visitor${data.total !== 1 ? 's' : ''} dropped at property details. These visitors got past the price and started to commit. The property step collects address, floor, parking, pets, and bathroom count all at once. The fastest fix: reduce this step to postcode and property type only, and collect the rest after payment is confirmed.`);
      } else if (topSrcDrop.includes('checkout')) {
        suggestions.push(`Google Ads — ${data.total} visitor${data.total !== 1 ? 's' : ''} dropped at checkout. These are your warmest leads. The checkout currently has approximately 15-20 fields before the payment section. The highest-impact change: let visitors pay first with the minimum required details, then collect address and preferences in a post-booking step.`);
      }
    }

    if ((isDirect || isOrganic) && data.converted === 0) {
      if (topSrcDrop.includes('landing') || topSrcDrop === '1') {
        suggestions.push(`${src} — ${data.total} visitor${data.total !== 1 ? 's' : ''}, all dropped at the homepage. Your hero has a starting price and trust signals, so those are not the cause. Two friction points specific to organic/direct traffic: (1) The six service cards on the homepage show no prices — visitors browsing your services have to enter the booking flow just to see a cost; adding "from £X" to each card removes that barrier. (2) Two equal-weight CTAs (residential booking and commercial quote) sit side by side — one clear primary action outperforms two competing ones.`);
      } else if (topSrcDrop.includes('service') || topSrcDrop === '2') {
        suggestions.push(`${src} — ${data.total} visitor${data.total !== 1 ? 's' : ''} dropped at service selection. These visitors clicked through from your homepage, which means the homepage worked. The same friction applies here as for paid traffic: Deep Clean price ambiguity and the house surcharge appearing after selection are the most likely causes.`);
      } else if (topSrcDrop.includes('property')) {
        suggestions.push(`${src} — ${data.total} visitor${data.total !== 1 ? 's' : ''} dropped at property details. Form length at this step is the most likely cause — see the note above about reducing property details to the minimum before payment.`);
      } else if (topSrcDrop.includes('checkout')) {
        suggestions.push(`${src} — ${data.total} visitor${data.total !== 1 ? 's' : ''} dropped at checkout. Checkout form length is the likely cause — moving non-essential fields to after payment would reduce abandonment here.`);
      }
    }
  });

  if (converted === 0 && total >= 10) {
    suggestions.push(`${total} visitors and 0 bookings across all sources. Fix the highest-volume drop stage first (shown in the chart above) before sending more traffic — more visitors through a broken funnel produces the same result.`);
  }

  if (sources.some(([s]) => s.toLowerCase().includes('tiktok') || s.toLowerCase().includes('instagram'))) {
    suggestions.push('Social visitors are in browse mode. A softer CTA — "Get a free quote" or "See our packages" — converts better than a direct booking form link.');
  }

  return { total, converted, dropped, convRate, stages, sources, lines, suggestions };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReadingCard({ lines }) {
  return (
    <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      {lines.map((line, i) => {
        if (line.type === 'headline') return (
          <div key={i} style={{ padding: '16px 20px', borderBottom: `0.5px solid ${MKT.border}`, background: 'rgba(201,169,110,0.06)' }}>
            <div style={{ fontFamily: SERIF, fontSize: 17, color: MKT.gold, lineHeight: 1.5 }}>{line.text}</div>
          </div>
        );
        if (line.type === 'insight') return (
          <div key={i} style={{ padding: '14px 20px', borderBottom: `0.5px solid ${MKT.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.gold, marginBottom: 6 }}>{line.label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{line.text}</div>
          </div>
        );
        if (line.type === 'source') return (
          <div key={i} style={{ padding: '12px 20px', borderBottom: `0.5px solid ${MKT.border}`, display: 'flex', gap: 12 }}>
            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: MKT.gold, whiteSpace: 'nowrap', paddingTop: 2, minWidth: 90, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{line.label}</span>
            <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{line.text}</span>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function StatPill({ label, value, sub, highlight }) {
  return (
    <div style={{ background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MKT.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: highlight || MKT.text }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StageBar({ stage, count, total, rank }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899'];
  const color = colors[rank % colors.length];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.text }}>{stage}</span>
        <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>{count} dropped ({pct}%)</span>
      </div>
      <div style={{ height: 5, background: MKT.dark3, borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'All time', days: 0 },
];

export default function FunnelIntelligenceContent({ funnelData = [], bookings = [] }) {
  const [periodIdx, setPeriodIdx] = useState(1);
  const { days } = PERIODS[periodIdx];

  const sessions = useMemo(() => periodFilter(funnelData, days), [funnelData, days]);
  const reading  = useMemo(() => generateReading(sessions, bookings), [sessions, bookings]);

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => setPeriodIdx(i)} style={{
            fontFamily: FONT, fontSize: 12, padding: '5px 14px', borderRadius: 6,
            border: `0.5px solid ${i === periodIdx ? MKT.gold : MKT.border}`,
            background: i === periodIdx ? 'rgba(201,169,110,0.1)' : 'transparent',
            color: i === periodIdx ? MKT.gold : MKT.dim,
            cursor: 'pointer',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {!reading ? (
        <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.dim, padding: '32px 0' }}>
          No visitor data yet for this period. Data appears here as visitors arrive via your booking funnel.
        </div>
      ) : (
        <>
          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            <StatPill label="Visitors" value={reading.total} />
            <StatPill label="Bookings" value={reading.converted} highlight={reading.converted > 0 ? MKT.green : undefined} />
            <StatPill label="Conversion" value={`${reading.convRate}%`} highlight={parseFloat(reading.convRate) === 0 ? '#ef4444' : MKT.green} sub={reading.converted === 0 ? 'No bookings yet' : undefined} />
            <StatPill label="Top drop stage" value={reading.stages[0]?.[0] || '—'} highlight="#f97316" />
          </div>

          {/* Auto reading */}
          <SLabel first>This period's reading <span style={{ display: 'inline-block', fontFamily: 'system-ui,sans-serif', fontSize: 8, color: '#c9a96e', background: 'rgba(201,169,110,0.12)', border: '0.5px solid rgba(201,169,110,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', textTransform: 'none', fontWeight: 500, verticalAlign: 'middle' }}>AI Adviser</span></SLabel>
          <ReadingCard lines={reading.lines} />

          {/* Drop stage breakdown */}
          {reading.stages.length > 0 && (
            <>
              <SLabel>Where people are dropping</SLabel>
              <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
                {reading.stages.map(([stage, count], i) => (
                  <StageBar key={stage} stage={stage} count={count} total={reading.dropped} rank={i} />
                ))}
              </div>
            </>
          )}

          {/* Source breakdown */}
          {reading.sources.length > 0 && (
            <>
              <SLabel>Traffic sources</SLabel>
              <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                {reading.sources.map(([src, data], i) => (
                  <div key={src} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px', gap: 12, padding: '11px 20px', borderBottom: i < reading.sources.length - 1 ? `0.5px solid ${MKT.border}` : 'none', alignItems: 'center' }}>
                    <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text, fontWeight: 500 }}>{src}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim }}>visitors</div>
                      <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text, fontWeight: 600 }}>{data.total}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim }}>booked</div>
                      <div style={{ fontFamily: FONT, fontSize: 13, color: data.converted > 0 ? MKT.green : MKT.muted, fontWeight: 600 }}>{data.converted}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim }}>rate</div>
                      <div style={{ fontFamily: FONT, fontSize: 13, color: data.converted > 0 ? MKT.green : '#ef4444', fontWeight: 600 }}>
                        {data.total > 0 ? `${((data.converted / data.total) * 100).toFixed(0)}%` : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Suggestions */}
          {reading.suggestions.length > 0 && (
            <>
              <SLabel>What to do next <span style={{ display: 'inline-block', fontFamily: 'system-ui,sans-serif', fontSize: 8, color: '#c9a96e', background: 'rgba(201,169,110,0.12)', border: '0.5px solid rgba(201,169,110,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', textTransform: 'none', fontWeight: 500, verticalAlign: 'middle' }}>AI Adviser</span></SLabel>
              <div style={{ background: MKT.dark2, border: `0.5px solid rgba(201,169,110,0.25)`, borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
                {reading.suggestions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < reading.suggestions.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
                    <span style={{ color: MKT.gold, flexShrink: 0, fontFamily: FONT, fontSize: 13 }}>→</span>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{s}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
