import { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../utils/funnelTrack';
import { getPageJourney } from '../utils/siteTrack';
import { Helmet } from 'react-helmet-async';
import BookingInvoice    from './BookingInvoice';
import BookingStepPicker from './BookingStepPicker';
import BookingStep1      from './Bookingstep1';
import BookingStep1b     from './BookingStep1b';
import BookingStep2      from './Bookingstep2';
import BookingStep5      from './BookingStep5';
import BookingConfirm    from './Bookingconfirm';
import { db } from '../firebase/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const INIT = {
  isAirbnb: false, pkg: null, propertyType: null, size: null,
  freq: null, addons: [], surcharge: 0, supplies: null, mopAck: false,
  cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null,
  firstName: '', lastName: '', email: '', phone: '',
  addr1: '', postcode: '', floor: '', parking: '', keys: '',
  notes: '', source: '', isReturning: false,
  stripeDepositIntentId: null, bookingRef: null,
};

const STEPS = ['Service', 'Property', 'Schedule', 'Checkout'];

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
  const [step,      setStep]      = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [result,    setResult]    = useState(null);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768);

  // Funnel tracking — one Firestore doc per browser session, records the highest step reached
  const stepStartTimeRef = useRef(Date.now());
  const prevStepRef      = useRef(null);

  const funnelId = useRef((() => {
    let id = sessionStorage.getItem('bkFunnelId');
    if (!id) { id = `f${Date.now()}${Math.random().toString(36).slice(2, 7)}`; sessionStorage.setItem('bkFunnelId', id); }
    return id;
  })()).current;
  const maxStepTracked = useRef(0);

  // Write pre-booking page journey to Firestore once on mount
  useEffect(() => {
    if (window.location.hostname === 'localhost') return;
    const full = getPageJourney();
    if (!full.length) return;
    // Strip the /book entry itself — it's redundant in a booking session
    // But preserve any referrer it captured (direct Google → /book case)
    const bookEntry = full.find(e => e.path === '/book');
    const journey = full.filter(e => e.path !== '/book');
    const payload = { pageJourney: journey };
    if (bookEntry?.from) payload.referrer = bookEntry.from;
    setDoc(doc(db, 'bookingFunnel', funnelId), payload, { merge: true }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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


  // Write to Firestore only when user advances to a new step (never go backwards)
  useEffect(() => {
    if (window.location.hostname === 'localhost') return;
    if (step <= maxStepTracked.current) return;
    maxStepTracked.current = step;
    const now = new Date();
    setDoc(doc(db, 'bookingFunnel', funnelId), {
      maxStep: step,
      converted: false,
      date: now.toISOString().slice(0, 10),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      updatedAt: serverTimestamp(),
      ...(step === 1 && { startedAt: serverTimestamp() }),
    }, { merge: true }).catch(() => {});
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const now      = Date.now();
    const prevStep = prevStepRef.current;
    if (prevStep !== null) {
      const timeSpent = Math.round((now - stepStartTimeRef.current) / 1000);
      trackEvent('step_left', { step: prevStep, timeSpent, nextStep: step });
    }
    trackEvent('step_entered', { step, direction: prevStep === null ? 'start' : step > prevStep ? 'forward' : 'back' });
    stepStartTimeRef.current = now;
    prevStepRef.current = step;
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire step_left when the tab is hidden (user switches away or closes) so we always capture time
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'hidden') return;
      const s = prevStepRef.current;
      if (s === null) return;
      const timeSpent = Math.round((Date.now() - stepStartTimeRef.current) / 1000);
      trackEvent('step_left', { step: s, timeSpent, nextStep: null });
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // navbar(60) + progressBar(~95) + breathing room(20)
  const SIDEBAR_TOP = 175;

  return (
    <>
      <Helmet>
        <title>Book a Clean | London Cleaning Wizard</title>
        <meta name="description" content="Book residential cleaning, hourly cleans, Airbnb turnarounds and office cleaning across London. Packages from £115 or from £30/hour. Book online today." />
        <link rel="canonical" href="https://londoncleaningwizard.com/book" />
      </Helmet>

      {/* Progress bar — always visible on desktop; hidden on mobile step 1 only */}
      {(step > 1 || !isMobile) && (
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
              const n = i + 1, displayStep = step - 1, done = displayStep > n, active = displayStep === n;
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
      )}

      {/* Mobile invoice — only shown once a package is being selected (step 2+) */}
      {isMobile && step > 1 && <BookingInvoice booking={booking} isMobile />}

      {/* Grid wrapper */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
        alignItems: isMobile ? 'start' : 'stretch',
        maxWidth: 1100,
        margin: '0 auto',
        padding: isMobile ? (step === 1 ? '72px 16px 0' : '28px 16px') : '40px 28px 40px',
        gap: 0,
      }}>

        {/* Steps column */}
        <div style={{ paddingRight: isMobile ? 0 : 40, paddingTop: isMobile ? (step === 1 ? 0 : 16) : 80, display: isMobile ? 'block' : 'flex', flexDirection: 'column' }}>
          {step === 1 && <BookingStepPicker onNext={() => goToStep(2)} isMobile={isMobile} />}
          {step === 2 && <BookingStep1 booking={booking} onUpdate={update} onNext={() => goToStep(booking.pkg?.id === 'office_cleaning' ? 4 : 3)} onBack={() => goToStep(1)} />}
          {step === 3 && <BookingStep1b booking={booking} onUpdate={update} onNext={() => goToStep(4)} onBack={() => goToStep(2)} />}
          {step === 4 && <BookingStep2 booking={booking} onUpdate={update} onNext={() => goToStep(5)} onBack={() => goToStep(booking.pkg?.id === 'office_cleaning' ? 2 : 3)} isMobile={isMobile} />}
          {step === 5 && <BookingStep5 booking={booking} onUpdate={update} onSuccess={(res) => {
            if (localStorage.getItem('lcw_test_mode') !== '1' && window.location.hostname !== 'localhost') {
              setDoc(doc(db, 'bookingFunnel', funnelId), { converted: true, maxStep: 6, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
            }
            sessionStorage.removeItem('bkFunnelId');
            sessionStorage.removeItem(SESSION_KEY);
            window.location.href = '/booking-success';
          }} onBack={() => goToStep(4)} />}
        </div>

        {/* Desktop invoice sidebar */}
        {!isMobile && (
          <div style={{
            position: 'sticky',
            top: SIDEBAR_TOP,
            alignSelf: 'start',
            maxHeight: `calc(100vh - ${SIDEBAR_TOP + 20}px)`,
            overflowY: 'auto',
            marginTop: (step === 1 || step === 3 || step === 4) ? 51 : 40,
          }}>
            <BookingInvoice booking={booking} />
          </div>
        )}

      </div>

      {confirmed && (
        <BookingConfirm booking={booking} result={result} onClose={() => { setConfirmed(false); setBooking(INIT); setStep(1); sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem('pkgTab'); }} />
      )}
    </>
  );
}
