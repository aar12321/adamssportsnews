import type { SportId } from "./schema";

// -----------------------------------------------------------------------------
// Shared fantasy position + slot rules.
//
// Used by both the client (to validate before adding a player locally) and
// the server (to re-validate incoming roster ops, so tampered localStorage
// can't produce an invalid roster). Keep both sides in lockstep by importing
// from here — never hand-roll sport rules in either app.
// -----------------------------------------------------------------------------

export type FantasySportKey = SportId;

// Raw ESPN/free-text position → canonical token, per sport.
export const POSITION_ALIASES: Record<FantasySportKey, Record<string, string>> = {
  basketball: {
    G: "G", GUARD: "G",
    F: "F", FORWARD: "F",
    C: "C", CENTER: "C",
    PG: "PG", "POINT GUARD": "PG",
    SG: "SG", "SHOOTING GUARD": "SG",
    SF: "SF", "SMALL FORWARD": "SF",
    PF: "PF", "POWER FORWARD": "PF",
  },
  football: {
    QB: "QB", QUARTERBACK: "QB",
    RB: "RB", "RUNNING BACK": "RB", HB: "RB", FB: "RB",
    WR: "WR", "WIDE RECEIVER": "WR",
    TE: "TE", "TIGHT END": "TE",
    K: "K", PK: "K", KICKER: "K", P: "K", PUNTER: "K",
    DEF: "DEF", DST: "DEF", "D/ST": "DEF", DEFENSE: "DEF",
  },
  soccer: {
    GK: "GK", GOALKEEPER: "GK", G: "GK",
    DEF: "DEF", D: "DEF", DEFENDER: "DEF", FULLBACK: "DEF",
    "CENTER-BACK": "DEF", "CENTRE-BACK": "DEF", CB: "DEF", FB: "DEF",
    MID: "MID", M: "MID", MIDFIELDER: "MID", CM: "MID", DM: "MID", AM: "MID",
    FWD: "FWD", F: "FWD", FORWARD: "FWD", STRIKER: "FWD",
    WINGER: "FWD", ST: "FWD", LW: "FWD", RW: "FWD", W: "FWD",
  },
  baseball: {
    C: "C", CATCHER: "C",
    "1B": "1B", "FIRST BASE": "1B", FIRSTBASEMAN: "1B",
    "2B": "2B", "SECOND BASE": "2B", SECONDBASEMAN: "2B",
    "3B": "3B", "THIRD BASE": "3B", THIRDBASEMAN: "3B",
    SS: "SS", SHORTSTOP: "SS",
    OF: "OF", LF: "OF", CF: "OF", RF: "OF",
    "LEFT FIELD": "OF", "CENTER FIELD": "OF", "RIGHT FIELD": "OF",
    OUTFIELDER: "OF", OUTFIELD: "OF",
    DH: "DH", "DESIGNATED HITTER": "DH",
    SP: "SP", "STARTING PITCHER": "SP", STARTER: "SP",
    RP: "RP", "RELIEF PITCHER": "RP", RELIEVER: "RP", CP: "RP", CLOSER: "RP",
    P: "SP", PITCHER: "SP",
  },
  hockey: {
    C: "C", CENTER: "C", CENTRE: "C",
    LW: "LW", "LEFT WING": "LW", "LEFT WINGER": "LW",
    RW: "RW", "RIGHT WING": "RW", "RIGHT WINGER": "RW",
    D: "D", DEFENSE: "D", DEFENCE: "D", DEFENSEMAN: "D", DEFENCEMAN: "D",
    G: "G", GOALIE: "G", GOALTENDER: "G",
  },
};

// Which player positions fill a given lineup slot, scoped per sport.
// "*" means the slot accepts any canonical position for that sport.
export const SLOT_ELIGIBILITY: Record<FantasySportKey, Record<string, string[]>> = {
  basketball: {
    PG: ["PG"], SG: ["SG"], SF: ["SF"], PF: ["PF"], C: ["C"],
    G: ["PG", "SG", "G"],
    F: ["SF", "PF", "F"],
    UTIL: ["*"],
    BN: ["*"], IR: ["*"],
  },
  football: {
    QB: ["QB"], RB: ["RB"], WR: ["WR"], TE: ["TE"],
    K: ["K"], DEF: ["DEF"],
    FLEX: ["RB", "WR", "TE"],
    SUPERFLEX: ["QB", "RB", "WR", "TE"],
    BN: ["*"], IR: ["*"],
  },
  soccer: {
    GK: ["GK"], DEF: ["DEF"], MID: ["MID"], FWD: ["FWD"],
    UTIL: ["*"],
    BN: ["*"], IR: ["*"],
  },
  baseball: {
    C: ["C"], "1B": ["1B"], "2B": ["2B"], "3B": ["3B"], SS: ["SS"],
    OF: ["OF"], DH: ["*"],
    SP: ["SP"], RP: ["RP"], P: ["SP", "RP"],
    UTIL: ["*"],
    BN: ["*"], IR: ["*"],
  },
  hockey: {
    C: ["C"], LW: ["LW"], RW: ["RW"], D: ["D"], G: ["G"],
    F: ["C", "LW", "RW"],
    UTIL: ["*"],
    BN: ["*"], IR: ["*"],
  },
};

// Default lineup slots per sport — what counts as a full roster and what
// positions must be fillable. The client can still render more elaborate
// UI/stats on top, but this is the source of truth for validation.
export const FANTASY_SPORT_SLOTS: Record<FantasySportKey, readonly string[]> = {
  basketball: ["PG", "SG", "SF", "PF", "C", "G", "F", "UTIL", "BN"],
  football:   ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN"],
  soccer:     ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "BN"],
  baseball:   ["C", "1B", "2B", "3B", "SS", "OF", "OF", "OF", "SP", "RP", "BN"],
  hockey:     ["C", "C", "LW", "LW", "RW", "RW", "D", "D", "G", "BN"],
};

export function isFantasySportKey(s: unknown): s is FantasySportKey {
  return typeof s === "string" && Object.prototype.hasOwnProperty.call(POSITION_ALIASES, s);
}

export function normalizeFantasyPosition(raw: string | undefined, sport: string): string {
  if (!raw || !isFantasySportKey(sport)) return "";
  const aliases = POSITION_ALIASES[sport];
  // 1) Try the whole trimmed input first so multi-token aliases like
  //    "D/ST" or "CENTER-BACK" can match verbatim before we tokenise.
  const whole = raw.toUpperCase().trim();
  if (whole && aliases[whole]) return aliases[whole];
  // 2) Fall back to the first token (for inputs like "PG/SG" or "C,F").
  const token = whole.split(/[\/,|]/)[0].trim();
  if (!token) return "";
  if (aliases[token]) return aliases[token];
  const canon = new Set(Object.values(aliases));
  if (canon.has(token)) return token;
  return "";
}

export function slotAcceptsPosition(slot: string, position: string, sport: string): boolean {
  if (!slot || !position || !isFantasySportKey(sport)) return false;
  const rules = SLOT_ELIGIBILITY[sport][slot];
  if (!rules) return false;
  if (rules.includes("*")) return true;
  return rules.includes(position);
}

/**
 * Greedy slot-assignment validator: try to fit every player on the roster
 * into the sport's lineup. Order of players does not matter — specific
 * slots fill before flex, flex before wildcard (UTIL/BN/IR).
 */
export function canFitFantasyRoster(
  roster: { position?: string }[],
  sport: string,
): boolean {
  if (!isFantasySportKey(sport)) return false;
  const slots = [...FANTASY_SPORT_SLOTS[sport]];
  const rules = SLOT_ELIGIBILITY[sport];

  const players = roster.map((p, i) => ({
    key: i,
    pos: normalizeFantasyPosition(p.position, sport),
  }));

  const specific: number[] = [];
  const flex: number[] = [];
  const wildcard: number[] = [];
  slots.forEach((s, i) => {
    const r = rules[s];
    if (!r) { specific.push(i); return; }
    if (r.includes("*")) wildcard.push(i);
    else if (r.length === 1 && r[0] === s) specific.push(i);
    else flex.push(i);
  });

  const used = new Set<number>();
  const placed = new Set<number>();

  for (const p of players) {
    if (!p.pos) continue;
    const idx = specific.find((i) => !used.has(i) && slots[i] === p.pos);
    if (idx !== undefined) { used.add(idx); placed.add(p.key); }
  }
  for (const p of players) {
    if (placed.has(p.key) || !p.pos) continue;
    const idx = flex.find((i) => !used.has(i) && slotAcceptsPosition(slots[i], p.pos, sport));
    if (idx !== undefined) { used.add(idx); placed.add(p.key); }
  }
  for (const p of players) {
    if (placed.has(p.key)) continue;
    const idx = wildcard.find((i) => !used.has(i));
    if (idx !== undefined) { used.add(idx); placed.add(p.key); }
  }

  return placed.size === players.length;
}

/**
 * Return a greedy optimal lineup for `roster` under `sport`'s slot rules.
 * Players with the highest `projectedPoints` go in first, filling specific
 * slots before flex before wildcard. Anything that can't fit lands in the
 * BN (bench) slot or, if BN is already full, the `unfit` list.
 *
 * Pure: never mutates `roster`. Consumers should treat the output as
 * advisory (a start/sit recommender), not as a state change.
 */
export function assignFantasyLineup<
  P extends { position?: string; projectedPoints?: number | null; id?: string }
>(
  roster: P[],
  sport: string,
): {
  starters: { player: P; slot: string }[];
  bench: P[];
  unfit: P[];
} | null {
  if (!isFantasySportKey(sport)) return null;
  const slots = [...FANTASY_SPORT_SLOTS[sport]];
  const rules = SLOT_ELIGIBILITY[sport];

  const byProjectionDesc = roster
    .map((p, idx) => ({ p, idx, proj: Number(p.projectedPoints) || 0 }))
    .sort((a, b) => b.proj - a.proj)
    .map(({ p, idx }) => ({
      p,
      idx,
      pos: normalizeFantasyPosition(p.position, sport),
    }));

  const specific: number[] = [];
  const flex: number[] = [];
  const wildcard: number[] = [];
  const bench: number[] = [];
  slots.forEach((s, i) => {
    if (s === "BN" || s === "IR") {
      bench.push(i);
      return;
    }
    const r = rules[s];
    if (!r) { specific.push(i); return; }
    if (r.includes("*")) wildcard.push(i);
    else if (r.length === 1 && r[0] === s) specific.push(i);
    else flex.push(i);
  });

  const used = new Set<number>();
  const placedIdx = new Set<number>();
  const starters: { player: P; slot: string }[] = [];
  const benched: P[] = [];
  const unfit: P[] = [];

  const claim = (slotIdx: number, p: P, idx: number) => {
    used.add(slotIdx);
    placedIdx.add(idx);
    starters.push({ player: p, slot: slots[slotIdx] });
  };

  // Fill specific slots first.
  for (const { p, idx, pos } of byProjectionDesc) {
    if (!pos) continue;
    const i = specific.find((s) => !used.has(s) && slots[s] === pos);
    if (i !== undefined) claim(i, p, idx);
  }
  // Then flex slots for remaining players.
  for (const { p, idx, pos } of byProjectionDesc) {
    if (placedIdx.has(idx) || !pos) continue;
    const i = flex.find((s) => !used.has(s) && slotAcceptsPosition(slots[s], pos, sport));
    if (i !== undefined) claim(i, p, idx);
  }
  // Wildcard (UTIL etc) for anyone still unplaced.
  for (const { p, idx } of byProjectionDesc) {
    if (placedIdx.has(idx)) continue;
    const i = wildcard.find((s) => !used.has(s));
    if (i !== undefined) claim(i, p, idx);
  }
  // Overflow to bench, then unfit.
  for (const { p, idx } of byProjectionDesc) {
    if (placedIdx.has(idx)) continue;
    const i = bench.find((s) => !used.has(s));
    if (i !== undefined) {
      used.add(i);
      placedIdx.add(idx);
      benched.push(p);
    } else {
      unfit.push(p);
    }
  }

  return { starters, bench: benched, unfit };
}

export function fantasyPositionCapacity(
  roster: { position?: string }[],
  position: string,
  sport: string,
): { current: number; max: number } {
  if (!isFantasySportKey(sport)) return { current: 0, max: 0 };
  const normPos = normalizeFantasyPosition(position, sport);
  if (!normPos) return { current: 0, max: 0 };
  const current = roster.filter(
    (p) => normalizeFantasyPosition(p.position, sport) === normPos,
  ).length;
  const rules = SLOT_ELIGIBILITY[sport];
  let max = 0;
  for (const slot of FANTASY_SPORT_SLOTS[sport]) {
    const r = rules[slot];
    if (!r) { if (slot === normPos) max++; continue; }
    if (r.includes("*")) max++;
    else if (r.includes(normPos)) max++;
  }
  return { current, max };
}

export type RosterValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateRosterAddition(
  roster: { id: string; position?: string; sport?: string }[],
  player: { id: string; position?: string; sport?: string },
  sport: string,
): RosterValidationResult {
  if (!isFantasySportKey(sport)) {
    return { ok: false, reason: `Unknown sport: ${sport}` };
  }
  if (player.sport && player.sport !== sport) {
    return {
      ok: false,
      reason: `That player is a ${player.sport} player, not ${sport}`,
    };
  }
  if (roster.some((p) => p.id === player.id)) {
    return { ok: false, reason: "Already on your roster" };
  }
  const maxSize = FANTASY_SPORT_SLOTS[sport].length;
  if (roster.length >= maxSize) {
    return { ok: false, reason: `Roster is full (${maxSize} players max)` };
  }
  const playerPos = normalizeFantasyPosition(player.position, sport);
  if (!playerPos) {
    return {
      ok: false,
      reason: `Position "${player.position || "unknown"}" isn't valid for ${sport}`,
    };
  }
  const { current, max } = fantasyPositionCapacity(roster, player.position || "", sport);
  if (max === 0) {
    return { ok: false, reason: `${playerPos} has no slot in this lineup` };
  }
  if (current >= max) {
    return {
      ok: false,
      reason: `${playerPos} slots are full (${current}/${max}) — drop a ${playerPos} first`,
    };
  }
  if (!canFitFantasyRoster([...roster, player], sport)) {
    return { ok: false, reason: `No open slot for a ${playerPos} player` };
  }
  return { ok: true };
}
