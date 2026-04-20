import { Sparkle } from './Icons';
import { calculateTotal } from '../data/siteData';

const fmt = (n) => Number(n).toFixed(2);

const PROMISES = [];

// ── Mobile sticky bar — shows at top of form on small screens
function MobilePriceBar({ booking, T, TOneOff }) {
  return (
    <div style={{
      position: 'sticky',
      top: 60, // sits just below the fixed Navbar
      zIndex: 40,
      background: '#1a1410',
      borderBottom: '1px solid rgba(200,184,154,0.15)',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        {booking.pkg ? (
          <div style={{
            fontFamily: "'Jost',sans-serif", fontSize: 11,
            color: 'rgba(200,184,154,0.5)', fontWeight: 300,
            letterSpacing: '0.06em',
          }}>
            {booking.pkg.name}{booking.size ? ` · ${booking.size.label}` : ''}
          </div>
        ) : (
          <div style={{
            fontFamily: "'Jost',sans-serif", fontSize: 11,
            color: 'rgba(200,184,154,0.3)', fontStyle: 'italic',
          }}>
            Select a package
          </div>
        )}
        {T && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 2 }}>
            {booking.freq && booking.freq.id !== 'one-off' && (
              <div style={{ width: '100%', fontFamily: "'Jost',sans-serif", fontSize: 10, color: '#6fcf97', fontWeight: 400 }}>
                £{booking.freq.saving} {booking.freq.label} discount from 2nd clean
              </div>
            )}
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'rgba(200,184,154,0.4)', fontWeight: 300 }}>
              Deposit today: <span style={{ color: '#e8d9c0', fontWeight: 500 }}>£{fmt(T.deposit)}</span>
            </div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'rgba(200,184,154,0.4)', fontWeight: 300 }}>
              Balance: <span style={{ color: 'rgba(200,184,154,0.5)', fontWeight: 300 }}>£{fmt(T.remaining)}</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        {TOneOff && (
          <div style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 16, fontWeight: 300,
            color: 'rgba(200,184,154,0.3)',
            textDecoration: 'line-through',
          }}>
            £{TOneOff.subtotal}
          </div>
        )}
        <div style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: T ? 26 : 14,
          fontWeight: 300,
          color: T ? '#c8b89a' : 'rgba(200,184,154,0.25)',
          fontStyle: T ? 'normal' : 'italic',
        }}>
          {T ? `£${fmt(T.subtotal)}` : '—'}
        </div>
      </div>
    </div>
  );
}

// ── Desktop sidebar — full invoice panel
function DesktopInvoice({ booking, T, lines }) {
  return (
    <div style={{ background: '#1a1410', padding: 28 }}>
      <div style={{
        fontFamily: "'Cormorant Garamond',serif", fontSize: 12,
        letterSpacing: '0.18em', color: '#c8b89a', textTransform: 'uppercase',
        marginBottom: 18, paddingBottom: 14,
        borderBottom: '1px solid rgba(200,184,154,0.1)',
      }}>✦ Your Booking</div>

      {!booking.size ? (
        <p style={{
          fontFamily: "'Jost',sans-serif", fontSize: 13, fontStyle: 'italic',
          color: 'rgba(255,255,255,0.8)', fontWeight: 300, margin: 0,
        }}>
          Select a package to see your quote
        </p>
      ) : (
        <>
          {lines.map((line, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12, padding: '5px 0',
              borderBottom: '0.5px solid rgba(200,184,154,0.07)',
            }}>
              <span style={{ color: line.grn ? '#6fcf97' : 'rgba(255,255,255,0.8)', fontFamily: "'Jost',sans-serif", fontWeight: line.grn ? 400 : 300 }}>{line.label}</span>
              <span style={{ color: line.grn ? '#6fcf97' : '#ffffff', fontWeight: 500 }}>{line.val}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(200,184,154,0.16)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{
                fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)',
              }}>Total</span>
              <span style={{
                fontFamily: "'Cormorant Garamond',serif", fontSize: 34,
                fontWeight: 300, color: '#ffffff',
              }}>£{fmt(T.subtotal)}</span>
            </div>
            {[
              { l: 'Deposit due today (30%)',    v: `£${fmt(T.deposit)}`,   c: '#ffffff' },
              { l: 'Balance on clean day (70%)', v: `£${fmt(T.remaining)}`, c: '#ffffff' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Jost',sans-serif", fontWeight: 300 }}>{r.l}</span>
                <span style={{ color: r.c, fontWeight: 500 }}>{r.v}</span>
              </div>
            ))}
            {booking.freq && booking.freq.id !== 'one-off' && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(200,184,154,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#6fcf97', fontFamily: "'Jost',sans-serif", fontWeight: 300 }}>From your 2nd clean ({booking.freq.label})</span>
                  <span style={{ color: '#6fcf97', fontWeight: 500 }}>£{(T.subtotal - booking.freq.saving).toFixed(2)} / visit</span>
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'rgba(111,207,151,0.7)', fontWeight: 300, marginTop: 3 }}>
                  £{booking.freq.saving} {booking.freq.label.toLowerCase()} discount applied
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(200,184,154,0.07)' }}>
        {PROMISES.map((p, i) => (
          <div key={i} style={{
            display: 'flex', gap: 9, marginBottom: 9,
            fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 300,
            color: 'rgba(255,255,255,0.8)', lineHeight: 1.5,
          }}>
            <Sparkle size={7} color='rgba(255,255,255,0.8)' style={{ flexShrink: 0, marginTop: 3 }} />
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookingInvoice({ booking, isMobile }) {
  const hasSel = !!booking.size;
  // First booking always at full price — no frequency discount
  const T = hasSel ? calculateTotal({
    sizePrice:    booking.size.basePrice,
    propertyType: booking.propertyType,
    frequency:    null,
    addons:       booking.addons,
    surcharge:         booking.surcharge,
    supplies:          booking.supplies,
    suppliesFeeOverride: booking.suppliesFee,
  }) : null;
  const TOneOff = null;

  const lines = T ? [
    { label: `${booking.pkg?.name} · ${booking.size?.label}`, val: `£${T.base}` },
    ...(booking.addons || []).map(a => ({ label: a.name, val: `+£${a.price}` })),
    T.suppliesFee > 0 && { label: 'Cleaning supplies', val: `+£${T.suppliesFee}` },
    T.surcharge > 0   && { label: 'Surcharge', val: `+£${T.surcharge}` },
    booking.cleanDateDisplay && { label: 'Date', val: booking.cleanDateDisplay },
    booking.cleanTime        && { label: 'Time', val: booking.cleanTime },
  ].filter(Boolean) : [];

  if (isMobile) {
    return <MobilePriceBar booking={booking} T={T} TOneOff={TOneOff} />;
  }

  return <DesktopInvoice booking={booking} T={T} lines={lines} />;
}