import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../utils/funnelTrack';
import { PACKAGES } from '../data/siteData';
import { DEEP_SUPPLIES_FEE } from '../utils/pricing';
import { validateStep1 } from '../utils/validation';
import { Sparkle, WandIcon } from './Icons';

// What each package includes - shown in expandable checklist
const PACKAGE_DETAIL = {
  refresh: {
    mobileSections: [
      { heading: 'Core cleaning', items: ['Full home clean across all rooms', 'All surfaces wiped and reset', 'Floors vacuumed and mopped throughout', 'High-touch areas sanitised (e.g. light switches, door handles)', 'Bins emptied and relined'] },
      { heading: 'Kitchen & bathroom', items: ['Kitchen cleaned (worktops, backsplash, cupboard doors and handles, sink, all appliance exteriors)', 'Bathroom cleaned (toilet, sink, shower, mirrors)', 'Doors and door frames lightly cleaned and spot-wiped'] },
    ],
  },
  
  standard: {
    mobileSections: [
      { heading: 'Core cleaning', items: ['Full home clean across all rooms', 'Floors vacuumed and mopped throughout', 'High-touch areas sanitised', 'Bins emptied and relined'] },
      { heading: 'Kitchen & bathroom', items: ['Kitchen cleaned (surfaces, cupboards, appliances exterior)', 'Bathroom cleaned (toilet, sink, shower, mirrors)', 'Microwave deep clean'] },
      { heading: 'Finishing touches', items: ['Linen change', 'Hotel-style bed presentation', 'Cushions and soft furnishings neatly arranged', 'Items tidied in place', 'Surfaces left minimal and aligned', 'Doors and frames spot cleaned'] },
      { heading: 'Signature finish', items: ['Light signature scent (optional opt-out)', 'Complimentary gift (when available)'] },
    ],
    intro: [],
    sections: [
      {
        heading: null,
        items: [
          'Full home clean across all rooms',
          'All surfaces wiped and reset',
          'Floors vacuumed and mopped throughout',
          'Kitchen cleaned (worktops, backsplash, cupboard doors and handles, sink, all appliance exteriors)',
          'Bathroom cleaned (toilet, sink, shower, mirrors)',
          'Doors and door frames lightly cleaned and spot-wiped',
          'High-touch areas sanitised (e.g. light switches, door handles)',
          'Bins emptied and relined',
          'Linen change',
          'Hotel-style bed presentation (tight, smooth, and styled)',
          'Cushions and soft furnishings neatly arranged',
          'Items tidied in place, nothing moved or relocated',
          'Surfaces left minimal, aligned, and intentional',
          'A complete "reset" of how your home feels',
          'Microwave deep clean',
        ],
      },
      {
        heading: 'The Signature Finish',
        items: [
          'Light mist of our exclusive signature scent (optional opt-out)',
          'Complimentary gift: bottle of signature fragrance + hand-poured candle (when available)',
          'Rooms left calm, balanced, and visually refined',
        ],
      },
    ],
    footer: [],
  },
  deep: {
    mobileSections: [
      { heading: 'Everything in Signature & Essential, plus:', items: ['Walls wiped down (spot marks and scuffs removed)', 'Skirting boards, blinds, and light fittings cleaned', 'Vacuuming under and behind all furniture', 'Inside wardrobes and drawers cleaned', 'Behind the toilet fully cleaned', 'Storage rooms and utility cupboards cleaned throughout', 'All interior windows cleaned throughout'] },
      { heading: 'Premium deep-clean inclusions', items: ['Oven fully cleaned (racks, door, casing & cavity)', 'Fridge & freezer fully cleaned', 'All kitchen cupboards fully cleaned', 'Behind and under all appliances', 'Extractor fan filters and housing degreased', 'Microwave fully cleaned'] },
      { heading: 'Full bathroom restoration', items: ['Heavy limescale removal throughout', 'Grout scrubbing', 'Deep sanitisation of all surfaces'] },
    ],
    intro: [],
    sections: [
      {
        heading: 'Includes everything in Signature Hotel Reset and Essential Reset, plus deeper restorative cleaning:',
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
        heading: 'Premium deep-clean inclusions (normally add-ons, included here)',
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
        heading: 'Full bathroom restoration',
        items: [
          'Heavy limescale removal throughout',
          'Grout scrubbing',
          'Deep sanitisation of all surfaces',
        ],
      },
    ],
    footer: [
      'Your home is fully restored, deeply cleaned, and reset from top to bottom.',
      'Ideal for move-in preparation or a full seasonal reset.',
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
const AIRBNB_PKG          = PACKAGES.find(p => p.id === 'airbnb');
const OFFICE_CLEANING     = PACKAGES.find(p => p.id === 'office_cleaning');

const COMMERCIAL_SERVICES = [
  {
    pkg: AIRBNB_PKG,
    headline: 'Airbnb checkout, guest-ready.',
    subheadline: 'By bedroom · linen incl.',
    description: 'Your guests expect a hotel experience between every stay. We turn your property around to the highest standard — fresh linen, hotel-style towel folds, surfaces staged, and a photo report sent to you once we\'re done, so you never miss a 5-star review.',
    idealFor: [
      'Airbnb properties between guest checkouts',
      'Short let and serviced apartments',
    ],
    trustSignal: 'Same trusted cleaner every visit, so they know your property inside out.',
    honestNote: 'Priced by number of bedrooms. Houses are priced at 10% above flats to reflect the additional space.',
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

export default function BookingStep1({ booking, onUpdate, onNext, onBack }) {
  const location = useLocation();
  const [error,      setError]      = useState('');
  const [expanded,   setExpanded]   = useState(null);
  const [openSections, setOpenSections] = useState(new Set());
  const [pkgTab,     setPkgTab]     = useState(() => {
    const saved = sessionStorage.getItem('pkgTab');
    if (saved) return saved;
    const id = booking.pkg?.id;
    if (id === 'hourly') return 'hourly';
    if (id === 'airbnb' || id === 'office_cleaning') return 'commercial';
    return 'signature';
  });

  const notesTrackedRef = useRef(false);

  const setTab = (tab) => { setPkgTab(tab); sessionStorage.setItem('pkgTab', tab); };

  useEffect(() => {
    if (!location.state?.pkgTab) return;
    const tab = location.state.pkgTab;
    if (tab === 'hourly') switchToHourly();
    else if (tab === 'commercial') switchToCommercial();
    else switchToSignature();
  }, [location.state]);

  useEffect(() => {
    if (pkgTab === 'hourly' && !booking.pkg) {
      update({ pkg: HOURLY_PKG, size: null, sizePrice: 0, propertyType: 'flat', freq: null, addons: [], supplies: null, suppliesFee: undefined, mopAck: false, signatureTouch: false });
    }
    if (pkgTab === 'signature') {
      const sigPkgs = PACKAGES.filter(p => !['airbnb','hourly','airbnb_commercial','office_cleaning'].includes(p.id));
      const alreadySelected = booking.pkg && sigPkgs.find(p => p.id === booking.pkg.id);
      // no auto-select
    }
    if (pkgTab === 'commercial') {
      const commercialIds = COMMERCIAL_SERVICES.map(s => s.pkg.id);
      const alreadySelected = booking.pkg && commercialIds.includes(booking.pkg.id);
      if (!alreadySelected) {
        const first = COMMERCIAL_SERVICES[0].pkg;
        update({ pkg: first, size: null, sizePrice: 0, propertyType: 'flat' });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (partial) => { onUpdate(partial); setError(''); };

  const handleNext = () => {
    const err = validateStep1(booking);
    if (err) { setError(err); return; }
    setError('');
    onNext();
  };

  const handlePackageSelect = (pkg) => {
    const isDeep = pkg.id === 'deep';
    trackEvent('pkg_selected', { pkg: pkg.name, from: booking.pkg?.name || null });
    update({ pkg, size: null, sizePrice: 0, freq: null, addons: [], supplies: isDeep ? 'cleaner' : null, suppliesFee: isDeep ? DEEP_SUPPLIES_FEE : undefined, mopAck: false });
  };

  const switchToHourly = () => {
    setTab('hourly');
    trackEvent('tab_switched', { tab: 'hourly' });
    update({ pkg: HOURLY_PKG, size: null, sizePrice: 0, propertyType: 'flat', freq: null, addons: [], supplies: null, suppliesFee: undefined, mopAck: false, signatureTouch: false, notes: '' });
  };

  const switchToSignature = () => {
    setTab('signature');
    trackEvent('tab_switched', { tab: 'signature' });
    update({ pkg: null, size: null, sizePrice: 0, propertyType: null, freq: null, addons: [], supplies: null, mopAck: false });
  };

  const switchToCommercial = () => {
    setTab('commercial');
    trackEvent('tab_switched', { tab: 'commercial' });
    update({ pkg: null, size: null, sizePrice: 0, propertyType: null, freq: null, addons: [], supplies: null, suppliesFee: undefined, mopAck: false, signatureTouch: false, notes: '' });
  };

  const toggleExpand = (e, pkgId) => {
    e.stopPropagation();
    const next = expanded === pkgId ? null : pkgId;
    if (next) trackEvent('pkg_detail_expanded', { pkg: pkgId });
    setExpanded(next);
  };

  return (
    <div>
      <style>{`
        @keyframes twinkle1 { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }
        @keyframes twinkle2 { 0%,100% { opacity:1; transform:scale(1.2); } 50% { opacity:0.4; transform:scale(0.9); } }
        @keyframes twinkle3 { 0%,100% { opacity:0.6; transform:scale(1); } 60% { opacity:1; transform:scale(1.4); } }
.book-next-btn { font-family:'Jost',sans-serif; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; font-weight:500; padding:14px 32px; background:#2c2420; color:#f5f0e8; border:none; cursor:pointer; display:flex; align-items:center; gap:10px; }
        @media (max-width:640px) {
          .book-next-btn { width:100%; justify-content:center; padding:16px 24px; }
          .step1-cta-row { padding-bottom: 90px; }
        }
        @media (min-width:641px) and (max-width:1024px) {
          .book-next-btn { width:100%; justify-content:center; }
        }
        .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
        .card-price-col { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; margin-left:12px; }
        .pkg-card-desc { font-size: 13px; }
        .pkg-card-bullet { font-size: 13px; }
        .pkg-card-bottomline { font-size: 13px; }
        .pkg-card-price { font-size: 13px; }
        .pkg-card-offer { font-size: 13px; }
        .pkg-card-tagline { font-size: 12px; }
        .mobile-card-inner { display: none; }
        .desktop-card-inner { display: contents; }
        .pkg-card-extras { display: block; }
        .sig-card-inline-detail { display: none; }
        .pkg-card-banner { display: none; }
        .pkg-mobile-note { display: none; }
        .pkg-desktop-bottom { display: block; }
        @media (min-width: 768px) and (max-width: 1024px) {
          .sig-pkg-grid { flex-direction: column; }
          .sig-card-inline-detail { display: block; }
          .sig-bottom-detail { display: none; }
        }
        @media (max-width: 767px) {
          .mobile-card-inner { display: contents; }
          .desktop-card-inner { display: none; }
          .pkg-card-banner { display: block; }
          .pkg-mobile-note { display: block; }
          .pkg-desktop-bottom { display: none; }
        }
        .pkg-detail-extras { display: none; }
        .pkg-desc-mobile { display: none; }
        .pkg-wi-mobile { display: none; }
        .pkg-wi-desktop { display: block; }
        .sig-pkg-grid { display: flex; gap: 8px; align-items: stretch; }
        @media (max-width:640px) {
          .card-header { flex-wrap:wrap; gap:6px 0; }
          .card-price-col { align-items:flex-start; margin-left:0; }
          .pkg-card-desc { font-size: 10px; }
          .pkg-card-title { font-size: 8px; letter-spacing: 0.02em; min-height: 36px; }
          .pkg-card-subtitle { font-size: 8px; }
          .pkg-detail-text { font-size: 11px; }
          .pkg-desc-desktop { display: none; }
          .pkg-desc-mobile { display: block; }
          .pkg-detail-extras { display: none; }
          .pkg-card-extras { display: none; }
          .pkg-wi-mobile { display: block; }
          .pkg-wi-desktop { display: none; }
          .pkg-wi-item { font-size: 11px; }
          .pkg-card-spacer { display: flex; flex: 1; }
          .pkg-card-bullet { font-size: 11px; }
          .pkg-card-bottomline { font-size: 11px; }
          .pkg-card-price { font-size: 11px; }
          .pkg-card-offer { font-size: 11px; }
          .mobile-card-inner { display: contents; }
          .desktop-card-inner { display: none; }
          .bk-back-btn { margin-top: 24px; }
        }
      `}</style>

      {/* Package content */}
      <>
        {onBack && (
          <button className="bk-back-btn" onClick={onBack} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', padding: 0, marginBottom: 8, alignSelf: 'flex-start' }}>
            ← Back
          </button>
        )}
        <div className="step-heading" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#1a1410', marginBottom: 14 }}>
          Choose your clean
        </div>

        {/* Signature packages tab — horizontal tabs + detail panel */}
        {pkgTab === 'signature' && (() => {
          const sigPkgs = PACKAGES.filter(p => !['airbnb','hourly','airbnb_commercial','office_cleaning'].includes(p.id));
          const activePkg = booking.pkg && sigPkgs.find(p => p.id === booking.pkg.id)
            ? booking.pkg
            : null;
          const renderDetail = (p) => (
            <>
              {p.mobileDesc ? (
                <>
                  <div className="pkg-detail-text" style={{ fontFamily: "'Jost',sans-serif", color: '#6b5e56', fontWeight: 300, marginBottom: 4, lineHeight: 1.6 }}>{p.mobileDesc}</div>
                  {p.mobileDescSub && <div className="pkg-detail-text" style={{ fontFamily: "'Jost',sans-serif", color: '#6b5e56', fontWeight: 300, marginBottom: 4, lineHeight: 1.5 }}>{p.mobileDescSub}</div>}
                  {p.mobileDescNote && <div className="pkg-detail-text" style={{ fontFamily: "'Jost',sans-serif", color: '#8b7355', fontWeight: 300, marginBottom: 8, lineHeight: 1.5 }}>⏱ {p.mobileDescNote}</div>}
                </>
              ) : (
                <div className="pkg-detail-text" style={{ fontFamily: "'Jost',sans-serif", color: '#6b5e56', fontWeight: 300, marginBottom: 8, lineHeight: 1.6 }}>{p.desc}</div>
              )}
              <div className="pkg-detail-extras">
                {p.cardDesc && <div className="pkg-detail-text" style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, color: '#6b5e56', lineHeight: 1.4, marginBottom: 8 }}>{p.cardDesc}</div>}
                {(p.cardBullets || []).map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                    <span className="pkg-detail-text" style={{ color: '#2d6a4f', flexShrink: 0 }}>✔</span>
                    <span className="pkg-detail-text" style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, color: '#5a4e44', lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
              {p.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {p.tags.map((tag, i) => (
                    <span key={i} style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8b7355', border: '1px solid rgba(200,184,154,0.4)', padding: '3px 8px', borderRadius: 3 }}>{tag}</span>
                  ))}
                </div>
              )}
              <div onClick={(e) => toggleExpand(e, p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2c2420', cursor: 'pointer', userSelect: 'none', fontWeight: 600 }}>
                {expanded === p.id ? '▲' : '▼'} What's included
              </div>
              {expanded === p.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,184,154,0.2)' }}>
                  {PACKAGE_DETAIL[p.id]?.mobileSections ? (
                    PACKAGE_DETAIL[p.id].mobileSections.map((sec, si) => (
                      <div key={si} style={{ borderBottom: '1px solid rgba(200,184,154,0.12)' }}>
                        <div onClick={() => { if (!openSections.has(si)) trackEvent('section_expanded', { pkg: p.id, section: sec.heading }); setOpenSections(prev => { const n = new Set(prev); n.has(si) ? n.delete(si) : n.add(si); return n; }); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#2c2420', fontWeight: 600, letterSpacing: '0.04em' }}>{sec.heading}</div>
                          <span style={{ fontSize: 9, color: '#8b7355', marginLeft: 8, flexShrink: 0 }}>{openSections.has(si) ? '▲' : '▶'}</span>
                        </div>
                        {openSections.has(si) && (
                          <div style={{ paddingBottom: 10 }}>
                            {sec.items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                                <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                                <span className="pkg-wi-item" style={{ fontFamily: "'Jost',sans-serif", color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div>
                      {Array.isArray(PACKAGE_DETAIL[p.id]) ? (
                        (PACKAGE_DETAIL[p.id] || []).map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                            <span className="pkg-wi-item" style={{ fontFamily: "'Jost',sans-serif", color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                          </div>
                        ))
                      ) : (() => {
                        const d = PACKAGE_DETAIL[p.id];
                        return <>
                          {d.intro.map((line, i) => (
                            <p key={i} style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#2c2420', fontWeight: i === 0 ? 500 : 300, lineHeight: 1.6, margin: '0 0 8px' }}>{line}</p>
                          ))}
                          {d.sections.map((sec, si) => (
                            <div key={si} style={{ marginBottom: 10 }}>
                              {sec.heading && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#2c2420', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>{sec.heading}</div>}
                              {sec.baseItems && (
                                <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(200,184,154,0.2)' }}>
                                  {sec.baseItems.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                                      <span style={{ color: '#c8b89a', fontSize: 10, flexShrink: 0, marginTop: 2 }}>✓</span>
                                      <span className="pkg-wi-item" style={{ fontFamily: "'Jost',sans-serif", color: '#8b7355', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {sec.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                                  <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                                  <span className="pkg-wi-item" style={{ fontFamily: "'Jost',sans-serif", color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
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
              )}
            </>
          );
          return (
            <div style={{ marginBottom: 24 }}>
              {/* 3 package cards */}
              <div className="sig-pkg-grid" style={{ marginBottom: 16 }}>
                {sigPkgs.map(pkg => {
                  const sel = activePkg?.id === pkg.id;
                  const subtitle = pkg.popular ? 'Most Popular' : pkg.name.split(' - ')[1];
                  const fromPrice = pkg.cardFromPrice || pkg.sizes[0].basePrice;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => sel ? update({ pkg: null, size: null, sizePrice: 0, freq: null, addons: [], supplies: null, mopAck: false }) : handlePackageSelect(pkg)}
                      role="button"
                      style={{ flex: 1, padding: '12px 10px', border: sel ? '2px solid #c8b89a' : '2px solid rgba(200,184,154,0.2)', borderRadius: 6, background: sel ? 'rgba(200,184,154,0.22)' : '#fdf8f3', boxShadow: sel ? '0 2px 10px rgba(200,184,154,0.25)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}
                    >
                      {/* Mobile: banner + original layout */}
                      {pkg.cardBanner && (
                        <div className="pkg-card-banner" style={{ background: '#2c2420', fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', padding: '5px 10px', width: 'calc(100% + 20px)', marginLeft: -10, marginTop: -12, marginBottom: 8, boxSizing: 'border-box', textAlign: 'center', borderRadius: '4px 4px 0 0' }}>
                          <span style={{ color: '#ffffff' }}>{pkg.cardBanner}</span>
                        </div>
                      )}
                      <div className="mobile-card-inner">
                        <div className="pkg-card-title" style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.4, color: '#1a1410' }}>
                          {pkg.name.split(' - ')[0]}
                        </div>
                        {pkg.cardTagline && <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 400, color: '#6b5e56', marginBottom: 2, letterSpacing: '0.02em' }}>{pkg.cardTagline.replace('✔ ', '')}</div>}
                        {subtitle && !pkg.hideMobileSubtitle && <div className="pkg-card-subtitle" style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#a89070', letterSpacing: '0.04em', marginBottom: 4 }}>({subtitle})</div>}
                        <div className="pkg-card-price" style={{ fontFamily: "'Jost',sans-serif", color: '#8b7355', marginBottom: pkg.launchOffer ? 2 : 2 }}>
                          from £{fromPrice}{pkg.launchOffer ? ` (was £${pkg.sizes[0].basePrice})` : ''}
                        </div>
                        {pkg.launchOffer && (
                          <div className="pkg-card-offer" style={{ fontFamily: "'Jost',sans-serif", color: '#8b2020', marginBottom: 4 }}>
                            50% off first clean
                          </div>
                        )}
                      </div>
                      {/* Desktop: new layout */}
                      <div className="desktop-card-inner">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 2 }}>
                          <div className="pkg-card-title" style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.4, color: '#1a1410' }}>
                            {pkg.name.split(' - ')[0]}
                          </div>
                          {subtitle && <div className="pkg-card-subtitle" style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#a89070', letterSpacing: '0.04em', textAlign: 'right', marginLeft: 6 }}>({subtitle})</div>}
                        </div>
                        {pkg.cardTagline && <div className="pkg-card-tagline" style={{ fontFamily: "'Jost',sans-serif", color: '#2d6a4f', fontWeight: 600, marginTop: 4, marginBottom: 5 }}>{pkg.cardTagline}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                          <div className="pkg-card-price" style={{ fontFamily: "'Jost',sans-serif", color: '#8b7355' }}>
                            from £{fromPrice}{pkg.launchOffer ? ` (was £${pkg.sizes[0].basePrice})` : ''}
                          </div>
                          {pkg.launchOffer && (
                            <div className="pkg-card-offer" style={{ fontFamily: "'Jost',sans-serif", color: '#8b2020', fontStyle: 'italic' }}>
                              50% off first clean · ends 1 June
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pkg-card-extras" style={{ width: '100%', marginTop: pkg.showFreq || pkg.cardUseNote ? 0 : 48 }}>
                        {pkg.cardDesc && <div className="pkg-card-desc" style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, color: '#6b5e56', lineHeight: 1.4, marginBottom: 6 }}>{pkg.cardDesc}</div>}
                        {(pkg.cardBullets || []).map((b, i) => (
                          <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3 }}>
                            <span className="pkg-card-bullet" style={{ color: '#2d6a4f', flexShrink: 0 }}>✔</span>
                            <span className="pkg-card-bullet" style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, color: '#5a4e44', lineHeight: 1.4 }}>{b}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pkg-card-spacer" style={{ flex: 1 }} />
                      {(pkg.showFreq || pkg.cardUseNote) && (
                        <div className="pkg-desktop-bottom" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(200,184,154,0.3)', width: '100%' }}>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: 'rgba(139,115,85,0.45)', fontWeight: 300, lineHeight: 1.4 }}>
                            {pkg.showFreq ? 'Weekly, Fortnightly & Monthly available' : pkg.cardUseNote}
                          </div>
                        </div>
                      )}
                      {(pkg.showFreq || pkg.cardUseNote) && (
                        <div className="pkg-mobile-note" style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, color: 'rgba(139,115,85,0.65)', fontWeight: 300, marginBottom: 4, lineHeight: 1.3, textAlign: 'center', width: '100%', borderTop: '1px solid rgba(200,184,154,0.3)', paddingTop: 6, marginTop: 4 }}>
                          {pkg.showFreq ? 'Weekly · Fortnightly · Monthly' : pkg.cardUseNote}
                        </div>
                      )}
                    {sel && (
                      <div className="sig-card-inline-detail" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,184,154,0.3)', width: '100%' }} onClick={e => e.stopPropagation()}>
                        {renderDetail(pkg)}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>

              {/* Detail panel for selected package */}
              <div className="sig-bottom-detail">
              {activePkg && <div style={CARD(true)}>{renderDetail(activePkg)}</div>}
              </div>
            </div>
          );
        })()}

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
                  <span style={{ color: '#c8b89a', fontWeight: 600, marginRight: 6 }}>✦</span>Booking regularly? Our Regular Clean starts from £85/clean with weekly bookings, with a full home clean every visit.
                </div>
              </div>
            </div>

            <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> How many hours?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8, marginBottom: 24 }}>
              {HOURLY_PKG.sizes.map(s => (
                <div key={s.id} onClick={() => { trackEvent('duration_selected', { hours: s.label, price: s.basePrice, from: booking.size?.label || null }); update({ size: s, sizePrice: s.basePrice }); }} style={CARD(booking.size?.id === s.id)}>
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
                onChange={e => { if (!notesTrackedRef.current && e.target.value) { trackEvent('notes_started', { step: 'service' }); notesTrackedRef.current = true; } update({ notes: e.target.value }); }}
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
              {/* Horizontal tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {COMMERCIAL_SERVICES.map(({ pkg, headline, subheadline }) => {
                const sel = booking.pkg?.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => {
                      trackEvent('commercial_service', { service: pkg.id, from: booking.pkg?.id || null });
                      update({ pkg, size: null, sizePrice: 0, propertyType: pkg.id === 'office_cleaning' ? 'office' : 'flat' });
                    }}
                    style={{ flex: 1, padding: '12px 10px', border: sel ? '1.5px solid #2c2420' : '1px solid rgba(200,184,154,0.4)', borderRadius: 6, background: sel ? '#2c2420' : 'transparent', color: sel ? '#f5f0e8' : '#5a4e44', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', outline: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}
                  >
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>{headline}</div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: sel ? '#c8b89a' : '#8b7355' }}>{subheadline}</div>
                  </button>
                );
              })}
            </div>

            {/* Detail panel for selected service */}
            {(() => {
              const active = COMMERCIAL_SERVICES.find(s => s.pkg.id === booking.pkg?.id);
              if (!active) return null;
              const { pkg, description, idealFor, trustSignal, upgradePrompt } = active;
              return (
                <div style={CARD(true)}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#6b5e56', fontWeight: 300, marginBottom: 12, lineHeight: 1.6 }}>
                    {description}
                  </div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a4e44', fontWeight: 600, marginBottom: 7 }}>Ideal For</div>
                  {idealFor.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                      <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,184,154,0.2)', fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#5a4e44', fontWeight: 400, lineHeight: 1.6, fontStyle: 'italic' }}>
                    {trustSignal}
                  </div>
                  {upgradePrompt && (
                    <div style={{ marginTop: 12, padding: '12px 14px', background: '#2c2420', fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#f5f0e8', fontWeight: 300, lineHeight: 1.7 }}>
                      <span style={{ color: '#c8b89a', fontWeight: 600, marginRight: 6 }}>✦</span>{upgradePrompt}
                      <div style={{ marginTop: 10 }}>
                        <a href="/quote" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, padding: '9px 18px', background: '#c8b89a', color: '#1a1410', textDecoration: 'none', cursor: 'pointer' }}>
                          Get a tailored quote
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {booking.pkg && booking.pkg.id === 'office_cleaning' && (
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
                    onChange={e => { if (!notesTrackedRef.current && e.target.value) { trackEvent('notes_started', { step: 'service' }); notesTrackedRef.current = true; } update({ notes: e.target.value }); }}
                    placeholder="e.g. Full office clean: desks, surfaces, kitchen area, toilets. Floors need hoovering and mopping. Pay attention to the reception area..."
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#fdf8f3', border: '1px solid rgba(200,184,154,0.45)', padding: '11px 14px', fontFamily: "'Jost',sans-serif", fontSize: 14, color: '#1a1410', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </>

      {error && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="step1-cta-row" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button className="book-next-btn" onClick={handleNext}>
          <WandIcon size={14} color="#c8b89a" />
          {booking.pkg?.id === 'office_cleaning' ? 'Continue to scheduling' : 'Continue to your property'}
        </button>
      </div>
    </div>
  );
}