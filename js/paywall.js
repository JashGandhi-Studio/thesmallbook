/* ============================================================
   THESMALLBOOK, 💛 PAYWALL GATE (paywall.js) · v248
   Thin, config-driven gate built ON TOP of the existing TSB_GOLD.
   • Reads the single switch from TSB_CONFIG.PAYWALL
   • Gold members (activated on gold.html) are NEVER locked
   • Feature keys listed in PAYWALL.GATED are locked when ENABLED
   The WHAT behind the wall is decided later, just list keys in
   config.js and call TSB_PAYWALL.gate(feature, onLocked) where needed.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_PAYWALL) return;

  function cfg() {
    return (window.TSB_CONFIG && window.TSB_CONFIG.PAYWALL) || { ENABLED: false, GATED: [] };
  }
  /* 👑 FOUNDER: the founder's own accounts see every Gold feature, on every
     device they sign into, and can flip a session preview to experience the
     app exactly like a free reader (preview lasts until the tab closes). */
  var FOUNDER_EMAILS = ["jashgandhicreator07@gmail.com", "acimotreyothy@gmail.com"];
  function founderPreview() {
    try { return sessionStorage.getItem("tsb_founder_preview") === "free"; } catch (e) { return false; }
  }
  function isFounder() {
    try {
      var u = (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) || null;
      var em = ((u && u.email) || "").toLowerCase();
      return !!em && FOUNDER_EMAILS.indexOf(em) >= 0;
    } catch (e) { return false; }
  }
  function isGold() {
    if (isFounder() && !founderPreview()) return true;
    try { return !!(window.TSB_GOLD && TSB_GOLD.isGold()); } catch (e) { return false; }
  }
  function enabled() { return !!cfg().ENABLED; }

  /* A feature is locked only if: wall is on + reader is not Gold + key is listed */
  function locked(feature) {
    if (!enabled()) return false;
    if (isGold()) return false;
    if (isFounder() && !founderPreview()) return false;
    var g = cfg().GATED || [];
    return g.indexOf(feature) >= 0;
  }

  /* Checkout URL: Razorpay link if provided, else a UPI deep link with price pre-filled */
  function checkoutUrl() {
    var c = cfg();
    if (c.RAZORPAY_LINK) return c.RAZORPAY_LINK;
    var pa = encodeURIComponent(c.UPI_ID || "");
    var am = c.PRICE_INR || 999;
    return "upi://pay?pa=" + pa + "&pn=TheSmallBook&am=" + am + "&cu=INR";
  }

  /* Convenience: if the feature is locked, run onLocked() and return true */
  function gate(feature, onLocked) {
    if (locked(feature)) { if (onLocked) onLocked(); return true; }
    return false;
  }

  window.TSB_PAYWALL = {
    isFounder: isFounder,
    founderPreview: founderPreview,
    setFounderPreview: function (on) { try { if (on) sessionStorage.setItem("tsb_founder_preview", "free"); else sessionStorage.removeItem("tsb_founder_preview"); } catch (e) {} },
    cfg: cfg,
    enabled: enabled,
    isGold: isGold,
    locked: locked,
    checkoutUrl: checkoutUrl,
    gate: gate
  };
})();
