import { TIMES } from '../../../constants/timeOptions';

const FONT  = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const FIELD = C => ({ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' });
const SECTION = C => ({ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '20px 0 12px', color: C.muted });

const AIRBNB_ADDONS = [
  { id: 'oven',    label: 'Oven deep clean',  h: 0.5,  price: 40 },
  { id: 'fridge',  label: 'Inside fridge',    h: 0.33, price: 18 },
  { id: 'laundry', label: 'Laundry & fold',   h: 0.5,  price: 20 },
  { id: 'linen',   label: 'Linen change',     h: 0.33, price: 12 },
  { id: 'windows', label: 'Internal windows', h: 0.5,  price: 20 },
  { id: 'patio',   label: 'Balcony / patio',  h: 0.33, price: 30 },
];

const COMMERCIAL_ADDONS = [
  { id: 'windows',    label: 'Internal windows',                h: 0.5,  price: 20 },
  { id: 'patio',      label: 'Entrance / patio',                h: 0.33, price: 30 },
  { id: 'kitchen',    label: 'Kitchen / break room deep clean', h: 0.75, price: 50 },
  { id: 'fridge',     label: 'Fridge clean',                    h: 0.33, price: 18 },
  { id: 'oven',       label: 'Oven / grill deep clean',         h: 0.75, price: 40 },
  { id: 'toilets',    label: 'Toilet deep clean & descale',     h: 0.5,  price: 35 },
  { id: 'appliances', label: 'Microwave & appliances',          h: 0.25, price: 15 },
];

export default function EditContractVisitModal({ visit, data, setData, scope, setScope, saving, err, onClose, onSave, isMobile, C }) {
  if (!visit) return null;

  const addonList = visit.clientType === 'airbnb' ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;

  const toggleBtn = (val, current, set) => (label) => (
    <button
      key={String(val)}
      onClick={() => set(val)}
      style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 20px',
        background: current === val ? C.text : 'transparent',
        color: current === val ? '#fff' : C.text,
        border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer',
      }}
    >{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 480, background: C.bg, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: FONT, fontSize: 24, color: C.text }}>Edit Visit</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 24 }}>
          {visit.bizName || `${visit.firstName} ${visit.lastName}`} · {visit.cleanDate}
        </div>

        <div style={SECTION(C)}>Date & Time</div>
        <Field label="Clean Date" C={C}>
          <input type="date" value={data.cleanDate || ''} onChange={e => setData(p => ({ ...p, cleanDate: e.target.value }))} style={FIELD(C)} />
        </Field>
        <Field label="Clean Time" C={C}>
          <select value={data.cleanTime || ''} onChange={e => setData(p => ({ ...p, cleanTime: e.target.value }))} style={FIELD(C)}>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <div style={SECTION(C)}>Contact</div>
        <Field label="Contact Name" C={C}>
          <input value={data.contactName ?? ''} onChange={e => setData(p => ({ ...p, contactName: e.target.value }))} style={FIELD(C)} />
        </Field>
        <Field label="Phone" C={C}>
          <input value={data.phone ?? ''} onChange={e => setData(p => ({ ...p, phone: e.target.value }))} style={FIELD(C)} />
        </Field>

        <div style={SECTION(C)}>Add-ons</div>
        {addonList.map(a => (
          <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: C.text }}>
            <input
              type="checkbox"
              checked={(data.addons || []).some(x => x.id === a.id)}
              onChange={e => setData(p => ({
                ...p,
                addons: e.target.checked
                  ? [...(p.addons || []).filter(x => x.id !== a.id), { id: a.id, name: a.label, price: a.price }]
                  : (p.addons || []).filter(x => x.id !== a.id),
              }))}
            />
            {a.label} — £{a.price}
          </label>
        ))}

        <div style={SECTION(C)}>Access</div>
        <Field label="Keys" C={C}>
          <input value={data.keys ?? ''} onChange={e => setData(p => ({ ...p, keys: e.target.value }))} style={FIELD(C)} />
        </Field>
        <Field label="Floor / Lift" C={C}>
          <input value={data.floor ?? ''} onChange={e => setData(p => ({ ...p, floor: e.target.value }))} style={FIELD(C)} />
        </Field>
        <Field label="Parking" C={C}>
          <input value={data.parking ?? ''} onChange={e => setData(p => ({ ...p, parking: e.target.value }))} style={FIELD(C)} />
        </Field>

        <div style={SECTION(C)}>Consent</div>
        <Field label="Marketing / contact" C={C}>
          <div style={{ display: 'flex', gap: 10 }}>
            {toggleBtn(false, data.doNotContact, v => setData(p => ({ ...p, doNotContact: v })))('Can contact')}
            {toggleBtn(true,  data.doNotContact, v => setData(p => ({ ...p, doNotContact: v })))('Do not contact')}
          </div>
        </Field>

        <div style={SECTION(C)}>Notes</div>
        <textarea
          value={data.notes ?? ''}
          onChange={e => setData(p => ({ ...p, notes: e.target.value }))}
          rows={3}
          style={{ ...FIELD(C), marginBottom: 14, resize: 'vertical' }}
        />

        <div style={SECTION(C)}>Apply changes to</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {[
            { id: 'this', label: 'This visit only',              sub: 'Other visits in this contract stay the same.' },
            { id: 'all',  label: 'This and all future visits',   sub: 'Updates every visit from this date onwards.' },
          ].map(opt => (
            <div key={opt.id} onClick={() => setScope(opt.id)}
              style={{ display: 'flex', gap: 12, padding: '12px 14px', border: `1px solid ${scope === opt.id ? C.accent : C.border}`, borderRadius: 6, background: scope === opt.id ? `${C.accent}10` : C.card, cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, border: scope === opt.id ? 'none' : `1px solid ${C.border}`, background: scope === opt.id ? C.accent : 'transparent', borderRadius: '50%', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {scope === opt.id && <div style={{ width: 6, height: 6, background: C.text, borderRadius: '50%' }} />}
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{opt.label}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {err && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', flex: 1, background: C.accent, color: C.text, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, C }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C?.muted, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
