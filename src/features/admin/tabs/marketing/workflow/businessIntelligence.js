// Shared business intelligence — data computation for DailyBrief, TodayContent, milestone bar

export const MILESTONES = [
  {
    id: 'm1', label: 'First booking confirmed', shortLabel: '1st booking',
    desc: 'Get your first confirmed booking from any channel',
    timeframe: 'Week 1-4',
    check: (d) => d.bookingCount >= 1,
    progressNum: (d) => Math.min(d.bookingCount, 1), target: 1,
  },
  {
    id: 'm2', label: '5 bookings in your first 2 months', shortLabel: '5 bookings',
    desc: '5 bookings in your first 2 months -- proof your outreach channels are working',
    timeframe: 'Month 1-2',
    check: (d) => d.bookingCount >= 5,
    progressNum: (d) => Math.min(d.bookingCount, 5), target: 5,
  },
  {
    id: 'm3', label: '10 Google reviews', shortLabel: '10 reviews',
    desc: 'Social proof that converts letting agents and Airbnb hosts',
    timeframe: 'Month 2-3',
    check: (d) => d.googleReviews >= 10,
    progressNum: (d) => Math.min(d.googleReviews, 10), target: 10,
  },
  {
    id: 'm4', label: 'First letting agent referral', shortLabel: 'Agent referral',
    desc: 'A letting agent sends you a regular booking',
    timeframe: 'Month 2-4',
    check: (d) => d.agentReferral,
    progressNum: (d) => d.agentReferral ? 1 : 0, target: 1,
  },
  {
    id: 'm5', label: '£1,000/month revenue', shortLabel: '£1k/mo',
    desc: 'Consistent monthly income — covering costs and building profit',
    timeframe: 'Month 3-5',
    check: (d) => d.monthlyRevenue >= 1000,
    progressNum: (d) => Math.min(d.monthlyRevenue, 1000), target: 1000,
  },
  {
    id: 'm6', label: '£2,000/month revenue', shortLabel: '£2k/mo',
    desc: 'Part-time equivalent income from the business',
    timeframe: 'Month 5-8',
    check: (d) => d.monthlyRevenue >= 2000,
    progressNum: (d) => Math.min(d.monthlyRevenue, 2000), target: 2000,
  },
  {
    id: 'm7', label: '£3,000+/month net profit', shortLabel: '£3k/mo',
    desc: 'Full-time income — booking every day achieved',
    timeframe: 'Month 8-12',
    check: (d) => d.monthlyRevenue >= 3000,
    progressNum: (d) => Math.min(d.monthlyRevenue, 3000), target: 3000,
  },
];

export function getMilestoneIndex(data) {
  let idx = -1;
  for (let i = 0; i < MILESTONES.length; i++) {
    if (MILESTONES[i].check(data)) idx = i;
    else break;
  }
  return idx;
}

export function readBusinessData(bookings = []) {
  const active = bookings.filter(b => b.status && !b.status.startsWith('cancelled'));
  const bookingCount = active.length;

  // Sort by creation time descending to find latest
  const sorted = [...active].sort((a, b) => {
    const ta = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  let lastBookingDate = null;
  let daysSinceLast = null;
  let lastBookingLabel = null;
  if (sorted.length > 0) {
    const latest = sorted[0];
    const ms = latest.createdAt?.seconds
      ? latest.createdAt.seconds * 1000
      : new Date(latest.createdAt || 0).getTime();
    if (ms > 0) {
      lastBookingDate = new Date(ms);
      daysSinceLast = Math.floor((Date.now() - ms) / 86400000);
      lastBookingLabel = lastBookingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  // Revenue: only completed jobs in last 30 days (remaining balance collected on completion)
  const cutoff = Date.now() - 30 * 86400000;
  const monthlyRevenue = Math.round(
    bookings
      .filter(b => {
        if (!b.status || b.status.toLowerCase() !== 'complete') return false;
        // Use cleanDate (when job was done + payment collected), fall back to createdAt
        const ms = b.cleanDate?.seconds
          ? b.cleanDate.seconds * 1000
          : b.cleanDate
            ? new Date(b.cleanDate).getTime()
            : b.createdAt?.seconds
              ? b.createdAt.seconds * 1000
              : new Date(b.createdAt || 0).getTime();
        return ms >= cutoff;
      })
      .reduce((s, b) => s + (parseFloat(b.total) || 0), 0)
  );

  // Google reviews — stored in localStorage, default 7
  let googleReviews = 7;
  try {
    const stored = localStorage.getItem('lcw_google_reviews');
    if (stored !== null) googleReviews = parseInt(stored) || 7;
  } catch {}

  // Letting agent referral — manual flag or booking source
  let agentReferral = false;
  try { agentReferral = localStorage.getItem('lcw_agent_referral') === 'true'; } catch {}
  if (!agentReferral) {
    agentReferral = active.some(b => {
      const src = (b.source || '').toLowerCase();
      return src.includes('agent') || src.includes('letting');
    });
  }

  return { bookingCount, lastBookingDate, daysSinceLast, lastBookingLabel, monthlyRevenue, googleReviews, agentReferral, lastBookingRaw: sorted[0] || null };
}

export function readOutreachPulse() {
  let weeks = [];
  try { weeks = JSON.parse(localStorage.getItem('lcw_outreach_log')) || []; } catch {}
  const sorted = [...weeks].sort((a, b) => (b.weekOf || '').localeCompare(a.weekOf || ''));
  const recent = sorted.slice(0, 2);
  const n = v => parseFloat(v) || 0;

  if (!recent.length) return { active: false, callsPerWeek: 0, fbPostsPerWeek: 0, visitsPerWeek: 0, emailsPerWeek: 0, weeksLogged: 0, lastWeek: null };

  const avg = (field) => recent.reduce((s, w) => s + n(w[field] || 0), 0) / recent.length;

  return {
    active: true,
    callsPerWeek:  avg('calls_made'),
    fbPostsPerWeek: avg('fb_posts'),
    visitsPerWeek:  avg('visits_made'),
    emailsPerWeek:  avg('emails_sent'),
    weeksLogged:    weeks.length,
    lastWeek:       recent[0],
  };
}

export function computePrediction(data, pulse) {
  const { bookingCount, daysSinceLast } = data;

  if (!pulse.active) {
    return {
      signal: 'unknown',
      headline: 'No prediction yet',
      text: 'Log your first week in the Outreach Tracker to unlock your business reading. The AI needs activity data to predict your next booking.',
      urgency: 0,
    };
  }

  // Activity score 0-100
  let score = 0;
  if (pulse.callsPerWeek >= 30)  score += 40;
  else if (pulse.callsPerWeek >= 15) score += 20;
  else if (pulse.callsPerWeek > 0)   score += 8;
  if (pulse.fbPostsPerWeek >= 2)  score += 20;
  else if (pulse.fbPostsPerWeek >= 1) score += 8;
  if (pulse.visitsPerWeek >= 3)   score += 20;
  else if (pulse.visitsPerWeek >= 1)  score += 8;
  if (pulse.emailsPerWeek >= 3)   score += 20;
  else if (pulse.emailsPerWeek >= 1)  score += 8;

  const noBookingUrgent = daysSinceLast !== null && daysSinceLast > 21;
  const noBookingMed    = daysSinceLast !== null && daysSinceLast > 14;

  if (score >= 70 && !noBookingMed) {
    return {
      signal: 'on_track',
      headline: 'On track',
      text: `Activity is strong across your channels. Based on ${Math.round(pulse.callsPerWeek)} calls/week and consistent outreach, a booking is likely within 1-2 weeks. Letting agent relationships take 4-8 weeks to convert — the pipeline is building even when it feels slow.`,
      urgency: 0,
    };
  }

  if (score >= 50 && !noBookingUrgent) {
    const gaps = [];
    if (pulse.callsPerWeek < 30)  gaps.push(`calls at ${Math.round(pulse.callsPerWeek)}/week — target is 30`);
    if (pulse.fbPostsPerWeek < 2) gaps.push(`Facebook posts at ${Math.round(pulse.fbPostsPerWeek)}/week — target is 2-3`);
    if (pulse.visitsPerWeek < 3)  gaps.push(`visits at ${Math.round(pulse.visitsPerWeek)}/week — target is 3-5`);
    return {
      signal: 'attention',
      headline: 'Needs attention',
      text: `Outreach is active but below target. ${gaps.length > 0 ? gaps[0].charAt(0).toUpperCase() + gaps[0].slice(1) + '.' : ''} Close the gap on one channel this week — consistency matters more than variety right now.`,
      urgency: 1,
    };
  }

  if (noBookingUrgent || score < 30) {
    const sinceTxt = daysSinceLast !== null ? `${daysSinceLast} days since the last booking.` : bookingCount === 0 ? 'No bookings yet.' : '';
    return {
      signal: 'urgent',
      headline: 'Action required',
      text: `${sinceTxt} Outreach volume is too low to sustain a pipeline. At fewer than 30 calls and 2 Facebook posts per week, leads dry up before they convert. This needs to change this week — pick the one channel you can commit to and go all in.`,
      urgency: 2,
    };
  }

  return {
    signal: 'attention',
    headline: 'Inconsistent week',
    text: `Activity is uneven. ${noBookingMed ? `${daysSinceLast} days since the last booking — time to accelerate.` : 'Focus on what produced interest last week and repeat it every day this week.'}`,
    urgency: 1,
  };
}

// Dynamic urgency for gap since last booking — threshold scales with business maturity
export function getDaysSinceUrgency(daysSinceLast, bookingCount) {
  if (daysSinceLast === null || daysSinceLast === undefined) return { level: 0, message: null };

  let warnDays, urgentDays;
  if (bookingCount <= 3)       { warnDays = 21; urgentDays = 30; }
  else if (bookingCount <= 10)  { warnDays = 14; urgentDays = 21; }
  else if (bookingCount <= 20)  { warnDays = 10; urgentDays = 14; }
  else                          { warnDays = 7;  urgentDays = 10; }

  if (daysSinceLast >= urgentDays) return { level: 2, message: 'Act now — pipeline at risk' };
  if (daysSinceLast >= warnDays)   return { level: 1, message: 'Time to accelerate outreach' };
  return { level: 0, message: null };
}

export function readMarketingCost() {
  try {
    const rows = JSON.parse(localStorage.getItem('mkt_budget_rows_v2')) || [];
    return Math.round(rows.filter(r => r.active).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0));
  } catch { return 0; }
}

export function buildBriefContext(data, pulse, prediction) {
  const lines = [];
  lines.push(`Business timeline: outreach launched approximately week 1 (17 May 2026)`);
  lines.push(`Total confirmed bookings: ${data.bookingCount}`);
  if (data.daysSinceLast !== null) lines.push(`Days since last booking: ${data.daysSinceLast}`);
  else lines.push(`Days since last booking: no bookings yet`);
  lines.push(`Monthly revenue (last 30 days): £${data.monthlyRevenue}`);
  lines.push(`Google reviews: ${data.googleReviews}`);
  if (pulse.active) {
    lines.push(`Outreach velocity (avg last ${Math.min(pulse.weeksLogged, 2)} weeks): ${Math.round(pulse.callsPerWeek)} calls/week, ${Math.round(pulse.fbPostsPerWeek)} Facebook posts/week, ${Math.round(pulse.visitsPerWeek)} visits/week`);
  } else {
    lines.push(`Outreach velocity: no weeks logged yet`);
  }
  lines.push(`Prediction signal: ${prediction.headline} — ${prediction.text}`);
  return lines.join('\n');
}
