/* Build 418 runtime verification (Playwright, server on 8414).
   TSB.store + identity + telemetry live, notes outbox durable,
   served history written through the store, the renamed graves
   and merged Ask pages serve, learning shelf is full, and both
   readers stay clean on a phone. */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8414";
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra || ""); }
}

async function seeded(browser, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("tsb_onboarded", "true");
      localStorage.setItem("tsb_onboard_v", "393");
      localStorage.setItem("tsb_theme", JSON.stringify("light"));
      localStorage.setItem("tsb_lang", JSON.stringify("en"));
      localStorage.setItem("tsb_splash", "1");
    } catch (e) {}
  });
  return ctx;
}

(async () => {
  const browser = await chromium.launch();

  /* ---- home page: the new services are live ---- */
  {
    const ctx = await seeded(browser, 390, 844);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1200);
    const probe = await page.evaluate(() => {
      const out = {};
      out.store = !!(window.TSB && TSB.store);
      out.keys = out.store ? TSB.store.KEYS.length : 0;
      out.identity = !!(window.TSB && TSB.identity && typeof TSB.identity.isGold === "function" && typeof TSB.identity.isAdmin === "function");
      out.telemetry = !!(window.TSB && TSB.telemetry);
      out.summary = out.telemetry ? TSB.telemetry.summary() : null;
      out.served = null;
      try { out.served = JSON.parse(localStorage.getItem("tsb_served") || "null"); } catch (e) {}
      if (out.store) { TSB.store.rawSet("tsb_reader_pos_probe", 7); out.roundTrip = TSB.store.rawGet("tsb_reader_pos_probe", ""); }
      out.build = window.TSB_BUILD || "";
      return out;
    });
    ok("418: TSB.store live with the registry", probe.store && probe.keys >= 12, JSON.stringify(probe.keys));
    ok("418: one identity service answers", probe.identity);
    ok("418: telemetry summary computes real numbers", !!probe.summary && typeof probe.summary.lessonsRead === "number");
    ok("418: served history is written on the home page", !!(probe.served && Object.keys(probe.served).length), JSON.stringify(probe.served || {}).slice(0, 60));
    ok("418: store raw round-trip keeps the position format", probe.roundTrip === "7", probe.roundTrip);
    ok("418: build stamp says 418", probe.build === "418", probe.build);
    ok("418: home page has no page errors", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  /* ---- notes: the outbox survives a reload ---- */
  {
    const ctx = await seeded(browser, 390, 844);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/notes.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForFunction(() => !!window.TSB_NOTES_STORE, null, { timeout: 15000 }).catch(() => {});
    const made = await page.evaluate(() => {
      const n = TSB_NOTES_STORE.create({ title: "Verify418 note", pages: ["<p>outbox check</p>"] });
      return { id: n.id, outbox: JSON.parse(localStorage.getItem("tsb_outbox_v1_guest") || "[]") };
    });
    ok("418: a new note lands in the durable outbox", made.outbox.indexOf(made.id) >= 0, JSON.stringify(made.outbox));
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForFunction(() => !!window.TSB_NOTES_STORE, null, { timeout: 15000 }).catch(() => {});
    const after = await page.evaluate((id) => ({
      outbox: JSON.parse(localStorage.getItem("tsb_outbox_v1_guest") || "[]"),
      listed: TSB_NOTES_STORE.list().some((n) => n.id === id)
    }), made.id);
    ok("418: outbox and note survive a reload", after.outbox.indexOf(made.id) >= 0 && after.listed);
    ok("418: notes page has no page errors", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  /* ---- renamed graves, true Theranos, merged Ask, learning shelf ---- */
  {
    const ctx = await seeded(browser, 1280, 800);
    const page = await ctx.newPage();
    const cases = [
      ["/graveyard/delorean-motor.html", "Why Did DeLorean Fail?", 200],
      ["/graveyard/zynga-games.html", "Why Did Zynga Fail?", 200],
      ["/graveyard/fitbit-fade.html", "Why Did Fitbit Fail?", 200],
      ["/graveyard/gopro-peak.html", "Why Did GoPro Fail?", 200],
      ["/graveyard/faraday-future.html", "Why Did Faraday Future Fail?", 200],
      ["/graveyard/zirtual-vanish.html", "Why Did Zirtual Fail?", 200],
      ["/graveyard/gomechanic-fraud.html", "", 404],
      ["/graveyard/hammer-broke.html", "", 404],
      ["/ask/become-confident.html", "", 404],
      ["/ask/learn-fast.html", "", 404]
    ];
    for (const [path, h1, status] of cases) {
      const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded" }).catch(() => null);
      const code = res ? res.status() : 0;
      if (status === 200) {
        const text = await page.evaluate(() => (document.querySelector("h1") || {}).textContent || "");
        ok("418: " + path + " serves " + h1, code === 200 && text.indexOf(h1) === 0, code + " " + text.slice(0, 40));
      } else {
        ok("418: " + path + " is gone", code === 404, String(code));
      }
    }
    const res = await page.goto(BASE + "/graveyard/theranos-board.html", { waitUntil: "domcontentloaded" });
    const body = await page.evaluate(() => document.body.textContent || "");
    ok("418: theranos-board tells the Theranos story", res.status() === 200 && body.includes("Elizabeth Holmes") && !body.includes("Katerra"));
    await page.goto(BASE + "/topics/learning.html", { waitUntil: "domcontentloaded" });
    const cards = await page.evaluate(() => document.querySelectorAll(".hubcard").length);
    ok("418: the learning shelf is full", cards >= 40, String(cards));
    await page.goto(BASE + "/ask/index.html", { waitUntil: "domcontentloaded" });
    const askBody = await page.evaluate(() => document.body.textContent || "");
    ok("418: Ask index counts the merged library", askBody.includes("78 questions") && !askBody.includes("83 questions"));
    await ctx.close();
  }

  /* ---- both readers stay clean on a phone ---- */
  for (const [label, url] of [["film reader", "/book.html?id=atomic-habits"], ["rm reader", "/reader.html?id=atomic-habits"]]) {
    const ctx = await seeded(browser, 390, 844);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    const geo = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    ok("418: " + label + " has no horizontal overflow on a phone", geo.sw <= geo.iw + 1, JSON.stringify(geo));
    ok("418: " + label + " has no page errors", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  await browser.close();
  console.log("VERIFY418: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
