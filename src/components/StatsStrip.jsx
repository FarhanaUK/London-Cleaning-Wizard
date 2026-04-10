import { useEffect, useState } from "react";
import { Constellation } from "./Icons";
import { STATS } from "../data/siteData";

export default function StatsStrip() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section style={{
      position: "relative",
      background: "#1a1410",
      padding: isMobile ? "36px 24px" : "52px clamp(24px, 6vw, 100px)",
      overflow: "hidden",
    }}>

      <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <Constellation width={300} height={160} color="#c8b89a" opacity={0.08} />
      </div>
      <div style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <Constellation width={180} height={100} color="#c8b89a" opacity={0.06} />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? "28px 16px" : 40,
        maxWidth: 900,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>
        {STATS.map(({ number, label, small }) => (
          <div key={number} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: small
                ? (isMobile ? "clamp(22px, 5vw, 28px)" : "clamp(24px, 2.8vw, 34px)")
                : (isMobile ? "clamp(36px, 8vw, 52px)" : "clamp(44px, 5.5vw, 72px)"),
              fontWeight: small ? 400 : 300,
              lineHeight: small ? 1.15 : 1,
              color: "#c8b89a",
              minHeight: isMobile ? 52 : 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {number}
            </div>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 9 : 10,
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