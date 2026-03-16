import { HERO_IMAGE } from "../data/siteData"
import { Sparkle, WandIcon, Constellation } from "./Icons";
import { useState, useEffect } from "react";

export default function Hero({ onScrollTo }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "linear-gradient(to right, #45413D, #C6C4C2)" }}>

      {/* Keyframe animations */}
      <style>{`
        @keyframes twinkle1 { 0%,100% { opacity:0.2; } 50% { opacity:0.9; } }
        @keyframes twinkle2 { 0%,100% { opacity:0.7; } 50% { opacity:0.15; } }
        @keyframes twinkle3 { 0%,100% { opacity:0.4; } 60% { opacity:1; } }
      `}</style>

      {/* Twinkling sparkles */}
      {[
        [5,  22, "twinkle1", 0.7, 20],
        [78, 22, "twinkle2", 1.1, 17],
        [88, 45, "twinkle3", 0.5, 20],
        [5,  55, "twinkle1", 1.4, 17],
        [92, 72, "twinkle2", 0.8, 15],
        [15, 80, "twinkle3", 0.3, 17],
        [45, 15, "twinkle1", 1.8, 19],
        [65, 60, "twinkle2", 0.6, 17],
        [30, 40, "twinkle3", 1.2, 18],
      ].map(([x, y, anim, delay, size], i) => (
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

      {/* Constellations */}
      {!isMobile && (
        <>
          <div style={{ position: "absolute", top: 90, left: 40, pointerEvents: "none" }}>
            <Constellation width={200} height={120} color="#c8b89a" opacity={0.08} />
          </div>
          <div style={{ position: "absolute", bottom: 60, right: 60, pointerEvents: "none" }}>
            <Constellation width={160} height={100} color="#c8b89a" opacity={0.06} />
          </div>
        </>
      )}

      {/* Two column grid — stacks on mobile */}
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        minHeight: "100vh",
        paddingTop: 76,
      }}>

        {/* LEFT — text */}
        <div style={{
          display: "flex",
          alignItems: "center",
          paddingLeft: isMobile ? 24 : "clamp(24px, 8vw, 100px)",
          paddingRight: isMobile ? 24 : "clamp(20px, 3vw, 48px)",
          paddingTop: 48,
          paddingBottom: 64,
        }}>
          <div style={{ maxWidth: 520, width: "100%" }}>

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.3em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
              <Sparkle size={9} color="#c8b89a" />
              Residential Cleaning · East London
              <Sparkle size={9} color="#c8b89a" />
            </div>

            <div style={{ width: 40, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 26 }} />

            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 6vw, 86px)", fontWeight: 300, lineHeight: 1.02, color: "#f5f0e8", marginBottom: 6, letterSpacing: "-0.015em" }}>
              Your home,
            </h1>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 6vw, 86px)", fontWeight: 300, lineHeight: 1.02, marginBottom: 34, letterSpacing: "-0.015em", fontStyle: "italic" }}>
              <span style={{ color: "#e8d9c0" }}>Transformed</span>
              <span style={{ color: "#c8b89a", marginLeft: 14 }}>✦</span>
            </h1>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, lineHeight: 1.9, color: "rgba(245,240,232,0.65)", maxWidth: 400, marginBottom: 44, fontWeight: 300 }}>
              Discreet, meticulous cleaning for East London homes. We work a little
              magic on every room — and the results speak for themselves.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 52 }}>
              <button
                onClick={() => onScrollTo("contact")}
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "15px 44px", background: "#2c2420", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              >
                <WandIcon size={15} color="#c8b89a" /> Request a Quote
              </button>
              <button
                onClick={() => onScrollTo("our-work")}
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 300, padding: "14px 40px", background: "transparent", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              >
                View Our Work
              </button>
            </div>

            {/* Mini stats */}
            <div style={{ display: "flex", gap: isMobile ? 20 : 36, paddingTop: 32, borderTop: "1px solid rgba(200,184,154,0.12)" }}>
              {[["500+", "Homes Cleaned"], ["4.9", "Avg Rating"], ["100%", "Guaranteed"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px, 2.8vw, 40px)", fontWeight: 300, color: "#c8b89a", lineHeight: 1 }}>{n}</div>
                  <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: "0.16em", color: "rgba(245,240,232,0.35)", textTransform: "uppercase", marginTop: 5 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Callout badge — shows below stats on mobile */}
            {isMobile && (
              <div style={{
                marginTop: 36,
                background: "#c8b89a",
                padding: "14px 22px",
                display: "inline-block",
              }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#1a1410", marginBottom: 6 }}>East London's</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, lineHeight: 1.05, fontStyle: "italic", color: "#1a1410" }}>most affordable<br />luxury clean</div>
                <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 10, marginBottom: 8 }} />
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2c2420" }}>From £15/hr · No contracts</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — image, desktop only */}
        {!isMobile && (
          <div style={{ position: "relative", overflow: "hidden" }}>
            <img
              src={HERO_IMAGE}
              alt="London Cleaning Wizard"
              style={{
                position: "absolute",
                top: 0,
                left: "-20%",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "30% 40%",
              }}
            />

            {/* Callout badge — desktop, on the image */}
            <div style={{
              position: "absolute",
              top: 120,
              right: 40,
              background: "#c8b89a",
              padding: "14px 22px",
              zIndex: 10,
            }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#1a1410", marginBottom: 6 }}>East London's</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 46, fontWeight: 300, lineHeight: 1.05, fontStyle: "italic", color: "#1a1410" }}>most affordable<br />luxury clean</div>
              <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 10, marginBottom: 8 }} />
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2c2420" }}>From £15/hr · No contracts</div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll cue */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 3 }}>
        <Sparkle size={9} color="rgba(245,240,232,0.3)" />
        <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, rgba(245,240,232,0.3), transparent)" }} />
      </div>
    </section>
  );
}