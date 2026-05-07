import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Sparkle, WandIcon } from "./Icons";
import Reveal from "./Reveal";
import { PACKAGES } from "../data/siteData";

const signaturePkg = PACKAGES.find(p => p.id === 'standard');

const INCLUDED = [
  { label: "Full home, every visit", desc: "Every room cleaned to the same standard each time. No partial cleans, no skipped corners." },
  { label: "Same cleaner", desc: "Your dedicated cleaner gets to know your home. Every visit is consistent, unhurried, and personal." },
  { label: "Hotel-style bed making", desc: "Fresh linen changed and beds made with the precision of a five-star suite." },
  { label: "Bathroom to suite standard", desc: "Sanitised throughout, limescale removed, taps polished, towels folded hotel-style." },
  { label: "All floors vacuumed and mopped", desc: "Throughout the home, including under furniture where accessible." },
  { label: "Completion photos", desc: "Sent after every visit so you can see your home before you walk through the door." },
];

const ROOMS = [
  {
    room: "Bedrooms",
    items: [
      "Hotel-style bed making with linen change",
      "All surfaces dusted and polished",
      "Mirrors and glass polished",
      "Floors vacuumed and mopped",
      "Wardrobe exteriors wiped",
    ],
  },
  {
    room: "Bathrooms",
    items: [
      "Full sanitisation throughout",
      "Limescale removed from taps and fittings",
      "Tiles cleaned and grout refreshed",
      "Towels folded hotel-style",
      "Mirrors and glass polished",
    ],
  },
  {
    room: "Kitchen",
    items: [
      "All surfaces wiped and polished",
      "Appliance exteriors cleaned",
      "Inside microwave",
      "Sink scoured and polished",
      "Floors vacuumed and mopped",
    ],
  },
  {
    room: "Living Areas",
    items: [
      "All surfaces dusted and polished",
      "Upholstery vacuumed",
      "Skirting boards wiped",
      "Mirrors and glass polished",
      "Floors vacuumed and mopped",
    ],
  },
];

export default function SignatureTouchPage() {
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
    <>
      <Helmet>
        <title>The Signature Touch | Premium Regular Cleaning London | London Cleaning Wizard</title>
        <meta name="description" content="The Signature Touch is our premium recurring clean — same cleaner every visit, hotel-style bed making, completion photos and a personalised finish. Book your regular clean today." />
        <link rel="canonical" href="https://londoncleaningwizard.com/signature-touch" />
      </Helmet>
      <div style={{ background: "#faf9f7" }}>

      {/* Hero */}
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
            <Sparkle size={7} color="#c8b89a" /> Our Signature Service <Sparkle size={7} color="#c8b89a" />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 38 : isTablet ? 48 : 56, fontWeight: 300, lineHeight: 1.05, color: "#f5f0e8", marginBottom: 24, letterSpacing: "-0.01em" }}>
            The Signature <em>Touch</em>
          </h1>
          <div style={{ width: 36, height: 1, background: "rgba(200,184,154,0.4)", margin: "0 auto 24px" }} />
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 13 : 15, lineHeight: 1.9, color: "rgba(245,240,232,0.55)", fontWeight: 300, maxWidth: 460, margin: "0 auto" }}>
            More than a clean. A hotel-standard reset for your home, with the same cleaner every time and a finishing touch that makes it feel truly yours.
          </p>
        </div>
      </div>

      {/* Room spray image + pamper experience */}
      <div style={{
        background: "#f2ede6",
        padding: isMobile ? "56px 24px" : "80px clamp(24px, 6vw, 100px)",
      }}>
        <div style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 40 : 64,
          alignItems: "center",
        }}>
          {/* Image */}
          <div style={{ flexShrink: 0 }}>
            <img
              src="/room spray.jpeg"
              alt="Handcrafted signature room mist spray — the finishing touch left after every Signature Hotel Reset by London Cleaning Wizard"
              style={{
                width: isMobile ? "100%" : isTablet ? 280 : 340,
                maxWidth: 340,
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c8b89a", marginBottom: 20 }}>
              The Experience
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 28 : isTablet ? 32 : 38, fontWeight: 300, color: "#1a1410", lineHeight: 1.2, marginBottom: 20, letterSpacing: "-0.01em" }}>
              A pamper experience for your home
            </h2>
            <div style={{ width: 36, height: 1, background: "rgba(200,184,154,0.6)", marginBottom: 28 }} />
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.9, fontWeight: 300, marginBottom: 32 }}>
              We don't think of a clean home as the end of the job. We think of it as the start of the feeling. So we built our Signature Hotel Reset around all of it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 36 }}>
              {[
                "A spotless home, finished to a hotel standard",
                "A calming signature scent, misted through your space so it feels as good as it looks",
                "A handmade candle, crafted at home, to extend the feeling long after we've gone",
                "A message card, because being thoughtful matters",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <span style={{ color: "#c8b89a", fontSize: 14, marginTop: 3, flexShrink: 0 }}>✦</span>
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 15, color: "#5a4e44", lineHeight: 1.7, fontWeight: 300 }}>{item}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 20 : isTablet ? 22 : 24, fontWeight: 400, color: "#2c2420", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
              It's the difference between a service and an experience. We chose experience.
            </p>
          </div>
        </div>
      </div>

      {/* What's included */}
      <section style={{
        padding: isMobile ? "60px 20px" : "100px clamp(24px, 6vw, 100px)",
        background: "#faf9f7",
      }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 64 }}>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 12,
              letterSpacing: "0.2em",
              color: "#8b7355",
              textTransform: "uppercase",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}>
              <Sparkle size={8} color="#c8b89a" /> The Signature Hotel Reset
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(36px, 4vw, 52px)",
              fontWeight: 300,
              lineHeight: 1.1,
              color: "#1a1410",
              marginBottom: 16,
            }}>
              What's included, every time
            </h2>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 14 : 17,
              color: "#5a4e44",
              fontWeight: 300,
              lineHeight: 1.8,
              maxWidth: 560,
              margin: "0 auto",
            }}>
              Designed to create a calm, refined, hotel-like finish across your entire home. Every room, every visit, without exception.
            </p>
          </div>
        </Reveal>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: isMobile ? 28 : 36,
          maxWidth: 1100,
          margin: "0 auto",
        }}>
          {INCLUDED.map((item, i) => (
            <Reveal key={item.label} delay={i * 60}>
              <div style={{ borderTop: "1px solid #e8e0d5", paddingTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Sparkle size={8} color="#c8b89a" />
                  <div style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 12,
                    letterSpacing: "0.1em",
                    fontWeight: 500,
                    color: "#2c2420",
                    textTransform: "uppercase",
                  }}>
                    {item.label}
                  </div>
                </div>
                <p style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: isMobile ? 13 : 15,
                  lineHeight: 1.75,
                  color: "#5a4e44",
                  fontWeight: 300,
                  margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Room by room */}
      <section style={{
        padding: isMobile ? "60px 20px" : "80px clamp(24px, 6vw, 100px)",
        background: "#f2ede6",
      }}>
        <Reveal>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(32px, 4vw, 48px)",
            fontWeight: 300,
            lineHeight: 1.1,
            color: "#1a1410",
            marginBottom: isMobile ? 32 : 48,
            textAlign: "center",
          }}>
            Room by room
          </h2>
        </Reveal>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? 16 : 20,
          maxWidth: 1100,
          margin: "0 auto",
        }}>
          {ROOMS.map((section, i) => (
            <Reveal key={section.room} delay={i * 60} style={{ height: "100%" }}>
              <div style={{
                background: "#faf9f7",
                padding: isMobile ? "24px 20px" : "32px 28px",
                height: "100%",
                boxSizing: "border-box",
              }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: 400,
                  color: "#1a1410",
                  marginBottom: 18,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e8e0d5",
                }}>
                  {section.room}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {section.items.map(item => (
                    <li key={item} style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: isMobile ? 13 : 14,
                      lineHeight: 1.6,
                      color: "#5a4e44",
                      fontWeight: 300,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      marginBottom: 10,
                    }}>
                      <span style={{ flexShrink: 0, marginTop: 3 }}>
                        <Sparkle size={7} color="#c8b89a" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The Signature Touch - the gift */}
      <section style={{
        background: "#2c2420",
        padding: isMobile ? "56px 24px" : isTablet ? "64px 40px" : "80px clamp(40px, 6vw, 100px)",
      }}>
        <div style={{
          maxWidth: 640,
          margin: "0 auto",
          textAlign: isMobile ? "left" : "center",
        }}>
          <div style={{ marginBottom: 16 }}>
            <WandIcon size={28} color="#c8b89a" />
          </div>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "#c8b89a",
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              The Finishing Touch
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: isMobile ? 32 : isTablet ? 36 : 42,
              fontWeight: 300,
              lineHeight: 1.1,
              color: "#f5f0e8",
              marginBottom: 20,
            }}>
              The Signature Touch
            </h2>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 14 : 15,
              lineHeight: 1.9,
              color: "rgba(245,240,232,0.65)",
              fontWeight: 300,
              marginBottom: 24,
            }}>
              At the end of every visit, we leave behind a small, carefully chosen gift. A quiet gesture that marks the difference between a home that has been cleaned and one that has been truly cared for.
            </p>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: isMobile ? 18 : 21,
              color: "#c8b89a",
              lineHeight: 1.5,
              margin: 0,
            }}>
              "It's the detail that makes it feel like coming home."
            </p>
          </div>
      </section>

      {/* Pricing */}
      <section style={{
        padding: isMobile ? "60px 20px" : "100px clamp(24px, 6vw, 100px)",
        background: "#faf9f7",
      }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 36 : 56 }}>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 12,
              letterSpacing: "0.2em",
              color: "#8b7355",
              textTransform: "uppercase",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}>
              <Sparkle size={8} color="#c8b89a" /> Pricing
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: isMobile ? "clamp(28px, 7vw, 38px)" : "clamp(36px, 4vw, 52px)",
              fontWeight: 300,
              lineHeight: 1.1,
              color: "#1a1410",
              marginBottom: 12,
            }}>
              Signature Hotel Reset
            </h2>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 13 : 16,
              color: "#5a4e44",
              fontWeight: 300,
              maxWidth: 600,
              margin: "0 auto",
              lineHeight: 1.7,
            }}>
              {signaturePkg?.desc}
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(${signaturePkg?.sizes?.length || 5}, 1fr)`,
            gap: isMobile ? 12 : 16,
            maxWidth: 820,
            margin: "0 auto 44px",
          }}>
            {signaturePkg?.sizes?.map(size => (
              <div key={size.id} style={{
                border: "1px solid #e8e0d5",
                padding: isMobile ? "20px 12px" : "28px 20px",
                textAlign: "center",
                background: "#fff",
              }}>
                <div style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: isMobile ? 10 : 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8b7355",
                  marginBottom: 10,
                }}>
                  {size.label}
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isMobile ? 28 : 38,
                  fontWeight: 300,
                  color: "#1a1410",
                  lineHeight: 1,
                }}>
                  £{size.basePrice}
                </div>
                <div style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  color: "#8b7355",
                  marginTop: 5,
                  letterSpacing: "0.06em",
                }}>
                  per clean
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div style={{ textAlign: "center" }}>
            <Link
              to="/book"
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 500,
                padding: isMobile ? "14px 36px" : "16px 48px",
                background: "#2c2420",
                color: "#f5f0e8",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <WandIcon size={14} color="#c8b89a" /> Book the Signature Reset
            </Link>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 12,
              color: "#8b7355",
              marginTop: 14,
              letterSpacing: "0.06em",
            }}>
              Save up to £30 per clean with a weekly booking
            </p>
          </div>
        </Reveal>
      </section>

    </div>
    </>
  );
}
