import React, { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, XCircle, RefreshCw, Loader2, Shield, ChevronLeft, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfigured, supabaseHost, supabaseKeyPreview } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Dev-only diagnostic for the Supabase auth wiring. The route is gated in
// App.tsx so this page is unreachable in production; this in-component
// guard is belt-and-braces in case someone wires the route up later.
const IS_DEV = import.meta.env.DEV;

type ProbeStatus = "idle" | "running" | "ok" | "error";

interface ProbeResult {
  status: ProbeStatus;
  message: string;
  detail?: Record<string, string | number | boolean | null>;
}

const initialProbe: ProbeResult = { status: "idle", message: "Not run yet" };

function StatusBadge({ ok, label }: { ok: boolean | null; label?: string }) {
  if (ok === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-semibold">
        <Loader2 className="w-3 h-3 animate-spin" />
        {label ?? "Checking"}
      </span>
    );
  }
  return ok ? (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold">
      <CheckCircle2 className="w-3 h-3" />
      {label ?? "OK"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold">
      <XCircle className="w-3 h-3" />
      {label ?? "Missing"}
    </span>
  );
}

function Row({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
      <div className="flex items-center gap-2 text-sm font-mono text-foreground text-right break-all max-w-[60%]">
        {value}
        {ok !== undefined && <StatusBadge ok={ok ?? null} />}
      </div>
    </div>
  );
}

function formatExpiry(expiresAt: number | null): string {
  if (!expiresAt) return "—";
  const ms = expiresAt * 1000 - Date.now();
  const date = new Date(expiresAt * 1000).toLocaleString();
  if (ms <= 0) return `${date} (expired)`;
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${date} (in ${mins}m)`;
  const hours = Math.floor(mins / 60);
  return `${date} (in ${hours}h)`;
}

export default function AuthDebug() {
  const { user, session, loading, signOut } = useAuth();
  const [sessionProbe, setSessionProbe] = useState<ProbeResult>(initialProbe);
  const [userProbe, setUserProbe] = useState<ProbeResult>(initialProbe);

  const runProbes = useCallback(async () => {
    setSessionProbe({ status: "running", message: "Calling supabase.auth.getSession()…" });
    setUserProbe({ status: "running", message: "Calling supabase.auth.getUser()…" });

    try {
      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error) {
        setSessionProbe({
          status: "error",
          message: sessionResult.error.message,
        });
      } else {
        const s = sessionResult.data.session;
        setSessionProbe({
          status: "ok",
          message: s ? "Session present" : "No session (signed out)",
          detail: {
            user_id: s?.user.id ?? null,
            email: s?.user.email ?? null,
            access_token: s?.access_token ? "present" : "absent",
            expires_at: formatExpiry(s?.expires_at ?? null),
          },
        });
      }
    } catch (err: any) {
      setSessionProbe({ status: "error", message: err?.message ?? String(err) });
    }

    try {
      const userResult = await supabase.auth.getUser();
      if (userResult.error) {
        setUserProbe({
          status: "error",
          message: userResult.error.message,
        });
      } else {
        const u = userResult.data.user;
        setUserProbe({
          status: "ok",
          message: u ? "User confirmed by server" : "No user — token rejected or never signed in",
          detail: {
            id: u?.id ?? null,
            email: u?.email ?? null,
            provider: u?.app_metadata?.provider ?? null,
            email_confirmed: u?.email_confirmed_at ? "yes" : "no",
          },
        });
      }
    } catch (err: any) {
      setUserProbe({ status: "error", message: err?.message ?? String(err) });
    }
  }, []);

  useEffect(() => {
    if (IS_DEV && supabaseConfigured) runProbes();
  }, [runProbes]);

  if (!IS_DEV) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md text-center space-y-3">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="text-lg font-bold text-foreground">Not available</h1>
          <p className="text-sm text-muted-foreground">
            The auth diagnostic page is disabled in production builds.
          </p>
          <Link href="/">
            <a className="btn-primary inline-flex py-2 text-xs">Back home</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-12 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <a className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-all">
            <ChevronLeft className="w-4 h-4" />
          </a>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auth diagnostics</h1>
            <p className="text-xs text-muted-foreground">Dev-only · not shipped to production</p>
          </div>
        </div>
        <button
          type="button"
          onClick={runProbes}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", (sessionProbe.status === "running" || userProbe.status === "running") && "animate-spin")} />
          Refresh probes
        </button>
      </div>

      {/* Stub-mode warning */}
      {!supabaseConfigured && (
        <div className="glass-card p-4 border-orange-500/40 bg-orange-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="text-foreground font-semibold">
                Supabase env vars are not set — every auth call returns "not configured".
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Copy <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">.env.example</code> to <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">.env</code> and fill in:
              </p>
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                <li><code className="text-foreground">VITE_SUPABASE_URL</code> — Project URL from Supabase dashboard → Project Settings → API</li>
                <li><code className="text-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</code> — the <em>anon / publishable</em> key (NOT the service-role key, NOT a personal access token)</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Restart the Vite dev server after editing <code className="text-foreground">.env</code> — Vite only reads it at boot.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Environment */}
      <div className="glass-card p-5">
        <h2 className="font-bold text-foreground mb-3 text-sm">Environment</h2>
        <Row
          label="VITE_SUPABASE_URL"
          ok={Boolean(supabaseHost)}
          value={supabaseHost ? <span>{supabaseHost}</span> : <span className="text-muted-foreground">unset</span>}
        />
        <Row
          label="VITE_SUPABASE_PUBLISHABLE_KEY"
          ok={Boolean(supabaseKeyPreview)}
          value={supabaseKeyPreview ? <span>{supabaseKeyPreview}</span> : <span className="text-muted-foreground">unset</span>}
        />
        <Row
          label="Client mode"
          ok={supabaseConfigured}
          value={<span>{supabaseConfigured ? "real client" : "stub (no-op)"}</span>}
        />
      </div>

      {/* AuthContext */}
      <div className="glass-card p-5">
        <h2 className="font-bold text-foreground mb-3 text-sm">AuthContext state</h2>
        <Row
          label="loading"
          value={<span>{loading ? "true" : "false"}</span>}
        />
        <Row
          label="user.id"
          ok={Boolean(user?.id)}
          value={<span className="text-xs">{user?.id ?? "—"}</span>}
        />
        <Row
          label="user.email"
          value={<span>{user?.email ?? "—"}</span>}
        />
        <Row
          label="session expires"
          value={<span>{formatExpiry(session?.expires_at ?? null)}</span>}
        />
      </div>

      {/* Live probes */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-sm">Live probes</h2>
          <span className="text-[11px] text-muted-foreground">
            Run on mount + every refresh
          </span>
        </div>

        <div className="space-y-3">
          <ProbeBlock
            title="supabase.auth.getSession()"
            probe={sessionProbe}
          />
          <ProbeBlock
            title="supabase.auth.getUser()"
            probe={userProbe}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {user && (
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/15 transition-all"
          >
            Sign out
          </button>
        )}
        <Link href="/">
          <a className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all">
            Back to dashboard
          </a>
        </Link>
      </div>
    </div>
  );
}

function ProbeBlock({ title, probe }: { title: string; probe: ProbeResult }) {
  const ok =
    probe.status === "ok" ? true :
    probe.status === "error" ? false :
    null;
  return (
    <div className="bg-muted/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-foreground">{title}</span>
        <StatusBadge
          ok={ok}
          label={probe.status === "running" ? "Running" : probe.status === "ok" ? "OK" : probe.status === "error" ? "Error" : "Idle"}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{probe.message}</p>
      {probe.detail && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-2">
          {Object.entries(probe.detail).map(([k, v]) => (
            <div key={k} className="text-[11px] flex gap-2">
              <span className="text-muted-foreground font-semibold">{k}:</span>
              <span className="font-mono text-foreground break-all">{v === null ? "null" : String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
