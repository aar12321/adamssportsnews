import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Configure Supabase via Vite env vars. Do NOT commit real project URLs /
// keys; use a local .env file and document in .env.example. The previous
// inline literals leaked in git history — rotate them in the Supabase
// dashboard.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function makeStub(): SupabaseClient {
  const err = () =>
    Promise.resolve({
      data: { user: null, session: null },
      error: { message: "Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY." } as any,
    });
  const chain: any = new Proxy(function () {}, {
    get: () => chain,
    apply: () => err(),
  });
  return chain as SupabaseClient;
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
