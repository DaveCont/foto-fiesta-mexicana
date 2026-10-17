const CACHE = "foto-fiesta-v3";
const APP = [
  "./",
  "index.html",
  "css/app.css",
  "js/app.js",
  "js/adjust.js",
  "js/camera.js",
  "js/compose.js",
  "js/frames.js",
  "js/share.js",
  "js/storage.js",
  "js/vignette.js",
  "manifest.webmanifest",
  "frames.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(APP);
      const frames = await (await cache.match("frames.json")).json();
      await cache.addAll(frames.map((f) => f.src));
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("foto-fiesta-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE),
        cached = await cache.match(event.request);
      const update = fetch(event.request).then((response) => {
        if (response.ok || response.type === "opaque")
          return cache
            .put(event.request, response.clone())
            .then(() => response);
        return response;
      });
      if (cached) {
        event.waitUntil(update.catch(() => {}));
        return cached;
      }
      try {
        return await update;
      } catch {
        return Response.error();
      }
    })(),
  );
});
