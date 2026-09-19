/* =====================================================================
   TheSmallBook · js/quotedesk.js · v250
   ---------------------------------------------------------------------
   THE QUOTE DESK — the whole quote flow on ONE sheet.

   Why it exists: the Inspire Desk was built for stories (images, research,
   quotes). For a quote you want three things and nothing else:

       1 · a line (you type it, or you tap a topic and I fetch live ones)
       2 · an optional photo behind it
       3 · "why this line hit you" — written on the page, UNDER the card

   It also settles the old bug where picking an aesthetic photo as your
   cover took you away to another window and made you press back. Here the
   photo lands in the preview on this very sheet, instantly.

   Nothing here uploads on pick. The photo stays local (object URL) until
   you actually publish, so cancelling costs nothing.

   Public:
     TSB_QUOTEDESK.open(mode, opts)
       mode "quote"  -> this sheet
       mode "story"  -> hands over to the full Inspire Desk (quotes/images/research)
     TSB_QUOTEDESK.close()
     TSB_QUOTEDESK.font()          current card font id
     TSB_QUOTEDESK.setFont(id)
   opts (quote mode):
     seed     — prefill text (e.g. the title you already typed)
     why      — prefill "why this line hit you"
     photo    — object URL / remote URL already chosen (shows as preview)
     photoName— label for the chosen photo
     gold     — hides "watermark" wording for Gold readers
     onPick(view)  view = { text, author, why, photo, photoRemote, kind:"card"|"sep"|"text" }
     onWantPhoto(topic)  -> the host opens its own picker (optional)
   ===================================================================== */
(function () {
  "use strict";
  if (window.TSB_QUOTEDESK) return;

  var FONT_KEY = "tsb_quote_font";
  var FONTS = {
    arch:    { label: "Archivo",    css: "'Archivo Black', system-ui, sans-serif",        w: 900 },
    impact:  { label: "Impact",     css: "Impact, 'Archivo Black', sans-serif",           w: 900 },
    anton:   { label: "Anton",      css: "'Anton', Impact, sans-serif",                   w: 400 },
    bebas:   { label: "Bebas",      css: "'Bebas Neue', Impact, sans-serif",              w: 400 },
    space:   { label: "Grotesk",    css: "'Space Grotesk', system-ui, sans-serif",        w: 700 },
    mont:    { label: "Montserrat", css: "'Montserrat', system-ui, sans-serif",           w: 900 },
    serif:   { label: "Playfair",   css: "'Playfair Display', Georgia, serif",            w: 700 },
    mono:    { label: "Mono",       css: "'Space Mono', ui-monospace, monospace",         w: 700 },
    hand:    { label: "Caveat",     css: "'Caveat', cursive",                             w: 700 },
    lobster: { label: "Lobster",    css: "'Lobster', 'Caveat', cursive",                  w: 400 }
  };
  var TOPICS = [
    { id: "motivational", label: "🔥 Motivation" },
    { id: "wisdom",       label: "🦉 Wisdom" },
    { id: "life",         label: "🌱 Life" },
    { id: "love",         label: "❤️ Love" },
    { id: "success",      label: "🏆 Success" },
    { id: "healing",      label: "🩹 Healing" },
    { id: "lonely",       label: "🌙 Lonely" },
    { id: "courage",      label: "🦁 Courage" },
    { id: "money",        label: "💰 Money" },
    { id: "focus",        label: "🎯 Focus" }
  ];

  var root = null, opts = null, S = {};

  function fontId() {
    try { return localStorage.getItem(FONT_KEY) || "arch"; } catch (e) { return "arch"; }
  }
  function setFont(id) {
    try { localStorage.setItem(FONT_KEY, id); } catch (e) {}
    return id;
  }
  function fontOf(id) { return FONTS[id] || FONTS.arch; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel) { return root ? root.querySelector(sel) : null; }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }

  /* ------------------------------------------------------------------ */
  function close() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    try { document.documentElement.classList.remove("qd-open"); } catch (e) {}
  }

  function open(mode, o) {
    opts = o || {};
    mode = mode === "story" ? "story" : "quote";

    /* stories keep the full library — images, research, quotes */
    if (mode === "story") {
      var api = window.TSB_OSINT || window.TSB_INSPIRE;
      if (api && api.openInspire) {
        return api.openInspire("images", opts.seed || "", {
          tabs: ["images", "research"],
          onUseImage: opts.onUseImage,
          onUseResearch: opts.onUseResearch
        });
      }
      return null;
    }

    close();
    S = {
      text: opts.seed || "",
      author: "",
      why: opts.why || "",
      photo: opts.photo || "",
      photoName: opts.photoName || "",
      photoRemote: opts.photoRemote || "",
      topic: "",
      results: [],
      busy: false,
      font: fontId()
    };
    root = document.createElement("div");
    root.className = "qd-ov";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Quote desk");
    root.innerHTML = sheetHTML();
    document.body.appendChild(root);
    document.documentElement.classList.add("qd-open");

    /* --- wiring --------------------------------------------------- */
    $("#qdX").addEventListener("click", close);
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    document.addEventListener("keydown", escClose);

    var ta = $("#qdQuote");
    ta.addEventListener("input", function () { S.text = this.value; paintPreview(); });
    var au = $("#qdAuthor");
    au.addEventListener("input", function () { S.author = this.value; paintPreview(); });
    var wy = $("#qdWhy");
    wy.addEventListener("input", function () { S.why = this.value; });

    var grow = function () { this.style.height = "auto"; this.style.height = Math.min(220, this.scrollHeight + 2) + "px"; };
    ta.addEventListener("input", grow);
    wy.addEventListener("input", grow);
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 260);

    $("#qdSearch").addEventListener("click", function () { fetchTopic(true); });
    $("#qdSearchIn").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); fetchTopic(true); } });

    for (var i = 0; i < TOPICS.length; i++) {
      (function (t) {
        var b = root.querySelector('[data-topic="' + t.id + '"]');
        if (b) b.addEventListener("click", function () {
          S.topic = t.id;
          var all = root.querySelectorAll("[data-topic]");
          for (var k = 0; k < all.length; k++) all[k].classList.toggle("on", all[k] === b);
          fetchTopic(false);
        });
      })(TOPICS[i]);
    }

    $("#qdPhoto").addEventListener("click", function () { pickPhoto(S.topic); });
    $("#qdCard").addEventListener("click", function () { finish("card"); });
    $("#qdSep").addEventListener("click", function () { finish("sep"); });
    $("#qdText").addEventListener("click", function () { finish("text"); });
    var tune = $("#qdTune");
    if (tune) {
      tune.addEventListener("click", function (e) {
        var b = e.target.closest("[data-font]"); if (!b) return;
        S.font = setFont(b.getAttribute("data-font"));
        var all = root.querySelectorAll("[data-font]");
        for (var k = 0; k < all.length; k++) all[k].classList.toggle("on", all[k] === b);
        paintPreview();
      });
    }
    paintPreview();
    paintPhoto();
    return root;
  }
  function escClose(e) { if (e.key === "Escape") { document.removeEventListener("keydown", escClose); close(); } }

  /* ------------------------------------------------------------------ */
  function sheetHTML() {
    var chips = "";
    for (var i = 0; i < TOPICS.length; i++) {
      chips += '<button type="button" data-topic="' + TOPICS[i].id + '">' + TOPICS[i].label + "</button>";
    }
    var fs = "";
    Object.keys(FONTS).forEach(function (id) {
      fs += '<button type="button" data-font="' + id + '" class="' + (id === S.font ? "on" : "") +
            '" style="font-family:' + FONTS[id].css + ';font-weight:' + (FONTS[id].w || 800) + '">' + FONTS[id].label + "</button>";
    });
    return '' +
      '<div class="qd-sheet">' +
        '<div class="qd-top">' +
          '<b>❝ QUOTE DESK<small>one sheet — find it or write it, photo optional, why-line always below</small></b>' +
          '<button class="qd-x" id="qdX" type="button" aria-label="Close">✕</button>' +
        '</div>' +

        /* ---- live preview ------------------------------------------ */
        '<div class="qd-prevbox" id="qdPrev">' +
          '<div class="qd-prev">' +
            '<div class="qd-prev__q" id="qdPrevQ"></div>' +
            '<div class="qd-prev__by" id="qdPrevBy"></div>' +
          '</div>' +
        '</div>' +

        /* ---- topics: live quotes, no typing needed ----------------- */
        '<div class="qd-lbl">✨ Or tap a topic — live quotes, fetched right now</div>' +
        '<div class="qd-tune" id="qdTuneTopics">' + chips + '</div>' +
        '<div class="qd-search">' +
          '<input id="qdSearchIn" type="text" placeholder="…or search any topic, word or author" autocomplete="off">' +
          '<button type="button" id="qdSearch">FIND</button>' +
        '</div>' +
        '<div class="qd-live" id="qdLive"></div>' +

        /* ---- the quote itself -------------------------------------- */
        '<div class="qd-lbl">✍️ Your line <span style="opacity:.7">(edit it — make it yours)</span></div>' +
        '<textarea class="qd-ta" id="qdQuote" rows="2" maxlength="220" placeholder="The line that stopped you…"></textarea>' +
        '<div class="qd-row">' +
          '<input class="qd-in" id="qdAuthor" type="text" maxlength="60" placeholder="— who said it (optional)">' +
        '</div>' +

        /* ---- photo ------------------------------------------------- */
        '<div class="qd-lbl">🖼️ Photo behind it <span style="opacity:.7">(optional)</span></div>' +
        '<button class="qd-kind" id="qdPhoto" type="button">' +
          '<span class="qd-kind__ic" id="qdPhotoIc">🎨</span>' +
          '<span class="qd-kind__t"><b>Find a photo for this quote</b>' +
            '<span id="qdPhotoNote">aesthetic images by topic or search — lands right here, no extra window</span></span>' +
        '</button>' +

        /* ---- why this line hit you --------------------------------- */
        '<div class="qd-lbl">💬 Why this line hit you <span style="opacity:.7">(goes below your card — this is the part people reply to)</span></div>' +
        '<div class="qd-why"><textarea class="qd-ta" id="qdWhy" rows="3" maxlength="600" placeholder="Two or three lines in your own voice — what it changed, where you read it, who it reminds you of…"></textarea></div>' +

        /* ---- font (mirrors Studio so the page and the card agree) --- */
        '<div class="qd-lbl">🔤 Font — the card and this page always match</div>' +
        '<div class="qd-tune" id="qdTune">' + fs + '</div>' +

        /* ---- actions ----------------------------------------------- */
        '<button class="qd-go" id="qdCard" type="button">🎨 Open Studio — quote inside the image</button>' +
        '<div class="qd-foot">' +
          '<button type="button" id="qdSep">🖼️ Photo + text below</button>' +
          '<button type="button" id="qdText">📝 Just the quote</button>' +
        '</div>' +
        '<p class="qd-hint" id="qdHint"></p>' +
      '</div>';
  }

  /* ---- preview ------------------------------------------------------ */
  function paintPreview() {
    var box = $("#qdPrev"), q = $("#qdPrevQ"), by = $("#qdPrevBy");
    if (!box) return;
    var t = (S.text || "").trim(), a = (S.author || "").trim();
    var fo = fontOf(S.font);
    var px = t.length > 150 ? 15 : t.length > 90 ? 17 : t.length > 40 ? 19 : 22;
    box.classList.toggle("has-img", !!S.photo);
    box.style.backgroundImage = S.photo ? 'url("' + String(S.photo).replace(/"/g, '\\"') + '")' : "";
    box.style.backgroundSize = "cover";
    box.style.backgroundPosition = "center";
    q.style.fontFamily = fo.css;
    q.style.fontWeight = fo.w || 800;
    q.style.fontSize = px + "px";
    q.textContent = t ? "“ " + t + " ”" : "“ Your words, framed beautifully. ”";
    q.style.opacity = t ? 1 : .55;
    by.textContent = a ? "— " + a : "";
    var hint = $("#qdHint");
    if (hint) {
      hint.textContent = S.photo
        ? "Studio opens with this photo and your quote already on it — reframe, filter, export. Nothing uploads until you publish."
        : "No photo? Studio still gives you 24 aesthetic backgrounds, so the card always looks finished.";
    }
  }
  function paintPhoto() {
    var ic = $("#qdPhotoIc"), note = $("#qdPhotoNote"), b = $("#qdPhoto");
    if (!b) return;
    if (S.photo) {
      if (ic) ic.textContent = "✓";
      if (note) note.textContent = (S.photoName ? S.photoName : "Photo chosen") + " — tap to change it";
      b.classList.add("qd-kind--on");
    } else {
      if (ic) ic.textContent = "🎨";
      if (note) note.textContent = "aesthetic images by topic or search — lands right here, no extra window";
      b.classList.remove("qd-kind--on");
    }
  }

  /* ---- live quotes (real network, nothing preloaded) ---------------- */
  function paintResults(busy) {
    var box = $("#qdLive"); if (!box) return;
    if (busy) { box.innerHTML = '<div class="qd-empty">… fetching live quotes</div>'; return; }
    if (!S.results.length) { box.innerHTML = ""; return; }
    var html = "";
    for (var i = 0; i < S.results.length; i++) {
      var r = S.results[i];
      html += '<button type="button" class="qd-live__c" data-i="' + i + '">' +
                "<p>" + esc(r.c) + "</p>" +
                (r.a ? "<em>— " + esc(r.a) + "</em>" : "") +
              "</button>";
    }
    box.innerHTML = html;
    var cards = box.querySelectorAll(".qd-live__c");
    for (var k = 0; k < cards.length; k++) {
      cards[k].addEventListener("click", function () {
        var r = S.results[+this.getAttribute("data-i")];
        if (!r) return;
        S.text = r.c; S.author = r.a || "";
        var ta = $("#qdQuote"), au = $("#qdAuthor");
        if (ta) { ta.value = S.text; ta.style.height = "auto"; ta.style.height = Math.min(220, ta.scrollHeight + 2) + "px"; }
        if (au) au.value = S.author;
        paintPreview(); buzz(10);
        var why = $("#qdWhy"); if (why) { try { why.focus(); } catch (e) {} }
      });
    }
  }
  async function fetchTopic(isSearch) {
    var api = window.TSB_OSINT || window.TSB_INSPIRE;
    var q = isSearch ? (($("#qdSearchIn") || {}).value || "").trim() : "";
    if (S.busy) return;
    S.busy = true; paintResults(true);
    try {
      var list = [];
      if (api && typeof api.quotesLive === "function") {
        list = await api.quotesLive(q, isSearch ? "" : S.topic);
      } else {
        /* graceful fallback: the same live endpoint the desk uses */
        var url = q
          ? "https://dummyjson.com/quotes/search?q=" + encodeURIComponent(q) + "&limit=12"
          : "https://dummyjson.com/quotes?limit=12&skip=" + (Math.floor(Math.random() * 10) * 12);
        var j = await fetch(url).then(function (r) { return r.json(); });
        list = (j.quotes || []).map(function (x) { return { c: x.quote, a: x.author }; });
      }
      S.results = (list || []).slice(0, 10);
    } catch (e) {
      S.results = [];
      var box = $("#qdLive");
      if (box) box.innerHTML = '<div class="qd-empty">Couldn\'t reach the live quote library — type your own line below, it works offline.</div>';
      S.busy = false;
      return;
    }
    S.busy = false;
    paintResults(false);
  }

  /* ---- photo: hand straight back to the host page ------------------- */
  function pickPhoto(topic) {
    if (typeof opts.onWantPhoto === "function") {
      try { opts.onWantPhoto(topic || ""); return; } catch (e) {}
    }
    var api = window.TSB_OSINT || window.TSB_INSPIRE;
    if (api && api.openInspire) {
      api.openInspire("images", topic || S.text || "", {
        tabs: ["images", "quotes"],
        onUseImage: function (url) { applyPhoto(url, "Inspire Desk"); }
      });
    }
  }
  /* the host page can call this after it has fetched/uploaded an image */
  function applyPhoto(src, name, remote) {
    S.photo = src || ""; S.photoName = name || ""; S.photoRemote = remote || "";
    if (root) { paintPhoto(); paintPreview(); }
    try { if (!root) return; } catch (e) {}
  }

  /* ---- finish ------------------------------------------------------- */
  function finish(kind) {
    var t = (S.text || "").trim();
    if (kind !== "text" && !t) {
      var hint = $("#qdHint");
      if (hint) { hint.textContent = "Add the line first — even one sentence is a quote."; }
      var ta = $("#qdQuote"); if (ta) { try { ta.focus(); } catch (e) {} }
      return;
    }
    if (kind === "text" && !t) {
      var h2 = $("#qdHint"); if (h2) h2.textContent = "Write your line, then this publishes it as text.";
      return;
    }
    buzz(14);
    var view = {
      text: t, author: (S.author || "").trim(), why: (S.why || "").trim(),
      photo: S.photo || "", photoRemote: S.photoRemote || "", kind: kind, font: S.font
    };
    try { if (typeof opts.onPick === "function") opts.onPick(view); } catch (e) {}
    close();
  }

  window.TSB_QUOTEDESK = {
    open: open, close: close, font: fontId, setFont: setFont,
    applyPhoto: applyPhoto, isOpen: function () { return !!root; },
    VERSION: "v250"
  };
})();
