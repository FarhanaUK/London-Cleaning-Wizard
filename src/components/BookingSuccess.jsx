import { useEffect, useState } from 'react';
import ConfirmCard from './ConfirmCard';

export default function BookingSuccess() {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('bookingSuccess');
    if (stored) {
      const data = JSON.parse(stored);
      setDetails(data);
      sessionStorage.removeItem('bookingSuccess');
      if (window.gtag) {
        window.gtag('event', 'conversion', {
          send_to:        'AW-18070855826/E-wKCMPTmZocEJLB7ahD',
          value:          parseFloat(data.deposit),
          currency:       'GBP',
          transaction_id: data.bookingRef,
        });
      }
    }
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.88)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ background: '#FAF8F4', maxWidth: 480, width: '100%', padding: '40px 36px' }}>
        <ConfirmCard details={details} />
      </div>
    </div>
  );
}
