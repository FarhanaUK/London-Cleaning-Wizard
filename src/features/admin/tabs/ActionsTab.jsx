import { useState, useMemo, useEffect } from 'react';
import { db } from '../../../firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { readNotifications, clearNotification } from '../notifications';

const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const fmtDate = d => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Positive = dueDate is in the future. Negative = overdue.
const daysDiff = (dueDate, referenceDate) =>
  Math.round((new Date(dueDate + 'T00:00:00') - new Date(referenceDate + 'T00:00:00')) / 86400000);

const SNOOZE_KEY = 'lcw_snoozed_actions';
const getSnoozed = () => { try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}'); } catch { return {}; } };
const isItemSnoozed = (id, today) => { const s = getSnoozed(); return !!(s[id] && s[id] > today); };
const snoozeItem = (id, days, today) => {
  const s = getSnoozed();
  s[id] = addDays(today, days);
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(s));
};

export default function ActionsTab({ savedQuotes, leads, bookings, isMobile, C, onNavigate, onCountChange }) {
  const today = new Date().toISOString().slice(0, 10);

  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate,      setNewDate]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [snoozeBump,   setSnoozeBump]   = useState(0);
  const [notifBump,    setNotifBump]    = useState(0);

  const actions = useMemo(() => {
    const in7days  = addDays(today, 7);
    const in30days = addDays(today, 30);
    const items = [];

    // Quote follow-ups: overdue or due within 7 days
    (savedQuotes || [])
      .filter(sq => !['booked', 'lost'].includes(sq.status) && sq.followUpDate)
      .filter(sq => sq.followUpDate <= in7days)
      .filter(sq => !isItemSnoozed(sq.id, today))
      .forEach(sq => {
        const diff = daysDiff(sq.followUpDate, today);
        items.push({
          type: 'quote_followup',
          id: sq.id,
          name: sq.bizName || 'Unknown business',
          meta: [sq.frequencyLabel, sq.contractLabel].filter(Boolean).join(' · ') || 'Contract quote',
          dueDate: sq.followUpDate,
          overdue: diff < 0,
          diffDays: diff,
          data: sq,
        });
      });

    // Lead callbacks: overdue or due within 7 days
    (leads || [])
      .filter(l => l.status === 'callback' && l.callbackDate && l.callbackDate <= in7days)
      .filter(l => !isItemSnoozed('lead_' + l.id, today))
      .forEach(l => {
        const diff = daysDiff(l.callbackDate, today);
        items.push({
          type: 'lead_callback',
          id: 'lead_' + l.id,
          name: l.businessName || l.contactName || l.phone || 'Lead',
          meta: [l.contactName, l.area, l.phone].filter(Boolean).join(' · ') || 'Cold-call lead',
          dueDate: l.callbackDate,
          overdue: diff < 0,
          diffDays: diff,
          data: l,
        });
      });

    // Contract renewals: ending within 30 days
    (bookings || [])
      .filter(b => b.isContract && b.contractEndDate && !b.status?.startsWith('cancelled'))
      .filter(b => b.contractEndDate >= today && b.contractEndDate <= in30days)
      .filter(b => !isItemSnoozed('contract_' + b.id, today))
      .forEach(b => {
        const diff = daysDiff(b.contractEndDate, today);
        const mv = parseFloat(b.monthlyValue || 0);
        items.push({
          type: 'contract_renewal',
          id: 'contract_' + b.id,
          name: b.bizName || `${b.firstName || ''} ${b.lastName || ''}`.trim(),
          meta: [b.contractLabel, mv > 0 ? `£${mv.toFixed(0)}/month` : null].filter(Boolean).join(' · '),
          dueDate: b.contractEndDate,
          overdue: false,
          diffDays: diff,
          data: b,
        });
      });

    // Action-type bell notifications (contract renewals, incidents, staff cost, etc.)
    readNotifications().filter(n => n.type === 'action' || n.type === 'action_checkin' || n.type === 'outreach_due' || (n.link === 'actions' && n.type !== 'funnel_intel')).forEach(n => {
      items.push({
        type:     'bell_action',
        id:       n.id,
        name:     n.title,
        meta:     n.message,
        dueDate:  n.createdAt?.slice(0, 10) || today,
        overdue:  false,
        diffDays: 0,
        notifLink: n.link !== 'actions' ? n.link : null,
        notifTabKey: n.tabKey || null,
        data:     n,
      });
    });

    return items.sort((a, b) => a.diffDays - b.diffDays);
  }, [savedQuotes, leads, bookings, today, snoozeBump, notifBump]);

  useEffect(() => { onCountChange?.(actions.length); }, [actions.length, onCountChange]);

  const overdueCount = actions.filter(a => a.overdue).length;
  const thisWeekCount = actions.filter(a => !a.overdue && a.diffDays <= 7).length;
  const upcomingCount = actions.filter(a => !a.overdue && a.diffDays > 7).length;

  const dueDateLabel = item => {
    const d = Math.abs(item.diffDays);
    if (item.type === 'contract_renewal') {
      return `Ends in ${item.diffDays} day${item.diffDays !== 1 ? 's' : ''} — ${fmtDate(item.dueDate)}`;
    }
    if (item.overdue) return d === 0 ? 'Due today' : `${d} day${d !== 1 ? 's' : ''} overdue`;
    return item.diffDays === 0 ? 'Due today' : `Due in ${item.diffDays} day${item.diffDays !== 1 ? 's' : ''}`;
  };

  const urgencyColor = item => {
    if (item.overdue) return '#dc2626';
    if (item.diffDays <= 3) return '#d97706';
    if (item.diffDays <= 7) return '#ca8a04';
    return C.muted;
  };

  const handleSnooze = (id) => {
    snoozeItem(id, 7, today);
    setSnoozeBump(n => n + 1);
  };

  const handleDone = (id) => {
    clearNotification(id);
    setNotifBump(n => n + 1);
  };

  const handleReschedule = async (quoteId) => {
    if (!newDate) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'savedQuotes', quoteId), {
        followUpDate: newDate,
        updatedAt: new Date().toISOString(),
      });
    } catch {}
    setSaving(false);
    setRescheduleId(null);
    setNewDate('');
  };

  const handleMarkLost = async (quoteId) => {
    try {
      await updateDoc(doc(db, 'savedQuotes', quoteId), {
        status: 'lost',
        updatedAt: new Date().toISOString(),
      });
    } catch {}
  };

  const BTN = (bg, color, border) => ({
    fontFamily: FONT, fontSize: 11, fontWeight: 500, padding: '5px 11px',
    borderRadius: 5, cursor: 'pointer', border: `1px solid ${border || bg}`,
    background: bg, color,
  });

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Overdue',       value: overdueCount,  alert: overdueCount > 0,  alertColor: '#dc2626', alertBg: '#fef2f2' },
          { label: 'Due this week', value: thisWeekCount, alert: thisWeekCount > 0, alertColor: '#d97706', alertBg: '#fffbeb' },
          { label: 'Upcoming',      value: upcomingCount, alert: false },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 100, background: s.alert ? s.alertBg : C.card, border: `1px solid ${s.alert ? s.alertColor + '40' : C.border}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: s.alert ? s.alertColor : C.muted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: s.alert ? s.alertColor : C.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      {actions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: FONT, fontSize: 14, color: C.muted }}>
          Nothing needs attention right now. Quote follow-ups and contracts ending soon will appear here automatically.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actions.map(item => {
          const isQuote    = item.type === 'quote_followup';
          const isBellAction = item.type === 'bell_action';
          const isLead     = item.type === 'lead_callback';
          const borderCol  = item.overdue ? '#fca5a5' : item.diffDays <= 3 ? '#fde68a' : C.border;
          const bgCol      = item.overdue ? '#fff5f5' : C.card;
          const isRescheduling = rescheduleId === item.id;

          return (
            <div key={item.id} style={{ background: bgCol, border: `1px solid ${borderCol}`, borderRadius: 8, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: FONT, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.05em', textTransform: 'uppercase',
                      background: isQuote ? '#eff6ff' : isBellAction ? '#fef2f2' : isLead ? '#fffbeb' : '#fef3c7',
                      color: isQuote ? '#1d4ed8' : isBellAction ? '#dc2626' : isLead ? '#d97706' : '#92400e',
                    }}>
                      {isQuote ? 'Quote follow-up' : isBellAction ? 'Action needed' : isLead ? 'Lead callback' : 'Contract ending'}
                    </span>
                    {!isBellAction && (
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: urgencyColor(item) }}>
                        {dueDateLabel(item)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{item.meta}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0, marginTop: isMobile ? 8 : 0 }}>
                  {isQuote && (
                    <>
                      <button style={BTN(C.bg, C.text, C.border)} onClick={() => { setRescheduleId(isRescheduling ? null : item.id); setNewDate(''); }}>
                        {isRescheduling ? 'Cancel' : 'Set new date'}
                      </button>
                      <button style={BTN(C.bg, C.text, C.border)} onClick={() => onNavigate('quotes')}>
                        Go to Quotes
                      </button>
                      <button style={BTN('#fef2f2', '#dc2626', '#fca5a5')} onClick={() => handleMarkLost(item.id)}>
                        Mark lost
                      </button>
                    </>
                  )}
                  {!isQuote && !isBellAction && !isLead && (
                    <button style={BTN(C.bg, C.text, C.border)} onClick={() => onNavigate('bookings')}>
                      View contract
                    </button>
                  )}
                  {isLead && (
                    <>
                      {item.data?.phone && (
                        <a href={`tel:${item.data.phone}`} style={{ ...BTN('#f0fdf4', '#16a34a', '#86efac'), textDecoration: 'none' }}>📞 Call</a>
                      )}
                      <button style={BTN(C.bg, C.text, C.border)} onClick={() => onNavigate('leads')}>
                        Go to Leads
                      </button>
                    </>
                  )}
                  {isBellAction && (
                    <>
                      {item.notifLink && (
                        <button style={BTN(C.bg, C.text, C.border)} onClick={() => { if (item.notifTabKey) localStorage.setItem('expenseTab', item.notifTabKey); onNavigate(item.notifLink); }}>
                          Go to {item.notifLink}
                        </button>
                      )}
                      <button style={BTN('#f0fdf4', '#16a34a', '#86efac')} onClick={() => handleDone(item.id)}>
                        Mark done
                      </button>
                    </>
                  )}
                  {!isBellAction && (
                    <button style={BTN('transparent', C.muted, C.border)} onClick={() => handleSnooze(item.id)}>
                      Snooze 7 days
                    </button>
                  )}
                </div>
              </div>

              {/* Inline reschedule */}
              {isRescheduling && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={newDate}
                    min={today}
                    onChange={e => setNewDate(e.target.value)}
                    style={{ fontFamily: FONT, fontSize: 13, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 5, background: C.card, color: C.text, outline: 'none' }}
                  />
                  <button
                    onClick={() => handleReschedule(item.id)}
                    disabled={!newDate || saving}
                    style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 5, cursor: newDate && !saving ? 'pointer' : 'not-allowed', background: C.accent, color: '#fff', border: 'none', opacity: !newDate ? 0.5 : 1 }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
