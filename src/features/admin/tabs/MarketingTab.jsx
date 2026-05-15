import { useState } from 'react';
import AbandonedTab from './marketing/AbandonedTab';
import LapsedTab    from './marketing/LapsedTab';
import AudienceTab  from './marketing/AudienceTab';
import { FONT }     from './marketing/shared.jsx';

const tabs = [
  { id: 'abandoned', label: 'Abandoned Bookings' },
  { id: 'lapsed',    label: 'Lapsed Customers' },
  { id: 'audience',  label: 'Audience' },
];

export default function MarketingTab({ abandonmentStats, funnelData, bookings, isMobile, C }) {
  const [subTab, setSubTab] = useState('abandoned');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Marketing</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>Track abandonment and re-engage customers who haven't booked recently.</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            fontFamily: FONT, fontSize: 13, fontWeight: subTab === t.id ? 600 : 400,
            color: subTab === t.id ? C.accent : C.muted,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px', borderBottom: subTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'abandoned' && <AbandonedTab abandonmentStats={abandonmentStats} funnelData={funnelData} bookings={bookings} C={C} />}
      {subTab === 'lapsed'    && <LapsedTab bookings={bookings} C={C} />}
      {subTab === 'audience'  && <AudienceTab bookings={bookings} C={C} />}
    </div>
  );
}
