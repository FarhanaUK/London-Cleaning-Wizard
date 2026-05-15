import { useMemo, useState } from 'react';
import { FONT, statCard } from './shared.jsx';
import { db } from '../../../../firebase/firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';

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

export default function AbandonedTab({ abandonmentStats, funnelData = [], bookings, C }) {
  const [selected, setSelected] = useState(new Set());
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekN = (() => {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return Math.ceil((day + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
  })();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Exclude customers who completed booking on their own (no email sent, already converted) — those are normal bookings, not abandonment cases
  const isAbandonment = s => !(s.converted && !s.emailSent);
  const todayStats = abandonmentStats.filter(s => s.date === today && isAbandonment(s));
  const weekStats  = abandonmentStats.filter(s => s.week === weekN && s.year === year && isAbandonment(s));
  const monthStats = abandonmentStats.filter(s => s.month === month && s.year === year && isAbandonment(s));
  const yearStats  = abandonmentStats.filter(s => s.year === year && isAbandonment(s));

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
    const emailed = arr.filter(s => s.emailSent).length;
    if (!emailed) return '—';
    const conv = arr.filter(s => s.emailSent && s.converted).length;
    return `${Math.round((conv / emailed) * 100)}% converted`;
  };

  const emailPct = (arr) => {
    const total = arr.length;
    if (!total) return null;
    const sent = arr.filter(s => s.emailSent).length;
    return `${sent} email${sent !== 1 ? 's' : ''} sent`;
  };

  const totalLost      = yearStats.filter(s => s.emailSent && !s.converted).reduce((sum, s) => sum + getLost(s), 0);
  const totalRecovered = yearStats.filter(s => s.emailSent && s.converted).reduce((sum, s) => sum + getRecovered(s), 0);

  // Package breakdown
  const pkgCounts = useMemo(() => {
    const map = {};
    yearStats.forEach(s => {
      const key = s.packageName || 'Unknown';
      if (!map[key]) map[key] = { total: 0, converted: 0 };
      map[key].total++;
      if (s.emailSent && s.converted) map[key].converted++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [yearStats]);

  const [showSessions, setShowSessions] = useState(false);
  const [deletingAll,  setDeletingAll]  = useState(false);

  const deleteSessions = async (ids) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(db, 'bookingFunnel', id)));
    await batch.commit();
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${funnelMonth.length} funnel sessions for this month?`)) return;
    setDeletingAll(true);
    await deleteSessions(funnelMonth.map(s => s.id)).catch(() => {});
    setDeletingAll(false);
  };

  // Funnel — per session, only count the highest step reached; exclude converted
  const funnelMonth = funnelData.filter(s => s.month === month && s.year === year);
  const STEP_LABELS = ['', 'Service', 'Schedule', 'Details', 'Payment'];
  const funnelRows = useMemo(() => {
    const total = funnelMonth.length;
    if (!total) return [];
    return [1, 2, 3, 4].map(s => {
      const reached    = funnelMonth.filter(d => d.maxStep >= s).length;
      const abandoned  = funnelMonth.filter(d => d.maxStep === s && !d.converted).length;
      const pctReached = Math.round((reached / total) * 100);
      const pctDrop    = reached > 0 ? Math.round((abandoned / reached) * 100) : 0;
      return { step: s, label: STEP_LABELS[s], reached, abandoned, pctReached, pctDrop };
    });
  }, [funnelMonth]);
  const funnelConverted = funnelMonth.filter(d => d.converted).length;

  return (
    <>
      {/* Booking Funnel */}
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>Booking funnel — {month}/{year}</div>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 14 }}>Each session counted once at the furthest step reached. Abandoned = left at that step without going further.</div>
      {funnelRows.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px 20px', fontFamily: FONT, fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 24 }}>
          No funnel data yet this month. Data will appear as visitors use the booking page.
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
          {funnelRows.map((row, i) => (
            <div key={row.step} style={{ padding: '14px 18px', borderBottom: i < funnelRows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accent, background: `${C.accent}22`, borderRadius: 4, padding: '2px 7px' }}>Step {row.step}</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{row.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{row.reached} reached</span>
                  {row.abandoned > 0 && (
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', borderRadius: 4, padding: '2px 8px' }}>
                      {row.abandoned} dropped ({row.pctDrop}%)
                    </span>
                  )}
                </div>
              </div>
              <div style={{ background: C.bg, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${row.pctReached}%`, background: row.pctReached > 60 ? '#16a34a' : row.pctReached > 30 ? C.accent : '#dc2626', borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginTop: 4 }}>{row.pctReached}% of all sessions reached this step</div>
            </div>
          ))}
          <div style={{ padding: '14px 18px', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 4, padding: '2px 7px' }}>Completed</span>
              <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>Booking confirmed</span>
            </div>
            <span style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              {funnelConverted} booked ({funnelMonth.length > 0 ? Math.round((funnelConverted / funnelMonth.length) * 100) : 0}% overall)
            </span>
          </div>
        </div>
      )}

      {/* Session log */}
      {funnelMonth.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => setShowSessions(s => !s)} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: 12, color: C.muted, cursor: 'pointer', padding: 0 }}>
              {showSessions ? '▲' : '▼'} {showSessions ? 'Hide' : 'Show'} session log ({funnelMonth.length} sessions)
            </button>
            <button onClick={handleDeleteAll} disabled={deletingAll} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, fontFamily: FONT, fontSize: 11, color: '#dc2626', cursor: 'pointer', padding: '4px 12px' }}>
              {deletingAll ? 'Deleting…' : 'Clear all this month'}
            </button>
          </div>
          {showSessions && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 32px', gap: 0 }}>
                {['Date', 'Step', 'Status', 'Time', ''].map((h, i) => (
                  <div key={i} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>{h}</div>
                ))}
                {[...funnelMonth].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).map((s, i) => {
                  const stepLabel = s.converted ? 'Completed' : ['', 'Service', 'Schedule', 'Details', 'Payment'][s.maxStep] || `Step ${s.maxStep}`;
                  const ts = s.updatedAt?.toDate ? s.updatedAt.toDate() : null;
                  const time = ts ? ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
                  const rowBg = i % 2 === 0 ? C.card : C.bg;
                  return [
                    <div key={`d${s.id}`} style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: rowBg }}>{s.date || '—'}</div>,
                    <div key={`s${s.id}`} style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: rowBg }}>{stepLabel}</div>,
                    <div key={`st${s.id}`} style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: rowBg }}>
                      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: s.converted ? '#dcfce7' : '#fef2f2', color: s.converted ? '#16a34a' : '#dc2626' }}>
                        {s.converted ? 'Booked' : 'Dropped'}
                      </span>
                    </div>,
                    <div key={`t${s.id}`} style={{ fontFamily: FONT, fontSize: 11, color: C.muted, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: rowBg }}>{time}</div>,
                    <div key={`x${s.id}`} style={{ padding: '4px 8px', borderBottom: `1px solid ${C.border}`, background: rowBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button onClick={() => deleteSessions([s.id])} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: 2 }}>×</button>
                    </div>,
                  ];
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Volume cards */}
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>Abandonment events — how many customers started a booking but didn't complete payment</div>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 14 }}>Conversion rate = % of emailed customers who then booked</div>
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
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{yearStats.filter(s => s.emailSent && !s.converted).length} emailed, not converted</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Recovered this year</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#16a34a' }}>£{totalRecovered.toFixed(2)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{yearStats.filter(s => s.emailSent && s.converted).length} email → booked · amount paid</div>
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
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>Abandonment Events — {year}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{yearStats.length} total · {emailPct(yearStats)}</span>
            {selected.size > 0 && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete ${selected.size} selected event${selected.size !== 1 ? 's' : ''}?`)) return;
                  const batch = writeBatch(db);
                  selected.forEach(id => batch.delete(doc(db, 'abandonmentStats', id)));
                  await batch.commit().catch(() => {});
                  setSelected(new Set());
                }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, fontFamily: FONT, fontSize: 11, color: '#dc2626', cursor: 'pointer', padding: '4px 12px' }}
              >
                Delete selected ({selected.size})
              </button>
            )}
            {yearStats.length > 0 && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete all ${yearStats.length} abandonment events for ${year}?`)) return;
                  const batch = writeBatch(db);
                  yearStats.forEach(s => batch.delete(doc(db, 'abandonmentStats', s.id)));
                  await batch.commit().catch(() => {});
                  setSelected(new Set());
                }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, fontFamily: FONT, fontSize: 11, color: '#dc2626', cursor: 'pointer', padding: '4px 12px' }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        {yearStats.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>No abandonment events yet this year.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  <th style={{ padding: '10px 14px' }}>
                    <input type="checkbox"
                      checked={yearStats.length > 0 && selected.size === yearStats.length}
                      onChange={e => setSelected(e.target.checked ? new Set(yearStats.map(s => s.id)) : new Set())}
                      style={{ accentColor: C.accent, cursor: 'pointer' }}
                    />
                  </th>
                  {['Date', 'Step', 'Package', 'Frequency', 'First Clean', 'Monthly Value', 'Email Sent', 'Outcome', ''].map(h => (
                    <th key={h} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearStats.map((s, i) => {
                  const mv = monthlyValue(s.totalAmount, s.frequency);
                  return (
                    <tr key={s.id} style={{ borderTop: `1px solid ${C.border}`, background: selected.has(s.id) ? `${C.accent}11` : i % 2 === 0 ? C.card : C.bg }}>
                      <td style={{ padding: '10px 14px' }}>
                        <input type="checkbox" checked={selected.has(s.id)}
                          onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(s.id) : n.delete(s.id); return n; })}
                          style={{ accentColor: C.accent, cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>{s.date}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.step === 3 ? '#fef9c3' : '#e0f2fe', color: s.step === 3 ? '#854d0e' : '#0369a1' }}>
                          {s.step === 3 ? 'Details' : 'Payment'}
                        </span>
                      </td>
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
                        {s.emailSent && s.converted
                          ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#16a34a' }}>✓ Converted</span>
                          : s.emailSent && !s.converted
                          ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626' }}>✗ Not converted</span>
                          : s.converted
                          ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: C.muted }}>Booked (no email)</span>
                          : <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: C.muted }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <button onClick={() => { if (window.confirm('Delete this event?')) deleteDoc(doc(db, 'abandonmentStats', s.id)).catch(() => {}); }} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 2 }}>×</button>
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
