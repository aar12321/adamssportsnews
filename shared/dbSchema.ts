import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// -----------------------------------------------------------------------------
// Drizzle schema — the shape of the database when a real Postgres (Neon or
// otherwise) is provisioned. Run `npm run db:push` to apply.
//
// When DATABASE_URL is not set, services fall back to JSON-file persistence
// (see server/db/persistence.ts) that mirrors this shape.
// -----------------------------------------------------------------------------

// Betting ------------------------------------------------------------------

export const bettingAccounts = pgTable("betting_accounts", {
  userId: text("user_id").primaryKey(),
  balance: real("balance").notNull().default(10000),
  startingBalance: real("starting_balance").notNull().default(10000),
  totalBets: integer("total_bets").notNull().default(0),
  wonBets: integer("won_bets").notNull().default(0),
  lostBets: integer("lost_bets").notNull().default(0),
  pushBets: integer("push_bets").notNull().default(0),
  totalWagered: real("total_wagered").notNull().default(0),
  totalProfit: real("total_profit").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  roi: real("roi").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bets = pgTable(
  "bets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    gameId: text("game_id").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    sport: text("sport").notNull(),
    betType: text("bet_type").notNull(),
    selectedTeam: text("selected_team"),
    amount: real("amount").notNull(),
    odds: real("odds").notNull(),
    spread: real("spread"),
    overUnder: real("over_under"),
    isOver: boolean("is_over"),
    status: text("status").notNull().default("pending"),
    potentialPayout: real("potential_payout").notNull(),
    winProbability: real("win_probability").notNull().default(0),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    gameStartTime: timestamp("game_start_time", { withTimezone: true }),
    gameEndTime: timestamp("game_end_time", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    result: text("result"),
  },
  (t) => ({
    userStatusIdx: index("bets_user_status_idx").on(t.userId, t.status),
    gameIdx: index("bets_game_idx").on(t.gameId),
  }),
);

// User preferences --------------------------------------------------------

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Fantasy rosters ---------------------------------------------------------

export const fantasyRosters = pgTable(
  "fantasy_rosters",
  {
    userId: text("user_id").notNull(),
    sport: text("sport").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.sport] }),
  }),
);

export const fantasyRosterPlayers = pgTable(
  "fantasy_roster_players",
  {
    userId: text("user_id").notNull(),
    sport: text("sport").notNull(),
    playerId: text("player_id").notNull(),
    position: text("position"),
    playerData: jsonb("player_data").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.sport, t.playerId] }),
    userSportIdx: index("roster_players_user_sport_idx").on(t.userId, t.sport),
  }),
);

// Fantasy leagues ---------------------------------------------------------

export const fantasyLeagues = pgTable("fantasy_leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  ownerId: text("owner_id").notNull(),
  maxMembers: integer("max_members").notNull().default(8),
  scoringFormat: text("scoring_format").notNull().default("standard"),
  currentWeek: integer("current_week").notNull().default(1),
  startWeek: integer("start_week").notNull().default(1),
  inviteCode: text("invite_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  inviteIdx: uniqueIndex("leagues_invite_code_idx").on(t.inviteCode),
  ownerIdx: index("leagues_owner_idx").on(t.ownerId),
}));

export const fantasyLeagueMembers = pgTable(
  "fantasy_league_members",
  {
    leagueId: text("league_id").notNull(),
    userId: text("user_id").notNull(),
    teamName: text("team_name").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    ties: integer("ties").notNull().default(0),
    pointsFor: real("points_for").notNull().default(0),
    pointsAgainst: real("points_against").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.leagueId, t.userId] }),
    userIdx: index("league_members_user_idx").on(t.userId),
  }),
);

export const fantasyMatchups = pgTable(
  "fantasy_matchups",
  {
    id: text("id").primaryKey(),
    leagueId: text("league_id").notNull(),
    week: integer("week").notNull(),
    homeUserId: text("home_user_id").notNull(),
    awayUserId: text("away_user_id").notNull(),
    homeScore: real("home_score").notNull().default(0),
    awayScore: real("away_score").notNull().default(0),
    status: text("status").notNull().default("scheduled"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => ({
    leagueWeekIdx: index("matchups_league_week_idx").on(t.leagueId, t.week),
  }),
);

// Push subscriptions ------------------------------------------------------

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.endpoint] }),
    endpointIdx: uniqueIndex("push_subs_endpoint_idx").on(t.endpoint),
  }),
);

// News digest log (for dedup) --------------------------------------------

export const sentNotifications = pgTable(
  "sent_notifications",
  {
    userId: text("user_id").notNull(),
    articleId: text("article_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.articleId] }),
    timeIdx: index("sent_notifications_time_idx").on(t.sentAt),
  }),
);
