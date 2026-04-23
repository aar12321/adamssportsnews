import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "tests/**/*.test.ts"],
    // Fresh in-memory state per test file so betting/preferences stores
    // don't leak state across test files.
    isolate: true,
    pool: "forks",
    env: {
      // Route every test suite's persistence snapshots into a disposable
      // directory so unit tests never clobber real dev data.
      DATA_DIR: path.resolve(__dirname, "node_modules/.vitest-data"),
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
