/* ============================================================
   THESMALLBOOK, 🌊 DEEP DIVE READER (deepdive.js) · v300
   The Gold reader: one chapter's idea, taken all the way.
   • Reader mode: a real paper page, progress bar, TTS listen.
   • Entitlement, not the wall: the sample dive is free for
     everyone; the rest ask for Gold even while the wall is off,
     because this is what Gold IS. Founder sees everything.
   ============================================================ */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var DIVES = window.TSB_DEEPDIVES || [];
  function byId(id) { for (var i = 0; i < DIVES.length; i++) if (DIVES[i].id === id) return DIVES[i]; return null; }
  function bookOf(bookId) { var B = window.BOOKS || []; for (var i = 0; i < B.length; i++) if (B[i].id === bookId) return B[i]; return null; }
  function isGold() {
    try { if (window.TSB_PAYWALL && TSB_PAYWALL.isGold && TSB_PAYWALL.isGold()) return true; } catch (e) {}
    try { if (window.TSB_GOLD && TSB_GOLD.isGold && TSB_GOLD.isGold()) return true; } catch (e) {}
    return false;
  }

  var current = null, listenOn = false;

  function gateCard(d) {
    var gate = $("ddGate");
    gate.hidden = false;
    gate.innerHTML =
      '<div class="dd-gate"><div class="dd-gate__emoji">🌊</div>' +
      '<h2>THIS ONE IS A GOLD READ</h2>' +
      '<p class="dd-gate__p">' + esc(d.hook) + '</p>' +
      '<div class="dd-gate__row">' +
        '<a class="dd-gate__go" href="gold.html">👑 UNLOCK WITH GOLD</a>' +
        '<a class="dd-gate__try" href="deepdive.html?id=dd-atomic-identity">READ THE FREE SAMPLE FIRST</a>' +
      '</div>' +
      '<small class="dd-gate__tiny">The 500 books stay free, every lesson. Gold is this: the layer underneath, one chapter at a time.</small></div>';
    document.title = "A Gold deep dive | TheSmallBook";
  }

  function paint(d) {
    var b = bookOf(d.bookId);
    $("ddGate").hidden = true;
    var parts = ['<header class="dd-head">',
      '<a class="dd-crumb" href="book.html?id=' + esc(d.bookId) + '">📖 ' + esc((b && b.title) || d.bookId) + '</a>',
      '<span class="dd-chip">' + esc(d.chapterLabel.toUpperCase()) + '</span>',
      '<span class="dd-chip dd-chip--min">⏱ ' + d.minutes + ' MIN</span>',
      d.sample ? '<span class="dd-chip dd-chip--free">FREE SAMPLE</span>' : '<span class="dd-chip dd-chip--gold">👑 GOLD</span>',
      '</header>',
      '<h1 class="dd-h1">' + esc(d.title) + '</h1>',
      '<p class="dd-hook">' + esc(d.hook) + '</p>'];
    d.sections.forEach(function (s, i) {
      parts.push('<h2 class="dd-h2">' + esc(s.h) + '</h2>');
      s.p.forEach(function (par) { parts.push('<p class="dd-p">' + esc(par) + '</p>'); });
    });
    parts.push('<div class="dd-take"><b>THE ONE THING TO KEEP</b><p>' + esc(d.sections[d.sections.length - 1].p[d.sections[d.sections.length - 1].p.length - 1]) + '</p></div>');
    parts.push('<div class="dd-foot">' +
      '<p class="dd-note">An original TheSmallBook essay around the chapter: our analysis, the evidence, the holes, the practice. The chapter itself stays in the book, where it belongs. <a href="book.html?id=' + esc(d.bookId) + '">Read the full breakdown free &rarr;</a></p>' +
      '<div class="dd-actions">' +
        '<button id="ddListen" class="dd-btn">🎧 LISTEN TO THIS DIVE</button>' +
        '<a class="dd-btn dd-btn--ghost" href="gold.html">👑 ALL DEEP DIVES WITH GOLD</a>' +
      '</div></div>');
    $("ddPaper").innerHTML = parts.join("");
    document.title = d.title + " | TheSmallBook Deep Dive";
    $("ddBar").style.width = "4%";
    $("ddListen").addEventListener("click", function () {
      var A = window.TSB_AUDIO;
      if (!A) return;
      var sections = d.sections.map(function (s) {
        return { label: s.h, text: s.p.join(" ") };
      });
      A.playDoc(d.id, d.title, (d.chapterLabel || "") + " · narrated by your app", sections);
      this.textContent = "🎧 QUEUED IN THE PLAYER";
    });
    window.scrollTo({ top: 0 });
  }

  function progress() {
    var h = document.documentElement;
    var pct = Math.min(100, Math.round((window.scrollY / Math.max(1, h.scrollHeight - h.clientHeight)) * 100));
    $("ddBar").style.width = pct + "%";
  }
  window.addEventListener("scroll", progress, { passive: true });

  function boot() {
    var m = location.search.match(/[?&]id=([a-z0-9-]+)/);
    var d = m ? byId(m[1]) : null;
    if (!d) { $("ddPaper").innerHTML = '<div class="dd-head"><h1 class="dd-h1">Deep dive not found.</h1><p class="dd-hook"><a href="index.html">Back to the library</a></p></div>'; return; }
    current = d;
    if (!d.sample && !isGold()) {
      /* auth may still be arriving; repaint once it speaks */
      gateCard(d);
      var waited = 0;
      var iv = setInterval(function () {
        waited++;
        if (isGold()) { clearInterval(iv); paint(d); afterPaint(); return; }
        if (waited > 14) clearInterval(iv);
      }, 350);
      return;
    }
    paint(d);
    afterPaint();
  }
  /* stories rail deep link: deepdive.html?id=…&listen=1 starts the narration */
  function afterPaint() {
    if (!/[?&]listen=1/.test(location.search)) return;
    setTimeout(function () {
      var b = document.getElementById("ddListen");
      if (b) b.click();
    }, 500);
  }
  boot();

  window.TSB_DEEPDIVE = { open: boot, byId: byId, all: function () { return DIVES; } };
})();
