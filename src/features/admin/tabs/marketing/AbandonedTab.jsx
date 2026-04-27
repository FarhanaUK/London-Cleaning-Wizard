import { FONT, statCard } from './shared.jsx';

export default function AbandonedTab({ abandonmentStats, C }) {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekN = (() => {
    const d = new Date(now); d.setHours(0,0,0,0);
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return Math.ceil((day + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
  })();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const todayStats  = abandonmentStats.filter(s => s.date === today);
  const weekStats   = abandonmentStats.filter(s => s.week === weekN && s.year === year);
  const monthStats  = abandonmentStats.filter(s => s.month === month && s.year === year);
  const yearStats   = abandonmentStats.filter(s => s.year === year);

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

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
        {statCard('Today',      todayStats.length,  pct(todayStats),  C)}
        {statCard('This Week',  weekStats.length,   pct(weekStats),   C)}
        {statCard('This Month', monthStats.length,  pct(monthStats),  C)}
        {statCard('This Year',  yearStats.length,   pct(yearStats),   C)}
      </div>

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
                  {['Date', 'Package', 'Deposit', 'Email Sent', 'Converted'].map(h => (
                    <th key={h} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearStats.map((s, i) => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.bg }}>
                    <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>{s.date}</td>
                    <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px' }}>{s.packageName || '—'}</td>
                    <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>£{(s.depositAmount || 0).toFixed(2)}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
