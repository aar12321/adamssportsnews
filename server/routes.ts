import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./newsService";
import { scoresService } from "./scoresService";
import { apiManager } from "./apiManager";
import { bettingService } from "./bettingService";
import { fantasyService } from "./fantasyService";
import { analystService } from "./analystService";
import { userPreferencesService } from "./userPreferencesService";
import type { SportId } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {

  // ==================== GAMES / SCORES ====================

  app.get("/api/games", async (_req, res) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.get("/api/info-items", async (_req, res) => {
    try {
      const infoItems = await storage.getInfoItems();
      res.json(infoItems);
    } catch (error) {
      console.error("Error fetching info items:", error);
      res.status(500).json({ error: "Failed to fetch info items" });
    }
  });

  app.get("/api/scores", async (req, res) => {
    try {
      const sportId = req.query.sport as SportId | undefined;
      const refresh = req.query.refresh === "true";
      const scores = await scoresService.getLiveScores(sportId, !refresh);
      res.json({ scores, totalResults: scores.length, sport: sportId || "all", lastUpdated: new Date().toISOString() });
    } catch (error) {
      console.error("Error fetching scores:", error);
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  });

  app.get("/api/scores/scoreboard", async (req, res) => {
    try {
      const sportId = req.query.sport as SportId | undefined;
      const date = req.query.date as string | undefined;
      const scoreboard = await scoresService.getScoreboard(sportId, date);
      res.json(scoreboard);
    } catch (error) {
      console.error("Error fetching scoreboard:", error);
      res.status(500).json({ error: "Failed to fetch scoreboard" });
    }
  });

  app.post("/api/scores/clear-cache", async (_req, res) => {
    try {
      scoresService.clearCache();
      res.json({ message: "Scores cache cleared successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear scores cache" });
    }
  });

  // ==================== NEWS ====================

  app.get("/api/news", async (req, res) => {
    try {
      const sportId = req.query.sport as SportId | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const refresh = req.query.refresh === "true";
      const articles = await newsService.getLatestNews(sportId, Math.min(limit, 100), !refresh);
      res.json({ articles, totalResults: articles.length, sport: sportId || "all", lastUpdated: new Date().toISOString() });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const sportId = req.query.sport as SportId | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const allArticles = await newsService.getLatestNews(sportId, 200);
      const filtered = allArticles.filter(
        (article) => article.category?.toLowerCase() === category.toLowerCase() ||
          article.tags?.some((tag) => tag.toLowerCase() === category.toLowerCase())
      );
      res.json({ articles: filtered.slice(0, limit), totalResults: filtered.length, category, sport: sportId || "all", lastUpdated: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news by category" });
    }
  });

  app.get("/api/news/source/:source", async (req, res) => {
    try {
      const source = req.params.source.toLowerCase();
      const sportId = req.query.sport as SportId | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const allArticles = await newsService.getLatestNews(sportId, 200, false);
      const filtered = allArticles.filter((article) => article.source.toLowerCase().includes(source));
      res.json({ articles: filtered.slice(0, limit), totalResults: filtered.length, source, sport: sportId || "all", lastUpdated: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news by source" });
    }
  });

  app.post("/api/news/clear-cache", async (_req, res) => {
    try {
      newsService.clearCache();
      res.json({ message: "News cache cleared successfully", cacheStats: newsService.getCacheStats() });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  app.get("/api/news/cache-stats", async (_req, res) => {
    try {
      res.json(newsService.getCacheStats());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cache stats" });
    }
  });

  // ==================== BETTING ====================

  app.post("/api/betting/analyze", (req, res) => {
    try {
      const { homeTeam, awayTeam, sport } = req.body;
      if (!homeTeam || !awayTeam || !sport) {
        return res.status(400).json({ error: "homeTeam, awayTeam, and sport are required" });
      }
      const analysis = bettingService.analyzeGame(homeTeam, awayTeam, sport);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing game:", error);
      res.status(500).json({ error: "Failed to analyze game" });
    }
  });

  app.get("/api/betting/trending", (_req, res) => {
    try {
      const trending = bettingService.getTrendingBets();
      res.json(trending);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trending bets" });
    }
  });

  app.get("/api/betting/account/:userId", (req, res) => {
    try {
      const account = bettingService.getAccount(req.params.userId);
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.get("/api/betting/bets/:userId", (req, res) => {
    try {
      const bets = bettingService.getBets(req.params.userId);
      res.json(bets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bets" });
    }
  });

  app.post("/api/betting/bets/:userId", (req, res) => {
    try {
      const result = bettingService.placeBet(req.params.userId, req.body);
      if ("error" in result) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error) {
      console.error("Error placing bet:", error);
      res.status(500).json({ error: "Failed to place bet" });
    }
  });

  app.delete("/api/betting/bets/:userId/:betId", (req, res) => {
    try {
      const result = bettingService.cancelBet(req.params.userId, req.params.betId);
      if ("error" in result) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel bet" });
    }
  });

  app.post("/api/betting/account/:userId/reset", (req, res) => {
    try {
      const account = bettingService.resetAccount(req.params.userId);
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset account" });
    }
  });

  // ==================== FANTASY ====================

  app.get("/api/fantasy/players", (req, res) => {
    try {
      const sport = req.query.sport as string | undefined;
      const players = fantasyService.getAllPlayers(sport);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/fantasy/players/search", (req, res) => {
    try {
      const query = req.query.q as string || "";
      const sport = req.query.sport as string | undefined;
      const players = fantasyService.searchPlayers(query, sport);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to search players" });
    }
  });

  app.get("/api/fantasy/players/top", (req, res) => {
    try {
      const sport = req.query.sport as string || "basketball";
      const position = req.query.position as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const players = fantasyService.getTopPlayers(sport, position, limit);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top players" });
    }
  });

  app.get("/api/fantasy/players/:id", (req, res) => {
    try {
      const player = fantasyService.getPlayer(req.params.id);
      if (!player) return res.status(404).json({ error: "Player not found" });
      const trend = fantasyService.analyzePlayerTrend(req.params.id);
      res.json({ ...player, ...trend });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player" });
    }
  });

  app.get("/api/fantasy/injured", (req, res) => {
    try {
      const sport = req.query.sport as string | undefined;
      const players = fantasyService.getInjuredPlayers(sport);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch injured players" });
    }
  });

  app.get("/api/fantasy/waiver", (req, res) => {
    try {
      const sport = req.query.sport as string || "basketball";
      const targets = fantasyService.getWaiverTargets(sport);
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch waiver targets" });
    }
  });

  app.post("/api/fantasy/trade/analyze", (req, res) => {
    try {
      const { giving, receiving } = req.body;
      if (!giving || !receiving) {
        return res.status(400).json({ error: "giving and receiving player arrays required" });
      }
      const analysis = fantasyService.analyzeTrade(giving, receiving);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze trade" });
    }
  });

  app.get("/api/fantasy/projections", (req, res) => {
    try {
      const sport = req.query.sport as string || "basketball";
      const playerIds = req.query.players ? (req.query.players as string).split(",") : undefined;
      const projections = fantasyService.getWeeklyProjections(sport, playerIds);
      res.json(projections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projections" });
    }
  });

  app.get("/api/fantasy/team/sample", (req, res) => {
    try {
      const sport = req.query.sport as string || "basketball";
      const team = fantasyService.getSampleTeam(sport);
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sample team" });
    }
  });

  // ==================== ANALYST ====================

  app.get("/api/analyst/teams", (req, res) => {
    try {
      const sport = req.query.sport as string || "basketball";
      const teams = analystService.getTeamsBySport(sport);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/analyst/teams/search", (req, res) => {
    try {
      const query = req.query.q as string || "";
      const sport = req.query.sport as string | undefined;
      const teams = analystService.searchTeams(query, sport);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to search teams" });
    }
  });

  app.get("/api/analyst/teams/trending", (req, res) => {
    try {
      const sport = req.query.sport as string || "basketball";
      const teams = analystService.getTrendingTeams(sport);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trending teams" });
    }
  });

  app.get("/api/analyst/teams/:id", (req, res) => {
    try {
      const team = analystService.getTeam(req.params.id);
      if (!team) return res.status(404).json({ error: "Team not found" });
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.post("/api/analyst/teams/compare", (req, res) => {
    try {
      const { team1, team2 } = req.body;
      if (!team1 || !team2) {
        return res.status(400).json({ error: "team1 and team2 are required" });
      }
      const comparison = analystService.compareTeams(team1, team2);
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: "Failed to compare teams" });
    }
  });

  app.get("/api/analyst/players/search", (req, res) => {
    try {
      const query = req.query.q as string || "";
      const sport = req.query.sport as string | undefined;
      const players = analystService.searchPlayers(query, sport);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to search players" });
    }
  });

  app.get("/api/analyst/players/:id", (req, res) => {
    try {
      const player = analystService.getPlayer(req.params.id);
      if (!player) return res.status(404).json({ error: "Player not found" });
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player" });
    }
  });

  app.post("/api/analyst/players/compare", (req, res) => {
    try {
      const { player1, player2 } = req.body;
      if (!player1 || !player2) {
        return res.status(400).json({ error: "player1 and player2 are required" });
      }
      const comparison = analystService.comparePlayers(player1, player2);
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: "Failed to compare players" });
    }
  });

  app.get("/api/analyst/h2h", (req, res) => {
    try {
      const team1 = req.query.team1 as string;
      const team2 = req.query.team2 as string;
      if (!team1 || !team2) {
        return res.status(400).json({ error: "team1 and team2 are required" });
      }
      const h2h = analystService.getHeadToHead(team1, team2);
      res.json(h2h);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch head-to-head data" });
    }
  });

  app.get("/api/analyst/leaders", (req, res) => {
    try {
      const sport = req.query.sport as string || "basketball";
      const leaders = analystService.getLeagueLeaders(sport);
      res.json(leaders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch league leaders" });
    }
  });

  // ==================== USER PREFERENCES ====================

  app.get("/api/preferences/:userId", (req, res) => {
    try {
      const prefs = userPreferencesService.getPreferences(req.params.userId);
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.patch("/api/preferences/:userId", (req, res) => {
    try {
      const updated = userPreferencesService.updatePreferences(req.params.userId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  app.post("/api/preferences/:userId/reset", (req, res) => {
    try {
      const prefs = userPreferencesService.resetPreferences(req.params.userId);
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset preferences" });
    }
  });

  // ==================== API STATUS ====================

  app.get("/api/status", async (_req, res) => {
    try {
      const statuses = apiManager.getAllStatuses();
      res.json({ apis: statuses, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API status" });
    }
  });

  app.post("/api/status/reset/:apiName", async (req, res) => {
    try {
      apiManager.resetApi(req.params.apiName);
      res.json({ message: `API ${req.params.apiName} reset successfully`, status: apiManager.getApiStatus(req.params.apiName) });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset API" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
