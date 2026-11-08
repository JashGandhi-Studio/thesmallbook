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
        try { window.TSB_AUDIO.resume(); } catch (e) {}
      });
    }
    var s = $("#lnStart");
    if (s) {
      s.addEventListener("click", function () {
        var bid = s.getAttribute("data-ab");
        try { window.TSB_AUDIO.playAudiobook(bid); } catch (e) {}
      });
    }
    paintRoomLine();
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
    var nodes = [room, $("#lnRoomLine"), jump];
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
