import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!email) return;
    setStatus('loading');
    fetch(import.meta.env.VITE_CF_UNSUBSCRIBE_MARKETING, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(r => r.ok ? setStatus('done') : setStatus('error'))
      .catch(() => setStatus('error'));
  }, [email]);

  return (
    <div style={{ background: '#faf9f7', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ background: '#2c2420', padding: '24px', textAlign: 'center', marginBottom: 32, width: '100%', maxWidth: 480 }}>
        <div style={{ color: '#c8b89a', fontSize: 22, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          London Cleaning Wizard
        </div>
        <div style={{ color: 'rgba(200,184,154,0.6)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>
          Est. East London
        </div>
      </div>

      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {!email && (
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: '#5a4e44' }}>
            No email address provided. Please use the unsubscribe link from your email.
          </p>
        )}

        {status === 'loading' && (
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: '#5a4e44' }}>
            Unsubscribing…
          </p>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 16, fontWeight: 500, color: '#2c2420', marginBottom: 8 }}>
              You've been unsubscribed.
            </p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300, lineHeight: 1.8 }}>
              We've removed <strong>{email}</strong> from our marketing list. You won't receive any further promotional emails from us.
            </p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300, lineHeight: 1.8, marginTop: 16 }}>
              You'll still receive emails about any active bookings you have with us.
            </p>
          </>
        )}

        {status === 'error' && (
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: '#7a1a1a' }}>
            Something went wrong. Please email us at bookings@londoncleaningwizard.com to be removed.
          </p>
        )}
      </div>
    </div>
  );
}
