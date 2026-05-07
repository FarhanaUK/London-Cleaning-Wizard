import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Sparkle, WandIcon } from './Icons';

const SIZES = [
  { label: 'Studio',    price: 225 },
  { label: '1 Bedroom', price: 265 },
  { label: '2 Bedroom', price: 330 },
  { label: '3 Bedroom', price: 395 },
  { label: '4 Bedroom', price: 460 },
];

const USE_CASES = [
  {
    title: 'Moving Out',
    label: 'End of Tenancy',
    desc: 'Our deep clean meets letting agent and landlord standards. Everything is covered: inside the oven, fridge, cupboards, behind appliances, windows, and limescale removal throughout. Maximise your chances of a full deposit return.',
    items: [
      'Meets letting agent and landlord standards',
      'Full oven, fridge, and cupboard clean included',
      'Limescale removal throughout',
      'Interior windows cleaned',
      'Detailed photo report for your landlord',
      'Free re-clean if any issues raised within 24 hours',
    ],
  },
  {
    title: 'Moving In',
    label: 'Move-in Preparation',
    desc: 'Start fresh before your belongings arrive. We clean every surface, corner, and appliance so your new home is hotel-ready from day one. Completion photos sent before you move in.',
    items: [
      'Full property cleaned before your arrival',
      'All surfaces disinfected and sanitised',
      'Kitchen and bathrooms hotel-ready',
      'Inside all appliances cleaned',
      'Completion photos sent before you arrive',
    ],
  },
  {
    title: 'Overdue Clean',
    label: 'General Deep Clean',
    desc: "Hasn't been properly cleaned in a while? Our deep clean is a full top-to-bottom restoration. Two cleaners, 4 to 10 hours depending on property size, every surface addressed.",
    items: [
      'Walls wiped (spot marks and scuffs removed)',
      'Skirting boards, blinds, and light fittings cleaned',
      'Vacuuming under and behind all furniture',
      'Inside wardrobes and drawers cleaned',
      'Behind the toilet fully cleaned',
      'Storage rooms and utility cupboards cleaned throughout',
    ],
  },
];

const ALL_INCLUDED = [
  'Oven fully cleaned (racks, door, casing and cavity)',
  'Fridge and freezer fully cleaned',
  'All kitchen cupboards fully cleaned inside',
  'Behind and under all appliances',
  'Extractor fan filters and housing degreased',
  'Microwave fully cleaned',
  'Heavy limescale removal throughout',
  'Grout scrubbing',
  'Deep sanitisation of all surfaces',
  'All interior windows cleaned',
  'Skirting boards, blinds and light fittings',
  'Photo report on completion',
];

export default function DeepCleanPage() {
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
        <title>Deep Clean & End of Tenancy Cleaning London | From £225 | London Cleaning Wizard</title>
        <meta name="description" content="Professional deep cleaning and end of tenancy cleaning across London from £225. 2 cleaners, photo report, free re-clean guarantee. Vetted and fully insured. Book online." />
        <link rel="canonical" href="https://londoncleaningwizard.com/deep-clean" />
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
            <Sparkle size={7} color="#c8b89a" /> Deep Clean <Sparkle size={7} color="#c8b89a" />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 38 : isTablet ? 48 : 56, fontWeight: 300, lineHeight: 1.05, color: '#f5f0e8', marginBottom: 10, letterSpacing: '-0.01em' }}>
            Deep Clean
          </h1>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 11 : 12, fontWeight: 300, letterSpacing: '0.16em', color: 'rgba(200,184,154,0.45)', textTransform: 'uppercase', marginBottom: 20 }}>
            End of Tenancy &nbsp;·&nbsp; Move In Preparation
          </p>
          <div style={{ width: 36, height: 1, background: 'rgba(200,184,154,0.4)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 15, lineHeight: 1.9, color: 'rgba(245,240,232,0.55)', fontWeight: 300, maxWidth: 460, margin: '0 auto 28px' }}>
            A full top-to-bottom restoration. Two cleaners, every surface addressed.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 20px', maxWidth: 460, margin: '0 auto' }}>
            {['2 Cleaners', 'Photo Report Included', 'Free Re-clean Guarantee', 'Vetted & Insured'].map(b => (
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
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 8 }}>
            Fixed pricing. No hidden fees.
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#8b7355', fontWeight: 300, marginBottom: 28 }}>
            Specialist cleaning supplies are included in every deep clean. All prices include VAT.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : isTablet ? 'repeat(3,1fr)' : 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
            {SIZES.map(s => (
              <div key={s.label} style={{ border: '1px solid rgba(200,184,154,0.3)', padding: '20px 12px', textAlign: 'center', background: '#fff' }}>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' }}>£{s.price}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300 }}>
            Duration: approx. 4 to 10 hours depending on property size and condition. 30% deposit to confirm your booking.
          </p>
        </div>
      </div>

      {/* Who it's for */}
      <div style={{ background: '#f2ede6', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 12 }}>One Service</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#1a1410', marginBottom: 12 }}>
            Who it's for
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.8, marginBottom: 40 }}>
            Same service. Same team. Same pricing. Whether you are moving out, moving in, or simply overdue a proper clean, you book the deep clean and we take care of the rest.
          </p>
          {USE_CASES.map((uc, i) => (
            <div key={uc.title} style={{
              marginBottom: i < USE_CASES.length - 1 ? 40 : 0,
              paddingBottom: i < USE_CASES.length - 1 ? 40 : 0,
              borderBottom: i < USE_CASES.length - 1 ? '1px solid rgba(200,184,154,0.2)' : 'none',
            }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.2em', color: '#8b7355', textTransform: 'uppercase', marginBottom: 8 }}>{uc.label}</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 22 : 28, fontWeight: 400, color: '#1a1410', marginBottom: 14 }}>
                {uc.title}
              </h3>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 15, color: '#5a4e44', fontWeight: 300, lineHeight: 1.8, marginBottom: 18 }}>
                {uc.desc}
              </p>
              {uc.items.map(item => (
                <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ color: '#c8b89a', fontSize: 14, flexShrink: 0 }}>✓</span>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 36 }}>
            <Link
              to="/book"
              state={{ pkgTab: 'deep' }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '12px 26px', background: '#2c2420', color: '#f5f0e8', textDecoration: 'none' }}
            >
              Book a Deep Clean
            </Link>
          </div>
        </div>
      </div>

      {/* Everything included */}
      <div style={{ background: '#1a1410', padding: sec }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', color: '#c8b89a', textTransform: 'uppercase', marginBottom: 12 }}>Every Deep Clean</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 'clamp(26px,7vw,36px)' : 'clamp(30px,4vw,44px)', fontWeight: 300, color: '#f5f0e8', marginBottom: 28 }}>
            Everything is included
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : isTablet ? '12px 20px' : '12px 32px' }}>
            {ALL_INCLUDED.map(item => (
              <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: '#c8b89a', fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: 'rgba(245,240,232,0.75)', fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(200,184,154,0.08)', borderLeft: '3px solid #c8b89a' }}>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: 'rgba(245,240,232,0.7)', fontWeight: 300, lineHeight: 1.7 }}>
              Specialist cleaning supplies are brought by our team. You do not need to provide any products. A working mop and vacuum must be available at the property.
            </div>
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
            Ready to book?
          </h2>
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 15, color: '#8b7355', fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            Book online in minutes. 30% deposit to confirm your date. Balance charged on completion.
          </p>
          <Link
            to="/book"
            state={{ pkgTab: 'signature' }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, padding: '15px 36px', background: '#2c2420', color: '#f5f0e8', textDecoration: 'none' }}
          >
            <WandIcon size={14} color="#c8b89a" /> Book a Deep Clean
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
