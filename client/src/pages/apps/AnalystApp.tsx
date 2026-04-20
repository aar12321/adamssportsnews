import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { APP_SPORTS, getUserAppSports } from "@shared/appSports";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  BarChart3, ChevronLeft, Search, TrendingUp, Users, ArrowLeftRight,
  Trophy, Activity, Target, Star, Flame, ChevronRight, Award
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

function FormBadges({ form }: { form: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {form.map((r, i) => (
        <span key={i} className={cn(
          "w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center",
          r === "W" ? "bg-green-500/20 text-green-400" :
          r === "L" ? "bg-red-500/20 text-red-400" :
          "bg-muted text-muted-foreground"
        )}>
          {r}
        </span>
      ))}
    </div>
  );
}

const MemoizedTeamCard = React.memo(TeamCard);

function TeamCard({ team, onClick, isSelected }: { team: any; onClick: () => void; isSelected: boolean }) {
  const isSoccer = team.sport === "soccer";
  const forLabel = isSoccer ? "GF" : "PPG";
  const againstLabel = isSoccer ? "GA" : "OPP";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left glass-card p-4 hover:border-primary/30 transition-all",
        isSelected && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-foreground">{team.name}</p>
          <p className="text-xs text-muted-foreground">{team.league}</p>
        </div>
        <span className="text-xs font-bold text-foreground">{team.record}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-base font-bold text-foreground num">{team.pointsPerGame?.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">{forLabel}</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-foreground num">{team.pointsAllowed?.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">{againstLabel}</p>
        </div>
        <div className="text-center">
          <p className={cn("text-base font-bold num", team.differential >= 0 ? "text-green-400" : "text-red-400")}>
            {team.differential >= 0 ? "+" : ""}{team.differential?.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">DIFF</p>
        </div>
      </div>
    </button>
  );
}

function TeamDetail({ team }: { team: any }) {
  const statEntries = Object.entries(team.stats || {}).slice(0, 8);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Overview */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">{team.name}</h3>
            <p className="text-sm text-muted-foreground">{team.league}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{team.record}</p>
            <p className="text-xs text-muted-foreground">({(team.winPct * 100).toFixed(1)}%)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Home Record</p>
            <p className="text-base font-bold text-foreground">{team.homeRecord}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Away Record</p>
            <p className="text-base font-bold text-foreground">{team.awayRecord}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Last 10</p>
            <p className="text-base font-bold text-foreground">{team.lastTen}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Streak</p>
            <p className={cn("text-base font-bold", team.streak?.startsWith("W") ? "text-green-400" : "text-red-400")}>
              {team.streak}
            </p>
          </div>
        </div>

        {team.injuries?.length > 0 && (
          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <p className="text-xs font-semibold text-orange-400 mb-1">Injury Report</p>
            {team.injuries.map((inj: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">{inj}</p>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="glass-card p-5">
        <h4 className="font-bold text-foreground mb-3">Statistics</h4>
        <div className="grid grid-cols-2 gap-2">
          {statEntries.map(([key, value]) => (
            <div key={key} className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{key.replace(/_/g, " ").toUpperCase()}</p>
              <p className="text-sm font-bold text-foreground num">
                {typeof value === "number"
                  ? (value > 1 ? value.toFixed(1) : (value * 100).toFixed(1) + "%")
                  : value as string}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Key players */}
      {team.keyPlayers?.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="font-bold text-foreground mb-3">Key Players</h4>
          <div className="space-y-2">
            {team.keyPlayers.map((player: string) => (
              <div key={player} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-sm text-foreground">{player}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonView({ sport }: { sport: string }) {
  const { preferences, updatePreferences } = useUserPreferences();
  const [team1Query, setTeam1Query] = useState("");
  const [team2Query, setTeam2Query] = useState("");
  const [selectedTeam1, setSelectedTeam1] = useState<string | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<string | null>(null);
  const [mode, setMode] = useState<"teams" | "players">("teams");

  // Teams and players are sport-scoped; if the user changes the top-level
  // sport we can't carry stale selections over or the compare request will
  // ask for (e.g.) NBA teams under sport=football and come back empty.
  useEffect(() => {
    setTeam1Query("");
    setTeam2Query("");
    setSelectedTeam1(null);
    setSelectedTeam2(null);
    setMode("teams");
  }, [sport]);

  const { data: teams } = useQuery({
    queryKey: ["/api/analyst/teams", sport],
    queryFn: async () => {
      const res = await fetch(`/api/analyst/teams?sport=${sport}`);
      return res.json();
    },
  });

  const { data: comparison, isLoading } = useQuery({
    // sport must be part of the key so "Boston Celtics vs Dallas Cowboys"
    // under basketball and football aren't served from the same cache entry.
    queryKey: ["/api/analyst/teams/compare", sport, selectedTeam1, selectedTeam2],
    queryFn: async () => {
      if (!selectedTeam1 || !selectedTeam2) return null;
      const res = await fetch("/api/analyst/teams/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team1: selectedTeam1, team2: selectedTeam2, sport }),
      });
      return res.json();
    },
    enabled: !!selectedTeam1 && !!selectedTeam2,
  });

  // Persist successful compares into preferences so the user can jump
  // back to a recent matchup in one click. Dedupe by sport+pair (order-
  // independent) and keep the six most recent.
  useEffect(() => {
    if (!comparison || comparison.error) return;
    if (!selectedTeam1 || !selectedTeam2) return;
    const pairKey = [selectedTeam1, selectedTeam2].map(t => t.toLowerCase()).sort().join("::");
    const current = preferences.analyst?.compareHistory || [];
    const filtered = current.filter(entry => {
      if (!Array.isArray(entry) || entry.length < 3) return true;
      const [s, a, b] = entry;
      const k = [a, b].map(t => t.toLowerCase()).sort().join("::");
      return !(s === sport && k === pairKey);
    });
    const next = [[sport, selectedTeam1, selectedTeam2], ...filtered].slice(0, 6);
    // Only write if the most-recent entry actually changed, otherwise
    // this would trigger a preferences sync on every render.
    if (JSON.stringify(next[0]) === JSON.stringify(current[0])) return;
    updatePreferences({
      analyst: { ...preferences.analyst, compareHistory: next },
    });
  }, [comparison, selectedTeam1, selectedTeam2, sport, preferences.analyst, updatePreferences]);

  const recentForSport = useMemo(() => {
    const history = preferences.analyst?.compareHistory || [];
    return history.filter(e => Array.isArray(e) && e.length >= 3 && e[0] === sport).slice(0, 4);
  }, [preferences.analyst, sport]);

  const filteredTeams1 = (teams || []).filter((t: any) =>
    !team1Query || t.name.toLowerCase().includes(team1Query.toLowerCase())
  );
  const filteredTeams2 = (teams || []).filter((t: any) =>
    !team2Query || t.name.toLowerCase().includes(team2Query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {recentForSport.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent compares</p>
          <div className="scroll-row">
            {recentForSport.map(([, t1, t2], i) => (
              <button
                key={`${t1}-${t2}-${i}`}
                type="button"
                onClick={() => {
                  setSelectedTeam1(t1);
                  setSelectedTeam2(t2);
                  setTeam1Query(t1);
                  setTeam2Query(t2);
                }}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-muted border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                {t1} <span className="text-muted-foreground/60">vs</span> {t2}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Team 1</label>
          <input
            type="text"
            placeholder="Search team..."
            value={selectedTeam1 || team1Query}
            onChange={e => { setTeam1Query(e.target.value); setSelectedTeam1(null); }}
            className="input-field"
          />
          {team1Query && !selectedTeam1 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredTeams1.slice(0, 16).map((t: any) => (
                <button key={t.id}
                  onClick={() => { setSelectedTeam1(t.name); setTeam1Query(t.name); }}
                  className="w-full text-left px-3 py-2 bg-muted/50 hover:bg-muted rounded-xl text-xs text-foreground transition-all">
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Team 2</label>
          <input
            type="text"
            placeholder="Search team..."
            value={selectedTeam2 || team2Query}
            onChange={e => { setTeam2Query(e.target.value); setSelectedTeam2(null); }}
            className="input-field"
          />
          {team2Query && !selectedTeam2 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredTeams2.slice(0, 16).map((t: any) => (
                <button key={t.id}
                  onClick={() => { setSelectedTeam2(t.name); setTeam2Query(t.name); }}
                  className="w-full text-left px-3 py-2 bg-muted/50 hover:bg-muted rounded-xl text-xs text-foreground transition-all">
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Comparing teams...</p>
          </div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      )}

      {comparison && !comparison.error && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm text-muted-foreground">{comparison.prediction || "No prediction available"}</p>

          <div className="space-y-2">
            {comparison.categories?.length > 0 ? comparison.categories.map((cat: any) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className={cn(
                  "text-xs font-bold min-w-[60px] text-right",
                  cat.winner === "team1" ? "text-green-400" : "text-muted-foreground"
                )}>
                  {cat.team1Value != null && cat.team1Value !== "" ? cat.team1Value : "N/A"}
                </span>
                <div className="flex-1">
                  <div className="text-center text-xs text-muted-foreground mb-1">{cat.name}</div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn(
                      "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                      cat.winner === "team1" ? "bg-green-400" : cat.winner === "tie" ? "bg-yellow-400" : "bg-red-400"
                    )} style={{ width: cat.winner === "team1" ? "100%" : cat.winner === "tie" ? "50%" : "0%" }} />
                  </div>
                </div>
                <span className={cn(
                  "text-xs font-bold min-w-[60px]",
                  cat.winner === "team2" ? "text-green-400" : "text-muted-foreground"
                )}>
                  {cat.team2Value != null && cat.team2Value !== "" ? cat.team2Value : "N/A"}
                </span>
              </div>
            )) : (
              <div className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground">No comparison categories available</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <p className="text-xs font-bold text-green-400 mb-1">{selectedTeam1} Advantages</p>
              {comparison.team1Advantages?.length > 0 ? (
                comparison.team1Advantages.map((a: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">&#8226; {a}</p>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No advantages found</p>
              )}
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
              <p className="text-xs font-bold text-primary mb-1">{selectedTeam2} Advantages</p>
              {comparison.team2Advantages?.length > 0 ? (
                comparison.team2Advantages.map((a: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">&#8226; {a}</p>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No advantages found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {comparison?.error && (
        <p className="text-sm text-red-400">{comparison.error}</p>
      )}
    </div>
  );
}

function LeagueLeaders({ sport }: { sport: string }) {
  const { data: leaders } = useQuery({
    queryKey: ["/api/analyst/leaders", sport],
    queryFn: async () => {
      const res = await fetch(`/api/analyst/leaders?sport=${sport}`);
      return res.json();
    },
  });

  return (
    <div className="glass-card p-5">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <Award className="w-4 h-4 text-yellow-400" />
        League Leaders
      </h3>
      <div className="space-y-2.5">
        {(leaders || []).map((leader: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{leader.category}</p>
              <p className="text-sm font-bold text-foreground">{leader.player}</p>
              <p className="text-xs text-muted-foreground">{leader.team}</p>
            </div>
            <span className="text-lg font-bold text-primary num">{leader.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerDetail({ player }: { player: any }) {
  const statEntries = Object.entries(player.stats || {});
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">
              {player.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">{player.name}</h3>
            <p className="text-sm text-muted-foreground">{player.position} · {player.team}</p>
            <div className="flex items-center gap-2 mt-1">
              {player.age && <span className="text-xs text-muted-foreground">Age {player.age}</span>}
              {player.height && <span className="text-xs text-muted-foreground">{player.height}</span>}
              {player.number && <span className="text-xs text-muted-foreground">#{player.number}</span>}
            </div>
          </div>
          <div className="text-right">
            {player.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-lg font-bold text-foreground">{player.rating}</span>
              </div>
            )}
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-bold mt-1 inline-block",
              player.status === "active" ? "text-green-400 bg-green-500/10" :
              player.status === "injured" ? "text-red-400 bg-red-500/10" :
              "text-orange-400 bg-orange-500/10"
            )}>
              {player.status}
            </span>
          </div>
        </div>
        {player.injuryNote && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4">
            <p className="text-xs text-orange-400">{player.injuryNote}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="glass-card p-5">
        <h4 className="font-bold text-foreground mb-3">Statistics</h4>
        <div className="grid grid-cols-2 gap-2">
          {statEntries.map(([key, value]) => (
            <div key={key} className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{key.replace(/_/g, " ").toUpperCase()}</p>
              <p className="text-sm font-bold text-foreground num">
                {typeof value === "number"
                  ? (value > 1 ? value.toFixed(1) : (value * 100).toFixed(1) + "%")
                  : value as string}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent news */}
      {player.news?.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="font-bold text-foreground mb-3">Recent News</h4>
          <div className="space-y-2">
            {player.news.map((item: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">{item}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalystApp() {
  const { preferences } = useUserPreferences();
  const userSports = useMemo(() => getUserAppSports(preferences.favoriteSports), [preferences.favoriteSports]);
  const [selectedSport, setSelectedSport] = useState(userSports[0]?.id || "basketball");
  const [activeTab, setActiveTab] = useState<"teams" | "compare" | "players">("teams");
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    if (!userSports.some(s => s.id === selectedSport)) {
      setSelectedSport(userSports[0]?.id || "basketball");
    }
  }, [userSports, selectedSport]);

  const {
    data: teams,
    isLoading: loadingTeams,
    isError: teamsError,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ["/api/analyst/teams", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/analyst/teams?sport=${selectedSport}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load teams");
      return data;
    },
    staleTime: 120_000,
  });

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["/api/analyst/players/search", debouncedSearch, selectedSport],
    queryFn: async () => {
      const url = `/api/analyst/players/search?q=${encodeURIComponent(debouncedSearch)}&sport=${selectedSport}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      return data;
    },
    enabled: activeTab === "players",
    staleTime: 60_000,
  });


  const filteredTeams = useMemo(() => {
    return teams?.filter((t: any) =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);

  const chartData = useMemo(() => {
    if (!teams || teams.length === 0) return [];
    return teams.slice(0, 6).map((t: any) => ({
      name: t.abbreviation || t.name.split(" ").slice(-1)[0],
      For: t.pointsPerGame,
      Against: t.pointsAllowed,
    }));
  }, [teams]);

  const handleSelectTeam = useCallback((team: any) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTeam(null);
    setSelectedPlayer(null);
  }, []);

  const handleTabChange = useCallback((key: typeof activeTab) => {
    setActiveTab(key);
    setSelectedTeam(null);
    setSelectedPlayer(null);
  }, []);

  const handleSportChange = useCallback((sportId: import("@shared/schema").SportId) => {
    setSelectedSport(sportId);
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setSearchQuery("");
  }, []);

  return (
    <div className="animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/apps">
          <a className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </a>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">The Analyst</span>
          </h1>
          <p className="text-sm text-muted-foreground">ESPN team universe · leader search · side‑by‑side compare</p>
        </div>
      </div>

      {/* Sport selector */}
      <div className="tab-bar mb-5">
        {userSports.map((s) => (
          <button key={s.id} className={cn("tab-item", selectedSport === s.id && "active")}
            onClick={() => handleSportChange(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Section tabs */}
          <div className="scroll-row">
            {[
              { key: "teams", label: "Teams", Icon: Trophy },
              { key: "compare", label: "Compare", Icon: ArrowLeftRight },
              { key: "players", label: "Players", Icon: Users },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key as typeof activeTab)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                  activeTab === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {(activeTab === "teams" || activeTab === "players") && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={activeTab === "teams" ? "Filter teams…" : "Try: Jokic, Chiefs, Haaland…"}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          )}

          {activeTab === "teams" && teamsError && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-xs text-destructive">
              <span>Teams didn&apos;t load.</span>
              <button type="button" className="font-semibold underline" onClick={() => refetchTeams()}>
                Retry
              </button>
            </div>
          )}

          {/* Teams list */}
          {activeTab === "teams" && (
            loadingTeams ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-12 rounded-xl" />
                      <Skeleton className="h-12 rounded-xl" />
                      <Skeleton className="h-12 rounded-xl" />
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <Skeleton key={j} className="w-5 h-5 rounded" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(filteredTeams || []).map((team: any) => (
                  <MemoizedTeamCard
                    key={team.id}
                    team={team}
                    onClick={() => handleSelectTeam(team)}
                    isSelected={selectedTeam?.id === team.id}
                  />
                ))}
              </div>
            )
          )}

          {/* Players list */}
          {activeTab === "players" && (
            <div className="space-y-2">
              {(players || []).map((player: any) => (
                <button
                  key={player.id}
                  onClick={() => { setSelectedPlayer(player); setSelectedTeam(null); }}
                  className={cn("w-full text-left glass-card p-4 hover:border-primary/30 transition-all",
                    selectedPlayer?.id === player.id && "border-primary/50 bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.position} · {player.team}</p>
                    </div>
                    {player.age && (
                      <span className="text-xs text-muted-foreground">Age {player.age}</span>
                    )}
                  </div>
                  {player.status !== "active" && (
                    <span className="text-xs text-orange-400 mt-1 block">{player.status}</span>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(player.stats || {}).slice(0, 4).map(([key, value]) => (
                      <span key={key} className="px-2 py-0.5 bg-muted/50 rounded text-xs text-muted-foreground">
                        <span className="font-bold text-foreground num">
                          {value != null
                            ? (typeof value === "number" ? (value > 1 ? value.toFixed(1) : (value * 100).toFixed(1) + "%") : String(value))
                            : "\u2014"}
                        </span> {key.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {(!players || players.length === 0) && !loadingPlayers && debouncedSearch.trim().length > 0 && (
                <div className="glass-card p-6 text-center space-y-1">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No players match &ldquo;{debouncedSearch}&rdquo;</p>
                  <p className="text-xs text-muted-foreground/80">Try another spelling or switch league above.</p>
                </div>
              )}
              {loadingPlayers && (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <div className="flex gap-1.5">
                        <Skeleton className="h-5 w-16 rounded" />
                        <Skeleton className="h-5 w-16 rounded" />
                        <Skeleton className="h-5 w-16 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compare */}
          {activeTab === "compare" && (
            <ComparisonView sport={selectedSport} />
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div>
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to list
              </button>
              <TeamDetail team={selectedTeam} />
            </div>
          ) : selectedPlayer ? (
            <div>
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to list
              </button>
              <PlayerDetail player={selectedPlayer} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Teams", value: teams?.length || 0, icon: Trophy, color: "text-primary" },
                  { label: "League", value: APP_SPORTS.find(s => s.id === selectedSport)?.label || "—", icon: Users, color: "text-green-400" },
                  { label: "Stat Categories", value: "Multi", icon: BarChart3, color: "text-purple-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="glass-card p-4 text-center">
                    <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} />
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* Teams overview bar chart */}
              {chartData.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="font-bold text-foreground mb-4">
                    {selectedSport === "soccer" ? "Goals vs. conceded (top clubs)" : "Offense vs. defense snapshot"}
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#888" }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ background: "hsl(222 25% 12%)", border: "1px solid hsl(217 32% 20%)", borderRadius: "12px" }}
                        labelStyle={{ color: "#fff", fontWeight: "bold" }}
                      />
                      <Legend />
                      <Bar dataKey="For" fill="hsl(221 83% 62%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Against" fill="hsl(0 72% 51% / 0.6)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="glass-card p-6 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-foreground mb-1">Select a Team or Player</h3>
                <p className="text-sm text-muted-foreground">Click any team or player on the left to see full stats, records, and analysis. Use Compare to match two teams head-to-head.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
