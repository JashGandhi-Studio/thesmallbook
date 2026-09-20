/* ============================================================
   THESMALLBOOK — 🌍 COMMUNITY LAYER (community.js)
   Supabase REST client for the Stories social platform:
   profiles · posts (rich text + cover + audio) · likes ·
   comments · follows · uploads (covers / audio / avatars).
   Reuses the Google session from js/auth.js (same login).
   Everything degrades gracefully when signed out (read-only).
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_COMMUNITY) return;

  var CFG = window.TSB_CONFIG || window.CFG || {};
  var URL = (CFG.SUPABASE_URL || "").replace(/\/$/, "");
  var ANON = CFG.SUPABASE_ANON_KEY || "";
  var ENABLED = !!(URL && ANON);

  /* ---------- token: never crash, always try hard ---------- */
  async function authToken() {
    try {
      if (window.TSB_AUTH && typeof TSB_AUTH.token === "function") {
        var t = await TSB_AUTH.token();
        if (t) return t;
      }
    } catch (e) {}
    try {
      var s = JSON.parse(localStorage.getItem("tsb_auth_session"));
      if (s && s.access_token) return s.access_token;
    } catch (e) {}
    return "";
  }

  /* ---------- tiny REST helper ---------- */
  async function api(path, opts) {
    if (!ENABLED) throw new Error("cloud-off");
    opts = opts || {};
    var headers = { apikey: ANON, "Content-Type": "application/json" };
    // v204: always ask PostgREST to return the affected row(s) — without this, POSTs
    // succeed but reply with an empty body, and callers saw null ("failed" alert on a saved comment)
    if ((opts.method || "GET") !== "GET") headers.Prefer = "return=representation";
    var tk = await authToken();
    headers.Authorization = "Bearer " + (tk || ANON);
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });
    var res = await fetch(URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if ((res.status === 401 || res.status === 403) && !opts._retried && tk) {
      // token may have expired mid-session — force one refresh, then retry once
      try { if (window.TSB_AUTH && typeof TSB_AUTH.token === "function") await TSB_AUTH.token(); } catch (e) {}
      var o2 = {}; for (var k2 in opts) o2[k2] = opts[k2]; o2._retried = 1;
      return api(path, o2);
    }
    var txt = await res.text();
    if (!res.ok) {
      var detail = "";
      try { var j = JSON.parse(txt); detail = (j && (j.message || j.error || j.msg)) || ""; } catch (e) { detail = txt.slice(0, 120); }
      var err = new Error((res.status === 401 || res.status === 403) ? "session expired — sign in again (" + detail + ")" : (detail || ("request failed (" + res.status + ")")));
      err.status = res.status;
      throw err;
    }
    return txt ? JSON.parse(txt) : null;
  }

  function me() {
    try {
      if (window.TSB_AUTH && TSB_AUTH.user) { var u0 = TSB_AUTH.user(); if (u0) return u0; }
    } catch (e) {}
    // fallback: read the stored session directly (works even before auth.js boots)
    try {
      var s = JSON.parse(localStorage.getItem("tsb_auth_session"));
      return (s && s.user) || null;
    } catch (e) { return null; }
  }
  function signedIn() { return !!me(); }
  function whenReady(fn) {
    function go() { try { fn(); } catch (e) { console.warn("community init:", e); } }
    if (window.TSB_AUTH && window.TSB_AUTH.user) { go(); return; }
    var done = false;
    var once = function () { if (!done) { done = true; go(); } };
    window.addEventListener("tsb:auth", once);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", once);
    else setTimeout(once, 0);
  }

  /* ---------- profiles ---------- */
  async function ensureProfile() {
    var u = me();
    if (!u) return null;
    var md = u.user_metadata || {};
    var name = (window.TSB_AUTH && TSB_AUTH.displayName) ? TSB_AUTH.displayName() : (md.full_name || md.name || "Reader");
    var avatar = md.avatar_url || md.picture || "";
    var rows = await api("profiles?id=eq." + u.id, {});
    if (rows && rows.length) {
      if (!rows[0].avatar_url && avatar) {
        await api("profiles?id=eq." + u.id, { method: "PATCH", body: { avatar_url: avatar, name: name } });
        rows[0].avatar_url = avatar;
      }
      return rows[0];
    }
    var created = await api("profiles?on_conflict=id&select=*", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: { id: u.id, name: name, avatar_url: avatar, is_public: true } });
    return (created && created[0]) || { id: u.id, name: name, avatar_url: avatar, bio: "" };
  }
  async function safeProfile() {
    try { return await ensureProfile(); } catch (e) { return null; }
  }
  async function getProfile(id) {
    var rows = await api("profiles?id=eq." + id + "&select=*", {});
    return (rows && rows[0]) || null;
  }

  /* ---------- posts ---------- */
  async function listPosts(opt) {
    opt = opt || {};
    var n = opt.limit || 30;
    // v202: real pagination — PostgREST ignores an "offset" param, so page with the Range header
    var q = "posts?select=*&order=created_at.desc" + (opt.offset ? "" : "&limit=" + n);
    var hdrs = {};
    if (opt.offset) hdrs.Range = opt.offset + "-" + (opt.offset + n - 1);
    if (opt.author) q += "&author_id=eq." + opt.author;
    if (opt.ids) q += "&author_id=in.(" + opt.ids.join(",") + ")";
    return (await api(q, { headers: hdrs })) || [];
  }
  async function getPost(id) {
    var rows = await api("posts?id=eq." + id + "&select=*", {});
    return (rows && rows[0]) || null;
  }
  async function getPostByShort(code) {
    code = String(code || "").toLowerCase().replace(/[^a-f0-9]/g, "");
    if (!code) return null;
    var rows = await api("posts?select=*&order=created_at.desc&limit=500", {});
    // v204: match prefix OR suffix of the dash-free hex — seed UUIDs share the same
    // first 8 chars ("90000000"), so suffix codes keep every story's link unique
    var hexes = (rows || []).map(function (p) { return { p: p, hex: String(p.id).toLowerCase().replace(/-/g, "") }; });
    var hit = hexes.filter(function (h) { return h.hex.indexOf(code) === 0; })[0] ||
              hexes.filter(function (h) { return h.hex.slice(-code.length) === code; })[0];
    return hit ? hit.p : null;
  }
  async function publish(p) {
    var u = me();
    if (!u) throw new Error("sign-in");
    var prof = await safeProfile();
    var mk = function (withFlag) {
      var body = {
        author_id: u.id,
        author_name: (prof && prof.name) || "Reader",
        author_avatar: (prof && prof.avatar_url) || "",
        title: p.title, subtitle: p.subtitle || "", cover_url: p.cover_url || "",
        body: p.body || "", tags: p.tags || [], audio_url: p.audio_url || "", kind: p.kind || "text"
      };
      if (withFlag) body.no_download = p.no_download !== false; /* default ON: view-only media */
      return body;
    };
    var row;
    try { row = await api("posts?select=*", { method: "POST", body: mk(true) }); }
    catch (e) {
      /* older DB without the no_download column (SQL #12 pending): retry without it */
      row = await api("posts?select=*", { method: "POST", body: mk(false) });
    }
    return (row && row[0]) || null;
  }
  async function deletePost(id) {
    var u = me();
    if (!u) throw new Error("sign-in");
    var uq = encodeURIComponent(u.id);
    /* cascade first: every like/comment on this post (notifications are derived from these,
       so this is what makes the post disappear from everyone's likes + notifications too) */
    await api("likes?post_id=eq." + encodeURIComponent(id), { method: "DELETE" });
    await api("comments?post_id=eq." + encodeURIComponent(id), { method: "DELETE" });
    var gone = await api("posts?id=eq." + encodeURIComponent(id) + "&author_id=eq." + uq,
      { method: "DELETE", headers: { Prefer: "return=representation" } });
    /* PostgREST returns the rows it actually deleted; [] means RLS blocked it (silent). */
    if (!gone || !gone.length) {
      throw new Error("The post is still there — the database is missing the 'delete own posts' policy. Run SQL #10 in docs/SUPABASE-STEP-BY-STEP.md (one line fixes it).");
    }
    /* verify with a fresh read: even a silent 0-row delete (older DBs) cannot pass */
    var check;
    try { check = await api("posts?id=eq." + encodeURIComponent(id), { method: "GET" }); } catch (e) { check = []; }
    if (check && check.length) {
      throw new Error("The post is still there — the database is missing the 'delete own posts' policy. Run SQL #10 in docs/SUPABASE-STEP-BY-STEP.md (one line fixes it).");
    }
    return true;
  }

  /* ---------- likes ---------- */
  async function likeInfo(postId) {
    var rows = await api("likes?post_id=eq." + postId + "&select=user_id", {});
    var u = me();
    return { count: (rows || []).length, mine: !!(u && (rows || []).some(function (r) { return r.user_id === u.id; })) };
  }
  async function setLike(postId, on) {
    var u = me();
    if (!u) throw new Error("sign-in");
    if (on) await api("likes", { method: "POST", body: { post_id: postId, user_id: u.id } });
    else await api("likes?post_id=eq." + postId + "&user_id=eq." + u.id, { method: "DELETE" });
  }
  async function likesOnMyPosts() {
    var u = me();
    if (!u) return [];
    var mine = (await api("posts?author_id=eq." + u.id + "&select=id", {})) || [];
    var ids = mine.map(function (p) { return p.id; });
    if (!ids.length) return [];
    return (await api("likes?post_id=in.(" + ids.join(",") + ")&select=*", {})) || [];
  }

  /* ---------- comments ---------- */
  async function listComments(postId) {
    return (await api("comments?post_id=eq." + postId + "&select=*&order=created_at.asc", {})) || [];
  }
  async function addComment(postId, body) {
    var u = me();
    if (!u) throw new Error("sign-in");
    var prof = await safeProfile();
    var row = await api("comments?select=*", { method: "POST", body: { post_id: postId, author_id: u.id, author_name: (prof && prof.name) || ((u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "Reader"), body: body } });
    return (row && row[0]) || null;
  }

  /* ---------- follows ---------- */
  async function followInfo(authorId) {
    var u = me();
    var rows = await api("follows?author_id=eq." + authorId + "&select=follower_id", {});
    return {
      count: (rows || []).length,
      mine: !!(u && (rows || []).some(function (r) { return r.follower_id === u.id; }))
    };
  }
  async function setFollow(authorId, on) {
    var u = me();
    if (!u) throw new Error("sign-in");
    if (on) await api("follows", { method: "POST", body: { follower_id: u.id, author_id: authorId } });
    else await api("follows?follower_id=eq." + u.id + "&author_id=eq." + authorId, { method: "DELETE" });
  }
  async function followingIds() {
    var u = me();
    if (!u) return [];
    var rows = await api("follows?follower_id=eq." + u.id + "&select=author_id", {});
    return (rows || []).map(function (r) { return r.author_id; });
  }
  async function followerRows(id) {
    return (await api("follows?author_id=eq." + id + "&select=follower_id", {})) || [];
  }

  /* ---------- uploads (covers / audio / avatars) ---------- */
  async function upload(file, bucket) {
    var u = me();
    if (!u) throw new Error("sign-in");
    var tk = await authToken();
    if (!tk) throw new Error("session expired — sign in again");
    var path = u.id + "/" + Date.now() + "-" + (file.name || "f").replace(/[^\w.-]+/g, "_");
    var url = URL + "/storage/v1/object/" + bucket + "/" + path;
    var hdrs = { apikey: ANON, Authorization: "Bearer " + tk, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" };
    var res = await fetch(url, { method: "POST", headers: hdrs, body: file });
    var tk2 = "";
    if ((res.status === 401 || res.status === 403) && tk) {
      /* token may have expired mid-session — force one refresh, then retry once */
      try { if (window.TSB_AUTH && typeof TSB_AUTH.token === "function") await TSB_AUTH.token(); } catch (e) {}
      tk2 = await authToken();
      if (tk2 && tk2 !== tk) {
        hdrs.Authorization = "Bearer " + tk2;
        res = await fetch(url, { method: "POST", headers: hdrs, body: file });
      }
    }
    if (!res.ok) {
      var det = "";
      try { var j = await res.json(); det = (j && (j.message || j.error)) || ""; } catch (e) {}
      var msg = uploadFailMsg(res.status, det, bucket);
      /* auto-diagnose: name the exact missing piece so the fix is one copy-paste */
      if (res.status === 403 || res.status === 404) {
        try {
          var p = await probeStorage(bucket);
          if (p && p.reason) {
            if (p.reason === "bucket-missing") msg = "📦 Bucket \"" + bucket + "\" doesn't exist on your Supabase project — run SQL #3 v4 in docs/SUPABASE-STEP-BY-STEP.md (creates all three buckets, safe to re-run).";
            else if (p.reason === "bucket-private") msg = "🔒 Bucket \"" + bucket + "\" exists but is private — run SQL #3 v4 in docs/SUPABASE-STEP-BY-STEP.md (it sets public=true).";
            else if (p.reason === "policy-missing") msg = "🚫 Storage upload rule missing (" + (p.detail || det || res.status) + ") — run SQL #3 v4 in docs/SUPABASE-STEP-BY-STEP.md (one safe, re-runnable script; defines read/write/update/delete for tsb-covers, tsb-audio, tsb-avatars).";
            else if (p.reason === "network") msg = "Network problem talking to storage (" + (p.detail || "") + ") — check your connection and try again.";
            else msg = msg + " (storage check: " + p.reason + ")";
          }
        } catch (e) {}
      }
      throw new Error(msg);
    }
    return URL + "/storage/v1/object/public/" + bucket + "/" + path;
  }

  /* ---------- v222: self-diagnose a failed upload (names the exact fix) ---------- */
  async function probeStorage(bucket) {
    var out = { ok: false, bucket: bucket || "tsb-covers", reason: "", detail: "", signedIn: !!me() };
    try {
      var tk = await authToken();
      if (!tk) { out.reason = "signin"; return out; }
      var hdrs = { apikey: ANON, Authorization: "Bearer " + tk, "Content-Type": "application/json" };

      /* 1) bucket existence — list works on public buckets (the /bucket list
            endpoint is invisible under storage.buckets RLS, so don't trust it) */
      var list = await fetch(URL + "/storage/v1/object/list/" + bucket, {
        method: "POST", headers: hdrs, body: JSON.stringify({ prefix: "", limit: 1 })
      });
      if (list.status === 404) { out.reason = "bucket-missing"; return out; }
      if (list.status === 403 || list.status === 401) { out.reason = "policy-missing"; out.detail = "read"; return out; }
      out.found = true;

      /* 2) public badge — the public read URL must not 400 */
      var pub = await fetch(URL + "/storage/v1/object/public/" + bucket + "/_tsbdiag/.probe", { headers: { apikey: ANON, Authorization: "Bearer " + tk } });
      if (pub.status === 400 || pub.status === 403) { out.reason = "bucket-private"; return out; }

      /* 3) the real question — a tiny write+delete round trip */
      var probePath = bucket + "/_tsbdiag/" + Date.now() + ".txt";
      var up = await fetch(URL + "/storage/v1/object/" + probePath, {
        method: "POST",
        headers: { apikey: ANON, Authorization: "Bearer " + tk, "Content-Type": "text/plain", "x-upsert": "false" },
        body: new Blob(["ok"], { type: "text/plain" })
      });
      if (up.ok) {
        out.ok = true; out.reason = "";
        try { await fetch(URL + "/storage/v1/object/" + probePath, { method: "DELETE", headers: { apikey: ANON, Authorization: "Bearer " + tk } }); } catch (e) {}
        return out;
      }
      var det = "";
      try { var j = await up.json(); det = (j && (j.message || j.error)) || ""; } catch (e) {}
      out.reason = (up.status === 403 || up.status === 401) ? "policy-missing" : "other-" + up.status;
      out.detail = det || up.status;
    } catch (e) { out.reason = "network"; out.detail = String(e && e.message || e); }
    return out;
  }

  function uploadFailMsg(status, det, bucket) {
    det = det || "";
    if (status === 404 || /not found/i.test(det) || /bucket/i.test(det)) {
      return "📦 Storage bucket \"" + bucket + "\" is missing on your Supabase project — run SQL #3 v4 in docs/SUPABASE-STEP-BY-STEP.md. It creates tsb-covers / tsb-audio / tsb-avatars (safe to re-run). (" + (det || status) + ")";
    }
    if (status === 413 || /too large|PayloadTooLarge/i.test(det)) {
      return "That file is too big for storage (max ~50 MB). Trim/compress it and try again.";
    }
    if (status === 403 || status === 401) {
      return "🚫 Upload blocked (" + (det || status) + "). Your storage is missing the upload rule — run SQL #3 v4 in docs/SUPABASE-STEP-BY-STEP.md (one safe re-runnable script, ~30 seconds). If you just ran it, reload this page and try again.";
    }
    return "Upload failed (" + (det || status) + "). Check your internet, then try again.";
  }

  /* ---------- v201: video Bursts (max 2 minutes) ---------- */
  var MAX_BURST_SEC = 120;
  var MAX_BURST_BYTES = 48 * 1024 * 1024; /* storage default cap ~50MB */
  function isVideoUrl(url) {
    return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(String(url || ""));
  }
  function videoDuration(file) {
    return new Promise(function (resolve, reject) {
      try {
        var v = document.createElement("video");
        var u = window.URL.createObjectURL(file);
        v.preload = "metadata";
        v.onloadedmetadata = function () { window.URL.revokeObjectURL(u); resolve(v.duration || 0); };
        v.onerror = function () { window.URL.revokeObjectURL(u); reject(new Error("Could not read that video file.")); };
        v.src = u;
      } catch (e) { reject(new Error("Could not read that video file.")); }
    });
  }
  async function checkBurst(file) {
    if (!file) throw new Error("No file chosen.");
    if (file.size > MAX_BURST_BYTES) throw new Error("That video is bigger than 48 MB — trim or compress it first.");
    var d = await videoDuration(file);
    if (!isFinite(d) || d <= 0) throw new Error("Could not read that video's length — try an MP4 or WebM file.");
    if (d > MAX_BURST_SEC + 0.5) throw new Error("Bursts are max 2 minutes — yours is " + Math.round(d) + "s. Trim it and try again.");
    return d;
  }

  /* ---------- rich-text safety: whitelist tags, drop attributes ---------- */
  /* ---- v250: people discovery ----------------------------------------
     BEFORE: one `limit=60` page ordered by updated_at. Anyone who had not
     touched the app recently fell off the end and never appeared in People
     at all — the "15 signed in but only 12 show" bug.
     AFTER: walk every page with the Range header until PostgREST runs out,
     so the list is complete no matter how many readers join. */
  async function fetchAll(path, pageSize, hardCap) {
    pageSize = pageSize || 200;
    hardCap = hardCap || 3000;
    var out = [], from = 0;
    for (var guard = 0; guard < 40; guard++) {
      var rows = await api(path, {
        headers: { Range: from + "-" + (from + pageSize - 1), "Range-Unit": "items" }
      });
      rows = rows || [];
      out = out.concat(rows);
      if (rows.length < pageSize || out.length >= hardCap) break;
      from += pageSize;
    }
    return out.slice(0, hardCap);
  }
  async function listProfiles(limit) {
    if (!api) return [];
    try {
      var rows = await fetchAll("profiles?select=*&order=updated_at.desc", 200, limit || 3000);
      return limit ? rows.slice(0, limit) : rows;
    } catch (e) {
      /* Range paging needs a stable ORDER BY; if a locked-down project
         rejects it, fall back to a single wide page rather than to []. */
      try {
        return (await api("profiles?select=*&order=updated_at.desc&limit=" + (limit || 1000), { method: "GET" })) || [];
      } catch (e2) { return []; }
    }
  }

  /* ---- v250: EVERY reader, never a short list -------------------------
     A profiles row is only written when a reader opens a community page,
     so a signed-in reader who only ever read books had no row and was
     invisible everywhere. allPeople() unions the profiles table with every
     actor id that appears in posts / likes / comments / follows / messages,
     synthesises a row for the ones that are missing, and always includes the
     official account. Nobody can fall through. */
  async function allPeople() {
    if (!api || !ENABLED) return [];
    var safe = function (p) { return p.catch(function () { return []; }); };
    var res = await Promise.all([
      safe(listProfiles(0)),
      safe(fetchAll("posts?select=id,author_id,author_name,author_avatar,created_at&order=created_at.desc", 300, 3000)),
      safe(fetchAll("likes?select=post_id,user_id&order=created_at.desc", 500, 3000)),
      safe(fetchAll("comments?select=post_id,author_id&order=created_at.desc", 500, 3000)),
      safe(fetchAll("follows?select=follower_id,author_id&order=created_at.desc", 500, 3000)),
      safe(api("messages?select=sender_id,receiver_id&order=created_at.desc&limit=1000", {}))
    ]);
    var profiles = res[0] || [], posts = res[1] || [], likes = res[2] || [],
        comments = res[3] || [], follows = res[4] || [], msgs = res[5] || [];

    var map = {}, order = [];
    function touch(id) {
      if (!id || typeof id !== "string" || id.length < 30) return null;
      if (!map[id]) {
        map[id] = {
          id: id, name: "", avatar_url: "", bio: "", progress: 0, links: [],
          is_public: true, updated_at: "", _synth: true,
          posts: 0, likesGot: 0, likesGiven: 0, comments: 0,
          followers: 0, following: 0, lastActive: 0
        };
        order.push(id);
      }
      return map[id];
    }

    profiles.forEach(function (p) {
      var o = touch(p.id); if (!o) return;
      o.name = p.name || o.name;
      o.avatar_url = p.avatar_url || o.avatar_url;
      o.bio = p.bio || "";
      o.progress = p.progress || 0;
      o.links = p.links || [];
      o.is_public = p.is_public !== false;
      o.updated_at = p.updated_at || "";
      o._synth = false;
      try { o.lastActive = Math.max(o.lastActive, Date.parse(p.updated_at) || 0); } catch (e) {}
    });

    var postAuthor = {};
    posts.forEach(function (r) {
      var o = touch(r.author_id); if (!o) return;
      postAuthor[r.id] = r.author_id;
      o.posts++;
      if (r.author_name && !o.name) o.name = r.author_name;
      if (r.author_avatar && !o.avatar_url) o.avatar_url = r.author_avatar;
      try { o.lastActive = Math.max(o.lastActive, Date.parse(r.created_at) || 0); } catch (e) {}
    });
    likes.forEach(function (r) {
      var giver = touch(r.user_id); if (giver) giver.likesGiven++;
      var a = postAuthor[r.post_id];
      if (a && map[a]) map[a].likesGot++;
    });
    comments.forEach(function (r) {
      var o = touch(r.author_id); if (!o) return;
      o.comments++;
      var a = postAuthor[r.post_id];
      if (a && map[a]) map[a].likesGot++;
    });
    follows.forEach(function (r) {
      var f = touch(r.follower_id), a = touch(r.author_id);
      if (f) f.following++;
      if (a) a.followers++;
    });
    msgs.forEach(function (r) { touch(r.sender_id); touch(r.receiver_id); });

    /* the official account has no profiles row by design — never let it vanish */
    var off = touch(OFFICIAL_ID);
    if (off) {
      off.name = off.name || "TheSmallBook";
      off.avatar_url = off.avatar_url || OFFICIAL_AVATAR;
      off._official = true;
    }

    var out = order.map(function (id) { return map[id]; });
    out.forEach(function (p) {
      if (!p.name) p.name = isOfficial(p.id) ? "TheSmallBook" : "A reader";
      /* activity score: keeps the list feeling alive without ever hiding anyone */
      p._score = (p.posts * 12) + (p.likesGot * 4) + (p.followers * 6) + (p.comments * 3) +
                 (p.progress / 40) + (p.lastActive ? Math.max(0, 30 - (Date.now() - p.lastActive) / 864e5) : 0);
    });
    out.sort(function (a, b) { return (b._score - a._score) || String(a.name).localeCompare(String(b.name)); });
    return out;
  }
  async function setProfilePublic(on) {
    if (!api || !signedIn()) throw new Error("sign-in");
    var u = me();
    var prof = await safeProfile();
    var name = (prof && prof.name) || ((u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "Reader");
    var avatar = (prof && prof.avatar_url) || ((u.user_metadata && (u.user_metadata.avatar_url || u.user_metadata.picture)) || "");
    try {
      // upsert covers both "row exists" and "row missing" in one request
      await api("profiles?on_conflict=id&select=*", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: { id: u.id, name: name, avatar_url: avatar, is_public: !!on } });
    } catch (e) {
      var m = String((e && e.message) || e);
      if (m.indexOf("is_public") >= 0) throw new Error("the is_public column is missing — run SQL #5 (one line, in docs/SUPABASE-STEP-BY-STEP.md)");
      throw e;
    }
  }

  // ---- v192: notifications (derived — no new tables needed) ----
  async function notifications() {
    if (!api || !signedIn()) return [];
    var u = me();
    var out = [];
    var safe = function (p) { return p.catch(function () { return []; }); };
    var posts = await safe(listPosts({ author: u.id, limit: 100 }));
    var byId = {};
    posts.forEach(function (p) { byId[p.id] = p; });
    if (posts.length) {
      var inList = posts.map(function (p) { return p.id; }).join(",");
      var likes = await safe(api("likes?post_id=in.(" + inList + ")&select=*&order=created_at.desc&limit=60", {}));
      (likes || []).forEach(function (l) {
        if (l.user_id !== u.id) out.push({ type: "like", who: l.user_id, post: l.post_id, title: (byId[l.post_id] || {}).title || "your story", at: l.created_at });
      });
      var cmts = await safe(api("comments?post_id=in.(" + inList + ")&select=*&order=created_at.desc&limit=40", {}));
      (cmts || []).forEach(function (c) {
        if (c.author_id !== u.id) out.push({ type: "comment", who: c.author_id, post: c.post_id, title: (byId[c.post_id] || {}).title || "your story", body: c.body, at: c.created_at });
      });
    }
    var fols = await safe(api("follows?author_id=eq." + u.id + "&select=*&order=created_at.desc&limit=40", {}));
    (fols || []).forEach(function (fl) {
      if (fl.follower_id !== u.id) out.push({ type: "follow", who: fl.follower_id, at: fl.created_at });
    });
    var dms = await safe(api("messages?receiver_id=eq." + u.id + "&select=*&order=created_at.desc&limit=30", {}));
    (dms || []).forEach(function (m) {
      /* v250: carry audio_url + read flag so the bell can say "voice message"
         and so opening a thread can mark exactly these notifications read */
      out.push({ type: "dm", who: m.sender_id, body: m.body, at: m.created_at, audio: !!m.audio_url, msg: m.id });
    });
    // resolve names + avatars
    var seen = {}, uids = [];
    out.forEach(function (n) { if (!seen[n.who]) { seen[n.who] = 1; uids.push(n.who); } });
    var profs = uids.length ? await safe(api("profiles?id=in.(" + uids.join(",") + ")&select=*", {})) : [];
    var pmap = {};
    (profs || []).forEach(function (p) { pmap[p.id] = p; });
    out.forEach(function (n) {
      var p = pmap[n.who];
      n.name = (p && p.name) || (isOfficial(n.who) ? "TheSmallBook" : "A reader");
      n.avatar = avaUrl(n.name, (p && p.avatar_url) || "", n.who);
    });
    out.sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at); });
    return out.slice(0, 60);
  }

  // ---- v191: direct messages ----
  async function myMessages(limit) {
    if (!api || !signedIn()) return [];
    var mu = me(); if (!mu) return [];
    var rows = await api("messages?select=*&or=(sender_id.eq." + mu.id + ",receiver_id.eq." + mu.id + ")&order=created_at.desc&limit=" + (limit || 200), { method: "GET" });
    return rows || [];
  }
  function conversations(msgs, meId) {
    var byUser = {};
    (msgs || []).forEach(function (m) {
      var other = m.sender_id === meId ? m.receiver_id : m.sender_id;
      if (!byUser[other]) byUser[other] = { user_id: other, last: m };
    });
    return Object.keys(byUser).map(function (k) { return byUser[k]; })
      .sort(function (a, b) { return Date.parse(b.last.created_at) - Date.parse(a.last.created_at); });
  }
  async function threadWith(uid) {
    if (!api || !signedIn()) return [];
    var mu = me(); if (!mu) return [];
    var rows = await api("messages?select=*&or=(and(sender_id.eq." + mu.id + ",receiver_id.eq." + uid + "),and(sender_id.eq." + uid + ",receiver_id.eq." + mu.id + "))&order=created_at.asc&limit=300", { method: "GET" });
    return (rows || []).filter(function (m) { return !(m.hidden_for || []).some(function (h) { return h === mu.id; }); });
  }
  async function sendDM(uid, body, bookId, opts) {
    if (!api || !signedIn()) return null;
    var mu = me(); if (!mu) return null;
    var payload = { sender_id: mu.id, receiver_id: uid, body: String(body || "").slice(0, 1000) };
    if (bookId) payload.book_id = String(bookId);
    if (opts) {
      if (opts.expires_at) payload.expires_at = opts.expires_at;   /* reading-thread expiry (needs messages.expires_at column) */
      if (opts.audio_url) payload.audio_url = opts.audio_url;       /* voice note (needs messages.audio_url column) */
    }
    var row = await api("messages?select=*", { method: "POST", body: payload });
    return (row && row[0]) || row;
  }
  async function editDM(msgId, body) {
    if (!api || !signedIn()) throw new Error("sign-in");
    await api("messages?id=eq." + msgId, { method: "PATCH", body: { body: String(body).slice(0, 1000), edited_at: new Date().toISOString() } });
  }
  async function deleteDM(msgId) {
    if (!api || !signedIn()) throw new Error("sign-in");
    await api("messages?id=eq." + msgId, { method: "DELETE" });
  }
  async function hideDM(msgId) {
    if (!api || !signedIn()) throw new Error("sign-in");
    var mu = me();
    var rows = await api("messages?id=eq." + msgId + "&select=*", {});
    var m = (rows || [])[0];
    if (!m) return;
    var hidden = (m.hidden_for || []).slice();
    if (hidden.indexOf(mu.id) < 0) hidden.push(mu.id);
    await api("messages?id=eq." + msgId, { method: "PATCH", body: { hidden_for: hidden } });
  }
  async function clearThread(uid) {
    if (!api || !signedIn()) throw new Error("sign-in");
    var mu = me();
    var rows = await threadWith(uid);
    await Promise.all(rows.map(function (m) {
      var hidden = (m.hidden_for || []).slice();
      if (hidden.indexOf(mu.id) >= 0) return null;
      hidden.push(mu.id);
      return api("messages?id=eq." + m.id, { method: "PATCH", body: { hidden_for: hidden } });
    }));
  }

  /* ---- v191 → v250: public reading progress --------------------------
     Two problems fixed:
       1. It only ran on the Stories page, and js/community.js was not even
          loaded on book.html — so the lessons people actually read while
          reading a book never reached the cloud. Ten of twelve live profiles
          still said "0 lessons" because of this.
       2. `force` fired one PATCH per lesson tap. Now forced syncs are
          debounced (3 s) so a reading burst collapses into one write.
     It also stamps updated_at, which is what People sorts on, so the list
     visibly reacts the moment someone reads something. */
  var progTimer = null, progInFlight = false, progQueued = false;
  function countLessons() {
    var prog = {};
    try { prog = JSON.parse(localStorage.getItem("tsb_progress") || "{}"); } catch (e) { prog = {}; }
    var n = 0;
    Object.keys(prog).forEach(function (k) {
      var v = prog[k];
      if (Array.isArray(v)) n += v.length;
      else if (v && typeof v === "object") n += Object.keys(v).length;
      else if (v) n += 1;
    });
    return n;
  }
  async function syncProgress(force) {
    if (!api || !signedIn()) return;
    if (force) {                                   /* debounce rapid taps */
      if (progInFlight) { progQueued = true; return; }
      if (progTimer) clearTimeout(progTimer);
      return new Promise(function (res) {
        progTimer = setTimeout(function () { progTimer = null; res(syncProgress(false)); }, 3000);
      });
    }
    try {
      var last = +(localStorage.getItem("tsb_prog_sync") || 0);
      var n = countLessons();
      var lastN = +(localStorage.getItem("tsb_prog_last_n") || -1);
      /* nothing changed and we synced under an hour ago -> stay quiet */
      if (n === lastN && Date.now() - last < 36e5) return;
      var mu3 = me(); if (!mu3) return;
      progInFlight = true;
      var body = { progress: n, updated_at: new Date().toISOString() };
      try {
        await api("profiles?id=eq." + mu3.id, { method: "PATCH", body: body });
      } catch (e) {
        /* older schemas have no updated_at write permission — retry without it */
        await api("profiles?id=eq." + mu3.id, { method: "PATCH", body: { progress: n } });
      }
      localStorage.setItem("tsb_prog_sync", String(Date.now()));
      localStorage.setItem("tsb_prog_last_n", String(n));
    } catch (e) {
    } finally {
      progInFlight = false;
      if (progQueued) { progQueued = false; setTimeout(function () { syncProgress(false); }, 400); }
    }
  }

  /* ---- v250: app-wide boot -------------------------------------------
     community.js ships on every app page, so this is the single place that
     guarantees a signed-in reader has a profiles row, fresh progress and a
     truthful bell — no matter which page they landed on. Without it a
     reader who signed in and only ever read books never appeared in People. */
  var bootDone = false;
  function boot() {
    if (!ENABLED || bootDone) return;
    if (!signedIn()) return;
    bootDone = true;
    try { ensureProfile().catch(function () {}); } catch (e) {}
    try { syncProgress(false); } catch (e) {}
    /* v250: "when did you last visit" — one throttled write per 30 min */
    try { touchPresence(false).catch(function () {}); } catch (e) {}
    /* one-time heal: a profile whose links column collected presence junk
       (duplicated or stringified buckets) cleans itself on the next visit */
    try { repairLinks().catch(function () {}); } catch (e) {}
    try { syncInterests(false); } catch (e) {}
    try { notifRefresh(); } catch (e) {}
  }
  function bootStart() {
    function go() { try { boot(); } catch (e) {} }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else setTimeout(go, 0);
    /* catch a sign-in that happens after this page loaded */
    window.addEventListener("tsb:auth", function () { bootDone = false; go(); });
    window.addEventListener("tsb:loggedin", function () { bootDone = false; go(); });
    /* a reader who closes the tab mid-book should not lose the sync */
    window.addEventListener("pagehide", function () {
      try {
        var n = countLessons();
        if (n !== +(localStorage.getItem("tsb_prog_last_n") || -1)) {
          localStorage.removeItem("tsb_prog_sync");      /* force it on next load */
        }
      } catch (e) {}
    });
    /* slow safety net: if a page writes progress without going through
       prefs.js we still pick it up within 30 s */
    setInterval(function () {
      try {
        if (!signedIn()) return;
        if (countLessons() !== +(localStorage.getItem("tsb_prog_last_n") || -1)) syncProgress(false);
      } catch (e) {}
    }, 30000);
  }

  var ICONS = {
    warn: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    bell: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    chat: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    check: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
    user: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    trash: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    pencil: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
    eyeoff: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    book: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    search: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    link: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    play: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    star: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    people: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    mail: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
    share: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    brush: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>',
    phone: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
    heart: '<svg class="tsb-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
  };
  function icon(n) { return ICONS[n] || ""; }

  /* ---------- v207: interest sync (powers personalised pushes) ---------- */
  async function syncInterests(force) {
    if (!signedIn()) return;
    try {
      var last = +(localStorage.getItem("tsb_int_sync") || 0);
      if (!force && Date.now() - last < 6 * 36e5) return;
      var top = [];
      try { top = (window.TSB && TSB.interest) ? TSB.interest.top(4) : []; } catch (e) {}
      if (!top.length) return;
      var u = me(); if (!u) return;
      await api("profiles?id=eq." + u.id, { method: "PATCH", body: { interests: top } });
      localStorage.setItem("tsb_int_sync", String(Date.now()));
    } catch (e) {}
  }

  // ---- v212: posts per author (v250: every page, not just the first 400) ----
  async function postCounts(limit) {
    try {
      var rows = limit
        ? await api("posts?select=author_id&limit=" + limit, { method: "GET" })
        : await fetchAll("posts?select=author_id&order=created_at.desc", 500, 5000);
      var out = {};
      (rows || []).forEach(function (r) { if (r.author_id) out[r.author_id] = (out[r.author_id] || 0) + 1; });
      return out;
    } catch (e) {
      try {
        var rows2 = await api("posts?select=author_id&limit=" + (limit || 400), { method: "GET" });
        var out2 = {};
        (rows2 || []).forEach(function (r) { if (r.author_id) out2[r.author_id] = (out2[r.author_id] || 0) + 1; });
        return out2;
      } catch (e2) { return {}; }
    }
  }

  /* ============================================================
     v250 — ONE NOTIFICATION LEDGER
     ------------------------------------------------------------
     There used to be two half-systems that never agreed:
       * tsb_toast_seen — keys marked when a toast popped or a DM
         thread was opened;
       * tsb_notif_seen — a single "last time the bell page was
         opened" timestamp.
     The bell page and the You-page badge read ONLY the timestamp,
     so a notification you had already opened (tapped a toast,
     replied in the thread, viewed the profile) came back wearing a
     NEW badge on your next visit — forever.

     Now there is one ledger of things you have actually OPENED, and
     a separate one of things already POPPED as a toast. A toast
     popping no longer counts as reading it. A notification is new
     exactly once, and after that it stays in the history rendered
     as read instead of being flagged again.
     ============================================================ */
  var NOTIF_READ = "tsb_notif_read";       // { key: openedAtMs } — what YOU opened
  var NOTIF_POPPED = "tsb_notif_popped";   // { key: poppedAtMs } — what already toasted
  var LEGACY_TOAST = "tsb_toast_seen";     // pre-v250 stores, migrated once below
  var LEGACY_SEEN = "tsb_notif_seen";
  var LEDGER_CAP = 600;

  function notifKey(n) { return [n.type, n.who || "", n.post || "", n.at].join(":"); }
  function toastKey(n) { return notifKey(n); }          /* back-compat alias */

  function readStore(key, legacyArrayKey) {
    var out = {};
    try {
      out = JSON.parse(localStorage.getItem(key)) || {};
    } catch (e) { out = {}; }
    if (Array.isArray(out)) {                            /* very old shape */
      var o = {}; out.forEach(function (k) { o[k] = Date.now(); }); out = o;
    }
    /* one-time migration so upgrading never re-flags your whole history */
    if (legacyArrayKey) {
      try {
        var legacy = JSON.parse(localStorage.getItem(legacyArrayKey));
        if (Array.isArray(legacy) && legacy.length) {
          legacy.forEach(function (k) { if (!out[k]) out[k] = Date.now(); });
          localStorage.setItem(key, JSON.stringify(out));
          localStorage.removeItem(legacyArrayKey);
        }
      } catch (e) {}
    }
    return out;
  }
  function writeStore(key, store) {
    try {
      var ks = Object.keys(store);
      if (ks.length > LEDGER_CAP) {
        ks.sort(function (a, b) { return store[a] - store[b]; });
        ks.slice(0, ks.length - LEDGER_CAP).forEach(function (k) { delete store[k]; });
      }
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) {}
  }
  function markIn(key, keys, legacy) {
    keys = (keys || []).filter(Boolean);
    if (!keys.length) return;
    var store = readStore(key, legacy), now = Date.now(), dirty = false;
    keys.forEach(function (k) { if (!store[k]) { store[k] = now; dirty = true; } });
    if (dirty) writeStore(key, store);
  }

  /* ---- public read API ---- */
  function notifMarkRead(keys) { markIn(NOTIF_READ, keys, LEGACY_TOAST); }
  function toastMark(keys) { notifMarkRead(keys); }                 /* back-compat */
  function toastSeen() { return Object.keys(readStore(NOTIF_READ, LEGACY_TOAST)); }
  function notifPopped(keys) { markIn(NOTIF_POPPED, keys, null); }
  function notifIsRead(n) { return !!readStore(NOTIF_READ, LEGACY_TOAST)[notifKey(n)]; }
  function notifUnread(items) {
    var read = readStore(NOTIF_READ, LEGACY_TOAST);
    var legacyTs = 0;
    try { legacyTs = +(localStorage.getItem(LEGACY_SEEN) || 0); } catch (e) {}
    return (items || []).filter(function (n) {
      if (read[notifKey(n)]) return false;
      /* items older than the last pre-v250 bell visit were already seen */
      if (legacyTs && Date.parse(n.at) <= legacyTs) return false;
      return true;
    });
  }
  /* Mark read by context: opening the thing a notification points at
     is what "reading" it means. */
  async function notifMarkContext(filter) {
    try {
      var items = await notifications();
      notifMarkRead(items.filter(filter).map(notifKey));
      paintNotifUI(items);
      return items;
    } catch (e) { return []; }
  }
  function notifMarkPeer(peerId) { return notifMarkContext(function (n) { return n.type === "dm" && n.who === peerId; }); }
  function notifMarkPost(postId) { return notifMarkContext(function (n) { return !!postId && n.post === postId; }); }
  /* v250: mark one exact key read (a voice reply you just sent is "handled",
     even though no toast was ever shown for it) */
  function notifMarkKey(key) { if (key) notifMarkRead([key]); }
  function notifMarkUser(userId) { return notifMarkContext(function (n) { return n.who === userId; }); }
  function notifMarkAll() { return notifMarkContext(function () { return true; }); }

  /* ---- v250: one inline voice for every "something went wrong" ----
     Native alert() on a phone is a full-screen slap: it blocks the page,
     hides what you were doing and reads like a crash. Every failure in the
     community pages now says it in a paper note that slides in at the top,
     stays long enough to read, and taps away. */
  var sayQueue = [];
  function sayHost() {
    var wrap = document.getElementById("tsbToasts");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "tsbToasts";
      if (document.body) document.body.appendChild(wrap);
    }
    return wrap;
  }
  function say(msg, kind, ms) {
    var text = String(msg == null ? "" : msg).trim();
    if (!text) return null;
    /* no kind given? the wording decides the tone, so every call site can
       stay a one-liner */
    if (!kind) kind = /fail|error|couldn|could not|can\u2019t|cannot|not attached|denied|blocked|missing|expired|wrong|invalid|unauthor|try again|try once more|first\.|sign in/i.test(text) ? "bad" : "";
    /* called before <body> exists -> replay it once the DOM is ready */
    if (typeof document === "undefined" || !document.body) {
      sayQueue.push([text, kind, ms]);
      if (sayQueue.length === 1 && typeof document !== "undefined") {
        document.addEventListener("DOMContentLoaded", function () {
          var q = sayQueue.slice(); sayQueue = [];
          q.forEach(function (x) { say(x[0], x[1], x[2]); });
        });
      }
      return null;
    }
    var wrap = sayHost();
    /* never stack more than three — the oldest goes first */
    while (wrap.querySelectorAll(".tsb-say").length >= 3) {
      var first = wrap.querySelector(".tsb-say");
      if (!first) break;
      first.remove();
    }
    var el = document.createElement("div");
    el.className = "tsb-say" + (kind ? " tsb-say--" + kind : "");
    el.setAttribute("role", kind === "bad" ? "alert" : "status");
    el.setAttribute("aria-live", kind === "bad" ? "assertive" : "polite");
    var ico = kind === "bad" ? ICONS.warn || ICONS.bell : kind === "good" ? ICONS.check : ICONS.bell;
    el.innerHTML = '<span class="tsb-say__ico">' + ico + "</span><span>" + esc(text) + "</span>";
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    var life = ms || Math.min(9000, 3200 + text.length * 22);
    var gone = false;
    function away() {
      if (gone) return; gone = true;
      el.classList.remove("in"); el.classList.add("out");
      setTimeout(function () { try { el.remove(); } catch (e) {} }, 340);
    }
    el.addEventListener("click", away);
    setTimeout(away, life);
    return el;
  }

  /* ---- one painter for every bell / badge / dot in the app ---- */
  function paintNotifUI(items) {
    var unread = notifUnread(items || []);
    var n = unread.length;
    try { localStorage.setItem("tsb_notif_fresh", String(n)); } catch (e) {}
    try {
      document.querySelectorAll("[data-notifdot]").forEach(function (el) { el.hidden = n === 0; });
      document.querySelectorAll("[data-notifcount]").forEach(function (el) {
        el.hidden = n === 0;
        el.textContent = n > 99 ? "99+" : String(n);
      });
      var you = document.getElementById("youNotif");
      if (you) { you.hidden = n === 0; you.textContent = n > 99 ? "99+" : String(n); }
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("tsb:notifcount", { detail: { count: n, items: unread } })); } catch (e) {}
    return n;
  }
  async function notifRefresh() {
    if (!ENABLED || !signedIn()) return paintNotifUI([]);
    try { return paintNotifUI(await notifications()); } catch (e) { return 0; }
  }
  function toastShow(n) {
    var wrap = document.getElementById("tsbToasts");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "tsbToasts";
      document.body.appendChild(wrap);
    }
    var href = n.type === "dm" ? "dm.html?u=" + n.who : n.type === "follow" ? "profile.html?id=" + n.who : "story.html?id=" + n.post;
    var what = n.type === "like" ? "liked your story" : n.type === "comment" ? "commented on your story" : n.type === "follow" ? "started following you" : "sent you a message";
    var el = document.createElement("a");
    el.className = "tsb-ntoast";
    el.href = href;
    var av = avaUrl(n.name, n.avatar, n.who);
    el.innerHTML = '<div class="cm-ava">' + (av ? '<img src="' + esc(av) + '" alt="">' : "<span>" + esc((n.name || "R").charAt(0).toUpperCase()) + "</span>") + "</div>" +
      "<div><b>" + esc(n.name) + (isOfficial(n.who) ? ' <span class="cm-vtick">\u2714</span>' : "") + "</b> " + what + "<em>" + ago(n.at) + " \u00B7 tap to open</em></div>";
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); el.classList.add("out"); setTimeout(function () { el.remove(); }, 450); }, 5200);
    /* v250: a toast POPPING is not the reader READING it. Record it in the
       popped ledger so it never re-pops, but leave it unread so the bell
       still counts it until they actually open it. */
    notifPopped([notifKey(n)]);
    try { if (window.TSB && window.TSB.sound) window.TSB.sound.play(); } catch (e2) {}
  }
  /* v250: never pop a toast over the page you are actually reading. The
     badge still updates here; the popup simply waits until you leave the
     book, because nothing is added to the "already popped" ledger. */
  function onReadingPage() {
    try { return /(^|\/)book\.html/i.test(String(location.pathname || "")); } catch (e) { return false; }
  }
  function popupsWanted() {
    if (onReadingPage()) return false;
    return localStorage.getItem("tsb_notif_pop") !== "0";
  }
  async function toastPoll() {
    try {
      if (document.hidden || !ENABLED || !signedIn()) return;
      var items = await notifications();
      paintNotifUI(items);                       /* every badge stays truthful */
      var popped = readStore(NOTIF_POPPED, null);
      var freshAll = items.filter(function (n) {
        return !popped[notifKey(n)] && (Date.now() - Date.parse(n.at)) < 864e5;
      });
      if (popupsWanted()) freshAll.slice(0, 2).forEach(toastShow);
    } catch (e) {}
  }
  function toastStart() {
    setTimeout(toastPoll, 4500);
    setInterval(toastPoll, 25000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) toastPoll(); });
    /* v250: paint the badges immediately on load too, not only after the
       first 4.5 s poll — the bell used to look empty for a moment. */
    if (ENABLED && signedIn()) { try { notifRefresh(); } catch (e) {} }
    window.addEventListener("tsb:auth", function () { try { notifRefresh(); boot(); } catch (e) {} });
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { toastStart(); bootStart(); });
    else { toastStart(); bootStart(); }
  }

  var OK_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, H1: 1, H2: 1, H3: 1, P: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, BR: 1, DIV: 1, CODE: 1, PRE: 1 };
  function sanitize(html) {
    var doc = new DOMParser().parseFromString("<div id='r'>" + html + "</div>", "text/html");
    var root = doc.getElementById("r");
    (function walk(node) {
      Array.prototype.slice.call(node.children).forEach(function (el) {
        walk(el);
        if (!OK_TAGS[el.tagName]) {
          while (el.firstChild) node.insertBefore(el.firstChild, el);
          node.removeChild(el);
          return;
        }
        Array.prototype.slice.call(el.attributes).forEach(function (a) { el.removeAttribute(a.name); });
      });
    })(root);
    return root.innerHTML;
  }

  /* ---------- helpers ---------- */
  function ago(iso) {
    var d = new Date(iso);
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 45) return "just now";
    if (s < 600) return Math.max(1, Math.floor(s / 60)) + "m ago";
    var hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    var nowD = new Date();
    if (d.toDateString() === nowD.toDateString()) return hh;
    var yst = new Date(nowD.getTime() - 864e5);
    if (d.toDateString() === yst.toDateString()) return "yesterday " + hh;
    if (s < 604800) return Math.floor(s / 86400) + "d ago";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " + hh;
  }
  function readMins(html) {
    var words = (html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- global mini audio player (survives across pages) ---------- */
  var playerEl = null, audioEl = null;
  /* ---------- v221: avatar propagation ----------
     posts snapshot author_avatar / author_name at publish time, so when the profile
     photo (or name) changes we PATCH the snapshot on ALL of the user's posts —
     that's what makes the new photo show on the stories feed, the story page and
     after deleting a story, not the old one. */
  async function syncAvatarPosts(url, name) {
    var u = me();
    if (!u) return;
    var body = {};
    if (url) body.author_avatar = url;
    if (name) body.author_name = name;
    if (!Object.keys(body).length) return;
    try { await api("posts?author_id=eq." + encodeURIComponent(u.id) + "&select=id", { method: "PATCH", body: body }); }
    catch (e) { console.warn("Avatar snapshot not synced — run SQL #10 (update own posts policy)."); }
  }

  /* ---------- v221: pretty upload pickers (no ugly native "Choose file / No file chosen") ---------- */
  function fancyFileInputs(root) {
    var scope = root || document;
    scope.querySelectorAll("input[type=file]").forEach(function (inp) {
      if (inp.__tsbFancy) return; inp.__tsbFancy = true;
      var acc = inp.accept || "";
      var icon = acc.indexOf("video") >= 0 ? "🎬" : (acc.indexOf("audio") >= 0 ? "🎧" : "📷");
      var label = acc.indexOf("video") >= 0 ? "Choose video" : (acc.indexOf("audio") >= 0 ? "Choose audio" : "Choose image");
      var wrap = document.createElement("span");
      wrap.className = "upwrap";
      wrap.innerHTML = '<button type="button" class="upbtn">' + icon + " " + label + '</button><span class="upname">No file chosen</span>';
      inp.parentNode.insertBefore(wrap, inp);
      inp.style.display = "none";
      var btn = wrap.querySelector(".upbtn"), nm = wrap.querySelector(".upname");
      btn.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); inp.click(); });
      inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0];
        nm.textContent = f ? ("✓ " + (f.name.length > 24 ? f.name.slice(0, 22) + "…" : f.name) + " · " + Math.max(1, Math.round(f.size / 1024)) + " KB") : "No file chosen";
        nm.classList.toggle("has", !!f);
      });
      /* label wrappers would double-open the picker */
      var lbl = inp.closest("label");
      if (lbl) lbl.addEventListener("click", function (ev) { if (ev.target === lbl) { ev.preventDefault(); inp.click(); } });
    });
  }

  /* ---------- v221: media protection ----------
     Posts are view-only: no download button, no right-click save, no PiP/remote,
     long-hold the LEFT/RIGHT edge of a video = 2x speed (release = 1x),
     and every video/audio pauses when it leaves the screen or the tab hides. */
  var _io = null;
  function protectMedia(root) {
    var scope = root || document;
    scope.querySelectorAll("video, audio").forEach(function (m) {
      if (m.__tsbProtected) return;
      m.__tsbProtected = true;
      var inPost = m.closest("[data-post], .cm-reel, .cm-postcard, #postBody, [data-kind]");
      var free = inPost && inPost.getAttribute("data-free") === "1"; /* author opted out of view-only */
      if (m.tagName === "VIDEO") {
        /* feed-card previews are just peeks: tap = open the story, no player hijack */
        var justPeek = !!m.closest(".cm-card__cover");
        /* Instagram-style: NO native controls, no download/PiP, tap = play/pause,
           drag the bar = seek, hold LEFT/RIGHT edge = 2x */
        m.removeAttribute("controls");
        if (justPeek && !m.closest(".cm-reel")) { m.__tsbPeek = true; }
        if (justPeek) {
          m.addEventListener("contextmenu", function (ev) { ev.preventDefault(); return false; });
        }
        m.setAttribute("controlslist", "nodownload noplaybackrate noremoteplayback");
        m.setAttribute("disablepictureinpicture", "");
        m.setAttribute("playsinline", "");
        m.draggable = false;
        /* seek bar + play button live beside the video (siblings, absolutely placed) */
        if (m.__tsbPeek) { /* previews: no inline player */ }
        else {
        var pw = m.parentNode;
        if (pw && getComputedStyle(pw).position === "static") pw.style.position = "relative";
        m.insertAdjacentHTML("afterend", '<div class="tsb-vctrl">' +
          '<button class="tsb-vplay" type="button" aria-label="Play">▶</button>' +
          '<div class="tsb-vseek"><i></i></div></div>');
        var ctrl = m.nextElementSibling;
        var vp = ctrl.querySelector(".tsb-vplay"), bar = ctrl.querySelector(".tsb-vseek"), fill = bar.querySelector("i");
        var hideT = null;
        var showC = function () {
          ctrl.classList.add("on");
          if (hideT) clearTimeout(hideT);
          hideT = setTimeout(function () { if (!m.paused) ctrl.classList.remove("on"); }, 2600);
        };
        var syncUI = function () {
          vp.textContent = m.paused ? "\u25B6" : "\u23F8";
          ctrl.classList.toggle("on", m.paused);
          if (m.duration) fill.style.width = (m.currentTime / m.duration * 100) + "%";
        };
        m.addEventListener("play", function () { ctrl.classList.remove("on"); setTimeout(syncUI, 120); });
        m.addEventListener("pause", syncUI);
        m.addEventListener("timeupdate", function () { if (m.duration) fill.style.width = (m.currentTime / m.duration * 100) + "%"; });
        var toggle = function (ev) {
          if (ev) { ev.preventDefault(); ev.stopPropagation(); }
          if (m.paused) { m.play().catch(function () {}); } else { m.pause(); }
        };
        vp.addEventListener("click", toggle);
        m.addEventListener("click", toggle);
        m.addEventListener("pointermove", showC);
        /* scrub */
        var seekTo = function (ev) {
          if (!m.duration) return;
          var r = bar.getBoundingClientRect();
          var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
          m.currentTime = Math.max(0, Math.min(1, x / r.width)) * m.duration;
        };
        var seekMove = false;
        bar.addEventListener("pointerdown", function (ev) { seekMove = true; ev.preventDefault(); seekTo(ev); });
        document.addEventListener("pointermove", function (ev) { if (seekMove) seekTo(ev); });
        document.addEventListener("pointerup", function () { seekMove = false; });
        /* long-hold LEFT/RIGHT edge = 2x (Instagram) */
        var timer = null, fast = false;
        var edge = function (clientX) {
          var r = m.getBoundingClientRect();
          return clientX <= r.left + r.width * 0.22 || clientX >= r.right - r.width * 0.22;
        };
        var start = function (cx) {
          if (!edge(cx)) return;
          timer = setTimeout(function () {
            if (m.paused) { m.play().catch(function () {}); }
            m.playbackRate = 2; fast = true;
          }, 240);
        };
        var stop = function () {
          if (timer) { clearTimeout(timer); timer = null; }
          if (fast) { m.playbackRate = 1; fast = false; }
        };
        m.addEventListener("touchstart", function (e) { start(e.touches[0].clientX); }, { passive: true });
        m.addEventListener("mousedown", function (e) { start(e.clientX); });
        ["touchend", "touchcancel", "mouseup", "mouseleave"].forEach(function (ev) {
          m.addEventListener(ev, stop, { passive: true });
        });
        m.addEventListener("touchmove", stop, { passive: true });
        } /* end of non-peek custom controls */
      } else {
        m.draggable = false;
      }
      /* no saving / copying */
      if (!free) {
        m.addEventListener("contextmenu", function (ev) { ev.preventDefault(); return false; });
        m.addEventListener("dragstart", function (ev) { ev.preventDefault(); return false; });
        m.setAttribute("oncontextmenu", "return false");
      }
      /* pause when it leaves the screen — switching posts stops the sound/video */
      if (!_io) {
        try { _io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (!en.isIntersecting) { try { en.target.pause(); en.target.playbackRate = 1; } catch (e) {} } });
        }, { threshold: 0.12 }); } catch (e) { _io = null; }
      }
      if (_io) _io.observe(m);
    });
    /* images in posts: no long-press save / right-click copy unless author allows */
    scope.querySelectorAll("img").forEach(function (im) {
      if (im.__tsbImgProt || !im.closest("[data-post], .cm-reel, .cm-postcard, #postBody, [data-kind]")) return;
      im.__tsbImgProt = true;
      var free = im.closest('[data-free="1"]');
      if (free) return;
      im.draggable = false;
      im.addEventListener("contextmenu", function (ev) { ev.preventDefault(); return false; });
      im.addEventListener("dragstart", function (ev) { ev.preventDefault(); return false; });
    });
  }
  function pauseAllMedia() {
    document.querySelectorAll("video, audio").forEach(function (m) { try { m.pause(); m.playbackRate = 1; } catch (e) {} });
    try { if (audioEl && !audioEl.paused) { audioEl.pause(); if (playerEl) playerEl.classList.remove("on"); } } catch (e) {}
  }
  /* ---------- v221: DM read receipts ---------- */
  async function markThreadRead(peerId) {
    if (!api || !signedIn()) return;
    var mu = me(); if (!mu) return;
    try {
      await api("messages?sender_id=eq." + encodeURIComponent(peerId) + "&receiver_id=eq." + encodeURIComponent(mu.id) + "&read=eq.false", { method: "PATCH", body: { read: true } });
    } catch (e) {
      /* read column may not exist yet on old DBs — surface the one-line SQL, don't crash the chat */
      if (String((e && e.message) || e).indexOf("read") >= 0) console.warn("Run SQL #10 (add messages.read) for read receipts.");
    }
  }

  function playAudio(url, title) {
    try {
      if (!playerEl) {
        playerEl = document.createElement("div");
        playerEl.className = "cm-play";
        playerEl.innerHTML = '<button class="cm-play__btn" aria-label="Play/Pause">▶</button>' +
          '<span class="cm-play__t"></span><button class="cm-play__x" aria-label="Stop">✕</button>';
        document.body.appendChild(playerEl);
        audioEl = new Audio();
        playerEl.querySelector(".cm-play__btn").addEventListener("click", function () {
          if (audioEl.paused) { audioEl.play(); this.textContent = "⏸"; }
          else { audioEl.pause(); this.textContent = "▶"; }
        });
        playerEl.querySelector(".cm-play__x").addEventListener("click", function () {
          audioEl.pause(); playerEl.classList.remove("on");
        });
        audioEl.addEventListener("ended", function () {
          playerEl.querySelector(".cm-play__btn").textContent = "▶";
        });
      }
      audioEl.src = url;
      audioEl.play();
      playerEl.querySelector(".cm-play__btn").textContent = "⏸";
      playerEl.querySelector(".cm-play__t").textContent = "🎧 " + title;
      playerEl.classList.add("on");
    } catch (e) {}
  }

  var OFFICIAL_ID = "11111111-1111-1111-1111-111111111111";
  var FOUNDER_EMAILS = ["acimotreyothy@gmail.com"];
  var FOUNDER_IDS_KEY = "tsb_founder_ids";
  function loadFounderIds(){ try{ return JSON.parse(localStorage.getItem(FOUNDER_IDS_KEY)||"[]"); }catch(e){ return []; } }
  var FOUNDER_IDS = loadFounderIds();
  function saveFounderId(id){ try{ if(!id||FOUNDER_IDS.indexOf(id)>=0) return; FOUNDER_IDS.push(id); localStorage.setItem(FOUNDER_IDS_KEY, JSON.stringify(FOUNDER_IDS)); try{ var ej=document.getElementById("founderIdBox"); if(ej) ej.textContent=id; }catch(e){} }catch(e){} }
  // capture founder id the moment they sign in (works even before profiles table)
  try{
    var _mu = null; try{ _mu = (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) || JSON.parse(localStorage.getItem("tsb_auth_session")||"null")?.user || null; }catch(e){}
    if(_mu && _mu.email && FOUNDER_EMAILS.indexOf(String(_mu.email).toLowerCase())>=0) saveFounderId(_mu.id);
  }catch(e){}
  // also watch for future sign-ins
  try{ window.addEventListener("tsb:auth", function(){ try{ var u2=me(); if(u2&&FOUNDER_EMAILS.indexOf(String(u2.email||"").toLowerCase())>=0) saveFounderId(u2.id); }catch(e){} }); }catch(e){}
  function isOfficial(id){
    if(id===OFFICIAL_ID) return true;
    try{ if(FOUNDER_IDS.indexOf(id)>=0) return true; }catch(e){}
    try{
      var u=me();
      if(u && FOUNDER_EMAILS.indexOf(String(u.email||"").toLowerCase())>=0 && u.id===id){
        saveFounderId(id);
        return true;
      }
      // also check static window list (set by founder.js if you hardcode the id later)
      if(window.TSB_FOUNDER_IDS && window.TSB_FOUNDER_IDS.indexOf(id)>=0) return true;
    }catch(e){}
    return false;
  }
  var OFFICIAL_AVATAR = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
    '<rect width="96" height="96" rx="20" fill="#ffc800"/>' +
    '<rect x="4" y="4" width="88" height="88" rx="17" fill="none" stroke="#1c1a17" stroke-width="5"/>' +
    '<text x="48" y="62" font-size="44" text-anchor="middle">📕</text></svg>'
  );
  function avaUrl(name, url, id) {
    if (url) return url; /* uploads use unique Date.now() paths, so a new photo = new URL = no cache problem */
    if (isOfficial(id)) return OFFICIAL_AVATAR;
    return "";
  }


  /* ====================================================================
     v250 · PRESENCE, READ RECEIPTS & FOLLOW REQUESTS
     --------------------------------------------------------------------
     All three ride the `profiles.links` JSON column you already have, and
     every write targets the writer's OWN row — so your existing RLS is
     enough and NOTHING has to be run in Supabase for this to work.

       peek  — the last time YOU opened the app        (last seen / online)
       hear  — the last time you OPENED a story        (read receipts)
       out   — follow requests you have sent
       in    — follow requests you have accepted
       no    — follow requests you declined
       pub   — your privacy switches (show last seen, show read receipts)

     The accept handshake never lets one reader write another's row:
       A asks   -> A writes A.out
       B (sees A.out) accepts -> B writes B.in
       A's next launch sees B.in and writes the actual `follows` row
       (RLS-safe: follower_id is still A, which is what the policy wants)
     ==================================================================== */
  var VIEWS_KEY = "tsb_views";
  var PEEK_MS = 30 * 60 * 1000;          /* presence write: at most every 30 min */

  function viewsLocal() {
    try { var o = JSON.parse(localStorage.getItem(VIEWS_KEY) || "{}"); return (o && typeof o === "object") ? o : {}; }
    catch (e) { return {}; }
  }
  function viewsSeen() { return viewsLocal(); }
  function viewsSetSeen(patch) {
    var o = viewsLocal();
    Object.keys(patch || {}).forEach(function (k) { o[k] = patch[k]; });
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(o)); } catch (e) {}
    return o;
  }
  /* ==================================================================== v250-b
     ONE ARRAY, TWO JOBS — and that was the bug.

     `profiles.links` holds the reader's real links AND this app's internal
     buckets (peek/pub = presence + privacy, out/in/no = the follow handshake,
     hear = read receipts). The profile page printed the array raw, so people
     saw {"k":"peek","v":...} sitting in their links like an error message.

     Worse: saving the profile wrote back only what the text input held, which
     threw the buckets away — and because a *stringified* bucket no longer looks
     like a bucket, every later presence write appended another copy. That is
     where the repeats came from.

     normLinks() understands every shape the data has ever been in, so reads are
     clean, writes keep the buckets, and the junk heals itself on next save.
     ====================================================================== */
  function parseMaybeJSON(s) {
    if (typeof s !== "string") return null;
    var t = s.trim();
    if (t.charAt(0) !== "{" && t.charAt(0) !== "[") return null;
    try { return JSON.parse(t); } catch (e) { return null; }
  }
  /* "https://x.com", {"k":"peek","v":123} and '{"k":"peek","v":123}' all in one array */
  function normLinks(links) {
    var arr = links;
    if (typeof arr === "string") { var whole = parseMaybeJSON(arr); arr = Array.isArray(whole) ? whole : []; }
    if (!Array.isArray(arr)) return { links: [], buckets: {} };

    var outLinks = [], buckets = {};
    function takeBucket(k, v) {
      var had = Object.prototype.hasOwnProperty.call(buckets, k);
      if (!had) { buckets[k] = v; return; }
      /* duplicates: union the handshake lists, otherwise the newest write wins */
      if (Array.isArray(buckets[k]) && Array.isArray(v)) {
        var seen = {};
        buckets[k].concat(v).forEach(function (x) { seen[String(x)] = x; });
        buckets[k] = Object.keys(seen).map(function (x) { return seen[x]; });
      } else {
        buckets[k] = v;
      }
    }

    for (var i = 0; i < arr.length; i++) {
      var el = arr[i];
      if (el == null) continue;

      if (typeof el === "object" && !Array.isArray(el)) {
        if (typeof el.k === "string" && el.k) takeBucket(el.k, el.v);
        continue;                                   /* links are never objects */
      }
      if (typeof el !== "string") continue;

      var t = el.trim();
      if (!t) continue;
      if (t === "undefined" || t === "null") continue;
      if (/^\[object /i.test(t)) continue;            /* "[object Object]" leftovers */

      var parsed = parseMaybeJSON(t);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && typeof parsed.k === "string") {
        takeBucket(parsed.k, parsed.v);             /* a bucket that got stringified */
        continue;
      }
      if (Array.isArray(parsed)) {                  /* a whole array nested in a string */
        parsed.forEach(function (x) {
          var n = normLinks([x]);
          n.links.forEach(function (l) { outLinks.push(l); });
          Object.keys(n.buckets).forEach(function (k) { takeBucket(k, n.buckets[k]); });
        });
        continue;
      }
      outLinks.push(t);
    }
    return { links: outLinks, buckets: buckets };
  }
  /* the links a human should ever see */
  function realLinks(links) { return normLinks(links).links; }
  /* the buckets this app needs to keep, whatever happens to the links */
  function linkBuckets(links) { return normLinks(links).buckets; }
  /* rebuild the stored array: real links first, then the app's own buckets */
  function buildLinks(urls, buckets) {
    var out = (Array.isArray(urls) ? urls : []).slice();
    var bk = buckets || {};
    Object.keys(bk).forEach(function (k) { out.push({ k: k, v: bk[k] }); });
    return out;
  }
  /* is this row carrying junk from before the fix? (duplicates, stringified
     buckets, "[object Object]" leftovers, or a whole array stored as a string) */
  function linksAreDirty(links) {
    if (links == null) return false;
    if (typeof links === "string") return /^\s*\[/.test(links);
    if (!Array.isArray(links)) return false;
    var seen = {};
    for (var i = 0; i < links.length; i++) {
      var el = links[i];
      if (typeof el === "string") {
        if (/^\s*[{[]/.test(el) || /^\[object /i.test(el)) return true;   /* junk saved as a link */
        continue;
      }
      if (el && typeof el === "object" && typeof el.k === "string") {
        if (seen[el.k]) return true;                                      /* a duplicate bucket */
        seen[el.k] = 1;
      }
    }
    return false;
  }
  /* heal one row, once: rewrite the array in the clean shape. Silent, and it
     never touches a row that is already fine. */
  async function repairLinks() {
    if (!api || !signedIn()) return null;
    var mu = me(); if (!mu) return null;
    try {
      var prof = await safeProfile();
      var raw = prof && prof.links;
      if (!linksAreDirty(raw)) return null;
      var n = normLinks(raw);
      var clean = buildLinks(n.links, n.buckets);
      await api("profiles?id=eq." + mu.id, { method: "PATCH", body: { links: clean } });
      return clean;
    } catch (e) { return null; }
  }
  /* read a bucket out of somebody's links array (tolerates junk + strings) */
  function linkBucket(links, key, fallback) {
    var b = normLinks(links).buckets;
    return Object.prototype.hasOwnProperty.call(b, key) ? b[key] : fallback;
  }
  function withBucket(links, key, value) {
    var n = normLinks(links);
    n.buckets[key] = value;
    return buildLinks(n.links, n.buckets);
  }
  /* merge a set of buckets into MY profile row, keeping the reader's own links */
  async function saveViews(patchBuckets) {
    if (!api || !signedIn()) return null;
    var mu = me(); if (!mu) return null;
    try {
      var prof = await safeProfile();
      var n = normLinks(prof && prof.links);
      Object.keys(patchBuckets || {}).forEach(function (k) { n.buckets[k] = patchBuckets[k]; });
      /* writing the normalised form is also the repair: any duplicated or
         stringified bucket from before is collapsed here, once, for good */
      var links = buildLinks(n.links, n.buckets);
      await api("profiles?id=eq." + mu.id, { method: "PATCH", body: { links: links } });
      return links;
    } catch (e) { return null; }
  }

  /* ---- presence: stamp on every page, pushed occasionally -------------- */
  async function touchPresence(force) {
    if (!api || !signedIn()) return null;
    var local = viewsLocal();
    var now = Date.now();
    if (!force && local.peek && now - local.peek < PEEK_MS) return local.peek;   /* cached */
    viewsSetSeen({ peek: now });
    try {
      local = viewsLocal();
      await saveViews({ peek: now, pub: local.pub || {} });
    } catch (e) {}
    return now;
  }
  /* ---- read receipt: "I opened this story" ----------------------------- */
  async function markHeard(postId) {
    if (!api || !signedIn() || !postId) return;
    var local = viewsLocal();
    var heard = Array.isArray(local.hear) ? local.hear.slice() : [];
    if (heard.indexOf(postId) >= 0) return;                     /* already logged */
    heard.push(postId);
    if (heard.length > 400) heard = heard.slice(-400);
    viewsSetSeen({ hear: heard });
    /* privacy: the writer's switch decides whether receipts travel */
    if (local.pub && local.pub.show_hear === false) return;
    try { await saveViews({ hear: heard }); } catch (e) {}
  }
  function heardPosts() {
    var l = viewsLocal();
    return Array.isArray(l.hear) ? l.hear : [];
  }
  function readsPost(personLinks, postId) {
    var heard = linkBucket(personLinks, "hear", []);
    return Array.isArray(heard) && heard.indexOf(postId) >= 0;
  }
  /* how many people have read a given story (adds up across their profiles) */
  function readersOf(people, postId) {
    var out = [];
    (people || []).forEach(function (p) {
      if (p && p.id && readsPost(p.links, postId)) out.push(p);
    });
    return out;
  }
  /* ---- last seen text -------------------------------------------------- */
  function lastSeenOf(person) {
    if (!person) return null;
    var pub = linkBucket(person.links, "pub", {}) || {};
    if (pub.show_last === false) return null;                   /* they keep it private */
    var peek = linkBucket(person.links, "peek", null);
    var n = typeof peek === "number" ? peek : (peek && peek.at) || 0;
    return n || null;
  }
  function lastSeenText(ms) {
    if (!ms) return "";
    var d = Date.now() - ms;
    if (d < 90 * 1000) return "online now";
    if (d < 3600 * 1000) return "last seen " + Math.max(1, Math.round(d / 60000)) + "m ago";
    if (d < 24 * 3600 * 1000) return "last seen " + Math.round(d / 3600000) + "h ago";
    if (d < 7 * 24 * 3600 * 1000) return "last seen " + Math.round(d / 86400000) + "d ago";
    return "last seen " + ago(new Date(ms).toISOString());
  }
  function privacyOf(person) {
    var pub = linkBucket(person && person.links, "pub", {}) || {};
    return { show_last: pub.show_last !== false, show_hear: pub.show_hear !== false };
  }
  async function setPrivacy(patch) {
    if (!api || !signedIn()) throw new Error("sign-in");
    var local = viewsLocal();
    var pub = local.pub || {};
    Object.keys(patch || {}).forEach(function (k) { pub[k] = !!patch[k]; });
    viewsSetSeen({ pub: pub });
    await saveViews({ pub: pub, peek: local.peek || Date.now() });
    return pub;
  }
  function myPrivacy() { return viewsLocal().pub || {}; }

  /* ---- follow requests (accept handshake, RLS-safe) -------------------- */
  /* ------------------------------------------------------------------ v250
     SERVER-BACKED FOLLOW REQUESTS.

     The links-bucket handshake below is the offline fallback: it works with
     zero SQL, because each side writes only into its OWN profile row. But it
     cannot stop two people requesting each other twice, it cannot be read
     from another device until that device loads your profile, and a declined
     request only disappears when the other phone cooperates.

     So when supabase/sql/follow-requests.sql has been applied, we use the
     real table instead (public.follow_requests + three SECURITY DEFINER
     functions). The client keeps the same API and the same local buckets —
     syncRequests() rebuilds them from the server — so no screen needs to
     know which mode is running.
     ------------------------------------------------------------------ */
  var FR = null, FR_PROMISE = null;

  async function frReady() {
    if (FR !== null) return FR;
    if (!FR_PROMISE) {
      FR_PROMISE = (async function () {
        try { var r = await api("follow_requests?select=id&limit=1"); FR = Array.isArray(r); }
        catch (e) { FR = false; }                       /* 404 -> table not created yet */
        return FR;
      })();
    }
    return FR_PROMISE;
  }
  function frRpc(name, body) { return api("rpc/" + name, { method: "POST", body: body || {} }); }

  /* rebuild the local buckets from the server: out = what I asked for,
     no = what was declined, in = who is waiting on me */
  async function syncRequests() {
    if (!(await frReady())) return false;
    var mu = me(); if (!mu) return false;
    var out = [], inn = [], no = [];
    try {
      var mine = await api("follow_requests?select=target_id,status&requester_id=eq." + mu.id);
      (mine || []).forEach(function (r) {
        if (r.status === "pending") out.push({ to: r.target_id, at: Date.now(), from: mu.id });
        else if (r.status === "declined") no.push({ from: r.target_id, at: Date.now() });
      });
    } catch (e) {}
    try {
      var waiting = await api("follow_requests?select=requester_id&target_id=eq." + mu.id + "&status=eq.pending");
      (waiting || []).forEach(function (r) { inn.push({ from: r.requester_id, at: Date.now() }); });
    } catch (e) {}
    viewsSetSeen({ out: out, in: inn, no: no });
    return true;
  }
  function requestsBackend() { return FR ? "server" : "links"; }

  async function requestFollow(authorId) {
    if (!api || !signedIn() || !authorId) throw new Error("sign-in");
    if (await frReady()) {
      try { await frRpc("request_follow", { target: authorId }); } catch (e) {}
      try { await syncRequests(); } catch (e) {}
      return myRequestsOut();
    }
    var mu = me();
    var local = viewsLocal();
    var out = Array.isArray(local.out) ? local.out.slice() : [];
    out = out.filter(function (r) { return !r || r.to !== authorId; });
    out.push({ to: authorId, at: Date.now(), from: mu.id });
    viewsSetSeen({ out: out });
    await saveViews({ out: out });
    return out;
  }
  async function cancelFollowRequest(authorId) {
    if (!api || !signedIn()) throw new Error("sign-in");
    if (await frReady()) {
      try { await frRpc("cancel_follow_request", { target: authorId }); } catch (e) {}
      try { await syncRequests(); } catch (e) {}
      return [];
    }
    var local = viewsLocal();
    var out = (Array.isArray(local.out) ? local.out : []).filter(function (r) { return !r || r.to !== authorId; });
    viewsSetSeen({ out: out });
    await saveViews({ out: out });
    return out;
  }
  function myRequestsOut() { return Array.isArray(viewsLocal().out) ? viewsLocal().out : []; }
  function iRequested(person) {
    if (!person) return false;
    var out = myRequestsOut();
    return out.some(function (r) { return r && r.to === person.id; });
  }
  /* requests waiting for ME to accept: anybody whose `out` names me */
  function pendingTo(people, meId) {
    var list = [];
    var mine = Array.isArray(viewsLocal().in) ? viewsLocal().in : [];   /* v250 */
    (people || []).forEach(function (p) {
      if (!p || !p.id || p.id === meId) return;
      var out = linkBucket(p.links, "out", []);
      var asksMe = (Array.isArray(out) && out.some(function (r) { return r && r.to === meId; })) ||
                   mine.some(function (r) { return r && r.from === p.id; });
      if (asksMe) list.push(p);
    });
    return list;
  }
  async function acceptFollowRequest(person) {
    if (!api || !signedIn() || !person) throw new Error("sign-in");
    if (await frReady()) {
      try { await frRpc("respond_follow_request", { target: person.id, accept: true }); } catch (e) {}
      try { await syncRequests(); } catch (e) {}
      return true;
    }
    var local = viewsLocal();
    var inn = Array.isArray(local.in) ? local.in.slice() : [];
    inn = inn.filter(function (r) { return !r || r.from !== person.id; });
    inn.push({ from: person.id, at: Date.now() });
    var no = (Array.isArray(local.no) ? local.no : []).filter(function (r) { return !r || r.from !== person.id; });
    viewsSetSeen({ in: inn, no: no });
    await saveViews({ in: inn, no: no });
    return true;
  }
  async function declineFollowRequest(person) {
    if (!api || !signedIn() || !person) throw new Error("sign-in");
    if (await frReady()) {
      try { await frRpc("respond_follow_request", { target: person.id, accept: false }); } catch (e) {}
      try { await syncRequests(); } catch (e) {}
      return true;
    }
    var local = viewsLocal();
    var no = Array.isArray(local.no) ? local.no.slice() : [];
    no = no.filter(function (r) { return !r || r.from !== person.id; });
    no.push({ from: person.id, at: Date.now() });
    var inn = (Array.isArray(local.in) ? local.in : []).filter(function (r) { return !r || r.from !== person.id; });
    viewsSetSeen({ no: no, in: inn });
    await saveViews({ no: no, in: inn });
    return true;
  }
  /* my app settles every handshake the other side has already decided:
     · accepted -> write the real `follows` row (follower_id is still ME)
     · declined -> drop my request so the button goes back to Follow      */
  async function settleRequests(people) {
    if (!api || !signedIn()) return { accepted: [], declined: [] };
    var mu = me(); if (!mu) return { accepted: [], declined: [] };
    if (await frReady()) {                       /* the server already settled it */
      try { await syncRequests(); } catch (e) {}
      return { accepted: [], declined: [], server: true };
    }
    var local = viewsLocal();
    var out = Array.isArray(local.out) ? local.out : [];
    if (!out.length) return { accepted: [], declined: [] };
    var byId = {};
    (people || []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
    var accepted = [], declined = [], keep = [];
    for (var i = 0; i < out.length; i++) {
      var r = out[i]; if (!r || !r.to) continue;
      var them = byId[r.to];
      if (!them) { keep.push(r); continue; }                       /* not loaded yet */
      var inn = linkBucket(them.links, "in", []);
      var no = linkBucket(them.links, "no", []);
      var isIn = Array.isArray(inn) && inn.some(function (x) { return x && x.from === mu.id; });
      var isNo = Array.isArray(no) && no.some(function (x) { return x && x.from === mu.id; });
      if (isIn) { accepted.push(r.to); continue; }                 /* handled below */
      if (isNo) { declined.push(r.to); continue; }
      keep.push(r);
    }
    if (accepted.length) {
      try {
        var mine = {}; (await followingIds()).forEach(function (id) { mine[id] = 1; });
        for (var j = 0; j < accepted.length; j++) {
          var id2 = accepted[j];
          if (mine[id2]) continue;
          try { await api("follows", { method: "POST", body: { follower_id: mu.id, author_id: id2 } }); } catch (e) {}
        }
      } catch (e) {}
    }
    if (accepted.length || declined.length) {
      viewsSetSeen({ out: keep });
      await saveViews({ out: keep });
    }
    return { accepted: accepted, declined: declined };
  }

  window.TSB_COMMUNITY = {
    enabled: ENABLED, OFFICIAL_ID: OFFICIAL_ID, isOfficial: isOfficial, api: api, me: me, signedIn: signedIn,
    ensureProfile: ensureProfile, getProfile: getProfile,
    listPosts: listPosts, getPost: getPost, publish: publish, deletePost: deletePost,
    likeInfo: likeInfo, setLike: setLike, likesOnMyPosts: likesOnMyPosts,
    listProfiles: listProfiles, allPeople: allPeople, setProfilePublic: setProfilePublic, postCounts: postCounts, getPostByShort: getPostByShort, toastKey: toastKey, toastMark: toastMark, notifications: notifications, whenReady: whenReady, avaUrl: avaUrl, OFFICIAL_AVATAR: OFFICIAL_AVATAR, protectMedia: protectMedia, pauseAllMedia: pauseAllMedia, fancyFileInputs: fancyFileInputs, syncAvatarPosts: syncAvatarPosts,
    /* v250 — notifications: one read ledger, one badge painter */
    notifKey: notifKey, notifMarkRead: notifMarkRead, notifIsRead: notifIsRead, notifUnread: notifUnread,
    notifMarkAll: notifMarkAll, notifMarkPeer: notifMarkPeer, notifMarkPost: notifMarkPost,
    notifMarkContext: notifMarkContext,
    notifMarkUser: notifMarkUser, notifRefresh: notifRefresh, paintNotifUI: paintNotifUI,
    boot: boot, countLessons: countLessons, say: say,
    myMessages: myMessages, conversations: conversations, threadWith: threadWith, sendDM: sendDM, markThreadRead: markThreadRead,
    editDM: editDM, deleteDM: deleteDM, hideDM: hideDM, clearThread: clearThread,
    syncProgress: syncProgress, syncInterests: syncInterests, icon: icon,
    listComments: listComments, addComment: addComment,
    followInfo: followInfo, setFollow: setFollow, followingIds: followingIds, followerRows: followerRows,
    /* v250 — presence, read receipts, follow requests */
    touchPresence: touchPresence, viewsSeen: viewsSeen, viewsSetSeen: viewsSetSeen,
    markHeard: markHeard, heardPosts: heardPosts, readsPost: readsPost, readersOf: readersOf,
    lastSeenOf: lastSeenOf, lastSeenText: lastSeenText, privacyOf: privacyOf, setPrivacy: setPrivacy, myPrivacy: myPrivacy,
    requestFollow: requestFollow, requestsBackend: requestsBackend, syncRequests: syncRequests, followRequestsReady: frReady, cancelFollowRequest: cancelFollowRequest, iRequested: iRequested,
    pendingTo: pendingTo, acceptFollowRequest: acceptFollowRequest, declineFollowRequest: declineFollowRequest,
    settleRequests: settleRequests, linkBucket: linkBucket, notifMarkKey: notifMarkKey,
    /* the links array, decoded: real links out, app buckets kept */
    normLinks: normLinks, realLinks: realLinks, linkBuckets: linkBuckets, buildLinks: buildLinks,
    repairLinks: repairLinks, linksAreDirty: linksAreDirty,
    upload: upload, probeStorage: probeStorage, sanitize: sanitize, ago: ago, readMins: readMins, esc: esc, playAudio: playAudio,
    isVideoUrl: isVideoUrl, videoDuration: videoDuration, checkBurst: checkBurst, MAX_BURST_SEC: MAX_BURST_SEC
  };
})();
