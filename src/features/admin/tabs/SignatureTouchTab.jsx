import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../../firebase/firebase';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const PERIODS = ['Week', 'Month', 'Year', 'All time'];
const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
const MAT_CATS = ['Essential Oil', 'Base / Carrier', 'Hardware', 'Packaging', 'Other'];
const MAT_UNITS = ['ml', 'g', 'qty', 'cm'];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Default costing config -- migrated from the old hardcoded structure
const DEFAULT_COSTING = {
  materials: [
    { id: 'mat_bergamot',    name: 'Bergamot',             category: 'Essential Oil',  pack_size: 100,  unit: 'ml',  cost: 11.99 },
    { id: 'mat_lavender',    name: 'Lavender',             category: 'Essential Oil',  pack_size: 100,  unit: 'ml',  cost: 10.99 },
    { id: 'mat_sandalwood',  name: 'Sandalwood',           category: 'Essential Oil',  pack_size: 100,  unit: 'ml',  cost: 11.99 },
    { id: 'mat_cedarwood',   name: 'Cedarwood',            category: 'Essential Oil',  pack_size: 10,   unit: 'ml',  cost: 4.99  },
    { id: 'mat_alcohol',     name: "Perfumer's Alcohol",   category: 'Base / Carrier', pack_size: 1000, unit: 'ml',  cost: 16.99 },
    { id: 'mat_dpg',         name: 'DPG',                  category: 'Base / Carrier', pack_size: 1000, unit: 'ml',  cost: 13.95 },
    { id: 'mat_soy_wax',     name: 'Soy Wax',             category: 'Base / Carrier', pack_size: 1800, unit: 'g',   cost: 16.99 },
    { id: 'mat_wicks',       name: 'Wicks',                category: 'Hardware',       pack_size: 100,  unit: 'qty', cost: 4.99  },
    { id: 'mat_holders',     name: 'Tealight Holders',     category: 'Hardware',       pack_size: 24,   unit: 'qty', cost: 14.99 },
    { id: 'mat_bottle_10ml', name: '10ml Spray Bottle',    category: 'Hardware',       pack_size: 30,   unit: 'qty', cost: 16.99 },
    { id: 'mat_bottle_100',  name: '100ml Spray Bottle',   category: 'Hardware',       pack_size: 8,    unit: 'qty', cost: 9.99  },
    { id: 'mat_tape',        name: 'Label Tape',           category: 'Packaging',      pack_size: 1200, unit: 'cm',  cost: 12.99 },
  ],
  giftItems: [
    { id: 'item_spray10', name: '10ml Room Spray', type: 'recipe', active: true, recipe: [
      { mat_id: 'mat_bergamot',    amount: 0.5  },
      { mat_id: 'mat_lavender',    amount: 0.3  },
      { mat_id: 'mat_sandalwood',  amount: 0.25 },
      { mat_id: 'mat_cedarwood',   amount: 0.1  },
      { mat_id: 'mat_alcohol',     amount: 9    },
      { mat_id: 'mat_bottle_10ml', amount: 1    },
      { mat_id: 'mat_tape',        amount: 14   },
    ]},
    { id: 'item_candle', name: 'Candle', type: 'recipe', active: true, recipe: [
      { mat_id: 'mat_soy_wax',    amount: 32   },
      { mat_id: 'mat_bergamot',   amount: 1.36 },
      { mat_id: 'mat_lavender',   amount: 0.82 },
      { mat_id: 'mat_sandalwood', amount: 0.68 },
      { mat_id: 'mat_cedarwood',  amount: 0.32 },
      { mat_id: 'mat_dpg',        amount: 1    },
      { mat_id: 'mat_wicks',      amount: 1    },
      { mat_id: 'mat_holders',    amount: 1    },
      { mat_id: 'mat_tape',       amount: 3    },
    ]},
    { id: 'item_giftbox',  name: 'Gift Box',       type: 'bulk', active: true, pack_qty: 20,  amount_per_gift: 1, pack_cost: 12.69 },
    { id: 'item_tissue',   name: 'Tissue Paper',   type: 'bulk', active: true, pack_qty: 13,  amount_per_gift: 1, pack_cost: 5.99  },
    { id: 'item_bubble',   name: 'Bubble Wrap',    type: 'bulk', active: true, pack_qty: 15,  amount_per_gift: 1, pack_cost: 7.29  },
    { id: 'item_labels',   name: 'Address Labels', type: 'bulk', active: true, pack_qty: 200, amount_per_gift: 2, pack_cost: 13.99 },
  ],
  spray100Recipe: [
    { mat_id: 'mat_bergamot',   amount: 6.5  },
    { mat_id: 'mat_lavender',   amount: 3.9  },
    { mat_id: 'mat_sandalwood', amount: 3.3  },
    { mat_id: 'mat_cedarwood',  amount: 1.3  },
    { mat_id: 'mat_alcohol',    amount: 85   },
    { mat_id: 'mat_bottle_100', amount: 1    },
    { mat_id: 'mat_tape',       amount: 14   },
  ],
};

// Migrate old flat-key format (bergamot_ml, bergamot_cost...) into new structure
function migrateOldCosts(old) {
  const def = DEFAULT_COSTING;
  const matMap = {
    mat_bergamot:    [old.bergamot_ml,    old.bergamot_cost],
    mat_lavender:    [old.lavender_ml,    old.lavender_cost],
    mat_sandalwood:  [old.sandalwood_ml,  old.sandalwood_cost],
    mat_cedarwood:   [old.cedarwood_ml,   old.cedarwood_cost],
    mat_alcohol:     [old.alcohol_ml,     old.alcohol_cost],
    mat_dpg:         [old.dpg_ml,         old.dpg_cost],
    mat_soy_wax:     [old.soy_wax_g,      old.soy_wax_cost],
    mat_wicks:       [old.wicks_qty,      old.wicks_cost],
    mat_holders:     [old.holders_qty,    old.holders_cost],
    mat_bottle_10ml: [old.spray_10ml_qty, old.spray_10ml_cost],
    mat_bottle_100:  [old.spray_100ml_qty,old.spray_100ml_cost],
    mat_tape: [
      old.label_tape_rolls && old.label_tape_m_per_roll ? old.label_tape_rolls * old.label_tape_m_per_roll * 100 : null,
      old.label_tape_cost,
    ],
  };
  const bulkMap = {
    item_giftbox: [old.gift_box_qty,       old.gift_box_cost,     1],
    item_tissue:  [old.tissue_paper_boxes, old.tissue_paper_cost, 1],
    item_bubble:  [old.bubble_wrap_boxes,  old.bubble_wrap_cost,  1],
    item_labels:  [old.labels_qty,         old.labels_cost,       old.labels_per_box || 2],
  };
  return {
    ...def,
    materials: def.materials.map(m => {
      const [ps, c] = matMap[m.id] || [];
      return { ...m, ...(ps ? { pack_size: ps } : {}), ...(c ? { cost: c } : {}) };
    }),
    giftItems: def.giftItems.map(i => {
      if (!bulkMap[i.id]) return i;
      const [pq, pc, apg] = bulkMap[i.id];
      return { ...i, ...(pq ? { pack_qty: pq } : {}), ...(pc ? { pack_cost: pc } : {}), ...(apg ? { amount_per_gift: apg } : {}) };
    }),
  };
}

function matCostPer(mat) {
  if (!mat || !mat.pack_size) return 0;
  return mat.cost / mat.pack_size;
}

function itemCost(item, mMap) {
  if (!item) return 0;
  if (item.type === 'bulk') {
    return item.pack_qty > 0 ? (item.amount_per_gift || 1) * (item.pack_cost || 0) / item.pack_qty : 0;
  }
  return (item.recipe || []).reduce((s, r) => s + (mMap[r.mat_id] ? matCostPer(mMap[r.mat_id]) * r.amount : 0), 0);
}

function RecipeEditor({ recipe, materials, mMap, onPatch, onDelete, onAdd, C }) {
  const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const INPUT = { fontFamily: FONT, fontSize: 12, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 4, background: C.card, color: C.text, outline: 'none', boxSizing: 'border-box' };
  const BTN   = { fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer' };
  return (
    <div>
      {(recipe || []).map((row, idx) => {
        const mat = mMap[row.mat_id];
        const rowCost = mat ? matCostPer(mat) * row.amount : 0;
        return (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <select value={row.mat_id} onChange={e => onPatch(idx, { mat_id: e.target.value })} style={{ ...INPUT, flex: 2 }}>
              {(materials || []).map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
            </select>
            <input type="number" min="0" step="any" value={row.amount} onChange={e => onPatch(idx, { amount: parseFloat(e.target.value) || 0 })} style={{ ...INPUT, width: 70 }} />
            <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted, minWidth: 30 }}>{mat?.unit || ''}</span>
            <span style={{ fontFamily: FONT, fontSize: 12, color: C.accent, fontWeight: 600, minWidth: 56, textAlign: 'right' }}>£{rowCost.toFixed(2)}</span>
            <button onClick={() => onDelete(idx)} style={{ ...BTN, padding: '4px 8px', color: '#dc2626', borderColor: 'transparent', background: 'none' }}>✕</button>
          </div>
        );
      })}
      <button onClick={onAdd} style={{ ...BTN, marginTop: 4 }}>+ Add Ingredient</button>
    </div>
  );
}

function giftSetTotal(costing) {
  if (!costing) return 0;
  const mMap = Object.fromEntries((costing.materials || []).map(m => [m.id, m]));
  return (costing.giftItems || []).filter(i => i.active).reduce((s, i) => s + itemCost(i, mMap), 0);
}

function spray100Total(costing) {
  if (!costing) return 0;
  const mMap = Object.fromEntries((costing.materials || []).map(m => [m.id, m]));
  return (costing.spray100Recipe || []).reduce((s, r) => s + (mMap[r.mat_id] ? matCostPer(mMap[r.mat_id]) * r.amount : 0), 0);
}

function weekNumber(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return Math.ceil((day + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
}

export default function SignatureTouchTab({ bookings, staff, stDistributions, C }) {
  const [subTab, setSubTab]     = useState('costing');
  const [costing, setCosting]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [savingPrice, setSavingPrice] = useState(false);
  const [savedPrice, setSavedPrice]   = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);

  // Costing UI state
  const [showMaterials, setShowMaterials] = useState(false);
  const [showSpray100,  setShowSpray100]  = useState(false);
  const [expandedId,    setExpandedId]    = useState(null);
  const [editingMatId,  setEditingMatId]  = useState(null);
  const [matForm,       setMatForm]       = useState({});
  const [addingMat,     setAddingMat]     = useState(false);
  const [newMatForm,    setNewMatForm]    = useState({ name: '', category: 'Essential Oil', pack_size: '', unit: 'ml', cost: '' });
  const [addingItem,    setAddingItem]    = useState(false);
  const [newItemForm,   setNewItemForm]   = useState({ name: '', type: 'bulk', pack_qty: '', amount_per_gift: 1, pack_cost: '' });

  // Distribution state
  const distributions = stDistributions || [];
  const [spendPeriod, setSpendPeriod] = useState('Month');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [distForm,    setDistForm]    = useState({ date: new Date().toISOString().slice(0, 10), cleaner: '', qty: 1 });
  const [distAdding,  setDistAdding]  = useState(false);

  const saveTimer = useRef(null);
  const now = new Date();
  const year = now.getFullYear(); const month = now.getMonth() + 1; const week = weekNumber(now);

  // Load costing -- tries new format first, falls back to migrating old format
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'settings', 'stCosting'));
      if (snap.exists()) {
        setCosting(snap.data());
      } else {
        const oldSnap = await getDoc(doc(db, 'settings', 'signatureTouchCosts'));
        const initial = oldSnap.exists() ? migrateOldCosts(oldSnap.data()) : DEFAULT_COSTING;
        setCosting(initial);
        await setDoc(doc(db, 'settings', 'stCosting'), initial);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'stPriceHistory'), orderBy('effectiveFrom', 'asc'));
    return onSnapshot(q, snap => setPriceHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // Debounced save to Firestore -- local state updates immediately
  const applyCosting = (updated) => {
    setCosting(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setDoc(doc(db, 'settings', 'stCosting'), updated), 600);
  };

  const mMap = useMemo(() => Object.fromEntries((costing?.materials || []).map(m => [m.id, m])), [costing]);
  const gsTotal  = useMemo(() => costing ? giftSetTotal(costing)  : 0, [costing]);
  const s100Total = useMemo(() => costing ? spray100Total(costing) : 0, [costing]);

  const giftSetCostForDate = (dateStr) => {
    let cost = gsTotal;
    for (const p of priceHistory) {
      if (p.effectiveFrom <= dateStr) cost = p.giftSetCost;
      else break;
    }
    return cost;
  };

  const handleSavePrice = async () => {
    setSavingPrice(true);
    await addDoc(collection(db, 'stPriceHistory'), {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      giftSetCost:   gsTotal,
      spray100Cost:  s100Total,
      savedAt:       serverTimestamp(),
    });
    setSavingPrice(false); setSavedPrice(true);
    setTimeout(() => setSavedPrice(false), 2000);
  };

  const handleAddDist = async () => {
    if (!distForm.cleaner || !distForm.qty) return;
    setDistAdding(true);
    try {
      await addDoc(collection(db, 'stDistributions'), {
        date:    distForm.date,
        cleaner: distForm.cleaner,
        qty:     parseInt(distForm.qty) || 1,
        cost:    (parseInt(distForm.qty) || 1) * s100Total,
        createdAt: new Date(),
      });
      setDistForm({ date: new Date().toISOString().slice(0, 10), cleaner: '', qty: 1 });
    } catch (e) { console.error(e); }
    finally { setDistAdding(false); }
  };

  // --- Gift item helpers ---
  const patchItem = (id, patch) => applyCosting({
    ...costing,
    giftItems: costing.giftItems.map(i => i.id === id ? { ...i, ...patch } : i),
  });
  const patchRecipeRow = (itemId, idx, patch) => applyCosting({
    ...costing,
    giftItems: costing.giftItems.map(i => {
      if (i.id !== itemId) return i;
      const recipe = i.recipe.map((r, j) => j === idx ? { ...r, ...patch } : r);
      return { ...i, recipe };
    }),
  });
  const deleteRecipeRow = (itemId, idx) => applyCosting({
    ...costing,
    giftItems: costing.giftItems.map(i => {
      if (i.id !== itemId) return i;
      return { ...i, recipe: i.recipe.filter((_, j) => j !== idx) };
    }),
  });
  const addRecipeRow = (itemId) => applyCosting({
    ...costing,
    giftItems: costing.giftItems.map(i => {
      if (i.id !== itemId) return i;
      const firstMat = costing.materials[0];
      return { ...i, recipe: [...(i.recipe || []), { mat_id: firstMat?.id || '', amount: 1 }] };
    }),
  });

  // --- Spray100 recipe helpers ---
  const patchSpray100Row = (idx, patch) => applyCosting({
    ...costing,
    spray100Recipe: costing.spray100Recipe.map((r, j) => j === idx ? { ...r, ...patch } : r),
  });
  const deleteSpray100Row = (idx) => applyCosting({
    ...costing, spray100Recipe: costing.spray100Recipe.filter((_, j) => j !== idx),
  });
  const addSpray100Row = () => applyCosting({
    ...costing,
    spray100Recipe: [...costing.spray100Recipe, { mat_id: costing.materials[0]?.id || '', amount: 1 }],
  });

  // All standard bookings opted into Signature Touch (any status, for customer count)
  const allOptedIn = useMemo(() => (bookings || []).filter(b =>
    !b.status?.startsWith('cancelled') &&
    (b.package === 'standard' || b.packageId === 'standard') &&
    b.signatureTouch !== false && b.cleanDate
  ), [bookings]);

  // Unique opted-in customers (all time)
  const uniqueOptedInCustomers = useMemo(() => {
    const seen = new Set();
    allOptedIn.forEach(b => { const key = b.email || b.customerEmail || b.name || b.customerName; if (key) seen.add(key); });
    return seen.size;
  }, [allOptedIn]);

  // Completed visits only (for spend tracking)
  const standardOptedIn = useMemo(() => (bookings || []).filter(b =>
    b.status === 'completed' &&
    (b.package === 'standard' || b.packageId === 'standard') &&
    b.signatureTouch !== false && b.cleanDate
  ), [bookings]);

  const usingCustomRange = dateFrom || dateTo;
  const periodBookings = useMemo(() => standardOptedIn.filter(b => {
    if (usingCustomRange) {
      if (dateFrom && b.cleanDate < dateFrom) return false;
      if (dateTo   && b.cleanDate > dateTo)   return false;
      return true;
    }
    if (spendPeriod === 'All time') return true;
    const d = new Date(b.cleanDate + 'T12:00:00');
    if (spendPeriod === 'Week')  return weekNumber(d) === week  && d.getFullYear() === year;
    if (spendPeriod === 'Month') return d.getMonth() + 1 === month && d.getFullYear() === year;
    if (spendPeriod === 'Year')  return d.getFullYear() === year;
    return true;
  }), [standardOptedIn, spendPeriod, week, month, year, dateFrom, dateTo, usingCustomRange]);

  const periodSpend = periodBookings.reduce((s, b) => s + giftSetCostForDate(b.cleanDate), 0);
  const totalDistributed = distributions.reduce((s, d) => s + (d.qty || 0), 0);
  const totalDistCost    = distributions.reduce((s, d) => s + (d.cost != null ? d.cost : (d.qty || 0) * s100Total), 0);

  // CSV
  const downloadCSV = (rows, filename) => {
    const csv = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCostingCSV = () => {
    if (!costing) return;
    const rows = [['Section', 'Item', 'Cost (£)']];
    (costing.giftItems || []).filter(i => i.active).forEach(item => {
      const cost = itemCost(item, mMap);
      if (item.type === 'recipe') {
        (item.recipe || []).forEach(r => {
          const mat = mMap[r.mat_id];
          if (mat) rows.push([item.name, `${mat.name} (${r.amount}${mat.unit})`, (matCostPer(mat) * r.amount).toFixed(2)]);
        });
      } else {
        rows.push([item.name, `${item.amount_per_gift} of pack-${item.pack_qty} @ £${item.pack_cost}`, cost.toFixed(2)]);
      }
      rows.push([item.name, 'SUBTOTAL', cost.toFixed(2)], ['', '', '']);
    });
    rows.push(['Gift Set', 'TOTAL', gsTotal.toFixed(2)], ['', '', '']);
    (costing.spray100Recipe || []).forEach(r => {
      const mat = mMap[r.mat_id];
      if (mat) rows.push(['100ml Spray', `${mat.name} (${r.amount}${mat.unit})`, (matCostPer(mat) * r.amount).toFixed(2)]);
    });
    rows.push(['100ml Spray', 'TOTAL', s100Total.toFixed(2)]);
    downloadCSV(rows, 'signature-touch-costing.csv');
  };

  const downloadGiftSetCSV = () => {
    const headers = ['Clean Date', 'Customer', 'Package', 'Gift Set Cost (£)'];
    const dataRows = periodBookings.map(b => [b.cleanDate, b.name || b.customerName || '', b.package || '', giftSetCostForDate(b.cleanDate).toFixed(2)]);
    const total = periodBookings.reduce((s, b) => s + giftSetCostForDate(b.cleanDate), 0);
    const label = usingCustomRange ? `${dateFrom || 'start'}-to-${dateTo || 'end'}` : spendPeriod.toLowerCase().replace(' ', '-');
    downloadCSV([headers, ...dataRows, ['', '', 'TOTAL', total.toFixed(2)]], `gift-set-spend-${label}.csv`);
  };

  const downloadDistCSV = () => {
    const headers = ['Date', 'Cleaner', 'Qty', 'Cost Each (£)', 'Total Cost (£)'];
    const dataRows = distributions.map(d => {
      const rowCost = d.cost != null ? d.cost : (d.qty || 0) * s100Total;
      const perUnit = d.qty ? (rowCost / d.qty) : s100Total;
      return [d.date, d.cleaner, d.qty, perUnit.toFixed(2), rowCost.toFixed(2)];
    });
    downloadCSV([headers, ...dataRows, ['', '', '', 'TOTAL', totalDistCost.toFixed(2)]], 'spray-100ml-distributions.csv');
  };

  // Shared style atoms
  const INPUT = { fontFamily: FONT, fontSize: 12, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 4, background: C.card, color: C.text, outline: 'none', boxSizing: 'border-box' };
  const TH    = { fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, textAlign: 'left', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em', background: C.bg };
  const TD    = { fontFamily: FONT, fontSize: 12, color: C.text, padding: '8px 12px' };
  const BTN   = { fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer' };
  const SAVE_BTN = { ...BTN, background: C.accent, color: '#fff', border: 'none' };
  const CSV_BTN  = { ...BTN, background: '#16a34a', color: '#fff', border: 'none' };

  const SUB_TABS = [{ id: 'costing', label: 'Costing' }, { id: 'distribution', label: 'Distribution' }];

  if (loading) return <div style={{ fontFamily: FONT, color: C.muted, padding: 32 }}>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Signature Touch</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Costing, spend tracking and 100ml spray distribution.</div>
        </div>
        {subTab === 'costing' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={downloadCostingCSV} style={CSV_BTN}>Download CSV</button>
            <button onClick={handleSavePrice} disabled={savingPrice} style={{ ...SAVE_BTN, fontSize: 13, padding: '8px 20px' }}>
              {savingPrice ? 'Saving...' : savedPrice ? 'Saved!' : 'Save Prices'}
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            fontFamily: FONT, fontSize: 13, fontWeight: subTab === t.id ? 600 : 400,
            color: subTab === t.id ? C.accent : C.muted, background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px', borderBottom: subTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent', marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ COSTING ══ */}
      {subTab === 'costing' && (
        <>
          {/* Summary banner */}
          <div style={{ background: C.accent, borderRadius: 8, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Cost per Gift Set</div>
              <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: '#fff' }}>£{gsTotal.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                {(costing.giftItems || []).filter(i => i.active).map(i => i.name).join(' + ') || 'no active items'}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Cost per 100ml Spray</div>
              <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: '#fff' }}>£{s100Total.toFixed(2)}</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>given to cleaners</div>
            </div>
          </div>

          {/* Gift Set Items */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>Gift Set Items</div>
              <button onClick={() => { setAddingItem(true); setExpandedId(null); }} style={BTN}>+ Add Item</button>
            </div>

            {(costing.giftItems || []).map(item => {
              const cost = itemCost(item, mMap);
              const isExp = expandedId === item.id;
              return (
                <div key={item.id} style={{ background: C.card, border: `1px solid ${isExp ? C.accent : C.border}`, borderRadius: 8, marginBottom: 8 }}>
                  {/* Item row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                    <input type="checkbox" checked={!!item.active} onChange={() => patchItem(item.id, { active: !item.active })} style={{ cursor: 'pointer', margin: 0 }} />
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: item.active ? C.text : C.muted, flex: 1 }}>{item.name}</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: item.type === 'recipe' ? '#eff6ff' : '#f0fdf4', color: item.type === 'recipe' ? '#2563eb' : '#16a34a' }}>
                      {item.type === 'recipe' ? 'Recipe' : 'Bulk item'}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: item.active ? C.accent : C.muted }}>£{cost.toFixed(2)}</span>
                    <button onClick={() => setExpandedId(isExp ? null : item.id)} style={{ ...BTN, fontSize: 11 }}>{isExp ? '▲ Close' : '▼ Edit'}</button>
                    <button onClick={() => { applyCosting({ ...costing, giftItems: costing.giftItems.filter(i => i.id !== item.id) }); if (expandedId === item.id) setExpandedId(null); }} style={{ ...BTN, padding: '4px 8px', color: '#dc2626', borderColor: 'transparent', background: 'none' }}>✕</button>
                  </div>

                  {/* Expanded editor */}
                  {isExp && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px' }}>
                      {/* Name always editable */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Item Name</div>
                        <input value={item.name} onChange={e => patchItem(item.id, { name: e.target.value })} style={{ ...INPUT, width: 220 }} />
                      </div>

                      {item.type === 'bulk' && (
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <div>
                            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Pack size (how many you buy)</div>
                            <input type="number" min="1" value={item.pack_qty} onChange={e => patchItem(item.id, { pack_qty: parseFloat(e.target.value) || 0 })} style={{ ...INPUT, width: 90 }} />
                          </div>
                          <div>
                            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Amount per gift</div>
                            <input type="number" min="1" step="any" value={item.amount_per_gift} onChange={e => patchItem(item.id, { amount_per_gift: parseFloat(e.target.value) || 1 })} style={{ ...INPUT, width: 80 }} />
                          </div>
                          <div>
                            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Pack cost (£)</div>
                            <input type="number" min="0" step="0.01" value={item.pack_cost} onChange={e => patchItem(item.id, { pack_cost: parseFloat(e.target.value) || 0 })} style={{ ...INPUT, width: 90 }} />
                          </div>
                          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px' }}>
                            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>Cost per gift</div>
                            <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.accent }}>£{cost.toFixed(2)}</div>
                          </div>
                        </div>
                      )}

                      {item.type === 'recipe' && (
                        <RecipeEditor
                          recipe={item.recipe}
                          materials={costing.materials}
                          mMap={mMap}
                          onPatch={(idx, patch) => patchRecipeRow(item.id, idx, patch)}
                          onDelete={(idx) => deleteRecipeRow(item.id, idx)}
                          onAdd={() => addRecipeRow(item.id)}
                          C={C}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add item form */}
            {addingItem && (
              <div style={{ background: C.card, border: `1px dashed ${C.accent}`, borderRadius: 8, padding: '16px' }}>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12 }}>New Item</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Type</div>
                    <select value={newItemForm.type} onChange={e => setNewItemForm(f => ({ ...f, type: e.target.value }))} style={INPUT}>
                      <option value="bulk">Bulk item (keyring, ribbon, box...)</option>
                      <option value="recipe">Recipe (made from materials)</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Item Name</div>
                    <input placeholder="e.g. Keyring" value={newItemForm.name} onChange={e => setNewItemForm(f => ({ ...f, name: e.target.value }))} style={{ ...INPUT, width: 160 }} />
                  </div>
                  {newItemForm.type === 'bulk' && (
                    <>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Pack size</div>
                        <input type="number" min="1" placeholder="e.g. 100" value={newItemForm.pack_qty} onChange={e => setNewItemForm(f => ({ ...f, pack_qty: e.target.value }))} style={{ ...INPUT, width: 80 }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Per gift</div>
                        <input type="number" min="1" step="any" value={newItemForm.amount_per_gift} onChange={e => setNewItemForm(f => ({ ...f, amount_per_gift: e.target.value }))} style={{ ...INPUT, width: 70 }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>Pack cost (£)</div>
                        <input type="number" min="0" step="0.01" placeholder="0.00" value={newItemForm.pack_cost} onChange={e => setNewItemForm(f => ({ ...f, pack_cost: e.target.value }))} style={{ ...INPUT, width: 80 }} />
                      </div>
                    </>
                  )}
                </div>
                {newItemForm.pack_qty && newItemForm.pack_cost && newItemForm.type === 'bulk' && (
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 10 }}>
                    Cost per gift: £{((parseFloat(newItemForm.amount_per_gift) || 1) * (parseFloat(newItemForm.pack_cost) || 0) / (parseFloat(newItemForm.pack_qty) || 1)).toFixed(2)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => {
                    if (!newItemForm.name) return;
                    const id = genId();
                    const newItem = newItemForm.type === 'bulk'
                      ? { id, name: newItemForm.name, type: 'bulk', active: true, pack_qty: parseFloat(newItemForm.pack_qty) || 0, amount_per_gift: parseFloat(newItemForm.amount_per_gift) || 1, pack_cost: parseFloat(newItemForm.pack_cost) || 0 }
                      : { id, name: newItemForm.name, type: 'recipe', active: true, recipe: [] };
                    applyCosting({ ...costing, giftItems: [...costing.giftItems, newItem] });
                    setAddingItem(false);
                    setNewItemForm({ name: '', type: 'bulk', pack_qty: '', amount_per_gift: 1, pack_cost: '' });
                    if (newItemForm.type === 'recipe') setExpandedId(id);
                  }} style={{ ...SAVE_BTN, padding: '6px 16px' }}>Add</button>
                  <button onClick={() => setAddingItem(false)} style={BTN}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Materials (collapsible) */}
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setShowMaterials(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showMaterials ? 12 : 0 }}>
              <span>Raw Materials</span>
              <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted, fontWeight: 400 }}>used in recipe items</span>
              <span style={{ color: C.muted, fontSize: 11 }}>{showMaterials ? '▲' : '▼'}</span>
            </button>

            {showMaterials && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th style={TH}>Name</th><th style={TH}>Category</th><th style={TH}>Pack Size</th><th style={TH}>Unit</th><th style={TH}>Cost (£)</th><th style={TH}>Per unit</th><th style={TH}></th></tr>
                  </thead>
                  <tbody>
                    {(costing.materials || []).map(mat => {
                      const isEd = editingMatId === mat.id;
                      return (
                        <tr key={mat.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          {isEd ? (
                            <>
                              <td style={{ padding: '6px 10px' }}><input value={matForm.name} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))} style={{ ...INPUT, width: '100%' }} /></td>
                              <td style={{ padding: '6px 10px' }}>
                                <select value={matForm.category} onChange={e => setMatForm(f => ({ ...f, category: e.target.value }))} style={INPUT}>
                                  {MAT_CATS.map(c => <option key={c}>{c}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '6px 10px' }}><input type="number" min="0" value={matForm.pack_size} onChange={e => setMatForm(f => ({ ...f, pack_size: e.target.value }))} style={{ ...INPUT, width: 80 }} /></td>
                              <td style={{ padding: '6px 10px' }}>
                                <select value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))} style={INPUT}>
                                  {MAT_UNITS.map(u => <option key={u}>{u}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '6px 10px' }}><input type="number" min="0" step="0.01" value={matForm.cost} onChange={e => setMatForm(f => ({ ...f, cost: e.target.value }))} style={{ ...INPUT, width: 90 }} /></td>
                              <td style={TD}>—</td>
                              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                <button onClick={() => {
                                  applyCosting({ ...costing, materials: costing.materials.map(m => m.id !== mat.id ? m : { ...m, name: matForm.name, category: matForm.category, pack_size: parseFloat(matForm.pack_size) || 0, unit: matForm.unit, cost: parseFloat(matForm.cost) || 0 }) });
                                  setEditingMatId(null);
                                }} style={{ ...SAVE_BTN, marginRight: 4 }}>Save</button>
                                <button onClick={() => setEditingMatId(null)} style={BTN}>Cancel</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={TD}>{mat.name}</td>
                              <td style={{ ...TD, color: C.muted }}>{mat.category}</td>
                              <td style={TD}>{mat.pack_size}</td>
                              <td style={TD}>{mat.unit}</td>
                              <td style={TD}>£{mat.cost.toFixed(2)}</td>
                              <td style={{ ...TD, color: C.accent, fontWeight: 600 }}>£{matCostPer(mat).toFixed(4)}/{mat.unit}</td>
                              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                <button onClick={() => { setEditingMatId(mat.id); setMatForm({ name: mat.name, category: mat.category, pack_size: mat.pack_size, unit: mat.unit, cost: mat.cost }); }} style={{ ...BTN, marginRight: 4 }}>Edit</button>
                                <button onClick={() => applyCosting({ ...costing, materials: costing.materials.filter(m => m.id !== mat.id) })} style={{ ...BTN, color: '#dc2626' }}>✕</button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {/* Add material row */}
                    {addingMat ? (
                      <tr style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '6px 10px' }}><input placeholder="e.g. Bergamot" value={newMatForm.name} onChange={e => setNewMatForm(f => ({ ...f, name: e.target.value }))} style={{ ...INPUT, width: '100%' }} /></td>
                        <td style={{ padding: '6px 10px' }}>
                          <select value={newMatForm.category} onChange={e => setNewMatForm(f => ({ ...f, category: e.target.value }))} style={INPUT}>
                            {MAT_CATS.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 10px' }}><input type="number" min="0" placeholder="100" value={newMatForm.pack_size} onChange={e => setNewMatForm(f => ({ ...f, pack_size: e.target.value }))} style={{ ...INPUT, width: 80 }} /></td>
                        <td style={{ padding: '6px 10px' }}>
                          <select value={newMatForm.unit} onChange={e => setNewMatForm(f => ({ ...f, unit: e.target.value }))} style={INPUT}>
                            {MAT_UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 10px' }}><input type="number" min="0" step="0.01" placeholder="0.00" value={newMatForm.cost} onChange={e => setNewMatForm(f => ({ ...f, cost: e.target.value }))} style={{ ...INPUT, width: 90 }} /></td>
                        <td style={TD}>—</td>
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => {
                            if (!newMatForm.name) return;
                            applyCosting({ ...costing, materials: [...costing.materials, { id: genId(), name: newMatForm.name, category: newMatForm.category, pack_size: parseFloat(newMatForm.pack_size) || 0, unit: newMatForm.unit, cost: parseFloat(newMatForm.cost) || 0 }] });
                            setAddingMat(false);
                            setNewMatForm({ name: '', category: 'Essential Oil', pack_size: '', unit: 'ml', cost: '' });
                          }} style={{ ...SAVE_BTN, marginRight: 4 }}>Add</button>
                          <button onClick={() => setAddingMat(false)} style={BTN}>Cancel</button>
                        </td>
                      </tr>
                    ) : (
                      <tr style={{ borderTop: `1px solid ${C.border}` }}>
                        <td colSpan={7} style={{ padding: '8px 12px' }}>
                          <button onClick={() => setAddingMat(true)} style={BTN}>+ Add Material</button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 100ml Spray Recipe (collapsible) */}
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setShowSpray100(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showSpray100 ? 12 : 0 }}>
              <span>100ml Spray Recipe</span>
              <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted, fontWeight: 400 }}>given to cleaners · £{s100Total.toFixed(2)} each</span>
              <span style={{ color: C.muted, fontSize: 11 }}>{showSpray100 ? '▲' : '▼'}</span>
            </button>
            {showSpray100 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px' }}>
                <RecipeEditor
                  recipe={costing.spray100Recipe}
                  materials={costing.materials}
                  mMap={mMap}
                  onPatch={(idx, patch) => patchSpray100Row(idx, patch)}
                  onDelete={(idx) => deleteSpray100Row(idx)}
                  onAdd={addSpray100Row}
                  C={C}
                />
              </div>
            )}
          </div>

          {/* Price History */}
          {priceHistory.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>Price History</span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginLeft: 10 }}>spend figures use these rates per booking's clean date</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Effective From', 'Gift Set Cost', '100ml Spray Cost', ''].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...priceHistory].reverse().map((p, i) => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.bg }}>
                      <td style={TD}>{p.effectiveFrom}</td>
                      <td style={{ ...TD, color: C.accent, fontWeight: 600 }}>£{(p.giftSetCost || 0).toFixed(2)}</td>
                      <td style={TD}>£{(p.spray100Cost || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button onClick={() => deleteDoc(doc(db, 'stPriceHistory', p.id))} style={{ fontFamily: FONT, fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══ DISTRIBUTION ══ */}
      {subTab === 'distribution' && (
        <>
          {/* ── Gift Set Spend ── */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>Gift Set Spend</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" style={{ ...INPUT, fontSize: 11, padding: '4px 8px', borderColor: usingCustomRange ? C.accent : C.border, width: 130 }} />
                <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" style={{ ...INPUT, fontSize: 11, padding: '4px 8px', borderColor: usingCustomRange ? C.accent : C.border, width: 130 }} />
                {usingCustomRange
                  ? <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ ...BTN, borderColor: C.accent, color: C.accent }}>Clear</button>
                  : PERIODS.map(p => (
                      <button key={p} onClick={() => setSpendPeriod(p)} style={{ ...BTN, background: spendPeriod === p ? C.accent : C.card, color: spendPeriod === p ? '#fff' : C.muted, fontWeight: spendPeriod === p ? 600 : 400 }}>{p}</button>
                    ))
                }
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: periodBookings.length > 0 ? `1px solid ${C.border}` : 'none' }}>
              {[
                { label: 'Gift Sets Given', value: periodBookings.length, note: 'completed visits' },
                { label: 'Total Spend', value: `£${periodSpend.toFixed(2)}`, note: 'at historical rates', accent: true },
                { label: 'Cost / Gift', value: `£${gsTotal.toFixed(2)}`, note: 'current price' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, padding: '16px 20px', borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: s.accent ? C.accent : C.text }}>{s.value}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>{s.note}</div>
                </div>
              ))}
              {periodBookings.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px' }}>
                  <button onClick={downloadGiftSetCSV} style={CSV_BTN}>Download CSV</button>
                </div>
              )}
            </div>

            {/* Booking rows (when results exist) */}
            {periodBookings.length > 0 && (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bg, position: 'sticky', top: 0 }}>
                      {['Clean Date', 'Customer', 'Gift Set Cost'].map(h => <th key={h} style={{ ...TH, fontSize: 10 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {periodBookings.map((b, i) => (
                      <tr key={b.id || i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.bg }}>
                        <td style={{ ...TD, fontSize: 12 }}>{fmtDate(b.cleanDate)}</td>
                        <td style={{ ...TD, fontSize: 12 }}>{b.name || b.customerName || '—'}</td>
                        <td style={{ ...TD, fontSize: 12, color: C.accent, fontWeight: 600 }}>£{giftSetCostForDate(b.cleanDate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {periodBookings.length === 0 && (
              <div style={{ padding: '24px 20px', fontFamily: FONT, fontSize: 13, color: C.muted, textAlign: 'center' }}>No standard bookings in this period.</div>
            )}
          </div>

          {/* ── 100ml Spray Distribution ── */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {/* Section header + summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>100ml Spray Distribution</div>
                {totalDistributed > 0 && (
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 2 }}>
                    <span style={{ fontWeight: 600, color: C.text }}>{totalDistributed}</span> bottles &nbsp;·&nbsp; <span style={{ fontWeight: 600, color: C.accent }}>£{totalDistCost.toFixed(2)}</span> total cost
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {distributions.length > 0 && <button onClick={downloadDistCSV} style={CSV_BTN}>Download CSV</button>}
                <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>£{s100Total.toFixed(2)}/bottle today</span>
              </div>
            </div>

            {/* Add form */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 18px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
              <input type="date" value={distForm.date} onChange={e => setDistForm(f => ({ ...f, date: e.target.value }))} style={{ ...INPUT, fontSize: 12, padding: '7px 10px' }} />
              <select value={distForm.cleaner} onChange={e => setDistForm(f => ({ ...f, cleaner: e.target.value }))} style={{ ...INPUT, flex: 1, minWidth: 140, fontSize: 12, padding: '7px 10px' }}>
                <option value="">Select cleaner...</option>
                {(staff || []).filter(s => s.status === 'Active').map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                <option value="Other">Other</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Qty</span>
                <input type="number" min="1" value={distForm.qty} onChange={e => setDistForm(f => ({ ...f, qty: e.target.value }))} style={{ ...INPUT, width: 60, fontSize: 12, padding: '7px 10px' }} />
              </div>
              <button onClick={handleAddDist} disabled={distAdding || !distForm.cleaner} style={{ ...SAVE_BTN, fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap' }}>
                {distAdding ? 'Adding...' : '+ Add'}
              </button>
            </div>

            {/* Distribution log */}
            {distributions.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Date', 'Cleaner', 'Qty', 'Cost', ''].map(h => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((d, i) => (
                    <tr key={d.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.card : C.bg }}>
                      <td style={TD}>{fmtDate(d.date)}</td>
                      <td style={TD}>{d.cleaner}</td>
                      <td style={TD}>{d.qty}</td>
                      <td style={{ ...TD, color: C.accent, fontWeight: 600 }}>£{(d.cost != null ? d.cost : (d.qty || 0) * s100Total).toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button onClick={() => deleteDoc(doc(db, 'stDistributions', d.id))} style={{ fontFamily: FONT, fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '24px 20px', fontFamily: FONT, fontSize: 13, color: C.muted, textAlign: 'center' }}>No distributions recorded yet.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
