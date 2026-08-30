/* ============================================================
   THESMALLBOOK — MOBILE BETA APP SHELL
   A deliberately separate, opt-in phone experience. The classic website
   always remains the default; visitors can leave this mode in one tap.
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "tsb_mobile_beta";
  var MOBILE_QUERY = "(max-width: 760px)";
  var media = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : { matches: false };
  var root = document.documentElement;
  var PAGE_TYPES = ["shelf", "reader", "graveyard", "other"];

  function getSetting() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) === true; }
    catch (e) { return false; }
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
    }, 2600);
  }

  function readingState() {
    var books = Array.isArray(window.BOOKS) ? window.BOOKS : [];
    var progress = {};
    try {
      progress = window.TSB && TSB.progress ? TSB.progress.all() : JSON.parse(localStorage.getItem("tsb_progress") || "{}");
    } catch (e) { progress = {}; }

    var lessons = 0, started = 0, finished = 0;
    books.forEach(function (book) {
      var read = Array.isArray(progress[book.id]) ? progress[book.id].length : 0;
      lessons += read;
      if (read) started++;
      if (book.lessons && read >= book.lessons.length) finished++;
    });

    var streak = 0, last = null;
    try { streak = window.TSB && TSB.streak ? TSB.streak.count() : 0; } catch (e) {}
    try { last = window.TSB && TSB.lastRead ? TSB.lastRead.get() : null; } catch (e) {}
    var current = last && books.find(function (book) { return book.id === last.id; });
    return { lessons: lessons, started: started, finished: finished, streak: streak, current: current, total: books.length };
  }

  function activeTab(type, target) {
    if (type === target) return " is-active";
    if (type === "reader" && target === "shelf") return " is-reader";
    return "";
  }

  /* ---------- sheets: progress + full-function menu ---------- */
  function veil() { return document.getElementById("tsb-beta-veil"); }
  function progressSheet() { return document.getElementById("tsb-beta-progress-sheet"); }
  function menuSheet() { return document.getElementById("tsb-beta-menu-sheet"); }

  function isSheetOpen() {
    return !!((progressSheet() && progressSheet().classList.contains("is-open")) ||
      (menuSheet() && menuSheet().classList.contains("is-open")));
  }
  function showVeil() {
    var el = veil();
    if (!el) return;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add("is-open"); });
  }
  function hideVeil() {
    var el = veil();
    if (!el || isSheetOpen()) return;
    el.classList.remove("is-open");
    setTimeout(function () { if (!isSheetOpen()) el.hidden = true; }, 190);
  }
  function closeProgress() {
    var sheet = progressSheet();
    if (!sheet) return;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    hideVeil();
  }
  function closeMenu() {
    var sheet = menuSheet();
    if (!sheet) return;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    hideVeil();
  }
  function closeSheets() {
    var p = progressSheet(), m = menuSheet();
    if (p) { p.classList.remove("is-open"); p.setAttribute("aria-hidden", "true"); }
    if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }
    hideVeil();
  }

  function progressMarkup() {
    var state = readingState();
    var continueBlock = state.current
      ? '<a class="tsb-beta-resume" href="book.html?id=' + encodeURIComponent(state.current.id) + '">' +
          '<span class="tsb-beta-resume__icon">▶</span><span><small>KEEP READING</small><b>' + esc(state.current.title) + '</b></span><span aria-hidden="true">→</span></a>'
      : '<a class="tsb-beta-resume" href="index.html#library"><span class="tsb-beta-resume__icon">✦</span><span><small>START YOUR FIRST READ</small><b>Find one idea for today</b></span><span aria-hidden="true">→</span></a>';

    return '<div class="tsb-beta-sheet__eyebrow">YOUR READING LOG</div>' +
      '<h2>Small steps.<br><span>Real momentum.</span></h2>' +
      '<div class="tsb-beta-metrics">' +
        '<div><b>' + state.lessons + '</b><span>lessons read</span></div>' +
        '<div><b>' + state.streak + '</b><span>day streak</span></div>' +
        '<div><b>' + state.finished + '</b><span>books finished</span></div>' +
      '</div>' + continueBlock +
      '<p class="tsb-beta-sheet__note">Progress is private and saved on this device. Use the menu to make a backup.</p>';
  }

  function openProgress() {
    var sheet = progressSheet();
    if (!sheet) return;
    closeMenu();
    var content = sheet.querySelector(".tsb-beta-sheet__content");
    if (content) content.innerHTML = progressMarkup();
    sheet.setAttribute("aria-hidden", "false");
    showVeil();
    requestAnimationFrame(function () { sheet.classList.add("is-open"); });
  }

  function menuMarkup() {
    var dark = root.classList.contains("dark");
    return '<div class="tsb-beta-menu__eyebrow">MOBILE BETA CONTROLS</div>' +
      '<h2>Everything is<br><span>still here.</span></h2>' +
      '<p class="tsb-beta-menu__intro">Beta changes the layout, never the library. Your original tools remain one tap away.</p>' +
      '<div class="tsb-beta-menu__grid">' +
        '<a href="scan.html" class="tsb-beta-menu__item"><i>⌕</i><span><b>Scan a book</b><small>Find a summary by cover</small></span><em>→</em></a>' +
        '<a href="stories.html" class="tsb-beta-menu__item"><i>✎</i><span><b>Community stories</b><small>Read or publish a lesson</small></span><em>→</em></a>' +
        '<button type="button" class="tsb-beta-menu__item" data-beta-random><i>✦</i><span><b>Surprise me</b><small>Open a random book</small></span><em>→</em></button>' +
        '<button type="button" class="tsb-beta-menu__item" data-beta-language><i>◎</i><span><b>Language</b><small>Read in your language</small></span><em>→</em></button>' +
        '<button type="button" class="tsb-beta-menu__item" data-beta-theme><i>' + (dark ? '☀' : '◐') + '</i><span><b>' + (dark ? 'Use light mode' : 'Use dark mode') + '</b><small>Your choice is remembered</small></span><em>→</em></button>' +
        '<button type="button" class="tsb-beta-menu__item" data-beta-backup><i>↓</i><span><b>Backup progress</b><small>Keep your reading log safe</small></span><em>→</em></button>' +
        '<button type="button" class="tsb-beta-menu__item" data-beta-restore><i>↑</i><span><b>Restore progress</b><small>Bring back a saved backup</small></span><em>→</em></button>' +
        '<button type="button" class="tsb-beta-menu__item" data-beta-trophies><i>★</i><span><b>Trophy room</b><small>See your earned badges</small></span><em>→</em></button>' +
        '<a href="login.html" class="tsb-beta-menu__item"><i>◉</i><span><b>Your profile</b><small>Sign in and manage your account</small></span><em>→</em></a>' +
        '<button type="button" class="tsb-beta-menu__item tsb-beta-menu__item--classic" data-beta-exit><i>↗</i><span><b>Return to Classic</b><small>Use the original website layout</small></span><em>→</em></button>' +
      '</div>';
  }

  function openMenu() {
    var sheet = menuSheet();
    if (!sheet) return;
    closeProgress();
    var content = sheet.querySelector(".tsb-beta-menu__content");
    if (content) content.innerHTML = menuMarkup();
    bindMenuActions(sheet);
    sheet.setAttribute("aria-hidden", "false");
    showVeil();
    requestAnimationFrame(function () { sheet.classList.add("is-open"); });
  }

  function chooseRandomBook() {
    var books = Array.isArray(window.BOOKS) ? window.BOOKS : [];
    if (!books.length) { toast("The library is still loading. Try again in a moment."); return; }
    var book = books[Math.floor(Math.random() * books.length)];
    try { if (window.TSB && TSB.achv) TSB.achv.award("explorer"); } catch (e) {}
    location.href = "book.html?id=" + encodeURIComponent(book.id);
  }
  function openLanguage() {
    closeMenu();
    if (window.TSB_LANG && typeof window.TSB_LANG.open === "function") window.TSB_LANG.open();
    else toast("Language controls are still loading. Please try again.");
  }
  function toggleTheme() {
    if (window.TSB && TSB.theme && typeof TSB.theme.toggle === "function") {
      TSB.theme.toggle();
      /* Repaint the menu text/icon in the freshly selected theme. */
      var sheet = menuSheet();
      var content = sheet && sheet.querySelector(".tsb-beta-menu__content");
      if (content) { content.innerHTML = menuMarkup(); bindMenuActions(sheet); }
    } else toast("Theme controls are still loading. Please try again.");
  }
  function backupProgress() {
    if (window.TSB && TSB.backup && typeof TSB.backup.export === "function") {
      TSB.backup.export();
      toast("Your TheSmallBook progress backup is downloading.");
    } else toast("Backup controls are still loading. Please try again.");
  }
  function restoreProgress() {
    if (!(window.TSB && TSB.backup && typeof TSB.backup.import === "function")) {
      toast("Restore controls are still loading. Please try again.");
      return;
    }
    var input = document.getElementById("tsb-beta-restore-file");
    if (!input) {
      input = document.createElement("input");
      input.id = "tsb-beta-restore-file";
      input.type = "file";
      input.accept = "application/json";
      input.hidden = true;
      document.body.appendChild(input);
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        TSB.backup.import(file, function (ok) {
          if (ok) {
            toast("Progress restored. Reloading your library…");
            setTimeout(function () { location.reload(); }, 700);
          } else toast("That file is not a valid TheSmallBook backup.");
        });
      });
    }
    input.value = "";
    input.click();
  }
  function trophiesMarkup() {
    var defs = (window.TSB && TSB.achv && TSB.achv.defs) || {};
    var won = (window.TSB && TSB.achv && TSB.achv.list) ? TSB.achv.list() : [];
    var earned = won.map(function (id) { return defs[id] ? { id: id, data: defs[id] } : null; }).filter(Boolean);
    return '<div class="tsb-beta-sheet__eyebrow">YOUR TROPHY ROOM</div>' +
      '<h2>' + earned.length + ' badge' + (earned.length === 1 ? '' : 's') + '.<br><span>Keep going.</span></h2>' +
      '<div class="tsb-beta-trophy-grid">' + (earned.length ? earned.map(function (entry) {
        return '<div class="tsb-beta-trophy"><i>' + esc(entry.data.icon) + '</i><span><b>' + esc(entry.data.name) + '</b><small>' + esc(entry.data.desc) + '</small></span></div>';
      }).join("") : '<div class="tsb-beta-trophy tsb-beta-trophy--empty"><i>✦</i><span><b>Your first badge is close</b><small>Open a book and read one lesson to begin.</small></span></div>') + '</div>' +
      '<p class="tsb-beta-sheet__note">' + earned.length + ' of ' + Object.keys(defs).length + ' badges earned. Your achievements stay saved on this device.</p>';
  }
  function openTrophies() {
    var sheet = progressSheet();
    if (!sheet) return;
    closeMenu();
    var content = sheet.querySelector(".tsb-beta-sheet__content");
    if (content) content.innerHTML = trophiesMarkup();
    sheet.setAttribute("aria-hidden", "false");
    showVeil();
    requestAnimationFrame(function () { sheet.classList.add("is-open"); });
  }
  function bindMenuActions(shell) {
    if (!shell) return;
    shell.querySelectorAll("[data-beta-random]").forEach(function (button) {
      button.addEventListener("click", chooseRandomBook);
    });
    shell.querySelectorAll("[data-beta-language]").forEach(function (button) {
      button.addEventListener("click", openLanguage);
    });
    shell.querySelectorAll("[data-beta-theme]").forEach(function (button) {
      button.addEventListener("click", toggleTheme);
    });
    shell.querySelectorAll("[data-beta-backup]").forEach(function (button) {
      button.addEventListener("click", backupProgress);
    });
    shell.querySelectorAll("[data-beta-restore]").forEach(function (button) {
      button.addEventListener("click", restoreProgress);
    });
    shell.querySelectorAll("[data-beta-trophies]").forEach(function (button) {
      button.addEventListener("click", openTrophies);
    });
    shell.querySelectorAll("[data-beta-exit]").forEach(function (button) {
      button.addEventListener("click", function () { setMode(false, { source: "exit" }); });
    });
  }

  /* ---------- page context ---------- */
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
        ? '<a class="tsb-beta-home-intro__continue" href="book.html?id=' + encodeURIComponent(state.current.id) + '"><span class="tsb-beta-home-intro__continuecopy"><small>CONTINUE READING</small><b>' + esc(state.current.title) + '</b></span><i>→</i></a>'
        : '<a class="tsb-beta-home-intro__continue" href="#library"><span class="tsb-beta-home-intro__continuecopy"><small>YOUR NEXT READ</small><b>Find one useful idea today</b></span><i>→</i></a>';
      var intro = document.createElement("section");
      intro.className = "tsb-beta-home-intro";
      intro.innerHTML = '<div class="tsb-beta-home-intro__copy"><span class="tsb-beta-kicker">YOUR POCKET LIBRARY</span><h1>Read a little.<br><em>Keep a lot.</em></h1><p>Every book is waiting when you are.</p></div>' +
        '<div class="tsb-beta-home-intro__stats"><span><b>' + state.lessons + '</b> lessons read</span><span><b>' + state.streak + '🔥</b> day streak</span></div>' + resume;
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
      document.querySelectorAll(".grave.open").forEach(function (grave) { grave.classList.remove("open"); });
      return;
    }

    if (type === "reader") {
      var bookHero = document.querySelector(".bookhero");
      if (!bookHero || !bookHero.parentNode) return;
      var note = document.createElement("div");
      note.className = "tsb-beta-reader-note";
      note.innerHTML = '<a href="index.html#library" aria-label="Back to shelf">← <span>SHELF</span></a><span>FOCUS READER</span><button type="button" data-beta-progress>◌ <span>PROGRESS</span></button>';
      bookHero.parentNode.insertBefore(note, bookHero);
      var progressButton = note.querySelector("[data-beta-progress]");
      if (progressButton) progressButton.addEventListener("click", openProgress);
    }
  }

  /* ---------- app shell ---------- */
  function createShell() {
    var old = document.getElementById("tsb-mobile-beta-shell");
    if (old) old.remove();

    var type = pageType();
    var shell = document.createElement("div");
    shell.id = "tsb-mobile-beta-shell";
    shell.innerHTML =
      '<header class="tsb-beta-topbar">' +
        '<a class="tsb-beta-brand" href="index.html" aria-label="TheSmallBook shelf"><span class="tsb-beta-brand__mark">📕</span><span><b>The<span>Small</span>Book</b><small>MOBILE BETA</small></span></a>' +
        '<div class="tsb-beta-topbar__actions"><button class="tsb-beta-menu-button" type="button" data-beta-menu aria-label="Open all app controls">☰<span>MENU</span></button><button class="tsb-beta-classic" type="button" data-beta-exit title="Switch back to the original website">CLASSIC <span>↗</span></button></div>' +
      '</header>' +
      '<button id="tsb-beta-veil" class="tsb-beta-veil" type="button" aria-label="Close mobile Beta panel" hidden></button>' +
      '<aside id="tsb-beta-progress-sheet" class="tsb-beta-progress-sheet" aria-hidden="true" aria-label="Your reading progress">' +
        '<button class="tsb-beta-sheet__close" type="button" data-beta-progress-close aria-label="Close reading progress">×</button><div class="tsb-beta-sheet__content"></div>' +
      '</aside>' +
      '<aside id="tsb-beta-menu-sheet" class="tsb-beta-menu-sheet" aria-hidden="true" aria-label="Mobile Beta controls">' +
        '<button class="tsb-beta-sheet__close" type="button" data-beta-menu-close aria-label="Close menu">×</button><div class="tsb-beta-menu__content"></div>' +
      '</aside>' +
      '<nav class="tsb-beta-dock" aria-label="Mobile app navigation">' +
        '<a class="tsb-beta-tab' + activeTab(type, "shelf") + '" href="index.html#library"><span class="tsb-beta-tab__icon">▦</span><span>Shelf</span></a>' +
        '<a class="tsb-beta-tab" href="scan.html"><span class="tsb-beta-tab__icon">⌕</span><span>Scan</span></a>' +
        '<a class="tsb-beta-tab' + activeTab(type, "graveyard") + '" href="graveyard.html"><span class="tsb-beta-tab__icon">☠</span><span>Files</span></a>' +
        '<button class="tsb-beta-tab tsb-beta-tab--progress" type="button" data-beta-progress><span class="tsb-beta-tab__icon">◌</span><span>Progress</span></button>' +
        '<a class="tsb-beta-tab" href="login.html"><span class="tsb-beta-tab__icon">◉</span><span>You</span></a>' +
      '</nav>';
    document.body.appendChild(shell);

    shell.querySelectorAll("[data-beta-menu]").forEach(function (button) { button.addEventListener("click", openMenu); });
    shell.querySelectorAll("[data-beta-progress]").forEach(function (button) { button.addEventListener("click", openProgress); });
    shell.querySelectorAll("[data-beta-progress-close]").forEach(function (button) { button.addEventListener("click", closeProgress); });
    shell.querySelectorAll("[data-beta-menu-close]").forEach(function (button) { button.addEventListener("click", closeMenu); });
    var pageVeil = shell.querySelector("#tsb-beta-veil");
    if (pageVeil) pageVeil.addEventListener("click", closeSheets);
    bindMenuActions(shell);
    createPageIntro(type);
  }

  function removeShell() {
    closeSheets();
    var shell = document.getElementById("tsb-mobile-beta-shell");
    if (shell) shell.remove();
    removePageIntro();
  }

  function clearPageType() {
    PAGE_TYPES.forEach(function (type) { document.body.classList.remove("tsb-beta-type-" + type); });
  }
  function emit(active, source) {
    try { document.dispatchEvent(new CustomEvent("tsb:mobile-beta-change", { detail: { active: !!active, source: source || "beta" } })); } catch (e) {}
  }

  function showModeTransition(active) {
    if (reduceMotion()) return;
    var old = document.getElementById("tsb-beta-transition");
    if (old) old.remove();
    var overlay = document.createElement("div");
    overlay.id = "tsb-beta-transition";
    /* is-on is set before paint so the full-screen hand-off is never a faint
       flash. The card itself still rises smoothly on the next frame. */
    overlay.className = "tsb-beta-transition is-on" + (active ? " tsb-beta-transition--enter" : " tsb-beta-transition--exit");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<div class="tsb-beta-transition__card"><span class="tsb-beta-transition__icon">' + (active ? '📕' : '↗') + '</span><b>' + (active ? 'MOBILE BETA' : 'CLASSIC VIEW') + '</b><small>' + (active ? 'YOUR POCKET READER IS READY' : 'BACK TO THE ORIGINAL LIBRARY') + '</small></div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("is-card-on"); });
    setTimeout(function () { overlay.classList.add("is-leaving"); }, 650);
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 930);
  }

  function runTransition(apply, instant) {
    if (instant || reduceMotion()) { apply(); return; }
    /* Use our own full-screen hand-off instead of relying on the browser's
       View Transition API. It is consistent in Chrome, Safari and in-app
       browsers, and the visitor always sees that Beta is opening. */
    root.classList.add("tsb-beta-morphing");
    apply();
    requestAnimationFrame(function () { setTimeout(function () { root.classList.remove("tsb-beta-morphing"); }, 460); });
  }

  function setMode(requested, options) {
    options = options || {};
    var active = !!requested && !!media.matches;
    if (requested && !media.matches) {
      if (!options.silent) toast("Mobile Beta is designed for phones. Open it on a mobile screen to try it.");
      emit(false, options.source || "desktop");
      return false;
    }

    if (!options.noStore) saveSetting(!!requested);
    if (!options.silent && !options.instant && options.source !== "viewport") showModeTransition(active);
    runTransition(function () {
      root.classList.toggle("tsb-mobile-beta", active);
      document.body.classList.toggle("tsb-mobile-beta-page", active);
      clearPageType();
      if (active) {
        document.body.classList.add("tsb-beta-type-" + pageType());
        createShell();
      } else removeShell();
    }, !!options.instant);
    emit(active, options.source);
    return active;
  }

  function handleViewportChange() {
    setMode(getSetting() && !!media.matches, { noStore: true, instant: true, silent: true, source: "viewport" });
  }

  window.TSBMobileBeta = {
    set: setMode,
    isActive: function () { return root.classList.contains("tsb-mobile-beta"); },
    isAvailable: function () { return !!media.matches; },
    setting: getSetting
  };

  if (media.addEventListener) media.addEventListener("change", handleViewportChange);
  else if (media.addListener) media.addListener(handleViewportChange);

  function boot() { setMode(getSetting(), { noStore: true, instant: true, silent: true, source: "restore" }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
