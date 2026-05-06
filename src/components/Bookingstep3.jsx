import { useState, useEffect, useCallback } from 'react';
import { validateForm, validateField } from '../utils/validation';
import { SectionSpinner } from './LoadingStates';
import { Sparkle, WandIcon } from './Icons';

const LABEL = {
  fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#5a4e44', marginBottom: 8,
  display: 'flex', alignItems: 'center', gap: 7,
};

const INPUT = (hasError) => ({
  width: '100%', background: '#fdf8f3', boxSizing: 'border-box',
  border: `1px solid ${hasError ? '#8b2020' : 'rgba(200,184,154,0.45)'}`,
  padding: '11px 14px', fontFamily: "'Jost',sans-serif", fontSize: 14,
  color: '#1a1410', outline: 'none',
});

const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', fontWeight: 500, padding: '14px 32px',
  background: '#2c2420', color: '#f5f0e8', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};

const CARD = (selected) => ({
  border: selected ? '2px solid #c8b89a' : '1px solid rgba(200,184,154,0.35)',
  background: selected ? 'rgba(200,184,154,0.22)' : '#fdf8f3',
  boxShadow: selected ? '0 2px 10px rgba(200,184,154,0.25)' : 'none',
  padding: '20px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
});

const ERR = { fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginTop: 6 };

const SECTION = {
  background: '#fdf8f3', border: '1px solid rgba(200,184,154,0.3)',
  padding: '20px 20px 4px', marginBottom: 16,
};

const SECTION_TITLE = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: '#8b7355', marginBottom: 18,
  paddingBottom: 10, borderBottom: '1px solid rgba(200,184,154,0.2)',
};

const HOW_HEARD = ['Google Search','Instagram','Facebook','TikTok','Word of Mouth','Leaflet','Nextdoor','Other'];
const PARKING   = ['Free street parking nearby','Permit zone — I will arrange','Private driveway / bay','No parking available'];

function SelectField({ label, value, options, onChange, placeholder = 'Select…', error }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> {label}</label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...INPUT(!!error), appearance: 'none', cursor: 'pointer', paddingRight: 36 }}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <span style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: '#8b7355', fontSize: 11,
        }}>▼</span>
      </div>
      {error && <p style={ERR}>{error}</p>}
    </div>
  );
}

// Module-level component — stable reference, never remounts
function Field({ name, label, type = 'text', placeholder, readOnly, value, error, onChange, onBlur }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> {label}</label>
      <input
        type={type}
        name={name}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)}
        onBlur={e => (onBlur || onChange)(name, e.target.value)}
        style={{ ...INPUT(!!error), background: readOnly ? '#faf9f7' : 'white' }}
        autoComplete={name}
      />
      {error && <p style={ERR}>{error}</p>}
    </div>
  );
}

export default function BookingStep3({ booking, onUpdate, onNext, onBack, isMobile }) {
  const [custType,      setCustType]      = useState(null);

  const [retEmail,      setRetEmail]      = useState('');
  const [retEmailErr,   setRetEmailErr]   = useState('');
  const [codeSent,      setCodeSent]      = useState(false);
  const [sendingCode,   setSendingCode]   = useState(false);
  const [code,          setCode]          = useState('');
  const [codeErr,       setCodeErr]       = useState('');
  const [verifying,     setVerifying]     = useState(false);
  const [secondsLeft,   setSecondsLeft]   = useState(600);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [lastBooking,   setLastBooking]   = useState(null);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    addr1: '', postcode: '', floor: '', parking: '', keys: '', notes: booking.notes || '', source: '',
    hasPets: null, petTypes: '',
    signatureTouch: true, signatureTouchNotes: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!codeSent || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [codeSent, secondsLeft]);

  const timeDisplay = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const updateField = useCallback((field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (field !== 'postcode') {
      const err = validateField(field, value);
      setFieldErrors(e => ({ ...e, [field]: err }));
    } else {
      setFieldErrors(e => ({ ...e, postcode: null }));
    }
    setSubmitError('');
  }, []);

  const blurField = useCallback((field, value) => {
    const err = validateField(field, value);
    setFieldErrors(e => ({ ...e, [field]: err }));
  }, []);

  const handleSendCode = async () => {
    if (!retEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retEmail)) {
      setRetEmailErr('Please enter a valid email address.'); return;
    }
    setRetEmailErr('');
    setSendingCode(true);
    try {
      const res  = await fetch(import.meta.env.VITE_CF_SEND_CODE, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: retEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setRetEmailErr(data.error); return; }
      setCodeSent(true);
      setSecondsLeft(600);
    } catch {
      setRetEmailErr('Failed to send code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(code)) { setCodeErr('Please enter the 6-digit code.'); return; }
    setCodeErr('');
    setVerifying(true);
    try {
      const res  = await fetch(import.meta.env.VITE_CF_VERIFY_CODE, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: retEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) { setCodeErr(data.error); return; }
      if (data.profile) {
        const p = data.profile;
        setForm({
          firstName: p.firstName || '', lastName: p.lastName || '',
          email: retEmail, phone: p.phone || '',
          addr1: p.addr1 || '', postcode: p.postcode || '',
          floor: p.floor || '', parking: p.parking || '',
          keys: p.keys || '', notes: booking.notes || p.notes || '', source: p.source || '',
          hasPets: p.hasPets ?? null, petTypes: p.petTypes || '',
          signatureTouch: p.signatureTouch ?? true, signatureTouchNotes: p.signatureTouchNotes || '',
        });
        setLastBooking(p.lastPackageName ? {
          service: p.lastPackageName, date: p.lastDate,
          cleaner: p.lastCleaner, pkg: p.lastPackage,
          size: p.lastSize, price: p.lastPrice,
        } : null);
      } else {
        setForm(f => ({ ...f, email: retEmail }));
      }
      onUpdate({ email: retEmail });
      setProfileLoaded(true);
    } catch {
      setCodeErr('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleNext = async () => {
    const errors = validateForm(form);
    if (!form.source) errors.source = 'Please let us know how you heard about us.';
    if (!booking.pkg?.isHourly) {
      if (form.hasPets === null) errors.hasPets = 'Please let us know whether there are pets at the property.';
      if (form.hasPets === true && !form.petTypes.trim()) errors.petTypes = 'Please describe your pets.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Please fix the errors above.');
      return;
    }
    if (booking.cleanDate) {
      const d = new Date(booking.cleanDate);
      try {
        const res  = await fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
        const data = await res.json();
        if ((data.blocked || []).includes(booking.cleanDate)) {
          setSubmitError('Sorry, the date you selected is no longer available. Please go back and choose another day.');
          return;
        }
      } catch { /* allow through on network error */ }
    }
    setSubmitError('');
    onUpdate({
      firstName: form.firstName, lastName: form.lastName,
      email: form.email, phone: form.phone,
      addr1: form.addr1, postcode: form.postcode.toUpperCase(),
      floor: form.floor, parking: form.parking,
      keys: form.keys, notes: form.notes, source: form.source,
      hasPets: form.hasPets, petTypes: form.petTypes,
      signatureTouch: form.signatureTouch, signatureTouchNotes: form.signatureTouchNotes,
      isReturning: custType === 'returning',
    });
    onNext();
  };

  const cols = isMobile ? '1fr' : '1fr 1fr';

  const formBody = (
    <div>
      {/* Personal details */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Your Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 20px' }}>
          <Field key="firstName" name="firstName" label="First Name *"    placeholder="Sophie"          value={form.firstName} error={fieldErrors.firstName} onChange={updateField} />
          <Field key="lastName"  name="lastName"  label="Last Name *"     placeholder="Lewis"           value={form.lastName}  error={fieldErrors.lastName}  onChange={updateField} />
          <Field key="email"     name="email"     label="Email Address *" placeholder="you@example.com" value={form.email}     error={fieldErrors.email}     onChange={updateField} type="email" readOnly={custType === 'returning'} />
          <Field key="phone"     name="phone"     label="Phone Number *"  placeholder="07700 000 000"   value={form.phone}     error={fieldErrors.phone}     onChange={updateField} type="tel" />
        </div>

      </div>

      {/* Property details */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Property Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 20px' }}>
          <Field key="addr1"    name="addr1"    label="Address Line 1 *"    placeholder="Flat 3, 42 Mare Street" value={form.addr1}    error={fieldErrors.addr1}    onChange={updateField} />
          <Field key="postcode" name="postcode" label="Postcode *"           placeholder="E8 1HL"                 value={form.postcode} error={fieldErrors.postcode} onChange={updateField} onBlur={blurField} />
          <Field key="floor"    name="floor"    label="Floor / Access Notes" placeholder="2nd floor, no lift"     value={form.floor}    error={fieldErrors.floor}    onChange={updateField} />
          <SelectField
            label="Parking"
            value={form.parking}
            options={PARKING}
            onChange={v => setForm(f => ({ ...f, parking: v }))}
          />
        </div>
      </div>

      {/* Pets — hidden for commercial and basic/hourly packages */}
      {!booking.pkg?.isHourly && <div style={SECTION}>
        <div style={SECTION_TITLE}>Pets at the Property</div>
        <div style={{ marginBottom: 20 }}>
          <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> Are there any pets at the property? *</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: fieldErrors.hasPets ? 6 : 0 }}>
            {[{ val: false, label: 'No' }, { val: true, label: 'Yes' }].map(opt => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => { setForm(f => ({ ...f, hasPets: opt.val, petTypes: opt.val ? f.petTypes : '' })); setFieldErrors(e => ({ ...e, hasPets: null, petTypes: null })); setSubmitError(''); }}
                style={{
                  fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500,
                  padding: '10px 28px', cursor: 'pointer', border: 'none',
                  background: form.hasPets === opt.val ? '#2c2420' : 'rgba(200,184,154,0.15)',
                  color: form.hasPets === opt.val ? '#f5f0e8' : '#5a4e44',
                  transition: 'all 0.15s',
                }}
              >{opt.label}</button>
            ))}
          </div>
          {fieldErrors.hasPets && <p style={ERR}>{fieldErrors.hasPets}</p>}
        </div>
        {form.hasPets === true && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> Please describe your pets *</label>
              <input
                type="text"
                placeholder="e.g. 1 dog, 2 cats"
                value={form.petTypes}
                onChange={e => { setForm(f => ({ ...f, petTypes: e.target.value })); setFieldErrors(er => ({ ...er, petTypes: null })); }}
                style={INPUT(!!fieldErrors.petTypes)}
              />
              {fieldErrors.petTypes && <p style={ERR}>{fieldErrors.petTypes}</p>}
            </div>
            <div style={{ background: '#7a1a1a', padding: '14px 18px', marginBottom: 20, borderLeft: '3px solid #ff6b6b' }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6, letterSpacing: '0.03em' }}>
                ⚠ Important — Pet Policy
              </div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 300, lineHeight: 1.7 }}>
                All pets must be secured and kept away from our cleaners for the entire duration of the clean. This is required for the safety of both your pet and our team. <strong style={{ color: '#fff', fontWeight: 600 }}>Failure to do so may result in the clean being abandoned and the loss of your deposit.</strong>
              </div>
            </div>
          </>
        )}
      </div>}

      {/* Preferences */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Preferences & Access</div>
        <Field key="keys"  name="keys"  label="Key Instructions"    placeholder="Key with concierge, smart lock code 1234, I'll be home" value={form.keys}  error={fieldErrors.keys}  onChange={updateField} />
        <Field key="notes" name="notes" label="Preferences & Notes" placeholder="e.g. allergic to strong fragrances, please avoid certain areas…"  value={form.notes} error={fieldErrors.notes} onChange={updateField} />

        {/* Signature Touch — only for Signature Hotel Reset */}
        {booking.pkg?.id === 'standard' && <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '16px', background: form.signatureTouch ? 'rgba(200,184,154,0.22)' : '#faf9f7', border: `${form.signatureTouch ? '2px' : '1px'} solid ${form.signatureTouch ? '#c8b89a' : 'rgba(200,184,154,0.25)'}`, boxShadow: form.signatureTouch ? '0 2px 10px rgba(200,184,154,0.25)' : 'none', marginBottom: 10, transition: 'all 0.2s' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 600, color: '#2c2420', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#c8b89a' }}>✦</span> Signature Touch
              </div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>
                As your final finishing touch, we lightly mist your home with our exclusive signature scent, so every room feels calm, refined, and unmistakably luxurious. By opting in, you will also receive a complimentary gift left in your home: a bottle of our signature fragrance and a hand-poured signature candle, crafted exclusively for our clients. A small indulgence that turns a clean into a full pampering experience. You can opt out below at any time. Our complimentary gift is a gesture we love to include when we can. It may vary or stop at any time.
              </div>
            </div>
            <div
              onClick={() => setForm(f => ({ ...f, signatureTouch: !f.signatureTouch, signatureTouchNotes: '' }))}
              style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, position: 'relative', background: form.signatureTouch ? '#c8b89a' : 'rgba(200,184,154,0.2)', cursor: 'pointer', transition: 'background 0.2s', marginTop: 2 }}
            >
              <div style={{ position: 'absolute', top: 3, left: form.signatureTouch ? 19 : 3, width: 16, height: 16, background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
            </div>
          </div>
          {!form.signatureTouch && (
            <div>
              <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> Let us know why you're opting out (optional)</label>
              <input
                type="text"
                placeholder="e.g. fragrance allergy, prefer no extras…"
                value={form.signatureTouchNotes}
                onChange={e => setForm(f => ({ ...f, signatureTouchNotes: e.target.value }))}
                style={INPUT(false)}
              />
            </div>
          )}
        </div>}

        <SelectField
          label="How did you hear about us? *"
          value={form.source}
          options={HOW_HEARD}
          error={fieldErrors.source}
          onChange={v => { setForm(f => ({ ...f, source: v })); setFieldErrors(e => ({ ...e, source: null })); }}
        />
      </div>

    </div>
  );

  return (
    <div>
      {!custType && (
        <>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, marginBottom: 20 }}>
            Have you booked with us before?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            <div style={CARD(false)} onClick={() => setCustType('new')}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 6 }}>✦</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410', marginBottom: 4 }}>First time booking</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300 }}>I'm new to London Cleaning Wizard</div>
            </div>
            <div style={CARD(false)} onClick={() => setCustType('returning')}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 6 }}>↩</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410', marginBottom: 4 }}>I've booked before</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300 }}>Log in and we'll fill everything in</div>
            </div>
          </div>
          <button onClick={onBack} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>
            ← Back
          </button>
        </>
      )}

      {custType === 'new' && (
        <>
          {formBody}
          {submitError && <p style={{ ...ERR, marginBottom: 12 }}>{submitError}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setCustType(null)} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>← Back</button>
            <button onClick={handleNext} style={BTN}><WandIcon size={14} color="#c8b89a" /> Continue to Payment</button>
          </div>
        </>
      )}

      {custType === 'returning' && (
        <>
          {!codeSent && !profileLoaded && (
            <>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, marginBottom: 20 }}>
                Enter your email and we'll send a verification code.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> Email Address</label>
                <input
                  type="email" value={retEmail}
                  onChange={e => { setRetEmail(e.target.value); setRetEmailErr(''); }}
                  placeholder="you@example.com"
                  style={INPUT(!!retEmailErr)}
                />
                {retEmailErr && <p style={ERR}>{retEmailErr}</p>}
              </div>
              {sendingCode ? (
                <SectionSpinner label="Sending your verification code…" />
              ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setCustType(null); setCode(''); setCodeErr(''); setCodeSent(false); }} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>← Back</button>
                  <button onClick={handleSendCode} style={BTN}><WandIcon size={14} color="#c8b89a" /> Send Verification Code</button>
                </div>
              )}
            </>
          )}

          {codeSent && !profileLoaded && (
            <>
              <div style={{ background: '#fff8eb', borderLeft: '2px solid #c8b89a', padding: '12px 16px', marginBottom: 24, fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#7a5c00', fontWeight: 300 }}>
                A 6-digit code has been sent to <strong>{retEmail}</strong>.<br />
                {secondsLeft > 0 ? `Expires in ${timeDisplay}` : 'Code expired — please request a new one.'}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> Verification Code</label>
                <input
                  type="text" value={code} maxLength={6}
                  onChange={e => { setCode(e.target.value.replace(/\D/g,'')); setCodeErr(''); }}
                  placeholder="Enter 6-digit code"
                  style={{ ...INPUT(!!codeErr), fontSize: 26, letterSpacing: '0.3em', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif" }}
                />
                {codeErr && <p style={ERR}>{codeErr}</p>}
              </div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', marginBottom: 20 }}>
                Didn't receive it?{' '}
                <span style={{ color: '#c8b89a', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => { setCodeSent(false); setCode(''); setCodeErr(''); }}>
                  Use a different email
                </span>
              </div>
              {verifying ? (
                <SectionSpinner label="Verifying and loading your profile…" />
              ) : (
                <button onClick={handleVerifyCode} style={BTN}><WandIcon size={14} color="#c8b89a" /> Verify & Load My Details</button>
              )}
            </>
          )}

          {profileLoaded && (
            <>
              <div style={{ background: '#f3faf6', borderLeft: '2px solid #2d6a4f', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#2d6a4f', fontSize: 20 }}>✓</span>
                <div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, fontWeight: 500, color: '#2d6a4f' }}>Profile loaded — welcome back!</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, marginTop: 2 }}>Your details are pre-filled. Update anything that has changed.</div>
                </div>
              </div>

              {lastBooking && (
                <div style={{ background: '#1a1410', padding: '16px 20px', marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: '#c8b89a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Your Last Booking</div>
                  {[
                    { l: 'Service', v: lastBooking.service },
                    { l: 'Date',    v: lastBooking.date ? lastBooking.date.split('-').reverse().join('/') : '—' },
                    { l: 'Cleaner', v: lastBooking.cleaner || '—' },
                  ].map(r => (
                    <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '0.5px solid rgba(200,184,154,0.1)' }}>
                      <span style={{ fontFamily: "'Jost',sans-serif", color: 'rgba(200,184,154,0.5)', fontWeight: 300 }}>{r.l}</span>
                      <span style={{ fontFamily: "'Jost',sans-serif", color: '#f5f0e8', fontWeight: 500 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              )}

              {formBody}
              {submitError && <p style={{ ...ERR, marginBottom: 12 }}>{submitError}</p>}
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', fontWeight: 700, marginBottom: 12 }}>
                Please review your details above before continuing — make sure everything is correct.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setCustType(null); setProfileLoaded(false); setCodeSent(false); setCode(''); setCodeErr(''); }} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>← Back</button>
                <button onClick={handleNext} style={BTN}><WandIcon size={14} color="#c8b89a" /> Continue to Payment</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
