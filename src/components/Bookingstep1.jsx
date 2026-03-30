import { useState } from 'react';
import { PACKAGES, PROPERTY_TYPES, FREQUENCIES, ADDONS } from '../data/siteData';
import { validateStep1 } from '../utils/validation';
import { Sparkle, WandIcon } from './Icons';

// What each package includes — shown in expandable checklist
const PACKAGE_DETAIL = {
  refresh: [
    'All rooms vacuumed and mopped',
    'Kitchen surfaces, hob and sink cleaned',
    'Bathroom scrubbed — toilet, basin, shower/bath',
    'Mirrors and glass polished streak-free',
    'Bins emptied and relined',
    'Fresh fragrance finish throughout',
    'Completion photos sent after every clean',
  ],
  standard: [
    'Everything in The Refresh',
    'Linen changed and beds made',
    'Inside microwave cleaned',
    'Skirting boards and light switches wiped',
    'Same dedicated cleaner every visit',
    'Arrival text 30 minutes before',
    'Completion photos sent after every clean',
  ],
  grand: [
    'Everything in The Standard',
    'Two-person team for faster, thorough coverage',
    'Full turndown service',
    'Priority time slot — protected for you',
    'Inside all kitchen appliances',
    'Deep vacuum including under furniture',
    'Completion photos sent after every clean',
  ],
  deep: [
    'Full interior oven clean — racks, door, casing',
    'Inside fridge and freezer',
    'Inside all kitchen cupboards',
    'Behind and underneath all appliances',
    'Limescale removal — taps, showerheads, tiles',
    'All rooms vacuumed, mopped, and wiped down',
    'Detailed photo report sent on completion',
  ],
  eot: [
    'Letting agent and landlord standard clean',
    'Full oven, fridge, and cupboard clean included',
    'Limescale removal throughout',
    'Windows cleaned inside',
    'Detailed photo report for your landlord',
    'Free re-clean if any issues raised within 48hrs',
    'Deposit-back guarantee',
  ],
  movein: [
    'Property cleaned before your arrival',
    'All surfaces disinfected and sanitised',
    'Beds made up with fresh linen',
    'Kitchen and bathrooms hotel-ready',
    'Welcome kit left for you',
    'Completion photos sent before you arrive',
  ],
  airbnb: [
    'Guest-ready turnaround between every booking',
    'Beds made with fresh linen',
    'Bathrooms and kitchen fully cleaned',
    'Restock of toiletries if supplied',
    'Bins emptied and fresh liners fitted',
    'Completion photo sent directly to you',
    'Same-day availability where possible',
  ],
};

const LABEL = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.2em',
  textTransform: 'uppercase', color: '#8b7355', marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 7,
};

const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', fontWeight: 500, padding: '14px 32px',
  background: '#2c2420', color: '#f5f0e8', border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
};

const CARD = (selected) => ({
  border: selected ? '1px solid #c8b89a' : '1px solid rgba(200,184,154,0.3)',
  background: selected ? 'rgba(200,184,154,0.06)' : 'transparent',
  padding: '16px 18px', cursor: 'pointer', transition: 'all 0.2s',
  position: 'relative',
});

export default function BookingStep1({ booking, onUpdate, onNext }) {
  const [error,      setError]      = useState('');
  const [expanded,   setExpanded]   = useState(null); // which package is expanded

  const handleNext = () => {
    const err = validateStep1(booking);
    if (err) { setError(err); return; }
    setError('');
    onNext();
  };

  const handlePackageSelect = (pkg) => {
    onUpdate({ pkg, size: null, sizePrice: 0, freq: null, addons: [] });
  };

  const toggleExpand = (e, pkgId) => {
    e.stopPropagation(); // don't trigger card select
    setExpanded(prev => prev === pkgId ? null : pkgId);
  };

  const sizes = booking.isAirbnb
    ? PACKAGES.find(p => p.id === 'airbnb')?.sizes || []
    : booking.pkg?.sizes || [];

  return (
    <div>
      {/* Airbnb toggle */}
      <div
        onClick={() => onUpdate({
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
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 400, color: '#1a1410' }}>
                      {pkg.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: '#c8b89a' }}>
                        from £{pkg.sizes[0].basePrice}
                      </div>
                      {pkg.popular && (
                        <div style={{
                          background: '#c8b89a', color: '#1a1410',
                          fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                          padding: '3px 10px',
                        }}>Most Popular</div>
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
                      {(PACKAGE_DETAIL[pkg.id] || []).map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                          marginBottom: 6,
                        }}>
                          <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, lineHeight: 1.5 }}>
                            {item}
                          </span>
                        </div>
                      ))}
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
                onClick={() => onUpdate({ propertyType: type.id })}
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
              return (
                <div
                  key={size.id}
                  onClick={() => onUpdate({ size, sizePrice: size.basePrice })}
                  style={CARD(booking.size?.id === size.id)}
                >
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: '#1a1410', marginBottom: 4 }}>
                    {size.label}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#c8b89a' }}>
                    £{displayPrice}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 24 }}>
            {FREQUENCIES.map(freq => (
              <div
                key={freq.id}
                onClick={() => onUpdate({ freq })}
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
            {ADDONS.map(addon => {
              const selected = (booking.addons || []).some(a => a.id === addon.id);
              return (
                <div
                  key={addon.id}
                  onClick={() => {
                    const current = booking.addons || [];
                    const next = selected
                      ? current.filter(a => a.id !== addon.id)
                      : [...current, addon];
                    onUpdate({ addons: next });
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
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#c8b89a', flexShrink: 0 }}>
                    +£{addon.price}
                  </div>
                </div>
              );
            })}
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