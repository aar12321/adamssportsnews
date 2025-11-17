import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Game } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface GameCardProps {
  game: Game;
}

const sportNames: Record<string, string> = {
  basketball: "Basketball",
  football: "Football",
  soccer: "Soccer",
};

const statusColors: Record<string, string> = {
  live: "bg-sport-live text-white",
  finished: "bg-sport-finished text-white",
  upcoming: "bg-muted text-muted-foreground",
};

export function GameCard({ game }: GameCardProps) {
  const formatScore = (score: number | null) => {
    return score !== null ? score : "-";
  };

  const formatStartTime = (startTime: string) => {
    const date = new Date(startTime);
    if (game.status === "upcoming") {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-4 hover-elevate cursor-default relative overflow-hidden" data-testid={`game-card-${game.id}`}>
      {/* Status Badge - Top Right */}
      <Badge
        className={`absolute top-3 right-3 text-xs font-medium ${statusColors[game.status]}`}
        data-testid={`game-status-${game.id}`}
      >
        {game.status === "live" && "LIVE"}
        {game.status === "finished" && "FINAL"}
        {game.status === "upcoming" && "UPCOMING"}
      </Badge>

      {/* Sport and League */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="text-xs">
          {sportNames[game.sportId]}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {game.league}
        </Badge>
      </div>

      {/* Teams and Score */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-base truncate" data-testid={`game-home-team-${game.id}`}>
            {game.homeTeam}
          </span>
          <span className="font-mono text-2xl font-bold tabular-nums" data-testid={`game-home-score-${game.id}`}>
            {formatScore(game.homeScore)}
          </span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-xs text-muted-foreground">vs</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-base truncate" data-testid={`game-away-team-${game.id}`}>
            {game.awayTeam}
          </span>
          <span className="font-mono text-2xl font-bold tabular-nums" data-testid={`game-away-score-${game.id}`}>
            {formatScore(game.awayScore)}
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground font-mono" data-testid={`game-time-${game.id}`}>
        {formatStartTime(game.startTime)}
      </div>
    </Card>
  );
}
