import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FullOverlay, ButtonSpinner } from './LoadingStates';
import { calculateTotal } from '../data/siteData';
import { Sparkle, WandIcon } from './Icons';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CARD_STYLE = {
  hidePostalCode: true,
  style: {
    base: {
      fontFamily: "'Jost', sans-serif",
      fontSize: '15px',
      color: '#2c2420',
      '::placeholder': { color: 'rgba(139,115,85,0.5)' },
    },
    invalid: { color: '#8b2020' },
  },
};

const STRIPE_ERRORS = {
  card_declined:           'Your card was declined. Please try a different card.',
  insufficient_funds:      'Your card has insufficient funds. Please try a different card.',
  incorrect_cvc:           'Your security code (CVC) is incorrect. Please check and try again.',
  expired_card:            'Your card has expired. Please use a different card.',
  incorrect_number:        'Your card number is incorrect. Please check and try again.',
  processing_error:        'There was an error processing your payment. Please try again.',
  authentication_required: 'Your bank requires extra verification. Please follow the on-screen steps.',
};

function PaymentForm({ booking, onSuccess, onBack }) {
  const stripe   = useStripe();
  const elements = useElements();

  const [loading,       setLoading]       = useState(false);
  const [overlayTitle,  setOverlayTitle]  = useState('');
  const [overlaySub,    setOverlaySub]    = useState('');
  const [policyChecked, setPolicyChecked] = useState(false);
  const [policyError,   setPolicyError]   = useState('');
  const [payError,      setPayError]      = useState('');

  const T = calculateTotal({
    sizePrice:    booking.size?.basePrice || 0,
    propertyType: booking.propertyType,
    frequency:    booking.freq,
    addons:       booking.addons || [],
    surcharge:    0,
  });

  const handlePay = async () => {
    if (!policyChecked) { setPolicyError('Please read and accept the cancellation policy to continue.'); return; }
    setPolicyError('');
    setPayError('');
    if (!stripe || !elements) return;

    setLoading(true);
    setOverlayTitle('Securing your booking…');
    setOverlaySub('Please don\'t close this window');

    try {
      // Step 1: Create PaymentIntent
      const piRes = await fetch(import.meta.env.VITE_CF_CREATE_PAYMENT_INTENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: T.deposit * 100, bookingRef: 'pending' }),
      });
      const { clientSecret } = await piRes.json();

      setOverlayTitle('Authorising payment…');
      setOverlaySub('Verifying your card details securely');

      // Step 2: Confirm card payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (error) {
        setPayError(STRIPE_ERRORS[error.code] || error.message || 'Payment failed. Please try again or call us on 020 8137 0026.');
        setLoading(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        setOverlayTitle('Confirming your booking…');
        setOverlaySub('Sending confirmation to your email');

        // Step 3: Save booking to Firestore
        const saveRes = await fetch(import.meta.env.VITE_CF_SAVE_BOOKING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...booking,
            package:               booking.pkg?.id,
            packageName:           booking.pkg?.name,
            size:                  booking.size?.id,
            frequency:             booking.freq?.id,
            total:                 T.subtotal,
            deposit:               T.deposit,
            remaining:             T.remaining,
            stripeDepositIntentId: paymentIntent.id,
          }),
        });

        const saveData = await saveRes.json();
        setLoading(false);
        onSuccess({ bookingRef: saveData.bookingRef, deposit: T.deposit, remaining: T.remaining });
      }
    } catch {
      setPayError('Something went wrong. Please try again or call us on 020 8137 0026.');
      setLoading(false);
    }
  };

  return (
    <>
      <FullOverlay show={loading} title={overlayTitle} sub={overlaySub} />

      {/* Booking summary */}
      <div style={{ border: '1px solid rgba(200,184,154,0.3)', padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 12 }}>
          Booking Summary
        </div>
        {[
          { l: `${booking.pkg?.name} · ${booking.size?.label}`, v: `£${T.base}` },
          T.freqSave > 0 && { l: `${booking.freq?.label} discount`, v: `-£${T.freqSave}`, grn: true },
          ...(booking.addons||[]).map(a => ({ l: a.name, v: `+£${a.price}` })),
        ].filter(Boolean).map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid rgba(200,184,154,0.15)', fontFamily: "'Jost',sans-serif" }}>
            <span style={{ color: '#6b5e56', fontWeight: 300 }}>{row.l}</span>
            <span style={{ color: row.grn ? '#2d6a4f' : '#2c2420', fontWeight: 500 }}>{row.v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b7355' }}>Total</span>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#c8b89a', fontWeight: 300 }}>£{T.subtotal}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, fontFamily: "'Jost',sans-serif" }}>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>Deposit due today (30%)</span>
          <span style={{ color: '#c8b89a', fontWeight: 500 }}>£{T.deposit}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, fontFamily: "'Jost',sans-serif" }}>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>Balance due on completion</span>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>£{T.remaining}</span>
        </div>
      </div>

      {/* Card input */}
      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkle size={7} color="#c8b89a" /> Pay Deposit Today
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', background: '#f2ede6', padding: '4px 10px' }}>
        🔒 Payments handled securely — we never see your card details
      </div>
      <div style={{ border: '1px solid rgba(200,184,154,0.4)', padding: '14px 16px', marginBottom: 16 }}>
        <CardElement options={CARD_STYLE} />
      </div>

      {payError && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {payError}
        </p>
      )}

      {/* Cancellation policy */}
      <div
        onClick={() => { setPolicyChecked(c => !c); setPolicyError(''); }}
        style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#f2ede6', cursor: 'pointer', marginBottom: 8 }}
      >
        <div style={{
          width: 16, height: 16,
          border: policyChecked ? 'none' : '1px solid rgba(200,184,154,0.5)',
          background: policyChecked ? '#c8b89a' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2, color: '#1a1410', fontSize: 10,
        }}>
          {policyChecked && '✓'}
        </div>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
          I have read and agree to the cancellation policy: full refund if cancelled 48hrs+ before the clean. 50% refund if cancelled within 48hrs. No refund for same-day cancellations. I confirm the property details provided are accurate.
        </p>
      </div>
      {policyError && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{policyError}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <button onClick={onBack} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '14px 20px', background: 'transparent', color: '#2c2420', border: '1px solid rgba(200,184,154,0.4)', cursor: 'pointer' }}>
          ← Back
        </button>
        <button
          onClick={handlePay}
          disabled={loading}
          style={{ flex: 1, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '14px 24px', background: '#c8b89a', color: '#1a1410', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          {loading ? <ButtonSpinner /> : <WandIcon size={14} color="#1a1410" />}
          {loading ? 'Processing…' : `Pay Deposit — £${T.deposit}`}
        </button>
      </div>

      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', textAlign: 'center', marginTop: 14, fontWeight: 300 }}>
        Remaining balance of £{T.remaining} will be charged once your clean is complete.<br />
        Questions? Call us on 020 8137 0026 · 7 days a week.
      </p>
    </>
  );
}

export default function BookingStep4({ booking, onSuccess, onBack }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm booking={booking} onSuccess={onSuccess} onBack={onBack} />
    </Elements>
  );
}