import type {
  MockAccount,
  MockBet,
  UserPreferences,
  FantasyPlayer,
  SportId,
} from "@shared/schema";
import { JsonStore, installShutdownHandlers, registerStore } from "./persistence";

// -----------------------------------------------------------------------------
// Repositories — persistent stores behind a narrow async interface.
//
// Two implementations share this shape: this file (JSON-file backed, great
// for local dev and restart durability) and ./supabaseRepos.ts (real
// Postgres via Supabase). The selector in ./repos-index.ts picks one at
// boot time based on env.
//
// EVERY repo method returns a Promise so callers don't need to know which
// backend is in use. The JSON impl simply resolves synchronously.
// -----------------------------------------------------------------------------

installShutdownHandlers();

// --- Shared record types (used by both backends) --------------------------

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

export interface OpponentRecord {
  id: string;
  userId: string;
  sport: string;
  name: string;
  players: FantasyPlayer[];
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionRecord {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

// ==========================================================================
// JSON-file backed implementations (the default / dev backend)
// ==========================================================================

// --- Betting accounts + bets ---------------------------------------------

type AccountMap = Record<string, MockAccount>;
type BetsMap = Record<string, MockBet[]>;

const accountsStore = new JsonStore<AccountMap>("betting-accounts", () => ({}));
const betsStore = new JsonStore<BetsMap>("betting-bets", () => ({}));
registerStore(accountsStore);
registerStore(betsStore);

export const jsonAccountRepo = {
  async get(userId: string): Promise<MockAccount | undefined> {
    return accountsStore.read()[userId];
  },
  async upsert(userId: string, account: MockAccount): Promise<MockAccount> {
    const data = accountsStore.read();
    data[userId] = account;
    accountsStore.save();
    return account;
  },
  async delete(userId: string): Promise<void> {
    const data = accountsStore.read();
    delete data[userId];
    accountsStore.save();
  },
};

export const jsonBetsRepo = {
  async listByUser(userId: string): Promise<MockBet[]> {
    return betsStore.read()[userId] ?? [];
  },
  async replaceForUser(userId: string, bets: MockBet[]): Promise<void> {
    const data = betsStore.read();
    data[userId] = bets;
    betsStore.save();
  },
  async add(userId: string, bet: MockBet): Promise<void> {
    const data = betsStore.read();
    const list = data[userId] ?? [];
    list.push(bet);
    data[userId] = list;
    betsStore.save();
  },
  async update(userId: string, betId: string, patch: Partial<MockBet>): Promise<MockBet | undefined> {
    const data = betsStore.read();
    const list = data[userId];
    if (!list) return undefined;
    const idx = list.findIndex((b) => b.id === betId);
    if (idx === -1) return undefined;
    list[idx] = { ...list[idx], ...patch };
    betsStore.save();
    return list[idx];
  },
  async remove(userId: string, betId: string): Promise<boolean> {
    const data = betsStore.read();
    const list = data[userId];
    if (!list) return false;
    const next = list.filter((b) => b.id !== betId);
    if (next.length === list.length) return false;
    data[userId] = next;
    betsStore.save();
    return true;
  },
  async removeAllForUser(userId: string): Promise<void> {
    const data = betsStore.read();
    delete data[userId];
    betsStore.save();
  },
  async listAllPending(): Promise<Array<{ userId: string; bet: MockBet }>> {
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

export const jsonPreferencesRepo = {
  async get(userId: string): Promise<UserPreferences | undefined> {
    return prefsStore.read()[userId];
  },
  async upsert(userId: string, prefs: UserPreferences): Promise<UserPreferences> {
    const data = prefsStore.read();
    data[userId] = prefs;
    prefsStore.save();
    return prefs;
  },
  async delete(userId: string): Promise<void> {
    const data = prefsStore.read();
    delete data[userId];
    prefsStore.save();
  },
  async all(): Promise<UserPreferences[]> {
    return Object.values(prefsStore.read());
  },
};

// --- Fantasy rosters ------------------------------------------------------

type RosterMap = Record<string, Record<string, FantasyPlayer[]>>;
const rosterStore = new JsonStore<RosterMap>("fantasy-rosters", () => ({}));
registerStore(rosterStore);

export const jsonRosterRepo = {
  async getBySport(userId: string, sport: string): Promise<FantasyPlayer[]> {
    return rosterStore.read()[userId]?.[sport] ?? [];
  },
  async getAll(userId: string): Promise<Record<string, FantasyPlayer[]>> {
    return rosterStore.read()[userId] ?? {};
  },
  async setBySport(userId: string, sport: string, players: FantasyPlayer[]): Promise<void> {
    const data = rosterStore.read();
    const user = data[userId] ?? {};
    user[sport] = players;
    data[userId] = user;
    rosterStore.save();
  },
  async clearSport(userId: string, sport: string): Promise<void> {
    const data = rosterStore.read();
    if (data[userId]) {
      delete data[userId][sport];
      rosterStore.save();
    }
  },
};

// --- Opponents ------------------------------------------------------------

const opponentsStore = new JsonStore<{ opponents: OpponentRecord[] }>("fantasy-opponents", () => ({
  opponents: [],
}));
registerStore(opponentsStore);

export const jsonOpponentsRepo = {
  async listByUserSport(userId: string, sport: string): Promise<OpponentRecord[]> {
    return opponentsStore.read().opponents.filter((o) => o.userId === userId && o.sport === sport);
  },
  async get(id: string): Promise<OpponentRecord | undefined> {
    return opponentsStore.read().opponents.find((o) => o.id === id);
  },
  async create(opponent: OpponentRecord): Promise<OpponentRecord> {
    const data = opponentsStore.read();
    data.opponents.push(opponent);
    opponentsStore.save();
    return opponent;
  },
  async update(id: string, patch: Partial<OpponentRecord>): Promise<OpponentRecord | undefined> {
    const data = opponentsStore.read();
    const idx = data.opponents.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    data.opponents[idx] = { ...data.opponents[idx], ...patch, updatedAt: new Date().toISOString() };
    opponentsStore.save();
    return data.opponents[idx];
  },
  async delete(id: string): Promise<void> {
    const data = opponentsStore.read();
    data.opponents = data.opponents.filter((o) => o.id !== id);
    opponentsStore.save();
  },
};

// --- Leagues, members, matchups ------------------------------------------

interface LeagueWorld {
  leagues: LeagueRecord[];
  members: LeagueMemberRecord[];
  matchups: MatchupRecord[];
}

const leaguesStore = new JsonStore<LeagueWorld>("fantasy-leagues", () => ({
  leagues: [], members: [], matchups: [],
}));
registerStore(leaguesStore);

export const jsonLeaguesRepo = {
  async createLeague(league: LeagueRecord): Promise<LeagueRecord> {
    const data = leaguesStore.read();
    data.leagues.push(league);
    leaguesStore.save();
    return league;
  },
  async getLeague(id: string): Promise<LeagueRecord | undefined> {
    return leaguesStore.read().leagues.find((l) => l.id === id);
  },
  async getLeagueByInvite(code: string): Promise<LeagueRecord | undefined> {
    return leaguesStore.read().leagues.find((l) => l.inviteCode === code);
  },
  async listLeaguesForUser(userId: string): Promise<LeagueRecord[]> {
    const data = leaguesStore.read();
    const leagueIds = new Set(
      data.members.filter((m) => m.userId === userId).map((m) => m.leagueId),
    );
    return data.leagues.filter((l) => leagueIds.has(l.id));
  },
  async updateLeague(id: string, patch: Partial<LeagueRecord>): Promise<LeagueRecord | undefined> {
    const data = leaguesStore.read();
    const idx = data.leagues.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    data.leagues[idx] = { ...data.leagues[idx], ...patch };
    leaguesStore.save();
    return data.leagues[idx];
  },
  async addMember(member: LeagueMemberRecord): Promise<LeagueMemberRecord> {
    const data = leaguesStore.read();
    data.members.push(member);
    leaguesStore.save();
    return member;
  },
  async getMember(leagueId: string, userId: string): Promise<LeagueMemberRecord | undefined> {
    return leaguesStore.read().members.find(
      (m) => m.leagueId === leagueId && m.userId === userId,
    );
  },
  async listMembers(leagueId: string): Promise<LeagueMemberRecord[]> {
    return leaguesStore.read().members.filter((m) => m.leagueId === leagueId);
  },
  async updateMember(leagueId: string, userId: string, patch: Partial<LeagueMemberRecord>):
    Promise<LeagueMemberRecord | undefined> {
    const data = leaguesStore.read();
    const idx = data.members.findIndex(
      (m) => m.leagueId === leagueId && m.userId === userId,
    );
    if (idx === -1) return undefined;
    data.members[idx] = { ...data.members[idx], ...patch };
    leaguesStore.save();
    return data.members[idx];
  },
  async addMatchup(matchup: MatchupRecord): Promise<MatchupRecord> {
    const data = leaguesStore.read();
    data.matchups.push(matchup);
    leaguesStore.save();
    return matchup;
  },
  async listMatchups(leagueId: string, week?: number): Promise<MatchupRecord[]> {
    const data = leaguesStore.read();
    return data.matchups.filter(
      (m) => m.leagueId === leagueId && (week === undefined || m.week === week),
    );
  },
  async updateMatchup(id: string, patch: Partial<MatchupRecord>): Promise<MatchupRecord | undefined> {
    const data = leaguesStore.read();
    const idx = data.matchups.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    data.matchups[idx] = { ...data.matchups[idx], ...patch };
    leaguesStore.save();
    return data.matchups[idx];
  },
};

// --- Push subscriptions ---------------------------------------------------

const pushStore = new JsonStore<{ subs: PushSubscriptionRecord[] }>("push-subs", () => ({
  subs: [],
}));
registerStore(pushStore);

export const jsonPushRepo = {
  async add(sub: PushSubscriptionRecord): Promise<PushSubscriptionRecord> {
    const data = pushStore.read();
    const filtered = data.subs.filter((s) => s.endpoint !== sub.endpoint);
    filtered.push(sub);
    data.subs = filtered;
    pushStore.save();
    return sub;
  },
  async removeByEndpoint(endpoint: string): Promise<void> {
    const data = pushStore.read();
    data.subs = data.subs.filter((s) => s.endpoint !== endpoint);
    pushStore.save();
  },
  async listByUser(userId: string): Promise<PushSubscriptionRecord[]> {
    return pushStore.read().subs.filter((s) => s.userId === userId);
  },
  async listAll(): Promise<PushSubscriptionRecord[]> {
    return pushStore.read().subs;
  },
};

// --- Sent-notification dedup ----------------------------------------------

const sentStore = new JsonStore<{ sent: Record<string, string[]> }>("sent-notifications", () => ({
  sent: {},
}));
registerStore(sentStore);

export const jsonSentNotificationsRepo = {
  async hasSeen(userId: string, articleId: string): Promise<boolean> {
    return !!sentStore.read().sent[userId]?.includes(articleId);
  },
  async markSent(userId: string, articleId: string): Promise<void> {
    const data = sentStore.read();
    const list = data.sent[userId] ?? [];
    if (!list.includes(articleId)) {
      list.push(articleId);
      if (list.length > 500) list.splice(0, list.length - 500);
      data.sent[userId] = list;
      sentStore.save();
    }
  },
};

// ==========================================================================
// Backend selector — import these everywhere; they resolve to either the
// JSON impls above or the Supabase impls in ./supabaseRepos.ts.
// ==========================================================================

import {
  supabaseConfigured,
  supabaseAccountRepo, supabaseBetsRepo, supabasePreferencesRepo,
  supabaseRosterRepo, supabaseOpponentsRepo, supabaseLeaguesRepo,
  supabasePushRepo, supabaseSentNotificationsRepo,
} from "./supabaseRepos";

export const usingSupabase = supabaseConfigured;

export const accountRepo           = usingSupabase ? supabaseAccountRepo           : jsonAccountRepo;
export const betsRepo              = usingSupabase ? supabaseBetsRepo              : jsonBetsRepo;
export const preferencesRepo       = usingSupabase ? supabasePreferencesRepo       : jsonPreferencesRepo;
export const rosterRepo            = usingSupabase ? supabaseRosterRepo            : jsonRosterRepo;
export const opponentsRepo         = usingSupabase ? supabaseOpponentsRepo         : jsonOpponentsRepo;
export const leaguesRepo           = usingSupabase ? supabaseLeaguesRepo           : jsonLeaguesRepo;
export const pushRepo              = usingSupabase ? supabasePushRepo              : jsonPushRepo;
export const sentNotificationsRepo = usingSupabase ? supabaseSentNotificationsRepo : jsonSentNotificationsRepo;

if (typeof console !== "undefined") {
  console.log(
    usingSupabase
      ? "[repos] using Supabase Postgres"
      : "[repos] using JSON-file persistence (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY unset)",
  );
}
