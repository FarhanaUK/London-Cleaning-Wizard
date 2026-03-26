import { useState, useEffect } from "react";

export default function PrivacyPolicy() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{
      background: "#faf9f7",
      minHeight: "100vh",
      padding: isMobile ? "100px 20px 60px" : "120px clamp(20px, 6vw, 160px) 80px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: isMobile ? 36 : 52, borderBottom: "1px solid #d4c4ae", paddingBottom: isMobile ? 24 : 32 }}>
          <div style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "#8b7355",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Legal
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: isMobile ? "clamp(28px, 8vw, 38px)" : "clamp(32px, 5vw, 52px)",
            fontWeight: 300,
            color: "#1a1410",
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Privacy Policy
          </h1>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 14,
            color: "#8b7355",
            letterSpacing: "0.06em",
          }}>
            Last Updated: March 2026
          </p>
        </div>

        {/* Intro */}
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 16, lineHeight: 1.9, color: "#5a4e44", marginBottom: isMobile ? 32 : 48 }}>
          London Cleaning Wizard is committed to protecting and respecting your privacy. This policy explains how we collect, use, and store your personal data.
        </p>

        {[
          {
            title: "1. Who We Are",
            content: (
              <>
                <p>London Cleaning Wizard is a sole trader business operating in the United Kingdom.</p>
                <p style={{ marginTop: 16 }}><strong>Contact Details:</strong></p>
                <p>Email: bookings@londoncleaningwizard.com</p>
                <p>Phone:  020 8137 0026</p>
              </>
            ),
          },
          {
            title: "2. What Data We Collect",
            content: (
              <>
                <p>We may collect the following personal data:</p>
                <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Full name",
                    "Email address",
                    "Phone number",
                    "Property address",
                    "Booking and service details",
                    "Photos or videos provided for quoting",
                    "Communication history (emails, messages, social media)",
                    "Phone call recordings (for service verification and compliance)",
                  ].map(item => <li key={item}>{item}</li>)}
                </ul>
              </>
            ),
          },
          {
            title: "3. How We Collect Data",
            content: (
              <>
                <p>We collect data when you:</p>
                <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Request a quote",
                    "Book a service",
                    "Contact us via our website, email, phone, or social media platforms",
                    "Provide photos or videos of your property",
                    "Speak with us via phone (calls may be recorded for verification and compliance purposes)",
                  ].map(item => <li key={item}>{item}</li>)}
                </ul>
              </>
            ),
          },
          {
            title: "4. How We Use Your Data",
            content: (
              <>
                <p>We use your data to:</p>
                <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Provide and manage our cleaning services",
                    "Communicate with you regarding bookings and updates",
                    "Send invoices and process payments",
                    "Improve our services",
                    "Send marketing messages and offers",
                  ].map(item => <li key={item}>{item}</li>)}
                </ul>
              </>
            ),
          },
          {
            title: "5. Marketing Communications",
            content: (
              <p>We may send you marketing emails, messages, or offers. You can opt out at any time by clicking unsubscribe where applicable, or by contacting us directly at bookings@londoncleaningwizard.com.</p>
            ),
          },
          {
            title: "6. Sharing Your Data",
            content: (
              <>
                <p>We do not sell your data. We may share your data with:</p>
                <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li>Payment providers (e.g. Stripe)</li>
                  <li>Service providers necessary to complete your booking</li>
                </ul>
                <p style={{ marginTop: 16 }}>Your cleaners will have access to addresses and phone numbers to perform the service — this is standard and necessary.</p>
              </>
            ),
          },
          {
            title: "7. Data Storage & Security",
            content: (
              <p>Your data is stored securely. We take reasonable steps to protect your information from loss, misuse, or unauthorised access.</p>
            ),
          },
          {
            title: "8. How Long We Keep Your Data",
            content: (
              <>
                <p>We only keep your data for as long as necessary to:</p>
                <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li>Provide our services</li>
                  <li>Meet legal, tax, or business obligations</li>
                </ul>
              </>
            ),
          },
          {
            title: "9. Your Rights (UK GDPR)",
            content: (
              <>
                <p>You have the right to:</p>
                <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Access your personal data",
                    "Request correction of incorrect data",
                    "Request deletion of your data",
                    "Object to or restrict processing",
                    "Withdraw consent (for marketing)",
                  ].map(item => <li key={item}>{item}</li>)}
                </ul>
                <p style={{ marginTop: 16 }}>To exercise these rights, contact: bookings@londoncleaningwizard.com</p>
              </>
            ),
          },
          {
            title: "10. Photos & Media",
            content: (
              <p>Our cleaners will take before and after photos for quality control, staff training, and dispute resolution. Customers may be asked to send photos before booking. Photos will not be shared publicly without consent. If the property differs from what was shown, the price may increase or the service may be refused.</p>
            ),
          },
          {
            title: "11. Phone Calls",
            content: (
              <p>Calls may be recorded for verification, dispute resolution, and compliance purposes. Recordings are stored securely and used only internally.</p>
            ),
          },
          {
            title: "12. Cookies",
            content: (
              <p>Our website may use basic cookies to improve user experience and analyse website usage. You can control cookies through your browser settings.</p>
            ),
          },
          {
            title: "13. Third-Party Links",
            content: (
              <p>Our website or communications may contain links to third-party websites. We are not responsible for their privacy practices.</p>
            ),
          },
          {
            title: "14. Changes to This Policy",
            content: (
              <p>We may update this Privacy Policy at any time. The latest version will always be available on our website.</p>
            ),
          },
          {
            title: "15. Contact",
            content: (
              <>
                <p>If you have any questions about this policy or your data:</p>
                <p style={{ marginTop: 8 }}>Email: bookings@londoncleaningwizard.com</p>
                <p style={{ marginTop: 8 }}>Phone: 020 8137 0026</p>
              </>
            ),
          },
        ].map(({ title, content }) => (
          <div key={title} style={{ marginBottom: isMobile ? 28 : 40, paddingBottom: isMobile ? 28 : 40, borderBottom: "1px solid #ece6dc" }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: isMobile ? "clamp(18px, 5vw, 22px)" : "clamp(20px, 3vw, 26px)",
              fontWeight: 400,
              color: "#1a1410",
              marginBottom: 12,
            }}>
              {title}
            </h2>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 13 : 15,
              lineHeight: 1.9,
              color: "#5a4e44",
            }}>
              {content}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}