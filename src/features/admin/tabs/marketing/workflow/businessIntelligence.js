// Shared business intelligence — data computation for DailyBrief, TodayContent, milestone bar

// Approximate date outreach launched — used for pacing calculations
const BUSINESS_START_MS = new Date('2026-05-17').getTime();

export const MILESTONES = [
  {
    id: 'm1',
    label: 'First booking confirmed',
    shortLabel: '1st booking',
    desc: 'Your first paying client from any channel. London has 3.5 million homes — one is already ready to book.',
    timeframe: 'Week 1-4',
    deadlineDays: 28,
    target: 1,
    check: (d) => d.bookingCount >= 1,
    progressNum: (d) => Math.min(d.bookingCount, 1),
  },
  {
    id: 'm2',
    label: '5 bookings in your first 2 months',
    shortLabel: '5 bookings',
    desc: '5 bookings by Month 2 — or £825 revenue (same thing at avg £165/clean). At 30 calls/week you should hit 2-3 per month. Target: 16 July 2026.',
    timeframe: 'Month 1-2',
    deadlineDays: 61,
    target: 5,
    check: (d) => d.bookingCount >= 5 || d.monthlyRevenue >= 825,
    progressNum: (d) => Math.min(d.bookingCount, 5),
  },
  {
    id: 'm3',
    label: '3+ new bookings every month',
    shortLabel: '3/month',
    desc: 'At least 3 new bookings every month — the rate that builds to £1k income. This is the cadence you sustain forever. Letting agents add to this automatically once they refer.',
    timeframe: 'Month 2-5',
    deadlineDays: null,
    target: 3,
    check: (d) => d.monthlyBookings >= 3,
    progressNum: (d) => Math.min(d.monthlyBookings, 3),
  },
  {
    id: 'm4',
    label: 'First letting agent referral',
    shortLabel: 'Agent referral',
    desc: 'One agent can mean 3-5 regular clients with zero extra outreach. The commercial pipeline starts here — 30 visits over 3 months should produce this.',
    timeframe: 'Month 2-4',
    deadlineDays: 120,
    target: 1,
    check: (d) => d.agentReferral,
    progressNum: (d) => d.agentReferral ? 1 : 0,
  },
  {
    id: 'm5',
    label: '£1,000/month revenue',
    shortLabel: '£1k/mo',
    desc: 'Covering costs and paying yourself — roughly 6-7 cleans per month at your average rate. Expect this around Month 5-7 if outreach stays consistent.',
    timeframe: 'Month 4-7',
    deadlineDays: 210,
    target: 1000,
    check: (d) => d.monthlyRevenue >= 1000,
    progressNum: (d) => Math.min(d.monthlyRevenue, 1000),
  },
  {
    id: 'm6',
    label: '£2,000/month revenue',
    shortLabel: '£2k/mo',
    desc: 'Part-time equivalent income — 12-14 cleans per month. Agent referrals + repeat clients bring you here. Target: early-mid 2027.',
    timeframe: 'Month 7-12',
    deadlineDays: 365,
    target: 2000,
    check: (d) => d.monthlyRevenue >= 2000,
    progressNum: (d) => Math.min(d.monthlyRevenue, 2000),
  },
  {
    id: 'm7',
    label: '£3,000+/month revenue',
    shortLabel: '£3k/mo',
    desc: 'Full-time income — booking almost every working day. Multiple agents, loyal repeat clients, word of mouth. This is the vision. Target: May 2027 or sooner.',
    timeframe: 'Month 12-18',
    deadlineDays: 540,
    target: 3000,
    check: (d) => d.monthlyRevenue >= 3000,
    progressNum: (d) => Math.min(d.monthlyRevenue, 3000),
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

// Pacing check — how far through the deadline are you vs how much progress have you made?
// Returns null for milestones without a deadline (M3 is rate-based, not cumulative)
export function getMilestonePacing(milestone, data) {
  const { deadlineDays, target } = milestone;
  if (!deadlineDays || !target) return null;

  const elapsedDays = Math.max(0, Math.floor((Date.now() - BUSINESS_START_MS) / 86400000));
  const daysLeft    = Math.max(0, deadlineDays - elapsedDays);
  const daysOver    = Math.max(0, elapsedDays - deadlineDays);
  const actual      = milestone.progressNum(data);

  if (actual >= target) return { status: 'complete', daysLeft: 0 };

  const expectedNow = elapsedDays >= deadlineDays ? target : (elapsedDays / deadlineDays) * target;
  if (expectedNow <= 0.5) return { status: 'on_track', daysLeft, message: null };

  const ratio = actual / expectedNow;

  if (elapsedDays > deadlineDays) {
    return { status: 'overdue', daysLeft: 0, daysOver, message: `${daysOver} day${daysOver !== 1 ? 's' : ''} past target window — push harder now` };
  }
  if (ratio < 0.4) {
    return { status: 'behind', daysLeft, message: `Behind pace — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left — needs more outreach` };
  }
  if (ratio < 0.7) {
    return { status: 'slow', daysLeft, message: `Slightly behind — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in this window` };
  }
  return { status: 'on_track', daysLeft, message: null };
}

export function readBusinessData(bookings = []) {
  // Confirmed bookings: deposit paid or completed (not pending or cancelled)
  const active = bookings.filter(b => {
    const st = (b.status || '').toLowerCase();
    return st === 'deposit_paid' || st === 'complete';
  });
  const bookingCount = active.length;

  // Sort by creation time descending to find latest
  const sorted = [...active].sort((a, b) => {
    const ta = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  let lastBookingDate = null;
  let daysSinceLast   = null;
  let lastBookingLabel = null;
  if (sorted.length > 0) {
    const latest = sorted[0];
    const ms = latest.createdAt?.seconds
      ? latest.createdAt.seconds * 1000
      : new Date(latest.createdAt || 0).getTime();
    if (ms > 0) {
      lastBookingDate  = new Date(ms);
      daysSinceLast    = Math.floor((Date.now() - ms) / 86400000);
      lastBookingLabel = lastBookingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  const cutoff = Date.now() - 30 * 86400000;

  // Revenue (last 30 days):
  //   deposit_paid  -> count b.deposit (money already collected)
  //   complete      -> count b.total (full amount collected on job completion)
  //   refunded/cancelled/pending -> count 0
  const monthlyRevenue = Math.round(
    bookings
      .filter(b => {
        const st = (b.status || '').toLowerCase();
        if (st !== 'deposit_paid' && st !== 'complete') return false;
        // Use cleanDate for completed jobs, createdAt for deposit-paid
        const ms = st === 'complete'
          ? (b.cleanDate?.seconds
              ? b.cleanDate.seconds * 1000
              : b.cleanDate ? new Date(b.cleanDate).getTime() : 0)
          : (b.createdAt?.seconds
              ? b.createdAt.seconds * 1000
              : new Date(b.createdAt || 0).getTime());
        return ms >= cutoff;
      })
      .reduce((s, b) => {
        const st = (b.status || '').toLowerCase();
        if (st === 'complete') return s + (parseFloat(b.total) || 0);
        return s + (parseFloat(b.deposit) || 0);
      }, 0)
  );

  // Monthly booking count (confirmed in last 30 days, by createdAt)
  const monthlyBookings = bookings.filter(b => {
    const st = (b.status || '').toLowerCase();
    if (st !== 'deposit_paid' && st !== 'complete') return false;
    const ms = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
    return ms >= cutoff;
  }).length;

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

  return {
    bookingCount, lastBookingDate, daysSinceLast, lastBookingLabel,
    monthlyRevenue, monthlyBookings,
    googleReviews, agentReferral,
    lastBookingRaw: sorted[0] || null,
  };
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
    callsPerWeek:   avg('calls_made'),
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
  if (pulse.callsPerWeek >= 30)      score += 40;
  else if (pulse.callsPerWeek >= 15) score += 20;
  else if (pulse.callsPerWeek > 0)   score += 8;
  if (pulse.fbPostsPerWeek >= 2)      score += 20;
  else if (pulse.fbPostsPerWeek >= 1) score += 8;
  if (pulse.visitsPerWeek >= 3)       score += 20;
  else if (pulse.visitsPerWeek >= 1)  score += 8;
  if (pulse.emailsPerWeek >= 3)       score += 20;
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
  if (bookingCount <= 3)      { warnDays = 21; urgentDays = 30; }
  else if (bookingCount <= 10) { warnDays = 14; urgentDays = 21; }
  else if (bookingCount <= 20) { warnDays = 10; urgentDays = 14; }
  else                         { warnDays = 7;  urgentDays = 10; }

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
  lines.push(`New bookings last 30 days: ${data.monthlyBookings}`);
  if (data.daysSinceLast !== null) lines.push(`Days since last booking: ${data.daysSinceLast}`);
  else lines.push(`Days since last booking: no bookings yet`);
  lines.push(`Revenue last 30 days (deposits + completed): £${data.monthlyRevenue}`);
  lines.push(`Google reviews: ${data.googleReviews}`);
  if (pulse.active) {
    lines.push(`Outreach velocity (avg last ${Math.min(pulse.weeksLogged, 2)} weeks): ${Math.round(pulse.callsPerWeek)} calls/week, ${Math.round(pulse.fbPostsPerWeek)} Facebook posts/week, ${Math.round(pulse.visitsPerWeek)} visits/week`);
  } else {
    lines.push(`Outreach velocity: no weeks logged yet`);
  }
  lines.push(`Prediction signal: ${prediction.headline} — ${prediction.text}`);
  return lines.join('\n');
}
