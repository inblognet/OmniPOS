const CACHE_NAME = "omnipos-mobile-v2";
const urlsToCache = [
  "/",
  "/dashboard",
  "/products",
  "/orders",
  "/login",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.log("Cache addAll error:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        return caches.match("/");
      });
    })
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-icon.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
      type: data.type,
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
  
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.action === "dismiss") {
    return;
  }
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Background sync
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-data") {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  for (const request of keys) {
    if (request.url.includes("/api/")) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.log("Sync failed for:", request.url);
      }
    }
  }
}
