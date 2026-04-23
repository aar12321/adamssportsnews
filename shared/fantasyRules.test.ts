import { describe, it, expect } from "vitest";
import {
  assignFantasyLineup,
  canFitFantasyRoster,
  fantasyPositionCapacity,
  isFantasySportKey,
  normalizeFantasyPosition,
  slotAcceptsPosition,
  validateRosterAddition,
} from "./fantasyRules";

const p = (id: string, position: string, projectedPoints = 0, sport = "basketball", name = id) => ({
  id, name, position, projectedPoints, sport,
});

describe("isFantasySportKey", () => {
  it("accepts every supported sport", () => {
    ["basketball", "football", "soccer", "baseball", "hockey"].forEach(s => {
      expect(isFantasySportKey(s)).toBe(true);
    });
  });
  it("rejects unknown sports", () => {
    expect(isFantasySportKey("cricket")).toBe(false);
    expect(isFantasySportKey("")).toBe(false);
    expect(isFantasySportKey(undefined as any)).toBe(false);
  });
});

describe("normalizeFantasyPosition", () => {
  it("canonicalises basketball aliases", () => {
    expect(normalizeFantasyPosition("point guard", "basketball")).toBe("PG");
    expect(normalizeFantasyPosition("PG", "basketball")).toBe("PG");
    expect(normalizeFantasyPosition("SG", "basketball")).toBe("SG");
  });
  it("handles football secondary-position strings", () => {
    expect(normalizeFantasyPosition("HB", "football")).toBe("RB");
    expect(normalizeFantasyPosition("D/ST", "football")).toBe("DEF");
  });
  it("returns empty string for unknown position", () => {
    expect(normalizeFantasyPosition("garbage", "basketball")).toBe("");
  });
});

describe("slotAcceptsPosition", () => {
  it("FLEX accepts RB / WR / TE in football", () => {
    expect(slotAcceptsPosition("FLEX", "RB", "football")).toBe(true);
    expect(slotAcceptsPosition("FLEX", "WR", "football")).toBe(true);
    expect(slotAcceptsPosition("FLEX", "QB", "football")).toBe(false);
  });
  it("UTIL is a wildcard everywhere", () => {
    expect(slotAcceptsPosition("UTIL", "PG", "basketball")).toBe(true);
    expect(slotAcceptsPosition("UTIL", "C", "baseball")).toBe(true);
  });
  it("G accepts both guard positions in basketball", () => {
    expect(slotAcceptsPosition("G", "PG", "basketball")).toBe(true);
    expect(slotAcceptsPosition("G", "SG", "basketball")).toBe(true);
    expect(slotAcceptsPosition("G", "C", "basketball")).toBe(false);
  });
});

describe("canFitFantasyRoster", () => {
  it("accepts an empty roster", () => {
    expect(canFitFantasyRoster([], "basketball")).toBe(true);
  });
  it("fits a standard basketball lineup", () => {
    const roster = [
      p("1", "PG"), p("2", "SG"), p("3", "SF"), p("4", "PF"),
      p("5", "C"), p("6", "PG"), p("7", "PF"), p("8", "SG"), p("9", "C"),
    ];
    expect(canFitFantasyRoster(roster, "basketball")).toBe(true);
  });
  it("rejects a roster that can't be laid out", () => {
    // 10 centers: basketball has at most 1 C slot + UTIL + BN, so ~3 fit.
    const roster = Array.from({ length: 10 }, (_, i) => p(String(i), "C"));
    expect(canFitFantasyRoster(roster, "basketball")).toBe(false);
  });
});

describe("fantasyPositionCapacity", () => {
  it("reports current/max per position", () => {
    const cap = fantasyPositionCapacity([], "PG", "basketball");
    expect(cap.current).toBe(0);
    expect(cap.max).toBeGreaterThan(0);
  });
  it("increments current as same-position players are added", () => {
    const before = fantasyPositionCapacity([], "QB", "football");
    const after = fantasyPositionCapacity([p("1", "QB")], "QB", "football");
    expect(after.current).toBe(before.current + 1);
    expect(after.max).toBe(before.max);
  });
  it("returns zeros for unknown sport/position", () => {
    expect(fantasyPositionCapacity([], "PG", "cricket")).toEqual({ current: 0, max: 0 });
    expect(fantasyPositionCapacity([], "garbage", "basketball")).toEqual({ current: 0, max: 0 });
  });
});

describe("validateRosterAddition", () => {
  it("rejects cross-sport players", () => {
    const result = validateRosterAddition(
      [],
      { id: "x", position: "PG", sport: "football" },
      "basketball"
    );
    expect(result.ok).toBe(false);
  });
  it("accepts a legal add", () => {
    const result = validateRosterAddition([], { id: "x", position: "PG" }, "basketball");
    expect(result.ok).toBe(true);
  });
  it("rejects the same player twice", () => {
    const current = [{ id: "x", position: "PG" }];
    const result = validateRosterAddition(current, { id: "x", position: "PG" }, "basketball");
    expect(result.ok).toBe(false);
  });
});

describe("assignFantasyLineup (start/sit recommender)", () => {
  it("always puts the highest-projected player into the specific slot", () => {
    // Mixed positions, all bigger than the role-players at their slot.
    const roster = [
      p("top-pg", "PG", 50), p("low-pg", "PG", 5),
      p("top-sg", "SG", 40), p("top-sf", "SF", 35),
      p("top-pf", "PF", 30), p("top-c", "C", 25),
    ];
    const lineup = assignFantasyLineup(roster, "basketball");
    expect(lineup).not.toBeNull();
    // PG specific slot must be the 50-pt one, not the 5-pt one.
    const pgStarter = lineup!.starters.find(s => s.slot === "PG");
    expect(pgStarter?.player.id).toBe("top-pg");
  });

  it("pushes overflow players into BN or unfit lists", () => {
    // Basketball has PG, SG, SF, PF, C, G, F, UTIL, BN — 8 starters + 1 bench.
    // Put 10 legal players in and make sure exactly 1 is not a starter.
    const roster = [
      p("1", "PG", 50), p("2", "SG", 45), p("3", "SF", 40), p("4", "PF", 35),
      p("5", "C", 30), p("6", "PG", 25), p("7", "SF", 20), p("8", "SG", 15),
      p("9", "C", 10), p("10", "PF", 5),
    ];
    const lineup = assignFantasyLineup(roster, "basketball");
    expect(lineup).not.toBeNull();
    const placed = lineup!.starters.length + lineup!.bench.length;
    // Everyone who projects has to land somewhere (starter + bench + unfit
    // adds up to the whole roster).
    expect(placed + lineup!.unfit.length).toBe(roster.length);
    // The lowest-projection player (id=10, 5pts) should NOT be in starters.
    const starterIds = lineup!.starters.map(s => s.player.id);
    expect(starterIds).not.toContain("10");
  });

  it("returns null for unknown sport", () => {
    expect(assignFantasyLineup([], "cricket")).toBeNull();
  });

  it("does not mutate the input roster", () => {
    const roster = [p("1", "PG", 10), p("2", "SG", 20)];
    const snapshot = JSON.stringify(roster);
    assignFantasyLineup(roster, "basketball");
    expect(JSON.stringify(roster)).toBe(snapshot);
  });
});
