import { useState, useEffect } from 'react';
import { MKT, FONT, SLabel, MktAlert } from './MktShared';

function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}

const DEFAULT_AVG_JOB = 165;

// Spend field IDs tracked in weekly analytics
const WEEKLY_CHANNEL_SPEND = [
  { label: "Farhana's Google Ads", spendId: 'f5', bookingsId: 'f6' },
  { label: "Steven's Google Ads",  spendId: 'g6', bookingsId: 'g4' },
  { label: 'LSA',                  spendId: 'lsa5', bookingsId: 'lsa3' },
];

function cpaStatus(cpa, target) {
  if (cpa < 30)         return { label: 'Excellent',            color: MKT.green };
  if (cpa <= target)    return { label: 'On target',            color: MKT.green };
  if (cpa <= target * 1.75) return { label: 'Above target — monitor', color: MKT.amber };
  return                       { label: 'Pause or fix',         color: MKT.red   };
}

function roasStatus(roas) {
  if (roas >= 3) return { label: 'Scale it',    color: MKT.green };
  if (roas >= 1) return { label: 'Monitor',     color: MKT.amber };
  return                { label: 'Fix or pause', color: MKT.red  };
}

function readNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

function allocateBudget(channels, adBudget, cpaTarget, avgJob, disabledIds = new Set()) {
  const MIN_KEEP = 30;

  const rows = channels
    .filter(c => c.spend !== '' || c.bookings !== '')
    .map(ch => {
      const spend    = readNum(ch.spend);
      const bookings = readNum(ch.bookings);
      const cpa      = spend > 0 && bookings > 0 ? spend / bookings : null;
      const roas     = spend > 0 && bookings > 0 ? (bookings * avgJob) / spend : null;

      let tier, base, reason, canScale;

      if (disabledIds.has(ch.id)) {
        tier = 'disabled'; base = 0; canScale = false;
        reason = 'Set to inactive. Budget redistributed to active channels.';
      } else if (spend > 0 && bookings === 0) {
        tier = 'fix'; base = MIN_KEEP; canScale = false;
        reason = 'No bookings recorded yet — hold at £' + MIN_KEEP + '/month minimum while you check setup. Do not increase until bookings come in. See action plan for steps.';
      } else if (bookings > 0 && bookings < 5) {
        tier = 'testing'; base = spend || MIN_KEEP; canScale = false;
        reason = 'Only ' + bookings + ' booking' + (bookings !== 1 ? 's' : '') + ' — keep running at current budget. Need 5+ bookings before CPA is reliable enough to adjust spend.';
      } else if (roas !== null && roas < 1) {
        tier = 'pause'; base = 0; canScale = false;
        reason = 'ROAS ' + roas.toFixed(1) + 'x — losing money. Pause and fix before spending more.';
      } else if (cpa !== null && cpa > cpaTarget * 1.75) {
        tier = 'fix'; base = MIN_KEEP; canScale = false;
        reason = 'CPA £' + cpa.toFixed(0) + ' — too high. Keep at £' + MIN_KEEP + '/month minimum while fixing targeting.';
      } else if (cpa !== null && cpa > cpaTarget) {
        tier = 'hold'; base = spend; canScale = false;
        reason = 'CPA £' + cpa.toFixed(0) + ' — above target. Hold at £' + spend + ' and optimise before increasing.';
      } else if (cpa !== null && cpa <= cpaTarget) {
        tier = 'scale'; base = spend; canScale = true;
        reason = cpa < 30
          ? 'CPA £' + cpa.toFixed(0) + ' — excellent. Each £50 extra should generate ~' + Math.round((bookings / spend) * 50) + ' booking' + (Math.round((bookings / spend) * 50) !== 1 ? 's' : '') + '.'
          : 'CPA £' + cpa.toFixed(0) + ' — on target. Ready to grow.';
      } else {
        tier = 'testing'; base = spend || MIN_KEEP; canScale = false;
        reason = 'No data yet. Keep running at current budget and check setup is correct.';
      }

      return { id: ch.id, label: ch.label, current: spend, bookings, cpa, roas, tier, recommended: base, canScale, reason };
    });

  // Freed budget from disabled channels — always redistributes to scale channels
  const freedFromDisabled = rows
    .filter(r => r.tier === 'disabled')
    .reduce((s, r) => s + r.current, 0);

  // Budget headroom from total cap (may be 0 or negative if already over budget)
  const baseTotal     = rows.reduce((s, r) => s + r.recommended, 0);
  const budgetRoom    = Math.max(0, adBudget - baseTotal);

  // Total available to distribute = freed from paused + any budget headroom
  const toDistribute  = freedFromDisabled + budgetRoom;

  // Distribute in £50 chunks to scale channels
  const result = rows.map(r => ({ ...r }));
  let surplus  = 0;
  if (toDistribute > 0) {
    let remaining = toDistribute;
    let pass = 0;
    while (remaining >= 50 && pass < 20) {
      let given = false;
      for (const r of result) {
        if (r.canScale && remaining >= 50) {
          r.recommended += 50;
          remaining -= 50;
          given = true;
        }
      }
      if (!given) break;
      pass++;
    }
    surplus = remaining;
  }

  // If surplus remains — check if any paused channels could be retested with a minimum budget
  const shouldHold = surplus > 0;
  const holdReason = (() => {
    if (surplus <= 0) return null;
    const activeRows   = result.filter(r => r.tier !== 'disabled');
    const testingRows  = activeRows.filter(r => r.tier === 'testing');
    const genuinelyRed = activeRows.filter(r => r.tier === 'pause' || r.tier === 'fix');
    const hasScale     = activeRows.some(r => r.tier === 'scale');
    const disabledAmt  = result.filter(r => r.tier === 'disabled').reduce((s, r) => s + r.current, 0);
    const prefix       = disabledAmt > 0 ? '£' + Math.round(disabledAmt) + ' freed from paused channels. ' : '';

    // Testing channels = thin data, keep running — NOT underperforming
    if (testingRows.length > 0 && !hasScale && genuinelyRed.length === 0) {
      return prefix + 'Your active channels are gathering data — keep them running at their current budgets. Hold the remaining £' + Math.round(surplus) + ' in reserve. Do not open new campaigns with it yet. Reinvest once a channel hits 5+ bookings and CPA below £' + cpaTarget + '.';
    }
    // All genuinely failing, nothing scaling
    if (genuinelyRed.length > 0 && !hasScale) {
      return prefix + 'Active channels are not producing bookings. Hold £' + Math.round(surplus) + ' — do not reinvest until at least one channel hits CPA below £' + cpaTarget + ' for 4+ weeks. Focus on fixing the setup of existing channels before spending more.';
    }
    // Has some scale, some surplus left over
    if (hasScale && surplus > 0) {
      return 'Remaining £' + Math.round(surplus) + ' held in reserve — not enough for a full £50 increase on any channel. Keep it until next month\'s review.';
    }
    return null;
  })();

  const totalAllocated = result.reduce((s, r) => s + r.recommended, 0);
  return { rows: result, totalAllocated, reserve: Math.max(0, surplus), holdReason, shouldHold };
}

const TIER_COLOR = { pause: MKT.red, fix: MKT.amber, hold: MKT.muted, scale: MKT.green, testing: MKT.blue, disabled: MKT.dim };
const TIER_LABEL = { pause: 'Pause', fix: 'Fix first', hold: 'Hold steady', scale: 'Scale', testing: 'Keep running', disabled: 'Inactive' };

function BudgetAllocator({ channels, cpaTarget, avgJob, totalBudget }) {
  const [adBudget, setAdBudget] = useState(() => {
    try { return parseFloat(localStorage.getItem('roi_ad_budget')) || totalBudget || 0; } catch { return totalBudget || 0; }
  });
  const [disabled, setDisabled] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('roi_disabled_channels')) || []); } catch { return new Set(); }
  });

  useEffect(() => {
    if (totalBudget > 0 && adBudget === 0) setAdBudget(totalBudget);
  }, [totalBudget]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveAdBudget(v) {
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0) { setAdBudget(n); localStorage.setItem('roi_ad_budget', String(n)); }
  }

  function toggleDisabled(id) {
    setDisabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('roi_disabled_channels', JSON.stringify([...next]));
      return next;
    });
  }

  const active = channels.filter(c => c.spend !== '' || c.bookings !== '');
  if (!active.length) return (
    <>
      <SLabel>Budget allocator</SLabel>
      <MktAlert type="info" style={{ marginBottom: 14 }}>Enter your monthly spend and bookings in the Analytics tab to generate a budget allocation.</MktAlert>
    </>
  );

  const { rows, totalAllocated, reserve, holdReason } = allocateBudget(active, adBudget, cpaTarget, avgJob, disabled);
  const overBudget = totalAllocated > adBudget;
  const disabledCount = rows.filter(r => r.tier === 'disabled').length;

  return (
    <>
      <SLabel>Budget allocator</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>

        {/* Budget input */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 6 }}>Total ad budget £/month</div>
            <input type="number" min="0" value={adBudget} onChange={e => saveAdBudget(e.target.value)} style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 10px', color: MKT.text, fontSize: 14, fontFamily: FONT, width: 120, outline: 'none' }} />
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>Pulled from Budget tab total — edit there or override here to test scenarios</div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', paddingTop: 4 }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Recommended spend</div>
              <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, color: overBudget ? MKT.red : MKT.text }}>£{totalAllocated}</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Hold in reserve</div>
              <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, color: reserve > 0 ? MKT.amber : MKT.muted }}>£{Math.round(reserve)}</div>
            </div>
            {disabledCount > 0 && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Inactive</div>
                <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, color: MKT.dim }}>{disabledCount}</div>
              </div>
            )}
          </div>
        </div>

        {/* Allocation table */}
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 110px 100px', gap: 8, paddingBottom: 8, borderBottom: `0.5px solid ${MKT.borderStrong}`, marginBottom: 4 }}>
          {['', 'Channel', 'Current £', 'Recommended £', 'Decision'].map(h => (
            <span key={h} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim }}>{h}</span>
          ))}
        </div>
        {rows.map((row, ri) => {
          const isDisabled = row.tier === 'disabled';
          const col   = TIER_COLOR[row.tier] || MKT.muted;
          const delta = row.recommended - row.current;
          return (
            <div key={row.id || row.label || ri} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 110px 100px', gap: 8, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)', alignItems: 'start', opacity: isDisabled ? 0.5 : 1 }}>
              <div style={{ paddingTop: 2 }}>
                <input
                  type="checkbox"
                  checked={!isDisabled}
                  onChange={() => toggleDisabled(row.id)}
                  title={isDisabled ? 'Set active' : 'Set inactive'}
                  style={{ cursor: 'pointer', accentColor: MKT.blue, width: 14, height: 14 }}
                />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: isDisabled ? MKT.dim : MKT.text }}>{row.label}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted, marginTop: 3, lineHeight: 1.5 }}>{row.reason}</div>
              </div>
              <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted }}>£{row.current}</span>
              <div>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: isDisabled ? MKT.dim : col }}>£{row.recommended}</span>
                {!isDisabled && delta !== 0 && (
                  <span style={{ fontFamily: FONT, fontSize: 11, color: delta > 0 ? MKT.green : MKT.red, marginLeft: 6 }}>
                    {delta > 0 ? '+' : ''}£{delta}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: isDisabled ? MKT.dim : col }}>{TIER_LABEL[row.tier]}</span>
            </div>
          );
        })}

        {/* Reserve explanation */}
        {reserve > 0 && holdReason && (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(217,119,6,0.06)', border: `0.5px solid rgba(217,119,6,0.25)`, borderRadius: 8 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.amber, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Why hold £{Math.round(reserve)} back</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.7 }}>{holdReason}</div>
          </div>
        )}

        {/* Over budget warning */}
        {overBudget && (() => {
          const freedFromDisabled = rows.filter(r => r.tier === 'disabled').reduce((s, r) => s + r.current, 0);
          const scaleRows    = rows.filter(r => r.tier === 'scale');
          const nonScaleActive = rows.filter(r => r.tier !== 'disabled' && r.tier !== 'scale' && r.tier !== 'pause');
          const shortfall    = totalAllocated - adBudget;
          const neededCut    = Math.max(0, shortfall - freedFromDisabled);
          return (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(220,38,38,0.06)', border: `0.5px solid rgba(220,38,38,0.25)`, borderRadius: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.red, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Over budget by £{shortfall}</div>
              {freedFromDisabled > 0 && (
                <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.7, marginBottom: 6 }}>
                  Pausing channels freed <strong style={{ color: MKT.text }}>£{freedFromDisabled}</strong>, but active channels still need £{totalAllocated} total — leaving you £{shortfall} over budget. The freed budget cannot redistribute to scale channels until the active channel totals fit within your budget first.
                </div>
              )}
              <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.7 }}>
                <strong style={{ color: MKT.text }}>To fix this:</strong>
              </div>
              <div style={{ marginTop: 6 }}>
                {scaleRows.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'flex-start' }}>
                    <span style={{ color: MKT.green, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>1.</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>Keep {scaleRows.map(r => r.label).join(' and ')} at their current spend — these are your best performers and should not be cut.</span>
                  </div>
                )}
                {nonScaleActive.length > 0 && neededCut > 0 && (
                  <div style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'flex-start' }}>
                    <span style={{ color: MKT.amber, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{scaleRows.length > 0 ? '2.' : '1.'}</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>
                      Reduce spend on {nonScaleActive.map(r => r.label).join(', ')} — these are in "keep running" or "hold" mode. Cutting their Analytics spend to match your Budget tab entries frees the £{neededCut} shortfall. Once the totals match your budget, the freed money from paused channels will automatically flow to your scale channels.
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'flex-start' }}>
                  <span style={{ color: MKT.dim, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{scaleRows.length > 0 || neededCut > 0 ? '3.' : '1.'}</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, lineHeight: 1.6 }}>Or increase your total budget from £{adBudget} to at least £{totalAllocated} to accommodate all active channels at their current levels.</span>
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 11, color: MKT.dim, lineHeight: 1.6 }}>
          Once you have your recommended figures, update the individual channel amounts in the Budget tab. This allocator recalculates every time your channel performance data changes.
        </div>
      </div>
    </>
  );
}

function generateActionPlan(channels, cpaTarget, avgJob, totalBudget) {
  const actions = [];
  const totalCurrentSpend = channels.reduce((s, c) => s + readNum(c.spend), 0);
  const budgetRoom = totalBudget > 0 ? totalBudget - totalCurrentSpend : null;

  // Pre-scan: identify channels being paused/reduced so freed budget can be referenced
  let freedBudget = 0;
  const scaleCandidates = [];
  channels.forEach(ch => {
    const spend = readNum(ch.spend), bookings = readNum(ch.bookings);
    const cpa = spend > 0 && bookings > 0 ? spend / bookings : null;
    if (spend > 0 && bookings === 0) freedBudget += spend;
    else if (cpa !== null && cpa > cpaTarget * 1.75) freedBudget += spend * 0.3;
    else if (cpa !== null && cpa < 30) scaleCandidates.push(ch.label);
  });

  channels.forEach(ch => {
    const spend    = readNum(ch.spend);
    const bookings = readNum(ch.bookings);
    const cpa      = spend > 0 && bookings > 0 ? spend / bookings : null;
    const roas     = spend > 0 && bookings > 0 ? (bookings * avgJob) / spend : null;
    const isGoogle = ch.label.toLowerCase().includes('google') || ch.label.toLowerCase().includes('ads');
    const isLSA    = ch.label.toLowerCase().includes('lsa');
    const isBark   = ch.label.toLowerCase().includes('bark');

    // No spend — skip
    if (spend === 0 && bookings === 0) return;

    // Thin data — bookings exist but too few to make CPA decisions
    if (bookings > 0 && bookings < 5) {
      const isGoogle = ch.label.toLowerCase().includes('google') || ch.label.toLowerCase().includes('ads');
      const isLSA    = ch.label.toLowerCase().includes('lsa');
      actions.push({
        priority: 'mechanics',
        channel: ch.label,
        headline: 'Only ' + bookings + ' booking' + (bookings !== 1 ? 's' : '') + ' — check setup before making budget decisions',
        diagnosis: 'CPA from ' + bookings + ' booking' + (bookings !== 1 ? 's' : '') + ' is not reliable enough to act on. You need at least 5 bookings per channel before CPA means anything. Right now the right question is not "is this expensive?" — it is "is this channel working correctly?" Focus on the mechanics.',
        steps: isGoogle ? [
          'Open Google Ads. Check all campaigns are approved and showing — look for any Limited or Disapproved flags.',
          'Go to Tools > Conversions. Confirm your conversion tag is firing correctly. If it shows "No recent conversions" alongside real bookings, your tracking is broken and your data is wrong.',
          'Open the Search Terms report. Are the queries relevant to cleaning in London? Pause anything clearly irrelevant.',
          'Check your landing page on your phone. Does it load fast? Is there a clear "Book now" button above the fold?',
          'Do not change your budget until you have 5+ bookings. More budget on a setup that is not working correctly just wastes more money faster.',
        ] : isLSA ? [
          'Check your LSA dashboard — are leads appearing? If yes, are you responding within 30 minutes? Slow response directly lowers your ranking.',
          'Check your Google Business Profile — LSA pulls reviews from there. You need 5+ reviews to rank competitively.',
          'Make sure your service area and categories are set correctly in the LSA dashboard.',
          'Hold budget steady until you reach 5 bookings. Then you can compare CPA meaningfully.',
        ] : [
          'Check whether bookings from this channel are being recorded correctly.',
          'Review your profile, targeting, and response speed on this channel.',
          'Hold budget steady. 5+ bookings needed before CPA is meaningful enough to make decisions.',
        ],
      });
      return;
    }

    // Spend but zero bookings
    if (spend > 0 && bookings === 0) {
      const steps = isGoogle ? [
        'Check Google Ads — are your ads approved and showing? Go to Ads tab and look for any disapproval warnings.',
        'Check your conversion tracking — go to Tools > Conversions and confirm it is recording correctly.',
        'Open the Search Terms report — look for irrelevant search queries eating your budget with no intent to book.',
        'If ads are running normally and tracking is correct, pause the worst-performing keywords.',
        'Do not increase budget. Hold at £' + spend + '/month until you get a first booking.',
      ] : isLSA ? [
        'Check your LSA dashboard — are leads coming in? If yes, are you responding within 1 hour?',
        'Slow response time directly lowers your LSA ranking. Respond to every lead within 30 minutes.',
        'Check your Google Business Profile — LSA pulls your reviews from there. You need 5+ reviews to rank well.',
        'If no leads at all, check your service area and category settings in the LSA dashboard.',
      ] : isBark ? [
        'Bark charges per lead, not per booking. Zero bookings means leads are not converting.',
        'Review your Bark profile — add photos, improve your description, and make sure your response time is under 1 hour.',
        'Stop buying new leads until you have improved your profile. Bark rewards fast responses and strong profiles.',
        'When you re-engage, respond to leads within 5 minutes — conversion rate drops sharply after that.',
      ] : [
        'No bookings recorded. Check whether this channel is being tracked correctly.',
        'If spend is confirmed and bookings are genuinely zero, pause this channel and redirect budget.',
      ];
      actions.push({
        priority: 'urgent',
        channel: ch.label,
        headline: 'No bookings — £' + spend + ' spent with zero return',
        diagnosis: 'You are spending £' + spend + ' this month and getting nothing back. This needs to be fixed or paused before you spend another penny.',
        steps,
      });
      return;
    }

    // ROAS below 1x — losing money
    if (roas !== null && roas < 1) {
      const steps = isGoogle ? [
        'Open Search Terms report in Google Ads. Pause every term that is unrelated to cleaning — these are draining your budget.',
        'Check which keywords have spent more than £' + cpaTarget + ' with zero conversions in the last 30 days. Pause them immediately.',
        'Do NOT pause the whole campaign yet — you need it running to gather data while you fix it.',
        'Reduce your daily budget by 30% this week to limit further losses while you make fixes.',
        'Test one new ad headline this week focused on your specific service area and price point.',
        'Check back in 2 weeks. If ROAS is still below 1x after fixes, pause and redirect budget to your best-performing channel.',
      ] : [
        'Reduce spend on this channel by 50% immediately.',
        'Do not pause completely — run at reduced budget for 2 more weeks to confirm the pattern.',
        'If ROAS stays below 1x after 2 weeks at reduced budget, pause and redirect to your best channel.',
      ];
      actions.push({
        priority: 'urgent',
        channel: ch.label,
        headline: 'Losing money — ROAS ' + roas.toFixed(1) + 'x (spending more than you earn)',
        diagnosis: 'For every £1 spent on ' + ch.label + ' you are earning back £' + roas.toFixed(2) + '. You need to be above £1 to break even, and above £3 to scale. Right now this channel is costing you money.',
        steps,
      });
      return;
    }

    // CPA above 1.75x ceiling — high but not losing money
    if (cpa !== null && cpa > cpaTarget * 1.75) {
      const steps = isGoogle ? [
        'Do not increase budget. Fix first, then scale.',
        'Go to Search Terms report. Pause any term that has spent more than £' + cpaTarget + ' with zero conversions.',
        'Check your Quality Score for each keyword — below 6/10 means Google is charging you more per click.',
        'Review your ad copy — make sure headlines mention your area and service type specifically.',
        'Check your landing page. Does it load in under 3 seconds? Is there a clear "Book now" button above the fold?',
        'Run these fixes for 2 weeks. If CPA drops below £' + Math.round(cpaTarget * 1.75) + ', hold budget steady. If not, reduce by 25%.',
      ] : [
        'Do not increase budget on this channel.',
        'Review how leads are being generated and what is causing low conversion.',
        'Hold for 2 more weeks. If CPA does not improve, reduce budget by 25% and redirect to your best channel.',
      ];
      actions.push({
        priority: 'high',
        channel: ch.label,
        headline: 'CPA too high — £' + cpa.toFixed(0) + ' per booking (target: £' + cpaTarget + ')',
        diagnosis: 'You are spending £' + cpa.toFixed(0) + ' to acquire each booking. Your target is £' + cpaTarget + '. This is ' + ((cpa / cpaTarget - 1) * 100).toFixed(0) + '% above target. You are not losing money but you are not profitable enough to scale.',
        steps,
      });
      return;
    }

    // CPA amber — above target but within 1.75x
    if (cpa !== null && cpa > cpaTarget) {
      actions.push({
        priority: 'monitor',
        channel: ch.label,
        headline: 'Above target — £' + cpa.toFixed(0) + ' CPA (target: £' + cpaTarget + ')',
        diagnosis: 'CPA is above your £' + cpaTarget + ' target but not critical. Hold budget steady and make small optimisations. Do not increase spend until CPA improves.',
        steps: [
          'Hold budget at £' + spend + '/month — do not increase.',
          isGoogle ? 'Check Search Terms once this week and pause any irrelevant queries.' : 'Review your targeting and messaging.',
          'Review again in 2 weeks. If CPA drops below £' + cpaTarget + ', you can increase budget by £25/month.',
          'If CPA stays the same or rises, treat as high priority and follow the fix steps above.',
        ],
      });
      return;
    }

    // CPA excellent (< £30)
    if (cpa !== null && cpa < 30) {
      const newBudget = Math.round(spend + 50);
      const extraBkgs = Math.round((bookings / spend) * 50);
      const hasRoom   = budgetRoom === null || budgetRoom >= 50;
      const freedNote = freedBudget >= 50 ? ' You can fund this increase using budget freed from underperforming channels — no extra spend needed.' : '';
      const budgetNote = !hasRoom && freedBudget < 50 ? ' Note: this increase would exceed your total budget. Pause a red channel first to free up the funds.' : '';
      actions.push({
        priority: 'scale',
        channel: ch.label,
        headline: 'Excellent — CPA £' + cpa.toFixed(0) + ' · ROAS ' + (roas ? roas.toFixed(1) + 'x' : '—'),
        diagnosis: ch.label + ' is performing well below your CPA target. This channel has earned more budget.' + freedNote + budgetNote,
        steps: [
          'Increase budget from £' + spend + ' to £' + newBudget + '/month (+£50).' + (freedBudget >= 50 ? ' Take this from the budget freed by pausing/reducing red channels.' : ''),
          'At your current conversion rate, the extra £50 should generate approximately ' + extraBkgs + ' additional booking' + (extraBkgs !== 1 ? 's' : '') + '.',
          'Monitor for 2 weeks. If bookings grow proportionally, increase by another £50.',
          'If bookings do not grow after the increase — or CPA rises — check your Impression Share in Google Ads (Columns > Competitive metrics). Above 75% means you have already captured most searches in your area. At that point, more budget brings in vaguer, lower-quality traffic. The fix is not more spend — it is expanding reach: new postcodes, new service types (end of tenancy, office cleaning), or a different channel. Do not keep increasing budget into a ceiling.',
          totalBudget > 0 ? 'Your total budget is £' + totalBudget + '/month. After this increase, total spend across all channels will be £' + (totalCurrentSpend + 50) + '/month.' : '',
        ].filter(Boolean),
      });
      return;
    }

    // CPA on target
    if (cpa !== null && cpa <= cpaTarget) {
      const hasRoom = budgetRoom === null || budgetRoom >= 25;
      actions.push({
        priority: 'good',
        channel: ch.label,
        headline: 'On target — CPA £' + cpa.toFixed(0) + ' · ROAS ' + (roas ? roas.toFixed(1) + 'x' : '—'),
        diagnosis: ch.label + ' is hitting your CPA target. Consider a small increase to test whether bookings grow proportionally.' + (!hasRoom && freedBudget < 25 ? ' You are close to your total budget — pause a red channel first to free funds.' : ''),
        steps: [
          hasRoom || freedBudget >= 25 ? 'Increase budget by £25/month and monitor for 2 weeks.' : 'Hold budget steady until you free funds from underperforming channels.',
          'If bookings grow at a similar rate, increase by another £25.',
          'If CPA rises above £' + cpaTarget + ' after the increase, hold and do not increase further.',
          totalBudget > 0 ? 'Total budget: £' + totalBudget + '/month · current total spend: £' + totalCurrentSpend + '/month.' : '',
        ].filter(Boolean),
      });
    }
  });

  // Cross-channel reallocation summary
  if (freedBudget > 0 && scaleCandidates.length > 0) {
    actions.unshift({
      priority: 'urgent',
      channel: 'Reallocation plan',
      headline: '£' + Math.round(freedBudget) + '/month to reallocate from underperforming channels',
      diagnosis: 'Some channels are not earning their budget. Freeing that spend and moving it to your best-performing channels is the fastest way to improve your overall ROI without increasing total spend.',
      steps: [
        'Pause or reduce the red channels listed below — this frees approximately £' + Math.round(freedBudget) + '/month.',
        'Allocate £50 of that to: ' + scaleCandidates.join(', ') + ' — your current best-performing channel' + (scaleCandidates.length > 1 ? 's' : '') + '.',
        'Hold the remaining £' + Math.max(0, Math.round(freedBudget) - 50) + ' in reserve. Do not reinvest it until you have 4 more weeks of data showing the reallocation is working.',
        totalBudget > 0 ? 'Total budget: £' + totalBudget + '/month. This reallocation does not require any additional spend — it is a redistribution only.' : 'Do not increase total spend during this reallocation. Fix first, scale later.',
      ].filter(Boolean),
    });
  }

  // Sort: urgent first, then high, monitor, good, scale
  const order = { urgent: 0, high: 1, monitor: 2, good: 3, scale: 4 };
  return actions.sort((a, b) => (order[a.priority] ?? 5) - (order[b.priority] ?? 5));
}

const PRIORITY_STYLE = {
  urgent:    { label: 'Urgent',        bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.3)',   color: MKT.red,   dot: MKT.red   },
  high:      { label: 'Fix this',      bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.3)',   color: MKT.amber, dot: MKT.amber },
  monitor:   { label: 'Monitor',       bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.2)', color: MKT.muted, dot: MKT.muted },
  good:      { label: 'Scale',         bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.25)',  color: MKT.green, dot: MKT.green },
  scale:     { label: 'Scale now',     bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.25)',  color: MKT.green, dot: MKT.green },
  mechanics: { label: 'Check setup',   bg: 'rgba(37,99,235,0.05)',   border: 'rgba(37,99,235,0.15)',  color: MKT.blue,  dot: MKT.blue  },
};

function ActionPlan({ channels, cpaTarget, avgJob, totalBudget }) {
  const [open, setOpen] = useState(new Set());
  const actions = generateActionPlan(channels, cpaTarget, avgJob, totalBudget);

  if (!actions.length) {
    return (
      <>
        <SLabel>Action plan</SLabel>
        <MktAlert type="info" style={{ marginBottom: 14 }}>
          No channel data yet. Enter your monthly spend and bookings in the Analytics tab to generate your action plan.
        </MktAlert>
      </>
    );
  }

  function toggle(i) { setOpen(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; }); }

  return (
    <>
      <SLabel>Action plan — based on your current data</SLabel>
      <div style={{ marginBottom: 14 }}>
        {actions.map((action, i) => {
          const st     = PRIORITY_STYLE[action.priority] || PRIORITY_STYLE.monitor;
          const isOpen = open.has(i);
          return (
            <div key={i} style={{ background: st.bg, border: `0.5px solid ${st.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }} onClick={() => toggle(i)}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: st.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{st.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim }}>·</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim }}>{action.channel}</span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text, marginTop: 2 }}>{action.headline}</div>
                  {isOpen && (
                    <>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginTop: 8, lineHeight: 1.7 }}>{action.diagnosis}</div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim, marginBottom: 6 }}>Steps to take</div>
                        {action.steps.map((step, si) => (
                          <div key={si} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: si < action.steps.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                            <span style={{ fontFamily: FONT, fontSize: 12, color: st.color, fontWeight: 600, flexShrink: 0, minWidth: 18 }}>{si + 1}.</span>
                            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <span style={{ color: MKT.dim, fontSize: 14, flexShrink: 0, marginTop: 2 }}>{isOpen ? '▴' : '▾'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PhaseGuide({ history, cpaTarget, budgetRows, channels }) {
  const recentWeeks = [...history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const avgMonthly = recentWeeks.length
    ? recentWeeks.reduce((s, w) => s + (parseFloat(w.all?.l1) || parseFloat(w.bookings) || 0), 0) / recentWeeks.length * 4.33
    : 0;

  // Read monthly booking targets from Targets tab
  const savedTargets = (() => {
    try { return JSON.parse(localStorage.getItem('mkt_targets_monthly')) || []; } catch { return []; }
  })();
  function parseTargetUpper(value) {
    const parts = String(value).split(/[–\-—]/);
    return parseInt(parts[parts.length - 1]) || 30;
  }
  // First target whose upper bound is still above current monthly average = active milestone
  const activeTarget = savedTargets.find(t => avgMonthly < parseTargetUpper(t.value));
  const phase1 = activeTarget !== undefined || (savedTargets.length === 0 && avgMonthly < 30);

  // Derive budget context from real rows
  const totalBudget   = budgetRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const googleRows    = budgetRows.filter(r => r.name?.toLowerCase().includes('google'));
  const totalGoogle   = googleRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const googlePct     = totalBudget > 0 ? Math.round((totalGoogle / totalBudget) * 100) : 0;
  const nonGoogleRows = budgetRows.filter(r => !r.name?.toLowerCase().includes('google'));

  // Channels with 5+ bookings that could actually scale
  const scaleReady = (channels || []).filter(c => readNum(c.bookings) >= 5 && readNum(c.spend) > 0);

  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ background: phase1 ? 'rgba(37,99,235,0.12)' : 'rgba(22,163,74,0.12)', borderRadius: 6, padding: '3px 10px', fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: phase1 ? MKT.blue : MKT.green }}>
          {phase1
            ? (activeTarget ? `${activeTarget.label} — Target: ${activeTarget.value} bookings/month` : 'Phase 1 — Reaching 30 bookings/month')
            : 'All targets hit — optimising for growth'}
        </div>
        {recentWeeks.length > 0 && (
          <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>
            Current average: ~{Math.round(avgMonthly)} bookings/month
          </span>
        )}
      </div>

      {phase1 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.text, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>What CPA tells you right now</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8 }}>
              <strong style={{ color: MKT.green }}>Which channel is cheapest</strong> — relative signal only. At under 5 bookings per channel, it's a direction, not a fact.<br />
              <strong style={{ color: MKT.green }}>Sanity check</strong> — if CPA is above the job value, you're paying more to get the booking than you earn from it. That always needs fixing regardless of data size.
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.muted, marginTop: 12, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>What CPA cannot tell you yet</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, lineHeight: 1.8 }}>
              Whether to confidently scale a channel (need 15+ bookings)<br />
              Precise optimization decisions (5 bookings = one bad week swings it)<br />
              ROAS is estimated — not real revenue per channel
            </div>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.amber, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Under 5 bookings — what to do</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8, marginBottom: 8 }}>
              The action plan shows <strong style={{ color: MKT.blue }}>Check Setup</strong> cards — these are your Phase 1 instructions. Follow them, they are not placeholders. CPA-based cards (Fix This, Scale Now) only appear once you have enough data for them to mean something.
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8, marginBottom: 10 }}>
              The budget allocator shows <strong style={{ color: MKT.blue }}>Keep running</strong> — hold current spend and don't change amounts until 5+ bookings per channel. Use the checkbox next to any channel to pause it — budget redistributes to active channels automatically.
            </div>
            {[
              'Are ads approved and running? Check for Disapproved or Limited flags.',
              'Is conversion tracking firing? Go to Tools > Conversions in Google Ads.',
              'Are search terms relevant? Open Search Terms report and pause anything off-topic.',
              'Is the landing page working? Load it on your phone — fast load, clear "Book now" button.',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'flex-start' }}>
                <span style={{ color: MKT.amber, fontWeight: 700, fontSize: 11, flexShrink: 0, marginTop: 1 }}>→</span>
                <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8 }}>
          You're hitting your monthly targets. CPA and ROAS are now reliable signals for budget decisions — provided individual channels have 10+ bookings each. Use the action plan below to decide where to scale, hold, or cut. Next step: expand reach with new postcodes, service types, or channels — more budget on the same campaign returns diminishing results at this stage.
        </div>
      )}

      {/* Google bid recommendation vs CPA */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `0.5px solid ${MKT.border}` }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.amber, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>When Google recommends increasing your bid</div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8, marginBottom: 10 }}>
          Google Ads regularly suggests raising your bids or daily budget because your impression share is low — meaning competitors are outbidding you and your ads are not showing for every relevant search. This sounds urgent. It is not always right to follow it.
          <br /><br />
          <strong style={{ color: MKT.text }}>Google optimises for clicks and spend. It does not know your CPA target of £{cpaTarget}.</strong> Check your own numbers first:
        </div>
        {[
          {
            label: 'CPA above target — do not follow the recommendation',
            note: 'If you are already spending £' + cpaTarget + '+ per booking, raising bids means you pay more per click for the same or worse results. Fix your targeting and conversion rate first, then consider bids.',
            color: MKT.red,
          },
          {
            label: 'Under 5 bookings — hold, do not act on it',
            note: 'Google does not know whether your ads are converting. Its recommendation is based on auction competition, not your business results. Wait until you have 5+ bookings to judge whether higher bids are justified.',
            color: MKT.amber,
          },
          {
            label: 'CPA on target or below — worth testing carefully',
            note: 'If bookings are coming in at or under £' + cpaTarget + ' each, a small bid increase (10–15% only) may capture more of those searches. Increase and monitor CPA for 2 weeks. If CPA stays on target, the increase was right. If CPA rises, revert.',
            color: MKT.green,
          },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'flex-start' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0, marginTop: 4 }} />
            <div>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: row.color, marginBottom: 3 }}>{row.label}</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.7 }}>{row.note}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 10, fontFamily: FONT, fontSize: 11, color: MKT.dim, lineHeight: 1.7 }}>
          Also check <strong style={{ color: MKT.text }}>why</strong> impression share is low. Go to Campaigns &gt; Columns &gt; Competitive metrics. If "Lost IS (budget)" is high, your daily budget is running out before the day ends — a budget increase may help. If "Lost IS (rank)" is high, your bids are too low — only increase if CPA is on target.
        </div>
      </div>

      {/* Ceiling tip — contextual to their actual budget */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `0.5px solid ${MKT.border}` }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.text, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>When scaling hits a ceiling</div>

        {/* Budget snapshot if data exists */}
        {googleRows.length > 0 && totalBudget > 0 && (
          <div style={{ background: MKT.dark3, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 6 }}>Your current Google Ads spend vs total budget</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
              {googleRows.map(r => (
                <span key={r.id} style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                  {r.name}: <strong style={{ color: MKT.text }}>£{r.amount}/month</strong>
                </span>
              ))}
              <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                Total Google: <strong style={{ color: googlePct >= 60 ? MKT.amber : MKT.text }}>£{totalGoogle}/month ({googlePct}% of your £{totalBudget} budget)</strong>
              </span>
            </div>
            {googlePct >= 60 && (
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.amber, marginTop: 6 }}>
                Google Ads already takes {googlePct}% of your total budget. Before increasing further, check Impression Share — you may already be near the ceiling for your area.
              </div>
            )}
            {scaleReady.length > 0 && (
              <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.green, marginTop: 6 }}>
                {scaleReady.map(c => c.label).join(', ')} {scaleReady.length === 1 ? 'has' : 'have'} 5+ bookings — scaling is worth considering if CPA is on target.
              </div>
            )}
          </div>
        )}

        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8 }}>
          If you increase {googleRows.length > 0 ? googleRows.map(r => r.name).join(' or ') : 'a Google Ads campaign'} and CPA rises instead of staying flat — open Google Ads, go to <strong style={{ color: MKT.text }}>Columns &gt; Competitive metrics</strong> and check your <strong style={{ color: MKT.text }}>Impression Share</strong>. If it's above 75%, you've captured most people searching for cleaning in your area. More budget at that point makes Google show your ads on vaguer, lower-intent searches to spend the money — worse traffic, not more good traffic.
          <br /><br />
          At that point, the fix is <strong style={{ color: MKT.text }}>not more spend on the same campaign</strong>. Your options{nonGoogleRows.length > 0 ? ' — in order' : ''}:
        </div>
        <div style={{ marginTop: 8 }}>
          {[
            nonGoogleRows.length > 0
              ? 'Shift budget toward ' + nonGoogleRows.map(r => r.name + ' (£' + r.amount + '/month)').join(', ') + ' — channels that have not hit a ceiling yet'
              : 'Test a new channel — LSA, Bark, or local flyers in a postcode you are not currently targeting',
            'Expand your Google Ads reach: add new postcodes, new match types, or new service types (end of tenancy, Airbnb turnaround, office cleaning)',
            totalBudget > 0 ? 'If all channels are at their ceiling and CPA is good, the remaining £' + Math.max(0, totalBudget - totalGoogle) + '/month non-Google budget is where the next growth comes from — not more Google' : 'Open a new campaign targeting a different service type rather than increasing spend on the same one',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', alignItems: 'flex-start' }}>
              <span style={{ color: MKT.blue, fontWeight: 700, fontSize: 11, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const INPUT = { background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 10px', color: MKT.text, fontSize: 14, fontFamily: FONT, width: 100, outline: 'none' };
const TH    = { fontFamily: FONT, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim };
const TD    = { fontFamily: FONT, fontSize: 13, color: MKT.muted };

function Dot({ color }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function RuleRow({ label, note, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
      <Dot color={color} />
      <span style={{ fontFamily: FONT, fontSize: 12, color, fontWeight: 500, width: 85, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>{note}</span>
    </div>
  );
}

export default function ROIContent() {
  const [avgJob, setAvgJob] = useState(() => { try { return parseFloat(localStorage.getItem('roi_avg_job')) || DEFAULT_AVG_JOB; } catch { return DEFAULT_AVG_JOB; } });

  const cpaTarget = Math.round(avgJob * 0.25);

  const [channels,       setChannels]       = useState(() => readLS('mkt_investment_channels'));
  const [history,        setHistory]        = useState(() => readLS('mkt_weekly_history'));
  const [invHistory,     setInvHistory]     = useState(() => readLS('mkt_investment_history'));
  const [budgetRows,     setBudgetRows]     = useState(() => readLS('mkt_budget_rows'));

  useEffect(() => {
    const refresh = () => {
      setChannels(readLS('mkt_investment_channels'));
      setHistory(readLS('mkt_weekly_history'));
      setInvHistory(readLS('mkt_investment_history'));
      setBudgetRows(readLS('mkt_budget_rows'));
    };
    window.addEventListener('lcw-data-saved', refresh);
    return () => window.removeEventListener('lcw-data-saved', refresh);
  }, []);

  function saveAvgJob(v) { const n = parseFloat(v); if (!isNaN(n) && n > 0) { setAvgJob(n); localStorage.setItem('roi_avg_job', String(n)); } }

  const totalBudget = budgetRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  // Monthly channel rows (from investment decisions in Analytics tab)
  const monthlyRows = channels
    .filter(c => c.spend !== '' || c.bookings !== '')
    .map(ch => {
      const spend    = readNum(ch.spend);
      const bookings = readNum(ch.bookings);
      const estRev   = bookings * avgJob;
      const cpa      = spend > 0 && bookings > 0 ? spend / bookings : null;
      const roas     = spend > 0 && bookings > 0 ? estRev / spend  : null;
      return { id: ch.id, label: ch.label, spend, bookings, estRev, cpa, roas };
    });

  // Weekly breakdown for channels that have spend in analytics
  const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const weeklyRows = sortedHistory.slice(0, 8).map(w => {
    const revenue = readNum(w.all?.l3);
    const totalSpend = WEEKLY_CHANNEL_SPEND.reduce((s, ch) => s + readNum(w.all?.[ch.spendId]), 0);
    const totalBkgs  = readNum(w.all?.l1 || w.bookings);
    const overallCpa  = totalSpend > 0 && totalBkgs > 0 ? totalSpend / totalBkgs : null;
    const overallRoas = totalSpend > 0 && revenue > 0   ? revenue / totalSpend   : null;
    const channels = WEEKLY_CHANNEL_SPEND.map(ch => {
      const s = readNum(w.all?.[ch.spendId]);
      const b = readNum(w.all?.[ch.bookingsId]);
      return { label: ch.label, spend: s, bookings: b, cpa: s > 0 && b > 0 ? s / b : null };
    }).filter(ch => ch.spend > 0 || ch.bookings > 0);
    return { date: w.date, revenue, totalSpend, totalBkgs, overallCpa, overallRoas, channels };
  }).filter(r => r.totalSpend > 0 || r.totalBkgs > 0);

  const hasMontlyData = monthlyRows.length > 0;
  const hasWeeklyData = weeklyRows.length > 0;

  return (
    <div>
      {/* Rule cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* CPA */}
        <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.dim, marginBottom: 8 }}>CPA — Cost Per Acquisition</div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 10, lineHeight: 1.6 }}>
            What you spent in ads to get one booking. Lower is better.
            <br />
            <strong style={{ color: MKT.text }}>Formula:</strong> Ad spend divided by number of bookings from that channel.
          </div>
          <RuleRow label="Under £30"   note="Excellent — consider scaling"     color={MKT.green} />
          <RuleRow label="£30 – £45"   note="Good — on target"                 color={MKT.green} />
          <RuleRow label="£45 – £80"   note="Above target — monitor closely"   color={MKT.amber} />
          <RuleRow label="Over £80"    note="Too high — pause or fix"          color={MKT.red}   />
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '0.5px solid rgba(0,0,0,0.06)', fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>
            Based on a £{avgJob} job value, your max CPA is <strong style={{ color: MKT.text }}>£{cpaTarget}</strong>. This keeps at least 75% of the job value available for labour, supplies, and profit. Stay under this and your ad spend is working efficiently.
          </div>
        </div>

        {/* ROAS */}
        <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.dim, marginBottom: 8 }}>ROAS — Return on Ad Spend</div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 10, lineHeight: 1.6 }}>
            How many pounds you earn back for every pound spent. Higher is better.
            <br />
            <strong style={{ color: MKT.text }}>Formula:</strong> Revenue earned divided by ad spend.
          </div>
          <RuleRow label="Above 3x"  note="Channel is working — consider scaling"        color={MKT.green} />
          <RuleRow label="1x – 3x"   note="Breaking even or marginal — monitor closely"  color={MKT.amber} />
          <RuleRow label="Below 1x"  note="Spending more than you earn — fix or pause"   color={MKT.red}   />
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '0.5px solid rgba(0,0,0,0.06)', fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>
            Example: 1 booking at £{avgJob} from £{cpaTarget} spend = <strong style={{ color: MKT.green }}>ROAS {(avgJob / cpaTarget).toFixed(1)}x</strong>. The higher this number, the better. 3x is the minimum before you scale — but 5x, 8x, 10x is the goal.
          </div>
        </div>
      </div>

      {/* Phase guide */}
      <PhaseGuide history={history} cpaTarget={cpaTarget} budgetRows={budgetRows} channels={channels} />

      {/* Settings */}
      <SLabel>Your figures</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 6 }}>Average job value £</div>
            <input type="number" min="1" value={avgJob} onChange={e => saveAvgJob(e.target.value)} style={INPUT} />
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>Update this when you hit 10 bookings</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 6 }}>CPA target £</div>
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: MKT.gold, lineHeight: 1, padding: '4px 0' }}>£{cpaTarget}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 4 }}>Auto-calculated — 25% of £{avgJob}</div>
          </div>
        </div>
        <MktAlert type="info">
          CPA is calculated from real spend and booking data you entered in the Analytics tab. ROAS is estimated by multiplying your bookings by the average job value above, because we don't yet track actual revenue per channel separately. Estimated figures are marked with *.
        </MktAlert>
      </div>

      {/* Monthly channel performance */}
      <SLabel>Monthly channel performance</SLabel>
      {hasMontlyData ? (
        <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '155px 90px 80px 115px 75px 75px 175px', gap: 8, paddingBottom: 8, borderBottom: `0.5px solid ${MKT.borderStrong}`, marginBottom: 4, minWidth: 700 }}>
            {['Channel', 'Spend £', 'Bookings', 'Est. revenue *', 'CPA', 'ROAS *', 'Status'].map(h => (
              <span key={h} style={TH}>{h}</span>
            ))}
          </div>
          {monthlyRows.map(row => {
            const cpaSt  = row.cpa  !== null ? cpaStatus(row.cpa, cpaTarget) : null;
            const roasSt = row.roas !== null ? roasStatus(row.roas)          : null;
            const noBook = row.spend > 0 && row.bookings === 0;
            return (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '155px 90px 80px 115px 75px 75px 175px', gap: 8, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)', alignItems: 'center', minWidth: 700 }}>
                <span style={{ ...TD, color: MKT.text, fontWeight: 500 }}>{row.label}</span>
                <span style={TD}>{row.spend > 0 ? `£${row.spend}` : '—'}</span>
                <span style={TD}>{row.bookings > 0 ? row.bookings : '—'}</span>
                <span style={{ ...TD, fontStyle: 'italic', color: MKT.dim }}>{row.bookings > 0 ? `~£${row.estRev.toFixed(0)}` : '—'}</span>
                <span style={{ ...TD, fontWeight: 500, color: cpaSt ? cpaSt.color : noBook ? MKT.red : MKT.dim }}>
                  {row.cpa !== null ? `£${row.cpa.toFixed(0)}` : noBook ? '—' : '—'}
                </span>
                <span style={{ ...TD, fontWeight: 500, color: roasSt ? roasSt.color : MKT.dim }}>
                  {row.roas !== null ? `${row.roas.toFixed(1)}x` : '—'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cpaSt && <Dot color={cpaSt.color} />}
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: cpaSt ? cpaSt.color : noBook ? MKT.red : MKT.dim }}>
                    {cpaSt ? cpaSt.label : noBook ? 'No bookings yet' : '—'}
                  </span>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 12, fontFamily: FONT, fontSize: 11, color: MKT.dim, lineHeight: 1.5 }}>
            * Estimated. Revenue = bookings × £{avgJob} average job value. Enter data in Analytics tab under "Investment decisions — cost per booking."
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `0.5px solid ${MKT.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.text, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>What to do with this</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8 }}>
              Every month, this table shows you which channels earned their budget and which didn't. Any channel showing red — cut the budget or pause it and move that money to your green channels. Any channel showing green with growing bookings — increase the budget by £50/month and check whether bookings grow proportionally. Reallocate from red to green every month until all active channels are on target.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <MktAlert type="info">
            No monthly investment data yet. Go to the Analytics tab, scroll to "Investment decisions — cost per booking" and enter your monthly spend and bookings per channel.
          </MktAlert>
        </div>
      )}

      {/* Budget allocator */}
      <BudgetAllocator channels={channels} cpaTarget={cpaTarget} avgJob={avgJob} totalBudget={totalBudget} />

      {/* Action plan */}
      <ActionPlan channels={channels} cpaTarget={cpaTarget} avgJob={avgJob} totalBudget={totalBudget} />

      {/* Weekly breakdown */}
      <SLabel>Weekly breakdown — paid channels</SLabel>
      {hasWeeklyData ? (
        <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14, overflowX: 'auto' }}>
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 6, lineHeight: 1.6 }}>
            Showing Google Ads and LSA only — the channels where weekly spend is tracked in Analytics. To record total revenue for a week, enter it in the "Total revenue this week £" field in the Analytics tracker.
          </div>
          <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `0.5px solid ${MKT.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.text, marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>What to do with this</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.8 }}>
              Use this to spot patterns week on week. If your CPA is spiking in a particular week, something changed — maybe a competitor entered the auction, your ad got disapproved, or you changed keywords. Cross-reference with what you entered in the Weekly Review. Catching a problem here early saves money before it compounds across the whole month.
            </div>
          </div>
          {weeklyRows.map((row, ri) => (
            <div key={row.date} style={{ marginBottom: ri < weeklyRows.length - 1 ? 16 : 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.blue, marginBottom: 8 }}>
                Week commencing {row.date}
                {row.revenue > 0 && (
                  <span style={{ color: MKT.muted, fontWeight: 400, marginLeft: 12 }}>
                    Revenue recorded: <strong style={{ color: MKT.green }}>£{row.revenue}</strong>
                    {row.overallRoas !== null && (
                      <span style={{ marginLeft: 10, color: roasStatus(row.overallRoas).color }}>
                        Overall ROAS: {row.overallRoas.toFixed(1)}x
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 80px 80px 80px 160px', gap: 8, paddingBottom: 6, borderBottom: `0.5px solid rgba(0,0,0,0.06)`, marginBottom: 4, minWidth: 500 }}>
                {['Channel', 'Spend £', 'Bookings', 'CPA', 'Status'].map(h => (
                  <span key={h} style={{ ...TH, fontSize: 9 }}>{h}</span>
                ))}
              </div>
              {row.channels.map(ch => {
                const cpaSt = ch.cpa !== null ? cpaStatus(ch.cpa, cpaTarget) : null;
                const noBook = ch.spend > 0 && ch.bookings === 0;
                return (
                  <div key={ch.label} style={{ display: 'grid', gridTemplateColumns: '160px 80px 80px 80px 160px', gap: 8, padding: '7px 0', borderBottom: '0.5px solid rgba(0,0,0,0.03)', alignItems: 'center', minWidth: 500 }}>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>{ch.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.text }}>{ch.spend > 0 ? `£${ch.spend}` : '—'}</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.text }}>{ch.bookings > 0 ? ch.bookings : '—'}</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: cpaSt ? cpaSt.color : noBook ? MKT.amber : MKT.dim }}>
                      {ch.cpa !== null ? `£${ch.cpa.toFixed(0)}` : '—'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {cpaSt && <Dot color={cpaSt.color} />}
                      <span style={{ fontFamily: FONT, fontSize: 12, color: cpaSt ? cpaSt.color : noBook ? MKT.amber : MKT.dim }}>
                        {cpaSt ? cpaSt.label : noBook ? 'No bookings recorded' : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {row.overallCpa !== null && (
                <div style={{ marginTop: 8, fontFamily: FONT, fontSize: 11, color: MKT.dim }}>
                  Total spend: £{row.totalSpend.toFixed(0)} · Total bookings: {row.totalBkgs} · Overall CPA: <strong style={{ color: cpaStatus(row.overallCpa, cpaTarget).color }}>£{row.overallCpa.toFixed(0)}</strong>
                </div>
              )}
              {ri < weeklyRows.length - 1 && <div style={{ height: '0.5px', background: MKT.border, margin: '12px 0 0' }} />}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <MktAlert type="info">
            No weekly data saved yet. Save your first week in the Analytics tab to see the weekly CPA breakdown here.
          </MktAlert>
        </div>
      )}

      {/* Weekly action plan */}
      {hasWeeklyData && <WeeklyActionPlan weeklyRows={weeklyRows} cpaTarget={cpaTarget} />}

      {/* Historical performance */}
      <HistoricalSection
        invHistory={invHistory}
        avgJob={avgJob}
        cpaTarget={cpaTarget}
        onDelete={months => {
          const next = invHistory.filter(e => !months.includes(e.month));
          setInvHistory(next);
          localStorage.setItem('mkt_investment_history', JSON.stringify(next));
        }}
      />
    </div>
  );
}

function generateWeeklyActionPlan(weeklyRows, cpaTarget) {
  if (!weeklyRows.length) return [];
  const latest  = weeklyRows[0];
  const prev    = weeklyRows[1] || null;
  const actions = [];

  latest.channels.forEach(ch => {
    const spend    = ch.spend;
    const bookings = ch.bookings;
    const cpa      = ch.cpa;
    const isGoogle = ch.label.toLowerCase().includes('google') || ch.label.toLowerCase().includes('ads');
    const isLSA    = ch.label.toLowerCase().includes('lsa');

    if (spend === 0 && bookings === 0) return;

    // Thin data — keep this check before spend>0/bookings=0 so zero-booking channels still get the urgent treatment
    if (bookings > 0 && bookings < 3) {
      actions.push({
        priority: 'mechanics',
        channel: ch.label,
        headline: bookings + ' booking' + (bookings !== 1 ? 's' : '') + ' this week — not enough to read CPA yet',
        diagnosis: 'One or two bookings in a week gives you a CPA number but it is not meaningful. A single booking difference next week could halve or double it. Do not make budget decisions from this. Instead confirm the channel is set up correctly and keep running.',
        steps: [
          isGoogle ? 'Quick check: open Google Ads and confirm ads are approved and impression share is not zero.' : 'Confirm this channel is active and recording correctly.',
          'Keep budget the same this week. You need at least 3 bookings in a single week before a weekly CPA figure means anything.',
          'Check again next week. If you see a consistent pattern over 3+ weeks, then act on it.',
        ],
      });
      return;
    }

    // Spend with zero bookings
    if (spend > 0 && bookings === 0) {
      actions.push({
        priority: 'urgent',
        channel: ch.label,
        headline: 'Spent £' + spend + ' this week — zero bookings',
        diagnosis: 'Money left the account but nothing came back. Either ads are not showing, conversion tracking is broken, or leads are coming in and not converting. Check today — every day this runs undiagnosed costs you more.',
        steps: isGoogle ? [
          'Open Google Ads now. Go to Campaigns — are your ads approved and showing? Look for any "Limited" or "Disapproved" flags.',
          'Go to Tools > Conversions. Confirm the conversion tag is firing. If it shows "No recent conversions" but you had website visitors, your tracking is broken.',
          'Go to Search Terms report. Look at what searches triggered your ads — are they relevant to cleaning in London?',
          'If tracking is fine and ads are running normally, check your landing page. Load it on your phone. Does the "Book now" button work?',
          'Do not increase budget this week. Hold spend at £' + spend + ' and fix the root cause first.',
        ] : isLSA ? [
          'Open your LSA dashboard. Are leads appearing? If yes, are you responding to each one within 30 minutes?',
          'Check your Google Business Profile — LSA pulls your reviews from there. Fewer than 5 reviews means poor ranking.',
          'If no leads at all, your service area or category settings may need updating. Check these in the LSA dashboard.',
        ] : [
          'Check whether this channel is recording bookings correctly.',
          'If spend is confirmed and bookings are genuinely zero, pause this channel this week and redirect budget.',
        ],
      });
      return;
    }

    // CPA spiked significantly vs last week
    if (prev && cpa !== null) {
      const prevCh = prev.channels.find(c => c.label === ch.label);
      if (prevCh?.cpa !== null && prevCh.cpa > 0) {
        const spike = (cpa - prevCh.cpa) / prevCh.cpa;
        if (spike >= 0.5 && cpa > cpaTarget) {
          actions.push({
            priority: 'high',
            channel: ch.label,
            headline: 'CPA jumped ' + Math.round(spike * 100) + '% this week — £' + prevCh.cpa.toFixed(0) + ' last week vs £' + cpa.toFixed(0) + ' this week',
            diagnosis: 'Something changed between last week and this week. CPA spikes like this are usually caused by a bad search term eating budget, an ad being disapproved and a fallback running, increased competition, or a landing page issue.',
            steps: isGoogle ? [
              'Open Search Terms report. Filter by the last 7 days. Look for any new queries spending money with zero conversions — pause them immediately.',
              'Check your ads are all approved. If one got disapproved, Google may be serving a lower-quality fallback.',
              'Check your Auction Insights report — did new competitors enter your area this week?',
              'If nothing obvious, hold budget steady this week and check again next Monday. One week of high CPA can be noise.',
            ] : [
              'Review what changed this week on this channel — targeting, budget, creative, or external competition.',
              'Hold steady for one more week before cutting budget. One bad week is not a trend.',
              'If CPA stays high next week too, follow the fix steps from the monthly action plan.',
            ],
          });
          return;
        }
      }
    }

    // CPA above 1.75x ceiling
    if (cpa !== null && cpa > cpaTarget * 1.75) {
      actions.push({
        priority: 'high',
        channel: ch.label,
        headline: 'CPA too high this week — £' + cpa.toFixed(0) + ' (target: £' + cpaTarget + ')',
        diagnosis: 'At £' + cpa.toFixed(0) + ' per booking, you are spending ' + ((cpa / cpaTarget - 1) * 100).toFixed(0) + '% more than your target. Do not let this run another full week unchecked.',
        steps: isGoogle ? [
          'Go to Search Terms report right now. Pause any term that has spent more than £' + cpaTarget + ' with no bookings in the last 7 days.',
          'Check Quality Score for each keyword. Below 6/10 means you are overpaying per click.',
          'Review your ad schedule — are you paying for clicks at times when bookings are unlikely (e.g. late night)?',
          'Do not increase budget. Hold at current spend until CPA drops below £' + Math.round(cpaTarget * 1.75) + '.',
        ] : [
          'Hold budget steady this week — do not increase.',
          'Review targeting and ad copy for obvious issues.',
          'Check back next week. Two weeks above this level means it is time to cut budget by 25%.',
        ],
      });
      return;
    }

    // CPA amber
    if (cpa !== null && cpa > cpaTarget) {
      actions.push({
        priority: 'monitor',
        channel: ch.label,
        headline: 'Above target this week — £' + cpa.toFixed(0) + ' CPA',
        diagnosis: 'One week above target is not a crisis. Watch it for one more week before making changes. If it stays above £' + cpaTarget + ' for two weeks in a row, follow the fix steps.',
        steps: [
          'No budget changes this week. Hold steady.',
          isGoogle ? 'Do a quick Search Terms check — spend 5 minutes pausing any obviously irrelevant queries.' : 'Review your targeting and messaging for easy wins.',
          'Check again next week. If CPA is still above £' + cpaTarget + ', escalate to the high-priority fix steps.',
        ],
      });
      return;
    }

    // CPA excellent
    if (cpa !== null && cpa < 30) {
      actions.push({
        priority: 'scale',
        channel: ch.label,
        headline: 'Strong week — CPA £' + cpa.toFixed(0) + ' on ' + bookings + ' booking' + (bookings !== 1 ? 's' : ''),
        diagnosis: ch.label + ' had a good week. CPA is well under target. Note what was running this week so you can replicate it.',
        steps: [
          'Write down what you were running this week — which ads, which keywords, which targeting. This is what a good week looks like.',
          'If this holds for 2 more weeks, increase the daily budget by £' + Math.round(spend / 7) + ' (adds ~£50/month).',
          'Do not change anything this week. When something is working, the first rule is do not break it.',
        ],
      });
      return;
    }

    // CPA on target
    if (cpa !== null && cpa <= cpaTarget) {
      actions.push({
        priority: 'good',
        channel: ch.label,
        headline: 'On target this week — CPA £' + cpa.toFixed(0),
        diagnosis: ch.label + ' is performing within target. No changes needed this week.',
        steps: [
          'No action needed. Hold budget steady.',
          'If this continues for 4 weeks, consider a small budget increase in the monthly review.',
        ],
      });
    }
  });

  const order = { urgent: 0, high: 1, monitor: 2, good: 3, scale: 4 };
  return actions.sort((a, b) => (order[a.priority] ?? 5) - (order[b.priority] ?? 5));
}

function WeeklyActionPlan({ weeklyRows, cpaTarget }) {
  const [open, setOpen] = useState(new Set());
  const actions = generateWeeklyActionPlan(weeklyRows, cpaTarget);

  if (!actions.length) return null;

  const latest = weeklyRows[0];
  function toggle(i) { setOpen(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; }); }

  return (
    <>
      <SLabel>Weekly action plan — week commencing {latest.date}</SLabel>
      <div style={{ marginBottom: 14 }}>
        {actions.map((action, i) => {
          const st     = PRIORITY_STYLE[action.priority] || PRIORITY_STYLE.monitor;
          const isOpen = open.has(i);
          return (
            <div key={i} style={{ background: st.bg, border: `0.5px solid ${st.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }} onClick={() => toggle(i)}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: st.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{st.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim }}>·</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim }}>{action.channel}</span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text, marginTop: 2 }}>{action.headline}</div>
                  {isOpen && (
                    <>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginTop: 8, lineHeight: 1.7 }}>{action.diagnosis}</div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim, marginBottom: 6 }}>Steps to take</div>
                        {action.steps.map((step, si) => (
                          <div key={si} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: si < action.steps.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                            <span style={{ fontFamily: FONT, fontSize: 12, color: st.color, fontWeight: 600, flexShrink: 0, minWidth: 18 }}>{si + 1}.</span>
                            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <span style={{ color: MKT.dim, fontSize: 14, flexShrink: 0, marginTop: 2 }}>{isOpen ? '▴' : '▾'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const CHANNEL_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d'];

function MiniLineChart({ title, months, series, formatY, targetLine }) {
  if (months.length < 2) {
    return (
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', flex: 1 }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, fontStyle: 'italic' }}>
          {months.length === 0 ? 'No data yet.' : 'Need at least 2 months of data to draw a trend.'}
        </div>
      </div>
    );
  }

  const W = 420, H = 160;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const n = months.length;

  const allVals = series.flatMap(s => s.values).filter(v => v !== null);
  if (!allVals.length) return null;
  const maxV = Math.max(...allVals, targetLine || 0) * 1.1;
  const minV = 0;

  const px = i => PAD.left + (i / (n - 1)) * cW;
  const py = v => PAD.top + cH * (1 - (v - minV) / (maxV - minV));

  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {[0, 0.5, 1].map(f => {
          const y = PAD.top + cH * (1 - f);
          const val = minV + f * (maxV - minV);
          return (
            <g key={f}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
              <text x={PAD.left - 5} y={y + 4} fontSize={9} fill={MKT.dim} textAnchor="end" fontFamily={FONT}>{formatY(val)}</text>
            </g>
          );
        })}
        {targetLine && (() => {
          const y = py(targetLine);
          return <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={MKT.amber} strokeWidth={1} strokeDasharray="4 3" />;
        })()}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => v !== null ? { x: px(i), y: py(v) } : null);
          const validPts = pts.filter(Boolean);
          if (validPts.length < 2) return null;
          const linePts = pts.map((p, i) => p ? `${p.x},${p.y}` : null).filter(Boolean).join(' ');
          return (
            <g key={si}>
              <polyline points={linePts} fill="none" stroke={CHANNEL_COLORS[si % CHANNEL_COLORS.length]} strokeWidth={2} strokeLinejoin="round" />
              {pts.map((p, i) => p && <circle key={i} cx={p.x} cy={p.y} r={3} fill={CHANNEL_COLORS[si % CHANNEL_COLORS.length]} />)}
            </g>
          );
        })}
        {months.map((m, i) => (
          <text key={i} x={px(i)} y={H - 4} fontSize={8} fill={MKT.dim} textAnchor="middle" fontFamily={FONT}>
            {new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short' })}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8 }}>
        {series.map((s, si) => (
          <span key={si} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11, color: MKT.muted }}>
            <span style={{ width: 10, height: 2, background: CHANNEL_COLORS[si % CHANNEL_COLORS.length], display: 'inline-block', borderRadius: 1 }} />
            {s.label}
          </span>
        ))}
        {targetLine && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11, color: MKT.amber }}>
            <span style={{ width: 10, height: 1, background: MKT.amber, display: 'inline-block', borderStyle: 'dashed' }} />
            Target (£{targetLine})
          </span>
        )}
      </div>
    </div>
  );
}

const COL = '1fr 80px 80px 70px 70px 80px';
const HIST_TH = { fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.dim };
const HIST_TD = { fontFamily: FONT, fontSize: 12, color: MKT.muted };

function downloadCSV(rows, filename) {
  const header = ['Month', 'Channel', 'Spend (GBP)', 'Bookings', 'CPA (GBP)', 'ROAS', 'Status'];
  const lines  = [header.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))];
  const blob   = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function HistoricalSection({ invHistory, avgJob, cpaTarget, onDelete }) {
  const [openMonths,   setOpenMonths]   = useState(new Set());
  const [selected,     setSelected]     = useState(new Set());
  const [confirmClear, setConfirmClear] = useState(false);

  const sorted = [...invHistory].sort((a, b) => b.month.localeCompare(a.month)); // newest first

  if (!sorted.length) {
    return (
      <>
        <SLabel>Historical performance</SLabel>
        <MktAlert type="info">
          No monthly snapshots saved yet. At the end of each month, go to Analytics and click "Save [month] snapshot." Your CPA and ROAS history will build up here over time.
        </MktAlert>
      </>
    );
  }

  const chronological = [...sorted].reverse();
  const months     = chronological.map(e => e.month);
  const allLabels  = [...new Set(chronological.flatMap(e => e.channels.map(c => c.label)))];
  const cpaSeries  = allLabels.map(label => ({ label, values: chronological.map(entry => { const ch = entry.channels.find(c => c.label === label); if (!ch) return null; const s = parseFloat(ch.spend)||0, b = parseFloat(ch.bookings)||0; return s>0&&b>0 ? s/b : null; }) })).filter(s => s.values.some(v => v !== null));
  const roasSeries = allLabels.map(label => ({ label, values: chronological.map(entry => { const ch = entry.channels.find(c => c.label === label); if (!ch) return null; const s = parseFloat(ch.spend)||0, b = parseFloat(ch.bookings)||0; return s>0&&b>0 ? (b*avgJob)/s : null; }) })).filter(s => s.values.some(v => v !== null));

  function toggleMonth(m)   { setOpenMonths(prev => { const n = new Set(prev); n.has(m) ? n.delete(m) : n.add(m); return n; }); }
  function toggleSelect(m)  { setSelected(prev => { const n = new Set(prev); n.has(m) ? n.delete(m) : n.add(m); return n; }); }
  function toggleAll()      { setSelected(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(e => e.month))); }

  function buildCSVRows(entries) {
    return entries.flatMap(entry => {
      const monthLabel = new Date(entry.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      return entry.channels.filter(c => c.spend !== '' || c.bookings !== '').map(c => {
        const s = parseFloat(c.spend)||0, b = parseFloat(c.bookings)||0;
        const cpa  = s>0&&b>0 ? (s/b).toFixed(0) : '';
        const roas = s>0&&b>0 ? ((b*avgJob)/s).toFixed(2) : '';
        const status = cpa ? (cpa<30 ? 'Excellent' : cpa<=cpaTarget ? 'On target' : cpa<=cpaTarget*1.75 ? 'Above target' : 'Pause or fix') : 'No bookings';
        return [monthLabel, c.label, s, b, cpa, roas, status];
      });
    });
  }

  function handleDelete(months) {
    onDelete(months);
    setSelected(prev => { const n = new Set(prev); months.forEach(m => n.delete(m)); return n; });
    setConfirmClear(false);
  }

  const anySelected = selected.size > 0;

  return (
    <>
      <SLabel>Historical performance</SLabel>

      {/* Charts */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <MiniLineChart title="CPA per channel — monthly (£)" months={months} series={cpaSeries} formatY={v => `£${Math.round(v)}`} targetLine={cpaTarget} />
        <MiniLineChart title="ROAS per channel — monthly (x)" months={months} series={roasSeries} formatY={v => `${v.toFixed(1)}x`} />
      </div>

      {/* Table */}
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>Monthly data</span>
          <button onClick={() => downloadCSV(buildCSVRows(sorted), 'lcw-roi-all.csv')} style={{ background: 'transparent', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '4px 10px', color: MKT.muted, fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}>
            Download all CSV
          </button>
          {anySelected && (
            <>
              <button onClick={() => downloadCSV(buildCSVRows(sorted.filter(e => selected.has(e.month))), 'lcw-roi-selected.csv')} style={{ background: 'transparent', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '4px 10px', color: MKT.blue, fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}>
                Download selected ({selected.size}) CSV
              </button>
              {confirmClear ? (
                <>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.red }}>Delete {selected.size} month{selected.size > 1 ? 's' : ''}?</span>
                  <button onClick={() => handleDelete([...selected])} style={{ background: 'transparent', border: `0.5px solid ${MKT.red}`, borderRadius: 6, padding: '4px 10px', color: MKT.red, fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}>Yes, delete</button>
                  <button onClick={() => setConfirmClear(false)} style={{ background: 'transparent', border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '4px 10px', color: MKT.muted, fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmClear(true)} style={{ background: 'transparent', border: `0.5px solid ${MKT.red}`, borderRadius: 6, padding: '4px 10px', color: MKT.red, fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}>
                  Delete selected
                </button>
              )}
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: MKT.blue }} />
            <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Select all</span>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `24px 20px 1fr ${COL}`, gap: 8, paddingBottom: 8, borderBottom: `0.5px solid ${MKT.borderStrong}`, minWidth: 580 }}>
          {['', '', 'Channel', 'Spend £', 'Bookings', 'CPA', 'ROAS', 'Status'].map(h => (
            <span key={h} style={HIST_TH}>{h}</span>
          ))}
        </div>

        {/* Month rows */}
        {sorted.map(entry => {
          const isOpen = openMonths.has(entry.month);
          const isSel  = selected.has(entry.month);
          const chRows = entry.channels.filter(c => c.spend !== '' || c.bookings !== '');
          const totSpend  = chRows.reduce((s, c) => s + (parseFloat(c.spend)||0), 0);
          const totBkgs   = chRows.reduce((s, c) => s + (parseFloat(c.bookings)||0), 0);
          const overallCpa = totSpend>0&&totBkgs>0 ? totSpend/totBkgs : null;
          const cpaSt = overallCpa !== null ? (overallCpa<30 ? MKT.green : overallCpa<=cpaTarget ? MKT.green : overallCpa<=cpaTarget*1.75 ? MKT.amber : MKT.red) : MKT.dim;

          return (
            <div key={entry.month} style={{ borderBottom: `0.5px solid ${MKT.border}` }}>
              {/* Month header row */}
              <div style={{ display: 'grid', gridTemplateColumns: `24px 20px 1fr ${COL}`, gap: 8, padding: '10px 0', alignItems: 'center', minWidth: 580, cursor: 'pointer' }} onClick={() => toggleMonth(entry.month)}>
                <span style={{ color: MKT.dim, fontSize: 11, textAlign: 'center' }}>{isOpen ? '▾' : '▸'}</span>
                <input type="checkbox" checked={isSel} onClick={e => e.stopPropagation()} onChange={() => toggleSelect(entry.month)} style={{ cursor: 'pointer', accentColor: MKT.blue }} />
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: MKT.text }}>
                  {new Date(entry.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
                <span style={{ ...HIST_TD, color: MKT.text }}>£{totSpend}</span>
                <span style={{ ...HIST_TD, color: MKT.text }}>{totBkgs}</span>
                <span style={{ ...HIST_TD, fontWeight: 600, color: cpaSt }}>{overallCpa !== null ? `£${overallCpa.toFixed(0)}` : '—'}</span>
                <span style={HIST_TD}>{totSpend>0&&totBkgs>0 ? `${((totBkgs*avgJob)/totSpend).toFixed(1)}x` : '—'}</span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: cpaSt }}>{overallCpa !== null ? (overallCpa<30 ? 'Excellent' : overallCpa<=cpaTarget ? 'On target' : overallCpa<=cpaTarget*1.75 ? 'Monitor' : 'Pause or fix') : '—'}</span>
              </div>

              {/* Expanded channel rows */}
              {isOpen && (
                <div style={{ background: MKT.dark3, borderRadius: 6, margin: '0 0 8px 44px', padding: '8px 0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: COL, gap: 8, padding: '0 12px 6px', borderBottom: `0.5px solid ${MKT.border}`, marginBottom: 4, minWidth: 500 }}>
                    {['Channel', 'Spend £', 'Bookings', 'CPA', 'ROAS', 'Status'].map(h => (
                      <span key={h} style={{ ...HIST_TH, fontSize: 9 }}>{h}</span>
                    ))}
                  </div>
                  {chRows.map(c => {
                    const s = parseFloat(c.spend)||0, b = parseFloat(c.bookings)||0;
                    const cpa  = s>0&&b>0 ? s/b : null;
                    const roas = s>0&&b>0 ? (b*avgJob)/s : null;
                    const col  = cpa !== null ? (cpa<30 ? MKT.green : cpa<=cpaTarget ? MKT.green : cpa<=cpaTarget*1.75 ? MKT.amber : MKT.red) : MKT.dim;
                    return (
                      <div key={c.id || c.label} style={{ display: 'grid', gridTemplateColumns: COL, gap: 8, padding: '6px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.03)', alignItems: 'center', minWidth: 500 }}>
                        <span style={{ ...HIST_TD, color: MKT.muted }}>{c.label}</span>
                        <span style={HIST_TD}>{s > 0 ? `£${s}` : '—'}</span>
                        <span style={HIST_TD}>{b > 0 ? b : '—'}</span>
                        <span style={{ ...HIST_TD, fontWeight: 600, color: col }}>{cpa !== null ? `£${cpa.toFixed(0)}` : '—'}</span>
                        <span style={{ ...HIST_TD, color: roas !== null ? (roas>=3 ? MKT.green : roas>=1 ? MKT.amber : MKT.red) : MKT.dim }}>{roas !== null ? `${roas.toFixed(1)}x` : '—'}</span>
                        <span style={{ fontFamily: FONT, fontSize: 11, color: col }}>{cpa !== null ? (cpa<30 ? 'Excellent' : cpa<=cpaTarget ? 'On target' : cpa<=cpaTarget*1.75 ? 'Monitor' : 'Pause or fix') : 'No bookings'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
