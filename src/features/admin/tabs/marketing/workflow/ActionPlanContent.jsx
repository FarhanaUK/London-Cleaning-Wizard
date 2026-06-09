import { useState, useMemo } from 'react';
import { MKT, FONT, SERIF, SLabel } from './MktShared';

const CHECKINS_KEY = 'lcw_action_checkins';
const OUTREACH_KEY = 'lcw_outreach_log';

function loadCheckins() {
  try { return JSON.parse(localStorage.getItem(CHECKINS_KEY)) || []; } catch { return []; }
}
function saveCheckins(c) {
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event('lcw-data-saved'));
}
function loadOutreach() {
  try { return JSON.parse(localStorage.getItem(OUTREACH_KEY)) || []; } catch { return []; }
}

// ── Funnel helpers ────────────────────────────────────────────────────────────

function getLastStep(session) {
  const events = [...(session.events || [])].sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  let last = null;
  for (const e of events) { if (e.type === 'step_entered') last = e.step; }
  return last;
}

function getDateStr(s) {
  return s.date || (s.updatedAt?.seconds ? new Date(s.updatedAt.seconds * 1000).toISOString().slice(0, 10) : null);
}

function funnelLast30(funnelData) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return funnelData.filter(s => { const d = getDateStr(s); return d && d >= cutoffStr; });
}

function topDropStage(sessions) {
  const stageCounts = {};
  sessions.filter(s => !s.converted).forEach(s => {
    const step = getLastStep(s) || 'Unknown';
    stageCounts[step] = (stageCounts[step] || 0) + 1;
  });
  const sorted = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

// ── Action plan builder ───────────────────────────────────────────────────────

function buildActionPlan(funnelData, outreachLog, checkinHistory) {
  const actions = [];

  // Grow reviews — you have 7, target is 15-20 for strong credibility with letting agents
  const growReviewsDone = checkinHistory.some(c =>
    c.actions?.some(a => a.id === 'grow_reviews' && a.done === 'yes')
  );

  if (!growReviewsDone) {
    actions.push({
      id: 'grow_reviews',
      priority: 'medium',
      category: 'Trust',
      action: 'After every completed clean this week, send a personal WhatsApp or text to the client asking for a Google review — include a direct link to your Google review page in the message.',
      why: 'You have 7 Google reviews, which is a solid foundation. At 15-20 reviews, the volume itself becomes persuasive to letting agents comparing you to established competitors. A direct link in a personal message roughly doubles the response rate compared to a generic ask.',
      expected: 'If 1 in 3 clients leaves a review when personally asked with a link, you need to ask 24 clients to reach 15. Start with the most recent clients first — the clean is still fresh in their minds.',
    });
  }

  // Funnel-based actions
  const recent30 = funnelLast30(funnelData);
  const funnelTotal = recent30.length;
  const funnelConverted = recent30.filter(s => s.converted).length;

  if (funnelTotal >= 5 && funnelConverted === 0) {
    const top = topDropStage(recent30);
    const topLower = (top || '').toLowerCase();
    const dropped = recent30.filter(s => !s.converted).length;
    const stageCounts = {};
    recent30.filter(s => !s.converted).forEach(s => {
      const step = getLastStep(s) || 'Unknown'; stageCounts[step] = (stageCounts[step] || 0) + 1;
    });
    const topCount = stageCounts[top] || 0;
    const topPct = dropped > 0 ? Math.round((topCount / dropped) * 100) : 0;

    const serviceFixDone = checkinHistory.some(c => c.actions?.some(a => a.id === 'service_fix' && a.done === 'yes'));
    const landingFixDone = checkinHistory.some(c => c.actions?.some(a => a.id === 'landing_fix' && a.done === 'yes'));

    if ((topLower.includes('service') || top === '2') && !serviceFixDone) {
      actions.push({
        id: 'service_fix',
        priority: 'high',
        category: 'Website',
        action: 'On the service selection page in the booking flow: (1) show Deep Reset prices per bedroom size rather than just "from £225" — visitors need a realistic maximum, not just a minimum; (2) show the 10% house surcharge on the service card itself, not after property type is selected; (3) if Google Ads sends residential traffic, pre-select the Home Cleaning tab so visitors land on the right options immediately.',
        why: `${topPct}% of your visitors are stopping at the service selection step. Pricing is visible here, so that is not the problem. The issues are: price ambiguity at the premium end (Deep Clean has no upper limit shown), an unexpected surcharge that appears after selection, and an extra tab decision at entry. These are specific friction points, not missing information.`,
        expected: 'Fixing the Deep Clean price display and moving the surcharge disclosure earlier removes two sources of price surprise. Even a 5% improvement in service-page conversion means 1 extra booking per 20 visitors who reach this step.',
      });
    }

    if ((topLower.includes('landing') || top === '1') && !landingFixDone) {
      actions.push({
        id: 'landing_fix',
        priority: 'high',
        category: 'Website',
        action: 'Check your Google Ads destination URLs — they should point directly to the booking flow service selection page, not the homepage. Also add a "from £X" price line to each service card on the homepage so visitors browsing organically can see costs without entering the booking flow.',
        why: `${topPct}% of drop-offs are at the landing stage. Your homepage already has pricing and trust signals in the hero, so those are not the issue. The main causes are: paid traffic landing on the homepage (an extra click away from booking), and the six service cards showing no prices (organic visitors have to enter the flow just to see a cost).`,
        expected: 'Pointing Google Ads directly to the booking service selection page removes one full click from the journey. Adding prices to homepage service cards reduces uncertainty for organic visitors before they commit to clicking.',
      });
    }
  }

  // Outreach-based actions
  const sortedOutreach = [...outreachLog].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
  const latestOutreach = sortedOutreach[0];
  const fbPostsLast = parseFloat(latestOutreach?.fb_posts) || 0;
  const visitsLast2wk = sortedOutreach.slice(0, 2).reduce((s, w) => s + (parseFloat(w?.visits_made) || 0), 0);

  if (fbPostsLast === 0) {
    actions.push({
      id: 'fb_group_post',
      priority: 'high',
      category: 'Airbnb outreach',
      action: 'Post in 2-3 London Airbnb host Facebook groups. Write it as a personal introduction, not an advertisement. Offer a first clean at a reduced rate. Do not list prices in the post — let people message you.',
      why: 'Facebook groups are the fastest channel to reach Airbnb hosts. They make decisions alone and quickly — the decision cycle is days, not weeks. A genuine-sounding post in an active London host group can produce enquiries the same day. An advert-sounding post produces zero.',
      expected: '1-3 enquiries per post if the tone is conversational. Zero if it reads like a promotional post. The post should feel like a person introducing themselves, not a business listing services.',
    });
  }

  if (visitsLast2wk < 3) {
    const targetType = latestOutreach?.target_type;
    if (!targetType || targetType === 'letting' || targetType === 'mixed') {
      actions.push({
        id: 'letting_visits',
        priority: 'medium',
        category: 'Letting agents',
        action: 'Walk into 3-5 letting agent offices in your area. Ask for the property manager by name (look it up on their website first). Leave a pricing card. Send a follow-up email from the car before you drive away.',
        why: 'Face-to-face is the highest-converting channel for letting agents. A visit is 5-10x more memorable than a cold email. The same-day follow-up email moves you from "the cleaner who came in" to "someone with a paper trail I can action." Without it, the visit is forgotten.',
        expected: '1 in 5-10 visits typically leads to a trial booking conversation over 4-6 weeks — not immediately. This is a medium-term play, but it is the most reliable path to a recurring letting agent relationship.',
      });
    }
  }

  return actions;
}

// ── Combined reading ──────────────────────────────────────────────────────────

function generateCombinedReading(funnelData, outreachLog, checkinHistory) {
  const lines = [];
  const suggestions = [];

  const sorted = [...checkinHistory].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
  const lastCheckin = sorted[0];

  // Days since last check-in
  const daysSinceLast = lastCheckin
    ? Math.floor((Date.now() - new Date(lastCheckin.weekOf).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Funnel summary (30 days)
  const recent30 = funnelLast30(funnelData);
  const funnelTotal = recent30.length;
  const funnelConverted = recent30.filter(s => s.converted).length;

  // Outreach summary (last 2 weeks)
  const sortedOut = [...outreachLog].sort((a, b) => b.weekOf.localeCompare(a.weekOf)).slice(0, 2);
  const totalCalls  = sortedOut.reduce((s, w) => s + (parseFloat(w.calls_made) || 0), 0);
  const totalPosts  = sortedOut.reduce((s, w) => s + (parseFloat(w.fb_posts)   || 0), 0);
  const totalVisits = sortedOut.reduce((s, w) => s + (parseFloat(w.visits_made)|| 0), 0);
  const hasOutreach = totalCalls > 0 || totalPosts > 0 || totalVisits > 0;

  // Stale data warning
  if (daysSinceLast !== null && daysSinceLast > 14) {
    lines.push({ type: 'headline', text: `Last check-in was ${daysSinceLast} days ago. This reading is working from incomplete data.` });
    suggestions.push(`Without a weekly check-in, the system cannot tell whether results are flat because you are not doing the actions, or because the actions are not working. Those require completely different responses. Log this week's check-in to get an accurate reading.`);
    return { lines, suggestions };
  }

  if (!lastCheckin) {
    lines.push({ type: 'headline', text: 'No check-ins logged yet. Complete your first check-in to get your combined reading.' });
    return { lines, suggestions };
  }

  // Completion analysis
  const total    = lastCheckin.actions?.length || 0;
  const done     = lastCheckin.actions?.filter(a => a.done === 'yes').length || 0;
  const partial  = lastCheckin.actions?.filter(a => a.done === 'partial').length || 0;
  const skipped  = lastCheckin.actions?.filter(a => a.done === 'no').length || 0;

  const criticalSkipped = lastCheckin.actions?.filter(a => a.done === 'no' && a.priority === 'critical') || [];
  const highSkipped     = lastCheckin.actions?.filter(a => a.done === 'no' && a.priority === 'high') || [];

  lines.push({
    type: 'headline',
    text: `Last week: ${done} of ${total} action${total !== 1 ? 's' : ''} completed.${partial > 0 ? ` ${partial} partial.` : ''} ${skipped > 0 ? `${skipped} not done.` : ''}`,
  });

  if (criticalSkipped.length > 0) {
    lines.push({
      type: 'alert',
      text: `A critical action was not completed last week: ${criticalSkipped.map(a => a.action).join('; ')}. This has the largest impact on the plan this week — prioritise it before everything else.`,
    });
  }

  if (highSkipped.length > 0 && criticalSkipped.length === 0) {
    lines.push({
      type: 'alert',
      text: `${highSkipped.length} high-priority action${highSkipped.length !== 1 ? 's were' : ' was'} not completed last week: ${highSkipped.map(a => a.category).join(', ')}. These are the most likely levers for moving the current numbers.`,
    });
  }

  // Funnel context
  if (funnelTotal >= 5) {
    lines.push({
      type: 'insight',
      label: 'Funnel (last 30 days)',
      text: funnelConverted === 0
        ? `${funnelTotal} visitor${funnelTotal !== 1 ? 's' : ''}, 0 bookings. The website is not converting. ${funnelTotal >= 30 ? 'This is a confirmed pattern — not a small-sample issue. Something in the page itself is blocking conversion regardless of where traffic comes from.' : 'More traffic will not help until the conversion issue is addressed.'}`
        : `${funnelTotal} visitor${funnelTotal !== 1 ? 's' : ''}, ${funnelConverted} booking${funnelConverted !== 1 ? 's' : ''} (${((funnelConverted / funnelTotal) * 100).toFixed(1)}% conversion rate).`,
    });
  }

  // Outreach context
  if (hasOutreach) {
    const parts = [];
    if (totalCalls > 0) parts.push(`${totalCalls} calls`);
    if (totalPosts > 0) parts.push(`${totalPosts} group posts`);
    if (totalVisits > 0) parts.push(`${totalVisits} visits`);

    const noBookings = funnelConverted === 0;
    lines.push({
      type: 'insight',
      label: 'Outreach (last 2 weeks)',
      text: `${parts.join(', ')} logged.${noBookings && hasOutreach ? ' Keep logging weekly — the reading tracks whether response rates are improving over time, which is the earliest signal that the outreach is working before bookings arrive.' : ''}`,
    });
  }

  // Overall diagnosis
  if (done === 0 && total > 0) {
    suggestions.push(`Nothing from last week's plan was completed. Before changing strategy, ask whether the issue is the plan or the execution. If the same actions keep being skipped, address what is making them difficult — whether that is time, not knowing exactly how to do them, or something else. The plan cannot produce results it is not given the chance to run.`);
  } else if (done >= total && funnelConverted === 0) {
    suggestions.push(`You completed all the recommended actions and still saw 0 bookings. That rules out "not doing the work" as the cause. The most likely explanation is timeline: letting agent relationships take 4-8 weeks, Facebook enquiries need follow-up before they convert, and website fixes take time to show up in conversion data. Stay consistent for 3-4 weeks before concluding an action is not working.`);
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
        if (line.type === 'alert') return (
          <div key={i} style={{ padding: '13px 20px', borderBottom: `0.5px solid ${MKT.border}`, borderLeft: `3px solid #ef4444`, background: 'rgba(239,68,68,0.04)' }}>
            <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{line.text}</div>
          </div>
        );
        return null;
      })}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308' };
  return (
    <span style={{
      fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: colors[priority] || MKT.dim,
      border: `0.5px solid ${colors[priority] || MKT.dim}`,
      borderRadius: 4, padding: '2px 6px',
    }}>{priority}</span>
  );
}

function DoneToggle({ value, onChange }) {
  const opts = [
    { v: 'yes',     label: 'Done',    color: '#16a34a' },
    { v: 'partial', label: 'Partial', color: '#d97706' },
    { v: 'no',      label: 'Not done',color: '#ef4444' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          fontFamily: FONT, fontSize: 11, padding: '4px 12px', borderRadius: 20,
          background: value === o.v ? `${o.color}20` : 'transparent',
          border: `0.5px solid ${value === o.v ? o.color : MKT.border}`,
          color: value === o.v ? o.color : MKT.dim,
          cursor: 'pointer',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ActionPlanContent({ funnelData = [], bookings = [] }) {
  const [checkins, setCheckins] = useState(loadCheckins);
  const outreachLog = useMemo(loadOutreach, []);

  const actionPlan = useMemo(
    () => buildActionPlan(funnelData, outreachLog, checkins),
    [funnelData, outreachLog, checkins]
  );

  const reading = useMemo(
    () => generateCombinedReading(funnelData, outreachLog, checkins),
    [funnelData, outreachLog, checkins]
  );

  const [draft, setDraft] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function startCheckin() {
    const weekOf = new Date().toISOString().slice(0, 10);
    // Pre-populate from action plan
    setDraft({
      id: `${Date.now()}`,
      weekOf,
      actions: actionPlan.map(a => ({
        id: a.id,
        action: a.action,
        priority: a.priority,
        category: a.category,
        done: null,
        notes: '',
      })),
    });
    setShowForm(true);
  }

  function setActionField(id, field, val) {
    setDraft(d => ({
      ...d,
      actions: d.actions.map(a => a.id === id ? { ...a, [field]: val } : a),
    }));
  }

  function saveCheckin() {
    if (!draft) return;
    const updated = [draft, ...checkins.filter(c => c.weekOf !== draft.weekOf)];
    saveCheckins(updated);
    setCheckins(updated);
    setDraft(null);
    setShowForm(false);
  }

  const sortedCheckins = useMemo(
    () => [...checkins].sort((a, b) => b.weekOf.localeCompare(a.weekOf)),
    [checkins]
  );

  return (
    <div>
      {/* Combined reading */}
      {(reading.lines.length > 0 || reading.suggestions.length > 0) && (
        <>
          <SLabel first>Combined reading <span style={{ display: 'inline-block', fontFamily: 'system-ui,sans-serif', fontSize: 8, color: '#c9a96e', background: 'rgba(201,169,110,0.12)', border: '0.5px solid rgba(201,169,110,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', textTransform: 'none', fontWeight: 500, verticalAlign: 'middle' }}>AI Adviser</span></SLabel>
          {reading.lines.length > 0 && <ReadingCard lines={reading.lines} />}
          {reading.suggestions.length > 0 && (
            <div style={{ background: MKT.dark2, border: `0.5px solid rgba(201,169,110,0.25)`, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              {reading.suggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < reading.suggestions.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
                  <span style={{ color: MKT.gold, flexShrink: 0, fontFamily: FONT, fontSize: 13 }}>→</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Current action plan */}
      {actionPlan.length > 0 && !showForm && (
        <>
          <SLabel>This week's action plan</SLabel>
          <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            {actionPlan.map((a, i) => (
              <div key={a.id} style={{ padding: '16px 20px', borderBottom: i < actionPlan.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <PriorityBadge priority={a.priority} />
                  <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.category}</span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text, lineHeight: 1.65, marginBottom: 8 }}>{a.action}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, lineHeight: 1.7, marginBottom: 6 }}>
                  <strong style={{ color: MKT.muted, fontWeight: 500 }}>Why: </strong>{a.why}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, lineHeight: 1.7 }}>
                  <strong style={{ color: MKT.muted, fontWeight: 500 }}>Expected: </strong>{a.expected}
                </div>
              </div>
            ))}
          </div>

          <button onClick={startCheckin} style={{
            fontFamily: FONT, fontSize: 13, padding: '9px 20px', borderRadius: 8,
            background: 'rgba(201,169,110,0.1)', border: `0.5px solid rgba(201,169,110,0.4)`,
            color: MKT.gold, cursor: 'pointer', marginBottom: 24,
          }}>
            Log this week's check-in
          </button>
        </>
      )}

      {/* Check-in form */}
      {showForm && draft && (
        <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: MKT.text, marginBottom: 4 }}>Weekly check-in</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 20 }}>
            {new Date(draft.weekOf + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>

          {draft.actions.map((a, i) => (
            <div key={a.id} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < draft.actions.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <PriorityBadge priority={a.priority} />
                <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.category}</span>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text, lineHeight: 1.6, marginBottom: 10 }}>{a.action}</div>
              <DoneToggle value={a.done} onChange={v => setActionField(a.id, 'done', v)} />
              {a.done && a.done !== null && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    value={a.notes}
                    onChange={e => setActionField(a.id, 'notes', e.target.value)}
                    placeholder="Optional: what happened, what you noticed..."
                    style={{ width: '100%', boxSizing: 'border-box', background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '7px 10px', fontFamily: FONT, fontSize: 12, color: MKT.text, outline: 'none' }}
                  />
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={saveCheckin} style={{ fontFamily: FONT, fontSize: 13, padding: '9px 22px', borderRadius: 8, background: MKT.gold, border: 'none', color: '#1a1410', fontWeight: 600, cursor: 'pointer' }}>Save check-in</button>
            <button onClick={() => { setShowForm(false); setDraft(null); }} style={{ fontFamily: FONT, fontSize: 13, padding: '9px 16px', borderRadius: 8, background: 'transparent', border: `0.5px solid ${MKT.border}`, color: MKT.muted, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* No actions — everything completed */}
      {actionPlan.length === 0 && !showForm && (
        <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.dim, padding: '24px 0' }}>
          All current actions are marked complete. The plan will update as new data comes in.
        </div>
      )}

      {/* Check-in history */}
      {sortedCheckins.length > 0 && (
        <>
          <SLabel>Check-in history</SLabel>
          <div style={{ background: MKT.dark2, border: `0.5px solid ${MKT.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            {sortedCheckins.map((c, ci) => {
              const total   = c.actions?.length || 0;
              const done    = c.actions?.filter(a => a.done === 'yes').length || 0;
              const partial = c.actions?.filter(a => a.done === 'partial').length || 0;
              const skipped = c.actions?.filter(a => a.done === 'no').length || 0;
              return (
                <div key={c.id} style={{ borderBottom: ci < sortedCheckins.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
                    <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.text }}>
                      {new Date(c.weekOf + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {done > 0    && <span style={{ fontFamily: FONT, fontSize: 11, color: '#16a34a' }}>{done} done</span>}
                      {partial > 0 && <span style={{ fontFamily: FONT, fontSize: 11, color: '#d97706' }}>{partial} partial</span>}
                      {skipped > 0 && <span style={{ fontFamily: FONT, fontSize: 11, color: '#ef4444' }}>{skipped} skipped</span>}
                      <button onClick={() => {
                        const updated = checkins.filter(x => x.id !== c.id);
                        saveCheckins(updated);
                        setCheckins(updated);
                      }} style={{ background: 'none', border: 'none', color: MKT.dim, fontSize: 13, cursor: 'pointer', padding: '2px 4px' }} title="Delete">×</button>
                    </div>
                  </div>
                  {c.actions?.some(a => a.notes) && (
                    <div style={{ padding: '0 20px 12px' }}>
                      {c.actions.filter(a => a.notes).map(a => (
                        <div key={a.id} style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 }}>
                          <span style={{ color: MKT.muted, fontWeight: 500 }}>{a.category}: </span>{a.notes}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
