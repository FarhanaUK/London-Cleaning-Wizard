import { useState, useEffect } from 'react';
import { SLabel, AddBtn, DragHandle, useDragSort, MKT, FONT, EDIT_INPUT, DEL_BTN, genId, usePersisted } from './MktShared';

const STORAGE_CHECKS = 'mkt_weekly_checks';
const STORAGE_NOTES  = 'mkt_weekly_notes';

const DEFAULT_CHECKLIST = [
  { id: 'c1',  text: 'Monday: share keyword lists with Steven — confirm no campaign keyword overlap' },
  { id: 'c2',  text: 'Add new negative keywords from Google Ads search terms report' },
  { id: 'c3',  text: 'Post 2 fresh unique Google Business Profile posts this week' },
  { id: 'c4',  text: 'Steven: post on Instagram 3–4 times including before/after content' },
  { id: 'c5',  text: 'Steven: post in 3–5 Facebook community groups' },
  { id: 'c6',  text: 'Steven: post on Nextdoor business page — Local Deal with 50% offer' },
  { id: 'c7',  text: "Steven: fix LCW Campaign 2 — URL, ad copy and ad strength" },
  { id: 'c8',  text: 'Check Bark.com daily for new leads and respond within 1 hour' },
  { id: 'c9',  text: 'Progress LSA verification steps' },
  { id: 'c10', text: 'Follow up with first booking client — ask for review and offer recurring discount' },
  { id: 'c11', text: 'Personal network WhatsApp status — 50% off offer' },
  { id: 'c12', text: 'Record all weekly numbers in the Analytics tab' },
  { id: 'c13', text: 'Design and print flyers — distribute in Canary Wharf and Wapping' },
];

const DEFAULT_MESSAGE = '"Hi [name], I hope you loved your clean today! We\'d be so grateful if you could leave us a quick Google review — it makes a huge difference for a small business. Here\'s the link: [your Google review link]. Also, as a regular client you\'d save £30 on every weekly clean — bringing your home reset to £245. Would you like to set up a regular schedule? — Farhana"';

const INPUT_STYLE = { background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 8, padding: '0.75rem 1rem', color: MKT.text, fontSize: 13, fontFamily: FONT, resize: 'vertical', minHeight: 80, outline: 'none', lineHeight: 1.6, width: '100%', boxSizing: 'border-box' };
const BTN_STYLE = { background: 'rgba(201,169,110,0.15)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 16px', color: MKT.gold, fontSize: 12, fontFamily: FONT, cursor: 'pointer' };

export default function TrackerContent({ editMode }) {
  const [checklist, setChecklist] = usePersisted('mkt_checklist', DEFAULT_CHECKLIST);
  const [message,   setMessage]   = usePersisted('mkt_message',   { text: DEFAULT_MESSAGE });
  const [checked,   setChecked]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CHECKS)) || []; }
    catch { return []; }
  });
  const [notes, setNotes] = useState(() => localStorage.getItem(STORAGE_NOTES) || '');
  const [saved,  setSaved] = useState(false);

  const { dragHandlers: clDrag, isOver: clOver } = useDragSort(checklist, setChecklist);

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
        {checklist.map((item, i) => {
          const done = checked.includes(item.id);
          return (
            <div
              key={item.id}
              {...clDrag(i)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < checklist.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                outline: clOver(i) ? `1px dashed rgba(201,169,110,0.4)` : 'none',
              }}
            >
              <DragHandle style={{ marginTop: 2 }} />
              {!editMode && (
                <input type="checkbox" checked={done} onChange={() => toggleCheck(item.id)} style={{ width: 16, height: 16, flexShrink: 0, accentColor: MKT.gold, cursor: 'pointer', marginTop: 2 }} />
              )}
              {editMode ? (
                <>
                  <input value={item.text} onChange={e => setChecklist(cs => cs.map(c => c.id === item.id ? { ...c, text: e.target.value } : c))} style={{ ...EDIT_INPUT, flex: 1, fontSize: 13 }} />
                  <button onClick={() => setChecklist(cs => cs.filter(c => c.id !== item.id))} style={DEL_BTN}>×</button>
                </>
              ) : (
                <span onClick={() => toggleCheck(item.id)} style={{ fontFamily: FONT, fontSize: 13, color: done ? MKT.dim : MKT.muted, lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', cursor: 'pointer', flex: 1 }}>
                  {item.text}
                </span>
              )}
            </div>
          );
        })}
        {editMode && <AddBtn onClick={() => setChecklist(cs => [...cs, { id: genId(), text: 'New task' }])} label="Add task" />}
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
        <textarea style={INPUT_STYLE} placeholder="What worked? Any issues? Which posts got the most engagement? Any bookings from social media?" value={notes} onChange={e => setNotes(e.target.value)} />
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={BTN_STYLE} onClick={saveNotes}>Save notes</button>
          {saved && <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Saved</span>}
        </div>
      </div>
    </div>
  );
}
