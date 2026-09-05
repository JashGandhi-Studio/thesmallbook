/* ============================================================
   THESMALLBOOK — PHASE 1 SELF-CHECK  (node tools/qa/check.js)

   Runs without a browser (the sandbox blocks the Chromium CDN).
   jsdom actually executes our scripts, so the shell, theme engine
   and data loader are genuinely exercised, not just grepped.

   Covers: static integrity of all 661 pages, data split fidelity,
   CSS token contract, theme engine, and app-shell behaviour.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..", "..");
let pass = 0;
const fails = [];
function check(ok, label, detail) {
  if (ok) pass++;
  else fails.push(label + (detail ? "  → " + detail : ""));
}
function section(t) { console.log("\n── " + t); }

/* ---------- helpers ---------- */
function walkHTML(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "docs", "tools"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHTML(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}
const read = f => fs.readFileSync(f, "utf8");

/* ============================================================
   1. STATIC INTEGRITY — every page, every asset reference
   ============================================================ */
section("Static integrity");
const pages = walkHTML(ROOT);
check(pages.length >= 660, "found all HTML pages", String(pages.length));

const SKIP = new Set(["scan.html"]);
let missingAsset = [], noTokens = [], noShell = [], noTheme = [], badOrder = [];

for (const f of pages) {
  const rel = path.relative(ROOT, f);
  const src = read(f);

  // referenced local assets must exist on disk
  const refs = [...src.matchAll(/(?:href|src)="((?![a-z][a-z0-9+.-]*:|data:|#|\/\/)[^"]+)"/g)].map(m => m[1]);
  for (const r of refs) {
    const clean = r.split(/[?#]/)[0];
    if (!clean || clean.endsWith("/")) continue;
    if (!fs.existsSync(path.resolve(path.dirname(f), clean))) missingAsset.push(rel + " → " + clean);
  }

  if (SKIP.has(rel)) continue;
  if (!src.includes("css/tokens.css")) noTokens.push(rel);
  if (!src.includes("js/shell.js") && rel !== "signin.html") noShell.push(rel);
  if (!src.includes("pre-paint theme")) noTheme.push(rel);

  // tokens.css MUST precede style.css or the legacy bridge loses
  const iT = src.indexOf("css/tokens.css"), iS = src.indexOf("css/style.css");
  if (iT > -1 && iS > -1 && iT > iS) badOrder.push(rel);
}
check(missingAsset.length === 0, "no broken local asset refs", missingAsset.slice(0, 4).join(" | "));
check(noTokens.length === 0, "tokens.css on every page", noTokens.slice(0, 3).join(", "));
check(noShell.length === 0, "shell.js on every page", noShell.slice(0, 3).join(", "));
check(noTheme.length === 0, "pre-paint theme on every page", noTheme.slice(0, 3).join(", "));
check(badOrder.length === 0, "tokens.css loads before style.css", badOrder.slice(0, 3).join(", "));

/* ============================================================
   2. DATA SPLIT — the index must be lossless vs js/data.js
   ============================================================ */
section("Data split");
global.window = {};
require(path.join(ROOT, "js", "data.js"));
const BOOKS = global.window.BOOKS || global.BOOKS;
const index = JSON.parse(read(path.join(ROOT, "data", "books-index.json")));

check(BOOKS.length === 350, "source has 350 books", String(BOOKS.length));
check(index.length === BOOKS.length, "index count matches source", `${index.length} vs ${BOOKS.length}`);

const totalSrc = BOOKS.reduce((n, b) => n + (b.lessons || []).length, 0);
const totalIdx = index.reduce((n, b) => n + b.lessons.length, 0);
check(totalSrc === 2176, "source has 2176 lessons", String(totalSrc));
check(totalIdx === totalSrc, "index lesson counts match", `${totalIdx} vs ${totalSrc}`);

// every book has a shard, the shard is complete, and the cover exists
let missingShard = [], badShard = [], missingCover = [];
for (const b of BOOKS) {
  const sp = path.join(ROOT, "data", "books", b.id + ".json");
  if (!fs.existsSync(sp)) { missingShard.push(b.id); continue; }
  const s = JSON.parse(read(sp));
  if (s.id !== b.id || s.title !== b.title ||
      (s.lessons || []).length !== (b.lessons || []).length) badShard.push(b.id);
  if (b.cover && !fs.existsSync(path.join(ROOT, b.cover))) missingCover.push(b.id);
}
check(missingShard.length === 0, "every book has a shard", missingShard.slice(0, 4).join(", "));
check(badShard.length === 0, "shards match source records", badShard.slice(0, 4).join(", "));
check(missingCover.length === 0, "every cover file exists", missingCover.slice(0, 4).join(", "));

// unique ids
const dupes = index.map(b => b.id).filter((id, i, a) => a.indexOf(id) !== i);
check(dupes.length === 0, "book ids unique", dupes.slice(0, 4).join(", "));

// the win we're claiming
const idxKB = fs.statSync(path.join(ROOT, "data", "books-index.json")).size / 1024;
const srcKB = fs.statSync(path.join(ROOT, "js", "data.js")).size / 1024;
check(idxKB < srcKB * 0.15, "index is <15% of data.js",
  `${idxKB.toFixed(0)} KB vs ${srcKB.toFixed(0)} KB`);

/* ---------- counts quoted in the UI are current ---------- */
section("Content counts in copy");
const FAILURES = (() => { global.window = {}; require(path.join(ROOT, "js", "failures.js")); return global.window.FAILURES; })();
check(FAILURES.length === 300, "300 graveyard entries", String(FAILURES.length));

const stale = [];
for (const f of pages) {
  const src = read(f);
  if (/\b(280|240)\s+books\b/.test(src)) stale.push(path.relative(ROOT, f) + " (old book count)");
  if (/\b(1643|2170)\b/.test(src)) stale.push(path.relative(ROOT, f) + " (old lesson count)");
  if (/\b220\s+legendary\b/.test(src)) stale.push(path.relative(ROOT, f) + " (old grave count)");
}
check(stale.length === 0, "no stale counts in HTML", stale.slice(0, 4).join(", "));
const rm = read(path.join(ROOT, "README.md"));
check(/350 books, 2176 lessons/.test(rm) && /300 legendary/.test(rm), "README counts current");

/* ---------- service worker must ship the new v2 assets ---------- */
section("Service worker");
const sw = read(path.join(ROOT, "sw.js"));
var swv = (sw.match(/CACHE_VERSION = "tsb-v(\d+)"/) || [])[1];
check(swv && Number(swv) >= 171, "cache version bumped (existing users get fresh files)", "v" + swv);
for (const a of ["css/tokens.css", "css/shell.css", "js/theme.js", "js/shell.js",
                 "js/data-loader.js", "data/books-index.json",
                 "chat.html", "profile.html", "settings.html",
                 "js/ask-core.js", "js/chat.js", "js/profile.js", "js/settings.js"]) {
  check(sw.includes(a), "sw precaches " + a);
}
check(/url\.pathname\.includes\("\/data\/"\)/.test(sw), "sw uses stale-while-revalidate for data shards");

/* ============================================================
   3. CSS CONTRACT — every var style.css uses must be defined
   ============================================================ */
section("CSS token contract");
const tokens = read(path.join(ROOT, "css", "tokens.css"));
const style = read(path.join(ROOT, "css", "style.css"));
const shell = read(path.join(ROOT, "css", "shell.css"));

const defined = new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
const usedIn = css => new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));

/* --gcat/--tile/--tilt are assigned inline by JS per element and every
   usage supplies a fallback, so they are legitimately not in tokens.css */
const RUNTIME_VARS = new Set(["--gcat", "--tile", "--tilt", "--i"]);
const undefStyle = [...usedIn(style)].filter(v => !defined.has(v) && !RUNTIME_VARS.has(v));
const undefShell = [...usedIn(shell)].filter(v => !defined.has(v) && !RUNTIME_VARS.has(v));
check(undefStyle.length === 0, "style.css vars all defined", undefStyle.join(", "));
check(undefShell.length === 0, "shell.css vars all defined", undefShell.join(", "));

check(/--maxw:/.test(tokens), "--maxw defined (was a pre-existing bug)");
check(!/html\.dark\s*\{[^}]*--bg:/.test(style), "style.css no longer hardcodes dark surfaces");
check(/env\(safe-area-inset-bottom/.test(tokens), "safe-area inset tokens present");
check(/overflow-x:\s*hidden/.test(tokens), "global no-horizontal-scroll rule");
check(/prefers-reduced-motion/.test(tokens), "reduced-motion honoured");
check(/min-height:\s*var\(--tap\)/.test(tokens), "44px min tap target enforced");
check(/prefers-color-scheme:\s*dark/.test(tokens), "auto theme media query present");

/* balanced braces = no truncated stylesheet */
for (const [n, css] of [["tokens", tokens], ["shell", shell], ["style", style]]) {
  const o = (css.match(/\{/g) || []).length, c = (css.match(/\}/g) || []).length;
  check(o === c, `${n}.css braces balanced`, `${o} open / ${c} close`);
}

/* ============================================================
   4. RUNTIME — execute the real scripts in jsdom
   ============================================================ */
section("Runtime (jsdom)");

function makeDOM(html, { url = "https://thesmallbook.in/index.html", ua } = {}) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on("jsdomError", e => errs.push(e.message));
  const dom = new JSDOM(html, {
    url, runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  });
  /* jsdom 30 ignores the userAgent constructor option for evaluated
     scripts, so override navigator.userAgent directly. */
  if (ua) Object.defineProperty(dom.window.navigator, "userAgent",
    { value: ua, configurable: true });
  dom.window.matchMedia = dom.window.matchMedia || (q => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
  }));
  const ready = () => new Promise(res => {
    if (dom.window.document.readyState !== "loading") return res(dom);
    dom.window.document.addEventListener("DOMContentLoaded", () => res(dom));
    setTimeout(() => res(dom), 500);
  });
  return { dom, errs, ready };
}
const themeJS = read(path.join(ROOT, "js", "theme.js"));
const shellJS = read(path.join(ROOT, "js", "shell.js"));


/* run scripts, then let DOMContentLoaded fire before asserting */
function mk(html, opts) { return Promise.resolve(makeDOM(html, opts)); }
function tick(dom) {
  return new Promise(res => {
    if (dom.window.document.readyState !== "loading") return setTimeout(res, 0);
    dom.window.document.addEventListener("DOMContentLoaded", () => setTimeout(res, 0));
    setTimeout(res, 400);
  });
}

async function main() {
/* ---- theme engine ---- */
{
  const { dom } = await mk(`<!DOCTYPE html><html><head>
    <meta name="theme-color" content="#ffc800"></head><body></body></html>`);
  dom.window.eval(themeJS);
  const w = dom.window, T = w.TSB_THEME;
  check(!!T, "TSB_THEME exposed");

  T.set("dark");
  check(w.document.documentElement.classList.contains("dark"), "set('dark') adds .dark");
  check(w.document.querySelector('meta[name="theme-color"]').content === "#0E0E10", "theme-color follows dark");
  check(w.localStorage.getItem("tsb_theme") === '"dark"', "persists in legacy JSON format",
        w.localStorage.getItem("tsb_theme"));

  T.set("light");
  check(!w.document.documentElement.classList.contains("dark"), "set('light') removes .dark");

  T.set("auto");
  check(w.document.documentElement.classList.contains("theme-auto"), "auto adds .theme-auto");
  check(w.document.documentElement.getAttribute("data-theme") === "auto", "data-theme=auto");

  T.set("light"); T.toggle();
  check(T.get() === "dark", "toggle() flips light→dark", T.get());
  check(T.set("garbage") === "light", "invalid mode falls back to light");

  // legacy value written by the OLD build must still be honoured
  const { dom: d2 } = await mk("<!DOCTYPE html><html><head></head><body></body></html>");
  d2.window.localStorage.setItem("tsb_theme", '"dark"');
  d2.window.eval(themeJS);
  check(d2.window.document.documentElement.classList.contains("dark"),
        "legacy stored theme still applies (no user loses their setting)");
}

/* ---- app shell ---- */
const APP_HTML = `<!DOCTYPE html><html><head></head><body><main>x</main></body></html>`;
{
  // renders on an app page
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/index.html" });
  dom.window.eval(shellJS); await tick(dom);
  const doc = dom.window.document;
  const bar = doc.querySelector(".tsb-bar");
  check(!!bar, "bottom bar renders on app pages");
  check(doc.body.classList.contains("tsb-has-bar"), "body reserves space for the bar");

  const items = doc.querySelectorAll(".tsb-bar__item");
  check(items.length === 5, "5 tabs", String(items.length));
  const labels = [...doc.querySelectorAll(".tsb-bar__label")].map(e => e.textContent);
  check(labels.join(",") === "Home,Read,Chat,You", "tab labels", labels.join(","));
  check(!!doc.querySelector(".tsb-bar__fab"), "Add renders as the coral FAB");
  check(doc.querySelectorAll(".tsb-bar__item.is-active").length === 1, "exactly one active tab");
  /* index.html is the homepage again: Home owns it, Read scrolls to the shelf */
  check(doc.querySelector('[data-tab="home"]').classList.contains("is-active"),
        "Home active on index (index is the homepage)");
  check(bar.getAttribute("role") === "navigation" && !!bar.getAttribute("aria-label"), "bar is a11y-labelled");
  check(!!doc.querySelector('[aria-current="page"]'), "active tab has aria-current");
  check([...doc.querySelectorAll(".tsb-bar__item")].every(a => a.getAttribute("href")), "every tab has an href");

  // idempotent — must never double-render
  dom.window.TSB_SHELL.rebuild();
  check(doc.querySelectorAll(".tsb-bar").length === 1, "rebuild() does not duplicate the bar");
}
{
  // active tab derives from the URL
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/stories.html" });
  dom.window.eval(shellJS); await tick(dom);
  check(dom.window.document.querySelector('[data-tab="add"]') !== null, "Add tab present on stories");
}
{
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/book.html?id=atomic-habits" });
  dom.window.eval(shellJS); await tick(dom);
  const act = dom.window.document.querySelector(".tsb-bar__item.is-active");
  check(act && act.getAttribute("data-tab") === "read", "Read active on book.html",
        act && act.getAttribute("data-tab"));
}
{
  // SEO page, anonymous → NO chrome (protects what Google indexes)
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/books/atomic-habits.html" });
  dom.window.eval(shellJS); await tick(dom);
  check(!dom.window.document.querySelector(".tsb-bar"), "no bar on SEO page for anonymous visitors");
}
{
  // SEO page, signed in → chrome appears
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/books/atomic-habits.html" });
  dom.window.TSB_AUTH = { user: () => ({ id: "u1" }) };
  dom.window.eval(shellJS); await tick(dom);
  check(!!dom.window.document.querySelector(".tsb-bar"), "bar appears on SEO page when signed in");
  const href = dom.window.document.querySelector('[data-tab="home"]').getAttribute("href");
  check(href.startsWith("../"), "nested pages get ../ relative hrefs", href);
}
{
  // crawlers must never see app chrome
  const { dom } = await mk(APP_HTML, {
    url: "https://thesmallbook.in/index.html",
    ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  });
  dom.window.eval(shellJS); await tick(dom);
  check(!dom.window.document.querySelector(".tsb-bar"), "Googlebot never sees the app shell");
}
{
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/login.html" });
  dom.window.eval(shellJS); await tick(dom);
  check(!dom.window.document.querySelector(".tsb-bar"), "no bar on login.html");
}

/* ---- data loader ---- */
{
  const loaderJS = read(path.join(ROOT, "js", "data-loader.js"));
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/index.html" });
  const w = dom.window;
  w.fetch = (url) => {
    const p = path.join(ROOT, String(url).replace(/^\.\//, "").replace(/^\.\.\//, ""));
    return fs.existsSync(p)
      ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(read(p))) })
      : Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error("404")) });
  };
  w.eval(loaderJS);
  check(!!w.TSB_DATA, "TSB_DATA exposed");

  const list = await w.TSB_DATA.ready();
  {
    check(list.length === 350, "loader returns 350 books", String(list.length));
    check(Array.isArray(w.BOOKS) && w.BOOKS.length === 350, "window.BOOKS back-compat populated");
    check(!!list[0].title && !!list[0].cover, "index rows carry title + cover");
    check(Array.isArray(list[0].lessons) && !!list[0].lessons[0].title,
          "index carries lesson titles (search works offline)");
    check(list[0].lessons[0].summary === undefined,
          "index omits lesson bodies (that's the payload win)");

    const b = await w.TSB_DATA.book("atomic-habits");
    check(b.title === "Atomic Habits", "shard fetch by id", b.title);
    check(!!b.lessons[0].summary && !!b.bigIdea, "shard carries full lesson bodies");

    const again = await w.TSB_DATA.book("atomic-habits");
    check(again === b, "shards are cached (no refetch)");

    let threw = false;
    await w.TSB_DATA.book("does-not-exist").catch(() => { threw = true; });
    check(threw, "missing shard rejects cleanly");

  }
}


/* ---- Phase 2: chat page ---- */
{
  const html = read(path.join(ROOT, "chat.html"));
  const { dom } = await mk(html, { url: "https://thesmallbook.in/chat.html" });
  const w = dom.window;
  ["js/data.js","js/failures.js","js/ask-data.js","js/ask-core.js"].forEach(f =>
    w.eval(read(path.join(ROOT, f))));
  if (!w.BOOKS && w.window.BOOKS) w.BOOKS = w.window.BOOKS;
  w.eval(read(path.join(ROOT, "js/chat.js")));
  await tick(dom);

  const doc = w.document;
  check(!!doc.getElementById("chatLog"), "chat: log element");
  check(!!doc.getElementById("chatInput"), "chat: composer input");
  check(!!doc.querySelector(".chat-hello"), "chat: welcome shown on first visit");
  check(doc.querySelectorAll("#chatSuggest button").length > 0, "chat: suggestion chips render");

  w.TSB_CHAT.ask("How do I stop procrastinating?");
  await new Promise(r => setTimeout(r, 900));
  const bubbles = doc.querySelectorAll(".chat-msg");
  check(bubbles.length >= 2, "chat: question + answer rendered", String(bubbles.length));
  check(!!doc.querySelector(".chat-msg--me"), "chat: user bubble");
  check(!!doc.querySelector(".chat-msg--bot .chat-srcs"), "chat: answer includes source cards");
  const link = doc.querySelector(".chat-src");
  check(link && /book\.html\?id=/.test(link.getAttribute("href")), "chat: sources deep-link into books");
  check(!doc.querySelector(".chat-hello"), "chat: welcome clears after asking");

  const hist = JSON.parse(w.localStorage.getItem("tsb_chat_history") || "[]");
  check(hist.length === 1, "chat: history persisted", String(hist.length));
  check(w.document.querySelector(".chat-typing") === null, "chat: typing indicator removed after answer");
}

/* ---- Phase 2: ask popup is now a redirect shim ---- */
{
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/index.html" });
  dom.window.eval(read(path.join(ROOT, "js/ask-shim.js")));
  check(!!dom.window.TSB_ASK && typeof dom.window.TSB_ASK.open === "function",
        "ask: TSB_ASK still exposed (old entry points keep working)");
  await tick(dom);
  check(!dom.window.document.querySelector(".aq-fab"),
        "ask: floating bubble no longer rendered (Chat lives in the bar)");
}

/* ---- Phase 2: profile page ---- */
{
  const html = read(path.join(ROOT, "profile.html"));
  const { dom } = await mk(html, { url: "https://thesmallbook.in/profile.html" });
  const w = dom.window;
  w.eval(read(path.join(ROOT, "js/profile.js")));
  w.eval(read(path.join(ROOT, "js/profile-page.js")));
  await new Promise(r => setTimeout(r, 1700));   // waits out the auth timeout
  check(!!w.document.querySelector(".pf-gate"), "profile: signed-out gate shown");
  check(/Create your account/.test(w.document.body.textContent), "profile: signup CTA present");
}
{
  /* signed in → real profile */
  const html = read(path.join(ROOT, "profile.html"));
  const { dom } = await mk(html, { url: "https://thesmallbook.in/profile.html" });
  const w = dom.window;
  w.TSB_AUTH = {
    user: () => ({ id: "u-1", email: "jash@example.com",
                   user_metadata: { full_name: "Jash Gandhi" } }),
    enabled: true
  };
  w.eval(read(path.join(ROOT, "js/profile.js")));
  w.eval(read(path.join(ROOT, "js/profile-page.js")));
  await new Promise(r => setTimeout(r, 400));
  const txt = w.document.body.textContent;
  check(!!w.document.querySelector(".pf-hero"), "profile: signed-in header renders");
  check(/Jash Gandhi/.test(txt), "profile: display name from session");
  check(/@jash/.test(txt), "profile: username derived");
  check(!!w.document.querySelector(".pf-ava"), "profile: avatar control present");
  check(w.document.querySelectorAll(".pf-stat").length === 4, "profile: 4 stat blocks");
  check(!!w.document.getElementById("pfOut"), "profile: sign-out available");

  /* username validation is real */
  const P = w.TSB_PROFILE;
  check(P.validateUsername("ab").ok === false, "username: rejects <3 chars");
  check(P.validateUsername("admin").ok === false, "username: rejects reserved");
  check(P.validateUsername("12345").ok === false, "username: rejects digits-only");
  check(P.validateUsername("jash_g").ok === true, "username: accepts valid");
  check(P.normUsername("@Jash G!!").length > 0 && P.normUsername("@Jash G!!") === "jashg",
        "username: normalises input", P.normUsername("@Jash G!!"));
  check(P.validateUsername("a".repeat(21)).ok === false, "username: rejects >20 chars");
}

/* ---- Phase 2: settings page ---- */
{
  const html = read(path.join(ROOT, "settings.html"));
  const { dom } = await mk(html, { url: "https://thesmallbook.in/settings.html" });
  const w = dom.window;
  w.eval(read(path.join(ROOT, "js/theme.js")));
  w.eval(read(path.join(ROOT, "js/lang.js")));
  w.eval(read(path.join(ROOT, "js/settings.js")));
  await tick(dom);
  const doc = w.document;
  check(!!doc.getElementById("setTheme"), "settings: theme control");
  check(doc.querySelectorAll("#setTheme button").length === 3, "settings: light/dark/auto");
  check(doc.querySelectorAll("#setFont button").length === 4, "settings: 4 text sizes");
  check(!!doc.getElementById("setLangBtn"), "settings: language picker present");
  check(w.TSB_LANG && w.TSB_LANG.LANGS.length >= 26, "settings: 26 languages available",
        String(w.TSB_LANG && w.TSB_LANG.LANGS.length));
  check(/Hinglish/.test(doc.body.textContent), "settings: Hinglish offered");
  check(doc.querySelectorAll("#setSkin button").length === 2, "settings: interface style option");
  /* the language sheet must actually open and be readable */
  doc.getElementById("setLangBtn").click();
  await new Promise(r => setTimeout(r, 60));
  const sheetItems = doc.querySelectorAll(".langlist__item").length;
  check(sheetItems >= 26, "settings: language sheet lists every language", String(sheetItems));
  check(!!doc.querySelector(".langlist__item.is-on"), "settings: current language marked");
  check(!!doc.getElementById("setRemind"), "settings: reminder toggle");
  check(!!doc.getElementById("setExport"), "settings: data export");
  check(!!doc.getElementById("setIn"), "settings: sign-in CTA when signed out");

  /* theme buttons actually change the theme */
  doc.querySelector('#setTheme button[data-v="dark"]').click();
  check(w.TSB_THEME.get() === "dark", "settings: theme button applies", w.TSB_THEME.get());
  doc.querySelector('#setFont button[data-v="xl"]').click();
  check(doc.documentElement.getAttribute("data-font-size") === "xl", "settings: font size applies");
}

/* ---- Phase 2: shell knows the new tabs ---- */
{
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/chat.html" });
  dom.window.eval(shellJS); await tick(dom);
  const act = dom.window.document.querySelector(".tsb-bar__item.is-active");
  check(act && act.getAttribute("data-tab") === "chat", "shell: Chat tab active on chat.html",
        act && act.getAttribute("data-tab"));
}
{
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/settings.html" });
  dom.window.eval(shellJS); await tick(dom);
  const act = dom.window.document.querySelector(".tsb-bar__item.is-active");
  check(act && act.getAttribute("data-tab") === "you", "shell: You tab active on settings");
}

/* ============================================================
   REGRESSION GUARDS — bugs reported from the real device
   ============================================================ */
{
  section("Reported-bug guards");
  const badEscape = [];

  /* BUG: whole app unscrollable.
     overflow-x on <html> makes the root a scroll container, which breaks
     vertical scrolling on iOS Safari and disables position:sticky. */
  check(!/^\s*html[^{]*\{[^}]*overflow-x/m.test(tokens),
        "scroll: <html> has NO overflow-x (iOS scroll killer)");
  check(/body\s*\{[^}]*overflow-x:\s*clip/.test(tokens),
        "scroll: body clips horizontally instead");

  /* BUG: a stuck splash class froze the page */
  check(!/html\.tsb-loading[^{]*\{[^}]*overflow:\s*hidden/.test(style),
        "scroll: splash no longer sets overflow:hidden on <html>");
  const idx = read(path.join(ROOT, "index.html"));
  check(/SPLASH FAILSAFE/.test(idx), "scroll: splash has a hard failsafe timer");

  /* BUG: language list invisible in dark mode */
  const pf = read(path.join(ROOT, "css", "profile.css"));
  check(/\.set-select option\s*\{[^}]*background:\s*#/.test(pf),
        "language: <option> gets explicit non-variable colours");
  check(/\.langlist__item/.test(pf), "language: custom readable picker exists");

  /* BUG: Ask bubble still visible */
  const askSrc = read(path.join(ROOT, "js", "ask-shim.js"));
  check(/ASK SHIM/i.test(askSrc), "ask: only the redirect shim ships");
  check(!fs.existsSync(path.join(ROOT, "js", "ask.js")),
        "ask: the 32KB legacy widget is gone");
  check(askSrc.length < 2000, "ask: shim stays tiny", askSrc.length + " bytes");

  /* Question library — the missing feature */
  check(/function library\(/.test(read(path.join(ROOT, "js", "ask-core.js"))),
        "chat: question library exists in the engine");
  check(/qlib/.test(read(path.join(ROOT, "css", "chat.css"))), "chat: library sheet styled");

  /* literal \uXXXX escapes leaking into visible HTML text */
  pages.filter(f => !path.relative(ROOT, f).startsWith("books" + path.sep) &&
                    !path.relative(ROOT, f).startsWith("graveyard" + path.sep))
       .forEach(function (f) {
    const rel = path.relative(ROOT, f);
    const src = read(f);
    const text = src.replace(/<script[\s\S]*?<\/script>/gi, "")
                    .replace(/<style[\s\S]*?<\/style>/gi, "");
    if (/\\u[0-9a-fA-F]{4}/.test(text)) badEscape.push(rel);
  });
  check(badEscape.length === 0, "copy: no literal \\uXXXX escapes in visible text",
        badEscape.join(", "));

  /* premium bar: frosted, not flat */
  check(/backdrop-filter/.test(shell), "bar: frosted glass");
  check(/inset/.test(shell) && /box-shadow:\s*\n?\s*0 1px 0/.test(shell.replace(/\r/g,"")),
        "bar: inner highlight for depth");

  /* 60/120fps hygiene: no layout-thrashing transitions on the feed */
  check(/will-change:\s*transform/.test(shell), "perf: transform hinted to the GPU");
}

/* ---- Phase 3: feed ---- */

/* The feed must live on the FRONT DOOR. index.html is what "/" serves and
   what all 651 generated pages link to; a feed only on home.html is a feed
   nobody sees. */

/* ---- Phase 3: onboarding v2 ---- */
{
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/index.html" });
  const w = dom.window;
  w.eval(read(path.join(ROOT, "js/data.js")));
  if (!w.BOOKS && w.window.BOOKS) w.BOOKS = w.window.BOOKS;
  w.eval(read(path.join(ROOT, "js/onboard2.js")));
  await tick(dom);
  w.TSB_ONBOARD2.force();
  await new Promise(r => setTimeout(r, 60));

  const doc = w.document;
  check(!!doc.querySelector(".ob2"), "onboarding: opens for new visitors");
  check(doc.querySelectorAll(".ob2__bar i").length === 7, "onboarding: 7 steps",
        String(doc.querySelectorAll(".ob2__bar i").length));
  check(!!doc.getElementById("ob2Skip"), "onboarding: skippable at every step");
  check(doc.getElementById("ob2Back").disabled, "onboarding: back disabled on step 1");
  check(doc.querySelectorAll(".ob2__opt").length >= 5, "onboarding: mood options");

  /* the recommender must be real, not a hardcoded list */
  const recA = w.TSB_ONBOARD2.recommend({ mood: "building", topics: ["business"], time: "3", depth: "tactical" });
  const recB = w.TSB_ONBOARD2.recommend({ mood: "healing", topics: ["mind"], time: "25", depth: "philosophical" });
  check(recA.length === 6, "onboarding: returns 6 recommendations", String(recA.length));
  check(recA[0].reason && recA[0].reason.length > 3, "onboarding: every pick has a written reason");
  const overlap = recA.filter(x => recB.some(y => y.b.id === x.b.id)).length;
  check(overlap < 6, "onboarding: different answers give different books",
        overlap + "/6 overlap");
  check(recA.every(r => r.b && r.b.id && r.b.title), "onboarding: recommendations are real books");
}

/* ---- Phase 3: sign-in page ---- */
{
  const html = read(path.join(ROOT, "signin.html"));
  const { dom } = await mk(html, { url: "https://thesmallbook.in/signin.html?next=profile.html" });
  await tick(dom);
  const doc = dom.window.document;
  check(!!doc.getElementById("siGoogle"), "signin: Google button");
  check(!!doc.getElementById("siSkip"), "signin: skip path (never a hard wall)");
  check(doc.querySelectorAll(".si-perk").length === 3, "signin: value props shown");
  check(/terms/i.test(doc.body.textContent), "signin: legal links present");
  check(!doc.querySelector(".tsb-bar"), "signin: no app chrome on the auth screen");
}
{
  /* the You tab must route to the NEW sign-in, not the old login page */
  const pp = read(path.join(ROOT, "js", "profile-page.js"));
  check(/signin\.html\?next=/.test(pp), "signin: profile routes to the new page");
  check(!/location\.href = "login\.html"/.test(pp), "signin: old login page no longer used");
}

/* ============================================================
   SECRET SCANNING — no credential may ever enter the repo.
   The Supabase anon key is public by design (it is RLS-gated and
   ships to the browser); everything else here is a hard fail.
   ============================================================ */
{
  section("Secret scanning");

  const SECRET_PATTERNS = [
    [/\bsk_[a-zA-Z0-9]{4,}_[a-zA-Z0-9]{16,}\b/, "generic sk_ secret key"],
    [/\bsk-(ant|proj)?-?[a-zA-Z0-9_-]{24,}\b/, "AI provider secret key"],
    [/\bsk_(live|test)_[a-zA-Z0-9]{16,}\b/,    "Stripe secret key"],
    [/\brzp_live_[a-zA-Z0-9]{10,}\b/,          "Razorpay LIVE key id"],
    [/\bAIza[0-9A-Za-z_-]{35}\b/,              "Google API key"],
    [/\bghp_[A-Za-z0-9]{36}\b/,                "GitHub token"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/,       "private key block"],
    [/"?service_role"?\s*[:=]\s*"[^"]{20,}"/,   "Supabase service_role key"],
    [/RAZORPAY_KEY_SECRET\s*[:=]\s*["'][^"']{8,}["']/, "hardcoded Razorpay secret"]
  ];

  const SCAN_EXT = new Set([".js", ".html", ".json", ".md", ".css", ".yml", ".yaml"]);
  const SKIP_DIR = new Set(["node_modules", ".git", "books", "graveyard", "data"]);

  function walkAll(dir, out) {
    out = out || [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") && e.name !== ".github") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walkAll(full, out); }
      else if (SCAN_EXT.has(path.extname(e.name))) out.push(full);
    }
    return out;
  }

  const hits = [];
  for (const f of walkAll(ROOT)) {
    const src = read(f);
    for (const [re, label] of SECRET_PATTERNS) {
      const m = src.match(re);
      if (m) hits.push(path.relative(ROOT, f) + " → " + label);
    }
  }
  check(hits.length === 0, "no credentials committed to the repo", hits.slice(0, 3).join(" | "));

  /* the anon key is public, but the service_role key must never appear */
  const cfg = read(path.join(ROOT, "js", "config.js"));
  check(!/service_role/.test(cfg), "config.js: no service_role key");
  check(/SUPABASE_ANON_KEY/.test(cfg), "config.js: uses the anon key (RLS-gated, safe to ship)");

  /* secrets must be ignored if they ever land in a local env file */
  const ignore = fs.existsSync(path.join(ROOT, ".gitignore"))
    ? read(path.join(ROOT, ".gitignore")) : "";
  check(/\.env/.test(ignore), "gitignore: .env files excluded");
}

/* ============================================================
   APP VIEW IS OPT-IN — the shelf must never be unreachable.
   The feed is infinite; if it renders above the library by default you
   can never scroll to the books. This is the regression the user hit.
   ============================================================ */

/* ============================================================
   ACTIVE TAB IS PREMIUM — and there is exactly ONE rule painting it.
   A leftover mint ::before pill was stacking on top of the butter
   background, so the selected tab rendered green.
   ============================================================ */
{
  section("Active tab styling");

  const sh = read(path.join(ROOT, "css", "shell.css"));

  check(!/\.tsb-bar__item::before[^}]*background:\s*var\(--tsb-mint\)/.test(sh),
        "tab: active pill is not mint/green");
  check(/\.tsb-bar__item::before[^}]*background:\s*var\(--tsb-butter\)/.test(sh),
        "tab: active pill uses the butter accent");
  check(/\.tsb-bar__item\.is-active::before[^}]*box-shadow:\s*2px 2px 0/.test(sh),
        "tab: active pill has the hard offset shadow");
  check(/\.tsb-bar__item\.is-active\s*\{\s*background:\s*transparent/.test(sh),
        "tab: item stays transparent so nothing double-layers");

  /* only the pseudo-element may carry an active background */
  const activeBg = (sh.match(/\.tsb-bar__item\.is-active\s*\{[^}]*background:[^;]+;/g) || [])
    .filter(r => !/transparent/.test(r));
  check(activeBg.length === 0,
        "tab: exactly one source of truth for the active fill",
        activeBg.join(" | "));
}

/* ============================================================
   FEED + BETA APP VIEW REMOVED — no dead references may remain.
   ============================================================ */
{
  section("Feed removal");

  ["home.html", "js/feed.js", "css/feed.css"].forEach(f => {
    check(!fs.existsSync(path.join(ROOT, f)), "removed: " + f);
  });

  const idxSrc = read(path.join(ROOT, "index.html"));
  ["appview", "tsbFeed", "feed.js", "feed.css", "feedSection"].forEach(t => {
    check(!idxSrc.includes(t), "index.html: no '" + t + "' residue");
  });

  const swSrc = read(path.join(ROOT, "sw.js"));
  check(!/home\.html|feed\.(js|css)/.test(swSrc), "sw.js: feed assets removed from cache list");

  /* the shelf is the homepage again */
  check(/id="grid"/.test(idxSrc), "index.html: library grid is the main content");
  check(/id="library"/.test(idxSrc), "index.html: library anchor intact for the Read tab");
}

/* ============================================================
   ONBOARDING SMOOTHNESS — steps cross-fade and always settle visible.
   ============================================================ */
{
  section("Onboarding smoothness");

  const ob = read(path.join(ROOT, "js", "onboard2.js"));
  check(/is-exit/.test(ob) && /is-enter/.test(ob), "onboarding: steps cross-fade");
  check(!/transition:[^;"]*\b(width|height|top|left|margin|padding)\b/.test(ob),
        "onboarding: animates opacity/transform only");
  check(/setTimeout\(clear/.test(ob),
        "onboarding: rAF failsafe so a step can never stay invisible");
  check(/prefers-reduced-motion/.test(ob), "onboarding: honours reduced motion");

  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/index.html" });
  const w = dom.window;
  w.eval(read(path.join(ROOT, "js/data.js")));
  if (!w.BOOKS && w.window.BOOKS) w.BOOKS = w.window.BOOKS;
  w.eval(read(path.join(ROOT, "js/onboard2.js")));
  await tick(dom);
  w.TSB_ONBOARD2.force();
  await new Promise(r => setTimeout(r, 150));

  const d = w.document;
  let stuck = 0;
  for (let i = 0; i < 7; i++) {
    /* Select, let that render settle, THEN advance. Firing both in the same
       tick queues two renders ~0ms apart, which no human can do and which
       guarantees sampling mid-fade. */
    const opt = d.querySelector(".ob2 .ob2__opt, .ob2 .ob2__tile, .ob2 .ob2__quote");
    if (opt) opt.click();
    await new Promise(r => setTimeout(r, 320));

    const cta = d.querySelector(".ob2 #ob2Next, .ob2 #ob2Cta");
    if (cta && !cta.disabled) cta.click();
    /* Wait for the render to fully settle before sampling. The fade is
       120ms out + ~80ms in; step 6 also re-renders itself after ~2.5s.
       Poll rather than guess a single number. */
    const deadline = Date.now() + (i === 5 ? 4000 : 1200);
    for (;;) {
      await new Promise(r => setTimeout(r, 60));
      const ov = d.querySelector(".ob2");
      const bd = ov ? ov.querySelector(".ob2__body") : null;
      const settled = !bd ||
        (!bd.classList.contains("is-exit") && !bd.classList.contains("is-enter"));
      if (settled || Date.now() > deadline) break;
    }
    /* scope to THIS document's overlay: an earlier block leaves its own
       onboarding mounted, and getElementById would find the stale one */
    const overlay = d.querySelector(".ob2");
    const b = overlay ? overlay.querySelector(".ob2__body") : null;
    if (b && (b.classList.contains("is-exit") || b.classList.contains("is-enter"))) stuck++;
  }
  check(stuck === 0, "onboarding: every step settles fully visible", stuck + " stuck");
}

/* ============================================================
   "YOU" OPENS AS A BOTTOM SHEET — the app never leaves the screen.
   ============================================================ */
{
  section("You sheet");

  check(fs.existsSync(path.join(ROOT, "js", "sheet.js")), "sheet: js/sheet.js exists");
  const sheet = read(path.join(ROOT, "js", "sheet.js"));
  check(/translateY\(100%\)/.test(sheet), "sheet: slides up from the bottom");
  check(!/transition:[^;"]*\b(width|height|top|left|margin)\b/.test(sheet),
        "sheet: animates transform/opacity only");
  check(/prefers-reduced-motion/.test(sheet), "sheet: honours reduced motion");
  check(/setTimeout\(finish/.test(sheet), "sheet: close cannot hang on a missed transitionend");

  const shellSrc = read(path.join(ROOT, "js", "shell.js"));
  check(/function openYou/.test(shellSrc), "sheet: You tab opens the panel");
  check(/ev\.preventDefault\(\)[\s\S]{0,80}openYou/.test(shellSrc),
        "sheet: You tab does not navigate away");
  check(/profile\\.html/.test(shellSrc), "sheet: full profile page still reachable");

  /* every shell page must load sheet.js, else You silently navigates */
  const missing = [];
  for (const f of pages) {
    const rel = path.relative(ROOT, f);
    if (rel.includes(path.sep)) continue;
    if (rel === "scan.html" || rel === "signin.html") continue;
    const src = read(f);
    if (src.includes("js/shell.js") && !src.includes("js/sheet.js")) missing.push(rel);
  }
  check(missing.length === 0, "sheet: loaded on every shell page", missing.join(", "));

  /* signed out => pitch + Google; signed in => the name is shown */
  const { dom } = await mk(APP_HTML, { url: "https://thesmallbook.in/index.html" });
  const w = dom.window;
  w.eval(read(path.join(ROOT, "js/sheet.js")));
  w.eval(read(path.join(ROOT, "js/shell.js")));
  await tick(dom);

  const youTab = w.document.querySelector('[data-tab="you"]');
  check(!!youTab, "sheet: You tab present in the bar");
  youTab.click();
  await new Promise(r => setTimeout(r, 60));
  const d = w.document;
  check(!!d.querySelector(".sh-wrap.is-open"), "sheet: opens on tap");
  const cta = d.querySelector("#yoSignIn");
  check(!!cta, "sheet: signed out shows the sign-in CTA");
  check(!!cta && /Google/.test(cta.textContent), "sheet: signed out offers Google");

  /* Esc must close it */
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  check(!d.querySelector(".sh-wrap.is-open"), "sheet: Escape closes it");
}

/* ============================================================
   CHAT WEARS THE APP UI — and no rule may target a class that
   does not exist (dead CSS silently does nothing).
   ============================================================ */
{
  section("Chat in the app UI");

  const cc = read(path.join(ROOT, "css", "chat.css"));
  const block = cc.slice(cc.indexOf("CHAT IN THE APP UI"));
  check(/backdrop-filter:\s*none/.test(block), "chat: glass header replaced");
  check(/box-shadow:\s*2px 2px 0/.test(block), "chat: hard offset shadows");
  check(/var\(--tsb-butter\)/.test(block), "chat: butter accent matches the bar");
  check(!/transition:[^;]*\b(width|height|top|left|margin)\b/.test(block),
        "chat: compositor-safe transitions only");

  /* every class selector in the new block must appear in chat.html or chat.js */
  const chatHtml = read(path.join(ROOT, "chat.html"));
  const chatJs = read(path.join(ROOT, "js", "chat.js"));
  const markup = chatHtml + chatJs;
  const dead = [];
  const selectors = block.match(/^[.#][a-zA-Z0-9_-]+/gm) || [];
  [...new Set(selectors)].forEach(sel => {
    const bare = sel.slice(1);
    if (markup.includes(bare)) return;
    /* classes are often built by concatenation, e.g.
         d.className = "chat-msg chat-msg--" + who;   // -> chat-msg--me
       so also accept a BEM prefix that the code demonstrably builds. */
    const mod = bare.match(/^(.*--)([a-z0-9]+)$/);
    if (mod && markup.includes(mod[1]) &&
        new RegExp('["\']' + mod[2] + '["\']').test(markup)) return;
    dead.push(sel);
  });
  check(dead.length === 0, "chat: no CSS rules targeting non-existent elements",
        dead.join(", "));
}

/* ============================================================
   MOBILE STATUS BAR + DEAD CODE
   ============================================================ */
{
  section("Mobile status bar");

  /* viewport-fit=cover is required for env(safe-area-inset-*) to resolve.
     Without it the bar sits under the notch and the home indicator. */
  const noVF = [], noTC = [], staleTC = [];
  for (const f of pages) {
    const rel = path.relative(ROOT, f);
    if (rel === "scan.html") continue;          // fullscreen camera takeover
    const src = read(f);

    const vp = src.match(/<meta name="viewport" content="([^"]*)"/);
    if (vp && !/viewport-fit=cover/.test(vp[1])) noVF.push(rel);

    if (!/name="theme-color"/.test(src)) { noTC.push(rel); continue; }

    /* the status bar must be correct at FIRST PAINT, not after JS runs */
    if (/pre-paint theme/.test(src)) {
      const after = src.split("pre-paint theme")[1].slice(0, 900);
      if (!/theme-color/.test(after)) staleTC.push(rel);
    }
  }
  check(noVF.length === 0, "status bar: viewport-fit=cover everywhere",
        noVF.length + " missing: " + noVF.slice(0, 3).join(", "));
  check(noTC.length === 0, "status bar: theme-color on every page",
        noTC.slice(0, 3).join(", "));
  check(staleTC.length === 0,
        "status bar: colour set pre-paint (no yellow flash in dark mode)",
        staleTC.length + " stale: " + staleTC.slice(0, 3).join(", "));

  /* safe-area tokens must exist and be used by the bar */
  const tk = read(path.join(ROOT, "css", "tokens.css"));
  check(/--safe-b:\s*env\(safe-area-inset-bottom/.test(tk), "status bar: safe-area tokens defined");
  const sh = read(path.join(ROOT, "css", "shell.css"));
  check(/safe-b|safe-area-inset-bottom/.test(sh), "status bar: bottom bar respects the home indicator");

  section("Dead code");

  ["js/ask.js", "js/scanner.js", "js/onboard.js"].forEach(f => {
    check(!fs.existsSync(path.join(ROOT, f)), "removed dead file: " + f);
  });

  /* nothing may reference a script that no longer exists */
  const broken = [];
  for (const f of pages) {
    const rel = path.relative(ROOT, f);
    const src = read(f);
    for (const m of src.matchAll(/<script[^>]+src="([^"]+)"/g)) {
      const ref = m[1];
      if (/^https?:/.test(ref)) continue;
      const abs = path.resolve(path.dirname(f), ref);
      if (!fs.existsSync(abs)) broken.push(rel + " -> " + ref);
    }
  }
  check(broken.length === 0, "no page references a missing script",
        broken.slice(0, 3).join(" | "));

  /* the old login page must not be a user-facing destination, but it IS the
     registered Google OAuth redirect URI, so the file has to stay */
  check(fs.existsSync(path.join(ROOT, "login.html")),
        "login.html kept (registered OAuth redirect URI)");
  const authSrc = read(path.join(ROOT, "js", "auth.js"));
  check(!/href="login\.html"/.test(authSrc),
        "auth.js: no user-facing links to the old login page");
  /* BOTH OAuth callbacks must stay on login.html - it is what is registered
     in Google Cloud Console. Changing either silently breaks sign-in. */
  const oauthRefs = (authSrc.match(/SITE_ORIGIN \+ "\/login\.html"/g) || []).length;
  check(oauthRefs === 2,
        "auth.js: both OAuth callbacks still point at login.html",
        oauthRefs + " of 2");

  /* heavy engines must not load where they are never used */
  const ttsPages = pages.filter(f => read(f).includes("tts-engine.js"))
                        .map(f => path.relative(ROOT, f));
  check(ttsPages.every(p => p === "book.html" || p.startsWith("books" + path.sep)),
        "tts-engine only on reading pages", ttsPages.slice(0, 3).join(", "));
}

/* ============================================================
   SPEED + POST-LOGIN STATE
   ============================================================ */
{
  section("Speed");

  /* The homepage must not ship the 3.4 MB data.js as a blocking script. */
  const idx = read(path.join(ROOT, "index.html"));
  check(!/<script src="js\/data\.js">/.test(idx),
        "speed: index.html does not block on the 3.4MB data.js");
  check(/data-loader\.js/.test(idx), "speed: index.html uses the lazy data loader");

  function blockingKB(rel) {
    const src = read(path.join(ROOT, rel));
    let total = 0;
    for (const m of src.matchAll(/<script src="([^"]+)"/g)) {
      const p = path.resolve(path.dirname(path.join(ROOT, rel)), m[1]);
      if (fs.existsSync(p)) total += fs.statSync(p).size;
    }
    return Math.round(total / 1024);
  }
  const kb = blockingKB("index.html");
  check(kb < 800, "speed: homepage blocking JS under 800KB", kb + "KB");

  /* the index must actually contain what the shelf needs */
  const index = JSON.parse(read(path.join(ROOT, "data", "books-index.json")));
  check(index.length === 350, "speed: index has all 350 books", String(index.length));
  const lessons = index.reduce((n, b) => n + (b.lessons ? b.lessons.length : 0), 0);
  check(lessons === 2176, "speed: index carries all 2176 lessons", String(lessons));
  ["id","title","author","category","cover","readTime","tagline","lessons"].forEach(f => {
    check(Object.prototype.hasOwnProperty.call(index[0], f), "speed: index has ." + f);
  });

  /* app.js must tolerate BOOKS arriving late, or the shelf renders empty */
  const app = read(path.join(ROOT, "js", "app.js"));
  check(/tsb:data-ready/.test(app), "speed: app.js waits for async data");
  check(/function tsbApp/.test(app), "speed: app.js re-entry is strict-mode safe");

  section("Post-login state");

  /* login.html is the OAuth callback only - it must never show its own
     legacy welcome screen, which is the "old window" users reported. */
  const lg = read(path.join(ROOT, "login.html"));
  check(/location\.replace\(back\)/.test(lg),
        "login: bounces back to the app after OAuth");

  /* exactly ONE auth UI: the shell's You tab, not the legacy top-right chip */
  const auth = read(path.join(ROOT, "js", "auth.js"));
  check(/querySelector\("\.tsb-bar"\)/.test(auth),
        "login: legacy nav chip stands down where the shell exists");

  const { dom } = await mk(read(path.join(ROOT, "index.html")),
                           { url: "https://thesmallbook.in/index.html" });
  const w = dom.window;
  w.eval(read(path.join(ROOT, "js/config.js")));
  w.eval(read(path.join(ROOT, "js/auth.js")));
  await tick(dom);
  await new Promise(r => setTimeout(r, 120));
  const slot = w.document.getElementById("tsb-nav-auth");
  check(!slot || slot.innerHTML.trim() === "",
        "login: no duplicate auth chip on shell pages",
        slot ? slot.innerHTML.slice(0, 40) : "");
}

/* ============================================================
   NO DUPLICATE AUTH SURFACES — every function that paints account
   UI must stand down where the app shell exists.

   The previous version of this check only tested renderNav(). A second
   function, renderChip(), was left unguarded and shipped a legacy chip
   on 8 pages. Assert on ALL of them.
   ============================================================ */
{
  section("Single auth surface");

  const auth = read(path.join(ROOT, "js", "auth.js"));

  /* every function that writes into an auth slot must consult shellPresent() */
  check(/function shellPresent\(\)/.test(auth),
        "auth: one shared shell test, not copies that can drift");
  const painters = ["renderNav", "renderChip"];
  painters.forEach(fn => {
    const i = auth.indexOf("function " + fn + "(");
    check(i > -1, "auth: " + fn + " exists");
    if (i < 0) return;
    /* body = up to the next top-level "  function " */
    const rest = auth.slice(i + 1);
    const end = rest.indexOf("\n  function ");
    const body = end > -1 ? rest.slice(0, end) : rest;
    check(/shellPresent\(\)/.test(body),
          "auth: " + fn + " stands down when the shell is present");
  });

  /* and prove it in a real DOM, on every shell page */
  const LEGACY = [".tsb-auth-chip", ".tsb-loginbtn", ".tsb-navchip", ".aq-fab"];
  const offenders = [];
  for (const rel of ["index.html", "stories.html", "graveyard.html",
                     "about.html", "book.html", "story.html"]) {
    const { dom } = await mk(read(path.join(ROOT, rel)),
                             { url: "https://thesmallbook.in/" + rel });
    const w = dom.window;
    w.eval(read(path.join(ROOT, "js/config.js")));
    w.eval(read(path.join(ROOT, "js/auth.js")));
    await tick(dom);
    await new Promise(r => setTimeout(r, 80));
    const hit = LEGACY.filter(sel => w.document.querySelector(sel));
    if (hit.length) offenders.push(rel + " -> " + hit.join(","));
    w.close();
  }
  check(offenders.length === 0,
        "auth: no legacy auth UI renders on shell pages",
        offenders.slice(0, 3).join(" | "));
}

/* ============================================================
   SCROLL REVEAL MUST FAIL OPEN
   .reveal sets opacity:0 and IntersectionObserver removes it. If the
   observer is missing or throws, the content stays invisible forever —
   a blank page. Never add .reveal unless the observer exists.
   ============================================================ */
{
  section("Reveal safety");

  ["js/app.js", "js/book.js", "js/graveyard.js"].forEach(f => {
    const src = read(path.join(ROOT, f));
    if (!/new IntersectionObserver/.test(src)) return;
    check(/"IntersectionObserver" in window/.test(src),
          f + ": feature-detects IntersectionObserver");
  });

  /* simulate a browser without IO: content must still be visible */
  const { dom } = await mk(read(path.join(ROOT, "index.html")),
                           { url: "https://thesmallbook.in/index.html" });
  const w = dom.window;
  delete w.IntersectionObserver;
  w.eval(read(path.join(ROOT, "js/config.js")));
  /* Minimal TSB stub: prefs.js starts timers that never settle under jsdom.
     A Proxy answers any method app.js reaches for, so this test stays about
     IntersectionObserver rather than tracking the prefs API surface. */
  w.eval([
    'function tsbStub(){',
    '  var f=function(){return false;};',
    '  return new Proxy(f,{',
    '    get:function(t,k){',
    '      if(k==="get")return function(a,d){return d;};',
    '      if(k===Symbol.toPrimitive||k==="then")return undefined;',
    '      return tsbStub();',
    '    },',
    '    apply:function(){return false;}',
    '  });',
    '}',
    'window.TSB=tsbStub();'
  ].join(''));
  w.eval(read(path.join(ROOT, "js/data.js")));
  if (!w.BOOKS && w.window.BOOKS) w.BOOKS = w.window.BOOKS;
  let threw = null;
  try { w.eval(read(path.join(ROOT, "js/app.js"))); }
  catch (e) { threw = e.message; }
  await tick(dom);
  check(!threw, "reveal: app.js survives a missing IntersectionObserver", threw || "");
  const stuck = w.document.querySelectorAll(".reveal:not(.in)").length;
  check(stuck === 0, "reveal: nothing left invisible without an observer",
        stuck + " hidden");
}

/* ============================================================
   CATEGORY PILLS MUST NOT EAT THE SCREEN
   11 pills, labels up to 19 chars. Wrapping put EIGHT rows (~324px) above
   the first book on a 320px phone. Must stay one scrollable row.
   ============================================================ */
{
  section("Category pills");

  const sh = read(path.join(ROOT, "css", "shell.css"));
  const i = sh.indexOf("CATEGORY PILLS");
  check(i > -1, "pills: mobile rule exists");
  const blk = i > -1 ? sh.slice(i, i + 2000) : "";

  check(/flex-wrap:\s*nowrap/.test(blk), "pills: single row, never wrapped");
  check(/overflow-x:\s*auto/.test(blk), "pills: row scrolls horizontally");
  check(/white-space:\s*nowrap/.test(blk), "pills: labels do not break mid-word");
  check(/scroll-snap-type/.test(blk), "pills: scroll snapping for a native feel");
  check(/max-width:\s*60vw/.test(blk), "pills: long labels capped, cannot span the screen");
  check(/text-overflow:\s*ellipsis/.test(blk), "pills: capped labels ellipsize");
  check(/::-webkit-scrollbar\s*\{\s*display:\s*none/.test(blk),
        "pills: no scrollbar chrome on mobile");

  /* the row must be inside a mobile media query, not applied on desktop */
  const mq = sh.slice(Math.max(0, i - 200), i + 40);
  check(/@media\s*\(max-width:\s*760px\)/.test(sh.slice(i, i + 400)) ||
        /@media/.test(mq), "pills: scoped to small screens only");

  /* count what actually renders, so a data change that adds categories
     cannot silently reintroduce the wall */
  const idx = JSON.parse(read(path.join(ROOT, "data", "books-index.json")));
  const cats = [...new Set(idx.map(b => b.category))];
  check(cats.length <= 12, "pills: category count stays sane",
        cats.length + " categories");
}

/* ============================================================
   BAR TRANSFORM INTEGRITY
   .tsb-bar is centred with left:50% + translateX(-50%). Any rule that
   re-declares transform MUST re-state translateX(-50%), or the bar slides
   sideways instead of straight down.
   ============================================================ */
{
  section("Bar transform");

  const sh = read(path.join(ROOT, "css", "shell.css"));
  const bad = [];
  /* every transform declaration inside a .tsb-bar rule */
  const re = /([^{}]*\.tsb-bar[^{}]*)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(sh))) {
    const sel = m[1].trim(), body = m[2];
    if (/\.tsb-bar__/.test(sel)) continue;      // children are not centred
    const t = body.match(/transform:\s*([^;]+);/);
    if (!t) continue;
    if (/none/.test(t[1])) continue;
    if (!/translateX\(-50%\)/.test(t[1])) bad.push(sel + " -> " + t[1].trim().slice(0, 60));
  }
  check(bad.length === 0,
        "bar: every transform keeps translateX(-50%) centering",
        bad.slice(0, 3).join(" | "));
}

  report();
}

main().catch(e => { console.error(e); process.exit(1); });

function report() {
  const total = pass + fails.length;
  console.log("\n" + "=".repeat(56));
  console.log(`  PASS ${pass}/${total}` + (fails.length ? `   FAIL ${fails.length}` : "   — all green"));
  console.log("=".repeat(56));
  if (fails.length) {
    console.log("\nFAILURES:");
    fails.forEach(f => console.log("  ✗ " + f));
    process.exitCode = 1;
  }
  /* jsdom windows keep timers alive, which held the process open for
     minutes after the results were already printed. Results are final
     here, so exit deterministically. */
  process.exit(fails.length ? 1 : 0);
}
