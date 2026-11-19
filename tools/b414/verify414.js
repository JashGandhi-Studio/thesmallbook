/* Build 414 runtime verification: Pixel 7 profile, real browser, no mocks. */
const { chromium, devices } = require("playwright");

const BASE = process.env.TSB_BASE || "http://127.0.0.1:8414/";
const results = [];
function check(name, cond, extra) {
  results.push({ name, pass: !!cond, extra: extra || "" });
  console.log((cond ? "PASS " : "FAIL ") + name + (extra ? " :: " + extra : ""));
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "en-IN",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.addInitScript(() => {
    try {
      localStorage.setItem("tsb_onboarded", "true");
      localStorage.setItem("tsb_onboard_v", "393");
      localStorage.setItem("tsb_splash", "1");
      localStorage.setItem("tsb_theme", JSON.stringify("light"));
      localStorage.setItem("tsb_lang", JSON.stringify("en"));
    } catch (e) {}
  });

  // 1. homepage
  await page.goto(BASE + "index.html", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const statBooks = await page.textContent("#statBooks").catch(() => "");
  const statLessons = await page.textContent("#statLessons").catch(() => "");
  check("homepage statBooks settles at 650", String(statBooks).trim() === "650", statBooks);
  check("homepage statLessons settles at 4853", String(statLessons).trim() === "4853", statLessons);
  const bookCards = await page.locator(".lb-card, .card").count();
  check("homepage paints book cards", bookCards > 5, String(bookCards));

  // 2. new book opens; reader renders lesson text without the retired graphic
  await page.goto(BASE + "book.html?id=into-thin-air", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  const bookTitle = await page.locator("h1, .bk-title").first().textContent().catch(() => "");
  check("new book page shows Into Thin Air", /Into Thin Air/i.test(bookTitle || ""), (bookTitle || "").slice(0, 60));
  await page.goto(BASE + "reader.html?id=into-thin-air", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const readerText = await page.locator("body").innerText();
  check("reader renders lesson text", /Turnaround Time|8,000|Everest/i.test(readerText), readerText.slice(0, 80).replace(/\n/g, " "));
  check("reader has no retired visual-handle graphic", !/A visual handle for this exact idea/.test(readerText));
  check("reader exposes Listen and Next controls", /LISTEN/i.test(readerText) && /NEXT/i.test(readerText));

  // 3. graveyard count (the Graveyard room loads the full case file)
  await page.goto(BASE + "graveyard.html", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  let graveCount = 0;
  for (let i = 0; i < 5 && !graveCount; i++) {
    graveCount = await page.evaluate(() => (window.FAILURES || []).length).catch(() => 0);
    if (!graveCount) await page.waitForTimeout(1000);
  }
  check("FAILURES loads 559 cases", graveCount === 559, String(graveCount));

  // 4. chat: exactly one plus, modes sheet honest, compare works
  await page.goto(BASE + "chat.html", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const plusCount = await page.evaluate(() => {
    const a = document.querySelectorAll(".fa-plus").length;
    const b = document.querySelectorAll("#tsb-plus").length;
    return { fa: a, shell: b, total: a + b };
  });
  check("chat composer has exactly one plus", plusCount.total === 1, JSON.stringify(plusCount));
  await page.locator(".fa-plus").first().click();
  await page.waitForTimeout(700);
  const modesText = await page.locator("#tsb-modes").innerText().catch(() => "");
  check("plus opens the ways-to-ask sheet", /Ways to ask|Compare two books/i.test(modesText), modesText.slice(0, 80).replace(/\n/g, " "));
  check("modes sheet does not advertise retired formats", !/7 formats/.test(modesText));
  const cmpCard = page.locator('[data-md="compare"]').first();
  await cmpCard.click();
  await page.waitForTimeout(700);
  const pickerOpen = await page.evaluate(() => {
    const intro = document.body.innerText;
    return /compare/i.test(intro);
  });
  check("compare intro or picker appears", pickerOpen);
  // drive the picker through the DOM: pick two books
  await page.evaluate(() => {
    if (window.TSB_ASK && TSB_ASK.open) TSB_ASK.open();
  }).catch(() => {});
  await page.waitForTimeout(500);
  const cmpVisible = await page.locator("#tsb-cmp").isVisible().catch(() => false);
  if (!cmpVisible) {
    // open via plus sheet again then compare card path
    const plus = page.locator(".fa-plus").first();
    if (await plus.count()) { await plus.click().catch(() => {}); await page.waitForTimeout(500); }
    const card2 = page.locator('[data-md="compare"]').first();
    if (await card2.count()) { await card2.click().catch(() => {}); await page.waitForTimeout(600); }
    const startBtn = page.locator("button", { hasText: /compare/i }).last();
    if (await startBtn.count()) { await startBtn.click().catch(() => {}); await page.waitForTimeout(600); }
  }
  const cmpVisible2 = await page.locator("#tsb-cmp").isVisible().catch(() => false);
  check("compare picker opens", cmpVisible2);
  if (cmpVisible2) {
    const rows = page.locator(".cmp-row");
    await rows.nth(0).click(); await page.waitForTimeout(300);
    await rows.nth(0).click(); await page.waitForTimeout(300);
    const goEnabled = await page.locator("#cmpGo").isEnabled().catch(() => false);
    check("compare button enables after two picks", goEnabled);
    if (goEnabled) {
      await page.locator("#cmpGo").click();
      await page.waitForTimeout(3500);
      const chatText = await page.locator("body").innerText();
      check("comparison renders head-to-head facts", /Reading time/.test(chatText) && /Lessons/.test(chatText));
      check("comparison renders THE BOTTOM LINE verdict", /THE BOTTOM LINE/.test(chatText));
      check("comparison covers render", await page.locator(".cmp-facts__hd img").count() === 2);
      await page.screenshot({ path: "/tmp/shots414/compare.png" });
    }
  }
  await page.screenshot({ path: "/tmp/shots414/reader.png" }).catch(() => {});

  // 5. search finds a new book
  await page.goto(BASE + "index.html", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  const found = await page.evaluate(() => {
    const books = window.BOOKS || [];
    const hit = books.filter((b) => /midnight library/i.test(b.title || ""));
    return hit.length;
  });
  check("library contains The Midnight Library", found === 1, String(found));

  const realErrors = errors.filter((e) => !/favicon|net::ERR_ABORTED|Failed to load resource.*404/.test(e));
  check("no page errors during the run", realErrors.length === 0, realErrors.slice(0, 3).join(" | ").slice(0, 240));

  const fails = results.filter((r) => !r.pass);
  console.log("VERIFY414: " + (results.length - fails.length) + "/" + results.length + " checks passed");
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error("VERIFY CRASH", e); process.exit(2); });
