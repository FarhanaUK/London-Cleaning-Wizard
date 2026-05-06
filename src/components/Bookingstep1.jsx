import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PACKAGES, PROPERTY_TYPES, FREQUENCIES, ADDONS } from '../data/siteData';
import { DEEP_SUPPLIES_FEE } from '../utils/pricing';
import { validateStep1 } from '../utils/validation';
import { Sparkle, WandIcon } from './Icons';

// What each package includes — shown in expandable checklist
const PACKAGE_DETAIL = {
  refresh: [
    'Full home clean across all rooms',
    'All surfaces wiped and reset',
    'Floors vacuumed and mopped throughout',
    'Kitchen cleaned (worktops, backsplash, cupboard doors and handles, sink, all appliance exteriors)',
    'Bathroom cleaned (toilet, sink, shower, mirrors)',
    'Doors and door frames lightly cleaned and spot-wiped',
    'High-touch areas sanitised (e.g. light switches, door handles)',
    'Bins emptied and relined',
  ],
  
  standard: {
    intro: [
      'For homes that are already maintained and need a refined, hotel-style finish. The Signature Hotel Reset goes beyond cleaning. It transforms your home into a calm, beautifully presented space that feels like a luxury hotel. You walk in, and everything just feels lighter, calmer, and easier.',
    ],
    sections: [
      {
        heading: 'Everything in Essential Reset, plus:',
        items: [
          'Linen change',
          'Hotel-style bed presentation (tight, smooth, and styled)',
          'Cushions and soft furnishings neatly arranged',
          'Light decluttering and surface organisation',
          'Surfaces left minimal, aligned, and intentional',
          'A complete "reset" of how your home feels',
          'Microwave deep clean',
        ],
      },
      {
        heading: 'The Signature Finish:',
        items: [
          'Your home is finished with a light mist of our exclusive signature scent, so you walk in to something that feels unmistakably luxurious. Like stepping into a five-star hotel.',
          'Opt in and we will leave you a complimentary gift: a bottle of our signature fragrance and a hand-poured signature candle, crafted exclusively for our clients',
          'Prefer to skip the scent? No problem. You can opt out in the next step',
          'Rooms left calm, balanced, and visually refined',
          'Completion photos provided',
        ],
      },
    ],
    footer: [
      'Feels like stepping into a calm, hotel-like space without leaving home.',
      'This is our most popular service and recommended for most homes.',
    ],
  },
  deep: {
    intro: [
      'The Deep Reset is our most intensive service. A full top-to-bottom restoration for homes that need more than a standard clean.',
    ],
    sections: [
      {
        heading: 'Everything in Essential Reset & Signature Hotel Reset, plus:',
        items: [
          'Walls wiped down (spot marks and scuffs removed)',
          'Skirting boards, blinds, and light fittings cleaned',
          'Vacuuming under and behind all furniture',
          'Inside wardrobes and drawers cleaned',
          'Behind the toilet fully cleaned',
          'Storage rooms and utility cupboards cleaned throughout',
          'All interior windows cleaned throughout',
        ],
      },
      {
        heading: 'All add-ons included as standard:',
        items: [
          'Oven fully cleaned (racks, door, casing & cavity)',
          'Fridge & freezer fully cleaned',
          'All kitchen cupboards fully cleaned',
          'Behind and under all appliances',
          'Extractor fan filters and housing degreased',
          'Microwave fully cleaned',
        ],
      },
      {
        heading: 'Full bathroom restoration:',
        items: [
          'Heavy limescale removal throughout',
          'Grout scrubbing',
          'Deep sanitisation of all surfaces',
        ],
      },
    ],
    footer: [
      'Your home is fully restored, deeply cleaned, and reset from top to bottom.',
      'Ideal for neglected homes, move-in preparation, or a full seasonal reset.',
    ],
  },
  eot: [
    'Letting agent and landlord standard clean',
    'Full oven, fridge, and cupboard clean included',
    'Limescale removal throughout',
    'Windows cleaned inside',
    'Detailed photo report for your landlord',
    'Free re-clean if any issues raised within 24hrs',
    'Cleaned to maximise your deposit return',
  ],
  movein: [
    'Property cleaned before your arrival',
    'All surfaces disinfected and sanitised',
    'Beds made up with fresh linen',
    'Kitchen and bathrooms hotel-ready',
    'Completion photos sent before you arrive',
  ],
  airbnb: [
    'Guest-ready turnaround between every booking',
    'Beds made with fresh linen',
    'Bathrooms and kitchen fully cleaned',
    'Restock of toiletries if supplied',
    'Bins emptied and fresh liners fitted',
    'Subtle application of our signature scent (you can opt out in the details section)',
    'Completion photo sent directly to you',
    'Same-day availability where possible',
  ],
};

const LABEL = {
  fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#5a4e44', marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 7,
};

const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', fontWeight: 500, padding: '14px 32px',
  background: '#2c2420', color: '#f5f0e8', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};

const CARD = (selected) => ({
  border: selected ? '2px solid #c8b89a' : '2px solid rgba(200,184,154,0.2)',
  background: selected ? 'rgba(200,184,154,0.22)' : '#fdf8f3',
  boxShadow: selected ? '0 2px 10px rgba(200,184,154,0.25)' : 'none',
  padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s',
  position: 'relative',
});

const HOURLY_PKG          = PACKAGES.find(p => p.id === 'hourly');
const AIRBNB_COMMERCIAL   = PACKAGES.find(p => p.id === 'airbnb_commercial');
const OFFICE_CLEANING     = PACKAGES.find(p => p.id === 'office_cleaning');

const COMMERCIAL_SERVICES = [
  {
    pkg: AIRBNB_COMMERCIAL,
    headline: 'Airbnb checkout, guest-ready.',
    subheadline: '£35/hr · min 2 hrs',
    description: 'Your guests expect a hotel experience. We make sure they get one. From fresh linens to spotless surfaces, we turn your property around quickly and to the highest standard, so you will never miss a 5 star review.',
    idealFor: [
      'Airbnb properties between guest checkouts',
      'Serviced apartments and short let properties',
    ],
    trustSignal: 'Same trusted cleaner every visit, so they know your property inside out.',
    honestNote: 'Pricing is based on hourly rate. Final duration depends on property size and condition left by guests.',
    upgradePrompt: 'Hosting regularly? Regular clients receive a dedicated cleaner and priority scheduling. Contact us for a tailored quote on a weekly or contract arrangement.',
  },
  {
    pkg: OFFICE_CLEANING,
    headline: 'Offices your team deserves.',
    subheadline: '£35/hr · min 3 hrs',
    description: "A clean office isn't just about appearances. It affects focus, morale and the impression you make on clients. We work around your schedule, arriving after hours so your team walks in to a fresh, professional environment every morning.",
    idealFor: [
      'Small to medium office spaces',
      'After hours evening cleans',
      'Regular weekly contracts',
    ],
    trustSignal: 'Fully vetted, insured professionals you can trust with your workspace.',
    honestNote: 'First clean includes a walkthrough assessment to understand your space and priorities. Regular contract clients receive a dedicated cleaning team.',
    upgradePrompt: 'Looking for a weekly clean or a regular contract? Regular clients receive a dedicated cleaning team and priority scheduling. Contact us for a tailored quote.',
  },
];

export default function BookingStep1({ booking, onUpdate, onNext }) {
  const location = useLocation();
  const [error,      setError]      = useState('');
  const [expanded,   setExpanded]   = useState(null);
  const [pkgTab,     setPkgTab]     = useState(() => {
    const saved = sessionStorage.getItem('pkgTab');
    if (saved) return saved;
    const id = booking.pkg?.id;
    if (id === 'hourly') return 'hourly';
    if (id === 'airbnb_commercial' || id === 'office_cleaning') return 'commercial';
    return 'signature';
  });

  const setTab = (tab) => { setPkgTab(tab); sessionStorage.setItem('pkgTab', tab); };

  useEffect(() => {
    if (location.state?.pkgTab) {
      setTab(location.state.pkgTab);
    }
  }, [location.state]);

  const update = (partial) => { onUpdate(partial); setError(''); };

  const handleNext = () => {
    const err = validateStep1(booking);
    if (err) { setError(err); return; }
    setError('');
    onNext();
  };

  const handlePackageSelect = (pkg) => {
    const isDeep = pkg.id === 'deep';
    update({ pkg, size: null, sizePrice: 0, freq: null, addons: [], supplies: isDeep ? 'cleaner' : null, suppliesFee: isDeep ? DEEP_SUPPLIES_FEE : undefined, mopAck: false });
  };

  const switchToHourly = () => {
    setTab('hourly');
    update({ pkg: HOURLY_PKG, size: null, sizePrice: 0, propertyType: 'flat', freq: null, addons: [], supplies: null, suppliesFee: undefined, mopAck: false, signatureTouch: false });
  };

  const switchToSignature = () => {
    setTab('signature');
    update({ pkg: null, size: null, sizePrice: 0, propertyType: null, freq: null, addons: [], supplies: null, mopAck: false });
  };

  const switchToCommercial = () => {
    setTab('commercial');
    update({ pkg: null, size: null, sizePrice: 0, propertyType: null, freq: null, addons: [], supplies: null, suppliesFee: undefined, mopAck: false, signatureTouch: false });
  };

  const toggleExpand = (e, pkgId) => {
    e.stopPropagation();
    setExpanded(prev => prev === pkgId ? null : pkgId);
  };

  const allSizes = booking.pkg?.sizes || [];
  const sizes = booking.propertyType === 'house'
    ? allSizes.filter(s => s.id !== 'studio')
    : allSizes;

  return (
    <div>
      <style>{`
        @keyframes twinkle1 { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }
        @keyframes twinkle2 { 0%,100% { opacity:1; transform:scale(1.2); } 50% { opacity:0.4; transform:scale(0.9); } }
        @keyframes twinkle3 { 0%,100% { opacity:0.6; transform:scale(1); } 60% { opacity:1; transform:scale(1.4); } }
        .pkg-tab-bar { display:flex; gap:6px; margin-bottom:24px; }
        .pkg-tab-bar button { flex:1; padding:11px 10px; border:1px solid rgba(200,184,154,0.4); border-radius:6px; cursor:pointer; font-family:'Jost',sans-serif; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; transition:all 0.15s; }
        @media (max-width:640px) {
          .pkg-tab-bar { flex-wrap:wrap; }
          .pkg-tab-bar button { flex:1 1 calc(50% - 3px); font-size:10px; padding:10px 6px; }
          .pkg-tab-bar button:last-child { flex:1 1 100%; }
        }
        .book-next-btn { font-family:'Jost',sans-serif; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; font-weight:500; padding:14px 32px; background:#2c2420; color:#f5f0e8; border:none; cursor:pointer; display:flex; align-items:center; gap:10px; }
        @media (max-width:640px) {
          .book-next-btn { width:100%; justify-content:center; padding:16px 24px; }
        }
        @media (min-width:641px) and (max-width:1024px) {
          .book-next-btn { width:100%; justify-content:center; }
        }
      `}</style>
      {/* Package tab switcher */}
      <>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#1a1410', marginBottom: 12 }}>
          What are you looking for?
        </div>
        <div className="pkg-tab-bar">
          {[
            { id: 'signature',  label: 'Signature Packages' },
            { id: 'hourly',     label: 'Hourly Clean' },
            { id: 'commercial', label: 'Commercial & Airbnb' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => t.id === 'hourly' ? switchToHourly() : t.id === 'commercial' ? switchToCommercial() : switchToSignature()}
              style={{
                fontWeight: pkgTab === t.id ? 600 : 400,
                background: pkgTab === t.id ? '#2c2420' : 'transparent',
                color: pkgTab === t.id ? '#f5f0e8' : '#5a4e44',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Signature packages tab */}
        {pkgTab === 'signature' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {PACKAGES.filter(p => !['airbnb','hourly','airbnb_commercial','office_cleaning'].includes(p.id)).map(pkg => (
              <div key={pkg.id}>
                <div style={CARD(booking.pkg?.id === pkg.id)} onClick={() => handlePackageSelect(pkg)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, fontWeight: 400, color: '#1a1410', display: 'flex', alignItems: 'center' }}>
                      {pkg.id === 'standard' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {pkg.name}
                          <span style={{ position: 'relative', display: 'inline-block', width: 30, height: 26, marginLeft: 8, flexShrink: 0 }}>
                            <span style={{ position: 'absolute', top: 0, right: 0, animation: 'twinkle2 1.8s ease-in-out infinite' }}>
                              <Sparkle size={9} color="#f5c842" />
                            </span>
                            <span style={{ position: 'absolute', bottom: 0, left: 0, animation: 'twinkle1 2.3s ease-in-out infinite' }}>
                              <Sparkle size={16} color="#f5c842" />
                            </span>
                            <span style={{ position: 'absolute', top: 8, right: 4, animation: 'twinkle3 2s ease-in-out infinite', animationDelay: '0.5s' }}>
                              <Sparkle size={12} color="#f5c842" />
                            </span>
                          </span>
                        </span>
                      ) : pkg.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: '#5a4e44' }}>
                        {pkg.launchOffer
                          ? <><span style={{ textDecoration: 'line-through', color: '#a09080', fontSize: 13, marginRight: 4 }}>£{pkg.sizes[0].basePrice}</span>from £{(pkg.sizes[0].basePrice * pkg.launchOffer).toFixed(2)}</>
                          : <>from £{pkg.sizes[0].basePrice}</>
                        }
                      </div>
                      {pkg.launchOffer && (
                        <div style={{ background: '#8b2020', color: '#fff', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px' }}>
                          50% off first clean
                        </div>
                      )}
                      {pkg.popular && !pkg.launchOffer && (
                        <div style={{ background: '#b8860b', color: '#fff', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px' }}>Most Popular</div>
                      )}
                      {pkg.showFreq && (
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: '#2d6a4f', fontWeight: 600, letterSpacing: '0.03em', textAlign: 'right', background: '#f0fdf4', padding: '3px 8px', border: '1px solid #bbf7d0' }}>
                          from £{pkg.sizes[0].basePrice - 30}/clean · weekly
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#6b5e56', fontWeight: 300, marginBottom: 10, lineHeight: 1.6 }}>
                    {pkg.desc}
                  </div>

                  {/* What's included toggle */}
                  <div
                    onClick={(e) => toggleExpand(e, pkg.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontFamily: "'Jost',sans-serif", fontSize: 10,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: '#c8b89a', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    {expanded === pkg.id ? '▲' : '▼'} What's included
                  </div>

                  {/* Expandable checklist */}
                  {expanded === pkg.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,184,154,0.2)' }}>
                      {Array.isArray(PACKAGE_DETAIL[pkg.id]) ? (
                        (PACKAGE_DETAIL[pkg.id] || []).map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                          </div>
                        ))
                      ) : (() => {
                        const d = PACKAGE_DETAIL[pkg.id];
                        return <>
                          {d.intro.map((p, i) => (
                            <p key={i} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#2c2420', fontWeight: i === 0 ? 500 : 300, lineHeight: 1.6, margin: '0 0 8px' }}>{p}</p>
                          ))}
                          {d.sections.map((sec, si) => (
                            <div key={si} style={{ marginBottom: 10 }}>
                              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#2c2420', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>{sec.heading}</div>
                              {sec.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                                  <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                          {d.footer.map((f, i) => (
                            <p key={i} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: i === 0 ? '#2c2420' : '#8b7355', fontWeight: i === 0 ? 500 : 300, lineHeight: 1.5, margin: '8px 0 4px' }}>{f}</p>
                          ))}
                        </>;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hourly tab */}
        {pkgTab === 'hourly' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={CARD(true)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, fontWeight: 400, color: '#1a1410' }}>Hourly Clean</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: '#5a4e44' }}>from £30/hour</div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8b7355' }}>3 to 3.5 hours</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#6b5e56', fontWeight: 300, marginBottom: 10, lineHeight: 1.6 }}>
                  Sometimes you just need the kitchen tackled, the bathroom refreshed, or a few rooms brought back together. You direct the priorities. We get to work.
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a4e44', fontWeight: 600, marginBottom: 7 }}>Ideal For</div>
                {[
                  'Maintaining a clean home between full resets',
                  'A quick refresh before guests or family arrive',
                  'Homes with specific cleaning requirements',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                    <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,184,154,0.2)', fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#8b7355', fontWeight: 300, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600, color: '#5a4e44' }}>Please note: </span>This is a timed service. Your cleaner works for the booked duration only, no checklist, no completion guarantee, and no reclean promise. For a guaranteed full home clean, upgrade to one of our reset packages.
                </div>
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#2c2420', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#f5f0e8', fontWeight: 300, lineHeight: 1.7 }}>
                  <span style={{ color: '#c8b89a', fontWeight: 600, marginRight: 6 }}>✦</span>Booking regularly? Our Essential Reset starts from £85/clean with weekly bookings, with a full home clean every visit.
                </div>
              </div>
            </div>

            <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> How many hours?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8, marginBottom: 24 }}>
              {HOURLY_PKG.sizes.map(s => (
                <div key={s.id} onClick={() => update({ size: s, sizePrice: s.basePrice })} style={CARD(booking.size?.id === s.id)}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#2c2420' }}>£{s.basePrice}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5a4e44', fontWeight: 600, marginBottom: 6 }}>What do you need done? *</div>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300, lineHeight: 1.6, marginBottom: 8 }}>
                Tell us exactly what areas to focus on. Your cleaner needs clear priorities before they arrive.
              </div>
              <textarea
                value={booking.notes || ''}
                onChange={e => update({ notes: e.target.value })}
                placeholder="e.g. Focus on the kitchen and bathroom first, hoover the living room and bedroom, wipe all surfaces..."
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', background: '#fdf8f3', border: '1px solid rgba(200,184,154,0.45)', padding: '11px 14px', fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#1a1410', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
          </div>
        )}

        {/* Commercial & Airbnb tab */}
        {pkgTab === 'commercial' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {COMMERCIAL_SERVICES.map(({ pkg, headline, subheadline, description, idealFor, trustSignal, honestNote, upgradePrompt }) => (
                <div
                  key={pkg.id}
                  onClick={() => update({ pkg, size: null, sizePrice: 0, propertyType: pkg.id === 'office_cleaning' ? 'office' : 'airbnb' })}
                  style={CARD(booking.pkg?.id === pkg.id)}
                >
                  {/* Header row — matches signature card layout */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, fontWeight: 400, color: '#1a1410' }}>
                      {headline}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: '#5a4e44' }}>
                        from £{pkg.sizes[0].basePrice}
                      </div>
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8b7355' }}>
                        {subheadline}
                      </div>
                    </div>
                  </div>

                  {/* Description — matches signature card */}
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#6b5e56', fontWeight: 300, marginBottom: 10, lineHeight: 1.6 }}>
                    {description}
                  </div>

                  {/* Ideal For */}
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a4e44', fontWeight: 600, marginBottom: 7 }}>Ideal For</div>
                  {idealFor.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                      <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}

                  {/* Trust signal */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,184,154,0.2)', fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 400, lineHeight: 1.6, fontStyle: 'italic' }}>
                    {trustSignal}
                  </div>

                  {/* Honest note */}
                  <div style={{ marginTop: 8, fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#8b7355', fontWeight: 300, lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: '#5a4e44' }}>Please note: </span>{honestNote}
                  </div>

                  {/* Upgrade prompt */}
                  {upgradePrompt && (
                    <div style={{ marginTop: 12, padding: '12px 14px', background: '#2c2420', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#f5f0e8', fontWeight: 300, lineHeight: 1.7 }}>
                      <span style={{ color: '#c8b89a', fontWeight: 600, marginRight: 6 }}>✦</span>{upgradePrompt}
                      <div style={{ marginTop: 10 }}>
                        <a
                          href="/quote"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, padding: '9px 18px', background: '#c8b89a', color: '#1a1410', textDecoration: 'none', cursor: 'pointer' }}
                        >
                          Get a tailored quote
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {booking.pkg && ['airbnb_commercial','office_cleaning'].includes(booking.pkg.id) && (
              <>
                <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> How many hours?</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8, marginBottom: 24 }}>
                  {booking.pkg.sizes.map(s => (
                    <div key={s.id} onClick={() => update({ size: s, sizePrice: s.basePrice })} style={CARD(booking.size?.id === s.id)}>
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#2c2420' }}>£{s.basePrice}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5a4e44', fontWeight: 600, marginBottom: 6 }}>
                    What do you need done? *
                  </div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300, lineHeight: 1.6, marginBottom: 10 }}>
                    Tell us what needs attention before we arrive. The more detail you give, the better prepared your cleaner will be.
                  </div>
                  <textarea
                    value={booking.notes || ''}
                    onChange={e => update({ notes: e.target.value })}
                    placeholder="e.g. Full office clean — desks, surfaces, kitchen area, toilets. Floors need hoovering and mopping. Pay attention to the reception area..."
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#fdf8f3', border: '1px solid rgba(200,184,154,0.45)', padding: '11px 14px', fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#1a1410', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </>

      {/* Property type — not shown for hourly */}
      {booking.pkg && !booking.pkg?.isHourly && (
        <>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Property Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {PROPERTY_TYPES.map(type => (
              <div
                key={type.id}
                onClick={() => {
                  const partial = { propertyType: type.id };
                  if (type.id === 'house' && booking.size?.id === 'studio') partial.size = null;
                  update(partial);
                }}
                style={CARD(booking.propertyType === type.id)}
              >
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#1a1410' }}>
                  {type.label}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Size grid — not shown for hourly */}
      {sizes.length > 0 && !booking.pkg?.isHourly && (
        <>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Property Size</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 24 }}>
            {sizes.map(size => {
              const displayPrice = booking.propertyType === 'house'
                ? Math.round(size.basePrice * 1.10)
                : size.basePrice;
              const launchPrice = booking.pkg?.launchOffer
                ? (displayPrice * booking.pkg.launchOffer).toFixed(2)
                : null;
              return (
                <div
                  key={size.id}
                  onClick={() => update({ size, sizePrice: size.basePrice })}
                  style={CARD(booking.size?.id === size.id)}
                >
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: '#1a1410', marginBottom: 4 }}>
                    {size.label}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#2c2420' }}>
                    {launchPrice !== null ? (
                      <>
                        <span style={{ textDecoration: 'line-through', fontSize: 14, color: '#a09080', marginRight: 4 }}>£{displayPrice}</span>
                        £{launchPrice}
                      </>
                    ) : `£${displayPrice}`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Frequency */}
      {booking.pkg?.showFreq && (
        <>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Frequency</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 12 }}>
            {FREQUENCIES.map(freq => (
              <div
                key={freq.id}
                onClick={() => update({ freq })}
                style={CARD(booking.freq?.id === freq.id)}
              >
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410', marginBottom: 3 }}>
                  {freq.label}
                </div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 300, color: freq.saving > 0 ? '#2d6a4f' : '#8b7355' }}>
                  {freq.note}
                </div>
              </div>
            ))}
          </div>
          {booking.freq && booking.freq.id !== 'one-off' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', padding: '10px 14px', marginBottom: 24, fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
              Your first clean is at the full price — the <strong>£{booking.freq.saving} discount</strong> applies from your second clean onwards.
              <div style={{ marginTop: 6, color: '#4b5563', fontWeight: 300 }}>
                Missing two consecutive cleans cancels the recurring arrangement and the discount. Rebooking starts at the standard first-clean rate.
              </div>
            </div>
          )}
        </>
      )}

      {/* Add-ons */}
      {booking.pkg?.showAddons && (
        <>
          <div style={LABEL}>
            <Sparkle size={7} color="#c8b89a" /> Add-ons
            <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11, color: '#8b7355', fontWeight: 300 }}>(optional)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {ADDONS.filter(addon => !(addon.id === 'microwave' && booking.pkg?.id === 'standard')).map(addon => {
              const selected = (booking.addons || []).some(a => a.id === addon.id);
              const allSizesSmall = (booking.pkg?.sizes || []).every(s => ['studio', '1bed'].includes(s.id));
              const isSmall  = ['studio', '1bed'].includes(booking.size?.id) || allSizesSmall;
              const price    = addon.id === 'windows' ? (isSmall ? 35 : 55) : addon.price;
              return (
                <div
                  key={addon.id}
                  onClick={() => {
                    const current = booking.addons || [];
                    const next = selected
                      ? current.filter(a => a.id !== addon.id)
                      : [...current, { ...addon, price }];
                    update({ addons: next });
                  }}
                  style={{ ...CARD(selected), display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{
                    width: 20, height: 20,
                    border: selected ? 'none' : '1px solid rgba(200,184,154,0.4)',
                    background: selected ? '#c8b89a' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: '#1a1410', fontSize: 11, fontWeight: 500,
                  }}>
                    {selected && '✓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410' }}>
                      {addon.name}
                    </div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300 }}>
                      {addon.note}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#2c2420', flexShrink: 0 }}>
                    +£{price}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Supplies */}
      {booking.pkg && (
        <>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Cleaning Supplies</div>
          {booking.pkg?.id === 'deep' ? (
            <div style={{ ...CARD(true), display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410' }}>Specialist supplies included</div>
                <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300, marginTop: 2 }}>Our cleaner will bring all specialist cleaning products required for a deep clean</div>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#2c2420', flexShrink: 0, marginLeft: 12 }}>+£{DEEP_SUPPLIES_FEE}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { id: 'customer', title: 'I will provide supplies', sub: 'You supply all cleaning products for the cleaner to use', price: null },
                { id: 'cleaner',  title: 'Please bring supplies',   sub: 'Our cleaner will arrive with all cleaning products',      price: '+£8' },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => update({ supplies: opt.id })}
                  style={{ ...CARD(booking.supplies === opt.id), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1410' }}>{opt.title}</div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300, marginTop: 2 }}>{opt.sub}</div>
                  </div>
                  {opt.price && (
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#2c2420', flexShrink: 0, marginLeft: 12 }}>{opt.price}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Mop & vacuum acknowledgment — always required */}
          <div
            onClick={() => update({ mopAck: !booking.mopAck })}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#fdf8f3', border: '1px solid rgba(200,184,154,0.3)', cursor: 'pointer', marginBottom: 24 }}
          >
            <div style={{
              width: 18, height: 18, flexShrink: 0, marginTop: 1,
              border: booking.mopAck ? 'none' : '1px solid rgba(200,184,154,0.5)',
              background: booking.mopAck ? '#c8b89a' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1a1410', fontSize: 11,
            }}>
              {booking.mopAck && '✓'}
            </div>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
              I understand that our cleaners do not bring mops or vacuums. I confirm there is a working mop and vacuum available at the property for the cleaner to use.
            </p>
          </div>
        </>
      )}

      {error && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button className="book-next-btn" onClick={handleNext}>
        <WandIcon size={14} color="#c8b89a" /> Continue to Schedule
      </button>
    </div>
  );
}