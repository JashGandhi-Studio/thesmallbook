/* ============================================================
   THESMALLBOOK, 📓 NOTES STORE (notes-store.js) · v300
   One module behind the whole notebook, first-class like the
   scroller and the ask engine:
   • OFFLINE-FIRST  : localStorage stays the fast cache the
     notebook has always used (same keys, nothing migrates).
   • REAL SYNC      : every note mirrors to the tsb_notes table
     (Supabase, own-rows-only RLS) with debounced pushes and a
     pull-merge on sign-in, so a note written on the phone is on
     the laptop. Tombstones travel too: deletes propagate.
   • MEDIA IN STORAGE: photos and voice notes upload to the
     tsb-note-media bucket. Offline they stay local with a
     local:true flag and get retried on the next boot, and the
     failure is never silent.
   • HIGHLIGHTS     : highlight.js marks lines while reading;
     this module exposes them so the notebook can show "From
     your reading" with the book attached.
   Dormant parts degrade gracefully: signed out, everything works
   on-device exactly as before, the banner just says the truth.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_NOTES_STORE) return;

  var CFG = window.TSB_CONFIG || {};
  var URL = (CFG.SUPABASE_URL || "").replace(/\/$/, "");
  var ANON = CFG.SUPABASE_ANON_KEY || "";
  var KEYU = "tsb_notes_v1_";
  var MEDK = "tsb_note_media_";
  var HLKEY = "tsb_highlights_v1";
  var STATEKEY = "tsb_note_state_";
  var PUSH_DELAY = 2500;

  /* ---------- tiny utils ---------- */
  function escRaw(s) { return String(s == null ? "" : s); }
  function jget(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function jdel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function uuid() {
    return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function me() {
    try { var u0 = (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) || null; if (u0) return u0; } catch (e) {}
    try { var s = JSON.parse(localStorage.getItem("tsb_auth_session")); return (s && s.user) || null; } catch (e) { return null; }
  }
  function uid() { var u = me(); return (u && u.id) || "guest"; }
  function key() { return KEYU + uid(); }
  function mkey() { return MEDK + uid(); }
  function skey() { return STATEKEY + uid(); }

  async function token() {
    try {
      if (window.TSB_AUTH && typeof TSB_AUTH.token === "function") { var t = await TSB_AUTH.token(); if (t) return t; }
    } catch (e) {}
    try { var s = JSON.parse(localStorage.getItem("tsb_auth_session")); return (s && s.access_token) || null; } catch (e) { return null; }
  }

  /* ---------- cache ---------- */
  function raw(k) { return jget(k, []); }
  function cache() { return raw(key()); }
  function saveCache(arr) { return jset(key(), arr); }

  /* ---------- book titles from the library ---------- */
  function bookOf(bookId) {
    var src = (window.BOOKS || []);
    for (var i = 0; i < src.length; i++) if (src[i].id === bookId) return src[i];
    return null;
  }
  function bookTitle(bookId) { var b = bookOf(bookId); return b ? b.title : (bookId || ""); }

  /* ============================================================
     SYNC: push queue (debounced upserts) + pull-merge on sign-in
     ============================================================ */
  var pushTimer = null, pushBusy = false, dirty = {};
  function markDirty(id) {
    dirty[id] = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(flushPushes, PUSH_DELAY);
  }
  async function flushPushes() {
    if (pushBusy) { clearTimeout(pushTimer); pushTimer = setTimeout(flushPushes, PUSH_DELAY); return; }
    var u = me();
    if (!u || u.id === "guest") return;                     /* offline mode, cache only */
    var ids = Object.keys(dirty);
    if (!ids.length) return;
    var tk = await token();
    if (!tk || !URL) return;
    var rows = [];
    var all = cache();
    ids.forEach(function (id) {
      for (var i = 0; i < all.length; i++) if (all[i].id === id) {
        var n = all[i];
        rows.push({
          id: n.id, user_id: u.id,
          book_id: n.bookId || null, book_title: n.bookTitle || null,
          lesson_idx: (typeof n.lessonIdx === "number" ? n.lessonIdx : null),
          lesson_title: n.lessonTitle || null,
          title: n.title || "",
          body: Array.isArray(n.pages) ? JSON.stringify(n.pages) : (n.body || ""),
          tags: n.tags || [],
          media: n.media || [],
          deleted: !!n.deleted,
          created_at: new Date(n.created || Date.now()).toISOString(),
          updated_at: new Date(n.updated || Date.now()).toISOString()
        });
        break;
      }
    });
    dirty = {};
    if (!rows.length) return;
    pushBusy = true;
    try {
      var res = await fetch(URL + "/rest/v1/tsb_notes?on_conflict=id", {
        method: "POST",
        headers: { apikey: ANON, Authorization: "Bearer " + tk, "Content-Type": "application/json", Prefer: "resolution=merge-deduplicate,return=minimal" },
        body: JSON.stringify(rows)
      });
      if (!res.ok) {
        /* put the work back in the queue, try again next change or boot */
        rows.forEach(function (r) { dirty[r.id] = true; });
      }
    } catch (e) {
      rows.forEach(function (r) { dirty[r.id] = true; });
    }
    pushBusy = false;
  }

  async function pull() {
    var u = me();
    if (!u || u.id === "guest" || !URL) return { pulled: 0 };
    var tk = await token();
    if (!tk) return { pulled: 0 };
    var res;
    try {
      res = await fetch(URL + "/rest/v1/tsb_notes?user_id=eq." + encodeURIComponent(u.id) + "&select=*&order=updated_at.desc&limit=500", {
        headers: { apikey: ANON, Authorization: "Bearer " + tk }
      });
    } catch (e) { return { pulled: 0 }; }
    if (!res.ok) return { pulled: 0 };
    var rows;
    try { rows = await res.json(); } catch (e) { return { pulled: 0 }; }
    var local = cache();
    var byId = {};
    local.forEach(function (n) { byId[n.id] = n; });
    var added = 0;
    (rows || []).forEach(function (r) {
      var n = {
        id: r.id,
        bookId: r.book_id || null, bookTitle: r.book_title || null,
        lessonIdx: (r.lesson_idx === null ? null : r.lesson_idx), lessonTitle: r.lesson_title || null,
        title: r.title || "",
        body: "", pages: pagesFromRow(r.body),
        tags: r.tags || [],
        media: Array.isArray(r.media) ? r.media : [],
        deleted: !!r.deleted,
        created: r.created_at ? Date.parse(r.created_at) : Date.now(),
        updated: r.updated_at ? Date.parse(r.updated_at) : Date.now()
      };
      var m = byId[n.id];
      if (!m) { if (!n.deleted) { local.push(n); added++; } byId[n.id] = n; }
      else if ((n.updated || 0) > (m.updated || 0)) {
        if (n.deleted) { local = local.filter(function (x) { return x.id !== n.id; }); delete byId[n.id]; }
        else { local = local.map(function (x) { return x.id === n.id ? n : x; }); byId[n.id] = n; }
        added++;
      }
    });
    saveCache(local);
    retryLocalMedia();
    return { pulled: added };
  }

  /* ---------- CRUD ---------- */
  function list() { return cache().filter(function (n) { return !n.deleted; }); }
  function get(id) { return list().filter(function (n) { return n.id === id; })[0] || null; }

  function create(fields) {
    var now = Date.now();
    var n = {
      id: uuid(),
      bookId: fields.bookId || null,
      bookTitle: fields.bookId ? bookTitle(fields.bookId) : (fields.bookTitle || null),
      lessonIdx: (typeof fields.lessonIdx === "number" ? fields.lessonIdx : null),
      lessonTitle: fields.lessonTitle || null,
      title: fields.title || "",
      body: fields.body || "",
      pages: Array.isArray(fields.pages) ? fields.pages : undefined,
      tags: fields.tags || [],
      media: fields.media || [],
      created: now, updated: now
    };
    if (n.pages === undefined) delete n.pages;
    var all = cache();
    all.unshift(n);
    saveCache(all);
    markDirty(n.id);
    setLastNote(n.id);
    return n;
  }

  function update(id, patch) {
    var all = cache();
    var hit = null;
    all = all.map(function (n) {
      if (n.id !== id) return n;
      hit = Object.assign({}, n, patch, { updated: Date.now() });
      return hit;
    });
    if (hit) saveCache(all);
    if (hit) markDirty(id);
    return hit;
  }

  function remove(id) {
    var all = cache();
    var gone = all.some(function (n) { return n.id === id; });
    all = all.filter(function (n) { return n.id !== id; });
    saveCache(all);
    if (uid() !== "guest") {
      /* tombstone so the delete reaches the laptop too */
      all.push({ id: id, deleted: true, updated: Date.now() });
      saveCache(all);
      markDirty(id);
      var self = all;
      setTimeout(function () { /* prune the tombstone from cache after it had its chance */
        var later = cache().filter(function (n) { return !(n.id === id && n.deleted); });
        saveCache(later);
      }, 30000);
    }
    return gone;
  }

  /* pages travel as JSON inside `body`; plain text notes stay plain */
  function pagesFromRow(bodyRaw) {
    var b = String(bodyRaw || "");
    if (b.charAt(0) === "[") {
      try { var p = JSON.parse(b); if (Array.isArray(p)) return p; } catch (e) {}
    }
    return b ? [b] : [""];
  }
  function noteText(n) {
    if (Array.isArray(n.pages)) return n.pages.map(function (p) { return String(p || "").replace(/<[^>]*>/g, " "); }).join(" ");
    return String(n.body || "");
  }

  /* ---------- guest → account copy (runs on sign-in, before pull) ---------- */
  function absorbGuest() {
    var u = uid();
    if (u === "guest") return;
    var mine = cache(), guest = raw(KEYU + "guest");
    if (!guest.length) return;
    var ids = {}; mine.forEach(function (n) { ids[n.id] = n; });
    var added = false;
    guest.forEach(function (g) {
      if (!ids[g.id]) { mine.push(g); added = true; }
      else if ((g.updated || 0) > (ids[g.id].updated || 0)) {
        mine = mine.map(function (n) { return n.id === g.id ? g : n; }); added = true;
      }
    });
    if (added) { mine.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }); saveCache(mine); }
  }

  /* ---------- media: Storage first, local fallback, retry on boot ---------- */
  async function uploadMedia(blob, kind, filename) {
    var C = window.TSB_COMMUNITY;
    if (C && C.upload && me()) {
      try {
        var f = new File([blob], filename || ("note-" + Date.now() + "." + (kind === "audio" ? "webm" : "jpg")), { type: blob.type });
        var out = await C.upload(f, "tsb-note-media");
        var url = (typeof out === "string") ? out : ((out && (out.url || out.path)) || "");
        if (url) return { type: kind, url: url, path: (out && out.path) || "", local: false };
      } catch (e) { /* fall through to local */ }
    }
    /* offline or storage refused: keep it on-device, flag it, never silent */
    var dataUrl = await new Promise(function (done) {
      var fr = new FileReader();
      fr.onload = function () { done(fr.result); };
      fr.onerror = function () { done(""); };
      fr.readAsDataURL(blob);
    });
    return { type: kind, url: dataUrl, path: "", local: true };
  }

  function localMedia() {
    var out = [];
    list().forEach(function (n) {
      (n.media || []).forEach(function (m) { if (m.local && m.url) out.push({ noteId: n.id, media: m }); });
    });
    return out;
  }

  var retried = false;
  async function retryLocalMedia() {
    if (retried) return; retried = true;
    var pend = localMedia();
    if (!pend.length) return;
    var C = window.TSB_COMMUNITY;
    if (!C || !C.upload || !me()) return;
    for (var i = 0; i < pend.length; i++) {
      try {
        var m = pend[i].media;
        var blob = await (await fetch(m.url)).blob();
        var kind = m.type === "audio" ? "audio" : "image";
        var up = await uploadMedia(blob, kind);
        if (up && !up.local) {
          var n = get(pend[i].noteId);
          if (n) {
            update(pend[i].noteId, {
              media: (n.media || []).map(function (x) { return x === m ? up : x; })
            });
          }
        }
      } catch (e) {}
    }
  }

  /* ---------- storage pressure, made visible ---------- */
  function bytesUsed() {
    var n = 0, k = key();
    try {
      n += (localStorage.getItem(k) || "").length + (localStorage.getItem(mkey()) || "").length;
      for (var i = 0; i < localStorage.length; i++) {
        var kk = localStorage.key(i);
        if (kk && kk.indexOf(MEDK) === 0 && kk !== mkey()) n += (localStorage.getItem(kk) || "").length;
      }
    } catch (e) {}
    return n * 2; /* UTF-16 */
  }
  function pressure() {
    var b = bytesUsed(), cap = 5 * 1024 * 1024;
    return { bytes: b, cap: cap, pct: Math.min(100, Math.round((b / cap) * 100)) };
  }
  function cachePutGuarded(k, v) {
    if (!jset(k, v)) {
      var err = new Error("cache-full");
      err.code = "cache-full";
      throw err;
    }
    return true;
  }

  /* ---------- highlights: from reading, into the notebook ---------- */
  function highlights() {
    var map = jget(HLKEY, {});
    var out = [];
    Object.keys(map).forEach(function (bookId) {
      var t = bookTitle(bookId);
      (map[bookId] || []).forEach(function (h) {
        if (h && h.text) out.push({ bookId: bookId, bookTitle: t, lessonIdx: h.lesson, text: h.text, at: h.ts || h.t || 0 });
      });
    });
    out.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    return out;
  }
  function highlightCount() { return highlights().length; }
  function clearHighlight(bookId, text) {
    var map = jget(HLKEY, {});
    if (!map[bookId]) return;
    map[bookId] = map[bookId].filter(function (h) { return h.text !== text; });
    jset(HLKEY, map);
  }

  /* ---------- continue-writing pointer + daily prompt ---------- */
  function setLastNote(id) { jset(skey(), { last: id, at: Date.now() }); }
  function lastNote() {
    var st = jget(skey(), null);
    if (!st) return null;
    var n = get(st.last);
    return n || null;
  }
  var PROMPTS = [
    "What did today's pages argue with me about?",
    "One line I underlined twice, and why.",
    "The habit this book says I should kill first.",
    "If I wrote one page to my younger self, from this chapter…",
    "A story from this book worth retelling.",
    "What am I avoiding that this book just named?",
    "One number from this book worth remembering.",
    "Where did this author sound completely wrong to me?",
    "The one sentence I keep thinking about.",
    "What would I do tomorrow if I believed this page?",
    "Who do I know who already lives this chapter?",
    "The smallest step this book pushes me to take this week."
  ];
  function dailyPrompt() {
    var u = uid(), d = new Date();
    var seed = 5381;
    var s = u + "|" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    for (var i = 0; i < s.length; i++) seed = ((seed << 5) + seed + s.charCodeAt(i)) >>> 0;
    return PROMPTS[seed % PROMPTS.length];
  }

  /* ---------- search ---------- */
  function search(q, arr) {
    var t = String(q || "").trim().toLowerCase();
    var src = arr || list();
    if (!t) return src;
    return src.filter(function (n) {
      var hay = ((n.title || "") + " " + noteText(n) + " " + (n.bookTitle || "") + " " + (n.tags || []).join(" ")).toLowerCase();
      return hay.indexOf(t) >= 0;
    });
  }

  /* ---------- auth wiring ---------- */
  function onAuth(cb) {
    try { if (window.TSB_COMMUNITY && TSB_COMMUNITY.whenReady) TSB_COMMUNITY.whenReady(function () { cb(); }); } catch (e) { cb(); }
    window.addEventListener("tsb:auth", function () { cb(); });
  }

  function boot() {
    onAuth(async function () {
      absorbGuest();
      await pull();
      try { window.dispatchEvent(new CustomEvent("tsb:notes-synced")); } catch (e) {}
    });
  }
  boot();

  window.TSB_NOTES_STORE = {
    list: list, get: get, create: create, update: update, remove: remove,
    pull: pull, absorbGuest: absorbGuest, flush: flushPushes,
    uploadMedia: uploadMedia, retryLocalMedia: retryLocalMedia,
    pressure: pressure, cachePutGuarded: cachePutGuarded,
    highlights: highlights, highlightCount: highlightCount, clearHighlight: clearHighlight,
    setLastNote: setLastNote, lastNote: lastNote, dailyPrompt: dailyPrompt,
    search: search, bookOf: bookOf, bookTitle: bookTitle,
    me: me, uid: uid,
    __raw: cache
  };
})();
