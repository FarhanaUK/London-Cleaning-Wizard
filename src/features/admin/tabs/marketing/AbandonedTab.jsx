import { useMemo } from 'react';
import { FONT, statCard } from './shared.jsx';

const FREQ_LABELS = {
  'one-off':   'One-off',
  weekly:      'Weekly',
  fortnightly: 'Fortnightly',
  monthly:     'Monthly',
};

function monthlyValue(total, frequency) {
  if (!total || !frequency || frequency === 'one-off') return null;
  if (frequency === 'weekly')     return total * 4;
  if (frequency === 'fortnightly') return total * 2;
  if (frequency === 'monthly')    return total;
  return null;
}

export default function AbandonedTab({ abandonmentStats, bookings, C }) {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekN = (() => {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return Math.ceil((day + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
  })();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const todayStats = abandonmentStats.filter(s => s.date === today);
  const weekStats  = abandonmentStats.filter(s => s.week === weekN && s.year === year);
  const monthStats = abandonmentStats.filter(s => s.month === month && s.year === year);
  const yearStats  = abandonmentStats.filter(s => s.year === year);

  // Build a lookup: piId → booking, to know if balance has been collected
  const bookingByPiId = useMemo(() => {
    const map = {};
    (bookings || []).forEach(b => {
      if (b.stripeDepositIntentId) map[b.stripeDepositIntentId] = b;
    });
    return map;
  }, [bookings]);

  const getRecovered = (stat) => {
    if (!stat.converted) return 0;
    const bk = bookingByPiId[stat.piId];
    if (bk && bk.status === 'completed') return stat.totalAmount || stat.depositAmount || 0;
    return stat.depositAmount || 0;
  };

  const getLost = (stat) => stat.totalAmount || stat.depositAmount || 0;

  const pct = (arr) => {
    const total = arr.length;
    if (!total) return '—';
    const conv = arr.filter(s => s.converted).length;
    return `${Math.round((conv / total) * 100)}% converted`;
  };

  const emailPct = (arr) => {
    const total = arr.length;
    if (!total) return null;
    const sent = arr.filter(s => s.emailSent).length;
    return `${sent} email${sent !== 1 ? 's' : ''} sent`;
  };

  const totalLost      = yearStats.filter(s => !s.converted).reduce((sum, s) => sum + getLost(s), 0);
  const totalRecovered = yearStats.filter(s => s.converted).reduce((sum, s) => sum + getRecovered(s), 0);

  // Package breakdown
  const pkgCounts = useMemo(() => {
    const map = {};
    yearStats.forEach(s => {
      const key = s.packageName || 'Unknown';
      if (!map[key]) map[key] = { total: 0, converted: 0 };
      map[key].total++;
      if (s.converted) map[key].converted++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [yearStats]);

  return (
    <>
      {/* Volume cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {statCard('Today',      todayStats.length,  pct(todayStats),  C)}
        {statCard('This Week',  weekStats.length,   pct(weekStats),   C)}
        {statCard('This Month', monthStats.length,  pct(monthStats),  C)}
        {statCard('This Year',  yearStats.length,   pct(yearStats),   C)}
      </div>

      {/* Value cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Value lost this year</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#dc2626' }}>£{totalLost.toFixed(2)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{yearStats.filter(s => !s.converted).length} non-converted abandonments</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Recovered this year</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#16a34a' }}>£{totalRecovered.toFixed(2)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{yearStats.filter(s => s.converted).length} converted · amount paid</div>
        </div>
      </div>

      {/* Package breakdown */}
      {pkgCounts.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>Abandonments by package — {year}</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {pkgCounts.map(([pkg, { total, converted }], i) => (
              <div key={pkg} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: i < pkgCounts.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: C.text }}>{pkg}</div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{converted} recovered</div>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.accent }}>{total} total</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>Abandonment Events — {year}</span>
          <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{yearStats.length} total · {emailPct(yearStats)}</span>
        </div>
        {yearStats.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>No abandonment events yet this year.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Date', 'Package', 'Frequency', 'First Clean', 'Monthly Value', 'Email Sent', 'Converted'].map(h => (
                    <th key={h} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearStats.map((s, i) => {
                  const mv = monthlyValue(s.totalAmount, s.frequency);
                  return (
                    <tr key={s.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.bg }}>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>{s.date}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px' }}>{s.packageName || '—'}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px' }}>{FREQ_LABELS[s.frequency] || s.frequency || '—'}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>{s.totalAmount ? `£${s.totalAmount.toFixed(2)}` : '—'}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: mv ? '#16a34a' : C.muted, padding: '10px 14px', whiteSpace: 'nowrap' }}>{mv ? `£${mv.toFixed(2)}/mo` : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.emailSent ? '#dcfce7' : '#f1f5f9', color: s.emailSent ? '#16a34a' : C.muted }}>
                          {s.emailSent ? `✓ ${s.emailSentAt?.toDate ? s.emailSentAt.toDate().toLocaleDateString('en-GB') : 'Sent'}` : 'Not sent'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.converted ? '#dcfce7' : '#fef2f2', color: s.converted ? '#16a34a' : '#dc2626' }}>
                          {s.converted ? '✓ Booked' : '✗ Lost'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
