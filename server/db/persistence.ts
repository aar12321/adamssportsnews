import fs from "node:fs";
import path from "node:path";

// -----------------------------------------------------------------------------
// Simple JSON-file-backed persistence layer.
//
// For development and small deployments this gives us real durability
// (survives server restart) without a database server. Writes are
// debounced so rapid updates don't thrash the disk. Reads are in-memory.
//
// When DATABASE_URL is set, services SHOULD use the Drizzle-backed
// repositories instead — see shared/dbSchema.ts. This module is the
// fallback for environments without a provisioned database.
// -----------------------------------------------------------------------------

const DEFAULT_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), ".data");

function ensureDir(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
}

type Loader<T> = () => T;

export class JsonStore<T extends object> {
  private readonly filePath: string;
  private data: T;
  private writeTimer: NodeJS.Timeout | null = null;
  private readonly flushDelayMs: number;
  private readonly loader: Loader<T>;

  constructor(name: string, loader: Loader<T>, flushDelayMs = 250) {
    ensureDir(DEFAULT_DIR);
    this.filePath = path.join(DEFAULT_DIR, `${name}.json`);
    this.loader = loader;
    this.flushDelayMs = flushDelayMs;
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): T {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed as T;
      }
    } catch (err) {
      console.error(`[persistence] failed to load ${this.filePath}:`, err);
    }
    return this.loader();
  }

  /** Read the entire store. Mutations via this reference require calling save(). */
  read(): T {
    return this.data;
  }

  /** Replace the store contents and schedule a flush. */
  write(next: T): void {
    this.data = next;
    this.scheduleFlush();
  }

  /** Call after mutating the data returned by read() to trigger a flush. */
  save(): void {
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.flushNow();
    }, this.flushDelayMs);
  }

  /** Synchronous flush. Used on shutdown or when atomicity matters. */
  flushNow(): void {
    try {
      const tmp = this.filePath + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error(`[persistence] failed to flush ${this.filePath}:`, err);
    }
  }
}

// Register a best-effort flush on process exit so a crash doesn't lose the
// last few seconds of edits. Kept separate so individual stores register
// themselves on construction.
const registeredStores = new Set<JsonStore<any>>();
export function registerStore<T extends object>(store: JsonStore<T>): void {
  registeredStores.add(store);
}

let handlersInstalled = false;
export function installShutdownHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;
  const flushAll = () => {
    registeredStores.forEach((store) => {
      try { store.flushNow(); } catch { /* ignore */ }
    });
  };
  process.on("beforeExit", flushAll);
  process.on("SIGINT", () => { flushAll(); process.exit(0); });
  process.on("SIGTERM", () => { flushAll(); process.exit(0); });
}
