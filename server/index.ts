process.env.NODE_ENV ??= "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { attachUser } from "./auth";
import { installShutdownHooks, isPersistenceEnabled, persistenceDir } from "./persistence";

installShutdownHooks();

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
// Cap JSON/urlencoded bodies so a malicious client can't exhaust memory.
// 256KB is ample for our largest current payload (roster validation) and
// still catches obvious abuse cases.
const MAX_BODY_SIZE = "256kb";
app.use(express.json({
  limit: MAX_BODY_SIZE,
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: MAX_BODY_SIZE }));

// Resolve the Supabase session from Authorization: Bearer <token> so
// per-user routes can enforce that the caller matches :userId.
app.use(attachUser);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    // Log first so we have a trace even if the response write races.
    // Do NOT re-throw — throwing after res.json() used to crash the
    // process instead of letting Express finish the response.
    console.error(`[${req.method} ${req.path}] ${status} ${message}`, err?.stack || err);
    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // reusePort is unsupported on Windows and can throw ENOTSUP
  const listenOpts: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform !== "win32") {
    listenOpts.reusePort = true;
  }
  server.listen(listenOpts, () => {
    log(`serving on port ${port}`);
    // Surface deployment-readiness at startup so nothing important is
    // silently misconfigured. Keep it to a single block so it's hard to miss.
    const warnings: string[] = [];
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      warnings.push(
        "SUPABASE_URL / SUPABASE_ANON_KEY not set — per-user routes run in INSECURE dev mode."
      );
    }
    if (isPersistenceEnabled()) {
      console.log(`[startup] Betting + preferences persisting to ${persistenceDir()} (JSON snapshots).`);
    } else {
      warnings.push(
        "Persistence disabled (DATA_DIR not writable). Betting bankroll and user preferences will be wiped on every restart."
      );
    }
    warnings.push(
      "Fantasy rosters still live in the client's localStorage. A proper Postgres migration is the next step before multi-device sync."
    );
    if (warnings.length) {
      console.warn("\n[startup] readiness notes:");
      warnings.forEach(w => console.warn(`  - ${w}`));
      console.warn("");
    }
  });
})();
