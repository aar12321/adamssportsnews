import type { SportId } from "@shared/schema";

export interface Score {
  id: string;
  sportId: SportId;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  startTime: string;
  period?: string;
  venue?: string;
  source: string;
}

export interface Scoreboard {
  date: string;
  scores: Score[];
}

/**
 * Scores Service - Fetches live scores and scoreboards from multiple sources
 * Sources: ESPN, TheSportsDB, API-Football
 */
export class ScoresService {
  private theSportsDbKey: string = "123"; // Free key
  private cache: Map<string, { data: Score[]; timestamp: number }>;
  private cacheTTL: number = 1 * 60 * 1000; // 1 minute for live scores

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get live scores for a specific sport
   */
  async getLiveScores(
    sportId?: SportId,
    useCache: boolean = true
  ): Promise<Score[]> {
    const cacheKey = `scores_${sportId || "all"}`;

    // Check cache (shorter TTL for live scores)
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    try {
      // Fetch from all sources
      const [espnScores, sportsDbScores] = await Promise.allSettled([
        this.fetchFromESPN(sportId),
        this.fetchFromTheSportsDB(sportId),
      ]);

      const allScores: Score[] = [];

      if (espnScores.status === "fulfilled") allScores.push(...espnScores.value);
      if (sportsDbScores.status === "fulfilled") allScores.push(...sportsDbScores.value);

      // Remove duplicates and cache
      const uniqueScores = this.deduplicateScores(allScores);
      this.cache.set(cacheKey, {
        data: uniqueScores,
        timestamp: Date.now(),
      });

      return uniqueScores;
    } catch (error) {
      console.error("Error fetching scores:", error);
      return [];
    }
  }

  /**
   * Get scoreboard for a specific date
   */
  async getScoreboard(
    sportId?: SportId,
    date?: string
  ): Promise<Scoreboard> {
    const targetDate = date || new Date().toISOString().split("T")[0];
    
    const scores = await this.getLiveScores(sportId, false);
    
    // Filter by date if provided
    const dateScores = date
      ? scores.filter((score) => score.startTime.startsWith(date))
      : scores;

    return {
      date: targetDate,
      scores: dateScores,
    };
  }

  /**
   * Fetch scores from ESPN API
   */
  private async fetchFromESPN(sportId?: SportId): Promise<Score[]> {
    const espnEndpoints: Record<SportId, string> = {
      basketball: "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
      football: "http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
      soccer: "http://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
    };

    try {
      const endpoints = sportId
        ? [espnEndpoints[sportId]]
        : Object.values(espnEndpoints);

      const allScores: Score[] = [];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint);
        if (!response.ok) continue;

        const data = await response.json();
        
        // ESPN scoreboard structure
        if (data.events && Array.isArray(data.events)) {
          for (const event of data.events) {
            const competition = event.competitions?.[0];
            if (!competition) continue;

            const homeTeam = competition.competitors?.find((c: any) => c.homeAway === "home");
            const awayTeam = competition.competitors?.find((c: any) => c.homeAway === "away");

            if (!homeTeam || !awayTeam) continue;

            const status = this.parseESPNStatus(event.status?.type?.state);
            
            allScores.push({
              id: `espn_${event.id}`,
              sportId: this.parseESPNSport(event.leagues?.[0]?.slug || ""),
              league: event.leagues?.[0]?.name || "",
              homeTeam: homeTeam.team?.displayName || "",
              awayTeam: awayTeam.team?.displayName || "",
              homeScore: homeTeam.score ? parseInt(homeTeam.score) : null,
              awayScore: awayTeam.score ? parseInt(awayTeam.score) : null,
              status: status,
              startTime: event.date || new Date().toISOString(),
              period: event.status?.type?.shortDetail,
              venue: competition.venue?.fullName,
              source: "ESPN",
            });
          }
        }
      }

      return allScores;
    } catch (error) {
      console.error("ESPN scores fetch error:", error);
      return [];
    }
  }

  /**
   * Fetch scores from TheSportsDB
   */
  private async fetchFromTheSportsDB(sportId?: SportId): Promise<Score[]> {
    const leagues: Record<SportId, string> = {
      basketball: "4387", // NBA
      football: "4391", // NFL
      soccer: "4328", // Premier League
    };

    try {
      if (!sportId) return [];

      const leagueId = leagues[sportId];
      if (!leagueId) return [];

      // Get live events
      const url = `https://www.thesportsdb.com/api/v1/json/${this.theSportsDbKey}/eventspastleague.php?id=${leagueId}`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();

      if (data.events && Array.isArray(data.events)) {
        return data.events.map((event: any) => ({
          id: `sportsdb_${event.idEvent}`,
          sportId: sportId,
          league: event.strLeague || "",
          homeTeam: event.strHomeTeam || "",
          awayTeam: event.strAwayTeam || "",
          homeScore: event.intHomeScore ? parseInt(event.intHomeScore) : null,
          awayScore: event.intAwayScore ? parseInt(event.intAwayScore) : null,
          status: event.strStatus === "Match Finished" ? "finished" : 
                  event.strStatus === "Live" ? "live" : "scheduled",
          startTime: event.dateEvent ? `${event.dateEvent}T${event.strTime || "00:00:00"}` : new Date().toISOString(),
          venue: event.strVenue,
          source: "TheSportsDB",
        }));
      }
    } catch (error) {
      console.error("TheSportsDB scores fetch error:", error);
    }

    return [];
  }

  /**
   * Parse ESPN status to our status format
   */
  private parseESPNStatus(state?: string): "scheduled" | "live" | "finished" {
    if (!state) return "scheduled";
    if (state === "in" || state === "post") return "live";
    if (state === "final" || state === "stat_final") return "finished";
    return "scheduled";
  }

  /**
   * Parse ESPN sport slug to our SportId
   */
  private parseESPNSport(slug: string): SportId {
    if (slug.includes("basketball") || slug.includes("nba")) return "basketball";
    if (slug.includes("football") || slug.includes("nfl")) return "football";
    if (slug.includes("soccer")) return "soccer";
    return "basketball"; // Default
  }

  /**
   * Remove duplicate scores by ID
   */
  private deduplicateScores(scores: Score[]): Score[] {
    const seen = new Set<string>();
    return scores.filter((score) => {
      if (seen.has(score.id)) return false;
      seen.add(score.id);
      return true;
    });
  }

  /**
   * Clear the scores cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const scoresService = new ScoresService();

