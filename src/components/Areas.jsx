import { Sparkle } from "./Icons";
import Reveal from "./Reveal";
import { AREAS } from "../data/siteData";
import { useState, useEffect } from "react";

export default function Areas() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section style={{ padding: "80px clamp(24px, 6vw, 100px)", background: "#f2ede6", position: "relative", overflow: "hidden" }}>

      <Reveal>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "#8b7355",
            textTransform: "uppercase",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}>
            <Sparkle size={8} color="#c8b89a" /> Our Territory
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(28px, 3.5vw, 46px)",
            fontWeight: 300,
            color: "#1a1410",
          }}>
            Serving <em>East London</em>
          </h2>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: isMobile ? "8px" : "8px 10px",
          justifyContent: "center",
          maxWidth: 780,
          margin: "0 auto",
        }}>
          {AREAS.map((area, i) => (
            <span key={area} style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 9 : 10,
              letterSpacing: "0.12em",
              padding: isMobile ? "6px 12px" : "7px 16px",
              border: "1px solid #d4c4ae",
              color: "#5a4e44",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              {i % 4 === 0 && <Sparkle size={6} color="#c8b89a" />}
              {area}
            </span>
          ))}
        </div>

        <p style={{
          fontFamily: "'Jost', sans-serif",
          textAlign: "center",
          marginTop: 24,
          fontSize: isMobile ? 10 : 11,
          color: "#8b7355",
          letterSpacing: "0.08em",
          padding: isMobile ? "0 24px" : 0,
        }}>
          Not on the list? Get in touch — we may be able to accommodate you.
        </p>
      </Reveal>
    </section>
  );
}