import { useState } from 'react';
import { db } from '../../../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PACKAGES, FREQUENCIES } from '../../../data/siteData';
import { calculateTotal } from '../../../utils/pricing';

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
  const [staffAssignPending, setStaffAssignPending] = useState(null);
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
    if (!window.confirm(`Delete booking for ${booking.firstName} ${booking.lastName} on ${fmtDate(booking.cleanDate)}? This cannot be undone.`)) return;
    setDeleting(booking.id);
    try {
      const res  = await fetch(import.meta.env.VITE_CF_DELETE_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
      const data = await res.json();
      if (!res.ok) { setCompleteErr(data.error || 'Failed to delete booking.'); }
      else {
        setExpanded(prev => prev === booking.id ? null : prev);
        setSelected(prev => { const s = new Set(prev); s.delete(booking.id); return s; });
      }
    } catch { setCompleteErr('Failed to delete booking.'); }
    finally { setDeleting(null); }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.size} selected booking${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setCompleteErr('');
    const ids = [...selected];
    setDeleteProgress({ done: 0, total: ids.length });
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await fetch(import.meta.env.VITE_CF_DELETE_BOOKING, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: ids[i] }) });
        if (!res.ok) failed++;
      } catch { failed++; }
      setDeleteProgress({ done: i + 1, total: ids.length });
    }
    if (failed > 0) setCompleteErr(`${failed} booking${failed > 1 ? 's' : ''} could not be deleted.`);
    setSelected(new Set());
    setExpanded(null);
    setDeleteProgress(null);
  };

  const handleComplete = async (booking) => {
    setCompleting(booking.id); setCompleteErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_COMPLETE_JOB, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
      const data = await res.json();
      if (!res.ok) setCompleteErr(data.error || 'Failed to charge remaining balance.');
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
    if (!window.confirm(`Mark deposit of £${booking.deposit} as collected for ${booking.firstName} ${booking.lastName}?\n\nThis confirms you have received the deposit manually.`)) return;
    setMarkingDeposit(booking.id); setDepositErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_MARK_DEPOSIT_PAID, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) });
      const data = await res.json();
      if (!res.ok) setDepositErr(data.error || 'Failed to update booking.');
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
    if (booking.isAutoRecurring) {
      msg = hoursUntil >= 48
        ? `No charge — more than 48 hours notice given.`
        : `⚠️ Less than 48 hours notice — a late cancellation fee of £${(booking.total * 0.3).toFixed(2)} (30% of £${booking.total}) will be charged to the customer's saved card.`;
    } else if (booking.status === 'pending_deposit' || !booking.deposit) {
      msg = `No payment has been taken — booking will be cancelled with no refund required.`;
    } else {
      const refundPct = hoursUntil >= 48 ? 100 : 0;
      const refundAmt = (booking.deposit * refundPct / 100).toFixed(2);
      msg = refundPct === 100
        ? `Full refund of £${refundAmt} will be issued (more than 48hrs notice).`
        : `No refund will be issued (less than 48hrs notice).`;
    }
    if (!window.confirm(`Cancel this booking?\n\n${msg}\n\nThis cannot be undone.`)) return;
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

  const handleAssignStaff = (booking, staffName) => {
    if (!staffName) return;
    if (booking.isAutoRecurring) {
      setStaffAssignPending({ booking, staffName });
    } else {
      assignStaff({ booking, staffName, scope: 'single' });
    }
  };

  const assignStaff = ({ booking: b, staffName, scope }) => {
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const targets  = scope === 'all'
      ? bookings.filter(x => x.email === b.email && x.frequency === b.frequency && x.isAutoRecurring && x.cleanDate >= todayStr)
      : [b];
    setBookings(prev => prev.map(x => targets.find(t => t.id === x.id) ? { ...x, assignedStaff: staffName } : x));
    for (const t of targets) {
      fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: t.id, assignedStaff: staffName }),
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
      notes: b.notes || '',
    });
    setEditScope('this');
    setEditErr('');
  };

  const closeEdit = () => { setEditBooking(null); setEditData({}); setEditScope('this'); setEditErr(''); };

  const handleEditSave = async () => {
    setEditSaving(true); setEditErr('');
    try {
      const payload = { bookingId: editBooking.id, ...editData, updateCustomerProfile: editScope === 'all' };
      const pkg  = PACKAGES.find(p => p.id === editData.packageId);
      const size = pkg?.sizes?.find(s => s.id === editData.sizeId);
      if (size) {
        const freqObj = FREQUENCIES.find(f => f.id === editData.frequency) || { saving: 0 };
        const { subtotal } = calculateTotal({
          sizePrice: size.basePrice, propertyType: editBooking.propertyType,
          frequency: freqObj, addons: editData.addons || [],
          supplies: editBooking.supplies, suppliesFeeOverride: editBooking.suppliesFee,
        });
        payload.total     = subtotal;
        payload.remaining = Math.max(0, subtotal - (editBooking.deposit || 0));
      }
      const res  = await fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error || 'Failed to update booking.'); setEditSaving(false); return; }
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
    // edit modal
    editBooking, editData, setEditData, editScope, setEditScope, editSaving, editErr,
    openEdit, closeEdit, handleEditSave,
  };
}
