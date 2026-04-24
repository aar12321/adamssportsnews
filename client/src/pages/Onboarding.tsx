import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Trophy, ChevronRight, ChevronLeft, Check, Loader2, Sparkles, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  completeOnboarding,
  getOnboardingStatus,
  saveOnboardingStep,
  startOnboarding,
} from "@/lib/aurzo/auth";
import { PLATFORM_LABEL, PLATFORM_TAGLINE } from "@/lib/aurzo/config";

/**
 * Aurzo Sports onboarding — a short, 3-step flow.
 *
 * Step 1: Welcome screen (branding + tagline).
 * Step 2: Questions — favorite leagues (multi) + news style (single).
 * Step 3: Confirmation screen; the "Finish" button calls
 *         `complete_onboarding`, writes the answers to localStorage for
 *         the Dashboard to read on mount, then navigates to `/`.
 *
 * Resume: on mount we call `get_onboarding_status`. If `completed` is
 * true, we forward to `/` immediately so already-onboarded users can't
 * land back in the wizard. Otherwise we preload any saved `answers` and
 * jump to `current_step`.
 */

const LEAGUES: { key: string; label: string; emoji: string }[] = [
  { key: "NFL", label: "NFL", emoji: "\u{1F3C8}" },
  { key: "NBA", label: "NBA", emoji: "\u{1F3C0}" },
  { key: "MLB", label: "MLB", emoji: "⚾" },
  { key: "NHL", label: "NHL", emoji: "\u{1F3D2}" },
  { key: "soccer", label: "Soccer", emoji: "⚽" },
  { key: "college", label: "College", emoji: "\u{1F393}" },
];

const NEWS_STYLES: { key: string; label: string; desc: string }[] = [
  { key: "breaking", label: "Breaking news", desc: "Just the headlines, as they happen." },
  { key: "analysis", label: "Deep analysis", desc: "Long-form takes, stats, and trends." },
  { key: "highlights", label: "Highlights", desc: "Box scores, big plays, recaps." },
];

const PREFS_STORAGE_KEY = "aurzo.sports.prefs";

interface OnboardingAnswers {
  leagues: string[];
  news_style: string;
}

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [newsStyle, setNewsStyle] = useState<string>("");
  const [hydrating, setHydrating] = useState(true);
  const [saving, setSaving] = useState(false);

  // Resume: pull any existing progress from the server on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setHydrating(false);
        return;
      }
      const status = await getOnboardingStatus();
      if (cancelled) return;
      if (status.completed) {
        // Already done — don't trap the user in the wizard.
        navigate("/");
        return;
      }
      const prior = (status.answers || {}) as Partial<OnboardingAnswers>;
      if (Array.isArray(prior.leagues)) setLeagues(prior.leagues);
      if (typeof prior.news_style === "string") setNewsStyle(prior.news_style);
      // Clamp current_step into the 3-step range (0..2).
      const safe = Math.max(0, Math.min(2, status.current_step || 0));
      setStep(safe);
      if (!status.started) {
        startOnboarding().catch(() => {});
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const answers = useMemo<OnboardingAnswers>(
    () => ({ leagues, news_style: newsStyle }),
    [leagues, newsStyle],
  );

  const toggleLeague = (key: string) => {
    setLeagues(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  };

  const canAdvance = () => {
    if (step === 0) return true; // welcome — always advance
    if (step === 1) return leagues.length > 0 && newsStyle !== "";
    return true;
  };

  const goNext = async () => {
    if (!canAdvance()) return;
    // Persist the in-progress answers whenever the user advances from
    // the questions step so they can safely refresh mid-onboarding.
    if (step === 1) {
      await saveOnboardingStep(1, answers);
    }
    setStep(s => Math.min(2, s + 1));
  };

  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await completeOnboarding(answers);
      // Local cache so Dashboard can filter on first render without waiting
      // for a round-trip to the settings RPC.
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(answers));
      } catch {}
      // Legacy flags — preserved so any older code paths that still read
      // them don't keep forcing the user back into onboarding.
      try {
        if (user?.id) {
          localStorage.setItem(`onboarding_complete_${user.id}`, "true");
        }
        localStorage.setItem("onboarding_complete", "true");
      } catch {}
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  if (hydrating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
            <span className="text-xs text-muted-foreground">
              {PLATFORM_LABEL}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 0 && (
          <div className="animate-fade-in space-y-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  Welcome to {PLATFORM_LABEL}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                {PLATFORM_TAGLINE}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Let's tune the feed to the sports you actually care about.
                Takes about thirty seconds.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 1 && (
          <div className="animate-fade-in space-y-8">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Favorite leagues?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pick as many as you like. We'll filter your feed to match.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {LEAGUES.map(lg => {
                  const active = leagues.includes(lg.key);
                  return (
                    <button
                      key={lg.key}
                      type="button"
                      onClick={() => toggleLeague(lg.key)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border text-left transition-all",
                        active
                          ? "bg-primary/15 border-primary/40"
                          : "bg-card border-border hover:border-primary/30",
                      )}
                    >
                      <span className="text-xl">{lg.emoji}</span>
                      <span className="text-sm font-medium text-foreground">
                        {lg.label}
                      </span>
                      {active && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                News style?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pick one — you can change it later.
              </p>
              <div className="space-y-2 mt-4">
                {NEWS_STYLES.map(ns => {
                  const active = newsStyle === ns.key;
                  return (
                    <button
                      key={ns.key}
                      type="button"
                      onClick={() => setNewsStyle(ns.key)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        active
                          ? "bg-primary/15 border-primary/40"
                          : "bg-card border-border hover:border-primary/30",
                      )}
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {ns.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ns.desc}
                        </p>
                      </div>
                      {active && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                You're all set
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                We'll open {PLATFORM_LABEL} with{" "}
                <span className="font-semibold text-foreground">
                  {leagues.length > 0 ? leagues.join(", ") : "all leagues"}
                </span>{" "}
                and a{" "}
                <span className="font-semibold text-foreground">
                  {newsStyle || "mixed"}
                </span>{" "}
                news style. Change any of this any time in Settings.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            onClick={goBack}
            disabled={step === 0 || saving}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              step === 0 || saving
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={goNext}
              disabled={!canAdvance() || saving}
              className={cn(
                "flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                canAdvance()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                saving
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Enter {PLATFORM_LABEL}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
