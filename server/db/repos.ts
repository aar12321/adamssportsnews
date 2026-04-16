import type {
  MockAccount,
  MockBet,
  UserPreferences,
  FantasyPlayer,
  SportId,
} from "@shared/schema";
import { JsonStore, installShutdownHandlers, registerStore } from "./persistence";

// -----------------------------------------------------------------------------
// Repositories: persistent stores behind a narrow interface.
//
// Default backend is JSON files under `.data/` (real durability, survives
// restart, no DB server needed). When DATABASE_URL is configured the same
// interface can be re-implemented against Drizzle/Postgres using the tables
// defined in shared/dbSchema.ts. Services never import JSON files or DB
// clients directly — they always go through a repo.
// -----------------------------------------------------------------------------

installShutdownHandlers();

// --- Betting accounts + bets ---------------------------------------------

type AccountMap = Record<string, MockAccount>;
type BetsMap = Record<string, MockBet[]>;

const accountsStore = new JsonStore<AccountMap>("betting-accounts", () => ({}));
const betsStore = new JsonStore<BetsMap>("betting-bets", () => ({}));
registerStore(accountsStore);
registerStore(betsStore);

export const accountRepo = {
  get(userId: string): MockAccount | undefined {
    return accountsStore.read()[userId];
  },
  upsert(userId: string, account: MockAccount): MockAccount {
    const data = accountsStore.read();
    data[userId] = account;
    accountsStore.save();
    return account;
  },
  delete(userId: string): void {
    const data = accountsStore.read();
    delete data[userId];
    accountsStore.save();
  },
};

export const betsRepo = {
  listByUser(userId: string): MockBet[] {
    return betsStore.read()[userId] ?? [];
  },
  replaceForUser(userId: string, bets: MockBet[]): void {
    const data = betsStore.read();
    data[userId] = bets;
    betsStore.save();
  },
  add(userId: string, bet: MockBet): void {
    const data = betsStore.read();
    const list = data[userId] ?? [];
    list.push(bet);
    data[userId] = list;
    betsStore.save();
  },
  update(userId: string, betId: string, patch: Partial<MockBet>): MockBet | undefined {
    const data = betsStore.read();
    const list = data[userId];
    if (!list) return undefined;
    const idx = list.findIndex((b) => b.id === betId);
    if (idx === -1) return undefined;
    list[idx] = { ...list[idx], ...patch };
    betsStore.save();
    return list[idx];
  },
  remove(userId: string, betId: string): boolean {
    const data = betsStore.read();
    const list = data[userId];
    if (!list) return false;
    const next = list.filter((b) => b.id !== betId);
    if (next.length === list.length) return false;
    data[userId] = next;
    betsStore.save();
    return true;
  },
  removeAllForUser(userId: string): void {
    const data = betsStore.read();
    delete data[userId];
    betsStore.save();
  },
  /** Iterate all pending bets across all users — for background settlement. */
  listAllPending(): Array<{ userId: string; bet: MockBet }> {
    const out: Array<{ userId: string; bet: MockBet }> = [];
    const data = betsStore.read();
    for (const [userId, list] of Object.entries(data)) {
      for (const bet of list) {
        if (bet.status === "pending") out.push({ userId, bet });
      }
    }
    return out;
  },
};

// --- User preferences -----------------------------------------------------

type PrefsMap = Record<string, UserPreferences>;
const prefsStore = new JsonStore<PrefsMap>("user-preferences", () => ({}));
registerStore(prefsStore);

export const preferencesRepo = {
  get(userId: string): UserPreferences | undefined {
    return prefsStore.read()[userId];
  },
  upsert(userId: string, prefs: UserPreferences): UserPreferences {
    const data = prefsStore.read();
    data[userId] = prefs;
    prefsStore.save();
    return prefs;
  },
  delete(userId: string): void {
    const data = prefsStore.read();
    delete data[userId];
    prefsStore.save();
  },
  // Used by the notifier — iterate users and their notification prefs.
  all(): UserPreferences[] {
    return Object.values(prefsStore.read());
  },
};

// --- Fantasy rosters ------------------------------------------------------

type RosterMap = Record<string, Record<string, FantasyPlayer[]>>; // userId → sport → players

const rosterStore = new JsonStore<RosterMap>("fantasy-rosters", () => ({}));
registerStore(rosterStore);

export const rosterRepo = {
  getBySport(userId: string, sport: string): FantasyPlayer[] {
    return rosterStore.read()[userId]?.[sport] ?? [];
  },
  getAll(userId: string): Record<string, FantasyPlayer[]> {
    return rosterStore.read()[userId] ?? {};
  },
  setBySport(userId: string, sport: string, players: FantasyPlayer[]): void {
    const data = rosterStore.read();
    const user = data[userId] ?? {};
    user[sport] = players;
    data[userId] = user;
    rosterStore.save();
  },
  clearSport(userId: string, sport: string): void {
    const data = rosterStore.read();
    if (data[userId]) {
      delete data[userId][sport];
      rosterStore.save();
    }
  },
};

// --- Fantasy leagues, members, matchups ----------------------------------

export interface LeagueRecord {
  id: string;
  name: string;
  sport: SportId;
  ownerId: string;
  maxMembers: number;
  scoringFormat: string;
  currentWeek: number;
  startWeek: number;
  inviteCode: string;
  createdAt: string;
}

export interface LeagueMemberRecord {
  leagueId: string;
  userId: string;
  teamName: string;
  joinedAt: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface MatchupRecord {
  id: string;
  leagueId: string;
  week: number;
  homeUserId: string;
  awayUserId: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "live" | "final";
  settledAt?: string;
}

interface LeagueWorld {
  leagues: LeagueRecord[];
  members: LeagueMemberRecord[];
  matchups: MatchupRecord[];
}

const leaguesStore = new JsonStore<LeagueWorld>("fantasy-leagues", () => ({
  leagues: [],
  members: [],
  matchups: [],
}));
registerStore(leaguesStore);

export const leaguesRepo = {
  createLeague(league: LeagueRecord): LeagueRecord {
    const data = leaguesStore.read();
    data.leagues.push(league);
    leaguesStore.save();
    return league;
  },
  getLeague(id: string): LeagueRecord | undefined {
    return leaguesStore.read().leagues.find((l) => l.id === id);
  },
  getLeagueByInvite(code: string): LeagueRecord | undefined {
    return leaguesStore.read().leagues.find((l) => l.inviteCode === code);
  },
  listLeaguesForUser(userId: string): LeagueRecord[] {
    const data = leaguesStore.read();
    const leagueIds = new Set(
      data.members.filter((m) => m.userId === userId).map((m) => m.leagueId),
    );
    return data.leagues.filter((l) => leagueIds.has(l.id));
  },
  updateLeague(id: string, patch: Partial<LeagueRecord>): LeagueRecord | undefined {
    const data = leaguesStore.read();
    const idx = data.leagues.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    data.leagues[idx] = { ...data.leagues[idx], ...patch };
    leaguesStore.save();
    return data.leagues[idx];
  },
  addMember(member: LeagueMemberRecord): LeagueMemberRecord {
    const data = leaguesStore.read();
    data.members.push(member);
    leaguesStore.save();
    return member;
  },
  getMember(leagueId: string, userId: string): LeagueMemberRecord | undefined {
    return leaguesStore.read().members.find(
      (m) => m.leagueId === leagueId && m.userId === userId,
    );
  },
  listMembers(leagueId: string): LeagueMemberRecord[] {
    return leaguesStore.read().members.filter((m) => m.leagueId === leagueId);
  },
  updateMember(
    leagueId: string,
    userId: string,
    patch: Partial<LeagueMemberRecord>,
  ): LeagueMemberRecord | undefined {
    const data = leaguesStore.read();
    const idx = data.members.findIndex(
      (m) => m.leagueId === leagueId && m.userId === userId,
    );
    if (idx === -1) return undefined;
    data.members[idx] = { ...data.members[idx], ...patch };
    leaguesStore.save();
    return data.members[idx];
  },
  addMatchup(matchup: MatchupRecord): MatchupRecord {
    const data = leaguesStore.read();
    data.matchups.push(matchup);
    leaguesStore.save();
    return matchup;
  },
  listMatchups(leagueId: string, week?: number): MatchupRecord[] {
    const data = leaguesStore.read();
    return data.matchups.filter(
      (m) => m.leagueId === leagueId && (week === undefined || m.week === week),
    );
  },
  updateMatchup(id: string, patch: Partial<MatchupRecord>): MatchupRecord | undefined {
    const data = leaguesStore.read();
    const idx = data.matchups.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    data.matchups[idx] = { ...data.matchups[idx], ...patch };
    leaguesStore.save();
    return data.matchups[idx];
  },
};

// --- Push subscriptions ---------------------------------------------------

export interface PushSubscriptionRecord {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

const pushStore = new JsonStore<{ subs: PushSubscriptionRecord[] }>("push-subs", () => ({
  subs: [],
}));
registerStore(pushStore);

export const pushRepo = {
  add(sub: PushSubscriptionRecord): PushSubscriptionRecord {
    const data = pushStore.read();
    const filtered = data.subs.filter((s) => s.endpoint !== sub.endpoint);
    filtered.push(sub);
    data.subs = filtered;
    pushStore.save();
    return sub;
  },
  removeByEndpoint(endpoint: string): void {
    const data = pushStore.read();
    data.subs = data.subs.filter((s) => s.endpoint !== endpoint);
    pushStore.save();
  },
  listByUser(userId: string): PushSubscriptionRecord[] {
    return pushStore.read().subs.filter((s) => s.userId === userId);
  },
  listAll(): PushSubscriptionRecord[] {
    return pushStore.read().subs;
  },
};

// --- Notification dedup ---------------------------------------------------

const sentStore = new JsonStore<{ sent: Record<string, string[]> }>("sent-notifications", () => ({
  sent: {},
}));
registerStore(sentStore);

export const sentNotificationsRepo = {
  hasSeen(userId: string, articleId: string): boolean {
    return !!sentStore.read().sent[userId]?.includes(articleId);
  },
  markSent(userId: string, articleId: string): void {
    const data = sentStore.read();
    const list = data.sent[userId] ?? [];
    if (!list.includes(articleId)) {
      list.push(articleId);
      // Keep at most last 500 per user to bound memory
      if (list.length > 500) list.splice(0, list.length - 500);
      data.sent[userId] = list;
      sentStore.save();
    }
  },
};
