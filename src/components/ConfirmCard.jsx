export default function ConfirmCard({ details }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 40, color: '#c8b89a', marginBottom: 16 }}>✦</div>

      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, color: '#1a1410', marginBottom: 8 }}>
        Booking Confirmed
      </h2>

      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        Your home is in good hands. We've sent a confirmation to your email
        and will text you 30 minutes before arrival.
      </p>

      {details && (
        <div style={{ background: '#F2EDE5', padding: '16px 20px', textAlign: 'left', marginBottom: 20 }}>
          {[
            { l: 'Service',              v: `${details.packageName}${details.size ? ' · ' + details.size : ''}` },
            { l: 'Date',                 v: details.cleanDate },
            { l: 'Time',                 v: details.cleanTime },
            details.address ? { l: 'Address', v: details.address } : null,
            { l: 'Deposit paid',         v: `£${details.deposit}`, gold: true },
            { l: 'Balance on clean day', v: `£${details.remaining}` },
          ].filter(Boolean).map(row => (
            <div key={row.l} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 13, padding: '5px 0',
              borderBottom: '0.5px solid rgba(200,184,154,0.2)',
              fontFamily: "'Jost',sans-serif",
            }}>
              <span style={{ color: '#8b7355', fontWeight: 300 }}>{row.l}</span>
              <span style={{ color: row.gold ? '#2d6a4f' : '#1a1410', fontWeight: 500 }}>{row.v}</span>
            </div>
          ))}
        </div>
      )}

      {details?.bookingRef && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', letterSpacing: '0.06em', marginBottom: 24 }}>
          Booking reference: <strong style={{ color: '#1a1410' }}>{details.bookingRef}</strong>
        </p>
      )}

      <a href="/" style={{
        display: 'inline-block',
        fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
        textTransform: 'uppercase', fontWeight: 500, padding: '14px 40px',
        background: '#2c2420', color: '#f5f0e8', textDecoration: 'none',
      }}>
        Done — See You Soon
      </a>
    </div>
  );
}
