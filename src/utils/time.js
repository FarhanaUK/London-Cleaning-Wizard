const UK = 'Europe/London';

// "2026-04-15" + "10:00 AM" → correct UTC ISO string accounting for BST/GMT
export function toUTCISO(dateStr, timeStr) {
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h  = 0;
  const probe  = new Date(`${dateStr}T12:00:00Z`);
  const ukH    = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: UK, hour: 'numeric', hour12: false }).format(probe));
  const offset = (ukH - 12) * 60;
  const utcMs  = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`).getTime() - offset * 60000;
  return new Date(utcMs).toISOString();
}

// Display a UTC ISO string as UK time — "10:00 AM"
export function showTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: UK, hour: '2-digit', minute: '2-digit', hour12: true });
}

// Display YYYY-MM-DD as "Tuesday 15 April 2026"
export function showDate(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: UK, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Is a YYYY-MM-DD string a weekend in UK time?
export function isWeekend(dateStr) {
  const day = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: UK, weekday: 'short' });
  return day === 'Sat' || day === 'Sun';
}

// Is a YYYY-MM-DD string today in UK time?
export function isToday(dateStr) {
  return dateStr === new Date().toLocaleDateString('en-CA', { timeZone: UK });
}

// Get today as YYYY-MM-DD in UK time
export function todayUK() {
  return new Date().toLocaleDateString('en-CA', { timeZone: UK });
}