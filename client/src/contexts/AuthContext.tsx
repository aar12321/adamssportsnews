import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { setAccessToken } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { signOutToMembership } from "@/lib/aurzo/auth";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isNewUser: boolean;
  setIsNewUser: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  // Keep the latest token in a ref so the window.fetch wrapper (installed
  // once below) always sees the current value without reinstalling.
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      tokenRef.current = currentSession?.access_token ?? null;
      setAccessToken(tokenRef.current);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      tokenRef.current = newSession?.access_token ?? null;
      setAccessToken(tokenRef.current);
      setLoading(false);

      // SIGNED_IN fires after the OAuth callback completes. If this is
      // a Google user who hasn't been through onboarding yet (no flag in
      // localStorage for their userId), route them to onboarding.
      if (event === "SIGNED_IN" && newSession?.user) {
        const uid = newSession.user.id;
        const perUserDone = localStorage.getItem(`onboarding_complete_${uid}`);
        const legacyDone = localStorage.getItem("onboarding_complete");
        if (!perUserDone && !legacyDone) {
          setIsNewUser(true);
        }
      }

      // Any time the session goes away (explicit sign-out, token
      // expiry, session revoked in Supabase dashboard) wipe the query
      // cache so cached rows from the previous user never flash into
      // the next user's UI.
      if (event === "SIGNED_OUT" || !newSession) {
        queryClient.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Wrap window.fetch so every same-origin /api/* request carries the
  // Supabase access token. This means existing bare fetch("/api/...")
  // call sites automatically authenticate without individual refactors.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = tokenRef.current;
      const urlString = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      // Only attach for same-origin /api/* paths — we never want to leak
      // the user's token to a third-party URL.
      const isApi = urlString.startsWith("/api/") ||
        urlString.startsWith(`${window.location.origin}/api/`);
      let response: Response;
      if (token && isApi) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        response = await originalFetch(input, { ...init, headers });
      } else {
        response = await originalFetch(input, init);
      }
      // A 401 on a same-origin API call means the session is no longer
      // valid on the server. Sign out so AuthGate kicks the user back
      // to Login instead of leaving them on a broken page.
      if (isApi && response.status === 401) {
        supabase.auth.signOut().catch(() => { /* ignore */ });
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);


  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    // Check if this user has completed onboarding
    const userId = data.user?.id;
    const perUserDone = userId && localStorage.getItem(`onboarding_complete_${userId}`);
    const legacyDone = localStorage.getItem("onboarding_complete");
    if (!perUserDone && !legacyDone) {
      setIsNewUser(true);
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) {
      return { error: error.message };
    }
    setIsNewUser(true);
    return { error: null };
  }, []);

  /**
   * Sign in / sign up with Google via Supabase OAuth (PKCE flow).
   *
   * Behaviour for users with an existing email/password account:
   *   Supabase auto-links a Google identity to an existing user when
   *   the Google account's email matches an existing verified email.
   *   That requires:
   *     1. The "Google" provider is enabled in the Supabase dashboard
   *        (Authentication → Providers) with valid client ID/secret.
   *     2. The site's URL is in Authentication → URL Configuration →
   *        "Redirect URLs" (e.g. https://yourdomain.com and
   *        http://localhost:5173 for dev).
   *     3. The existing email/password account has a confirmed email
   *        (email_confirmed_at is non-null). Google emails are always
   *        verified, so the link is automatic.
   *   If linking is blocked, the OAuth callback URL contains an
   *   `error` / `error_description` query string, which the Login
   *   page surfaces to the user.
   */
  const signInWithGoogle = useCallback(async () => {
    // Use the current origin so this works locally and in production
    // without any deploy-time configuration. Supabase will append
    // `?code=...` for PKCE and `detectSessionInUrl: true` (set in the
    // supabase client) handles the exchange automatically.
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        // Always show the account chooser so users can switch Google
        // accounts without first signing out of Google in the browser.
        queryParams: { prompt: "select_account", access_type: "offline" },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    // Clear local state + cache first so the brief moment between the
    // sign-out call and the redirect doesn't leak the previous user's
    // data into the UI.
    setUser(null);
    setSession(null);
    setIsNewUser(false);
    queryClient.clear();
    // Delegate to the Aurzo helper: signs the user out of Supabase and
    // then redirects to `${MEMBERSHIP_URL}/dashboard` so they re-enter
    // via the unified membership portal.
    await signOutToMembership();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut, isNewUser, setIsNewUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
