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
  var DSCKEY = "tsb_show_desc";  /* { cid: real description from the directory } */

  function shape(r) {
    if (!r || !r.feedUrl || !/^https:/.test(r.feedUrl)) return null;
    if (!r.collectionName) return null;
    var name = String(r.collectionName).replace(/\s+/g, " ").trim().slice(0, 48);
    var dsc = jget(DSCKEY, {});
    var cid = String(r.collectionId || "");
    /* v321: the why-line is the show's own - real directory description when
       we have it, otherwise a line built from ITS genre, size and the shelf
       that pulled it. No two cards need read the same. */
    var genre = String(r.primaryGenreName || "Podcast");
    var eps = r.trackCount > 0 ? r.trackCount : 0;
    var why = (dsc[cid] || dsc[String(r.feedUrl || "")])
      ? String(dsc[cid] || dsc[String(r.feedUrl || "")]).replace(/\s+/g, " ").trim().slice(0, 175) + " - the latest plays right here."
      : genre + (eps ? " · " + eps + " episodes in the can" : "") + ". Pulled fresh for this shelf - the latest episode plays right here, straight from the show's own feed.";
    return {
      id: slug(name),
      name: name,
      host: String(r.artistName || "its host").slice(0, 32),
      rss: r.feedUrl,
      art: (r.artworkUrl600 || r.artworkUrl100 || "").replace("http://", "https://"),
      tag: genre.toUpperCase() + " · FRESH FIND",
      cat: "all",
      why: why,
      start: "whatever episode sounds like you - the latest usually is",
      home: "https://podcasts.apple.com/search?term=" + encodeURIComponent(name),
      cid: cid,
      discovered: true
    };
  }

  /* the show's OWN words: the channel description from its RSS feed - that
     is the honest "what this show is" text, straight from the maker. Cached
     by feed url forever, so a show is only fetched for words once. */
  function fetchDesc(rss, cb) {
    var dsc = jget(DSCKEY, {});
    if (dsc[rss]) { cb(dsc[rss]); return; }
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(""); } }, 4500);
    fetch(rss).then(function (r) { return r.ok ? r.text() : ""; }).then(function (xml) {
      if (done) return;
      done = true; clearTimeout(timer);
      if (!xml) { cb(""); return; }
      var doc = new DOMParser().parseFromString(xml, "text/xml");
      var ch = doc.querySelector("channel") || doc.documentElement;
      var el = ch.querySelector(":scope > description");
      if ((!el || !el.textContent) && ch.querySelector("subtitle")) el = ch.querySelector("subtitle");
      var txt = el ? String(el.textContent).replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim() : "";
      if (txt.length > 24) { dsc[rss] = txt; jset(DSCKEY, dsc); }
      cb(txt);
    }).catch(function () { if (!done) { done = true; clearTimeout(timer); cb(""); } });
  }

  function fetchDescs(list, cb) {
    var left = list.length;
    if (!left) { cb(); return; }
    list.forEach(function (s) {
      fetchDesc(s.rss, function (txt) {
        if (txt) s.why = txt.slice(0, 175) + (txt.length > 175 ? "…" : "") + " - the latest plays right here.";
        left--; if (!left) cb();
      });
    });
  }

  /* wash a batch of shows in their own descriptions (their feeds tell them) */
  function enrich(shows, done) {
    fetchDescs(shows, function () { done(shows); });
  }

  /* pull the next n shows the shelf has never met */
  function serve(n, done) {
    boot();
    var day = Math.floor(Date.now() / 864e5);
    var t0 = day % TERMS.length;
    var seen = jget(SEENKEY, {});
    var tried = 0, out = [], qi = 0, queue = [];
    /* v322: your top two neighbourhoods lead the hunt; the rest still roam */
    var mine = topTaste(2);

    function nextTerm() {
      if (tried >= 4) { finish(); return; }
      var term = tried < mine.length ? mine[tried] : TERMS[(t0 + tried) % TERMS.length];
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
        if (mine.length) out.forEach(function (s2) { s2.whyFor = "because you listen to " + mine[0]; });
        enrich(out, function (withDesc) {
          var got = jget(GOTKEY, {});
          withDesc.forEach(function (s) { got[s.id] = s; });
          var ks = Object.keys(got);
          if (ks.length > GOT_CAP) ks.slice(0, ks.length - GOT_CAP).forEach(function (k) { delete got[k]; });
          jset(GOTKEY, got);
          boot();
          done(withDesc);
        });
      } else done(out);
    }
    nextTerm();
  }

  function count() { return Object.keys(jget(GOTKEY, {})).length; }

  /* v322: TASTE. Every show you play or heart teaches the shelf what you
     love - its genre and its words. FIND 3 MORE then hunts in your
     neighbourhood first, so the shelf keeps becoming yours. */
  var TASTEKEY = "tsb_show_taste";   /* { genres: {}, words: {}, at } */
  function taste() { return jget(TASTEKEY, { genres: {}, words: {} }); }
  var STOP = ["the","and","with","podcast","show","your","for","from","that","this","about","into","what","when","how","why","episode","episodes","audio","talk","talks","life","part","series","real","new","one","two"];
  function learn(show, weight) {
    try {
      var t = taste(), w = weight || 1, k;
      var g = String(show.tag || "").split("·")[0].trim().toLowerCase();
      if (g) t.genres[g] = (t.genres[g] || 0) + w;
      String(show.name + " " + (show.why || "")).toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).forEach(function (word) {
        if (word.length < 4 || STOP.indexOf(word) >= 0) return;
        t.words[word] = (t.words[word] || 0) + w * 0.5;
      });
      jset(TASTEKEY, t);
    } catch (e) {}
  }
  function topTaste(n) {
    var t = taste(), out = [];
    Object.keys(t.genres).sort(function (a, b) { return t.genres[b] - t.genres[a]; }).slice(0, n).forEach(function (g) { out.push(g); });
    return out;
  }

  /* v321: THE SEARCH BAR. Type any topic or host - money, fitness, history,
     interviews - and the directory answers with five real shows that carry
     their own feed. MORE ON THIS serves the next five from the same answer,
     and every result can join the shelf with its heart. */
  var lastResults = [], lastCursor = 0, lastTerm = "";

  function search(term, cb) {
    lastTerm = String(term || "").trim();
    lastResults = []; lastCursor = 0;
    if (!lastTerm) { cb([], ""); return; }
    itunesSearch(lastTerm, function (results) {
      lastResults = results.map(shape).filter(Boolean);
      serveSlice(cb);
    });
  }

  function serveSlice(cb) {
    var out = lastResults.slice(lastCursor, lastCursor + 5);
    lastCursor += out.length;
    enrich(out, function (withDesc) {
      /* a searched show you keep joins the shelf for good */
      if (withDesc.length) {
        var got = jget(GOTKEY, {});
        withDesc.forEach(function (s) { got[s.id] = s; });
        jset(GOTKEY, got);
        boot();
      }
      cb(withDesc, lastCursor < lastResults.length ? lastResults.length - lastCursor : 0, lastTerm);
    });
  }

  function searchMore(cb) {
    if (!lastResults.length) { cb([], 0, ""); return; }
    serveSlice(cb);
  }

  /* adopt: a heart on a search result puts the show on the shelf too */
  function adopt(show) {
    if (!show || !show.id) return;
    var got = jget(GOTKEY, {});
    got[show.id] = show;
    jset(GOTKEY, got);
    boot();
  }

  boot();
  window.TSB_SHOWMORE = { serve: serve, count: count, boot: boot, search: search, searchMore: searchMore, adopt: adopt, learn: learn };
})();
