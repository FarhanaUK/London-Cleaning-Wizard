import { useState } from 'react';
import { PACKAGES } from '../../../data/siteData';
import { calcHours, fmtDate, fmtDuration } from '../utils';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const getTaxYears = () => {
  const now = new Date();
  const years = [];
  for (let y = now.getFullYear(); y >= 2025; y--) {
    years.push({ label: `${y}/${String(y+1).slice(2)} tax year`, start: `${y}-04-06`, end: `${y+1}-04-05` });
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

export default function ReportsTab({ bookings, expenses, staff, fixedCosts, supplies = [], marketingSpend = [], incidents = [], isMobile, C }) {
  const [reportsTaxYear, setReportsTaxYear] = useState(() => currentTaxYear().label);
  const [reportsMode,    setReportsMode]    = useState('month');
  const [momTooltip,     setMomTooltip]     = useState(false);
  const [reportsMonth,   setReportsMonth]   = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; });
  const [reportsYear,    setReportsYear]    = useState(() => String(new Date().getFullYear()));

  const INPUT = { width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', marginBottom: 16, boxSizing: 'border-box' };

  const now             = new Date();
  const allTaxYears     = getTaxYears();
  const allReportMonths = getReportMonths();
  const isMonthMode     = reportsMode === 'month';
  const today           = now.toISOString().slice(0, 10);
  const thisMonthStr    = today.slice(0, 7);

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

  // Fixed costs active during a period (for monthly display bars)
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
  // Current calendar month boundaries
  const curMonthKey   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const curMonthStart = `${curMonthKey}-01`;
  const curMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const curMonthEnd   = `${curMonthKey}-${String(curMonthLastDay).padStart(2, '0')}`;
  const fixedMonthlyCurrent = fixedMonthlyForPeriod(curMonthStart, curMonthEnd);


  const elapsedTaxMonths = !isMonthMode ? (() => {
    if (new Date(periodEnd) <= now) return 12;
    const startMonth = new Date(new Date(periodStart).getFullYear(), new Date(periodStart).getMonth(), 1);
    const curMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    let count = 0, d = new Date(startMonth);
    while (d <= curMonth) { count++; d.setMonth(d.getMonth() + 1); }
    return Math.min(count, 12);
  })() : 1;

  const activeBookings = bookings.filter(b => !b.status?.startsWith('cancelled'));
  // Exclude master contract records — individual visits have their own cleanDate
  const periodBookings = activeBookings.filter(b => !b.isContract && b.cleanDate >= periodStart && b.cleanDate <= periodEnd);

  // Build master contract lookup for payment checking
  const contractMasterMap = {};
  bookings.filter(b => b.isContract).forEach(b => { contractMasterMap[b.id] = b; });

  const bookingLabour = b => {
    const m1 = staff.find(m => m.name === b.assignedStaff);
    const r1 = m1 && m1.hourlyRate !== 'N/A' ? parseFloat(m1.hourlyRate) : 0;
    const h1 = calcHours(b.actualStart, b.actualFinish) || 0;
    const cost1 = h1 * r1;
    if (!b.secondCleaner) return cost1;
    const m2 = staff.find(m => m.name === b.secondCleaner);
    const r2 = m2 && m2.hourlyRate !== 'N/A' ? parseFloat(m2.hourlyRate) : 0;
    const h2 = calcHours(b.actualStart2, b.actualFinish2) || 0;
    return cost1 + h2 * r2;
  };

  // ── KPIs ──
  const collectedAmt = b => {
    if (b.isContractVisit) {
      const master = contractMasterMap[b.contractId];
      const key = b.cleanDate?.slice(0, 7);
      return key && master?.monthlyPayments?.[key] === 'paid' ? parseFloat(b.total || 0) : 0;
    }
    if (b.status === 'fully_paid')  return parseFloat(b.total)   || 0;
    if (b.status === 'deposit_paid') return parseFloat(b.deposit) || 0;
    return 0;
  };
  const periodRev      = periodBookings.reduce((s, b) => s + collectedAmt(b), 0);
  const periodLabour   = periodBookings.reduce((s, b) => s + bookingLabour(b), 0);
  const periodExp      = expenses.filter(e => e.date >= periodStart && e.date <= periodEnd && e.category !== 'Marketing').reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const periodMktSpend = marketingSpend.filter(e => e.date >= periodStart && e.date <= periodEnd).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const periodSupExp   = supplies.filter(s => s.purchaseDate && s.purchaseDate >= periodStart && s.purchaseDate <= periodEnd).reduce((s, sup) => s + (parseFloat(sup.unitCost)||0) * (Number(sup.inStock)||0), 0);
  const periodCap = isMonthMode ? periodEnd : (new Date(periodEnd) <= now ? periodEnd : curMonthEnd);
  const rptTyMonths = f => {
    if (f.frequency === 'yearly') return 0;
    const effStart = f.startDate && f.startDate > periodStart ? f.startDate : periodStart;
    const startYM = (f.startDate || '').slice(0, 7);
    const payDay = f.dueDayOfMonth ? parseInt(f.dueDayOfMonth) : f.startDate ? parseInt(f.startDate.split('-')[2]) : 1;
    let count = 0;
    let [y, m] = effStart.slice(0, 7).split('-').map(Number);
    const [cy, cm] = periodCap.split('-').map(Number);
    while (y < cy || (y === cy && m <= cm)) {
      const ym = `${y}-${String(m).padStart(2,'0')}`;
      const lastDay = new Date(y, m, 0).getDate();
      const day = (ym === startYM && f.startDate) ? parseInt(f.startDate.split('-')[2]) : Math.min(payDay, lastDay);
      const payDate = `${ym}-${String(day).padStart(2,'0')}`;
      if (payDate >= periodStart && payDate <= periodCap && payDate >= (f.startDate || periodStart)) count++;
      m++; if (m > 12) { m = 1; y++; }
    }
    return count;
  };
  const rptTyYearlyDate = f => {
    if (!f.startDate) return null;
    let d = new Date(f.startDate);
    const psd = new Date(periodStart);
    while (d < psd) d.setFullYear(d.getFullYear() + 1);
    const s = d.toISOString().split('T')[0];
    return s <= periodCap ? s : null;
  };
  const periodFixed = isMonthMode
    ? fixedMonthly
    : fixedCosts.filter(f => f.active && !(f.startDate && f.startDate.slice(0, 7) > thisMonthStr)).reduce((s, f) => {
        const amt = parseFloat(f.amount) || 0;
        if (f.frequency === 'yearly') return s + (rptTyYearlyDate(f) ? amt : 0);
        return s + amt * rptTyMonths(f);
      }, 0);
  const periodIncidents = incidents.filter(i => i.date >= periodStart && i.date <= periodEnd).reduce((s, i) => s + (parseFloat(i.amount)||0), 0);
  const periodProfit = periodRev - periodLabour - periodExp - periodMktSpend - periodSupExp - periodFixed - periodIncidents;
  const periodMargin = periodRev > 0 ? (periodProfit / periodRev) * 100 : 0;
  const avgJobVal    = periodBookings.length > 0 ? periodRev / periodBookings.length : 0;

  const totalBkgs     = bookings.filter(b => b.cleanDate >= periodStart && b.cleanDate <= periodEnd).length;
  const cancelledBkgs = bookings.filter(b => b.cleanDate >= periodStart && b.cleanDate <= periodEnd && b.status?.startsWith('cancelled')).length;
  const cancelRate    = totalBkgs > 0 ? (cancelledBkgs / totalBkgs) * 100 : 0;

  // ── Top customers ──
  const customerMap = {};
  periodBookings.forEach(b => {
    const key = b.email || `${b.firstName} ${b.lastName}`;
    if (!customerMap[key]) customerMap[key] = { name: `${b.firstName||''} ${b.lastName||''}`.trim(), email: b.email||'', spend: 0, jobs: 0 };
    customerMap[key].spend += collectedAmt(b);
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
    pkgMap[p].rev   += collectedAmt(b);
  });
  const pkgBreakdown = Object.entries(pkgMap).sort((a, b) => b[1].rev - a[1].rev);

  // ── Staff performance ──
  const staffPerf = staff.filter(s => s.status === 'Active').map(s => {
    const sRate  = s.hourlyRate !== 'N/A' ? parseFloat(s.hourlyRate) : 0;
    const sJobs  = periodBookings.filter(b => b.assignedStaff === s.name || b.secondCleaner === s.name);
    const sHours = sJobs.reduce((t, b) => {
      const isPrimary = b.assignedStaff === s.name;
      const h = isPrimary ? calcHours(b.actualStart, b.actualFinish) : calcHours(b.actualStart2, b.actualFinish2);
      return t + (h || 0);
    }, 0);
    const sCost  = sHours * sRate;
    const sRev   = sJobs.reduce((t, b) => t + collectedAmt(b), 0);
    return { name: s.name, jobs: sJobs.length, hours: sHours, cost: sCost, rev: sRev };
  }).sort((a, b) => b.jobs - a.jobs);

  // ── Reimbursable expenses + supplies ──
  const reimbursableExp     = expenses.filter(e => e.date >= periodStart && e.date <= periodEnd && e.paidBy === 'Personal — Reimbursable' && !e.repaid).map(e => ({ id: e.id, name: e.description || '—', paidBy: e.paidBy, date: e.date, amount: parseFloat(e.amount) || 0, type: 'expense' }));
  const reimbursableSup     = supplies.filter(s => s.paidBy === 'Personal — Reimbursable' && !s.repaid && s.purchaseDate >= periodStart && s.purchaseDate <= periodEnd).map(s => ({ id: s.id, name: s.name || '—', paidBy: s.paidBy, date: s.purchaseDate, amount: (parseFloat(s.unitCost) || 0) * (Number(s.inStock) || 0), type: 'supply' }));
  const reimbursable        = [...reimbursableExp, ...reimbursableSup].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const reimbursableTotal   = reimbursable.reduce((s, e) => s + e.amount, 0);

  // ── Frequency breakdown ──
  const FREQ_ID_TO_LABEL = { 'one-off': 'One-off', 'weekly': 'Weekly', 'fortnightly': 'Fortnightly', 'monthly': 'Monthly' };
  const freqMap = {};
  periodBookings.forEach(b => {
    const f = FREQ_ID_TO_LABEL[b.frequency] || b.frequency || 'One-off';
    if (!freqMap[f]) freqMap[f] = { count: 0, rev: 0 };
    freqMap[f].count += 1;
    freqMap[f].rev   += collectedAmt(b);
  });
  const freqBreakdown = Object.entries(freqMap).sort((a, b) => b[1].count - a[1].count);

  // ── Revenue by postcode (top 8) ──
  const postcodeMap = {};
  periodBookings.forEach(b => {
    const pc = (b.postcode || '').trim().toUpperCase().split(' ')[0] || 'Unknown';
    if (!postcodeMap[pc]) postcodeMap[pc] = { count: 0, rev: 0 };
    postcodeMap[pc].count += 1;
    postcodeMap[pc].rev   += collectedAmt(b);
  });
  const topPostcodes = Object.entries(postcodeMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 8);
  const maxPcRev     = Math.max(...topPostcodes.map(([, v]) => v.rev), 1);

  // ── Profit per job (top 8) ──
  const jobProfits = periodBookings.map(b => {
    const rev    = collectedAmt(b);
    const labour = bookingLabour(b);
    const profit = rev - labour;
    return { ref: b.bookingRef||'—', name: `${b.firstName||''} ${b.lastName||''}`.trim(), date: b.cleanDate, rev, labour, profit };
  }).sort((a, b) => b.profit - a.profit).slice(0, 8);

  // ── Tax-year-only: 12 monthly bars + MoM + supplies trend ──
  const fixedForMonth = (mS, mE) =>
    fixedCosts.filter(f => f.active && !(f.startDate && f.startDate > mE) && !(f.endDate && f.endDate < mS)).reduce((s, f) => {
      const amt = parseFloat(f.amount) || 0;
      return s + (f.frequency === 'yearly' ? amt / 12 : amt);
    }, 0);

  const tyStartYear = !isMonthMode ? parseInt((allTaxYears.find(ty => ty.label.replace(' tax year','') === reportsTaxYear) || currentTaxYear()).label.replace(' tax year','').split('/')[0]) : null;
  const last12 = !isMonthMode ? Array.from({ length: 12 }, (_, i) => {
    const d      = new Date(tyStartYear, 3 + i, 1);
    const key    = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const mStart = i === 0  ? periodStart : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-06`;
    const nextD  = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const taxEnd = i === 11 ? periodEnd : `${nextD.getFullYear()}-${String(nextD.getMonth()+1).padStart(2,'0')}-05`;
    const mEnd   = key === curMonthKey ? curMonthEnd : taxEnd;
    const label  = d.toLocaleString('en-GB', { month: 'short' });
    const bkgs   = activeBookings.filter(b => b.cleanDate >= mStart && b.cleanDate <= mEnd);
    const rev      = bkgs.reduce((s, b) => s + collectedAmt(b), 0);
    const lab      = bkgs.reduce((s, b) => s + bookingLabour(b), 0);
    const mktExp   = marketingSpend.filter(e => e.date >= mStart && e.date <= mEnd).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    const varExp   = expenses.filter(e => e.date >= mStart && e.date <= mEnd && e.category !== 'Marketing').reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    const supExp   = supplies.filter(s => s.purchaseDate && s.purchaseDate >= mStart && s.purchaseDate <= mEnd).reduce((s, sup) => s + (parseFloat(sup.unitCost)||0) * (Number(sup.inStock)||0), 0);
    const incExp   = incidents.filter(inc => inc.date >= mStart && inc.date <= mEnd).reduce((s, inc) => s + (parseFloat(inc.amount)||0), 0);
    const fixed    = fixedForMonth(mStart, mEnd);
    const costs    = lab + mktExp + varExp + supExp + fixed + incExp;
    const isFuture = d > now;
    return { key, label, rev, lab, mktExp, varExp, supExp, incExp, fixed, costs, profit: rev - costs, jobs: bkgs.length, isFuture };
  }) : [];
  const maxRev = last12.length ? Math.max(...last12.map(m => Math.max(m.rev, m.costs)), 1) : 1;

  const calYear = isMonthMode ? parseInt(reportsYear) : null;
  const calMonths12 = isMonthMode ? Array.from({ length: 12 }, (_, i) => {
    const mS = `${calYear}-${String(i+1).padStart(2,'0')}-01`;
    const lastDay = new Date(calYear, i+1, 0).getDate();
    const mE = `${calYear}-${String(i+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    const label = new Date(calYear, i, 1).toLocaleString('en-GB', { month: 'short' });
    const isFuture = new Date(calYear, i, 1) > now;
    const bkgs = activeBookings.filter(b => b.cleanDate >= mS && b.cleanDate <= mE);
    const rev = bkgs.reduce((s, b) => s + collectedAmt(b), 0);
    const lab = bkgs.reduce((s, b) => s + bookingLabour(b), 0);
    const varExp = expenses.filter(e => e.date >= mS && e.date <= mE && e.category !== 'Marketing').reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    const supExp = supplies.filter(s => s.purchaseDate && s.purchaseDate >= mS && s.purchaseDate <= mE).reduce((s, sup) => s + (parseFloat(sup.unitCost)||0) * (Number(sup.inStock)||0), 0);
    const mktExp = marketingSpend.filter(e => e.date >= mS && e.date <= mE).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    const incExp = incidents.filter(inc => inc.date >= mS && inc.date <= mE).reduce((s, inc) => s + (parseFloat(inc.amount)||0), 0);
    const fixed = fixedForMonth(mS, mE);
    const costs = lab + varExp + supExp + mktExp + fixed + incExp;
    return { label, mS, mE, rev, lab, varExp, supExp, mktExp, incExp, fixed, costs, isFuture };
  }) : [];
  const maxCalRev  = calMonths12.length ? Math.max(...calMonths12.map(m => Math.max(m.rev, m.costs)), 1) : 1;
  const ytdMonths  = calMonths12.filter(m => !m.isFuture);
  const ytdRev     = ytdMonths.reduce((s, m) => s + m.rev, 0);
  const ytdFixed   = ytdMonths.reduce((s, m) => s + m.fixed, 0);
  const ytdVarExp  = ytdMonths.reduce((s, m) => s + m.varExp, 0);
  const ytdSupExp  = ytdMonths.reduce((s, m) => s + m.supExp, 0);
  const ytdMktExp  = ytdMonths.reduce((s, m) => s + m.mktExp, 0);
  const ytdLab     = ytdMonths.reduce((s, m) => s + m.lab, 0);
  const ytdCosts   = ytdMonths.reduce((s, m) => s + m.costs, 0);
  const ytdProfit  = ytdRev - ytdCosts;

  const momData = last12.filter(m => !m.isFuture).map(m => {
    const d       = new Date(m.key + '-01');
    const prevKey = `${d.getFullYear()-1}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const prevRev = activeBookings.filter(b => b.cleanDate?.startsWith(prevKey)).reduce((s, b) => s + collectedAmt(b), 0);
    const growth  = prevRev > 0 ? ((m.rev - prevRev) / prevRev) * 100 : null;
    return { label: m.label, rev: m.rev, prevRev, growth };
  });


  const monthSuppliesTotal = isMonthMode
    ? expenses.filter(e => e.date >= periodStart && e.date <= periodEnd && e.category === 'Supplies').reduce((s, e) => s + (parseFloat(e.amount)||0), 0)
    + supplies.filter(s => s.purchaseDate && s.purchaseDate >= periodStart && s.purchaseDate <= periodEnd).reduce((s, sup) => s + (parseFloat(sup.unitCost)||0) * (Number(sup.inStock)||0), 0)
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
        {[{ id: 'month', label: 'Month' }, { id: 'taxYear', label: 'Tax Year' }].map(t => (
          <button key={t.id} onClick={() => setReportsMode(t.id)} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '8px 20px', border: 'none', borderBottom: reportsMode === t.id ? `2px solid ${C.text}` : '2px solid transparent', marginBottom: -2, background: 'transparent', color: reportsMode === t.id ? C.text : C.muted, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* Tab controls */}
      {!isMonthMode ? (
        <div style={{ marginBottom: 20 }}>
          <select value={reportsTaxYear} onChange={e => setReportsTaxYear(e.target.value)} style={{ ...INPUT, marginBottom: 8, width: 'auto', fontSize: 13, fontWeight: 600 }}>
            {allTaxYears.map(ty => { const label = ty.label.replace(' tax year',''); return <option key={label} value={label}>{label} tax year</option>; })}
          </select>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>
            Figures from 6 Apr · fixed costs only counted for months that have passed, not the full year ahead
          </div>
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
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 8 }}>Calendar months (1st – last day) · Year overview charts show Jan–Dec</div>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {(() => {
          const totalCosts = periodLabour + periodExp + periodMktSpend + periodSupExp + periodFixed + periodIncidents;
          return [
            { label: 'Revenue',       value: `£${periodRev.toFixed(2)}`,     sub: `${periodBookings.length} jobs`,             color: '#16a34a' },
            { label: 'Total Costs',   value: `£${totalCosts.toFixed(2)}`,    sub: 'all expenses combined',                     color: '#dc2626' },
            { label: 'Net Profit',    value: `£${periodProfit.toFixed(2)}`,  sub: `${periodMargin.toFixed(1)}% margin`,        color: periodProfit >= 0 ? '#16a34a' : '#dc2626' },
            { label: 'Avg Job Value', value: `£${avgJobVal.toFixed(2)}`,     sub: 'per booking',                               color: BIZ },
            { label: 'Cancel Rate',   value: `${cancelRate.toFixed(1)}%`,    sub: `${cancelledBkgs} of ${totalBkgs} jobs`,     color: cancelRate > 10 ? '#dc2626' : '#f97316' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ ...RCARD, borderTop: `3px solid ${color}` }}>
              <div style={RLABEL}>{label}</div>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
            </div>
          ));
        })()}
      </div>

      {/* ── P&L breakdown — always visible ── */}
      <div style={{ ...RCARD, marginBottom: 16 }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Net Profit Breakdown — {periodLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr) 2px repeat(3,1fr)', gap: 0, alignItems: 'stretch' }}>
          {[
            { label: 'Revenue',            value: periodRev,          color: '#16a34a', sign: '+' },
            { label: 'Cleaner Pay',        value: periodLabour,       color: '#7c3aed', sign: '-' },
            { label: 'Variable Costs',     value: periodExp,          color: '#dc2626', sign: '-' },
            { label: 'Ad Spend',           value: periodMktSpend,     color: '#ec4899', sign: '-' },
            null,
            { label: 'Supplies',           value: periodSupExp,       color: '#0ea5e9', sign: '-' },
            { label: 'Direct Debits',      value: periodFixed,        color: '#f97316', sign: '-' },
            { label: 'Incidents & Refunds',value: periodIncidents,    color: '#b45309', sign: '-' },
          ].map((item, i) => item === null
            ? <div key="div" style={{ background: C.border, width: 2, margin: '0 8px', display: isMobile ? 'none' : 'block' }} />
            : (
              <div key={item.label} style={{ padding: '10px 14px', borderRight: isMobile ? 'none' : (i < 3 || i === 5 || i === 6 ? `1px solid ${C.border}` : 'none'), borderBottom: isMobile ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: item.color }}>{item.sign === '+' ? '' : '-'}£{item.value.toFixed(2)}</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Calendar year bar chart + trend — month mode only */}
      {isMonthMode && (
        <>
          <div style={{ ...RCARD, marginBottom: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 2 }}>Revenue vs Costs — {calYear} (month by month)</div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 12 }}>Calendar months (1st–last day of each month)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 1 : 4, height: 100, marginBottom: 4 }}>
              {calMonths12.map(m => (
                <div key={m.mS} style={{ flex: 1, display: 'flex', gap: 1, alignItems: 'flex-end', justifyContent: 'center', opacity: m.isFuture ? 0.2 : 1 }}>
                  <div style={{ flex: 1, background: '#16a34a', borderRadius: '3px 3px 0 0', height: `${(m.rev/maxCalRev)*90}px`, minHeight: m.rev > 0 ? 2 : 0 }} title={`Revenue £${m.rev.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#f97316', borderRadius: '3px 3px 0 0', height: `${(m.fixed/maxCalRev)*90}px`, minHeight: m.fixed > 0 ? 2 : 0 }} title={`Direct debits £${m.fixed.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${(m.varExp/maxCalRev)*90}px`, minHeight: m.varExp > 0 ? 2 : 0, opacity: 0.8 }} title={`Variable expenses £${m.varExp.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#0ea5e9', borderRadius: '3px 3px 0 0', height: `${(m.supExp/maxCalRev)*90}px`, minHeight: m.supExp > 0 ? 2 : 0, opacity: 0.8 }} title={`Supplies £${m.supExp.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#ec4899', borderRadius: '3px 3px 0 0', height: `${(m.mktExp/maxCalRev)*90}px`, minHeight: m.mktExp > 0 ? 2 : 0, opacity: 0.85 }} title={`Ad spend £${m.mktExp.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#7c3aed', borderRadius: '3px 3px 0 0', height: `${(m.lab/maxCalRev)*90}px`, minHeight: m.lab > 0 ? 2 : 0, opacity: 0.85 }} title={`Cleaner pay £${m.lab.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#b45309', borderRadius: '3px 3px 0 0', height: `${(m.incExp/maxCalRev)*90}px`, minHeight: m.incExp > 0 ? 2 : 0, opacity: 0.9 }} title={`Incidents £${m.incExp.toFixed(2)}`} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 1 : 4, marginBottom: 8 }}>
              {calMonths12.map(m => (
                <div key={m.mS} style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 9, color: C.muted, opacity: m.isFuture ? 0.4 : 1 }}>{m.label}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { color: '#16a34a', label: 'Revenue' },
                { color: '#f97316', label: 'Direct Debits' },
                { color: '#dc2626', label: 'Variables', opacity: 0.8 },
                { color: '#0ea5e9', label: 'Supplies', opacity: 0.8 },
                { color: '#ec4899', label: 'Ad Spend', opacity: 0.85 },
                { color: '#7c3aed', label: 'Cleaner Pay', opacity: 0.85 },
                { color: '#b45309', label: 'Incidents', opacity: 0.9 },
              ].map(({ color, label, opacity = 1 }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, background: color, borderRadius: 2, opacity }} />
                  <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>Year to date ({ytdMonths.length} months)</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Revenue £{ytdRev.toFixed(2)}</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Costs £{ytdCosts.toFixed(2)}</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: ytdProfit >= 0 ? '#16a34a' : '#dc2626' }}>Profit {ytdProfit >= 0 ? '' : '-'}£{Math.abs(ytdProfit).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ ...RCARD, marginBottom: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 2 }}>Revenue vs Total Costs — {calYear} (trend)</div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 10 }}>Calendar months (1st–last day) · Red = all costs combined</div>
            {(() => {
              const PAD_L = 40, PAD_R = 8, PAD_T = 8, PAD_B = 20;
              const W = 600, H = 90;
              const chartW = W - PAD_L - PAD_R;
              const chartH = H - PAD_T - PAD_B;
              const xOf = i => PAD_L + (i / 11) * chartW;
              const yOf = v => PAD_T + (1 - Math.min(v, maxCalRev) / maxCalRev) * chartH;
              const revPts  = calMonths12.map((m, i) => `${xOf(i)},${yOf(m.rev)}`).join(' ');
              const costPts = calMonths12.map((m, i) => `${xOf(i)},${yOf(m.costs)}`).join(' ');
              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                  {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const y = PAD_T + (1 - f) * chartH;
                    const val = f * maxCalRev;
                    return (
                      <g key={f}>
                        <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={C.border} strokeWidth="0.8" />
                        <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="4" fill={C.muted} fontFamily={FONT}>£{val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}</text>
                      </g>
                    );
                  })}
                  <polyline points={costPts} fill="none" stroke="#dc2626" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={revPts}  fill="none" stroke="#16a34a" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
                  {calMonths12.map((m, i) => (
                    <g key={m.mS} opacity={m.isFuture ? 0.2 : 1}>
                      <circle cx={xOf(i)} cy={yOf(m.costs)} r="2" fill="#dc2626"><title>Costs {m.label}: £{m.costs.toFixed(2)}</title></circle>
                      <circle cx={xOf(i)} cy={yOf(m.rev)}   r="2" fill="#16a34a"><title>Revenue {m.label}: £{m.rev.toFixed(2)}</title></circle>
                    </g>
                  ))}
                </svg>
              );
            })()}
            <div style={{ display: 'flex', gap: isMobile ? 1 : 4, marginTop: 4 }}>
              {calMonths12.map(m => {
                const fmtV = v => v > 0 ? `£${v.toFixed(2)}` : '—';
                return (
                  <div key={m.mS} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, opacity: m.isFuture ? 0.3 : 1 }}>
                    <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#16a34a' }}>{fmtV(m.rev)}</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#dc2626' }}>{fmtV(m.costs)}</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: C.muted }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 2, background: '#16a34a', borderRadius: 1 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Revenue</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 2, background: '#dc2626', borderRadius: 1 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Total costs</span></div>
            </div>
          </div>
        </>
      )}

      {/* Revenue vs costs bar chart + line graph — tax year only */}
      {!isMonthMode && (
        <>
          <div style={{ ...RCARD, marginBottom: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 2 }}>Revenue vs Costs — Tax Year {reportsTaxYear} (month by month)</div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 12 }}>6 Apr {tyStartYear} – 5 Apr {tyStartYear + 1} · Apr = 6 Apr–5 May, Mar = 6 Mar–5 Apr</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 1 : 4, height: 100, marginBottom: 4 }}>
              {last12.map(m => (
                <div key={m.key} style={{ flex: 1, display: 'flex', gap: 1, alignItems: 'flex-end', justifyContent: 'center', opacity: m.isFuture ? 0.2 : 1 }}>
                  <div style={{ flex: 1, background: '#16a34a', borderRadius: '3px 3px 0 0', height: `${(m.rev/maxRev)*90}px`, minHeight: m.rev > 0 ? 2 : 0 }} title={`Revenue £${m.rev.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#f97316', borderRadius: '3px 3px 0 0', height: `${(m.fixed/maxRev)*90}px`, minHeight: m.fixed > 0 ? 2 : 0 }} title={`Direct debits £${m.fixed.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${(m.varExp/maxRev)*90}px`, minHeight: m.varExp > 0 ? 2 : 0, opacity: 0.8 }} title={`Variable expenses £${m.varExp.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#0ea5e9', borderRadius: '3px 3px 0 0', height: `${(m.supExp/maxRev)*90}px`, minHeight: m.supExp > 0 ? 2 : 0, opacity: 0.8 }} title={`Supplies £${m.supExp.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#ec4899', borderRadius: '3px 3px 0 0', height: `${(m.mktExp/maxRev)*90}px`, minHeight: m.mktExp > 0 ? 2 : 0, opacity: 0.85 }} title={`Ad spend £${m.mktExp.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#7c3aed', borderRadius: '3px 3px 0 0', height: `${(m.lab/maxRev)*90}px`, minHeight: m.lab > 0 ? 2 : 0, opacity: 0.85 }} title={`Cleaner pay £${m.lab.toFixed(2)}`} />
                  <div style={{ flex: 1, background: '#b45309', borderRadius: '3px 3px 0 0', height: `${(m.incExp/maxRev)*90}px`, minHeight: m.incExp > 0 ? 2 : 0, opacity: 0.9 }} title={`Incidents £${m.incExp.toFixed(2)}`} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 1 : 4, marginBottom: 8 }}>
              {last12.map(m => (
                <div key={m.key} style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 9, color: C.muted, opacity: m.isFuture ? 0.4 : 1 }}>{m.label}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { color: '#16a34a', label: 'Revenue' },
                { color: '#f97316', label: 'Direct Debits' },
                { color: '#dc2626', label: 'Variables', opacity: 0.8 },
                { color: '#0ea5e9', label: 'Supplies', opacity: 0.8 },
                { color: '#ec4899', label: 'Ad Spend', opacity: 0.85 },
                { color: '#7c3aed', label: 'Cleaner Pay', opacity: 0.85 },
                { color: '#b45309', label: 'Incidents', opacity: 0.9 },
              ].map(({ color, label, opacity = 1 }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, background: color, borderRadius: 2, opacity }} />
                  <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...RCARD, marginBottom: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 2 }}>Revenue vs Total Costs — {reportsTaxYear} (trend)</div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 10 }}>Tax months (6th–5th) · Red = fixed costs + variables + supplies + cleaner pay combined</div>
            {(() => {
              const PAD_L = 40, PAD_R = 8, PAD_T = 8, PAD_B = 20;
              const W = 600, H = 90;
              const chartW = W - PAD_L - PAD_R;
              const chartH = H - PAD_T - PAD_B;
              const xOf = i => PAD_L + (i / 11) * chartW;
              const yOf = v => PAD_T + (1 - Math.min(v, maxRev) / maxRev) * chartH;
              const revPts  = last12.map((m, i) => `${xOf(i)},${yOf(m.rev)}`).join(' ');
              const costPts = last12.map((m, i) => `${xOf(i)},${yOf(m.costs)}`).join(' ');
              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                  {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const y = PAD_T + (1 - f) * chartH;
                    const val = f * maxRev;
                    return (
                      <g key={f}>
                        <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={C.border} strokeWidth="0.8" />
                        <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="4" fill={C.muted} fontFamily={FONT}>£{val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}</text>
                      </g>
                    );
                  })}
                  <polyline points={costPts} fill="none" stroke="#dc2626" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={revPts}  fill="none" stroke="#16a34a" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
                  {last12.map((m, i) => (
                    <g key={m.key} opacity={m.isFuture ? 0.2 : 1}>
                      <circle cx={xOf(i)} cy={yOf(m.costs)} r="2" fill="#dc2626"><title>Costs {m.label}: £{m.costs.toFixed(2)}</title></circle>
                      <circle cx={xOf(i)} cy={yOf(m.rev)}   r="2" fill="#16a34a"><title>Revenue {m.label}: £{m.rev.toFixed(2)}</title></circle>
                    </g>
                  ))}
                </svg>
              );
            })()}
            <div style={{ display: 'flex', gap: isMobile ? 1 : 4, marginTop: 4 }}>
              {last12.map(m => {
                const fmtV = v => v > 0 ? `£${v.toFixed(2)}` : '—';
                return (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, opacity: m.isFuture ? 0.3 : 1 }}>
                    <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#16a34a' }}>{fmtV(m.rev)}</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#dc2626' }}>{fmtV(m.costs)}</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: C.muted }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 2, background: '#16a34a', borderRadius: 1 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Revenue</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 2, background: '#dc2626', borderRadius: 1 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Total costs</span></div>
            </div>
          </div>
        </>
      )}

      {/* Staff performance */}
      {staffPerf.length > 0 && staff.filter(s => s.status === 'Active').length > 0 && (
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
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              Month-on-Month Revenue Growth
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span
                  onMouseEnter={() => setMomTooltip(true)}
                  onMouseLeave={() => setMomTooltip(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: C.border, color: C.muted, fontSize: 9, fontWeight: 400, cursor: 'default', flexShrink: 0 }}>i</span>
                {momTooltip && (
                  <div style={{ position: 'absolute', left: 20, top: -4, zIndex: 50, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: 240, fontFamily: FONT, fontSize: 12, fontWeight: 400, color: C.text, textTransform: 'none', letterSpacing: 0, lineHeight: 1.5 }}>
                    Compares each month's revenue in the selected tax year against the same month in the previous year. Shows "No prior data" if there were no bookings in that month last year.
                  </div>
                )}
              </span>
            </div>
            {momData.length === 0
              ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No data yet for this tax year.</div>
              : momData.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: i < momData.length-1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.text, minWidth: 36 }}>{m.label}</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>£{m.rev.toFixed(2)}</span>
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
              { label: 'Revenue',                     value: periodRev,         color: '#16a34a' },
              { label: 'Labour (subcontractors)',      value: periodLabour,      color: '#7c3aed' },
              { label: 'Variable expenses',            value: periodExp,         color: '#dc2626' },
              { label: 'Marketing spend',              value: periodMktSpend,    color: '#ec4899' },
              { label: 'Supplies',                     value: periodSupExp,      color: '#0ea5e9' },
              { label: 'Direct debits',                value: periodFixed,       color: '#f97316' },
              { label: 'Incidents & Refunds',          value: periodIncidents,   color: '#b45309' },
              { label: 'Net Profit',                   value: periodProfit,      color: periodProfit >= 0 ? '#16a34a' : '#dc2626', bold: true },
            ].map(({ label, value, color, bold }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: bold ? 700 : 400 }}>{label}</span>
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color }}>£{value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Reimbursements &amp; Incident Recovery — {periodLabel}</div>

          {/* Incident count summary — all time */}
          {(() => {
            const allOpen    = incidents.filter(i => i.status === 'open').length;
            const allPending = incidents.filter(i => i.status === 'pending_reimbursement').length;
            const allClosed  = incidents.filter(i => i.status === 'closed').length;
            const allTotal   = incidents.length;
            const periodCount = incidents.filter(i => i.date >= periodStart && i.date <= periodEnd).length;
            return (
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>Incident Count — All Time</div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>{periodCount} in {periodLabel}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {[
                    { label: 'Open',            count: allOpen,    bg: '#fef2f2', color: '#dc2626' },
                    { label: 'Pending Payment', count: allPending, bg: '#fffbeb', color: '#d97706' },
                    { label: 'Closed',          count: allClosed,  bg: '#f0fdf4', color: '#16a34a' },
                  ].map(({ label, count, bg, color }) => (
                    <div key={label} style={{ flex: 1, minWidth: 80, background: bg, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color }}>{count}</div>
                      <div style={{ fontFamily: FONT, fontSize: 10, color, fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Total: <strong style={{ color: C.text }}>{allTotal}</strong> incident{allTotal !== 1 ? 's' : ''} on record across all time.</div>
              </div>
            );
          })()}

          {/* Incident payouts — money we still owe to customers */}
          {(() => {
            const pendingIncidents = incidents.filter(i => i.status === 'pending_reimbursement');
            const pendingTotal = pendingIncidents.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            return (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 6 }}>Owed to Customers — Pending Payouts</div>
                  <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: pendingTotal > 0 ? '#d97706' : '#16a34a', marginBottom: 4 }}>£{pendingTotal.toFixed(2)}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 10 }}>{pendingIncidents.length} case{pendingIncidents.length !== 1 ? 's' : ''} awaiting payment</div>
                  {pendingIncidents.length === 0
                    ? <div style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a', marginBottom: 4 }}>No outstanding customer payouts ✓</div>
                    : pendingIncidents.slice(0, 3).map((inc, i, arr) => (
                      <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 6, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                        <div>
                          <div style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{inc.description}</div>
                          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{inc.type} · {fmtDate(inc.date)}{inc.clientName ? ` · ${inc.clientName}` : ''}</div>
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#d97706' }}>£{(parseFloat(inc.amount) || 0).toFixed(2)}</div>
                      </div>
                    ))
                  }
                </div>
              </>
            );
          })()}

          {/* Staff reimbursements — money owed back to staff */}
          <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 6 }}>Owed to Staff</div>
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: reimbursableTotal > 0 ? '#dc2626' : '#16a34a', marginBottom: 4 }}>£{reimbursableTotal.toFixed(2)}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 10 }}>{reimbursable.length} unpaid item{reimbursable.length !== 1 ? 's' : ''}</div>
            {reimbursable.length === 0
              ? <div style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a' }}>All staff reimbursements settled ✓</div>
              : <div>{reimbursable.slice(0, 3).map((e, i, arr) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 6, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{e.name}</div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{e.paidBy} · {fmtDate(e.date)}{e.type === 'supply' ? ' · supply' : ''}</div>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>£{e.amount.toFixed(2)}</div>
                </div>
              ))}</div>
            }
          </div>
        </div>
      </div>


      {/* Jobs by Frequency */}
      <div style={{ marginBottom: 16 }}>
        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Jobs by Frequency — {periodLabel}</div>
          {freqBreakdown.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
            : freqBreakdown.map(([freq, { count, rev }], i, arr) => (
              <div key={freq} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{freq}</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>£{rev.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{count} job{count !== 1 ? 's' : ''} · avg £{(rev/count).toFixed(2)}</span>
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
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#16a34a' }}>£{rev.toFixed(2)} · {count} job{count!==1?'s':''}</span>
                </div>
                <div style={{ height: 5, background: C.bg, borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${(rev/maxPcRev)*100}%`, background: BIZ, borderRadius: 99 }} />
                </div>
              </div>
            ))
          }
        </div>

        <div style={RCARD}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 2 }}>Job Contribution — {periodLabel}</div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 12 }}>Revenue minus cleaner pay only — other costs not attributable per job</div>
          {jobProfits.length === 0
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
            : jobProfits.map((j, i, arr) => (
              <div key={j.ref} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>{j.name||j.ref}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{fmtDate(j.date)} · Revenue £{j.rev.toFixed(2)} · Labour £{j.labour.toFixed(2)}</div>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: j.profit >= 0 ? '#16a34a' : '#dc2626' }}>£{j.profit.toFixed(2)}</div>
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
                <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#16a34a' }}>£{c.spend.toFixed(2)}</div>
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
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>£{rev.toFixed(2)}</span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{count} job{count !== 1 ? 's' : ''} · avg £{(rev/count).toFixed(2)}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Booking breakdown pie charts */}
      {(() => {
        const PIE_COLS = ['#1e40af','#7c3aed','#0ea5e9','#16a34a','#f59e0b','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16'];
        const FREQ_COLS = { 'One-off':'#ec4899','Weekly':'#16a34a','Fortnightly':'#0ea5e9','Monthly':'#7c3aed' };
        const makePie = (items, total) => {
          if (items.length === 1) {
            const [label, count] = items[0];
            return [{ label, count, path: null, full: true, pct: '100' }];
          }
          let cum = -Math.PI / 2;
          return items.map(([label, count]) => {
            const angle = total > 0 ? (count / total) * 2 * Math.PI : 0;
            const start = cum, end = cum + angle - 0.001; cum = cum + angle;
            const OR = 52, IR = 30, cx = 60, cy = 60;
            const x1 = cx + OR * Math.cos(start), y1 = cy + OR * Math.sin(start);
            const x2 = cx + OR * Math.cos(end),   y2 = cy + OR * Math.sin(end);
            const ix1 = cx + IR * Math.cos(start), iy1 = cy + IR * Math.sin(start);
            const ix2 = cx + IR * Math.cos(end),   iy2 = cy + IR * Math.sin(end);
            const large = angle > Math.PI ? 1 : 0;
            const path = `M${x1},${y1} A${OR},${OR} 0 ${large} 1 ${x2},${y2} L${ix2},${iy2} A${IR},${IR} 0 ${large} 0 ${ix1},${iy1} Z`;
            return { label, count, path, full: false, pct: total > 0 ? ((count/total)*100).toFixed(0) : 0 };
          });
        };
        const ALL_FREQS = ['One-off', 'Weekly', 'Fortnightly', 'Monthly'];
        const total = periodBookings.length;
        const pkgSlices  = makePie(pkgBreakdown.map(([l,v]) => [l, v.count]), total);
        const freqSlices = makePie(freqBreakdown.map(([l,v]) => [l, v.count]), total);
        const pkgCountMap  = Object.fromEntries(pkgBreakdown.map(([l,v]) => [l, v.count]));
        const freqCountMap = Object.fromEntries(freqBreakdown.map(([l,v]) => [l, v.count]));
        const fullPkgLegend  = PACKAGES.map((p, i) => ({ label: p.name, count: pkgCountMap[p.name] || 0, pct: total > 0 ? (((pkgCountMap[p.name]||0)/total)*100).toFixed(0) : '0', color: PIE_COLS[i % PIE_COLS.length] }));
        const fullFreqLegend = ALL_FREQS.map((f, i) => ({ label: f, count: freqCountMap[f] || 0, pct: total > 0 ? (((freqCountMap[f]||0)/total)*100).toFixed(0) : '0', color: FREQ_COLS[f] || PIE_COLS[i % PIE_COLS.length] }));
        const DonutChart = ({ slices, getCol, center }) => (
          <svg viewBox="0 0 120 120" style={{ width: '100%', maxWidth: 200, height: 'auto', display: 'block', margin: '0 auto' }}>
            {slices.map((s, i) => s.full
              ? <g key={s.label}><circle cx="60" cy="60" r="52" fill={getCol(s.label, i)} opacity={0.88} /><circle cx="60" cy="60" r="30" fill={C.card} /></g>
              : <path key={s.label} d={s.path} fill={getCol(s.label, i)} opacity={0.88}><title>{s.label}: {s.count} ({s.pct}%)</title></path>
            )}
            <text x="60" y="55" textAnchor="middle" fontSize="16" fontWeight="700" fill={C.text} fontFamily={FONT}>{center}</text>
            <text x="60" y="68" textAnchor="middle" fontSize="7" fill={C.muted} fontFamily={FONT}>bookings</text>
          </svg>
        );
        const Legend = ({ items }) => (
          <div style={{ marginTop: 14 }}>
            {items.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, opacity: item.count === 0 ? 0.35 : 1 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontSize: 12, color: C.text, flex: 1 }}>{item.label}</span>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: item.count === 0 ? C.muted : C.text }}>{item.count} · {item.pct}%</span>
              </div>
            ))}
          </div>
        );
        return (
          <div style={{ ...RCARD, marginBottom: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 20 }}>Booking Breakdown — {periodLabel}</div>
            {total === 0
              ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No bookings yet.</div>
              : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 32 }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12, textAlign: 'center' }}>By Package</div>
                    <DonutChart slices={pkgSlices} getCol={(_, i) => PIE_COLS[i % PIE_COLS.length]} center={total} />
                    <Legend items={fullPkgLegend} />
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12, textAlign: 'center' }}>By Frequency</div>
                    <DonutChart slices={freqSlices} getCol={(label, i) => FREQ_COLS[label] || PIE_COLS[i % PIE_COLS.length]} center={total} />
                    <Legend items={fullFreqLegend} />
                  </div>
                </div>
            }
          </div>
        );
      })()}
    </div>
  );
}
