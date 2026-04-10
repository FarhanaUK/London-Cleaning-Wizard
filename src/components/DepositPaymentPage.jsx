import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FullOverlay, ButtonSpinner } from './LoadingStates';
import { LogoMark } from './Icons';

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
  insufficient_funds:      'Your card has insufficient funds.',
  incorrect_cvc:           'Your security code (CVC) is incorrect.',
  expired_card:            'Your card has expired.',
  incorrect_number:        'Your card number is incorrect.',
  processing_error:        'There was an error processing your payment. Please try again.',
  authentication_required: 'Your bank requires extra verification. Please follow the on-screen steps.',
};

function PaymentForm({ details, bookingId }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading,      setLoading]      = useState(false);
  const [overlay,      setOverlay]      = useState('');
  const [overlaySub,   setOverlaySub]   = useState('');
  const [payError,     setPayError]     = useState('');
  const [done,         setDone]         = useState(false);
  const [tcAgreed,     setTcAgreed]     = useState(false);
  const [policyError,  setPolicyError]  = useState('');
  const [hasScrolled,  setHasScrolled]  = useState(false);

  const handleTCScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 10) setHasScrolled(true);
  };

  const handlePay = async () => {
    if (!stripe || !elements) return;
    if (!tcAgreed) { setPolicyError('Please read and accept the Terms & Conditions to continue.'); return; }
    setPolicyError('');
    setLoading(true);
    setOverlay('Authorising payment…');
    setOverlaySub('Please don\'t close this window');

    const { error, paymentIntent } = await stripe.confirmCardPayment(details.clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (error) {
      setPayError(STRIPE_ERRORS[error.code] || error.message || 'Payment failed. Please call us on 020 8137 0026.');
      setLoading(false);
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      setOverlay('Confirming your deposit…');
      setOverlaySub('Almost done');
      try {
        await fetch(import.meta.env.VITE_CF_CONFIRM_DEPOSIT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, paymentIntentId: paymentIntent.id }),
        });
        // Google Ads conversion tracking
        if (window.gtag) {
          window.gtag('event', 'conversion', {
            send_to:        'AW-18070855826/aERaCJn-u5ccEJLB7ahD',
            value:          parseFloat(details.deposit),
            currency:       'GBP',
            transaction_id: details.bookingRef,
          });
        }
        setDone(true);
      } catch {
        setPayError('Payment was taken but we couldn\'t confirm. Please call us on 020 8137 0026 with your booking ref: ' + details.bookingRef);
      }
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, color: '#1a1410', marginBottom: 12 }}>
        Deposit Paid
      </div>
      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.8, marginBottom: 24 }}>
        Thank you, {details.firstName}. Your deposit of £{details.deposit} has been received.<br />
        Your booking is confirmed. We'll see you on {details.cleanDate} at {details.cleanTime}.
      </div>
      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', letterSpacing: '0.1em' }}>
        Booking ref: {details.bookingRef}
      </div>
    </div>
  );

  return (
    <>
      <FullOverlay show={loading} title={overlay} sub={overlaySub} />

      {/* Summary */}
      <div style={{ border: '1px solid rgba(200,184,154,0.3)', padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 12 }}>
          Booking Summary
        </div>
        {[
          { l: `${details.packageName} · ${details.size}`, v: `£${details.total}` },
          { l: 'Clean Date',  v: details.cleanDate },
          { l: 'Clean Time',  v: details.cleanTime },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid rgba(200,184,154,0.15)', fontFamily: "'Jost',sans-serif" }}>
            <span style={{ color: '#6b5e56', fontWeight: 300 }}>{row.l}</span>
            <span style={{ color: '#2c2420', fontWeight: 500 }}>{row.v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, fontFamily: "'Jost',sans-serif" }}>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>Deposit due today (30%)</span>
          <span style={{ color: '#c8b89a', fontWeight: 600, fontSize: 16 }}>£{details.deposit}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, fontFamily: "'Jost',sans-serif" }}>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>Balance due on completion</span>
          <span style={{ color: '#8b7355', fontWeight: 300 }}>£{details.remaining}</span>
        </div>
      </div>

      {/* Card input */}
      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 8 }}>
        Card Details
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', background: '#f2ede6', padding: '4px 10px' }}>
        🔒 Payments handled securely — we never see your card details
      </div>
      <div style={{ border: '1px solid rgba(200,184,154,0.4)', padding: '14px 16px', marginBottom: 16 }}>
        <CardElement options={CARD_STYLE} />
      </div>

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
          onClick={() => { if (!hasScrolled) { setPolicyError('Please scroll through and read the full terms before accepting.'); return; } setTcAgreed(c => !c); setPolicyError(''); }}
          style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#f2ede6', cursor: hasScrolled ? 'pointer' : 'not-allowed', opacity: hasScrolled ? 1 : 0.5 }}
        >
          <div style={{
            width: 16, height: 16,
            border: tcAgreed ? 'none' : '1px solid rgba(200,184,154,0.5)',
            background: tcAgreed ? '#c8b89a' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2, color: '#1a1410', fontSize: 10,
          }}>
            {tcAgreed && '✓'}
          </div>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
            I have read and agree to the Terms & Conditions, including the cancellation policy and authorisation to charge my payment method upon job completion.
          </p>
        </div>
      </div>
      {policyError && <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>{policyError}</p>}

      {payError && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {payError}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          width: '100%', fontFamily: "'Jost',sans-serif", fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
          padding: '15px 24px', background: '#c8b89a', color: '#1a1410',
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {loading ? <ButtonSpinner /> : null}
        {loading ? 'Processing…' : `Pay Deposit — £${details.deposit}`}
      </button>

      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', textAlign: 'center', marginTop: 14, fontWeight: 300 }}>
        The remaining balance of £{details.remaining} will be charged once your clean is complete.<br />
        Questions? Call us on 020 8137 0026 · 7 days a week.
      </p>
    </>
  );
}

export default function DepositPaymentPage() {
  const [searchParams]  = useSearchParams();
  const bookingId       = searchParams.get('bookingId');
  const [details,  setDetails]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!bookingId) { setError('Invalid payment link.'); setLoading(false); return; }
    fetch(`${import.meta.env.VITE_CF_GET_DEPOSIT_DETAILS}?bookingId=${bookingId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else { setDetails(data); }
      })
      .catch(() => setError('Failed to load booking details. Please try again or call us on 020 8137 0026.'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F4' }}>
      <div style={{ background: '#1a1410', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoMark size={28} color="#c8b89a" />
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: '#f5f0e8' }}>
          London Cleaning Wizard
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 24px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#1a1410', marginBottom: 6 }}>
          Pay Your Deposit
        </div>
        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300, marginBottom: 32 }}>
          Secure your booking by paying your 30% deposit below.
        </div>

        {loading && (
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355' }}>Loading…</p>
        )}

        {error && (
          <div style={{ background: '#fdf5f5', border: '1px solid rgba(139,32,32,0.2)', padding: '16px 20px', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#6b1010' }}>
            {error}
          </div>
        )}

        {details && (
          <Elements stripe={stripePromise}>
            <PaymentForm details={details} bookingId={bookingId} />
          </Elements>
        )}
      </div>
    </div>
  );
}
