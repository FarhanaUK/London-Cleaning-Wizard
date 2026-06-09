import { useState, useRef, useEffect } from 'react';
import { SLabel, Divider, MKT, FONT, genId, buildContext } from './MktShared';
import { readBusinessData, readOutreachPulse, computePrediction, getMilestoneIndex, MILESTONES, buildBriefContext } from './businessIntelligence';

const MODEL   = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const KEY_SK  = 'lcw_anthropic_key';
const REV_SK  = 'lcw_weekly_reviews';

const CHANNEL_COLLECT = {
  cold_calling:     { label: 'Cold calling',          items: ['Calls made + calls answered (pick-up rate)', 'Showed interest or asked for pricing', 'Quotes / prices sent this week', 'Call follow-ups completed (day 3-5)'] },
  face_to_face:     { label: 'Face-to-face visits',   items: ['Visits completed this week', 'Same-day emails sent after visits', 'Responses or interest shown'] },
  facebook_groups:  { label: 'Facebook groups',       items: ['Posts this week + which groups', 'Enquiries received', 'Converted to bookings'] },
  email_outreach:   { label: 'Email outreach',        items: ['Emails sent this week', 'Replies received', 'Follow-ups completed (day 3-4)'] },
  google_business:  { label: 'Google Business',       items: ['Posts published this week', 'New reviews received (total now: X)', 'Review requests sent via WhatsApp'] },
  personal_network: { label: 'Personal network',      items: ['WhatsApp status updated (yes/no)', 'Direct messages sent', 'Enquiries or bookings from this channel'] },
  google_ads:       { label: 'Google Ads',            items: ['Campaign overview (impressions, clicks, CTR, spend, conversions)', 'Keyword performance — all keywords with clicks, CTR, spend', 'Search terms report — what people actually typed', 'Ad performance — which ad copy has the best CTR'] },
  lsa:              { label: 'Local Services Ads',    items: ['Leads received this week', 'Lead response time (first reply)', 'Bookings confirmed from LSA'] },
};

const ALWAYS_COLLECT = { label: 'Always', items: ['New bookings this week (total)', 'Any trials or partnerships confirmed'] };

const CHANNEL_ADVICE = {
  cold_calling:     '→ If call volume is reported: ask about pick-up rate and interest rate — these are the leading indicators, not just total calls',
  face_to_face:     '→ If face-to-face visits are reported: ask whether same-day emails were sent — this follow-up is non-negotiable',
  facebook_groups:  '→ If Facebook posts are reported: ask about the post tone — did it read like a person or an advert? This is the biggest factor',
  email_outreach:   '→ If email outreach is reported: ask about open rates and follow-up cadence — day 3-4 follow-ups drive replies',
  google_business:  '→ If Google Business activity is reported: check review count progress — growing from 7 to 20+ is a priority',
  personal_network: '→ If personal network activity is reported: ask how many contacts were reached and any bookings that came from it',
  google_ads:       '→ If someone asks about Google Ads: note it is paused until the booking funnel is fixed — do not recommend reactivating until Deep Reset prices, the surcharge disclosure, and the ad destination URL are resolved',
  lsa:              '→ If LSA activity is reported: check lead response time — first to reply wins most LSA bookings',
};

function readBudget() {
  try { return JSON.parse(localStorage.getItem('mkt_budget_rows_v2')) || []; } catch { return []; }
}

function getChannelType(name = '') {
  const n = name.toLowerCase();
  if (n.includes('cold call')) return 'cold_calling';
  if (n.includes('face-to-face') || n.includes('visit')) return 'face_to_face';
  if (n.includes('facebook')) return 'facebook_groups';
  if (n.includes('email outreach')) return 'email_outreach';
  if (n.includes('google business')) return 'google_business';
  if (n.includes('personal network')) return 'personal_network';
  if (n.includes('google ads')) return 'google_ads';
  if (n.includes('lsa')) return 'lsa';
  return null;
}

function buildSystemPrompt(rows, bookings = []) {
  const activeRows  = rows.filter(r => r.active !== false);
  const activeNames = activeRows.map(r => r.name).join(', ') || 'none currently set';
  const totalBudget = activeRows.reduce((s, r) => s + (r.amount || 0), 0);
  const googleAdsRow = rows.find(r => r.name?.toLowerCase().includes('google ads'));
  const googleAdsPaused = !googleAdsRow || googleAdsRow.active === false;
  const channelAdvice = activeRows
    .map(r => CHANNEL_ADVICE[getChannelType(r.name)])
    .filter(Boolean)
    .join('\n');

  // Live business intelligence
  const bizData  = readBusinessData(bookings);
  const pulse    = readOutreachPulse();
  const pred     = computePrediction(bizData, pulse);
  const midx     = getMilestoneIndex(bizData);
  const nextM    = MILESTONES[midx + 1];
  const briefCtx = buildBriefContext(bizData, pulse, pred);

  return `You are The Wizard, the dedicated marketing advisor for London Cleaning Wizard — a premium residential cleaning business in London run by Farhana.

Business context:
→ Premium residential cleaning in London — never "cheap" or "affordable"
→ ${bizData.googleReviews} Google reviews currently — growing to 20+ is a priority
→ Active channels: ${activeNames}
→ Monthly marketing budget: ${totalBudget > 0 ? `£${totalBudget}` : 'all free (no paid channels active)'}
${googleAdsPaused ? '→ Google Ads paused — funnel issues: Deep Reset price ambiguity, house surcharge shown too late, ad destination URL not pointing to booking flow' : '→ Google Ads active — check spend, conversions, and search terms weekly'}
→ Letting agent timeline: realistic 4-8 weeks from first contact to first booking — do not suggest dropping a prospect after 1-2 touchpoints
→ Airbnb hosts via Facebook groups: reply speed is the critical variable — first to reply has the best chance

Live business data (read and use this in every response):
${briefCtx}
→ Current milestone: ${midx >= 0 ? MILESTONES[midx].label : 'none complete yet'}
→ Next milestone to hit: ${nextM ? `${nextM.label} (${nextM.timeframe})` : 'all milestones complete'}

How to use this data:
→ Always open your analysis by referencing where the business currently stands (days since last booking, booking count, outreach velocity)
→ If the prediction signal is "Action required" or "Needs attention" — lead with the most important corrective action before anything else
→ If days since last booking exceeds 14: flag this explicitly and help identify why conversion is stalling
→ If outreach velocity is below target: quantify the gap and give a specific number to aim for this week
→ If velocity is good but bookings are not converting: focus on follow-up cadence, not channel changes
→ Always tie advice to the specific active channels (${activeNames})
→ Never give generic advice — always ground it in the specific numbers they have shared
${channelAdvice}`;
}

function AiText({ text, loading }) {
  function renderInline(str) {
    return str.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
      /^\*\*[^*]+\*\*$/.test(p)
        ? <strong key={i} style={{ color: MKT.text, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );
  }
  return (
    <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.85 }}>
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (/^={2,}\s*.+\s*={2,}$/.test(t)) return (
          <div key={i} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: MKT.gold, marginTop: 18, marginBottom: 7, paddingBottom: 5, borderBottom: `0.5px solid rgba(37,99,235,0.2)` }}>
            {t.replace(/^=+\s*/, '').replace(/\s*=+$/, '')}
          </div>
        );
        if (t === '') return <div key={i} style={{ height: 7 }} />;
        if (t.startsWith('→')) return (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <span style={{ color: MKT.gold, flexShrink: 0 }}>→</span>
            <span>{renderInline(t.slice(1).trim())}</span>
          </div>
        );
        if (/^\d+\./.test(t)) return (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
            <span style={{ color: MKT.gold, flexShrink: 0, minWidth: 18 }}>{t.match(/^\d+/)[0]}.</span>
            <span>{renderInline(t.replace(/^\d+\.\s*/, ''))}</span>
          </div>
        );
        if (t.startsWith('- ')) return (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
            <span style={{ color: MKT.gold, flexShrink: 0 }}>·</span>
            <span>{renderInline(t.slice(2))}</span>
          </div>
        );
        return <div key={i} style={{ padding: '1px 0' }}>{renderInline(line)}</div>;
      })}
      {loading && <span style={{ color: MKT.dim, fontWeight: 300 }}>▌</span>}
    </div>
  );
}

function ChatMsg({ msg, isLast, loading }) {
  const isBot = msg.role === 'assistant';
  const isDataDump = msg.isPaste;
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexDirection: isBot ? 'row' : 'row-reverse' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isBot ? MKT.dark4 : 'rgba(37,99,235,0.08)', border: `0.5px solid ${isBot ? MKT.border : 'rgba(37,99,235,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 9, color: isBot ? MKT.gold : MKT.blue }}>
          {isBot ? 'W' : 'You'}
        </div>
        {isBot && <span style={{ fontFamily: FONT, fontSize: 8, color: MKT.dim, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>AI Adviser</span>}
      </div>
      <div style={{ maxWidth: '85%', background: isBot ? MKT.dark3 : 'rgba(37,99,235,0.04)', border: `0.5px solid ${isBot ? MKT.border : 'rgba(37,99,235,0.12)'}`, borderRadius: isBot ? '4px 10px 10px 10px' : '10px 4px 10px 10px', padding: '10px 14px' }}>
        {isDataDump ? (
          <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, fontStyle: 'italic' }}>
            Weekly data pasted ({msg.content.length.toLocaleString()} characters)
          </div>
        ) : isBot ? (
          <AiText text={msg.content} loading={isLast && loading} />
        ) : (
          <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        )}
      </div>
    </div>
  );
}

export default function WeeklyReviewContent({ bookings = [] }) {
  const [checked,     setChecked]     = useState({});
  const [paste,       setPaste]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatStarted, setChatStarted] = useState(false);
  const [reviews,     setReviews]     = useState(() => { try { return JSON.parse(localStorage.getItem(REV_SK)) || []; } catch { return []; } });
  const [expanded,    setExpanded]    = useState(null);
  const [saved,       setSaved]       = useState(false);
  const [apiKey]                      = useState(() => localStorage.getItem(KEY_SK) || '');
  const [budgetRows,  setBudgetRows]  = useState(readBudget);

  const abortRef    = useRef(null);
  const scrollRef   = useRef(null);
  const inputRef    = useRef(null);
  const msgsRef     = useRef([]);
  const systemRef   = useRef('');

  useEffect(() => {
    const refresh = () => setBudgetRows(readBudget());
    window.addEventListener('lcw-data-saved', refresh);
    return () => window.removeEventListener('lcw-data-saved', refresh);
  }, []);

  const activeRows    = budgetRows.filter(r => r.active !== false);
  const collectGroups = [
    ...activeRows
      .map(r => ({ type: getChannelType(r.name), r }))
      .filter(({ type }) => type && CHANNEL_COLLECT[type])
      .map(({ type }) => CHANNEL_COLLECT[type]),
    ALWAYS_COLLECT,
  ];
  const totalItems   = collectGroups.reduce((s, g) => s + g.items.length, 0);
  const totalChecked = Object.values(checked).filter(Boolean).length;

  useEffect(() => { localStorage.setItem(REV_SK, JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function toggle(id) { setChecked(p => ({ ...p, [id]: !p[id] })); }

  async function callApi(apiMessages, botId, systemPrompt) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch(API_URL, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: MODEL, max_tokens: 2048, stream: true, system: systemPrompt, messages: apiMessages }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const p = JSON.parse(raw);
            if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta' && p.delta.text) {
              full += p.delta.text;
              setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: full } : m));
            }
          } catch {}
        }
      }
      setLoading(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: `Error: ${err.message}. Check your API key.` } : m));
        setLoading(false);
      }
    }
  }

  async function startReview() {
    if (!paste.trim() || !apiKey || loading) return;
    setLoading(true);
    setSaved(false);
    setChatStarted(true);
    systemRef.current = buildSystemPrompt(budgetRows, bookings);
    const userMsg = { id: genId(), role: 'user', content: paste, isPaste: true };
    const botMsg  = { id: genId(), role: 'assistant', content: '' };
    setMessages([userMsg, botMsg]);
    const ctx = buildContext();
    await callApi([{ role: 'user', content: `${ctx}\n\n---\n\nHere is this week's raw marketing data:\n\n${paste}` }], botMsg.id, systemRef.current);
  }

  async function sendFollowUp() {
    const text = chatInput.trim();
    if (!text || loading || !apiKey) return;
    setChatInput('');
    setLoading(true);
    setSaved(false);

    const userMsg = { id: genId(), role: 'user', content: text };
    const botMsg  = { id: genId(), role: 'assistant', content: '' };
    const current = msgsRef.current;
    setMessages([...current, userMsg, botMsg]);

    const apiMessages = [];
    for (const m of current) {
      if (!m.content) continue;
      if (m.isPaste) {
        apiMessages.push({ role: 'user', content: `Here is this week's raw marketing data:\n\n${m.content}` });
      } else {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }
    apiMessages.push({ role: 'user', content: text });
    await callApi(apiMessages, botMsg.id, systemRef.current);
  }

  function saveReview() {
    if (!messages.length || loading) return;
    const now = new Date();
    setReviews(prev => [{
      id:       now.toISOString(),
      date:     now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      messages,
    }, ...prev].slice(0, 20));
    setSaved(true);
  }

  function resetChat() {
    abortRef.current?.abort();
    setMessages([]); setChatStarted(false); setLoading(false); setSaved(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFollowUp(); }
  }

  return (
    <div>

      {/* Combined checklist + paste area */}
      <SLabel first>Collect &amp; paste weekly data</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>

        {totalItems > 0 && (
          <div style={{ padding: '10px 1.25rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted }}>Every Sunday — tick each item as you paste it below</span>
              <span style={{ fontFamily: FONT, fontSize: 11, color: totalChecked === totalItems ? MKT.green : MKT.muted, fontWeight: 500 }}>{totalChecked}/{totalItems} collected</span>
            </div>
            <div style={{ background: MKT.dark4, borderRadius: 3, height: 3, marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${Math.round((totalChecked / totalItems) * 100)}%`, background: totalChecked === totalItems ? MKT.green : MKT.blue, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', borderTop: `0.5px solid ${MKT.border}`, flexDirection: typeof window !== 'undefined' && window.innerWidth < 640 ? 'column' : 'row' }}>

          {/* Checklist column */}
          <div style={{ width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 280, flexShrink: 0, borderRight: typeof window !== 'undefined' && window.innerWidth >= 640 ? `0.5px solid ${MKT.border}` : 'none', borderBottom: typeof window !== 'undefined' && window.innerWidth < 640 ? `0.5px solid ${MKT.border}` : 'none', overflowY: 'auto', maxHeight: 300, padding: '1rem 1.25rem' }}>
            {collectGroups.length === 1 && (
              <p style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, margin: 0 }}>No active channels — go to the Budget tab and toggle channels on.</p>
            )}
            {collectGroups.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MKT.blue, marginBottom: 5 }}>{group.label}</div>
                {group.items.map((item, ii) => {
                  const key = `g${gi}_${ii}`;
                  return (
                    <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(key)} style={{ marginTop: 2, accentColor: MKT.blue, flexShrink: 0 }} />
                      <span style={{ fontFamily: FONT, fontSize: 11, color: checked[key] ? MKT.green : MKT.muted, textDecoration: checked[key] ? 'line-through' : 'none', lineHeight: 1.45 }}>{item}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Paste column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem 1.25rem', minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted, marginBottom: 8, lineHeight: 1.6 }}>
              Paste everything here — Ads keyword tables, overview stats, Instagram insights, LSA data. Label each section with the campaign or channel name.
            </div>
            <textarea
              value={paste}
              onChange={e => { setPaste(e.target.value); if (chatStarted) resetChat(); }}
              placeholder="=== COLD CALLING ===&#10;Calls made: _ · Answered: _ · Showed interest: _ · Quotes sent: _&#10;&#10;=== FACEBOOK GROUPS ===&#10;Posts this week: _ · Enquiries received: _ · Converted to bookings: _&#10;&#10;=== FACE-TO-FACE VISITS ===&#10;Visits: _ · Same-day emails sent: _ · Responses: _&#10;&#10;=== FOLLOW-UPS ===&#10;Day 3-4 follow-ups completed: _ · Positive replies: _&#10;&#10;=== BOOKINGS ===&#10;New bookings this week: _ · Any trials or partnerships confirmed:"
              style={{ flex: 1, minHeight: 300, background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 8, padding: '10px 12px', color: MKT.text, fontFamily: FONT, fontSize: 12, outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', width: '100%' }}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <button
                onClick={chatStarted ? resetChat : startReview}
                disabled={!paste.trim() || loading || !apiKey}
                style={{ background: paste.trim() && !loading && apiKey ? 'rgba(37,99,235,0.1)' : 'transparent', border: `0.5px solid ${paste.trim() && !loading && apiKey ? MKT.borderStrong : MKT.border}`, borderRadius: 6, padding: '7px 20px', color: paste.trim() && !loading && apiKey ? MKT.gold : MKT.dim, fontSize: 13, fontFamily: FONT, cursor: paste.trim() && !loading && apiKey ? 'pointer' : 'default' }}
              >
                {loading ? 'Thinking...' : chatStarted ? 'Start over' : 'Start review with The Wizard'}
              </button>
              {!apiKey && <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.amber }}>Enter your API key in The Wizard chat first</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Inline chat */}
      {chatStarted && (
        <>
          <SLabel>Weekly review chat</SLabel>
          <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>

            {/* Messages */}
            <div ref={scrollRef} style={{ padding: '1.25rem', maxHeight: 500, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${MKT.dark4} transparent` }}>
              {messages.map((msg, i) => (
                <ChatMsg key={msg.id} msg={msg} isLast={i === messages.length - 1} loading={loading} />
              ))}
            </div>

            {/* Follow-up input */}
            <div style={{ borderTop: `0.5px solid ${MKT.border}`, padding: '0.75rem 1.25rem', background: MKT.dark3, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a follow-up question..."
                rows={1}
                style={{ flex: 1, background: MKT.bg, border: `0.5px solid ${MKT.border}`, borderRadius: 8, padding: '7px 11px', color: MKT.text, fontFamily: FONT, fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.6, maxHeight: 100, overflowY: 'auto' }}
              />
              <button
                onClick={sendFollowUp}
                disabled={!chatInput.trim() || loading}
                style={{ background: chatInput.trim() && !loading ? 'rgba(37,99,235,0.1)' : 'transparent', border: `0.5px solid ${chatInput.trim() && !loading ? MKT.borderStrong : MKT.border}`, borderRadius: 8, padding: '7px 13px', color: chatInput.trim() && !loading ? MKT.gold : MKT.dim, fontSize: 15, fontFamily: FONT, cursor: chatInput.trim() && !loading ? 'pointer' : 'default', flexShrink: 0, lineHeight: 1 }}
              >
                {loading ? '·' : '↑'}
              </button>
            </div>

            {/* Save button */}
            {messages.length > 1 && !loading && (
              <div style={{ padding: '0.75rem 1.25rem', borderTop: `0.5px solid ${MKT.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={saveReview}
                  disabled={saved}
                  style={{ background: saved ? 'rgba(22,163,74,0.08)' : 'transparent', border: `0.5px solid ${saved ? 'rgba(22,163,74,0.3)' : MKT.border}`, borderRadius: 6, padding: '5px 16px', color: saved ? MKT.green : MKT.muted, fontSize: 12, fontFamily: FONT, cursor: saved ? 'default' : 'pointer' }}
                >
                  {saved ? 'Saved to past reviews' : 'Save this review'}
                </button>
                <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Enter to send · Shift+Enter for new line</span>
              </div>
            )}
          </div>
        </>
      )}

      <Divider />

      {/* Past reviews */}
      {reviews.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SLabel style={{ margin: 0 }}>Past weekly reviews</SLabel>
            <button
              onClick={() => { setReviews([]); setExpanded(null); }}
              style={{ background: 'none', border: `0.5px solid ${MKT.border}`, borderRadius: 6, padding: '4px 12px', color: MKT.dim, fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}
            >
              Clear all
            </button>
          </div>
          <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 14 }}>
            {reviews.map((r, i) => {
              const isOpen = expanded === r.id;
              return (
                <div key={r.id} style={{ borderBottom: i < reviews.length - 1 ? `0.5px solid ${MKT.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                    <div onClick={() => setExpanded(isOpen ? null : r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}>
                      <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.blue, fontWeight: 500, flex: 1 }}>{r.date}</span>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>{isOpen ? '▴' : '▾'}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setReviews(prev => prev.filter(x => x.id !== r.id)); if (expanded === r.id) setExpanded(null); }}
                      style={{ background: 'none', border: 'none', color: MKT.dim, fontSize: 15, cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                      title="Delete this review"
                    >×</button>
                  </div>
                  {isOpen && (
                    <div style={{ paddingBottom: 16 }}>
                      {r.messages
                        ? r.messages.map((msg, mi) => (
                            <ChatMsg key={msg.id || mi} msg={msg} isLast={false} loading={false} />
                          ))
                        : <AiText text={r.analysis || ''} loading={false} />
                      }
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
