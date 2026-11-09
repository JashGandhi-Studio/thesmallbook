/* ============================================================
   TheSmallBook · THE ROOM BUILDS ITSELF (listen-feed.js) · v409
   Listen used to stop at the starter shelf: a handful of curated
   audiobooks and shows, then buttons asking you to go and fetch
   more. This module turns the room into a feed that grows:

     1. TASTE (tsb_listen_taste) - every play, search and save
        teaches the room words, hosts and shelves. It lives with
        the account (see auth.js), so the ear you train on your
        phone is the ear that greets you on a tablet.
     2. FRESH TODAY (tsb_listen_daily) - the first open of a new
        day fetches a small shelf of audiobooks from LibriVox and
        shows from the podcast directory, chosen from your taste.
        Focus in your setup means meditation in your morning.
     3. MORE LIKE THIS - the last show you played grows a rail of
        its neighbours: play Raj Shamani, get his neighbourhood.
     4. THE SHELF - the heart on any card, old or fresh, saves
        through the one bookmark store, so anything here is one
        tap from playing on the shelf below.

   Nothing blocks the first paint: what is already known paints
   instantly, and the morning fetch lands when it lands.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_LISTEN_FEED) return;

  var TASTEKEY = "tsb_listen_taste";
  var DAILYKEY = "tsb_listen_daily";
  var STOP = ["the", "and", "with", "podcast", "show", "your", "for", "from", "that", "this", "about", "into", "what", "when", "episode", "episodes", "audio", "talk", "talks", "life", "part", "series", "real", "audiobook", "book", "books", "chapter", "chapters", "full", "free"];
  var MIND_TERMS = {
    "focus": ["meditation", "focus and concentration"],
    "money": ["money and investing", "personal finance"],
    "habits": ["habits", "building good habits"],
    "people": ["psychology", "relationships"],
    "career": ["leadership", "careers and work"],
    "strategy": ["strategy", "decision making"],
    "ideas": ["creativity", "ideas and invention"],
    "history": ["history", "world history"]
  };
  var DAY_DEFAULTS = [
    ["meditation", "great interviews"],
    ["history", "classic stories"],
    ["money and investing", "science"],
    ["focus and concentration", "books and reading"]
  ];

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function words(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && STOP.indexOf(w) < 0; });
  }
  function dayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function syncSoon() { try { if (window.TSB_AUTH && TSB_AUTH.queueStateSync) TSB_AUTH.queueStateSync(); } catch (e) {} }

  /* ---------------- taste ---------------- */
  function taste() {
    var t = jget(TASTEKEY, null);
    if (!t || typeof t !== "object") t = { terms: {}, hosts: {}, cats: {}, plays: 0, at: 0 };
    t.terms = t.terms || {}; t.hosts = t.hosts || {}; t.cats = t.cats || {};
    return t;
  }
  function learn(sig, weight) {
    try {
      var t = taste(), w = weight || 1;
      words((sig.title || "") + " " + (sig.by || "")).forEach(function (word) { t.terms[word] = (t.terms[word] || 0) + w; });
      if (sig.by) t.hosts[String(sig.by).slice(0, 40)] = (t.hosts[String(sig.by).slice(0, 40)] || 0) + w * 2;
      if (sig.cat) t.cats[String(sig.cat).slice(0, 30)] = (t.cats[String(sig.cat).slice(0, 30)] || 0) + w;
      t.plays = (t.plays || 0) + (weight >= 1 ? 1 : 0);
      t.at = Date.now();
      /* keep the profile small enough to travel with the account */
      ["terms", "hosts", "cats"].forEach(function (bag) {
        var ks = Object.keys(t[bag]).sort(function (a, b) { return t[bag][b] - t[bag][a]; });
        ks.slice(40).forEach(function (k) { delete t[bag][k]; });
      });
      jset(TASTEKEY, t);
      /* v410: the Listen notebook mirrors into the one ecosystem
         ledger, so a show played here can steer book picks at home */
      try {
        if (window.TSB_TASTE && TSB_TASTE.signal) TSB_TASTE.signal({ title: sig.title || "", by: sig.by || "", cat: sig.cat || "", kind: weight >= 2 ? "save" : "listen", mult: Math.max(0.4, Math.min(2, w)) });
      } catch (e2) {}
    } catch (e) {}
  }
  var searchedOnce = {};
  function noteSearch(q) {
    var term = String(q || "").trim();
    if (term.length < 3 || searchedOnce[term.toLowerCase()]) return;
    searchedOnce[term.toLowerCase()] = 1;
    learn({ title: term }, 0.7);
  }
  function noteSave(title, by, cat) { learn({ title: title || "", by: by || "", cat: cat || "" }, 2); }
  /* the player calls this for every queue it starts: books, shows,
     originals and spoken books all teach the same ear */
  function learnPlay(queue) {
    try {
      if (!queue) return;
      var by = "";
      var cat = "";
      if (queue.bookId) {
        var books = window.BOOKS || [];
        for (var i = 0; i < books.length; i++) if (books[i] && books[i].id === queue.bookId) { cat = books[i].category || ""; by = books[i].author || ""; break; }
      }
      if (/^pod:/.test(queue.key || "")) cat = cat || "podcast";
      if (/^ab:/.test(queue.key || "")) cat = cat || "audiobook";
      learn({ title: queue.title || "", by: by, cat: cat }, 1);
    } catch (e) {}
  }
  function topTerms(n) {
    var t = taste();
    return Object.keys(t.terms).sort(function (a, b) { return t.terms[b] - t.terms[a]; }).slice(0, n || 4);
  }
  function topHost() {
    var t = taste();
    var ks = Object.keys(t.hosts).sort(function (a, b) { return t.hosts[b] - t.hosts[a]; });
    return ks.length ? ks[0] : "";
  }
  /* the two fetch words for the morning: taste first, then the
     minds picked at setup (Focus becomes meditation), then the
     day's own rotation so a brand new ear still gets variety */
  function seedTerms() {
    var out = [];
    /* v410: what was read, saved and searched anywhere in the app
       seeds this room too; the ledger outranks the local notebook */
    try {
      if (window.TSB_TASTE && TSB_TASTE.topWords) TSB_TASTE.topWords(3).forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); });
    } catch (e) {}
    topTerms(3).forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); });
    if (out.length >= 2) return out.slice(0, 3);
    try {
      var mind = jget("tsb_mind", []);
      if (Array.isArray(mind)) mind.forEach(function (m) {
        var hit = MIND_TERMS[String(m || "").toLowerCase()];
        if (hit) hit.forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); });
      });
      var ints = jget("tsb_interests", []);
      if (Array.isArray(ints)) ints.forEach(function (x) { words(x).forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); }); });
      var lead = jget("tsb_ob_lead", "");
      words(lead).forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); });
    } catch (e) {}
    if (out.length < 2) {
      var d = DAY_DEFAULTS[Math.floor(Date.now() / 864e5) % DAY_DEFAULTS.length];
      d.forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); });
    }
    return out.slice(0, 3);
  }

  /* ---------------- finding things again ---------------- */
  function allShows() {
    var out = ((window.TSB_PODCASTS && TSB_PODCASTS.shows) || []).concat(window.TSB_SHOWS_EXTRA || []);
    var got = jget("tsb_show_got", {});
    Object.keys(got || {}).forEach(function (k) { if (got[k] && got[k].rss && !out.some(function (s) { return s.id === got[k].id; })) out.push(got[k]); });
    return out;
  }
  function findShow(id) { var all = allShows(); for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; }
  function abRec(key) { return (window.TSB_AUDIOBOOKS || {})[key] || null; }
  function savedSet() {
    var out = { ab: {}, show: {} };
    try {
      (window.TSB.bookmarks.list() || []).forEach(function (x) {
        if (String(x).indexOf("ab:") === 0) out.ab[String(x).slice(3)] = 1;
        if (String(x).indexOf("show:") === 0) out.show[String(x).slice(5)] = 1;
      });
    } catch (e) {}
    return out;
  }
  function heart(on) {
    return on
      ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="#E5484D" stroke="#E5484D" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
  }
  var playSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';

  function bookCard(key, rec, saved) {
    var b = ((window.BOOKS || []).filter(function (x) { return x.id === key; })[0]) || {};
    var art = "";
    try { art = window.TSB_ABART ? TSB_ABART(key, rec, b) : (b.cover || rec.art || ""); } catch (e) { art = b.cover || ""; }
    return '<article class="ln-day__card">' +
      '<span class="ln-day__art">' + (art ? '<img src="' + esc(art) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<i>' + esc(String(rec.title || "A").slice(0, 1)) + '</i>') + '</span>' +
      '<b>' + esc(b.title || rec.title || key) + '</b>' +
      '<span class="ln-day__sub">' + esc(rec.author || b.author || "LibriVox") + ' · Audiobook</span>' +
      '<span class="ln-day__acts"><button type="button" class="ln-day__play" data-dplay-ab="' + esc(key) + '">' + playSvg + ' Play</button>' +
      '<button type="button" class="ln-day__save' + (saved ? " on" : "") + '" data-dsave="ab:' + esc(key) + '" aria-label="Save to your shelf">' + heart(saved) + '</button></span></article>';
  }
  function showCard(show, saved) {
    return '<article class="ln-day__card">' +
      '<span class="ln-day__art">' + (show.art ? '<img src="' + esc(show.art) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<i>' + esc(String(show.name || "S").slice(0, 1)) + '</i>') + '</span>' +
      '<b>' + esc(show.name || show.id) + '</b>' +
      '<span class="ln-day__sub">' + esc(show.host || "Podcast") + ' · Show</span>' +
      '<span class="ln-day__acts"><button type="button" class="ln-day__play" data-dplay-feed="' + esc(show.id) + '">' + playSvg + ' Play latest</button>' +
      '<button type="button" class="ln-day__save' + (saved ? " on" : "") + '" data-dsave="show:' + esc(show.id) + '" aria-label="Save to your shelf">' + heart(saved) + '</button></span></article>';
  }

  /* ---------------- Fresh today ---------------- */
  var dailyBusy = false;
  function dailyState() { return jget(DAILYKEY, null); }
  function paintDaily(note) {
    var box = document.getElementById("lnDaily");
    if (!box) return;
    var st = dailyState();
    var saved = savedSet();
    var cards = [];
    var terms = (st && st.terms) || seedTerms();
    if (st) {
      (st.books || []).forEach(function (key) { var rec = abRec(key); if (rec) cards.push(bookCard(key, rec, !!saved.ab[key])); });
      (st.shows || []).forEach(function (id) { var sh = findShow(id); if (sh) cards.push(showCard(sh, !!saved.show[id])); });
    }
    var label = terms.slice(0, 2).join(" and ");
    box.innerHTML = '<div class="ln-day__head"><h2 class="pc-h2">Fresh today</h2>' +
      '<p>' + (note ? esc(note) : (cards.length ? "Fetched this morning around " + esc(label || "your listening") + ". It rebuilds itself every day." : "Building today's shelf from what you have been listening to.")) + '</p></div>' +
      (cards.length ? '<div class="ln-day__rail">' + cards.join("") + '</div>' +
        '<button type="button" class="ln-day__more" id="lnDailyMore"' + (dailyBusy ? " disabled" : "") + '>' + (dailyBusy ? "Fetching more fresh picks" : "More fresh picks") + '</button>'
        : '<div class="ln-day__rail"><article class="ln-day__card ln-day__card--wait"><b>One moment</b><span class="ln-day__sub">Reaching LibriVox and the podcast directory.</span></article></div>');
    var more = document.getElementById("lnDailyMore");
    if (more) more.addEventListener("click", function () { moreFresh(); });
  }
  function storeDaily(bookKeys, showIds, terms) {
    var prev = dailyState() || {};
    var books = (prev.books || []).slice();
    bookKeys.forEach(function (k) { if (books.indexOf(k) < 0) books.push(k); });
    var shows = (prev.shows || []).slice();
    showIds.forEach(function (k) { if (shows.indexOf(k) < 0) shows.push(k); });
    jset(DAILYKEY, { day: dayStr(), at: Date.now(), terms: terms, books: books.slice(-18), shows: shows.slice(-18) });
  }
  function fetchDaily(terms, done) {
    var bookTerm = terms[0] || "meditation";
    var showTerm = terms[1] || terms[0] || "great interviews";
    var gotBooks = [], gotShows = [], left = 2;
    function fin() { left--; if (left > 0) return; storeDaily(gotBooks, gotShows, terms); done(gotBooks.length + gotShows.length); }
    try {
      if (window.TSB_ABMORE && TSB_ABMORE.searchTopic) TSB_ABMORE.searchTopic(bookTerm, 4, function (recs) { gotBooks = (recs || []).map(function (r) { return r.key; }).filter(Boolean); fin(); });
      else fin();
    } catch (e) { fin(); }
    try {
      if (window.TSB_SHOWMORE && TSB_SHOWMORE.fresh) TSB_SHOWMORE.fresh(showTerm, 4, function (list) { gotShows = (list || []).map(function (s) { return s.id; }).filter(Boolean); fin(); });
      else fin();
    } catch (e2) { fin(); }
  }
  function ensureDaily() {
    var st = dailyState();
    if (st && st.day === dayStr() && ((st.books || []).length + (st.shows || []).length) >= 2) { paintDaily(); return; }
    paintDaily();
    if (dailyBusy) return;
    dailyBusy = true;
    fetchDaily(seedTerms(), function () {
      dailyBusy = false;
      paintDaily();
      syncSoon();
    });
  }
  function moreFresh() {
    if (dailyBusy) return;
    dailyBusy = true;
    paintDaily();
    var terms = seedTerms();
    var st = dailyState() || {};
    var used = (st.moreIdx || 0) + 1;
    var pool = terms.concat(["classic novels", "science and nature", "business stories", "mind and psychology"]);
    var pair = [pool[used % pool.length], pool[(used + 1) % pool.length]];
    fetchDaily(pair, function (n) {
      var now = dailyState() || {};
      now.moreIdx = used;
      jset(DAILYKEY, now);
      dailyBusy = false;
      paintDaily(n ? "" : "That is everything fresh for those words. Play or save anything and tomorrow leans closer to it.");
      syncSoon();
    });
  }

  /* ---------------- More like this ---------------- */
  var simSig = "", simBusy = false;
  function lastRec() { return jget("tsb_audio_last", null); }
  function simAnchor() {
    var last = lastRec();
    if (last && last.key) {
      if (/^pod:/.test(last.key)) { var sh = findShow(String(last.key).slice(4)); if (sh) return { kind: "show", show: sh, label: sh.name }; }
      if (/^ab:/.test(last.key)) { var key = String(last.key).slice(3); var rec = abRec(key); if (rec) return { kind: "book", key: key, rec: rec, label: rec.title || key }; }
      if (last.bookId && abRec(last.bookId)) return { kind: "book", key: last.bookId, rec: abRec(last.bookId), label: last.title || last.bookId };
    }
    /* no plays yet: anchor on the first saved show, so the rail
       still answers the shelf you built by hand */
    var saved = savedSet();
    var ids = Object.keys(saved.show);
    if (ids.length) { var s2 = findShow(ids[0]); if (s2) return { kind: "show", show: s2, label: s2.name, fromShelf: true }; }
    return null;
  }
  function paintSimilar() {
    var box = document.getElementById("lnSimilar");
    if (!box) return;
    var anchor = simAnchor();
    if (!anchor) { box.innerHTML = ""; box.style.display = "none"; return; }
    box.style.display = "";
    var sig = anchor.kind + ":" + (anchor.kind === "show" ? anchor.show.id : anchor.key) + ":" + dayStr();
    if (sig === simSig && box.innerHTML) return;
    simSig = sig;
    var saved = savedSet();
    box.innerHTML = '<div class="ln-day__head"><h2 class="pc-h2">More like ' + esc(anchor.label || "this") + '</h2>' +
      '<p>' + (anchor.fromShelf ? "Because it sits on your shelf." : "Because you were listening to it.") + ' Similar voices, fetched fresh.</p></div>' +
      '<div class="ln-day__rail"><article class="ln-day__card ln-day__card--wait"><b>Finding its neighbours</b><span class="ln-day__sub">One search, then they are yours.</span></article></div>';
    if (simBusy) return;
    simBusy = true;
    function done(cards) {
      simBusy = false;
      if (!cards.length) { box.innerHTML = ""; box.style.display = "none"; simSig = ""; return; }
      box.innerHTML = '<div class="ln-day__head"><h2 class="pc-h2">More like ' + esc(anchor.label || "this") + '</h2>' +
        '<p>' + (anchor.fromShelf ? "Because it sits on your shelf." : "Because you were listening to it.") + ' Similar voices, fetched fresh.</p></div>' +
        '<div class="ln-day__rail">' + cards.join("") + '</div>';
    }
    if (anchor.kind === "show") {
      if (window.TSB_SHOWMORE && TSB_SHOWMORE.similar) TSB_SHOWMORE.similar(anchor.show, function (list) {
        done((list || []).map(function (s) { return showCard(s, !!saved.show[s.id]); }));
      });
      else done([]);
    } else {
      var term = anchor.rec.author || topTerms(1)[0] || "classic";
      if (window.TSB_ABMORE && TSB_ABMORE.searchTopic) TSB_ABMORE.searchTopic(term, 5, function (recs) {
        done((recs || []).filter(function (r) { return r.key !== anchor.key; }).slice(0, 5).map(function (r) { return bookCard(r.key, r, !!saved.ab[r.key]); }));
      });
      else done([]);
    }
  }

  /* ---------------- one set of hands for every card ---------------- */
  function wire() {
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      var save = t.closest("[data-dsave]");
      if (save) {
        var full = save.getAttribute("data-dsave");
        var kind = full.split(":")[0], id = full.slice(kind.length + 1);
        try {
          if (window.TSB.bookmarks) TSB.bookmarks.toggle(full);
          if (kind === "ab") { var rec = abRec(id); noteSave(rec ? rec.title : id, rec ? rec.author : "", "audiobook"); }
          else { var sh = findShow(id); noteSave(sh ? sh.name : id, sh ? sh.host : "", "podcast"); if (sh && window.TSB_SHOWMORE) TSB_SHOWMORE.learn(sh, 1); }
        } catch (err) {}
        paintDaily();
        paintSimilar();
        if (window.paintMyShelf) window.paintMyShelf();
        syncSoon();
        return;
      }
      var pab = t.closest("[data-dplay-ab]");
      if (pab && window.TSB_AUDIO && TSB_AUDIO.playAudiobook) { TSB_AUDIO.playAudiobook(pab.getAttribute("data-dplay-ab"), { open: true }); return; }
      var pfeed = t.closest("[data-dplay-feed]");
      if (pfeed && window.TSB_AUDIO && TSB_AUDIO.playFeed) {
        var show = findShow(pfeed.getAttribute("data-dplay-feed"));
        if (show) TSB_AUDIO.playFeed(show, undefined, null, { open: true });
      }
    });
    window.addEventListener("tsb:bookmark", function () { paintDaily(); });
    window.addEventListener("tsb:ap-parked", function () { simSig = ""; paintSimilar(); });
    setInterval(function () { if (!document.hidden) paintSimilar(); }, 6000);
  }

  function boot() {
    if (!document.getElementById("lnDaily") && !document.getElementById("lnSimilar")) return;
    wire();
    ensureDaily();
    paintSimilar();
  }

  window.TSB_LISTEN_FEED = {
    learn: learn, learnPlay: learnPlay, noteSearch: noteSearch, noteSave: noteSave,
    topTerms: topTerms, topHost: topHost, seedTerms: seedTerms,
    refreshDaily: ensureDaily, similar: paintSimilar
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
