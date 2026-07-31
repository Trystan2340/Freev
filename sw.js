importScripts("./offline-manifest.js");

const manifest = self.FREEV_OFFLINE_MANIFEST || { version: "fallback", assets: [] };
const CACHE_PREFIX = "freev-offline-";
const CACHE_VERSION = `${CACHE_PREFIX}${manifest.version}`;
const OFFLINE_URL = "./offline.html";
const APP_SHELL = ["./", "./offline-manifest.js", ...manifest.assets];
const CACHEABLE_EXTERNAL_ORIGINS = new Set([
  "https://cdnjs.cloudflare.com",
  "https://cdn.jsdelivr.net",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://www.gstatic.com",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

function isCacheableLocalRequest(request) {
  const url = new URL(request.url);
  if (request.method !== "GET") return false;
  if (url.origin === self.location.origin) {
    return !url.pathname.includes("/__/") && !url.pathname.includes("/api/");
  }
  return CACHEABLE_EXTERNAL_ORIGINS.has(url.origin);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheableLocalRequest(request)) return;

  if (request.mode === "navigate" && new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok || response.type === "opaque") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
