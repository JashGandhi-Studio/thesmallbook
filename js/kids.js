/* =====================================================================
   TheSmallBook Kids · kids.js (v324)
   Story time for small readers: Panchatantra in English and Hindi.
     · Read to me: the device voice reads aloud and every word lights up
       as it is spoken (boundary events, with a timed fallback).
     · Tap any word to hear it. Words with a dotted line open a meaning
       bubble in the story's language.
     · Finish a story, earn its star (kept on this device only).
     · Grown-ups leave by holding the exit button, so little fingers
       do not wander off by accident.
   No sign-in, no network calls, nothing leaves the device.
   ===================================================================== */
(function () {
  "use strict";
  var STORIES = window.TSB_KIDS || [];
  var LS_LANG = "tsb_kids_lang", LS_STARS = "tsb_kids_stars";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = document.getElementById("kidsApp");
  if (!app || !STORIES.length) return;

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  function setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }

  var lang = getJSON(LS_LANG, null);
  if (lang !== "en" && lang !== "hi") {
    var appLang = getJSON("tsb_lang", "en");
    lang = /^hi/.test(String(appLang)) ? "hi" : "en";
  }
  var stars = getJSON(LS_STARS, {});
  var cur = null, page = 0, playing = false;

  var UI = {
    en: { hello: "Story time", sub: "Pick a story. Tap Read to me and follow the words.", stars: "stars", read: "Read to me", pause: "Pause", again: "Read another story", moral: "The lesson", earned: "You earned a star!", pages: "pages", hold: "Grown-ups: hold to exit", noHi: "This device has no Hindi voice yet, so it reads in its own voice.", start: "Start", back: "All stories", voice: "Choose offline voice" },
    hi: { voice: "ऑफलाइन आवाज़ चुनें", hello: "कहानी का समय", sub: "एक कहानी चुनो। सुनाओ दबाओ और शब्दों के साथ पढ़ो।", stars: "सितारे", read: "सुनाओ", pause: "रुको", again: "एक और कहानी", moral: "सीख", earned: "तुम्हें एक सितारा मिला!", pages: "पन्ने", hold: "बड़े: बाहर जाने के लिए दबाए रखें", noHi: "इस फ़ोन में हिंदी आवाज़ नहीं है, इसलिए अपनी आवाज़ में पढ़ेगा।", start: "शुरू करो", back: "सभी कहानियाँ" }
  };
  function t(k) { return (UI[lang] || UI.en)[k]; }
  function starCount() { var n = 0; for (var k in stars) if (stars[k]) n++; return n; }

  /* ---------- scenes: soft painted backdrops + emoji actors ---------- */
  function sceneHtml(sc, small) {
    var a = (sc.actors || []).map(function (x, i) {
      return '<span class="ks-actor ks-m-' + (x[4] || "bob") + '" style="left:' + x[1] + "%;top:" + x[2] + "%;font-size:" + (small ? x[3] * 0.62 : x[3]) + "rem;--d:" + (i * 0.09) + 's" aria-hidden="true">' + x[0] + "</span>";
    }).join("");
    return '<div class="ks-scene ks-bg-' + (sc.bg || "forest") + '">' + '<span class="ks-sun" aria-hidden="true"></span><span class="ks-hill ks-hill--a"></span><span class="ks-hill ks-hill--b"></span>' + a + "</div>";
  }

  /* ---------- v334 Kids mode: a grown-up sets it up once, then it is the child's ---------- */
  var LS_KID = "tsb_kids_profile";
  var BUDDIES = ["\ud83d\udc12", "\ud83e\udd81", "\ud83d\udc22", "\ud83d\udc18", "\ud83e\udd8a", "\ud83d\udc30"];
  var KX = {
    en: { g1k: "For grown-ups", g1: "A safe corner for little readers", g1a: "Picture stories, read aloud word by word", g1b: "No sign-in, no ads, no chat, no links out", g1c: "Nothing about your child leaves this phone", g1d: "To leave, hold the \u2715 at the top for two seconds", next: "Next", g2: "Who is reading today?", g2p: "Their first name (you can skip this)", skip: "Skip", g3: "Pick a reading buddy", go: "Start story time", hi: "Hi", today: "Today\u2019s story", all: "All stories", change: "Change name or buddy", min: "min" },
    hi: { g1k: "\u092c\u0921\u093c\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f", g1: "\u091b\u094b\u091f\u0947 \u092a\u093e\u0920\u0915\u094b\u0902 \u0915\u093e \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0915\u094b\u0928\u093e", g1a: "\u0924\u0938\u094d\u0935\u0940\u0930\u094b\u0902 \u0935\u093e\u0932\u0940 \u0915\u0939\u093e\u0928\u093f\u092f\u093e\u0901, \u0936\u092c\u094d\u0926-\u0936\u092c\u094d\u0926 \u092a\u0922\u093c\u0915\u0930", g1b: "\u0928 \u0938\u093e\u0907\u0928-\u0907\u0928, \u0928 \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928, \u0928 \u091a\u0948\u091f", g1c: "\u092c\u091a\u094d\u091a\u0947 \u0915\u0940 \u0915\u094b\u0908 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u092b\u093c\u094b\u0928 \u0938\u0947 \u092c\u093e\u0939\u0930 \u0928\u0939\u0940\u0902 \u091c\u093e\u0924\u0940", g1d: "\u092c\u093e\u0939\u0930 \u091c\u093e\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u090a\u092a\u0930 \u0935\u093e\u0932\u093e \u2715 \u0926\u094b \u0938\u0947\u0915\u0902\u0921 \u0926\u092c\u093e\u090f \u0930\u0916\u0947\u0902", next: "\u0906\u0917\u0947", g2: "\u0906\u091c \u0915\u094c\u0928 \u092a\u0922\u093c \u0930\u0939\u093e \u0939\u0948?", g2p: "\u092c\u091a\u094d\u091a\u0947 \u0915\u093e \u0928\u093e\u092e (\u091a\u093e\u0939\u0947\u0902 \u0924\u094b \u091b\u094b\u0921\u093c\u0947\u0902)", skip: "\u091b\u094b\u0921\u093c\u0947\u0902", g3: "\u090f\u0915 \u0926\u094b\u0938\u094d\u0924 \u091a\u0941\u0928\u094b", go: "\u0915\u0939\u093e\u0928\u0940 \u0936\u0941\u0930\u0942 \u0915\u0930\u094b", hi: "\u0928\u092e\u0938\u094d\u0924\u0947", today: "\u0906\u091c \u0915\u0940 \u0915\u0939\u093e\u0928\u0940", all: "\u0938\u093e\u0930\u0940 \u0915\u0939\u093e\u0928\u093f\u092f\u093e\u0901", change: "\u0928\u093e\u092e \u092f\u093e \u0926\u094b\u0938\u094d\u0924 \u092c\u0926\u0932\u0947\u0902", min: "\u092e\u093f\u0928\u091f" }
  };
  function x(k) { return (KX[lang] || KX.en)[k]; }
  function kid() { var k = getJSON(LS_KID, null); return k && typeof k === "object" ? k : null; }

  function renderSetup(step) {
    stopSpeech();
    cur = null;
    var k = kid() || { name: "", buddy: BUDDIES[0] };
    app.className = "kids kids--setup";
    var dots = '<div class="kg-dots" aria-hidden="true">' + [0, 1, 2].map(function (i) { return '<i class="' + (i === step ? "on" : "") + '"></i>'; }).join("") + "</div>";
    var body = "";
    if (step === 0) {
      body = '<div class="kg-art" aria-hidden="true"><span class="kg-shield">\ud83d\udee1\ufe0f</span><span class="kg-orbit">' + BUDDIES.slice(0, 4).map(function (b, i) { return '<i style="--i:' + i + '">' + b + "</i>"; }).join("") + "</span></div>" +
        '<p class="kg-kick">' + esc(x("g1k")) + '</p><h1 class="kg-h">' + esc(x("g1")) + "</h1>" +
        '<ul class="kg-list"><li>' + esc(x("g1a")) + "</li><li>" + esc(x("g1b")) + "</li><li>" + esc(x("g1c")) + '</li><li class="kg-lock">' + esc(x("g1d")) + "</li></ul>" +
        '<button class="kg-go" data-kg="1">' + esc(x("next")) + "</button>";
    } else if (step === 1) {
      body = '<div class="kg-art kg-art--wave" aria-hidden="true"><span class="kg-wave">\ud83d\udc4b</span></div>' +
        '<h1 class="kg-h">' + esc(x("g2")) + "</h1>" +
        '<input class="kg-in" id="kgName" maxlength="16" autocomplete="off" autocapitalize="words" enterkeyhint="next" placeholder="' + esc(x("g2p")) + '" value="' + esc(k.name || "") + '">' +
        '<button class="kg-go" data-kg="2">' + esc(x("next")) + '</button><button class="kg-skip" data-kg="2s">' + esc(x("skip")) + "</button>";
    } else {
      body = '<h1 class="kg-h">' + esc(x("g3")) + '</h1><div class="kg-buddies" role="radiogroup">' + BUDDIES.map(function (b) {
        return '<button role="radio" aria-checked="' + (b === k.buddy) + '" class="kg-bud' + (b === k.buddy ? " on" : "") + '" data-bud="' + b + '">' + b + "</button>";
      }).join("") + '</div><button class="kg-go" data-kg="3">' + esc(x("go")) + "</button>";
    }
    app.innerHTML = topbar(false) + '<div class="kg">' + dots + '<div class="kg-card">' + body + "</div></div>";
    wireTop();
    var name = $("#kgName", app);
    if (name) { setTimeout(function () { try { name.focus(); } catch (e) {} }, 300); name.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $('[data-kg="2"]', app).click(); } }); }
    app.addEventListener("click", function onk(e) {
      var b = e.target.closest("[data-kg],[data-bud]");
      if (!b) return;
      var cur2 = kid() || { name: "", buddy: BUDDIES[0] };
      if (b.hasAttribute("data-bud")) {
        cur2.buddy = b.getAttribute("data-bud"); setJSON(LS_KID, cur2);
        [].forEach.call(app.querySelectorAll(".kg-bud"), function (n) { var on = n === b; n.classList.toggle("on", on); n.setAttribute("aria-checked", String(on)); });
        return;
      }
      var g = b.getAttribute("data-kg");
      app.removeEventListener("click", onk);
      if (g === "1") return renderSetup(1);
      if (g === "2" || g === "2s") { cur2.name = g === "2s" ? "" : String(($("#kgName", app) || {}).value || "").replace(/[<>]/g, "").trim().slice(0, 16); setJSON(LS_KID, cur2); return renderSetup(2); }
      if (g === "3") { cur2.done = 1; if (!cur2.buddy) cur2.buddy = BUDDIES[0]; setJSON(LS_KID, cur2); renderPicker(true); }
    });
  }

  function heroHtml(k, fresh) {
    var name = k && k.name ? k.name : "";
    var hello = name ? x("hi") + " " + name + "!" : t("hello");
    var letters = hello.split("").map(function (c, i) { return '<span style="--i:' + i + '">' + (c === " " ? "&nbsp;" : esc(c)) + "</span>"; }).join("");
    var parade = ["\ud83d\udc12", "\ud83e\udd81", "\ud83d\udc22", "\ud83d\udc0a", "\ud83d\udc07", "\ud83d\udc26"].map(function (a, i) { return '<i style="--i:' + i + '">' + a + "</i>"; }).join("");
    return '<header class="kh' + (fresh ? " kh--fresh" : "") + '">' +
      '<div class="kh-sky" aria-hidden="true"><span class="kh-sun"><i></i></span><span class="kh-rain"></span>' +
      '<span class="kh-cloud kh-cloud--a"></span><span class="kh-cloud kh-cloud--b"></span><span class="kh-cloud kh-cloud--c"></span>' +
      '<span class="kh-tw" style="--x:18%;--y:22%;--i:0"></span><span class="kh-tw" style="--x:46%;--y:12%;--i:1"></span><span class="kh-tw" style="--x:70%;--y:30%;--i:2"></span>' +
      '<span class="kh-hill kh-hill--b"></span><span class="kh-hill kh-hill--a"></span><span class="kh-parade">' + parade + "</span>" +
      '<span class="kh-buddy">' + esc((k && k.buddy) || BUDDIES[0]) + "</span></div>" +
      '<h1 class="kh-title" aria-label="' + esc(hello) + '">' + letters + '</h1><p class="kh-sub">' + esc(t("sub")) + "</p></header>";
  }

  /* ---------- picker ---------- */
  function renderPicker(fresh) {
    stopSpeech();
    cur = null;
    var k = kid();
    if (!k || !k.done) { renderSetup(0); return; }
    document.title = (lang === "hi" ? "\u0915\u0939\u093e\u0928\u093f\u092f\u093e\u0901" : "Kids mode") + ", TheSmallBook";
    app.className = "kids kids--picker";
    var di = Math.floor(Date.now() / 864e5) % STORIES.length, td = STORIES[di];
    function card(s, i, big) {
      var got = !!stars[s.id];
      return '<a class="kp-card' + (big ? " kp-card--today" : "") + '" href="#s=' + s.id + '" style="--tint:' + s.tint + ";--i:" + i + '">' +
        sceneHtml(s.cover, !big) +
        (big ? '<span class="kp-card__k">' + esc(x("today")) + "</span>" : "") +
        '<span class="kp-card__t">' + esc(s.title[lang]) + "</span>" +
        '<span class="kp-card__m">' + s.pages.length + " " + esc(t("pages")) + (got ? ' <b class="kp-star" title="Finished">\u2605</b>' : "") + "</span></a>";
    }
    app.innerHTML =
      topbar(false) + heroHtml(k, fresh) +
      card(td, 0, true) +
      '<p class="kp-h">' + esc(x("all")) + '</p><div class="kp-grid">' + STORIES.map(function (s, i) { return card(s, i + 1, false); }).join("") + "</div>" +
      '<div class="kp-voice"><button class="kp-change" id="kpVoice">🎙 ' + esc(t("voice")) + '</button><span>' + (window.TTS_ENGINE && TTS_ENGINE.voiceModel && TTS_ENGINE.voiceModel() ? "TheSmallBook Voice Model" : "Phone voice") + '</span></div>' +
      '<p class="kp-foot">Original picture stories by TheSmallBook. <button class="kp-change" id="kpChange">' + esc(x("change")) + "</button></p>";
    wireTop();
    var ch = $("#kpChange", app); if (ch) ch.addEventListener("click", function () { renderSetup(1); });
    var vm = $("#kpVoice", app); if (vm) vm.addEventListener("click", function () { if (window.TTS_ENGINE && TTS_ENGINE.openVoiceModel) TTS_ENGINE.openVoiceModel(); else showTip("Voice setup is loading"); });
  }

  function topbar(inStory) {
    return '<div class="k-top">' +
      (inStory ? '<a class="k-icon" href="#" aria-label="' + esc(t("back")) + '"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></a>'
               : '<span class="k-stars" id="kStars" aria-label="' + starCount() + " " + esc(t("stars")) + '"><b>★</b> ' + starCount() + "</span>") +
      '<div class="k-lang" role="group" aria-label="Language"><button data-kl="en" class="' + (lang === "en" ? "on" : "") + '">EN</button><button data-kl="hi" class="' + (lang === "hi" ? "on" : "") + '">हिं</button></div>' +
      '<button class="k-exit" id="kExit" aria-label="' + esc(t("hold")) + '" title="' + esc(t("hold")) + '"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="k-exit__ring" cx="22" cy="22" r="19" pathLength="100"/></svg><span>✕</span></button>' +
      "</div>";
  }

  function wireTop() {
    var ls = app.querySelectorAll("[data-kl]");
    for (var i = 0; i < ls.length; i++) ls[i].addEventListener("click", function () {
      var l = this.getAttribute("data-kl");
      if (l === lang) return;
      lang = l; setJSON(LS_LANG, l); stopSpeech();
      if (cur) renderPage(false); else renderPicker();
    });
    var ex = $("#kExit", app);
    if (!ex) return;
    var timer = null, tip = null;
    function cancel() { clearTimeout(timer); ex.classList.remove("is-holding"); }
    ex.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      ex.classList.add("is-holding");
      clearTimeout(tip);
      showTip(t("hold"));
      timer = setTimeout(function () { stopSpeech(); location.href = "index.html"; }, 2000);
    });
    ex.addEventListener("pointerup", cancel);
    ex.addEventListener("pointerleave", cancel);
    ex.addEventListener("pointercancel", cancel);
    ex.addEventListener("click", function (e) { e.preventDefault(); });
    ex.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  function showTip(msg) {
    var tip = $(".k-tip");
    if (!tip) { tip = document.createElement("div"); tip.className = "k-tip"; document.body.appendChild(tip); }
    tip.textContent = msg;
    tip.classList.add("show");
    clearTimeout(showTip._t);
    showTip._t = setTimeout(function () { tip.classList.remove("show"); }, 2600);
  }

  /* ---------- story pages ---------- */
  function openStory(id) {
    var s = null;
    for (var i = 0; i < STORIES.length; i++) if (STORIES[i].id === id) s = STORIES[i];
    if (!s) { renderPicker(); return; }
    cur = s; page = 0; playing = false; s._earned = false;
    renderPage(true);
  }

  function tokens(text) {
    var out = [], re = /\S+/g, m;
    while ((m = re.exec(text))) out.push({ w: m[0], at: m.index });
    return out;
  }
  function bare(w) { return w.replace(/^["'“‘(]+|["'”’),.!?।:;]+$/g, ""); }

  function renderPage(fresh) {
    var s = cur, total = s.pages.length, isMoral = page >= total;
    document.title = s.title[lang] + ", TheSmallBook Kids";
    app.className = "kids kids--story";
    app.style.setProperty("--tint", s.tint);
    var body;
    if (isMoral) {
      if (!stars[s.id]) { s._earned = true; stars[s.id] = 1; setJSON(LS_STARS, stars); }
      var first = !!s._earned;
      body = '<div class="kr-moral">' +
        '<div class="kr-starburst' + (first ? " is-new" : "") + '" aria-hidden="true"><span>★</span>' + (first ? '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>' : "") + "</div>" +
        (first ? '<p class="kr-earned">' + esc(t("earned")) + "</p>" : "") +
        '<div class="kr-moral__k">' + esc(t("moral")) + "</div>" +
        '<p class="kr-moral__t" lang="' + lang + '">' + esc(s.moral[lang]) + "</p>" +
        '<a class="kr-again" href="#">' + esc(t("again")) + "</a></div>";
    } else {
      var p = s.pages[page], text = p[lang], gl = (p.words && p.words[lang]) || {};
      var glKeys = {};
      for (var k in gl) glKeys[lang === "en" ? k.toLowerCase() : k] = gl[k];
      var words = tokens(text).map(function (tk, i) {
        var key = lang === "en" ? bare(tk.w).toLowerCase() : bare(tk.w);
        var g = glKeys[key];
        return '<span class="kw' + (g ? " kw--g" : "") + '" data-i="' + i + '" data-at="' + tk.at + '"' + (g ? ' data-mean="' + esc(g) + '"' : "") + ">" + esc(tk.w) + "</span>";
      }).join(" ");
      body = sceneHtml(p.scene, false) +
        '<div class="kr-text" lang="' + lang + '"><p>' + words + "</p></div>";
    }
    var dots = "";
    for (var d = 0; d <= total; d++) dots += '<i class="' + (d === page ? "on" : d < page ? "done" : "") + (d === total ? " star" : "") + '"></i>';
    app.innerHTML = topbar(true) +
      '<div class="kr-title">' + esc(s.title[lang]) + "</div>" +
      '<div class="kr-stage' + (fresh ? " is-fresh" : "") + '">' + body + "</div>" +
      '<div class="kr-dots" aria-hidden="true">' + dots + "</div>" +
      '<div class="kr-ctrl">' +
        '<button class="kr-nav" id="kPrev" aria-label="Previous page"' + (page === 0 ? " disabled" : "") + '><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        (isMoral ? '<a class="kr-play kr-play--home" href="#">' + esc(t("back")) + "</a>"
                 : '<button class="kr-play' + (playing ? " is-on" : "") + '" id="kPlay"><span class="kr-play__ico">' + (playing ? "❚❚" : "▶") + '</span><span>' + esc(playing ? t("pause") : t("read")) + "</span></button>") +
        '<button class="kr-nav" id="kNext" aria-label="Next page"' + (isMoral ? " disabled" : "") + '><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
      "</div>";
    wireTop();
    wireStory();
    if (isMoral) speak(t("moral") + ". " + s.moral[lang], null, null);
    else if (playing) setTimeout(readPage, 450);
  }

  function go(delta) {
    var n = page + delta;
    if (n < 0 || n > cur.pages.length) return;
    stopSpeech(true);
    page = n;
    var st = $(".kr-stage", app);
    if (st && !reduce) {
      st.classList.add(delta > 0 ? "is-out" : "is-outback");
      setTimeout(function () { renderPage(false); var s2 = $(".kr-stage", app); if (s2) s2.classList.add(delta > 0 ? "is-in" : "is-inback"); }, 180);
    } else renderPage(false);
  }

  function wireStory() {
    var pv = $("#kPrev", app), nx = $("#kNext", app), pl = $("#kPlay", app);
    if (pv) pv.addEventListener("click", function () { go(-1); });
    if (nx) nx.addEventListener("click", function () { go(1); });
    if (pl) pl.addEventListener("click", function () {
      if (playing) { playing = false; stopSpeech(); paintPlay(); return; }
      /* v341: the story reads on the first tap. The private model is offered
         afterwards, never in front of the sound. */
      var start = function () { playing = true; paintPlay(); readPage(); };
      start();
      if (window.TTS_ENGINE && TTS_ENGINE.hintVoiceModel) {
        try { TTS_ENGINE.hintVoiceModel(25000); } catch (e) {}
      }
    });
    /* swipe between pages */
    var st = $(".kr-stage", app), x0 = null;
    if (st) {
      st.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      st.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      });
    }
    /* tap a word: hear it, and see its meaning if it has one */
    var txt = $(".kr-text", app);
    if (txt) txt.addEventListener("click", function (e) {
      var w = e.target.closest ? e.target.closest(".kw") : null;
      if (!w) return;
      var word = bare(w.textContent);
      var mean = w.getAttribute("data-mean");
      w.classList.remove("is-tap"); void w.offsetWidth; w.classList.add("is-tap");
      if (mean) { bubble(w, word, mean); if (!playing) speak(word + ". " + mean, null, null); }
      else if (!playing) speak(word, null, null);
    });
  }

  function paintPlay() {
    var pl = $("#kPlay", app);
    if (!pl) return;
    pl.classList.toggle("is-on", playing);
    pl.innerHTML = '<span class="kr-play__ico">' + (playing ? "❚❚" : "▶") + "</span><span>" + esc(playing ? t("pause") : t("read")) + "</span>";
  }

  function bubble(w, word, mean) {
    var old = $(".kb"); if (old) old.remove();
    var b = document.createElement("div");
    b.className = "kb";
    b.setAttribute("role", "status");
    b.innerHTML = "<b>" + esc(word) + "</b><span>" + esc(mean) + "</span>";
    document.body.appendChild(b);
    var r = w.getBoundingClientRect(), bw = Math.min(280, window.innerWidth - 24);
    b.style.width = bw + "px";
    b.style.left = Math.max(12, Math.min(window.innerWidth - bw - 12, r.left + r.width / 2 - bw / 2)) + "px";
    var top = r.top - b.offsetHeight - 12;
    if (top < 70) { top = r.bottom + 12; b.classList.add("kb--below"); }
    b.style.top = top + "px";
    b.style.setProperty("--ax", Math.round(r.left + r.width / 2 - parseFloat(b.style.left)) + "px");
    requestAnimationFrame(function () { b.classList.add("show"); });
    clearTimeout(bubble._t);
    bubble._t = setTimeout(function () { b.classList.remove("show"); setTimeout(function () { if (b.parentNode) b.remove(); }, 300); }, 4200);
  }

  /* ---------- speech + word-by-word light ---------- */
  var synth = window.speechSynthesis || null, utt = null, fallbackT = null, warnedHi = false;
  function pickVoice(l) {
    if (!synth) return null;
    var vs = synth.getVoices() || [], want = l === "hi" ? /^hi/i : /^en[-_]IN/i, alt = /^en/i, best = null;
    for (var i = 0; i < vs.length; i++) { if (want.test(vs[i].lang)) { best = vs[i]; break; } }
    if (!best && l === "en") for (var j = 0; j < vs.length; j++) { if (alt.test(vs[j].lang)) { best = vs[j]; break; } }
    return best;
  }
  if (synth && synth.addEventListener) synth.addEventListener("voiceschanged", function () {});

  function lightWord(i) {
    var ws = app.querySelectorAll(".kw");
    for (var k = 0; k < ws.length; k++) {
      ws[k].classList.toggle("is-now", k === i);
      ws[k].classList.toggle("is-read", k < i);
    }
  }
  function lightAt(charIndex) {
    var ws = app.querySelectorAll(".kw"), idx = 0;
    for (var k = 0; k < ws.length; k++) if (+ws[k].getAttribute("data-at") <= charIndex) idx = k;
    lightWord(idx);
  }

  function speak(text, onBoundary, onEnd) {
    /* A parent may opt into the same private Voice Model used elsewhere.
       It stays device-local. Word highlighting keeps its timed fallback. */
    try {
      if (window.TTS_ENGINE && TTS_ENGINE.voiceModel && TTS_ENGINE.voiceModel()) {
        TTS_ENGINE.playParts([{ text: text, lang: lang === "hi" ? "hi-IN" : "en-IN", pause: 0 }]);
        if (onEnd) setTimeout(onEnd, Math.max(1100, text.length * (lang === "hi" ? 92 : 70)));
        return true;
      }
    } catch (e0) {}
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { if (onEnd) setTimeout(onEnd, 1200); return false; }
    try { synth.cancel(); } catch (e) {}
    utt = new SpeechSynthesisUtterance(text);
    var v = pickVoice(lang);
    if (v) utt.voice = v;
    else if (lang === "hi" && !warnedHi) { warnedHi = true; showTip(t("noHi")); }
    utt.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utt.rate = lang === "hi" ? 0.85 : 0.88;
    utt.pitch = 1.08;
    if (onBoundary) utt.onboundary = function (e) { if (e.name === undefined || e.name === "word") onBoundary(e.charIndex); };
    utt.onend = function () { if (onEnd) onEnd(); };
    utt.onerror = function () { if (onEnd) onEnd(); };
    try { synth.speak(utt); } catch (e2) { if (onEnd) setTimeout(onEnd, 800); }
    return true;
  }

  function readPage() {
    if (!cur || page >= cur.pages.length) return;
    var text = cur.pages[page][lang], gotBoundary = false, myPage = page;
    var ws = app.querySelectorAll(".kw");
    clearTimeout(fallbackT);
    var ok = speak(text, function (ci) { gotBoundary = true; lightAt(ci); }, function () {
      clearTimeout(fallbackT);
      if (myPage !== page) return;
      lightWord(ws.length);
      if (playing) setTimeout(function () { if (playing && myPage === page) go(1); }, 900);
    });
    /* some voices never send word boundaries: pace the light by word length */
    var perChar = (lang === "hi" ? 95 : 70) / 0.88, i = 0;
    function step() {
      if (gotBoundary || myPage !== page || !playing) return;
      lightWord(i);
      var w = ws[i]; i++;
      if (i <= ws.length && w) fallbackT = setTimeout(step, Math.max(260, w.textContent.length * perChar));
    }
    fallbackT = setTimeout(step, ok ? 700 : 0);
  }

  function stopSpeech(keepPlaying) {
    clearTimeout(fallbackT);
    if (!keepPlaying) playing = false;
    try { if (synth) synth.cancel(); } catch (e) {}
    try { if (window.TTS_ENGINE && TTS_ENGINE.stop) TTS_ENGINE.stop(); } catch (e2) {}
  }

  /* ---------- routing: #s=story-id ---------- */
  function route() {
    var m = location.hash.match(/s=([a-z0-9-]+)/);
    if (m) openStory(m[1]); else renderPicker();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("pagehide", function () { stopSpeech(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) { stopSpeech(); paintPlay(); } });
  route();

  window.TSB_KIDS_APP = { route: route, stars: function () { return starCount(); } };
})();
