import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useMyEvents } from "../auth/MyEventsContext.jsx";
import { useLocations } from "../hooks/useLocations.js";
import EventCard from "../components/EventCard.jsx";
import EventSkeleton from "../components/EventSkeleton.jsx";
import "./FeedPage.css";
import "./MyEventsPage.css";

function EmptyState() {
  return (
    <div className="feed-empty">
      <div className="feed-empty__icon" aria-hidden="true">
        📅
      </div>
      <h3 className="feed-empty__title">No events yet</h3>
      <p className="feed-empty__text">
        Events you join with your account show up here.
      </p>
      <Link className="btn btn--primary" to="/">
        Browse events
      </Link>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="feed-error">
      <div className="feed-error__icon" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="feed-error__title">Couldn't load your events</h3>
      <p className="feed-error__text">Check your connection and try again.</p>
      <button className="btn btn--ghost" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function Section({ title, events, locationMap }) {
  if (events.length === 0) return null;
  return (
    <section className="my-events__section" aria-label={title}>
      <h2 className="my-events__section-title">
        {title} <span className="my-events__count">{events.length}</span>
      </h2>
      {events.map((event) => (
        <EventCard key={event.id} event={event} locationMap={locationMap} />
      ))}
    </section>
  );
}

export default function MyEventsPage() {
  const { status: authStatus } = useAuth();
  const { events, status, reload } = useMyEvents();
  const locationMap = useLocations();

  // Upcoming soonest first, past most recent first.
  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const byStart = (e) => new Date(e.start_time).getTime();
    return {
      upcoming: events.filter((e) => byStart(e) >= now),
      past: events.filter((e) => byStart(e) < now).reverse(),
    };
  }, [events]);

  if (authStatus === "signedOut") {
    return <Navigate to="/signin?next=%2Fmy-events" replace />;
  }

  const loading = authStatus === "loading" || status === "loading";

  return (
    <div className="feed-page">
      <div className="feed-header">
        <h1 className="feed-header__title">My events</h1>
        {status === "ready" && events.length > 0 && (
          <p className="feed-header__count">
            {upcoming.length} coming up · {past.length} past
          </p>
        )}
      </div>

      <div className="feed-list">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <EventSkeleton key={i} />)}
        {status === "error" && <ErrorState onRetry={reload} />}
        {status === "ready" && events.length === 0 && <EmptyState />}
        {status === "ready" && (
          <>
            <Section
              title="Coming up"
              events={upcoming}
              locationMap={locationMap}
            />
            <Section title="Past" events={past} locationMap={locationMap} />
          </>
        )}
      </div>
    </div>
  );
}
