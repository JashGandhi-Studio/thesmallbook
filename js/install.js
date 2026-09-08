/* ============================================================
   TheSmallBook — 📲 INSTALL APP POPUP (v221)
   ONE-TAP install, no steps:
   • Android / Chrome / Edge  → the browser's native install sheet
     (beforeinstallprompt) fires straight from the button.
   • iPhone / iPad            → one tap opens the Share sheet,
     where "Add to Home Screen" lives (Safari doesn't allow more).
   • Anywhere else            → one tap + one-line hint, never a
     list of steps.
   Once installed, the button disappears everywhere
   (appinstalled event + display-mode:standalone CSS).
   ============================================================ */
(function () {
  "use strict";

  var deferred = null;
  var promptUsed = false;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
           window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function hideTriggers() {
    document.querySelectorAll("[data-install]").forEach(function (el) {
      var w = el.closest("[data-installwrap]");
      if (w) w.style.display = "none"; else el.style.display = "none";
    });
  }

  /* wait a moment for a late beforeinstallprompt (it fires a few ms after load) */
  function waitPrompt(ms) {
    return new Promise(function (resolve) {
      if (deferred) return resolve(deferred);
      var t = setTimeout(function () { resolve(deferred); }, ms || 2200);
      var chk = setInterval(function () {
        if (deferred) { clearTimeout(t); clearInterval(chk); resolve(deferred); }
      }, 120);
    });
  }

  function openModal() {
    var old = document.getElementById("tsbInstallModal");
    if (old) old.remove();

    var m = document.createElement("div");
    m.className = "modal";
    m.id = "tsbInstallModal";

    var icon = (document.querySelector('link[rel="apple-touch-icon"]') || {}).href || "apple-touch-icon.png";
    var canInstall = !!deferred || /android|chrome|edg\//i.test(navigator.userAgent);

    var body;
    if (isStandalone()) {
      body = '<div class="instbody"><div class="insthero"><img src="' + icon + '" alt=""><span>✅</span></div>' +
             '<h3 class="modal__title" style="margin:14px 0 6px;">Already on your home screen</h3>' +
             '<p class="instp">TheSmallBook is installed — open it any time, even offline.</p>' +
             '<button class="setbtn" data-instclose>Awesome</button></div>';
    } else {
      body = '<div class="instbody"><div class="insthero"><img src="' + icon + '" alt=""><span>📲</span></div>' +
             '<h3 class="modal__title" style="margin:14px 0 6px;">Install TheSmallBook</h3>' +
             '<p class="instp">One tap — it lands on your home screen like a real app.<br>Full-screen, works offline, opens in 1 tap.</p>' +
             '<button class="setbtn setbtn--big" data-instgo>⬇️&nbsp; Install the app</button>' +
             '<p class="instfine" data-instfine hidden>Open this page in <b>Chrome</b> (or Edge), tap the browser <b>menu&nbsp;⋮</b> → <b>Install app</b>. One tap, done.</p>' +
             '<p class="instfine">Free forever · No ads · No sign-up needed</p></div>';
    }

    m.innerHTML = '<div class="modal__box instmodal">' +
      '<button class="modal__close" data-instclose aria-label="Close">✕</button>' + body + "</div>";
    document.body.appendChild(m);
    requestAnimationFrame(function () { m.classList.add("open"); });

    m.addEventListener("click", function (ev) { if (ev.target === m) closeModal(); });
    m.querySelector("[data-instclose]").addEventListener("click", closeModal);

    var go = m.querySelector("[data-instgo]");
    if (go) go.addEventListener("click", async function () {
      var pr = await waitPrompt();
      if (pr) {
        promptUsed = true;
        pr.prompt();
        pr.userChoice.then(function (choice) {
          if (choice && choice.outcome === "accepted") {
            hideTriggers();
            m.querySelector(".instbody").innerHTML =
              '<div class="insthero"><img src="' + icon + '" alt=""><span>🎉</span></div>' +
              '<h3 class="modal__title" style="margin:14px 0 6px;text-align:center;">Installed!</h3>' +
              '<p class="instp" style="text-align:center;">TheSmallBook is now on your home screen.<br>Open it any time — even offline.</p>' +
              '<div style="text-align:center;"><button class="setbtn" data-instclose>Done</button></div>';
            m.querySelector("[data-instclose]").addEventListener("click", closeModal);
          }
          deferred = null;
        });
      } else if (isIOS()) {
        /* iPhone: the only real way — one tap opens the native Share sheet (Add to Home Screen lives there) */
        try {
          if (navigator.share) {
            navigator.share({ title: "TheSmallBook", text: "Big books. Small reads. Free forever.", url: location.href })
              .then(function () { closeModal(); }).catch(function () {});
          } else {
            var f = m.querySelector("[data-instfine]");
            if (f) { f.hidden = false; go.textContent = "⬆️ Open Safari, then this button"; }
          }
        } catch (e) {}
      } else {
        var f2 = m.querySelector("[data-instfine]");
        if (f2) f2.hidden = false;
        go.textContent = "⬇️ Open the browser menu to install";
      }
    });
  }
  function closeModal() {
    var m = document.getElementById("tsbInstallModal");
    if (!m) return;
    m.classList.remove("open");
    setTimeout(function () { m.remove(); }, 180);
  }

  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();
    deferred = ev;
    promptUsed = false;
    if (document.getElementById("tsbInstallModal")) openModal();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    hideTriggers();
    closeModal();
  });

  if (isStandalone()) hideTriggers();

  function wire() {
    document.querySelectorAll("[data-install]").forEach(function (el) {
      if (el.__tsbInstallWired) return;
      el.__tsbInstallWired = true;
      el.addEventListener("click", function (ev) { ev.preventDefault(); openModal(); });
    });
  }
  wire();
  document.addEventListener("DOMContentLoaded", wire);
})();
