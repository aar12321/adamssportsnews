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
import { leaguesService } from "./leaguesService";
import { espnSportsData } from "./espnSportsData";
import { attachUser, requireUser, requireSelf } from "./auth";
import { sseHandler, broadcast } from "./sse";
import { pushService } from "./pushService";
import { sportIdSchema, type SportId } from "@shared/schema";

/** Parse and clamp a query-string integer to [min, max]; returns fallback for NaN. */
function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Reject obviously bad userId values (empty / whitespace / overlong). */
function isValidUserId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 128;
}

/**
 * Parse `?sport=...` into a known SportId, or return undefined if it's
 * missing. Returns { error } if a non-empty but invalid value was supplied —
 * callers should 400 in that case so we don't silently fall through to a
 * default sport.
 */
function parseSportQuery(raw: unknown): { sport?: SportId; error?: string } {
  if (raw === undefined || raw === null || raw === "") return { sport: undefined };
  const parsed = sportIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: `Unknown sport: ${String(raw).slice(0, 32)}` };
  }
  return { sport: parsed.data };
}

/** Same as parseSportQuery but requires a value. */
function requireSport(raw: unknown): { sport?: SportId; error?: string } {
  const parsed = sportIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: `sport is required and must be one of basketball|football|soccer|baseball|hockey` };
  }
  return { sport: parsed.data };
}

/** Clamp a free-text value and reject obvious garbage. */
function cleanText(raw: unknown, maxLen = 128): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Attach the authenticated user (if any) to every /api request so handlers
  // can read req.userId without each re-parsing the Authorization header.
  // This does NOT reject unauthenticated calls — routes that need auth opt in
  // with the requireUser middleware below.
  app.use("/api", attachUser);

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
      const { sport: sportId, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
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
      const { sport: sportId, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const date = cleanText(req.query.date, 32);
      const scoreboard = await scoresService.getScoreboard(sportId, date);
      res.json(scoreboard);
    } catch (error) {
      console.error("Error fetching scoreboard:", error);
      res.status(500).json({ error: "Failed to fetch scoreboard" });
    }
  });

  // Long-lived Server-Sent Events stream. Clients subscribe with
  //   new EventSource('/api/stream?topic=scores:basketball,news:injury')
  // and receive `score` / `news` / `bet` events as they happen. No auth
  // required — all content is non-sensitive. Per-user-only topics
  // (future) should be gated separately.
  app.get("/api/stream", (req, res) => sseHandler(req, res));

  app.post("/api/scores/clear-cache", requireUser, async (_req, res) => {
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
      const { sport: sportId, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const limit = clampInt(req.query.limit, 50, 1, 100);
      const refresh = req.query.refresh === "true";
      const articles = await newsService.getLatestNews(sportId, limit, !refresh);
      res.json({ articles, totalResults: articles.length, sport: sportId || "all", lastUpdated: new Date().toISOString() });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/category/:category", async (req, res) => {
    try {
      const category = cleanText(req.params.category, 64);
      if (!category) return res.status(400).json({ error: "category is required" });
      const { sport: sportId, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const limit = clampInt(req.query.limit, 50, 1, 100);
      const allArticles = await newsService.getLatestNews(sportId, 200);
      const catLower = category.toLowerCase();
      const filtered = allArticles.filter(
        (article) => article.category?.toLowerCase() === catLower ||
          article.tags?.some((tag) => tag.toLowerCase() === catLower)
      );
      res.json({ articles: filtered.slice(0, limit), totalResults: filtered.length, category, sport: sportId || "all", lastUpdated: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news by category" });
    }
  });

  app.get("/api/news/source/:source", async (req, res) => {
    try {
      const source = cleanText(req.params.source, 64)?.toLowerCase();
      if (!source) return res.status(400).json({ error: "source is required" });
      const { sport: sportId, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const limit = clampInt(req.query.limit, 50, 1, 100);
      const allArticles = await newsService.getLatestNews(sportId, 200, false);
      const filtered = allArticles.filter((article) => article.source.toLowerCase().includes(source));
      res.json({ articles: filtered.slice(0, limit), totalResults: filtered.length, source, sport: sportId || "all", lastUpdated: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news by source" });
    }
  });

  app.post("/api/news/clear-cache", requireUser, async (_req, res) => {
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

  app.get("/api/betting/schedule", async (req, res) => {
    try {
      const { sport: sportId, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const refresh = req.query.refresh === "true";
      const scores = await scoresService.getLiveScores(sportId, !refresh);
      res.json({
        games: scores,
        totalResults: scores.length,
        sport: sportId || "all",
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching betting schedule:", error);
      res.status(500).json({ error: "Failed to fetch schedule" });
    }
  });

  app.post("/api/betting/analyze", async (req, res) => {
    try {
      const body = req.body ?? {};
      const homeTeam = cleanText(body.homeTeam, 64);
      const awayTeam = cleanText(body.awayTeam, 64);
      const eventId = cleanText(body.eventId, 64);
      if (!homeTeam || !awayTeam) {
        return res.status(400).json({ error: "homeTeam and awayTeam are required" });
      }
      const { sport, error } = requireSport(body.sport);
      if (error || !sport) return res.status(400).json({ error });
      const analysis = await bettingService.analyzeGameWithOdds(homeTeam, awayTeam, sport, {
        eventId,
      });
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

  app.get("/api/betting/account/:userId", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const account = bettingService.getAccount(req.params.userId);
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.get("/api/betting/bets/:userId", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const bets = bettingService.getBets(req.params.userId);
      res.json(bets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bets" });
    }
  });

  app.post("/api/betting/bets/:userId", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      // Defensive payload validation — bettingService also validates, but
      // we want to fail fast and return 400 (not 500) for client mistakes.
      const body = req.body ?? {};
      const amount = Number(body.amount);
      const odds = Number(body.odds);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }
      if (!Number.isFinite(odds) || odds === 0) {
        return res.status(400).json({ error: "odds must be a non-zero number" });
      }
      if (typeof body.betType !== "string" || !body.betType) {
        return res.status(400).json({ error: "betType is required" });
      }
      const result = bettingService.placeBet(req.params.userId, { ...body, amount, odds });
      if ("error" in result) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error) {
      console.error("Error placing bet:", error);
      res.status(500).json({ error: "Failed to place bet" });
    }
  });

  app.delete("/api/betting/bets/:userId/:betId", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const result = bettingService.cancelBet(req.params.userId, req.params.betId);
      if ("error" in result) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel bet" });
    }
  });

  app.post("/api/betting/account/:userId/reset", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const account = bettingService.resetAccount(req.params.userId);
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset account" });
    }
  });

  // ==================== FANTASY ====================

  app.get("/api/fantasy/players", (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const players = fantasyService.getAllPlayers(sport);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/fantasy/players/search", async (req, res) => {
    try {
      const query = cleanText(req.query.q, 128);
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      if (!query) {
        return res.json([]);
      }
      const ql = query.toLowerCase();
      const espnLeaders = await espnSportsData.getLeaderPlayers(sportKey, 60).catch(() => []);
      const fromEspn = espnLeaders.map((p) => fantasyService.playerStatsToFantasy(p));
      const merged = fantasyService.mergeFantasyWithEspn(sportKey, fromEspn);
      const filtered = merged.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          p.team.toLowerCase().includes(ql) ||
          p.position.toLowerCase().includes(ql)
      );
      res.json(filtered.slice(0, 50));
    } catch (error) {
      res.status(500).json({ error: "Failed to search players" });
    }
  });

  app.get("/api/fantasy/players/top", async (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const position = cleanText(req.query.position, 16);
      const limit = clampInt(req.query.limit, 20, 1, 100);
      const espnLeaders = await espnSportsData.getLeaderPlayers(sportKey, 40).catch(() => []);
      const fromEspn = espnLeaders.map((p) => fantasyService.playerStatsToFantasy(p));
      const merged = fantasyService.mergeFantasyWithEspn(sportKey, fromEspn);
      let list = merged;
      if (position) {
        const needle = position.toLowerCase();
        list = merged.filter((p) => p.position.toLowerCase().includes(needle));
      }
      list = [...list].sort((a, b) => b.averagePoints - a.averagePoints).slice(0, limit);
      res.json(list);
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
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const players = fantasyService.getInjuredPlayers(sport);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch injured players" });
    }
  });

  app.get("/api/fantasy/waiver", (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const targets = fantasyService.getWaiverTargets(sport ?? "basketball");
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch waiver targets" });
    }
  });

  // --- Persistent per-user rosters ---------------------------------------

  app.get("/api/fantasy/roster", requireUser, (req, res) => {
    try {
      const userId = req.userId!;
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      if (sport) {
        return res.json({ sport, players: fantasyService.getRoster(userId, sport) });
      }
      res.json(fantasyService.getAllRosters(userId));
    } catch (err) {
      console.error("Error fetching roster:", err);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });

  app.post("/api/fantasy/roster/add", requireUser, (req, res) => {
    try {
      const userId = req.userId!;
      const body = req.body ?? {};
      const { sport, error } = requireSport(body.sport);
      if (error || !sport) return res.status(400).json({ error });
      const player = body.player;
      if (!player || typeof player !== "object" || typeof player.id !== "string") {
        return res.status(400).json({ error: "player object with id required" });
      }
      const result = fantasyService.addToRoster(userId, sport, player);
      if (!result.ok) return res.status(400).json(result);
      res.json({ ok: true, players: result.players });
    } catch (err) {
      console.error("Error adding to roster:", err);
      res.status(500).json({ error: "Failed to add player" });
    }
  });

  app.post("/api/fantasy/roster/remove", requireUser, (req, res) => {
    try {
      const userId = req.userId!;
      const body = req.body ?? {};
      const { sport, error } = requireSport(body.sport);
      if (error || !sport) return res.status(400).json({ error });
      const playerId = cleanText(body.playerId, 64);
      if (!playerId) return res.status(400).json({ error: "playerId required" });
      const players = fantasyService.removeFromRoster(userId, sport, playerId);
      res.json({ ok: true, players });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove player" });
    }
  });

  app.post("/api/fantasy/roster/reset", requireUser, (req, res) => {
    try {
      const userId = req.userId!;
      const body = req.body ?? {};
      const { sport, error } = requireSport(body.sport);
      if (error || !sport) return res.status(400).json({ error });
      fantasyService.resetRoster(userId, sport);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to reset roster" });
    }
  });

  // --- Opponent mock lineups (matchup simulation) -----------------------

  app.get("/api/fantasy/opponents", requireUser, (req, res) => {
    try {
      const { sport, error } = requireSport(req.query.sport);
      if (error || !sport) return res.status(400).json({ error });
      res.json(fantasyService.listOpponents(req.userId!, sport));
    } catch (err) {
      res.status(500).json({ error: "Failed to list opponents" });
    }
  });

  app.post("/api/fantasy/opponents", requireUser, (req, res) => {
    try {
      const body = req.body ?? {};
      const { sport, error } = requireSport(body.sport);
      if (error || !sport) return res.status(400).json({ error });
      const name = cleanText(body.name, 48) || "Opponent";
      const result = fantasyService.createOpponent(req.userId!, sport, name);
      if (!result.ok) return res.status(400).json(result);
      res.json(result.opponent);
    } catch (err) {
      res.status(500).json({ error: "Failed to create opponent" });
    }
  });

  app.delete("/api/fantasy/opponents/:id", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "opponent id required" });
      const ok = fantasyService.deleteOpponent(req.userId!, id);
      if (!ok) return res.status(404).json({ error: "Opponent not found" });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete opponent" });
    }
  });

  app.post("/api/fantasy/opponents/:id/add-player", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "opponent id required" });
      const player = req.body?.player;
      if (!player || typeof player !== "object" || typeof player.id !== "string") {
        return res.status(400).json({ error: "player object with id required" });
      }
      const result = fantasyService.addPlayerToOpponent(req.userId!, id, player);
      if (!result.ok) return res.status(400).json(result);
      res.json(result.opponent);
    } catch (err) {
      res.status(500).json({ error: "Failed to add player to opponent" });
    }
  });

  app.post("/api/fantasy/opponents/:id/remove-player", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "opponent id required" });
      const playerId = cleanText(req.body?.playerId, 64);
      if (!playerId) return res.status(400).json({ error: "playerId required" });
      const updated = fantasyService.removePlayerFromOpponent(req.userId!, id, playerId);
      if (!updated) return res.status(404).json({ error: "Opponent not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to remove player from opponent" });
    }
  });

  app.post("/api/fantasy/opponents/:id/rename", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "opponent id required" });
      const name = cleanText(req.body?.name, 48);
      if (!name) return res.status(400).json({ error: "name required" });
      const updated = fantasyService.renameOpponent(req.userId!, id, name);
      if (!updated) return res.status(404).json({ error: "Opponent not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to rename opponent" });
    }
  });

  // Server-side echo of the client's roster-add validation, so tampering with
  // localStorage can't produce a roster that would normally be rejected.
  app.post("/api/fantasy/roster/validate", (req, res) => {
    try {
      const body = req.body ?? {};
      const { roster, player, sport } = body as {
        roster?: unknown; player?: unknown; sport?: unknown;
      };
      if (typeof sport !== "string" || !sport) {
        return res.status(400).json({ error: "sport is required" });
      }
      if (!Array.isArray(roster)) {
        return res.status(400).json({ error: "roster must be an array" });
      }
      if (roster.length > 50) {
        return res.status(400).json({ error: "roster too large" });
      }
      if (!player || typeof player !== "object") {
        return res.status(400).json({ error: "player is required" });
      }
      const p = player as { id?: unknown; position?: unknown; sport?: unknown };
      if (typeof p.id !== "string" || !p.id) {
        return res.status(400).json({ error: "player.id is required" });
      }
      // Coerce into the plain shape the validator accepts.
      const cleanRoster = (roster as any[]).map((r) => ({
        id: String(r?.id ?? ""),
        position: typeof r?.position === "string" ? r.position : undefined,
        sport: typeof r?.sport === "string" ? r.sport : undefined,
      })).filter((r) => r.id);
      const cleanPlayer = {
        id: p.id,
        position: typeof p.position === "string" ? p.position : undefined,
        sport: typeof p.sport === "string" ? p.sport : undefined,
      };
      const result = fantasyService.validateRosterAddition(cleanRoster, cleanPlayer, sport);
      res.json(result);
    } catch (error) {
      console.error("Error validating roster addition:", error);
      res.status(500).json({ error: "Failed to validate roster addition" });
    }
  });

  app.post("/api/fantasy/trade/analyze", (req, res) => {
    try {
      const { giving, receiving } = req.body ?? {};
      if (!Array.isArray(giving) || !Array.isArray(receiving)) {
        return res.status(400).json({ error: "giving and receiving must be arrays" });
      }
      if (giving.length === 0 || receiving.length === 0) {
        return res.status(400).json({ error: "giving and receiving cannot be empty" });
      }
      if (giving.length > 20 || receiving.length > 20) {
        return res.status(400).json({ error: "trade too large (max 20 per side)" });
      }
      // Each entry may be a string (player id, resolved against the local
      // DB) or a player object (passed through as-is so ESPN-sourced
      // players trade correctly).
      const normalize = (entry: unknown): string | any | null => {
        if (typeof entry === "string") {
          if (entry.length === 0 || entry.length > 64) return null;
          return entry;
        }
        if (entry && typeof entry === "object") {
          const e = entry as { id?: unknown };
          if (typeof e.id !== "string" || !e.id || e.id.length > 64) return null;
          return entry;
        }
        return null;
      };
      const cleanGiving = (giving as unknown[]).map(normalize).filter((x): x is string | any => x !== null);
      const cleanReceiving = (receiving as unknown[]).map(normalize).filter((x): x is string | any => x !== null);
      if (cleanGiving.length !== giving.length || cleanReceiving.length !== receiving.length) {
        return res.status(400).json({ error: "each entry must be a player id or a player object with an id" });
      }
      const analysis = fantasyService.analyzeTrade(cleanGiving, cleanReceiving);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze trade" });
    }
  });

  app.get("/api/fantasy/projections", (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      let playerIds: string[] | undefined;
      if (typeof req.query.players === "string" && req.query.players.length > 0) {
        const raw = req.query.players.split(",").map((s) => s.trim()).filter(Boolean);
        if (raw.length > 50) {
          return res.status(400).json({ error: "too many player IDs (max 50)" });
        }
        playerIds = raw.filter((id) => id.length <= 64);
      }
      const projections = fantasyService.getWeeklyProjections(sportKey, playerIds);
      res.json(projections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projections" });
    }
  });

  app.get("/api/fantasy/team/sample", (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const team = fantasyService.getSampleTeam(sport ?? "basketball");
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sample team" });
    }
  });

  // ==================== FANTASY LEAGUES ====================

  app.get("/api/leagues", requireUser, (req, res) => {
    try {
      const leagues = leaguesService.listUserLeagues(req.userId!);
      res.json(leagues);
    } catch (err) {
      console.error("Error listing leagues:", err);
      res.status(500).json({ error: "Failed to list leagues" });
    }
  });

  app.post("/api/leagues", requireUser, (req, res) => {
    try {
      const body = req.body ?? {};
      const name = cleanText(body.name, 64);
      if (!name) return res.status(400).json({ error: "league name required" });
      const { sport, error } = requireSport(body.sport);
      if (error || !sport) return res.status(400).json({ error });
      const teamName = cleanText(body.teamName, 48);
      const maxRaw = Number(body.maxMembers);
      const maxMembers = Number.isFinite(maxRaw) ? maxRaw : undefined;
      const league = leaguesService.createLeague({
        ownerId: req.userId!,
        name,
        sport,
        teamName,
        maxMembers,
      });
      res.json(league);
    } catch (err) {
      console.error("Error creating league:", err);
      res.status(500).json({ error: "Failed to create league" });
    }
  });

  app.post("/api/leagues/join", requireUser, (req, res) => {
    try {
      const body = req.body ?? {};
      const inviteCode = cleanText(body.inviteCode, 12);
      if (!inviteCode) return res.status(400).json({ error: "inviteCode required" });
      const teamName = cleanText(body.teamName, 48);
      const result = leaguesService.joinByCode({
        userId: req.userId!,
        inviteCode,
        teamName,
      });
      if (!result.ok) return res.status(400).json(result);
      res.json(result.league);
    } catch (err) {
      res.status(500).json({ error: "Failed to join league" });
    }
  });

  app.get("/api/leagues/:id", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "league id required" });
      const league = leaguesService.getLeague(id);
      if (!league) return res.status(404).json({ error: "League not found" });
      // Ensure caller is a member before exposing details
      if (!league.members.some((m) => m.userId === req.userId)) {
        return res.status(403).json({ error: "Not a member of this league" });
      }
      res.json(league);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch league" });
    }
  });

  app.get("/api/leagues/:id/standings", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "league id required" });
      const league = leaguesService.getLeague(id);
      if (!league) return res.status(404).json({ error: "League not found" });
      if (!league.members.some((m) => m.userId === req.userId)) {
        return res.status(403).json({ error: "Not a member of this league" });
      }
      res.json(leaguesService.getStandings(id));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  app.get("/api/leagues/:id/matchups", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "league id required" });
      const weekRaw = req.query.week;
      const week = weekRaw !== undefined ? clampInt(weekRaw, 1, 1, 52) : undefined;
      const league = leaguesService.getLeague(id);
      if (!league) return res.status(404).json({ error: "League not found" });
      if (!league.members.some((m) => m.userId === req.userId)) {
        return res.status(403).json({ error: "Not a member of this league" });
      }
      const matchups = leaguesService.getWeekMatchups(id, week);
      res.json({ week: week ?? league.currentWeek, matchups });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch matchups" });
    }
  });

  app.post("/api/leagues/:id/schedule", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "league id required" });
      const league = leaguesService.getLeague(id);
      if (!league) return res.status(404).json({ error: "League not found" });
      if (league.ownerId !== req.userId) {
        return res.status(403).json({ error: "Only the league owner can generate a schedule" });
      }
      const weeksRaw = req.body?.weeks;
      const weeks = Number.isFinite(Number(weeksRaw)) ? Math.max(2, Math.min(26, Number(weeksRaw))) : 14;
      const created = leaguesService.generateSchedule(id, weeks);
      res.json({ created });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate schedule" });
    }
  });

  app.post("/api/leagues/:id/settle", requireUser, (req, res) => {
    try {
      const id = cleanText(req.params.id, 64);
      if (!id) return res.status(400).json({ error: "league id required" });
      const league = leaguesService.getLeague(id);
      if (!league) return res.status(404).json({ error: "League not found" });
      if (league.ownerId !== req.userId) {
        return res.status(403).json({ error: "Only the league owner can settle a week" });
      }
      const week = clampInt(req.body?.week, league.currentWeek, 1, 52);
      const result = leaguesService.settleWeek(id, week);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to settle week" });
    }
  });

  // ==================== ANALYST ====================

  app.get("/api/analyst/teams", async (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const espn = await espnSportsData.getTeamsForSport(sportKey);
      const merged = analystService.mergeWithEspnTeams(espn, sportKey);
      res.json(merged);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/analyst/teams/search", async (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const query = cleanText(req.query.q, 128);
      const espn = await espnSportsData.getTeamsForSport(sportKey);
      const merged = analystService.mergeWithEspnTeams(espn, sportKey);
      if (!query) {
        return res.json(merged.slice(0, 40));
      }
      const q = query.toLowerCase();
      const filtered = merged.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.abbreviation.toLowerCase().includes(q) ||
          t.league.toLowerCase().includes(q)
      );
      res.json(filtered.slice(0, 40));
    } catch (error) {
      res.status(500).json({ error: "Failed to search teams" });
    }
  });

  app.get("/api/analyst/teams/trending", async (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const espn = await espnSportsData.getTeamsForSport(sportKey);
      const merged = analystService.mergeWithEspnTeams(espn, sportKey);
      const hot = analystService.rankHotTeams(merged, 10);
      res.json(hot.length > 0 ? hot : analystService.getTrendingTeams(sportKey));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trending teams" });
    }
  });

  app.get("/api/analyst/teams/:id", async (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const id = cleanText(req.params.id, 128);
      if (!id) return res.status(400).json({ error: "team id is required" });
      const espn = await espnSportsData.getTeamsForSport(sportKey);
      const merged = analystService.mergeWithEspnTeams(espn, sportKey);
      const team =
        merged.find((t) => t.id === id) ||
        merged.find((t) => t.name.toLowerCase() === id.toLowerCase()) ||
        analystService.getTeam(id);
      if (!team) return res.status(404).json({ error: "Team not found" });
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.post("/api/analyst/teams/compare", async (req, res) => {
    try {
      const body = req.body ?? {};
      const team1 = cleanText(body.team1, 128);
      const team2 = cleanText(body.team2, 128);
      if (!team1 || !team2) {
        return res.status(400).json({ error: "team1 and team2 are required" });
      }
      const { sport, error } = parseSportQuery(body.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const espn = await espnSportsData.getTeamsForSport(sportKey);
      const merged = analystService.mergeWithEspnTeams(espn, sportKey);
      const t1 =
        merged.find((t) => t.name === team1) ||
        merged.find((t) => t.name.toLowerCase().includes(team1.toLowerCase())) ||
        analystService.getTeam(team1);
      const t2 =
        merged.find((t) => t.name === team2) ||
        merged.find((t) => t.name.toLowerCase().includes(team2.toLowerCase())) ||
        analystService.getTeam(team2);
      if (!t1 || !t2) {
        return res.status(404).json({ error: "One or both teams not found" });
      }
      if (t1.sport !== t2.sport) {
        return res.status(400).json({ error: "Teams must be in the same sport for comparison" });
      }
      const comparison = analystService.compareTeamStats(t1, t2);
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: "Failed to compare teams" });
    }
  });

  app.get("/api/analyst/players/search", async (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const query = cleanText(req.query.q, 128);
      if (!query) {
        const merged = analystService.mergePlayerSources([], sportKey);
        return res.json(merged.slice(0, 30));
      }
      const ql = query.toLowerCase();
      const espnLeaders = await espnSportsData.getLeaderPlayers(sportKey, 80).catch(() => []);
      const merged = analystService.mergePlayerSources(espnLeaders, sportKey);
      const filtered = merged.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          p.team.toLowerCase().includes(ql) ||
          p.position.toLowerCase().includes(ql)
      );
      res.json(filtered.slice(0, 50));
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
      const body = req.body ?? {};
      const player1 = cleanText(body.player1, 128);
      const player2 = cleanText(body.player2, 128);
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
      const team1 = cleanText(req.query.team1, 128);
      const team2 = cleanText(req.query.team2, 128);
      if (!team1 || !team2) {
        return res.status(400).json({ error: "team1 and team2 are required" });
      }
      const h2h = analystService.getHeadToHead(team1, team2);
      res.json(h2h);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch head-to-head data" });
    }
  });

  app.get("/api/analyst/leaders", async (req, res) => {
    try {
      const { sport, error } = parseSportQuery(req.query.sport);
      if (error) return res.status(400).json({ error });
      const sportKey = sport ?? "basketball";
      const fromEspn = await espnSportsData.getLeaderPlayers(sportKey, 30).catch(() => []);
      if (fromEspn.length > 0) {
        const rows = fromEspn.slice(0, 12).map((p) => {
          const entries = Object.entries(p.stats);
          const [cat, val] = entries[0] || ["stat", ""];
          return {
            category: cat.replace(/_/g, " "),
            player: p.name,
            team: p.team,
            value: typeof val === "number" ? val.toFixed(1) : String(val),
          };
        });
        return res.json(rows);
      }
      const leaders = analystService.getLeagueLeaders(sportKey);
      res.json(leaders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch league leaders" });
    }
  });

  // ==================== USER PREFERENCES ====================

  app.get("/api/preferences/:userId", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const prefs = userPreferencesService.getPreferences(req.params.userId);
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.patch("/api/preferences/:userId", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const updated = userPreferencesService.updatePreferences(req.params.userId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  app.post("/api/preferences/:userId/reset", requireUser, requireSelf(), (req, res) => {
    try {
      if (!isValidUserId(req.params.userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const prefs = userPreferencesService.resetPreferences(req.params.userId);
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset preferences" });
    }
  });

  // ==================== PUSH NOTIFICATIONS ====================

  app.get("/api/push/public-key", (_req, res) => {
    res.json({
      publicKey: pushService.publicKey || null,
      configured: pushService.isConfigured,
    });
  });

  app.post("/api/push/subscribe", requireUser, (req, res) => {
    try {
      const body = req.body ?? {};
      const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
      const keys = body.keys && typeof body.keys === "object" ? body.keys : {};
      const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
      const auth = typeof keys.auth === "string" ? keys.auth : "";
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: "endpoint + keys.{p256dh,auth} required" });
      }
      if (endpoint.length > 2048 || p256dh.length > 256 || auth.length > 256) {
        return res.status(400).json({ error: "subscription values too large" });
      }
      const sub = pushService.subscribe(req.userId!, { endpoint, keys: { p256dh, auth } });
      res.json({ ok: true, endpoint: sub.endpoint });
    } catch (err) {
      console.error("Error subscribing to push:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  app.post("/api/push/unsubscribe", requireUser, (req, res) => {
    try {
      const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
      if (!endpoint) return res.status(400).json({ error: "endpoint required" });
      pushService.unsubscribe(endpoint);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  app.post("/api/push/test", requireUser, async (req, res) => {
    try {
      const sent = await pushService.sendToUser(req.userId!, {
        title: "Adams Sports News",
        body: "Test notification — you're all set.",
        url: "/",
        category: "breaking",
      });
      res.json({ sent });
    } catch (err) {
      res.status(500).json({ error: "Failed to send test push" });
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

  app.post("/api/status/reset/:apiName", requireUser, async (req, res) => {
    try {
      const apiName = cleanText(req.params.apiName, 64);
      if (!apiName) return res.status(400).json({ error: "apiName is required" });
      apiManager.resetApi(apiName);
      res.json({ message: `API ${apiName} reset successfully`, status: apiManager.getApiStatus(apiName) });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset API" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
