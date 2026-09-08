/* ============================================================
   TheSmallBook — 📲 INSTALL TO HOME SCREEN (v217)
   Shared by settings.html + the You window.
   - Captures the browser's beforeinstallprompt and shows a
     smooth popup with one-tap Install (Android / Chrome / Edge).
   - iOS never fires beforeinstallprompt → the popup shows the
     Share → Add to Home Screen steps instead.
   - Once installed (standalone / appinstalled), every
     [data-install] trigger disappears — also hidden by CSS via
     @media (display-mode: standalone).
   ============================================================ */
(function () {
  "use strict";

  var deferred = null;          /* the captured install prompt */
  var promptUsed = false;       /* shown once, Chrome may withhold it forever after */

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
           window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function hideTriggers() {
    document.querySelectorAll("[data-install]").forEach(function (el) {
      el.closest("[data-installwrap]") ? el.closest("[data-installwrap]").style.display = "none"
                                       : (el.style.display = "none");
    });
  }

  /* ---------------- the popup ---------------- */
  function openModal() {
    var old = document.getElementById("tsbInstallModal");
    if (old) old.remove();

    var m = document.createElement("div");
    m.className = "modal";
    m.id = "tsbInstallModal";

    var icon = (document.querySelector('link[rel="apple-touch-icon"]') || {}).href ||
               "apple-touch-icon.png";

    function step(html) {
      return '<div class="inststep"><b>' + html + "</b></div>";
    }

    var body;
    if (isStandalone()) {
      body = '<div class="instbody"><div class="insthero"><img src="' + icon + '" alt=""><span>✅</span></div>' +
             '<p class="instp">TheSmallBook is already on your home screen — open it any time, even offline.</p>' +
             '<button class="setbtn" data-instclose>Awesome</button></div>';
    } else if (deferred && !promptUsed) {
      body = '<div class="instbody"><div class="insthero"><img src="' + icon + '" alt=""><span>📲</span></div>' +
             '<h3 class="modal__title" style="margin:14px 0 6px;">Install this app to your home screen</h3>' +
             '<p class="instp">Add TheSmallBook to your home screen — opens full-screen like a real app, works offline, 1-tap launch.</p>' +
             '<button class="setbtn setbtn--big" data-instgo>⬇️&nbsp; Install now</button>' +
             '<p class="instfine">Free forever · No ads · Lightspeed updates</p></div>';
    } else if (isIOS()) {
      body = '<div class="instbody"><div class="insthero"><img src="' + icon + '" alt=""><span>🍎</span></div>' +
             '<h3 class="modal__title" style="margin:14px 0 6px;">Install this app to your home screen</h3>' +
             '<div class="inststeps">' +
             step('1️⃣ Tap the <b>Share</b> button <span class="instshare">⎋</span> in Safari') +
             step('2️⃣ Scroll down and tap <b>Add to Home Screen</b>') +
             step('3️⃣ Tap <b>Add</b> — done! TheSmallBook appears on your home screen 🎉') +
             "</div></div>";
    } else {
      body = '<div class="instbody"><div class="insthero"><img src="' + icon + '" alt=""><span>🌐</span></div>' +
             '<h3 class="modal__title" style="margin:14px 0 6px;">Install this app to your home screen</h3>' +
             '<div class="inststeps">' +
             step("1️⃣ Tap the browser <b>menu</b> ⋮ (top right)") +
             step("2️⃣ Tap <b>Install app</b> <span class=\"instshare\">⌄</span> or <b>Add to Home screen</b>") +
             step("3️⃣ Confirm — done! TheSmallBook opens like a real app, even offline 🎉") +
             "</div></div>";
    }

    m.innerHTML =
      '<div class="modal__box instmodal">' +
      '<button class="modal__close" data-instclose aria-label="Close">✕</button>' + body +
      "</div>";
    document.body.appendChild(m);
    requestAnimationFrame(function () { m.classList.add("open"); });

    m.addEventListener("click", function (ev) {
      if (ev.target === m) closeModal();
    });
    m.querySelector("[data-instclose]").addEventListener("click", closeModal);

    var go = m.querySelector("[data-instgo]");
    if (go) go.addEventListener("click", function () {
      if (!deferred) return;
      promptUsed = true;
      deferred.prompt();
      deferred.userChoice.then(function (choice) {
        if (choice && choice.outcome === "accepted") {
          /* appinstalled usually fires too; hide immediately for instant feedback */
          hideTriggers();
          m.querySelector(".instbody").innerHTML =
            '<div class="insthero"><img src="' + icon + '" alt=""><span>🎉</span></div>' +
            '<h3 class="modal__title" style="margin:14px 0 6px;text-align:center;">Installed!</h3>' +
            '<p class="instp" style="text-align:center;">TheSmallBook is now on your home screen.<br>Open it any time — it even works offline.</p>' +
            '<div style="text-align:center;"><button class="setbtn" data-instclose>Done</button></div>';
          m.querySelector("[data-instclose]").addEventListener("click", closeModal);
        } else {
          /* dismissed — keep the trigger, no nagging popup again this session */
        }
        deferred = null;
      });
    });
  }
  function closeModal() {
    var m = document.getElementById("tsbInstallModal");
    if (!m) return;
    m.classList.remove("open");
    setTimeout(function () { m.remove(); }, 180);
  }

  /* ---------------- listeners ---------------- */
  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();          /* we show our own popup */
    deferred = ev;
    promptUsed = false;           /* a fresh prompt may be granted again */
    /* if the popup happens to be open in instructions-mode, refresh it to the one-tap version */
    if (document.getElementById("tsbInstallModal")) openModal();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    hideTriggers();
    closeModal();
  });

  /* auto-hide triggers when already installed, even before CSS kicks in */
  if (isStandalone()) hideTriggers();

  /* wire every [data-install] trigger on the page */
  function wire() {
    document.querySelectorAll("[data-install]").forEach(function (el) {
      if (el.__tsbInstallWired) return;
      el.__tsbInstallWired = true;
      el.addEventListener("click", function (ev) {
        ev.preventDefault();
        openModal();
      });
    });
  }
  wire();
  document.addEventListener("DOMContentLoaded", wire);
})();
