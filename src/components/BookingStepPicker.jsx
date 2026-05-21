import { useState } from 'react';
import { trackEvent } from '../utils/funnelTrack';

const OPTIONS = [
  { id: 'signature',  label: 'Home Cleaning Packages', desc: 'One-off, regular, fortnightly, monthly, and deep cleaning for homes' },
  { id: 'hourly',     label: 'Hourly Cleaning',     desc: 'Flexible cleaning based on the time you book' },
  { id: 'commercial', label: 'Commercial Cleaning',  desc: 'Airbnb turnovers and small office cleaning services' },
];

export default function BookingStepPicker({ onNext, isMobile }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (id) => {
    setSelected(id);
    sessionStorage.setItem('pkgTab', id);
    trackEvent('service_category', { category: id });
    setTimeout(onNext, 150);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .picker-trust-bar { display: none; }
        @media (max-width: 767px) {
          .picker-trust-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; padding: 10px 0 20px; }
          .picker-trust-bar span { font-family: 'Jost', sans-serif; font-size: 11px; color: #1a1410; display: flex; align-items: center; gap: 4px; }
        }
        .picker-option {
          display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
          flex: 1; min-width: 0; padding: 28px 16px 24px; text-align: center;
          border: 2px solid rgba(200,184,154,0.2); border-radius: 8px;
          background: #fdf8f3; cursor: pointer; transition: all 0.2s;
          color: #1a1410; word-break: break-word; min-height: 220px;
        }
        @media (max-width: 767px) {
          .picker-option { padding: 20px 8px 16px; min-height: 150px; }
        }
        .picker-option.sel {
          background: rgba(200,184,154,0.22); border-color: #c8b89a; color: #1a1410;
          box-shadow: 0 2px 10px rgba(200,184,154,0.25);
        }
        .picker-option:hover:not(.sel) {
          border-color: rgba(200,184,154,0.45); background: rgba(200,184,154,0.08);
        }
        .picker-label { min-height: 0; font-size: 13px; }
        .picker-desc { font-size: 13px; }
        @media (min-width: 768px) and (max-width: 1024px) {
          .picker-label { min-height: 48px; }
        }
        @media (max-width: 767px) {
          .picker-label { min-height: 36px; font-size: 10px !important; letter-spacing: 0.03em !important; }
          .picker-desc { font-size: 11px; }
        }
        .picker-next-btn {
          font-family: 'Jost', sans-serif; font-size: 11px; letter-spacing: 0.14em;
          text-transform: uppercase; font-weight: 500; padding: 14px 32px;
          background: #2c2420; color: #f5f0e8; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 10px;
        }
        @media (max-width: 640px) {
          .picker-next-btn { width: 100%; justify-content: center; padding: 16px 24px; }
        }
      `}</style>

      <div className="picker-trust-bar">
        <span><span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> Insured &amp; vetted cleaners</span>
        <span><span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> Satisfaction guarantee</span>
        <span><span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> Same cleaner whenever possible</span>
        <span><span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> 5-star service standard</span>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#1a1410' }}>
          {isMobile ? 'Tap' : 'Click'} a service to continue
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            className={`picker-option${selected === opt.id ? ' sel' : ''}`}
            onClick={() => handleSelect(opt.id)}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 }}>
              <div className="picker-label" style={{ fontFamily: "'Jost',sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.4 }}>
                {opt.label}
              </div>
              <div className="picker-desc" style={{ fontFamily: "'Jost',sans-serif", fontWeight: 300, marginTop: 6, lineHeight: 1.5, color: '#5a4e44' }}>
                {opt.desc}
              </div>
            </div>
            <div style={{ paddingTop: 12, fontSize: 18, color: '#c8b89a', fontWeight: 600 }}>→</div>
          </button>
        ))}
      </div>

    </div>
  );
}
