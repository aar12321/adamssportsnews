import React, { useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Trophy, Lock, Check, Clock, Award, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import type { PickableGame, UserPick, PickLeaderboardEntry } from "@shared/schema";

interface SlateResponse { games: PickableGame[]; }
interface UserPicksResponse { picks: UserPick[]; }
interface LeaderboardResponse { leaderboard: PickLeaderboardEntry[]; }

function GameRow({
  game,
  myPick,
  onPick,
  pending,
}: {
  game: PickableGame;
  myPick?: UserPick;
  onPick: (selection: string) => void;
  pending: boolean;
}) {
  const locked = game.locked;
  const startTimeLabel = new Date(game.startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const button = (team: string) => {
    const picked = myPick?.selection === team;
    const won = picked && myPick?.result === "won";
    const lost = picked && myPick?.result === "lost";
    return (
      <button
        type="button"
        onClick={() => !locked && !pending && onPick(team)}
        disabled={locked || pending}
        aria-pressed={picked}
        data-testid={`button-pick-${game.gameId}-${team.replace(/\s+/g, "-").toLowerCase()}`}
        className={cn(
          "flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left",
          picked && won && "bg-green-500/15 border-green-500/40 text-green-400",
          picked && lost && "bg-red-500/15 border-red-500/40 text-red-400",
          picked && !won && !lost && "bg-primary/15 border-primary/40 text-primary",
          !picked && "bg-muted border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30",
          (locked || pending) && !picked && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">{team}</span>
          {picked && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
        </span>
      </button>
    );
  };

  return (
    <div className="glass-card p-4 space-y-3" data-testid={`card-pick-${game.gameId}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">{game.league}</span>
        <span className="flex items-center gap-1.5">
          {locked ? (
            <>
              <Lock className="w-3 h-3" />
              Locked
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              {startTimeLabel}
            </>
          )}
        </span>
      </div>
      <div className="flex items-stretch gap-2">
        {button(game.awayTeam)}
        <span className="self-center text-[10px] font-bold text-muted-foreground/60">at</span>
        {button(game.homeTeam)}
      </div>
      {myPick && myPick.result === "pending" && !locked && (
        <p className="text-[11px] text-muted-foreground">
          Your pick is in. Tap the other side any time before kickoff to swap.
        </p>
      )}
      {myPick && myPick.result === "won" && (
        <p className="text-[11px] text-green-400 font-semibold">Nailed it. +1 to your record.</p>
      )}
      {myPick && myPick.result === "lost" && (
        <p className="text-[11px] text-red-400 font-semibold">Tough one. Streak resets.</p>
      )}
      {myPick && myPick.result === "push" && (
        <p className="text-[11px] text-muted-foreground">Push — no winner declared.</p>
      )}
    </div>
  );
}

export default function PickEmApp() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const displayName = preferences.displayName;

  const { data: slate, isLoading: slateLoading } = useQuery({
    queryKey: ["/api/picks/today"],
    queryFn: () => fetchJson<SlateResponse>("/api/picks/today"),
    refetchInterval: 60_000,
  });

  const { data: userPicks } = useQuery({
    queryKey: ["/api/picks/user", userId],
    queryFn: () => fetchJson<UserPicksResponse>(`/api/picks/user/${userId}`),
    enabled: !!userId,
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["/api/picks/leaderboard"],
    queryFn: () => fetchJson<LeaderboardResponse>("/api/picks/leaderboard?limit=10"),
    refetchInterval: 5 * 60_000,
  });

  const submitPick = useMutation({
    mutationFn: async (input: { game: PickableGame; selection: string }) => {
      if (!userId) throw new Error("Sign in to make picks");
      return apiRequest("POST", `/api/picks/user/${userId}`, {
        gameId: input.game.gameId,
        selection: input.selection,
        homeTeam: input.game.homeTeam,
        awayTeam: input.game.awayTeam,
        startTime: input.game.startTime,
        displayName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picks/user", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/picks/leaderboard"] });
    },
  });

  // Map gameId → my latest pick so each row knows what the user already
  // chose. Latest by submittedAt wins so swapping mid-day works.
  const picksByGame = useMemo(() => {
    const out: Record<string, UserPick> = {};
    (userPicks?.picks ?? []).forEach((p) => {
      const existing = out[p.gameId];
      if (!existing || new Date(p.submittedAt) > new Date(existing.submittedAt)) {
        out[p.gameId] = p;
      }
    });
    return out;
  }, [userPicks]);

  const myStats = useMemo(() => {
    const picks = userPicks?.picks ?? [];
    let won = 0, total = 0;
    picks.forEach((p) => {
      if (p.result === "pending") return;
      total++;
      if (p.result === "won") won++;
    });
    return { won, total };
  }, [userPicks]);

  return (
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/apps">
          <a className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-all">
            <ChevronLeft className="w-4 h-4" />
          </a>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pick'em</h1>
            <p className="text-xs text-muted-foreground">Pick the winner. Build a streak. Climb the board.</p>
          </div>
        </div>
      </div>

      {/* My record strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Your record</p>
          <p className="text-lg font-bold text-foreground tabular-nums">
            {myStats.won}<span className="text-muted-foreground">–{myStats.total - myStats.won}</span>
          </p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Accuracy</p>
          <p className="text-lg font-bold text-foreground tabular-nums">
            {myStats.total > 0 ? `${Math.round((myStats.won / myStats.total) * 100)}%` : "—"}
          </p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Today's slate</p>
          <p className="text-lg font-bold text-foreground tabular-nums">{slate?.games.length ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's slate */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Today's slate
          </h2>
          {!userId && (
            <div className="glass-card p-5 text-center text-sm text-muted-foreground">
              <p>Sign in to make picks and join the leaderboard.</p>
            </div>
          )}
          {slateLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 animate-pulse h-24" />
              ))}
            </div>
          )}
          {!slateLoading && slate?.games.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Clock className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No games scheduled for today.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Check back tomorrow for a fresh slate.</p>
            </div>
          )}
          {slate?.games.map((g) => (
            <GameRow
              key={g.gameId}
              game={g}
              myPick={picksByGame[g.gameId]}
              pending={submitPick.isPending}
              onPick={(selection) => userId && submitPick.mutate({ game: g, selection })}
            />
          ))}
          {submitPick.isError && (
            <p className="text-xs text-red-400 px-1" role="alert">
              {(submitPick.error as Error)?.message?.replace(/^\d{3}:\s*/, "") ?? "Couldn't save that pick."}
            </p>
          )}
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            Leaderboard
          </h2>
          <div className="glass-card p-3">
            {leaderboardLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            )}
            {!leaderboardLoading && (leaderboard?.leaderboard.length ?? 0) === 0 && (
              <div className="text-center py-6">
                <Users className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Be the first on the board.</p>
              </div>
            )}
            {(leaderboard?.leaderboard ?? []).map((entry, idx) => {
              const isMe = entry.userId === userId;
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-lg",
                    isMe && "bg-primary/10"
                  )}
                  data-testid={`row-leaderboard-${entry.userId}`}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold tabular-nums",
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400"
                        : idx === 1 ? "bg-zinc-400/20 text-zinc-300"
                        : idx === 2 ? "bg-amber-700/20 text-amber-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", isMe ? "text-primary" : "text-foreground")}>
                      {entry.displayName}
                      {isMe && <span className="ml-1 text-[10px] text-primary/70">(you)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.total > 0
                        ? `${Math.round((entry.correct / entry.total) * 100)}% · best streak ${entry.streak}`
                        : "—"}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {entry.correct}<span className="text-muted-foreground">/{entry.total}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
