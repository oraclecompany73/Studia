// Push-notification worker for Studia. Separate from the offline worker (/sw.js):
// registered under /push/ so it can show system notifications even when the tab is closed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "Studia", body: "" };
  }
  const title = data.title || "Studia";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    lang: data.lang || "ar",
    dir: data.dir || "auto",
    tag: data.tag || "studia",
    renotify: true,
    requireInteraction: false,
    vibrate: [120, 60, 120],
    data: { url: data.url || "/notifications" },
    actions: [{ action: "open", title: data.lang === "en" ? "Open" : "فتح" }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/notifications",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          await w.focus();
          if ("navigate" in w) await w.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Browser rotated the subscription; the next signed-in visit will re-save via refreshPush.
  event.waitUntil(Promise.resolve());
});
