/* ============================================================
   THESMALLBOOK, BOOK TOOLS (book-tools.js) · v250
   Two things live on the book page, and both were rebuilt this release:

   • 📄 GET CHEAT-SHEET, a real deliverable, not a print of the page.
     EXACTLY TWO A4 pages, in colour, with a designed background per
     category, the real cover, the big idea, five distilled takeaways
     and a diagram. The old version printed the whole document, which is
     where the eleven pages with blanks came from. Now: two pages, always,
     clipped by design so nothing can spill onto a third.

   • 💛 FUEL THIS BREAKDOWN, the sponsor sheet, rebuilt in the app's own
     visual language (thick ink borders, hard shadows, amount picker).

   Free for the first FOUR cheat-sheets; Gold is unlimited.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_BOOKTOOLS) return;

  var FREE_PDF = 4;                       /* "any three to four books, free" */
  var STORE_KEY = "tsb_pdf_free";
  var AMOUNTS = [199, 499, 999];

  /* ---- eight designed palettes, one per category ------------------- */
  var PALETTES = {
    "Self-Improvement":   { a: "#ffc800", b: "#fff6d6", c: "#ffe08a", ink: "#14110c", accent: "#e88a00" },
    "Power & Strategy":   { a: "#14110c", b: "#ece7dc", c: "#d8d2c4", ink: "#14110c", accent: "#c22b2b" },
    "Money & Finance":    { a: "#00b37e", b: "#ddfbef", c: "#b6f0d8", ink: "#04301f", accent: "#0b6b4f" },
    "Psychology & People":{ a: "#b28dff", b: "#f1eaff", c: "#ded0ff", ink: "#14110c", accent: "#7c4dff" },
    "Business & Startups":{ a: "#ff6b35", b: "#ffe9df", c: "#ffd0bb", ink: "#2a0f04", accent: "#c22b2b" },
    "Creativity":         { a: "#ff90e8", b: "#ffe9fb", c: "#ffcdf4", ink: "#14110c", accent: "#a21caf" },
    "Productivity":       { a: "#3b82f6", b: "#e2edff", c: "#c6dcff", ink: "#0b1b3a", accent: "#1d4ed8" },
    "History":            { a: "#a1723f", b: "#f3e8d6", c: "#e6d3b6", ink: "#2a1c0c", accent: "#7a4f22" }
  };
  var FALLBACK = { a: "#ffc800", b: "#fff6d6", c: "#ffe08a", ink: "#14110c", accent: "#e88a00" };

  function $(id) { return document.getElementById(id); }
  function all(sel) { try { return Array.prototype.slice.call(document.querySelectorAll(sel)); } catch (e) { return []; } }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function book() {
    try {
      var id = new URLSearchParams(location.search).get("id");
      return (window.BOOKS || []).filter(function (b) { return b && b.id === id; })[0] || null;
    } catch (e) { return null; }
  }
  function palette(b) { return PALETTES[b && b.category] || FALLBACK; }
  function pdfCount() { try { return +(localStorage.getItem(STORE_KEY) || 0); } catch (e) { return 0; } }
  function isGold() { try { return !!(window.TSB_GOLD && TSB_GOLD.isGold()); } catch (e) { return false; } }
  function upiId() {
    try { return (window.TSB_CONFIG && TSB_CONFIG.PAYWALL && TSB_CONFIG.PAYWALL.UPI_ID) || "9702510680@fam"; }
    catch (e) { return "9702510680@fam"; }
  }
  /* one clean line out of a paragraph, the cheat-sheet never copies a
     chapter, it compresses it */
  function firstSentence(txt, cap) {
    var t = String(txt || "").replace(/\s+/g, " ").trim();
    var m = t.match(/^(.{20,140}?[.!?])(\s|$)/);
    var out = m ? m[1] : t;
    if (out.length > cap) {
      out = out.slice(0, cap);
      var cut = out.lastIndexOf(" ");
      out = cut > cap * 0.6 ? out.slice(0, cut) : out;
      /* land on a clause boundary, not halfway through a parenthesis */
      var brk = Math.max(out.lastIndexOf(", "), out.lastIndexOf("; "), out.lastIndexOf(", "));
      if (brk > cap * 0.55) out = out.slice(0, brk);
      out = out.replace(/[,;:\-–-]$/, "") + "…";
    }
    return out;
  }
  function clip(txt, cap) {
    var t = String(txt || "").replace(/\s+/g, " ").trim();
    if (t.length <= cap) return t;
    var out = t.slice(0, cap);
    var cut = out.lastIndexOf(" ");
    return (cut > cap * 0.6 ? out.slice(0, cut) : out).replace(/[,;:\-–-]$/, "") + "…";
  }

  /* SVG <text> cannot wrap, so the diagram's boxes wrap their own labels */
  function wrapWords(txt, perLine, maxLines) {
    var words = String(txt || "").replace(/\s+/g, " ").trim().split(" ");
    var lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!cur) { cur = w; continue; }
      if ((cur + " " + w).length <= perLine) cur += " " + w;
      else { lines.push(cur); cur = w; }
      if (lines.length === maxLines) break;
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length + 1) {
      lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:!?]*$/, "") + "…";
    }
    return lines;
  }
  function svgLines(lines, x, y, size, fill, font, weight, gap) {
    return lines.map(function (ln, i) {
      return '<text x="' + x + '" y="' + (y + i * (gap || (size + 2))) + '" text-anchor="middle" font-size="' + size +
        '"' + (weight ? ' font-weight="' + weight + '"' : "") + ' fill="' + fill + '" font-family="' + font + '">' +
        esc(ln) + "</text>";
    }).join("");
  }
  function relatedBooks(b, n) {
    try {
      var all = window.BOOKS || [];
      var same = all.filter(function (x) { return x && x.id !== b.id && x.category === b.category; });
      if (same.length < n) same = same.concat(all.filter(function (x) { return x && x.id !== b.id && same.indexOf(x) < 0; }));
      return same.slice(0, n);
    } catch (e) { return []; }
  }

  /* ---------- sponsor line ---------- */
  function renderSponsor(b) {
    var el = $("sponsorLine"); if (!el || !b) return;
    var list = (window.TSB_SPONSORS && TSB_SPONSORS[b.id]) || [];
    if (!list.length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "💛 This breakdown was fuelled by <b>" + list.map(esc).join(", ") + "</b>";
  }

  /* ============================================================
     THE CHEAT SHEET, two pages, built to fit, never three
     ============================================================ */
  /* a heading with its colour chip as real markup, a ::before pseudo-element
     gets positioned unpredictably by print engines, and an orphaned chip in
     the margin is exactly the kind of thing that makes a sheet look sloppy */
  function h2(label, tight, tail) {
    return '<h2 class="cs2__h2' + (tight ? " cs2__h2--tight" : "") + '">' +
      '<span class="cs2__h2c"></span>' + label + (tail || "") + "</h2>";
  }
  function pageHead(b, n, pal) {
    return '<div class="cs2__head">' +
        '<span class="cs2__brand"><i></i>THESMALLBOOK</span>' +
        '<span class="cs2__cat" style="background:' + pal.a + ';color:' + (pal.ink === "#14110c" ? "#14110c" : "#fff") + '">' +
          esc(b.category || "Book") + "</span>" +
        '<span class="cs2__pg">' + n + " / 2</span>" +
      "</div>";
  }
  function pageFoot(b) {
    return '<div class="cs2__foot">' +
        '<span>' + esc(b.title) + " · " + esc(b.author || "") + "</span>" +
        '<span class="cs2__url">thesmallbook.in &nbsp;·&nbsp; cheat sheet, 2 pages</span>' +
      "</div>";
  }

  /* the map: the book's big idea over five numbered ideas, the plan beneath.
     Every label wraps and clips inside its own box, so nothing can overflow. */
  function ideaMap(b, pal, takes) {
    var colW = 94, x0 = 14, cy = 44;
    var nodes = takes.map(function (l, i) {
      var cx = x0 + i * colW + colW / 2;
      var short = String(l.title || ("Idea " + (i + 1)))
        .split(/\s+[-–]\s+/)[0]                 /* keep the headline, drop the subtitle */
        .replace(/^(The|A|An)\s+/i, "")
        .replace(/[:.]+$/, "");
      /* "Cue → Craving → Response → Reward" must not wrap to a dangling arrow */
      var chain = short.split(/\s*→\s*/);
      if (chain.length > 2) short = chain.slice(0, 2).join(" → ");
      var lines = wrapWords(short, 15, 2);
      var arrow = i < takes.length - 1
        ? '<path d="M' + (x0 + (i + 1) * colW - 15) + " " + cy + "h7" +
          'M' + (x0 + (i + 1) * colW - 11) + " " + (cy - 3.4) + "l3.6 3.4-3.6 3.4" +
          '" fill="none" stroke="' + pal.ink + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
        : "";
      return "<g>" +
        '<circle cx="' + cx + '" cy="' + cy + '" r="13.5" fill="' + pal.a + '" stroke="' + pal.ink + '" stroke-width="2.6"/>' +
        '<text x="' + cx + '" y="' + (cy + 4.2) + '" text-anchor="middle" font-size="12.5" font-weight="800" fill="' +
          pal.ink + '" font-family="Archivo Black, Arial Black, sans-serif">' + (i + 1) + "</text>" +
        arrow +
        svgLines(lines, cx, 72, 8.8, pal.ink, "Space Grotesk, Arial, sans-serif", 700, 10.6) +
      "</g>";
    }).join("");
    /* the viewBox is 512x92, close to 186mm wide by 33mm tall, the box the page
       gives it, so the art fills the column instead of letterboxing */
    return '<svg class="cs2__map" viewBox="0 0 512 92" role="img" aria-label="The five ideas in order">' +
      '<rect x="14" y="2" width="484" height="21" rx="10.5" fill="' + pal.a + '" stroke="' + pal.ink + '" stroke-width="2.6"/>' +
      '<text x="256" y="16.4" text-anchor="middle" font-size="10" font-weight="800" fill="' + pal.ink +
        '" font-family="Archivo Black, Arial Black, sans-serif">ALL FIVE SIT UNDER THE BIG IDEA, THE 5-STEP PLAN IS ON PAGE 2</text>' +
      nodes +
      "</svg>";
  }

  /* page two opens with the book's identity, so a loose sheet still says what it is */
  function pageIdBar(b) {
    return '<div class="cs2__idbar">' +
      (b.cover ? '<img class="cs2__idcov" src="' + esc(b.cover) + '" alt="">' : "") +
      "<span><b>" + esc(clip(b.title, 52)) + "</b>" +
      "<i>" + esc(b.author || "") + " \u00b7 the action page</i></span>" +
      "</div>";
  }

  function buildSheet(b, gold) {
    var pal = palette(b);
    var L = (b.lessons || []).filter(Boolean);
    var takes = L.slice(0, 5);
    var plan = (b.actionPlan || []).filter(Boolean).slice(0, 5);
    var quotes = (b.quotes || []).filter(Boolean);
    var openQuote = quotes[0] || "";
    var restAll = L.slice(5);
    /* A fixed cap keeps page one the same height for a 6-chapter book and a
       48-chapter one. The rest are counted ("+N more in the app"), never lost. */
    var REST_MAX = 6;
    var rest = restAll.slice(0, REST_MAX);
    var extra = Math.max(0, restAll.length - rest.length);   /* counted, not hidden */
    var lines = quotes.slice(1, 3);
    var next = relatedBooks(b, 3);

    var ladder = takes.map(function (l, i) {
      return '<li class="cs2__step">' +
          '<span class="cs2__num">' + (i + 1) + "</span>" +
          '<span class="cs2__stx"><b>' + esc(clip(l.title || ("Idea " + (i + 1)), 72)) + "</b>" +
            "<span>" + esc(firstSentence(l.summary, 104)) + "</span></span>" +
        "</li>";
    }).join("");

    var flow = plan.map(function (s, i) {
      return '<li class="cs2__do"><span class="cs2__donum">' + (i + 1) + "</span>" +
        "<span>" + esc(clip(s, 100)) + "</span></li>";
    }).join("");

    var restList = rest.map(function (l, i) {
      return "<li><span class=\"cs2__restn\">" + (i + 6) + "</span>" +
        "<span><b>" + esc(clip(l.title || "", 46)) + "</b>" +
        (l.chapter ? "<i>" + esc(clip(String(l.chapter).replace(/^Chapter\s*/i, "Ch "), 44)) + "</i>" : "") +
        "</span></li>";
    }).join("");

    return '<div class="cs2' + (gold ? " cs2--gold" : "") + '" style="--a:' + pal.a + ";--b:" + pal.b + ";--c:" + pal.c +
        ";--ink-x:" + pal.ink + ";--accent:" + pal.accent + '">' +

      /* ============================ PAGE ONE ============================ */
      '<section class="cs2__page"><div class="cs2__body">' +
        pageHead(b, 1, pal) +

        '<div class="cs2__hero">' +
          (b.cover
            ? '<img class="cs2__cover" src="' + esc(b.cover) + '" alt="' + esc(b.title) + ' cover">'
            : '<div class="cs2__cover cs2__cover--none">B</div>') +
          "<div>" +
            "<h1>" + esc(clip(b.title, 62)) + "</h1>" +
            '<div class="cs2__by">' + esc(b.author || "") + (b.year ? " \u00b7 " + esc(b.year) : "") + "</div>" +
            '<div class="cs2__chips">' +
              (L.length ? "<span><b>" + L.length + "</b> lessons</span>" : "") +
              (b.readTime ? "<span><b>" + esc(String(b.readTime).replace(/\s*read$/i, "")) + "</b> min</span>" : "") +
              (plan.length ? "<span><b>" + plan.length + "</b>-step plan</span>" : "") +
              (restAll.length ? "<span><b>+" + restAll.length + "</b> more inside</span>" : "") +
            "</div>" +
            (b.tagline ? '<div class="cs2__tag">' + esc(clip(b.tagline, 108)) + "</div>" : "") +
            (gold ? '<div class="cs2__gold">TSB GOLD \u00b7 NO CREDIT LINE</div>' : "") +
          "</div>" +
        "</div>" +

        '<div class="cs2__big">' +
          '<span class="cs2__biglbl">THE BIG IDEA</span>' +
          "<p>" + esc(firstSentence(b.bigIdea || b.oneLiner || "", 180)) + "</p>" +
        "</div>" +

        h2("The five that matter") +
        '<ol class="cs2__ladder">' + ladder + "</ol>" +

        h2("How they hold together", true) +
        ideaMap(b, pal, takes) +

        (rest.length
          ? h2("And the rest of the book", true,
              extra > 0 ? ' <span class="cs2__morenum">+' + extra + " more in the app</span>" : "") +
            '<ul class="cs2__rest">' + restList + "</ul>"
          : "") +
      "</div>" + pageFoot(b) + "</section>" +

      /* ============================ PAGE TWO ============================ */
      '<section class="cs2__page"><div class="cs2__body">' +
        pageHead(b, 2, pal) +
        pageIdBar(b) +

        (openQuote
          ? '<figure class="cs2__lead"><span class="cs2__leadq">\u275d</span>' +
            "<p>" + esc(clip(openQuote, 150)) + "</p>" +
            "<figcaption>\u2014 " + esc(b.author || "") + "</figcaption></figure>"
          : "") +

        h2("Do this, this week") +
        '<ol class="cs2__dos">' + flow + "</ol>" +

        '<div class="cs2__watch"><b>WHERE IT BREAKS</b><p>' +
          esc(clip(b.caveat || "No book fixes a system you never set up. Pick the first step and start it today.", 230)) +
        "</p></div>" +

        (lines.length
          ? h2("Lines that land", true) +
            '<div class="cs2__quotes">' + lines.map(function (q) {
              return "<blockquote>\u275d " + esc(clip(q, 130)) + "</blockquote>";
            }).join("") + "</div>"
          : "") +

        (next.length
          ? h2("If this one landed, read next", true) +
            '<div class="cs2__next">' + next.map(function (r) {
              return '<div class="cs2__nb">' +
                '<img src="' + esc(r.cover || "") + '" alt="">' +
                "<span><b>" + esc(clip(r.title, 40)) + "</b><i>" + esc(clip(r.author || "", 26)) + "</i></span>" +
              "</div>";
            }).join("") + "</div>"
          : "") +
      "</div>" + pageFoot(b) + "</section>" +
    "</div>";
  }

  function printSheet(html, onDone) {
    var host = $("tsbCheat");
    if (!host) {
      host = document.createElement("div");
      host.id = "tsbCheat";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
    }
    host.innerHTML = html;
    document.body.classList.add("tsb-printing");

    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      document.body.classList.remove("tsb-printing");
      window.removeEventListener("afterprint", done);
      if (host) host.innerHTML = "";
      if (onDone) onDone();
    }
    window.addEventListener("afterprint", done);

    /* the cover is the only network/disk hit, wait for it, or the sheet
       prints with an empty frame */
    var img = host.querySelector(".cs2__cover");
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var imgReady = (img && !img.complete)
      ? new Promise(function (res) { img.onload = res; img.onerror = res; })
      : Promise.resolve();
    Promise.all([fontsReady, imgReady]).then(function () {
      setTimeout(function () { window.print(); }, 120);
      setTimeout(done, 60000);            /* safety: never leave the page stuck */
    });
  }

  function genPdf() {
    var b = book();
    if (!b) { say("Open a book first, the cheat-sheet is built per book."); return; }
    var gold = isGold();
    if (!gold && pdfCount() >= FREE_PDF) {
      if (!window.confirm("Your " + FREE_PDF + " free cheat-sheets are used. Gold gives you unlimited, credit-free sheets. Open Gold?")) return;
      location.href = "gold.html";
      return;
    }
    if (!gold) { try { localStorage.setItem(STORE_KEY, String(pdfCount() + 1)); } catch (e) {} }
    updateQuota();
    say(gold ? "Building your Gold cheat-sheet…" : "Building your cheat-sheet, choose “Save as PDF” in the print sheet.");
    printSheet(buildSheet(b, gold));
  }

  function say(msg) {
    try { if (window.TSB_COMMUNITY && TSB_COMMUNITY.say) return TSB_COMMUNITY.say(msg); } catch (e) {}
    try {
      var t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:78px;z-index:10050;" +
        "background:#14110c;color:#fff6d6;font:700 12.5px/1.4 'Space Grotesk',Arial,sans-serif;padding:10px 14px;" +
        "border-radius:999px;border:2px solid #14110c;box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:88vw";
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 3600);
    } catch (e) {}
  }

  function updateQuota() {
    var gold = isGold();
    var txt, cls;
    if (gold) { txt = "Gold · unlimited sheets"; cls = "bookcta__q bookcta__q--gold"; }
    else { txt = Math.max(0, FREE_PDF - pdfCount()) + " of " + FREE_PDF + " free sheets left"; cls = "bookcta__q"; }
    all("[data-tsb-quota]").forEach(function (n) { n.textContent = txt; n.className = cls; });
  }

  /* ============================================================
     FUEL THIS BREAKDOWN, same design language as the rest of the app
     ============================================================ */
  function fuelFlow() {
    var b = book();
    if (!b) { say("Open a book first."); return; }
    var upi = upiId();
    var bTitle = b.title || "this book";

    var m = $("fuelModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "fuelModal";
      m.className = "fuelmodal";
      m.hidden = true;
      m.innerHTML =
        '<div class="fuelmodal__card" role="dialog" aria-modal="true" aria-labelledby="fuelTitle">' +
          '<div class="fuelmodal__top">' +
            '<span class="fuelmodal__badge">💛 FUEL THE LIBRARY</span>' +
            '<button class="fuelmodal__x" id="fuelX" type="button" aria-label="Close">✕</button>' +
          "</div>" +
          '<h2 id="fuelTitle">Put your name on this book</h2>' +
          '<p class="fuelmodal__book" id="fuelBookLine"></p>' +
          '<div class="fuelmodal__amts" role="group" aria-label="Amount">' +
            AMOUNTS.map(function (a, i) {
              return '<button type="button" data-amt="' + a + '"' + (i === 0 ? ' class="on"' : "") + ">₹" + a + "</button>";
            }).join("") +
          "</div>" +
          '<a class="fuelmodal__pay" id="fuelPay" href="#" rel="noopener">📲 PAY ₹199 VIA UPI</a>' +
          '<div class="fuelmodal__alt">Opens your UPI app with the amount filled in</div>' +
          '<div class="fuelmodal__upirow">' +
            '<span class="fuelmodal__upi" id="fuelUpi">' + esc(upi) + "</span>" +
            '<button class="fuelmodal__copy" id="fuelCopy" type="button">📋 Copy</button>' +
          "</div>" +
          '<a class="fuelmodal__wa" id="fuelWa" href="#" target="_blank" rel="noopener">💬 Or message us with your name</a>' +
          '<p class="fuelmodal__note">Names are added on the weekly update. Prefer to stay quiet? You can be “A reader”.</p>' +
        "</div>";
      document.body.appendChild(m);

      $("fuelX").onclick = function () { closeFuel(); };
      m.addEventListener("click", function (e) { if (e.target === m) closeFuel(); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !m.hidden) closeFuel();
      });
      /* amount picker drives the UPI link */
      all("#fuelModal [data-amt]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          all("#fuelModal [data-amt]").forEach(function (o) { o.classList.remove("on"); });
          btn.classList.add("on");
          paintFuel();
        });
      });
      $("fuelCopy").addEventListener("click", function () {
        var self = this;
        var done = function () { self.textContent = "✓ Copied"; setTimeout(function () { self.textContent = "📋 Copy"; }, 1800); };
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(upi).then(done, done);
          else done();
        } catch (e) { done(); }
      });
    }

    function amount() {
      var on = m.querySelector("#fuelModal [data-amt].on") || m.querySelector("[data-amt]");
      return on ? +on.getAttribute("data-amt") : 199;
    }
    function paintFuel() {
      var amt = amount();
      var pay = m.querySelector("#fuelPay");
      pay.href = "upi://pay?pa=" + encodeURIComponent(upi) + "&pn=" + encodeURIComponent("TheSmallBook") +
                 "&am=" + amt + "&cu=INR&tn=" + encodeURIComponent("Fuel-" + bTitle);
      pay.textContent = "📲 PAY ₹" + amt + " VIA UPI";
      var wa = "https://wa.me/919702510680?text=" + encodeURIComponent(
        "Hi Jash! I want to fuel the breakdown of \"" + bTitle + "\" on TheSmallBook (₹" + amt + "). " +
        "Please share the UPI QR / id. Show my name as: ");
      m.querySelector("#fuelWa").href = wa;
      m.querySelector("#fuelBookLine").innerHTML =
        'Your name lands right here: <b>“This breakdown was fuelled by <span class="fuelmodal__blank">your name</span>”</b> on ' +
        "<b>" + esc(bTitle) + "</b>.";
    }
    window.__tsbFuel = { amount: amount, paint: paintFuel, upi: upi };
    paintFuel();
    m.hidden = false;

    function closeFuel() {
      m.hidden = true;
      try { if (history.replaceState) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    }
  }

  function init() {
    var b = book();
    renderSponsor(b);
    all('[data-tsb="cheat"]').forEach(function (n) { n.addEventListener("click", genPdf); });
    all('[data-tsb="fuel"]').forEach(function (n) { n.addEventListener("click", fuelFlow); });
    updateQuota();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.TSB_BOOKTOOLS = { init: init, genPdf: genPdf, fuelFlow: fuelFlow, buildSheet: buildSheet, updateQuota: updateQuota };
})();
