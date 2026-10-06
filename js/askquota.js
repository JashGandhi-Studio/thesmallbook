/* ============================================================
   THESMALLBOOK, ⏳ ASK FREE QUOTA (askquota.js) · v300
   Free readers get a fixed number of Ask questions per rolling
   24-hour window; Gold asks without limits.
   • Dormant until the wall is on (TSB_CONFIG.PAYWALL.ENABLED),
     exactly like every other gated surface. Wall off = unlimited.
   • Window: 24h rolling from the FIRST question of the window.
   • Counted: real answers only (send / modeGo funnels in ask.js).
     Menus, chips browsing and the question library cost nothing.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_ASK_QUOTA) return;

  var KEY = "tsb_ask_quota";
  var WINDOW_MS = 24 * 60 * 60 * 1000;

  function cfg() {
    return (window.TSB_CONFIG && window.TSB_CONFIG.PAYWALL) || {};
  }
  function perDay() {
    var n = parseInt(cfg().FREE_ASK_PER_DAY, 10);
    return isNaN(n) || n < 1 ? 5 : n;
  }
  function wallOn() {
    return !!(window.TSB_PAYWALL && window.TSB_PAYWALL.enabled());
  }
  function isGold() {
    return !!(window.TSB_PAYWALL && window.TSB_PAYWALL.isGold());
  }
  /* Quota applies only when the wall is on and the reader is not Gold */
  function active() {
    return wallOn() && !isGold();
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function save(st) {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
  }
  /* A stale window (older than 24h) resets on read */
  function state() {
    var st = load();
    var now = Date.now();
    if (!st || !st.t0 || now - st.t0 >= WINDOW_MS) return { t0: now, used: 0 };
    return st;
  }
  function used() {
    var st = state();
    return st.used || 0;
  }
  function remaining() {
    return Math.max(0, perDay() - used());
  }
  function blocked() {
    return active() && remaining() <= 0;
  }
  /* One question answered = one unit. Called by ask.js AFTER the guard passes. */
  function consume() {
    if (!active()) return { ok: true, unlimited: true };
    var st = state();
    if (!st.t0) st.t0 = Date.now();
    st.used = (st.used || 0) + 1;
    save(st);
    return { ok: true, remaining: Math.max(0, perDay() - st.used) };
  }
  function resetAt() {
    var st = load();
    return st && st.t0 ? st.t0 + WINDOW_MS : 0;
  }
  function msLeft() {
    var r = resetAt();
    return r ? Math.max(0, r - Date.now()) : 0;
  }
  function hoursLeft() {
    return Math.ceil(msLeft() / (60 * 60 * 1000));
  }
  function resetClock() {
    var ms = msLeft();
    if (!ms) return "";
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? h + "h " + m + "m" : m + "m";
  }
  /* Meter line for the panel header: "3 of 5 free today" */
  function meterText() {
    if (!active()) return "";
    var left = remaining();
    return left > 0
      ? left + " of " + perDay() + " free today"
      : "free window used";
  }

  window.TSB_ASK_QUOTA = {
    active: active,
    blocked: blocked,
    consume: consume,
    remaining: remaining,
    perDay: perDay,
    msLeft: msLeft,
    hoursLeft: hoursLeft,
    resetClock: resetClock,
    meterText: meterText
  };
})();
