/* ============================================================
   THESMALLBOOK — 💛 TSB GOLD STATE (gold.js) · v248 (hardened)
   One source of truth for "is this reader Gold?" used by the share-card
   watermark, Pro studio filters, store gating and gold.html.

   Phase-1 (works today, zero backend):
     • reader pays via UPI / WhatsApp (see upi.js, gold.html)
     • we send them an activation code  TSB-XXXX-XXXX
     • they type it in gold.html → Gold switches on this device
     • codes are CHECKSUMMED — random TSB-XXXX-XXXX guesses fail

   v248 HARDENING — tamper resistance:
     • the saved state carries a signature over (code|until|plan)
     • isGold() re-checks the signature on EVERY read
     • editing localStorage (set active:true, push `until` to 2099,
       flip plan) breaks the signature → state is dropped, not faked
     • this blocks the obvious "open DevTools → edit localStorage"
       hack. (True security still needs the server — Phase 2 webhook;
       client-side can never be 100% unbreakable, and we don't pretend
       it is. The signature just makes casual cheating fail loudly.)
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_GOLD) return;

  var KEY = "tsb_gold";
  var YEAR_MS = 365 * 24 * 3600 * 1000;
  /* secret used only to checksum/sign — visible client-side, but stops
     random guessing AND stops hand-editing the saved object. */
  var CODE_SECRET = "tsb25gld";

  function readRaw() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function writeRaw(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function checksum(a) {
    var h = 0;
    for (var i = 0; i < a.length; i++) h = (h * 31 + a.charCodeAt(i)) >>> 0;
    for (var j = 0; j < CODE_SECRET.length; j++) h = (h * 31 + CODE_SECRET.charCodeAt(j)) >>> 0;
    var b = h.toString(36).toUpperCase();
    while (b.length < 4) b = "0" + b;
    return b.slice(-4);
  }
  /* signature binds code+until+plan so changing ANY field invalidates it */
  function sign(code, until, plan) { return checksum((code || "") + "|" + (until || "") + "|" + (plan || "")); }

  function validCode(code) {
    var m = /^TSB-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(code || "");
    if (!m) return false;
    return m[2] === checksum(m[1]);
  }
  /* only the founder's device should mint codes — but the math is here so
     you can issue codes from any device you control. */
  function forge() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var a = "";
    for (var i = 0; i < 4; i++) a += chars[Math.floor(Math.random() * chars.length)];
    return "TSB-" + a + "-" + checksum(a);
  }

  /* read + verify signature. Returns null if missing or tampered. */
  function readState() {
    var s = readRaw();
    if (!s) return null;
    if (!s.active) return s;
    var expect = sign(s.code, s.until, s.plan);
    if (s.sig === expect) return s;                                 /* current valid state */
    /* Legacy activation minted before v248 had NO signature. Migrate it
       (re-sign) so old users aren't logged out — but ONLY when the
       signature is genuinely absent, never when it's merely wrong. */
    if (s.sig === undefined && s.code && validCode(s.code)) { s.sig = expect; writeRaw(s); return s; }
    /* Any present-but-wrong signature (e.g. someone edited `until` in
       DevTools, or faked `active`) is treated as tampered and dropped. */
    clear();
    return null;
  }

  function isGold() {
    var s = readState();
    if (!s || !s.active) return false;
    if (s.until && Date.now() > s.until) return false;
    return true;
  }

  function state() {
    var s = readState() || {};
    s.active = isGold();
    return s;
  }

  /* manual activation — codes we issue after verifying a UPI payment.
     Format: TSB-XXXX-XXXX (checksummed). Robust: validates, saves,
     reads back to confirm, and reports a clear error if storage is blocked. */
  function activate(code) {
    code = (code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^TSB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return { ok: false, why: "That code doesn't look right — it's TSB-XXXX-XXXX, sent after your payment is verified." };
    }
    if (!validCode(code)) {
      return { ok: false, why: "That code isn't valid — double-check the WhatsApp message we sent (codes are case-insensitive). Need help? Message us on WhatsApp and we'll resend it." };
    }
    var until = Date.now() + YEAR_MS;
    var s = { active: true, plan: "gold-yearly", code: code, since: Date.now(), until: until, sig: sign(code, until, "gold-yearly") };
    if (!writeRaw(s)) {
      return { ok: false, why: "Saved, but this device blocked site storage — enable cookies/site data for thesmallbook.in and try again." };
    }
    var chk = readState();
    if (!chk || !chk.active) {
      return { ok: false, why: "Saved, but couldn't confirm — reopen gold.html; if it still shows locked, message us with your payment screenshot." };
    }
    return { ok: true };
  }

  /* server-sync hook for Phase-2: auth.js pushes the profile's plan here */
  function setFromServer(plan, untilIso) {
    if (plan === "gold") {
      var until = untilIso ? Date.parse(untilIso) : Date.now() + YEAR_MS;
      var code = "SRV-" + checksum(String(until));
      writeRaw({ active: true, plan: "gold-yearly", via: "server", code: code, since: Date.now(), until: until, sig: sign(code, until, "gold-yearly") });
    }
  }

  function deactivate() { clear(); }

  window.TSB_GOLD = {
    isGold: isGold, state: state, activate: activate, validCode: validCode,
    forge: forge, checksum: checksum, sign: sign,
    setFromServer: setFromServer, deactivate: deactivate
  };
})();
