/* ==========================================================================
   PIP UI  ·  v379
   --------------------------------------------------------------------------
   The face on the memory. Three surfaces, nothing else:

     1. Today      Pip says the one true line about this reader
     2. Chapter end  Pip asks one question, the answer becomes a note
     3. You        Pip's shelf, the memory you can see, and a way to erase it

   Everything here is quiet on purpose. No confetti, no badge, no toast. If Pip
   has nothing true to say, this file draws nothing at all.
   ========================================================================== */
(function () {
  "use strict";
  if (window.TSB_PIP_UI && window.TSB_PIP_UI.v === "380") return;
  var P = null;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  function el(sel, root) { return (root || document).querySelector(sel); }
  function uid() {
    try { var u = window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user(); return (u && u.id) || "guest"; } catch (e) { return "guest"; }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function path() { return (location.pathname.split("/").pop() || "index.html").toLowerCase(); }
  function jget(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* the mark, drawn once, reused everywhere so there is never a second Pip */
  /* v382: the face was a square frame with eyes inside it, which read as a
     broken image tile next to the wordmark. It is a head now, drawn once, and
     every place Pip speaks uses this same one. */
  var PIP_MARK = '<svg class="pipface" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<circle cx="32" cy="32" r="27" fill="currentColor"/>' +
    '<circle cx="23.5" cy="27" r="4.8" fill="var(--paper,#FFFDF7)"/>' +
    '<circle cx="40.5" cy="27" r="4.8" fill="var(--paper,#FFFDF7)"/>' +
    '<path d="M23 39.5c4.8 4.4 13.2 4.4 18 0" fill="none" stroke="var(--paper,#FFFDF7)" stroke-width="3.4" stroke-linecap="round"/>' +
    '</svg>';

  /* ------------------------------------------------------------ 1. TODAY */
  function mountToday() {
    /* v404: the owner removed the Today Pip line. Pip still asks at the end
       of a chapter and keeps the You shelf, but it no longer puts a line
       above the daily book on any device. */
    return;
    if (path() !== "index.html" && path() !== "") return;
    var line = P.say("today");
    if (!line) return;
    /* the Today film owns the visible column; #grid is a hidden legacy shelf,
       so the line has to land where the reader is actually looking */
    var host = el("#filmToday") || el(".fv-today") || el("main#grid") || el("main") || document.body;
    if (!host || el("#pipLine")) return;
    var card = document.createElement("section");
    card.id = "pipLine";
    card.className = "pip-line";
    card.setAttribute("aria-live", "polite");
    card.innerHTML = '<span class="pip-line__face">' + PIP_MARK + "</span>" +
      '<p class="pip-line__t">' + esc(line.text) + "</p>";
    host.insertBefore(card, host.firstChild);
    P.log({ k: "said", tag: line.tag });
  }

  /* ------------------------------------------------------- 2. CHAPTER END */
  function askHere(bookId, title) {
    if (!P.ask("chapter")) return;
    if (el("#pipAsk")) return;
    var kind = P.pickKind(bookId);
    var q = P.questionFor(kind);
    var wrap = document.createElement("div");
    wrap.id = "pipAsk";
    wrap.className = "pip-ask";
    wrap.innerHTML =
      '<div class="pip-ask__sheet" role="dialog" aria-modal="false" aria-label="One question from Pip">' +
        '<div class="pip-ask__top"><span class="pip-ask__face">' + PIP_MARK + "</span>" +
          '<p class="pip-ask__q">' + esc(q) + "</p></div>" +
        '<textarea id="pipAskText" rows="3" placeholder="One sentence is enough"></textarea>' +
        '<div class="pip-ask__row">' +
          '<button type="button" class="pip-ask__skip" id="pipAskSkip">Not now</button>' +
          '<button type="button" class="pip-ask__save" id="pipAskSave" disabled>Keep it</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("on"); });
    /* one question a day, counted the moment it is shown, not when answered */
    try { if (P.questionShown) P.questionShown(); } catch (e) {}

    var ta = el("#pipAskText"), save = el("#pipAskSave"), skip = el("#pipAskSkip");
    ta.addEventListener("input", function () { save.disabled = !ta.value.trim(); });
    function close() {
      wrap.classList.remove("on");
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 260);
    }
    skip.addEventListener("click", function () {
      var st = JSON.parse(localStorage.getItem("tsb_pip_state") || "{}");
      st.skip = st.skip || {};
      st.skip[bookId || "any"] = (st.skip[bookId || "any"] || 0) + 1;
      st.asked = st.asked || {};
      st.asked.answered = true;
      st.asked.pending = false;
      localStorage.setItem("tsb_pip_state", JSON.stringify(st));
      P.log({ k: "skip", book: bookId });
      close();
    });
    save.addEventListener("click", function () {
      var text = ta.value.trim();
      if (!text) return;
      var floor = P.floorFor(text);
      var key = "tsb_notes_v1_" + uid();
      var list = jget(key, []);
      if (!Array.isArray(list)) list = [];
      list.push({ id: "pip-" + Date.now(), pip: true, q: q, text: text, book: bookId || "", title: title || "", at: Date.now(), created: new Date().toISOString() });
      jset(key, list);
      var st = JSON.parse(localStorage.getItem("tsb_pip_state") || "{}");
      st.asked = st.asked || {};
      st.asked.answered = true;
      st.asked.pending = false;
      localStorage.setItem("tsb_pip_state", JSON.stringify(st));
      P.log({ k: "answered", book: bookId, kind: kind });
      close();
      if (floor) floorSheet(floor);
      else little("Kept in your notes.");
    });
  }

  /* the floor under the floor: a real person, right now */
  function floorSheet(f) {
    var w = document.createElement("div");
    w.className = "pip-floor";
    w.innerHTML = '<div class="pip-floor__sheet"><p>' + esc(f.text) + "</p>" +
      f.help.map(function (h) { return '<a href="' + esc(h.href) + '">' + esc(h.label) + "</a>"; }).join("") +
      '<button type="button" id="pipFloorOk">Okay</button></div>';
    document.body.appendChild(w);
    el("#pipFloorOk").addEventListener("click", function () { w.remove(); });
  }
  function little(msg) {
    var t = document.createElement("div");
    t.className = "pip-little";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("on"); });
    setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }

  /* the reader tells Pip when a chapter is finished */
  function wireReader() {
    if (path() !== "reader.html") return;
    var id = new URLSearchParams(location.search).get("id") || "";
    var b = null;
    try { b = (window.BOOKS || []).filter(function (x) { return x.id === id; })[0] || null; } catch (e) {}
    P.log({ k: "open", book: id, title: b ? b.title : id });

    /* v391: the question sheet is gone from the reader for good. It opened as
       a fixed sheet covering the whole screen with pointer events on, so on a
       phone it ate every scroll and every tap on Next. A reader who cannot
       scroll and cannot turn the page does not think "a prompt appeared", they
       think the app is broken, and they are right. The reader now records the
       chapter and leaves the screen alone. The question still exists on Today;
       it has no business interrupting a chapter. */
    document.addEventListener("click", function (ev) {
      var n = ev.target.closest ? ev.target.closest(".frd-next, [data-next], #rmNext, .rm-next") : null;
      if (!n) return;
      P.log({ k: "chapter", book: id, title: b ? b.title : id });
    }, true);

    /* a saved line is a moment worth noticing */
    var before = Object.keys(jget("tsb_highlights_v1", {}) || {}).length;
    setInterval(function () {
      var now = Object.keys(jget("tsb_highlights_v1", {}) || {}).length;
      if (now > before) { P.log({ k: "keep", book: id }); before = now; }
    }, 4000);
  }

  /* ------------------------------------------------------------- 3. SHELF */
  function mountShelf() {
    if (path() !== "you.html") return;
    var host = el("#filmYou") || el("main") || document.body;
    if (!host || el("#pipShelf")) return;
    var s = P.shelf();
    if (!s.books.length && !s.answers.length) return;
    var spines = s.books.slice(-24).map(function (b) {
      return '<span class="pip-spine" title="' + esc(b.title) + '"><i></i><em>' + esc(b.title) + "</em></span>";
    }).join("");
    var answers = s.answers.slice(-4).reverse().map(function (a) {
      return '<li><b>' + esc(a.q || "You wrote") + "</b><span>" + esc(String(a.text).slice(0, 120)) + "</span></li>";
    }).join("");
    var card = document.createElement("section");
    card.id = "pipShelf";
    card.className = "pip-shelf";
    card.innerHTML = '<div class="pip-shelf__head">' + PIP_MARK + "<h2>Pip's shelf</h2>" +
      '<button type="button" id="pipForget">Forget all of it</button></div>' +
      (spines ? '<div class="pip-shelf__spines">' + spines + "</div>" : "") +
      (answers ? '<ul class="pip-shelf__notes">' + answers + "</ul>" : "") +
      '<p class="pip-shelf__foot">' + (s.books.length ? s.books.length + (s.books.length === 1 ? " book finished." : " books finished.") : "No finished book yet.") +
      (s.streak ? " " + s.streak + " day streak." : "") + "</p>";
    host.insertBefore(card, host.firstChild);
    var forget = el("#pipForget");
    if (forget) forget.addEventListener("click", function () {
      P.clear();
      card.remove();
      little("Pip forgot everything.");
    });
  }


  /* ------------------------------------------------------- 4. THE WHOLE OS
     Pip is not the only thing that reads this memory. The app's own shelves
     read it too: what was opened, what was played, what was searched. One
     listener on every page means a book tapped anywhere is remembered, so the
     feed, the shelf and Pip are looking at the same truth instead of three
     different guesses. No new tracking, no network, nothing per page. */
  function wireOS() {
    document.addEventListener("click", function (ev) {
      var a = ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var m = href.match(/reader\.html\?id=([a-z0-9-]+)/i) || href.match(/book\.html\?id=([a-z0-9-]+)/i) || href.match(/book=([a-z0-9-]+)/i);
      if (m && m[1]) {
        var b = null;
        try { b = (window.BOOKS || []).filter(function (x) { return x.id === m[1]; })[0] || null; } catch (e) {}
        P.log({ k: "open", book: m[1], title: b ? b.title : m[1] });
      }
    }, true);
    /* a podcast that actually starts is the strongest signal Listen has */
    document.addEventListener("play", function (ev) {
      var t = ev.target;
      if (!t || t.tagName !== "AUDIO") return;
      var src = String(t.currentSrc || t.src || "").slice(0, 120);
      P.log({ k: "listen", src: src, at: Date.now() });
    }, true);
  }

  ready(function () {
    P = window.TSB_PIP_MIND;
    if (!P) return;
    try { mountToday(); } catch (e) {}
    try { wireReader(); } catch (e) {}
    try { wireOS(); } catch (e) {}
    /* the shelf is drawn by another script too, so try once more after it runs */
  });

  window.TSB_PIP_UI = { v: "379", askHere: askHere };
})();
