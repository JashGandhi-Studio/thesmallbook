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
  var KEY = "tsb_day_part";
  function part(h) {
    if (h >= 6 && h < 11) return "morning";
    if (h >= 11 && h < 17) return "afternoon";
    if (h >= 17 && h < 21) return "evening";
    return "night";
  }
  function paint() {
    var h = new Date().getHours(), p = part(h);
    document.documentElement.setAttribute("data-day", p);
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
  document.addEventListener("visibilitychange", function () { if (!document.hidden) paint(); });
  window.TSB_DAY = { part: part, paint: paint };
})();
