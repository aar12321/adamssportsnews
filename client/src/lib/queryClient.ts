import { QueryClient } from "@tanstack/react-query";

// AuthContext sets this whenever the Supabase session changes so that
// every API request automatically carries the user's bearer token. Using
// a module-level variable (rather than threading the token through every
// queryFn) keeps all existing `fetch("/api/...")` call sites working
// without each one having to know about auth.
let currentAccessToken: string | null = null;
const unauthorizedHandlers = new Set<() => void>();

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

/** Subscribe to 401 responses (e.g. to force the user back to Login). */
export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

/**
 * Fetch JSON from an API endpoint with consistent error handling and a
 * sensible default request timeout. Throws a typed Error on any non-2xx
 * response (or network/timeout failure) so React Query can surface it.
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown,
  opts?: { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {};
    if (data) headers["Content-Type"] = "application/json";
    if (currentAccessToken) headers["Authorization"] = `Bearer ${currentAccessToken}`;
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
    if (res.status === 401) {
      unauthorizedHandlers.forEach(h => {
        try { h(); } catch { /* ignore */ }
      });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${method} ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET helper used by useQuery callbacks. Always validates res.ok and
 * times out after 15s — eliminates the "loading spinner forever" failure
 * mode that the raw fetch + .json() pattern suffers from.
 */
export async function fetchJson<T = any>(
  url: string,
  opts?: { timeoutMs?: number },
): Promise<T> {
  return apiRequest<T>("GET", url, undefined, opts);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      // Retry transient errors a couple times with backoff. We do NOT
      // retry 4xx responses because those are deterministic client errors.
      retry: (failureCount, error: any) => {
        const msg = String(error?.message || "");
        const status = parseInt(msg.split(":")[0], 10);
        if (Number.isFinite(status) && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    },
    mutations: {
      retry: false,
    },
  },
});
