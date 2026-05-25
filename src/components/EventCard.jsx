import { useState, useEffect, useCallback, useRef } from "react";
import {
  detectSportTag,
  SPORT_EMOJIS,
  detectDifficulty,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from "../utils/sportTag.js";
import {
  joinEventAsGuest,
  getEventGuests,
  leaveEventAsGuest,
  getLocations,
} from "../api/client.js";
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
function formatDateLong(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CH", {
    weekday: "long",
    month: "long",
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
  return map[id] ?? map[String(id)] ?? null;
}

function getGuestName(guest) {
  return guest.display_name || guest.username || "Unknown";
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = (id) => `cm_guest_${id}`;
function getSavedJoin(eventId) {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(eventId)));
  } catch {
    return null;
  }
}
function saveJoin(eventId, data) {
  localStorage.setItem(LS_KEY(eventId), JSON.stringify(data));
}
function clearJoin(eventId) {
  localStorage.removeItem(LS_KEY(eventId));
}

// ── Icons ─────────────────────────────────────────────────────────────────────
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
function CloseBtn({ onClose }) {
  return (
    <button className="join-modal__close" onClick={onClose} aria-label="Close">
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
  );
}
function DetailIcon({ d, className = "event-card__detail-icon" }) {
  return (
    <svg
      className={className}
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

// ── Map embed (OpenStreetMap) ─────────────────────────────────────────────────
function MapEmbed({ lat, lng, label }) {
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lngN - 0.01}%2C${latN - 0.008}%2C${lngN + 0.01}%2C${latN + 0.008}&layer=mapnik&marker=${latN}%2C${lngN}`;
  const linkUrl = `https://www.openstreetmap.org/?mlat=${latN}&mlon=${lngN}#map=15/${latN}/${lngN}`;
  return (
    <div className="event-drawer__map-wrapper">
      <iframe
        title={`Map: ${label}`}
        src={url}
        className="event-drawer__map"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="event-drawer__map-link"
      >
        Open in OpenStreetMap ↗
      </a>
    </div>
  );
}

// ── Participant row ───────────────────────────────────────────────────────────
function ParticipantRow({ guest }) {
  return (
    <li className="participant-row">
      <span className="participant-row__avatar">
        {getGuestName(guest).charAt(0).toUpperCase()}
      </span>
      <div className="participant-row__info">
        <span className="participant-row__name">{getGuestName(guest)}</span>
        {guest.telegram && (
          <a
            className="participant-row__telegram"
            href={`https://t.me/${guest.telegram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {guest.telegram.startsWith("@")
              ? guest.telegram
              : `@${guest.telegram}`}
          </a>
        )}
      </div>
      <span className="participant-row__date">
        {new Date(guest.created_at ?? guest.joined_at).toLocaleDateString(
          "en-CH",
          {
            month: "short",
            day: "numeric",
          },
        )}
      </span>
    </li>
  );
}

// ── Event detail drawer ───────────────────────────────────────────────────────
function EventDrawer({ event, icon, locationMap, onClose, onJoinStateChange }) {
  const [guests, setGuests] = useState([]);
  const [guestLoad, setGuestLoad] = useState(true);
  const [savedJoin, setSavedJoin] = useState(() => getSavedJoin(event.id));
  const [showJoin, setShowJoin] = useState(false);

  // Resolve location — fallback fetch if locationMap wasn't ready on mount
  const [mapLoc, setMapLoc] = useState(null);

  useEffect(() => {
    const startId = event.start_location_id;
    const endId = event.end_location_id;
    const id = startId ?? endId;
    if (!id) return;

    // Try locationMap prop first (may already be populated)
    const fromProp =
      resolveLocation(startId, locationMap) ??
      resolveLocation(endId, locationMap);
    if (fromProp) {
      setMapLoc(fromProp);
      return;
    }

    // Fallback: fetch directly
    getLocations({ limit: 100 })
      .then((res) => {
        const locs = res?.data ?? [];
        const found = locs.find((l) => String(l.id) === String(id));
        if (found) setMapLoc(found);
      })
      .catch(() => {});
  }, [locationMap, event.start_location_id, event.end_location_id]); // re-runs if locationMap populates after mount

  // Derive location label string (for the meta row)
  const startLoc = resolveLocation(event.start_location_id, locationMap);
  const endLoc = resolveLocation(event.end_location_id, locationMap);

  const locationStr =
    startLoc && endLoc
      ? `${startLoc.label} → ${endLoc.label}`
      : (startLoc?.label ?? endLoc?.label ?? mapLoc?.label ?? null);

  // Lock body scroll while drawer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fetch guests
  const loadGuests = useCallback(async () => {
    setGuestLoad(true);
    try {
      const res = await getEventGuests(event.id);
      setGuests(Array.isArray(res) ? res : (res?.data ?? []));
    } catch {
      /* silent */
    } finally {
      setGuestLoad(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const isGoing = !!savedJoin;

  function handleJoined(data) {
    saveJoin(event.id, data);
    setSavedJoin(data);
    loadGuests();
    onJoinStateChange?.(data, "joined");
  }
  function handleLeft() {
    clearJoin(event.id);
    setSavedJoin(null);
    loadGuests();
    onJoinStateChange?.(null, "left");
  }

  return (
    <div
      className="event-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
    >
      <div
        className="event-overlay__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="event-drawer">
        <div className="event-drawer__handle" aria-hidden="true" />

        <div className="event-drawer__header">
          <span className="event-drawer__label">Event</span>
          <button
            className="event-drawer__close"
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
        </div>

        <div className="event-drawer__scroll">
          <div className="event-drawer__hero">
            <span className="event-drawer__icon" aria-hidden="true">
              {icon}
            </span>
            <h2 className="event-drawer__title">{event.title}</h2>
            <div className="event-drawer__badges">
              {detectDifficulty(event.distance_m) && (
                <span
                  className="event-drawer__badge event-drawer__badge--diff"
                  style={{
                    "--diff-color":
                      DIFFICULTY_COLORS[detectDifficulty(event.distance_m)],
                  }}
                >
                  {DIFFICULTY_LABELS[detectDifficulty(event.distance_m)]}
                </span>
              )}
              <span className="event-drawer__badge">
                {guests.length} {guests.length === 1 ? "person" : "people"}{" "}
                going
              </span>
            </div>
          </div>

          <button
            className={`event-drawer__join-btn${isGoing ? " event-drawer__join-btn--going" : ""}`}
            onClick={() => setShowJoin(true)}
          >
            {isGoing ? "✓ You're going — tap to manage" : "Join this event"}
          </button>

          <ul className="event-drawer__meta">
            {event.start_time && (
              <li>
                <DetailIcon
                  d="M3 4h18v18H3V4zm0 6h18M8 2v4M16 2v4"
                  className="event-drawer__meta-icon"
                />
                <div>
                  <span>{formatDateLong(event.start_time)}</span>
                  {formatDuration(event.start_time, event.end_time) && (
                    <span className="event-drawer__meta-sub">
                      Duration:{" "}
                      {formatDuration(event.start_time, event.end_time)}
                    </span>
                  )}
                </div>
              </li>
            )}
            {locationStr && (
              <li>
                <DetailIcon
                  d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
                  className="event-drawer__meta-icon"
                />
                <span>{locationStr}</span>
              </li>
            )}
            {event.distance_m && (
              <li>
                <DetailIcon
                  d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"
                  className="event-drawer__meta-icon"
                />
                <span>{formatDistance(event.distance_m)} route</span>
              </li>
            )}
          </ul>

          {event.body && <p className="event-drawer__body">{event.body}</p>}

          {/* Map — shows once mapLoc resolves (handles race condition) */}
          {mapLoc?.latitude && mapLoc?.longitude && (
            <section className="event-drawer__section">
              <h3 className="event-drawer__section-title">Meeting point</h3>
              <MapEmbed
                lat={mapLoc.latitude}
                lng={mapLoc.longitude}
                label={mapLoc.label}
              />
            </section>
          )}

          {event.strava_url && (
            <a
              href={event.strava_url}
              target="_blank"
              rel="noopener noreferrer"
              className="event-drawer__strava"
            >
              <StravaIcon /> View on Strava
            </a>
          )}

          <section className="event-drawer__section">
            <h3 className="event-drawer__section-title">
              Who's coming ({guests.length})
            </h3>
            {guestLoad ? (
              <div className="event-drawer__guest-skeletons">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: "48px", borderRadius: "8px" }}
                  />
                ))}
              </div>
            ) : guests.length === 0 ? (
              <p className="event-drawer__empty">No one yet — be the first!</p>
            ) : (
              <ul className="participants-list" role="list">
                {guests.map((g, i) => (
                  <ParticipantRow key={g.id ?? i} guest={g} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {showJoin && (
        <JoinModal
          event={event}
          icon={icon}
          savedJoin={savedJoin}
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
          onLeft={handleLeft}
        />
      )}
    </div>
  );
}

// ── Join modal screens ────────────────────────────────────────────────────────
function ChoiceScreen({ event, icon, onGuest, onSignIn, onClose }) {
  return (
    <>
      <CloseBtn onClose={onClose} />
      <div className="join-modal__icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="join-modal__title">{event.title}</h2>
      <p className="join-modal__subtitle">How do you want to join?</p>
      <div className="join-modal__actions">
        <button
          data-umami-event="Click on Join as guest"
          className="btn btn--primary"
          onClick={onGuest}
        >
          Join as guest
        </button>
        <button
          data-umami-event="Click on Sign in with account"
          className="btn btn--ghost"
          onClick={onSignIn}
        >
          Sign in with account
        </button>
      </div>
    </>
  );
}

function GuestFormScreen({ event, onSubmit, onBack, onClose }) {
  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (telegram && !/^@[A-Za-z0-9_]{3,32}$/.test(telegram)) {
      setError("Telegram handle must be like @username (3-32 chars).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await joinEventAsGuest(event.id, {
        display_name: name.trim(),
        telegram_handle: telegram.trim() || undefined,
      });
      onSubmit({
        display_name: name.trim(),
        telegram_handle: telegram.trim() || null,
        token: result.token,
      });
    } catch (e) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <CloseBtn onClose={onClose} />
      <button className="join-modal__back" onClick={onBack} aria-label="Back">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2 className="join-modal__title">Join as guest</h2>
      <p className="join-modal__subtitle">No account needed.</p>
      <form className="join-form" onSubmit={handleSubmit} noValidate>
        <div className="join-form__field">
          <label className="join-form__label" htmlFor="guest-name">
            Your name <span className="join-form__required">*</span>
          </label>
          <input
            id="guest-name"
            className="join-form__input"
            type="text"
            placeholder="e.g. Alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            required
            autoFocus
          />
        </div>
        <div className="join-form__field">
          <label className="join-form__label" htmlFor="guest-telegram">
            Telegram <span className="join-form__optional">(optional)</span>
          </label>
          <input
            id="guest-telegram"
            className="join-form__input"
            type="text"
            placeholder="@username"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            maxLength={34}
          />
          <span className="join-form__hint">Lets others reach you</span>
        </div>
        {error && (
          <p className="join-form__error" role="alert">
            {error}
          </p>
        )}
        <button
          data-umami-event="Signup to event from card"
          data-umami-event-id={event.id}
          data-umami-event-guest-name={name}
          className={`btn btn--primary btn--full${loading ? " btn--loading" : ""}`}
          type="submit"
          disabled={loading}
        >
          {loading ? "Registering…" : "Confirm participation"}
        </button>
      </form>
    </>
  );
}

function SuccessScreen({ event, joinData, onClose }) {
  const [copied, setCopied] = useState(false);
  function copyToken() {
    navigator.clipboard.writeText(joinData.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <>
      <CloseBtn onClose={onClose} />
      <div
        className="join-modal__icon"
        style={{ fontSize: "2.5rem" }}
        aria-hidden="true"
      >
        🎉
      </div>
      <h2 className="join-modal__title">You're in!</h2>
      <p className="join-modal__subtitle">
        Registered as <strong>{joinData.display_name}</strong>
        {joinData.telegram_handle && <> · {joinData.telegram_handle}</>}
      </p>
      <div className="join-token-box">
        <p className="join-token-box__label">Your leave token — save this!</p>
        <div className="join-token-box__row">
          <code className="join-token-box__token">{joinData.token}</code>
          <button
            className="join-token-box__copy"
            onClick={copyToken}
            aria-label="Copy token"
          >
            {copied ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
        <p className="join-token-box__note">
          Stored in your browser. Use it to cancel.
        </p>
      </div>
      <button
        className="btn btn--ghost btn--full"
        style={{ marginTop: "var(--space-3)" }}
        onClick={onClose}
      >
        Close
      </button>
    </>
  );
}

function AlreadyJoinedScreen({ event, savedJoin, onLeave, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  async function handleLeave() {
    setLeaving(true);
    setError("");
    try {
      const t =
        savedJoin.token && typeof savedJoin.token === "object"
          ? (savedJoin.token.token ?? JSON.stringify(savedJoin.token))
          : savedJoin.token;
      await leaveEventAsGuest(event.id, t);
      clearJoin(event.id);
      onLeave();
    } catch (e) {
      setError(e.message ?? "Could not remove participation.");
    } finally {
      setLeaving(false);
      setConfirm(false);
    }
  }

  return (
    <>
      <CloseBtn onClose={onClose} />
      <div className="join-modal__icon" aria-hidden="true">
        ✅
      </div>
      <h2 className="join-modal__title">You're going!</h2>
      <p className="join-modal__subtitle">
        Registered as <strong>{savedJoin.display_name}</strong>
        {savedJoin.telegram_handle && <> · {savedJoin.telegram_handle}</>}
      </p>
      {error && (
        <p className="join-form__error" role="alert">
          {error}
        </p>
      )}
      {!confirm ? (
        <button
          className="btn btn--ghost btn--full"
          style={{ marginTop: "var(--space-4)" }}
          onClick={() => setConfirm(true)}
        >
          Cancel my participation
        </button>
      ) : (
        <div className="join-confirm-leave">
          <p className="join-confirm-leave__text">Are you sure?</p>
          <div className="join-confirm-leave__actions">
            <button
              className={`btn btn--primary${leaving ? " btn--loading" : ""}`}
              onClick={handleLeave}
              disabled={leaving}
              style={{
                background: "var(--color-error)",
                borderColor: "var(--color-error)",
              }}
            >
              {leaving ? "Leaving…" : "Yes, leave"}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => setConfirm(false)}
            >
              Keep my spot
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function JoinModal({ event, icon, savedJoin, onClose, onJoined, onLeft }) {
  const [screen, setScreen] = useState(savedJoin ? "already" : "choice");
  const [joinData, setJoinData] = useState(null);
  const pendingJoin = useRef(null);

  function handleGuestSubmit(data) {
    saveJoin(event.id, data);
    setJoinData(data);
    setScreen("success");
    pendingJoin.current = data;
  }
  function handleClose() {
    if (pendingJoin.current) {
      onJoined(pendingJoin.current);
      pendingJoin.current = null;
    }
    onClose();
  }

  return (
    <div
      className="join-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Join event"
    >
      <div className="join-modal">
        {screen === "choice" && (
          <ChoiceScreen
            event={event}
            icon={icon}
            onGuest={() => setScreen("form")}
            onSignIn={() => (window.location.hash = "login")}
            onClose={handleClose}
          />
        )}
        {screen === "form" && (
          <GuestFormScreen
            event={event}
            onSubmit={handleGuestSubmit}
            onBack={() => setScreen("choice")}
            onClose={handleClose}
          />
        )}
        {screen === "success" && (
          <SuccessScreen
            event={event}
            joinData={joinData}
            onClose={handleClose}
          />
        )}
        {screen === "already" && (
          <AlreadyJoinedScreen
            event={event}
            savedJoin={savedJoin}
            onLeave={() => {
              onLeft();
              handleClose();
            }}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

// ── Guest preview (feed card) ─────────────────────────────────────────────────
function GuestPreview({ eventId, refreshKey, onTotal }) {
  const [guests, setGuests] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await getEventGuests(eventId);
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setGuests(list);
      if (onTotal) onTotal(data?.meta?.total ?? list.length);
    } catch {
      /* silent */
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (guests.length === 0) return null;
  const visible = guests.slice(0, 3);
  const overflow = guests.length - visible.length;

  return (
    <div className="event-card__guests">
      <div className="event-card__guests-avatars">
        {visible.map((g, i) => {
          const name = getGuestName(g);
          const initial = name ? name.charAt(0).toUpperCase() : "?";
          return (
            <span
              key={g.id ?? i}
              className="event-card__guest-avatar"
              title={
                g.telegram_handle ? `${name} (${g.telegram_handle})` : name
              }
            >
              {initial}
            </span>
          );
        })}
      </div>
      <span className="event-card__guests-label">
        {visible.map((g) => getGuestName(g)).join(", ")}
        {overflow > 0 && ` +${overflow} more`}
      </span>
    </div>
  );
}

// ── EventCard ─────────────────────────────────────────────────────────────────
export default function EventCard({ event, locationMap = {} }) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [savedJoin, setSavedJoin] = useState(() => getSavedJoin(event.id));
  const [refreshKey, setRefreshKey] = useState(0);
  const [participants, setParticipants] = useState(
    event.participant_count ?? 0,
  );

  const sportTag = detectSportTag(event.title, event.body);
  const icon = (sportTag && SPORT_EMOJIS[sportTag]) ?? "⚡";
  const difficulty = detectDifficulty(event.distance_m);

  const dateStr = formatDate(event.start_time);
  const distanceStr = formatDistance(event.distance_m);
  const durationStr = formatDuration(event.start_time, event.end_time);

  const startLoc = resolveLocation(event.start_location_id, locationMap);
  const endLoc = resolveLocation(event.end_location_id, locationMap);
  const locationStr =
    startLoc && endLoc
      ? `${startLoc.label} → ${endLoc.label}`
      : (startLoc?.label ?? endLoc?.label ?? null);

  const stravaUrl = event.strava_url ?? null;
  const isGoing = !!savedJoin;

  function handleJoinStateChange(data, action) {
    if (action === "joined") {
      setSavedJoin(data);
    } else {
      setSavedJoin(null);
    }
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <article
        className="event-card"
        tabIndex="0"
        onClick={() => setShowDrawer(true)}
        onKeyDown={(e) => e.key === "Enter" && setShowDrawer(true)}
        role="button"
        aria-label={`View details for ${event.title}`}
      >
        <div className="event-card__join-col">
          <button
            data-umami-event="Click on Join button"
            className={`event-card__join-btn${isGoing ? " event-card__join-btn--going" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
            aria-label={
              isGoing ? `You're going to ${event.title}` : `Join ${event.title}`
            }
          >
            {isGoing ? "✓ going" : "join"}
          </button>
        </div>

        <div className="event-card__content">
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

          <ul className="event-card__details" role="list">
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
            {locationStr && (
              <li className="event-card__detail">
                <DetailIcon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
                {locationStr}
              </li>
            )}
            {distanceStr && (
              <li className="event-card__detail">
                <DetailIcon d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" />
                {distanceStr} route
              </li>
            )}
            {event.body && (
              <li className="event-card__detail event-card__detail--desc">
                <DetailIcon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <span className="event-card__body-text">{event.body}</span>
              </li>
            )}
          </ul>

          <GuestPreview
            eventId={event.id}
            refreshKey={refreshKey}
            onTotal={setParticipants}
          />

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
                <StravaIcon /> View on Strava
              </a>
            </div>
          )}
        </div>
      </article>

      {showDrawer && (
        <EventDrawer
          data-umami-event="Open event drawer"
          event={event}
          icon={icon}
          locationMap={locationMap}
          onClose={() => setShowDrawer(false)}
          onJoinStateChange={handleJoinStateChange}
        />
      )}

      {showModal && (
        <JoinModal
          data-umami-event="Open join modal"
          event={event}
          icon={icon}
          savedJoin={savedJoin}
          onClose={() => setShowModal(false)}
          onJoined={(data) => {
            setSavedJoin(data);
            setRefreshKey((k) => k + 1);
          }}
          onLeft={() => {
            setSavedJoin(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}
