const CACHE = "trip-v8.8";

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

  // claim clients and attempt to make open pages reload so iOS gets the new content
  event.waitUntil(
    (async () => {
      await self.clients.claim(); // ⚡ instantly control open tabs

      try {
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of all) {
          // prefer navigate when supported (forces a full reload)
          try {
            if (client && client.url && typeof client.navigate === 'function') {
              // client.navigate returns a promise; handle rejection by messaging the client
              client.navigate(client.url).catch(() => client.postMessage({ type: 'SW_UPDATE_RELOAD' }));
            } else if (client && typeof client.postMessage === 'function') {
              // ask the page to reload; add a small delay to avoid interrupting immediate UI
              client.postMessage({ type: 'SW_UPDATE_RELOAD' });
            }
          } catch (e) {
            try { client.postMessage({ type: 'SW_UPDATE_RELOAD' }); } catch (err) { /* ignore */ }
          }
        }
      } catch (err) {
        // ignore
      }
    })()
  );
});

// 🌐 fetch → always try network first (Instagram-style freshness)
self.addEventListener("fetch", event => {
  // For navigations (HTML) force network with no-store to avoid stale HTTP caches
  const isNavigation = event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(resp => {
        // only cache successful navigation responses for offline fallback
        if (resp && resp.ok) {
          try {
            const copy = resp.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
          } catch (e) { /* ignore clone/cache errors */ }
        }
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // default: try network then fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});