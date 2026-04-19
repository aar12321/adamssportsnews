import type { Request, Response, NextFunction } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Extend Express's Request so handlers can read req.user typesafely.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}

const url = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";

let supabase: SupabaseClient | null = null;
if (url && anonKey) {
  supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} else {
  console.warn(
    "[auth] SUPABASE_URL / SUPABASE_ANON_KEY not set — per-user routes will " +
      "run in INSECURE dev mode (trust :userId param). Do NOT deploy like this."
  );
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match ? match[1] : null;
}

async function resolveUserFromToken(token: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

/**
 * Attach the Supabase user to `req.user` when a valid Bearer token is
 * presented. Does NOT reject unauthenticated requests — handlers that
 * need a user should use `requireAuth` or `requireSelf` below.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  const user = await resolveUserFromToken(token);
  if (user) req.user = user;
  next();
}

/**
 * Enforce authentication. Falls back to trusting the `:userId` path
 * param ONLY when Supabase env vars are unset (local dev), and logs
 * loudly so it can't go unnoticed.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  if (!supabase) {
    // Dev-mode fallback: synthesise a user from :userId so the app keeps
    // working without Supabase creds locally.
    const fallback = typeof req.params.userId === "string" ? req.params.userId : null;
    if (fallback) {
      req.user = { id: fallback };
      return next();
    }
  }
  return res.status(401).json({ error: "Authentication required" });
}

/**
 * Enforce that the authenticated user is the one referenced in
 * `:userId`. This is the real trust boundary for per-user mutations.
 */
export function requireSelf(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    const paramId = req.params.userId;
    if (!paramId) return res.status(400).json({ error: "userId is required" });
    if (req.user!.id !== paramId) {
      return res.status(403).json({ error: "Cannot act on another user's resources" });
    }
    next();
  });
}

export const authEnabled = supabase !== null;
