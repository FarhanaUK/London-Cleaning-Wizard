import { useState } from 'react';
import { db, storage } from '../../../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const FONT  = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN   = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };

export default function StaffTab({ staff, bookings, setBookings, isMobile, C }) {
  const [staffSearch,          setStaffSearch]          = useState('');
  const [staffModal,           setStaffModal]           = useState(null);
  const [staffSaving,          setStaffSaving]          = useState(false);
  const [staffErr,             setStaffErr]             = useState('');
  const [staffView,            setStaffView]            = useState(null);
  const [staffHolidayConflicts, setStaffHolidayConflicts] = useState(null);

  const ordered  = [...staff].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const filtered = ordered.filter(s =>
    !staffSearch ||
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.role?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const move = async (i, dir) => {
    const next   = [...ordered];
    const target = i + dir;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    await Promise.all(next.map((s, idx) => updateDoc(doc(db, 'staff', s.id), { order: idx }).catch(() => {})));
  };

  const openAdd = () => {
    setStaffModal({ mode: 'add', data: { name: '', phone: '', email: '', employmentType: 'Subcontractor', role: 'Cleaner', hourlyRate: '', status: 'Active', joinDate: '', holidays: [] } });
    setStaffErr('');
  };

  const openEdit = s => {
    setStaffModal({ mode: 'edit', data: { ...s } });
    setStaffErr('');
  };

  const saveStaff = async () => {
    const d = staffModal.data;
    if (!d.name || !d.phone) { setStaffErr('Name and phone are required.'); return; }
    setStaffSaving(true); setStaffErr('');
    try {
      let photoURL = d.photoURL && !d._photoFile ? d.photoURL : '';
      if (d._photoFile) {
        const ext = d._photoFile.name.split('.').pop();
        const storageRef = ref(storage, `staff/${Date.now()}.${ext}`);
        await uploadBytes(storageRef, d._photoFile);
        photoURL = await getDownloadURL(storageRef);
      }
      if (staffModal.mode === 'add') {
        await addDoc(collection(db, 'staff'), { name: d.name, phone: d.phone, email: d.email || '', employmentType: d.employmentType || 'Subcontractor', role: d.role, hourlyRate: d.hourlyRate === 'N/A' ? 'N/A' : parseFloat(d.hourlyRate) || 0, status: d.status, photoURL, joinDate: d.joinDate || '', holidays: d.holidays || [], createdAt: new Date().toISOString() });
      } else {
        const { id, _photoFile, ...rest } = d;
        await updateDoc(doc(db, 'staff', id), { ...rest, hourlyRate: d.hourlyRate === 'N/A' ? 'N/A' : parseFloat(d.hourlyRate) || 0, photoURL });
        const newHolidays = new Set(d.holidays || []);
        const conflicts = bookings.filter(bk => bk.assignedStaff === d.name && newHolidays.has(bk.cleanDate) && bk.cleanDate >= new Date().toISOString().split('T')[0]);
        if (conflicts.length > 0) setStaffHolidayConflicts({ staffName: d.name, conflicts });
      }
      setStaffModal(null);
    } catch (e) { setStaffErr(e.message); }
    finally { setStaffSaving(false); }
  };

  const deleteStaff = async () => {
    if (!window.confirm(`Delete ${staffModal.data.name}? This cannot be undone.`)) return;
    setStaffSaving(true);
    try { await deleteDoc(doc(db, 'staff', staffModal.data.id)); setStaffModal(null); }
    catch (e) { setStaffErr(e.message); }
    finally { setStaffSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>Staff</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginTop: 2 }}>{staff.length} team member{staff.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search staff…" style={{ ...INPUT, marginBottom: 0, width: 180, fontSize: 13 }} />
          <button onClick={openAdd} style={{ ...BTN, background: C.accent, color: '#fff', fontSize: 13 }}>+ Add Staff</button>
        </div>
      </div>

      {staff.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 8, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: FONT, fontSize: 14, color: C.muted }}>No staff added yet. Click "Add Staff" to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setStaffView(s)}
              style={{ background: s.status === 'Inactive' ? '#fff5f5' : C.card, borderRadius: 8, padding: isMobile ? '14px 16px' : '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, cursor: 'pointer', borderLeft: s.status === 'Inactive' ? '3px solid #dc2626' : '3px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? C.faint : C.muted, fontSize: 12, padding: '1px 4px', lineHeight: 1 }}>▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === filtered.length - 1} style={{ background: 'none', border: 'none', cursor: i === filtered.length - 1 ? 'default' : 'pointer', color: i === filtered.length - 1 ? C.faint : C.muted, fontSize: 12, padding: '1px 4px', lineHeight: 1 }}>▼</button>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.photoURL ? <img src={s.photoURL} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>👤</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: s.status === 'Inactive' ? '#dc2626' : C.text }}>{s.name}</div>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: s.status === 'Active' ? '#dcfce7' : '#fee2e2', color: s.status === 'Active' ? '#166534' : '#dc2626' }}>{s.status}</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8' }}>{s.role}</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: (s.employmentType || 'Subcontractor') === 'Employee' ? '#fef3c7' : (s.employmentType === 'Self-Employed / Owner') ? '#dcfce7' : '#f3e8ff', color: (s.employmentType || 'Subcontractor') === 'Employee' ? '#92400e' : (s.employmentType === 'Self-Employed / Owner') ? '#166534' : '#6b21a8' }}>{s.employmentType || 'Subcontractor'}</span>
                    {(() => {
                      const yr   = new Date().getFullYear();
                      const days = (s.holidays || []).filter(d => d.startsWith(yr)).length;
                      return days > 0 ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#fef9c3', color: '#854d0e' }}>🏖 {days}d off {yr}</span> : null;
                    })()}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {s.phone    && <span>📞 {s.phone}</span>}
                    {s.email    && <span>✉️ {s.email}</span>}
                    <span>💷 {s.hourlyRate && s.hourlyRate !== 'N/A' ? `£${s.hourlyRate}/hr` : 'N/A'}</span>
                    {s.joinDate && <span>📅 Joined {s.joinDate.split('-').reverse().join('/')}</span>}
                  </div>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); openEdit(s); }} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}>Edit</button>
            </div>
          ))}
        </div>
      )}

      {/* Staff Profile View */}
      {staffView && (
        <div onClick={() => setStaffView(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 16, padding: isMobile ? '32px 24px' : '48px 40px', maxWidth: 400, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.25)', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setStaffView(null)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: C.bg, border: `3px solid ${C.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              {staffView.photoURL ? <img src={staffView.photoURL} alt={staffView.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 64 }}>👤</span>}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>{staffView.name}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 99, background: staffView.status === 'Active' ? '#dcfce7' : '#fee2e2', color: staffView.status === 'Active' ? '#166534' : '#dc2626' }}>{staffView.status}</span>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8' }}>{staffView.role}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', background: C.bg, borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              {[
                { label: 'Phone',       value: staffView.phone },
                { label: 'Email',       value: staffView.email },
                { label: 'Hourly Rate', value: staffView.hourlyRate && staffView.hourlyRate !== 'N/A' ? `£${staffView.hourlyRate}/hr` : 'N/A' },
                { label: 'Joined',      value: staffView.joinDate ? staffView.joinDate.split('-').reverse().join('/') : null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>{r.label}</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: C.text }}>{r.value}</span>
                </div>
              ))}
            </div>
            {(() => {
              const yr = new Date().getFullYear();
              const allDays   = staffView.holidays || [];
              const thisYear  = allDays.filter(d => d.startsWith(yr));
              const sorted    = [...thisYear].sort();
              const grouped   = [];
              let i = 0;
              while (i < sorted.length) {
                let j = i;
                while (j + 1 < sorted.length) {
                  const a = new Date(sorted[j] + 'T12:00:00');
                  const b = new Date(sorted[j+1] + 'T12:00:00');
                  if ((b - a) / 86400000 === 1) j++; else break;
                }
                grouped.push({ from: sorted[i], to: sorted[j] });
                i = j + 1;
              }
              return (
                <div style={{ textAlign: 'left', background: '#fef9c3', borderRadius: 10, padding: '14px 20px', marginBottom: 16 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#854d0e', marginBottom: 6 }}>
                    🏖 Days Off {yr} — {thisYear.length} day{thisYear.length !== 1 ? 's' : ''}
                  </div>
                  {grouped.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {grouped.map(({ from, to }) => (
                        <span key={from} style={{ fontFamily: FONT, fontSize: 12, background: '#fef08a', color: '#854d0e', borderRadius: 6, padding: '2px 8px' }}>
                          {from === to ? from.split('-').reverse().join('/') : `${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontFamily: FONT, fontSize: 12, color: '#a16207' }}>No days logged yet</div>
                  )}
                </div>
              );
            })()}
            <button onClick={() => { setStaffView(null); openEdit(staffView); }} style={{ ...BTN, background: C.accent, color: '#fff', width: '100%' }}>Edit Profile</button>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {staffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 10, padding: '28px 28px 24px', maxWidth: 480, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: C.text }}>{staffModal.mode === 'add' ? 'Add Staff' : 'Edit Staff'}</div>
              <button onClick={() => setStaffModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>

            {/* Photo upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.bg, border: `2px dashed ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {staffModal.data.photoURL ? <img src={staffModal.data.photoURL} alt="staff" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>👤</span>}
              </div>
              <div>
                <label style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12, cursor: 'pointer', display: 'inline-block' }}>
                  {staffModal.data.photoURL ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setStaffModal(m => ({ ...m, data: { ...m.data, photoURL: URL.createObjectURL(file), _photoFile: file } }));
                  }} />
                </label>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>Passport size · max 5MB</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Name *</div>
                <input value={staffModal.data.name} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="Full name" />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Phone *</div>
                <input value={staffModal.data.phone} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, phone: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="07xxx" />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Email</div>
                <input value={staffModal.data.email} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} placeholder="email@example.com" />
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Employment Type *</div>
                <select value={staffModal.data.employmentType || 'Subcontractor'} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, employmentType: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                  <option>Subcontractor</option>
                  <option>Employee</option>
                  <option>Self-Employed / Owner</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Role</div>
                <select value={staffModal.data.role} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, role: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                  <option>Cleaner</option>
                  <option>Senior Cleaner</option>
                  <option>Team Leader</option>
                  <option>Manager</option>
                  <option>Co-founder</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Hourly Rate (£)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type={staffModal.data.hourlyRate === 'N/A' ? 'text' : 'number'}
                    value={staffModal.data.hourlyRate === 'N/A' ? 'N/A' : staffModal.data.hourlyRate}
                    disabled={staffModal.data.hourlyRate === 'N/A'}
                    onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, hourlyRate: e.target.value } }))}
                    style={{ ...INPUT, marginBottom: 0, flex: 1, opacity: staffModal.data.hourlyRate === 'N/A' ? 0.5 : 1 }}
                    placeholder="15"
                  />
                  <label style={{ fontFamily: FONT, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <input type="checkbox" checked={staffModal.data.hourlyRate === 'N/A'} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, hourlyRate: e.target.checked ? 'N/A' : '' } }))} />
                    N/A
                  </label>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Status</div>
                <select value={staffModal.data.status} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, status: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 4 }}>Joined Company</div>
                <input type="date" value={staffModal.data.joinDate || ''} onChange={e => setStaffModal(m => ({ ...m, data: { ...m.data, joinDate: e.target.value } }))} style={{ ...INPUT, marginBottom: 0 }} />
              </div>
            </div>

            {/* Holidays */}
            {(() => {
              const yr = new Date().getFullYear();
              const daysThisYear = (staffModal.data.holidays || []).filter(d => d.startsWith(yr)).length;
              const addRange = (from, to) => {
                if (!from || !to || from > to) return;
                const days = [];
                const cur = new Date(from + 'T12:00:00');
                const end = new Date(to + 'T12:00:00');
                while (cur <= end) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
                const merged = [...new Set([...(staffModal.data.holidays || []), ...days])].sort();
                setStaffModal(m => ({ ...m, data: { ...m.data, holidays: merged } }));
              };
              const sorted  = [...(staffModal.data.holidays || [])].sort();
              const grouped = [];
              let i = 0;
              while (i < sorted.length) {
                let j = i;
                while (j + 1 < sorted.length) {
                  const a = new Date(sorted[j] + 'T12:00:00');
                  const b = new Date(sorted[j + 1] + 'T12:00:00');
                  if ((b - a) / 86400000 === 1) j++; else break;
                }
                grouped.push({ from: sorted[i], to: sorted[j] });
                i = j + 1;
              }
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, marginBottom: 8 }}>
                    Days Off · {yr} — {daysThisYear} day{daysThisYear !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 3 }}>From</div>
                      <input type="date" id="holidayFrom" style={{ ...INPUT, marginBottom: 0, fontSize: 12 }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginBottom: 3 }}>To</div>
                      <input type="date" id="holidayTo" style={{ ...INPUT, marginBottom: 0, fontSize: 12 }} />
                    </div>
                    <button type="button" onClick={() => {
                      const from = document.getElementById('holidayFrom').value;
                      const to   = document.getElementById('holidayTo').value || from;
                      addRange(from, to);
                      document.getElementById('holidayFrom').value = '';
                      document.getElementById('holidayTo').value   = '';
                    }} style={{ fontFamily: FONT, fontSize: 12, background: C.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', marginTop: 14 }}>Add</button>
                  </div>
                  {grouped.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {grouped.map(({ from, to }) => {
                        const label = from === to ? from.split('-').reverse().join('/') : `${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`;
                        const daysInRange = [];
                        const cur = new Date(from + 'T12:00:00');
                        const end = new Date(to + 'T12:00:00');
                        while (cur <= end) { daysInRange.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
                        return (
                          <span key={from} style={{ fontFamily: FONT, fontSize: 11, background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {label}
                            <button type="button" onClick={() => setStaffModal(m => ({ ...m, data: { ...m.data, holidays: (m.data.holidays || []).filter(x => !daysInRange.includes(x)) } }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#854d0e', fontSize: 12, lineHeight: 1, padding: 0 }}>✕</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {staffErr && <div style={{ fontFamily: FONT, fontSize: 12, color: C.danger, marginTop: 10 }}>{staffErr}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              {staffModal.mode === 'edit' ? (
                <button disabled={staffSaving} onClick={deleteStaff} style={{ fontFamily: FONT, fontSize: 12, color: C.danger, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
              ) : <div />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStaffModal(null)} style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>Cancel</button>
                <button disabled={staffSaving} onClick={saveStaff} style={{ ...BTN, background: C.accent, color: '#fff', opacity: staffSaving ? 0.6 : 1 }}>{staffSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Conflict Modal */}
      {staffHolidayConflicts && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: '28px 28px 24px', maxWidth: 500, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>⚠️ Holiday Conflict</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>
              <strong>{staffHolidayConflicts.staffName}</strong> is now on holiday on {staffHolidayConflicts.conflicts.length} upcoming booking{staffHolidayConflicts.conflicts.length !== 1 ? 's' : ''}. Reassign each one to a different cleaner:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staffHolidayConflicts.conflicts.map(bk => (
                <div key={bk.id} style={{ background: C.bg, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>{bk.customerName}</div>
                    <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{bk.cleanDate?.split('-').reverse().join('/')} · {bk.packageName || bk.package}</div>
                  </div>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      setBookings(prev => prev.map(x => x.id === bk.id ? { ...x, assignedStaff: val } : x));
                      fetch(import.meta.env.VITE_CF_UPDATE_BOOKING, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookingId: bk.id, assignedStaff: val }),
                      }).catch(() => {});
                      setStaffHolidayConflicts(prev => ({ ...prev, conflicts: prev.conflicts.filter(x => x.id !== bk.id) }));
                    }}
                    style={{ ...INPUT, marginBottom: 0, width: 'auto', minWidth: 160, fontSize: 13 }}
                  >
                    <option value="">— Reassign to… —</option>
                    {staff.filter(s => s.status === 'Active' && s.name !== staffHolidayConflicts.staffName && !(s.holidays || []).includes(bk.cleanDate)).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {staffHolidayConflicts.conflicts.length === 0 && (
              <div style={{ fontFamily: FONT, fontSize: 13, color: C.success, marginTop: 12 }}>✓ All bookings reassigned.</div>
            )}
            <button onClick={() => setStaffHolidayConflicts(null)} style={{ ...BTN, background: C.accent, color: '#fff', width: '100%', marginTop: 20 }}>
              {staffHolidayConflicts.conflicts.length === 0 ? 'Done' : 'Close (reassign later)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
