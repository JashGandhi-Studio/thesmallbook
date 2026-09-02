/* ============================================================
   THESMALLBOOK — 👤 PROFILE PAGE (profile-page.js)
   Signed out → a real reason to create an account.
   Signed in  → avatar, @username, bio, stats, edit sheet.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("pfMain");
  if (!root) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function A() { return window.TSB_AUTH || null; }
  function user() { try { return A() && A().user && A().user(); } catch (e) { return null; } }
  function P() { return window.TSB_PROFILE || null; }

  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
  var CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  function toast(msg, bad) {
    var t = document.createElement("div");
    t.className = "pf-toast" + (bad ? " pf-toast--bad" : "");
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ============================================================
     SIGNED OUT
     ============================================================ */
  function renderGate() {
    root.innerHTML =
      '<div class="pf-gate">' +
        '<div class="pf-gate__mark">\uD83D\uDC4B</div>' +
        "<h2>Your shelf, everywhere</h2>" +
        "<p>Create a free account to keep what you read \u2014 and to start posting.</p>" +
        '<ul class="pf-gate__list">' +
          "<li><span>\uD83D\uDCDA</span><div>Your progress and shelf on every device</div></li>" +
          "<li><span>\uD83D\uDD25</span><div>Streaks and badges that actually save</div></li>" +
          "<li><span>\u270D\uFE0F</span><div>Post quotes and lessons under your own name</div></li>" +
          "<li><span>\uD83D\uDC64</span><div>A profile people can follow</div></li>" +
        "</ul>" +
        '<button class="pf-btn pf-btn--primary" id="pfSignIn">Create your account</button>' +
        '<p style="margin:16px 0 0;font-size:var(--fs-2xs)">Free forever. No card. Takes 10 seconds.</p>' +
      "</div>";

    var btn = document.getElementById("pfSignIn");
    if (btn) {
      btn.addEventListener("click", function () {
        location.href = "signin.html?next=profile.html";
      });
    }
  }

  /* ============================================================
     SIGNED IN
     ============================================================ */
  function avatarHtml(p) {
    var inner = p && p.avatar_url
      ? '<img src="' + esc(p.avatar_url) + '" alt="Your avatar" width="76" height="76">'
      : '<span class="pf-ava__ini">' + esc(P().initials(p)) + "</span>";
    return '<button class="pf-ava" id="pfAva" aria-label="Change profile photo">' + inner +
      '<span class="pf-ava__edit">' + CAM + "</span></button>";
  }

  function row(icon, title, sub, href, id) {
    return '<a class="pf-row"' + (href ? ' href="' + esc(href) + '"' : "") +
      (id ? ' id="' + id + '"' : "") + (href ? "" : ' role="button" tabindex="0"') + ">" +
      '<span class="pf-row__ico">' + icon + "</span>" +
      '<span class="pf-row__txt">' + esc(title) +
        (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span>" +
      '<span class="pf-row__go">' + CHEV + "</span></a>";
  }

  function renderProfile(p) {
    var st = P().stats();
    root.innerHTML =
      '<div class="pf-hero">' + avatarHtml(p) +
        '<div class="pf-id">' +
          '<div class="pf-id__name">' + esc(p.display_name || "Reader") + "</div>" +
          '<div class="pf-id__handle">@' + esc(p.username || "reader") + "</div>" +
          (p.bio ? '<div class="pf-id__bio">' + esc(p.bio) + "</div>" : "") +
        "</div>" +
      "</div>" +

      '<div class="pf-counts">' +
        '<div class="pf-count"><b>' + (p.posts || 0) + "</b><span>Posts</span></div>" +
        '<div class="pf-count"><b>' + (p.followers || 0) + "</b><span>Followers</span></div>" +
        '<div class="pf-count"><b>' + (p.following || 0) + "</b><span>Following</span></div>" +
      "</div>" +

      '<div class="pf-stats">' +
        '<div class="pf-stat pf-stat--coral"><b>' + st.booksRead + "</b><span>Books finished</span></div>" +
        '<div class="pf-stat pf-stat--peri"><b>' + st.lessonsRead + "</b><span>Lessons read</span></div>" +
        '<div class="pf-stat pf-stat--butter"><b>' + st.streak + "</b><span>Day streak</span></div>" +
        '<div class="pf-stat pf-stat--mint"><b>' + st.saved + "</b><span>Saved</span></div>" +
      "</div>" +

      '<div class="pf-section">Account</div>' +
      '<div class="pf-rows">' +
        row("\u270F\uFE0F", "Edit profile", "Name, username, bio", "", "pfEdit") +
        row("\u2699\uFE0F", "Settings", "Theme, language, reading", "settings.html") +
        row("\uD83D\uDCDA", "My shelf", st.saved + " saved", "index.html#shelf") +
      "</div>" +

      '<div class="pf-section">More</div>' +
      '<div class="pf-rows">' +
        row("\u2728", "TSB Gold", "Audio, deep dives, PDFs", "gold.html") +
        row("\uD83D\uDCAC", "Ask the library", "Chat with 350 books", "chat.html") +
        row("\u2139\uFE0F", "About", "", "about.html") +
      "</div>" +

      '<button class="pf-btn pf-btn--danger" id="pfOut" style="margin-top:8px">Sign out</button>';

    wire(p);
  }

  function wire(p) {
    var edit = document.getElementById("pfEdit");
    if (edit) edit.addEventListener("click", function (e) { e.preventDefault(); openSheet(p); });

    var ava = document.getElementById("pfAva");
    if (ava) ava.addEventListener("click", function () { pickAvatar(ava); });

    var out = document.getElementById("pfOut");
    if (out) {
      out.addEventListener("click", function () {
        if (!confirm("Sign out of TheSmallBook?")) return;
        if (A() && A().signOut) A().signOut();
        setTimeout(function () { location.href = "index.html"; }, 200);
      });
    }
  }

  /* ---------- avatar ---------- */
  function pickAvatar(btn) {
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.addEventListener("change", async function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      btn.classList.add("is-busy");
      var r = await P().uploadAvatar(f);
      btn.classList.remove("is-busy");
      if (r.ok) { toast("Photo updated"); boot(true); }
      else toast(r.error || "Upload failed", true);
    });
    inp.click();
  }

  /* ---------- edit sheet ---------- */
  function openSheet(p) {
    var sheet = document.createElement("div");
    sheet.className = "pf-sheet";
    sheet.innerHTML =
      '<div class="pf-sheet__box" role="dialog" aria-modal="true" aria-label="Edit profile">' +
        '<div class="pf-sheet__grab"></div>' +
        "<h2>Edit profile</h2>" +
        '<div class="pf-field">' +
          '<label for="pfName">Display name</label>' +
          '<input id="pfName" type="text" maxlength="40" value="' + esc(p.display_name || "") + '">' +
        "</div>" +
        '<div class="pf-field">' +
          '<label for="pfUser">Username</label>' +
          '<input id="pfUser" type="text" maxlength="20" autocapitalize="none" ' +
            'autocorrect="off" spellcheck="false" value="' + esc(p.username || "") + '">' +
          '<small class="pf-field__hint" id="pfUserHint">3\u201320 characters. Letters, numbers, underscores.</small>' +
        "</div>" +
        '<div class="pf-field">' +
          '<label for="pfBio">Bio</label>' +
          '<textarea id="pfBio" maxlength="160" placeholder="What are you reading for?">' + esc(p.bio || "") + "</textarea>" +
          '<small class="pf-field__hint" id="pfBioCount"></small>' +
        "</div>" +
        '<div class="pf-sheet__actions">' +
          '<button class="pf-btn pf-btn--ghost" id="pfCancel">Cancel</button>' +
          '<button class="pf-btn pf-btn--primary" id="pfSave">Save</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(sheet);

    var nameEl = sheet.querySelector("#pfName");
    var userEl = sheet.querySelector("#pfUser");
    var bioEl  = sheet.querySelector("#pfBio");
    var hint   = sheet.querySelector("#pfUserHint");
    var count  = sheet.querySelector("#pfBioCount");
    var saveBt = sheet.querySelector("#pfSave");

    function close() { sheet.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
    sheet.querySelector("#pfCancel").addEventListener("click", close);

    function updCount() {
      count.textContent = (bioEl.value.length) + "/160";
    }
    bioEl.addEventListener("input", updCount);
    updCount();

    /* live username availability, debounced */
    var timer = null;
    userEl.addEventListener("input", function () {
      var raw = userEl.value;
      var norm = P().normUsername(raw);
      if (raw !== norm) userEl.value = norm;
      hint.className = "pf-field__hint";
      hint.textContent = "Checking\u2026";
      clearTimeout(timer);
      timer = setTimeout(async function () {
        if (norm === (p.username || "")) {
          hint.className = "pf-field__hint";
          hint.textContent = "This is your current username.";
          return;
        }
        var r = await P().checkUsername(norm);
        hint.className = "pf-field__hint " + (r.available ? "is-good" : "is-bad");
        hint.textContent = r.available ? "@" + norm + " is available" : r.reason;
      }, 380);
    });

    saveBt.addEventListener("click", async function () {
      saveBt.disabled = true;
      saveBt.textContent = "Saving\u2026";
      var patch = { display_name: nameEl.value, bio: bioEl.value };
      var uname = P().normUsername(userEl.value);
      if (uname && uname !== (p.username || "")) patch.username = uname;

      var r = await P().save(patch);
      saveBt.disabled = false;
      saveBt.textContent = "Save";
      if (r.ok) { close(); toast("Profile saved"); boot(true); }
      else toast(r.error || "Couldn't save", true);
    });

    setTimeout(function () { nameEl.focus(); }, 120);
  }

  /* ============================================================
     BOOT
     ============================================================ */
  async function boot(force) {
    if (!user()) { renderGate(); return; }
    var p = null;
    try { p = await P().load(force); } catch (e) {}
    if (!p) { renderGate(); return; }
    renderProfile(p);
  }

  function start() {
    if (window.TSB_AUTH) boot();
    else {
      /* auth.js boots async — wait for it, but never hang forever */
      var done = false;
      window.addEventListener("tsb:auth", function () { if (!done) { done = true; boot(); } });
      setTimeout(function () { if (!done) { done = true; boot(); } }, 1500);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.TSB_PROFILE_PAGE = { refresh: function () { boot(true); } };
})();
