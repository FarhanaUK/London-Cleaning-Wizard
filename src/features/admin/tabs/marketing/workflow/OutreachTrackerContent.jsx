import { useState, useMemo } from 'react';
import { MKT, FONT, SERIF, SLabel } from './MktShared';

const STORE_KEY = 'lcw_outreach_log';

function loadLog() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveLog(log) {
  localStorage.setItem(STORE_KEY, JSON.stringify(log));
}

const TARGET_TYPES = [
  { id: 'airbnb',        label: 'Airbnb hosts'          },
  { id: 'letting',       label: 'Letting agents'        },
  { id: 'property_mgmt', label: 'Property management'  },
  { id: 'estate',        label: 'Estate agents'         },
  { id: 'offices',       label: 'Commercial offices'    },
  { id: 'mixed',         label: 'Mixed targets'         },
  { id: 'other',         label: 'Other businesses'      },
];

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekRange(mondayStr) {
  const mon = new Date(mondayStr + 'T12:00:00');
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

const EMPTY_WEEK = {
  weekOf:       '',
  target_type:  'airbnb',
  calls_made:       '', calls_answered:   '', calls_interested: '', calls_quotes: '',
  emails_sent:      '', emails_replied:   '', emails_interested: '',
  fb_posts:         '', fb_enquiries:     '',
  visits_made:      '', visits_followup:  '',
  notes: '',
};

// ── Honest reading engine ─────────────────────────────────────────────────────

function generateReading(weeks) {
  if (!weeks || weeks.length === 0) return null;

  const sorted  = [...weeks].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
  const recent  = sorted.slice(0, 4);
  const latest  = recent[0];
  const n       = v => parseFloat(v) || 0;

  const totalCalls     = recent.reduce((s, w) => s + n(w.calls_made),       0);
  const totalAnswered  = recent.reduce((s, w) => s + n(w.calls_answered),   0);
  const totalInterest  = recent.reduce((s, w) => s + n(w.calls_interested), 0);
  const totalQuotes    = recent.reduce((s, w) => s + n(w.calls_quotes),     0);
  const totalEmails    = recent.reduce((s, w) => s + n(w.emails_sent),      0);
  const totalReplies   = recent.reduce((s, w) => s + n(w.emails_replied),   0);
  const totalFbPosts   = recent.reduce((s, w) => s + n(w.fb_posts),         0);
  const totalFbEnq     = recent.reduce((s, w) => s + n(w.fb_enquiries),     0);
  const totalVisits    = recent.reduce((s, w) => s + n(w.visits_made),      0);
  const totalFollowups = recent.reduce((s, w) => s + n(w.visits_followup),  0);

  const targetType    = latest.target_type || 'mixed';
  const totalActivity = totalCalls + totalEmails + totalFbPosts + totalVisits;

  const lines       = [];
  const suggestions = [];

  if (totalActivity === 0) {
    lines.push({ type: 'headline', text: 'No outreach logged yet. Log your first week to get your reading.' });
    return { lines, suggestions };
  }

  // --- Headline ---
  const parts = [];
  if (totalCalls   > 0) parts.push(`${totalCalls} calls`);
  if (totalEmails  > 0) parts.push(`${totalEmails} emails`);
  if (totalFbPosts > 0) parts.push(`${totalFbPosts} group posts`);
  if (totalVisits  > 0) parts.push(`${totalVisits} visits`);
  lines.push({
    type: 'headline',
    text: `${parts.join(' · ')} across the last ${recent.length} week${recent.length !== 1 ? 's' : ''}.`,
  });

  // --- Cold calling ---
  if (totalCalls > 0) {
    const answerRate   = Math.round((totalAnswered  / totalCalls)    * 100);
    const interestRate = totalAnswered > 0 ? Math.round((totalInterest / totalAnswered) * 100) : 0;
    const weeksCount   = recent.length;
    const callsPerWeek = Math.round(totalCalls / weeksCount);

    let callText = `${totalCalls} calls made across ${weeksCount} week${weeksCount !== 1 ? 's' : ''} — ${callsPerWeek} per week average. ${totalAnswered} answered (${answerRate}% pick-up rate). ${totalInterest} expressed genuine interest. ${totalQuotes > 0 ? `${totalQuotes} quote${totalQuotes !== 1 ? 's' : ''} sent.` : 'No quotes sent yet.'}`;

    lines.push({ type: 'insight', label: 'Cold Calling', text: callText });

    if (targetType === 'letting' || targetType === 'mixed') {
      if (callsPerWeek < 30) {
        suggestions.push(`For letting agents, volume matters more than anything else right now. At ${callsPerWeek} calls per week, you are unlikely to see consistent results. The realistic expectation: 1 trial booking from every 50-80 calls made — and that assumes some of those calls turn into a second or third touchpoint. If you can reach 40-60 calls per week consistently, you should start seeing your first conversations within 3-4 weeks. Below 20 per week, it is essentially random luck.`);
      }
      if (totalQuotes === 0 && totalInterest > 0) {
        suggestions.push(`You have ${totalInterest} interested contacts from calls but no quotes sent. This is the gap to close this week. A quote does not need to be a formal document — a WhatsApp message with your prices and a link to your site is enough. Send it the same day they show interest. They will forget you by tomorrow.`);
      }
    }

    if (targetType === 'airbnb') {
      suggestions.push(`Cold calling Airbnb hosts is harder than calling letting agents — they are individuals, often listed under initials, with no switchboard. Direct messages via Facebook groups or Airbnb host communities reach them faster and with a higher response rate. If you are spending time on calls for Airbnb specifically, consider reallocating that time to Facebook group posts instead.`);
    }

    if (targetType === 'letting' || targetType === 'mixed') {
      suggestions.push(`When calling letting agents, open with a verifiable fact rather than a pitch: "We have seven five-star Google reviews and are looking to partner with letting agents in [area]." It is short, checkable, and gives them a reason to keep listening. Follow up any interested call with a same-day email that includes a link to your Google reviews.`);
    }

    if (answerRate < 15 && totalCalls > 15) {
      suggestions.push(`Your call pick-up rate is ${answerRate}%. For letting agents, 20-35% is typical during office hours (10am-12pm and 2pm-4pm on weekdays). Avoid Monday mornings and Friday afternoons.`);
    }
  }

  // --- Email outreach ---
  if (totalEmails > 0) {
    const replyRate = Math.round((totalReplies / totalEmails) * 100);
    lines.push({
      type: 'insight',
      label: 'Email Outreach',
      text: `${totalEmails} emails sent. ${totalReplies} replies (${replyRate}% reply rate). ${recent.reduce((s, w) => s + n(w.emails_interested), 0)} expressed genuine interest.`,
    });

    if (replyRate < 3 && totalEmails > 15) {
      suggestions.push(`Your email reply rate is ${replyRate}%. A realistic cold email reply rate to letting agents in London is 2-5% — so this is not far off, but it means you need volume: 100 emails to get 2-5 conversations. The subject line is the single biggest lever. Try: "Local end-of-tenancy cleaning — [their street or area]" or "Cleaning for your managed properties — quick question." Avoid anything that reads like a mass mailout.`);
    }
    if (replyRate === 0 && totalEmails >= 10) {
      suggestions.push(`${totalEmails} emails, zero replies. Before sending more, check three things: (1) are you emailing a named person or a generic info@ address — named contacts reply at 3x the rate; (2) does your subject line sound personal or automated; (3) do you have a Google review you can reference — without social proof, even good emails get ignored by letting agents.`);
    }
    if (replyRate >= 8) {
      suggestions.push(`Your email reply rate of ${replyRate}% is genuinely good for cold outreach. Stop sending new cold emails this week and focus entirely on following up with people who already replied. A warm reply is worth 20 cold sends.`);
    }
  }

  // --- Facebook / online posts ---
  if (totalFbPosts > 0) {
    const enquiryRate = Math.round((totalFbEnq / totalFbPosts) * 100);
    lines.push({
      type: 'insight',
      label: 'Facebook / Online Outreach',
      text: `${totalFbPosts} group post${totalFbPosts !== 1 ? 's' : ''} made. ${totalFbEnq} enquiries received (${enquiryRate}% per post).`,
    });

    if (totalFbEnq === 0 && totalFbPosts > 0) {
      suggestions.push(`${totalFbPosts} Facebook group post${totalFbPosts !== 1 ? 's' : ''}, zero enquiries. The most common reason: the post reads like an advert. In Airbnb host groups, the posts that get responses are conversational — not promotional. Try: "Hi everyone — I am a local cleaner in [area] looking to take on 2 Airbnb clients. Happy to do an initial clean at a reduced rate to prove the standard. Anyone looking?" That framing gets responses. A poster that says "Professional cleaning services available" does not.`);
    }
    if (totalFbEnq > 0 && totalQuotes === 0) {
      suggestions.push(`${totalFbEnq} Facebook enquiries and no quotes sent. These are warm leads — the hardest to get. Follow up with every single one today. Even if they went quiet, a short message ("Did you get a chance to look at my message?") re-opens the conversation.`);
    }
    if (enquiryRate >= 20) {
      suggestions.push(`${enquiryRate}% enquiry rate from your group posts is strong. Document exactly what you wrote and post that same format in more groups this week. Find London-specific Airbnb host groups and replicate it.`);
    }
  }

  // --- Face-to-face visits ---
  if (totalVisits > 0) {
    lines.push({
      type: 'insight',
      label: 'Face-to-Face Visits',
      text: `${totalVisits} business${totalVisits !== 1 ? 'es' : ''} visited across the last ${recent.length} week${recent.length !== 1 ? 's' : ''}. ${totalFollowups} follow-up${totalFollowups !== 1 ? 's' : ''} sent after visits.`,
    });

    if (totalFollowups === 0 && totalVisits > 0) {
      suggestions.push(`You visited ${totalVisits} businesses and sent no follow-up emails. Face-to-face visits are the highest-converting outreach method for letting agents, but only if you follow up the same day. The person you spoke to will not remember you by next week. Send a short email within 2 hours of leaving: "Great to meet you today — here is our pricing for end-of-tenancy and routine property cleans. Happy to do your first property at a reduced rate so you can see the standard." Make it a rule: walk in, send the email before you get back to your car.`);
    }
    if (totalVisits > 0 && totalFollowups === totalVisits) {
      suggestions.push(`Good — you are following up every visit. The next step is persistence: letting agents rarely commit on the first contact. If you have not heard back within 5 days, call them. Three touchpoints (visit, email, call) from the same week dramatically increases the chance of a trial booking.`);
    }
  }

  // --- Overall honest assessment ---
  if (recent.length >= 2) {
    const hasAnyQuotes    = totalQuotes > 0;
    const hasAnyEnquiries = totalFbEnq  > 0 || totalReplies > 0;

    if (!hasAnyQuotes && !hasAnyEnquiries && totalActivity > 20) {
      suggestions.push(`You have been doing outreach for ${recent.length} weeks with no quotes sent and no warm enquiries yet. That is not unusual at this stage, but it means the approach needs adjusting — more volume alone will not fix it. Two things to check: (1) Are you leading with your Google reviews when you call or email? "We have seven five-star reviews on Google" is a verifiable opening line that changes how letting agents and Airbnb hosts receive the rest of the pitch. (2) Is your follow-up happening within 24 hours? The majority of leads that go quiet do so because they were not followed up the same day. Both of these are adjustments to what you say and when, not to how many people you contact.`);
    }

    if (hasAnyEnquiries && !hasAnyQuotes) {
      suggestions.push(`You have warm interest but no quotes sent. This is the most fixable problem in the tracker. Every enquiry that does not get a quote within 24 hours is a lost lead. Build a simple quote message you can paste and send in under 2 minutes — price per bedroom, what is included, and your availability. Speed of response matters as much as the offer itself.`);
    }
  }

  return { lines, suggestions };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReadingCard({ lines }) {
  return (
    <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      {lines.map((line, i) => {
        if (line.type === 'headline') return (
          <div key={i} style={{ padding: '14px 20px', borderBottom: `0.5px solid ${MKT.border}`, background: 'rgba(201,169,110,0.05)' }}>
            <div style={{ fontFamily: SERIF, fontSize: 16, color: MKT.gold, lineHeight: 1.5 }}>{line.text}</div>
          </div>
        );
        if (line.type === 'insight') return (
          <div key={i} style={{ padding: '13px 20px', borderBottom: `0.5px solid ${MKT.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.gold, marginBottom: 5 }}>{line.label}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{line.text}</div>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div style={{ flex: '0 0 calc(50% - 6px)', marginBottom: 10 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 }}>{label}</div>
      <input
        type="number" min="0" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '7px 10px', fontFamily: FONT, fontSize: 13, color: MKT.text, outline: 'none' }}
      />
    </div>
  );
}

function SectionHead({ label, hint }) {
  return (
    <div style={{ marginTop: 16, marginBottom: 10, paddingBottom: hint ? 8 : 6, borderBottom: `0.5px solid ${MKT.border}` }}>
      <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.gold, marginBottom: hint ? 5 : 0 }}>{label}</div>
      {hint && <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, lineHeight: 1.6 }}>{hint}</div>}
    </div>
  );
}

// ── Always-visible reference card ────────────────────────────────────────────

const BENCHMARKS = [
  {
    label: 'Airbnb hosts — fastest path',
    text: 'Facebook groups are the fastest channel. A well-worded post in a London Airbnb host group gets 1-5 enquiries. Expect a same-week conversation if the offer is compelling. Cold calling individual Airbnb hosts is difficult — they are private individuals with no switchboard. Facebook and direct messages convert faster.',
  },
  {
    label: 'Letting agents — realistic timeline',
    text: 'This is a 4-8 week cycle, not a week-one win. Expect to make 50-80 calls before a single trial booking materialises. Face-to-face visits to their offices convert better than calls alone. When calling or emailing, lead with your reviews: "We have seven five-star reviews on Google and are looking to build letting agent relationships in the area." That gives them a verifiable reason to take a chance.',
  },
  {
    label: 'Volume vs follow-up',
    text: 'Volume alone will not produce results. The quality of follow-up matters more than the number of first contacts. After every call, visit, or email where someone showed interest, follow up within 24 hours. Warm leads go cold within a week.',
  },
];

const FOLLOWUP_GUIDE = [
  {
    situation: 'They asked for info on a call',
    steps: [
      'Same day: email with your pricing and a link to your Google reviews',
      'Day 3-4: call back if no reply to the email',
      'Day 10: one final email ("Just checking this reached you")',
      'Month 2: brief check-in if you still think they are a good fit',
    ],
  },
  {
    situation: 'Facebook group enquiry',
    steps: [
      'Reply within 1 hour — Airbnb hosts contact multiple cleaners at once and go with whoever replies first',
      '48 hours later: one follow-up message if they have gone quiet',
      'After that: move on',
    ],
  },
  {
    situation: 'After a face-to-face visit',
    steps: [
      'Same day (before you get home): email with pricing and availability',
      'Day 3: call to confirm they received it and ask if they have questions',
      'Week 2: one more email if still no response',
    ],
  },
  {
    situation: 'Voicemail or no answer',
    steps: [
      'Try again at a different time of day (best: 10am-12pm or 2pm-4pm weekdays)',
      'Try once more after 2 days',
      'Send one email then move on',
    ],
  },
  {
    situation: 'How many total touchpoints before moving on',
    steps: [
      'Letting agents: 3-5 touchpoints spread over 4-6 weeks is normal before writing someone off. A typical sequence: call → email → call → email → final call. Most B2B relationships take this long to materialise.',
      'Airbnb hosts (Facebook/DM): 2 touchpoints maximum. Reply fast, follow up once if quiet, then move on.',
      'Clear rejection at any point: one contact total. Never contact again.',
    ],
  },
];

function ReferenceCard() {
  const [open, setOpen] = useState(true);
  const [showFollowup, setShowFollowup] = useState(false);

  return (
    <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
      {/* Header — always visible, toggles body */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'rgba(201,169,110,0.05)', border: 'none', borderBottom: open ? `0.5px solid ${MKT.border}` : 'none', padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
      >
        <span style={{ fontFamily: SERIF, fontSize: 15, color: MKT.gold }}>Outreach guide — benchmarks and follow-up cadence</span>
        <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim }}>{open ? '▲ hide' : '▼ show'}</span>
      </button>

      {open && (
        <>
          {/* Benchmarks */}
          {BENCHMARKS.map((item, i) => (
            <div key={i} style={{ padding: '13px 20px', borderBottom: `0.5px solid ${MKT.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.gold, marginBottom: 5 }}>{item.label}</div>
              <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{item.text}</div>
            </div>
          ))}

          {/* Follow-up guide toggle */}
          <button
            onClick={() => setShowFollowup(f => !f)}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: showFollowup ? `0.5px solid ${MKT.border}` : 'none', padding: '12px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
          >
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: MKT.gold }}>Follow-up cadence — exactly what to do after each contact</span>
            <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>{showFollowup ? '▲' : '▼'}</span>
          </button>

          {showFollowup && FOLLOWUP_GUIDE.map((entry, i) => (
            <div key={i} style={{ padding: '13px 20px', borderBottom: i < FOLLOWUP_GUIDE.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: MKT.text, marginBottom: 8 }}>{entry.situation}</div>
              {entry.steps.map((step, j) => (
                <div key={j} style={{ display: 'flex', gap: 10, marginBottom: j < entry.steps.length - 1 ? 6 : 0 }}>
                  <span style={{ color: MKT.gold, flexShrink: 0, fontFamily: FONT, fontSize: 12 }}>{j + 1}.</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.7 }}>{step}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OutreachTrackerContent() {
  const [log,      setLog]      = useState(loadLog);
  const [draft,    setDraft]    = useState({ ...EMPTY_WEEK, weekOf: getMondayOf(new Date().toISOString().slice(0, 10)) });
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  const reading = useMemo(() => generateReading(log), [log]);

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })); }

  function save() {
    if (!draft.weekOf) return;
    let updated;
    if (editId) {
      updated = log.map(w => w.id === editId ? { ...draft, id: editId } : w);
    } else {
      updated = [...log, { ...draft, id: `${Date.now()}` }];
    }
    updated.sort((a, b) => b.weekOf.localeCompare(a.weekOf));
    saveLog(updated);
    setLog(updated);
    setDraft({ ...EMPTY_WEEK, weekOf: getMondayOf(new Date().toISOString().slice(0, 10)) });
    setShowForm(false);
    setEditId(null);
  }

  function edit(week) {
    setDraft({ ...week });
    setEditId(week.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function remove(id) {
    const updated = log.filter(w => w.id !== id);
    saveLog(updated);
    setLog(updated);
  }

  const n = v => parseFloat(v) || 0;

  return (
    <div>
      {/* Always-visible reference guide */}
      <ReferenceCard />

      {/* Reading */}
      {reading && reading.lines.length > 0 && (
        <>
          <SLabel first>Your outreach reading <span style={{ display: 'inline-block', fontFamily: 'system-ui,sans-serif', fontSize: 8, color: '#c9a96e', background: 'rgba(201,169,110,0.12)', border: '0.5px solid rgba(201,169,110,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', textTransform: 'none', fontWeight: 500, verticalAlign: 'middle' }}>AI Adviser</span></SLabel>
          <ReadingCard lines={reading.lines} />
        </>
      )}

      {/* Suggestions */}
      {reading?.suggestions?.length > 0 && (
        <>
          <SLabel>What to focus on <span style={{ display: 'inline-block', fontFamily: 'system-ui,sans-serif', fontSize: 8, color: '#c9a96e', background: 'rgba(201,169,110,0.12)', border: '0.5px solid rgba(201,169,110,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', textTransform: 'none', fontWeight: 500, verticalAlign: 'middle' }}>AI Adviser</span></SLabel>
          <div style={{ background: MKT.dark2, border: `0.5px solid rgba(201,169,110,0.25)`, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            {reading.suggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < reading.suggestions.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
                <span style={{ color: MKT.gold, flexShrink: 0, fontFamily: FONT, fontSize: 13 }}>→</span>
                <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{s}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Log button */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); setEditId(null); setDraft({ ...EMPTY_WEEK, weekOf: getMondayOf(new Date().toISOString().slice(0, 10)) }); }} style={{
          fontFamily: FONT, fontSize: 13, padding: '9px 20px', borderRadius: 8,
          background: 'rgba(201,169,110,0.1)', border: `0.5px solid rgba(201,169,110,0.4)`,
          color: MKT.gold, cursor: 'pointer', marginBottom: 20,
        }}>
          + Log this week's outreach
        </button>
      )}

      {/* Entry form */}
      {showForm && (
        <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '20px', marginBottom: 20 }}>
          <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: MKT.text, marginBottom: 16 }}>{editId ? 'Edit week' : 'Log this week'}</div>

          {/* Week date */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 }}>Week start (Monday)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="date" value={draft.weekOf}
                onChange={e => set('weekOf', getMondayOf(e.target.value))}
                style={{ background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '7px 10px', fontFamily: FONT, fontSize: 13, color: MKT.text, outline: 'none' }} />
              {draft.weekOf && (
                <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.gold }}>
                  {getWeekRange(draft.weekOf)}
                </span>
              )}
            </div>
          </div>

          {/* Target type */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 8 }}>Who did you mainly target this week?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TARGET_TYPES.map(t => (
                <button key={t.id} onClick={() => set('target_type', t.id)} style={{
                  fontFamily: FONT, fontSize: 12, padding: '5px 14px', borderRadius: 20,
                  background: draft.target_type === t.id ? 'rgba(201,169,110,0.15)' : 'transparent',
                  border: `0.5px solid ${draft.target_type === t.id ? 'rgba(201,169,110,0.6)' : MKT.border}`,
                  color: draft.target_type === t.id ? MKT.gold : MKT.muted, cursor: 'pointer',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          <SectionHead label="Cold Calling" hint="Calls made = every dial including voicemails. Answered = real person picked up. Asked for info = they engaged (asked a question, said 'send me more info', or 'call back later') — flat rejections don't count. Quote sent = you actually sent them pricing." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <NumField label="Calls made"         value={draft.calls_made}       onChange={v => set('calls_made', v)} />
            <NumField label="Calls answered"      value={draft.calls_answered}   onChange={v => set('calls_answered', v)} />
            <NumField label="Asked for info"      value={draft.calls_interested}  onChange={v => set('calls_interested', v)} />
            <NumField label="Quote sent"          value={draft.calls_quotes}     onChange={v => set('calls_quotes', v)} />
          </div>

          <SectionHead label="Email / Direct Message Outreach" hint="Sent = every cold email you sent. Replied = any response at all (including negative). Positive reply = they want to know more or asked a question." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <NumField label="Sent"          value={draft.emails_sent}       onChange={v => set('emails_sent', v)} />
            <NumField label="Replied"       value={draft.emails_replied}    onChange={v => set('emails_replied', v)} />
            <NumField label="Positive reply" value={draft.emails_interested} onChange={v => set('emails_interested', v)} />
          </div>

          <SectionHead label="Facebook Groups / Online Posts" hint="Posts = number of group posts you made. Enquiries = DMs you received as a result of those posts." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <NumField label="Posts made"     value={draft.fb_posts}      onChange={v => set('fb_posts', v)} />
            <NumField label="Enquiries back" value={draft.fb_enquiries}  onChange={v => set('fb_enquiries', v)} />
          </div>

          <SectionHead label="Face-to-Face Visits" hint="Visited = walked in the door. Follow-up sent = you emailed them before you got home that same day. If you didn't send it same-day, it doesn't count here." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <NumField label="Businesses visited" value={draft.visits_made}    onChange={v => set('visits_made', v)} />
            <NumField label="Follow-up sent"     value={draft.visits_followup} onChange={v => set('visits_followup', v)} />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 }}>Notes (optional)</div>
            <textarea value={draft.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="What stood out this week — responses, objections, anything useful..."
              style={{ width: '100%', boxSizing: 'border-box', background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '8px 10px', fontFamily: FONT, fontSize: 13, color: MKT.text, outline: 'none', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={save} style={{ fontFamily: FONT, fontSize: 13, padding: '9px 22px', borderRadius: 8, background: MKT.gold, border: 'none', color: '#1a1410', fontWeight: 600, cursor: 'pointer' }}>Save week</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ fontFamily: FONT, fontSize: 13, padding: '9px 16px', borderRadius: 8, background: 'transparent', border: `0.5px solid ${MKT.border}`, color: MKT.muted, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* History table */}
      {log.length > 0 && (
        <>
          <SLabel>Outreach history</SLabel>
          <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 90px 1fr 1fr 1fr 60px', padding: '9px 16px', borderBottom: `0.5px solid ${MKT.border}` }}>
              {['Week of', 'Target', 'Calls', 'Email / DM', 'Visits / Posts', ''].map((h, i) => (
                <div key={i} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: MKT.dim }}>{h}</div>
              ))}
            </div>
            {log.map(w => {
              const typeLabel = TARGET_TYPES.find(t => t.id === w.target_type)?.label || w.target_type || '';
              return (
                <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '110px 90px 1fr 1fr 1fr 60px', padding: '11px 16px', borderBottom: `0.5px solid ${MKT.border}`, alignItems: 'center' }}>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.text }}>{new Date(w.weekOf + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>{typeLabel}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                    {n(w.calls_made) > 0 ? `${n(w.calls_made)} made · ${n(w.calls_answered)} ans` : '—'}
                    {n(w.calls_quotes) > 0 && <span style={{ color: MKT.green, marginLeft: 6 }}>{n(w.calls_quotes)} quote</span>}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                    {n(w.emails_sent) > 0 ? `${n(w.emails_sent)} sent · ${n(w.emails_replied)} rep` : '—'}
                    {n(w.fb_posts) > 0 && <span style={{ marginLeft: 6 }}>{n(w.fb_posts)} post{n(w.fb_posts) !== 1 ? 's' : ''}</span>}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted }}>
                    {n(w.visits_made) > 0 ? `${n(w.visits_made)} visited` : '—'}
                    {n(w.fb_enquiries) > 0 && <span style={{ color: MKT.gold, marginLeft: 6 }}>{n(w.fb_enquiries)} enq</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => edit(w)} style={{ background: 'none', border: 'none', color: MKT.dim, fontSize: 13, cursor: 'pointer', padding: '2px 4px' }} title="Edit">✎</button>
                    <button onClick={() => remove(w.id)} style={{ background: 'none', border: 'none', color: MKT.dim, fontSize: 13, cursor: 'pointer', padding: '2px 4px' }} title="Delete">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
