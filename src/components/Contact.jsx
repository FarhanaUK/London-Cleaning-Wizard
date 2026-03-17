import { useState, useEffect } from "react";
import { Sparkle, WandIcon } from "./Icons";
import Reveal from "./Reveal";
import { SERVICES, CONTACT_INFO } from "../data/siteData";
import emailjs from "@emailjs/browser";

const HOW_HEARD_OPTIONS = [
  "Google Search",
  "Instagram",
  "Facebook",
  "TikTok",
  "Word of Mouth / Friend",
  "Leaflet / Flyer",
  "Nextdoor",
  "Other",
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    postcode: "",
    service: "",
    notes: "",
    howHeard: "",
    howHeardOther: "",
  });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim())
      newErrors.name = "Please enter your full name.";

    if (!form.email.trim())
      newErrors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Please enter a valid email address.";

   if (!form.phone.trim())
  newErrors.phone = "Please enter your phone number.";
else if (!/^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/.test(form.phone.replace(/\s/g, ""))) 
  newErrors.phone = "Please enter a valid UK mobile number (e.g. 07700 900 123).";

    if (!form.postcode.trim())
      newErrors.postcode = "Please enter your postcode.";
    else if (!/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(form.postcode))
      newErrors.postcode = "Please enter a valid UK postcode.";

    if (!form.service)
      newErrors.service = "Please select a service.";

    if (!form.howHeard)
      newErrors.howHeard = "Please let us know how you heard about us.";

    if (form.howHeard === "Other" && !form.howHeardOther.trim())
      newErrors.howHeardOther = "Please tell us where you heard about us.";

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setSubmitError("");
    setErrors({});

    const howHeardFinal = form.howHeard === "Other"
      ? `Other: ${form.howHeardOther}`
      : form.howHeard;

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          from_name: form.name,
          from_email: form.email,
          phone: form.phone,
          postcode: form.postcode,
          service: form.service,
          notes: form.notes,
          how_heard: howHeardFinal,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      
      setSent(true);
    } catch (err) {
      console.error("EmailJS error:", err);
      setSubmitError("Something went wrong. Please try again or call us directly.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #d4c4ae",
    padding: "10px 0",
    fontFamily: "'Jost', sans-serif",
    fontSize: 14,
    color: "#1a1410",
    outline: "none",
  };

  const inputErrorStyle = {
    ...inputStyle,
    borderBottom: "1px solid #c0392b",
  };

  const labelStyle = {
    fontFamily: "'Jost', sans-serif",
    fontSize: 9,
    letterSpacing: "0.2em",
    color: "#8b7355",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  };

  const errorTextStyle = {
    fontFamily: "'Jost', sans-serif",
    fontSize: 11,
    color: "#c0392b",
    marginTop: 4,
    letterSpacing: "0.03em",
  };

  return (
    <section id="contact" style={{ padding: "100px clamp(24px, 6vw, 100px)", background: "#faf9f7" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 48 : 80,
        alignItems: "start",
        maxWidth: 1200,
        margin: "0 auto",
      }}>

        {/* Left — info */}
        <Reveal>
          <div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, letterSpacing: "0.28em", color: "#8b7355", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <WandIcon size={16} color="#c8b89a" /> Cast the First Spell
            </div>

            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 28, color: "#1a1410" }}>
              Ready for a<br /><em>spotless home?</em>
            </h2>

            <div style={{ width: 44, height: 1, background: "#c8b89a", marginBottom: 28 }} />

            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, lineHeight: 1.9, color: "#5a4e44", fontWeight: 300, marginBottom: 40 }}>
              Fill in the form and we'll reply within a few hours with a free,
              transparent quote. No pressure, no obligation — just a little magic.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {CONTACT_INFO.map(({ label, value }) => (
                <div key={label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <Sparkle size={10} color="#c8b89a" style={{ marginTop: 3, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: "0.18em", color: "#8b7355", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: "#2c2420" }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {!isMobile && (
              <div style={{ marginTop: 52, opacity: 0.1 }}>
                <WandIcon size={80} color="#2c2420" />
              </div>
            )}
          </div>
        </Reveal>

        {/* Right — form */}
        <Reveal delay={160}>
          {sent ? (
            <div style={{ padding: isMobile ? "40px 24px" : "60px 44px", background: "#f2ede6", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, gap: 8 }}>
                <Sparkle size={20} color="#c8b89a" />
                <Sparkle size={28} color="#c8b89a" />
                <Sparkle size={20} color="#c8b89a" />
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, marginBottom: 14, color: "#1a1410" }}>
                <em>The magic is underway</em>
              </h3>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: "#5a4e44", lineHeight: 1.85, fontWeight: 300 }}>
                We've received your enquiry and will be in touch shortly with a personalised quote for your home.
              </p>
            </div>
          ) : (
            <div style={{ padding: isMobile ? "32px 24px" : "48px", background: "#f2ede6" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                {/* Name */}
                <div>
                  <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> Full Name *</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: "" }); }}
                    style={errors.name ? inputErrorStyle : inputStyle}
                  />
                  {errors.name && <p style={errorTextStyle}>{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> Email Address *</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }}
                    style={errors.email ? inputErrorStyle : inputStyle}
                  />
                  {errors.email && <p style={errorTextStyle}>{errors.email}</p>}
                </div>

                {/* Phone and Postcode side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> Phone *</label>
                    <input
                      type="tel"
                      placeholder="07700 000 000"
                      value={form.phone}
                      onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: "" }); }}
                      style={errors.phone ? inputErrorStyle : inputStyle}
                    />
                    {errors.phone && <p style={errorTextStyle}>{errors.phone}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> Postcode *</label>
                    <input
                      type="text"
                      placeholder="E.g. E1 6RF"
                      value={form.postcode}
                      onChange={e => { setForm({ ...form, postcode: e.target.value.toUpperCase() }); setErrors({ ...errors, postcode: "" }); }}
                      style={errors.postcode ? inputErrorStyle : inputStyle}
                    />
                    {errors.postcode && <p style={errorTextStyle}>{errors.postcode}</p>}
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> Service Required *</label>
                  <select
                    value={form.service}
                    onChange={e => { setForm({ ...form, service: e.target.value }); setErrors({ ...errors, service: "" }); }}
                    style={errors.service ? { ...inputErrorStyle, appearance: "none", cursor: "pointer" } : { ...inputStyle, appearance: "none", cursor: "pointer" }}
                  >
                    <option value="">Select a service…</option>
                    {SERVICES.map(s => <option key={s.title}>{s.title}</option>)}
                  </select>
                  {errors.service && <p style={errorTextStyle}>{errors.service}</p>}
                </div>

                {/* How did you hear about us */}
                <div>
                  <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> How did you hear about us? *</label>
                  <select
                    value={form.howHeard}
                    onChange={e => { setForm({ ...form, howHeard: e.target.value, howHeardOther: "" }); setErrors({ ...errors, howHeard: "" }); }}
                    style={errors.howHeard ? { ...inputErrorStyle, appearance: "none", cursor: "pointer" } : { ...inputStyle, appearance: "none", cursor: "pointer" }}
                  >
                    <option value="">Select an option…</option>
                    {HOW_HEARD_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                  {errors.howHeard && <p style={errorTextStyle}>{errors.howHeard}</p>}
                </div>

                {/* Other — only shows if Other is selected */}
                {form.howHeard === "Other" && (
                  <div>
                    <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> Please specify *</label>
                    <input
                      type="text"
                      placeholder="Where did you hear about us?"
                      value={form.howHeardOther}
                      onChange={e => { setForm({ ...form, howHeardOther: e.target.value }); setErrors({ ...errors, howHeardOther: "" }); }}
                      style={errors.howHeardOther ? inputErrorStyle : inputStyle}
                    />
                    {errors.howHeardOther && <p style={errorTextStyle}>{errors.howHeardOther}</p>}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label style={labelStyle}><Sparkle size={7} color="#c8b89a" /> Additional Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Home size, preferred dates, anything else…"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    style={{ ...inputStyle, resize: "none" }}
                  />
                </div>

                {/* Required fields note */}
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: "#8b7355", letterSpacing: "0.05em" }}>
                  * Required fields
                </p>

                {/* Submit error */}
                {submitError && (
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: "#c0392b", letterSpacing: "0.05em" }}>
                    {submitError}
                  </p>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    width: "100%",
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    padding: "16px 24px",
                    background: loading ? "#8b7355" : "#2c2420",
                    color: "#f5f0e8",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    marginTop: 8,
                    transition: "background 0.3s",
                  }}
                >
                  <WandIcon size={16} color="#c8b89a" />
                  {loading ? "Sending…" : "Request Your Free Quote"}
                </button>

              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}