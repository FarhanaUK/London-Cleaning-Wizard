import { useState, useEffect } from 'react';
import BookingInvoice  from './BookingInvoice';
import BookingStep1    from './BookingStep1';
import BookingStep2    from './BookingStep2';
import BookingStep3    from './BookingStep3';
import BookingStep4    from './BookingStep4';
import BookingConfirm  from './BookingConfirm';
import Navbar          from './Navbar';

const INIT = {
  isAirbnb: false, pkg: null, propertyType: null, size: null,
  freq: null, addons: [], surcharge: 0,
  cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null,
  firstName: '', lastName: '', email: '', phone: '',
  addr1: '', postcode: '', floor: '', parking: '', keys: '',
  notes: '', source: '', isReturning: false,
  stripeDepositIntentId: null, bookingRef: null,
};

const STEPS = ['Service', 'Schedule', 'Details', 'Payment'];

export default function BookingPage() {
  const [booking,   setBooking]   = useState(INIT);
  const [step,      setStep]      = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [result,    setResult]    = useState(null);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768);

  const goToStep = (n) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const update = (partial) => setBooking(b => ({ ...b, ...partial }));

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
      <Navbar />

      {isMobile && <BookingInvoice booking={booking} isMobile />}

      {/* Progress bar */}
      <div style={{
        position: 'sticky',
        top: isMobile ? 105 : 60,
        zIndex: 20,
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

      {/* Grid wrapper */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
        alignItems: 'start',          // ← stops grid stretching both columns to same height
        maxWidth: 1100,
        margin: '0 auto',
        padding: isMobile ? '28px 16px' : '40px 28px 40px',
        gap: 0,
      }}>

        {/* Steps column */}
        <div style={{ paddingRight: isMobile ? 0 : 40, paddingTop: 80 }}>
          {step === 1 && <BookingStep1 booking={booking} onUpdate={update} onNext={() => goToStep(2)} />}
          {step === 2 && <BookingStep2 booking={booking} onUpdate={update} onNext={() => goToStep(3)} onBack={() => goToStep(1)} />}
          {step === 3 && <BookingStep3 booking={booking} onUpdate={update} onNext={() => goToStep(4)} onBack={() => goToStep(2)} isMobile={isMobile} />}
          {step === 4 && <BookingStep4 booking={booking} onUpdate={update} onSuccess={(res) => { setResult(res); setConfirmed(true); }} onBack={() => goToStep(3)} />}
        </div>

        {/* Desktop invoice sidebar */}
        {!isMobile && (
          <div style={{
            position: 'sticky',
            top: SIDEBAR_TOP,
            alignSelf: 'start',
            maxHeight: `calc(100vh - ${SIDEBAR_TOP + 20}px)`,  // ← never taller than remaining viewport
            overflowY: 'auto',                                  // ← scrolls internally if content overflows
            marginTop: 20,
          }}>
            <BookingInvoice booking={booking} />
          </div>
        )}

      </div>

      {confirmed && (
        <BookingConfirm booking={booking} result={result} onClose={() => setConfirmed(false)} />
      )}
    </>
  );
}