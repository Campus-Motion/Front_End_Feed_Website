const RULES = [
  {
    tag: "run",
    re: /\b(run|running|5k|10k|marathon|sprint|trail\s*run|jogging)\b/i,
  },
  { tag: "hike", re: /\b(hike|hiking|trek|trekking|trail|blazer)\b/i },
  { tag: "walk", re: /\b(walk|walking|stroll)\b/i },
  { tag: "swim", re: /\b(swim|swimming|pool|lake)\b/i },
  { tag: "cycle", re: /\b(cycle|cycling|bike|biking|velo|vélo)\b/i },
  { tag: "yoga", re: /\b(yoga|pilates|stretch)\b/i },
  { tag: "climb", re: /\b(climb|climbing|boulder)\b/i },
];

export function detectSportTag(title = "", body = "") {
  const text = `${title} ${body ?? ""}`;
  for (const { tag, re } of RULES) {
    if (re.test(text)) return tag;
  }
  return null;
}

export const SPORT_LABELS = {
  run: "Run",
  hike: "Hike",
  walk: "Walk",
  swim: "Swim",
  cycle: "Cycle",
  yoga: "Yoga",
  climb: "Climb",
};

export const SPORT_EMOJIS = {
  run: "🏃",
  hike: "🥾",
  walk: "🚶",
  swim: "🏊",
  cycle: "🚴",
  yoga: "🧘",
  climb: "🧗",
  triathlon: "🏅",
  fitness_trail: "🛤️",
  volleyball: "🏐",
  basketball: "🏀",
  soccer: "⚽",
  badminton: "🏸",
  tennis: "🎾",
  golf: "⛳",
};

export function detectDifficulty(distance_m) {
  if (!distance_m) return null;
  if (distance_m < 5000) return "easy";
  if (distance_m < 15000) return "moderate";
  return "hard";
}

export const DIFFICULTY_LABELS = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};
export const DIFFICULTY_COLORS = {
  easy: "var(--color-success, #437a22)",
  moderate: "var(--color-warning, #964219)",
  hard: "var(--color-primary)",
};
