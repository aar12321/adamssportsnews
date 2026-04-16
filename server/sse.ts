import type { Request, Response } from "express";

// -----------------------------------------------------------------------------
// Server-Sent Events helper.
//
// A minimal broadcaster with topic-based fan-out. Topics are opaque strings
// (e.g. "scores:basketball", "news:injury"). Clients connect via
// GET /api/<feature>/stream?topic=... and the handler uses broadcast() to
// push messages. Keeps connections alive with periodic comments so proxies
// don't drop them.
// -----------------------------------------------------------------------------

type Subscriber = { res: Response; topics: Set<string> };
const subscribers = new Set<Subscriber>();
const KEEPALIVE_MS = 20_000;

function writeEvent(res: Response, event: string | undefined, data: unknown): void {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sseHandler(req: Request, res: Response): void {
  // Parse topics from query string — comma-separated. If none, subscribe to
  // the "default" topic so at least something arrives.
  const raw = (req.query.topic as string | undefined) || "default";
  const topics = new Set(
    raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 16),
  );

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  // Retry hint for EventSource — 2 seconds before the browser reconnects.
  res.write("retry: 2000\n\n");
  writeEvent(res, "connected", { topics: Array.from(topics), ts: Date.now() });

  const sub: Subscriber = { res, topics };
  subscribers.add(sub);

  const keepalive = setInterval(() => {
    try {
      res.write(`: keepalive ${Date.now()}\n\n`);
    } catch {
      /* ignore */
    }
  }, KEEPALIVE_MS);

  const cleanup = () => {
    clearInterval(keepalive);
    subscribers.delete(sub);
    try { res.end(); } catch { /* ignore */ }
  };
  req.on("close", cleanup);
  req.on("aborted", cleanup);
  res.on("error", cleanup);
}

/**
 * Send a message to every connected subscriber whose topic set matches
 * any of the provided topics. Accepts a plain object payload.
 */
export function broadcast(topics: string[], event: string, data: unknown): void {
  const dead: Subscriber[] = [];
  subscribers.forEach((sub) => {
    const match = topics.some((t) => sub.topics.has(t));
    if (!match) return;
    try {
      writeEvent(sub.res, event, data);
    } catch {
      dead.push(sub);
    }
  });
  for (const d of dead) subscribers.delete(d);
}

export function sseStats() {
  return { connections: subscribers.size };
}
