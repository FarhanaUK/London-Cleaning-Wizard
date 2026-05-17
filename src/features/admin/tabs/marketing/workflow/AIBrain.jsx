import { useState, useCallback, useEffect, useRef } from 'react';
import { MKT, FONT, SERIF, SLabel, loadFirestoreData } from './MktShared';
import { db } from '../../../../../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';

const MKT_DOC = doc(db, 'mkt_data', 'lcw');

const MODEL   = 'claude-sonnet-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are the London Cleaning Wizard AI Marketing Brain. You advise Farhana Aktar and Steven, the co-founders of London Cleaning Wizard (LCW), on their marketing strategy and weekly decisions.

Business context:
- London Cleaning Wizard is a premium residential cleaning service in London
- Founders: Farhana (overall lead, Google Ads premium areas, Instagram strategy) and Steven (Google Ads second campaign, Facebook groups, Nextdoor, Instagram posting)
- Shared monthly marketing budget: £500
- Primary goal: 30 bookings per month — "a booking a day" — the long-term sustainability threshold
- Current stage: early growth, months 1–3 from launch

Brand rules (non-negotiable):
- NEVER use "affordable" or "cheap" — LCW is premium
- Always use "reset" language: "home reset", "hotel-level clean", "the clean that gives you your Sunday back"
- Hero product: Signature Hotel Reset — deep clean, bed making, fresh towels, hotel-style presentation
- Positioning: the clean that resets your home and your head

Campaign timeline:
- Campaign launched: Sunday 10 May 2026 · weeks run Sunday to Saturday
- Week 1 covers 10–16 May · data entered each Sunday for the previous week (Week 1 entered Sun 17 May)

Weekly booking targets:
- Weeks 1–4: 1 booking/week | Weeks 5–8: 2/week | Weeks 9–12: 3/week
- Weeks 13–16: 4/week | Weeks 17–20: 5/week | Week 21+: 6+/week

When giving advice:
- Be specific — exact £ amounts, exact booking counts, exact timeframes
- Prioritise ruthlessly — tell them the ONE most important thing first
- Acknowledge what is working before what is not
- Format responses with === SECTION HEADERS ===, bullet points with →, and **bold** for key numbers
- Tone: warm, direct, encouraging — real founders building something real`;

const SK = {
  apiKey:   'lcw_anthropic_key',
  debrief:  'lcw_ai_debrief',
  budget:   'lcw_ai_budget',
  adcopy:   'lcw_ai_adcopy',
  content:  'lcw_ai_content',
  diagnose: 'lcw_ai_diagnose',
  monthly:  'lcw_ai_monthly',
  quickq:   'lcw_ai_quickq',
};

// ── API streaming ─────────────────────────────────────────────────────────────

async function streamClaude({ apiKey, userMessage, onChunk, onDone, onError, signal }) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const p = JSON.parse(raw);
          if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta' && p.delta.text) {
            full += p.delta.text;
            onChunk(p.delta.text, full);
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

// ── Storage helpers ───────────────────────────────────────────────────────────

function saveResponse(key, text) {
  try {
    const hist = JSON.parse(localStorage.getItem(key)) || [];
    hist.unshift({ date: new Date().toISOString(), text });
    const limited = hist.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(limited));
    setDoc(MKT_DOC, { [key]: limited }, { merge: true }).catch(() => {});
  } catch {}
}

function loadHistory(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}

// ── Context builder ───────────────────────────────────────────────────────────

// Campaign weeks run Sun–Sat · Week 1 starts Sun 17 May 2026
const CAMPAIGN_WEEK1_SUN = '2026-05-17';
function trueWeekNumAI(dateStr) {
  const ms = new Date(dateStr).getTime() - new Date(CAMPAIGN_WEEK1_SUN).getTime();
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
}

function buildContext({ sections, values, history, channels, weekDate }) {
  const now = new Date();
  const sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
  const thisSun = sun.toISOString().slice(0, 10);
  const elapsed = Math.floor((new Date(thisSun).getTime() - new Date(CAMPAIGN_WEEK1_SUN).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const campaignWeekNow = Math.max(1, elapsed + 1);

  const lines = [
    `Analysis date: ${now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Campaign week: ${campaignWeekNow} (W1 starts Sun 17 May · weeks run Sun–Sat · this week commencing ${thisSun})`,
    `Week commencing (Sunday): ${weekDate}`,
    '',
    '=== CURRENT WEEK METRICS ===',
  ];

  for (const s of sections) {
    const rows = s.fields
      .filter(f => values[f.id] !== '' && values[f.id] !== undefined)
      .map(f => `  ${f.label}: ${values[f.id]} (${f.targetText})`);
    if (rows.length) { lines.push(`\n${s.title}:`); lines.push(...rows); }
  }

  if (history.length) {
    lines.push('\n=== WEEKLY HISTORY ===');
    [...history].sort((a, b) => a.date.localeCompare(b.date)).forEach((w) => {
      lines.push(`\nWeek ${trueWeekNumAI(w.date)} (${w.date}):`);
      if (w.all && sections?.length) {
        // Full snapshot saved — show every field that has data
        for (const s of sections) {
          const rows = s.fields
            .filter(f => w.all[f.id] !== undefined && w.all[f.id] !== '')
            .map(f => `    ${f.label}: ${w.all[f.id]}`);
          if (rows.length) { lines.push(`  ${s.title}:`); lines.push(...rows); }
        }
      } else {
        // Legacy entry — show summary fields only
        const parts = [`bookings: ${w.bookings || '—'}`];
        if (w.impressions) parts.push(`impressions: ${w.impressions}`);
        if (w.ctr)         parts.push(`CTR: ${w.ctr}%`);
        if (w.spend)       parts.push(`spend: £${w.spend}`);
        if (w.reviews)     parts.push(`reviews: ${w.reviews}`);
        lines.push('  ' + parts.join(' | '));
      }
    });
  }

  const active = channels.filter(c => c.spend || c.bookings);
  if (active.length) {
    lines.push('\n=== CURRENT MONTH INVESTMENT ===');
    for (const c of active) {
      const s = parseFloat(c.spend) || 0;
      const b = parseFloat(c.bookings) || 0;
      lines.push(`  ${c.label}: £${s} spend | ${b} bookings | CPB: ${b > 0 ? `£${(s/b).toFixed(0)}` : 'no bookings'}`);
    }
  }

  // Investment history across past months
  let invHistory = [];
  try { invHistory = JSON.parse(localStorage.getItem('mkt_investment_history')) || []; } catch {}
  const pastMonths = [...invHistory].sort((a, b) => a.month.localeCompare(b.month));
  if (pastMonths.length > 1) {
    lines.push('\n=== MONTHLY INVESTMENT HISTORY ===');
    pastMonths.forEach(entry => {
      lines.push(`\n  ${entry.month}:`);
      entry.channels.filter(c => c.spend !== '' || c.bookings !== '').forEach(c => {
        const s = parseFloat(c.spend) || 0;
        const b = parseFloat(c.bookings) || 0;
        lines.push(`    ${c.label}: £${s} spend | ${b} bookings | CPB: ${b > 0 ? `£${(s/b).toFixed(0)}` : 'no bookings'}`);
      });
    });
  }

  return lines.join('\n');
}

// ── Custom hook ───────────────────────────────────────────────────────────────

function useAiTool(storageKey) {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const abortRef = useRef(null);

  const run = useCallback((apiKey, message) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText(''); setError(''); setLoading(true);
    streamClaude({
      apiKey, userMessage: message, signal: ctrl.signal,
      onChunk:  (_, full) => setText(full),
      onDone:   (full)    => { setLoading(false); abortRef.current = null; saveResponse(storageKey, full); },
      onError:  (msg)     => { setLoading(false); abortRef.current = null; setError(`Analysis failed — ${msg}. Check your connection and try again.`); },
    });
  }, [storageKey]);

  return { text, loading, error, run };
}

// ── UI components ─────────────────────────────────────────────────────────────

function AiText({ text, loading }) {
  if (!text) return null;

  function renderInline(str) {
    return str.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
      /^\*\*[^*]+\*\*$/.test(p)
        ? <strong key={i} style={{ color: MKT.text, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );
  }

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.8 }}>
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (/^={2,}\s*.+\s*={2,}$/.test(t)) {
          return (
            <div key={i} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: MKT.gold, marginTop: 20, marginBottom: 8, paddingBottom: 5, borderBottom: `0.5px solid rgba(201,169,110,0.2)` }}>
              {t.replace(/^=+\s*/, '').replace(/\s*=+$/, '')}
            </div>
          );
        }
        if (t === '') return <div key={i} style={{ height: 8 }} />;
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

function ResponseBox({ tool }) {
  if (!tool.text && !tool.error && !tool.loading) return null;
  return (
    <div style={{ marginTop: 12 }}>
      {tool.loading && !tool.text && (
        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim }}>Analysing your data...</div>
      )}
      {tool.error && (
        <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.red, background: 'rgba(192,91,91,0.08)', border: `0.5px solid rgba(192,91,91,0.25)`, borderRadius: 8, padding: '0.75rem 1rem' }}>
          {tool.error}
        </div>
      )}
      {tool.text && (
        <div style={{ background: MKT.dark3, border: `0.5px solid rgba(255,255,255,0.06)`, borderRadius: 8, padding: '1rem' }}>
          <AiText text={tool.text} loading={tool.loading} />
        </div>
      )}
    </div>
  );
}

function PrevResponses({ storageKey, label }) {
  const [open, setOpen] = useState(false);
  const hist = loadHistory(storageKey);
  if (!hist.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', color: MKT.dim, fontFamily: FONT, fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
        {open ? 'Hide' : `View previous ${label} responses`} ({hist.length})
      </button>
      {open && hist.map((h, i) => (
        <div key={i} style={{ background: MKT.dark3, border: `0.5px solid rgba(255,255,255,0.05)`, borderRadius: 8, padding: '0.75rem 1rem', marginTop: 8 }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, marginBottom: 8 }}>
            {new Date(h.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <AiText text={h.text} />
        </div>
      ))}
    </div>
  );
}

function RunBtn({ label, onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{ background: (loading || disabled) ? 'transparent' : 'rgba(201,169,110,0.15)', border: `0.5px solid rgba(201,169,110,${disabled ? '0.15' : '0.4'})`, borderRadius: 6, padding: '7px 18px', color: (loading || disabled) ? MKT.dim : MKT.gold, fontSize: 12, fontFamily: FONT, cursor: (loading || disabled) ? 'default' : 'pointer' }}>
      {loading ? 'Analysing your data...' : label}
    </button>
  );
}

function ToolCard({ id, title, description, locked, lockedMsg, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: MKT.gold, background: 'rgba(201,169,110,0.1)', border: `0.5px solid rgba(201,169,110,0.3)`, borderRadius: 4, padding: '2px 8px', flexShrink: 0 }}>{id}</span>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text, flex: 1 }}>{title}</span>
        {locked && <span style={{ fontFamily: FONT, fontSize: 10, color: MKT.dim, background: MKT.dark3, borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>Locked</span>}
        <span style={{ color: MKT.dim, fontSize: 14, flexShrink: 0, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: `0.5px solid ${MKT.border}`, paddingTop: '1rem' }}>
          <p style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, lineHeight: 1.65, marginBottom: 14 }}>{description}</p>
          {locked
            ? <div style={{ background: 'rgba(106,155,196,0.08)', border: `0.5px solid rgba(106,155,196,0.25)`, borderRadius: 8, padding: '0.75rem 1rem', fontFamily: FONT, fontSize: 12, color: '#6a9bc4' }}>{lockedMsg}</div>
            : children}
        </div>
      )}
    </div>
  );
}

function ApiKeySetup({ onSave }) {
  const [draft, setDraft] = useState('');
  const valid = draft.startsWith('sk-');
  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 16 }}>
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text, marginBottom: 6 }}>Connect your Anthropic API key</div>
      <p style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.65, marginBottom: 12 }}>
        Get your key at console.anthropic.com → API Keys. It saves in your browser only — never sent anywhere except Anthropic. Each button press costs approximately 1–3p.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="password"
          placeholder="sk-ant-..."
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && valid && onSave(draft)}
          style={{ flex: 1, background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '7px 12px', color: MKT.text, fontFamily: FONT, fontSize: 13, outline: 'none' }}
        />
        <button onClick={() => onSave(draft)} disabled={!valid} style={{ background: valid ? 'rgba(201,169,110,0.15)' : 'transparent', border: `0.5px solid rgba(201,169,110,${valid ? '0.4' : '0.15'})`, borderRadius: 6, padding: '7px 16px', color: valid ? MKT.gold : MKT.dim, fontFamily: FONT, fontSize: 12, cursor: valid ? 'pointer' : 'default' }}>
          Save key
        </button>
      </div>
    </div>
  );
}

const CHIPS = [
  "Why is my CTR low?",
  "Which channel should I invest more in?",
  "How do I get more recurring clients?",
  "What should Steven post this week?",
  "Is my Google Ads spend efficient?",
  "How do I improve my conversion rate?",
  "What negative keywords should I add?",
  "Is my cost per booking good?",
  "How do I get more Google reviews?",
  "Should I change my offer now?",
  "Am I on track for a booking a day?",
  "What would you do with my budget this week?",
];

// ── Main component ────────────────────────────────────────────────────────────

export default function AIBrain({ sections, values, history, enriched, channels, weekDate }) {
  useEffect(() => {
    if (document.getElementById('lcw-ai-styles')) return;
    const s = document.createElement('style');
    s.id = 'lcw-ai-styles';
    s.textContent = '@keyframes lcw-spin { to { transform: rotate(360deg) } }';
    document.head.appendChild(s);
  }, []);

  const [, setTick] = useState(0);
  // Hydrate AI tool outputs from Firestore on first load
  useEffect(() => {
    loadFirestoreData().then(fsData => {
      const AI_KEYS = [SK.debrief, SK.budget, SK.adcopy, SK.content, SK.diagnose, SK.monthly, SK.quickq];
      let updated = false;
      AI_KEYS.forEach(k => {
        if (fsData[k] !== undefined) {
          localStorage.setItem(k, JSON.stringify(fsData[k]));
          updated = true;
        }
      });
      if (updated) setTick(t => t + 1); // trigger re-render so loadHistory sees fresh data
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [apiKey,     setApiKey]     = useState(() => localStorage.getItem(SK.apiKey) || '');
  const [keyVisible, setKeyVisible] = useState(() => !localStorage.getItem(SK.apiKey));
  const [headlines,  setHeadlines]  = useState('');
  const [descs,      setDescs]      = useState('');
  const [activeQ,    setActiveQ]    = useState('');

  function handleSaveKey(k) {
    const trimmed = k.trim();
    setApiKey(trimmed);
    if (trimmed) { localStorage.setItem(SK.apiKey, trimmed); setKeyVisible(false); }
  }

  const tool1 = useAiTool(SK.debrief);
  const tool2 = useAiTool(SK.budget);
  const tool3 = useAiTool(SK.adcopy);
  const tool4 = useAiTool(SK.content);
  const tool5 = useAiTool(SK.diagnose);
  const tool6 = useAiTool(SK.monthly);
  const quick  = useAiTool(SK.quickq);

  const ctx          = buildContext({ sections, values, history, channels, weekDate });
  const hasKey       = !!apiKey;
  const weeksData    = history.length;
  const hasEnough    = weeksData >= 4;
  const showMonthly  = [4, 8, 12].includes(weeksData);

  const consecutiveMisses = (() => {
    let n = 0;
    for (const w of [...enriched].reverse()) {
      if (!w.hasData) continue;
      if (!w.hit) n++; else break;
    }
    return n;
  })();

  // ── Tool prompts ──────────────────────────────────────────────────────────

  const P1 = `${ctx}\n\n---\nProvide this week's AI debrief using exactly this structure:\n\n=== THE ONE THING ===\n(The single most important action that will move the needle most this week — one bold decisive sentence)\n\n=== PERFORMANCE SUMMARY ===\n(2–3 sentences on overall trajectory — be honest)\n\n=== BUDGET DECISIONS ===\n(For each channel with data: current status, recommendation. Use GREEN / AMBER / RED labels.)\n\n=== FARHANA'S ACTIONS THIS WEEK ===\n(Max 5, in priority order — specific and actionable)\n\n=== STEVEN'S ACTIONS THIS WEEK ===\n(Max 5, in priority order — include specific post ideas and caption angles)\n\n=== GOOGLE ADS CHANGES ===\n(Keywords to add, negatives to apply, bid changes — specific)\n\n=== NEXT WEEK TARGETS ===\n(Exact numbers for bookings, impressions, CTR, spend)`;

  const P2 = `${ctx}\n\n---\nProvide a specific budget reallocation plan for the £500/month shared budget. For each of the 7 channels (Farhana Google Ads, Steven Google Ads, LSA, Instagram boost, Facebook boost, Bark, Flyer):\n→ Current monthly allocation\n→ Recommended monthly allocation\n→ One-sentence reasoning\n→ Expected impact on monthly bookings\n\nColour code: GREEN for increases, AMBER for holds, RED for pauses or cuts. End with a total confirming all figures add to exactly £500.`;

  const P3 = `${ctx}\n\nCurrent Google Ads headlines (one per line):\n${headlines || '(not provided)'}\n\nCurrent Google Ads descriptions (one per line):\n${descs || '(not provided)'}\n\n---\nReview this ad copy for London Cleaning Wizard and provide:\n\n=== DIAGNOSIS ===\n(Which lines are weakest and why — based on CTR data if available)\n\n=== 5 REPLACEMENT HEADLINES ===\n(One per line. Show character count in brackets after each. Flag any over 30 chars.)\n\n=== 2 REPLACEMENT DESCRIPTIONS ===\n(One per line. Show character count in brackets. Flag any over 90 chars.)\n\n=== PSYCHOLOGY BEHIND EACH ===\n(One sentence per suggestion explaining the reasoning)\n\nBrand rules: never "affordable" or "cheap". Use "reset" language. Signature Hotel Reset is the hero product.`;

  const P4 = `${ctx}\n\n---\nGenerate Steven's content plan for this week. Provide exactly 4 posts:\n\n=== POST 1 — INSTAGRAM ===\nContent type:\nCaption (ready to copy and paste — in LCW brand voice):\nBest day and time:\nCall to action:\n\n=== POST 2 — INSTAGRAM ===\n(same format)\n\n=== POST 3 — FACEBOOK GROUP ===\n(same format — written for a local Facebook community group, not a brand page)\n\n=== POST 4 — NEXTDOOR ===\n(same format — neighbourly tone, hyper-local)\n\n=== BOOST THIS ===\n(Which post to put paid budget behind and exactly why, based on this week's data)\n\n=== AVOID THIS WEEK ===\n(One content format to skip based on what's not working)`;

  const P5 = `${ctx}\n\nBookings have been below the weekly target for ${consecutiveMisses} consecutive weeks.\n\n---\nDiagnose this underperformance:\n\n=== ROOT CAUSE ===\n(Content problem, targeting problem, budget problem, timing problem, or platform problem — pick the most likely and explain why)\n\n=== THREE FIXES IN PRIORITY ORDER ===\n(Specific and actionable — with exact numbers where relevant)\n\n=== EXPECTED OUTCOME ===\n(What should happen within 2 weeks if fixes are applied — specific booking projections)\n\n=== DECISION POINT ===\n(If no improvement after 2 more weeks: exactly which channel to pause and where to reallocate the budget — with £ amounts)`;

  const P6 = `${ctx}\n\n---\nGenerate the monthly strategy review for the past ${weeksData} weeks:\n\n=== WHAT WORKED ===\n(Top 3 wins with data backing them)\n\n=== WHAT DIDN'T WORK ===\n(Bottom 2 channels — honest assessment with data)\n\n=== SPEND VS BOOKINGS ===\n(Cost per booking by channel for the full period)\n\n=== RECOMMENDED BUDGET SPLIT NEXT MONTH ===\n(Exact £ amounts per channel — must total £500)\n\n=== NEW TARGETS NEXT MONTH ===\n(Based on current trajectory — specific booking and revenue numbers)\n\n=== ONE STRATEGIC PRIORITY ===\n(The single thing that will move the needle most next month)\n\n=== PREDICTED BOOKING RANGE ===\n(Based on current growth rate — give a specific range e.g. 8–12 bookings)`;

  function runQuick(q) {
    setActiveQ(q);
    quick.run(apiKey, `${ctx}\n\n---\nQuestion from the LCW team: "${q}"\n\nAnswer specifically using the data above. Reference actual numbers, not generalities. Be concise but complete.`);
  }

  const TA_STYLE = { width: '100%', background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '8px 12px', color: MKT.text, fontFamily: FONT, fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' };
  const LABEL_STYLE = { fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 4 };

  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: MKT.gold, marginBottom: 4 }}>AI Marketing Brain</div>
      <p style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7, marginBottom: 16 }}>
        Six AI tools that read your live dashboard data and give specific decisions — not generic advice. All responses are saved so you can track what changed week to week.
      </p>

      {/* API key */}
      {keyVisible
        ? <ApiKeySetup onSave={handleSaveKey} />
        : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 14px', background: 'rgba(127,176,105,0.08)', border: `0.5px solid rgba(127,176,105,0.25)`, borderRadius: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.green }}>API key configured</span>
            <button onClick={() => setKeyVisible(true)} style={{ background: 'none', border: 'none', color: MKT.dim, fontFamily: FONT, fontSize: 11, cursor: 'pointer', marginLeft: 'auto', textDecoration: 'underline' }}>Change key</button>
          </div>
        )
      }

      {/* ── Tool 1 ── */}
      <ToolCard id="01" title="Weekly AI Debrief" description="Reads all this week's numbers plus your full history. Returns one decisive action, budget decisions, Farhana and Steven's priority lists, and specific Google Ads changes.">
        <RunBtn label="Get this week's decisions" onClick={() => tool1.run(apiKey, P1)} loading={tool1.loading} disabled={!hasKey} />
        <ResponseBox tool={tool1} />
        <PrevResponses storageKey={SK.debrief} label="weekly debrief" />
      </ToolCard>

      {/* ── Tool 2 ── */}
      <ToolCard id="02" title="Budget Reallocation Advisor" description="Reads cost per booking for each channel and your current split. Returns exact £ figures for where to move money this month." locked={!hasEnough} lockedMsg={`Budget optimisation unlocks after 4 weeks of data. ${weeksData} of 4 weeks recorded.`}>
        <RunBtn label="Optimise my £500 budget" onClick={() => tool2.run(apiKey, P2)} loading={tool2.loading} disabled={!hasKey} />
        <ResponseBox tool={tool2} />
        <PrevResponses storageKey={SK.budget} label="budget" />
      </ToolCard>

      {/* ── Tool 3 ── */}
      <ToolCard id="03" title="Ad Copy Improver" description="Paste your current headlines and descriptions. Returns a diagnosis of what's weak, 5 replacement headlines (with character counts), 2 replacement descriptions, and the psychology behind each.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={LABEL_STYLE}>Current headlines (one per line)</div>
            <textarea value={headlines} onChange={e => setHeadlines(e.target.value)} placeholder={'Headline 1\nHeadline 2\nHeadline 3'} style={TA_STYLE} />
          </div>
          <div>
            <div style={LABEL_STYLE}>Current descriptions (one per line)</div>
            <textarea value={descs} onChange={e => setDescs(e.target.value)} placeholder={'Description 1\nDescription 2'} style={TA_STYLE} />
          </div>
        </div>
        <RunBtn label="Improve my ad copy" onClick={() => tool3.run(apiKey, P3)} loading={tool3.loading} disabled={!hasKey} />
        <ResponseBox tool={tool3} />
        <PrevResponses storageKey={SK.adcopy} label="ad copy" />
      </ToolCard>

      {/* ── Tool 4 ── */}
      <ToolCard id="04" title="Steven's Weekly Content Brief" description="Reads which channels are performing and generates 4 ready-to-post pieces — 2 Instagram, 1 Facebook group, 1 Nextdoor. Captions are copy-paste ready. Includes a boost recommendation.">
        <RunBtn label="Generate Steven's content plan" onClick={() => tool4.run(apiKey, P4)} loading={tool4.loading} disabled={!hasKey} />
        <ResponseBox tool={tool4} />
        <PrevResponses storageKey={SK.content} label="content brief" />
      </ToolCard>

      {/* ── Tool 5 ── */}
      <ToolCard id="05" title="Underperformance Diagnosis" description="Automatically detects when a channel has been below target for 3+ consecutive weeks. Returns root cause analysis, three prioritised fixes, and a specific decision point.">
        {consecutiveMisses >= 3 && (
          <div style={{ background: 'rgba(212,160,58,0.08)', border: `0.5px solid rgba(212,160,58,0.3)`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: 12, fontFamily: FONT, fontSize: 12, color: MKT.amber }}>
            Bookings have been below target for <strong>{consecutiveMisses} consecutive weeks</strong>.
          </div>
        )}
        {consecutiveMisses < 3 && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim, marginBottom: 12 }}>
            No persistent underperformance detected. This tool activates when bookings are below target for 3 or more consecutive weeks.
          </div>
        )}
        <RunBtn label={`Diagnose underperformance`} onClick={() => tool5.run(apiKey, P5)} loading={tool5.loading} disabled={!hasKey || !weeksData} />
        <ResponseBox tool={tool5} />
        <PrevResponses storageKey={SK.diagnose} label="diagnosis" />
      </ToolCard>

      {/* ── Tool 6 ── */}
      <ToolCard id="06" title="Monthly Strategy Review" description="Reads all 4 weeks of data for the month. Returns wins, losses, cost per booking by channel, recommended budget split for next month, and a single strategic priority." locked={!showMonthly} lockedMsg={`Monthly review appears at weeks 4, 8, and 12. Currently ${weeksData} week${weeksData !== 1 ? 's' : ''} of data recorded.`}>
        <RunBtn label="Generate monthly strategy review" onClick={() => tool6.run(apiKey, P6)} loading={tool6.loading} disabled={!hasKey} />
        <ResponseBox tool={tool6} />
        <PrevResponses storageKey={SK.monthly} label="monthly review" />
      </ToolCard>

      {/* ── Quick questions ── */}
      <SLabel>Quick questions</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <p style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 12, lineHeight: 1.65 }}>
          Click any question — Claude reads your live dashboard data and answers specifically, not generically.
        </p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 6, WebkitOverflowScrolling: 'touch' }}>
          {CHIPS.map(q => (
            <button key={q} onClick={() => hasKey && runQuick(q)} style={{ background: activeQ === q ? 'rgba(201,169,110,0.15)' : MKT.dark3, border: `0.5px solid ${activeQ === q ? 'rgba(201,169,110,0.4)' : MKT.border}`, borderRadius: 20, padding: '5px 13px', color: activeQ === q ? MKT.gold : MKT.dim, fontFamily: FONT, fontSize: 11, cursor: hasKey ? 'pointer' : 'default', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}>
              {q}
            </button>
          ))}
        </div>
        {activeQ && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${MKT.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, marginBottom: 8, fontStyle: 'italic' }}>"{activeQ}"</div>
            {quick.loading && !quick.text && <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.dim }}>Analysing your data...</div>}
            {quick.error && <div style={{ fontFamily: FONT, fontSize: 12, color: MKT.red }}>{quick.error}</div>}
            {quick.text && (
              <div style={{ background: MKT.dark3, borderRadius: 8, padding: '1rem' }}>
                <AiText text={quick.text} loading={quick.loading} />
              </div>
            )}
            <PrevResponses storageKey={SK.quickq} label="quick question" />
          </div>
        )}
      </div>
    </div>
  );
}
