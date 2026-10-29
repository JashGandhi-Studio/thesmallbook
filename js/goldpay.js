/* ============================================================
   THESMALLBOOK · GOLD CHECKOUT (goldpay.js) · v331, v334 UPI claims
   One real path to Gold, nothing unlocks in the browser:
   1) the reader signs in (Gold lives on the account)
   2) gold-order (edge function) creates an order; the SERVER sets
      the price, the browser only names the plan
   3) the reader pays with UPI in YouPI-PG, the open-source gateway
      you host yourself (TSB_CONFIG.YOUPI.GATEWAY_URL)
   4) YouPI-PG matches the bank credit and calls youpi-webhook
      (signed, deduped, amount checked), which writes gold_members
   5) this page only WAITS for gold_members to say yes.
   The browser "success" event is never trusted on its own.
   Without a gateway configured, checkout falls back to UPI plus an
   activation code, which redeem-gold also verifies on the server.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_GOLDPAY) return;

  var PLANS = {
    gold_monthly: { inr: 99, name: "Gold, monthly", sub: "30 days of every Gold tool" },
    gold_yearly: { inr: 999, name: "Gold, yearly", sub: "365 days, two months free" },
    pdf_75d: { inr: 49, name: "PDF pass", sub: "75 days of unlimited cheat-sheets" }
  };

  function C() { return window.TSB_CONFIG || {}; }
  function user() { try { return window.TSB_AUTH && TSB_AUTH.user ? TSB_AUTH.user() : null; } catch (e) { return null; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- the sheet ---------- */
  var sheet = null, stopPoll = false;
  var IC = {
    spin: '<span class="gp-spin" aria-hidden="true"></span>',
    ok: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    wait: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    bad: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>'
  };
  function css() {
    if (document.getElementById("gp-css")) return;
    var st = document.createElement("style");
    st.id = "gp-css";
    st.textContent =
      ".gp{position:fixed;inset:0;z-index:100002;display:flex;align-items:flex-end;justify-content:center;background:rgba(22,19,15,.42);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .25s}" +
      ".gp.on{opacity:1}.gp__card{width:100%;max-width:460px;background:#FBF8F1;color:#16130F;border-radius:28px 28px 0 0;padding:26px 22px calc(26px + env(safe-area-inset-bottom));transform:translateY(40px);transition:transform .45s cubic-bezier(.16,1,.3,1);text-align:center;font-family:'Space Grotesk',system-ui,sans-serif}" +
      ".gp.on .gp__card{transform:none}.gp__ic{width:64px;height:64px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:#FFF1BF;color:#8A5A00}" +
      ".gp__ic--ok{background:#16130F;color:#FFC800}.gp__ic--bad{background:#FBE4E1;color:#B3261E}" +
      ".gp__h{margin:0;font:500 26px/1.15 Newsreader,Georgia,serif;letter-spacing:-.01em}.gp__p{margin:8px auto 0;max-width:330px;font:400 14.5px/1.45 'Space Grotesk',system-ui,sans-serif;color:#6E6658}" +
      ".gp__row{display:flex;gap:10px;margin-top:20px}.gp__b{flex:1;height:52px;border-radius:16px;border:0;font:700 15px 'Space Grotesk',system-ui,sans-serif;cursor:pointer;background:#FFC800;color:#16130F}" +
      ".gp__b--ghost{background:transparent;border:1.5px solid #ECE5D6;color:#16130F}.gp__ref{margin-top:14px;font:500 12px ui-monospace,monospace;color:#6E6658}" +
      ".gp-spin{width:26px;height:26px;border-radius:50%;border:3px solid rgba(138,90,0,.2);border-top-color:#8A5A00;animation:gpSpin .8s linear infinite}" +
      "@keyframes gpSpin{to{transform:rotate(360deg)}}" +
      ".gp,.gp *{box-sizing:border-box}.gp-k+.gp__h{font-size:40px;line-height:1.05}.gp-utr input::placeholder{font:500 14px 'Space Grotesk',sans-serif;letter-spacing:0;color:#857C6E}.gp-x{z-index:1}" +
      ".gp__card{position:relative;max-height:92vh;max-height:92dvh;overflow-y:auto;text-align:center}.gp-x{position:absolute;right:14px;top:14px;width:40px;height:40px;border-radius:50%;border:1px solid #ECE5D6;background:#fff;color:#16130F;display:grid;place-items:center;cursor:pointer}" +
      ".gp-k{margin:0 0 2px;font:700 11px/1.2 'Space Grotesk',system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8A5A00}" +
      ".gp-steps{list-style:none;counter-reset:gp;margin:18px 0 0;padding:0;text-align:left;display:grid;grid-template-columns:minmax(0,1fr);gap:12px}" +
      ".gp-steps>li{counter-increment:gp;position:relative;padding:14px 14px 14px 50px;border-radius:20px;background:#fff;border:1px solid #ECE5D6}" +
      ".gp-steps>li::before{content:counter(gp);position:absolute;left:14px;top:13px;width:26px;height:26px;border-radius:50%;background:#16130F;color:#FFC800;font:700 13px/26px 'Space Grotesk',sans-serif;text-align:center}" +
      ".gp-steps b{display:block;font:600 15px/1.3 'Space Grotesk',system-ui,sans-serif;margin:3px 0 10px}" +
      ".gp-pay{display:flex;align-items:center;justify-content:center;text-decoration:none;width:100%}" +
      ".gp-qr{margin-top:10px}.gp-qr summary{cursor:pointer;font:600 13px 'Space Grotesk',sans-serif;color:#6E6658;min-height:32px;display:flex;align-items:center}.gp-qr__box{display:grid;place-items:center;padding:8px;background:#fff;border-radius:14px}.gp-qr__box svg{width:184px;height:184px}" +
      ".gp-vpa{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;padding:8px 8px 8px 12px;border-radius:14px;background:#FBF8F1;font:500 13px 'Space Grotesk',sans-serif;color:#6E6658}.gp-vpa b{display:inline;margin:0;color:#16130F;font-size:13px}.gp-vpa button{height:36px;padding:0 14px;border-radius:12px;border:1px solid #ECE5D6;background:#fff;font:700 13px 'Space Grotesk',sans-serif;color:#16130F;cursor:pointer}" +
      ".gp-hint{display:block;margin:-6px 0 10px;font:400 13px/1.4 'Space Grotesk',sans-serif;color:#6E6658}" +
      ".gp-utr{display:flex;gap:8px;margin-top:4px}.gp-utr input{flex:1;min-width:0;height:52px;border-radius:16px;border:1.5px solid #ECE5D6;background:#FBF8F1;padding:0 14px;font:600 16px ui-monospace,monospace;letter-spacing:.06em;color:#16130F}.gp-utr input:focus{outline:none;border-color:#FFC800}.gp-utr .gp__b{flex:none;padding:0 18px}" +
      ".gp-msg{margin:8px 0 0;font:500 13px/1.4 'Space Grotesk',sans-serif;color:#B3261E;min-height:0}.gp-msg:empty{display:none}" +
      ".gp-code{margin-top:14px;border:0;background:none;font:600 13px 'Space Grotesk',sans-serif;color:#6E6658;text-decoration:underline;text-underline-offset:3px;min-height:44px;cursor:pointer}" +
      ".gp__card>.gp-utr{margin-top:16px}" +
      "html.dark .gp-x,html.dark .gp-steps>li,html.dark .gp-vpa button,html.dark .gp-qr__box{background:#25211B;border-color:#3A332A;color:#F3EDE2}html.dark .gp-vpa,html.dark .gp-utr input{background:#1B1814;border-color:#3A332A;color:#F3EDE2}html.dark .gp-vpa b{color:#F3EDE2}html.dark .gp-k{color:#E9C46A}html.dark .gp__p,html.dark .gp-hint,html.dark .gp-qr summary,html.dark .gp-code,html.dark .gp-vpa,html.dark .gp__ref{color:#ABA293}html.dark .gp-msg{color:#FF8F84}html.dark .gp-steps>li::before{background:#FFC800;color:#16130F}html.dark .gp-qr__box{background:#fff}" +
      "html.dark .gp__card{background:#1B1814;color:#F3EDE2}html.dark .gp__b--ghost{color:#F3EDE2;border-color:#3A332A}";
    document.head.appendChild(st);
  }
  function show(state, h, p, buttons, ref) {
    css();
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.className = "gp";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.innerHTML = '<div class="gp__card"></div>';
      document.body.appendChild(sheet);
      requestAnimationFrame(function () { sheet.classList.add("on"); });
    }
    var icCls = state === "ok" ? " gp__ic--ok" : state === "bad" ? " gp__ic--bad" : "";
    var html = '<div class="gp__ic' + icCls + '">' + (IC[state] || IC.spin) + "</div>" +
      '<h2 class="gp__h">' + h + "</h2>" + (p ? '<p class="gp__p">' + p + "</p>" : "");
    if (buttons && buttons.length) {
      html += '<div class="gp__row">' + buttons.map(function (b, i) {
        return '<button type="button" class="gp__b' + (b.ghost ? " gp__b--ghost" : "") + '" data-gp="' + i + '">' + esc(b.t) + "</button>";
      }).join("") + "</div>";
    }
    if (ref) html += '<div class="gp__ref">Order ' + esc(ref) + "</div>";
    var card = sheet.querySelector(".gp__card");
    card.innerHTML = html;
    card.onclick = function (e) {
      var t = e.target.closest("[data-gp]"); if (!t) return;
      var b = buttons[+t.getAttribute("data-gp")]; if (b && b.fn) b.fn();
    };
  }
  var starting = 0;
  function close() {
    stopPoll = true; starting = 0;
    if (!sheet) return;
    var s = sheet; sheet = null;
    s.classList.remove("on");
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 280);
  }

  /* ---------- server ---------- */
  async function createOrder(plan) {
    var c = C();
    var tk = await TSB_AUTH.token();
    if (!tk) return { ok: false, code: "sign-in" };
    try {
      var res = await fetch(c.SUPABASE_URL + "/functions/v1/gold-order", {
        method: "POST",
        headers: { apikey: c.SUPABASE_ANON_KEY, Authorization: "Bearer " + tk, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan })
      });
      var r = await res.json().catch(function () { return {}; });
      if (res.ok && r && r.order_id) return { ok: true, order_id: r.order_id, amount_paise: r.amount_paise, plan: plan };
      return { ok: false, code: res.status === 404 ? "missing" : (r && r.error) || "net" };
    } catch (e) { return { ok: false, code: "net" }; }
  }

  function loadGateway() {
    var Y = C().YOUPI || {};
    var url = String(Y.GATEWAY_URL || "").replace(/\/+$/, "");
    if (!url || !Y.PUBLIC_KEY) return Promise.resolve(null);
    if (window.Youpi && window.Youpi.pay) return Promise.resolve(window.Youpi);
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = url + "/youpi.js";
      s.setAttribute("data-youpi-key", Y.PUBLIC_KEY);
      s.setAttribute("data-currency", "INR");
      s.onload = function () { resolve(window.Youpi && window.Youpi.pay ? window.Youpi : null); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
      setTimeout(function () { resolve(window.Youpi && window.Youpi.pay ? window.Youpi : null); }, 12000);
    });
  }

  /* ---------- waiting for the bank, the only way Gold turns on ---------- */
  async function confirm(order) {
    stopPoll = false;
    var want = order.plan === "pdf_75d" ? "pdf" : "gold";
    show("spin", "Confirming your payment", "Your bank is telling us. This usually takes a few seconds, keep this screen open.", null, order.order_id);
    var t0 = Date.now();
    while (!stopPoll && Date.now() - t0 < 90000) {
      try {
        var r = window.TSB_GOLD && TSB_GOLD.check ? await TSB_GOLD.check() : {};
        if (r && r[want]) { done(order); return; }
      } catch (e) {}
      await new Promise(function (ok) { setTimeout(ok, 2000); });
    }
    if (stopPoll) return;
    show("wait", "Still waiting for the bank",
      "If money left your account, Gold switches on by itself once the bank confirms. You can close this; nothing is lost.",
      [{ t: "Check again", fn: function () { confirm(order); } }, { t: "Close", ghost: true, fn: close }], order.order_id);
  }
  function done(order) {
    try { window.dispatchEvent(new CustomEvent("tsb:gold-on", { detail: { plan: order.plan } })); } catch (e) {}
    var pdfOnly = order.plan === "pdf_75d";
    show("ok", pdfOnly ? "PDF pass is on" : "Welcome to Gold",
      pdfOnly ? "Unlimited cheat-sheets for 75 days, on every device you sign in to." : "Every Gold tool is open now, on every device you sign in to.",
      [{ t: pdfOnly ? "Make a cheat-sheet" : "See your Gold", fn: function () { close(); location.href = pdfOnly ? "library.html" : "gold.html#yours"; if (/gold\.html/.test(location.pathname)) location.reload(); } }]);
  }

  /* ---------- start ---------- */
  async function start(plan) {
    var P = PLANS[plan];
    if (!P) return;
    /* a double tap never creates two orders */
    if (starting && Date.now() - starting < 4000) return;
    starting = Date.now();
    setTimeout(function () { starting = 0; }, 4000);
    if (!user()) {
      try { sessionStorage.setItem("tsb_auth_return", "gold.html#buy-" + plan); } catch (e) {}
      show("wait", "Sign in to get " + esc(P.name), "Gold lives on your account, so it follows you to every phone and never gets lost.",
        [{ t: "Sign in", fn: function () { location.href = "login.html"; } }, { t: "Not now", ghost: true, fn: close }]);
      return;
    }
    show("spin", "Getting " + esc(P.name) + " ready", "&#8377;" + P.inr + ", " + esc(P.sub) + ".");
    var order = await createOrder(plan);
    var gw = await loadGateway();
    if (order.ok && gw) {
      close();
      stopPoll = false;
      var cued = false;
      try {
        gw.pay({
          order_id: order.order_id,
          amount: (order.amount_paise / 100).toFixed(2),
          currency: "INR",
          name: "TheSmallBook",
          description: P.name,
          handler: function () { cued = true; confirm(order); },     /* only a cue to start waiting */
          /* closed without paying: offer the manual way (pay, then paste the reference) */
          onClose: function () { if (!cued) manual(plan, order); }
        });
      } catch (e) { manual(plan, order); }
      return;
    }
    if (!order.ok && order.code && order.code !== "net" && order.code !== "missing" && order.code !== "sign-in") {
      show("bad", "Not this time", esc(order.code), [{ t: "Close", fn: close }]);
      return;
    }
    manual(plan, order.ok ? order : null);
  }

  /* v334 fallback (and the only path while YouPI is offline): pay by any UPI
     app, then paste the 12-digit UPI reference. upi-claim files it on the
     server; Gold turns on when the gateway has seen that credit, or when an
     admin approves it after checking the bank. Nothing unlocks here. */
  function vpa() { var c = C(); return (c.PAYWALL && c.PAYWALL.UPI_ID) || "9702510680@fam"; }
  function upiLink(P, order) {
    var tr = order && order.order_id ? order.order_id : "";
    return "upi://pay?pa=" + encodeURIComponent(vpa()) + "&pn=" + encodeURIComponent("TheSmallBook") +
      "&am=" + P.inr + ".00&cu=INR&tn=" + encodeURIComponent("TheSmallBook " + P.name + (tr ? " " + tr : "")) + (tr ? "&tr=" + encodeURIComponent(tr) : "");
  }
  async function callClaim(payload) {
    var c = C(), tk = await TSB_AUTH.token();
    if (!tk) return { ok: false, error: "Sign in first." };
    try {
      var res = await fetch(c.SUPABASE_URL + "/functions/v1/upi-claim", {
        method: "POST",
        headers: { apikey: c.SUPABASE_ANON_KEY, Authorization: "Bearer " + tk, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var r = await res.json().catch(function () { return {}; });
      if (res.status === 404) return { ok: false, error: "Payments are being set up. Try again later today." };
      return r && typeof r === "object" ? r : { ok: false };
    } catch (e) { return { ok: false, error: "No connection. Check your internet and try again." }; }
  }
  function manual(plan, order) {
    var P = PLANS[plan];
    css();
    show("wait", "", "");
    var card = sheet.querySelector(".gp__card");
    var mobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent || "");
    var link = upiLink(P, order);
    var qr = "";
    try { if (window.TSB_PAY && TSB_PAY.qr) qr = TSB_PAY.qr(link); } catch (e) {}
    card.innerHTML =
      '<button type="button" class="gp-x" data-x aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<p class="gp-k">' + esc(P.name) + '</p><h2 class="gp__h">&#8377;' + P.inr + '</h2><p class="gp__p">' + esc(P.sub) + '.</p>' +
      '<ol class="gp-steps">' +
      '<li><b>Pay with UPI</b>' +
      (mobile ? '<a class="gp__b gp-pay" href="' + esc(link) + '">Pay &#8377;' + P.inr + ' with a UPI app</a>' : "") +
      (qr ? '<details class="gp-qr"' + (mobile ? "" : " open") + '><summary>' + (mobile ? "Or scan the QR from another phone" : "Scan with any UPI app") + '</summary><div class="gp-qr__box">' + qr + "</div></details>" : "") +
      '<div class="gp-vpa"><span>UPI ID <b>' + esc(vpa()) + '</b></span><button type="button" data-copy>Copy</button></div></li>' +
      '<li><b>Paste the UPI reference</b><span class="gp-hint">The 12-digit number in your UPI app, under the payment details (UPI Ref No. or UTR).</span>' +
      '<form class="gp-utr" novalidate><input id="gpUtr" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="12 digits" aria-label="12-digit UPI reference"><button class="gp__b" type="submit">Switch on</button></form>' +
      '<p class="gp-msg" id="gpMsg" role="status"></p></li></ol>' +
      '<button type="button" class="gp-code" data-code>Have a TheSmallBook code?</button>';
    card.onclick = function (e) {
      if (e.target.closest("[data-x]")) { close(); return; }
      if (e.target.closest("[data-copy]")) {
        try { navigator.clipboard.writeText(vpa()); } catch (er) {}
        var cb = e.target.closest("[data-copy]"); cb.textContent = "Copied"; setTimeout(function () { cb.textContent = "Copy"; }, 1600);
        return;
      }
      if (e.target.closest("[data-code]")) { codeSheet(plan); return; }
    };
    var form = card.querySelector(".gp-utr"), inp = card.querySelector("#gpUtr"), msg = card.querySelector("#gpMsg");
    inp.addEventListener("input", function () { inp.value = inp.value.replace(/\D/g, "").slice(0, 12); });
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var utr = inp.value.replace(/\D/g, "");
      if (utr.length !== 12) { msg.textContent = "That should be 12 digits. Open the payment in your UPI app to find it."; inp.focus(); return; }
      var btn = form.querySelector("button"); if (btn.disabled) return;
      btn.disabled = true; btn.textContent = "Checking"; msg.textContent = "";
      var r = await callClaim({ plan: plan, utr: utr, order_id: order ? order.order_id : undefined });
      btn.disabled = false; btn.textContent = "Switch on";
      if (r.ok && r.status === "approved") {
        try { if (window.TSB_GOLD && TSB_GOLD.check) await TSB_GOLD.check(); } catch (er) {}
        done({ plan: plan });
        return;
      }
      if (r.ok) { waiting(plan); return; }
      msg.textContent = r.error || "That did not go through. Try again.";
    });
  }
  /* the claim is filed: Gold turns on by itself once it is matched */
  function waiting(plan) {
    var want = plan === "pdf_75d" ? "pdf" : "gold";
    show("wait", "Payment noted",
      "We match it with the bank, then " + (want === "pdf" ? "your PDF pass" : "Gold") + " switches on by itself on every device you sign in to. Usually within a few hours, often minutes. You can close this.",
      [{ t: "Check now", fn: async function () {
        var r = {};
        try { r = window.TSB_GOLD && TSB_GOLD.check ? await TSB_GOLD.check() : {}; } catch (e) {}
        if (r && r[want]) { done({ plan: plan }); return; }
        var s = await callClaim({ op: "status" });
        if (s && s.claim && s.claim.status === "rejected") {
          show("bad", "We could not find that payment", "Check the 12-digit reference and the amount, then try again, or write to thesmallbook.in@gmail.com." + (s.claim.note ? " Note: " + esc(s.claim.note) : ""),
            [{ t: "Try again", fn: function () { manual(plan, null); } }, { t: "Close", ghost: true, fn: close }]);
          return;
        }
        var p = sheet && sheet.querySelector(".gp__p"); if (p) p.textContent = "Not yet. It switches on by itself as soon as it is matched; you can close this.";
      } }, { t: "Close", ghost: true, fn: close }]);
  }
  /* gift and launch codes (TSB-XXXX-XXXX), verified by redeem-gold */
  function codeSheet(plan) {
    show("wait", "Enter your code", "Codes look like TSB-XXXX-XXXX.");
    var card = sheet.querySelector(".gp__card");
    card.insertAdjacentHTML("beforeend", '<form class="gp-utr" novalidate><input id="gpCode" autocomplete="off" autocapitalize="characters" maxlength="13" placeholder="TSB-XXXX-XXXX" aria-label="Your code"><button class="gp__b" type="submit">Redeem</button></form><p class="gp-msg" id="gpMsg" role="status"></p><button type="button" class="gp-code" data-back>Back to UPI</button>');
    card.onclick = function (e) { if (e.target.closest("[data-back]")) manual(plan, null); };
    var f = card.querySelector(".gp-utr"), inp = card.querySelector("#gpCode"), msg = card.querySelector("#gpMsg");
    f.addEventListener("submit", async function (e) {
      e.preventDefault();
      var code = inp.value.trim().toUpperCase();
      if (!/^TSB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) { msg.textContent = "That does not look like a code yet."; return; }
      var c = C(), tk = await TSB_AUTH.token();
      if (!tk) { msg.textContent = "Sign in first."; return; }
      var btn = f.querySelector("button"); btn.disabled = true;
      try {
        var res = await fetch(c.SUPABASE_URL + "/functions/v1/redeem-gold", { method: "POST", headers: { apikey: c.SUPABASE_ANON_KEY, Authorization: "Bearer " + tk, "Content-Type": "application/json" }, body: JSON.stringify({ code: code }) });
        var r = await res.json().catch(function () { return {}; });
        btn.disabled = false;
        if (res.ok && r.ok) { try { if (window.TSB_GOLD && TSB_GOLD.check) await TSB_GOLD.check(); } catch (er) {} done({ plan: "gold_yearly" }); return; }
        msg.textContent = (r && r.error) || "That code did not go through.";
      } catch (er) { btn.disabled = false; msg.textContent = "No connection. Try again."; }
    });
  }

  /* back from sign-in with a plan waiting */
  function resume() {
    var m = /^#buy-(gold_monthly|gold_yearly|pdf_75d)$/.exec(location.hash || "");
    if (!m || !user()) return;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    start(m[1]);
  }
  window.addEventListener("tsb:auth", resume);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(resume, 400); });
  else setTimeout(resume, 400);

  window.TSB_GOLDPAY = { start: start, plans: PLANS, close: close };
})();
