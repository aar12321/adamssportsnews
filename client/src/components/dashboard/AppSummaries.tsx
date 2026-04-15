import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TrendingUp, Users, BarChart3, ArrowRight, DollarSign, Trophy, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

function BettingSummary() {
  const { user } = useAuth();
  const userId = user?.id || "default";
  const { data: account } = useQuery({
    queryKey: ["betting-account", userId],
    queryFn: () => fetchJson<any>(`/api/betting/account/${userId}`),
    staleTime: 30000,
  });
  const { data: bets } = useQuery({
    queryKey: ["betting-bets", userId],
    queryFn: () => fetchJson<any[]>(`/api/betting/bets/${userId}`),
    staleTime: 30000,
  });

  const pendingBets = Array.isArray(bets) ? bets.filter((b: any) => b?.status === "pending") : [];
  const profit = Number(account?.totalProfit) || 0;

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
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const userId = user?.id || "default";
  const primarySport = preferences.favoriteSports[0] || "basketball";

  // Read local roster count across all sports
  let totalPlayers = 0;
  let sportsWithRoster = 0;
  try {
    const raw = localStorage.getItem(`fantasy_rosters_v2_${userId}`);
    if (raw) {
      const all = JSON.parse(raw);
      Object.keys(all).forEach(s => {
        if (Array.isArray(all[s]) && all[s].length > 0) {
          totalPlayers += all[s].length;
          sportsWithRoster += 1;
        }
      });
    }
  } catch {}

  const { data: injured } = useQuery({
    queryKey: ["/api/fantasy/injured", primarySport],
    queryFn: () => fetchJson<any[]>(`/api/fantasy/injured?sport=${primarySport}`),
    staleTime: 300000,
  });

  const injuryAlerts = Array.isArray(injured) ? injured.slice(0, 2) : [];

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
              <p className="text-xs text-muted-foreground">My Teams</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">Players</p>
            <p className="text-sm font-bold text-foreground num">{totalPlayers}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">Sports</p>
            <p className="text-sm font-bold text-foreground num">{sportsWithRoster}</p>
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
  const { preferences } = useUserPreferences();
  const primarySport = preferences.favoriteSports[0] || "basketball";

  const { data: teams } = useQuery({
    queryKey: ["/api/analyst/teams", primarySport],
    queryFn: () => fetchJson<any[]>(`/api/analyst/teams?sport=${primarySport}`),
    staleTime: 300000,
  });

  const teamCount = Array.isArray(teams) ? teams.length : 0;
  const sportLabel = primarySport === "basketball" ? "NBA" :
                     primarySport === "football" ? "NFL" :
                     primarySport === "soccer" ? "EPL" :
                     primarySport === "baseball" ? "MLB" :
                     primarySport === "hockey" ? "NHL" : "";

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
              <p className="text-xs text-muted-foreground">{sportLabel} Research</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">Teams</p>
            <p className="text-sm font-bold text-foreground num">{teamCount}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-xs text-muted-foreground">League</p>
            <p className="text-sm font-bold text-foreground">{sportLabel}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-muted-foreground">
          <Target className="w-3 h-3" />
          <span className="text-xs">Compare teams &amp; players</span>
        </div>
      </a>
    </Link>
  );
}

export default function AppSummaries() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground text-lg">My Apps</h2>
        <Link href="/apps">
          <a className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </a>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BettingSummary />
        <FantasySummary />
        <AnalystSummary />
      </div>
    </div>
  );
}
