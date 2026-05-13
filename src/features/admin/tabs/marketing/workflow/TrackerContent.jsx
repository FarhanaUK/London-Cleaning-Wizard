import { useState, useEffect } from 'react';
import { SLabel, MKT, FONT, SERIF } from './MktShared';

const CHECKLIST = [
  'Monday: share keyword lists with Steven — confirm no campaign keyword overlap',
  'Add new negative keywords from Google Ads search terms report',
  'Post 2 fresh unique Google Business Profile posts this week',
  'Steven: post on Instagram 3–4 times including before/after content',
  'Steven: post in 3–5 Facebook community groups',
  'Steven: post on Nextdoor business page — Local Deal with 50% offer',
  "Steven: fix LCW Campaign 2 — URL, ad copy and ad strength",
  'Check Bark.com daily for new leads and respond within 1 hour',
  'Progress LSA verification steps',
  'Follow up with first booking client — ask for review and offer recurring discount',
  'Personal network WhatsApp status — 50% off offer',
  'Record all weekly numbers in the Analytics tab',
  'Design and print flyers — distribute in Canary Wharf and Wapping',
];

const STORAGE_CHECKS = 'mkt_weekly_checks';
const STORAGE_NOTES  = 'mkt_weekly_notes';

export default function TrackerContent() {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CHECKS)) || []; }
    catch { return []; }
  });
  const [notes,   setNotes]   = useState(() => localStorage.getItem(STORAGE_NOTES) || '');
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_CHECKS, JSON.stringify(checked));
  }, [checked]);

  function toggleCheck(i) {
    setChecked(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  function saveNotes() {
    localStorage.setItem(STORAGE_NOTES, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const INPUT_STYLE = {
    background: MKT.dark3,
    border: `0.5px solid ${MKT.borderStrong}`,
    borderRadius: 8,
    padding: '0.75rem 1rem',
    color: MKT.text,
    fontSize: 13,
    fontFamily: FONT,
    resize: 'vertical',
    minHeight: 80,
    outline: 'none',
    lineHeight: 1.6,
    width: '100%',
    boxSizing: 'border-box',
  };

  const BTN_STYLE = {
    background: 'rgba(201,169,110,0.15)',
    border: `0.5px solid ${MKT.borderStrong}`,
    borderRadius: 6,
    padding: '6px 16px',
    color: MKT.gold,
    fontSize: 12,
    fontFamily: FONT,
    cursor: 'pointer',
  };

  return (
    <div>
      <SLabel first>This week's checklist</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        {CHECKLIST.map((item, i) => {
          const done = checked.includes(i);
          return (
            <div key={i} onClick={() => toggleCheck(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < CHECKLIST.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={done}
                onChange={() => toggleCheck(i)}
                onClick={e => e.stopPropagation()}
                style={{ width: 16, height: 16, flexShrink: 0, accentColor: MKT.gold, cursor: 'pointer', marginTop: 2 }}
              />
              <span style={{ fontFamily: FONT, fontSize: 13, color: done ? MKT.dim : MKT.muted, lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none' }}>
                {item}
              </span>
            </div>
          );
        })}
      </div>

      <SLabel>Message to send clients after every clean</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 10 }}>
        <p style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, marginBottom: 10 }}>Send this within 2 hours of the clean completing:</p>
        <div style={{ background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 8, padding: '1rem', fontSize: 13, fontFamily: FONT, color: MKT.text, lineHeight: 1.8, fontStyle: 'italic' }}>
          "Hi [name], I hope you loved your clean today! We'd be so grateful if you could leave us a quick Google review — it makes a huge difference for a small business. Here's the link: [your Google review link]. Also, as a regular client you'd save £30 on every weekly clean — bringing your home reset to £245. Would you like to set up a regular schedule? — Farhana"
        </div>
      </div>

      <SLabel>Weekly notes</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <textarea
          style={INPUT_STYLE}
          placeholder="What worked? Any issues? Which posts got the most engagement? What searches triggered irrelevant clicks? Any bookings from social media?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={BTN_STYLE} onClick={saveNotes}>Save notes</button>
          {saved && <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Saved</span>}
        </div>
      </div>
    </div>
  );
}
