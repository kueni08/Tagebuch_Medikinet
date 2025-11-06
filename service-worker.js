const CACHE_NAME = "medikinet-tagebuch-v1";
const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./cloud-guide.html",
  "./stimmungsverlauf.html",
  "./manifest.webmanifest",
  "./cloud-config.js",
  "./js/pwa.js",
  "./js/data-access.mjs",
  "./js/mood-chart.mjs",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const requestUrl = new URL(request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          if (sameOrigin && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
