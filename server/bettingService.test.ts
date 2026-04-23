import { describe, it, expect } from "vitest";
import { BettingService } from "./bettingService";

// bettingService keeps accounts and bets in module-level Maps, so we
// give every test a unique userId to keep state isolated without having
// to plumb a reset method into production code.
let userCounter = 0;
const uid = () => `test-user-${++userCounter}-${process.pid}`;
const svc = () => new BettingService();

// Helper: place a bet and immediately return the placed MockBet.
function place(
  service: BettingService,
  userId: string,
  over: Partial<any> = {},
) {
  const base = {
    gameId: "g1",
    homeTeam: "Home",
    awayTeam: "Away",
    sport: "basketball",
    betType: "moneyline" as const,
    amount: 100,
    odds: 100,
    winProbability: 0.5,
    selectedTeam: "Home",
  };
  const result = service.placeBet(userId, { ...base, ...over } as any);
  if ("error" in result) throw new Error(`place failed: ${result.error}`);
  return result;
}

describe("placeBet", () => {
  it("deducts stake from balance and records the wager", () => {
    const s = svc(); const u = uid();
    const account0 = s.getAccount(u);
    expect(account0.balance).toBe(10000);
    place(s, u, { amount: 250 });
    const account1 = s.getAccount(u);
    expect(account1.balance).toBe(10000 - 250);
    expect(account1.totalBets).toBe(1);
    expect(account1.totalWagered).toBe(250);
  });

  it("rejects bets over the balance", () => {
    const s = svc(); const u = uid();
    const result = s.placeBet(u, {
      gameId: "g", homeTeam: "A", awayTeam: "B", sport: "basketball",
      betType: "moneyline", amount: 99999, odds: 100, winProbability: 0.5,
    } as any);
    expect(result).toHaveProperty("error");
  });

  it("rejects bets under the $1 minimum", () => {
    const s = svc(); const u = uid();
    const result = s.placeBet(u, {
      gameId: "g", homeTeam: "A", awayTeam: "B", sport: "basketball",
      betType: "moneyline", amount: 0.5, odds: 100, winProbability: 0.5,
    } as any);
    expect(result).toHaveProperty("error");
  });

  it("computes +100 (even) payout as double the stake", () => {
    const s = svc(); const u = uid();
    const bet = place(s, u, { amount: 100, odds: 100 });
    expect(bet.potentialPayout).toBe(200);
  });

  it("computes -200 (favorite) payout at 1.5x the stake", () => {
    const s = svc(); const u = uid();
    const bet = place(s, u, { amount: 100, odds: -200 });
    expect(bet.potentialPayout).toBe(150);
  });

  it("computes +250 (underdog) payout at 3.5x the stake", () => {
    const s = svc(); const u = uid();
    const bet = place(s, u, { amount: 100, odds: 250 });
    expect(bet.potentialPayout).toBe(350);
  });
});

describe("cancelBet", () => {
  it("refunds the stake and reverses the totals", () => {
    const s = svc(); const u = uid();
    const bet = place(s, u, { amount: 100 });
    const result = s.cancelBet(u, bet.id);
    expect("error" in result).toBe(false);
    const account = s.getAccount(u);
    expect(account.balance).toBe(10000);
    expect(account.totalBets).toBe(0);
    expect(account.totalWagered).toBe(0);
  });

  it("refuses to cancel a non-pending bet", () => {
    const s = svc(); const u = uid();
    const bet = place(s, u);
    (bet as any).status = "won";
    const result = s.cancelBet(u, bet.id);
    expect(result).toHaveProperty("error");
  });
});

describe("settleBet + streaks", () => {
  it("credits winnings on a guaranteed-win bet", () => {
    const s = svc(); const u = uid();
    const bet = place(s, u, { amount: 100, odds: 100, winProbability: 0.99 });
    s.settleBet(u, bet.id);
    const account = s.getAccount(u);
    const settled = s.getBets(u).find(b => b.id === bet.id) as any;
    expect(["won", "push"]).toContain(settled.status);
    expect(account.balance).toBeGreaterThan(10000 - 100);
  });

  it("deducts on a guaranteed-loss bet", () => {
    const s = svc(); const u = uid();
    const bet = place(s, u, { amount: 100, odds: 100, winProbability: 0.01 });
    s.settleBet(u, bet.id);
    const settled = s.getBets(u).find(b => b.id === bet.id)!;
    expect(settled.status).toBe("lost");
    const account = s.getAccount(u);
    expect(account.balance).toBe(10000 - 100);
    expect(account.lostBets).toBe(1);
    expect(account.currentStreak).toBe(-1);
  });

  it("clamps streak to -1 on a loss that breaks a winning run", () => {
    const s = svc(); const u = uid();
    const w = place(s, u, { amount: 50, odds: 100, winProbability: 0.99 });
    s.settleBet(u, w.id);
    const l = place(s, u, { amount: 50, odds: 100, winProbability: 0.01 });
    s.settleBet(u, l.id);
    const account = s.getAccount(u);
    expect(account.currentStreak).toBe(-1);
  });
});

describe("resetAccount", () => {
  it("wipes balance, bets, and stats", () => {
    const s = svc(); const u = uid();
    place(s, u, { amount: 250 });
    s.resetAccount(u);
    const account = s.getAccount(u);
    expect(account.balance).toBe(10000);
    expect(account.totalBets).toBe(0);
    expect(s.getBets(u)).toHaveLength(0);
  });
});

describe("analyzeGame", () => {
  it("returns probabilities that sum to 1", () => {
    const s = svc();
    const a = s.analyzeGame("Boston Celtics", "Miami Heat", "basketball");
    expect(a.homeWinProbability + a.awayWinProbability).toBeCloseTo(1, 4);
  });
  it("clamps probability into a realistic band", () => {
    const s = svc();
    const a = s.analyzeGame("Nonexistent Team A", "Nonexistent Team B", "basketball");
    expect(a.homeWinProbability).toBeGreaterThanOrEqual(0.08);
    expect(a.homeWinProbability).toBeLessThanOrEqual(0.92);
  });
});
