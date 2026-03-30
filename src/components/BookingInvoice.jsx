import { Sparkle }        from './Icons';
import { calculateTotal } from '../data/siteData';

const PROMISES = [
  'Same dedicated cleaner, every visit',
  'Completion photos after every clean',
  'Eco-friendly, pet-safe products',
  'Punctual or 10% off your next clean',
  'Free re-clean guarantee',
];

export default function BookingInvoice({ booking, isMobile }) {
  const hasSel = !!booking.size;
  const T = hasSel ? calculateTotal({
    sizePrice:    booking.size.basePrice,
    propertyType: booking.propertyType,
    frequency:    booking.freq,
    addons:       booking.addons,
    surcharge:    booking.surcharge,
  }) : null;

  const lines = T ? [
    { label: `${booking.pkg?.name} · ${booking.size?.label}`, val: `£${T.base}` },
    T.houseExtra > 0 && { label: 'House supplement (+10%)',       val: `+£${T.houseExtra}` },
    T.freqSave > 0   && { label: `${booking.freq?.label} discount`, val: `-£${T.freqSave}`, grn: true },
    ...(booking.addons || []).map(a => ({ label: a.name, val: `+£${a.price}` })),
    T.surcharge > 0  && { label: 'Surcharge',                      val: `+£${T.surcharge}` },
    booking.cleanDateDisplay && { label: 'Date', val: booking.cleanDateDisplay },
    booking.cleanTime        && { label: 'Time', val: booking.cleanTime },
  ].filter(Boolean) : [];

  return (
    <div style={{ background:'#1a1410', padding: isMobile ? 20 : 28,
      position: isMobile ? 'static' : 'sticky', top:72, height:'fit-content' }}>

      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:12, letterSpacing:'0.18em',
        color:'#c8b89a', textTransform:'uppercase', marginBottom:18, paddingBottom:14,
        borderBottom:'1px solid rgba(200,184,154,0.1)' }}>✦ Your Booking</div>

      {!hasSel
        ? <p style={{ fontFamily:"'Jost',sans-serif", fontSize:13, fontStyle:'italic',
            color:'rgba(200,184,154,0.22)', fontWeight:300, margin:0 }}>
            Select a package to see your quote
          </p>
        : <>
            {lines.map((line, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between',
                fontSize:12, padding:'5px 0', borderBottom:'0.5px solid rgba(200,184,154,0.07)' }}>
                <span style={{ color:'rgba(200,184,154,0.48)', fontFamily:"'Jost',sans-serif", fontWeight:300 }}>{line.label}</span>
                <span style={{ color: line.grn ? '#6fcf97' : '#f5f0e8', fontWeight:500 }}>{line.val}</span>
              </div>
            ))}
            <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid rgba(200,184,154,0.16)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <span style={{ fontFamily:"'Jost',sans-serif", fontSize:10, letterSpacing:'0.14em',
                  textTransform:'uppercase', color:'rgba(200,184,154,0.38)' }}>Total</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34,
                  fontWeight:300, color:'#c8b89a' }}>£{T.subtotal}</span>
              </div>
              {[
                { l:'Deposit due today (30%)',   v:`£${T.deposit}`,   c:'#e8d9c0' },
                { l:'Balance on clean day (70%)', v:`£${T.remaining}`, c:'rgba(200,184,154,0.45)' },
              ].map((r,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{ color:'rgba(200,184,154,0.42)', fontFamily:"'Jost',sans-serif", fontWeight:300 }}>{r.l}</span>
                  <span style={{ color:r.c, fontWeight:500 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </>
      }

      <div style={{ marginTop:24, paddingTop:18, borderTop:'1px solid rgba(200,184,154,0.07)' }}>
        {PROMISES.map((p,i) => (
          <div key={i} style={{ display:'flex', gap:9, marginBottom:9,
            fontFamily:"'Jost',sans-serif", fontSize:11, fontWeight:300,
            color:'rgba(200,184,154,0.32)', lineHeight:1.5 }}>
            <Sparkle size={7} color='rgba(200,184,154,0.28)' style={{ flexShrink:0, marginTop:3 }} />
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}