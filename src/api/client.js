/**
 * Campus Motion — API Client
 * All public endpoints (no JWT required).
 * Base URL is read from VITE_API_BASE_URL env variable.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Query string builder ──────────────────────────────────────────────────────
function qs(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) q.set(k, v);
  }
  const str = q.toString();
  return str ? `?${str}` : "";
}

// ── Events ────────────────────────────────────────────────────────────────────
/** GET /events  — paginated upcoming events (public) */
export function getEvents({ limit = 20, offset = 0, after, before } = {}) {
  return request(`/events${qs({ limit, offset, after, before })}`);
}

/** GET /events/:id  — single event with participants (public) */
export function getEvent(id) {
  return request(`/events/${id}`);
}

/** GET /events/:id/participants  — participant list (public) */
export function getEventParticipants(id, { limit = 20, offset = 0 } = {}) {
  return request(`/events/${id}/participants${qs({ limit, offset })}`);
}

/** GET /events/:id/photos  — event photos (public) */
export function getEventPhotos(id) {
  return request(`/events/${id}/photos`);
}

// ── News ──────────────────────────────────────────────────────────────────────
/** GET /news  — published articles (public) */
export function getNews({ limit = 20, cursor, before } = {}) {
  return request(`/news${qs({ limit, cursor, before })}`);
}

/** GET /news/:id  — single article + comments (public) */
export function getNewsArticle(id) {
  return request(`/news/${id}`);
}

/** GET /comments?news_id=X  — comments on a news article (public) */
export function getNewsComments(newsId, { limit = 20, cursor } = {}) {
  return request(`/comments${qs({ news_id: newsId, limit, cursor })}`);
}

// ── Locations ─────────────────────────────────────────────────────────────────
/** GET /locations  — named locations (public) */
export function getLocations({ limit = 20, offset = 0 } = {}) {
  return request(`/locations${qs({ limit, offset })}`);
}

// ── Guest participants (no JWT required) ──────────────────────────────────────
/** POST /events/:id/guests — join as guest */
export function joinEventAsGuest(eventId, { display_name, telegram } = {}) {
  return request(`/events/${eventId}/guest_participants`, {
    method: "POST",
    body: JSON.stringify({
      display_name,
      telegram: telegram || undefined,
    }),
  });
}

/** GET /events/:id/guests — list guest participants */
export function getEventGuests(eventId) {
  return request(`/events/${eventId}/participants`);
}

/** DELETE /events/:id/guests/:token — leave event */
export function leaveEventAsGuest(eventId, token) {
  const t =
    token && typeof token === "object"
      ? (token.token ?? JSON.stringify(token))
      : token;
  return request(`/events/${eventId}/guest_participants/?token=${t}`, {
    method: "DELETE",
  });
}
