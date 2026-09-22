/* ============================================================
   THESMALLBOOK — 💸 UPI PAYMENT ENGINE (upi.js)
   One payment helper for the whole app: tip jar, TSB Gold,
   Fuel the Library.
   - Native UPI deep link first (opens GPay/PhonePe/Paytm)
   - If the app doesn't open (desktop / no UPI handler), a
     neo-brutalist fallback sheet appears: COPY UPI ID + tap-to-
     open app buttons. Payment never dead-ends.
   ============================================================ */
(function () {
  var UPI_ID = "9702510680@fam";
  var PAYEE = "TheSmallBook";

  function build(amount, note) {
    var q = "upi://pay?pa=" + encodeURIComponent(UPI_ID) +
      "&pn=" + encodeURIComponent(PAYEE) +
      "&cu=INR" +
      (amount ? "&am=" + encodeURIComponent(String(amount)) : "") +
      (note ? "&tn=" + encodeURIComponent(note) : "");
    return q;
  }

  function appUrl(app, amount, note) {
    var upi = build(amount, note);
    var param = upi.slice("upi://pay?".length);
    var map = {
      gpay: "gpay://upi/pay?",
      phonepe: "phonepe://pay?",
      paytm: "paytmmp://pay?",
      upi: "upi://pay?"
    };
    return (map[app] || map.upi) + param;
  }

  function copyId() {
    var done = function () { toast("📋 UPI ID copied — open any UPI app and pay"); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(UPI_ID).then(done).catch(done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = UPI_ID;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
      return true;
    } catch (e) { return false; }
  }

  function toast(msg) {
    try {
      var t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;" +
        "background:#111;color:#fff;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:13px;" +
        "padding:12px 18px;border:3px solid #fff;box-shadow:5px 5px 0 #ffc800;max-width:88vw;text-align:center";
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2600);
    } catch (e) {}
  }

  function showModal(amount, note) {
    if (document.getElementById("tsb-upi-modal")) return;
    var ov = document.createElement("div");
    ov.id = "tsb-upi-modal";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(17,17,17,.65);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.innerHTML =
      '<div style="background:#fffdf5;border:4px solid #111;box-shadow:10px 10px 0 #ffc800;max-width:380px;width:100%;padding:22px;position:relative">' +
      '<button id="tsbUpiClose" style="position:absolute;top:10px;right:10px;border:2.5px solid #111;background:#fff;font-family:Archivo Black,sans-serif;font-size:11px;padding:4px 9px;cursor:pointer;box-shadow:2px 2px 0 #111">✕</button>' +
      '<div style="font-size:30px">💸</div>' +
      '<h3 style="font-family:Archivo Black,sans-serif;font-size:18px;margin:6px 0 2px;letter-spacing:.5px">PAY ' + (amount ? "₹" + amount : "") + ' VIA UPI</h3>' +
      '<p style="font-size:12.5px;color:#666;font-weight:600;margin:0 0 12px">' + (note || "Support TheSmallBook") + '</p>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:3px solid #111;padding:10px 12px;background:#fff;box-shadow:3px 3px 0 #111;font-family:Space Grotesk,sans-serif;font-weight:700;font-size:15px;margin-bottom:10px">' +
      '<span>' + UPI_ID + '</span>' +
      '<button id="tsbUpiCopy" style="border:2.5px solid #111;background:#ffc800;font-family:Archivo Black,sans-serif;font-size:11px;padding:6px 10px;cursor:pointer;box-shadow:2px 2px 0 #111">COPY</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">' +
      '<button data-app="gpay" style="border:3px solid #111;background:#fff;font-family:Archivo Black,sans-serif;font-size:11px;padding:10px 4px;cursor:pointer;box-shadow:3px 3px 0 #111">📱 GPay</button>' +
      '<button data-app="phonepe" style="border:3px solid #111;background:#fff;font-family:Archivo Black,sans-serif;font-size:11px;padding:10px 4px;cursor:pointer;box-shadow:3px 3px 0 #111">📱 PhonePe</button>' +
      '<button data-app="paytm" style="border:3px solid #111;background:#fff;font-family:Archivo Black,sans-serif;font-size:11px;padding:10px 4px;cursor:pointer;box-shadow:3px 3px 0 #111">📱 Paytm</button>' +
      '</div>' +
      '<p style="font-size:11px;color:#888;font-weight:600;margin:0;text-align:center">Tap an app to open payment — or copy the ID above</p>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.getElementById("tsbUpiClose").addEventListener("click", function () { ov.remove(); });
    document.getElementById("tsbUpiCopy").addEventListener("click", function () { copyId(); });
    ov.querySelectorAll("[data-app]").forEach(function (b) {
      b.addEventListener("click", function () { location.href = appUrl(b.dataset.app, amount, note); });
    });
  }

  /* main entry — MOBILE-FIRST:
     1) phone → fire the native UPI deep link straight to the UPI app
        (GPay/PhonePe/Paytm open on their own). The sheet appears ONLY
        if the app genuinely did not open (page still visible + focused).
     2) desktop → no UPI handler exists, so show the sheet right away. */
  function pay(amount, note) {
    var isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent || "");
    if (!isMobile) {
      showModal(amount, note);
      return;
    }
    var opened = false;
    function markOpened() { opened = true; }
    window.addEventListener("pagehide", markOpened);
    window.addEventListener("blur", markOpened);
    document.addEventListener("visibilitychange", function () { if (document.hidden) markOpened(); });
    try { location.href = build(amount, note); }
    catch (e) { showModal(amount, note); return; }
    setTimeout(function () {
      if (!opened && !document.hidden) showModal(amount, note);
    }, 1800);
  }

  window.TSB_UPI = {
    pay: pay,
    copyId: copyId,
    build: build,
    appUrl: appUrl,
    UPI_ID: UPI_ID
  };
})();
