import { useState } from "react";
import { getNewsArticle } from "../api/client.js";
import { useFetch } from "../hooks/useFetch.js";
import "./NewsCard.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function excerpt(text, maxChars = 120) {
  if (!text) return null;
  return text.length <= maxChars
    ? text
    : text.slice(0, maxChars).trimEnd() + "…";
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function toAbsolute(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}

// ── Comment inside article drawer ─────────────────────────────────────────────
function Comment({ comment }) {
  return (
    <div className="article-comment">
      <div className="article-comment__avatar" aria-hidden="true">
        {(comment.author?.username ?? comment.user_id ?? "?")
          .toString()
          .charAt(0)
          .toUpperCase()}
      </div>
      <div className="article-comment__body">
        <span className="article-comment__author">
          {comment.author?.username ?? `User #${comment.user_id}`}
        </span>
        <p className="article-comment__text">{comment.body}</p>
        {comment.created_at && (
          <span className="article-comment__date">
            {formatDate(comment.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Article detail drawer (slide-up modal) ────────────────────────────────────
function ArticleDrawer({ articleId, title, onClose }) {
  const { data, loading, error } = useFetch(
    () => getNewsArticle(articleId),
    [articleId],
  );

  const article = data;
  const comments = article?.comments ?? [];

  return (
    <div
      className="article-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="article-overlay__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="article-drawer">
        {/* Handle */}
        <div className="article-drawer__handle" aria-hidden="true" />

        {/* Header */}
        <div className="article-drawer__header">
          <span className="article-drawer__label">News</span>
          <button
            className="article-drawer__close"
            onClick={onClose}
            aria-label="Close article"
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

        {/* Scrollable content */}
        <div className="article-drawer__scroll">
          {loading && (
            <div className="article-drawer__loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton article-drawer__skel-line"
                  style={{ width: i === 3 ? "55%" : "100%" }}
                />
              ))}
            </div>
          )}

          {error && (
            <p className="article-drawer__error">
              Couldn't load article — {error}
            </p>
          )}

          {article && (
            <>
              {/* Cover photo */}
              {article.photo_url && (
                <img
                  src={toAbsolute(article.photo_url)}
                  alt={article.title}
                  className="article-drawer__photo"
                  loading="lazy"
                  width="680"
                  height="300"
                />
              )}

              {/* Title */}
              <h2 className="article-drawer__title">{article.title}</h2>

              {/* Meta */}
              {(article.published_at || article.created_at) && (
                <p className="article-drawer__date">
                  {formatDate(article.published_at ?? article.created_at)}
                </p>
              )}

              {/* Body */}
              {article.body ? (
                <div className="article-drawer__content">
                  {article.body
                    .split("\n")
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>
              ) : (
                <p className="article-drawer__empty-body">
                  No content available.
                </p>
              )}

              {/* Comments */}
              {comments.length > 0 && (
                <section className="article-drawer__comments">
                  <h3 className="article-drawer__comments-title">
                    {comments.length} comment{comments.length !== 1 ? "s" : ""}
                  </h3>
                  <div className="article-drawer__comments-list">
                    {comments.map((c) => (
                      <Comment key={c.id} comment={c} />
                    ))}
                  </div>
                </section>
              )}

              {comments.length === 0 && !loading && (
                <p className="article-drawer__no-comments">
                  No comments yet. Sign in to be the first!
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NewsCard ───────────────────────────────────────────────────────────────────
export default function NewsCard({ article, featured = false }) {
  const [open, setOpen] = useState(false);
  const dateStr = formatDate(article.published_at ?? article.created_at);
  const bodyExcerpt = excerpt(article.body, featured ? 160 : 110);

  return (
    <>
      <article
        className={`news-card${featured ? " news-card--featured" : ""}`}
        onClick={() => setOpen(true)}
        tabIndex="0"
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        role="button"
        aria-label={`Read: ${article.title}`}
      >
        {/* Cover photo */}
        {article.photo_url && (
          <div className="news-card__photo-wrap">
            <img
              src={toAbsolute(article.photo_url)}
              alt={article.title}
              className="news-card__photo"
              loading="lazy"
              width="680"
              height="220"
            />
          </div>
        )}

        {/* No photo — accent stripe */}
        {!article.photo_url && (
          <div className="news-card__stripe" aria-hidden="true" />
        )}

        <div className="news-card__body">
          <span className="news-card__tag">Campus Motion</span>
          <h3 className="news-card__title">{article.title}</h3>
          {bodyExcerpt && <p className="news-card__excerpt">{bodyExcerpt}</p>}
          <div className="news-card__footer">
            {dateStr && <span className="news-card__date">{dateStr}</span>}
            <span className="news-card__read-more">
              Read more
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </article>

      {open && (
        <ArticleDrawer
          articleId={article.id}
          title={article.title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
