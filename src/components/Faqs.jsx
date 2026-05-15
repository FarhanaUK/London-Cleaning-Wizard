import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Sparkle } from "./Icons";

const FAQS = [
  {
    question: "What areas do you cover?",
    answer: "We cover a wide area across central and east London. Our coverage spans East & Riverside (Canary Wharf, Shoreditch, Hackney, Stratford, Bethnal Green, Dalston and more), Central & City (Mayfair, Soho, Westminster, Covent Garden, Bloomsbury and more), North (Islington, Camden, Hampstead, King's Cross and more), West (Kensington, Chelsea, Notting Hill, Paddington, Maida Vale and more), and South & South East (Greenwich, Brixton, Clapham, Bermondsey, Peckham, Battersea and more). Visit our Areas page to see the full list, or give us a call on 020 8137 0026 if you're not sure we cover your location.",
  },
  {
    question: "Are your cleaners vetted?",
    answer: "Yes. Every cleaner we work with is carefully vetted before joining us. We take the safety and security of your home very seriously and only work with people we trust.",
  },
  {
    question: "Are you insured?",
    answer: "Yes. London Cleaning Wizard maintains full public liability insurance, so you can book with complete peace of mind.",
  },
  {
    question: "Do you bring your own equipment and products?",
    answer: "We bring our own cleaning products and supplies to every clean — you do not need to provide anything.\n\nPlease note that we do not bring mops or vacuums, so a working mop and vacuum must be available at the property. You will also need to provide access to electricity and water.",
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
    answer: "Our pricing is transparent and displayed in full on our booking page. Home cleaning packages start from £115 for a studio Essential Reset and from £145 for the Signature Hotel Reset. Deep cleans (including end of tenancy) start from £225. Airbnb turnaround cleans start from £95. Hourly cleaning starts from £90 for 3 hours (£30/hr). Airbnb & Serviced Apartment hourly cleans and office cleaning are priced at £35/hr, from £70 and £105 respectively. All prices include VAT and there are no hidden fees.",
  },
  {
    question: "Do you offer hourly cleaning?",
    answer: "Yes. Our hourly cleaning option is ideal if you need specific areas tackled rather than a full package clean. It starts from 3 hours at £30/hour (minimum £90). You decide the priorities: whether that's the kitchen, bathrooms, or a general tidy. Book directly through our website or call us on 020 8137 0026.",
  },
  {
    question: "Do you offer discounts for regular cleans?",
    answer: "Yes. We offer loyalty discounts for recurring bookings. Weekly cleans save you £30 per clean, fortnightly saves £15, and monthly saves £7. The discount applies from your second clean onwards and is applied automatically. Please note that missing two consecutive cleans will end your recurring arrangement.",
  },
  {
    question: "Do you require a deposit?",
    answer: "Yes, a 30% deposit is required to secure your booking and goes toward the total cost of your clean. The deposit is fully refundable if you cancel more than 48 hours before your scheduled clean by phone call only.\n\nFor recurring bookings, no deposit is taken from the second clean onwards. The full amount is charged automatically on completion. If you cancel a recurring clean with less than 48 hours notice, a 30% charge will be applied to your saved payment method.",
  },
  {
    question: "What is your cancellation policy?",
    answer: "All cancellations must be made by phone call only on 020 8137 0026. Email, text or WhatsApp will not be accepted as valid notice.\n\nOne-off bookings / First Booking: Full refund if cancelled more than 48 hours before your clean. No refund if cancelled with less than 48 hours notice.\n\nRecurring services: Cancel any time with 48 hours notice at no charge. Cancellations with less than 48 hours notice will incur a 30% charge applied to your saved payment method. Missing two consecutive cleans ends your recurring arrangement and discount.",
  },
  {
    question: "Do you offer a satisfaction guarantee?",
    answer: "Yes. If you're not happy with your clean, please let us know within 24 hours and we'll arrange a free re-clean where appropriate. We're committed to making sure every home is perfected.",
  },
  {
    question: "Do you offer Airbnb and short-let cleaning?",
    answer: "Yes. We offer two Airbnb cleaning options: a fixed-price Airbnb Turnaround package (from £95 for a studio) with a completion photo sent to you, and an hourly Airbnb & Serviced Apartments option at £35/hr (minimum 2 hours) for more flexible turnarounds. Both are designed to get your property guest-ready quickly and to a hotel standard.",
  },
  {
    question: "Do you offer end of tenancy cleaning?",
    answer: "Yes. Our Deep Clean is a full end of tenancy and move-in clean, covering everything from inside the oven and fridge to behind appliances. It starts from £225 for a studio and comes with a photo report. It is designed to maximise your chances of a full deposit return and meets landlord and agent standards.",
  },
  {
    question: "Do you clean offices or commercial properties?",
    answer: "Yes. We offer office and commercial cleaning at £35/hour with a minimum of 3 hours. We work around your schedule, including after hours and early mornings, so your team walks into a fresh environment. Call us on 020 8137 0026 or email bookings@londoncleaningwizard.com to discuss your requirements and get a quote.",
  },
  {
    question: "Can I set up a regular cleaning arrangement for my Airbnb or business?",
    answer: "Yes. If you need recurring cleans (weekly, fortnightly, or monthly) without having to rebook each time, fill in our quote form at londoncleaningwizard.com/quote. Tell us about your property, preferred frequency, and access arrangements and we will be in touch within a few hours to set everything up. For one-off Airbnb turnarounds or office cleans, you can book directly through our website.",
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
    <>
      <Helmet>
        <title>FAQs | London Cleaning Wizard</title>
        <meta name="description" content="Common questions about our cleaning packages, pricing, booking process and what's included. Get answers before you book." />
        <link rel="canonical" href="https://londoncleaningwizard.com/faqs" />
      </Helmet>
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
    </>
  );
}