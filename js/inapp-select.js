/* ============================================================
   THESMALLBOOK, SELECTION THAT NEVER LEAVES THE APP
   Long-press a word anywhere in the app and the app answers: its
   own highlight, copy, share and explain, plus the meaning card.
   The browser menu (Define, Copy, Select all, Web search, the
   Google share bubble) never appears because the page stops
   offering native selection at all. Inputs, textareas and editors
   keep their normal behaviour, they are the only places where a
   native menu is genuinely useful.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_SEL) return;
  window.TSB_SEL = true;

  var TOUCH = "ontouchstart" in window;
  var LONG = TOUCH ? 380 : 260;          /* a finger has to rest this long */
  var SLOP = 10;                          /* px of travel that still counts as a press */
  /* chrome answers taps on its own; prose is what the app selects from.
     A book page keeps its prose inside <header class="seohero">, so header
     and footer are not skipped wholesale, only real navigation is. */
  var SKIP = "button,a,input,textarea,select,label,summary,nav," +
    ".frd-tool,.wt-card,.iasel-bar,.iasel-hd,.fs,.tsb-sheet,[data-no-select],.no-select," +
    ".planet,.b3d-box,.tsb-dock,.ap-dock,.bar,.tabbar";

  /* ---------- 1 · the app owns text ---------- */
  var css = document.createElement("style");
  css.id = "tsbSelCss";
  css.textContent = [
    "html.tsb-inapp *:not(input):not(textarea):not(select):not([contenteditable=\"true\"]){-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-touch-callout:none}",
    "html.tsb-inapp input,html.tsb-inapp textarea,html.tsb-inapp [contenteditable=\"true\"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}",
    "html.tsb-inapp ::selection{background:rgba(255,200,0,.30)}",
    "::highlight(tsb-sel){background:rgba(255,200,0,.46);text-decoration:underline;text-decoration-color:rgba(22,19,15,.34);text-decoration-thickness:2px;text-underline-offset:3px}",
    ".iasel-mark{background:linear-gradient(transparent 58%,rgba(255,200,0,.55) 0);border-radius:2px}",
    ".iasel-bar{position:fixed;left:0;top:0;z-index:2147482800;display:flex;align-items:center;gap:2px;padding:6px;border-radius:999px;background:rgba(22,19,15,.96);backdrop-filter:blur(14px);color:#fffdf8;box-shadow:0 16px 40px rgba(22,19,15,.34),0 2px 0 rgba(255,255,255,.06) inset;transform:translateY(10px) scale(.94);opacity:0;pointer-events:none;transition:transform .26s cubic-bezier(.16,1,.3,1),opacity .18s ease}",
    ".iasel-bar.on{opacity:1;transform:none;pointer-events:auto}",
    ".iasel-bar button{display:flex;align-items:center;gap:6px;border:0;border-radius:999px;background:transparent;color:inherit;font:600 13px/1 'Space Grotesk',system-ui,sans-serif;padding:10px 12px;cursor:pointer;white-space:nowrap;transition:background .16s ease,transform .16s ease}",
    ".iasel-bar button:active{transform:scale(.94)}",
    ".iasel-bar button.is-on{background:#ffc800;color:#16130f}",
    ".iasel-bar svg{width:15px;height:15px;flex:none}",
    ".iasel-hd{position:fixed;z-index:2147482790;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:#ffc800;border:2px solid #fffdf8;box-shadow:0 6px 16px rgba(22,19,15,.32);pointer-events:auto;touch-action:none;transition:transform .18s cubic-bezier(.16,1,.3,1),opacity .16s;opacity:0;transform:scale(.6)}",
    ".iasel-hd.on{opacity:1;transform:scale(1)}",
    ".iasel-hd::after{content:'';position:absolute;inset:-11px;border-radius:50%}",
    ".iasel-hd--a{border-bottom-left-radius:6px}",
    ".iasel-hd--b{border-top-right-radius:6px}",
    "@media (prefers-reduced-motion: reduce){.iasel-bar,.iasel-hd{transition:none}}"
  ].join("");
  (document.head || document.documentElement).appendChild(css);
  document.documentElement.className = (document.documentElement.className + " tsb-inapp").trim();

  /* the browser menu for images and links is part of the same noise */
  document.addEventListener("contextmenu", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("input,textarea,[contenteditable=\"true\"]")) return;
    e.preventDefault();
  }, { passive: false });

  /* ---------- 2 · the toolbar ---------- */
  var IC = {
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a3 3 0 0 0-3 3v6.5A2.5 2.5 0 0 0 5.5 15"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>'
  };

  var bar = document.createElement("div");
  bar.className = "iasel-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("translate", "no");
  bar.innerHTML = '<button type="button" data-a="hl">' + IC.pen + "<span>Highlight</span></button>" +
    '<button type="button" data-a="copy">' + IC.copy + "<span>Copy</span></button>" +
    '<button type="button" data-a="share">' + IC.share + "<span>Share</span></button>" +
    '<button type="button" data-a="ex">' + IC.spark + "<span>Explain</span></button>";
  var hdA = document.createElement("div"), hdB = document.createElement("div");
  hdA.className = "iasel-hd iasel-hd--a"; hdB.className = "iasel-hd iasel-hd--b";
  function mount() {
    if (!bar.parentNode) document.body.appendChild(bar);
    if (!hdA.parentNode) document.body.appendChild(hdA);
    if (!hdB.parentNode) document.body.appendChild(hdB);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  /* ---------- 3 · find the word under a point ---------- */
  function caretAt(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) {
      var p = document.caretPositionFromPoint(x, y);
      if (!p) return null;
      var r = document.createRange();
      try { r.setStart(p.offsetNode, p.offset); } catch (e) { return null; }
      r.collapse(true); return r;
    }
    return null;
  }
  function readable(node) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el || el.nodeType !== 1) return false;
    if (el.closest(".iasel-bar,.iasel-hd,.frd-tool,.wt-card,.fs,.tsb-sheet")) return false;
    if (el.closest(SKIP)) return false;
    if (el.closest("script,style,noscript,svg,canvas,video")) return false;
    return true;
  }
  var WORD = /[\p{L}\p{M}\p{N}'’\-]+/gu;
  function wordBox(node, off) {
    if (!node || node.nodeType !== 3) return null;
    var text = node.nodeValue || "";
    if (!text.trim()) return null;
    var m, best = null;
    WORD.lastIndex = 0;
    while ((m = WORD.exec(text))) {
      var s = m.index, e = s + m[0].length;
      if (off >= s && off <= e) { best = { node: node, s: s, e: e }; break; }
      if (s > off) break;
    }
    if (best) return best;
    var near = text.replace(/\s+$/, "");
    return near ? { node: node, s: 0, e: near.length } : null;
  }
  function boxAt(x, y) {
    var r = caretAt(x, y);
    if (!r) return null;
    var node = r.startContainer;
    if (node && node.nodeType === 1) { node = node.childNodes[r.startOffset] || node; }
    if (!node || !readable(node)) return null;
    if (node.nodeType !== 3) {
      var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
      node = walker.nextNode(); if (!node) return null;
    }
    return wordBox(node, r.startOffset);
  }

  /* ---------- 4 · the selection ---------- */
  var sel = { on: false, a: null, f: null, range: null, wraps: [] };

  function cmp(a, b) {
    if (a.node === b.node) return a.s - b.s;
    var pos = a.node.compareDocumentPosition(b.node);
    return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  }
  function buildRange(a, b) {
    var r = document.createRange();
    try {
      if (cmp(a, b) <= 0) { r.setStart(a.node, a.s); r.setEnd(b.node, b.e); }
      else { r.setStart(b.node, b.s); r.setEnd(a.node, a.e); }
    } catch (e) { return null; }
    return r;
  }
  function unwrap() {
    sel.wraps.forEach(function (w) {
      try {
        var p = w.parentNode; if (!p) return;
        while (w.firstChild) p.insertBefore(w.firstChild, w);
        p.removeChild(w); p.normalize();
      } catch (e) {}
    });
    sel.wraps = [];
    try { if (window.CSS && CSS.highlights) CSS.highlights.delete("tsb-sel"); } catch (e) {}
  }
  function paint() {
    unwrap();
    if (!sel.range) return;
    if (window.CSS && CSS.highlights && window.Highlight) {
      try {
        var h = new Highlight(sel.range.cloneRange());
        CSS.highlights.set("tsb-sel", h);
        return;
      } catch (e) {}
    }
    /* older browsers: paint it with a mark, removed the moment the app moves on */
    try {
      var r = sel.range.cloneRange(), mark = document.createElement("span");
      mark.className = "iasel-mark";
      try { r.surroundContents(mark); } catch (e2) { mark.appendChild(r.extractContents()); r.insertNode(mark); }
      sel.wraps.push(mark);
    } catch (e3) {}
  }
  function text() {
    try { return sel.range ? sel.range.toString().replace(/\s+/g, " ").trim() : ""; } catch (e) { return ""; }
  }
  function place() {
    mount();
    if (!sel.range) return;
    var want = sel.range.getBoundingClientRect();
    var bw = bar.offsetWidth, bh = bar.offsetHeight;
    var x = Math.max(10, Math.min(window.innerWidth - bw - 10, want.left + want.width / 2 - bw / 2));
    var y = want.top - bh - 14;
    if (y < 74) y = Math.min(window.innerHeight - bh - 16, want.bottom + 14);
    bar.style.left = Math.round(x) + "px";
    bar.style.top = Math.round(y) + "px";
    bar.classList.add("on");
    /* the two round handles, the same look at both ends of the line */
    var r1 = wordRect(sel.a), r2 = wordRect(sel.f);
    if (!r1 || !r2) { hdA.classList.remove("on"); hdB.classList.remove("on"); return; }
    var aFirst = cmp(sel.a, sel.f) <= 0;
    var first = aFirst ? r1 : r2, last = aFirst ? r2 : r1;
    hdA.style.left = Math.round(first.left + 2) + "px";
    hdA.style.top = Math.round(first.top - 2) + "px";
    hdB.style.left = Math.round(last.right - 2) + "px";
    hdB.style.top = Math.round(last.bottom + 2) + "px";
    hdA.classList.add("on"); hdB.classList.add("on");
  }
  function wordRect(box) {
    if (!box || !box.node || !box.node.parentNode) return null;
    try {
      var r = document.createRange();
      r.setStart(box.node, box.s); r.setEnd(box.node, box.e);
      var rect = r.getBoundingClientRect();
      if (rect && (rect.width || rect.height)) return rect;
      var first = r.getClientRects()[0];
      return first || null;
    } catch (e) { return null; }
  }
  function open(box) {
    if (!box) return;
    sel.on = true; sel.a = box; sel.f = box;
    sel.range = buildRange(box, box);
    paint(); place();
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
    /* the meaning card still answers for a single word */
    var w = wordOf(box);
    if (w && window.TSB_WORD && window.TSB_WORD.open) {
      clearTimeout(meaningT);
      meaningT = setTimeout(function () { if (sel.on && text() === w.t) window.TSB_WORD.open(w.t); }, 420);
    }
  }
  var meaningT = 0;
  function wordOf(box) {
    if (!box) return null;
    var t = (box.node.nodeValue || "").slice(box.s, box.e).trim();
    if (!/^[\p{L}\p{M}][\p{L}\p{M}'’\-]*$/u.test(t)) return null;
    return { t: t, lower: t.toLowerCase() };
  }
  function extend(box) {
    if (!box || !sel.on) return;
    sel.f = box;
    sel.range = buildRange(sel.a, box);
    if (!sel.range) return;
    paint(); place();
  }
  function clear() {
    if (!sel.on) return;
    sel.on = false; sel.range = null; sel.a = null; sel.f = null;
    clearTimeout(meaningT);
    unwrap();
    bar.classList.remove("on");
    hdA.classList.remove("on"); hdB.classList.remove("on");
  }
  window.TSB_SEL_CLEAR = clear;

  /* ---------- 5 · gestures: rest to pick, drag to extend ---------- */
  var press = null;          /* {x, y, t, handle} while a finger is down */
  var dragging = false;

  function down(e) {
    if (e.button != null && e.button > 0) return;
    if (e.target.closest && e.target.closest(".iasel-bar,.iasel-hd")) return;
    if (e.target.closest && e.target.closest(SKIP)) { return; }
    press = { x: e.clientX, y: e.clientY, t: Date.now(), handle: e.target.closest(".iasel-hd") };
    dragging = false;
    if (press.handle) {
      dragging = true;
      try { press.handle.setPointerCapture && press.handle.setPointerCapture(e.pointerId); } catch (e2) {}
      return;
    }
    press.timer = setTimeout(function () {
      if (!press) return;
      var box = boxAt(press.x, press.y);
      if (!box) return;
      dragging = true;
      open(box);
    }, LONG);
  }
  function move(e) {
    if (!press) return;
    var dx = Math.abs(e.clientX - press.x), dy = Math.abs(e.clientY - press.y);
    if (!dragging) {
      if (dx > SLOP || dy > SLOP) { clearTimeout(press.timer); press = null; }
      return;
    }
    if (e.cancelable) e.preventDefault();
    extend(boxAt(e.clientX, e.clientY) || sel.f);
  }
  var gestureEnd = 0;        /* the finger that made the selection must not clear it */
  function up() {
    if (press && press.timer) clearTimeout(press.timer);
    if (dragging) gestureEnd = Date.now();
    press = null; dragging = false;
  }
  document.addEventListener("pointerdown", down, { passive: true, capture: true });
  document.addEventListener("pointermove", move, { passive: false, capture: true });
  document.addEventListener("pointerup", up, true);
  document.addEventListener("pointercancel", up, true);
  /* a long press must not start a scroll underneath the finger */
  document.addEventListener("touchmove", function (e) {
    if (dragging && sel.on && e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener("scroll", function () { if (sel.on) place(); }, true);
  window.addEventListener("resize", function () { if (sel.on) place(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") clear(); });

  /* a tap anywhere else puts the app back to normal */
  document.addEventListener("pointerup", function (e) {
    if (!sel.on) return;
    if (e.target.closest && e.target.closest(".iasel-bar,.iasel-hd,.wt-card,.fs")) return;
    if (dragging || Date.now() - gestureEnd < 450) return;
    clear();
  }, true);

  /* ---------- 6 · what the four buttons do ---------- */
  function bookId() {
    try {
      var id = new URLSearchParams(location.search).get("id");
      if (id) return id;
      var m = location.pathname.match(/\/books\/([a-z0-9-]+)\.html$/);
      return m ? m[1] : "";
    } catch (e) { return ""; }
  }
  function bookTitle() {
    var t = (document.querySelector("h1") || {}).textContent || document.title || "";
    return t.replace(/\s*[|\u00b7-]\s*TheSmallBook.*$/i, "").trim();
  }
  function toast(msg) {
    if (window.TSB && window.TSB.toast) { try { window.TSB.toast(msg); return; } catch (e) {} }
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:2147482900;background:#16130f;color:#fffdf8;font:600 13px 'Space Grotesk',system-ui;padding:11px 16px;border-radius:999px;box-shadow:0 12px 30px rgba(0,0,0,.3);opacity:0;transition:opacity .2s";
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = "1"; });
    setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 260); }, 1600);
  }
  function highlight() {
    var t = text(); if (!t || !sel.range) return;
    try {
      var r = sel.range.cloneRange(), mark = document.createElement("mark");
      mark.className = "frd-hl";
      try { r.surroundContents(mark); } catch (e1) { mark.appendChild(r.extractContents()); r.insertNode(mark); }
      mark.animate ? mark.animate([{ backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%" }], { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" }) : 0;
      var id = bookId();
      if (id) {
        var k = "tsb_hl_" + id, list = [];
        try { list = JSON.parse(localStorage.getItem(k) || "[]") || []; } catch (e2) { list = []; }
        if (!list.push) list = [];
        list.push({ t: t.slice(0, 400), p: null, d: new Date().toISOString().slice(0, 10) });
        if (list.length > 300) list = list.slice(-300);
        try { localStorage.setItem(k, JSON.stringify(list)); } catch (e3) {}
      }
      toast("Highlighted");
      clear();
    } catch (e4) { toast("Could not highlight that line"); }
  }
  function copy() {
    var t = text(); if (!t) return;
    var line = "\u201c" + t + "\u201d " + (bookTitle() || "TheSmallBook") + " \u00b7 thesmallbook.in";
    function done() { toast("Copied"); clear(); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(line).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = line; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove(); done();
    }
  }
  function share() {
    var t = text(); if (!t) return;
    var q = t.length > 260 ? t.slice(0, 257).replace(/\s+\S*$/, "") + "\u2026" : t;
    if (window.TSB_SHARE_CARD) { window.TSB_SHARE_CARD({ id: bookId(), title: bookTitle(), author: "", quote: q }); clear(); return; }
    if (window.TSB_SHARE && window.TSB_SHARE.open) {
      try { window.TSB_SHARE.open({ text: q, title: bookTitle() }); clear(); return; } catch (e) {}
    }
    if (navigator.share) {
      navigator.share({ title: bookTitle(), text: "\u201c" + q + "\u201d", url: location.href }).then(clear, function () {});
      return;
    }
    copy();
  }
  function explain() {
    var t = text(); if (!t) return;
    location.href = "chat.html?arg=" + encodeURIComponent("Explain this line from " + (bookTitle() || "this book") +
      " in simple words, with one example from daily life: \u201c" + t.slice(0, 300) + "\u201d");
  }

  bar.addEventListener("pointerdown", function (e) { e.preventDefault(); });
  bar.addEventListener("mousedown", function (e) { e.preventDefault(); });
  bar.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-a]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var a = b.getAttribute("data-a");
    if (a === "hl") highlight();
    else if (a === "copy") copy();
    else if (a === "share") share();
    else if (a === "ex") explain();
  });
  hdA.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
  hdB.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
})();
