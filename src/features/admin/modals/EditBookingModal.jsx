import { PACKAGES, FREQUENCIES, ADDONS } from '../../../data/siteData';
import { TIMES } from '../../../constants/timeOptions';

const FONT   = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const FIELD  = C => ({ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' });
const LABEL  = { fontFamily: FONT, fontSize: 11, color: undefined, marginBottom: 4 };
const SECTION = { fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '20px 0 12px' };

export default function EditBookingModal({ editBooking, editData, setEditData, editScope, setEditScope, editSaving, editErr, onClose, onSave, isMobile, C }) {
  if (!editBooking) return null;

  const currentPkg = PACKAGES.find(p => p.id === editData.packageId);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 480, background: C.bg, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: FONT, fontSize: 24, color: C.text }}>Edit Booking</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 24 }}>
          {editBooking.firstName} {editBooking.lastName} · {editBooking.bookingRef}
        </div>

        {/* Date & Time */}
        <div style={{ ...SECTION, color: C.muted }}>Date & Time</div>
        <FieldRow label="Clean Date" C={C}>
          <input type="date" value={editData.cleanDate || ''} onChange={e => setEditData(p => ({ ...p, cleanDate: e.target.value }))} style={FIELD(C)} />
        </FieldRow>
        <FieldRow label="Clean Time" C={C}>
          <select value={editData.cleanTime || ''} onChange={e => setEditData(p => ({ ...p, cleanTime: e.target.value }))} style={FIELD(C)}>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FieldRow>

        {/* Customer Details */}
        <div style={{ ...SECTION, color: C.muted }}>Customer Details</div>
        {[['First Name','firstName'],['Last Name','lastName'],['Email','email'],['Phone','phone']].map(([label, key]) => (
          <FieldRow key={key} label={label} C={C}>
            <input value={editData[key] ?? ''} onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))} style={FIELD(C)} />
          </FieldRow>
        ))}

        {/* Service */}
        <div style={{ ...SECTION, color: C.muted }}>Service</div>
        <FieldRow label="Package" C={C}>
          <select value={editData.packageId || ''} onChange={e => {
            const pkg = PACKAGES.find(p => p.id === e.target.value);
            setEditData(p => ({ ...p, packageId: e.target.value, packageName: pkg?.name || '', sizeId: '', addons: [], frequency: pkg?.showFreq ? p.frequency : 'one-off' }));
          }} style={FIELD(C)}>
            {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Size" C={C}>
          <select value={editData.sizeId || ''} onChange={e => setEditData(p => ({ ...p, sizeId: e.target.value }))} style={FIELD(C)}>
            <option value="">Select size</option>
            {(currentPkg?.sizes || []).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </FieldRow>
        {currentPkg?.showFreq && (
          <FieldRow label="Frequency" C={C}>
            <select value={editData.frequency || 'one-off'} onChange={e => setEditData(p => ({ ...p, frequency: e.target.value }))} style={FIELD(C)}>
              {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </FieldRow>
        )}
        {currentPkg?.showAddons && (
          <FieldRow label="Add-ons" C={C}>
            {ADDONS.filter(a => !(a.id === 'microwave' && editData.packageId === 'standard')).map(a => {
              const isSmall = ['studio', '1bed'].includes(editData.sizeId);
              const price   = a.id === 'windows' ? (isSmall ? 35 : 55) : a.price;
              return (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: C.text }}>
                  <input type="checkbox" checked={(editData.addons||[]).some(x => x.id === a.id)}
                    onChange={e => setEditData(p => ({ ...p, addons: e.target.checked ? [...(p.addons||[]), { id: a.id, name: a.name, price }] : (p.addons||[]).filter(x => x.id !== a.id) }))} />
                  {a.name} — £{price}
                </label>
              );
            })}
          </FieldRow>
        )}

        {/* Address & Access */}
        <div style={{ ...SECTION, color: C.muted }}>Address & Access</div>
        {[['Address','addr1'],['Postcode','postcode'],['Floor / Lift','floor'],['Parking','parking'],['Keys','keys']].map(([label, key]) => (
          <FieldRow key={key} label={label} C={C}>
            <input value={editData[key] ?? ''} onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))} style={FIELD(C)} />
          </FieldRow>
        ))}

        {/* Pets & Preferences */}
        <div style={{ ...SECTION, color: C.muted }}>Pets & Preferences</div>
        <FieldRow label="Pets at property?" C={C}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{v: false, l:'No'},{v: true, l:'Yes'}].map(opt => (
              <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, hasPets: opt.v }))}
                style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 20px', background: editData.hasPets === opt.v ? C.text : 'transparent', color: editData.hasPets === opt.v ? '#fff' : C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                {opt.l}
              </button>
            ))}
          </div>
        </FieldRow>
        {editData.hasPets && (
          <FieldRow label="Pet description" C={C}>
            <input value={editData.petTypes ?? ''} onChange={e => setEditData(p => ({ ...p, petTypes: e.target.value }))} style={FIELD(C)} />
          </FieldRow>
        )}
        {editData.packageId === 'standard' && (
          <FieldRow label="Signature Touch" C={C}>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{v: true, l:'Opted in'},{v: false, l:'Opted out'}].map(opt => (
                <button key={String(opt.v)} onClick={() => setEditData(p => ({ ...p, signatureTouch: opt.v }))}
                  style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 20px', background: editData.signatureTouch === opt.v ? C.text : 'transparent', color: editData.signatureTouch === opt.v ? '#fff' : C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </FieldRow>
        )}
        {editData.packageId === 'standard' && editData.signatureTouch === false && (
          <FieldRow label="Opt-out reason" C={C}>
            <input value={editData.signatureTouchNotes ?? ''} onChange={e => setEditData(p => ({ ...p, signatureTouchNotes: e.target.value }))} style={FIELD(C)} />
          </FieldRow>
        )}

        {/* Notes */}
        <div style={{ ...SECTION, color: C.muted }}>Notes</div>
        <textarea value={editData.notes ?? ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={3}
          style={{ ...FIELD(C), marginBottom: 14, resize: 'vertical' }} />

        {/* Scope (recurring only) */}
        {editBooking.frequency && editBooking.frequency !== 'one-off' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...SECTION, color: C.muted, margin: '0 0 12px' }}>Apply changes to</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'this', label: 'This booking only',              sub: 'Other future bookings stay the same.' },
                { id: 'all',  label: 'This and all future bookings',   sub: `Updates their ${editBooking.frequency} recurring schedule.` },
              ].map(opt => (
                <div key={opt.id} onClick={() => setEditScope(opt.id)}
                  style={{ display: 'flex', gap: 12, padding: '12px 14px', border: `1px solid ${editScope === opt.id ? C.accent : C.border}`, borderRadius: 6, background: editScope === opt.id ? '#f8f9fa' : C.card, cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, border: editScope === opt.id ? 'none' : `1px solid ${C.border}`, background: editScope === opt.id ? C.accent : 'transparent', borderRadius: '50%', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {editScope === opt.id && <div style={{ width: 6, height: 6, background: C.text, borderRadius: '50%' }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{editErr}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={editSaving} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', flex: 1, background: C.accent, color: C.text, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children, C }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C?.muted, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
