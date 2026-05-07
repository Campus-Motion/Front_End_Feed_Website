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

// ── localStorage helpers (token per event) ────────────────────────────────────
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

// ── Strava icon ───────────────────────────────────────────────────────────────
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

// ── Close button ──────────────────────────────────────────────────────────────
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

// ── SCREEN 1: Choice ──────────────────────────────────────────────────────────
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
        <button className="btn btn--primary" onClick={onGuest}>
          Join as guest
        </button>
        <button className="btn btn--ghost" onClick={onSignIn}>
          Sign in with account
        </button>
      </div>
    </>
  );
}

// ── SCREEN 2: Guest form ──────────────────────────────────────────────────────
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
      setError(e.message ?? "Something went wrong, please try again.");
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
      <p className="join-modal__subtitle">
        No account needed — just leave your name.
      </p>
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
            Telegram handle{" "}
            <span className="join-form__optional">(optional)</span>
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
          <span className="join-form__hint">
            Lets other participants reach you
          </span>
        </div>
        {error && (
          <p className="join-form__error" role="alert">
            {error}
          </p>
        )}
        <button
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

// ── SCREEN 3: Success ─────────────────────────────────────────────────────────
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
          Stored in your browser. Use it to cancel your participation.
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

// ── SCREEN 4: Already joined ──────────────────────────────────────────────────
function AlreadyJoinedScreen({ event, savedJoin, onLeave, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  async function handleLeave() {
    setLeaving(true);
    setError("");
    try {
      await leaveEventAsGuest(event.id, savedJoin.token);
      clearJoin(event.id);
      onLeave();
    } catch (e) {
      setError(e.message ?? "Could not remove your participation.");
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
          <p className="join-confirm-leave__text">
            Are you sure you want to leave?
          </p>
          <div className="join-confirm-leave__actions">
            <button
              className={`btn btn--primary${leaving ? " btn--loading" : ""}`}
              onClick={handleLeave}
              disabled={leaving}
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

// ── JoinModal — orchestrates screens ─────────────────────────────────────────
function JoinModal({ event, icon, savedJoin, onClose, onJoined, onLeft }) {
  const [screen, setScreen] = useState(savedJoin ? "already" : "choice");
  const [joinData, setJoinData] = useState(null);
  // Store pending join data in a ref so calling onJoined never triggers a
  const pendingJoin = useRef(null);

  function handleGuestSubmit(data) {
    saveJoin(event.id, data);
    setJoinData(data);
    setScreen("success");
    pendingJoin.current = data; // will be flushed when modal closes
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

// ── Guest participants preview ────────────────────────────────────────────────
function GuestPreview({ eventId, refreshKey, onTotal }) {
  const [guests, setGuests] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await getEventGuests(eventId);
      setGuests(Array.isArray(data) ? data : (data.data ?? []));
      if (onTotal) onTotal(data?.meta?.total ?? 0);
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
        {visible.map((g, i) => (
          <span
            key={g.id ?? i}
            className="event-card__guest-avatar"
            title={
              g.telegram_handle
                ? `${g.display_name} (${g.telegram_handle})`
                : g.display_name
            }
          >
            {g.display_name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="event-card__guests-label">
        {visible.map((g) => g.display_name).join(", ")}
        {overflow > 0 && ` +${overflow} more`}
      </span>
    </div>
  );
}

// ── EventCard ─────────────────────────────────────────────────────────────────
export default function EventCard({ event, locationMap = {} }) {
  const [showModal, setShowModal] = useState(false);
  const [savedJoin, setSavedJoin] = useState(() => getSavedJoin(event.id));
  const [refreshKey, setRefreshKey] = useState(0);

  const sportTag = detectSportTag(event.title, event.body);
  const icon = (sportTag && SPORT_EMOJIS[sportTag]) ?? "⚡";
  const difficulty = detectDifficulty(event.distance_m);

  const dateStr = formatDate(event.start_time);
  const distanceStr = formatDistance(event.distance_m);
  const durationStr = formatDuration(event.start_time, event.end_time);
  const [participants, setParticipants] = useState(
    event.participant_count ?? 0,
  );

  const startLoc = resolveLocation(event.start_location_id, locationMap);
  const endLoc = resolveLocation(event.end_location_id, locationMap);
  const locationStr =
    startLoc && endLoc
      ? `${startLoc.label} → ${endLoc.label}`
      : (startLoc?.label ?? endLoc?.label ?? null);

  const stravaUrl = event.strava_url ?? null;
  const isGoing = !!savedJoin;

  return (
    <>
      <article className="event-card" tabIndex="0">
        {/* ── Join button ── */}
        <div className="event-card__join-col">
          <button
            className={`event-card__join-btn${isGoing ? " event-card__join-btn--going" : ""}`}
            onClick={() => setShowModal(true)}
            aria-label={
              isGoing ? `You're going to ${event.title}` : `Join ${event.title}`
            }
          >
            {isGoing ? "✓ going" : "join"}
          </button>
        </div>

        {/* ── Content ── */}
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

          {/* Guest preview row */}
          <GuestPreview
            eventId={event.id}
            refreshKey={refreshKey}
            onTotal={(total) => setParticipants(total)}
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
                <StravaIcon />
                View on Strava
              </a>
            </div>
          )}
        </div>
      </article>

      {showModal && (
        <JoinModal
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
