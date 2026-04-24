import { useState, useEffect } from 'react';
import { db } from '../../../firebase/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { fmtDate, getTaxYears, currentTaxYear } from '../utils';

const FONT  = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN   = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };
const BIZ   = '#0ea5e9';
const SUPPLY_CATS = ['Cloths & Scrubbing', 'Cleaning Products', 'Tools', 'PPE', 'Kit Bag', 'Spray Bottle', 'Candles', 'Candle Holder', 'Essence Oil Bergamot', 'Essence Oil Lavender', 'Essence Oil Sandalwood', 'Fragrance Alcohol', 'Di Propylene Glycol', 'Thank You Cards', 'Welcome Cards', 'Other'];
const CAT_COLOURS = { 'Cloths & Scrubbing': '#0ea5e9', 'Cleaning Products': '#6366f1', 'Tools': '#f97316', 'PPE': '#14b8a6', 'Kit Bag': '#8b5cf6', 'Spray Bottle': '#06b6d4', 'Candles': '#f59e0b', 'Candle Holder': '#d97706', 'Essence Oil Bergamot': '#84cc16', 'Essence Oil Lavender': '#a855f7', 'Essence Oil Sandalwood': '#c084fc', 'Fragrance Alcohol': '#fb923c', 'Di Propylene Glycol': '#38bdf8', 'Thank You Cards': '#ec4899', 'Welcome Cards': '#f43f5e', 'Other': '#94a3b8' };

const itemCost = s => (parseFloat(s.unitCost) || 0) * (Number(s.inStock) || 0);

const statusInfo = s => {
  const stock   = Number(s.inStock)   || 0;
  const reorder = Number(s.reorderAt) || 0;
  if (stock === 0)                      return { label: 'Out of Stock', bg: '#fee2e2', color: '#dc2626' };
  if (reorder > 0 && stock <= reorder)  return { label: 'Reorder',      bg: '#fee2e2', color: '#dc2626' };
  return                                       { label: 'OK',           bg: '#f0fdf4', color: '#16a34a' };
};

export default function SuppliesTab({ supplies, isMobile, C }) {
  const [monthFilter, setMonthFilter] = useState('all');
  const [catFilter,   setCatFilter]   = useState('all');
  const [search,      setSearch]      = useState('');

  const [suppliesModal,  setSuppliesModal]  = useState(null);
  const [suppliesSaving, setSuppliesSaving] = useState(false);
  const [suppliesErr,    setSuppliesErr]    = useState('');

  const [budgets,       setBudgets]       = useState({});
  const [budgetEdit,    setBudgetEdit]    = useState(false);
  const [budgetDraft,   setBudgetDraft]   = useState({});
  const [budgetSaving,  setBudgetSaving]  = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'supplyBudgets'), snap => {
      if (snap.exists()) setBudgets(snap.data());
    });
    return unsub;
  }, []);

  const saveSupply = async () => {
    const d = suppliesModal.data;
    if (!d.name?.trim()) { setSuppliesErr('Name is required.'); return; }
    setSuppliesSaving(true); setSuppliesErr('');
    try {
      const payload = {
        name: d.name.trim(), category: d.category || 'Other', unit: d.unit || 'each',
        inStock: parseInt(d.inStock) || 0, reorderAt: parseInt(d.reorderAt) || 0,
        unitCost: parseFloat(d.unitCost) || 0, purchaseDate: d.purchaseDate || '',
        paidBy: d.paidBy || 'Company Card', whereToBuy: d.whereToBuy?.trim() || '',
        notes: d.notes?.trim() || '',
      };
      if (suppliesModal.mode === 'add') await addDoc(collection(db, 'supplies'), { ...payload, createdAt: new Date().toISOString() });
      else await updateDoc(doc(db, 'supplies', d.id), payload);
      setSuppliesModal(null);
    } catch (e) { setSuppliesErr(e.message); }
    finally { setSuppliesSaving(false); }
  };

  const deleteSupply = async () => {
    if (!window.confirm('Delete this item?')) return;
    setSuppliesSaving(true);
    try { await deleteDoc(doc(db, 'supplies', suppliesModal.data.id)); setSuppliesModal(null); }
    catch (e) { setSuppliesErr(e.message); }
    finally { setSuppliesSaving(false); }
  };

  const saveBudgets = async () => {
    setBudgetSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'supplyBudgets'), budgetDraft);
      setBudgetEdit(false);
    } catch (e) { alert('Failed to save budgets.'); }
    finally { setBudgetSaving(false); }
  };

  const now          = new Date();
  const taxYear      = currentTaxYear();
  const taxYears     = getTaxYears();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMo       = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMoYr     = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthKey = `${lastMoYr}-${String(lastMo + 1).padStart(2, '0')}`;

  const inPeriod = s => {
    if (!s.purchaseDate) return monthFilter === 'all';
    if (monthFilter === 'all') return true;
    if (monthFilter.startsWith('ty:')) {
      const label      = monthFilter.slice(3);
      const selectedTY = taxYears.find(ty => ty.label.replace(' tax year', '') === label) || taxYear;
      return s.purchaseDate >= selectedTY.start && s.purchaseDate <= selectedTY.end;
    }
    return s.purchaseDate.startsWith(monthFilter);
  };

  let activeMonthKey, activePrevMonthKey, activeTaxYear;
  if (monthFilter.startsWith('ty:')) {
    const label = monthFilter.slice(3);
    activeTaxYear      = taxYears.find(ty => ty.label.replace(' tax year', '') === label) || taxYear;
    activeMonthKey     = thisMonthKey;
    activePrevMonthKey = lastMonthKey;
  } else if (monthFilter !== 'all') {
    activeMonthKey = monthFilter;
    const [yr, mo] = monthFilter.split('-').map(Number);
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
  const activeMonthLabel = monthFilter !== 'all' && !monthFilter.startsWith('ty:')
    ? new Date(activeMonthKey + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    : 'This Month';
  const prevMonthLabel = monthFilter !== 'all' && !monthFilter.startsWith('ty:')
    ? new Date(activePrevMonthKey + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    : 'Last Month';

  const thisMonthItems    = supplies.filter(s => s.purchaseDate?.startsWith(activeMonthKey));
  const lastMonthItems    = supplies.filter(s => s.purchaseDate?.startsWith(activePrevMonthKey));
  const taxYearItems      = supplies.filter(s => s.purchaseDate >= activeTaxYear.start && s.purchaseDate <= activeTaxYear.end);
  const thisMonthTotal    = thisMonthItems.reduce((s, x) => s + itemCost(x), 0);
  const lastMonthTotal    = lastMonthItems.reduce((s, x) => s + itemCost(x), 0);
  const taxYearTotal      = taxYearItems.reduce((s, x) => s + itemCost(x), 0);
  const needRestock       = supplies.filter(s => { const stock = Number(s.inStock) || 0; const reorder = Number(s.reorderAt) || 0; return reorder > 0 && stock <= reorder; });
  const reimbursableItems = supplies.filter(s => s.paidBy === 'Personal — Reimbursable' && !s.repaid);
  const reimbursable      = reimbursableItems.reduce((s, x) => s + itemCost(x), 0);

  const catBreakdown = SUPPLY_CATS.map(cat => ({
    cat,
    value: supplies.filter(s => s.category === cat).reduce((s, x) => s + itemCost(x), 0),
    budget: parseFloat(budgets?.[cat]) || 0,
  })).filter(c => c.budget > 0).sort((a, b) => b.value - a.value);
  const maxCatValue = Math.max(...catBreakdown.map(c => c.value), 1);

  const allMonths = [];
  const cursor = new Date(2026, 0, 1);
  while (cursor <= now) {
    allMonths.unshift(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const filteredInv    = supplies.filter(s => {
    if (!inPeriod(s)) return false;
    if (catFilter !== 'all' && s.category !== catFilter) return false;
    if (!search) return true;
    return s.name?.toLowerCase().includes(search.toLowerCase()) ||
           s.category?.toLowerCase().includes(search.toLowerCase()) ||
           s.whereToBuy?.toLowerCase().includes(search.toLowerCase());
  });
  const totalFiltered = filteredInv.reduce((s, x) => s + itemCost(x), 0);

  const exportCSV = () => {
    const rows = [['Name', 'Category', 'Purchase Date', 'In Stock', 'Unit Cost', 'Total Value', 'Reorder At', 'Paid By', 'Where to Buy', 'Notes']];
    filteredInv.forEach(s => rows.push([`"${s.name || ''}"`, s.category || '', s.purchaseDate || '', s.inStock || 0, parseFloat(s.unitCost || 0).toFixed(2), itemCost(s).toFixed(2), s.reorderAt || 0, s.paidBy || 'Company Card', s.whereToBuy || '', `"${(s.notes || '').replace(/"/g, '""')}"`]));
    rows.push(['Total', '', '', '', '', totalFiltered.toFixed(2), '', '', '', '']);
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = `supplies-${monthFilter === 'all' ? 'all' : monthFilter}.csv`;
    a.click();
  };

  const markRepaid = async id => {
    try { await updateDoc(doc(db, 'supplies', id), { repaid: true }); }
    catch { alert('Failed to mark as repaid — check your connection and try again.'); }
  };

  const updateStock = async (id, delta) => {
    const item = supplies.find(s => s.id === id);
    if (!item) return;
    const next = Math.max(0, (Number(item.inStock) || 0) + delta);
    try { await updateDoc(doc(db, 'supplies', id), { inStock: next }); }
    catch { alert('Failed to update stock — check your connection and try again.'); }
  };

  const openAdd = () => {
    setSuppliesModal({ mode: 'add', data: { name: '', category: 'Cleaning Products', unit: 'each', qtyNeeded: '', inStock: '', reorderAt: '', unitCost: '', purchaseDate: new Date().toISOString().split('T')[0], paidBy: 'Company Card', whereToBuy: '', notes: '' } });
    setSuppliesErr('');
  };

  const openEdit = s => {
    setSuppliesModal({ mode: 'edit', data: { ...s } });
    setSuppliesErr('');
  };

  const openBudget = () => {
    setBudgetDraft({ ...budgets });
    setBudgetEdit(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>Supplies</div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '3px solid #16a34a' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a', marginBottom: 4 }}>{activeMonthLabel}</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>£{thisMonthTotal.toFixed(0)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: thisMonthTotal <= lastMonthTotal ? '#16a34a' : '#dc2626', marginTop: 3 }}>
            {lastMonthTotal > 0 ? `${thisMonthTotal <= lastMonthTotal ? '▼' : '▲'} £${Math.abs(thisMonthTotal - lastMonthTotal).toFixed(0)} vs prev` : thisMonthItems.length > 0 ? `${thisMonthItems.length} item${thisMonthItems.length !== 1 ? 's' : ''} purchased` : 'No purchases'}
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `3px solid ${C.accent}` }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>{prevMonthLabel}</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>£{lastMonthTotal.toFixed(0)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{lastMonthItems.length} item{lastMonthItems.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '3px solid #6366f1' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>Tax Year {activeTaxYear.label}</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>£{taxYearTotal.toFixed(0)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{fmtDate(activeTaxYear.start)} – {fmtDate(activeTaxYear.end)}</div>
        </div>
        <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: needRestock.length > 0 ? '3px solid #dc2626' : '3px solid #16a34a' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>Needs Restocking</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: needRestock.length > 0 ? '#dc2626' : '#16a34a' }}>{needRestock.length}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{supplies.length} total items</div>
        </div>
        <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: reimbursable > 0 ? '3px solid #dc2626' : `3px solid ${C.accent}` }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>Reimbursable Owed</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: reimbursable > 0 ? '#dc2626' : C.text }}>£{reimbursable.toFixed(0)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{reimbursableItems.length} unpaid</div>
        </div>
      </div>

      {/* Spending by category bar chart */}
      {catBreakdown.length > 0 && (
        <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Spending by Category</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {catBreakdown.map(c => (
              <div key={c.cat} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${(c.value / maxCatValue) * 64}px`, minHeight: c.value > 0 ? 3 : 0, background: CAT_COLOURS[c.cat] || BIZ, borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={`${c.cat}: £${c.value.toFixed(0)}`} />
                <div style={{ fontFamily: FONT, fontSize: 9, color: C.muted, textAlign: 'center', overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{c.cat.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reorder alert */}
      {needRestock.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT, fontSize: 15 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{needRestock.length} item{needRestock.length !== 1 ? 's' : ''} need restocking</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: '#b91c1c', marginTop: 2 }}>{needRestock.map(s => s.name).join(', ')}</div>
          </div>
        </div>
      )}

      {/* Reimbursable owed */}
      {reimbursableItems.length > 0 && (
        <div style={{ background: '#fff5f5', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>💳 Reimbursable — £{reimbursable.toFixed(2)} still owed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reimbursableItems.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginLeft: 8 }}>{s.purchaseDate ? fmtDate(s.purchaseDate) : '—'} · £{itemCost(s).toFixed(2)}</span>
                </div>
                <button onClick={() => markRepaid(s.id)} style={{ ...BTN, background: '#16a34a', color: '#fff', fontSize: 12, padding: '5px 12px' }}>✓ Mark repaid</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...INPUT, marginBottom: 0, width: 130, fontSize: 13 }} />
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 'auto', fontSize: 13 }}>
          <option value="all">All time</option>
          <optgroup label="Tax Year">
            {taxYears.map(ty => { const label = ty.label.replace(' tax year', ''); return <option key={label} value={`ty:${label}`}>{label} tax year (6 Apr–5 Apr)</option>; })}
          </optgroup>
          <optgroup label="By Month">
            {allMonths.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</option>)}
          </optgroup>
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 'auto', fontSize: 13 }}>
          <option value="all">All categories</option>
          {SUPPLY_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>{filteredInv.length} items · £{totalFiltered.toFixed(2)}</span>
          {filteredInv.length > 0 && <button onClick={exportCSV} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>⬇ CSV</button>}
          <button onClick={openAdd} style={{ ...BTN, background: C.accent, color: '#fff', fontSize: 13 }}>+ Add Item</button>
        </div>
      </div>

      {/* Item list + By Category sidebar */}
      {supplies.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 8, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>No supplies added yet. Click "+ Add Item" to build your inventory.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px', gap: 16, alignItems: 'start' }}>

          {/* Item list */}
          <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {filteredInv.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>No items match the selected filter.</div>
            ) : filteredInv.map((s, i) => {
              const st      = statusInfo(s);
              const dotCol  = CAT_COLOURS[s.category] || '#94a3b8';
              const cost    = itemCost(s);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < filteredInv.length - 1 ? `1px solid ${C.border}` : 'none', background: s.paidBy === 'Personal — Reimbursable' && !s.repaid ? '#fff5f5' : 'transparent' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotCol, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{s.name}</div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {s.purchaseDate && <span>{fmtDate(s.purchaseDate)}</span>}
                      <span style={{ color: dotCol }}>{s.category}</span>
                      {s.whereToBuy && <span>{s.whereToBuy}</span>}
                      {s.paidBy && s.paidBy !== 'Company Card' && <span style={{ color: '#dc2626', fontWeight: 500 }}>{s.paidBy}{s.repaid ? ' ✓ repaid' : ''}</span>}
                      {s.notes && <span style={{ fontStyle: 'italic' }}>{s.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 80, justifyContent: 'center' }}>
                      <button onClick={() => updateStock(s.id, -1)} style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontFamily: FONT, fontSize: 14, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: st.color, width: 22, textAlign: 'center' }}>{s.inStock ?? '—'}</span>
                      <button onClick={() => updateStock(s.id, 1)} style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontFamily: FONT, fontSize: 14, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color, whiteSpace: 'nowrap', width: 76, textAlign: 'center', display: 'inline-block' }}>{st.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text, width: 58, textAlign: 'right' }}>{cost > 0 ? `£${cost.toFixed(2)}` : '—'}</span>
                    <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, width: 24 }}>✏️</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* By Category sidebar */}
          <div style={{ background: C.card, borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>By Category</div>
              <button onClick={openBudget} style={{ fontFamily: FONT, fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Set budgets</button>
            </div>
            {catBreakdown.length === 0 ? <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Set budgets to track spending by category.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {catBreakdown.map(c => {
                  const bgt  = c.budget;
                  const pct  = Math.min((c.value / bgt) * 100, 100);
                  const over = c.value > bgt;
                  return (
                    <div key={c.cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{c.cat}</span>
                        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: over ? '#dc2626' : C.text }}>
                          £{c.value.toFixed(0)}{bgt > 0 ? ` / £${bgt.toFixed(0)}` : ''}
                        </span>
                      </div>
                      <div style={{ height: 6, background: C.bg, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: over ? '#dc2626' : CAT_COLOURS[c.cat] || BIZ, borderRadius: 99 }} />
                      </div>
                      {over && <div style={{ fontFamily: FONT, fontSize: 10, color: '#dc2626', marginTop: 2 }}>Over budget by £{(c.value - bgt).toFixed(0)}</div>}
                    </div>
                  );
                })}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.muted }}>Total</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>£{catBreakdown.reduce((s, c) => s + c.value, 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supply Item Modal */}
      {suppliesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 440, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text }}>{suppliesModal.mode === 'add' ? 'Add Supply Item' : 'Edit Supply Item'}</div>
              <button onClick={() => setSuppliesModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Name *</div>
                <input value={suppliesModal.data.name || ''} placeholder="e.g. Microfibre cloths" onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Category</div>
                <select value={suppliesModal.data.category || 'Cleaning Products'} onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, category: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                  {SUPPLY_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>In Stock</div>
                  <input type="number" min="0" value={suppliesModal.data.inStock || ''} placeholder="0" onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, inStock: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Reorder At</div>
                  <input type="number" min="0" value={suppliesModal.data.reorderAt || ''} placeholder="1" onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, reorderAt: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Unit Cost (£)</div>
                  <input type="number" step="0.01" min="0" value={suppliesModal.data.unitCost || ''} placeholder="0.00" onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, unitCost: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Unit</div>
                  <select value={suppliesModal.data.unit || 'each'} onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, unit: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                    {['each', 'pack', 'bottle', 'bag', 'roll', 'pair', 'box', 'litre'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Purchase Date *</div>
                <input type="date" value={suppliesModal.data.purchaseDate || ''} onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, purchaseDate: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Paid By</div>
                <select value={suppliesModal.data.paidBy || 'Company Card'} onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, paidBy: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                  <option>Company Card</option>
                  <option>Cash</option>
                  <option>Personal — Reimbursable</option>
                  <option>Direct Debit</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Where to Buy</div>
                <input value={suppliesModal.data.whereToBuy || ''} placeholder="e.g. Amazon, Costco" onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, whereToBuy: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Notes</div>
                <textarea value={suppliesModal.data.notes || ''} placeholder="Any extra details…" onChange={e => setSuppliesModal(m => ({ ...m, data: { ...m.data, notes: e.target.value } }))} style={{ ...INPUT, marginBottom: 0, height: 60, resize: 'vertical' }} />
              </div>
            </div>
            {suppliesErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 10 }}>{suppliesErr}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              {suppliesModal.mode === 'edit' ? (
                <button disabled={suppliesSaving} onClick={deleteSupply} style={{ fontFamily: FONT, fontSize: 12, color: C.danger, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
              ) : <div />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSuppliesModal(null)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
                <button disabled={suppliesSaving} onClick={saveSupply} style={{ ...BTN, background: C.accent, color: '#fff', opacity: suppliesSaving ? 0.6 : 1 }}>{suppliesSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supply Budget Modal */}
      {budgetEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 480, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text }}>Set Supply Budgets</div>
              <button onClick={() => setBudgetEdit(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SUPPLY_CATS.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, flex: 1 }}>{cat}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>£</span>
                    <input
                      type="number" min="0" step="1"
                      value={budgetDraft[cat] || ''}
                      placeholder="—"
                      onChange={e => setBudgetDraft(d => ({ ...d, [cat]: e.target.value }))}
                      style={{ ...INPUT, marginBottom: 0, width: 90, textAlign: 'right' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button onClick={() => setBudgetEdit(false)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
              <button disabled={budgetSaving} onClick={saveBudgets} style={{ ...BTN, background: C.accent, color: '#fff', opacity: budgetSaving ? 0.6 : 1 }}>{budgetSaving ? 'Saving…' : 'Save Budgets'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
