import { useCallback } from 'react';
import { usePaginatedFetch } from '../hooks/useFetch.js';
import { getNews } from '../api/client.js';
import NewsCard from '../components/NewsCard.jsx';
import NewsSkeleton from '../components/NewsSkeleton.jsx';
import './NewsPage.css';

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="news-empty">
      <div className="news-empty__icon" aria-hidden="true">📰</div>
      <h3 className="news-empty__title">Nothing published yet</h3>
      <p className="news-empty__text">
        Campus Motion news and announcements will appear here once published by the team.
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div className="news-error">
      <div className="news-error__icon" aria-hidden="true">⚠️</div>
      <h3 className="news-error__title">Couldn't load news</h3>
      <p className="news-error__text">{message}</p>
      <button className="btn btn--ghost" onClick={onRetry}>Try again</button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewsPage() {
  const fetcher = useCallback(
    ({ limit, offset }) => getNews({ limit, offset }),
    []
  );

  const { items, meta, loading, error, loadMore, refresh, hasMore } =
    usePaginatedFetch(fetcher);

  const initialLoad = loading && items.length === 0;

  // First item is featured (larger card), rest are standard
  const [featured, ...rest] = items;

  return (
    <div className="news-page">
      {/* ── Header ── */}
      <div className="news-header">
        <h1 className="news-header__title">News</h1>
        {meta && !loading && (
          <p className="news-header__count">
            {meta.total} article{meta.total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Content ── */}
      <div className="news-content">
        {/* Initial skeleton */}
        {initialLoad && (
          <>
            <NewsSkeleton featured />
            <div className="news-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <NewsSkeleton key={i} />
              ))}
            </div>
          </>
        )}

        {/* Error */}
        {error && !loading && (
          <ErrorState message={error} onRetry={refresh} />
        )}

        {/* Empty */}
        {!loading && !error && items.length === 0 && <EmptyState />}

        {/* Featured first article */}
        {featured && (
          <NewsCard article={featured} featured />
        )}

        {/* Rest in a responsive grid */}
        {rest.length > 0 && (
          <div className="news-grid">
            {rest.map(article => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Load-more skeleton */}
        {loading && items.length > 0 && (
          <div className="news-grid">
            <NewsSkeleton />
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && (
          <div className="news-load-more-wrap">
            <button className="feed-load-more" onClick={loadMore}>
              Load more articles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
