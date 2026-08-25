// src/hooks/useCachedFetch.ts
//
// App ki har screen mount par `useState(true)` karke full-screen spinner
// dikhati thi, phir API call karti thi. Server US-West mein hai aur DB Mumbai
// mein, to har call 300ms+ ki hai - yaani har baar tab badalne par khaali
// screen. Wahi data jo 5 second pehle load hua tha.
//
// Ye hook stale-while-revalidate karta hai:
//   - cache mein data hai to TURANT dikha do, spinner bilkul nahi
//   - background mein fresh data laao aur chupchaap update kar do
//   - spinner sirf tab jab dikhane ko kuch bhi na ho (pehli baar)

import { useCallback, useEffect, useRef, useState } from "react";

interface CacheEntry {
  data: unknown;
  at: number;
}

// Memory cache - app band hone tak. AsyncStorage jaan-bujh kar nahi use kiya:
// wo async hai, to pehle render par data mil hi nahi paata aur spinner phir
// bhi flash hota.
const store = new Map<string, CacheEntry>();

export const cacheGet = <T>(key: string): T | undefined =>
  store.get(key)?.data as T | undefined;

export const cacheSet = (key: string, data: unknown) => {
  store.set(key, { data, at: Date.now() });
};

/** Ek key ya poore prefix ka cache hatao (jaise data badalne ke baad) */
export const cacheInvalidate = (keyOrPrefix: string) => {
  if (store.has(keyOrPrefix)) {
    store.delete(keyOrPrefix);
    return;
  }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(keyOrPrefix)) store.delete(key);
  }
};

export const cacheClearAll = () => store.clear();

interface Options {
  /** Itna purana data hone par background refresh (default 30s) */
  staleMs?: number;
  /** false ho to fetch hi na kare (jaise locked feature) */
  enabled?: boolean;
}

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: Options = {}
) {
  const { staleMs = 30_000, enabled = true } = options;

  const cached = cacheGet<T>(key);

  const [data, setData] = useState<T | undefined>(cached);
  // Spinner sirf tab jab dikhane ko kuch bhi nahi hai
  const [loading, setLoading] = useState(!cached && enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fetcher har render par naya function hota hai - use ref mein rakho warna
  // effect infinite loop mein chala jayega
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: "initial" | "background" | "manual") => {
      if (!enabled) return;

      if (mode === "manual") setRefreshing(true);

      try {
        const result = await fetcherRef.current();
        cacheSet(key, result);

        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        // Background refresh fail ho to purana data hi dikhne do - user ko
        // error dikhane ka koi fayda nahi jab screen par sahi data maujood hai
        if (mountedRef.current && mode !== "background") {
          setError(err?.message || "Could not load");
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [key, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    const entry = store.get(key);

    if (!entry) {
      run("initial");
      return;
    }

    // Cache hai - turant dikh chuka hai. Purana ho to chupchaap refresh.
    setData(entry.data as T);
    setLoading(false);

    if (Date.now() - entry.at > staleMs) run("background");
  }, [key, enabled, staleMs, run]);

  const refetch = useCallback(() => run("manual"), [run]);

  return { data, loading, refreshing, error, refetch, setData };
}
