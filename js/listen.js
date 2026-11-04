/* ============================================================
   TheSmallBook · LISTEN  (v2)
   Search three catalogues at once, play anything, and let the
   feed be built from what the reader actually does.
   Signed-out readers get the catalogue. Signed-in readers get
   a feed that keeps learning after onboarding.
   ============================================================ */
window.TSB_LISTEN = (function () {
  "use strict";

  var BK = "tsb_brain_v2", SK = "tsb_saved_v2", PK = "tsb_pos_v2";
  var STOP = ["the","a","an","of","and","or","to","in","on","for","with","how","why","what","your","you",
              "by","is","are","it","this","that","from","book","books","audiobook","audio"];

  function el(s) { return document.querySelector(s); }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function words(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && STOP.indexOf(w) < 0; }).slice(0, 10); }
  function first(v) { return (Array.isArray(v) ? v[0] : v) || ""; }
  function arr(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }
  function fmt(s) {
    s = Math.max(0, Math.round(s || 0));
    if (!s) return "";
    var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return h ? h + "h " + m + "m" : m + "m";
  }


  /* ---------------- drawn icons (no emoji anywhere) ---------------- */
  var SW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var IC = {
    play: SW + '<polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none"/></svg>',
    pause: SW + '<rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/></svg>',
    prev: SW + '<path d="M18.5 5.5v13L8.5 12z" fill="currentColor" stroke="none"/><rect x="4.5" y="5" width="2.4" height="14" rx="1.1" fill="currentColor" stroke="none"/></svg>',
    next: SW + '<path d="M5.5 5.5v13L15.5 12z" fill="currentColor" stroke="none"/><rect x="17.1" y="5" width="2.4" height="14" rx="1.1" fill="currentColor" stroke="none"/></svg>',
    moon: SW + '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/></svg>',
    head: SW + '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13.5" width="4" height="7" rx="1.6"/><rect x="17" y="13.5" width="4" height="7" rx="1.6"/></svg>',
    book: SW + '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg>',
    mic: SW + '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/></svg>',
    star: SW + '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z"/></svg>',
    starOn: SW + '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z" fill="currentColor"/></svg>',
    back: SW + '<path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
    none: ''
  };
  function kindIcon(k) { return k === "podcast" ? IC.mic : k === "book" ? IC.book : IC.head; }

  /* ---------------- signed in? ---------------- */
  function signedIn() {
    try {
      try {
        if (new URLSearchParams(location.search).get("demo") === "1") sessionStorage.setItem("tsb_demo", "1");
        if (sessionStorage.getItem("tsb_demo") === "1") return true;
      } catch (eD) {}
      if (window.TSB_AUTH && typeof window.TSB_AUTH.user === "function" && window.TSB_AUTH.user()) return true;
      var raw = localStorage.getItem("tsb_user") || localStorage.getItem("tsb_auth_user") || localStorage.getItem("sb-user");
      if (raw) { var u = JSON.parse(raw); if (u && (u.id || u.email)) return true; }
    } catch (e) {}
    return false;
  }

  /* ---------------- the brain ----------------
     Everything the room remembers belongs to the reader signed in on
     this device: the history, the saved shelf and the place in a book
     are stored under that account, not under the browser. */
  var UID = "anon";
  function uidNow() {
    try {
      if (window.TSB_AUTH && typeof window.TSB_AUTH.user === "function") {
        var u = window.TSB_AUTH.user();
        if (u && (u.id || u.email)) return "u" + String(u.id || u.email).slice(0, 40);
      }
    } catch (e) {}
    try {
      if (new URLSearchParams(location.search).get("demo") === "1") sessionStorage.setItem("tsb_demo", "1");
      if (sessionStorage.getItem("tsb_demo") === "1") return "demo";
    } catch (e) {}
    return "anon";
  }
  function K(k) { return UID === "anon" ? k : k + "::" + UID; }

  var brain = { terms: {}, subjects: {}, last: 0, n: 0 };
  function decay() {
    var d = (Date.now() - (brain.last || 0)) / 864e5;
    if (d < 1) return;
    var f = Math.pow(0.97, Math.min(d, 90));
    Object.keys(brain.terms).forEach(function (k) { brain.terms[k] *= f; if (brain.terms[k] < .02) delete brain.terms[k]; });
    Object.keys(brain.subjects).forEach(function (k) { brain.subjects[k] *= f; if (brain.subjects[k] < .02) delete brain.subjects[k]; });
    brain.last = Date.now();
  }
  function learn(kind, p) {
    if (UID === "anon") return;          /* nothing is remembered for a signed-out reader */
    p = p || {};
    var w = { search: 1, open: 1.5, play: 2.5, skip: -1, save: 3, finish: 4 }[kind] || 1;
    words([p.title, p.creator, (p.subjects || []).join(" ")].join(" ")).forEach(function (t) {
      brain.terms[t] = Math.max(0, (brain.terms[t] || 0) + w);
    });
    (p.subjects || []).slice(0, 3).forEach(function (s) {
      var k = String(s).toLowerCase().trim().slice(0, 28);
      if (k) brain.subjects[k] = Math.max(0, (brain.subjects[k] || 0) + w * .9);
    });
    brain.last = Date.now(); brain.n = (brain.n || 0) + 1;
    save(K(BK), brain);
  }
  function topTerms(n) { return Object.keys(brain.terms).sort(function (a, b) { return brain.terms[b] - brain.terms[a]; }).slice(0, n || 4); }
  function topSubjects(n) { return Object.keys(brain.subjects).sort(function (a, b) { return brain.subjects[b] - brain.subjects[a]; }).slice(0, n || 2); }
  function affinity(it) {
    var s = 0;
    words(it.title).forEach(function (w) { if (brain.terms[w]) s += brain.terms[w]; });
    words(it.creator).forEach(function (w) { if (brain.terms[w]) s += brain.terms[w] * .5; });
    (it.subjects || []).forEach(function (x) { var k = String(x).toLowerCase().trim().slice(0, 28); if (brain.subjects[k]) s += brain.subjects[k]; });
    return s;
  }

  /* ---------------- sources ---------------- */
  function jget(url, ms) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 7000);
    return fetch(url, ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (v) { clearTimeout(to); return v; }, function () { clearTimeout(to); return null; });
  }
  /* v376 · NOTHING ON THIS PAGE IS ALLOWED TO DEAD-END.
     Archive.org and iTunes are good neighbours but not perfect ones: a phone on
     a weak signal, a blocked request, a slow morning, and the shelf used to say
     "could not fetch, try again later" with nothing on it. Now every source
     retries once, and every answer is remembered, so a second visit paints the
     last good shelf instantly while the network catches up. */
  var MEM = {};
  function cacheKey(url) { return "tsb_listen_v1_" + url.length + "_" + url.slice(0, 120); }
  function cacheGet(url) {
    if (MEM[url]) return MEM[url];
    try {
      var raw = localStorage.getItem(cacheKey(url));
      if (!raw) return null;
      var box = JSON.parse(raw);
      if (!box || !box.v || (Date.now() - (box.t || 0)) > 14 * 864e5) return null;
      MEM[url] = box.v;
      return box.v;
    } catch (e) { return null; }
  }
  function cachePut(url, v) {
    if (!v || !v.length) return;
    MEM[url] = v;
    try { localStorage.setItem(cacheKey(url), JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
  }
  function jgetTwice(url, ms) {
    return jget(url, ms).then(function (v) {
      if (v) return v;
      return new Promise(function (res) { setTimeout(function () { res(jget(url, ms)); }, 700); });
    });
  }
  function withCache(url, parse) {
    return jgetTwice(url, 9000).then(function (j) {
      if (!j) { var c = cacheGet(url); return c || []; }
      var out = parse(j);
      if (out && out.length) cachePut(url, out);
      else { var c2 = cacheGet(url); if (c2) return c2; }
      return out;
    }).catch(function () { return cacheGet(url) || []; });
  }
  function fromArchive(d) {
    return { id: "ia:" + d.identifier, src: "archive", kind: /librivox/i.test(d.identifier) ? "audio" : "audio",
      title: first(d.title) || d.identifier, creator: first(d.creator) || "", year: d.year || "",
      subjects: arr(d.subject).slice(0, 5), cover: "https://archive.org/services/img/" + encodeURIComponent(d.identifier),
      plays: d.downloads || 0 };
  }
  function archive(q, rows) {
    var query = "(mediatype:(audio)) AND (" + q.split(/\s+/).filter(Boolean).map(function (w) {
      w = w.replace(/[^\w-]/g, ""); return "title:(" + w + ") OR subject:(" + w + ") OR creator:(" + w + ")";
    }).join(" OR ") + ")";
    var url = "https://archive.org/advancedsearch.php?q=" + encodeURIComponent(query) +
      "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&fl%5B%5D=subject&fl%5B%5D=downloads" +
      "&rows=" + (rows || 24) + "&page=1&output=json&sort%5B%5D=downloads+desc";
    return withCache(url, function (j) {
      var d = j && j.response && j.response.docs ? j.response.docs : [];
      return d.map(fromArchive).filter(function (x) { return x.title; });
    });
  }
  function books(q) {
    var url = "https://openlibrary.org/search.json?q=" + encodeURIComponent(q) + "&limit=6";
    return withCache(url, function (j) {
      return ((j && j.docs) || []).map(function (d) {
        return { id: "ol:" + (d.key || d.title), src: "openlibrary", kind: "book", title: d.title || "",
          creator: first(d.author_name) || "", year: d.first_publish_year || "", subjects: arr(d.subject).slice(0, 5),
          cover: d.cover_i ? "https://covers.openlibrary.org/b/id/" + d.cover_i + "-M.jpg" : "" };
      }).filter(function (x) { return x.title; });
    });
  }
  function podcasts(q) {
    var url = "https://itunes.apple.com/search?media=podcast&entity=podcast&limit=8&term=" + encodeURIComponent(q);
    return withCache(url, function (j) {
      return ((j && j.results) || []).map(function (r) {
        return { id: "pc:" + r.collectionId, src: "podcast", kind: "podcast", title: r.collectionName || "",
          creator: r.artistName || "", year: (r.releaseDate || "").slice(0, 4), subjects: arr(r.primaryGenreName),
          cover: (r.artworkUrl600 || r.artworkUrl100 || "").replace("100x100", "600x600"), count: r.trackCount || 0 };
      }).filter(function (x) { return x.title; });
    });
  }
  function episodes(cid) {
    return jget("https://itunes.apple.com/lookup?id=" + encodeURIComponent(cid) + "&entity=podcastEpisode&limit=60").then(function (j) {
      return ((j && j.results) || []).filter(function (r) { return r.kind === "podcast-episode" && (r.episodeUrl || r.previewUrl); })
        .map(function (r) {
          return { title: r.trackName || "Episode", url: r.episodeUrl || r.previewUrl,
            seconds: (r.trackTimeMillis || 0) / 1000, date: (r.releaseDate || "").slice(0, 10) };
        });
    });
  }
  function chapters(id) {
    var key = String(id).replace(/^ia:/, "");
    return jget("https://archive.org/metadata/" + encodeURIComponent(key)).then(function (m) {
      if (!m || !m.files) return [];
      var base = "https://archive.org/download/" + encodeURIComponent(key) + "/";
      var audio = m.files.filter(function (f) { return /\.(mp3|m4a|m4b|ogg|oga)$/i.test(String(f.name || "")); });
      var mp3 = audio.filter(function (f) { return /\.mp3$/i.test(f.name); });
      if (mp3.length) audio = mp3;                       // one format only
      var groups = {}, order = [];
      audio.forEach(function (f) {
        var name = String(f.name);
        var num = (name.match(/(\d{1,3})/) || [])[1] || "";
        var clean = String(f.title || name.replace(/\.[a-z0-9]+$/i, "").replace(/_(64kb|vbr|128kb)$/i, "").replace(/_/g, " "))
          .replace(/\s*\(\d+\s*kbps?\)\s*$/i, "").trim();
        var k = (num ? String(parseInt(num, 10)) + "|" : "") +
                clean.toLowerCase().replace(/\d+/g, "").replace(/[^a-z]/g, "").slice(0, 34);
        var score = (/64kbps/i.test(f.format || "") ? 3 : /vbr/i.test(f.format || "") ? 2 : 1);
        if (!groups[k]) { groups[k] = { title: clean, url: base + encodeURIComponent(name), seconds: +f.length || 0, num: num, score: score }; order.push(k); }
        else if (score > groups[k].score) { groups[k].url = base + encodeURIComponent(name); groups[k].seconds = +f.length || 0; groups[k].score = score; }
      });
      return order.map(function (k) { return groups[k]; })
        .sort(function (a, b) { return (parseInt(a.num, 10) || 999) - (parseInt(b.num, 10) || 999); })
        .map(function (t) { return { title: t.title, url: t.url, seconds: t.seconds }; });
    });
  }

  function footState() {
    var si2 = el("#rSignin"), fo = el("#rForget"), on = signedIn();
    if (si2) si2.style.display = on ? "none" : "";
    if (fo) fo.style.display = on ? "" : "none";
  }

  /* ---------------- playback ----------------
     The room does not own a player any more. Everything plays in the
     app's own broadcast player: the one that keeps going with the screen
     off, remembers the chapter, and carries the reader into any book.
     Audiobooks go through playAudiobook; podcasts through playFeed, with
     their episode list handed over in the player's own feed cache.
     --------------------------------------------------------------- */
  var saved = [], pos = {};

  function feedKey(url) {
    return String(url).split("").reduce(function (a, c) { return ((a << 5) - a + c.charCodeAt(0)) | 0; }, 0);
  }
  function seedFeed(show, list) {
    var url = "https://thesmallbook.in/listen/show/" + encodeURIComponent(show.id);
    try {
      localStorage.setItem("tsb_feed_" + feedKey(url), JSON.stringify({
        at: Date.now(),
        items: list.map(function (e) {
          return { label: e.title, sub: e.seconds ? fmt(e.seconds) : "", src: e.url, art: show.art || "" };
        }),
        showTitle: show.title,
        art: show.art || ""
      }));
    } catch (e) {}
    return url;
  }
  function playItem(item, index) {
    var A = window.TSB_AUDIO;
    if (!A) { note("The player is warming up. Tap again."); return; }
    if (item.kind === "book") { location.href = "book.html?id=" + encodeURIComponent(String(item.id).replace(/^ol:/, "")); return; }
    learn("play", item);
    if (item.kind === "podcast") {
      if (item._list) { goFeed(item, item._list, index || 0); return; }
      note("Opening the show…");
      episodes(String(item.id).replace(/^pc:/, "")).then(function (list) {
        if (!list || !list.length) { note("Nothing playable in this one."); return; }
        item._list = list;
        goFeed(item, list, index || 0);
      });
      return;
    }
    /* an audiobook: the app player fetches the chapters and resumes the place */
    var id = String(item.id).replace(/^ia:/, "");
    try {
      window.TSB_AUDIOBOOKS = window.TSB_AUDIOBOOKS || {};
      window.TSB_AUDIOBOOKS[id] = { id: id, title: item.title, author: item.creator || "" };
      var prevArt = window.TSB_ABART;
      window.TSB_ABART = function (bid, rec) {
        return item.cover || (prevArt ? prevArt(bid, rec, null) : "") || "";
      };
    } catch (e) {}
    A.playAudiobook(id);
  }
  function goFeed(item, list, startAt) {
    var A = window.TSB_AUDIO;
    var show = { id: item.id, name: item.title, art: item.cover || "", home: "",
                 rss: seedFeed(item, list) };
    A.playFeed(show, Math.max(0, startAt || 0));
  }
  function isSaved(id) { return saved.some(function (s) { return s.id === id; }); }
  function toggleSave(item) {
    var at = -1;
    saved.forEach(function (s, n) { if (s.id === item.id) at = n; });
    if (at >= 0) saved.splice(at, 1);
    else { saved.unshift({ id: item.id, title: item.title, creator: item.creator, cover: item.cover, kind: item.kind, src: item.src }); learn("save", item); }
    save(K(SK), saved);
  }

  /* ---------------- open ---------------- */
  var ITEMS = {};
  /* v381 · the shared memory of the app. Listen writes what was actually
     played into the same log the rest of the app reads, so the shelf, the feed
     and Pip are looking at one truth instead of three separate guesses. */
  function remember(item) {
    try {
      if (!window.TSB_PIP_MIND || !item) return;
      window.TSB_PIP_MIND.log({ k: "listen", id: item.id, title: item.title, kind: item.kind, creator: item.creator, cover: item.cover });
    } catch (e) {}
  }
  /* what this reader was playing, newest first, rebuilt as playable cards */
  function fromMemory(n) {
    try {
      if (!window.TSB_PIP_MIND) return [];
      var ev = window.TSB_PIP_MIND.events("listen").slice(-(n || 8)).reverse();
      var seen = {}, out = [];
      ev.forEach(function (e) {
        if (!e || !e.title || seen[e.id]) return;
        seen[e.id] = 1;
        out.push({ id: e.id || ("mem:" + e.title), src: "memory", kind: e.kind || "audio",
                   title: e.title, creator: e.creator || "", cover: e.cover || "", subjects: [] });
      });
      return out;
    } catch (e) { return []; }
  }
  function open(item) {
    if (item && item._resume) { if (resumeLast()) return; }
    learn("open", item);
    if (item.kind === "book") { location.href = "book.html?id=" + encodeURIComponent(String(item.id).replace(/^ol:/, "")); return; }
    if (item.kind === "podcast") {
      note("Loading…");
      episodes(String(item.id).replace(/^pc:/, "")).then(function (list) {
        if (!list || !list.length) { note("Nothing playable in this one."); return; }
        item._list = list;
        showTracks(item, list);
      });
      return;
    }
    playItem(item, 0);
  }
  function showTracks(item, list) {
    var el2 = el("#rResults"); if (!el2) return;
    el2.innerHTML = '<div class="r-sechead"><div class="lead"><button class="r-back" id="rBack" aria-label="Back">' + IC.back + '</button>' +
      "<h3>" + esc(item.title) + "</h3></div><span>" + list.length + " parts</span>" +
      '<button class="r-star' + (isSaved(item.id) ? " on" : "") + '" data-star="' + esc(item.id) + '" aria-label="Save">' + (isSaved(item.id) ? IC.starOn : IC.star) + "</button></div>" +
      '<ul class="r-list">' + list.slice(0, 60).map(function (t, i) {
        return '<li class="r-row" data-tr="' + i + '">' +
          '<div class="art">' + (item.cover ? '<img src="' + esc(item.cover) + '" alt="">' : '<span class="fb">' + kindIcon(item.kind) + "</span>") + "</div>" +
          "<div><h4>" + esc(t.title) + "</h4><p>" + (t.seconds ? fmt(t.seconds) : "") + "</p></div>" +
          '<span class="go">' + IC.play + "</span></li>";
      }).join("") + "</ul>";
    el2.onclick = function (e) {
      if (e.target.closest("#rBack")) { var si = el("#rSearch"); if (si && si.value.trim()) search(si.value.trim()); else { el2.innerHTML = ""; el("#rFeed").style.display = ""; var f3 = el(".r-foot"); if (f3) f3.classList.toggle("on", signedIn()); } return; }
      var star = e.target.closest("[data-star]");
      if (star) { toggleSave(item); showTracks(item, list); return; }
      var row = e.target.closest("[data-tr]"); if (!row) return;
      playItem(item, +row.getAttribute("data-tr"));
    };
  }
  function note(t) { var el2 = el("#rResults"); if (el2) el2.innerHTML = '<div class="r-note">' + esc(t) + "</div>"; }

  /* ---------------- search ---------------- */
  function relevance(it, q) {
    var t = words(q); if (!t.length) return 0;
    var ti = String(it.title || "").toLowerCase(), cr = String(it.creator || "").toLowerCase(),
        sb = (it.subjects || []).join(" ").toLowerCase(), sc = 0, hits = 0;
    t.forEach(function (w) {
      if (ti.indexOf(w) >= 0) { sc += 5; hits++; } else if (sb.indexOf(w) >= 0) sc += 1.2;
      if (cr.indexOf(w) >= 0) sc += 2;
    });
    if (ti.indexOf(t.join(" ")) >= 0) sc += 6;
    if (ti.indexOf(t.join(" ")) === 0) sc += 4;
    if (ti.length > 72) sc -= 1.5;
    if (t.length > 1 && hits === t.length) sc += 5;
    return sc + (it.kind === "book" ? 0 : it.kind === "podcast" ? 1.5 : 2);
  }
  function interleave(lists) {
    var out = [], i = 0, more = true;
    while (more && out.length < 40) {
      more = false;
      lists.forEach(function (l) { if (i < l.length) { out.push(l[i]); more = true; } });
      i++;
    }
    return out;
  }
  function search(q) {
    q = String(q || "").trim();
    var box = el("#rResults");
    if (!q) {
      box.innerHTML = ""; el("#rFeed").style.display = "";
      var f1 = el(".r-foot"); if (f1) f1.classList.toggle("on", signedIn());
      return;
    }
    var f2 = el(".r-foot"); if (f2) f2.classList.remove("on");
    el("#rFeed").style.display = "none";
    box.innerHTML = '<div class="r-note">Searching…</div>';
    learn("search", { title: q });
    var all = [], LIST = [];
    function paint() {
      var seen = {};
      var scored = all.map(function (x) { x._r = relevance(x, q); x._a = affinity(x); return x; });
      var best = 0; scored.forEach(function (x) { if (x._r > best) best = x._r; });
      var floor = best >= 6 ? 3 : best > 0 ? 1.5 : 0;
      LIST = scored.filter(function (x) { return x._r >= floor; })
        .sort(function (a, b) {
          if (b._r !== a._r) return b._r - a._r;
          var pa = Math.log(1 + (a.plays || 0)), pb = Math.log(1 + (b.plays || 0));
          if (pb !== pa) return pb - pa;
          return b._a - a._a;
        });
      if (LIST.length < 8) {
        scored.filter(function (x) { return x._r < floor; })
          .sort(function (a, b) { return (b._a + Math.log(1 + (b.plays || 0))) - (a._a + Math.log(1 + (a.plays || 0))); })
          .slice(0, 8 - LIST.length).forEach(function (x) { LIST.push(x); });
      }
      var nb = 0, np = 0;
      var list = LIST.filter(function (x) {
        var k = (x.title || "").toLowerCase().slice(0, 42); if (seen[k]) return false; seen[k] = 1; return true;
      }).filter(function (x) {
        if (x.kind === "book") { if (nb >= 4) return false; nb++; }
        else if (x.kind === "podcast") { if (np >= 5) return false; np++; }
        return true;
      }).slice(0, 30);
      if (!list.length) { box.innerHTML = '<div class="r-note">Nothing found.</div>'; return; }
      all.forEach(function (i) { ITEMS[i.id] = i; });
      box.innerHTML = '<ul class="r-list">' + list.map(function (i) {
        return '<li class="r-row" data-id="' + esc(i.id) + '">' +
          '<div class="art">' + (i.cover ? '<img loading="lazy" src="' + esc(i.cover) + '" alt="" onerror="this.style.display=\'none\'">' : '<span class="fb">' + kindIcon(i.kind) + "</span>") + "</div>" +
          "<div><h4>" + esc(i.title) + "</h4><p>" + esc([i.creator, i.year].filter(Boolean).join(" · ")) + "</p></div>" +
          '<span class="go">' + (i.kind === "book" ? IC.book : IC.play) + "</span></li>";
      }).join("") + "</ul>";
    }
    var got = {};
    function merge(k, l) { got[k] = l || []; all = interleave([got.archive || [], got.podcast || [], got.book || []]); paint(); }
    archive(q, 40).then(function (l) { merge("archive", l); });
    podcasts(q, 8).then(function (l) { merge("podcast", l); });
    books(q, 6).then(function (l) { merge("book", l); });
    setTimeout(function () { if (!all.length) box.innerHTML = '<div class="r-note">Nothing found.</div>'; }, 9000);
  }

  /* ---------------- feed ---------------- */
  function shortName(t) {
    var x = String(t || "").replace(/\s*\(.*?\)\s*/g, "").split(/[:\u2014|]/)[0].trim();
    if (x.length > 24) x = x.slice(0, 24).replace(/\s+\S*$/, "");
    return x;
  }
  function rail(title, items, sub) {
    if (!items || !items.length) return "";
    var seenR = {};
    items = items.filter(function (i) {
      var k = String(i.title || "").toLowerCase().replace(/\s*\(.*?\)\s*/g, "").replace(/[^a-z0-9]/g, "").slice(0, 34);
      if (!k || seenR[k]) return false; seenR[k] = 1; return true;
    });
    if (!items.length) return "";
    items.forEach(function (i) { ITEMS[i.id] = i; });   /* every card is playable */
    return '<section class="r-sec"><div class="r-sechead"><h3>' + esc(title) + "</h3>" + (sub ? "<span>" + esc(sub) + "</span>" : "") + "</div>" +
      '<div class="r-rail">' + items.map(function (i) {
        return '<button class="r-c" data-id="' + esc(i.id) + '"><div class="art">' +
          (i.cover ? '<img loading="lazy" src="' + esc(i.cover) + '" alt="" onerror="this.style.display=\'none\'">' : '<span class="fb">' + kindIcon(i.kind) + '</span>') +
          "</div><h4>" + esc(i.title) + "</h4><p>" + esc(i.creator) + "</p></button>";
      }).join("") + "</div></section>";
  }
  /* v349 · THE THING YOU WERE LISTENING TO.
     The player remembers the last item and the exact second; nothing in the
     product ever showed it again, so closing the tab meant hunting for it.
     This is that item, one tap, at the second it stopped. */
  function lastPlayed() {
    try {
      var A = window.TSB_AUDIO;
      if (!A || !A.last) return null;
      var l = A.last();
      if (!l || !l.title) return null;
      if (Date.now() - (l.at || 0) > 30 * 864e5) return null;
      var kind = l.type === "book" ? "book" : l.type === "podcast" ? "podcast" : "audio";
      return {
        id: l.key, src: kind === "audio" ? "archive" : kind, kind: kind,
        title: l.title, creator: l.itemLabel || (kind === "book" ? "Book voice" : ""),
        cover: l.cover || (l.bookId && window.BOOKS ? ((window.BOOKS.filter(function (b) { return b.id === l.bookId; })[0] || {}).cover || "") : ""),
        _resume: 1
      };
    } catch (e) { return null; }
  }
  function resumeLast() {
    try {
      var A = window.TSB_AUDIO;
      if (A && A.resume) { A.resume(); return true; }
    } catch (e) {}
    return false;
  }

  function continueItems() {
    return Object.keys(pos).map(function (k) { return pos[k]; })
      .sort(function (a, b) { return b.at - a.at; }).slice(0, 10)
      .map(function (p) { return p.item; });
  }
  /* v369: a swipe is a decision, and Listen has to honour it too. Positions
     are stored separately from the last-played record, so a cancelled podcast
     could still come back here in "Pick up where you left off". Anything that
     started before the last swipe is filtered out of both rails. */
  function audioCancelledAt() { try { return +(localStorage.getItem("tsb_audio_cancelled") || 0); } catch (e) { return 0; } }
  function startedMs(it) {
    if (!it) return 0;
    var t = it.at || it.addedAt || it.startedAt || it.ts || 0;
    if (!t) return 0;
    if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
    var ms = Date.parse(t); return isNaN(ms) ? 0 : ms;
  }
  function liveLast() {
    try {
      var r = lastPlayed(), c = audioCancelledAt();
      if (c && r && startedMs(r) && startedMs(r) < c) return null;
      return r;
    } catch (e) { return lastPlayed(); }
  }
  function liveContinue() {
    try {
      var c = audioCancelledAt();
      var list = continueItems();
      if (!c) return list;
      return list.filter(function (it) { return !(startedMs(it) && startedMs(it) < c); });
    } catch (e) { return continueItems(); }
  }
  function buildFeed() {
    var feed = el("#rFeed"); if (!feed) return;
    /* v347: anyone can see what Listen holds, and play it. Signing in is
       what starts the feed: until then these are the room's own shelves,
       not a brain that follows you. */
    if (!signedIn()) {
      archive("best audiobooks", 14).then(function (pop) {
        if (el("#rSearch") && el("#rSearch").value.trim()) return;
        var lp = liveLast();
        var mem = fromMemory(6);
        feed.innerHTML = (mem.length ? rail("You were listening to", mem) : "") +
          (lp ? rail("Pick up where you left off", [lp]) : "") + rail("Popular now", pop || []);
        podcasts("storytelling", 8).then(function (p) {
          if (p && p.length) feed.insertAdjacentHTML("beforeend", rail("Podcasts", p));
        });
        archive("short stories", 10).then(function (s2) {
          if (s2 && s2.length) feed.insertAdjacentHTML("beforeend", rail("Finish in a walk", s2));
          var f0 = el(".r-foot"); if (f0) f0.classList.add("on"); footState();
        });
      });
      return;
    }
    var cont = liveContinue(), ts = topTerms(3), sj = topSubjects(2);
    var lp2 = liveLast();
    var steps = ["Reading your history", "Finding more like it", "Filling the shelf"];
    function skel() {
      var card = '<div class="c"><div class="b"></div><div class="t"></div><div class="t t2"></div></div>';
      return '<div class="r-sk"><div class="h"></div><div class="rail">' + card + card + card + card + "</div></div>" +
             '<div class="r-sk"><div class="h"></div><div class="rail">' + card + card + card + card + "</div></div>";
    }
    feed.innerHTML = '<div class="r-build"><h3>Building your feed</h3><ol>' +
      steps.map(function (t, i) { return '<li id="rb' + i + '"><i>✓</i>' + esc(t) + "</li>"; }).join("") +
      '</ol><div class="prog"><i id="rBp"></i></div></div>' + skel();
    function tick(i) {
      var li = el("#rb" + i); if (li) li.className = "on";
      var bp = el("#rBp"); if (bp) bp.style.width = Math.round((i + 1) / 3 * 100) + "%";
    }
    var popular = [], related = [], pods = [];
    setTimeout(function () {
      tick(0);
      archive("best audiobooks", 14).then(function (l) {
        popular = l || []; tick(1);
        var terms = ts.length ? ts.join(" ") : "classic novels";
        return archive(terms, 12);
      }).then(function (l) {
        related = l || []; tick(2);
        var subj = sj.length ? sj[0] : "storytelling";
        return podcasts(subj, 8);
      }).then(function (l) {
        pods = l || [];
        setTimeout(function () {
          if (el("#rSearch") && el("#rSearch").value.trim()) return;
          /* v375: a signed-in reader opens Listen to find the next thing, not to
             stare at a player card. Books and podcasts from their own history
             now lead; the "continue" rails sit underneath, where picking up
             again belongs. */
          var memS = fromMemory(8);
          feed.innerHTML =
            (memS.length ? rail("You were listening to", memS) : "") +
            (related.length ? rail(cont.length ? "Because you listened to " + shortName(cont[0].title) : "Start here", related) : "") +
            (pods.length ? rail("Podcasts", pods) : "") +
            rail("Popular now", popular) +
            (saved.length ? rail("Saved", saved) : "") +
            (cont.length ? rail("Continue", cont) : "") +
            (lp2 ? rail("Pick up where you left off", [lp2]) : "");
          var ft = el(".r-foot"); if (ft) ft.classList.add("on"); footState();
          var mk = el("#rForget"); if (mk) mk.style.display = "";
        }, 280);
      });
    }, 420);
  }

  /* ---------------- events ---------------- */
  function bind() {
    document.addEventListener("click", function (e) {
      var row = e.target.closest("[data-id]");
      if (row) { var it = ITEMS[row.getAttribute("data-id")]; if (it) { remember(it); open(it); return; } }
      var forget = e.target.closest("#rForget");
      if (forget) { brain = { terms: {}, subjects: {}, last: Date.now(), n: 0 }; save(K(BK), brain); buildFeed(); }
    });
    var si = el("#rSearch");
    if (si) {
      var t = null;
      si.addEventListener("input", function () { clearTimeout(t); var v = si.value.trim(); t = setTimeout(function () { search(v); }, 380); });
      si.addEventListener("keydown", function (e) { if (e.key === "Enter") { clearTimeout(t); search(si.value.trim()); } });
    }
    window.addEventListener("scroll", function () { var t2 = el(".r-top"); if (t2) t2.classList.toggle("stuck", scrollY > 4); }, { passive: true });
    /* the app's player bar floats above the tab bar: give the page room for it */
    function watchPlayer() {
      var on = !!document.querySelector(".ap-on, .tsb-player");
      document.body.classList.toggle("has-player", on);
    }
    try {
      new MutationObserver(watchPlayer).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    } catch (e) {}
    watchPlayer();
  }

  function boot() {
    if (!document.querySelector(".r")) return;
    UID = uidNow();
    brain = load(K(BK), { terms: {}, subjects: {}, last: 0, n: 0 });
    saved = load(K(SK), []);
    pos = load(K(PK), {});
    if (UID === "anon") {
      try { localStorage.removeItem(BK); localStorage.removeItem(SK); localStorage.removeItem(PK); } catch (e) {}
    } else { decay(); save(K(BK), brain); }
    bind(); buildFeed();
    var q = new URLSearchParams(location.search).get("q");
    if (q) { var si = el("#rSearch"); if (si) { si.value = q; search(q); } }
  }
  return { boot: boot, search: search, signedIn: signedIn };
})();
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { window.TSB_LISTEN.boot(); });
  else window.TSB_LISTEN.boot();
}
