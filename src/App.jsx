import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import StatsStrip from "./components/StatsStrip";
import Services from "./components/Services";
import Gallery from "./components/Gallery";
import About from "./components/About";
import Testimonials from "./components/Testimonials";
import Areas from "./components/Areas";
import BookingPage from "./components/BookingPage";
import Footer from "./components/Footer";
import TermsAndCondition from "./components/TermsAndCondition";
import PrivacyPolicy from "./components/PrivacyPolicy"
import Faqs from "./components/Faqs";
import CookieBanner from "./components/CookieBanner";
import AdminPage from "./components/AdminPage"
import { Routes, Route, useLocation } from "react-router-dom";

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

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
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin';

  return (
    <div style={{ overflowX: "hidden" }}>
      {!isAdmin && <Navbar />}
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndCondition />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/faqs" element={<Faqs />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      {!isAdmin && <Footer />}
      {!isAdmin && <CookieBanner />}
    </div>
  );
}