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

  var CFG = window.CFG || {};
  var URL = (CFG.SUPABASE_URL || "").replace(/\/$/, "");
  var ANON = CFG.SUPABASE_ANON_KEY || "";
  var ENABLED = !!(URL && ANON);

  /* ---------- tiny REST helper ---------- */
  async function api(path, opts) {
    if (!ENABLED) throw new Error("cloud-off");
    opts = opts || {};
    var headers = { apikey: ANON, "Content-Type": "application/json" };
    try {
      var tk = await (window.TSB_AUTH && TSB_AUTH.token ? TSB_AUTH.token() : "");
      if (tk) headers.Authorization = "Bearer " + tk;
      else headers.Authorization = "Bearer " + ANON;
    } catch (e) { headers.Authorization = "Bearer " + ANON; }
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });
    var res = await fetch(URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) throw new Error("api " + res.status);
    var txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  function me() {
    try { return (window.TSB_AUTH && TSB_AUTH.user) ? TSB_AUTH.user() : null; } catch (e) { return null; }
  }
  function signedIn() { return !!me(); }

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
    var created = await api("profiles?select=*", { method: "POST", body: { id: u.id, name: name, avatar_url: avatar } });
    return (created && created[0]) || { id: u.id, name: name, avatar_url: avatar, bio: "" };
  }
  async function getProfile(id) {
    var rows = await api("profiles?id=eq." + id + "&select=*", {});
    return (rows && rows[0]) || null;
  }

  /* ---------- posts ---------- */
  async function listPosts(opt) {
    opt = opt || {};
    var q = "posts?select=*&order=created_at.desc&limit=" + (opt.limit || 30);
    if (opt.offset) q += "&offset=" + opt.offset;
    if (opt.author) q += "&author_id=eq." + opt.author;
    if (opt.ids) q += "&author_id=in.(" + opt.ids.join(",") + ")";
    return (await api(q, {})) || [];
  }
  async function getPost(id) {
    var rows = await api("posts?id=eq." + id + "&select=*", {});
    return (rows && rows[0]) || null;
  }
  async function publish(p) {
    var u = me();
    if (!u) throw new Error("sign-in");
    var prof = await ensureProfile();
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
    var prof = await ensureProfile();
    var row = await api("comments?select=*", { method: "POST", body: { post_id: postId, author_id: u.id, author_name: (prof && prof.name) || "Reader", body: body } });
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
    var tk = await TSB_AUTH.token();
    var path = u.id + "/" + Date.now() + "-" + (file.name || "f").replace(/[^\w.-]+/g, "_");
    var res = await fetch(URL + "/storage/v1/object/" + bucket + "/" + path, {
      method: "POST",
      headers: { apikey: ANON, Authorization: "Bearer " + tk, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: file
    });
    if (!res.ok) throw new Error("upload " + res.status);
    return URL + "/storage/v1/object/public/" + bucket + "/" + path;
  }

  /* ---------- rich-text safety: whitelist tags, drop attributes ---------- */
  var OK_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, H2: 1, H3: 1, P: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, BR: 1, DIV: 1 };
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
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 604800) return Math.floor(s / 86400) + "d ago";
    return new Date(iso).toLocaleDateString();
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

  window.TSB_COMMUNITY = {
    enabled: ENABLED, api: api, me: me, signedIn: signedIn,
    ensureProfile: ensureProfile, getProfile: getProfile,
    listPosts: listPosts, getPost: getPost, publish: publish, deletePost: deletePost,
    likeInfo: likeInfo, setLike: setLike, likesOnMyPosts: likesOnMyPosts,
    listComments: listComments, addComment: addComment,
    followInfo: followInfo, setFollow: setFollow, followingIds: followingIds, followerRows: followerRows,
    upload: upload, sanitize: sanitize, ago: ago, readMins: readMins, esc: esc, playAudio: playAudio
  };
})();
