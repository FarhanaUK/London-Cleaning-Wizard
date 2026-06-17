import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LogoMark, WandIcon } from "./Icons";
import { NAV_LINKS } from "../data/siteData";
import { Link, useNavigate, useLocation } from "react-router-dom";

const SERVICE_SUB_LINKS = [
  { label: "Signature Hotel Reset", tab: "signature"  },
  { label: "Regular Clean",         tab: "regular"    },
  { label: "Deep Clean",            tab: "deep"       },
  { label: "Commercial & Airbnb",   tab: "commercial" },
  { label: "Go to Booking >",       tab: "book",      cta: true },
];

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isCompact,    setIsCompact]    = useState(window.innerWidth < 1280);
  const navRef     = useRef(null);
  const triggerRef = useRef(null);
  const portalRef  = useRef(null);
  const [dropLeft, setDropLeft] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const isDark = scrolled || location.pathname !== "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    const handleResize = () => setIsCompact(window.innerWidth < 1280);
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

  useEffect(() => { setServicesOpen(false); setMenuOpen(false); }, [location.pathname]);

  const goToBooking = (tab) => {
    setServicesOpen(false);
    setMenuOpen(false);
    if (tab === 'commercial') navigate('/commercial-clean');
    else if (tab === 'regular') navigate('/regular-clean');
    else if (tab === 'deep') navigate('/deep-clean');
    else if (tab === 'book') navigate('/book');
    else if (tab === 'signature') navigate('/signature-touch');
    else navigate('/book', { state: { pkgTab: tab } });
  };

  const isMobile = window.innerWidth < 768;

  return (
    <>
      <nav
        ref={navRef}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
          display: "flex", flexDirection: "column",
          background: isDark ? "rgba(250,249,247,0.97)" : "rgba(250,249,247,0)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid",
          borderBottomColor: (isDark || servicesOpen) ? "rgba(200,184,154,0.2)" : "rgba(200,184,154,0)",
          transition: "background 0.4s cubic-bezier(.4,0,.2,1), border-bottom-color 0.4s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div style={{
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isCompact ? "0 20px" : "0 clamp(20px, 5vw, 72px)",
        }}>

          {/* Logo */}
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textDecoration: "none", flexShrink: 0 }}>
            <LogoMark size={36} color={isDark ? "#c8b89a" : "rgba(200,184,154,0.85)"} innerColor={isDark ? "#8b7355" : "rgba(200,184,154,0.6)"} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 18, letterSpacing: "0.05em", lineHeight: 1.1, color: isDark ? "#2c2420" : "#f5f0e8" }}>
                London Cleaning Wizard
              </div>
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, letterSpacing: "0.22em", color: isDark ? "#c8b89a" : "rgba(200,184,154,0.65)", textTransform: "uppercase", marginTop: 1 }}>
                Est. London
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          {!isCompact && (
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <span
                ref={triggerRef}
                onClick={() => {
                  if (triggerRef.current) {
                    const r = triggerRef.current.getBoundingClientRect();
                    setDropLeft(r.left + r.width / 2);
                  }
                  setServicesOpen(o => !o);
                }}
                style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4, color: servicesOpen ? "#1a1410" : (isDark ? "#5a4e44" : "rgba(245,240,232,0.75)"), transition: "color 0.3s" }}
              >
                Services
                <span style={{ fontSize: 14, opacity: 0.8, display: "inline-block", transform: servicesOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
              </span>

              {servicesOpen && createPortal(
                <div ref={portalRef} style={{ position: "fixed", top: 67, left: dropLeft, transform: "translateX(-50%)", background: "rgba(250,249,247,0.97)", backdropFilter: "blur(18px)", border: "1px solid rgba(200,184,154,0.2)", borderTop: "none", boxShadow: "0 8px 20px rgba(26,20,16,0.08)", minWidth: 200, zIndex: 9999, padding: "6px 0" }}>
                  {SERVICE_SUB_LINKS.map(item => (
                    <div key={item.label}>
                      {item.cta && <div style={{ height: 1, background: "rgba(200,184,154,0.15)", margin: "4px 0" }} />}
                      <div onClick={() => goToBooking(item.tab)} onMouseEnter={e => e.currentTarget.style.color = "#1a1410"} onMouseLeave={e => e.currentTarget.style.color = item.cta ? "#1a1410" : "#5a4e44"} style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "11px 24px", cursor: "pointer", color: item.cta ? "#1a1410" : "#5a4e44", background: "transparent", transition: "color 0.2s", whiteSpace: "nowrap" }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>,
                document.body
              )}

              {NAV_LINKS.filter(l => l.path !== "/services").map(({ path, label }) => (
                <Link key={path} to={path} style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: isDark ? "#5a4e44" : "rgba(245,240,232,0.75)", transition: "color 0.3s", textDecoration: "none", whiteSpace: "nowrap" }}>
                  {label}
                </Link>
              ))}

              <a href="tel:02081370026" style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", color: isDark ? "#2c2420" : "rgba(245,240,232,0.85)", transition: "color 0.3s" }}>
                📞 020 8137 0026
              </a>

              <Link to="/book?from=navbar" style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500, padding: "10px 26px", background: isDark ? "#2c2420" : "transparent", border: isDark ? "none" : "1px solid rgba(245,240,232,0.45)", color: "#f5f0e8", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
                <WandIcon size={14} color="#c8b89a" /> Book Now
              </Link>
            </div>
          )}

          {/* Hamburger */}
          {isCompact && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a href="tel:02081370026" style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 500, color: isDark ? "#2c2420" : "rgba(245,240,232,0.9)", textDecoration: "none" }}>
                {isMobile ? "📞" : "📞 020 8137 0026"}
              </a>
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: isDark ? "#2c2420" : "#f5f0e8" }}>
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>
          )}

        </div>
      </nav>

      {/* Mobile / tablet menu */}
      {menuOpen && isCompact && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "#1a1410", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", paddingTop: 96, paddingBottom: 48, paddingLeft: 20, paddingRight: 20 }}>
          <div style={{ width: "100%", paddingLeft: 32 }}>
            {SERVICE_SUB_LINKS.filter(i => !i.cta).map(item => (
              <div key={item.label} onClick={() => goToBooking(item.tab)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,240,232,0.7)", cursor: "pointer", marginBottom: 20 }}>
                {item.label}
              </div>
            ))}
            <div style={{ width: 32, height: 1, background: "rgba(200,184,154,0.2)", margin: "8px 0 28px" }} />
            {NAV_LINKS.filter(l => l.path !== "/services").map(({ path, label }) => (
              <Link key={path} to={path} onClick={() => setMenuOpen(false)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,240,232,0.7)", cursor: "pointer", textDecoration: "none", marginBottom: 20, display: "block" }}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ width: "100%", paddingLeft: 32, marginTop: 8 }}>
            <Link to="/book?from=navbar" onClick={() => setMenuOpen(false)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "15px 44px", background: "#2c2420", color: "#f5f0e8", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <WandIcon size={14} color="#c8b89a" /> Book Now
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
