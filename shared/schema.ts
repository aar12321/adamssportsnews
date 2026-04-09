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
