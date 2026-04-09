import type { SportId } from "./schema";

/** Sports exposed across Apps hub, Betting, Fantasy, Analyst */
export const APP_SPORTS: { id: SportId; label: string; shortLabel: string }[] = [
  { id: "basketball", label: "NBA", shortLabel: "NBA" },
  { id: "football", label: "NFL", shortLabel: "NFL" },
  { id: "soccer", label: "Premier League", shortLabel: "EPL" },
];

export function isAppSportId(s: string): s is SportId {
  return APP_SPORTS.some((x) => x.id === s);
}
