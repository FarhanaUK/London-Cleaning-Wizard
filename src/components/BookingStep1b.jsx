import { useState } from 'react';
import { PROPERTY_TYPES } from '../data/siteData';
import { validateStep1b } from '../utils/validation';
import { Sparkle, WandIcon } from './Icons';

const LABEL = {
  fontFamily: "'Jost',sans-serif", fontSize: 12, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#5a4e44', marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 7,
};

const CARD = (selected) => ({
  border: selected ? '2px solid #c8b89a' : '2px solid rgba(200,184,154,0.2)',
  background: selected ? 'rgba(200,184,154,0.22)' : '#fdf8f3',
  boxShadow: selected ? '0 2px 10px rgba(200,184,154,0.25)' : 'none',
  padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s',
  position: 'relative',
});

export default function BookingStep1b({ booking, onUpdate, onNext, onBack }) {
  const [error, setError] = useState('');

  const update = (partial) => { onUpdate(partial); setError(''); };

  const handleNext = () => {
    const err = validateStep1b(booking);
    if (err) { setError(err); return; }
    setError('');
    onNext();
  };

  const isHourly = booking.pkg?.isHourly;
  const isOffice = booking.pkg?.id === 'office_cleaning';
  const allSizes = booking.pkg?.sizes || [];
  const sizes = booking.propertyType === 'house'
    ? allSizes.filter(s => s.id !== 'studio')
    : allSizes;

  return (
    <div>
      <style>{`
        .book-next-btn { font-family:'Jost',sans-serif; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; font-weight:500; padding:14px 32px; background:#2c2420; color:#f5f0e8; border:none; cursor:pointer; display:flex; align-items:center; gap:10px; }
        @media (max-width:640px) {
          .book-next-btn { width:100%; justify-content:center; padding:16px 24px; }
          .step-heading { margin-top: 24px; }
        }
        @media (min-width:641px) and (max-width:1024px) {
          .book-next-btn { width:100%; justify-content:center; }
        }
      `}</style>

      <div className="step-heading" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#1a1410', marginBottom: 4 }}>
        Your property
      </div>
      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b7355', fontWeight: 300, marginBottom: 24 }}>
        Tell us about the property we will be cleaning
      </div>

      {/* Property type - not for hourly or office */}
      {!isHourly && !isOffice && (
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

      {/* Size grid - not for hourly or office */}
      {!isHourly && !isOffice && sizes.length > 0 && (
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

      {error && (
        <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {onBack && (
          <button onClick={onBack} style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355', padding: 0 }}>
            Back
          </button>
        )}
        <button className="book-next-btn" onClick={handleNext}>
          <WandIcon size={14} color="#c8b89a" /> Continue to Schedule
        </button>
      </div>
    </div>
  );
}
