import { useState, useEffect } from 'react';
import { db } from '../../../firebase/firebase';
import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc, onSnapshot } from 'firebase/firestore';
import { fmtDate, getTaxYears, currentTaxYear, calcHours } from '../utils';

const FONT = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN  = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };
const BIZ  = '#1e40af';

const CATS = ['Supplies', 'Fuel & Mileage', 'Public Transport', 'Equipment', 'Marketing', 'Insurance', 'Staff Costs', 'Rent & Utilities', 'Software & Tools', 'Other'];
const CAT_COLOURS = { 'Supplies':'#0ea5e9','Fuel & Mileage':'#f97316','Public Transport':'#fb923c','Equipment':'#8b5cf6','Marketing':'#ec4899','Insurance':'#14b8a6','Staff Costs':'#16a34a','Rent & Utilities':'#6366f1','Software & Tools':'#f59e0b','Other':'#94a3b8' };
const PAID_BY = ['Company Card', 'Cash', 'Personal — Reimbursable', 'Direct Debit'];
const PAID_BY_COLOURS = { 'Company Card':'#6366f1','Cash':'#16a34a','Personal — Reimbursable':'#dc2626','Direct Debit':'#0ea5e9' };
const HMRC_RATE = 0.45;

export default function ExpensesTab({ expenses, fixedCosts, bookings, staff, isMobile, C }) {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMo    = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMoYr  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthKey = `${lastMoYr}-${String(lastMo+1).padStart(2,'0')}`;
  const taxYears  = getTaxYears();
  const taxYear   = currentTaxYear();

  // All expense-specific UI state lives here
  const [expenseTab,         setExpenseTab]         = useState(() => localStorage.getItem('expenseTab') || 'variable');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; });
  const [expenseCatFilter,   setExpenseCatFilter]   = useState('all');
  const [expenseSearch,      setExpenseSearch]      = useState('');
  const [pnlView,            setPnlView]            = useState('month');

  // Expense modal state
  const [expenseModal,  setExpenseModal]  = useState(null);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseErr,    setExpenseErr]    = useState('');

  // Fixed cost modal state
  const [fixedModal,  setFixedModal]  = useState(null);
  const [fixedSaving, setFixedSaving] = useState(false);
  const [fixedErr,    setFixedErr]    = useState('');

  // Budget state (fetched here, not passed from parent)
  const [budgets,      setBudgets]      = useState({});
  const [budgetEdit,   setBudgetEdit]   = useState(false);
  const [budgetDraft,  setBudgetDraft]  = useState({});
  const [budgetSaving, setBudgetSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'expenseBudgets'), snap => {
      if (snap.exists()) setBudgets(snap.data());
    });
    return unsub;
  }, []);

  const fixedMonthly = fixedCosts.reduce((s, f) => {
    if (!f.active) return s;
    const amt = parseFloat(f.amount) || 0;
    return s + (f.frequency === 'yearly' ? amt / 12 : amt);
  }, 0);

  const inPeriod = e => {
    if (expenseMonthFilter === 'all') return true;
    if (expenseMonthFilter.startsWith('ty:')) {
      const selectedLabel = expenseMonthFilter.slice(3);
      const selectedTY = taxYears.find(ty => ty.label.replace(' tax year', '') === selectedLabel) || taxYear;
      return e.date >= selectedTY.start && e.date <= selectedTY.end;
    }
    return e.date?.startsWith(expenseMonthFilter);
  };

  // Active period for KPI cards
  let activeMonthKey, activePrevMonthKey, activeTaxYear;
  if (expenseMonthFilter.startsWith('ty:')) {
    const label = expenseMonthFilter.slice(3);
    activeTaxYear      = taxYears.find(ty => ty.label.replace(' tax year', '') === label) || taxYear;
    activeMonthKey     = thisMonthKey;
    activePrevMonthKey = lastMonthKey;
  } else if (expenseMonthFilter !== 'all') {
    activeMonthKey = expenseMonthFilter;
    const [yr, mo] = expenseMonthFilter.split('-').map(Number);
    const prevMo   = mo === 1 ? 12 : mo - 1;
    const prevYr   = mo === 1 ? yr - 1 : yr;
    activePrevMonthKey = `${prevYr}-${String(prevMo).padStart(2, '0')}`;
    const tyY      = new Date(yr, mo - 1, 15) >= new Date(yr, 3, 6) ? yr : yr - 1;
    activeTaxYear  = { start: `${tyY}-04-06`, end: `${tyY + 1}-04-05`, label: `${tyY}/${String(tyY + 1).slice(2)}` };
  } else {
    activeMonthKey     = thisMonthKey;
    activePrevMonthKey = lastMonthKey;
    activeTaxYear      = taxYear;
  }
  const activeMonthLabel = expenseMonthFilter !== 'all' && !expenseMonthFilter.startsWith('ty:')
    ? new Date(activeMonthKey + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    : 'This Month';
  const prevMonthLabel = expenseMonthFilter !== 'all' && !expenseMonthFilter.startsWith('ty:')
    ? new Date(activePrevMonthKey + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    : 'Last Month';

  const thisMonthExp   = expenses.filter(e => e.date?.startsWith(activeMonthKey));
  const lastMonthExp   = expenses.filter(e => e.date?.startsWith(activePrevMonthKey));
  const thisMonthTotal = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const lastMonthTotal = lastMonthExp.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const taxYearExp     = expenses.filter(e => e.date >= activeTaxYear.start && e.date <= activeTaxYear.end);
  const taxYearTotal   = taxYearExp.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const reimbursableExp = expenses.filter(e => e.paidBy === 'Personal — Reimbursable' && !e.repaid);
  const reimbursable   = reimbursableExp.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const allMonths      = [...new Set(expenses.map(e => e.date?.slice(0,7)).filter(Boolean))].sort().reverse();

  const filtered = expenses.filter(e => {
    if (expenseCatFilter !== 'all' && e.category !== expenseCatFilter) return false;
    if (!inPeriod(e)) return false;
    if (expenseSearch && !`${e.description} ${e.category} ${e.amount} ${e.notes} ${e.paidBy}`.toLowerCase().includes(expenseSearch.toLowerCase())) return false;
    return true;
  });
  const totalFiltered = filtered.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
  const byCategory = CATS.map(cat => {
    const total  = filtered.filter(e => e.category === cat).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    const budget = parseFloat(budgets[cat]) || 0;
    return { cat, total, budget };
  }).filter(c => c.total > 0 || c.budget > 0).sort((a,b) => b.total - a.total);
  const maxCat = Math.max(...byCategory.map(c => Math.max(c.total, c.budget)), 1);

  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleString('en-GB', { month: 'short' });
    const total = expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
    return { key, label, total };
  });
  const maxMonth = Math.max(...last12.map(m => m.total), 1);

  const exportCSV = () => {
    const rows = [['Date','Category','Description','Amount','Paid By','Notes','Miles']];
    filtered.forEach(e => rows.push([e.date||'',e.category||'',`"${(e.description||'').replace(/"/g,'""')}"`,parseFloat(e.amount||0).toFixed(2),e.paidBy||'',`"${(e.notes||'').replace(/"/g,'""')}"`,e.miles||'']));
    rows.push(['Total','','',totalFiltered.toFixed(2),'','','']);
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = `expenses-${expenseMonthFilter==='all'?'all':expenseMonthFilter}.csv`; a.click();
  };

  const markRepaid = async id => {
    try { await updateDoc(doc(db, 'expenses', id), { repaid: true }); }
    catch { alert('Failed to mark as repaid — check your connection and try again.'); }
  };

  const saveExpense = async () => {
    const d = expenseModal.data;
    if (!d.date || !d.amount || !d.description?.trim()) { setExpenseErr('Date, amount and description are required.'); return; }
    setExpenseSaving(true); setExpenseErr('');
    try {
      const payload = { date: d.date, category: d.category || 'Other', description: d.description.trim(), amount: parseFloat(d.amount), notes: d.notes?.trim() || '', paidBy: d.paidBy || 'Company Card', ...(d.useMileage ? { miles: parseFloat(d.miles) || 0 } : {}) };
      if (expenseModal.mode === 'add') await addDoc(collection(db, 'expenses'), { ...payload, createdAt: new Date().toISOString() });
      else await updateDoc(doc(db, 'expenses', d.id), payload);
      setExpenseModal(null);
    } catch (e) { setExpenseErr(e.message); }
    finally { setExpenseSaving(false); }
  };

  const deleteExpense = async () => {
    if (!window.confirm('Delete this expense?')) return;
    setExpenseSaving(true);
    try { await deleteDoc(doc(db, 'expenses', expenseModal.data.id)); setExpenseModal(null); }
    catch (e) { setExpenseErr(e.message); }
    finally { setExpenseSaving(false); }
  };

  const saveFixedCost = async () => {
    const d = fixedModal.data;
    if (!d.name?.trim() || !d.amount) { setFixedErr('Name and amount are required.'); return; }
    if (!d.startDate) { setFixedErr('Start date is required.'); return; }
    setFixedSaving(true); setFixedErr('');
    try {
      const payload = { name: d.name.trim(), amount: parseFloat(d.amount), frequency: d.frequency || 'monthly', dueDayOfMonth: d.dueDayOfMonth || '', account: d.account || 'Monzo', accountHolder: d.accountHolder?.trim() || '', active: !!d.active, notes: d.notes?.trim() || '', startDate: d.startDate, endDate: d.endDate || '' };
      if (fixedModal.mode === 'add') await addDoc(collection(db, 'fixedCosts'), { ...payload, createdAt: new Date().toISOString() });
      else await updateDoc(doc(db, 'fixedCosts', d.id), payload);
      setFixedModal(null);
    } catch (e) { setFixedErr(e.message); }
    finally { setFixedSaving(false); }
  };

  const deleteFixedCost = async () => {
    if (!window.confirm('Delete this fixed cost?')) return;
    setFixedSaving(true);
    try { await deleteDoc(doc(db, 'fixedCosts', fixedModal.data.id)); setFixedModal(null); }
    catch (e) { setFixedErr(e.message); }
    finally { setFixedSaving(false); }
  };

  const saveBudgets = async () => {
    setBudgetSaving(true);
    const clean = {};
    CATS.forEach(c => { if (budgetDraft[c]) clean[c] = parseFloat(budgetDraft[c]); });
    try { await setDoc(doc(db, 'settings', 'expenseBudgets'), clean, { merge: true }); setBudgetEdit(false); }
    finally { setBudgetSaving(false); }
  };

  const KCARD  = { background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
  const KLABEL = { fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 };
  const TAB_S  = active => ({ fontFamily: FONT, fontSize: 13, fontWeight: active ? 700 : 500, padding: '8px 18px', borderRadius: 6, border: active ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: active ? BIZ : C.card, color: active ? '#fff' : C.text, whiteSpace: 'nowrap', boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.07)' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>Expenses</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={TAB_S(expenseTab==='variable')} onClick={() => { setExpenseTab('variable'); localStorage.setItem('expenseTab','variable'); }}>Variable</button>
          <button style={TAB_S(expenseTab==='fixed')} onClick={() => { setExpenseTab('fixed'); localStorage.setItem('expenseTab','fixed'); }}>
            Fixed {fixedCosts.length > 0 && <span style={{ fontSize: 11, opacity: 0.8 }}>· £{fixedMonthly.toFixed(2)}/mo</span>}
          </button>
          <button style={TAB_S(expenseTab==='pnl')} onClick={() => { setExpenseTab('pnl'); localStorage.setItem('expenseTab','pnl'); }}>P&amp;L</button>
          <button style={TAB_S(expenseTab==='hmrc')} onClick={() => { setExpenseTab('hmrc'); localStorage.setItem('expenseTab','hmrc'); }}>HMRC</button>
        </div>
      </div>

      {/* ── VARIABLE TAB ── */}
      {expenseTab === 'variable' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ ...KCARD, background: '#f0fdf4', borderTop: '3px solid #16a34a' }}>
              <div style={{ ...KLABEL, color: '#16a34a' }}>{activeMonthLabel}</div>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>£{thisMonthTotal.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: thisMonthTotal <= lastMonthTotal ? '#16a34a' : '#dc2626', marginTop: 3 }}>
                {lastMonthTotal > 0 ? `${thisMonthTotal<=lastMonthTotal?'▼':'▲'} £${Math.abs(thisMonthTotal-lastMonthTotal).toFixed(2)} vs prev` : 'First month of data'}
              </div>
            </div>
            <div style={{ ...KCARD, borderTop: `3px solid ${C.accent}` }}>
              <div style={KLABEL}>{prevMonthLabel}</div>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>£{lastMonthTotal.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{lastMonthExp.length} entries</div>
            </div>
            <div style={{ ...KCARD, borderTop: '3px solid #6366f1' }}>
              <div style={KLABEL}>Tax Year {activeTaxYear.label}</div>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>£{taxYearTotal.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{fmtDate(activeTaxYear.start)} – {fmtDate(activeTaxYear.end)}</div>
            </div>
            <div style={{ ...KCARD, borderTop: reimbursable > 0 ? '3px solid #dc2626' : `3px solid ${C.accent}` }}>
              <div style={KLABEL}>Reimbursable Owed</div>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: reimbursable > 0 ? '#dc2626' : C.text }}>£{reimbursable.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{reimbursableExp.length} unpaid</div>
            </div>
          </div>

          {expenses.length > 0 && (
            <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Spending — Last 12 Months</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {last12.map(m => (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', height: `${(m.total / maxMonth) * 64}px`, minHeight: m.total > 0 ? 3 : 0, background: m.key === thisMonthKey ? BIZ : C.border, borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={`£${m.total.toFixed(2)}`} />
                    <div style={{ fontFamily: FONT, fontSize: 9, color: C.muted, textAlign: 'center' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reimbursableExp.length > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>💳 Reimbursable — £{reimbursable.toFixed(2)} still owed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reimbursableExp.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 600 }}>{e.description}</span>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginLeft: 8 }}>{fmtDate(e.date)} · £{parseFloat(e.amount).toFixed(2)}</span>
                    </div>
                    <button onClick={() => markRepaid(e.id)} style={{ ...BTN, background: '#16a34a', color: '#fff', fontSize: 12, padding: '5px 12px' }}>✓ Mark repaid</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
            <input value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} placeholder="Search…" style={{ ...INPUT, marginBottom: 0, width: 130, fontSize: 13 }} />
            <select value={expenseMonthFilter} onChange={e => setExpenseMonthFilter(e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 'auto', fontSize: 13 }}>
              <option value="all">All time</option>
              <optgroup label="Tax Year">
                {taxYears.map(ty => { const label = ty.label.replace(' tax year', ''); return <option key={label} value={`ty:${label}`}>{label} tax year (6 Apr–5 Apr)</option>; })}
              </optgroup>
              <optgroup label="By Month">
                {allMonths.map(m => <option key={m} value={m}>{new Date(m+'-01').toLocaleString('en-GB',{month:'long',year:'numeric'})}</option>)}
                {!allMonths.includes(expenseMonthFilter) && expenseMonthFilter !== 'all' && !expenseMonthFilter.startsWith('ty:') && <option value={expenseMonthFilter}>{new Date(expenseMonthFilter+'-01').toLocaleString('en-GB',{month:'long',year:'numeric'})}</option>}
              </optgroup>
            </select>
            <select value={expenseCatFilter} onChange={e => setExpenseCatFilter(e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 'auto', fontSize: 13 }}>
              <option value="all">All categories</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>{filtered.length} · £{totalFiltered.toFixed(2)}</span>
              {filtered.length > 0 && <button onClick={exportCSV} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>⬇ CSV</button>}
              <button onClick={() => setExpenseModal({ mode: 'add', data: { date: new Date().toISOString().split('T')[0], category: 'Supplies', paidBy: 'Company Card' } })} style={{ ...BTN, background: BIZ, color: '#fff', fontSize: 13 }}>+ Add</button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 8, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>No variable expenses logged yet. Click "+ Add" to get started.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px', gap: 16, alignItems: 'start' }}>
              <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>No expenses match filters.</div>
                ) : filtered.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : 'none', background: e.paidBy === 'Personal — Reimbursable' && !e.repaid ? '#fff5f5' : 'transparent' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLOURS[e.category]||'#94a3b8', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{e.description||'—'}</div>
                      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{e.date ? fmtDate(e.date) : '—'}</span>
                        <span style={{ color: CAT_COLOURS[e.category]||C.muted }}>{e.category}</span>
                        {e.miles && <span>🚗 {e.miles} mi</span>}
                        {e.paidBy && <span style={{ color: PAID_BY_COLOURS[e.paidBy]||C.muted, fontWeight: 500 }}>{e.paidBy}{e.repaid ? ' ✓ repaid' : ''}</span>}
                        {e.notes && <span style={{ fontStyle: 'italic' }}>{e.notes}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: e.paidBy === 'Personal — Reimbursable' && !e.repaid ? '#dc2626' : C.text }}>£{parseFloat(e.amount||0).toFixed(2)}</span>
                      <button onClick={() => setExpenseModal({ mode: 'edit', data: { ...e } })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 12 }}>✏️</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: C.card, borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>By Category</div>
                  <button onClick={() => { setBudgetDraft({...budgets}); setBudgetEdit(true); }} style={{ fontFamily: FONT, fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Set budgets</button>
                </div>
                {byCategory.length === 0 ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No data</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {byCategory.map(c => {
                      const pct = c.budget > 0 ? Math.min((c.total / c.budget) * 100, 100) : (c.total / maxCat) * 100;
                      const over = c.budget > 0 && c.total > c.budget;
                      return (
                        <div key={c.cat}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{c.cat}</span>
                            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: over ? '#dc2626' : C.text }}>
                              £{c.total.toFixed(2)}{c.budget > 0 ? ` / £${c.budget.toFixed(2)}` : ''}
                            </span>
                          </div>
                          <div style={{ height: 6, background: C.bg, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: over ? '#dc2626' : CAT_COLOURS[c.cat]||C.accent, borderRadius: 99 }} />
                          </div>
                          {over && <div style={{ fontFamily: FONT, fontSize: 10, color: '#dc2626', marginTop: 2 }}>Over budget by £{(c.total - c.budget).toFixed(2)}</div>}
                        </div>
                      );
                    })}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.muted }}>Total</span>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>£{totalFiltered.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FIXED COSTS TAB ── */}
      {expenseTab === 'fixed' && (
        <div>
          <div style={{ background: C.card, borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>Monthly Overhead</div>
              <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: C.text }}>£{fixedMonthly.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 2 }}>£{(fixedMonthly * 12).toFixed(2)}/year · {fixedCosts.filter(f => f.active).length} active costs</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {fixedCosts.length > 0 && <button onClick={() => {
                const rows = [['Name','Amount','Frequency','Annual','Account','Active','Notes']];
                fixedCosts.forEach(f => rows.push([`"${f.name||''}"`, parseFloat(f.amount||0).toFixed(2), f.frequency||'', (f.frequency==='yearly'?parseFloat(f.amount||0):parseFloat(f.amount||0)*12).toFixed(2), f.account||'', f.active?'Yes':'No', `"${(f.notes||'').replace(/"/g,'""')}"`]));
                const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download = 'fixed-costs.csv'; a.click();
              }} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>⬇ CSV</button>}
              <button onClick={() => setFixedModal({ mode: 'add', data: { active: true, frequency: 'monthly', account: 'Monzo' } })} style={{ ...BTN, background: '#1e40af', color: '#fff' }}>+ Add Fixed Cost</button>
            </div>
          </div>
          {fixedCosts.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 8, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>No fixed costs added yet — add your subscriptions, insurance, phone bill etc.</div>
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 80px 36px', gap: 12, padding: '10px 20px', borderBottom: `2px solid ${C.border}`, background: C.bg }}>
                {['Name','Amount','Frequency','Due','Account',''].map(h => <div key={h} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>{h}</div>)}
              </div>
              {[...fixedCosts].sort((a,b) => (a.name||'').localeCompare(b.name||'')).map((f, i, arr) => (
                <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 80px 36px', gap: 12, padding: '12px 20px', borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none', alignItems: 'center', opacity: f.active ? 1 : 0.45, background: !f.active ? C.bg : 'transparent' }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{f.name}</div>
                    {f.notes && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, fontStyle: 'italic' }}>{f.notes}</div>}
                    {f.accountHolder && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{f.accountHolder}</div>}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>£{parseFloat(f.amount||0).toFixed(2)}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{f.frequency === 'yearly' ? `Yearly (£${(parseFloat(f.amount||0)/12).toFixed(2)}/mo)` : 'Monthly'}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{f.dueDayOfMonth ? `${f.dueDayOfMonth}${['th','st','nd','rd'][Math.min(parseInt(f.dueDayOfMonth)%10,3)]||'th'} of mo` : '—'}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{f.account||'—'}</div>
                  <button onClick={() => setFixedModal({ mode: 'edit', data: { ...f } })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13 }}>✏️</button>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 80px 36px', gap: 12, padding: '12px 20px', background: C.bg, borderTop: `2px solid ${C.border}` }}>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.muted }}>TOTAL (active)</div>
                <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{fixedMonthly.toFixed(2)}/mo</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── P&L TAB ── */}
      {expenseTab === 'pnl' && (() => {
        const bookingLabour = b => {
          const hrs = calcHours(b.actualStart, b.actualFinish);
          if (!hrs) return 0;
          const member = staff.find(s => s.name === b.assignedStaff);
          const rate = member && member.hourlyRate !== 'N/A' ? parseFloat(member.hourlyRate) : 0;
          return hrs * rate;
        };
        const collectedAmt = b => {
          if (b.status === 'fully_paid')   return parseFloat(b.total)   || 0;
          if (b.status === 'deposit_paid') return parseFloat(b.deposit) || 0;
          return 0;
        };
        const labourInRange = (start, end) => bookings
          .filter(b => b.cleanDate >= start && b.cleanDate <= end && !b.status?.startsWith('cancelled'))
          .reduce((s, b) => s + bookingLabour(b), 0);

        const moStart = `${thisMonthKey}-01`, moEnd = `${thisMonthKey}-31`;
        const moBkgs    = bookings.filter(b => b.cleanDate >= moStart && b.cleanDate <= moEnd && !b.status?.startsWith('cancelled'));
        const moRevenue = moBkgs.reduce((s, b) => s + collectedAmt(b), 0);
        const moLabour  = labourInRange(moStart, moEnd);
        const moVarExp  = expenses.filter(e => e.date >= moStart && e.date <= moEnd).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
        const moTotal   = moLabour + moVarExp + fixedMonthly;
        const moProfit  = moRevenue - moTotal;
        const moMargin  = moRevenue > 0 ? (moProfit / moRevenue) * 100 : 0;
        const moLabourPct = moRevenue > 0 ? (moLabour / moRevenue) * 100 : 0;

        const tyBkgs    = bookings.filter(b => b.cleanDate >= taxYear.start && b.cleanDate <= taxYear.end && !b.status?.startsWith('cancelled'));
        const tyRevenue = tyBkgs.reduce((s, b) => s + collectedAmt(b), 0);
        const tyLabour  = labourInRange(taxYear.start, taxYear.end);
        const tyVarExp  = expenses.filter(e => e.date >= taxYear.start && e.date <= taxYear.end).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
        const tyFixed   = fixedMonthly * 12;
        const tyTotal   = tyLabour + tyVarExp + tyFixed;
        const tyProfit  = tyRevenue - tyTotal;
        const tyMargin  = tyRevenue > 0 ? (tyProfit / tyRevenue) * 100 : 0;
        const tyLabPct  = tyRevenue > 0 ? (tyLabour / tyRevenue) * 100 : 0;

        const isTY      = pnlView === 'taxYear';
        const revenue   = isTY ? tyRevenue : moRevenue;
        const labour    = isTY ? tyLabour  : moLabour;
        const varExp    = isTY ? tyVarExp  : moVarExp;
        const fixed     = isTY ? tyFixed   : fixedMonthly;
        const totalCosts = isTY ? tyTotal  : moTotal;
        const profit    = isTY ? tyProfit  : moProfit;
        const netMargin = isTY ? tyMargin  : moMargin;
        const labourPct = isTY ? tyLabPct  : moLabourPct;
        const bkgCount  = isTY ? tyBkgs.length : moBkgs.length;

        const tyStartYear = parseInt(taxYear.label.split('/')[0]);
        const tyMonths = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(tyStartYear, 3 + i, 1);
          const mStart = i === 0  ? taxYear.start : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-06`;
          const nextD  = new Date(tyStartYear, 4 + i, 1);
          const mEnd   = i === 11 ? taxYear.end   : `${nextD.getFullYear()}-${String(nextD.getMonth()+1).padStart(2,'0')}-05`;
          const label  = d.toLocaleString('en-GB', { month: 'short' });
          const rev    = bookings.filter(b => b.cleanDate >= mStart && b.cleanDate <= mEnd && !b.status?.startsWith('cancelled')).reduce((s, b) => s + collectedAmt(b), 0);
          const lab    = labourInRange(mStart, mEnd);
          const exp    = expenses.filter(e => e.date >= mStart && e.date <= mEnd).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
          const total  = lab + exp + fixedMonthly;
          const isFuture = d > now;
          return { label, rev, total, profit: rev - total, isFuture };
        });
        const maxPnl = Math.max(...tyMonths.filter(m => !m.isFuture).map(m => Math.max(m.rev, m.total)), 1);

        const PCARD = { background: C.card, borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
        const KLABEL2 = { fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 };
        const PTAB  = active => ({ fontFamily: FONT, fontSize: 12, fontWeight: active ? 700 : 500, padding: '7px 16px', borderRadius: 6, border: active ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: active ? BIZ : C.card, color: active ? '#fff' : C.text, boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.07)' });

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
                {isTY
                  ? <>Tax Year <strong style={{ color: C.text }}>{taxYear.label}</strong> · strict 6 Apr – 5 Apr</>
                  : <>Month: <strong style={{ color: C.text }}>{new Date(now.getFullYear(), now.getMonth(), 1).toLocaleString('en-GB',{month:'long',year:'numeric'})}</strong></>
                }
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => {
                  const period = isTY ? `tax-year-${taxYear.label.replace('/','_')}` : new Date().toISOString().slice(0,7);
                  const rows = [['Period','Revenue','Subcontractor Costs','Variable Costs','Fixed Costs','Total Costs','Net Profit','Margin %']];
                  rows.push([period, revenue.toFixed(2), labour.toFixed(2), varExp.toFixed(2), fixed.toFixed(2), totalCosts.toFixed(2), profit.toFixed(2), netMargin.toFixed(1)+'%']);
                  if (isTY) tyMonths.forEach(m => rows.push([m.label, m.rev.toFixed(2), '', '', '', m.total.toFixed(2), m.profit.toFixed(2), '']));
                  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download = `pnl-${period}.csv`; a.click();
                }} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>⬇ CSV</button>
                <button style={PTAB(!isTY)} onClick={() => setPnlView('month')}>This Month</button>
                <button style={PTAB(isTY)}  onClick={() => setPnlView('taxYear')}>Tax Year {taxYear.label}</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ ...PCARD, borderTop: '3px solid #16a34a' }}>
                <div style={KLABEL2}>Revenue</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#16a34a' }}>£{revenue.toFixed(2)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{bkgCount} jobs</div>
              </div>
              <div style={{ ...PCARD, borderTop: '3px solid #7c3aed' }}>
                <div style={KLABEL2}>Subcontractors</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>£{labour.toFixed(2)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{labourPct.toFixed(1)}% of revenue</div>
              </div>
              <div style={{ ...PCARD, borderTop: '3px solid #dc2626' }}>
                <div style={KLABEL2}>Op. Costs</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#dc2626' }}>£{varExp.toFixed(2)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>variable expenses</div>
              </div>
              <div style={{ ...PCARD, borderTop: '3px solid #f97316' }}>
                <div style={KLABEL2}>Fixed</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#f97316' }}>£{fixed.toFixed(2)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{isTY ? 'annual overhead' : 'monthly overhead'}</div>
              </div>
              <div style={{ ...PCARD, borderTop: `3px solid ${profit >= 0 ? '#16a34a' : '#dc2626'}`, gridColumn: isMobile ? '1/-1' : 'auto' }}>
                <div style={KLABEL2}>Net Profit</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: profit >= 0 ? '#16a34a' : '#dc2626' }}>£{profit.toFixed(2)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{netMargin.toFixed(1)}% margin</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: C.card, borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>{isTY ? `Tax Year ${taxYear.label} Breakdown` : 'This Month Breakdown'}</div>
                {[
                  ['Revenue',             revenue,     '#16a34a', false],
                  ['Subcontractor costs', -labour,     '#7c3aed', false],
                  ['Operating costs',     -varExp,     '#dc2626', false],
                  ['Fixed overhead',      -fixed,      '#f97316', false],
                  ['Total costs',         -totalCosts, C.muted,   false],
                  ['Net profit',          profit,      profit >= 0 ? '#16a34a' : '#dc2626', true],
                ].map(([label, val, col, bold], i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: label === 'Total costs' ? `2px solid ${C.border}` : i < arr.length-1 ? `1px solid ${C.border}` : 'none', fontFamily: FONT }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: bold ? 700 : 400 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{val >= 0 ? '' : '−'}£{Math.abs(val).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Margin Analysis</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>Subcontractor cost as % of revenue</span>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: labourPct > 40 ? '#dc2626' : '#7c3aed' }}>{labourPct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 5, background: C.bg, borderRadius: 99, marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${Math.min(labourPct, 100)}%`, background: labourPct > 40 ? '#dc2626' : '#7c3aed', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: labourPct > 40 ? '#dc2626' : C.muted, lineHeight: 1.5 }}>
                      Target: keep below 40%. If labour is eating more than 40p of every £1 you earn, either pricing needs to go up or job efficiency needs to improve.
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>Net margin %</span>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: netMargin >= 20 ? '#16a34a' : netMargin >= 0 ? '#f97316' : '#dc2626' }}>{netMargin.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 5, background: C.bg, borderRadius: 99, marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.abs(netMargin), 100)}%`, background: netMargin >= 20 ? '#16a34a' : netMargin >= 0 ? '#f97316' : '#dc2626', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Green</span> = 20%+ (healthy). <span style={{ color: '#f97316', fontWeight: 600 }}>Amber</span> = 0–19% (watch it). <span style={{ color: '#dc2626', fontWeight: 600 }}>Red</span> = negative (losing money).
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: C.card, borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>P&L — Tax Year {taxYear.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 3 : 5, height: 100 }}>
                  {tyMonths.map((m, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: m.isFuture ? 0.2 : 1 }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1, justifyContent: 'flex-end', height: 80 }}>
                        <div style={{ background: '#16a34a', borderRadius: '3px 3px 0 0', height: `${(m.rev/maxPnl)*70}px`, minHeight: m.rev > 0 ? 2 : 0, opacity: 0.85 }} title={`Revenue £${m.rev.toFixed(2)}`} />
                        <div style={{ background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${(m.total/maxPnl)*70}px`, minHeight: m.total > 0 ? 2 : 0, opacity: 0.7 }} title={`Total costs £${m.total.toFixed(2)}`} />
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 9, color: C.muted }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: '#16a34a', borderRadius: 2 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Revenue</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: '#dc2626', borderRadius: 2, opacity: 0.7 }} /><span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Total costs</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── HMRC TAB ── */}
      {expenseTab === 'hmrc' && (() => {
        const HMRC_CATS = [
          { box: 'Box 18', label: 'Cost of goods bought for resale or goods used',  cats: ['Supplies'] },
          { box: 'Box 21', label: 'Car, van and travel expenses',                   cats: ['Fuel & Mileage', 'Public Transport'] },
          { box: 'Box 22', label: 'Rent, rates, power and insurance costs',         cats: ['Insurance', 'Rent & Utilities'] },
          { box: 'Box 23', label: 'Repairs and maintenance of property and equipment', cats: ['Equipment'] },
          { box: 'Box 24', label: 'Phone, fax, stationery and other office costs',  cats: ['Software & Tools'] },
          { box: 'Box 25', label: 'Advertising and business entertainment costs',   cats: ['Marketing'] },
          { box: 'Box 30', label: 'Other allowable business expenses (incl. subcontractor payments & staff costs)', cats: ['Other', 'Staff Costs'] },
        ];
        const tyExp = expenses.filter(e => e.date >= taxYear.start && e.date <= taxYear.end);
        const tyTotal = tyExp.reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
        const fixedAnnual = fixedMonthly * 12;
        const tyLabourHMRC = bookings
          .filter(b => b.cleanDate >= taxYear.start && b.cleanDate <= taxYear.end && b.status !== 'cancelled')
          .reduce((s, b) => {
            const hrs = calcHours(b.actualStart, b.actualFinish);
            if (!hrs) return s;
            const member = staff.find(m => m.name === b.assignedStaff);
            const rate = member && member.hourlyRate !== 'N/A' ? parseFloat(member.hourlyRate) : 0;
            return s + hrs * rate;
          }, 0);
        const grandTotal = tyTotal + fixedAnnual + tyLabourHMRC;
        const tyStartYear = parseInt(taxYear.label.split('/')[0]);

        const exportHMRC = () => {
          const rows = [['SA103F Box','Description','Amount (£)']];
          HMRC_CATS.forEach(hc => {
            const total = tyExp.filter(e => hc.cats.includes(e.category)).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
            if (total > 0) rows.push([hc.box, hc.label, total.toFixed(2)]);
          });
          fixedCosts.filter(f => f.active).forEach(f => {
            const annual = f.frequency === 'yearly' ? parseFloat(f.amount)||0 : (parseFloat(f.amount)||0) * 12;
            rows.push(['Fixed', f.name, annual.toFixed(2)]);
          });
          if (tyLabourHMRC > 0) rows.push(['Box 30', 'Subcontractor payments (from job times)', tyLabourHMRC.toFixed(2)]);
          rows.push(['Box 31 TOTAL', `Total Allowable Expenses — Tax Year ${taxYear.label}`, grandTotal.toFixed(2)]);
          const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n')); a.download = `hmrc-sa103-${taxYear.label.replace('/','_')}.csv`; a.click();
        };

        return (
          <div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>Self-Assessment Summary — Tax Year {taxYear.label} (6 Apr {tyStartYear} – 5 Apr {tyStartYear + 1})</div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: '#3b82f6', lineHeight: 1.5 }}>
                  Filing deadline: <strong>31 Jan {tyStartYear + 2}</strong> · The figures below map to your SA103 self-employment supplementary page.
                </div>
              </div>
              <button onClick={exportHMRC} style={{ ...BTN, background: '#1e40af', color: '#fff', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>⬇ Export CSV</button>
            </div>

            <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 20px', background: C.bg, borderBottom: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>Variable Expenses</div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>Amount</div>
              </div>
              {HMRC_CATS.map((hc, i, arr) => {
                const total = tyExp.filter(e => hc.cats.includes(e.category)).reduce((s, e) => s + (parseFloat(e.amount)||0), 0);
                if (total === 0) return null;
                return (
                  <div key={hc.box} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 20px', borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#1e40af', background: '#eff6ff', borderRadius: 4, padding: '2px 7px', flexShrink: 0, marginTop: 1 }}>{hc.box}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{hc.label}</div>
                      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>{hc.cats.join(', ')}</div>
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{total.toFixed(2)}</div>
                  </div>
                );
              })}
              {tyTotal === 0 && <div style={{ padding: '24px 20px', fontFamily: FONT, fontSize: 13, color: C.muted }}>No variable expenses logged for this tax year yet.</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: C.bg, borderTop: `2px solid ${C.border}` }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.muted }}>Variable subtotal</div>
                <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{tyTotal.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 20px', background: C.bg, borderBottom: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>Fixed Costs (annualised)</div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>Amount</div>
              </div>
              {fixedCosts.filter(f => f.active).length === 0
                ? <div style={{ padding: '24px 20px', fontFamily: FONT, fontSize: 13, color: C.muted }}>No active fixed costs added yet.</div>
                : fixedCosts.filter(f => f.active).map((f, i, arr) => {
                  const annual = f.frequency === 'yearly' ? parseFloat(f.amount)||0 : (parseFloat(f.amount)||0) * 12;
                  return (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#1e40af', background: '#eff6ff', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>Fixed</div>
                      <div style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: C.text }}>{f.name}</div>
                      <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{annual.toFixed(2)}</div>
                    </div>
                  );
                })
              }
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: C.bg, borderTop: `2px solid ${C.border}` }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.muted }}>Fixed subtotal</div>
                <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{fixedAnnual.toFixed(2)}</div>
              </div>
            </div>

            {tyLabourHMRC > 0 && (
              <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 20px', background: C.bg, borderBottom: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>Subcontractor Payments (from job times)</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>Amount</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#1e40af', background: '#eff6ff', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>Box 30</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>Payments to self-employed subcontractors — calculated from actual job times × agreed rate</div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>Do not duplicate if also logged under Staff Costs expenses.</div>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{tyLabourHMRC.toFixed(2)}</div>
                </div>
              </div>
            )}

            <div style={{ background: '#1e40af', borderRadius: 10, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Total Allowable Expenses — Box 31</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Copy this number into Box 31 of your SA103F</div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: '#fff' }}>£{grandTotal.toFixed(2)}</div>
            </div>

            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
              * This uses the SA103F (Self-Employment Full) supplementary page. Boxes 18–30 are individual expense categories; Box 31 is the total. Fixed costs are annualised (×12 for monthly). If your annual turnover is under £90,000 you can use the simpler SA103S (Short) form — the Box 31 total above works for both.
            </div>
          </div>
        );
      })()}

      {/* ── EXPENSE MODAL ── */}
      {expenseModal && (() => {
        const d = expenseModal.data;
        const isMileage = d.category === 'Fuel & Mileage' && d.useMileage;
        const calcAmountFromMiles = miles => (parseFloat(miles) * HMRC_RATE).toFixed(2);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 460, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text }}>{expenseModal.mode === 'add' ? 'Add Expense' : 'Edit Expense'}</div>
                <button onClick={() => setExpenseModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Date *</div>
                  <input type="date" value={d.date || ''} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, date: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Paid By</div>
                  <select value={d.paidBy || 'Company Card'} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, paidBy: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                    {PAID_BY.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Category *</div>
                  <select value={d.category || 'Supplies'} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, category: e.target.value, useMileage: false } }))} style={{ ...INPUT, marginBottom: 0 }}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {d.category === 'Fuel & Mileage' && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: C.text }}>
                      <input type="checkbox" checked={!!d.useMileage} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, useMileage: e.target.checked, miles: '', amount: '' } }))} />
                      Use mileage calculator (HMRC 45p/mile)
                    </label>
                  </div>
                )}
                {isMileage ? (
                  <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Miles *</div>
                      <input type="number" min="0" value={d.miles || ''} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, miles: e.target.value, amount: calcAmountFromMiles(e.target.value) } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="e.g. 12" />
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Amount (auto)</div>
                      <input readOnly value={d.amount ? `£${parseFloat(d.amount).toFixed(2)}` : '—'} style={{ ...INPUT, marginBottom: 0, background: C.bg, color: C.muted }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Amount (£) *</div>
                    <input type="number" step="0.01" min="0" value={d.amount || ''} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, amount: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="0.00" />
                  </div>
                )}
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Description *</div>
                  <input value={d.description || ''} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, description: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="e.g. Cleaning supplies from Costco" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
                  <textarea value={d.notes || ''} onChange={e => setExpenseModal(m => ({ ...m, data: { ...m.data, notes: e.target.value } }))} style={{ ...INPUT, marginBottom: 0, height: 60, resize: 'vertical' }} placeholder="Any extra details…" />
                </div>
              </div>
              {d.paidBy === 'Personal — Reimbursable' && (
                <div style={{ fontFamily: FONT, fontSize: 12, color: '#d97706', background: '#fff8eb', borderRadius: 6, padding: '8px 12px', marginTop: 10 }}>
                  Marked as reimbursable — remember to pay this back to the person who paid.
                </div>
              )}
              {expenseErr && <div style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', marginTop: 10 }}>{expenseErr}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                {expenseModal.mode === 'edit' ? (
                  <button disabled={expenseSaving} onClick={deleteExpense} style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setExpenseModal(null)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
                  <button disabled={expenseSaving} onClick={saveExpense} style={{ ...BTN, background: C.accent, color: '#fff', opacity: expenseSaving ? 0.6 : 1 }}>{expenseSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── BUDGET MODAL ── */}
      {budgetEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text }}>Monthly Budgets</div>
              <button onClick={() => setBudgetEdit(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 20 }}>Set a monthly spend limit per category. Leave blank for no limit.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CATS.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, flex: 1 }}>{cat}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>£</span>
                    <input type="number" min="0" step="1" value={budgetDraft[cat] || ''} placeholder="No limit"
                      onChange={e => setBudgetDraft(d => ({ ...d, [cat]: e.target.value }))}
                      style={{ ...INPUT, marginBottom: 0, width: 90, fontSize: 13 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setBudgetEdit(false)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
              <button disabled={budgetSaving} onClick={saveBudgets} style={{ ...BTN, background: C.accent, color: '#fff', opacity: budgetSaving ? 0.6 : 1 }}>{budgetSaving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FIXED COST MODAL ── */}
      {fixedModal && (() => {
        const d = fixedModal.data;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 440, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text }}>{fixedModal.mode === 'add' ? 'Add Fixed Cost' : 'Edit Fixed Cost'}</div>
                <button onClick={() => setFixedModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[['Name *', 'name', 'text', 'e.g. Employer Liability Insurance'], ['Amount (£) *', 'amount', 'number', '0.00'], ['Due Day of Month', 'dueDayOfMonth', 'number', 'e.g. 1']].map(([label, key, type, ph]) => (
                  <div key={key}>
                    <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>{label}</div>
                    <input type={type} value={d[key] || ''} placeholder={ph} onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, [key]: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Start Date *</div>
                    <input type="date" value={d.startDate || ''} onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, startDate: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>End Date <span style={{ fontWeight: 400 }}>(leave blank if ongoing)</span></div>
                    <input type="date" value={d.endDate || ''} onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, endDate: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Frequency</div>
                  <select value={d.frequency || 'monthly'} onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, frequency: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Account</div>
                  <select value={d.account || 'Monzo'} onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, account: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                    {['Monzo', 'Revolut', 'Barclays', 'Cash', 'Other'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Account Holder</div>
                  <input value={d.accountHolder || ''} placeholder="e.g. Farhana" onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, accountHolder: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Notes</div>
                  <textarea value={d.notes || ''} placeholder="Any extra details…" onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, notes: e.target.value } }))} style={{ ...INPUT, marginBottom: 0, height: 60, resize: 'vertical' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: C.text }}>
                  <input type="checkbox" checked={!!d.active} onChange={e => setFixedModal(m => ({ ...m, data: { ...m.data, active: e.target.checked } }))} />
                  Active (included in monthly overhead total)
                </label>
              </div>
              {fixedErr && <div style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', marginTop: 10 }}>{fixedErr}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                {fixedModal.mode === 'edit' ? (
                  <button disabled={fixedSaving} onClick={deleteFixedCost} style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setFixedModal(null)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
                  <button disabled={fixedSaving} onClick={saveFixedCost} style={{ ...BTN, background: C.accent, color: '#fff', opacity: fixedSaving ? 0.6 : 1 }}>{fixedSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
