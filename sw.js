/* ============================================================
   THESMALLBOOK — SERVICE WORKER
   Cache-first for app shell & covers = installable + offline.
   Bump CACHE_VERSION when you deploy changes.
   ============================================================ */

const CACHE_VERSION = "tsb-v64";
const APP_SHELL = [
  "./",
  "./index.html",
  "./book.html",
  "./stories.html",
  "./story.html",
  "./404.html",
  "./graveyard.html",
  "./about.html",
  "./js/ask-data.js",
  "./js/ask.js",
  "./favicon.ico",
  "./favicon.png",
  "./assets/loader-logo.png",
  "./assets/og-image.png",
  "./apple-touch-icon.png",
  "./css/style.css",
  "./js/prefs.js",
  "./js/support.js",
  "./js/lang.js",
  "./js/failures.js",
  "./js/graveyard.js",
  "./js/data.js",
  "./js/app.js",
  "./js/book.js",
  "./js/config.js",
  "./js/store.js",
  "./js/stories.js",
  "./js/stories-seed.js",
  "./js/stories-community.js",
  "./js/story.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // never cache supabase API calls
  if (url.hostname.includes("supabase")) return;
  if (e.request.method !== "GET") return;

  // network-first for HTML (fresh content), cache-first for assets
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok && (url.origin === location.origin || url.hostname.includes("fonts"))) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        });
      })
    );
  }
});
