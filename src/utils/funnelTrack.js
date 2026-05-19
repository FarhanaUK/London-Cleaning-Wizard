import { db } from '../firebase/firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

function shouldTrack() {
  return window.location.hostname !== 'localhost';
}

export function trackEvent(type, data = {}) {
  if (!shouldTrack()) return;
  const funnelId = sessionStorage.getItem('bkFunnelId');
  if (!funnelId) return;
  const event = { type, ...data, at: new Date().toISOString() };
  setDoc(doc(db, 'bookingFunnel', funnelId), {
    events: arrayUnion(event),
    lastEvent: event,
  }, { merge: true }).catch(() => {});
}
