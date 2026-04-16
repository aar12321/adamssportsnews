import { newsService } from "../newsService";
import { pushService } from "../pushService";
import { broadcast } from "../sse";
import type { NewsArticle } from "@shared/schema";

// -----------------------------------------------------------------------------
// Periodically pull the latest news, detect injury / breaking / trade
// articles we haven't seen before, and fan out:
//   - web-push to users opted into the matching notification category
//   - SSE 'news' event so open tabs surface it without refresh
// -----------------------------------------------------------------------------

const POLL_MS = 120_000;
const seen = new Set<string>();
const SEEN_MAX = 2000;

function classify(article: NewsArticle): "injury" | "trade" | "breaking" | "fantasy" | null {
  const hay = `${article.title} ${article.description}`.toLowerCase();
  const cat = (article.category || "").toLowerCase();
  const tags = (article.tags || []).map((t) => t.toLowerCase());
  if (cat === "injury" || tags.includes("injury") || /\b(ruled out|injur|acl|concussion|sidelined)\b/.test(hay)) return "injury";
  if (cat === "trade" || tags.includes("trade") || /\btrade(d)?|traded to\b/.test(hay)) return "trade";
  if (cat === "breaking" || tags.includes("breaking") || /\bbreaking\b/i.test(article.title)) return "breaking";
  return null;
}

async function tick(): Promise<void> {
  try {
    const articles = await newsService.getLatestNews(undefined, 40);
    for (const article of articles) {
      if (seen.has(article.id)) continue;
      seen.add(article.id);
      if (seen.size > SEEN_MAX) {
        // Drop oldest entries — first inserted
        const iter = seen.values();
        for (let i = 0; i < 100; i++) {
          const v = iter.next().value;
          if (v) seen.delete(v);
        }
      }
      const category = classify(article);
      if (!category) continue;
      // Always push to SSE so open tabs get it
      broadcast([`news:${category}`, "news:all"], "news", { category, article });
      // Push to mobile/desktop subscribers opted-in
      const title = article.title.slice(0, 80);
      const body = (article.description || "").slice(0, 180);
      void pushService.broadcastByCategory(category, {
        title,
        body,
        url: article.url,
        tag: article.id,
        category,
      }, article.id);
    }
  } catch (err) {
    console.error("[newsAlertsWorker] tick failed:", err);
  }
}

let started = false;
let interval: NodeJS.Timeout | null = null;

export function startNewsAlertsWorker(): void {
  if (started) return;
  started = true;
  // Prime the seen set with the current articles so we don't push the
  // whole feed on boot — we only want *new* items.
  newsService
    .getLatestNews(undefined, 40)
    .then((list) => list.forEach((a) => seen.add(a.id)))
    .catch(() => {});
  interval = setInterval(() => void tick(), POLL_MS);
  console.log("[newsAlertsWorker] started");
}

export function stopNewsAlertsWorker(): void {
  if (interval) clearInterval(interval);
  interval = null;
  started = false;
}
