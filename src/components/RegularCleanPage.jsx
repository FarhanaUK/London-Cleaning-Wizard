import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Sparkle, WandIcon } from './Icons';

const SIZES = [
  { label: 'Studio',     flat: 115, house: null },
  { label: '1 Bedroom',  flat: 125, house: 138 },
  { label: '2 Bedroom',  flat: 145, house: 160 },
  { label: '3 Bedroom',  flat: 170, house: 187 },
  { label: '4 Bedroom',  flat: 200, house: 220 },
];

const INCLUDES = [
  'Full home clean across all rooms',
  'All surfaces wiped and reset',
  'Floors vacuumed and mopped throughout',
  'Kitchen cleaned — worktops, cupboard doors, sink, all appliance exteriors',
  'Bathroom cleaned — toilet, sink, shower, mirrors',
  'Doors and door frames spot-wiped',
  'High-touch areas sanitised (light switches, door handles)',
  'Bins emptied and relined',
];

const FREQS = [
  { label: 'Weekly',      saving: 30, note: 'saves £30 per clean' },
  { label: 'Fortnightly', saving: 15, note: 'saves £15 per clean' },
  { label: 'Monthly',     saving: 7,  note: 'saves £7 per clean' },
];

export default function RegularCleanPage() {
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
        <title>Regular Home Cleaning London | From £115 | London Cleaning Wizard</title>
        <meta name="description" content="Regular home cleaning across London from £115. Weekly, fortnightly or one-off. Vetted, fully insured cleaners. Same cleaner every visit. Book online." />
        <link rel="canonical" href="https://londoncleaningwizard.com/regular-clean" />
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
            <Sparkle size={7} color="#c8b89a" /> Regular Clean <Sparkle size={7} color="#c8b89a" />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 38 : isTablet ? 48 : 56, fontWeight: 300, lineHeight: 1.05, color: '#f5f0e8', marginBottom: 10, letterSpacing: '-0.01em' }}>
            Regular Home Cleaning
          </h1>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 10 : 11, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(200,184,154,0.4)', textTransform: 'uppercase', marginBottom: 22 }}>
            Across London
          </p>
          <div style={{ width: 36, height: 1, background: 'rgba(200,184,154,0.4)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 15, lineHeight: 1.9, color: 'rgba(245,240,232,0.55)', fontWeight: 300, maxWidth: 460, margin: '0 auto 28px' }}>
            Same trusted cleaner, same high standard, every visit.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 20px', maxWidth: 600, margin: '0 auto' }}>
            {['Vetted Cleaners', 'Fully Insured', 'Same Cleaner', 'Completion Photos'].map(b => (
              <div key={b} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: 'rgba(200,184,154,0.6)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#c8b89a' }}>✓</span> {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly price pop */}
      <div style={{ background: '#2c2420', padding: isMobile ? '20px 24px' : '22px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 10 : 20, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 10 : 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ffffff' }}>
            Weekly clean
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 38 : 52, fontWeight: 300, color: '#6fcf97', lineHeight: 1 }}>
            only £85
          </div>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 10 : 11, letterSpacing: '0.1em', color: '#ffffff' }}>
            per clean &nbsp;·&nbsp; saves £30 per visit
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: '#faf9f7', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 8 }}>
            Transparent, fixed pricing
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#8b7355', fontWeight: 300, marginBottom: 28 }}>
            Flat prices shown. Houses are priced approx. 10% higher. All prices include VAT.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(3,1fr)' : 'repeat(5,1fr)', gap: 10, marginBottom: 32 }}>
            {SIZES.map(s => (
              <div key={s.label} style={{ border: '1px solid rgba(200,184,154,0.3)', padding: '20px 12px', textAlign: 'center', background: '#fff' }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' }}>£{s.flat}</div>
                {s.house && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: '#b0a090', marginTop: 4 }}>House £{s.house}</div>}
              </div>
            ))}
          </div>

          {/* Recurring discounts */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', padding: '20px 24px' }}>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#166534', fontWeight: 600, marginBottom: 14 }}>
              Recurring discount — applied from your 2nd clean
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
              {FREQS.map(f => (
                <div key={f.label} style={{ textAlign: 'center', padding: '12px 8px', background: '#fff', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, color: '#1a1410', marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#2d6a4f', fontWeight: 500 }}>{f.note}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#4b5563', fontWeight: 300, marginTop: 12, lineHeight: 1.6 }}>
              Your first clean is at the full price. The discount applies automatically from your second clean onwards. Weekly bookings bring a studio clean down to £85/clean.
            </div>
          </div>
        </div>
      </div>

      {/* What's included */}
      <div style={{ background: '#f2ede6', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 12 }}>Every Visit</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 28 }}>
            What's included
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : isTablet ? '12px 20px' : '12px 32px' }}>
            {INCLUDES.map(item => (
              <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: '#c8b89a', fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, padding: '16px 20px', background: '#faf9f7', borderLeft: '3px solid #c8b89a' }}>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>
              <strong style={{ fontWeight: 500 }}>Heavier buildup?</strong> This service focuses on visible cleanliness and overall reset. If your home has significant buildup, stubborn marks, or hasn't been cleaned in a while, our Deep Clean may be more appropriate.
            </div>
          </div>
        </div>
      </div>

      {/* Add-ons */}
      <div style={{ background: '#faf9f7', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 12 }}>Optional Add-ons</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 16 }}>
            Customise your clean
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
            Add any of these extras to your booking at checkout. All add-on pricing is transparent with no surprises.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
            {[
              { name: 'Oven clean',           price: '£75' },
              { name: 'Inside fridge',        price: '£40' },
              { name: 'Interior windows',     price: 'from £35' },
              { name: 'Kitchen cupboards',    price: '£60' },
              { name: 'Microwave',            price: '£10' },
            ].map(a => (
              <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: '1px solid rgba(200,184,154,0.25)', background: '#fff' }}>
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300 }}>{a.name}</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#2c2420' }}>+{a.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade to Signature */}
      <div style={{ background: '#2c2420', padding: `${isMobile ? '52px' : '72px'} ${px}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 28 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <Sparkle size={9} color="#f5c842" />
              <Sparkle size={14} color="#f5c842" />
              <Sparkle size={9} color="#f5c842" />
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 22 : 28, fontWeight: 300, color: '#f5f0e8', marginBottom: 10 }}>
              Want more than a clean?
            </div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: 'rgba(245,240,232,0.6)', fontWeight: 300, lineHeight: 1.7, maxWidth: 440 }}>
              Our Signature Hotel Reset goes further. Hotel-style bed presentation, light decluttering, surface organisation, and our exclusive signature scent. You walk in and the whole home just feels different.
            </div>
          </div>
          <Link
            to="/book"
            state={{ pkgTab: 'signature' }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '13px 28px', border: '1px solid rgba(200,184,154,0.4)', color: '#c8b89a', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            View Signature Reset
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
            Book online in minutes. 30% deposit to secure your date. Balance charged on completion.
          </p>
          <Link
            to="/book"
            state={{ pkgTab: 'signature' }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '15px 36px', background: '#2c2420', color: '#f5f0e8', textDecoration: 'none' }}
          >
            <WandIcon size={14} color="#c8b89a" /> Book a Regular Clean
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
