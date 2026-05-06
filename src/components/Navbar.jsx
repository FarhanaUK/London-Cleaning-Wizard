import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LogoMark, WandIcon } from "./Icons";
import { NAV_LINKS } from "../data/siteData";
import { Link, useNavigate, useLocation } from "react-router-dom";

const SERVICE_SUB_LINKS = [
  { label: "Signature Packages", tab: "signature"  },
  { label: "Hourly Clean",       tab: "hourly"     },
  { label: "Commercial",         tab: "commercial" },
];

export default function Navbar() {
  const [scrolled,      setScrolled]      = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [servicesOpen,  setServicesOpen]  = useState(false);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);
  const [isTablet,      setIsTablet]      = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const navRef     = useRef(null);
  const triggerRef = useRef(null);
  const portalRef  = useRef(null);
  const [dropLeft, setDropLeft] = useState(0);

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

  useEffect(() => {
    if (!servicesOpen) return;
    const handleClickOutside = (e) => {
      const inNav    = navRef.current?.contains(e.target);
      const inPortal = portalRef.current?.contains(e.target);
      if (!inNav && !inPortal) setServicesOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [servicesOpen]);

  // Close dropdown on route change
  useEffect(() => { setServicesOpen(false); }, [location.pathname]);

  const goToBooking = (tab) => {
    sessionStorage.setItem("pkgTab", tab);
    setServicesOpen(false);
    setMenuOpen(false);
    navigate("/book", { state: { pkgTab: tab } });
  };

  const goHome = () => {
    setMenuOpen(false);
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const linkStyle = {
    fontFamily: "'Jost', sans-serif",
    fontSize: isTablet ? 10 : 12,
    letterSpacing: isTablet ? "0.08em" : "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    color: isDark ? "#5a4e44" : "rgba(245,240,232,0.75)",
    transition: "color 0.3s",
  };

  return (
    <>
      <nav
        ref={navRef}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", flexDirection: "column",
          background: isDark ? "rgba(250,249,247,0.97)" : "rgba(250,249,247,0)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid",
          borderBottomColor: (isDark || servicesOpen) ? "rgba(200,184,154,0.2)" : "rgba(200,184,154,0)",
          transition: "background 0.4s cubic-bezier(.4,0,.2,1), border-bottom-color 0.4s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Main nav row */}
        <div style={{
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "0 20px" : isTablet ? "0 32px" : "0 clamp(20px, 5vw, 72px)",
        }}>

          {/* Logo */}
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ display: "flex", alignItems: "center", gap: isTablet ? 8 : 12, cursor: "pointer", textDecoration: "none" }}>
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
                Est. London
              </div>
            </div>
          </Link>

          {/* Desktop + Tablet links */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: isTablet ? 20 : 36 }}>

              {/* Services toggle */}
              <span
                ref={triggerRef}
                onClick={() => {
                  if (triggerRef.current) {
                    const r = triggerRef.current.getBoundingClientRect();
                    setDropLeft(r.left + r.width / 2);
                  }
                  setServicesOpen(o => !o);
                }}
                style={{ ...linkStyle, display: "flex", alignItems: "center", gap: 4, userSelect: "none",
                  color: servicesOpen ? "#1a1410" : (isDark ? "#5a4e44" : "rgba(245,240,232,0.75)"),
                }}
              >
                Services
                <span style={{
                  fontSize: 14, opacity: 0.8, display: "inline-block",
                  transform: servicesOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>▾</span>
              </span>

              {/* Dropdown — portal so it escapes the navbar stacking context */}
              {servicesOpen && createPortal(
                <div ref={portalRef} style={{
                  position: "fixed",
                  top: 67,
                  left: dropLeft,
                  transform: "translateX(-50%)",
                  background: "rgba(250,249,247,0.97)",
                  backdropFilter: "blur(18px)",
                  borderTop: "none",
                  borderLeft: "1px solid rgba(200,184,154,0.2)",
                  borderRight: "1px solid rgba(200,184,154,0.2)",
                  borderBottom: "1px solid rgba(200,184,154,0.2)",
                  boxShadow: "0 8px 20px rgba(26,20,16,0.08)",
                  minWidth: 200,
                  zIndex: 9999,
                  padding: "6px 0",
                }}>
                  {SERVICE_SUB_LINKS.map(item => (
                    <div
                      key={item.label}
                      onClick={() => goToBooking(item.tab)}
                      onMouseEnter={e => e.currentTarget.style.color = "#1a1410"}
                      onMouseLeave={e => e.currentTarget.style.color = "#5a4e44"}
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        padding: "12px 24px",
                        cursor: "pointer",
                        color: "#5a4e44",
                        transition: "color 0.2s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>,
                document.body
              )}

              {/* Other nav links */}
              {NAV_LINKS.filter(l => l.path !== "/services").map(({ path, label }) => (
                <Link key={path} to={path} style={{ ...linkStyle, textDecoration: "none" }}>
                  {label}
                </Link>
              ))}

              <Link to="/book" style={{
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
                textDecoration: "none",
              }}>
                {!isTablet && <WandIcon size={14} color="#c8b89a" />} Book a Clean
              </Link>
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
        </div>

      </nav>

      {/* Mobile menu */}
      {menuOpen && isMobile && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 45, background: "#1a1410",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28,
          overflowY: "auto", padding: "40px 20px",
        }}>
          <WandIcon size={40} color="#c8b89a" />

          {/* Services group */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.35)",
              marginBottom: 16,
            }}>
              Services
            </div>
            {SERVICE_SUB_LINKS.map(item => (
              <div
                key={item.label}
                onClick={() => goToBooking(item.tab)}
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 16,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#f5f0e8",
                  cursor: "pointer",
                  marginBottom: 14,
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Other nav links */}
          {NAV_LINKS.filter(l => l.path !== "/services").map(({ path, label }) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)} style={{
              fontFamily: "'Jost', sans-serif", fontSize: 18, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#f5f0e8", cursor: "pointer", textDecoration: "none",
            }}>
              {label}
            </Link>
          ))}

          <Link to="/book" onClick={() => setMenuOpen(false)} style={{
            fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em",
            textTransform: "uppercase", fontWeight: 500, padding: "15px 44px",
            background: "#2c2420", color: "#f5f0e8", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
          }}>
            <WandIcon size={14} color="#c8b89a" /> Book a Clean
          </Link>
        </div>
      )}
    </>
  );
}
