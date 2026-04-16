import { defineConfig } from "drizzle-kit";

// drizzle-kit only needs DATABASE_URL when actually pushing migrations.
// Don't throw at import time — that breaks `npm run check` and tooling
// that reads this file without a DB configured.
const dbUrl = process.env.DATABASE_URL || "";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/dbSchema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
