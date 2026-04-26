import { useState, useEffect } from "react";
import { LogoMark, WandIcon } from "./Icons";
import { NAV_LINKS } from "../data/siteData";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  const navigate = useNavigate();
  const location = useLocation();
  const isDark = scrolled || location.pathname !== "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);

    if (id === "contact") {
    // Navigate to FAQS page and scroll to bottom
    navigate("/faqs");
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
    return; // stop here for contact
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

  const goHome = () => {
    setMenuOpen(false);
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 20px" : isTablet ? "0 32px" : "0 clamp(20px, 5vw, 72px)",
        height: "68px",
        background: isDark ? "rgba(250,249,247,0.97)" : "rgba(250,249,247,0)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid",
        borderBottomColor: isDark ? "rgba(200,184,154,0.2)" : "rgba(200,184,154,0)",
        transition: "background 0.4s cubic-bezier(.4,0,.2,1), border-bottom-color 0.4s cubic-bezier(.4,0,.2,1)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: isTablet ? 8 : 12, cursor: "pointer" }}
          onClick={goHome}>
          <LogoMark
            size={isTablet ? 28 : 36}
            color={isDark ? "#c8b89a" : "rgba(200,184,154,0.85)"}
            innerColor={isDark ? "#8b7355" : "rgba(200,184,154,0.6)"}
          />
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: isTablet ? 14 : 18,
              letterSpacing: "0.05em",
              lineHeight: 1.1,
              color: isDark ? "#2c2420" : "#f5f0e8",
            }}>
              London Cleaning Wizard
            </div>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 8,
              letterSpacing: "0.22em",
              color: isDark ? "#c8b89a" : "rgba(200,184,154,0.65)",
              textTransform: "uppercase",
              marginTop: 1,
            }}>
              Est. East London
            </div>
          </div>
        </div>

        {/* Desktop + Tablet links */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: isTablet ? 20 : 36 }}>
            {NAV_LINKS.map(({ id, label }) => (
              <span key={id} onClick={() => scrollTo(id)} style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: isTablet ? 10 : 12,
                letterSpacing: isTablet ? "0.08em" : "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                color: isDark ? "#5a4e44" : "rgba(245,240,232,0.75)",
                transition: "color 0.3s",
              }}>
                {label}
              </span>
            ))}
            <button onClick={() => navigate("/book")} style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isTablet ? 10 : 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: isTablet ? "8px 16px" : "10px 26px",
              background: isDark ? "#2c2420" : "transparent",
              border: isDark ? "none" : "1px solid rgba(245,240,232,0.45)",
              color: "#f5f0e8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              {!isTablet && <WandIcon size={14} color="#c8b89a" />} Book a Clean
            </button>
          </div>
        )}

        {/* Hamburger — mobile only */}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 22, color: isDark ? "#2c2420" : "#f5f0e8",
          }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </nav>

      {/* Mobile menu */}
      {menuOpen && isMobile && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 45, background: "#1a1410",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36,
        }}>
          <WandIcon size={40} color="#c8b89a" />
          {NAV_LINKS.map(({ id, label }) => (
            <span key={id} onClick={() => scrollTo(id)} style={{
              fontFamily: "'Jost', sans-serif", fontSize: 18, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#f5f0e8", cursor: "pointer",
            }}>
              {label}
            </span>
          ))}
          <button onClick={() => { setMenuOpen(false); navigate("/book"); }} style={{
            fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em",
            textTransform: "uppercase", fontWeight: 500, padding: "15px 44px",
            background: "#2c2420", color: "#f5f0e8", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <WandIcon size={14} color="#c8b89a" /> Book a Clean
          </button>
        </div>
      )}
    </>
  );
}