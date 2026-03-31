import { Sparkle } from "./Icons";
import Reveal from "./Reveal";
import { AREAS } from "../data/siteData";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
      aria-label="Areas we serve in East London"
      style={{ padding: isMobile ? "60px 20px" : "80px clamp(24px, 6vw, 100px)", background: "#f2ede6", position: "relative", overflow: "hidden" }}
    >
      <Reveal>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 44 }}>
          <div style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isMobile ? 13 : 16,
            letterSpacing: "0.2em",
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
            fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(36px, 4.5vw, 56px)",
            fontWeight: 300,
            color: "#1a1410",
            lineHeight: 1.1,
          }}>
            Serving <em>East London</em>
          </h2>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isMobile ? 13 : 18,
            lineHeight: 1.8,
            color: "#5a4e44",
            fontWeight: 300,
            maxWidth: 500,
            margin: "16px auto 0",
          }}>
            We cover all major East London postcodes. If you don't see your area listed, get in touch, we may still be able to help.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div
          itemScope
          itemType="https://schema.org/LocalBusiness"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: isMobile ? "8px" : "8px 10px",
            justifyContent: "center",
            maxWidth: 780,
            margin: "0 auto",
          }}
        >
          {AREAS.map((area, i) => (
            <span
              key={area}
              itemProp="areaServed"
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: isMobile ? 11 : 13,
                letterSpacing: "0.12em",
                padding: isMobile ? "7px 14px" : "8px 18px",
                border: "1px solid #d4c4ae",
                color: "#5a4e44",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {i % 4 === 0 && <Sparkle size={6} color="#c8b89a" />}
              {area}
            </span>
          ))}
        </div>

        <p style={{
          fontFamily: "'Jost', sans-serif",
          textAlign: "center",
          marginTop: 28,
          fontSize: isMobile ? 13 : 16,
          color: "#8b7355",
          letterSpacing: "0.08em",
          padding: isMobile ? "0 16px" : 0,
        }}>
          Not on the list?{' '}
          <span
            onClick={() => navigate('/faqs#faq-contact')}
            style={{ color: "#2c2420", fontWeight: 500, textDecoration: "underline", textDecorationColor: "rgba(44,36,32,0.3)", textUnderlineOffset: 3, cursor: 'pointer' }}
          >Get in touch</span> — we may be able to accommodate you.
        </p>
      </Reveal>
    </section>
  );
}