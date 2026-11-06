/* ============================================================
   THESMALLBOOK, SERVICE WORKER
   Installable + offline. Versioned files load from the phone (instant), HTML always fresh.
   Bump CACHE_VERSION when you deploy changes.
   ============================================================ */

const CACHE_VERSION = "tsb-v391";
/* NOTE: the assets/logos/* entries below mirror js/store-data.js exactly.
   every tile the store links to must be precached, or the offline store
   shows broken images. tests/client-suite.js asserts they never drift. */
const APP_SHELL = [
  "js/motion-344.js",
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
  "./random.html",
  "./js/tts-engine.js",
  "./js/inapp-select.js",
  "./js/tts-piper.mjs",
  "./js/tts-piper-worker.js",
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
  "./favicon.svg",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./manifest.json",
  "./js/mark.js",
  "./assets/logo/mark.svg",
  "./assets/logo/mark-white.svg",
  "./assets/logo/mark-black.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-512-maskable.png",
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
  "./assets/logos/adobe.svg",
  "./assets/logos/airtel.png",
  "./assets/logos/ajio-tile.svg",
  "./assets/logos/ajio.svg",
  "./assets/logos/amazon-tile.png",
  "./assets/logos/amazon.svg",
  "./assets/logos/apple.svg",
  "./assets/logos/audible.svg",
  "./assets/logos/axis.png",
  "./assets/logos/bigbasket.svg",
  "./assets/logos/blinkit-tile.png",
  "./assets/logos/blinkit.png",
  "./assets/logos/bookmyshow.svg",
  "./assets/logos/canva.png",
  "./assets/logos/coursera.png",
  "./assets/logos/cred.svg",
  "./assets/logos/cultfit-tile.svg",
  "./assets/logos/cultfit.svg",
  "./assets/logos/dominos-tile.png",
  "./assets/logos/dominos.svg",
  "./assets/logos/duolingo-tile.svg",
  "./assets/logos/duolingo.svg",
  "./assets/logos/eatclub-tile.svg",
  "./assets/logos/eatclub.svg",
  "./assets/logos/firstcry-tile.svg",
  "./assets/logos/firstcry.svg",
  "./assets/logos/flipkart.png",
  "./assets/logos/github.png",
  "./assets/logos/grammarly-tile.svg",
  "./assets/logos/grammarly.svg",
  "./assets/logos/hdfc.png",
  "./assets/logos/headspace-tile.svg",
  "./assets/logos/headspace.svg",
  "./assets/logos/hotstar-tile.png",
  "./assets/logos/hotstar.svg",
  "./assets/logos/indigo-tile.svg",
  "./assets/logos/indigo.svg",
  "./assets/logos/irctc-tile.svg",
  "./assets/logos/irctc.svg",
  "./assets/logos/jio.png",
  "./assets/logos/kfc-tile.svg",
  "./assets/logos/kfc.svg",
  "./assets/logos/lenskart-tile.svg",
  "./assets/logos/lenskart.svg",
  "./assets/logos/makemytrip.png",
  "./assets/logos/mcdonalds-tile.svg",
  "./assets/logos/mcdonalds.svg",
  "./assets/logos/meesho-tile.png",
  "./assets/logos/meesho.svg",
  "./assets/logos/myntra-tile.png",
  "./assets/logos/myntra.svg",
  "./assets/logos/netflix-tile.svg",
  "./assets/logos/netflix.svg",
  "./assets/logos/notion.svg",
  "./assets/logos/nykaa-tile.png",
  "./assets/logos/nykaa.svg",
  "./assets/logos/ola-tile.png",
  "./assets/logos/ola.svg",
  "./assets/logos/perplexity-tile.svg",
  "./assets/logos/perplexity.svg",
  "./assets/logos/pizzahut-tile.png",
  "./assets/logos/pizzahut.svg",
  "./assets/logos/redbus.png",
  "./assets/logos/sbi.png",
  "./assets/logos/skillshare.svg",
  "./assets/logos/sonyliv-tile.png",
  "./assets/logos/sonyliv.svg",
  "./assets/logos/spotify.svg",
  "./assets/logos/storytel.png",
  "./assets/logos/swiggy.png",
  "./assets/logos/thesmallbook-tile.svg",
  "./assets/logos/thesmallbook.svg",
  "./assets/logos/uber-tile.png",
  "./assets/logos/uber.svg",
  "./assets/logos/udemy.svg",
  "./assets/logos/youtube.png",
  "./assets/logos/zee5-tile.png",
  "./assets/logos/zee5.svg",
  "./assets/logos/zepto-tile.png",
  "./assets/logos/zepto.png",
  "./assets/logos/zomato-tile.svg",
  "./assets/logos/zomato.svg",
  "./js/affiliate.js",
  "./css/style.css",
  "./js/prefs.js",
  "./js/support.js",
  "./js/upi.js",
  "./js/youpi.js",
  "./js/lang.js",
  "./js/failures.js",
  "./js/failures-extra.js",
  "./js/graveyard.js",
  "./js/graveyard2.js",
  "./css/graveyard2.css",
  "./js/data.js",
  "./js/spine-389.js",
  /* v391: the reader and the tabs it opens were never precached, so a first
     visit followed by a lost signal left every one of them unavailable and
     the page blank. Everything a page can load ships in the precache. */
  "./js/ab-discovery.js",
  "./js/audioplayer.js",
  "./js/avatar.js",
  "./js/backnav.js",
  "./js/casefile-data.js",
  "./js/daylight.js",
  "./js/founder.js",
  "./js/guide.js",
  "./js/listen.js",
  "./js/motion-344.js",
  "./js/packs-data.js",
  "./js/packs-ui.js",
  "./js/personalize.js",
  "./js/pip-mind.js",
  "./js/pip-ui.js",
  "./js/quotedesk.js",
  "./js/quotewall.js",
  "./js/reader.js",
  "./js/shelf3d.js",
  "./js/show-discovery.js",
  "./js/showcase.js",
  "./js/sounds.js",
  "./js/splash.js",
  "./js/taste.js",
  "./assets/fonts/newsreader.woff2",
  "./assets/fonts/newsreader-italic.woff2",
  "./assets/fonts/spacegrotesk.woff2",
  "./assets/fonts/archivoblack.woff2",
  "./js/app.js",
  "./js/bar.js",
  "./js/scanner-data.js",
  "./js/scan-titles.js",
  "./js/book.js",
  "./js/book-tools.js",
  "./js/share.js",
  "./js/config.js",
  "./js/mindpick.js",
  "./js/notes-store.js",
  "./js/deepdive-data.js",
  "./js/deepdive.js",
  "./js/podcast-data.js",
  /* the episode lists and chapter files ship with the app, so a show has to
     open on a weak signal too. They were loaded at runtime only, which meant
     the one moment the list was needed offline was the moment it was missing
     and the episode sheet sat on its fetching note for ever. */
  "./data/podcast-episodes.js",
  "./data/podcast-eps-388.js",
  "./data/audiobook-files.js",
  "./css/deepdive.css",
  "./js/onboard.js",
  "./js/trial.js",
  "./js/ideaaudit.js",
  "./js/gate.js",
  "./js/community.js",
  "./js/voice.js",
  "js/quotedesk.js",
  "./profile.html",
  "./write.html",
  "./dm.html",
  "./notifications.html",
  "./js/auth.js",
  "./js/stories.js",
  "./js/stories-seed.js",
  "./js/stories-community.js",
  "./js/story.js",
  "./kids.html",
  "./css/kids.css",
  "./js/kids-data.js",
  "./js/kids.js",
  "./js/soft-motion.js",
  "./js/editions-data.js",
  "./js/book3d.js",
  "./you.html",
  "./css/film.css",
  "./js/film.js",
  "./css/film2.css",
  "./css/desktop-v336.css",
  "./js/film2.js",
  "./js/goldpay.js",
  "./js/request.js",
  "./js/stt.js",
  "./js/wordtap.js",
  /* v391: reader.html was not in here, so an offline visit to a book fell
     through to the home page and every book looked empty. Every page ships. */
  "./audio.html",
  "./og-builder.html",
  "./quotes.html",
  "./reader.html",
].map(function (u) {
  /* The cache name is "tsb-v391", so split("-")[1] is "v391" and this used to
     store every file as "?v=v391" while every page asks for "?v=391". Not one
     precached script ever matched a request: online it silently fell through to
     the network, and offline every script failed, which is why the app had no
     working offline mode at all. The number has to have the leading v removed. */
  return /\.(m?js|css)$/.test(u) ? u + "?v=" + CACHE_VERSION.split("-")[1].replace(/^v/, "") : u;
});

self.addEventListener("install", (e) => {
  /* addAll is all or nothing: one refused connection out of the whole list
     threw the entire offline copy away and the app had no offline mode at all.
     Save what we can, a few at a time, and always take over. */
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_VERSION);
    let i = 0;
    const one = async () => {
      while (i < APP_SHELL.length) {
        const u = APP_SHELL[i];
        i += 1;
        try {
          const res = await fetch(u, { cache: "reload" });
          if (res && res.ok) await c.put(u, res);
        } catch (err) {
          /* a file we cannot reach now is retried on the next visit */
        }
      }
    };
    await Promise.all([one(), one(), one(), one(), one(), one()]);
    await self.skipWaiting();
  })());
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
  /* v323: episodes the reader SAVED FOR OFFLINE answer from the phone.
     The saved-media cache is checked FIRST; a miss flows into the normal
     strategies below, untouched. */
  e.respondWith((async () => {
    let c;
    try { c = await caches.open("tsb-saved-media"); } catch (eS) { return route(e); }
    let hit = null;
    try { hit = await c.match(e.request, { ignoreVary: true }); } catch (eR) {}
    /* opaque copies cannot be sliced to 206 - hand the full body over and let
       the media element cope; readable (cors-saved) copies are sliced by match */
    if (hit && hit.type === "opaque" && e.request.headers.get("range")) {
      try {
        const bare = new Request(e.request.url, { method: "GET" });
        const full = await c.match(bare, { ignoreVary: true });
        if (full) hit = full;
      } catch (eB) {}
    }
    return hit || route(e);
  })());
  return;

  /* v323: the normal strategies, consulted only when the episode is not saved */
  /* the saved copy of a file, whatever number is on its address */
  function fromCache(req) {
    return caches.open(CACHE_VERSION).then(async (c) => {
      const hit = (await c.match(req)) || (await c.match(req, { ignoreSearch: true }));
      if (hit) return hit;
      throw new Error("offline and not saved");
    });
  }

  async function route(e) {
  const url = new URL(e.request.url);
  // never cache supabase API calls
  if (url.hostname.includes("supabase")) return fetch(e.request);
  if (e.request.method !== "GET") return fetch(e.request);
  /* media byte-range (audio seeking) always goes to the network untouched;
     answering a partial request from a full cached response breaks playback */
  if (e.request.headers.get("range")) return fetch(e.request);

  if (e.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    return fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((cached) => cached || caches.match("./index.html")));
  } else if (url.origin === location.origin &&
             (/[?&]v=/.test(url.search) ||
              /\.(woff2|woff|png|jpe?g|svg|webp|ico|mp3|m4a|ogg|json)$/i.test(url.pathname))) {
    /* v319: versioned code, covers, fonts and audio are immutable - a new
       deploy ships new ?v= URLs, so the saved copy can never meet new code.
       They load from the phone, not the network: after the first visit every
       page, book and podcast opens instantly, even on the slowest connection.
       HTML above stays fresh-first so updates still land the moment they ship. */
    /* A reload marks every subresource "reload", and this branch used to go
       straight to the network with no way back. Pull the phone offline and hit
       reload and the whole app went blank, which is the worst moment for it to
       happen. Network first, saved copy second. */
    if (e.request.cache === "reload" || e.request.cache === "no-cache") {
      return fetch(e.request).then((res) => {
        if (res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => fromCache(e.request));
    }
    return caches.open(CACHE_VERSION).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) {
        /* background revalidation for code and SVGs so updates land immediately */
        if (/\.(js|css|svg)$/.test(url.pathname) && !/[?&]v=/.test(url.search)) {   /* v336: ?v= files never change */
          fetch(e.request, { cache: "no-cache" }).then((res) => {
            if (res && res.ok && res.status === 200) c.put(e.request, res.clone());
          }).catch(() => {});
        }
        return hit;
      }
      /* A version mismatch must never blank the app. If the exact address is
         not saved, the same file under another ?v= is still the right file:
         answer with that before touching the network. Without this, one wrong
         build number anywhere in a page turns into a dead page offline. */
      let near = null;
      try { near = await c.match(e.request, { ignoreSearch: true }); } catch (eN) {}
      if (near) return near;
      const res = await fetch(e.request);
      if (res.ok && res.status === 200) c.put(e.request, res.clone());
      return res;
    });
  } else {
    /* anything else (cross-origin feeds, CDNs): network-first, the saved
       copy is only the offline fallback */
    return fetch(e.request)
      .then((res) => {
        /* v391: our own files asked for on a plain address used to be served
           and forgotten, so the reader's spine and any lesson the reader had
           already opened were gone the moment the signal went. Same origin
           code is kept like the fonts always were. */
        if (res.ok && res.status === 200 && (url.origin === location.origin || url.hostname.includes("fonts"))) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((r) => r || caches.match(e.request, { ignoreSearch: true }))
      );
  }
  }

  /* community media (covers / voice / avatars): cache-first = offline listening */
  async function communityMedia(e) {
    const c = await caches.open(CACHE_VERSION + "-media");
    const hit = await c.match(e.request);
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok && res.status === 200) c.put(e.request, res.clone());
    return res;
  }
});