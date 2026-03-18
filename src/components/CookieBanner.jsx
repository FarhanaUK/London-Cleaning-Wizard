import { useState, useEffect } from "react";
import { Sparkle } from "./Icons";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      background: "#1a1410",
      borderTop: "1px solid rgba(200,184,154,0.15)",
      padding: "20px clamp(20px, 6vw, 100px)",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    }}>

      {/* Text */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 260 }}>
        <Sparkle size={10} color="#c8b89a" style={{ marginTop: 3, flexShrink: 0 }} />
        <p style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 13,
          lineHeight: 1.8,
          color: "rgba(245,240,232,0.65)",
          fontWeight: 300,
          margin: 0,
        }}>
          We use cookies to improve your experience on our website. By continuing to browse, you agree to our{" "}
          <a
            href="/privacy-policy"
            style={{ color: "#c8b89a", textDecoration: "underline" }}
          >
            Privacy Policy
          </a>.
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "10px 20px",
            background: "transparent",
            border: "1px solid rgba(245,240,232,0.2)",
            color: "rgba(245,240,232,0.5)",
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 500,
            padding: "10px 24px",
            background: "#c8b89a",
            border: "none",
            color: "#1a1410",
            cursor: "pointer",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}