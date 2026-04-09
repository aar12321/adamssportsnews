import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Trophy, ChevronLeft, Search, AlertCircle, TrendingUp, TrendingDown,
  Users, Activity, Star, ArrowLeftRight, Target, RefreshCw, Minus
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const SPORTS = [
  { key: "basketball", label: "NBA" },
  { key: "football", label: "NFL" },
  { key: "soccer", label: "Soccer" },
];

const STATUS_CONFIG = {
  active: { label: "Active", className: "text-green-400 bg-green-500/10" },
  injured: { label: "Injured", className: "text-red-400 bg-red-500/10" },
  doubtful: { label: "Doubtful", className: "text-orange-400 bg-orange-500/10" },
  out: { label: "Out", className: "text-red-500 bg-red-500/15 font-bold" },
  questionable: { label: "Quest.", className: "text-yellow-400 bg-yellow-500/10" },
};

function PlayerCard({ player, compact = false }: { player: any; compact?: boolean }) {
  const statusConfig = STATUS_CONFIG[player.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
  const trendIcon = player.trending === "up" ? TrendingUp : player.trending === "down" ? TrendingDown : Minus;
  const trendColor = player.trending === "up" ? "text-green-400" : player.trending === "down" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 glass-card hover:border-primary/30 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{player.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{player.name}</p>
            <p className="text-xs text-muted-foreground">{player.position} · {player.team.split(" ").slice(-1)[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", statusConfig.className)}>
            {statusConfig.label}
          </span>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground num">{player.projectedPoints?.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">proj</p>
          </div>
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
          <p className="text-base font-bold text-foreground num">{player.averagePoints?.toFixed(1)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Projected</p>
          <p className="text-base font-bold text-primary num">{player.projectedPoints?.toFixed(1)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Last Week</p>
          <p className="text-base font-bold text-foreground num">{player.weeklyPoints?.toFixed(1)}</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(player.stats || {}).slice(0, 5).map(([key, value]) => (
          <span key={key} className="px-2 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <span className="font-bold text-foreground num">{typeof value === "number" ? value.toFixed(1) : value as string}</span> {key.replace("_", "/")}
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
    </div>
  );
}

function TradeAnalyzer() {
  const [givingIds, setGivingIds] = useState<string[]>([]);
  const [receivingIds, setReceivingIds] = useState<string[]>([]);
  const [step, setStep] = useState<"giving" | "receiving" | "result">("giving");

  const { data: players } = useQuery({
    queryKey: ["/api/fantasy/players"],
    queryFn: async () => {
      const res = await fetch("/api/fantasy/players");
      return res.json();
    },
  });

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/fantasy/trade/analyze", givingIds.join(","), receivingIds.join(",")],
    queryFn: async () => {
      const res = await fetch("/api/fantasy/trade/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giving: givingIds, receiving: receivingIds }),
      });
      return res.json();
    },
    enabled: step === "result" && givingIds.length > 0 && receivingIds.length > 0,
  });

  const togglePlayer = (id: string, side: "giving" | "receiving") => {
    if (side === "giving") {
      setGivingIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setReceivingIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-purple-400" />
        Trade Analyzer
      </h3>

      {step !== "result" ? (
        <>
          <div className="tab-bar">
            <button className={cn("tab-item", step === "giving" && "active")} onClick={() => setStep("giving")}>
              Giving ({givingIds.length})
            </button>
            <button className={cn("tab-item", step === "receiving" && "active")} onClick={() => setStep("receiving")}>
              Receiving ({receivingIds.length})
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(players || []).slice(0, 12).map((p: any) => {
              const currentIds = step === "giving" ? givingIds : receivingIds;
              const isSelected = currentIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id, step)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                    isSelected ? "bg-primary/15 border-primary/40" : "bg-muted/30 border-transparent hover:border-primary/30"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.position} · {p.team.split(" ").slice(-1)[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground num">{p.averagePoints.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">avg/wk</p>
                  </div>
                </button>
              );
            })}
          </div>

          {givingIds.length > 0 && receivingIds.length > 0 && (
            <button onClick={() => setStep("result")} className="btn-primary w-full">
              Analyze Trade
            </button>
          )}
        </>
      ) : (
        <>
          {isLoading ? (
            <div className="text-center py-6">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
            </div>
          ) : analysis ? (
            <div className="space-y-3">
              <div className={cn(
                "p-4 rounded-xl border text-center",
                analysis.recommendation === "accept" ? "bg-green-500/10 border-green-500/20" :
                analysis.recommendation === "decline" ? "bg-red-500/10 border-red-500/20" :
                "bg-yellow-500/10 border-yellow-500/20"
              )}>
                <p className={cn("text-lg font-bold",
                  analysis.recommendation === "accept" ? "text-green-400" :
                  analysis.recommendation === "decline" ? "text-red-400" :
                  "text-yellow-400"
                )}>
                  {analysis.recommendation === "accept" ? "✓ Accept Trade" :
                   analysis.recommendation === "decline" ? "✗ Decline Trade" :
                   "~ Neutral Trade"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.valueDifference > 0 ? "+" : ""}{analysis.valueDifference.toFixed(1)} pts/wk net gain
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.analysis}</p>
              {analysis.factors?.map((f: string, i: number) => (
                <p key={i} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">{f}</p>
              ))}
              <button onClick={() => { setStep("giving"); setGivingIds([]); setReceivingIds([]); }} className="btn-ghost w-full">
                New Analysis
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function FantasyApp() {
  const [selectedSport, setSelectedSport] = useState("basketball");
  const [activeTab, setActiveTab] = useState<"roster" | "players" | "waiver" | "injuries" | "trade">("roster");
  const [searchQuery, setSearchQuery] = useState("");

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
    queryKey: ["/api/fantasy/players/search", searchQuery, selectedSport],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await fetch(`/api/fantasy/players/search?q=${encodeURIComponent(searchQuery)}&sport=${selectedSport}`);
      return res.json();
    },
    enabled: searchQuery.trim().length > 1,
  });

  const displayPlayers = searchQuery.trim().length > 1 ? (searchResults || []) : (topPlayers || []);

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
          <h1 className="text-2xl font-bold text-foreground">Fantasy Teams</h1>
          <p className="text-sm text-muted-foreground">Player research & team management</p>
        </div>
      </div>

      {/* Sport selector */}
      <div className="tab-bar mb-5">
        {SPORTS.map(sport => (
          <button key={sport.key} className={cn("tab-item", selectedSport === sport.key && "active")}
            onClick={() => setSelectedSport(sport.key)}>
            {sport.label}
          </button>
        ))}
      </div>

      {/* My Team summary */}
      {team && (
        <div className="glass-card p-4 mb-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-foreground">{team.name}</p>
              <p className="text-xs text-muted-foreground">{team.league}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Record</p>
                <p className="text-sm font-bold text-foreground">{team.record}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Rank</p>
                <p className="text-sm font-bold text-primary">{team.standing}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-sm font-bold text-green-400 num">{team.weeklyPoints?.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full"
              style={{ width: `${Math.min((team.weeklyPoints / (team.projectedWeeklyPoints * 1.2)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {team.weeklyPoints?.toFixed(1)} / {team.projectedWeeklyPoints?.toFixed(1)} projected pts
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab nav */}
          <div className="scroll-row">
            {[
              { key: "roster", label: "My Roster", Icon: Trophy },
              { key: "players", label: "Players", Icon: Users },
              { key: "waiver", label: "Waiver Wire", Icon: Target },
              { key: "injuries", label: "Injuries", Icon: AlertCircle },
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
            <div className="space-y-2">
              {(team?.roster || []).map((p: any) => (
                <PlayerCard key={p.id} player={p} compact />
              ))}
              {(!team?.roster || team.roster.length === 0) && (
                <div className="glass-card p-6 text-center">
                  <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No roster data</p>
                </div>
              )}
            </div>
          )}

          {/* Players */}
          {activeTab === "players" && (
            loadingPlayers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card p-5 animate-pulse h-48" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayPlayers.map((p: any, i: number) => (
                  <div key={p.id} className={cn("animate-fade-in", `stagger-${Math.min(i+1, 4)}`)}>
                    <PlayerCard player={p} />
                  </div>
                ))}
              </div>
            )
          )}

          {/* Waiver wire */}
          {activeTab === "waiver" && (
            <div className="space-y-3">
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
                    <div className="flex items-center gap-1">
                      {target.player.trending === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-400" />}
                      <span className="text-xs font-bold text-foreground num">
                        {target.player.projectedPoints.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Injuries */}
          {activeTab === "injuries" && (
            <div className="space-y-2">
              {(injuredPlayers || []).map((p: any) => (
                <div key={p.id} className={cn(
                  "glass-card p-4 border-l-4",
                  p.status === "out" ? "border-l-red-400" :
                  p.status === "injured" ? "border-l-red-400" :
                  p.status === "doubtful" ? "border-l-orange-400" :
                  "border-l-yellow-400"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.className
                        )}>
                          {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.position} · {p.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-muted-foreground num">{p.projectedPoints.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">proj pts</p>
                    </div>
                  </div>
                  {p.injuryNote && (
                    <p className="text-xs text-orange-400 mt-2 border-l-2 border-orange-400/30 pl-2">{p.injuryNote}</p>
                  )}
                  {p.recentNews?.[0] && (
                    <p className="text-xs text-muted-foreground mt-1">{p.recentNews[0]}</p>
                  )}
                </div>
              ))}
              {(!injuredPlayers || injuredPlayers.length === 0) && (
                <div className="glass-card p-6 text-center">
                  <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-400 font-medium">No major injuries</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <TradeAnalyzer />

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
                    <span className="text-sm font-bold text-primary num">{p.projectedPoints.toFixed(1)}</span>
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
