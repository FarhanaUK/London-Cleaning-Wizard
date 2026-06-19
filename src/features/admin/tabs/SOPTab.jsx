const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const Section = ({ title, children, C }) => (
  <div style={{ background: C.card, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16, overflow: 'hidden' }}>
    <div style={{ padding: '14px 24px', borderBottom: `2px solid ${C.border}`, background: C.bg }}>
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted }}>{title}</div>
    </div>
    <div style={{ padding: '20px 24px' }}>{children}</div>
  </div>
);

const Row = ({ label, value, note, C }) => (
  <div style={{ display: 'flex', gap: 16, paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
    <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, minWidth: 200 }}>{label}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{value}</div>
      {note && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  </div>
);

export default function SOPTab({ isMobile, C }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text, marginBottom: 20 }}>Standard Operating Procedures</div>

      <Section title="Pay" C={C}>
        <Row C={C} label="Pay cycle" value="Weekly: Sunday to Saturday" note="Each pay week runs from Sunday through to Saturday." />
        <Row C={C} label="Payday" value="Friday following the end of the pay week" note="Example: work done 19 Apr – 25 Apr (Sat) is paid on Friday 1 May." />
        <Row C={C}
          label="Pay rate"
          value="Set per subcontractor (see Staff tab)"
          note="Each cleaner is self-employed and has an agreed hourly rate on their profile. Hours are logged via actual start and finish times on each job. They handle their own tax and National Insurance. You do not run payroll or deduct anything from their pay."
        />
        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginTop: 4 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pay week examples</div>
          {[
            { week: '19 Apr – 25 Apr', payday: 'Fri 1 May' },
            { week: '26 Apr – 2 May',  payday: 'Fri 8 May' },
            { week: '3 May – 9 May',   payday: 'Fri 15 May' },
          ].map(({ week, payday }) => (
            <div key={week} style={{ display: 'flex', gap: 16, fontFamily: FONT, fontSize: 13, marginBottom: 6 }}>
              <div style={{ color: C.text, minWidth: 180 }}>{week}</div>
              <div style={{ color: C.muted }}>→ paid {payday}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Expenses" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, marginBottom: 16, lineHeight: 1.6 }}>
          The Expenses page tracks all the money going <strong>out</strong> of the business. It has two tabs:
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 8 }}>Variable tab: one-off or irregular spending</div>
        {['Things like cleaning supplies, fuel, equipment purchases, marketing spend.', 'Log each expense with a date, category, amount, and who paid.', 'If someone paid out of their own pocket, mark it as "Personal: Reimbursable" so you know to pay them back.', 'For mileage, use the built-in calculator (HMRC rate: 45p/mile).', 'Filter by month and category, and export to CSV for your accountant.'].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 8px' }}>Direct Debits tab: recurring monthly/yearly payments</div>
        {['Things like insurance, phone bill, software subscriptions.', 'Mark them monthly or yearly. Shows what was actually paid each month.', 'Shows your total recurring payments per month at a glance.'].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 8px' }}>Dashboard KPIs</div>
        {['This month vs last month spending.', 'Year to date total.', 'Reimbursable: money owed back to staff or yourself.'].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginTop: 12, fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <strong style={{ color: C.text }}>Note:</strong> Don't log individual supplies here. Just log the total purchase amount (e.g. "£45 at Costco"). Use the <strong style={{ color: C.text }}>Supplies tab</strong> to track stock levels and reorder points.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Why separate direct debits and variable costs?</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          <strong>Direct debits</strong> are the same every month regardless of how busy you are: insurance, phone bill, software subscriptions. You set them once and forget them. They tell you your minimum monthly outgoing before you've done a single job.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Variable costs</strong> change month to month depending on activity: supplies, fuel, equipment. Some months you spend £20, others £200.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 8 }}>The reason to separate them is so you can answer questions like:</div>
        {[
          '"Even if I do zero jobs this month, I need to cover £X" → that\'s your direct debits.',
          '"The more jobs I do, the more I spend on X" → that\'s your variable costs.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5, fontStyle: 'italic' }}>{item}</div>
          </div>
        ))}
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Together they give you a clearer picture of your actual profit margin, useful when the Reports tab is built out.
        </div>
      </Section>

      <Section title="Profit & Loss (P&L)" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>
          The <strong>P&L tab</strong> in Expenses shows your revenue minus your costs = your actual profit for the month or tax year. It's the single most important number in the business.
        </div>
        {[
          { label: 'Revenue',               desc: 'Money coming in from bookings in that period.' },
          { label: 'Subcontractor costs',   desc: 'Payments to self-employed cleaners, calculated from actual job start/finish times times their agreed rate. They are not employees; they handle their own tax and NI.' },
          { label: 'Variable costs',        desc: 'What you logged in the Variable tab for that period: supplies, fuel, equipment etc.' },
          { label: 'Direct debits',          desc: 'Your recurring payments (insurance, software etc). What was actually paid in that period.' },
          { label: 'Net profit',            desc: 'Revenue minus all costs. This is what you actually made.' },
          { label: 'Profit margin',         desc: 'Net profit as a percentage of revenue. Higher is better.' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: 16, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, minWidth: 140 }}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, flex: 1 }}>{desc}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Margin Analysis</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          The P&L breakdown card shows two health indicators at a glance:
        </div>
        {[
          {
            label:  'Subcontractor cost as % of revenue',
            detail: 'Shows how much of every pound earned is going on subcontractor payments. Displayed in purple normally, turns red if it goes above 40%.',
            rule:   'Target: keep below 40%. If subcontractor costs are eating more than 40p of every £1 you earn, either pricing needs to go up or job efficiency needs to improve.',
          },
          {
            label:  'Net margin %',
            detail: 'Shows what percentage of revenue is actual profit after all costs.',
            rule:   'Green = 20% or above (healthy). Amber = 0–19% (watch it). Red = negative (you are losing money on this period).',
          },
        ].map(({ label, detail, rule }) => (
          <div key={label} style={{ marginBottom: 14, padding: '12px 16px', background: C.bg, borderRadius: 8, borderLeft: '3px solid #1e40af' }}>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>{detail}</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: '#1e40af' }}>{rule}</div>
          </div>
        ))}

        <div style={{ background: C.bg, borderRadius: 8, padding: '10px 14px', marginTop: 4, fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          The chart shows revenue (green) vs total costs (red, including labour) for every month of the current tax year (6 Apr – 5 Apr). Future months are faded out. Use it to spot months where spending crept too high relative to revenue.
        </div>
      </Section>

      <Section title="Tax & HMRC" C={C}>
        <Row C={C} label="UK tax year" value="6 April to 5 April the following year" note="Example: the 2025/26 tax year runs from 6 Apr 2025 to 5 Apr 2026. Self-assessment deadline is 31 Jan the year after." />
        <Row C={C}
          label="Self-assessment"
          value="File annually via HMRC Self Assessment (SA103 form)"
          note="As a self-employed business you must declare your income and allowable expenses each tax year. The deadline is 31 January, roughly 21 months after the tax year starts. Example: 2026/27 tax year (ends 5 Apr 2027), file by 31 Jan 2028. Your accountant can do this for you."
        />
        <Row C={C} label="Mileage rate" value="45p per mile for the first 10,000 miles · 25p per mile after" note="This is the HMRC approved mileage rate for cars. Use the mileage calculator in the Variable Expenses tab: it applies 45p automatically." />
        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official HMRC mileage rates</div>
          <a href="https://www.gov.uk/government/publications/rates-and-allowances-travel-mileage-and-fuel-allowances/travel-mileage-and-fuel-rates-and-allowances"
            target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: FONT, fontSize: 12, color: '#1e40af', wordBreak: 'break-all' }}>
            gov.uk — Travel mileage and fuel rates and allowances
          </a>
        </div>
        <Row C={C}
          label="HMRC Summary tab"
          value="Found inside the Expenses page"
          note="At tax return time, go to Expenses → HMRC tab. It maps all your expenses to the correct SA103F boxes (Boxes 18–30) and gives you a single total for Box 31 (Total allowable expenses) to copy into your tax return."
        />
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', fontFamily: FONT, fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
          <strong>Tip:</strong> Log all your expenses throughout the year. Don't wait until January. The HMRC tab will do the maths for you automatically.
        </div>
      </Section>

      <Section title="Converting a One-Off Customer to Recurring" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          If a customer completes a one-off clean and then contacts you to start a recurring service, you can convert them without making them pay the full first-clean price again. Their most recent one-off counts as the first clean, and all future recurring cleans are priced at the recurring discount rate.
        </div>
        <Row C={C} label="Qualifying window" value="Within 30 days of their last completed one-off clean" note="After 30 days the conversion offer expires and they would need to book a new first clean at full price." />
        <Row C={C} label="Automatic email" value="Sent automatically on day 5 after their one-off is marked complete" note="The email tells them how many days they have left to qualify and shows the discounted recurring price. No action needed from you: it sends itself." />
        <Row C={C} label="Eligibility: when the button appears" value="All 3 conditions must be met" note="1. The customer has no active recurring arrangement already running. 2. They have at least one booking marked as fully paid (not just deposit paid). 3. That fully paid booking is a one-off (not already recurring) and the clean date was within the last 30 days. If any condition is not met, the Convert to Recurring button will not appear. This is by design. The system only shows it when the customer is genuinely eligible." />
        <Row C={C} label="How to convert" value="Go to Customers tab → find the customer → click Convert to Recurring" note="The button only appears when the customer is eligible (see above). Pick the package, frequency, preferred time, and the date for their first recurring clean. The system creates the booking at the discounted price and updates their profile." />
        <Row C={C} label="Payment on first recurring clean" value="Auto-charged on completion, no new deposit required" note="The customer already paid in full for their one-off. Their saved card is charged automatically when the first recurring clean is marked complete, the same as any subsequent recurring clean." />
        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginTop: 4, fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <strong style={{ color: C.text }}>Note:</strong> For this to work the customer must have a saved card on file from their one-off payment. If they paid by cash or bank transfer, you will need to take card details separately before converting.
        </div>
      </Section>

      <Section title="Changing a Recurring Customer's Clean Day" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          If a recurring customer wants to move their clean to a different day of the week (e.g. from every Monday to every Friday), you can update all future bookings in one action without cancelling or rebuilding the series.
        </div>
        <Row C={C} label="Step 1" value="Go to Bookings tab and find any upcoming booking in their recurring series" note="It does not matter which one. Just pick the next scheduled one." />
        <Row C={C} label="Step 2" value="Click Edit Booking and change the date to the new day" note="For example, if they want to move from Monday 12th to Friday, change the date to Friday 16th. The system uses the day of the week you pick, not the exact date." />
        <Row C={C} label="Step 3" value='In the "Apply changes to" selector choose "This and all future bookings"' note="This is the key step. If you only choose This booking only, only that one date changes." />
        <Row C={C} label="Step 4" value="Save: all future bookings shift to the new day" note="Every upcoming booking in the series is moved to the equivalent day in its own week. Their customer profile is also updated so the scheduler creates all new bookings on the correct day going forward." />
        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginTop: 4, fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <strong style={{ color: C.text }}>Note:</strong> This also works for changing the time. Change the date and/or time in the edit form, select This and all future bookings, and both the day and time will update across all upcoming bookings.
        </div>
      </Section>

      <Section title="Business & Airbnb Enquiries: Quote to Booking" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>
          This process covers two distinct client types handled through the internal Quotes tab — <strong>not</strong> the public website booking form.
        </div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: FONT, fontSize: 12, color: C.text }}><strong>Airbnb / Short-let hosts (Airbnb Flexible)</strong> — on-demand, per-turnaround. No contract, no fixed schedule. The host contacts you when a guest checks out and they need a clean. You book each visit individually. First visit is booked via the Quotes tab ("Book first visit"). Every subsequent visit uses the "Add New Visit" button on that same booking — no need to re-enter their details. Stored in the system as frequency "flexible". Not the same as an Airbnb one-off booked by a customer via the external booking form (those are frequency "one-off").</div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: C.text }}><strong>Commercial / office clients</strong> — contract-based with a fixed frequency (weekly, fortnightly, etc.). These go through the full contract flow in the Quotes tab with a start date, contract length, and auto-generated visit schedule.</div>
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Step 1: Receive the enquiry</div>
        {[
          'Quote form (/quote): the client fills in property details, frequency, and any notes. You will receive this by email. Review it and respond within a few hours.',
          'Phone: take notes during the call. Do not quote on the spot until you have all the information below.',
          'Email: reply to acknowledge within a few hours. Ask for the details below before quoting.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Step 2: Gather the information</div>
        {[
          'Name, email address, and phone number.',
          'Property address and postcode. Confirm it is within our coverage area.',
          'Type of property: Airbnb / short-let or office / commercial.',
          'Property size: number of bedrooms (Airbnb) or rough square footage and number of rooms (office).',
          'For offices: preferred frequency (weekly, fortnightly, monthly) and preferred day(s) and time.',
          'For Airbnb: typical checkout time and check-in window — this determines how much turnaround time you have.',
          'Access method: key, lockbox code, host/manager present, concierge, or management company.',
          'Any special requirements: specific focus areas, products to avoid, items not to touch.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Step 3: Request photos or video (if needed)</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          Always ask for photos or video if the property is a large office, an unusually sized space, or the client's description is vague. Ask them to send to bookings@londoncleaningwizard.com.
        </div>
        {[
          'Review photos before confirming or quoting. If the property looks significantly worse than described, adjust the price upward or decline.',
          'Right to refuse on the day: if the cleaner arrives and the property is nothing like described (far dirtier, bigger, or a different scope entirely) the clean can be refused. In that case the deposit is kept to cover the call-out. This must be communicated clearly to the client upfront.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Step 4: Quote</div>
        {[
          'Airbnb Turnaround (fixed): Studio £95 · 1-bed £120 · 2-bed £155 · 3-bed £195 · 4-bed £250.',
          'Airbnb & Serviced Apartments (hourly): £35/hr · minimum 2 hours · from £70.',
          'Office Cleaning (hourly): £35/hr · minimum 3 hours · from £105. Estimate hours based on size and scope. When in doubt, round up slightly.',
          'There are no recurring discounts for commercial or Airbnb bookings.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Step 5: Create the booking and send payment link</div>
        {[
          'Once the client agrees: go to the Quotes tab in admin. Fill in all property details and select the correct property type (Airbnb or Commercial).',
          'Use the pricing calculator to confirm your rate. Then click "Book first visit" (Airbnb) or "Book this contract" (Commercial) to create the booking.',
          'A deposit is required to confirm. Send a payment link from the booking. Do not schedule the cleaner until payment is received.',
          'For Airbnb hosts: confirm the guest checkout time and check-in window so the cleaner knows how long they have for the turnaround.',
          'For offices: confirm the exact access method and out-of-hours entry procedure in writing (email is fine).',
          'For subsequent Airbnb visits: open the existing booking in the Bookings tab and click "Add New Visit" — just pick the date and time, everything else carries over.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Step 6: Day of the clean</div>
        {[
          'Cleaner takes before photos on arrival.',
          'Completes the agreed scope of work.',
          'Takes completion (after) photos. Essential for Airbnb: send the completion photo to the host immediately after.',
          'Marks the job complete in the My Jobs tab. This triggers automatic final payment.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Step 7: After the clean, offer recurring</div>
        {[
          'If the client is happy, follow up and offer to become their regular cleaner.',
          'Airbnb hosts: let them know they can contact you any time a guest checks out. You will add each new visit via "Add New Visit" on their existing booking — same cleaner, same rate, no paperwork.',
          'Offices: offer weekly or fortnightly recurring on a contract. Use the Quotes tab to set up the contract if not already done.',
          'Commercial contract clients are billed monthly based on completed visits. No deposit from the second clean onwards.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Airbnb Add-on: Restocking Handling Fee</div>
        {[
          'The restocking service has two separate parts: the £12 handling fee and the supply cost recharge. These are tracked differently.',
          'Handling fee (£12): added as an add-on at the time of booking via the Quotes tab. It is included in the booking total and counts as normal revenue. It covers the cleaner\'s time sourcing and placing supplies.',
          'Supply cost recharge: the actual cost of goods (toiletries, coffee pods, bin bags, etc.) invoiced to the host separately at receipt price. No markup on goods.',
          'Before each visit: confirm with the host exactly what needs restocking. Get the list in writing (WhatsApp or email). Never guess.',
          'For small items (toilet paper, soap, washing-up liquid): the cleaner buys them and keeps the receipt. After the visit, enter the total supply cost in the booking panel under "Restocking Service — Supply Recharge" and send a separate invoice to the host.',
          'For bulky or expensive items (branded toiletries, welcome gifts): ask the host to send supplies directly to the cleaner before the visit. The £12 handling fee still applies. No supply recharge needed since you did not purchase anything.',
          'When the host pays the supply recharge: open the booking panel and click "Mark as Paid" next to the restock charge. This moves it from Outstanding to Recovered in your Reports. Do not log anything in the Expenses tab — the cost was fully recovered, so it is not a business expense.',
          'If the host never pays: log the supply cost in the Expenses tab under "Client Restock Premium Service". This records it as a real loss to your business and it will appear under Box 18 in your HMRC summary.',
          'Reports tab: the "Restock Supply Recharges" card shows all outstanding (unpaid) restock recharges across all time, and what was recovered in the selected period. Use the Outstanding figure to chase any unpaid hosts.',
          'When adding a new visit: always confirm with the host whether restocking is needed for that visit. Add or remove the add-on accordingly before creating the visit.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: '#fef9ef', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginTop: 8, fontFamily: FONT, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong>Key rule:</strong> Never confirm a commercial or Airbnb booking without a 30% deposit paid first. Do not schedule a cleaner or block a slot until payment is received. If a client pushes back on the deposit, politely explain it is non-negotiable and covers our costs if the booking is cancelled or the job is misrepresented.
        </div>
      </Section>

      <Section title="Wrong or Incorrect Booking" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          If a customer books the wrong package, date, or property size, follow the steps below depending on whether they have paid their deposit.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Scenario A: No deposit paid</div>
        {[
          'Cancel the incorrect booking in the Bookings tab (change status to Cancelled).',
          'Go to the Customers tab, find the customer, and click New Booking.',
          'Their name, email, phone, address and postcode will be pre-filled automatically.',
          'Select the correct package, size, date and time and save.',
          'Send the customer the new booking confirmation and deposit payment link.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Scenario B: Deposit already paid</div>
        {[
          'Contact the customer to confirm what they actually wanted and agree the correct booking.',
          'Cancel the incorrect booking using the Cancel Booking button in the Bookings tab. The system will handle the refund automatically based on notice given: if the clean date is more than 48 hours away, the deposit is refunded in full with no further action needed. If the clean date is less than 48 hours away, the system will not refund automatically — in that case, manually refund the deposit via Stripe Dashboard before proceeding.',
          'Create the new correct booking from their customer profile (Customers tab → New Booking).',
          'Send the new deposit payment link for the corrected booking.',
          'Add a note on the new booking: "Rebooking — original deposit refunded on [date]."',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: '#fef9ef', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginTop: 8, fontFamily: FONT, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong>Key rule:</strong> Never carry a deposit forward to the replacement booking. The customer pays a fresh deposit on the correct booking. This keeps payment records clean and avoids accounting discrepancies.
        </div>
      </Section>

      <Section title="Marketing Tab" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          The Marketing tab helps you track and recover revenue from two groups: people who started a booking but never paid, and customers who haven't booked in a long time.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Abandoned Bookings</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          Tracks every customer who reached the payment step but did not complete their booking. The system automatically sends them a recovery email 2 hours after they abandon. You can see whether the email was sent and whether they eventually came back and booked.
        </div>
        {[
          'Stats are broken down by today, this week, this month, and this year.',
          'Each row shows the date, package they were looking at, the deposit amount, whether the automated email was sent, and whether they converted.',
          'Converted means they completed a booking after abandoning. Lost means they did not.',
          'You do not need to take any action — the recovery email sends itself. This tab is for visibility only.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Lapsed Customers</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          Shows every customer whose last clean was more than 90 days ago. These are people who used the service but have not come back. Sorted by most recently lapsed so you can prioritise who to reach out to first.
        </div>
        {[
          'Orange badge: lapsed 90–180 days ago. Recently gone quiet — worth a personal follow-up.',
          'Red badge: lapsed 180+ days ago. Long lapsed — lower chance of return but still worth trying.',
          'A re-engagement email goes out automatically to lapsed customers. This tab is for your visibility and any manual follow-up you want to do.',
          'You can search by name or email to find a specific customer.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginTop: 8, fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <strong style={{ color: C.text }}>Note:</strong> Both recovery emails are fully automated. You do not need to manually send anything. Use this tab to monitor performance and spot patterns -- for example, if a particular package has a high abandonment rate, or if lapsed customers tend to drop off after a specific number of cleans.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '24px 0 10px' }}>Booking Funnel Tracking</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>
          The booking funnel tracker records every meaningful action a visitor takes from the moment they land on the booking form until they either pay or drop off. This data lives in the Marketing tab under the Booking Funnel heading. Use it to understand exactly where customers are falling off and why.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>What the 5 steps mean</div>
        {[
          { step: '1 — Landing', desc: 'The service picker. The visitor has opened the booking form and can see the package categories.' },
          { step: '2 — Service', desc: 'Package selection step. The visitor is browsing tabs (Hourly, Signature, Commercial) and selecting a specific package.' },
          { step: '3 — Property', desc: 'Property type and size selection (flat/house, studio/1-bed/2-bed etc.).' },
          { step: '4 — Schedule', desc: 'Frequency (for Signature), date, and time selection.' },
          { step: '5 — Checkout', desc: 'Contact details, add-ons, checkboxes, and payment. This is the final step before a booking is confirmed.' },
        ].map(({ step, desc }, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0, minWidth: 120, fontFamily: FONT, fontSize: 13 }}>{step}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, margin: '16px 0 6px' }}>What is tracked on each session</div>
        {[
          'Every step visited, in order, with direction (forward = progressing, back = went back to change something).',
          'Time spent on each step in seconds -- so you can see if someone stalled on the calendar, spent a long time on checkout, or bounced off the service page immediately.',
          'Every selection made: service category, package name, property type, property size, frequency, date chosen, time chosen.',
          'From/to changes: if a customer goes back and changes something (e.g. changes package from Signature 2-Bed to Signature 3-Bed), the tracker records both the old value and the new value.',
          'Package detail expanded: whether the customer clicked to read the full package description. Useful for knowing if unclear copy is causing hesitation.',
          'Every checkbox state: add-ons toggled (with name), mop acknowledgement, T&Cs accepted, media consent, marketing opt-out.',
          'Every field filled: name, email, phone, address, postcode (first section only e.g. SW3, not the full postcode for privacy), bathroom count, pets yes/no. Only recorded as filled/not filled -- the actual values are not stored except postcode outward code.',
          'Payment attempted: recorded when the customer clicks the pay button, whether or not payment succeeds.',
          'Last action before drop-off: the final event recorded tells you the last thing the customer did before leaving.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, margin: '16px 0 6px' }}>How to use the Booking Funnel table</div>
        {[
          'The table shows one row per visitor session. The Last Step column tells you the furthest step they reached.',
          'Converted = Yes means they completed a booking. Converted = No means they dropped off.',
          'Filter by period (Today / This Week / This Month / This Year) to focus your analysis.',
          'Look for sessions that reached Step 5 (Checkout) but did not convert -- these are the highest-priority drop-offs because the customer was very close to paying.',
          'Sessions that drop off at Step 2 (Service) often indicate the pricing or packages are unclear. Combine this with the package detail expanded column in the CSV to see if they even read the details.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, margin: '16px 0 6px' }}>Downloading a PDF</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          Click the Download PDF button next to the Booking Funnel heading. A new tab opens showing every session for that period laid out exactly like the session log — step timeline, coloured dots, time badges, and site journey. Use your browser's print function (Ctrl+P / Cmd+P) to save as a PDF file.
        </div>
        {[
          'Each session is numbered (#1 = first session of the day, highest number = most recent).',
          'The site journey before booking shows which pages the visitor browsed before opening the booking form, and how long they spent on each page.',
          'The step timeline shows every step visited, time spent, selections made, and where they dropped off.',
          '"went back" badge = the visitor went back to change something. "dropped here" badge = the last step they reached before leaving.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', borderRadius: 6, padding: '12px 16px', marginTop: 12, fontFamily: FONT, fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
          <strong>Tip:</strong> Focus on sessions that reached Step 5 (Checkout) but did not convert — these are the highest-priority drop-offs because the customer was very close to paying. If you see a pattern (e.g. everyone who selected 3-Bed dropped off before paying), that is your actionable insight.
        </div>
      </Section>

      <Section title="Analytics & Tracking Tools" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          Three separate tracking tools are running on your site. Each answers different questions. Here is what each one is, where to find it, what it tells you, and what problems it helps you solve.
        </div>

        {[
          {
            name: 'Google Ads Conversion Tag (AW-18070855826)',
            where: 'Managed inside Google Ads (ads.google.com). Not something you look at directly — it runs silently in the background.',
            purpose: 'Its only job is to tell Google Ads when a booking is completed, so Google can use that signal to optimise who it shows your ads to. Without it, Google Ads would have no idea which ad clicks led to real bookings.',
            tells: [
              'How many conversions your Google Ads have driven (reported inside Google Ads).',
              'Feeds Google\'s Smart Bidding — it uses this data to show your ads to people more likely to book.',
            ],
            solves: [
              'Wasted ad spend — without conversion data, Google would show ads randomly rather than targeting people similar to those who have already booked.',
              'Bid optimisation — Google automatically raises bids for searches more likely to convert and lowers them for searches that don\'t.',
            ],
            color: '#1e40af',
            bg: '#eff6ff',
            border: '#bfdbfe',
          },
          {
            name: 'Google Analytics 4 — GA4 (G-94V706BZBP)',
            where: 'analytics.google.com → London Cleaning Wizard property → Reports.',
            purpose: 'Full site analytics. Tracks every visitor, every page view, and every traffic source across the whole website — not just people who book.',
            tells: [
              'How many people visited your site this week / month / year.',
              'Where they came from: Google Ads (paid), organic Google search, direct (typed the URL), social media, referrals.',
              'Which pages are most visited and how long people spend on them.',
              'Which campaigns and keywords are driving the most traffic.',
              'Whether traffic is growing or shrinking over time.',
            ],
            solves: [
              '"Are my Google Ads actually bringing more people to the site?" — Traffic acquisition report.',
              '"Which pages are people landing on?" — Pages and screens report.',
              '"Is my traffic growing month on month?" — Compare date ranges in any report.',
              '"Are people from Google Ads actually engaging, or just bouncing?" — Engagement metrics by channel.',
            ],
            color: '#15803d',
            bg: '#f0fdf4',
            border: '#bbf7d0',
          },
          {
            name: 'Custom Booking Funnel Tracker (Admin panel → Marketing tab)',
            where: 'Admin panel → Marketing tab → Booking Funnel section.',
            purpose: 'Records every action a visitor takes inside the booking form, step by step, in real time. GA4 can tell you someone visited the booking page — this tracker tells you exactly what they did while they were there.',
            tells: [
              'Which step every visitor dropped off at, and how long they spent on each step.',
              'What they selected: package, property type, frequency, date, add-ons.',
              'Whether they went back and changed something, and what they changed it from and to.',
              'Which fields they filled in before leaving (name, email, phone, postcode area).',
              'The full page journey before they opened the booking form (e.g. Homepage → Deep Cleaning → Booking).',
              'Where they came from before visiting the site (e.g. via google.com).',
            ],
            solves: [
              '"Why are people dropping off in the booking form?" — Session log shows exactly what they did before leaving.',
              '"Who abandoned at checkout and needs a follow-up email?" — Abandonment Events table.',
              '"Are people confused by the package options?" — Check if they expand the package details and then leave.',
              '"Is a specific package causing more drop-offs than others?" — Filter sessions by package selected.',
              '"How long is the booking form taking to complete?" — Time spent per step.',
            ],
            color: '#6d28d9',
            bg: '#f5f3ff',
            border: '#ddd6fe',
          },
        ].map(({ name, where, purpose, tells, solves, color, bg, border }) => (
          <div key={name} style={{ marginBottom: 20, background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>{name}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color, minWidth: 70 }}>Where</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, flex: 1, lineHeight: 1.5 }}>{where}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color, minWidth: 70 }}>Purpose</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, flex: 1, lineHeight: 1.5 }}>{purpose}</div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color, marginBottom: 6 }}>What it tells you</div>
            {tells.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <div style={{ color, fontWeight: 700, flexShrink: 0 }}>·</div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{t}</div>
              </div>
            ))}
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color, margin: '10px 0 6px' }}>Problems it solves</div>
            {solves.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <div style={{ color, fontWeight: 700, flexShrink: 0 }}>·</div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{s}</div>
              </div>
            ))}
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '8px 0 12px' }}>How to use them together</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>
          GA4 tells you there is a problem. The custom tracker tells you exactly where in the booking process it is happening. The conversion tag makes sure your ad spend keeps improving over time.
        </div>
        {[
          'You check GA4 and notice traffic from Google Ads dropped this week.',
          'You check the booking funnel in the admin panel to see if drop-off inside the form also changed, or if people are just not arriving at the booking page at all.',
          'If people are arriving at the booking page but dropping — the problem is the booking form (use the session log to investigate).',
          'If people are not arriving at all — the problem is your ads or landing pages (investigate in GA4 → Traffic acquisition).',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{i + 1}.</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginTop: 12, fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          <strong style={{ color: C.text }}>Note on bots:</strong> Simple bots (scrapers, crawlers) do not execute JavaScript and will not appear in any of these tools. Sophisticated bots that use a full browser may appear in the custom tracker and GA4, but GA4 filters out most known bots automatically. If you see a session that reached Step 1 with no selections and dropped immediately, it could be a real person who bounced, or a bot — a pattern of many identical sessions in a short window is the tell.
        </div>
      </Section>

      <Section title="System Alerts & What To Do" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          This system saves everything to a cloud database (Firebase/Firestore) in real time. If a save fails, you will see an alert pop-up. Below is what each alert means and exactly what to do.
        </div>
        {[
          {
            alert: '"Failed to save time: check your connection and try again."',
            where: 'My Jobs tab → Actual Start / Actual Finish time inputs · Bookings tab → Hours Worked section',
            cause: 'The time was entered but the save to the database failed due to a connection drop or server error. The input will revert to what it was before.',
            fix:   'Check you are online, then re-enter the time. If it keeps failing, note the time on paper and try again once your connection is stable.',
          },
          {
            alert: '"Failed to mark as repaid: check your connection and try again."',
            where: 'Expenses → Variable tab → Mark Repaid button',
            cause: 'Your internet dropped for a moment, or the session timed out.',
            fix:   'Check you are online, refresh the page (you will not lose data, everything is already saved in the database), then try again. If it keeps failing, close the browser and reopen the admin page.',
          },
          {
            alert: '"Failed to update stock: check your connection and try again."',
            where: 'Supplies tab → + / − stock buttons',
            cause: 'Same as above. A brief connection loss prevented the stock number from saving.',
            fix:   'Refresh the page and try again. The stock count shown is what is actually in the database. It will not have changed if the save failed.',
          },
          {
            alert: '"Missing or insufficient permissions."',
            where: 'Any save action (expenses, supplies, staff, bookings)',
            cause: 'You are either not logged in, or your session has expired.',
            fix:   'Scroll to the top and check you are still logged in. If the page shows the login screen, sign back in with your admin email. This happens occasionally after long idle periods.',
          },
          {
            alert: 'Page loads but shows no data (blank lists)',
            where: 'Any tab',
            cause: 'Rare. Usually a temporary Firebase service outage, or your browser is blocking the connection.',
            fix:   'Wait 2–3 minutes and refresh. Check status.firebase.google.com if it persists. Your data is safe in the database and will reappear when the connection restores.',
          },
        ].map(({ alert, where, cause, fix }) => (
          <div key={alert} style={{ marginBottom: 20, padding: '14px 18px', background: C.bg, borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>{alert}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, minWidth: 60 }}>Where</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, flex: 1 }}>{where}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, minWidth: 60 }}>Cause</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, flex: 1 }}>{cause}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#16a34a', minWidth: 60 }}>Fix</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, flex: 1 }}>{fix}</div>
            </div>
          </div>
        ))}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', fontFamily: FONT, fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
          <strong>Your data is safe.</strong> Every booking, expense, and stock entry is saved to the cloud the moment you press save. It does not live on your device. Even if your laptop breaks or your browser crashes, nothing is lost. The only risk is a failed save that was interrupted mid-action, which is why the alerts tell you to retry.
        </div>
      </Section>

      <Section title="Incidents & Damage Reports" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          An incident is any damage, unexpected cost, or customer complaint that requires a formal response. All incidents must be logged in <strong>Expenses &gt; Incidents tab</strong> immediately, even if you are still gathering information. Never manage a damage claim verbally or informally. Every step must be on record.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Log these details every time</div>
        {[
          'Date of the incident (the clean date, not the date it was reported).',
          'Description of the damage or issue.',
          'Booking reference and client name.',
          'Photos from the customer and/or the cleaner.',
          'Amount claimed or estimated cost. Update later if not known at the time.',
          'Notes from the cleaner about what happened.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Scenario A: Customer reports damage to you</div>
        <Row C={C} label="Step 1" value="Receive the call" note="Damage reports must come by phone (per your T&Cs). Note the date, time, what they are describing, and the booking reference. Do not admit liability on the call." />
        <Row C={C} label="Step 2" value="Log it immediately" note="Open Expenses > Incidents tab and create a new entry while you are still on the call or straight after. Set status to Open." />
        <Row C={C} label="Step 3" value="Ask for photos" note="Ask the customer to send photos of the damage to bookings@londoncleaningwizard.com before moving, repairing, or disposing of the item. Explain you need them to investigate. Attach them to the incident record once received." />
        <Row C={C} label="Step 4" value="Contact the cleaner" note="Call the cleaner the same day. Ask for their account of events. Did they notice anything? Did they take before or after photos? Note their response in the incident record." />
        <Row C={C} label="Step 5" value="Acknowledge to the customer" note="Call or email the customer within 2 working days to confirm you have received their report and are investigating. Do not give a decision on this contact. Only confirm you are looking into it." />

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 8px' }}>Scenario B: Cleaner reports damage first</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>
          This is the better scenario. Being proactive gives you full control of the situation before the customer is upset and is one of the most effective ways to keep the relationship intact.
        </div>
        <Row C={C} label="Step 1" value="Log the incident immediately" note="Open Expenses > Incidents tab and create the entry using the cleaner's account. You already have the booking reference, clean date, and description. Set status to Open." />
        <Row C={C} label="Step 2" value="Get photos from the cleaner" note="Ask the cleaner to send photos straight away if they have not already. These are your primary evidence." />
        <Row C={C} label="Step 3" value="Contact the customer proactively" note='Call the customer before they contact you. Say: "Our cleaner let us know there was an incident during your clean today and we want to sort it out for you." Do not wait for them to discover it themselves.' />
        <Row C={C} label="Step 4" value="Ask them to photograph the damage" note="Even though you have the cleaner's photos, ask the customer to photograph the item from their side. This counts as their formal report. The 24-hour reporting window runs from the clean date, not from when they call back." />
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '3px solid #16a34a', borderRadius: 8, padding: '12px 16px', margin: '4px 0 20px', fontFamily: FONT, fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
          <strong>Why this matters:</strong> Customers who hear about damage from you before they discover it themselves are far less likely to escalate or leave a bad review. Being upfront is not an admission of liability. It is good business practice, especially as a new business building a reputation.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '4px 0 10px' }}>Deciding liability</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>
          Give your decision within 5 working days of having all the information (photos, cleaner's account, any inspection needed). Do not delay. Keeping a customer waiting increases frustration and escalation risk.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>Accept liability if:</div>
        {[
          'The damage was clearly caused during the clean. The cleaner confirms it, photos support it, and there is no evidence of pre-existing damage.',
          'The cleaner was in the area where the damage occurred and was using products or equipment that could have caused it.',
          'You cannot reasonably rule it out and the customer relationship is worth protecting.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, margin: '12px 0 6px' }}>Do not accept liability if:</div>
        {[
          'The damage is pre-existing or consistent with normal wear and tear.',
          'The item was already fragile, damaged, or unstable and was not declared to us before the clean.',
          'There is no credible evidence the cleaner was near the item or could have caused the damage.',
          'Photos or the cleaner\'s account directly contradict what the customer is claiming.',
          'The report came in after the 24-hour window with no valid reason for the delay.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Resolution options (when liability is accepted)</div>
        {[
          { label: 'Repair', desc: 'Arrange and pay for the item to be professionally repaired. Get a quote first and agree it with the customer. Best option for furniture, appliances, or anything fixable.' },
          { label: 'Replace', desc: 'Replace with an equivalent item of similar age and condition, not brand new unless the item was brand new. Agree the replacement value with the customer before ordering anything.' },
          { label: 'Compensate', desc: 'Agree a monetary payment that reflects the fair market value of the item at the time of damage. Pay via bank transfer or through Stripe. Log the amount in the incident record.' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ marginBottom: 10, padding: '10px 14px', background: C.bg, borderRadius: 8 }}>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 4, marginTop: 4 }}>
          Once resolution is agreed: update the incident to <strong style={{ color: C.text }}>Pending Payment</strong>. Once paid: update to <strong style={{ color: C.text }}>Closed</strong>. Add the payment date and method in the resolution notes.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>If the customer disputes your decision or is still unhappy</div>
        <Row C={C} label="Step 1" value="Listen without interrupting" note='Let them say what they need to say. Acknowledge: "I understand this is frustrating and I take it seriously." Do not argue on the first call. Give them space to be heard.' />
        <Row C={C} label="Step 2" value="Re-examine the evidence" note="Go back to the photos, the cleaner's account, and the timeline. If the customer raises a valid new point you had not considered, revisit your decision properly." />
        <Row C={C} label="Step 3" value="If your position stands, explain it clearly" note="Reference T&Cs Section 13 (Damage, Liability & Claims). Be firm but polite. Do not make extra offers under pressure if you genuinely do not believe you are liable." />
        <Row C={C} label="Step 4" value="Goodwill gesture (your discretion)" note="If the customer is a recurring client or the amount is small and the relationship is worth keeping, you can offer a partial goodwill payment or a discount on a future clean without accepting full liability. Make clear it is a goodwill gesture, not an admission that we caused the damage." />
        <Row C={C} label="Step 5" value="Put your position in writing" note="Send a brief email summarising your decision, what you have offered, and what you are proposing. This creates a paper trail and often de-escalates the situation because the customer can see the reasoning clearly." />

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>If no resolution can be reached</div>
        {[
          'Stop making verbal offers. All further communication should be in writing from this point so everything is documented.',
          'Advise the customer that if they wish to pursue the matter further, they can seek independent advice through Citizens Advice (citizensadvice.org.uk) or raise a Small Claims Court case for amounts under £10,000.',
          'Do not admit liability in writing and do not make payments just to make a dispute go away if you genuinely do not believe you caused the damage. It sets a precedent.',
          'Keep all evidence: photos, call notes, email threads, the cleaner\'s account. You will need these if the matter escalates.',
          'Notify your insurer if you receive a formal legal letter or a court claim is threatened. Do this before responding further.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: '#fef9ef', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginTop: 12, fontFamily: FONT, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong>14-day no-response rule:</strong> Once you have communicated your resolution offer, if the customer has not responded at all after 14 days, send one final written message: "We have not heard back regarding our proposed resolution. If we do not receive a response by [date 7 days from now], we will consider this matter closed." If there is still no response after that, close the incident in the system. The 14 days only starts once your offer has been sent, not from the incident date. If the customer is actively in dialogue with you at any point, the case stays open.
        </div>
      </Section>

      <Section title="Contract Monthly Payments" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          Monthly contract payments are handled automatically by Stripe once the client has a saved card on file. You do not need to chase invoices manually.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>First payment — required to activate auto-billing</div>
        {[
          'When a contract is created, send the client the payment link from the Bookings tab (expand the contract and use the Payment Link button).',
          'The client pays the first full month via that link. This saves their card to Stripe.',
          'Once their card is saved, all future monthly payments charge automatically — you do not need to send another link.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>7 days before each billing date</div>
        {[
          'The system automatically emails the client a payment reminder showing the amount due and the due date.',
          'The amount includes the fixed monthly base rate plus any add-ons from the previous month (e.g. oven clean, extra rooms).',
          'No action needed from you — this is fully automatic.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>On the billing date</div>
        {[
          'Stripe automatically charges the saved card for the monthly base rate plus any previous month add-ons.',
          'The month is marked as paid in the system and a receipt is emailed to the client.',
          'A bell notification appears in the admin panel on the day payment is due so you can monitor it.',
          'If the charge succeeds, no action is needed. If it fails, the month is marked as Failed in the payment tracker and you will be notified to follow up manually.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 10px' }}>Manual marking</div>
        {[
          'If a client pays by bank transfer instead of card, mark the month as paid manually in the Bookings tab by expanding the contract and ticking the period.',
          'Manual marking sends the same receipt email to the client.',
          'If no card is saved, the auto-charge is skipped and the month stays unpaid until you mark it manually.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginTop: 4, fontFamily: FONT, fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
          <strong>Reminder template ID:</strong> template_r1jyqjw &nbsp;·&nbsp; <strong>Receipt template ID:</strong> template_pqbq8eb
        </div>
      </Section>

      <Section title="Contract Auto-Renewal" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          Contracts auto-renew at the end of their term. You do not need to contact the customer manually — the system handles it. Here is exactly what happens and when.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>30 days before contract end date</div>
        {[
          'The system automatically sends the customer an email letting them know their contract is due to renew.',
          'The email states: the contract end date, the renewal date, that it will renew on the same terms and price, the deadline to cancel by, and how to cancel (reply to the email or call with their booking reference).',
          'A bell notification appears in the admin panel confirming the email was sent, so you are aware without needing to take any action.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>If the customer does nothing (auto-renews)</div>
        {[
          'On the contract end date, the system automatically generates the next term of visits at the same frequency and price.',
          'The contract end date is extended to cover the new term.',
          'No action needed from you.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Cancel deadline — 14 days before contract end date (industry standard)</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          The renewal email is sent 30 days before the contract end date. The customer has until 14 days before the end date to cancel — this is the industry standard for service contracts and gives both parties adequate notice. The exact cancel-by date is shown in the email. This gives you a 14-day buffer to stop scheduling new visits before the term ends.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>If the customer wants to cancel</div>
        {[
          'They reply to the renewal email or call you with their booking reference before the deadline (14 days before contract end date — industry standard).',
          'You cancel the contract in the Bookings tab — no new visits are generated.',
          'Since cancellation is before the first clean of the new term, no termination fee applies (see Contract Cancellation section below).',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: '#fef9ef', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginTop: 12, fontFamily: FONT, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong>Important:</strong> The auto-renewal policy must be clearly stated in the Terms and Conditions that the customer accepts when booking. Without this, auto-renewal may not be enforceable. Do not activate auto-renewal in the system until the T&Cs contract section has been updated.
        </div>
      </Section>

      <Section title="Contract Cancellation — What To Do Step by Step" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          When a customer calls to cancel their contract, follow these steps every time without exception.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Step 1: Find the contract in the Bookings tab</div>
        {[
          'Search by name, email, or booking reference.',
          'Open the contract record and check: the Contract Start Date, how many visits have been completed, and how many monthly payments have been made.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Step 2: Identify which tier applies</div>
        {[
          { label: 'Tier 1', desc: 'Within 14 days of contract start date AND no cleans completed → full refund, no fee.' },
          { label: 'Tier 2', desc: 'More than 14 days since contract start AND no cleans completed yet → £75 admin fee, refund everything else.' },
          { label: 'Tier 3', desc: 'At least one clean has been completed (regardless of how many days since start) → 50% early termination fee on remaining unpaid months + pro-rata refund for unserved visits in the current paid month.' },
          { label: 'Renewal', desc: 'Contract has already auto-renewed and no cleans done in the new term → same as Tier 2 (£75 fee, refund rest). If cleans have been done in the new term → same as Tier 3.' },
          { label: 'Natural expiry', desc: 'Contract end date has already passed with no renewal → no financial action, just mark cancelled.' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ marginBottom: 10, padding: '10px 14px', background: C.bg, borderRadius: 8, display: 'flex', gap: 14 }}>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.accent, minWidth: 80, flexShrink: 0 }}>{label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Step 3: Tell the customer what will happen before you do anything</div>
        {[
          'Explain the tier that applies and the exact amounts — refund and/or fee.',
          'Do not press Cancel until the customer confirms they understand and want to proceed.',
          'If they want time to think, do not cancel. Let them call back.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Step 4: Press Cancel in the system</div>
        {[
          'Click the Cancel button on the contract record.',
          'A confirmation modal will appear showing the exact tier, amounts, and what will happen.',
          'Review it, confirm it matches what you told the customer, then press Confirm.',
          'The system will handle the refund and/or charge automatically via Stripe.',
          'A cancellation confirmation email is sent to the customer automatically.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ background: '#fef9ef', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginTop: 12, fontFamily: FONT, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong>Important — cooling-off and completed cleans:</strong> The 14-day cooling-off (Tier 1) only applies if no cleans have been done. If even one clean has taken place, Tier 3 applies regardless of how many days have passed since the contract started. You cannot claim a cooling-off refund on a service that has already been partially delivered.
        </div>
      </Section>

      <Section title="Contract Cancellation — Refund Calculation" C={C}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 8 }}>
          No signed document is required. The contract is formed the moment the customer books and pays their deposit — by doing so they have accepted the Terms and Conditions. The <strong>Contract Start Date</strong> is the date the booking was created (shown on the contract record), not the date of the first clean. All cancellation windows below are measured from this date.
        </div>

        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Three tiers apply depending on when the customer cancels relative to the Contract Start Date and the first clean.
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 10 }}>Tier 1 — within 14 days of contract start date, before first clean</div>
        {[
          'Full refund of everything paid. No fee charged.',
          'This is the statutory cooling-off period. The customer has the right to cancel without penalty.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Tier 2 — after 14 days from contract start date, but before the first clean</div>
        {[
          'Charge a £75 admin / cancellation fee via Stripe.',
          'Refund everything else the customer has paid.',
          'No further calculation needed.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Tier 3 — after the first clean has taken place</div>
        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Step 1: Refund unserved visits in the current paid month</div>
        {[
          'Find the total amount the customer actually paid for the current month — use the payment record, not the listed price per visit, to account for any contract discount.',
          'Count the total number of visits scheduled within that month.',
          'Count how many of those visits are still unserved (not completed).',
          'Refund = (monthly amount paid ÷ total visits in month) × number of unserved visits.',
          'Example: customer paid £320 for Month 2, which has 4 weekly visits. 2 are done, 2 are unserved. Refund = £320 ÷ 4 × 2 = £160.',
          'Add-ons for completed visits are already earned — do not refund those. The per-visit figure above proportionally covers add-ons for unserved visits since the monthly payment included them.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, margin: '14px 0 8px' }}>Step 2: Charge add-ons from completed visits in unpaid months</div>
        {[
          'Check whether any completed visits fall within months that have NOT yet been paid.',
          'These are services already delivered — the customer owes for the add-ons even though the monthly payment hasn\'t been taken yet.',
          'Add up the addonTotal from each of those completed visits.',
          'This amount is charged separately to the customer\'s saved card via Stripe.',
          'Example: customer had an oven clean (£45) in an unpaid month — they owe £45 regardless of cancellation.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, margin: '14px 0 8px' }}>Step 3: Early termination fee on remaining unpaid months</div>
        {[
          'Count the number of months remaining in the contract that have NOT yet been paid.',
          'Early termination fee = 50% × (remaining unpaid months × monthly base rate, excluding add-ons).',
          'Example: 4 unpaid months remain at £320/month base. Fee = 50% × (4 × £320) = £640.',
          'This is charged to the customer\'s saved card via Stripe as a single transaction alongside the Step 2 add-ons.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, margin: '14px 0 8px' }}>Step 4: Settlement summary</div>
        {[
          'The Step 1 refund is processed against the original payment — returned to the customer\'s original payment method.',
          'The Step 2 + Step 3 charges are processed as a new charge to the customer\'s saved card.',
          'These are two separate Stripe transactions. The admin panel shows the net for your reference but Stripe processes them independently.',
          'Example: £160 refund for unserved visits. £45 add-ons + £640 termination fee = £685 charged. Customer receives £160 back and is charged £685 separately.',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>·</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}
