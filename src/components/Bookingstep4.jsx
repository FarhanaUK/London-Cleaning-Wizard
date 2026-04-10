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
  const [hasScrolled,   setHasScrolled]   = useState(false);

  const handleTCScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 10) setHasScrolled(true);
  };

  // First booking is always full price — discount applies from 2nd clean onwards
  const T = calculateTotal({
    sizePrice:    booking.size?.basePrice || 0,
    propertyType: booking.propertyType,
    frequency:    null,
    addons:       booking.addons || [],
    surcharge:    0,
    supplies:     booking.supplies,
  });

  const handlePay = async () => {
    if (!policyChecked) { setPolicyError('Please read and accept the cancellation policy to continue.'); return; }
    setPolicyError('');
    setPayError('');
    if (!stripe || !elements) return;

    // Check the date hasn't been blocked since the customer selected it
    if (booking.cleanDate) {
      const [y, m] = booking.cleanDate.split('-').map(Number);
      try {
        const res  = await fetch(`${import.meta.env.VITE_CF_GET_BLOCKED_DATES}?year=${y}&month=${m}`);
        if (!res.ok) throw new Error('Check failed');
        const data = await res.json();
        if ((data.blocked || []).includes(booking.cleanDate)) {
          setPayError('Sorry, this date is no longer available. Please go back and choose another day.');
          return;
        }
      } catch {
        setPayError('Unable to verify availability. Please refresh the page and try again.');
        return;
      }
    }

    setLoading(true);
    setOverlayTitle('Securing your booking…');
    setOverlaySub('Please don\'t close this window');

    try {
      // Step 1: Create PaymentIntent
      const piRes = await fetch(import.meta.env.VITE_CF_CREATE_PAYMENT_INTENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(parseFloat(T.deposit) * 100), bookingRef: 'pending' }),
      });
      const { clientSecret, customerId } = await piRes.json();

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
            total:                 parseFloat(T.subtotal),
            deposit:               parseFloat(T.deposit),
            remaining:             parseFloat(T.remaining),
            stripeDepositIntentId: paymentIntent.id,
            stripeCustomerId:      customerId,
          }),
        });

        const saveData = await saveRes.json();
        if (!saveRes.ok) {
          setPayError(saveData.error || 'Your booking could not be saved. Please call us on 020 8137 0026 — your payment has been taken and we will manually confirm your booking.');
          setLoading(false);
          return;
        }
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
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#c8b89a', fontWeight: 300 }}>£{T.subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, fontFamily: "'Jost',sans-serif" }}>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>Deposit due today (30%)</span>
          <span style={{ color: '#c8b89a', fontWeight: 500 }}>£{T.deposit.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, fontFamily: "'Jost',sans-serif" }}>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>Balance due on completion</span>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>£{T.remaining.toFixed(2)}</span>
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

      {/* Terms & Conditions */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 8 }}>
          Terms & Conditions — Please read in full before proceeding
        </div>
        <div
          onScroll={handleTCScroll}
          style={{ height: 180, overflowY: 'scroll', border: '1px solid rgba(200,184,154,0.4)', background: '#fdf8f3', padding: '14px 16px', marginBottom: 10 }}
        >
          {[
            { heading: '1. Deposit & Payment', body: 'A 30% deposit is required to secure your booking and is charged immediately upon confirmation. The remaining balance will be charged automatically once your clean has been completed and marked as done by our team. By proceeding, you authorise London Cleaning Wizard to charge the remaining balance to your saved payment method upon job completion.' },
            { heading: '2. Cancellation & Rescheduling Policy', body: 'One-off bookings: Full refund if cancelled more than 48 hours before the scheduled clean. No refund if cancelled less than 48 hours before the clean.\n\nRegular services (weekly, fortnightly or monthly): You may cancel your recurring arrangement at any time with at least 48 hours notice before your next scheduled clean. No refund will be issued for cancellations or skipped cleans with less than 48 hours notice, as your cleaner\'s time will have been reserved.\n\nCancelling two consecutive cleans will end your recurring arrangement and your recurring discount. A new booking will be required, subject to standard first-clean pricing.\n\nAll cancellations must be made by contacting us directly. We reserve the right to review pricing with a minimum of 4 weeks written notice.' },
            { heading: '3. Pet Policy', body: 'All pets must be secured and kept away from our cleaning team for the entire duration of the clean. This is for the safety of both your pet and our staff. Failure to secure pets may result in the clean being abandoned without refund of the deposit.' },
            { heading: '4. Access to Property', body: 'You agree to ensure our team has full access to the property at the agreed time. If access is not provided within 15 minutes of the scheduled start time, the clean may be abandoned and no refund will be issued.' },
            { heading: '5. Property Condition & Liability', body: 'You confirm that the property details provided are accurate. London Cleaning Wizard carries full public liability insurance. Any damage must be reported within 24 hours of the clean. We are not liable for pre-existing damage or items of exceptional value not declared prior to the clean.' },
            { heading: '6. Service Standards', body: 'If you are not satisfied with any aspect of your clean, you must notify us within 24 hours and we will arrange a complimentary re-clean of the affected areas. We do not offer refunds after a clean has been completed.' },
            { heading: '7. Cleaner Allocation', body: 'While we always strive to send the same dedicated cleaner for recurring bookings, this cannot be guaranteed. In the event that your usual cleaner is unavailable, we will contact you in advance and arrange an equally skilled replacement.' },
            { heading: '8. Privacy', body: 'Your personal data is processed in accordance with our Privacy Policy. We use your contact details to manage your booking and send confirmations only. We do not sell or share your data with third parties.' },
          ].map(({ heading, body }) => (
            <div key={heading} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, fontWeight: 600, color: '#2c2420', marginBottom: 4 }}>{heading}</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</div>
            </div>
          ))}
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontStyle: 'italic', marginTop: 8 }}>
            London Cleaning Wizard · Registered in England & Wales
          </div>
        </div>

        {!hasScrolled && (
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', marginBottom: 8, fontStyle: 'italic' }}>
            ↑ Please scroll to the bottom to read the full terms before accepting.
          </div>
        )}

        <div
          onClick={() => { if (!hasScrolled) { setPolicyError('Please scroll through and read the full terms before accepting.'); return; } setPolicyChecked(c => !c); setPolicyError(''); }}
          style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#f2ede6', cursor: hasScrolled ? 'pointer' : 'not-allowed', opacity: hasScrolled ? 1 : 0.5 }}
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
            I have read and agree to the Terms & Conditions, including the cancellation policy and authorisation to charge my payment method upon job completion.
          </p>
        </div>
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
          {loading ? 'Processing…' : `Pay Deposit — £${T.deposit.toFixed(2)}`}
        </button>
      </div>

      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', textAlign: 'center', marginTop: 14, fontWeight: 300 }}>
        Remaining balance of £{T.remaining.toFixed(2)} will be charged once your clean is complete.<br />
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