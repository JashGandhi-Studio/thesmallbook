/* ============================================================
   THESMALLBOOK — ASK SHIM
   Ask is now a full page (chat.html). Non-chat pages only need the
   redirect entry point, so they load this instead of the 32 KB legacy
   widget. Keeps window.TSB_ASK.open(q) working for any existing caller.
   ============================================================ */
(function () {
  "use strict";
  var CHAT_URL = (function () {
    var d = (location.pathname.replace(/\/[^\/]*$/, "/").match(/\//g) || []).length - 1;
    return (d > 0 ? new Array(d + 1).join("../") : "") + "chat.html";
  })();
  window.TSB_ASK = {
    open: function (q) {
      location.href = CHAT_URL + (q ? "?q=" + encodeURIComponent(q) : "");
    },
    close: function () {}
  };
})();
