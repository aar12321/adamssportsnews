import { z } from "zod";

// Sport types
export const sportIdSchema = z.enum(["basketball", "football", "soccer", "baseball", "hockey"]);
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
export const infoTypeSchema = z.enum(["rumor", "injury", "news", "trade", "breaking"]);
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

// News Article schema
export const newsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  content: z.string().optional(),
  url: z.string(),
  imageUrl: z.string().optional(),
  source: z.string(),
  author: z.string().optional(),
  publishedAt: z.string(),
  sportId: sportIdSchema,
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type NewsArticle = z.infer<typeof newsArticleSchema>;

// Score schema
export const scoreStatusSchema = z.enum(["scheduled", "live", "finished"]);
export type ScoreStatus = z.infer<typeof scoreStatusSchema>;

export const scoreSchema = z.object({
  id: z.string(),
  sportId: sportIdSchema,
  league: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  status: scoreStatusSchema,
  startTime: z.string(),
  period: z.string().optional(),
  venue: z.string().optional(),
  source: z.string(),
});

export type Score = z.infer<typeof scoreSchema>;

// ==================== BETTING TYPES ====================

export type BetType = "moneyline" | "spread" | "over_under" | "parlay";
export type BetStatus = "pending" | "won" | "lost" | "push" | "cancelled";

export interface BetAnalysis {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  homeWinProbability: number;
  awayWinProbability: number;
  recommendedSpread: number;
  recommendedOverUnder: number;
  homeMoneyline: number;
  awayMoneyline: number;
  confidence: "low" | "medium" | "high";
  keyFactors: string[];
  homeRecentForm: string[];
  awayRecentForm: string[];
  homeRecord: string;
  awayRecord: string;
  analysis: string;
  /** ESPN or score service event id when analysis is tied to a real game */
  eventId?: string;
  /** Whether moneyline/spread/total came from a sportsbook API or the internal model */
  oddsSource?: "sportsbook" | "model";
}

export interface MockBet {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  betType: BetType;
  selectedTeam?: string;
  amount: number;
  odds: number;
  spread?: number;
  overUnder?: number;
  isOver?: boolean;
  status: BetStatus;
  potentialPayout: number;
  winProbability: number;
  placedAt: string;
  /** Scheduled start time of the game (ISO string) */
  gameStartTime?: string;
  /** When the game is expected to finish (ISO string) */
  gameEndTime?: string;
  settledAt?: string;
  result?: string;
}

export interface MockAccount {
  balance: number;
  startingBalance: number;
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pushBets: number;
  totalWagered: number;
  totalProfit: number;
  winRate: number;
  roi: number;
  /** Current W/L streak (positive = wins in a row, negative = losses, 0 = none yet or just pushed). */
  currentStreak?: number;
  /** Longest winning streak this account has ever had. */
  bestWinStreak?: number;
}

// ==================== FANTASY TYPES ====================

export interface FantasyPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  sport: SportId;
  weeklyPoints: number;
  seasonPoints: number;
  projectedPoints: number;
  averagePoints: number;
  status: "active" | "injured" | "doubtful" | "out" | "questionable";
  injuryNote?: string;
  stats: Record<string, number | string>;
  recentNews: string[];
  imageUrl?: string;
  ownership?: number;
  trending?: "up" | "down" | "stable";
}

export interface FantasyTeam {
  id: string;
  name: string;
  sport: SportId;
  league: string;
  roster: FantasyPlayer[];
  weeklyPoints: number;
  projectedWeeklyPoints: number;
  seasonPoints: number;
  record: string;
  rank: number;
  standing: string;
}

export interface TradeAnalysis {
  givingPlayers: FantasyPlayer[];
  receivingPlayers: FantasyPlayer[];
  recommendation: "accept" | "decline" | "neutral";
  valueDifference: number;
  valueDiff?: number;
  analysis: string;
  factors: string[];
}

export interface WaiverTarget {
  player: FantasyPlayer;
  reason: string;
  priority: "high" | "medium" | "low";
  droppingFor?: string;
}

// ==================== ANALYST TYPES ====================

export interface TeamStats {
  id: string;
  name: string;
  abbreviation: string;
  sport: SportId;
  league: string;
  record: string;
  wins: number;
  losses: number;
  ties?: number;
  winPct: number;
  pointsPerGame: number;
  pointsAllowed: number;
  differential: number;
  homeRecord: string;
  awayRecord: string;
  lastTen: string;
  streak: string;
  recentForm: ("W" | "L" | "T")[];
  stats: Record<string, number | string>;
  keyPlayers: string[];
  injuries: string[];
  logo?: string;
  color?: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  team: string;
  position: string;
  sport: SportId;
  age?: number;
  height?: string;
  weight?: string;
  number?: string;
  stats: Record<string, number | string>;
  careerStats?: Record<string, number | string>;
  recentGames?: Record<string, number | string>[];
  status: "active" | "injured" | "out";
  injuryNote?: string;
  news: string[];
  imageUrl?: string;
  rating?: number;
}

export interface HeadToHead {
  team1: string;
  team2: string;
  sport: SportId;
  allTime: { team1Wins: number; team2Wins: number; ties: number };
  lastFive: { team1Wins: number; team2Wins: number; ties: number };
  recentGames: {
    date: string;
    winner: string;
    score: string;
    location: string;
  }[];
  team1AvgScore: number;
  team2AvgScore: number;
  analysis: string;
  /** "mock" when the response is synthesised, "live" when sourced from a real feed. */
  source?: "mock" | "live";
}

// ==================== USER PREFERENCES TYPES ====================

export interface UserPreferences {
  userId: string;
  displayName: string;
  avatar?: string;
  favoriteSports: SportId[];
  favoriteTeams: string[];
  favoritePlayers: string[];
  theme: "dark" | "light" | "auto";
  viewMode: "mobile" | "desktop" | "auto";
  dashboardLayout: {
    showLiveScores: boolean;
    showNewsFeed: boolean;
    showAppSummaries: boolean;
    newsCategories: string[];
    scoresSports: SportId[];
    newsCount: number;
  };
  notifications: {
    liveScores: boolean;
    injuryNews: boolean;
    tradeNews: boolean;
    breakingNews: boolean;
    fantasyAlerts: boolean;
    bettingAlerts: boolean;
    /**
     * Gate applied to the news feed and push-style alerts.
     * - "breaking": only breaking-news items
     * - "important": breaking + injury + trade (the moves that change a fan's day)
     * - "all": every item the categories filter would otherwise allow
     */
    alertIntensity: "breaking" | "important" | "all";
  };
  betting: {
    defaultStake: number;
    riskLevel: "conservative" | "moderate" | "aggressive";
    favoriteLeagues: string[];
  };
  fantasy: {
    teams: FantasyTeam[];
    trackingPlayers: string[];
  };
  analyst: {
    trackedTeams: string[];
    trackedPlayers: string[];
    compareHistory: string[][];
  };
}

// Filter types
export type TimeRange = "24h" | "3d" | "7d";

export interface FilterState {
  selectedSports: SportId[];
  selectedTypes: ("games" | InfoType)[];
  timeRange: TimeRange;
  searchQuery: string;
}

// ==================== DRIZZLE (Postgres) TABLES ====================
//
// These are the persistent-storage tables for state that currently lives
// in server-memory Maps. Drizzle + drizzle-kit read this file (see
// `drizzle.config.ts` → `schema: "./shared/schema.ts"`) to generate
// migrations and typed query builders.
//
// MockAccount, MockBet, and UserPreferences above are the runtime /
// wire-format shapes. Some fields live as `jsonb` here because their
// internal structure is owned by the application (roster, layout,
// notifications, etc.) and we don't need SQL to index into them.
//
// Nothing imports from these tables unless the server is running with
// DATABASE_URL configured — see `server/db.ts`.

import {
  pgTable,
  text,
  varchar,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const mockAccountsTable = pgTable("mock_accounts", {
  userId: text("user_id").primaryKey(),
  balance: doublePrecision("balance").notNull().default(10000),
  startingBalance: doublePrecision("starting_balance").notNull().default(10000),
  totalBets: integer("total_bets").notNull().default(0),
  wonBets: integer("won_bets").notNull().default(0),
  lostBets: integer("lost_bets").notNull().default(0),
  pushBets: integer("push_bets").notNull().default(0),
  totalWagered: doublePrecision("total_wagered").notNull().default(0),
  totalProfit: doublePrecision("total_profit").notNull().default(0),
  winRate: doublePrecision("win_rate").notNull().default(0),
  roi: doublePrecision("roi").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  bestWinStreak: integer("best_win_streak").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mockBetsTable = pgTable("mock_bets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: text("user_id").notNull(),
  gameId: varchar("game_id", { length: 128 }).notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  sport: varchar("sport", { length: 32 }).notNull(),
  betType: varchar("bet_type", { length: 32 }).notNull(),
  selectedTeam: text("selected_team"),
  amount: doublePrecision("amount").notNull(),
  odds: integer("odds").notNull(),
  spread: doublePrecision("spread"),
  overUnder: doublePrecision("over_under"),
  isOver: boolean("is_over"),
  status: varchar("status", { length: 16 }).notNull(),
  potentialPayout: doublePrecision("potential_payout").notNull(),
  winProbability: doublePrecision("win_probability").notNull(),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
  gameStartTime: timestamp("game_start_time", { withTimezone: true }),
  gameEndTime: timestamp("game_end_time", { withTimezone: true }),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  result: text("result"),
});

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default("Sports Fan"),
  avatar: text("avatar"),
  theme: varchar("theme", { length: 16 }).notNull().default("dark"),
  viewMode: varchar("view_mode", { length: 16 }).notNull().default("auto"),
  favoriteSports: jsonb("favorite_sports").$type<SportId[]>().notNull().default([]),
  favoriteTeams: jsonb("favorite_teams").$type<string[]>().notNull().default([]),
  favoritePlayers: jsonb("favorite_players").$type<string[]>().notNull().default([]),
  dashboardLayout: jsonb("dashboard_layout").$type<UserPreferences["dashboardLayout"]>().notNull(),
  notifications: jsonb("notifications").$type<UserPreferences["notifications"]>().notNull(),
  betting: jsonb("betting").$type<UserPreferences["betting"]>().notNull(),
  fantasy: jsonb("fantasy").$type<UserPreferences["fantasy"]>().notNull(),
  analyst: jsonb("analyst").$type<UserPreferences["analyst"]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
