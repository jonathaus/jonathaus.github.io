const CACHE = "trip-v6";

const ASSETS = [
  "/trip/",
  "/trip/index.html",
  "/trip/style.css",
  "/trip/script.js",
  "/trip/config.json"
];

// 📦 install → force immediate activation
self.addEventListener("install", event => {
  self.skipWaiting(); // 🔥 force new SW to take control immediately

  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

// 🔥 activate → delete ALL old caches + take control instantly
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim(); // ⚡ instantly control open tabs
});

// 🌐 fetch → always try network first (Instagram-style freshness)
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});