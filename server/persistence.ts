import fs from "fs";
import path from "path";

/**
 * Tiny durability layer for our in-memory services.
 *
 * Each named store lives in a JSON file under DATA_DIR (defaults to
 * ./data). Reads are synchronous at boot so services can hydrate before
 * requests start. Writes are debounced so bursty mutations don't thrash
 * the disk — the latest snapshot is flushed after DEBOUNCE_MS of quiet,
 * or immediately on process shutdown.
 *
 * This is intentionally NOT a database. It's a bridge so restarts don't
 * lose user bankroll / preferences until a proper Postgres migration
 * lands. It doesn't scale to multiple replicas, and concurrent writers
 * across processes will stomp each other.
 */

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const DEBOUNCE_MS = 500;

let ensuredDir = false;
let disabled = false;

function ensureDir(): boolean {
  if (ensuredDir) return !disabled;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    ensuredDir = true;
    return true;
  } catch (err: any) {
    console.warn(
      `[persistence] Could not create ${DATA_DIR} (${err?.message ?? err}). ` +
        `State will live in memory only and be wiped on restart.`
    );
    disabled = true;
    ensuredDir = true;
    return false;
  }
}

export function isPersistenceEnabled(): boolean {
  ensureDir();
  return !disabled;
}

export function persistenceDir(): string {
  return DATA_DIR;
}

export function readSnapshot<T>(name: string, fallback: T): T {
  if (!ensureDir()) return fallback;
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (err: any) {
    console.warn(`[persistence] Failed to read ${name}.json: ${err?.message ?? err}`);
    return fallback;
  }
}

const pendingTimers = new Map<string, NodeJS.Timeout>();
const pendingSnapshots = new Map<string, () => unknown>();

function writeSync(name: string, snapshot: unknown) {
  if (!ensureDir()) return;
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(snapshot), "utf8");
    // Atomic rename so a crashed write never leaves a half-written file.
    fs.renameSync(tmp, file);
  } catch (err: any) {
    console.warn(`[persistence] Failed to write ${name}.json: ${err?.message ?? err}`);
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

/**
 * Schedule a debounced write. `get` is called at flush time so the
 * caller always gets the latest state without having to serialise on
 * every mutation.
 */
export function scheduleSnapshot(name: string, get: () => unknown) {
  if (!ensureDir()) return;
  pendingSnapshots.set(name, get);
  const existing = pendingTimers.get(name);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    name,
    setTimeout(() => {
      pendingTimers.delete(name);
      const next = pendingSnapshots.get(name);
      if (!next) return;
      pendingSnapshots.delete(name);
      writeSync(name, next());
    }, DEBOUNCE_MS)
  );
}

/** Synchronously flush anything pending. Called from shutdown hooks. */
export function flushAll() {
  pendingTimers.forEach((timer, name) => {
    clearTimeout(timer);
    const get = pendingSnapshots.get(name);
    pendingSnapshots.delete(name);
    if (get) writeSync(name, get());
  });
  pendingTimers.clear();
}

let hooksInstalled = false;
export function installShutdownHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  const handler = () => {
    try { flushAll(); } catch { /* swallow — we're exiting */ }
  };
  process.on("beforeExit", handler);
  process.on("SIGINT", () => { handler(); process.exit(0); });
  process.on("SIGTERM", () => { handler(); process.exit(0); });
}
