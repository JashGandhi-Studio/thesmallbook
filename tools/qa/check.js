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
  if (!src.includes("js/shell.js")) noShell.push(rel);
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
check(/CACHE_VERSION = "tsb-v170"/.test(sw), "cache version bumped (existing users get fresh files)");
for (const a of ["css/tokens.css", "css/shell.css", "js/theme.js", "js/shell.js",
                 "js/data-loader.js", "data/books-index.json"]) {
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
  check(doc.querySelector('[data-tab="home"]').classList.contains("is-active"), "Home active on index");
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
}
