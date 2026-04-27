import './EventSkeleton.css';

export default function EventSkeleton() {
  return (
    <div className="event-skeleton" aria-hidden="true">
      <div className="event-skeleton__join skeleton" />
      <div className="event-skeleton__content">
        <div className="event-skeleton__title skeleton" />
        <div className="event-skeleton__line skeleton" />
        <div className="event-skeleton__line skeleton" style={{ width: '65%' }} />
        <div className="event-skeleton__line skeleton" style={{ width: '50%' }} />
      </div>
    </div>
  );
}
