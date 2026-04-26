const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export default function DoNotContactToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: value ? '#fef2f2' : '#f0fdf4', borderRadius: 6, marginBottom: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: value ? '#991b1b' : '#166534' }}>
          {value ? '✕ Do Not Contact' : '✓ OK to Contact'}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: value ? '#b91c1c' : '#15803d', marginTop: 2 }}>
          {value ? 'This customer has opted out of marketing.' : 'This customer is happy to receive updates.'}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '6px 12px', background: value ? '#fee2e2' : '#dcfce7', color: value ? '#991b1b' : '#166534', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        {value ? 'Mark OK' : 'Mark DNC'}
      </button>
    </div>
  );
}
