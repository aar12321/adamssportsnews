import webpush from "web-push";
import { pushRepo, preferencesRepo, sentNotificationsRepo, type PushSubscriptionRecord } from "./db/repos";
import type { UserPreferences } from "@shared/schema";

// -----------------------------------------------------------------------------
// Web Push notifications.
//
// Uses VAPID keys from env — generate once with `npx web-push generate-vapid-keys`
// and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY. If keys are missing the
// service degrades gracefully: subscriptions still record, but no pushes
// are sent. VAPID_PUBLIC_KEY is exposed to the client via /api/push/public-key.
// -----------------------------------------------------------------------------

function env(name: string): string | undefined {
  // @ts-ignore - process.env available at runtime
  return (process.env || {})[name];
}

const VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = env("VAPID_SUBJECT") || "mailto:admin@example.com";

let pushConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushConfigured = true;
  } catch (err) {
    console.error("[push] failed to configure VAPID:", err);
  }
} else {
  console.warn("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push disabled.");
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  category?: "injury" | "trade" | "breaking" | "fantasy" | "betting" | "score";
}

export class PushService {
  get isConfigured(): boolean {
    return pushConfigured;
  }

  get publicKey(): string | undefined {
    return VAPID_PUBLIC_KEY;
  }

  async subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<PushSubscriptionRecord> {
    const record: PushSubscriptionRecord = {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      createdAt: new Date().toISOString(),
    };
    return pushRepo.add(record);
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await pushRepo.removeByEndpoint(endpoint);
  }

  /** Send a push to one user. Returns how many endpoints received it. */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!pushConfigured) return 0;
    const subs = await pushRepo.listByUser(userId);
    let sent = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          );
          sent++;
        } catch (err: any) {
          // 404/410 → subscription is dead, prune it
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await pushRepo.removeByEndpoint(sub.endpoint);
          } else {
            console.warn(`[push] send failed (${err?.statusCode}):`, err?.message || err);
          }
        }
      }),
    );
    return sent;
  }

  /** Broadcast to every user whose notification preferences opt in to `category`. */
  async broadcastByCategory(category: PushPayload["category"], payload: PushPayload, articleId?: string): Promise<number> {
    if (!pushConfigured) return 0;
    const users = await preferencesRepo.all();
    let delivered = 0;
    await Promise.all(
      users.map(async (prefs) => {
        if (!this.userWantsCategory(prefs, category)) return;
        if (articleId && (await sentNotificationsRepo.hasSeen(prefs.userId, articleId))) return;
        const n = await this.sendToUser(prefs.userId, payload);
        if (n > 0 && articleId) await sentNotificationsRepo.markSent(prefs.userId, articleId);
        delivered += n;
      }),
    );
    return delivered;
  }

  private userWantsCategory(prefs: UserPreferences, category: PushPayload["category"]): boolean {
    const n = prefs.notifications;
    switch (category) {
      case "injury": return !!n.injuryNews;
      case "trade": return !!n.tradeNews;
      case "breaking": return !!n.breakingNews;
      case "fantasy": return !!n.fantasyAlerts;
      case "betting": return !!n.bettingAlerts;
      case "score": return !!n.liveScores;
      default: return false;
    }
  }
}

export const pushService = new PushService();
