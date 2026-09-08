/* ============================================================
   THESMALLBOOK — SERVICE WORKER
   Cache-first for app shell & covers = installable + offline.
   Bump CACHE_VERSION when you deploy changes.
   ============================================================ */

const CACHE_VERSION = "tsb-v222";
const APP_SHELL = [
  "./",
  "./index.html",
  "./book.html",
  "./chat.html",
  "./settings.html",
  "./stories.html",
  "./story.html",
  "./404.html",
  "./login.html",
  "./graveyard.html",
  "./gold.html",
  "./about.html",
  "./scan.html",
  "./js/tts-engine.js",
  "./js/ask-data.js",
  "./js/ask.js",
  "./js/highlight.js",
  "./js/install.js",
  "./favicon.ico",
  "./favicon.png",
  "./assets/loader-logo.png",
  "./assets/og-image.png",
  "./apple-touch-icon.png",
  "./css/style.css",
  "./js/prefs.js",
  "./js/support.js",
  "./js/upi.js",
  "./js/lang.js",
  "./js/failures.js",
  "./js/graveyard.js",
  "./js/data.js",
  "./js/app.js",
  "./js/bar.js",
  "./js/scanner-data.js",
  "./js/scan-titles.js",
  "./js/book.js",
  "./js/config.js",
  "./js/onboard.js",
  "./js/gate.js",
  "./js/community.js",
  "./profile.html",
  "./write.html",
  "./dm.html",
  "./notifications.html",
  "./js/auth.js",
  "./js/store.js",
  "./js/stories.js",
  "./js/stories-seed.js",
  "./js/stories-community.js",
  "./js/story.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
].map(function (u) { return /\.(js|css)$/.test(u) ? u + "?v=" + CACHE_VERSION.split("-")[1] : u; });

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
  const fu = new URL(e.request.url);
  /* community media (covers / voice / avatars): cache-first = offline listening.
     Byte-range requests (video seeking) always go to the network untouched —
     caching partial 206 responses breaks playback (range headers are ignored
     by Cache API matching). Only full 200 responses are cached. */
  if (fu.pathname.includes("/storage/v1/object/public/")) {
    if (e.request.headers.get("range")) return;
    e.respondWith(
      caches.open(CACHE_VERSION + "-media").then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok && res.status === 200) c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }
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
