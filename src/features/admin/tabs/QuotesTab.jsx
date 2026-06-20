import { useState, useMemo } from 'react';
import { db } from '../../../firebase/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { ESTATE_CLEAN_TYPES, ESTATE_CLEAN_MULTIPLIERS } from '../utils';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const AIRBNB_BASE_HOURS = {
  studio: 2.0,
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
  { id: 'oven',       label: 'Oven deep clean',  h: 0.5,  price: 40, note: 'Interior, racks, door and casing' },
  { id: 'fridge',     label: 'Inside fridge',    h: 0.33, price: 18, note: 'Full interior clean' },
  { id: 'laundry',    label: 'Laundry & fold',   h: 0.5,  price: 20 },
  { id: 'linen',      label: 'Linen change',     h: 0.33, price: 12 },
  { id: 'windows',    label: 'Internal windows', h: 0.5,  price: 20, note: 'Standard windows' },
  { id: 'patio',      label: 'Balcony / patio',  h: 0.33, price: 30 },
  { id: 'restocking', label: 'Restocking handling fee', h: 0.25, price: 12, note: 'Handling fee only — supply costs invoiced separately at receipt price. Confirm items needed before visit. Host to send supplies directly for bulky/expensive items.' },
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
  { id: 'daily',       label: 'Daily',        vpm: 0      },
  { id: 'thrice',      label: '3x per week',  vpm: 13     },
  { id: 'twice',       label: '2x per week',  vpm: 104/12 },
  { id: 'weekly',      label: 'Weekly',       vpm: 52/12  },
  { id: 'fortnightly', label: 'Fortnightly',  vpm: 26/12  },
  { id: 'monthly',     label: 'Monthly',      vpm: 1      },
];

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
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

export default function QuotesTab({ isMobile, C, expenses = [], fixedCosts = [], marketingSpend = [], supplies = [], bookings = [], savedQuotes = [], onNavigate }) {
  const [clientType,     setClientType]     = useState('airbnb');
  // Airbnb and Estate Agent are both per-visit property cleans (one-off, no contract). They share
  // the same form, pricing and booking shape, so 'perVisit' routes those shared branches. Points
  // that genuinely differ (labels, the saved booking flag) check clientType directly instead.
  const perVisit = clientType === 'airbnb' || clientType === 'estateAgent';
  const [airbnbPropType, setAirbnbPropType] = useState('flat');
  const [cleanType,      setCleanType]      = useState(ESTATE_CLEAN_TYPES[0]);
  const [bedrooms,       setBedrooms]       = useState('2');
  const [extraBaths,     setExtraBaths]     = useState('1');
  const [sqm,          setSqm]          = useState('80');
  const [intensity,    setIntensity]    = useState('office');
  const [complexity,   setComplexity]   = useState('normal');
  const [commBaths,    setCommBaths]    = useState('1');
  const [addons,       setAddons]       = useState([]);
  const [frequency,    setFrequency]    = useState('weekly');
  const [selectedDays, setSelectedDays] = useState([]);
  const [contract,     setContract]     = useState('monthly');
  const [numCleaners,  setNumCleaners]  = useState('1');
  const [cleanerRate,  setCleanerRate]  = useState('17');
  const [suppliesCost, setSuppliesCost] = useState('5');
  const [travelCost,   setTravelCost]   = useState('5');
  const [minMargin,    setMinMargin]    = useState('25');
  const [targetVisits, setTargetVisits] = useState('15');

  const [bizName,       setBizName]       = useState('');
  const [contactName,   setContactName]   = useState('');
  const [clientEmail,   setClientEmail]   = useState('');
  const [clientPhone,   setClientPhone]   = useState('');
  const [addr1,    setAddr1]    = useState('');
  const [addr2,    setAddr2]    = useState('');
  const [postcode, setPostcode] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [manualPrice,  setManualPrice]  = useState('');
  const [quoteNotes,    setQuoteNotes]    = useState('');

  const [followUpDate,  setFollowUpDate]  = useState('');
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');
  const [savedOk,       setSavedOk]       = useState(false);

  const [quoteSearch,   setQuoteSearch]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');

  const [showBookPanel,   setShowBookPanel]   = useState(false);
  const [contractStart,   setContractStart]   = useState('');
  const [contractTime,    setContractTime]    = useState('09:00');
  const [keyType,         setKeyType]         = useState('client_present');
  const [lockboxCode,     setLockboxCode]     = useState('');
  const [bParking,        setBParking]        = useState('');
  const [bFloor,          setBFloor]          = useState('');
  const [bMediaConsent,   setBMediaConsent]   = useState(false);
  const [booking,         setBooking]         = useState(false);
  const [bookError,       setBookError]       = useState('');
  const [bookedOk,        setBookedOk]        = useState(false);
  const [loadedQuoteId,   setLoadedQuoteId]   = useState(null);

  const [copied,         setCopied]         = useState(false);
  const [showSOP,        setShowSOP]        = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState(new Set());
  const [deletingQuotes, setDeletingQuotes] = useState(false);

  const toggleAddon = id =>
    setAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const validPhone = v => { const d = v.replace(/[\s\-\(\)]/g, ''); return !v.trim() || (/^(\+44|0)\d{9,10}$/.test(d)); };
  const validPostcode = v => !v.trim() || /^[A-Z]{1,2}\d[0-9A-Z]?\s*\d[A-Z]{2}$/i.test(v.trim());

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
    if (perVisit) {
      const key = bedrooms === 'studio' ? 'studio' : parseInt(bedrooms, 10);
      base = AIRBNB_BASE_HOURS[key] || 2.5;
      base += Math.max((parseInt(extraBaths, 10) || 1) - 1, 0) * 0.5;
      if (airbnbPropType === 'house') base += 0.75; // stairs, landing, hallways
      // Estate Agent: scale the clean by type (end of tenancy heavier, void lighter).
      // Manual-quote types (null) keep base hours just as a rough labour estimate.
      if (clientType === 'estateAgent') base *= (ESTATE_CLEAN_MULTIPLIERS[cleanType] ?? 1);
    } else {
      const s = parseFloat(sqm) || 80;
      let h = s <= 50 ? 1.5 : s <= 100 ? 2.5 : s <= 150 ? 3.5 : s <= 200 ? 4.5 : s <= 300 ? 6.0 : 8.0;
      const typeMult = { office: 1.0, retail: 1.1, restaurant: 1.2, other: 1.0 };
      const complexMult = { easy: 0.9, normal: 1.0, complex: 1.1, difficult: 1.25 };
      base = h * (typeMult[intensity] || 1.0) * (complexMult[complexity] || 1.0);
      base += Math.max((parseInt(commBaths, 10) || 1) - 1, 0) * 0.5;
    }
    const addonList = perVisit ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;
    const addonH = addons.reduce((sum, id) => sum + (addonList.find(x => x.id === id)?.h || 0), 0);
    return base + addonH;
  }, [clientType, cleanType, airbnbPropType, bedrooms, extraBaths, sqm, intensity, complexity, commBaths, addons]);

  const q = useMemo(() => {
    const ct            = CONTRACTS.find(c => c.id === contract) || CONTRACTS[0];
    const minMarg       = (parseFloat(minMargin) || 25) / 100;
    const margin        = Math.min(1 - (1 - minMarg) * (1 - ct.disc), 0.99);
    // Add-ons use fixed prices -- separate from the cost-plus clean calculation
    const addonList     = perVisit ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;
    const selectedAddons = addons.map(id => addonList.find(a => a.id === id)).filter(Boolean);
    const addonHours    = selectedAddons.reduce((s, a) => s + a.h, 0);
    const addonTotal    = selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
    const baseHours     = totalHours - addonHours;
    const labor         = baseHours * (parseFloat(cleanerRate) || 0);
    const overheadDivisor = Math.max(parseInt(targetVisits, 10) || 15, 1);
    const overheadPerVisit = overhead.total / overheadDivisor;
    const cost          = labor + (parseFloat(suppliesCost) || 0) + (parseFloat(travelCost) || 0) + overheadPerVisit;
    const basePrice     = cost / (1 - margin);
    const autoClean     = basePrice * (1 - ct.disc);
    const manualVal     = (manualPrice !== '' && parseFloat(manualPrice) > 0) ? parseFloat(manualPrice) : null;
    // After-Builders / Communal are manual-quote only: no auto price, the admin types it in.
    const manualQuote   = clientType === 'estateAgent' && ESTATE_CLEAN_MULTIPLIERS[cleanType] == null;
    const cleanPrice    = manualQuote ? (manualVal ?? 0) : (manualVal ?? autoClean);
    const calcPrice     = autoClean + addonTotal;
    const price         = cleanPrice + addonTotal;
    const effectiveClean = cleanPrice;
    const addonLaborCost    = addonHours * (parseFloat(cleanerRate) || 0);
    const trueCost          = cost + addonLaborCost;
    const profit            = effectiveClean - cost;
    const addonNetProfit    = addonTotal - addonLaborCost;
    const profitWithAddons  = profit + addonNetProfit;
    const pct               = effectiveClean > 0 ? (profit / effectiveClean) * 100 : 0;
    const freq              = FREQUENCY.find(f => f.id === frequency) || FREQUENCY.find(f => f.id === 'weekly') || FREQUENCY[0];
    const effectiveVpm      = frequency === 'daily' ? selectedDays.length * (52/12) : freq.vpm;
    const mRev              = effectiveVpm * price;
    const mBaseRev          = effectiveVpm * effectiveClean;
    const mAddonRev         = effectiveVpm * addonTotal;
    const mCost             = effectiveVpm * cost;
    const mProfit           = effectiveVpm * profit;
    const mProfitWithAddons = effectiveVpm * profitWithAddons;
    const mTrueCost         = effectiveVpm * trueCost;
    const cVal              = ct.months * mRev;
    const cBaseVal          = ct.months * mBaseRev;
    const visitDur          = totalHours / Math.max(parseInt(numCleaners, 10) || 1, 1);
    return { labor, overheadPerVisit, cost, trueCost, addonLaborCost, basePrice, cleanPrice, price, profit, profitWithAddons, pct, addonTotal, mRev, mBaseRev, mAddonRev, mCost, mTrueCost, mProfit, mProfitWithAddons, cVal, cBaseVal, ct, freq, visitDur, calcPrice, manualQuote };
  }, [totalHours, cleanerRate, suppliesCost, travelCost, minMargin, overhead, targetVisits, contract, frequency, selectedDays, numCleaners, addons, clientType, cleanType, manualPrice]);

  const marginColor = q.pct < 25 ? C.danger : q.pct < 30 ? C.warning : C.success;

  const handleSaveQuote = async () => {
    setSubmitAttempted(true);
    if (clientType !== 'airbnb' && !bizName.trim()) { setSaveError('Enter a business name first.'); return; }
    if (!clientEmail.trim()) { setSaveError('Enter the client email to send the quote.'); return; }
    if (!followUpDate)       { setSaveError('Set a follow-up date.'); return; }
    setSaving(true); setSaveError('');
    try {
      const addonList = perVisit ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;
      const selectedAddons = addons.map(id => addonList.find(a => a.id === id)).filter(Boolean);
      const now = new Date().toISOString();
      await addDoc(collection(db, 'savedQuotes'), {
        bizName: (clientType === 'airbnb' ? contactName.trim() || addr1.trim() : bizName.trim()), contactName: contactName.trim(),
        email: clientEmail.trim(), phone: clientPhone.trim(),
        addr1: addr1.trim(), addr2: addr2.trim(), postcode: postcode.trim().toUpperCase(),
        notes: quoteNotes.trim(),
        clientType, bedrooms, extraBaths, sqm, intensity, complexity, commBaths,
        addons, frequency, selectedDays, contract, numCleaners, cleanerRate, suppliesCost, travelCost, minMargin,
        pricePerVisit: q.price, monthlyValue: q.mRev, contractValue: q.cVal,
        contractLabel: q.ct.label, frequencyLabel: q.freq.label,
        status: 'quote_sent', followUpDate, createdAt: now, updatedAt: now,
      });
      const templateId = import.meta.env.VITE_EMAILJS_CONTRACT_QUOTE_TEMPLATE;
      if (templateId) {
        try {
          await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            templateId,
            {
              to_name: contactName.trim() || bizName.trim(),
              to_email: clientEmail.trim(),
              business_name: bizName.trim(),
              service_type: clientType === 'estateAgent' ? 'Estate Agent Cleaning' : clientType === 'airbnb' ? 'Airbnb / Short-let Cleaning' : 'Commercial Cleaning',
              property_detail: perVisit
                ? `${bedrooms === 'studio' ? 'Studio' : `${bedrooms}-bed`}, ${extraBaths} bathroom${extraBaths !== '1' ? 's' : ''}`
                : `${sqm}sqm ${intensity}, ${commBaths} bathroom${commBaths !== '1' ? 's' : ''}`,
              frequency: q.freq.label, contract_type: q.ct.label,
              addons_list: selectedAddons.length ? selectedAddons.map(a => `${a.label} — £${a.price}`).join('\n') : 'None',
              base_price_per_visit: `£${gbp(q.cleanPrice)}`,
              addon_total: selectedAddons.length ? `£${gbp(q.addonTotal)}` : '',
              price_per_visit: `£${gbp(q.price)}`,
              monthly_value: q.mRev > 0 ? `£${gbp(q.mRev)}/month` : 'N/A',
              monthly_base_value: q.mBaseRev > 0 ? `£${gbp(q.mBaseRev)}/month` : 'N/A',
              contract_total: q.cBaseVal > 0 ? `£${gbp(q.cBaseVal)}` : 'N/A',
              notes: quoteNotes.trim() || '',
              reply_to: 'bookings@londoncleaningwizard.com',
            },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
          );
        } catch (emailErr) {
          console.error('Email send failed:', emailErr);
          setSaveError('Quote saved but email failed to send. Check your EmailJS template.');
        }
      } else {
        setSaveError('Quote saved. Email not sent -- add VITE_EMAILJS_CONTRACT_QUOTE_TEMPLATE to your .env to enable emails.');
      }
      setSavedOk(true); setShowSavePanel(false); setFollowUpDate('');
      setTimeout(() => setSavedOk(false), 4000);
    } catch (err) {
      setSaveError('Failed to save quote. Check your connection.');
      console.error(err);
    } finally { setSaving(false); }
  };

  const loadQuote = sq => {
    setBizName(sq.bizName || ''); setContactName(sq.contactName || '');
    setClientEmail(sq.email || ''); setClientPhone(sq.phone || '');
    setAddr1(sq.addr1 || sq.address || ''); setAddr2(sq.addr2 || ''); setPostcode(sq.postcode || '');
    setQuoteNotes(sq.notes || ''); setSubmitAttempted(false);
    setClientType(sq.clientType || 'airbnb'); setBedrooms(sq.bedrooms || '2');
    setExtraBaths(sq.extraBaths || '1'); setSqm(sq.sqm || '80');
    setIntensity(sq.intensity || 'office'); setComplexity(sq.complexity || 'normal');
    setCommBaths(sq.commBaths || '1'); setAddons(sq.addons || []);
    setFrequency(sq.frequency || 'weekly');
    setSelectedDays(sq.selectedDays || []);
    setContract(sq.contract || 'monthly');
    setNumCleaners(sq.numCleaners || '1'); setCleanerRate(sq.cleanerRate || '17');
    setSuppliesCost(sq.suppliesCost || '5'); setTravelCost(sq.travelCost || '5');
    setMinMargin(sq.minMargin || '25');
    setLoadedQuoteId(sq.id || null);
    setQuoteSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateQuoteStatus = (id, status) =>
    updateDoc(doc(db, 'savedQuotes', id), { status, updatedAt: new Date().toISOString() });

  const deleteQuote = id => deleteDoc(doc(db, 'savedQuotes', id));

  const deleteSelected = async () => {
    if (!selectedQuotes.size) return;
    setDeletingQuotes(true);
    await Promise.all([...selectedQuotes].map(id => deleteDoc(doc(db, 'savedQuotes', id))));
    setSelectedQuotes(new Set());
    setDeletingQuotes(false);
  };

  const deleteAll = async () => {
    if (!window.confirm(`Delete all ${savedQuotes.length} saved quotes? This cannot be undone.`)) return;
    setDeletingQuotes(true);
    await Promise.all(savedQuotes.map(sq => deleteDoc(doc(db, 'savedQuotes', sq.id))));
    setSelectedQuotes(new Set());
    setDeletingQuotes(false);
  };

  const toggleSelectQuote = id => setSelectedQuotes(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const generateVisitDates = (startDate, endDate, freq, days = []) => {
    const dates = [];
    const start = new Date(startDate + 'T12:00:00');
    const end   = new Date(endDate   + 'T12:00:00');
    let d = new Date(start);
    if (freq === 'daily') {
      const allowed = days.length > 0 ? days : [1,2,3,4,5];
      while (d <= end) { if (allowed.includes(d.getDay())) dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    } else if (freq === 'thrice') {
      const twDays = days.length === 3 ? days : [1, 3, 5];
      while (d <= end) { if (twDays.includes(d.getDay())) dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    } else if (freq === 'twice') {
      const twDays = days.length === 2 ? days : [1, 4];
      while (d <= end) { if (twDays.includes(d.getDay())) dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    } else if (freq === 'weekly') {
      while (d <= end) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 7); }
    } else if (freq === 'fortnightly') {
      while (d <= end) { dates.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 14); }
    } else if (freq === 'monthly') {
      while (d <= end) { dates.push(d.toISOString().slice(0, 10)); d.setMonth(d.getMonth() + 1); }
    }
    return dates;
  };

  const handleBookContract = async () => {
    setSubmitAttempted(true);
    if (clientType !== 'airbnb' && !bizName.trim()) { setBookError('Enter a business name first.'); return; }
    if (!clientEmail.trim()) { setBookError('Enter the client email.'); return; }
    if (q.manualQuote && !(parseFloat(manualPrice) > 0)) { setBookError(`${cleanType} is quoted manually — enter a price in "Manual price override" first.`); return; }
    if (!contractStart)      { setBookError(perVisit ? 'Set a visit date.' : 'Set a contract start date.'); return; }
    if (!perVisit && (frequency === 'daily' || frequency === 'twice' || frequency === 'thrice')) {
      const required = frequency === 'twice' ? 2 : frequency === 'thrice' ? 3 : 1;
      if (selectedDays.length < required) { setBookError(frequency === 'daily' ? 'Select at least one day before booking.' : `Select ${required} days for ${required}x per week before booking.`); return; }
      const startDay = new Date(contractStart + 'T12:00:00').getDay();
      if (!selectedDays.includes(startDay)) {
        const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const chosen = selectedDays.map(d => DAY_NAMES[d]).join(', ');
        setBookError(`Start date must fall on one of your selected days (${chosen}).`);
        return;
      }
    }
    setBooking(true); setBookError('');
    try {
      const nameParts  = contactName.trim().split(' ');
      const firstName  = nameParts[0] || bizName.trim();
      const lastName   = nameParts.slice(1).join(' ') || '';
      const addonList  = perVisit ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;
      const selectedAddons = addons.map(id => addonList.find(a => a.id === id)).filter(Boolean);
      const nClean         = parseInt(numCleaners, 10) || 1;
      const addonHrs       = selectedAddons.reduce((s, a) => s + (a.h || 0), 0);
      const visitDurationBase = q.visitDur - addonHrs / nClean;
      const now = new Date().toISOString();
      const keysLabel = {
        client_present: 'Client / host present',
        spare_key:      'Spare key held by us',
        lockbox:        `Lockbox / key safe${lockboxCode ? ` — code: ${lockboxCode}` : ''}`,
        concierge:      'Concierge / building reception',
        management:     'Management company / agent',
      }[keyType] || keyType;

      const sharedFields = {
        firstName, lastName,
        email: clientEmail.trim(),
        phone: clientPhone.trim(),
        addr1: addr1.trim(),
        addr2: addr2.trim(),
        postcode: postcode.trim().toUpperCase(),
        cleanDate: contractStart,
        cleanTime: contractTime,
        floor: bFloor.trim(),
        parking: bParking.trim(),
        keys: keysLabel,
        mediaConsent: bMediaConsent,
        ...(bMediaConsent ? { mediaConsentDiscount: 10 } : {}),
        notes: quoteNotes.trim(),
        isPhoneBooking: true,
        stripeDepositIntentId: 'manual',
        stripeCustomerId: '',
        total: q.price,
        deposit: 0,
        remaining: q.price,
        bizName: (clientType === 'airbnb' ? contactName.trim() || addr1.trim() : bizName.trim()),
        contactName: contactName.trim(),
        clientType,
        numCleaners: nClean,
        visitDuration: q.visitDur,
        visitDurationBase,
        pricePerVisit: Math.max(0, Math.round((q.price - q.addonTotal) * 100) / 100),
        totalPerVisit: q.price,
        addons: selectedAddons.map(a => ({ id: a.id, name: a.label, price: a.price, h: a.h || 0 })),
        addonsList: selectedAddons.map(a => a.label).join(', '),
        addonTotal: q.addonTotal,
        marketingOptOut: true,
        doNotContact: true,
        createdAt: now,
        updatedAt: now,
      };

      if (perVisit) {
        // Airbnb & Estate Agent: one-off per-visit booking — no contract, no visits generated.
        // Media consent discount applies to first visit only.
        const isEA       = clientType === 'estateAgent';
        const firstTotal = bMediaConsent ? Math.round((q.price - 10) * 100) / 100 : q.price;
        // Airbnb takes a 30% deposit; Estate Agent is charged in FULL upfront (deposit = full total).
        const depositAmt   = isEA ? firstTotal : Math.ceil(firstTotal * 0.30 * 100) / 100;
        const remainingAmt = Math.round((firstTotal - depositAmt) * 100) / 100;
        const ref = await addDoc(collection(db, 'bookings'), {
          ...sharedFields,
          total:     firstTotal,
          deposit:   depositAmt,
          remaining: remainingAmt,
          ...(bMediaConsent ? { originalTotal: q.price } : {}),
          packageId:   isEA ? 'estate_agent' : 'airbnb',
          packageName: isEA ? 'Estate Agent Clean' : 'Airbnb Turnaround',
          frequency: 'flexible',
          bathrooms: parseInt(extraBaths, 10) || 1,
          bedrooms,
          propertyType: airbnbPropType,
          size: bedrooms === 'studio' ? 'Studio' : `${bedrooms} bedroom${parseInt(bedrooms) > 1 ? 's' : ''}`,
          hasPets: false,
          source: isEA ? 'Estate Agent Quote' : 'Airbnb Quote',
          status: 'pending_deposit',
          ...(isEA ? { isEstateAgent: true, cleanType } : { isAirbnb: true }),
        });
        fetch(import.meta.env.VITE_CF_ASSIGN_CONTRACT_REF, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: ref.id }),
        }).catch(() => {});
        fetch(import.meta.env.VITE_CF_CREATE_CALENDAR_EVENT, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: ref.id }),
        }).catch(() => {});

      } else {
        // Commercial: single CF call creates master + all visits + calendar events atomically
        const ct = CONTRACTS.find(c => c.id === contract) || CONTRACTS[0];
        const startD = new Date(contractStart + 'T00:00:00');
        const endD   = new Date(startD);
        endD.setMonth(endD.getMonth() + ct.months);
        const contractEnd = endD.toISOString().slice(0, 10);
        const biz = bizName.trim();
        const masterData = {
          ...sharedFields,
          packageId: 'commercial',
          packageName: 'Commercial Cleaning',
          frequency,
          bathrooms: parseInt(commBaths, 10) || 1,
          hasPets: false,
          source: 'Contract Quote',
          status: 'scheduled',
          isContract: true,
          contractType: contract,
          contractLabel: ct.label,
          contractStartDate: contractStart,
          contractEndDate: contractEnd,
          monthlyBaseValue: q.mBaseRev,
          monthlyValue: q.mRev,
          firstMonthCharge: parseFloat((q.mBaseRev - (bMediaConsent ? 10 : 0)).toFixed(2)),
          frequencyLabel: q.freq.label,
          scheduledDays: (frequency === 'daily' || frequency === 'twice' || frequency === 'thrice') ? selectedDays : [],
          monthlyPayments: {},
        };
        const visitBase = {
          isContractVisit: true,
          firstName, lastName,
          email: clientEmail.trim(),
          phone: clientPhone.trim(),
          addr1: addr1.trim(),
          addr2: addr2.trim(),
          postcode: postcode.trim().toUpperCase(),
          cleanTime: contractTime,
          floor: bFloor.trim(),
          parking: bParking.trim(),
          keys: keysLabel,
          bizName: biz,
          clientType,
          packageName: 'Commercial Cleaning',
          numCleaners: nClean,
          visitDurationBase,
          addons: selectedAddons.map(a => ({ id: a.id, name: a.label, price: a.price, h: a.h || 0 })),
          addonsList: selectedAddons.map(a => a.label).join(', '),
          addonTotal: q.addonTotal,
          pricePerVisit: Math.max(0, Math.round((q.price - q.addonTotal) * 100) / 100),
          totalPerVisit: q.price,
          total: q.price,
          status: 'scheduled',
          frequency,
          bathrooms: parseInt(commBaths, 10) || 1,
        };
        const cfRes = await fetch(import.meta.env.VITE_CF_CREATE_CONTRACT_BOOKING, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masterData, visitBase, contractStart, contractEnd, frequency, selectedDays, firstVisitMediaDiscount: bMediaConsent }),
        });
        if (!cfRes.ok) throw new Error('Contract booking CF failed');
      }

      if (loadedQuoteId) {
        await updateDoc(doc(db, 'savedQuotes', loadedQuoteId), { status: 'booked', updatedAt: now });
      }
      setBookedOk(true); setShowBookPanel(false); setContractStart(''); setLoadedQuoteId(null);
      setTimeout(() => { setBookedOk(false); if (onNavigate) onNavigate('bookings'); }, 1500);
    } catch (err) {
      setBookError('Something went wrong. Try again.');
      console.error(err);
    } finally { setBooking(false); }
  };

  const copyQuote = () => {
    const name = bizName ? `${bizName} -- ` : '';
    const type = perVisit
      ? `${bedrooms === 'studio' ? 'Studio' : `${bedrooms}-bed`} ${clientType === 'estateAgent' ? 'Estate Agent' : 'Airbnb'}`
      : `Commercial (${sqm} sqm)`;
    const freqLabel = ` ${q.freq.label.toLowerCase()} clean`;
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
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Quotes / Enquiries & Pricing</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
          Book Airbnb visits and quote commercial contracts -- with full cost and profit visibility.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Left column: Inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Client details */}
          <Card C={C}>
            <SectionLabel C={C}>Client Details</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {clientType !== 'airbnb' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{clientType === 'estateAgent' ? 'Estate agency name' : 'Business name'} <span style={{ color: C.danger }}>*</span></div>
                  <input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="e.g. Oakwood Office, The Anchor Pub..." style={{ ...inputStyle, borderColor: submitAttempted && !bizName.trim() ? C.danger : undefined }} />
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Contact name</div>
                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="First & last name" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Phone</div>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="07..." style={{ ...inputStyle, borderColor: submitAttempted && !validPhone(clientPhone) ? C.danger : undefined }} />
                {submitAttempted && !validPhone(clientPhone) && <div style={{ fontSize: 10, color: C.danger, marginTop: 3 }}>Enter a valid UK number (e.g. 07700 900123)</div>}
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Email <span style={{ color: C.danger }}>*</span></div>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" style={{ ...inputStyle, borderColor: submitAttempted && !clientEmail.trim() ? C.danger : undefined }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Address line 1</div>
                <input value={addr1} onChange={e => setAddr1(e.target.value)} placeholder="Street address" style={inputStyle} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Address line 2 <span style={{ color: C.muted, fontStyle: 'italic' }}>(optional)</span></div>
                <input value={addr2} onChange={e => setAddr2(e.target.value)} placeholder="Flat, floor, building name..." style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Postcode</div>
                <input value={postcode} onChange={e => setPostcode(e.target.value.toUpperCase())} placeholder="E.g. E14 5AB" style={{ ...inputStyle, borderColor: submitAttempted && postcode.trim() && !validPostcode(postcode) ? C.danger : undefined }} />
                {submitAttempted && postcode.trim() && !validPostcode(postcode) && <div style={{ fontSize: 10, color: C.danger, marginTop: 3 }}>Enter a valid UK postcode (e.g. E14 5AB)</div>}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Notes</div>
                <input value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} placeholder="Special requirements, access info, key holding..." style={inputStyle} />
              </div>
            </div>
          </Card>

          {/* Property type + sizing */}
          <Card C={C}>
            <SectionLabel C={C}>Property</SectionLabel>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {typeTabBtn('airbnb',      'Airbnb / Short-let')}
              {typeTabBtn('estateAgent', 'Estate Agent')}
              {typeTabBtn('commercial',  'Commercial')}
            </div>

            {perVisit && (
              <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                This is a per-visit booking, not a quote or contract. Each visit is booked individually -- no fixed schedule. Once booked, all visits can be added as and when needed.
              </div>
            )}
            {perVisit ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {clientType === 'estateAgent' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Type of clean</div>
                    <select value={cleanType} onChange={e => setCleanType(e.target.value)} style={inputStyle}>
                      {ESTATE_CLEAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {q.manualQuote
                      ? <div style={{ fontSize: 10, color: '#b45309', marginTop: 4 }}>Quoted manually (varies too much to auto-price) — enter the price in "Manual price override" below.</div>
                      : <div style={{ fontSize: 10, color: C.faint || C.muted, marginTop: 4 }}>Auto-priced at {ESTATE_CLEAN_MULTIPLIERS[cleanType]}× the base clean. You can still override below.</div>}
                  </div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Property type</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{id:'flat',label:'Flat / Apartment'},{id:'house',label:'House'}].map(t => (
                      <button key={t.id} onClick={() => setAirbnbPropType(t.id)} style={{ fontFamily: FONT, fontSize: 12, padding: '6px 16px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${airbnbPropType === t.id ? C.accent : C.border}`, background: airbnbPropType === t.id ? C.accent : C.card, color: airbnbPropType === t.id ? '#fff' : C.text, fontWeight: airbnbPropType === t.id ? 600 : 400 }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {airbnbPropType === 'house' && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>+45 min added for stairs, landing and hallways</div>}
                </div>
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
              {(perVisit ? AIRBNB_ADDONS : COMMERCIAL_ADDONS).map(a => (
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
            <SectionLabel C={C}>{perVisit ? 'Cleaners' : 'Frequency & contract'}</SectionLabel>

            <div style={{ display: 'grid', gridTemplateColumns: perVisit ? '1fr' : '1fr 1fr', gap: 10, marginBottom: perVisit ? 0 : 14 }}>
              {!perVisit && (
                <>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>How often</div>
                    <select value={frequency} onChange={e => {
                      const f = e.target.value;
                      setFrequency(f);
                      if (f === 'daily' || f === 'twice' || f === 'thrice') setSelectedDays([]);
                    }} style={inputStyle}>
                      {FREQUENCY.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                  {(frequency === 'daily' || frequency === 'twice' || frequency === 'thrice') && (
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>
                        Which days{frequency === 'twice' ? ' (2 required)' : frequency === 'thrice' ? ' (3 required)' : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {DAYS.map(d => {
                          const sel = selectedDays.includes(d.value);
                          const required = frequency === 'twice' ? 2 : frequency === 'thrice' ? 3 : null;
                          const disabled = !sel && required !== null && selectedDays.length >= required;
                          return (
                            <button key={d.value} disabled={disabled} onClick={() => {
                              if (sel) setSelectedDays(prev => prev.filter(x => x !== d.value));
                              else setSelectedDays(prev => [...prev, d.value].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)));
                            }} style={{ fontFamily: FONT, fontSize: 11, fontWeight: sel ? 700 : 400, padding: '5px 9px', borderRadius: 5, border: `1px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent : C.bg, color: sel ? '#fff' : disabled ? C.muted : C.text, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Number of cleaners</div>
                <select value={numCleaners} onChange={e => setNumCleaners(e.target.value)} style={inputStyle}>
                  {[1,2,3,4].map(n => <option key={n} value={n}>{n} cleaner{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            {!perVisit && (
              <>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, marginTop: 14 }}>
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.success, background: `${C.success}18`, borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          -{ct.disc * 100}%
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
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
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Manual price override (£)</div>
                <input type="number" min={0} value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="Leave blank to use calculated" style={{ ...inputStyle, borderColor: manualPrice !== '' ? C.accent : undefined }} />
                <div style={{ fontSize: 10, color: C.faint || C.muted, marginTop: 3 }}>
                  Overrides the calculated price. Leave blank to use the formula.
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
            <div style={{ padding: '0.5rem 0 0.75rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Quote per visit
                </div>
                {q.manualQuote && !(parseFloat(manualPrice) > 0) ? (
                  <>
                    <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 800, color: C.danger, lineHeight: 1.2, marginTop: 8 }}>
                      ⚠ ENTER PRICE MANUALLY
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.danger, marginTop: 6 }}>
                      {cleanType} is quoted manually — type the price in &ldquo;Manual price override&rdquo; on the left.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 6 }}>
                      £{gbp(q.price - q.addonTotal)}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 3 }}>base clean · no add-ons</div>
                  </>
                )}
                {q.ct.disc > 0 && (
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 4 }}>
                    <span style={{ textDecoration: 'line-through', marginRight: 6 }}>£{gbp(q.basePrice)}</span>
                    <span style={{ color: C.success }}>{q.ct.disc * 100}% {q.ct.label} discount applied</span>
                  </div>
                )}
              </div>

              {q.addonTotal > 0 && (() => {
                const addonList = perVisit ? AIRBNB_ADDONS : COMMERCIAL_ADDONS;
                const selected  = addons.map(id => addonList.find(a => a.id === id)).filter(Boolean);
                return (
                  <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                    <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      Add-ons — per visit if used every time
                    </div>
                    {selected.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>
                        <span>+ {a.label}</span>
                        <span style={{ color: C.text, fontWeight: 600 }}>+£{a.price} &rarr; £{gbp(q.price - q.addonTotal + a.price)}/visit</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                      <span>All add-ons included</span>
                      <span>£{gbp(q.price)}/visit</span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.8 }}>
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
          {perVisit && (() => {
            const firstTotal = q.price - (bMediaConsent ? 10 : 0);
            const dep        = Math.ceil(firstTotal * 0.30 * 100) / 100;
            const afterClean = Math.round((firstTotal - dep) * 100) / 100;
            return (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Payment breakdown</div>

                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 2 }}>First visit</div>
                {bMediaConsent && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: C.muted, paddingLeft: 8 }}>
                      <span>Full price</span><span style={{ textDecoration: 'line-through' }}>£{gbp(q.price)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, color: '#16a34a', paddingLeft: 8 }}>
                      <span>Media consent discount</span><span style={{ fontWeight: 600 }}>-£10.00</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>
                  <span>Total first visit</span><span>£{gbp(firstTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 12, color: C.muted, paddingLeft: 8 }}>
                  <span>30% deposit today</span><span style={{ fontWeight: 700, color: C.text }}>£{gbp(dep)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 12, color: C.muted, paddingLeft: 8 }}>
                  <span>Remaining after clean</span><span style={{ fontWeight: 600 }}>£{gbp(afterClean)}</span>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 2 }}>Future visits (no discount)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>
                    <span>Per visit</span><span>£{gbp(q.price)}</span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>
                    Full amount taken automatically after each clean
                  </div>
                </div>
              </div>
            );
          })()}
          </Card>

          {/* Contract discount schedule — commercial only */}
          {!perVisit && <Card C={C}>
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
          </Card>}

          {/* Cost breakdown */}
          <Card C={C} style={{ borderColor: '#fbbf24' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '4px 8px', background: '#fef3c7', borderRadius: 5, width: 'fit-content' }}>
              <span style={{ fontSize: 11 }}>🔒</span>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Internal only — do not share with client</span>
            </div>
            <SectionLabel C={C}>Per visit breakdown</SectionLabel>
            <BreakdownRow
              label="Bathrooms"
              value={`${perVisit ? (parseInt(extraBaths, 10) || 1) : (parseInt(commBaths, 10) || 1)} included`}
              C={C}
            />
            <BreakdownRow label="Labour"        value={`£${gbp(q.labor + q.addonLaborCost)}`}      C={C} />
            <BreakdownRow label="Supplies"      value={`£${gbp(parseFloat(suppliesCost) || 0)}`}  C={C} />
            <BreakdownRow label="Travel"        value={`£${gbp(parseFloat(travelCost) || 0)}`}    C={C} />
            {q.overheadPerVisit > 0 && (
              <BreakdownRow label="Overhead share" value={`£${gbp(q.overheadPerVisit)}`}          C={C} />
            )}
            <BreakdownRow label="Your total cost"  value={`£${gbp(q.addonTotal > 0 ? q.trueCost : q.cost)}`} C={C} accent />
            <BreakdownRow label="Contract clean"  value={`£${gbp(q.cleanPrice)}`}  C={C} accent />
            {q.addonTotal > 0 && (
              <BreakdownRow label="Add-ons"        value={`£${gbp(q.addonTotal)}`}  C={C} />
            )}
            <BreakdownRow label="Total charge"    value={`£${gbp(q.price)}`}        C={C} accent />
            <BreakdownRow label="Profit" value={`£${gbp(q.addonTotal > 0 ? q.profitWithAddons : q.profit)}`} C={C} last />
          </Card>

          {/* Monthly + contract value */}
          {q.freq.vpm > 0 && (
            <Card C={C} style={{ borderColor: '#fbbf24' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '4px 8px', background: '#fef3c7', borderRadius: 5, width: 'fit-content' }}>
                <span style={{ fontSize: 11 }}>🔒</span>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Internal only — do not share with client</span>
              </div>
              <SectionLabel C={C}>Monthly value ({q.freq.label})</SectionLabel>
              <BreakdownRow label="Base clean revenue" value={`£${gbp(q.mBaseRev)}`} C={C} accent />
              {q.mAddonRev > 0 && (
                <BreakdownRow label="Add-ons revenue" value={`£${gbp(q.mAddonRev)}`} C={C} />
              )}
              <BreakdownRow label="Total revenue"   value={`£${gbp(q.mRev)}`}    C={C} accent />
              <BreakdownRow label="Your costs"      value={`£${gbp(q.mAddonRev > 0 ? q.mTrueCost : q.mCost)}`} C={C} />
              <BreakdownRow label="Monthly profit"  value={`£${gbp(q.mAddonRev > 0 ? q.mProfitWithAddons : q.mProfit)}`} C={C} last={q.ct.months === 0} />
              {q.ct.months > 0 && (
                <>
                  <div style={{ height: 10 }} />
                  <SectionLabel C={C}>Contract total ({q.ct.months} months)</SectionLabel>
                  <BreakdownRow
                    label={`${q.ct.months}-month contract value${q.addonTotal > 0 ? ' (excl. add-ons)' : ''}`}
                    value={`£${gbp(q.addonTotal > 0 ? q.cBaseVal : q.cVal)}`}
                    C={C} accent large last
                  />
                </>
              )}
            </Card>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookedOk && (
              <div style={{ background: `${C.success}18`, border: `1px solid ${C.success}40`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.success, fontWeight: 600 }}>
                Contract booked. Taking you to Bookings...
              </div>
            )}
            <button
              onClick={() => { setShowBookPanel(s => !s); setBookError(''); setShowSavePanel(false); }}
              style={{
                fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '11px', borderRadius: 8,
                cursor: 'pointer', border: 'none',
                background: showBookPanel ? C.text : C.text,
                color: '#fff', width: '100%', transition: 'all 0.2s',
              }}
            >
              {perVisit ? 'Book first visit' : 'Book this contract'}
            </button>
            {showBookPanel && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Pricing summary */}
                {(() => {
                  const firstVisitTotal = q.price - (bMediaConsent ? 10 : 0);
                  const month1Total     = q.mRev - (bMediaConsent ? 10 : 0);
                  const dep             = Math.ceil(firstVisitTotal * 0.30 * 100) / 100;
                  const afterClean      = Math.round((firstVisitTotal - dep) * 100) / 100;
                  return (
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 8 }}>Pricing Summary</div>
                      {perVisit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {bMediaConsent ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                                <span>Price per visit</span><span style={{ textDecoration: 'line-through' }}>£{gbp(q.price)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#16a34a' }}>
                                <span>Media consent discount (1st visit only)</span><span style={{ fontWeight: 600 }}>-£10.00</span>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                              <span>Price per visit</span><span style={{ color: C.text, fontWeight: 600 }}>£{gbp(q.price)}</span>
                            </div>
                          )}
                          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 2 }}>First visit charge</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: C.text }}>
                              <span>Total</span><span>£{gbp(firstVisitTotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                              <span>30% deposit today</span><span style={{ fontWeight: 700, color: C.text }}>£{gbp(dep)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                              <span>Remaining after clean</span><span style={{ fontWeight: 600 }}>£{gbp(afterClean)}</span>
                            </div>
                          </div>
                          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                              <span>Future visits (full price)</span><span style={{ fontWeight: 600, color: C.text }}>£{gbp(q.price)}/visit</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 4 }}>
                            <span>Base per visit{q.addonTotal > 0 ? ' (excl. add-ons)' : ''}</span><span style={{ color: C.text, fontWeight: 600 }}>£{gbp(q.price - q.addonTotal)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 4 }}>
                            <span>Monthly base ({q.freq.label}){q.addonTotal > 0 ? ' (excl. add-ons)' : ''}</span><span style={{ color: C.text, fontWeight: 600 }}>£{gbp(q.mBaseRev)}/mo</span>
                          </div>
                          {q.addonTotal > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 4 }}>
                              <span>Add-ons per visit</span><span style={{ color: C.text, fontWeight: 600 }}>+£{gbp(q.addonTotal)}</span>
                            </div>
                          )}
                          {bMediaConsent && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#16a34a', marginBottom: 4 }}>
                              <span>Media consent discount (1st visit only)</span><span style={{ fontWeight: 600 }}>-£10.00</span>
                            </div>
                          )}
                          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {bMediaConsent ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: C.text }}>
                                  <span>1st visit total{q.addonTotal > 0 ? ' (incl. add-ons)' : ''}</span><span>£{gbp(firstVisitTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                                  <span>Subsequent visits{q.addonTotal > 0 ? ' (incl. add-ons)' : ''}</span><span style={{ fontWeight: 600 }}>£{gbp(q.price)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                                  <span>Month 1 total{q.addonTotal > 0 ? ' (incl. add-ons)' : ''}</span><span style={{ fontWeight: 600, color: '#16a34a' }}>£{gbp(month1Total)}/mo</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                                  <span>Month 2+ total{q.addonTotal > 0 ? ' (incl. add-ons)' : ''}</span><span style={{ fontWeight: 600 }}>£{gbp(q.mRev)}/mo</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: C.text }}>
                                  <span>Total per visit</span><span>£{gbp(q.price)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
                                  <span>Est. monthly total</span><span style={{ fontWeight: 600 }}>£{gbp(q.mRev)}/mo</span>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Date & time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{perVisit ? 'Visit date' : 'Start date'} <span style={{ color: C.danger }}>*</span></div>
                    <input type="date" value={contractStart} onChange={e => setContractStart(e.target.value)} min={new Date().toISOString().slice(0, 10)} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Clean time</div>
                    <input type="time" value={contractTime} onChange={e => setContractTime(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                {contractStart && !perVisit && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: -4 }}>
                    Contract ends: {(() => {
                      const ct = CONTRACTS.find(c => c.id === contract) || CONTRACTS[0];
                      const d = new Date(contractStart + 'T00:00:00');
                      d.setMonth(d.getMonth() + ct.months);
                      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    })()}
                  </div>
                )}

                {/* Key access */}
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Key access</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { id: 'client_present', label: 'Client / host present' },
                      { id: 'spare_key',      label: 'Spare key held by us' },
                      { id: 'lockbox',        label: 'Lockbox / key safe' },
                      { id: 'concierge',      label: 'Concierge / building reception' },
                      { id: 'management',     label: 'Management company / agent' },
                    ].map(opt => (
                      <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 12, color: C.text }}>
                        <input type="radio" name="keyType" value={opt.id} checked={keyType === opt.id} onChange={() => setKeyType(opt.id)} style={{ accentColor: C.accent }} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {keyType === 'lockbox' && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Lockbox code</div>
                      <input value={lockboxCode} onChange={e => setLockboxCode(e.target.value)} placeholder="e.g. 1234" style={inputStyle} />
                    </div>
                  )}
                </div>

                {/* Parking & floor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Parking</div>
                    <input value={bParking} onChange={e => setBParking(e.target.value)} placeholder="e.g. Free on street" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Floor / lift</div>
                    <input value={bFloor} onChange={e => setBFloor(e.target.value)} placeholder="e.g. 3rd floor, lift available" style={inputStyle} />
                  </div>
                </div>

                {/* Media consent */}
                <div style={{ padding: '10px 12px', background: bMediaConsent ? '#f0fdf4' : C.bg, border: `1px solid ${bMediaConsent ? '#86efac' : C.border}`, borderRadius: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={bMediaConsent} onChange={e => setBMediaConsent(e.target.checked)} style={{ marginTop: 2, accentColor: '#16a34a' }} />
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: bMediaConsent ? '#166534' : C.text }}>
                        Media consent — photos/videos for social media
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 11, color: bMediaConsent ? '#16a34a' : C.muted, marginTop: 2 }}>
                        {bMediaConsent ? '£10 discount applied to first visit' : 'Client consents to before/after photos being used on social media'}
                      </div>
                    </div>
                  </label>
                </div>

                {bookError && <div style={{ fontSize: 11, color: C.danger }}>{bookError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleBookContract} disabled={booking}
                    style={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '9px', borderRadius: 6, cursor: booking ? 'wait' : 'pointer', border: 'none', background: C.text, color: '#fff' }}
                  >{booking ? 'Creating...' : 'Confirm booking'}</button>
                  <button
                    onClick={() => { setShowBookPanel(false); setBookError(''); }}
                    style={{ fontFamily: FONT, fontSize: 12, padding: '9px 14px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${C.border}`, background: C.bg, color: C.muted }}
                  >Cancel</button>
                </div>
              </div>
            )}
            {savedOk && (
              <div style={{ background: `${C.success}18`, border: `1px solid ${C.success}40`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.success, fontWeight: 600 }}>
                Quote saved and email sent.
              </div>
            )}
            {perVisit ? (
              <div style={{ fontSize: 12, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 14px', textAlign: 'center' }}>
                Quotes are only for contracted commercial jobs
              </div>
            ) : (
              <button
                onClick={() => { setShowSavePanel(s => !s); setSaveError(''); }}
                style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '11px', borderRadius: 8,
                  cursor: 'pointer', border: `1px solid ${C.accent}`,
                  background: showSavePanel ? C.accent : `${C.accent}18`,
                  color: showSavePanel ? '#fff' : C.text, width: '100%', transition: 'all 0.2s',
                }}
              >
                Save quote + send email
              </button>
            )}
            {showSavePanel && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Follow-up date <span style={{ color: C.danger }}>*</span></div>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} style={inputStyle} />
                </div>
                {saveError && <div style={{ fontSize: 11, color: C.danger }}>{saveError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSaveQuote} disabled={saving}
                    style={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '9px', borderRadius: 6, cursor: saving ? 'wait' : 'pointer', border: 'none', background: C.accent, color: '#fff' }}
                  >{saving ? 'Sending...' : 'Confirm & send'}</button>
                  <button
                    onClick={() => { setShowSavePanel(false); setSaveError(''); }}
                    style={{ fontFamily: FONT, fontSize: 12, padding: '9px 14px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${C.border}`, background: C.bg, color: C.muted }}
                  >Cancel</button>
                </div>
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
                  Saves the quote to your list and emails it to {clientEmail || 'the client'}. Status will be set to "Quote Sent".
                </div>
              </div>
            )}
            <button
              onClick={copyQuote}
              style={{
                fontFamily: FONT, fontSize: 12, padding: '9px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${C.border}`, background: copied ? C.success : C.bg,
                color: copied ? '#fff' : C.muted, width: '100%', transition: 'all 0.2s',
              }}
            >{copied ? 'Copied' : 'Copy summary to clipboard'}</button>
          </div>

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

      {/* ── Saved Quotes ── */}
      <div style={{ marginTop: '1.25rem' }}>
        <Card C={C}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Saved Quotes</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {savedQuotes.filter(sq => !['booked', 'lost'].includes(sq.status)).length} active
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {savedQuotes.length > 0 && (() => {
                const visibleIds = savedQuotes.map(sq => sq.id);
                const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedQuotes.has(id));
                return (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: FONT, fontSize: 11, color: C.muted }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedQuotes(allSelected ? new Set() : new Set(visibleIds))}
                      style={{ accentColor: C.danger }}
                    />
                    Select all
                  </label>
                );
              })()}
              {selectedQuotes.size > 0 && (
                <button
                  onClick={deleteSelected}
                  disabled={deletingQuotes}
                  style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${C.danger}40`, background: `${C.danger}10`, color: C.danger }}
                >
                  {deletingQuotes ? 'Deleting…' : `Delete selected (${selectedQuotes.size})`}
                </button>
              )}
            </div>
            <input
              value={quoteSearch} onChange={e => setQuoteSearch(e.target.value)}
              placeholder="Search by business name..."
              style={{ ...inputStyle, width: isMobile ? '100%' : 220 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { id: 'all',           label: 'All' },
              { id: 'quote_sent',    label: 'Quote Sent' },
              { id: 'follow_up_due', label: 'Follow-up Due' },
              { id: 'booked',        label: 'Booked' },
              { id: 'lost',          label: 'Lost' },
            ].map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                fontFamily: FONT, fontSize: 11, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                border: `1px solid ${statusFilter === f.id ? C.accent : C.border}`,
                background: statusFilter === f.id ? `${C.accent}18` : C.bg,
                color: statusFilter === f.id ? C.text : C.muted, fontWeight: statusFilter === f.id ? 600 : 400,
              }}>{f.label}</button>
            ))}
          </div>

          {savedQuotes.length === 0 ? (
            <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '24px 0' }}>
              No saved quotes yet. Fill in client details above and click "Save quote + send email".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedQuotes
                .filter(sq => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isDue = sq.status === 'quote_sent' && sq.followUpDate && sq.followUpDate <= today;
                  const eff = isDue ? 'follow_up_due' : sq.status;
                  if (statusFilter !== 'all' && eff !== statusFilter) return false;
                  if (quoteSearch.trim() && !sq.bizName?.toLowerCase().includes(quoteSearch.toLowerCase())) return false;
                  return true;
                })
                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                .map(sq => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isDue = sq.status === 'quote_sent' && sq.followUpDate && sq.followUpDate <= today;
                  const eff = isDue ? 'follow_up_due' : sq.status;
                  const ss = {
                    quote_sent:    { bg: `${C.accent}18`,  color: C.accent,   label: 'Quote Sent' },
                    follow_up_due: { bg: `${C.warning}18`, color: C.warning,  label: 'Follow-up Due' },
                    booked:        { bg: `${C.success}18`, color: C.success,  label: 'Booked' },
                    lost:          { bg: `${C.danger}18`,  color: C.danger,   label: 'Lost' },
                  }[eff] || { bg: `${C.accent}18`, color: C.accent, label: 'Quote Sent' };
                  const isSelected = selectedQuotes.has(sq.id);
                  return (
                    <div key={sq.id} style={{
                      padding: '10px 12px', borderRadius: 8, border: `1px solid ${isSelected ? C.danger : C.border}`,
                      background: isSelected ? `${C.danger}06` : sq.status === 'lost' ? `${C.danger}06` : C.bg,
                      opacity: sq.status === 'lost' ? 0.7 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectQuote(sq.id)}
                            style={{ marginTop: 3, accentColor: C.danger, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{sq.bizName}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: ss.color, background: ss.bg, borderRadius: 4, padding: '2px 7px' }}>{ss.label}</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                              {sq.contactName && <span>{sq.contactName} · </span>}
                              <span>£{gbp(sq.pricePerVisit)}/visit · </span>
                              <span>{sq.contractLabel} · </span>
                              <span>{sq.frequencyLabel}</span>
                            </div>
                            {sq.followUpDate && !['booked', 'lost'].includes(sq.status) && (
                              <div style={{ fontSize: 10, color: isDue ? C.danger : C.muted, marginTop: 3, fontWeight: isDue ? 600 : 400 }}>
                                Follow-up: {new Date(sq.followUpDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {isDue && ' -- overdue'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                          <button onClick={() => loadQuote(sq)} style={{ fontFamily: FONT, fontSize: 11, padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${C.border}`, background: C.card, color: C.text }}>Load</button>
                          {!['booked', 'lost'].includes(sq.status) && (
                            <button onClick={() => updateQuoteStatus(sq.id, 'booked')} style={{ fontFamily: FONT, fontSize: 11, padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${C.success}40`, background: `${C.success}10`, color: C.success, fontWeight: 600 }}>Booked</button>
                          )}
                          {!['lost', 'booked'].includes(sq.status) && (
                            <button onClick={() => updateQuoteStatus(sq.id, 'lost')} style={{ fontFamily: FONT, fontSize: 11, padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${C.danger}40`, background: `${C.danger}10`, color: C.danger }}>Lost</button>
                          )}
                          <button onClick={() => deleteQuote(sq.id)} style={{ fontFamily: FONT, fontSize: 11, padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${C.border}`, background: C.card, color: C.muted }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
