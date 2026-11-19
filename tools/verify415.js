/* Build 415 runtime verification: Pixel 7 profile + desktop widths. */
const { chromium, devices } = require("playwright");

const BASE = "http://127.0.0.1:8414";
let pass = 0, fail = 0;
const bad = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; bad.push(name); console.log("FAIL", name, extra || ""); }
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  async function seed(p) {
    await p.addInitScript(() => {
      try {
        localStorage.setItem("tsb_onboarded", "true");
        localStorage.setItem("tsb_onboard_v", "393");
        localStorage.setItem("tsb_splash", "1");
        localStorage.setItem("tsb_theme", JSON.stringify("light"));
        localStorage.setItem("tsb_lang", JSON.stringify("en"));
      } catch (e) {}
    });
  }
  await seed(page);

  /* ---- B: the reader tells the truth about its length ---- */
  await page.goto(BASE + "/reader.html?id=atomic-habits", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const readerState = await page.evaluate(() => {
    const segs = document.querySelectorAll(".frd-segs i").length;
    const pos = document.getElementById("rmPos") ? document.getElementById("rmPos").textContent : "";
    const total = window.TSB_READER && TSB_READER.total ? TSB_READER.total : 0;
    const nextT = document.querySelector(".frd-next__t") ? document.querySelector(".frd-next__t").textContent : "";
    return { segs, pos, total, nextT };
  });
  ok("reader: live total is the real book length (10 pages)", readerState.total === 10, JSON.stringify(readerState));
  ok("reader: progress segments match the live total, not the old frozen 3", readerState.segs === Math.min(readerState.total, 12), JSON.stringify(readerState));
  ok("reader: position label reads the live total", /of 10/.test(readerState.pos), readerState.pos);
  ok("reader: Finish is NOT offered on page one", readerState.nextT !== "Finish", readerState.nextT);

  /* walk to the last page with the dock Next button */
  for (let i = 0; i < 11; i++) {
    const t = await page.evaluate(() => {
      const b = document.querySelector(".frd-next__t");
      return b ? b.textContent : "";
    });
    if (t === "Finish" || t === "Done") break;
    await page.click(".frd-next").catch(() => {});
    await page.waitForTimeout(350);
  }
  const endState = await page.evaluate(() => {
    const pos = document.getElementById("rmPos") ? document.getElementById("rmPos").textContent : "";
    const nextT = document.querySelector(".frd-next__t") ? document.querySelector(".frd-next__t").textContent : "";
    return { pos, nextT };
  });
  ok("reader: Finish appears only on the true last page", /of 10/.test(endState.pos) && (endState.nextT === "Finish" || endState.nextT === "Done"), JSON.stringify(endState));

  /* ---- A: storage guard ---- */
  await page.goto(BASE + "/settings.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const stor = await page.evaluate(() => ({
    has: !!window.TSB_STORAGE,
    bytes: window.TSB_STORAGE && TSB_STORAGE.usage ? TSB_STORAGE.usage().bytes : 0,
    line: document.getElementById("storageLine") ? document.getElementById("storageLine").textContent.slice(0, 40) : "",
    dl: !!document.getElementById("downloadData"),
    adv: !!document.querySelector("details.bs-adv")
  }));
  ok("storage: guard is live and reports real usage", stor.has && stor.bytes > 0, JSON.stringify(stor));
  ok("storage: Settings shows the usage line and the download button", stor.dl && stor.line.length > 5, JSON.stringify(stor));
  ok("settings: bar studio is behind the Advanced disclosure", stor.adv);

  /* ---- C: founder identity ---- */
  const fnd = await page.evaluate(() => ({
    fn: !!(window.TSB && TSB.isFounder),
    yes: window.TSB && TSB.isFounder ? TSB.isFounder("acimotreyothy@gmail.com") : "n/a",
    no: window.TSB && TSB.isFounder ? TSB.isFounder("Ananya Sharma@example.com") : "n/a"
  }));
  ok("founder: one isFounder(), true for the founder email only", fnd.fn && fnd.yes === true && fnd.no === false, JSON.stringify(fnd));

  /* ---- F: text size is font-size, never zoom ---- */
  await page.goto(BASE + "/book.html?id=atomic-habits", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const ts = await page.evaluate(() => {
    document.documentElement.setAttribute("data-ts", "l");
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const les = document.querySelector(".lessons");
    return { root, zoom: les ? getComputedStyle(les).zoom : "none" };
  });
  ok("text size: A+ moves the root font to 18px and nothing uses zoom", ts.root === 18 && (ts.zoom === "1" || ts.zoom === "none" || ts.zoom === "normal"), JSON.stringify(ts));

  /* ---- G: desktop and tablet widths on key pages ---- */
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await dctx.newPage();
  await seed(dp);
  for (const w of [1440, 1280, 1024, 834]) {
    await dp.setViewportSize({ width: w, height: 900 });
    await dp.goto(BASE + "/index.html", { waitUntil: "networkidle" });
    await dp.waitForTimeout(700);
    const ov = await dp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("desktop: no horizontal overflow at " + w + "px", ov <= 1, "overflow=" + ov);
  }
  await dp.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await dp.waitForTimeout(600);
  await dp.screenshot({ path: "/tmp/shots415-desktop1440.png" });

  await page.screenshot({ path: "/tmp/shots415-book.png" });
  await page.goto(BASE + "/reader.html?id=atomic-habits", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "/tmp/shots415-reader.png" });

  const realErrors = errors.filter((e) => !/favicon|ERR_|net::|404/.test(e));
  ok("no page errors during the run", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
  console.log("VERIFY415: " + pass + "/" + (pass + fail) + " checks passed");
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("VERIFY CRASH", e); process.exit(2); });
