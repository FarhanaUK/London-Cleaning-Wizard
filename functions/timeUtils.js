const UK = 'Europe/London';

function toUTCISO(dateStr, timeStr) {
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h  = 0;
  const probe  = new Date(`${dateStr}T12:00:00Z`);
  const ukH    = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone:UK, hour:'numeric', hour12:false }).format(probe));
  const offset = (ukH - 12) * 60;
  const utcMs  = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`).getTime() - offset * 60000;
  return new Date(utcMs).toISOString();
}

function todayUK() {
  return new Date().toLocaleDateString('en-CA', { timeZone: UK });
}

module.exports = { toUTCISO, todayUK };