import { Sparkle, WandIcon } from "./Icons";
import Reveal from "./Reveal";
import { PHOTOS } from "../data/siteData";

const FEATURES = [
  "DBS-Checked Team",
  "Eco-Friendly Products",
  "Fully Insured",
  "Flexible Scheduling",
  "Free Re-clean Guarantee",
  "Locally Based in E. London",
];

export default function About() {
  return (
    <section id="about" style={{ padding: "100px clamp(24px, 6vw, 100px)", background: "#faf9f7" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 80,
        alignItems: "center",
        maxWidth: 1200,
        margin: "0 auto",
      }}>

        {/* Photo */}
        <Reveal>
          <div style={{ position: "relative" }}>
            <img
              src={PHOTOS.cleaner1}
              alt="Our cleaning team"
              style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
            />

            {/* Decorative borders */}
            <div style={{ position: "absolute", bottom: -22, right: -22, width: 140, height: 140, border: "1px solid #c8b89a", zIndex: -1 }} />
            <div style={{ position: "absolute", top: -14, left: -14, width: 90, height: 90, background: "#f2ede6", zIndex: -1 }} />

            {/* Sparkles on photo */}
            <div style={{ position: "absolute", top: 20, right: 20 }}>
              <Sparkle size={18} color="#c8b89a" />
            </div>

            {/* Badge */}
            <div style={{
              position: "absolute",
              bottom: -18,
              left: 32,
              background: "#2c2420",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <WandIcon size={20} color="#c8b89a" />
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#f5f0e8", fontStyle: "italic" }}>The Wizard's Promise</div>
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: "0.15em", color: "#c8b89a", textTransform: "uppercase", marginTop: 2 }}>Every home, perfected</div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Text */}
        <Reveal delay={150}>
          <div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", color: "#8b7355", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <Sparkle size={8} color="#c8b89a" /> Our Craft
            </div>

            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 24, color: "#1a1410" }}>
              We believe every home<br /><em>holds its own magic</em>
            </h2>

            <div style={{ width: 44, height: 1, background: "#c8b89a", marginBottom: 28 }} />

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, lineHeight: 1.9, color: "#5a4e44", fontWeight: 300, marginBottom: 18 }}>
              London Cleaning Wizard was born from a simple conviction: your home
              is your sanctuary, and it deserves to be treated with the same care
              and artistry as a treasured space.
            </p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, lineHeight: 1.9, color: "#5a4e44", fontWeight: 300, marginBottom: 36 }}>
              Our team are DBS-checked, trained in premium residential methods,
              and chosen for their meticulous eye. We use only eco-conscious
              products — safe for children, pets, and the home you love.
            </p>

            {/* Features */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 28px" }}>
              {FEATURES.map((f) => (
                <div key={f} style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.06em", color: "#2c2420", display: "flex", alignItems: "center", gap: 9 }}>
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