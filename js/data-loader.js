/* ============================================================
   THESMALLBOOK — 📦 DATA LOADER (data-loader.js)
   Replaces the 3.4 MB js/data.js blocking script.

   Loads data/books-index.json (89 KB gzipped) up front and lazily
   fetches the heavy parts only when something actually needs them:

     TSB_DATA.ready()          → Promise<index[]>  (shelf/search/feed)
     TSB_DATA.book(id)         → Promise<fullBook> (one shard, cached)
     TSB_DATA.lessons()        → Promise<lessonPool>  (Lesson of the Day)
     TSB_DATA.corpus()         → Promise<{id: [text]}> (deep search)

   Back-compat: window.BOOKS is populated with the index as soon as it
   resolves, and `tsb:data-ready` fires on document. Legacy code that
   reads b.title / b.cover / b.lessons.length keeps working untouched.
   Legacy code needing lesson BODIES must await TSB_DATA.lessons().
   ============================================================ */
(function () {
  "use strict";

  /* resolve data/ relative to site root, so books/*.html (one level deep)
     and root pages both work without hardcoding absolute URLs */
  var BASE = (function () {
    var p = location.pathname;
    var depth = (p.replace(/\/[^\/]*$/, "/").match(/\//g) || []).length - 1;
    return depth > 0 ? new Array(depth + 1).join("../") : "./";
  })();

  var cache = Object.create(null);
  var inflight = Object.create(null);

  function get(url, key) {
    if (cache[key]) return Promise.resolve(cache[key]);
    if (inflight[key]) return inflight[key];
    inflight[key] = fetch(BASE + url, { cache: "force-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error(url + " → HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        cache[key] = json;
        delete inflight[key];
        return json;
      })
      .catch(function (err) {
        delete inflight[key];
        throw err;
      });
    return inflight[key];
  }

  var readyPromise = null;

  var API = {
    /* light index — everything the shelf, search and feed render */
    ready: function () {
      if (readyPromise) return readyPromise;
      readyPromise = get("data/books-index.json", "index").then(function (list) {
        try {
          window.BOOKS = list;
          document.dispatchEvent(new CustomEvent("tsb:data-ready", { detail: list }));
        } catch (e) {}
        return list;
      });
      return readyPromise;
    },

    /* one full book (bigIdea, quotes, lesson bodies, actionPlan) */
    book: function (id) {
      if (!id) return Promise.reject(new Error("book(id): id required"));
      return get("data/books/" + id + ".json", "book:" + id);
    },

    /* lesson pool for Lesson of the Day / feed quote cards */
    lessons: function () { return get("data/lessons.json", "lessons"); },

    /* full-text bodies for deep search (only on queries >= 4 chars) */
    corpus: function () { return get("data/search-corpus.json", "corpus"); },

    /* sync accessor for code already past ready() */
    index: function () { return cache.index || null; },

    /* warm a shard in the background (hover/intersection prefetch) */
    prefetch: function (id) { this.book(id).catch(function () {}); }
  };

  window.TSB_DATA = API;
  API.ready().catch(function (err) {
    console.error("[TSB] book index failed to load:", err);
    try {
      document.dispatchEvent(new CustomEvent("tsb:data-error", { detail: err }));
    } catch (e) {}
  });
})();
