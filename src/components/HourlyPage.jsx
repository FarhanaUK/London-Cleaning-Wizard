import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Sparkle, WandIcon } from './Icons';

const SIZES = [
  { label: '3 hrs',   price: 90  },
  { label: '3.5 hrs', price: 105 },
];

export default function HourlyPage() {
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
        <title>Hourly Cleaning London | From £30/hr | London Cleaning Wizard</title>
        <meta name="description" content="Flexible hourly cleaning across London from £30/hr. Min 3 hours. Vetted, fully insured cleaners. You set the priorities and we get to work. Book online." />
        <link rel="canonical" href="https://londoncleaningwizard.com/hourly-clean" />
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
            <Sparkle size={7} color="#c8b89a" /> Hourly Clean <Sparkle size={7} color="#c8b89a" />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 38 : isTablet ? 48 : 56, fontWeight: 300, lineHeight: 1.05, color: '#f5f0e8', marginBottom: 10, letterSpacing: '-0.01em' }}>
            Flexible Hourly Cleaning
          </h1>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 10 : 11, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(200,184,154,0.4)', textTransform: 'uppercase', marginBottom: 22 }}>
            Across London
          </p>
          <div style={{ width: 36, height: 1, background: 'rgba(200,184,154,0.4)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 15, lineHeight: 1.9, color: 'rgba(245,240,232,0.55)', fontWeight: 300, maxWidth: 460, margin: '0 auto 28px' }}>
            You set the priorities. We work through them for the full duration.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 20px', maxWidth: 460, margin: '0 auto' }}>
            {['Vetted Cleaners', 'Fully Insured', 'Same Cleaner', 'From £30/hr'].map(b => (
              <div key={b} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.6)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#c8b89a' }}>✓</span> {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: '#faf9f7', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 32 }}>
            Simple, transparent pricing
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, maxWidth: 320, marginBottom: 16 }}>
            {SIZES.map(s => (
              <div key={s.label} style={{ border: '1px solid rgba(200,184,154,0.3)', padding: '20px 12px', textAlign: 'center', background: '#fff' }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' }}>£{s.price}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300 }}>All prices include VAT. No hidden fees. 30% deposit to secure your slot.</p>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#f2ede6', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 32 }}>
            You direct. We deliver.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              { n: '01', t: 'Choose your hours', b: 'Select 3 or 3.5 hours. The extra half hour makes a difference when there is more to cover.' },
              { n: '02', t: 'Tell us your priorities', b: 'Let us know which areas matter most. Kitchen, bathroom, living room, or all of the above.' },
              { n: '03', t: 'We arrive and get to work', b: 'Your vetted cleaner arrives on time and works through your list for the full duration.' },
            ].map(({ n, t, b }) => (
              <div key={n} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, color: 'rgba(200,184,154,0.4)', flexShrink: 0, lineHeight: 1, minWidth: 36 }}>{n}</div>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, color: '#1a1410', marginBottom: 6 }}>{t}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>{b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ideal for + honest note */}
      <div style={{ background: '#faf9f7', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 24 }}>
            Ideal for
          </h2>
          {[
            'Maintaining a clean home between full resets',
            'A quick refresh before guests or family arrive',
            'Homes that only need specific areas tackled',
            'Students and renters needing a focused clean',
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{ color: '#c8b89a', fontSize: 14, flexShrink: 0 }}>✓</span>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 15, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
          <div style={{ marginTop: 32, padding: '18px 20px', background: '#f2ede6', borderLeft: '3px solid #c8b89a' }}>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 600, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Please note</div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>
              This is a timed service. Your cleaner works for the booked duration only, with no checklist, no completion guarantee, and no reclean promise. For a full guaranteed home clean, consider one of our signature packages.
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade nudge */}
      <div style={{ background: '#2c2420', padding: `${isMobile ? '40px' : '60px'} ${px}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 24 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 22 : 28, fontWeight: 300, color: '#f5f0e8', marginBottom: 8 }}>Booking regularly?</div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: 'rgba(245,240,232,0.6)', fontWeight: 300, lineHeight: 1.6 }}>
              Our Regular Clean starts from £85/clean with weekly bookings — a full guaranteed home clean every visit.
            </div>
          </div>
          <Link
            to="/book"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '13px 28px', border: '1px solid rgba(200,184,154,0.4)', color: '#c8b89a', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            View Packages
          </Link>
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
            Ready to book?
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 15, color: '#8b7355', fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            Book your hourly clean online in minutes. 30% deposit to secure your slot.
          </p>
          <Link
            to="/book"
            state={{ pkgTab: 'hourly' }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '15px 36px', background: '#2c2420', color: '#f5f0e8', textDecoration: 'none' }}
          >
            <WandIcon size={14} color="#c8b89a" /> Book Hourly Clean
          </Link>
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
