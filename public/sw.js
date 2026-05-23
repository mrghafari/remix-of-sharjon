// Minimal service worker — required by Chrome to enable PWA install prompt.
// Network-only (no caching) to avoid stale-content issues.
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-only passthrough — required so Chrome considers the app PWA-installable.
  event.respondWith(fetch(event.request).catch(() => new Response("", { status: 504 })));
});
