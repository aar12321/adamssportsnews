import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Configure Supabase via Vite env vars. Do NOT commit real project URLs /
// keys; use a local .env file and document in .env.example. The previous
// inline literals leaked in git history — rotate them in the Supabase
// dashboard.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * True when both env vars are populated and the real client below is in
 * use. False means the app is running on the no-op stub and every auth
 * call will return "Supabase not configured". The dev-only AuthDebug
 * page reads this so users can tell at a glance whether their .env was
 * picked up.
 */
export const supabaseConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Hostname portion of VITE_SUPABASE_URL, or null if unset / unparseable.
 *  Surfaced in AuthDebug so users can confirm they pointed at the right
 *  Supabase project without exposing the full URL in screenshots. */
export const supabaseHost: string | null = (() => {
  if (!SUPABASE_URL) return null;
  try { return new URL(SUPABASE_URL).host; } catch { return null; }
})();

/** Truncated preview of the publishable key for the AuthDebug page. The
 *  anon/publishable key is safe to ship to the browser, but we still
 *  truncate so screenshots/Loom recordings never leak the full value. */
export const supabaseKeyPreview: string | null =
  SUPABASE_KEY ? `${String(SUPABASE_KEY).slice(0, 8)}…` : null;

/**
 * Explicit-shape stub. Callers that destructure (e.g. `.onAuthStateChange`'s
 * `{ data: { subscription } }`) would otherwise crash when env vars are
 * missing — and that sync throw inside AuthContext's init useEffect leaves
 * `loading=true` forever, which presents as a blank/stuck screen. Every
 * method the app actually calls gets a typed no-op here.
 */
function makeStub(): SupabaseClient {
  const notConfigured = {
    message: "Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
  } as any;
  const noopSubscription = {
    data: { subscription: { id: "stub", callback: () => {}, unsubscribe: () => {} } },
  };
  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: notConfigured }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: notConfigured }),
    signUp: async () => ({ data: { user: null, session: null }, error: notConfigured }),
    signInWithOAuth: async () => ({ data: { provider: "google", url: null }, error: notConfigured }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (_handler: any) => noopSubscription,
  };
  return { auth } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      })
    : (console.warn(
        "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing — auth is disabled."
      ),
      makeStub());
