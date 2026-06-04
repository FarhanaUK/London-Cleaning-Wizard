import { useState, useEffect, useCallback, useRef } from 'react';
import { trackEvent } from '../utils/funnelTrack';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ADDONS } from '../data/siteData';
import { validateForm, validateField } from '../utils/validation';
import { calculateTotal } from '../utils/pricing';
import { FullOverlay, ButtonSpinner, SectionSpinner } from './LoadingStates';
import { Sparkle, WandIcon } from './Icons';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
const CARD_SEL = (selected) => ({
  border: selected ? '2px solid #c8b89a' : '2px solid rgba(200,184,154,0.2)',
  background: selected ? 'rgba(200,184,154,0.22)' : '#fdf8f3',
  boxShadow: selected ? '0 2px 10px rgba(200,184,154,0.25)' : 'none',
  padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
});
const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', fontWeight: 500, padding: '14px 32px',
  background: '#2c2420', color: '#f5f0e8', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};
const ERR = { fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginTop: 6 };
const SECTION = { background: '#fdf8f3', border: '1px solid rgba(200,184,154,0.3)', padding: '20px 20px 4px', marginBottom: 16 };
const SECTION_TITLE = { fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid rgba(200,184,154,0.2)' };
const STRIPE_FIELD = { border: '1px solid rgba(200,184,154,0.4)', padding: '14px 16px', marginBottom: 16, background: '#fdf8f3' };
const STRIPE_STYLE = { style: { base: { fontFamily: "'Jost', sans-serif", fontSize: '15px', color: '#2c2420', '::placeholder': { color: 'rgba(139,115,85,0.5)' } }, invalid: { color: '#8b2020' } } };
const STRIPE_ERRORS = {
  card_declined: 'Your card was declined. Please try a different card.',
  insufficient_funds: 'Your card has insufficient funds. Please try a different card.',
  incorrect_cvc: 'Your security code (CVC) is incorrect. Please check and try again.',
  expired_card: 'Your card has expired. Please use a different card.',
  incorrect_number: 'Your card number is incorrect. Please check and try again.',
  processing_error: 'There was an error processing your payment. Please try again.',
  authentication_required: 'Your bank requires extra verification. Please follow the on-screen steps.',
};

const HOW_HEARD = ['Google Search','Instagram','Facebook','TikTok','Word of Mouth','Leaflet','Nextdoor','Other'];
const PARKING   = ['Free street parking nearby','Permit zone — I will arrange','Private driveway / bay','No parking available'];

function SelectField({ label, value, options, onChange, placeholder = 'Select…', error }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ ...LABEL, minHeight: 36 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...INPUT(!!error), appearance: 'none', cursor: 'pointer', paddingRight: 36 }}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#8b7355', fontSize: 11 }}>▼</span>
      </div>
      {error && <p style={ERR}>{error}</p>}
    </div>
  );
}

function Field({ name, label, type = 'text', placeholder, readOnly, value, error, onChange, onBlur }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ ...LABEL, minHeight: 36 }}>{label}</label>
      <input
        type={type} name={name} value={value} readOnly={readOnly} placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)}
        onBlur={e => (onBlur || onChange)(name, e.target.value)}
        style={{ ...INPUT(!!error), background: readOnly ? '#faf9f7' : 'white' }}
        autoComplete={name}
      />
      {error && <p style={ERR}>{error}</p>}
    </div>
  );
}

function CheckoutForm({ booking, onUpdate, onSuccess, onBack }) {
  const stripe   = useStripe();
  const elements = useElements();

  // Customer type
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
  const [stOtherNote,   setStOtherNote]   = useState('');

  // Form
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    addr1: '', postcode: '', floor: '', parking: '', keys: '', notes: booking.notes || '', source: '',
    bathrooms: null, hasPets: null, petTypes: '', airbnbListing: '',
    signatureTouch: true, signatureTouchNotes: '',
    marketingOptOut: true,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Payment
  const [policyChecked,  setPolicyChecked]  = useState(false);
  const [policyError,    setPolicyError]    = useState('');
  const [payError,       setPayError]       = useState('');
  const [loading,        setLoading]        = useState(false);
  const [overlayTitle,   setOverlayTitle]   = useState('');
  const [overlaySub,     setOverlaySub]     = useState('');
  const [hasScrolled,    setHasScrolled]    = useState(false);
  const [mediaConsent,   setMediaConsent]   = useState(false);
  const trackedFieldsRef = useRef(new Set());

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
    if (value) {
      if (!trackedFieldsRef.current.has(field)) {
        trackedFieldsRef.current.add(field);
        if (field === 'postcode') {
          trackEvent('field_filled', { field, postcode_outward: value.trim().split(' ')[0].toUpperCase() });
        } else {
          trackEvent('field_filled', { field });
        }
      }
    } else if (trackedFieldsRef.current.has(field)) {
      trackedFieldsRef.current.delete(field);
      trackEvent('field_cleared', { field });
    }
  }, []);

  const handleSendCode = async () => {
    if (!retEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retEmail)) {
      setRetEmailErr('Please enter a valid email address.'); return;
    }
    setRetEmailErr('');
    setSendingCode(true);
    try {
      const res  = await fetch(import.meta.env.VITE_CF_SEND_CODE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: retEmail }) });
      const data = await res.json();
      if (!res.ok) { setRetEmailErr(data.error); return; }
      setCodeSent(true); setSecondsLeft(600);
    } catch { setRetEmailErr('Failed to send code. Please try again.'); }
    finally { setSendingCode(false); }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(code)) { setCodeErr('Please enter the 6-digit code.'); return; }
    setCodeErr(''); setVerifying(true);
    try {
      const res  = await fetch(import.meta.env.VITE_CF_VERIFY_CODE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: retEmail, code }) });
      const data = await res.json();
      if (!res.ok) { setCodeErr(data.error); return; }
      if (data.profile) {
        const p = data.profile;
        setForm({ firstName: p.firstName || '', lastName: p.lastName || '', email: retEmail, phone: p.phone || '', addr1: p.addr1 || '', postcode: p.postcode || '', floor: p.floor || '', parking: p.parking || '', bathrooms: p.bathrooms ?? null, keys: p.keys || '', notes: booking.notes || p.notes || '', source: p.source || '', hasPets: p.hasPets ?? null, petTypes: p.petTypes || '', signatureTouch: p.signatureTouch ?? true, signatureTouchNotes: p.signatureTouchNotes || '', marketingOptOut: true });
        setLastBooking(p.lastPackageName ? { service: p.lastPackageName, date: p.lastDate, cleaner: p.lastCleaner } : null);
      } else {
        setForm(f => ({ ...f, email: retEmail }));
      }
      onUpdate({ email: retEmail }); setProfileLoaded(true);
    } catch { setCodeErr('Something went wrong. Please try again.'); }
    finally { setVerifying(false); }
  };

  // Compute total (add-ons may change on this page)
  const rawT = booking.size ? calculateTotal({
    sizePrice:           booking.size.basePrice,
    propertyType:        booking.propertyType,
    frequency:           null,
    addons:              booking.addons || [],
    surcharge:           booking.surcharge || 0,
    supplies:            booking.supplies,
    suppliesFeeOverride: booking.suppliesFee,
  }) : null;
  const launchMult = booking.pkg?.launchOffer || null;
  const baseT = rawT && launchMult ? (() => {
    const d  = parseFloat((rawT.base * (1 - launchMult)).toFixed(2));
    const ns = parseFloat((rawT.subtotal - d).toFixed(2));
    const nd = Math.round(ns * 30) / 100;
    return { ...rawT, originalSubtotal: rawT.subtotal, subtotal: ns, deposit: nd, remaining: parseFloat((ns - nd).toFixed(2)), launchDiscount: d };
  })() : rawT;
  const MEDIA_DISCOUNT = 10;
  const T = baseT && mediaConsent ? (() => {
    const ns = parseFloat((baseT.subtotal - MEDIA_DISCOUNT).toFixed(2));
    const nd = Math.round(ns * 30) / 100;
    return { ...baseT, originalSubtotal: baseT.originalSubtotal ?? baseT.subtotal, subtotal: ns, deposit: nd, remaining: parseFloat((ns - nd).toFixed(2)), mediaConsentDiscount: MEDIA_DISCOUNT, recurringSubtotal: baseT.subtotal };
  })() : baseT;

  const handlePay = async () => {
    // 1. Validate contact form
    const errors = validateForm(form);
    if (form.bathrooms === null)            errors.bathrooms = 'Please select the number of bathrooms.';
    if (booking.pkg?.id === 'airbnb' && !form.airbnbListing?.trim()) errors.airbnbListing = 'Please provide your Airbnb or short-let listing URL.';
    if (form.hasPets === null)              errors.hasPets   = 'Please let us know whether there are pets at the property.';
    if (form.hasPets === true && !form.petTypes.trim()) errors.petTypes = 'Please describe your pets.';
    if (!booking.mopAck) errors.mopAck = 'Please confirm that a vacuum and mop will be available.';
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); setSubmitError('Please fix the errors above before paying.'); return; }

    // 2. Check T/O&C
    if (!policyChecked) { setPolicyError('Please read and accept the cancellation policy to continue.'); return; }
    setPolicyError(''); setPayError(''); setSubmitError('');
    trackEvent('payment_attempted', { pkg: booking.pkg?.name || null, freq: booking.freq?.id || null });

    // 3. Check date still available
    if (booking.cleanDate) {
      const [y, m] = booking.cleanDate.split('-').map(Number);
      try {
        const r = await fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${y}&month=${m}`);
        const d = await r.json();
        if ((d.blocked || []).includes(booking.cleanDate)) { setPayError('Sorry, this date is no longer available. Please go back and choose another day.'); return; }
      } catch { setPayError('Unable to verify availability. Please refresh and try again.'); return; }
    }

    if (!stripe || !elements || !T) return;
    setLoading(true); setOverlayTitle('Authorising payment…'); setOverlaySub('Verifying your card details securely');

    try {
      // 4. Track step (fire-and-forget)
      fetch(import.meta.env.VITE_CF_TRACK_STEP3, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, firstName: form.firstName, packageName: booking.pkg?.name || '', frequency: booking.freq?.id || 'one-off', cleanDate: booking.cleanDate || '', marketingOptOut: form.marketingOptOut }),
      }).catch(() => {});

      // 5. Create payment intent
      const piRes = await fetch(import.meta.env.VITE_CF_CREATE_PAYMENT_INTENT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseFloat(T.deposit) * 100),
          bookingData: {
            ...booking, ...form,
            package: booking.pkg?.id, packageName: booking.pkg?.name,
            size: booking.size?.id, frequency: booking.freq?.id,
            total: parseFloat(T.subtotal), deposit: parseFloat(T.deposit), remaining: parseFloat(T.remaining),
            mediaConsent,
            ...(T.mediaConsentDiscount > 0 ? { mediaConsentDiscount: T.mediaConsentDiscount } : {}),
            ...(T.launchDiscount > 0 ? { launchDiscount: T.launchDiscount, originalTotal: T.originalSubtotal } : {}),
          },
        }),
      });
      const piData = await piRes.json();
      if (!piRes.ok) { setPayError(piData.error || 'Could not initialise payment. Please try again.'); setLoading(false); return; }

      // 6. Confirm card payment
      let { error, paymentIntent } = await stripe.confirmCardPayment(piData.clientSecret, {
        payment_method: { card: elements.getElement(CardNumberElement) },
      });
      if (error) {
        try {
          const { paymentIntent: recovered } = await stripe.retrievePaymentIntent(piData.clientSecret);
          if (recovered?.status === 'succeeded') { paymentIntent = recovered; error = null; }
        } catch { /* fall through */ }
      }
      if (error) { setPayError(STRIPE_ERRORS[error.code] || error.message || 'Payment failed. Please try again or call us on 020 8137 0026.'); setLoading(false); return; }

      if (paymentIntent.status === 'succeeded') {
        setOverlayTitle('Confirming your booking…'); setOverlaySub('Sending confirmation to your email');

        // 7. Save booking (merge form data into booking)
        const fullBooking = {
          ...booking, ...form,
          addr1: form.addr1, postcode: form.postcode.toUpperCase(),
          signatureTouchNotes: form.signatureTouchNotes === 'Other' ? stOtherNote.trim() || 'Other' : form.signatureTouchNotes,
          isReturning: custType === 'returning',
          package: booking.pkg?.id, packageName: booking.pkg?.name,
          size: booking.size?.id, frequency: booking.freq?.id,
          total: parseFloat(T.subtotal), deposit: parseFloat(T.deposit), remaining: parseFloat(T.remaining),
          ...(T.launchDiscount > 0 ? { originalTotal: T.originalSubtotal, launchDiscount: T.launchDiscount } : {}),
          ...(T.recurringSubtotal ? { recurringTotal: T.recurringSubtotal, mediaConsentDiscount: T.mediaConsentDiscount } : T.originalSubtotal ? { recurringTotal: T.originalSubtotal } : {}),
          stripeDepositIntentId: paymentIntent.id,
          stripeCustomerId: piData.customerId,
          piId: piData.piId,
          marketingOptOut: form.marketingOptOut,
          mediaConsent,
        };

        // Store success data immediately — payment is confirmed, redirect must always happen.
        // saveBooking or the Stripe webhook will persist the booking regardless.
        sessionStorage.setItem('bookingSuccess', JSON.stringify({
          packageName: booking.pkg?.name, size: booking.size?.label,
          cleanDate: booking.cleanDateDisplay, cleanTime: booking.cleanTime,
          address: `${form.addr1}, ${form.postcode.toUpperCase()}`,
          total: T.subtotal.toFixed(2), deposit: T.deposit.toFixed(2), remaining: T.remaining.toFixed(2),
          ...((T.launchDiscount > 0 || T.mediaConsentDiscount > 0) ? { originalTotal: T.originalSubtotal.toFixed(2) } : {}),
          ...(T.launchDiscount > 0 ? { launchDiscount: T.launchDiscount.toFixed(2) } : {}),
          ...(T.mediaConsentDiscount > 0 ? { mediaConsentDiscount: T.mediaConsentDiscount.toFixed(2) } : {}),
          ...(booking.freq && booking.freq.id !== 'one-off' ? { frequency: booking.freq.label, freqSaving: booking.freq.saving } : {}),
        }));
        sessionStorage.removeItem('bookingSession');

        // Fire-and-forget — don't await, don't block redirect
        try { fetch(import.meta.env.VITE_CF_SAVE_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fullBooking) }).catch(() => {}); } catch {}

        setLoading(false);
        onSuccess({});
      }
    } catch {
      setPayError('Something went wrong. Please try again or call us on 020 8137 0026.');
      setLoading(false);
    }
  };

  const formBody = (
    <div>
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Your Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field name="firstName" label="First Name *"    placeholder="Sophie"          value={form.firstName} error={fieldErrors.firstName} onChange={updateField} onBlur={blurField} />
          <Field name="lastName"  label="Last Name *"     placeholder="Lewis"           value={form.lastName}  error={fieldErrors.lastName}  onChange={updateField} onBlur={blurField} />
          <Field name="email"     label="Email Address *" placeholder="you@example.com" value={form.email}     error={fieldErrors.email}     onChange={updateField} onBlur={blurField} type="email" />
          <Field name="phone"     label="Phone Number *"  placeholder="07700 000 000"   value={form.phone}     error={fieldErrors.phone}     onChange={updateField} onBlur={blurField} type="tel" />
        </div>
      </div>

      <div style={SECTION}>
        <div style={SECTION_TITLE}>Property Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', alignItems: 'end' }}>
          <Field name="addr1"    label="Address Line 1 *"    placeholder="Flat 3, 42 Mare Street" value={form.addr1}    error={fieldErrors.addr1}    onChange={updateField} onBlur={blurField} />
          <Field name="postcode" label="Postcode *"           placeholder="E8 1HL"                 value={form.postcode} error={fieldErrors.postcode} onChange={updateField} onBlur={blurField} />
          <Field name="floor"    label="Floor / Access Notes" placeholder="2nd floor, no lift"     value={form.floor}    error={fieldErrors.floor}    onChange={updateField} onBlur={blurField} />
          <SelectField label="Parking" value={form.parking} options={PARKING} onChange={v => { setForm(f => ({ ...f, parking: v })); if (v) trackEvent('field_filled', { field: 'parking' }); }} />
        </div>
        {booking.pkg?.id === 'airbnb' && (
          <div style={{ marginTop: 4, marginBottom: 4 }}>
            <label style={LABEL}>Airbnb / Short-let Listing URL *</label>
            <input type="url" placeholder="https://www.airbnb.co.uk/rooms/..." value={form.airbnbListing} onChange={e => { setForm(f => ({ ...f, airbnbListing: e.target.value })); setFieldErrors(er => ({ ...er, airbnbListing: null })); setSubmitError(''); }} style={{ ...INPUT(!!fieldErrors.airbnbListing), marginBottom: fieldErrors.airbnbListing ? 4 : 16 }} />
            {fieldErrors.airbnbListing && <p style={ERR}>{fieldErrors.airbnbListing}</p>}
          </div>
        )}
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <label style={LABEL}>Number of Bathrooms *</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: fieldErrors.bathrooms ? 6 : 0 }}>
            {['1','2','3','4','5+'].map(n => (
              <button key={n} type="button" onClick={() => { trackEvent('bathrooms', { count: n, from: form.bathrooms || null }); setForm(f => ({ ...f, bathrooms: n })); setFieldErrors(e => ({ ...e, bathrooms: null })); setSubmitError(''); }}
                style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, padding: '10px 22px', cursor: 'pointer', border: 'none', background: form.bathrooms === n ? '#2c2420' : 'rgba(200,184,154,0.15)', color: form.bathrooms === n ? '#f5f0e8' : '#5a4e44', transition: 'all 0.15s' }}>{n}</button>
            ))}
          </div>
          {fieldErrors.bathrooms && <p style={ERR}>{fieldErrors.bathrooms}</p>}
        </div>
      </div>

      <div style={SECTION}>
        <div style={SECTION_TITLE}>Pets at the Property</div>
        <div style={{ marginBottom: 20 }}>
          <label style={LABEL}>Are there any pets at the property? *</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: fieldErrors.hasPets ? 6 : 0 }}>
            {[{ val: false, label: 'No' }, { val: true, label: 'Yes' }].map(opt => (
              <button key={String(opt.val)} type="button" onClick={() => { trackEvent('has_pets', { hasPets: opt.val, from: form.hasPets }); setForm(f => ({ ...f, hasPets: opt.val, petTypes: opt.val ? f.petTypes : '' })); setFieldErrors(e => ({ ...e, hasPets: null, petTypes: null })); setSubmitError(''); }}
                style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, padding: '10px 28px', cursor: 'pointer', border: 'none', background: form.hasPets === opt.val ? '#2c2420' : 'rgba(200,184,154,0.15)', color: form.hasPets === opt.val ? '#f5f0e8' : '#5a4e44', transition: 'all 0.15s' }}>{opt.label}</button>
            ))}
          </div>
          {fieldErrors.hasPets && <p style={ERR}>{fieldErrors.hasPets}</p>}
        </div>
        {form.hasPets === true && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Please describe your pets *</label>
              <input type="text" placeholder="e.g. 1 dog, 2 cats" value={form.petTypes} onChange={e => { setForm(f => ({ ...f, petTypes: e.target.value })); setFieldErrors(er => ({ ...er, petTypes: null })); }} onBlur={e => { const v = e.target.value; if (v && !trackedFieldsRef.current.has('petTypes')) { trackedFieldsRef.current.add('petTypes'); trackEvent('field_filled', { field: 'petTypes' }); } else if (!v && trackedFieldsRef.current.has('petTypes')) { trackedFieldsRef.current.delete('petTypes'); trackEvent('field_cleared', { field: 'petTypes' }); } }} style={INPUT(!!fieldErrors.petTypes)} />
              {fieldErrors.petTypes && <p style={ERR}>{fieldErrors.petTypes}</p>}
            </div>
            <div style={{ background: '#7a1a1a', padding: '14px 18px', marginBottom: 20, borderLeft: '3px solid #ff6b6b' }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 6, letterSpacing: '0.03em' }}>⚠ Important — Pet Policy</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 300, lineHeight: 1.7 }}>
                All pets must be secured and kept away from our cleaners for the entire duration of the clean. This is required for the safety of both your pet and our team. <strong style={{ color: '#fff', fontWeight: 600 }}>Failure to do so may result in the clean being abandoned and the loss of your deposit.</strong>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={SECTION}>
        <div style={SECTION_TITLE}>Preferences & Access</div>
        <Field name="keys"  label="Key Instructions"    placeholder="Key with concierge, smart lock code 1234, I'll be home" value={form.keys}  error={fieldErrors.keys}  onChange={updateField} onBlur={blurField} />
        <Field name="notes" label="Preferences & Notes" placeholder="e.g. allergic to strong fragrances, please avoid certain areas…" value={form.notes} error={fieldErrors.notes} onChange={updateField} onBlur={blurField} />

        {/* Cleaning equipment acknowledgment */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6, marginBottom: 10 }}>
            Our cleaners bring all professional cleaning products and cloths. We only ask that a working vacuum and mop are available at the property for hygiene and cross-contamination reasons.
          </p>
          <div onClick={() => { trackEvent('mop_ack', { checked: !booking.mopAck }); onUpdate({ mopAck: !booking.mopAck }); setFieldErrors(e => ({ ...e, mopAck: null })); setSubmitError(''); }}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#fdf8f3', border: `1px solid ${fieldErrors.mopAck ? '#8b2020' : 'rgba(200,184,154,0.3)'}`, cursor: 'pointer' }}>
            <div style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1, border: booking.mopAck ? 'none' : '1px solid rgba(200,184,154,0.5)', background: booking.mopAck ? '#c8b89a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1410', fontSize: 11 }}>
              {booking.mopAck && '✓'}
            </div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
              Equipment available
            </p>
          </div>
          {fieldErrors.mopAck && <p style={ERR}>{fieldErrors.mopAck}</p>}
        </div>

        {booking.pkg?.id === 'standard' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '16px', background: form.signatureTouch ? 'rgba(200,184,154,0.22)' : '#faf9f7', border: `${form.signatureTouch ? '2px' : '1px'} solid ${form.signatureTouch ? '#c8b89a' : 'rgba(200,184,154,0.25)'}`, boxShadow: form.signatureTouch ? '0 2px 10px rgba(200,184,154,0.25)' : 'none', marginBottom: 10, transition: 'all 0.2s' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 600, color: '#2c2420', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#c8b89a' }}>✦</span> Signature Touch</div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>
                  As your final finishing touch, we lightly mist your home with our exclusive signature scent, so every room feels calm, refined, and unmistakably luxurious. By opting in, you will also receive a complimentary gift left in your home: a bottle of our signature fragrance and a hand-poured signature candle, crafted exclusively for our clients.
                </div>
              </div>
              <div onClick={() => { trackEvent('signature_touch', { enabled: !form.signatureTouch }); setForm(f => ({ ...f, signatureTouch: !f.signatureTouch, signatureTouchNotes: '' })); setStOtherNote(''); }}
                style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, position: 'relative', background: form.signatureTouch ? '#c8b89a' : 'rgba(200,184,154,0.2)', cursor: 'pointer', transition: 'background 0.2s', marginTop: 2 }}>
                <div style={{ position: 'absolute', top: 3, left: form.signatureTouch ? 19 : 3, width: 16, height: 16, background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
              </div>
            </div>
            {!form.signatureTouch && (
              <div>
                <label style={LABEL}>Let us know why you're opting out</label>
                <select value={form.signatureTouchNotes} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, signatureTouchNotes: v })); if (v) trackEvent('signature_touch_reason', { reason: v }); }} style={INPUT(false)}>
                  <option value="">Select a reason…</option>
                  {['Scent doesn\'t match my preference','Fragrance allergy or sensitivity','Candles not suitable for my home','Don\'t use home fragrance products','Already have enough home fragrance','Prefer a tidy clean only','Prefer to receive it occasionally','Other'].map(r => <option key={r}>{r}</option>)}
                </select>
                {form.signatureTouchNotes === 'Other' && <textarea placeholder="Please tell us a bit more…" value={stOtherNote} onChange={e => setStOtherNote(e.target.value)} rows={3} style={{ ...INPUT(false), marginTop: 8, resize: 'vertical' }} />}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );

  const returningCustomerPanel = (
    <>
      {!codeSent && !profileLoaded && (
        <>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, marginBottom: 20 }}>Enter your email and we'll send a verification code.</p>
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Email Address</label>
            <input type="email" value={retEmail} onChange={e => { setRetEmail(e.target.value); setRetEmailErr(''); }} placeholder="you@example.com" style={INPUT(!!retEmailErr)} />
            {retEmailErr && <p style={ERR}>{retEmailErr}</p>}
          </div>
          {sendingCode ? <SectionSpinner label="Sending your verification code…" /> : (
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
            A 6-digit code has been sent to <strong>{retEmail}</strong>.<br />{secondsLeft > 0 ? `Expires in ${timeDisplay}` : 'Code expired — please request a new one.'}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Verification Code</label>
            <input type="text" value={code} maxLength={6} onChange={e => { setCode(e.target.value.replace(/\D/g,'')); setCodeErr(''); }} placeholder="Enter 6-digit code" style={{ ...INPUT(!!codeErr), fontSize: 26, letterSpacing: '0.3em', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif" }} />
            {codeErr && <p style={ERR}>{codeErr}</p>}
          </div>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', marginBottom: 20 }}>
            Didn't receive it? <span style={{ color: '#c8b89a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setCodeSent(false); setCode(''); setCodeErr(''); }}>Use a different email</span>
          </div>
          {verifying ? <SectionSpinner label="Verifying and loading your profile…" /> : (
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
              {[{ l: 'Service', v: lastBooking.service }, { l: 'Date', v: lastBooking.date ? lastBooking.date.split('-').reverse().join('/') : '-' }, { l: 'Cleaner', v: lastBooking.cleaner || '-' }].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '0.5px solid rgba(200,184,154,0.1)' }}>
                  <span style={{ fontFamily: "'Jost',sans-serif", color: 'rgba(200,184,154,0.5)', fontWeight: 300 }}>{r.l}</span>
                  <span style={{ fontFamily: "'Jost',sans-serif", color: '#f5f0e8', fontWeight: 500 }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <FullOverlay show={loading} title={overlayTitle} sub={overlaySub} />
      <style>{`@media (max-width:640px) { .bk-back-btn { margin-top: 24px; } }`}</style>

      <button className="bk-back-btn" onClick={onBack} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', padding: 0, marginBottom: 8, alignSelf: 'flex-start' }}>
        ← Back
      </button>

      {formBody}

          {/* Add-ons — after details, before payment */}
          {booking.pkg?.showAddons && (
            <div style={{ marginBottom: 24 }}>
              <div style={LABEL}>Add-ons</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ADDONS.filter(addon => !(addon.id === 'microwave' && booking.pkg?.id === 'standard')).map(addon => {
                  const selected = (booking.addons || []).some(a => a.id === addon.id);
                  const allSmall = (booking.pkg?.sizes || []).every(s => ['studio','1bed'].includes(s.id));
                  const isSmall  = ['studio','1bed'].includes(booking.size?.id) || allSmall;
                  const price    = addon.id === 'windows' ? (isSmall ? 35 : 55) : addon.price;
                  return (
                    <div key={addon.id} onClick={() => { trackEvent('addon_toggled', { addon: addon.name, checked: !selected }); const cur = booking.addons || []; onUpdate({ addons: selected ? cur.filter(a => a.id !== addon.id) : [...cur, { ...addon, price }] }); }}
                      style={{ ...CARD_SEL(selected), display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 20, height: 20, border: selected ? 'none' : '1px solid rgba(200,184,154,0.4)', background: selected ? '#c8b89a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#1a1410', fontSize: 11, fontWeight: 500 }}>{selected && '✓'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410' }}>{addon.name}</div>
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300 }}>{addon.note}</div>
                      </div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#2c2420', flexShrink: 0 }}>+£{price}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card input */}
          {T?.mediaConsentDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(82,183,136,0.08)', border: '1px solid rgba(82,183,136,0.25)', padding: '8px 12px', marginBottom: 12 }}>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#52b788', letterSpacing: '0.06em' }}>Photo consent discount</span>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#52b788', fontWeight: 600 }}>-£{T.mediaConsentDiscount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkle size={7} color="#c8b89a" /> Pay Deposit Today{T ? ` — £${T.deposit.toFixed(2)}` : ''}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', background: '#f2ede6', padding: '4px 10px' }}>
            🔒 Payments handled securely — we never see your card details
          </div>
          <div style={STRIPE_FIELD}>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: '#8b7355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Card Number</div>
            <CardNumberElement options={STRIPE_STYLE} onChange={e => { setPayError(''); if (e.complete && !trackedFieldsRef.current.has('card_number')) { trackedFieldsRef.current.add('card_number'); trackEvent('field_filled', { field: 'card_number' }); } }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...STRIPE_FIELD, flex: 1 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: '#8b7355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Expiry Date</div>
              <CardExpiryElement options={STRIPE_STYLE} onChange={e => { setPayError(''); if (e.complete && !trackedFieldsRef.current.has('card_expiry')) { trackedFieldsRef.current.add('card_expiry'); trackEvent('field_filled', { field: 'card_expiry' }); } }} />
            </div>
            <div style={{ ...STRIPE_FIELD, flex: 1 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: '#8b7355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>CVC</div>
              <CardCvcElement options={STRIPE_STYLE} onChange={e => { setPayError(''); if (e.complete && !trackedFieldsRef.current.has('card_cvc')) { trackedFieldsRef.current.add('card_cvc'); trackEvent('field_filled', { field: 'card_cvc' }); } }} />
            </div>
          </div>

          {payError && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{payError}</p>}

          {/* T&C scroll */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 8 }}>Terms & Conditions — Please read in full before proceeding</div>
            <div onScroll={e => { if (e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 10) setHasScrolled(true); }}
              style={{ height: 180, overflowY: 'scroll', border: '1px solid rgba(200,184,154,0.4)', background: '#fdf8f3', padding: '14px 16px', marginBottom: 10 }}>
              {[
                { heading: '1. Deposit & Payment', body: 'A 30% deposit is required to secure your booking and is charged immediately upon confirmation. The remaining balance will be charged automatically once your clean has been completed and marked as done by our team. By proceeding, you authorise London Cleaning Wizard to charge the remaining balance to your saved payment method upon job completion.' },
                { heading: '2. Cancellation & Rescheduling Policy', body: 'One-off bookings / First Booking: Full refund if cancelled more than 48 hours before the scheduled clean. No refund if cancelled less than 48 hours before the clean.\n\nRegular services (weekly, fortnightly or monthly): You may cancel your recurring arrangement at any time with at least 48 hours notice before your next scheduled clean. For cancellations with less than 48 hours notice, a charge of 30% of that clean\'s price will be applied to your saved payment method, as your cleaner\'s time will have been reserved.\n\nCancelling two consecutive cleans will end your recurring arrangement and your recurring discount. A new booking will be required, subject to standard first-clean pricing.\n\nIf our cleaner arrives at the scheduled time and is refused access or the clean is declined for any reason, this will be treated as a late cancellation and the applicable charge will apply.\n\nAll cancellations must be made by phone call only on 020 8137 0026. Cancellation requests made by email, text, WhatsApp or any other method will not be accepted as valid notice and will not waive any applicable charges. We reserve the right to review pricing with a minimum of 4 weeks written notice.' },
                { heading: '3. Pet Policy', body: 'All pets must be secured and kept away from our cleaning team for the entire duration of the clean. This is for the safety of both your pet and our staff. Failure to secure pets may result in the clean being abandoned without refund of the deposit.' },
                { heading: '4. Access to Property', body: 'You agree to ensure our team has full access to the property at the agreed time. If access is not provided within 15 minutes of the scheduled start time, the clean may be abandoned and no refund will be issued.' },
                { heading: '5. Property Condition & Liability', body: 'You confirm that the property details provided are accurate. London Cleaning Wizard carries full public liability insurance. Any damage must be reported within 24 hours of the clean. We are not liable for pre-existing damage or items of exceptional value not declared prior to the clean.' },
                { heading: '6. Service Standards', body: 'If you are not satisfied with any aspect of your clean, you must notify us within 24 hours and we will arrange a complimentary re-clean of the affected areas. We do not offer refunds after a clean has been completed.' },
                { heading: '7. Cleaner Allocation', body: 'While we always strive to send the same dedicated cleaner for recurring bookings, this cannot be guaranteed. In the event that your usual cleaner is unavailable, we will contact you in advance and arrange an equally skilled replacement.' },
                { heading: '8. Privacy', body: 'Your personal data is processed in accordance with our Privacy Policy. We use your contact details to manage your booking and send confirmations only. We do not sell or share your data with third parties.' },
                { heading: '9. Photo Documentation', body: 'To maintain our service standards and ensure consistent quality, our cleaning team may take before and after photos of completed work. These images are used strictly for internal quality control, training, and verification purposes. They are not used for marketing or social media unless explicit separate consent has been given. All images are stored securely and are deleted within 48 hours after quality review, unless required for resolving a customer query or complaint.' },
              ].map(({ heading, body }) => (
                <div key={heading} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 600, color: '#2c2420', marginBottom: 4 }}>{heading}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</div>
                </div>
              ))}
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontStyle: 'italic', marginTop: 8 }}>London Cleaning Wizard · Registered in England & Wales</div>
            </div>
            {!hasScrolled && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 8, fontStyle: 'italic' }}>↑ Please scroll to the bottom to read the full terms before accepting.</div>}
            <div onClick={() => { if (!hasScrolled) { setPolicyError('Please scroll through and read the full terms before accepting.'); return; } trackEvent('policy_checked', { checked: !policyChecked }); setPolicyChecked(c => !c); setPolicyError(''); }}
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', background: '#2c2420', border: `2px solid ${policyChecked ? '#c8b89a' : hasScrolled ? 'rgba(200,184,154,0.3)' : 'rgba(200,184,154,0.1)'}`, cursor: hasScrolled ? 'pointer' : 'not-allowed' }}>
              <div style={{ width: 24, height: 24, flexShrink: 0, marginTop: 1, border: `2px solid ${policyChecked ? '#2d6a4f' : '#8b7355'}`, background: policyChecked ? '#2d6a4f' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{policyChecked && '✓'}</div>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#f5f0e8', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>I have read and agree to the Terms & Conditions, including the cancellation policy and authorisation to charge my payment method upon job completion.</p>
            </div>
          </div>
          {policyError && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{policyError}</p>}

          {/* Media consent */}
          <div onClick={() => { const next = !mediaConsent; trackEvent('media_consent', { checked: next }); setMediaConsent(next); onUpdate({ mediaConsent: next }); }}
            style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', marginBottom: 8, background: '#2c2420', border: `2px solid ${mediaConsent ? '#c8b89a' : 'rgba(200,184,154,0.3)'}`, cursor: 'pointer' }}>
            <div style={{ flexShrink: 0, marginTop: 1, width: 24, height: 24, border: `2px solid ${mediaConsent ? '#2d6a4f' : '#8b7355'}`, background: mediaConsent ? '#2d6a4f' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{mediaConsent && '✓'}</div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#f5f0e8', fontWeight: 300, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Help us showcase real transformations</p>
                <span style={{ flexShrink: 0, fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 600, color: '#52b788', background: 'rgba(82,183,136,0.12)', padding: '2px 8px', letterSpacing: '0.04em' }}>Save £10</span>
              </div>
              <p style={{ margin: '0 0 6px' }}>We're a new premium cleaning brand, and your home helps us demonstrate the standard we deliver.</p>
              <p style={{ margin: '0 0 6px' }}>With your permission, we may share before &amp; after photos of your clean on our social media.</p>
              <p style={{ margin: '0 0 6px' }}>Your privacy is fully protected. No personal details or identifiable information will ever be shown.</p>
              <p style={{ margin: 0 }}>You can change or withdraw your consent at any time. The £10 discount applies to this booking only.</p>
            </div>
          </div>

          {/* Marketing opt-out */}
          <div onClick={() => { trackEvent('marketing_opt_out', { opted_out: form.marketingOptOut }); setForm(f => ({ ...f, marketingOptOut: !f.marketingOptOut })); }}
            style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', marginBottom: 16, background: '#2c2420', border: `2px solid ${!form.marketingOptOut ? '#c8b89a' : 'rgba(200,184,154,0.3)'}`, cursor: 'pointer' }}>
            <div style={{ flexShrink: 0, marginTop: 1, width: 24, height: 24, border: `2px solid ${!form.marketingOptOut ? '#2d6a4f' : '#8b7355'}`, background: !form.marketingOptOut ? '#2d6a4f' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {!form.marketingOptOut && '✓'}
            </div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#f5f0e8', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>Keep me updated with reminders and occasional offers from London Cleaning Wizard. You can unsubscribe at any time.</p>
          </div>

          {/* Pay button */}
          {submitError && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{submitError}</p>}
          {payError && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{payError}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button onClick={handlePay} disabled={loading}
              style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '14px 24px', background: '#c8b89a', color: '#1a1410', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? <ButtonSpinner /> : <WandIcon size={14} color="#1a1410" />}
              {loading ? 'Processing…' : T ? `Pay Deposit — £${T.deposit.toFixed(2)}` : 'Pay Deposit'}
            </button>
          </div>
          {T && (
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', textAlign: 'center', marginTop: 14, fontWeight: 300 }}>
              Remaining balance of £{T.remaining.toFixed(2)} will be charged once your clean is complete.<br />
              Questions? Call us on 020 8137 0026 · 7 days a week.
            </p>
          )}
    </>
  );
}

export default function BookingStep5({ booking, onUpdate, onSuccess, onBack }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm booking={booking} onUpdate={onUpdate} onSuccess={onSuccess} onBack={onBack} />
    </Elements>
  );
}
