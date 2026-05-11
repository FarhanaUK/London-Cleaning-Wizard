import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import BookingInvoice  from './BookingInvoice';
import BookingStep1    from './Bookingstep1';
import BookingStep2    from './Bookingstep2';
import BookingStep3    from './Bookingstep3';
import BookingStep4    from './Bookingstep4';
import BookingConfirm  from './Bookingconfirm';

const INIT = {
  isAirbnb: false, pkg: null, propertyType: null, size: null,
  freq: null, addons: [], surcharge: 0, supplies: null,
  cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null,
  firstName: '', lastName: '', email: '', phone: '',
  addr1: '', postcode: '', floor: '', parking: '', keys: '',
  notes: '', source: '', isReturning: false,
  stripeDepositIntentId: null, bookingRef: null,
};

const STEPS = ['Service', 'Schedule', 'Details', 'Payment'];

const SESSION_KEY = 'bookingSession';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function BookingPage() {
  const saved = loadSession();
  const [booking,   setBooking]   = useState(saved?.booking || INIT);
  const [step,      setStep]      = useState(saved?.step || 1);
  const [confirmed, setConfirmed] = useState(false);
  const [result,    setResult]    = useState(null);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768);

  const goToStep = (n) => setStep(n);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const update = (partial) => setBooking(b => ({ ...b, ...partial }));

  useEffect(() => {
    return () => sessionStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    if (!confirmed) {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step, booking })); } catch {}
    }
  }, [step, booking, confirmed]);

  useEffect(() => {
    // Patch any overflow:hidden ancestor so sticky works
    const appWrapper = document.querySelector('[style*="overflow"]');
    if (appWrapper) {
      appWrapper.style.overflowX = 'visible';
      return () => { appWrapper.style.overflowX = 'hidden'; };
    }
  }, []);

  // navbar(60) + progressBar(~72) + breathing room(16)
  const SIDEBAR_TOP = 148;

  return (
    <>
      <Helmet>
        <title>Book a Clean | London Cleaning Wizard</title>
        <meta name="description" content="Book residential cleaning, hourly cleans, Airbnb turnarounds and office cleaning across London. Packages from £115 or from £30/hour. Book online today." />
        <link rel="canonical" href="https://londoncleaningwizard.com/book" />
      </Helmet>
      {/* Progress bar */}
      <div style={{
        position: 'sticky',
        top: 60,
        zIndex: 30,
        background: '#1a1410',
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 28,
        paddingRight: 28,
        borderBottom: '1px solid rgba(200,184,154,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', maxWidth: 560 }}>
          {STEPS.map((label, i) => {
            const n = i + 1, done = step > n, active = step === n;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 4 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontFamily: "'Jost',sans-serif",
                    border: done ? 'none' : active ? '1.5px solid #c8b89a' : '1.5px solid rgba(200,184,154,0.2)',
                    background: done ? '#2d6a4f' : 'transparent',
                    color: done ? 'white' : active ? '#c8b89a' : 'rgba(200,184,154,0.3)',
                  }}>
                    {done ? '✓' : n}
                  </div>
                  <div style={{
                    fontFamily: "'Jost',sans-serif", fontSize: 10,
                    letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    color: active ? '#c8b89a' : done ? 'rgba(200,184,154,0.4)' : 'rgba(200,184,154,0.2)',
                  }}>
                    {label}
                  </div>
                </div>
                {n < 4 && (
                  <div style={{
                    flex: 1, height: 1,
                    background: done ? 'rgba(45,106,79,0.5)' : 'rgba(200,184,154,0.1)',
                    margin: '0 8px', marginBottom: 22,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isMobile && <BookingInvoice booking={booking} isMobile />}

      {/* Grid wrapper */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
        alignItems: 'start',
        maxWidth: 1100,
        margin: '0 auto',
        padding: isMobile ? '28px 16px' : '40px 28px 40px',
        gap: 0,
      }}>

        {/* Steps column */}
        <div style={{ paddingRight: isMobile ? 0 : 40, paddingTop: isMobile ? 16 : 80 }}>
          {step === 1 && <BookingStep1 booking={booking} onUpdate={update} onNext={() => goToStep(2)} />}
          {step === 2 && <BookingStep2 booking={booking} onUpdate={update} onNext={() => goToStep(3)} onBack={() => goToStep(1)} />}
          {step === 3 && <BookingStep3 booking={booking} onUpdate={update} onNext={() => goToStep(4)} onBack={() => goToStep(2)} isMobile={isMobile} />}
          {step === 4 && <BookingStep4 booking={booking} onUpdate={update} onSuccess={(res) => { setResult(res); setStep(5); setConfirmed(true); sessionStorage.removeItem(SESSION_KEY); }} onBack={() => goToStep(3)} />}
        </div>

        {/* Desktop invoice sidebar */}
        {!isMobile && (
          <div style={{
            position: 'sticky',
            top: SIDEBAR_TOP,
            alignSelf: 'start',
            maxHeight: `calc(100vh - ${SIDEBAR_TOP + 20}px)`,
            overflowY: 'auto',
            marginTop: 20,
          }}>
            <BookingInvoice booking={booking} />
          </div>
        )}

      </div>

      {confirmed && (
        <BookingConfirm booking={booking} result={result} onClose={() => { setConfirmed(false); setBooking(INIT); setStep(1); sessionStorage.removeItem(SESSION_KEY); }} />
      )}
    </>
  );
}
