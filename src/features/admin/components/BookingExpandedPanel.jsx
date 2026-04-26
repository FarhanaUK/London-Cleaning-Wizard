import { calcHours, toInputTime, fmtDuration } from '../utils';
import DoNotContactToggle from './DoNotContactToggle';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const FIELD_STYLE = C => ({ width: '100%', padding: '8px 12px', fontFamily: FONT, fontSize: 13, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, outline: 'none', boxSizing: 'border-box' });

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
  openEdit,
  completing, handleComplete,
  cancelling, handleCancel,
  deleting, handleDelete,
  markingDeposit, depositErr, handleMarkDepositPaid,
  generatingLink, depositLinks, linkErr, emailingLink, emailedLinks,
  handleGenerateLink, handleEmailDepositLink,
  stoppingRecurring, stoppedRecurring, handleStopRecurring,
  staffAssignPending, handleAssignStaff,
  completeErr, cancelErr, stopRecurringErr,
}) {
  const assignedMember = staff?.find(s => s.name === b.assignedStaff);
  const rate           = assignedMember?.hourlyRate !== 'N/A' ? parseFloat(assignedMember?.hourlyRate) : null;
  const hrs            = calcHours(b.actualStart || b.cleanTime, b.actualFinish);
  const earned         = rate !== null && hrs !== null ? hrs * rate : null;

  const saveField = (field, val) => {
    const prev = b[field];
    setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: val } : x));
    fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: b.id, [field]: val }),
    }).catch(() => setBookings(all => all.map(x => x.id === b.id ? { ...x, [field]: prev } : x)));
  };

  const saveDoNotContact = next => {
    setBookings(prev => prev.map(x => x.id === b.id ? { ...x, doNotContact: next } : x));
    fetch(import.meta.env.VITE_CF_SET_DO_NOT_CONTACT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: b.id, doNotContact: next }),
    }).catch(() => {});
  };

  const activeStaff    = staff?.filter(s => s.status === 'Active') || [];
  const onHoliday      = activeStaff.filter(s => (s.holidays || []).includes(b.cleanDate));
  const available      = activeStaff.filter(s => !(s.holidays || []).includes(b.cleanDate));

  const isManualDeposit = b.stripeDepositIntentId === 'manual';
  const isCancelled     = b.status?.startsWith('cancelled');

  return (
    <div style={{ padding: isMobile ? '0 14px 16px' : '0 18px 18px', borderTop: `1px solid ${C.border}` }}>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 16px', marginTop: 16, marginBottom: 16 }}>
        {[
          { l: 'Booked On',        v: fmtCreatedAt(b.createdAt) },
          { l: 'Booking Ref',      v: b.bookingRef },
          { l: 'Phone',            v: b.phone },
          { l: 'Email',            v: b.email },
          { l: 'Clean Date',       v: fmtDate(b.cleanDate) },
          { l: 'Clean Time',       v: b.cleanTime },
          { l: 'Property',         v: `${b.propertyType} · ${b.size}` },
          { l: 'Floor/Access',     v: b.floor || '—' },
          { l: 'Parking',          v: b.parking || '—' },
          { l: 'Keys',             v: b.keys || '—' },
          { l: 'Frequency',        v: b.frequency || 'one-off' },
          { l: 'Add-ons',          v: b.addons?.length ? b.addons.map(a => a.name).join(', ') : 'None' },
          { l: 'Pets',             v: b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No' },
          { l: 'Signature Touch',  v: b.signatureTouch === false ? `Opted out${b.signatureTouchNotes ? ` — ${b.signatureTouchNotes}` : ''}` : '✓ Opted in' },
          { l: 'Marketing Opt-in', v: b.marketingOptOut ? '✕ Opted out at booking' : '✓ Opted in at booking' },
          { l: 'Total',            v: `£${parseFloat(b.total).toFixed(2)}` },
          { l: 'Deposit paid',     v: b.status === 'pending_deposit' ? 'Pending' : `£${parseFloat(b.deposit).toFixed(2)}`, highlight: b.status === 'pending_deposit' },
          { l: 'Remaining',        v: `£${parseFloat(b.remaining).toFixed(2)}` },
          { l: 'Source',           v: b.source || '—' },
          b.stripeDepositIntentId   && { l: 'Stripe Deposit PI',   v: b.stripeDepositIntentId },
          b.stripeRemainingIntentId && { l: 'Stripe Remaining PI', v: b.stripeRemainingIntentId },
          b.stripeCustomerId        && { l: 'Stripe Customer ID',  v: b.stripeCustomerId },
        ].filter(Boolean).map((r, i) => (
          <div key={i}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: r.highlight ? '#fff' : C.text, ...(r.highlight ? { background: C.danger, display: 'inline-block', padding: '2px 8px', borderRadius: 4 } : {}) }}>{r.v}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {b.notes && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontFamily: FONT, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
          Notes: {b.notes}
        </div>
      )}

      {/* Hours worked */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 10 }}>Hours Worked</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[{ label: 'Actual Start', field: 'actualStart' }, { label: 'Actual Finish', field: 'actualFinish' }].map(({ label, field }) => (
            <div key={field}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 3 }}>{label}</div>
              <input type="time" value={toInputTime(b[field])} onChange={e => saveField(field, e.target.value)}
                style={{ ...FIELD_STYLE(C), marginBottom: 0, width: 120 }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {hrs !== null && <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>⏱ {fmtDuration(hrs)}</span>}
            {earned !== null && <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>£{earned.toFixed(2)}</span>}
            {b.assignedStaff && rate === null && <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>N/A rate</span>}
          </div>
        </div>
      </div>

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
              { l: 'Refund Amount',  v: b.refundAmount != null ? `£${b.refundAmount}` : '—' },
            ].filter(Boolean).map((r, i) => (
              <div key={i}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                <div style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Do Not Contact toggle */}
      <DoNotContactToggle
        value={b.doNotContact ?? b.marketingOptOut ?? false}
        onChange={saveDoNotContact}
      />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Edit */}
        <button onClick={() => openEdit(b)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
          ✏️ Edit
        </button>

        {/* Staff assign — holiday-aware */}
        {staff?.length > 0 && (
          <select
            value={b.assignedStaff || ''}
            onChange={e => handleAssignStaff(b, e.target.value)}
            style={{ fontFamily: FONT, fontSize: 12, padding: '7px 10px', background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}
          >
            <option value="">👤 Assign cleaner…</option>
            {available.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            {onHoliday.map(s => <option key={s.id} value={s.name} disabled>🏖 {s.name} (holiday)</option>)}
          </select>
        )}

        {/* Pending deposit actions */}
        {b.status === 'pending_deposit' && (
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
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '8px 16px', width: '100%', background: emailedLinks[b.id] ? '#6b7280' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: emailedLinks[b.id] ? 'default' : 'pointer', marginBottom: 8 }}>
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

        {/* Deposit paid — complete job */}
        {b.status === 'deposit_paid' && (
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
              style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {completing === b.id ? 'Charging…' : isManualDeposit ? `✓ Mark Complete — £${b.remaining} collected manually` : `✓ Complete Job — Charge £${b.remaining}`}
            </button>
          </>
        )}

        {/* Fully paid confirmation */}
        {b.status === 'fully_paid' && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ Job complete — full payment received
          </div>
        )}

        {/* Stop recurring */}
        {b.isAutoRecurring && !stoppedRecurring.has(b.id) && (
          <button onClick={() => handleStopRecurring(b)} disabled={stoppingRecurring === b.id}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.warning, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
            {stoppingRecurring === b.id ? 'Stopping…' : '⏹ Stop Recurring'}
          </button>
        )}

        {/* Cancel */}
        {!isCancelled && b.status !== 'fully_paid' && (
          <button onClick={() => handleCancel(b)} disabled={cancelling === b.id}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: '7px 14px', background: C.card, color: C.danger, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer' }}>
            {cancelling === b.id ? 'Cancelling…' : '✕ Cancel'}
          </button>
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
