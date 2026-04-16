import { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

/**
 * Grab the current Supabase session access token for outgoing API calls.
 * Returns undefined if the user is signed out or Supabase is not configured.
 */
async function getAuthToken(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? undefined;
  } catch {
    return undefined;
  }
}

// Install a one-time `window.fetch` interceptor so EVERY call that targets
// our own API surface (/api/...) picks up the Supabase Bearer token without
// the callsite having to remember. Idempotent — safe to import multiple
// times during HMR. External URLs are untouched.
declare global {
  interface Window {
    __apiFetchPatched?: boolean;
  }
}
if (typeof window !== "undefined" && !window.__apiFetchPatched) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    const isApi =
      url.startsWith("/api/") ||
      url.startsWith(window.location.origin + "/api/");
    if (!isApi) return originalFetch(input, init);
    const headers = new Headers(init?.headers || {});
    if (!headers.has("Authorization")) {
      const token = await getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    return originalFetch(input, { ...init, headers });
  };
  window.__apiFetchPatched = true;
}

/**
 * Fetch JSON from an API endpoint with consistent error handling and a
 * sensible default request timeout. Throws a typed Error on any non-2xx
 * response (or network/timeout failure) so React Query can surface it.
 *
 * Automatically attaches the Supabase access token as a Bearer header so
 * the server can enforce ownership. No-op for unauthenticated calls.
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown,
  opts?: { timeoutMs?: number; skipAuth?: boolean },
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {};
    if (data) headers["Content-Type"] = "application/json";
    if (!opts?.skipAuth) {
      const token = await getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
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
