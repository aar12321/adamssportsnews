import type { TeamStats, PlayerStats, HeadToHead } from "@shared/schema";

const teamDatabase: TeamStats[] = [
  // NBA
  { id: "bos", name: "Boston Celtics", abbreviation: "BOS", sport: "basketball", league: "NBA", record: "54-18", wins: 54, losses: 18, winPct: 0.75, pointsPerGame: 120.5, pointsAllowed: 108.2, differential: 12.3, homeRecord: "30-7", awayRecord: "24-11", lastTen: "8-2", streak: "W4", recentForm: ["W","W","W","W","L"], stats: { fg_pct: 0.484, three_pct: 0.383, ft_pct: 0.812, rebounds: 46.2, assists: 27.8, steals: 7.6, blocks: 5.2, turnovers: 12.4, pace: 98.4, offRtg: 121.8, defRtg: 109.6 }, keyPlayers: ["Jayson Tatum", "Jaylen Brown", "Kristaps Porzingis"], injuries: [] },
  { id: "okc", name: "Oklahoma City Thunder", abbreviation: "OKC", sport: "basketball", league: "NBA", record: "56-16", wins: 56, losses: 16, winPct: 0.778, pointsPerGame: 118.3, pointsAllowed: 107.1, differential: 11.2, homeRecord: "31-6", awayRecord: "25-10", lastTen: "9-1", streak: "W6", recentForm: ["W","W","W","W","W"], stats: { fg_pct: 0.478, three_pct: 0.376, ft_pct: 0.784, rebounds: 44.8, assists: 30.2, steals: 8.4, blocks: 4.8, turnovers: 11.8, pace: 100.2, offRtg: 119.6, defRtg: 107.8 }, keyPlayers: ["Shai Gilgeous-Alexander", "Chet Holmgren", "Jalen Williams"], injuries: [] },
  { id: "den", name: "Denver Nuggets", abbreviation: "DEN", sport: "basketball", league: "NBA", record: "49-23", wins: 49, losses: 23, winPct: 0.681, pointsPerGame: 115.2, pointsAllowed: 111.3, differential: 3.9, homeRecord: "27-10", awayRecord: "22-13", lastTen: "6-4", streak: "L1", recentForm: ["W","W","W","L","W"], stats: { fg_pct: 0.492, three_pct: 0.368, ft_pct: 0.798, rebounds: 45.6, assists: 31.4, steals: 6.8, blocks: 4.2, turnovers: 13.2, pace: 96.8, offRtg: 116.4, defRtg: 112.8 }, keyPlayers: ["Nikola Jokic", "Jamal Murray", "Michael Porter Jr."], injuries: [] },
  { id: "mia", name: "Miami Heat", abbreviation: "MIA", sport: "basketball", league: "NBA", record: "38-34", wins: 38, losses: 34, winPct: 0.528, pointsPerGame: 112.1, pointsAllowed: 113.8, differential: -1.7, homeRecord: "21-16", awayRecord: "17-18", lastTen: "5-5", streak: "W2", recentForm: ["W","W","L","W","L"], stats: { fg_pct: 0.468, three_pct: 0.362, ft_pct: 0.776, rebounds: 43.2, assists: 26.8, steals: 7.8, blocks: 4.6, turnovers: 13.6, pace: 95.4, offRtg: 113.2, defRtg: 114.8 }, keyPlayers: ["Jimmy Butler", "Bam Adebayo", "Tyler Herro"], injuries: ["Jimmy Butler - questionable"] },
  // NFL
  { id: "kc", name: "Kansas City Chiefs", abbreviation: "KC", sport: "football", league: "NFL", record: "15-2", wins: 15, losses: 2, winPct: 0.882, pointsPerGame: 28.4, pointsAllowed: 17.1, differential: 11.3, homeRecord: "8-1", awayRecord: "7-1", lastTen: "9-1", streak: "W5", recentForm: ["W","W","W","W","L"], stats: { pass_yards: 4893, rush_yards: 1842, total_yards: 6735, first_downs: 368, turnovers_forced: 26, sacks: 42, third_down_pct: 0.462, redzone_pct: 0.641 }, keyPlayers: ["Patrick Mahomes", "Travis Kelce", "Chris Jones"], injuries: [] },
  { id: "phi", name: "Philadelphia Eagles", abbreviation: "PHI", sport: "football", league: "NFL", record: "14-3", wins: 14, losses: 3, winPct: 0.824, pointsPerGame: 27.2, pointsAllowed: 18.5, differential: 8.7, homeRecord: "8-1", awayRecord: "6-2", lastTen: "8-2", streak: "W3", recentForm: ["W","W","W","L","W"], stats: { pass_yards: 4612, rush_yards: 2186, total_yards: 6798, first_downs: 382, turnovers_forced: 28, sacks: 46, third_down_pct: 0.484, redzone_pct: 0.672 }, keyPlayers: ["Jalen Hurts", "A.J. Brown", "Saquon Barkley"], injuries: [] },
  { id: "buf", name: "Buffalo Bills", abbreviation: "BUF", sport: "football", league: "NFL", record: "13-4", wins: 13, losses: 4, winPct: 0.765, pointsPerGame: 26.8, pointsAllowed: 19.8, differential: 7.0, homeRecord: "7-2", awayRecord: "6-2", lastTen: "8-2", streak: "W4", recentForm: ["W","W","L","W","W"], stats: { pass_yards: 4306, rush_yards: 1692, total_yards: 5998, first_downs: 342, turnovers_forced: 22, sacks: 38, third_down_pct: 0.448, redzone_pct: 0.618 }, keyPlayers: ["Josh Allen", "Stefon Diggs", "Von Miller"], injuries: [] },
  // Soccer
  { id: "mci", name: "Manchester City", abbreviation: "MCI", sport: "soccer", league: "Premier League", record: "24-4-10", wins: 24, losses: 10, winPct: 0.632, pointsPerGame: 2.1, pointsAllowed: 0.7, differential: 1.4, homeRecord: "13-1-5", awayRecord: "11-3-5", lastTen: "7-1-2", streak: "W4", recentForm: ["W","W","W","W","L"], stats: { goals: 79, assists: 58, shots: 684, shots_on_target: 278, possession_pct: 64.2, pass_accuracy: 0.882, clean_sheets: 18, xg: 72.4 }, keyPlayers: ["Erling Haaland", "Kevin De Bruyne", "Phil Foden"], injuries: ["Kevin De Bruyne - knee"] },
  { id: "ars", name: "Arsenal", abbreviation: "ARS", sport: "soccer", league: "Premier League", record: "22-6-10", wins: 22, losses: 10, winPct: 0.579, pointsPerGame: 1.9, pointsAllowed: 0.8, differential: 1.1, homeRecord: "12-2-5", awayRecord: "10-4-5", lastTen: "6-2-2", streak: "W3", recentForm: ["W","W","L","W","W"], stats: { goals: 72, assists: 54, shots: 628, shots_on_target: 248, possession_pct: 58.4, pass_accuracy: 0.864, clean_sheets: 14, xg: 68.2 }, keyPlayers: ["Bukayo Saka", "Martin Odegaard", "Gabriel Martinelli"], injuries: [] },
  { id: "lfc", name: "Liverpool", abbreviation: "LIV", sport: "soccer", league: "Premier League", record: "23-5-10", wins: 23, losses: 10, winPct: 0.605, pointsPerGame: 2.0, pointsAllowed: 0.9, differential: 1.1, homeRecord: "13-1-5", awayRecord: "10-4-5", lastTen: "7-2-1", streak: "W2", recentForm: ["W","L","W","W","W"], stats: { goals: 76, assists: 56, shots: 646, shots_on_target: 262, possession_pct: 56.8, pass_accuracy: 0.848, clean_sheets: 16, xg: 70.8 }, keyPlayers: ["Mohamed Salah", "Darwin Nunez", "Virgil van Dijk"], injuries: [] },
];

const playerStatsDatabase: PlayerStats[] = [
  { id: "ps1", name: "Nikola Jokic", team: "Denver Nuggets", position: "C", sport: "basketball", age: 29, height: "7'0\"", weight: "284 lbs", number: "15", stats: { ppg: 26.4, rpg: 12.1, apg: 9.0, spg: 1.4, bpg: 0.9, fg_pct: 0.582, three_pct: 0.368, ft_pct: 0.814, mpg: 34.6, per: 31.2, ws_48: 0.248, plus_minus: 11.8 }, careerStats: { ppg: 21.8, rpg: 10.6, apg: 7.2, games: 542 }, status: "active", news: ["Named NBA MVP frontrunner", "Triple-double in 3 straight games"] },
  { id: "ps2", name: "Shai Gilgeous-Alexander", team: "Oklahoma City Thunder", position: "SG", sport: "basketball", age: 26, height: "6'6\"", weight: "195 lbs", number: "2", stats: { ppg: 31.4, rpg: 5.5, apg: 6.2, spg: 2.0, bpg: 1.0, fg_pct: 0.535, three_pct: 0.342, ft_pct: 0.868, mpg: 33.8, per: 28.6, ws_48: 0.218, plus_minus: 9.4 }, careerStats: { ppg: 22.4, rpg: 4.8, apg: 5.4, games: 384 }, status: "active", news: ["SGA leads OKC to best record in West", "Named All-Star Game starter"] },
  { id: "ps3", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks", position: "PF", sport: "basketball", age: 30, height: "6'11\"", weight: "243 lbs", number: "34", stats: { ppg: 30.4, rpg: 11.5, apg: 6.5, spg: 1.2, bpg: 1.1, fg_pct: 0.612, three_pct: 0.298, ft_pct: 0.648, mpg: 34.2, per: 30.8, ws_48: 0.238, plus_minus: 10.2 }, careerStats: { ppg: 24.8, rpg: 10.2, apg: 5.8, games: 688 }, status: "active", news: ["Giannis sets franchise scoring record", "2x NBA Champion, 2x MVP"] },
  { id: "ps4", name: "Patrick Mahomes", team: "Kansas City Chiefs", position: "QB", sport: "football", age: 29, height: "6'3\"", weight: "230 lbs", number: "15", stats: { passing_yards: 4893, tds: 41, ints: 11, completion_pct: 67.2, qbr: 78.4, rushing_yards: 427, rush_tds: 4, games: 17 }, careerStats: { passing_yards: 28562, tds: 214, ints: 62, super_bowls: 3 }, status: "active", news: ["3x Super Bowl champion", "League MVP candidate"] },
  { id: "ps5", name: "Erling Haaland", team: "Manchester City", position: "ST", sport: "soccer", age: 24, height: "6'4\"", weight: "194 lbs", number: "9", stats: { goals: 36, assists: 8, shots: 124, shots_on_target: 62, minutes: 2840, goals_per_90: 1.14, xg: 28.6, conversion_rate: 0.29 }, careerStats: { goals: 182, assists: 42, games: 218 }, status: "active", news: ["Haaland on pace for record goals season", "Golden Boot favorite"] },
];

export class AnalystService {
  getTeam(teamId: string): TeamStats | undefined {
    return teamDatabase.find(t => t.id === teamId || t.name.toLowerCase().includes(teamId.toLowerCase()));
  }

  searchTeams(query: string, sport?: string): TeamStats[] {
    const q = query.toLowerCase();
    return teamDatabase.filter(t => {
      const matchesQuery = t.name.toLowerCase().includes(q) ||
                          t.abbreviation.toLowerCase().includes(q) ||
                          t.league.toLowerCase().includes(q);
      const matchesSport = !sport || t.sport === sport;
      return matchesQuery && matchesSport;
    });
  }

  getTeamsBySport(sport: string): TeamStats[] {
    return teamDatabase.filter(t => t.sport === sport);
  }

  getPlayer(playerId: string): PlayerStats | undefined {
    return playerStatsDatabase.find(p =>
      p.id === playerId || p.name.toLowerCase().includes(playerId.toLowerCase())
    );
  }

  searchPlayers(query: string, sport?: string): PlayerStats[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return playerStatsDatabase.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(q) ||
                          p.team.toLowerCase().includes(q) ||
                          p.position.toLowerCase().includes(q);
      const matchesSport = !sport || p.sport === sport;
      return matchesQuery && matchesSport;
    });
  }

  /** Compare two team records (e.g. from ESPN or static DB). Safe when lastTen/streak are placeholders. */
  compareTeamStats(team1: TeamStats, team2: TeamStats): {
    team1: TeamStats;
    team2: TeamStats;
    categories: { name: string; team1Value: number | string; team2Value: number | string; winner: "team1" | "team2" | "tie" }[];
    team1Advantages: string[];
    team2Advantages: string[];
    prediction: string;
  } {
    const parseLastTenWins = (s: string): number => {
      if (!s || s === "—") return 0;
      const w = parseInt(s.split("-")[0] ?? "0", 10);
      return Number.isFinite(w) ? w : 0;
    };
    const parseStreakWins = (s: string): number => {
      if (!s || s === "—") return 0;
      return s.startsWith("W") ? parseInt(s.slice(1), 10) || 0 : 0;
    };

    const categories = [
      {
        name: "Win %",
        team1Value: (team1.winPct * 100).toFixed(1) + "%",
        team2Value: (team2.winPct * 100).toFixed(1) + "%",
        winner: (team1.winPct > team2.winPct ? "team1" : team1.winPct < team2.winPct ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Pts/Game",
        team1Value: team1.pointsPerGame,
        team2Value: team2.pointsPerGame,
        winner: (team1.pointsPerGame > team2.pointsPerGame ? "team1" : team1.pointsPerGame < team2.pointsPerGame ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Pts Allowed",
        team1Value: team1.pointsAllowed,
        team2Value: team2.pointsAllowed,
        winner: (team1.pointsAllowed < team2.pointsAllowed ? "team1" : team1.pointsAllowed > team2.pointsAllowed ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Differential",
        team1Value: team1.differential > 0 ? "+" + team1.differential.toFixed(1) : team1.differential.toFixed(1),
        team2Value: team2.differential > 0 ? "+" + team2.differential.toFixed(1) : team2.differential.toFixed(1),
        winner: (team1.differential > team2.differential ? "team1" : team1.differential < team2.differential ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Last 10",
        team1Value: team1.lastTen,
        team2Value: team2.lastTen,
        winner: (() => {
          const t1 = parseLastTenWins(team1.lastTen);
          const t2 = parseLastTenWins(team2.lastTen);
          return (t1 > t2 ? "team1" : t1 < t2 ? "team2" : "tie") as "team1" | "team2" | "tie";
        })()
      },
      {
        name: "Streak",
        team1Value: team1.streak,
        team2Value: team2.streak,
        winner: (() => {
          const t1Wins = parseStreakWins(team1.streak);
          const t2Wins = parseStreakWins(team2.streak);
          return (t1Wins > t2Wins ? "team1" : t1Wins < t2Wins ? "team2" : "tie") as "team1" | "team2" | "tie";
        })()
      },
    ];

    const team1Wins = categories.filter(c => c.winner === "team1").length;
    const team2Wins = categories.filter(c => c.winner === "team2").length;

    const team1Advantages = categories.filter(c => c.winner === "team1").map(c => c.name);
    const team2Advantages = categories.filter(c => c.winner === "team2").map(c => c.name);

    const betterTeam = team1Wins > team2Wins ? team1.name : team2.name;
    const prediction = `${betterTeam} has the statistical edge in this matchup, winning ${Math.max(team1Wins, team2Wins)} of ${categories.length} key categories. ` +
      `${team1.name} is ${team1.record} (${(team1.winPct * 100).toFixed(0)}%) while ${team2.name} is ${team2.record} (${(team2.winPct * 100).toFixed(0)}%).`;

    return { team1, team2, categories, team1Advantages, team2Advantages, prediction };
  }

  compareTeams(team1Id: string, team2Id: string): {
    team1: TeamStats;
    team2: TeamStats;
    categories: { name: string; team1Value: number | string; team2Value: number | string; winner: "team1" | "team2" | "tie" }[];
    team1Advantages: string[];
    team2Advantages: string[];
    prediction: string;
  } | { error: string } {
    const team1 = this.getTeam(team1Id);
    const team2 = this.getTeam(team2Id);

    if (!team1 || !team2) return { error: "One or both teams not found" };
    if (team1.sport !== team2.sport) return { error: "Teams must be in the same sport for comparison" };

    return this.compareTeamStats(team1, team2);
  }

  mergeWithEspnTeams(espnTeams: TeamStats[], sport: string): TeamStats[] {
    const local = teamDatabase.filter(t => t.sport === sport);
    const seen = new Set(espnTeams.map(t => t.name.toLowerCase()));
    const rest = local.filter(t => !seen.has(t.name.toLowerCase()));
    return [...espnTeams, ...rest];
  }

  mergePlayerSources(espnPlayers: PlayerStats[], sport: string): PlayerStats[] {
    const local = playerStatsDatabase.filter(p => p.sport === sport);
    const seen = new Set(espnPlayers.map(p => p.name.toLowerCase()));
    const rest = local.filter(p => !seen.has(p.name.toLowerCase()));
    return [...espnPlayers, ...rest];
  }

  comparePlayers(player1Id: string, player2Id: string): {
    player1: PlayerStats;
    player2: PlayerStats;
    categories: { name: string; player1Value: number | string; player2Value: number | string; winner: "player1" | "player2" | "tie" }[];
    analysis: string;
  } | { error: string } {
    const player1 = this.getPlayer(player1Id);
    const player2 = this.getPlayer(player2Id);

    if (!player1 || !player2) return { error: "One or both players not found" };

    const getStatComparisons = () => {
      const statKeys = Object.keys(player1.stats).filter(k => k in player2.stats);
      return statKeys.slice(0, 6).map(key => {
        const v1 = Number(player1.stats[key]) || 0;
        const v2 = Number(player2.stats[key]) || 0;
        // For defensive stats (allowed, against), lower is better
        const lowerIsBetter = ["turnovers", "ints", "era", "goals_against"].some(s => key.includes(s));
        const winner: "player1" | "player2" | "tie" = lowerIsBetter
          ? (v1 < v2 ? "player1" : v1 > v2 ? "player2" : "tie")
          : (v1 > v2 ? "player1" : v1 < v2 ? "player2" : "tie");
        return {
          name: key.replace(/_/g, " ").toUpperCase(),
          player1Value: typeof player1.stats[key] === "number" ? (player1.stats[key] as number).toFixed(1) : player1.stats[key] as string,
          player2Value: typeof player2.stats[key] === "number" ? (player2.stats[key] as number).toFixed(1) : player2.stats[key] as string,
          winner
        };
      });
    };

    const categories = getStatComparisons();
    const p1Wins = categories.filter(c => c.winner === "player1").length;
    const p2Wins = categories.filter(c => c.winner === "player2").length;

    const better = p1Wins > p2Wins ? player1.name : player2.name;
    const analysis = `Statistical comparison: ${player1.name} leads in ${p1Wins} categories while ${player2.name} leads in ${p2Wins}. ` +
      `${better} has the overall statistical advantage in this matchup.`;

    return { player1, player2, categories, analysis };
  }

  getHeadToHead(team1Name: string, team2Name: string): HeadToHead {
    // Generate realistic H2H data
    const t1Wins = Math.floor(Math.random() * 30) + 15;
    const t2Wins = Math.floor(Math.random() * 30) + 15;
    const ties = Math.floor(Math.random() * 5);

    const recentGames = Array.from({ length: 5 }, (_, i) => {
      const team1Score = Math.floor(Math.random() * 30) + 90;
      const team2Score = Math.floor(Math.random() * 30) + 88;
      const winner = team1Score > team2Score ? team1Name : team2Name;
      const date = new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000);
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        winner,
        score: `${team1Score}-${team2Score}`,
        location: i % 2 === 0 ? team1Name : team2Name,
      };
    });

    const t1AvgScore = Math.round((85 + Math.random() * 35) * 10) / 10;
    const t2AvgScore = Math.round((83 + Math.random() * 35) * 10) / 10;

    return {
      team1: team1Name,
      team2: team2Name,
      sport: "basketball",
      allTime: { team1Wins: t1Wins, team2Wins: t2Wins, ties },
      lastFive: {
        team1Wins: recentGames.filter(g => g.winner === team1Name).length,
        team2Wins: recentGames.filter(g => g.winner === team2Name).length,
        ties: 0,
      },
      recentGames,
      team1AvgScore: t1AvgScore,
      team2AvgScore: t2AvgScore,
      analysis: `${t1Wins > t2Wins ? team1Name : team2Name} leads the all-time series ${Math.max(t1Wins, t2Wins)}-${Math.min(t1Wins, t2Wins)}. ` +
        `In the last 5 meetings, ${recentGames.filter(g => g.winner === team1Name).length > recentGames.filter(g => g.winner === team2Name).length ? team1Name : team2Name} has dominated.`,
    };
  }

  getTrendingTeams(sport: string): TeamStats[] {
    return teamDatabase
      .filter(t => t.sport === sport)
      .filter(t => t.streak.startsWith("W"))
      .sort((a, b) => parseInt(b.streak.slice(1)) - parseInt(a.streak.slice(1)));
  }

  /** Rank teams for “hot” sidebar when using merged ESPN + static lists. */
  rankHotTeams(teams: TeamStats[], limit = 10): TeamStats[] {
    return [...teams]
      .sort(
        (a, b) =>
          b.winPct - a.winPct ||
          (b.differential ?? 0) - (a.differential ?? 0)
      )
      .slice(0, limit);
  }

  getLeagueLeaders(sport: string): { category: string; player: string; team: string; value: string }[] {
    const leaders: Record<string, { category: string; player: string; team: string; value: string }[]> = {
      basketball: [
        { category: "Points Per Game", player: "Luka Doncic", team: "Dallas Mavericks", value: "33.9" },
        { category: "Rebounds Per Game", player: "Nikola Jokic", team: "Denver Nuggets", value: "12.1" },
        { category: "Assists Per Game", player: "Tyrese Haliburton", team: "Indiana Pacers", value: "11.6" },
        { category: "Steals Per Game", player: "Shai Gilgeous-Alexander", team: "OKC Thunder", value: "2.0" },
        { category: "Blocks Per Game", player: "Victor Wembanyama", team: "San Antonio Spurs", value: "3.6" },
        { category: "Field Goal %", player: "Nikola Jokic", team: "Denver Nuggets", value: "58.2%" },
      ],
      football: [
        { category: "Passing Yards", player: "Patrick Mahomes", team: "Kansas City Chiefs", value: "4,893" },
        { category: "Rushing Yards", player: "Christian McCaffrey", team: "San Francisco 49ers", value: "1,459" },
        { category: "Receiving Yards", player: "Tyreek Hill", team: "Miami Dolphins", value: "1,799" },
        { category: "Passing TDs", player: "Patrick Mahomes", team: "Kansas City Chiefs", value: "41" },
        { category: "Sacks", player: "Micah Parsons", team: "Dallas Cowboys", value: "17" },
        { category: "Interceptions", player: "Darius Slay", team: "Philadelphia Eagles", value: "8" },
      ],
      soccer: [
        { category: "Goals", player: "Erling Haaland", team: "Manchester City", value: "36" },
        { category: "Assists", player: "Kevin De Bruyne", team: "Manchester City", value: "18" },
        { category: "Shots on Target", player: "Erling Haaland", team: "Manchester City", value: "62" },
        { category: "Clean Sheets (GK)", player: "Alisson Becker", team: "Liverpool", value: "18" },
        { category: "Pass Accuracy", player: "Trent Alexander-Arnold", team: "Liverpool", value: "92.4%" },
        { category: "Key Passes", player: "Kevin De Bruyne", team: "Manchester City", value: "84" },
      ],
    };
    return leaders[sport] || [];
  }
}

export const analystService = new AnalystService();
