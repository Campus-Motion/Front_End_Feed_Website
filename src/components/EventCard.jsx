import { useState } from "react";
import {
  detectSportTag,
  SPORT_EMOJIS,
  detectDifficulty,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from "../utils/sportTag.js";
import "./EventCard.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDistance(m) {
  if (!m) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function formatDuration(start, end) {
  if (!start || !end) return null;
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60),
    m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function resolveLocation(id, map) {
  if (!id || !map) return null;
  return map[id] ?? null;
}

// ── Strava logo inline SVG ────────────────────────────────────────────────────
function StravaIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

// ── JoinPrompt modal ──────────────────────────────────────────────────────────
function JoinPrompt({ event, icon, onClose }) {
  return (
    <div
      className="join-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Join event"
    >
      <div className="join-modal">
        <button
          className="join-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="join-modal__icon" aria-hidden="true">
          {icon}
        </div>
        <h2 className="join-modal__title">{event.title}</h2>
        <p className="join-modal__subtitle">
          Sign in to register for this event and chat with the organiser.
        </p>
        <div className="join-modal__actions">
          <a href="#login" className="btn btn--primary" onClick={onClose}>
            Sign in
          </a>
          <a href="#register" className="btn btn--ghost" onClick={onClose}>
            Create account
          </a>
        </div>
        <p className="join-modal__note">
          Your answer will be registered instantly.
        </p>
      </div>
    </div>
  );
}

// ── EventCard ─────────────────────────────────────────────────────────────────
/**
 * Props:
 *   event       – event object from API
 *   locationMap – { [id]: { label, latitude, longitude } } from useLocations()
 */
export default function EventCard({ event, locationMap = {} }) {
  const [showJoin, setShowJoin] = useState(false);

  const sportTag = detectSportTag(event.title, event.body);
  const icon = (sportTag && SPORT_EMOJIS[sportTag]) ?? "⚡";
  const difficulty = detectDifficulty(event.distance_m);

  const dateStr = formatDate(event.start_time);
  const distanceStr = formatDistance(event.distance_m);
  const durationStr = formatDuration(event.start_time, event.end_time);
  const participants = event.participant_count ?? 0;

  const startLoc = resolveLocation(event.start_location_id, locationMap);
  const endLoc = resolveLocation(event.end_location_id, locationMap);
  const locationStr =
    startLoc && endLoc
      ? `${startLoc.label} → ${endLoc.label}`
      : (startLoc?.label ?? endLoc?.label ?? null);

  // strava_url is not in the API yet — show when present
  const stravaUrl = event.strava_url ?? "test.com/strava-link";

  return (
    <>
      <article className="event-card" tabIndex="0">
        {/* ── Left: join button ── */}
        <div className="event-card__join-col">
          <button
            className="event-card__join-btn"
            onClick={() => setShowJoin(true)}
            aria-label={`Join ${event.title}`}
          >
            join
          </button>
        </div>

        {/* ── Right: content ── */}
        <div className="event-card__content">
          {/* Header row */}
          <div className="event-card__header">
            <span className="event-card__icon" aria-hidden="true">
              {icon}
            </span>
            <h3 className="event-card__title">{event.title}</h3>
            <div className="event-card__badges">
              {difficulty && (
                <span
                  className="event-card__badge event-card__badge--diff"
                  style={{ "--diff-color": DIFFICULTY_COLORS[difficulty] }}
                >
                  {DIFFICULTY_LABELS[difficulty]}
                </span>
              )}
              {participants > 0 && (
                <span className="event-card__badge">
                  {participants} {participants === 1 ? "person" : "people"}
                </span>
              )}
            </div>
          </div>

          {/* Detail rows */}
          <ul className="event-card__details" role="list">
            {/* Date + duration */}
            {dateStr && (
              <li className="event-card__detail">
                <DetailIcon d="M3 4h18v18H3V4zm0 6h18M8 2v4M16 2v4" />
                {dateStr}
                {durationStr && (
                  <span className="event-card__detail-sub">
                    {" "}
                    · {durationStr}
                  </span>
                )}
              </li>
            )}

            {/* Location */}
            {locationStr && (
              <li className="event-card__detail">
                <DetailIcon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
                {locationStr}
              </li>
            )}

            {/* Distance */}
            {distanceStr && (
              <li className="event-card__detail">
                <DetailIcon d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" />
                {distanceStr} route
              </li>
            )}

            {/* Description */}
            {event.body && (
              <li className="event-card__detail event-card__detail--desc">
                <DetailIcon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <span className="event-card__body-text">{event.body}</span>
              </li>
            )}
          </ul>

          {/* ── Footer: Strava link (ready for future API field) ── */}
          {stravaUrl && (
            <div className="event-card__footer">
              <a
                href={stravaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="event-card__strava-link"
                onClick={(e) => e.stopPropagation()}
                aria-label="View on Strava"
              >
                <StravaIcon />
                View on Strava
              </a>
            </div>
          )}
        </div>
      </article>

      {showJoin && (
        <JoinPrompt
          event={event}
          icon={icon}
          onClose={() => setShowJoin(false)}
        />
      )}
    </>
  );
}

// ── Tiny inline icon helper to avoid repetition ──────────────────────────────
function DetailIcon({ d }) {
  return (
    <svg
      className="event-card__detail-icon"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
