# Future work — ordered queue

When the user says **"Go"**, pick the next uncompleted item.
Every item has: a one-line description, why it's worth doing, the estimated
scope, and the one or two files most likely to change.

## Tier 1 — Launch readiness (do these before a real rollout)

- [ ] **Rotate + verify `ANTHROPIC_API_KEY` in the deploy env.** The key the
      user pasted into chat earlier is compromised and must be revoked at
      https://console.anthropic.com/settings/keys. Nothing in the code
      references it; all reads go through `process.env.ANTHROPIC_API_KEY`.
      *No code changes — operator task.*
- [ ] **Postgres migration for betting + preferences** (1-2 days). Replace
      the JSON snapshot layer in `server/persistence.ts` with Drizzle
      queries against the existing `drizzle.config.ts`. Keep the sync
      service signatures; only `saveBetting()` / `savePreferences()` bodies
      change. Fantasy rosters should move off client localStorage at the
      same time. Unlocks multi-replica deploys.
      *Files: `server/bettingService.ts`, `server/userPreferencesService.ts`,
      new `server/db.ts`, new migrations.*
- [ ] **Playwright E2E smoke tests**: sign-up → onboarding → dashboard →
      place a bet → sign out. Runs in CI. Catches the kind of flow
      regression Vitest can't see.
      *Files: new `e2e/` directory, `playwright.config.ts`.*
- [ ] **Request-level rate limiting** on mutation endpoints (bets, prefs,
      roster validate, AI commentary). `express-rate-limit` keyed on
      authenticated user ID, tighter limit on AI endpoints.
      *Files: `server/index.ts`, `server/routes.ts`.*

## Tier 2 — Daily-use power features (high product value)

- [ ] **AI trade analyzer in Fantasy**. Wire `/api/fantasy/trade/analyze`
      to also return a Claude-generated "verdict paragraph" (Haiku 4.5,
      same prompt-caching pattern as the betting explainer). Button
      under the existing trade-analysis card. ~30 min.
      *Files: `server/claudeService.ts`, `server/routes.ts`,
      `client/src/pages/apps/FantasyApp.tsx`.*
- [ ] **AI daily briefing** on the Dashboard. Takes user's favourite
      teams, top 5 news headlines for them, and the next-game data from
      `NextGameCard`, and returns a 3-sentence morning briefing. Cache
      per-user for 4 hours so we only pay tokens once per user per
      morning. Opus 4.7 for this one — the personalization quality
      matters.
      *Files: `server/claudeService.ts`, new
      `/api/dashboard/briefing/:userId`, new
      `client/src/components/dashboard/DailyBriefingCard.tsx`.*
- [ ] **Parlay builder**. Multi-leg bets with combined-odds math and
      settle-all-legs-or-none logic. Needs `MockBet.parlayLegs` on the
      schema and settlement changes in `bettingService`.
      *Files: `shared/schema.ts`, `server/bettingService.ts`,
      `client/src/pages/apps/BettingApp.tsx`.*
- [ ] **Analyst "compare the year"**. Year-over-year stats for a team
      (requires a new upstream or stored history). Gated on data
      source.
- [ ] **Push notifications** for favourite-team game start + injury
      alerts. Service worker + VAPID keys, opt-in in Profile. Medium
      scope.

## Tier 3 — Polish / UX finishing touches

- [ ] **Dashboard empty states** for first-time users with no
      favourites — guided nudge cards instead of blank briefing tiles.
- [ ] **Mobile nav gesture** — swipe between Scores / News / Apps tabs
      instead of tapping.
- [ ] **Dark/light mode parity** — audit every card for contrast ratio;
      some yellow/green accents fail WCAG AA in light mode.
- [ ] **Skeleton loaders** for lists that currently flash empty (News
      category chips, Fantasy waiver).
- [ ] **Analytics**: page-view + feature-use tracking behind an env
      flag. PostHog or plain client → server endpoint → DB.

## Tier 4 — Integrations (need third-party credentials)

- [ ] **ESPN / Yahoo / Sleeper OAuth** for real fantasy league sync.
      Blocked on provider credentials + consent UX.
- [ ] **Real sportsbook API** via the existing `oddsApiService` (just
      needs a paid `ODDS_API_KEY`).
- [ ] **Stripe** if you ever go premium. Not a priority.

## Tier 5 — Technical debt / code health

- [ ] Delete the unused `client/src/lib/aurzo-auth.ts` + the unused
      `client/src/contexts/ThemeProvider.tsx` (App uses
      `ThemeContext.tsx`).
- [ ] Consolidate the 3 identical "skeleton card" shapes across
      `FantasyApp`, `AnalystApp`, `BettingApp` into one component.
- [ ] `shared/schema.ts` has grown past the size where a single file is
      easy to scan — consider splitting into `betting.ts`,
      `fantasy.ts`, `analyst.ts`, `preferences.ts` under `shared/`.
- [ ] Add a `MockBet.currentStreak` regression test that simulates 10
      settled bets and asserts monotonic streak math.

## Tier 6 — Nice-to-have but non-load-bearing

- [ ] **"Explain this stat"** tooltips in Analyst, powered by Haiku.
- [ ] **Voice notes / dictation** for quick bet-amount entry on
      mobile.
- [ ] **Week-ahead view** in Fantasy showing start/sit swaps needed for
      next week's projections.
- [ ] **Trade draft mode** — simulate a 3-way trade in Fantasy.
- [ ] **Confidence ratings** on Analyst matchup predictions backed by
      historical model accuracy (needs stored prediction history).

## Rules for the "Go" loop

- **One tier at a time**: don't skip T1 items to chase T2 features.
- **Small commits, one file per commit** per CLAUDE.md.
- **Never hardcode secrets** — all keys come from `process.env`.
- **Run the checks**: `npx tsc --noEmit`, `npm test`, `npm run build`
  after each item; must all stay green before committing.
- **Update this file** when an item ships or when new work surfaces.
  Old items move to the top of a `## Done` log below.

## Done log (most recent first)

- `feat(claude)`: Ask-the-AI commentary in Betting, Haiku 4.5, cache-
  aware, gated on `/api/ai/status`
- `feat(ux)`: Enter advances onboarding + picks first Analyst compare
  match
- `test`: Vitest scaffold + 41 tests across fantasy / betting /
  persistence
- `feat(persistence)`: JSON snapshot layer for betting + preferences,
  survives restarts
- `feat(fantasy)`: projection-optimal lineup (start/sit recommender)
- `feat(dashboard)`: pending-bets tile, injury alerts, next-game card
- `feat(resilience)`: top-level ErrorBoundary
- `feat(betting)`: favourite-team games float to top, current W/L
  streak chip
- `feat(analyst)`: recent compares row, lazy-loaded recharts chunk
- `feat(auth)`: Supabase JWT verification on per-user routes, client
  attaches bearer token, 401 signs out, cache clear on sign-out
- `feat(news)`: dashboard sport chip filter, user's favourite sports
  respected
- `feat(profile)`: Reset + Sign Out confirm, Add Team works,
  roster-per-sport summary, editable team chips
- `feat(onboarding)`: Skip preserves entered name + sports + teams;
  dropping a sport prunes its teams
- `fix(betting)`: winProbability server-validated so every bet can't
  silently lose
- 20-ish more surgical bug fixes earlier in the branch — see
  `git log --oneline claude/test-and-fix-bugs-rofgh`
