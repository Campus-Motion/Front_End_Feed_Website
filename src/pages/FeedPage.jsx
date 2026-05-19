import { useCallback, useState, useMemo } from "react";
import { usePaginatedFetch } from "../hooks/useFetch.js";
import { useLocations } from "../hooks/useLocations.js";
import { getEvents } from "../api/client.js";
import { detectSportTag, detectDifficulty } from "../utils/sportTag.js";
import EventCard from "../components/EventCard.jsx";
import EventSkeleton from "../components/EventSkeleton.jsx";
import FilterBar from "../components/FilterBar.jsx";
import "./FeedPage.css";

// ── Now timestamp (stable across renders) ────────────────────────────────────
const NOW_ISO = new Date().toISOString();
const day_ago_ISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <div className="feed-empty">
      <div className="feed-empty__icon" aria-hidden="true">
        {filtered ? "🔍" : "📅"}
      </div>
      <h3 className="feed-empty__title">
        {filtered ? "No matching events" : "No upcoming events"}
      </h3>
      <p className="feed-empty__text">
        {filtered
          ? "Try removing a filter — more events might show up."
          : "Check back soon — new events are added regularly."}
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div className="feed-error">
      <div className="feed-error__icon" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="feed-error__title">Couldn't load events</h3>
      <p className="feed-error__text">{message}</p>
      <button className="btn btn--ghost" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [activeSport, setActiveSport] = useState(null);
  const [activeDiff, setActiveDiff] = useState(null);

  // Locations lookup map (id → {id, latitude, longitude, label})
  const locationMap = useLocations();

  // Always fetch only future events (after=now)
  const fetcher = useCallback(
    ({ limit, offset }) => getEvents({ limit, offset, after: day_ago_ISO }),
    [],
  );

  const { items, meta, loading, error, loadMore, refresh, hasMore } =
    usePaginatedFetch(fetcher);

  // Client-side filtering by sport tag and difficulty
  const filtered = useMemo(() => {
    return items.filter((event) => {
      if (activeSport) {
        const tag = detectSportTag(event.title, event.body);
        if (tag !== activeSport) return false;
      }
      if (activeDiff) {
        const diff = detectDifficulty(event.distance_m);
        if (diff !== activeDiff) return false;
      }
      return true;
    });
  }, [items, activeSport, activeDiff]);

  const initialLoad = loading && items.length === 0;
  const hasActiveFilter = activeSport || activeDiff;

  return (
    <div className="feed-page">
      {/* ── Page header ── */}
      <div className="feed-header">
        <h1 className="feed-header__title">Upcoming Events</h1>
        {meta && !loading && (
          <p className="feed-header__count">
            {meta.total} event{meta.total !== 1 ? "s" : ""} coming up
          </p>
        )}
      </div>

      {/* ── Filter bar — only once we have data ── */}
      {(items.length > 0 || hasActiveFilter) && (
        <FilterBar
          events={items}
          activeSport={activeSport}
          activeDiff={activeDiff}
          onSport={setActiveSport}
          onDifficulty={setActiveDiff}
          totalShown={filtered.length}
        />
      )}

      {/* ── Content ── */}
      <div className="feed-list">
        {/* Initial skeletons */}
        {initialLoad &&
          Array.from({ length: 5 }).map((_, i) => <EventSkeleton key={i} />)}

        {/* Error */}
        {error && !loading && <ErrorState message={error} onRetry={refresh} />}

        {/* Event cards */}
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} locationMap={locationMap} />
        ))}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && items.length > 0 && (
          <EmptyState filtered />
        )}
        {!loading && !error && items.length === 0 && <EmptyState />}

        {/* Load-more skeleton */}
        {loading && items.length > 0 && <EventSkeleton />}

        {/* Load more — only show when no filters active */}
        {!loading && hasMore && !hasActiveFilter && (
          <button className="feed-load-more" onClick={loadMore}>
            Load more events
          </button>
        )}
      </div>
    </div>
  );
}
