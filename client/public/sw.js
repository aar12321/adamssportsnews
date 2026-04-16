/* global self, clients */
// Service worker for web-push notifications.
// Keeps the service-worker footprint small — we don't cache or intercept
// fetches here. Only `push` and `notificationclick` matter.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "Adams Sports News", body: event.data.text() };
  }
  const title = payload.title || "Adams Sports News";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.png",
    badge: "/favicon.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/", category: payload.category },
    renotify: !!payload.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate?.(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
