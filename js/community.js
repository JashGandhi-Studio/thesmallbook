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
    var created = await api("profiles?on_conflict=id&select=*", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: { id: u.id, name: name, avatar_url: avatar } });
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
    var q = "posts?select=*&order=created_at.desc&limit=" + (opt.limit || 30);
    if (opt.offset) q += "&offset=" + opt.offset; // NOTE: PostgREST ignores unknown params; kept for compat
    if (opt.author) q += "&author_id=eq." + opt.author;
    if (opt.ids) q += "&author_id=in.(" + opt.ids.join(",") + ")";
    return (await api(q, {})) || [];
  }
  async function getPost(id) {
    var rows = await api("posts?id=eq." + id + "&select=*", {});
    return (rows && rows[0]) || null;
  }
  async function getPostByShort(code) {
    code = String(code || "").toLowerCase().replace(/[^a-f0-9]/g, "");
    if (!code) return null;
    var rows = await api("posts?select=*&order=created_at.desc&limit=500", {});
    var hit = (rows || []).filter(function (p) { return String(p.id).toLowerCase().indexOf(code) === 0; })[0];
    return hit || null;
  }
  async function publish(p) {
    var u = me();
    if (!u) throw new Error("sign-in");
    var prof = await safeProfile();
    var row = await api("posts?select=*", {
      method: "POST",
      body: {
        author_id: u.id,
        author_name: (prof && prof.name) || "Reader",
        author_avatar: (prof && prof.avatar_url) || "",
        title: p.title, subtitle: p.subtitle || "", cover_url: p.cover_url || "",
        body: p.body || "", tags: p.tags || [], audio_url: p.audio_url || "", kind: p.kind || "text"
      }
    });
    return (row && row[0]) || null;
  }
  async function deletePost(id) {
    var u = me();
    if (!u) throw new Error("sign-in");
    await api("posts?id=eq." + id + "&author_id=eq." + u.id, { method: "DELETE" });
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

  /* ---------- rich-text safety: whitelist tags, drop attributes ---------- */
  // ---- v191: people discovery (v192: public accounts only, with fallback) ----
  async function listProfiles(limit) {
    if (!api) return [];
    try {
      return await api("profiles?select=*&is_public=eq.true&order=created_at.desc&limit=" + (limit || 60), { method: "GET" });
    } catch (e) {
      return await api("profiles?select=*&order=created_at.desc&limit=" + (limit || 60), { method: "GET" });
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
      var n = Object.keys(prog).length;
      await api("profiles?id=eq." + mu3.id, { method: "PATCH", body: { progress: n } });
      localStorage.setItem("tsb_prog_sync", String(Date.now()));
    } catch (e) {}
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
    if (url) return url;
    if (isOfficial(id)) return OFFICIAL_AVATAR;
    return "";
  }

  window.TSB_COMMUNITY = {
    enabled: ENABLED, OFFICIAL_ID: OFFICIAL_ID, isOfficial: isOfficial, api: api, me: me, signedIn: signedIn,
    ensureProfile: ensureProfile, getProfile: getProfile,
    listPosts: listPosts, getPost: getPost, publish: publish, deletePost: deletePost,
    likeInfo: likeInfo, setLike: setLike, likesOnMyPosts: likesOnMyPosts,
    listProfiles: listProfiles, setProfilePublic: setProfilePublic, getPostByShort: getPostByShort, toastKey: toastKey, toastMark: toastMark, notifications: notifications, whenReady: whenReady, avaUrl: avaUrl, OFFICIAL_AVATAR: OFFICIAL_AVATAR,
    myMessages: myMessages, conversations: conversations, threadWith: threadWith, sendDM: sendDM,
    editDM: editDM, deleteDM: deleteDM, hideDM: hideDM, clearThread: clearThread,
    syncProgress: syncProgress,
    listComments: listComments, addComment: addComment,
    followInfo: followInfo, setFollow: setFollow, followingIds: followingIds, followerRows: followerRows,
    upload: upload, sanitize: sanitize, ago: ago, readMins: readMins, esc: esc, playAudio: playAudio
  };
})();
