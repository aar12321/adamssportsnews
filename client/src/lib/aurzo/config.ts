/**
 * Aurzo platform config.
 *
 * This module centralises all values that differ between Aurzo platforms
 * (Sports, Health, Parenting, Financials, etc.) and the shared membership
 * portal URL. Every Aurzo sub-app imports from this one file so the only
 * per-repo customisation is the three constants at the top.
 *
 * The membership portal owns signup, password management, billing, and
 * cross-platform dashboard. This app redirects to it instead of owning
 * those flows itself.
 */

export const MEMBERSHIP_URL =
  (import.meta.env.VITE_MEMBERSHIP_PORTAL_URL as string | undefined) ||
  "https://morning-growth-loop.vercel.app";

/** Stable platform identifier used by RPCs and DB rows (`platform` column). */
export const PLATFORM_KEY = "sports";

/** Human-readable label shown in the membership portal. */
export const PLATFORM_LABEL = "Aurzo Sports";

/** Short marketing tagline rendered on the login hero + onboarding welcome. */
export const PLATFORM_TAGLINE = "Your edge in every game.";

/**
 * Build the membership-portal signup URL. The portal reads `return` to
 * bounce the user back to this app after signup completes, and `platform`
 * to pre-select the right access grant.
 */
export function membershipSignupUrl(): string {
  const o = typeof window !== "undefined" ? window.location.origin : "";
  return `${MEMBERSHIP_URL}/signup?return=${encodeURIComponent(o)}&platform=${encodeURIComponent(PLATFORM_LABEL)}`;
}

/** The cross-platform Aurzo dashboard (shown after sign-out). */
export function membershipDashboardUrl(): string {
  return `${MEMBERSHIP_URL}/dashboard`;
}

/** Where password changes and account-level settings live. */
export function membershipPasswordUrl(): string {
  return `${MEMBERSHIP_URL}/dashboard/settings`;
}
