import type { TeamStats, PlayerStats, HeadToHead, SportId } from "@shared/schema";

const teamDatabase: TeamStats[] = [
  // NBA
  { id: "bos", name: "Boston Celtics", abbreviation: "BOS", sport: "basketball", league: "NBA", record: "54-18", wins: 54, losses: 18, winPct: 0.75, pointsPerGame: 120.5, pointsAllowed: 108.2, differential: 12.3, homeRecord: "30-7", awayRecord: "24-11", lastTen: "8-2", streak: "W4", recentForm: ["W","W","W","W","L"], stats: { fg_pct: 0.484, three_pct: 0.383, ft_pct: 0.812, rebounds: 46.2, assists: 27.8, steals: 7.6, blocks: 5.2, turnovers: 12.4, pace: 98.4, offRtg: 121.8, defRtg: 109.6 }, keyPlayers: ["Jayson Tatum", "Jaylen Brown", "Kristaps Porzingis"], injuries: [] },
  { id: "okc", name: "Oklahoma City Thunder", abbreviation: "OKC", sport: "basketball", league: "NBA", record: "56-16", wins: 56, losses: 16, winPct: 0.778, pointsPerGame: 118.3, pointsAllowed: 107.1, differential: 11.2, homeRecord: "31-6", awayRecord: "25-10", lastTen: "9-1", streak: "W6", recentForm: ["W","W","W","W","W"], stats: { fg_pct: 0.478, three_pct: 0.376, ft_pct: 0.784, rebounds: 44.8, assists: 30.2, steals: 8.4, blocks: 4.8, turnovers: 11.8, pace: 100.2, offRtg: 119.6, defRtg: 107.8 }, keyPlayers: ["Shai Gilgeous-Alexander", "Chet Holmgren", "Jalen Williams"], injuries: [] },
  { id: "den", name: "Denver Nuggets", abbreviation: "DEN", sport: "basketball", league: "NBA", record: "49-23", wins: 49, losses: 23, winPct: 0.681, pointsPerGame: 115.2, pointsAllowed: 111.3, differential: 3.9, homeRecord: "27-10", awayRecord: "22-13", lastTen: "6-4", streak: "L1", recentForm: ["W","W","W","L","W"], stats: { fg_pct: 0.492, three_pct: 0.368, ft_pct: 0.798, rebounds: 45.6, assists: 31.4, steals: 6.8, blocks: 4.2, turnovers: 13.2, pace: 96.8, offRtg: 116.4, defRtg: 112.8 }, keyPlayers: ["Nikola Jokic", "Jamal Murray", "Michael Porter Jr."], injuries: [] },
  { id: "mia", name: "Miami Heat", abbreviation: "MIA", sport: "basketball", league: "NBA", record: "38-34", wins: 38, losses: 34, winPct: 0.528, pointsPerGame: 112.1, pointsAllowed: 113.8, differential: -1.7, homeRecord: "21-16", awayRecord: "17-18", lastTen: "5-5", streak: "W2", recentForm: ["W","W","L","W","L"], stats: { fg_pct: 0.468, three_pct: 0.362, ft_pct: 0.776, rebounds: 43.2, assists: 26.8, steals: 7.8, blocks: 4.6, turnovers: 13.6, pace: 95.4, offRtg: 113.2, defRtg: 114.8 }, keyPlayers: ["Jimmy Butler", "Bam Adebayo", "Tyler Herro"], injuries: ["Jimmy Butler - questionable"] },
  { id: "cle", name: "Cleveland Cavaliers", abbreviation: "CLE", sport: "basketball", league: "NBA", record: "51-21", wins: 51, losses: 21, winPct: 0.708, pointsPerGame: 116.8, pointsAllowed: 108.4, differential: 8.4, homeRecord: "28-9", awayRecord: "23-12", lastTen: "7-3", streak: "W3", recentForm: ["W","W","W","L","W"], stats: { fg_pct: 0.482, three_pct: 0.378, ft_pct: 0.794, rebounds: 45.2, assists: 28.6, steals: 7.2, blocks: 5.0, turnovers: 12.8, pace: 97.6, offRtg: 118.2, defRtg: 109.4 }, keyPlayers: ["Donovan Mitchell", "Darius Garland", "Evan Mobley"], injuries: [] },
  { id: "lal", name: "Los Angeles Lakers", abbreviation: "LAL", sport: "basketball", league: "NBA", record: "43-29", wins: 43, losses: 29, winPct: 0.597, pointsPerGame: 117.4, pointsAllowed: 114.8, differential: 2.6, homeRecord: "24-13", awayRecord: "19-16", lastTen: "6-4", streak: "L2", recentForm: ["L","L","W","W","W"], stats: { fg_pct: 0.478, three_pct: 0.366, ft_pct: 0.782, rebounds: 44.8, assists: 28.2, steals: 7.4, blocks: 5.6, turnovers: 13.2, pace: 99.2, offRtg: 116.8, defRtg: 114.2 }, keyPlayers: ["LeBron James", "Anthony Davis", "Austin Reaves"], injuries: [] },
  { id: "gsw", name: "Golden State Warriors", abbreviation: "GSW", sport: "basketball", league: "NBA", record: "40-32", wins: 40, losses: 32, winPct: 0.556, pointsPerGame: 114.2, pointsAllowed: 113.4, differential: 0.8, homeRecord: "22-15", awayRecord: "18-17", lastTen: "5-5", streak: "W1", recentForm: ["W","L","W","L","W"], stats: { fg_pct: 0.474, three_pct: 0.388, ft_pct: 0.806, rebounds: 42.8, assists: 29.4, steals: 7.0, blocks: 4.4, turnovers: 14.2, pace: 100.8, offRtg: 115.2, defRtg: 114.2 }, keyPlayers: ["Stephen Curry", "Draymond Green", "Andrew Wiggins"], injuries: [] },
  { id: "nyk", name: "New York Knicks", abbreviation: "NYK", sport: "basketball", league: "NBA", record: "48-24", wins: 48, losses: 24, winPct: 0.667, pointsPerGame: 115.6, pointsAllowed: 109.2, differential: 6.4, homeRecord: "27-10", awayRecord: "21-14", lastTen: "7-3", streak: "W2", recentForm: ["W","W","L","W","W"], stats: { fg_pct: 0.476, three_pct: 0.372, ft_pct: 0.818, rebounds: 46.4, assists: 26.2, steals: 6.8, blocks: 4.8, turnovers: 12.2, pace: 97.2, offRtg: 117.4, defRtg: 110.8 }, keyPlayers: ["Jalen Brunson", "Julius Randle", "OG Anunoby"], injuries: [] },
  { id: "phx", name: "Phoenix Suns", abbreviation: "PHX", sport: "basketball", league: "NBA", record: "45-27", wins: 45, losses: 27, winPct: 0.625, pointsPerGame: 116.2, pointsAllowed: 112.8, differential: 3.4, homeRecord: "25-12", awayRecord: "20-15", lastTen: "6-4", streak: "W1", recentForm: ["W","L","L","W","W"], stats: { fg_pct: 0.486, three_pct: 0.374, ft_pct: 0.828, rebounds: 43.6, assists: 27.8, steals: 7.2, blocks: 4.2, turnovers: 13.8, pace: 98.6, offRtg: 117.2, defRtg: 113.4 }, keyPlayers: ["Kevin Durant", "Devin Booker", "Bradley Beal"], injuries: [] },
  { id: "mil", name: "Milwaukee Bucks", abbreviation: "MIL", sport: "basketball", league: "NBA", record: "46-26", wins: 46, losses: 26, winPct: 0.639, pointsPerGame: 118.4, pointsAllowed: 112.2, differential: 6.2, homeRecord: "26-11", awayRecord: "20-15", lastTen: "7-3", streak: "W4", recentForm: ["W","W","W","W","L"], stats: { fg_pct: 0.488, three_pct: 0.376, ft_pct: 0.792, rebounds: 44.4, assists: 27.2, steals: 7.0, blocks: 5.4, turnovers: 12.6, pace: 99.8, offRtg: 118.6, defRtg: 112.4 }, keyPlayers: ["Giannis Antetokounmpo", "Damian Lillard", "Khris Middleton"], injuries: ["Khris Middleton - ankle"] },
  { id: "dal", name: "Dallas Mavericks", abbreviation: "DAL", sport: "basketball", league: "NBA", record: "44-28", wins: 44, losses: 28, winPct: 0.611, pointsPerGame: 117.8, pointsAllowed: 113.6, differential: 4.2, homeRecord: "24-13", awayRecord: "20-15", lastTen: "6-4", streak: "L1", recentForm: ["L","W","W","W","L"], stats: { fg_pct: 0.480, three_pct: 0.382, ft_pct: 0.802, rebounds: 43.8, assists: 28.4, steals: 6.6, blocks: 4.4, turnovers: 13.4, pace: 100.4, offRtg: 117.4, defRtg: 113.2 }, keyPlayers: ["Luka Doncic", "Kyrie Irving", "PJ Washington"], injuries: [] },
  // NFL
  { id: "kc", name: "Kansas City Chiefs", abbreviation: "KC", sport: "football", league: "NFL", record: "15-2", wins: 15, losses: 2, winPct: 0.882, pointsPerGame: 28.4, pointsAllowed: 17.1, differential: 11.3, homeRecord: "8-1", awayRecord: "7-1", lastTen: "9-1", streak: "W5", recentForm: ["W","W","W","W","L"], stats: { pass_yards: 4893, rush_yards: 1842, total_yards: 6735, first_downs: 368, turnovers_forced: 26, sacks: 42, third_down_pct: 0.462, redzone_pct: 0.641 }, keyPlayers: ["Patrick Mahomes", "Travis Kelce", "Chris Jones"], injuries: [] },
  { id: "phi", name: "Philadelphia Eagles", abbreviation: "PHI", sport: "football", league: "NFL", record: "14-3", wins: 14, losses: 3, winPct: 0.824, pointsPerGame: 27.2, pointsAllowed: 18.5, differential: 8.7, homeRecord: "8-1", awayRecord: "6-2", lastTen: "8-2", streak: "W3", recentForm: ["W","W","W","L","W"], stats: { pass_yards: 4612, rush_yards: 2186, total_yards: 6798, first_downs: 382, turnovers_forced: 28, sacks: 46, third_down_pct: 0.484, redzone_pct: 0.672 }, keyPlayers: ["Jalen Hurts", "A.J. Brown", "Saquon Barkley"], injuries: [] },
  { id: "buf", name: "Buffalo Bills", abbreviation: "BUF", sport: "football", league: "NFL", record: "13-4", wins: 13, losses: 4, winPct: 0.765, pointsPerGame: 26.8, pointsAllowed: 19.8, differential: 7.0, homeRecord: "7-2", awayRecord: "6-2", lastTen: "8-2", streak: "W4", recentForm: ["W","W","L","W","W"], stats: { pass_yards: 4306, rush_yards: 1692, total_yards: 5998, first_downs: 342, turnovers_forced: 22, sacks: 38, third_down_pct: 0.448, redzone_pct: 0.618 }, keyPlayers: ["Josh Allen", "Stefon Diggs", "Von Miller"], injuries: [] },
  { id: "bal", name: "Baltimore Ravens", abbreviation: "BAL", sport: "football", league: "NFL", record: "13-4", wins: 13, losses: 4, winPct: 0.765, pointsPerGame: 28.6, pointsAllowed: 20.2, differential: 8.4, homeRecord: "7-1", awayRecord: "6-3", lastTen: "7-3", streak: "W2", recentForm: ["W","W","L","W","W"], stats: { pass_yards: 4172, rush_yards: 2426, total_yards: 6598, first_downs: 374, turnovers_forced: 24, sacks: 48, third_down_pct: 0.468, redzone_pct: 0.654 }, keyPlayers: ["Lamar Jackson", "Derrick Henry", "Roquan Smith"], injuries: [] },
  { id: "sf", name: "San Francisco 49ers", abbreviation: "SF", sport: "football", league: "NFL", record: "12-5", wins: 12, losses: 5, winPct: 0.706, pointsPerGame: 25.8, pointsAllowed: 18.4, differential: 7.4, homeRecord: "7-2", awayRecord: "5-3", lastTen: "7-3", streak: "W3", recentForm: ["W","W","W","L","W"], stats: { pass_yards: 3856, rush_yards: 2186, total_yards: 6042, first_downs: 356, turnovers_forced: 26, sacks: 44, third_down_pct: 0.456, redzone_pct: 0.628 }, keyPlayers: ["Brock Purdy", "Christian McCaffrey", "Nick Bosa"], injuries: ["Christian McCaffrey - knee"] },
  { id: "det", name: "Detroit Lions", abbreviation: "DET", sport: "football", league: "NFL", record: "14-3", wins: 14, losses: 3, winPct: 0.824, pointsPerGame: 29.4, pointsAllowed: 20.8, differential: 8.6, homeRecord: "8-1", awayRecord: "6-2", lastTen: "9-1", streak: "W6", recentForm: ["W","W","W","W","W"], stats: { pass_yards: 4518, rush_yards: 1894, total_yards: 6412, first_downs: 386, turnovers_forced: 22, sacks: 36, third_down_pct: 0.478, redzone_pct: 0.668 }, keyPlayers: ["Jared Goff", "Amon-Ra St. Brown", "Aidan Hutchinson"], injuries: ["Aidan Hutchinson - leg"] },
  { id: "dal-nfl", name: "Dallas Cowboys", abbreviation: "DAL", sport: "football", league: "NFL", record: "10-7", wins: 10, losses: 7, winPct: 0.588, pointsPerGame: 24.2, pointsAllowed: 22.8, differential: 1.4, homeRecord: "6-3", awayRecord: "4-4", lastTen: "5-5", streak: "L2", recentForm: ["L","L","W","W","L"], stats: { pass_yards: 4228, rush_yards: 1542, total_yards: 5770, first_downs: 328, turnovers_forced: 20, sacks: 52, third_down_pct: 0.424, redzone_pct: 0.598 }, keyPlayers: ["Dak Prescott", "CeeDee Lamb", "Micah Parsons"], injuries: ["Dak Prescott - shoulder"] },
  // Soccer
  { id: "mci", name: "Manchester City", abbreviation: "MCI", sport: "soccer", league: "Premier League", record: "24-4-10", wins: 24, losses: 10, winPct: 0.632, pointsPerGame: 2.1, pointsAllowed: 0.7, differential: 1.4, homeRecord: "13-1-5", awayRecord: "11-3-5", lastTen: "7-1-2", streak: "W4", recentForm: ["W","W","W","W","L"], stats: { goals: 79, assists: 58, shots: 684, shots_on_target: 278, possession_pct: 64.2, pass_accuracy: 0.882, clean_sheets: 18, xg: 72.4 }, keyPlayers: ["Erling Haaland", "Kevin De Bruyne", "Phil Foden"], injuries: ["Kevin De Bruyne - knee"] },
  { id: "ars", name: "Arsenal", abbreviation: "ARS", sport: "soccer", league: "Premier League", record: "22-6-10", wins: 22, losses: 10, winPct: 0.579, pointsPerGame: 1.9, pointsAllowed: 0.8, differential: 1.1, homeRecord: "12-2-5", awayRecord: "10-4-5", lastTen: "6-2-2", streak: "W3", recentForm: ["W","W","L","W","W"], stats: { goals: 72, assists: 54, shots: 628, shots_on_target: 248, possession_pct: 58.4, pass_accuracy: 0.864, clean_sheets: 14, xg: 68.2 }, keyPlayers: ["Bukayo Saka", "Martin Odegaard", "Gabriel Martinelli"], injuries: [] },
  { id: "lfc", name: "Liverpool", abbreviation: "LIV", sport: "soccer", league: "Premier League", record: "23-5-10", wins: 23, losses: 10, winPct: 0.605, pointsPerGame: 2.0, pointsAllowed: 0.9, differential: 1.1, homeRecord: "13-1-5", awayRecord: "10-4-5", lastTen: "7-2-1", streak: "W2", recentForm: ["W","L","W","W","W"], stats: { goals: 76, assists: 56, shots: 646, shots_on_target: 262, possession_pct: 56.8, pass_accuracy: 0.848, clean_sheets: 16, xg: 70.8 }, keyPlayers: ["Mohamed Salah", "Darwin Nunez", "Virgil van Dijk"], injuries: [] },
  { id: "che", name: "Chelsea", abbreviation: "CHE", sport: "soccer", league: "Premier League", record: "18-8-12", wins: 18, losses: 12, winPct: 0.474, pointsPerGame: 1.6, pointsAllowed: 1.1, differential: 0.5, homeRecord: "10-3-6", awayRecord: "8-5-6", lastTen: "5-3-2", streak: "W1", recentForm: ["W","L","W","L","W"], stats: { goals: 62, assists: 48, shots: 584, shots_on_target: 226, possession_pct: 55.2, pass_accuracy: 0.856, clean_sheets: 10, xg: 58.4 }, keyPlayers: ["Cole Palmer", "Enzo Fernandez", "Nicolas Jackson"], injuries: [] },
  { id: "tot", name: "Tottenham Hotspur", abbreviation: "TOT", sport: "soccer", league: "Premier League", record: "17-9-12", wins: 17, losses: 12, winPct: 0.447, pointsPerGame: 1.6, pointsAllowed: 1.2, differential: 0.4, homeRecord: "10-3-6", awayRecord: "7-6-6", lastTen: "4-4-2", streak: "L1", recentForm: ["L","W","W","L","W"], stats: { goals: 64, assists: 46, shots: 598, shots_on_target: 238, possession_pct: 53.4, pass_accuracy: 0.838, clean_sheets: 8, xg: 60.2 }, keyPlayers: ["Son Heung-min", "James Maddison", "Cristian Romero"], injuries: [] },
  { id: "avl", name: "Aston Villa", abbreviation: "AVL", sport: "soccer", league: "Premier League", record: "20-7-11", wins: 20, losses: 11, winPct: 0.526, pointsPerGame: 1.8, pointsAllowed: 1.0, differential: 0.8, homeRecord: "12-2-5", awayRecord: "8-5-6", lastTen: "6-3-1", streak: "W2", recentForm: ["W","W","L","W","W"], stats: { goals: 68, assists: 50, shots: 612, shots_on_target: 244, possession_pct: 54.6, pass_accuracy: 0.842, clean_sheets: 12, xg: 64.6 }, keyPlayers: ["Ollie Watkins", "John McGinn", "Emiliano Martinez"], injuries: [] },
  { id: "ncl", name: "Newcastle United", abbreviation: "NEW", sport: "soccer", league: "Premier League", record: "19-8-11", wins: 19, losses: 11, winPct: 0.500, pointsPerGame: 1.7, pointsAllowed: 0.9, differential: 0.8, homeRecord: "11-3-5", awayRecord: "8-5-6", lastTen: "6-2-2", streak: "W3", recentForm: ["W","W","W","L","W"], stats: { goals: 60, assists: 44, shots: 574, shots_on_target: 228, possession_pct: 52.8, pass_accuracy: 0.832, clean_sheets: 14, xg: 56.8 }, keyPlayers: ["Alexander Isak", "Bruno Guimaraes", "Anthony Gordon"], injuries: [] },
  { id: "mun", name: "Manchester United", abbreviation: "MUN", sport: "soccer", league: "Premier League", record: "16-10-12", wins: 16, losses: 12, winPct: 0.421, pointsPerGame: 1.5, pointsAllowed: 1.2, differential: 0.3, homeRecord: "9-4-6", awayRecord: "7-6-6", lastTen: "4-4-2", streak: "L2", recentForm: ["L","L","W","W","L"], stats: { goals: 52, assists: 38, shots: 538, shots_on_target: 208, possession_pct: 54.8, pass_accuracy: 0.846, clean_sheets: 8, xg: 50.4 }, keyPlayers: ["Bruno Fernandes", "Rasmus Hojlund", "Kobbie Mainoo"], injuries: [] },
  { id: "nfo", name: "Nottingham Forest", abbreviation: "NFO", sport: "soccer", league: "Premier League", record: "17-9-12", wins: 17, losses: 12, winPct: 0.447, pointsPerGame: 1.6, pointsAllowed: 1.0, differential: 0.6, homeRecord: "10-3-6", awayRecord: "7-6-6", lastTen: "5-3-2", streak: "W2", recentForm: ["W","W","L","W","L"], stats: { goals: 48, assists: 34, shots: 486, shots_on_target: 188, possession_pct: 44.2, pass_accuracy: 0.798, clean_sheets: 12, xg: 44.8 }, keyPlayers: ["Chris Wood", "Morgan Gibbs-White", "Murillo"], injuries: [] },
];

const playerStatsDatabase: PlayerStats[] = [
  { id: "ps1", name: "Nikola Jokic", team: "Denver Nuggets", position: "C", sport: "basketball", age: 29, height: "7'0\"", weight: "284 lbs", number: "15", stats: { ppg: 26.4, rpg: 12.1, apg: 9.0, spg: 1.4, bpg: 0.9, fg_pct: 0.582, three_pct: 0.368, ft_pct: 0.814, mpg: 34.6, per: 31.2, ws_48: 0.248, plus_minus: 11.8 }, careerStats: { ppg: 21.8, rpg: 10.6, apg: 7.2, games: 542 }, status: "active", news: ["Named NBA MVP frontrunner", "Triple-double in 3 straight games"] },
  { id: "ps2", name: "Shai Gilgeous-Alexander", team: "Oklahoma City Thunder", position: "SG", sport: "basketball", age: 26, height: "6'6\"", weight: "195 lbs", number: "2", stats: { ppg: 31.4, rpg: 5.5, apg: 6.2, spg: 2.0, bpg: 1.0, fg_pct: 0.535, three_pct: 0.342, ft_pct: 0.868, mpg: 33.8, per: 28.6, ws_48: 0.218, plus_minus: 9.4 }, careerStats: { ppg: 22.4, rpg: 4.8, apg: 5.4, games: 384 }, status: "active", news: ["SGA leads OKC to best record in West", "Named All-Star Game starter"] },
  { id: "ps3", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks", position: "PF", sport: "basketball", age: 30, height: "6'11\"", weight: "243 lbs", number: "34", stats: { ppg: 30.4, rpg: 11.5, apg: 6.5, spg: 1.2, bpg: 1.1, fg_pct: 0.612, three_pct: 0.298, ft_pct: 0.648, mpg: 34.2, per: 30.8, ws_48: 0.238, plus_minus: 10.2 }, careerStats: { ppg: 24.8, rpg: 10.2, apg: 5.8, games: 688 }, status: "active", news: ["Giannis sets franchise scoring record", "2x NBA Champion, 2x MVP"] },
  { id: "ps4", name: "Patrick Mahomes", team: "Kansas City Chiefs", position: "QB", sport: "football", age: 29, height: "6'3\"", weight: "230 lbs", number: "15", stats: { passing_yards: 4893, tds: 41, ints: 11, completion_pct: 67.2, qbr: 78.4, rushing_yards: 427, rush_tds: 4, games: 17 }, careerStats: { passing_yards: 28562, tds: 214, ints: 62, super_bowls: 3 }, status: "active", news: ["3x Super Bowl champion", "League MVP candidate"] },
  { id: "ps5", name: "Erling Haaland", team: "Manchester City", position: "ST", sport: "soccer", age: 24, height: "6'4\"", weight: "194 lbs", number: "9", stats: { goals: 36, assists: 8, shots: 124, shots_on_target: 62, minutes: 2840, goals_per_90: 1.14, xg: 28.6, conversion_rate: 0.29 }, careerStats: { goals: 182, assists: 42, games: 218 }, status: "active", news: ["Haaland on pace for record goals season", "Golden Boot favorite"] },
  { id: "ps6", name: "LeBron James", team: "Los Angeles Lakers", position: "SF", sport: "basketball", age: 41, height: "6'9\"", weight: "250 lbs", number: "23", stats: { ppg: 25.7, rpg: 7.3, apg: 8.3, spg: 1.3, bpg: 0.5, fg_pct: 0.540, three_pct: 0.410, ft_pct: 0.750, mpg: 35.2, per: 26.4, ws_48: 0.201, plus_minus: 5.2 }, careerStats: { ppg: 27.1, rpg: 7.5, apg: 7.4, games: 1492 }, status: "active", news: ["LeBron passes another all-time milestone", "Continues to defy age at 41"] },
  { id: "ps7", name: "Stephen Curry", team: "Golden State Warriors", position: "PG", sport: "basketball", age: 38, height: "6'2\"", weight: "185 lbs", number: "30", stats: { ppg: 26.4, rpg: 5.1, apg: 5.1, spg: 1.2, bpg: 0.4, fg_pct: 0.472, three_pct: 0.408, ft_pct: 0.916, mpg: 33.6, per: 24.8, ws_48: 0.185, plus_minus: 4.6 }, careerStats: { ppg: 24.3, rpg: 4.7, apg: 6.5, games: 956 }, status: "active", news: ["Curry drills 10 threes in historic night", "Named All-Star for 10th time"] },
  { id: "ps8", name: "Kevin Durant", team: "Phoenix Suns", position: "SF", sport: "basketball", age: 37, height: "6'10\"", weight: "240 lbs", number: "35", stats: { ppg: 27.1, rpg: 6.6, apg: 5.0, spg: 0.9, bpg: 1.4, fg_pct: 0.523, three_pct: 0.404, ft_pct: 0.892, mpg: 35.8, per: 27.2, ws_48: 0.210, plus_minus: 6.8 }, careerStats: { ppg: 27.3, rpg: 7.1, apg: 4.3, games: 1050 }, status: "active", news: ["KD drops 40 in Suns victory", "Closing in on 30,000 career points"] },
  { id: "ps9", name: "Luka Doncic", team: "Dallas Mavericks", position: "PG/SG", sport: "basketball", age: 27, height: "6'7\"", weight: "230 lbs", number: "77", stats: { ppg: 33.9, rpg: 9.2, apg: 9.8, spg: 1.4, bpg: 0.5, fg_pct: 0.480, three_pct: 0.358, ft_pct: 0.786, mpg: 36.2, per: 29.8, ws_48: 0.225, plus_minus: 7.4 }, careerStats: { ppg: 28.7, rpg: 8.8, apg: 8.4, games: 382 }, status: "active", news: ["Doncic triple-double machine", "Leading NBA in usage rate"] },
  { id: "ps10", name: "Joel Embiid", team: "Philadelphia 76ers", position: "C", sport: "basketball", age: 31, height: "7'0\"", weight: "280 lbs", number: "21", stats: { ppg: 33.0, rpg: 11.2, apg: 5.6, spg: 1.0, bpg: 1.7, fg_pct: 0.529, three_pct: 0.372, ft_pct: 0.883, mpg: 33.4, per: 31.4, ws_48: 0.240, plus_minus: 8.2 }, careerStats: { ppg: 27.9, rpg: 11.2, apg: 3.6, games: 433 }, status: "active", news: ["Embiid returning from knee injury", "76ers managing his minutes carefully"] },
  { id: "ps11", name: "Jayson Tatum", team: "Boston Celtics", position: "SF", sport: "basketball", age: 28, height: "6'8\"", weight: "210 lbs", number: "0", stats: { ppg: 26.9, rpg: 8.1, apg: 4.9, spg: 1.1, bpg: 0.6, fg_pct: 0.471, three_pct: 0.378, ft_pct: 0.854, mpg: 36.0, per: 23.6, ws_48: 0.176, plus_minus: 8.8 }, careerStats: { ppg: 23.1, rpg: 7.2, apg: 4.4, games: 480 }, status: "active", news: ["Tatum leads Celtics title defense", "Named to All-NBA First Team"] },
  { id: "ps12", name: "Jalen Brunson", team: "New York Knicks", position: "PG", sport: "basketball", age: 29, height: "6'2\"", weight: "190 lbs", number: "11", stats: { ppg: 28.7, rpg: 3.5, apg: 6.7, spg: 0.9, bpg: 0.2, fg_pct: 0.479, three_pct: 0.386, ft_pct: 0.848, mpg: 35.8, per: 24.2, ws_48: 0.188, plus_minus: 6.2 }, careerStats: { ppg: 16.8, rpg: 3.2, apg: 4.2, games: 380 }, status: "active", news: ["Brunson carrying Knicks on historic run", "MSG's new king"] },
  { id: "ps13", name: "Anthony Davis", team: "Los Angeles Lakers", position: "C/PF", sport: "basketball", age: 33, height: "6'10\"", weight: "253 lbs", number: "3", stats: { ppg: 24.7, rpg: 12.6, apg: 3.5, spg: 1.2, bpg: 2.3, fg_pct: 0.554, three_pct: 0.265, ft_pct: 0.784, mpg: 35.4, per: 28.8, ws_48: 0.222, plus_minus: 7.0 }, careerStats: { ppg: 24.0, rpg: 10.5, apg: 2.6, games: 678 }, status: "active", news: ["AD dominates with 35/15 performance", "Lakers lean heavily on him"] },
  { id: "ps14", name: "Donovan Mitchell", team: "Cleveland Cavaliers", position: "SG", sport: "basketball", age: 29, height: "6'1\"", weight: "215 lbs", number: "45", stats: { ppg: 26.6, rpg: 5.1, apg: 4.5, spg: 1.8, bpg: 0.4, fg_pct: 0.469, three_pct: 0.378, ft_pct: 0.862, mpg: 34.2, per: 23.4, ws_48: 0.172, plus_minus: 5.6 }, careerStats: { ppg: 24.2, rpg: 4.4, apg: 4.8, games: 482 }, status: "active", news: ["Mitchell leads Cavs to top of East", "Clutch performer in April"] },
  { id: "ps15", name: "Josh Allen", team: "Buffalo Bills", position: "QB", sport: "football", age: 30, height: "6'5\"", weight: "237 lbs", number: "17", stats: { passing_yards: 4306, tds: 40, ints: 14, completion_pct: 64.8, qbr: 74.2, rushing_yards: 524, rush_tds: 7, games: 17 }, careerStats: { passing_yards: 24568, tds: 168, ints: 72, super_bowls: 0 }, status: "active", news: ["Allen powers Bills to AFC title game", "MVP candidate season"] },
  { id: "ps16", name: "Lamar Jackson", team: "Baltimore Ravens", position: "QB", sport: "football", age: 29, height: "6'2\"", weight: "230 lbs", number: "8", stats: { passing_yards: 4172, tds: 36, ints: 8, completion_pct: 67.2, qbr: 80.6, rushing_yards: 821, rush_tds: 5, games: 16 }, careerStats: { passing_yards: 18240, tds: 132, ints: 42, mvps: 2 }, status: "active", news: ["2x MVP adds another rushing milestone", "Jackson's dual-threat dominance continues"] },
  { id: "ps17", name: "Travis Kelce", team: "Kansas City Chiefs", position: "TE", sport: "football", age: 36, height: "6'5\"", weight: "250 lbs", number: "87", stats: { receptions: 93, rec_yards: 984, tds: 5, targets: 121, ypr: 10.6, games: 17 }, careerStats: { receptions: 916, rec_yards: 11328, tds: 76, pro_bowls: 10 }, status: "active", news: ["Kelce still producing at elite level", "All-time great TE"] },
  { id: "ps18", name: "Saquon Barkley", team: "Philadelphia Eagles", position: "RB", sport: "football", age: 29, height: "6'0\"", weight: "232 lbs", number: "26", stats: { rushing_yards: 2005, rush_tds: 13, receptions: 31, rec_yards: 278, ypc: 5.8, games: 17 }, careerStats: { rushing_yards: 8456, tds: 62, games: 98 }, status: "active", news: ["Barkley rushes for 2000+ yards", "Eagles franchise RB"] },
  { id: "ps19", name: "CeeDee Lamb", team: "Dallas Cowboys", position: "WR", sport: "football", age: 27, height: "6'2\"", weight: "198 lbs", number: "88", stats: { receptions: 135, rec_yards: 1749, tds: 12, targets: 181, ypr: 13.0, games: 17 }, careerStats: { receptions: 430, rec_yards: 5624, tds: 35, games: 73 }, status: "active", news: ["Lamb posts historic reception season", "Cowboys #1 weapon"] },
  { id: "ps20", name: "Mohamed Salah", team: "Liverpool", position: "RW", sport: "soccer", age: 33, height: "5'9\"", weight: "157 lbs", number: "11", stats: { goals: 28, assists: 16, shots: 108, shots_on_target: 52, minutes: 2720, goals_per_90: 0.93, xg: 24.2, conversion_rate: 0.26 }, careerStats: { goals: 356, assists: 162, games: 628 }, status: "active", news: ["Salah equals club goal record", "Contract situation unresolved"] },
  { id: "ps21", name: "Kylian Mbappe", team: "Real Madrid", position: "ST", sport: "soccer", age: 27, height: "5'10\"", weight: "161 lbs", number: "7", stats: { goals: 32, assists: 12, shots: 116, shots_on_target: 58, minutes: 2760, goals_per_90: 1.04, xg: 30.4, conversion_rate: 0.28 }, careerStats: { goals: 328, assists: 118, games: 452 }, status: "active", news: ["Mbappe adapting brilliantly to La Liga", "Scores brace in Champions League"] },
  { id: "ps22", name: "Bukayo Saka", team: "Arsenal", position: "RW", sport: "soccer", age: 24, height: "5'10\"", weight: "161 lbs", number: "7", stats: { goals: 16, assists: 14, shots: 84, shots_on_target: 38, minutes: 2810, goals_per_90: 0.51, xg: 12.8, conversion_rate: 0.19 }, careerStats: { goals: 68, assists: 62, games: 248 }, status: "active", news: ["Saka named PL Player of Month", "Arsenal's talisman"] },
  { id: "ps23", name: "Cole Palmer", team: "Chelsea", position: "AM/RW", sport: "soccer", age: 23, height: "5'11\"", weight: "154 lbs", number: "20", stats: { goals: 22, assists: 11, shots: 94, shots_on_target: 42, minutes: 2680, goals_per_90: 0.74, xg: 18.6, conversion_rate: 0.23 }, careerStats: { goals: 48, assists: 26, games: 128 }, status: "active", news: ["Palmer among PL goals leaders", "Chelsea's star man"] },
  { id: "ps24", name: "Martin Odegaard", team: "Arsenal", position: "AM", sport: "soccer", age: 27, height: "5'9\"", weight: "150 lbs", number: "8", stats: { goals: 8, assists: 10, shots: 52, shots_on_target: 22, minutes: 2140, goals_per_90: 0.34, xg: 6.4, key_passes: 3.2 }, careerStats: { goals: 52, assists: 68, games: 312 }, status: "active", news: ["Odegaard orchestrating Arsenal's title push", "Returning from injury"] },
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

    const safeVal = (v: any, fallback = "N/A"): string => {
      if (v == null || v === "" || v === undefined) return fallback;
      return String(v);
    };
    const safeNum = (v: any): number => (typeof v === "number" && Number.isFinite(v)) ? v : 0;

    // Parse home record wins for comparison
    const parseRecordWins = (record: string): number => {
      if (!record || record === "N/A") return 0;
      const w = parseInt(record.split("-")[0] ?? "0", 10);
      return Number.isFinite(w) ? w : 0;
    };

    const categories = [
      {
        name: "Win %",
        team1Value: safeVal(safeNum(team1.winPct) ? (team1.winPct * 100).toFixed(1) + "%" : null),
        team2Value: safeVal(safeNum(team2.winPct) ? (team2.winPct * 100).toFixed(1) + "%" : null),
        winner: (safeNum(team1.winPct) > safeNum(team2.winPct) ? "team1" : safeNum(team1.winPct) < safeNum(team2.winPct) ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Pts/Game",
        team1Value: safeVal(team1.pointsPerGame),
        team2Value: safeVal(team2.pointsPerGame),
        winner: (safeNum(team1.pointsPerGame) > safeNum(team2.pointsPerGame) ? "team1" : safeNum(team1.pointsPerGame) < safeNum(team2.pointsPerGame) ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Pts Allowed",
        team1Value: safeVal(team1.pointsAllowed),
        team2Value: safeVal(team2.pointsAllowed),
        winner: (safeNum(team1.pointsAllowed) < safeNum(team2.pointsAllowed) ? "team1" : safeNum(team1.pointsAllowed) > safeNum(team2.pointsAllowed) ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Differential",
        team1Value: safeVal(team1.differential != null ? (team1.differential > 0 ? "+" + team1.differential.toFixed(1) : team1.differential.toFixed(1)) : null),
        team2Value: safeVal(team2.differential != null ? (team2.differential > 0 ? "+" + team2.differential.toFixed(1) : team2.differential.toFixed(1)) : null),
        winner: (safeNum(team1.differential) > safeNum(team2.differential) ? "team1" : safeNum(team1.differential) < safeNum(team2.differential) ? "team2" : "tie") as "team1" | "team2" | "tie"
      },
      {
        name: "Home Record",
        team1Value: safeVal(team1.homeRecord),
        team2Value: safeVal(team2.homeRecord),
        winner: (() => {
          const t1 = parseRecordWins(team1.homeRecord);
          const t2 = parseRecordWins(team2.homeRecord);
          return (t1 > t2 ? "team1" : t1 < t2 ? "team2" : "tie") as "team1" | "team2" | "tie";
        })()
      },
      {
        name: "Away Record",
        team1Value: safeVal(team1.awayRecord),
        team2Value: safeVal(team2.awayRecord),
        winner: (() => {
          const t1 = parseRecordWins(team1.awayRecord);
          const t2 = parseRecordWins(team2.awayRecord);
          return (t1 > t2 ? "team1" : t1 < t2 ? "team2" : "tie") as "team1" | "team2" | "tie";
        })()
      },
      {
        name: "Last 10",
        team1Value: safeVal(team1.lastTen),
        team2Value: safeVal(team2.lastTen),
        winner: (() => {
          const t1 = parseLastTenWins(team1.lastTen);
          const t2 = parseLastTenWins(team2.lastTen);
          return (t1 > t2 ? "team1" : t1 < t2 ? "team2" : "tie") as "team1" | "team2" | "tie";
        })()
      },
      {
        name: "Streak",
        team1Value: safeVal(team1.streak),
        team2Value: safeVal(team2.streak),
        winner: (() => {
          const t1Wins = parseStreakWins(team1.streak);
          const t2Wins = parseStreakWins(team2.streak);
          return (t1Wins > t2Wins ? "team1" : t1Wins < t2Wins ? "team2" : "tie") as "team1" | "team2" | "tie";
        })()
      },
      {
        name: "Record",
        team1Value: safeVal(team1.record),
        team2Value: safeVal(team2.record),
        winner: (safeNum(team1.wins) > safeNum(team2.wins) ? "team1" : safeNum(team1.wins) < safeNum(team2.wins) ? "team2" : "tie") as "team1" | "team2" | "tie"
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
    const localMap = new Map(local.map(t => [t.name.toLowerCase(), t]));

    const merged = espnTeams.map(espnTeam => {
      const localTeam = localMap.get(espnTeam.name.toLowerCase());
      if (!localTeam) return espnTeam;
      return {
        ...espnTeam,
        pointsPerGame: localTeam.pointsPerGame,
        pointsAllowed: localTeam.pointsAllowed,
        differential: localTeam.differential,
        homeRecord: localTeam.homeRecord,
        awayRecord: localTeam.awayRecord,
        lastTen: localTeam.lastTen,
        streak: localTeam.streak,
        recentForm: localTeam.recentForm,
        stats: { ...localTeam.stats },
        keyPlayers: localTeam.keyPlayers,
        injuries: localTeam.injuries,
      };
    });

    const seen = new Set(espnTeams.map(t => t.name.toLowerCase()));
    const rest = local.filter(t => !seen.has(t.name.toLowerCase()));
    return [...merged, ...rest];
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

  getHeadToHead(team1Name: string, team2Name: string, sport?: SportId): HeadToHead {
    // If the caller didn't tell us which sport, look the teams up in the
    // local database so "Real Madrid vs Barcelona" doesn't return
    // sport: "basketball" downstream.
    const resolvedSport: SportId =
      sport ||
      (this.getTeam(team1Name)?.sport as SportId | undefined) ||
      (this.getTeam(team2Name)?.sport as SportId | undefined) ||
      "basketball";

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
      sport: resolvedSport,
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
