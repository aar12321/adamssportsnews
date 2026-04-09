import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TrendingUp, Users, BarChart3, ArrowRight, DollarSign, Trophy, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function BettingSummary() {
  const { data: account } = useQuery({
    queryKey: ["/api/betting/account/default"],
    queryFn: async () => {
      const res = await fetch("/api/betting/account/default");
      return res.json();
    },
    staleTime: 30000,
  });
  const { data: bets } = useQuery({
    queryKey: ["/api/betting/bets/default"],
    queryFn: async () => {
      const res = await fetch("/api/betting/bets/default");
      return res.json();
    },
    staleTime: 30000,
  });

  const pendingBets = (bets || []).filter((b: any) => b.status === "pending");
  const profit = account?.totalProfit || 0;

  return (
    <Link href="/apps/betting">
      <a className="block glass-card p-4 hover:border-primary/30 transition-all group animate-fade-in cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Betting</p>
              <p className="text-xs text-muted-foreground">Mock Account</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-sm font-bold text-foreground num">${(account?.balance || 10000).toFixed(0)}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">P&L</p>
            <p className={cn("text-sm font-bold num", profit >= 0 ? "text-green-400" : "text-red-400")}>
              {profit >= 0 ? "+" : ""}{profit.toFixed(0)}
            </p>
          </div>
        </div>
        {pendingBets.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">{pendingBets.length} pending bet{pendingBets.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </a>
    </Link>
  );
}

function FantasySummary() {
  const { data: team } = useQuery({
    queryKey: ["/api/fantasy/team/sample?sport=basketball"],
    queryFn: async () => {
      const res = await fetch("/api/fantasy/team/sample?sport=basketball");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: injured } = useQuery({
    queryKey: ["/api/fantasy/injured"],
    queryFn: async () => {
      const res = await fetch("/api/fantasy/injured");
      return res.json();
    },
    staleTime: 300000,
  });

  const injuryAlerts = (injured || []).slice(0, 2);

  return (
    <Link href="/apps/fantasy">
      <a className="block glass-card p-4 hover:border-primary/30 transition-all group animate-fade-in cursor-pointer stagger-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Fantasy</p>
              <p className="text-xs text-muted-foreground">{team?.record || "8-4"}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-sm font-bold text-foreground num">{team?.weeklyPoints?.toFixed(1) || "—"}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">Rank</p>
            <p className="text-sm font-bold text-foreground">{team?.standing || "3rd"}</p>
          </div>
        </div>
        {injuryAlerts.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <AlertCircle className="w-3 h-3 text-orange-400" />
            <span className="text-xs text-orange-400 font-medium truncate">{injuryAlerts[0].name} {injuryAlerts[0].status}</span>
          </div>
        )}
      </a>
    </Link>
  );
}

function AnalystSummary() {
  const { data: trending } = useQuery({
    queryKey: ["/api/analyst/teams/trending?sport=basketball"],
    queryFn: async () => {
      const res = await fetch("/api/analyst/teams/trending?sport=basketball");
      return res.json();
    },
    staleTime: 300000,
  });

  const topTeam = trending?.[0];

  return (
    <Link href="/apps/analyst">
      <a className="block glass-card p-4 hover:border-primary/30 transition-all group animate-fade-in cursor-pointer stagger-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">The Analyst</p>
              <p className="text-xs text-muted-foreground">Research Tool</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        {topTeam ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Hottest Team</span>
              <span className="text-xs text-green-400 font-bold">{topTeam.streak}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{topTeam.name}</p>
            <div className="flex items-center gap-1">
              {topTeam.recentForm?.slice(0, 5).map((r: string, i: number) => (
                <span key={i} className={cn(
                  "w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center",
                  r === "W" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="w-4 h-4" />
            <span className="text-xs">Research teams & players</span>
          </div>
        )}
      </a>
    </Link>
  );
}

export default function AppSummaries() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground">My Apps</h2>
        <Link href="/apps">
          <a className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </a>
        </Link>
      </div>
      <div className="space-y-3">
        <BettingSummary />
        <FantasySummary />
        <AnalystSummary />
      </div>
    </div>
  );
}
