import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { InfoItem } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface InfoCardProps {
  item: InfoItem;
}

const sportNames: Record<string, string> = {
  basketball: "Basketball",
  football: "Football",
  soccer: "Soccer",
};

const typeBadgeColors: Record<string, string> = {
  rumor: "bg-sport-rumor text-black",
  injury: "bg-sport-injury text-white",
  news: "bg-sport-news text-white",
};

const typeBorderColors: Record<string, string> = {
  rumor: "border-l-sport-rumor",
  injury: "border-l-sport-injury",
  news: "border-l-sport-news",
};

export function InfoCard({ item }: InfoCardProps) {
  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <Card
      className={`p-4 border-l-4 ${typeBorderColors[item.type]} hover-elevate cursor-default`}
      data-testid={`info-card-${item.id}`}
    >
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge className={`text-xs font-medium ${typeBadgeColors[item.type]}`} data-testid={`info-type-${item.id}`}>
          {item.type.toUpperCase()}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {sportNames[item.sportId]}
        </Badge>
        {item.tag && (
          <Badge variant="secondary" className="text-xs">
            {item.tag}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-medium line-clamp-2 mb-2" data-testid={`info-title-${item.id}`}>
        {item.title}
      </h3>

      {/* Player/Team Row */}
      {(item.player || item.team) && (
        <div className="flex items-center gap-2 text-sm mb-2 text-foreground">
          {item.player && <span data-testid={`info-player-${item.id}`}>{item.player}</span>}
          {item.player && item.team && <span className="text-muted-foreground">•</span>}
          {item.team && <span data-testid={`info-team-${item.id}`}>{item.team}</span>}
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3" data-testid={`info-description-${item.id}`}>
        {item.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span data-testid={`info-source-${item.id}`}>{item.source}</span>
          <span>•</span>
          <span className="font-mono" data-testid={`info-timestamp-${item.id}`}>
            {formatTimestamp(item.timestamp)}
          </span>
        </div>
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
            data-testid={`info-source-link-${item.id}`}
          >
            View Source
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </Card>
  );
}
