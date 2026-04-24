import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, Loader2, Eye, EyeOff, Trophy, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getPlatformUI, type PlatformUI } from "@/lib/aurzo/auth";
import {
  membershipSignupUrl,
  PLATFORM_LABEL,
  PLATFORM_TAGLINE,
} from "@/lib/aurzo/config";

/**
 * Inline Google "G" mark so the OAuth button renders identically in every
 * theme without a network fetch.
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.094 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

/**
 * Aurzo unified login page.
 *
 * Layout: two-pane (hero on the left, form on the right) on desktop;
 * collapses to the form alone on small screens. Hero copy is driven by
 * the `get_platform_ui` RPC so the membership team can tweak taglines
 * without a deploy.
 *
 * "Create Account" redirects to the Aurzo membership portal — this sub-app
 * no longer owns signup. After a successful login we navigate to
 * `/onboarding`, which forwards on to `/` if the user has already completed
 * their platform onboarding.
 */
export default function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ui, setUi] = useState<PlatformUI>({
    label: PLATFORM_LABEL,
    tagline: PLATFORM_TAGLINE,
    hero_title: PLATFORM_LABEL,
    hero_subtitle: PLATFORM_TAGLINE,
  });

  // Fetch platform UI meta so hero copy matches whatever the membership
  // team configured in the shared Aurzo DB. On failure the defaults above
  // stay in place.
  useEffect(() => {
    getPlatformUI().then(setUi).catch(() => {});
  }, []);

  // Surface OAuth callback errors. Supabase appends ?error=... &
  // error_description=... to the redirect URL when OAuth fails.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthError = params.get("error") || hashParams.get("error");
    const desc =
      params.get("error_description") || hashParams.get("error_description");
    if (oauthError) {
      setError(decodeURIComponent(desc || oauthError).replace(/\+/g, " "));
      const clean = window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    }
  }, []);

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) {
      setError(oauthError);
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google — this component unmounts.
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }
    // Hand off to Onboarding — it will forward to "/" if already complete.
    navigate("/onboarding");
  };

  const handleCreateAccount = () => {
    // Same-tab redirect: signup lives in the unified membership portal.
    window.location.href = membershipSignupUrl();
  };

  const heroTitle = ui.hero_title || ui.label || PLATFORM_LABEL;
  const heroSubtitle = ui.hero_subtitle || ui.tagline || PLATFORM_TAGLINE;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Hero pane (left) — hidden on < md */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.15),transparent_55%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Aurzo</span>
          </div>
          <div className="space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                {ui.label || PLATFORM_LABEL}
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {heroTitle}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {heroSubtitle}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Part of your Aurzo membership
          </p>
        </div>
      </div>

      {/* Form pane (right) */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Mobile-only header — on desktop the hero covers this */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <Trophy className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {ui.label || PLATFORM_LABEL}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{heroSubtitle}</p>
          </div>

          <div className="mb-6 hidden md:block">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to continue to {ui.label || PLATFORM_LABEL}.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 mb-4">
                {error}
              </div>
            )}

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              aria-label="Sign in with Google"
              className="w-full h-11 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 mb-4"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">
                  or with email
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full h-11 pl-10 pr-4 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full h-11 pl-10 pr-10 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className={cn(
                  "w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2",
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="text-xs text-muted-foreground mb-2">
                New to Aurzo?
              </p>
              <button
                type="button"
                onClick={handleCreateAccount}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Create an account
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            One Aurzo membership — every platform.
          </p>
        </div>
      </div>
    </div>
  );
}
