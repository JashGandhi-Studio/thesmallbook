/* ============================================================
   THESMALLBOOK — SERVICE WORKER
   Cache-first for app shell & covers = installable + offline.
   Bump CACHE_VERSION when you deploy changes.
   ============================================================ */

const CACHE_VERSION = "tsb-v252";
/* NOTE: the assets/logos/* entries below mirror js/store-data.js exactly —
   every tile the store links to must be precached, or the offline store
   shows broken images. tests/client-suite.js asserts they never drift. */
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
  "./css/studio.css",
  "./js/studio.js",
  "./js/dictate.js",
  "./js/osint.js",
  "./assets/quote-bgs/bg01-paper.jpg",
  "./assets/quote-bgs/bg02-dark.jpg",
  "./assets/quote-bgs/bg03-sunset.jpg",
  "./assets/quote-bgs/bg04-ocean.jpg",
  "./assets/quote-bgs/bg05-forest.jpg",
  "./assets/quote-bgs/bg06-blush.jpg",
  "./assets/quote-bgs/bg07-lilac.jpg",
  "./assets/quote-bgs/bg08-gold.jpg",
  "./assets/quote-bgs/bg09-cream.jpg",
  "./assets/quote-bgs/bg10-terracotta.jpg",
  "./assets/quote-bgs/bg11-midnight.jpg",
  "./assets/quote-bgs/bg12-marble.jpg",
  "./assets/quote-bgs/bg13-pastel-dream.jpg",
  "./assets/quote-bgs/bg14-minimal-plant.jpg",
  "./assets/quote-bgs/bg15-sunset-ocean.jpg",
  "./assets/quote-bgs/bg16-forest-mist.jpg",
  "./assets/quote-bgs/bg17-beige-dunes.jpg",
  "./assets/quote-bgs/bg18-white-shadow.jpg",
  "./assets/quote-bgs/bg19-lavender-sky.jpg",
  "./assets/quote-bgs/bg20-peach-watercolor.jpg",
  "./assets/quote-bgs/bg21-night-forest.jpg",
  "./assets/quote-bgs/bg22-cream-linen.jpg",
  "./assets/quote-bgs/bg23-teal-horizon.jpg",
  "./assets/quote-bgs/bg24-blossom-sky.jpg",
  "./js/gold.js",
  "./store.html",
  "./js/store.js",
  "./js/store-data.js",
  "./css/store.css",
  "./assets/logos/adobe-tile.png",
  "./assets/logos/airtel.png",
  "./assets/logos/ajio-tile.svg",
  "./assets/logos/amazon-tile.png",
  "./assets/logos/amazon.svg",
  "./assets/logos/apple.svg",
  "./assets/logos/audible.svg",
  "./assets/logos/axis.png",
  "./assets/logos/bigbasket.svg",
  "./assets/logos/blinkit-tile.png",
  "./assets/logos/bookmyshow.svg",
  "./assets/logos/canva.png",
  "./assets/logos/coursera.png",
  "./assets/logos/cred.svg",
  "./assets/logos/cultfit-tile.svg",
  "./assets/logos/dominos-tile.png",
  "./assets/logos/duolingo-tile.svg",
  "./assets/logos/eatclub-tile.svg",
  "./assets/logos/firstcry-tile.svg",
  "./assets/logos/flipkart.png",
  "./assets/logos/github.png",
  "./assets/logos/grammarly-tile.svg",
  "./assets/logos/hdfc.png",
  "./assets/logos/headspace-tile.svg",
  "./assets/logos/hotstar-tile.png",
  "./assets/logos/indigo-tile.svg",
  "./assets/logos/irctc-tile.svg",
  "./assets/logos/jio.png",
  "./assets/logos/kfc-tile.svg",
  "./assets/logos/lenskart-tile.svg",
  "./assets/logos/makemytrip.png",
  "./assets/logos/mcdonalds-tile.svg",
  "./assets/logos/meesho-tile.png",
  "./assets/logos/myntra-tile.png",
  "./assets/logos/netflix-tile.svg",
  "./assets/logos/notion.svg",
  "./assets/logos/nykaa-tile.png",
  "./assets/logos/ola-tile.png",
  "./assets/logos/perplexity-tile.svg",
  "./assets/logos/pizzahut-tile.png",
  "./assets/logos/redbus.png",
  "./assets/logos/sbi.png",
  "./assets/logos/skillshare.svg",
  "./assets/logos/sonyliv-tile.png",
  "./assets/logos/spotify.svg",
  "./assets/logos/storytel.png",
  "./assets/logos/swiggy.png",
  "./assets/logos/thesmallbook-tile.svg",
  "./assets/logos/uber-tile.png",
  "./assets/logos/udemy.svg",
  "./assets/logos/youtube.png",
  "./assets/logos/zee5-tile.png",
  "./assets/logos/zepto-tile.png",
  "./assets/logos/zomato-tile.svg",
  "./js/affiliate.js",
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
  "./js/book-tools.js",
  "./js/config.js",
  "./js/onboard.js",
  "./js/gate.js",
  "./js/community.js",
  "./js/voice.js", "js/quotedesk.js",
  "./profile.html",
  "./write.html",
  "./dm.html",
  "./notifications.html",
  "./js/auth.js",
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