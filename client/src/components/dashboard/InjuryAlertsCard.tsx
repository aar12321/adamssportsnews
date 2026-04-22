import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { fetchJson } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface InjuredPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  status: "active" | "injured" | "doubtful" | "out" | "questionable";
  injuryNote?: string;
}

interface InjuryAlertsCardProps {
  favoriteTeams: string[];
  favoritePlayers: string[];
}

function isRelevant(p: InjuredPlayer, teams: string[], players: string[]): boolean {
  const team = p.team.toLowerCase();
  const name = p.name.toLowerCase();
  const teamMatch = teams.some(t => {
    const fav = t.toLowerCase();
    return team === fav || team.includes(fav) || fav.includes(team);
  });
  if (teamMatch) return true;
  return players.some(p2 => {
    const fav = p2.toLowerCase();
    return name === fav || name.includes(fav) || fav.includes(name);
  });
}

const STATUS_COLOR: Record<string, string> = {
  out: "text-red-400 bg-red-500/10 border-red-500/20",
  injured: "text-red-400 bg-red-500/10 border-red-500/20",
  doubtful: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  questionable: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

export default function InjuryAlertsCard({ favoriteTeams, favoritePlayers }: InjuryAlertsCardProps) {
  const teams = Array.isArray(favoriteTeams) ? favoriteTeams : [];
  const players = Array.isArray(favoritePlayers) ? favoritePlayers : [];
  // Only fetch when the user actually has favourites; otherwise the
  // card would render nothing anyway and the request is wasted.
  const enabled = teams.length > 0 || players.length > 0;
  const { data } = useQuery({
    queryKey: ["/api/fantasy/injured", "briefing"],
    queryFn: () => fetchJson<InjuredPlayer[]>("/api/fantasy/injured"),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    enabled,
  });

  const relevant = useMemo(() => {
    if (!Array.isArray(data) || !enabled) return [];
    return data.filter(p => isRelevant(p, teams, players)).slice(0, 3);
  }, [data, teams, players, enabled]);

  if (relevant.length === 0) return null;

  return (
    <Link href="/apps/fantasy">
      <a className="block glass-card p-4 border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40 transition-all group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
              Injury updates for your teams
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
        </div>
        <div className="space-y-1.5">
          {relevant.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="font-semibold text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground ml-1.5">· {p.team}</span>
                {p.injuryNote && (
                  <span className="block text-xs text-muted-foreground truncate">{p.injuryNote}</span>
                )}
              </div>
              <span className={cn(
                "flex-shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold border capitalize",
                STATUS_COLOR[p.status] || STATUS_COLOR.injured
              )}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </a>
    </Link>
  );
}
