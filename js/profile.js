/* ============================================================
   THESMALLBOOK — 👤 PROFILE ENGINE (profile.js)
   Real accounts: username, display name, bio, avatar.

   Backed by Supabase `profiles` + the `avatars` storage bucket
   (SQL in docs/SUPABASE-SETUP.md). Degrades to a local-only
   profile when Supabase isn't reachable, so the UI never breaks.

   window.TSB_PROFILE
     .get()                     → cached profile | null
     .load(force)               → Promise<profile|null>
     .save(patch)               → Promise<{ok, profile|error}>
     .checkUsername(u)          → Promise<{available, reason}>
     .uploadAvatar(file)        → Promise<{ok, url|error}>
     .stats()                   → { booksRead, lessonsRead, streak }
     .initials(p)               → "JG"
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_PROFILE) return;

  var CACHE_KEY = "tsb_profile";
  var cached = null;

  function A() { return window.TSB_AUTH || null; }
  function user() { try { return A() && A().user && A().user(); } catch (e) { return null; } }
  function base() { var a = A(); return (a && a.SUPABASE_URL) || ""; }
  function anon() { var a = A(); return (a && a.SUPABASE_ANON) || ""; }
  function live() { return !!(base() && anon() && user() && A().ensureToken); }

  function lsGet(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }
    catch (e) { return d; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- username rules ---------- */
  var RESERVED = ("admin administrator root support help api www mail ftp official " +
    "thesmallbook tsb staff team mod moderator system null undefined about login " +
    "signup register settings profile chat home read add me you user users book books " +
    "graveyard stories gold scan search").split(" ");

  function normUsername(u) {
    return String(u || "").toLowerCase().trim().replace(/^@+/, "").replace(/[^a-z0-9_]/g, "");
  }
  function validateUsername(u) {
    var n = normUsername(u);
    if (!n) return { ok: false, reason: "Pick a username." };
    if (n.length < 3) return { ok: false, reason: "At least 3 characters." };
    if (n.length > 20) return { ok: false, reason: "20 characters max." };
    if (/^[0-9_]+$/.test(n)) return { ok: false, reason: "Needs at least one letter." };
    if (RESERVED.indexOf(n) !== -1) return { ok: false, reason: "That one's reserved." };
    return { ok: true, value: n };
  }

  /* ---------- REST helpers ---------- */
  async function rest(path, opts) {
    var a = A();
    var tok = await a.ensureToken();
    if (!tok) throw new Error("no-token");
    var res = await fetch(base() + "/rest/v1/" + path, Object.assign({}, opts, {
      headers: Object.assign({
        apikey: anon(),
        Authorization: "Bearer " + tok,
        "Content-Type": "application/json"
      }, (opts && opts.headers) || {})
    }));
    if (!res.ok) {
      var body = "";
      try { body = await res.text(); } catch (e) {}
      throw new Error("HTTP " + res.status + " " + body.slice(0, 160));
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /* ---------- fallback profile from the auth session ---------- */
  function fromSession() {
    var u = user();
    if (!u) return null;
    var meta = u.user_metadata || {};
    var email = u.email || "";
    var guess = normUsername((meta.preferred_username || meta.name || email.split("@")[0] || "reader"))
      .slice(0, 20) || "reader";
    return {
      id: u.id,
      username: guess,
      display_name: meta.full_name || meta.name || email.split("@")[0] || "Reader",
      avatar_url: meta.avatar_url || meta.picture || "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      created_at: u.created_at || new Date().toISOString(),
      _local: true
    };
  }

  /* ---------- API ---------- */
  function get() {
    if (cached) return cached;
    var u = user();
    if (!u) return null;
    var stored = lsGet(CACHE_KEY, null);
    if (stored && stored.id === u.id) { cached = stored; return cached; }
    return null;
  }

  async function load(force) {
    var u = user();
    if (!u) { cached = null; return null; }
    if (!force) {
      var c = get();
      if (c) { refresh(); return c; }
    }
    return refresh();
  }

  async function refresh() {
    var u = user();
    if (!u) return null;
    if (!live()) {
      cached = get() || fromSession();
      if (cached) lsSet(CACHE_KEY, cached);
      return cached;
    }
    try {
      var rows = await rest("profiles?select=*&id=eq." + encodeURIComponent(u.id));
      if (rows && rows.length) {
        cached = rows[0];
      } else {
        /* first sign-in → create the row */
        var seed = fromSession();
        seed.username = await freeUsername(seed.username);
        delete seed._local;
        try {
          var made = await rest("profiles", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(seed)
          });
          cached = (made && made[0]) || seed;
        } catch (e) { cached = seed; }
      }
      lsSet(CACHE_KEY, cached);
      emit();
      return cached;
    } catch (e) {
      console.warn("[TSB] profile load failed, using local:", e.message);
      cached = get() || fromSession();
      if (cached) lsSet(CACHE_KEY, cached);
      return cached;
    }
  }

  async function freeUsername(want) {
    var n = normUsername(want) || "reader";
    for (var i = 0; i < 12; i++) {
      var candidate = i === 0 ? n : n.slice(0, 16) + Math.floor(Math.random() * 9000 + 1000);
      var r = await checkUsername(candidate);
      if (r.available) return candidate;
    }
    return n + Date.now().toString().slice(-5);
  }

  async function checkUsername(u) {
    var v = validateUsername(u);
    if (!v.ok) return { available: false, reason: v.reason };
    if (!live()) return { available: true, reason: "" };
    try {
      var rows = await rest("profiles?select=id&username=eq." + encodeURIComponent(v.value) + "&limit=1");
      var me = user();
      if (rows && rows.length && (!me || rows[0].id !== me.id)) {
        return { available: false, reason: "Taken \u2014 try another." };
      }
      return { available: true, reason: "" };
    } catch (e) {
      return { available: true, reason: "" };   /* never block on a network hiccup */
    }
  }

  async function save(patch) {
    var u = user();
    if (!u) return { ok: false, error: "not-signed-in" };

    patch = patch || {};
    if (patch.username != null) {
      var v = validateUsername(patch.username);
      if (!v.ok) return { ok: false, error: v.reason };
      var chk = await checkUsername(v.value);
      if (!chk.available) return { ok: false, error: chk.reason };
      patch.username = v.value;
    }
    if (patch.display_name != null) {
      patch.display_name = String(patch.display_name).trim().slice(0, 40);
      if (!patch.display_name) return { ok: false, error: "Name can't be empty." };
    }
    if (patch.bio != null) patch.bio = String(patch.bio).trim().slice(0, 160);

    var next = Object.assign({}, get() || fromSession(), patch, { id: u.id });
    cached = next;
    lsSet(CACHE_KEY, next);
    emit();

    if (!live()) return { ok: true, profile: next, local: true };
    try {
      var body = {};
      ["username", "display_name", "bio", "avatar_url"].forEach(function (k) {
        if (patch[k] !== undefined) body[k] = patch[k];
      });
      if (!Object.keys(body).length) return { ok: true, profile: next };
      await rest("profiles?id=eq." + encodeURIComponent(u.id), {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(body)
      });
      return { ok: true, profile: next };
    } catch (e) {
      var msg = /duplicate|unique/i.test(e.message) ? "That username is taken." : "Couldn't save \u2014 check your connection.";
      return { ok: false, error: msg, profile: next };
    }
  }

  /* ---------- avatar upload (Supabase Storage) ---------- */
  var MAX_AVATAR = 2 * 1024 * 1024;   /* 2 MB */

  function compress(file, maxPx) {
    return new Promise(function (resolve) {
      try {
        var img = new Image();
        var url = URL.createObjectURL(file);
        img.onload = function () {
          try {
            var scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
            var c = document.createElement("canvas");
            c.width = w; c.height = h;
            c.getContext("2d").drawImage(img, 0, 0, w, h);
            c.toBlob(function (b) {
              URL.revokeObjectURL(url);
              resolve(b || file);
            }, "image/jpeg", 0.86);
          } catch (e) { URL.revokeObjectURL(url); resolve(file); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      } catch (e) { resolve(file); }
    });
  }

  async function uploadAvatar(file) {
    var u = user();
    if (!u) return { ok: false, error: "not-signed-in" };
    if (!file || !/^image\//.test(file.type)) return { ok: false, error: "Pick an image file." };
    if (file.size > MAX_AVATAR * 4) return { ok: false, error: "That image is too large (8 MB max)." };

    var blob = await compress(file, 512);
    if (blob.size > MAX_AVATAR) return { ok: false, error: "Image too large after compression." };

    if (!live()) {
      /* offline / no backend → keep it working with a data URL */
      var dataUrl = await new Promise(function (res) {
        var fr = new FileReader();
        fr.onload = function () { res(fr.result); };
        fr.onerror = function () { res(""); };
        fr.readAsDataURL(blob);
      });
      if (!dataUrl) return { ok: false, error: "Couldn't read that image." };
      await save({ avatar_url: dataUrl });
      return { ok: true, url: dataUrl, local: true };
    }

    try {
      var a = A();
      var tok = await a.ensureToken();
      var path = u.id + "/avatar-" + Date.now() + ".jpg";
      var res = await fetch(base() + "/storage/v1/object/avatars/" + path, {
        method: "POST",
        headers: {
          apikey: anon(),
          Authorization: "Bearer " + tok,
          "Content-Type": "image/jpeg",
          "x-upsert": "true"
        },
        body: blob
      });
      if (!res.ok) throw new Error("upload " + res.status);
      var url = base() + "/storage/v1/object/public/avatars/" + path;
      var saved = await save({ avatar_url: url });
      if (!saved.ok) return { ok: false, error: saved.error };
      return { ok: true, url: url };
    } catch (e) {
      return { ok: false, error: "Upload failed \u2014 check your connection." };
    }
  }

  /* ---------- reading stats from existing local progress ---------- */
  function stats() {
    var prog = lsGet("tsb_progress", {}) || {};
    var marks = lsGet("tsb_bookmarks", []) || [];
    var lessons = 0, done = 0;
    var byId = {};
    (window.BOOKS || []).forEach(function (b) { byId[b.id] = b; });
    Object.keys(prog).forEach(function (id) {
      var arr = prog[id] || [];
      lessons += arr.length;
      var b = byId[id];
      if (b && b.lessons && arr.length >= b.lessons.length) done++;
    });
    return {
      booksRead: done,
      lessonsRead: lessons,
      saved: marks.length,
      streak: lsGet("tsb_streak", { n: 0 }).n || 0
    };
  }

  function initials(p) {
    var n = (p && (p.display_name || p.username)) || "R";
    return n.trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w[0]; }).join("").toUpperCase();
  }

  function emit() {
    try { window.dispatchEvent(new CustomEvent("tsb:profile", { detail: cached })); } catch (e) {}
  }

  window.addEventListener("tsb:auth", function () {
    if (!user()) { cached = null; try { localStorage.removeItem(CACHE_KEY); } catch (e) {} }
    else load(true);
  });

  window.TSB_PROFILE = {
    get: get, load: load, save: save,
    checkUsername: checkUsername, validateUsername: validateUsername,
    normUsername: normUsername, uploadAvatar: uploadAvatar,
    stats: stats, initials: initials
  };
})();
