/* live jsdom boot: the chat tab, rebuilt. MODES chip -> grid sheet -> modes. */
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

const dom = new JSDOM(`<!doctype html><html lang="en"><body><div id="home"></div></body></html>`, {
  url: "https://thesmallbook.in/index.html", pretendToBeVisual: true,
});
const w = dom.window;
w.fetch = () => Promise.reject(new Error("offline test"));
w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
w.HTMLElement.prototype.scrollIntoView = function () {};
w.scrollTo = () => {};

const order = ["js/config.js", "js/data.js", "js/failures.js", "js/ask-data.js", "js/ask-modes-data.js", "js/ask.js"];
const vm = require("vm");
w.globalThis = w;
for (const f of order) vm.runInContext(R(f), vm.createContext(w), { filename: f });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, name, extra) => { if (c) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ FAIL: " + name + (extra ? " | " + extra : "")); } };
const $ = (s) => w.document.querySelector(s);
const $$ = (s) => Array.from(w.document.querySelectorAll(s));
const bubblesText = () => $$("#tsb-msgs .aq-bubble").map(b => b.textContent).join("\n");
const chip = (txt) => $$("#tsb-chips .aq-chip").find(b => b.textContent.includes(txt));
const openGrid = async () => { chip("MODES").click(); await sleep(250); };
const card = (key) => w.document.querySelector('[data-md="' + key + '"]');

(async () => {
  console.log("== boot: the chip bar is one line again ==");
  w.TSB_ASK.open();
  await sleep(80);
  ok(!!chip("MODES"), "MODES chip present in the chip bar");
  ok(!w.document.querySelector(".aq-modes") && !w.document.querySelector(".aq-modechip"), "no strip layout anywhere");
  ok($$("#tsb-chips .aq-chip").length >= 4, "context + quick chips still in the row", $$("#tsb-chips .aq-chip").length + "");
  ok(!$$("#tsb-chips .aq-modes").length, "chip bar has no nested block rows");

  console.log("== the modes sheet ==");
  await openGrid();
  ok($("#tsb-modes").classList.contains("aq-lib--open"), "MODES chip opens the sheet");
  ok($$("#tsb-mdgrid .aq-mdcard").length === 7, "grid shows exactly 7 format cards", $$("#tsb-mdgrid .aq-mdcard").length + "");
  ok($$("#tsb-mdgrid .aq-mdcard b").every(b => b.textContent.length > 3), "every card has a name");
  ok($$("#tsb-mdgrid .aq-mdcard span").every(b => b.textContent.length > 15), "every card describes itself");
  ok(!$("#tsb-modes").textContent.includes("\u2014"), "sheet copy is em-dash free");
  $("#tsb-modesclose").click();
  await sleep(100);
  ok(!$("#tsb-modes").classList.contains("aq-lib--open"), "✕ closes the sheet");

  console.log("== red flag friday, via grid ==");
  await openGrid(); card("redflag").click(); await sleep(2200);
  let t = bubblesText();
  ok(t.includes("RED FLAG FRIDAY"), "red flag bubble rendered");
  ok($$('#tsb-msgs a.aq-src--grave').length >= 1, "flag links a real autopsy");
  $$('#tsb-msgs [data-axopt]').find(b => b.textContent.includes("Peek")).click();
  await sleep(2200);
  const graves = $$('#tsb-msgs a.aq-src--grave').map(a => a.getAttribute("href"));
  ok(graves[graves.length - 1] !== graves[0], "peek next week shows a DIFFERENT flag");

  console.log("== compare books, via grid ==");
  await openGrid(); card("compare").click(); await sleep(400);
  t = bubblesText();
  ok(t.includes("Pick a topic") || t.includes("type your own topic"), "compare pick menu shows");
  $$('#tsb-msgs [data-axopt="compare:habits"]')[0].click();
  await sleep(2200);
  t = bubblesText();
  const cards = $$('#tsb-msgs a.aq-src--img');
  ok(t.includes("COMPARE IDEAS ACROSS BOOKS") && cards.length >= 4, "compare answer with 4+ book cards", cards.length + "");
  ok(cards.every(c => fs.existsSync(path.join(__dirname, "..", c.querySelector(".aq-src__img").getAttribute("src")))), "every cover exists on disk");
  ok(new Set(cards.map(c => c.getAttribute("href"))).size === cards.length, "no book repeated");

  console.log("== compare books, typed ==");
  await openGrid(); card("compare").click(); await sleep(400);
  $("#tsb-input").value = "negotiation";
  $("#tsb-send").click();
  await sleep(2400);
  t = bubblesText();
  ok(t.includes("COMPARE IDEAS ACROSS BOOKS") && $$('#tsb-msgs a.aq-src--img').length >= 4, "typed topic, books compared", $$('#tsb-msgs a.aq-src--img').length + "");

  console.log("== decision before the disaster ==");
  await openGrid(); card("decision").click(); await sleep(2200);
  t = bubblesText();
  ok(t.includes("THE DECISION BEFORE THE DISASTER") && t.includes("THE CALL:"), "decision cases rendered");
  const setA = $$('#tsb-msgs a.aq-src--grave').slice(-3).map(a => a.getAttribute("href")).join(",");
  $$('#tsb-msgs [data-axopt^="decision:"]').pop().click();
  await sleep(2200);
  const setB = $$('#tsb-msgs a.aq-src--grave').slice(-3).map(a => a.getAttribute("href")).join(",");
  ok(setA !== setB, "next 3 case files differ");
  const gfiles = $$('#tsb-msgs a.aq-src--grave').map(a => a.getAttribute("href").replace("graveyard/", "").replace(".html", ""));
  ok(gfiles.every(id => fs.existsSync(path.join(__dirname, "..", "graveyard", id + ".html"))), "every autopsy page exists");

  console.log("== read this before you ==");
  await openGrid(); card("before").click(); await sleep(400);
  $$('#tsb-msgs [data-axopt^="before:"]').find(b => b.textContent.includes("Raising money")).click();
  await sleep(2200);
  t = bubblesText();
  ok(t.includes("READ THIS BEFORE YOU") && t.includes("THE WARNING"), "scenario + warning autopsy");
  await openGrid(); card("before").click(); await sleep(400);
  $("#tsb-input").value = "buying a franchise";
  $("#tsb-send").click();
  await sleep(2400);
  ok(bubblesText().includes("before buying a franchise"), "typed scenario matched");

  console.log("== 7-day challenge ==");
  await openGrid(); card("seven").click(); await sleep(400);
  $$('#tsb-msgs [data-axopt^="seven:"]')[0].click();
  await sleep(2200);
  t = bubblesText();
  let days = 0; for (let i = 1; i <= 7; i++) if (t.includes("DAY " + i + ":")) days++;
  ok(t.includes("THE 7-DAY APPLICATION CHALLENGE") && days === 7, "7 days, one action each", days + "");
  await openGrid(); card("seven").click(); await sleep(400);
  $("#tsb-input").value = "deep work";
  $("#tsb-send").click();
  await sleep(2400);
  ok(bubblesText().includes("Deep Work"), "typed book matched");

  console.log("== myth vs lesson ==");
  await openGrid(); card("myth").click(); await sleep(2200);
  t = bubblesText();
  ok((t.match(/THE MYTH/g) || []).length >= 2 && t.includes("THE LESSON"), "two myth+lesson pairs");

  console.log("== founder field notes ==");
  await openGrid(); card("field").click(); await sleep(2200);
  t = bubblesText();
  ok(t.includes("FROM THE FOUNDERS") && t.includes("ON THE RECORD ·"), "founders record rendered");

  console.log("== contracts: copy, history, escape chain ==");
  ok($$('#tsb-msgs .aq-copy').length >= 7, "every answer carries COPY ANSWER", $$('#tsb-msgs .aq-copy').length + "");
  const hist = JSON.parse(w.localStorage.getItem("tsb_ask_hist") || "[]");
  ok(hist.length >= 14 && hist.some(h => h.html && h.html.includes("RED FLAG FRIDAY")), "answers saved to history");
  ok(!JSON.stringify(hist).includes("\u2014"), "history em-dash free");
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
  await sleep(100);
  ok(!$("#tsb-modes").classList.contains("aq-lib--open"), "Escape closes the sheet");

  console.log("RESULT(live): " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e && e.message); process.exit(2); });
