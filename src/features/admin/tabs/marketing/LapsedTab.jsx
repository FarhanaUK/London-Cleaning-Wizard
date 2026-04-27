import { useState, useMemo } from 'react';
import { FONT, statCard } from './shared.jsx';

const DAYS_LAPSED = 90;

export default function LapsedTab({ bookings, C }) {
  const [search, setSearch] = useState('');
  const cutoff = new Date(Date.now() - DAYS_LAPSED * 24 * 60 * 60 * 1000);

  const lapsed = useMemo(() => {
    const byEmail = {};
    bookings.forEach(b => {
      if (!b.email || !b.cleanDate) return;
      const existing = byEmail[b.email.toLowerCase()];
      if (!existing || b.cleanDate > existing.cleanDate) {
        byEmail[b.email.toLowerCase()] = b;
      }
    });
    return Object.values(byEmail)
      .filter(b => new Date(b.cleanDate) < cutoff)
      .sort((a, b) => b.cleanDate.localeCompare(a.cleanDate));
  }, [bookings, cutoff]);

  const filtered = search
    ? lapsed.filter(b =>
        `${b.firstName} ${b.lastName} ${b.email}`.toLowerCase().includes(search.toLowerCase())
      )
    : lapsed;

  const daysSince = (dateStr) => Math.floor((Date.now() - new Date(dateStr)) / 86400000);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
        {statCard(`${DAYS_LAPSED}+ Days`, lapsed.length, 'customers lapsed', C)}
        {statCard('90–180 Days', lapsed.filter(b => daysSince(b.cleanDate) <= 180).length, 'recently lapsed', C)}
        {statCard('180+ Days', lapsed.filter(b => daysSince(b.cleanDate) > 180).length, 'long lapsed', C)}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>Lapsed Customers</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            style={{ fontFamily: FONT, fontSize: 12, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, outline: 'none', width: 200 }}
          />
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>
            {lapsed.length === 0 ? 'No lapsed customers — great retention!' : 'No results for that search.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Customer', 'Email', 'Last Booked', 'Days Since', 'Last Service'].map(h => (
                    <th key={h} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const days = daysSince(b.cleanDate);
                  return (
                    <tr key={b.email} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.bg }}>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 500 }}>{b.firstName} {b.lastName}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.muted, padding: '10px 14px' }}>{b.email}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>{new Date(b.cleanDate).toLocaleDateString('en-GB')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: days > 180 ? '#fef2f2' : '#fff7ed', color: days > 180 ? '#dc2626' : '#d97706' }}>
                          {days}d
                        </span>
                      </td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px' }}>{b.packageName || '—'}</td>
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
