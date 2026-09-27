import { useCallback, useEffect, useRef, useState } from 'react';

// Last good response per cache key, kept for the session. Revisiting a page shows this instantly
// while fresh data loads in the background (stale-while-revalidate) — big win on slow phones.
const cache = new Map();

// Forget everything cached (on sign-out, so the next user never sees the previous one’s data).
export const clearApiCache = () => cache.clear();

// Loads data from an API call and re-runs when deps change. Previous data is kept while
// refetching (`refreshing`) so screens don't flash back to a skeleton; `loading` is only
// true while there is nothing to show yet. Pass `cacheKey` (include any params in it) to
// reuse data across visits.
export function useApi(fetcher, deps = [], { enabled = true, cacheKey } = {}) {
  const cached = cacheKey ? cache.get(cacheKey) : undefined;
  const [data, setDataState] = useState(cached ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled && cached === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const hasData = useRef(cached !== undefined);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(cacheKey);
  keyRef.current = cacheKey;

  const setData = useCallback((value) => {
    setDataState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      hasData.current = next !== null && next !== undefined;
      if (keyRef.current && hasData.current) cache.set(keyRef.current, next);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const key = keyRef.current;
    if (key && cache.has(key)) {
      // A new key (e.g. another month) may already be cached: show it at once.
      setDataState(cache.get(key));
      hasData.current = true;
    }
    if (!hasData.current) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (id === requestId.current) setData(result);
      return result;
    } catch (err) {
      if (id === requestId.current) setError(err);
      return undefined;
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [setData]);

  useEffect(() => {
    if (!enabled) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, setData, error, loading, refreshing, reload: load };
}
