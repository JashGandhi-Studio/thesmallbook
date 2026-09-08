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
    var res = await fetch(URL + "/storage/v1/object/" + bucket + "/" + path, {
      method: "POST",
      headers: { apikey: ANON, Authorization: "Bearer " + tk, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: file
    });
    if (!res.ok) {
      var det = "";
      try { var j = await res.json(); det = (j && (j.message || j.error)) || ""; } catch (e) {}
      throw new Error((res.status === 400 || res.status === 403) ? ("upload blocked by storage rules — run SQL #3 v3 (" + (det || res.status) + ")") : ("upload failed (" + (det || res.status) + ")"));
    }
    return URL + "/storage/v1/object/public/" + bucket + "/" + path;
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
  // ---- v191: people discovery (v192: public accounts only, with fallback) ----
  async function listProfiles(limit) {
    if (!api) return [];
    try {
      return await api("profiles?select=*&order=updated_at.desc&limit=" + (limit || 60), { method: "GET" });
    } catch (e) {
      return await api("profiles?select=*&order=updated_at.desc&limit=" + (limit || 60), { method: "GET" });
    }
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
      out.push({ type: "dm", who: m.sender_id, body: m.body, at: m.created_at });
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
  async function sendDM(uid, body, bookId) {
    if (!api || !signedIn()) return null;
    var mu = me(); if (!mu) return null;
    var payload = { sender_id: mu.id, receiver_id: uid, body: String(body).slice(0, 1000) };
    if (bookId) payload.book_id = String(bookId);
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

  // ---- v191: public reading progress (auto-sync, throttled hourly) ----
  async function syncProgress(force) {
    if (!api || !signedIn()) return;
    try {
      var last = +(localStorage.getItem("tsb_prog_sync") || 0);
      if (!force && Date.now() - last < 36e5) return;
      var mu3 = me(); if (!mu3) return;
      var prog = JSON.parse(localStorage.getItem("tsb_progress") || "{}");
      // v203: progress column = LESSONS read (sum of per-book lesson arrays), matching the "X/2637 lessons" UI
      var n = 0;
      Object.keys(prog).forEach(function (k) {
        var v = prog[k];
        if (Array.isArray(v)) n += v.length;
        else if (v && typeof v === "object") n += Object.keys(v).length;
        else if (v) n += 1;
      });
      await api("profiles?id=eq." + mu3.id, { method: "PATCH", body: { progress: n } });
      localStorage.setItem("tsb_prog_sync", String(Date.now()));
    } catch (e) {}
  }

  var ICONS = {
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

  // ---- v212: posts per author (lets People/finder rows show who's posting) ----
  async function postCounts(limit) {
    try {
      var rows = await api("posts?select=author_id&limit=" + (limit || 400), { method: "GET" });
      var out = {};
      (rows || []).forEach(function (r) { if (r.author_id) out[r.author_id] = (out[r.author_id] || 0) + 1; });
      return out;
    } catch (e) { return {}; }
  }

  /* ---------- v198: live in-app notification toasts ---------- */
  var TOAST_SEEN = "tsb_toast_seen";
  function toastKey(n) { return [n.type, n.who || "", n.post || "", n.at].join(":"); }
  function toastSeen() { try { return JSON.parse(localStorage.getItem(TOAST_SEEN)) || []; } catch (e) { return []; } }
  function toastMark(keys) {
    try { localStorage.setItem(TOAST_SEEN, JSON.stringify(toastSeen().concat(keys).slice(-300))); } catch (e) {}
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
    toastMark([toastKey(n)]);
    try { if (window.TSB && window.TSB.sound) window.TSB.sound.play(); } catch (e2) {}
  }
  function popupsWanted() { return localStorage.getItem("tsb_notif_pop") !== "0"; }
  async function toastPoll() {
    try {
      if (document.hidden || !ENABLED || !signedIn()) return;
      var items = await notifications();
      var seen = toastSeen();
      var freshAll = items.filter(function (n) {
        return seen.indexOf(toastKey(n)) < 0 && (Date.now() - Date.parse(n.at)) < 864e5;
      });
      try {
        localStorage.setItem("tsb_notif_fresh", String(freshAll.length));
        window.dispatchEvent(new CustomEvent("tsb:notifcount", { detail: { count: freshAll.length } }));
        document.querySelectorAll("[data-notifdot]").forEach(function (el) { el.hidden = freshAll.length === 0; });
      } catch (e) {}
      if (popupsWanted()) freshAll.slice(0, 2).forEach(toastShow);
    } catch (e) {}
  }
  function toastStart() {
    setTimeout(toastPoll, 4500);
    setInterval(toastPoll, 25000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) toastPoll(); });
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", toastStart);
    else toastStart();
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
  function isOfficial(id) { return id === OFFICIAL_ID; }
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

  window.TSB_COMMUNITY = {
    enabled: ENABLED, OFFICIAL_ID: OFFICIAL_ID, isOfficial: isOfficial, api: api, me: me, signedIn: signedIn,
    ensureProfile: ensureProfile, getProfile: getProfile,
    listPosts: listPosts, getPost: getPost, publish: publish, deletePost: deletePost,
    likeInfo: likeInfo, setLike: setLike, likesOnMyPosts: likesOnMyPosts,
    listProfiles: listProfiles, setProfilePublic: setProfilePublic, postCounts: postCounts, getPostByShort: getPostByShort, toastKey: toastKey, toastMark: toastMark, notifications: notifications, whenReady: whenReady, avaUrl: avaUrl, OFFICIAL_AVATAR: OFFICIAL_AVATAR, protectMedia: protectMedia, pauseAllMedia: pauseAllMedia, fancyFileInputs: fancyFileInputs, syncAvatarPosts: syncAvatarPosts,
    myMessages: myMessages, conversations: conversations, threadWith: threadWith, sendDM: sendDM, markThreadRead: markThreadRead,
    editDM: editDM, deleteDM: deleteDM, hideDM: hideDM, clearThread: clearThread,
    syncProgress: syncProgress, syncInterests: syncInterests, icon: icon,
    listComments: listComments, addComment: addComment,
    followInfo: followInfo, setFollow: setFollow, followingIds: followingIds, followerRows: followerRows,
    upload: upload, sanitize: sanitize, ago: ago, readMins: readMins, esc: esc, playAudio: playAudio,
    isVideoUrl: isVideoUrl, videoDuration: videoDuration, checkBurst: checkBurst, MAX_BURST_SEC: MAX_BURST_SEC
  };
})();
