-- =============================================================================
-- Adams Sports News — Supabase schema
--
-- All tables are prefixed with `sports_` because this Supabase project is
-- shared with other apps (finance, education, etc.). The prefix keeps our
-- tables, indexes, and policies namespaced so a `public.user_preferences`
-- collision can't happen.
--
-- Re-runnable: every CREATE uses IF NOT EXISTS, policies are dropped and
-- re-created with DROP POLICY IF EXISTS.
--
-- Tables mirror the Drizzle definitions in shared/dbSchema.ts — keep the
-- two in lockstep.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Betting: mock accounts + bet rows
-- -----------------------------------------------------------------------------
create table if not exists public.sports_betting_accounts (
  user_id           text primary key,
  balance           double precision not null default 10000,
  starting_balance  double precision not null default 10000,
  total_bets        integer not null default 0,
  won_bets          integer not null default 0,
  lost_bets         integer not null default 0,
  push_bets         integer not null default 0,
  total_wagered     double precision not null default 0,
  total_profit      double precision not null default 0,
  win_rate          double precision not null default 0,
  roi               double precision not null default 0,
  updated_at        timestamptz not null default now()
);

create table if not exists public.sports_bets (
  id                text primary key,
  user_id           text not null,
  game_id           text not null,
  home_team         text not null,
  away_team         text not null,
  sport             text not null,
  bet_type          text not null,
  selected_team     text,
  amount            double precision not null,
  odds              double precision not null,
  spread            double precision,
  over_under        double precision,
  is_over           boolean,
  status            text not null default 'pending',
  potential_payout  double precision not null,
  win_probability   double precision not null default 0,
  placed_at         timestamptz not null default now(),
  game_start_time   timestamptz,
  game_end_time     timestamptz,
  settled_at        timestamptz,
  result            text
);
create index if not exists sports_bets_user_status_idx on public.sports_bets (user_id, status);
create index if not exists sports_bets_game_idx on public.sports_bets (game_id);

-- -----------------------------------------------------------------------------
-- User preferences (one jsonb row per user)
-- -----------------------------------------------------------------------------
create table if not exists public.sports_user_preferences (
  user_id     text primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Fantasy rosters — (user, sport) → jsonb array of player blobs
-- -----------------------------------------------------------------------------
create table if not exists public.sports_fantasy_rosters (
  user_id     text not null,
  sport       text not null,
  players     jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, sport)
);

-- -----------------------------------------------------------------------------
-- Opponent mock lineups (Simulate tab)
-- -----------------------------------------------------------------------------
create table if not exists public.sports_fantasy_opponents (
  id          text primary key,
  user_id     text not null,
  sport       text not null,
  name        text not null,
  players     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sports_opponents_user_sport_idx on public.sports_fantasy_opponents (user_id, sport);

-- -----------------------------------------------------------------------------
-- Fantasy leagues + members + matchups
-- -----------------------------------------------------------------------------
create table if not exists public.sports_fantasy_leagues (
  id              text primary key,
  name            text not null,
  sport           text not null,
  owner_id        text not null,
  max_members     integer not null default 8,
  scoring_format  text not null default 'standard',
  current_week    integer not null default 1,
  start_week      integer not null default 1,
  invite_code     text not null unique,
  created_at      timestamptz not null default now()
);
create index if not exists sports_leagues_owner_idx on public.sports_fantasy_leagues (owner_id);

create table if not exists public.sports_fantasy_league_members (
  league_id       text not null references public.sports_fantasy_leagues(id) on delete cascade,
  user_id         text not null,
  team_name       text not null,
  joined_at       timestamptz not null default now(),
  wins            integer not null default 0,
  losses          integer not null default 0,
  ties            integer not null default 0,
  points_for      double precision not null default 0,
  points_against  double precision not null default 0,
  primary key (league_id, user_id)
);
create index if not exists sports_league_members_user_idx on public.sports_fantasy_league_members (user_id);

create table if not exists public.sports_fantasy_matchups (
  id            text primary key,
  league_id     text not null references public.sports_fantasy_leagues(id) on delete cascade,
  week          integer not null,
  home_user_id  text not null,
  away_user_id  text not null,
  home_score    double precision not null default 0,
  away_score    double precision not null default 0,
  status        text not null default 'scheduled',
  settled_at    timestamptz
);
create index if not exists sports_matchups_league_week_idx on public.sports_fantasy_matchups (league_id, week);

-- -----------------------------------------------------------------------------
-- Web Push subscriptions + per-user sent log
-- -----------------------------------------------------------------------------
create table if not exists public.sports_push_subscriptions (
  user_id     text not null,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, endpoint)
);
create unique index if not exists sports_push_subs_endpoint_idx on public.sports_push_subscriptions (endpoint);

create table if not exists public.sports_sent_notifications (
  user_id     text not null,
  article_id  text not null,
  sent_at     timestamptz not null default now(),
  primary key (user_id, article_id)
);
create index if not exists sports_sent_notifications_time_idx on public.sports_sent_notifications (sent_at);

-- =============================================================================
-- Realtime
--
-- These tables broadcast INSERT/UPDATE/DELETE to any Supabase client that
-- subscribes via supabase.channel().on('postgres_changes', ...). The client
-- hook useRealtimeTable.ts wraps this.
-- =============================================================================

-- Safe to re-run: Postgres ignores duplicate entries in the publication.
do $$ begin
  alter publication supabase_realtime add table public.sports_fantasy_matchups;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.sports_fantasy_league_members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.sports_fantasy_rosters;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.sports_bets;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Row-Level Security
--
-- Supabase's auth.uid() returns uuid. Our user_id columns are text. Explicit
-- cast with cast(...) avoids "operator does not exist: text = uuid" that some
-- pg optimizer paths produce when auth.uid() is used raw.
-- =============================================================================

alter table public.sports_betting_accounts       enable row level security;
alter table public.sports_bets                   enable row level security;
alter table public.sports_user_preferences       enable row level security;
alter table public.sports_fantasy_rosters        enable row level security;
alter table public.sports_fantasy_opponents      enable row level security;
alter table public.sports_fantasy_leagues        enable row level security;
alter table public.sports_fantasy_league_members enable row level security;
alter table public.sports_fantasy_matchups       enable row level security;
alter table public.sports_push_subscriptions     enable row level security;
alter table public.sports_sent_notifications     enable row level security;

-- Betting
drop policy if exists "sports_betting_accounts_owner" on public.sports_betting_accounts;
create policy "sports_betting_accounts_owner" on public.sports_betting_accounts
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));

drop policy if exists "sports_bets_owner" on public.sports_bets;
create policy "sports_bets_owner" on public.sports_bets
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));

-- Preferences
drop policy if exists "sports_user_preferences_owner" on public.sports_user_preferences;
create policy "sports_user_preferences_owner" on public.sports_user_preferences
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));

-- Rosters
drop policy if exists "sports_fantasy_rosters_owner" on public.sports_fantasy_rosters;
create policy "sports_fantasy_rosters_owner" on public.sports_fantasy_rosters
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));

-- Opponents
drop policy if exists "sports_fantasy_opponents_owner" on public.sports_fantasy_opponents;
create policy "sports_fantasy_opponents_owner" on public.sports_fantasy_opponents
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));

-- Leagues — visible to any member; writable only by the owner
drop policy if exists "sports_fantasy_leagues_read_members" on public.sports_fantasy_leagues;
create policy "sports_fantasy_leagues_read_members" on public.sports_fantasy_leagues
  for select using (
    owner_id = cast(auth.uid() as text)
    or exists (
      select 1 from public.sports_fantasy_league_members m
      where m.league_id = id and m.user_id = cast(auth.uid() as text)
    )
  );
drop policy if exists "sports_fantasy_leagues_write_owner" on public.sports_fantasy_leagues;
create policy "sports_fantasy_leagues_write_owner" on public.sports_fantasy_leagues
  for all using (owner_id = cast(auth.uid() as text))
  with check (owner_id = cast(auth.uid() as text));

-- League members
drop policy if exists "sports_fantasy_league_members_read" on public.sports_fantasy_league_members;
create policy "sports_fantasy_league_members_read" on public.sports_fantasy_league_members
  for select using (
    user_id = cast(auth.uid() as text)
    or exists (
      select 1 from public.sports_fantasy_league_members m
      where m.league_id = sports_fantasy_league_members.league_id
        and m.user_id = cast(auth.uid() as text)
    )
  );
drop policy if exists "sports_fantasy_league_members_write_self" on public.sports_fantasy_league_members;
create policy "sports_fantasy_league_members_write_self" on public.sports_fantasy_league_members
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));

-- Matchups: visible to league members; writes are server-only
drop policy if exists "sports_fantasy_matchups_read_members" on public.sports_fantasy_matchups;
create policy "sports_fantasy_matchups_read_members" on public.sports_fantasy_matchups
  for select using (
    exists (
      select 1 from public.sports_fantasy_league_members m
      where m.league_id = sports_fantasy_matchups.league_id
        and m.user_id = cast(auth.uid() as text)
    )
  );

-- Push subs
drop policy if exists "sports_push_subscriptions_owner" on public.sports_push_subscriptions;
create policy "sports_push_subscriptions_owner" on public.sports_push_subscriptions
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));

-- Sent notifications
drop policy if exists "sports_sent_notifications_owner" on public.sports_sent_notifications;
create policy "sports_sent_notifications_owner" on public.sports_sent_notifications
  for all using (user_id = cast(auth.uid() as text))
  with check (user_id = cast(auth.uid() as text));
