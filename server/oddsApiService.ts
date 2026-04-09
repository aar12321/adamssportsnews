/**
 * The Odds API (v4) — optional; set ODDS_API_KEY in environment.
 * https://the-odds-api.com/liveapi/guides/v4/
 */

const SPORT_KEY: Record<string, string> = {
  basketball: "basketball_nba",
  football: "americanfootball_nfl",
  soccer: "soccer_epl",
};

export interface MatchedOdds {
  homeTeam: string;
  awayTeam: string;
  commenceTime?: string;
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: number;
  spreadHomePrice?: number;
  total?: number;
  bookmaker?: string;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function teamsRoughMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const la = na.split(/\s+/).pop() || na;
  const lb = nb.split(/\s+/).pop() || nb;
  return la === lb && la.length > 2;
}

export class OddsApiService {
  async fetchOddsForSport(sport: string): Promise<unknown[] | null> {
    const apiKey = process.env.ODDS_API_KEY;
    const sportKey = SPORT_KEY[sport];
    if (!apiKey || !sportKey) return null;

    const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("regions", "us");
    url.searchParams.set("markets", "h2h,spreads,totals");
    url.searchParams.set("oddsFormat", "american");

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("Odds API HTTP", res.status);
        return null;
      }
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch (e) {
      console.error("Odds API fetch error", e);
      return null;
    }
  }

  /**
   * Find DraftKings / first bookmaker lines for a matchup.
   */
  async findMatchOdds(homeTeam: string, awayTeam: string, sport: string): Promise<MatchedOdds | null> {
    const events = await this.fetchOddsForSport(sport);
    if (!events?.length) return null;

    for (const ev of events as any[]) {
      const h = ev.home_team as string;
      const a = ev.away_team as string;
      if (!h || !a) continue;
      const homeOk = teamsRoughMatch(h, homeTeam) || teamsRoughMatch(h, awayTeam);
      const awayOk = teamsRoughMatch(a, awayTeam) || teamsRoughMatch(a, homeTeam);
      const swapped =
        teamsRoughMatch(h, awayTeam) && teamsRoughMatch(a, homeTeam);
      const normal = teamsRoughMatch(h, homeTeam) && teamsRoughMatch(a, awayTeam);
      if (!normal && !swapped) continue;

      const bookmakers = ev.bookmakers as any[] | undefined;
      if (!bookmakers?.length) continue;

      const book =
        bookmakers.find((b) => b.key === "draftkings") || bookmakers[0];
      const markets = book?.markets || [];

      let homeMoneyline: number | undefined;
      let awayMoneyline: number | undefined;
      let spread: number | undefined;
      let spreadHomePrice: number | undefined;
      let total: number | undefined;

      for (const m of markets) {
        if (m.key === "h2h" && m.outcomes) {
          for (const o of m.outcomes) {
            const price = o.price as number;
            if (teamsRoughMatch(o.name, homeTeam) || (swapped && teamsRoughMatch(o.name, awayTeam)))
              homeMoneyline = price;
            if (teamsRoughMatch(o.name, awayTeam) || (swapped && teamsRoughMatch(o.name, homeTeam)))
              awayMoneyline = price;
          }
        }
        if (m.key === "spreads" && m.outcomes) {
          for (const o of m.outcomes) {
            if (teamsRoughMatch(o.name, homeTeam) || (swapped && teamsRoughMatch(o.name, awayTeam))) {
              spread = o.point as number;
              spreadHomePrice = o.price as number;
            }
          }
        }
        if (m.key === "totals" && m.outcomes) {
          const ou = m.outcomes.find((o: any) => o.name === "Over" || o.name?.includes("Over"));
          if (ou?.point != null) total = ou.point as number;
        }
      }

      return {
        homeTeam: h,
        awayTeam: a,
        commenceTime: ev.commence_time,
        homeMoneyline,
        awayMoneyline,
        spread,
        spreadHomePrice,
        total,
        bookmaker: book?.title || book?.key,
      };
    }

    return null;
  }
}

export const oddsApiService = new OddsApiService();
