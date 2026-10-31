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

  async function fresh(attempt) {
    attempt = attempt || 0;
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
      /* v346 · ONE BAD RESPONSE IS NOT A VERDICT.
         A dropped connection, a token refreshing mid-flight or a cold edge
         function used to lock a paying member out for the whole page load.
         Two more tries, then we admit we do not know rather than say "free". */
      if (!res.ok) {
        if (attempt < 2) { attempt++; await new Promise(function (r) { setTimeout(r, 400 * attempt); }); return fresh(); }
        known = false; return cached;
      }
      var rows = await res.json();
      var row = rows && rows[0];
      var exp = row && row.expires_at ? new Date(row.expires_at) : null;
      /* a row with no end date is a life membership, not an expired one */
      var live = !!row && (!exp || exp.getTime() > Date.now());
      plan = live ? String(row.plan || "gold") : "";
      expires = live ? exp : null;
      /* a PDF pass unlocks PDF cheat-sheets only, never the rest of Gold */
      pdf = live;
      cached = live && plan !== "pdf-75d";
      known = true;
    } catch (e) {
      /* a thrown fetch is a network problem, not an answer */
      if (attempt < 2) { attempt++; known = false; await new Promise(function (r) { setTimeout(r, 400 * attempt); }); return fresh(); }
      known = false; return cached;
    }
    /* v346: always tell the page what we learned, even when nothing changed,
       so a gate that painted while we were still checking can repaint */
    try { window.dispatchEvent(new Event("tsbgold")); } catch (e) {}
    if (was !== cached || wasPdf !== pdf) { try { window.dispatchEvent(new Event("tsb:gold-change")); } catch (e) {} }
    return cached;
  }

  var lastTry = 0, tries = 0;
  function kick(force) {
    var now = Date.now();
    /* a forced check always runs; an automatic one backs off to at most one
       try every 1.5 s, so a dead network cannot become a request loop */
    if ((force || !known) && !inflight && (force || now - lastTry > 1500)) {
      lastTry = now; tries++;
      inflight = fresh().finally(function () { inflight = null; });
    }
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

  /* v346 · THREE HONEST ANSWERS, NOT TWO: yes, no, and "still asking".
     Gates that paint on load can now tell a free reader from a member whose
     answer is a few hundred milliseconds away, instead of guessing "no". */
  var readyWaiters = [];
  function ready(ms) {
    if (known) return Promise.resolve(cached);
    return new Promise(function (resolve) {
      var done = false;
      var fin = function (v) { if (done) return; done = true; resolve(v); };
      readyWaiters.push(function () { fin(cached); });
      window.addEventListener("tsbgold", function () { if (known) fin(cached); });
      setTimeout(function () { fin(cached); }, ms || 2500);
    });
  }
  function notifyReady() { var w = readyWaiters; readyWaiters = []; w.forEach(function (f) { try { f(); } catch (e) {} }); }
  window.addEventListener("tsbgold", notifyReady);

  window.TSB_GOLD = { isGold: isGold, hasPdf: hasPdf, check: check, ready: ready,
    pending: function () { return !known; },
    known: function () { return known; },
    onReady: function (fn) { if (known) { try { fn(cached); } catch (e) {} } else ready(4000).then(function (v) { try { fn(v); } catch (e) {} }); },
    info: function () { return { gold: cached, pdf: pdf, plan: plan, expires: expires, known: known }; }
  };
})();
