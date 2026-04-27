import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook.
 * @param {Function} fetcher  — async function that returns data
 * @param {Array}    deps     — re-fetch when these change
 * @returns {{ data, loading, error, refetch }}
 */
export function useFetch(fetcher, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const abortRef              = useRef(null);

  const run = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (!controller.signal.aborted) setData(result);
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message ?? 'Unknown error');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

/**
 * Paginated fetch hook — accumulates pages.
 * @param {Function} fetcher  — ({ offset }) => Promise<{ data, meta }>
 */
export function usePaginatedFetch(fetcher) {
  const [items, setItems]     = useState([]);
  const [meta, setMeta]       = useState(null);
  const [offset, setOffset]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const LIMIT = 10;

  const load = useCallback(async (nextOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher({ limit: LIMIT, offset: nextOffset });
      setItems(prev => nextOffset === 0 ? result.data : [...prev, ...result.data]);
      setMeta(result.meta);
      setOffset(nextOffset);
    } catch (e) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { load(0); }, [load]);

  const loadMore = () => load(offset + LIMIT);
  const refresh  = () => load(0);
  const hasMore  = meta ? meta.has_more : false;

  return { items, meta, loading, error, loadMore, refresh, hasMore };
}
