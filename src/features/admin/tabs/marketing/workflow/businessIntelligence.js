// Shared business intelligence -- data computation for DailyBrief, TodayContent, milestone bar

// Approximate date outreach launched -- overridden by lcw_outreach_start_date in localStorage
const BUSINESS_START_MS = new Date('2026-05-17').getTime();

// Each milestone has:
//   shortLabel -- text shown on the chip
//   equiv      -- the "other dimension" (bookings <-> revenue equivalent) shown as secondary chip text
//   deadlineDays -- days from outreach start date to hit this milestone (null = rate-based, no deadline)
export const MILESTONES = [
  {
    id: 'm1',
    label: 'First booking confirmed',
    shortLabel: '1st booking', equiv: '~£165',
    desc: 'Your first paying client from any channel. London has 3.5 million homes -- one is already ready to book. Basis: 30 calls/week at 2 bookings per 100 calls = roughly 1 booking within 2-3 weeks.',
    timeframe: 'Week 1-4',
    deadlineDays: 28,
    target: 1,
    check: (d) => d.bookingCount >= 1,
    progressNum: (d) => Math.min(d.bookingCount, 1),
  },
  {
    id: 'm2',
    label: '5 bookings in your first 2 months',
    shortLabel: '5 bookings', equiv: '~£825 rev',
    desc: '5 bookings within 2 months of starting outreach -- or £825 revenue, whichever comes first. Basis: 30 calls/week at 2 bookings per 100 calls = 2-3 bookings/month.',
    timeframe: 'Month 1-2',
    deadlineDays: 61,
    target: 5,
    check: (d) => d.bookingCount >= 5 || d.monthlyRevenue >= 825,
    progressNum: (d) => Math.min(d.bookingCount, 5),
  },
  {
    id: 'm3',
    label: '4+ new bookings every month',
    shortLabel: '4 bkgs/mo', equiv: '~£660/mo',
    desc: '4 new bookings per month (~£660 revenue) -- whichever you hit first counts. A real step up from M2\'s pace of 2.5/month. Basis: 40 calls/week at 2% conversion = 3.2 bookings from cold outreach, plus 1 repeat client from your M2 bookings. Repeat rate for cleaning is typically 30-50% within 60 days.',
    timeframe: 'Month 2-5',
    deadlineDays: null,
    target: 4,
    check: (d) => d.monthlyBookings >= 4 || d.monthlyRevenue >= 660,
    progressNum: (d) => d.monthlyRevenue >= 660 ? 4 : Math.min(d.monthlyBookings, 4),
  },
  {
    id: 'm4',
    label: 'First letting agent relationship',
    shortLabel: 'Letting agent', equiv: '3-5 regulars',
    desc: 'A letting agent relationship means 3-5 regular clients with no extra outreach needed -- they call you for every checkout clean. Mark this done when your first agent sends their first referral. Basis: 30 agency visits over 3 months typically produces 1-2 referral partnerships.',
    timeframe: 'Month 2-4',
    deadlineDays: 120,
    target: 1,
    check: (d) => d.agentReferral,
    progressNum: (d) => d.agentReferral ? 1 : 0,
  },
  {
    id: 'm5',
    label: '£1,000/month revenue',
    shortLabel: '£1k/mo', equiv: '7 bkgs/mo',
    desc: '£1,000/month revenue or 7 bookings/month -- whichever you hit first counts. Covers costs and pays you. Basis: 7 cleans at avg £165 = £1,155. Agent referrals + repeat clients close the gap to £1k by Month 5-7.',
    timeframe: 'Month 4-7',
    deadlineDays: 210,
    target: 1000,
    check: (d) => d.monthlyRevenue >= 1000 || d.monthlyBookings >= 7,
    progressNum: (d) => Math.min(d.monthlyRevenue, 1000),
  },
  {
    id: 'm6',
    label: '£2,000/month revenue',
    shortLabel: '£2k/mo', equiv: '14 bkgs/mo',
    desc: '£2,000/month revenue or 14 bookings/month -- whichever you hit first counts. Part-time equivalent income. Basis: established London cleaning businesses with active outreach typically reach this in Month 7-12.',
    timeframe: 'Month 7-12',
    deadlineDays: 365,
    target: 2000,
    check: (d) => d.monthlyRevenue >= 2000 || d.monthlyBookings >= 14,
    progressNum: (d) => Math.min(d.monthlyRevenue, 2000),
  },
  {
    id: 'm7',
    label: '£3,000+/month revenue',
    shortLabel: '£3k/mo', equiv: '20 bkgs/mo',
    desc: '£3,000/month revenue or 20 bookings/month -- whichever you hit first counts. Full-time income, booking almost every working day. Multiple agents, loyal repeat clients, word of mouth.',
    timeframe: 'Month 12-18',
    deadlineDays: 540,
    target: 3000,
    check: (d) => d.monthlyRevenue >= 3000 || d.monthlyBookings >= 20,
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

export function readOutreachStartDate() {
  try {
    const stored = localStorage.getItem('lcw_outreach_start_date');
    if (stored) return new Date(stored).getTime();
  } catch {}
  // No manual start date set -- treat today as Day 1 so pacing counts forward from now
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function getMilestoneTargetDate(milestone) {
  const { deadlineDays } = milestone;
  if (!deadlineDays) return null;
  const startMs = readOutreachStartDate();
  const d = new Date(startMs + deadlineDays * 86400000);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Pacing: compares elapsed days from outreach start vs milestone deadline.
// Uses lcw_outreach_start_date (user-set) so pacing is based on YOUR real day 1.
export function getMilestonePacing(milestone, data) {
  const { deadlineDays, target } = milestone;
  if (!deadlineDays || !target) return null;

  const startMs     = readOutreachStartDate();
  const elapsedDays = Math.max(0, Math.floor((Date.now() - startMs) / 86400000));
  const daysLeft    = Math.max(0, deadlineDays - elapsedDays);
  const daysOver    = Math.max(0, elapsedDays - deadlineDays);
  const actual      = milestone.progressNum(data);

  if (actual >= target) return { status: 'complete', daysLeft: 0 };

  const expectedNow = elapsedDays >= deadlineDays ? target : (elapsedDays / deadlineDays) * target;
  if (expectedNow <= 0.5) return { status: 'on_track', daysLeft, message: null };

  const ratio = actual / expectedNow;

  if (elapsedDays > deadlineDays) {
    return { status: 'overdue', daysLeft: 0, daysOver, message: `${daysOver} day${daysOver !== 1 ? 's' : ''} past target window -- push harder now` };
  }
  if (ratio < 0.4) {
    return { status: 'behind', daysLeft, message: `Behind pace -- ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left -- needs more outreach` };
  }
  if (ratio < 0.7) {
    return { status: 'slow', daysLeft, message: `Slightly behind -- ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in this window` };
  }
  return { status: 'on_track', daysLeft, message: null };
}

export function readBusinessData(bookings = []) {
  const cutoff = Date.now() - 30 * 86400000;

  // Split by booking type
  const contractMasters = bookings.filter(b => b.isContract);
  const regular         = bookings.filter(b => !b.isContract && !b.isContractVisit);

  // Confirmed regular bookings: deposit paid or completed
  const activeRegular = regular.filter(b => {
    const st = (b.status || '').toLowerCase();
    return st === 'deposit_paid' || st === 'complete';
  });

  // Active contracts (not cancelled)
  const activeContracts = contractMasters.filter(b => {
    const st = (b.status || '').toLowerCase();
    return !st.startsWith('cancelled');
  });

  const bookingCount = activeRegular.length + activeContracts.length;

  // Sort by creation time descending to find latest confirmed booking
  const sorted = [...activeRegular, ...activeContracts].sort((a, b) => {
    const ta = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
    const tb = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  let lastBookingDate  = null;
  let daysSinceLast    = null;
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

  // Revenue (last 30 days):
  //   regular deposit_paid -> b.deposit; complete -> b.total
  //   contract masters -> monthlyBaseValue per paid period whose billing date is in last 30 days
  const regularRevenue = regular
    .filter(b => {
      const st = (b.status || '').toLowerCase();
      if (st !== 'deposit_paid' && st !== 'complete') return false;
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
      const pr = parseFloat(b.partialRefundAmount || 0);
      if (st === 'complete') return s + Math.max(0, (parseFloat(b.total) || 0) - pr);
      return s + Math.max(0, (parseFloat(b.deposit) || 0) - pr);
    }, 0);

  const contractRevenue = contractMasters.reduce((s, b) => {
    const payments = b.monthlyPayments || {};
    const paidRev = Object.entries(payments).reduce((ps, [key, val]) => {
      if (val !== 'paid') return ps;
      const paidMs = new Date(key + 'T12:00:00').getTime();
      if (paidMs < cutoff) return ps;
      return ps + parseFloat(b.monthlyBaseValue || 0);
    }, 0);
    return s + Math.max(0, paidRev - parseFloat(b.partialRefundTotal || 0));
  }, 0);

  const monthlyRevenue = regularRevenue + contractRevenue;

  // Monthly booking count: regular confirmed in last 30 days + new contracts in last 30 days
  const monthlyBookings =
    regular.filter(b => {
      const st = (b.status || '').toLowerCase();
      if (st !== 'deposit_paid' && st !== 'complete') return false;
      const ms = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return ms >= cutoff;
    }).length +
    activeContracts.filter(b => {
      const ms = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return ms >= cutoff;
    }).length;

  // Google reviews -- stored in localStorage, default 7
  let googleReviews = 7;
  try {
    const stored = localStorage.getItem('lcw_google_reviews');
    if (stored !== null) googleReviews = parseInt(stored) || 7;
  } catch {}

  // Letting agent referral -- manual flag or booking source
  let agentReferral = false;
  try { agentReferral = localStorage.getItem('lcw_agent_referral') === 'true'; } catch {}
  if (!agentReferral) {
    agentReferral = [...activeRegular, ...activeContracts].some(b => {
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
      text: `Activity is strong across your channels. Based on ${Math.round(pulse.callsPerWeek)} calls/week and consistent outreach, a booking is likely within 1-2 weeks. Letting agent relationships take 4-8 weeks to convert -- the pipeline is building even when it feels slow.`,
      urgency: 0,
    };
  }

  if (score >= 50 && !noBookingUrgent) {
    const gaps = [];
    if (pulse.callsPerWeek < 30)  gaps.push(`calls at ${Math.round(pulse.callsPerWeek)}/week -- target is 30`);
    if (pulse.fbPostsPerWeek < 2) gaps.push(`Facebook posts at ${Math.round(pulse.fbPostsPerWeek)}/week -- target is 2-3`);
    if (pulse.visitsPerWeek < 3)  gaps.push(`visits at ${Math.round(pulse.visitsPerWeek)}/week -- target is 3-5`);
    return {
      signal: 'attention',
      headline: 'Needs attention',
      text: `Outreach is active but below target. ${gaps.length > 0 ? gaps[0].charAt(0).toUpperCase() + gaps[0].slice(1) + '.' : ''} Close the gap on one channel this week -- consistency matters more than variety right now.`,
      urgency: 1,
    };
  }

  if (noBookingUrgent || score < 30) {
    const sinceTxt = daysSinceLast !== null ? `${daysSinceLast} days since the last booking.` : bookingCount === 0 ? 'No bookings yet.' : '';
    return {
      signal: 'urgent',
      headline: 'Action required',
      text: `${sinceTxt} Outreach volume is too low to sustain a pipeline. At fewer than 30 calls and 2 Facebook posts per week, leads dry up before they convert. This needs to change this week -- pick the one channel you can commit to and go all in.`,
      urgency: 2,
    };
  }

  return {
    signal: 'attention',
    headline: 'Inconsistent week',
    text: `Activity is uneven. ${noBookingMed ? `${daysSinceLast} days since the last booking -- time to accelerate.` : 'Focus on what produced interest last week and repeat it every day this week.'}`,
    urgency: 1,
  };
}

// 4-level urgency for gap since last booking. Thresholds scale with business maturity.
// level 0 = green (fine), 1 = soft amber (early heads-up), 2 = amber (push harder), 3 = red (act now)
// Basis: 30 calls/week at 2% conversion = 1 booking per 10-14 days for a new business.
export function getDaysSinceUrgency(daysSinceLast, bookingCount) {
  if (daysSinceLast === null || daysSinceLast === undefined) return { level: 0, message: null };

  // If outreach is starting today (no manual date set = defaulting to today), the gap is from
  // an inactive period -- reframe messages as "starting fresh" rather than threshold warnings.
  const startMs = readOutreachStartDate();
  const elapsedOutreachDays = Math.floor((Date.now() - startMs) / 86400000);
  const freshStart = elapsedOutreachDays === 0;

  let softDays, warnDays, urgentDays;
  if (bookingCount <= 3)      { softDays = 11; warnDays = 21; urgentDays = 30; }
  else if (bookingCount <= 10) { softDays = 7;  warnDays = 14; urgentDays = 21; }
  else if (bookingCount <= 20) { softDays = 5;  warnDays = 10; urgentDays = 14; }
  else                         { softDays = 4;  warnDays = 7;  urgentDays = 10; }

  const daysToWarn   = warnDays - daysSinceLast;
  const daysToUrgent = urgentDays - daysSinceLast;
  const d = daysSinceLast;

  // Target throughout: 30 calls/week (6/day Mon-Fri). At 2 bookings per 100 calls = 2-3 bookings/month.
  // Urgency is expressed through message tone and level colour, not by asking for more calls.

  if (d === 0) return { level: 0, message: 'Booking today -- great momentum. Log it and keep outreach going.' };

  if (d >= urgentDays) {
    const over = d - urgentDays;
    return {
      level: freshStart ? 2 : 3,
      message: freshStart
        ? `${d}d gap during inactive period -- starting outreach today. Target: 6 calls per day (30/week, Mon-Fri). At 2 bookings per 100 calls, that is 2-3 bookings per month.`
        : over > 0
          ? `${d}d gap -- ${over}d past the urgent mark. Commit to 6 calls per day (30/week, Mon-Fri) and follow up every contact from the last 6 weeks. At 2 per 100 calls you need consistent daily volume, not a one-off burst.`
          : `${d}d gap -- past the urgent mark. Start today: 6 calls before noon, every weekday. At 2 bookings per 100 calls, 30/week = 2-3 bookings per month.`,
    };
  }
  if (d >= warnDays) {
    return {
      level: freshStart ? 1 : 2,
      message: freshStart
        ? `${d}d gap during inactive period -- starting outreach fresh. Target: 6 calls per day (30/week, Mon-Fri). At 2 bookings per 100 calls, 30/week = 2-3 bookings per month.`
        : `${d}d gap -- ${daysToUrgent}d before the urgent mark. Get to 6 calls per day (30/week). At 2 bookings per 100 calls, 30/week = 2-3 bookings per month. Post in 2 Facebook groups today as well.`,
    };
  }
  if (d >= softDays) {
    return {
      level: freshStart ? 0 : 1,
      message: freshStart
        ? `${d}d gap during inactive period -- starting fresh. Target: 6 calls per day (30/week, Mon-Fri). At 2 bookings per 100 calls, 30/week = 2-3 bookings per month.`
        : `${d}d since last booking -- ${daysToWarn}d before concern. Keep at 6 calls per day (30/week). At 2 bookings per 100 calls, 30/week = 2-3 bookings per month.`,
    };
  }

  const daysToSoft = softDays - d;
  return {
    level: 0,
    message: `${d}d since last booking -- on track. Keep at 6 calls per day (30/week) to maintain the pipeline. ${daysToSoft}d before early concern.`,
  };
}

export function readMarketingCost() {
  try {
    const rows = JSON.parse(localStorage.getItem('mkt_budget_rows_v2')) || [];
    return rows.filter(r => r.active).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  } catch { return 0; }
}

export function buildBriefContext(data, pulse, prediction) {
  const lines = [];
  lines.push(`Business timeline: outreach started ${new Date(readOutreachStartDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push(`Total confirmed bookings: ${data.bookingCount}`);
  lines.push(`New bookings last 30 days: ${data.monthlyBookings}`);
  if (data.daysSinceLast !== null) lines.push(`Days since last booking: ${data.daysSinceLast}`);
  else lines.push(`Days since last booking: no bookings yet`);
  lines.push(`Revenue last 30 days (deposits + completed): £${data.monthlyRevenue.toFixed(2)}`);
  lines.push(`Google reviews: ${data.googleReviews}`);
  if (pulse.active) {
    lines.push(`Outreach velocity (avg last ${Math.min(pulse.weeksLogged, 2)} weeks): ${Math.round(pulse.callsPerWeek)} calls/week, ${Math.round(pulse.fbPostsPerWeek)} Facebook posts/week, ${Math.round(pulse.visitsPerWeek)} visits/week`);
  } else {
    lines.push(`Outreach velocity: no weeks logged yet`);
  }
  lines.push(`Prediction signal: ${prediction.headline} -- ${prediction.text}`);
  return lines.join('\n');
}
