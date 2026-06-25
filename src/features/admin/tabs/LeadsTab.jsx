import { useState, useMemo, Fragment } from 'react';
import { db } from '../../../firebase/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const STATUSES = [
  { id: 'new',            label: 'To call',        color: '#1d4ed8', bg: '#eff6ff' },
  { id: 'callback',       label: 'Callback',       color: '#d97706', bg: '#fffbeb' },
  { id: 'info_sent',      label: 'Info sent',      color: '#0891b2', bg: '#ecfeff' },
  { id: 'visit_only',     label: 'Visit only',     color: '#b45309', bg: '#fffbeb' },
  { id: 'quote_sent',     label: 'Quote sent',     color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'booked',         label: 'Booked',         color: '#16a34a', bg: '#f0fdf4' },
  { id: 'not_interested', label: 'Not interested', color: '#6b7280', bg: '#f3f4f6' },
  { id: 'bad_number',     label: 'Wrong number',   color: '#9ca3af', bg: '#f3f4f6' },
];
const statusMeta = id => STATUSES.find(s => s.id === id) || STATUSES[0];

// Call outcomes logged per call (date-stamped) — these feed the weekly Outreach Tracker.
const CALL_OUTCOMES = [
  { id: 'no_answer',      label: 'No answer' },
  { id: 'answered',       label: 'Answered' },
  { id: 'interested',     label: 'Interested' },
  { id: 'quote_sent',     label: 'Quote sent' },
  { id: 'booked',         label: 'Booked' },
  { id: 'not_interested', label: 'Not interested' },
  { id: 'wrong_number',   label: 'Wrong number' },
];
const outcomeLabel = id => CALL_OUTCOMES.find(o => o.id === id)?.label || id;

// Import column mapping: tell the importer which column of the pasted sheet is which field.
const IMPORT_FIELDS = [
  { id: 'businessName', label: 'Business name' },
  { id: 'address',      label: 'Address' },
  { id: 'email',        label: 'Email' },
  { id: 'phone',        label: 'Phone number' },
  { id: 'sector',       label: 'Sector' },
  { id: 'website',      label: 'Website' },
  { id: 'skip',         label: '— Skip column —' },
];
const LEAD_FIELDS = ['businessName', 'address', 'email', 'phone', 'sector', 'website'];
const defaultImportField = i => LEAD_FIELDS[i] || 'skip';

// Auto-match a column to a field by its header text (e.g. "Business Name" -> businessName).
const guessFieldFromHeader = (header) => {
  const h = (header || '').toLowerCase();
  if (/e-?mail/.test(h))                 return 'email';
  if (/website|url|web\b|site/.test(h))  return 'website';
  if (/phone|tel|mobile/.test(h))        return 'phone';
  if (/business\s*name|company|trading/.test(h)) return 'businessName';
  if (/sector|industry|category/.test(h)) return 'sector';
  if (/address/.test(h))                 return 'address';
  return 'skip';
};

// Read-only fields shown in the expanded lead (phone is handled separately as the one editable field).
const INFO_FIELDS = [
  { key: 'businessName', label: 'Business name' },
  { key: 'address',      label: 'Address' },
  { key: 'sector',       label: 'Sector' },
  { key: 'email',        label: 'Email',   type: 'email' },
  { key: 'website',      label: 'Website', type: 'url' },
];

// Split a pasted row into columns. Spreadsheet copies are tab-separated, so use tabs when present;
// otherwise comma, with basic "quoted, value" handling so commas inside a cell don't break it.
const splitRow = (row, delim) => {
  if (delim === '\t') return row.split('\t').map(s => s.trim());
  const out = []; let cur = ''; let inQ = false;
  for (const ch of row) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
};
const rowDelim = text => (text.includes('\t') ? '\t' : ',');

// Duplicate key for a lead: phone digits if present, else business name + address (lowercased).
const leadKey = (l) => {
  const phone = (l.phone || '').replace(/\D/g, '');
  if (phone) return 'p:' + phone;
  return 'n:' + (l.businessName || '').trim().toLowerCase() + '|' + (l.address || '').trim().toLowerCase();
};

const fmtDate = d => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

export default function LeadsTab({ leads, isMobile, C }) {
  const today = todayStr();
  const [filter,      setFilter]      = useState('all');
  const [search,      setSearch]      = useState('');
  const [expanded,    setExpanded]    = useState(null);
  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState('');
  const [importMap,   setImportMap]   = useState([]);
  const [skipHeader,  setSkipHeader]  = useState(true);
  const [showMapping, setShowMapping] = useState(false);
  const [importing,   setImporting]   = useState(false);
  const [showAdd,     setShowAdd]      = useState(false);
  const [copiedId,    setCopiedId]    = useState(null);
  const [newLead,     setNewLead]     = useState({ businessName: '', address: '', email: '', phone: '', sector: '', website: '' });

  const allLeads = leads || [];

  // Callbacks due today or overdue
  const dueLeads = useMemo(() =>
    allLeads
      .filter(l => l.status === 'callback' && l.callbackDate && l.callbackDate <= today)
      .sort((a, b) => (a.callbackDate || '').localeCompare(b.callbackDate || '')),
    [allLeads, today]);

  const counts = useMemo(() => {
    // Count logged calls per day from every lead's callLog.
    const byDay = {};
    allLeads.forEach(l => (l.callLog || []).forEach(c => { if (c?.date) byDay[c.date] = (byDay[c.date] || 0) + 1; }));
    const addDays = (ds, n) => { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const ds = addDays(today, -i);
      days.push({ date: ds, label: new Date(ds + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }), count: byDay[ds] || 0 });
    }
    return {
      toCall:  allLeads.filter(l => l.status === 'new').length,
      due:     dueLeads.length,
      booked:  allLeads.filter(l => l.status === 'booked').length,
      callsToday: byDay[today] || 0,
      days,
    };
  }, [allLeads, dueLeads, today]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');  // digits only, so phone spacing doesn't matter
    return allLeads
      // Keep the lead you currently have open pinned in the list even if its status
      // no longer matches the active filter, so actioning it doesn't make the open row vanish.
      .filter(l => filter === 'all' ? true : (l.status === filter || l.id === expanded))
      .filter(l => {
        if (!q) return true;
        const textMatch  = [l.businessName, l.address, l.email, l.phone, l.sector, l.website].some(v => (v || '').toLowerCase().includes(q));
        const phoneMatch = qDigits.length >= 3 && (l.phone || '').replace(/\D/g, '').includes(qDigits);
        return textMatch || phoneMatch;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [allLeads, filter, search, expanded]);

  const setStatus = async (id, status, extra = {}) => {
    try { await updateDoc(doc(db, 'leads', id), { status, ...extra, updatedAt: new Date().toISOString() }); } catch {}
  };
  const updateField = async (id, fields) => {
    try { await updateDoc(doc(db, 'leads', id), { ...fields, updatedAt: new Date().toISOString() }); } catch {}
  };
  // Log a dated call outcome (feeds the weekly Outreach Tracker). Terminal outcomes also set status.
  const logCall = async (l, outcome) => {
    const callLog = [...(l.callLog || []), { date: today, outcome }];
    const fields = { callLog };
    const statusMap = { quote_sent: 'quote_sent', booked: 'booked', not_interested: 'not_interested', wrong_number: 'bad_number' };
    if (statusMap[outcome]) fields.status = statusMap[outcome];
    try { await updateDoc(doc(db, 'leads', l.id), { ...fields, updatedAt: new Date().toISOString() }); } catch {}
  };
  // Remove a single logged call (e.g. an accidental click) by its index in the callLog.
  const removeCall = async (l, idx) => {
    const callLog = (l.callLog || []).filter((_, i) => i !== idx);
    try { await updateDoc(doc(db, 'leads', l.id), { callLog, updatedAt: new Date().toISOString() }); } catch {}
  };
  const copyPhone = (l) => {
    if (!l.phone) return;
    navigator.clipboard?.writeText(l.phone).then(() => {
      setCopiedId(l.id);
      setTimeout(() => setCopiedId(c => (c === l.id ? null : c)), 1500);
    }).catch(() => {});
  };
  const removeLead = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try { await deleteDoc(doc(db, 'leads', id)); } catch {}
  };

  const handleImport = async () => {
    const rows = importText.split('\n').map(r => r.trim()).filter(Boolean);
    if (rows.length === 0) { setShowImport(false); return; }
    const delim = rowDelim(importText);
    const split = rows.map(r => splitRow(r, delim));
    const maxCols = split.reduce((m, p) => Math.max(m, p.length), 0);
    // Keep only full-width rows (drops a one-cell title row); optionally drop the header row.
    let data = split.filter(p => p.length === maxCols);
    const headerRow = data[0] || [];
    if (skipHeader) data = data.slice(1);
    const map = Array.from({ length: maxCols }, (_, i) => importMap[i] ?? (skipHeader && headerRow[i] ? guessFieldFromHeader(headerRow[i]) : defaultImportField(i)));
    const existing = new Set(allLeads.map(leadKey));  // skip leads we already have
    const seen = new Set();                           // and rows duplicated within this paste
    setImporting(true);
    const now = new Date().toISOString();
    try {
      for (const parts of data) {
        const lead = { businessName: '', address: '', email: '', phone: '', sector: '', website: '' };
        map.forEach((field, i) => { if (field && field !== 'skip' && parts[i]) lead[field] = parts[i]; });
        if (LEAD_FIELDS.every(k => !lead[k])) continue;
        const key = leadKey(lead);
        if (existing.has(key) || seen.has(key)) continue;
        seen.add(key);
        await addDoc(collection(db, 'leads'), {
          ...lead, status: 'new', callbackDate: '', notes: '', source: 'import',
          createdAt: now, updatedAt: now,
        });
      }
    } catch {}
    setImporting(false);
    setImportText('');
    setImportMap([]);
    setShowImport(false);
  };

  const clearAll = async () => {
    if (allLeads.length === 0) return;
    if (!window.confirm(`Delete ALL ${allLeads.length} leads? This cannot be undone. Use this to wipe a bad import before re-importing.`)) return;
    try { for (const l of allLeads) await deleteDoc(doc(db, 'leads', l.id)); } catch {}
  };

  const handleAdd = async () => {
    if (!newLead.businessName.trim() && !newLead.phone.trim()) return;
    const now = new Date().toISOString();
    try {
      await addDoc(collection(db, 'leads'), {
        businessName: newLead.businessName.trim(), address: newLead.address.trim(),
        email: newLead.email.trim(), phone: newLead.phone.trim(),
        sector: newLead.sector.trim(), website: newLead.website.trim(),
        status: 'new', callbackDate: '', notes: '', source: 'manual',
        createdAt: now, updatedAt: now,
      });
    } catch {}
    setNewLead({ businessName: '', address: '', email: '', phone: '', sector: '', website: '' });
    setShowAdd(false);
  };

  // Parse the paste, use the WIDEST row to detect columns (ignores a one-cell title row above the data).
  const importSplit  = importText.split('\n').map(x => x.trim()).filter(Boolean).map(r => splitRow(r, rowDelim(importText)));
  const importMaxCols = importSplit.reduce((m, p) => Math.max(m, p.length), 0);
  const sampleCols = importSplit.find(p => p.length === importMaxCols) || [];
  // Auto-detect each field from the header text (sampleCols is the header row when skipHeader is on).
  const effMap = sampleCols.map((_, i) => importMap[i] ?? (skipHeader && sampleCols[i] ? guessFieldFromHeader(sampleCols[i]) : defaultImportField(i)));
  const detectedLabels = LEAD_FIELDS.filter(f => effMap.includes(f)).map(f => IMPORT_FIELDS.find(x => x.id === f)?.label);
  // Count how many rows are new vs duplicates (of an existing lead or an earlier row in the paste).
  const { importCount, importDups } = (() => {
    let data = importSplit.filter(p => p.length === importMaxCols);
    if (skipHeader) data = data.slice(1);
    const existing = new Set(allLeads.map(leadKey)); const seen = new Set();
    let count = 0, dups = 0;
    for (const parts of data) {
      const lead = { businessName: '', address: '', email: '', phone: '', sector: '', website: '' };
      effMap.forEach((field, i) => { if (field && field !== 'skip' && parts[i]) lead[field] = parts[i]; });
      if (LEAD_FIELDS.every(k => !lead[k])) continue;
      const key = leadKey(lead);
      if (existing.has(key) || seen.has(key)) { dups++; continue; }
      seen.add(key); count++;
    }
    return { importCount: count, importDups: dups };
  })();

  const inputStyle = { fontFamily: FONT, fontSize: 13, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const btn = (bg, color, border) => ({ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${border || bg}`, background: bg, color });

  const LeadRow = ({ l, due }) => {
    const sm = statusMeta(l.status);
    const isOpen = expanded === l.id;
    return (
      <div style={{ background: due ? '#fffbeb' : C.card, border: `1px solid ${due ? '#fcd34d' : C.border}`, borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : l.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text }}>{l.businessName || l.phone || 'Lead'}</span>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em', background: sm.bg, color: sm.color }}>{sm.label}</span>
              {l.status === 'callback' && l.callbackDate && (
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: l.callbackDate <= today ? '#dc2626' : C.muted }}>
                  {l.callbackDate < today ? `Overdue · ${fmtDate(l.callbackDate)}` : l.callbackDate === today ? 'Call back today' : `Call back ${fmtDate(l.callbackDate)}`}
                </span>
              )}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
              {[l.sector, l.address].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {l.phone ? (
              <button onClick={(e) => { e.stopPropagation(); copyPhone(l); }} title="Click to copy number"
                style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: copiedId === l.id ? '#16a34a' : C.text }}>
                {copiedId === l.id ? '✓ Copied' : <>{l.phone}<span style={{ fontSize: 12 }}>📋</span></>}
              </button>
            ) : (
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' }}>No number</div>
            )}
            {(l.callLog || []).length > 0 && (
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>{l.callLog.length} call{l.callLog.length !== 1 ? 's' : ''} logged</div>
            )}
          </div>
        </div>

        {isOpen && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Lead details — read-only business info. Only the phone number is editable. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {INFO_FIELDS.map(f => (
                <div key={f.key} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 96, flexShrink: 0 }}>{f.label}</span>
                  {!l[f.key]
                    ? <span style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>—</span>
                    : f.type === 'email'
                      ? <a href={`mailto:${l[f.key]}`} style={{ fontFamily: FONT, fontSize: 13, color: C.accent, wordBreak: 'break-all' }}>{l[f.key]}</a>
                      : f.type === 'url'
                        ? <a href={(l[f.key].startsWith('http') ? l[f.key] : `https://${l[f.key]}`)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontSize: 13, color: C.accent, wordBreak: 'break-all' }}>{l[f.key]}</a>
                        : <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: f.key === 'businessName' ? 600 : 400 }}>{l[f.key]}</span>}
                </div>
              ))}
              {/* Phone — the only editable field, with a one-click copy */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 96, flexShrink: 0 }}>Phone</span>
                <input defaultValue={l.phone || ''} placeholder="Add phone number"
                  onBlur={e => { const v = e.target.value.trim(); if (v !== (l.phone || '')) updateField(l.id, { phone: v }); }}
                  style={{ ...inputStyle, maxWidth: 200 }} />
                {l.phone && (
                  <button onClick={() => copyPhone(l)} title="Copy number" style={{ ...btn(copiedId === l.id ? '#16a34a' : C.bg, copiedId === l.id ? '#fff' : C.text, copiedId === l.id ? '#16a34a' : C.border), fontSize: 12 }}>
                    {copiedId === l.id ? '✓ Copied' : '📋 Copy'}
                  </button>
                )}
              </div>
            </div>

            {/* Log a call (stamped with today's date — feeds the weekly Outreach Tracker) */}
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 5 }}>Log a call (today)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CALL_OUTCOMES.map(o => (
                  <button key={o.id} onClick={() => logCall(l, o.id)} style={{ ...btn(C.bg, C.text, C.border), fontSize: 11, padding: '5px 11px' }}>{o.label}</button>
                ))}
              </div>
              {(l.callLog || []).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 4 }}>{l.callLog.length} call{l.callLog.length !== 1 ? 's' : ''} logged — tap × to remove a mistake</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {l.callLog.map((c, i) => ({ c, i })).reverse().slice(0, 6).map(({ c, i }) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT, fontSize: 11, color: C.muted }}>
                        <span>{outcomeLabel(c.outcome)} · {fmtDate(c.date)}</span>
                        <button onClick={() => removeCall(l, i)} title="Remove this logged call" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 700, lineHeight: 1, borderRadius: 4, padding: '3px 8px' }}>✕ Remove</button>
                      </div>
                    ))}
                  </div>
                  {l.callLog.length > 6 && <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginTop: 2 }}>Showing the latest 6 of {l.callLog.length}.</div>}
                </div>
              )}
            </div>

            {/* Status buttons — tap the highlighted one again to clear it back to To call */}
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5 }}>Status <span style={{ fontWeight: 400 }}>(tap the highlighted one again to undo)</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s.id} onClick={() => {
                  if (l.status === s.id) { setStatus(l.id, 'new', { callbackDate: '' }); return; }
                  setStatus(l.id, s.id, s.id === 'callback' ? {} : { callbackDate: '' });
                }}
                  style={{ ...btn(l.status === s.id ? s.color : C.bg, l.status === s.id ? '#fff' : C.text, l.status === s.id ? s.color : C.border), fontSize: 11, padding: '5px 11px' }}>
                  {s.label}
                </button>
              ))}
              </div>
            </div>
            {/* Callback date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>Call back on:</span>
              <input type="date" value={l.callbackDate || ''} min={today}
                onChange={e => updateField(l.id, { callbackDate: e.target.value, status: e.target.value ? 'callback' : l.status })}
                style={{ ...inputStyle, width: 'auto' }} />
            </div>
            {/* Notes */}
            <textarea defaultValue={l.notes || ''} placeholder="Call notes — who you spoke to, what was said..." rows={3}
              onBlur={e => { if (e.target.value !== (l.notes || '')) updateField(l.id, { notes: e.target.value }); }}
              style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{l.phone}{l.email ? ` · ${l.email}` : ''}</span>
              <button onClick={() => removeLead(l.id)} style={{ ...btn('transparent', '#dc2626', '#fca5a5'), fontSize: 11, padding: '5px 11px' }}>Delete</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text }}>Leads / Call list</h2>
          <p style={{ margin: '4px 0 0', fontFamily: FONT, fontSize: 13, color: C.muted }}>Work your cold-call list, log outcomes and set callbacks. · <strong style={{ color: C.text }}>{allLeads.length}</strong> leads total</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setShowAdd(s => !s); setShowImport(false); }} style={btn(C.card, C.text, C.border)}>+ Add lead</button>
          <button onClick={() => { setShowImport(s => !s); setShowAdd(false); }} style={btn(C.accent, '#fff', C.accent)}>Import</button>
          {allLeads.length > 0 && <button onClick={clearAll} style={btn('transparent', '#dc2626', '#fca5a5')}>Clear all</button>}
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 8 }}>
            Copy your lead sheet (including the header row) and paste it here, then press Import. It detects the business name, address, email, phone, sector and website from your column headers automatically.
          </div>
          <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportMap([]); }} rows={6}
            placeholder={"Paste your sheet here…"}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }} />

          {sampleCols.length > 0 && (
            <div style={{ marginTop: 10, fontFamily: FONT, fontSize: 12 }}>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {importCount} new lead{importCount !== 1 ? 's' : ''} ready.</span>{' '}
              {importDups > 0 && <span style={{ color: '#b45309', fontWeight: 600 }}>{importDups} duplicate{importDups !== 1 ? 's' : ''} will be skipped.</span>}{' '}
              <span style={{ color: C.muted }}>Detected: {detectedLabels.length ? detectedLabels.join(', ') : 'nothing yet — check your headers'}.</span>{' '}
              <button onClick={() => setShowMapping(s => !s)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontFamily: FONT, fontSize: 12, padding: 0, textDecoration: 'underline' }}>{showMapping ? 'Hide columns' : 'Adjust columns'}</button>
            </div>
          )}

          {showMapping && sampleCols.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sampleCols.map((sample, i) => (
                  <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', minWidth: 150 }}>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.text, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sample}>“{sample || '(empty)'}”</div>
                    <select value={effMap[i]} onChange={e => { const m = sampleCols.map((_, j) => j === i ? e.target.value : effMap[j]); setImportMap(m); }}
                      style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }}>
                      {IMPORT_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleImport} disabled={importing} style={btn(C.accent, '#fff', C.accent)}>{importing ? 'Importing…' : 'Import leads'}</button>
            <button onClick={() => { setShowImport(false); setImportText(''); setImportMap([]); setShowMapping(false); }} style={btn(C.bg, C.muted, C.border)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add panel */}
      {showAdd && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          <input placeholder="Business name" value={newLead.businessName} onChange={e => setNewLead(p => ({ ...p, businessName: e.target.value }))} style={inputStyle} />
          <input placeholder="Address" value={newLead.address} onChange={e => setNewLead(p => ({ ...p, address: e.target.value }))} style={inputStyle} />
          <input placeholder="Email" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          <input placeholder="Phone" value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
          <input placeholder="Sector" value={newLead.sector} onChange={e => setNewLead(p => ({ ...p, sector: e.target.value }))} style={inputStyle} />
          <input placeholder="Website" value={newLead.website} onChange={e => setNewLead(p => ({ ...p, website: e.target.value }))} style={inputStyle} />
          <div style={{ gridColumn: isMobile ? 'auto' : 'span 2', display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} style={btn(C.accent, '#fff', C.accent)}>Add lead</button>
            <button onClick={() => setShowAdd(false)} style={btn(C.bg, C.muted, C.border)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Calls today',   value: counts.callsToday, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'To call',       value: counts.toCall, color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Handled',       value: allLeads.length - counts.toCall, color: '#0891b2', bg: '#ecfeff' },
          { label: 'Callbacks due', value: counts.due,    color: counts.due > 0 ? '#dc2626' : C.muted, bg: counts.due > 0 ? '#fef2f2' : C.card },
          { label: 'Booked',        value: counts.booked, color: '#16a34a', bg: '#f0fdf4' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 100, background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: s.color, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Calls per day (last 7 days) */}
      <div style={{ marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px' }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10 }}>Calls logged per day (last 7 days) · {counts.days.reduce((s, d) => s + d.count, 0)} this week</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {(() => { const maxCalls = Math.max(1, ...counts.days.map(d => d.count)); return counts.days.map(d => {
            const isToday = d.date === today;
            return (
              <div key={d.date} style={{ flex: 1, minWidth: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: isToday ? C.accent : C.text }}>{d.count}</div>
                <div style={{ width: '65%', height: Math.max(3, Math.round((d.count / maxCalls) * 46)), background: isToday ? C.accent : `${C.accent}55`, borderRadius: 3 }} />
                <div style={{ fontFamily: FONT, fontSize: 9, color: isToday ? C.accent : C.muted, fontWeight: isToday ? 700 : 400 }}>{d.label}</div>
              </div>
            );
          }); })()}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: '#dc2626', marginTop: 10, lineHeight: 1.5 }}>
          ⚠ The count is not per lead. It includes calling the same lead more than once. It's here to measure how many calls you make per day against your target.
        </div>
      </div>

      {/* Callbacks due */}
      {dueLeads.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>📞 Call back now ({dueLeads.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dueLeads.map(l => <Fragment key={l.id}>{LeadRow({ l, due: true })}</Fragment>)}
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {[{ id: 'all', label: 'All' }, ...STATUSES].map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)}
            style={{ ...btn(filter === s.id ? C.text : C.bg, filter === s.id ? '#fff' : C.text, filter === s.id ? C.text : C.border), fontSize: 11, padding: '5px 11px' }}>
            {s.label}
          </button>
        ))}
        <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 140 }} />
      </div>

      {/* Lead list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', fontFamily: FONT, fontSize: 14, color: C.muted }}>
          {allLeads.length === 0 ? 'No leads yet. Click Import to paste in your call list.' : 'No leads match this filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(l => <Fragment key={l.id}>{LeadRow({ l })}</Fragment>)}
        </div>
      )}
    </div>
  );
}
