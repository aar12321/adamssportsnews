import { z } from "zod";

// Sport types
export const sportIdSchema = z.enum(["basketball", "football", "soccer"]);
export type SportId = z.infer<typeof sportIdSchema>;

export interface Sport {
  id: SportId;
  name: string;
}

// Game schema
export const gameStatusSchema = z.enum(["upcoming", "live", "finished"]);
export type GameStatus = z.infer<typeof gameStatusSchema>;

export const gameSchema = z.object({
  id: z.string(),
  sportId: sportIdSchema,
  league: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  status: gameStatusSchema,
  startTime: z.string(),
});

export type Game = z.infer<typeof gameSchema>;

// InfoItem schema (unified for rumors, injuries, news)
export const infoTypeSchema = z.enum(["rumor", "injury", "news"]);
export type InfoType = z.infer<typeof infoTypeSchema>;

export const infoItemSchema = z.object({
  id: z.string(),
  sportId: sportIdSchema,
  type: infoTypeSchema,
  title: z.string(),
  description: z.string(),
  player: z.string().nullable(),
  team: z.string().nullable(),
  source: z.string(),
  sourceUrl: z.string().nullable(),
  timestamp: z.string(),
  tag: z.string().nullable(),
});

export type InfoItem = z.infer<typeof infoItemSchema>;

// Filter types
export type TimeRange = "24h" | "3d" | "7d";

export interface FilterState {
  selectedSports: SportId[];
  selectedTypes: ("games" | InfoType)[];
  timeRange: TimeRange;
  searchQuery: string;
}
