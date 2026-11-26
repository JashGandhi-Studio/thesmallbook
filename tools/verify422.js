/* Build 422 runtime verification (Playwright, server on 8416).
   The fix build: Notes no longer dumps its own source and its New
   button works; the audio dock never hides itself, can be swiped
   away either direction or closed with its new button; the 3D book
   keeps the cover's true shape on every screen; baked book pages
   reserve their cover (no layout shift); the Mind Pick finishes its
   question on tablet; the quote wall opens fitted, not cropped. */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8416";
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra || ""); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VPS = { phone: { width: 390, height: 844 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } };

async function seeded(browser, vp) {
  const ctx = await browser.newContext({ viewport: VPS[vp], deviceScaleFactor: 2, isMobile: vp !== "desktop", hasTouch: true });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("tsb_onboarded", "true");
      localStorage.setItem("tsb_onboard_v", "422");
      localStorage.setItem("tsb_theme", JSON.stringify("light"));
      localStorage.setItem("tsb_lang", JSON.stringify("en"));
      sessionStorage.setItem("tsb_splash", "1");
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(e.message.slice(0, 140)));
  page._errs = errs;
  return page;
}
async function startDock(page) {
  await page.goto(BASE + "/audio.html", { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await page.evaluate(() => { const b = document.querySelector("#lnStart"); if (b) b.click(); });
  await sleep(2500);
  await page.goto(BASE + "/settings.html", { waitUntil: "domcontentloaded" });
  await sleep(2200);
}
const dockRect = page => page.evaluate(() => { const d = document.querySelector("#tsbAp"); if (!d) return null; const b = d.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), bottom: Math.round(b.bottom), vh: innerHeight }; });

(async () => {
  const browser = await chromium.launch();

  /* 1 · Notes healed, editor opens */
  for (const vp of ["phone", "desktop"]) {
    const page = await seeded(browser, vp);
    await page.goto(BASE + "/notes.html", { waitUntil: "domcontentloaded" });
    await sleep(1800);
    const dumped = await page.evaluate(() => /function exportPDF|docHTML\(n\)/.test(document.body.innerText));
    await page.evaluate(() => { const b = document.querySelector("#ntNew"); if (b) b.click(); });
    await sleep(900);
    const editor = await page.evaluate(() => [...document.querySelectorAll('[contenteditable="true"], textarea')].some(el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; }));
    ok(`notes ${vp}: no raw source on the page, + New opens an editor`, !dumped && editor && page._errs.length === 0, JSON.stringify(page._errs));
    await page.context().close();
  }

  /* 2 · the player: stays, pauses, closes, swipes */
  {
    const page = await seeded(browser, "phone");
    await startDock(page);
    const d1 = await dockRect(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(2800);
    const d2 = await dockRect(page);
    ok("player phone: dock present on another page and still there after scrolling to the bottom", !!(d1 && d2 && d2.bottom <= d2.vh + 1), JSON.stringify({ d1, d2 }));
    await page.evaluate(() => window.scrollTo(0, 0)); await sleep(500);
    const rd = () => page.evaluate(() => { const au = window.TSB_AUDIO && TSB_AUDIO.au(); return au ? { t: +au.currentTime.toFixed(2), paused: au.paused } : null; });
    await page.evaluate(() => { const au = window.TSB_AUDIO && TSB_AUDIO.au(); if (au && au.paused) document.querySelector("#tsbAp .ap-play").click(); });
    await sleep(1000);
    await page.evaluate(() => document.querySelector("#tsbAp .ap-play").click());
    await sleep(400); const p1 = await rd(); await sleep(1300); const p2 = await rd();
    ok("player phone: the dock button truly pauses (clock frozen)", !!(p1 && p2 && p1.paused && p2.paused && p2.t === p1.t), JSON.stringify({ p1, p2 }));
    await page.evaluate(() => document.querySelector("#tsbAp .ap-play").click());
    await sleep(600);
    const mid = await page.evaluate(() => { const m = document.querySelector("#tsbAp .ap-mid"); const b = m.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: mid.x, y: mid.y, id: 1 }] });
    for (let i = 1; i <= 12; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: mid.x - i * 15, y: mid.y, id: 1 }] }); await sleep(16); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(1000);
    const swipedAway = await page.evaluate(() => !document.querySelector("#tsbAp"));
    ok("player phone: a leftward touch swipe dismisses the dock", swipedAway && page._errs.length === 0, JSON.stringify(page._errs));
    await page.evaluate(() => { if (window.TSB_AUDIO) TSB_AUDIO.resurface(); });
    await sleep(1000);
    await page.evaluate(() => { const b = document.querySelector("#tsbAp .ap-close"); if (b) b.click(); });
    await sleep(800);
    ok("player phone: the dock's close button removes the player", await page.evaluate(() => !document.querySelector("#tsbAp")));
    await page.context().close();
  }
  for (const vp of ["tablet", "desktop"]) {
    const page = await seeded(browser, vp);
    await startDock(page);
    const d = await dockRect(page);
    await page.evaluate(() => { const m = document.querySelector("#tsbAp .ap-mid"); if (m) m.click(); });
    await sleep(1000);
    const sheetBtn = await page.evaluate(() => !!document.querySelector("#apClosePlayer"));
    await page.evaluate(() => { const b = document.querySelector("#apClosePlayer"); if (b) b.click(); });
    await sleep(800);
    const gone = await page.evaluate(() => !document.querySelector("#tsbAp"));
    ok(`player ${vp}: dock in view${vp === "tablet" ? " and clear of the rail (x>=110)" : ""}, sheet Close Player removes it`,
       !!(d && d.bottom <= d.vh + 1 && (vp !== "tablet" || d.x >= 110) && sheetBtn && gone), JSON.stringify(d));
    await page.context().close();
  }

  /* 3 · the 3D book keeps the cover's shape */
  for (const vp of ["phone", "tablet", "desktop"]) {
    const page = await seeded(browser, vp);
    await page.goto(BASE + "/book.html?id=influence", { waitUntil: "domcontentloaded" });
    await sleep(3200);
    const ratio = await page.evaluate(() => { const hero = document.querySelector(".bookhero__coverbox .bk3"); if (!hero) return 0; const h = parseFloat(getComputedStyle(hero).getPropertyValue("--h")); return h / hero.offsetWidth; });
    ok(`book ${vp}: cover face keeps the 2:3 shape (ratio 1.47-1.53, got ${ratio.toFixed(2)})`, ratio > 1.47 && ratio < 1.53 && page._errs.length === 0, JSON.stringify(page._errs));
    await page.context().close();
  }

  /* 4 · baked pages: no layout shift from the cover */
  {
    const page = await seeded(browser, "phone");
    await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
    await page.goto(BASE + "/books/atomic-habits.html", { waitUntil: "domcontentloaded" });
    await sleep(3500);
    const cls = await page.evaluate(() => window.__cls);
    ok(`baked book: layout shift under 0.02 (got ${cls.toFixed(3)}, was 0.187)`, cls < 0.02);
    await page.context().close();
  }

  /* 5 · Mind Pick finishes its question on tablet */
  {
    const page = await seeded(browser, "tablet");
    await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
    await sleep(2200);
    const mp = await page.evaluate(() => { const q = document.querySelector(".ft-mp__q"); return q ? q.scrollHeight <= q.clientHeight + 2 : false; });
    ok("home tablet: the Mind Pick question is not cut off", mp);
    await page.context().close();
  }

  /* 6 · quote wall opens fitted */
  {
    const page = await seeded(browser, "phone");
    await page.goto(BASE + "/quotes.html", { waitUntil: "domcontentloaded" });
    await sleep(3500);
    const cut = await page.evaluate(() => { const b = document.querySelector("#qwBoard, .qw-board"); if (!b) return -1; return [...b.querySelectorAll(".qw-note, .qw-photo")].filter(n => n.getBoundingClientRect().right > innerWidth + 2).length; });
    ok("quote wall phone: no note is cut at the right edge on open", cut === 0, "cut=" + cut);
    await page.context().close();
  }

  /* 7 · OG stage fits a phone; Listen tabs are full-height targets */
  {
    const page = await seeded(browser, "phone");
    await page.goto(BASE + "/og-builder.html", { waitUntil: "domcontentloaded" });
    await sleep(1200);
    const fits = await page.evaluate(() => { const w = document.querySelector(".wrap"); const b = w.getBoundingClientRect(); return b.width <= innerWidth + 2 && b.left >= -2; });
    ok("og builder phone: the whole 1200px stage is visible at once", fits);
    await page.goto(BASE + "/audio.html", { waitUntil: "domcontentloaded" });
    await sleep(2000);
    const tabs = await page.evaluate(() => [...document.querySelectorAll("#lnJump button")].map(b => Math.round(b.getBoundingClientRect().height)));
    ok("listen: shelf jump tabs are at least 38px tall", tabs.length > 0 && Math.min(...tabs) >= 38, JSON.stringify(tabs));
    await page.context().close();
  }

  /* 8 · Ask: the compare mode opens from the + menu */
  {
    const page = await seeded(browser, "phone");
    await page.goto(BASE + "/chat.html", { waitUntil: "domcontentloaded" });
    await sleep(3000);
    await page.evaluate(() => { const b = document.querySelector(".fa-plus"); if (b) b.click(); });
    await sleep(1000);
    await page.evaluate(() => { const els = [...document.querySelectorAll("button, a")]; const t = els.find(e => /compare two books/i.test(e.textContent || "") && e.getBoundingClientRect().width > 0); if (t) t.click(); });
    await sleep(1500);
    const open = await page.evaluate(() => { const d = document.querySelector("#tsb-cmp"); return d ? d.classList.contains("aq-lib--open") : false; });
    ok("ask: Compare two books opens its picker without errors", open && page._errs.length === 0, JSON.stringify(page._errs));
    await page.context().close();
  }

  /* 9 · v422: a swipe can start on the Play button itself, and a desktop
     drag moves the whole dock instead of stretching it */
  {
    const page = await seeded(browser, "phone");
    await startDock(page);
    const mid = await page.evaluate(() => { const d = document.querySelector("#tsbAp"); const b = d.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; });
    const cdp2 = await page.context().newCDPSession(page);
    await cdp2.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: mid.x, y: mid.y, id: 1 }] });
    for (let i = 1; i <= 12; i++) { await cdp2.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: mid.x - i * 15, y: mid.y, id: 1 }] }); await sleep(16); }
    await cdp2.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(1100);
    ok("player phone: a swipe starting on the Play button still dismisses the dock", await page.evaluate(() => !document.querySelector("#tsbAp")));
    await page.context().close();
  }
  {
    const page = await seeded(browser, "desktop");
    await page.evaluate(() => { try { localStorage.removeItem("tsb_ap_dock_pos"); } catch (e) {} });
    await startDock(page);
    const before = await dockRect(page);
    const start = await page.evaluate(() => { const d = document.querySelector("#tsbAp"); const b = d.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, h: Math.round(b.height) }; });
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(start.x + 22 * i, start.y - 6 * i); await sleep(20); }
    await page.mouse.up(); await sleep(700);
    const after = await dockRect(page);
    ok("player desktop: dragging moves the dock as one piece (no stretching, spot remembered)", !!(before && after && after.x > before.x + 150 && Math.abs(after.bottom - after.vh) >= 0 && after.w === before.w), JSON.stringify({ before, after }));
    const hAfter = await page.evaluate(() => Math.round(document.querySelector("#tsbAp").getBoundingClientRect().height));
    ok("player desktop: dock height stays one row while dragging", Math.abs(hAfter - start.h) <= 4, "h=" + hAfter + " startH=" + start.h);
    /* the dropped spot is the remembered spot, to the pixel, and a
       resurfaced dock takes a swipe straight away (no toast shield) */
    const savedPos = await page.evaluate(() => JSON.parse(localStorage.getItem("tsb_ap_dock_pos") || "null"));
    ok("player desktop: the remembered spot is the dropped spot", !!(savedPos && after && savedPos.x === Math.round(after.x) && savedPos.y === Math.round(after.y)), JSON.stringify({ savedPos, after }));
    await page.evaluate(() => document.querySelector("#tsbAp .ap-close").click());
    await sleep(400);
    await page.evaluate(() => window.TSB_AUDIO && TSB_AUDIO.resurface());
    await sleep(300);
    const restored = await dockRect(page);
    ok("player desktop: resurfacing returns the dock to the remembered spot", !!(restored && savedPos && restored.x === savedPos.x && restored.y === savedPos.y), JSON.stringify({ restored, savedPos }));
    const mid2 = await page.evaluate(() => { const d = document.querySelector("#tsbAp"); const b = d.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; });
    await page.mouse.move(mid2.x, mid2.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(mid2.x - i * 20, mid2.y); await sleep(16); }
    await page.mouse.up(); await sleep(900);
    ok("player desktop: a resurfaced dock drags again immediately", await page.evaluate(() => { const d = document.querySelector("#tsbAp"); return !d || Math.round(d.getBoundingClientRect().x) < 500; }));
    await page.context().close();
  }
  {
    const page = await seeded(browser, "phone");
    await page.goto(BASE + "/stories.html", { waitUntil: "domcontentloaded" });
    await sleep(2200);
    const targets = await page.evaluate(() => {
      const pick = s => { const el = document.querySelector(s); return el ? Math.round(el.getBoundingClientRect().height) : 0; };
      return { follow: pick(".cm-follow"), chip: 0, save: 0 };
    });
    await page.goto(BASE + "/graveyard.html", { waitUntil: "domcontentloaded" });
    await sleep(1600);
    targets.chip = await page.evaluate(() => { const el = document.querySelector(".gy-chip"); return el ? Math.round(el.getBoundingClientRect().height) : 0; });
    await page.goto(BASE + "/audio.html", { waitUntil: "domcontentloaded" });
    await sleep(1800);
    targets.save = await page.evaluate(() => { const el = document.querySelector(".pc-ab__save"); return el ? Math.round(el.getBoundingClientRect().height) : 0; });
    ok("tap targets: story Follow, graveyard chips and Listen save buttons are at least 40px", targets.follow >= 40 && targets.chip >= 40 && targets.save >= 40, JSON.stringify(targets));
    await page.context().close();
  }

  await browser.close();
  console.log(`VERIFY422: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("VERIFY CRASH", e); process.exit(1); });
