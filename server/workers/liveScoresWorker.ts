import { scoresService } from "../scoresService";
import { broadcast } from "../sse";
import type { Score, SportId } from "@shared/schema";

// -----------------------------------------------------------------------------
// Live scores broadcaster.
//
// Polls the scores service every N seconds for each tracked sport and
// diffs against the previous snapshot. Any score that changed (score,
// status, or period) is pushed out as a `score` SSE event to subscribers
// of topic "scores:<sport>".
//
// Polling is the pragmatic choice: the upstream ESPN endpoints already
// support short-lived caching via apiManager, so the only incremental
// cost is the diff. If more real-time sources come online (e.g. websocket
// feeds), swap this for an upstream push.
// -----------------------------------------------------------------------------

const SPORTS: SportId[] = ["basketball", "football", "soccer", "baseball", "hockey"];
const POLL_MS = 15_000;

type ScoreKey = string;
const lastSnapshot = new Map<SportId, Map<ScoreKey, Score>>();

function keyOf(s: Score): ScoreKey {
  return `${s.sportId}:${s.id}`;
}

function isDifferent(a: Score, b: Score): boolean {
  return (
    a.homeScore !== b.homeScore ||
    a.awayScore !== b.awayScore ||
    a.status !== b.status ||
    a.period !== b.period
  );
}

async function tick(sport: SportId): Promise<void> {
  try {
    const current = await scoresService.getLiveScores(sport, true);
    const prev = lastSnapshot.get(sport) ?? new Map();
    const next = new Map<ScoreKey, Score>();
    for (const score of current) {
      const key = keyOf(score);
      next.set(key, score);
      const before = prev.get(key);
      if (!before || isDifferent(before, score)) {
        broadcast([`scores:${sport}`, "scores:all"], "score", score);
      }
    }
    // Emit "finished" events for games that dropped out of the list
    prev.forEach((before, key) => {
      if (!next.has(key)) {
        broadcast([`scores:${sport}`, "scores:all"], "score-finished", before);
      }
    });
    lastSnapshot.set(sport, next);
  } catch (err) {
    console.error(`[liveScoresWorker] ${sport} failed:`, err);
  }
}

let started = false;
const intervals: NodeJS.Timeout[] = [];

export function startLiveScoresWorker(): void {
  if (started) return;
  started = true;
  for (const sport of SPORTS) {
    // Stagger initial ticks so all five sports don't hammer ESPN at once.
    const offset = SPORTS.indexOf(sport) * 2000;
    setTimeout(() => {
      void tick(sport);
      intervals.push(setInterval(() => void tick(sport), POLL_MS));
    }, offset);
  }
  console.log("[liveScoresWorker] started");
}

export function stopLiveScoresWorker(): void {
  for (const i of intervals) clearInterval(i);
  intervals.length = 0;
  started = false;
}
