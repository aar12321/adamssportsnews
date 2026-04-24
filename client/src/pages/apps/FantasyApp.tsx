import React, { useState, useMemo, useEffect, useCallback } from "react";
import { APP_SPORTS, getUserAppSports } from "@shared/appSports";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Trophy, ChevronLeft, Search, AlertCircle, TrendingUp, TrendingDown,
  Users, Activity, Star, ArrowLeftRight, Target, RefreshCw, Minus,
  Plus, X, UserPlus, UserMinus, ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  SLOT_ELIGIBILITY,
  assignFantasyLineup,
  canFitFantasyRoster as canFitRoster,
  fantasyPositionCapacity as positionCapacity,
  isFantasySportKey as isSportKey,
  normalizeFantasyPosition as normalizePosition,
  slotAcceptsPosition as slotAccepts,
  validateRosterAddition,
  type FantasySportKey as SportKey,
} from "@shared/fantasyRules";

type AddResult = { ok: true } | { ok: false; reason: string };

// Stores rosters as a nested map: { [sport]: player[] } keyed by user.
// `userId` must be a real authenticated id; pass "" to disable persistence.
function useLocalRoster(userId: string, sport: string) {
  const storageKey = userId ? `fantasy_rosters_v2_${userId}` : "";

  const readAll = useCallback((): Record<string, any[]> => {
    if (!storageKey) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }, [storageKey]);

  const [allRosters, setAllRosters] = useState<Record<string, any[]>>(() => readAll());
  const [lastError, setLastError] = useState<string | null>(null);

  // Re-read when user changes
  useEffect(() => {
    setAllRosters(readAll());
  }, [readAll]);

  // Persist whenever allRosters changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(allRosters));
    } catch (err) {
      // Quota or disabled storage — surface so the UI can react
      setLastError("Could not save roster to browser storage");
    }
  }, [allRosters, storageKey]);

  // Re-validate the loaded roster when sport changes. If a previously-stored
  // roster can't fit the current lineup (e.g. schema changed, or someone
  // tampered with localStorage) we surface a warning instead of silently
  // letting the user operate on an invalid roster.
  useEffect(() => {
    if (!isSportKey(sport)) return;
    const current = allRosters[sport] || [];
    if (current.length === 0) return;
    // Any player whose sport is wrong, or any unknown position
    const wrongSport = current.find((p: any) => p.sport && p.sport !== sport);
    if (wrongSport) {
      setLastError(`Stored roster contains a ${wrongSport.sport} player — use "Reset roster" to fix`);
      return;
    }
    if (!canFitRoster(current, sport)) {
      setLastError("Stored roster doesn't fit the current lineup — use \"Reset roster\" to fix");
    }
  }, [sport, allRosters]);

  const roster = allRosters[sport] || [];

  const checkCanAdd = useCallback((player: any): AddResult => {
    if (!userId) return { ok: false, reason: "Sign in to build a roster" };
    if (!isSportKey(sport)) return { ok: false, reason: `Unknown sport: ${sport}` };
    const current = allRosters[sport] || [];
    return validateRosterAddition(current, player, sport);
  }, [allRosters, sport, userId]);

  const addPlayer = useCallback((player: any): AddResult => {
    const result = checkCanAdd(player);
    if (!result.ok) {
      setLastError(result.reason);
      return result;
    }
    setLastError(null);
    setAllRosters(prev => {
      const current = prev[sport] || [];
      return { ...prev, [sport]: [...current, player] };
    });
    return { ok: true };
  }, [sport, checkCanAdd]);

  const removePlayer = useCallback((playerId: string) => {
    setLastError(null);
    setAllRosters(prev => {
      const current = prev[sport] || [];
      return { ...prev, [sport]: current.filter(p => p.id !== playerId) };
    });
  }, [sport]);

  const resetSportRoster = useCallback(() => {
    setLastError(null);
    setAllRosters(prev => ({ ...prev, [sport]: [] }));
  }, [sport]);

  const isOnRoster = useCallback((playerId: string) => {
    return roster.some(p => p.id === playerId);
  }, [roster]);

  const clearError = useCallback(() => setLastError(null), []);

  return {
    roster,
    addPlayer,
    removePlayer,
    resetSportRoster,
    isOnRoster,
    checkCanAdd,
    lastError,
    clearError,
  };
}

// Sport-specific roster positions and configurations
const SPORT_CONFIG: Record<string, {
  positions: string[];
  statCategories: { key: string; label: string }[];
  description: string;
  scoringFormat: string;
}> = {
  basketball: {
    positions: ["PG", "SG", "SF", "PF", "C", "G", "F", "UTIL", "BN"],
    statCategories: [
      { key: "PTS", label: "Points" },
      { key: "REB", label: "Rebounds" },
      { key: "AST", label: "Assists" },
      { key: "STL", label: "Steals" },
      { key: "BLK", label: "Blocks" },
      { key: "FG%", label: "FG%" },
      { key: "FT%", label: "FT%" },
      { key: "3PM", label: "3PM" },
    ],
    description: "Head-to-head · 9-category NBA league",
    scoringFormat: "9-Cat",
  },
  football: {
    positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN"],
    statCategories: [
      { key: "PaYd", label: "Pass Yds" },
      { key: "PaTD", label: "Pass TD" },
      { key: "RuYd", label: "Rush Yds" },
      { key: "RuTD", label: "Rush TD" },
      { key: "Rec", label: "Receptions" },
      { key: "ReYd", label: "Rec Yds" },
      { key: "ReTD", label: "Rec TD" },
      { key: "INT", label: "INT" },
    ],
    description: "Standard PPR · Weekly head-to-head",
    scoringFormat: "PPR",
  },
  soccer: {
    positions: ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "BN"],
    statCategories: [
      { key: "G", label: "Goals" },
      { key: "A", label: "Assists" },
      { key: "CS", label: "Clean Sheets" },
      { key: "YC", label: "Yellow Cards" },
      { key: "RC", label: "Red Cards" },
      { key: "Min", label: "Minutes" },
    ],
    description: "FPL-style · Gameweek scoring",
    scoringFormat: "FPL",
  },
  baseball: {
    positions: ["C", "1B", "2B", "3B", "SS", "OF", "OF", "OF", "SP", "RP", "BN"],
    statCategories: [
      { key: "AVG", label: "Batting Avg" },
      { key: "HR", label: "Home Runs" },
      { key: "RBI", label: "RBI" },
      { key: "R", label: "Runs" },
      { key: "SB", label: "Stolen Bases" },
      { key: "ERA", label: "ERA" },
      { key: "WHIP", label: "WHIP" },
      { key: "K", label: "Strikeouts" },
    ],
    description: "Rotisserie · Season-long",
    scoringFormat: "Roto",
  },
  hockey: {
    positions: ["C", "C", "LW", "LW", "RW", "RW", "D", "D", "G", "BN"],
    statCategories: [
      { key: "G", label: "Goals" },
      { key: "A", label: "Assists" },
      { key: "P", label: "Points" },
      { key: "+/-", label: "Plus/Minus" },
      { key: "PPP", label: "PP Points" },
      { key: "SOG", label: "Shots" },
      { key: "W", label: "Wins (G)" },
      { key: "SV%", label: "Save %" },
    ],
    description: "Head-to-head · Multi-category",
    scoringFormat: "H2H",
  },
};

const STATUS_CONFIG = {
  active: { label: "Active", className: "text-green-400 bg-green-500/10" },
  injured: { label: "Injured", className: "text-red-400 bg-red-500/10" },
  doubtful: { label: "Doubtful", className: "text-orange-400 bg-orange-500/10" },
  out: { label: "Out", className: "text-red-500 bg-red-500/15 font-bold" },
  questionable: { label: "Quest.", className: "text-yellow-400 bg-yellow-500/10" },
};

const MemoizedPlayerCard = React.memo(PlayerCard);

function PlayerCard({ player, compact = false, onAdd, onRemove, isOnRoster, onSelect }: {
  player: any; compact?: boolean; onAdd?: (p: any) => void; onRemove?: (id: string) => void; isOnRoster?: boolean; onSelect?: (p: any) => void;
}) {
  const statusConfig = STATUS_CONFIG[player.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
  const trendIcon = player.trending === "up" ? TrendingUp : player.trending === "down" ? TrendingDown : Minus;
  const trendColor = player.trending === "up" ? "text-green-400" : player.trending === "down" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 glass-card hover:border-primary/30 transition-all cursor-pointer" onClick={() => onSelect?.(player)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{player.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{player.name}</p>
            <p className="text-xs text-muted-foreground">{player.position} · {player.team.split(" ").slice(-1)[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", statusConfig.className)}>
            {statusConfig.label}
          </span>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground num">{player.projectedPoints != null ? player.projectedPoints.toFixed(1) : "—"}</p>
            <p className="text-xs text-muted-foreground">proj</p>
          </div>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(player.id); }}
              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"
              title="Drop player"
            >
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 hover:border-primary/30 transition-all animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{player.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
          </div>
          <div>
            <p className="font-bold text-foreground">{player.name}</p>
            <p className="text-xs text-muted-foreground">{player.position} · {player.team}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", statusConfig.className)}>
            {statusConfig.label}
          </span>
          <div className="flex items-center gap-1">
            <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
            <span className={cn("text-xs font-medium", trendColor)}>
              {player.trending || "stable"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-muted/50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Season Avg</p>
          <p className="text-base font-bold text-foreground num">{player.averagePoints != null ? player.averagePoints.toFixed(1) : "—"}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Projected</p>
          <p className="text-base font-bold text-primary num">{player.projectedPoints != null ? player.projectedPoints.toFixed(1) : "—"}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Last Week</p>
          <p className="text-base font-bold text-foreground num">{player.weeklyPoints != null ? player.weeklyPoints.toFixed(1) : "—"}</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(player.stats || {}).slice(0, 5).map(([key, value]) => (
          <span key={key} className="px-2 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <span className="font-bold text-foreground num">{value != null ? (typeof value === "number" ? value.toFixed(1) : value as string) : "—"}</span> {key.replace("_", "/")}
          </span>
        ))}
      </div>

      {/* Injury note */}
      {player.injuryNote && (
        <div className="flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          <p className="text-xs text-orange-400">{player.injuryNote}</p>
        </div>
      )}

      {/* Recent news */}
      {player.recentNews?.length > 0 && (
        <div className="space-y-1.5">
          {player.recentNews.slice(0, 2).map((news: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-2">
              {news}
            </p>
          ))}
        </div>
      )}

      {/* Add/Remove from roster */}
      {onAdd && !isOnRoster && (
        <button
          onClick={() => onAdd(player)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all border border-primary/20"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add to My Roster
        </button>
      )}
      {isOnRoster && onRemove && (
        <button
          onClick={() => onRemove(player.id)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all border border-red-500/20"
        >
          <UserMinus className="w-3.5 h-3.5" />
          Drop from Roster
        </button>
      )}
    </div>
  );
}

function TradeAnalyzer({ sportKey }: { sportKey: string }) {
  const [givingIds, setGivingIds] = useState<string[]>([]);
  const [receivingIds, setReceivingIds] = useState<string[]>([]);
  const [step, setStep] = useState<"giving" | "receiving" | "result">("giving");

  const { data: players } = useQuery({
    queryKey: ["/api/fantasy/players", sportKey],
    queryFn: async () => {
      const res = await fetch(`/api/fantasy/players?sport=${encodeURIComponent(sportKey)}`);
      return res.json();
    },
  });

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/fantasy/trade/analyze", givingIds.join(","), receivingIds.join(",")],
    queryFn: async () => {
      const res = await fetch("/api/fantasy/trade/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giving: givingIds, receiving: receivingIds }),
      });
      return res.json();
    },
    enabled: step === "result" && givingIds.length > 0 && receivingIds.length > 0,
  });

  const togglePlayer = (id: string, side: "giving" | "receiving") => {
    if (side === "giving") {
      setGivingIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setReceivingIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
  };

  // Tell the user when a sport switch wiped an in-progress trade, so the
  // reset doesn't feel like the app lost their work silently. Player IDs
  // are sport-scoped so the wipe itself is necessary.
  const [resetNotice, setResetNotice] = useState(false);
  useEffect(() => {
    if (givingIds.length > 0 || receivingIds.length > 0) {
      setResetNotice(true);
    }
    setGivingIds([]);
    setReceivingIds([]);
    setStep("giving");
    // Depend only on sportKey — we intentionally don't want to re-run
    // this effect as the user builds their trade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportKey]);
  useEffect(() => {
    if (!resetNotice) return;
    const t = setTimeout(() => setResetNotice(false), 4000);
    return () => clearTimeout(t);
  }, [resetNotice]);

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-purple-400" />
        Trade Analyzer
      </h3>

      {resetNotice && (
        <div className="flex items-start gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Switched sport — previous trade selections were cleared.</span>
        </div>
      )}

      {step !== "result" ? (
        <>
          <div className="tab-bar">
            <button className={cn("tab-item", step === "giving" && "active")} onClick={() => setStep("giving")}>
              Giving ({givingIds.length})
            </button>
            <button className={cn("tab-item", step === "receiving" && "active")} onClick={() => setStep("receiving")}>
              Receiving ({receivingIds.length})
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(players || []).slice(0, 24).map((p: any) => {
              const currentIds = step === "giving" ? givingIds : receivingIds;
              const isSelected = currentIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id, step)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                    isSelected ? "bg-primary/15 border-primary/40" : "bg-muted/30 border-transparent hover:border-primary/30"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.position} · {p.team.split(" ").slice(-1)[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground num">{p.averagePoints != null ? p.averagePoints.toFixed(1) : "\u2014"}</p>
                    <p className="text-xs text-muted-foreground">avg/wk</p>
                  </div>
                </button>
              );
            })}
          </div>

          {givingIds.length > 0 && receivingIds.length > 0 && (
            <button onClick={() => setStep("result")} className="btn-primary w-full">
              Analyze Trade
            </button>
          )}
        </>
      ) : (
        <>
          {isLoading ? (
            <div className="text-center py-6">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
            </div>
          ) : analysis ? (
            <div className="space-y-3">
              <div className={cn(
                "p-4 rounded-xl border text-center",
                analysis.recommendation === "accept" ? "bg-green-500/10 border-green-500/20" :
                analysis.recommendation === "decline" ? "bg-red-500/10 border-red-500/20" :
                "bg-yellow-500/10 border-yellow-500/20"
              )}>
                <p className={cn("text-lg font-bold",
                  analysis.recommendation === "accept" ? "text-green-400" :
                  analysis.recommendation === "decline" ? "text-red-400" :
                  "text-yellow-400"
                )}>
                  {analysis.recommendation === "accept" ? "✓ Accept Trade" :
                   analysis.recommendation === "decline" ? "✗ Decline Trade" :
                   "~ Neutral Trade"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.valueDifference > 0 ? "+" : ""}{analysis.valueDifference.toFixed(1)} pts/wk net gain
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.analysis}</p>
              {analysis.factors?.map((f: string, i: number) => (
                <p key={i} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">{f}</p>
              ))}
              <button onClick={() => { setStep("giving"); setGivingIds([]); setReceivingIds([]); }} className="btn-ghost w-full">
                New Analysis
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function FantasyApp() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  // Do not fall back to a shared "default" user — unauthenticated users must
  // not share a single global roster, so we pass "" to disable persistence.
  const userId = user?.id || "";
  const userSports = useMemo(() => getUserAppSports(preferences.favoriteSports), [preferences.favoriteSports]);
  const [selectedSport, setSelectedSport] = useState(userSports[0]?.id || "basketball");
  const [activeTab, setActiveTab] = useState<"roster" | "players" | "waiver" | "injuries" | "trade">("roster");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const {
    roster, addPlayer, removePlayer, resetSportRoster,
    isOnRoster, checkCanAdd, lastError, clearError,
  } = useLocalRoster(userId, selectedSport);

  // Max roster size is the number of slots in the sport's lineup.
  // Every sport we render is guaranteed to have a config entry.
  const rosterMaxSize = useMemo(() => {
    return SPORT_CONFIG[selectedSport]?.positions.length ?? 0;
  }, [selectedSport]);

  // Errors stick until the user dismisses them. We tried auto-clearing
  // after 4 seconds and lost half the failed-add messages — users were
  // mid-scroll when the banner faded out and missed the "duplicate
  // player" feedback. The banner already has its own X button, so the
  // user is in control of when it goes away.

  useEffect(() => {
    if (!userSports.some(s => s.id === selectedSport)) {
      setSelectedSport(userSports[0]?.id || "basketball");
    }
  }, [userSports, selectedSport]);

  // When the user changes sports, drop any stale roster error from the
  // previous sport — the message only made sense in that context.
  useEffect(() => {
    clearError();
  }, [selectedSport, clearError]);

  const { data: team } = useQuery({
    queryKey: ["/api/fantasy/team/sample", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/fantasy/team/sample?sport=${selectedSport}`);
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const { data: topPlayers, isLoading: loadingPlayers } = useQuery({
    queryKey: ["/api/fantasy/players/top", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/fantasy/players/top?sport=${selectedSport}&limit=20`);
      return res.json();
    },
    staleTime: 120_000,
  });

  const { data: waiverTargets } = useQuery({
    queryKey: ["/api/fantasy/waiver", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/fantasy/waiver?sport=${selectedSport}`);
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const { data: injuredPlayers } = useQuery({
    queryKey: ["/api/fantasy/injured", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/fantasy/injured?sport=${selectedSport}`);
      return res.json();
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["/api/fantasy/players/search", debouncedSearch, selectedSport],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      const res = await fetch(`/api/fantasy/players/search?q=${encodeURIComponent(debouncedSearch)}&sport=${selectedSport}`);
      return res.json();
    },
    enabled: debouncedSearch.trim().length > 1,
    staleTime: 60_000,
  });

  const displayPlayers = useMemo(() => {
    return debouncedSearch.trim().length > 1 ? (searchResults || []) : (topPlayers || []);
  }, [debouncedSearch, searchResults, topPlayers]);

  const sortedTopProjections = useMemo(() => {
    return (topPlayers || []).slice(0, 5);
  }, [topPlayers]);

  const rosterFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.team && p.team.toLowerCase().includes(q)) ||
        (p.position && p.position.toLowerCase().includes(q))
    );
  }, [roster, searchQuery]);

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/apps">
          <a className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </a>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">Fantasy Teams</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {SPORT_CONFIG[selectedSport]?.description || "Build a team, track players, analyze trades"}
          </p>
        </div>
      </div>

      {/* Sport selector */}
      <div className="tab-bar mb-5">
        {userSports.map((s) => (
          <button key={s.id} className={cn("tab-item", selectedSport === s.id && "active")}
            onClick={() => setSelectedSport(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* My Team summary */}
      {roster.length > 0 && (
        <div className="glass-card p-4 mb-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-foreground">My Fantasy Team</p>
              <p className="text-xs text-muted-foreground">{roster.length} players · {APP_SPORTS.find(s => s.id === selectedSport)?.label}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Roster</p>
                <p className="text-sm font-bold text-foreground">{roster.length}/{rosterMaxSize}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Proj</p>
                <p className="text-sm font-bold text-primary num">
                  {roster.reduce((s: number, p: any) => s + (p.projectedPoints || 0), 0).toFixed(1)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Avg Pts</p>
                <p className="text-sm font-bold text-green-400 num">
                  {roster.length > 0
                    ? (roster.reduce((s: number, p: any) => s + (p.averagePoints || 0), 0) / roster.length).toFixed(1)
                    : "0.0"}
                </p>
              </div>
            </div>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full"
              style={{ width: `${(roster.length / rosterMaxSize) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {roster.length} of {rosterMaxSize} roster slots filled
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab nav */}
          <div className="scroll-row">
            {[
              { key: "roster", label: `My Roster (${roster.length}/${rosterMaxSize})`, Icon: Trophy },
              { key: "players", label: "Players", Icon: Users },
              { key: "waiver", label: "Waiver Wire", Icon: Target },
              { key: "injuries", label: "Injuries", Icon: AlertCircle },
              { key: "trade", label: "Trade", Icon: ArrowLeftRight },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
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

          {/* Add error banner */}
          {lastError && (
            <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl animate-fade-in">
              <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-xs text-orange-400 flex-1">{lastError}</p>
              <button onClick={clearError} className="text-xs text-orange-400/70 hover:text-orange-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search */}
          {(activeTab === "players" || activeTab === "roster") && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          )}

          {/* Roster */}
          {activeTab === "roster" && (
            <div className="space-y-3">
              {!userId && (
                <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
                  <p className="text-sm text-yellow-300 font-medium">Sign in to build a roster</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rosters are saved per user. Without an account, changes can't be
                    persisted.
                  </p>
                </div>
              )}
              {/* Sport-specific lineup/positions display */}
              {roster.length > 0 && isSportKey(selectedSport) && SPORT_CONFIG[selectedSport] && (() => {
                const sport = selectedSport as SportKey;
                const config = SPORT_CONFIG[sport];
                const slots = config.positions;

                // Projection-optimal assignment: highest-projected player wins
                // their specific slot first, then flex, then wildcard. Players
                // that don't fit any starter slot fall to BN.
                const lineup = assignFantasyLineup(roster as any[], sport);
                const assignments: (any | null)[] = slots.map(() => null);
                const seen = new Set<number>();
                if (lineup) {
                  const { starters, bench, unfit } = lineup;
                  // Place starters into the first matching non-bench slot.
                  starters.forEach(({ player, slot }) => {
                    const idx = slots.findIndex((s, i) => s === slot && !seen.has(i));
                    if (idx >= 0) { assignments[idx] = player; seen.add(idx); }
                  });
                  // Fill BN/IR slots with overflow bench players in projection order.
                  const wildcard = slots
                    .map((s, i) => ({ s, i }))
                    .filter(({ s, i }) => (s === "BN" || s === "IR") && !seen.has(i));
                  [...bench, ...unfit].forEach((p) => {
                    const next = wildcard.find(({ i }) => !seen.has(i));
                    if (next) { assignments[next.i] = p; seen.add(next.i); }
                  });
                }

                const placedCount = assignments.filter((a) => a != null).length;
                const starterTotal = (lineup?.starters || []).reduce((s, { player }) =>
                  s + (Number((player as any).projectedPoints) || 0), 0);

                return (
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Lineup</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {config.scoringFormat} · {placedCount}/{slots.length} filled · <span className="text-primary font-semibold num">{starterTotal.toFixed(1)} proj</span>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Reset your ${sport} roster? This cannot be undone.`)) {
                            resetSportRoster();
                          }
                        }}
                        className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      >
                        Reset roster
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {slots.map((pos, i) => {
                        const assigned = assignments[i];
                        const isBench = pos === "BN" || pos === "IR";
                        return (
                          <div
                            key={`${pos}-${i}`}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg border",
                              assigned
                                ? isBench
                                  ? "bg-muted/30 border-border"
                                  : "bg-primary/10 border-primary/30"
                                : "bg-muted/20 border-dashed border-border"
                            )}
                          >
                            <span className={cn(
                              "text-xs font-bold w-10 flex-shrink-0",
                              isBench ? "text-muted-foreground/70" : "text-muted-foreground"
                            )}>{pos}</span>
                            {assigned ? (
                              <>
                                <span className={cn(
                                  "text-sm font-medium flex-1 truncate",
                                  isBench ? "text-muted-foreground" : "text-foreground"
                                )}>{assigned.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0 num">
                                  {assigned.projectedPoints != null ? `${Number(assigned.projectedPoints).toFixed(1)} proj` : normalizePosition(assigned.position, selectedSport) || assigned.position}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">empty slot</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Stat categories */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Scoring Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {config.statCategories.map(({ key, label }) => (
                          <span key={key} className="px-2 py-0.5 bg-muted/50 rounded text-xs text-muted-foreground">
                            <span className="font-bold text-foreground">{key}</span> {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {rosterFiltered.map((p: any) => (
                <MemoizedPlayerCard key={p.id} player={p} compact onRemove={removePlayer} onSelect={setSelectedPlayer} />
              ))}
              {rosterFiltered.length === 0 && roster.length > 0 && (
                <div className="glass-card p-6 text-center">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No players match your search</p>
                </div>
              )}
              {roster.length === 0 && (
                <div className="glass-card p-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">
                      Build Your {APP_SPORTS.find(s => s.id === selectedSport)?.label} Team
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your roster is empty. Each sport has its own roster — {SPORT_CONFIG[selectedSport]?.description || "build a team"}.
                      Head to the <button onClick={() => setActiveTab("players")} className="text-primary font-semibold hover:underline">Players</button> tab
                      to draft players, or check the <button onClick={() => setActiveTab("waiver")} className="text-primary font-semibold hover:underline">Waiver Wire</button> for top pickups.
                    </p>
                  </div>
                  {/* Show positions needed */}
                  {SPORT_CONFIG[selectedSport] && (
                    <div className="flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
                      {SPORT_CONFIG[selectedSport].positions.map((pos, i) => (
                        <span key={`${pos}-${i}`} className="px-2 py-0.5 bg-muted/30 border border-dashed border-border rounded text-xs text-muted-foreground">
                          {pos}
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setActiveTab("players")} className="btn-primary mx-auto">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Browse Players
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Players */}
          {activeTab === "players" && (
            loadingPlayers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-2xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-14 rounded-xl" />
                      <Skeleton className="h-14 rounded-xl" />
                      <Skeleton className="h-14 rounded-xl" />
                    </div>
                    <div className="flex gap-1.5">
                      <Skeleton className="h-6 w-16 rounded-lg" />
                      <Skeleton className="h-6 w-16 rounded-lg" />
                      <Skeleton className="h-6 w-16 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayPlayers.map((p: any, i: number) => (
                  <div key={p.id} className={cn("animate-fade-in", `stagger-${Math.min(i+1, 4)}`)}>
                    <MemoizedPlayerCard player={p} onAdd={addPlayer} onRemove={removePlayer} isOnRoster={isOnRoster(p.id)} onSelect={setSelectedPlayer} />
                  </div>
                ))}
              </div>
            )
          )}

          {/* Waiver wire */}
          {activeTab === "waiver" && (
            <div className="space-y-3">
              {!waiverTargets && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(waiverTargets || []).map((target: any, i: number) => (
                <div key={i} className={cn(
                  "glass-card p-4 border-l-4",
                  target.priority === "high" ? "border-l-green-400" :
                  target.priority === "medium" ? "border-l-yellow-400" :
                  "border-l-muted-foreground"
                )}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{target.player.name}</p>
                      <p className="text-xs text-muted-foreground">{target.player.position} · {target.player.team}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-xs font-bold",
                      target.priority === "high" ? "bg-green-500/15 text-green-400" :
                      target.priority === "medium" ? "bg-yellow-500/15 text-yellow-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {target.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{target.reason}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {target.player.ownership ? `${target.player.ownership}% owned` : "Low ownership"}
                    </span>
                    <div className="flex items-center gap-2">
                      {target.player.trending === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-400" />}
                      <span className="text-xs font-bold text-foreground num">
                        {target.player.projectedPoints != null ? target.player.projectedPoints.toFixed(1) : "\u2014"} pts
                      </span>
                    </div>
                  </div>
                  {!isOnRoster(target.player.id) ? (
                    <button
                      onClick={() => addPlayer(target.player)}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all border border-green-500/20"
                    >
                      <Plus className="w-3 h-3" /> Add to Roster
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-primary font-medium text-center">Already on roster</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Injuries */}
          {activeTab === "injuries" && (
            <div className="space-y-2">
              {!injuredPlayers && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-5 w-14 rounded" />
                          </div>
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-10 ml-auto" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(injuredPlayers || []).map((p: any) => (
                <div key={p.id} className={cn(
                  "glass-card p-4 border-l-4",
                  p.status === "out" ? "border-l-red-400" :
                  p.status === "injured" ? "border-l-red-400" :
                  p.status === "doubtful" ? "border-l-orange-400" :
                  "border-l-yellow-400"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.className
                        )}>
                          {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.position} · {p.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-muted-foreground num">{p.projectedPoints != null ? p.projectedPoints.toFixed(1) : "\u2014"}</p>
                      <p className="text-xs text-muted-foreground">proj pts</p>
                    </div>
                  </div>
                  {p.injuryNote && (
                    <p className="text-xs text-orange-400 mt-2 border-l-2 border-orange-400/30 pl-2">{p.injuryNote}</p>
                  )}
                  {p.recentNews?.[0] && (
                    <p className="text-xs text-muted-foreground mt-1">{p.recentNews[0]}</p>
                  )}
                </div>
              ))}
              {(!injuredPlayers || injuredPlayers.length === 0) && (
                <div className="glass-card p-6 text-center">
                  <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-400 font-medium">No major injuries</p>
                </div>
              )}
            </div>
          )}

          {/* Trade tab */}
          {activeTab === "trade" && (
            <TradeAnalyzer sportKey={selectedSport} />
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Player detail panel */}
          {selectedPlayer && (
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">Player Detail</h3>
                <button onClick={() => setSelectedPlayer(null)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{selectedPlayer.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{selectedPlayer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPlayer.position} · {selectedPlayer.team}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Avg</p>
                  <p className="text-lg font-bold text-foreground num">{selectedPlayer.averagePoints?.toFixed(1) || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Projected</p>
                  <p className="text-lg font-bold text-primary num">{selectedPlayer.projectedPoints?.toFixed(1) || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Season</p>
                  <p className="text-lg font-bold text-foreground num">{selectedPlayer.seasonPoints?.toFixed(0) || "—"}</p>
                </div>
              </div>
              {/* All stats */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Stats</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(selectedPlayer.stats || {}).map(([key, value]) => (
                    <span key={key} className="px-2 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                      <span className="font-bold text-foreground num">{value != null ? (typeof value === "number" ? value.toFixed(1) : value as string) : "—"}</span> {key.replace("_", "/")}
                    </span>
                  ))}
                </div>
              </div>
              {selectedPlayer.injuryNote && (
                <div className="flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                  <p className="text-xs text-orange-400">{selectedPlayer.injuryNote}</p>
                </div>
              )}
              {!isOnRoster(selectedPlayer.id) ? (
                <button onClick={() => addPlayer(selectedPlayer)} className="btn-primary w-full">
                  <UserPlus className="w-4 h-4 mr-1.5" /> Add to Roster
                </button>
              ) : (
                <button onClick={() => removePlayer(selectedPlayer.id)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all border border-red-500/20">
                  <UserMinus className="w-4 h-4" /> Drop from Roster
                </button>
              )}
            </div>
          )}

          {activeTab !== "trade" && <TradeAnalyzer sportKey={selectedSport} />}

          {/* Projections summary */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-400" />
              Top Projections
            </h3>
            <div className="space-y-2">
              {(topPlayers || []).slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.position}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.trending === "up" && <TrendingUp className="w-3 h-3 text-green-400" />}
                    <span className="text-sm font-bold text-primary num">{p.projectedPoints != null ? p.projectedPoints.toFixed(1) : "\u2014"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
