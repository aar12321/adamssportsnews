import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

/**
 * Postgres client for per-user persistence. Wired to Neon's HTTP driver
 * because it works from both long-lived Node and serverless runtimes
 * without keeping connection pools alive between requests.
 *
 * Reads DATABASE_URL from the environment only; when unset, every
 * caller gets `null` back and the application falls through to the
 * JSON-snapshot layer in persistence.ts. This lets local dev and
 * tests run without a database while production can be flipped on by
 * just setting the env var.
 */

export type DB = NeonHttpDatabase<typeof schema>;

let db: DB | null = null;
let initialized = false;

function init(): DB | null {
  if (initialized) return db;
  initialized = true;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[db] DATABASE_URL not set — per-user data persists to JSON snapshots only."
    );
    return null;
  }
  try {
    const client = neon(url);
    db = drizzle(client, { schema });
    console.log("[db] Postgres persistence enabled.");
    return db;
  } catch (err: any) {
    console.warn(`[db] Failed to initialise Postgres client: ${err?.message ?? err}. Falling back to JSON snapshots.`);
    return null;
  }
}

export function getDb(): DB | null {
  return init();
}

export function isDbEnabled(): boolean {
  return init() !== null;
}
