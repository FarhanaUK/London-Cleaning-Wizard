import { Suspense, lazy } from "react"
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

const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

function MainPage() {
  return (
    <>
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
        </Routes>
      </Suspense>

      {!hideChrome && <Footer />}
      {!hideChrome && <CookieBanner />}
    </div>
  )
}