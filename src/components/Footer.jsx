import { Sparkle, LogoMark } from "./Icons";
import { NAV_LINKS } from "../data/siteData";
import { useState, useEffect } from "react";

export default function Footer() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer style={{ position: "relative", background: "#100c09", padding: "48px clamp(24px, 6vw, 100px)", overflow: "hidden" }}>

      {/* Top gold line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(200,184,154,0.3), transparent)" }} />

      {/* Top row */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 24 : 0,
        borderBottom: "1px solid rgba(200,184,154,0.1)",
        paddingBottom: 32,
        marginBottom: 28,
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LogoMark size={32} color="rgba(200,184,154,0.4)" />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#f5f0e8", fontWeight: 400, letterSpacing: "0.04em" }}>
              London Cleaning Wizard
            </div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, letterSpacing: "0.22em", color: "#8b7355", textTransform: "uppercase", marginTop: 3 }}>
              Residential Cleaning · East London
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: isMobile ? "14px 24px" : 32,
        }}>
          {NAV_LINKS.map(({ id, label }) => (
            <span
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(245,240,232,0.35)",
                cursor: "pointer",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: "rgba(245,240,232,0.2)", letterSpacing: "0.08em" }}>
          © {new Date().getFullYear()} London Cleaning Wizard · All rights reserved.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkle size={8} color="#8b7355" />
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: "#8b7355", letterSpacing: "0.1em" }}>
            Crafted with care · East London
          </p>
          <Sparkle size={8} color="#8b7355" />
        </div>
      </div>
    </footer>
  );
}