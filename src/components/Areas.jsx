import { Sparkle } from "./Icons";
import Reveal from "./Reveal";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const REGIONS = [
  { label: "East & Riverside",    desc: "Canary Wharf, Shoreditch, Hackney, Stratford and beyond" },
  { label: "Central & City",      desc: "Mayfair, Soho, Westminster, Covent Garden and more" },
  { label: "North",               desc: "Islington, Camden, Hampstead, King's Cross and surrounding" },
  { label: "West",                desc: "Kensington, Notting Hill, Chelsea, Paddington and nearby" },
  { label: "South & South East",  desc: "Greenwich, Brixton, Bermondsey, Peckham and further" },
];

export default function Areas() {
  const navigate = useNavigate();
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

  return (
    <section
      id="areas"
      aria-label="Areas we serve in London"
      style={{ padding: isMobile ? "60px 20px" : "80px clamp(24px, 6vw, 100px)", background: "#f2ede6", position: "relative", overflow: "hidden" }}
    >
      <Reveal>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 56 }}>
          <div style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isMobile ? 10 : 11,
            letterSpacing: "0.28em",
            color: "#8b7355",
            textTransform: "uppercase",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}>
            <Sparkle size={7} color="#c8b89a" /> Our Territory
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(36px, 4.5vw, 52px)",
            fontWeight: 300,
            color: "#1a1410",
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Serving <em>London</em>
          </h2>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isMobile ? 13 : 15,
            lineHeight: 1.8,
            color: "#5a4e44",
            fontWeight: 300,
            maxWidth: 460,
            margin: "0 auto",
          }}>
            We cover a wide area across London. Check if we serve your location below.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(5, 1fr)",
          gap: isMobile ? 12 : 14,
          maxWidth: 1100,
          margin: "0 auto 40px",
        }}>
          {REGIONS.map((region, i) => (
            <div key={region.label} style={{
              padding: isMobile ? "24px 20px" : "28px 22px",
              background: "#fff",
              borderBottom: "2px solid #c8b89a",
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 9,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#c8b89a",
                marginBottom: 12,
              }}>
                <Sparkle size={6} color="#c8b89a" />
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: isMobile ? 18 : 20,
                fontWeight: 400,
                color: "#1a1410",
                lineHeight: 1.2,
                marginBottom: 10,
              }}>
                {region.label}
              </div>
              <p style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: isMobile ? 11 : 12,
                lineHeight: 1.7,
                color: "#8b7355",
                fontWeight: 300,
                margin: 0,
              }}>
                {region.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isMobile ? 13 : 14,
            color: "#5a4e44",
            fontWeight: 300,
            marginBottom: 20,
            letterSpacing: "0.04em",
          }}>
            Not sure if we cover your area?
          </p>
          <button
            onClick={() => navigate("/areas")}
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "14px 36px",
              background: "#2c2420",
              color: "#f5f0e8",
              border: "none",
              cursor: "pointer",
            }}
          >
            See All Areas We Cover
          </button>
        </div>
      </Reveal>
    </section>
  );
}
