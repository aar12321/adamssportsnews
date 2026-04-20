import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface Bet {
  id: string;
  homeTeam: string;
  awayTeam: string;
  selectedTeam?: string;
  amount: number;
  potentialPayout: number;
  status: "pending" | "won" | "lost" | "push" | "cancelled";
  placedAt: string;
  gameStartTime?: string;
  gameEndTime?: string;
}

function soonest(bets: Bet[]): Bet | undefined {
  const withTime = bets
    .filter(b => b.gameStartTime)
    .slice()
    .sort((a, b) => new Date(a.gameStartTime!).getTime() - new Date(b.gameStartTime!).getTime());
  return withTime[0] || bets[0];
}

export default function PendingBetsCard() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data } = useQuery({
    queryKey: ["betting-bets", userId],
    queryFn: () => fetchJson<Bet[]>(`/api/betting/bets/${userId}`),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const pending = useMemo(() => {
    if (!Array.isArray(data)) return [] as Bet[];
    return data.filter(b => b.status === "pending");
  }, [data]);

  if (!user || pending.length === 0) return null;

  const totalStake = pending.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalWinnings = pending.reduce((sum, b) => sum + Math.max(0, (b.potentialPayout || 0) - (b.amount || 0)), 0);
  const next = soonest(pending);

  return (
    <Link href="/apps/betting">
      <a className="block glass-card p-4 hover:border-primary/40 transition-all group">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              <Clock className="inline w-3 h-3 mr-1" /> Pending bets
            </p>
            <p className="text-base font-bold text-foreground">
              {pending.length} open · ${totalStake.toFixed(0)} at stake
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Potential winnings <span className="text-green-400 font-semibold num">+${totalWinnings.toFixed(2)}</span>
              {next?.gameStartTime && (() => {
                const ms = new Date(next.gameStartTime).getTime() - Date.now();
                if (!Number.isFinite(ms)) return null;
                if (ms <= 0) return <> · next bet settling soon</>;
                const hours = Math.round(ms / 3_600_000);
                const minutes = Math.round(ms / 60_000);
                return <> · next in {hours >= 1 ? `${hours}h` : `${minutes}m`}</>;
              })()}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 mt-1" />
        </div>
      </a>
    </Link>
  );
}
