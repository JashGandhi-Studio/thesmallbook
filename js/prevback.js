/* v372 · the previous-window back action, top left, wherever a book or a page is
   open. Returns to the window the reader came from; with no history it falls
   back to the tab the book was opened from. Never draws itself twice. */
(function () {
  "use strict";
  function existing() {
    return document.querySelector("[data-tsb-back]") || document.querySelector(
      "#rBack, .cm-top__back, .accsub__back, .fs2-back, .nt-back, .cf-back, .yr-back, .iaudit__back, [data-back]"
    );
  }
  function tabHome() {
    try {
      var t = localStorage.getItem("tsb_from_tab");
      if (t) return "/" + String(t).replace(/^\/+/, "").replace(/\.html$/, "") + ".html";
    } catch (e) {}
    return "/index.html";
  }
  function mount() {
    if (existing()) return;
    var sameOrigin = false;
    try { sameOrigin = !!document.referrer && document.referrer.indexOf(location.origin) === 0; } catch (e) {}
    if (!sameOrigin && history.length < 2) return;
    var style = document.createElement("style");
    style.textContent = ".tsb-prevwin{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:12px;z-index:9400;width:42px;height:42px;display:grid;place-items:center;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:var(--paper,#FFFDF7);color:var(--ink,#171512);box-shadow:0 6px 18px rgba(0,0,0,.14);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .16s ease}.tsb-prevwin:active{transform:scale(.94)}html[data-theme='dark'] .tsb-prevwin{background:#221F1B;color:#F2EAD8;border-color:rgba(255,255,255,.16)}@media(prefers-reduced-motion:reduce){.tsb-prevwin{transition:none}}";
    document.head.appendChild(style);
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tsb-prevwin";
    b.setAttribute("data-tsb-back", "1");
    b.setAttribute("aria-label", "Back");
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.addEventListener("click", function () {
      try { if (history.length > 1) { history.back(); return; } } catch (e) {}
      location.href = tabHome();
    });
    document.body.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
  window.addEventListener("tsb:auth", mount);
})();
