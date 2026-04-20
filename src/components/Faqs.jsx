import { useState, useEffect } from "react";
import { Sparkle } from "./Icons";

const FAQS = [
  {
    question: "What areas do you cover?",
    answer: "We cover all major East London postcodes including Hackney, Tower Hamlets, Newham, Waltham Forest, Bethnal Green, Bow, Stratford, Canary Wharf, Poplar, Leyton, Ilford, Wanstead, Forest Gate, Dalston, Shoreditch, and Mile End. If you don't see your area listed, get in touch and we may still be able to help.",
  },
  {
    question: "Are your cleaners DBS checked?",
    answer: "Yes. All of our cleaners are fully DBS checked. We take the safety and security of your home very seriously.",
  },
  {
    question: "Are you insured?",
    answer: "Yes. London Cleaning Wizard maintains full public liability insurance, so you can book with complete peace of mind.",
  },
  {
    question: "Do you bring your own equipment and products?",
    answer: "By default, we ask that you provide your own cleaning products and supplies. During the booking process you can add our cleaning supplies for a small fee, and we'll bring everything needed including our eco-friendly products that are safe for children, pets, and your home.\n\nPlease note that we do not bring mops or vacuums regardless of the supplies option, so a working mop and vacuum must be available at the property. You will also need to provide access to electricity and water.",
  },
  {
    question: "Do I need to be home during the clean?",
    answer: "Not at all. Many of our clients provide access instructions and go about their day. We just ask that you ensure safe access to the property and let us know of any specific requirements in advance.",
  },
  {
    question: "How do I book?",
    answer: "You can book directly through our website using the online booking form, or call us on 020 8137 0026 and we'll take care of everything over the phone. Alternatively, you can email us at bookings@londoncleaningwizard.com with your contact number and we'll call you back to arrange your booking.",
  },
  {
    question: "How much does a clean cost?",
    answer: "Our pricing is tailored to your home and the service you need. Factors include the size of your property, the type of clean, and your location. Request a free quote and we'll provide a transparent, no-obligation price.",
  },
  {
    question: "Do you require a deposit?",
    answer: "Yes, a 30% deposit is required to secure your booking and goes toward the total cost of your clean. The deposit is fully refundable if you cancel more than 48 hours before your scheduled clean by phone call only.\n\nFor recurring bookings, no deposit is taken from the second clean onwards — the full amount is charged automatically on completion. If you cancel a recurring clean with less than 48 hours notice, a 30% charge will be applied to your saved payment method.",
  },
  {
    question: "What is your cancellation policy?",
    answer: "All cancellations must be made by phone call only on 020 8137 0026 — email, text or WhatsApp will not be accepted as valid notice.\n\nOne-off bookings / First Booking: Full refund if cancelled more than 48 hours before your clean. No refund if cancelled with less than 48 hours notice.\n\nRecurring services: Cancel any time with 48 hours notice at no charge. Cancellations with less than 48 hours notice will incur a 30% charge applied to your saved payment method. Missing two consecutive cleans ends your recurring arrangement and discount.",
  },
  {
    question: "Do you offer a satisfaction guarantee?",
    answer: "Yes. If you're not happy with your clean, please let us know within 24 hours and we'll arrange a free re-clean where appropriate. We're committed to making sure every home is perfected.",
  },
  {
    question: "Do you offer Airbnb and end of tenancy cleans?",
    answer: "Yes. We offer both Airbnb turnaround cleans and full end of tenancy cleans. Our end of tenancy service is landlord-approved and designed to maximise your chances of a full deposit return. We'll make sure every inch of your property is spotless.",
  },
  {
    question: "What are your working hours?",
    answer: "We are available Monday to Sunday, 7am to 9pm. We offer flexible scheduling to work around you.",
  },
  {
    question: "Do you have a re-clean guarantee?",
    answer: "Yes. If any issues are reported within 24 hours of your clean, we will return to re-clean the affected areas free of charge. Please note that refunds are not provided if a re-clean is offered and declined.",
  },
];

export default function Faqs() {
  const [openIndex, setOpenIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (window.location.hash === '#faq-contact') {
      setTimeout(() => {
        document.getElementById('faq-contact')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": FAQS.map(({ question, answer }) => ({
        "@type": "Question",
        "name": question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": answer,
        },
      })),
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => document.head.removeChild(script);
  }, []);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

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
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <Sparkle size={8} color="#c8b89a" /> Support
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: isMobile ? "clamp(28px, 8vw, 38px)" : "clamp(32px, 5vw, 52px)",
            fontWeight: 300,
            color: "#1a1410",
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Frequently Asked <em>Questions</em>
          </h1>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isMobile ? 14 : 16,
            lineHeight: 1.9,
            color: "#5a4e44",
            fontWeight: 300,
          }}>
            Everything you need to know about London Cleaning Wizard. Can't find your answer? Get in touch at bookings@londoncleaningwizard.com
          </p>
        </div>

        {/* FAQ Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                background: openIndex === i ? "#f2ede6" : "#fff",
                borderBottom: "1px solid #ece6dc",
                transition: "background 0.3s",
              }}
            >
              <button
                onClick={() => toggle(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: isMobile ? "16px 16px" : "20px 24px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: 16,
                }}
              >
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isMobile ? "clamp(15px, 4vw, 18px)" : "clamp(16px, 2.5vw, 20px)",
                  fontWeight: 400,
                  color: "#1a1410",
                  lineHeight: 1.3,
                }}>
                  {faq.question}
                </span>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isMobile ? 20 : 24,
                  color: "#c8b89a",
                  flexShrink: 0,
                  transition: "transform 0.3s",
                  transform: openIndex === i ? "rotate(45deg)" : "rotate(0deg)",
                }}>
                  +
                </span>
              </button>

              {openIndex === i && (
                <div style={{
                  padding: isMobile ? "0 16px 20px" : "0 24px 24px",
                  fontFamily: "'Jost', sans-serif",
                  fontSize: isMobile ? 13 : 15,
                  lineHeight: 1.9,
                  color: "#5a4e44",
                  fontWeight: 300,
                }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
{/* Contact Info */}



        {/* CTA */}
       <div
  id="faq-contact"
  style={{
    marginTop: isMobile ? 40 : 60,
    padding: isMobile ? "28px 20px" : "40px",
    background: "#2c2420",
    textAlign: "center",
  }}
>
  {/* Sparkle icons */}
  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
    <Sparkle size={10} color="#c8b89a" />
    <Sparkle size={14} color="#c8b89a" />
    <Sparkle size={10} color="#c8b89a" />
  </div>

  {/* Heading */}
  <h2
    style={{
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: isMobile ? "clamp(22px, 6vw, 28px)" : "clamp(24px, 4vw, 36px)",
      fontWeight: 300,
      color: "#f5f0e8",
      marginBottom: 12,
    }}
  >
    Still have questions?
  </h2>

  {/* Subtext */}
  <p
    style={{
      fontFamily: "'Jost', sans-serif",
      fontSize: isMobile ? 13 : 15,
      color: "rgba(245,240,232,0.65)",
      marginBottom: 24,
      fontWeight: 300,
    }}
  >
    We're happy to help. Reach out and we'll get back to you within 24 hours.
  </p>
<p
  style={{
    fontFamily: "'Jost', sans-serif",
    fontSize: isMobile ? 13 : 15,
    color: "rgba(245,240,232,0.65)",
    marginTop: 16,
    fontWeight: 300,
  }}
>
  Customer Service Hours<br />
  Monday – Sunday · 9am to 5pm
</p>
  {/* Buttons / Links */}
  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
    <a
      href="mailto:bookings@londoncleaningwizard.com"
      style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: isMobile ? 11 : 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight: 500,
        padding: isMobile ? "12px 28px" : "14px 36px",
        background: "#c8b89a",
        color: "#1a1410",
        textDecoration: "none",
        display: "inline-block",
      }}
    >
      Get In Touch
    </a>

    <a
      href="tel:02081370026"
      style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: isMobile ? 20 : 26,
        fontWeight: 400,
        color: "#f7f3f1",
        textDecoration: "none",
       marginTop: 20,
      }}
    >
      020 8137 0026
    </a>

    {/* Emails */}
    {["bookings@londoncleaningwizard.com", "careers@londoncleaningwizard.com"].map((email) => (
      <a
        key={email}
        href={`mailto:${email}`}
        style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: isMobile ? 11 : 12,
          letterSpacing: "0.14em",
          textTransform: "none",
          fontWeight: 300,
          padding: isMobile ? "12px 28px" : "14px 36px",
          color: "#ffffff",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {email}
      </a>
    ))}
  </div>
</div>
      </div>
    </div>
  );
}