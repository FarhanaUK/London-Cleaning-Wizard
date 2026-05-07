import { useState, useEffect } from 'react';
import { fmtDate } from '../utils';
import { FREQUENCIES, PACKAGES, PROPERTY_TYPES } from '../../../data/siteData';
import { TIMES } from '../../../constants/timeOptions';
import NewBookingModal from '../modals/NewBookingModal';

const RECURRING_PACKAGES = PACKAGES.filter(p => p.showFreq);

const FREQ_SAVINGS = { weekly: 30, fortnightly: 15, monthly: 7 };

const FONT  = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN   = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };

const STATUS_COLOURS = {
  pending_deposit:          { bg: '#8b2020', color: '#fff',     label: 'Pending Deposit' },
  scheduled:                { bg: '#f0fdf4', color: '#166534',  label: 'Scheduled' },
  deposit_paid:             { bg: '#fff8eb', color: '#7a5c00',  label: 'Deposit Paid' },
  fully_paid:               { bg: '#f3faf6', color: '#1a5234',  label: 'Fully Paid' },
  payment_failed:           { bg: '#fdf5f5', color: '#6b1010',  label: 'Payment Failed' },
  cancelled_full_refund:    { bg: '#f5f5f5', color: '#5a5a5a',  label: 'Cancelled — Full Refund' },
  cancelled_partial_refund: { bg: '#f5f5f5', color: '#5a5a5a',  label: 'Cancelled — Partial Refund' },
  cancelled_no_refund:      { bg: '#f5f5f5', color: '#5a5a5a',  label: 'Cancelled — No Refund' },
  cancelled_late_fee:       { bg: '#fff3e0', color: '#7c3d00',  label: 'Cancelled — Late Fee Charged' },
};

function DoNotContactToggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14, padding: '8px 14px', background: value ? '#fdf5f5' : '#f5f9f5', border: `1px solid ${value ? 'rgba(139,32,32,0.2)' : 'rgba(26,82,52,0.2)'}` }}>
      <div style={{ width: 16, height: 16, borderRadius: 3, background: value ? '#8b2020' : '#1a5234', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{value ? '✕' : '✓'}</div>
      <span style={{ fontFamily: FONT, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: value ? '#8b2020' : '#1a5234', fontWeight: 500 }}>
        {value ? 'Do Not Contact — click to allow contact' : 'Contact allowed — click to mark do not contact'}
      </span>
    </div>
  );
}

const BOOKING_API = {
  getBlockedDates: import.meta.env.VITE_CF_GET_BLOCKED_DATES,
  saveBooking:     import.meta.env.VITE_CF_SAVE_BOOKING,
};

export default function CustomersTab({ bookings, setBookings, isMobile, C }) {
  const [customerSearch,   setCustomerSearch]   = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editClient,       setEditClient]       = useState(null);
  const [editClientData,   setEditClientData]   = useState({});
  const [editClientSaving, setEditClientSaving] = useState(false);
  const [editClientErr,    setEditClientErr]    = useState('');
  const [newBookingOpen,   setNewBookingOpen]   = useState(false);
  const [convertOpen,      setConvertOpen]      = useState(false);
  const [convertFreq,      setConvertFreq]      = useState('weekly');
  const [convertDate,      setConvertDate]      = useState('');
  const [convertTime,      setConvertTime]      = useState('9:00 AM');
  const [convertPkg,       setConvertPkg]       = useState('refresh');
  const [convertSaving,    setConvertSaving]    = useState(false);
  const [convertErr,       setConvertErr]       = useState('');
  const [sigTouchOptingOut, setSigTouchOptingOut] = useState(false);
  const [sigTouchNote,      setSigTouchNote]      = useState('');

  useEffect(() => { setSigTouchOptingOut(false); setSigTouchNote(''); }, [selectedCustomer]);

  // Build customer map from bookings
  const customerMap = {};
  bookings.forEach(b => {
    const key = (b.email || '').toLowerCase().trim();
    if (!key) return;
    if (!customerMap[key]) {
      customerMap[key] = { email: key, firstName: b.firstName, lastName: b.lastName, phone: b.phone, addr1: b.addr1, postcode: b.postcode, bookings: [] };
    }
    customerMap[key].bookings.push(b);
  });

  const customers = Object.values(customerMap).map(c => {
    const active     = c.bookings.filter(b => !b.status?.startsWith('cancelled'));
    const totalSpend = active.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
    const collected  = c.bookings.reduce((s, b) => {
      if (b.status === 'fully_paid') return s + (parseFloat(b.total) || 0);
      if (['deposit_paid', 'payment_failed'].includes(b.status)) return s + (parseFloat(b.deposit) || 0);
      return s;
    }, 0);
    const sorted      = [...c.bookings].sort((a, b) => (b.cleanDate || '') > (a.cleanDate || '') ? 1 : -1);
    const lastClean   = sorted[0]?.cleanDate;
    const firstClean  = sorted[sorted.length - 1]?.cleanDate;
    const isRecurring = c.bookings.some(b => b.isAutoRecurring);
    const hasActive   = c.bookings.some(b => b.isAutoRecurring && !b.status?.startsWith('cancelled'));
    const activeBooking   = sorted.find(b => !b.status?.startsWith('cancelled')) || sorted[0];
    const doNotContact    = activeBooking?.doNotContact ?? activeBooking?.marketingOptOut ?? false;
    const latestNotes     = activeBooking?.notes || '';
    return { ...c, totalSpend, collected, lastClean, firstClean, isRecurring, hasActive, totalBookings: c.bookings.length, doNotContact, latestNotes, latestBookingId: activeBooking?.id };
  }).sort((a, b) => (b.lastClean || '') > (a.lastClean || '') ? 1 : -1);

  const filtered = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.includes(q) || (c.phone || '').includes(q) || (c.postcode || '').toLowerCase().includes(q);
  });

  const sc = selectedCustomer ? customers.find(c => c.email === selectedCustomer) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: sc && !isMobile ? '320px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

      {/* Customer list */}
      {(!sc || !isMobile) && (
        <div>
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <input
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Search by name, email, phone, postcode…"
              style={{ ...INPUT, marginBottom: 0, padding: '10px 36px 10px 14px', borderRadius: 8 }}
            />
            {customerSearch && <button onClick={() => setCustomerSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted }}>×</button>}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 10, marginTop: 8 }}>{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</div>
          {filtered.map(c => (
            <div
              key={c.email}
              onClick={() => setSelectedCustomer(c.email)}
              style={{ background: C.card, border: `1px solid ${selectedCustomer === c.email ? C.accent : C.border}`, borderLeft: `3px solid ${selectedCustomer === c.email ? C.accent : 'transparent'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{c.firstName} {c.lastName}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {c.hasActive && <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, background: '#f0fdf4', color: C.success, padding: '2px 8px', borderRadius: 20, border: `1px solid rgba(22,163,74,0.2)` }}>Recurring</div>}
                </div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 6 }}>{c.email}</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.faint }}>{c.totalBookings} booking{c.totalBookings !== 1 ? 's' : ''}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.faint }}>£{c.totalSpend.toFixed(2)} total</div>
                {c.lastClean && <div style={{ fontFamily: FONT, fontSize: 11, color: C.faint }}>Last: {fmtDate(c.lastClean)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer detail */}
      {sc && (
        <div>
          {isMobile && (
            <button onClick={() => setSelectedCustomer(null)} style={{ ...BTN, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, marginBottom: 16, fontSize: 12 }}>← Back to customers</button>
          )}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {(() => {
              const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
              const qualifyingBooking = sc.bookings
                .filter(b => b.status === 'fully_paid' && !b.isAutoRecurring && b.cleanDate >= thirtyDaysAgoStr)
                .sort((a, b) => b.cleanDate.localeCompare(a.cleanDate))[0];
              const canConvert = !sc.hasActive && qualifyingBooking;
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{sc.firstName} {sc.lastName}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, background: '#f8fafc', color: C.muted, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}` }}>Residential</div>
                      {sc.hasActive && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, background: '#f0fdf4', color: C.success, padding: '3px 10px', borderRadius: 20, border: `1px solid rgba(22,163,74,0.2)` }}>Active Recurring</div>}
                      {canConvert && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, background: '#fffbeb', color: '#92400e', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(146,64,14,0.2)' }}>Qualifies for Recurring</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setNewBookingOpen(true)}
                      style={{ ...BTN, background: '#2c2420', color: '#f5f0e8', fontSize: 12 }}
                    >
                      + New Booking
                    </button>
                    {canConvert && (
                      <button
                        onClick={() => { setConvertOpen(true); setConvertFreq('weekly'); setConvertDate(''); setConvertTime('9:00 AM'); setConvertErr(''); setConvertPkg(qualifyingBooking.package || 'refresh'); }}
                        style={{ ...BTN, background: '#16a34a', color: '#fff', fontSize: 12 }}
                      >
                        Convert to Recurring
                      </button>
                    )}
                    <button
                      onClick={() => { setEditClient(sc); setEditClientData({ firstName: sc.firstName, lastName: sc.lastName, phone: sc.phone || '', addr1: sc.addr1 || '', postcode: sc.postcode || '' }); setEditClientErr(''); }}
                      style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}
                    >
                      Edit Client
                    </button>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Bookings',    value: sc.totalBookings },
                { label: 'Total Value',        value: `£${sc.totalSpend.toFixed(2)}` },
                { label: 'Revenue Collected',  value: `£${sc.collected.toFixed(2)}` },
                { label: 'Customer Since',     value: fmtDate(sc.firstClean) },
                { label: 'Last Clean',         value: fmtDate(sc.lastClean) },
              ].map((s, i) => (
                <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, fontFamily: FONT, color: C.muted, marginBottom: 16 }}>
              {sc.phone && <div><span style={{ fontWeight: 600, color: C.text }}>Phone: </span>{sc.phone}</div>}
              {sc.addr1 && <div><span style={{ fontWeight: 600, color: C.text }}>Address: </span>{sc.addr1}{sc.postcode ? `, ${sc.postcode}` : ''}</div>}
            </div>

            <DoNotContactToggle
              value={sc.doNotContact}
              onChange={next => {
                setBookings(prev => prev.map(x => x.email === sc.email ? { ...x, doNotContact: next } : x));
                fetch(import.meta.env.VITE_CF_SET_DO_NOT_CONTACT, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: sc.email, doNotContact: next }),
                }).catch(() => {});
              }}
            />

            {(() => {
              const stdBooking = [...sc.bookings]
                .sort((a, b) => (b.cleanDate || '') > (a.cleanDate || '') ? 1 : -1)
                .find(b => !b.status?.startsWith('cancelled') && (b.package === 'standard' || b.packageId === 'standard'));
              if (!stdBooking) return null;
              const optedIn = stdBooking.signatureTouch !== false;
              const saveSigTouch = (touch, notes) => {
                fetch(import.meta.env.VITE_CF_SET_SIGNATURE_TOUCH, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: sc.email, signatureTouch: touch, signatureTouchNotes: notes }),
                }).catch(() => {});
                setBookings(all => all.map(x =>
                  x.email?.toLowerCase() === sc.email?.toLowerCase() && (x.package === 'standard' || x.packageId === 'standard')
                    ? { ...x, signatureTouch: touch, signatureTouchNotes: notes }
                    : x
                ));
              };
              return (
                <div style={{ padding: '10px 14px', background: optedIn ? '#f0fdf4' : '#fef9f0', borderRadius: 6, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: optedIn ? '#166534' : '#92400e' }}>
                        {optedIn ? '✓ Signature Touch: Opted in' : '✕ Signature Touch: Opted out'}
                      </div>
                      {!optedIn && stdBooking.signatureTouchNotes && !sigTouchOptingOut && (
                        <div style={{ fontFamily: FONT, fontSize: 11, color: '#92400e', marginTop: 2 }}>Reason: {stdBooking.signatureTouchNotes}</div>
                      )}
                    </div>
                    {!sigTouchOptingOut && (
                      <button
                        onClick={() => {
                          if (optedIn) { setSigTouchOptingOut(true); setSigTouchNote(''); }
                          else saveSigTouch(true, '');
                        }}
                        style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '6px 12px', background: optedIn ? '#dcfce7' : '#fef3c7', color: optedIn ? '#166534' : '#92400e', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
                      >
                        {optedIn ? 'Mark opted out' : 'Mark opted in'}
                      </button>
                    )}
                  </div>
                  {sigTouchOptingOut && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        autoFocus
                        value={sigTouchNote}
                        onChange={e => setSigTouchNote(e.target.value)}
                        placeholder="Reason for opting out (optional)"
                        style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { saveSigTouch(false, sigTouchNote); setSigTouchOptingOut(false); }}
                          style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '6px 14px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Confirm opt-out
                        </button>
                        <button
                          onClick={() => setSigTouchOptingOut(false)}
                          style={{ fontFamily: FONT, fontSize: 11, padding: '6px 14px', background: 'transparent', color: '#92400e', border: '1px solid #92400e', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {sc.latestNotes && (
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', fontFamily: FONT, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                <span style={{ fontWeight: 600, fontStyle: 'normal', color: C.text }}>Notes: </span>{sc.latestNotes}
              </div>
            )}
          </div>

          {/* Booking history */}
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Booking History</div>
          {[...sc.bookings].sort((a, b) => (b.cleanDate || '') > (a.cleanDate || '') ? 1 : -1).map(b => (
            <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{b.packageName} · {fmtDate(b.cleanDate)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{b.bookingRef} · {b.cleanTime}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.text }}>£{b.total}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: STATUS_COLOURS[b.status]?.bg || '#f5f5f5', color: STATUS_COLOURS[b.status]?.color || '#5a5a5a', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {STATUS_COLOURS[b.status]?.label || b.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={newBookingOpen}
        onClose={() => setNewBookingOpen(false)}
        isMobile={isMobile}
        C={C}
        api={BOOKING_API}
        initialCustomer={sc}
      />

      {/* Convert to Recurring Modal */}
      {convertOpen && sc && (() => {
        const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
        const qualifyingBooking = sc.bookings
          .filter(b => b.status === 'fully_paid' && !b.isAutoRecurring && b.cleanDate >= thirtyDaysAgoStr)
          .sort((a, b) => b.cleanDate.localeCompare(a.cleanDate))[0];
        if (!qualifyingBooking) return null;
        const saving      = FREQ_SAVINGS[convertFreq] || 0;
        const selectedPkg = RECURRING_PACKAGES.find(p => p.id === convertPkg) || RECURRING_PACKAGES[0];
        const sizeEntry   = selectedPkg?.sizes.find(s => s.id === qualifyingBooking.size);
        const propMulti   = PROPERTY_TYPES.find(t => t.id === qualifyingBooking.propertyType)?.multiplier || 1;
        const basePrice   = sizeEntry ? sizeEntry.basePrice * propMulti : (parseFloat(qualifyingBooking.total) || 0);
        const newPrice    = Math.max(0, basePrice - saving);
        const freqLabel   = FREQUENCIES.find(f => f.id === convertFreq)?.label || convertFreq;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 460, background: C.card, borderRadius: 12, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text }}>Convert to Recurring</div>
                <button onClick={() => setConvertOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 20 }}>
                {sc.firstName} {sc.lastName} · {qualifyingBooking.packageName}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>Package</div>
                <select
                  value={convertPkg}
                  onChange={e => setConvertPkg(e.target.value)}
                  style={{ ...INPUT, marginBottom: 0 }}
                >
                  {RECURRING_PACKAGES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>Frequency</div>
                <select
                  value={convertFreq}
                  onChange={e => setConvertFreq(e.target.value)}
                  style={{ ...INPUT, marginBottom: 0 }}
                >
                  {FREQUENCIES.filter(f => f.id !== 'one-off').map(f => (
                    <option key={f.id} value={f.id}>{f.label} — save £{f.saving} per clean</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>First Recurring Clean Date</div>
                <input
                  type="date"
                  value={convertDate}
                  min={new Date().toLocaleDateString('en-CA')}
                  max={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')}
                  onChange={e => setConvertDate(e.target.value)}
                  style={{ ...INPUT, marginBottom: 0 }}
                />
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>Must be within the next 2 weeks</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>Time</div>
                <select
                  value={convertTime}
                  onChange={e => setConvertTime(e.target.value)}
                  style={{ ...INPUT, marginBottom: 0 }}
                >
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 2 }}>
                  {freqLabel} price: £{newPrice.toFixed(2)} per clean
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: '#166534' }}>
                  Saving £{saving} vs one-off (£{basePrice.toFixed(2)})
                </div>
              </div>

              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
                Card on file will be charged on completion of each clean. No new deposit required.
              </div>

              {convertErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{convertErr}</p>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConvertOpen(false)} style={{ ...BTN, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
                <button
                  disabled={convertSaving}
                  onClick={async () => {
                    if (!convertDate) { setConvertErr('Please pick a date for the first recurring clean.'); return; }
                    setConvertSaving(true); setConvertErr('');
                    try {
                      const res = await fetch(import.meta.env.VITE_CF_CONVERT_TO_RECURRING, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: sc.email,
                          frequency: convertFreq,
                          cleanDate: convertDate,
                          cleanTime: convertTime,
                          lastBookingId: qualifyingBooking.id,
                          packageId: selectedPkg.id,
                          packageName: selectedPkg.name,
                          total: newPrice,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) { setConvertErr(data.error || 'Something went wrong.'); setConvertSaving(false); return; }
                      setConvertOpen(false);
                    } catch { setConvertErr('Something went wrong. Please try again.'); }
                    setConvertSaving(false);
                  }}
                  style={{ ...BTN, flex: 1, background: '#16a34a', color: '#fff' }}
                >
                  {convertSaving ? 'Converting…' : 'Convert to Recurring'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Client Modal */}
      {editClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420, background: C.card, borderRadius: 12, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text }}>Edit Client Details</div>
              <button onClick={() => setEditClient(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 24 }}>
              {editClient.email} · changes apply to all their bookings
            </div>
            {[
              { label: 'First Name', key: 'firstName' },
              { label: 'Last Name',  key: 'lastName' },
              { label: 'Phone',      key: 'phone' },
              { label: 'Address',    key: 'addr1' },
              { label: 'Postcode',   key: 'postcode' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>{f.label}</div>
                <input value={editClientData[f.key] || ''} onChange={e => setEditClientData(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            ))}
            {editClientErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{editClientErr}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setEditClient(null)} style={{ ...BTN, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
              <button
                disabled={editClientSaving}
                onClick={async () => {
                  setEditClientSaving(true); setEditClientErr('');
                  try {
                    const sorted  = [...editClient.bookings].sort((a, b) => (b.cleanDate || '') > (a.cleanDate || '') ? 1 : -1);
                    const anchor  = sorted[0];
                    const res = await fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ bookingId: anchor.id, ...editClientData, updateCustomerProfile: true, skipEmail: true }),
                    });
                    if (!res.ok) { const d = await res.json(); setEditClientErr(d.error || 'Failed to update.'); setEditClientSaving(false); return; }
                    setBookings(prev => prev.map(bk =>
                      (bk.email || '').toLowerCase() === editClient.email ? { ...bk, ...editClientData } : bk
                    ));
                    setEditClient(null); setEditClientData({});
                  } catch { setEditClientErr('Something went wrong.'); }
                  setEditClientSaving(false);
                }}
                style={{ ...BTN, flex: 1, background: C.accent, color: C.text, fontWeight: 600, borderRadius: 6 }}
              >
                {editClientSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
