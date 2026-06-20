import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { db } from '../../../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PACKAGES, FREQUENCIES } from '../../../data/siteData';
import { calculateTotal } from '../../../utils/pricing';
import { isOneOffPropertyClean } from '../utils';

export const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';

export function useBookingActions({ bookings, setBookings, setExpanded }) {
  // Lifecycle
  const [completing,     setCompleting]     = useState(null);
  const [completeErr,    setCompleteErr]    = useState('');
  const [cancelling,     setCancelling]     = useState(null);
  const [cancelErr,      setCancelErr]      = useState('');
  const [deleting,       setDeleting]       = useState(null);
  const [deleteProgress, setDeleteProgress] = useState(null);
  // Payments
  const [markingDeposit, setMarkingDeposit] = useState(null);
  const [depositErr,     setDepositErr]     = useState('');
  const [generatingLink, setGeneratingLink] = useState(null);
  const [depositLinks,   setDepositLinks]   = useState({});
  const [linkErr,        setLinkErr]        = useState('');
  const [emailingLink,   setEmailingLink]   = useState(null);
  const [emailedLinks,   setEmailedLinks]   = useState({});
  // Scheduling
  const [stoppingRecurring, setStoppingRecurring] = useState(null);
  const [stopRecurringErr,  setStopRecurringErr]  = useState('');
  const [stoppedRecurring,  setStoppedRecurring]  = useState(new Set());
  // Selection
  const [selected, setSelected] = useState(new Set());
  // Staff assignment
  const [staffAssignPending,        setStaffAssignPending]        = useState(null);
  const [secondCleanerPending,      setSecondCleanerPending]      = useState(null);
  // Edit modal
  const [editBooking, setEditBooking] = useState(null);
  const [editData,    setEditData]    = useState({});
  const [editScope,   setEditScope]   = useState('this');
  const [editSaving,  setEditSaving]  = useState(false);
  const [editErr,     setEditErr]     = useState('');

  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const handleDelete = async (booking) => {
    if (!window.confirm(`Move booking for ${booking.firstName} ${booking.lastName} on ${fmtDate(booking.cleanDate)} to Trash?`)) return;
    setDeleting(booking.id);
    try {
      const res  = await fetch(import.meta.env.VITE_CF_TRASH_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
      const data = await res.json();
      if (!res.ok) { setCompleteErr(data.error || 'Failed to move booking to trash.'); }
      else {
        setExpanded(prev => prev === booking.id ? null : prev);
        setSelected(prev => { const s = new Set(prev); s.delete(booking.id); return s; });
      }
    } catch { setCompleteErr('Failed to move booking to trash.'); }
    finally { setDeleting(null); }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Move ${selected.size} selected booking${selected.size > 1 ? 's' : ''} to Trash?`)) return;
    setCompleteErr('');
    const ids = [...selected];
    setDeleteProgress({ done: 0, total: ids.length });
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await fetch(import.meta.env.VITE_CF_TRASH_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: ids[i] }) });
        if (!res.ok) failed++;
      } catch { failed++; }
      setDeleteProgress({ done: i + 1, total: ids.length });
    }
    if (failed > 0) setCompleteErr(`${failed} booking${failed > 1 ? 's' : ''} could not be moved to trash.`);
    setSelected(new Set());
    setExpanded(null);
    setDeleteProgress(null);
  };

  const handleComplete = async (booking) => {
    setCompleting(booking.id); setCompleteErr('');
    try {
      if (booking.isContractVisit || booking.contractId) {
        await updateDoc(doc(db, 'bookings', booking.id), { status: 'completed', completedAt: new Date().toISOString() });
        setBookings(all => all.map(x => x.id === booking.id ? { ...x, status: 'completed' } : x));
      } else {
        const res  = await fetch(import.meta.env.VITE_CF_COMPLETE_JOB, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
        const data = await res.json();
        if (!res.ok) setCompleteErr(data.error || 'Failed to charge remaining balance.');
        else setBookings(all => all.map(x => x.id === booking.id ? { ...x, status: data.status || 'completed' } : x));
      }
    } catch { setCompleteErr('Something went wrong. Please try again.'); }
    finally { setCompleting(null); }
  };

  const handleGenerateLink = async (booking) => {
    setGeneratingLink(booking.id); setLinkErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_GENERATE_DEPOSIT_LINK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
      const data = await res.json();
      if (!res.ok) setLinkErr(data.error || 'Failed to generate link.');
      else setDepositLinks(prev => ({ ...prev, [booking.id]: `${window.location.origin}/pay-deposit?bookingId=${booking.id}` }));
    } catch { setLinkErr('Something went wrong. Please try again.'); }
    finally { setGeneratingLink(null); }
  };

  const handleEmailDepositLink = async (booking) => {
    setEmailingLink(booking.id);
    try {
      const res  = await fetch(import.meta.env.VITE_CF_EMAIL_DEPOSIT_LINK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
      const data = await res.json();
      if (!res.ok) setLinkErr(data.error || 'Failed to send email.');
      else setEmailedLinks(prev => ({ ...prev, [booking.id]: true }));
    } catch { setLinkErr('Something went wrong. Please try again.'); }
    finally { setEmailingLink(null); }
  };

  const handleMarkDepositPaid = async (booking) => {
    if (!window.confirm(`Mark deposit of £${parseFloat(booking.deposit || 0).toFixed(2)} as collected for ${booking.firstName} ${booking.lastName}?\n\nThis confirms you have received the deposit manually.`)) return;
    setMarkingDeposit(booking.id); setDepositErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_MARK_DEPOSIT_PAID, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
      const data = await res.json();
      if (!res.ok) { setDepositErr(data.error || 'Failed to update booking.'); return; }
      if (booking.isAirbnb || booking.isEstateAgent) {
        const confirmTpl = import.meta.env.VITE_EMAILJS_CONFIRM_TEMPLATE;
        const svcId      = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const pubKey     = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
        if (confirmTpl && svcId && booking.email) {
          const fmtD = s => s ? s.split('-').reverse().join('/') : '—';
          const emailData = {
            to_name:        booking.contactName || booking.firstName || booking.customerName || '',
            to_email:       booking.email,
            booking_ref:    booking.bookingRef || '',
            booking_type:   booking.isEstateAgent ? 'Estate Agent Clean' : 'Airbnb Turnaround Clean',
            package_name:   booking.isEstateAgent ? (booking.cleanType || 'Estate Agent Clean') : (booking.packageName || 'Airbnb Turnaround'),
            property_type:  booking.size || (booking.bedrooms ? `${booking.bedrooms} bed` : '—'),
            frequency:      booking.isEstateAgent ? 'Per visit' : 'One-off',
            date:           fmtD(booking.cleanDate),
            time:           booking.cleanTime || '—',
            address:        [booking.addr1, booking.addr2, booking.postcode].filter(Boolean).join(', '),
            floor:          booking.floor || '—',
            parking:        booking.parking || '—',
            keys:           booking.keys || '—',
            addons:         (booking.addons || []).map(a => a.name || a.label || a).join(', ') || 'None',
            pets:           '—',
            signature_touch:'—',
            notes:          booking.notes || '—',
            total:          `£${parseFloat(booking.total || 0).toFixed(2)}`,
            deposit_paid:   `£${parseFloat(booking.deposit || 0).toFixed(2)}`,
            remaining:      `£${parseFloat(booking.remaining || 0).toFixed(2)}`,
          };
          emailjs.send(svcId, confirmTpl, emailData, pubKey).catch(() => {});
          const adminTpl = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE;
          if (adminTpl) {
            emailjs.send(svcId, adminTpl, {
              ...emailData,
              to_email:       'bookings@londoncleaningwizard.com',
              customer_name:  `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || booking.contactName || '',
              customer_email: booking.email,
              customer_phone: booking.phone || '',
            }, pubKey).catch(() => {});
          }
        }
      }
    } catch { setDepositErr('Something went wrong. Please try again.'); }
    finally { setMarkingDeposit(null); }
  };

  const handleStopRecurring = async (booking) => {
    if (!window.confirm(`Stop recurring cleans for ${booking.firstName} ${booking.lastName}?\n\nNo more bookings will be auto-created for this customer. Any existing scheduled bookings remain and must be cancelled separately.`)) return;
    setStoppingRecurring(booking.id); setStopRecurringErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_STOP_RECURRING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: booking.email, fromDate: booking.cleanDate }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      setStoppedRecurring(prev => new Set([...prev, booking.id]));
    } catch { setStopRecurringErr('Failed to stop recurring series. Please try again.'); }
    finally { setStoppingRecurring(null); }
  };

  const handleCancel = async (booking) => {
    const hoursUntil = (new Date(booking.cleanDateUTC) - new Date()) / 3600000;
    let msg;
    if (booking.isContract) {
      const contractVisits  = bookings.filter(bk => bk.contractId === booking.id);
      const payments        = booking.monthlyPayments || {};
      const fixedBase       = parseFloat(booking.monthlyBaseValue || 0);
      const firstPeriodBase = parseFloat(booking.firstMonthCharge || booking.monthlyBaseValue || 0);
      const paidKeys        = Object.keys(payments).filter(k => k !== 'final_settlement' && payments[k] === 'paid');
      let totalRefund      = 0;
      let uncompletedCount = 0;
      for (const key of paidKeys) {
        const nextDate = new Date(key + 'T12:00:00'); nextDate.setMonth(nextDate.getMonth() + 1);
        const periodEnd    = new Date(nextDate); periodEnd.setDate(periodEnd.getDate() - 1);
        const periodEndStr = periodEnd.toISOString().slice(0, 10);
        const allInPeriod  = contractVisits.filter(v => v.cleanDate >= key && v.cleanDate <= periodEndStr && !v.status?.startsWith('cancelled'));
        const uncompleted  = allInPeriod.filter(v => v.status !== 'completed');
        // Month 1 may have had a media consent discount — use firstMonthCharge for it
        const periodBasis  = key === booking.contractStartDate ? firstPeriodBase : fixedBase;
        if (uncompleted.length > 0 && allInPeriod.length > 0 && periodBasis > 0) {
          totalRefund      += (uncompleted.length / allInPeriod.length) * periodBasis;
          uncompletedCount += uncompleted.length;
        }
      }
      if (paidKeys.length === 0) {
        msg = `No payments collected — contract will be cancelled with no refund required.`;
      } else if (contractVisits.length === 0) {
        msg = `Warning: Visit records could not be found for this contract. A proportional refund may be owed for uncompleted visits in paid periods.\n\nPlease verify and process any refund manually in Stripe after cancelling.`;
      } else if (uncompletedCount > 0 && totalRefund > 0) {
        msg = `${uncompletedCount} visit${uncompletedCount !== 1 ? 's' : ''} in paid periods are not marked as completed.\n\nA refund of £${totalRefund.toFixed(2)} (proportional to the monthly fee) will be automatically issued via Stripe.`;
      } else {
        msg = `All visits in paid periods are completed — no refund required.`;
      }
    } else if (booking.isAutoRecurring) {
      msg = hoursUntil >= 48
        ? `No charge — more than 48 hours notice given.`
        : `⚠️ Less than 48 hours notice — a late cancellation fee of £${(booking.total * 0.3).toFixed(2)} (30% of £${parseFloat(booking.total || 0).toFixed(2)}) will be charged to the customer's saved card.`;
    } else if (isOneOffPropertyClean(booking) && parseFloat(booking.deposit || 0) === 0) {
      msg = hoursUntil >= 48
        ? `No charge — more than 48 hours notice given.`
        : `⚠️ Less than 48 hours notice — a late cancellation fee of £${(parseFloat(booking.total || 0) * 0.3).toFixed(2)} (30% of £${parseFloat(booking.total || 0).toFixed(2)}) will be charged to the customer's saved card.`;
    } else if (booking.status === 'pending_deposit' || !booking.deposit) {
      msg = `No payment has been taken — booking will be cancelled with no refund required.`;
    } else {
      const refundPct = hoursUntil >= 48 ? 100 : 0;
      const refundAmt = (booking.deposit * refundPct / 100).toFixed(2);
      msg = refundPct === 100
        ? `Full refund of £${refundAmt} will be issued (more than 48hrs notice).`
        : `No refund will be issued (less than 48hrs notice).`;
    }

    let consecutiveWarning = '';
    if (booking.isAutoRecurring) {
      const series = bookings
        .filter(b => b.isAutoRecurring && b.id !== booking.id && (
          booking.recurringId ? b.recurringId === booking.recurringId : b.email === booking.email
        ))
        .sort((a, b) => a.cleanDate.localeCompare(b.cleanDate));
      const prevBooking = [...series].filter(b => b.cleanDate < booking.cleanDate).pop();
      const nextBooking = series.find(b => b.cleanDate > booking.cleanDate);
      if (prevBooking?.status?.startsWith('cancelled') || nextBooking?.status?.startsWith('cancelled')) {
        consecutiveWarning = `\n\n⚠️ SERIES WILL BE STOPPED: This is the 2nd consecutive cancellation. Confirming will automatically stop the recurring series and remove all future scheduled bookings. ${booking.firstName} ${booking.lastName} will need to rebook from scratch at full price.`;
      }
    }

    if (!window.confirm(`Cancel this booking?\n\n${msg}${consecutiveWarning}\n\nThis cannot be undone.`)) return;
    setCancelling(booking.id); setCancelErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_CANCEL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, reason: 'Cancelled by admin' }) });
      const data = await res.json();
      if (!res.ok) { setCancelErr(data.error || 'Failed to cancel booking.'); }
      else if (data.consecutiveAlert) {
        window.alert(`⚠️ 2 consecutive cancellations for ${booking.firstName} ${booking.lastName}.\n\nTheir recurring series has been automatically stopped and all future scheduled bookings have been removed. They will need to rebook from scratch at full price.`);
      }
    } catch (err) { setCancelErr(`Something went wrong: ${err?.message || 'Unknown error'}`); }
    finally { setCancelling(null); }
  };

  const handleAssignStaff = (booking, staffName, clearSecondCleaner = false) => {
    // Allow empty staffName to unassign — clearing primary also clears second cleaner
    const shouldClearSecond = !staffName || clearSecondCleaner;
    if (booking.isContractVisit) {
      assignStaff({ booking, staffName, scope: 'single', clearSecondCleaner: shouldClearSecond });
      return;
    }
    const isRecurringSeries = booking.isAutoRecurring || (booking.frequency && booking.frequency !== 'one-off');
    if (isRecurringSeries) {
      setStaffAssignPending({ booking, staffName, clearSecondCleaner: shouldClearSecond });
    } else {
      assignStaff({ booking, staffName, scope: 'single', clearSecondCleaner: shouldClearSecond });
    }
  };

  const assignStaff = ({ booking: b, staffName, scope, clearSecondCleaner = false }) => {
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const targets  = scope === 'all'
      ? bookings.filter(x => x.email === b.email && x.frequency === b.frequency && x.frequency !== 'one-off' && x.cleanDate >= todayStr)
      : [b];
    setBookings(prev => prev.map(x => targets.find(t => t.id === x.id)
      ? { ...x, assignedStaff: staffName, ...(clearSecondCleaner ? { secondCleaner: '' } : {}) }
      : x));
    for (const t of targets) {
      fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: t.id, assignedStaff: staffName, ...(clearSecondCleaner ? { secondCleaner: '' } : {}) }),
      }).catch(() => {});
    }
    if (scope === 'all') {
      updateDoc(doc(db, 'customers', b.email), { assignedStaff: staffName }).catch(() => {});
    }
    setStaffAssignPending(null);
  };

  const handleConfirmAssignThis = () => {
    if (!staffAssignPending) return;
    assignStaff({ ...staffAssignPending, scope: 'single' });
  };

  const handleConfirmAssignAll = () => {
    if (!staffAssignPending) return;
    assignStaff({ ...staffAssignPending, scope: 'all' });
  };

  const handleAssignSecondCleaner = (booking, secondCleanerName) => {
    if (booking.isContractVisit) {
      applySecondCleaner({ booking, secondCleanerName, scope: 'single' });
      return;
    }
    const isRecurringSeries = booking.isAutoRecurring || (booking.frequency && booking.frequency !== 'one-off');
    if (isRecurringSeries) {
      setSecondCleanerPending({ booking, secondCleanerName });
    } else {
      applySecondCleaner({ booking, secondCleanerName, scope: 'single' });
    }
  };

  const applySecondCleaner = ({ booking: b, secondCleanerName, scope }) => {
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const targets = scope === 'all'
      ? bookings.filter(x => x.email === b.email && x.frequency === b.frequency && x.frequency !== 'one-off' && x.cleanDate >= todayStr)
      : [b];
    setBookings(prev => prev.map(x => targets.find(t => t.id === x.id) ? { ...x, secondCleaner: secondCleanerName } : x));
    for (const t of targets) {
      fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: t.id, secondCleaner: secondCleanerName }),
      }).catch(() => {});
    }
    setSecondCleanerPending(null);
  };

  const handleConfirmSecondCleanerThis = () => {
    if (!secondCleanerPending) return;
    applySecondCleaner({ ...secondCleanerPending, scope: 'single' });
  };

  const handleConfirmSecondCleanerAll = () => {
    if (!secondCleanerPending) return;
    applySecondCleaner({ ...secondCleanerPending, scope: 'all' });
  };

  const handleApplyCleanersToAll = (b) => {
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const targets = b.isContract
      ? bookings.filter(x => x.contractId === b.id && x.isContractVisit && !x.deleted)
      : bookings.filter(x =>
          x.email === b.email && x.frequency === b.frequency && x.frequency !== 'one-off' && x.cleanDate >= todayStr
        );
    if (!targets.length) return;
    const update = { assignedStaff: b.assignedStaff, secondCleaner: b.secondCleaner || '' };
    setBookings(prev => prev.map(x => targets.find(t => t.id === x.id) ? { ...x, ...update } : x));
    for (const t of targets) {
      fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: t.id, ...update }),
      }).catch(() => {});
    }
  };

  const openEdit = (b) => {
    setEditBooking(b);
    setEditData({
      cleanDate: b.cleanDate || '', cleanTime: b.cleanTime || '',
      firstName: b.firstName || '', lastName: b.lastName || '',
      email: b.email || '', phone: b.phone || '',
      packageId: b.package || b.packageId || '', packageName: b.packageName || '',
      sizeId: b.size || b.sizeId || '', frequency: b.frequency || 'one-off',
      addons: b.addons || [],
      addr1: b.addr1 || '', postcode: b.postcode || '',
      floor: b.floor || '', parking: b.parking || '', keys: b.keys || '',
      hasPets: b.hasPets ?? null, petTypes: b.petTypes || '',
      signatureTouch: b.signatureTouch ?? true, signatureTouchNotes: b.signatureTouchNotes || '',
      mediaConsent: b.mediaConsent ?? false,
      notes: b.notes || '',
    });
    setEditScope('this');
    setEditErr('');
  };

  const closeEdit = () => { setEditBooking(null); setEditData({}); setEditScope('this'); setEditErr(''); };

  const handleEditSave = async () => {
    setEditSaving(true); setEditErr('');
    const pkgChanged = editData.packageId !== (editBooking.package || editBooking.packageId);
    if (pkgChanged && !editData.sizeId) { setEditErr('Please select a property size.'); setEditSaving(false); return; }
    try {
      const payload = { bookingId: editBooking.id, ...editData, updateCustomerProfile: editScope === 'all' };
      const packageChanged = editData.packageId !== (editBooking.package || editBooking.packageId) || editData.sizeId !== (editBooking.size || editBooking.sizeId);
      const pkg  = PACKAGES.find(p => p.id === editData.packageId);
      const size = pkg?.sizes?.find(s => s.id === editData.sizeId);
      if (size && packageChanged) {
        const freqObj = FREQUENCIES.find(f => f.id === (editBooking.frequency || 'one-off')) || { saving: 0 };
        const { subtotal } = calculateTotal({
          sizePrice: size.basePrice, propertyType: editBooking.propertyType,
          frequency: freqObj, addons: editData.addons || [],
          supplies: editBooking.supplies, suppliesFeeOverride: editBooking.suppliesFee,
        });
        payload.total     = subtotal;
        payload.remaining = Math.max(0, subtotal - (editBooking.deposit || 0));
      }
      const isAirbnb = isOneOffPropertyClean(editBooking);
      if (isAirbnb) {
        const storedAddonTotal  = parseFloat(editBooking.addonTotal)         || 0;
        const mediaDiscount     = parseFloat(editBooking.mediaConsentDiscount) || 0;
        // When mediaConsentDiscount is baked into total: total = cleanPrice + addons - discount
        // So cleanPrice = total + discount - addons
        const basePrice =
          parseFloat(editBooking.pricePerVisit || 0) ||
          Math.max(0, parseFloat(editBooking.total || 0) + mediaDiscount - storedAddonTotal);
        const newAddonTotal = (editData.addons || []).reduce((s, a) => s + parseFloat(a.price || 0), 0);
        payload.pricePerVisit  = Math.round(basePrice * 100) / 100;
        payload.total          = Math.max(0, Math.round((basePrice + newAddonTotal - mediaDiscount) * 100) / 100);
        payload.addonTotal     = Math.round(newAddonTotal * 100) / 100;
        if (mediaDiscount > 0) {
          const oTotal = Math.round((basePrice + newAddonTotal) * 100) / 100;
          if (oTotal > 0) payload.originalTotal = oTotal;
        }
        payload.addonsList    = (editData.addons || []).map(a => a.name || a.label || '').filter(Boolean).join(', ');
        if (editBooking.status === 'pending_deposit') {
          if (editBooking.isEstateAgent) {
            // Estate agents pay in full — deposit is the whole amount, nothing left to charge later
            payload.deposit   = payload.total;
            payload.remaining = 0;
          } else {
            payload.deposit   = Math.ceil(payload.total * 0.30 * 100) / 100;
            payload.remaining = Math.max(0, Math.round((payload.total - payload.deposit) * 100) / 100);
          }
        } else {
          payload.remaining = Math.max(0, Math.round((payload.total - parseFloat(editBooking.deposit || 0)) * 100) / 100);
        }
      }
      const res  = await fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error || 'Failed to update booking.'); setEditSaving(false); return; }
      setBookings(all => all.map(x => {
        if (x.id === editBooking.id) {
          return {
            ...x, ...editData,
            package: editData.packageId || x.package,
            size:    editData.sizeId    || x.size,
            ...(payload.total          !== undefined ? { total:          payload.total }          : {}),
            ...(payload.deposit        !== undefined ? { deposit:        payload.deposit }        : {}),
            ...(payload.remaining      !== undefined ? { remaining:      payload.remaining }      : {}),
            ...(payload.addonTotal     !== undefined ? { addonTotal:     payload.addonTotal }     : {}),
            ...(payload.addonsList     !== undefined ? { addonsList:     payload.addonsList }     : {}),
            ...(payload.pricePerVisit  !== undefined ? { pricePerVisit:  payload.pricePerVisit }  : {}),
            ...(payload.originalTotal  !== undefined ? { originalTotal:  payload.originalTotal }  : {}),
          };
        }
        if (editScope === 'all' && x.email === editBooking.email && x.cleanDate > editBooking.cleanDate && x.status === 'scheduled') {
          return {
            ...x,
            firstName: editData.firstName, lastName: editData.lastName,
            phone: editData.phone,
            mediaConsent: editData.mediaConsent,
            hasPets: editData.hasPets, petTypes: editData.petTypes,
            signatureTouch: editData.signatureTouch, signatureTouchNotes: editData.signatureTouchNotes,
            addr1: editData.addr1, postcode: editData.postcode,
            floor: editData.floor, parking: editData.parking, keys: editData.keys,
            notes: editData.notes, addons: editData.addons,
          };
        }
        return x;
      }));
      closeEdit();
    } catch { setEditErr('Something went wrong. Please try again.'); }
    setEditSaving(false);
  };

  return {
    // selection
    selected, setSelected, toggleSelect,
    // delete
    deleting, deleteProgress, completeErr, handleDelete, handleDeleteSelected,
    // lifecycle
    completing, handleComplete,
    cancelling, cancelErr, handleCancel,
    // payments
    markingDeposit, depositErr, generatingLink, depositLinks, linkErr, emailingLink, emailedLinks,
    handleGenerateLink, handleEmailDepositLink, handleMarkDepositPaid,
    // scheduling
    stoppingRecurring, stopRecurringErr, stoppedRecurring, handleStopRecurring,
    // staff assignment
    staffAssignPending, setStaffAssignPending, handleAssignStaff, handleConfirmAssignThis, handleConfirmAssignAll,
    secondCleanerPending, setSecondCleanerPending, handleAssignSecondCleaner, handleConfirmSecondCleanerThis, handleConfirmSecondCleanerAll,
    handleApplyCleanersToAll,
    // edit modal
    editBooking, editData, setEditData, editScope, setEditScope, editSaving, editErr,
    openEdit, closeEdit, handleEditSave,
  };
}
