import { Suspense, lazy, useEffect } from "react"
import { Helmet } from "react-helmet-async"
import { Routes, Route, useLocation } from "react-router-dom"

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
const HourlyPage = lazy(() => import("./components/HourlyPage"))
const CommercialPage = lazy(() => import("./components/CommercialPage"))
const RegularCleanPage = lazy(() => import("./components/RegularCleanPage"))
const DeepCleanPage = lazy(() => import("./components/DeepCleanPage"))

const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

function MainPage() {
  return (
    <>
      <Helmet>
        <title>Premium Home & Commercial Cleaning London | London Cleaning Wizard</title>
        <meta name="description" content="Premium home & commercial cleaning across London. Vetted, trained & fully insured. Regular, deep & end of tenancy cleans. Free quote today." />
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
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname])

  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', 'AW-18070855826', { page_path: pathname });
    }
  }, [pathname])

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
          <Route path="/hourly-clean" element={<HourlyPage />} />
          <Route path="/commercial-clean" element={<CommercialPage />} />
          <Route path="/regular-clean" element={<RegularCleanPage />} />
          <Route path="/deep-clean" element={<DeepCleanPage />} />
        </Routes>
      </Suspense>

      {!hideChrome && <Footer />}
      {!hideChrome && <CookieBanner />}
    </div>
  )
}