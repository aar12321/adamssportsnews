import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target, RotateCcw, ChevronLeft,
  BarChart2, Trophy, CheckCircle2, XCircle, Clock, AlertCircle, Flame, Search,
  Trash2, TrendingUp, TrendingDown, DollarSign, ArrowUpDown, ChevronUp, ChevronDown,
  Calendar, Zap, Loader2, Info
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { APP_SPORTS, getUserAppSports } from "@shared/appSports";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
const SPORT_GAMES: Record<string, { home: string; away: string; league: string }[]> = {
  basketball: [
    { home: "Boston Celtics", away: "Oklahoma City Thunder", league: "NBA" },
    { home: "Denver Nuggets", away: "Cleveland Cavaliers", league: "NBA" },
    { home: "Miami Heat", away: "Golden State Warriors", league: "NBA" },
    { home: "LA Clippers", away: "Phoenix Suns", league: "NBA" },
  ],
  football: [
    { home: "Kansas City Chiefs", away: "Buffalo Bills", league: "NFL" },
    { home: "Philadelphia Eagles", away: "Dallas Cowboys", league: "NFL" },
    { home: "Baltimore Ravens", away: "San Francisco 49ers", league: "NFL" },
  ],
  soccer: [
    { home: "Manchester City", away: "Arsenal", league: "Premier League" },
    { home: "Liverpool", away: "Real Madrid", league: "Champions League" },
  ],
};

type GameRow = {
  id?: string;
  home: string;
  away: string;
  league: string;
  startTime?: string;
  status?: string;
};

function WinProbabilityBar({ homeTeam, awayTeam, homeProb, awayProb }: {
  homeTeam: string; awayTeam: string; homeProb: number; awayProb: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium text-muted-foreground">
        <span className="truncate max-w-[45%]">{homeTeam}</span>
        <span className="text-muted-foreground/60">vs</span>
        <span className="truncate max-w-[45%] text-right">{awayTeam}</span>
      </div>
      <div className="relative h-4 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${homeProb * 100}%` }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-destructive/70 rounded-full transition-all duration-700"
          style={{ width: `${awayProb * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-sm font-bold">
        <span className="text-primary num">{(homeProb * 100).toFixed(1)}%</span>
        <span className="text-destructive/70 num">{(awayProb * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "low" | "medium" | "high" }) {
  const config = {
    low: { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "Low Confidence" },
    medium: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", label: "Medium Confidence" },
    high: { color: "text-green-400 bg-green-500/10 border-green-500/20", label: "High Confidence" },
  };
  const { color, label } = config[confidence];
  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", color)}>
      {confidence === "high" && <Flame className="inline w-3 h-3 mr-1" />}
      {label}
    </span>
  );
}

const MemoizedAnalysisPanel = React.memo(AnalysisPanel);
const MemoizedAccountCard = React.memo(AccountCard);
const MemoizedBetHistoryList = React.memo(BetHistoryList);

function AiCommentary({ analysis, gameHasStarted }: { analysis: any; gameHasStarted: boolean }) {
  // Gate on the /api/ai/status probe so users never see a button that
  // just errors. Cached in React Query so it only fires once per mount.
  const { data: aiStatus } = useQuery({
    queryKey: ["/api/ai/status"],
    queryFn: () => fetchJson<{ enabled: boolean }>("/api/ai/status"),
    staleTime: 5 * 60_000,
  });
  const [text, setText] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/betting/ai-commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeam: analysis.homeTeam,
          awayTeam: analysis.awayTeam,
          sport: analysis.sport,
          eventId: analysis.eventId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "AI commentary unavailable");
      return data as { text: string };
    },
    onSuccess: (data) => setText(data.text),
  });

  // The probe is in flight — render a placeholder so the slot doesn't
  // shift around as the response lands.
  if (aiStatus === undefined) {
    return (
      <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/60 bg-muted/30 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Checking AI…</span>
      </div>
    );
  }

  // AI not configured server-side. Don't pretend the button works —
  // show a disabled affordance so the user knows the feature exists
  // but needs setup, instead of having it silently disappear.
  if (!aiStatus.enabled) {
    return (
      <button
        type="button"
        disabled
        title="The server's ANTHROPIC_API_KEY isn't set, so AI takes are off. Ask your admin to configure it."
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/60 bg-muted/30 text-xs font-medium text-muted-foreground cursor-not-allowed"
      >
        <Zap className="w-3.5 h-3.5 opacity-60" />
        AI take unavailable
      </button>
    );
  }

  // Game's already started — same idea, no point asking for a pre-game take.
  if (gameHasStarted) return null;

  if (text) {
    return (
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
          <Zap className="w-3 h-3" /> AI take
        </div>
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
        <button
          type="button"
          onClick={() => { setText(null); mutation.reset(); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-primary/20 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Zap className="w-3.5 h-3.5" />
        {mutation.isPending
          ? "Thinking…"
          : mutation.isError
            ? "Try AI take again"
            : "Ask the AI for a take"}
      </button>
      {mutation.isError && (
        <p className="text-[11px] text-orange-400 text-center" role="alert">
          {(mutation.error as Error)?.message || "AI is temporarily unavailable. Try again."}
        </p>
      )}
    </div>
  );
}

type Pick =
  | { kind: "moneyline"; team: "home" | "away" }
  | { kind: "spread"; team: "home" | "away" }
  | { kind: "over_under"; side: "over" | "under" };

function AnalysisPanel({ analysis, game, onPlaceBet, isPlacing }: { analysis: any; game: GameRow; onPlaceBet: (bet: any) => void; isPlacing?: boolean }) {
  const oddsLabel =
    analysis.oddsSource === "sportsbook"
      ? "Lines from sportsbook (The Odds API)"
      : "Lines from internal model";
  const [pick, setPick] = useState<Pick>({ kind: "moneyline", team: analysis.homeWinProbability > 0.5 ? "home" : "away" });
  const [stake, setStake] = useState(50);

  const formatOdds = (odds: number) => odds > 0 ? `+${odds}` : `${odds}`;

  const getOdds = () => {
    if (pick.kind === "moneyline") {
      return pick.team === "home" ? analysis.homeMoneyline : analysis.awayMoneyline;
    }
    return -110;
  };

  const calculatePayout = () => {
    const odds = getOdds();
    if (odds > 0) return stake + (stake * odds / 100);
    return stake + (stake / (Math.abs(odds) / 100));
  };

  const getWinProb = () => {
    if (pick.kind === "moneyline") {
      return pick.team === "home" ? analysis.homeWinProbability : analysis.awayWinProbability;
    }
    return 0.5;
  };

  const pickDescription = () => {
    if (pick.kind === "moneyline") {
      const name = pick.team === "home" ? analysis.homeTeam : analysis.awayTeam;
      return `${name} to win`;
    }
    if (pick.kind === "spread") {
      const name = pick.team === "home" ? analysis.homeTeam : analysis.awayTeam;
      const homeSp = analysis.recommendedSpread;
      const line = pick.team === "home" ? homeSp : -homeSp;
      return `${name} ${line > 0 ? "+" : ""}${line}`;
    }
    return `${pick.side === "over" ? "Over" : "Under"} ${analysis.recommendedOverUnder}`;
  };

  const handlePlaceBet = () => {
    const homeSp = analysis.recommendedSpread;
    onPlaceBet({
      gameId: analysis.gameId,
      homeTeam: analysis.homeTeam,
      awayTeam: analysis.awayTeam,
      sport: analysis.sport,
      betType: pick.kind,
      selectedTeam:
        pick.kind === "moneyline"
          ? pick.team === "home" ? analysis.homeTeam : analysis.awayTeam
          : pick.kind === "spread"
          ? pick.team === "home" ? analysis.homeTeam : analysis.awayTeam
          : undefined,
      amount: stake,
      odds: getOdds(),
      spread: pick.kind === "spread" ? (pick.team === "home" ? homeSp : -homeSp) : undefined,
      overUnder: pick.kind === "over_under" ? analysis.recommendedOverUnder : undefined,
      isOver: pick.kind === "over_under" ? pick.side === "over" : undefined,
      winProbability: getWinProb(),
      gameStartTime: game.startTime,
    });
  };

  const gameStart = game.startTime ? new Date(game.startTime) : null;
  const hasStarted = gameStart ? gameStart.getTime() <= Date.now() : false;

  return (
    <div className="glass-card p-5 space-y-5">
      {/* Matchup header */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">{game.league}</p>
        <h3 className="text-lg font-bold text-foreground">{analysis.awayTeam} @ {analysis.homeTeam}</h3>
        {gameStart && (
          <p className="text-xs text-muted-foreground">
            {gameStart.toLocaleString(undefined, {
              weekday: "short", month: "short", day: "numeric",
              hour: "numeric", minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {hasStarted && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-400">This game has already started — betting closed.</p>
        </div>
      )}

      {/* Step 1: Pick your bet (team cards) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
          <p className="text-sm font-semibold text-foreground">Pick a team to win</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Away team card */}
          <button
            onClick={() => setPick({ kind: "moneyline", team: "away" })}
            disabled={hasStarted}
            className={cn(
              "p-4 rounded-xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed",
              pick.kind === "moneyline" && pick.team === "away"
                ? "bg-primary/15 border-primary ring-2 ring-primary/40"
                : "bg-muted/30 border-border hover:border-primary/30"
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">AWAY</p>
            <p className="text-sm font-bold text-foreground truncate">{analysis.awayTeam}</p>
            <p className="text-xs text-muted-foreground">{analysis.awayRecord || "—"}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Moneyline</span>
              <span className={cn("text-base font-bold num", analysis.awayMoneyline < 0 ? "text-green-400" : "text-primary")}>
                {formatOdds(analysis.awayMoneyline)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(analysis.awayWinProbability * 100).toFixed(0)}% win chance
            </p>
          </button>

          {/* Home team card */}
          <button
            onClick={() => setPick({ kind: "moneyline", team: "home" })}
            disabled={hasStarted}
            className={cn(
              "p-4 rounded-xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed",
              pick.kind === "moneyline" && pick.team === "home"
                ? "bg-primary/15 border-primary ring-2 ring-primary/40"
                : "bg-muted/30 border-border hover:border-primary/30"
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">HOME</p>
            <p className="text-sm font-bold text-foreground truncate">{analysis.homeTeam}</p>
            <p className="text-xs text-muted-foreground">{analysis.homeRecord || "—"}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Moneyline</span>
              <span className={cn("text-base font-bold num", analysis.homeMoneyline < 0 ? "text-green-400" : "text-primary")}>
                {formatOdds(analysis.homeMoneyline)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(analysis.homeWinProbability * 100).toFixed(0)}% win chance
            </p>
          </button>
        </div>
      </div>

      {/* Other markets: spread + over/under */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Other Markets</p>
        <div className="space-y-2">
          {/* Spread row */}
          {analysis.recommendedSpread != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Point Spread</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPick({ kind: "spread", team: "away" })}
                  disabled={hasStarted}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed",
                    pick.kind === "spread" && pick.team === "away"
                      ? "bg-primary/15 border-primary"
                      : "bg-muted/20 border-border hover:border-primary/30"
                  )}
                >
                  <p className="text-xs text-muted-foreground truncate">{analysis.awayTeam}</p>
                  <p className="text-sm font-bold text-foreground num">
                    {-analysis.recommendedSpread > 0 ? "+" : ""}{-analysis.recommendedSpread} <span className="text-xs text-muted-foreground">(-110)</span>
                  </p>
                </button>
                <button
                  onClick={() => setPick({ kind: "spread", team: "home" })}
                  disabled={hasStarted}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed",
                    pick.kind === "spread" && pick.team === "home"
                      ? "bg-primary/15 border-primary"
                      : "bg-muted/20 border-border hover:border-primary/30"
                  )}
                >
                  <p className="text-xs text-muted-foreground truncate">{analysis.homeTeam}</p>
                  <p className="text-sm font-bold text-foreground num">
                    {analysis.recommendedSpread > 0 ? "+" : ""}{analysis.recommendedSpread} <span className="text-xs text-muted-foreground">(-110)</span>
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Over/Under row */}
          {analysis.recommendedOverUnder != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Total Points ({analysis.recommendedOverUnder})</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPick({ kind: "over_under", side: "over" })}
                  disabled={hasStarted}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                    pick.kind === "over_under" && pick.side === "over"
                      ? "bg-primary/15 border-primary"
                      : "bg-muted/20 border-border hover:border-primary/30"
                  )}
                >
                  <ChevronUp className="w-4 h-4 text-green-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Over {analysis.recommendedOverUnder}</p>
                    <p className="text-xs text-muted-foreground">-110</p>
                  </div>
                </button>
                <button
                  onClick={() => setPick({ kind: "over_under", side: "under" })}
                  disabled={hasStarted}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                    pick.kind === "over_under" && pick.side === "under"
                      ? "bg-primary/15 border-primary"
                      : "bg-muted/20 border-border hover:border-primary/30"
                  )}
                >
                  <ChevronDown className="w-4 h-4 text-red-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Under {analysis.recommendedOverUnder}</p>
                    <p className="text-xs text-muted-foreground">-110</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis insights (collapsible-style, compact) */}
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer list-none">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">View Analysis</span>
            <ConfidenceBadge confidence={analysis.confidence} />
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-3 space-y-3">
          <WinProbabilityBar
            homeTeam={analysis.homeTeam}
            awayTeam={analysis.awayTeam}
            homeProb={analysis.homeWinProbability}
            awayProb={analysis.awayWinProbability}
          />
          <div className="space-y-1.5">
            {analysis.keyFactors?.slice(0, 3).map((factor: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                {factor}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{analysis.analysis}</p>
          <p className="text-[10px] text-muted-foreground/70 italic">{oddsLabel}</p>
        </div>
      </details>

      {/* AI commentary — lazy, user-initiated so we don't pay tokens per view */}
      <AiCommentary analysis={analysis} gameHasStarted={hasStarted} />

      {/* Step 2: Bet slip */}
      {!hasStarted && (
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
            <p className="text-sm font-semibold text-foreground">Your bet</p>
          </div>

          {/* Bet slip summary */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs text-muted-foreground">You picked</p>
            <p className="text-sm font-bold text-foreground">{pickDescription()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Odds: <span className="font-semibold text-foreground num">{formatOdds(getOdds())}</span> · Win chance: <span className="font-semibold text-foreground">{(getWinProb() * 100).toFixed(0)}%</span>
            </p>
          </div>

          {/* Stake chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Stake</p>
              <p className="text-[11px] text-muted-foreground">$1 – $10,000</p>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {[10, 25, 50, 100, 250].map(amount => (
                <button key={amount}
                  type="button"
                  onClick={() => setStake(amount)}
                  className={cn("py-2 rounded-lg text-xs font-semibold transition-all border",
                    stake === amount
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"
                  )}>
                  ${amount}
                </button>
              ))}
            </div>
            {/* Custom amount — coexists with the chips so the user can
                land on any whole-dollar value without leaving the slip. */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                step={1}
                value={stake}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === "") { setStake(0); return; }
                  const n = Math.floor(Number(raw));
                  if (!Number.isFinite(n) || n < 0) return;
                  // Cap at $10k so a stray zero doesn't try to place an
                  // impossible bet — the server caps at balance, this just
                  // keeps the slider out of nonsense range.
                  setStake(Math.min(n, 10000));
                }}
                aria-label="Custom stake amount"
                className="w-full h-10 pl-7 pr-3 bg-input border border-border rounded-lg text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all num"
              />
            </div>
          </div>

          {/* Potential payout + place bet */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">To win</p>
              <p className="text-lg font-bold text-green-400 num">+${(calculatePayout() - stake).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total payout: ${calculatePayout().toFixed(2)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handlePlaceBet}
                disabled={isPlacing || hasStarted || stake < 1}
                className="btn-primary whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                title={
                  hasStarted ? "Game already started — betting closed"
                  : stake < 1 ? "Stake must be at least $1"
                  : undefined
                }
              >
                {isPlacing ? "Placing…" : `Place $${stake} Bet`}
              </button>
              {(hasStarted || stake < 1) && (
                <p className="text-[11px] text-muted-foreground" role="status">
                  {hasStarted ? "Betting closed for this game" : "Enter a stake of at least $1"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, onReset, isResetting }: { account: any; onReset: () => void; isResetting?: boolean }) {
  const profit = Number(account?.totalProfit) || 0;
  const isUp = profit >= 0;

  const handleReset = () => {
    // Reset wipes the user's mock balance, history, and stats. Confirm
    // before destroying state so a stray click can't lose all bet history.
    if (typeof window !== "undefined" && !window.confirm("Reset your mock account? This clears your $10,000 balance and all bet history.")) {
      return;
    }
    onReset();
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">Mock Account</h3>
        <button
          onClick={handleReset}
          disabled={isResetting}
          title="Clears your $10,000 balance and all bet history"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-destructive border border-destructive/20 bg-destructive/5 hover:bg-destructive/15 hover:border-destructive/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RotateCcw className={cn("w-3.5 h-3.5", isResetting && "animate-spin")} />
          {isResetting ? "Resetting…" : "Reset account"}
        </button>
      </div>
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">Balance</p>
        <p className="text-3xl font-bold text-foreground num">${(account?.balance || 10000).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className={cn("text-sm font-semibold num", isUp ? "text-green-400" : "text-red-400")}>
            {isUp ? "+" : ""}{profit.toFixed(2)} ({account?.roi?.toFixed(1) || "0.0"}% ROI)
          </p>
          {(() => {
            const streak = Number(account?.currentStreak) || 0;
            if (streak === 0) return null;
            const isHot = streak > 0;
            return (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold border",
                isHot
                  ? "text-green-400 bg-green-500/10 border-green-500/20"
                  : "text-red-400 bg-red-500/10 border-red-500/20"
              )}>
                {isHot ? <Flame className="inline w-3 h-3 mr-1" /> : <TrendingDown className="inline w-3 h-3 mr-1" />}
                {Math.abs(streak)} in a row {isHot ? "won" : "lost"}
              </span>
            );
          })()}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Bets", value: account?.totalBets || 0 },
          { label: "Won", value: account?.wonBets || 0, color: "text-green-400" },
          { label: "Lost", value: account?.lostBets || 0, color: "text-red-400" },
          { label: "Win %", value: `${((account?.winRate || 0) * 100).toFixed(0)}%` },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-muted/50 rounded-xl p-2.5 text-center">
            <p className={cn("text-sm font-bold num", color || "text-foreground")}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BetHistoryList({ bets, onCancel, cancellingBetId }: { bets: any[]; onCancel?: (betId: string) => void; cancellingBetId?: string | null }) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "won" | "lost">("all");

  if (bets.length === 0) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Target className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">No bets yet</h3>
          <p className="text-xs text-muted-foreground mt-1">Select a game above and place your first mock bet. Results will be auto-settled based on win probability.</p>
        </div>
      </div>
    );
  }

  // Analytics summary
  const settled = bets.filter(b => b.status === "won" || b.status === "lost");
  const won = bets.filter(b => b.status === "won");
  const lost = bets.filter(b => b.status === "lost");
  const pending = bets.filter(b => b.status === "pending");
  const totalWagered = settled.reduce((s: number, b: any) => s + b.amount, 0);
  const totalWon = won.reduce((s: number, b: any) => s + (b.potentialPayout - b.amount), 0);
  const totalLost = lost.reduce((s: number, b: any) => s + b.amount, 0);
  const netProfit = totalWon - totalLost;
  const biggestWin = won.reduce((max: number, b: any) => Math.max(max, b.potentialPayout - b.amount), 0);

  // Sort by placed date (newest first)
  const sortedBets = [...bets].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  // Apply filter
  const filteredBets = filter === "all" ? sortedBets : sortedBets.filter(b => b.status === filter);
  const displayBets = showAll ? filteredBets : filteredBets.slice(0, 15);

  return (
    <div className="space-y-3">
      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="glass-card p-3 text-center">
          <p className={cn("text-lg font-bold num", netProfit >= 0 ? "text-green-400" : "text-red-400")}>
            {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">Net P/L</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-foreground num">{settled.length > 0 ? `${((won.length / settled.length) * 100).toFixed(0)}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Win Rate</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-green-400 num">${biggestWin.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Best Win</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-yellow-400 num">{pending.length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tab-bar">
        {[
          { key: "all", label: `All (${bets.length})` },
          { key: "pending", label: `Pending (${pending.length})` },
          { key: "won", label: `Won (${won.length})` },
          { key: "lost", label: `Lost (${lost.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={cn("tab-item text-xs", filter === key && "active")}
            onClick={() => { setFilter(key as typeof filter); setShowAll(false); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bet list */}
      <div className="space-y-2">
        {displayBets.length === 0 && (
          <div className="glass-card p-6 text-center">
            <p className="text-xs text-muted-foreground">No {filter === "all" ? "" : filter} bets</p>
          </div>
        )}
        {displayBets.map(bet => {
          const profit = bet.potentialPayout - bet.amount;
          const placedDate = new Date(bet.placedAt);
          const settledDate = bet.settledAt ? new Date(bet.settledAt) : null;
          return (
            <div key={bet.id} className={cn(
              "glass-card p-4 space-y-2",
              bet.status === "won" && "border-green-500/30",
              bet.status === "lost" && "border-red-500/30",
              bet.status === "pending" && "border-yellow-500/30"
            )}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {bet.status === "won" && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    {bet.status === "lost" && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    {bet.status === "pending" && <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                    {bet.status === "cancelled" && <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <span className="text-sm font-semibold text-foreground truncate">
                      {bet.awayTeam} @ {bet.homeTeam}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-muted/50 rounded text-xs font-medium text-muted-foreground capitalize">
                      {bet.betType.replace("_", "/")}
                    </span>
                    {bet.selectedTeam && (
                      <span className="px-2 py-0.5 bg-primary/10 rounded text-xs font-medium text-primary">
                        {bet.selectedTeam}
                      </span>
                    )}
                    {bet.isOver !== undefined && (
                      <span className="px-2 py-0.5 bg-primary/10 rounded text-xs font-medium text-primary">
                        {bet.isOver ? `Over ${bet.overUnder}` : `Under ${bet.overUnder}`}
                      </span>
                    )}
                    {bet.spread !== undefined && bet.betType === "spread" && (
                      <span className="px-2 py-0.5 bg-primary/10 rounded text-xs font-medium text-primary">
                        {bet.spread > 0 ? "+" : ""}{bet.spread}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-base font-bold num",
                    bet.status === "won" ? "text-green-400" :
                    bet.status === "lost" ? "text-red-400" :
                    "text-muted-foreground"
                  )}>
                    {bet.status === "won" ? `+$${profit.toFixed(2)}` :
                     bet.status === "lost" ? `-$${bet.amount.toFixed(2)}` :
                     bet.status === "pending" ? `$${bet.potentialPayout.toFixed(2)}` :
                     `$${bet.amount.toFixed(2)}`}
                  </p>
                  <p className={cn("text-xs font-medium capitalize",
                    bet.status === "won" ? "text-green-400/70" :
                    bet.status === "lost" ? "text-red-400/70" :
                    bet.status === "pending" ? "text-yellow-400/70" :
                    "text-muted-foreground"
                  )}>
                    {bet.status === "pending" ? "To Win" : bet.status}
                  </p>
                </div>
              </div>

              {/* Detail row */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Stake: <span className="font-semibold text-foreground num">${bet.amount}</span></span>
                  <span>Odds: <span className="font-semibold text-foreground num">{bet.odds > 0 ? "+" : ""}{bet.odds}</span></span>
                  <span>{Math.round((bet.winProbability || 0.5) * 100)}% chance</span>
                </div>
                {bet.status === "pending" && onCancel && (
                  <button
                    onClick={() => onCancel(bet.id)}
                    disabled={cancellingBetId === bet.id}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Cancel bet"
                  >
                    <Trash2 className="w-3 h-3" />
                    {cancellingBetId === bet.id ? "Cancelling…" : "Cancel"}
                  </button>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70 flex-wrap">
                <span><Calendar className="inline w-3 h-3 mr-0.5" /> Placed {placedDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                {bet.gameStartTime && !settledDate && (
                  <span>Game {new Date(bet.gameStartTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                )}
                {settledDate && (
                  <span>Settled {settledDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                )}
              </div>

              {/* Pending bet status message */}
              {bet.status === "pending" && bet.gameStartTime && (() => {
                const start = new Date(bet.gameStartTime).getTime();
                const end = bet.gameEndTime ? new Date(bet.gameEndTime).getTime() : start + 3 * 60 * 60 * 1000;
                const now = Date.now();
                if (now < start) {
                  return (
                    <p className="text-xs text-yellow-400/80 italic">
                      Waiting for game to start ({Math.max(0, Math.round((start - now) / 60000))}m)
                    </p>
                  );
                }
                if (now < end) {
                  return (
                    <p className="text-xs text-yellow-400/80 italic">
                      Game in progress — will settle when finished
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-muted-foreground italic">
                    Game finished — settlement pending
                  </p>
                );
              })()}

              {bet.result && (
                <p className={cn("text-xs font-medium",
                  bet.status === "won" ? "text-green-400" :
                  bet.status === "lost" ? "text-red-400" : "text-muted-foreground"
                )}>
                  {bet.result}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {filteredBets.length > 15 && !showAll && (
        <button onClick={() => setShowAll(true)} className="btn-ghost w-full text-xs">
          Show all {filteredBets.length} bets
        </button>
      )}
    </div>
  );
}

export default function BettingApp() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const userId = user?.id || "default";
  const userSports = useMemo(() => getUserAppSports(preferences.favoriteSports), [preferences.favoriteSports]);
  const [selectedSport, setSelectedSport] = useState(userSports[0]?.id || "basketball");
  const [selectedGame, setSelectedGame] = useState<GameRow | null>(null);
  const [gameSearch, setGameSearch] = useState("");
  const debouncedGameSearch = useDebouncedValue(gameSearch, 300);
  const [activeTab, setActiveTab] = useState<"analyze" | "mybets">("analyze");
  const qc = useQueryClient();

  // If the selected sport isn't in user's favorites, reset to first fav
  useEffect(() => {
    if (!userSports.some(s => s.id === selectedSport)) {
      setSelectedSport(userSports[0]?.id || "basketball");
    }
  }, [userSports, selectedSport]);

  const {
    data: scheduleData,
    isLoading: loadingSchedule,
    isError: scheduleError,
    refetch: refetchSchedule,
  } = useQuery({
    queryKey: ["/api/betting/schedule", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/betting/schedule?sport=${selectedSport}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load schedule");
      return data;
    },
    staleTime: 60_000,
    retry: 2,
  });

  // Lower-case favourites for cheap substring matching during sort/highlight.
  const favoriteTeamsLower = useMemo(
    () => (preferences.favoriteTeams || []).map(t => t.toLowerCase()),
    [preferences.favoriteTeams]
  );
  const isFavoriteGame = useCallback((g: GameRow) => {
    if (!favoriteTeamsLower.length) return false;
    const home = g.home.toLowerCase();
    const away = g.away.toLowerCase();
    return favoriteTeamsLower.some(f => home.includes(f) || away.includes(f) || f.includes(home) || f.includes(away));
  }, [favoriteTeamsLower]);

  const displayGames: GameRow[] = useMemo(() => {
    const raw = scheduleData?.games as
      | { id: string; homeTeam: string; awayTeam: string; league: string; startTime?: string; status?: string }[]
      | undefined;
    const now = Date.now();
    const mapped: GameRow[] = raw?.length
      ? raw.map((g) => ({
          id: g.id,
          home: g.homeTeam,
          away: g.awayTeam,
          league: g.league,
          startTime: g.startTime,
          status: g.status,
        }))
      : (SPORT_GAMES[selectedSport] || []);

    // Only show upcoming games: not finished, and starting in the future
    const upcoming = mapped.filter((g) => {
      if (g.status === "finished") return false;
      if (g.startTime) {
        const start = new Date(g.startTime).getTime();
        if (!isNaN(start) && start <= now) return false; // already started or in the past
      }
      return true;
    });
    // Float games involving the user's favourite teams to the top,
    // preserving start-time order within each group.
    return upcoming
      .slice()
      .sort((a, b) => {
        const fa = isFavoriteGame(a) ? 0 : 1;
        const fb = isFavoriteGame(b) ? 0 : 1;
        if (fa !== fb) return fa - fb;
        const ta = a.startTime ? new Date(a.startTime).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.startTime ? new Date(b.startTime).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      });
  }, [scheduleData, selectedSport, isFavoriteGame]);

  const filteredGames = useMemo(() => {
    const q = debouncedGameSearch.trim().toLowerCase();
    if (!q) return displayGames;
    return displayGames.filter(
      (g) =>
        g.home.toLowerCase().includes(q) ||
        g.away.toLowerCase().includes(q) ||
        g.league.toLowerCase().includes(q)
    );
  }, [displayGames, debouncedGameSearch]);

  useEffect(() => {
    setSelectedGame(null);
    setGameSearch("");
  }, [selectedSport]);

  const {
    data: analysis,
    isLoading: analyzing,
    isError: analysisError,
    error: analysisQueryError,
  } = useQuery({
    queryKey: ["/api/betting/analyze", selectedSport, selectedGame?.id, selectedGame?.home, selectedGame?.away],
    queryFn: async () => {
      if (!selectedGame) return null;
      const res = await fetch("/api/betting/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeTeam: selectedGame.home,
          awayTeam: selectedGame.away,
          sport: selectedSport,
          eventId: selectedGame.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis request failed");
      if (data.error) throw new Error(data.error);
      return data;
    },
    enabled: !!selectedGame,
    staleTime: 120_000,
    retry: 1,
  });

  const { data: account } = useQuery({
    queryKey: ["betting-account", userId],
    queryFn: () => fetchJson<any>(`/api/betting/account/${userId}`),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const { data: bets } = useQuery({
    queryKey: ["betting-bets", userId],
    queryFn: () => fetchJson<any[]>(`/api/betting/bets/${userId}`),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const { data: trending } = useQuery({
    queryKey: ["/api/betting/trending"],
    queryFn: () => fetchJson<any[]>("/api/betting/trending"),
  });

  const pendingBetsCount = useMemo(() => {
    if (!Array.isArray(bets)) return 0;
    return bets.filter((b: any) => b?.status === "pending").length;
  }, [bets]);

  const placeBetMutation = useMutation({
    mutationFn: async (betData: any) => {
      const res = await fetch(`/api/betting/bets/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(betData),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Failed to place bet (HTTP ${res.status})`);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["betting-account", userId] });
      qc.invalidateQueries({ queryKey: ["betting-bets", userId] });
      setActiveTab("mybets");
    },
  });

  const cancelBetMutation = useMutation({
    mutationFn: async (betId: string) => {
      const res = await fetch(`/api/betting/bets/${userId}/${betId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Failed to cancel bet (HTTP ${res.status})`);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["betting-account", userId] });
      qc.invalidateQueries({ queryKey: ["betting-bets", userId] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/betting/account/${userId}/reset`, { method: "POST" });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `Failed to reset account (HTTP ${res.status})`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["betting-account", userId] });
      qc.invalidateQueries({ queryKey: ["betting-bets", userId] });
    },
  });

  // Track which bet ID is currently being cancelled so we can disable just
  // that row's button (rather than every Cancel button on the page).
  const cancellingBetId =
    cancelBetMutation.isPending && typeof cancelBetMutation.variables === "string"
      ? (cancelBetMutation.variables as string)
      : null;

  const handlePlaceBet = useCallback((bet: any) => {
    if (placeBetMutation.isPending) return; // guard against double-submit
    placeBetMutation.mutate(bet);
  }, [placeBetMutation]);

  const handleReset = useCallback(() => {
    if (resetMutation.isPending) return;
    resetMutation.mutate();
  }, [resetMutation]);

  const handleCancelBet = useCallback((betId: string) => {
    if (cancelBetMutation.isPending) return;
    cancelBetMutation.mutate(betId);
  }, [cancelBetMutation]);

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/apps">
          <a className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </a>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">Sports Betting</span>
          </h1>
          <p className="text-sm text-muted-foreground">Live schedule · model + optional book lines · mock bankroll</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Account + controls */}
        <div className="space-y-4">
          <MemoizedAccountCard account={account} onReset={handleReset} isResetting={resetMutation.isPending} />

          {/* Sport selector */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground">Matchups</h3>
              {scheduleData?.games?.length ? (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider text-green-400/90 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  title="Live games and start times pulled from ESPN's public schedule. Lines come from your configured sportsbook (or our internal model when none is set)."
                >
                  Live · ESPN
                </span>
              ) : (
                <span
                  className="text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  title="No real games on the schedule right now (off-day or feed unavailable). We're showing sample matchups so you can still try the workflow — they're not real games."
                >
                  <Info className="w-2.5 h-2.5" /> Sample games
                </span>
              )}
            </div>
            {scheduleError && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <span>Couldn&apos;t load schedule</span>
                <button type="button" className="underline font-medium" onClick={() => refetchSchedule()}>
                  Retry
                </button>
              </div>
            )}
            <div className="tab-bar">
              {userSports.map((s) => (
                <button
                  key={s.id}
                  className={cn("tab-item text-xs", selectedSport === s.id && "active")}
                  onClick={() => setSelectedSport(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search matchups..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                className="input-field pl-9 py-2 text-xs"
              />
            </div>
            <div className="space-y-2 max-h-[min(360px,50vh)] overflow-y-auto pr-1">
              {loadingSchedule && (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
                  ))}
                </div>
              )}
              {!loadingSchedule && filteredGames.map((game) => {
                const isFav = isFavoriteGame(game);
                return (
                  <button
                    key={game.id || `${game.home}-${game.away}-${game.startTime || ""}`}
                    onClick={() => setSelectedGame(game)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all",
                      selectedGame?.home === game.home && selectedGame?.away === game.away
                        ? "bg-primary/15 border-primary/40 text-foreground"
                        : isFav
                          ? "bg-primary/5 border-primary/30 text-foreground hover:border-primary/50"
                          : "bg-muted/30 border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-primary">{game.league}</p>
                      {isFav && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 rounded-full px-1.5 py-0.5">
                          ★ Following
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium">{game.away}</p>
                    <p className="text-xs text-muted-foreground">@ {game.home}</p>
                    {game.startTime && (
                      <p className="text-[10px] text-muted-foreground/80 mt-1 num">
                        {new Date(game.startTime).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {game.status ? ` · ${game.status}` : ""}
                      </p>
                    )}
                  </button>
                );
              })}
              {!loadingSchedule && filteredGames.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {gameSearch.trim() ? "No games match your search" : "No upcoming games for this league"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Analysis + Bets */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="tab-bar">
            <button className={cn("tab-item", activeTab === "analyze" && "active")}
              onClick={() => setActiveTab("analyze")}>
              <span className="flex items-center justify-center gap-1.5">
                <BarChart2 className="w-4 h-4" />
                Analysis
              </span>
            </button>
            <button className={cn("tab-item", activeTab === "mybets" && "active")}
              onClick={() => setActiveTab("mybets")}>
              <span className="flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" />
                My Bets
                {pendingBetsCount > 0 && (
                  <span className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5 rounded-full">
                    {pendingBetsCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          {activeTab === "analyze" && (
            <>
              {!selectedGame ? (
                <div className="glass-card p-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Select a Game</h3>
                    <p className="text-sm text-muted-foreground mt-1">Choose a matchup from the left to see win probabilities, spread recommendations, and place mock bets.</p>
                  </div>
                  {/* Trending bets */}
                  {trending && trending.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        Trending Bets
                      </p>
                      {trending.slice(0, 3).map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl">
                          <div className="text-left">
                            <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{t.betType}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.game}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-primary font-bold">{t.popularity}% pop</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : analyzing ? (
                <div className="glass-card p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Building your edge</p>
                    <p className="text-xs text-muted-foreground mt-1">Merging model projections with market data…</p>
                  </div>
                  <Skeleton className="h-24 w-full rounded-xl max-w-md mx-auto" />
                </div>
              ) : analysisError ? (
                <div className="glass-card p-6 text-center space-y-3 border-destructive/30">
                  <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                  <p className="text-sm font-medium text-foreground">Analysis unavailable</p>
                  <p className="text-xs text-muted-foreground">
                    {(analysisQueryError as Error)?.message || "Try another matchup or retry in a moment."}
                  </p>
                </div>
              ) : analysis ? (
                <MemoizedAnalysisPanel
                  key={analysis.gameId || `${selectedGame.home}-${selectedGame.away}`}
                  analysis={analysis}
                  game={selectedGame}
                  onPlaceBet={handlePlaceBet}
                  isPlacing={placeBetMutation.isPending}
                />
              ) : null}
              {placeBetMutation.isError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {(placeBetMutation.error as Error)?.message || "Failed to place bet"}
                </div>
              )}
              {placeBetMutation.isSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  Bet placed! Results will be available shortly.
                </div>
              )}
            </>
          )}

          {activeTab === "mybets" && (
            <MemoizedBetHistoryList
              bets={Array.isArray(bets) ? bets : []}
              onCancel={handleCancelBet}
              cancellingBetId={cancellingBetId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
