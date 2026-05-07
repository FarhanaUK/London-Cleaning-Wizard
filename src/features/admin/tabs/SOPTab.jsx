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

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '16px 0 8px' }}>Fixed Costs tab: recurring monthly/yearly overheads</div>
        {['Things like insurance, phone bill, software subscriptions.', 'Mark them monthly or yearly. Yearly ones are divided by 12 so you see a true monthly overhead figure.', 'Shows your total fixed overhead per month at a glance.'].map((item, i) => (
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

        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '20px 0 10px' }}>Why separate fixed and variable?</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          <strong>Fixed costs</strong> are the same every month regardless of how busy you are: insurance, phone bill, software subscriptions. You set them once and forget them. They tell you your minimum monthly outgoing before you've done a single job.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Variable costs</strong> change month to month depending on activity: supplies, fuel, equipment. Some months you spend £20, others £200.
        </div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 8 }}>The reason to separate them is so you can answer questions like:</div>
        {[
          '"Even if I do zero jobs this month, I need to cover £X" → that\'s your fixed costs.',
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
          { label: 'Fixed costs',           desc: 'Your monthly overhead (insurance, software etc). Same every month regardless of jobs.' },
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
        <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
          This process is for clients who want a <strong>recurring arrangement</strong>: regular office or Airbnb cleans on a standing schedule, not one-off bookings. One-off Airbnb and office cleans go through the standard website booking flow. For recurring commercial enquiries, the preferred route is the quote form at <strong>/quote</strong>. Enquiries also come in by phone or email. Follow the steps below every time.
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
          'Type of property: Airbnb, serviced apartment, or office.',
          'Property size: number of bedrooms (Airbnb) or rough square footage and number of rooms (office).',
          'Frequency: one-off or recurring (weekly, fortnightly, monthly).',
          'Preferred day(s) and time. Offices often need after-hours or early morning.',
          'Access method: key, code, host/manager present, or key safe.',
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
          'Once the client agrees: go to Bookings tab → New Booking → fill in all details → select the correct package and hours.',
          'A 30% deposit is required to confirm. Send a payment link to their email address. The system generates this from the booking.',
          'Booking is confirmed only once the deposit is paid. Do not schedule the cleaner before payment is received.',
          'For Airbnb hosts: confirm the guest checkout time and check-in time so the cleaner knows their turnaround window.',
          'For offices: confirm the exact access method and the out-of-hours entry procedure in writing (email is fine).',
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
          'Airbnb hosts: offer a standing arrangement, same cleaner, same slot between every checkout and check-in.',
          'Offices: offer weekly or fortnightly recurring. Use the Convert to Recurring flow in the Customers tab if they already have a completed one-off on file.',
          'Recurring commercial clients are treated the same as residential recurring: no deposit from the second clean onwards, auto-charged on completion.',
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
    </div>
  );
}
