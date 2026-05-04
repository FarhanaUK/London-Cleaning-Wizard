
import { Sparkle } from "./Icons";
import Reveal from "./Reveal";
import { TESTIMONIALS } from "../data/siteData";

export default function Testimonials() {
  return (
    <section style={{ position: "relative", background: "#1a1410", padding: "100px clamp(24px, 6vw, 100px)", overflow: "hidden" }}>

      {/* Heading */}
      <Reveal>
        <div style={{ textAlign: "center", marginBottom: 60, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 18 }}>
            <Sparkle size={12} color="#c8b89a" />
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", color: "#c8b89a", textTransform: "uppercase" }}>Client Stories</span>
            <Sparkle size={12} color="#c8b89a" />
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.1 }}>
            Words from those whose<br /><em>homes we've transformed</em>
          </h2>
        </div>
      </Reveal>

      {/* Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 2,
        maxWidth: 1100,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 100}>
            <div style={{
              padding: "44px 36px",
              background: i === 1 ? "#c8b89a" : "rgba(245,240,232,0.04)",
              border: i !== 1 ? "1px solid rgba(200,184,154,0.1)" : "none",
              height: "100%",
            }}>

              {/* Quote mark */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, lineHeight: 0.8, color: i === 1 ? "#2c2420" : "#c8b89a", opacity: 0.35 }}>"</div>
                <Sparkle size={10} color={i === 1 ? "#2c2420" : "#c8b89a"} style={{ opacity: 0.5 }} />
              </div>

              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13.5, lineHeight: 1.9, color: i === 1 ? "#2c2420" : "rgba(245,240,232,0.68)", fontWeight: 300, marginBottom: 28, fontStyle: "italic" }}>
                {t.text}
              </p>

              <div style={{ borderTop: `1px solid ${i === 1 ? "rgba(44,36,32,0.18)" : "rgba(200,184,154,0.15)"}`, paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: i === 1 ? "#2c2420" : "#f5f0e8" }}>{t.name}</div>
                  <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: "0.16em", color: i === 1 ? "#6b5e52" : "#8b7355", textTransform: "uppercase", marginTop: 3 }}>{t.area} · London</div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {[...Array(t.stars)].map((_, si) => (
                    <Sparkle key={si} size={9} color={i === 1 ? "#2c2420" : "#c8b89a"} />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}