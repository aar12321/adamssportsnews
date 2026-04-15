import type { FantasyPlayer, FantasyTeam, TradeAnalysis, WaiverTarget, PlayerStats } from "@shared/schema";
import {
  validateRosterAddition,
  canFitFantasyRoster,
  type RosterValidationResult,
} from "@shared/fantasyRules";

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
  { id: "p19", name: "LeBron James", team: "Los Angeles Lakers", position: "SF", sport: "basketball", weeklyPoints: 44.6, seasonPoints: 1806, projectedPoints: 42.8, averagePoints: 42.0, status: "active", stats: { ppg: 25.7, rpg: 7.3, apg: 8.3, spg: 1.3, bpg: 0.5, fg_pct: 0.540 }, recentNews: ["James posts triple-double in Lakers win", "Still elite usage in Year 22"] },
  { id: "p20", name: "Stephen Curry", team: "Golden State Warriors", position: "PG", sport: "basketball", weeklyPoints: 46.4, seasonPoints: 1892, projectedPoints: 44.6, averagePoints: 44.0, status: "active", stats: { ppg: 26.4, rpg: 5.1, apg: 5.1, spg: 1.2, bpg: 0.4, fg_pct: 0.472 }, recentNews: ["Curry hits eight threes in Warriors rout", "On pace for another 300-3PT season"] },
  { id: "p21", name: "Kevin Durant", team: "Phoenix Suns", position: "SF", sport: "basketball", weeklyPoints: 48.2, seasonPoints: 1932, projectedPoints: 46.4, averagePoints: 46.0, status: "active", stats: { ppg: 27.1, rpg: 6.6, apg: 5.0, spg: 0.9, bpg: 1.4, fg_pct: 0.523 }, recentNews: ["Durant efficient 34-point night vs West rival", "Suns lean on KD in clutch minutes"] },
  { id: "p22", name: "Joel Embiid", team: "Philadelphia 76ers", position: "C", sport: "basketball", weeklyPoints: 50.4, seasonPoints: 2016, projectedPoints: 44.0, averagePoints: 48.0, status: "questionable", injuryNote: "Knee management", stats: { ppg: 33.0, rpg: 11.2, apg: 5.6, spg: 1.0, bpg: 1.7, fg_pct: 0.529 }, recentNews: ["Embiid listed questionable ahead of back-to-back", "Dominant when available — monitor minutes"] },
  { id: "p23", name: "Damian Lillard", team: "Milwaukee Bucks", position: "PG", sport: "basketball", weeklyPoints: 43.2, seasonPoints: 1763, projectedPoints: 41.6, averagePoints: 41.0, status: "active", stats: { ppg: 24.3, rpg: 4.4, apg: 7.0, spg: 0.9, bpg: 0.3, fg_pct: 0.448 }, recentNews: ["Lillard game-winner lifts Bucks", "Chemistry with Giannis improving"] },
  { id: "p24", name: "Donovan Mitchell", team: "Cleveland Cavaliers", position: "SG", sport: "basketball", weeklyPoints: 45.0, seasonPoints: 1845, projectedPoints: 43.4, averagePoints: 43.0, status: "active", stats: { ppg: 26.6, rpg: 5.1, apg: 4.5, spg: 1.8, bpg: 0.4, fg_pct: 0.469 }, recentNews: ["Mitchell drops 40 in Cavs statement win", "All-Star case strengthening"] },
  { id: "p25", name: "Devin Booker", team: "Phoenix Suns", position: "SG", sport: "basketball", weeklyPoints: 44.4, seasonPoints: 1814, projectedPoints: 42.8, averagePoints: 42.0, status: "active", stats: { ppg: 27.1, rpg: 4.5, apg: 6.9, spg: 1.0, bpg: 0.3, fg_pct: 0.494 }, recentNews: ["Booker orchestrates Suns offense in double OT", "Efficient mid-range game on display"] },
  { id: "p26", name: "Jimmy Butler", team: "Miami Heat", position: "SF", sport: "basketball", weeklyPoints: 40.2, seasonPoints: 1596, projectedPoints: 35.4, averagePoints: 38.0, status: "questionable", injuryNote: "Knee - day-to-day", stats: { ppg: 20.8, rpg: 5.3, apg: 5.0, spg: 1.3, bpg: 0.3, fg_pct: 0.498 }, recentNews: ["Butler misses shootaround — knee", "Heat hopeful for weekend return"] },
  { id: "p27", name: "Jalen Brunson", team: "New York Knicks", position: "PG", sport: "basketball", weeklyPoints: 46.2, seasonPoints: 1892, projectedPoints: 44.8, averagePoints: 44.0, status: "active", stats: { ppg: 28.7, rpg: 3.5, apg: 6.7, spg: 0.9, bpg: 0.2, fg_pct: 0.479 }, recentNews: ["Brunson torches rival for 45", "MVP chatter grows in New York"] },
  { id: "p28", name: "De'Aaron Fox", team: "Sacramento Kings", position: "PG", sport: "basketball", weeklyPoints: 42.4, seasonPoints: 1720, projectedPoints: 40.8, averagePoints: 40.0, status: "active", stats: { ppg: 26.6, rpg: 4.6, apg: 5.6, spg: 2.0, bpg: 0.5, fg_pct: 0.467 }, recentNews: ["Fox ends game with steal and slam", "Kings push for playoff seeding"] },
  // NFL Players
  { id: "p9", name: "Patrick Mahomes", team: "Kansas City Chiefs", position: "QB", sport: "football", weeklyPoints: 32.4, seasonPoints: 580, projectedPoints: 28.6, averagePoints: 27.8, status: "active", stats: { passing_yards: 4893, tds: 41, ints: 11, completion_pct: 67.2, rushing_yards: 427 }, recentNews: ["Mahomes leads Chiefs to AFC championship", "Cleared health protocol"] },
  { id: "p10", name: "Christian McCaffrey", team: "San Francisco 49ers", position: "RB", sport: "football", weeklyPoints: 28.8, seasonPoints: 420, projectedPoints: 26.4, averagePoints: 25.2, status: "questionable", injuryNote: "Knee - limited practice", stats: { rushing_yards: 1459, rush_tds: 14, receptions: 67, rec_yards: 564, rec_tds: 7 }, recentNews: ["CMC limited in practice with knee issue", "49ers optimistic about his availability"] },
  { id: "p11", name: "Tyreek Hill", team: "Miami Dolphins", position: "WR", sport: "football", weeklyPoints: 22.6, seasonPoints: 380, projectedPoints: 20.8, averagePoints: 19.4, status: "active", stats: { receptions: 119, rec_yards: 1799, tds: 13, targets: 171, ypr: 15.1 }, recentNews: ["Hill demands trade amid contract dispute", "Dolphins maintain he'll stay"] },
  { id: "p12", name: "Travis Kelce", team: "Kansas City Chiefs", position: "TE", sport: "football", weeklyPoints: 18.4, seasonPoints: 296, projectedPoints: 16.8, averagePoints: 15.6, status: "active", stats: { receptions: 93, rec_yards: 984, tds: 5, targets: 121, ypr: 10.6 }, recentNews: ["Kelce continues to dominate as Chiefs TE", "Milestone reception in playoff game"] },
  { id: "p13", name: "Justin Jefferson", team: "Minnesota Vikings", position: "WR", sport: "football", weeklyPoints: 21.2, seasonPoints: 360, projectedPoints: 19.6, averagePoints: 18.4, status: "out", injuryNote: "Hamstring - IR", stats: { receptions: 68, rec_yards: 1074, tds: 5, targets: 105, ypr: 15.8 }, recentNews: ["Jefferson placed on IR with hamstring tear", "Out 4-6 weeks minimum"] },
  { id: "p14", name: "Josh Allen", team: "Buffalo Bills", position: "QB", sport: "football", weeklyPoints: 34.2, seasonPoints: 612, projectedPoints: 32.4, averagePoints: 30.8, status: "active", stats: { passing_yards: 4306, tds: 40, ints: 14, completion_pct: 64.8, rushing_yards: 524 }, recentNews: ["Allen powers Bills to playoff victory", "Sets franchise record with 40th TD"] },
  { id: "p29", name: "Lamar Jackson", team: "Baltimore Ravens", position: "QB", sport: "football", weeklyPoints: 33.4, seasonPoints: 558, projectedPoints: 31.8, averagePoints: 31.0, status: "active", stats: { passing_yards: 4172, tds: 36, ints: 8, completion_pct: 67.2, rushing_yards: 821 }, recentNews: ["Jackson accounts for 5 TDs in Ravens win", "Dual-threat MVP buzz returns"] },
  { id: "p30", name: "CeeDee Lamb", team: "Dallas Cowboys", position: "WR", sport: "football", weeklyPoints: 21.6, seasonPoints: 360, projectedPoints: 20.2, averagePoints: 20.0, status: "active", stats: { receptions: 135, rec_yards: 1749, tds: 12, targets: 181, ypr: 13.0 }, recentNews: ["Lamb feasts in slot-heavy game plan", "League leader in targets again"] },
  { id: "p31", name: "Derrick Henry", team: "Baltimore Ravens", position: "RB", sport: "football", weeklyPoints: 23.8, seasonPoints: 396, projectedPoints: 22.4, averagePoints: 22.0, status: "active", stats: { rushing_yards: 1921, rush_tds: 18, receptions: 22, rec_yards: 178, rec_tds: 0 }, recentNews: ["Henry bulldozes for 180 yards", "Still a clock-killing machine"] },
  { id: "p32", name: "Davante Adams", team: "New York Jets", position: "WR", sport: "football", weeklyPoints: 19.4, seasonPoints: 324, projectedPoints: 18.2, averagePoints: 18.0, status: "active", stats: { receptions: 103, rec_yards: 1144, tds: 8, targets: 149, ypr: 11.1 }, recentNews: ["Adams red zone chemistry improving", "Heavy volume in must-win game"] },
  { id: "p33", name: "Saquon Barkley", team: "Philadelphia Eagles", position: "RB", sport: "football", weeklyPoints: 25.6, seasonPoints: 432, projectedPoints: 24.2, averagePoints: 24.0, status: "active", stats: { rushing_yards: 2005, rush_tds: 13, receptions: 31, rec_yards: 278, rec_tds: 2 }, recentNews: ["Barkley tops 2000 rushing yards", "Eagles ground game unstoppable"] },
  { id: "p34", name: "Jalen Hurts", team: "Philadelphia Eagles", position: "QB", sport: "football", weeklyPoints: 31.2, seasonPoints: 522, projectedPoints: 29.6, averagePoints: 29.0, status: "active", stats: { passing_yards: 3858, tds: 35, ints: 12, completion_pct: 67.8, rushing_yards: 605 }, recentNews: ["Hurts rushes for two scores in win", "Tush push remains automatic"] },
  { id: "p35", name: "Ja'Marr Chase", team: "Cincinnati Bengals", position: "WR", sport: "football", weeklyPoints: 22.4, seasonPoints: 378, projectedPoints: 21.0, averagePoints: 21.0, status: "active", stats: { receptions: 127, rec_yards: 1708, tds: 17, targets: 169, ypr: 13.4 }, recentNews: ["Chase and Burrow connection clicks", "League-high TD total among WRs"] },
  { id: "p36", name: "Nick Bosa", team: "San Francisco 49ers", position: "DE", sport: "football", weeklyPoints: 17.2, seasonPoints: 276, projectedPoints: 16.4, averagePoints: 16.0, status: "active", stats: { sacks: 15.5, tackles: 51, tfl: 18, qb_hits: 29, forced_fumbles: 4 }, recentNews: ["Bosa game-wrecking four-sack performance", "49ers pass rush peaking for playoffs"] },
  { id: "p37", name: "Amon-Ra St. Brown", team: "Detroit Lions", position: "WR", sport: "football", weeklyPoints: 20.2, seasonPoints: 342, projectedPoints: 19.0, averagePoints: 19.0, status: "active", stats: { receptions: 119, rec_yards: 1515, tds: 10, targets: 158, ypr: 12.7 }, recentNews: ["St. Brown feasts in the slot vs zone", "Lions WR1 in every game script"] },
  // Soccer Players
  { id: "p15", name: "Erling Haaland", team: "Manchester City", position: "ST", sport: "soccer", weeklyPoints: 14.2, seasonPoints: 420, projectedPoints: 12.8, averagePoints: 11.4, status: "active", stats: { goals: 36, assists: 8, shots: 124, shots_on_target: 62, minutes: 2840 }, recentNews: ["Haaland hat-trick propels City to top", "On track for Golden Boot"] },
  { id: "p16", name: "Kylian Mbappe", team: "Real Madrid", position: "ST", sport: "soccer", weeklyPoints: 13.8, seasonPoints: 410, projectedPoints: 12.4, averagePoints: 11.8, status: "active", stats: { goals: 32, assists: 12, shots: 116, shots_on_target: 58, minutes: 2760 }, recentNews: ["Mbappe scores brace in Champions League", "Injury scare but cleared to play"] },
  { id: "p17", name: "Bukayo Saka", team: "Arsenal", position: "RW", sport: "soccer", weeklyPoints: 11.6, seasonPoints: 360, projectedPoints: 10.8, averagePoints: 9.8, status: "active", stats: { goals: 16, assists: 14, shots: 84, shots_on_target: 38, minutes: 2810 }, recentNews: ["Saka named Premier League Player of the Month", "Renews contract with Arsenal"] },
  { id: "p18", name: "Mohamed Salah", team: "Liverpool", position: "RW", sport: "soccer", weeklyPoints: 12.4, seasonPoints: 380, projectedPoints: 11.2, averagePoints: 10.6, status: "active", stats: { goals: 28, assists: 16, shots: 108, shots_on_target: 52, minutes: 2720 }, recentNews: ["Salah equals club goal record", "Contract situation unresolved"] },
  { id: "p38", name: "Cole Palmer", team: "Chelsea", position: "AM/RW", sport: "soccer", weeklyPoints: 10.8, seasonPoints: 428, projectedPoints: 10.0, averagePoints: 10.2, status: "active", stats: { goals: 22, assists: 11, shots: 94, shots_on_target: 42, minutes: 2680 }, recentNews: ["Palmer on penalties and playmaking duty", "Chelsea's creative hub every week"] },
  { id: "p39", name: "Martin Odegaard", team: "Arsenal", position: "AM", sport: "soccer", weeklyPoints: 9.8, seasonPoints: 376, projectedPoints: 9.0, averagePoints: 9.4, status: "active", stats: { goals: 8, assists: 10, shots: 52, shots_on_target: 22, minutes: 2140 }, recentNews: ["Odegaard pulls strings from the half-spaces", "Set-piece delivery on point"] },
  { id: "p40", name: "Phil Foden", team: "Manchester City", position: "LW/AM", sport: "soccer", weeklyPoints: 10.4, seasonPoints: 392, projectedPoints: 9.6, averagePoints: 9.8, status: "active", stats: { goals: 19, assists: 8, shots: 74, shots_on_target: 34, minutes: 2520 }, recentNews: ["Foden cuts inside for trademark curler", "Pep rotates wingers — Foden still starts"] },
  { id: "p41", name: "Ollie Watkins", team: "Aston Villa", position: "ST", sport: "soccer", weeklyPoints: 10.2, seasonPoints: 384, projectedPoints: 9.4, averagePoints: 9.6, status: "active", stats: { goals: 19, assists: 13, shots: 88, shots_on_target: 38, minutes: 2900 }, recentNews: ["Watkins link-up with midfield clicking", "Penalty duties secured"] },
  { id: "p42", name: "Son Heung-min", team: "Tottenham Hotspur", position: "LW", sport: "soccer", weeklyPoints: 9.6, seasonPoints: 360, projectedPoints: 8.8, averagePoints: 9.0, status: "active", stats: { goals: 17, assists: 10, shots: 76, shots_on_target: 32, minutes: 2680 }, recentNews: ["Son finishes clinical brace on the break", "Captain's armband suits him"] },
  { id: "p43", name: "Bruno Fernandes", team: "Manchester United", position: "AM", sport: "soccer", weeklyPoints: 9.8, seasonPoints: 368, projectedPoints: 9.0, averagePoints: 9.2, status: "active", stats: { goals: 10, assists: 12, shots: 64, shots_on_target: 26, minutes: 2800 }, recentNews: ["Bruno chance creation numbers lead the league", "Every corner and free kick runs through him"] },
  { id: "p44", name: "Alexander Isak", team: "Newcastle United", position: "ST", sport: "soccer", weeklyPoints: 10.6, seasonPoints: 400, projectedPoints: 9.8, averagePoints: 10.0, status: "active", stats: { goals: 21, assists: 4, shots: 82, shots_on_target: 38, minutes: 2540 }, recentNews: ["Isak timing of runs troubles back lines", "Clinical in transition"] },
  { id: "p45", name: "Declan Rice", team: "Arsenal", position: "CM", sport: "soccer", weeklyPoints: 7.8, seasonPoints: 288, projectedPoints: 7.0, averagePoints: 7.2, status: "active", stats: { goals: 7, assists: 8, shots: 42, shots_on_target: 16, minutes: 2820 }, recentNews: ["Rice covers ground in the double pivot", "Late runs into the box add goals"] },
];

// Waiver wire targets (players not on popular teams)
const waiverPlayers: FantasyPlayer[] = [
  { id: "w1", name: "Darius Garland", team: "Cleveland Cavaliers", position: "PG", sport: "basketball", weeklyPoints: 38.2, seasonPoints: 1520, projectedPoints: 36.4, averagePoints: 34.8, status: "active", stats: { ppg: 21.6, rpg: 2.8, apg: 8.6, spg: 1.3, bpg: 0.2, fg_pct: 0.488 }, recentNews: ["Garland goes off for 38 with Haliburton out"], ownership: 34, trending: "up" },
  { id: "w2", name: "Tre Jones", team: "San Antonio Spurs", position: "PG", sport: "basketball", weeklyPoints: 28.4, seasonPoints: 920, projectedPoints: 26.8, averagePoints: 24.6, status: "active", stats: { ppg: 14.8, rpg: 3.2, apg: 6.4, spg: 1.6, bpg: 0.3, fg_pct: 0.512 }, recentNews: ["Jones steps up with 24 points in starting role"], ownership: 18, trending: "up" },
  { id: "w3", name: "Malik Monk", team: "Sacramento Kings", position: "SG", sport: "basketball", weeklyPoints: 32.6, seasonPoints: 1140, projectedPoints: 30.4, averagePoints: 28.2, status: "active", stats: { ppg: 17.4, rpg: 3.8, apg: 5.2, spg: 1.4, bpg: 0.4, fg_pct: 0.468 }, recentNews: ["Monk shooting 48% from three in last 5 games"], ownership: 22, trending: "up" },
  { id: "w4", name: "Pedro Neto", team: "Chelsea", position: "RW", sport: "soccer", weeklyPoints: 9.2, seasonPoints: 280, projectedPoints: 8.6, averagePoints: 7.8, status: "active", stats: { goals: 6, assists: 9, shots: 42, shots_on_target: 18, minutes: 1680 }, recentNews: ["Neto creating chances off the bench"], ownership: 12, trending: "up" },
  { id: "w5", name: "Jean-Philippe Mateta", team: "Crystal Palace", position: "ST", sport: "soccer", weeklyPoints: 8.4, seasonPoints: 240, projectedPoints: 7.9, averagePoints: 7.2, status: "active", stats: { goals: 8, assists: 2, shots: 38, shots_on_target: 16, minutes: 1520 }, recentNews: ["Mateta on a scoring run — waiver wire add"], ownership: 9, trending: "up" },
  { id: "w6", name: "Puka Nacua", team: "Los Angeles Rams", position: "WR", sport: "football", weeklyPoints: 18.4, seasonPoints: 310, projectedPoints: 17.2, averagePoints: 16.8, status: "active", stats: { receptions: 105, rec_yards: 1486, tds: 6, targets: 140, ypr: 14.2 }, recentNews: ["Nacua continues breakout sophomore campaign", "Stafford trusts him on third down"], ownership: 32, trending: "up" },
  { id: "w7", name: "Jayden Daniels", team: "Washington Commanders", position: "QB", sport: "football", weeklyPoints: 24.2, seasonPoints: 390, projectedPoints: 22.8, averagePoints: 21.4, status: "active", stats: { passing_yards: 3568, tds: 25, ints: 9, completion_pct: 69.0, rushing_yards: 698 }, recentNews: ["Daniels leads Commanders to playoff berth - ROTY frontrunner", "Designed runs boosting fantasy floor"], ownership: 28, trending: "up" },
  { id: "w8", name: "Brock Bowers", team: "Las Vegas Raiders", position: "TE", sport: "football", weeklyPoints: 16.2, seasonPoints: 260, projectedPoints: 15.4, averagePoints: 14.8, status: "active", stats: { receptions: 112, rec_yards: 1194, tds: 5, targets: 138, ypr: 10.7 }, recentNews: ["Bowers sets rookie TE record for receptions", "High target share even in negative game scripts"], ownership: 22, trending: "up" },
  { id: "w9", name: "Cade Cunningham", team: "Detroit Pistons", position: "PG", sport: "basketball", weeklyPoints: 34.6, seasonPoints: 1240, projectedPoints: 33.2, averagePoints: 31.8, status: "active", stats: { ppg: 22.7, rpg: 7.5, apg: 7.5, spg: 1.2, bpg: 0.4, fg_pct: 0.448 }, recentNews: ["Cunningham averaging a triple-double over last 10 games", "Pistons offense runs through him"], ownership: 28, trending: "up" },
  { id: "w10", name: "Anfernee Simons", team: "Portland Trail Blazers", position: "SG", sport: "basketball", weeklyPoints: 30.2, seasonPoints: 1080, projectedPoints: 28.8, averagePoints: 27.4, status: "active", stats: { ppg: 22.6, rpg: 2.5, apg: 5.5, spg: 0.6, bpg: 0.2, fg_pct: 0.440 }, recentNews: ["Simons hot from three — 46% over last two weeks", "Blazers leaning on his shot creation"], ownership: 19, trending: "up" },
  { id: "w11", name: "Morgan Gibbs-White", team: "Nottingham Forest", position: "AM", sport: "soccer", weeklyPoints: 7.8, seasonPoints: 220, projectedPoints: 7.4, averagePoints: 6.8, status: "active", stats: { goals: 5, assists: 8, shots: 34, shots_on_target: 14, minutes: 2180 }, recentNews: ["Gibbs-White pulling strings in Forest's surprise campaign", "Creative hub when Forest counterattacks"], ownership: 8, trending: "up" },
  { id: "w12", name: "Chris Wood", team: "Nottingham Forest", position: "ST", sport: "soccer", weeklyPoints: 8.0, seasonPoints: 230, projectedPoints: 7.6, averagePoints: 7.0, status: "active", stats: { goals: 14, assists: 3, shots: 52, shots_on_target: 24, minutes: 2440 }, recentNews: ["Wood continues hot streak — 5 goals in last 4 matches", "Aerial threat on set pieces"], ownership: 11, trending: "up" },
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

  /** Map ESPN leader row to fantasy scoring shape. */
  playerStatsToFantasy(p: PlayerStats): FantasyPlayer {
    const statVals = Object.values(p.stats).filter((v): v is number => typeof v === "number");
    const avg = statVals.length ? statVals.reduce((a, b) => a + b, 0) / statVals.length : 18;
    const st =
      p.status === "injured" ? "injured" :
      p.status === "out" ? "out" :
      "active";
    return {
      id: p.id,
      name: p.name,
      team: p.team,
      position: p.position,
      sport: p.sport,
      weeklyPoints: Math.min(120, Math.round(avg * 1.4 * 10) / 10),
      seasonPoints: Math.round(avg * 72),
      projectedPoints: Math.round(avg * 1.05 * 10) / 10,
      averagePoints: Math.round(avg * 10) / 10,
      status: st,
      stats: p.stats as Record<string, number>,
      recentNews: p.news?.length ? p.news : ["Featured in league leader data"],
      injuryNote: p.injuryNote,
    };
  }

  mergeFantasyWithEspn(sport: string, fromEspn: FantasyPlayer[]): FantasyPlayer[] {
    const local = this.getAllPlayers(sport);
    const seen = new Set(fromEspn.map((p) => p.name.toLowerCase()));
    const rest = local.filter((p) => !seen.has(p.name.toLowerCase()));
    return [...fromEspn, ...rest];
  }

  /**
   * Server-side mirror of the client's roster validation. The client is the
   * primary gatekeeper — this endpoint exists so a tampered or stale
   * localStorage can't push the UI into a state that the rules would
   * normally forbid.
   */
  validateRosterAddition(
    roster: { id: string; position?: string; sport?: string }[],
    player: { id: string; position?: string; sport?: string },
    sport: string,
  ): RosterValidationResult {
    return validateRosterAddition(roster, player, sport);
  }

  /**
   * Check that an entire roster fits the sport's lineup. Returns `false` if
   * the roster would leave a player unplaceable (e.g. two goalies in a
   * single-G hockey lineup).
   */
  isRosterValid(
    roster: { id: string; position?: string; sport?: string }[],
    sport: string,
  ): boolean {
    return canFitFantasyRoster(roster, sport);
  }
}

export const fantasyService = new FantasyService();
