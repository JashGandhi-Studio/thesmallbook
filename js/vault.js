/* ============================================================
   THESMALLBOOK, 🗝️ THE VAULT (js/vault.js)  v268
   ------------------------------------------------------------
   THE IDENTITY WALL.

   One rule, enforced for the whole app: data belongs to the
   ACCOUNT, never to the device.

     · Signed in  → account data lives under  tsb_u:<uid>:<key>
       and ONLY that identity's data can be read or written.
     · Signed out → "guest" data lives in the tab's session
       storage (tsb_g:<key>) and dies with the tab, sliding
       15-minute life, never carried anywhere.
     · Switching accounts → guest work is discarded (a guest has
       not earned a place in any account), and any legacy
       device-scoped data is parked in tsb_orphan_v268 once so
       it can never leak into someone's profile again.

   How: this file loads FIRST on every page and wraps the
   storage prototypes. App code keeps saying localStorage
   "tsb_progress", the vault silently reroutes it to the
   signed-in identity's own shelf. Nobody else's shelf is
   reachable, so one phone can hold five accounts and they
   never see each other's books, streaks, gold or unlocks.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_VAULT) return;

  var VERSION = "tsb_u:";
  var GUEST = "tsb_g:";
  var ORPHAN = "tsb_orphan_v268";
  var SESSION_KEY = "tsb_auth_session";
  var GUEST_TTL = 15 * 60 * 1000;   /* guests get ~15 sliding minutes */

  /* raw, unwrapped handles, the vault itself must never reroute */
  var rawLS = window.localStorage, rawSS = window.sessionStorage;
  var rawGet = Storage.prototype.getItem,
      rawSet = Storage.prototype.setItem,
      rawRemove = Storage.prototype.removeItem,
      rawKey = Storage.prototype.key;

  /* everything that belongs to the ACCOUNT (scoped per uid) */
  var USER_KEYS = [
    "tsb_progress", "tsb_bookmarks", "tsb_streak", "tsb_last",
    "tsb_display_name", "tsb_gold", "tsb_iaudit_unlock", "tsb_ia_ai",
    "tsb_interests", "tsb_starter_shelf", "tsb_notif_seen", "tsb_notif_fresh",
    "tsb_threads", "tsb_prog_last_n"
  ];
  var USER_PREFIXES = ["tsb_ask_lib_"];

  function isUserKey(k) {
    if (!k) return false;
    k = String(k);
    if (USER_KEYS.indexOf(k) >= 0) return true;
    for (var i = 0; i < USER_PREFIXES.length; i++) if (k.indexOf(USER_PREFIXES[i]) === 0) return true;
    return false;
  }

  function sessionUid() {
    try {
      var s = JSON.parse(rawGet.call(rawLS, SESSION_KEY) || "null");
      var id = s && s.user && s.user.id;
      return id ? String(id) : "";
    } catch (e) { return ""; }
  }

  var currentUid = "";

  function scoped(name) { return VERSION + currentUid + ":" + name; }
  function guestName(name) { return GUEST + name; }

  /* ---- guest shelf: session storage + sliding 15-minute life ---- */
  function guestGet(name) {
    try {
      var r = JSON.parse(rawGet.call(rawSS, guestName(name)) || "null");
      if (!r) return null;
      if (Date.now() - (r.t || 0) > GUEST_TTL) { rawRemove.call(rawSS, guestName(name)); return null; }
      return r.v;
    } catch (e) { return null; }
  }
  function guestSet(name, v) {
    try { rawSet.call(rawSS, guestName(name), JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
  }
  function guestDel(name) { try { rawRemove.call(rawSS, guestName(name)); } catch (e) {} }
  function guestWipe() {
    try {
      var ks = [], i, n;
      for (i = 0; i < rawSS.length; i++) { n = rawKey.call(rawSS, i); if (n && n.indexOf(GUEST) === 0) ks.push(n); }
      ks.forEach(function (x) { rawRemove.call(rawSS, x); });
    } catch (e) {}
  }

  /* ---- legacy flat data: parked, never merged into any account ---- */
  function orphanFlat() {
    try {
      var bag = {}, ks = [], i, n, found = false;
      for (i = 0; i < rawLS.length; i++) {
        n = rawKey.call(rawLS, i);
        if (n && isUserKey(n)) { bag[n] = rawGet.call(rawLS, n); ks.push(n); found = true; }
      }
      if (!found) return;
      var prev = {};
      try { prev = JSON.parse(rawGet.call(rawLS, ORPHAN) || "{}"); } catch (e) { prev = {}; }
      Object.keys(bag).forEach(function (k) { if (!(k in prev)) prev[k] = bag[k]; });
      try { rawSet.call(rawLS, ORPHAN, JSON.stringify(prev)); } catch (e) {}
      ks.forEach(function (x) { rawRemove.call(rawLS, x); });
    } catch (e) {}
  }

  /* ---- identity transitions ---- */
  function adopt(uid) {
    uid = uid ? String(uid) : "";
    if (uid === currentUid) return;
    if (uid) {
      /* the wall, raised BEFORE this identity reads a single byte:
         device leftovers are parked, guest work is thanked and let go */
      orphanFlat();
      guestWipe();
    }
    currentUid = uid;
    try { window.dispatchEvent(new CustomEvent("tsb:vault")); } catch (e) {}
  }
  function signOutWipe() {
    guestWipe();
    adopt("");
  }

  /* ---- the wall itself: wrapped storage ---- */
  Storage.prototype.getItem = function (name) {
    name = String(name);
    if (isUserKey(name)) return currentUid ? rawGet.call(this, scoped(name)) : guestGet(name);
    return rawGet.call(this, name);
  };
  Storage.prototype.setItem = function (name, v) {
    name = String(name);
    if (isUserKey(name)) {
      if (currentUid) rawSet.call(this, scoped(name), String(v));
      else guestSet(name, String(v));
      return;
    }
    rawSet.call(this, name, String(v));
  };
  Storage.prototype.removeItem = function (name) {
    name = String(name);
    if (isUserKey(name)) {
      if (currentUid) rawRemove.call(this, scoped(name));
      else guestDel(name);
      return;
    }
    rawRemove.call(this, name);
  };

  /* ---- enumeration shows ONLY the current identity's world ----
     (backup export, sweepers, settings pages iterate localStorage.
     they must never see another account's shelf on this phone) */
  function visibleNames() {
    var out = [], i, n, seen = {};
    var prefix = VERSION + currentUid + ":";
    try {
      for (i = 0; i < rawLS.length; i++) {
        n = rawKey.call(rawLS, i);
        if (!n) continue;
        if (n.indexOf(VERSION) === 0) {
          if (currentUid && n.indexOf(prefix) === 0) { var short_ = n.slice(prefix.length); if (!seen[short_]) { seen[short_] = 1; out.push(short_); } }
          continue;
        }
        if (n === ORPHAN || n.indexOf(GUEST) === 0 || isUserKey(n)) continue;
        if (!seen[n]) { seen[n] = 1; out.push(n); }
      }
      if (!currentUid) {
        for (i = 0; i < rawSS.length; i++) {
          n = rawKey.call(rawSS, i);
          if (n && n.indexOf(GUEST) === 0) { var g = n.slice(GUEST.length); if (!seen[g]) { seen[g] = 1; out.push(g); } }
        }
      }
    } catch (e) {}
    return out;
  }
  /* jsdom and some engines hold these as own properties, install each one
     on its own, every way we can, so enumeration can never betray a sibling */
  function installEnum() {
    try { Object.defineProperty(rawLS, "length", { get: function () { return visibleNames().length; }, configurable: true }); }
    catch (e) { try { rawLS.length = visibleNames().length; } catch (e2) {} }
    var keyFn = function (i) { var v = visibleNames(); return (i >= 0 && i < v.length) ? v[i] : null; };
    var okKey = false;
    try { Object.defineProperty(rawLS, "key", { get: function () { return keyFn; }, configurable: true }); okKey = true; } catch (e) {}
    if (!okKey) { try { rawLS.key = keyFn; } catch (e2) {} }
  }
  installEnum();
  setTimeout(installEnum, 300);

  /* ---- keep in step with the session ---- */
  window.addEventListener("tsb:auth", function () { setTimeout(function () { adopt(sessionUid()); }, 0); });
  window.addEventListener("tsb:auth-error", function () { setTimeout(function () { adopt(sessionUid()); }, 0); });
  /* another tab signed in or out */
  window.addEventListener("storage", function (e) {
    if (e && e.key === SESSION_KEY) setTimeout(function () { adopt(sessionUid()); }, 0);
  });
  /* the session can also appear while this page was already open */
  setTimeout(function () { adopt(sessionUid()); }, 1200);
  setInterval(function () { var u = sessionUid(); if (u !== currentUid) adopt(u); }, 4000);

  /* a reader on the OLD build (flat keys, not signed in) keeps their world.
     moved into this tab's guest shelf, it dies with the tab and never
     reaches any account */
  function guestAdoptFlat() {
    try {
      var ks = [], i, n;
      for (i = 0; i < rawLS.length; i++) { n = rawKey.call(rawLS, i); if (n && isUserKey(n)) ks.push(n); }
      ks.forEach(function (x) {
        var v = rawGet.call(rawLS, x);
        rawRemove.call(rawLS, x);
        if (v !== null && v !== undefined) { try { rawSet.call(rawSS, guestName(x), JSON.stringify({ t: Date.now(), v: v })); } catch (e) {} }
      });
    } catch (e) {}
  }

  currentUid = sessionUid();
  if (currentUid) { orphanFlat(); guestWipe(); } else { guestAdoptFlat(); }

  window.TSB_VAULT = {
    identity: adopt,
    who: function () { return currentUid; },
    wipeGuest: guestWipe,
    signOutWipe: signOutWipe,
    orphanFlat: orphanFlat,
    visibleNames: visibleNames,
    isUserKey: isUserKey,
    USER_KEYS: USER_KEYS,
    /* the god view, diagnostics and honest tests only */
    raw: {
      lsGet: function (k) { try { return rawGet.call(rawLS, k); } catch (e) { return null; } },
      ssGet: function (k) { try { return rawGet.call(rawSS, k); } catch (e) { return null; } },
      lsKey: function (i) { try { return rawKey.call(rawLS, i); } catch (e) { return null; } },
      lsLen: function () { try { return rawLS.length; } catch (e) { return 0; } }
    }
  };
})();
