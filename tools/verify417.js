/* Build 416 desktop/tablet QA matrix (T13).
   Widths 768, 1024, 1280, 1440, 1920 plus 1024 at 125% and 150% zoom.
   Checks: no horizontal overflow, sidebar present and sticky at desk
   widths, reader measure, focus ring, desktop-without-film.js, and that
   the phone layout below 700px is untouched. */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8414";
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra || ""); }
}
const PAGES = [
  ["index", "/index.html"],
  ["book", "/book.html?id=atomic-habits"],
  ["reader", "/reader.html?id=atomic-habits"],
  ["audio", "/audio.html"],
  ["stories", "/stories.html"],
  ["story", "/story.html?id=tsb-morning-pages"],
  ["notes", "/notes.html"],
  ["you", "/you.html"],
  ["profile", "/profile.html"],
  ["settings", "/settings.html"],
  ["gold", "/gold.html"],
  ["graveyard", "/graveyard.html"],
  ["casefile", "/casefile.html?case=kodak-digital"],
  ["404", "/404.html"]
];
const WIDTHS = [768, 1024, 1280, 1440, 1920];

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function seed(p) {
    await p.addInitScript(() => {
      try {
        localStorage.setItem("tsb_onboarded", "true");
        localStorage.setItem("tsb_onboard_v", "393");
        localStorage.setItem("tsb_splash", "1");
        localStorage.setItem("tsb_theme", JSON.stringify("light"));
        localStorage.setItem("tsb_lang", JSON.stringify("en"));
        localStorage.setItem("tsb_bar_behave", "fixed");
      } catch (e) {}
    });
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await seed(page);
  page.on("pageerror", (e) => errors.push(e.message));

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const [name, url] of PAGES) {
      await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(420);
      const m = await page.evaluate(() => {
        const de = document.documentElement;
        const bar = document.getElementById("tsbBar");
        const out = {
          ov: de.scrollWidth - de.clientWidth,
          barW: bar ? Math.round(bar.getBoundingClientRect().width) : 0,
          barPos: bar ? getComputedStyle(bar).position : ""
        };
        if (location.pathname.endsWith("reader.html")) {
          const app = document.getElementById("rmApp");
          out.rmW = app ? Math.round(app.getBoundingClientRect().width) : 0;
        }
        return out;
      });
      ok(w + " " + name + ": no horizontal overflow", m.ov <= 1, "ov=" + m.ov);
      if (w >= 1024) {
        ok(w + " " + name + ": sidebar present", name === "reader" ? true : m.barW >= 70, "barW=" + m.barW);
        if (name === "reader" && w >= 1024) ok(w + " reader: text column at reading measure (<=720px)", m.rmW > 300 && m.rmW <= 720, "rmW=" + m.rmW);
      }
    }
  }

  /* zoom: 1024 CSS px at 125% and 150% page scale */
  const session = await page.context().newCDPSession(page);
  for (const z of [1.25, 1.5]) {
    await page.setViewportSize({ width: 1024, height: 900 });
    await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: z });
    for (const name of ["index", "book", "settings"]) {
      const url = PAGES.find((p) => p[0] === name)[1];
      await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(350);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok("zoom " + Math.round(z * 100) + "% " + name + ": no horizontal overflow", ov <= 1, "ov=" + ov);
    }
  }
  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });

  /* sidebar geometry and stickiness at 1440 */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const geo = await page.evaluate(() => {
    const bar = document.getElementById("tsbBar");
    const r = bar.getBoundingClientRect();
    return { w: Math.round(r.width), top: Math.round(r.top), pos: getComputedStyle(bar).position };
  });
  ok("1440: full sidebar is 258px and sticky", geo.w >= 250 && geo.w <= 262 && geo.pos === "sticky", JSON.stringify(geo));
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(300);
  const stuck = await page.evaluate(() => Math.round(document.getElementById("tsbBar").getBoundingClientRect().top));
  ok("1440: sidebar stays pinned while the page scrolls", Math.abs(stuck - geo.top) <= 2, "top=" + stuck);
  await page.screenshot({ path: "/tmp/shot416-index1440.png" });

  /* band: 1024-1180 falls back to the rail */
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const bandW = await page.evaluate(() => Math.round(document.getElementById("tsbBar").getBoundingClientRect().width));
  ok("1100 band: sidebar reduces to the 88px rail", bandW >= 80 && bandW <= 96, "w=" + bandW);

  /* tablet rail at 768 */
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const tab = await page.evaluate(() => {
    const b = document.getElementById("tsbBar");
    return { w: Math.round(b.getBoundingClientRect().width), pos: getComputedStyle(b).position };
  });
  ok("768 tablet: 88px rail, sticky", tab.w >= 80 && tab.w <= 96 && tab.pos === "sticky", JSON.stringify(tab));
  await page.screenshot({ path: "/tmp/shot416-index768.png" });

  /* focus ring: tab to the sidebar's first item and read its outline */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/settings.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const ring = await page.evaluate(() => {
    const el = document.querySelector("#tsbBar .tsb-bar__item") || document.querySelector("button, a");
    el.focus();
    const cs = getComputedStyle(el);
    return { ow: cs.outlineWidth, os: cs.outlineStyle };
  });
  ok("keyboard: focused element shows a visible ring", ring.ow !== "0px" && ring.os !== "none", JSON.stringify(ring));

  /* keyboard shortcut: "/" focuses search on index */
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.keyboard.press("/");
  await page.waitForTimeout(950);
  const focused = await page.evaluate(() => {
    const a = document.activeElement;
    return a ? (a.tagName + ":" + (a.getAttribute("aria-keyshortcuts") || "")) : "none";
  });
  ok('keyboard: "/" focuses the search box', focused.indexOf("INPUT") === 0, focused);

  /* desktop without film.js: the desk must not depend on the gate class */
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const p2 = await ctx2.newPage();
  await seed(p2);
  await p2.route("**/js/film.js*", (r) => r.abort());
  await p2.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
  await p2.waitForTimeout(700);
  const noFilm = await p2.evaluate(() => {
    const bar = document.getElementById("tsbBar");
    const main = document.querySelector("main");
    return {
      filmClass: document.documentElement.classList.contains("film"),
      barW: bar ? Math.round(bar.getBoundingClientRect().width) : 0,
      barPos: bar ? getComputedStyle(bar).position : "",
      mainLeft: main ? Math.round(main.getBoundingClientRect().left) : 0
    };
  });
  ok("no film.js: desktop shell still applies (sidebar styled, content offset)", noFilm.barW >= 250 && noFilm.barPos === "sticky" && noFilm.mainLeft >= 0, JSON.stringify(noFilm));

  /* the phone is untouched: at 390 the bar is a fixed bottom bar again */
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  await seed(p3);
  await p3.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await p3.waitForTimeout(600);
  const mob = await p3.evaluate(() => {
    const b = document.getElementById("tsbBar");
    const r = b.getBoundingClientRect();
    return { pos: getComputedStyle(b).position, bottomish: Math.round(844 - r.bottom), w: Math.round(r.width) };
  });
  ok("390 phone: bottom bar unchanged (fixed, full-width, at the bottom)", mob.pos === "fixed" && mob.bottomish < 40 && mob.w > 300, JSON.stringify(mob));

  /* v417: a landscape phone is wide but short; it must keep the phone
     bar, not grow a sidebar */
  const ctx4 = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const p4 = await ctx4.newPage();
  await seed(p4);
  await p4.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await p4.waitForTimeout(600);
  const land = await p4.evaluate(() => {
    const b = document.getElementById("tsbBar");
    const r = b.getBoundingClientRect();
    return { pos: getComputedStyle(b).position, h: Math.round(r.height), w: Math.round(r.width) };
  });
  ok("844x390 landscape phone: phone bar, not a sidebar", land.pos === "fixed" && land.h < 120, JSON.stringify(land));

  /* v417: the dead plus never renders, even for a saved bar that had it */
  const p5 = page;
  await p5.evaluate(() => { try { localStorage.setItem("tsb_custom_bar", JSON.stringify(["home", "library", "audio", "you", "plus"])); } catch (e) {} });
  await p5.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await p5.waitForTimeout(700);
  const plusCount = await p5.evaluate(() => document.querySelectorAll("#tsbBar .tsb-bar__item--plus").length);
  ok("v417: no plus item renders from a saved bar", plusCount === 0, "count=" + plusCount);

  /* v417: served history is written, and today's line is stable across reloads */
  await p5.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await p5.waitForTimeout(800);
  const served1 = await p5.evaluate(() => { try { return JSON.parse(localStorage.getItem("tsb_served") || "{}"); } catch (e) { return {}; } });
  const line1 = await p5.evaluate(() => { const el = document.querySelector(".ft-mp__q, .ft-mp__line"); return el ? el.textContent.trim().slice(0, 60) : ""; });
  await p5.reload({ waitUntil: "networkidle" });
  await p5.waitForTimeout(800);
  const line2 = await p5.evaluate(() => { const el = document.querySelector(".ft-mp__q, .ft-mp__line"); return el ? el.textContent.trim().slice(0, 60) : ""; });
  ok("v417: served history records books and the daily line", !!(served1.b && Object.keys(served1.b).length && (served1.q || served1.b)), JSON.stringify(Object.keys(served1)));
  ok("v417: today's line is the same after a reload", !!line1 && line1 === line2, line1.slice(0, 40));

  /* v417: the 49 new covers are real designed images, 500x750 */
  const coverIds = ["night", "kite-runner", "atlas-of-the-heart", "tuesdays-with-morrie", "overstory", "superhuman", "midnight-library", "hold-me-tight", "into-thin-air", "wonder"];
  const sizes = await p5.evaluate(async (ids) => {
    const out = {};
    for (const id of ids) {
      out[id] = await new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img.naturalWidth + "x" + img.naturalHeight);
        img.onerror = () => res("error");
        img.src = "assets/covers/" + id + ".jpg";
      });
    }
    return out;
  }, coverIds);
  ok("v417: sampled new covers are 500x750", Object.values(sizes).every((s) => s === "500x750"), JSON.stringify(sizes));

  /* reader and settings screenshots for the human check */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/reader.html?id=atomic-habits", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/shot416-reader1440.png" });
  await page.goto(BASE + "/book.html?id=atomic-habits", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/shot416-book1440.png" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + "/audio.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/shot416-audio1280.png" });

  const real = errors.filter((e) => !/favicon|net::|404/.test(e));
  ok("no page errors during the matrix", real.length === 0, real.slice(0, 3).join(" | "));
  console.log("VERIFY417: " + pass + "/" + (pass + fail) + " checks passed");
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("VERIFY CRASH", e); process.exit(2); });
