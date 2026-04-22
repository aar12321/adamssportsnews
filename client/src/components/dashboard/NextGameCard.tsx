import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { fetchJson } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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
}

interface NextGameCardProps {
  favoriteTeams: string[];
  displayName: string;
}

/** Case-insensitive, partial-name match so "Celtics" hits "Boston Celtics". */
function teamMatches(team: string, favorites: string[]): boolean {
  const t = team.toLowerCase();
  return favorites.some(f => {
    const fav = f.toLowerCase();
    return t === fav || t.includes(fav) || fav.includes(t);
  });
}

function formatKickoff(iso: string): { day: string; time: string; hoursAway: number } {
  const start = new Date(iso);
  const now = new Date();
  const hoursAway = (start.getTime() - now.getTime()) / 3_600_000;
  const sameDay = start.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = start.toDateString() === tomorrow.toDateString();
  const day = sameDay
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { day, time, hoursAway };
}

export default function NextGameCard({ favoriteTeams, displayName }: NextGameCardProps) {
  const favorites = Array.isArray(favoriteTeams) ? favoriteTeams : [];
  const name = typeof displayName === "string" && displayName.trim() ? displayName : "Sports Fan";
  const { data, isLoading } = useQuery({
    queryKey: ["/api/scores", "next-game"],
    queryFn: () => fetchJson<{ scores: Score[] }>("/api/scores"),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const nextGame = useMemo(() => {
    if (!favorites.length) return null;
    const scores = data?.scores ?? [];
    // Prefer a LIVE game involving a favourite, then the soonest upcoming.
    const live = scores.find(s =>
      s.status === "live" && (teamMatches(s.homeTeam, favorites) || teamMatches(s.awayTeam, favorites))
    );
    if (live) return { game: live, kind: "live" as const };
    const now = Date.now();
    const upcoming = scores
      .filter(s => s.status === "scheduled" && new Date(s.startTime).getTime() >= now)
      .filter(s => teamMatches(s.homeTeam, favorites) || teamMatches(s.awayTeam, favorites))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return upcoming[0] ? { game: upcoming[0], kind: "scheduled" as const } : null;
  }, [data, favorites]);

  if (!favorites.length) {
    return (
      <Link href="/profile">
        <a className="block glass-card p-4 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Daily briefing</p>
              <p className="text-sm text-foreground">
                Pick a few favourite teams in Profile and we'll surface their next game here every morning.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </a>
      </Link>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-3 bg-muted rounded w-24 mb-3" />
        <div className="h-5 bg-muted rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (!nextGame) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Good {greetingFor(new Date())}, {name.split(" ")[0]}
            </p>
            <p className="text-sm text-foreground">
              No games on the slate for your favourite teams right now — check back tomorrow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { game, kind } = nextGame;
  const { day, time, hoursAway } = formatKickoff(game.startTime);
  const favoritePlays = teamMatches(game.homeTeam, favorites) ? game.homeTeam : game.awayTeam;
  const opponent = favoritePlays === game.homeTeam ? game.awayTeam : game.homeTeam;
  const isHome = favoritePlays === game.homeTeam;
  const soon = kind === "live" || hoursAway < 3;

  return (
    <Link href="/apps/betting">
      <a className={cn(
        "block glass-card p-4 transition-all group hover:border-primary/40",
        soon && "border-green-500/30 bg-green-500/5"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {kind === "live" ? (
                <span className="inline-flex items-center gap-1.5 text-green-400">
                  <span className="live-dot" /> Live now
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Next up for your teams
                </span>
              )}
            </p>
            <p className="text-base font-bold text-foreground truncate">
              {favoritePlays} {isHome ? "vs" : "@"} {opponent}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {game.league}
              {kind === "scheduled" && (
                <>
                  {" · "}
                  <Clock className="inline w-3 h-3 mr-0.5" />
                  {day} · {time}
                </>
              )}
              {kind === "live" && game.homeScore !== null && game.awayScore !== null && (
                <> {" · "} {game.awayTeam} {game.awayScore} — {game.homeScore} {game.homeTeam}</>
              )}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-1" />
        </div>
      </a>
    </Link>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
