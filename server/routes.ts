import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  const httpServer = createServer(app);

  return httpServer;
}
