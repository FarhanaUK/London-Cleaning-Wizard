import { db } from '../firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';

let _cache   = undefined; // undefined = not yet fetched, null = fetched but none active
let _promise = null;      // deduplicates concurrent fetches

function fetchActivePromotion() {
  if (_promise) return _promise;
  _promise = getDocs(query(collection(db, 'promotions'), where('active', '==', true)))
    .then(snap => {
      const promo = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
      _cache = promo;
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
  const [promotion, setPromotion] = useState(_cache !== undefined ? _cache : null);
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
