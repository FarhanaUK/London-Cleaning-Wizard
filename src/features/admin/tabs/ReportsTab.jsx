import { useState } from 'react';
import { PACKAGES } from '../../../data/siteData';
import { calcHours, fmtDate, fmtDuration } from '../utils';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const getTaxYears = () => {
  const now = new Date();
  const years = [];
  for (let y = now.getFullYear(); y >= 2025; y--) {
    const start = new Date(y, 3, 6);
    const end   = new Date(y + 1, 3, 5);
    years.push({ label: `${y}/${String(y+1).slice(2)} tax year`, start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  }
  return years;
};

const currentTaxYear = () => {
  const now = new Date();
  const y = now >= new Date(now.getFullYear(), 3, 6) ? now.getFullYear() : now.getFullYear() - 1;
  return { start: `${y}-04-06`, end: `${y+1}-04-05`, label: `${y}/${String(y+1).slice(2)}` };
};

const getReportMonths = () => {
  const months = [];
  const start = new Date(2026, 0, 1);
  const now = new Date();
  const cur = new Date(now.getFullYear(), now.getMonth(), 1);
  let d = new Date(start);
  while (d <= cur) {
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return months.reverse();
};

const fmtReportMonth = key => {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m)-1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ReportsTab({ bookings, expenses, staff, fixedCosts, supplies = [], isMobile, C }) {
  const [reportsTaxYear, setReportsTaxYear] = useState(() => currentTaxYear().label);
  const [reportsMode,    setReportsMode]    = useState('taxYear');
  const [reportsMonth,   setReportsMonth]   = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; });
  const [reportsYear,    setReportsYear]    = useState(() => String(new Date().getFullYear()));

  const INPUT = { width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', marginBottom: 16, boxSizing: 'border-box' };

  const now             = new Date();
  const allTaxYears     = getTaxYears();
  const allReportMonths = getReportMonths();
  const isMonthMode     = reportsMode === 'month';

  // ── Period boundaries ──
  let periodStart, periodEnd, periodLabel;
  if (isMonthMode) {
    const [py, pm] = reportsMonth.split('-').map(Number);
    const lastDay  = new Date(py, pm, 0).getDate();
    periodStart    = `${reportsMonth}-01`;
    periodEnd      = `${reportsMonth}-${String(lastDay).padStart(2,'0')}`;
    periodLabel    = fmtReportMonth(reportsMonth);
  } else {
    const taxYear = allTaxYears.find(ty => ty.label.replace(' tax year','') === reportsTaxYear) || currentTaxYear();
    periodStart   = taxYear.start;
    periodEnd     = taxYear.end;
    periodLabel   = reportsTaxYear;
  }

  // Fixed costs active during a period
  const fixedCostsForPeriod = (pStart, pEnd) => fixedCosts.filter(f => {
    if (!f.active) return false;
    if (f.startDate && f.startDate > pEnd) return false;
    if (f.endDate && f.endDate < pStart) return false;
    return true;
  });
  const fixedMonthlyForPeriod = (pStart, pEnd) => fixedCostsForPeriod(pStart, pEnd).reduce((s, f) => {
    const amt = parseFloat(f.amount) || 0;
    return s + (f.frequency === 'yearly' ? amt / 12 : amt);
  }, 0);
  const fixedMonthly = fixedMonthlyForPeriod(periodStart, periodEnd);

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const periodBookings = activeBookings.filter(b => b.cleanDate >= periodStart && b.cleanDate <= periodEnd);

  const bookingLabour = b => {
    const hrs = calcHours(b.actualStart, b.actualFinish);
    if (!hrs) return 0;
    const member = staff.find(m => m.name === b.assignedStaff);
    const rate = member && member.hourlyRate !== 'N/A' ? parseFloat(member.hourlyRate) : 0;
    return hrs * rate;
  };

  // ── KPIs ──
  const periodRev    = periodBookings.reduce((s, b) => s + (parseFloat(b.total)||0), 0);
  const periodLabour = periodBookings.reduce((s, b) => s + bookingLabour(b), 0);
  const periodExp    = expenses.filter(e => e.date >= periodStart && e.date <= periodEnd).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const periodFixed  = isMonthMode ? fixedMonthly : fixedMonthly * 12;
  const periodProfit = periodRev - periodLabour - periodExp - periodFixed;
  const periodMargin = periodRev > 0 ? (periodProfit / periodRev) * 100 : 0;
  const avgJobVal    = periodBookings.length > 0 ? periodRev / periodBookings.length : 0;

  const totalBkgs     = bookings.filter(b => b.cleanDate >= periodStart && b.cleanDate <= periodEnd).length;
  const cancelledBkgs = bookings.filter(b => b.cleanDate >= periodStart && b.cleanDate <= periodEnd && b.status === 'cancelled').length;
  const cancelRate    = totalBkgs > 0 ? (cancelledBkgs / totalBkgs) * 100 : 0;

  // ── Top customers ──
  const customerMap = {};
  periodBookings.forEach(b => {
    const key = b.email || `${b.firstName} ${b.lastName}`;
    if (!customerMap[key]) customerMap[key] = { name: `${b.firstName||''} ${b.lastName||''}`.trim(), email: b.email||'', spend: 0, jobs: 0 };
    customerMap[key].spend += parseFloat(b.total)||0;
    customerMap[key].jobs  += 1;
  });
  const topCustomers = Object.values(customerMap).sort((a, b) => b.spend - a.spend).slice(0, 5);

  // ── Busiest days ──
  const dayCounts = [0,1,2,3,4,5,6].map(d => ({
    label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d],
    count: periodBookings.filter(b => b.cleanDate && new Date(b.cleanDate).getDay() === d).length,
  }));
  const maxDay = Math.max(...dayCounts.map(d => d.count), 1);

  // ── Package breakdown ──
  const pkgMap = {};
  periodBookings.forEach(b => {
    const p = b.packageName || PACKAGES.find(pkg => pkg.id === b.package)?.name || b.package || 'Unknown';
    if (!pkgMap[p]) pkgMap[p] = { count: 0, rev: 0 };
    pkgMap[p].count += 1;
    pkgMap[p].rev   += parseFloat(b.total)||0;
  });
  const pkgBreakdown = Object.entries(pkgMap).sort((a, b) => b[1].rev - a[1].rev);

  // ── Staff performance ──
  const staffPerf = staff.filter(s => s.status === 'Active').map(s => {
    const sJobs  = periodBookings.filter(b => b.assignedStaff === s.name);
    const sHours = sJobs.reduce((t, b) => { const h = calcHours(b.actualStart, b.actualFinish); return t + (h||0); }, 0);
    const sCost  = sJobs.reduce((t, b) => t + bookingLabour(b), 0);
    const sRev   = sJobs.reduce((t, b) => t + (parseFloat(b.total)||0), 0);
    return { name: s.name, jobs: sJobs.length, hours: sHours, cost: sCost, rev: sRev };
  }).filter(s => s.jobs > 0).sort((a, b) => b.jobs - a.jobs);

  // ── Reimbursable expenses + supplies ──
  const reimbursableExp     = expenses.filter(e => e.date >= periodStart && e.date <= periodEnd && e.paidBy && e.paidBy !== 'Company Card' && !e.repaid).map(e => ({ id: e.id, name: e.description || '—', paidBy: e.paidBy, date: e.date, amount: parseFloat(e.amount) || 0, type: 'expense' }));
  const reimbursableSup     = supplies.filter(s => s.paidBy === 'Personal — Reimbursable' && !s.repaid && s.purchaseDate >= periodStart && s.purchaseDate <= periodEnd).map(s => ({ id: s.id, name: s.name || '—', paidBy: s.paidBy, date: s.purchaseDate, amount: (parseFloat(s.unitCost) || 0) * (Number(s.inStock) || 0), type: 'supply' }));
  const reimbursable        = [...reimbursableExp, ...reimbursableSup].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const reimbursableTotal   = reimbursable.reduce((s, e) => s + e.amount, 0);

  // ── Frequency breakdown ──
  const freqMap = {};
  periodBookings.forEach(b => {
    const f = b.frequency || 'One-off';
    if (!freqMap[f]) freqMap[f] = { count: 0, rev: 0 };
    freqMap[f].count += 1;
    freqMap[f].rev   += parseFloat(b.total)||0;
  });
  const freqBreakdown = Object.entries(freqMap).sort((a, b) => b[1].count - a[1].count);

  // ── Revenue by postcode (top 8) ──
  const postcodeMap = {};
  periodBookings.forEach(b => {
    const pc = (b.postcode || '').trim().toUpperCase().split(' ')[0] || 'Unknown';
    if (!postcodeMap[pc]) postcodeMap[pc] = { count: 0, rev: 0 };
    postcodeMap[pc].count += 1;
    postcodeMap[pc].rev   += parseFloat(b.total)||0;
  });
  const topPostcodes = Object.entries(postcodeMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 8);
  const maxPcRev     = Math.max(...topPostcodes.map(([, v]) => v.rev), 1);

  // ── Profit per job (top 8) ──
  const jobProfits = periodBookings.map(b => {
    const rev    = parseFloat(b.total)||0;
    const labour = bookingLabour(b);
    const profit = rev - labour;
    return { ref: b.bookingRef||'—', name: `${b.firstName||''} ${b.lastName||''}`.trim(), date: b.cleanDate, rev, labour, profit };
  }).sort((a, b) => b.profit - a.profit).slice(0, 8);

  // ── Tax-year-only: 12 monthly bars + MoM + supplies trend ──
  const tyStartYear = !isMonthMode ? parseInt((allTaxYears.find(ty => ty.label.replace(' tax year','') === reportsTaxYear) || currentTaxYear()).label.replace(' tax year','').split('/')[0]) : null;
  const last12 = !isMonthMode ? Array.from({ length: 12 }, (_, i) => {
    const d      = new Date(tyStartYear, 3 + i, 1);
    const key    = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const mStart = i === 0  ? periodStart : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-06`;
    const nextD  = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const mEnd   = i === 11 ? periodEnd   : `${nextD.getFullYear()}-${String(nextD.getMonth()+1).padStart(2,'0')}-05`;
    const label  = d.toLocaleString('en-GB', { month: 'short' });
    const bkgs   = activeBookings.filter(b => b.cleanDate >= mStart && b.cleanDate <= mEnd);
    const rev    = bkgs.reduce((s, b) => s + (parseFloat(b.total)||0), 0);
    const lab    = bkgs.reduce((s, b) => s + bookingLabour(b), 0);
    const exp    = expenses.filter(e => e.date >= mStart && e.date <= mEnd).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    const costs  = lab + exp + fixedMonthlyForPeriod(mStart, mEnd);
    const isFuture = d > now;
    return { key, label, rev, costs, profit: rev - costs, jobs: bkgs.length, isFuture };
  }) : [];
  const maxRev = last12.length ? Math.max(...last12.map(m => Math.max(m.rev, m.costs)), 1) : 1;

  const momData = last12.filter(m => !m.isFuture).map(m => {
    const d       = new Date(m.key + '-01');
    const prevKey = `${d.getFullYear()-1}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const prevRev = activeBookings.filter(b => b.cleanDate?.startsWith(prevKey)).reduce((s, b) => s + (parseFloat(b.total)||0), 0);
    const growth  = prevRev > 0 ? ((m.rev - prevRev) / prevRev) * 100 : null;
    return { label: m.label, rev: m.rev, prevRev, growth };
  });

  const suppliesTrend = !isMonthMode ? last12.map(m => {
    const amt = expenses.filter(e => {
      const mStart = m.key + '-01';
      const nextD  = new Date(m.key + '-01'); nextD.setMonth(nextD.getMonth() + 1);
      const mEnd   = `${nextD.getFullYear()}-${String(nextD.getMonth()+1).padStart(2,'0')}-01`;
      return e.date >= mStart && e.date < mEnd && e.category === 'Supplies';
    }).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    return { label: m.label, amt, isFuture: m.isFuture };
  }) : [];
  const maxSupply = suppliesTrend.length ? Math.max(...suppliesTrend.map(m => m.amt), 1) : 1;

  const monthSuppliesTotal = isMonthMode
    ? expenses.filter(e => e.date >= periodStart && e.date <= periodEnd && e.category === 'Supplies').reduce((s, e) => s + (parseFloat(e.amount)||0), 0)
    : 0;

  const availableYears = [...new Set(allReportMonths.map(m => m.split('-')[0]))];

  const RCARD  = { background: C.card, borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
  const RLABEL = { fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 };
  const BIZ    = '#1e40af';

  return (
    <div>
      {/* Title */}
      <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text, marginBottom: 16 }}>Reports</div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {[{ id: 'taxYear', label: 'Tax Year' }, { id: 'month', label: 'Month' }].map(t => (
          <button key={t.id} onClick={() => setReportsMode(t.id)} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '8px 20px', border: 'none', borderBottom: reportsMode === t.id ? `2px solid ${C.text}` : '2px solid transparent', marginBottom: -2, background: 'transparent', color: reportsMode === t.id ? C.text : C.muted, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* Tab controls */}
      {!isMonthMode ? (
        <div style={{ marginBottom: 20 }}>
          <select value={reportsTaxYear} onChange={e => setReportsTaxYear(e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 'auto', fontSize: 13, fontWeight: 600 }}>
            {allTaxYears.map(ty => { const label = ty.label.replace(' tax year',''); return <option key={label} value={label}>{label} tax year</option>; })}
          </select>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {availableYears.map(y => (
              <button key={y} onClick={() => { setReportsYear(y); const first = allReportMonths.find(m => m.startsWith(y)); if (first) setReportsMonth(first); }} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: reportsYear === y ? C.text : C.card, color: reportsYear === y ? C.bg : C.text, cursor: 'pointer' }}>{y}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {MONTH_NAMES.map((name, i) => {
              const key       = `${reportsYear}-${String(i+1).padStart(2,'0')}`;
              const available = allReportMonths.includes(key);
              const active    = reportsMonth === key;
              return (
                <button key={key} disabled={!available} onClick={() => setReportsMonth(key)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '7px 4px', borderRadius: 6, border: `1px solid ${active ? C.text : C.border}`, background: active ? C.text : C.card, color: active ? C.bg : available ? C.text : C.muted, cursor: available ? 'pointer' : 'default', opacity: available ? 1 : 0.35 }}>{name}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Revenue',       value: `£${periodRev.toFixed(0)}`,        sub: `${periodBookings.length} jobs`,              color: '#16a34a' },
          { label: 'Net Profit',    value: `£${periodProfit.toFixed(0)}`,      sub: `${periodMargin.toFixed(1)}% margin`,         color: periodProfit >= 0 ? '#16a34a' : '#dc2626' },
          { label: 'Avg Job Value', value: `£${avgJobVal.toFixed(0)}`,         sub: 'per booking',                                color: BIZ },
          { label: 'Cancel Rate',   value: `${cancelRate.toFixed(1)}%`,        sub: `${cancelledBkgs} of ${totalBkgs} jobs`,      color: cancelRate > 10 ? '#dc2626' : '#f97316' },
          { label: 'Fixed Costs',   value: `£${fixedMonthly.toFixed(0)}/mo`,   sub: isMonthMode ? 'this month' : `£${(fixedMonthly*12).toFixed(0)}/yr`, color: '#f97316' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ ...RCARD, borderTop: `3px solid ${color}` }}>
            <div style={RLABEL}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue vs costs chart — tax year only */}
      {!isMonthMode && (
        <div style={{ ...RCARD, marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 2 }}>Revenue vs Total Costs — Tax Year {reportsTaxYear} (month by month)</div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 12 }}>6 Apr {tyStartYear} – 5 Apr {tyStartYear + 1} · Apr = 6 Apr–5 May, Mar = 6 Mar–5 Apr</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 2 : 6, height: 100, marginBottom: 4 }}>
            {last12.map(m => (
              <div key={m.key} style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end', justifyContent: 'center', opacity: m.isFuture ? 0.2 : 1 }}>
                <div style={{ flex: 1, background: '#16a34a', borderRadius: '3px 3px 0 0', height: `${(m.rev/maxRev)*90}px`, minHeight: m.rev > 0 ? 2 : 0, opacity: 0.85 }} title={`Revenue £${m.rev.toFixed(0)}`} />
                <div style={{ flex: 1, background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${(m.costs/maxRev)*90}px`, minHeight: m.costs > 0 ? 2 : 0, opacity: 0.7 }} title={`Costs £${m.costs.toFixed(0)}`} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: isMobile ? 2 : 6, marginBottom: 8 }}>
            {last12.map(m => (
              <div key={m.key} style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 9, color: C.muted, opacity: m.isFuture ? 0.4 : 1 }}>{m.label}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: '#16a34a', borderRadius: 2 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Revenue</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: '#dc2626', borderRadius: 2, opacity: 0.7 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Total costs</span></div>
          </div>
        </div>
      )}

      {/* Staff performance */}
      {staffPerf.length > 0 && (
        <div style={{ ...RCARD, marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 14 }}>Staff Performance — {periodLabel}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {['Cleaner','Jobs','Hours Worked','Subcontractor Cost','Revenue Generated','Cost %'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffPerf.map((s, i) => (
                  <tr key={s.name} style={{ borderBottom: i < staffPerf.length-1 ? `1px solid ${C.border}` : 'none' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: C.text }}>{s.name}</td>
                    <td style={{ padding: '10px 10px', color: C.text }}>{s.jobs}</td>
                    <td style={{ padding: '10px 10px', color: C.text }}>{fmtDuration(s.hours) || '—'}</td>
                    <td style={{ padding: '10px 10px', color: '#7c3aed', fontWeight: 600 }}>£{s.cost.toFixed(2)}</td>
                    <td style={{ padding: '10px 10px', color: '#16a34a', fontWeight: 600 }}>£{s.rev.toFixed(2)}</td>
                    <td title={s.rev > 0 ? (s.cost/s.rev)*100 > 40 ? `⚠ Cost is ${((s.cost/s.rev)*100).toFixed(1)}% of revenue — above the 40% target.` : `Cost is ${((s.cost/s.rev)*100).toFixed(1)}% of revenue — within target.` : ''} style={{ padding: '10px 10px', color: s.rev > 0 && (s.cost/s.rev)*100 > 40 ? '#dc2626' : C.muted, fontWeight: 600, cursor: s.rev > 0 ? 'default' : 'auto' }}>{s.rev > 0 ? `${((s.cost/s.rev)*100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 10 }}>Cost % = subcontractor pay ÷ revenue. <span style={{ color: '#dc2626', fontWeight: 600 }}>Red = over 40%</span> — target is to keep below 40% per cleaner. Hover for details.</div>
        </div>
      )}

      {/* MoM / Cost breakdown + Reimbursables */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {!isMonthMode ? (
          <div style={RCARD}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Month-on-Month Revenue Growth</div>
            {momData.length === 0
              ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No data yet for this tax year.</div>
              : momData.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: i < momData.length-1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.text, minWidth: 36 }}>{m.label}</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>£{m.rev.toFixed(0)}</span>
                  {m.growth !== null
                    ? <span title={m.growth >= 0 ? `Up ${m.growth.toFixed(1)}% vs same month last year` : `Down ${Math.abs(m.growth).toFixed(1)}% vs same month last year`} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: m.growth >= 0 ? '#16a34a' : '#dc2626', minWidth: 60, textAlign: 'right', cursor: 'default' }}>{m.growth >= 0 ? '▲' : '▼'} {Math.abs(m.growth).toFixed(1)}%</span>
                    : <span title="No revenue in the same month last year to compare against" style={{ fontFamily: FONT, fontSize: 11, color: C.muted, minWidth: 60, textAlign: 'right', cursor: 'default' }}>No prior data</span>
                  }
                </div>
              ))
            }
            <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: FONT, fontSize: 10, color: '#16a34a', fontWeight: 600 }}>▲ Green = up vs same month last year</span>
              <span style={{ fontFamily: FONT, fontSize: 10, color: '#dc2626', fontWeight: 600 }}>▼ Red = down vs same month last year</span>
            </div>
          </div>
        ) : (
          <div style={RCARD}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 16 }}>Cost Breakdown — {periodLabel}</div>
            {[
              { label: 'Revenue',                     value: periodRev,    color: '#16a34a' },
              { label: 'Labour (subcontractors)',      value: periodLabour, color: '#7c3aed' },
              { label: 'Variable expenses',            value: periodExp,    color: '#dc2626' },
              { label: 'Fixed costs (monthly share)',  value: fixedMonthly, color: '#f97316' },
              { label: 'Net Profit',                   value: periodProfit, color: periodProfit >= 0 ? '#16a34a' : '#dc2626', bold: true },
            ].map(({ label, value, color, bold }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: bold ? 700 : 400 }}>{label}</span>
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color }}>£{value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>Outstanding Reimbursements — {periodLabel}</div>
          <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: reimbursableTotal > 0 ? '#dc2626' : '#16a34a', marginBottom: 4 }}>£{reimbursableTotal.toFixed(2)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 12 }}>{reimbursable.length} unpaid item{reimbursable.length !== 1 ? 's' : ''} — money owed back to staff</div>
          {reimbursable.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: '#16a34a' }}>All reimbursements settled ✓</div>
            : reimbursable.slice(0, 5).map((e, i, arr) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{e.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{e.paidBy} · {fmtDate(e.date)}{e.type === 'supply' ? ' · supply' : ''}</div>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>£{e.amount.toFixed(2)}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Supplies + Frequency */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Supplies Spend — {periodLabel}</div>
          {!isMonthMode ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 65, marginBottom: 4 }}>
                {suppliesTrend.map(m => (
                  <div key={m.label} style={{ flex: 1, background: '#7c3aed', borderRadius: '3px 3px 0 0', height: `${(m.amt/maxSupply)*60}px`, minHeight: m.amt > 0 ? 2 : 0, opacity: m.isFuture ? 0.15 : 0.75 }} title={`£${m.amt.toFixed(0)}`} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {suppliesTrend.map(m => (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: m.isFuture ? 0.35 : 1 }}>
                    <div style={{ fontFamily: FONT, fontSize: 9, color: C.muted }}>{m.label}</div>
                    <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: C.text }}>{m.amt > 0 ? `£${m.amt.toFixed(0)}` : '—'}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>£{monthSuppliesTotal.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>Total supplies purchased in {periodLabel}</div>
            </div>
          )}
        </div>

        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Jobs by Frequency — {periodLabel}</div>
          {freqBreakdown.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
            : freqBreakdown.map(([freq, { count, rev }], i, arr) => (
              <div key={freq} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{freq}</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>£{rev.toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{count} job{count !== 1 ? 's' : ''} · avg £{(rev/count).toFixed(0)}</span>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{periodBookings.length > 0 ? `${((count/periodBookings.length)*100).toFixed(0)}% of jobs` : ''}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Postcode revenue + profit per job */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Revenue by Area — {periodLabel}</div>
          {topPostcodes.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
            : topPostcodes.map(([pc, { count, rev }]) => (
              <div key={pc} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>{pc}</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#16a34a' }}>£{rev.toFixed(0)} · {count} job{count!==1?'s':''}</span>
                </div>
                <div style={{ height: 5, background: C.bg, borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${(rev/maxPcRev)*100}%`, background: BIZ, borderRadius: 99 }} />
                </div>
              </div>
            ))
          }
        </div>

        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Most Profitable Jobs — {periodLabel}</div>
          {jobProfits.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
            : jobProfits.map((j, i, arr) => (
              <div key={j.ref} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>{j.name||j.ref}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{fmtDate(j.date)} · Revenue £{j.rev.toFixed(0)} · Labour £{j.labour.toFixed(0)}</div>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: j.profit >= 0 ? '#16a34a' : '#dc2626' }}>£{j.profit.toFixed(0)}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16 }}>
        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Top Customers — {periodLabel}</div>
          {topCustomers.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
            : topCustomers.map((c, i) => (
              <div key={c.email||c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < topCustomers.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: BIZ, minWidth: 18 }}>#{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{c.name||'—'}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{c.jobs} job{c.jobs !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#16a34a' }}>£{c.spend.toFixed(0)}</div>
              </div>
            ))
          }
        </div>

        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Busiest Days — {periodLabel}</div>
          {dayCounts.map(d => (
            <div key={d.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{d.label}</span>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.text }}>{d.count}</span>
              </div>
              <div style={{ height: 5, background: C.bg, borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${(d.count/maxDay)*100}%`, background: BIZ, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Package Breakdown — {periodLabel}</div>
          {pkgBreakdown.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
            : pkgBreakdown.map(([pkg, { count, rev }], i, arr) => (
              <div key={pkg} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, flex: 1, minWidth: 0 }}>{pkg}</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>£{rev.toFixed(0)}</span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{count} job{count !== 1 ? 's' : ''} · avg £{(rev/count).toFixed(0)}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
