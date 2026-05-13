import { useState } from 'react';
import { SLabel, MktAlert, MKT, FONT } from './MktShared';

// target: { min, max, invert } — invert means lower is better (e.g. CPC)
// type: 'range' | 'min' | 'max' | 'growing'
const SECTIONS = [
  {
    id: 'gf', title: "Google Ads — Farhana's campaign (LCW Premium Areas)",
    fields: [
      { id: 'gf1', label: 'Impressions',           placeholder: '480',  target: { min: 200, max: 400 }, targetText: 'Target: 200–400/week' },
      { id: 'gf2', label: 'Clicks',                placeholder: '18',   target: { min: 15,  max: 30  }, targetText: 'Target: 15–30/week'  },
      { id: 'gf3', label: 'CTR %',                 placeholder: '3.7',  target: { min: 3,   max: 7   }, targetText: 'Target: 3–7%'        },
      { id: 'gf4', label: 'Avg CPC £',             placeholder: '2.46', target: { max: 2.5, invert: true }, targetText: 'Target: under £2.50' },
      { id: 'gf5', label: 'Total spend £',         placeholder: '44',   target: { min: 35,  max: 50  }, targetText: 'Target: £35–50/week' },
      { id: 'gf6', label: 'Bookings from campaign',placeholder: '1',    target: { min: 1           }, targetText: 'Target: 1+/week by month 2' },
      { id: 'gf7', label: 'Optimisation score %',  placeholder: '99',   target: { min: 90          }, targetText: 'Target: 90%+' },
    ],
  },
  {
    id: 'gs', title: "Google Ads — Steven's campaign (LCW Campaign 2)",
    fields: [
      { id: 'gs1', label: 'Impressions',            placeholder: '200', target: { min: 150, max: 350 }, targetText: 'Target: 150–350/week' },
      { id: 'gs2', label: 'Clicks',                 placeholder: '10',  target: { min: 10,  max: 25  }, targetText: 'Target: 10–25/week'   },
      { id: 'gs3', label: 'CTR %',                  placeholder: '3.5', target: { min: 3,   max: 6   }, targetText: 'Target: 3–6%'         },
      { id: 'gs4', label: 'Bookings from campaign', placeholder: '0',   target: { min: 1             }, targetText: 'Target: 1+/week by month 2' },
    ],
  },
  {
    id: 'ig', title: 'Instagram',
    fields: [
      { id: 'ig1', label: 'Posts this week',       placeholder: '3',   target: { min: 3, max: 4 }, targetText: 'Target: 3–4/week'          },
      { id: 'ig2', label: 'Total reach',           placeholder: '500', target: { growing: true  }, targetText: 'Target: growing week on week' },
      { id: 'ig3', label: 'Link clicks to /book',  placeholder: '10',  target: { min: 5         }, targetText: 'Target: 5+ per week'        },
      { id: 'ig4', label: 'Enquiries',             placeholder: '0',   target: { min: 1         }, targetText: 'Target: 1+/week by month 2' },
    ],
  },
  {
    id: 'fb', title: 'Facebook',
    fields: [
      { id: 'fb1', label: 'Group posts this week', placeholder: '4', target: { min: 3, max: 5 }, targetText: 'Target: 3–5/week' },
      { id: 'fb2', label: 'Enquiries',             placeholder: '0', target: { min: 1         }, targetText: 'Target: 1+/week'  },
    ],
  },
  {
    id: 'nd', title: 'Nextdoor',
    fields: [
      { id: 'nd1', label: 'Posts this week', placeholder: '1', target: { min: 1 }, targetText: 'Target: 1/week'  },
      { id: 'nd2', label: 'Enquiries',       placeholder: '0', target: { min: 1 }, targetText: 'Target: 1+/week' },
    ],
  },
  {
    id: 'gbp', title: 'Google Business Profile',
    fields: [
      { id: 'gbp1', label: 'Posts this week',       placeholder: '2',  target: { min: 2              }, targetText: 'Target: 2/week'              },
      { id: 'gbp2', label: 'Profile views this week',placeholder: '50', target: { growing: true       }, targetText: 'Target: growing week on week' },
      { id: 'gbp3', label: 'Total Google reviews',  placeholder: '5',  target: { min: 10             }, targetText: 'Target: 10+ by month 3'      },
    ],
  },
  {
    id: 'tot', title: 'Overall results',
    fields: [
      { id: 'tot1', label: 'Total bookings this week',      placeholder: '1',   target: { min: 1   }, targetText: 'Target: 1–2/week by month 2' },
      { id: 'tot2', label: 'Recurring clients confirmed',   placeholder: '0',   target: { min: 1   }, targetText: 'Target: 1–2 by month 2'      },
      { id: 'tot3', label: 'Total revenue this week £',     placeholder: '165', target: { min: 300 }, targetText: 'Target: £300+/week by month 3'},
    ],
  },
];

const WEEK1 = [
  { day: 'Sun 10 May',    data: '85 impressions · 6 clicks · 7.06% CTR · 1 booking' },
  { day: 'Mon 11 May',    data: '136 impressions · 5 clicks · 3.68% CTR' },
  { day: 'Tue 12 May',    data: '156 impressions · 4 clicks · 2.56% CTR' },
  { day: 'Week 1 total',  data: '377 impressions · 15 clicks · 3.98% avg CTR · £44 spend · 1 booking', highlight: true },
  { day: 'Key finding',   data: '"regular cleaner london" 11.36% CTR — best keyword. Weekends convert at 3x weekday rate.' },
];

function dotColor(value, target) {
  if (value === '' || value === null || value === undefined) return MKT.dark4;
  const v = parseFloat(value);
  if (isNaN(v)) return MKT.dark4;
  if (target.growing) return v > 0 ? MKT.green : MKT.amber;
  if (target.invert) {
    if (v <= target.max) return MKT.green;
    if (v <= target.max * 1.3) return MKT.amber;
    return MKT.red;
  }
  const min = target.min ?? 0;
  const max = target.max ?? Infinity;
  if (v >= min && v <= max) return MKT.green;
  if (v > max) return MKT.green;
  if (v >= min * 0.7) return MKT.amber;
  return MKT.red;
}

const INPUT_BASE = {
  background: MKT.dark3, border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6,
  padding: '5px 10px', color: MKT.text, fontSize: 13, fontFamily: FONT,
  width: 90, outline: 'none',
};

export default function AnalyticsContent() {
  const allIds = SECTIONS.flatMap(s => s.fields.map(f => f.id));
  const [values, setValues] = useState(() => Object.fromEntries(allIds.map(id => [id, ''])));
  const [checked, setChecked] = useState(false);

  function setValue(id, v) {
    setValues(prev => ({ ...prev, [id]: v }));
    setChecked(false);
  }

  const allFields = SECTIONS.flatMap(s => s.fields);
  const offCount  = checked ? allFields.filter(f => {
    const v = values[f.id];
    return v !== '' && dotColor(v, f.target) === MKT.red;
  }).length : 0;
  const onCount   = checked ? allFields.filter(f => {
    const v = values[f.id];
    return v !== '' && dotColor(v, f.target) === MKT.green;
  }).length : 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <MktAlert type="info">
          If numbers are not hitting targets: copy all data from this tab and share it with Claude — "Here is my weekly marketing data across all channels. Please review every channel and tell me exactly what to do to improve."
        </MktAlert>
      </div>

      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 10px', borderBottom: `0.5px solid ${MKT.border}`, marginBottom: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: MKT.text }}>Week commencing</span>
          <input type="date" style={{ ...INPUT_BASE, width: 140 }} />
        </div>

        {SECTIONS.map(section => (
          <div key={section.id} style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: MKT.muted, marginBottom: 8, paddingBottom: 6, borderBottom: `0.5px solid ${MKT.border}` }}>
              {section.title}
            </div>
            {section.fields.map(field => {
              const v   = values[field.id];
              const dot = checked || v !== '' ? dotColor(v, field.target) : MKT.dark4;
              return (
                <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, width: 175, flexShrink: 0 }}>{field.label}</span>
                  <input
                    type="number"
                    placeholder={field.placeholder}
                    value={v}
                    onChange={e => setValue(field.id, e.target.value)}
                    style={INPUT_BASE}
                  />
                  <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim, flex: 1, minWidth: 100 }}>{field.targetText}</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, border: `0.5px solid ${MKT.borderStrong}`, transition: 'background 0.3s' }} />
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <button
            onClick={() => setChecked(true)}
            style={{ background: 'rgba(201,169,110,0.15)', border: `0.5px solid ${MKT.borderStrong}`, borderRadius: 6, padding: '6px 16px', color: MKT.gold, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}
          >
            Check all performance
          </button>
          {checked && (
            <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.muted }}>
              {onCount} on target · {offCount} need attention
            </span>
          )}
        </div>
      </div>

      <SLabel>Week 1 actual data — for reference</SLabel>
      <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem' }}>
        {WEEK1.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: i < WEEK1.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, width: 90, flexShrink: 0 }}>{row.day}</span>
            <span style={{ fontFamily: FONT, fontSize: 12, color: row.highlight ? MKT.green : MKT.muted, fontWeight: row.highlight ? 500 : 300 }}>{row.data}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
