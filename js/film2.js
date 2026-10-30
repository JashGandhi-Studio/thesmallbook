/* ==========================================================================
   THESMALLBOOK v328 · THE ROOMS (film2.js)
   The second pass on the redesign film:
   - translation that loads behind a soft veil, then settles in line by line
   - a daily welcome: what is new today, and where you left off
   - the audio room player: a 3D book that sways while it speaks, opens to
     show the very line being read, and a mini player that shows it too
   - the Listen room header: continue, in Hindi, spoken by the app, kids
   - a share sheet that makes a quote card in three styles
   - calmer Settings, a redesigned About, a quieter sign in
   Plain ES5, no dependencies, every block guarded.
   ========================================================================== */
(function () {
  "use strict";
  if (window.TSB_FILM2) return;
  var root = document.documentElement;
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase() || "index.html";
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); if (v === null) return d; try { return JSON.parse(v); } catch (e) { return v; } } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function books() { return window.BOOKS || []; }
  function byId(id) { var B = books(); for (var i = 0; i < B.length; i++) if (B[i].id === id) return B[i]; return null; }
  function cover(b) { return (b && b.cover) || "assets/covers/" + (b ? b.id : "") + ".jpg"; }
  function name() { var n = lsGet("tsb_reader_name", ""); n = typeof n === "string" ? n.trim() : ""; return n === "Guest Reader" ? "" : n; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function dayNum() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5); }
  function seed(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function anim(n, frames, o) { try { if (!reduce && n && n.animate) return n.animate(frames, o); } catch (e) {} return null; }
  /* edition colours: 18 letters, a=0 ... p=15, bg / type / accent */
  function ed(id) {
    var s = (window.TSB_ED || {})[id]; if (!s || s.length < 18) return null;
    function hx(i) { var o = "#"; for (var k = 0; k < 6; k++) o += (s.charCodeAt(i + k) - 97).toString(16); return o; }
    return { bg: hx(0), fg: hx(6), ac: hx(12) };
  }
  function mix(hex, to, t) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t), g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t), bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  var IC = {
    x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    flame: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-3.9 2.3-5 .2 1.6 1 2.6 2 3 0-3.6-1.3-6.4.7-9z" fill="#FF7A3D"/><path d="M12 13c.6 1.6 2.2 2.2 2.2 4.1a2.2 2.2 0 0 1-4.4 0c0-1.2.6-2 1.2-2.6.3.7.7 1 1 1.1 0-1-.3-1.8 0-2.6z" fill="#FFC800"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    list: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    story: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="3"/><path d="M10 7h4"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>',
    save: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.9C10.6 5.1 8.4 4.1 5.7 4.1H2.9v13.5h3.3c2.5 0 4.5 1 5.8 2.6 1.3-1.6 3.3-2.6 5.8-2.6h3.3V4.1h-2.8c-2.7 0-4.9 1-6.3 2.8z"/><path d="M12 6.9v13.3"/></svg>',
    spark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>',
    ear: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>'
  };

  /* ==========================================================================
     1 · TRANSLATION: loads behind a soft veil, then settles line by line
     ========================================================================== */
  var NATIVE = { hi: "हिन्दी", mr: "मराठी", gu: "ગુજરાતી", ta: "தமிழ்", te: "తెలుగు", kn: "ಕನ್ನಡ", ml: "മലയാളം", bn: "বাংলা", pa: "ਪੰਜਾਬੀ", ur: "اردو", or: "ଓଡ଼ିଆ", as: "অসমীয়া", "hi-Latn": "Hinglish", "gu-Latn": "Gujlish", es: "Español", fr: "Français", de: "Deutsch", ar: "العربية", ja: "日本語", zh: "中文", "zh-CN": "中文", ru: "Русский", pt: "Português" };
  /* v329: the new language arrives behind frosted glass. While Google works,
     the page sits under a translucent pane with a light sweeping through it and
     a glass card names the language in its own script. When the words land,
     the pane lifts from the top down and each line settles in as it is uncovered. */
  var txBusy = false;
  function txVeil(inplace, limit) {
    if (!root.classList.contains("f-txw") || txBusy) return;
    txBusy = true;
    var code = lsGet("tsb_lang", "en"), name = NATIVE[code] || code;
    var card = $(".f-txcard") || el("div", "f-txcard");
    card.className = "f-txcard";
    card.innerHTML = '<span class="f-txcard__k">Translating</span><b class="f-txcard__w" translate="no">' + esc(name) + '</b><span class="f-txcard__s">Your place is kept</span><i class="f-txcard__bar"><i></i></i>';
    card.setAttribute("aria-live", "polite"); card.setAttribute("translate", "no"); card.setAttribute("role", "status");
    if (!card.parentNode) document.body.appendChild(card);
    var t0 = Date.now(), quietAt = 0, moved = !inplace, mo = null, done = false, LIMIT = limit || 7000;
    function finish() {
      if (done) return; done = true; txBusy = false;
      try { if (mo) mo.disconnect(); } catch (e) {}
      card.classList.add("is-done");
      setTimeout(function () { card.remove(); }, 700);
      var vh = window.innerHeight, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.classList.add("f-txgo");
      requestAnimationFrame(function () { root.classList.remove("f-txw"); });
      if (!reduce) {
        var n = 0;
        $$("h1, h2, h3, p, li, blockquote, .lesson__head, .ft-hero, .ft-mp, .ft-cont, .ft-rb, .f-chip, .rm-callout, .frd-dock, .fl-row, .fr-sec").forEach(function (x) {
          if (n > 30) return;
          var r = x.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh || !r.height) return;
          if (x.closest("#tsbBar, .f-txcard")) return;
          n++;
          /* in step with the pane: a line settles just as the glass passes it */
          var d = 60 + Math.max(0, r.top) / vh * 620;
          anim(x, [{ opacity: .25, transform: "translateY(10px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 640, delay: d, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
        });
      }
      setTimeout(function () { root.classList.remove("f-txgo"); }, 1300);
      try { window.dispatchEvent(new CustomEvent("tsb:lang", { detail: { code: code } })); } catch (e) {}
    }
    window.addEventListener("tsb:tx-fail", function () { setTimeout(finish, 250); }, { once: true });
    function translated() { return root.classList.contains("translated-ltr") || root.classList.contains("translated-rtl") || !!document.querySelector("font[style*='vertical-align']"); }
    (function wait() {
      if (done) return;
      if (Date.now() - t0 > LIMIT) return finish();
      if (!translated()) return setTimeout(wait, 120);
      quietAt = Date.now();
      try {
        mo = new MutationObserver(function (list) {
          for (var i = 0; i < list.length; i++) { var t = list[i].target; if (t && t.closest && t.closest(".f-txcard")) continue; moved = true; quietAt = Date.now(); return; }
        });
        mo.observe(document.body, { childList: true, subtree: true, characterData: true });
      } catch (e) { moved = true; }
      (function settle() {
        if (done) return;
        var age = Date.now() - t0;
        if (age > LIMIT || (moved && age > 700 && Date.now() - quietAt > 480)) return finish();
        setTimeout(settle, 120);
      })();
    })();
  }
  window.TSB_TXVEIL = function (inplace) { root.classList.add("f-txw"); txVeil(!!inplace, 9000); };

  /* ==========================================================================
     2 · A DAILY WELCOME: what is new today, and where you left off
     ========================================================================== */
  function welcome() {
    if (page !== "index.html" || !root.classList.contains("fv-today")) return;
    if (!lsGet("tsb_onboarded", false)) return;
    if ((lsGet("tsb_onboard_v", 0) || 0) < 331) return;   /* v331: the update card comes first */
    if (/[?&](nowelcome|shot)=/.test(location.search)) return;
    var today = dayKey();
    var first = lsGet("tsb_first_day", "");
    if (!first) { lsSet("tsb_first_day", today); lsSet("tsb_welcome_day", today); return; }
    if (lsGet("tsb_welcome_day", "") === today) return;
    lsSet("tsb_welcome_day", today);
    var nm = name(), dn = Math.max(1, Math.round((new Date(today) - new Date(first)) / 864e5) + 1);
    var streak = 0; try { streak = window.TSB && TSB.streak ? TSB.streak.count() : 0; } catch (e) {}
    var pick = null; try { pick = window.TSB_FILM && TSB_FILM.todaysPick ? TSB_FILM.todaysPick() : null; } catch (e) {}
    var last = null; try { last = window.TSB && TSB.lastRead ? TSB.lastRead.get() : null; } catch (e) {}
    var lb = last && byId(last.id);
    var done = 0; try { done = lb && TSB.progress ? TSB.progress.forBook(lb.id).length : 0; } catch (e) {}
    var cont = lb && lb.lessons && done < lb.lessons.length ? lb : null;
    var M = window.TSB_MINDPICK, mq = null;
    try { if (M && M.daily) mq = M.daily[(dayNum() + seed(nm || "r") % 7) % M.daily.length]; } catch (e) {}
    /* v330: the daily open is one calm full screen. A time-of-day sky, the
       book for today turning in, one big button. Two choices, nothing else. */
    var hr = new Date().getHours();
    var tod = hr >= 5 && hr < 12 ? "am" : (hr >= 12 && hr < 17 ? "noon" : "pm");
    var hello = tod === "am" ? "Good morning" : (tod === "noon" ? "Good afternoon" : "Good evening");
    var bk = cont || pick;
    var mins = bk && bk.readTime ? String(bk.readTime).replace(/\s*read$/i, "").replace(/\s*min.*$/i, "") : "8";
    var sub = cont
      ? "Lesson " + Math.min(cont.lessons.length, done + 1) + " of <b>" + esc(cont.title) + "</b> is waiting."
      : (bk ? "Today: <b>" + esc(bk.title) + "</b>, " + esc(mins) + " minutes." : "One small read is waiting.");
    var go = bk ? '<a class="fw2-go" href="book.html?id=' + encodeURIComponent(bk.id) + '">' + (cont ? "Continue reading" : "Start today\u2019s read") + IC.arrow + "</a>" : "";
    var wrap = el("div", "fw fw2 fw2--" + tod, '<div class="fw-scrim" data-fw-x></div><div class="fw-card fw2-card" role="dialog" aria-modal="true" aria-label="Welcome back">' +
      '<div class="fw2-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="fw2-top"><span class="fw2-pill">Day ' + dn + "</span>" +
        '<span class="fw2-pill fw2-pill--fl">' + IC.flame + (streak > 0 ? streak + " day streak" : "Start a streak") + "</span></div>" +
      (bk ? '<div class="fw2-stage" aria-hidden="true"><span class="fw2-bk"><img src="' + esc(cover(bk)) + '" alt=""><i class="fw2-pg"></i></span><span class="fw2-floor"></span></div>' : "") +
      '<h2 class="fw2-h">' + hello + (nm ? ",<br><i>" + esc(nm) + ".</i>" : ".") + "</h2>" +
      '<p class="fw2-s">' + sub + "</p>" +
      '<div class="fw2-acts">' + go + '<button type="button" class="fw2-later" data-fw-x>Just browse</button></div></div>');
    function close() { wrap.classList.add("is-out"); setTimeout(function () { wrap.remove(); }, 420); }
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-fw-x]")) { close(); return; }
      if (e.target.closest("[data-fw-mp]")) {
        close();
        setTimeout(function () { var mp = $(".ft-mp"); if (mp) { mp.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); setTimeout(function () { if (!mp.classList.contains("flip")) mp.click(); }, 650); } }, 300);
        return;
      }
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
    /* swipe down to put it away */
    (function () {
      var card = wrap.querySelector(".fw-card"), y0 = 0, dy = 0, on = false;
      card.addEventListener("pointerdown", function (e) { if (e.target.closest("a,button")) return; on = true; y0 = e.clientY; dy = 0; card.style.transition = "none"; });
      window.addEventListener("pointermove", function (e) { if (!on) return; dy = Math.max(0, e.clientY - y0); card.style.transform = "translateY(" + dy + "px)"; });
      window.addEventListener("pointerup", function () { if (!on) return; on = false; card.style.transition = ""; if (dy > 90) close(); else card.style.transform = ""; });
    })();
    setTimeout(function () {
      document.body.appendChild(wrap);
      requestAnimationFrame(function () { wrap.classList.add("is-in"); });
    }, 650);
  }

  /* ==========================================================================
     3 · THE AUDIO ROOM PLAYER
     A 3D book that sways while it speaks. Tap it and the cover swings open
     on the page being read, the spoken words lighting up as they are said.
     ========================================================================== */
  var AP = null;
  function apState() { try { return window.TSB_AUDIO && TSB_AUDIO.state ? TSB_AUDIO.state() : null; } catch (e) { return null; } }
  var line = { text: "", idx: -1, total: 0, t0: 0, words: [], raf: 0 };
  function speed() { var s = Number(lsGet("tsb_audio_speed", 1)) || 1; return s; }
  function lineHtml(text) {
    var w = String(text || "").split(/\s+/).filter(Boolean);
    return w.map(function (x, i) { return '<span data-w="' + i + '">' + esc(x) + "</span>"; }).join(" ");
  }
  function paintLine(host, text, label) {
    if (!host) return;
    var box = host.querySelector(".fp-line"), k = host.querySelector(".fp-pk");
    if (k && label != null) k.textContent = label;
    if (!box) return;
    if (box.getAttribute("data-t") === text) return;
    box.setAttribute("data-t", text);
    box.classList.add("is-swap");
    setTimeout(function () { box.innerHTML = lineHtml(text); box.classList.remove("is-swap"); }, 160);
  }
  function tickWords() {
    cancelAnimationFrame(line.raf);
    var st = apState(); if (!st || st.type === "audio") return;
    var per = 0.36 / speed() * 1000;   /* about 165 words a minute at 1x */
    (function f() {
      var n = Math.floor((performance.now() - line.t0) / per);
      $$(".fp-line, .ap-line").forEach(function (box) {
        var ws = box.querySelectorAll("span[data-w]");
        /* keep the spoken word in view: the dock slides along, the page turns a little */
        var cut = box.classList.contains("ap-line") ? n - 2 : (n > 26 ? n - 14 : 0);
        for (var i = 0; i < ws.length; i++) { ws[i].classList.toggle("is-said", i < n); ws[i].style.display = i < cut ? "none" : ""; }
        if (ws[n]) ws[n].classList.add("is-now");
        if (ws[n - 1]) ws[n - 1].classList.remove("is-now");
      });
      var s2 = apState();
      if (s2 && s2.playing && n <= line.words.length) line.raf = requestAnimationFrame(f);
    })();
  }
  /* v331: follow-along text plus key details under the controls */
  function followHtml(st, b) {
    var h = "", P = (window.TSB_AUDIO && TSB_AUDIO.parts) ? TSB_AUDIO.parts() : null;
    if (st.type !== "audio" && P && P.length) {
      /* lyrics-style: the spoken prefixes become quiet labels, never raw text */
      var line1 = function (t, i) {
        var m, lab = "", cls = "", body = String(t || "").trim();
        if ((m = /^Lesson (\d+)\.\s*(.*?)\.?$/.exec(body))) return '<p data-px="' + i + '" class="is-h"><em>Lesson ' + m[1] + "</em>" + esc(m[2].replace(/\s+-\s+/g, ": ")) + "</p>";
        if ((m = /^From the book:\s*/.exec(body))) { lab = "From the book"; body = body.slice(m[0].length); cls = " is-ex"; }
        else if ((m = /^Do this:\s*/.exec(body))) { lab = "Do this"; body = body.slice(m[0].length); cls = " is-do"; }
        if (!body) return "";
        return '<p data-px="' + i + '" class="' + cls.trim() + '">' + (lab ? "<em>" + lab + "</em>" : "") + esc(body) + "</p>";
      };
      h += '<section class="fp-tx"><div class="fp-x-h"><span>Follow along</span><button type="button" class="fp-tx-big" aria-label="Bigger text">Aa</button></div><div class="fp-tx-body">' +
        P.map(line1).join("") + "</div></section>";
    }
    var meta = [], idea = "", L = [];
    if (b) {
      if (b.author) meta.push(/^unknown$/i.test(b.author) ? "TheSmallBook Original" : esc(b.author));
      if (b.year) meta.push(esc(String(b.year)));
      if (b.category) meta.push(esc(b.category));
      if (b.readTime) meta.push(esc(String(b.readTime)) + (/min/i.test(String(b.readTime)) ? "" : " min read"));
      idea = b.bigIdea || b.oneLiner || b.tagline || "";
      L = (b.lessons || []).slice(0, 5);
    } else if (st.sub) meta.push(esc(st.sub));
    if (st.type === "audio" && st.items) meta.push(st.items + (st.items === 1 ? " chapter" : " chapters"));
    h += '<section class="fp-kd"><div class="fp-x-h"><span>' + (b ? "The book at a glance" : "About this") + "</span></div>" +
      '<b class="fp-kd-t">' + esc(b ? b.title : (st.title || "")) + "</b>" +
      (meta.length ? '<div class="fp-kd-m">' + meta.join(" \u00b7 ") + "</div>" : "") +
      (idea ? '<p class="fp-kd-i">' + esc(idea) + "</p>" : "") +
      (L.length ? '<ol class="fp-kd-l">' + L.map(function (l) { return "<li>" + esc(String(l.title || "").replace(/\s+-\s+/g, ": ")) + "</li>"; }).join("") + "</ol>" : "") +
      (b ? '<a class="fp-kd-go" href="book.html?id=' + encodeURIComponent(b.id) + '">Read it' + IC.arrow + "</a>" : "") + "</section>";
    return h;
  }
  function paintFollow(host, idx) {
    var body = host && host.querySelector(".fp-tx-body"); if (!body) return;
    var big = body.parentNode.querySelector(".fp-tx-big");
    if (big && !big._w) { big._w = 1; if (String(lsGet("tsb_fp_big", "")) === "1") body.classList.add("is-big"); big.addEventListener("click", function () { var on = body.classList.toggle("is-big"); try { localStorage.setItem("tsb_fp_big", on ? "1" : ""); } catch (e) {} }); }
    if (idx == null || idx < 0) return;
    $$("p[data-px]", body).forEach(function (p) { var i = Number(p.getAttribute("data-px")); p.classList.toggle("is-on", i === idx); p.classList.toggle("is-past", i < idx); });
    var on = body.querySelector("p.is-on");
    if (on) body.scrollTo({ top: Math.max(0, on.offsetTop - body.offsetTop - 40), behavior: reduce ? "auto" : "smooth" });
  }
  function onLine(e) {
    var d = e.detail || {};
    if (!d.text) return;
    if (d.idx === line.idx && d.text === line.text) { if (d.playing) tickWords(); return; }
    line.text = d.text; line.idx = d.idx; line.total = d.total; line.t0 = performance.now(); line.words = d.text.split(/\s+/);
    var st = apState();
    var sheet = document.getElementById("tsbApSheet");
    if (sheet) {
      paintLine(sheet, d.text, st ? st.label : "");
      paintFollow(sheet, d.idx);
      var w = sheet.querySelector(".fp-wave");
      if (w && d.total) paintWave(w, (d.idx + 1) / d.total);
    }
    var dock = document.getElementById("tsbAp");
    if (dock) {
      var ln = dock.querySelector(".ap-line");
      if (!ln) { ln = el("span", "ap-line"); var mid = dock.querySelector(".ap-mid"); if (mid) mid.insertBefore(ln, mid.querySelector(".ap-prog")); }
      ln.innerHTML = lineHtml(d.text.length > 140 ? d.text.slice(0, 140) + "\u2026" : d.text);
      dock.classList.add("has-line");
    }
    if (d.playing) tickWords();
  }
  function paintWave(w, frac) {
    var bars = w.children, n = bars.length;
    for (var i = 0; i < n; i++) bars[i].classList.toggle("on", i / n < frac);
  }
  function waveHtml(seedS) {
    var h = "", s = seed(seedS || "tsb");
    for (var i = 0; i < 52; i++) { var v = 8 + Math.abs(Math.sin(i * 1.7 + (s % 7)) * 18 + Math.sin(i * 0.45 + (s % 5)) * 12); h += '<i style="height:' + Math.min(40, v).toFixed(0) + 'px"></i>'; }
    return h;
  }
  function bookFaces(b, st) {
    var c = b ? ed(b.id) : null, bg = c ? c.bg : "#2A3B57";
    var img = b ? '<img src="' + esc(cover(b)) + '" alt="">' : (st && st.art ? '<img src="' + esc(st.art) + '" alt="">' : "");
    return '<div class="fp-b3" style="--bc:' + bg + '">' +
      '<i class="fp-f fp-back"></i><i class="fp-f fp-spine"></i><i class="fp-f fp-edge"></i><i class="fp-f fp-top"></i><i class="fp-f fp-bot"></i>' +
      '<div class="fp-f fp-page"><div class="fp-pk"></div><div class="fp-line" aria-live="off"></div><div class="fp-pn"></div></div>' +
      '<div class="fp-lid"><div class="fp-lid__f">' + img + '</div><div class="fp-lid__b"><div class="fp-exl"><small>FROM THE LIBRARY OF</small><b>TheSmallBook</b><i></i><span>' + esc(b ? b.title : ((st && st.title) || "")) + '</span><em>' + esc(b ? b.author : "") + '</em></div></div></div></div>';
  }
  function enhanceSheet(sheet) {
    if (!sheet || sheet.getAttribute("data-fp")) return;
    sheet.setAttribute("data-fp", "1");
    var st = apState(); if (!st) return;
    var b = st.bookId ? byId(st.bookId) : null;
    var c = b ? ed(b.id) : null;
    var base = c ? c.bg : "#24446E";
    /* the room takes the colour of the book, darkened so white type always reads */
    var top = mix(base, "#000000", 0.35), bottom = mix(base, "#0B0907", 0.86);
    sheet.classList.add("fp");
    sheet.style.setProperty("--fp-top", top); sheet.style.setProperty("--fp-bot", bottom);
    var card = sheet.querySelector(".ap-card"); if (!card) return;
    var head = card.querySelector(".ap-head");
    var lang = lsGet("tsb_lang", "en");
    var kick = el("div", "fp-kick", st.type === "audio" ? (/^pod:/.test(st.key) ? "PODCAST" : (/^orig:/.test(st.key) ? "TSB ORIGINAL" : "AUDIOBOOK \u00b7 FULL CHAPTERS")) : "SPOKEN BY THE APP" + (NATIVE[lang] ? " \u00b7 " + NATIVE[lang] : ""));
    var flat = !b;
    var stage = el("div", "fp-stage" + (flat ? " fp-stage--flat" : ""),
      '<div class="fp-glow"></div><div class="fp-book" role="button" tabindex="0" aria-label="' + (flat ? "Artwork" : "Open the book to see the line being read") + '">' + bookFaces(b, st) + '</div><div class="fp-floor"></div>' +
      (flat ? "" : '<button type="button" class="fp-peek">' + IC.book + "<span>See the page</span></button>"));
    if (head && head.nextSibling) { card.insertBefore(kick, head.nextSibling); card.insertBefore(stage, kick.nextSibling); }
    else { card.insertBefore(stage, card.firstChild); card.insertBefore(kick, stage); }
    var bk = stage.querySelector(".fp-book"), peek = stage.querySelector(".fp-peek");
    function toggleOpen() {
      if (flat) return;
      var on = !stage.classList.contains("is-open");
      stage.classList.toggle("is-open", on);
      if (peek) peek.querySelector("span").textContent = on ? "Close the book" : "See the page";
      if (on) { var s2 = apState(); if (s2 && s2.type === "audio") paintLine(sheet, s2.label || "", "CHAPTER " + (s2.cur + 1) + " OF " + s2.items); else if (line.text) { paintLine(sheet, line.text, s2 ? s2.label : ""); tickWords(); } }
    }
    bk.addEventListener("click", toggleOpen);
    bk.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleOpen(); } });
    if (peek) peek.addEventListener("click", toggleOpen);
    /* sway: alive while it plays, still when paused */
    (function sway() {
      if (!document.body.contains(sheet)) return;
      var s2 = apState(), t = performance.now() / 1000, open = stage.classList.contains("is-open");
      var amp = s2 && s2.playing ? 1 : 0.35;
      var ry = open ? 0 : -24 + Math.sin(t * 0.7) * 9 * amp, rx = 6 + Math.sin(t * 0.55) * 2.5 * amp, y = Math.sin(t * 1.3) * 4 * amp;
      if (!reduce) bk.style.transform = "translateY(" + y.toFixed(2) + "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
      requestAnimationFrame(sway);
    })();
    /* the page shows where we are right now */
    if (st.type === "audio") paintLine(sheet, st.label || "", "CHAPTER " + (st.cur + 1) + " OF " + st.items);
    else if (line.text) paintLine(sheet, line.text, st.label);
    var pn = sheet.querySelector(".fp-pn"); if (pn) pn.textContent = b ? b.title : st.title;
    /* waveform under the time row, or under the parts strip for spoken books */
    var seek = sheet.querySelector(".ap-seekrow"), part = sheet.querySelector(".ap-part");
    var wave = el("div", "fp-wave", waveHtml(st.key));
    if (seek) { seek.classList.add("fp-seek"); seek.insertBefore(wave, seek.querySelector(".ap-seek")); }
    else if (part) part.parentNode.insertBefore(wave, part);
    if (st.type !== "audio" && line.total) paintWave(wave, (line.idx + 1) / line.total);
    if (seek) {
      var rng = seek.querySelector(".ap-seek");
      var syncW = function () { if (!document.body.contains(sheet)) return; if (rng) paintWave(wave, Number(rng.value) / 1000); setTimeout(syncW, 400); };
      syncW();
    }
    /* one row of pills: speed, sleep, chapters. The full lists stay below */
    var pills = el("div", "fp-pills");
    var spCur = speed();
    pills.innerHTML = '<button type="button" class="fp-pill" data-fp-sp><b>' + spCur + "\u00d7</b> speed</button>" +
      '<button type="button" class="fp-pill" data-fp-sl>' + IC.moon + "<span>Sleep</span></button>" +
      '<button type="button" class="fp-pill" data-fp-ch>' + IC.list + "<span>" + (st.type === "audio" ? "Chapters" : "Lessons") + "</span></button>";
    var ctl = card.querySelector(".ap-ctl");
    if (ctl) ctl.parentNode.insertBefore(pills, ctl.nextSibling);
    pills.addEventListener("click", function (e) {
      var sp = e.target.closest("[data-fp-sp]"), sl = e.target.closest("[data-fp-sl]"), ch = e.target.closest("[data-fp-ch]");
      if (sp) {
        var chips = $$(".ap-sp", card); if (!chips.length) return;
        var i = 0; chips.forEach(function (x, k) { if (x.classList.contains("on")) i = k; });
        var nx = chips[(i + 1) % chips.length]; nx.click();
        setTimeout(function () { sp.innerHTML = "<b>" + speed() + "\u00d7</b> speed"; sp.classList.toggle("is-on", speed() !== 1); }, 30);
      }
      if (sl) {
        var pop = card.querySelector(".fp-slpop");
        if (pop) { pop.remove(); return; }
        pop = el("div", "fp-slpop");
        $$(".ap-sl", card).forEach(function (x) { var bt = el("button", "fp-slpop__it", x.getAttribute("data-sl") === "0" ? "Off" : x.getAttribute("data-sl") + " minutes"); bt.type = "button"; bt.addEventListener("click", function () { x.click(); pop.remove(); sl.classList.toggle("is-on", x.getAttribute("data-sl") !== "0"); sl.querySelector("span").textContent = x.getAttribute("data-sl") === "0" ? "Sleep" : x.getAttribute("data-sl") + " min"; }); pop.appendChild(bt); });
        pills.appendChild(pop);
      }
      if (ch) { var qq = card.querySelector(".ap-q"); if (qq) { var lab = qq.previousElementSibling || qq; lab.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); } }
    });
    /* v331: the words themselves, and the book at a glance */
    var extra = followHtml(st, b);
    if (extra) { var fx = el("div", "fp-x", extra); pills.parentNode.insertBefore(fx, pills.nextSibling); paintFollow(sheet, line.idx); }
    /* the long lists fold into one calm section */
    var labs = $$(".ap-lab", card);
    if (labs.length) {
      var more = el("div", "fp-more-h", "<span>Listening options</span>");
      card.insertBefore(more, labs[0]);
    }
    /* entrance: the book rises from the mini player */
    anim(stage, [{ opacity: 0, transform: "translateY(40px) scale(.7)" }, { opacity: 1, transform: "none" }], { duration: 620, easing: "cubic-bezier(.2,.9,.2,1)" });
    anim(card, [{ transform: "translateY(60px)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 480, easing: "cubic-bezier(.2,.9,.2,1)" });
  }
  function initPlayer() {
    window.addEventListener("tsb:ap-line", onLine);
    try {
      var mo = new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          [].forEach.call(m.addedNodes, function (n) {
            if (n.id === "tsbApSheet") setTimeout(function () { enhanceSheet(n); }, 0);
            if (n.id === "tsbAp") n.classList.add("fp-dock");
          });
        });
      });
      mo.observe(document.body, { childList: true });
    } catch (e) {}
    var d = document.getElementById("tsbAp"); if (d) d.classList.add("fp-dock");
  }

  /* ==========================================================================
     4 · THE LISTEN ROOM: continue, in Hindi, spoken by the app, little ears
     ========================================================================== */
  function listenRoom() {
    if (page !== "podcasts.html") return;
    var hero = $(".pc-hero"); if (!hero || $("#fpRoom")) return;
    var AB = window.TSB_AUDIOBOOKS || {}, room = el("section", "fr");
    room.id = "fpRoom";
    var html = "";
    var cc = null; try { cc = window.TSB_AUDIO && TSB_AUDIO.continueCard ? TSB_AUDIO.continueCard() : null; } catch (e) {}
    if (cc) {
      var cb = cc.bookId ? byId(cc.bookId) : (/^ab:/.test(cc.key || "") ? byId(cc.key.slice(3)) : null);
      html += '<button type="button" class="fr-cont f-up" style="--d:.1" data-fr-resume>' + (cb ? '<span class="fr-cv"><img src="' + esc(cover(cb)) + '" alt=""></span>' : '<span class="fr-cv fr-cv--g">' + IC.ear + "</span>") +
        '<span class="fr-cont__m"><small>CONTINUE LISTENING</small><b>' + esc(cc.title || "") + "</b><span>" + esc(cc.itemLabel || "") + '</span></span><span class="fr-play">' + IC.play + "</span></button>";
    }
    var hi = Object.keys(AB).filter(function (k) { return AB[k].lang === "hi"; });
    if (hi.length) {
      html += '<div class="fr-sec f-up" style="--d:.2"><h2>In <i translate="no">हिन्दी</i></h2><span>Full audiobooks</span></div><div class="fr-row">' +
        hi.slice(0, 8).map(function (k) { var r = AB[k], b = byId(k); return '<button type="button" class="fr-bk" data-fr-ab="' + esc(k) + '"><span class="fr-cv2">' + (b || r.art || r.discovered ? '<img src="' + esc(b ? cover(b) : (window.TSB_ABART ? TSB_ABART(k, r, null) : r.art)) + '" alt="" loading="lazy">' : '<span class="fr-dev" translate="no">' + esc(r.dev || r.title) + "</span>") + '</span><b translate="no">' + esc(r.dev || r.title) + "</b><span>" + IC.ear + " " + esc(r.author || "") + "</span></button>"; }).join("") + "</div>";
    }
    /* books the app reads aloud: what you picked first */
    var cats = lsGet("tsb_interests", []); cats = Array.isArray(cats) ? cats : [];
    var pool = books().filter(function (b) { return b.lessons && b.lessons.length && (!cats.length || cats.indexOf(b.category) >= 0); });
    var s = seed(dayKey() + "listen"), spoken = [];
    for (var i = 0; i < pool.length && spoken.length < 8; i++) { var bb = pool[(i * 11 + s) % pool.length]; if (spoken.indexOf(bb) < 0) spoken.push(bb); }
    if (spoken.length) {
      html += '<div class="fr-sec f-up" style="--d:.3"><h2>Spoken <i>for you</i></h2><span>Every lesson, read aloud</span></div><div class="fr-row">' +
        spoken.map(function (b) { var m = parseInt(b.readTime, 10) || 10; return '<button type="button" class="fr-bk" data-fr-book="' + esc(b.id) + '"><span class="fr-cv2"><img src="' + esc(cover(b)) + '" alt="" loading="lazy"></span><b>' + esc(b.title) + "</b><span>" + IC.ear + " " + (m + 3) + " min</span></button>"; }).join("") + "</div>";
    }
    /* v334: Story time lives only in You */
    room.innerHTML = html;
    hero.parentNode.insertBefore(room, hero.nextSibling);
    room.addEventListener("click", function (e) {
      var A = window.TSB_AUDIO; if (!A) return;
      if (e.target.closest("[data-fr-resume]")) { A.resume(); return; }
      var ab = e.target.closest("[data-fr-ab]"); if (ab) { A.playAudiobook(ab.getAttribute("data-fr-ab")); return; }
      var bk = e.target.closest("[data-fr-book]"); if (bk) { A.playBook(bk.getAttribute("data-fr-book"), 0); }
    });
  }

  /* ==========================================================================
     5 · SHARE: a quote card in three styles, a link that opens the book
     ========================================================================== */
  var STY = [{ k: "sun", bg: "#FFC800", fg: "#16130F", mu: "rgba(22,19,15,.62)" }, { k: "paper", bg: "#FFFDF8", fg: "#16130F", mu: "#857C6E" }, { k: "night", bg: "#15120E", fg: "#F3EBDD", mu: "#A39A8A" }];
  function bookUrl(id) { return "https://thesmallbook.in/book.html?id=" + encodeURIComponent(id); }
  function toast(msg) {
    var t = el("div", "f-toast", '<span class="f-toast__ic">' + IC.check + "</span>" + esc(msg));
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("on"); });
    setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 400); }, 2200);
  }
  function wrapLines(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines;
  }
  function renderCard(o, sty, cb) {
    var W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d");
    x.fillStyle = sty.bg; x.fillRect(0, 0, W, H);
    var pad = 110;
    x.fillStyle = sty.mu; x.font = "700 30px 'Space Grotesk', system-ui, sans-serif";
    try { x.letterSpacing = "5px"; } catch (e) {}
    x.fillText(((o.title || "") + " \u00b7 " + (o.author || "")).toUpperCase().slice(0, 52), pad, pad + 20);
    try { x.letterSpacing = "0px"; } catch (e) {}
    var q = "\u201c" + (o.quote || "") + "\u201d", size = 74;
    var lines;
    do { x.font = "500 " + size + "px Newsreader, Georgia, serif"; lines = wrapLines(x, q, W - pad * 2); size -= 4; } while (lines.length * size * 1.42 > H - 520 && size > 40);
    x.fillStyle = sty.fg;
    var lh = (size + 4) * 1.42, y0 = 300;
    lines.forEach(function (l, i) { x.fillText(l, pad, y0 + i * lh); });
    x.font = "900 40px 'Archivo Black', 'Arial Black', sans-serif"; x.fillStyle = sty.fg;
    x.fillText("THE", pad, H - pad); var w1 = x.measureText("THE").width;
    x.fillStyle = "#D23A3A"; x.fillText("SMALL", pad + w1, H - pad); var w2 = x.measureText("SMALL").width;
    x.fillStyle = sty.fg; x.fillText("BOOK", pad + w1 + w2, H - pad);
    x.font = "600 30px 'Space Grotesk', system-ui, sans-serif"; x.fillStyle = sty.mu; x.textAlign = "right";
    x.fillText("thesmallbook.in", W - pad, H - pad);
    try { cv.toBlob(function (bl) { cb(bl, cv); }, "image/png"); } catch (e) { cb(null, cv); }
  }
  /* v331: the share row people expect: WhatsApp, Instagram, copy, save, more */
  var SH = {
    wa: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#fff" d="M12 2.2A9.7 9.7 0 0 0 3.7 16.9L2.4 21.6l4.8-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.5z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="#fff" stroke="none"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'
  };
  function openShare(o) {
    if (!o || !o.quote) return;
    var old = $(".fs"); if (old) old.remove();
    var si = 0;
    var wrap = el("div", "fs", '<div class="fs-scrim" data-fs-x></div><div class="fs-sheet" role="dialog" aria-modal="true" aria-label="Share this idea">' +
      '<span class="fs-grip"></span><div class="fs-hd"><h2>Share this idea</h2><button type="button" class="fs-x" data-fs-x aria-label="Close">' + IC.x + "</button></div>" +
      '<div class="fs-card" data-sty="0"><div class="fs-card__k">' + esc((o.title || "") + " \u00b7 " + (o.author || "")) + '</div><div class="fs-card__q">\u201c' + esc(o.quote) + '\u201d</div><div class="fs-card__f"><span class="fs-logo">THE<b>SMALL</b>BOOK</span><span>thesmallbook.in</span></div></div>' +
      '<div class="fs-dots">' + STY.map(function (s, i) { return '<button type="button" class="fs-dot' + (i === 0 ? " on" : "") + '" data-fs-s="' + i + '" style="background:' + s.bg + '" aria-label="' + s.k + ' style"></button>'; }).join("") + "</div>" +
      '<div class="fs-acts fs-acts--5">' +
      '<button type="button" class="fs-act fs-act--wa" data-fs-a="wa"><span>' + SH.wa + "</span>WhatsApp</button>" +
      '<button type="button" class="fs-act fs-act--ig" data-fs-a="ig"><span>' + SH.ig + "</span>Instagram</button>" +
      '<button type="button" class="fs-act fs-act--y" data-fs-a="link"><span>' + IC.link + "</span>Copy link</button>" +
      '<button type="button" class="fs-act" data-fs-a="save"><span>' + IC.save + "</span>Save</button>" +
      '<button type="button" class="fs-act" data-fs-a="send"><span>' + SH.more + "</span>More</button></div></div>");
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add("is-in"); });
    var card = wrap.querySelector(".fs-card");
    function close() { wrap.classList.remove("is-in"); wrap.classList.add("is-out"); setTimeout(function () { wrap.remove(); }, 380); }
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-fs-x]")) { close(); return; }
      var d = e.target.closest("[data-fs-s]");
      if (d) {
        si = Number(d.getAttribute("data-fs-s")); card.setAttribute("data-sty", si);
        $$(".fs-dot", wrap).forEach(function (x) { x.classList.toggle("on", x === d); });
        anim(card, [{ transform: "scale(.95)" }, { transform: "scale(1.02)" }, { transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.9,.2,1)" });
        return;
      }
      var a = e.target.closest("[data-fs-a]"); if (!a) return;
      var kind = a.getAttribute("data-fs-a"), url = bookUrl(o.id || "");
      anim(a.firstChild, [{ transform: "scale(.88)" }, { transform: "none" }], { duration: 260 });
      if (kind === "link") {
        var txt = "\u201c" + o.quote + "\u201d " + url;
        try { navigator.clipboard.writeText(txt).then(function () { toast("Link copied"); }, function () { toast("Link ready: " + url); }); } catch (e2) { toast("Link ready: " + url); }
        return;
      }
      if (kind === "wa") {
        var wt = "\u201c" + o.quote + "\u201d\n" + (o.title ? o.title + (o.author ? ", " + o.author : "") + "\n" : "") + url;
        try { window.open("https://wa.me/?text=" + encodeURIComponent(wt), "_blank", "noopener"); } catch (e6) { location.href = "https://wa.me/?text=" + encodeURIComponent(wt); }
        return;
      }
      if (kind === "send") {
        if (navigator.share) { navigator.share({ title: o.title, text: "\u201c" + o.quote + "\u201d", url: url }).catch(function () {}); }
        else { try { navigator.clipboard.writeText("\u201c" + o.quote + "\u201d " + url); } catch (e3) {} toast("Copied, paste it in any chat"); }
        return;
      }
      renderCard(o, STY[si], function (blob, cv) {
        var fname = (o.id || "thesmallbook") + "-quote.png";
        if ((kind === "story" || kind === "ig") && blob && navigator.canShare) {
          try {
            var f = new File([blob], fname, { type: "image/png" });
            if (navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: o.title, text: url }).catch(function () {}); return; }
          } catch (e4) {}
        }
        try {
          var aa = document.createElement("a"); aa.download = fname;
          aa.href = blob ? URL.createObjectURL(blob) : cv.toDataURL("image/png");
          document.body.appendChild(aa); aa.click(); aa.remove();
          toast(kind === "save" ? "Saved to your downloads" : "Card saved. Open Instagram and add it to your story");
          if (kind === "ig" && /android|iphone|ipad/i.test(navigator.userAgent || "")) setTimeout(function () { try { location.href = "instagram://story-camera"; } catch (e7) {} }, 900);
        } catch (e5) { toast("Could not save the card"); }
      });
    });
  }
  window.TSB_SHARE_CARD = openShare;
  function bookShare() {
    if (page !== "book.html") return;
    document.addEventListener("click", function (e) {
      var b = e.target.closest("#shareBtn");
      if (!b) return;
      var id = new URLSearchParams(location.search).get("id"), bk = byId(id);
      if (!bk) return;
      e.preventDefault(); e.stopImmediatePropagation();
      openShare({ id: bk.id, title: bk.title, author: bk.author, quote: bk.oneLiner || bk.tagline || bk.title });
    }, true);
  }

  /* ---------- 7 · the reader, like the film ----------
     A quiet top bar (close, page segments, language, Aa), pages that settle
     in line by line, a long-press toolbar (Highlight, Copy, Share, Explain),
     a floating dock (Listen to this page, Next) and "Share this idea". */
  var LSHORT = { en: "EN", hi: "\u0939\u093f", "hi-Latn": "Hing", gu: "\u0a97\u0ac1", mr: "\u092e\u0930\u093e", ta: "\u0ba4", bn: "\u09ac\u09be", te: "\u0c24\u0c46", kn: "\u0c95", ur: "\u0627\u064f", pa: "\u0a2a\u0a70", ml: "\u0d2e" };
  var RIC = {
    globe: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.6 5.6 3.6 9s-1 6.4-3.6 9c-2.6-2.6-3.6-5.6-3.6-9s1-6.4 3.6-9z"/></svg>',
    pen: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    spark: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>'
  };
  function readerRoom() {
    if (page !== "reader.html") return;
    var art = $("#rmArticle"); if (!art) return;
    var id = new URLSearchParams(location.search).get("id"), bk = byId(id);
    if (!bk) return;
    root.classList.add("frd-on");
    var sel = $("#rmContentsSelect");
    var total = sel ? sel.options.length : 1; if (!total) total = 1;
    function cur() { return sel ? (parseInt(sel.value, 10) || 0) : 0; }
    function scrollMode() { try { return (localStorage.getItem("tsb_rm_mode") || "pages") === "scroll"; } catch (e) { return false; } }
    function isRead() { var l = lsGet("tsb_read_books", []); return !!(l && l.indexOf && l.indexOf(bk.id) !== -1); }

    /* top bar */
    var back = $("#rmBack");
    if (back) { back.innerHTML = IC.x; back.setAttribute("aria-label", "Close the reader"); back.href = "book.html?id=" + encodeURIComponent(bk.id); }
    var nSeg = Math.min(total, 12), segs = el("div", "frd-segs");
    segs.setAttribute("aria-hidden", "true");
    for (var i = 0; i < nSeg; i++) segs.appendChild(el("i", "", "<b></b>"));
    var tbox = $(".rm-header-title"); if (tbox) tbox.appendChild(segs);
    var lb = $("#rmLanguage");
    function paintLang() {
      if (!lb) return;
      var c = lsGet("tsb_lang", "en") || "en", s = LSHORT[c] || String(c).slice(0, 2).toUpperCase();
      if (lb.querySelector("svg") && lb.getAttribute("data-fl") === s) return;
      lb.setAttribute("data-fl", s);
      lb.innerHTML = RIC.globe + '<span translate="no">' + esc(s) + "</span>";
    }
    paintLang();
    window.addEventListener("tsb:lang", function () { if (lb) lb.removeAttribute("data-fl"); paintLang(); });
    if (lb && window.MutationObserver) new MutationObserver(function () { if (!lb.querySelector("svg")) paintLang(); }).observe(lb, { childList: true, characterData: true, subtree: true });
    var lt = $(".rm-lang-title"); if (lt) { lt.innerHTML = '<small>TRANSLATE</small>Read this book in'; }
    var ls = $(".rm-lang-sub"); if (ls) ls.textContent = "It loads quietly in the background, then the page changes over. Audio and highlights follow your language.";
    var tt = $(".rm-tools-title"); if (tt) tt.textContent = "Text, theme and contents";
    var tc = $("#rmToolsClose"); if (tc) tc.innerHTML = IC.x;
    var tb = $("#rmTools"); if (tb) { tb.innerHTML = '<span class="frd-aa">Aa</span>'; tb.setAttribute("aria-label", "Text size, theme and contents"); }

    /* the dock */
    var dock = el("div", "frd-dock");
    dock.setAttribute("translate", "no");
    dock.innerHTML = '<button type="button" class="frd-prev" aria-label="Previous page">' + IC.back + "</button>" +
      '<button type="button" class="frd-listen"><span class="frd-listen__ic">' + IC.play + '</span><span class="frd-listen__t">Listen<span class="frd-l2"> to this page</span></span></button>' +
      '<button type="button" class="frd-next"><span class="frd-next__t">Next</span><span class="frd-next__ic">' + IC.arrow + "</span></button>";
    document.body.appendChild(dock);
    var bPrev = $(".frd-prev", dock), bListen = $(".frd-listen", dock), bNext = $(".frd-next", dock);
    function docKey() { return "rd:" + bk.id + ":" + (scrollMode() ? "all" : cur()); }
    function paintListen() {
      var st = (window.TSB_AUDIO && TSB_AUDIO.state) ? TSB_AUDIO.state() : null, on = !!(st && st.key === docKey() && st.playing);
      bListen.classList.toggle("is-on", on);
      $(".frd-listen__ic", bListen).innerHTML = on ? RIC.pause : IC.play;
      $(".frd-listen__t", bListen).innerHTML = on ? "Listening\u2026" : 'Listen<span class="frd-l2"> to this page</span>';
    }
    function paintDock() {
      var c = cur(), last = c >= total - 1, sm = scrollMode();
      var a = Math.floor(c * nSeg / total);
      $$("i", segs).forEach(function (s, k) { s.className = k < a ? "done" : (k === a ? "now" : ""); });
      bPrev.classList.toggle("is-hide", sm || c === 0);
      dock.classList.toggle("has-prev", !(sm || c === 0));
      var t = $(".frd-next__t", bNext);
      if (sm || last) { t.textContent = isRead() ? "Done" : "Finish"; bNext.classList.add("is-fin"); }
      else { t.textContent = "Next"; bNext.classList.remove("is-fin"); }
      paintListen();
    }
    bPrev.addEventListener("click", function () { var p = $("#rmPrev"); if (p) p.click(); });
    bNext.addEventListener("click", function () {
      var c = cur();
      if (!scrollMode() && c < total - 1) { var n = $("#rmNext"); if (n) n.click(); return; }
      if (!isRead()) { var r = $("#rmRead"); if (r) r.click(); finishCard(); paintDock(); return; }
      location.href = "book.html?id=" + encodeURIComponent(bk.id);
    });
    bListen.addEventListener("click", function () {
      if (!window.TSB_AUDIO) return;
      var st = TSB_AUDIO.state ? TSB_AUDIO.state() : null;
      if (st && st.key === docKey()) { TSB_AUDIO.toggle(); setTimeout(paintListen, 120); return; }
      var cl = art.cloneNode(true);
      $$(".rm-meta, h2, .frd-share, .frd-fin, script, style", cl).forEach(function (n) { n.remove(); });
      var h = $("h2", art), txt = (cl.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt) return;
      TSB_AUDIO.playDoc(docKey(), bk.title, (scrollMode() ? "The whole book" : "Page " + (cur() + 1) + " of " + total), [{ label: h ? h.textContent : bk.title, text: txt.slice(0, 2900) }], { art: bk.cover || "", bookId: bk.id });
      setTimeout(paintListen, 300);
    });
    window.addEventListener("tsb:ap-line", function () { paintListen(); });

    /* a page settles in, line by line, and ends with "Share this idea" */
    function firstIdea() {
      var ps = $$("p, li, blockquote", art).filter(function (p) { return !p.closest(".rm-meta, .frd-share, .frd-fin"); });
      var t = ps.length ? ps[0].textContent : (bk.oneLiner || bk.tagline || "");
      t = String(t).replace(/\s+/g, " ").trim();
      var m = t.match(/^.{40,220}?[.!?](\s|$)/);
      return m ? m[0].trim() : (t.length > 220 ? t.slice(0, 217).replace(/\s+\S*$/, "") + "\u2026" : t);
    }
    function decorate() {
      if (art.getAttribute("data-frd") === String(cur()) + (scrollMode() ? "s" : "") && (scrollMode() || $(".frd-share", art))) return;
      art.setAttribute("data-frd", String(cur()) + (scrollMode() ? "s" : ""));
      var kids = [].slice.call(art.children);
      if (window.__bkxRelease) requestAnimationFrame(function () { requestAnimationFrame(window.__bkxRelease); });
      /* v334: arriving from the opening book, the page is already on screen: no fade in */
      if (!reduce && !document.documentElement.classList.contains("bkx-in")) kids.slice(0, 14).forEach(function (k, n) { k.style.animation = "none"; void k.offsetWidth; k.style.animation = "frdIn .62s cubic-bezier(.2,.8,.2,1) " + (n * 0.07).toFixed(2) + "s backwards"; });
      if (!scrollMode()) {
        var sb = el("button", "frd-share", RIC.share + "<span>Share this idea</span>");
        sb.type = "button";
        sb.addEventListener("click", function () { openShare({ id: bk.id, title: bk.title, author: bk.author, quote: firstIdea() }); });
        art.appendChild(sb);
      }
      paintHl();
      paintDock();
    }
    function finishCard() {
      if ($(".frd-fin", art)) return;
      var s = 0; try { s = (window.TSB && TSB.streak && TSB.streak.count) ? TSB.streak.count() : 0; } catch (e) {}
      var card = el("div", "frd-fin", '<span class="frd-fin__ring">' + IC.flame + '</span><span><b>Book finished.</b><i>' + (s > 1 ? s + " day streak" : "Your first of many") + "</i></span>");
      var sb = $(".frd-share", art); art.insertBefore(card, sb || null);
      try { card.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
    }
    if (window.MutationObserver) new MutationObserver(function () { setTimeout(decorate, 0); }).observe(art, { childList: true });
    if (sel) sel.addEventListener("change", function () { setTimeout(paintDock, 30); });
    setTimeout(decorate, 0);

    /* highlights: saved per book, painted back on each page */
    var HK = "tsb_hl_" + bk.id;
    function paintHl() {
      var list = lsGet(HK, []); if (!list || !list.length) return;
      list.forEach(function (h) {
        if (!h || !h.t || (h.p != null && h.p !== cur() && !scrollMode())) return;
        var w = document.createTreeWalker(art, NodeFilter.SHOW_TEXT, null, false), nd;
        while ((nd = w.nextNode())) {
          if (nd.parentNode && nd.parentNode.closest && nd.parentNode.closest("mark.frd-hl, .frd-share, .frd-fin")) continue;
          var ix = nd.nodeValue.indexOf(h.t);
          if (ix === -1) continue;
          var r = document.createRange(); r.setStart(nd, ix); r.setEnd(nd, ix + h.t.length);
          var m = el("mark", "frd-hl"); try { r.surroundContents(m); } catch (e) {}
          break;
        }
      });
    }

    /* the long-press toolbar */
    var tool = el("div", "frd-tool");
    tool.setAttribute("role", "toolbar"); tool.setAttribute("translate", "no");
    tool.innerHTML = '<button type="button" data-a="hl">' + RIC.pen + "<span>Highlight</span></button>" +
      '<button type="button" data-a="copy">' + RIC.copy + "<span>Copy</span></button>" +
      '<button type="button" data-a="share">' + RIC.share + "<span>Share</span></button>" +
      '<button type="button" data-a="ex">' + RIC.spark + "<span>Explain</span></button>";
    document.body.appendChild(tool);
    var selText = "", selRange = null, tSel = 0;
    function hideTool() { tool.classList.remove("on"); }
    function placeTool() {
      var s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount) { hideTool(); return; }
      var r = s.getRangeAt(0);
      if (!art.contains(r.commonAncestorContainer)) { hideTool(); return; }
      var t = s.toString().replace(/\s+/g, " ").trim();
      if (t.length < 3) { hideTool(); return; }
      selText = t; selRange = r.cloneRange();
      var b = r.getBoundingClientRect(), w = tool.offsetWidth || 320, touch = "ontouchstart" in window;
      var x = Math.max(10, Math.min(window.innerWidth - w - 10, b.left + b.width / 2 - w / 2));
      var y = touch ? b.bottom + 16 : b.top - 58;
      if (y < 70) y = b.bottom + 16;
      if (y > window.innerHeight - 140) y = Math.max(70, b.top - 58);
      tool.style.left = Math.round(x) + "px"; tool.style.top = Math.round(y) + "px";
      tool.classList.add("on");
    }
    document.addEventListener("selectionchange", function () { clearTimeout(tSel); tSel = setTimeout(placeTool, 200); });
    window.addEventListener("scroll", function () { if (tool.classList.contains("on")) placeTool(); }, { passive: true });
    tool.addEventListener("pointerdown", function (e) { e.preventDefault(); });
    tool.addEventListener("mousedown", function (e) { e.preventDefault(); });
    tool.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a]"); if (!b || !selText) return;
      var a = b.getAttribute("data-a"), t = selText;
      if (a === "hl") {
        try {
          var m = el("mark", "frd-hl");
          try { selRange.surroundContents(m); } catch (e1) { m.appendChild(selRange.extractContents()); selRange.insertNode(m); }
          anim(m, [{ backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
          var list = lsGet(HK, []); if (!list || !list.push) list = [];
          list.push({ t: t.slice(0, 400), p: scrollMode() ? null : cur(), d: dayKey() }); if (list.length > 300) list = list.slice(-300);
          lsSet(HK, list);
          toast("Highlighted. It stays on this page.");
        } catch (e2) { toast("Could not highlight that line"); }
      } else if (a === "copy") {
        var full = "\u201c" + t + "\u201d " + bk.title + ", " + bk.author;
        try { navigator.clipboard.writeText(full).then(function () { toast("Copied"); }, function () { toast("Copied"); }); } catch (e3) { toast("Copied"); }
      } else if (a === "share") {
        openShare({ id: bk.id, title: bk.title, author: bk.author, quote: t.length > 260 ? t.slice(0, 257).replace(/\s+\S*$/, "") + "\u2026" : t });
      } else if (a === "ex") {
        location.href = "chat.html?arg=" + encodeURIComponent("Explain this line from " + bk.title + " in simple words, with one example from daily life: \u201c" + t.slice(0, 300) + "\u201d");
        return;
      }
      try { window.getSelection().removeAllRanges(); } catch (e4) {}
      hideTool();
    });
  }

  /* ---------- 8 · Settings, the professional cut ----------
     Four calm groups (you, reading, your days, help) and one folded
     "More settings". Every original control is moved, not copied, so all
     of its wiring keeps working. Cut from view: action bar colour, upload test, and the duplicate reader text size (the
     reader's own Aa sheet does that now). */
  var SIC = {
    sun: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    text: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V5h16v2M9 19h6M12 5v14"/></svg>',
    font: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19l6-14 6 14M6.5 13h7M17 19h4"/></svg>',
    globe: RIC.globe,
    q: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
    card: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 10h6M7 14h10"/></svg>',
    tune: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    year: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/></svg>',
    help: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5h.01"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></svg>',
    law: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>',
    size: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
    grid: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    dl: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    crown: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>'
  };
  function settingsRoom() {
    if (page !== "settings.html") return;
    var main = $("main.set"); if (!main || main.getAttribute("data-fs2")) return;
    main.setAttribute("data-fs2", "1");
    root.classList.add("fs2-on");
    var old = el("div", "fs2-old"); old.hidden = true;
    while (main.firstChild) old.appendChild(main.firstChild);
    main.appendChild(old);
    function take(sel) { var n = typeof sel === "string" ? old.querySelector(sel) : sel; return n || null; }
    function card(fromSel) { var n = take(fromSel); return n ? n.closest(".setcard") : null; }
    function row(ic, title, sub, ctl, opts) {
      opts = opts || {};
      var r = el(opts.href ? "a" : (opts.btn ? "button" : "div"), "fs2-row" + (ctl ? " fs2-row--ctl" : "") + (opts.cls ? " " + opts.cls : ""));
      if (opts.href) r.href = opts.href;
      if (opts.btn) r.type = "button";
      r.innerHTML = '<span class="fs2-ic">' + ic + '</span><span class="fs2-t"><b>' + esc(title) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span>" + (opts.value != null ? '<span class="fs2-val">' + esc(opts.value) + "</span>" : "") + (opts.href || opts.btn ? '<span class="fs2-chev">' + IC.arrow + "</span>" : "");
      if (ctl) { var w = el("div", "fs2-ctl"); w.appendChild(ctl); r.appendChild(w); }
      if (opts.click) r.addEventListener("click", opts.click);
      return r;
    }
    function group(title, rows) {
      var f = document.createDocumentFragment();
      if (title) f.appendChild(el("h2", "fs2-h", esc(title)));
      var g = el("div", "fs2-g f-up");
      rows.forEach(function (r) { if (r) g.appendChild(r); });
      f.appendChild(g);
      return f;
    }
    function toggleRow(ic, title, sub, rowSel, onVal, attr) {
      var src = take(rowSel); if (!src) return null;
      var sw = el("button", "fs2-sw"); sw.type = "button"; sw.setAttribute("role", "switch");
      function isOn() { var b = src.querySelector('[data-' + attr + '="' + onVal + '"]'); return !!(b && b.classList.contains("on")); }
      function paint() { var on = isOn(); sw.classList.toggle("on", on); sw.setAttribute("aria-checked", on ? "true" : "false"); }
      sw.addEventListener("click", function () { var want = isOn() ? "off" : onVal; var b = src.querySelector('[data-' + attr + '="' + want + '"]'); if (b) b.click(); setTimeout(paint, 40); });
      paint(); setTimeout(paint, 300);
      var r = row(ic, title, sub, null, { cls: "fs2-row--sw" }); r.appendChild(sw);
      return r;
    }
    /* v335: Story time for kids. Off asks first in a small sheet, then it is hidden everywhere. */
    function kidsRow() {
      function on() { try { return localStorage.getItem("tsb_kids_show") !== "0"; } catch (e) { return true; } }
      var sw = el("button", "fs2-sw"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-label", "Story time for kids");
      function paint() { var v = on(); sw.classList.toggle("on", v); sw.setAttribute("aria-checked", v ? "true" : "false"); }
      function set(v) {
        try { localStorage.setItem("tsb_kids_show", v ? "1" : "0"); } catch (e) {}
        var hb = document.querySelector('#kidsRow [data-kids-show="' + (v ? "1" : "0") + '"]'); if (hb) hb.click();
        paint();
      }
      function ask() {
        var pop = el("div", "fy-pop");
        pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "true"); pop.setAttribute("aria-label", "Hide Story time");
        pop.innerHTML = '<i class="fy-pop__scrim" data-k-x></i><div class="fy-pop__card"><div class="fy-pop__grab"></div>' +
          '<div class="fy-pop__art" aria-hidden="true"><i class="fy-kids__sun"></i><span>\ud83d\udc12</span><span>\ud83e\udd81</span><span>\ud83d\udc22</span></div>' +
          '<h3>Hide Story time?</h3><p>Kids mode will not show anywhere in the app. You can turn it back on here any time.</p>' +
          '<button type="button" class="fy-pop__go" data-k-hide style="width:100%;border:0;cursor:pointer">Hide Story time</button>' +
          '<button type="button" class="fy-pop__x" data-k-x>Keep it</button></div>';
        document.body.appendChild(pop);
        requestAnimationFrame(function () { requestAnimationFrame(function () { pop.classList.add("on"); }); });
        function close() { pop.classList.remove("on"); document.removeEventListener("keydown", esc2); setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 380); }
        function esc2(e) { if (e.key === "Escape") close(); }
        document.addEventListener("keydown", esc2);
        pop.addEventListener("click", function (e) {
          if (e.target.closest("[data-k-hide]")) { set(false); close(); return; }
          if (e.target.closest("[data-k-x]")) close();
        });
        var go = pop.querySelector("[data-k-hide]"); if (go) setTimeout(function () { try { go.focus(); } catch (e) {} }, 60);
      }
      sw.addEventListener("click", function () { if (on()) ask(); else set(true); });
      paint();
      var r = row(SIC.play, "Story time for kids", "Picture stories, only in You", null, { cls: "fs2-row--sw fs2-row--kids" });
      r.appendChild(sw);
      return r;
    }
    var nm = name();
    var langName = "English";
    try { var lc = window.TSB_LANG && TSB_LANG.get ? TSB_LANG.get() : "en"; (window.TSB_LANG && TSB_LANG.list || []).forEach(function (l) { if (l.code === lc) langName = l.special ? l.name : (l.native || l.name); }); } catch (e) {}

    var wrap = el("div", "fs2");
    wrap.appendChild(el("header", "fs2-hd f-up", '<a class="fs2-back" href="you.html" aria-label="Back to You">' + IC.back + '</a><div><span class="fs2-kick">SETTINGS</span><h1>Make it <i>yours.</i></h1></div>'));
    /* you */
    var prof = el("section", "fs2-prof f-up", '<span class="fs2-av">' + esc((nm || "R").charAt(0).toUpperCase()) + '</span><div class="fs2-pm"><label class="fs2-lab" for="displayNameInput">Your name</label><div class="fs2-namerow"></div></div>');
    var ni = take("#displayNameInput"), sn = take("#saveName");
    if (ni) { ni.placeholder = "What should we call you?"; $(".fs2-namerow", prof).appendChild(ni); }
    if (sn) $(".fs2-namerow", prof).appendChild(sn);
    var acc = take("#setAcc"); if (acc) { acc.classList.add("fs2-acc"); prof.appendChild(acc); }
    wrap.appendChild(prof);
    /* reading */
    var trow = take("#themeRow"), frow = take("#fontRow"), fsrow = take("#fontstyleRow");
    [trow, frow, fsrow].forEach(function (r) { if (r) r.classList.add("fs2-seg"); });
    var lrow = row(SIC.globe, "Language", "Books, chat and audio", null, { btn: true, value: langName, click: function () { if (window.TSB_LANG && TSB_LANG.open) TSB_LANG.open(); } });
    var lg = take("#langGrid"); if (lg) { var lgc = lg.closest(".setcard"); if (lgc) lgc.classList.add("fs2-keep"); }
    wrap.appendChild(group("Reading", [
      trow ? row(SIC.sun, "Appearance", null, trow) : null,
      frow ? row(SIC.text, "Text size", null, frow) : null,
      fsrow ? row(SIC.font, "Font", null, fsrow) : null,
      lrow
    ]));
    /* v331 · the bar studio lives in its own group, fully visible */
    var bsc = take("#barCustomCard");
    if (bsc) {
      var bsh = bsc.querySelector("h2"); if (bsh) bsh.remove();
      bsc.classList.remove("setcard");
      var bsg = el("div", "fs2-g fs2-bs f-up"); bsg.appendChild(bsc);
      wrap.appendChild(el("h2", "fs2-h", "Action bar"));
      wrap.appendChild(bsg);
    }
    /* your days */
    var pb = take("[data-progbar]"), pt = take("[data-progtxt]"), prog = null;
    if (pb) { prog = el("div", "fs2-row fs2-row--prog"); prog.innerHTML = '<span class="fs2-ic">' + IC.flame + '</span><span class="fs2-t"><b>Your reading</b></span>'; var pw = el("div", "fs2-ctl"); pw.appendChild(pb); if (pt) pw.appendChild(pt); prog.appendChild(pw); }
    var yl = take("#tsbYearLink");
    var yrow = null;
    if (yl) { yrow = row(SIC.year, "Your year in books", null, null, { href: "review.html" }); yrow.id = "fs2Year"; yrow.hidden = yl.hidden; if (window.MutationObserver) new MutationObserver(function () { yrow.hidden = yl.hidden; }).observe(yl, { attributes: true, attributeFilter: ["hidden"] }); }
    wrap.appendChild(group("Your days", [
      prog,
      toggleRow(SIC.q, "Today's question", "A small prompt on Today, every morning", "#mpDailyRow", "on", "mpdaily"),
      toggleRow(SIC.card, "What's on your mind", "The card that finds a book for your mood", "#mpCardRow", "on", "mpcard"),
      kidsRow(),
      row(SIC.tune, "Re-tune my library", "Change interests, pace and style", null, { btn: true, click: function () { var b = $("#resetOnboard"); if (b) b.click(); } }),
      row(SIC.note, "Your notebook", null, null, { href: "notes.html" }),
      yrow
    ]));
    /* help */
    wrap.appendChild(group("Help", [
      row(SIC.help, "How everything works", "One line per feature", null, { href: "index.html#guide" }),
      row(SIC.play, "Replay the tour", null, null, { btn: true, click: function () { var b = $("#tsbWalkReplay"); if (b) b.click(); } }),
      row(SIC.law, "Legal and privacy", null, null, { href: "legal.html" }),
      row(SIC.info, "About TheSmallBook", null, null, { href: "about.html" })
    ]));
    /* more, folded */
    var more = el("details", "fs2-more f-up");
    more.innerHTML = "<summary><span>More settings</span>" + IC.down + "</summary>";
    var mg = el("div", "fs2-g");
    var ar = take("#appsizeRow"), lv = take("#libviewRow"), sr = take("#soundRow"), st = take("#soundTest"), inst = take("[data-installwrap]"), cc = take("#clearChat");
    if (sr) $$("button[data-sound]", sr).forEach(function (b) { var lab = { ding: "Ding", chime: "Chime", pop: "Pop", off: "Off" }[b.getAttribute("data-sound")]; if (lab) { $$("svg", b).forEach(function (v) { v.remove(); }); b.textContent = lab; } });
    [ar, lv, sr].forEach(function (r) { if (r) { r.classList.add("fs2-seg"); r.style.marginBottom = ""; } });
    if (ar) mg.appendChild(row(SIC.size, "App size", null, ar));
    if (lv) mg.appendChild(row(SIC.grid, "Library view", null, lv));
    if (sr) { var srow = row(SIC.bell, "Sound", null, sr); if (st) { st.className = "fs2-mini"; st.textContent = "Play a test sound"; srow.querySelector(".fs2-ctl").appendChild(st); } mg.appendChild(srow); }
    if (inst) { var ir = row(SIC.dl, "Install the app", "Full screen, works offline", null, { cls: "fs2-row--inst" }); inst.classList.add("fs2-instwrap"); ir.appendChild(inst); mg.appendChild(ir); }
    var fc = take("#founderCard");
    if (fc) { var fr2 = row(SIC.crown, "Founder preview", null, null, { cls: "fs2-row--founder" }); var fw2 = el("div", "fs2-ctl"); $$(".setrow, #founderState", fc).forEach(function (n) { fw2.appendChild(n); }); fr2.appendChild(fw2); fr2.hidden = fc.hidden; if (window.MutationObserver) new MutationObserver(function () { fr2.hidden = fc.hidden; }).observe(fc, { attributes: true, attributeFilter: ["hidden"] }); mg.appendChild(fr2); }
    if (cc) mg.appendChild(row(SIC.trash, "Clear chat history", "Books, streaks and shelf stay", null, { btn: true, cls: "fs2-row--danger", click: function () { cc.click(); } }));
    more.appendChild(mg);
    wrap.appendChild(more);
    var fine = take(".youfine"); if (fine) { fine.classList.add("fs2-fine"); wrap.appendChild(fine); }
    main.insertBefore(wrap, old);
  }

  /* ---------- 9 · About, redesigned ----------
     One calm page: a book that opens, the numbers, what is inside, how a
     lesson is made, the two people behind it, four promises, every release
     on a shelf (the full changelog one tap away), contact, terms. */
  function aboutRoom() {
    if (page !== "about.html" || $(".fab")) return;
    var B = books(), n = B.length || 520, L = 0, M = 0, langs = 26;
    B.forEach(function (b) { L += (b.lessons || []).length; M += parseInt(b.readTime, 10) || 10; });
    try { if (window.TSB_LANG && TSB_LANG.list) langs = TSB_LANG.list.length; } catch (e) {}
    var AB = window.TSB_AUDIOBOOKS || {}, nab = 0; for (var k in AB) if (AB.hasOwnProperty(k)) nab++;
    var AIC = {
      book: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/></svg>',
      ear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/></svg>',
      skull: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 20v-2M14 20v-2"/></svg>',
      chat: SIC.q, globe: RIC.globe, crown: SIC.crown,
      mail: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
      cam: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>',
      code: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>'
    };
    var oldBook = $("#faBook"), oldLog = $(".fa-log"), oldPlank = $(".fa-plank");
    var fab = el("div", "fab");
    var inside = [
      [AIC.book, "The library", n + " books, each cracked open into the few lessons that matter.", "index.html#library"],
      [AIC.ear, "Listen", "Every lesson read aloud" + (nab ? ", plus " + nab + " full audiobooks" : "") + ", even in Hindi.", "podcasts.html"],
      [AIC.globe, "Your language", "Read in " + langs + " languages, each in its own script.", "settings.html"],
      [AIC.chat, "Ask the books", "Ask a question, get an answer from the books, with the page it came from.", "chat.html"],
      [AIC.skull, "The Graveyard", "Real companies and empires that failed, and the one lesson each left.", "graveyard.html"],
      [AIC.crown, "Gold", "Deep dives, natural voices and the extras, \u20b999 a month.", "gold.html"]
    ];
    var steps = [["Read the whole book", "Cover to cover, with a pencil. No summaries of summaries."], ["Find the few ideas", "The handful of lessons the book is really about, in plain words."], ["Show it working", "One example from the book and one from life here, so it sticks."], ["Give you one thing to do", "Every lesson ends with a small action you can try today."]];
    var promises = [["Open to read", "Every book and every lesson. Gold only adds extras on top."], ["No ads, no trackers", "Your reading habits stay yours. Nothing is sold."], ["Your data, your device", "Shelf, streak and notes live on your phone. Sign in only to sync."], ["Respect the authors", "Original lessons that send you to the full book, not replace it."]];
    function person(img, initial, nm2, role, place, links) {
      return '<div class="fab-person"><span class="fab-av">' + (img ? '<img src="' + img + '" alt="" onerror="this.remove()">' : "") + "<b>" + initial + "</b></span>" +
        '<div class="fab-pm"><b>' + nm2 + "</b><span>" + role + "</span><small>" + place + "</small>" + (links ? '<div class="fab-links">' + links + "</div>" : "") + "</div></div>";
    }
    fab.innerHTML =
      '<header class="fab-top"><a class="fs2-back" href="you.html" aria-label="Back">' + IC.back + '</a><span class="fs2-kick">ABOUT</span></header>' +
      '<section class="fab-hero"><div class="fab-stage"></div><h1 class="fab-h1 f-up" style="--d:.3">Why this<br><i>exists.</i></h1>' +
      '<p class="fab-sub f-up" style="--d:.4">Most of us will never finish the books that could change us. Not because we are lazy, because life is full. So we made the small version: honest, warm, and in your language.</p></section>' +
      '<div class="fab-nums f-up" style="--d:.5">' + [[n, "books"], [L, "lessons"], [langs, "languages"], [Math.round(M / 60), "hours of reading"]].map(function (x) { return '<div><b data-to="' + x[0] + '">0</b><span>' + x[1] + "</span></div>"; }).join("") + "</div>" +
      '<h2 class="fab-sec">What is <i>inside</i></h2><div class="fab-grid">' + inside.map(function (x, i) { return '<a class="fab-tile fab-rv" style="--i:' + i + '" href="' + x[3] + '"><span class="fab-ic">' + x[0] + "</span><b>" + x[1] + "</b><span>" + x[2] + "</span></a>"; }).join("") + "</div>" +
      '<h2 class="fab-sec">How a lesson is <i>made</i></h2><ol class="fab-steps">' + steps.map(function (x, i) { return '<li class="fab-rv" style="--i:' + i + '"><span>' + (i + 1) + "</span><div><b>" + x[0] + "</b><p>" + x[1] + "</p></div></li>"; }).join("") + "</ol>" +
      '<h2 class="fab-sec">The <i>people</i></h2><div class="fab-people">' +
        '<div class="fa-maker fab-rv"><span class="fa-maker__ph"><img src="assets/jash-gandhi.jpg" alt="Jash Gandhi, founder of TheSmallBook" width="600" height="684" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'is-noimg\')"><em>J</em></span>' +
          '<div class="fa-maker__t"><small>FOUNDER AND BUILDER</small><b>Jash Gandhi</b><span>Reads, builds, ships. Mumbai, India.</span>' +
          '<a class="fa-maker__ig" href="https://instagram.com/jash._gandhi7" target="_blank" rel="noopener">@jash._gandhi7</a></div></div>' +
        person("", "N", "Nilay Shah", "Editor and book analyst", "The sharp eye behind every lesson", '<a href="mailto:nilay.shah1307@gmail.com">' + AIC.mail + "Email</a>") +
      "</div>" +
      '<h2 class="fab-sec">Four <i>promises</i></h2><div class="fab-prom">' + promises.map(function (x, i) { return '<div class="fab-rv" style="--i:' + i + '"><span>0' + (i + 1) + "</span><b>" + x[0] + "</b><p>" + x[1] + "</p></div>"; }).join("") + "</div>" +
      '<section class="rq-card rq-card--about fab-rv"><div><b>Missing a book?</b><span>Tell us which one. We add the most-asked first.</span></div><button type="button" data-request="">Request a book</button></section>' +
      '<h2 class="fab-sec">Every release, on the <i>shelf</i></h2><div class="fab-shelf"></div>' +
      '<button type="button" class="fab-log">' + IC.list + "<span>Read the full changelog</span>" + IC.arrow + "</button>" +
      '<h2 class="fab-sec">Say <i>hello</i></h2><div class="fab-contact">' +
        '<a href="mailto:thesmallbook.in@gmail.com"><span class="fab-ic">' + AIC.mail + '</span><span><b>thesmallbook.in@gmail.com</b><small>Support, partnerships and press. We reply within a day.</small></span></a>' +
        '<a href="https://instagram.com/thesmallbook.in" target="_blank" rel="noopener"><span class="fab-ic">' + AIC.cam + '</span><span><b>@thesmallbook.in</b><small>New books every week, behind the scenes</small></span></a>' +
        '<a href="https://github.com/JashGandhi-Studio/thesmallbook" target="_blank" rel="noopener"><span class="fab-ic">' + AIC.code + "</span><span><b>GitHub</b><small>The code behind the app</small></span></a></div>" +
      '<details class="fab-legal"><summary>Terms and privacy' + IC.down + '</summary><div class="fab-legal__in"></div><a href="legal.html">The full plain-words rulebook</a></details>' +
      '<p class="fab-aff">As an Amazon Associate, TheSmallBook earns from qualifying purchases. It helps keep the library going.</p>' +
      '<p class="fab-end"><span class="fs-logo">THE<b>SMALL</b>BOOK</span><br>Made with chai in Mumbai. Version ' + esc((window.TSB_FILM2 && TSB_FILM2.version) || "328") + "</p>";
    var stage = $(".fab-stage", fab);
    if (oldBook) { var lb = $(".fa-lid__b", oldBook); if (lb && !lb.firstChild) lb.innerHTML = '<div class="fab-exl"><small>EX LIBRIS</small><b>' + esc(name() || "Every reader") + '</b><s></s><span>Read a little.<br>Keep a lot.</span></div>'; stage.appendChild(oldBook); oldBook.classList.remove("open"); setTimeout(function () { oldBook.classList.add("open"); }, 650); }
    var shelf = $(".fab-shelf", fab);
    if (oldLog) shelf.appendChild(oldLog); if (oldPlank) shelf.appendChild(oldPlank);
    var lg = $(".fab-legal__in", fab);
    ["#terms", "#privacy"].forEach(function (s) { var t = $(s); if (t) { t.removeAttribute("style"); t.className = "fab-lcard"; lg.appendChild(t); } });
    var modal = $("#logModal"); if (modal) document.body.appendChild(modal);
    var lm = $("#logMore"); if (lm) { var fixLm = function () { lm.textContent = lm.textContent.replace(/SHOW MORE UPDATES/, "Show more updates"); }; fixLm(); lm.addEventListener("click", function () { setTimeout(fixLm, 0); }); }
    $(".fab-log", fab).addEventListener("click", function () { var o = $("#openLogModal"); if (o) o.click(); else if (modal) modal.style.display = "flex"; });
    var nav = $(".nav");
    if (nav && nav.parentNode) nav.parentNode.insertBefore(fab, nav); else document.body.insertBefore(fab, document.body.firstChild);
    root.classList.add("fab-on");
    if (location.hash === "#terms" || location.hash === "#privacy") { var d = $(".fab-legal", fab); d.open = true; setTimeout(function () { var t = $(location.hash); if (t) t.scrollIntoView(); }, 300); }
    /* numbers count up, sections rise as you reach them */
    var counted = false;
    function count() {
      if (counted) return; counted = true;
      $$("[data-to]", fab).forEach(function (b) {
        var to = Number(b.getAttribute("data-to")), t0 = 0;
        if (reduce) { b.textContent = to.toLocaleString("en-IN"); return; }
        (function f(ts) { if (!t0) t0 = ts; var q = Math.min(1, (ts - t0) / 1400), e = 1 - Math.pow(1 - q, 4); b.textContent = Math.round(to * e).toLocaleString("en-IN"); if (q < 1) requestAnimationFrame(f); })(performance.now());
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); if (x.target.classList.contains("fab-nums")) count(); io.unobserve(x.target); } }); }, { threshold: 0.2 });
      $$(".fab-rv, .fab-nums, .fab-sec, .fab-person, .fab-shelf", fab).forEach(function (n2) { io.observe(n2); });
    } else { count(); $$(".fab-rv", fab).forEach(function (n2) { n2.classList.add("in"); }); }
  }

  /* ---------- 10 · Sign in and Account (login.html) ----------
     Sign-in keeps its markup and gets the film skin (CSS) plus a fan of
     real covers. The signed-in Account view is regrouped: profile, Gold,
     your circle, account rows, store, then sign out. Duplicates of You and
     Settings (stats grid, level card, quick buttons, menu) are hidden. */
  function accountRoom() {
    if (page !== "login.html") return;
    root.classList.add("flg-on");
    var hero = $(".lghero");
    if (hero && !$(".flg-fan", hero)) {
      var pick = books().filter(function (b) { return b && b.id; }).slice(0, 60), out = [];
      var seed0 = dayKey().split("-").join("") % 97;
      for (var i = 0; i < 3 && pick.length; i++) out.push(pick.splice((seed0 * (i + 3)) % pick.length, 1)[0]);
      var fan = el("div", "flg-fan");
      fan.setAttribute("aria-hidden", "true");
      fan.innerHTML = out.map(function (b, k) { return '<img src="' + esc(cover(b)) + '" alt="" style="--k:' + k + '" onerror="this.style.visibility=\'hidden\'">'; }).join("");
      hero.insertBefore(fan, hero.firstChild);
    }
    var x = $(".youpage__x"); if (x) { x.innerHTML = IC.back; x.setAttribute("href", "you.html"); }
    var win = $("#view-account .youwin");
    if (!win || $(".fac", win)) return;
    var fac = el("div", "fac");
    fac.innerHTML = '<header class="fs2-hd"><a class="fs2-back" href="you.html" aria-label="Back">' + IC.back + '</a><div><span class="fs2-kick">ACCOUNT</span><h1>Your <i>account.</i></h1></div></header>';
    function mv(sel, into) { var n = $(sel, win); if (n) (into || fac).appendChild(n); return n; }
    mv(".youwin__hero");
    mv("#youGoldCard"); mv("#youUpgradeCard");
    var circ = el("section", "fac-sec"); circ.innerHTML = '<p class="fs2-h">Your circle</p>'; fac.appendChild(circ);
    mv(".acc__act", circ);
    var rows = el("section", "fac-sec"); rows.innerHTML = '<p class="fs2-h">Manage</p><div class="fac-rows"></div>'; fac.appendChild(rows);
    var rw = $(".fac-rows", rows);
    ["subAccount", "subPrivacy", "subNotif"].forEach(function (id) { var b = $('.ydept__row[data-sub="' + id + '"]', win); if (b) rw.appendChild(b); });
    var all = $('.ydept a.ydept__row[href="settings.html"]', win); if (all) rw.appendChild(all);
    var more = el("section", "fac-sec"); more.innerHTML = '<p class="fs2-h">More</p>'; fac.appendChild(more);
    var SI2 = { bag: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>', bulb: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>' };
    var mr = el("div", "fac-rows");
    mr.innerHTML = '<a class="ydept__row" href="store.html"><span class="ydept__ic">' + SI2.bag + '</span><span class="ydept__t">The Store<b>Kindle, Audible, Spotify and more real perks</b></span><i>' + IC.arrow + '</i></a>' +
      '<button type="button" class="ydept__row" data-sub="subAudit"><span class="ydept__ic">' + SI2.bulb + '</span><span class="ydept__t">The idea autopsy<b>Test your plan against 360 real failures</b></span><i>' + IC.arrow + "</i></button>";
    more.appendChild(mr);
    var ub = $(".acc__upgradebtn", fac); if (ub) ub.textContent = "Get Gold";
    var so = $("#signoutBtn"); if (so) fac.appendChild(so);
    var fine = el("p", "fac-fine"); fine.innerHTML = '<a href="legal.html#terms">Terms</a> \u00b7 <a href="legal.html#privacy">Privacy</a> \u00b7 <a href="about.html">About</a> \u00b7 <a href="mailto:thesmallbook.in@gmail.com">Contact</a>'; fac.appendChild(fine);
    win.insertBefore(fac, win.firstChild);
    root.classList.add("fac-on");
    $$(".accsub__t", win).forEach(function (t) { var tn = t.firstChild; if (tn && tn.nodeType === 3) tn.nodeValue = tn.nodeValue.replace(/^[^A-Za-z0-9]+/, ""); });
  }

  /* ---------- boot ---------- */
  function boot() {
    try { txVeil(); } catch (e) {}
    try { initPlayer(); } catch (e) {}
    try { listenRoom(); } catch (e) {}
    try { bookShare(); } catch (e) {}
    try { readerRoom(); } catch (e) {}
    try { settingsRoom(); } catch (e) {}
    try { aboutRoom(); } catch (e) {}
    try { accountRoom(); } catch (e) {}
    try { setTimeout(welcome, 200); } catch (e) {}
    try { if (window.TSB_FILM2_PAGES) window.TSB_FILM2_PAGES(page); } catch (e) {}
  }
  /* v334 READ: the real 3D book opens. Tap Read and the page leans in a
     touch, the same 3D book you can spin (front, spine, page edges, back)
     turns to face you as it rises to the middle, its cover swings open on
     the spine to show the real first page, and that page grows into the
     reader. The reader is prerendered while you look at the book, so it is
     simply there when the page lands: no loading pause. Only transform,
     opacity and clip move, so the GPU does the work on every phone. */
  var EASE_OUT = "cubic-bezier(.16, 1, .3, 1)", EASE_IO = "cubic-bezier(.65, 0, .25, 1)";
  function bkxRestore() {
    var x = document.querySelector(".bkx"); if (x) x.parentNode.removeChild(x);
    Array.prototype.forEach.call(document.querySelectorAll("[data-bkx]"), function (el) {
      if (el.getAnimations) el.getAnimations().forEach(function (an) { an.cancel(); });
      el.removeAttribute("data-bkx");
    });
    var nb = document.getElementById("nbOpenReader");
    if (nb && nb.getAnimations) nb.getAnimations().forEach(function (an) { an.cancel(); });
  }
  /* warm the reader the moment the book page settles */
  (function () {
    if (page !== "book.html") return;
    var tries = 0;
    /* v336: only after this page has fully loaded and gone quiet, so it never competes with the first paint */
    function later(f) { var go = function () { (window.requestIdleCallback || function (c) { setTimeout(c, 600); })(function () { setTimeout(f, 400); }); }; if (document.readyState === "complete") go(); else addEventListener("load", go); }
    later(function warm() {
      var a = document.getElementById("nbOpenReader");
      if (!a || !/reader\.html/.test(a.href || "")) { if (tries++ < 20) setTimeout(warm, 250); return; }
      try {
        if (HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
          var s = document.createElement("script"); s.type = "speculationrules";
          s.textContent = JSON.stringify({ prerender: [{ source: "list", urls: [a.href], eagerness: "immediate" }] });
          document.head.appendChild(s);
        } else {
          var l = document.createElement("link"); l.rel = "prefetch"; l.href = a.href; document.head.appendChild(l);
        }
      } catch (e) {}
    });
  })();
  function bkxSheet(book, vw) {
    var cat = (book && (book.cat || book.category)) || "Overview";
    var tag = (book && book.tagline) || "";
    return '<div class="bkx-sheet" style="width:' + vw + 'px">' +
      '<div class="bkx-top"><i class="bkx-x"></i><b>' + esc(book ? book.title : "") + '</b><i class="bkx-en"></i></div>' +
      '<div class="bkx-body"><div class="bkx-meta">' + esc(cat) + ' \u00b7 The big idea</div>' +
      '<h2>The Big Idea</h2><p>' + esc(tag) + '</p></div></div>';
  }
  /* v335: the opening page is built the moment a finger lands, so the
     tap itself only starts the motion (no first-frame stall) */
  var bkxPre = null;
  function reduceQ() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function bkxBook(href) {
    try { var id = new URL(href, location.href).searchParams.get("id"); if (typeof BOOKS !== "undefined") return BOOKS.filter(function (b) { return b.id === id; })[0] || null; } catch (er) {}
    return null;
  }
  document.addEventListener("pointerdown", function (e) {
    var a = e.target.closest && e.target.closest("#nbOpenReader");
    if (!a || bkxPre && bkxPre.href === a.href) return;
    var book = bkxBook(a.href || "");
    if (bkxPre && bkxPre.o && bkxPre.o.parentNode) bkxPre.o.parentNode.removeChild(bkxPre.o);
    bkxPre = { href: a.href, book: book, vw: innerWidth, sheet: book ? bkxSheet(book, innerWidth) : "" };
    /* lay the overlay out now, invisibly, so the tap pays nothing */
    if (book && Element.prototype.animate) {
      var po = document.createElement("div"); po.className = "bkx bkx--pre";
      po.innerHTML = '<i class="bkx-dim"></i><div class="bkx-stage"></div><div class="bkx-full">' + bkxPre.sheet + '</div>';
      document.documentElement.appendChild(po); bkxPre.o = po;
      var mine = bkxPre;
      setTimeout(function () { if (mine.o && mine.o.classList.contains("bkx--pre") && mine.o.parentNode) { mine.o.parentNode.removeChild(mine.o); mine.o = null; } if (bkxPre === mine) bkxPre = null; }, 2500);
    }
    try { a.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }], { duration: 120, easing: "ease-out", fill: "forwards" }); } catch (er) {}
  }, { passive: true, capture: true });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("#nbOpenReader");
    if (!a || document.querySelector(".bkx:not(.bkx--pre)")) return;
    var href = a.href || "";
    if (!/reader\.html/.test(href) || !Element.prototype.animate) return;
    var bk3 = document.querySelector(".bookhero__coverbox .bk3");
    var cv = document.getElementById("cover");
    var src = bk3 || cv;
    if (!src) return;
    var r = src.getBoundingClientRect();
    if (!r.width || r.bottom < 40 || r.top > innerHeight - 40) r = null;
    /* read every rect up front, before anything changes (no forced layouts) */
    var cam = [];
    if (r) Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
      var cs = getComputedStyle(el);
      if (cs.display === "none") return;
      var fx = cs.position === "fixed" || cs.position === "sticky";
      var er = fx ? null : el.getBoundingClientRect();
      if (er && (er.bottom < 0 || er.top > innerHeight || !er.height)) return;
      cam.push([el, fx, er]);
    });
    var cs0 = bk3 ? getComputedStyle(bk3) : null;
    e.preventDefault(); e.stopImmediatePropagation();
    try { sessionStorage.setItem("tsb_bkx", String(Date.now())); } catch (er) {}
    var gone = false, go = function () { if (gone) return; gone = true; location.href = href; };
    var vw = innerWidth, vh = innerHeight;
    var pre = bkxPre && bkxPre.href === href && bkxPre.vw === vw ? bkxPre : null;
    var book = pre ? pre.book : bkxBook(href);
    var sheet = pre ? pre.sheet : (book ? bkxSheet(book, vw) : "");
    try { if (book) sessionStorage.setItem("tsb_bkx_sheet", sheet); } catch (er3) {}
    var o = pre && pre.o && pre.o.parentNode ? pre.o : null;
    if (pre) pre.o = null;
    if (o && (reduceQ() || !r || !bk3)) { o.parentNode.removeChild(o); o = null; }
    var built = !!o;
    if (!o) { o = document.createElement("div"); o.className = "bkx"; }
    var reduce = reduceQ();
    if (reduce || !r || !bk3) {
      o.innerHTML = '<i class="bkx-dim"></i>';
      document.documentElement.appendChild(o);
      o.firstChild.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 140 : 240, easing: "ease-out", fill: "forwards" }).onfinish = go;
      setTimeout(go, 700);
      return;
    }
    /* the book's size in the middle: laid out big so the cover stays sharp */
    var w0 = r.width, h0 = r.height, d0 = parseFloat(cs0.getPropertyValue("--d")) || w0 * 0.1;
    var th = Math.min(vh * 0.52, (vw * 0.6) * h0 / w0), sc = th / h0, tw = w0 * sc, td = d0 * sc;
    var L = Math.round((vw - tw) / 2), T = Math.round(vh * 0.46 - th / 2);
    if (!built) o.innerHTML = '<i class="bkx-dim"></i><div class="bkx-stage"></div><div class="bkx-full">' + sheet + '</div>';
    var dim = o.children[0], stage = o.children[1], full = o.children[2];
    stage.style.cssText = "left:" + L + "px;top:" + T + "px;width:" + tw + "px;height:" + th + "px";
    /* the very same 3D book, cloned at its current angle */
    var bk = bk3.cloneNode(true);
    bk.classList.remove("is-live", "is-held"); bk.removeAttribute("tabindex"); bk.removeAttribute("id");
    bk.style.setProperty("--w", tw + "px"); bk.style.setProperty("--h", th + "px"); bk.style.setProperty("--d", td + "px");
    bk.style.position = "absolute"; bk.style.left = "0"; bk.style.top = "0";
    var obj = bk.querySelector(".bk3__obj"), front = bk.querySelector(".bk3__front");
    var t0 = (bk3.querySelector(".bk3__obj") || {}).style ? bk3.querySelector(".bk3__obj").style.transform : "";
    var ry = 0, m = /rotateY\((-?[\d.]+)deg\)/.exec(t0 || ""); if (m) ry = parseFloat(m[1]);
    var rx = 0, m2 = /rotateX\((-?[\d.]+)deg\)/.exec(t0 || ""); if (m2) rx = parseFloat(m2[1]);
    var ry1 = Math.round(ry / 360) * 360;
    /* the cover becomes a lid that can swing; its inside is paper */
    var lid = document.createElement("div"); lid.className = "bkx-lid";
    var a0 = 0, m3 = front ? /rotateY\((-?[\d.]+)deg\)/.exec(front.style.transform || "") : null; if (m3) a0 = -parseFloat(m3[1]) || 0;
    if (front) { front.parentNode.insertBefore(lid, front); lid.appendChild(front); front.style.transform = "none"; }
    var inside = document.createElement("div"); inside.className = "bkx-inside"; lid.appendChild(inside);
    var pg = document.createElement("div"); pg.className = "bkx-pg"; pg.innerHTML = sheet;
    if (obj) obj.insertBefore(pg, lid);
    var s = (tw * 0.97) / vw;
    pg.firstChild.style.transform = "scale(" + s + ")";
    stage.appendChild(bk);
    if (built) o.classList.remove("bkx--pre"); else document.documentElement.appendChild(o);
    var k = 1 / sc, dx = r.left - L, dy = r.top - T;
    /* the camera: the page behind leans toward the book */
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    cam.forEach(function (c) {
      var el = c[0];
      el.setAttribute("data-bkx", "");
      if (c[1]) { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" }); return; }
      el.style.transformOrigin = (cx - c[2].left) + "px " + (cy - c[2].top) + "px";
      el.animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }], { duration: 620, easing: EASE_OUT, fill: "forwards" });
    });
    var box = bk3.closest(".bookhero__coverbox") || bk3;
    box.setAttribute("data-bkx", "");
    box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, fill: "forwards" });
    dim.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.45 }, { opacity: 1 }], { duration: 560, easing: "ease-out", fill: "forwards" });
    /* the book rises to the middle and turns to face you */
    stage.animate([{ transform: "translate(" + dx + "px," + dy + "px) scale(" + k + ")" }, { transform: "none" }], { duration: 560, easing: EASE_OUT, fill: "forwards" });
    /* v336: it lifts up toward you as it comes, and never quite stops moving */
    var lift = -Math.min(34, th * 0.08);
    if (obj) obj.animate([
      { transform: "translateY(0px) translateZ(0px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)" },
      { transform: "translateY(" + lift + "px) translateZ(" + (td * 1.6) + "px) rotateX(-4deg) rotateY(" + (ry1 + 6) + "deg)", offset: 0.5 },
      { transform: "translateY(" + (lift * 0.35) + "px) translateZ(" + (td * 0.6) + "px) rotateX(-1deg) rotateY(" + (ry1 - 2) + "deg)", offset: 0.82 },
      { transform: "translateY(" + (lift * 0.2) + "px) translateZ(0px) rotateX(0deg) rotateY(" + (ry1 - 3) + "deg)" }
    ], { duration: 1150, easing: EASE_OUT, fill: "forwards" });
    var shd = bk.querySelector(".bk3__shadow");
    if (shd) shd.animate([{ transform: "scaleX(1)", opacity: 1 }, { transform: "scaleX(.8) translateY(" + (-lift * 0.6) + "px)", opacity: 0.5, offset: 0.5 }, { transform: "scaleX(.9)", opacity: 0.7 }], { duration: 1150, easing: EASE_OUT, fill: "forwards" });
    /* the cover peels up from its corner, then swings open on its spine */
    lid.animate([
      { transform: "translateZ(" + td / 2 + "px) rotateY(" + (-a0) + "deg) rotateX(0deg)" },
      { transform: "translateZ(" + td / 2 + "px) rotateY(-34deg) rotateX(7deg)", offset: 0.28 },
      { transform: "translateZ(" + td / 2 + "px) rotateY(-120deg) rotateX(3deg)", offset: 0.7 },
      { transform: "translateZ(" + td / 2 + "px) rotateY(-168deg) rotateX(0deg)" }
    ], { duration: 640, delay: 220, easing: EASE_IO, fill: "both" });
    /* the first page grows into the reader */
    var pr = { l: L + tw * 0.015, t: T + th * 0.012 };
    var clipB = Math.max(0, vh - (th * 0.976) / s);
    var g = full.animate([
      { opacity: 1, transform: "translate(" + pr.l + "px," + pr.t + "px) scale(" + s + ")", clipPath: "inset(0px 0px " + clipB + "px 0px round 6px)" },
      { opacity: 1, transform: "none", clipPath: "inset(0px 0px 0px 0px round 0px)" }
    ], { duration: 420, delay: 740, easing: EASE_IO, fill: "forwards" });
    g.onfinish = go;
    setTimeout(go, 1500);
  }, true);
  /* coming back with the back button never leaves the page mid-move */
  window.addEventListener("pageshow", bkxRestore);

  /* v331 SMOOTH TAPS: a second tap on the same link within a moment is
     ignored (no double page loads), the tapped link answers at once, and
     pages are fetched the instant a finger touches a link. */
  (function () {
    var lastA = null, lastT = 0, warmed = {};
    function internal(a) {
      if (!a || !a.getAttribute) return false;
      var h = a.getAttribute("href") || "";
      if (!h || h.charAt(0) === "#" || /^(mailto|tel|javascript|https?:)/i.test(h) || a.target === "_blank" || a.hasAttribute("download")) return false;
      return /\.html(\?|#|$)/.test(h);
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!internal(a) || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      var now = Date.now();
      if (a === lastA && now - lastT < 900) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      lastA = a; lastT = now;
      a.classList.add("is-going"); setTimeout(function () { a.classList.remove("is-going"); }, 1200);
    }, true);
    function warm(e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!internal(a)) return;
      var u = a.href.split("#")[0];
      if (warmed[u] || u === location.href.split("#")[0]) return;
      warmed[u] = 1;
      try { var l = document.createElement("link"); l.rel = "prefetch"; l.href = u; document.head.appendChild(l); } catch (e2) {}
    }
    document.addEventListener("touchstart", warm, { passive: true, capture: true });
    document.addEventListener("mouseover", warm, { passive: true, capture: true });
  })();

  window.TSB_FILM2 = { version: "332", openShare: openShare, ed: ed };
  /* v336 app shell: reveal the page only once the new design has painted
     (book page: once the 3D book exists; everywhere: once fonts are in, capped) */
  function shellReady() {
    var sh = window.TSB_SHELL; if (!sh) return;
    var t0 = Date.now();
    function fontsIn(cb) { var d = false, go = function () { if (!d) { d = true; cb(); } }; try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go(); } catch (e) { go(); } setTimeout(go, 700); }
    (function wait() {
      var need = page === "book.html" && !document.querySelector(".bookhero__coverbox .bk3, .bookhero__coverbox .bk3d");
      if (need && Date.now() - t0 < 1800) { setTimeout(wait, 60); return; }
      fontsIn(function () { requestAnimationFrame(function () { requestAnimationFrame(sh.ready); }); });
    })();
  }
  function bootAll() { boot(); shellReady(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootAll); else bootAll();
})();
