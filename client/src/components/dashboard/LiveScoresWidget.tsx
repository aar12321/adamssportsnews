import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Clock, ChevronRight, Wifi, AlertCircle, Flame, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/queryClient";
import type { SportId } from "@shared/schema";

// Words that strongly imply "something just happened in a game" — touchdowns,
// goals, ejections, walk-offs. Used to spot the headlines worth surfacing
// right next to the live scoreboard.
const LIVE_MOMENT_KEYWORDS = [
  "touchdown", " td ", "goal", "scored", "scores", "score", "home run", "homer",
  "walk-off", "walkoff", "buzzer beater", "buzzer-beater", "game winner", "game-winning",
  "ejected", "red card", "hat trick", "grand slam", "pick-six", "pick six",
  "field goal", "interception", "fumble", "safety", "overtime", "ot ", " ko ",
  "knockout", "stoppage time", "extra time", "penalty",
];

interface NewsArticle {
  id: string;
  title: string;
  publishedAt?: string;
  url?: string;
  sportId?: string;
  source?: string;
  tags?: string[];
}

function isKeyMoment(article: NewsArticle): boolean {
  const haystack = `${article.title} ${(article.tags || []).join(" ")}`.toLowerCase();
  return LIVE_MOMENT_KEYWORDS.some(k => haystack.includes(k));
}

function relativeTime(iso?: string): string {
  if (!iso) return "now";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

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

interface ScoreCardProps {
  score: Score;
  pinned: boolean;
  featured?: boolean;
  onTogglePin: (id: string) => void;
}

function ScoreCard({ score, pinned, featured, onTogglePin }: ScoreCardProps) {
  const isLive = score.status === "live";
  const isFinished = score.status === "finished";
  const homeWins = isFinished && score.homeScore !== null && score.awayScore !== null && score.homeScore > score.awayScore;
  const awayWins = isFinished && score.homeScore !== null && score.awayScore !== null && score.awayScore > score.homeScore;

  const PinIcon = pinned ? PinOff : Pin;
  const teamFontClass = featured ? "text-base" : "text-sm";
  const scoreFontClass = featured ? "text-3xl" : "text-lg";

  return (
    <div className={cn(
      "glass-card transition-all duration-200 hover:border-primary/30",
      featured ? "p-5 border-primary/30 bg-primary/5" : "p-4",
      isLive && !featured && "border-green-500/30 bg-green-500/5",
      isLive && featured && "border-green-500/40 bg-green-500/10"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {featured && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
              Featured
            </span>
          )}
          <span className={cn("text-xs font-semibold uppercase tracking-wider", SPORT_COLORS[score.sportId] || "text-muted-foreground")}>
            {score.league}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-xs font-bold text-green-400">{score.period || "LIVE"}</span>
            </div>
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
          <button
            type="button"
            onClick={() => onTogglePin(score.id)}
            aria-label={pinned ? `Unpin ${score.awayTeam} at ${score.homeTeam}` : `Pin ${score.awayTeam} at ${score.homeTeam} to top`}
            aria-pressed={pinned}
            data-testid={`button-pin-${score.id}`}
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center transition-all",
              pinned
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
            )}
          >
            <PinIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Teams & Scores */}
      <div className={featured ? "space-y-3" : "space-y-2"}>
        {[
          { team: score.awayTeam, score: score.awayScore, wins: awayWins },
          { team: score.homeTeam, score: score.homeScore, wins: homeWins },
        ].map(({ team, score: sc, wins }) => (
          <div key={team} className="flex items-center justify-between">
            <span className={cn(
              "font-medium truncate max-w-[180px]",
              teamFontClass,
              wins ? "text-foreground font-bold" : "text-muted-foreground"
            )}>
              {team}
            </span>
            <span className={cn(
              "font-bold num tabular-nums min-w-[44px] text-right",
              scoreFontClass,
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

// Persist the user's pinned-game pick across reloads. One game at a time —
// "the one I'm watching tonight" — is the simplest and most useful frame.
const PINNED_GAME_KEY = "live_scores_pinned_game_v1";

export default function LiveScoresWidget({ sports }: LiveScoresWidgetProps) {
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [pinnedId, setPinnedId] = useState<string | null>(() => {
    try { return localStorage.getItem(PINNED_GAME_KEY); } catch { return null; }
  });

  const togglePin = useCallback((id: string) => {
    setPinnedId(prev => {
      const next = prev === id ? null : id;
      try {
        if (next) localStorage.setItem(PINNED_GAME_KEY, next);
        else localStorage.removeItem(PINNED_GAME_KEY);
      } catch {}
      return next;
    });
  }, []);

  const displaySports = ["all", ...sports];

  // If the user removes the currently-selected sport from their favourites
  // in Profile, the chip vanishes from displaySports but selectedSport stays
  // set — leaving an invisible filter on the scores feed. Snap back to "all"
  // so the UI always reflects the actually-applied filter.
  useEffect(() => {
    if (!displaySports.includes(selectedSport)) {
      setSelectedSport("all");
    }
  }, [displaySports, selectedSport]);

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["/api/scores", selectedSport],
    queryFn: async () => {
      const url = selectedSport === "all" ? "/api/scores" : `/api/scores?sport=${selectedSport}`;
      return fetchJson<{ scores: Score[] }>(url);
    },
    refetchInterval: 60000, // Auto-refresh every minute
    // Keep prior scores visible while we re-fetch instead of flashing the empty state.
    placeholderData: (prev) => prev,
  });

  const scores: Score[] = data?.scores || [];
  const liveCount = scores.filter(s => s.status === "live").length;

  // Key moments strip — TDs, goals, walk-offs from the news feed. Only fetch
  // when there's at least one live game on screen so we don't spend bandwidth
  // on it during a quiet Tuesday morning.
  const { data: newsData } = useQuery({
    queryKey: ["/api/news/key-moments", selectedSport],
    queryFn: async () => {
      const suffix = selectedSport !== "all" ? `&sport=${encodeURIComponent(selectedSport)}` : "";
      return fetchJson<{ articles: NewsArticle[] }>(`/api/news?limit=30${suffix}`);
    },
    enabled: liveCount > 0,
    refetchInterval: 90_000,
    staleTime: 60_000,
  });

  const keyMoments = useMemo(() => {
    const articles = newsData?.articles ?? [];
    return articles.filter(isKeyMoment).slice(0, 8);
  }, [newsData]);

  // Tick once a second so the "Updated Xs ago" caption stays accurate
  // without re-fetching. The query itself only re-runs every 60s.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const updatedLabel = (() => {
    if (!dataUpdatedAt) return null;
    const seconds = Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000));
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  })();

  return (
    <div className="space-y-4">
      {/* Widget header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-bold text-foreground">Live Scores</h2>
          {liveCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="live-dot w-1.5 h-1.5" />
              <span className="text-xs text-green-400 font-medium">{liveCount}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {updatedLabel && (
            <span
              className="text-[11px] text-muted-foreground tabular-nums"
              title={`Last updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
            >
              {isFetching ? "Refreshing…" : `Updated ${updatedLabel}`}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh scores"
            className={cn(
              "w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </button>
        </div>
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

      {/* Key moments — only when there's something live. Hidden if no
          impact-worthy headlines were detected so it doesn't sit empty. */}
      {liveCount > 0 && keyMoments.length > 0 && (
        <div className="space-y-1.5" data-testid="strip-key-moments">
          <div className="flex items-center gap-1.5 px-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">Key moments</span>
          </div>
          <div className="scroll-row">
            {keyMoments.map(m => {
              const Tag: any = m.url ? "a" : "div";
              return (
                <Tag
                  key={m.id}
                  href={m.url}
                  target={m.url ? "_blank" : undefined}
                  rel={m.url ? "noopener noreferrer" : undefined}
                  className={cn(
                    "flex-shrink-0 max-w-[260px] glass-card px-3 py-2 transition-all",
                    m.url && "hover:border-orange-500/40 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                      {SPORT_LABELS[m.sportId || ""] || m.sportId || "Live"}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {relativeTime(m.publishedAt)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                    {m.title}
                  </p>
                </Tag>
              );
            })}
          </div>
        </div>
      )}

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
          {/* Pinned/featured game floats above everything else and renders
              larger so the user can park their eyes on the one they care
              about. */}
          {(() => {
            const pinned = pinnedId ? scores.find(s => s.id === pinnedId) : null;
            const live = scores.filter(s => s.status === "live" && s.id !== pinnedId);
            const upcoming = scores.filter(s => s.status === "scheduled" && s.id !== pinnedId).slice(0, 3);
            const finished = scores.filter(s => s.status === "finished" && s.id !== pinnedId).slice(0, 3);
            return (
              <>
                {pinned && (
                  <ScoreCard
                    key={pinned.id}
                    score={pinned}
                    pinned
                    featured
                    onTogglePin={togglePin}
                  />
                )}
                {live.map(score => (
                  <ScoreCard key={score.id} score={score} pinned={false} onTogglePin={togglePin} />
                ))}
                {upcoming.map(score => (
                  <ScoreCard key={score.id} score={score} pinned={false} onTogglePin={togglePin} />
                ))}
                {finished.map(score => (
                  <ScoreCard key={score.id} score={score} pinned={false} onTogglePin={togglePin} />
                ))}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
