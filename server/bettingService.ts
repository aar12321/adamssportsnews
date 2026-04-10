import type { BetAnalysis, MockBet, MockAccount, BetType } from "@shared/schema";
import { oddsApiService } from "./oddsApiService";

// In-memory storage for mock betting (per session)
const mockAccounts = new Map<string, MockAccount>();
const mockBets = new Map<string, MockBet[]>();

const DEFAULT_BALANCE = 10000; // $10,000 starting mock balance

function getOrCreateAccount(userId: string): MockAccount {
  if (!mockAccounts.has(userId)) {
    mockAccounts.set(userId, {
      balance: DEFAULT_BALANCE,
      startingBalance: DEFAULT_BALANCE,
      totalBets: 0,
      wonBets: 0,
      lostBets: 0,
      pushBets: 0,
      totalWagered: 0,
      totalProfit: 0,
      winRate: 0,
      roi: 0,
    });
  }
  return mockAccounts.get(userId)!;
}

function getUserBets(userId: string): MockBet[] {
  if (!mockBets.has(userId)) {
    mockBets.set(userId, []);
  }
  return mockBets.get(userId)!;
}

// Team performance data for probability calculations
interface TeamData {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  homeRecord: [number, number];
  awayRecord: [number, number];
  recentForm: ("W" | "L")[];
  strengthOfSchedule: number;
}

const teamDatabase: Record<string, TeamData> = {
  // NBA
  "Boston Celtics": { wins: 54, losses: 18, pointsFor: 120.5, pointsAgainst: 108.2, homeRecord: [30, 7], awayRecord: [24, 11], recentForm: ["W","W","W","L","W"], strengthOfSchedule: 0.52 },
  "Oklahoma City Thunder": { wins: 56, losses: 16, pointsFor: 118.3, pointsAgainst: 107.1, homeRecord: [31, 6], awayRecord: [25, 10], recentForm: ["W","W","L","W","W"], strengthOfSchedule: 0.50 },
  "Cleveland Cavaliers": { wins: 52, losses: 20, pointsFor: 116.8, pointsAgainst: 109.4, homeRecord: [29, 8], awayRecord: [23, 12], recentForm: ["W","L","W","W","W"], strengthOfSchedule: 0.49 },
  "Denver Nuggets": { wins: 49, losses: 23, pointsFor: 115.2, pointsAgainst: 111.3, homeRecord: [27, 10], awayRecord: [22, 13], recentForm: ["L","W","W","L","W"], strengthOfSchedule: 0.51 },
  "LA Clippers": { wins: 36, losses: 36, pointsFor: 113.4, pointsAgainst: 114.1, homeRecord: [20, 17], awayRecord: [16, 19], recentForm: ["L","L","W","L","W"], strengthOfSchedule: 0.48 },
  "Golden State Warriors": { wins: 33, losses: 39, pointsFor: 111.2, pointsAgainst: 115.6, homeRecord: [18, 19], awayRecord: [15, 20], recentForm: ["L","W","L","L","W"], strengthOfSchedule: 0.47 },
  "Phoenix Suns": { wins: 30, losses: 42, pointsFor: 109.8, pointsAgainst: 117.2, homeRecord: [16, 21], awayRecord: [14, 21], recentForm: ["L","L","L","W","L"], strengthOfSchedule: 0.46 },
  "Miami Heat": { wins: 38, losses: 34, pointsFor: 112.1, pointsAgainst: 113.8, homeRecord: [21, 16], awayRecord: [17, 18], recentForm: ["W","W","L","W","L"], strengthOfSchedule: 0.50 },
  // NFL
  "Kansas City Chiefs": { wins: 15, losses: 2, pointsFor: 28.4, pointsAgainst: 17.1, homeRecord: [8, 1], awayRecord: [7, 1], recentForm: ["W","W","W","W","L"], strengthOfSchedule: 0.52 },
  "San Francisco 49ers": { wins: 12, losses: 5, pointsFor: 25.6, pointsAgainst: 19.3, homeRecord: [7, 2], awayRecord: [5, 3], recentForm: ["W","L","W","W","W"], strengthOfSchedule: 0.51 },
  "Philadelphia Eagles": { wins: 14, losses: 3, pointsFor: 27.2, pointsAgainst: 18.5, homeRecord: [8, 1], awayRecord: [6, 2], recentForm: ["W","W","W","L","W"], strengthOfSchedule: 0.50 },
  "Dallas Cowboys": { wins: 10, losses: 7, pointsFor: 22.4, pointsAgainst: 22.1, homeRecord: [6, 3], awayRecord: [4, 4], recentForm: ["L","W","L","W","W"], strengthOfSchedule: 0.48 },
  "Buffalo Bills": { wins: 13, losses: 4, pointsFor: 26.8, pointsAgainst: 19.8, homeRecord: [7, 2], awayRecord: [6, 2], recentForm: ["W","W","L","W","W"], strengthOfSchedule: 0.51 },
  "Baltimore Ravens": { wins: 13, losses: 4, pointsFor: 27.5, pointsAgainst: 18.9, homeRecord: [7, 1], awayRecord: [6, 3], recentForm: ["W","W","W","L","W"], strengthOfSchedule: 0.53 },
  // Soccer
  "Manchester City": { wins: 24, losses: 4, pointsFor: 2.1, pointsAgainst: 0.7, homeRecord: [13, 1], awayRecord: [11, 3], recentForm: ["W","W","W","W","W"], strengthOfSchedule: 0.60 },
  "Arsenal": { wins: 22, losses: 6, pointsFor: 1.9, pointsAgainst: 0.8, homeRecord: [12, 2], awayRecord: [10, 4], recentForm: ["W","W","L","W","W"], strengthOfSchedule: 0.58 },
  "Liverpool": { wins: 23, losses: 5, pointsFor: 2.0, pointsAgainst: 0.9, homeRecord: [13, 1], awayRecord: [10, 4], recentForm: ["W","L","W","W","W"], strengthOfSchedule: 0.59 },
  "Real Madrid": { wins: 26, losses: 3, pointsFor: 2.3, pointsAgainst: 0.6, homeRecord: [14, 1], awayRecord: [12, 2], recentForm: ["W","W","W","W","W"], strengthOfSchedule: 0.65 },
};

/** Deterministic pseudo-stats for teams not in DB (no Math.random — stable across refreshes). */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getTeamData(teamName: string): TeamData {
  const data = teamDatabase[teamName];
  if (data) return data;
  const h = hashString(teamName.toLowerCase());
  const wins = 25 + (h % 18);
  const losses = Math.max(10, 72 - wins - (h % 8));
  const pf = 105 + (h % 200) / 20;
  const pa = 103 + ((h >> 3) % 200) / 20;
  const formBits = h ^ (h >> 5);
  const recentForm = Array.from({ length: 5 }, (_, i) =>
    (formBits >> i) & 1 ? "W" : "L"
  ) as ("W" | "L")[];
  return {
    wins,
    losses,
    pointsFor: pf,
    pointsAgainst: pa,
    homeRecord: [Math.floor(wins * 0.55), Math.floor(losses * 0.45)],
    awayRecord: [Math.floor(wins * 0.45), Math.floor(losses * 0.55)],
    recentForm,
    strengthOfSchedule: 0.45 + ((h % 100) / 1000),
  };
}

function calculateEloRating(teamData: TeamData): number {
  const winPct = teamData.wins / (teamData.wins + teamData.losses);
  const pointDiff = teamData.pointsFor - teamData.pointsAgainst;
  const recentFormBonus = teamData.recentForm.reduce((acc, result) =>
    acc + (result === "W" ? 0.02 : -0.02), 0);
  const sosAdjustment = (teamData.strengthOfSchedule - 0.5) * 0.1;

  return 1500 + (winPct - 0.5) * 400 + pointDiff * 2 + recentFormBonus * 100 + sosAdjustment * 200;
}

function calculateWinProbability(homeElo: number, awayElo: number, isHome: boolean): number {
  const homeAdvantage = isHome ? 65 : 0; // Elo home advantage
  const eloDiff = homeElo - awayElo + (isHome ? homeAdvantage : -homeAdvantage);
  const probability = 1 / (1 + Math.pow(10, -eloDiff / 400));
  return Math.min(0.92, Math.max(0.08, probability));
}

function calculateSpread(homeProb: number, sport: string): number {
  // Convert win probability to expected point spread
  const edge = (homeProb - 0.5) * 2;
  let spreadMultiplier = 10; // NBA
  if (sport === "football") spreadMultiplier = 6;
  if (sport === "soccer") spreadMultiplier = 1.5;
  if (sport === "baseball") spreadMultiplier = 2;
  if (sport === "hockey") spreadMultiplier = 1.2;

  return Math.round(edge * spreadMultiplier * 2) / 2;
}

function calculateOverUnder(homeTeamData: TeamData, awayTeamData: TeamData, sport: string): number {
  const avgScoring = (homeTeamData.pointsFor + awayTeamData.pointsFor +
                      homeTeamData.pointsAgainst + awayTeamData.pointsAgainst) / 4;
  const baseline = { basketball: 220, football: 44, soccer: 2.5, baseball: 8.5, hockey: 5.5 }[sport] || 100;
  const adjustment = (avgScoring / ((homeTeamData.pointsFor + homeTeamData.pointsAgainst) / 2 +
                                     (awayTeamData.pointsFor + awayTeamData.pointsAgainst) / 2) * 2 - 1) *
                     baseline * 0.15;
  return Math.round((baseline + adjustment) * 2) / 2;
}

function probabilityToMoneyline(probability: number): number {
  if (probability >= 0.5) {
    return Math.round(-(probability / (1 - probability)) * 100);
  } else {
    return Math.round(((1 - probability) / probability) * 100);
  }
}

export class BettingService {
  analyzeGame(homeTeam: string, awayTeam: string, sport: string): BetAnalysis {
    const homeData = getTeamData(homeTeam);
    const awayData = getTeamData(awayTeam);

    const homeElo = calculateEloRating(homeData);
    const awayElo = calculateEloRating(awayData);

    const homeWinProb = calculateWinProbability(homeElo, awayElo, true);
    const awayWinProb = 1 - homeWinProb;

    const spread = calculateSpread(homeWinProb, sport);
    const overUnder = calculateOverUnder(homeData, awayData, sport);

    const homeMoneyline = probabilityToMoneyline(homeWinProb);
    const awayMoneyline = probabilityToMoneyline(awayWinProb);

    // Determine confidence level
    const probDiff = Math.abs(homeWinProb - 0.5);
    const confidence: "low" | "medium" | "high" =
      probDiff > 0.2 ? "high" : probDiff > 0.1 ? "medium" : "low";

    const homeFormStr = homeData.recentForm.join("");
    const awayFormStr = awayData.recentForm.join("");

    const keyFactors: string[] = [];
    if (homeData.recentForm.filter(f => f === "W").length >= 4)
      keyFactors.push(`${homeTeam} on hot streak (${homeFormStr})`);
    if (awayData.recentForm.filter(f => f === "W").length >= 4)
      keyFactors.push(`${awayTeam} playing well recently (${awayFormStr})`);
    if (homeData.homeRecord[0] / (homeData.homeRecord[0] + homeData.homeRecord[1]) > 0.7)
      keyFactors.push(`${homeTeam} dominant at home`);
    if (homeElo - awayElo > 100)
      keyFactors.push(`${homeTeam} significant talent advantage`);
    if (awayElo - homeElo > 100)
      keyFactors.push(`${awayTeam} significant talent advantage`);
    if (homeData.strengthOfSchedule > 0.55)
      keyFactors.push(`${homeTeam} battle-tested vs strong schedule`);
    if (keyFactors.length === 0)
      keyFactors.push("Closely matched teams", "Key matchup to watch");

    const favoredTeam = homeWinProb > 0.5 ? homeTeam : awayTeam;
    const favoredProb = Math.max(homeWinProb, awayWinProb);

    const analysis = `${favoredTeam} is favored at ${(favoredProb * 100).toFixed(1)}% win probability. ` +
      `The spread suggests ${homeTeam} ${spread > 0 ? "covers" : "giving"} ${Math.abs(spread)} points. ` +
      `Based on recent form, ${homeData.recentForm.filter(f=>f==="W").length > awayData.recentForm.filter(f=>f==="W").length ? homeTeam : awayTeam} ` +
      `has the momentum edge heading into this matchup.`;

    return {
      gameId: `${homeTeam.replace(/\s/g, "-")}-vs-${awayTeam.replace(/\s/g, "-")}`,
      homeTeam,
      awayTeam,
      sport,
      homeWinProbability: homeWinProb,
      awayWinProbability: awayWinProb,
      recommendedSpread: spread,
      recommendedOverUnder: overUnder,
      homeMoneyline,
      awayMoneyline,
      confidence,
      keyFactors,
      homeRecentForm: homeData.recentForm,
      awayRecentForm: awayData.recentForm,
      homeRecord: `${homeData.wins}-${homeData.losses}`,
      awayRecord: `${awayData.wins}-${awayData.losses}`,
      analysis,
      oddsSource: "model",
    };
  }

  /** Model-based analysis plus optional The Odds API lines when `ODDS_API_KEY` is set. */
  async analyzeGameWithOdds(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    opts?: { eventId?: string }
  ): Promise<BetAnalysis> {
    const base = this.analyzeGame(homeTeam, awayTeam, sport);
    const withId: BetAnalysis = {
      ...base,
      eventId: opts?.eventId,
      oddsSource: "model",
    };

    const lines = await oddsApiService.findMatchOdds(homeTeam, awayTeam, sport);
    if (!lines || (lines.homeMoneyline == null && lines.awayMoneyline == null)) {
      return withId;
    }

    return {
      ...withId,
      oddsSource: "sportsbook",
      homeMoneyline: lines.homeMoneyline ?? base.homeMoneyline,
      awayMoneyline: lines.awayMoneyline ?? base.awayMoneyline,
      recommendedSpread:
        lines.spread !== undefined && !Number.isNaN(lines.spread)
          ? lines.spread
          : base.recommendedSpread,
      recommendedOverUnder:
        lines.total !== undefined && !Number.isNaN(lines.total)
          ? lines.total
          : base.recommendedOverUnder,
    };
  }

  getAccount(userId: string): MockAccount {
    return getOrCreateAccount(userId);
  }

  getBets(userId: string): MockBet[] {
    const userBets = getUserBets(userId);
    // Lazy settlement: settle any pending bets whose games should have finished
    const now = Date.now();
    for (const bet of userBets) {
      if (bet.status === "pending" && bet.gameEndTime) {
        if (new Date(bet.gameEndTime).getTime() <= now) {
          this.settleBet(userId, bet.id);
        }
      }
    }
    return userBets;
  }

  /** Estimate when a game finishes based on sport */
  private computeGameEndTime(startIso: string | undefined, sport: string): string | undefined {
    if (!startIso) return undefined;
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return undefined;
    // Typical game durations in minutes
    const durations: Record<string, number> = {
      basketball: 150,
      football: 210,
      soccer: 120,
      baseball: 180,
      hockey: 150,
    };
    const minutes = durations[sport] || 180;
    return new Date(start.getTime() + minutes * 60 * 1000).toISOString();
  }

  placeBet(userId: string, bet: Omit<MockBet, "id" | "placedAt" | "status" | "potentialPayout">): MockBet | { error: string } {
    const account = getOrCreateAccount(userId);

    if (bet.amount <= 0) return { error: "Bet amount must be positive" };
    if (bet.amount > account.balance) return { error: "Insufficient balance" };
    if (bet.amount > 5000) return { error: "Maximum bet is $5,000" };
    if (bet.amount < 1) return { error: "Minimum bet is $1" };

    // Validate game hasn't already started / finished
    if (bet.gameStartTime) {
      const start = new Date(bet.gameStartTime).getTime();
      if (!isNaN(start) && start <= Date.now()) {
        return { error: "Cannot bet on a game that has already started" };
      }
    }

    const potentialPayout = bet.odds > 0
      ? bet.amount + (bet.amount * bet.odds / 100)
      : bet.amount + (bet.amount / (Math.abs(bet.odds) / 100));

    const gameEndTime = this.computeGameEndTime(bet.gameStartTime, bet.sport);

    const newBet: MockBet = {
      ...bet,
      id: `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      potentialPayout: Math.round(potentialPayout * 100) / 100,
      placedAt: new Date().toISOString(),
      gameEndTime,
    };

    // Deduct from balance
    account.balance -= bet.amount;
    account.balance = Math.round(account.balance * 100) / 100;
    account.totalBets += 1;
    account.totalWagered += bet.amount;

    const userBets = getUserBets(userId);
    userBets.push(newBet);

    return newBet;
  }

  settleBet(userId: string, betId: string): void {
    const account = getOrCreateAccount(userId);
    const userBets = getUserBets(userId);
    const bet = userBets.find(b => b.id === betId);

    if (!bet || bet.status !== "pending") return;

    // Simulate outcome based on win probability
    const roll = Math.random();
    const won = roll < bet.winProbability;

    // 5% push chance for spread bets
    const push = bet.betType === "spread" && Math.abs(roll - bet.winProbability) < 0.05;

    if (push) {
      bet.status = "push";
      account.balance += bet.amount; // Refund
      account.pushBets += 1;
      bet.result = "Push - bet refunded";
    } else if (won) {
      bet.status = "won";
      account.balance += bet.potentialPayout;
      account.wonBets += 1;
      account.totalProfit += (bet.potentialPayout - bet.amount);
      bet.result = `Won! +$${(bet.potentialPayout - bet.amount).toFixed(2)}`;
    } else {
      bet.status = "lost";
      account.lostBets += 1;
      account.totalProfit -= bet.amount;
      bet.result = `Lost -$${bet.amount.toFixed(2)}`;
    }

    bet.settledAt = new Date().toISOString();

    // Update stats
    const settledBets = userBets.filter(b => b.status !== "pending" && b.status !== "cancelled");
    const wonCount = settledBets.filter(b => b.status === "won").length;
    account.winRate = settledBets.length > 0 ? wonCount / settledBets.length : 0;
    account.roi = account.totalWagered > 0 ? (account.totalProfit / account.totalWagered) * 100 : 0;
    account.balance = Math.round(account.balance * 100) / 100;
  }

  cancelBet(userId: string, betId: string): MockBet | { error: string } {
    const account = getOrCreateAccount(userId);
    const userBets = getUserBets(userId);
    const bet = userBets.find(b => b.id === betId);

    if (!bet) return { error: "Bet not found" };
    if (bet.status !== "pending") return { error: "Can only cancel pending bets" };

    bet.status = "cancelled";
    account.balance += bet.amount;
    account.totalBets -= 1;
    account.totalWagered -= bet.amount;
    account.balance = Math.round(account.balance * 100) / 100;

    return bet;
  }

  resetAccount(userId: string): MockAccount {
    const account: MockAccount = {
      balance: DEFAULT_BALANCE,
      startingBalance: DEFAULT_BALANCE,
      totalBets: 0,
      wonBets: 0,
      lostBets: 0,
      pushBets: 0,
      totalWagered: 0,
      totalProfit: 0,
      winRate: 0,
      roi: 0,
    };
    mockAccounts.set(userId, account);
    mockBets.set(userId, []);
    return account;
  }

  getTrendingBets(): { game: string; betType: string; popularity: number; value: number }[] {
    return [
      { game: "Boston Celtics vs Oklahoma City Thunder", betType: "Over 228.5", popularity: 87, value: 72 },
      { game: "Kansas City Chiefs vs Buffalo Bills", betType: "Chiefs -3", popularity: 76, value: 65 },
      { game: "Real Madrid vs Manchester City", betType: "Both Teams Score", popularity: 82, value: 68 },
      { game: "Denver Nuggets vs Cleveland Cavaliers", betType: "Nuggets ML", popularity: 61, value: 58 },
      { game: "Philadelphia Eagles vs Dallas Cowboys", betType: "Eagles -6.5", popularity: 71, value: 62 },
    ];
  }
}

export const bettingService = new BettingService();
