import { Sparkle } from './Icons';
import { calculateTotal } from '../utils/pricing';

const fmt = (n) => Number(n).toFixed(2);

const PROMISES = [];

// ── Mobile sticky bar - shows at top of form on small screens
function MobilePriceBar({ booking, T, TOneOff }) {
  return (
    <div style={{
      position: 'sticky',
      top: 132, // sits below Navbar (60) + progress bar (~72)
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
                From 2nd clean ({booking.freq.label}): £{((T.originalSubtotal || T.subtotal) - booking.freq.saving).toFixed(2)} / visit · saves £{booking.freq.saving}
              </div>
            )}
            {T.addnSum > 0 && (
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'rgba(200,184,154,0.4)', fontWeight: 300 }}>
                Add-ons: <span style={{ color: '#e8d9c0', fontWeight: 500 }}>+£{fmt(T.addnSum)}</span>
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
          {T ? `£${fmt(T.subtotal)}` : '-'}
        </div>
      </div>
    </div>
  );
}

// ── Desktop sidebar - full invoice panel
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
        <>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', fontWeight: 300, margin: '0 0 20px' }}>
            Select a package to see your quote
          </p>
          <div style={{ borderTop: '1px solid rgba(200,184,154,0.1)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { text: 'Fully insured & vetted cleaners',    tag: null },
              { text: 'Same trusted cleaner every visit',   tag: null },
              { text: '100% satisfaction or we re-clean',   tag: null },
              { text: 'Hotel-standard finish, every clean', tag: 'Signature Hotel Reset only' },
              { text: 'Signature scent + handmade gift',    tag: 'Signature Hotel Reset only' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                <span style={{ color: '#c8b89a', flexShrink: 0, marginTop: 1 }}>✓</span>
                <span>
                  {item.text}
                  {item.tag && (
                    <span style={{ display: 'block', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,184,154,0.45)', fontWeight: 400, marginTop: 2 }}>
                      {item.tag}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(200,184,154,0.07)' }}>
            <a href="tel:02081370026" style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#c8b89a', textDecoration: 'none', fontWeight: 400, letterSpacing: '0.04em' }}>
              📞 Need help? 020 8137 0026
            </a>
          </div>
        </>
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
                  <span style={{ color: '#6fcf97', fontWeight: 500 }}>£{((T.originalSubtotal || T.subtotal) - booking.freq.saving).toFixed(2)} / visit</span>
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
  // First booking always at full price - no frequency discount
  const rawT = hasSel ? calculateTotal({
    sizePrice:    booking.size.basePrice,
    propertyType: booking.propertyType,
    frequency:    null,
    addons:       booking.addons,
    surcharge:         booking.surcharge,
    supplies:          booking.supplies,
    suppliesFeeOverride: booking.suppliesFee,
  }) : null;

  const launchMultiplier = booking.pkg?.launchOffer || null;
  const T = rawT && launchMultiplier ? (() => {
    const launchDiscount = parseFloat((rawT.base * (1 - launchMultiplier)).toFixed(2));
    const newSubtotal    = parseFloat((rawT.subtotal - launchDiscount).toFixed(2));
    const newDeposit     = Math.round(newSubtotal * 30) / 100;
    return { ...rawT, originalSubtotal: rawT.subtotal, subtotal: newSubtotal, deposit: newDeposit, remaining: parseFloat((newSubtotal - newDeposit).toFixed(2)), launchDiscount };
  })() : rawT;
  const TOneOff = null;

  const lines = T ? [
    booking.cleanDateDisplay && { label: 'Date', val: booking.cleanDateDisplay },
    booking.cleanTime        && { label: 'Time', val: booking.cleanTime },
    { label: `${booking.pkg?.name} · ${booking.size?.label}`, val: `£${rawT.base}` },
    T.launchDiscount > 0 && { label: 'Launch offer: 50% off first clean', val: `-£${T.launchDiscount.toFixed(2)}`, grn: true },
    ...(booking.addons || []).map(a => ({ label: a.name, val: `+£${a.price}` })),
    rawT.suppliesFee > 0 && { label: 'Cleaning supplies', val: `+£${rawT.suppliesFee}` },
    rawT.surcharge > 0   && { label: 'Surcharge', val: `+£${rawT.surcharge}` },
  ].filter(Boolean) : [];

  if (isMobile) {
    return <MobilePriceBar booking={booking} T={T} TOneOff={TOneOff} />;
  }

  return <DesktopInvoice booking={booking} T={T} lines={lines} />;
}