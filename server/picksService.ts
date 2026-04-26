import type {
  PickableGame,
  UserPick,
  PickResult,
  PickLeaderboardEntry,
  Score,
  SportId,
} from "@shared/schema";
import { readSnapshot, scheduleSnapshot } from "./persistence";
import { scoresService } from "./scoresService";

// Picks live in two parallel maps so the file format stays simple and the
// look-up paths the routes need are O(1):
//   - byUser[userId][gameId]   → that user's pick for that game
//   - byGame[gameId][userId]   → all picks for a game (used at settlement)
// Both are keyed by the same stable `gameId` the live-scores feed emits,
// so when a game finishes, we just walk byGame[gameId] and stamp results.

interface PicksSnapshot {
  byUser: Record<string, Record<string, UserPick>>;
  byGame: Record<string, Record<string, UserPick>>;
}

const SNAPSHOT_NAME = "picks";

const initial = readSnapshot<PicksSnapshot>(SNAPSHOT_NAME, { byUser: {}, byGame: {} });
const byUser: Map<string, Map<string, UserPick>> = new Map(
  Object.entries(initial.byUser ?? {}).map(([uid, picks]) => [uid, new Map(Object.entries(picks))])
);
const byGame: Map<string, Map<string, UserPick>> = new Map(
  Object.entries(initial.byGame ?? {}).map(([gid, picks]) => [gid, new Map(Object.entries(picks))])
);

function persist() {
  scheduleSnapshot(SNAPSHOT_NAME, () => {
    const out: PicksSnapshot = { byUser: {}, byGame: {} };
    byUser.forEach((picks, uid) => { out.byUser[uid] = Object.fromEntries(picks); });
    byGame.forEach((picks, gid) => { out.byGame[gid] = Object.fromEntries(picks); });
    return out;
  });
}

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  const now = new Date();
  return (
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate()
  );
}

function toPickable(s: Score): PickableGame {
  return {
    gameId: s.id,
    sportId: (s.sportId as SportId) ?? "basketball",
    league: s.league,
    homeTeam: s.homeTeam,
    awayTeam: s.awayTeam,
    startTime: s.startTime,
    locked: s.status !== "scheduled" || new Date(s.startTime).getTime() <= Date.now(),
  };
}

export const picksService = {
  /** Today's pickable slate, scoped to a single sport when provided. */
  async getTodaySlate(sportId?: SportId): Promise<PickableGame[]> {
    const scores = await scoresService.getLiveScores(sportId, true);
    return scores
      .filter((s) => isToday(s.startTime))
      .map(toPickable)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },

  /** Submit a pick. Locks once the game has started. */
  submit(input: {
    userId: string;
    displayName: string;
    gameId: string;
    selection: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
  }): { ok: true; pick: UserPick } | { ok: false; error: string } {
    if (Date.now() >= new Date(input.startTime).getTime()) {
      return { ok: false, error: "Picks are locked — the game already started." };
    }
    if (input.selection !== input.homeTeam && input.selection !== input.awayTeam) {
      return { ok: false, error: "Pick must be either the home or the away team." };
    }
    const pick: UserPick = {
      userId: input.userId,
      displayName: input.displayName,
      gameId: input.gameId,
      selection: input.selection,
      submittedAt: new Date().toISOString(),
      result: "pending",
    };
    if (!byUser.has(input.userId)) byUser.set(input.userId, new Map());
    if (!byGame.has(input.gameId)) byGame.set(input.gameId, new Map());
    byUser.get(input.userId)!.set(input.gameId, pick);
    byGame.get(input.gameId)!.set(input.userId, pick);
    persist();
    return { ok: true, pick };
  },

  /** All picks the given user has made (any sport, any date). */
  forUser(userId: string): UserPick[] {
    const map = byUser.get(userId);
    return map ? Array.from(map.values()) : [];
  },

  /**
   * Walk finished scores and stamp won/lost/push on the matching picks.
   * Idempotent: existing settled picks are left alone unless the score
   * itself changed since last settlement (rare but possible if the
   * upstream feed corrects a result).
   */
  async settleFinishedGames(): Promise<{ settled: number; reviewed: number }> {
    const scores = await scoresService.getLiveScores(undefined, true);
    let settled = 0;
    let reviewed = 0;
    scores.forEach((s) => {
      if (s.status !== "finished") return;
      const gamePicks = byGame.get(s.id);
      if (!gamePicks || gamePicks.size === 0) return;
      const home = s.homeScore ?? null;
      const away = s.awayScore ?? null;
      if (home === null || away === null) return;
      const winner = home > away ? s.homeTeam : home < away ? s.awayTeam : null;
      gamePicks.forEach((pick, uid) => {
        reviewed++;
        const result: PickResult =
          winner === null ? "push" : pick.selection === winner ? "won" : "lost";
        if (pick.result === result) return;
        const next: UserPick = { ...pick, result };
        gamePicks.set(uid, next);
        byUser.get(uid)?.set(s.id, next);
        settled++;
      });
    });
    if (settled > 0) persist();
    return { settled, reviewed };
  },

  /**
   * Top of the leaderboard. We rebuild from byUser each call — we expect
   * thousands of entries at most, and recomputing keeps the on-disk
   * footprint a single source of truth.
   */
  async leaderboard(limit: number = 25): Promise<PickLeaderboardEntry[]> {
    // Run a settlement pass so the leaderboard always reflects the latest
    // results even if no settle endpoint has been hit since the last
    // restart. Failures here shouldn't block the read.
    try { await this.settleFinishedGames(); } catch {}

    const entries: PickLeaderboardEntry[] = [];
    byUser.forEach((picks, uid) => {
      let correct = 0;
      let total = 0;
      let bestStreak = 0;
      let runningStreak = 0;
      const ordered = Array.from(picks.values()).sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      );
      let displayName = uid;
      ordered.forEach((p) => {
        displayName = p.displayName || displayName;
        if (p.result === "pending") return;
        total++;
        if (p.result === "won") {
          correct++;
          runningStreak++;
          if (runningStreak > bestStreak) bestStreak = runningStreak;
        } else {
          runningStreak = 0;
        }
      });
      if (total === 0) return;
      entries.push({ userId: uid, displayName, correct, total, streak: bestStreak });
    });
    entries.sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct;
      const aPct = a.total ? a.correct / a.total : 0;
      const bPct = b.total ? b.correct / b.total : 0;
      if (bPct !== aPct) return bPct - aPct;
      return b.streak - a.streak;
    });
    return entries.slice(0, limit);
  },
};
