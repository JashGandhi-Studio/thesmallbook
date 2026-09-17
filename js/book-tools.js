/* ============================================================
   THESMALLBOOK — BOOK TOOLS (book-tools.js) · v248
   Client-side helpers wired onto the book page:
     • 📄 Generate cheat-sheet  — printable one-pager of lessons+actions.
         First FREE_PDF generations are free; after that it's a Gold perk.
         Gold members get the premium, watermark-free version.
     • 💛 Fuel this breakdown  — sponsor flow (UPI/WhatsApp); founder adds
         the name to js/sponsors.js on the weekly update.
     • Renders "This breakdown was fuelled by {name}" from TSB_SPONSORS.
   Reads the current book from window.BOOKS via the ?id= param.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_BOOKTOOLS) return;

  var FREE_PDF = 3;                 // free generations before Gold is required
  var STORE_KEY = "tsb_pdf_free";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function book() {
    try {
      var id = new URLSearchParams(location.search).get("id");
      return (window.BOOKS || []).filter(function (b) { return b && b.id === id; })[0] || null;
    } catch (e) { return null; }
  }
  function pdfCount() { try { return +(localStorage.getItem(STORE_KEY) || 0); } catch (e) { return 0; } }
  function isGold() { try { return !!(window.TSB_GOLD && TSB_GOLD.isGold()); } catch (e) { return false; } }
  function upiId() {
    try { return (window.TSB_CONFIG && TSB_CONFIG.PAYWALL && TSB_CONFIG.PAYWALL.UPI_ID) || "9702510680@fam"; } catch (e) { return "9702510680@fam"; }
  }

  /* ---------- sponsor line ---------- */
  function renderSponsor(b) {
    var el = $("sponsorLine"); if (!el || !b) return;
    var list = (window.TSB_SPONSORS && TSB_SPONSORS[b.id]) || [];
    if (!list.length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "💛 This breakdown was fuelled by <b>" + list.map(esc).join(", ") + "</b>";
  }

  /* ---------- cheat-sheet ---------- */
  function buildSheet(b, gold) {
    var rows = "";
    (b.lessons || []).forEach(function (l, i) {
      rows += '<div class="cs-les">' +
        '<div class="cs-les__n">' + (i + 1) + '</div>' +
        '<div class="cs-les__b">' +
        "<h3>" + esc(l.title || ("Lesson " + (i + 1))) + "</h3>" +
        (l.summary ? "<p>" + esc(l.summary) + "</p>" : "") +
        (l.example ? '<p class="cs-ex"><b>Example:</b> ' + esc(l.example) + "</p>" : "") +
        (l.action ? '<p class="cs-act"><b>Do:</b> ' + esc(l.action) + "</p>" : "") +
        "</div></div>";
    });
    var plan = (b.actionPlan || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    return '' +
      '<div class="tsb-cheat' + (gold ? " tsb-cheat--gold" : "") + '">' +
      '<div class="cs-head">' +
        (b.cover ? '<img class="cs-cover" src="' + esc(b.cover) + '" alt="">' : '<div class="cs-mark">📕</div>') +
        "<div><h1>" + esc(b.title) + "</h1>" +
          "<div class=\"cs-by\">" + esc(b.author) + (b.year ? " · " + b.year : "") + "</div>" +
          (b.oneLiner ? "<div class=\"cs-one\">" + esc(b.oneLiner) + "</div>" : "") +
          (b.bigIdea ? "<div class=\"cs-big\">💡 " + esc(b.bigIdea) + "</div>" : "") +
          "</div>" +
          '<div class="cs-flag">' + (gold ? "PREMIUM · TSB GOLD" : "TheSmallBook") + "</div>" +
        "</div>" +
        '<div class="cs-body">' + rows + "</div>" +
        (plan ? '<div class="cs-plan"><h2>✅ Action plan</h2><ol>' + plan + "</ol></div>" : "") +
        '<div class="cs-foot">Free breakdown · thesmallbook.in · ' + (b.lessons ? b.lessons.length : 0) + " lessons</div>" +
      "</div>";
  }

  function genPdf() {
    var b = book(); if (!b) return;
    var gold = isGold();
    if (!gold && pdfCount() >= FREE_PDF) {
      // require Gold
      if (!confirm("Your " + FREE_PDF + " free cheat-sheets are used. Go Gold for unlimited, premium, watermark-free sheets?")) return;
      location.href = "gold.html";
      return;
    }
    if (!gold) localStorage.setItem(STORE_KEY, String(pdfCount() + 1));
    var host = $("tsbCheat");
    if (!host) { host = document.createElement("div"); host.id = "tsbCheat"; document.body.appendChild(host); }
    host.innerHTML = buildSheet(b, gold);
    document.body.classList.add("tsb-printing");
    var done = function () {
      document.body.classList.remove("tsb-printing");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    setTimeout(function () { window.print(); }, 60);
    updateQuota();
  }

  function updateQuota() {
    var q = $("pdfQuota"); if (!q) return;
    if (isGold()) { q.textContent = "Gold · unlimited"; q.className = "pdfbar__q pdfbar__q--gold"; return; }
    var left = Math.max(0, FREE_PDF - pdfCount());
    q.textContent = left + " free left";
    q.className = "pdfbar__q";
  }

  /* ---------- fuel modal ---------- */
  function fuelFlow() {
    var b = book(); if (!b) return;
    var upi = upiId();
    var wa = "https://wa.me/919702510680?text=" + encodeURIComponent(
      "Hi Jash! I want to fuel the breakdown of \"" + b.title + "\" on TheSmallBook. Please share the UPI QR / id to pay (from ₹199). I'd like my name shown as: "
    );
    var m = $("fuelModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "fuelModal"; m.className = "fuelmodal";
      m.innerHTML =
        '<div class="fuelmodal__card">' +
          '<button class="fuelmodal__x" id="fuelX" aria-label="Close">✕</button>' +
          '<div class="fuelmodal__badge">💛 FUEL THE LIBRARY</div>' +
          "<h2>Put your name on this book</h2>" +
          '<p class="fuelmodal__sub">Pay what you can (from ₹199) to fuel curation. Your name appears here: <b>"This breakdown was fuelled by {you}".</b></p>' +
          '<a class="fuelmodal__pay" id="fuelPay" href="#">📲 PAY VIA UPI</a>' +
          '<div class="fuelmodal__alt">Opens UPI with ₹199 pre-filled · <button id="fuelCopy" class="linkbtn">📋 copy UPI</button></div>' +
          '<a class="fuelmodal__wa" id="fuelWa" href="#" target="_blank" rel="noopener">💬 Or message us on WhatsApp with your name</a>' +
          '<p class="fuelmodal__note">After paying, send us the book + your name. We add it on the next weekly update. You can stay anonymous as “A reader”.</p>' +
        "</div>";
      document.body.appendChild(m);
      $("fuelX").onclick = function () { m.hidden = true; };
      m.addEventListener("click", function (e) { if (e.target === m) m.hidden = true; });
    }
    m.querySelector("#fuelPay").href = "upi://pay?pa=" + encodeURIComponent(upi) + "&pn=TheSmallBook&am=199&cu=INR&tn=Fuel-" + encodeURIComponent(b.title);
    m.querySelector("#fuelWa").href = wa;
    m.querySelector("#fuelCopy").onclick = function () {
      try { navigator.clipboard.writeText(upi); this.textContent = "✓ copied"; } catch (e) {}
    };
    m.hidden = false;
  }

  function init() {
    var b = book();
    renderSponsor(b);
    var gen = $("genPdf"); if (gen) gen.onclick = genPdf;
    var fuel = $("fuelBook"); if (fuel) fuel.onclick = fuelFlow;
    updateQuota();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.TSB_BOOKTOOLS = { init: init, genPdf: genPdf, fuelFlow: fuelFlow };
})();
