import { useState } from "react";
import { Sparkle } from "./Icons";
import Reveal from "./Reveal";
import { SERVICES } from "../data/siteData";

export default function Services() {
  const [hovered, setHovered] = useState(null);

  return (
    <section id="services" style={{ padding: "100px clamp(24px, 6vw, 100px)", background: "#faf9f7" }}>

      {/* Heading */}
      <Reveal>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
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
            gap: 12,
          }}>
            <Sparkle size={8} color="#c8b89a" /> Our Spells <Sparkle size={8} color="#c8b89a" />
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(36px, 5vw, 62px)",
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

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 2,
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        {SERVICES.map((service, i) => (
          <Reveal key={service.title} delay={i * 75}>
            <div
              style={{ overflow: "hidden", position: "relative", background: "#1a1410", aspectRatio: "4/3", cursor: "default" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <img
                src={service.img}
                alt={service.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: hovered === i ? 0.45 : 0.55,
                  transition: "opacity 0.5s, transform 0.7s cubic-bezier(.4,0,.2,1)",
                  transform: hovered === i ? "scale(1.06)" : "scale(1)",
                }}
              />
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(15,10,6,0.9) 0%, rgba(15,10,6,0.05) 60%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "26px 28px 30px",
              }}>
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: "0.22em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 6 }}>
                  {service.tag}
                </div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 400, color: "#f5f0e8", marginBottom: 8 }}>
                  {service.title}
                </h3>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 12.5, lineHeight: 1.75, color: "rgba(245,240,232,0.6)", fontWeight: 300, marginBottom: 10 }}>
                  {service.desc}
                </p>
                {/* Spell name — reveals on hover */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Sparkle size={8} color="#c8b89a" style={{ opacity: hovered === i ? 1 : 0, transition: "opacity 0.4s" }} />
                  <span style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "#c8b89a",
                    opacity: hovered === i ? 1 : 0,
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
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "#8b7355",
        }}>
          Hover a service to reveal its spell ✦
        </p>
      </Reveal>
    </section>
  );
}