export const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export function statCard(label, value, sub, C) {
  return (
    <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', minWidth: 120 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
