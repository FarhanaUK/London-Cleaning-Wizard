import { useState, useMemo } from 'react';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const AIRBNB_BASE_HOURS = {
  studio: 1.5,
  1: 2.5,
  2: 3.5,
  3: 4.5,
  4: 6.0,
  5: 7.5,
};

// Add-on prices are fixed market rates for contracted clients.
// Time (h) is for scheduling only -- the cleaner allocation.
// Price is charged on top of the contracted clean, not subject to contract discount.
const AIRBNB_ADDONS = [
  { id: 'oven',    label: 'Oven deep clean',  h: 0.5,  price: 40, note: 'Interior, racks, door and casing' },
  { id: 'fridge',  label: 'Inside fridge',    h: 0.33, price: 18, note: 'Full interior clean' },
  { id: 'laundry', label: 'Laundry & fold',   h: 0.5,  price: 20 },
  { id: 'linen',   label: 'Linen change',     h: 0.33, price: 12 },
  { id: 'windows', label: 'Internal windows', h: 0.5,  price: 20, note: 'Standard windows' },
  { id: 'patio',   label: 'Balcony / patio',  h: 0.33, price: 30 },
];

const COMMERCIAL_ADDONS = [
  { id: 'windows',    label: 'Internal windows',                h: 0.5,  price: 20 },
  { id: 'patio',      label: 'Entrance / patio',                h: 0.33, price: 30 },
  { id: 'kitchen',    label: 'Kitchen / break room deep clean', h: 0.75, price: 50, note: 'Standard wipe-down included -- this is a full scrub of surfaces, sink and appliance exteriors' },
  { id: 'fridge',     label: 'Fridge clean',                    h: 0.33, price: 18 },
  { id: 'oven',       label: 'Oven / grill deep clean',         h: 0.75, price: 40, note: 'Standard exterior wipe included in every visit' },
  { id: 'toilets',    label: 'Toilet deep clean & descale',     h: 0.5,  price: 35, note: 'Basic toilet cleaning is included in every visit -- this is an intensive scrub, descale and full sanitise' },
  { id: 'appliances', label: 'Microwave & appliances',          h: 0.25, price: 15 },
];

const CONTRACTS = [
  { id: 'monthly', label: 'Monthly rolling',  disc: 0.00, months: 1,  note: 'Cancel with 1 month notice' },
  { id: '3mo',     label: '3-month',          disc: 0.00, months: 3,  note: 'Guaranteed 3 months of revenue' },
  { id: '6mo',     label: '6-month',          disc: 0.05, months: 6,  note: 'Guaranteed 6 months of revenue' },
  { id: 'annual',  label: 'Annual contract',  disc: 0.10, months: 12, note: '12 months guaranteed revenue' },
];

const FREQUENCY = [
  { id: 'oneoff',      label: 'One-off',      vpm: 0    },
  { id: 'daily',       label: 'Daily (M-F)',  vpm: 22   },
  { id: 'thrice',      label: '3x per week',  vpm: 13   },
  { id: 'twice',       label: '2x per week',  vpm: 8.6  },
  { id: 'weekly',      label: 'Weekly',       vpm: 4.33 },
  { id: 'fortnightly', label: 'Fortnightly',  vpm: 2.17 },
  { id: 'monthly',     label: 'Monthly',      vpm: 1    },
];

// Airbnb SOP -- studio minimum raised to 2h (min job standard)
const AIRBNB_SOP = [
  { label: 'Studio',  alloc: 2.0 },
  { label: '1-bed',   alloc: 2.5 },
  { label: '2-bed',   alloc: 3.5 },
  { label: '3-bed',   alloc: 4.5 },
  { label: '4-bed',   alloc: 6.0 },
  { label: '5-bed',   alloc: 7.5 },
];

// Commercial SOP -- 3h minimum applied to small offices
const COMMERCIAL_SOP = [
  { label: 'Up to 50 sqm',  alloc: 3.0, minNote: true },
  { label: '51-100 sqm',    alloc: 3.0, minNote: true },
  { label: '101-150 sqm',   alloc: 3.5 },
  { label: '151-200 sqm',   alloc: 4.5 },
  { label: '201-300 sqm',   alloc: 6.0 },
];

function gbp(n) {
  return Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtH(h) {
  const hr  = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  if (hr === 0)  return `${min}min`;
  if (min === 0) return `${hr}h`;
  return `${hr}h ${min}min`;
}

function clientRange(allocHours) {
  const lower = Math.max(allocHours - 0.5, 1);
  return `${fmtH(lower)} to ${fmtH(allocHours)}`;
}

function Card({ children, C, style = {} }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1rem 1.1rem', ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, C }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function BreakdownRow({ label, value, C, accent, large, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <span style={{ fontFamily: FONT, fontSize: large ? 13 : 12, color: C.muted }}>{label}</span>
      <span style={{ fontFamily: FONT, fontSize: large ? 14 : 12, fontWeight: accent ? 700 : 500, color: accent ? C.text : C.text }}>{value}</span>
    </div>
  );
}

export default function QuotesTab({ isMobile, C, expenses = [], fixedCosts = [], marketingSpend = [], supplies = [], bookings = [] }) {
  const [clientType,   setClientType]   = useState('airbnb');
  const [bedrooms,     setBedrooms]     = useState('2');
  const [extraBaths,   setExtraBaths]   = useState('1');
  const [sqm,          setSqm]          = useState('80');
  const [intensity,    setIntensity]    = useState('office');
  const [complexity,   setComplexity]   = useState('normal');
  const [commBaths,    setCommBaths]    = useState('1');
  const [addons,       setAddons]       = useState([]);
  const [frequency,    setFrequency]    = useState('weekly');
  const [contract,     setContract]     = useState('monthly');
  const [numCleaners,  setNumCleaners]  = useState('1');
  const [cleanerRate,  setCleanerRate]  = useState('17');
  const [suppliesCost, setSuppliesCost] = useState('5');
  const [travelCost,   setTravelCost]   = useState('5');
  const [minMargin,    setMinMargin]    = useState('25');
  const [targetVisits, setTargetVisits] = useState('15');
  const [clientName,   setClientName]   = useState('');
  const [copied,         setCopied]         = useState(false);
  const [showSOP,        setShowSOP]        = useState(false);

  const toggleAddon = id =>
    setAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Auto-count all confirmed bookings this month across every client
  const totalVisitsThisMonth = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const count = bookings.filter(b => !b.deleted && b.cleanDate?.startsWith(thisMonth)).length;
    return Math.max(count, 1);
  }, [bookings]);

  const overhead = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const today     = new Date().toISOString().slice(0, 10);

    const fixed = fixedCosts.reduce((s, f) => {
      if (!f.active) return s;
      if (f.startDate && f.startDate.slice(0, 7) > thisMonth) return s;
      if (f.endDate && f.endDate < today) return s;
      const amt = parseFloat(f.amount) || 0;
      return s + (f.frequency === 'yearly' ? amt / 12 : amt);
    }, 0);

    const thisMonthStart = `${thisMonth}-01`;
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const thisMonthEnd = `${thisMonth}-${String(lastDay).padStart(2, '0')}`;

    // Exclude 'Marketing' category from expenses -- ad spend is tracked separately to avoid double-counting
    const variable = expenses
      .filter(e => e.date >= thisMonthStart && e.date <= thisMonthEnd && e.category !== 'Marketing')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const adSpend = marketingSpend
      .filter(e => e.date >= thisMonthStart && e.date <= thisMonthEnd)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const suppliesSpend = supplies
      .filter(s => s.purchaseDate >= thisMonthStart && s.purchaseDate <= thisMonthEnd)
      .reduce((s, x) => s + (parseFloat(x.unitCost) || 0) * (Number(x.inStock) || 0), 0);

    return { fixed, variable, adSpend, suppliesSpend, total: fixed + variable + adSpend + suppliesSpend };
  }, [fixedCosts, marketingSpend, expenses, supplies]);

  const totalHours = useMemo(() => {
    let base;
    if (clientType === 'airbnb') {
      const key = bedrooms === 'studio' ? 'studio' : parseInt(bedrooms, 10);
      base = AIRBNB_BASE_HOURS[key] || 2.5;
      base += Math.max((parseInt(extraBaths, 10) || 1) - 1, 0) * 0.5;
    } else {
      const s = parseFloat(sqm) || 80;
      let h = s <= 50 ? 1.5 : s <= 100 ? 2.5 : s <= 150 ? 3.5 : s <= 200 ? 4.5 : s <= 300 ? 6.0 : 8.0;
      const typeMult = { office: 1.0, retail: 1.1, restaurant: 1.2, other: 1.0 };
      const complexMult = { easy: 0.9, normal: 1.0, complex: 1.1, difficult: 1.25 };
      base = h * (typeMult[intensity] || 1.0) * (complexMult[complexity] || 1.0);
      base += Math.max((parseInt(commBaths, 10) || 1) - 1, 0) * 0.5;
    }
    const addonList = clientType === 'airbnb' ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;
    const addonH = addons.reduce((sum, id) => sum + (addonList.find(x => x.id === id)?.h || 0), 0);
    return base + addonH;
  }, [clientType, bedrooms, extraBaths, sqm, intensity, complexity, commBaths, addons]);

  const q = useMemo(() => {
    const ct            = CONTRACTS.find(c => c.id === contract) || CONTRACTS[0];
    const minMarg       = (parseFloat(minMargin) || 25) / 100;
    const margin        = Math.min(1 - (1 - minMarg) * (1 - ct.disc), 0.99);
    // Add-ons use fixed prices -- separate from the cost-plus clean calculation
    const addonList     = clientType === 'airbnb' ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;
    const selectedAddons = addons.map(id => addonList.find(a => a.id === id)).filter(Boolean);
    const addonHours    = selectedAddons.reduce((s, a) => s + a.h, 0);
    const addonTotal    = selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
    // Labour cost is based on base clean hours only (add-on time is for scheduling, priced separately)
    const baseHours     = totalHours - addonHours;
    const labor         = baseHours * (parseFloat(cleanerRate) || 0);
    const overheadDivisor = Math.max(parseInt(targetVisits, 10) || 15, 1);
    const overheadPerVisit = overhead.total / overheadDivisor;
    const cost          = labor + (parseFloat(suppliesCost) || 0) + (parseFloat(travelCost) || 0) + overheadPerVisit;
    const basePrice     = cost / (1 - margin);
    const cleanPrice    = basePrice * (1 - ct.disc);
    const price         = cleanPrice + addonTotal;
    const profit        = cleanPrice - cost;
    const pct           = cleanPrice > 0 ? (profit / cleanPrice) * 100 : 0;
    const freq          = FREQUENCY.find(f => f.id === frequency) || FREQUENCY[4];
    const mRev          = freq.vpm * price;
    const mCost         = freq.vpm * cost;
    const mProfit       = freq.vpm * profit;
    const cVal          = ct.months * mRev;
    const visitDur      = totalHours / Math.max(parseInt(numCleaners, 10) || 1, 1);
    return { labor, overheadPerVisit, cost, basePrice, cleanPrice, price, profit, pct, addonTotal, mRev, mCost, mProfit, cVal, ct, freq, visitDur };
  }, [totalHours, cleanerRate, suppliesCost, travelCost, minMargin, overhead, targetVisits, contract, frequency, numCleaners, addons, clientType]);

  const marginColor = q.pct < 25 ? C.danger : q.pct < 30 ? C.warning : C.success;

  const copyQuote = () => {
    const name = clientName ? `${clientName} -- ` : '';
    const type = clientType === 'airbnb'
      ? `${bedrooms === 'studio' ? 'Studio' : `${bedrooms}-bed`} Airbnb`
      : `Commercial (${sqm} sqm)`;
    const freqLabel = q.freq.id !== 'oneoff' ? ` ${q.freq.label.toLowerCase()} clean` : ' one-off clean';
    const ctNote    = q.ct.id !== 'none' ? ` | ${q.ct.label}` : '';
    const monthly   = q.freq.vpm > 0 ? ` | £${gbp(q.mRev)}/month` : '';
    const text = `${name}${type}${freqLabel}: £${gbp(q.price)}/visit${ctNote}${monthly}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const inputStyle = {
    fontFamily: FONT, fontSize: 13, color: C.text,
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: '7px 10px', width: '100%', boxSizing: 'border-box',
    outline: 'none',
  };

  const typeTabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => { setClientType(id); setAddons([]); }}
      style={{
        fontFamily: FONT, fontSize: 12, padding: '7px 16px', borderRadius: 6,
        cursor: 'pointer', border: `1px solid ${clientType === id ? C.accent : C.border}`,
        background: clientType === id ? C.accent : C.card,
        color: clientType === id ? '#fff' : C.text,
        fontWeight: clientType === id ? 600 : 400,
        transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  const thStyle    = { textAlign: 'left',  color: C.muted, fontWeight: 600, fontSize: 11, paddingBottom: 6, borderBottom: `1px solid ${C.border}` };
  const thRStyle   = { textAlign: 'right', color: C.muted, fontWeight: 600, fontSize: 11, paddingBottom: 6, borderBottom: `1px solid ${C.border}` };

  return (
    <div style={{ padding: isMobile ? '1rem' : '1.5rem 2rem', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Quotes Calculator</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
          Calculate what to charge for Airbnb and commercial contracts -- with full cost and profit visibility.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Left column: Inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Client name */}
          <Card C={C}>
            <SectionLabel C={C}>Client (optional)</SectionLabel>
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="e.g. Riverside Stays, Oakwood Office, 14 Oak Street..."
              style={inputStyle}
            />
          </Card>

          {/* Property type + sizing */}
          <Card C={C}>
            <SectionLabel C={C}>Property</SectionLabel>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {typeTabBtn('airbnb',     'Airbnb / Short-let')}
              {typeTabBtn('commercial', 'Commercial')}
            </div>

            {clientType === 'airbnb' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Bedrooms</div>
                  <select value={bedrooms} onChange={e => setBedrooms(e.target.value)} style={inputStyle}>
                    <option value="studio">Studio</option>
                    <option value="1">1 bedroom</option>
                    <option value="2">2 bedrooms</option>
                    <option value="3">3 bedrooms</option>
                    <option value="4">4 bedrooms</option>
                    <option value="5">5 bedrooms</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Number of bathrooms</div>
                  <input
                    type="number" min={1} value={extraBaths}
                    onChange={e => setExtraBaths(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 10, color: C.faint || C.muted, marginTop: 3 }}>+30 min per bathroom after the first</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Floor area (sqm)</div>
                  <input
                    type="number" min={1} value={sqm}
                    onChange={e => setSqm(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Premises type</div>
                  <select value={intensity} onChange={e => setIntensity(e.target.value)} style={inputStyle}>
                    <option value="office">Office / workspace</option>
                    <option value="retail">Retail shop</option>
                    <option value="restaurant">Restaurant / cafe</option>
                    <option value="other">Other commercial</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Number of bathrooms</div>
                  <input
                    type="number" min={1} value={commBaths}
                    onChange={e => setCommBaths(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 10, color: C.faint || C.muted, marginTop: 3 }}>+30 min per bathroom after the first</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Site complexity</div>
                  <select value={complexity} onChange={e => setComplexity(e.target.value)} style={inputStyle}>
                    <option value="easy">Easy access</option>
                    <option value="normal">Normal</option>
                    <option value="complex">Complex (+10%)</option>
                    <option value="difficult">Difficult (+25%)</option>
                  </select>
                  <div style={{ fontSize: 10, color: C.faint || C.muted, marginTop: 3 }}>
                    Complex: multiple floors, high security, heavy grease.
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Add-ons */}
          <Card C={C}>
            <SectionLabel C={C}>Add-ons</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 7 }}>
              {(clientType === 'airbnb' ? AIRBNB_ADDONS : COMMERCIAL_ADDONS).map(a => (
                <label
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
                    padding: '7px 10px', borderRadius: 7,
                    background: addons.includes(a.id) ? `${C.accent}14` : C.bg,
                    border: `1px solid ${addons.includes(a.id) ? C.accent : C.border}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={addons.includes(a.id)}
                    onChange={() => toggleAddon(a.id)}
                    style={{ accentColor: C.accent, flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: C.text }}>{a.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, whiteSpace: 'nowrap', flexShrink: 0 }}>£{a.price}</span>
                    </div>
                    {a.note && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{a.note}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Frequency, cleaners, contract */}
          <Card C={C}>
            <SectionLabel C={C}>Frequency & contract</SectionLabel>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>How often</div>
                <select value={frequency} onChange={e => setFrequency(e.target.value)} style={inputStyle}>
                  {FREQUENCY.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Number of cleaners</div>
                <select value={numCleaners} onChange={e => setNumCleaners(e.target.value)} style={inputStyle}>
                  {[1,2,3,4].map(n => <option key={n} value={n}>{n} cleaner{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              Contract type
              <span style={{ marginLeft: 8, color: C.faint || C.muted }}>Longer contracts get a discount -- the calculator adjusts your margin automatically</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CONTRACTS.map(ct => (
                <label
                  key={ct.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '9px 12px', borderRadius: 7,
                    background: contract === ct.id ? `${C.accent}14` : C.bg,
                    border: `1px solid ${contract === ct.id ? C.accent : C.border}`,
                  }}
                >
                  <input
                    type="radio" name="contract"
                    checked={contract === ct.id}
                    onChange={() => setContract(ct.id)}
                    style={{ accentColor: C.accent, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ct.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{ct.note}</div>
                  </div>
                  {ct.disc > 0 && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: C.success,
                      background: `${C.success}18`, borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap',
                    }}>
                      -{ct.disc * 100}%
                    </span>
                  )}
                </label>
              ))}
            </div>
          </Card>

          {/* Costs & margin settings */}
          <Card C={C}>
            <SectionLabel C={C}>Your costs & margin floor</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {[
                { label: 'Cleaner rate (£/hr)', value: cleanerRate, set: setCleanerRate, hint: 'What you pay per hour' },
                { label: 'Supplies per visit (£)', value: suppliesCost, set: setSuppliesCost, hint: 'Products used on this job' },
                { label: 'Travel per visit (£)', value: travelCost, set: setTravelCost, hint: 'Petrol / transport' },
              ].map(({ label, value, set, hint }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{label}</div>
                  <input type="number" min={0} value={value} onChange={e => set(e.target.value)} style={inputStyle} />
                  <div style={{ fontSize: 10, color: C.faint || C.muted, marginTop: 3 }}>{hint}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Your profit margin (%)</div>
                <input type="number" min={1} max={90} value={minMargin} onChange={e => setMinMargin(e.target.value)} style={inputStyle} />
                <div style={{ fontSize: 10, color: C.faint || C.muted, marginTop: 3 }}>
                  The % of every charge you keep as profit. Discounts are handled automatically on top.
                </div>
              </div>
            </div>

            {/* Auto overhead from admin data */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Monthly overhead</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>£{gbp(overhead.total)}</div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Pulled automatically from your admin -- fixed costs, this month's ad spend, and logged expenses.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {[
                  { label: 'Direct debits',    val: overhead.fixed },
                  { label: 'Variable costs',   val: overhead.variable },
                  { label: 'Ad spend',         val: overhead.adSpend },
                  { label: 'Supplies',         val: overhead.suppliesSpend },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted }}>
                    <span>{label}</span>
                    <span>£{gbp(val)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.text, flexShrink: 0 }}>
                    Spread across
                  </label>
                  <input
                    type="number" min="1" value={targetVisits}
                    onChange={e => setTargetVisits(e.target.value)}
                    style={{ ...inputStyle, width: 64, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: C.muted }}>total bookings/month</span>
                </div>
                <div style={{ fontSize: 11, color: C.danger, lineHeight: 1.5 }}>
                  Only change this if your average monthly booking volume has changed. This is your total across all clients (Airbnb + commercial + residential) -- not just this one job.
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    You have {totalVisitsThisMonth} actual booking{totalVisitsThisMonth !== 1 ? 's' : ''} this month
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    £{gbp(q.overheadPerVisit)}<span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>/visit</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column: Live quote ── */}
        <div style={{ position: isMobile ? 'static' : 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Big price card */}
          <Card C={C} style={{ border: `1px solid ${q.pct < 20 ? C.danger : C.border}` }}>
            <div style={{ textAlign: 'center', padding: '0.5rem 0 0.75rem' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Quote per visit
              </div>
              <div style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 6 }}>
                £{gbp(q.price)}
              </div>
              {q.ct.disc > 0 && (
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 4 }}>
                  <span style={{ textDecoration: 'line-through', marginRight: 6 }}>£{gbp(q.basePrice)}</span>
                  <span style={{ color: C.success }}>{q.ct.disc * 100}% {q.ct.label} discount applied</span>
                </div>
              )}
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.8 }}>
                <div>
                  <span style={{ fontWeight: 600, color: C.text }}>Cleaner gets:</span>{' '}
                  {fmtH(q.visitDur)}{parseInt(numCleaners, 10) > 1 ? ` each (${fmtH(totalHours)} total)` : ''}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: C.text }}>Tell client:</span>{' '}
                  approx {clientRange(q.visitDur)}
                </div>
              </div>
            </div>

            {/* Margin pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 0 6px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: marginColor, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: marginColor }}>
                {q.pct.toFixed(1)}% profit margin
              </span>
              {q.pct < 25  && <span style={{ fontFamily: FONT, fontSize: 11, color: C.danger  }}>too low</span>}
              {q.pct >= 25 && q.pct < 30 && <span style={{ fontFamily: FONT, fontSize: 11, color: C.warning }}>minimum</span>}
              {q.pct >= 30 && q.pct < 40 && <span style={{ fontFamily: FONT, fontSize: 11, color: C.success }}>healthy</span>}
              {q.pct >= 40 && <span style={{ fontFamily: FONT, fontSize: 11, color: C.success }}>excellent</span>}
            </div>
          </Card>

          {/* Cost breakdown */}
          <Card C={C}>
            <SectionLabel C={C}>Per visit breakdown</SectionLabel>
            <BreakdownRow
              label="Bathrooms"
              value={`${clientType === 'airbnb' ? (parseInt(extraBaths, 10) || 1) : (parseInt(commBaths, 10) || 1)} included`}
              C={C}
            />
            <BreakdownRow label="Labour"        value={`£${gbp(q.labor)}`}                        C={C} />
            <BreakdownRow label="Supplies"      value={`£${gbp(parseFloat(suppliesCost) || 0)}`}  C={C} />
            <BreakdownRow label="Travel"        value={`£${gbp(parseFloat(travelCost) || 0)}`}    C={C} />
            {q.overheadPerVisit > 0 && (
              <BreakdownRow label="Overhead share" value={`£${gbp(q.overheadPerVisit)}`}          C={C} />
            )}
            <BreakdownRow label="Your total cost"  value={`£${gbp(q.cost)}`}        C={C} accent />
            <BreakdownRow label="Contract clean"  value={`£${gbp(q.cleanPrice)}`}  C={C} accent />
            {q.addonTotal > 0 && (
              <BreakdownRow label="Add-ons"        value={`£${gbp(q.addonTotal)}`}  C={C} />
            )}
            <BreakdownRow label="Total charge"    value={`£${gbp(q.price)}`}        C={C} accent />
            <BreakdownRow label="Profit on clean" value={`£${gbp(q.profit)}`}       C={C} last />
          </Card>

          {/* Monthly + contract value */}
          {q.freq.vpm > 0 && (
            <Card C={C}>
              <SectionLabel C={C}>Monthly value ({q.freq.label})</SectionLabel>
              <BreakdownRow label="Revenue"         value={`£${gbp(q.mRev)}`}    C={C} accent />
              <BreakdownRow label="Your costs"      value={`£${gbp(q.mCost)}`}   C={C} />
              <BreakdownRow label="Monthly profit"  value={`£${gbp(q.mProfit)}`} C={C} last={q.ct.months === 0} />
              {q.ct.months > 0 && (
                <>
                  <div style={{ height: 10 }} />
                  <SectionLabel C={C}>Contract total ({q.ct.months} months)</SectionLabel>
                  <BreakdownRow
                    label={`${q.ct.months}-month contract value`}
                    value={`£${gbp(q.cVal)}`}
                    C={C} accent large last
                  />
                </>
              )}
            </Card>
          )}

          {/* Contract discount schedule */}
          <Card C={C}>
            <SectionLabel C={C}>Discount schedule</SectionLabel>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 10 }}>
              Clean price per visit. Add-ons are charged on top at fixed rates.
            </div>
            {CONTRACTS.map(ct => {
              const ctPrice  = q.basePrice * (1 - ct.disc);
              const isActive = ct.id === contract;
              return (
                <div
                  key={ct.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 6, marginBottom: 4,
                    background: isActive ? `${C.accent}14` : C.bg,
                    border: `1px solid ${isActive ? C.accent : C.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: isActive ? 700 : 400, color: C.text }}>
                      {ct.label}
                    </span>
                    {ct.disc > 0 && (
                      <span style={{
                        fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.success,
                        background: `${C.success}18`, borderRadius: 4, padding: '1px 6px',
                      }}>
                        -{ct.disc * 100}%
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: isActive ? C.accent : C.text }}>
                    £{gbp(ctPrice)}/visit
                  </span>
                </div>
              );
            })}
          </Card>

          {/* Copy button */}
          <button
            onClick={copyQuote}
            style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 600,
              padding: '11px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${C.accent}`,
              background: copied ? C.success : `${C.accent}18`,
              color: copied ? '#fff' : C.text,
              width: '100%', transition: 'all 0.2s',
            }}
          >
            {copied ? 'Copied to clipboard' : 'Copy quote summary'}
          </button>

          {/* Industry notes */}
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, lineHeight: 1.7, padding: '2px 4px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: C.text }}>Industry context</div>
            Time estimates are London averages. A 20-25% margin is minimum viable; 30-40% is healthy for a small cleaning business. Annual contracts are common with letting agents and property managers -- offer them first as it de-risks your pipeline.
          </div>
        </div>
      </div>

      {/* ── Briefing Guide / SOP ── */}
      <div style={{ marginTop: '1.25rem' }}>
        <Card C={C}>
          {/* Collapsible toggle */}
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowSOP(s => !s)}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Briefing Guide</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Time allocations, what to tell clients and cleaners, minimum standards
              </div>
            </div>
            <span style={{ fontSize: 12, color: C.muted, flexShrink: 0, marginLeft: 16 }}>
              {showSOP ? '▲ Hide' : '▼ Show'}
            </span>
          </div>

          {showSOP && (
            <div style={{ paddingTop: 20, marginTop: 16, borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem' }}>

                {/* ── Left: Time reference tables ── */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Time Allocation Reference</div>

                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Airbnb / Short-let
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Property</th>
                        <th style={thRStyle}>Cleaner gets</th>
                        <th style={thRStyle}>Tell client</th>
                      </tr>
                    </thead>
                    <tbody>
                      {AIRBNB_SOP.map(({ label, alloc }) => (
                        <tr key={label}>
                          <td style={{ padding: '6px 0', color: C.text }}>{label}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: C.text }}>{fmtH(alloc)}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', color: C.muted }}>{clientRange(alloc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Commercial Office
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Size</th>
                        <th style={thRStyle}>Cleaner gets</th>
                        <th style={thRStyle}>Tell client</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMMERCIAL_SOP.map(({ label, alloc, minNote }) => (
                        <tr key={label}>
                          <td style={{ padding: '6px 0', color: C.text }}>
                            {label}{minNote && <span style={{ color: C.warning, marginLeft: 3 }}>*</span>}
                          </td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: C.text }}>{fmtH(alloc)}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', color: C.muted }}>{clientRange(alloc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                    * 3-hour minimum applies. Restaurant / cafe: multiply times by 1.5 due to grease and equipment.
                  </div>

                  <div style={{
                    fontSize: 11, color: C.muted, padding: '8px 10px',
                    background: `${C.accent}08`, borderRadius: 6, borderLeft: `3px solid ${C.accent}`,
                  }}>
                    Times above are for one cleaner. With 2 cleaners the on-site visit time halves, but total labour hours billed are the same.
                  </div>
                </div>

                {/* ── Right: Scripts + rules ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* What to tell the cleaner */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                      What to tell the cleaner
                    </div>
                    <div style={{
                      background: `${C.success}0d`, border: `1px solid ${C.success}30`,
                      borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.success, marginBottom: 5 }}>Fixed time only -- never a range</div>
                      <div style={{ fontSize: 12, color: C.text, fontStyle: 'italic' }}>
                        "You have 3.5 hours for this job."
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.75 }}>
                      Always give cleaners a single fixed time. If they finish in 3 hours, that is good work and they still get paid for 3.5. Giving a range ("3 to 3.5 hours") removes the incentive to pace well. If someone consistently finishes significantly early, that is a review conversation -- not something you flag before the job.
                    </div>
                  </div>

                  {/* What to tell the client */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                      What to tell the client
                    </div>
                    <div style={{
                      background: `${C.accent}0d`, border: `1px solid ${C.accent}30`,
                      borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 5 }}>Always a range, never a fixed time</div>
                      <div style={{ fontSize: 12, color: C.text, fontStyle: 'italic' }}>
                        "It typically takes 3 to 3.5 hours. Your first clean may take 15-20 minutes longer as we get familiar with the property."
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.75 }}>
                      A range protects you if the job runs slightly long and feels like a bonus if it finishes early. Never commit to a fixed time with clients -- if you say "exactly 3 hours" and the cleaner takes 3h 10min, you have a complaint on your hands. The range eliminates this entirely.
                    </div>
                  </div>

                  {/* Minimum standards */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                      Minimum job lengths
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { icon: '🏠', title: 'Airbnb & domestic',      rule: '2 hours minimum -- never less' },
                        { icon: '🏢', title: 'Commercial / offices',   rule: '3 hours minimum -- not worth a cleaner leaving home for less' },
                      ].map(({ icon, title, rule }) => (
                        <div key={title} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '8px 12px', background: C.bg, borderRadius: 7, border: `1px solid ${C.border}`,
                        }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{title}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{rule}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contract margin explained */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                      How contract margins work
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.75 }}>
                      Longer contracts get bigger discounts, so the base price must be higher to stay profitable. The calculator sets this automatically -- you enter your minimum margin floor and it adjusts the base upward so every contract discount preserves it.
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: 11, color: C.muted,
                      padding: '8px 10px', background: `${C.border}40`, borderRadius: 6,
                    }}>
                      Example: 25% floor + 20% annual discount = 40% base margin required. Enter 25%, the calculator handles the rest.
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
