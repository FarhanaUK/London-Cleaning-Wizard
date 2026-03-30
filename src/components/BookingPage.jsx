import { useState, useEffect } from 'react';
import BookingInvoice  from './BookingInvoice';
import BookingStep1   from './BookingStep1';
import BookingStep2   from './BookingStep2';
import BookingStep3   from './BookingStep3';
import BookingStep4   from './BookingStep4';
import BookingConfirm from './BookingConfirm';
import Navbar         from './Navbar';

const INIT = {
  // Step 1
  isAirbnb: false, pkg: null, propertyType: null, size: null,
  freq: null, addons: [], surcharge: 0,
  // Step 2
  cleanDate: null, cleanDateDisplay: null, cleanTime: null, cleanDateUTC: null,
  // Step 3
  firstName: '', lastName: '', email: '', phone: '',
  addr1: '', postcode: '', floor: '', parking: '', keys: '',
  notes: '', source: '', isReturning: false,
  // Step 4
  stripeDepositIntentId: null, bookingRef: null,
};

const STEPS = ['Service', 'Schedule', 'Details', 'Payment'];

export default function BookingPage() {
  const [booking,   setBooking]   = useState(INIT);
  const [step,      setStep]      = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const update = (partial) => setBooking(b => ({ ...b, ...partial }));

  return (
    <>
      <Navbar />

      <div style={{ background:'#1a1410', padding:'0 28px 20px', paddingTop:80 }}>
        <div style={{ display:'flex', alignItems:'center', maxWidth:600, gap:0 }}>
          {STEPS.map((label, i) => {
            const n = i + 1, done = step > n, active = step === n;
            return (
              <div key={n} style={{ display:'flex', alignItems:'center', flex: n < 4 ? 1 : 0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', display:'flex',
                    alignItems:'center', justifyContent:'center', fontSize:11,
                    fontFamily:"'Jost',sans-serif",
                    border: done ? 'none' : active ? '1.5px solid #c8b89a' : '1.5px solid rgba(200,184,154,0.2)',
                    background: done ? '#2d6a4f' : 'transparent',
                    color: done ? 'white' : active ? '#c8b89a' : 'rgba(200,184,154,0.3)',
                  }}>{done ? '✓' : n}</div>
                  <div style={{ fontFamily:"'Jost',sans-serif", fontSize:10, letterSpacing:'0.1em',
                    textTransform:'uppercase', whiteSpace:'nowrap',
                    color: active ? '#c8b89a' : done ? 'rgba(200,184,154,0.4)' : 'rgba(200,184,154,0.2)',
                  }}>{label}</div>
                </div>
                {n < 4 && <div style={{ flex:1, height:1,
                  background: done ? 'rgba(45,106,79,0.5)' : 'rgba(200,184,154,0.1)',
                  margin:'0 8px', marginBottom:22 }} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
        gap:28, maxWidth:1060, margin:'0 auto',
        padding: isMobile ? '28px 16px' : '36px 28px' }}>

        <div>
          {step === 1 && <BookingStep1 booking={booking} onUpdate={update} onNext={() => setStep(2)} />}
          {step === 2 && <BookingStep2 booking={booking} onUpdate={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <BookingStep3 booking={booking} onUpdate={update} onNext={() => setStep(4)} onBack={() => setStep(2)} isMobile={isMobile} />}
          {step === 4 && <BookingStep4 booking={booking} onUpdate={update} onSuccess={() => setConfirmed(true)} onBack={() => setStep(3)} />}
        </div>

        {!isMobile && <BookingInvoice booking={booking} />}
        {isMobile  && step === 1 && <BookingInvoice booking={booking} isMobile />}
      </div>

      {confirmed && <BookingConfirm booking={booking} onClose={() => setConfirmed(false)} />}
    </>
  );
}