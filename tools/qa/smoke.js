/* Phase 1 self-check. Fails loudly on console errors, 404s,
   horizontal scroll, missing shell, or broken theming. */
const { chromium, devices } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8000";

const PAGES = [
  ["home",      "/index.html"],
  ["book",      "/book.html?id=atomic-habits"],
  ["seo-book",  "/books/atomic-habits.html"],
  ["graveyard", "/graveyard.html"],
  ["seo-grave", "/graveyard/thomas-cook.html"],
  ["stories",   "/stories.html"],
  ["about",     "/about.html"],
  ["gold",      "/gold.html"],
  ["login",     "/login.html"],
  ["404",       "/404.html"],
];
const VIEWPORTS = [
  ["mobile-360", { width: 360, height: 740 }],
  ["mobile-390", { width: 390, height: 844 }],
  ["tablet-768", { width: 768, height: 1024 }],
  ["desktop",    { width: 1440, height: 900 }],
];

let fail = 0, pass = 0;
const bad = [];
function check(ok, label, detail) {
  if (ok) { pass++; }
  else { fail++; bad.push(`${label}${detail ? " → " + detail : ""}`); }
}

(async () => {
  const browser = await chromium.launch();

  for (const [vpName, viewport] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport, userAgent: devices["Pixel 7"].userAgent });

    for (const [name, url] of PAGES) {
      const page = await ctx.newPage();
      const errors = [], notFound = [];

      page.on("console", m => {
        if (m.type() === "error") {
          const t = m.text();
          if (/favicon|OneSignal|supabase|Failed to load resource/i.test(t)) return;
          errors.push(t);
        }
      });
      page.on("pageerror", e => errors.push("pageerror: " + e.message));
      page.on("response", r => {
        if (r.status() === 404 && !/favicon|OneSignalSDK/i.test(r.url())) {
          notFound.push(r.url().replace(BASE, ""));
        }
      });

      try {
        await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 25000 });
      } catch (e) {
        check(false, `${vpName}/${name} load`, e.message.split("\n")[0]);
        await page.close();
        continue;
      }
      await page.waitForTimeout(600);

      const tag = `${vpName}/${name}`;
      check(errors.length === 0, `${tag} console`, errors.slice(0, 2).join(" | "));
      check(notFound.length === 0, `${tag} 404s`, notFound.slice(0, 3).join(", "));

      // HARD RULE: no horizontal scroll, ever
      const overflow = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
      check(overflow <= 1, `${tag} h-scroll`, overflow ? `${overflow}px` : "");

      // tokens actually applied
      const tokenOK = await page.evaluate(() =>
        !!getComputedStyle(document.documentElement).getPropertyValue("--surface-0").trim());
      check(tokenOK, `${tag} tokens`);

      // bottom bar: present on app pages, absent on anonymous SEO pages
      const hasBar = await page.evaluate(() => !!document.querySelector(".tsb-bar"));
      const isSEO = name.startsWith("seo-");
      const isStandalone = ["login", "404"].includes(name);
      if (isSEO || isStandalone) check(!hasBar, `${tag} bar-absent`, hasBar ? "bar leaked onto SEO/standalone page" : "");
      else check(hasBar, `${tag} bar-present`, hasBar ? "" : "missing bottom bar");

      // bar must clear the safe area and never cover content
      if (hasBar && !isSEO) {
        const r = await page.evaluate(() => {
          const b = document.querySelector(".tsb-bar").getBoundingClientRect();
          return { w: b.width, h: b.height, vw: innerWidth };
        });
        check(r.w <= r.vw, `${tag} bar-width`, `${r.w}>${r.vw}`);
        check(r.h >= 44, `${tag} bar-height`, `${r.h}px`);
      }
      await page.close();
    }
    await ctx.close();
  }

  // ---- theme engine ----
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
  for (const mode of ["dark", "light", "auto"]) {
    await p.evaluate(m => window.TSB_THEME.set(m), mode);
    const st = await p.evaluate(() => ({
      attr: document.documentElement.getAttribute("data-theme"),
      stored: localStorage.getItem("tsb_theme"),
      bg: getComputedStyle(document.body).backgroundColor,
    }));
    check(st.attr === mode, `theme ${mode} attr`, st.attr);
    check(st.stored === JSON.stringify(mode), `theme ${mode} persist`, st.stored);
  }
  // dark must survive reload with no flash-of-light
  await p.evaluate(() => window.TSB_THEME.set("dark"));
  await p.reload({ waitUntil: "domcontentloaded" });
  const darkAfter = await p.evaluate(() => document.documentElement.classList.contains("dark"));
  check(darkAfter, "theme persists across reload");

  // ---- data loader ----
  const d = await p.evaluate(async () => {
    const idx = await window.TSB_DATA.ready();
    const one = await window.TSB_DATA.book("atomic-habits");
    return { n: idx.length, lessons: idx.reduce((a, b) => a + b.lessons.length, 0),
             title: one.title, hasBody: !!(one.lessons && one.lessons[0].summary) };
  });
  check(d.n === 350, "loader: 350 books", String(d.n));
  check(d.lessons === 2176, "loader: 2176 lessons", String(d.lessons));
  check(d.title === "Atomic Habits", "loader: shard fetch", d.title);
  check(d.hasBody, "loader: shard has lesson bodies");

  await browser.close();

  console.log(`\n${"=".repeat(52)}\nPASS ${pass}   FAIL ${fail}\n${"=".repeat(52)}`);
  if (bad.length) { console.log("\nFAILURES:"); bad.forEach(b => console.log("  ✗ " + b)); }
  process.exit(fail ? 1 : 0);
})();
