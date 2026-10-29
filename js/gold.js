/* ============================================================
   THESMALLBOOK, 💛 TSB GOLD ENTITLEMENT (gold.js) · v298
   SERVER-SIDE NOW. There is no code to mint, no checksum, and
   no local flag to flip: Gold lives in the gold_members table
   on Supabase, and the browser can only ask, never answer.
   • isGold()   the ONLY public method. True only while the
                signed-in account has a gold_members row whose
                expires_at is in the future.
   • The answer is fetched once and cached in memory for the
     page load. isGold(true) forces a fresh check (gold.html
     polls with this after a payment).
   • The window event "tsbgold" fires when the answer changes,
     so pages can re-render without a reload.
   Editing localStorage, sessionStorage or cookies grants
   nothing. Codes are redeemed by the redeem-gold edge
   function; payments are confirmed by the razorpay-webhook
   edge function. Both write the table server-side.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_GOLD) return;

  var known = false, cached = false, pdf = false, plan = "", expires = null, inflight = null;

  function conf() {
    var C = window.TSB_CONFIG || {};
    return { url: C.SUPABASE_URL, anon: C.SUPABASE_ANON_KEY, ok: !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY) };
  }

  async function fresh() {
    var c = conf();
    var u = window.TSB_AUTH && TSB_AUTH.user ? TSB_AUTH.user() : null;
    /* v331: no email, list or storage shortcut exists any more. The founder
       is Gold because the founder has a gold_members row, like everyone. */
    var was = cached, wasPdf = pdf;
    if (!c.ok || !u) { cached = false; pdf = false; known = true; return cached; }
    var tk = window.TSB_AUTH.token ? await TSB_AUTH.token() : null;
    if (!tk) { cached = false; pdf = false; known = true; return cached; }
    try {
      var res = await fetch(c.url + "/rest/v1/gold_members?user_id=eq." + encodeURIComponent(u.id) + "&select=plan,expires_at", {
        headers: { apikey: c.anon, Authorization: "Bearer " + tk }
      });
      var rows = res.ok ? await res.json() : [];
      var row = rows && rows[0];
      var exp = row && row.expires_at ? new Date(row.expires_at) : null;
      var live = !!exp && exp.getTime() > Date.now();
      plan = live ? String(row.plan || "gold") : "";
      expires = live ? exp : null;
      /* a PDF pass unlocks PDF cheat-sheets only, never the rest of Gold */
      pdf = live;
      cached = live && plan !== "pdf-75d";
      known = true;
    } catch (e) { cached = false; pdf = false; known = true; }
    if (was !== cached || wasPdf !== pdf) { try { window.dispatchEvent(new Event("tsbgold")); } catch (e) {} }
    return cached;
  }

  function kick(force) {
    if ((force || !known) && !inflight) inflight = fresh().finally(function () { inflight = null; });
    return inflight;
  }
  function isGold(freshCheck) {
    kick(freshCheck);
    return cached;   /* current best answer; the fetch updates it and fires tsbgold */
  }
  function hasPdf() { kick(false); return pdf; }
  /* awaitable answer, used by checkout while it waits for the bank */
  async function check() {
    await (kick(true) || Promise.resolve());
    return { gold: cached, pdf: pdf, plan: plan, expires: expires };
  }

  /* ask once on load, and again whenever the account changes */
  try { isGold(); } catch (e) {}
  try { window.addEventListener("tsb:auth", function () { kick(true); }); } catch (e) {}

  window.TSB_GOLD = { isGold: isGold, hasPdf: hasPdf, check: check, info: function () { return { gold: cached, pdf: pdf, plan: plan, expires: expires }; } };
})();
