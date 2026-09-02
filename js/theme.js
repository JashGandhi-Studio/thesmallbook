/* ============================================================
   THESMALLBOOK — 🌓 THEME ENGINE (theme.js)
   Three modes: "light" | "dark" | "auto" (follows the OS).

   Back-compat: the old code stored localStorage tsb_theme = '"dark"'
   (JSON string) and toggled html.dark. Both are preserved, so the
   existing toggle button and the pre-paint inline snippet keep
   working while Settings gains a proper 3-way control.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "tsb_theme";
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return "light";
      var v = raw;
      try { v = JSON.parse(raw); } catch (e) {}      /* legacy '"dark"' */
      return (v === "dark" || v === "light" || v === "auto") ? v : "light";
    } catch (e) { return "light"; }
  }

  function write(mode) {
    /* keep the legacy JSON-string format so the pre-paint snippet
       in every existing page still matches on '"dark"' */
    try { localStorage.setItem(KEY, JSON.stringify(mode)); } catch (e) {}
  }

  function resolved(mode) {
    if (mode === "auto") return (mq && mq.matches) ? "dark" : "light";
    return mode;
  }

  function apply(mode) {
    var dark = resolved(mode) === "dark";
    root.classList.toggle("dark", dark);
    root.classList.toggle("theme-auto", mode === "auto");
    root.setAttribute("data-theme", mode);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0E0E10" : "#FFC800");

    try {
      document.dispatchEvent(new CustomEvent("tsb:theme", {
        detail: { mode: mode, dark: dark }
      }));
    } catch (e) {}
  }

  function set(mode) {
    if (mode !== "light" && mode !== "dark" && mode !== "auto") mode = "light";
    write(mode);
    apply(mode);
    return mode;
  }

  function toggle() {
    /* legacy 2-way toggle: whatever it looks like now, flip it */
    return set(resolved(read()) === "dark" ? "light" : "dark");
  }

  /* react to OS changes while in auto */
  if (mq) {
    var onChange = function () { if (read() === "auto") apply("auto"); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* keep tabs in sync */
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) apply(read());
  });

  apply(read());

  window.TSB_THEME = {
    get: read,
    set: set,
    toggle: toggle,
    resolved: function () { return resolved(read()); },
    MODES: ["light", "dark", "auto"]
  };
})();
