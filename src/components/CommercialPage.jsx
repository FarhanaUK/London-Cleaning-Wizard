import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Sparkle, WandIcon } from './Icons';

const SERVICES = [
  {
    id: 'airbnb',
    label: 'Airbnb & Serviced Apartments',
    rate: '£35/hr',
    min: 'Min 2 hours',
    from: '£70',
    desc: 'Your guests expect a hotel experience. We make sure they get one. Fresh linens, spotless surfaces, completion photo sent directly to you. We turn your property around quickly and to the highest standard so you never miss a 5-star review.',
    items: [
      'Guest-ready turnaround between every booking',
      'Beds made with fresh linen',
      'Bathrooms and kitchen fully cleaned',
      'Restock of toiletries if supplied',
      'Completion photo sent directly to you',
    ],
    cta: 'Book Airbnb Clean',
  },
  {
    id: 'office',
    label: 'Office & Commercial Cleaning',
    rate: '£35/hr',
    min: 'Min 3 hours',
    from: '£105',
    desc: "A clean office affects focus, morale and the impression you make on clients. We work around your schedule, arriving after hours so your team walks in to a fresh, professional environment every morning.",
    items: [
      'Small to medium office spaces',
      'After-hours evening cleans',
      'Weekly and fortnightly contracts',
      'Fully vetted, insured professionals',
      'Dedicated team for regular clients',
      'First clean includes a walkthrough assessment',
    ],
    cta: 'Book Office Clean',
  },
];

export default function CommercialPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  useEffect(() => {
    const h = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const px = isMobile ? '24px' : isTablet ? '40px' : 'clamp(24px,6vw,100px)';
  const py = isMobile ? '56px' : isTablet ? '64px' : '72px';
  const sec = `${py} ${px}`;

  return (
    <>
      <Helmet>
        <title>Commercial & Airbnb Cleaning London | From £35/hr | London Cleaning Wizard</title>
        <meta name="description" content="Professional commercial and Airbnb cleaning across London from £35/hr. Office cleans, short-let turnarounds. Vetted, insured cleaners. Book online or get a tailored quote." />
        <link rel="canonical" href="https://londoncleaningwizard.com/commercial-clean" />
      </Helmet>

      {/* Hero */}
      <div style={{
        background: '#1a1410',
        paddingTop: isMobile ? 120 : 148,
        paddingBottom: isMobile ? 48 : 64,
        paddingLeft: isMobile ? 24 : 'clamp(24px,6vw,100px)',
        paddingRight: isMobile ? 24 : 'clamp(24px,6vw,100px)',
        textAlign: 'center',
        minHeight: isMobile ? 'auto' : 460,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.32em', color: '#c8b89a', textTransform: 'uppercase', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Sparkle size={7} color="#c8b89a" /> Commercial & Airbnb <Sparkle size={7} color="#c8b89a" />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 38 : isTablet ? 48 : 56, fontWeight: 300, lineHeight: 1.05, color: '#f5f0e8', marginBottom: 10, letterSpacing: '-0.01em' }}>
            Commercial & Airbnb
          </h1>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 10 : 11, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(200,184,154,0.4)', textTransform: 'uppercase', marginBottom: 22 }}>
            Cleaning in London
          </p>
          <div style={{ width: 36, height: 1, background: 'rgba(200,184,154,0.4)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 15, lineHeight: 1.9, color: 'rgba(245,240,232,0.55)', fontWeight: 300, maxWidth: 460, margin: '0 auto 28px' }}>
            Offices, Airbnb and serviced apartments across London.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 20px', maxWidth: 460, margin: '0 auto' }}>
            {['Vetted Cleaners', 'Fully Insured', 'From £35/hr'].map(b => (
              <div key={b} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.6)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#c8b89a' }}>✓</span> {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service sections */}
      {SERVICES.map((svc, idx) => (
        <div key={svc.id} style={{ background: idx % 2 === 0 ? '#faf9f7' : '#f2ede6', padding: sec }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.18em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 10 }}>{svc.min}</div>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(24px,6vw,32px)' : 'clamp(28px,4vw,40px)', fontWeight: 300, color: '#1a1410', margin: 0 }}>
                  {svc.label}
                </h2>
              </div>
              <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 300, color: '#1a1410' }}>{svc.rate}</div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355' }}>from {svc.from}</div>
              </div>
            </div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 15, color: '#5a4e44', fontWeight: 300, lineHeight: 1.8, marginBottom: 28 }}>
              {svc.desc}
            </p>
            {svc.items.map(item => (
              <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ color: '#c8b89a', fontSize: 14, flexShrink: 0 }}>✓</span>
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
            <div style={{ marginTop: 28 }}>
              <Link
                to="/book"
                state={{ pkgTab: 'commercial' }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 26px', background: '#2c2420', color: '#f5f0e8', textDecoration: 'none' }}
              >
                {svc.cta}
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Regular arrangements */}
      <div style={{ background: '#2c2420', padding: `${isMobile ? '52px' : '72px'} ${px}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#c8b89a', textTransform: 'uppercase', marginBottom: 12 }}>Regular Arrangements</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(24px,6vw,32px)' : 'clamp(28px,4vw,38px)', fontWeight: 300, color: '#f5f0e8', marginBottom: 16 }}>
            Need weekly or fortnightly cleans?
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 15, color: 'rgba(245,240,232,0.65)', fontWeight: 300, lineHeight: 1.8, marginBottom: 32, maxWidth: 560 }}>
            For recurring arrangements, fill in our quote form and we will be in touch within a few hours. Regular clients receive a dedicated cleaning team and priority scheduling.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link
              to="/quote"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '13px 28px', background: '#c8b89a', color: '#1a1410', textDecoration: 'none' }}
            >
              Get a Quote
            </Link>
            <a
              href="tel:02081370026"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '13px 28px', border: '1px solid rgba(200,184,154,0.3)', color: '#c8b89a', textDecoration: 'none' }}
            >
              020 8137 0026
            </a>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ background: '#faf9f7', padding: `${isMobile ? '52px' : '80px'} ${px}`, textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <Sparkle size={10} color="#c8b89a" />
            <Sparkle size={14} color="#c8b89a" />
            <Sparkle size={10} color="#c8b89a" />
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,34px)' : 'clamp(28px,4vw,40px)', fontWeight: 300, color: '#1a1410', marginBottom: 16 }}>
            Ready to get started?
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 15, color: '#8b7355', fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            Book a one-off clean online, or get in touch to discuss a regular arrangement.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Link
              to="/book"
              state={{ pkgTab: 'commercial' }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '15px 36px', background: '#2c2420', color: '#f5f0e8', textDecoration: 'none' }}
            >
              <WandIcon size={14} color="#c8b89a" /> Book a Clean
            </Link>
            <Link
              to="/quote"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '15px 36px', border: '1px solid rgba(200,184,154,0.4)', color: '#5a4e44', textDecoration: 'none' }}
            >
              Get a Quote
            </Link>
          </div>
          <div style={{ marginTop: 20 }}>
            <a href="tel:02081370026" style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', textDecoration: 'none', fontWeight: 300 }}>
              Or call us: <span style={{ color: '#2c2420', fontWeight: 500 }}>020 8137 0026</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
