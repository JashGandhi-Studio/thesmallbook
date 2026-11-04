/* ============================================================
   v362 · THE MARK KNOWS WHAT TIME IT IS
   One clock for the whole app. The logo, the splash field and the accent are
   tinted by the hour the reader is actually in, everywhere, from one file, so
   no page can drift out of step.
     morning 6-11   fresh, high light
     afternoon 11-17 warm and flat
     evening 17-21 amber, low sun
     night 21-6    deep ink with gold
   ============================================================ */
(function () {
  /* v378 · the tab icon is the same mark, in the same hour.
     The home-screen shortcut keeps the icon it was installed with (no browser
     lets a page repaint that), but every tab, bookmark and share sheet picks up
     the mark for the time of day. */
  function paintFavicon(part) {
    try {
      var href = "assets/logo/day-" + part + ".svg";
      var links = document.querySelectorAll('link[rel="icon"][type="image/svg+xml"]');
      if (!links.length) {
        var l = document.createElement("link");
        l.rel = "icon"; l.type = "image/svg+xml"; l.setAttribute("data-day-favicon", "1");
        document.head.appendChild(l);
        links = [l];
      }
      for (var i = 0; i < links.length; i++) links[i].setAttribute("href", href);
    } catch (e) {}
  }

  var KEY = "tsb_day_part";
  function part(h) {
    if (h >= 6 && h < 11) return "morning";
    if (h >= 11 && h < 17) return "afternoon";
    if (h >= 17 && h < 21) return "evening";
    return "night";
  }
  function paint() {
    var h = new Date().getHours(), p = part(h);
    paintFavicon(p); document.documentElement.setAttribute("data-day", p);
    try { localStorage.setItem(KEY, p); } catch (e) {}
    var TC = { morning: "#FFD34D", afternoon: "#FFC800", evening: "#F0A81E", night: "#16130E" }[p];
    try {
      var mt = document.querySelector('meta[name="theme-color"]');
      if (!mt) { mt = document.createElement("meta"); mt.name = "theme-color"; document.head.appendChild(mt); }
      /* the reader's own theme wins when it has set one */
      if (!document.documentElement.getAttribute("data-rm")) mt.content = TC;
    } catch (e2) {}
  }
  paint();
  setInterval(paint, 60000);
  /* testable hook: nothing in the app depends on this, it only lets a check
     ask "what would the mark look like at 7 in the evening" */
  try { window.TSB_DAYLIGHT = { paint: paint, part: part }; } catch (e) {}

  document.addEventListener("visibilitychange", function () { if (!document.hidden) paint(); });
  window.TSB_DAY = { part: part, paint: paint };
})();
