import { useState, useEffect, useMemo } from 'react';
import { SLabel, MKT, FONT, EDIT_INPUT, usePersisted } from './MktShared';

const STORAGE_CHECKS = 'mkt_weekly_checks';
const STORAGE_NOTES  = 'mkt_weekly_notes';

const CHANNEL_ITEMS = {
  cold_calling: [
    'Cold calling block: 10am-12pm weekdays — target 10-15 calls per session, 30-40 per week minimum',
    'Call follow-ups: day 3-5 for letting agents who asked for more info by phone',
  ],
  face_to_face: [
    'Face-to-face visits: 3-5 letting agencies per week — email same day before you get home, no exceptions',
  ],
  facebook_groups: [
    'Facebook groups: post in 2-3 London Airbnb host groups this week — conversational tone, not promotional',
    'Facebook: check DMs and group replies — respond to any enquiries within 1 hour',
  ],
  email_outreach: [
    'Email follow-ups: day 3-4 for anyone who showed interest but has not replied to your email',
  ],
  google_business: [
    'Google Business Profile: post 2 fresh updates this week — never repeat a previous post',
    'After every clean: send personal WhatsApp with Google review link the same day',
    'Reply to every new Google review within 24 hours',
  ],
  personal_network: [
    'Personal network: update WhatsApp status — mention you have availability this week',
  ],
  google_ads: [
    'Check Google Ads: are all campaigns approved and running? Look for Disapproved or Limited flags',
    'Open Search Terms report — pause any irrelevant queries eating budget this week',
    'Check conversion tracking — go to Tools > Conversions and confirm it is firing correctly',
    'Update the Analytics tab with this week\'s spend, clicks, and bookings',
  ],
  lsa: [
    'Check LSA dashboard: are leads coming in? Respond to every lead within 30 minutes',
    'Review LSA ranking — if dropping, check your Google Business Profile review count',
  ],
};

const ALWAYS_ITEMS = [
  'Sunday evening: log the week in the Outreach Tracker tab before the numbers fade',
  'Monday: review last week — which channel got responses? Increase that activity this week.',
];

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

function buildChecklist(rows) {
  const items = [];
  let idx = 0;
  rows.filter(r => r.active !== false).forEach(row => {
    const type = getChannelType(row.name);
    if (type && CHANNEL_ITEMS[type]) {
      CHANNEL_ITEMS[type].forEach(text => items.push({ id: `${type}_${idx++}`, text }));
    }
  });
  ALWAYS_ITEMS.forEach(text => items.push({ id: `always_${idx++}`, text }));
  return items;
}

function readBudget() {
  try { return JSON.parse(localStorage.getItem('mkt_budget_rows_v2')) || []; } catch { return []; }
}

const DEFAULT_MESSAGE = '"Hi [name], I hope you loved your clean today! We\'d be so grateful if you could leave us a quick Google review — it makes a huge difference for a small business. Here\'s the link: [your Google review link]. Also, as a regular client you\'d save £30 on every weekly clean — bringing your home reset to £245. Would you like to set up a regular schedule? — Farhana"';

const INPUT_STYLE = { background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 8, padding: '0.75rem 1rem', color: MKT.text, fontSize: 13, fontFamily: FONT, resize: 'vertical', minHeight: 80, outline: 'none', lineHeight: 1.6, width: '100%', boxSizing: 'border-box' };
const BTN_STYLE   = { background: 'rgba(201,169,110,0.15)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 16px', color: MKT.gold, fontSize: 12, fontFamily: FONT, cursor: 'pointer' };

export default function TrackerContent({ editMode }) {
  const [budgetRows, setBudgetRows] = useState(readBudget);
  const [message,    setMessage]    = usePersisted('mkt_message', { text: DEFAULT_MESSAGE });
  const [checked,    setChecked]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CHECKS)) || []; } catch { return []; }
  });
  const [notes, setNotes] = useState(() => localStorage.getItem(STORAGE_NOTES) || '');
  const [saved,  setSaved] = useState(false);

  useEffect(() => {
    const refresh = () => setBudgetRows(readBudget());
    window.addEventListener('lcw-data-saved', refresh);
    return () => window.removeEventListener('lcw-data-saved', refresh);
  }, []);

  const checklist = useMemo(() => {
    const items = buildChecklist(budgetRows);
    localStorage.setItem('mkt_generated_checklist', JSON.stringify(items));
    return items;
  }, [budgetRows]);

  useEffect(() => { localStorage.setItem(STORAGE_CHECKS, JSON.stringify(checked)); }, [checked]);

  function toggleCheck(id) {
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function saveNotes() {
    localStorage.setItem(STORAGE_NOTES, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <SLabel first>This week's checklist</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        {checklist.length === 0 && (
          <p style={{ fontFamily: FONT, fontSize: 13, color: MKT.dim, margin: 0 }}>No active channels — go to the Budget tab and toggle channels on.</p>
        )}
        {checklist.map((item, i) => {
          const done = checked.includes(item.id);
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < checklist.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={() => toggleCheck(item.id)}
                style={{ width: 16, height: 16, flexShrink: 0, accentColor: MKT.gold, cursor: 'pointer', marginTop: 2 }}
              />
              <span
                onClick={() => toggleCheck(item.id)}
                style={{ fontFamily: FONT, fontSize: 13, color: done ? MKT.dim : MKT.muted, lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', cursor: 'pointer', flex: 1 }}
              >
                {item.text}
              </span>
            </div>
          );
        })}
      </div>

      <SLabel>Message to send clients after every clean</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        <p style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 10 }}>Send within 2 hours of the clean completing:</p>
        {editMode ? (
          <textarea
            value={message.text}
            onChange={e => setMessage({ text: e.target.value })}
            style={{ ...INPUT_STYLE, fontStyle: 'italic', minHeight: 120 }}
          />
        ) : (
          <div style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 8, padding: '1rem', fontSize: 13, fontFamily: FONT, color: MKT.text, lineHeight: 1.8, fontStyle: 'italic' }}>
            {message.text}
          </div>
        )}
      </div>

      <SLabel>Weekly notes</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <textarea style={INPUT_STYLE} placeholder="What worked? Any issues? Which posts got the most engagement? Any bookings from outreach this week?" value={notes} onChange={e => setNotes(e.target.value)} />
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={BTN_STYLE} onClick={saveNotes}>Save notes</button>
          {saved && <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Saved</span>}
        </div>
      </div>
    </div>
  );
}
