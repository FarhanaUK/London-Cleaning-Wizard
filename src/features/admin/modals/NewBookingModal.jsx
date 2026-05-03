import { useState, useEffect } from 'react';
import { todayUK } from '../../../utils/time';
import { PACKAGES, FREQUENCIES, ADDONS } from '../../../data/siteData';
import { calculateTotal, DEEP_SUPPLIES_FEE } from '../../../utils/pricing';
import { TIMES } from '../../../constants/timeOptions';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const INPUT = { width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: '#fff', border: '1px solid #d4c4ae', borderRadius: 6, color: '#1a1410', outline: 'none', marginBottom: 16, boxSizing: 'border-box' };

const HOW_HEARD_OPTIONS = ['Google Search','Instagram','Facebook','TikTok','Word of Mouth','Leaflet','Nextdoor','Other'];
const BLANK_BOOKING = { firstName:'', lastName:'', email:'', phone:'', addr1:'', postcode:'', propertyType:'flat', floor:'', parking:'', keys:'', notes:'', packageId:'refresh', sizeId:'', frequency:'one-off', cleanDate:'', cleanTime:'9:00 AM', addons:[], hasPets:null, petTypes:'', signatureTouch:true, signatureTouchNotes:'', hearAbout:'', supplies:'customer' };

const isValidUKPhone    = p => /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/.test(p.trim()) || /^(\+44\s?[12]\d{2,4}|\(?0[12]\d{2,4}\)?)\s?\d{3,4}\s?\d{3,4}$/.test(p.trim());
const isValidEmail      = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const isValidUKPostcode = p => /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(p.trim());

export default function NewBookingModal({ isOpen, onClose, isMobile, C, api }) {
  const [nb,             setNb]             = useState(BLANK_BOOKING);
  const [nbSaving,       setNbSaving]       = useState(false);
  const [nbErr,          setNbErr]          = useState('');
  const [nbSubmitted,    setNbSubmitted]    = useState(false);
  const [nbTouched,      setNbTouched]      = useState({});
  const [nbBlockedDates, setNbBlockedDates] = useState([]);
  const [nbCalYear,      setNbCalYear]      = useState(() => new Date().getFullYear());
  const [nbCalMonth,     setNbCalMonth]     = useState(() => new Date().getMonth());

  useEffect(() => {
    fetch(`${api.getBlockedDates}?year=${nbCalYear}&month=${nbCalMonth + 1}`)
      .then(r => r.json()).then(data => setNbBlockedDates(data.blocked || [])).catch(() => {});
  }, [nbCalYear, nbCalMonth, api.getBlockedDates]);

  const nbPkg      = PACKAGES.find(p => p.id === nb.packageId);
  const nbRawTotal = nbPkg?.sizes.find(s => s.id === nb.sizeId)
    ? calculateTotal({ sizePrice: nbPkg.sizes.find(s => s.id === nb.sizeId).basePrice, propertyType: nb.propertyType, frequency: null, addons: nb.addons, supplies: nb.supplies, suppliesFeeOverride: nb.suppliesFee })
    : null;
  const nbLaunchMultiplier = nbPkg?.launchOffer;
  const nbTotal = nbRawTotal && nbLaunchMultiplier ? {
    ...nbRawTotal,
    originalSubtotal: nbRawTotal.subtotal,
    subtotal:         parseFloat((nbRawTotal.subtotal  * nbLaunchMultiplier).toFixed(2)),
    deposit:          parseFloat((nbRawTotal.deposit   * nbLaunchMultiplier).toFixed(2)),
    remaining:        parseFloat((nbRawTotal.remaining * nbLaunchMultiplier).toFixed(2)),
    launchDiscount:   parseFloat((nbRawTotal.subtotal  * (1 - nbLaunchMultiplier)).toFixed(2)),
  } : nbRawTotal;

  const closeNewBooking = () => { onClose(); setNb(BLANK_BOOKING); setNbErr(''); setNbSubmitted(false); setNbTouched({}); };

  const handleNewBooking = async () => {
    setNbSubmitted(true);
    if (!nb.firstName || !nb.lastName || !nb.email || !nb.phone || !nb.addr1 || !nb.postcode || !nb.sizeId || !nb.cleanDate || !nb.cleanTime || !nb.hearAbout || nb.hasPets === null) {
      setNbErr('Please fill in all required fields.'); return;
    }
    if (!isValidEmail(nb.email))         { setNbErr('Email address is not valid — e.g. name@example.com'); return; }
    if (!isValidUKPhone(nb.phone))       { setNbErr('Phone number is not a valid UK number — e.g. 07700 900123 or 020 8137 0026'); return; }
    if (!isValidUKPostcode(nb.postcode)) { setNbErr('Postcode is not valid — e.g. E1 6AN or SW1A 1AA'); return; }
    if (nbBlockedDates.includes(nb.cleanDate)) { setNbErr('This date is blocked in the calendar. Please choose a different date.'); return; }
    setNbSaving(true); setNbErr('');
    try {
      const res  = await fetch(api.saveBooking, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nb,
          package: nb.packageId, packageName: nbPkg?.name,
          size: nb.sizeId,
          frequency: nb.frequency,
          total: nbTotal?.subtotal || 0,
          deposit: nbTotal?.deposit || 0,
          remaining: nbTotal?.remaining || 0,
          ...(nbTotal?.launchDiscount ? { launchDiscount: nbTotal.launchDiscount, originalTotal: nbTotal.originalSubtotal, recurringTotal: nbTotal.originalSubtotal } : {}),
          stripeDepositIntentId: 'manual',
          stripeCustomerId: '',
          isReturning: false,
          source: nb.hearAbout,
          isPhoneBooking: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setNbErr(data.error || 'Failed to create booking.'); setNbSaving(false); return; }
      closeNewBooking();
    } catch (err) { setNbErr(`Something went wrong: ${err?.message || err}`); }
    setNbSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 540, background: '#FAF8F4', overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' }}>New Booking</div>
          <button onClick={closeNewBooking} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8b7355' }}>✕</button>
        </div>

        {/* Customer */}
        <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 12 }}>Customer Details</div>
        {[
          { label: 'First Name *', key: 'firstName', placeholder: 'Sophie' },
          { label: 'Last Name *',  key: 'lastName',  placeholder: 'Lewis' },
          { label: 'Email *',      key: 'email',    type: 'email', placeholder: 'name@example.com',
            validate: v => !v || isValidEmail(v),
            hint: 'e.g. name@example.com' },
          { label: 'Phone *',      key: 'phone', placeholder: '07700 900 123',
            validate: v => !v || isValidUKPhone(v),
            hint: 'e.g. 07700 900123 or 020 8137 0026' },
          { label: 'Address *',    key: 'addr1',    placeholder: 'Flat 3, 42 Mare Street' },
          { label: 'Postcode *',   key: 'postcode', placeholder: 'E8 1HL',
            validate: v => !v || isValidUKPostcode(v),
            hint: 'e.g. E1 6AN or SW1A 1AA' },
          { label: 'Floor / Lift', key: 'floor',   placeholder: '2nd floor, no lift' },
          { label: 'Parking',      key: 'parking', placeholder: 'Free street parking nearby' },
          { label: 'Keys',         key: 'keys',    placeholder: 'Key with concierge, smart lock code 1234' },
        ].map(f => {
          const isEmpty  = f.label.includes('*') && !nb[f.key];
          const touched  = nbTouched[f.key] || nbSubmitted;
          const invalid  = f.validate && nb[f.key] && touched && !f.validate(nb[f.key]);
          const showErr  = nbSubmitted && isEmpty;
          return (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: showErr ? C.danger : '#8b7355', marginBottom: 4 }}>{f.label}</div>
              <input
                type={f.type || 'text'}
                value={nb[f.key]}
                placeholder={f.placeholder}
                onChange={e => setNb(p => ({ ...p, [f.key]: e.target.value }))}
                onBlur={() => setNbTouched(p => ({ ...p, [f.key]: true }))}
                style={{ ...INPUT, marginBottom: 0, borderColor: (invalid || showErr) ? C.danger : undefined }}
              />
              {showErr
                ? <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>This field is required</div>
                : invalid
                  ? <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>Not valid — {f.hint}</div>
                  : f.hint && !nb[f.key] && <div style={{ fontFamily: FONT, fontSize: 11, color: '#a89070', marginTop: 4 }}>{f.hint}</div>
              }
            </div>
          );
        })}

        {/* Property type */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Property Type</div>
          <select value={nb.propertyType} onChange={e => setNb(p => ({ ...p, propertyType: e.target.value, sizeId: e.target.value === 'house' && p.sizeId === 'studio' ? '' : p.sizeId }))} style={{ ...INPUT, marginBottom: 0 }}>
            <option value="flat">Flat / Apartment / Studio</option>
            <option value="house">House (+10%)</option>
          </select>
        </div>

        {/* Package */}
        <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Service</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Package *</div>
          <select value={nb.packageId} onChange={e => {
            const pkg = PACKAGES.find(p => p.id === e.target.value);
            const isDeep = e.target.value === 'deep';
            setNb(p => ({ ...p, packageId: e.target.value, sizeId: '', addons: [], frequency: pkg?.showFreq ? p.frequency : 'one-off', supplies: isDeep ? 'cleaner' : p.supplies, suppliesFee: isDeep ? DEEP_SUPPLIES_FEE : undefined }));
          }} style={{ ...INPUT, marginBottom: 0 }}>
            {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && !nb.sizeId ? C.danger : '#8b7355', marginBottom: 4 }}>Size *</div>
          <select value={nb.sizeId} onChange={e => setNb(p => ({ ...p, sizeId: e.target.value }))} style={{ ...INPUT, marginBottom: 0, borderColor: nbSubmitted && !nb.sizeId ? C.danger : undefined }}>
            <option value="">— Select size —</option>
            {(nbPkg?.sizes || []).filter(s => !(nb.propertyType === 'house' && s.id === 'studio')).map(s => {
              const price = Math.round(s.basePrice * (nb.propertyType === 'house' ? 1.10 : 1.0));
              return <option key={s.id} value={s.id}>{s.label} — £{price}</option>;
            })}
          </select>
          {nbSubmitted && !nb.sizeId && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>This field is required</div>}
        </div>
        {nbPkg?.showFreq ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Frequency</div>
            <select value={nb.frequency} onChange={e => setNb(p => ({ ...p, frequency: e.target.value }))} style={{ ...INPUT, marginBottom: 8 }}>
              {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', padding: '10px 12px', borderRadius: 4, fontFamily: FONT, fontSize: 11, color: '#166534', lineHeight: 1.7 }}>
              <strong>Frequency discounts (from 2nd clean onwards):</strong><br />
              Weekly — save £30 per clean<br />
              Fortnightly — save £15 per clean<br />
              Monthly — save £7 per clean<br />
              <span style={{ color: C.warning }}>First clean is always charged at full price.</span>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 14, padding: '8px 12px', background: '#f5f0e8', border: '1px solid #d4c4ae', borderRadius: 6, fontFamily: FONT, fontSize: 12, color: '#8b7355' }}>
            Frequency: One-off only for this package
          </div>
        )}

        {/* Date & Time */}
        <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Date & Time</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && !nb.cleanDate ? C.danger : '#8b7355', marginBottom: 8 }}>Date *</div>
          {(() => {
            const MONTHS_CAL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const DAYS_CAL   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
            const todayStr   = todayUK();
            const firstDay   = new Date(nbCalYear, nbCalMonth, 1).getDay();
            const daysInMon  = new Date(nbCalYear, nbCalMonth + 1, 0).getDate();
            const calDays    = [];
            for (let i = 0; i < firstDay; i++) calDays.push(null);
            for (let d = 1; d <= daysInMon; d++) {
              const mm = String(nbCalMonth + 1).padStart(2, '0');
              const dd = String(d).padStart(2, '0');
              calDays.push(`${nbCalYear}-${mm}-${dd}`);
            }
            const changeMonth = (dir) => {
              let m = nbCalMonth + dir, y = nbCalYear;
              if (m < 0)  { m = 11; y--; }
              if (m > 11) { m = 0;  y++; }
              setNbCalMonth(m); setNbCalYear(y);
              fetch(`${api.getBlockedDates}?year=${y}&month=${m + 1}`)
                .then(r => r.json()).then(data => setNbBlockedDates(data.blocked || [])).catch(() => {});
            };
            return (
              <div style={{ border: '1px solid rgba(200,184,154,0.3)', background: '#fdf8f3', borderRadius: 8, padding: '12px 14px', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <button type="button" onClick={() => changeMonth(-1)} style={{ background: 'none', border: '1px solid #d4c4ae', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', color: '#8b7355', fontSize: 12 }}>←</button>
                  <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: '#1a1410' }}>{MONTHS_CAL[nbCalMonth]} {nbCalYear}</div>
                  <button type="button" onClick={() => changeMonth(1)}  style={{ background: 'none', border: '1px solid #d4c4ae', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', color: '#8b7355', fontSize: 12 }}>→</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                  {DAYS_CAL.map(d => <div key={d} style={{ textAlign: 'center', fontFamily: FONT, fontSize: 9, color: '#8b7355', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                  {calDays.map((dateStr, i) => {
                    if (!dateStr) return <div key={`e-${i}`} />;
                    const isPast    = dateStr < todayStr;
                    const isBlocked = nbBlockedDates.includes(dateStr);
                    const isOff     = isPast || isBlocked;
                    const isSel     = nb.cleanDate === dateStr;
                    return (
                      <div
                        key={dateStr}
                        onClick={() => { if (isOff) return; setNb(p => ({ ...p, cleanDate: dateStr, cleanTime: '9:00 AM' })); }}
                        style={{
                          aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontFamily: FONT, fontWeight: 300,
                          cursor: isOff ? 'not-allowed' : 'pointer',
                          background: isSel ? '#c8b89a' : isBlocked ? 'rgba(220,38,38,0.1)' : 'transparent',
                          color: isBlocked ? C.danger : isPast ? '#c4b89e' : isSel ? '#1a1410' : '#2c2420',
                          textDecoration: isBlocked ? 'line-through' : 'none',
                          border: isSel ? 'none' : '1px solid transparent',
                          borderRadius: 1,
                        }}
                        onMouseEnter={e => { if (!isOff && !isSel) e.currentTarget.style.border = '1px solid #8b7355'; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.border = '1px solid transparent'; }}
                      >
                        {parseInt(dateStr.split('-')[2])}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {nb.cleanDate && <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Selected: {nb.cleanDate.split('-').reverse().join('/')}</div>}
          {nbSubmitted && !nb.cleanDate && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 2 }}>This field is required</div>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Time *</div>
          <select value={nb.cleanTime} onChange={e => setNb(p => ({ ...p, cleanTime: e.target.value }))} style={{ ...INPUT, marginBottom: 0 }}>
            {TIMES.filter(t => {
              if (nb.cleanDate !== todayUK()) return true;
              const [time, period] = t.split(' ');
              let h = parseInt(time.split(':')[0]);
              if (period === 'PM' && h !== 12) h += 12;
              if (period === 'AM' && h === 12) h = 0;
              return h > new Date().getHours();
            }).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Add-ons */}
        {nbPkg?.showAddons && (
          <>
            <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Add-ons</div>
            {ADDONS.filter(a => !(a.id === 'microwave' && nb.packageId === 'standard')).map(a => {
              const allSizesSmall = (nbPkg?.sizes || []).every(s => ['studio', '1bed'].includes(s.id));
              const isSmall = ['studio', '1bed'].includes(nb.sizeId) || allSizesSmall;
              const price   = a.id === 'windows' ? (isSmall ? 35 : 55) : a.price;
              return (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: '#1a1410' }}>
                  <input type="checkbox" checked={nb.addons.some(x => x.id === a.id)} onChange={e => setNb(p => ({ ...p, addons: e.target.checked ? [...p.addons, { ...a, price }] : p.addons.filter(x => x.id !== a.id) }))} style={{ accentColor: '#c8b89a' }} />
                  {a.name} — £{price}
                </label>
              );
            })}
          </>
        )}

        {/* Supplies */}
        <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Cleaning Supplies</div>
        {nb.packageId === 'deep' ? (
          <div style={{ fontFamily: FONT, fontSize: 13, color: '#1a1410', marginBottom: 8 }}>
            Specialist supplies included <span style={{ color: '#8b7355', fontSize: 11, fontWeight: 300 }}>— +£{DEEP_SUPPLIES_FEE} (automatically applied)</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {[
              { id: 'customer', label: 'Customer provides supplies', note: 'No extra charge' },
              { id: 'cleaner',  label: 'Cleaner brings supplies',    note: '+£8' },
            ].map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: FONT, fontSize: 13, color: '#1a1410' }}>
                <input type="radio" name="supplies" value={opt.id} checked={nb.supplies === opt.id} onChange={() => setNb(p => ({ ...p, supplies: opt.id }))} style={{ accentColor: '#c8b89a' }} />
                {opt.label} <span style={{ color: '#8b7355', fontSize: 11, fontWeight: 300 }}>— {opt.note}</span>
              </label>
            ))}
          </div>
        )}
        <div style={{ background: '#fffbeb', border: '1px solid #d97706', borderLeft: '3px solid #d97706', borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontFamily: FONT, fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
          Remind the customer: our cleaners do not bring mops or vacuums. The customer must have a working mop and vacuum available at the property.
        </div>

        {/* Live price summary */}
        {nbTotal ? (
          <div style={{ background: '#2c2420', padding: '16px 18px', margin: '20px 0', borderRadius: 8 }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,184,154,0.5)', marginBottom: 10 }}>Running Total</div>
            {nbTotal.houseExtra > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                <span>House surcharge (+10%)</span><span>+£{nbTotal.houseExtra.toFixed(2)}</span>
              </div>
            )}
            {nbTotal.freqSave > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                <span>Frequency discount</span><span>−£{nbTotal.freqSave.toFixed(2)}</span>
              </div>
            )}
            {nbTotal.addnSum > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                <span>Add-ons</span><span>+£{nbTotal.addnSum.toFixed(2)}</span>
              </div>
            )}
            {nbTotal.suppliesFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginBottom: 3 }}>
                <span>Cleaning supplies</span><span>+£{nbTotal.suppliesFee.toFixed(2)}</span>
              </div>
            )}
            {nbTotal.launchDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: '#fbbf24', marginBottom: 3 }}>
                <span>Launch offer — 50% off first clean</span><span>−£{nbTotal.launchDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(200,184,154,0.2)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#f5f0e8' }}>
              <span style={{ fontFamily: FONT, fontSize: 12, alignSelf: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</span><span>£{nbTotal.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginTop: 4 }}>
              <span>Deposit due now (30%)</span><span>£{nbTotal.deposit.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: 'rgba(245,240,232,0.6)', marginTop: 2 }}>
              <span>Remaining after clean (70%)</span><span>£{nbTotal.remaining.toFixed(2)}</span>
            </div>
            {FREQUENCIES.find(f => f.id === nb.frequency && f.saving > 0) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(200,184,154,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: '#6fcf97' }}>
                  <span>From your 2nd clean ({FREQUENCIES.find(f => f.id === nb.frequency).label})</span>
                  <span>£{((nbTotal.originalSubtotal || nbTotal.subtotal) - FREQUENCIES.find(f => f.id === nb.frequency).saving).toFixed(2)} / visit</span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(111,207,151,0.7)', marginTop: 3 }}>
                  £{FREQUENCIES.find(f => f.id === nb.frequency).saving} {FREQUENCIES.find(f => f.id === nb.frequency).label.toLowerCase()} discount applied
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#f5f0e8', border: '1px solid #d4c4ae', borderRadius: 6, padding: '12px 14px', margin: '20px 0', fontFamily: FONT, fontSize: 12, color: '#8b7355' }}>
            Select a package and size to see the total
          </div>
        )}

        {/* Pets */}
        <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>Pets & Notes</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && nb.hasPets === null ? C.danger : '#8b7355', marginBottom: 8 }}>Any pets at the property? *</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Yes','No'].map(v => (
              <button key={v} onClick={() => setNb(p => ({ ...p, hasPets: v === 'Yes', petTypes: v === 'No' ? '' : p.petTypes }))}
                style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', flex: 1, background: (v === 'Yes' ? nb.hasPets === true : nb.hasPets === false) ? '#c8b89a' : 'transparent', color: '#1a1410', border: '1px solid #d4c4ae', cursor: 'pointer', borderRadius: 6 }}>
                {v}
              </button>
            ))}
          </div>
          {nbSubmitted && nb.hasPets === null && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 6 }}>This field is required</div>}
          {nb.hasPets && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>What type of pets?</div>
              <input value={nb.petTypes} onChange={e => setNb(p => ({ ...p, petTypes: e.target.value }))} placeholder="e.g. cats, dogs" style={{ ...INPUT, marginBottom: 0 }} />
            </div>
          )}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: '#8b7355', marginBottom: 4 }}>Notes</div>
          <textarea value={nb.notes} onChange={e => setNb(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...INPUT, marginBottom: 0, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: nbSubmitted && !nb.hearAbout ? C.danger : '#8b7355', marginBottom: 4 }}>How did they hear about us? *</div>
          <select value={nb.hearAbout} onChange={e => setNb(p => ({ ...p, hearAbout: e.target.value }))} style={{ ...INPUT, marginBottom: 0, borderColor: nbSubmitted && !nb.hearAbout ? C.danger : undefined }}>
            <option value="">— Select —</option>
            {HOW_HEARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {nbSubmitted && !nb.hearAbout && <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>This field is required</div>}
        </div>
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f5f0e8', border: '1px solid #d4c4ae', borderRadius: 6, fontFamily: FONT, fontSize: 12, color: '#8b7355' }}>
          📞 This booking will be marked as a <strong>Phone booking</strong> in all emails and records.
        </div>

        {/* Terms & Conditions */}
        <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', margin: '20px 0 12px' }}>
          Terms & Conditions — Read to the customer before proceeding
        </div>
        <div style={{ height: 200, overflowY: 'scroll', border: '1px solid #d4c4ae', borderRadius: 6, background: '#ffffff', padding: '14px 16px', marginBottom: 10 }}>
          {[
            { heading: '1. Deposit & Payment', body: 'A 30% deposit is required to secure your booking and is charged immediately upon confirmation. The remaining balance will be charged automatically once your clean has been completed and marked as done by our team. By proceeding, you authorise London Cleaning Wizard to charge the remaining balance to your saved payment method upon job completion.' },
            { heading: '2. Cancellation & Rescheduling Policy', body: 'One-off bookings / First Booking: Full refund if cancelled more than 48 hours before the scheduled clean. No refund if cancelled less than 48 hours before the clean.\n\nRegular services (weekly, fortnightly or monthly): You may cancel your recurring arrangement at any time with at least 48 hours notice before your next scheduled clean. For cancellations with less than 48 hours notice, a charge of 30% of that clean\'s price will be applied to your saved payment method, as your cleaner\'s time will have been reserved.\n\nCancelling two consecutive cleans will end your recurring arrangement and your recurring discount. A new booking will be required, subject to standard first-clean pricing.\n\nIf our cleaner arrives at the scheduled time and is refused access or the clean is declined for any reason, this will be treated as a late cancellation and the applicable charge will apply.\n\nAll cancellations must be made by phone call only on 020 8137 0026. Cancellation requests made by email, text, WhatsApp or any other method will not be accepted as valid notice and will not waive any applicable charges. We reserve the right to review pricing with a minimum of 4 weeks written notice.' },
            { heading: '3. Pet Policy', body: 'All pets must be secured and kept away from our cleaning team for the entire duration of the clean. This is for the safety of both your pet and our staff. Failure to secure pets may result in the clean being abandoned without refund of the deposit.' },
            { heading: '4. Access to Property', body: 'You agree to ensure our team has full access to the property at the agreed time. If access is not provided within 15 minutes of the scheduled start time, the clean may be abandoned and no refund will be issued.' },
            { heading: '5. Property Condition & Liability', body: 'You confirm that the property details provided are accurate. London Cleaning Wizard carries full public liability insurance. Any damage must be reported within 24 hours of the clean. We are not liable for pre-existing damage or items of exceptional value not declared prior to the clean.' },
            { heading: '6. Service Standards', body: 'If you are not satisfied with any aspect of your clean, you must notify us within 24 hours and we will arrange a complimentary re-clean of the affected areas. We do not offer refunds after a clean has been completed.' },
            { heading: '7. Cleaner Allocation', body: 'While we always strive to send the same dedicated cleaner for recurring bookings, this cannot be guaranteed. In the event that your usual cleaner is unavailable, we will contact you in advance and arrange an equally skilled replacement.' },
            { heading: '8. Privacy', body: 'Your personal data is processed in accordance with our Privacy Policy. We use your contact details to manage your booking and send confirmations only. We do not sell or share your data with third parties.' },
          ].map(({ heading, body }) => (
            <div key={heading} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#1a1410', marginBottom: 4 }}>{heading}</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: '#8b7355', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</div>
            </div>
          ))}
          <div style={{ fontFamily: FONT, fontSize: 11, color: '#a89070', fontStyle: 'italic', marginTop: 8 }}>
            London Cleaning Wizard · Registered in England & Wales
          </div>
        </div>

        <div style={{ background: '#fff0f0', border: '1px solid #cc0000', borderLeft: '4px solid #cc0000', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#cc0000', marginBottom: 4 }}>
            ⚠ Before clicking "Create Booking"
          </div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: '#cc0000', fontWeight: 600, lineHeight: 1.6 }}>
            Do <strong>not</strong> confirm the booking with the customer yet. Once created, go to the booking and use <strong>Generate Payment Link</strong> to send them the deposit link. Only confirm once payment is received.
          </div>
        </div>

        {nbErr && <p style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{nbErr}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={closeNewBooking} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', background: 'transparent', color: '#8b7355', border: '1px solid #d4c4ae', cursor: 'pointer', borderRadius: 6 }}>
            Cancel
          </button>
          <button onClick={handleNewBooking} disabled={nbSaving} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', flex: 1, background: '#c8b89a', color: '#1a1410', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
            {nbSaving ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
