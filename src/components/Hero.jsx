import { HERO_IMAGE, STATS } from "../data/siteData"
import { Sparkle, WandIcon, Constellation } from "./Icons";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePromotion } from "../hooks/usePromotion";

const SEGMENT_STYLE_MAP = {
  bold:   { fontWeight: 600, letterSpacing: '0.22em' },
  light:  { fontWeight: 300, letterSpacing: '0.12em' },
  italic: { fontStyle: 'italic', fontWeight: 300 },
  serif:  { fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 },
};

export default function Hero({ onScrollTo }) {
  const { promotion } = usePromotion();
  const LAUNCH_ACTIVE = !!promotion;
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
        @keyframes launchSlideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes launchMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>

      {LAUNCH_ACTIVE && (
        <div style={{
          position: 'absolute',
          top: 68,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'linear-gradient(90deg, #7f1d1d, #991b1b, #7f1d1d)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            width: 'max-content',
            animation: 'launchMarquee 28s linear infinite',
            willChange: 'transform',
          }}>
            {[0, 1].map(group => (
              <div key={group} style={{ display: 'flex', flexShrink: 0 }}>
                {[...Array(4)].map((_, i) => (
                  <span key={i} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 32px',
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 11,
                    textTransform: 'uppercase',
                    color: '#fef2f2',
                  }}>
                    {(promotion?.banner || []).map((seg, si) => (
                      <span key={si} style={SEGMENT_STYLE_MAP[seg.style] || {}}>
                        {si > 0 && <span style={{ color: '#fca5a5', marginRight: 10 }}>✦</span>}
                        {seg.text}
                      </span>
                    ))}
                    <span style={{ color: '#fca5a5', fontSize: 14, marginLeft: 6 }}>✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Constellations - desktop only */}
      {isDesktop && (
        <>
          <div style={{ position: "absolute", top: 90, left: 40, pointerEvents: "none" }}>
            <Constellation width={200} height={120} color="#c8b89a" opacity={0.08} />
          </div>
          <div style={{ position: "absolute", bottom: 60, right: 60, pointerEvents: "none" }}>
            <Constellation width={160} height={100} color="#c8b89a" opacity={0.06} />
          </div>
        </>
      )}      {isMobile && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: LAUNCH_ACTIVE ? 100 : 76 }}>

          {/* Callout badge - above image */}
          <div style={{ padding: "16px 20px 0", position: "relative", zIndex: 2 }}>
            <div style={{ background: "linear-gradient(135deg, #d4c4a0, #c8b89a)", padding: "12px 16px", borderRadius: 14, boxShadow: "0 6px 24px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, lineHeight: 1.2, fontStyle: "italic", color: "#1a1410" }}>Clean Space, Elevated Mind.</div>
              <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 8, marginBottom: 6 }} />
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", fontWeight: 400, color: "#1a3d2b", marginBottom: 10, letterSpacing: "0.02em" }}>Homes · Airbnbs · Offices</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  to="/book?from=hero"
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#f5f0e8",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontWeight: 500,
                    background: "#2c2420",
                    padding: "11px 12px",
                    borderRadius: 8,
                    flex: 1,
                  }}
                >
                  <WandIcon size={12} color="#c8b89a" /> Book a Clean
                </Link>
                <a
                  to="/book?tab=signature"
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#f5f0e8",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontWeight: 500,
                    background: "#2c2420",
                    padding: "11px 12px",
                    borderRadius: 8,
                    flex: 1,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                  020 8137 0026
                </a>
              </div>
             
            </div>
          </div>

          {/* Hero image */}
          <div style={{ position: "relative", height: "40vh", overflow: "hidden", flexShrink: 0, marginTop: -30 }}>
            <img
              src={HERO_IMAGE}
              alt="Professional home & commercial cleaning service in London by London Cleaning Wizard"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to top, #45413D, transparent)" }} />
          </div>

          {/* Text content */}
          <div style={{ padding: "24px 20px 48px", flex: 1 }}>

            <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, margin: 0 }}>
              Professional Home & Commercial Cleaning Services in London
            </h1>

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkle size={7} color="#c8b89a" />
              Transforming, London Spaces
              <Sparkle size={7} color="#c8b89a" />
            </div>

            <div style={{ background: "#1a1410", margin: "0 -20px", padding: "20px 40px", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 32px" }}>
              {STATS.map(({ number, label, small }, i) => (
                <div key={number} style={{ gridColumn: i === STATS.length - 1 && STATS.length % 2 !== 0 ? "1 / -1" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    <span style={{ color: "#52b788", fontSize: 11, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>✓</span>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 400, color: "#c8b89a", lineHeight: 1.1 }}>
                      {number}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, letterSpacing: "0.16em", color: "rgba(245,240,232,0.4)", textTransform: "uppercase", paddingLeft: 16 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
            </div>

            <div style={{ width: 28, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 16 }} />

            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(36px, 9vw, 52px)", fontWeight: 300, lineHeight: 1.0, color: "#f5f0e8", marginBottom: 0, letterSpacing: "-0.015em" }}>
              Premium Cleaning
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(36px, 9vw, 52px)", fontWeight: 300, lineHeight: 1.0, marginBottom: 20, marginTop: 4, letterSpacing: "-0.015em", fontStyle: "italic" }}>
              <span style={{ color: "#e8d9c0" }}>Services</span>
              <span style={{ color: "#c8b89a", marginLeft: 10 }}>✦</span>
            </p>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, lineHeight: 1.8, color: "rgba(245,240,232,0.65)", marginBottom: 28, fontWeight: 300 }}>
              Hotel-standard cleaning for homes, Airbnbs and offices across London. Full Reset packages from £115.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              <Link
                to="/book?tab=signature"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "14px 24px", background: "#2c2420", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", boxSizing: "border-box" }}
              >
                Tap here for Residential Cleaning
              </Link>
              <Link
                to="/quote"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 300, padding: "14px 24px", background: "rgba(0,0,0,0.35)", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.7)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", boxSizing: "border-box" }}
              >
                Get a Quote for Commercial/Airbnb
              </Link>
            </div>
          </div>
        </div>
      )}      {isTablet && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: LAUNCH_ACTIVE ? 100 : 76 }}>

          <div style={{ position: "relative", height: "50vh", overflow: "hidden", flexShrink: 0 }}>
            <img
              src={HERO_IMAGE}
              alt="Professional home & commercial cleaning service in London by London Cleaning Wizard"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to top, #45413D, transparent)" }} />

            {/* Callout badge */}
            <div style={{ position: "absolute", bottom: 24, right: 32, background: "linear-gradient(135deg, #d4c4a0, #c8b89a)", padding: "12px 18px", zIndex: 10, borderRadius: 14, boxShadow: "0 6px 24px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, lineHeight: 1.2, fontStyle: "italic", color: "#1a1410" }}>Clean Space, Elevated Mind.</div>
              <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 8, marginBottom: 6 }} />
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: "italic", fontWeight: 400, color: "#1a3d2b", marginBottom: 8, letterSpacing: "0.02em" }}>Homes · Airbnbs · Offices</div>
              <Link
                to="/book?from=hero"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#f5f0e8",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 500,
                  background: "#2c2420",
                  padding: "10px 18px",
                  borderRadius: 8,
                }}
              >
                <WandIcon size={13} color="#c8b89a" /> Book a Clean
              </Link>
            </div>
          </div>

          {/* Text content */}
          <div style={{ padding: "40px 48px 60px" }}>

            <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, margin: 0 }}>
              Professional Home & Commercial Cleaning Services in London
            </h1>

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 15, letterSpacing: "0.28em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkle size={8} color="#c8b89a" />
            Transforming, London Spaces
              <Sparkle size={8} color="#c8b89a" />
            </div>

            <div style={{ width: 32, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 20 }} />

            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(44px, 7vw, 64px)", fontWeight: 300, lineHeight: 1.02, color: "#f5f0e8", marginBottom: 4, letterSpacing: "-0.015em" }}>
              Premium Cleaning
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(44px, 7vw, 64px)", fontWeight: 300, lineHeight: 1.02, marginBottom: 24, marginTop: 10, letterSpacing: "-0.015em", fontStyle: "italic" }}>
              <span style={{ color: "#e8d9c0" }}>Services</span>
              <span style={{ color: "#c8b89a", marginLeft: 12 }}>✦</span>
            </p>

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 18, lineHeight: 1.9, color: "rgba(245,240,232,0.65)", maxWidth: 500, marginBottom: 36, fontWeight: 300 }}>
              Hotel-standard cleaning for homes, Airbnbs and offices across London. Full Reset packages from £115.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40, width: "fit-content" }}>
              <Link
                to="/book?tab=signature"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "15px 24px", background: "#2c2420", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                Tap here for Residential Cleaning
              </Link>
              <Link
                to="/quote"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 300, padding: "15px 24px", background: "rgba(0,0,0,0.35)", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.7)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                Get a Quote for Commercial/Airbnb
              </Link>
            </div>
          </div>
        </div>
      )}      {isDesktop && (
        <div style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "100vh",
          paddingTop: LAUNCH_ACTIVE ? 100 : 76,
        }}>

          {/* LEFT - text */}
          <div style={{ display: "flex", alignItems: "center", paddingLeft: "clamp(24px, 8vw, 100px)", paddingRight: "clamp(20px, 3vw, 48px)", paddingTop: 48, paddingBottom: 64 }}>
            <div style={{ maxWidth: 520, width: "100%" }}>

              <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, margin: 0 }}>
                Professional Home & Commercial Cleaning Services in London
              </h1>

              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 18, letterSpacing: "0.2em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <Sparkle size={12} color="#c8b89a" />
            Transforming, London Spaces
                <Sparkle size={12} color="#c8b89a" />
              </div>

              <div style={{ width: 40, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 0 }} />

              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(46px, 4.5vw, 72px)", fontWeight: 300, lineHeight: 1.0, color: "#f5f0e8", marginBottom: 0, letterSpacing: "-0.015em" }}>
                Premium Cleaning
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(46px, 4.5vw, 72px)", fontWeight: 300, lineHeight: 1.0, marginBottom: 20, marginTop: 10, letterSpacing: "-0.015em", fontStyle: "italic", whiteSpace: "nowrap" }}>
                <span style={{ color: "#e8d9c0" }}>Services</span>
                <span style={{ color: "#c8b89a", marginLeft: 14 }}>✦</span>
              </p>

              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 18, lineHeight: 1.9, color: "rgba(245,240,232,0.65)", maxWidth: 400, marginBottom: 44, fontWeight: 300 }}>
                Hotel-standard cleaning for homes, Airbnbs and offices across London. Full Reset packages from £115.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, width: "fit-content" }}>
                <Link
                  to="/book?tab=signature"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "15px 44px", background: "#2c2420", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                >
                  Click here for Residential Cleaning
                </Link>
                <Link
                  to="/quote"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 300, padding: "15px 44px", background: "rgba(0,0,0,0.35)", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.7)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                >
                  Get a Quote for Commercial/Airbnb
                </Link>
              </div>

              {/* Stats strip — desktop only, inline below buttons */}
              {(() => {
                const StatItem = ({ number, label, borderRight }) => (
                  <div style={{ flex: 1, borderRight, padding: "0 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <span style={{ color: "#52b788", fontSize: 13, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>✓</span>
                      <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10.5, fontWeight: 500, color: "rgba(200,184,154,0.92)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                        {number}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: "0.14em", color: "rgba(245,240,232,0.4)", textTransform: "uppercase", whiteSpace: "nowrap", paddingLeft: 20 }}>
                      {label}
                    </div>
                  </div>
                );
                return (
                  <div style={{ borderTop: "1px solid rgba(200,184,154,0.2)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex" }}>
                      {STATS.slice(0, 3).map(({ number, label }, i) => (
                        <StatItem key={number} number={number} label={label} borderRight={i < 2 ? "1px solid rgba(200,184,154,0.12)" : "none"} />
                      ))}
                    </div>
                    <div style={{ display: "flex" }}>
                      {STATS.slice(3).map(({ number, label }, i) => (
                        <StatItem key={number} number={number} label={label} borderRight={i < STATS.slice(3).length - 1 ? "1px solid rgba(200,184,154,0.12)" : "none"} />
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

          {/* RIGHT - image */}
          <div style={{ position: "relative" }}>
            <img
              src={HERO_IMAGE}
              alt="Professional home & commercial cleaning service in London by London Cleaning Wizard"
              style={{ position: "absolute", top: 0, left: "-35%", width: "120%", height: "100%", objectFit: "cover", objectPosition: "30% 40%" }}
            />

            {/* Callout badge */}
            <div style={{ position: "absolute", top: 120, right: 40, background: "linear-gradient(135deg, #d4c4a0, #c8b89a)", padding: "14px 22px", zIndex: 10, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)", backdropFilter: "blur(4px)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, lineHeight: 1.2, fontStyle: "italic", color: "#1a1410" }}>Clean Space, Elevated Mind.</div>
              <div style={{ width: "100%", height: 1, background: "rgba(44,36,32,0.3)", marginTop: 10, marginBottom: 8 }} />
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: "italic", fontWeight: 400, color: "#1a3d2b", marginBottom: 8, letterSpacing: "0.02em" }}>Homes · Airbnbs · Offices</div>
              <Link
                to="/book?from=hero"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#f5f0e8",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 500,
                  background: "#2c2420",
                  padding: "10px 18px",
                  borderRadius: 8,
                }}
              >
                <WandIcon size={13} color="#c8b89a" /> Book a Clean
              </Link>

  
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
