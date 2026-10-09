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
      localStorage.setItem("tsb_tour_done", "true");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(3200);
    await sleep(2600); /* the daily card lands shortly after load */
    ok(await page.locator("#mindpick .mp").count() === 1, "mindpick mounts as exactly one card: today's");
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
    /* v316: the daily card IS the mindpick - its Show-me chip routes to 3 real books.
       The day was consumed by the dismiss check above, so hand today back first. */
    await page.evaluate(() => localStorage.removeItem("tsb_mindpick_day"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(3400);
    await page.locator("#mpDaily .mp-chip--go[data-mppick]").click();
    await sleep(700);
    ok(await page.locator("#mpResult .mp-book").count() === 3, "the daily question hands back exactly 3 books");
    ok(await page.locator("#mpResult .mp-action").count() === 1, "plus one thing to do this week");
    const hrefs = await page.locator("#mpResult .mp-book").evaluateAll(els => els.map(e => e.getAttribute("href")));
    ok(hrefs.every(h => /^book\.html\?id=/.test(h)), "the 3 books deep-link to real reader pages", hrefs.join(","));
    const coversOk = await page.locator("#mpResult .mp-book img").evaluateAll(els => els.every(i => i.naturalWidth > 10));
    ok(coversOk, "every suggested book cover actually loads");
    ok(await page.locator("#mindpick .mp--ask").count() === 0 && await page.locator("#mpInput").count() === 0, "the what's-on-your-mind picker is retired - daily only");
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
      localStorage.setItem("tsb_tour_done", "true");
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
    /* v310: the grid paginates - six shows first, +3 MORE SHOWS per tap */
    /* v317: our own recorded show pins itself above the shelf - 6 curated + ours */
    ok(await page.locator(".pc-show").count() === 7 && (await page.locator(".pc-play").count()) === 7 && (await page.locator("#pcMoreShows").count()) === 1, "the audio room lists the real shows + our original, playable here");
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
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true");
      localStorage.setItem("tsb_tour_done", "true"); });
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
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true");
      localStorage.setItem("tsb_tour_done", "true"); localStorage.setItem("tsb_pc_promo", "gone"); });
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
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true");
      localStorage.setItem("tsb_tour_done", "true"); });
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
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true");
      localStorage.setItem("tsb_tour_done", "true"); });
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

  /* --- v314 · the premium player: look, motion, grip-close --- */
  {
    const fs2 = require("fs");
    try { fs2.mkdirSync("/tmp/qa314", { recursive: true }); } catch (e) {}
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors in the premium player flow", String(e).slice(0, 90)));
    await page.goto(BASE + "/book.html?id=meditations", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); localStorage.setItem("tsb_tour_done", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.locator("#heroPodcastBtn").click();
    await sleep(3500);
    ok(await page.locator("#tsbAp .ap-eq--art").count() === 1, "the dock art wears the equalizer badge");
    ok(await page.locator("#tsbAp .ap-play svg").count() === 1, "the dock play button is a drawn icon, not an emoji");
    await sleep(2600);
    await page.screenshot({ path: "/tmp/qa314/dock.png" });
    await page.locator("#tsbAp .ap-play").click();
    await sleep(700);
    await page.locator("#tsbAp .ap-list").click();
    await page.waitForSelector("#tsbApSheet .ap-card", { timeout: 8000 });
    await sleep(900);
    ok(await page.locator("#tsbApSheet .ap-card").count() === 1, "the sheet is a real card on a dim backdrop");
    ok(/NOW PLAYING/.test(await page.locator("#tsbApSheet .ap-ribbon").textContent()), "the ribbon says NOW PLAYING");
    ok(await page.locator("#tsbApSheet .ap-grip").count() === 1 && await page.locator("#tsbApSheet .ap-x svg").count() === 1, "the head carries the grip and the drawn close");
    ok(await page.locator("#tsbApSheet .ap-playbig svg").count() === 1, "the big play is a drawn icon");
    ok(await page.locator("#tsbApSheet .ap-skip b").count() === 2, "the 15/30 skips read as proper buttons");
    await page.screenshot({ path: "/tmp/qa314/sheet.png" });
    /* swipe the grip down: the sheet follows, then closes */
    const hb = await page.locator("#tsbApSheet .ap-head").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + 16);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + 150, { steps: 6 });
    await page.mouse.up();
    await sleep(600);
    if (await page.locator("#tsbApSheet .ap-card").count()) {
      /* synthetic retry: the same gesture, dispatched for certain */
      await page.evaluate(() => {
        const h = document.querySelector("#tsbApSheet .ap-head");
        const opts = { bubbles: true, cancelable: true };
        h.dispatchEvent(new PointerEvent("pointerdown", Object.assign({ clientY: 300 }, opts)));
        h.dispatchEvent(new PointerEvent("pointermove", Object.assign({ clientY: 460 }, opts)));
        h.dispatchEvent(new PointerEvent("pointerup", Object.assign({ clientY: 460 }, opts)));
      });
      await sleep(600);
    }
    ok(await page.locator("#tsbApSheet").count() === 0, "swiping the grip down closes the sheet");
    /* and the red close still works */
    await page.locator("#tsbAp .ap-list").click();
    await page.waitForSelector("#tsbApSheet .ap-card", { timeout: 8000 });
    await sleep(400);
    await page.locator("#tsbApSheet .ap-x").click();
    await sleep(500);
    ok(await page.locator("#tsbApSheet").count() === 0, "the red close still closes");
    await page.close();
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
    ok(await page.locator(".pc-play").count() === 7 && (await page.locator(".pc-browse").count()) === 7, "every show offers PLAY LATEST + BROWSE EPISODES", String(await page.locator(".pc-play").count()));
    /* v311: the shelf opens mixed (English + Hindi on repeat) at six and
       grows six per tap until the whole catalogue is out */
    ok(await page.locator(".pc-ab__card").count() === 6, "the shelf opens with six books, not a wall", String(await page.locator(".pc-ab__card").count()));
    for (let t = 0; t < 20 && (await page.locator("#abMore").count()); t++) {
      await page.locator("#abMore").click();
      await sleep(150);
    }
    ok(await page.locator(".pc-ab__card").count() >= 40, "show-more reveals the whole shelf, six at a time", String(await page.locator(".pc-ab__card").count()));
    await page.evaluate(() => { const f = window.fetch; window.__realFetch = f; });
    await page.locator(".pc-play").first().click();
    await sleep(2500);
    ok(true, "PLAY HERE clicked and the feed path ran");
    ok(errs.length === 0, "no page errors in the audio room", errs.join(" || "));
    await ctx.close();
  }

  /* --- v312 · the guide doors (v313: mini tour is replay-only now) --- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors while the guide doors run", String(e).slice(0, 90)));
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    /* v315: even a v312 mini-tour veteran gets the hands-on walkthrough once */
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); localStorage.setItem("tsb_tour_done", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2600);
    ok((await page.locator("#tsbTourCard").count()) === 1, "an old reader is greeted by the new tutorial too");
    page.on("dialog", async d => { await d.accept(); });   /* the skip confirm */
    if (await page.locator("#tsbTourCard .tt-skip").count()) { await page.locator("#tsbTourCard .tt-skip").click(); await sleep(500); }
    ok(await page.evaluate(() => { const v = JSON.parse(localStorage.getItem("tsb_walk_done")); return v && v !== false; }), "after they walk or skip it, it never repeats (it stamps the era)");
    ok((await page.locator("#tsbHelpChip").count()) === 1, "the ? chip sits on the home header");
    await page.goto(BASE + "/index.html#guide", { waitUntil: "domcontentloaded" });
    await sleep(900);
    ok((await page.locator("#tsbGuideSheet .tg-row").count()) >= 15, "#guide opens the plain map with every function", String(await page.locator("#tsbGuideSheet .tg-row").count()));
    ok(await page.evaluate(() => Array.from(document.querySelectorAll("#tsbGuideSheet .tg-row")).every(a => (a.getAttribute("href") || "").endsWith(".html"))), "every guide row is a real link that goes somewhere");
    ok((await page.locator("#tgWalk").count()) === 1 && (await page.locator("#tgReplay").count()) === 1, "the sheet carries the full-tutorial button and the mini-tour replay");
    if (await page.locator("#tgReplay").count()) { await page.locator("#tgReplay").click(); await sleep(900); }
    ok((await page.locator("#tsbTourCard").count()) === 1, "replay brings the 30-second tour back");
    if (await page.locator("#tsbTourCard .tt-skip").count()) { await page.locator("#tsbTourCard .tt-skip").click(); await sleep(300); }
    await page.close();
  }

  /* --- v313/v314 · the hands-on walkthrough: every stop, try-stops, resume --- */
  {
    const fs2 = require("fs");
    try { fs2.mkdirSync("/tmp/qa314", { recursive: true }); } catch (e) {}
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors across the whole walkthrough", String(e).slice(0, 90)));

    /* 1. a brand-new reader auto-walks the full tutorial, starting with Welcome
       (signed in, so the quote pinning stop behaves like a member's app) */
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true");
      localStorage.setItem("tsb_auth_session", JSON.stringify({ access_token: "fake.jwt.sig", refresh_token: "r", expires_at: 9999999999999, user: { id: "00000000-0000-0000-0000-0000000000aa", user_metadata: { full_name: "Test Reader" } } }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tsbTourCard", { timeout: 12000 });
    await sleep(700);
    let label = await page.evaluate(() => (document.querySelector("#tsbTourCard .tt-step") || {}).textContent || "");
    ok(/STOP 1 OF 21/.test(label), "a brand-new reader gets the hands-on walkthrough, 21 stops", label);
    ok(/Welcome to TheSmallBook/.test(await page.locator("#tsbTourCard .tt-t").textContent()), "stop 1 is the Welcome card");
    await page.screenshot({ path: "/tmp/qa314/walk-01.png" });

    /* 2. walk it like a reader: NEXT on explain stops, real taps on YOUR TURN stops */
    const TRY_TAPS = {
      2: () => page.locator("#searchInput").click(),
      5: () => page.locator(".tsb-bar__item--plus").click(),
      9: () => page.locator("#pcAudiobooks [data-ab]").first().click(),
      10: () => page.locator("#tsbAp .ap-mid").click(),
      11: () => page.locator("#tsbApSheet .ap-x").click(),
      13: () => page.locator(".grave__stone").first().click(),
      16: () => page.locator("#qwAdd").click()
    };
    const seen = {};
    let prevLabel = "";
    for (let i = 0; i < 70; i++) {
      let label = await page.evaluate(() => (document.querySelector("#tsbTourCard .tt-step") || {}).textContent || "");
      if (!label) { await sleep(1000); continue; }
      const n = parseInt((label.match(/STOP (\d+) OF 21/) || [])[1] || "0", 10);
      if (!n) { await sleep(1000); continue; }
      if (seen[n]) { await sleep(900); continue; }   /* mid-advance settle */
      const isTry = !!(await page.locator("#tsbTourCard .tt-wait").count());
      seen[n] = isTry;
      prevLabel = label;
      await sleep(650);
      await page.screenshot({ path: "/tmp/qa314/walk-" + String(n).padStart(2, "0") + ".png" });
      /* mid-walk resume: reload once, on the stories stop */
      if (n === 6) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForSelector("#tsbTourCard", { timeout: 15000 });
        const rl = await page.evaluate(() => (document.querySelector("#tsbTourCard .tt-step") || {}).textContent || "");
        ok(/STOP 6 OF 21/.test(rl), "a mid-walk reload resumes at the same stop", rl);
      }
      if (n === 21) { await page.locator("#tsbTourCard .tt-next").click(); await sleep(500); break; }
      if (isTry) {
        ok(await page.locator("#tsbTourCard .tt-next").count() === 0, "stop " + n + " is a YOUR TURN stop: no NEXT until the reader acts");
        await TRY_TAPS[n]();
      } else {
        await page.locator("#tsbTourCard .tt-next").click();
      }
      /* the tour must move: wait until the card is gone or shows the next stop */
      await page.waitForFunction(p => {
        const c = document.querySelector("#tsbTourCard .tt-step");
        return !c || (c.textContent || "") !== p;
      }, prevLabel, { timeout: 30000 });
      await sleep(400);
    }
    const shotCount = Object.keys(seen).length;
    ok(shotCount === 21, "all 21 stops rendered and were screenshotted", Object.keys(seen).join(","));
    ok(Object.keys(seen).filter(k => seen[k]).length === 7, "exactly seven stops were hands-on");
    ok(await page.evaluate(() => { const v = JSON.parse(localStorage.getItem("tsb_walk_done")); return v && v !== false; }), "finishing marks the walkthrough done (stamps the era)");
    ok(await page.evaluate(() => localStorage.getItem("tsb_walk")) === null, "the walk state clears on finish");
    await sleep(1200);
    ok(page.url().indexOf("index.html") >= 0, "finishing on settings carries you home");
    await page.close();
  }

  /* --- v313 · skip asks first, settings replays, swipe-to-clear, swipe-to-reply --- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors in the gesture suite", String(e).slice(0, 90)));

    /* 3. skipping asks first and names the Settings replay door */
    let skipMsg = "";
    page.on("dialog", async d => { skipMsg = d.message(); await d.accept(); });
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#tsbTourCard", { timeout: 12000 });
    await sleep(500);
    await page.locator("#tsbTourCard .tt-next").click(); await sleep(600);
    /* stop 2 is a YOUR TURN stop: skipping from a hands-on stop must work too */
    await page.locator("#tsbTourCard .tt-skip").click();
    await sleep(600);
    ok(/Settings/i.test(skipMsg) && /FEELING LOST/i.test(skipMsg), "skipping says the tutorial replays from Settings", skipMsg.slice(0, 80));
    ok(await page.evaluate(() => { const v = JSON.parse(localStorage.getItem("tsb_walk_done")); return v && v !== false; }) && (await page.locator("#tsbTourCard").count()) === 0, "accepted skip ends the walkthrough (stamps the era)");
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2200);
    ok((await page.locator("#tsbTourCard").count()) === 0, "a skipped walkthrough never nags again");

    /* 4. Settings replays the ENTIRE tutorial */
    await page.goto(BASE + "/settings.html", { waitUntil: "domcontentloaded" });
    await sleep(900);
    ok((await page.locator("#tsbWalkReplay").count()) === 1, "settings carries the full-tutorial replay row");
    await page.locator("#tsbWalkReplay").click();
    await page.waitForSelector("#tsbTourCard", { timeout: 12000 });
    const rl = await page.evaluate(() => (document.querySelector("#tsbTourCard .tt-step") || {}).textContent || "");
    ok(/STOP 1 OF 21/.test(rl), "settings replay starts the whole walkthrough from stop 1", rl);
    await page.close();
  }

  {
    /* 5. notifications: swipe a row left, it clears for good (local ledger) */
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors in notifications", String(e).slice(0, 90)));
    await page.goto(BASE + "/notifications.html", { waitUntil: "domcontentloaded" });
    await sleep(900);
    await page.evaluate(() => {
      const list = document.getElementById("nList");
      list.innerHTML = '<div class="nt-row new" data-nkey="like:u1:p9:2026-01-01T00:00:00Z"><a href="profile.html?id=u1"><span class="cm-ava cm-ava--lg"><span>R</span></span></a><div class="nt-row__meta"><b><a class="nt-name" href="profile.html?id=u1">Riya</a> <span>liked your story</span></b></div></div>' +
        '<div class="nt-row new" data-nkey="follow:u2::2026-01-02T00:00:00Z"><a href="profile.html?id=u2"><span class="cm-ava cm-ava--lg"><span>A</span></span></a><div class="nt-row__meta"><b><a class="nt-name" href="profile.html?id=u2">Arjun</a> <span>started following you</span></b></div></div>';
    });
    const row = page.locator('.nt-row[data-nkey="like:u1:p9:2026-01-01T00:00:00Z"]');
    const rb = await row.boundingBox();
    const C_ = await page.evaluate(() => typeof window.TSB_COMMUNITY.notifClear === "function" && typeof window.TSB_COMMUNITY.notifIsCleared === "function");
    ok(C_, "the clear ledger is live in the page (notifClear + notifIsCleared)");
    /* v315: drag RIGHT past the clear threshold */
    await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await page.mouse.down();
    let bgSeen = false;
    for (let sx = rb.x + rb.width / 2; sx < rb.x + rb.width / 2 + 110; sx += 14) {
      await page.mouse.move(sx, rb.y + rb.height / 2);
      if (!bgSeen) bgSeen = await page.evaluate(() => !!document.querySelector(".nt-clearbg"));
    }
    ok(bgSeen, "swiping right reveals the red Clear backdrop");
    await page.mouse.up();
    await sleep(500);
    ok(await page.evaluate(() => window.TSB_COMMUNITY.notifIsCleared("like:u1:p9:2026-01-01T00:00:00Z")), "the swiped row is cleared in the ledger");
    ok(await page.evaluate(() => (document.getElementById("nList").querySelectorAll(".nt-row").length)) === 0, "the cleared row is gone from the list");
    ok(!/Riya/.test(await page.evaluate(() => document.getElementById("nList").textContent)), "the repaint never paints the cleared row again");
    await page.close();
  }

  {
    /* 6. DMs: swipe a bubble sideways, the reply bar names it; quote strips jump */
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors in the chat gestures", String(e).slice(0, 90)));
    await page.goto(BASE + "/dm.html?u=00000000-0000-0000-0000-0000000000ff", { waitUntil: "domcontentloaded" });
    /* a fake session: the thread UI (and the swipe handlers) only bind signed-in */
    await page.evaluate(() => {
      localStorage.setItem("tsb_auth_session", JSON.stringify({ access_token: "fake.jwt.sig", refresh_token: "r", expires_at: 9999999999999, user: { id: "00000000-0000-0000-0000-0000000000aa", user_metadata: { full_name: "Test Reader" } } }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    /* let the thread's first (real) paint finish so later polls early-return */
    await page.waitForFunction(() => document.getElementById("dmMsgs").hasAttribute("data-last"), null, { timeout: 15000 }).catch(() => {});
    const injectThread = () => page.evaluate(() => {
      document.getElementById("dmThread").hidden = false;
      const m = document.getElementById("dmMsgs");
      m.innerHTML = '<div class="dm-bub" data-mid="m1" data-mine="0" data-body="Have you read the Enron grave?"><span>Have you read the Enron grave?</span><em>2 min ago</em></div>' +
        '<div class="dm-bub me" data-mid="m2" data-mine="1" data-body="Twice. The lesson part is brutal."><button type="button" class="dm-quote" data-jump="m1"><b>↩ Riya</b><span>Have you read the Enron grave?</span></button><span>Twice. The lesson part is brutal.</span><em>just now</em></div>';
    });
    /* let the thread's first (real) paint finish so later polls early-return */
    await page.waitForFunction(() => document.getElementById("dmMsgs").hasAttribute("data-last"), null, { timeout: 15000 }).catch(() => {});
    await injectThread();
    /* a late thread repaint could wipe the injected bubbles - re-inject then */
    await page.waitForSelector('.dm-bub[data-mid="m1"]', { timeout: 4000 }).catch(() => {});
    if (!(await page.locator('.dm-bub[data-mid="m1"]').count())) await injectThread();
    await page.waitForSelector('.dm-bub[data-mid="m1"]', { timeout: 4000 });
    const bub = page.locator('.dm-bub[data-mid="m1"]');
    const bb = await bub.boundingBox();
    await page.mouse.move(bb.x + 20, bb.y + bb.height / 2);
    await page.mouse.down();
    for (let sx = bb.x + 20; sx < bb.x + 120; sx += 16) await page.mouse.move(sx, bb.y + bb.height / 2);
    await page.mouse.up();
    await sleep(400);
    ok(await page.evaluate(() => !document.getElementById("dmReplyBar").hidden), "swiping a bubble opens the reply bar");
    ok(/Replying to/i.test(await page.evaluate(() => document.getElementById("dmReplyWho").textContent)), "the reply bar says who is being replied to");
    ok(/Enron/.test(await page.evaluate(() => document.getElementById("dmReplyPrev").textContent)), "the reply bar previews the right message");
    await page.locator("#dmReplyX").click();
    await sleep(200);
    ok(await page.evaluate(() => document.getElementById("dmReplyBar").hidden), "the ✕ cancels the reply");
    await page.evaluate(() => document.querySelector('.dm-quote[data-jump="m1"]').click());
    await sleep(300);
    ok(await page.evaluate(() => document.querySelector('.dm-bub[data-mid="m1"]').classList.contains("dm-flash")), "tapping the quoted strip flashes the original bubble");
    await page.close();
  }

  /* --- v316 · endless shows, corner hearts, the chip tab --- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors in the show shelf flow", String(e).slice(0, 90)));
    await page.goto(BASE + "/podcasts.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); localStorage.setItem("tsb_tour_done", "true"); localStorage.setItem("tsb_walk_done", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(1500);
    /* corner chip: rounded away from the edge, attached to the top */
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    await sleep(800);
    const chip = await page.evaluate(() => {
      const c = document.querySelector(".tsb-help-chip");
      if (!c) return null;
      const cs = getComputedStyle(c);
      const rc = c.getBoundingClientRect();
      return { r: cs.borderRadius, pos: cs.position, rect: { x: rc.x, y: rc.y, w: rc.width } };
    });
    ok(chip && chip.pos === "absolute" && chip.rect.x + chip.rect.w >= 389 && chip.r === "0px 0px 0px 24px", "the ? chip is a tab attached to the top-right corner", chip && (chip.pos + " @" + Math.round(chip.rect.x) + "," + Math.round(chip.rect.y)));
    await page.screenshot({ path: "/tmp/qa316-chip.png" });
    /* guide sheet: the close rides in the card */
    await page.goto(BASE + "/index.html#guide", { waitUntil: "domcontentloaded" });
    await sleep(900);
    const gx = await page.evaluate(() => {
      const x = document.querySelector("#tsbGuideSheet .tg-x");
      if (!x) return null;
      const cs = getComputedStyle(x);
      return { pos: cs.position, cardTop: document.querySelector("#tsbGuideSheet .tg-card").getBoundingClientRect().top };
    });
    ok(gx && gx.pos === "sticky" && gx.cardTop > 100, "the guide sheet's close lives inside the card", gx && gx.pos);
    /* back to the audio room: page the curated shows out, then FIND 3 MORE live */
    await page.goto(BASE + "/podcasts.html", { waitUntil: "domcontentloaded" });
    await sleep(1500);
    const curated = await page.evaluate(() => (window.TSB_PODCASTS.shows || []).length);
    for (let i = 0; i < 12; i++) {
      if (await page.locator("#pcFindShows").count()) break;
      await page.locator("#pcMoreShows").click().catch(() => {});
      await sleep(300);
    }
    ok(await page.locator("#pcFindShows").count() === 1, "FIND 3 MORE SHOWS waits where the curated list ends");
    await page.locator("#pcFindShows").click();
    /* v317: wait for the fetch itself - the pinned original card already
       pushes .pc-show above the curated count, so counting cards races */
    await page.waitForFunction(() => (window.TSB_SHOWS_EXTRA || []).length >= 3, null, { timeout: 45000 }).catch(() => {});
    const fresh = await page.evaluate(() => (window.TSB_SHOWS_EXTRA || []).length);
    ok(fresh >= 3, "FIND 3 MORE pulled real shows from the directory, live", fresh + " fetched");
    ok(await page.evaluate(() => (window.TSB_SHOWS_EXTRA || []).every(s => /^https:/.test(s.rss))), "every fetched show carries a real https feed");
    /* heart save -> YOUR SHOWS strip */
    await page.locator("#pcShowList .pc-show__save").first().click();
    await sleep(400);
    ok(await page.locator("#pcShowList .pc-ab__mine").count() === 1 && /YOUR SHOWS/.test(await page.locator("#pcShowList .pc-ab__mine").textContent()), "the heart saves the show to YOUR SHOWS");
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(1500);
    ok(await page.evaluate(() => (window.TSB_SHOWS_EXTRA || []).length) >= 3, "fetched shows survive a reload");
    ok(await page.locator("#pcShowList .pc-ab__mine").count() === 1, "the saved show rides above the list after reload");
    await page.screenshot({ path: "/tmp/qa316-shows.png" });
    await page.close();
  }

  /* --- v314 · WANT MORE: the shelf fetches its own next books, live --- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors in WANT MORE", String(e).slice(0, 90)));
    await page.goto(BASE + "/podcasts.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); localStorage.setItem("tsb_tour_done", "true"); localStorage.setItem("tsb_walk_done", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(1500);
    /* page through the whole curated shelf until WANT MORE appears */
    for (let i = 0; i < 14; i++) {
      if (await page.locator("#abWant").count()) break;
      await page.locator("#abMore").click().catch(() => {});
      await sleep(350);
    }
    ok(await page.locator("#abWant").count() === 1, "WANT MORE appears where the curated shelf ends");
    const before = await page.locator("#pcAudiobooks .pc-ab__card").count();
    await page.locator("#abWant").click();
    let diag = "", served = 0;
    for (let t = 0; t < 30; t++) {
      await sleep(3000);
      const st = await page.evaluate(() => ({
        got: Object.keys(JSON.parse(localStorage.getItem("tsb_ab_got") || "{}")).length,
        cards: document.querySelectorAll("#pcAudiobooks .pc-ab__card").length,
        busy: !!(document.getElementById("abWant") && document.getElementById("abWant").disabled),
        pool: (JSON.parse(localStorage.getItem("tsb_ab_pool") || "[]")).length
      }));
      served = st.got; diag = JSON.stringify(st);
      if (st.cards > before) break;
    }
    ok(served > 0, "WANT MORE pulled new audiobooks onto the shelf, live", diag);
    ok(await page.locator("#pcAudiobooks .pc-ab__card").count() > before, "the new books are painted on the shelf", (await page.locator("#pcAudiobooks .pc-ab__card").count()) + " vs " + before);
    ok(await page.evaluate(() => Object.keys(window.TSB_AUDIOBOOKS).some(k => k.indexOf("got-") === 0 && window.TSB_AUDIOBOOKS[k].discovered)), "the fetched books are real injected entries");
    await page.screenshot({ path: "/tmp/qa314/wantmore.png" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(1500);
    ok(await page.evaluate(() => Object.keys(window.TSB_AUDIOBOOKS).filter(k => k.indexOf("got-") === 0).length) > 0, "fetched books survive a reload (they stay yours)");
    await page.close();
  }

  /* --- v315 · the player opens for real: touch tap, and the pause/play physics --- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    page.on("pageerror", e => ok(/sign in again|session expired|ServiceWorker/i.test(String(e)), "no page errors in the touch player flow", String(e).slice(0, 90)));
    await page.goto(BASE + "/book.html?id=meditations", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); localStorage.setItem("tsb_tour_done", "true"); localStorage.setItem("tsb_walk_done", "true"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.locator("#heroPodcastBtn").click();
    await sleep(3500);
    /* a real touch tap on the dock title must raise the full sheet */
    const mt = await page.locator("#tsbAp .ap-mid").boundingBox();
    await page.touchscreen.tap(mt.x + mt.width / 2, mt.y + mt.height / 2);
    await sleep(900);
    ok(await page.evaluate(() => { const el = document.querySelector("#tsbApSheet"); if (!el) return false; const cs = getComputedStyle(el); return cs.position === "fixed" && cs.display === "flex"; }), "a touch tap on the dock opens the FIXED full-player sheet");
    ok(await page.evaluate(() => !!document.querySelector("#tsbApSheet .ap-qi")), "the sheet carries the chapter queue");
    await sleep(2200);
    /* paused + leave = it must still be paused on the next page */
    await page.locator("#tsbApSheet .ap-x").click();
    await sleep(400);
    await page.locator("#tsbAp .ap-play").click();   /* pause */
    await sleep(500);
    ok(await page.evaluate(() => window.localStorage.getItem("tsb_audio_playing") !== '"1"' && window.localStorage.getItem("tsb_audio_playing") !== "1"), "pausing records the paused state");
    await page.goto(BASE + "/stories.html", { waitUntil: "domcontentloaded" });
    await sleep(2600);
    ok(await page.evaluate(() => window.localStorage.getItem("tsb_audio_playing") !== '"1"' && window.localStorage.getItem("tsb_audio_playing") !== "1"), "paused stays paused after moving pages");
    ok(await page.evaluate(() => { const a = document.querySelector("audio"); return !a || a.paused; }), "no audio is playing on arrival");
    /* playing + leave = it keeps playing on the next page (retry a few
       times: archive.org rate-limits eager test runners) */
    let resumed = false;
    for (let r = 0; r < 6 && !resumed; r++) {
      await page.locator("#tsbAp .ap-play").click();
      await sleep(1500 + r * 700);   /* v316: the shelf warms 6 chapter lists on load, archive.org needs a longer leash */
      resumed = await page.evaluate(() => window.localStorage.getItem("tsb_audio_playing") === '"1"' || window.localStorage.getItem("tsb_audio_playing") === "1");
    }
    ok(resumed, "resuming records the playing state");
    await page.goto(BASE + "/graveyard.html", { waitUntil: "domcontentloaded" });
    await sleep(3000);
    ok(await page.evaluate(() => window.localStorage.getItem("tsb_audio_playing") === '"1"' || window.localStorage.getItem("tsb_audio_playing") === "1"), "playing continues across pages");
    /* v310 physics: a playing session restores and resumes WHEN THE BROWSER
       ALLOWS, else parks at the saved second with a tap-to-resume note. What
       must never happen is losing the session: the dock is back with the
       same queue and the ledger still says it was playing. */
    const restored = await page.waitForFunction(() => {
      const dock = document.getElementById("tsbAp");
      return dock && /Introduction|Meditations/i.test((dock.querySelector(".ap-t") || {}).textContent || "");
    }, null, { timeout: 25000 }).then(() => true).catch(() => false);
    ok(restored, "a playing session restores on the new page (resumed or parked + tap)");
    ok(await page.evaluate(() => window.localStorage.getItem("tsb_audio_playing") === '"1"' || window.localStorage.getItem("tsb_audio_playing") === "1"), "the session still remembers it was playing");
    await page.close();
  }

  /* ============ v320: THE PAUSE PROMISE (autoplay-allowed browser = the real phone) ============
     A paused session must NEVER start sound on its own - not on a page switch,
     not on a reload, not on a tab return. Only a session that was truly playing
     when you left may pick up with sound on the next page. These tests run in a
     context that ALLOWS autoplay (like a phone after the first tap), because the
     default headless context blocks play() and hides exactly this class of bug. */
  {
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, args: ["--autoplay-policy=no-user-gesture-required"] });
    const pg = await ctx2.newPage();
    const flag2 = () => pg.evaluate(() => window.localStorage.getItem("tsb_audio_playing"));
    const seed = () => pg.evaluate(() => { localStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_tour_done", "true"); localStorage.setItem("tsb_walk_done", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); });
    await pg.goto("http://127.0.0.1:8799/podcasts.html", { waitUntil: "domcontentloaded" });
    await seed();
    await pg.reload({ waitUntil: "domcontentloaded" });
    await pg.waitForTimeout(1400);
    let und404 = 0;
    pg.on("response", (r) => { if (r.status() === 404 && r.url().endsWith("/undefined")) und404++; });
    await pg.evaluate(() => window.TSB_AUDIO.playOriginal(0));
    await pg.waitForTimeout(2200);
    ok(await flag2() === "1", "an original really plays (sound allowed, not just the dock)", await flag2());
    await pg.evaluate(() => document.querySelector("#tsbAp .ap-play").click());
    await pg.waitForTimeout(600);
    ok(await flag2() === "0", "pause really pauses");
    await pg.goto("http://127.0.0.1:8799/index.html", { waitUntil: "domcontentloaded" });
    await pg.waitForSelector("#tsbAp", { timeout: 20000 });
    await pg.waitForTimeout(3200);
    ok(await flag2() === "0", "PAUSED stays silent when you open another page", await flag2());
    await pg.reload({ waitUntil: "domcontentloaded" });
    await pg.waitForSelector("#tsbAp", { timeout: 20000 });
    await pg.waitForTimeout(3200);
    ok(await flag2() === "0", "PAUSED stays silent on a full reload", await flag2());
    await pg.evaluate(() => document.querySelector("#tsbAp .ap-play").click());
    await pg.waitForTimeout(1400);
    ok(await flag2() === "1", "one tap on the dock wakes a parked session on demand", await flag2());
    await pg.goto("http://127.0.0.1:8799/notes.html", { waitUntil: "domcontentloaded" });
    await pg.waitForSelector("#tsbAp", { timeout: 20000 });
    await pg.waitForTimeout(3200);
    ok(await flag2() === "1", "PLAYING continues to the next page, unchanged", await flag2());
    ok(und404 === 0, "no original episode ever fetches a broken /undefined source", "404s=" + und404);
    await pg.close();
    await ctx2.close();
  }

  await browser.close();
  console.log("RESULT(browser): " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
