import type { FantasyPlayer, FantasyTeam, TradeAnalysis, WaiverTarget } from "@shared/schema";

// Mock player database with realistic data
const playerDatabase: FantasyPlayer[] = [
  // NBA Players
  { id: "p1", name: "Nikola Jokic", team: "Denver Nuggets", position: "C", sport: "basketball", weeklyPoints: 58.4, seasonPoints: 2340, projectedPoints: 56.2, averagePoints: 54.8, status: "active", stats: { ppg: 26.4, rpg: 12.1, apg: 9.0, spg: 1.4, bpg: 0.9, fg_pct: 0.582 }, recentNews: ["Jokic drops 38/12/11 triple-double in win over Lakers", "Listed as probable for next game"] },
  { id: "p2", name: "Luka Doncic", team: "Dallas Mavericks", position: "PG/SG", sport: "basketball", weeklyPoints: 54.2, seasonPoints: 2180, projectedPoints: 52.1, averagePoints: 51.4, status: "questionable", injuryNote: "Left ankle - day-to-day", stats: { ppg: 33.9, rpg: 9.2, apg: 9.8, spg: 1.4, bpg: 0.5, fg_pct: 0.480 }, recentNews: ["Ankle injury update: questionable for tonight", "Coach says Luka will be evaluated pre-game"] },
  { id: "p3", name: "Shai Gilgeous-Alexander", team: "Oklahoma City Thunder", position: "SG", sport: "basketball", weeklyPoints: 52.8, seasonPoints: 2210, projectedPoints: 51.0, averagePoints: 50.2, status: "active", stats: { ppg: 31.4, rpg: 5.5, apg: 6.2, spg: 2.0, bpg: 1.0, fg_pct: 0.535 }, recentNews: ["SGA scores 40 in OKC win", "Named Western Conference Player of the Week"] },
  { id: "p4", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks", position: "PF", sport: "basketball", weeklyPoints: 57.6, seasonPoints: 2290, projectedPoints: 55.4, averagePoints: 53.2, status: "active", stats: { ppg: 30.4, rpg: 11.5, apg: 6.5, spg: 1.2, bpg: 1.1, fg_pct: 0.612 }, recentNews: ["Giannis dominant in 52-point performance", "Cleared from knee soreness"] },
  { id: "p5", name: "Tyrese Haliburton", team: "Indiana Pacers", position: "PG", sport: "basketball", weeklyPoints: 46.2, seasonPoints: 1840, projectedPoints: 44.8, averagePoints: 43.1, status: "doubtful", injuryNote: "Hamstring strain", stats: { ppg: 20.8, rpg: 4.0, apg: 11.6, spg: 1.3, bpg: 0.4, fg_pct: 0.476 }, recentNews: ["Haliburton out 2-3 weeks with hamstring", "Pacers looking at backup options"] },
  { id: "p6", name: "Anthony Davis", team: "Los Angeles Lakers", position: "C/PF", sport: "basketball", weeklyPoints: 50.1, seasonPoints: 1820, projectedPoints: 48.6, averagePoints: 47.2, status: "active", stats: { ppg: 24.7, rpg: 12.6, apg: 3.5, spg: 1.2, bpg: 2.3, fg_pct: 0.554 }, recentNews: ["AD returns to form with 35-point night", "Lakers coach praises his conditioning"] },
  { id: "p7", name: "Victor Wembanyama", team: "San Antonio Spurs", position: "C", sport: "basketball", weeklyPoints: 48.8, seasonPoints: 1740, projectedPoints: 47.5, averagePoints: 45.8, status: "active", stats: { ppg: 21.4, rpg: 10.6, apg: 3.9, spg: 1.5, bpg: 3.6, fg_pct: 0.462 }, recentNews: ["Wembanyama records 6-block game", "Named Rookie of the Year frontrunner"] },
  { id: "p8", name: "Jayson Tatum", team: "Boston Celtics", position: "SF", sport: "basketball", weeklyPoints: 49.4, seasonPoints: 1980, projectedPoints: 48.2, averagePoints: 46.4, status: "active", stats: { ppg: 26.9, rpg: 8.1, apg: 4.9, spg: 1.1, bpg: 0.6, fg_pct: 0.471 }, recentNews: ["Tatum erupts for 42 in Celtics blowout", "Named All-Star starter"] },
  // NFL Players
  { id: "p9", name: "Patrick Mahomes", team: "Kansas City Chiefs", position: "QB", sport: "football", weeklyPoints: 32.4, seasonPoints: 580, projectedPoints: 28.6, averagePoints: 27.8, status: "active", stats: { passing_yards: 4893, tds: 41, ints: 11, completion_pct: 67.2, rushing_yards: 427 }, recentNews: ["Mahomes leads Chiefs to AFC championship", "Cleared health protocol"] },
  { id: "p10", name: "Christian McCaffrey", team: "San Francisco 49ers", position: "RB", sport: "football", weeklyPoints: 28.8, seasonPoints: 420, projectedPoints: 26.4, averagePoints: 25.2, status: "questionable", injuryNote: "Knee - limited practice", stats: { rushing_yards: 1459, rush_tds: 14, receptions: 67, rec_yards: 564, rec_tds: 7 }, recentNews: ["CMC limited in practice with knee issue", "49ers optimistic about his availability"] },
  { id: "p11", name: "Tyreek Hill", team: "Miami Dolphins", position: "WR", sport: "football", weeklyPoints: 22.6, seasonPoints: 380, projectedPoints: 20.8, averagePoints: 19.4, status: "active", stats: { receptions: 119, rec_yards: 1799, tds: 13, targets: 171, ypr: 15.1 }, recentNews: ["Hill demands trade amid contract dispute", "Dolphins maintain he'll stay"] },
  { id: "p12", name: "Travis Kelce", team: "Kansas City Chiefs", position: "TE", sport: "football", weeklyPoints: 18.4, seasonPoints: 296, projectedPoints: 16.8, averagePoints: 15.6, status: "active", stats: { receptions: 93, rec_yards: 984, tds: 5, targets: 121, ypr: 10.6 }, recentNews: ["Kelce continues to dominate as Chiefs TE", "Milestone reception in playoff game"] },
  { id: "p13", name: "Justin Jefferson", team: "Minnesota Vikings", position: "WR", sport: "football", weeklyPoints: 21.2, seasonPoints: 360, projectedPoints: 19.6, averagePoints: 18.4, status: "out", injuryNote: "Hamstring - IR", stats: { receptions: 68, rec_yards: 1074, tds: 5, targets: 105, ypr: 15.8 }, recentNews: ["Jefferson placed on IR with hamstring tear", "Out 4-6 weeks minimum"] },
  { id: "p14", name: "Josh Allen", team: "Buffalo Bills", position: "QB", sport: "football", weeklyPoints: 34.2, seasonPoints: 612, projectedPoints: 32.4, averagePoints: 30.8, status: "active", stats: { passing_yards: 4306, tds: 40, ints: 14, completion_pct: 64.8, rushing_yards: 524 }, recentNews: ["Allen powers Bills to playoff victory", "Sets franchise record with 40th TD"] },
  // Soccer Players
  { id: "p15", name: "Erling Haaland", team: "Manchester City", position: "ST", sport: "soccer", weeklyPoints: 14.2, seasonPoints: 420, projectedPoints: 12.8, averagePoints: 11.4, status: "active", stats: { goals: 36, assists: 8, shots: 124, shots_on_target: 62, minutes: 2840 }, recentNews: ["Haaland hat-trick propels City to top", "On track for Golden Boot"] },
  { id: "p16", name: "Kylian Mbappe", team: "Real Madrid", position: "ST", sport: "soccer", weeklyPoints: 13.8, seasonPoints: 410, projectedPoints: 12.4, averagePoints: 11.8, status: "active", stats: { goals: 32, assists: 12, shots: 116, shots_on_target: 58, minutes: 2760 }, recentNews: ["Mbappe scores brace in Champions League", "Injury scare but cleared to play"] },
  { id: "p17", name: "Bukayo Saka", team: "Arsenal", position: "RW", sport: "soccer", weeklyPoints: 11.6, seasonPoints: 360, projectedPoints: 10.8, averagePoints: 9.8, status: "active", stats: { goals: 16, assists: 14, shots: 84, shots_on_target: 38, minutes: 2810 }, recentNews: ["Saka named Premier League Player of the Month", "Renews contract with Arsenal"] },
  { id: "p18", name: "Mohamed Salah", team: "Liverpool", position: "RW", sport: "soccer", weeklyPoints: 12.4, seasonPoints: 380, projectedPoints: 11.2, averagePoints: 10.6, status: "active", stats: { goals: 28, assists: 16, shots: 108, shots_on_target: 52, minutes: 2720 }, recentNews: ["Salah equals club goal record", "Contract situation unresolved"] },
];

// Waiver wire targets (players not on popular teams)
const waiverPlayers: FantasyPlayer[] = [
  { id: "w1", name: "Darius Garland", team: "Cleveland Cavaliers", position: "PG", sport: "basketball", weeklyPoints: 38.2, seasonPoints: 1520, projectedPoints: 36.4, averagePoints: 34.8, status: "active", stats: { ppg: 21.6, rpg: 2.8, apg: 8.6, spg: 1.3, bpg: 0.2, fg_pct: 0.488 }, recentNews: ["Garland goes off for 38 with Haliburton out"], ownership: 34, trending: "up" },
  { id: "w2", name: "Tre Jones", team: "San Antonio Spurs", position: "PG", sport: "basketball", weeklyPoints: 28.4, seasonPoints: 920, projectedPoints: 26.8, averagePoints: 24.6, status: "active", stats: { ppg: 14.8, rpg: 3.2, apg: 6.4, spg: 1.6, bpg: 0.3, fg_pct: 0.512 }, recentNews: ["Jones steps up with 24 points in starting role"], ownership: 18, trending: "up" },
  { id: "w3", name: "Malik Monk", team: "Sacramento Kings", position: "SG", sport: "basketball", weeklyPoints: 32.6, seasonPoints: 1140, projectedPoints: 30.4, averagePoints: 28.2, status: "active", stats: { ppg: 17.4, rpg: 3.8, apg: 5.2, spg: 1.4, bpg: 0.4, fg_pct: 0.468 }, recentNews: ["Monk shooting 48% from three in last 5 games"], ownership: 22, trending: "up" },
];

export class FantasyService {
  getAllPlayers(sport?: string): FantasyPlayer[] {
    if (sport) {
      return playerDatabase.filter(p => p.sport === sport);
    }
    return playerDatabase;
  }

  getPlayer(playerId: string): FantasyPlayer | undefined {
    return playerDatabase.find(p => p.id === playerId) ||
           waiverPlayers.find(p => p.id === playerId);
  }

  searchPlayers(query: string, sport?: string): FantasyPlayer[] {
    const q = query.toLowerCase();
    const pool = [...playerDatabase, ...waiverPlayers];
    return pool.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(q) ||
                          p.team.toLowerCase().includes(q) ||
                          p.position.toLowerCase().includes(q);
      const matchesSport = !sport || p.sport === sport;
      return matchesQuery && matchesSport;
    });
  }

  getTopPlayers(sport: string, position?: string, limit = 20): FantasyPlayer[] {
    let players = playerDatabase.filter(p => p.sport === sport);
    if (position) {
      players = players.filter(p => p.position.toLowerCase().includes(position.toLowerCase()));
    }
    return players
      .sort((a, b) => b.averagePoints - a.averagePoints)
      .slice(0, limit);
  }

  getInjuredPlayers(sport?: string): FantasyPlayer[] {
    const pool = [...playerDatabase, ...waiverPlayers];
    return pool.filter(p => {
      const isInjured = p.status !== "active";
      const matchesSport = !sport || p.sport === sport;
      return isInjured && matchesSport;
    });
  }

  getWaiverTargets(sport: string): WaiverTarget[] {
    const targets = waiverPlayers.filter(p => p.sport === sport);
    return targets.map(p => ({
      player: p,
      reason: p.trending === "up"
        ? `${p.name} trending up - ${p.recentNews[0] || "Playing well recently"}`
        : `${p.name} has good upcoming matchups`,
      priority: (p.weeklyPoints > 35 ? "high" : p.weeklyPoints > 25 ? "medium" : "low") as "high" | "medium" | "low",
      droppingFor: p.trending === "up" ? "Injured player replacement" : undefined,
    }));
  }

  analyzePlayerTrend(playerId: string): {
    trend: "up" | "down" | "stable";
    analysis: string;
    recommendation: string;
  } {
    const player = this.getPlayer(playerId);
    if (!player) return { trend: "stable", analysis: "Player not found", recommendation: "Hold" };

    const trend = player.trending || "stable";
    const recentVsAvg = player.weeklyPoints / player.averagePoints;

    let analysis = "";
    let recommendation = "";

    if (player.status !== "active") {
      analysis = `${player.name} is currently ${player.status}. ${player.injuryNote || "No further details."}`;
      recommendation = player.status === "out" ? "Drop" : "Hold/Monitor";
    } else if (recentVsAvg > 1.1) {
      analysis = `${player.name} is performing above their season average, scoring ${player.weeklyPoints.toFixed(1)} pts vs ${player.averagePoints.toFixed(1)} average. Hot streak.`;
      recommendation = "Buy High / Start";
    } else if (recentVsAvg < 0.9) {
      analysis = `${player.name} is underperforming vs their season average. May be in a slump or facing tough matchups.`;
      recommendation = "Monitor / Consider Sitting";
    } else {
      analysis = `${player.name} is performing consistently near their season average of ${player.averagePoints.toFixed(1)} pts.`;
      recommendation = "Hold / Start";
    }

    return { trend, analysis, recommendation };
  }

  analyzeTrade(
    givingPlayerIds: string[],
    receivingPlayerIds: string[]
  ): TradeAnalysis {
    const giving = givingPlayerIds
      .map(id => this.getPlayer(id))
      .filter(Boolean) as FantasyPlayer[];
    const receiving = receivingPlayerIds
      .map(id => this.getPlayer(id))
      .filter(Boolean) as FantasyPlayer[];

    const givingValue = giving.reduce((acc, p) => acc + p.averagePoints, 0);
    const receivingValue = receiving.reduce((acc, p) => acc + p.averagePoints, 0);
    const valueDiff = receivingValue - givingValue;

    const factors: string[] = [];
    const injuredGiving = giving.filter(p => p.status !== "active");
    const injuredReceiving = receiving.filter(p => p.status !== "active");

    if (injuredGiving.length > 0)
      factors.push(`Trading away ${injuredGiving.map(p=>p.name).join(", ")} who ${injuredGiving.length > 1 ? "are" : "is"} injured - reduces your trade value`);
    if (injuredReceiving.length > 0)
      factors.push(`Receiving ${injuredReceiving.map(p=>p.name).join(", ")} who ${injuredReceiving.length > 1 ? "are" : "is"} injured - risk factor`);

    giving.forEach(p => {
      if (p.trending === "up") factors.push(`${p.name} is trending up - may be selling high`);
      if (p.trending === "down") factors.push(`${p.name} is trending down - good time to trade`);
    });

    const recommendation: "accept" | "decline" | "neutral" =
      valueDiff > 5 ? "accept" : valueDiff < -5 ? "decline" : "neutral";

    const analysis = `Trade analysis: You give ${givingValue.toFixed(1)} avg pts for ${receivingValue.toFixed(1)} avg pts. ` +
      `This is a ${valueDiff > 0 ? "win" : valueDiff < 0 ? "loss" : "neutral"} of ${Math.abs(valueDiff).toFixed(1)} pts per week. ` +
      `${recommendation === "accept" ? "Recommend accepting this trade." : recommendation === "decline" ? "Recommend declining this trade." : "This is a roughly even trade."}`;

    return { givingPlayers: giving, receivingPlayers: receiving, recommendation, valueDifference: valueDiff, valueDiff, analysis, factors };
  }

  getWeeklyProjections(sport: string, playerIds?: string[]): FantasyPlayer[] {
    let players = playerIds
      ? playerIds.map(id => this.getPlayer(id)).filter(Boolean) as FantasyPlayer[]
      : playerDatabase.filter(p => p.sport === sport).slice(0, 20);

    // Add injury risk adjustment
    return players.map(p => ({
      ...p,
      projectedPoints: p.status === "out" ? 0
        : p.status === "doubtful" ? p.projectedPoints * 0.2
        : p.status === "questionable" ? p.projectedPoints * 0.6
        : p.projectedPoints,
    }));
  }

  getSampleTeam(sport: string): FantasyTeam {
    const sportPlayers = playerDatabase.filter(p => p.sport === sport).slice(0, 8);
    const weeklyPts = sportPlayers.reduce((acc, p) => acc + p.weeklyPoints, 0);

    return {
      id: "my-team-1",
      name: "My Fantasy Team",
      sport: sport as any,
      league: sport === "basketball" ? "ESPN Fantasy Basketball" : sport === "football" ? "ESPN Fantasy Football" : "FPL",
      roster: sportPlayers,
      weeklyPoints: Math.round(weeklyPts * 10) / 10,
      projectedWeeklyPoints: Math.round(weeklyPts * 0.95 * 10) / 10,
      seasonPoints: sportPlayers.reduce((acc, p) => acc + p.seasonPoints, 0),
      record: "8-4",
      rank: 3,
      standing: "3rd of 12",
    };
  }
}

export const fantasyService = new FantasyService();
