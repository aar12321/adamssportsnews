// Lightweight habit tracking for the news feed: every time a user opens an
// article, we bump three running counters (sport, category, source) in
// localStorage. The feed reads those counts back to nudge similar items
// upward in the next render. No server, no profile sync — these are local
// browsing patterns, not a published preference, and we keep them that way.

const STORAGE_KEY = "news_habits_v1";
const MAX_AGE_DAYS = 60;
// Half-lives the counts so a binge from two months ago doesn't permanently
// distort the feed. We don't tick continuously — we only decay on read,
// which is cheap and good enough for the signal we're after.
const DECAY_PER_DAY = 0.985;

export interface HabitCounts {
  sports: Record<string, number>;
  categories: Record<string, number>;
  sources: Record<string, number>;
  updatedAt: number;
}

const empty = (): HabitCounts => ({ sports: {}, categories: {}, sources: {}, updatedAt: Date.now() });

function read(): HabitCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return empty();
    return {
      sports: parsed.sports ?? {},
      categories: parsed.categories ?? {},
      sources: parsed.sources ?? {},
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return empty();
  }
}

function write(counts: HabitCounts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {}
}

function decay(counts: HabitCounts): HabitCounts {
  const days = Math.max(0, (Date.now() - counts.updatedAt) / (24 * 60 * 60 * 1000));
  if (days < 1) return counts;
  if (days >= MAX_AGE_DAYS) return empty();
  const factor = Math.pow(DECAY_PER_DAY, days);
  const decayMap = (m: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(m)) {
      const next = v * factor;
      // Trim near-zero entries so the map doesn't grow forever as the
      // user explores new sources, sports, and categories over time.
      if (next > 0.05) out[k] = next;
    }
    return out;
  };
  return {
    sports: decayMap(counts.sports),
    categories: decayMap(counts.categories),
    sources: decayMap(counts.sources),
    updatedAt: Date.now(),
  };
}

export function getHabits(): HabitCounts {
  return decay(read());
}

export function recordArticleOpen(article: {
  sport?: string;
  sportId?: string;
  category?: string;
  detectedCategory?: string;
  source?: string;
}): void {
  const sport = (article.sport ?? article.sportId ?? "").toString().toLowerCase();
  const category = (article.detectedCategory ?? article.category ?? "").toString().toLowerCase();
  const source = (article.source ?? "").toString().toLowerCase();
  if (!sport && !category && !source) return;
  const current = decay(read());
  const bump = (m: Record<string, number>, key: string) => {
    if (!key) return;
    m[key] = (m[key] ?? 0) + 1;
  };
  bump(current.sports, sport);
  bump(current.categories, category);
  bump(current.sources, source);
  current.updatedAt = Date.now();
  write(current);
}

export function scoreArticle(
  habits: HabitCounts,
  article: { sport?: string; sportId?: string; category?: string; detectedCategory?: string; source?: string }
): number {
  const sport = (article.sport ?? article.sportId ?? "").toString().toLowerCase();
  const category = (article.detectedCategory ?? article.category ?? "").toString().toLowerCase();
  const source = (article.source ?? "").toString().toLowerCase();
  // Sport is the strongest signal of "the thing this user actually cares
  // about", source is a close second (you trust the writer), category is
  // weakest because everyone reads breaking news at least sometimes.
  const sportWeight = sport ? (habits.sports[sport] ?? 0) * 2.0 : 0;
  const sourceWeight = source ? (habits.sources[source] ?? 0) * 1.5 : 0;
  const categoryWeight = category ? (habits.categories[category] ?? 0) * 0.75 : 0;
  return sportWeight + sourceWeight + categoryWeight;
}

// Test seam — lets unit tests reset state without touching localStorage from
// the test harness directly.
export function _resetHabits(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
