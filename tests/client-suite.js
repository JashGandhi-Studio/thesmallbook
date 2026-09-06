// FULL CLIENT SUITE: every user action against a simulated Supabase
const fs = require("fs");
let PASS = 0, FAIL = 0;
function ok(name, cond, extra) { if (cond) { PASS++; console.log("  ✓", name); } else { FAIL++; console.log("  ✗ FAIL:", name, extra || ""); } }

const DB = { posts: [], comments: [], likes: [], follows: [], profiles: [], messages: [] };
let storage = [];
let failNext = null;
globalThis.window = { addEventListener: () => {} };
const store = { tsb_auth_session: JSON.stringify({ access_token: "jwt-1", refresh_token: "r", expires_at: 9999999999999, user: { id: "user-1", user_metadata: { full_name: "Jash G", picture: "https://lh3.googlephoto.jpg" } } }) };
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };
globalThis.TSB_AUTH = { token: async () => "jwt-1", displayName: () => "Jash G", user: () => JSON.parse(store.tsb_auth_session).user };
globalThis.window.TSB_AUTH = globalThis.TSB_AUTH;
globalThis.alert = () => {};

function jsonRes(obj, status) { return { ok: status < 400, status: status || 200, text: async () => JSON.stringify(obj), json: async () => obj }; }
globalThis.fetch = async (url, o) => {
  if (failNext) { const f = failNext; failNext = null; return jsonRes(JSON.parse(f.body), f.status); }
  const u = String(url); const m = (o && o.method) || "GET";
  const body = (o && typeof o.body === "string") ? JSON.parse(o.body) : null;
  const auth = o.headers.Authorization;
  globalThis.lastHeaders = (o && o.headers) || {};
  if (u.includes("/storage/v1/object/")) {
    if (auth !== "Bearer jwt-1") return jsonRes({ message: "new row violates row-level security" }, 403);
    const path = u.split("/object/")[1]; storage.push(path); return jsonRes({ Key: path }, 200);
  }
  const table = u.split("/rest/v1/")[1].split("?")[0];
  const q = u.split("?")[1] || "";
  if (m === "GET") {
    let rows = DB[table] || [];
    if (/(^|&)id=eq\./.test(q)) { const v = q.match(/(?:^|&)id=eq\.([^&]+)/)[1]; rows = rows.filter(r => r.id === v); }
    if (/(^|&)id=in\./.test(q)) { const v = q.match(/(?:^|&)id=in\.\(([^)]+)\)/)[1].split(","); rows = rows.filter(r => v.includes(r.id)); }
    if (q.includes("post_id=eq.")) { const v = q.match(/post_id=eq\.([^&]+)/)[1]; rows = rows.filter(r => r.post_id === v); }
    if (q.includes("post_id=in.")) { const v = q.match(/post_id=in\.\(([^)]+)\)/)[1].split(","); rows = rows.filter(r => v.includes(r.post_id)); }
    if (q.includes("author_id=eq.")) { const v = q.match(/author_id=eq\.([^&]+)/)[1]; rows = rows.filter(r => (r.author_id === v || r.receiver_id === v)); }
    if (q.includes("is_public=eq.true")) rows = rows.filter(r => r.is_public !== false);
    if (q.includes("or=(sender_id.eq.")) { rows = rows.filter(r => r.sender_id === "user-1" || r.receiver_id === "user-1"); }
    if (q.includes("receiver_id=eq.")) { const v = q.match(/receiver_id=eq\.([^&]+)/)[1]; rows = rows.filter(r => r.receiver_id === v); }
    if (q.includes("follower_id=eq.")) { const v = q.match(/follower_id=eq\.([^&]+)/)[1]; rows = rows.filter(r => r.follower_id === v); }
    if (q.includes("order=created_at.desc")) rows = [...rows].reverse();
    return jsonRes(rows, 200);
  }
  if (m === "POST") {
    if (auth !== "Bearer jwt-1") return jsonRes({ message: "new row violates row-level security" }, 403);
    const row = Object.assign({ id: String(DB[table].length + 1).padStart(8, "0") + "-aaaa-4000-8000-" + table.padEnd(12, "0").slice(0, 12), created_at: new Date().toISOString() }, body);
    if (table === "profiles" && q.includes("on_conflict=id")) {
      const i = DB.profiles.findIndex(p => p.id === body.id);
      if (i >= 0) DB.profiles[i] = Object.assign(DB.profiles[i], body); else DB.profiles.push(row);
      return jsonRes([DB.profiles.find(p => p.id === body.id)], 200);
    }
    DB[table].push(row); return jsonRes([row], 200);
  }
  if (m === "PATCH") {
    if (auth !== "Bearer jwt-1") return jsonRes({ message: "violates RLS" }, 403);
    const v = q.match(/id=eq\.([^&]+)/)[1]; const t = DB[table].find(r => r.id === v);
    if (t) Object.assign(t, body); return jsonRes(t ? [t] : [], 200);
  }
  if (m === "DELETE") {
    DB[table] = DB[table].filter(r => {
      let hit = true;
      if (/(?:^&)id=eq\./.test("&" + q)) hit = hit && r.id === q.match(/(?:^|&)id=eq\.([^&]+)/)[1];
      if (q.includes("post_id=eq.")) hit = hit && r.post_id === q.match(/post_id=eq\.([^&]+)/)[1];
      if (q.includes("user_id=eq.")) hit = hit && r.user_id === q.match(/user_id=eq\.([^&]+)/)[1];
      if (q.includes("follower_id=eq.")) hit = hit && r.follower_id === q.match(/follower_id=eq\.([^&]+)/)[1];
      if (q.includes("author_id=eq.")) hit = hit && r.author_id === q.match(/author_id=eq\.([^&]+)/)[1];
      return !hit; // delete the row that matches the query
    });
    return jsonRes([], 200);
  }
  return jsonRes([], 200);
};
eval(fs.readFileSync("js/config.js", "utf8"));
eval(fs.readFileSync("js/community.js", "utf8"));
const C = window.TSB_COMMUNITY;

(async () => {
  console.log("== session & identity ==");
  ok("enabled", C.enabled === true);
  ok("signedIn", C.signedIn() === true);
  ok("me()", C.me().id === "user-1");

  console.log("== publish flow ==");
  const post = await C.publish({ title: "My First Story", subtitle: "hook", body: "<p>Hello <b>world</b></p>", tags: ["habits"], kind: "text" });
  ok("publish returns row", post && post.title === "My First Story");
  ok("profile auto-created", DB.profiles.length === 1 && DB.profiles[0].id === "user-1");
  ok("google photo backfilled", DB.profiles[0].avatar_url === "https://lh3.googlephoto.jpg", String(DB.profiles[0].avatar_url));
  ok("google name used", DB.profiles[0].name === "Jash G");

  console.log("== uploads (cover / audio / avatar) ==");
  globalThis.File = class { constructor(parts, name, o) { this.name = name; this.type = (o && o.type) || "image/png"; this.size = 10; } };
  globalThis.Blob = class { constructor(p, o) { this.type = o && o.type; } };
  const coverUrl = await C.upload(new File([], "cover.png", { type: "image/png" }), "tsb-covers");
  ok("cover upload → public URL", coverUrl.includes("/object/public/tsb-covers/user-1/"));
  const audUrl = await C.upload(new File([], "v.m4a", { type: "audio/mp4" }), "tsb-audio");
  ok("audio upload", audUrl.includes("tsb-audio"));
  const avaUrl = await C.upload(new File([], "me.jpg", { type: "image/jpeg" }), "tsb-avatars");
  ok("avatar upload", avaUrl.includes("tsb-avatars"));
  ok("3 objects stored", storage.length === 3);

  console.log("== upload with dead token → clear error ==");
  globalThis.TSB_AUTH.token = async () => ""; store.tsb_auth_session = JSON.stringify({ user: { id: "user-1" } });
  let upErr = ""; try { await C.upload(new File([], "x.png"), "tsb-covers"); } catch (e) { upErr = e.message; }
  ok("expired-session message", /session expired/i.test(upErr), upErr);
  globalThis.TSB_AUTH.token = async () => "jwt-1";
  store.tsb_auth_session = JSON.stringify({ access_token: "jwt-1", user: { id: "user-1", user_metadata: {} } });

  console.log("== likes ==");
  await C.setLike(post.id, true);
  let info = await C.likeInfo(post.id);
  ok("like → count 1, mine", info.count === 1 && info.mine === true);
  await C.setLike(post.id, false);
  info = await C.likeInfo(post.id);
  ok("unlike → 0", info.count === 0 && info.mine === false);

  console.log("== comments ==");
  const cmt = await C.addComment(post.id, "Great story!");
  ok("comment posted", cmt && cmt.body === "Great story!");
  ok("comment listed", (await C.listComments(post.id)).length === 1);

  console.log("== follows ==");
  await C.setFollow("author-9", true);
  ok("follow → mine", (await C.followInfo("author-9")).mine === true);
  ok("followingIds", (await C.followingIds()).includes("author-9"));
  await C.setFollow("author-9", false);
  ok("unfollow", (await C.followInfo("author-9")).mine === false);

  console.log("== public profile switch ==");
  await C.setProfilePublic(false);
  ok("is_public=false stored", DB.profiles[0].is_public === false);
  ok("hidden from People when private", (await C.listProfiles(10)).length === 0);
  await C.setProfilePublic(true);
  const pl = await C.listProfiles(10);
  ok("visible again when public", pl.length === 1 && pl[0].name === "Jash G");

  console.log("== DMs ==");
  DB.messages.push({ id: "m1", sender_id: "fan-2", receiver_id: "user-1", body: "loved it", created_at: "2026-09-06T10:00:00Z" });
  const sent = await C.sendDM("fan-2", "thanks!");
  ok("DM sent", sent && sent.body === "thanks!");
  const msgs = await C.myMessages(50);
  ok("myMessages sees both", msgs.length === 2);
  const convs = C.conversations(msgs, "user-1");
  ok("1 conversation, latest first", convs.length === 1 && convs[0].last.body === "thanks!");
  ok("thread has 2", (await C.threadWith("fan-2")).length === 2);

  console.log("== DM superpowers (v199) ==");
  const bookMsg = await C.sendDM("fan-2", "📕 You should read Atomic Habits", "atomic-habits");
  ok("book recommendation sent", bookMsg && bookMsg.book_id === "atomic-habits");
  const mid = (await C.threadWith("fan-2")).find(m => m.body === "thanks!").id;
  await C.editDM(mid, "thanks a lot!");
  let th2 = await C.threadWith("fan-2");
  ok("edit applied + marked", th2.find(m => m.id === mid).body === "thanks a lot!" && th2.find(m => m.id === mid).edited_at);
  await C.hideDM(mid);
  let rowHidden = DB.messages.find(m => m.id === mid);
  ok("hidden_for contains me", rowHidden.hidden_for && rowHidden.hidden_for.includes("user-1"));
  let th3 = await C.threadWith("fan-2");
  ok("hidden msg gone from my thread", !th3.some(m => m.id === mid));
  ok("...but still in DB for the other person", DB.messages.some(m => m.id === mid));
  await C.clearThread("fan-2");
  ok("clear chat empties my thread", (await C.threadWith("fan-2")).length === 0);
  await C.deleteDM(bookMsg.id);
  ok("delete for everyone removes row", !DB.messages.some(m => m.id === bookMsg.id));

  console.log("== notifications ==");
  DB.comments.push({ id: "cc2", post_id: post.id, author_id: "fan-2", body: "inspiring!", created_at: "2026-09-06T09:30:00Z" });
  DB.likes.push({ id: "l2", post_id: post.id, user_id: "fan-2", created_at: "2026-09-06T09:00:00Z" });
  DB.follows.push({ id: "f2", follower_id: "fan-2", author_id: "user-1", created_at: "2026-09-06T08:00:00Z" });
  DB.profiles.push({ id: "fan-2", name: "Fan Person", avatar_url: "", is_public: true });
  const notifs = await C.notifications();
  const types = notifs.map(n => n.type).sort().join(",");
  ok("dm+like+follow+comment merged", types === "comment,dm,follow,like", types);
  ok("names resolved", notifs.every(n => !!n.name));
  ok("sorted newest first", Date.parse(notifs[0].at) >= Date.parse(notifs[notifs.length - 1].at));

  console.log("== short links & official avatar ==");
  const hit = await C.getPostByShort(post.id.slice(0, 8));
  ok("getPostByShort finds post", hit && hit.id === post.id);
  ok("official avatar", C.avaUrl("TheSmallBook", "", C.OFFICIAL_ID).startsWith("data:image/svg"));
  ok("avatar passthrough", C.avaUrl("x", "https://p.jpg", "y") === "https://p.jpg");

  console.log("== 401 auto-retry ==");
  failNext = { status: 401, body: "{\"message\":\"JWT expired\"}" };
  let retried = false;
  globalThis.TSB_AUTH.token = async () => { retried = true; return "jwt-1"; };
  const rows = await C.listPosts({});
  ok("retried after 401 and succeeded", retried && Array.isArray(rows));

  console.log("== progress sync ==");
  store.tsb_progress = JSON.stringify({ "deep-work": { d: 1 }, "sapiens": { d: 2 } });
  await C.syncProgress(true);
  ok("progress pushed to profile", DB.profiles[0].progress === 2, JSON.stringify(DB.profiles[0].progress));

  console.log("== v201 video bursts ==");
  ok("isVideoUrl detects mp4/webm/mov + query strings", C.isVideoUrl("https://x/a.mp4") && C.isVideoUrl("https://x/a.WEBM") && C.isVideoUrl("https://x/a.mov?t=1"));
  ok("isVideoUrl ignores images and empties", !C.isVideoUrl("https://x/cover.jpg") && !C.isVideoUrl("") && !C.isVideoUrl(null));
  ok("MAX_BURST_SEC is 120 (2 minutes)", C.MAX_BURST_SEC === 120);
  let burstThrew = false;
  try { await C.checkBurst({ size: 60 * 1024 * 1024, name: "x.mp4", type: "video/mp4" }); }
  catch (e) { burstThrew = /48 MB/.test(e.message); }
  ok("checkBurst rejects files over 48 MB", burstThrew);
  let durThrew = false;
  try { await C.checkBurst({ size: 1024, name: "x.mp4", type: "video/mp4" }); }
  catch (e) { durThrew = /Could not read/.test(e.message); }
  ok("checkBurst fails safely when duration unreadable", durThrew);
  const burstPost = await C.publish({ title: "My burst", subtitle: "", body: "<p>watch</p>", cover_url: "https://x/b.mp4", audio_url: "", kind: "text", tags: [] });
  ok("publish stores video cover_url on existing column", burstPost && burstPost.cover_url === "https://x/b.mp4");

  console.log("== v202 infinite bursts pagination ==");
  await C.listPosts({ limit: 12, offset: 24 });
  ok("listPosts paginates via Range header", globalThis.lastHeaders.Range === "24-35", String(globalThis.lastHeaders.Range));
  await C.listPosts({ limit: 12 });
  ok("listPosts without offset sends no Range header", !globalThis.lastHeaders.Range);

  console.log();
  console.log("RESULT: " + PASS + " passed, " + FAIL + " failed");
  process.exit(FAIL ? 1 : 0);
})();
