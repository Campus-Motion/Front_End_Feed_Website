import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

/**
 * Events the signed-in user joined with their account, shared by the event
 * cards (to show "going") and the My events page.
 *
 * status: "idle" when signed out, "loading", "ready" or "error".
 */
const MyEventsContext = createContext(null);

// The endpoint caps a page at 100 events: keep going until has_more is false.
async function fetchAllMyEvents() {
  const all = [];
  let offset = 0;
  for (;;) {
    const { data, meta } = await api.getMyEvents({ limit: 100, offset });
    all.push(...data);
    if (!meta?.has_more || data.length === 0) return all;
    offset += data.length;
  }
}

export function MyEventsProvider({ children }) {
  const { status: authStatus } = useAuth();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("idle");

  const reload = useCallback(async () => {
    setStatus("loading");
    try {
      setEvents(await fetchAllMyEvents());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (authStatus === "signedIn") {
      reload();
    } else {
      setEvents([]);
      setStatus("idle");
    }
  }, [authStatus, reload]);

  const joinedIds = useMemo(() => new Set(events.map((e) => e.id)), [events]);

  // 409 means already joined (e.g. from another tab): treat it as success.
  const join = useCallback(
    async (eventId) => {
      try {
        await api.joinEventWithAccount(eventId);
      } catch (e) {
        if (e.status !== 409) throw e;
      }
      await reload();
    },
    [reload],
  );

  // 404 means already left: treat it as success too.
  const leave = useCallback(async (eventId) => {
    try {
      await api.leaveEventWithAccount(eventId);
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const value = useMemo(
    () => ({
      events,
      status,
      reload,
      join,
      leave,
      isJoined: (eventId) => joinedIds.has(eventId),
    }),
    [events, status, reload, join, leave, joinedIds],
  );

  return (
    <MyEventsContext.Provider value={value}>
      {children}
    </MyEventsContext.Provider>
  );
}

/** { events, status, reload(), join(id), leave(id), isJoined(id) } */
export function useMyEvents() {
  const ctx = useContext(MyEventsContext);
  if (!ctx)
    throw new Error("useMyEvents must be used inside <MyEventsProvider>");
  return ctx;
}
