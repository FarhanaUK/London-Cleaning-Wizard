export const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';

// Estate Agent clean types — shown in the Quotes form and the Add New Visit popup, stored on the
// booking, and used as the calendar event title. One source of truth for both screens.
export const ESTATE_CLEAN_TYPES = ['End of Tenancy Cleaning', 'Pre-Tenancy / Move-In Cleaning', 'Void Property Cleaning', 'Deep Cleaning', 'After-Builders / Renovation Cleaning', 'Communal Area Cleaning'];

// Labour multiplier applied to the base clean hours per estate-agent clean type. null = manual
// quote only (After-Builders varies massively; Communal is priced per block, not by bedrooms).
export const ESTATE_CLEAN_MULTIPLIERS = {
  'End of Tenancy Cleaning':              1.6,
  'Pre-Tenancy / Move-In Cleaning':       1.25,
  'Void Property Cleaning':               0.9,
  'Deep Cleaning':                        1.5,
  'After-Builders / Renovation Cleaning': null,
  'Communal Area Cleaning':               null,
};

// Airbnb and Estate Agent are both one-off per-visit property cleans and behave the same way
// across the admin (job cards, hide pets/signature, charge-on-completion, add-on reminders).
// Use these helpers so the two types stay in lockstep and no spot gets missed.
export const isAirbnbType      = b => !!b && (b.isAirbnb === true      || b.clientType === 'airbnb');
export const isEstateAgentType = b => !!b && (b.isEstateAgent === true || b.clientType === 'estateAgent');
export const isOneOffPropertyClean = b => isAirbnbType(b) || isEstateAgentType(b);

// Frequency label for display. Airbnb and Estate Agent both use frequency 'flexible', but the
// "Airbnb Flexible" label is Airbnb-specific — show "Per visit" for estate agents instead.
export const freqLabel = (b) => {
  const f = (b && (b.frequency || b.freq)) || 'one-off';
  if (f === 'flexible') return (b && b.isEstateAgent) ? 'Per visit' : 'Airbnb Flexible';
  return ({ 'one-off': 'One-off', daily: 'Daily', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' })[f] || f || 'One-off';
};

export const toInputTime = t => {
  if (!t) return '';
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return '';
  let h = parseInt(m[1]), min = parseInt(m[2]);
  const p = (m[3] || '').toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
};

export const toDisplayTime = t => {
  if (!t) return '—';
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return t;
  let h = parseInt(m[1]), min = parseInt(m[2]);
  const p = (m[3] || '').toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(min).padStart(2,'0')} ${period}`;
};

export const toMins = t => {
  if (!t) return null;
  const ampm = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!ampm) return null;
  let h = parseInt(ampm[1]), m = parseInt(ampm[2]);
  const period = (ampm[3] || '').toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

export const calcHours = (start, finish) => {
  const s = toMins(start), f = toMins(finish);
  if (s === null || f === null || f <= s) return null;
  return (f - s) / 60;
};

export const fmtDuration = hrs => {
  if (hrs === null) return null;
  const h = Math.floor(hrs), m = Math.round((hrs - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

// UK tax year helpers (6 Apr – 5 Apr)
export const getTaxYears = () => {
  const now = new Date();
  const years = [];
  for (let y = now.getFullYear(); y >= 2025; y--) {
    years.push({ label: `${y}/${String(y+1).slice(2)} tax year`, start: `${y}-04-06`, end: `${y+1}-04-05` });
  }
  return years;
};

export const currentTaxYear = () => {
  const now = new Date();
  const y = now >= new Date(now.getFullYear(), 3, 6) ? now.getFullYear() : now.getFullYear() - 1;
  return { start: `${y}-04-06`, end: `${y+1}-04-05`, label: `${y}/${String(y+1).slice(2)}` };
};

// Pay period: Sun–Sat, paid following Friday
export const getPayPeriod = (date = new Date()) => {
  const d   = new Date(date);
  const day = d.getDay();
  const sun = new Date(d); sun.setDate(d.getDate() - day);
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  const fri = new Date(sat); fri.setDate(sat.getDate() + 6);
  const fmt = x => x.toISOString().split('T')[0];
  return { start: fmt(sun), end: fmt(sat), payDay: fmt(fri) };
};

export const fmtCreatedAt = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
};
