import { randomUUID } from "crypto";
import {
  leaguesRepo,
  rosterRepo,
  type LeagueRecord,
  type LeagueMemberRecord,
  type MatchupRecord,
} from "./db/repos";
import type { SportId } from "@shared/schema";

// -----------------------------------------------------------------------------
// Fantasy leagues: create, invite, join, schedule, score, standings.
//
// Scoring is deliberately simple and deterministic so the UI can trust it:
// each week a member's "team score" is the sum of the `weeklyPoints` on
// the players currently in their roster for the league's sport. When a
// matchup is settled, wins/losses/points are pushed into the member row.
//
// Scheduling uses round-robin. With an odd number of members a bye is
// assigned. The regular season runs startWeek..startWeek+numWeeks-1.
// -----------------------------------------------------------------------------

const DEFAULT_SEASON_WEEKS = 14;
const DEFAULT_MAX_MEMBERS = 8;

function makeInviteCode(): string {
  // Six-char alnum, easy to share verbally. Collision checked before save.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function uniqueInviteCode(): string {
  for (let i = 0; i < 10; i++) {
    const code = makeInviteCode();
    if (!leaguesRepo.getLeagueByInvite(code)) return code;
  }
  // Fall back to a uuid snippet
  return randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

export interface LeagueSummary extends LeagueRecord {
  members: LeagueMemberRecord[];
  memberCount: number;
}

export class LeaguesService {
  createLeague(params: {
    ownerId: string;
    name: string;
    sport: SportId;
    maxMembers?: number;
    teamName?: string;
  }): LeagueSummary {
    const now = new Date().toISOString();
    const league: LeagueRecord = {
      id: randomUUID(),
      name: params.name.trim().slice(0, 64),
      sport: params.sport,
      ownerId: params.ownerId,
      maxMembers: Math.max(2, Math.min(16, params.maxMembers ?? DEFAULT_MAX_MEMBERS)),
      scoringFormat: "standard",
      currentWeek: 1,
      startWeek: 1,
      inviteCode: uniqueInviteCode(),
      createdAt: now,
    };
    leaguesRepo.createLeague(league);
    leaguesRepo.addMember({
      leagueId: league.id,
      userId: params.ownerId,
      teamName: (params.teamName || "My Team").trim().slice(0, 48),
      joinedAt: now,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
    return this.getLeague(league.id)!;
  }

  getLeague(leagueId: string): LeagueSummary | undefined {
    const league = leaguesRepo.getLeague(leagueId);
    if (!league) return undefined;
    const members = leaguesRepo.listMembers(leagueId);
    return { ...league, members, memberCount: members.length };
  }

  listUserLeagues(userId: string): LeagueSummary[] {
    return leaguesRepo.listLeaguesForUser(userId).map((l) => {
      const members = leaguesRepo.listMembers(l.id);
      return { ...l, members, memberCount: members.length };
    });
  }

  joinByCode(params: { userId: string; inviteCode: string; teamName?: string }):
    | { ok: true; league: LeagueSummary }
    | { ok: false; error: string } {
    const code = params.inviteCode.trim().toUpperCase();
    const league = leaguesRepo.getLeagueByInvite(code);
    if (!league) return { ok: false, error: "Invite code not found" };
    const existing = leaguesRepo.getMember(league.id, params.userId);
    if (existing) return { ok: true, league: this.getLeague(league.id)! };
    const members = leaguesRepo.listMembers(league.id);
    if (members.length >= league.maxMembers) {
      return { ok: false, error: "League is full" };
    }
    leaguesRepo.addMember({
      leagueId: league.id,
      userId: params.userId,
      teamName: (params.teamName || "New Team").trim().slice(0, 48),
      joinedAt: new Date().toISOString(),
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    });
    return { ok: true, league: this.getLeague(league.id)! };
  }

  /**
   * Generate a round-robin schedule. Returns the number of matchups created.
   * Idempotent: if schedule already exists, returns existing count.
   */
  generateSchedule(leagueId: string, weeks = DEFAULT_SEASON_WEEKS): number {
    const league = leaguesRepo.getLeague(leagueId);
    if (!league) return 0;
    const existing = leaguesRepo.listMatchups(leagueId);
    if (existing.length > 0) return existing.length;
    const members = leaguesRepo.listMembers(leagueId);
    if (members.length < 2) return 0;

    const ids = members.map((m) => m.userId).slice();
    if (ids.length % 2 === 1) ids.push("__bye__");
    const n = ids.length;
    const half = n / 2;
    const rotating = ids.slice(1);

    let created = 0;
    for (let w = 0; w < weeks; w++) {
      const roundIds = [ids[0], ...rotating];
      for (let i = 0; i < half; i++) {
        const home = roundIds[i];
        const away = roundIds[n - 1 - i];
        if (home === "__bye__" || away === "__bye__") continue;
        leaguesRepo.addMatchup({
          id: randomUUID(),
          leagueId,
          week: league.startWeek + w,
          homeUserId: home,
          awayUserId: away,
          homeScore: 0,
          awayScore: 0,
          status: "scheduled",
        });
        created++;
      }
      // rotate
      rotating.unshift(rotating.pop() as string);
    }
    return created;
  }

  getStandings(leagueId: string): LeagueMemberRecord[] {
    const members = leaguesRepo.listMembers(leagueId);
    return members.slice().sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      return a.teamName.localeCompare(b.teamName);
    });
  }

  getWeekMatchups(leagueId: string, week?: number): MatchupRecord[] {
    const league = leaguesRepo.getLeague(leagueId);
    if (!league) return [];
    return leaguesRepo.listMatchups(leagueId, week ?? league.currentWeek);
  }

  /**
   * Sum a member's roster weeklyPoints for the league's sport.
   * Bench players are ignored; the greedy-fit algorithm decides starters
   * implicitly by ordering — for this minimal scoring we just sum whatever
   * the user has on their roster. A future enhancement could apply the
   * starters/bench split exactly.
   */
  scoreMember(leagueId: string, userId: string): number {
    const league = leaguesRepo.getLeague(leagueId);
    if (!league) return 0;
    const roster = rosterRepo.getBySport(userId, league.sport);
    return roster.reduce((sum, p) => sum + (Number(p.weeklyPoints) || 0), 0);
  }

  /**
   * Settle all scheduled matchups for the given week: snapshot each team's
   * score, pick a winner, update standings. Idempotent per matchup.
   */
  settleWeek(leagueId: string, week: number): { settled: number } {
    const league = leaguesRepo.getLeague(leagueId);
    if (!league) return { settled: 0 };
    const weekMatchups = leaguesRepo.listMatchups(leagueId, week);
    let settled = 0;
    for (const m of weekMatchups) {
      if (m.status === "final") continue;
      // Defensive: a matchup must have two distinct users. Nothing should
      // produce a self-matchup (generateSchedule filters byes), but if
      // data gets corrupted we skip rather than inflate standings.
      if (m.homeUserId === m.awayUserId) continue;
      const homeScore = Math.round(this.scoreMember(leagueId, m.homeUserId) * 100) / 100;
      const awayScore = Math.round(this.scoreMember(leagueId, m.awayUserId) * 100) / 100;
      leaguesRepo.updateMatchup(m.id, {
        status: "final",
        homeScore,
        awayScore,
        settledAt: new Date().toISOString(),
      });
      // Update standings
      const home = leaguesRepo.getMember(leagueId, m.homeUserId);
      const away = leaguesRepo.getMember(leagueId, m.awayUserId);
      if (home && away) {
        const homePatch: Partial<LeagueMemberRecord> = {
          pointsFor: home.pointsFor + homeScore,
          pointsAgainst: home.pointsAgainst + awayScore,
        };
        const awayPatch: Partial<LeagueMemberRecord> = {
          pointsFor: away.pointsFor + awayScore,
          pointsAgainst: away.pointsAgainst + homeScore,
        };
        if (homeScore > awayScore) {
          homePatch.wins = home.wins + 1;
          awayPatch.losses = away.losses + 1;
        } else if (awayScore > homeScore) {
          awayPatch.wins = away.wins + 1;
          homePatch.losses = home.losses + 1;
        } else {
          homePatch.ties = home.ties + 1;
          awayPatch.ties = away.ties + 1;
        }
        leaguesRepo.updateMember(leagueId, m.homeUserId, homePatch);
        leaguesRepo.updateMember(leagueId, m.awayUserId, awayPatch);
      }
      settled++;
    }
    if (settled > 0) {
      leaguesRepo.updateLeague(leagueId, { currentWeek: week + 1 });
    }
    return { settled };
  }
}

export const leaguesService = new LeaguesService();
