import { useEffect, useState } from "react";
import { Constellation } from "./Icons";
import { STATS } from "../data/siteData";

export default function StatsStrip() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isDesktop || isMobile) return null;

  const StatCell = ({ number, label, small, fullWidth }) => (
    <div style={{ textAlign: "center", gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: small
          ? (isMobile ? "clamp(20px, 5vw, 26px)" : "clamp(24px, 2.8vw, 34px)")
          : (isMobile ? "clamp(32px, 8vw, 46px)"  : "clamp(44px, 5.5vw, 64px)"),
        fontWeight: small ? 400 : 300,
        lineHeight: small ? 1.2 : 1,
        color: "#c8b89a",
        minHeight: isMobile ? 46 : 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {number}
      </div>
      <div style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: isMobile ? 8 : 10,
        letterSpacing: "0.18em",
        color: "rgba(245,240,232,0.4)",
        textTransform: "uppercase",
        marginTop: 6,
      }}>
        {label}
      </div>
    </div>
  );

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
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "28px 16px",
        maxWidth: 900,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>
        {STATS.map(({ number, label, small }, i) => (
          <StatCell
            key={number}
            number={number}
            label={label}
            small={small}
            fullWidth={isMobile && i === STATS.length - 1 && STATS.length % 2 !== 0}
          />
        ))}
      </div>
    </section>
  );
}
