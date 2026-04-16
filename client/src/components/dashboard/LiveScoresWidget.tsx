import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Clock, ChevronRight, Wifi, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/queryClient";
import { useLiveStream } from "@/hooks/useLiveStream";
import type { SportId } from "@shared/schema";

const SPORT_LABELS: Record<string, string> = {
  basketball: "NBA",
  football: "NFL",
  soccer: "Soccer",
  baseball: "MLB",
  hockey: "NHL",
};

const SPORT_COLORS: Record<string, string> = {
  basketball: "text-orange-400",
  football: "text-green-400",
  soccer: "text-blue-400",
  baseball: "text-yellow-400",
  hockey: "text-cyan-400",
};

interface Score {
  id: string;
  sportId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  startTime: string;
  period?: string;
}

function ScoreCard({ score }: { score: Score }) {
  const isLive = score.status === "live";
  const isFinished = score.status === "finished";
  const homeWins = isFinished && score.homeScore !== null && score.awayScore !== null && score.homeScore > score.awayScore;
  const awayWins = isFinished && score.homeScore !== null && score.awayScore !== null && score.awayScore > score.homeScore;

  return (
    <div className={cn(
      "glass-card p-4 transition-all duration-200 hover:border-primary/30",
      isLive && "border-green-500/30 bg-green-500/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn("text-xs font-semibold uppercase tracking-wider", SPORT_COLORS[score.sportId] || "text-muted-foreground")}>
          {score.league}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <>
              <span className="live-dot" />
              <span className="text-xs font-bold text-green-400">{score.period || "LIVE"}</span>
            </>
          ) : isFinished ? (
            <span className="text-xs text-muted-foreground font-medium">FINAL</span>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-xs">
                {new Date(score.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Teams & Scores */}
      <div className="space-y-2">
        {[
          { team: score.awayTeam, score: score.awayScore, wins: awayWins },
          { team: score.homeTeam, score: score.homeScore, wins: homeWins },
        ].map(({ team, score: sc, wins }) => (
          <div key={team} className="flex items-center justify-between">
            <span className={cn(
              "text-sm font-medium truncate max-w-[150px]",
              wins ? "text-foreground font-bold" : "text-muted-foreground"
            )}>
              {team}
            </span>
            <span className={cn(
              "text-lg font-bold num tabular-nums min-w-[32px] text-right",
              wins ? "text-foreground" : sc !== null ? "text-muted-foreground" : "text-muted-foreground/50"
            )}>
              {sc !== null ? sc : "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LiveScoresWidgetProps {
  sports: SportId[];
}

export default function LiveScoresWidget({ sports }: LiveScoresWidgetProps) {
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/scores", selectedSport],
    queryFn: async () => {
      const url = selectedSport === "all" ? "/api/scores" : `/api/scores?sport=${selectedSport}`;
      return fetchJson<{ scores: Score[] }>(url);
    },
    // Server pushes score updates via SSE, so we poll every 2 min just as
    // a safety net in case the stream drops silently on a mobile network.
    refetchInterval: 120_000,
    // Keep prior scores visible while we re-fetch instead of flashing the empty state.
    placeholderData: (prev) => prev,
  });

  // Subscribe to live score updates via Server-Sent Events. Updates the
  // React Query cache in-place so the UI re-renders without a fetch.
  const topic = selectedSport === "all" ? "scores:all" : `scores:${selectedSport}`;
  useLiveStream([topic], {
    score: (incoming: Score) => {
      queryClient.setQueryData<{ scores: Score[] } | undefined>(
        ["/api/scores", selectedSport],
        (prev) => {
          const list = prev?.scores ? [...prev.scores] : [];
          const idx = list.findIndex((s) => s.id === incoming.id);
          if (idx >= 0) list[idx] = incoming; else list.push(incoming);
          return { ...(prev || {}), scores: list };
        },
      );
    },
    "score-finished": (finished: Score) => {
      queryClient.setQueryData<{ scores: Score[] } | undefined>(
        ["/api/scores", selectedSport],
        (prev) => {
          if (!prev?.scores) return prev;
          return {
            ...prev,
            scores: prev.scores.map((s) =>
              s.id === finished.id ? { ...s, status: "finished" } : s,
            ),
          };
        },
      );
    },
  });

  const scores: Score[] = data?.scores || [];
  const liveCount = scores.filter(s => s.status === "live").length;

  const displaySports = ["all", ...sports];

  return (
    <div className="space-y-4">
      {/* Widget header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-foreground">Live Scores</h2>
          {liveCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="live-dot w-1.5 h-1.5" />
              <span className="text-xs text-green-400 font-medium">{liveCount}</span>
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className={cn("w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all",
            isFetching && "animate-spin"
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sport filter */}
      <div className="scroll-row">
        {displaySports.map(sport => (
          <button
            key={sport}
            onClick={() => setSelectedSport(sport)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              selectedSport === sport
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {sport === "all" ? "All" : SPORT_LABELS[sport] || sport}
          </button>
        ))}
      </div>

      {/* Scores list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-3 bg-muted rounded w-16 mb-3" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-muted rounded w-28" />
                  <div className="h-4 bg-muted rounded w-8" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-4 bg-muted rounded w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError && scores.length === 0 ? (
        <div className="glass-card p-8 text-center border-destructive/30">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">Couldn&apos;t load scores</p>
          <p className="text-xs text-muted-foreground mt-1">Check your connection or try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      ) : scores.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Wifi className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No games right now</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back later for live scores</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Live games first */}
          {scores.filter(s => s.status === "live").map(score => (
            <ScoreCard key={score.id} score={score} />
          ))}
          {/* Then upcoming */}
          {scores.filter(s => s.status === "scheduled").slice(0, 3).map(score => (
            <ScoreCard key={score.id} score={score} />
          ))}
          {/* Then finished */}
          {scores.filter(s => s.status === "finished").slice(0, 3).map(score => (
            <ScoreCard key={score.id} score={score} />
          ))}
        </div>
      )}
    </div>
  );
}
