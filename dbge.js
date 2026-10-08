const { chromium } = require("playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on("console", m => { const t = m.text(); if (/feed|error|fail/i.test(t)) console.log("CON:", t.slice(0, 160)); });
  p.on("pageerror", e => console.log("ERR:", String(e).slice(0, 160)));
  await p.goto("http://127.0.0.1:8799/podcasts.html", { waitUntil: "domcontentloaded" });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("tsb_onboarded", "true"); localStorage.setItem("tsb_supportbar_seen", "true"); localStorage.setItem("tsb_tour_done", "true"); localStorage.setItem("tsb_walk_done", "true"); });
  await p.reload({ waitUntil: "domcontentloaded" });
  await sleep(1500);
  const probe = await p.evaluate(() => new Promise(res => {
    const s = window.TSB_SHOWS_EXTRA[0];
    TSB_AUDIO.playFeed({ id: s.id, name: s.name, rss: s.rss, host: s.host, art: s.art || "" });
    let n = 0;
    const iv = setInterval(() => {
      n++;
      const t = (document.querySelector("#tsbAp .ap-t") || {}).textContent || "";
      if (t.length > 2 || n > 20) { clearInterval(iv); res({ t: t, last: JSON.parse(localStorage.getItem("tsb_audio_last") || "{}").key }); }
    }, 500);
  }));
  console.log(JSON.stringify(probe));
  console.log("rss:", await p.evaluate(() => window.TSB_SHOWS_EXTRA[0].rss));
  await b.close();
})();
