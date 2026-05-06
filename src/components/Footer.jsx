import { Sparkle, LogoMark } from "./Icons";
import { NAV_LINKS } from "../data/siteData";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Footer() {
  const [screen, setScreen] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    const width = window.innerWidth;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setScreen("mobile");
      else if (width < 1024) setScreen("tablet");
      else setScreen("desktop");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollTo = (id) => {
    if (id === "contact") {
      if (location.pathname !== "/faqs") {
        navigate("/faqs");
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 100);
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
      return;
    }

    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isMobile = screen === "mobile";
  const isTablet = screen === "tablet";

  return (
    <footer
      id="footer-contact"
      role="contentinfo"
      aria-label="London Cleaning Wizard footer"
      style={{
        position: "relative",
        background: "#1a1410",
        padding: isMobile
          ? "40px 20px"
          : isTablet
          ? "48px 40px"
          : "48px clamp(24px, 6vw, 100px)",
        overflow: "hidden",
      }}
    >
      {/* Top gold line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(to right, transparent, rgba(200,184,154,0.3), transparent)",
        }}
      />

      {/* Top row */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isMobile ? 28 : isTablet ? 20 : 0,
          borderBottom: "1px solid rgba(200,184,154,0.1)",
          paddingBottom: isMobile ? 32 : 24,
          marginBottom: isMobile ? 28 : 24,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LogoMark size={32} color="rgba(200,184,154,0.4)" />
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: isMobile ? 16 : isTablet ? 17 : 18,
                color: "#f5f0e8",
                fontWeight: 400,
                letterSpacing: "0.04em",
              }}
            >
              London Cleaning Wizard
            </div>
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: isMobile ? 8 : isTablet ? 8.5 : 9,
                letterSpacing: "0.22em",
                color: "#8b7355",
                textTransform: "uppercase",
                marginTop: 3,
              }}
            >
              Cleaning Services · London
            </div>
          </div>
        </div>

      </div>

      {/* Social media links */}
      <div
        style={{
          display: "flex",
          gap: isTablet ? 12 : 16,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Instagram", href: "https://instagram.com/londoncleaningwizard" },
          { label: "Facebook", href: "https://facebook.com/londoncleaningwizard" },
          { label: "TikTok", href: "https://tiktok.com/@londoncleaningwizard" },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow London Cleaning Wizard on ${label}`}
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 10 : isTablet ? 10.5 : 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.35)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkle size={6} color="#8b7355" /> {label}
          </a>
        ))}
      </div>

     {/* Legal links */}
<div
  style={{
    display: "flex",
    flexDirection: isMobile ? "column" : "row", // stack on mobile
    alignItems: isMobile ? "flex-start" : "center",
    gap: isMobile ? 10 : isTablet ? 16 : 24,
    marginBottom: 24,
  }}
>
  {[ 
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
    { label: "FAQs", href: "/faqs" },
  ].map(({ label, href }) => (
    <a
      key={label}
      href={href}
      style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: isMobile ? 10 : isTablet ? 10.5 : 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(245,240,232,0.25)",
        textDecoration: "none",
        marginBottom: isMobile ? 8 : 0, // add spacing between stacked links
      }}
    >
      {label}
    </a>
  ))}

  {/* Contacts link scrolling to bottom of FAQs */}
  <span
    onClick={() => scrollTo("contact")}
    style={{
      fontFamily: "'Jost', sans-serif",
      fontSize: isMobile ? 10 : isTablet ? 10.5 : 11,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "rgba(245,240,232,0.25)",
      cursor: "pointer",
      marginBottom: isMobile ? 8 : 0, // same spacing
    }}
  >
    Contacts
  </span>
</div>

      {/* Bottom row */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 12,
          borderTop: "1px solid rgba(200,184,154,0.06)",
          paddingTop: 20,
        }}
      >
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isMobile ? 10 : isTablet ? 10.5 : 11,
            color: "rgba(245,240,232,0.2)",
            letterSpacing: "0.08em",
          }}
        >
          © {new Date().getFullYear()} London Cleaning Wizard · All rights reserved.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkle size={8} color="#8b7355" />
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 10 : isTablet ? 10.5 : 11,
              color: "#8b7355",
              letterSpacing: "0.1em",
            }}
          >
            Crafted with care · London
          </p>
          <Sparkle size={8} color="#8b7355" />
        </div>
      </div>
    </footer>
  );
}