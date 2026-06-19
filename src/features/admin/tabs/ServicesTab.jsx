const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const Section = ({ title, subtitle, children, C }) => (
  <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, overflow: 'hidden' }}>
    <div style={{ padding: '14px 24px', borderBottom: `2px solid ${C.border}`, background: C.bg }}>
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted }}>{title}</div>
      {subtitle && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{subtitle}</div>}
    </div>
    <div style={{ padding: '20px 24px' }}>{children}</div>
  </div>
);

const Row = ({ label, value, note, C, last }) => (
  <div style={{ display: 'flex', gap: 16, paddingBottom: last ? 0 : 12, marginBottom: last ? 0 : 12, borderBottom: last ? 'none' : `1px solid ${C.border}`, flexWrap: 'wrap' }}>
    <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, minWidth: 200 }}>{label}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{value}</div>
      {note && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>{note}</div>}
    </div>
  </div>
);

const GroupHeader = ({ label, C }) => (
  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.accent, marginBottom: 14, marginTop: 4, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>{label}</div>
);

export default function ServicesTab({ isMobile, C }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>Services</div>
      <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 20 }}>Overview of all service types offered by London Cleaning Wizard.</div>

      {/* RESIDENTIAL */}
      <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10, marginTop: 8 }}>Residential</div>
      <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 14 }}>Booked by customers via the external booking form.</div>

      <Section title="Signature Touch" subtitle="Premium residential clean" C={C}>
        <Row C={C} label="What it is" value="Our flagship residential clean. Includes everything in the Essential Reset plus premium extras: microwave interior, descaling taps, limescale treatment on tiles and glass, inside windows, and detailed attention to high-touch surfaces." />
        <Row C={C} label="Frequency" value="Weekly, fortnightly, or monthly" />
        <Row C={C} label="Booking" value="Customer self-books via external booking form" />
        <Row C={C} label="Pricing" value="Based on property size and type (flat/house). Discounts apply for weekly and fortnightly frequency." />
        <Row C={C} label="Add-ons available" value="Inside oven, inside fridge, laundry, ironing, balcony" last />
      </Section>

      <Section title="Essential Reset" subtitle="Regular residential clean" C={C}>
        <Row C={C} label="What it is" value="A consistent, thorough recurring clean of all rooms. Dusting, vacuuming, mopping, kitchen surfaces, hob, sink, bathroom sanitising, and general tidying." />
        <Row C={C} label="Frequency" value="Weekly, fortnightly, or monthly" />
        <Row C={C} label="Booking" value="Customer self-books via external booking form" />
        <Row C={C} label="Pricing" value="Based on property size and type. Lower rate than Signature Touch." />
        <Row C={C} label="Add-ons available" value="Inside oven, inside fridge, inside windows, laundry, ironing, balcony" last />
      </Section>

      <Section title="Deep Clean" subtitle="One-off residential" C={C}>
        <Row C={C} label="What it is" value="A full top-to-bottom clean going beyond the regular service. Inside appliances, behind furniture, grout scrubbing, limescale, skirting boards, and hard-to-reach areas." />
        <Row C={C} label="Frequency" value="One-off. Can be used as a seasonal top-up or before/after a tenancy." />
        <Row C={C} label="Booking" value="Customer self-books via external booking form" />
        <Row C={C} label="Pricing" value="Based on property size and type. Higher rate than regular clean due to extra time." />
        <Row C={C} label="Add-ons available" value="Inside oven, inside fridge, inside windows, balcony" last />
      </Section>

      {/* COMMERCIAL / AIRBNB - ONE-OFF (EXTERNAL) */}
      <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10, marginTop: 20 }}>Commercial and Airbnb (One-off, External Booking Form)</div>
      <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 14 }}>Customers self-book these via the external booking form. Slightly higher price than the contract/recurring equivalents.</div>

      <Section title="Commercial One-Off" subtitle="Single visit, customer self-books" C={C}>
        <Row C={C} label="What it is" value="A standalone commercial clean booked directly by the customer. Covers office or commercial space for a single visit." />
        <Row C={C} label="Frequency" value="One-off only" />
        <Row C={C} label="Booking" value="Customer self-books via external booking form. No contract, no recurring schedule." />
        <Row C={C} label="Pricing" value="Slightly higher rate than the contract equivalent to reflect the one-off nature." />
        <Row C={C} label="Do not confuse with" value="Commercial contract (QuotesTab) — that is a separate service entirely, admin-managed only." last />
      </Section>

      <Section title="Airbnb One-Off" subtitle="Single turnaround clean, customer self-books" C={C}>
        <Row C={C} label="What it is" value="A single turnaround clean between guest stays. Linen change, restocking, full clean to hotel standard." />
        <Row C={C} label="Frequency" value="One-off per booking. No fixed schedule." />
        <Row C={C} label="Booking" value="Customer self-books via external booking form." />
        <Row C={C} label="Pricing" value="Slightly higher rate than Airbnb recurring (QuotesTab) to reflect the one-off nature." />
        <Row C={C} label="Do not confuse with" value="Airbnb recurring (QuotesTab) — that is a scheduled service managed by admin." last />
      </Section>

      {/* ADMIN / QUOTES TAB ONLY */}
      <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10, marginTop: 20 }}>Commercial Contract and Airbnb Flexible (Quotes Tab — Admin Only)</div>
      <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 14 }}>These are not available on the external booking form. Created and managed by admin through the Quotes tab only.</div>

      <Section title="Airbnb Flexible" subtitle="On-demand per-visit Airbnb cleans — Quotes tab only" C={C}>
        <Row C={C} label="What it is" value="Ongoing turnaround cleans for an Airbnb or short-let property booked on demand — no fixed schedule. The host contacts you each time a guest checks out. Each visit is logged individually against the same client record." />
        <Row C={C} label="Frequency" value="Flexible — on demand per guest checkout. No fixed schedule." />
        <Row C={C} label="System identifier" value="frequency: flexible" note="Stored in the database as 'flexible' to distinguish from the one-off Airbnb booked via the external form." />
        <Row C={C} label="Booking" value="Admin creates the first visit via QuotesTab. All subsequent visits are added via Add New Visit on the existing booking in the Bookings tab." />
        <Row C={C} label="Pricing" value="Lower rate than Airbnb one-off (external form). Calculated via Quotes tab." />
        <Row C={C} label="Do not confuse with" value="Airbnb one-off (external form) — that is a single visit self-booked by the customer, stored as frequency: one-off." last />
      </Section>

      <Section title="Commercial Contract" subtitle="Long-term contract — Quotes tab only" C={C}>
        <Row C={C} label="What it is" value="A long-term cleaning contract for offices, retail, or commercial premises. Covers general office areas, kitchens, bathrooms, and common spaces on a set weekly schedule." />
        <Row C={C} label="Frequency" value="2x per week or 3x per week. Specific days selected at quote stage." />
        <Row C={C} label="Contract length" value="3 months, 6 months, or 12 months. Longer terms receive a discount." />
        <Row C={C} label="Booking" value="Admin creates via QuotesTab only. Generates a master contract document and individual visit records." />
        <Row C={C} label="Pricing" value="Calculated from floor area (sqm), intensity, number of cleaners, cleaner rate, overhead, and margin. Add-ons are on top of the base contract value." />
        <Row C={C} label="Payment" value="First month via payment link sent to customer. Subsequent months auto-charged on the monthly anniversary." />
        <Row C={C} label="Calendar" value="Each visit gets its own Google Calendar event. Deleting the contract removes all visit events." />
        <Row C={C} label="Do not confuse with" value="Commercial one-off (external form) — completely different booking type, pricing, and flow." last />
      </Section>
    </div>
  );
}
