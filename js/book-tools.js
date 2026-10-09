/* ============================================================
   THESMALLBOOK - BOOK TOOLS (book-tools.js) · v317
   Two things live on the book page, and both were rebuilt this release:

   • 📄 GET CHEAT-SHEET - v317: a deliverable that earns its desk space.
     PAGE ONE reads like a friend's neat notes, not a dashboard: the whole
     book under one A4 page, handwriting-set (Patrick Hand + Caveat, both
     bundled locally), seven numbered takeaways around the real cover, the
     big idea and the book's own line up top, one action for the week, and
     nothing that can spill to a second sheet. PAGE TWO is the raw notes
     page: today's question about THIS book (seeded, changes daily) as the
     title, date and name lines, and clean ruled space to write to
     yourself. Branding stays a whisper in the bottom-right corner.

   • 💛 FUEL THIS BREAKDOWN - the sponsor sheet, rebuilt in the app's own
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
  /* v317: THE WEEKEND SHEET PACK - the store promises it, the engine honors
     it: every Saturday and Sunday the free allowance is FREE_PDF + 2.
     A real limited-time offer, not a countdown costume. */
  function weekendBonus() { var d = new Date().getDay(); return (d === 0 || d === 6) ? 2 : 0; }
  function allowance() { return FREE_PDF + weekendBonus(); }
  function isGold() { try { return !!(window.TSB_GOLD && TSB_GOLD.isGold()); } catch (e) { return false; } }
  function upiId() {
    try { return (window.TSB_CONFIG && TSB_CONFIG.PAYWALL && TSB_CONFIG.PAYWALL.UPI_ID) || "9702510680@fam"; }
    catch (e) { return "9702510680@fam"; }
  }
  /* one clean line out of a paragraph - the cheat-sheet never copies a
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
      var brk = Math.max(out.lastIndexOf(", "), out.lastIndexOf("; "), out.lastIndexOf(" - "));
      if (brk > cap * 0.55) out = out.slice(0, brk);
      out = out.replace(/[,;:\u2014-]$/, "") + "…";
    }
    return out;
  }
  function clip(txt, cap) {
    var t = String(txt || "").replace(/\s+/g, " ").trim();
    if (t.length <= cap) return t;
    var out = t.slice(0, cap);
    var cut = out.lastIndexOf(" ");
    return (cut > cap * 0.6 ? out.slice(0, cut) : out).replace(/[,;:\u2014-]$/, "") + "…";
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
     THE CHEAT SHEET v317 - page one: the whole book, handwritten.
     page two: raw notes. Caps everywhere so one sheet stays one.
     ============================================================ */
  /* today's question for this book - deterministic, changes daily */
  function bhash(s) {
    var h = 5381, i;
    for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  var QUESTIONS = {
    "general": [
      "After {title}: which chapter felt like it was written about you - and what did it name that you never said out loud?",
      "If you had to bet one habit of yours that {title} would kill first, which one - and what replaces it this week?",
      "What did {title} say that you instantly wanted to argue with? Argue it here - you keep what you defend.",
      "One year from now, what would the you who actually applied {title} be doing differently every morning?",
      "Which line of {title} is really a mirror? Write it, then write what it shows.",
      "What is the smallest, almost-stupid step {title} points at - and what has stopped you from taking it so far?"
    ],
    "Money & Finance": [
      "{title} in one line: money behaves, or you don't. Which of your money habits is really a mood wearing a costume?",
      "What would future-you thank present-you for buying LESS of, starting this week - and what does {title} say about why you still buy it?"
    ],
    "Self-Improvement": [
      "{title} wants one habit from you, not ten. Which one are you quietly avoiding - and what will you tell yourself tonight if you skip it again?",
      "Where exactly did you quit last time, and what would {title} say was really happening at that exact moment?"
    ],
    "Power & Strategy": [
      "Who around you is playing the game {title} describes - and what is one move you have been too polite to make?",
      "What does {title} call strategy that you have been calling bad luck?"
    ],
    "Psychology & People": [
      "Think of one person you keep misunderstanding. What would {title} say you are actually reading wrong in them?",
      "Which of your reactions this week was really an old script - and what would {title} rewrite it to?"
    ],
    "Business & Startups": [
      "What is the one assumption your plan stands on that {title} would poke first - and how would you test it for under ₹500?",
      "If {title} audited your week, which hour would it call theatre - looking busy instead of getting customers?"
    ],
    "Productivity": [
      "What did you say yes to this week that {title} would have you say no to - and what did that yes cost the thing you actually care about?",
      "Which system, not intention, failed you this week - and what does {title} say a working system looks like?"
    ],
    "Creativity": [
      "What would you make today if nobody ever saw it? {title} has an opinion - write yours against it.",
      "Where did you last stop yourself from making the thing, and what would {title} call that voice?"
    ],
    "History": [
      "Which decision in your life right now rhymes with a story {title} tells - and how does that story end for the people who ignored it?",
      "What did the losers in {title} all have in common - and which of those do you still carry?"
    ]
  };
  function questionFor(b) {
    var bank = (QUESTIONS[b && b.category] || []).concat(QUESTIONS.general);
    var q = bank[bhash((b && b.id) + "|" + todayKey()) % bank.length];
    return q.replace(/\{title\}/g, b && b.title ? b.title : "this book");
  }
  /* seven real takeaways: lessons first, the action plan fills the gaps.
     Nothing invented - every line is compressed out of the book's own data. */
  function takeaways(b) {
    var out = [];
    var L = (b.lessons || []).filter(Boolean);
    for (var i = 0; i < L.length && out.length < 7; i++) {
      /* v321: the third block - the book's own story/example, so the page
         reads full the way the reference sheet does */
      out.push({ t: cleanHead(L[i].title || "Idea " + (out.length + 1)), d: firstSentence(L[i].summary || "", 265), x: clip(L[i].example || "", 105) });
    }
    var P = (b.actionPlan || []).filter(Boolean);
    for (var j = 0; j < P.length && out.length < 7; j++) {
      out.push({ t: "Do this", d: clip(P[j], 250) });
    }
    return out;
  }
  function cleanHead(t) {
    var s = String(t || "").replace(/^(chapter|lesson|part|section)\s*\d+\s*[:.\-]\s*/i, "").replace(/\s+/g, " ").trim();
    s = s.split(/\s+[--]\s+/)[0].replace(/[:.]+$/, "");
    return clip(s, 56);
  }
  function cs3Head(b, label, pal) {
    return '<div class="cs3-bar">' + esc(clip(((b.title || "") + " - " + (b.author || "")).toUpperCase(), 64)) +
      '<span class="cs3-bar__tag" style="background:' + pal.a + '">' + esc(label) + "</span></div>";
  }
  function cs3Foot() {
    return '<div class="cs3-foot"><span class="cs3-foot__by">notes by: <i></i></span>' +
      '<span class="cs3-foot__brand">THE SMALL BOOK <b>·</b> thesmallbook.in <i>· for your personal study - please buy the book</i></span></div>';
  }
  function buildSheet(b, gold) {
    var pal = palette(b);
    var takes = takeaways(b);
    /* v318: the reference layout - the book sits IN THE CENTER, lessons
       flank it left and right, the week's action anchors the bottom-left.
       Three packed columns, almost no white space. */
    var left = takes.slice(0, 3), right = takes.slice(3, 7);
    var caveat = b.caveat || "";
    var plan = (b.actionPlan || []).filter(Boolean);
    var quotes = (b.quotes || []).filter(Boolean);
    var openQuote = quotes[0] || "";
    var q = questionFor(b);
    var more = Math.max(0, ((b.lessons || []).filter(Boolean)).length - Math.min(7, (b.lessons || []).filter(Boolean).length));
    var keyLabel = takes.length + " KEY TAKEAWAYS";

    function take(t, i) {
      return '<div class="cs3-take"><span class="cs3-num">' + (i + 1) + "</span>" +
        "<span><b>" + esc(t.t) + "</b><p>" + esc(t.d) + "</p>" +
        (t.x ? '<em class="cs3-take__ex"><u>from the book:</u> ' + esc(t.x) + "</em>" : "") + "</span></div>";
    }
    var leftHtml = left.map(function (t, i) { return take(t, i); }).join("");
    var rightHtml = right.map(function (t, i) { return take(t, i + 3); }).join("");   /* left carries 1-3, right carries 4-7 */
    var weekHtml = "";
    if (plan.length) {
      weekHtml = '<div class="cs3-week"><b>START THIS WEEK</b><span class="cs3-week__do"><i class="cs3-week__box"></i>' +
        esc(clip(plan[0], 240)) + "</span>" +
        (more > 0 ? '<span class="cs3-week__more">+' + more + " more lessons inside the app</span>" : "") + "</div>";
    }
    /* v318: the bottom band - one full-width row, two cards, zero air */
    var bottomHtml = "";
    if (plan.length || caveat) {
      bottomHtml = '<div class="cs3-bottom">' +
        (plan.length ? '<div class="cs3-week cs3-week--band">' + weekHtml.replace(/^<div class="cs3-week">/, "").replace(/<\/div>$/, "") + "</div>" : "") +
        (caveat ? '<div class="cs3-bite"><b>WHERE THE BOOK BITES</b><p>' + esc(clip(caveat, 330)) + "</p></div>" : "") +
        "</div>";
    }

    return '<div class="cs2 cs3' + (gold ? " cs2--gold" : "") + '" style="--a:' + pal.a + ";--b:" + pal.b + ";--c:" + pal.c +
        ";--ink-x:" + pal.ink + ";--accent:" + pal.accent + '">' +

      /* ============================ PAGE ONE ============================ */
      '<section class="cs2__page"><div class="cs3__body">' +
        cs3Head(b, gold ? "GOLD SHEET" : "CHEAT SHEET", pal) +

        '<div class="cs3-top">' +
          '<div class="cs3-intro"><b>What this book reveals</b><p>' + esc(clip(b.bigIdea || b.oneLiner || b.tagline || "", 480)) + "</p></div>" +
          (openQuote
            ? '<div class="cs3-quote"><p>\u201c' + esc(clip(openQuote, 260)) + '\u201d</p><span>- ' + esc(b.author || "the author") + "</span></div>"
            : '<div class="cs3-quote cs3-quote--solo"><p>' + esc(clip(b.tagline || "", 150)) + "</p></div>") +
        "</div>" +

        '<div class="cs3-grid">' +
          '<div class="cs3-col">' + leftHtml + "</div>" +
          '<div class="cs3-midcol">' +
            '<span class="cs3-key">' + esc(keyLabel) + "</span>" +
            (b.cover
              ? '<img class="cs3-cover" src="' + esc(b.cover) + '" alt="' + esc(b.title) + ' cover">'
              : '<div class="cs3-cover cs3-cover--none">B</div>') +
            '<span class="cs3-chips">' + esc(b.category || "") + (b.readTime ? '<i>' + esc(String(b.readTime).replace(/\s*min(\s*read)?$/i, "") + " min read") + "</i>" : "") + "</span>" +
          "</div>" +
          '<div class="cs3-col">' + rightHtml + "</div>" +
        "</div>" +
        bottomHtml +

        cs3Foot() +
      "</div></section>" +

      /* ============================ PAGE TWO: RAW NOTES ============================ */
      '<section class="cs2__page"><div class="cs3__body cs3__body--notes">' +
        cs3Head(b, "RAW NOTES", pal) +
        '<div class="cs3-qday"><span>QUESTION OF THE DAY · ' + todayKey() + '</span><h2>' + esc(q) + "</h2></div>" +
        '<div class="cs3-meta"><span>my name: <i></i></span><span>date: <i></i></span></div>' +
        '<div class="cs3-lines" aria-hidden="true"></div>' +
        '<p class="cs3-prompt">Write like you are the only reader. The question on top is just a door - walk through it in your own words.</p>' +
        cs3Foot() +
      "</div></section>" +
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

    /* the cover is the only network/disk hit - wait for it, or the sheet
       prints with an empty frame */
    var img = host.querySelector(".cs3-cover");
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
    if (!b) { say("Open a book first - the cheat-sheet is built per book."); return; }
    var gold = isGold();
    if (!gold && pdfCount() >= allowance()) {
      var msg = weekendBonus()
        ? "Your " + allowance() + " free sheets (weekend bonus included) are used. Gold gives you unlimited, credit-free sheets. Open Gold?"
        : "Your " + FREE_PDF + " free cheat-sheets are used. Tip: every weekend the app adds 2 bonus sheets for everyone. Or Gold gives unlimited, credit-free sheets. Open Gold?";
      if (!window.confirm(msg)) return;
      location.href = "gold.html";
      return;
    }
    if (!gold) { try { localStorage.setItem(STORE_KEY, String(pdfCount() + 1)); } catch (e) {} }
    updateQuota();
    say(gold ? "Building your Gold cheat-sheet…" : "Building your cheat-sheet - choose “Save as PDF” in the print sheet.");
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
    else if (weekendBonus()) { txt = Math.max(0, allowance() - pdfCount()) + " free sheets left (weekend bonus on)"; cls = "bookcta__q bookcta__q--gold"; }
    else { txt = Math.max(0, allowance() - pdfCount()) + " of " + allowance() + " free sheets left"; cls = "bookcta__q"; }
    all("[data-tsb-quota]").forEach(function (n) { n.textContent = txt; n.className = cls; });
  }

  /* ============================================================
     FUEL THIS BREAKDOWN - same design language as the rest of the app
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
