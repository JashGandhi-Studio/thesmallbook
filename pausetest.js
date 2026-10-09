/* THE PAUSE PROMISE - run in a browser that ALLOWS autoplay (real-phone behavior) */
const { chromium } = require("playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();

  const dockState = () => p.evaluate(() => ({
    playing: localStorage.getItem("tsb_audio_playing"),
    key: (JSON.parse(localStorage.getItem("tsb_audio_last") || "{}").key || "").slice(0, 12)
  }));

  await p.goto("http://127.0.0.1:8799/podcasts.html", { waitUntil: "domcontentloaded" });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("tsb_onboarded","true"); localStorage.setItem("tsb_tour_done","true"); localStorage.setItem("tsb_walk_done","true"); localStorage.setItem("tsb_supportbar_seen","true"); });
  await p.reload({ waitUntil: "domcontentloaded" });
  await sleep(1500);

  /* 1. play a TSB ORIGINAL ep1 */
  await p.evaluate(() => TSB_AUDIO.playOriginal(0));
  await sleep(2500);
  let st = await dockState();
  console.log("1 playing original:", JSON.stringify(st), "<- must be playing=1");

  /* 2. PAUSE it */
  await p.evaluate(() => document.querySelector("#tsbAp .ap-play").click());
  await sleep(700);
  st = await dockState();
  console.log("2 paused:", JSON.stringify(st), "<- must be playing=0");

  /* 3. walk to another page - THE user's exact scenario */
  await p.goto("http://127.0.0.1:8799/index.html", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !!document.querySelector("#tsbAp"), null, { timeout: 20000 });
  await sleep(3500);
  st = await dockState();
  console.log("3 after nav (paused before):", JSON.stringify(st), "<- playing MUST stay 0");
  const fail3 = st.playing === "1";

  /* 4. reload - still must not shout */
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !!document.querySelector("#tsbAp"), null, { timeout: 20000 });
  await sleep(3500);
  st = await dockState();
  console.log("4 after reload (paused before):", JSON.stringify(st), "<- playing MUST stay 0");
  const fail4 = st.playing === "1";

  /* 5. user taps play on the dock - resumes from the saved spot on demand */
  await p.evaluate(() => document.querySelector("#tsbAp .ap-play").click());
  await sleep(1500);
  st = await dockState();
  console.log("5 manual play after park:", JSON.stringify(st), "<- must be playing=1");

  /* 6. NOW the other promise: playing when you switch -> it continues */
  await p.goto("http://127.0.0.1:8799/notes.html", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !!document.querySelector("#tsbAp"), null, { timeout: 20000 });
  await sleep(3000);
  st = await dockState();
  console.log("6 after nav (playing before):", JSON.stringify(st), "<- must STAY playing=1");
  const fail6 = st.playing !== "1";

  console.log(fail3 || fail4 ? "FAIL: paused session auto-played" : (fail6 ? "FAIL: playing session did not continue" : "PASS: the pause promise holds"));
  await b.close();
  process.exit(fail3 || fail4 || fail6 ? 1 : 0);
})();
