/* ============================================================
   THESMALLBOOK, SERVICE WORKER
   Installable + offline. Versioned files load from the phone (instant), HTML always fresh.
   Bump CACHE_VERSION when you deploy changes.
   ============================================================ */

const CACHE_VERSION = "tsb-v320";
/* NOTE: the assets/logos/* entries below mirror js/store-data.js exactly.
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
  "./notes.html",
  "./casefile.html",
  "./review.html",
  "./assets/case/exhibit-bottle.jpg",
  "./assets/case/exhibit-shed.jpg",
  "./assets/case/exhibit-crates.jpg",
  "./gold.html",
  "./deepdive.html",
  "./podcasts.html",
  "./about.html",
  "./legal.html",
  "./scan.html",
  "./js/tts-engine.js",
  "./js/bootguard.js",
  "./js/weekly.js",
  "./js/ask-data.js",
  "./js/ask.js",
  "./js/askquota.js",
  "./js/paywall.js",
  "./js/ask-modes-data.js",
  "./js/highlight.js",
  "./js/install.js",
  "./favicon.ico",
  "./assets/loader-logo.png",
  "./assets/og-image.png",
  "./css/studio.css",
  "./js/studio.js",
  "./js/dictate.js",
  "./js/osint.js",
                                                  "./js/gold.js",
  "./store.html",
  "./js/store.js",
  "./js/store-data.js",
  "./css/store.css",
  "./assets/logos/adobe-tile.png",
  "./assets/logos/airtel.png",
  "./assets/logos/ajio-tile.svg",
  "./assets/logos/amazon-tile.png",
  "./assets/logos/swiggy.png",
  "./assets/logos/amazon.svg",
  "./assets/logos/apple.svg",
  "./assets/logos/audible.svg",
  "./assets/logos/axis.png",
  "./assets/logos/bookmyshow.svg",
  "./assets/logos/canva.png",
  "./assets/logos/coursera.png",
  "./assets/logos/cred.svg",
  "./assets/logos/cultfit-tile.svg",
  "./assets/logos/duolingo-tile.svg",
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
  "./assets/logos/lenskart-tile.svg",
  "./assets/logos/makemytrip.png",
  "./assets/logos/meesho-tile.png",
  "./assets/logos/myntra-tile.png",
  "./assets/logos/netflix-tile.svg",
  "./assets/logos/notion.svg",
  "./assets/logos/nykaa-tile.png",
  "./assets/logos/perplexity-tile.svg",
  "./assets/logos/redbus.png",
  "./assets/logos/sbi.png",
  "./assets/logos/skillshare.svg",
  "./assets/logos/sonyliv-tile.png",
  "./assets/logos/spotify.svg",
  "./assets/logos/storytel.png",
  "./assets/logos/thesmallbook-tile.svg",
  "./assets/logos/udemy.svg",
  "./assets/logos/youtube.png",
  "./assets/logos/zee5-tile.png",
  "./js/affiliate.js",
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
  "./js/mindpick.js",
  "./js/notes-store.js",
  "./js/deepdive-data.js",
  "./js/deepdive.js",
  "./js/podcast-data.js",
  "./css/deepdive.css",
  "./js/onboard.js",
  "./js/trial.js",
  "./js/ideaaudit.js",
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
     Byte-range requests (video seeking) always go to the network untouched.
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
  /* media byte-range (audio seeking) always goes to the network untouched;
     answering a partial request from a full cached response breaks playback */
  if (e.request.headers.get("range")) return;

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
  } else if (url.origin === location.origin &&
             (/[?&]v=/.test(url.search) ||
              /\.(woff2|woff|png|jpe?g|svg|webp|ico|mp3|m4a|ogg|json)$/i.test(url.pathname))) {
    /* v319: versioned code, covers, fonts and audio are immutable - a new
       deploy ships new ?v= URLs, so the saved copy can never meet new code.
       They load from the phone, not the network: after the first visit every
       page, book and podcast opens instantly, even on the slowest connection.
       HTML above stays fresh-first so updates still land the moment they ship. */
    e.respondWith(
      caches.open(CACHE_VERSION).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok && res.status === 200) c.put(e.request, res.clone());
        return res;
      })
    );
  } else {
    /* anything else (cross-origin feeds, CDNs): network-first, the saved
       copy is only the offline fallback */
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && url.hostname.includes("fonts")) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((r) => r || caches.match(e.request, { ignoreSearch: true }))
        )
    );
  }
});