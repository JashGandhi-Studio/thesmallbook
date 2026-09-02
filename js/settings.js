/* ============================================================
   THESMALLBOOK — ⚙️ SETTINGS (settings.js)
   A real settings screen: appearance, reading, language,
   notifications, account, data & privacy.
   Every control writes through immediately and previews live.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("setMain");
  if (!root) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function lsGet(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }
    catch (e) { return d; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function A() { return window.TSB_AUTH || null; }
  function user() { try { return A() && A().user && A().user(); } catch (e) { return null; } }

  function toast(msg, bad) {
    var t = document.createElement("div");
    t.className = "pf-toast" + (bad ? " pf-toast--bad" : "");
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  var FONT_SIZES = [
    { id: "s",  label: "S"  },
    { id: "m",  label: "M"  },
    { id: "l",  label: "L"  },
    { id: "xl", label: "XL" }
  ];

  function currentFont() { return lsGet("tsb_font_size", "m"); }
  function applyFont(v) {
    document.documentElement.setAttribute("data-font-size", v);
    lsSet("tsb_font_size", v);
  }

  function langs() {
    try { return (window.TSB_LANG && window.TSB_LANG.LANGS) || []; }
    catch (e) { return []; }
  }
  function currentLang() { return lsGet("tsb_lang", "en"); }

  /* ---------- render ---------- */
  function render() {
    var theme = (window.TSB_THEME && window.TSB_THEME.get()) || "light";
    var font = currentFont();
    var lang = currentLang();
    var signedIn = !!user();
    var reminders = lsGet("tsb_reminders", false);
    var reduceData = lsGet("tsb_reduce_data", false);

    var langOpts = langs().map(function (l) {
      return '<option value="' + esc(l.code) + '"' + (l.code === lang ? " selected" : "") + ">" +
        esc(l.flag + "  " + l.name + (l.native && l.native !== l.name ? " \u2014 " + l.native.split(" \u2014 ")[0] : "")) +
        "</option>";
    }).join("");

    root.innerHTML =
      /* ---- appearance ---- */
      '<div class="pf-section">Appearance</div>' +
      '<div class="set-block">' +
        '<span class="set-label">Theme</span>' +
        '<div class="set-seg" id="setTheme" role="group" aria-label="Theme">' +
          '<button data-v="light" class="' + (theme === "light" ? "is-on" : "") + '">\u2600\uFE0F Light</button>' +
          '<button data-v="dark"  class="' + (theme === "dark"  ? "is-on" : "") + '">\uD83C\uDF19 Dark</button>' +
          '<button data-v="auto"  class="' + (theme === "auto"  ? "is-on" : "") + '">\u2699\uFE0F Auto</button>' +
        "</div>" +
        '<div class="set-preview" aria-hidden="true">' +
          '<i style="background:var(--tsb-coral)"></i>' +
          '<i style="background:var(--tsb-periwinkle)"></i>' +
          '<i style="background:var(--tsb-butter)"></i>' +
          '<i style="background:var(--tsb-mint)"></i>' +
          '<i style="background:var(--surface-1);border:var(--border-soft)"></i>' +
        "</div>" +
        '<p class="set-hint">Auto follows your phone\u2019s system setting.</p>' +
      "</div>" +

      /* ---- reading ---- */
      '<div class="pf-section">Reading</div>' +
      '<div class="set-block">' +
        '<span class="set-label">Text size</span>' +
        '<div class="set-seg" id="setFont" role="group" aria-label="Text size">' +
          FONT_SIZES.map(function (f) {
            return '<button data-v="' + f.id + '" class="' + (font === f.id ? "is-on" : "") + '">' + f.label + "</button>";
          }).join("") +
        "</div>" +
        '<p class="set-hint" id="setFontPreview" style="font-size:var(--reader-fs)">' +
          "You do not rise to the level of your goals \u2014 you fall to the level of your systems." +
        "</p>" +
      "</div>" +

      /* ---- language ---- */
      '<div class="pf-section">Language</div>' +
      '<div class="set-block">' +
        '<label for="setLang">App language</label>' +
        '<select class="set-select" id="setLang">' + langOpts + "</select>" +
        '<p class="set-hint">' + langs().length + " languages, including Hinglish and Gujlish \u2014 " +
          "Hindi and Gujarati written in English letters.</p>" +
      "</div>" +

      /* ---- notifications ---- */
      '<div class="pf-section">Notifications</div>' +
      '<div class="set-block">' +
        '<button class="set-toggle' + (reminders ? " is-on" : "") + '" id="setRemind">' +
          "<span>Daily reading reminder<small>A nudge to keep your streak alive</small></span>" +
          '<span class="set-sw"></span>' +
        "</button>" +
        '<button class="set-toggle' + (reduceData ? " is-on" : "") + '" id="setData">' +
          "<span>Reduce data usage<small>Load lighter images on mobile data</small></span>" +
          '<span class="set-sw"></span>' +
        "</button>" +
      "</div>" +

      /* ---- account ---- */
      '<div class="pf-section">Account</div>' +
      '<div class="set-block">' +
        (signedIn
          ? '<button class="pf-btn pf-btn--ghost" id="setProfile" style="margin-bottom:12px">Edit profile</button>' +
            '<button class="pf-btn pf-btn--danger" id="setOut">Sign out</button>'
          : '<p class="set-hint" style="margin:0 0 12px">Sign in to sync your progress across devices.</p>' +
            '<button class="pf-btn pf-btn--primary" id="setIn">Create your account</button>') +
      "</div>" +

      /* ---- data ---- */
      '<div class="pf-section">Data &amp; privacy</div>' +
      '<div class="set-block">' +
        '<button class="pf-btn pf-btn--ghost" id="setExport" style="margin-bottom:12px">Export my data</button>' +
        '<button class="pf-btn pf-btn--danger" id="setClear">Clear local data</button>' +
        '<p class="set-hint">Export downloads everything stored on this device as a JSON file. ' +
          "Clearing removes your on-device progress \u2014 your account stays.</p>" +
      "</div>" +

      '<p class="set-hint" style="text-align:center;margin-top:20px">TheSmallBook \u00B7 v2</p>';

    wire();
  }

  /* ---------- wiring ---------- */
  function segment(id, onPick) {
    var box = document.getElementById(id);
    if (!box) return;
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]");
      if (!b) return;
      [].forEach.call(box.querySelectorAll("button"), function (x) { x.classList.remove("is-on"); });
      b.classList.add("is-on");
      onPick(b.getAttribute("data-v"));
    });
  }

  function toggle(id, key, label) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function () {
      var on = !el.classList.contains("is-on");
      el.classList.toggle("is-on", on);
      lsSet(key, on);
      toast(label + (on ? " on" : " off"));
    });
  }

  function wire() {
    segment("setTheme", function (v) {
      if (window.TSB_THEME) window.TSB_THEME.set(v);
      toast("Theme: " + v);
    });

    segment("setFont", function (v) {
      applyFont(v);
      var p = document.getElementById("setFontPreview");
      if (p) p.style.fontSize = "var(--reader-fs)";
    });

    var langSel = document.getElementById("setLang");
    if (langSel) {
      langSel.addEventListener("change", function () {
        var code = langSel.value;
        lsSet("tsb_lang", code);
        try {
          if (window.TSB_LANG && window.TSB_LANG.select) window.TSB_LANG.select(code);
          else if (window.TSB_LANG && window.TSB_LANG.activate && code !== "en") window.TSB_LANG.activate(code);
        } catch (e) {}
        toast("Language updated");
      });
    }

    toggle("setRemind", "tsb_reminders", "Reminders");
    toggle("setData", "tsb_reduce_data", "Data saver");

    var pf = document.getElementById("setProfile");
    if (pf) pf.addEventListener("click", function () { location.href = "profile.html"; });

    var out = document.getElementById("setOut");
    if (out) {
      out.addEventListener("click", function () {
        if (!confirm("Sign out of TheSmallBook?")) return;
        if (A() && A().signOut) A().signOut();
        setTimeout(function () { location.href = "index.html"; }, 200);
      });
    }

    var inn = document.getElementById("setIn");
    if (inn) {
      inn.addEventListener("click", function () {
        if (A() && A().signIn) A().signIn("google");
        else location.href = "login.html";
      });
    }

    var ex = document.getElementById("setExport");
    if (ex) ex.addEventListener("click", exportData);

    var cl = document.getElementById("setClear");
    if (cl) {
      cl.addEventListener("click", function () {
        if (!confirm("Clear all reading data stored on this device?\n\nThis cannot be undone.")) return;
        var keep = ["tsb_auth_session", "tsb_theme", "tsb_lang"];
        try {
          Object.keys(localStorage)
            .filter(function (k) { return k.indexOf("tsb_") === 0 && keep.indexOf(k) === -1; })
            .forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) {}
        toast("Local data cleared");
        setTimeout(render, 400);
      });
    }
  }

  function exportData() {
    var out = {};
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("tsb_") !== 0) return;
        if (k === "tsb_auth_session") return;      /* never export tokens */
        try { out[k] = JSON.parse(localStorage.getItem(k)); }
        catch (e) { out[k] = localStorage.getItem(k); }
      });
    } catch (e) {}
    var payload = {
      app: "TheSmallBook",
      exported_at: new Date().toISOString(),
      data: out
    };
    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "thesmallbook-data-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Data exported");
    } catch (e) { toast("Export failed", true); }
  }

  function start() {
    applyFont(currentFont());
    render();
    window.addEventListener("tsb:auth", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
