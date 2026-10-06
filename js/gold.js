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

  var known = false, cached = false, inflight = null;

  function conf() {
    var C = window.TSB_CONFIG || {};
    return { url: C.SUPABASE_URL, anon: C.SUPABASE_ANON_KEY, ok: !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY) };
  }

  async function fresh() {
    var c = conf();
    var u = window.TSB_AUTH && TSB_AUTH.user ? TSB_AUTH.user() : null;
    if (!c.ok || !u) { cached = false; known = true; return cached; }
    var tk = window.TSB_AUTH.token ? await TSB_AUTH.token() : null;
    if (!tk) { cached = false; known = true; return cached; }
    try {
      var res = await fetch(c.url + "/rest/v1/gold_members?user_id=eq." + encodeURIComponent(u.id) + "&select=expires_at", {
        headers: { apikey: c.anon, Authorization: "Bearer " + tk }
      });
      var rows = res.ok ? await res.json() : [];
      var exp = rows && rows[0] && rows[0].expires_at ? new Date(rows[0].expires_at) : null;
      var was = cached;
      cached = !!exp && exp.getTime() > Date.now();
      known = true;
      if (was !== cached) { try { window.dispatchEvent(new Event("tsbgold")); } catch (e) {} }
    } catch (e) { cached = false; known = true; }
    return cached;
  }

  function isGold(freshCheck) {
    if (freshCheck || !known) {
      if (!inflight) inflight = fresh().finally(function () { inflight = null; });
    }
    return cached;   /* current best answer; the fetch updates it and fires tsbgold */
  }

  /* ask once on load so Gold members flip to unlocked the moment it is known */
  try { isGold(); } catch (e) {}

  window.TSB_GOLD = { isGold: isGold };
})();
