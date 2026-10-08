/* ============================================================
   THESMALLBOOK, 🎙️ SHOW DISCOVERY (show-discovery.js) · v316
   "Worth your ears" never runs dry. The hand-picked shows come
   first; when they run out, FIND 3 MORE SHOWS pulls three real
   podcasts from the iTunes podcast directory (JSONP, no keys,
   no proxy), keeps only shows that carry a real RSS feed, skips
   everything the shelf or you already have, and remembers them
   on this device - so every visit the shelf is exactly as you
   left it, and the button never runs out of shows to give.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_SHOWMORE) return;

  var GOTKEY = "tsb_show_got";   /* { key: show } - everything FIND pulled in */
  var SEENKEY = "tsb_show_seen"; /* { feedUrl: 1 } - offered and passed over */
  var GOT_CAP = 60;

  /* the lookup rotates day to day so the shelf keeps offering new neighbourhoods */
  var TERMS = ["startups", "money and investing", "history", "philosophy", "mind and psychology", "health and fitness", "science", "great interviews", "business stories", "books and reading", "sports", "films and storytelling", "technology", "crime stories", "space and nature"];

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function slug(name) {
    return "itn-" + String(name || "show").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  }

  /* everything already on the shelf, by feed and by name */
  function known() {
    var feeds = {}, names = {};
    var curated = (window.TSB_PODCASTS && window.TSB_PODCASTS.shows) || [];
    curated.forEach(function (s) { feeds[s.rss] = 1; names[s.name.toLowerCase()] = 1; });
    var got = jget(GOTKEY, {});
    Object.keys(got).forEach(function (k) { feeds[got[k].rss] = 1; names[got[k].name.toLowerCase()] = 1; });
    return { feeds: feeds, names: names };
  }

  /* pulled shows ride in localStorage, injected before any page paints */
  function boot() {
    var got = jget(GOTKEY, {});
    var out = [];
    Object.keys(got).forEach(function (k) { out.push(got[k]); });
    window.TSB_SHOWS_EXTRA = out;
  }

  /* iTunes Search over JSONP - the directory allows it, no CORS dance */
  function itunesSearch(term, cb) {
    var cbName = "tsbItn_" + Math.floor(Math.random() * 1e9).toString(36);
    var sc = document.createElement("script");
    var timer = setTimeout(function () { cleanup(); cb([]); }, 9000);
    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (sc.parentNode) sc.parentNode.removeChild(sc);
    }
    window[cbName] = function (data) {
      cleanup();
      cb((data && data.results) || []);
    };
    sc.src = "https://itunes.apple.com/search?media=podcast&entity=podcast&limit=40&term=" + encodeURIComponent(term) + "&callback=" + cbName;
    sc.onerror = function () { cleanup(); cb([]); };
    document.head.appendChild(sc);
  }

  /* a candidate only counts if it carries a real, https RSS feed */
  function shape(r) {
    if (!r || !r.feedUrl || !/^https:/.test(r.feedUrl)) return null;
    if (!r.collectionName) return null;
    var name = String(r.collectionName).replace(/\s+/g, " ").trim().slice(0, 48);
    return {
      id: slug(name),
      name: name,
      host: String(r.artistName || "its host").slice(0, 32),
      rss: r.feedUrl,
      art: (r.artworkUrl600 || r.artworkUrl100 || "").replace("http://", "https://"),
      tag: String(r.primaryGenreName || "PODCAST").toUpperCase() + " · FRESH FIND",
      cat: "all",
      why: "Pulled fresh from the podcast directory for this shelf. The latest episode plays right here; the show's own feed does the hosting.",
      start: "whatever episode sounds like you - the latest usually is",
      home: "https://podcasts.apple.com/search?term=" + encodeURIComponent(name),
      discovered: true
    };
  }

  /* pull the next n shows the shelf has never met */
  function serve(n, done) {
    boot();
    var day = Math.floor(Date.now() / 864e5);
    var t0 = day % TERMS.length;
    var seen = jget(SEENKEY, {});
    var tried = 0, out = [], qi = 0, queue = [];

    function nextTerm() {
      if (tried >= 4) { finish(); return; }
      var term = TERMS[(t0 + tried) % TERMS.length];
      tried++;
      itunesSearch(term, function (results) {
        var k = known();
        queue = results.map(shape).filter(function (s) {
          return s && !k.feeds[s.rss] && !k.names[s.name.toLowerCase()] && !seen[s.rss];
        }).concat(queue);
        nextOffer();
      });
    }
    function nextOffer() {
      if (out.length >= n) { finish(); return; }
      if (qi >= queue.length) { nextTerm(); return; }
      var s = queue[qi++];
      seen[s.rss] = 1;
      out.push(s);
      nextOffer();
    }
    function finish() {
      jset(SEENKEY, seen);
      if (out.length) {
        var got = jget(GOTKEY, {});
        out.forEach(function (s) { got[s.id] = s; });
        var ks = Object.keys(got);
        if (ks.length > GOT_CAP) ks.slice(0, ks.length - GOT_CAP).forEach(function (k) { delete got[k]; });
        jset(GOTKEY, got);
        boot();
      }
      done(out);
    }
    nextTerm();
  }

  function count() { return Object.keys(jget(GOTKEY, {})).length; }

  boot();
  window.TSB_SHOWMORE = { serve: serve, count: count, boot: boot };
})();
