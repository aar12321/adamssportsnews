import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, ChevronLeft, Plus, Users, Share2, Copy, Check,
  Swords, Calendar, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import type { SportId } from "@shared/schema";

// -----------------------------------------------------------------------------
// Leagues: create, join by invite code, browse members, view weekly matchups,
// round-robin schedule. Owner-only actions gated on the server.
// -----------------------------------------------------------------------------

interface LeagueMember {
  leagueId: string;
  userId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  joinedAt: string;
}

interface League {
  id: string;
  name: string;
  sport: SportId;
  ownerId: string;
  maxMembers: number;
  inviteCode: string;
  currentWeek: number;
  startWeek: number;
  scoringFormat: string;
  createdAt: string;
  members: LeagueMember[];
  memberCount: number;
}

interface Matchup {
  id: string;
  leagueId: string;
  week: number;
  homeUserId: string;
  awayUserId: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "live" | "final";
}

const SPORT_NAMES: Record<string, string> = {
  basketball: "Basketball",
  football: "Football",
  soccer: "Soccer",
  baseball: "Baseball",
  hockey: "Hockey",
};

function formatRecord(m: LeagueMember): string {
  return m.ties > 0 ? `${m.wins}-${m.losses}-${m.ties}` : `${m.wins}-${m.losses}`;
}

export default function LeaguesApp() {
  const { user } = useAuth();
  const userId = user?.id;
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/apps" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Leagues</h1>
        </div>
        <div className="glass-card p-6 text-center">
          <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <p className="font-semibold mb-1">Sign in to manage leagues</p>
          <p className="text-sm text-muted-foreground">
            Leagues are tied to your account. Create one with friends or join with an invite code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/apps" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Fantasy Leagues</h1>
          <p className="text-xs text-muted-foreground">
            {selectedLeagueId ? "View standings, matchups, and roster." : "Create or join a league to play head-to-head."}
          </p>
        </div>
      </div>

      {selectedLeagueId ? (
        <LeagueDetail
          leagueId={selectedLeagueId}
          userId={userId}
          onBack={() => setSelectedLeagueId(null)}
        />
      ) : (
        <LeagueList userId={userId} onOpen={setSelectedLeagueId} />
      )}
    </div>
  );
}

// --- List + create/join ---------------------------------------------------

function LeagueList({ userId, onOpen }: { userId: string; onOpen: (id: string) => void }) {
  const { data: leagues, isLoading } = useQuery({
    queryKey: ["/api/leagues"],
    queryFn: () => fetchJson<League[]>("/api/leagues"),
  });

  return (
    <div className="space-y-4">
      <CreateOrJoinPanel />
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !leagues || leagues.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold mb-1">No leagues yet</p>
          <p className="text-sm text-muted-foreground">
            Create one above or paste an invite code.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leagues.map((l) => {
            const me = l.members.find((m) => m.userId === userId);
            return (
              <button
                key={l.id}
                onClick={() => onOpen(l.id)}
                className="glass-card p-4 w-full text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{l.name}</p>
                      {l.ownerId === userId && (
                        <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {SPORT_NAMES[l.sport] || l.sport} · Week {l.currentWeek} · {l.memberCount}/{l.maxMembers} members
                    </p>
                    {me && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{me.teamName}</span>
                        {" · "}{formatRecord(me)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateOrJoinPanel() {
  const [mode, setMode] = useState<"create" | "join">("create");
  return (
    <div className="glass-card p-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode("create")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium",
            mode === "create" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          Create
        </button>
        <button
          onClick={() => setMode("join")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium",
            mode === "join" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          Join
        </button>
      </div>
      {mode === "create" ? <CreateLeagueForm /> : <JoinLeagueForm />}
    </div>
  );
}

function CreateLeagueForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportId>("basketball");
  const [teamName, setTeamName] = useState("My Team");
  const [maxMembers, setMaxMembers] = useState(8);

  const create = useMutation({
    mutationFn: () =>
      apiRequest<League>("POST", "/api/leagues", { name, sport, teamName, maxMembers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      setName("");
    },
  });

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="League name"
        className="input-field w-full"
        maxLength={64}
      />
      <div className="flex gap-2">
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value as SportId)}
          className="input-field flex-1"
        >
          {Object.entries(SPORT_NAMES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={maxMembers}
          onChange={(e) => setMaxMembers(Number(e.target.value))}
          className="input-field flex-1"
        >
          {[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} teams</option>)}
        </select>
      </div>
      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder="Your team name"
        className="input-field w-full"
        maxLength={48}
      />
      <button
        onClick={() => create.mutate()}
        disabled={!name.trim() || create.isPending}
        className="btn-primary w-full disabled:opacity-50"
      >
        <Plus className="w-4 h-4 inline mr-1" />
        {create.isPending ? "Creating..." : "Create League"}
      </button>
      {create.error ? (
        <p className="text-xs text-red-400">{String(create.error.message || "Failed")}</p>
      ) : null}
    </div>
  );
}

function JoinLeagueForm() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("New Team");

  const join = useMutation({
    mutationFn: () =>
      apiRequest<League>("POST", "/api/leagues/join", { inviteCode: code, teamName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      setCode("");
    },
  });

  return (
    <div className="space-y-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Invite code (6 characters)"
        className="input-field w-full uppercase tracking-widest"
        maxLength={12}
      />
      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder="Your team name"
        className="input-field w-full"
        maxLength={48}
      />
      <button
        onClick={() => join.mutate()}
        disabled={!code.trim() || join.isPending}
        className="btn-primary w-full disabled:opacity-50"
      >
        <Users className="w-4 h-4 inline mr-1" />
        {join.isPending ? "Joining..." : "Join League"}
      </button>
      {join.error ? (
        <p className="text-xs text-red-400">{String(join.error.message || "Failed")}</p>
      ) : null}
    </div>
  );
}

// --- Detail view ----------------------------------------------------------

function LeagueDetail({
  leagueId,
  userId,
  onBack,
}: {
  leagueId: string;
  userId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"standings" | "matchups">("standings");
  const [copied, setCopied] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined);

  const { data: league } = useQuery({
    queryKey: ["/api/leagues", leagueId],
    queryFn: () => fetchJson<League>(`/api/leagues/${leagueId}`),
  });

  const { data: standings } = useQuery({
    queryKey: ["/api/leagues", leagueId, "standings"],
    queryFn: () => fetchJson<LeagueMember[]>(`/api/leagues/${leagueId}/standings`),
  });

  const week = selectedWeek ?? league?.currentWeek;
  const { data: matchupData } = useQuery({
    queryKey: ["/api/leagues", leagueId, "matchups", week],
    queryFn: () =>
      fetchJson<{ week: number; matchups: Matchup[] }>(
        week ? `/api/leagues/${leagueId}/matchups?week=${week}` : `/api/leagues/${leagueId}/matchups`,
      ),
    enabled: !!league,
  });

  // --- Supabase Realtime: auto-refresh standings + matchups when another
  // user's data changes (e.g. a league owner settles a week from a
  // different browser tab, or another member adds a player to their
  // roster changing the projected scores). No polling needed.
  useRealtimeTable("sports_fantasy_matchups", {
    filter: `league_id=eq.${leagueId}`,
    onInsert: () => queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "matchups"] }),
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "matchups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "standings"] });
    },
  });
  useRealtimeTable("sports_fantasy_league_members", {
    filter: `league_id=eq.${leagueId}`,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "standings"] });
    },
    onUpdate: () => queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "standings"] }),
  });

  const scheduleMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/leagues/${leagueId}/schedule`, { weeks: 14 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "matchups"] });
    },
  });

  const settleMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/leagues/${leagueId}/settle`, { week }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "standings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leagues", leagueId, "matchups"] });
    },
  });

  if (!league) return <Skeleton className="h-40 w-full" />;

  const isOwner = league.ownerId === userId;
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(league.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </button>
      </div>

      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-foreground truncate">{league.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {SPORT_NAMES[league.sport]} · Week {league.currentWeek} · {league.memberCount}/{league.maxMembers}
            </p>
          </div>
          <button
            onClick={copyInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium"
            title="Copy invite code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="tracking-widest">{league.inviteCode}</span>
          </button>
        </div>
        {isOwner && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => scheduleMut.mutate()}
              disabled={scheduleMut.isPending}
              className="text-xs px-2.5 py-1 rounded border border-border hover:border-foreground/40"
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              {scheduleMut.isPending ? "..." : "Generate schedule"}
            </button>
            <button
              onClick={() => settleMut.mutate()}
              disabled={settleMut.isPending}
              className="text-xs px-2.5 py-1 rounded border border-border hover:border-foreground/40"
            >
              <Swords className="w-3 h-3 inline mr-1" />
              {settleMut.isPending ? "..." : `Settle Week ${week}`}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["standings", "matchups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium capitalize",
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "standings" && standings && (
        <div className="glass-card divide-y divide-border">
          {standings.map((m, i) => (
            <div
              key={m.userId}
              className={cn(
                "flex items-center gap-3 px-3 py-2",
                m.userId === userId && "bg-primary/5",
              )}
            >
              <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}</span>
              <span className="flex-1 text-sm truncate font-medium">{m.teamName}</span>
              <span className="text-sm font-mono text-muted-foreground">{formatRecord(m)}</span>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {m.pointsFor.toFixed(1)}
              </span>
            </div>
          ))}
          {standings.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No members yet — share the invite code above.
            </div>
          )}
        </div>
      )}

      {tab === "matchups" && matchupData && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWeek((w) => Math.max(1, (w ?? league.currentWeek) - 1))}
              className="w-7 h-7 rounded bg-muted hover:bg-muted/80"
            >
              ‹
            </button>
            <span className="text-sm font-medium">Week {matchupData.week}</span>
            <button
              onClick={() => setSelectedWeek((w) => (w ?? league.currentWeek) + 1)}
              className="w-7 h-7 rounded bg-muted hover:bg-muted/80"
            >
              ›
            </button>
          </div>
          {matchupData.matchups.length === 0 ? (
            <div className="glass-card p-4 text-sm text-muted-foreground text-center">
              No matchups scheduled — the owner can generate a schedule from the header.
            </div>
          ) : (
            <div className="space-y-2">
              {matchupData.matchups.map((m) => {
                const home = league.members.find((x) => x.userId === m.homeUserId);
                const away = league.members.find((x) => x.userId === m.awayUserId);
                const homeWon = m.status === "final" && m.homeScore > m.awayScore;
                const awayWon = m.status === "final" && m.awayScore > m.homeScore;
                return (
                  <div key={m.id} className="glass-card p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      {m.status === "final" ? "Final" : "Scheduled"}
                    </div>
                    <Row team={away?.teamName || "Team"} score={m.awayScore} highlight={awayWon} live={m.status === "live"} />
                    <Row team={home?.teamName || "Team"} score={m.homeScore} highlight={homeWon} live={m.status === "live"} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ team, score, highlight, live }: { team: string; score: number; highlight: boolean; live: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-sm truncate", highlight && "font-semibold")}>{team}</span>
      <span className={cn("text-sm font-mono", live && "text-green-400")}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}
