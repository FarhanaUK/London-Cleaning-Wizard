import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import StatsStrip from "./components/StatsStrip";
import Services from "./components/Services";
import Gallery from "./components/Gallery";
import About from "./components/About";
import Testimonials from "./components/Testimonials";
import Areas from "./components/Areas";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

export default function App() {
  return (
    <div style={{ overflowX: "hidden" }}>
      <Navbar />
      <Hero onScrollTo={scrollTo} />
      <StatsStrip />
      <Services />
      <Gallery />
      <About />
      <Testimonials />
      <Areas />
      <Contact />
      <Footer />
    </div>
  );
}