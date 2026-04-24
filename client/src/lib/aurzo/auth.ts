/**
 * Aurzo auth + onboarding + settings RPC wrappers.
 *
 * All of these call Postgres functions exposed by the shared Aurzo
 * membership schema under the `public` namespace. They use the same
 * Supabase client as the rest of the app so the user's session (and
 * RLS) apply automatically.
 *
 * Every wrapper returns a plain value (or null on failure) and logs
 * errors to the console. Callers are expected to handle null/empty
 * responses gracefully — the UI should never crash just because a
 * remote call failed.
 */

import { supabase } from "../supabase";
import {
  PLATFORM_KEY,
  PLATFORM_LABEL,
  PLATFORM_TAGLINE,
  membershipDashboardUrl,
} from "./config";

/** Shape returned by `get_platform_ui`. All fields are optional so the
 *  UI falls back to local defaults when the row or RPC is missing. */
export interface PlatformUI {
  platform_key?: string;
  label?: string;
  tagline?: string;
  hero_title?: string;
  hero_subtitle?: string;
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
  [key: string]: unknown;
}

/** Shape returned by `get_onboarding_status`. */
export interface OnboardingStatus {
  started: boolean;
  completed: boolean;
  current_step: number;
  answers: Record<string, unknown>;
}

/** Shape returned by `get_user_settings`. */
export interface UserSettings {
  viewport?: "auto" | "mobile" | "desktop";
  teams?: string[];
  leagues?: string[];
  news_style?: string;
  [key: string]: unknown;
}

/**
 * True when the current user has an active access grant for this
 * platform. If not signed in or the RPC errors, returns false so the
 * gate defaults to "blocked" (safer than accidentally granting access).
 */
export async function hasPlatformAccess(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("me_has_platform_access", {
      p_platform: PLATFORM_KEY,
    });
    if (error) {
      console.warn("[aurzo] me_has_platform_access failed:", error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    console.warn("[aurzo] me_has_platform_access threw:", e);
    return false;
  }
}

/**
 * Fetch the platform UI meta (hero copy, branding). Falls back to
 * the local config constants so the login page always renders
 * something even when the membership DB hasn't been seeded yet.
 */
export async function getPlatformUI(): Promise<PlatformUI> {
  const fallback: PlatformUI = {
    platform_key: PLATFORM_KEY,
    label: PLATFORM_LABEL,
    tagline: PLATFORM_TAGLINE,
    hero_title: PLATFORM_LABEL,
    hero_subtitle: PLATFORM_TAGLINE,
  };
  try {
    const { data, error } = await supabase.rpc("get_platform_ui", {
      p_platform: PLATFORM_KEY,
    });
    if (error || !data) return fallback;
    // RPC may return a single row or an array — normalise.
    const row = Array.isArray(data) ? data[0] : data;
    return { ...fallback, ...(row || {}) };
  } catch (e) {
    console.warn("[aurzo] get_platform_ui threw:", e);
    return fallback;
  }
}

/** Read the user's onboarding progress. Returns a safe empty default
 *  when the user hasn't started yet. */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const empty: OnboardingStatus = {
    started: false,
    completed: false,
    current_step: 0,
    answers: {},
  };
  try {
    const { data, error } = await supabase.rpc("get_onboarding_status", {
      p_platform: PLATFORM_KEY,
    });
    if (error || !data) return empty;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      started: Boolean(row?.started),
      completed: Boolean(row?.completed),
      current_step: Number(row?.current_step ?? 0),
      answers: (row?.answers as Record<string, unknown>) || {},
    };
  } catch (e) {
    console.warn("[aurzo] get_onboarding_status threw:", e);
    return empty;
  }
}

/** Mark onboarding as in-progress. Safe to call more than once. */
export async function startOnboarding(): Promise<void> {
  try {
    const { error } = await supabase.rpc("start_onboarding", {
      p_platform: PLATFORM_KEY,
    });
    if (error) console.warn("[aurzo] start_onboarding failed:", error.message);
  } catch (e) {
    console.warn("[aurzo] start_onboarding threw:", e);
  }
}

/** Persist a single step's answers without marking onboarding complete. */
export async function saveOnboardingStep(
  step: number,
  answers: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("save_onboarding_step", {
      p_platform: PLATFORM_KEY,
      p_step: step,
      p_answers: answers,
    });
    if (error) console.warn("[aurzo] save_onboarding_step failed:", error.message);
  } catch (e) {
    console.warn("[aurzo] save_onboarding_step threw:", e);
  }
}

/** Mark onboarding complete with the full final answer set. */
export async function completeOnboarding(
  answers: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("complete_onboarding", {
      p_platform: PLATFORM_KEY,
      p_answers: answers,
    });
    if (error) console.warn("[aurzo] complete_onboarding failed:", error.message);
  } catch (e) {
    console.warn("[aurzo] complete_onboarding threw:", e);
  }
}

/** Load the user's platform-specific settings blob. */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const { data, error } = await supabase.rpc("get_user_settings", {
      p_platform: PLATFORM_KEY,
    });
    if (error || !data) return {};
    const row = Array.isArray(data) ? data[0] : data;
    // Some backends return { settings: {...} }, others return the blob directly.
    return (row?.settings as UserSettings) || (row as UserSettings) || {};
  } catch (e) {
    console.warn("[aurzo] get_user_settings threw:", e);
    return {};
  }
}

/** Persist the user's platform-specific settings blob. */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  try {
    const { error } = await supabase.rpc("save_user_settings", {
      p_platform: PLATFORM_KEY,
      p_settings: settings,
    });
    if (error) console.warn("[aurzo] save_user_settings failed:", error.message);
  } catch (e) {
    console.warn("[aurzo] save_user_settings threw:", e);
  }
}

/**
 * Sign out of Supabase and bounce back to the Aurzo membership dashboard,
 * so users re-enter via the unified portal instead of landing on a bare
 * login screen for this specific sub-app.
 */
export async function signOutToMembership(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("[aurzo] signOut threw:", e);
  }
  if (typeof window !== "undefined") {
    window.location.href = membershipDashboardUrl();
  }
}
