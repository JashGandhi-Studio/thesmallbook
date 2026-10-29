/* TheSmallBook · word meaning (v334)
   Press and hold a word while reading (double-click on a computer).
   A small card slides up with the meaning. Uses the free, open
   dictionaryapi.dev (no key). English words only; nothing else to learn. */
(function () {
  "use strict";
  if (window.TSB_WORD) return;
  var cache = {}, card = null, last = "", timer = 0, reqId = 0;
  var SKIP = "input,textarea,select,button,a,[contenteditable],[contenteditable=true],nav,header,.tsb-bar,#tsbBar,.wt-card,.aq,.gp,.bkx";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() {
    if (document.getElementById("wt-css")) return;
    var st = document.createElement("style"); st.id = "wt-css";
    st.textContent =
      ".wt-card{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:100001;width:min(420px,calc(100vw - 24px));box-sizing:border-box;" +
      "transform:translate(-50%,16px);opacity:0;transition:transform .32s cubic-bezier(.16,1,.3,1),opacity .2s;background:#FBF8F1;color:#16130F;border:1px solid #ECE5D6;border-radius:20px;" +
      "padding:14px 16px 16px;box-shadow:0 18px 40px rgba(22,19,15,.18);font:400 15px/1.45 'Space Grotesk',system-ui,sans-serif}" +
      ".wt-card.on{transform:translate(-50%,0);opacity:1}" +
      ".wt-top{display:flex;align-items:center;gap:10px}" +
      ".wt-w{font:600 22px/1.1 Newsreader,Georgia,serif;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis}" +
      ".wt-ph{color:#6E6658;font-size:13px}" +
      ".wt-b{margin-left:auto;flex:none;width:40px;height:40px;border-radius:50%;border:1px solid #ECE5D6;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;padding:0}" +
      ".wt-b+.wt-b{margin-left:0}" +
      ".wt-pos{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;letter-spacing:.04em;color:#8A5A00;text-transform:lowercase}" +
      ".wt-d{margin:4px 0 0}.wt-ex{margin:6px 0 0;color:#6E6658;font-style:italic}" +
      "html.dark .wt-card{background:#221E19;color:#F4EFE6;border-color:#3A332B;box-shadow:0 18px 40px rgba(0,0,0,.5)}" +
      "html.dark .wt-ph,html.dark .wt-ex{color:#ABA293}html.dark .wt-b{border-color:#3A332B}html.dark .wt-pos{color:#E9C46A}" +
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
    try { var u = new SpeechSynthesisUtterance(w); u.lang = "en-IN"; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }
  function paint(w, body) {
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
    card.innerHTML = '<div class="wt-top"><p class="wt-w">' + esc(w) + '</p>' + (body.ph ? '<span class="wt-ph">' + esc(body.ph) + "</span>" : "") +
      '<button type="button" class="wt-b" data-wt="say" aria-label="Hear the word">' + IC_SPK + '</button><button type="button" class="wt-b" data-wt="x" aria-label="Close">' + IC_X + "</button></div>" +
      (body.pos ? '<span class="wt-pos">' + esc(body.pos) + "</span>" : "") +
      '<p class="wt-d">' + esc(body.def) + "</p>" + (body.ex ? '<p class="wt-ex">' + esc(body.ex) + "</p>" : "");
  }
  function lookup(w) {
    if (cache[w]) return Promise.resolve(cache[w]);
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(t);
        var e = j && j[0], m = e && e.meanings && e.meanings[0], d = m && m.definitions && m.definitions[0];
        var out = d && d.definition ? { ph: e.phonetic || "", pos: m.partOfSpeech || "", def: d.definition, ex: d.example || "" } : { def: "No meaning found for this word." };
        cache[w] = out; return out;
      })
      .catch(function () { clearTimeout(t); return { def: navigator.onLine === false ? "You are offline. Meanings need the internet." : "Could not load the meaning. Try again." }; });
  }
  function check() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    var raw = String(sel.toString() || "").trim();
    var w = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "").toLowerCase();
    if (!w || w.length < 2 || w.length > 30 || !/^[a-z]+(?:[-'][a-z]+)?$/.test(w) || raw.split(/\s+/).length > 1) return;
    var node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (!node || (node.closest && node.closest(SKIP))) return;
    if (w === last) return;
    last = w;
    var my = ++reqId;
    paint(w, { def: "Looking it up" });
    lookup(w).then(function (body) { if (my === reqId && card) paint(w, body); });
  }
  document.addEventListener("selectionchange", function () { clearTimeout(timer); timer = setTimeout(check, 450); });
  document.addEventListener("pointerdown", function (e) { if (card && !e.target.closest(".wt-card")) { var sel = window.getSelection(); setTimeout(function () { if (!sel || sel.isCollapsed) close(); }, 300); } }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  window.TSB_WORD = { lookup: lookup, close: close };
})();
