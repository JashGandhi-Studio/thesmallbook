/* ============================================================
   THESMALLBOOK — MOBILE BETA APP SHELL
   Optional, phone-first reading experience. It is intentionally
   opt-in and stored per visitor in localStorage as tsb_mobile_beta.
   Desktop always stays on the original website experience.
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "tsb_mobile_beta";
  var MOBILE_QUERY = "(max-width: 760px)";
  var media = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : { matches: false };
  var root = document.documentElement;

  function getSetting() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) === true;
    } catch (e) {
      return false;
    }
  }

  function saveSetting(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(!!value)); } catch (e) {}
  }

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function pageType() {
    if (document.body.classList.contains("graveyard-page") || document.getElementById("graveGrid")) return "graveyard";
    if (document.getElementById("lessons")) return "reader";
    if (document.getElementById("grid")) return "shelf";
    return "other";
  }

  function toast(message) {
    var old = document.getElementById("tsb-beta-toast");
    if (old) old.remove();
    var el = document.createElement("div");
    el.id = "tsb-beta-toast";
    el.className = "tsb-beta-toast";
    el.setAttribute("role", "status");
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("is-visible"); });
    setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () { if (el.parentNode) el.remove(); }, 240);
    }, 2800);
  }

  function readingState() {
    var books = Array.isArray(window.BOOKS) ? window.BOOKS : [];
    var progress = {};
    try {
      progress = window.TSB && TSB.progress ? TSB.progress.all() : JSON.parse(localStorage.getItem("tsb_progress") || "{}");
    } catch (e) { progress = {}; }

    var lessons = 0;
    var started = 0;
    var finished = 0;
    books.forEach(function (book) {
      var read = Array.isArray(progress[book.id]) ? progress[book.id].length : 0;
      lessons += read;
      if (read) started++;
      if (book.lessons && read >= book.lessons.length) finished++;
    });

    var streak = 0;
    try { streak = window.TSB && TSB.streak ? TSB.streak.count() : 0; } catch (e) {}
    var last = null;
    try { last = window.TSB && TSB.lastRead ? TSB.lastRead.get() : null; } catch (e) {}
    var current = last && books.find(function (book) { return book.id === last.id; });
    return { lessons: lessons, started: started, finished: finished, streak: streak, current: current };
  }

  function activeTab(type, target) {
    if (type === target) return " is-active";
    if (type === "reader" && target === "shelf") return " is-reader";
    return "";
  }

  function progressMarkup() {
    var state = readingState();
    var continueBlock = state.current
      ? '<a class="tsb-beta-resume" href="book.html?id=' + encodeURIComponent(state.current.id) + '">' +
          '<span class="tsb-beta-resume__icon">▶</span><span><small>KEEP READING</small><b>' + esc(state.current.title) + '</b></span><span aria-hidden="true">→</span></a>'
      : '<a class="tsb-beta-resume" href="index.html#library"><span class="tsb-beta-resume__icon">✦</span><span><small>START YOUR FIRST READ</small><b>Find a book for today</b></span><span aria-hidden="true">→</span></a>';

    return '<div class="tsb-beta-sheet__eyebrow">YOUR READING LOG</div>' +
      '<h2>Small steps.<br><span>Real momentum.</span></h2>' +
      '<div class="tsb-beta-metrics">' +
        '<div><b>' + state.lessons + '</b><span>lessons read</span></div>' +
        '<div><b>' + state.streak + '</b><span>day streak</span></div>' +
        '<div><b>' + state.finished + '</b><span>books finished</span></div>' +
      '</div>' + continueBlock +
      '<p class="tsb-beta-sheet__note">Your reading progress stays private and is saved on this device.</p>';
  }

  function closeProgress() {
    var sheet = document.getElementById("tsb-beta-progress-sheet");
    var veil = document.getElementById("tsb-beta-veil");
    if (sheet) { sheet.classList.remove("is-open"); sheet.setAttribute("aria-hidden", "true"); }
    if (veil) { veil.classList.remove("is-open"); veil.hidden = true; }
  }

  function openProgress() {
    var sheet = document.getElementById("tsb-beta-progress-sheet");
    var veil = document.getElementById("tsb-beta-veil");
    if (!sheet) return;
    var content = sheet.querySelector(".tsb-beta-sheet__content");
    if (content) content.innerHTML = progressMarkup();
    if (veil) { veil.hidden = false; requestAnimationFrame(function () { veil.classList.add("is-open"); }); }
    sheet.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { sheet.classList.add("is-open"); });
  }

  function removePageIntro() {
    document.querySelectorAll(".tsb-beta-home-intro, .tsb-beta-grave-intro, .tsb-beta-reader-note").forEach(function (node) { node.remove(); });
  }

  function createPageIntro(type) {
    removePageIntro();
    var state = readingState();

    if (type === "shelf") {
      var hero = document.querySelector(".hero");
      if (!hero || !hero.parentNode) return;
      var resume = state.current
        ? '<a class="tsb-beta-home-intro__continue" href="book.html?id=' + encodeURIComponent(state.current.id) + '"><span>CONTINUE</span><b>' + esc(state.current.title) + '</b><i>→</i></a>'
        : '<a class="tsb-beta-home-intro__continue" href="#library"><span>START READING</span><b>Find one idea for today</b><i>→</i></a>';
      var intro = document.createElement("section");
      intro.className = "tsb-beta-home-intro";
      intro.innerHTML = '<div class="tsb-beta-home-intro__copy"><span class="tsb-beta-kicker">YOUR POCKET LIBRARY</span><h1>Read less.<br><em>Keep more.</em></h1><p>One useful idea is enough for today.</p></div>' +
        '<div class="tsb-beta-home-intro__stats"><span><b>' + state.lessons + '</b> lessons</span><span><b>' + state.streak + '🔥</b> streak</span></div>' + resume;
      hero.parentNode.insertBefore(intro, hero);
      return;
    }

    if (type === "graveyard") {
      var graveHero = document.querySelector(".hero--grave");
      if (!graveHero || !graveHero.parentNode) return;
      var archive = document.createElement("section");
      archive.className = "tsb-beta-grave-intro";
      archive.innerHTML = '<div><span class="tsb-beta-kicker">THE FAILURE ARCHIVE</span><h1>Every file<br>has a <em>price.</em></h1><p>Read the post-mortem. Keep the lesson.</p></div><span class="tsb-beta-grave-intro__mark">.RIP</span>';
      graveHero.parentNode.insertBefore(archive, graveHero);
      /* Beta starts as a clean case-file list, not with an arbitrary grave open. */
      document.querySelectorAll(".grave.open").forEach(function (grave) { grave.classList.remove("open"); });
      return;
    }

    if (type === "reader") {
      var bookHero = document.querySelector(".bookhero");
      if (!bookHero || !bookHero.parentNode) return;
      var title = document.getElementById("title");
      var note = document.createElement("div");
      note.className = "tsb-beta-reader-note";
      note.innerHTML = '<a href="index.html#library" aria-label="Back to shelf">← <span>SHELF</span></a><span>FOCUS READER</span><button type="button" data-beta-progress>◌ <span>PROGRESS</span></button>';
      bookHero.parentNode.insertBefore(note, bookHero);
      var progressButton = note.querySelector("[data-beta-progress]");
      if (progressButton) progressButton.addEventListener("click", openProgress);
      if (title && title.textContent) note.setAttribute("data-book", title.textContent.trim());
    }
  }

  function createShell() {
    var old = document.getElementById("tsb-mobile-beta-shell");
    if (old) old.remove();

    var type = pageType();
    var shell = document.createElement("div");
    shell.id = "tsb-mobile-beta-shell";
    shell.innerHTML =
      '<header class="tsb-beta-topbar">' +
        '<a class="tsb-beta-brand" href="index.html" aria-label="TheSmallBook shelf"><span class="tsb-beta-brand__mark">📕</span><span><b>The<span>Small</span>Book</b><small>MOBILE BETA</small></span></a>' +
        '<button class="tsb-beta-classic" type="button" data-beta-exit title="Switch back to the original website">CLASSIC <span>↗</span></button>' +
      '</header>' +
      '<button id="tsb-beta-veil" class="tsb-beta-veil" type="button" aria-label="Close reading progress" hidden></button>' +
      '<aside id="tsb-beta-progress-sheet" class="tsb-beta-progress-sheet" aria-hidden="true" aria-label="Your reading progress">' +
        '<button class="tsb-beta-sheet__close" type="button" data-beta-progress-close aria-label="Close">×</button>' +
        '<div class="tsb-beta-sheet__content"></div>' +
      '</aside>' +
      '<nav class="tsb-beta-dock" aria-label="Mobile app navigation">' +
        '<a class="tsb-beta-tab' + activeTab(type, "shelf") + '" href="index.html#library"><span class="tsb-beta-tab__icon">▦</span><span>Shelf</span></a>' +
        '<a class="tsb-beta-tab' + activeTab(type, "graveyard") + '" href="graveyard.html"><span class="tsb-beta-tab__icon">☠</span><span>Files</span></a>' +
        '<button class="tsb-beta-tab tsb-beta-tab--progress" type="button" data-beta-progress><span class="tsb-beta-tab__icon">◌</span><span>Progress</span></button>' +
        '<a class="tsb-beta-tab" href="login.html"><span class="tsb-beta-tab__icon">◉</span><span>You</span></a>' +
      '</nav>';
    document.body.appendChild(shell);

    shell.querySelectorAll("[data-beta-exit]").forEach(function (button) {
      button.addEventListener("click", function () { setMode(false, { source: "exit" }); });
    });
    shell.querySelectorAll("[data-beta-progress]").forEach(function (button) {
      button.addEventListener("click", openProgress);
    });
    shell.querySelectorAll("[data-beta-progress-close]").forEach(function (button) {
      button.addEventListener("click", closeProgress);
    });
    var veil = shell.querySelector("#tsb-beta-veil");
    if (veil) veil.addEventListener("click", closeProgress);

    createPageIntro(type);
  }

  function removeShell() {
    closeProgress();
    var shell = document.getElementById("tsb-mobile-beta-shell");
    if (shell) shell.remove();
    removePageIntro();
  }

  function emit(active, source) {
    var detail = { active: !!active, source: source || "beta" };
    try { document.dispatchEvent(new CustomEvent("tsb:mobile-beta-change", { detail: detail })); } catch (e) {}
  }

  function runTransition(apply, instant) {
    if (instant || reduceMotion()) { apply(); return; }
    if (document.startViewTransition) {
      try { document.startViewTransition(apply); return; } catch (e) {}
    }
    root.classList.add("tsb-beta-morphing");
    apply();
    requestAnimationFrame(function () {
      setTimeout(function () { root.classList.remove("tsb-beta-morphing"); }, 460);
    });
  }

  function setMode(requested, options) {
    options = options || {};
    var active = !!requested && !!media.matches;

    if (requested && !media.matches) {
      if (!options.silent) toast("Mobile Beta is made for phones. Open it on a mobile screen to try it.");
      emit(false, options.source || "desktop");
      return false;
    }

    if (!options.noStore) saveSetting(!!requested);
    runTransition(function () {
      root.classList.toggle("tsb-mobile-beta", active);
      document.body.classList.toggle("tsb-mobile-beta-page", active);
      if (active) createShell(); else removeShell();
    }, !!options.instant);
    emit(active, options.source);
    return active;
  }

  function handleViewportChange() {
    var shouldBeActive = getSetting() && !!media.matches;
    setMode(shouldBeActive, { noStore: true, instant: true, silent: true, source: "viewport" });
  }

  window.TSBMobileBeta = {
    set: setMode,
    isActive: function () { return root.classList.contains("tsb-mobile-beta"); },
    isAvailable: function () { return !!media.matches; },
    setting: getSetting
  };

  if (media.addEventListener) media.addEventListener("change", handleViewportChange);
  else if (media.addListener) media.addListener(handleViewportChange);

  /* Scripts are included at the end of each page, but keep this safe for reuse. */
  function boot() {
    setMode(getSetting(), { noStore: true, instant: true, silent: true, source: "restore" });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
