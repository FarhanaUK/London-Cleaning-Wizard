import { useState, useEffect } from "react";
import { Sparkle, WandIcon } from "./Icons";
import Reveal from "./Reveal";
import { PHOTOS } from "../data/siteData";

const FEATURES = [
  "DBS-Checked Team",
  "Premium Cleaning Products",
  "Fully Insured",
  "Flexible Scheduling",
  "Free Re-clean Guarantee",
  "Locally Based in E. London",
];

export default function About() {
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
      id="about"
      aria-label="About London Cleaning Wizard"
      itemScope
      itemType="https://schema.org/LocalBusiness"
      style={{ padding: isMobile ? "60px 20px" : "100px clamp(24px, 6vw, 100px)", background: "#faf9f7" }}
    >
      <meta itemProp="name" content="London Cleaning Wizard" />
      <meta itemProp="description" content="Professional residential cleaning services in London. DBS-checked, eco-friendly, fully insured cleaning team." />
      <meta itemProp="areaServed" content="London" />

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1fr 1fr",
        gap: isMobile ? 60 : isTablet ? 60 : 80,
        alignItems: "center",
        maxWidth: 1200,
        margin: "0 auto",
      }}>

        {/* Photo */}
        <Reveal>
          <div style={{ position: "relative", maxWidth: isMobile ? "100%" : isTablet ? 480 : "100%", margin: isMobile || isTablet ? "0 auto" : 0 }}>
            <img
              src={PHOTOS.cleaner1}
              alt="London Cleaning Wizard professional cleaning team in London"
              itemProp="image"
              style={{
                width: "100%",
                aspectRatio: isMobile ? "4/3" : "3/4",
                objectFit: "cover",
                display: "block",
              }}
            />

            {!isMobile && (
              <>
                <div style={{ position: "absolute", bottom: -22, right: -22, width: 140, height: 140, border: "1px solid #c8b89a", zIndex: 0 }} />
                <div style={{ position: "absolute", top: -14, left: -14, width: 90, height: 90, background: "#f2ede6", zIndex: 0 }} />
              </>
            )}

            <div style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}>
              <Sparkle size={isMobile ? 14 : 18} color="#c8b89a" />
            </div>

            <div style={{
              position: "absolute",
              bottom: isMobile ? 16 : -18,
              left: isMobile ? 16 : 32,
              background: "#2c2420",
              padding: isMobile ? "10px 14px" : "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              zIndex: 2,
            }}>
              <WandIcon size={isMobile ? 16 : 20} color="#c8b89a" />
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 13 : 16, color: "#f5f0e8", fontStyle: "italic" }}>The Wizard's Promise</div>
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 8 : 10, letterSpacing: "0.15em", color: "#c8b89a", textTransform: "uppercase", marginTop: 2 }}>Every home, perfected</div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Text */}
        <Reveal delay={150}>
          <div>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 13 : 16,
              letterSpacing: "0.2em",
              color: "#8b7355",
              textTransform: "uppercase",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <Sparkle size={isMobile ? 8 : 10} color="#c8b89a" /> Our Craft
            </div>

            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(36px, 4.5vw, 56px)",
              fontWeight: 300,
              lineHeight: 1.1,
              marginBottom: 24,
              color: "#1a1410",
            }}>
              We believe every home<br /><em>holds its own magic</em>
            </h2>

            <div style={{ width: 44, height: 1, background: "#c8b89a", marginBottom: 28 }} />

            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 13 : 18,
              lineHeight: 1.9,
              color: "#5a4e44",
              fontWeight: 300,
              marginBottom: 18,
            }}>
              London Cleaning Wizard was born from a simple conviction: your home
              is your sanctuary, and it deserves to be treated with the same care
              and artistry as a treasured space.
            </p>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 13 : 18,
              lineHeight: 1.9,
              color: "#5a4e44",
              fontWeight: 300,
              marginBottom: 36,
            }}>
              Our team are DBS-checked, trained in premium residential methods,
              and chosen for their meticulous eye. We use professional-grade products,
              carefully selected to deliver a thorough, high-quality clean every time.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? "12px" : "16px 28px",
            }}>
              {FEATURES.map((f) => (
                <div key={f} style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: isMobile ? 13 : 16,
                  letterSpacing: "0.06em",
                  color: "#2c2420",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}>
                  <Sparkle size={8} color="#c8b89a" /> {f}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}