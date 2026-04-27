import './NewsSkeleton.css';

export default function NewsSkeleton({ featured = false }) {
  return (
    <div className={`news-skeleton${featured ? ' news-skeleton--featured' : ''}`} aria-hidden="true">
      {featured && <div className="news-skeleton__photo skeleton" />}
      <div className="news-skeleton__body">
        <div className="news-skeleton__tag skeleton" />
        <div className="news-skeleton__title skeleton" />
        {featured && <div className="news-skeleton__title skeleton" style={{ width: '70%' }} />}
        <div className="news-skeleton__line skeleton" />
        <div className="news-skeleton__line skeleton" style={{ width: '60%' }} />
        <div className="news-skeleton__meta skeleton" />
      </div>
    </div>
  );
}
