import { Suspense, lazy, useEffect, useState } from "react"
import { Helmet } from "react-helmet-async"
import { Routes, Route, useLocation } from "react-router-dom"
import { trackPageView } from "./utils/siteTrack"
import { captureUTM } from "./utils/utmTrack"

// ✅ Always-loaded core UI (small + needed everywhere)
import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import StatsStrip from "./components/StatsStrip"
import Footer from "./components/Footer"
import CookieBanner from "./components/CookieBanner"

import Services from "./components/Services"
import Gallery from "./components/Gallery"
import About from "./components/About"
import Testimonials from "./components/Testimonials"
import Areas from "./components/Areas"

// ✅ Lazy-loaded pages (VERY IMPORTANT for performance)
const BookingPage = lazy(() => import("./components/BookingPage"))
const AdminPage = lazy(() => import("./components/AdminPage"))
const DepositPaymentPage = lazy(() => import("./components/DepositPaymentPage"))
const BookingSuccess = lazy(() => import("./components/BookingSuccess"))
const UnsubscribePage = lazy(() => import("./components/UnsubscribePage"))
const TermsAndCondition = lazy(() => import("./components/TermsAndCondition"))
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy"))
const Faqs = lazy(() => import("./components/Faqs"))
const ContactPage = lazy(() => import("./components/Contact"))
const ServicesPage = lazy(() => import("./components/ServicesPage"))
const SignatureTouchPage = lazy(() => import("./components/SignatureTouchPage"))
const AboutPage = lazy(() => import("./components/AboutPage"))
const AreasPage = lazy(() => import("./components/AreasPage"))
const CommercialPage = lazy(() => import("./components/CommercialPage"))
const RegularCleanPage = lazy(() => import("./components/RegularCleanPage"))
const DeepCleanPage = lazy(() => import("./components/DeepCleanPage"))

const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

function MainPage() {
  return (
    <>
      <Helmet>
        <title>London Cleaning Wizard | Premium Home Cleaning London</title>
        <meta name="description" content="Hotel-standard home cleaning across London. Vetted insured cleaners. Same cleaner every visit. Reset packages from £115. 50% off your first Signature Hotel Reset." />
        <link rel="canonical" href="https://londoncleaningwizard.com/" />
      </Helmet>
      <Hero onScrollTo={scrollTo} />
      <StatsStrip />

      <Services />
      <Gallery />
      <About />
      <Testimonials />
      <Areas />
    </>
  )
}

export default function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    captureUTM();
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname])

  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', 'AW-18070855826', { page_path: pathname });
    }
    trackPageView(pathname);
  }, [pathname])

  const [cookieDismissed, setCookieDismissed] = useState(() => !!localStorage.getItem("cookieConsent"))

  const hideChrome =
    pathname === "/admin" ||
    pathname === "/pay-deposit" ||
    pathname === "/booking-success" ||
    pathname === "/unsubscribe"

  return (
    <div style={{ overflowX: "hidden" }}>
      {!hideChrome && <Navbar />}

      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#faf9f7' }} />}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndCondition />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/faqs" element={<Faqs />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/pay-deposit" element={<DepositPaymentPage />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/quote" element={<ContactPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/signature-touch" element={<SignatureTouchPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/areas" element={<AreasPage />} />
          <Route path="/commercial-clean" element={<CommercialPage />} />
          <Route path="/regular-clean" element={<RegularCleanPage />} />
          <Route path="/deep-clean" element={<DeepCleanPage />} />
        </Routes>
      </Suspense>

      {!hideChrome && <Footer />}
      {!hideChrome && <CookieBanner onDismiss={() => setCookieDismissed(true)} />}
      {!hideChrome && (
        <a
          href="https://wa.me/447459576639?text=Hi%2C%20I%27d%20like%20to%20enquire%20about%20a%20cleaning%20service."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          style={{
            position: 'fixed', bottom: cookieDismissed ? 24 : 90, right: 20, zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#25D366', borderRadius: 50, padding: '10px 18px 10px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}
        >
          <svg viewBox="0 0 32 32" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M16 2C8.268 2 2 8.268 2 16c0 2.47.676 4.784 1.852 6.766L2 30l7.43-1.82A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.6a11.54 11.54 0 0 1-5.89-1.614l-.422-.25-4.41 1.08 1.117-4.3-.275-.44A11.56 11.56 0 0 1 4.4 16C4.4 9.59 9.59 4.4 16 4.4S27.6 9.59 27.6 16 22.41 27.6 16 27.6zm6.344-8.67c-.347-.174-2.055-1.013-2.374-1.13-.32-.116-.552-.173-.784.174-.232.347-.9 1.13-1.102 1.362-.203.232-.405.26-.752.087-.347-.174-1.466-.54-2.793-1.723-1.032-.921-1.729-2.058-1.932-2.405-.203-.347-.022-.534.152-.707.157-.155.347-.405.52-.607.174-.203.232-.347.347-.579.116-.232.058-.434-.029-.607-.087-.174-.784-1.89-1.074-2.588-.283-.68-.57-.587-.784-.598l-.667-.012c-.232 0-.607.087-.925.434-.318.347-1.218 1.19-1.218 2.9s1.247 3.364 1.42 3.596c.174.232 2.454 3.748 5.946 5.254.83.358 1.479.572 1.984.732.833.265 1.591.228 2.19.138.668-.1 2.055-.84 2.346-1.652.29-.812.29-1.508.203-1.652-.087-.145-.32-.232-.667-.405z"/>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>Chat with us on WhatsApp</span>
            <span style={{ fontSize: 11, color: '#064e3b', fontWeight: 600, whiteSpace: 'nowrap' }}>⚡ Fast response</span>
          </div>
        </a>
      )}
    </div>
  )
}