import { apiRequest, fetchJson } from "./queryClient";

// -----------------------------------------------------------------------------
// Browser-side push helper.
//
// Usage:
//   const p = await getPushStatus();
//   if (p.supported && !p.subscribed) await enablePushNotifications();
//
// The service worker at /sw.js renders incoming notifications — this file
// only handles subscription + unsubscription bookkeeping against the server.
// -----------------------------------------------------------------------------

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  publicKey?: string;
  configured: boolean;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(b64) : "";
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("[push] service worker registration failed:", err);
    return null;
  }
}

async function fetchPublicKey(): Promise<{ publicKey?: string; configured: boolean }> {
  try {
    return await fetchJson<{ publicKey?: string; configured: boolean }>(
      "/api/push/public-key",
    );
  } catch {
    return { configured: false };
  }
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) {
    return { supported: false, permission: "unsupported", subscribed: false, configured: false };
  }
  const [reg, key] = await Promise.all([getRegistration(), fetchPublicKey()]);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: !!sub,
    publicKey: key.publicKey,
    configured: key.configured,
  };
}

export async function enablePushNotifications(): Promise<
  | { ok: true; endpoint: string }
  | { ok: false; reason: string }
> {
  if (!pushSupported()) return { ok: false, reason: "Push is not supported in this browser" };
  const reg = await getRegistration();
  if (!reg) return { ok: false, reason: "Could not register service worker" };
  const { publicKey, configured } = await fetchPublicKey();
  if (!configured || !publicKey) {
    return { ok: false, reason: "Push notifications are not configured on the server" };
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Notification permission was denied" };

  // Reuse existing subscription if it's already bound to this server's key
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    try { await sub.unsubscribe(); } catch { /* ignore */ }
  }
  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "Subscription missing keys" };
  }
  await apiRequest("POST", "/api/push/subscribe", {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  return { ok: true, endpoint: json.endpoint };
}

export async function disablePushNotifications(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;
  try {
    await apiRequest("POST", "/api/push/unsubscribe", { endpoint: sub.endpoint });
  } catch {
    /* server failure is fine — still unsub on device */
  }
  try {
    await sub.unsubscribe();
  } catch {
    return false;
  }
  return true;
}

export async function sendTestPush(): Promise<{ sent: number } | { error: string }> {
  try {
    return await apiRequest<{ sent: number }>("POST", "/api/push/test");
  } catch (err: any) {
    return { error: String(err?.message || "Failed") };
  }
}
