/* ============================================================
   THESMALLBOOK — 💬 CHAT PAGE (chat.js)
   Full-screen chat UI on top of TSB_ASK_CORE.

   Same brain as the old Ask popup (identical topic matching and
   sources) — new presentation: bubbles, typing indicator,
   suggestion chips, persisted history.
   ============================================================ */
(function () {
  "use strict";

  var log     = document.getElementById("chatLog");
  var form    = document.getElementById("chatForm");
  var input   = document.getElementById("chatInput");
  var sendBtn = document.getElementById("chatSend");
  var sugWrap = document.getElementById("chatSuggest");
  var newBtn  = document.getElementById("chatNew");
  var libBtn  = document.getElementById("chatLib");
  var sub     = document.getElementById("chatSub");
  if (!log || !form) return;

  var HISTORY_KEY = "tsb_chat_history";
  var MAX_TURNS = 40;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function lsGet(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }
    catch (e) { return d; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/>' +
    '<path d="M8 7h9v9"/></svg>';

  function scrollDown(smooth) {
    requestAnimationFrame(function () {
      log.scrollTo({ top: log.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }

  /* ---------- rendering ---------- */
  function elMsg(who, inner) {
    var d = document.createElement("div");
    d.className = "chat-msg chat-msg--" + who;
    d.innerHTML =
      '<span class="chat-av">' + (who === "me" ? "\uD83D\uDE42" : "\uD83D\uDCD5") + "</span>" +
      '<div class="chat-bubble">' + inner + "</div>";
    return d;
  }

  function srcHtml(s) {
    var media = s.type === "grave"
      ? '<span class="chat-src__ico">\uD83D\uDC80</span>'
      : (s.cover
          ? '<img class="chat-src__cover" src="' + esc(s.cover) + '" alt="" loading="lazy" width="38" height="54">'
          : '<span class="chat-src__ico">\uD83D\uDCD5</span>');
    return '<a class="chat-src' + (s.type === "grave" ? " chat-src--grave" : "") + '" href="' + esc(s.href) + '">' +
      media +
      '<span class="chat-src__txt">' +
        '<span class="chat-src__book">' + (s.type === "grave" ? "AUTOPSY" : esc(s.title)) + "</span>" +
        (s.type === "grave"
          ? '<span class="chat-src__lesson">' + esc(s.title) + "</span>"
          : (s.lesson ? '<span class="chat-src__lesson">' + esc(s.lesson) + "</span>" : "")) +
        '<span class="chat-src__blurb">' + esc(s.blurb) + "</span>" +
      "</span>" +
      '<span class="chat-src__go">' + ARROW + "</span></a>";
  }

  function answerHtml(res) {
    var h = "";
    if (res.kind === "topic") h += '<span class="chat-answer__tag">The answer</span>';
    else if (res.kind === "matches") h += '<span class="chat-answer__tag">Closest matches</span>';
    h += "<div>" + esc(res.answer) + "</div>";
    if (res.sources && res.sources.length) {
      h += '<div class="chat-srcs">' + res.sources.map(srcHtml).join("") + "</div>";
    }
    return h;
  }

  function typing() {
    var d = document.createElement("div");
    d.className = "chat-msg chat-msg--bot";
    d.innerHTML = '<span class="chat-av">\uD83D\uDCD5</span>' +
      '<div class="chat-bubble"><div class="chat-typing"><i></i><i></i><i></i></div></div>';
    log.appendChild(d);
    scrollDown(true);
    return function () { if (d.parentNode) d.parentNode.removeChild(d); };
  }

  /* ---------- history ---------- */
  function history() { return lsGet(HISTORY_KEY, []); }
  function remember(turn) {
    var h = history();
    h.push(turn);
    if (h.length > MAX_TURNS) h = h.slice(-MAX_TURNS);
    lsSet(HISTORY_KEY, h);
  }

  function welcome() {
    var nb = (window.BOOKS || []).length;
    var ng = (window.FAILURES || []).length;
    var d = document.createElement("div");
    d.className = "chat-hello";
    d.innerHTML =
      '<div class="chat-hello__mark">\uD83D\uDCD5</div>' +
      "<h2>Ask the library</h2>" +
      "<p>Any question \u2014 money, focus, fear, starting up. Answered from " +
      nb + " books and " + ng + " real-world autopsies, with the exact lesson to read next.</p>" +
      '<button class="pf-btn pf-btn--ghost" id="chatBrowse" style="max-width:280px;margin:20px auto 0">' +
      "\uD83D\uDCDA Browse the question library</button>";
    log.appendChild(d);
    var br = d.querySelector("#chatBrowse");
    if (br) br.addEventListener("click", openLibrary);
  }

  function restore() {
    var h = history();
    if (!h.length) { welcome(); return; }
    h.forEach(function (turn) {
      log.appendChild(elMsg("me", esc(turn.q)));
      log.appendChild(elMsg("bot", answerHtml(turn.res)));
    });
    scrollDown(false);
  }

  /* ---------- suggestions ---------- */
  function renderSuggestions(list) {
    if (!sugWrap) return;
    if (!list || !list.length) { sugWrap.hidden = true; return; }
    sugWrap.innerHTML = "";
    list.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", function () { ask(q); });
      sugWrap.appendChild(b);
    });
    sugWrap.hidden = false;
  }

  /* ---------- the ask cycle ---------- */
  var busy = false;
  function ask(q) {
    q = String(q || "").trim();
    if (!q || busy) return;
    busy = true;
    sendBtn.disabled = true;

    var hello = log.querySelector(".chat-hello");
    if (hello) hello.remove();

    log.appendChild(elMsg("me", esc(q)));
    input.value = "";
    if (sugWrap) sugWrap.hidden = true;
    scrollDown(true);

    var stop = typing();
    /* brief, honest pause — it IS searching 350 books + 300 autopsies */
    setTimeout(function () {
      var res;
      try {
        res = window.TSB_ASK_CORE.resolve(q);
      } catch (e) {
        res = { kind: "empty", question: q, answer: "Something went wrong \u2014 try again.", sources: [] };
      }
      stop();
      log.appendChild(elMsg("bot", answerHtml(res)));
      remember({ q: q, res: res });
      scrollDown(true);

      try { renderSuggestions(window.TSB_ASK_CORE.followUps(q, 3)); }
      catch (e) {}

      busy = false;
      sendBtn.disabled = false;
      input.focus({ preventScroll: true });
    }, 620);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(input.value);
  });

  if (newBtn) {
    newBtn.addEventListener("click", function () {
      lsSet(HISTORY_KEY, []);
      log.innerHTML = "";
      welcome();
      try { renderSuggestions(window.TSB_ASK_CORE.suggestions(6)); } catch (e) {}
      input.focus({ preventScroll: true });
    });
  }

  /* ---------- question library ---------- */
  function openLibrary() {
    var C = window.TSB_ASK_CORE;
    if (!C || !C.library) return;
    var groups = C.library();
    var total = groups.reduce(function (a, g) { return a + g.items.length; }, 0);
    var active = "all";

    var sheet = document.createElement("div");
    sheet.className = "qlib";
    sheet.innerHTML =
      '<div class="qlib__box" role="dialog" aria-modal="true" aria-label="Question library">' +
        '<div class="qlib__grab"></div>' +
        '<div class="qlib__head"><h2>Question library</h2><span>' + total + " QUESTIONS</span></div>" +
        '<input class="qlib__search" id="qlibQ" type="text" placeholder="Search questions\u2026" ' +
          'autocapitalize="none" autocorrect="off" spellcheck="false">' +
        '<div class="qlib__tabs" id="qlibTabs"></div>' +
        '<div class="qlib__list" id="qlibList"></div>' +
      "</div>";
    document.body.appendChild(sheet);

    var tabsEl = sheet.querySelector("#qlibTabs");
    var listEl = sheet.querySelector("#qlibList");
    var qEl    = sheet.querySelector("#qlibQ");

    function paintTabs() {
      tabsEl.innerHTML =
        '<button class="qlib__tab' + (active === "all" ? " is-on" : "") + '" data-c="all">All ' + total + "</button>" +
        groups.map(function (g) {
          return '<button class="qlib__tab' + (active === g.id ? " is-on" : "") + '" data-c="' + g.id + '">' +
            g.emoji + " " + esc(g.label) + " " + g.items.length + "</button>";
        }).join("");
    }

    function rowHtml(it) {
      return '<button class="qlib__q" data-q="' + esc(it.q) + '">' +
        "<b>" + esc(it.q) + "</b>" +
        (it.books ? "<small>" + it.books + " \uD83D\uDCD5</small>" : "") + "</button>";
    }

    function paintList() {
      var term = qEl.value.trim();
      if (term) {
        var hits = C.searchLibrary(term) || [];
        listEl.innerHTML = hits.length
          ? hits.map(rowHtml).join("")
          : '<p class="qlib__empty">No question matches that.<br>Type it in the chat box \u2014 the library still searches all 350 books.</p>';
        return;
      }
      var show = active === "all" ? groups : groups.filter(function (g) { return g.id === active; });
      listEl.innerHTML = show.map(function (g) {
        return '<div class="qlib__group">' + g.emoji + " " + esc(g.label) + "</div>" +
          g.items.map(rowHtml).join("");
      }).join("");
    }

    paintTabs(); paintList();

    tabsEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-c]");
      if (!b) return;
      active = b.getAttribute("data-c");
      qEl.value = "";
      paintTabs(); paintList();
      listEl.scrollTop = 0;
    });
    qEl.addEventListener("input", paintList);
    listEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-q]");
      if (!b) return;
      close();
      ask(b.getAttribute("data-q"));
    });

    function close() { sheet.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
  }

  if (libBtn) libBtn.addEventListener("click", openLibrary);

  /* deep link: chat.html?q=how+do+i+stop+procrastinating */
  function boot() {
    if (sub) {
      sub.textContent = (window.BOOKS || []).length + " books \u00B7 " +
        (window.FAILURES || []).length + " autopsies";
    }
    restore();
    try { renderSuggestions(window.TSB_ASK_CORE.suggestions(6)); } catch (e) {}

    var qp = new URLSearchParams(location.search).get("q");
    if (qp) ask(qp);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }

  window.TSB_CHAT = { ask: ask, openLibrary: openLibrary };
})();
