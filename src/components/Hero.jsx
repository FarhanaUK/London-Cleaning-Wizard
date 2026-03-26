import { HERO_IMAGE } from "../data/siteData"
import { Sparkle, WandIcon, Constellation } from "./Icons";
import { useState, useEffect } from "react";

export default function Hero({ onScrollTo }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = !isMobile && !isTablet;

  const sparkles = [
    [5,  22, "twinkle1", 0.7, 20],
    [78, 22, "twinkle2", 1.1, 17],
    [88, 45, "twinkle3", 0.5, 20],
    [5,  55, "twinkle1", 1.4, 17],
    [92, 72, "twinkle2", 0.8, 15],
    [15, 80, "twinkle3", 0.3, 17],
    [45, 15, "twinkle1", 1.8, 19],
    [65, 60, "twinkle2", 0.6, 17],
    [30, 40, "twinkle3", 1.2, 18],
  ];

  return (
    <section style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "linear-gradient(to right, #45413D, #C6C4C2)" }}>

      <style>{`
        @keyframes twinkle1 { 0%,100% { opacity:0.2; } 50% { opacity:0.9; } }
        @keyframes twinkle2 { 0%,100% { opacity:0.7; } 50% { opacity:0.15; } }
        @keyframes twinkle3 { 0%,100% { opacity:0.4; } 60% { opacity:1; } }
      `}</style>

      {/* Twinkling sparkles */}
      {sparkles.map(([x, y, anim, delay, size], i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          animation: `${anim} ${2 + i * 0.4}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
          pointerEvents: "none",
          zIndex: 1,
        }}>
          <Sparkle size={size} color="rgba(245,240,232,0.55)" />
        </div>
      ))}

      {/* Constellations — desktop only */}
      {isDesktop && (
        <>
          <div style={{ position: "absolute", top: 90, left: 40, pointerEvents: "none" }}>
            <Constellation width={200} height={120} color="#c8b89a" opacity={0.08} />
          </div>
          <div style={{ position: "absolute", bottom: 60, right: 60, pointerEvents: "none" }}>
            <Constellation width={160} height={100} color="#c8b89a" opacity={0.06} />
          </div>
        </>
      )}

      {/* ── MOBILE LAYOUT ── */}
      {isMobile && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: 76 }}>

          {/* Callout badge — above image */}
          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ background: "#c8b89a", padding: "12px 16px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, lineHeight: 1.05, fontStyle: "italic", color: "#1a1410" }}>Most Affordable Luxury Clean</div>
              <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 6, marginBottom: 5 }} />
              <a
  href="tel:02081370026"
  style={{
    fontFamily: "'Jost', sans-serif",
    fontSize: 13,
    letterSpacing: "0.08em",
    color: "#1a1410",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 500,
    zIndex: 20,           // <-- add this
    position: "relative", // <-- and this
  }}
>
  020 8137 0026
</a>
             
            </div>
          </div>

          {/* Hero image */}
          <div style={{ position: "relative", height: "40vh", overflow: "hidden", flexShrink: 0, marginTop: -30 }}>
            <img
              src={HERO_IMAGE}
              alt="Professional home cleaning service in East London by London Cleaning Wizard"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to top, #45413D, transparent)" }} />
          </div>

          {/* Text content */}
          <div style={{ padding: "24px 20px 48px", flex: 1 }}>

            <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, margin: 0 }}>
              Professional Home Cleaning Services in East London, London
            </h1>

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkle size={7} color="#c8b89a" />
           Premium Residential Cleaning <br />
End of Tenancy | Airbnb Services
              <Sparkle size={7} color="#c8b89a" />
            </div>

            <div style={{ width: 28, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 16 }} />

            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(36px, 9vw, 52px)", fontWeight: 300, lineHeight: 1.0, color: "#f5f0e8", marginBottom: 0, letterSpacing: "-0.015em" }}>
              Transforming,
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(36px, 9vw, 52px)", fontWeight: 300, lineHeight: 1.0, marginBottom: 20, marginTop: 4, letterSpacing: "-0.015em", fontStyle: "italic" }}>
              <span style={{ color: "#e8d9c0" }}>East London Homes</span>
              <span style={{ color: "#c8b89a", marginLeft: 10 }}>✦</span>
            </p>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, lineHeight: 1.8, color: "rgba(245,240,232,0.65)", marginBottom: 28, fontWeight: 300 }}>
              Discreet, meticulous cleaning for East London homes. We work a little
              magic on every room, and the results speak for themselves.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              <button
                onClick={() => onScrollTo("contact")}
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "14px 24px", background: "#2c2420", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}
              >
                <WandIcon size={14} color="#c8b89a" /> Request a free Quote
              </button>
              <button
                onClick={() => onScrollTo("our-work")}
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 300, padding: "13px 24px", background: "transparent", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}
              >
                View Our Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLET LAYOUT ── */}
      {isTablet && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: 76 }}>

          <div style={{ position: "relative", height: "50vh", overflow: "hidden", flexShrink: 0 }}>
            <img
              src={HERO_IMAGE}
              alt="Professional home cleaning service in East London by London Cleaning Wizard"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to top, #45413D, transparent)" }} />

            {/* Callout badge */}
            <div style={{ position: "absolute", bottom: 24, right: 32, background: "#c8b89a", padding: "12px 18px", zIndex: 10 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, lineHeight: 1.05, fontStyle: "italic", color: "#1a1410" }}>Most Affordable<br />Luxury Clean</div>
              <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 8, marginBottom: 6 }} />
               <a
                href="tel:02081370026"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  letterSpacing: "0.08em",
                  color: "#1a1410",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 500,
                }}
                
              >020 8137 0026</a>
            </div>
          </div>

          {/* Text content */}
          <div style={{ padding: "40px 48px 60px" }}>

            <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, margin: 0 }}>
              Professional Home Cleaning Services in East London, London
            </h1>

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 15, letterSpacing: "0.28em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkle size={8} color="#c8b89a" />
            Premium Residential Cleaning <br />
End of Tenancy | Airbnb Services
              <Sparkle size={8} color="#c8b89a" />
            </div>

            <div style={{ width: 32, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 20 }} />

            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(44px, 7vw, 64px)", fontWeight: 300, lineHeight: 1.02, color: "#f5f0e8", marginBottom: 4, letterSpacing: "-0.015em" }}>
              Transforming,
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(44px, 7vw, 64px)", fontWeight: 300, lineHeight: 1.02, marginBottom: 24, marginTop: 10, letterSpacing: "-0.015em", fontStyle: "italic" }}>
              <span style={{ color: "#e8d9c0" }}>East London Homes</span>
              <span style={{ color: "#c8b89a", marginLeft: 12 }}>✦</span>
            </p>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 18, lineHeight: 1.9, color: "rgba(245,240,232,0.65)", maxWidth: 500, marginBottom: 36, fontWeight: 300 }}>
              Discreet, meticulous cleaning for East London homes. We work a little
              magic on every room and the results speak for themselves.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
              <button
                onClick={() => onScrollTo("contact")}
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "15px 40px", background: "#2c2420", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              >
                <WandIcon size={15} color="#c8b89a" /> Request a free Quote
              </button>
              <button
                onClick={() => onScrollTo("our-work")}
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 300, padding: "14px 36px", background: "transparent", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              >
                View Our Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP LAYOUT ── */}
      {isDesktop && (
        <div style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "100vh",
          paddingTop: 76,
        }}>

          {/* LEFT — text */}
          <div style={{ display: "flex", alignItems: "center", paddingLeft: "clamp(24px, 8vw, 100px)", paddingRight: "clamp(20px, 3vw, 48px)", paddingTop: 48, paddingBottom: 64 }}>
            <div style={{ maxWidth: 520, width: "100%" }}>

              <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, margin: 0 }}>
                Professional Home Cleaning Services in East London, London
              </h1>

              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 18, letterSpacing: "0.2em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <Sparkle size={12} color="#c8b89a" />
            Premium Residential Cleaning <br />
End of Tenancy | Airbnb Services
                <Sparkle size={12} color="#c8b89a" />
              </div>

              <div style={{ width: 40, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 0 }} />

              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(46px, 4.5vw, 72px)", fontWeight: 300, lineHeight: 1.0, color: "#f5f0e8", marginBottom: 0, letterSpacing: "-0.015em" }}>
                Transforming,
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(46px, 4.5vw, 72px)", fontWeight: 300, lineHeight: 1.0, marginBottom: 20, marginTop: 10, letterSpacing: "-0.015em", fontStyle: "italic", whiteSpace: "nowrap" }}>
                <span style={{ color: "#e8d9c0" }}>East London Homes</span>
                <span style={{ color: "#c8b89a", marginLeft: 14 }}>✦</span>
              </p>

              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 18, lineHeight: 1.9, color: "rgba(245,240,232,0.65)", maxWidth: 400, marginBottom: 44, fontWeight: 300 }}>
                Discreet, meticulous cleaning for East London homes. We work a little
                magic on every room, and the results speak for themselves.
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 52 }}>
                <button
                  onClick={() => onScrollTo("contact")}
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "15px 44px", background: "#2c2420", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <WandIcon size={15} color="#c8b89a" /> Request a free Quote
                </button>
                <button
                  onClick={() => onScrollTo("our-work")}
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 300, padding: "14px 40px", background: "transparent", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                >
                  View Our Work
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — image */}
          <div style={{ position: "relative" }}>
            <img
              src={HERO_IMAGE}
              alt="Professional home cleaning service in East London by London Cleaning Wizard"
              style={{ position: "absolute", top: 0, left: "-35%", width: "120%", height: "100%", objectFit: "cover", objectPosition: "30% 40%" }}
            />

            {/* Callout badge */}
            <div style={{ position: "absolute", top: 120, right: 40, background: "#c8b89a", padding: "14px 22px", zIndex: 10 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 46, fontWeight: 300, lineHeight: 1.05, fontStyle: "italic", color: "#1a1410" }}>Most Affordable<br />Luxury Clean</div>
              <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 10, marginBottom: 8 }} />   <a
    href="tel:02081370026"
    style={{
      fontFamily: "'Jost', sans-serif",
      fontSize: 26,
      letterSpacing: "0.08em",
      color: "#1a1410",
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 500,
    }}
  >
    020 8137 0026
  </a>

  
            </div>
          </div>
        </div>
      )}

      {/* Scroll cue */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 3 }}>
        <Sparkle size={9} color="rgba(245,240,232,0.3)" />
        <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, rgba(245,240,232,0.3), transparent)" }} />
      </div>
    </section>
  );
}