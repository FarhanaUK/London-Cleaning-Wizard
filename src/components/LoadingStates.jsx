const ANIM = `@keyframes lcwSpin{to{transform:rotate(360deg)}}
@keyframes lcwShim{to{background-position:-200% 0}}`;

// 1. Full-screen overlay — blocks the page during payment
export function FullOverlay({ show, title, sub }) {
  if (!show) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,20,16,0.92)', zIndex:2000,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
      <style>{ANIM}</style>
      <div style={{ width:54, height:54, borderRadius:'50%',
        border:'2px solid rgba(200,184,154,0.18)', borderTopColor:'#c8b89a',
        animation:'lcwSpin 0.85s linear infinite' }} />
      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300,
        color:'#f5f0e8', letterSpacing:'0.04em', margin:0 }}>{title}</p>
      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:12,
        color:'rgba(200,184,154,0.42)', margin:0 }}>{sub}</p>
    </div>
  );
}

// 2. Skeleton slots — shown while Google Calendar availability loads
export function SkeletonSlots() {
  return (
    <>
      <style>{ANIM}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {[...Array(8)].map((_,i) => (
          <div key={i} style={{ height:44,
            backgroundImage:'linear-gradient(90deg,#e8e2d8 25%,#f2ede6 50%,#e8e2d8 75%)',
            backgroundSize:'200% 100%', animation:`lcwShim ${1.2+i*0.1}s infinite` }} />
        ))}
      </div>
    </>
  );
}

// 3. Section spinner — inline, for sending/verifying code
export function SectionSpinner({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0' }}>
      <style>{ANIM}</style>
      <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0,
        border:'2px solid #e0d8ce', borderTopColor:'#c8b89a',
        animation:'lcwSpin 0.75s linear infinite' }} />
      <span style={{ fontFamily:"'Jost',sans-serif", fontSize:13,
        color:'#8b7355', fontWeight:300 }}>{label}</span>
    </div>
  );
}

// 4. Button spinner — inside the pay button while processing
export function ButtonSpinner() {
  return (
    <>
      <style>{ANIM}</style>
      <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0,
        border:'2px solid rgba(245,240,232,0.25)', borderTopColor:'#f5f0e8',
        animation:'lcwSpin 0.75s linear infinite' }} />
    </>
  );
}