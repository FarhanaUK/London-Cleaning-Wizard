import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";

export default function TermsAndConditions() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms & Conditions | London Cleaning Wizard</title>
        <meta name="description" content="Read the terms and conditions for London Cleaning Wizard cleaning services, including booking, cancellation, payment and liability policies." />
        <link rel="canonical" href="https://londoncleaningwizard.com/terms-and-conditions" />
      </Helmet>
      <div style={{
        background: "#faf9f7",
      minHeight: "100vh",
      padding: isMobile ? "100px 20px 60px" : "120px clamp(20px, 6vw, 160px) 80px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: isMobile ? 36 : 52, borderBottom: "1px solid #d4c4ae", paddingBottom: isMobile ? 24 : 32 }}>
          <div style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "#8b7355",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Legal
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: isMobile ? "clamp(28px, 8vw, 38px)" : "clamp(32px, 5vw, 52px)",
            fontWeight: 300,
            color: "#1a1410",
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Terms & Conditions
          </h1>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 14,
            color: "#8b7355",
            letterSpacing: "0.06em",
          }}>
            Last Updated: May 2026
          </p>
        </div>

        {/* Intro */}
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: isMobile ? 14 : 16, lineHeight: 1.9, color: "#5a4e44", marginBottom: isMobile ? 32 : 48 }}>
          Welcome to London Cleaning Wizard. By booking a service or using our website or social media platforms, you agree to these Terms and Conditions.
        </p>

        {[
          {
            title: "1. About Us",
            content: (
              <>
                <p>London Cleaning Wizard is a sole trader business operating in the United Kingdom.</p>
                <p style={{ marginTop: 16 }}><strong>Contact Details:</strong></p>
                <p>Email: bookings@londoncleaningwizard.com</p>
                <p>Phone: 020 8137 0026</p>
              </>
            ),
          },
          {
            title: "2. Services",
            content: (
              <>
                <p>We provide cleaning services including:</p>
                <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Regular home cleaning (Regular Clean & Signature Hotel Reset) — available as one-off or recurring (weekly, fortnightly, or monthly)",
                    "Deep cleaning, including end of tenancy and move-in preparation (Deep Clean) — one-off only",
                    "Airbnb and short-let turnaround cleaning — fixed-price packages, one-off or recurring by arrangement",
                    "Office and commercial cleaning — hourly from 3 hours, one-off or recurring by arrangement",
                  ].map(s => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p style={{ marginTop: 16 }}>Our services cover central and east London. We do not cover all areas of London. Please check our Areas page or contact us before booking to confirm we serve your location. We may accept bookings outside our standard coverage area at our discretion, and additional travel fees may apply.</p>
              </>
            ),
          },
          {
            title: "3. Pricing & Bookings",
            content: (
              <>
                <p>Our prices are displayed in full on our booking page with no hidden fees. Fixed-price packages are charged at a set rate based on property size and service type. Office cleaning is charged at a fixed hourly rate for the duration selected, subject to the minimum booking hours stated. You can book directly through our website or by calling us on 020 8137 0026.</p>
                <p style={{ marginTop: 16 }}>We may request photos or videos of the property before or after booking to assess the condition accurately. A booking is confirmed once a deposit has been paid.</p>
                <p style={{ marginTop: 16 }}><strong>Property Condition:</strong> Our pricing is based on the information provided at the time of booking, including any photos or videos where requested. If the actual condition of the property differs significantly from what was described or shown, additional charges may apply or the service may be refused. Even where photos or videos were not requested, if our cleaner arrives and finds the property to be in a condition that falls significantly outside the scope of the booked service, we reserve the right to either charge an additional fee or cancel the clean. In all such cases, the deposit will be retained to cover our costs.</p>
              </>
            ),
          },
          {
            title: "3a. Commercial & Airbnb Bookings",
            content: (
              <>
                <p>Bookings for recurring office, commercial, and Airbnb or serviced apartment arrangements are handled via our quote form, by phone, or by email rather than through the standard online booking form. We will ask for details about the property, including type, size, frequency, and access arrangements, before confirming any booking.</p>
                <p style={{ marginTop: 16 }}><strong>Photos and video:</strong> We may request photos or a short video of the property before confirming a quote. Providing accurate information is the client's responsibility. If the actual condition of the property differs significantly from what was described or shown, we reserve the right to adjust the price, reduce the scope, or refuse the clean. In all such cases the deposit will be retained to cover our costs.</p>
                <p style={{ marginTop: 16 }}><strong>Recurring commercial arrangements:</strong> We offer recurring booking arrangements for commercial clients (weekly, fortnightly, or monthly) on the same terms as residential recurring bookings. No deposit is taken from the second clean onwards, and payment is charged automatically on completion of each clean. There are no fixed-term contracts. Arrangements can be ended by either party with 48 hours written notice.</p>
              </>
            ),
          },
          {
            title: "4. Deposits & Payments",
            content: (
              <>
                <p>A 30% deposit is required to secure your booking and is charged immediately upon confirmation. The deposit goes toward the total cost of your clean. The remaining 70% balance will be charged automatically once your clean has been completed and marked as done by our team. By booking, you authorise London Cleaning Wizard to charge the remaining balance to your saved payment method upon job completion.</p>
                <p style={{ marginTop: 16 }}><strong>Payment Method:</strong> All payments are taken by card via Stripe. No other payment methods are accepted.</p>
                <p style={{ marginTop: 16 }}><strong>Missed Payment:</strong> If a card payment is declined upon job completion, we will automatically retry the charge on the following day. If the second attempt also fails, a formal invoice will be issued with a payment deadline. An administration fee of £15 may be added after the deadline. Additional admin fees may be applied for continued non-payment. Future services may be refused and unpaid balances may result in debt recovery or legal action.</p>
              </>
            ),
          },
          {
            title: "5. Cancellations & Refunds",
            content: (
              <>
                <p><strong>How to cancel:</strong> All cancellations must be made by phone call only on 020 8137 0026. Cancellation requests made by email, text, WhatsApp or any other method will not be accepted as valid notice and will not waive any applicable charges.</p>
                <p style={{ marginTop: 16 }}><strong>First booking / one-off:</strong></p>
                <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <li>More than 48 hours' notice: Full refund of deposit</li>
                  <li>Less than 48 hours' notice, same-day cancellation, or no access provided: Deposit is non-refundable</li>
                </ul>
                <p style={{ marginTop: 16 }}><strong>Regular services (weekly, fortnightly or monthly):</strong> You may cancel your recurring arrangement at any time with at least 48 hours notice before your next scheduled clean at no charge. For cancellations with less than 48 hours notice, a charge of 30% of that clean's price will be applied to your saved payment method, as your cleaner's time will have been reserved.</p>
                <p style={{ marginTop: 16 }}>Cancelling two consecutive cleans will end your recurring arrangement and your recurring discount. A new booking will be required, subject to standard first-clean pricing.</p>
                <p style={{ marginTop: 16 }}>If our cleaner arrives at the scheduled time and is refused access or the clean is declined for any reason, this will be treated as a late cancellation and the applicable charge will apply.</p>
                <p style={{ marginTop: 16 }}>If we cannot complete the service due to our fault, a full refund will be issued.</p>
              </>
            ),
          },
          {
            title: "6. Recurring Clean Policy",
            content: (
              <>
                <p>If a recurring booking is selected, the first clean is charged at the standard first-clean rate. Any discounts apply from the second visit onwards.</p>
                <p style={{ marginTop: 16 }}>If two consecutive cleans are missed or cancelled, the recurring arrangement and any associated discount will be cancelled. Future bookings will revert to standard pricing.</p>
              </>
            ),
          },
          {
            title: "7. Access & Responsibilities",
            content: (
              <>
                <p>Customers must provide clear access instructions, ensure safe working conditions, provide electricity and water, inform us of any pets in advance, and provide parking details where needed.</p>
                <p style={{ marginTop: 16 }}><strong>Pet Policy:</strong> All pets must be secured and kept away from our cleaners for the entire duration of the clean. This is required for the safety of both your pet and our team. Failure to do so may result in the clean being abandoned and the loss of your deposit.</p>
                <p style={{ marginTop: 16 }}><strong>Conduct Towards Staff:</strong> Customers must treat our staff with respect and professionalism. Any form of abuse, harassment, or threatening behaviour will result in immediate termination of the service. In such cases, the deposit will be retained and any completed work will be chargeable.</p>
              </>
            ),
          },
          {
            title: "8. Right to Refuse or Stop Service",
            content: (
              <>
                <p>We may refuse or stop a job if the environment is unsafe, there are health risks such as mould or hazardous waste not disclosed, the customer behaves inappropriately, the property condition differs significantly from what was described, or utilities are unavailable.</p>
                <p style={{ marginTop: 16 }}>In these cases, the deposit will be retained to cover call-out costs. Any work completed will be charged and additional fees may apply if applicable.</p>
              </>
            ),
          },
          {
            title: "9. Photography & Video",
            content: (
              <>
                <p>To maintain our service standards and ensure consistent quality, our cleaning team may take before and after photos of completed work. These images are used strictly for internal quality control, training, and verification purposes. They are not used for marketing or social media unless explicit separate consent has been given. All images are stored securely and are deleted within 48 hours after quality review, unless required for resolving a customer query or complaint.</p>
                <p style={{ marginTop: 16 }}><strong>Social media consent:</strong> During the booking process you may choose to give permission for before/after photos and videos of your clean to be shared on London Cleaning Wizard's social media channels. This is entirely optional. Your personal details and address will never be shown. You may withdraw consent at any time by contacting us at bookings@londoncleaningwizard.com. We will only share content from bookings where consent was given at the time of booking.</p>
                <p style={{ marginTop: 16 }}><strong>Pre-booking photos:</strong> We may ask customers to send photos or videos of the property before confirming a booking, particularly for commercial, Airbnb, or deep cleans. If the property differs significantly from what was shown, the price may increase or the service may be refused.</p>
              </>
            ),
          },
          {
            title: "10. Cleaner Allocation",
            content: (
              <p>While we always strive to send the same dedicated cleaner for recurring bookings, this cannot be guaranteed. In the event that your usual cleaner is unavailable, we will contact you in advance and arrange an equally skilled replacement.</p>
            ),
          },
          {
            title: "11. Satisfaction Guarantee",
            content: (
              <p>Issues must be reported within 24 hours. We offer a free re-clean where appropriate. Refunds are not provided if a re-clean is offered and declined.</p>
            ),
          },
          {
            title: "12. Complaints",
            content: (
              <>
                <p>Email: bookings@londoncleaningwizard.com</p>
                <p style={{ marginTop: 8 }}>We aim to respond within 48 hours and resolve all complaints as soon as possible.</p>
              </>
            ),
          },
          {
            title: "13. Damage, Liability & Claims",
            content: (
              <>
                <p>London Cleaning Wizard carries full public liability insurance and takes every care when working in your home.</p>
                <p style={{ marginTop: 12 }}><strong>Reporting damage:</strong> Any damage believed to have occurred during a clean must be reported to us within 24 hours of the clean being completed. Reports must be made by phone call on 020 8137 0026 and must include photographs of the damage taken before the item is moved, repaired, or disposed of. We cannot accept claims for damage reported after this 24-hour window or without photographic evidence.</p>
                <p style={{ marginTop: 12 }}><strong>Investigation:</strong> Once a damage report is received, we will acknowledge it within 2 working days and investigate. We may request additional information or access to inspect the item. Our decision on liability will be communicated to you within 5 working days of receiving all required information.</p>
                <p style={{ marginTop: 12 }}><strong>Our liability:</strong> We accept liability for damage caused directly by our cleaners' negligence during the clean. We are not liable for: pre-existing damage or wear and tear; damage to items already in a fragile, deteriorating, or unstable condition; items broken as a result of not being properly secured; or loss not directly caused by cleaning activity.</p>
                <p style={{ marginTop: 12 }}><strong>High-value and fragile items:</strong> We strongly recommend that fragile, antique, sentimental, or high-value items are stored away or removed from the property before your clean. If you have items of significant value in areas to be cleaned, you must inform us in advance so we can take appropriate precautions. We are not liable for damage to high-value or fragile items that were not declared to us before the clean.</p>
                <p style={{ marginTop: 12 }}><strong>Resolution:</strong> Where we accept liability for damage, we will offer one of the following at our discretion: repair of the item at our cost; replacement with an equivalent item of similar value; or agreed monetary compensation. We do not accept liability for sentimental value or consequential losses beyond the fair market value of the item at the time of damage. If we do not receive a response from you within 14 days of our resolution offer or any request for further information, the case will be considered closed.</p>
              </>
            ),
          },
          {
            title: "14. Website & Platform Use",
            content: (
              <p>You agree not to misuse our website or social media, submit false information, or copy content without permission.</p>
            ),
          },
          {
            title: "15. Data Protection",
            content: (
              <p>We comply with UK GDPR. We may collect your name, contact details, address, and booking information. We use your data to provide services, communicate with you, and send marketing communications. We do not sell your data. You may opt out of marketing at any time.</p>
            ),
          },
          {
            title: "16. Complimentary Gifts",
            content: <p>From time to time we may include a complimentary gift with certain services as a gesture of appreciation. This is entirely at our discretion and is not a guaranteed part of any service. We reserve the right to change, substitute, or discontinue the gift at any time without notice.</p>,
          },
          {
            title: "17. Changes to Terms",
            content: <p>We may update these terms at any time. Continued use of our services following any changes constitutes acceptance of the updated terms.</p>,
          },
          {
            title: "18. Governing Law",
            content: <p>These terms are governed by the laws of England and Wales.</p>,
          },
          {
            title: "19. Contact",
            content: (
              <>
                <p>Email: bookings@londoncleaningwizard.com</p>
                <p style={{ marginTop: 8 }}>Phone: 020 8137 0026</p>
              </>
            ),
          },
        ].map(({ title, content }) => (
          <div key={title} style={{ marginBottom: isMobile ? 28 : 40, paddingBottom: isMobile ? 28 : 40, borderBottom: "1px solid #ece6dc" }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: isMobile ? "clamp(18px, 5vw, 22px)" : "clamp(20px, 3vw, 26px)",
              fontWeight: 400,
              color: "#1a1410",
              marginBottom: 12,
            }}>
              {title}
            </h2>
            <div style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: isMobile ? 13 : 15,
              lineHeight: 1.9,
              color: "#5a4e44",
            }}>
              {content}
            </div>
          </div>
        ))}

      </div>
    </div>
    </>
  );
}