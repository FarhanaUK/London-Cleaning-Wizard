import { calcHours, toInputTime, fmtDuration } from '../utils';
import emailjs from '@emailjs/browser';
import DoNotContactToggle from './DoNotContactToggle';
import { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const FIELD_STYLE = C => ({ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' });

const ADDON_HOURS = { oven: 0.5, fridge: 0.33, laundry: 0.5, linen: 0.33, windows: 0.5, patio: 0.33, kitchen: 0.75, toilets: 0.5, appliances: 0.25 };

const fmtCreatedAt = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
};

const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';

export default function BookingExpandedPanel({
  b, C, isMobile, staff,
  setBookings,
  contractVisits = [],
  openEdit,
  openEditVisit,
  completing, handleComplete,
  cancelling, handleCancel,
  deleting, handleDelete,
  markingDeposit, depositErr, handleMarkDepositPaid,
  generatingLink, depositLinks, linkErr, emailingLink, emailedLinks,
  handleGenerateLink, handleEmailDepositLink,
  generatingContractLink, contractLinks, contractLinkErr, handleGenerateContractLink,
  retryingContractCharge, retryContractErr, handleRetryContractCharge,
  stoppingRecurring, stoppedRecurring, handleStopRecurring,
  staffAssignPending, handleAssignStaff, handleAssignSecondCleaner, handleApplyCleanersToAll,
  completeErr, cancelErr, stopRecurringErr,
}) {
  const assignedMember = staff?.find(s => s.name === b.assignedStaff);
  const rate           = assignedMember?.hourlyRate !== 'N/A' ? parseFloat(assignedMember?.hourlyRate) : null;
  const hrs            = calcHours(b.actualStart || b.cleanTime, b.actualFinish);
  const [notifying, setNotifying] = useState(false);
  const [notifySent, setNotifySent] = useState(null); // { cleaner, at }
  const [visitNotifying, setVisitNotifying]   = useState({});
  const [visitNotifySent, setVisitNotifySent] = useState({});
  const [sigTouchOptingOut, setSigTouchOptingOut] = useState(false);
  const [sigTouchNote,      setSigTouchNote]      = useState('');
  const [sigTouchOtherNote, setSigTouchOtherNote] = useState('');
  const [cancelModal,    setCancelModal]    = useState(null);
  const [upgradeModal,   setUpgradeModal]   = useState(null);
  const [upgrading,      setUpgrading]      = useState(false);
  const [upgradeErr,     setUpgradeErr]     = useState('');
  const [refundModal,    setRefundModal]    = useState(null); // { visitId, contractId, amount, password, step }
  const [refunding,      setRefunding]      = useState(false);
  const [refundErr,      setRefundErr]      = useState('');
  const [restockInput,   setRestockInput]   = useState('');
  const [restockSaving,  setRestockSaving]  = useState(false);
  const [newVisitModal,  setNewVisitModal]  = useState(null); // { date, time }
  const [newVisitSaving, setNewVisitSaving] = useState(false);
  const [newVisitErr,    setNewVisitErr]    = useState('');

  const CONTRACT_OPTIONS = [
    { id: 'monthly', label: 'Monthly rolling',  months: 1,  disc: 0.00 },
    { id: '3mo',     label: '3-month',          months: 3,  disc: 0.00 },
    { id: '6mo',     label: '6-month',          months: 6,  disc: 0.05 },
    { id: 'annual',  label: 'Annual contract',  months: 12, disc: 0.10 },
  ];
  const currentMonths = CONTRACT_OPTIONS.find(c => c.id === b.contractType)?.months || 0;
  const currentDisc   = CONTRACT_OPTIONS.find(c => c.id === b.contractType)?.disc   || 0;
  const todayForRenew  = new Date();
  const endDateForRenew = b.contractEndDate ? new Date(b.contractEndDate + 'T12:00:00') : null;
  const daysUntilEnd   = endDateForRenew ? Math.ceil((endDateForRenew - todayForRenew) / 86400000) : null;
  // Within 14 days of end (or already expired) = grace period: any tier allowed. Otherwise: upgrade only.
  const inRenewalWindow = daysUntilEnd === null || daysUntilEnd <= 14;
  const upgradeOptions  = inRenewalWindow ? CONTRACT_OPTIONS : CONTRACT_OPTIONS.filter(c => c.months > currentMonths);

  const calcUpgradeEndDate = (months, fromDate) => {
    const d = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  };

  const handleUpgradeContract = async () => {
    if (!upgradeModal?.newType || !upgradeModal?.newRate) { setUpgradeErr('Select a contract type and enter the new monthly rate.'); return; }
    setUpgrading(true); setUpgradeErr('');
    try {
      const res = await fetch(import.meta.env.VITE_CF_UPGRADE_CONTRACT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id, newContractType: upgradeModal.newType, newContractLabel: upgradeModal.newLabel, newMonths: upgradeModal.newMonths, newMonthlyRate: upgradeModal.newRate, rateEffectiveFrom: upgradeModal.effectiveFrom }),
      });
      if (!res.ok) throw new Error('Upgrade failed.');
      const data = await res.json();
      setBookings(all => all.map(x => x.id === b.id ? { ...x, contractEndDate: data.newEndDate, contractType: upgradeModal.newType, contractLabel: upgradeModal.newLabel, monthlyBaseValue: parseFloat(upgradeModal.newRate) } : x));
      setUpgradeModal(null);
    } catch (e) { setUpgradeErr(e.message); }
    setUpgrading(false);
  };

  const handlePartialRefund = async () => {
    if (!refundModal?.amount || parseFloat(refundModal.amount) <= 0) { setRefundErr('Enter a valid refund amount.'); return; }
    if (!refundModal?.password) { setRefundErr('Enter your password to confirm.'); return; }
    setRefunding(true); setRefundErr('');
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, refundModal.password);
      await reauthenticateWithCredential(user, cred);
    } catch {
      setRefundErr('Incorrect password. Refund not processed.');
      setRefunding(false); return;
    }
    try {
      const body = { bookingId: refundModal.visitId, amount: parseFloat(refundModal.amount) };
      if (refundModal.contractId) body.contractId = refundModal.contractId;
      const res = await fetch(import.meta.env.VITE_CF_ISSUE_PARTIAL_REFUND, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Refund failed.'); }
      const amt = parseFloat(refundModal.amount);
      if (refundModal.contractId) {
        // Update the visit record in local state
        setBookings(all => all.map(x => x.id === refundModal.visitId
          ? { ...x, partialRefundAmount: amt, partialRefundDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) }
          : x.id === refundModal.contractId
            ? { ...x, partialRefundTotal: Math.round(((parseFloat(x.partialRefundTotal || 0)) + amt) * 100) / 100 }
            : x));
      } else {
        setBookings(all => all.map(x => x.id === refundModal.visitId
          ? { ...x, partialRefundAmount: amt, partialRefundDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) }
          : x));
      }
      setRefundModal(null);
    } catch (e) { setRefundErr(e.message); }
    setRefunding(false);
  };

  const handleAddNewVisit = async () => {
    if (!newVisitModal?.date) { setNewVisitErr('Select a date.'); return; }
    if (!newVisitModal?.time) { setNewVisitErr('Select a time.'); return; }
    setNewVisitSaving(true); setNewVisitErr('');
    try {
      const newBooking = {
        customerName:    b.customerName || b.bizName || `${b.firstName || ''} ${b.lastName || ''}`.trim(),
        firstName:       b.firstName || b.contactName || '',
        lastName:        b.lastName || '',
        bizName:         b.bizName || '',
        contactName:     b.contactName || '',
        email:           b.email,
        phone:           b.phone || '',
        addr1:           b.addr1 || '',
        postcode:        b.postcode || '',
        bedrooms:        b.bedrooms || '',
        propertyType:    b.propertyType || '',
        size:            b.size || '',
        packageName:     b.packageName || '',
        package:         b.package || '',
        clientType:      'airbnb',
        isAirbnb:        true,
        frequency:       'one-off',
        numCleaners:     b.numCleaners || 1,
        visitDur:        b.visitDur || b.visitDurationBase || '',
        addons:          b.addons || [],
        addonTotal:      b.addonTotal || 0,
        total:           parseFloat(b.total || 0) + parseFloat(b.mediaConsentDiscount || 0),
        deposit:         0,
        remaining:       parseFloat(b.total || 0) + parseFloat(b.mediaConsentDiscount || 0),
        assignedStaff:   b.assignedStaff || '',
        secondCleaner:   b.secondCleaner || '',
        keys:            b.keys || '',
        parking:         b.parking || '',
        floor:           b.floor || '',
        airbnbListing:   b.airbnbListing || '',
        cleanDate:       newVisitModal.date,
        cleanTime:       newVisitModal.time,
        status:          'scheduled',
        stripeCustomerId: b.stripeCustomerId || '',
        stripeDepositIntentId: 'auto-recurring',
        source:          'admin',
        createdAt:       new Date().toISOString(),
        originBookingId: b.id,
      };
      const ref = await addDoc(collection(db, 'bookings'), newBooking);
      fetch(import.meta.env.VITE_CF_ASSIGN_CONTRACT_REF, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: ref.id }),
      }).catch(() => {});
      fetch(import.meta.env.VITE_CF_CREATE_CALENDAR_EVENT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: ref.id }),
      }).catch(() => {});

      const confirmTpl = import.meta.env.VITE_EMAILJS_CONFIRM_TEMPLATE;
      if (confirmTpl) {
        const fmtD = s => s ? s.split('-').reverse().join('/') : '—';
        emailjs.send(import.meta.env.VITE_EMAILJS_SERVICE_ID, confirmTpl, {
          to_name:         newBooking.contactName || newBooking.firstName || newBooking.bizName || newBooking.customerName,
          to_email:        newBooking.email,
          booking_ref:     'Pending assignment',
          booking_type:    'Airbnb Turnaround Clean',
          package_name:    newBooking.packageName || 'Airbnb Turnaround',
          property_type:   newBooking.size || newBooking.bedrooms || '—',
          frequency:       'One-off',
          date:            fmtD(newBooking.cleanDate),
          time:            newBooking.cleanTime || '—',
          address:         `${newBooking.addr1 || ''}, ${newBooking.postcode || ''}`.trim().replace(/^,\s*/, ''),
          floor:           newBooking.floor || '—',
          parking:         newBooking.parking || '—',
          keys:            newBooking.keys || '—',
          addons:          (newBooking.addons || []).map(a => a.name || a.label || a).join(', ') || 'None',
          pets:            '—',
          signature_touch: '—',
          notes:           '—',
          total:           `£${parseFloat(newBooking.total || 0).toFixed(2)}`,
          deposit_paid:    '£0.00',
          remaining:       `£${parseFloat(newBooking.total || 0).toFixed(2)}`,
          stripe_deposit_pi: 'Charged on completion',
          recurring_note:  'To book your next Airbnb turnaround, simply contact us and we will add a new visit to your account.',
          terms_summary:   'Full payment is charged automatically on completion of the clean.',
          media_consent_row: '',
        }, import.meta.env.VITE_EMAILJS_PUBLIC_KEY).catch(() => {});
      }

      setNewVisitModal(null);
    } catch (e) { setNewVisitErr(e.message); }
    setNewVisitSaving(false);
  };

  const buildContractCancelInfo = () => {
    const today       = new Date();
    const startDate   = new Date((b.contractStartDate || b.cleanDate) + 'T12:00:00');
    const daysSince   = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const completed   = (contractVisits || []).filter(v => v.status === 'completed');
    const hasCleans   = completed.length > 0;
    const fmtGBP      = n => `£${Math.abs(n).toFixed(2)}`;

    // Natural expiry
    if (b.contractEndDate && today > new Date(b.contractEndDate + 'T23:59:59')) {
      return { tier: 'expired', lines: ['This contract has already ended. No financial action required.'], action: 'Mark as cancelled?' };
    }

    // No cleans done
    if (!hasCleans) {
      const paidCount  = Object.values(b.monthlyPayments || {}).filter(v => v === 'paid').length;
      const totalPaid  = paidCount * parseFloat(b.monthlyBaseValue || 0);
      if (daysSince <= 14) {
        return { tier: 1, lines: [`Within the 14-day cooling-off period (day ${daysSince} of 14).`, `Full refund: ${fmtGBP(totalPaid)}. No cancellation fee.`], action: 'Proceed with full refund?' };
      } else {
        const refund = Math.max(0, totalPaid - 75);
        return { tier: 2, lines: [`Cooling-off period has passed (${daysSince} days since start). No cleans completed.`, `£75 admin fee applies. Refund: ${fmtGBP(refund)}.`], action: 'Proceed — charge £75 and refund the rest?' };
      }
    }

    // Tier 3 — cleans done
    const paidKeys      = Object.entries(b.monthlyPayments || {}).filter(([,v]) => v === 'paid').map(([k]) => k).sort();
    const paidCount     = paidKeys.length;
    const contractStart = new Date((b.contractStartDate || b.cleanDate) + 'T12:00:00');
    const contractEnd   = new Date(b.contractEndDate + 'T12:00:00');
    const totalMonths   = (contractEnd.getFullYear() - contractStart.getFullYear()) * 12 + (contractEnd.getMonth() - contractStart.getMonth());
    const unpaidMonths  = Math.max(0, totalMonths - paidCount);
    const monthlyBase   = parseFloat(b.monthlyBaseValue || 0);
    const termFee       = 0.5 * unpaidMonths * monthlyBase;

    const sumAddons = visits => (visits || []).reduce((s, v) => s + (v.addons || []).reduce((t, a) => t + parseFloat(a.price || 0), 0), 0);
    const periodRange = key => {
      const e = new Date(key + 'T12:00:00'); e.setMonth(e.getMonth() + 1); e.setDate(e.getDate() - 1);
      return { start: key, end: e.toISOString().slice(0, 10) };
    };

    let refundAmt = 0, unservedCount = 0, totalInPeriod = 0, unbilledAddons = 0;
    if (paidKeys.length > 0) {
      const curKey  = paidKeys[paidKeys.length - 1];
      const prevKey = paidKeys.length > 1 ? paidKeys[paidKeys.length - 2] : null;

      const { start: cs, end: ce } = periodRange(curKey);
      const inCurrent  = (contractVisits || []).filter(v => v.cleanDate >= cs && v.cleanDate <= ce);
      const unserved   = inCurrent.filter(v => v.status !== 'completed');
      totalInPeriod    = inCurrent.length;
      unservedCount    = unserved.length;

      // Actual payment for current period = base + add-ons from previous period's completed visits
      let prevAddons = 0;
      if (prevKey) {
        const { start: ps, end: pe } = periodRange(prevKey);
        prevAddons = sumAddons((contractVisits || []).filter(v => v.cleanDate >= ps && v.cleanDate <= pe && v.status === 'completed'));
      }
      const currentPeriodPayment = monthlyBase + prevAddons;
      refundAmt = totalInPeriod > 0 ? (currentPeriodPayment / totalInPeriod) * unservedCount : 0;

      // Add-ons from completed visits this month — not yet billed, still owed by customer
      unbilledAddons = sumAddons(inCurrent.filter(v => v.status === 'completed'));
    }

    const net = refundAmt - termFee - unbilledAddons;
    const lines = [
      `${completed.length} clean${completed.length !== 1 ? 's' : ''} completed.`,
      unservedCount > 0
        ? `${unservedCount} of ${totalInPeriod} visits unserved this month — refund: ${fmtGBP(refundAmt)}.`
        : 'No unserved visits in current paid month.',
      unbilledAddons > 0
        ? `Unbilled add-ons from completed visits this month (still owed): ${fmtGBP(unbilledAddons)}.`
        : null,
      unpaidMonths > 0
        ? `${unpaidMonths} unpaid month${unpaidMonths !== 1 ? 's' : ''} remaining — 50% early termination fee: ${fmtGBP(termFee)}.`
        : 'No remaining unpaid months.',
      net >= 0 ? `Net: refund ${fmtGBP(net)} to customer.` : `Net: charge ${fmtGBP(Math.abs(net))} to customer.`,
    ].filter(Boolean);
    return { tier: 3, lines, action: 'Proceed with cancellation?' };
  };

  const handleNotifyCleaner = async () => {
    setNotifying(true);
    try {
      const res = await fetch(import.meta.env.VITE_CF_NOTIFY_CLEANER, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id, cleanerName: b.assignedStaff, secondCleaner: b.secondCleaner || '' }),
      });
      if (res.ok) setNotifySent({ cleaner: [b.assignedStaff, b.secondCleaner].filter(Boolean).join(' & '), at: new Date() });
    } catch (e) {}
    setNotifying(false);
  };

  const handleNotifyVisit = async (v) => {
    setVisitNotifying(prev => ({ ...prev, [v.id]: true }));
    try {
      const res = await fetch(import.meta.env.VITE_CF_NOTIFY_CLEANER, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: v.id, cleanerName: v.assignedStaff, secondCleaner: v.secondCleaner || '', bookingRef: b.bookingRef || '' }),
      });
      if (res.ok) setVisitNotifySent(prev => ({ ...prev, [v.id]: { cleaner: [v.assignedStaff, v.secondCleaner].filter(Boolean).join(' & '), at: new Date() } }));
    } catch (e) {}
    setVisitNotifying(prev => ({ ...prev, [v.id]: false }));
  };

  const fmtNotifyTime = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const lastNotified = notifySent || (b.lastNotifiedAt ? { cleaner: b.lastNotifiedCleaner, at: b.lastNotifiedAt.toDate ? b.lastNotifiedAt.toDate() : new Date(b.lastNotifiedAt) } : null);
  const earned         = rate !== null && hrs !== null ? hrs * rate : null;

  const saveField = (field, val) => {
    const prev = b[field];
    setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: val } : x));
    fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: b.id, [field]: val }),
    }).catch(() => setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: prev } : x)));
  };

  const saveVisitField = (visit, field, val) => {
    const prev = visit[field];
    setBookings(all => all.map(x => x.id === visit.id ? { ...x, [field]: val } : x));
    updateDoc(doc(db, 'bookings', visit.id), { [field]: val })
      .catch(() => setBookings(all => all.map(x => x.id === visit.id ? { ...x, [field]: prev } : x)));
  };

  const saveDoNotContact = next => {
    setBookings(prev => prev.map(x => x.email === b.email ? { ...x, doNotContact: next } : x));
    fetch(import.meta.env.VITE_CF_SET_DO_NOT_CONTACT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: b.email, doNotContact: next }),
    }).catch(() => {});
  };

  const activeStaff    = staff?.filter(s => s.status === 'Active') || [];
  const onHoliday      = activeStaff.filter(s => (s.holidays || []).includes(b.cleanDate));
  const available      = activeStaff.filter(s => !(s.holidays || []).includes(b.cleanDate));

  const isManualDeposit = b.stripeDepositIntentId === 'manual';
  const isPartialRefundOnly = parseFloat(b.partialRefundAmount) > 0 && b.status === 'cancelled_full_refund';
  const isCancelled     = b.status?.startsWith('cancelled') && !isPartialRefundOnly;

  const contractPeriods = (() => {
    if (!b.isContract || !b.contractStartDate) return [];
    const result = [];
    const endDate = b.contractEndDate ? new Date(b.contractEndDate + 'T12:00:00') : (() => { const d = new Date(b.contractStartDate + 'T12:00:00'); d.setFullYear(d.getFullYear() + 1); return d; })();
    let cur = new Date(b.contractStartDate + 'T12:00:00');
    while (cur <= endDate) {
      const start = cur.toISOString().slice(0, 10);
      const next = new Date(cur);
      next.setMonth(next.getMonth() + 1);
      const end = new Date(next);
      end.setDate(end.getDate() - 1);
      result.push({ key: start, start, end: end.toISOString().slice(0, 10) });
      cur = next;
    }
    return result;
  })();
  const contractMonths = contractPeriods.map(p => p.key);

  const [expandedMonth, setExpandedMonth] = useState(null);

  // Auto-assign LCW-XXXXXX ref via CF for contracts created before this was in place
  useEffect(() => {
    if (b.isContract && !b.bookingRef) {
      fetch(import.meta.env.VITE_CF_ASSIGN_CONTRACT_REF, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id }),
      })
        .then(r => r.json())
        .then(({ bookingRef }) => {
          if (bookingRef) setBookings(all => all.map(x => x.id === b.id ? { ...x, bookingRef } : x));
        })
        .catch(() => {});
    }
  }, [b.id]);

  const [paymentErr, setPaymentErr] = useState('');

  const toggleMonthPaid = (month, paid) => {
    const prev    = b.monthlyPayments || {};
    const updated = { ...prev };
    if (paid) updated[month] = 'paid'; else delete updated[month];
    setBookings(all => all.map(x => x.id === b.id ? { ...x, monthlyPayments: updated } : x));
    const revert  = () => {
      setBookings(all => all.map(x => x.id === b.id ? { ...x, monthlyPayments: prev } : x));
      setPaymentErr(`Failed to ${paid ? 'mark' : 'unmark'} ${month} as paid — please try again.`);
    };
    if (paid) {
      fetch(import.meta.env.VITE_CF_MARK_CONTRACT_MONTH_PAID, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id, periodKey: month }),
      }).then(r => { if (!r.ok) revert(); }).catch(revert);
    } else {
      updateDoc(doc(db, 'bookings', b.id), { monthlyPayments: updated, updatedAt: new Date().toISOString() }).catch(revert);
    }
  };

  return (
    <div style={{ padding: isMobile ? '0 14px 16px' : '0 18px 18px', borderTop: `1px solid ${C.border}` }}>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 16px', marginTop: 16, marginBottom: 16 }}>
        {(b.isContract ? [
          { l: 'Booked On',       v: fmtCreatedAt(b.createdAt) },
          { l: 'Booking Ref',     v: b.bookingRef },
          { l: 'Business',        v: b.bizName },
          { l: 'Contact',         v: b.contactName || `${b.firstName} ${b.lastName}`.trim() },
          { l: 'Email',           v: b.email },
          { l: 'Phone',           v: b.phone },
          b.addr1 && { l: 'Address',  v: b.addr1 },
          { l: 'Service Type',    v: b.clientType === 'airbnb' ? 'Airbnb / Short-let' : 'Commercial Cleaning' },
          { l: 'Contract',        v: b.contractLabel },
          { l: 'Frequency',       v: b.frequencyLabel || b.frequency },
          { l: 'Contract Start Date', v: fmtDate(b.contractStartDate || b.cleanDate) },
          { l: 'End Date',        v: b.contractEndDate ? fmtDate(b.contractEndDate) : 'Open ended' },
          { l: 'Keys',           v: b.keys || '—' },
          b.floor      && { l: 'Floor / Lift', v: b.floor },
          b.parking    && { l: 'Parking',      v: b.parking },
          b.bathrooms  && { l: 'Bathrooms',    v: b.bathrooms },
          { l: 'Media Consent',  v: b.mediaConsent ? '✓ Consented' : '✕ No consent' },
          { l: 'Base per Visit', v: `£${parseFloat(b.pricePerVisit || 0).toFixed(2)}` },
          b.addonsList && { l: 'Add-ons', v: b.addonsList },
          b.monthlyBaseValue > 0 && { l: 'Monthly', v: `£${parseFloat(b.monthlyBaseValue).toFixed(2)}/month` },
        ] : [
          { l: 'Booked On',        v: fmtCreatedAt(b.createdAt) },
          { l: 'Booking Ref',      v: b.bookingRef },
          { l: 'Phone',            v: b.phone },
          { l: 'Email',            v: b.email },
          { l: 'Clean Date',       v: fmtDate(b.cleanDate) },
          { l: 'Clean Time',       v: b.cleanTime },
          { l: 'Property',         v: [b.propertyType, b.size || (b.bedrooms && (b.bedrooms === 'studio' ? 'Studio' : `${b.bedrooms} bed`))].filter(Boolean).join(' · ') || '—' },
          { l: 'Floor/Access',     v: b.floor || '—' },
          { l: 'Parking',          v: b.parking || '—' },
          { l: 'Bathrooms',        v: b.bathrooms || '—' },
          b.airbnbListing && { l: 'Airbnb Listing', v: b.airbnbListing },
          { l: 'Keys',             v: b.keys || '—' },
          { l: 'Frequency',        v: b.frequency || 'one-off' },
          b.isContractVisit && b.numCleaners && { l: 'No. of Cleaners', v: b.numCleaners },
          b.isContractVisit && b.visitDurationBase && { l: 'Visit Duration', v: `${b.visitDurationBase}h` },
          { l: 'Add-ons',          v: b.addons?.length ? b.addons.map(a => a.name).join(', ') : (b.addonsList || 'None') },
          !b.isContractVisit && !b.isAirbnb && !['hourly','office_cleaning'].includes(b.package || b.packageId) && { l: 'Pets', v: b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No' },
          !b.isContractVisit && (b.package === 'standard' || b.packageId === 'standard') && { l: 'Signature Touch', v: b.signatureTouch === false ? `Opted out${b.signatureTouchNotes ? ` — ${b.signatureTouchNotes}` : ''}` : '✓ Opted in' },
          !b.isContractVisit && { l: 'Marketing Opt-in', v: b.marketingOptOut ? '✕ Opted out at booking' : '✓ Opted in at booking' },
          !b.isContractVisit && { l: 'Media Consent',    v: b.mediaConsent ? '✓ Consented to photos/videos on social media' : '✕ No consent given' },
          { l: 'Total',            v: `£${parseFloat(b.total).toFixed(2)}` },
          (b.launchDiscount || b.mediaConsentDiscount) && { l: 'Original price', v: `£${parseFloat(b.originalTotal || (b.total + (b.mediaConsentDiscount || 0))).toFixed(2)}` },
          b.launchDiscount && { l: 'Launch offer',      v: `-£${parseFloat(b.launchDiscount).toFixed(2)}`, launch: true },
          b.mediaConsentDiscount && { l: 'Photo consent discount', v: `-£${parseFloat(b.mediaConsentDiscount).toFixed(2)}`, grn: true },
          { l: 'Deposit paid',     v: b.status === 'pending_deposit' ? 'Pending' : `£${parseFloat(b.deposit).toFixed(2)}`, highlight: b.status === 'pending_deposit' },
          { l: 'Remaining',        v: `£${parseFloat(b.remaining).toFixed(2)}` },
          !b.isAutoRecurring && { l: 'Source', v: b.source || '—' },
          b.stripeDepositIntentId   && { l: 'Stripe Deposit PI',   v: b.stripeDepositIntentId },
          b.stripeRemainingIntentId && { l: 'Stripe Remaining PI', v: b.stripeRemainingIntentId },
          b.stripeCustomerId        && { l: 'Stripe Customer ID',  v: b.stripeCustomerId },
        ]).filter(Boolean).map((r, i) => (
          <div key={i}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: r.highlight ? '#fff' : r.launch ? '#b45309' : r.grn ? '#16a34a' : C.text, ...(r.highlight ? { background: C.danger, display: 'inline-block', padding: '2px 8px', borderRadius: 4 } : {}) }}>{r.v}</div>
          </div>
        ))}
      </div>

      {/* Restock Service — Airbnb bookings only */}
      {b.isAirbnb && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 10 }}>Restock Service</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={restockInput !== '' ? restockInput : (b.restockCharge > 0 ? b.restockCharge : '')}
                onChange={e => setRestockInput(e.target.value)}
                onBlur={async () => {
                  const val = parseFloat(restockInput);
                  if (restockInput === '' || isNaN(val)) { setRestockInput(''); return; }
                  setRestockSaving(true);
                  saveField('restockCharge', val);
                  setRestockInput('');
                  setRestockSaving(false);
                }}
                style={{ ...FIELD_STYLE(C), width: 90, display: 'inline-block' }}
              />
            </div>
            {b.restockCharge > 0 && (
              <>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: b.restockPaid ? '#f0fdf4' : '#fef9c3', color: b.restockPaid ? '#166534' : '#92400e' }}>
                  {b.restockPaid ? 'Paid' : 'Pending'}
                </span>
                {!b.restockPaid && (
                  <button
                    disabled={restockSaving}
                    onClick={() => { setRestockSaving(true); saveField('restockPaid', true); setRestockSaving(false); }}
                    style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Mark as Paid
                  </button>
                )}
                {b.restockPaid && (
                  <button
                    onClick={() => saveField('restockPaid', false)}
                    style={{ fontFamily: FONT, fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Undo
                  </button>
                )}
              </>
            )}
          </div>
          {b.restockCharge > 0 && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 6 }}>
              Restock charge: £{parseFloat(b.restockCharge).toFixed(2)} &nbsp;·&nbsp; {b.restockPaid ? 'Collected and added to reports' : 'Not yet collected — mark as paid once received'}
            </div>
          )}
        </div>
      )}

      {/* Monthly payment tracker — contracts only */}
      {b.isContract && contractMonths.length > 0 && (() => {
        const payments   = b.monthlyPayments || {};
        const paidCount  = contractMonths.filter(m => payments[m] === 'paid').length;
        const todayISO   = new Date().toISOString().slice(0, 10);
        const visitsInPeriod   = (start, end) => contractVisits.filter(v => v.cleanDate >= start && v.cleanDate <= end);
        const rateForPeriod    = m => (b.rateEffectiveFrom && m < b.rateEffectiveFrom && b.previousMonthlyBaseValue)
          ? parseFloat(b.previousMonthlyBaseValue)
          : parseFloat(b.monthlyBaseValue || b.pricePerVisit || 0);
        const prevMonthAddons     = m => {
          const idx = contractMonths.indexOf(m);
          if (idx <= 0) return 0;
          const prev = contractPeriods[idx - 1];
          return visitsInPeriod(prev.start, prev.end).reduce((s, v) => s + parseFloat(v.addonTotal || 0), 0);
        };
        const periodMediaDiscount = m => {
          const p = contractPeriods[contractMonths.indexOf(m)];
          if (!p) return 0;
          return visitsInPeriod(p.start, p.end).reduce((s, v) => s + parseFloat(v.mediaConsentDiscount || 0), 0);
        };
        const monthCharge        = m => rateForPeriod(m) + prevMonthAddons(m) - periodMediaDiscount(m);
        const lastPeriod         = contractPeriods[contractPeriods.length - 1];
        const fmtBillingDate     = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const finalSettlement    = lastPeriod ? visitsInPeriod(lastPeriod.start, lastPeriod.end).reduce((s, v) => s + parseFloat(v.addonTotal || 0), 0) : 0;
        const finalSettlementPaid = payments['final_settlement'] === 'paid';
        const received    = contractMonths.filter(m => payments[m] === 'paid').reduce((s, m) => s + monthCharge(m), 0) + (finalSettlement > 0 && finalSettlementPaid ? finalSettlement : 0);
        const outstanding = contractMonths.filter(m => payments[m] !== 'paid').reduce((s, m) => s + monthCharge(m), 0) + (finalSettlement > 0 && !finalSettlementPaid ? finalSettlement : 0);
        return (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
            {paymentErr && (
              <div style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {paymentErr}
                <button onClick={() => setPaymentErr('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, lineHeight: 1 }}>✕</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>Monthly Payments</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
                {paidCount + (finalSettlement > 0 && finalSettlementPaid ? 1 : 0)}/{contractMonths.length + (finalSettlement > 0 ? 1 : 0)} paid &nbsp;·&nbsp;
                <span style={{ color: '#16a34a', fontWeight: 600 }}>£{received.toFixed(2)} received</span>
                {outstanding > 0 && (
                  <> &nbsp;·&nbsp; <span style={{ color: '#d97706', fontWeight: 600 }}>£{outstanding.toFixed(2)} outstanding</span></>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {contractMonths.map(m => {
                const isPaid     = payments[m] === 'paid';
                const isFailed   = payments[m] === 'failed';
                const periodIdx  = contractMonths.indexOf(m);
                const period     = contractPeriods[periodIdx];
                const fmtBD      = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                const isCur      = period ? todayISO >= period.start && todayISO <= period.end : false;
                const label      = period ? `${fmtBD(period.start)} - ${fmtBD(period.end)}` : m;
                const isSaving   = false;
                const isExpanded = expandedMonth === m;
                const monthVisits = period ? visitsInPeriod(period.start, period.end).sort((a, z) => (a.cleanDate || '').localeCompare(z.cleanDate || '')) : [];
                const charge       = monthCharge(m);
                const carryFwd     = prevMonthAddons(m);
                const mediaDiscount = periodMediaDiscount(m);
                const prevPeriod = periodIdx > 0 ? contractPeriods[periodIdx - 1] : null;
                const prevLabel  = prevPeriod ? `${fmtBD(prevPeriod.start)} - ${fmtBD(prevPeriod.end)}` : null;
                const retryKey = `${b.id}_${m}`;
                const isRetrying = retryingContractCharge === retryKey;
                return (
                  <div key={m} style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${isPaid ? '#86efac' : isFailed ? '#fca5a5' : isCur ? '#fde68a' : C.border}` }}>
                    <div
                      onClick={() => setExpandedMonth(isExpanded ? null : m)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: isPaid ? '#f0fdf4' : isFailed ? '#fef2f2' : isCur ? '#fffbeb' : C.card, cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: FONT, fontSize: 10, color: C.muted, width: 10 }}>{isExpanded ? '▾' : '▸'}</span>
                        <div style={{ fontFamily: FONT, fontSize: 13, color: isFailed ? C.danger : C.text, fontWeight: isCur ? 600 : 400 }}>{label}</div>
                        {isCur && !isFailed && <span style={{ fontFamily: FONT, fontSize: 10, color: '#92400e', fontWeight: 600, background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>This month</span>}
                        {isFailed && <span style={{ fontFamily: FONT, fontSize: 10, color: '#991b1b', fontWeight: 600, background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>Payment failed</span>}
                        {b.paymentReminderSentFor === m && !isPaid && <span style={{ fontFamily: FONT, fontSize: 10, color: '#1d4ed8', fontWeight: 500, background: '#eff6ff', padding: '1px 6px', borderRadius: 4 }}>Reminder sent</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {charge > 0 && <div style={{ fontFamily: FONT, fontSize: 12, color: isFailed ? C.danger : C.muted }}>£{charge.toFixed(2)}</div>}
                        {isFailed ? (
                          <button
                            disabled={isRetrying}
                            onClick={e => { e.stopPropagation(); handleRetryContractCharge(b, m); }}
                            style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 5, cursor: isRetrying ? 'not-allowed' : 'pointer', border: '1px solid #fca5a5', background: '#fef2f2', color: '#991b1b' }}
                          >
                            {isRetrying ? '…' : '↺ Retry Charge'}
                          </button>
                        ) : (
                          <button
                            disabled={isSaving}
                            onClick={e => { e.stopPropagation(); toggleMonthPaid(m, !isPaid); }}
                            style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 5, cursor: isSaving ? 'not-allowed' : 'pointer', border: `1px solid ${isPaid ? '#86efac' : '#fde68a'}`, background: isPaid ? '#dcfce7' : '#fff8eb', color: isPaid ? '#166534' : '#92400e' }}
                          >
                            {isSaving ? '…' : isPaid ? '✓ Paid' : 'Mark Paid'}
                          </button>
                        )}
                      </div>
                    </div>
                    {isFailed && retryContractErr[retryKey] && (
                      <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, padding: '4px 10px', background: '#fef2f2' }}>{retryContractErr[retryKey]}</div>
                    )}
                    {isExpanded && (
                      <div style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Monthly base: £{rateForPeriod(m).toFixed(2)}</div>
                          {carryFwd > 0
                            ? <div style={{ fontFamily: FONT, fontSize: 11, color: '#92400e' }}>+ £{carryFwd.toFixed(2)} add-ons carried forward from {prevLabel}</div>
                            : <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>No add-ons carried forward</div>
                          }
                          {mediaDiscount > 0 && (
                            <div style={{ fontFamily: FONT, fontSize: 11, color: '#16a34a' }}>- £{mediaDiscount.toFixed(2)} media consent discount (1st visit)</div>
                          )}
                          <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text, marginTop: 4, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>Total charge: £{charge.toFixed(2)}</div>
                        </div>
                        {monthVisits.length === 0 ? (
                          <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, padding: '4px 0' }}>No visits scheduled this month.</div>
                        ) : monthVisits.map(v => {
                          const vOnHoliday  = (staff || []).filter(s => s.status === 'Active' && (s.holidays || []).includes(v.cleanDate));
                          const vAvailable  = (staff || []).filter(s => s.status === 'Active' && !(s.holidays || []).includes(v.cleanDate));
                          const vBase       = parseFloat(v.pricePerVisit || 0);
                          const vAddons     = v.addons?.length ? v.addons : [];
                          const vAddonTotal = parseFloat(v.addonTotal || vAddons.reduce((s, a) => s + (a.price || 0), 0));
                          const vDiscount   = parseFloat(v.mediaConsentDiscount || 0);
                          const vTotal      = parseFloat(v.total || v.totalPerVisit || vBase + vAddonTotal) - vDiscount;
                          const vCleaners   = b.numCleaners || 1;
                          const vAddonHrs   = vAddons.reduce((s, a) => s + (a.h ?? ADDON_HOURS[a.id] ?? 0), 0);
                          const masterAddonHrs = (b.addons || []).reduce((s, a) => s + (a.h ?? ADDON_HOURS[a.id] ?? 0), 0);
                          const vDurBase    = parseFloat(
                            v.visitDurationBase ||
                            b.visitDurationBase ||
                            (b.visitDuration ? b.visitDuration - masterAddonHrs / vCleaners : 0)
                          );
                          const vDur        = vDurBase > 0 ? fmtDuration(vDurBase + vAddonHrs / vCleaners) : null;
                          return (
                            <div key={v.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vAddons.length > 0 ? 6 : 8 }}>
                                <div>
                                  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{fmtDate(v.cleanDate)}{v.cleanTime ? ` · ${v.cleanTime}` : ''}</div>
                                  {vDur && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>⏱ {vDur}{vCleaners > 1 ? ` each (${fmtDuration((vDurBase + vAddonHrs / vCleaners) * vCleaners)} total)` : ''}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ textAlign: 'right' }}>
                                    {vAddons.length > 0 && (
                                      <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>
                                        Base £{vBase.toFixed(2)} + add-ons £{vAddonTotal.toFixed(2)}
                                      </div>
                                    )}
                                    {v.mediaConsentDiscount > 0 && (
                                      <div style={{ fontFamily: FONT, fontSize: 10, color: '#16a34a' }}>
                                        Media consent -£{parseFloat(v.mediaConsentDiscount).toFixed(2)}
                                      </div>
                                    )}
                                    <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text }}>£{vTotal.toFixed(2)}</div>
                                  </div>
                                  {v.status === 'completed' ? (
                                    <button
                                      onClick={async e => { e.stopPropagation(); await updateDoc(doc(db, 'bookings', v.id), { status: '' }); setBookings(all => all.map(x => x.id === v.id ? { ...x, status: '' } : x)); }}
                                      title="Click to undo"
                                      style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '5px 10px', background: '#dcfce7', color: '#166534', borderRadius: 5, border: '1px solid #86efac', cursor: 'pointer' }}
                                    >✓ Done</button>
                                  ) : (
                                    <button
                                      disabled={completing === v.id}
                                      onClick={e => { e.stopPropagation(); handleComplete(v); }}
                                      style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '5px 10px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, cursor: completing === v.id ? 'not-allowed' : 'pointer' }}
                                    >
                                      {completing === v.id ? '...' : 'Mark Done'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openEditVisit(v)}
                                    style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '5px 10px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer' }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => { setRefundErr(''); setRefundModal({ visitId: v.id, contractId: b.id, amount: '', password: '' }); }}
                                    style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer' }}
                                  >
                                    Refund
                                  </button>
                                </div>
                              </div>
                              {v.partialRefundAmount > 0 && (
                                <div style={{ fontFamily: FONT, fontSize: 11, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4, padding: '3px 8px', marginBottom: 6 }}>
                                  Partial refund issued: £{parseFloat(v.partialRefundAmount).toFixed(2)}{v.partialRefundDate ? ` on ${fmtDate(v.partialRefundDate)}` : ''}
                                </div>
                              )}
                              {vAddons.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                                  {vAddons.map(a => (
                                    <span key={a.id || a.name} style={{ fontFamily: FONT, fontSize: 11, color: C.text, background: `${C.accent}14`, border: `1px solid ${C.accent}40`, borderRadius: 4, padding: '2px 7px' }}>
                                      {a.name || a.label} · £{a.price}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {vAddons.length === 0 && (
                                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 8 }}>No add-ons</div>
                              )}
                              {staff?.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <select
                                    value={v.assignedStaff || ''}
                                    onChange={e => handleAssignStaff(v, e.target.value, !!v.secondCleaner)}
                                    style={{ fontFamily: FONT, fontSize: 12, padding: '5px 8px', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer' }}
                                  >
                                    <option value="">👤 Assign cleaner…</option>
                                    {vAvailable.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    {vOnHoliday.map(s => <option key={s.id} value={s.name} disabled>🏖 {s.name} (holiday)</option>)}
                                  </select>
                                  <select
                                    value={v.secondCleaner || ''}
                                    onChange={e => handleAssignSecondCleaner(v, e.target.value)}
                                    style={{ fontFamily: FONT, fontSize: 12, padding: '5px 8px', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer' }}
                                  >
                                    <option value="">+2nd cleaner (optional)</option>
                                    {vAvailable.filter(s => s.name !== v.assignedStaff).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    {vOnHoliday.filter(s => s.name !== v.assignedStaff).map(s => <option key={s.id} value={s.name} disabled>🏖 {s.name} (holiday)</option>)}
                                  </select>
                                  {v.assignedStaff && (
                                    <div style={{ fontFamily: FONT, fontSize: 11, color: '#16a34a' }}>
                                      ✓ {[v.assignedStaff, v.secondCleaner].filter(Boolean).join(' & ')}
                                    </div>
                                  )}
                                </div>
                              )}
                              {v.assignedStaff && (
                                <div style={{ marginTop: 8 }}>
                                  {/* Actual hours for this visit */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                                    {[
                                      { name: v.assignedStaff, sf: 'actualStart',  ff: 'actualFinish'  },
                                      ...(v.secondCleaner ? [{ name: v.secondCleaner, sf: 'actualStart2', ff: 'actualFinish2' }] : []),
                                    ].map(({ name, sf, ff }) => {
                                      const vH = calcHours(v[sf] || (sf === 'actualStart' ? v.cleanTime : null), v[ff]);
                                      return (
                                        <div key={sf} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                          {v.secondCleaner && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.text, minWidth: 90 }}>{name}</div>}
                                          <div>
                                            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Actual Start</div>
                                            <input type="time" value={toInputTime(v[sf])} onChange={ev => saveVisitField(v, sf, ev.target.value)}
                                              style={{ fontFamily: FONT, fontSize: 12, padding: '4px 8px', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, width: 110 }} />
                                          </div>
                                          <div>
                                            <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 2 }}>Actual Finish</div>
                                            <input type="time" value={toInputTime(v[ff])} onChange={ev => saveVisitField(v, ff, ev.target.value)}
                                              style={{ fontFamily: FONT, fontSize: 12, padding: '4px 8px', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, width: 110 }} />
                                          </div>
                                          {vH !== null && <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>⏱ {fmtDuration(vH)}</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => handleNotifyVisit(v)}
                                    disabled={visitNotifying[v.id]}
                                    style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '5px 10px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 5, cursor: visitNotifying[v.id] ? 'not-allowed' : 'pointer' }}
                                  >
                                    {visitNotifying[v.id] ? 'Sending…' : '✉ Notify Customer'}
                                  </button>
                                  {(visitNotifySent[v.id] || v.lastNotifiedAt) && (
                                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>
                                      ✓ Sent{visitNotifySent[v.id]?.cleaner ? ` for ${visitNotifySent[v.id].cleaner}` : v.lastNotifiedCleaner ? ` for ${v.lastNotifiedCleaner}` : ''}
                                    </div>
                                  )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {finalSettlement > 0 && (
                <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${finalSettlementPaid ? '#86efac' : '#fca5a5'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: finalSettlementPaid ? '#f0fdf4' : '#fef2f2' }}>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>Final add-ons settlement</div>
                      {lastPeriod && <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>Add-ons from {fmtBillingDate(lastPeriod.start)} - {fmtBillingDate(lastPeriod.end)}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>£{finalSettlement.toFixed(2)}</div>
                      <button
                        onClick={e => { e.stopPropagation(); toggleMonthPaid('final_settlement', !finalSettlementPaid); }}
                        style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${finalSettlementPaid ? '#86efac' : '#fca5a5'}`, background: finalSettlementPaid ? '#dcfce7' : '#fef2f2', color: finalSettlementPaid ? '#166534' : '#dc2626' }}
                      >
                        {finalSettlementPaid ? '✓ Paid' : 'Mark Paid'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Notes */}
      {b.notes && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontFamily: FONT, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
          Notes: {b.notes}
        </div>
      )}

      {/* Hours worked — shown for regular bookings and contract visits (not master contract docs) */}
      {!b.isContract && <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 10 }}>Hours Worked</div>
        {[
          { name: b.assignedStaff, sf: 'actualStart',  ff: 'actualFinish'  },
          ...(b.secondCleaner ? [{ name: b.secondCleaner, sf: 'actualStart2', ff: 'actualFinish2' }] : []),
        ].map(({ name, sf, ff }) => {
          const member = staff?.find(s => s.name === name);
          const r      = member?.hourlyRate !== 'N/A' ? parseFloat(member?.hourlyRate) : null;
          const h      = calcHours(b[sf] || (sf === 'actualStart' ? b.cleanTime : null), b[ff]);
          const e      = r !== null && h !== null ? h * r : null;
          return (
            <div key={sf} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: b.secondCleaner ? 8 : 0 }}>
              {b.secondCleaner && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.text, minWidth: 90, paddingBottom: 6 }}>{name}</div>}
              {[{ label: 'Actual Start', field: sf }, { label: 'Actual Finish', field: ff }].map(({ label, field }) => (
                <div key={field}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 3 }}>{label}</div>
                  <input type="time" value={toInputTime(b[field])} onChange={ev => saveField(field, ev.target.value)}
                    style={{ ...FIELD_STYLE(C), marginBottom: 0, width: 120 }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {h !== null && <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>⏱ {fmtDuration(h)}</span>}
                {e !== null && <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>£{e.toFixed(2)}</span>}
                {name && r === null && <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>N/A rate</span>}
              </div>
            </div>
          );
        })}
      </div>}

      {/* Cancellation details */}
      {isCancelled && (
        <div style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.danger, marginBottom: 10 }}>Cancellation Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 16px' }}>
            {[
              { l: 'Cancelled At',   v: fmtCreatedAt(b.cancelledAt) },
              b.cancellationReason && { l: 'Reason', v: b.cancellationReason },
              b.cleanDateUTC && b.cancelledAt && (() => {
                const hrsNotice = ((new Date(b.cleanDateUTC) - (b.cancelledAt?.toDate ? b.cancelledAt.toDate() : new Date(b.cancelledAt))) / 3600000);
                return { l: 'Notice Given', v: `${hrsNotice > 0 ? hrsNotice.toFixed(1) : '0'} hrs — ${hrsNotice >= 48 ? 'Full refund' : 'No refund'}` };
              })(),
              { l: 'Refund Amount',  v: b.refundAmount != null ? `£${parseFloat(b.refundAmount).toFixed(2)}` : '—' },
            ].filter(Boolean).map((r, i) => (
              <div key={i}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature Touch toggle — standard package only, not shown for contracts or contract visits */}
      {!b.isContract && !b.isContractVisit && (b.package === 'standard' || b.packageId === 'standard') && (
        <div style={{ padding: '10px 14px', background: b.signatureTouch !== false ? '#f0fdf4' : '#fef9f0', borderRadius: 6, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: b.signatureTouch !== false ? '#166534' : '#92400e' }}>
                {b.signatureTouch !== false ? '✓ Signature Touch: Opted in' : '✕ Signature Touch: Opted out'}
              </div>
              {b.signatureTouch === false && b.signatureTouchNotes && !sigTouchOptingOut && (
                <div style={{ fontFamily: FONT, fontSize: 11, color: '#92400e', marginTop: 2 }}>Reason: {b.signatureTouchNotes}</div>
              )}
            </div>
            {!sigTouchOptingOut && (
              <button
                onClick={() => {
                  if (b.signatureTouch !== false) {
                    setSigTouchOptingOut(true);
                    setSigTouchNote('');
                  } else {
                    fetch(import.meta.env.VITE_CF_SET_SIGNATURE_TOUCH, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: b.email, signatureTouch: true, signatureTouchNotes: '' }),
                    }).catch(() => {});
                    setBookings(all => all.map(x =>
                      x.email?.toLowerCase() === b.email?.toLowerCase() && (x.package === 'standard' || x.packageId === 'standard')
                        ? { ...x, signatureTouch: true, signatureTouchNotes: '' } : x
                    ));
                  }
                }}
                style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '6px 12px', background: b.signatureTouch !== false ? '#dcfce7' : '#fef3c7', color: b.signatureTouch !== false ? '#166534' : '#92400e', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
              >
                {b.signatureTouch !== false ? 'Mark opted out' : 'Mark opted in'}
              </button>
            )}
          </div>
          {sigTouchOptingOut && (
            <div style={{ marginTop: 10 }}>
              <select
                autoFocus
                value={sigTouchNote}
                onChange={e => setSigTouchNote(e.target.value)}
                style={{ ...FIELD_STYLE(C), marginBottom: 8 }}
              >
                <option value="">Reason for opting out (optional)</option>
                <option value="Scent doesn't match my preference">Scent doesn't match my preference</option>
                <option value="Fragrance allergy or sensitivity">Fragrance allergy or sensitivity</option>
                <option value="Candles not suitable for my home">Candles not suitable for my home</option>
                <option value="Don't use home fragrance products">Don't use home fragrance products</option>
                <option value="Already have enough home fragrance">Already have enough home fragrance</option>
                <option value="Prefer a tidy clean only">Prefer a tidy clean only</option>
                <option value="Prefer to receive it occasionally">Prefer to receive it occasionally</option>
                <option value="Other">Other</option>
              </select>
              {sigTouchNote === 'Other' && (
                <textarea
                  placeholder="Please tell us a bit more…"
                  value={sigTouchOtherNote}
                  onChange={e => setSigTouchOtherNote(e.target.value)}
                  rows={3}
                  style={{ ...FIELD_STYLE(C), marginTop: 8, marginBottom: 0, resize: 'vertical' }}
                />
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    const finalNote = sigTouchNote === 'Other' ? sigTouchOtherNote.trim() || 'Other' : sigTouchNote;
                    fetch(import.meta.env.VITE_CF_SET_SIGNATURE_TOUCH, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: b.email, signatureTouch: false, signatureTouchNotes: finalNote }),
                    }).catch(() => {});
                    setBookings(all => all.map(x =>
                      x.email?.toLowerCase() === b.email?.toLowerCase() && (x.package === 'standard' || x.packageId === 'standard')
                        ? { ...x, signatureTouch: false, signatureTouchNotes: finalNote } : x
                    ));
                    setSigTouchOptingOut(false);
                  }}
                  style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '6px 14px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Confirm opt-out
                </button>
                <button
                  onClick={() => setSigTouchOptingOut(false)}
                  style={{ fontFamily: FONT, fontSize: 11, padding: '6px 14px', background: 'transparent', color: '#92400e', border: '1px solid #92400e', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Do Not Contact toggle */}
      <DoNotContactToggle
        value={b.doNotContact ?? b.marketingOptOut ?? false}
        onChange={saveDoNotContact}
      />

      {/* Notify Customer — shown before action buttons */}
      {b.assignedStaff && !isCancelled && (
        <div style={{ marginBottom: 8 }}>
          <button onClick={handleNotifyCleaner} disabled={notifying}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '9px 16px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', touchAction: 'manipulation', width: isMobile ? '100%' : 'auto' }}>
            {notifying ? 'Sending…' : '✉ Notify Customer'}
          </button>
          {lastNotified && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>
              ✓ Sent for <strong>{lastNotified.cleaner}</strong><br />{fmtNotifyTime(lastNotified.at)}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Edit */}
        <button onClick={() => openEdit(b)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', touchAction: 'manipulation' }}>
          ✏️ Edit
        </button>

        {/* Staff assign — holiday-aware */}
        {staff?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={b.assignedStaff || ''}
              onChange={e => handleAssignStaff(b, e.target.value, !!b.secondCleaner)}
              style={{ fontFamily: FONT, fontSize: 12, padding: '7px 10px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}
            >
              <option value="">👤 Assign cleaner…</option>
              {available.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              {onHoliday.map(s => <option key={s.id} value={s.name} disabled>🏖 {s.name} (holiday)</option>)}
            </select>
            <select
              value={b.secondCleaner || ''}
              onChange={e => handleAssignSecondCleaner(b, e.target.value)}
              style={{ fontFamily: FONT, fontSize: 12, padding: '7px 10px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}
            >
              <option value="">+2nd cleaner (optional)</option>
              {available.filter(s => s.name !== b.assignedStaff).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              {onHoliday.filter(s => s.name !== b.assignedStaff).map(s => <option key={s.id} value={s.name} disabled>🏖 {s.name} (holiday)</option>)}
            </select>
            {b.assignedStaff && b.frequency && b.frequency !== 'one-off' && (
              <button
                onClick={() => {
                  const who = [b.assignedStaff, b.secondCleaner].filter(Boolean).join(' & ');
                  const msg = b.isContract
                    ? `Apply ${who} to all visits in this contract?`
                    : `Apply ${who} to all future bookings in this series?`;
                  if (window.confirm(msg)) {
                    handleApplyCleanersToAll(b);
                  }
                }}
                style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '6px 10px', background: 'none', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {b.isContract ? 'Apply to all bookings' : 'Apply to all future'}
              </button>
            )}
          </div>
        )}

        {/* Contract first payment link */}
        {b.isContract && !b.stripeCustomerId && (
          <>
            <button onClick={() => handleGenerateContractLink(b)} disabled={generatingContractLink === b.id}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.accent, color: C.text, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {generatingContractLink === b.id ? 'Generating…' : '🔗 Generate First Payment Link'}
            </button>
            {contractLinks[b.id] && (
              <div style={{ width: '100%', marginTop: 4, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 8 }}>
                  Payment link — send to client
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input readOnly value={contractLinks[b.id]} style={{ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 11, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => navigator.clipboard.writeText(contractLinks[b.id])}
                    style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 14px', background: C.text, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>
                    Copy
                  </button>
                </div>
                <button onClick={() => handleEmailDepositLink(b)} disabled={emailingLink === b.id || emailedLinks[b.id]}
                  style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', width: '100%', background: emailedLinks[b.id] ? '#16a34a' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: emailedLinks[b.id] ? 'default' : 'pointer' }}>
                  {emailingLink === b.id ? 'Sending…' : emailedLinks[b.id] ? '✓ Email Sent to Client' : '✉ Email Link to Client'}
                </button>
              </div>
            )}
            {contractLinkErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, width: '100%' }}>{contractLinkErr}</div>}
          </>
        )}
        {b.isContract && b.stripeCustomerId && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ First payment received — card saved for monthly charges
          </div>
        )}

        {/* Pending deposit actions — not shown for contracts (invoiced monthly) */}
        {!b.isContract && b.status === 'pending_deposit' && (
          <>
            {b.isAutoRecurring && (
              <div style={{ width: '100%', background: '#f0fdf4', border: '1px solid rgba(22,101,52,0.2)', borderRadius: 6, padding: '12px 16px', marginBottom: 4 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 4 }}>🔄 Auto-created recurring booking</div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: '#14532d', lineHeight: 1.6 }}>
                  Created automatically by the recurring scheduler. Send the deposit link or mark as paid if collecting manually.
                </div>
              </div>
            )}
            <button onClick={() => handleGenerateLink(b)} disabled={generatingLink === b.id}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {generatingLink === b.id ? 'Generating…' : '🔗 Generate Payment Link'}
            </button>
            <button onClick={() => handleMarkDepositPaid(b)} disabled={markingDeposit === b.id}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
              {markingDeposit === b.id ? 'Saving…' : `💷 Mark Deposit Paid — £${b.deposit}`}
            </button>
          </>
        )}

        {/* Payment link (once generated) */}
        {depositLinks[b.id] && (
          <div style={{ width: '100%', marginTop: 4, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 8 }}>
              Payment link — send to customer
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input readOnly value={depositLinks[b.id]} style={{ ...FIELD_STYLE(C), marginBottom: 0, fontSize: 11 }} />
              <button onClick={() => navigator.clipboard.writeText(depositLinks[b.id])}
                style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 14px', background: C.text, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>
                Copy
              </button>
            </div>
            <button onClick={() => handleEmailDepositLink(b)} disabled={emailingLink === b.id || emailedLinks[b.id]}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', width: '100%', background: emailedLinks[b.id] ? '#16a34a' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: emailedLinks[b.id] ? 'default' : 'pointer', marginBottom: 8 }}>
              {emailingLink === b.id ? 'Sending…' : emailedLinks[b.id] ? '✓ Email Sent to Customer' : '✉ Email Link to Customer'}
            </button>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.danger, marginBottom: 4 }}>
              Read to customer before sending link:
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
              "I'm sending you a secure payment link. Once you pay the deposit, your booking is confirmed and your card will be saved for the final payment after the clean."
            </div>
          </div>
        )}

        {/* Deposit paid — complete job — not shown for contracts */}
        {!b.isContract && b.status === 'deposit_paid' && (
          <>
            {isManualDeposit && (
              <div style={{ width: '100%', background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '12px 16px' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.danger, marginBottom: 4 }}>
                  ⚠ Manual Payment — Action Required Before Completing
                </div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, lineHeight: 1.6 }}>
                  The deposit was collected manually. The remaining balance of <strong>£{b.remaining}</strong> must also be collected manually. No automatic charge will be made.
                </div>
              </div>
            )}
            <button onClick={() => handleComplete(b)} disabled={completing === b.id}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '7px 14px', background: '#2c2420', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {completing === b.id ? 'Charging…' : isManualDeposit ? `✓ Mark as Complete — £${parseFloat(b.remaining||0).toFixed(2)} collected manually` : `✓ Mark as Complete — Charge £${parseFloat(b.remaining||0).toFixed(2)}`}
            </button>
          </>
        )}

        {/* Payment failed — not shown for contracts */}
        {!b.isContract && b.status === 'payment_failed' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              ✓ Deposit paid — £{parseFloat(b.deposit).toFixed(2)}
            </div>
            <div style={{ width: '100%', background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '12px 16px' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.danger, marginBottom: 4 }}>
                ⚠ Final Payment Failed — £{parseFloat(b.remaining).toFixed(2)}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, lineHeight: 1.6 }}>
                The final charge after the clean failed.
                {b.paymentError && <><br /><em>{b.paymentError}</em></>}
              </div>
            </div>
            <button onClick={() => handleComplete(b)} disabled={completing === b.id}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '7px 14px', background: '#2c2420', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {completing === b.id ? 'Retrying…' : `↺ Retry Charge — £${parseFloat(b.remaining).toFixed(2)}`}
            </button>
          </>
        )}

        {/* Scheduled recurring — charge on completion */}
        {!b.isContract && b.status === 'scheduled' && (
          <>
            <div style={{ width: '100%', background: '#f0fdf4', border: '1px solid rgba(22,101,52,0.2)', borderRadius: 6, padding: '12px 16px' }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 4 }}>🔄 Recurring booking — no deposit required</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: '#14532d', lineHeight: 1.6 }}>
                The full amount of £{parseFloat(b.total || 0).toFixed(2)} will be charged automatically to the customer's saved card when you mark this complete.
              </div>
            </div>
            <button onClick={() => handleComplete(b)} disabled={completing === b.id}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '7px 14px', background: '#2c2420', color: '#fff', border: 'none', borderRadius: 6, cursor: completing === b.id ? 'not-allowed' : 'pointer' }}>
              {completing === b.id ? 'Charging…' : `✓ Mark as Complete — Charge £${parseFloat(b.total || 0).toFixed(2)}`}
            </button>
          </>
        )}

        {/* Fully paid confirmation — not shown for contracts */}
        {!b.isContract && b.status === 'fully_paid' && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ Job complete — full payment received
          </div>
        )}

        {/* Partial refund — regular bookings */}
        {!b.isContract && (b.status === 'fully_paid' || b.status === 'completed' || b.status === 'deposit_paid') && (
          <>
            {b.partialRefundAmount > 0 && (
              <div style={{ fontFamily: FONT, fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 12px' }}>
                Partial refund issued: £{parseFloat(b.partialRefundAmount).toFixed(2)}{b.partialRefundDate ? ` on ${fmtDate(b.partialRefundDate)}` : ''}
              </div>
            )}
            <button
              onClick={() => { setRefundErr(''); setRefundModal({ visitId: b.id, contractId: null, amount: '', password: '' }); }}
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer' }}>
              Issue Partial Refund
            </button>
          </>
        )}

        {/* Add New Visit — Airbnb only */}
        {b.isAirbnb === true && !isCancelled && (
          <button
            onClick={() => { setNewVisitErr(''); setNewVisitModal({ date: '', time: b.cleanTime || '' }); }}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer' }}>
            + Add New Visit
          </button>
        )}

        {/* Stop recurring — not for contracts */}
        {!b.isContract && b.isAutoRecurring && !stoppedRecurring.has(b.id) && (
          <button onClick={() => handleStopRecurring(b)} disabled={stoppingRecurring === b.id}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.warning, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
            {stoppingRecurring === b.id ? 'Stopping…' : '⏹ Stop Recurring'}
          </button>
        )}

        {/* Contract upgrade */}
        {b.isContract && !isCancelled && upgradeOptions.length > 0 && (
          <button
            onClick={() => {
                  setUpgradeErr('');
                  const firstUnpaid = contractMonths.find(m => (b.monthlyPayments || {})[m] !== 'paid') || new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
                  setUpgradeModal({ newType: '', newLabel: '', newMonths: 0, newRate: b.monthlyBaseValue ? Math.round(parseFloat(b.monthlyBaseValue) * 100) / 100 : '', newEndDate: '', effectiveFrom: firstUnpaid });
                }}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: '#1d4ed8', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
            {inRenewalWindow ? 'Renew / Change Contract' : '↑ Upgrade Contract'}
          </button>
        )}

        {/* Cancel */}
        {!isCancelled && b.status !== 'fully_paid' && (
          <button
            onClick={() => b.isContract ? setCancelModal(buildContractCancelInfo()) : handleCancel(b)}
            disabled={cancelling === b.id}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.danger, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
            {cancelling === b.id ? 'Cancelling…' : b.isContract ? '✕ Cancel Contract' : '✕ Cancel Booking'}
          </button>
        )}

        {/* Contract cancellation confirmation modal */}
        {cancelModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.danger, marginBottom: 6 }}>
                Cancel Contract
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {cancelModal.tier === 1 ? 'Tier 1 — Cooling-off period'
                  : cancelModal.tier === 2 ? 'Tier 2 — Admin fee applies'
                  : cancelModal.tier === 3 ? 'Tier 3 — Early termination'
                  : cancelModal.tier === 'expired' ? 'Contract already ended'
                  : ''}
              </div>
              {cancelModal.lines.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ color: C.accent, flexShrink: 0, fontWeight: 700 }}>·</div>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, lineHeight: 1.6 }}>{line}</div>
                </div>
              ))}
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, marginTop: 18, marginBottom: 20 }}>
                {cancelModal.action}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setCancelModal(null); handleCancel(b); }}
                  style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '10px 0', background: C.danger, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  Confirm Cancel
                </button>
                <button
                  onClick={() => setCancelModal(null)}
                  style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: '10px 0', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contract upgrade modal */}
        {upgradeModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>{inRenewalWindow ? 'Renew / Change Contract' : 'Upgrade Contract'}</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 20 }}>Current: {b.contractLabel || b.contractType || '—'}</div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>New contract type</div>
                <select
                  value={upgradeModal.newType}
                  onChange={e => {
                    const opt = CONTRACT_OPTIONS.find(c => c.id === e.target.value);
                    if (!opt) return;
                    const undiscounted = parseFloat(b.monthlyBaseValue || 0) / (1 - currentDisc);
                    const autoRate = Math.round(undiscounted * (1 - opt.disc) * 100) / 100;
                    setUpgradeModal(m => ({ ...m, newType: opt.id, newLabel: opt.label, newMonths: opt.months, newRate: autoRate, newEndDate: calcUpgradeEndDate(opt.months, m.effectiveFrom) }));
                  }}
                  style={{ width: '100%', padding: '8px 10px', fontFamily: FONT, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text }}>
                  <option value=''>Select…</option>
                  {upgradeOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>New rate effective from</div>
                <input
                  type='date' value={upgradeModal.effectiveFrom || ''}
                  onChange={e => {
                    const d = e.target.value;
                    setUpgradeModal(m => ({ ...m, effectiveFrom: d, newEndDate: m.newMonths ? calcUpgradeEndDate(m.newMonths, d) : '' }));
                  }}
                  style={{ width: '100%', padding: '8px 10px', fontFamily: FONT, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, boxSizing: 'border-box' }} />
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>Defaults to first unpaid period. Old rate applies to months before this date.</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>New monthly base rate (£)</div>
                <input
                  type='number' step='0.01' value={upgradeModal.newRate}
                  onChange={e => setUpgradeModal(m => ({ ...m, newRate: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontFamily: FONT, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, boxSizing: 'border-box' }} />
                {(() => {
                  const vpm = { weekly: 52/12, fortnightly: 26/12, monthly: 1 }[b.frequency] || 1;
                  const rate = parseFloat(upgradeModal.newRate);
                  if (!rate) return null;
                  return (
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>
                      £{(rate / vpm).toFixed(2)} per visit · {b.frequency || 'monthly'}
                    </div>
                  );
                })()}
              </div>

              {upgradeModal.newEndDate && (
                <div style={{ fontFamily: FONT, fontSize: 13, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
                  New end date: <strong>{upgradeModal.newEndDate.split('-').reverse().join('/')}</strong>
                </div>
              )}

              {upgradeErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{upgradeErr}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleUpgradeContract} disabled={upgrading}
                  style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '10px 0', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: upgrading ? 'not-allowed' : 'pointer' }}>
                  {upgrading ? 'Upgrading…' : 'Confirm Upgrade'}
                </button>
                <button onClick={() => setUpgradeModal(null)}
                  style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: '10px 0', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Partial refund modal */}
        {refundModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 380, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Issue Partial Refund</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 20 }}>This will immediately process a refund via Stripe and cannot be undone.</div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>Refund amount (£)</div>
                <input
                  type='number' step='0.01' min='0.01' placeholder='0.00'
                  value={refundModal.amount}
                  onChange={e => setRefundModal(m => ({ ...m, amount: e.target.value }))}
                  style={{ ...FIELD_STYLE(C), marginBottom: 0 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>Your login password</div>
                <input
                  type='password' placeholder='Enter password to confirm'
                  value={refundModal.password}
                  onChange={e => setRefundModal(m => ({ ...m, password: e.target.value }))}
                  style={{ ...FIELD_STYLE(C), marginBottom: 0 }}
                />
              </div>

              {refundErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{refundErr}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handlePartialRefund} disabled={refunding}
                  style={{ flex: 2, fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '10px 0', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: refunding ? 'not-allowed' : 'pointer', opacity: refunding ? 0.7 : 1 }}>
                  {refunding ? 'Processing…' : 'Confirm Refund'}
                </button>
                <button onClick={() => { setRefundModal(null); setRefundErr(''); }}
                  style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: '10px 0', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Visit modal */}
        {newVisitModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Add New Visit</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 20 }}>All property details will be copied from this booking. Just set the date and time.</div>

              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, fontFamily: FONT, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong style={{ color: C.text }}>{b.customerName}</strong></div>
                <div>{b.addr1}{b.postcode ? `, ${b.postcode}` : ''}</div>
                <div>{b.packageName || b.size || ''}{b.numCleaners > 1 ? ` · ${b.numCleaners} cleaners` : ''}</div>
                {b.assignedStaff && <div>Cleaner: {b.assignedStaff}{b.secondCleaner ? ` & ${b.secondCleaner}` : ''}</div>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>Visit date *</div>
                <input type='date' value={newVisitModal.date}
                  onChange={e => setNewVisitModal(m => ({ ...m, date: e.target.value }))}
                  style={{ ...FIELD_STYLE(C), marginBottom: 0 }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginBottom: 4 }}>Visit time *</div>
                <input type='time' value={newVisitModal.time}
                  onChange={e => setNewVisitModal(m => ({ ...m, time: e.target.value }))}
                  style={{ ...FIELD_STYLE(C), marginBottom: 0 }} />
              </div>

              {newVisitErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 12 }}>{newVisitErr}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleAddNewVisit} disabled={newVisitSaving}
                  style={{ flex: 2, fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '10px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: newVisitSaving ? 'not-allowed' : 'pointer', opacity: newVisitSaving ? 0.7 : 1 }}>
                  {newVisitSaving ? 'Creating…' : 'Create Visit'}
                </button>
                <button onClick={() => { setNewVisitModal(null); setNewVisitErr(''); }}
                  style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: '10px 0', background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete */}
        <button onClick={() => handleDelete(b)} disabled={deleting === b.id}
          style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 6, cursor: 'pointer' }}>
          {deleting === b.id ? 'Deleting…' : '🗑 Delete'}
        </button>
      </div>

      {/* Errors */}
      {(completeErr || cancelErr || linkErr || depositErr || stopRecurringErr) && (
        <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 8 }}>
          {completeErr || cancelErr || linkErr || depositErr || stopRecurringErr}
        </div>
      )}
    </div>
  );
}
