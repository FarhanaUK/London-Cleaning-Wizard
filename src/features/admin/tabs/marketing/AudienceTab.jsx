import { useMemo, useState } from 'react';
import { FONT, statCard } from './shared.jsx';

const PERIODS = ['Week', 'Month', 'Year', 'All time'];

const PKG_LABELS = {
  standard:   'Standard',
  refresh:    'Refresh',
  deep:       'Deep Clean',
  hourly:     'Hourly',
  commercial: 'Commercial',
};

const FREQ_LABELS = {
  'one-off':    'One-off',
  weekly:       'Weekly',
  fortnightly:  'Fortnightly',
  monthly:      'Monthly',
};

function weekNumber(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return Math.ceil((day + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
}

function makePeriodFilter(period, week, month, year) {
  return (b) => {
    if (period === 'All time') return true;
    if (!b.cleanDate) return false;
    const d = new Date(b.cleanDate + 'T12:00:00');
    if (period === 'Week')  return weekNumber(d) === week && d.getFullYear() === year;
    if (period === 'Month') return d.getMonth() + 1 === month && d.getFullYear() === year;
    if (period === 'Year')  return d.getFullYear() === year;
    return true;
  };
}

function BreakdownTable({ rows, keyField, C }) {
  if (!rows.length) return (
    <div style={{ padding: '16px 18px', fontFamily: FONT, fontSize: 13, color: C.muted }}>No data for this period.</div>
  );
  return (
    <div style={{ padding: '8px 0' }}>
      {rows.map((row, i) => {
        const pct = row.pct;
        return (
          <div key={row[keyField]} style={{ padding: '10px 18px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{row.in} / {row.total} &nbsp;·&nbsp; <span style={{ color: '#16a34a', fontWeight: 600 }}>{pct}%</span></span>
            </div>
            <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#16a34a', borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AudienceTab({ bookings, C }) {
  const [mkPeriod, setMkPeriod] = useState('Month');
  const [stPeriod, setStPeriod] = useState('Month');

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const week  = weekNumber(now);

  const allBookings = useMemo(() => bookings.filter(b => !b.status?.startsWith('cancelled')), [bookings]);

  // ── Marketing opt-in/out ──────────────────────────────────────
  const mkFilter   = useMemo(() => makePeriodFilter(mkPeriod, week, month, year), [mkPeriod, week, month, year]);
  const mkBookings = useMemo(() => allBookings.filter(mkFilter), [allBookings, mkFilter]);

  const optedIn  = mkBookings.filter(b => !b.marketingOptOut && !b.doNotContact).length;
  const optedOut = mkBookings.filter(b =>  b.marketingOptOut ||  b.doNotContact).length;
  const total    = optedIn + optedOut;
  const optInPct = total ? Math.round((optedIn / total) * 100) : 0;

  const pkgBreakdown = useMemo(() => {
    const map = {};
    mkBookings.forEach(b => {
      const key = b.packageId || b.package || 'unknown';
      if (!map[key]) map[key] = { in: 0, out: 0 };
      if (!b.marketingOptOut && !b.doNotContact) map[key].in++;
      else map[key].out++;
    });
    return Object.entries(map).map(([key, v]) => ({
      pkg: key,
      label: PKG_LABELS[key] || key,
      in: v.in, out: v.out, total: v.in + v.out,
      pct: v.in + v.out ? Math.round((v.in / (v.in + v.out)) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [mkBookings]);

  const freqBreakdown = useMemo(() => {
    const map = {};
    mkBookings.forEach(b => {
      const key = b.frequency || 'unknown';
      if (!map[key]) map[key] = { in: 0, out: 0 };
      if (!b.marketingOptOut && !b.doNotContact) map[key].in++;
      else map[key].out++;
    });
    return Object.entries(map).map(([key, v]) => ({
      freq: key,
      label: FREQ_LABELS[key] || key,
      in: v.in, out: v.out, total: v.in + v.out,
      pct: v.in + v.out ? Math.round((v.in / (v.in + v.out)) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [mkBookings]);

  // ── Signature Touch ───────────────────────────────────────────
  const standardBookings = useMemo(() => allBookings.filter(b => b.package === 'standard' || b.packageId === 'standard'), [allBookings]);
  const stFilterFn = useMemo(() => makePeriodFilter(stPeriod, week, month, year), [stPeriod, week, month, year]);
  const stBookings = useMemo(() => standardBookings.filter(stFilterFn), [standardBookings, stFilterFn]);

  // Deduplicate by recurringId (recurring series = 1 customer) or email/name for one-offs
  const uniqueStCustomers = (bookings) => {
    const seen = new Set();
    bookings.forEach(b => {
      const key = b.recurringId || b.email || b.customerEmail || b.name || b.customerName || b.id;
      seen.add(key);
    });
    return seen.size;
  };

  const stOptedIn  = uniqueStCustomers(stBookings.filter(b => b.signatureTouch !== false));
  const stOptedOut = uniqueStCustomers(stBookings.filter(b => b.signatureTouch === false));
  const stTotal    = stOptedIn + stOptedOut;

  const reasonCounts = useMemo(() => {
    const counts = {};
    standardBookings.forEach(b => {
      if (b.signatureTouch === false && b.signatureTouchNotes) {
        const r = b.signatureTouchNotes.trim();
        if (r) counts[r] = (counts[r] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [standardBookings]);

  const PeriodButtons = ({ period, setPeriod }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {PERIODS.map(p => (
        <button key={p} onClick={() => setPeriod(p)} style={{
          fontFamily: FONT, fontSize: 11, fontWeight: period === p ? 600 : 400,
          padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 4,
          background: period === p ? C.accent : C.card,
          color: period === p ? '#fff' : C.muted, cursor: 'pointer',
        }}>{p}</button>
      ))}
    </div>
  );

  return (
    <>
      {/* Marketing header + period filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>Marketing Opt-ins</div>
        <PeriodButtons period={mkPeriod} setPeriod={setMkPeriod} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {statCard('Opted In',  optedIn,  `${optInPct}% of bookings`, C)}
        {statCard('Opted Out', optedOut, `${100 - optInPct}% of bookings`, C)}
        {statCard('Total',     total,    'non-cancelled bookings', C)}
      </div>

      {/* Opt-in bar */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, color: C.text, fontWeight: 600 }}>Opt-in rate</span>
          <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{optInPct}%</span>
        </div>
        <div style={{ height: 8, background: C.bg, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${optInPct}%`, background: '#16a34a', borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 11, color: '#16a34a' }}>Opted in: {optedIn}</span>
          <span style={{ fontFamily: FONT, fontSize: 11, color: '#dc2626' }}>Opted out: {optedOut}</span>
        </div>
      </div>

      {/* Breakdown tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>By package</span>
          </div>
          <BreakdownTable rows={pkgBreakdown} keyField="pkg" C={C} />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>By frequency</span>
          </div>
          <BreakdownTable rows={freqBreakdown} keyField="freq" C={C} />
        </div>
      </div>

      {/* Signature Touch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>Signature Touch (Standard package only)</div>
        <PeriodButtons period={stPeriod} setPeriod={setStPeriod} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
        {statCard('Opted In',  stOptedIn,  stTotal ? `${Math.round((stOptedIn / stTotal) * 100)}%` : '—', C)}
        {statCard('Opted Out', stOptedOut, stTotal ? `${Math.round((stOptedOut / stTotal) * 100)}%` : '—', C)}
        {statCard('Eligible',  stTotal,    'standard bookings', C)}
      </div>

      {/* Top opt-out reasons */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>Top opt-out reasons — all time</span>
        </div>
        {reasonCounts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>No opt-out reasons recorded yet.</div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {reasonCounts.map(([reason, count], i) => (
              <div key={reason} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: i < reasonCounts.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.muted, width: 18, textAlign: 'center' }}>#{i + 1}</div>
                <div style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: C.text }}>{reason}</div>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.accent }}>{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
