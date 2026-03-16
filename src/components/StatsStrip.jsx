import { Constellation } from "./Icons";
import { STATS } from "../data/siteData";

export default function StatsStrip() {
  return (
    <section style={{ position: "relative", background: "#1a1410", padding: "52px clamp(24px, 6vw, 100px)", overflow: "hidden" }}>

      {/* Background constellations */}
      <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <Constellation width={300} height={160} color="#c8b89a" opacity={0.08} />
      </div>
      <div style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <Constellation width={180} height={100} color="#c8b89a" opacity={0.06} />
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 40,
        maxWidth: 900,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>
        {STATS.map(({ number, label }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(44px, 5.5vw, 72px)",
              fontWeight: 300,
              lineHeight: 1,
              color: "#c8b89a",
            }}>
              {number}
            </div>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "rgba(245,240,232,0.4)",
              textTransform: "uppercase",
              marginTop: 8,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}