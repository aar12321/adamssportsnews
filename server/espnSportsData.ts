import type { SportId } from "@shared/schema";
import type { TeamStats, PlayerStats } from "@shared/schema";

const CACHE_TTL_MS = 15 * 60 * 1000;
// Short TTL on empty results so a 404 (e.g. off-season NBA leaders) doesn't
// retry on every request, but we still probe again every minute in case
// ESPN is back.
const NEGATIVE_TTL_MS = 60 * 1000;

type CacheEntry<T> = { data: T; at: number };

const ESPN_CONFIG: Record<
  SportId,
  { teamsPath: string; standingsPath: string; leadersPath: string; leagueName: string } | null
> = {
  basketball: {
    teamsPath: "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=500",
    standingsPath: "http://site.api.espn.com/apis/v2/sports/basketball/nba/standings?seasontype=2",
    leadersPath: "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/leaders",
    leagueName: "NBA",
  },
  football: {
    teamsPath: "http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=500",
    standingsPath: "http://site.api.espn.com/apis/v2/sports/football/nfl/standings?seasontype=2",
    leadersPath: "http://site.api.espn.com/apis/site/v2/sports/football/nfl/leaders",
    leagueName: "NFL",
  },
  soccer: {
    teamsPath: "http://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams?limit=500",
    standingsPath: "http://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings",
    leadersPath: "http://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/leaders",
    leagueName: "Premier League",
  },
  baseball: null,
  hockey: null,
};

let teamsCache: Partial<Record<SportId, CacheEntry<TeamStats[]>>> = {};

// In-flight dedupe: if a fetch is already running for a sport, concurrent
// callers share the same Promise instead of firing the ESPN API twice.
const inflightTeams = new Map<SportId, Promise<TeamStats[]>>();
const inflightLeaders = new Map<string, Promise<PlayerStats[]>>();
let leadersCache: Partial<Record<SportId, CacheEntry<PlayerStats[]>>> = {};

function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function parseStandingsMap(data: any): Map<string, { wins: number; losses: number; ties?: number }> {
  const map = new Map<string, { wins: number; losses: number; ties?: number }>();
  const collectEntries = (node: any): any[] => {
    const out: any[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (Array.isArray(n.entries)) {
        for (const e of n.entries) out.push(e);
      }
      if (n.standings) walk(n.standings);
      if (Array.isArray(n.children)) {
        for (const c of n.children) walk(c);
      }
    };
    walk(node);
    return out;
  };
  const walked = collectEntries(data);
  const entries =
    walked.length > 0
      ? walked
      : data?.children?.[0]?.standings?.entries || data?.standings?.entries || [];
  for (const entry of entries) {
    const team = entry?.team;
    const id = team?.id != null ? String(team.id) : "";
    const stats = entry?.stats || [];
    let wins = 0;
    let losses = 0;
    let ties = 0;
    for (const s of stats) {
      const name = s?.name || s?.type;
      const val = safeNum(s?.value);
      if (name === "wins" || name === "W") wins = val;
      if (name === "losses" || name === "L") losses = val;
      if (name === "ties" || name === "T") ties = val;
    }
    if (id) map.set(id, { wins, losses, ties });
  }
  return map;
}

function teamStatsFromEspnTeam(
  sport: SportId,
  leagueName: string,
  team: any,
  standing?: { wins: number; losses: number; ties?: number }
): TeamStats {
  const id = String(team?.id ?? team?.uid ?? "");
  const name = team?.displayName || `${team?.location || ""} ${team?.name || ""}`.trim() || "Unknown";
  const abbr = team?.abbreviation || name.slice(0, 3).toUpperCase();
  const w = standing?.wins ?? 0;
  const l = standing?.losses ?? 0;
  const t = standing?.ties ?? 0;
  const played = w + l + t;
  const winPct = played > 0 ? w / played : 0;
  const record = t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;

  return {
    id: `espn-${sport}-${id}`,
    name,
    abbreviation: abbr,
    sport,
    league: leagueName,
    record,
    wins: w,
    losses: l,
    ties: t,
    winPct,
    pointsPerGame: sport === "soccer" ? 1.4 : sport === "football" ? 22 : 110,
    pointsAllowed: sport === "soccer" ? 1.2 : sport === "football" ? 21 : 108,
    differential: 0,
    homeRecord: "—",
    awayRecord: "—",
    lastTen: "—",
    streak: "—",
    recentForm: ["W", "L", "W", "L", "W"],
    stats: {},
    keyPlayers: [],
    injuries: [],
    logo: team?.logos?.[0]?.href,
  };
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export class EspnSportsData {
  async getTeamsForSport(sport: SportId): Promise<TeamStats[]> {
    const cfg = ESPN_CONFIG[sport];
    if (!cfg) return [];

    const cached = teamsCache[sport];
    if (cached) {
      const ttl = cached.data.length ? CACHE_TTL_MS : NEGATIVE_TTL_MS;
      if (Date.now() - cached.at < ttl) return cached.data;
    }

    const pending = inflightTeams.get(sport);
    if (pending) return pending;

    const work = this._doFetchTeams(sport).finally(() => inflightTeams.delete(sport));
    inflightTeams.set(sport, work);
    return work;
  }

  private async _doFetchTeams(sport: SportId): Promise<TeamStats[]> {
    const cfg = ESPN_CONFIG[sport];
    if (!cfg) return [];
    try {
      const [teamsJson, standingsJson] = await Promise.all([
        fetchJson(cfg.teamsPath),
        fetchJson(cfg.standingsPath).catch(() => null),
      ]);

      const standingsMap = standingsJson ? parseStandingsMap(standingsJson) : new Map();

      const teamsRaw: any[] = [];
      const sports = teamsJson?.sports || [];
      for (const s of sports) {
        for (const league of s?.leagues || []) {
          for (const entry of league?.teams || []) {
            if (entry?.team) teamsRaw.push(entry.team);
          }
        }
      }

      const seen = new Set<string>();
      const out: TeamStats[] = [];
      for (const t of teamsRaw) {
        const tid = String(t?.id ?? "");
        if (!tid || seen.has(tid)) continue;
        seen.add(tid);
        const st = standingsMap.get(tid);
        const ts = teamStatsFromEspnTeam(sport, cfg.leagueName, t, st);
        if (st) {
          const pf = ts.pointsPerGame * (st.wins + st.losses);
          const pa = ts.pointsAllowed * (st.wins + st.losses);
          ts.differential = sport === "soccer" ? (st.wins - st.losses) * 0.1 : (pf - pa) / Math.max(1, st.wins + st.losses);
        }
        out.push(ts);
      }

      teamsCache[sport] = { data: out, at: Date.now() };
      return out;
    } catch (e: any) {
      // ESPN's public endpoints return 404 for out-of-season sports
      // (e.g. NBA in June). Cache the empty result with a shorter TTL so
      // we don't spam warnings or re-fetch on every request — analyst
      // routes already fall back to local data.
      console.warn(`[espn] getTeamsForSport(${sport}) failed: ${e?.message ?? e}`);
      teamsCache[sport] = { data: [], at: Date.now() };
      return [];
    }
  }

  /** Top stat leaders mapped to PlayerStats (subset of fields). */
  async getLeaderPlayers(sport: SportId, limit = 40): Promise<PlayerStats[]> {
    const cfg = ESPN_CONFIG[sport];
    if (!cfg) return [];

    const cached = leadersCache[sport];
    if (cached) {
      const ttl = cached.data.length ? CACHE_TTL_MS : NEGATIVE_TTL_MS;
      if (Date.now() - cached.at < ttl) return cached.data.slice(0, limit);
    }

    // Coalesce parallel callers onto a single upstream fetch.
    const key = String(sport);
    const pending = inflightLeaders.get(key);
    if (pending) return pending.then(list => list.slice(0, limit));

    const work = this._doFetchLeaders(sport).finally(() => inflightLeaders.delete(key));
    inflightLeaders.set(key, work);
    return work.then(list => list.slice(0, limit));
  }

  private async _doFetchLeaders(sport: SportId): Promise<PlayerStats[]> {
    const cfg = ESPN_CONFIG[sport];
    if (!cfg) return [];
    try {
      const data = await fetchJson(cfg.leadersPath);
      const out: PlayerStats[] = [];
      const categories = data?.leaders || data?.categories || [];

      let idx = 0;
      for (const cat of categories) {
        const catName = cat?.displayName || cat?.name || "stat";
        const leaders = cat?.leaders || cat?.ranks || [];
        for (const leader of leaders.slice(0, 8)) {
          const ath = leader?.athlete || leader?.athletes?.[0];
          if (!ath?.displayName) continue;
          const teamName =
            ath?.team?.displayName || ath?.team?.name || ath?.teamName || "—";
          const pid = `espn-ath-${sport}-${ath.id || idx++}`;
          const value = leader?.displayValue ?? leader?.value;
          const stats: Record<string, number | string> = {};
          stats[catName.replace(/\s+/g, "_").toLowerCase()] =
            typeof value === "number" ? value : String(value ?? "");

          out.push({
            id: pid,
            name: ath.displayName,
            team: teamName,
            position: ath?.position?.abbreviation || ath?.position || "—",
            sport,
            stats,
            status: "active",
            news: [],
          });
        }
      }

      const dedup = new Map<string, PlayerStats>();
      out.forEach(p => { if (!dedup.has(p.name)) dedup.set(p.name, p); });
      const list = Array.from(dedup.values()).slice(0, 60);
      leadersCache[sport] = { data: list, at: Date.now() };
      return list;
    } catch (e: any) {
      console.warn(`[espn] getLeaderPlayers(${sport}) failed: ${e?.message ?? e}`);
      leadersCache[sport] = { data: [], at: Date.now() };
      return [];
    }
  }

  clearCache(): void {
    teamsCache = {};
    leadersCache = {};
  }
}

export const espnSportsData = new EspnSportsData();
