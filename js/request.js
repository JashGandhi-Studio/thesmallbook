/* v331 REQUEST A BOOK: a calm sheet, sent through Web3Forms.
   Any element with data-request opens it (data-request="Title" prefills).
   Double taps are ignored, the button says what is happening, and every
   request is remembered on the device so nobody sends the same one twice. */
(function () {
  "use strict";
  var KEY = (window.TSB_CONFIG && TSB_CONFIG.WEB3FORMS_KEY) || "";
  var LS = "tsb_requests";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function mine() { try { var v = JSON.parse(localStorage.getItem(LS) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function remember(t) { var m = mine(); m.unshift({ t: t, at: Date.now() }); try { localStorage.setItem(LS, JSON.stringify(m.slice(0, 30))); } catch (e) {} }
  function asked(t) { var k = t.trim().toLowerCase(); return mine().some(function (x) { return String(x.t).trim().toLowerCase() === k; }); }
  function userEmail() { try { var s = JSON.parse(localStorage.getItem("tsb_auth_session") || "null"); return (s && s.user && s.user.email) || ""; } catch (e) { return ""; } }
  var OUT = "tsb_rq_outbox";
  /* plain form fields (no JSON) keep this a simple browser request with no pre-check */
  function send(body) {
    var fd = new FormData();
    Object.keys(body).forEach(function (k) { fd.append(k, body[k]); });
    return fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body: fd })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: !!(j && j.success), net: false, status: r.status }; }); })
      .catch(function () { return { ok: false, net: true }; });
  }
  function outbox() { try { var v = JSON.parse(localStorage.getItem(OUT) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function queue(body) { var o = outbox(); o.push({ b: body, n: 0 }); try { localStorage.setItem(OUT, JSON.stringify(o.slice(-10))); } catch (e) {} }
  var flushing = false;
  function flush() {
    var o = outbox(); if (!o.length || flushing || !KEY || (navigator.onLine === false)) return;
    flushing = true;
    var item = o[0];
    send(item.b).then(function (r) {
      var cur = outbox();
      if (r.ok || (!r.net) || item.n >= 4) cur.shift(); else { cur[0].n = (cur[0].n || 0) + 1; }
      try { localStorage.setItem(OUT, JSON.stringify(cur)); } catch (e) {}
      flushing = false;
      if (r.ok && cur.length) setTimeout(flush, 1500);
    });
  }
  window.addEventListener("online", function () { setTimeout(flush, 1200); });
  setTimeout(flush, 5000);
  function mailLink(body) {
    var sub = encodeURIComponent("Book request: " + body.title);
    var txt = encodeURIComponent("Title: " + body.title + "\nAuthor: " + (body.author || "") + "\nWhy: " + (body.why || ""));
    return '<a href="mailto:thesmallbook.in@gmail.com?subject=' + sub + "&body=" + txt + '">send it by email</a>';
  }
  var X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function open(pre) {
    var old = document.getElementById("rqWrap"); if (old) old.remove();
    var w = document.createElement("div"); w.id = "rqWrap"; w.className = "rq";
    var m = mine().slice(0, 3);
    w.innerHTML = '<div class="rq-bg" data-rqx></div><form class="rq-sh" role="dialog" aria-modal="true" aria-label="Request a book" novalidate>' +
      '<div class="rq-grab"></div><div class="rq-hd"><div><div class="rq-k">REQUEST A BOOK</div><h2>Which book <i>should we add?</i></h2></div><button type="button" class="rq-x" data-rqx aria-label="Close">' + X + "</button></div>" +
      '<label class="rq-f"><span>Book title</span><input name="title" required maxlength="120" autocomplete="off" placeholder="e.g. The Courage to Be Disliked" value="' + esc(pre || "") + '"></label>' +
      '<label class="rq-f"><span>Author <em>optional</em></span><input name="author" maxlength="80" autocomplete="off" placeholder="Who wrote it"></label>' +
      '<label class="rq-f"><span>Why this one? <em>optional</em></span><textarea name="why" rows="2" maxlength="400" placeholder="One line is plenty"></textarea></label>' +
      '<label class="rq-f"><span>Email <em>optional, we tell you when it is up</em></span><input name="email" type="email" maxlength="120" autocomplete="email" placeholder="you@example.com" value="' + esc(userEmail()) + '"></label>' +
      '<input type="checkbox" name="botcheck" class="rq-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="submit" class="rq-go">Send request</button><p class="rq-msg" aria-live="polite"></p>' +
      (m.length ? '<div class="rq-mine"><b>You asked for</b>' + m.map(function (x) { return "<span>" + esc(x.t) + "</span>"; }).join("") + "</div>" : "") +
      "</form>";
    document.body.appendChild(w);
    var f = w.querySelector("form"), go = f.querySelector(".rq-go"), msg = f.querySelector(".rq-msg"), busy = false;
    function close() { w.classList.remove("on"); document.removeEventListener("keydown", key); setTimeout(function () { w.remove(); }, 300); }
    function key(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", key);
    w.addEventListener("click", function (e) { if (e.target.closest("[data-rqx]")) close(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var t = f.title.value.trim();
      if (t.length < 2) { msg.textContent = "Add the book title first."; f.title.focus(); return; }
      if (f.botcheck.checked) { close(); return; }
      if (asked(t)) { msg.textContent = "You already asked for this one. It is on our list."; return; }
      var em = f.email.value.trim();
      if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = "That email looks off. Fix it or leave it empty."; f.email.focus(); return; }
      busy = true; go.disabled = true; go.textContent = "Sending\u2026"; msg.textContent = "";
      var body = { access_key: KEY, subject: "Book request: " + t, from_name: "TheSmallBook", title: t, author: f.author.value.trim(), why: f.why.value.trim(), page: location.pathname, botcheck: "" };
      /* Web3Forms checks the email field, so it is only sent when the reader gave one */
      if (em) { body.email = em; body.replyto = em; } else body.reader_email = "not given";
      var done = function () { remember(t); f.classList.add("is-sent"); f.innerHTML = '<div class="rq-done"><div class="rq-tick"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h2>Request sent.</h2><p>' + esc(t) + " is on the list. We read every request" + (em ? ", and we will email you when it is up." : ".") + '</p><button type="button" class="rq-go" data-rqx>Done</button></div>'; };
      if (!KEY) { done(); return; }
      send(body).then(function (r) {
        if (r.ok) { done(); return; }
        if (r.net) {
          /* no signal: keep it on the phone and send it the moment the app is back online */
          queue(body); done();
          var d = f.querySelector(".rq-done p"); if (d) d.textContent = "Saved on your phone. It sends by itself as soon as you are back online.";
          return;
        }
        busy = false; go.disabled = false; go.textContent = "Try again";
        msg.innerHTML = "That did not go through. Tap again, or " + mailLink(body) + ".";
      });
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { w.classList.add("on"); }); });
    setTimeout(function () { (pre ? f.author : f.title).focus(); }, 380);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-request]"); if (!t) return;
    e.preventDefault(); open(t.getAttribute("data-request") || "");
  });
  window.TSB_REQUEST = { open: open };
})();
