import React, { useState, useMemo, useEffect, useCallback } from "react";
import { APP_SPORTS, getUserAppSports } from "@shared/appSports";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, ChevronLeft, Search, AlertCircle, TrendingUp, TrendingDown,
  Users, Activity, Star, ArrowLeftRight, Target, RefreshCw, Minus,
  Plus, X, UserPlus, UserMinus, ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, fetchJson } from "@/lib/queryClient";
import {
  SLOT_ELIGIBILITY,
  canFitFantasyRoster as canFitRoster,
  fantasyPositionCapacity as positionCapacity,
  isFantasySportKey as isSportKey,
  normalizeFantasyPosition as normalizePosition,
  slotAcceptsPosition as slotAccepts,
  validateRosterAddition,
  type FantasySportKey as SportKey,
} from "@shared/fantasyRules";

type AddResult = { ok: true } | { ok: false; reason: string };

// Server-backed roster hook. Rosters live in the database (via repo layer)
// and are fetched per-sport; localStorage is no longer the source of truth.
// The hook still returns a synchronous `roster` array — it's the last
// server snapshot, optimistically updated on add/remove and reconciled
// after the mutation returns.
function useServerRoster(userId: string, sport: string) {
  const queryClient = useQueryClient();
  const enabled = !!userId && isSportKey(sport);
  const queryKey = ["/api/fantasy/roster", sport, userId];
  const [lastError, setLastError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey,
    enabled,
    queryFn: () => fetchJson<{ sport: string; players: any[] }>(
      `/api/fantasy/roster?sport=${encodeURIComponent(sport)}`,
    ),
    staleTime: 30_000,
  });
  const roster = data?.players ?? [];

  const checkCanAdd = useCallback((player: any): AddResult => {
    if (!userId) return { ok: false, reason: "Sign in to build a roster" };
    if (!isSportKey(sport)) return { ok: false, reason: `Unknown sport: ${sport}` };
    return validateRosterAddition(roster, player, sport);
  }, [roster, sport, userId]);

  const addMut = useMutation({
    mutationFn: (player: any) =>
      apiRequest<{ ok: boolean; players: any[] }>("POST", "/api/fantasy/roster/add", { sport, player }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKey, { sport, players: res.players });
      setLastError(null);
    },
    onError: (err: any) => {
      // Server returned 400 with a reason — surface it
      const msg = String(err?.message || "");
      const afterColon = msg.slice(msg.indexOf(":") + 1).trim();
      try {
        const parsed = JSON.parse(afterColon);
        if (parsed?.reason) setLastError(parsed.reason);
        else if (parsed?.error) setLastError(parsed.error);
        else setLastError(afterColon || "Failed to add player");
      } catch {
        setLastError(afterColon || "Failed to add player");
      }
    },
  });

  const removeMut = useMutation({
    mutationFn: (playerId: string) =>
      apiRequest<{ ok: boolean; players: any[] }>("POST", "/api/fantasy/roster/remove", { sport, playerId }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKey, { sport, players: res.players });
    },
  });

  const resetMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/fantasy/roster/reset", { sport }),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, { sport, players: [] });
      setLastError(null);
    },
  });

  const addPlayer = useCallback((player: any): AddResult => {
    const check = checkCanAdd(player);
    if (!check.ok) {
      setLastError(check.reason);
      return check;
    }
    addMut.mutate(player);
    return { ok: true };
  }, [checkCanAdd, addMut]);

  const removePlayer = useCallback((playerId: string) => {
    setLastError(null);
    removeMut.mutate(playerId);
  }, [removeMut]);

  const resetSportRoster = useCallback(() => {
    resetMut.mutate();
  }, [resetMut]);

  const isOnRoster = useCallback((playerId: string) => {
    return roster.some((p: any) => p.id === playerId);
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

// Backward-compatible alias — call sites still use `useLocalRoster`.
const useLocalRoster = useServerRoster;

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

/**
 * Trade analyzer.
 *
 * The old version showed a static 24-player slice and selected by id only,
 * which meant (a) most players weren't reachable and (b) any player sourced
 * from the ESPN leader merge couldn't be analyzed because their id wasn't
 * in the local DB. This rewrite:
 *
 *   - Starts from the user's roster for the "Giving" side — one-click
 *     add/remove of players you actually own.
 *   - Lets the "Receiving" side search the full player universe via the
 *     same /api/fantasy/players/search endpoint the roster builder uses.
 *     Every player is reachable.
 *   - Sends full player objects (not just ids) to the server so
 *     ESPN-sourced players analyze correctly.
 *   - Shows before/after roster projection numbers inline so the user sees
 *     the real delta, not just the server's verbal "accept/decline".
 */
function TradeAnalyzer({
  sportKey,
  roster,
}: {
  sportKey: string;
  roster: any[];
}) {
  const [giving, setGiving] = useState<any[]>([]);
  const [receiving, setReceiving] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 250);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Reset when sport changes
  useEffect(() => {
    setGiving([]);
    setReceiving([]);
    setSearchQuery("");
    setShowAnalysis(false);
  }, [sportKey]);

  // Searchable pool: query the server. Everything in /api/fantasy/players/search
  // is reachable — no arbitrary slice.
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["trade-search", sportKey, debouncedQuery],
    queryFn: () =>
      fetchJson<any[]>(
        `/api/fantasy/players/search?q=${encodeURIComponent(debouncedQuery)}&sport=${encodeURIComponent(sportKey)}`,
      ),
    enabled: debouncedQuery.trim().length > 1,
    staleTime: 60_000,
  });

  const givingIds = new Set(giving.map((p) => p.id));
  const receivingIds = new Set(receiving.map((p) => p.id));

  const toggleGiving = (player: any) => {
    setShowAnalysis(false);
    setGiving((prev) =>
      prev.some((p) => p.id === player.id)
        ? prev.filter((p) => p.id !== player.id)
        : [...prev, player],
    );
  };
  const toggleReceiving = (player: any) => {
    setShowAnalysis(false);
    setReceiving((prev) =>
      prev.some((p) => p.id === player.id)
        ? prev.filter((p) => p.id !== player.id)
        : [...prev, player],
    );
  };

  const analysisMut = useMutation({
    mutationFn: () =>
      apiRequest<any>("POST", "/api/fantasy/trade/analyze", {
        giving,
        receiving,
      }),
  });

  const runAnalysis = () => {
    setShowAnalysis(true);
    analysisMut.mutate();
  };

  // Client-side projection: what happens to your roster after the swap?
  const rosterProjTotal = useMemo(
    () => roster.reduce((s, p) => s + (p.projectedPoints || 0), 0),
    [roster],
  );
  const rosterAvgTotal = useMemo(
    () => roster.reduce((s, p) => s + (p.averagePoints || 0), 0),
    [roster],
  );
  const givingProj = giving.reduce((s, p) => s + (p.projectedPoints || 0), 0);
  const givingAvg = giving.reduce((s, p) => s + (p.averagePoints || 0), 0);
  const receivingProj = receiving.reduce((s, p) => s + (p.projectedPoints || 0), 0);
  const receivingAvg = receiving.reduce((s, p) => s + (p.averagePoints || 0), 0);
  const projDelta = receivingProj - givingProj;
  const avgDelta = receivingAvg - givingAvg;
  const rosterProjAfter = rosterProjTotal - givingProj + receivingProj;

  // Available "receiving" candidates: search results, minus players already
  // on the user's roster (can't receive someone you already have) and
  // minus anyone already on the giving side.
  const rosterIdSet = new Set(roster.map((p: any) => p.id));
  const receivingCandidates = (searchResults || []).filter(
    (p: any) => !rosterIdSet.has(p.id) && !givingIds.has(p.id),
  );

  const analysis = analysisMut.data;
  const analyzable = giving.length > 0 && receiving.length > 0;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-purple-400" />
          Trade Analyzer
        </h3>
        {(giving.length > 0 || receiving.length > 0) && (
          <button
            onClick={() => {
              setGiving([]); setReceiving([]); setShowAnalysis(false); setSearchQuery("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {roster.length === 0 && (
        <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-300">
          Build a roster first — trades are analyzed against the players you own.
        </div>
      )}

      {/* Giving side — drawn from the user's roster */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          You give ({giving.length})
        </p>
        {roster.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing on your roster yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roster.map((p: any) => {
              const on = givingIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleGiving(p)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5",
                    on
                      ? "bg-red-500/15 border-red-500/40 text-red-300"
                      : "bg-muted border-transparent hover:border-foreground/20",
                  )}
                  title={`${p.name} · ${p.position} · avg ${(p.averagePoints ?? 0).toFixed(1)}`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">{normalizePosition(p.position, sportKey) || p.position}</span>
                  <span className="text-[10px] num">{(p.averagePoints ?? 0).toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Receiving side — search the entire player universe */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          You receive ({receiving.length})
        </p>
        {receiving.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {receiving.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleReceiving(p)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-green-500/40 bg-green-500/15 text-green-300 flex items-center gap-1.5"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{normalizePosition(p.position, sportKey) || p.position}</span>
                <span className="text-[10px] num">{(p.averagePoints ?? 0).toFixed(1)}</span>
                <X className="w-3 h-3 opacity-70" />
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search any player by name, team, or position…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-8 text-sm"
          />
        </div>
        {debouncedQuery.trim().length > 1 && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {isSearching && !searchResults ? (
              <p className="text-xs text-muted-foreground py-2">Searching…</p>
            ) : receivingCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No matches for &quot;{debouncedQuery}&quot;.
              </p>
            ) : (
              receivingCandidates.slice(0, 20).map((p: any) => {
                const on = receivingIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleReceiving(p)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left",
                      on
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-muted/30 border-transparent hover:border-foreground/20",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {normalizePosition(p.position, sportKey) || p.position}
                        {p.team ? ` · ${p.team.split(" ").slice(-1)[0]}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold num">
                        {(p.averagePoints ?? 0).toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">avg/wk</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Inline live deltas — computed client-side, always up to date */}
      {analyzable && (
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/30 border border-border">
          <Stat
            label="Δ proj/wk"
            value={`${projDelta > 0 ? "+" : ""}${projDelta.toFixed(1)}`}
            tone={projDelta > 0.5 ? "green" : projDelta < -0.5 ? "red" : "neutral"}
          />
          <Stat
            label="Δ avg/wk"
            value={`${avgDelta > 0 ? "+" : ""}${avgDelta.toFixed(1)}`}
            tone={avgDelta > 0.5 ? "green" : avgDelta < -0.5 ? "red" : "neutral"}
          />
          <Stat
            label="Roster proj after"
            value={rosterProjAfter.toFixed(1)}
            tone="neutral"
          />
        </div>
      )}

      <button
        onClick={runAnalysis}
        disabled={!analyzable || analysisMut.isPending}
        className="btn-primary w-full disabled:opacity-50"
      >
        {analysisMut.isPending ? "Analyzing…" : "Analyze Trade"}
      </button>

      {/* Detailed verdict */}
      {showAnalysis && analysis && (
        <div className="space-y-3">
          <div
            className={cn(
              "p-4 rounded-xl border text-center",
              analysis.recommendation === "accept"
                ? "bg-green-500/10 border-green-500/20"
                : analysis.recommendation === "decline"
                ? "bg-red-500/10 border-red-500/20"
                : "bg-yellow-500/10 border-yellow-500/20",
            )}
          >
            <p
              className={cn(
                "text-lg font-bold",
                analysis.recommendation === "accept"
                  ? "text-green-400"
                  : analysis.recommendation === "decline"
                  ? "text-red-400"
                  : "text-yellow-400",
              )}
            >
              {analysis.recommendation === "accept"
                ? "✓ Accept Trade"
                : analysis.recommendation === "decline"
                ? "✗ Decline Trade"
                : "~ Neutral Trade"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.valueDifference > 0 ? "+" : ""}
              {analysis.valueDifference.toFixed(1)} pts/wk net gain (server)
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.analysis}</p>
          {analysis.factors?.map((f: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">
              {f}
            </p>
          ))}
        </div>
      )}
      {showAnalysis && analysisMut.error ? (
        <p className="text-xs text-red-400">
          {String(analysisMut.error.message || "Analysis failed")}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "neutral" }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-bold num",
          tone === "green" ? "text-green-400" : tone === "red" ? "text-red-400" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Matchup simulator — lets a user build one or more named "opponent"
 * lineups (e.g. their friend's team in a non-app league) and see their
 * own roster's projected/average-point total side-by-side with the
 * opponent's. Deliberately simple: no real-league state, just a sandbox
 * for asking "if I play this lineup on Sunday, what do I beat?"
 */
function MatchupSimulator({
  sportKey,
  roster,
  userId,
}: {
  sportKey: string;
  roster: any[];
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const enabled = !!userId;

  const { data: opponents } = useQuery({
    queryKey: ["/api/fantasy/opponents", sportKey, userId],
    queryFn: () =>
      fetchJson<any[]>(`/api/fantasy/opponents?sport=${encodeURIComponent(sportKey)}`),
    enabled,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["opponent-search", sportKey, debouncedSearch],
    queryFn: () =>
      fetchJson<any[]>(
        `/api/fantasy/players/search?q=${encodeURIComponent(debouncedSearch)}&sport=${encodeURIComponent(sportKey)}`,
      ),
    enabled: debouncedSearch.trim().length > 1,
    staleTime: 60_000,
  });

  // Reset the selection when the sport changes so we don't show an
  // opponent from another sport.
  useEffect(() => {
    setSelectedId(null);
    setSearch("");
  }, [sportKey]);

  const createMut = useMutation({
    mutationFn: (name: string) =>
      apiRequest<any>("POST", "/api/fantasy/opponents", { sport: sportKey, name }),
    onSuccess: (opp) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fantasy/opponents", sportKey, userId] });
      setSelectedId(opp?.id ?? null);
      setNewName("");
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/fantasy/opponents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fantasy/opponents", sportKey, userId] });
      setSelectedId(null);
    },
  });
  const addPlayerMut = useMutation({
    mutationFn: ({ id, player }: { id: string; player: any }) =>
      apiRequest<any>("POST", `/api/fantasy/opponents/${id}/add-player`, { player }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fantasy/opponents", sportKey, userId] });
    },
  });
  const removePlayerMut = useMutation({
    mutationFn: ({ id, playerId }: { id: string; playerId: string }) =>
      apiRequest<any>("POST", `/api/fantasy/opponents/${id}/remove-player`, { playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fantasy/opponents", sportKey, userId] });
    },
  });

  const selected = useMemo(
    () => (opponents || []).find((o: any) => o.id === selectedId) || null,
    [opponents, selectedId],
  );

  // Roster totals for matchup math
  const myProj = roster.reduce((s, p: any) => s + (p.projectedPoints || 0), 0);
  const myAvg = roster.reduce((s, p: any) => s + (p.averagePoints || 0), 0);
  const oppProj = (selected?.players || []).reduce((s: number, p: any) => s + (p.projectedPoints || 0), 0);
  const oppAvg = (selected?.players || []).reduce((s: number, p: any) => s + (p.averagePoints || 0), 0);
  const projDiff = myProj - oppProj;
  const avgDiff = myAvg - oppAvg;

  const oppPlayerIds = new Set((selected?.players || []).map((p: any) => p.id));
  const candidates = (searchResults || []).filter((p: any) => !oppPlayerIds.has(p.id));

  if (!userId) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-sm font-medium">Sign in to simulate matchups</p>
        <p className="text-xs text-muted-foreground mt-1">
          Saved opponent lineups are tied to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Opponent picker + create */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Simulate a matchup
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build an opponent lineup and see how your roster stacks up.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Opponent team name (e.g. Alex's Team)"
            maxLength={48}
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={() => newName.trim() && createMut.mutate(newName.trim())}
            disabled={!newName.trim() || createMut.isPending}
            className="btn-primary text-xs px-3 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            New
          </button>
        </div>

        {createMut.error ? (
          <p className="text-xs text-red-400 mb-2">
            {String(createMut.error.message || "Could not create")}
          </p>
        ) : null}

        {opponents && opponents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {opponents.map((o: any) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id === selectedId ? null : o.id)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5",
                  selectedId === o.id
                    ? "bg-primary/15 border-primary/40 text-foreground"
                    : "bg-muted border-transparent hover:border-foreground/20",
                )}
              >
                <Users className="w-3 h-3" />
                <span className="font-medium">{o.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {o.players.length}p
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No opponents yet. Name one above and add players to it.
          </p>
        )}
      </div>

      {/* Matchup view */}
      {selected && (
        <>
          <div className="glass-card p-4">
            <div className="grid grid-cols-3 gap-3 items-center mb-3">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">You</p>
                <p className="text-lg font-bold num">{myProj.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">proj pts</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Δ proj
                </p>
                <p
                  className={cn(
                    "text-xl font-bold num",
                    projDiff > 0
                      ? "text-green-400"
                      : projDiff < 0
                      ? "text-red-400"
                      : "text-foreground",
                  )}
                >
                  {projDiff > 0 ? "+" : ""}
                  {projDiff.toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Δ avg {avgDiff > 0 ? "+" : ""}
                  {avgDiff.toFixed(1)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground truncate">
                  {selected.name}
                </p>
                <p className="text-lg font-bold num">{oppProj.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">proj pts</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p
                className={cn(
                  "text-sm font-semibold",
                  projDiff > 0
                    ? "text-green-400"
                    : projDiff < 0
                    ? "text-red-400"
                    : "text-yellow-400",
                )}
              >
                {projDiff > 0
                  ? "Projected to win"
                  : projDiff < 0
                  ? "Projected to lose"
                  : "Projected tie"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm(`Delete opponent "${selected.name}"?`)) {
                      deleteMut.mutate(selected.id);
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Opponent roster */}
          <div className="glass-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Opponent lineup ({selected.players.length})
            </p>
            {selected.players.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Use the search below to fill their lineup.
              </p>
            ) : (
              <div className="space-y-1.5">
                {selected.players.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {normalizePosition(p.position, sportKey) || p.position}
                        {p.team ? ` · ${p.team.split(" ").slice(-1)[0]}` : ""}
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      <p className="text-xs font-bold num">
                        {(p.projectedPoints ?? 0).toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">proj</p>
                    </div>
                    <button
                      onClick={() =>
                        removePlayerMut.mutate({ id: selected.id, playerId: p.id })
                      }
                      className="w-6 h-6 rounded bg-muted hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player search to add */}
          <div className="glass-card p-4">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search any player to add to their lineup…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8 text-sm"
              />
            </div>
            {addPlayerMut.error ? (
              <p className="text-xs text-red-400 mb-2">
                {String(addPlayerMut.error.message || "Could not add")}
              </p>
            ) : null}
            {debouncedSearch.trim().length > 1 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {candidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No new matches.
                  </p>
                ) : (
                  candidates.slice(0, 20).map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => addPlayerMut.mutate({ id: selected.id, player: p })}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-transparent bg-muted/30 hover:border-foreground/20 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {normalizePosition(p.position, sportKey) || p.position}
                          {p.team ? ` · ${p.team.split(" ").slice(-1)[0]}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold num">
                          {(p.averagePoints ?? 0).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">avg</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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
  const [activeTab, setActiveTab] = useState<"roster" | "players" | "waiver" | "injuries" | "trade" | "simulate">("roster");
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

  // Auto-clear add error after 4 seconds
  useEffect(() => {
    if (lastError) {
      const t = setTimeout(clearError, 4000);
      return () => clearTimeout(t);
    }
  }, [lastError, clearError]);

  useEffect(() => {
    if (!userSports.some(s => s.id === selectedSport)) {
      setSelectedSport(userSports[0]?.id || "basketball");
    }
  }, [userSports, selectedSport]);

  const { data: team } = useQuery({
    queryKey: ["/api/fantasy/team/sample", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/fantasy/team/sample?sport=${selectedSport}`);
      return res.json();
    },
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
              { key: "simulate", label: "Simulate", Icon: Activity },
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
                const rules = SLOT_ELIGIBILITY[sport];
                // Greedy slot assignment mirroring canFitRoster
                const slots = config.positions;
                const assignments: (any | null)[] = slots.map(() => null);
                const placed = new Set<string>();

                // Pass 1: exact matches — slots whose only eligibility is themselves
                slots.forEach((slot, i) => {
                  const r = rules[slot];
                  if (r && !(r.length === 1 && r[0] === slot)) return;
                  const match = roster.find((p: any) => !placed.has(p.id) && normalizePosition(p.position, sport) === slot);
                  if (match) { assignments[i] = match; placed.add(match.id); }
                });
                // Pass 2: flex slots (accept multiple positions but not everything)
                slots.forEach((slot, i) => {
                  const r = rules[slot];
                  if (!r || r.includes("*") || (r.length === 1 && r[0] === slot)) return;
                  const match = roster.find((p: any) => !placed.has(p.id) && slotAccepts(slot, normalizePosition(p.position, sport), sport));
                  if (match) { assignments[i] = match; placed.add(match.id); }
                });
                // Pass 3: wildcards (UTIL/BN/IR)
                slots.forEach((slot, i) => {
                  const r = rules[slot];
                  if (!r || !r.includes("*")) return;
                  const match = roster.find((p: any) => !placed.has(p.id));
                  if (match) { assignments[i] = match; placed.add(match.id); }
                });

                return (
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Starting Lineup</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{config.scoringFormat} · {slots.length} slots · {placed.size}/{slots.length} filled</p>
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
                        return (
                          <div
                            key={`${pos}-${i}`}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg border",
                              assigned
                                ? "bg-primary/10 border-primary/30"
                                : "bg-muted/20 border-dashed border-border"
                            )}
                          >
                            <span className="text-xs font-bold text-muted-foreground w-10 flex-shrink-0">{pos}</span>
                            {assigned ? (
                              <>
                                <span className="text-sm font-medium text-foreground flex-1 truncate">{assigned.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{normalizePosition(assigned.position, selectedSport) || assigned.position} · {assigned.team?.split(" ").slice(-1)[0]}</span>
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

          {/* Injuries — scoped to the user's roster first, then a side
               list of other notable injuries at positions they own so
               they can find a replacement. */}
          {activeTab === "injuries" && (() => {
            // Players on the user's roster with any non-active status
            const rosterInjuries = roster.filter((p: any) => p.status && p.status !== "active");
            const rosterIds = new Set(roster.map((p: any) => p.id));
            // Normalized set of positions the user rosters — used to show
            // relevant replacement candidates at the bottom.
            const myPositions = new Set<string>();
            for (const p of roster) {
              const norm = normalizePosition(p.position, selectedSport);
              if (norm) myPositions.add(norm);
            }
            const replacementCandidates = (injuredPlayers || [])
              .filter((p: any) => !rosterIds.has(p.id))
              .filter((p: any) => {
                const norm = normalizePosition(p.position, selectedSport);
                return norm && myPositions.has(norm);
              })
              .slice(0, 8);

            return (
              <div className="space-y-3">
                {/* Header showing roster health status */}
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Your roster ({roster.length} {roster.length === 1 ? "player" : "players"})
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        {roster.length === 0
                          ? "Add players to track injuries"
                          : rosterInjuries.length === 0
                            ? "All clear — no injuries"
                            : `${rosterInjuries.length} ${rosterInjuries.length === 1 ? "player" : "players"} with injury status`}
                      </p>
                    </div>
                    {rosterInjuries.length > 0 ? (
                      <AlertCircle className="w-6 h-6 text-orange-400" />
                    ) : roster.length > 0 ? (
                      <Activity className="w-6 h-6 text-green-400" />
                    ) : (
                      <Users className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Roster-specific injury cards */}
                {rosterInjuries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Needs attention
                    </p>
                    {rosterInjuries.map((p: any) => (
                      <div key={p.id} className={cn(
                        "glass-card p-4 border-l-4",
                        p.status === "out" ? "border-l-red-400" :
                        p.status === "injured" ? "border-l-red-400" :
                        p.status === "doubtful" ? "border-l-orange-400" :
                        "border-l-yellow-400"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">{p.name}</p>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-bold flex-shrink-0",
                                STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.className,
                              )}>
                                {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.label || p.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{p.position} · {p.team}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-sm font-bold text-muted-foreground num">
                              {p.projectedPoints != null ? p.projectedPoints.toFixed(1) : "\u2014"}
                            </p>
                            <p className="text-xs text-muted-foreground">proj pts</p>
                          </div>
                        </div>
                        {p.injuryNote && (
                          <p className="text-xs text-orange-400 mt-2 border-l-2 border-orange-400/30 pl-2">{p.injuryNote}</p>
                        )}
                        {p.recentNews?.[0] && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.recentNews[0]}</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setSelectedPlayer(p)}
                            className="text-xs px-2.5 py-1 rounded bg-muted hover:bg-muted/80"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => removePlayer(p.id)}
                            className="text-xs px-2.5 py-1 rounded border border-border hover:border-red-500/40 hover:text-red-400"
                          >
                            Drop player
                          </button>
                          <button
                            onClick={() => setActiveTab("waiver")}
                            className="text-xs px-2.5 py-1 rounded border border-border hover:border-foreground/40"
                          >
                            Find replacement
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested replacements at positions you roster */}
                {roster.length > 0 && replacementCandidates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Other injured players at your positions
                    </p>
                    {replacementCandidates.map((p: any) => (
                      <div key={p.id} className="glass-card p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0",
                                STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.className,
                              )}>
                                {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.label || p.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{p.position} · {p.team}</p>
                          </div>
                          <button
                            onClick={() => setSelectedPlayer(p)}
                            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 flex-shrink-0"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state when user has no roster */}
                {roster.length === 0 && (
                  <div className="glass-card p-6 text-center">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">No roster yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Injuries are scoped to your roster. Add players first.
                    </p>
                    <button
                      onClick={() => setActiveTab("players")}
                      className="btn-primary mt-3 text-xs px-3 py-1.5"
                    >
                      Browse players
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Trade tab */}
          {activeTab === "trade" && (
            <TradeAnalyzer sportKey={selectedSport} roster={roster} />
          )}

          {/* Simulate tab — matchup projection against a mock opponent */}
          {activeTab === "simulate" && (
            <MatchupSimulator
              sportKey={selectedSport}
              roster={roster}
              userId={userId}
            />
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

          {activeTab !== "trade" && <TradeAnalyzer sportKey={selectedSport} roster={roster} />}

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
