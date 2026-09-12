/* ============================================================
   THESMALLBOOK — 💛 TSB GOLD STATE (gold.js) · v225
   One tiny source of truth for "is this reader Gold?" used by
   the share-card watermark, Pro studio filters and gold.html.

   Phase-1 (works today, zero backend):
     • reader pays via UPI / WhatsApp (see upi.js, gold.html)
     • we send them an activation code  TSB-XXXX-XXXX
     • they type it in gold.html → Gold switches on this device
     • codes are CHECKSUMMED — random TSB-XXXX-XXXX guesses fail
   Phase-2 (docs/PAYWALL-PLAN.md): Razorpay webhook flips the
     Supabase profiles.plan column; this module then mirrors the
     server truth. Client-side codes are a bridge, not the vault.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_GOLD) return;

  var KEY = "tsb_gold";
  var YEAR_MS = 365 * 24 * 3600 * 1000;
  /* secret used only to checksum the code — visible client-side,
     but stops random guessing from working. Forge() below is the
     only way to mint a valid code without the webhook. */
  var CODE_SECRET = "tsb25gld";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function isGold() {
    var s = read();
    if (!s || !s.active) return false;
    if (s.until && Date.now() > s.until) return false;
    return true;
  }

  function state() {
    var s = read() || {};
    s.active = isGold();
    return s;
  }

  /* checksum: second group must equal derived value from first group */
  function checksum(a) {
    var h = 0;
    for (var i = 0; i < a.length; i++) h = (h * 31 + a.charCodeAt(i)) >>> 0;
    for (var j = 0; j < CODE_SECRET.length; j++) h = (h * 31 + CODE_SECRET.charCodeAt(j)) >>> 0;
    var b = h.toString(36).toUpperCase();
    while (b.length < 4) b = "0" + b;
    return b.slice(-4);
  }
  function validCode(code) {
    var m = /^TSB-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(code);
    if (!m) return false;
    return m[2] === checksum(m[1]);
  }
  /* only the founder's device should mint codes — but the math is
     here so you can issue codes from any device you control. */
  function forge() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var a = "";
    for (var i = 0; i < 4; i++) a += chars[Math.floor(Math.random() * chars.length)];
    return "TSB-" + a + "-" + checksum(a);
  }

  /* manual activation — codes we issue after verifying a UPI payment.
     Format: TSB-XXXX-XXXX (checksummed). */
  function activate(code) {
    code = (code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^TSB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return { ok: false, why: "That code doesn't look right — it's TSB-XXXX-XXXX, sent after your payment is verified." };
    }
    if (!validCode(code)) {
      return { ok: false, why: "That code isn't valid — double-check the WhatsApp message we sent (codes are case-insensitive). Need help? Message us on WhatsApp and we'll resend it." };
    }
    write({ active: true, plan: "gold-yearly", code: code, since: Date.now(), until: Date.now() + YEAR_MS });
    return { ok: true };
  }

  /* server-sync hook for Phase-2: auth.js can push the profile's plan here */
  function setFromServer(plan, untilIso) {
    if (plan === "gold") {
      write({ active: true, plan: "gold-yearly", via: "server", since: Date.now(), until: untilIso ? Date.parse(untilIso) : Date.now() + YEAR_MS });
    }
  }

  function deactivate() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  window.TSB_GOLD = { isGold: isGold, state: state, activate: activate, validCode: validCode, forge: forge, checksum: checksum, setFromServer: setFromServer, deactivate: deactivate };
})();
