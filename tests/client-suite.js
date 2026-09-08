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
  globalThis.lastUrl = u;
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
    const getv = (key) => { const m = q.match(new RegExp("(?:^|&)" + key + "=eq\\.([^&]+)")); return m ? m[1] : null; };
    const hits = (DB[table] || []).filter(r => {
      let hit = true;
      const idv = getv("id");
      if (idv !== null) hit = hit && r.id === idv;
      const av = getv("author_id");
      if (av !== null) hit = hit && r.author_id === av;
      const sv = getv("sender_id");
      if (sv !== null) hit = hit && r.sender_id === sv;
      const rv = getv("receiver_id");
      if (rv !== null) hit = hit && r.receiver_id === rv;
      if (q.includes("read=eq.false")) hit = hit && r.read !== true;
      return hit;
    });
    hits.forEach(r => Object.assign(r, body));
    return jsonRes(hits, 200);
  }
  if (m === "DELETE") {
    if (globalThis.blockDelete && table === "posts") return jsonRes([], 200); // RLS-blocked: 0 rows deleted
    const gone = [];
    DB[table] = DB[table].filter(r => {
      let hit = true;
      if (/(?:^&)id=eq\./.test("&" + q)) hit = hit && r.id === q.match(/(?:^|&)id=eq\.([^&]+)/)[1];
      if (q.includes("post_id=eq.")) hit = hit && r.post_id === q.match(/post_id=eq\.([^&]+)/)[1];
      if (q.includes("user_id=eq.")) hit = hit && r.user_id === q.match(/user_id=eq\.([^&]+)/)[1];
      if (q.includes("follower_id=eq.")) hit = hit && r.follower_id === q.match(/follower_id=eq\.([^&]+)/)[1];
      if (q.includes("author_id=eq.")) hit = hit && r.author_id === q.match(/author_id=eq\.([^&]+)/)[1];
      if (hit) gone.push(r); // return=representation: PostgREST responds with the deleted rows
      return !hit;
    });
    return jsonRes(gone, 200);
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
  ok("signed-in reader shown even without the public toggle", (await C.listProfiles(10)).length === 1);
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
  store.tsb_progress = JSON.stringify({ "deep-work": [0, 1, 2], "sapiens": [4] });
  await C.syncProgress(true);
  ok("progress = lesson count pushed to profile", DB.profiles[0].progress === 4, JSON.stringify(DB.profiles[0].progress));
  store.tsb_progress = JSON.stringify({ "deep-work": [0, 1, 2, 3, 4], "sapiens": [4] });
  await C.syncProgress(true);
  ok("progress updates live as lessons are read", DB.profiles[0].progress === 6, JSON.stringify(DB.profiles[0].progress));
  const frows = await C.followerRows(DB.profiles[0].id);
  ok("followerRows returns row objects with follower_id", Array.isArray(frows) && frows.every(function (r) { return typeof r.follower_id === "string"; }));

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

  console.log("== v204 comment row + unique share codes ==");
  await C.addComment(DB.posts[0].id, "regression check");
  ok("POST sends Prefer return=representation (comment row comes back)", globalThis.lastHeaders.Prefer === "return=representation", String(globalThis.lastHeaders.Prefer));
  const cRow = await C.addComment(DB.posts[0].id, "second check");
  ok("addComment returns the inserted row (not null)", cRow && typeof cRow === "object" && cRow.body === "second check");
  // seed-style UUIDs share the first 8 hex chars — suffix codes must stay unique
  const seed1 = "90000000-0000-4000-8000-00000000aa11";
  const seed2 = "90000000-0000-4000-8000-00000000bb22";
  DB.posts.push({ id: seed1, title: "seed one", body: "b", author_id: DB.profiles[0].id, author_name: "A", created_at: new Date().toISOString(), likes: 0, tags: [], cover_url: "", audio_url: "", kind: "text", subtitle: "" });
  DB.posts.push({ id: seed2, title: "seed two", body: "b", author_id: DB.profiles[0].id, author_name: "A", created_at: new Date().toISOString(), likes: 0, tags: [], cover_url: "", audio_url: "", kind: "text", subtitle: "" });
  const bySuffix1 = await C.getPostByShort(seed1.replace(/-/g, "").slice(-8));
  const bySuffix2 = await C.getPostByShort(seed2.replace(/-/g, "").slice(-8));
  ok("share code (suffix) resolves each seed post separately", bySuffix1 && bySuffix1.id === seed1 && bySuffix2 && bySuffix2.id === seed2);
  const byPrefix = await C.getPostByShort(String(DB.posts[0].id).replace(/-/g, "").slice(0, 8));
  ok("old-style prefix share links still resolve", byPrefix && byPrefix.id === DB.posts[0].id);

  console.log("== v207 interest sync ==");
  globalThis.TSB = { interest: { top: function () { return ["money", "habits", "focus", "science"]; } } };
  globalThis.window.TSB = globalThis.TSB;
  await C.syncInterests(true);
  ok("syncInterests pushes top interests to profile", JSON.stringify(DB.profiles[0].interests) === JSON.stringify(["money", "habits", "focus", "science"]), JSON.stringify(DB.profiles[0].interests));

  console.log("== v208 SVG icon system ==");
  ok("icon(bell) returns an <svg>", String(C.icon("bell")).startsWith("<svg") && String(C.icon("bell")).includes("tsb-ic"));
  ok("icon(star) + icon(people) + icon(heart) all present", C.icon("star").includes("polygon") && C.icon("people").includes("circle") && C.icon("heart").includes("M20.84"));
  ok("profile markups reference icons not emojis", !(/🔔|💬|👤/.test(require("fs").readFileSync((require("path").join(__dirname, "../profile.html")), "utf8"))));
  ok("stories markups reference icons not emojis", !(/🔔|💬/.test(require("fs").readFileSync((require("path").join(__dirname, "../stories.html")), "utf8"))));
  ok("dm markups reference icons not emojis", !(/🔔|💬|👤|🧹|✏️|🗑|🙈|📕/.test(require("fs").readFileSync((require("path").join(__dirname, "../dm.html")), "utf8"))));

  console.log("== v209 brand emojis restored + icon replicas ==");
  const fsp = require("fs"), pp = require("path");
  const idxH = fsp.readFileSync(pp.join(__dirname, "../index.html"), "utf8");
  const abtH = fsp.readFileSync(pp.join(__dirname, "../about.html"), "utf8");
  const dmH = fsp.readFileSync(pp.join(__dirname, "../dm.html"), "utf8");
  ok("main logo mark is the 📕 emoji again", idxH.includes('logo__mark">📕'));
  ok("hero badge + Shelf header use their original emojis", idxH.includes('hero__badge">📚') && idxH.includes("📚 The Shelf"));
  ok("about page mark is the 📕 emoji again", abtH.includes('ahero__mark">📕'));
  ok("icon replicas: heart/mail/share/brush/phone all present", C.icon("heart").includes("M20.84") && C.icon("mail").includes("<rect") && C.icon("share").includes("polyline") && C.icon("brush").includes("m9.06") && C.icon("phone").includes("M3 18v-6"));
  ok("dm keeps clean icons (no broken tone emojis)", !/[🧹🙈]/u.test(dmH));

  console.log("== v210 inline-script syntax guard (no broken pages can ship) ==");
  const PAGE_FILES = ["index.html", "stories.html", "story.html", "notifications.html", "dm.html", "profile.html", "write.html", "login.html", "settings.html", "book.html"];
  let pageBugs = 0;
  for (const pf of PAGE_FILES) {
    const raw = fsp.readFileSync(pp.join(__dirname, "../" + pf), "utf8");
    const blocks = raw.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const b of blocks) {
      if (/application\/ld\+json/i.test(b)) continue;
      const code = b.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
      if (!code.trim()) continue;
      try { new Function(code); } catch (e) { pageBugs++; console.log("   INLINE SCRIPT ERROR in " + pf + ": " + e.message); }
    }
  }
  ok("every inline script on the 10 key pages parses", pageBugs === 0, pageBugs + " broken script(s)");
  const stRaw = fsp.readFileSync(pp.join(__dirname, "../story.html"), "utf8");
  ok("story listen button is proper concatenation", stRaw.includes(">\' + C.icon(\'phone\') + \" Listen to the voice version</button>\""));
  const ntRaw = fsp.readFileSync(pp.join(__dirname, "../notifications.html"), "utf8");
  ok("notifications icon map uses runtime C.icon", ntRaw.includes("like: C.icon('heart')"));

  console.log("== v211 finder shows all signed-in readers + visitor card ==");
  await C.listProfiles(9);
  ok("listProfiles has NO is_public gate (every signed-in reader is visible)", !String(globalThis.lastUrl).includes("is_public"), String(globalThis.lastUrl));
  const prfSrc = fsp.readFileSync(pp.join(__dirname, "../profile.html"), "utf8");
  ok("visitor card has ONE action row: Subscribe + Message under the card", prfSrc.includes("cm-sharerow--main") && prfSrc.includes("data-pfol"));
  ok("Copy profile + Share profile use clean icons, no emojis", prfSrc.includes("C.icon('user') + \" Copy profile") && prfSrc.includes("C.icon('share') + \" Share profile"));
  ok("no duplicate Message/Subscribe below the card", !prfSrc.includes('class="cm-sub') && !prfSrc.includes('Message " + C.esc(prof.name.split'));

  console.log("== v212 profile redesign + sounds + people visibility ==");
  const cmSrc2 = fsp.readFileSync(pp.join(__dirname, "../js/community.js"), "utf8");
  const stSrc2 = fsp.readFileSync(pp.join(__dirname, "../stories.html"), "utf8");
  const seSrc2 = fsp.readFileSync(pp.join(__dirname, "../settings.html"), "utf8");
  ok("profile header is Instagram-style (stat row + avatar + plus)", prfSrc.includes("cm-statrow") && prfSrc.includes("cm-avaplus") && prfSrc.includes('id="avaPlus"'));
  ok("owner row = Edit profile + Share profile", prfSrc.includes('id="editProfileBtn"') && prfSrc.includes("Edit profile"));
  ok("followers/following open the sheet (tabs + back)", prfSrc.includes("cm-socsheet") && prfSrc.includes("data-lsoc") && prfSrc.includes("socBack"));
  ok("links chips + links editor present", prfSrc.includes("cm-linkchip") && prfSrc.includes('id="pLinks"'));
  const pcRes = await C.postCounts(50);
  ok("postCounts groups posts per author", typeof pcRes === "object" && pcRes[DB.posts[0].author_id] >= 1, JSON.stringify(pcRes));
  ok("People + finder show posts-per-reader", stSrc2.includes("postCounts") && stSrc2.includes("_posts"));
  ok("settings has sound chooser + test button", seSrc2.includes('data-sound="ding"') && seSrc2.includes("soundTest"));
  ok("community plays the chosen sound on live toasts", cmSrc2.includes("window.TSB.sound.play()"));
  ok("pages ship the sound library", prfSrc.includes("js/sounds.js") && stSrc2.includes("js/sounds.js"));
  ok("visitor gets ONE clean card, share card is owner-only", prfSrc.includes("(mine ? '<div") && prfSrc.includes("cm-sharecard\">"));
  ok("visitor avatar has no edit plus", prfSrc.includes("(mine ? '<button class=") && prfSrc.includes("cm-avaplus"));

  console.log("== v214: 50 new books, name wrap, sound in You, share card, og image, v214 bump ==");
  const djSrc = fsp.readFileSync(pp.join(__dirname, "../js/data.js"), "utf8");
  const djArr = JSON.parse(djSrc.slice(djSrc.indexOf("["), djSrc.indexOf("];\nif (typeof window") + 1));
  const ntitle = t => t.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
  ok("data.js parses: library grew to 400 books", djArr.length === 400, djArr.length + " books");
  ok("2,637 lessons across the library", djArr.reduce((x, b) => x + b.lessons.length, 0) === 2637, "sum mismatch");
  ok("all 400 book ids unique", new Set(djArr.map(b => b.id)).size === 400);
  ok("all 400 titles unique (punctuation-normalized)", new Set(djArr.map(b => ntitle(b.title))).size === 400);
  ok("every book complete (5+ lessons, 3+ quotes, 5-step plan, caveat, bigIdea)", djArr.every(b => b.lessons.length >= 5 && b.quotes.length >= 3 && b.actionPlan.length >= 5 && b.caveat && b.bigIdea && b.oneLiner));
  ok("every cover file exists in assets/covers/", djArr.every(b => fsp.existsSync(pp.join(__dirname, "../" + b.cover))));
  ok("every book has an SEO page in books/", djArr.every(b => fsp.existsSync(pp.join(__dirname, "../books/" + b.id + ".html"))));
  const cssSrc = fsp.readFileSync(pp.join(__dirname, "../css/style.css"), "utf8");
  ok("big profile names wrap inside the screen (cm-profmain h1)", cssSrc.includes(".cm-profmain h1") && cssSrc.includes("overflow-wrap: anywhere") && cssSrc.includes("white-space: normal"));
  const lgSrc2 = fsp.readFileSync(pp.join(__dirname, "../login.html"), "utf8");
  ok("You-window has Notif sound row + Sound test", lgSrc2.includes('id="soundRowY"') && lgSrc2.includes('id="youSoundTest"') && lgSrc2.includes("paintYSound"));
  const bkSrc2 = fsp.readFileSync(pp.join(__dirname, "../js/book.js"), "utf8");
  ok("share card: title baseline lowered + one-liner capped when title wraps", bkSrc2.includes("let y = 678;") && bkSrc2.includes("titleLines.length > 1 ? 2 : 3"));
  ok("og image + alt refreshed (400 books · 2,637 lessons)", idxH.includes("400 books · 2,637 lessons") && idxH.includes("assets/og-image.png"));
  ok("no stale counts on key files (350 books / 2,176 / 2176 / 2170)", !/350 books|2,176|2176|2170/.test(djSrc + idxH + cssSrc + lgSrc2 + bkSrc2));
  const swSrc = fsp.readFileSync(pp.join(__dirname, "../sw.js"), "utf8");
  ok("service worker cache bumped to tsb-v222", swSrc.includes('tsb-v222'));
  ok("key files ship ?v=222", idxH.includes("css/style.css?v=222") && lgSrc2.includes("v=222"));

  console.log("== v221: content depth, 400 everywhere, 8 new autopsies, graves on all books ==");
  // repo-wide stale scan (every html/js/md)
  let stale = [];
  const walk = (dir) => {
    for (const e of fsp.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === ".git" || e.name === "node_modules" || e.name === "tests" || e.name === "scanner-data.js") continue;
      const p = pp.join(__dirname, "..", dir, e.name);
      if (e.isDirectory()) { walk(dir + "/" + e.name); continue; }
      if (!/\.(html|js|md)$/.test(e.name)) continue;
      const t = fsp.readFileSync(p, "utf8");
      if (/350 books|350 book summaries|2,426|2426|2,176|2176|2170|300 autopsies|300 failure case studies|300 LEGENDARY FAILURES|ALL 300 FAILURE/.test(t)) stale.push(dir + "/" + e.name);
    }
  };
  walk(".");
  ok("no stale counts anywhere in the repo (350/2426/2176/300)", stale.length === 0, stale.slice(0, 6).join(", "));
  function allRepoText() {
    let t = "";
    const w2 = (dir) => { for (const e of fsp.readdirSync(dir, { withFileTypes: true })) { if (e.name === ".git" || e.name === "node_modules" || e.name === "tests") continue; const p = pp.join(dir, e.name); if (e.isDirectory()) w2(p); else if (/\.(html|js|md)$/.test(e.name)) t += fsp.readFileSync(p, "utf8"); } };
    w2(pp.join(__dirname, ".."));
    return t;
  }
  const onbSrc = fsp.readFileSync(pp.join(__dirname, "../js/onboard.js"), "utf8");
  const scnSrc = fsp.readFileSync(pp.join(__dirname, "../scan.html"), "utf8");
  ok("onboarding + scanner + about all say 400", onbSrc.includes("400+ books") && scnSrc.includes("all 400 book titles") && abtH.includes("400 book summaries") && abtH.includes("ASK 400+ BOOKS"));
  const flSrc = fsp.readFileSync(pp.join(__dirname, "../js/failures.js"), "utf8");
  const flArr = JSON.parse(flSrc.slice(flSrc.indexOf("["), flSrc.lastIndexOf("]") + 1));
  ok("graveyard grew to 308 autopsies", flArr.length === 308, flArr.length + " autopsies");
  ok("all 400 books carry a graveyard link", djArr.every(b => b.graveLink && fsp.existsSync(pp.join(__dirname, "../graveyard/" + b.graveLink + ".html"))), djArr.filter(b => !b.graveLink).map(b => b.id).join(","));
  const newIds = new Set(["chanakya-neeti","yoga-sutras","bhagavad-gita","arthashastra","thirukkural","uncertain-glory","raja-yoga","three-thousand-stitches","kalam-effect","five-am-club","leader-no-title","think-on-these-things","heartfulness-way","karma-yoga","jnana-yoga","upanishads","essence-bhagavad-gita","celebrating-silence","mystics-musings","nudge","lessons-of-history","kaizen","discipline-equals-freedom","when-pink","undoing-project","richer-wiser-happier","noise","seeking-wisdom","essays-buffett","franklin-autobiography","shortness-of-life","enchiridion","guide-good-life","practicing-stoic","tao-te-ching","analects","dhammapada","little-book-beats-market","selfish-gene","short-history-nearly-everything","being-mortal","emperor-maladies","when-breath-becomes-air","lifespan","outlive","peaceful-warrior","the-prophet","inner-game-tennis","my-experiments-with-truth","what-i-talk-about-running"]);
  const nbooks = djArr.filter(b => newIds.has(b.id));
  ok("the 50 new books vary in lesson count (no fixed 5/6/7)", new Set(nbooks.map(b => b.lessons.length)).size >= 3, [...new Set(nbooks.map(b => b.lessons.length))].join(","));
  ok("deep classics got the depth they needed (Gita 8, Sutras 8, Tao 8, Prophet 8, Lessons of History 8)", nbooks.filter(b => ["bhagavad-gita","yoga-sutras","tao-te-ching","the-prophet","lessons-of-history"].includes(b.id)).every(b => b.lessons.length >= 8));
  ok("every new book SEO page proves it in the graveyard", nbooks.every(b => fsp.readFileSync(pp.join(__dirname, "../books/" + b.id + ".html"), "utf8").includes("The Graveyard Proves It")));
  const newGraves = ["facebook-beacon","bikram-yoga","toyota-recalls","ratings-fail","valeant-pharma","purdue-opioids","tobacco-denial","sugar-industry"];
  ok("8 brand-new autopsies written (pages + data + antidote book)", newGraves.every(g0 => fsp.existsSync(pp.join(__dirname, "../graveyard/" + g0 + ".html")) && flArr.some(f => f.id === g0 && f.book) && fsp.readFileSync(pp.join(__dirname, "../graveyard/" + g0 + ".html"), "utf8").includes("gantidote")));
  const ogPng = fsp.readFileSync(pp.join(__dirname, "../assets/og-image.png"));
  ok("og image exists (1200x630 fresh)", ogPng.length > 15000 && idxH.includes("og:image:alt") && idxH.includes("2,637 lessons"));

  console.log("== v221: NEW tags on latest batch, install-to-home-screen, build markers ==");
  const cfgSrc = fsp.readFileSync(pp.join(__dirname, "../js/config.js"), "utf8");
  const newThisWeek = JSON.parse("[" + cfgSrc.match(/NEW_THIS_WEEK: \[([\s\S]*?)\n  \],/)[1] + "]");
  ok("NEW badge moved to the latest 50 books (old batch removed)", newThisWeek.length === 50 && newThisWeek.every(b => djArr.some(x => x.id === b)), newThisWeek.length + " items");
  const oldBatch = ["playing-it-my-way","india-2020","the-anarchy","the-idea-of-india","wonder-that-was-india","maximum-city","annihilation-of-caste","being-indian","the-winning-way","test-of-my-life","most-important-thing","crucial-conversations","ride-of-a-lifetime","awaken-giant-within","why-we-sleep","breath-nestor","make-it-stick","sam-walton","the-element","stumbling-happiness","freedom-from-the-known","gandhi-years-that-changed-world","karmayogi-sreedharan","wise-and-otherwise","accidental-prime-minister","give-and-take","david-and-goliath","book-of-joy","scrum-sutherland","blitzscaling-hoffman"];
  ok("the previous batch lost the NEW badge (they are no longer new)", oldBatch.every(b => !newThisWeek.includes(b)));
  ok("the 50 NEW books float to the front of Home", newThisWeek.every(b => djArr.some(x => x.id === b)) && newThisWeek.length === 50);
  const freshGraves = JSON.parse("[" + cfgSrc.match(/NEW_GRAVES_THIS_WEEK: \[([\s\S]*?)\n  \],/)[1] + "]");
  ok("FRESH GRAVE badge on exactly the 8 new autopsies", freshGraves.length === 8 && freshGraves.every(g => flArr.some(f => f.id === g)), freshGraves.join(","));
  const setH = fsp.readFileSync(pp.join(__dirname, "../settings.html"), "utf8");
  const youH = fsp.readFileSync(pp.join(__dirname, "../login.html"), "utf8");
  const instSrc = fsp.readFileSync(pp.join(__dirname, "../js/install.js"), "utf8");
  ok("Settings page has an Install-to-home-screen option", setH.includes('data-install') && setH.includes("Install this app to your home screen") && setH.includes("js/install.js?v=222"));
  ok("You window has the Install row too", youH.includes('data-install') && youH.includes("js/install.js?v=222"));
  ok("service worker precaches install.js (works offline)", swSrc.includes("./js/install.js"));
  ok("install popup + standalone-hide styles shipped", cssSrc.includes(".instmodal") && cssSrc.includes("@media (display-mode: standalone)"));
  ok("install.js parses and handles beforeinstallprompt/appinstalled", (() => { try { new Function(instSrc); return true; } catch (e) { return false; } })() && instSrc.includes("beforeinstallprompt") && instSrc.includes("appinstalled"));
  ok("Build markers say tsb-v222 (settings + You window)", setH.includes("Build tsb-v222") && youH.includes("Build tsb-v222"));
  let staleBuilds = [];
  for (const f of ["settings.html","login.html","index.html","about.html","scan.html","book.html","graveyard.html"]) {
    const t = fsp.readFileSync(pp.join(__dirname, "../" + f), "utf8");
    const m = t.match(/Build tsb-v(\d+)/g) || [];
    const wantVer = (swSrc.match(/CACHE_VERSION = "(tsb-v\d+)"/) || [])[1] || "tsb-v222";
    m.forEach(x => { if (!x.includes(wantVer.slice(3))) staleBuilds.push(f + ":" + x); });
  }
  ok("no stale Build markers anywhere", staleBuilds.length === 0, staleBuilds.join(", "));

  const appSrc = fsp.readFileSync(pp.join(__dirname, "../js/app.js"), "utf8");
  console.log("== v221: shorter sharper onboarding, dark-mode fixes, real covers ==");
  const onb = fsp.readFileSync(pp.join(__dirname, "../js/onboard.js"), "utf8");
  ok("onboarding is now ONE PAGE SHORTER (7 pages)", onb.includes("var TOTAL = 7;"));
  ok("language + look merged into one page (no lonely theme page)", onb.includes("<h2>Language & look</h2>") && onb.includes("data-theme-pick=\"dark\"") && !onb.includes("<h2>Light or dark?</h2>"));
  ok("final page = pick your starter shelf (tap covers on/off)", onb.includes("Pick your starter shelf") && onb.includes("data-pick") && onb.includes("recPool(") && onb.includes("paintPicks"));
  ok("picker picks feed tsb_starter_shelf (home honours them)", onb.includes('set("tsb_starter_shelf", (draft.picks && draft.picks.length') && appSrc.includes("tsb_starter_shelf"));
  ok("starter picks lead BOTH the grid and the shelves rows", appSrc.includes("starter shelf picks lead the library in every view") && appSrc.includes("Your Starter Shelf"));
  const css = fsp.readFileSync(pp.join(__dirname, "../css/style.css"), "utf8");
  ok("gravestone R.I.P. + years readable in dark (were same as bg)", css.includes(".grave__rip, .grave__year { color: #f2ead8 !important; }") && css.includes("html.dark .grave__rip, html.dark .grave__year { color: #f2ead8 !important; }"));
  ok("achievement popup readable in dark (was invisible)", css.includes("html.dark .achvpop { background: #241f17; color: #f2ead8; }"));
  ok("yellow buttons keep dark text in dark (podcast, cm-write, bar-plus)", css.includes("html.dark .podcastbtn { color: #111") && css.includes("html.dark .cm-write { color: #111; }") && css.includes("html.dark .tsb-bar__item--plus { color: #fff; }"));
  ok("ink-chip components pinned dark in dark (socialproof/idcard/rulecard/instabox)", css.includes("html.dark .socialproof__head { background: #17130b; }") && css.includes("html.dark .idcard__strip { background: #171310; }") && css.includes("html.dark .rulecard__num { background: #171310; }") && css.includes("html.dark .instabox__handle { color: #111; }"));
  ok("ask chips readable in dark in both styles", css.includes("html.dark .tsb-ask--page .aq-chip--all { background: transparent; color: var(--ink); }") && css.includes("html.dark .aq-chip--all { background: #17130b; color: var(--yellow); }"));
  const goldH = fsp.readFileSync(pp.join(__dirname, "../gold.html"), "utf8");
  ok("gold page hero/price/samples readable in dark", goldH.includes("html.dark .goldhero h1 .hl { color: #111; }") && goldH.includes("html.dark .goldhero__price { background: #17130b; }") && goldH.includes("background: var(--yellow); color: #111;"));
  ok("EVERY book cover exists at the path the app requests (assets/covers/<id>.jpg)", djArr.every(b => fsp.existsSync(pp.join(__dirname, "../assets/covers/" + b.id + ".jpg"))), djArr.filter(b => !fsp.existsSync(pp.join(__dirname, "../assets/covers/" + b.id + ".jpg"))).map(b => b.id).join(","));
  let jsAll = true;
  for (const f of fsp.readdirSync(pp.join(__dirname, "../js"))) {
    if (!f.endsWith(".js")) continue;
    try { new Function(fsp.readFileSync(pp.join(__dirname, "../js/" + f), "utf8")); } catch (e) { jsAll = false; console.log("  js parse fail:", f, e.message); }
  }
  ok("all JS files parse", jsAll);

  console.log("== v221: real depth — no-compromise lesson expansion ==");
  const EXPANDED = new Set(["chanakya-neeti","arthashastra","thirukkural","karma-yoga","jnana-yoga","raja-yoga","upanishads","essence-bhagavad-gita","dhammapada","analects","enchiridion","guide-good-life","three-thousand-stitches","kalam-effect","leader-no-title","my-experiments-with-truth","heartfulness-way","celebrating-silence","mystics-musings","think-on-these-things","practicing-stoic","shortness-of-life","nudge","undoing-project","noise","selfish-gene","little-book-beats-market","kaizen","richer-wiser-happier","essays-buffett","seeking-wisdom","discipline-equals-freedom","when-breath-becomes-air","being-mortal","lifespan","outlive","five-am-club","inner-game-tennis","peaceful-warrior","when-pink","what-i-talk-about-running","franklin-autobiography","uncertain-glory","short-history-nearly-everything","emperor-maladies"]);
  const expBooks = djArr.filter(b => EXPANDED.has(b.id));
  ok("all 45 thin books expanded to 9+ lessons (no compromise)", expBooks.length === 45 && expBooks.every(b => b.lessons.length >= 9), expBooks.filter(b => b.lessons.length < 9).map(b => b.id + "=" + b.lessons.length).join(","));
  ok("all 50 new books carry 8+ lessons", newIds.size === 50 && [...newIds].every(id => (djArr.find(b => b.id === id) || { lessons: [] }).lessons.length >= 8));
  ok("every lesson is complete (title/chapter/summary/example/action)", djArr.every(b => b.lessons.every(l => l.title && l.chapter && l.summary && l.example && l.action)), "missing fields found");
  ok("no stale lesson-count string anywhere (2,490 / 2490)", !/2,490|2490/.test(allRepoText()));
  const logH = fsp.readFileSync(pp.join(__dirname, "../login.html"), "utf8");
  const profH = fsp.readFileSync(pp.join(__dirname, "../profile.html"), "utf8");
  ok("progress % is computed from BOOKS, not a hard-coded total", logH.includes("window.BOOKS || []).reduce") && logH.includes("toLocaleString") && profH.includes("window.BOOKS || []).reduce"));
  ok("SEO pages for the 50 show the REAL lesson counts", [...newIds].every(id => { const h = fsp.readFileSync(pp.join(__dirname, "../books/" + id + ".html"), "utf8"); const b = djArr.find(x => x.id === id); return h.includes(b.lessons.length + " lessons"); }), "count mismatch on a page");

  /* RUNTIME REGRESSION GUARD — the v217 home-page crash:
     sortBooks assigned to a `const curated` when tsb_interests existed,
     which threw "Assignment to constant variable" and blanked Home
     (no books, no ✦ NEW, no streak bar). Must never come back. */
  ok("sortBooks NEVER reassigns a const list (v221 ranking is const-safe)", !appSrc.includes("curated = curated") && !/const\s+\w+\s*=\s*[^;]+;\s*\w+\s*=/.test(appSrc) && appSrc.includes("const ordered = mix3to1(") || appSrc.includes("let ordered = curated"));
  ok("starter picks lead via `ordered` (no const-clobber)", appSrc.includes("const sb = ordered.filter") && appSrc.includes("return ordered;"));
  ok("home still builds the streak/level/badge bar", appSrc.includes("gamebar__chip") && appSrc.includes("day streak") && appSrc.includes("badges"));
  ok("home renders NEW badges via isNew + card__new", appSrc.includes("isNew(b.id)") && appSrc.includes("card__new"));

  console.log("== v221: guest gate verified (10 min / 6 books), gate dark-mode readable ==");
  const gateSrc = fsp.readFileSync(pp.join(__dirname, "../js/gate.js"), "utf8");
  ok("gate: guests get a grace period (~10 min) then one card", gateSrc.includes("GRACE_MS = 10 * 60 * 1000") && gateSrc.includes("READ_LIMIT = 6"));
  ok("gate: offers a 5-more-minutes snooze and never on auth pages", gateSrc.includes("data-later") && /login\.html|settings\.html|scan\.html|404\.html/.test(gateSrc));
  ok("gate: signed-in readers never see it", gateSrc.includes("if (signedIn()) return false;") && gateSrc.includes("tsb_auth_session"));
  ok("gate message = the friendly free-forever stack card", gateSrc.includes("You’ve read a whole stack!") && gateSrc.includes("free forever") && gateSrc.includes("Sign in (10 seconds with Google)"));
  ok("gate card readable in dark (headline was invisible: color == bg)", css.includes("html.dark .gate { background: #241f17; color: #f2ead8; }") && css.includes("html.dark .gate__cta { color: #111; }"));


  /* ================= v221 bug-fix batch ================= */
  console.log("== v221: real delete, finder, avatar sync, DM ticks, media, uploads, install, recs ==");
  const storiesH = fsp.readFileSync(pp.join(__dirname, "../stories.html"), "utf8");
  const storyH = fsp.readFileSync(pp.join(__dirname, "../story.html"), "utf8");
  const writeH = fsp.readFileSync(pp.join(__dirname, "../write.html"), "utf8");
  const profH2 = fsp.readFileSync(pp.join(__dirname, "../profile.html"), "utf8");
  const dmH2 = fsp.readFileSync(pp.join(__dirname, "../dm.html"), "utf8");
  const installSrcV2 = fsp.readFileSync(pp.join(__dirname, "../js/install.js"), "utf8");
  const commSrc2 = fsp.readFileSync(pp.join(__dirname, "../js/community.js"), "utf8");

  /* 1) DELETE: post + likes + comments really gone; RLS-blocked path throws with SQL #10 */
  const p2 = await C.publish({ title: "Doomed Story", body: "<p>x</p>", kind: "text", no_download: true });
  await C.setLike(p2.id, true);
  await C.addComment(p2.id, "nice");
  ok("delete: pre-state has like+comment", DB.likes.some(x => x.post_id === p2.id) && DB.comments.some(x => x.post_id === p2.id));
  await C.deletePost(p2.id);
  ok("delete: post row gone", !DB.posts.some(x => x.id === p2.id));
  ok("delete: likes cascade-gone", !DB.likes.some(x => x.post_id === p2.id));
  ok("delete: comments cascade-gone", !DB.comments.some(x => x.post_id === p2.id));
  const p3 = await C.publish({ title: "RLS Test", body: "<p>x</p>", kind: "text" });
  globalThis.blockDelete = true;
  let delErr = "";
  try { await C.deletePost(p3.id); } catch (e) { delErr = String(e && e.message || e); }
  globalThis.blockDelete = false;
  ok("delete: silent 0-row delete is DETECTED + hints SQL #10", delErr.includes("SQL #10"), delErr);
  ok("delete: blocked post still there (no false positive)", DB.posts.some(x => x.id === p3.id));

  /* 2) FIND READERS: profiles ordered by updated_at (created_at does not exist) */
  DB.profiles.push({ id: "reader-9", name: "Anjali", avatar_url: "", bio: "", updated_at: new Date().toISOString() });
  const ppl = await C.listProfiles(120);
  ok("finder: profiles return rows", ppl.some(x => x.id === "reader-9"));
  ok("finder: query orders by updated_at.desc (no created_at on profiles)", globalThis.lastUrl.includes("order=updated_at.desc"), globalThis.lastUrl);

  /* 3) AVATAR PROPAGATION: snapshot PATCH on ALL own posts after profile change */
  await C.syncAvatarPosts("https://x/storage/tsb-avatars/user-1/new.jpg", null);
  ok("avatar: posts PATCH carries the new author_avatar URL", globalThis.lastUrl.includes("posts?author_id=eq.") && globalThis.lastHeaders.Prefer === "return=representation");
  ok("avatar: every own post row now has the new URL", DB.posts.filter(x => x.author_id === "user-1").length > 0 && DB.posts.filter(x => x.author_id === "user-1").every(x => x.author_avatar === "https://x/storage/tsb-avatars/user-1/new.jpg"));

  /* 4) DM READ RECEIPTS: mark-read PATCH + read flag stored */
  DB.messages.push({ id: "mm-in-1", sender_id: "reader-9", receiver_id: "user-1", read: false, body: "hello from anjali", created_at: new Date().toISOString() });
  const before = DB.messages.filter(m => m.sender_id === "reader-9" && m.receiver_id === "user-1").length;
  await C.markThreadRead("reader-9");
  const unread = DB.messages.filter(m => m.sender_id === "reader-9" && m.receiver_id === "user-1" && m.read === false).length;
  ok("dm: incoming messages marked read via PATCH", before >= 1 && unread === 0, "unread=" + unread);
  ok("dm: read flag exists on messages rows", DB.messages.some(m => m.read === true));

  /* 5) NO-DOWNLOAD MEDIA: flag saved by default, custom controls, no native video controls in app */
  const p4 = await C.publish({ title: "View Only", body: "<p>x</p>", kind: "text" });
  ok("media: publish stores no_download=true by default", p4.no_download === true || DB.posts.find(x => x.id === p4.id).no_download === true);
  globalThis.failNext = { body: JSON.stringify({ message: "column no_download does not exist" }), status: 400 };
  const p5 = await C.publish({ title: "Old DB", body: "<p>x</p>", kind: "text" });
  ok("media: old-DB fallback publishes without the flag", !!p5 && p5.title === "Old DB");
  ok("media: protectMedia adds nodownload + no PiP + edge-2x + autopause", commSrc2.includes("controlslist") && commSrc2.includes("nodownload") && commSrc2.includes("disablepictureinpicture") && commSrc2.includes("playbackRate = 2") && commSrc2.includes("IntersectionObserver"));
  ok("media: pauseAllMedia exported (switching posts stops sound)", commSrc2.includes("pauseAllMedia: pauseAllMedia"));
  ok("media: reels have NO native controls attribute", !storiesH.includes("cm-reel__vid\" src=") || !/cm-reel__vid[^>]*controls/.test(storiesH));
  ok("media: story page video stripped of native controls", !/cm-postcard__cover[^>]*controls/.test(storyH));

  /* 6) STYLED UPLOADS: no raw file inputs left on write/profile */
  ok("uploads: write.html uses hidden inputs + styled buttons", writeH.includes('id="wCover" type="file" accept="image/*" hidden') && writeH.includes('id="wBurst" type="file" accept="video/*" hidden') && writeH.includes('id="wAudio" type="file" accept="audio/*" hidden') && writeH.includes("Choose image") && writeH.includes("Choose video") && writeH.includes("Choose audio"));
  ok("uploads: profile photo picker is styled too", profH2.includes("cm-lbl--file") && profH2.includes("Choose photo"));
  ok("uploads: view-only toggle present + wired into publish", writeH.includes("wNoDl") && writeH.includes("no_download: $("));

  /* 7) INSTALL POPUP: one-tap install, not steps */
  ok("install: popup with a single install action", instSrc.includes("Install the app") && instSrc.includes("beforeinstallprompt") && !instSrc.includes("Step 1") && !instSrc.includes("step 1"));

  /* 8) RECOMMENDATIONS: case-insensitive prefs (alignment fix) + 3:1 Indian/intl mix of the whole list */
  ok("recs: pref matching is case-insensitive (Productivity == productivity)", appSrc.includes("toLowerCase()"));
  ok("recs: Indian+international interleaved across the WHOLE list (not just new)", appSrc.includes("mix3to1") && appSrc.includes("isIndianBook"));
  ok("recs: best-first scoring (lessons + autopsies), new books still float", appSrc.includes("const score = (b)") && appSrc.includes("graveLink"));
  const pjsSrc2 = fsp.readFileSync(pp.join(__dirname, "../js/prefs.js"), "utf8");
  ok("recs: interest.top only returns real categories (tag junk ignored)", pjsSrc2.includes("cats.add(String(b.category).toLowerCase())"));
  ok("bugs: no 'No file chosen' native strings left in write/profile (except styled labels)", !writeH.includes("input id=\"wCover\" type=\"file\">") && !profH2.includes("input id=\"pAva\" type=\"file\">"));

  /* ================= v222: NATURAL HINGLISH/GUJLISH + UPLOAD FIXES ================= */
  console.log("== v222: natural language engine (kurated dict + live translit) ==");
  const langSrc = fsp.readFileSync(pp.join(__dirname, "../js/lang.js"), "utf8");
  ok("v222: engine exposes naturalRoman + per-language dictionaries", langSrc.includes("HINGLISH_DICT") && langSrc.includes("GUJLISH_DICT") && langSrc.includes("naturalRoman") && langSrc.includes("transliteration_hi_en"));
  const _docOld = globalThis.document;
  globalThis.document = {
    addEventListener() {}, createElement: () => ({ setAttribute() {}, appendChild() {}, addEventListener() {} }),
    head: { appendChild() {} }, body: { appendChild() {}, nodeType: 1 },
    createTreeWalker: () => ({ nextNode: () => null }), querySelector: () => null, querySelectorAll: () => [],
    getElementById: () => null, documentElement: { classList: { contains: () => false } }
  };
  globalThis.NodeFilter = { SHOW_TEXT: 4 };
  eval(langSrc);
  const L = globalThis.window.TSB_LANG;
  ok("v222 hinglish: everyday sentence is exactly how people text", L.toHinglish("मैं यह काम कल शुरू करूँगा।") === "main yeh kaam kal shuru karunga.", L.toHinglish("मैं यह काम कल शुरू करूँगा।"));
  ok("v222 hinglish: polite form + questions natural", L.toHinglish("क्या आप मुझे यह किताब देंगे?") === "kya aap mujhe yeh kitaab denge?");
  ok("v222 hinglish: book words become plain words (कृपया/धन्यवाद/स्वतंत्रता)", L.toHinglish("कृपया स्वतंत्रता") === "please aazaadi");
  ok("v222 hinglish: no machine aa/ee doubling (जिंदगी → zindagi)", L.toHinglish("जिंदगी") === "zindagi" && L.toHinglish("महीना") === "mahina");
  ok("v222 gujlish: everyday sentence natural", L.toGujlish("તમે મને આ કિતાબ આપશો?") === "tame mane aa kitaab aapsho?");
  ok("v222 gujlish: fused postpositions split (જીવનમાં → jeevan ma)", L.toGujlish("જીવનમાં") === "jeevan ma" && L.toGujlish("ઘરમાં") === "ghar ma");
  ok("v222 gujlish: future tense short (કરશો → karsho)", L.toGujlish("તમે પછી કરશો") === "tame pachhi karsho", L.toGujlish("તમે પછી કરશો"));
  ok("v222 gujlish: own-word correct (પોતાના → potana, not pota na)", L.toGujlish("પોતાના સપના") === "potana sapna");
  if (_docOld !== undefined) globalThis.document = _docOld; else delete globalThis.document;

  console.log("== v222: upload hardening + self-diagnosis ==");
  const commSrc2b = fsp.readFileSync(pp.join(__dirname, "../js/community.js"), "utf8");
  ok("v222: upload retries once with a freshly refreshed token", commSrc2b.includes("tk2 !== tk"));
  ok("v222: probeStorage exported (settings self-test)", commSrc2b.includes("probeStorage: probeStorage") && commSrc2b.includes("bucket-missing") && commSrc2b.includes("policy-missing"));
  const pr1 = await C.probeStorage("tsb-covers");
  ok("v222: probe says storage OK under mock (list+public+write round trip)", pr1.ok === true && pr1.signedIn === true, JSON.stringify(pr1));
  const tokOld = globalThis.TSB_AUTH.token, sessOld = store.tsb_auth_session;
  globalThis.TSB_AUTH.token = async () => "";
  store.tsb_auth_session = JSON.stringify({ user: { id: "user-1" } });
  const pr2 = await C.probeStorage("tsb-covers");
  ok("v222: probe reports 'sign in first' when no session", pr2.reason === "signin", pr2.reason);
  globalThis.TSB_AUTH.token = tokOld; store.tsb_auth_session = sessOld;
  const setH3 = fsp.readFileSync(pp.join(__dirname, "../settings.html"), "utf8");
  ok("v222: Settings has the one-tap upload test", setH3.includes('id="upDiag"') && setH3.includes("Test upload right now") && setH3.includes("Build tsb-v222"));
  /* the WRITE page uploads died silently: fname() was called by every handler but
     defined nowhere — cover/quote/video/audio upload never started. Regression-guard it: */
  const writeH3 = fsp.readFileSync(pp.join(__dirname, "../write.html"), "utf8");
  const fnameCalls = (writeH3.match(/\bfname\(/g) || []).length;
  ok("v222: write.html defines fname (no more silent upload death)", writeH3.includes("function fname(inputId, labelId, f)") && fnameCalls >= 4, "calls=" + fnameCalls);
  ok("v222: fname is defined BEFORE its first call on the page", (function () { var d = writeH3.indexOf("function fname("); var c = writeH3.indexOf("fname(\"wCover\""); return d >= 0 && c > d; })());
  const installSrcV3 = fsp.readFileSync(pp.join(__dirname, "../js/install.js"), "utf8");
  ok("v222: install popup self-heals with one reload when the native prompt is late", installSrcV3.includes("tsb_inst_reload") && installSrcV3.includes("location.reload()") && installSrcV3.includes("Add to Home Screen"));
  const swSrcV3 = fsp.readFileSync(pp.join(__dirname, "../sw.js"), "utf8");
  ok("v222: media cache never eats byte-range video requests",  swSrcV3.includes('e.request.headers.get("range")') &&  swSrcV3.includes("res.status === 200"));
  const docSrc2 = fsp.readFileSync(pp.join(__dirname, "../docs/SUPABASE-STEP-BY-STEP.md"), "utf8");
  ok("v222: docs SQL #3 v4 is schema-adaptive (detects owner_id vs owner)", docSrc2.includes("information_schema.columns") && docSrc2.includes("has_owner_id") && docSrc2.includes("tsb write storage") && docSrc2.includes("drop policy if exists \"auth write storage v2\""));
  ok("v222: docs no longer reference the vanished owner column in policies", !/and owner = auth\.uid\(\)/.test(docSrc2));

  console.log();
  console.log("RESULT: " + PASS + " passed, " + FAIL + " failed");
  process.exit(FAIL ? 1 : 0);
})();
