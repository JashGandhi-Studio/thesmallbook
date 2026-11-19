/* ============================================================
   THESMALLBOOK, TSB.store (tsb-store.js) · v418
   ONE storage service for the keys that carry a reader's work.
   Before v418 every module kept its own localStorage helpers
   and its own habits: progress in prefs, positions as raw
   strings in the reader, notes under per-user keys, the served
   history as a private film.js map. The data was fine; the
   discipline was not. TSB.store is the single door now:

   • get / set / remove        JSON values, honest failures
   • rawGet / rawSet           string values (reader positions
                               stay plain page numbers, exactly
                               as the sync layer already expects)
   • userGet / userSet         the same keys scoped to the
                               signed-in account (guest when
                               signed out), the notes convention
   • KEYS                      the registry of high-risk keys:
                               what owns each one and whether
                               it travels with the account

   Nothing migrates on disk: the service adopts the existing
   key names, so the account vault and the cloud sync keep
   reading exactly what they read before. A failed write is
   never swallowed: set returns false and the page hears
   "tsb:storage-full", the v415 rule.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB && window.TSB.store) return;

  /* The high-risk registry. sync: "account" travels with the
     person, "device" stays on the phone on purpose. */
  var KEYS = [
    { key: "tsb_progress", owner: "prefs.js progress", sync: "account", note: "lessons ticked, per book" },
    { key: "tsb_bookmarks", owner: "prefs.js bookmarks", sync: "account", note: "the shelf" },
    { key: "tsb_read_books", owner: "prefs.js / auth.js", sync: "account", note: "finished books" },
    { key: "tsb_plans", owner: "prefs.js plans", sync: "account", note: "action plan checklists" },
    { key: "tsb_streak", owner: "prefs.js streak", sync: "account", note: "reading streak" },
    { key: "tsb_days", owner: "prefs.js / auth.js", sync: "account", note: "days read" },
    { key: "tsb_min_log", owner: "auth.js journey", sync: "account", note: "minutes per day" },
    { key: "tsb_highlights_v1", owner: "notes-store.js", sync: "account", note: "lines kept while reading" },
    { key: "tsb_notes_v1_<uid>", owner: "notes-store.js", sync: "account", note: "the notebook itself" },
    { key: "tsb_outbox_v1_<uid>", owner: "notes-store.js", sync: "device", note: "note pushes waiting for a network" },
    { key: "tsb_reader_pos_<book>", owner: "reader.js", sync: "account", note: "where each book was left open" },
    { key: "tsb_reader_pos_updated_<book>", owner: "reader.js", sync: "account", note: "when that position was written" },
    { key: "tsb_served", owner: "film.js served history", sync: "account", note: "what Today already showed, per day" },
    { key: "tsb_telemetry_v1", owner: "telemetry.js", sync: "device", note: "real product events, this device" },
    { key: "tsb_theme", owner: "device comforts", sync: "device", note: "appearance stays on the phone" },
    { key: "tsb_rm_size", owner: "device comforts", sync: "device", note: "reader text size stays on the phone" }
  ];

  function uid() {
    try { if (window.TSB_AUTH && TSB_AUTH.user) { var u = TSB_AUTH.user(); if (u && u.id) return u.id; } } catch (e) {}
    try { var s = JSON.parse(localStorage.getItem("tsb_auth_session") || "null"); return (s && s.user && s.user.id) || "guest"; } catch (e) { return "guest"; }
  }

  function full(key) {
    try { if (window.dispatchEvent) window.dispatchEvent(new CustomEvent("tsb:storage-full", { detail: { key: key } })); } catch (e) {}
  }

  function get(key, def) {
    try {
      var v = localStorage.getItem(key);
      if (v === null) return def;
      try { return JSON.parse(v); } catch (e) { return v; }
    } catch (e) { return def; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { full(key); return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); return true; } catch (e) { return false; }
  }
  function rawGet(key, def) {
    try { var v = localStorage.getItem(key); return v === null ? def : v; } catch (e) { return def; }
  }
  function rawSet(key, val) {
    try { localStorage.setItem(key, String(val)); return true; }
    catch (e) { full(key); return false; }
  }
  function userKey(key) { return key + "_" + uid(); }
  function userGet(key, def) { return get(userKey(key), def); }
  function userSet(key, val) { return set(userKey(key), val); }
  function userRemove(key) { return remove(userKey(key)); }
  function describe(key) {
    for (var i = 0; i < KEYS.length; i++) {
      var pat = KEYS[i].key;
      if (pat === key) return KEYS[i];
      if (pat.indexOf("<") > 0 && key.indexOf(pat.slice(0, pat.indexOf("<"))) === 0) return KEYS[i];
    }
    return null;
  }

  window.TSB = window.TSB || {};
  window.TSB.store = {
    get: get, set: set, remove: remove,
    rawGet: rawGet, rawSet: rawSet,
    userGet: userGet, userSet: userSet, userRemove: userRemove,
    uid: uid, describe: describe, KEYS: KEYS
  };
})();
