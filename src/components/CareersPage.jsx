import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkle, WandIcon } from './Icons';
import Reveal from './Reveal';

const RESPONSIBILITIES = [
  'Carry out thorough cleaning and sanitising of residential and commercial properties to the highest standard',
  'Follow detailed room-by-room cleaning plans and checklists provided before each job',
  'Use appropriate cleaning products, equipment and PPE correctly and safely for each task',
  'Take full responsibility for the quality of your work and flag any concerns before leaving a property',
  'Report any damage, breakages or property issues to management immediately after a job',
  "Maintain a professional, courteous and discreet presence in clients' homes at all times",
  'Follow all company health and safety procedures and company standards without exception',
  'Maintain the cleanliness, security and confidentiality of every property you enter',
  'Attend scheduled jobs on time and communicate proactively if any issues arise',
  'Represent London Cleaning Wizard\'s brand values at every client interaction',
];

const HEALTH_SAFETY = [
  'Report any injuries, strains, accidents or near-misses to management immediately',
  'Correctly use and store all cleaning materials in line with COSHH regulations',
  'Wear appropriate PPE at all times, including gloves, aprons and masks where required',
  'Cooperate fully with all company training, inductions and refresher sessions',
  'Inform management promptly of any health conditions that may affect your ability to carry out duties safely',
  'Follow all manual handling guidelines to prevent injury',
  'Never use a product or piece of equipment you have not been trained to use',
  'Adhere to all company safety policies and report any unsafe conditions or practices immediately',
];

const REQUIREMENTS = [
  { label: 'Own vehicle', detail: 'A car is required. You will travel between client properties across London.' },
  { label: 'Full professional kit', detail: 'You must bring your own deep-clean equipment: commercial-grade hoover, mop, cloths, caddy and all required tools' },
  { label: 'Minimum 1 year experience', detail: 'At least one year of professional cleaning experience in a residential or commercial setting' },
  { label: 'Flexible and reliable', detail: 'Ability to work varied hours including early mornings. Reliability is non-negotiable at this level.' },
  { label: 'Detail-oriented', detail: 'You take pride in your work and notice what others miss. A spotless result every single time.' },
  { label: 'Communicative', detail: 'Able to follow instructions, raise concerns clearly and keep management informed at all times' },
  { label: 'Professional and trustworthy', detail: "You will be entering clients' private homes. The highest standard of conduct and discretion is expected." },
  { label: 'Able to plan and prioritise', detail: 'Able to manage time well, work independently and adapt when priorities change on the day' },
];

const WHAT_WE_OFFER = [
  'Starting rate of £15 per hour, with rates increasing as the business grows',
  'Flexible working hours built around your availability',
  'Jobs allocated as close to your location as possible. We do our best to keep travel manageable.',
  'A supportive, professional team that treats you with respect',
  'Ongoing training and development opportunities',
  'The chance to represent a premium brand that values quality over volume',
];

export default function CareersPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  useEffect(() => {
    const h = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const px = isMobile ? '24px' : isTablet ? '40px' : 'clamp(24px,6vw,100px)';
  const maxW = 800;

  const SectionHeading = ({ children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 28, height: 1, background: '#c8b89a' }} />
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c8b89a', fontWeight: 600 }}>{children}</span>
      </div>
    </div>
  );

  const BulletList = ({ items, dark }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ color: '#c8b89a', fontSize: 11, flexShrink: 0, marginTop: 3 }}>✦</span>
          <span style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 14, color: dark ? '#f5f0e8' : '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>{item}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Careers | Join London Cleaning Wizard | Premium Cleaning Roles</title>
        <meta name="description" content="We are looking for exceptional cleaners to join London Cleaning Wizard. If you take pride in your work and want to be part of a premium cleaning brand, we want to hear from you." />
        <link rel="canonical" href="https://londoncleaningwizard.com/careers" />
      </Helmet>

      {/* Hero */}
      <div style={{
        background: '#1a1410',
        paddingTop: isMobile ? 120 : 148,
        paddingBottom: isMobile ? 56 : 80,
        paddingLeft: px,
        paddingRight: px,
      }}>
        <div style={{ maxWidth: maxW }}>
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Sparkle size={8} color="#c8b89a" />
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c8b89a', fontWeight: 400 }}>
                Join the Team
              </span>
              <Sparkle size={8} color="#c8b89a" />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 38 : 56, fontWeight: 300, color: '#f5f0e8', lineHeight: 1.05, marginBottom: 20, letterSpacing: '-0.01em' }}>
              We are looking for<br /><em>exceptional cleaners.</em>
            </h1>
            <div style={{ width: 44, height: 1, background: '#c8b89a', marginBottom: 24 }} />
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 16, color: 'rgba(245,240,232,0.65)', fontWeight: 300, lineHeight: 1.9, maxWidth: 580 }}>
              London Cleaning Wizard is a premium residential and commercial cleaning company built on one principle: exceptional standards, every single time. We are not looking for average. We are looking for people who take genuine pride in their craft and want to represent a brand that stands apart.
            </p>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 14 : 16, color: 'rgba(245,240,232,0.65)', fontWeight: 300, lineHeight: 1.9, maxWidth: 580, marginTop: 16 }}>
              Think of the standard you would expect from a five-star hotel. That is the level we work at. If that resonates with you, we would love to hear from you.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Job Role */}
      <div style={{ background: '#faf9f7', paddingTop: isMobile ? 56 : 80, paddingBottom: isMobile ? 56 : 80, paddingLeft: px, paddingRight: px }}>
        <div style={{ maxWidth: maxW }}>

          {/* Role title */}
          <Reveal>
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'inline-block', background: '#2c2420', color: '#c8b89a', fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, padding: '6px 14px', marginBottom: 20 }}>
                Now Hiring
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 28 : 36, fontWeight: 400, color: '#1a1410', lineHeight: 1.2, marginBottom: 8 }}>
                Professional Cleaner
              </h2>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 400, letterSpacing: '0.08em' }}>
                Self-employed · London-wide · Flexible hours
              </p>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420', fontWeight: 600, letterSpacing: '0.06em', marginTop: 10 }}>
                Starting from £15.00 per hour
              </p>
            </div>
          </Reveal>

          {/* The ARC */}
          <Reveal>
            <div style={{ marginBottom: 48, border: '1px solid rgba(200,184,154,0.4)', padding: isMobile ? '28px 24px' : '36px 40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 28, height: 1, background: '#c8b89a' }} />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c8b89a', fontWeight: 600 }}>Our Operating Standard</span>
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 26 : 32, fontWeight: 400, color: '#1a1410', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.01em' }}>
                The ARC
              </p>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.8, marginBottom: 24 }}>
                Every cleaner at London Cleaning Wizard is expected to uphold the ARC in every job, every visit, every client interaction.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { letter: 'A', word: 'Attitude', detail: 'Approach every job with pride, care and a positive mindset. Your attitude sets the tone for the client experience.' },
                  { letter: 'R', word: 'Reliability', detail: 'Show up on time, every time. Do what you say you will do. Our clients and our team depend on you.' },
                  { letter: 'C', word: 'Communication', detail: 'Keep management informed, raise concerns early and respond promptly. Good communication prevents small issues becoming big ones.' },
                ].map(({ letter, word, detail }) => (
                  <div key={letter} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, width: 40, height: 40, background: '#2c2420', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 500, color: '#c8b89a' }}>{letter}</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, color: '#2c2420', marginBottom: 3 }}>{word}</div>
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#6b5e56', fontWeight: 300, lineHeight: 1.6 }}>{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Key Responsibilities */}
          <Reveal>
            <div style={{ marginBottom: 48 }}>
              <SectionHeading>Key Responsibilities</SectionHeading>
              <BulletList items={RESPONSIBILITIES} />
            </div>
          </Reveal>

          {/* Health & Safety */}
          <Reveal>
            <div style={{ background: '#2c2420', padding: isMobile ? '28px 24px' : '36px 40px', marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 28, height: 1, background: '#c8b89a' }} />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c8b89a', fontWeight: 600 }}>Health &amp; Safety</span>
              </div>
              <BulletList items={HEALTH_SAFETY} dark />
            </div>
          </Reveal>

          {/* Ideal Candidate */}
          <Reveal>
            <div style={{ marginBottom: 48 }}>
              <SectionHeading>Ideal Candidate</SectionHeading>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 14, color: '#5a4e44', fontWeight: 300, lineHeight: 1.8, marginBottom: 28 }}>
                We have high standards because our clients do. The right person for this role is not just skilled. They are professional, dependable and genuinely care about the result they leave behind.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {REQUIREMENTS.map(({ label, detail }, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 20px', background: '#fff', border: '1px solid rgba(200,184,154,0.3)' }}>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#c8b89a', flexShrink: 0, marginTop: 8 }} />
                    <div>
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, color: '#2c2420', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#6b5e56', fontWeight: 300, lineHeight: 1.6 }}>{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* What we offer */}
          <Reveal>
            <div style={{ marginBottom: 48 }}>
              <SectionHeading>What We Offer</SectionHeading>
              <BulletList items={WHAT_WE_OFFER} />
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontWeight: 300, lineHeight: 1.7, marginTop: 16, fontStyle: 'italic' }}>
                We do our best to allocate cleaners to jobs close to where they live. Your time and travel matter to us.
              </p>
            </div>
          </Reveal>

          {/* Career Progression */}
          <Reveal>
            <div style={{ marginBottom: 48, background: '#2c2420', padding: isMobile ? '28px 24px' : '36px 40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 28, height: 1, background: '#c8b89a' }} />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c8b89a', fontWeight: 600 }}>Career Progression</span>
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 22 : 26, fontWeight: 300, color: '#f5f0e8', lineHeight: 1.4, marginBottom: 16 }}>
                A place to grow, not just a job.
              </p>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 14, color: 'rgba(245,240,232,0.65)', fontWeight: 300, lineHeight: 1.8, marginBottom: 24 }}>
                As London Cleaning Wizard grows, so do the opportunities within it. For long-term cleaners who have consistently excelled in their work, we intend to open up progression pathways into more senior positions. We will invest in training you for these roles from the ground up.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Supervisor', 'Operations Manager', 'Customer Service', 'Administration', 'Accounts'].map((role) => (
                  <div key={role} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#c8b89a', flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#f5f0e8', fontWeight: 300, letterSpacing: '0.04em' }}>{role}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: 'rgba(245,240,232,0.4)', fontWeight: 300, lineHeight: 1.7, marginTop: 20, fontStyle: 'italic' }}>
                These opportunities are reserved for cleaners who have demonstrated the ARC over time and shown a genuine commitment to the company.
              </p>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: isMobile ? 13 : 14, color: 'rgba(245,240,232,0.65)', fontWeight: 300, lineHeight: 1.8, marginTop: 20, borderTop: '1px solid rgba(200,184,154,0.15)', paddingTop: 20 }}>
                We are a growing business building something from the ground up. The people who join us now are not just taking a job — they are getting in early. As we expand and new roles are created, those who are already here, already trusted and already proven will be first in line. That is a real advantage, and we do not take it lightly.
              </p>
            </div>
          </Reveal>

          {/* Certifications & Checks */}
          <Reveal>
            <div style={{ marginBottom: 48 }}>
              <SectionHeading>Certifications &amp; Checks</SectionHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div style={{ padding: '20px 24px', border: '1px solid rgba(200,184,154,0.4)', borderLeft: '3px solid #c8b89a', background: '#fff' }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, color: '#2c2420', marginBottom: 6 }}>British Institute of Cleaning Science (BICSc) Award</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>
                    All cleaners joining London Cleaning Wizard are required to hold a recognised cleaning certification. If you already hold a relevant certificate, we are happy to consider it. If you do not yet have one, you will need to complete the{' '}
                    <a href="https://alison.com/course/british-cleaning-certification-award-bcca-diploma" target="_blank" rel="noopener noreferrer" style={{ color: '#2c2420', fontWeight: 600, textDecoration: 'underline' }}>British Cleaning Certification Award (BCCA) Diploma via Alison</a>
                    {' '}before or shortly after starting. It is free to complete online and we will support you through the process.
                  </div>
                </div>

                <div style={{ padding: '20px 24px', border: '1px solid rgba(200,184,154,0.4)', borderLeft: '3px solid #c8b89a', background: '#fff' }}>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, fontWeight: 600, color: '#2c2420', marginBottom: 6 }}>DBS Check (Disclosure and Barring Service)</div>
                  <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#5a4e44', fontWeight: 300, lineHeight: 1.7 }}>
                    As our cleaners work inside clients' private homes, an Enhanced DBS check is required before you begin. In line with standard UK practice for self-employed contractors, the cost of the DBS check is the responsibility of the applicant. Because Enhanced DBS checks cannot be self-applied, London Cleaning Wizard will facilitate the application through a registered umbrella body on your behalf. If you already hold a valid Enhanced DBS certificate issued within the last three years, please include it with your application.
                  </div>
                </div>

              </div>
            </div>
          </Reveal>

          {/* How to apply */}
          <Reveal>
            <div style={{ background: '#1a1410', padding: isMobile ? '32px 24px' : '44px 48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Sparkle size={8} color="#c8b89a" />
                <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c8b89a', fontWeight: 600 }}>How to Apply</span>
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 22 : 28, fontWeight: 300, color: '#f5f0e8', lineHeight: 1.4, marginBottom: 16 }}>
                Send your CV and a brief note about yourself.
              </p>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: 'rgba(245,240,232,0.6)', fontWeight: 300, lineHeight: 1.8, marginBottom: 24 }}>
                Tell us a little about your experience, the areas of London you are based in, and why you would be a great fit for a premium cleaning role. Please also mention any certifications or DBS checks you already hold.
              </p>
              <a
                href="mailto:careers@londoncleaningwizard.com"
                style={{ display: 'inline-block', fontFamily: "'Jost',sans-serif", fontSize: 11, letterSpacing: '0.08em', textTransform: 'none', fontWeight: 600, padding: '14px 28px', background: '#c8b89a', color: '#1a1410', textDecoration: 'none' }}
              >
                careers@londoncleaningwizard.com
              </a>
            </div>
          </Reveal>

        </div>
      </div>
    </>
  );
}
