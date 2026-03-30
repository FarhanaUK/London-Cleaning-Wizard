import { useState, useEffect, useRef } from 'react';
import { validateForm, validateField } from '../utils/validation';
import { SectionSpinner } from './LoadingStates';
import { Sparkle, WandIcon } from './Icons';

const LABEL = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.2em',
  textTransform: 'uppercase', color: '#8b7355', marginBottom: 6,
  display: 'flex', alignItems: 'center', gap: 7,
};

const INPUT = (hasError) => ({
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: `1px solid ${hasError ? '#8b2020' : 'rgba(200,184,154,0.4)'}`,
  padding: '10px 0', fontFamily: "'Jost',sans-serif", fontSize: 14,
  color: '#1a1410', outline: 'none',
});

const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', fontWeight: 500, padding: '14px 32px',
  background: '#2c2420', color: '#f5f0e8', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};

const CARD = (selected) => ({
  border: selected ? '1px solid #c8b89a' : '1px solid rgba(200,184,154,0.3)',
  background: selected ? 'rgba(200,184,154,0.06)' : 'transparent',
  padding: '20px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
});

const ERR = { fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginTop: 4 };

const HOW_HEARD = ['Google Search','Instagram','Facebook','TikTok','Word of Mouth','Leaflet','Nextdoor','Other'];
const PARKING   = ['Free street parking nearby','Permit zone — I will arrange','Private driveway / bay','No parking available'];

export default function BookingStep3({ booking, onUpdate, onNext, onBack, isMobile }) {
  // Customer type: null | 'new' | 'returning'
  const [custType,     setCustType]     = useState(null);

  // Returning flow
  const [retEmail,     setRetEmail]     = useState('');
  const [retEmailErr,  setRetEmailErr]  = useState('');
  const [codeSent,     setCodeSent]     = useState(false);
  const [sendingCode,  setSendingCode]  = useState(false);
  const [code,         setCode]         = useState('');
  const [codeErr,      setCodeErr]      = useState('');
  const [verifying,    setVerifying]    = useState(false);
  const [secondsLeft,  setSecondsLeft]  = useState(600);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [lastBooking,  setLastBooking]  = useState(null);

  // Form fields
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    addr1: '', postcode: '', floor: '', parking: '', keys: '', notes: '', source: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Countdown timer for verification code
  useEffect(() => {
    if (!codeSent || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [codeSent, secondsLeft]);

  const timeDisplay = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const updateField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    const err = validateField(field, value);
    setFieldErrors(e => ({ ...e, [field]: err }));
  };

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

      // Pre-fill form from profile
      if (data.profile) {
        const p = data.profile;
        setForm({
          firstName: p.firstName || '', lastName: p.lastName || '',
          email: retEmail, phone: p.phone || '',
          addr1: p.addr1 || '', postcode: p.postcode || '',
          floor: p.floor || '', parking: p.parking || '',
          keys: p.keys || '', notes: p.notes || '', source: '',
        });
        setLastBooking(p.lastPackageName ? {
          service:  p.lastPackageName,
          date:     p.lastDate,
          cleaner:  p.lastCleaner,
          pkg:      p.lastPackage,
          size:     p.lastSize,
          price:    p.lastPrice,
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

  const handleNext = () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Please fix the errors above.');
      return;
    }
    setSubmitError('');
    onUpdate({
      firstName: form.firstName, lastName: form.lastName,
      email: form.email, phone: form.phone,
      addr1: form.addr1, postcode: form.postcode.toUpperCase(),
      floor: form.floor, parking: form.parking,
      keys: form.keys, notes: form.notes, source: form.source,
      isReturning: custType === 'returning',
    });
    onNext();
  };

  const Field = ({ name, label, type = 'text', placeholder, readOnly, style }) => (
    <div style={{ marginBottom: 20, ...style }}>
      <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> {label}</label>
      <input
        type={type}
        value={form[name]}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => updateField(name, e.target.value)}
        onBlur={e => updateField(name, e.target.value)}
        style={{ ...INPUT(!!fieldErrors[name]), background: readOnly ? '#faf9f7' : 'transparent' }}
        autoComplete={name}
      />
      {fieldErrors[name] && <p style={ERR}>{fieldErrors[name]}</p>}
    </div>
  );

  const FullForm = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
        <Field name="firstName" label="First Name *"    placeholder="Sophie" />
        <Field name="lastName"  label="Last Name *"     placeholder="Lewis" />
        <Field name="email"     label="Email Address *" placeholder="you@example.com" type="email" readOnly={custType === 'returning'} />
        <Field name="phone"     label="Phone Number *"  placeholder="07700 000 000" type="tel" />
      </div>

      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8b7355', margin: '8px 0 16px', paddingTop: 8, borderTop: '1px solid rgba(200,184,154,0.2)' }}>
        Property Details
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
        <Field name="addr1"    label="Address Line 1 *" placeholder="Flat 3, 42 Mare Street" />
        <Field name="postcode" label="Postcode *"        placeholder="E8 1HL" />
        <Field name="floor"    label="Floor / Access Notes" placeholder="2nd floor, no lift" />
        <div style={{ marginBottom: 20 }}>
          <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> Parking</label>
          <select value={form.parking} onChange={e => setForm(f => ({ ...f, parking: e.target.value }))}
            style={{ ...INPUT(false), appearance: 'none', cursor: 'pointer' }}>
            <option value="">Select...</option>
            {PARKING.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <Field name="keys"  label="Key Instructions" placeholder="Key with concierge, smart lock code 1234, I'll be home" />
      <Field name="notes" label="Preferences & Notes" placeholder="e.g. allergic to strong fragrances, dog in the house..." />

      <div style={{ marginBottom: 20 }}>
        <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> How did you hear about us?</label>
        <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
          style={{ ...INPUT(false), appearance: 'none', cursor: 'pointer' }}>
          <option value="">Select...</option>
          {HOW_HEARD.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div>
      {/* Customer type selector */}
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

      {/* New customer */}
      {custType === 'new' && (
        <>
          <FullForm />
          {submitError && <p style={{ ...ERR, marginBottom: 12 }}>{submitError}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setCustType(null)} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>← Back</button>
            <button onClick={handleNext} style={BTN}><WandIcon size={14} color="#c8b89a" /> Continue to Payment</button>
          </div>
        </>
      )}

      {/* Returning customer */}
      {custType === 'returning' && (
        <>
          {/* Step 1: Email entry */}
          {!codeSent && !profileLoaded && (
            <>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, marginBottom: 20 }}>
                Enter your email and we'll send a verification code.
              </p>
              <div style={{ marginBottom: 16 }}>
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
                  <button onClick={() => setCustType(null)} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>← Back</button>
                  <button onClick={handleSendCode} style={BTN}><WandIcon size={14} color="#c8b89a" /> Send Verification Code</button>
                </div>
              )}
            </>
          )}

          {/* Step 2: Code entry */}
          {codeSent && !profileLoaded && (
            <>
              <div style={{ background: '#fff8eb', borderLeft: '2px solid #c8b89a', padding: '10px 14px', marginBottom: 20, fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#7a5c00', fontWeight: 300 }}>
                A 6-digit code has been sent to <strong>{retEmail}</strong>. {secondsLeft > 0 ? `Expires in ${timeDisplay}` : 'Code expired — please request a new one.'}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}><Sparkle size={7} color="#c8b89a" /> Verification Code</label>
                <input
                  type="text" value={code} maxLength={6}
                  onChange={e => { setCode(e.target.value.replace(/\D/g,'')); setCodeErr(''); }}
                  placeholder="e.g. 482917"
                  style={{ ...INPUT(!!codeErr), fontSize: 24, letterSpacing: '0.2em', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif" }}
                />
                {codeErr && <p style={ERR}>{codeErr}</p>}
              </div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', marginBottom: 16 }}>
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

          {/* Step 3: Profile loaded */}
          {profileLoaded && (
            <>
              <div style={{ background: '#f3faf6', borderLeft: '2px solid #2d6a4f', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#2d6a4f', fontSize: 18 }}>✓</span>
                <div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#2d6a4f' }}>Profile loaded — welcome back!</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300 }}>Your details are pre-filled. Update anything that has changed.</div>
                </div>
              </div>

              {/* Last booking summary */}
              {lastBooking && (
                <div style={{ background: '#1a1410', padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: '#c8b89a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Your Last Booking</div>
                  {[
                    { l: 'Service', v: lastBooking.service },
                    { l: 'Date',    v: lastBooking.date },
                    { l: 'Cleaner', v: lastBooking.cleaner || '—' },
                  ].map(r => (
                    <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '0.5px solid rgba(200,184,154,0.1)' }}>
                      <span style={{ fontFamily: "'Jost',sans-serif", color: 'rgba(200,184,154,0.5)', fontWeight: 300 }}>{r.l}</span>
                      <span style={{ fontFamily: "'Jost',sans-serif", color: '#f5f0e8', fontWeight: 500 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              )}

              <FullForm />
              {submitError && <p style={{ ...ERR, marginBottom: 12 }}>{submitError}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setCustType(null); setProfileLoaded(false); setCodeSent(false); }} style={{ ...BTN, background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)' }}>← Back</button>
                <button onClick={handleNext} style={BTN}><WandIcon size={14} color="#c8b89a" /> Continue to Payment</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}