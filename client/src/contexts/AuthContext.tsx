import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
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
    });

    return () => {
      subscription.unsubscribe();
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsNewUser(false);
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
