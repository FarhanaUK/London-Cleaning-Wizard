import { db } from '../firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';

const LS_KEY = 'lcw_promotion';

function readLocalStorage() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; }
}

function writeLocalStorage(promo) {
  try {
    if (promo) localStorage.setItem(LS_KEY, JSON.stringify(promo));
    else localStorage.removeItem(LS_KEY);
  } catch {}
}

let _cache   = undefined;
let _promise = null;

function fetchActivePromotion() {
  if (_promise) return _promise;
  _promise = getDocs(query(collection(db, 'promotions'), where('active', '==', true)))
    .then(snap => {
      const promo = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
      _cache = promo;
      writeLocalStorage(promo);
      return promo;
    })
    .catch(() => {
      _cache = null;
      _promise = null;
      return null;
    });
  return _promise;
}

export function clearPromotionCache() {
  _cache   = undefined;
  _promise = null;
}

export function usePromotion() {
  const lsValue = _cache !== undefined ? _cache : readLocalStorage();
  const [promotion, setPromotion] = useState(lsValue);
  const [loading,   setLoading]   = useState(_cache === undefined);

  useEffect(() => {
    if (_cache !== undefined) {
      setPromotion(_cache);
      setLoading(false);
      return;
    }
    fetchActivePromotion().then(promo => {
      setPromotion(promo);
      setLoading(false);
    });
  }, []);

  return { promotion, loading };
}
