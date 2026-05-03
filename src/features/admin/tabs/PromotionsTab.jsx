import { useState, useEffect } from 'react';
import { db } from '../../../firebase/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
         query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { PACKAGES } from '../../../data/siteData';
import { clearPromotionCache } from '../../../hooks/usePromotion';

const FONT    = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const INPUT   = (C) => ({ fontFamily: FONT, fontSize: 13, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, color: C.text, outline: 'none', width: '100%', boxSizing: 'border-box' });
const LABEL_S = (C) => ({ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 5, display: 'block' });
const BTN     = (bg, color) => ({ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: bg, color });

const SEGMENT_STYLES = [
  { value: 'bold',   label: 'Bold',   preview: { fontWeight: 700, letterSpacing: '0.18em' } },
  { value: 'light',  label: 'Light',  preview: { fontWeight: 300, opacity: 0.65, letterSpacing: '0.1em' } },
  { value: 'italic', label: 'Italic', preview: { fontStyle: 'italic', fontWeight: 300 } },
  { value: 'serif',  label: 'Serif',  preview: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 } },
];

const SEGMENT_STYLE_MAP = Object.fromEntries(SEGMENT_STYLES.map(s => [s.value, s.preview]));

const PKG_OPTIONS = [
  { id: 'all', name: 'All packages' },
  ...PACKAGES.map(p => ({ id: p.id, name: p.name })),
];

const BLANK_PROMO = {
  name:       '',
  label:      '',
  discount:   { type: 'percentage', value: '' },
  appliesTo:  'first_clean',
  packages:   ['all'],
  banner:     [
    { text: '', style: 'bold' },
  ],
};

function BannerPreview({ segments }) {
  const filled = segments.filter(s => s.text.trim());
  if (!filled.length) return null;
  return (
    <div style={{ background: '#7f1d1d', borderRadius: 4, padding: '8px 16px', overflowX: 'auto', whiteSpace: 'nowrap', marginTop: 10 }}>
      <span style={{ fontFamily: FONT, fontSize: 10, color: '#fef2f2' }}>
        {filled.map((seg, i) => (
          <span key={i}>
            {i > 0 && <span style={{ color: '#fca5a5', margin: '0 10px' }}>✦</span>}
            <span style={{ ...SEGMENT_STYLE_MAP[seg.style] }}>{seg.text}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

function SegmentBuilder({ segments, onChange, C }) {
  const update = (i, field, val) => {
    const next = segments.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    onChange(next);
  };
  const remove = (i) => onChange(segments.filter((_, idx) => idx !== i));
  const add    = ()  => onChange([...segments, { text: '', style: 'bold' }]);

  return (
    <div>
      {segments.map((seg, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input
            value={seg.text}
            onChange={e => update(i, 'text', e.target.value)}
            placeholder="Segment text…"
            style={{ ...INPUT(C), flex: 1 }}
          />
          <select
            value={seg.style}
            onChange={e => update(i, 'style', e.target.value)}
            style={{ ...INPUT(C), width: 90, flexShrink: 0 }}
          >
            {SEGMENT_STYLES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => remove(i)}
            disabled={segments.length === 1}
            style={{ ...BTN('#fee2e2', '#dc2626'), padding: '8px 10px', opacity: segments.length === 1 ? 0.4 : 1 }}
          >
            ✕
          </button>
        </div>
      ))}
      <button onClick={add} style={{ ...BTN(C.bg, C.muted), border: `1px dashed ${C.border}`, fontSize: 11, marginTop: 2 }}>
        + Add segment
      </button>
      <BannerPreview segments={segments} />
    </div>
  );
}

function PromoModal({ promo, onSave, onClose, C, saving }) {
  const [form, setForm] = useState(promo || BLANK_PROMO);
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const togglePkg = (id) => {
    if (id === 'all') { set('packages', ['all']); return; }
    const without = (form.packages || []).filter(p => p !== 'all' && p !== id);
    const next = form.packages.includes(id) ? without : [...without, id];
    set('packages', next.length ? next : ['all']);
  };

  const valid = form.name.trim() && form.label.trim()
    && form.discount.value !== '' && !isNaN(parseFloat(form.discount.value))
    && parseFloat(form.discount.value) > 0
    && form.banner.some(s => s.text.trim());

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 10, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.text }}>{promo ? 'Edit Promotion' : 'New Promotion'}</span>
          <button onClick={onClose} style={{ ...BTN('transparent', C.muted), fontSize: 18, padding: '4px 8px' }}>✕</button>
        </div>

        <label style={LABEL_S(C)}>Promotion Name (internal)</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Launch Offer 2026" style={{ ...INPUT(C), marginBottom: 16 }} />

        <label style={LABEL_S(C)}>Invoice Label (shown to customers)</label>
        <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Launch offer — 50% off first clean" style={{ ...INPUT(C), marginBottom: 16 }} />

        <label style={LABEL_S(C)}>Discount</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['percentage', 'fixed'].map(type => (
            <button
              key={type}
              onClick={() => set('discount', { ...form.discount, type })}
              style={{ ...BTN(form.discount.type === type ? C.accent : C.bg, form.discount.type === type ? '#fff' : C.muted), border: `1px solid ${C.border}`, flex: 1, fontSize: 12 }}
            >
              {type === 'percentage' ? '% Percentage' : '£ Fixed amount'}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>{form.discount.type === 'percentage' ? '%' : '£'}</span>
            <input
              type="number" min="0" step="1"
              value={form.discount.value}
              onChange={e => set('discount', { ...form.discount, value: e.target.value })}
              placeholder="0"
              style={{ ...INPUT(C), width: 72 }}
            />
          </div>
        </div>

        <label style={LABEL_S(C)}>Applies To</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ id: 'first_clean', label: 'First clean only' }, { id: 'all_cleans', label: 'All cleans' }].map(opt => (
            <button
              key={opt.id}
              onClick={() => set('appliesTo', opt.id)}
              style={{ ...BTN(form.appliesTo === opt.id ? C.accent : C.bg, form.appliesTo === opt.id ? '#fff' : C.muted), border: `1px solid ${C.border}`, flex: 1, fontSize: 12 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {form.appliesTo === 'all_cleans' && (
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.warning, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '7px 10px', marginBottom: 16 }}>
            Note: recurring cleans via the scheduler use the price stored at booking time. "All cleans" applies to the booking flow but won't automatically affect future scheduler runs.
          </div>
        )}

        <label style={LABEL_S(C)}>Target Packages</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {PKG_OPTIONS.map(pkg => {
            const active = (form.packages || []).includes(pkg.id);
            return (
              <button
                key={pkg.id}
                onClick={() => togglePkg(pkg.id)}
                style={{ ...BTN(active ? C.accent : C.bg, active ? '#fff' : C.muted), border: `1px solid ${C.border}`, fontSize: 12 }}
              >
                {pkg.name}
              </button>
            );
          })}
        </div>

        <label style={LABEL_S(C)}>Hero Banner Segments</label>
        <SegmentBuilder segments={form.banner} onChange={v => set('banner', v)} C={C} />

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...BTN(C.bg, C.muted), border: `1px solid ${C.border}` }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={!valid || saving} style={{ ...BTN(C.accentDark, '#fff'), opacity: (!valid || saving) ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Save Promotion'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionsTab({ isMobile, C }) {
  const [promos,    setPromos]    = useState([]);
  const [modal,     setModal]     = useState(null); // null | { mode: 'create' } | { mode: 'edit', promo }
  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState(null); // promoId being toggled
  const [deleting,  setDeleting]  = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'promotions'), snap => {
      setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return  1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }));
    });
    return unsub;
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = {
        name:      form.name.trim(),
        label:     form.label.trim(),
        discount:  { type: form.discount.type, value: parseFloat(form.discount.value) },
        appliesTo: form.appliesTo,
        packages:  form.packages,
        banner:    form.banner.filter(s => s.text.trim()),
        active:    modal?.promo?.active ?? false,
      };
      if (modal?.mode === 'edit') {
        await updateDoc(doc(db, 'promotions', modal.promo.id), payload);
      } else {
        await addDoc(collection(db, 'promotions'), { ...payload, createdAt: serverTimestamp() });
      }
      clearPromotionCache();
      setModal(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (promo) => {
    setToggling(promo.id);
    try {
      if (promo.active) {
        await updateDoc(doc(db, 'promotions', promo.id), { active: false });
      } else {
        const batch = writeBatch(db);
        const activeSnap = await getDocs(query(collection(db, 'promotions'), where('active', '==', true)));
        activeSnap.forEach(d => batch.update(d.ref, { active: false }));
        batch.update(doc(db, 'promotions', promo.id), { active: true });
        await batch.commit();
      }
      clearPromotionCache();
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete "${promo.name}"? This cannot be undone.`)) return;
    setDeleting(promo.id);
    try {
      await deleteDoc(doc(db, 'promotions', promo.id));
      clearPromotionCache();
    } finally {
      setDeleting(null);
    }
  };

  const discountLabel = (p) =>
    p.discount?.type === 'percentage'
      ? `${p.discount.value}% off`
      : `£${p.discount.value} off`;

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Promotions</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Only one promotion can be active at a time.</div>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} style={{ ...BTN(C.accentDark, '#fff'), fontSize: 12 }}>
          + New Promotion
        </button>
      </div>

      {promos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: 13 }}>
          No promotions yet. Create one to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {promos.map(p => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${p.active ? '#86efac' : C.border}`, borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{p.label}</div>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Discount</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{discountLabel(p)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Applies to</div>
                  <div style={{ fontSize: 12, color: C.text }}>{p.appliesTo === 'first_clean' ? 'First clean' : 'All cleans'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Packages</div>
                  <div style={{ fontSize: 12, color: C.text }}>{(p.packages || []).includes('all') ? 'All' : (p.packages || []).join(', ')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleToggle(p)}
                    disabled={toggling === p.id}
                    style={{
                      ...BTN(p.active ? '#16a34a' : C.bg, p.active ? '#fff' : C.muted),
                      border: `1px solid ${p.active ? '#16a34a' : C.border}`,
                      minWidth: 72,
                      opacity: toggling === p.id ? 0.6 : 1,
                    }}
                  >
                    {toggling === p.id ? '…' : p.active ? 'Active' : 'Off'}
                  </button>
                  <button onClick={() => setModal({ mode: 'edit', promo: p })} style={{ ...BTN(C.bg, C.muted), border: `1px solid ${C.border}`, padding: '8px 12px' }}>Edit</button>
                  <button
                    onClick={() => handleDelete(p)}
                    disabled={deleting === p.id}
                    style={{ ...BTN('#fee2e2', '#dc2626'), border: '1px solid #fecaca', padding: '8px 12px', opacity: deleting === p.id ? 0.6 : 1 }}
                  >
                    {deleting === p.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PromoModal
          promo={modal.mode === 'edit' ? modal.promo : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
          C={C}
          saving={saving}
        />
      )}
    </div>
  );
}
