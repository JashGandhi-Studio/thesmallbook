/* ============================================================
   THESMALLBOOK, VISIT COUNTING (visit.js) · v420
   First-party counting, on our own server, for the founder's
   Analytics view in Settings. It answers three questions only:
   how many people arrived, which pages they opened, and whether
   they came from a search engine, a shared link, or directly.

   How, exactly:
   · one random visitor number (tsb_vid) lives in this browser's
     local storage. It is not a fingerprint, it is not shared
     with anyone, and it never leaves our own database.
   · one "visit" per browser session, one "page_view" per page,
     sent to public.events (RUN-THIS-v419/v420.sql). Signed-in
     readers are counted against their account, so the founder
     can see real readers - name and email - apart from traffic.
   · the referrer is read once and kept as a class ("Google
     search", "Social", a hostname) - never a search term;
     search engines do not share those with anyone.
   No cross-site tracking, no third party, no advertising
   profile. If the table is not there yet, or the reader is
   offline, this fails silently and the page never notices.
   ============================================================ */
(function () {
  "use strict";
  try { if (window.__TSB_VISIT) return; window.__TSB_VISIT = 1; } catch (e) { return; }
  try {
    var CFG = window.TSB_CONFIG || window.CFG || {};
    var URL_BASE = (CFG.SUPABASE_URL || "https://wdmxcewmyofihgrheuas.supabase.co").replace(/\/$/, "");
    var ANON = CFG.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbXhjZXdteW9maWhncmhldWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTc3NjQsImV4cCI6MjEwMTc3Mzc2NH0.ZiaeA9eA7uxVeP0qhuoFdoY4CGP0eKI7VD87xsE3tw8";

    function rid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    }
    var vid = "anon";
    try {
      vid = localStorage.getItem("tsb_vid") || "";
      if (!vid) { vid = rid(); localStorage.setItem("tsb_vid", vid); }
    } catch (e) {}
    var sid = rid();
    try {
      sid = sessionStorage.getItem("tsb_sid") || "";
      if (!sid) { sid = rid(); sessionStorage.setItem("tsb_sid", sid); }
    } catch (e) {}

    /* where did this visit begin? class only, never a query string */
    function landingSource() {
      try {
        var q = new URLSearchParams(location.search);
        var utm = (q.get("utm_source") || "").replace(/[^\w.\- ]/g, "").slice(0, 40);
        if (utm) return utm;
        var r = document.referrer || "";
        if (!r) return "Direct / link";
        var h = new URL(r).hostname;
        if (!h || h === location.hostname) return "Direct / link";
        if (/google\./.test(h)) return "Google search";
        if (/bing\.|duckduckgo|yahoo|startpage|search\.brave/.test(h)) return "Other search";
        if (/facebook|instagram|twitter|x\.com|linkedin|whatsapp|telegram|youtube|reddit|pinterest/.test(h)) return "Social";
        return h.replace(/^www\./, "").slice(0, 60);
      } catch (e) { return "Direct / link"; }
    }
    var src = landingSource();
    try {
      var kept = sessionStorage.getItem("tsb_src");
      if (kept) src = kept; else sessionStorage.setItem("tsb_src", src);
    } catch (e) {}

    var uid = null, utok = "";
    try {
      var s = JSON.parse(localStorage.getItem("tsb_auth_session") || "null");
      if (s && s.user && s.user.id) { uid = s.user.id; utok = s.access_token || ""; }
    } catch (e) {}

    function send(name, props) {
      try {
        var body = JSON.stringify([{ user_id: uid, name: name, props: props }]);
        fetch(URL_BASE + "/rest/v1/events", {
          method: "POST",
          headers: {
            apikey: ANON,
            Authorization: "Bearer " + (utok || ANON),
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: body,
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }

    var firstOfSession = true;
    try {
      firstOfSession = !sessionStorage.getItem("tsb_visit_sent");
      if (firstOfSession) sessionStorage.setItem("tsb_visit_sent", "1");
    } catch (e) {}
    if (firstOfSession) send("visit", { v: vid, s: sid, src: src, path: location.pathname });
    send("page_view", { v: vid, s: sid, path: location.pathname });

    /* the founder's view and any debugging read the same truth */
    window.__TSB_VISIT_INFO = { vid: vid, sid: sid, src: src, signedIn: !!uid };
  } catch (e) {}
})();
