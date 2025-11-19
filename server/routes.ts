import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./newsService";
import { scoresService } from "./scoresService";
import { apiManager } from "./apiManager";
import type { SportId } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all games
  app.get("/api/games", async (_req, res) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  // Get all info items
  app.get("/api/info-items", async (_req, res) => {
    try {
      const infoItems = await storage.getInfoItems();
      res.json(infoItems);
    } catch (error) {
      console.error("Error fetching info items:", error);
      res.status(500).json({ error: "Failed to fetch info items" });
    }
  });

  // Get latest sports news - Bloomberg Terminal style
  app.get("/api/news", async (req, res) => {
    try {
      const sportId = req.query.sport as SportId | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const refresh = req.query.refresh === "true"; // Force refresh cache

      // Validate sportId if provided
      if (sportId && !["basketball", "football", "soccer"].includes(sportId)) {
        return res.status(400).json({
          error: "Invalid sport. Must be 'basketball', 'football', or 'soccer'",
        });
      }

      const articles = await newsService.getLatestNews(
        sportId,
        Math.min(limit, 100), // Cap at 100
        !refresh
      );

      res.json({
        articles,
        totalResults: articles.length,
        sport: sportId || "all",
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Get news by category/type
  app.get("/api/news/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const sportId = req.query.sport as SportId | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const allArticles = await newsService.getLatestNews(sportId, 200);
      const filtered = allArticles.filter(
        (article) =>
          article.category?.toLowerCase() === category.toLowerCase() ||
          article.tags?.some(
            (tag) => tag.toLowerCase() === category.toLowerCase()
          )
      );

      res.json({
        articles: filtered.slice(0, limit),
        totalResults: filtered.length,
        category,
        sport: sportId || "all",
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching news by category:", error);
      res.status(500).json({ error: "Failed to fetch news by category" });
    }
  });

  // Clear news cache (admin endpoint)
  app.post("/api/news/clear-cache", async (_req, res) => {
    try {
      newsService.clearCache();
      res.json({
        message: "News cache cleared successfully",
        cacheStats: newsService.getCacheStats(),
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Get cache statistics
  app.get("/api/news/cache-stats", async (_req, res) => {
    try {
      res.json(newsService.getCacheStats());
    } catch (error) {
      console.error("Error fetching cache stats:", error);
      res.status(500).json({ error: "Failed to fetch cache stats" });
    }
  });

  // ==================== SCORES ENDPOINTS ====================

  // Get live scores
  app.get("/api/scores", async (req, res) => {
    try {
      const sportId = req.query.sport as SportId | undefined;
      const refresh = req.query.refresh === "true";

      // Validate sportId if provided
      if (sportId && !["basketball", "football", "soccer"].includes(sportId)) {
        return res.status(400).json({
          error: "Invalid sport. Must be 'basketball', 'football', or 'soccer'",
        });
      }

      const scores = await scoresService.getLiveScores(sportId, !refresh);

      res.json({
        scores,
        totalResults: scores.length,
        sport: sportId || "all",
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching scores:", error);
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  });

  // Get scoreboard for a specific date
  app.get("/api/scores/scoreboard", async (req, res) => {
    try {
      const sportId = req.query.sport as SportId | undefined;
      const date = req.query.date as string | undefined;

      // Validate sportId if provided
      if (sportId && !["basketball", "football", "soccer"].includes(sportId)) {
        return res.status(400).json({
          error: "Invalid sport. Must be 'basketball', 'football', or 'soccer'",
        });
      }

      const scoreboard = await scoresService.getScoreboard(sportId, date);

      res.json(scoreboard);
    } catch (error) {
      console.error("Error fetching scoreboard:", error);
      res.status(500).json({ error: "Failed to fetch scoreboard" });
    }
  });

  // Clear scores cache
  app.post("/api/scores/clear-cache", async (_req, res) => {
    try {
      scoresService.clearCache();
      res.json({
        message: "Scores cache cleared successfully",
      });
    } catch (error) {
      console.error("Error clearing scores cache:", error);
      res.status(500).json({ error: "Failed to clear scores cache" });
    }
  });

  // ==================== SOURCE-SPECIFIC ENDPOINTS ====================

  // Get news from specific source
  app.get("/api/news/source/:source", async (req, res) => {
    try {
      const source = req.params.source.toLowerCase();
      const sportId = req.query.sport as SportId | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      // This would require exposing individual source methods
      // For now, filter by source from aggregated news
      const allArticles = await newsService.getLatestNews(sportId, 200, false);
      const filtered = allArticles.filter(
        (article) => article.source.toLowerCase().includes(source)
      );

      res.json({
        articles: filtered.slice(0, limit),
        totalResults: filtered.length,
        source,
        sport: sportId || "all",
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching news by source:", error);
      res.status(500).json({ error: "Failed to fetch news by source" });
    }
  });

  // ==================== API STATUS & MONITORING ====================

  // Get API health status
  app.get("/api/status", async (_req, res) => {
    try {
      const statuses = apiManager.getAllStatuses();
      res.json({
        apis: statuses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching API status:", error);
      res.status(500).json({ error: "Failed to fetch API status" });
    }
  });

  // Reset API health (manual recovery)
  app.post("/api/status/reset/:apiName", async (req, res) => {
    try {
      const apiName = req.params.apiName;
      apiManager.resetApi(apiName);
      res.json({
        message: `API ${apiName} reset successfully`,
        status: apiManager.getApiStatus(apiName),
      });
    } catch (error) {
      console.error("Error resetting API:", error);
      res.status(500).json({ error: "Failed to reset API" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
