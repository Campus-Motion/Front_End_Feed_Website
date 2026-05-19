import { useMemo } from "react";
import { useFetch } from "./useFetch.js";
import { getLocations } from "../api/client.js";

export function useLocations() {
  const { data } = useFetch(() => getLocations({ limit: 100 }), []);
  const locationMap = useMemo(() => {
    const map = {};
    // Your API returns a plain array, not { data: [...] }
    const locs = Array.isArray(data) ? data : (data?.data ?? []);
    locs.forEach((loc) => {
      map[String(loc.id)] = loc;
    }); // normalize keys to strings
    return map;
  }, [data]);
  return locationMap;
}
