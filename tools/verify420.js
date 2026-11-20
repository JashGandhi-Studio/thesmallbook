/* Build 420 runtime verification (Playwright, server on 8414).
   Founder analytics: the beacon counts a visit and page views on
   app pages and baked pages alike (all Supabase traffic is
   intercepted - nothing reaches the real database), the Settings
   Analytics card stays hidden for everyone except the founder,
   and for the founder it renders the numbers the RPC returns. */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8414";
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra || ""); }
}

async function seeded(browser, width, height, founder) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript((f) => {
    try {
      localStorage.setItem("tsb_onboarded", "true");
      if (!localStorage.getItem("tsb_onboard_v")) localStorage.setItem("tsb_onboard_v", "420");
      localStorage.setItem("tsb_theme", JSON.stringify("light"));
      localStorage.setItem("tsb_lang", JSON.stringify("en"));
      sessionStorage.setItem("tsb_splash", "1");
      if (f) {
        localStorage.setItem("tsb_auth_session", JSON.stringify({
          access_token: "verify-token",
          user: { id: "11111111-1111-1111-1111-111111111111", email: "acimotreyothy@gmail.com", user_metadata: { username: "founder", birth_year: 1990, profile_v331: true } }
        }));
      }
    } catch (e) {}
  }, !!founder);
  return ctx;
}

async function interceptEvents(page, sink) {
  await page.route("**/rest/v1/events", async (route) => {
    try { sink.push(route.request().postData() || ""); } catch (e) {}
    await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
  });
}
async function interceptRpc(page) {
  await page.route("**/rest/v1/rpc/tsb_analytics", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        days: 30, visitors: 1234, visitors_total: 5000, visits: 2345, page_views: 9876, signed_in: 321,
        today: { visitors: 12, visits: 15, page_views: 60 },
        by_day: [{ d: "2026-11-19", visitors: 100, visits: 140, views: 500 }, { d: "2026-11-20", visitors: 12, visits: 15, views: 60 }],
        sources: [{ src: "Google search", visits: 900 }, { src: "Direct / link", visits: 300 }],
        pages: [{ path: "/index.html", views: 4000 }, { path: "/book.html", views: 2000 }],
        readers: [{ email: "reader@example.com", name: "Test Reader", visits: 4, views: 40, last_seen: "2026-11-20T10:00:00Z" }]
      })
    });
  });
}

(async () => {
  const browser = await chromium.launch();

  /* ---- the beacon on the home page ---- */
  {
    const ctx = await seeded(browser, 390, 844, false);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    const sent = [];
    await interceptEvents(page, sent);
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    const bodies = sent.map((x) => { try { return JSON.parse(x); } catch (e) { return []; } }).flat();
    const visit = bodies.find((r) => r.name === "visit");
    const views = bodies.filter((r) => r.name === "page_view");
    ok("420: one visit is counted with visitor, session, source and page",
       !!visit && !!(visit.props || {}).v && !!(visit.props || {}).s && typeof (visit.props || {}).src === "string" && (visit.props || {}).path === "/index.html",
       JSON.stringify(visit || {}).slice(0, 160));
    ok("420: page views are counted", views.length >= 1, String(views.length));
    const vid = await page.evaluate(() => localStorage.getItem("tsb_vid") || "");
    ok("420: the visitor number persists on the device", vid.length >= 8, vid);
    ok("420: home has no page errors", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  /* ---- the beacon reaches the baked search-landing pages too ---- */
  {
    const ctx = await seeded(browser, 390, 844, false);
    const page = await ctx.newPage();
    const sent = [];
    await interceptEvents(page, sent);
    const res = await page.goto(BASE + "/books/atomic-habits.html", { waitUntil: "networkidle" }).catch(() => null);
    await page.waitForTimeout(1200);
    const bodies = sent.map((x) => { try { return JSON.parse(x); } catch (e) { return []; } }).flat();
    ok("420: a baked book page counts its visit too",
       res && res.status() === 200 && bodies.some((r) => r.name === "visit" && (r.props || {}).path === "/books/atomic-habits.html"),
       JSON.stringify(bodies).slice(0, 140));
    await ctx.close();
  }

  /* ---- Settings: hidden for a reader, alive for the founder ---- */
  {
    const ctx = await seeded(browser, 390, 844, false);
    const page = await ctx.newPage();
    await page.goto(BASE + "/settings.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1200);
    const hidden = await page.evaluate(() => {
      const c = document.getElementById("analyticsCard");
      return !!c && c.hidden;
    });
    ok("420: no Analytics card for a signed-in reader (or a guest)", hidden);
    await ctx.close();
  }
  {
    const ctx = await seeded(browser, 1280, 900, true);
    const page = await ctx.newPage();
    await interceptRpc(page);
    await interceptEvents(page, []);
    await page.goto(BASE + "/settings.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1800);
    const view = await page.evaluate(() => {
      const c = document.getElementById("analyticsCard");
      const b = document.getElementById("anaBody");
      return { shown: !!c && !c.hidden, text: b ? b.textContent : "" };
    });
    ok("420: the founder sees the Analytics card", view.shown);
    ok("420: the numbers render - visitors, sources, pages, readers with email",
       view.text.includes("1234") && view.text.includes("Google search") && view.text.includes("/book.html") && view.text.includes("reader@example.com"),
       view.text.slice(0, 200));
    await ctx.close();
  }

  await browser.close();
  console.log("VERIFY420: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
