/* ============================================================
   TheSmallBook · THE AUDIO ROOM  (v400)
   The Listen room used to open with a headline and a wall of
   covers: no sign that this is a room you can start listening
   in, and no way back to the thing you were listening to.
   This file gives it a front door:

     1. THE HOLD CARD - one card at the top that says either
        "continue listening" (real session, real chapter) or
        "start here" (the first book on the shelf). It reads
        the player, never invents a progress number.
     2. THE ROOM LINE - honest counts: how many audiobooks,
        how many shows, how many narrated deep dives.
     3. THE JUMP BAR - four chips that scroll to the four
        shelves, so a phone user never has to hunt.

   Rules kept: no optional chaining, no bare catch, no dashes
   in copy, one repaint only when the signature changes.
   ============================================================ */
(function () {
  "use strict";

  var room = null, jump = null, sig = "", timer = 0;

  function $(s) { return document.querySelector(s); }
  function esc(x) {
    return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function jget(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; }
  }

  function playIcon() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  }

  /* the cover for a book id, using whatever the page already knows */
  function artFor(bid) {
    try {
      if (window.TSB_ABART) {
        var rec = (window.TSB_AUDIOBOOKS || {})[bid] || {};
        var b = ((window.TSB_BOOKS || window.BOOKS || []) || []).filter(function (x) { return x && x.id === bid; })[0] || {};
        var a = window.TSB_ABART(bid, rec, b);
        if (a) return a;
      }
    } catch (e) {}
    return "assets/covers/" + bid + ".jpg";
  }

  /* the first audiobook the shelf actually rendered, so "start here" is the
     same book the eyes land on below */
  function firstBook() {
    var btn = document.querySelector("#pcAudiobooks [data-ab]");
    if (!btn) return null;
    var bid = btn.getAttribute("data-ab");
    var card = btn.closest ? btn.closest(".pc-ab__card") : null;
    var title = "", author = "";
    if (card) {
      var t = card.querySelector("b"), a = card.querySelector("i");
      if (t) title = t.textContent.trim();
      if (a) author = a.textContent.trim();
    }
    var rec = (window.TSB_AUDIOBOOKS || {})[bid] || {};
    return {
      id: bid,
      title: title || rec.title || "the first book",
      author: author || rec.author || "",
      art: artFor(bid)
    };
  }

  /* continueCard() knows the title and the chapter, not the picture, so the
     picture comes from the key: an audiobook key carries its book id, and a
     podcast key is looked up in the player's own art table. */
  function liveArt(live) {
    try {
      if (live.bookId) return artFor(live.bookId);
      if (/^ab:/.test(live.key || "")) return artFor(String(live.key).slice(3));
      if (window.TSB_AUDIO && window.TSB_AUDIO.artFor) {
        var a = window.TSB_AUDIO.artFor(live.key);
        if (a) return a;
      }
    } catch (e) {}
    return "";
  }

  function counts() {
    var books = 0, shows = 0, dives = 0;
    try { books = Object.keys(window.TSB_AUDIOBOOKS || {}).length; } catch (e) {}
    try {
      var D = window.TSB_PODCASTS || {};
      shows = (D.shows || []).length + (window.TSB_SHOWS_EXTRA || []).length;
    } catch (e2) {}
    try {
      var painted = document.querySelectorAll("#pcShowList .pc-show").length;
      if (painted > shows) shows = painted;
    } catch (e3) {}
    try { dives = document.querySelectorAll("#pcOriginals .pc-orig__card").length; } catch (e4) {}
    return { books: books, shows: shows, dives: dives };
  }

  function paintRoomLine() {
    var line = $("#lnRoomLine");
    if (!line) return;
    var c = counts();
    var bits = [];
    if (c.books) bits.push(c.books + (c.books === 1 ? " audiobook" : " audiobooks"));
    if (c.shows) bits.push(c.shows + (c.shows === 1 ? " show" : " shows"));
    if (c.dives) bits.push(c.dives + " narrated " + (c.dives === 1 ? "dive" : "dives"));
    line.textContent = bits.length ? bits.join("  ·  ") : "A quiet room. Pick a book and press play.";
  }

  function holdHtml() {
    var A = window.TSB_AUDIO;
    var live = null;
    try { if (A && A.continueCard) live = A.continueCard(); } catch (e) {}

    if (live && live.title) {
      var sub = live.itemLabel ? esc(live.itemLabel) : "Your place";
      var art = liveArt(live);
      var artHtml = art
        ? '<span class="ln-hold__art"><img src="' + esc(art) + '" alt="" onerror="this.style.display=\'none\'"></span>'
        : '<span class="ln-hold__art ln-hold__art--none" aria-hidden="true"></span>';
      return '<div class="ln-hold__in ln-hold__in--live">' +
        '<span class="ln-hold__kick">Continue listening</span>' +
        '<div class="ln-hold__row">' +
          artHtml +
          '<span class="ln-hold__txt">' +
            '<b class="ln-hold__t">' + esc(live.title) + '</b>' +
            '<i class="ln-hold__s">' + sub + '</i>' +
          '</span>' +
          '<button class="ln-hold__go" id="lnResume" type="button" aria-label="Resume ' + esc(live.title) + '">' + playIcon() + '</button>' +
        '</div>' +
        '<span class="ln-hold__foot">You left it here. One tap puts it back in the dock.</span>' +
      '</div>';
    }

    var f = firstBook();
    if (!f) {
      return '<div class="ln-hold__in"><span class="ln-hold__kick">The room is open</span>' +
        '<div class="ln-hold__row"><span class="ln-hold__txt"><b class="ln-hold__t">Pick a book, press play.</b>' +
        '<i class="ln-hold__s">Full chapters, free, read by volunteers.</i></span></div></div>';
    }
    return '<div class="ln-hold__in">' +
      '<span class="ln-hold__kick">Start here</span>' +
      '<div class="ln-hold__row">' +
        '<span class="ln-hold__art"><img src="' + esc(f.art) + '" alt="" onerror="this.style.display=\'none\'"></span>' +
        '<span class="ln-hold__txt">' +
          '<b class="ln-hold__t">' + esc(f.title) + '</b>' +
          '<i class="ln-hold__s">' + (f.author ? esc(f.author) : 'Full chapters, free to listen') + '</i>' +
        '</span>' +
        '<button class="ln-hold__go" id="lnStart" type="button" data-ab="' + esc(f.id) + '" aria-label="Play ' + esc(f.title) + '">' + playIcon() + '</button>' +
      '</div>' +
      '<span class="ln-hold__foot">Audiobooks, shows and our own dives. Nothing to install, nothing to pay.</span>' +
    '</div>';
  }

  function paintHold(force) {
    if (!room) return;
    var stamp = "";
    try {
      var A = window.TSB_AUDIO;
      var st = A && A.state ? A.state() : null;
      stamp = st ? (st.key + "|" + st.cur + "|" + st.playing) : "none";
      var l = A && A.continueCard ? A.continueCard() : null;
      if (l) stamp += "|" + l.title + "|" + l.itemLabel;
    } catch (e) { stamp = "err"; }
    var first = firstBook();
    stamp += "|" + (first ? first.id : "");
    if (!force && stamp === sig) return;
    sig = stamp;
    room.innerHTML = holdHtml();
    var r = $("#lnResume");
    if (r) {
      r.addEventListener("click", function () {
        try { window.TSB_AUDIO.resume({ open: true }); } catch (e) {}
      });
    }
    var s = $("#lnStart");
    if (s) {
      s.addEventListener("click", function () {
        var bid = s.getAttribute("data-ab");
        try { window.TSB_AUDIO.playAudiobook(bid, { open: true }); } catch (e) {}
      });
    }
    paintRoomLine();
    paintForYou();
  }

  /* v404: after sign-in, the room stops being the same wall for everyone.
     The feed is built only from signals already on this device: saved
     audio, onboarding interests, books on the reader's shelf and the last
     thing they listened to. Nothing leaves the phone to make it. */
  var forYouSig = "";
  function signedIn() {
    var s = jget("tsb_auth_session", null);
    return !!(s && s.user && (s.user.id || s.user.email));
  }
  function personalTerms() {
    var out = [], seen = {};
    function add(x) {
      String(x == null ? "" : x).toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, " ").split(" ").forEach(function (w) {
        if (w.length > 2 && !seen[w]) { seen[w] = 1; out.push(w); }
      });
    }
    var ints = jget("tsb_interests", []);
    if (Array.isArray(ints)) ints.forEach(add);
    add(jget("tsb_ob_lead", ""));
    var marks = jget("tsb_bookmarks", []);
    if (Array.isArray(marks)) marks.forEach(function (id) {
      var books = window.BOOKS || window.TSB_BOOKS || [];
      for (var i = 0; i < books.length; i++) {
        if (books[i] && books[i].id === id) { add(books[i].category); add((books[i].tags || []).join(" ")); }
      }
    });
    return out.slice(0, 30);
  }
  function termScore(text, terms) {
    var t = String(text || "").toLowerCase(), n = 0;
    terms.forEach(function (w) { if (t.indexOf(w) >= 0) n++; });
    return n;
  }
  function forYouCards() {
    var terms = personalTerms();
    var marks = jget("tsb_bookmarks", []);
    if (!Array.isArray(marks)) marks = [];
    var savedAb = {}, savedShows = {};
    marks.forEach(function (x) {
      if (String(x).indexOf("ab:") === 0) savedAb[String(x).slice(3)] = 1;
      if (String(x).indexOf("show:") === 0) savedShows[String(x).slice(5)] = 1;
    });
    var last = null;
    try { last = window.TSB_AUDIO && TSB_AUDIO.last ? TSB_AUDIO.last() : null; } catch (e) { last = null; }
    var lastAb = last && /^ab:/.test(last.key || "") ? String(last.key).slice(3) : "";
    var lastShow = last && /^pod:/.test(last.key || "") ? String(last.key).slice(4) : "";
    var cards = [], AB = window.TSB_AUDIOBOOKS || {};
    Object.keys(AB).forEach(function (id, idx) {
      var r = AB[id] || {};
      if (id === lastAb) return;
      var score = Math.max(0, 5 - idx * 0.08), reason = "A strong place to begin";
      var hits = termScore((r.title || "") + " " + (r.author || "") + " " + (r.desc || ""), terms);
      if (savedAb[id]) { score += 9; reason = "On your shelf"; }
      if (hits) { score += hits * 3; reason = "Matches what you have been reading"; }
      if (lastAb && AB[lastAb] && r.lang && r.lang === AB[lastAb].lang && r.lang !== "en") { score += 3; reason = "More in the language you chose"; }
      cards.push({ kind: "ab", id: id, score: score, title: r.title || id, sub: r.author || "Full audiobook", reason: reason, art: artFor(id) });
    });
    var D = window.TSB_PODCASTS || {};
    var shows = (D.shows || []).concat(window.TSB_SHOWS_EXTRA || []);
    shows.forEach(function (s, idx) {
      if (!s || !s.id || s.id === lastShow) return;
      var score = Math.max(0, 4 - idx * 0.06), reason = "A listener favourite";
      var hits = termScore((s.name || "") + " " + (s.host || "") + " " + (s.cat || "") + " " + (s.tag || "") + " " + (s.why || ""), terms);
      if (savedShows[s.id]) { score += 9; reason = "From your saved shows"; }
      if (hits) { score += hits * 2.5; reason = "Picked from your interests"; }
      cards.push({ kind: "show", id: s.id, score: score, title: s.name || s.id, sub: s.host || "Podcast", reason: reason, art: s.art || "" });
    });
    (window.TSB_DEEPDIVES || []).forEach(function (d, idx) {
      if (!d || !d.id) return;
      var score = Math.max(0, 3 - idx * 0.05), reason = "A short TSB deep dive";
      var hits = termScore((d.title || "") + " " + (d.chapterLabel || ""), terms);
      if (hits) { score += hits * 3; reason = "Close to your shelf"; }
      cards.push({ kind: "dive", id: d.id, score: score, title: d.title || "Deep dive", sub: (d.minutes || "") + " min, narrated", reason: reason, art: "" });
    });
    cards.sort(function (a, b) { return b.score - a.score; });
    var picked = [], counts = {};
    cards.forEach(function (c) {
      if (picked.length >= 8) return;
      counts[c.kind] = counts[c.kind] || 0;
      if (counts[c.kind] >= 4) return;
      counts[c.kind]++;
      picked.push(c);
    });
    if (picked.length < 8) cards.forEach(function (c) { if (picked.length < 8 && picked.indexOf(c) < 0) picked.push(c); });
    return picked;
  }
  function paintForYou() {
    var box = document.getElementById("lnForYou");
    if (!box) return;
    var stamp = signedIn() + "|" + JSON.stringify(jget("tsb_bookmarks", [])) + "|" + JSON.stringify(jget("tsb_interests", [])) + "|" + JSON.stringify(jget("tsb_auth_session", null) && jget("tsb_auth_session", null).user ? (jget("tsb_auth_session", null).user.id || jget("tsb_auth_session", null).user.email || "") : "");
    if (stamp === forYouSig) return;
    forYouSig = stamp;
    if (!signedIn()) {
      box.innerHTML = '<div class="ln-foryou__signin"><div><b>A feed that learns your ear.</b><p>Sign in and this rail follows your saved shows, audiobooks and reading interests. Your signals stay on this device.</p></div><a href="login.html?next=podcasts.html">Sign in</a></div>';
      return;
    }
    var cards = forYouCards();
    if (!cards.length) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="ln-foryou__head"><h2>For you</h2><p>Built from your shelf and listening, on this device.</p></div>' +
      '<div class="ln-foryou__rail">' + cards.map(function (c) {
        var art = c.art ? '<img src="' + esc(c.art) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<i>' + esc(String(c.title || "T").slice(0, 1)) + '</i>';
        return '<button class="ln-foryou__card" type="button" data-fy-kind="' + esc(c.kind) + '" data-fy-id="' + esc(c.id) + '"><span class="ln-foryou__art">' + art + '<span class="ln-foryou__play">' + playIcon() + '</span></span><b>' + esc(c.title) + '</b><span>' + esc(c.reason) + '</span></button>';
      }).join("") + '</div>';
  }

  /* the chip that says where you are has to be the chip that is true:
     a chip left lit while the page is three shelves down is a small lie */
  function spy() {
    if (!jump || !window.IntersectionObserver) return;
    var ids = [];
    var chips = jump.querySelectorAll("[data-jump]");
    for (var i = 0; i < chips.length; i++) ids.push(chips[i].getAttribute("data-jump"));
    var io = new IntersectionObserver(function (rows) {
      var best = null;
      for (var j = 0; j < rows.length; j++) {
        if (!rows[j].isIntersecting) continue;
        if (!best || rows[j].intersectionRatio > best.intersectionRatio) best = rows[j];
      }
      if (!best) return;
      var id = best.target.id;
      for (var k = 0; k < chips.length; k++) chips[k].classList.toggle("on", chips[k].getAttribute("data-jump") === id);
    }, { rootMargin: "-56px 0px -55% 0px", threshold: [0.02, 0.25, 0.6] });
    for (var n = 0; n < ids.length; n++) {
      var sec = document.getElementById(ids[n]);
      if (sec) io.observe(sec);
    }
  }

  function wireJump() {
    if (!jump) return;
    jump.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-jump]") : null;
      if (!b) return;
      var id = b.getAttribute("data-jump");
      var target = document.getElementById(id);
      if (!target) return;
      /* every chip marks the room as read from this point down */
      var chips = jump.querySelectorAll("[data-jump]");
      for (var i = 0; i < chips.length; i++) chips[i].classList.toggle("on", chips[i] === b);
      var top = target.getBoundingClientRect().top + window.pageYOffset - 64;
      try { window.scrollTo({ top: top, behavior: "smooth" }); } catch (e) { window.scrollTo(0, top); }
    });
  }

  /* the front door belongs above the rails, so it is moved there by hand:
     film2.js drops its rails straight under the hero, and the door has to be
     the first thing the room says. */
  function lift() {
    var hero = $(".pc-hero");
    if (!hero || !hero.parentNode) return;
    var nodes = [room, $("#lnRoomLine"), $("#lnForYou"), jump];
    var anchor = hero;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n) continue;
      hero.parentNode.insertBefore(n, anchor.nextSibling);
      anchor = n;
    }
  }

  function boot() {
    room = $("#lnHold");
    jump = $("#lnJump");
    if (!room && !jump) return;
    lift();
    wireJump();
    var fy = document.getElementById("lnForYou");
    if (fy) fy.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-fy-kind]") : null;
      if (!b) return;
      var kind = b.getAttribute("data-fy-kind"), id = b.getAttribute("data-fy-id");
      try {
        if (kind === "ab" && window.TSB_AUDIO) window.TSB_AUDIO.playAudiobook(id, { open: true });
        else if (kind === "show" && window.TSB_AUDIO) {
          var D = window.TSB_PODCASTS || {};
          var show = (D.shows || []).concat(window.TSB_SHOWS_EXTRA || []).filter(function (x) { return x && x.id === id; })[0];
          if (show) window.TSB_AUDIO.playFeed(show, undefined, null, { open: true });
        } else if (kind === "dive") location.href = "deepdive.html?id=" + encodeURIComponent(id);
      } catch (err) {}
    });
    window.addEventListener("tsb:bookmark", function () { forYouSig = ""; paintForYou(); });
    spy();
    paintHold(true);
    /* the shelf paints after this file, so catch it as it lands */
    var tries = 0;
    var tick = setInterval(function () {
      tries++;
      /* film2.js drops its rails under the hero when it wakes, which can land
         above the door. Put the door back in front of them. */
      var fp = document.getElementById("fpRoom");
      if (fp && room && (fp.compareDocumentPosition(room) & Node.DOCUMENT_POSITION_FOLLOWING)) lift();
      paintHold(false);
      if (tries > 12) clearInterval(tick);
    }, 400);
    window.addEventListener("tsb:ap-parked", function () { paintHold(true); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) paintHold(false); });
    clearInterval(timer);
    timer = setInterval(function () { if (!document.hidden) paintHold(false); }, 3000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
