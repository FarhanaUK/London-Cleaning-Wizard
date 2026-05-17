const KEY = 'admin_notifications';
const EVT = 'admin-notification';

export function readNotifications() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

export function addNotification(notif) {
  const current = readNotifications();
  if (current.find(n => n.id === notif.id)) return;
  const updated = [{ ...notif, read: false, createdAt: new Date().toISOString() }, ...current].slice(0, 100);
  localStorage.setItem(KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(EVT));
}

export function markAllRead() {
  localStorage.setItem(KEY, JSON.stringify(readNotifications().map(n => ({ ...n, read: true }))));
  window.dispatchEvent(new Event(EVT));
}

export function clearNotification(id) {
  localStorage.setItem(KEY, JSON.stringify(readNotifications().filter(n => n.id !== id)));
  window.dispatchEvent(new Event(EVT));
}

export function clearAll() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export const EVENT = EVT;
