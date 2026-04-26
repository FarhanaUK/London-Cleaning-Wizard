import { useState, useEffect } from "react";

export default function TermsAndConditions() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
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
            Last Updated: April 2026
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
                  {["Regular home cleaning (Essential Reset & Signature Hotel Reset)", "Deep cleaning — including end of tenancy & move-in preparation (Deep Reset)", "Airbnb turnaround cleaning"].map(s => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p style={{ marginTop: 16 }}>Our services primarily cover East London. We may accept bookings outside of this area at our discretion. Additional travel or service fees may apply for locations outside East London. Service availability depends on location and scheduling.</p>
              </>
            ),
          },
          {
            title: "3. Pricing & Bookings",
            content: (
              <>
                <p>Our prices are fixed and displayed on our booking page. There are no hidden fees. You can book directly through our website or by calling us on 020 8137 0026.</p>
                <p style={{ marginTop: 16 }}>We may request photos or videos of the property before or after booking to assess the condition accurately. A booking is confirmed once a deposit has been paid.</p>
                <p style={{ marginTop: 16 }}><strong>Property Condition:</strong> Our pricing is based on the information provided at the time of booking, including any photos or videos where requested. If the actual condition of the property differs significantly from what was described or shown, additional charges may apply or the service may be refused. Even where photos or videos were not requested, if our cleaner arrives and finds the property to be in a condition that falls significantly outside the scope of the booked service, we reserve the right to either charge an additional fee or cancel the clean. In all such cases, the deposit will be retained to cover our costs.</p>
              </>
            ),
          },
          {
            title: "4. Deposits & Payments",
            content: (
              <>
                <p>A 30% deposit is required to secure your booking and is charged immediately upon confirmation. The deposit goes toward the total cost of your clean. The remaining 70% balance will be charged automatically once your clean has been completed and marked as done by our team. By booking, you authorise London Cleaning Wizard to charge the remaining balance to your saved payment method upon job completion.</p>
                <p style={{ marginTop: 16 }}><strong>Payment Method:</strong> All payments are taken by card via Stripe. No other payment methods are accepted.</p>
                <p style={{ marginTop: 16 }}><strong>Missed Payment:</strong> If a card payment is declined or the remaining balance is not collected upon job completion, a formal invoice will be issued with a payment deadline. An administration fee of £15 may be added after the deadline. Additional admin fees may be applied for continued non-payment. Future services may be refused and unpaid balances may result in debt recovery or legal action.</p>
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
            title: "6. Access & Responsibilities",
            content: (
              <>
                <p>Customers must provide clear access instructions, ensure safe working conditions, provide electricity and water, inform us of any pets in advance, and provide parking details where needed.</p>
                <p style={{ marginTop: 16 }}><strong>Pet Policy:</strong> All pets must be secured and kept away from our cleaners for the entire duration of the clean. This is required for the safety of both your pet and our team. Failure to do so may result in the clean being abandoned and the loss of your deposit.</p>
                <p style={{ marginTop: 16 }}><strong>Conduct Towards Staff:</strong> Customers must treat our staff with respect and professionalism. Any form of abuse, harassment, or threatening behaviour will result in immediate termination of the service. In such cases, the deposit will be retained and any completed work will be chargeable.</p>
              </>
            ),
          },
          {
            title: "7. Right to Refuse or Stop Service",
            content: (
              <>
                <p>We may refuse or stop a job if the environment is unsafe, there are health risks such as mould or hazardous waste not disclosed, the customer behaves inappropriately, the property condition differs significantly from what was described, or utilities are unavailable.</p>
                <p style={{ marginTop: 16 }}>In these cases, the deposit will be retained to cover call-out costs. Any work completed will be charged and additional fees may apply if applicable.</p>
              </>
            ),
          },
          {
            title: "8. Photography",
            content: (
              <p>Our cleaners will take before and after photos for quality control, training, and dispute protection. Photos will not be shared publicly without consent. Customers may be required to send photos before booking. If the property differs from what was shown, the price may increase or the service may be refused.</p>
            ),
          },
          {
            title: "9. Cleaner Allocation",
            content: (
              <p>While we always strive to send the same dedicated cleaner for recurring bookings, this cannot be guaranteed. In the event that your usual cleaner is unavailable, we will contact you in advance and arrange an equally skilled replacement.</p>
            ),
          },
          {
            title: "10. Satisfaction Guarantee",
            content: (
              <p>Issues must be reported within 24 hours. We offer a free re-clean where appropriate. Refunds are not provided if a re-clean is offered and declined.</p>
            ),
          },
          {
            title: "11. Complaints",
            content: (
              <>
                <p>Email: bookings@londoncleaningwizard.com</p>
                <p style={{ marginTop: 8 }}>We aim to respond within 48 hours and resolve all complaints as soon as possible.</p>
              </>
            ),
          },
          {
            title: "12. Liability",
            content: (
              <p>We take reasonable care in all services. We are not liable for pre-existing damage, normal wear and tear, or undisclosed fragile or valuable items. Customers should secure valuable items before cleaning. We maintain appropriate public liability insurance.</p>
            ),
          },
          {
            title: "13. Website & Platform Use",
            content: (
              <p>You agree not to misuse our website or social media, submit false information, or copy content without permission.</p>
            ),
          },
          {
            title: "14. Data Protection",
            content: (
              <p>We comply with UK GDPR. We may collect your name, contact details, address, and booking information. We use your data to provide services, communicate with you, and send marketing communications. We do not sell your data. You may opt out of marketing at any time.</p>
            ),
          },
          {
            title: "15. Changes to Terms",
            content: <p>We may update these terms at any time. Continued use of our services following any changes constitutes acceptance of the updated terms.</p>,
          },
          {
            title: "16. Governing Law",
            content: <p>These terms are governed by the laws of England and Wales.</p>,
          },
          {
            title: "17. Contact",
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
  );
}