/* TheSmallBook · word meaning (v341)
   Press and hold a word while reading (double-click on a computer).
   A small card slides up with EVERY meaning the word has, not just one.

   Two open dictionaries, in order:
     1. dictionaryapi.dev  - full English entries (phonetic, all parts of
        speech, all definitions, examples, synonyms)
     2. Wiktionary REST    - everything else: Hindi, Gujarati, Marathi,
        Bengali, Tamil, Telugu, Urdu and any other script, plus the English
        words the first source is missing.

   Rule: if a word is a word, the card answers. Nothing is left as
   "No meaning found" while another source still has an answer. */
(function () {
  "use strict";
  if (window.TSB_WORD) return;
  var cache = {}, card = null, last = "", timer = 0, reqId = 0;
  var SKIP = "input,textarea,select,button,a,[contenteditable],[contenteditable=true],nav,header,.tsb-bar,#tsbBar,.wt-card,.aq,.gp,.bkx";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* the card is a reading surface, so it can be long, and it scrolls */
  function css() {
    if (document.getElementById("wt-css")) return;
    var st = document.createElement("style"); st.id = "wt-css";
    st.textContent =
      ".wt-card{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 88px);z-index:100001;width:min(440px,calc(100vw - 24px));box-sizing:border-box;" +
      "transform:translate(-50%,16px);opacity:0;transition:transform .32s cubic-bezier(.16,1,.3,1),opacity .2s;background:#FBF8F1;color:#16130F;border:1px solid #ECE5D6;border-radius:22px;" +
      "padding:14px 16px 14px;box-shadow:0 18px 40px rgba(22,19,15,.18);font:400 15px/1.45 'Space Grotesk',system-ui,sans-serif;max-height:min(58vh,520px);display:flex;flex-direction:column}" +
      ".wt-card.on{transform:translate(-50%,0);opacity:1}" +
      ".wt-top{display:flex;align-items:center;gap:10px;flex:0 0 auto}" +
      ".wt-w{font:600 22px/1.1 Newsreader,Georgia,serif;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".wt-ph{color:#6E6658;font-size:13px;flex:0 0 auto}" +
      ".wt-b{margin-left:auto;flex:none;width:38px;height:38px;border-radius:50%;border:1px solid #ECE5D6;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;padding:0}" +
      ".wt-b+.wt-b{margin-left:0}" +
      ".wt-body{margin-top:8px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-right:2px}" +
      ".wt-pos{display:inline-block;margin:10px 0 2px;font:700 11px/1 'Space Grotesk',system-ui;letter-spacing:.06em;color:#8A5A00;text-transform:uppercase}" +
      ".wt-pos:first-child{margin-top:2px}" +
      ".wt-ol{margin:0;padding:0 0 0 18px;list-style:none;counter-reset:wtm}" +
      ".wt-li{position:relative;margin:0 0 7px;counter-increment:wtm}" +
      ".wt-li::before{content:counter(wtm);position:absolute;left:-18px;top:1px;font:600 11px/1.5 'Space Grotesk',system-ui;color:#A79E8E}" +
      ".wt-ex{margin:3px 0 0;color:#6E6658;font-style:italic;font-size:13.5px}" +
      ".wt-syn{margin:8px 0 0;font-size:12.5px;color:#6E6658}" +
      ".wt-src{margin:10px 0 0;font:600 10.5px/1 'Space Grotesk',system-ui;letter-spacing:.06em;color:#A79E8E;text-transform:uppercase}" +
      "html.dark .wt-card{background:#221E19;color:#F4EFE6;border-color:#3A332B;box-shadow:0 18px 40px rgba(0,0,0,.5)}" +
      "html.dark .wt-ph,html.dark .wt-ex,html.dark .wt-syn{color:#ABA293}html.dark .wt-b{border-color:#3A332B}html.dark .wt-pos{color:#E9C46A}" +
      "@media (prefers-reduced-motion:reduce){.wt-card{transition:none}}";
    document.head.appendChild(st);
  }
  var IC_SPK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var IC_X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function close() {
    if (!card) return;
    var c = card; card = null; last = "";
    c.classList.remove("on");
    setTimeout(function () { if (c.parentNode) c.remove(); }, 320);
  }
  function say(w) {
    try { var u = new SpeechSynthesisUtterance(w); u.lang = /[\u0900-\u097F]/.test(w) ? "hi-IN" : /[\u0A80-\u0AFF]/.test(w) ? "gu-IN" : "en-IN"; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }
  function shell(w, ph) {
    css();
    if (!card) {
      card = document.createElement("div");
      card.className = "wt-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Word meaning");
      document.body.appendChild(card);
      card.addEventListener("click", function (e) {
        var b = e.target.closest("[data-wt]"); if (!b) return;
        if (b.getAttribute("data-wt") === "x") close(); else say(card.getAttribute("data-w") || "");
      });
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (card) card.classList.add("on"); }); });
    }
    card.setAttribute("data-w", w);
    card.innerHTML = '<div class="wt-top"><p class="wt-w">' + esc(w) + '</p>' + (ph ? '<span class="wt-ph">' + esc(ph) + "</span>" : "") +
      '<button type="button" class="wt-b" data-wt="say" aria-label="Hear the word">' + IC_SPK + '</button><button type="button" class="wt-b" data-wt="x" aria-label="Close">' + IC_X + "</button></div>" +
      '<div class="wt-body"></div>';
  }
  function paint(w, body) {
    shell(w, body.ph || "");
    var host = card && card.querySelector(".wt-body"); if (!host) return;
    if (body.loading) { host.innerHTML = '<p class="wt-ex">Looking it up in two dictionaries.</p>'; return; }
    if (body.rows && body.rows.length) {
      host.innerHTML = body.rows.map(function (g) {
        return '<span class="wt-pos">' + esc(g.pos) + '</span><ol class="wt-ol">' + g.defs.map(function (d) {
          return '<li class="wt-li">' + esc(d.def) + (d.ex ? '<p class="wt-ex">' + esc(d.ex) + "</p>" : "") + "</li>";
        }).join("") + "</ol>";
      }).join("") +
      (body.syn && body.syn.length ? '<p class="wt-syn"><b>Also:</b> ' + esc(body.syn.slice(0, 8).join(", ")) + "</p>" : "") +
      (body.src ? '<p class="wt-src">' + esc(body.src) + "</p>" : "");
      return;
    }
    host.innerHTML = '<p class="wt-ex">' + esc(body.def || "No meaning found for this word.") + "</p>";
  }

  /* ---------- source 1: dictionaryapi.dev ---------- */
  function fromDictionary(w) {
    return fetchJson("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w), 6500).then(function (j) {
      if (!j || !j.length) return null;
      var ph = "", rows = [], syn = [];
      j.forEach(function (entry) {
        if (!ph && entry.phonetic) ph = entry.phonetic;
        (entry.meanings || []).forEach(function (m) {
          var defs = [];
          (m.definitions || []).slice(0, 4).forEach(function (d) {
            if (!d || !d.definition) return;
            defs.push({ def: d.definition, ex: d.example || "" });
            (d.synonyms || []).forEach(function (s) { if (syn.indexOf(s) < 0) syn.push(s); });
          });
          (m.synonyms || []).forEach(function (s) { if (syn.indexOf(s) < 0) syn.push(s); });
          if (defs.length) rows.push({ pos: m.partOfSpeech || "meaning", defs: defs });
        });
      });
      if (!rows.length) return null;
      return { ph: ph, rows: rows.slice(0, 5), syn: syn, src: "Dictionary, English" };
    }).catch(function () { return null; });
  }

  /* ---------- source 2: Wiktionary (every language and script) ---------- */
  function fromWiktionary(w) {
    return fetchJson("https://en.wiktionary.org/api/rest_v1/page/definition/" + encodeURIComponent(w), 7000).then(function (j) {
      if (!j) return null;
      /* the response is keyed by wiki language code: en, hi, gu, ta, bn … */
      var prefer = ["en", "hi", "gu", "mr", "bn", "ta", "te", "kn", "ml", "pa", "ur", "sa"];
      var keys = Object.keys(j).sort(function (a, b) {
        var ia = prefer.indexOf(a), ib = prefer.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      var rows = [], syn = [], usedLang = "";
      keys.forEach(function (k) {
        (j[k] || []).forEach(function (block) {
          var defs = [];
          (block.definitions || []).slice(0, 4).forEach(function (d) {
            var text = String(d.definition || "").replace(/<[^>]*>/g, "").trim();
            if (!text) return;
            var ex = (d.parsedExamples || []).map(function (x) { return String(x.example || "").replace(/<[^>]*>/g, "").trim(); }).filter(Boolean)[0] ||
                     (d.examples || []).filter(Boolean)[0] || "";
            defs.push({ def: text, ex: ex });
          });
          if (defs.length) {
            var lane = block.language || "";
            rows.push({ pos: (block.partOfSpeech || "meaning") + (lane && lane !== "English" ? " · " + lane : ""), defs: defs });
            if (!usedLang) usedLang = k;
          }
        });
      });
      if (!rows.length) return null;
      return { ph: "", rows: rows.slice(0, 5), syn: syn, src: "Wiktionary" };
    }).catch(function () { return null; });
  }

  function fetchJson(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 6000);
    return fetch(url, ctl ? { signal: ctl.signal, headers: { Accept: "application/json" } } : { headers: { Accept: "application/json" } })
      .then(function (r) { clearTimeout(t); return r.ok ? r.json() : null; })
      .catch(function () { clearTimeout(t); return null; });
  }

  /* ---------- cache: memory first, then the device ---------- */
  var LS = "tsb_words_v341";
  function lsRead() { try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { return {}; } }
  function lsWrite(k, v) {
    try {
      var all = lsRead(); all[k] = v;
      var keys = Object.keys(all);
      if (keys.length > 220) { keys.slice(0, keys.length - 220).forEach(function (x) { delete all[x]; }); }
      localStorage.setItem(LS, JSON.stringify(all));
    } catch (e) {}
  }

  function lookup(w) {
    w = String(w || "").toLowerCase();
    if (cache[w]) return Promise.resolve(cache[w]);
    var disk = lsRead(); if (disk[w]) { cache[w] = disk[w]; return Promise.resolve(disk[w]); }
    var isLatin = /^[a-z][a-z'\- ]*$/.test(w);
    var chain = isLatin ? fromDictionary(w).then(function (r) { return r || fromWiktionary(w); }) : fromWiktionary(w);
    return chain.then(function (r) {
      var out = r || { def: navigator.onLine === false ? "You are offline. Meanings need the internet." : "No meaning found for this word." };
      cache[w] = out; lsWrite(w, out);
      return out;
    }).catch(function () {
      return { def: navigator.onLine === false ? "You are offline. Meanings need the internet." : "Could not load the meaning. Try again." };
    });
  }

  /* ---------- what counts as a word ---------- */
  function cleanWord(raw) {
    var s = String(raw || "").replace(/\s+/g, " ").trim();
    /* strip punctuation and quotes on both sides, keep the letters */
    s = s.replace(/^[^\p{L}\p{M}]+/u, "").replace(/[^\p{L}\p{M}]+$/u, "");
    if (!s) return "";
    /* one word, or a two-word phrase someone deliberately selected */
    if (s.split(" ").length > 2) return "";
    if (s.length < 2 || s.length > 40) return "";
    if (!/^[\p{L}\p{M}][\p{L}\p{M}'\- ]*$/u.test(s)) return "";
    return s.toLowerCase();
  }

  function check() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    var w = cleanWord(sel.toString());
    if (!w) return;
    var node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (!node || (node.closest && node.closest(SKIP))) return;
    if (w === last) return;
    last = w;
    var my = ++reqId;
    paint(w, { loading: true });
    lookup(w).then(function (body) { if (my === reqId && card) paint(w, body); });
  }

  document.addEventListener("selectionchange", function () { clearTimeout(timer); timer = setTimeout(check, 420); });
  document.addEventListener("pointerdown", function (e) { if (card && !e.target.closest(".wt-card")) { var sel = window.getSelection(); setTimeout(function () { if (!sel || sel.isCollapsed) close(); }, 300); } }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  window.TSB_WORD = { lookup: lookup, close: close, open: function (word) { var w = cleanWord(word) || String(word || ""); last = w; paint(w, { loading: true }); lookup(w).then(function (b) { if (card) paint(w, b); }); } };
})();
