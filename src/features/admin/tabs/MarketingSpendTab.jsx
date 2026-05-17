import { useState, useEffect } from 'react';
import { db } from '../../../firebase/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { getTaxYears, currentTaxYear, fmtDate } from '../utils';

const FONT  = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN   = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };
const BIZ   = '#1e40af';

const CHANNELS = [
  'Google Ads', 'Google LSA',
  'Facebook Ads', 'Instagram Ads', 'TikTok Ads', 'YouTube Ads',
  'Pinterest Ads', 'LinkedIn Ads', 'Twitter / X Ads', 'Snapchat Ads', 'Threads Ads',
  'SEO & Content', 'Email Marketing', 'Leaflets & Print',
  'Promotions & Discounts', 'Referral Programme', 'Other',
];

const CHAN_COLOURS = {
  'Google Ads':             '#4285f4',
  'Google LSA':             '#34a853',
  'Facebook Ads':           '#1877f2',
  'Instagram Ads':          '#e1306c',
  'TikTok Ads':             '#ee1d52',
  'YouTube Ads':            '#ff0000',
  'Pinterest Ads':          '#bd081c',
  'LinkedIn Ads':           '#0a66c2',
  'Twitter / X Ads':        '#1da1f2',
  'Snapchat Ads':           '#f59e0b',
  'Threads Ads':            '#6366f1',
  'SEO & Content':          '#8b5cf6',
  'Email Marketing':        '#f97316',
  'Leaflets & Print':       '#14b8a6',
  'Promotions & Discounts': '#ec4899',
  'Referral Programme':     '#16a34a',
  'Other':                  '#94a3b8',
};

export default function MarketingSpendTab({ isMobile, C }) {
  const now          = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMo       = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMoYr     = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthKey = `${lastMoYr}-${String(lastMo + 1).padStart(2, '0')}`;
  const taxYears     = getTaxYears();
  const taxYear      = currentTaxYear();
  const todayStr     = now.toISOString().split('T')[0];

  const [entries,     setEntries]     = useState([]);
  const [monthFilter, setMonthFilter] = useState(() => thisMonthKey);
  const [chanFilter,  setChanFilter]  = useState('all');
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  useEffect(() => {
    return onSnapshot(collection(db, 'marketingSpend'), snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ── Period helpers — identical pattern to ExpensesTab ──
  const inPeriod = e => {
    if (monthFilter === 'all') return true;
    if (monthFilter.startsWith('ty:')) {
      const label = monthFilter.slice(3);
      const ty    = taxYears.find(t => t.label.replace(' tax year', '') === label) || taxYear;
      return e.date >= ty.start && e.date <= ty.end;
    }
    return e.date?.startsWith(monthFilter);
  };

  let activeMonthKey, activePrevMonthKey, activeTaxYear;
  if (monthFilter.startsWith('ty:')) {
    const label        = monthFilter.slice(3);
    activeTaxYear      = taxYears.find(t => t.label.replace(' tax year', '') === label) || taxYear;
    activeMonthKey     = thisMonthKey;
    activePrevMonthKey = lastMonthKey;
  } else if (monthFilter !== 'all') {
    activeMonthKey     = monthFilter;
    const [yr, mo]     = monthFilter.split('-').map(Number);
    const prevMo       = mo === 1 ? 12 : mo - 1;
    const prevYr       = mo === 1 ? yr - 1 : yr;
    activePrevMonthKey = `${prevYr}-${String(prevMo).padStart(2, '0')}`;
    const tyY          = new Date(yr, mo - 1, 15) >= new Date(yr, 3, 6) ? yr : yr - 1;
    activeTaxYear      = { start: `${tyY}-04-06`, end: `${tyY + 1}-04-05`, label: `${tyY}/${String(tyY + 1).slice(2)}` };
  } else {
    activeMonthKey     = thisMonthKey;
    activePrevMonthKey = lastMonthKey;
    activeTaxYear      = taxYear;
  }

  const activeMonthLabel = monthFilter !== 'all' && !monthFilter.startsWith('ty:')
    ? new Date(activeMonthKey + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : 'This Month';
  const prevMonthLabel   = monthFilter !== 'all' && !monthFilter.startsWith('ty:')
    ? new Date(activePrevMonthKey + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : 'Last Month';

  const thisMonthExp   = entries.filter(e => e.date?.startsWith(activeMonthKey));
  const lastMonthExp   = entries.filter(e => e.date?.startsWith(activePrevMonthKey));
  const thisMonthTotal = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const lastMonthTotal = lastMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const taxYearExp     = entries.filter(e => e.date >= activeTaxYear.start && e.date <= activeTaxYear.end);
  const taxYearTotal   = taxYearExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const allMonths      = [...new Set(entries.map(e => e.date?.slice(0, 7)).filter(Boolean))].sort().reverse();

  const filtered = entries.filter(e => {
    if (chanFilter !== 'all' && e.channel !== chanFilter) return false;
    if (!inPeriod(e)) return false;
    if (search && !`${e.channel} ${e.notes}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalFiltered = filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const byChannel = CHANNELS.map(ch => ({
    ch,
    total: filtered.filter(e => e.channel === ch).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const maxChan = Math.max(...byChannel.map(c => c.total), 1);

  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-GB', { month: 'short' });
    const total = entries.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return { key, label, total };
  });
  const maxMonth = Math.max(...last12.map(m => m.total), 1);

  // Recurring copy (last month's recurring entries)
  const recurringPrev    = entries.filter(e => e.date?.startsWith(lastMonthKey) && e.recurring);
  const canCopyRecurring = monthFilter === thisMonthKey && entries.filter(e => e.date?.startsWith(thisMonthKey)).length === 0 && recurringPrev.length > 0;

  const exportCSV = () => {
    const rows = [['Date', 'Channel', 'Amount', 'Recurring', 'Notes']];
    filtered.forEach(e => rows.push([e.date || '', e.channel || '', parseFloat(e.amount || 0).toFixed(2), e.recurring ? 'Yes' : 'No', `"${(e.notes || '').replace(/"/g, '""')}"`]));
    rows.push(['Total', '', totalFiltered.toFixed(2), '', '']);
    const a = document.createElement('a');
    a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(r => r.join(',')).join('\n'));
    a.download = `ad-spend-${monthFilter}.csv`;
    a.click();
  };

  const save = async () => {
    const d = modal.data;
    if (!d.date || !d.amount) { setErr('Date and amount are required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        date:      d.date,
        channel:   d.channel || CHANNELS[0],
        amount:    parseFloat(d.amount),
        notes:     d.notes?.trim() || '',
        recurring: !!d.recurring,
      };
      if (modal.mode === 'add') await addDoc(collection(db, 'marketingSpend'), { ...payload, createdAt: new Date().toISOString() });
      else await updateDoc(doc(db, 'marketingSpend', d.id), payload);
      setModal(null);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this entry?')) return;
    setSaving(true);
    try { await deleteDoc(doc(db, 'marketingSpend', modal.data.id)); setModal(null); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const copyRecurring = () => {
    const firstOfMonth = `${thisMonthKey}-01`;
    for (const e of recurringPrev) {
      addDoc(collection(db, 'marketingSpend'), {
        date: firstOfMonth, channel: e.channel, amount: e.amount,
        notes: e.notes || '', recurring: true, createdAt: new Date().toISOString(),
      });
    }
  };

  const KCARD  = { background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
  const KLABEL = { fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>Ad Spend</div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ ...KCARD, background: '#f0fdf4', borderTop: '3px solid #16a34a' }}>
          <div style={{ ...KLABEL, color: '#16a34a' }}>{activeMonthLabel}</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>£{thisMonthTotal.toFixed(2)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: thisMonthTotal <= lastMonthTotal ? '#16a34a' : '#dc2626', marginTop: 3 }}>
            {lastMonthTotal > 0 ? `${thisMonthTotal <= lastMonthTotal ? '▼' : '▲'} £${Math.abs(thisMonthTotal - lastMonthTotal).toFixed(2)} vs prev` : 'First month of data'}
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
        <div style={{ ...KCARD, borderTop: '3px solid #ec4899' }}>
          <div style={KLABEL}>Year to date {now.getFullYear()}</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.text }}>
            £{entries.filter(e => e.date?.startsWith(String(now.getFullYear()))).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toFixed(2)}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{entries.filter(e => e.date?.startsWith(String(now.getFullYear()))).length} entries this year</div>
        </div>
      </div>

      {/* ── 12-month bar chart ── */}
      {entries.length > 0 && (
        <div style={{ background: C.card, borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>Spend — Last 12 Months</div>
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

      {/* ── Recurring copy banner ── */}
      {canCopyRecurring && (
        <div style={{ background: '#fff5f5', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>
            🔁 Recurring items from last month — {recurringPrev.length} item{recurringPrev.length !== 1 ? 's' : ''} available
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recurringPrev.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 600 }}>{e.channel}</span>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginLeft: 8 }}>£{parseFloat(e.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={copyRecurring} style={{ ...BTN, background: '#16a34a', color: '#fff', fontSize: 12, padding: '5px 12px', marginTop: 10 }}>✓ Copy all to this month</button>
        </div>
      )}

      {/* ── Filter toolbar ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...INPUT, marginBottom: 0, width: 130, fontSize: 13 }} />
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 'auto', fontSize: 13 }}>
          <option value="all">All time</option>
          <optgroup label="Tax Year">
            {taxYears.map(ty => { const label = ty.label.replace(' tax year', ''); return <option key={label} value={`ty:${label}`}>{label} tax year (6 Apr–5 Apr)</option>; })}
          </optgroup>
          <optgroup label="By Month">
            {!allMonths.includes(thisMonthKey) && <option value={thisMonthKey}>{new Date(thisMonthKey + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</option>}
            {allMonths.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</option>)}
            {!allMonths.includes(monthFilter) && monthFilter !== 'all' && !monthFilter.startsWith('ty:') && monthFilter !== thisMonthKey && (
              <option value={monthFilter}>{new Date(monthFilter + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</option>
            )}
          </optgroup>
        </select>
        <select value={chanFilter} onChange={e => setChanFilter(e.target.value)} style={{ ...INPUT, marginBottom: 0, width: 'auto', fontSize: 13 }}>
          <option value="all">All channels</option>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>{filtered.length} · £{totalFiltered.toFixed(2)}</span>
          {filtered.length > 0 && <button onClick={exportCSV} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>⬇ CSV</button>}
          <button
            onClick={() => setModal({ mode: 'add', data: { date: todayStr, channel: CHANNELS[0], amount: '', notes: '', recurring: false } })}
            style={{ ...BTN, background: BIZ, color: '#fff', fontSize: 13 }}
          >+ Add</button>
        </div>
      </div>

      {/* ── Entry list + side panel ── */}
      {entries.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 8, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>No ad spend logged yet. Click "+ Add" to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px', gap: 16, alignItems: 'start' }}>
          <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>No entries match filters.</div>
            ) : filtered.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHAN_COLOURS[e.channel] || '#94a3b8', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{e.channel}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>{e.date ? fmtDate(e.date) : '—'}</span>
                    <span style={{ color: CHAN_COLOURS[e.channel] || C.muted }}>{e.channel}</span>
                    {e.recurring && <span style={{ color: '#1d4ed8', fontWeight: 500 }}>recurring</span>}
                    {e.notes && <span style={{ fontStyle: 'italic' }}>{e.notes}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{parseFloat(e.amount || 0).toFixed(2)}</span>
                  <button onClick={() => setModal({ mode: 'edit', data: { ...e } })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 12 }}>✏️</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: C.card, borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 12 }}>By Channel</div>
            {byChannel.length === 0 ? (
              <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>No data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byChannel.map(c => (
                  <div key={c.ch}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{c.ch}</span>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: CHAN_COLOURS[c.ch] || C.text }}>£{c.total.toFixed(2)}</span>
                    </div>
                    <div style={{ height: 6, background: C.bg, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.total / maxChan) * 100}%`, background: CHAN_COLOURS[c.ch] || '#ec4899', borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.muted }}>Total</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>£{totalFiltered.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (() => {
        const d = modal.data;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 460, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text }}>{modal.mode === 'add' ? 'Add Ad Spend' : 'Edit Entry'}</div>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Date *</div>
                  <input type="date" value={d.date || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, date: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Channel *</div>
                  <select value={d.channel || CHANNELS[0]} onChange={e => setModal(m => ({ ...m, data: { ...m.data, channel: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                    {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Amount (£) *</div>
                  <input type="number" step="0.01" min="0" value={d.amount || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, amount: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="0.00" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: C.text }}>
                    <input type="checkbox" checked={!!d.recurring} onChange={e => setModal(m => ({ ...m, data: { ...m.data, recurring: e.target.checked } }))} />
                    Recurring monthly
                  </label>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
                  <textarea value={d.notes || ''} onChange={e => setModal(m => ({ ...m, data: { ...m.data, notes: e.target.value } }))} style={{ ...INPUT, marginBottom: 0, height: 60, resize: 'vertical' }} placeholder="Any extra details…" />
                </div>
              </div>
              {err && <div style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', marginTop: 10 }}>{err}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                {modal.mode === 'edit' ? (
                  <button disabled={saving} onClick={remove} style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModal(null)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
                  <button disabled={saving} onClick={save} style={{ ...BTN, background: C.accent, color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
