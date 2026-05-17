import { useState, useEffect, useRef } from 'react';
import { MKT, FONT, SERIF, genId, buildContext } from './MktShared';

const MODEL   = 'claude-sonnet-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const CHAT_SK = 'lcw_wizard_chat';
const SUM_SK  = 'lcw_wizard_summary';
const KEY_SK  = 'lcw_anthropic_key';
const WINDOW  = 12;

const SYSTEM_PROMPT = `You are LC Wizard — the dedicated marketing advisor for London Cleaning Wizard, a premium residential cleaning business in London run by Farhana Aktar and Steven.

You have access to a live snapshot of their full marketing dashboard with every message — budget, campaigns, weekly performance history, past reviews, change log, and targets. Use all of it. Connect the dots across past and present. Spot trends. Notice when something contradicts what happened last week.

About the business:
→ Premium residential cleaning in London — never "cheap" or "affordable"
→ Farhana: overall lead, Google Ads premium areas campaign, Instagram strategy
→ Steven: Google Ads general campaign, Facebook groups, Nextdoor, Instagram posting
→ Shared monthly budget: £500 · Goal: 30 bookings/month
→ Early stage — campaigns launched May 2026

How to behave:
→ When something is unclear or you need more information to give good advice — ask. Don't assume and get it wrong.
→ When data is ambiguous (e.g. unlabelled numbers, missing context) — flag it and ask for clarification before drawing conclusions
→ Always connect current data to past data — "last week you had X, this week it's Y, that means..."
→ Reference the change log — if a setting was recently changed, factor that in before recommending another change
→ Google Ads campaigns are in early learning phase — be patient with data, don't recommend aggressive cuts on limited data
→ Never attribute data to a specific person unless it's clearly labelled as theirs
→ Match your response length to the question — a simple question gets a direct answer, a full review request gets full analysis
→ Be warm and direct. You're a trusted advisor, not a report generator.`;

const QUICK = [
  { label: 'Weekly debrief',  prompt: "Give me this week's full debrief: the single most important action, Farhana's priority list, Steven's priority list with specific post ideas, and Google Ads changes to make today." },
  { label: 'Optimise budget', prompt: "Review my £500/month budget split. Based on cost per booking data, tell me exactly where to move money this month — specific £ amounts per channel. Green for increases, amber for holds, red for pauses." },
  { label: "Steven's posts",  prompt: "Generate Steven's content plan for this week: 2 Instagram posts, 1 Facebook group post, 1 Nextdoor post. Each with a full caption ready to copy and paste. Which one should get paid boost budget?" },
  { label: 'Ad copy review',  prompt: "Review my Google Ads performance and CTR. Suggest 5 replacement headlines under 30 characters and 2 descriptions under 90 characters. Show character count for each." },
  { label: 'Am I on track?',  prompt: "Am I on track for a booking a day? Show me exactly where I stand against the weekly targets and what the next 4 weeks need to look like to hit 30 bookings per month." },
  { label: 'Monthly review',  prompt: "Generate my monthly strategy review: top 3 wins with data, bottom 2 channels, cost per booking by channel, recommended budget split for next month with exact £ amounts, and one strategic priority." },
];

// ── API helpers ───────────────────────────────────────────────────────────────

async function streamClaude({ apiKey, messages, onChunk, onDone, onError, signal }) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST', signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 2048, stream: true, system: SYSTEM_PROMPT, messages }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${res.status}`);
    }
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
            full += p.delta.text; onChunk(p.delta.text, full);
          }
        } catch {}
      }
    }
    onDone(full);
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError(err.message || 'Unknown error');
  }
}

async function fetchSummary(apiKey, msgs) {
  try {
    const text = msgs.filter(m => m.content).map(m => `${m.role === 'user' ? 'User' : 'LC Wizard'}: ${m.content.slice(0, 500)}`).join('\n\n');
    const res  = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 280, stream: false,
        system: 'Summarize this marketing conversation. Key findings, decisions, and open questions only. Under 160 words, plain text.',
        messages: [{ role: 'user', content: `Summarize:\n\n${text}` }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch { return ''; }
}

// ── UI components ─────────────────────────────────────────────────────────────

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
          <div key={i} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: MKT.gold, marginTop: 18, marginBottom: 7, paddingBottom: 5, borderBottom: `0.5px solid rgba(201,169,110,0.2)` }}>
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

function WizardAvatar({ size = 32 }) {
  return (
    <img src="/wizard.png" alt="LC Wizard" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `1px solid rgba(201,169,110,0.4)`, flexShrink: 0, background: MKT.dark3 }} />
  );
}

function ChatMessage({ msg, isLast, loading }) {
  const isBot = msg.role === 'assistant';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18, flexDirection: isBot ? 'row' : 'row-reverse' }}>
      {isBot
        ? <WizardAvatar />
        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,169,110,0.12)', border: `0.5px solid rgba(201,169,110,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 10, color: MKT.gold, flexShrink: 0 }}>You</div>
      }
      <div style={{ maxWidth: '82%' }}>
        <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginBottom: 4, textAlign: isBot ? 'left' : 'right' }}>
          {isBot ? 'LC Wizard' : 'You'}
        </div>
        <div style={{ background: isBot ? MKT.dark3 : 'rgba(201,169,110,0.08)', border: `0.5px solid ${isBot ? 'rgba(255,255,255,0.06)' : 'rgba(201,169,110,0.2)'}`, borderRadius: isBot ? '4px 12px 12px 12px' : '12px 4px 12px 12px', padding: '10px 14px' }}>
          {msg.error
            ? <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.red }}>{msg.content}</div>
            : isBot
              ? <AiText text={msg.content} loading={isLast && loading} />
              : <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          }
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LCWizardChat() {
  const [messages, setMessages] = useState(() => { try { return JSON.parse(localStorage.getItem(CHAT_SK)) || []; } catch { return []; } });
  const [summary,  setSummary]  = useState(() => localStorage.getItem(SUM_SK) || '');
  const [apiKey,   setApiKey]   = useState(() => localStorage.getItem(KEY_SK) || '');
  const [keySetup, setKeySetup] = useState(() => !localStorage.getItem(KEY_SK));
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const abortRef  = useRef(null);
  const textaRef  = useRef(null);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }

  useEffect(() => {
    if (messages.length) localStorage.setItem(CHAT_SK, JSON.stringify(messages.slice(-60)));
  }, [messages]);

  useEffect(() => {
    if (summary) localStorage.setItem(SUM_SK, summary);
  }, [summary]);

  useEffect(() => {
    if (open) setTimeout(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (loading && !isNearBottom()) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (textaRef.current) {
      textaRef.current.style.height = 'auto';
      textaRef.current.style.height = Math.min(textaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Progressive summarization every 6 assistant messages
  const assistantCount = messages.filter(m => m.role === 'assistant' && m.content).length;
  useEffect(() => {
    if (assistantCount > 0 && assistantCount % 6 === 0 && apiKey) {
      fetchSummary(apiKey, messages.slice(-24)).then(s => { if (s) setSummary(s); });
    }
  }, [assistantCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  function saveKey(k) {
    const t = k.trim();
    setApiKey(t);
    if (t) { localStorage.setItem(KEY_SK, t); setKeySetup(false); }
  }

  async function send(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !apiKey) return;
    if (!overrideText) setInput('');
    if (!open) setOpen(true);

    const userMsg      = { id: genId(), role: 'user', content: text, ts: Date.now() };
    const withUser     = [...messages, userMsg];
    setMessages(withUser);
    setLoading(true);

    const ctx     = buildContext();
    const apiMsgs = [];

    if (summary) {
      apiMsgs.push({ role: 'user',      content: `[Summary of our earlier conversation: ${summary}]` });
      apiMsgs.push({ role: 'assistant', content: 'I have that context — continuing from there.' });
    }

    const recentWindow = withUser.slice(-WINDOW);
    for (const m of recentWindow.slice(0, -1)) {
      apiMsgs.push({ role: m.role, content: m.content });
    }
    apiMsgs.push({ role: 'user', content: `${ctx}\n\n---\n${text}` });

    const botId = genId();
    setMessages(prev => [...prev, { id: botId, role: 'assistant', content: '', ts: Date.now() }]);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    streamClaude({
      apiKey, messages: apiMsgs, signal: ctrl.signal,
      onChunk: (_, full) => setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: full } : m)),
      onDone:  (full)    => { setLoading(false); abortRef.current = null; setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: full } : m)); },
      onError: (err)     => { setLoading(false); abortRef.current = null; setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: `Something went wrong — ${err}. Check your connection and try again.`, error: true } : m)); },
    });
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]); setSummary(''); setLoading(false);
    localStorage.removeItem(CHAT_SK); localStorage.removeItem(SUM_SK);
  }

  const hasMessages = messages.length > 0;
  const unread      = !open && hasMessages && messages[messages.length - 1]?.role === 'assistant';

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 24, width: 400, zIndex: 1000,
      borderRadius: '12px 12px 0 0', border: `1px solid ${MKT.border}`,
      background: MKT.card, fontFamily: FONT, fontSize: 14, lineHeight: 1.6,
      boxShadow: '0 8px 40px rgba(0,0,0,0.13)',
    }}>

      {open && (
        <>
          {/* Chat header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 1rem', borderBottom: `1px solid ${MKT.border}`, background: MKT.dark3, borderRadius: '12px 12px 0 0' }}>
            <WizardAvatar size={26} />
            <span style={{ fontFamily: SERIF, fontSize: 14, color: MKT.gold, flex: 1 }}>LC Wizard</span>
            {summary && <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.green, background: 'rgba(22,163,74,0.08)', border: `0.5px solid rgba(22,163,74,0.2)`, borderRadius: 4, padding: '2px 7px' }}>Context</span>}
            {hasMessages && <button onClick={clearChat} style={{ background: 'none', border: `0.5px solid ${MKT.border}`, borderRadius: 5, padding: '3px 9px', color: MKT.dim, fontFamily: FONT, fontSize: 10, cursor: 'pointer' }}>Clear</button>}
          </div>

          {/* API key setup */}
          {keySetup && (
            <div style={{ padding: '1rem', borderBottom: `1px solid ${MKT.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 10, lineHeight: 1.6 }}>
                Enter your Anthropic API key to activate LC Wizard. Same key as the 6 tools above. Get it at console.anthropic.com → API Keys.
              </div>
              <KeyInput onSave={saveKey} />
            </div>
          )}

          {!keySetup && (
            <>
              {/* Quick chips */}
              <div style={{ display: 'flex', gap: 7, padding: '0.5rem 1rem', borderBottom: `1px solid ${MKT.border}`, overflowX: 'auto', scrollbarWidth: 'none', background: MKT.bg }}>
                {QUICK.map(q => (
                  <button key={q.label} onClick={() => send(q.prompt)} disabled={loading}
                    style={{ background: MKT.dark3, border: `0.5px solid ${MKT.border}`, borderRadius: 20, padding: '4px 11px', color: MKT.muted, fontFamily: FONT, fontSize: 11, cursor: loading ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = MKT.gold; e.currentTarget.style.borderColor = MKT.borderStrong; } }}
                    onMouseLeave={e => { e.currentTarget.style.color = MKT.muted; e.currentTarget.style.borderColor = MKT.border; }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div ref={scrollRef} style={{ height: 360, overflowY: 'auto', padding: '1rem', scrollbarWidth: 'thin', scrollbarColor: `${MKT.dark4} transparent` }}>
                {!hasMessages && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, textAlign: 'center' }}>
                    <WizardAvatar size={52} />
                    <div style={{ fontFamily: SERIF, fontSize: 17, color: MKT.gold }}>Hello, I'm LC Wizard</div>
                    <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, maxWidth: 280, lineHeight: 1.75 }}>
                      Ask me anything about your marketing — or tap a quick action above.
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <ChatMessage key={msg.id} msg={msg} isLast={i === messages.length - 1} loading={loading} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ borderTop: `1px solid ${MKT.border}`, padding: '0.6rem 1rem', background: MKT.dark3 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={textaRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask LC Wizard anything..."
                    rows={1}
                    style={{ flex: 1, background: MKT.bg, border: `1px solid ${MKT.border}`, borderRadius: 8, padding: '7px 11px', color: MKT.text, fontFamily: FONT, fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}
                  />
                  <button onClick={() => send()} disabled={!input.trim() || loading}
                    style={{ background: (!input.trim() || loading) ? 'transparent' : 'rgba(37,99,235,0.1)', border: `1px solid ${(!input.trim() || loading) ? MKT.border : MKT.borderStrong}`, borderRadius: 8, padding: '7px 13px', color: (!input.trim() || loading) ? MKT.dim : MKT.gold, fontFamily: FONT, fontSize: 15, cursor: (!input.trim() || loading) ? 'default' : 'pointer', flexShrink: 0, lineHeight: 1 }}
                  >
                    {loading ? '·' : '↑'}
                  </button>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginTop: 4 }}>
                  Enter to send · Shift+Enter for new line
                  {summary && <span style={{ marginLeft: 8, color: MKT.green }}>· Context active</span>}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Toggle bar — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 1rem', background: 'none', border: 'none', borderTop: open ? `1px solid ${MKT.border}` : 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <WizardAvatar size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 500, color: MKT.gold, display: 'flex', alignItems: 'center', gap: 7 }}>
            LC Wizard
            {unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: MKT.green, display: 'inline-block', flexShrink: 0 }} />}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hasMessages ? `${messages.length} message${messages.length !== 1 ? 's' : ''} · ${summary ? 'Context active' : 'Tap to continue'}` : 'Your AI marketing brain · Ask anything'}
          </div>
        </div>
        <span style={{ color: MKT.dim, fontSize: 13, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</span>
      </button>
    </div>
  );
}

function KeyInput({ onSave }) {
  const [draft, setDraft] = useState('');
  const valid = draft.startsWith('sk-');
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input type="password" placeholder="sk-ant-..." value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && valid && onSave(draft)}
        style={{ flex: 1, background: MKT.bg, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '7px 12px', color: MKT.text, fontFamily: FONT, fontSize: 13, outline: 'none' }}
      />
      <button onClick={() => onSave(draft)} disabled={!valid}
        style={{ background: valid ? 'rgba(201,169,110,0.15)' : 'transparent', border: `0.5px solid rgba(201,169,110,${valid ? '0.4' : '0.15'})`, borderRadius: 6, padding: '7px 14px', color: valid ? MKT.gold : MKT.dim, fontFamily: FONT, fontSize: 12, cursor: valid ? 'pointer' : 'default' }}
      >
        Activate
      </button>
    </div>
  );
}
