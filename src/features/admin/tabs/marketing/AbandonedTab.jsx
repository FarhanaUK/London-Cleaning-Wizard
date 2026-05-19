import { useMemo, useState, useCallback } from 'react';
import { FONT, statCard } from './shared.jsx';
import { db } from '../../../../firebase/firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';

const STEP_NAMES = ['', 'Landing', 'Service', 'Property', 'Schedule', 'Checkout'];

const FIELD_NAMES = {
  firstName: 'First name', lastName: 'Last name',
  email: 'Email', phone: 'Phone', addr1: 'Address',
  floor: 'Floor / access notes', parking: 'Parking selected',
  keys: 'Key instructions', notes: 'Preferences & notes',
  petTypes: 'Pet description',
  card_number: 'Card number', card_expiry: 'Card expiry', card_cvc: 'CVC',
};

function fmtEvent(e) {
  const chg = e.from != null;
  switch (e.type) {
    case 'service_category':    return { text: `Category: ${{ signature: 'Home Cleaning Packages', hourly: 'Hourly Cleaning', commercial: 'Commercial Cleaning' }[e.category] || e.category}` };
    case 'tab_switched':        return { text: `Browsed ${e.tab} tab` };
    case 'pkg_selected':        return { text: `Package: ${e.pkg}`, from: chg ? e.from : null };
    case 'pkg_detail_expanded': return { text: `Expanded details: ${e.pkg}`, dim: true };
    case 'section_expanded':    return { text: `Expanded section: ${e.section}`, dim: true };
    case 'duration_selected':   return { text: `Duration: ${e.hours}`, from: chg ? e.from : null };
    case 'commercial_service':  return { text: `Commercial: ${e.service}`, from: chg ? e.from : null };
    case 'notes_started':       return { text: 'Started typing special notes', dim: true };
    case 'property_type':       return { text: `Property: ${e.type}`, from: chg ? e.from : null };
    case 'size_selected':       return { text: `Size: ${e.size}`, from: chg ? e.from : null };
    case 'freq_selected':       return { text: `Frequency: ${e.freq}`, from: chg ? e.from : null };
    case 'date_selected':       return { text: `Date selected${e.changed ? ' (changed)' : ''}` };
    case 'time_selected':       return { text: `Time: ${e.time}`, from: chg ? e.from : null };
    case 'field_filled':        return { text: e.field === 'postcode' ? `Postcode area: ${e.postcode_outward}` : `Filled: ${FIELD_NAMES[e.field] || e.field}`, dim: true };
    case 'field_cleared':       return { text: `Removed: ${FIELD_NAMES[e.field] || e.field}`, dim: true };
    case 'bathrooms':           return { text: `Bathrooms: ${e.count}`, from: e.from != null ? String(e.from) : null };
    case 'has_pets':            return { text: `Pets: ${e.hasPets ? 'Yes' : 'No'}`, from: e.from != null ? (e.from ? 'Yes' : 'No') : null };
    case 'mop_ack':             return { text: `Mop acknowledgement: ${e.checked ? 'Checked' : 'Unchecked'}` };
    case 'signature_touch':     return { text: `Signature touch: ${e.enabled ? 'Enabled' : 'Disabled'}` };
    case 'addon_toggled':       return { text: `Add-on "${e.addon}": ${e.checked ? 'added' : 'removed'}` };
    case 'policy_checked':      return { text: `T&Cs: ${e.checked ? 'Accepted' : 'Unchecked'}` };
    case 'media_consent':       return { text: `Media consent: ${e.checked ? 'Yes' : 'No'}` };
    case 'marketing_opt_out':   return { text: `Marketing: ${e.opted_out ? 'Opted out' : 'Opted in'}` };
    case 'signature_touch_reason': return { text: `Opted out reason: ${e.reason}`, dim: true };
    case 'payment_attempted':   return { text: 'Payment attempted', green: true };
    default:                    return { text: e.type };
  }
}

function getVisits(events) {
  const visits = [];
  let current = null;
  const sorted = [...(events || [])].sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  for (const e of sorted) {
    if (e.type === 'step_entered') {
      current = { step: e.step, direction: e.direction || 'forward', events: [], timeSpent: null };
      visits.push(current);
    } else if (e.type === 'step_left') {
      if (current) current.timeSpent = e.timeSpent;
    } else if (current) {
      current.events.push(e);
    }
  }
  return visits;
}

function SessionDetail({ session, C }) {
  const visits = getVisits(session.events);
  if (!visits.length) return (
    <div style={{ padding: '12px 16px', fontFamily: FONT, fontSize: 12, color: C.muted }}>No event detail stored for this session.</div>
  );
  return (
    <div style={{ borderTop: `2px solid rgba(100,116,139,0.15)`, background: C.bg, padding: '14px 16px 10px' }}>
      {visits.map((visit, vi) => {
        const isLast    = vi === visits.length - 1;
        const isDropped = !session.converted && isLast;
        const isBack    = visit.direction === 'back';
        const dotColor  = isDropped ? '#dc2626' : session.converted && isLast ? '#16a34a' : isBack ? '#f59e0b' : '#94a3b8';
        return (
          <div key={vi} style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 10 }}>
            {/* Spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 3, flexShrink: 0 }} />
              {!isLast && <div style={{ flex: 1, width: 1, background: 'rgba(148,163,184,0.25)', marginTop: 3 }} />}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: visit.events.length ? 5 : 0, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                  Step {visit.step} — {STEP_NAMES[visit.step]}
                </span>
                {isBack && (
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: '#92400e', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '0 6px' }}>went back</span>
                )}
                {visit.timeSpent != null && (
                  <span style={{ fontFamily: FONT, fontSize: 10, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0 6px' }}>{visit.timeSpent}s</span>
                )}
                {isDropped && (
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0 7px' }}>dropped here</span>
                )}
                {session.converted && isLast && (
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0 7px' }}>booked</span>
                )}
              </div>
              {visit.events.length === 0 ? (
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>Visited — no selections made</div>
              ) : visit.events.map((e, i) => {
                const { text, from, green, dim } = fmtEvent(e);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                    <span style={{ color: '#94a3b8', fontSize: 10, flexShrink: 0 }}>·</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: green ? '#16a34a' : dim ? C.muted : C.text, fontWeight: green ? 600 : 400 }}>{text}</span>
                    {from && (
                      <span style={{ fontFamily: FONT, fontSize: 11, color: '#92400e', background: '#fef9c3', borderRadius: 3, padding: '0 5px', flexShrink: 0 }}>was {from}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const FREQ_LABELS = {
  'one-off':   'One-off',
  weekly:      'Weekly',
  fortnightly: 'Fortnightly',
  monthly:     'Monthly',
};

function monthlyValue(total, frequency) {
  if (!total || !frequency || frequency === 'one-off') return null;
  if (frequency === 'weekly')     return total * 4;
  if (frequency === 'fortnightly') return total * 2;
  if (frequency === 'monthly')    return total;
  return null;
}

export default function AbandonedTab({ abandonmentStats, funnelData = [], bookings, C }) {
  const [selected, setSelected] = useState(new Set());
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekN = (() => {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return Math.ceil((day + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
  })();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Exclude customers who completed booking on their own (no email sent, already converted) — those are normal bookings, not abandonment cases
  const isAbandonment = s => !(s.converted && !s.emailSent);
  const todayStats = abandonmentStats.filter(s => s.date === today && isAbandonment(s));
  const weekStats  = abandonmentStats.filter(s => s.week === weekN && s.year === year && isAbandonment(s));
  const monthStats = abandonmentStats.filter(s => s.month === month && s.year === year && isAbandonment(s));
  const yearStats  = abandonmentStats.filter(s => s.year === year && isAbandonment(s));

  // Build a lookup: piId → booking, to know if balance has been collected
  const bookingByPiId = useMemo(() => {
    const map = {};
    (bookings || []).forEach(b => {
      if (b.stripeDepositIntentId) map[b.stripeDepositIntentId] = b;
    });
    return map;
  }, [bookings]);

  const getRecovered = (stat) => {
    if (!stat.converted) return 0;
    const bk = bookingByPiId[stat.piId];
    if (bk && bk.status === 'completed') return stat.totalAmount || stat.depositAmount || 0;
    return stat.depositAmount || 0;
  };

  const getLost = (stat) => stat.totalAmount || stat.depositAmount || 0;

  const pct = (arr) => {
    const emailed = arr.filter(s => s.emailSent).length;
    if (!emailed) return '—';
    const conv = arr.filter(s => s.emailSent && s.converted).length;
    return `${Math.round((conv / emailed) * 100)}% converted`;
  };

  const emailPct = (arr) => {
    const total = arr.length;
    if (!total) return null;
    const sent = arr.filter(s => s.emailSent).length;
    return `${sent} email${sent !== 1 ? 's' : ''} sent`;
  };

  const totalLost      = yearStats.filter(s => s.emailSent && !s.converted).reduce((sum, s) => sum + getLost(s), 0);
  const totalRecovered = yearStats.filter(s => s.emailSent && s.converted).reduce((sum, s) => sum + getRecovered(s), 0);

  // Package breakdown
  const pkgCounts = useMemo(() => {
    const map = {};
    yearStats.forEach(s => {
      const key = s.packageName || 'Unknown';
      if (!map[key]) map[key] = { total: 0, converted: 0 };
      map[key].total++;
      if (s.emailSent && s.converted) map[key].converted++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [yearStats]);

  const [showSessions,    setShowSessions]    = useState(false);
  const [deletingAll,     setDeletingAll]     = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [eventsView,      setEventsView]      = useState('day');
  const [eventsDay,       setEventsDay]       = useState(today);
  const [eventsMonthView, setEventsMonthView] = useState({ month, year });
  const [eventsYearView,  setEventsYearView]  = useState(year);

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const deleteSessions = async (ids) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(db, 'bookingFunnel', id)));
    await batch.commit();
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${funnelMonth.length} funnel sessions for ${eventsLabel}?`)) return;
    setDeletingAll(true);
    await deleteSessions(funnelMonth.map(s => s.id)).catch(() => {});
    setDeletingAll(false);
  };

  // Funnel — per session, only count the highest step reached; exclude converted
  const funnelMonth = useMemo(() => {
    if (eventsView === 'day')   return funnelData.filter(s => s.date === eventsDay);
    if (eventsView === 'month') return funnelData.filter(s => s.month === eventsMonthView.month && s.year === eventsMonthView.year);
    return funnelData.filter(s => s.year === eventsYearView);
  }, [funnelData, eventsView, eventsDay, eventsMonthView, eventsYearView]);
  const STEP_LABELS = ['', 'Landing', 'Service', 'Property', 'Schedule', 'Checkout'];
  const funnelRows = useMemo(() => {
    const total = funnelMonth.length;
    if (!total) return [];
    return [1, 2, 3, 4, 5].map(s => {
      const reached    = funnelMonth.filter(d => d.maxStep >= s).length;
      const abandoned  = funnelMonth.filter(d => d.maxStep === s && !d.converted).length;
      const pctReached = Math.round((reached / total) * 100);
      const pctDrop    = reached > 0 ? Math.round((abandoned / reached) * 100) : 0;
      return { step: s, label: STEP_LABELS[s], reached, abandoned, pctReached, pctDrop };
    });
  }, [funnelMonth]);
  const funnelConverted = funnelMonth.filter(d => d.converted).length;

  const availableYears = useMemo(() => {
    const yrs = new Set([year]);
    abandonmentStats.forEach(s => { if (s.year) yrs.add(s.year); });
    funnelData.forEach(s => { if (s.year) yrs.add(s.year); });
    return [...yrs].sort();
  }, [abandonmentStats, funnelData, year]);

  const viewStats = useMemo(() => {
    const base = abandonmentStats.filter(isAbandonment);
    if (eventsView === 'day')   return base.filter(s => s.date === eventsDay);
    if (eventsView === 'month') return base.filter(s => s.month === eventsMonthView.month && s.year === eventsMonthView.year);
    return base.filter(s => s.year === eventsYearView);
  }, [abandonmentStats, eventsView, eventsDay, eventsMonthView, eventsYearView]);

  const eventsLabel = eventsView === 'day'
    ? new Date(eventsDay + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : eventsView === 'month'
    ? `${MONTH_NAMES[eventsMonthView.month - 1]} ${eventsMonthView.year}`
    : String(eventsYearView);

  const exportPDF = useCallback(() => {
    const sorted = [...funnelMonth].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

    let sessionsHTML = '';
    sorted.forEach((s, si) => {
      const visits  = getVisits(s.events);
      const dateStr = s.date ? new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown date';
      const statusHTML = s.converted
        ? '<span style="color:#16a34a;font-weight:700">Booked</span>'
        : '<span style="color:#dc2626;font-weight:700">Dropped</span>';

      let visitsHTML = '';
      if (!visits.length) {
        visitsHTML = '<p style="color:#94a3b8;font-size:12px;margin:0">No event data stored.</p>';
      } else {
        visits.forEach((visit, vi) => {
          const isLast    = vi === visits.length - 1;
          const isDropped = !s.converted && isLast;
          const isBooked  = s.converted && isLast;
          const isBack    = visit.direction === 'back';
          const dotColor  = isDropped ? '#dc2626' : isBooked ? '#16a34a' : isBack ? '#f59e0b' : '#94a3b8';

          const badges = [
            isBack    ? '<span style="background:#fef9c3;color:#92400e;font-size:10px;font-weight:600;padding:1px 7px;border-radius:10px">went back</span>' : '',
            visit.timeSpent != null ? `<span style="background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;font-size:10px;padding:1px 7px;border-radius:10px">${visit.timeSpent}s</span>` : '',
            isDropped ? '<span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px">dropped here</span>' : '',
            isBooked  ? '<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px">booked</span>' : '',
          ].join(' ');

          let eventsHTML = '';
          if (visit.events.length === 0) {
            eventsHTML = '<p style="color:#94a3b8;font-size:12px;margin:3px 0 0">Visited — no selections made</p>';
          } else {
            visit.events.forEach(e => {
              const { text, from, green, dim } = fmtEvent(e);
              const color   = green ? '#16a34a' : dim ? '#64748b' : '#0f172a';
              const weight  = green ? '600' : '400';
              const fromTag = from ? `<span style="font-size:11px;color:#92400e;background:#fef9c3;padding:0 5px;border-radius:3px;margin-left:4px">was ${from}</span>` : '';
              eventsHTML += `<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:3px"><span style="color:#94a3b8;font-size:10px;flex-shrink:0">·</span><span style="font-size:12px;color:${color};font-weight:${weight}">${text}</span>${fromTag}</div>`;
            });
          }

          const lineHTML = !isLast ? '<div style="flex:1;width:1px;background:#e2e8f0;margin-top:3px;min-height:14px"></div>' : '';
          visitsHTML += `
            <div style="display:flex;gap:12px;margin-bottom:10px">
              <div style="display:flex;flex-direction:column;align-items:center;width:16px;flex-shrink:0">
                <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};margin-top:5px;flex-shrink:0"></div>
                ${lineHTML}
              </div>
              <div style="flex:1;padding-bottom:${isLast ? '0' : '4px'}">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap">
                  <span style="font-weight:700;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.04em">Step ${visit.step} — ${STEP_NAMES[visit.step] || ''}</span>
                  ${badges}
                </div>
                ${eventsHTML}
              </div>
            </div>`;
        });
      }

      sessionsHTML += `
        <div style="margin-bottom:28px;${si > 0 ? 'border-top:1px solid #f1f5f9;padding-top:24px' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8fafc;border-left:3px solid #2563eb;margin-bottom:14px;font-size:12px">
            <div><span style="font-weight:600">${dateStr}</span> <span style="color:#94a3b8;font-family:monospace">${s.id}</span></div>
            <div>${statusHTML}</div>
          </div>
          ${visitsHTML}
        </div>`;
    });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Booking Funnel — ${eventsLabel}</title>
<style>body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:13px;color:#0f172a;margin:0;padding:28px}@media print{.session{page-break-inside:avoid}}</style>
</head><body>
<div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:4px">Booking Funnel Sessions</div>
<div style="font-size:12px;color:#64748b;margin-bottom:28px">${eventsLabel} · ${sorted.length} session${sorted.length !== 1 ? 's' : ''}</div>
${sessionsHTML}
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }, [funnelMonth, eventsLabel]);

  return (
    <>
      {/* Shared Day / Month / Year control */}
      {(() => {
        const BTN_Y = (active) => ({ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 6, border: `1px solid ${C.border}`, background: active ? C.text : C.card, color: active ? C.bg : C.text, cursor: 'pointer' });
        const BTN_M = (active) => ({ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '7px 4px', borderRadius: 6, border: `1px solid ${active ? C.text : C.border}`, background: active ? C.text : C.card, color: active ? C.bg : C.text, cursor: 'pointer' });
        const dayYear  = eventsDay.slice(0, 4);
        const dayMonth = parseInt(eventsDay.slice(5, 7));
        const daysInMonth = new Date(parseInt(dayYear), dayMonth, 0).getDate();
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12, width: 'fit-content' }}>
              {[['day','Day'],['month','Month'],['year','Year']].map(([v, l]) => (
                <button key={v} onClick={() => { setEventsView(v); setSelected(new Set()); }} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: '5px 14px', border: 'none', borderRight: v !== 'year' ? `1px solid ${C.border}` : 'none', background: eventsView === v ? C.accent : 'transparent', color: eventsView === v ? '#fff' : C.muted, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>

            {eventsView === 'year' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {availableYears.map(y => <button key={y} onClick={() => { setEventsYearView(y); setSelected(new Set()); }} style={BTN_Y(eventsYearView === y)}>{y}</button>)}
              </div>
            )}

            {eventsView === 'month' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {availableYears.map(y => <button key={y} onClick={() => { setEventsMonthView(p => ({ ...p, year: y })); setSelected(new Set()); }} style={BTN_Y(eventsMonthView.year === y)}>{y}</button>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, maxWidth: 360 }}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((name, i) => (
                    <button key={i} onClick={() => { setEventsMonthView(p => ({ ...p, month: i+1 })); setSelected(new Set()); }} style={BTN_M(eventsMonthView.month === i+1)}>{name}</button>
                  ))}
                </div>
              </>
            )}

            {eventsView === 'day' && (
              <input type="date" value={eventsDay} max={today} onChange={e => { if (e.target.value) { setEventsDay(e.target.value); setSelected(new Set()); } }} style={{ fontFamily: FONT, fontSize: 13, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer' }} />
            )}
          </div>
        );
      })()}

      {/* Booking Funnel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>Booking funnel — {eventsLabel}</div>
        {funnelMonth.length > 0 && (
          <button onClick={exportPDF} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 5, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: 'pointer' }}>
            ↓ Download PDF
          </button>
        )}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 14 }}>Each session counted once at the furthest step reached. Abandoned = left at that step without going further.</div>
      {funnelRows.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px 20px', fontFamily: FONT, fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 24 }}>
          No funnel data yet this month. Data will appear as visitors use the booking page.
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
          {funnelRows.map((row, i) => (
            <div key={row.step} style={{ padding: '14px 18px', borderBottom: i < funnelRows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accent, background: `${C.accent}22`, borderRadius: 4, padding: '2px 7px' }}>Step {row.step}</span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>{row.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{row.reached} reached</span>
                  {row.abandoned > 0 && (
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', borderRadius: 4, padding: '2px 8px' }}>
                      {row.abandoned} dropped ({row.pctDrop}%)
                    </span>
                  )}
                </div>
              </div>
              <div style={{ background: C.bg, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${row.pctReached}%`, background: row.pctReached > 60 ? '#16a34a' : row.pctReached > 30 ? C.accent : '#dc2626', borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginTop: 4 }}>{row.pctReached}% of all sessions reached this step</div>
            </div>
          ))}
          <div style={{ padding: '14px 18px', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 4, padding: '2px 7px' }}>Completed</span>
              <span style={{ fontFamily: FONT, fontSize: 13, color: C.text, fontWeight: 500 }}>Booking confirmed</span>
            </div>
            <span style={{ fontFamily: FONT, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              {funnelConverted} booked ({funnelMonth.length > 0 ? Math.round((funnelConverted / funnelMonth.length) * 100) : 0}% overall)
            </span>
          </div>
        </div>
      )}

      {/* Session log */}
      {funnelMonth.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => setShowSessions(s => !s)} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: 12, color: C.muted, cursor: 'pointer', padding: 0 }}>
              {showSessions ? '▲' : '▼'} {showSessions ? 'Hide' : 'Show'} session log ({funnelMonth.length} sessions)
            </button>
            <button onClick={handleDeleteAll} disabled={deletingAll} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, fontFamily: FONT, fontSize: 11, color: '#dc2626', cursor: 'pointer', padding: '4px 12px' }}>
              {deletingAll ? 'Deleting…' : `Clear all (${eventsLabel})`}
            </button>
          </div>
          {showSessions && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', maxHeight: 1200, overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 60px 32px' }}>
                {['Date', 'Last Step', 'Status', 'Time', ''].map((h, i) => (
                  <div key={i} style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {[...funnelMonth].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).map((s, i) => {
                const isExpanded = expandedSession === s.id;
                const stepLabel  = s.converted ? 'Completed' : STEP_NAMES[s.maxStep] || `Step ${s.maxStep}`;
                const ts   = s.updatedAt?.toDate ? s.updatedAt.toDate() : null;
                const time = ts ? ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
                const rowBg = i % 2 === 0 ? C.card : C.bg;
                return (
                  <div key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 60px 32px', cursor: 'pointer', background: rowBg, borderLeft: isExpanded ? `3px solid ${C.accent}` : '3px solid transparent' }}
                      onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    >
                      <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {s.date ? new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        <span style={{ fontSize: 9, color: C.muted }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '8px 12px' }}>{stepLabel}</div>
                      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: s.converted ? '#dcfce7' : '#fef2f2', color: s.converted ? '#16a34a' : '#dc2626' }}>
                          {s.converted ? 'Booked' : 'Dropped'}
                        </span>
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, padding: '8px 12px' }}>{time}</div>
                      <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); deleteSessions([s.id]); }} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: 2 }}>×</button>
                      </div>
                    </div>
                    {isExpanded && <SessionDetail session={s} C={C} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Volume cards */}
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>Abandonment events — how many customers started a booking but didn't complete payment</div>
      <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginBottom: 14 }}>Conversion rate = % of emailed customers who then booked</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {statCard('Today',      todayStats.length,  pct(todayStats),  C)}
        {statCard('This Week',  weekStats.length,   pct(weekStats),   C)}
        {statCard('This Month', monthStats.length,  pct(monthStats),  C)}
        {statCard('This Year',  yearStats.length,   pct(yearStats),   C)}
      </div>

      {/* Value cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Value lost this year</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#dc2626' }}>£{totalLost.toFixed(2)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{yearStats.filter(s => s.emailSent && !s.converted).length} emailed, not converted</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Recovered this year</div>
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: '#16a34a' }}>£{totalRecovered.toFixed(2)}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 4 }}>{yearStats.filter(s => s.emailSent && s.converted).length} email → booked · amount paid</div>
        </div>
      </div>

      {/* Package breakdown */}
      {pkgCounts.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.text }}>Abandonments by package — {year}</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {pkgCounts.map(([pkg, { total, converted }], i) => (
              <div key={pkg} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: i < pkgCounts.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: C.text }}>{pkg}</div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted }}>{converted} recovered</div>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.accent }}>{total} total</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: C.text }}>Abandonment Events — {eventsLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>{viewStats.length} total · {emailPct(viewStats)}</span>
            {selected.size > 0 && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete ${selected.size} selected event${selected.size !== 1 ? 's' : ''}?`)) return;
                  const batch = writeBatch(db);
                  selected.forEach(id => batch.delete(doc(db, 'abandonmentStats', id)));
                  await batch.commit().catch(() => {});
                  setSelected(new Set());
                }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, fontFamily: FONT, fontSize: 11, color: '#dc2626', cursor: 'pointer', padding: '4px 12px' }}
              >Delete selected ({selected.size})</button>
            )}
            {viewStats.length > 0 && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete all ${viewStats.length} abandonment events for ${eventsLabel}?`)) return;
                  const batch = writeBatch(db);
                  viewStats.forEach(s => batch.delete(doc(db, 'abandonmentStats', s.id)));
                  await batch.commit().catch(() => {});
                  setSelected(new Set());
                }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, fontFamily: FONT, fontSize: 11, color: '#dc2626', cursor: 'pointer', padding: '4px 12px' }}
              >Clear all</button>
            )}
          </div>
        </div>
        {viewStats.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: FONT, fontSize: 13, color: C.muted }}>No abandonment events for {eventsLabel}.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Date', 'Step', 'Package', 'Frequency', 'First Clean', 'Monthly Value', 'Email Sent', 'Outcome', ''].map((h, i) => (
                    <th key={i} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted, textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {i === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox"
                            checked={viewStats.length > 0 && selected.size === viewStats.length}
                            onChange={e => setSelected(e.target.checked ? new Set(viewStats.map(s => s.id)) : new Set())}
                            style={{ accentColor: C.accent, cursor: 'pointer' }}
                          />
                          {h}
                        </div>
                      ) : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewStats.map((s, i) => {
                  const mv = monthlyValue(s.totalAmount, s.frequency);
                  return (
                    <tr key={s.id} style={{ borderTop: `1px solid ${C.border}`, background: selected.has(s.id) ? `${C.accent}11` : i % 2 === 0 ? C.card : C.bg }}>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" checked={selected.has(s.id)}
                            onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(s.id) : n.delete(s.id); return n; })}
                            style={{ accentColor: C.accent, cursor: 'pointer', flexShrink: 0 }}
                          />
                          {s.date}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.step === 3 ? '#fef9c3' : '#e0f2fe', color: s.step === 3 ? '#854d0e' : '#0369a1' }}>
                          {s.step === 3 ? 'Details' : 'Payment'}
                        </span>
                      </td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px' }}>{s.packageName || '—'}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px' }}>{FREQ_LABELS[s.frequency] || s.frequency || '—'}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: C.text, padding: '10px 14px', whiteSpace: 'nowrap' }}>{s.totalAmount ? `£${s.totalAmount.toFixed(2)}` : '—'}</td>
                      <td style={{ fontFamily: FONT, fontSize: 12, color: mv ? '#16a34a' : C.muted, padding: '10px 14px', whiteSpace: 'nowrap' }}>{mv ? `£${mv.toFixed(2)}/mo` : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: s.emailSent ? '#dcfce7' : '#f1f5f9', color: s.emailSent ? '#16a34a' : C.muted }}>
                          {s.emailSent ? `✓ ${s.emailSentAt?.toDate ? s.emailSentAt.toDate().toLocaleDateString('en-GB') : 'Sent'}` : 'Not sent'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {s.emailSent && s.converted
                          ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#16a34a' }}>✓ Converted</span>
                          : s.emailSent && !s.converted
                          ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626' }}>✗ Not converted</span>
                          : s.converted
                          ? <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: C.muted }}>Booked (no email)</span>
                          : <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: C.muted }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <button onClick={() => deleteDoc(doc(db, 'abandonmentStats', s.id)).catch(() => {})} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 2 }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
