import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Sparkle } from "./Icons";

export default function AboutPage() {
  const [screen, setScreen] = useState(() => {
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setScreen("mobile");
      else if (w < 1024) setScreen("tablet");
      else setScreen("desktop");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = screen === "mobile";
  const isTablet = screen === "tablet";

  const px = isMobile ? "24px" : isTablet ? "40px" : "48px";
  const py = isMobile ? "56px" : isTablet ? "64px" : "72px";

  return (
    <>
      <Helmet>
        <title>About Us | London Cleaning Wizard</title>
        <meta name="description" content="London Cleaning Wizard was founded by Farhana with one goal: cleaning that makes you feel better, not just look better. Meet the team behind the magic." />
        <link rel="canonical" href="https://londoncleaningwizard.com/about" />
      </Helmet>
      <div style={{ background: "#faf9f7" }}>

      {/* Hero banner */}
      <div style={{
        background: "#1a1410",
        paddingTop: isMobile ? 108 : 128,
        paddingBottom: isMobile ? 48 : 64,
        paddingLeft: isMobile ? 24 : "clamp(24px, 6vw, 100px)",
        paddingRight: isMobile ? 24 : "clamp(24px, 6vw, 100px)",
        textAlign: "center",
        minHeight: isMobile ? "auto" : 460,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.32em", color: "#c8b89a", textTransform: "uppercase", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Sparkle size={7} color="#c8b89a" /> Our Story <Sparkle size={7} color="#c8b89a" />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 38 : isTablet ? 48 : 56, fontWeight: 300, lineHeight: 1.05, color: "#f5f0e8", marginBottom: 24, letterSpacing: "-0.01em" }}>
            About <em>Us</em>
          </h1>
          <div style={{ width: 36, height: 1, background: "rgba(200,184,154,0.4)", margin: "0 auto 24px" }} />
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 13 : 15, lineHeight: 1.9, color: "rgba(245,240,232,0.55)", fontWeight: 300, maxWidth: 460, margin: "0 auto" }}>
            The story behind London Cleaning Wizard, why we started, and what we're building.
          </p>
        </div>
      </div>

      {/* Main intro */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: `${py} ${px}` }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 22 : isTablet ? 24 : 26, fontWeight: 400, color: "#2c2420", lineHeight: 1.6, marginBottom: 24 }}>
          We started London Cleaning Wizard with a simple idea: cleaning your home shouldn't just make it look better. It should make you <em>feel</em> better.
        </p>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.9, fontWeight: 300, marginBottom: 20 }}>
          Most cleaning services stop at clean. We start there.
        </p>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.9, fontWeight: 300, marginBottom: 20 }}>
          We focus on how your home feels when you walk back in. That moment when everything is calm, balanced, and in place. When the space feels lighter, easier, and quietly taken care of.
        </p>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.9, fontWeight: 300, marginBottom: 40 }}>
          That's what we aim to create every time.
        </p>

        <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8b89a", marginBottom: 24 }}>
          We bring together
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 48 }}>
          {[
            "High-standard, consistent cleaning",
            "Thoughtful presentation and attention to detail",
            "Subtle finishing touches that elevate the space",
          ].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span style={{ color: "#c8b89a", fontSize: 14, marginTop: 2, flexShrink: 0 }}>✦</span>
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.7, fontWeight: 300 }}>{item}</span>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 20 : isTablet ? 22 : 24, fontWeight: 400, color: "#2c2420", lineHeight: 1.6, fontStyle: "italic" }}>
          So your home doesn't just look clean. It feels reset.
        </p>
      </div>

      {/* Founder note */}
      <div style={{ background: "#f2ede6", padding: `${py} ${px}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c8b89a", marginBottom: 20 }}>
            A note from our founder
          </div>
          <div style={{ width: 36, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 40 }} />

          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 36 : isTablet ? 40 : 64,
            alignItems: isMobile ? "center" : "flex-start",
          }}>
            {/* Photo */}
            <div style={{ flexShrink: 0, width: isMobile ? "100%" : isTablet ? 220 : 280 }}>
              <img
                src="/ME.jpg"
                alt="Farhana, founder of London Cleaning Wizard"
                style={{
                  width: isMobile ? "100%" : isTablet ? 220 : 280,
                  height: isMobile ? 340 : isTablet ? 300 : 360,
                  objectFit: "cover",
                  objectPosition: "center top",
                  display: "block",
                }}
              />
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.9, fontWeight: 300, marginBottom: 20 }}>
                I'm Farhana, and I started London Cleaning Wizard because I believe a clean home should feel like a calm, hotel-style space you actually want to come back to. Not overdone. Not artificial. Just clean, balanced, and quietly put together.
              </p>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.9, fontWeight: 300, marginBottom: 20 }}>
                I built this business slowly and intentionally, from the ground up. Every detail, from how our cleaners are trained to how your home is finished, designed around one question: how do I want to feel when I walk through my front door?
              </p>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.9, fontWeight: 300 }}>
                That standard is why we go beyond cleaning. Because the difference between a service and an experience is in the small things you don't have to do, but choose to. That's the standard we hold ourselves to with every clean.
              </p>
              <div style={{ marginTop: 32, fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 18 : 20, fontStyle: "italic", color: "#2c2420" }}>
                Farhana
              </div>
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8b89a", marginTop: 4 }}>
                Founder, London Cleaning Wizard
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vision */}
      <div style={{ background: "#1a1410", padding: `${py} ${px}`, textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c8b89a", marginBottom: 20 }}>
            Our Vision
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 26 : isTablet ? 30 : 34, fontWeight: 300, color: "#f5f0e8", lineHeight: 1.5, margin: "0 auto" }}>
            As we grow, we want to redefine what people expect from a cleaning service across the UK. Not just cleanliness. A better experience of being at home.
          </p>
        </div>
      </div>

    </div>
    </>
  );
}
