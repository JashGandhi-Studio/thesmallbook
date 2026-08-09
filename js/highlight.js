/* ============================================================
   THESMALLBOOK — ✏️ HIGHLIGHTER (highlight.js)
   Users select any text in a lesson → floating pencil button →
   saved to localStorage → yellow marker style on reload.
   Click a marker to remove it. Works offline. No backend.
   ============================================================ */
(function () {
  if (!/book\.html/.test(location.pathname)) return; // lessons live on book.html only

  var KEY = "tsb_highlights_v1";
  var MIN = 3, MAX = 600;

  function get() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {}
  }

  /* ---------- styles ---------- */
  function css() {
    if (document.getElementById("tsb-hl-style")) return;
    var st = document.createElement("style");
    st.id = "tsb-hl-style";
    st.textContent = `
      .tsb-hl {
        background: var(--yellow, #ffc800);
        color: var(--ink, #111);
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        cursor: pointer;
        border-bottom: 2px solid var(--ink, #111);
        padding: 0 1px;
        border-radius: 2px;
        transition: background .15s;
      }
      .tsb-hl:hover { background: #ffd940; }
      html.dark .tsb-hl { background: #e6b400; color: #111; }
      /* floating pencil chip */
      .tsb-hl-btn {
        position: fixed; z-index: 9999;
        display: flex; align-items: center; gap: 6px;
        background: var(--paper, #fffdf5); color: var(--ink, #111);
        border: 3px solid var(--ink, #111);
        box-shadow: 3px 3px 0 var(--ink, #111);
        font-family: "Archivo Black", sans-serif; font-size: 11px;
        letter-spacing: 1px; padding: 7px 12px; cursor: pointer;
        animation: tsbHlPop .18s cubic-bezier(.2,1.4,.4,1);
      }
      .tsb-hl-btn:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 var(--ink,#111); }
      @keyframes tsbHlPop { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      /* confirm-to-remove chip */
      .tsb-hl-confirm {
        position: fixed; z-index: 10000; display: flex; align-items: center; gap: 6px;
        background: var(--paper,#fffdf5); border: 3px solid var(--ink,#111);
        box-shadow: 3px 3px 0 var(--ink,#111);
        font-family: "Archivo Black", sans-serif; font-size: 10px; letter-spacing: .5px;
        padding: 6px 10px; animation: tsbHlPop .15s cubic-bezier(.2,1.4,.4,1);
      }
      .tsb-hl-confirm .q { color: var(--ink,#111); }
      .tsb-hl-confirm button { border: 2.5px solid var(--ink,#111); font-family: "Archivo Black", sans-serif; font-size: 11px; cursor: pointer; padding: 3px 8px; line-height: 1; }
      .tsb-hl-confirm .yes { background: var(--red,#ff4d4d); color: #fff; }
      .tsb-hl-confirm .yes:hover { transform: translate(-1px,-1px); }
      .tsb-hl-confirm .no { background: var(--paper,#fffdf5); color: var(--ink,#111); }
      .tsb-hl-confirm .no:hover { background: var(--yellow,#ffc800); }
    `;
    document.head.appendChild(st);
  }

  /* ---------- find a lesson's body element ---------- */
  function lessonBodyOf(lessonEl) {
    return lessonEl && lessonEl.querySelector(".lesson__body");
  }

  /* ---------- apply saved highlights on load ---------- */
  function applyAll() {
    var map = get();
    var bookId = currentBookId();
    if (!bookId || !map[bookId]) return;
    document.querySelectorAll(".lesson").forEach(function (lessonEl) {
      var idx = lessonIndex(lessonEl);
      if (idx === null) return;
      var marks = (map[bookId] || []).filter(function (h) { return h.lesson === idx; });
      if (!marks.length) return;
      var body = lessonBodyOf(lessonEl);
      if (!body) return;
      marks.forEach(function (h) {
        if (!h.text) return;
        wrapText(body, h.text, idx);
      });
    });
  }

  function currentBookId() {
    try {
      var m = location.search.match(/[?&]id=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }
  function lessonIndex(lessonEl) {
    if (!lessonEl || !lessonEl.id) return null;
    var m = lessonEl.id.match(/^lesson-(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  }

  /* wrap the FIRST occurrence of `text` inside `root` with a <mark> */
  function wrapText(root, text, lessonIdx) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var idx = node.textContent.indexOf(text);
      if (idx === -1) continue;
      var range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + text.length);
      var mark = document.createElement("mark");
      mark.className = "tsb-hl";
      mark.dataset.hl = "1";
      mark.dataset.lesson = lessonIdx;
      mark.textContent = text;
      try {
        range.deleteContents();
        range.insertNode(mark);
      } catch (e) {}
      mark.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        confirmRemove(mark, ev);
      });
      return true;
    }
    return false;
  }

  /* ---------- selection → pencil button ---------- */
  var btn = null;
  function hideBtn() {
    if (btn) { btn.remove(); btn = null; }
  }

  function onSelect() {
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { hideBtn(); return; }
      var text = sel.toString().trim();
      if (text.length < MIN || text.length > MAX) { hideBtn(); return; }

      var lessonEl = sel.anchorNode && sel.anchorNode.nodeType === 3
        ? sel.anchorNode.parentElement.closest(".lesson")
        : (sel.anchorNode && sel.anchorNode.closest ? sel.anchorNode.closest(".lesson") : null);
      if (!lessonEl) { hideBtn(); return; }
      var body = lessonBodyOf(lessonEl);
      if (!body || !body.contains(sel.anchorNode) && !body.contains(sel.focusNode)) { hideBtn(); return; }

      var rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) { hideBtn(); return; }

      hideBtn();
      btn = document.createElement("button");
      btn.className = "tsb-hl-btn";
      btn.textContent = "✏️ HIGHLIGHT";
      btn.style.left = Math.min(Math.max(rect.left + rect.width / 2 - 55, 8), window.innerWidth - 130) + "px";
      btn.style.top = Math.max(rect.top - 46, 8) + "px";
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopPropagation(); });
      btn.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        var sel2 = window.getSelection();
        var t = sel2 ? sel2.toString().trim() : "";
        if (t.length >= MIN && t.length <= MAX) {
          addHighlight(lessonIndex(lessonEl), t);
          try { sel2.removeAllRanges(); } catch (err) {}
        }
        hideBtn();
      });
      document.body.appendChild(btn);
      setTimeout(hideBtn, 6000);
    }, 10);
  }

  /* ---------- add / remove ---------- */
  function addHighlight(lessonIdx, text) {
    var bookId = currentBookId();
    if (!bookId || lessonIdx === null) return;
    var map = get();
    if (!map[bookId]) map[bookId] = [];
    map[bookId] = map[bookId].filter(function (h) { return !(h.lesson === lessonIdx && h.text === text); });
    map[bookId].push({ lesson: lessonIdx, text: text, ts: Date.now() });
    save(map);
    // apply visually
    var lessonEl = document.getElementById("lesson-" + lessonIdx);
    if (lessonEl) wrapText(lessonBodyOf(lessonEl), text, lessonIdx);
    toast("✏️ HIGHLIGHTED ✓");
  }

  function removeHighlight(mark) {
    var bookId = currentBookId();
    var lessonIdx = parseInt(mark.dataset.lesson || "-1", 10);
    var text = mark.textContent;
    var map = get();
    if (bookId && map[bookId]) {
      map[bookId] = map[bookId].filter(function (h) { return !(h.lesson === lessonIdx && h.text === text); });
      save(map);
    }
    var parent = mark.parentNode;
    if (parent) {
      var txt = document.createTextNode(mark.textContent);
      parent.replaceChild(txt, mark);
      parent.normalize();
    }
    toast("HIGHLIGHT REMOVED");
  }

  /* click a marker → small "REMOVE?" chip; only YES removes (no accidents) */
  var confirmChip = null;
  function dismissConfirm() {
    if (confirmChip) { confirmChip.remove(); confirmChip = null; }
  }
  function confirmRemove(mark, ev) {
    dismissConfirm();
    var rect = mark.getBoundingClientRect();
    confirmChip = document.createElement("div");
    confirmChip.className = "tsb-hl-confirm";
    confirmChip.innerHTML = '<span class="q">REMOVE HIGHLIGHT?</span>' +
      '<button class="yes" type="button">✓ YES</button>' +
      '<button class="no" type="button">✕ NO</button>';
    confirmChip.style.left = Math.min(Math.max(rect.left + rect.width / 2 - 70, 8), window.innerWidth - 160) + "px";
    confirmChip.style.top = Math.max(rect.top - 42, 8) + "px";
    confirmChip.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopPropagation(); });
    document.body.appendChild(confirmChip);

    confirmChip.querySelector(".yes").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      dismissConfirm();
      removeHighlight(mark);
    });
    confirmChip.querySelector(".no").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      dismissConfirm();
    });
    // dismiss on outside click / scroll
    setTimeout(function () {
      document.addEventListener("mousedown", dismissConfirm, { once: true, capture: true });
    }, 0);
    setTimeout(dismissConfirm, 5000);
  }

  function toast(msg) {
    try {
      document.querySelectorAll(".tsb-hl-toast").forEach(function (t) { t.remove(); });
      var t = document.createElement("div");
      t.className = "tsb-hl-toast";
      t.style.cssText = "position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:10001;background:#111;color:#ffc800;border:3px solid #ffc800;box-shadow:6px 6px 0 #00c48c;padding:12px 22px;font-family:'Archivo Black',sans-serif;font-size:12px;letter-spacing:.5px";
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2200);
    } catch (e) {}
  }

  /* ---------- boot ---------- */
  function boot() {
    css();
    setTimeout(applyAll, 400);
    document.addEventListener("mouseup", onSelect);
    document.addEventListener("touchend", onSelect, { passive: true });
    document.addEventListener("scroll", hideBtn, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* public (also testable) */
  window.TSB_HL = {
    list: function () { return get(); },
    count: function () {
      var m = get()[currentBookId() || ""];
      return m ? m.length : 0;
    },
    add: addHighlight,
    remove: removeHighlight,
    applyAll: applyAll,
    wrapText: wrapText
  };
})();
