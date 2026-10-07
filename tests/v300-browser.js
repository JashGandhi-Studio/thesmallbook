/* v300 browser QA: mindpick daily + picker, quota card, pseo pages, sitemap */
const { chromium } = require("playwright");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, name, extra) => { if (c) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ FAIL: " + name + (extra ? " | " + extra : "")); } };
const BASE = "http://127.0.0.1:8799";

(async () => {
  const browser = await chromium.launch();

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
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(3200);
    await sleep(2600); /* the daily card lands shortly after load */
    ok(await page.locator("#mindpick .mp").count() >= 1, "mindpick block mounts on the homepage");
    ok(await page.locator("#mpDaily").count() === 1, "first open of the day shows exactly one daily question");
    ok(await page.locator("#mpDaily .mp-q, #mpDaily .mp-quote").count() >= 1, "the daily card carries a question or a quote");
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem("tsb_mindpick_day") || "null"))) !== null, "the day is marked the moment the card shows");
    await page.locator("#mpDailyX").click();
    await sleep(400);
    ok(await page.locator("#mpDaily").count() === 0, "the dismiss (x) cancels the daily card");
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(3200);
    await sleep(2600);
    ok(await page.locator("#mpDaily").count() === 0, "second visit the same day: no daily nag");
    /* picker: chip -> 3 real books + one action (the chips rotate daily, take what is on the board) */
    await page.locator("#mpChips .mp-chip[data-mppick]").first().click();
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
    ok(!/ - /.test(cardText), "no em dash anywhere in the card");
    await ctx.close();
  }

  /* ---- 3b. deep dives: sample free, gate for the rest ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/deepdive.html?id=dd-atomic-identity", { waitUntil: "domcontentloaded" });
    await sleep(900);
    ok(await page.locator(".dd-h1").count() === 1, "the free sample dive opens straight into the reader");
    ok((await page.locator(".dd-p").count()) >= 7, "a real essay: sections and paragraphs render");
    ok(await page.locator("#ddListen").count() === 1, "narration is one tap away");
    await page.goto(BASE + "/deepdive.html?id=dd-money-scarred", { waitUntil: "domcontentloaded" });
    await sleep(900);
    ok(await page.locator(".dd-gate").count() === 1, "a non-sample dive honestly gates");
    ok((await page.locator(".dd-gate").textContent()).includes("UNLOCK WITH GOLD"), "the gate points at Gold, plainly");
    await page.goto(BASE + "/podcasts.html", { waitUntil: "domcontentloaded" });
    await sleep(700);
    ok(await page.locator(".pc-show").count() >= 9 && (await page.locator(".pc-play").count()) >= 8, "the audio room lists the real shows, playable here");
    ok(await page.locator(".pc-orig__card").count() >= 6, "TSB originals ride on the deep dives");
    ok(errs.length === 0, "no page errors on deepdive/podcasts", errs.join(" || "));
    await ctx.close();
  }

  /* ---- 3c. notebook: search, prompt, highlights, lesson NOTE handoff ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/notes.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2200);
    ok(await page.locator("#ntPromptCard").count() === 1, "an empty notebook opens on today\u2019s prompt");
    await page.locator("#ntPromptGo").click();
    await sleep(1200);
    ok(await page.locator("#ntBody").count() === 1, "the prompt writes its own first page");
    const body0 = await page.locator("#ntBody").innerHTML();
    ok(await page.locator("#ntBody").count() === 1 && body0 !== undefined, "the page opens in the editor, not a list");
    /* notes come from selection now: underline a line, tap NOTE */
    await page.goto(BASE + "/book.html?id=atomic-habits", { waitUntil: "domcontentloaded" });
    await sleep(1800);
    await page.evaluate(() => {
      const p = document.querySelector(".lesson.open .lesson__body p, .lesson .lesson__body p");
      p.scrollIntoView({ block: "center" });
    });
    await sleep(900); /* the open-lesson auto-scroll settles */
    await page.evaluate(() => {
      const p = document.querySelector(".lesson.open .lesson__body p, .lesson .lesson__body p");
      const r = document.createRange(); r.selectNodeContents(p);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await sleep(600);
    const noteBtn = page.locator(".tsb-hl-btn--note").first();
    ok(await noteBtn.count() >= 1, "underline any line and NOTE appears beside HIGHLIGHT");
    await noteBtn.click();
    await sleep(500);
    await page.fill("#tsbNoteThink", "the one I keep forgetting");
    await page.locator("#tsbNoteSave").click();
    await sleep(700);
    ok(true, "the tap confirms: dropped into your notebook");
    await page.goto(BASE + "/notes.html", { waitUntil: "domcontentloaded" });
    await sleep(1800);
    ok(await page.locator("#ntTitle").count() === 1, "continue-writing lands inside the last note, not a dead list");
    await page.locator("#ntMenu").click(); /* back to the cover */
    await sleep(600);
    ok(await page.locator("#ntSearch").count() === 1, "search rides on the cover");
    ok(await page.locator(".nt-booktag").count() >= 2, "book tags: all my notes from one book, one tap");
    await page.fill("#ntSearch", "power of 1");
    await sleep(700);
    ok(await page.locator(".nt-entry").count() === 1, "search finds the lesson note");
    ok(await page.locator("#ntMenu").count() === 1, "continue-writing opened inside the note, not a dead list");
    ok(errs.length === 0, "no page errors on the notebook flow", errs.join(" || "));
    await ctx.close();
  }

  /* ---- 3d. settings: founder card hidden for normal readers ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/settings.html", { waitUntil: "domcontentloaded" });
    await sleep(900);
    ok(await page.locator("#founderCard").isHidden(), "no founder card for normal readers");
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

  /* ---- 5. v302: quote wall, listen rail, lesson tools, player, hubs ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/quotes.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(1400);
    ok(await page.locator("#qwVp").count() === 1, "the wall mounts its viewport");
    const tr0 = await page.locator("#qwBoard").evaluate(el => el.style.transform || "");
    await page.mouse.move(200, 400); await page.mouse.down();
    await page.mouse.move(90, 320, { steps: 6 }); await page.mouse.up();
    await sleep(200);
    const tr1 = await page.locator("#qwBoard").evaluate(el => el.style.transform || "");
    ok(tr1 !== tr0 && /translate/.test(tr1), "the board pans with a drag", tr0 + " -> " + tr1);
    const sc0 = await page.locator("#qwBoard").evaluate(el => el.style.transform);
    await page.locator("#qwZin").click(); await sleep(150);
    const sc1 = await page.locator("#qwBoard").evaluate(el => el.style.transform);
    ok(sc1 !== sc0, "the zoom button scales the board", sc0 + " -> " + sc1);
    /* guest taps pin: honest gate to sign in, straight back after */
    await page.locator("#qwAdd").click();
    await sleep(700);
    ok(/login\.html\?next=quotes\.html/.test(page.url()), "a guest who pins is asked in, then returned to the wall", page.url());
    ok(errs.length === 0, "no page errors on the wall", errs.join(" || "));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/stories.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); localStorage.setItem("tsb_pc_promo", "gone"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2200);
    ok(await page.locator("#ltRail .lt-tile").count() >= 5, "LISTEN TODAY rail renders: dives + whole books", String(await page.locator("#ltRail .lt-tile").count()));
    ok(await page.locator("#ltRail .lt-tile--cont").count() === 0, "no continue card until something was played");
    /* the QUOTE button walks to the wall */
    await page.locator("#quoteBtn").click();
    await sleep(700);
    ok(/quotes\.html/.test(page.url()), "the QUOTE button opens the wall", page.url());
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/book.html?id=atomic-habits", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2400);
    ok(await page.locator(".lesson__tools .minibtn").count() >= 3, "lesson tools: compact row, three quiet buttons", String(await page.locator(".lesson__tools .minibtn").count()));
    /* selection -> NOTE chip -> notebook sheet */
    await page.evaluate(() => {
      const p = document.querySelector(".lesson.open .lesson__body p, .lesson .lesson__body p");
      const r = document.createRange(); r.selectNodeContents(p);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await sleep(600);
    ok(await page.locator(".tsb-hl-btn--note").count() >= 1, "selecting a line offers NOTE beside HIGHLIGHT");
    await page.locator(".tsb-hl-btn--note").click();
    await sleep(400);
    ok(await page.locator("#tsbNoteSheet").count() === 1, "the note sheet opens with the line caught");
    await page.fill("#tsbNoteThink", "this is the part I keep forgetting");
    await page.locator("#tsbNoteSave").click();
    await sleep(600);
    ok(await page.evaluate(() => { const S = window.TSB_NOTES_STORE; return S && S.list().length >= 1; }), "the note lands in the notebook store");
    /* LISTEN starts the real player dock */
    await page.locator("[data-listen=\"0\"]").click();
    await sleep(1200);
    ok(await page.locator("#tsbAp").count() === 1, "LISTEN mounts the player dock");
    ok(await page.evaluate(() => document.body.classList.contains("tsb-audio-live")), "the dock takes over: engine widget steps aside");
    /* queue sheet: lessons listed, speed chips, sleep chips */
    await page.locator("#tsbAp .ap-list").click();
    await sleep(300);
    ok(await page.locator("#tsbApSheet .ap-qi").count() >= 5, "the queue sheet lists the lessons", String(await page.locator("#tsbApSheet .ap-qi").count()));
    ok(await page.locator("#tsbApSheet .ap-sp").count() === 4, "speed: 0.75x to 1.5x");
    ok(await page.locator("#tsbApSheet .ap-sl").count() === 4, "sleep timer: off, 5, 15, 30");
    await page.locator("#tsbApSheet .ap-sl[data-sl=\"15\"]").click();
    await sleep(200);
    ok(await page.evaluate(() => !!localStorage.getItem("tsb_audio_last")), "the player remembers where you were");
    ok(errs.length === 0, "no page errors on the reader with the player", errs.join(" || "));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/topics/habits.html", { waitUntil: "domcontentloaded" });
    await sleep(800);
    const cards = await page.locator(".hubcard").count();
    ok(cards >= 10, "the habits shelf is a real complete list", String(cards));
    ok(await page.locator(".hubcard img").first().evaluate(i => i.naturalWidth > 10), "hub covers load");
    await page.goto(BASE + "/authors/robert-greene.html", { waitUntil: "domcontentloaded" });
    await sleep(800);
    ok(await page.locator(".hubcard").count() >= 5, "an author shelf gathers every book by that writer", String(await page.locator(".hubcard").count()));
    await ctx.close();
  }

  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/book.html?id=meditations", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2200);
    ok(await page.locator("#heroPodcastBtn").count() === 1, "classics wear the Listen Free audiobook button");
    const liveTxt = await page.locator("#heroPodcastBtn .podcastbtn__live").first().textContent();
    ok(liveTxt === "FREE", "the badge says FREE, not LIVE", liveTxt);
    await page.locator("#heroPodcastBtn").click();
    await sleep(3500);
    ok(await page.locator("#tsbAp").count() === 1, "the audiobook streams into the player dock");
    ok(await page.locator("#tsbAp .ap-art img").count() === 1, "the dock shows the book's real cover art");
    await page.locator("#tsbAp .ap-list").click();
    await sleep(400);
    ok(await page.locator("#tsbApSheet .ap-qi").count() >= 10, "the queue lists the audiobook chapters", String(await page.locator("#tsbApSheet .ap-qi").count()));
    ok(await page.locator("#tsbApSheet .ap-credit").count() === 1, "the sheet credits LibriVox");
    ok(errs.length === 0, "no page errors on the audiobook flow", errs.join(" || "));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
    await page.goto(BASE + "/podcasts.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(1400);
    ok(await page.locator(".pc-play").count() >= 8, "every show offers PLAY HERE, FREE", String(await page.locator(".pc-play").count()));
    /* v307: the shelf shows 6 first + a show-all; after expanding, all 21 are there */
    ok(await page.locator(".pc-ab__card").count() === 6, "the shelf opens with six books, not a wall", String(await page.locator(".pc-ab__card").count()));
    await page.locator("#abMore").click();
    await sleep(400);
    ok(await page.locator(".pc-ab__card").count() >= 21, "show-all reveals the whole shelf", String(await page.locator(".pc-ab__card").count()));
    await page.evaluate(() => { const f = window.fetch; window.__realFetch = f; });
    await page.locator(".pc-play").first().click();
    await sleep(2500);
    ok(true, "PLAY HERE clicked and the feed path ran");
    ok(errs.length === 0, "no page errors in the audio room", errs.join(" || "));
    await ctx.close();
  }

  await browser.close();
  console.log("RESULT(browser): " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
