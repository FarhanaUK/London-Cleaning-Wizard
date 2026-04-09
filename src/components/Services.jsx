import { useState, useEffect } from "react";
import { Sparkle } from "./Icons";
import Reveal from "./Reveal";
import { SERVICES } from "../data/siteData";
import { useNavigate } from "react-router-dom";

export default function Services() {
  const [hovered, setHovered] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section id="services" style={{ padding: isMobile ? "60px 20px" : "100px clamp(24px, 6vw, 100px)", background: "#faf9f7" }}>

      <Reveal>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 36 : 64 }}>
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
            gap: 12,
          }}>
            <Sparkle size={8} color="#c8b89a" /> Our Spells <Sparkle size={8} color="#c8b89a" />
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(36px, 4.5vw, 56px)",
            fontWeight: 300,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            color: "#1a1410",
          }}>
            Cleaning services crafted<br />
            <em>for the modern London home</em>
          </h2>
        </div>
      </Reveal>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: isMobile ? 3 : 2,
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        {SERVICES.map((service, i) => (
          <Reveal key={service.title} delay={i * 75}>
            <div
              style={{ overflow: "hidden", position: "relative", background: "#10121a", aspectRatio: "4/3", cursor: "pointer" }}
              onMouseEnter={() => !isMobile && setHovered(i)}
              onMouseLeave={() => !isMobile && setHovered(null)}
              onClick={() => navigate('/book')}
            >
              <img
                src={service.img}
                alt={service.alt}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: isMobile ? 0.5 : hovered === i ? 0.45 : 0.55,
                  transition: "opacity 0.5s, transform 0.7s cubic-bezier(.4,0,.2,1)",
                  transform: isMobile ? "scale(1.04)" : hovered === i ? "scale(1.06)" : "scale(1)",
                }}
              />
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(15,10,6,0.9) 0%, rgba(15,10,6,0.05) 60%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: isMobile ? "16px 16px 18px" : "26px 28px 30px",
              }}>
               <div style={{
  fontFamily: "'Jost', sans-serif",
  fontSize: isMobile ? 10 : isTablet ? 13 : 16,
  letterSpacing: "0.2em",
  color: "rgb(255, 255, 255)",
  textTransform: "uppercase",
  marginBottom: isMobile ? 3 : 6,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}}>
                  {service.tag}
                </div>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isMobile ? 20 : isTablet ? 22 : 34,
                  fontWeight: 400,
                  color: "#f5f0e8",
                  marginBottom: isMobile ? 4 : 8,
                }}>
                  {service.title}
                </h3>
                <p style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: isMobile ? 13 : isTablet ? 15 : 18,
                  lineHeight: 1.65,
                  color: "rgba(245,240,232,0.6)",
                  fontWeight: 300,
                  marginBottom: isMobile ? 6 : 10,
                  display: isMobile ? "-webkit-box" : "block",
                  WebkitLineClamp: isMobile ? 2 : "unset",
                  WebkitBoxOrient: isMobile ? "vertical" : "unset",
                  overflow: isMobile ? "hidden" : "visible",
                }}>
                  {service.desc}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Sparkle size={8} color="#c8b89a" style={{ opacity: isMobile ? 1 : hovered === i ? 1 : 0, transition: "opacity 0.4s" }} />
                  <span style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    fontSize: isMobile ? 13 : 18,
                    color: "#c8b89a",
                    opacity: isMobile ? 1 : hovered === i ? 1 : 0,
                    transition: "opacity 0.4s",
                  }}>
                    {service.spell}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <p style={{
          fontFamily: "'Jost', sans-serif",
          textAlign: "center",
          marginTop: 32,
          fontSize: isMobile ? 13 : 16,
          letterSpacing: "0.1em",
          color: "#8b7355",
        }}>
          {isMobile ? "Tap to reveal the spell · Tap again to book ✦" : "Hover a service to reveal its spell · Click to book ✦"}
        </p>
      </Reveal>
    </section>
  );
}