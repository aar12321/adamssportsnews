import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  MockAccount,
  MockBet,
  UserPreferences,
  FantasyPlayer,
} from "@shared/schema";
import type {
  LeagueRecord,
  LeagueMemberRecord,
  MatchupRecord,
  OpponentRecord,
  PushSubscriptionRecord,
} from "./repos";

// -----------------------------------------------------------------------------
// Supabase-backed repositories — drop-in replacements for the JSON-file repos
// in `./repos`. The shape of every export here matches `./repos` 1:1.
//
// When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set in the environment,
// `./repos-index.ts` selects these at runtime. The server uses the service-
// role key which bypasses RLS — RLS on these tables is our defense-in-depth
// policy layer for anything that ever queries from a client.
// -----------------------------------------------------------------------------

function env(name: string): string | undefined {
  // @ts-ignore - Node runtime
  return (process.env || {})[name];
}

const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_ROLE = env("SUPABASE_SERVICE_ROLE_KEY");

export const supabaseConfigured = !!(SUPABASE_URL && SERVICE_ROLE);

let client: SupabaseClient | null = null;
if (supabaseConfigured) {
  client = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });
}

function db(): SupabaseClient {
  if (!client) throw new Error("Supabase repos invoked but not configured");
  return client;
}

// Helpers for mapping between snake_case DB rows and camelCase app types.
// We keep the mappers here (not in the app code) so the rest of the backend
// never knows what DB naming convention we used.

function toAccount(row: any): MockAccount {
  return {
    balance: Number(row.balance),
    startingBalance: Number(row.starting_balance),
    totalBets: Number(row.total_bets),
    wonBets: Number(row.won_bets),
    lostBets: Number(row.lost_bets),
    pushBets: Number(row.push_bets),
    totalWagered: Number(row.total_wagered),
    totalProfit: Number(row.total_profit),
    winRate: Number(row.win_rate),
    roi: Number(row.roi),
  };
}
function accountRow(userId: string, a: MockAccount) {
  return {
    user_id: userId,
    balance: a.balance,
    starting_balance: a.startingBalance,
    total_bets: a.totalBets,
    won_bets: a.wonBets,
    lost_bets: a.lostBets,
    push_bets: a.pushBets,
    total_wagered: a.totalWagered,
    total_profit: a.totalProfit,
    win_rate: a.winRate,
    roi: a.roi,
    updated_at: new Date().toISOString(),
  };
}

function toBet(row: any): MockBet {
  return {
    id: row.id,
    gameId: row.game_id,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    sport: row.sport,
    betType: row.bet_type,
    selectedTeam: row.selected_team ?? undefined,
    amount: Number(row.amount),
    odds: Number(row.odds),
    spread: row.spread == null ? undefined : Number(row.spread),
    overUnder: row.over_under == null ? undefined : Number(row.over_under),
    isOver: row.is_over ?? undefined,
    status: row.status,
    potentialPayout: Number(row.potential_payout),
    winProbability: Number(row.win_probability),
    placedAt: row.placed_at,
    gameStartTime: row.game_start_time ?? undefined,
    gameEndTime: row.game_end_time ?? undefined,
    settledAt: row.settled_at ?? undefined,
    result: row.result ?? undefined,
  };
}
function betRow(userId: string, b: MockBet) {
  return {
    id: b.id,
    user_id: userId,
    game_id: b.gameId,
    home_team: b.homeTeam,
    away_team: b.awayTeam,
    sport: b.sport,
    bet_type: b.betType,
    selected_team: b.selectedTeam ?? null,
    amount: b.amount,
    odds: b.odds,
    spread: b.spread ?? null,
    over_under: b.overUnder ?? null,
    is_over: b.isOver ?? null,
    status: b.status,
    potential_payout: b.potentialPayout,
    win_probability: b.winProbability,
    placed_at: b.placedAt,
    game_start_time: b.gameStartTime ?? null,
    game_end_time: b.gameEndTime ?? null,
    settled_at: b.settledAt ?? null,
    result: b.result ?? null,
  };
}

// --- Accounts -------------------------------------------------------------

export const supabaseAccountRepo = {
  async get(userId: string): Promise<MockAccount | undefined> {
    const { data, error } = await db()
      .from("sports_betting_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toAccount(data) : undefined;
  },
  async upsert(userId: string, account: MockAccount): Promise<MockAccount> {
    const { error } = await db()
      .from("sports_betting_accounts")
      .upsert(accountRow(userId, account), { onConflict: "user_id" });
    if (error) throw error;
    return account;
  },
  async delete(userId: string): Promise<void> {
    const { error } = await db().from("sports_betting_accounts").delete().eq("user_id", userId);
    if (error) throw error;
  },
};

// --- Bets -----------------------------------------------------------------

export const supabaseBetsRepo = {
  async listByUser(userId: string): Promise<MockBet[]> {
    const { data, error } = await db()
      .from("sports_bets")
      .select("*")
      .eq("user_id", userId)
      .order("placed_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toBet);
  },
  async replaceForUser(userId: string, list: MockBet[]): Promise<void> {
    await this.removeAllForUser(userId);
    if (list.length === 0) return;
    const rows = list.map((b) => betRow(userId, b));
    const { error } = await db().from("sports_bets").insert(rows);
    if (error) throw error;
  },
  async add(userId: string, bet: MockBet): Promise<void> {
    const { error } = await db().from("sports_bets").insert(betRow(userId, bet));
    if (error) throw error;
  },
  async update(userId: string, betId: string, patch: Partial<MockBet>): Promise<MockBet | undefined> {
    // Translate camelCase patch → snake_case column names
    const colMap: Record<string, string> = {
      gameId: "game_id", homeTeam: "home_team", awayTeam: "away_team",
      betType: "bet_type", selectedTeam: "selected_team",
      overUnder: "over_under", isOver: "is_over",
      potentialPayout: "potential_payout", winProbability: "win_probability",
      placedAt: "placed_at", gameStartTime: "game_start_time",
      gameEndTime: "game_end_time", settledAt: "settled_at",
    };
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      const col = colMap[k] ?? k;
      row[col] = v ?? null;
    }
    const { data, error } = await db()
      .from("sports_bets")
      .update(row)
      .eq("id", betId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? toBet(data) : undefined;
  },
  async remove(userId: string, betId: string): Promise<boolean> {
    const { data, error } = await db()
      .from("sports_bets")
      .delete()
      .eq("id", betId)
      .eq("user_id", userId)
      .select("id");
    if (error) throw error;
    return (data ?? []).length > 0;
  },
  async removeAllForUser(userId: string): Promise<void> {
    const { error } = await db().from("sports_bets").delete().eq("user_id", userId);
    if (error) throw error;
  },
  async listAllPending(): Promise<Array<{ userId: string; bet: MockBet }>> {
    const { data, error } = await db()
      .from("sports_bets")
      .select("*")
      .eq("status", "pending");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ userId: row.user_id, bet: toBet(row) }));
  },
};

// --- Preferences ----------------------------------------------------------

export const supabasePreferencesRepo = {
  async get(userId: string): Promise<UserPreferences | undefined> {
    const { data, error } = await db()
      .from("sports_user_preferences")
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.payload ? (data.payload as UserPreferences) : undefined;
  },
  async upsert(userId: string, prefs: UserPreferences): Promise<UserPreferences> {
    const { error } = await db()
      .from("sports_user_preferences")
      .upsert({ user_id: userId, payload: prefs, updated_at: new Date().toISOString() },
        { onConflict: "user_id" });
    if (error) throw error;
    return prefs;
  },
  async delete(userId: string): Promise<void> {
    const { error } = await db().from("sports_user_preferences").delete().eq("user_id", userId);
    if (error) throw error;
  },
  async all(): Promise<UserPreferences[]> {
    const { data, error } = await db()
      .from("sports_user_preferences")
      .select("payload");
    if (error) throw error;
    return (data ?? []).map((r: any) => r.payload as UserPreferences);
  },
};

// --- Rosters --------------------------------------------------------------

export const supabaseRosterRepo = {
  async getBySport(userId: string, sport: string): Promise<FantasyPlayer[]> {
    const { data, error } = await db()
      .from("sports_fantasy_rosters")
      .select("players")
      .eq("user_id", userId)
      .eq("sport", sport)
      .maybeSingle();
    if (error) throw error;
    return (data?.players as FantasyPlayer[] | undefined) ?? [];
  },
  async getAll(userId: string): Promise<Record<string, FantasyPlayer[]>> {
    const { data, error } = await db()
      .from("sports_fantasy_rosters")
      .select("sport, players")
      .eq("user_id", userId);
    if (error) throw error;
    const out: Record<string, FantasyPlayer[]> = {};
    for (const row of data ?? []) {
      out[row.sport] = (row.players as FantasyPlayer[]) ?? [];
    }
    return out;
  },
  async setBySport(userId: string, sport: string, players: FantasyPlayer[]): Promise<void> {
    const { error } = await db()
      .from("sports_fantasy_rosters")
      .upsert(
        { user_id: userId, sport, players, updated_at: new Date().toISOString() },
        { onConflict: "user_id,sport" },
      );
    if (error) throw error;
  },
  async clearSport(userId: string, sport: string): Promise<void> {
    const { error } = await db()
      .from("sports_fantasy_rosters")
      .delete()
      .eq("user_id", userId)
      .eq("sport", sport);
    if (error) throw error;
  },
};

// --- Opponents ------------------------------------------------------------

function toOpponent(row: any): OpponentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    sport: row.sport,
    name: row.name,
    players: (row.players as FantasyPlayer[]) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseOpponentsRepo = {
  async listByUserSport(userId: string, sport: string): Promise<OpponentRecord[]> {
    const { data, error } = await db()
      .from("sports_fantasy_opponents")
      .select("*")
      .eq("user_id", userId)
      .eq("sport", sport)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toOpponent);
  },
  async get(id: string): Promise<OpponentRecord | undefined> {
    const { data, error } = await db()
      .from("sports_fantasy_opponents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toOpponent(data) : undefined;
  },
  async create(o: OpponentRecord): Promise<OpponentRecord> {
    const { error } = await db().from("sports_fantasy_opponents").insert({
      id: o.id,
      user_id: o.userId,
      sport: o.sport,
      name: o.name,
      players: o.players,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
    });
    if (error) throw error;
    return o;
  },
  async update(id: string, patch: Partial<OpponentRecord>): Promise<OpponentRecord | undefined> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.players !== undefined) row.players = patch.players;
    const { data, error } = await db()
      .from("sports_fantasy_opponents")
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? toOpponent(data) : undefined;
  },
  async delete(id: string): Promise<void> {
    const { error } = await db().from("sports_fantasy_opponents").delete().eq("id", id);
    if (error) throw error;
  },
};

// --- Leagues + members + matchups ----------------------------------------

function toLeague(row: any): LeagueRecord {
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    ownerId: row.owner_id,
    maxMembers: row.max_members,
    scoringFormat: row.scoring_format,
    currentWeek: row.current_week,
    startWeek: row.start_week,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}
function leagueRow(l: LeagueRecord) {
  return {
    id: l.id,
    name: l.name,
    sport: l.sport,
    owner_id: l.ownerId,
    max_members: l.maxMembers,
    scoring_format: l.scoringFormat,
    current_week: l.currentWeek,
    start_week: l.startWeek,
    invite_code: l.inviteCode,
    created_at: l.createdAt,
  };
}
function toMember(row: any): LeagueMemberRecord {
  return {
    leagueId: row.league_id,
    userId: row.user_id,
    teamName: row.team_name,
    joinedAt: row.joined_at,
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    pointsFor: Number(row.points_for),
    pointsAgainst: Number(row.points_against),
  };
}
function memberRow(m: LeagueMemberRecord) {
  return {
    league_id: m.leagueId,
    user_id: m.userId,
    team_name: m.teamName,
    joined_at: m.joinedAt,
    wins: m.wins,
    losses: m.losses,
    ties: m.ties,
    points_for: m.pointsFor,
    points_against: m.pointsAgainst,
  };
}
function toMatchup(row: any): MatchupRecord {
  return {
    id: row.id,
    leagueId: row.league_id,
    week: row.week,
    homeUserId: row.home_user_id,
    awayUserId: row.away_user_id,
    homeScore: Number(row.home_score),
    awayScore: Number(row.away_score),
    status: row.status,
    settledAt: row.settled_at ?? undefined,
  };
}
function matchupRow(m: MatchupRecord) {
  return {
    id: m.id,
    league_id: m.leagueId,
    week: m.week,
    home_user_id: m.homeUserId,
    away_user_id: m.awayUserId,
    home_score: m.homeScore,
    away_score: m.awayScore,
    status: m.status,
    settled_at: m.settledAt ?? null,
  };
}

export const supabaseLeaguesRepo = {
  async createLeague(l: LeagueRecord): Promise<LeagueRecord> {
    const { error } = await db().from("sports_fantasy_leagues").insert(leagueRow(l));
    if (error) throw error;
    return l;
  },
  async getLeague(id: string): Promise<LeagueRecord | undefined> {
    const { data, error } = await db()
      .from("sports_fantasy_leagues").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toLeague(data) : undefined;
  },
  async getLeagueByInvite(code: string): Promise<LeagueRecord | undefined> {
    const { data, error } = await db()
      .from("sports_fantasy_leagues").select("*").eq("invite_code", code).maybeSingle();
    if (error) throw error;
    return data ? toLeague(data) : undefined;
  },
  async listLeaguesForUser(userId: string): Promise<LeagueRecord[]> {
    // Two-step: first the ids, then fetch. Avoids a nested-query + RLS quirk
    // and keeps the plan index-friendly.
    const { data: mem, error: me } = await db()
      .from("sports_fantasy_league_members").select("league_id").eq("user_id", userId);
    if (me) throw me;
    const ids = (mem ?? []).map((r: any) => r.league_id);
    if (ids.length === 0) return [];
    const { data, error } = await db()
      .from("sports_fantasy_leagues").select("*").in("id", ids);
    if (error) throw error;
    return (data ?? []).map(toLeague);
  },
  async updateLeague(id: string, patch: Partial<LeagueRecord>): Promise<LeagueRecord | undefined> {
    const colMap: Record<string, string> = {
      ownerId: "owner_id", maxMembers: "max_members",
      scoringFormat: "scoring_format", currentWeek: "current_week",
      startWeek: "start_week", inviteCode: "invite_code", createdAt: "created_at",
    };
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) row[colMap[k] ?? k] = v as any;
    const { data, error } = await db()
      .from("sports_fantasy_leagues").update(row).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? toLeague(data) : undefined;
  },
  async addMember(m: LeagueMemberRecord): Promise<LeagueMemberRecord> {
    const { error } = await db().from("sports_fantasy_league_members").insert(memberRow(m));
    if (error) throw error;
    return m;
  },
  async getMember(leagueId: string, userId: string): Promise<LeagueMemberRecord | undefined> {
    const { data, error } = await db()
      .from("sports_fantasy_league_members")
      .select("*").eq("league_id", leagueId).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data ? toMember(data) : undefined;
  },
  async listMembers(leagueId: string): Promise<LeagueMemberRecord[]> {
    const { data, error } = await db()
      .from("sports_fantasy_league_members").select("*").eq("league_id", leagueId)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toMember);
  },
  async updateMember(leagueId: string, userId: string, patch: Partial<LeagueMemberRecord>):
    Promise<LeagueMemberRecord | undefined> {
    const colMap: Record<string, string> = {
      leagueId: "league_id", userId: "user_id", teamName: "team_name",
      joinedAt: "joined_at", pointsFor: "points_for", pointsAgainst: "points_against",
    };
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) row[colMap[k] ?? k] = v as any;
    const { data, error } = await db()
      .from("sports_fantasy_league_members").update(row)
      .eq("league_id", leagueId).eq("user_id", userId)
      .select("*").maybeSingle();
    if (error) throw error;
    return data ? toMember(data) : undefined;
  },
  async addMatchup(m: MatchupRecord): Promise<MatchupRecord> {
    const { error } = await db().from("sports_fantasy_matchups").insert(matchupRow(m));
    if (error) throw error;
    return m;
  },
  async listMatchups(leagueId: string, week?: number): Promise<MatchupRecord[]> {
    let q = db().from("sports_fantasy_matchups").select("*").eq("league_id", leagueId);
    if (week !== undefined) q = q.eq("week", week);
    const { data, error } = await q.order("week", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toMatchup);
  },
  async updateMatchup(id: string, patch: Partial<MatchupRecord>): Promise<MatchupRecord | undefined> {
    const colMap: Record<string, string> = {
      leagueId: "league_id", homeUserId: "home_user_id", awayUserId: "away_user_id",
      homeScore: "home_score", awayScore: "away_score", settledAt: "settled_at",
    };
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) row[colMap[k] ?? k] = v as any;
    const { data, error } = await db()
      .from("sports_fantasy_matchups").update(row).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? toMatchup(data) : undefined;
  },
};

// --- Push subscriptions ---------------------------------------------------

export const supabasePushRepo = {
  async add(sub: PushSubscriptionRecord): Promise<PushSubscriptionRecord> {
    const { error } = await db()
      .from("sports_push_subscriptions")
      .upsert({
        user_id: sub.userId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        created_at: sub.createdAt,
      }, { onConflict: "user_id,endpoint" });
    if (error) throw error;
    return sub;
  },
  async removeByEndpoint(endpoint: string): Promise<void> {
    const { error } = await db()
      .from("sports_push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
  },
  async listByUser(userId: string): Promise<PushSubscriptionRecord[]> {
    const { data, error } = await db()
      .from("sports_push_subscriptions").select("*").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      userId: r.user_id, endpoint: r.endpoint,
      p256dh: r.p256dh, auth: r.auth, createdAt: r.created_at,
    }));
  },
  async listAll(): Promise<PushSubscriptionRecord[]> {
    const { data, error } = await db()
      .from("sports_push_subscriptions").select("*");
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      userId: r.user_id, endpoint: r.endpoint,
      p256dh: r.p256dh, auth: r.auth, createdAt: r.created_at,
    }));
  },
};

// --- Sent notifications dedup -------------------------------------------

export const supabaseSentNotificationsRepo = {
  async hasSeen(userId: string, articleId: string): Promise<boolean> {
    const { data, error } = await db()
      .from("sports_sent_notifications")
      .select("article_id")
      .eq("user_id", userId).eq("article_id", articleId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },
  async markSent(userId: string, articleId: string): Promise<void> {
    const { error } = await db().from("sports_sent_notifications").upsert({
      user_id: userId,
      article_id: articleId,
      sent_at: new Date().toISOString(),
    }, { onConflict: "user_id,article_id" });
    if (error) throw error;
  },
};
