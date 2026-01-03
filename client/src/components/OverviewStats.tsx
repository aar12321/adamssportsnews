import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trophy, Activity, CalendarClock, Stethoscope, Megaphone } from "lucide-react";

interface OverviewStatsProps {
  stats: {
    liveGames: number;
    upcomingGames: number;
    injuries: number;
    rumors: number;
    news: number;
  };
}

const tiles = [
  {
    key: "live",
    label: "Live games",
    icon: Activity,
    color: "text-sport-live",
    background: "bg-sport-live/10",
    valueKey: "liveGames" as const,
  },
  {
    key: "upcoming",
    label: "Upcoming",
    icon: CalendarClock,
    color: "text-muted-foreground",
    background: "bg-muted",
    valueKey: "upcomingGames" as const,
  },
  {
    key: "injuries",
    label: "Injuries",
    icon: Stethoscope,
    color: "text-sport-injury",
    background: "bg-sport-injury/10",
    valueKey: "injuries" as const,
  },
  {
    key: "rumors",
    label: "Rumors",
    icon: Megaphone,
    color: "text-sport-rumor",
    background: "bg-sport-rumor/10",
    valueKey: "rumors" as const,
  },
  {
    key: "news",
    label: "News",
    icon: Trophy,
    color: "text-sport-news",
    background: "bg-sport-news/10",
    valueKey: "news" as const,
  },
] as const;

export function OverviewStats({ stats }: OverviewStatsProps) {
  return (
    <Card className="p-4 md:p-6" data-testid="overview-stats">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {tiles.map(({ key, label, icon: Icon, color, background, valueKey }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-lg border p-3 bg-card/50"
          >
            <div
              className={`h-10 w-10 rounded-md flex items-center justify-center ${background}`}
            >
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-xl font-semibold">
                {stats[valueKey]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4" />
      <p className="text-sm text-muted-foreground">
        Track active games, roster-impacting injuries, market-shifting rumors, and breaking news in one glance.
      </p>
    </Card>
  );
}
