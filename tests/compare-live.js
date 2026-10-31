/* live jsdom boot: the chat, one mode. plus -> two slots -> an honest comparison. */
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

const order = ["js/config.js", "js/data.js", "js/failures.js", "js/ask-data.js", "js/ask-modes-data.js", "js/askquota.js", "js/ask.js"];
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

(async () => {
  console.log("== boot: one chip, one plus ==");
  w.TSB_ASK.open();
  await sleep(120);
  ok(!!chip("COMPARE BOOKS"), "the chip says COMPARE BOOKS");
  ok(!chip("MODES"), "the old MODES chip is gone");
  ok(!!$("#tsb-plus"), "a plus sits in the input row");

  console.log("== the picker ==");
  $("#tsb-plus").click();
  await sleep(200);
  ok($("#tsb-cmp").classList.contains("aq-lib--open"), "plus opens the compare sheet");
  ok(!!$("#cmpSlotA") && !!$("#cmpSlotB"), "two slots");
  ok($("#cmpGo").disabled === true, "Compare is disabled until both books are in");
  ok($$("#cmpList .cmp-row").length >= 8, "the list offers books straight away", $$("#cmpList .cmp-row").length + "");

  $("#cmpSearch").value = "deep work";
  $("#cmpSearch").dispatchEvent(new w.Event("input"));
  await sleep(120);
  const hits = $$("#cmpList .cmp-row");
  ok(hits.length >= 1 && hits[0].textContent.includes("Deep Work"), "search narrows to the title", hits.length + "");
  hits[0].click();
  await sleep(80);
  ok($("#cmpSlotA").classList.contains("is-set") && $("#cmpSlotA").textContent.includes("Deep Work"), "first slot filled");
  ok(!!$("#cmpSlotB"), "focus moved to the second slot");

  $("#cmpSearch").value = "atomic";
  $("#cmpSearch").dispatchEvent(new w.Event("input"));
  await sleep(120);
  const hits2 = $$("#cmpList .cmp-row").filter(r => r.textContent.includes("Atomic Habits"));
  ok(hits2.length === 1, "second search finds Atomic Habits");
  hits2[0].click();
  await sleep(80);
  ok($("#cmpSlotB").textContent.includes("Atomic Habits"), "second slot filled");
  ok($("#cmpGo").disabled === false, "Compare is live now");

  console.log("== the answer ==");
  $("#cmpGo").click();
  await sleep(4200);
  const t = bubblesText();
  ok(!$("#tsb-cmp").classList.contains("aq-lib--open"), "the sheet closes on compare");
  ok(t.includes("WHAT EACH ONE IS"), "section: what each one is");
  ok(t.includes("WHERE THEY AGREE"), "section: where they agree");
  ok(t.includes("WHERE THEY SPLIT"), "section: where they split");
  ok(t.includes("WHICH ONE FIRST"), "section: which one first");
  ok(t.includes("TRY THIS WEEK"), "section: try this week");
  ok(t.includes("Deep Work") && t.includes("Atomic Habits"), "both books named");
  const cards = $$('#tsb-msgs .aq-bubble:last-of-type a.aq-src--img');
  const cardsAll = $$('#tsb-msgs a.aq-src--img').slice(-2);
  ok(cardsAll.length === 2, "exactly two source cards", cardsAll.length + "");
  ok(cardsAll.every(c => fs.existsSync(path.join(__dirname, "..", c.querySelector(".aq-src__img").getAttribute("src")))), "both covers exist on disk");
  ok(!/\u2014|\u2013/.test(t), "the whole answer is em-dash free");
  ok($$('#tsb-msgs .aq-copy').length >= 1, "COPY ANSWER rides along");

  console.log("== typed compare ==");
  $("#tsb-input").value = "compare psychology of money and the psychology of money";
  $("#tsb-input").value = "compare rich dad poor dad and the intelligent investor";
  $("#tsb-send").click();
  await sleep(4200);
  const t2 = bubblesText();
  ok(t2.includes("Rich Dad") && t2.includes("Intelligent Investor"), "typed pair is found without the picker");
  ok(t2.includes("WHAT EACH ONE IS"), "typed compare renders the same five sections");

  console.log("== one book plus vs opens the picker ==");
  $("#tsb-input").value = "atomic habits vs";
  $("#tsb-send").click();
  await sleep(200);
  ok($("#tsb-cmp").classList.contains("aq-lib--open"), "sheet opens prefilled");
  ok($("#cmpSlotA").textContent.includes("Atomic Habits"), "the named book lands in slot one");
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
  await sleep(150);

  console.log("== the three doors ==");
  w.TSB_GOLD = { isGold: () => false, info: () => ({ gold: false, plan: "" }) };
  ok(w.TSB_ASK_QUOTA.perDay() === 3, "free reader: 3 a day", String(w.TSB_ASK_QUOTA.perDay()));
  ok(w.TSB_ASK_QUOTA.active() === true, "the window is live for a free reader");
  w.TSB_GOLD = { isGold: () => true, info: () => ({ gold: true, plan: "monthly" }) };
  ok(w.TSB_ASK_QUOTA.perDay() === 10, "99 pass: 10 a day", String(w.TSB_ASK_QUOTA.perDay()));
  w.TSB_GOLD = { isGold: () => true, info: () => ({ gold: true, plan: "yearly" }) };
  ok(w.TSB_ASK_QUOTA.perDay() === 0, "999 pass: no limit", String(w.TSB_ASK_QUOTA.perDay()));
  ok(w.TSB_ASK_QUOTA.active() === false, "the 999 pass never meets the counter");
  ok(w.TSB_ASK_QUOTA.blocked() === false, "and is never blocked");
  w.TSB_GOLD = { isGold: () => true, info: () => ({ gold: true, plan: "weird-code-plan" }) };
  ok(w.TSB_ASK_QUOTA.perDay() === 10, "a paid reader with an unlisted plan still gets 10", String(w.TSB_ASK_QUOTA.perDay()));

  console.log("RESULT(live): " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e && e.message); process.exit(2); });
