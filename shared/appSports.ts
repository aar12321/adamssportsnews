import type { SportId } from "./schema";

/** All sports supported across Apps hub, Betting, Fantasy, Analyst */
export const APP_SPORTS: { id: SportId; label: string; shortLabel: string }[] = [
  { id: "basketball", label: "NBA", shortLabel: "NBA" },
  { id: "football", label: "NFL", shortLabel: "NFL" },
  { id: "soccer", label: "Premier League", shortLabel: "EPL" },
  { id: "baseball", label: "MLB", shortLabel: "MLB" },
  { id: "hockey", label: "NHL", shortLabel: "NHL" },
];

export function isAppSportId(s: string): s is SportId {
  return APP_SPORTS.some((x) => x.id === s);
}

/** Filter APP_SPORTS to only include the user's favorite sports (or all if none selected) */
export function getUserAppSports(favoriteSports: SportId[]): typeof APP_SPORTS {
  if (!favoriteSports || favoriteSports.length === 0) return APP_SPORTS;
  const filtered = APP_SPORTS.filter((s) => favoriteSports.includes(s.id));
  return filtered.length > 0 ? filtered : APP_SPORTS;
}
