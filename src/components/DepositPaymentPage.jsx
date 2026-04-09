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
  const [loading,   setLoading]   = useState(false);
  const [overlay,   setOverlay]   = useState('');
  const [overlaySub, setOverlaySub] = useState('');
  const [payError,  setPayError]  = useState('');
  const [done,      setDone]      = useState(false);
  const [tcAgreed,  setTcAgreed]  = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    if (!tcAgreed) { setPayError('Please agree to the Terms & Conditions before paying.'); return; }
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

      {/* T&C agreement */}
      <div
        onClick={() => { setTcAgreed(c => !c); setPayError(''); }}
        style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#f2ede6', cursor: 'pointer', marginBottom: 16 }}
      >
        <div style={{
          width: 18, height: 18, flexShrink: 0, marginTop: 1,
          border: tcAgreed ? 'none' : '1.5px solid rgba(200,184,154,0.6)',
          background: tcAgreed ? '#c8b89a' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#1a1410', fontSize: 11, fontWeight: 600,
        }}>
          {tcAgreed && '✓'}
        </div>
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
          I have read and agree to the{' '}
          <a
            href="https://londoncleaningwizard.com/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: '#c8b89a', textDecoration: 'underline' }}
          >
            Terms & Conditions
          </a>
          , including the cancellation policy and authorisation to charge the remaining balance upon job completion.
        </p>
      </div>

      {payError && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {payError}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={loading || !tcAgreed}
        style={{
          width: '100%', fontFamily: "'Jost',sans-serif", fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500,
          padding: '15px 24px', background: '#c8b89a', color: '#1a1410',
          border: 'none', cursor: loading || !tcAgreed ? 'not-allowed' : 'pointer',
          opacity: tcAgreed ? 1 : 0.5,
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
