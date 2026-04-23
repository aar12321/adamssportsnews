import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Use a throwaway directory so the tests can't clobber real persistence
// data (the vitest.config DATA_DIR points into node_modules but we still
// scope per-test with a subfolder to keep writes isolated).
const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ast-persist-"));
process.env.DATA_DIR = TEST_DIR;

// Import AFTER env is set so persistence.ts picks up our test dir.
const {
  readSnapshot,
  scheduleSnapshot,
  flushAll,
  isPersistenceEnabled,
  persistenceDir,
} = await import("./persistence");

afterAll(() => {
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("persistence smoke", () => {
  it("reports persistence is enabled and uses the test dir", () => {
    expect(isPersistenceEnabled()).toBe(true);
    expect(persistenceDir()).toBe(TEST_DIR);
  });

  it("returns the fallback when no snapshot exists", () => {
    const value = readSnapshot("never-written", { hello: "world" });
    expect(value).toEqual({ hello: "world" });
  });

  it("round-trips a snapshot after flushAll", () => {
    scheduleSnapshot("round-trip", () => ({ n: 42, list: [1, 2, 3] }));
    flushAll();
    const restored = readSnapshot<{ n: number; list: number[] }>("round-trip", { n: 0, list: [] });
    expect(restored.n).toBe(42);
    expect(restored.list).toEqual([1, 2, 3]);
  });

  it("collapses multiple schedules for the same name into a single write", () => {
    // Schedule three updates back to back — only the latest should survive.
    scheduleSnapshot("latest", () => ({ version: "a" }));
    scheduleSnapshot("latest", () => ({ version: "b" }));
    scheduleSnapshot("latest", () => ({ version: "c" }));
    flushAll();
    const restored = readSnapshot<{ version: string }>("latest", { version: "" });
    expect(restored.version).toBe("c");
  });

  it("writes atomically (no .tmp files left behind)", () => {
    scheduleSnapshot("atomic", () => ({ ok: true }));
    flushAll();
    const files = fs.readdirSync(TEST_DIR);
    expect(files).toContain("atomic.json");
    expect(files.every((f: string) => !f.includes(".tmp"))).toBe(true);
  });

  it("tolerates a corrupted snapshot and falls back gracefully", () => {
    // Hand-write invalid JSON.
    const file = path.join(TEST_DIR, "corrupt.json");
    fs.writeFileSync(file, "{ not json }", "utf8");
    const restored = readSnapshot("corrupt", { safe: true });
    expect(restored).toEqual({ safe: true });
  });
});
