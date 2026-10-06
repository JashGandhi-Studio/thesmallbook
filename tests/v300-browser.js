/* v300 browser QA: mindpick daily + picker, quota card, pseo pages, sitemap */
const { chromium } = require("playwright");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, name, extra) => { if (c) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ FAIL: " + name + (extra ? " | " + extra : "")); } };
const BASE = "http://127.0.0.1:8799";

(async () => {
  const browser = await chromium.launch();

  const killNudge = async (page) => {
    /* the hands-free nudge shows once; a reader dismisses it and moves on */
    const n = page.locator(".tss-nudge__x");
    if (await n.count()) { try { await n.click({ timeout: 1500 }); } catch (e) {} }
    await sleep(400);
  };

  /* ---- 1. homepage: daily card on first open, dismiss, stays gone ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem("tsb_onboarded", "true"); /* returning reader: onboarding stays out of the way */
      localStorage.setItem("tsb_supportbar_seen", "true");
      localStorage.setItem("tsb_scroller_nudge_done", "true");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(3200);
    await killNudge(page);
    await sleep(2600); /* the daily card lands right after the nudge is out of the way */
    ok(await page.locator("#mindpick .mp").count() >= 1, "mindpick block mounts on the homepage");
    ok(await page.locator("#mpDaily").count() === 1, "first open of the day shows exactly one daily question");
    ok(await page.locator("#mpDaily .mp-q, #mpDaily .mp-quote").count() >= 1, "the daily card carries a question or a quote");
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem("tsb_mindpick_day") || "null"))) !== null, "the day is marked the moment the card shows");
    await page.locator("#mpDailyX").click();
    await sleep(400);
    ok(await page.locator("#mpDaily").count() === 0, "the dismiss (x) cancels the daily card");
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(3200);
    await killNudge(page);
    await sleep(2600);
    ok(await page.locator("#mpDaily").count() === 0, "second visit the same day: no daily nag");
    /* picker: chip -> 3 real books + one action */
    await page.locator('#mpChips .mp-chip[data-mppick="money"]').click();
    await sleep(600);
    ok(await page.locator("#mpResult .mp-book").count() === 3, "a problem chip hands back exactly 3 books");
    ok(await page.locator("#mpResult .mp-action").count() === 1, "plus one thing to do this week");
    const hrefs = await page.locator("#mpResult .mp-book").evaluateAll(els => els.map(e => e.getAttribute("href")));
    ok(hrefs.every(h => /^book\.html\?id=/.test(h)), "the 3 books deep-link to real reader pages", hrefs.join(","));
    const coversOk = await page.locator("#mpResult .mp-book img").evaluateAll(els => els.every(i => i.naturalWidth > 10));
    ok(coversOk, "every suggested book cover actually loads");
    /* typed query routes too */
    await page.locator("#mpAgain").click();
    await page.fill("#mpInput", "i cant stop procrastinating on my side project");
    await page.locator("#mpGo").click();
    await sleep(500);
    ok(await page.locator("#mpResult .mp-book").count() === 3, "free typing routes to 3 books too");
    ok((await page.locator("#mpResult").textContent()).toUpperCase().includes("PROCRASTINAT"), "the typed problem is named back accurately");
    ok(errs.length === 0, "no page errors on the new homepage", errs.join(" || "));
    await ctx.close();
  }

  /* ---- 2. pseo: a like page, a best page, a vs page, the hub ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    for (const [path, sel, name] of [
      ["/pseo/books-like/atomic-habits.html", ".pseo__item", "books-like lists 10 items"],
      ["/pseo/best-books-on/habits.html", ".pseo__item", "best-books-on lists items"],
      ["/pseo/vs/atomic-habits-vs-power-of-habit.html", ".pseo__vcol", "vs page renders both columns"],
      ["/pseo/index.html", ".pseo__hub", "the hub lists every list"],
    ]) {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
      await sleep(400);
      ok(await page.locator(sel).count() >= (path.includes("vs") ? 2 : path.includes("index") ? 3 : 5), name, await page.locator(sel).count() + "");
      const covers = await page.locator("img.pseo__cover, .pseo__vcol img").evaluateAll(els => els.every(i => !i.src || i.naturalWidth > 0));
      ok(covers, "covers load: " + path);
    }
    ok(errs.length === 0, "no page errors on pseo pages", errs.join(" || "));
    /* a book link from a list lands on the reader */
    await page.goto(BASE + "/pseo/best-books-on/habits.html", { waitUntil: "domcontentloaded" });
    await page.locator(".pseo__itemlink").first().click();
    await sleep(1200);
    ok(page.url().includes("/books/"), "a list link opens the real reader", page.url());
    await ctx.close();
  }

  /* ---- 3. ask quota: dormant while the wall is off, honest card when on ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem("tsb_onboarded", "true");
      localStorage.setItem("tsb_supportbar_seen", "true");
      localStorage.setItem("tsb_scroller_nudge_done", "true");
    });
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    await sleep(700);
    /* wall off: quota must be dormant */
    const dormant = await page.evaluate(() => !(window.TSB_ASK_QUOTA && TSB_ASK_QUOTA.blocked && TSB_ASK_QUOTA.blocked()));
    ok(dormant, "wall off: the free day is dormant, nothing blocks");
    /* wall on, quota unused */
    const onFree = await page.evaluate(() => {
      TSB_CONFIG.PAYWALL.ENABLED = true;
      return !TSB_ASK_QUOTA.blocked();
    });
    ok(onFree, "wall on, fresh day: questions still flow");
    /* wall on, quota used up */
    const quotaCard = await page.evaluate(() => {
      const now = Date.now();
      localStorage.setItem("tsb_ask_quota", JSON.stringify({ t0: now, used: 5 }));
      return TSB_ASK_QUOTA.blocked();
    });
    ok(quotaCard, "5 questions in the rolling window: honestly blocked");
    const meter = await page.evaluate(() => TSB_ASK_QUOTA.meterText());
    ok(/free window used/.test(meter), "the header meter speaks plainly when used up: " + meter);
    const clock = await page.evaluate(() => TSB_ASK_QUOTA.resetClock());
    ok(/h/.test(clock), "the reset clock is honest: " + clock);
    /* the card renders with the gold CTA, no em dash */
    await page.evaluate(() => { TSB_ASK.open(); });
    await sleep(500);
    const cardText = await page.locator(".aq-quota").textContent();
    ok(cardText.toUpperCase().includes("QUESTIONS ARE USED"), "the quota card says the day is used");
    ok(cardText.includes("GO GOLD, ASK WITHOUT LIMITS"), "gold CTA present, comma not dash");
    ok(!/—/.test(cardText), "no em dash anywhere in the card");
    await ctx.close();
  }

  /* ---- 4. book page still boots with all 500 (spot: a new one) ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/books/siddhartha.html", { waitUntil: "domcontentloaded" });
    await sleep(1200);
    const title = await page.title();
    ok(/Siddhartha/.test(title), "new book page wears its title", title);
    ok(errs.length === 0, "no page errors on the new reader", errs.join(" || "));
    await ctx.close();
  }

  await browser.close();
  console.log("RESULT(browser): " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
