import { useState } from 'react';
import { db } from '../../../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const FONT = "'Inter', 'Segoe UI', sans-serif";
const INPUT = { fontFamily: FONT, fontSize: 14, padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 12 };
const BTN   = { fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };

export default function StaffTab({ staff, isMobile, C, onAddStaff, onEditStaff, onViewStaff }) {
  const [staffSearch, setStaffSearch] = useState('');

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>Staff</div>
          <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginTop: 2 }}>{staff.length} team member{staff.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={staffSearch}
            onChange={e => setStaffSearch(e.target.value)}
            placeholder="Search staff…"
            style={{ ...INPUT, marginBottom: 0, width: 180, fontSize: 13 }}
          />
          <button onClick={() => onAddStaff()} style={{ ...BTN, background: C.accent, color: '#fff', fontSize: 13 }}>+ Add Staff</button>
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
              onClick={() => onViewStaff(s)}
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
                  {s.photoURL
                    ? <img src={s.photoURL} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 22 }}>👤</span>}
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
                      return days > 0
                        ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#fef9c3', color: '#854d0e' }}>🏖 {days}d off {yr}</span>
                        : null;
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
              <button
                onClick={e => { e.stopPropagation(); onEditStaff(s); }}
                style={{ ...BTN, background: C.bg, color: C.text, border: `1px solid ${C.border}`, fontSize: 12 }}
              >Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
