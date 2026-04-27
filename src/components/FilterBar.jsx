import { useMemo } from 'react';
import {
  detectSportTag, detectDifficulty,
  SPORT_LABELS, SPORT_EMOJIS,
  DIFFICULTY_LABELS, DIFFICULTY_COLORS,
} from '../utils/sportTag.js';
import './FilterBar.css';

/**
 * FilterBar — derives available sport + difficulty chips from the loaded events.
 * Props:
 *   events        – full list of loaded events (used to build chip set)
 *   activeSport   – currently active sport tag or null
 *   activeDiff    – currently active difficulty tag or null
 *   onSport       – (tag|null) => void
 *   onDifficulty  – (tag|null) => void
 *   totalShown    – number of events after filtering (for the counter)
 */
export default function FilterBar({
  events = [],
  activeSport,
  activeDiff,
  onSport,
  onDifficulty,
  totalShown,
}) {
  // Derive which sport tags actually exist in the loaded events
  const availableSports = useMemo(() => {
    const seen = new Set();
    events.forEach(e => {
      const tag = detectSportTag(e.title, e.body);
      if (tag) seen.add(tag);
    });
    return [...seen];
  }, [events]);

  // Derive which difficulty tiers exist
  const availableDiffs = useMemo(() => {
    const seen = new Set();
    events.forEach(e => {
      const d = detectDifficulty(e.distance_m);
      if (d) seen.add(d);
    });
    return ['easy', 'moderate', 'hard'].filter(d => seen.has(d));
  }, [events]);

  const hasFilters = activeSport || activeDiff;

  return (
    <div className="filter-bar">
      <div className="filter-bar__scroll">

        {/* ── All / reset ── */}
        <button
          className={`filter-chip${!hasFilters ? ' filter-chip--active' : ''}`}
          onClick={() => { onSport(null); onDifficulty(null); }}
          aria-pressed={!hasFilters}
        >
          All
          {totalShown != null && !hasFilters && (
            <span className="filter-chip__count">{totalShown}</span>
          )}
        </button>

        {/* ── Sport chips ── */}
        {availableSports.map(tag => (
          <button
            key={tag}
            className={`filter-chip${activeSport === tag ? ' filter-chip--active' : ''}`}
            onClick={() => onSport(activeSport === tag ? null : tag)}
            aria-pressed={activeSport === tag}
          >
            <span aria-hidden="true">{SPORT_EMOJIS[tag]}</span>
            {SPORT_LABELS[tag]}
          </button>
        ))}

        {/* ── Divider between sport + difficulty ── */}
        {availableDiffs.length > 0 && availableSports.length > 0 && (
          <span className="filter-bar__sep" aria-hidden="true" />
        )}

        {/* ── Difficulty chips ── */}
        {availableDiffs.map(tag => (
          <button
            key={tag}
            className={`filter-chip filter-chip--diff${activeDiff === tag ? ' filter-chip--active' : ''}`}
            style={activeDiff === tag ? { '--chip-accent': DIFFICULTY_COLORS[tag] } : {}}
            onClick={() => onDifficulty(activeDiff === tag ? null : tag)}
            aria-pressed={activeDiff === tag}
          >
            {DIFFICULTY_LABELS[tag]}
          </button>
        ))}

        {/* ── Active count badge ── */}
        {hasFilters && totalShown != null && (
          <span className="filter-bar__results">
            {totalShown} result{totalShown !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
