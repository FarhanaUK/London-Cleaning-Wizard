export const TIMES = (() => {
  const times = [];
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 21 && m > 0) break;
      const period = h < 12 ? 'AM' : 'PM';
      const hour   = h === 0 ? 12 : h > 12 ? h - 12 : h;
      times.push(`${hour}:${m.toString().padStart(2, '0')} ${period}`);
    }
  }
  return times;
})();
