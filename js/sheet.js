/* ============================================================
   THESMALLBOOK — BOTTOM SHEET
   One reusable slide-up panel used by the app shell. The You tab opens
   here instead of navigating to a page, so the app never "leaves" the
   screen you were reading.

   Transform/opacity only, so the animation stays on the compositor and
   holds 60/120fps. Honours prefers-reduced-motion.

   window.TSB_SHEET = { open({title, html, onMount}), close(), isOpen() }
   ============================================================ */

(function () {
  "use strict";

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var root = null;      // .sh-wrap
  var panel = null;     // .sh
  var lastFocus = null;
  var openFlag = false;

  /* ---------- styles (self-injected, once) ---------- */
  function css() {
    if (document.getElementById("shcss")) return;
    var s = document.createElement("style");
    s.id = "shcss";
    s.textContent = [
      ".sh-wrap{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;",
      "justify-content:center;pointer-events:none}",
      ".sh-scrim{position:absolute;inset:0;background:rgba(8,8,10,.5);opacity:0;",
      "transition:opacity .22s ease;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}",
      ".sh-wrap.is-open{pointer-events:auto}",
      ".sh-wrap.is-open .sh-scrim{opacity:1}",

      ".sh{position:relative;width:100%;max-width:560px;max-height:88vh;",
      "background:var(--surface-1);color:var(--text-1);",
      "border:2.5px solid var(--tsb-black);border-bottom:none;",
      "border-radius:24px 24px 0 0;box-shadow:0 -8px 0 rgba(0,0,0,.06);",
      "display:flex;flex-direction:column;overflow:hidden;",
      "transform:translateY(100%);transition:transform .34s cubic-bezier(.16,1,.3,1);",
      "will-change:transform}",
      ".sh-wrap.is-open .sh{transform:translateY(0)}",
      "html.dark .sh{border-color:#F2F2F2}",

      ".sh__grip{flex:none;display:flex;justify-content:center;padding:10px 0 2px}",
      ".sh__grip i{width:42px;height:5px;border-radius:9px;background:var(--surface-inset);display:block}",

      ".sh__head{flex:none;display:flex;align-items:center;gap:10px;",
      "padding:6px 18px 12px}",
      ".sh__title{margin:0;font-family:var(--font-head,inherit);font-size:1.05rem;",
      "text-transform:uppercase;letter-spacing:.5px;flex:1}",
      ".sh__x{width:34px;height:34px;flex:none;display:grid;place-items:center;",
      "border-radius:11px;border:2px solid var(--tsb-black);background:var(--surface-2);",
      "color:var(--text-1);cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1)}",
      ".sh__x:active{transform:scale(.94)}",
      "html.dark .sh__x{border-color:rgba(255,255,255,.5)}",
      ".sh__x svg{width:17px;height:17px}",

      ".sh__body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;",
      "overscroll-behavior:contain;padding:0 18px calc(22px + env(safe-area-inset-bottom))}",

      "@media(prefers-reduced-motion:reduce){",
      ".sh{transition:none}.sh-scrim{transition:none}}"
    ].join("");
    document.head.appendChild(s);
  }

  var X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
    'stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function build() {
    css();
    root = document.createElement("div");
    root.className = "sh-wrap";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.hidden = true;
    root.innerHTML =
      '<div class="sh-scrim" data-sh-close></div>' +
      '<section class="sh" role="document">' +
        '<div class="sh__grip"><i></i></div>' +
        '<div class="sh__head">' +
          '<h2 class="sh__title" id="shTitle"></h2>' +
          '<button class="sh__x" type="button" data-sh-close aria-label="Close">' + X + "</button>" +
        "</div>" +
        '<div class="sh__body" id="shBody"></div>' +
      "</section>";
    document.body.appendChild(root);
    panel = root.querySelector(".sh");

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-sh-close]")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openFlag) close();
    });
    return root;
  }

  function open(opts) {
    opts = opts || {};
    if (!root) build();

    root.querySelector("#shTitle").textContent = opts.title || "";
    var body = root.querySelector("#shBody");
    body.innerHTML = opts.html || "";
    body.scrollTop = 0;

    lastFocus = document.activeElement;
    root.hidden = false;
    /* force a frame so the transform transition actually runs */
    void root.offsetHeight;
    root.classList.add("is-open");
    openFlag = true;
    document.body.style.overflow = "hidden";

    if (typeof opts.onMount === "function") {
      try { opts.onMount(body); } catch (e) {}
    }
    var f = body.querySelector("button,a,input,select,textarea");
    if (f && f.focus) { try { f.focus({ preventScroll: true }); } catch (e) {} }

    root.setAttribute("aria-label", opts.title || "Panel");
    return body;
  }

  function close() {
    if (!root || !openFlag) return;
    openFlag = false;
    root.classList.remove("is-open");
    document.body.style.overflow = "";

    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      root.hidden = true;
      if (lastFocus && lastFocus.focus) {
        try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
      }
    };
    if (REDUCED) return finish();
    panel.addEventListener("transitionend", finish, { once: true });
    /* transitionend can be missed if the tab is backgrounded */
    setTimeout(finish, 420);
  }

  window.TSB_SHEET = {
    open: open,
    close: close,
    isOpen: function () { return openFlag; }
  };
})();
