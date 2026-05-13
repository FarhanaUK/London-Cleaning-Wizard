import { useState } from 'react';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
const fmtDeletedAt = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function TrashTab({ bookings, setBookings, isMobile, C }) {
  const [restoring,      setRestoring]      = useState(null);
  const [deleting,       setDeleting]       = useState(null);
  const [deletingAll,    setDeletingAll]    = useState(false);
  const [err,            setErr]            = useState('');

  const trashedBookings = bookings
    .filter(b => b.deleted)
    .sort((a, b) => {
      const aT = a.deletedAt?.toDate ? a.deletedAt.toDate() : new Date(a.deletedAt || 0);
      const bT = b.deletedAt?.toDate ? b.deletedAt.toDate() : new Date(b.deletedAt || 0);
      return bT - aT;
    });

  const handleRestore = async (booking) => {
    setErr('');
    setRestoring(booking.id);
    try {
      const res = await fetch(import.meta.env.VITE_CF_RESTORE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      if (!res.ok) { setErr('Failed to restore booking.'); return; }
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, deleted: false, deletedAt: null } : b));
    } catch { setErr('Failed to restore booking.'); }
    finally { setRestoring(null); }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(
      `Permanently delete all ${trashedBookings.length} booking${trashedBookings.length > 1 ? 's' : ''} in trash?\n\nThis CANNOT be undone.`
    )) return;
    setErr('');
    setDeletingAll(true);
    try {
      await Promise.all(trashedBookings.map(b =>
        fetch(import.meta.env.VITE_CF_DELETE_BOOKING, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: b.id }),
        })
      ));
      setBookings(prev => prev.filter(b => !b.deleted));
    } catch { setErr('Failed to delete all bookings.'); }
    finally { setDeletingAll(false); }
  };

  const handlePermanentDelete = async (booking) => {
    if (!window.confirm(
      `Permanently delete booking for ${booking.firstName} ${booking.lastName} on ${fmtDate(booking.cleanDate)}?\n\nThis CANNOT be undone.`
    )) return;
    setErr('');
    setDeleting(booking.id);
    try {
      const res = await fetch(import.meta.env.VITE_CF_DELETE_BOOKING, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      if (!res.ok) { setErr('Failed to permanently delete booking.'); return; }
      setBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch { setErr('Failed to permanently delete booking.'); }
    finally { setDeleting(null); }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>🗑 Trash</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted }}>
            {trashedBookings.length === 0
              ? 'Trash is empty.'
              : `${trashedBookings.length} deleted booking${trashedBookings.length > 1 ? 's' : ''}. Restore to bring them back, or permanently delete to remove from Firestore.`}
          </div>
        </div>
        {trashedBookings.length > 0 && (
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll || deleting !== null || restoring !== null}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', background: C.danger, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {deletingAll ? 'Deleting all…' : '✕ Delete all forever'}
          </button>
        )}
      </div>

      {err && (
        <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginBottom: 14, padding: '10px 14px', background: 'rgba(220,38,38,0.08)', borderRadius: 6 }}>
          {err}
        </div>
      )}

      {trashedBookings.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: FONT, fontSize: 32 }}>🗑</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trashedBookings.map(b => (
            <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.text }}>
                    {b.firstName} {b.lastName}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {fmtDate(b.cleanDate)} · {b.cleanTime} · {b.packageName}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>
                    {b.addr1}, {b.postcode}
                  </div>
                  {b.bookingRef && (
                    <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Ref: {b.bookingRef}
                    </div>
                  )}
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.danger, marginTop: 4 }}>
                    Deleted {fmtDeletedAt(b.deletedAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleRestore(b)}
                    disabled={restoring === b.id || deleting === b.id}
                    style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    {restoring === b.id ? 'Restoring…' : '↩ Restore'}
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(b)}
                    disabled={restoring === b.id || deleting === b.id}
                    style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '8px 16px', background: C.danger, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    {deleting === b.id ? 'Deleting…' : '✕ Delete forever'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
