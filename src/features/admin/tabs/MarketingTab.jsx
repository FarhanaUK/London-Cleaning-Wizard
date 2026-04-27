import { useState, useMemo } from 'react';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const DAYS_LAPSED = 90;

function statCard(label, value, sub, C) {
  return (
    <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', minWidth: 120 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AbandonedTab({ abandonmentStats, C }) {
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
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
        {statCard('Today',      todayStats.length,  pct(todayStats),  C)}
        {statCard('This Week',  weekStats.length,   pct(weekStats),   C)}
        {statCard('This Month', monthStats.length,  pct(monthStats),  C)}
        {statCard('This Year',  yearStats.length,   pct(yearStats),   C)}
      </div>

      {/* Table */}
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

function LapsedTab({ bookings, C }) {
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

export default function MarketingTab({ abandonmentStats, bookings, isMobile, C }) {
  const [subTab, setSubTab] = useState('abandoned');

  const tabs = [
    { id: 'abandoned', label: 'Abandoned Bookings' },
    { id: 'lapsed',    label: 'Lapsed Customers' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Marketing</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Track abandonment and re-engage customers who haven't booked recently.</div>
      </div>

      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            fontFamily: FONT, fontSize: 13, fontWeight: subTab === t.id ? 600 : 400,
            color: subTab === t.id ? C.accent : C.muted,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px', borderBottom: subTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'abandoned' && <AbandonedTab abandonmentStats={abandonmentStats} C={C} />}
      {subTab === 'lapsed'    && <LapsedTab bookings={bookings} C={C} />}
    </div>
  );
}
