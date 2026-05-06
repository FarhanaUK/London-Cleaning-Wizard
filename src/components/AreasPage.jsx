import { useState, useEffect } from "react";
import { Sparkle } from "./Icons";
import { AREAS } from "../data/siteData";
import { useNavigate } from "react-router-dom";

const REGIONS = [
  {
    label: "East & Riverside",
    areas: ["Canary Wharf", "Isle of Dogs", "Cubitt Town", "Poplar", "Limehouse", "Canning Town", "Royal Docks", "Silvertown", "Stratford", "West Ham", "Forest Gate", "Wapping", "Spitalfields", "Shoreditch", "Hoxton", "Whitechapel", "Stepney", "Bethnal Green", "Haggerston", "Bow", "Mile End", "Bromley by Bow", "Hackney Wick", "Homerton", "Clapton", "Dalston", "Hackney"],
  },
  {
    label: "Central & City",
    areas: ["City of London", "Barbican", "Clerkenwell", "Aldgate", "Holborn", "Bloomsbury", "Covent Garden", "Fitzrovia", "Soho", "Mayfair", "Marylebone", "Westminster", "Pimlico", "Victoria", "Belgravia"],
  },
  {
    label: "North",
    areas: ["Islington", "Canonbury", "King's Cross", "Highbury", "Stoke Newington", "Camden", "Primrose Hill", "St John's Wood", "Swiss Cottage", "Hampstead"],
  },
  {
    label: "West",
    areas: ["Paddington", "Bayswater", "Hyde Park", "Queensway", "Maida Vale", "Little Venice", "Notting Hill", "Kensington", "South Kensington", "Knightsbridge", "Chelsea", "Fulham"],
  },
  {
    label: "South & South East",
    areas: ["Tower Bridge", "London Bridge", "Borough", "Bankside", "Bermondsey", "Canada Water", "Rotherhithe", "Southwark", "Waterloo", "Elephant & Castle", "Kennington", "Vauxhall", "Camberwell", "Peckham", "Deptford", "New Cross", "Lewisham", "Greenwich", "Blackheath", "Clapham", "Brixton", "Balham", "Battersea"],
  },
];

const areaMap = Object.fromEntries(AREAS.map(a => [a.name, a.postcode]));

export default function AreasPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
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

  const query = search.trim().toLowerCase();

  const filteredRegions = REGIONS.map(r => ({
    ...r,
    areas: r.areas.filter(name =>
      name.toLowerCase().includes(query) ||
      (areaMap[name] || "").toLowerCase().includes(query)
    ),
  })).filter(r => r.areas.length > 0);

  return (
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
            <Sparkle size={7} color="#c8b89a" /> Where We Work <Sparkle size={7} color="#c8b89a" />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 38 : isTablet ? 48 : 56, fontWeight: 300, lineHeight: 1.05, color: "#f5f0e8", marginBottom: 24, letterSpacing: "-0.01em" }}>
            Areas We <em>Cover</em>
          </h1>
          <div style={{ width: 36, height: 1, background: "rgba(200,184,154,0.4)", margin: "0 auto 24px" }} />
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 13 : 15, lineHeight: 1.9, color: "rgba(245,240,232,0.55)", fontWeight: 300, maxWidth: 460, margin: "0 auto" }}>
            We serve across central and east London. If your area isn't listed, give us a call and we'll do our best to help.
          </p>
        </div>
      </div>

      {/* Regions */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "48px 24px" : isTablet ? "64px 40px" : "80px 48px" }}>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 420, margin: "0 auto", marginBottom: isMobile ? 40 : 56 }}>
          <input
            type="text"
            placeholder="Search area or postcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 44px 14px 18px",
              fontFamily: "'Jost', sans-serif",
              fontSize: 13,
              letterSpacing: "0.06em",
              background: "#fff",
              border: "1px solid #e8e0d5",
              color: "#2c2420",
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#c8b89a", fontSize: 14, pointerEvents: "none" }}>
            ✦
          </span>
        </div>
        {filteredRegions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 15, color: "#8b7355", fontWeight: 300 }}>
              No areas found. <span style={{ color: "#2c2420", textDecoration: "underline", cursor: "pointer" }} onClick={() => setSearch("")}>Clear search</span> or <a href="tel:02081370026" style={{ color: "#2c2420", textDecoration: "underline" }}>call us</a> to check availability.
            </p>
          </div>
        ) : (
          filteredRegions.map((region, ri) => (
            <div key={region.label} style={{ marginBottom: ri < filteredRegions.length - 1 ? (isMobile ? 48 : 64) : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c8b89a", whiteSpace: "nowrap" }}>
                  {region.label}
                </div>
                <div style={{ flex: 1, height: 1, background: "#e8e0d5" }} />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
                gap: isMobile ? 10 : 12,
              }}>
                {region.areas.map(name => (
                  <div key={name} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: isMobile ? "12px 14px" : "14px 18px",
                    background: "#fff",
                    borderBottom: "1px solid #e8e0d5",
                  }}>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 12 : 13, color: "#2c2420", fontWeight: 400 }}>
                      {name}
                    </span>
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.1em", color: "#c8b89a", flexShrink: 0, marginLeft: 8 }}>
                      {areaMap[name]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CTA */}
      <div style={{ background: "#2c2420", padding: isMobile ? "48px 24px" : "64px 48px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#c8b89a", marginBottom: 16 }}>
          Not sure?
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 24 : 32, fontWeight: 300, color: "#f5f0e8", marginBottom: 28, lineHeight: 1.4 }}>
          Don't see your area? Get in touch.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="tel:02081370026" style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "14px 32px", background: "#f5f0e8", color: "#1a1410", textDecoration: "none" }}>
            Call Us
          </a>
          <button onClick={() => navigate("/book")} style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, padding: "14px 32px", background: "transparent", color: "#f5f0e8", border: "1px solid rgba(245,240,232,0.3)", cursor: "pointer" }}>
            Book a Clean
          </button>
        </div>
      </div>

    </div>
  );
}
