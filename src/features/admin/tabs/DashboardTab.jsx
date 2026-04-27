import { getPayPeriod, calcHours, fmtDate, fmtDuration } from '../utils';

const FONT = "'Inter', 'Segoe UI', sans-serif";

export default function DashboardTab({ bookings, staff, isMobile, C }) {
  const today = new Date().toISOString().split('T')[0];
  const now   = new Date();
  const yr    = now.getFullYear();
  const mo    = now.getMonth();

  const monthKey   = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthStart = (y, m) => `${monthKey(y, m)}-01`;
  const monthEnd   = (y, m) => new Date(y, m + 1, 0).toISOString().split('T')[0];

  const bookingRevenue = b => {
    if (b.status === 'fully_paid') return parseFloat(b.total) || 0;
    if (['deposit_paid', 'payment_failed'].includes(b.status)) return parseFloat(b.deposit) || 0;
    return 0;
  };

  const activeBookings = bookings.filter(b => !b.status?.startsWith('cancelled'));

  const todayJobs = activeBookings.filter(b => b.cleanDate === today);

  const thisMonthBks  = activeBookings.filter(b => b.cleanDate >= monthStart(yr, mo) && b.cleanDate <= monthEnd(yr, mo));
  const lastMo        = mo === 0 ? 11 : mo - 1;
  const lastMoYr      = mo === 0 ? yr - 1 : yr;
  const lastMonthBks  = activeBookings.filter(b => b.cleanDate >= monthStart(lastMoYr, lastMo) && b.cleanDate <= monthEnd(lastMoYr, lastMo));
  const monthRevenue  = thisMonthBks.reduce((s, b) => s + bookingRevenue(b), 0);
  const lastMonthRev  = lastMonthBks.reduce((s, b) => s + bookingRevenue(b), 0);
  const revDiff       = monthRevenue - lastMonthRev;

  const ytdRevenue = activeBookings.filter(b => b.cleanDate?.startsWith(yr)).reduce((s, b) => s + bookingRevenue(b), 0);

  const outstanding      = activeBookings.filter(b => b.status === 'deposit_paid');
  const outstandingTotal = outstanding.reduce((s, b) => s + (parseFloat(b.remaining) || 0), 0);

  const unassigned = activeBookings.filter(b => !b.assignedStaff && b.cleanDate >= today);

  const recurringCount = thisMonthBks.filter(b => b.frequency && b.frequency !== 'one-off').length;
  const oneOffCount    = thisMonthBks.length - recurringCount;

  const sortedAll = [...activeBookings].sort((a, b) => (a.cleanDate || '').localeCompare(b.cleanDate || ''));
  const newThisMonth = thisMonthBks.filter(b => {
    const first = sortedAll.find(x => x.email === b.email);
    return first && first.cleanDate >= monthStart(yr, mo);
  });
  const newLastMonth = lastMonthBks.filter(b => {
    const first = sortedAll.find(x => x.email === b.email);
    return first && first.cleanDate >= monthStart(lastMoYr, lastMo) && first.cleanDate <= monthEnd(lastMoYr, lastMo);
  });

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  thisMonthBks.forEach(b => { if (b.cleanDate) dayCounts[new Date(b.cleanDate + 'T12:00:00').getDay()]++; });
  const busiestDay = dayCounts.indexOf(Math.max(...dayCounts));

  const chartMonths = [];
  for (let i = 5; i >= 0; i--) {
    const m2 = ((mo - i) % 12 + 12) % 12;
    const y2 = yr + Math.floor((mo - i) / 12);
    const bks = activeBookings.filter(b => b.cleanDate >= monthStart(y2, m2) && b.cleanDate <= monthEnd(y2, m2));
    chartMonths.push({ label: new Date(y2, m2, 1).toLocaleString('en-GB', { month: 'short' }), rev: bks.reduce((s, b) => s + bookingRevenue(b), 0), count: bks.length });
  }
  const maxRev = Math.max(...chartMonths.map(m => m.rev), 1);

  const payPeriod   = getPayPeriod();
  const activeStaff = [...staff].filter(s => s.status === 'Active').sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const staffJobs   = activeStaff.map(s => {
    const rate    = s.hourlyRate !== 'N/A' ? parseFloat(s.hourlyRate) || null : null;
    const ppJobs  = activeBookings.filter(b => b.assignedStaff === s.name && b.cleanDate >= payPeriod.start && b.cleanDate <= payPeriod.end);
    const ppHours = ppJobs.reduce((sum, b) => { const h = calcHours(b.actualStart || b.cleanTime, b.actualFinish); return sum + (h || 0); }, 0);
    const ppEarned = rate !== null ? ppHours * rate : null;
    return { ...s, rate, ppJobs, ppHours, ppEarned };
  });
  const maxStaffJobs = Math.max(...staffJobs.map(s => s.ppJobs.length), 1);

  const offToday = staff.filter(s => (s.holidays || []).includes(today));
  const overdue  = outstanding.filter(b => b.cleanDate < today).sort((a, b) => a.cleanDate.localeCompare(b.cleanDate));

  const CARD  = { background: C.card, borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
  const LABEL = { fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 6 };
  const BIG   = { fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 };
  const SUB   = { fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 4 };
  const trend = diff => diff === 0 ? null : (
    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: diff > 0 ? '#16a34a' : '#dc2626', marginLeft: 8 }}>
      {diff > 0 ? '▲' : '▼'} £{Math.abs(diff).toFixed(2)} vs last month
    </span>
  );

  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text, marginBottom: 2 }}>Dashboard</div>
      <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 24 }}>
        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {/* Row 1 — KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ ...CARD, borderTop: `3px solid ${C.accent}` }}>
          <div style={LABEL}>Today's Jobs</div>
          <div style={BIG}>{todayJobs.length}</div>
          <div style={SUB}>{todayJobs.filter(b => b.assignedStaff).length} of {todayJobs.length} assigned</div>
        </div>
        <div style={{ ...CARD, borderTop: '3px solid #16a34a' }}>
          <div style={LABEL}>Month Revenue</div>
          <div style={{ ...BIG, fontSize: 24 }}>£{monthRevenue.toFixed(2)}</div>
          <div style={{ ...SUB, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {thisMonthBks.length} bookings {trend(revDiff)}
          </div>
        </div>
        <div style={{ ...CARD, borderTop: '3px solid #6366f1' }}>
          <div style={LABEL}>Year to Date</div>
          <div style={{ ...BIG, fontSize: 24 }}>£{ytdRevenue.toFixed(2)}</div>
          <div style={SUB}>{yr}</div>
        </div>
        <div style={{ ...CARD, borderTop: unassigned.length > 0 ? '3px solid #dc2626' : '3px solid #16a34a' }}>
          <div style={LABEL}>Unassigned</div>
          <div style={{ ...BIG, color: unassigned.length > 0 ? '#dc2626' : '#16a34a' }}>{unassigned.length}</div>
          <div style={SUB}>upcoming jobs need a cleaner</div>
        </div>
      </div>

      {/* Row 2 — chart + today */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 16 }}>Revenue — Last 6 Months</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {chartMonths.map((m, i) => {
              const h = Math.max((m.rev / maxRev) * 100, m.rev > 0 ? 4 : 0);
              const isCurrent = i === 5;
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, fontWeight: isCurrent ? 700 : 400 }}>£{m.rev >= 1000 ? (m.rev / 1000).toFixed(1) + 'k' : m.rev.toFixed(2)}</div>
                  <div style={{ width: '100%', height: `${h}%`, background: isCurrent ? '#16a34a' : C.accent, borderRadius: '4px 4px 0 0', minHeight: m.rev > 0 ? 4 : 0, transition: 'height 0.4s' }} />
                  <div style={{ fontFamily: FONT, fontSize: 10, color: isCurrent ? C.text : C.muted, fontWeight: isCurrent ? 700 : 400 }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 12 }}>Today's Schedule</div>
          {todayJobs.length === 0 ? (
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No jobs today.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
              {todayJobs.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: C.bg, borderRadius: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.customerName}</div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{b.cleanTime}</div>
                  </div>
                  {b.assignedStaff
                    ? <span style={{ fontFamily: FONT, fontSize: 10, background: '#ede9fe', color: '#6d28d9', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>👤 {b.assignedStaff}</span>
                    : <span style={{ fontFamily: FONT, fontSize: 10, background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>Unassigned</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — team workload + bookings breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={LABEL}>Team — This Pay Week</div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>{fmtDate(payPeriod.start)} → {fmtDate(payPeriod.end)} · payday {fmtDate(payPeriod.payDay)}</div>
          </div>
          <div style={{ marginBottom: 12 }} />
          {activeStaff.length === 0 ? (
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No active staff added yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staffJobs.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.photoURL ? <img src={s.photoURL} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 14 }}>👤</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>{s.name}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{s.ppJobs.length} job{s.ppJobs.length !== 1 ? 's' : ''}</span>
                        {s.ppHours > 0 && <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>⏱ {fmtDuration(s.ppHours)}</span>}
                        {s.ppEarned !== null
                          ? <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#16a34a' }}>£{s.ppEarned.toFixed(2)}</span>
                          : s.rate === null && <span style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>N/A</span>}
                      </div>
                    </div>
                    <div style={{ height: 6, background: C.bg, borderRadius: 99, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <div style={{ height: '100%', width: `${(s.ppJobs.length / maxStaffJobs) * 100}%`, background: s.ppEarned !== null ? '#16a34a' : C.accent, borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                  {(s.holidays || []).includes(today) && <span style={{ fontFamily: FONT, fontSize: 10, background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' }}>🏖 Off</span>}
                </div>
              ))}
              {staffJobs.some(s => s.ppEarned !== null) && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.muted }}>Total payroll this week</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>£{staffJobs.reduce((s, x) => s + (x.ppEarned || 0), 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 14 }}>This Month</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.bg, borderRadius: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>Recurring bookings</span>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>{recurringCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.bg, borderRadius: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>One-off bookings</span>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>{oneOffCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.bg, borderRadius: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>New customers</span>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{newThisMonth.length} <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 400, color: newThisMonth.length >= newLastMonth.length ? '#16a34a' : '#dc2626' }}>({newThisMonth.length >= newLastMonth.length ? '+' : ''}{newThisMonth.length - newLastMonth.length} vs last mo)</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.bg, borderRadius: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>Busiest day</span>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>{dayCounts[busiestDay] > 0 ? `${DAY_NAMES[busiestDay]} (${dayCounts[busiestDay]})` : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff8eb', borderRadius: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: '#7a5c00' }}>Outstanding balance</span>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#d97706' }}>£{outstandingTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 — overdue + off today */}
      {(overdue.length > 0 || offToday.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : overdue.length > 0 && offToday.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
          {overdue.length > 0 && (
            <div style={{ ...CARD, borderTop: '3px solid #dc2626' }}>
              <div style={{ ...LABEL, marginBottom: 12, color: '#dc2626' }}>⚠ Overdue Balances</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overdue.slice(0, 5).map(b => {
                  const days = Math.floor((new Date(today) - new Date(b.cleanDate)) / 86400000);
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#fff5f5', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{b.customerName}</div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: '#dc2626' }}>{days} day{days !== 1 ? 's' : ''} overdue</div>
                      </div>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>£{parseFloat(b.remaining || 0).toFixed(2)}</span>
                    </div>
                  );
                })}
                {overdue.length > 5 && <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, textAlign: 'center' }}>+{overdue.length - 5} more</div>}
              </div>
            </div>
          )}
          {offToday.length > 0 && (
            <div style={{ ...CARD, borderTop: '3px solid #854d0e' }}>
              <div style={{ ...LABEL, marginBottom: 12 }}>🏖 Staff Off Today</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {offToday.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: '#fef9c3', borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.photoURL ? <img src={s.photoURL} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>👤</span>}
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#854d0e' }}>{s.name}</div>
                      <div style={{ fontFamily: FONT, fontSize: 11, color: '#a16207' }}>{s.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
