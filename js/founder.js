/* TheSmallBook, founder identity: ONE source of truth (v415).
   Founder status is decided by the signed-in email address, the same
   identity that earns Gold on the server. There is no second list to
   keep in step and no device-local capture that only works on one
   phone: window.TSB.isFounder(user) answers for any user object, email
   string, or (for the community tick) a profile id belonging to the
   currently signed-in founder.
   The old empty TSB_FOUNDER_IDS array and the per-device localStorage
   capture are retired; community.js asks this module instead. */
(function () {
  "use strict";
  var EMAILS = ["acimotreyothy@gmail.com", "jashgandhicreator07@gmail.com"];

  function norm(e) { return String(e || "").trim().toLowerCase(); }
  function isFounderEmail(email) { return EMAILS.indexOf(norm(email)) >= 0; }
  function currentUser() {
    try { if (window.TSB_AUTH && TSB_AUTH.user) { var u = TSB_AUTH.user(); if (u) return u; } } catch (e) {}
    try { var s = JSON.parse(localStorage.getItem("tsb_auth_session") || "null"); return (s && s.user) || null; } catch (e) { return null; }
  }
  /* Accepts a user object ({email} / {id}), an email string, or a bare
     profile id. An id only counts when it belongs to the founder who is
     signed in on this device; other devices learn founder ids from the
     profile row's email when community renders it. */
  function isFounder(x) {
    if (!x) return false;
    if (typeof x === "string") {
      if (x.indexOf("@") > 0) return isFounderEmail(x);
      var me = currentUser();
      return !!(me && me.id === x && isFounderEmail(me.email));
    }
    return isFounderEmail(x.email);
  }
  function isFounderProfile(profile) {
    if (!profile) return false;
    if (profile.email && isFounderEmail(profile.email)) return true;
    return isFounder(profile.id || profile.user_id || "");
  }

  window.TSB = window.TSB || {};
  /* v418: ONE identity service. User, founder, Gold and admin are
     answered in one place: founder and admin by the email list
     above (admin is the founder wearing the other hat; there is
     no second admin list), Gold by the server entitlement in
     gold.js, never by a local flag. Callers stop each keeping
     their own answer. */
  function identityGold() {
    try { return !!(window.TSB_GOLD && TSB_GOLD.isGold()); } catch (e) { return false; }
  }
  window.TSB.identity = {
    user: currentUser,
    email: function () { var u = currentUser(); return u ? norm(u.email) : ""; },
    isFounder: isFounder,
    isGold: identityGold,
    isAdmin: isFounder
  };
  window.TSB.isFounder = isFounder;
  window.TSB.isFounderEmail = isFounderEmail;
  window.TSB.isFounderProfile = isFounderProfile;
  /* kept for any older caller; the email list above is the real one */
  window.TSB_FOUNDER_EMAILS = EMAILS.slice();
  window.TSB_FOUNDER_IDS = [];
})();
