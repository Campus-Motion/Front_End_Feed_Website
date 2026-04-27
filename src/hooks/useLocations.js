import { useMemo } from 'react';
import { useFetch } from './useFetch.js';
import { getLocations } from '../api/client.js';

export function useLocations() {
  const { data } = useFetch(() => getLocations({ limit: 100 }), []);
  const locationMap = useMemo(() => {
    const map = {};
    (data?.data ?? []).forEach(loc => { map[loc.id] = loc; });
    return map;
  }, [data]);
  return locationMap;
}
