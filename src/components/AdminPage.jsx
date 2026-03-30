import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { todayUK } from '../utils/time';
import { Sparkle, WandIcon, LogoMark } from './Icons';

const INPUT = {
  width: '100%', padding: '10px 0',
  fontFamily: "'Jost',sans-serif", fontSize: 14,
  background: 'transparent', border: 'none',
  borderBottom: '1px solid rgba(200,184,154,0.4)',
  color: '#2c2420', outline: 'none', marginBottom: 20,
};

const BTN = {
  fontFamily: "'Jost',sans-serif", fontSize: 11,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  fontWeight: 500, padding: '10px 22px',
  background: '#2c2420', color: '#f5f0e8',
  border: 'none', cursor: 'pointer',
};

const STATUS_COLOURS = {
  deposit_paid:            { bg: '#fff8eb', color: '#7a5c00', label: 'Deposit Paid' },
  fully_paid:              { bg: '#f3faf6', color: '#1a5234', label: 'Fully Paid' },
  payment_failed:          { bg: '#fdf5f5', color: '#6b1010', label: 'Payment Failed' },
  cancelled_full_refund:   { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Full Refund' },
  cancelled_partial_refund:{ bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — Partial Refund' },
  cancelled_no_refund:     { bg: '#f5f5f5', color: '#5a5a5a', label: 'Cancelled — No Refund' },
};

export default function AdminPage() {
  const [user,         setUser]         = useState(null);
  const [bookings,     setBookings]     = useState([]);
  const [filter,       setFilter]       = useState('today');
  const [email,        setEmail]        = useState('');
  const [pass,         setPass]         = useState('');
  const [loginErr,     setLoginErr]     = useState('');
  const [completing,   setCompleting]   = useState(null); // bookingId being completed
  const [completeErr,  setCompleteErr]  = useState('');
  const [expanded,     setExpanded]     = useState(null); // expanded booking id

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return;
    const q = filter === 'today'
      ? query(collection(db, 'bookings'), where('cleanDate', '==', todayUK()), orderBy('cleanTime'))
      : query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user, filter]);

  const handleLogin = async () => {
    setLoginErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch {
      setLoginErr('Incorrect email or password.');
    }
  };

  const handleComplete = async (booking) => {
    setCompleting(booking.id);
    setCompleteErr('');
    try {
      const res  = await fetch(import.meta.env.VITE_CF_COMPLETE_JOB, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompleteErr(data.error || 'Failed to charge remaining balance.');
      }
    } catch {
      setCompleteErr('Something went wrong. Please try again.');
    } finally {
      setCompleting(null);
    }
  };

  // ── Login screen ──────────────────────────────────────────────
  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#FAF8F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '48px 36px', background: 'white', border: '1px solid rgba(200,184,154,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <LogoMark size={32} color="#c8b89a" />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: '#1a1410' }}>London Cleaning Wizard</div>
            <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8b7355' }}>Admin</div>
          </div>
        </div>

        <input
          type="email" value={email} placeholder="Email"
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={INPUT}
        />
        <input
          type="password" value={pass} placeholder="Password"
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={INPUT}
        />
        {loginErr && (
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#8b2020', marginBottom: 14 }}>
            {loginErr}
          </p>
        )}
        <button onClick={handleLogin} style={{ ...BTN, width: '100%', padding: '13px' }}>
          Sign In
        </button>
      </div>
    </div>
  );

  // ── Admin dashboard ───────────────────────────────────────────
  const todayBookings = bookings.filter(b => b.cleanDate === todayUK());
  const pendingTotal  = bookings.filter(b => b.status === 'deposit_paid').reduce((s, b) => s + (b.remaining || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F4' }}>

      {/* Header */}
      <div style={{ background: '#1a1410', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark size={28} color="#c8b89a" />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: '#f5f0e8' }}>
            London Cleaning Wizard <span style={{ color: '#c8b89a', fontSize: 12, letterSpacing: '0.1em' }}>· Admin</span>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{ ...BTN, background: 'transparent', color: 'rgba(200,184,154,0.5)', border: '1px solid rgba(200,184,154,0.2)', fontSize: 10 }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { label: "Today's Cleans", value: todayBookings.length },
            { label: 'Pending Balance', value: `£${pendingTotal}` },
            { label: 'Total Bookings', value: bookings.length },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)', padding: '16px 20px' }}>
              <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#1a1410' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ id: 'today', label: "Today's Cleans" }, { id: 'all', label: 'All Bookings' }].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                ...BTN,
                background: filter === f.id ? '#2c2420' : 'transparent',
                color: filter === f.id ? '#f5f0e8' : '#2c2420',
                border: '1px solid rgba(200,184,154,0.4)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {completeErr && (
          <div style={{ background: '#fdf5f5', borderLeft: '2px solid #8b2020', padding: '10px 14px', marginBottom: 16, fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#6b1010' }}>
            {completeErr}
          </div>
        )}

        {bookings.length === 0 && (
          <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#8b7355', fontStyle: 'italic' }}>
            No bookings found.
          </p>
        )}

        {/* Bookings list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map(b => {
            const sc     = STATUS_COLOURS[b.status] || { bg: '#f5f5f5', color: '#5a5a5a', label: b.status };
            const isOpen = expanded === b.id;
            return (
              <div key={b.id} style={{ background: 'white', border: '1px solid rgba(200,184,154,0.25)' }}>

                {/* Booking row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}
                >
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 400, color: '#1a1410', marginBottom: 2 }}>
                      {b.firstName} {b.lastName}
                    </div>
                    <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#6b5e56', fontWeight: 300 }}>
                      {b.packageName} · {b.size} · {b.cleanDate} at {b.cleanTime} · {b.addr1}, {b.postcode}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: '#c8b89a' }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(200,184,154,0.15)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 24px', marginTop: 16, marginBottom: 16 }}>
                      {[
                        { l: 'Booking Ref',  v: b.bookingRef },
                        { l: 'Phone',        v: b.phone },
                        { l: 'Email',        v: b.email },
                        { l: 'Property',     v: `${b.propertyType} · ${b.size}` },
                        { l: 'Floor/Access', v: b.floor || '—' },
                        { l: 'Parking',      v: b.parking || '—' },
                        { l: 'Keys',         v: b.keys || '—' },
                        { l: 'Frequency',    v: b.frequency || 'one-off' },
                        { l: 'Add-ons',      v: b.addons?.length ? b.addons.map(a => a.name).join(', ') : 'None' },
                        { l: 'Total',        v: `£${b.total}` },
                        { l: 'Deposit paid', v: `£${b.deposit}` },
                        { l: 'Remaining',    v: `£${b.remaining}` },
                      ].map((r, i) => (
                        <div key={i}>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b7355', marginBottom: 2 }}>{r.l}</div>
                          <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 13, color: '#2c2420', fontWeight: 300 }}>{r.v}</div>
                        </div>
                      ))}
                    </div>

                    {b.notes && (
                      <div style={{ background: '#faf9f7', padding: '10px 14px', marginBottom: 14, fontFamily: "'Jost',sans-serif", fontSize: 12, color: '#5a4e44', fontWeight: 300, fontStyle: 'italic' }}>
                        Notes: {b.notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {b.status === 'deposit_paid' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{
                            ...BTN,
                            background: completing === b.id ? '#8b7355' : '#2d6a4f',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <Sparkle size={8} color="#f5f0e8" />
                          {completing === b.id ? 'Charging...' : `Mark as Complete — Charge £${b.remaining}`}
                        </button>
                      )}
                      {b.status === 'fully_paid' && (
                        <div style={{ fontFamily: "'Jost',sans-serif", fontSize: 11, color: '#2d6a4f', display: 'flex', alignItems: 'center', gap: 6 }}>
                          ✓ Job complete — full payment received
                        </div>
                      )}
                      {b.status === 'payment_failed' && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={completing === b.id}
                          style={{ ...BTN, background: '#8b2020', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {completing === b.id ? 'Retrying...' : `Retry Payment — £${b.remaining}`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}