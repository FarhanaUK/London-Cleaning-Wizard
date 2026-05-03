import { useState } from 'react';
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
  border: selected ? '2px solid #c8b89a' : '1px solid rgba(200,184,154,0.35)',
  background: selected ? 'rgba(200,184,154,0.22)' : '#fdf8f3',
  boxShadow: selected ? '0 2px 10px rgba(200,184,154,0.25)' : 'none',
  padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s',
  position: 'relative',
});

export default function BookingStep1({ booking, onUpdate, onNext }) {
  const [error,      setError]      = useState('');
  const [expanded,   setExpanded]   = useState(null); // which package is expanded

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

  const toggleExpand = (e, pkgId) => {
    e.stopPropagation(); // don't trigger card select
    setExpanded(prev => prev === pkgId ? null : pkgId);
  };

  const allSizes = booking.isAirbnb
    ? PACKAGES.find(p => p.id === 'airbnb')?.sizes || []
    : booking.pkg?.sizes || [];
  const sizes = booking.propertyType === 'house'
    ? allSizes.filter(s => s.id !== 'studio')
    : allSizes;

  return (
    <div>
      <style>{`
        @keyframes twinkle1 { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }
        @keyframes twinkle2 { 0%,100% { opacity:1; transform:scale(1.2); } 50% { opacity:0.4; transform:scale(0.9); } }
        @keyframes twinkle3 { 0%,100% { opacity:0.6; transform:scale(1); } 60% { opacity:1; transform:scale(1.4); } }
      `}</style>
      {/* Airbnb toggle */}
      <div
        onClick={() => update({
          isAirbnb: !booking.isAirbnb,
          pkg: !booking.isAirbnb ? PACKAGES.find(p => p.id === 'airbnb') : null,
          size: null, sizePrice: 0, addons: [],
        })}
        style={{
          display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px',
          border: booking.isAirbnb ? '1px solid #c8b89a' : '1px solid rgba(200,184,154,0.25)',
          background: booking.isAirbnb ? 'rgba(200,184,154,0.06)' : 'transparent',
          cursor: 'pointer', marginBottom: 24,
        }}
      >
        <div style={{
          width: 38, height: 22, borderRadius: 11, position: 'relative',
          background: booking.isAirbnb ? '#c8b89a' : 'rgba(200,184,154,0.2)',
          transition: 'background 0.2s', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: booking.isAirbnb ? 17 : 3,
            width: 16, height: 16, background: 'white',
            borderRadius: '50%', transition: 'left 0.2s',
          }} />
        </div>
        <div>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420', fontWeight: 500 }}>
            This is an Airbnb or short-let property
          </div>
          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#8b7355', fontWeight: 300 }}>
            Switches to guest-ready turnaround with photo report
          </div>
        </div>
      </div>

      {/* Package cards */}
      {!booking.isAirbnb && (
        <>
          <div style={LABEL}><Sparkle size={7} color="#c8b89a" /> Select Package</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {PACKAGES.filter(p => p.id !== 'airbnb').map(pkg => (
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
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#6b5e56', fontWeight: 300, marginBottom: 10, lineHeight: 1.6 }}>
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
                            <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
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
                                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
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
        </>
      )}

      {/* Property type */}
      {(booking.pkg || booking.isAirbnb) && (
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

      {/* Size grid */}
      {sizes.length > 0 && (
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
      {booking.pkg?.showFreq && !booking.isAirbnb && (
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
      {booking.pkg?.showAddons && !booking.isAirbnb && (
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
      {(booking.pkg || booking.isAirbnb) && (
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

      <button style={BTN} onClick={handleNext}>
        <WandIcon size={14} color="#c8b89a" /> Continue to Schedule
      </button>
    </div>
  );
}