/* ============================================================
   v356 · ONE PICTURE EVERYWHERE
   A reader's photo used to appear on their public profile and nowhere
   else: the You page and the corner badge kept the initial letter. This
   module keeps one cached photo for the device and paints it into every
   place that asks for it, whichever screen set it.
   ============================================================ */
(function () {
  if (window.TSB_AVA) return;
  window.TSB_AVA = true;

  var KEY = "tsb_avatar_url";
  var EVT = "tsb-avatar";
  var mem = "";

  function read() {
    if (mem) return mem;
    try { mem = localStorage.getItem(KEY) || ""; } catch (e) { mem = ""; }
    return mem;
  }
  function write(u) {
    mem = u || "";
    try { if (mem) localStorage.setItem(KEY, mem); else localStorage.removeItem(KEY); } catch (e) {}
    paint();
    try { window.dispatchEvent(new CustomEvent(EVT, { detail: mem })); } catch (e) {}
  }

  function name() {
    try {
      if (window.TSB && TSB.auth && TSB.auth.name) return TSB.auth.name() || "Reader";
      var s = JSON.parse(localStorage.getItem("tsb_auth_session"));
      return (s && s.user && (s.user.user_metadata || {}).full_name) || "Reader";
    } catch (e) { return "Reader"; }
  }

  function markup(label) {
    var u = read();
    var initial = String(label || name() || "R").trim().charAt(0).toUpperCase() || "R";
    if (u) return '<img class="tsb-ava-img" src="' + u.replace(/"/g, "&quot;") + '" alt="">';
    return "<span>" + initial + "</span>";
  }

  function paint(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll("[data-tsb-av]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var label = el.getAttribute("data-name") || "";
      el.innerHTML = markup(label);
    }
  }

  /* the picture may live in the cloud account even when this device never
     uploaded one: read it once, quietly, and paint it when it arrives */
  var pulled = false;
  function sync() {
    if (pulled) return;
    var CFG = window.TSB_CONFIG || window.CFG || {};
    var URL = (CFG.SUPABASE_URL || "").replace(/\/$/, "");
    var ANON = CFG.SUPABASE_ANON_KEY || "";
    var session = null;
    try { session = JSON.parse(localStorage.getItem("tsb_auth_session")); } catch (e) {}
    var md = (session && session.user && session.user.user_metadata) || {};
    if (md.avatar_url && md.avatar_url !== read()) write(md.avatar_url);
    if (!URL || !ANON || !session || !session.access_token || !session.user) return;
    pulled = true;
    fetch(URL + "/rest/v1/profiles?id=eq." + encodeURIComponent(session.user.id) + "&select=avatar_url", {
      headers: { apikey: ANON, Authorization: "Bearer " + session.access_token }
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (rows) {
      var u = rows && rows[0] && rows[0].avatar_url;
      /* a photo removed in the cloud is removed here too */
      if (u !== read()) write(u || (md.avatar_url || ""));
    }).catch(function () {});
  }

  function boot() {
    paint();
    sync();
    setTimeout(function () { paint(); sync(); }, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("focus", function () { sync(); paint(); });

  window.TSB_AVA = {
    url: read,
    remember: write,
    markup: markup,
    paint: paint,
    sync: function () { pulled = false; sync(); }
  };
})();
