/* KAILA browser push worker. Firebase sends a standard Web Push payload. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  const notification = payload.notification || payload.data?.notification || {};
  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(notification.title || "KAILA update", {
    body: notification.body || "Open KAILA to see what changed.",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: data.notificationId || payload.fcmMessageId,
    data: { url: "/notifications" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) { existing.navigate(destination); return existing.focus(); }
    return self.clients.openWindow(destination);
  }));
});
