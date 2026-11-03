/* ============================================================
   The mark changes with the hour, the way a library does.
     morning   05:00 - 11:59   the book sits on signal yellow
     afternoon 12:00 - 16:59   the book sits on paper
     night     17:00 - 04:59   the book sits on ink
   One class on <html>, set before the first paint (this file is loaded with
   `defer` from the head of every page that carries the mark), so the mark is
   the right one from the first frame instead of swapping in late.
   ============================================================ */
(function () {
  var root = document.documentElement;
  if (!root) return;
  var last = "";
  function period() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return "am";
    if (h >= 12 && h < 17) return "pm";
    return "night";
  }
  function paint() {
    var p = period();
    if (p === last) return;
    last = p;
    root.classList.remove("tod-am", "tod-pm", "tod-night");
    root.classList.add("tod-" + p);
    try { root.setAttribute("data-tod", p); } catch (e) {}
  }
  paint();
  /* a page left open all afternoon should turn with the afternoon */
  setInterval(paint, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) paint(); });
})();
