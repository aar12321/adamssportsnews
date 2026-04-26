import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sunrise, ChevronRight, ChevronDown, Trophy, AlertTriangle } from "lucide-react";
import { fetchJson } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface RecapFinal {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  margin: number;
}

interface RecapStory {
  id: string;
  title: string;
  source?: string;
  url?: string;
  publishedAt?: string;
}

interface RecapResponse {
  finals: RecapFinal[];
  stories: RecapStory[];
  generatedAt?: string;
}

// "What you missed today" — collapsed by default so the dashboard doesn't
// gain another always-on tile. Expanded, it answers the one question a
// returning user actually asks: "did I miss anything?".
export default function DailyRecapCard() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/recap/today"],
    queryFn: () => fetchJson<RecapResponse>("/api/recap/today"),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const summary = useMemo(() => {
    if (!data) return null;
    const finals = data.finals?.length ?? 0;
    const stories = data.stories?.length ?? 0;
    if (finals === 0 && stories === 0) return "Quiet day — nothing major to catch up on.";
    const bits: string[] = [];
    if (finals > 0) bits.push(`${finals} game${finals === 1 ? "" : "s"} finished`);
    if (stories > 0) bits.push(`${stories} ${stories === 1 ? "story" : "stories"} worth knowing`);
    return bits.join(" · ");
  }, [data]);

  return (
    <div className="glass-card p-4" data-testid="card-daily-recap">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="daily-recap-body"
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Sunrise className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">What you missed</p>
            <p className="text-xs text-muted-foreground truncate">
              {open && summary ? summary : "Last 24 hours, summarized"}
            </p>
          </div>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {open && (
        <div id="daily-recap-body" className="mt-4 space-y-4">
          {isLoading && (
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
            </div>
          )}

          {!isLoading && data && (
            <>
              {data.finals.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Final scores
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {data.finals.map(g => {
                      const hScore = g.homeScore ?? 0;
                      const aScore = g.awayScore ?? 0;
                      const homeWon = hScore > aScore;
                      return (
                        <div key={g.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[60%]">
                            <span className={cn(homeWon ? "text-muted-foreground" : "text-foreground font-semibold")}>
                              {g.awayTeam}
                            </span>
                            <span className="mx-1.5 text-muted-foreground/60">@</span>
                            <span className={cn(homeWon ? "text-foreground font-semibold" : "text-muted-foreground")}>
                              {g.homeTeam}
                            </span>
                          </span>
                          <span className="font-bold tabular-nums text-foreground">
                            {aScore}–{hScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.stories.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Stories worth knowing
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {data.stories.map(s => {
                      const Tag: any = s.url ? "a" : "div";
                      return (
                        <Tag
                          key={s.id}
                          href={s.url}
                          target={s.url ? "_blank" : undefined}
                          rel={s.url ? "noopener noreferrer" : undefined}
                          className={cn(
                            "block text-xs leading-snug",
                            s.url && "text-foreground hover:text-primary transition-colors"
                          )}
                        >
                          <span className="font-medium">{s.title}</span>
                          {s.source && (
                            <span className="text-muted-foreground/70 ml-1.5">· {s.source}</span>
                          )}
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.finals.length === 0 && data.stories.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nothing major in the last 24 hours.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
