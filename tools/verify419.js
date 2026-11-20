/* Build 419 runtime verification (Playwright, server on 8414).
   The storage banner behaves (real quota failure only, once a day,
   escapable), the WHAT IS NEW card is keyed to the build and shows
   once, NEW badges answer to NEW_THIS_WEEK and hang below the cover
   in the centre, the batch covers are house-sized, the one reco
   engine answers, and desktop rows scroll instead of clipping. */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8414";
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra || ""); }
}

async function seeded(browser, width, height, onboardV) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript((v) => {
    try {
      localStorage.setItem("tsb_onboarded", "true");
      if (!localStorage.getItem("tsb_onboard_v")) localStorage.setItem("tsb_onboard_v", String(v));
      localStorage.setItem("tsb_theme", JSON.stringify("light"));
      localStorage.setItem("tsb_lang", JSON.stringify("en"));
      localStorage.setItem("tsb_splash", "1");
    } catch (e) {}
  }, onboardV == null ? 393 : onboardV);
  return ctx;
}

(async () => {
  const browser = await chromium.launch();

  /* ---- the update card: an existing reader finally sees it, once ---- */
  {
    const ctx = await seeded(browser, 390, 844, 393);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    const card = await page.evaluate(() => {
      const k = document.querySelector(".fo-upk");
      return { text: k ? k.textContent : "", v: localStorage.getItem("tsb_onboard_v") };
    });
    ok("419: existing reader gets the WHAT IS NEW card for this build", card.text.indexOf("WHAT IS NEW") === 0 && card.text.indexOf("419") >= 0, JSON.stringify(card));
    const btn = await page.$(".fo-up [data-next]");
    if (btn) await btn.click().catch(() => {});
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({
      gone: !document.querySelector(".fo-up"),
      v: localStorage.getItem("tsb_onboard_v")
    }));
    ok("419: continuing stamps the build so the card cannot repeat", after.gone && after.v === "419", JSON.stringify(after));
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1200);
    const again = await page.evaluate(() => !!document.querySelector(".fo-up"));
    ok("419: no card on the next load", !again);
    ok("419: home has no page errors during the update flow", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  /* ---- the storage banner: quota only, once, escapable ---- */
  {
    const ctx = await seeded(browser, 390, 844, 419);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1000);
    const fired = await page.evaluate(() => {
      try { localStorage.setItem("tsb_probe_huge", "x".repeat(12 * 1024 * 1024)); } catch (e) {}
      const d = document.getElementById("tsbStorageWarn");
      return {
        shown: !!d,
        usage: d ? (d.querySelector(".tsb-storage-usage") || {}).textContent || "" : "",
        freeBtn: d ? !!d.querySelector("[data-act=free]") : false
      };
    });
    ok("419: a real quota failure raises the banner with real usage", fired.shown && /of ~5 MB is used/.test(fired.usage) && fired.freeBtn, JSON.stringify(fired));
    const okBtn = await page.$("#tsbStorageWarn [data-act=ok]");
    if (okBtn) await okBtn.click().catch(() => {});
    await page.waitForTimeout(300);
    const dismissed = await page.evaluate(() => ({
      gone: !document.getElementById("tsbStorageWarn"),
      warnedAt: +(localStorage.getItem("tsb_storage_warned_at") || 0)
    }));
    ok("419: Got it dismisses and the dismissal is remembered", dismissed.gone && dismissed.warnedAt > 0, JSON.stringify(dismissed));
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(800);
    const refired = await page.evaluate(() => {
      try { localStorage.setItem("tsb_probe_huge2", "x".repeat(12 * 1024 * 1024)); } catch (e) {}
      return !!document.getElementById("tsbStorageWarn");
    });
    ok("419: the banner stays down for the rest of the day", !refired);
    const freed = await page.evaluate(() => {
      try { localStorage.removeItem("tsb_probe_huge"); localStorage.removeItem("tsb_probe_huge2"); } catch (e) {}
      return typeof (window.TSB_STORAGE || {}).freeSpace === "function";
    });
    ok("419: TSB_STORAGE.freeSpace is exposed for the banner and Settings", freed);
    ok("419: no page errors during the storage flow", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  /* ---- NEW badges: the whole list, below the cover, centred ---- */
  {
    const ctx = await seeded(browser, 390, 844, 419);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    const shelf = await page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll(".lb-row__hd h3")).map((h) => h.textContent);
      return { heads: heads, newCards: document.querySelectorAll(".lb-tag--new").length };
    });
    ok("419: the New this week shelf stands on the home page", shelf.heads.indexOf("New this week") >= 0, shelf.heads.join(","));
    ok("419: shelf cards wear the New tag", shelf.newCards >= 5, String(shelf.newCards));
    const geo = await page.evaluate(() => {
      const inp = document.getElementById("searchInput");
      if (inp) { inp.value = "midnight library"; inp.dispatchEvent(new Event("input", { bubbles: true })); }
      return true;
    });
    await page.waitForTimeout(1200);
    const card = await page.evaluate(() => {
      const row = document.querySelector(".card .card__newrow");
      if (!row) return { found: false };
      const badge = row.querySelector(".card__new");
      const cover = row.closest(".card").querySelector(".card__cover");
      const b = badge.getBoundingClientRect(), c = cover.getBoundingClientRect();
      return {
        found: true, text: badge.textContent,
        centreDelta: Math.abs((b.left + b.width / 2) - (c.left + c.width / 2)),
        badgeTop: b.top, coverBottom: c.bottom
      };
    });
    ok("419: a book beyond the old twenty wears NEW in grid view", card.found && /NEW/.test(card.text || ""), JSON.stringify(card));
    ok("419: the tag sits below the cover, in the centre", card.found && card.centreDelta < 24 && card.badgeTop >= card.coverBottom - 16, JSON.stringify(card));
    ok("419: no page errors in the badge flow", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  /* ---- covers + the one reco engine ---- */
  {
    const ctx = await seeded(browser, 390, 844, 419);
    const page = await ctx.newPage();
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(800);
    const probe = await page.evaluate(async () => {
      const sizes = {};
      for (const id of ["kite-runner", "hold-me-tight", "second-act-advantage"]) {
        sizes[id] = await new Promise((res) => {
          const im = new Image();
          im.onload = () => res([im.naturalWidth, im.naturalHeight]);
          im.onerror = () => res([0, 0]);
          im.src = "assets/covers/" + id + ".jpg";
        });
      }
      const recs = (window.TSB && TSB.recommend) ? TSB.recommend(3).map((b) => b.id) : [];
      const why = recs.length && window.TSB.reco ? TSB.reco.explain(recs[0]) : null;
      return { sizes, recs, why, build: window.TSB_BUILD || "" };
    });
    ok("419: redrawn covers are library-sized 500x750",
       ["kite-runner", "hold-me-tight", "second-act-advantage"].every((id) => probe.sizes[id][0] === 500 && probe.sizes[id][1] === 750),
       JSON.stringify(probe.sizes));
    ok("419: the one reco engine recommends real books and can explain itself",
       probe.recs.length === 3 && !!probe.why && typeof probe.why.total === "number", JSON.stringify(probe).slice(0, 160));
    ok("419: build stamp says 419", probe.build === "419", probe.build);
    await ctx.close();
  }

  /* ---- desktop: Originals contrast + rows that scroll, not clip ---- */
  {
    const ctx = await seeded(browser, 1440, 900, 419);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    const desk = await page.evaluate(() => {
      const out = { rows: 0, clipped: [], orig: null };
      document.querySelectorAll(".ft-row").forEach((r) => {
        out.rows++;
        const cs = getComputedStyle(r);
        const rect = r.getBoundingClientRect();
        if (cs.overflowX !== "auto" || rect.right > window.innerWidth + 1) out.clipped.push(cs.overflowX + "@" + Math.round(rect.right));
      });
      const o = document.querySelector(".ft-orig");
      if (o) {
        const h2 = o.querySelector("h2");
        out.orig = {
          bg: getComputedStyle(o).backgroundColor,
          color: h2 ? getComputedStyle(h2).color : ""
        };
      }
      return out;
    });
    ok("419: desktop book rows scroll inside themselves at 1440px", desk.rows > 0 && desk.clipped.length === 0, JSON.stringify(desk.clipped));
    ok("419: the Originals card is dark text on its white light-mode card",
       !!desk.orig && desk.orig.color === "rgb(33, 28, 18)", JSON.stringify(desk.orig));
    ok("419: desktop home has no page errors", errs.length === 0, errs.join(" | ").slice(0, 200));
    await ctx.close();
  }

  await browser.close();
  console.log("VERIFY419: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
