/* v376 · BACK MEANS BACK.
   Every back control in the app asks the same question: where did this reader
   come from? If the answer is another window of this app, we return there, so a
   story opened from Stories goes back to Stories and a book opened from the
   Library goes back to the Library. The fixed destination is only a fallback
   for a cold open, where there is no history to walk back through. */
(function () {
  "use strict";
  function tabHome() {
    try {
      var t = localStorage.getItem("tsb_from_tab");
      if (t) return "/" + String(t).replace(/^\/+/, "").replace(/\.html$/, "") + ".html";
    } catch (e) {}
    return "index.html";
  }
  function cameFromThisApp() {
    try {
      var r = document.referrer || "";
      return r.indexOf(location.origin) === 0;
    } catch (e) { return false; }
  }
  function go(fallback) {
    try {
      if (cameFromThisApp() && history.length > 1) { history.back(); return; }
    } catch (e) {}
    location.href = fallback || tabHome();
  }
  window.TSB_BACK = { go: go, tabHome: tabHome, cameFromThisApp: cameFromThisApp };
  /* any control that opts in: <a data-tsb-back href="fallback"> */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-tsb-back]") : null;
    if (!el) return;
    ev.preventDefault();
    go(el.getAttribute("href"));
  }, true);
})();
