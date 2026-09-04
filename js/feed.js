/* ============================================================
   THESMALLBOOK — 🏠 INFINITE FEED (feed.js)
   A never-ending mixed stream, personalised by onboarding:

     · quote cards      (typographic colour blocks)
     · lesson cards     (cover + hook + read time)
     · graveyard cards  (R.I.P. autopsies — a first-class citizen,
                         roughly 1 in 4, never buried in a corner)
     · book cards       (cover-led "start this")

   Like / save / share work inline. Deterministic shuffle so the
   order is stable within a session but fresh each day.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_FEED) return;

  var PAGE = 12;
  var cursor = 0;
  var deck = [];
  var mount = null;
  var sentinel = null;
  var io = null;

  /* ---------- storage ---------- */
  function lsGet(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }
    catch (e) { return d; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function likes() { return lsGet("tsb_likes", []); }
  function saves() { return lsGet("tsb_bookmarks", []); }
  function isLiked(k) { return likes().indexOf(k) !== -1; }
  function isSaved(k) { return saves().indexOf(k) !== -1; }

  function toggle(key, storeKey) {
    var arr = lsGet(storeKey, []);
    var i = arr.indexOf(key);
    if (i === -1) arr.push(key); else arr.splice(i, 1);
    lsSet(storeKey, arr);
    return i === -1;
  }

  /* ---------- deterministic daily shuffle ---------- */
  function seed() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function rng(n) {
    var x = Math.sin(n) * 10000;
    return x - Math.floor(x);
  }

  /* ---------- personalisation ---------- */
  function prefs() { return lsGet("tsb_prefs_v2", null); }

  var TOPIC_CATS = {
    money: ["Money & Finance"], habits: ["Self-Improvement", "Productivity"],
    business: ["Business & Startups"], mind: ["Psychology & People", "Self-Improvement"],
    people: ["Psychology & People"], focus: ["Productivity"],
    power: ["Power & Strategy"], creativity: ["Creativity"],
    health: ["Health", "Self-Improvement"], leadership: ["Business & Startups", "Power & Strategy"],
    philosophy: ["Philosophy", "Psychology & People"], failure: ["Business & Startups"]
  };

  function wantedCats() {
    var p = prefs();
    if (!p || !p.topics || !p.topics.length) return null;
    var out = {};
    p.topics.forEach(function (t) {
      (TOPIC_CATS[t] || []).forEach(function (c) { out[c] = true; });
    });
    return Object.keys(out).length ? out : null;
  }

  /* ---------- build the deck ---------- */
  var PALETTE = ["coral", "periwinkle", "butter", "mint", "sky"];

  function build() {
    var books = window.BOOKS || [];
    var graves = window.FAILURES || [];
    if (!books.length) return [];

    var cats = wantedCats();
    var s = seed();

    /* rank books: preferred categories first, then everything else,
       so the feed is personalised but never runs out */
    var ranked = books.map(function (b, i) {
      var score = rng(s + i) * 2;
      if (cats && cats[b.category]) score += 5;
      return { b: b, score: score };
    }).sort(function (x, y) { return y.score - x.score; }).map(function (x) { return x.b; });

    var gRanked = graves.map(function (f, i) {
      return { f: f, score: rng(s + 7777 + i) };
    }).sort(function (x, y) { return y.score - x.score; }).map(function (x) { return x.f; });

    var items = [];
    var bi = 0, gi = 0, n = 0;
    var target = Math.min(ranked.length * 3, 420);

    while (items.length < target && (bi < ranked.length || gi < gRanked.length)) {
      var slot = n % 8;

      /* graveyard gets slots 3 and 7 → ~25% of the feed, evenly spread */
      if ((slot === 3 || slot === 7) && gi < gRanked.length) {
        items.push({ kind: "grave", f: gRanked[gi++] });
      } else if (bi < ranked.length) {
        var b = ranked[bi];
        var lessons = b.lessons || [];
        var r = rng(s + bi * 31 + n);

        if (r < 0.34 && lessons.length) {
          var li = Math.floor(rng(s + bi * 17) * lessons.length);
          items.push({ kind: "lesson", b: b, l: lessons[li], i: li });
        } else if (r < 0.62 && (b.quotes || []).length) {
          var qi = Math.floor(rng(s + bi * 23) * b.quotes.length);
          items.push({ kind: "quote", b: b, q: b.quotes[qi], i: qi });
        } else {
          items.push({ kind: "book", b: b });
        }
        bi++;
      } else if (gi < gRanked.length) {
        items.push({ kind: "grave", f: gRanked[gi++] });
      }
      n++;
    }
    return items;
  }

  /* ---------- card renderers ---------- */
  var ICO_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  var ICO_SAVE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  var ICO_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>';
  var ICO_GO    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';

  function actions(key, href, title) {
    return '<div class="fd-acts">' +
      '<button class="fd-act' + (isLiked(key) ? " on" : "") + '" data-like="' + esc(key) + '" aria-label="Like">' +
        ICO_HEART + "</button>" +
      '<button class="fd-act' + (isSaved(key) ? " on" : "") + '" data-save="' + esc(key) + '" aria-label="Save">' +
        ICO_SAVE + "</button>" +
      '<button class="fd-act" data-share="' + esc(href) + '" data-title="' + esc(title) + '" aria-label="Share">' +
        ICO_SHARE + "</button>" +
    "</div>";
  }

  function cardQuote(it, idx) {
    var hue = PALETTE[idx % PALETTE.length];
    var href = "book.html?id=" + encodeURIComponent(it.b.id);
    var key = "q:" + it.b.id + ":" + it.i;
    return '<article class="fd-card fd-card--' + hue + '" data-href="' + esc(href) + '">' +
      '<span class="fd-eyebrow">Quote</span>' +
      '<blockquote class="fd-quote">' + esc(it.q) + "</blockquote>" +
      '<div class="fd-by">' +
        (it.b.cover ? '<img src="' + esc(it.b.cover) + '" alt="" loading="lazy" width="30" height="44">' : "") +
        "<span><b>" + esc(it.b.title) + "</b>" + esc(it.b.author || "") + "</span>" +
      "</div>" + actions(key, href, it.b.title) +
      '<a class="fd-go" href="' + esc(href) + '" aria-label="Open ' + esc(it.b.title) + '">' + ICO_GO + "</a>" +
    "</article>";
  }

  function cardLesson(it) {
    var href = "book.html?id=" + encodeURIComponent(it.b.id) + "#lesson-" + it.i;
    var key = "l:" + it.b.id + ":" + it.i;
    var body = (it.l.summary || "").slice(0, 168);
    return '<article class="fd-card fd-card--plain" data-href="' + esc(href) + '">' +
      '<div class="fd-row">' +
        (it.b.cover ? '<img class="fd-cover" src="' + esc(it.b.cover) + '" alt="" loading="lazy" width="62" height="92">' : "") +
        "<div class=\"fd-rowtxt\">" +
          '<span class="fd-eyebrow">Lesson \u00B7 ' + esc(it.b.readTime || "5 min") + "</span>" +
          '<h3 class="fd-title">' + esc(it.l.title) + "</h3>" +
          '<p class="fd-body">' + esc(body) + "\u2026</p>" +
          '<span class="fd-src">' + esc(it.b.title) + "</span>" +
        "</div>" +
      "</div>" + actions(key, href, it.l.title) +
      '<a class="fd-go" href="' + esc(href) + '" aria-label="Read ' + esc(it.l.title) + '">' + ICO_GO + "</a>" +
    "</article>";
  }

  function cardGrave(it) {
    var f = it.f;
    var href = "graveyard/" + encodeURIComponent(f.id) + ".html";
    var key = "g:" + f.id;
    var body = (f.lesson || f.mistake || f.story || "").slice(0, 150);
    return '<article class="fd-card fd-card--grave" data-href="' + esc(href) + '">' +
      '<div class="fd-rip">' +
        '<span class="fd-rip__tag">\uD83D\uDC80 R.I.P.</span>' +
        '<span class="fd-rip__yr">' + esc(f.year || "") + "</span>" +
      "</div>" +
      '<h3 class="fd-title fd-title--grave">' + esc(f.name) + "</h3>" +
      '<p class="fd-sub">' + esc(f.title || "") + "</p>" +
      (f.loss ? '<div class="fd-loss">' + esc(f.loss) + "</div>" : "") +
      '<p class="fd-body">' + esc(body) + "\u2026</p>" +
      actions(key, href, f.name) +
      '<a class="fd-go" href="' + esc(href) + '" aria-label="Read the autopsy">' + ICO_GO + "</a>" +
    "</article>";
  }

  function cardBook(it) {
    var b = it.b;
    var href = "book.html?id=" + encodeURIComponent(b.id);
    var key = "b:" + b.id;
    var n = (b.lessons || []).length;
    return '<article class="fd-card fd-card--plain" data-href="' + esc(href) + '">' +
      '<div class="fd-row">' +
        (b.cover ? '<img class="fd-cover" src="' + esc(b.cover) + '" alt="" loading="lazy" width="62" height="92">' : "") +
        '<div class="fd-rowtxt">' +
          '<span class="fd-eyebrow">' + esc(b.category || "Book") + "</span>" +
          '<h3 class="fd-title">' + esc(b.title) + "</h3>" +
          '<p class="fd-body">' + esc((b.tagline || "").slice(0, 140)) + "</p>" +
          '<span class="fd-src">' + n + " lessons \u00B7 " + esc(b.readTime || "") + "</span>" +
        "</div>" +
      "</div>" + actions(key, href, b.title) +
      '<a class="fd-go" href="' + esc(href) + '" aria-label="Open ' + esc(b.title) + '">' + ICO_GO + "</a>" +
    "</article>";
  }

  function renderCard(it, idx) {
    if (it.kind === "quote")  return cardQuote(it, idx);
    if (it.kind === "lesson") return cardLesson(it);
    if (it.kind === "grave")  return cardGrave(it);
    return cardBook(it);
  }

  /* ---------- paging ---------- */
  function loadMore() {
    if (!mount || cursor >= deck.length) return;
    var slice = deck.slice(cursor, cursor + PAGE);
    var html = slice.map(function (it, i) { return renderCard(it, cursor + i); }).join("");
    var frag = document.createElement("div");
    frag.className = "fd-batch";
    frag.innerHTML = html;
    mount.insertBefore(frag, sentinel);
    cursor += slice.length;

    if (cursor >= deck.length) {
      /* loop the deck — a feed that ends feels broken */
      deck = deck.concat(build());
    }
  }

  /* ---------- interactions ---------- */
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "pf-toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2000);
  }

  function onClick(e) {
    var like = e.target.closest("[data-like]");
    if (like) {
      e.preventDefault(); e.stopPropagation();
      var on = toggle(like.getAttribute("data-like"), "tsb_likes");
      like.classList.toggle("on", on);
      like.animate ? like.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.32)" }, { transform: "scale(1)" }],
        { duration: 280, easing: "cubic-bezier(.34,1.56,.64,1)" }) : null;
      return;
    }
    var save = e.target.closest("[data-save]");
    if (save) {
      e.preventDefault(); e.stopPropagation();
      var s = toggle(save.getAttribute("data-save"), "tsb_bookmarks");
      save.classList.toggle("on", s);
      toast(s ? "Saved" : "Removed");
      return;
    }
    var sh = e.target.closest("[data-share]");
    if (sh) {
      e.preventDefault(); e.stopPropagation();
      var url = location.origin + "/" + sh.getAttribute("data-share");
      var title = sh.getAttribute("data-title") || "TheSmallBook";
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { toast("Link copied"); });
      }
      return;
    }
    /* tapping the card body opens it */
    var card = e.target.closest(".fd-card[data-href]");
    if (card && !e.target.closest("a,button")) {
      location.href = card.getAttribute("data-href");
    }
  }

  /* ---------- boot ---------- */
  function init(el) {
    mount = el || document.getElementById("tsbFeed");
    if (!mount) return;

    deck = build();
    if (!deck.length) return;

    /* Own the reveal here rather than in page script: if we have cards, the
       section is shown; if the data never arrives it stays hidden and the
       page falls back to the shelf. */
    var sec = mount.closest("#feedSection") || document.getElementById("feedSection");
    if (sec) sec.hidden = false;

    mount.innerHTML = "";
    sentinel = document.createElement("div");
    sentinel.className = "fd-sentinel";
    sentinel.innerHTML = '<div class="fd-spin"></div>';
    mount.appendChild(sentinel);

    loadMore();
    loadMore();

    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) loadMore(); });
      }, { rootMargin: "900px 0px" });
      io.observe(sentinel);
    } else {
      window.addEventListener("scroll", function () {
        if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 1200) loadMore();
      }, { passive: true });
    }

    mount.addEventListener("click", onClick);
  }

  window.TSB_FEED = { init: init, build: build, reload: function () { cursor = 0; init(mount); } };

  /* No auto-init. The feed is infinite, so a page that renders it above
     other content makes that content unreachable — index.html only calls
     init() when the reader has opted into the app view. Pages that are
     nothing but feed (home.html) mark the mount with data-feed-auto. */
  function autoInit() {
    var el = document.querySelector("[data-feed-auto]");
    if (el) init(el.id === "tsbFeed" ? el : document.getElementById("tsbFeed"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else { autoInit(); }
})();
