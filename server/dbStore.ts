import { notInArray, sql } from "drizzle-orm";
import { getDb, isDbEnabled } from "./db";
import {
  mockAccountsTable,
  mockBetsTable,
  userPreferencesTable,
} from "@shared/schema";
import type { MockAccount, MockBet, UserPreferences } from "@shared/schema";

/**
 * Narrow DB-backed layer for the services that used to persist to JSON
 * snapshots. Each hydrate* is async (called once at boot via top-level
 * await) and returns the whole table as a Map so the existing in-memory
 * services stay sync. Each write* is fire-and-forget async — the caller
 * triggers it from the same debounced schedule that writes the JSON
 * snapshot, so the cost is one extra UPSERT per mutation burst.
 *
 * Nothing here throws on connection failure — the caller always has the
 * JSON snapshot fallback.
 */

function logFail(tag: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[dbStore] ${tag} failed: ${msg}`);
}

// ---------- Accounts ----------

export async function hydrateAccountsFromDb(): Promise<Map<string, MockAccount> | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(mockAccountsTable);
    const out = new Map<string, MockAccount>();
    for (const row of rows) {
      out.set(row.userId, {
        balance: row.balance,
        startingBalance: row.startingBalance,
        totalBets: row.totalBets,
        wonBets: row.wonBets,
        lostBets: row.lostBets,
        pushBets: row.pushBets,
        totalWagered: row.totalWagered,
        totalProfit: row.totalProfit,
        winRate: row.winRate,
        roi: row.roi,
        currentStreak: row.currentStreak,
        bestWinStreak: row.bestWinStreak,
      });
    }
    return out;
  } catch (err) {
    logFail("hydrateAccountsFromDb", err);
    return null;
  }
}

export async function upsertAccountsToDb(accounts: Map<string, MockAccount>): Promise<void> {
  const db = getDb();
  if (!db || accounts.size === 0) return;
  const values = Array.from(accounts, ([userId, a]) => ({
    userId,
    balance: a.balance,
    startingBalance: a.startingBalance,
    totalBets: a.totalBets,
    wonBets: a.wonBets,
    lostBets: a.lostBets,
    pushBets: a.pushBets,
    totalWagered: a.totalWagered,
    totalProfit: a.totalProfit,
    winRate: a.winRate,
    roi: a.roi,
    currentStreak: a.currentStreak ?? 0,
    bestWinStreak: a.bestWinStreak ?? 0,
    updatedAt: new Date(),
  }));
  try {
    await db
      .insert(mockAccountsTable)
      .values(values)
      .onConflictDoUpdate({
        target: mockAccountsTable.userId,
        set: {
          balance: sql`excluded.balance`,
          startingBalance: sql`excluded.starting_balance`,
          totalBets: sql`excluded.total_bets`,
          wonBets: sql`excluded.won_bets`,
          lostBets: sql`excluded.lost_bets`,
          pushBets: sql`excluded.push_bets`,
          totalWagered: sql`excluded.total_wagered`,
          totalProfit: sql`excluded.total_profit`,
          winRate: sql`excluded.win_rate`,
          roi: sql`excluded.roi`,
          currentStreak: sql`excluded.current_streak`,
          bestWinStreak: sql`excluded.best_win_streak`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  } catch (err) {
    logFail("upsertAccountsToDb", err);
  }
}

// ---------- Bets ----------

function toIsoDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function hydrateBetsFromDb(): Promise<Map<string, MockBet[]> | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(mockBetsTable);
    const out = new Map<string, MockBet[]>();
    for (const row of rows) {
      const bet: MockBet = {
        id: row.id,
        gameId: row.gameId,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        sport: row.sport,
        betType: row.betType as MockBet["betType"],
        selectedTeam: row.selectedTeam ?? undefined,
        amount: row.amount,
        odds: row.odds,
        spread: row.spread ?? undefined,
        overUnder: row.overUnder ?? undefined,
        isOver: row.isOver ?? undefined,
        status: row.status as MockBet["status"],
        potentialPayout: row.potentialPayout,
        winProbability: row.winProbability,
        placedAt: row.placedAt.toISOString(),
        gameStartTime: row.gameStartTime?.toISOString(),
        gameEndTime: row.gameEndTime?.toISOString(),
        settledAt: row.settledAt?.toISOString(),
        result: row.result ?? undefined,
      };
      const list = out.get(row.userId);
      if (list) list.push(bet);
      else out.set(row.userId, [bet]);
    }
    return out;
  } catch (err) {
    logFail("hydrateBetsFromDb", err);
    return null;
  }
}

export async function upsertBetsToDb(bets: Map<string, MockBet[]>): Promise<void> {
  const db = getDb();
  if (!db) return;
  // Flatten into one value set; skip if nothing to write.
  const values: (typeof mockBetsTable.$inferInsert)[] = [];
  const liveIds = new Set<string>();
  bets.forEach((list, userId) => {
    for (const b of list) {
      liveIds.add(b.id);
      values.push({
        id: b.id,
        userId,
        gameId: b.gameId,
        homeTeam: b.homeTeam,
        awayTeam: b.awayTeam,
        sport: b.sport,
        betType: b.betType,
        selectedTeam: b.selectedTeam ?? null,
        amount: b.amount,
        odds: b.odds,
        spread: b.spread ?? null,
        overUnder: b.overUnder ?? null,
        isOver: b.isOver ?? null,
        status: b.status,
        potentialPayout: b.potentialPayout,
        winProbability: b.winProbability,
        placedAt: new Date(b.placedAt),
        gameStartTime: toIsoDate(b.gameStartTime),
        gameEndTime: toIsoDate(b.gameEndTime),
        settledAt: toIsoDate(b.settledAt),
        result: b.result ?? null,
      });
    }
  });
  try {
    if (values.length > 0) {
      await db
        .insert(mockBetsTable)
        .values(values)
        .onConflictDoUpdate({
          target: mockBetsTable.id,
          set: {
            status: sql`excluded.status`,
            potentialPayout: sql`excluded.potential_payout`,
            settledAt: sql`excluded.settled_at`,
            result: sql`excluded.result`,
            gameEndTime: sql`excluded.game_end_time`,
          },
        });
    }
    // Delete rows that no longer exist in memory (e.g. hard-deleted
    // during a resetAccount). Skip the delete when we have no live rows
    // yet — that case means the memory Map is empty, which usually
    // happens pre-hydrate or in a test; don't clear the whole table.
    if (liveIds.size > 0) {
      await db
        .delete(mockBetsTable)
        .where(notInArray(mockBetsTable.id, Array.from(liveIds)));
    }
  } catch (err) {
    logFail("upsertBetsToDb", err);
  }
}

// ---------- Preferences ----------

function rowToPrefs(row: typeof userPreferencesTable.$inferSelect): UserPreferences {
  return {
    userId: row.userId,
    displayName: row.displayName,
    avatar: row.avatar ?? undefined,
    favoriteSports: row.favoriteSports,
    favoriteTeams: row.favoriteTeams,
    favoritePlayers: row.favoritePlayers,
    theme: row.theme as UserPreferences["theme"],
    viewMode: row.viewMode as UserPreferences["viewMode"],
    dashboardLayout: row.dashboardLayout,
    notifications: row.notifications,
    betting: row.betting,
    fantasy: row.fantasy,
    analyst: row.analyst,
  };
}

export async function hydratePreferencesFromDb(): Promise<Map<string, UserPreferences> | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(userPreferencesTable);
    const out = new Map<string, UserPreferences>();
    for (const row of rows) out.set(row.userId, rowToPrefs(row));
    return out;
  } catch (err) {
    logFail("hydratePreferencesFromDb", err);
    return null;
  }
}

export async function upsertPreferencesToDb(prefs: Map<string, UserPreferences>): Promise<void> {
  const db = getDb();
  if (!db || prefs.size === 0) return;
  const values = Array.from(prefs, ([userId, p]) => ({
    userId,
    displayName: p.displayName,
    avatar: p.avatar ?? null,
    theme: p.theme,
    viewMode: p.viewMode,
    favoriteSports: p.favoriteSports,
    favoriteTeams: p.favoriteTeams,
    favoritePlayers: p.favoritePlayers,
    dashboardLayout: p.dashboardLayout,
    notifications: p.notifications,
    betting: p.betting,
    fantasy: p.fantasy,
    analyst: p.analyst,
    updatedAt: new Date(),
  }));
  try {
    await db
      .insert(userPreferencesTable)
      .values(values)
      .onConflictDoUpdate({
        target: userPreferencesTable.userId,
        set: {
          displayName: sql`excluded.display_name`,
          avatar: sql`excluded.avatar`,
          theme: sql`excluded.theme`,
          viewMode: sql`excluded.view_mode`,
          favoriteSports: sql`excluded.favorite_sports`,
          favoriteTeams: sql`excluded.favorite_teams`,
          favoritePlayers: sql`excluded.favorite_players`,
          dashboardLayout: sql`excluded.dashboard_layout`,
          notifications: sql`excluded.notifications`,
          betting: sql`excluded.betting`,
          fantasy: sql`excluded.fantasy`,
          analyst: sql`excluded.analyst`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  } catch (err) {
    logFail("upsertPreferencesToDb", err);
  }
}

export { isDbEnabled };
