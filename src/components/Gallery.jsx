import { useState, useEffect } from "react";
import { Sparkle } from "./Icons";
import Reveal from "./Reveal";
import { GALLERY } from "../data/siteData";

export default function Gallery() {
  const [lightbox, setLightbox] = useState(null);
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

  const isDesktop = !isMobile && !isTablet;

  return (
    <>
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(15,10,6,0.93)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <img
            src={GALLERY[lightbox].img}
            alt={GALLERY[lightbox].alt}
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
          />
          <div style={{ position: "absolute", top: 24, right: 32, color: "rgba(245,240,232,0.5)", fontSize: 28, fontFamily: "'Jost', sans-serif", fontWeight: 300 }}>✕</div>
        </div>
      )}

      <section id="our-work" style={{ padding: isMobile ? "60px 20px" : "80px clamp(24px, 6vw, 100px)", background: "#f2ede6" }}>

        <Reveal>
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "flex-end",
            justifyContent: "space-between",
            gap: isMobile ? 12 : 20,
            marginBottom: isMobile ? 32 : 52,
          }}>
            <div>
              <div style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 16,
                letterSpacing: "0.2em",
                color: "#8b7355",
                textTransform: "uppercase",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <Sparkle size={8} color="#c8b89a" /> Our Work
              </div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(36px, 4.5vw, 56px)",
                fontWeight: 300,
                lineHeight: 1.1,
                color: "#1a1410",
              }}>
                Homes we've<br /><em>enchanted</em>
              </h2>
            </div>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 13 : 18,
              lineHeight: 1.85,
              color: "#6b5e52",
              maxWidth: isMobile ? "100%" : 300,
              fontWeight: 300,
            }}>
              Every image is from a real London home. No staging, just genuine, magical results.
            </p>
          </div>
        </Reveal>

        {/* Mobile */}
        {isMobile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {GALLERY.map((item, i) => (
              <Reveal key={item.label} delay={i * 60}>
                <div
                  onClick={() => setLightbox(i)}
                  style={{ width: "100%", height: 220, overflow: "hidden", position: "relative", cursor: "pointer" }}
                >
                  <img
                    src={item.img}
                    alt={item.alt}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(15,10,6,0.2)" }}>
                    <div style={{ position: "absolute", bottom: 12, left: 14, fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.18em", color: "#f5f0e8", textTransform: "uppercase" }}>
                      {item.label}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* Tablet */}
        {isTablet && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, maxWidth: 1200, margin: "0 auto" }}>
            {GALLERY.map((item, i) => (
              <Reveal key={item.label} delay={i * 60}>
                <div
                  onClick={() => setLightbox(i)}
                  style={{ width: "100%", height: 280, overflow: "hidden", position: "relative", cursor: "pointer" }}
                  onMouseEnter={e => {
                    e.currentTarget.querySelector(".overlay").style.background = "rgba(15,10,6,0.4)";
                    e.currentTarget.querySelector(".glabel").style.opacity = 1;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.querySelector(".overlay").style.background = "rgba(15,10,6,0)";
                    e.currentTarget.querySelector(".glabel").style.opacity = 0;
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.alt}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div className="overlay" style={{ position: "absolute", inset: 0, background: "rgba(15,10,6,0)", transition: "background 0.4s" }}>
                    <div className="glabel" style={{ position: "absolute", bottom: 14, left: 16, fontFamily: "'Jost', sans-serif", fontSize: 13, letterSpacing: "0.18em", color: "#f5f0e8", textTransform: "uppercase", opacity: 0, transition: "opacity 0.35s" }}>
                      {item.label}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* Desktop */}
        {isDesktop && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 6, maxWidth: 1200, margin: "0 auto" }}>
            {GALLERY.map((item, i) => {
              const configs = [
                { col: "span 7", row: "span 2", minH: 300 },
                { col: "span 5", row: "span 1", minH: 180 },
                { col: "span 5", row: "span 1", minH: 180 },
                { col: "span 4", row: "span 1", minH: 180 },
                { col: "span 4", row: "span 1", minH: 180 },
                { col: "span 4", row: "span 1", minH: 180 },
              ];
              const cfg = configs[i];
              return (
                <Reveal key={item.label} delay={i * 70} style={{ gridColumn: cfg.col, gridRow: cfg.row, minHeight: cfg.minH }}>
                  <div
                    onClick={() => setLightbox(i)}
                    style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", cursor: "pointer", minHeight: cfg.minH }}
                    onMouseEnter={e => {
                      e.currentTarget.querySelector(".overlay").style.background = "rgba(15,10,6,0.4)";
                      e.currentTarget.querySelector(".glabel").style.opacity = 1;
                      e.currentTarget.querySelector(".gstar").style.opacity = 1;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.querySelector(".overlay").style.background = "rgba(15,10,6,0)";
                      e.currentTarget.querySelector(".glabel").style.opacity = 0;
                      e.currentTarget.querySelector(".gstar").style.opacity = 0;
                    }}
                  >
                    <img
                      src={item.img}
                      alt={item.alt}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.65s cubic-bezier(.4,0,.2,1)" }}
                    />
                    <div className="overlay" style={{ position: "absolute", inset: 0, background: "rgba(15,10,6,0)", transition: "background 0.4s" }}>
                      <div className="gstar" style={{ position: "absolute", top: 16, right: 16, opacity: 0, transition: "opacity 0.35s" }}>
                        <Sparkle size={14} color="#c8b89a" />
                      </div>
                      <div className="glabel" style={{ position: "absolute", bottom: 14, left: 16, fontFamily: "'Jost', sans-serif", fontSize: 13, letterSpacing: "0.18em", color: "#f5f0e8", textTransform: "uppercase", opacity: 0, transition: "opacity 0.35s" }}>
                        {item.label}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        <Reveal delay={200}>
          <div style={{ textAlign: "center", marginTop: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Sparkle size={9} color="#c8b89a" />
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 13 : 16, letterSpacing: "0.12em", color: "#8b7355" }}>
              {isMobile ? "Tap any image to enlarge" : "Click any image to enlarge · All photos from real London homes"}
            </p>
            <Sparkle size={9} color="#c8b89a" />
          </div>
        </Reveal>
      </section>
    </>
  );
}