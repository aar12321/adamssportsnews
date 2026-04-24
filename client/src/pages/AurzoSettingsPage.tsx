import React, { useEffect, useState } from "react";
import {
  Monitor, Smartphone, Laptop, Lock, LogOut, Save, Loader2, Trophy,
  X, Plus, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode, type ViewMode } from "@/contexts/ViewModeContext";
import {
  getUserSettings,
  saveUserSettings,
  signOutToMembership,
  type UserSettings,
} from "@/lib/aurzo/auth";
import {
  membershipPasswordUrl,
  PLATFORM_LABEL,
} from "@/lib/aurzo/config";

type ViewportChoice = "auto" | "mobile" | "desktop";

/**
 * Aurzo Sports settings page.
 *
 * This is the *Aurzo-level* settings surface — anything that is the same
 * across every Aurzo platform (viewport preference, password, sign-out)
 * lives here, alongside a single platform-specific block for Sports
 * ("Teams to follow").
 *
 * Password changes and billing stay in the membership portal — we don't
 * duplicate them here.
 */
export default function AurzoSettingsPage() {
  const { viewMode, setViewMode } = useViewMode();
  const [viewport, setViewport] = useState<ViewportChoice>("auto");
  const [teams, setTeams] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getUserSettings();
      if (cancelled) return;
      const vp = (s.viewport as ViewportChoice) || "auto";
      setViewport(vp);
      // Apply the saved viewport to ViewModeContext so the rest of the app
      // renders accordingly on first load (only meaningful when not auto).
      if (vp === "mobile" || vp === "desktop") {
        setViewMode(vp as ViewMode);
      }
      if (Array.isArray(s.teams)) setTeams(s.teams);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // setViewMode is stable from context; intentionally omit to avoid
    // re-fetching settings on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewportChange = (choice: ViewportChoice) => {
    setViewport(choice);
    // Apply immediately so users see the effect before saving.
    if (choice === "mobile" || choice === "desktop") {
      setViewMode(choice as ViewMode);
    }
  };

  const addTeam = () => {
    const v = teamInput.trim();
    if (!v) return;
    if (teams.includes(v)) {
      setTeamInput("");
      return;
    }
    setTeams(prev => [...prev, v]);
    setTeamInput("");
  };

  const removeTeam = (name: string) => {
    setTeams(prev => prev.filter(t => t !== name));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const next: UserSettings = { viewport, teams };
    await saveUserSettings(next);
    setSaving(false);
    setSaved(true);
    // Flash the "Saved" confirmation briefly.
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleSignOut = async () => {
    await signOutToMembership();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const viewportOptions: {
    key: ViewportChoice;
    label: string;
    desc: string;
    Icon: typeof Monitor;
  }[] = [
    { key: "auto", label: "Auto", desc: "Match my device", Icon: Laptop },
    { key: "desktop", label: "Desktop", desc: "Force wide layout", Icon: Monitor },
    { key: "mobile", label: "Mobile", desc: "Force compact layout", Icon: Smartphone },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            {PLATFORM_LABEL} preferences
          </p>
        </div>
      </div>

      {/* Viewport */}
      <section className="glass-card p-5 space-y-4">
        <h2 className="font-bold text-foreground">Viewport</h2>
        <p className="text-xs text-muted-foreground -mt-1">
          Currently rendering in <span className="font-semibold">{viewMode}</span>.
        </p>
        <div role="radiogroup" aria-label="Viewport" className="grid sm:grid-cols-3 gap-2">
          {viewportOptions.map(opt => {
            const active = viewport === opt.key;
            return (
              <button
                key={opt.key}
                role="radio"
                aria-checked={active}
                onClick={() => handleViewportChange(opt.key)}
                className={cn(
                  "flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all",
                  active
                    ? "bg-primary/15 border-primary/40"
                    : "bg-card border-border hover:border-primary/30",
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <opt.Icon className="w-5 h-5 text-primary" />
                  {active && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Password (delegated to membership portal) */}
      <section className="glass-card p-5 space-y-3">
        <h2 className="font-bold text-foreground">Account</h2>
        <p className="text-xs text-muted-foreground">
          Your password is managed by your Aurzo membership, so you can use
          the same credentials across every platform.
        </p>
        <a
          href={membershipPasswordUrl()}
          target="_self"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-all"
        >
          <Lock className="w-4 h-4" />
          Change password in Aurzo membership portal
        </a>
      </section>

      {/* Sports-specific: Teams to follow */}
      <section className="glass-card p-5 space-y-3">
        <h2 className="font-bold text-foreground">Teams to follow</h2>
        <p className="text-xs text-muted-foreground">
          We'll prioritise scores, news, and injury alerts for these teams.
        </p>

        <div className="flex gap-2">
          <input
            value={teamInput}
            onChange={e => setTeamInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTeam();
              }
            }}
            placeholder="e.g. Kansas City Chiefs"
            className="flex-1 h-11 px-4 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={addTeam}
            disabled={!teamInput.trim()}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {teams.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No teams yet — add one to start personalising your feed.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {teams.map(team => (
              <span
                key={team}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-xs font-medium text-foreground"
              >
                {team}
                <button
                  type="button"
                  onClick={() => removeTeam(team)}
                  aria-label={`Remove ${team}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Save / Sign out */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-semibold transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" /> Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
