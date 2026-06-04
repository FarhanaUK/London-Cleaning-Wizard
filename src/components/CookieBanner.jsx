import { useState, useEffect } from "react";
import { Sparkle } from "./Icons";

export default function CookieBanner({ onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setVisible(false);
    onDismiss?.();
  };

  const decline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .cookie-banner {
            bottom: 12px !important;
            left: 12px !important;
            right: 12px !important;
            border-radius: 8px !important;
            border-top: none !important;
            border: 1px solid rgba(26,20,16,0.15) !important;
            padding: 12px 14px !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.2) !important;
          }
          .cookie-banner-text {
            font-size: 11px !important;
            line-height: 1.6 !important;
          }
          .cookie-banner-btn-decline { padding: 8px 14px !important; font-size: 10px !important; }
          .cookie-banner-btn-accept  { padding: 8px 16px !important; font-size: 10px !important; }
        }
      `}</style>
      <div className="cookie-banner" style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        background: "#c8b89a",
        borderTop: "1px solid rgba(26,20,16,0.12)",
        padding: "20px clamp(20px, 6vw, 100px)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>

        {/* Text */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
          <Sparkle size={10} color="#1a1410" style={{ marginTop: 3, flexShrink: 0 }} />
          <p className="cookie-banner-text" style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 13,
            lineHeight: 1.8,
            color: "rgba(26,20,16,0.75)",
            fontWeight: 300,
            margin: 0,
          }}>
            We use cookies to improve your experience. See our{" "}
            <a href="/privacy-policy" style={{ color: "#1a1410", textDecoration: "underline" }}>
              Privacy Policy
            </a>.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={decline}
            className="cookie-banner-btn-decline"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid rgba(26,20,16,0.3)",
              color: "rgba(26,20,16,0.6)",
              cursor: "pointer",
            }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="cookie-banner-btn-accept"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              padding: "10px 24px",
              background: "#1a1410",
              border: "none",
              color: "#c8b89a",
              cursor: "pointer",
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </>
  );
}