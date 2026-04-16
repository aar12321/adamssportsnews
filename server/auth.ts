import type { Request, Response, NextFunction } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Supabase auth middleware.
//
// The app's primary identity provider is Supabase. Every authenticated request
// sends `Authorization: Bearer <access_token>`. We verify the token against
// the Supabase Auth server and stash the user id on `req.userId` so handlers
// can do ownership checks without re-parsing.
//
// If SUPABASE_URL / SUPABASE_ANON_KEY are missing (dev without a project),
// auth is effectively disabled: `requireUser` returns 401, but `attachUser`
// is a no-op. This keeps the server runnable locally without full config.
// -----------------------------------------------------------------------------

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    userEmail?: string;
  }
}

function env(name: string): string | undefined {
  // @ts-ignore - process.env is available in Node.js runtime
  return (process.env || {})[name];
}

const SUPABASE_URL = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
const SUPABASE_KEY =
  env("SUPABASE_SERVICE_ROLE_KEY") ||
  env("SUPABASE_ANON_KEY") ||
  env("VITE_SUPABASE_PUBLISHABLE_KEY");

let client: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} else {
  console.warn(
    "[auth] SUPABASE_URL / SUPABASE_ANON_KEY not set — auth middleware will reject all protected requests.",
  );
}

export const authConfigured = !!client;

// Cache recently-verified tokens for a minute to avoid re-hitting Supabase on
// every request. Tokens are short-lived (1h default) so a small TTL is safe.
type CachedUser = { userId: string; email?: string; expiresAt: number };
const tokenCache = new Map<string, CachedUser>();
const TOKEN_CACHE_TTL_MS = 60_000;
const TOKEN_CACHE_MAX = 1000;

function parseBearer(req: Request): string | undefined {
  const raw = req.header("authorization") || req.header("Authorization");
  if (!raw) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m?.[1]?.trim();
}

async function verifyToken(
  token: string,
): Promise<{ userId: string; email?: string } | null> {
  if (!client) return null;
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > now) {
    return { userId: cached.userId, email: cached.email };
  }
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    const user = data.user;
    // Evict oldest if cache would grow too big
    if (tokenCache.size >= TOKEN_CACHE_MAX) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey) tokenCache.delete(firstKey);
    }
    tokenCache.set(token, {
      userId: user.id,
      email: user.email ?? undefined,
      expiresAt: now + TOKEN_CACHE_TTL_MS,
    });
    return { userId: user.id, email: user.email ?? undefined };
  } catch (err) {
    console.error("[auth] verifyToken failed:", err);
    return null;
  }
}

/**
 * If a Bearer token is present and valid, attach userId/userEmail to req.
 * Never rejects — lets unauthenticated endpoints work as before.
 */
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = parseBearer(req);
  if (!token) return next();
  const user = await verifyToken(token);
  if (user) {
    req.userId = user.userId;
    req.userEmail = user.email;
  }
  next();
}

/**
 * Hard gate: 401 if no valid Supabase token.
 */
export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!client) {
    res.status(503).json({ error: "Auth is not configured on this server" });
    return;
  }
  const token = parseBearer(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  req.userId = user.userId;
  req.userEmail = user.email;
  next();
}

/**
 * Enforce ownership: the :userId path param must match the authenticated
 * user. Must be used AFTER requireUser.
 */
export function requireSelf(paramName = "userId") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const target = req.params[paramName];
    if (!req.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!target || target !== req.userId) {
      res.status(403).json({ error: "Forbidden: cannot access another user's data" });
      return;
    }
    next();
  };
}

export function clearTokenCache(): void {
  tokenCache.clear();
}
