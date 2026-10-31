/* ============================================================
   THESMALLBOOK - TTS ENGINE v6 🎧 PODCAST-GRADE LISTENING
   ------------------------------------------------------------
   Providers (auto, in order):
     1. TheSmallBook Voice Model - private, on-device English and Hindi,
        downloaded only after the reader chooses it.
     2. Web Speech API - instant device fallback for every language.

   A legacy cloud adapter remains below for older saved sessions, but new
   listening never loads it or sends listening text to it.

   Features:
     • natural sentence-aware pauses (480ms / 220ms / 750ms)
     • subtle rate + pitch variation (human feel)
     • FULL-BOOK PODCAST MODE: queues every lesson, auto-advances,
       floating mini-player with play/pause/next/prev/speed/progress
     • section intros ("Lesson 3 of 8 - The Power of 1%")
   ============================================================ */
window.TTS_ENGINE = (function () {
  "use strict";

  /* ---------- state ---------- */
  let provider = "web";          // "puter" | "web"
  let puterReady = false;
  let puterLoading = false;
  let puterVoices = [];
  let queue = [];                // [{text, pause, intro, meta}]
  let playing = false;
  let paused = false;
  let curIdx = 0;
  let speed = 1.08;
  let timer = null;              // web-speech chunk timer
  let utter = null;              // current utterance (GC guard)
  let player = null;             // mini-player DOM
  let onProgress = null;         // callback (idx, total, playing)
  let currentAudio = null;       // Puter audio element (background-friendly)
  let modelStreamResume = null;  // worker stream can continue after a pause
  let mediaSessionSet = false;   // lock-screen controls wired
  let gen = 0;                   // generation token: stop() kills in-flight starts
  let posTimer = null;           // lock-screen progress ticker
  let posStart = 0;
  let posDur = 0;
  let posOffset = 0;
  let artCache = {};             // book.id → square artwork data URL
  let lastMetaKey = "";          // avoid recreating metadata on every chunk
  let silenceEl = null;          // silent loop → keeps tab alive in background
  let audioCtx = null;           // Web Audio context (for volume BOOST)
  let gainNode = null;           // gain > 1.0 → louder than device max
  let boost = 1.5;               // default boost (1x / 1.5x / 2x)
  const SILENCE_SRC = "data:audio/wav;base64,UklGRmQfAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

  const SPK = (typeof speechSynthesis !== "undefined") ? speechSynthesis : null;

  /* ---------- tiny helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function normLang(l) { return String(l || "").toLowerCase().replace(/_/g, "-"); }
  function baseLang(l) { return normLang(l).split("-")[0]; }
  const REGION = {
    hi: "hi-IN", gu: "gu-IN", mr: "mr-IN", ta: "ta-IN", te: "te-IN", kn: "kn-IN",
    ml: "ml-IN", bn: "bn-IN", pa: "pa-IN", ur: "ur-IN", or: "or-IN", en: "en-IN",
    es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", ar: "ar-SA", ja: "ja-JP",
    ko: "ko-KR", ru: "ru-RU", it: "it-IT", "zh-cn": "zh-CN"
  };
  function region(lang) {
    const n = normLang(lang);
    return REGION[n] || REGION[baseLang(n)] || lang;
  }

  /* ⭐ PUTER OFFICIAL TTS LANGUAGES (official list - Puter speaks these
     natively). Our app uses Puter ONLY for these; every other language
     goes to Web Speech (device regional voice = guaranteed correct).
     Official Puter list: ar da es fr it ko nn pl th zh-cn bn de fa hi ig
     nb ro pt tr zh-tw pt-br en fi hy ja nl ru sv uk ur */
  const PUTER_LANGS = new Set([
    "ar","da","es","fr","it","ko","nn","pl","th","zh","zh-cn","zh-tw",
    "bn","de","fa","hi","ig","nb","ro","pt","pt-br","tr","en",
    "fi","hy","ja","nl","ru","sv","uk","ur"
  ]);
  /* v325 STUDIO VOICES (puter.ai.txt2speech providers):
     OpenAI gpt-4o-mini-tts speaks these well, with narrator instructions */
  const OPENAI_LANGS = new Set(["en","hi","mr","ta","kn","ur","es","fr","de","it","pt","pt-br","nl","pl","ru","ja","ko","zh","zh-cn","tr","ar","id","sv","da","fi","uk","th","fa"]);
  /* Gemini TTS adds Bengali and Telugu */
  const GEMINI_LANGS = new Set(["bn","te"]);
  function puterSpeaks(lang) {
    const b = baseLang(lang);
    return OPENAI_LANGS.has(b) || GEMINI_LANGS.has(b) || PUTER_LANGS.has(b);
  }
  /* tier: "studio" (cloud voice, one-time free Puter sign-in) | "device" | "" (not asked yet) */
  function voiceTier() { try { return localStorage.getItem("tsb_voice_tier") || ""; } catch (e) { return ""; } }
  function setVoiceTier(v) { try { localStorage.setItem("tsb_voice_tier", v); } catch (e) {} }
  /* v331: natural (cloud) voices are a Gold feature. Gold is decided by the
     server (gold.js); everyone else hears the phone's own voice. */
  function goldVoice() { try { return !!(window.TSB_GOLD && TSB_GOLD.isGold()); } catch (e) { return false; } }
  (function ensureGold() {
    if (window.TSB_GOLD || document.querySelector('script[src*="js/gold.js"]')) return;
    try {
      var sc = document.createElement("script");
      var me = document.querySelector('script[src*="tts-engine.js"]');
      sc.src = "js/gold.js" + (me && me.src.indexOf("?v=") > 0 ? "?v=" + me.src.split("?v=").pop() : "");
      (document.head || document.documentElement).appendChild(sc);
    } catch (e) {}
  })();
  function signedIn() {
    try { return !!(window.puter && window.puter.auth && window.puter.auth.isSignedIn && window.puter.auth.isSignedIn()); } catch (e) { return false; }
  }
  function currentLang() {
    try {
      const saved = JSON.parse(localStorage.getItem("tsb_lang")) || "en";
      if (saved === "hi-Latn") return "hi";
      if (saved === "gu-Latn") return "gu";
      return saved;
    } catch (e) { return "en"; }
  }

  /* ---------- Puter.js ---------- */
  function loadPuter() {
    return new Promise((resolve) => {
      if (puterReady) return resolve(true);
      if (window.puter && window.puter.ai && window.puter.ai.txt2speech) {
        puterReady = true;
        /* fast path (puter already loaded) - still fetch the voice list,
           otherwise gender/voice matching never gets a list */
        if (window.puter.ai.listTTSVoices) {
          try {
            window.puter.ai.listTTSVoices().then(function (v) { puterVoices = v || []; }).catch(function () {});
          } catch (e) {}
        }
        resolve(true); return;
      }
      if (puterLoading) {
        const iv = setInterval(() => {
          if (puterReady || (window.puter && window.puter.ai && window.puter.ai.txt2speech)) {
            clearInterval(iv); puterReady = true; resolve(true);
          }
        }, 200);
        setTimeout(() => { clearInterval(iv); resolve(puterReady); }, 4000);
        return;
      }
      puterLoading = true;
      /* one puter per page: dictate.js may already be loading it */
      if (!window.__tsbPuterTag) window.__tsbPuterTag = document.createElement("script");
      const sc = window.__tsbPuterTag;
      if (!sc.dataset.tsb) {
        sc.src = "https://js.puter.com/v2/";
        sc.dataset.tsb = "1";
      }
      sc.onload = () => {
        puterReady = !!(window.puter && window.puter.ai && window.puter.ai.txt2speech);
        if (puterReady && window.puter.ai.listTTSVoices) {
          try {
            window.puter.ai.listTTSVoices().then((v) => { puterVoices = v || []; }).catch(() => {});
          } catch (e) {}
        }
        puterLoading = false;
        resolve(puterReady);
      };
      var retried = false;
      sc.onerror = () => {
        if (!retried) {
          retried = true;
          puterLoading = false;
          /* mobile networks can be flaky - one retry after 1.5s */
          setTimeout(loadPuter, 1500);
          return;
        }
        puterLoading = false; resolve(false);
      };
      /* HARD TIMEOUT: if the script hangs (no load/error event - common on
         flaky mobile networks), NEVER leave the queue stuck. Resolve now so
         Web Speech takes over. */
      setTimeout(function () {
        puterLoading = false;
        resolve(puterReady);
      }, 4000);
      document.head.appendChild(sc);
    });
  }
  function genderPref() {
    try { return localStorage.getItem("tsb_voice_gender") || "auto"; } catch (e) { return "auto"; }
  }
  function setGenderPref(v) {
    try { localStorage.setItem("tsb_voice_gender", v); } catch (e) {}
  }
  function voiceGenderOf(name) {
    const n = String(name || "").toLowerCase();
    if (/\b(male|man|masc)\b/.test(n) || /\b(m)[\s\u2014-]/i.test(n)) return "male";
    if (/\b(female|woman|fem)\b/.test(n) || /\b(f)[\s\u2014-]/i.test(n)) return "female";
    return "auto";
  }
  function pickPuterVoice(lang) {
    const wantBase = baseLang(lang);
    const pref = genderPref();
    if (!puterVoices.length) return null;
    const norm = (x) => String(x || "").toLowerCase();
    /* STRICT match: voice's base language must equal the requested base.
       e.g. Hindi text → only voices whose lang starts with "hi".
       No lenient cross-language fallback (that's what made Puter read
       Hindi in an English voice). For English, any voice is fine. */
    const byLang = puterVoices.filter((v) => {
      const vl = norm(v.lang || "");
      const vBase = vl.split("-")[0] || vl;
      return vBase === wantBase;
    });
    const pool = byLang.length ? byLang : (wantBase === "en" ? puterVoices : []);
    if (!pool.length) return null;
    if (pref !== "auto") {
      const g = pool.filter((v) => voiceGenderOf(v.name || v.id || "") === pref);
      if (g.length) return g[0];
    }
    return pool[0] || null;
  }
  const NARRATE = {
    en: "You are a warm, calm audiobook narrator with a light Indian-English accent. Read clearly and unhurriedly, like sharing a good book with a friend. Small natural pauses at commas, a fuller pause at full stops. Never rush lists.",
    hi: "Aap ek garam, shaant audiobook narrator hain. Saaf, thehri hui shuddh Hindi mein padhiye, jaise kisi dost ko achhi kitaab sunaa rahe hon. Viraam par halka sa thehraav.",
    other: "Warm, calm audiobook narrator. Native pronunciation for this language, clear and unhurried, natural pauses."
  };
  function studioVoiceFor(lang) {
    const g = genderPref();
    const b = baseLang(lang);
    if (GEMINI_LANGS.has(b)) return { provider: "gemini", voice: g === "male" ? "Charon" : "Kore", instructions: NARRATE.other };
    return { provider: "openai", model: "gpt-4o-mini-tts", voice: g === "male" ? "cedar" : "marin", instructions: NARRATE[b] || NARRATE.other, response_format: "mp3" };
  }
  const synthCache = new Map();          /* text|voice -> Promise<HTMLAudioElement|null> */
  function synth(text, lang) {
    const v = studioVoiceFor(lang);
    const key = v.provider + "|" + v.voice + "|" + lang + "|" + text;
    if (synthCache.has(key)) return synthCache.get(key);
    const ladder = [
      Object.assign({}, v),
      { provider: "aws-polly", engine: "neural", language: region(lang), voice: baseLang(lang) === "hi" ? "Kajal" : (baseLang(lang) === "en" ? "Kajal" : undefined) }
    ];
    const run = (i) => {
      if (i >= ladder.length) return Promise.resolve(null);
      const o = ladder[i];
      Object.keys(o).forEach((k) => { if (o[k] === undefined) delete o[k]; });
      let p;
      try { p = window.puter.ai.txt2speech(String(text).slice(0, 2900), o); } catch (e) { p = Promise.reject(e); }
      return Promise.resolve(p).then((a) => (a && a.play ? a : run(i + 1))).catch(() => run(i + 1));
    };
    const pr = run(0);
    synthCache.set(key, pr);
    if (synthCache.size > 24) synthCache.delete(synthCache.keys().next().value);
    pr.then((a) => { if (!a) synthCache.delete(key); });
    return pr;
  }
  /* warm the next chunk while this one plays: gapless chapters */
  function prefetchNext() {
    try {
      const nx = queue[curIdx + 1];
      if (nx && nx.text && goldVoice() && voiceTier() === "studio" && signedIn() && puterSpeaks(nx.lang || currentLang())) synth(nx.text, nx.lang || currentLang());
    } catch (e) {}
  }
  /* ---------- TheSmallBook Voice Model: private, on-device, opt-in ---------- */
  let modelApi = null, modelLoading = null;
  function modelChoice() {
    try {
      var c = localStorage.getItem("tsb_voice_model") || "";
      if (c === "plus" && !goldVoice()) return "";
      return c === "basic" || c === "plus" ? c : "";
    } catch (e) { return ""; }
  }
  function setModelChoice(c) {
    try { localStorage.setItem("tsb_voice_model", c === "plus" ? "plus" : c === "basic" ? "basic" : ""); } catch (e) {}
  }
  function modelLang(lang) { return baseLang(lang) === "hi" ? "hi" : baseLang(lang) === "en" ? "en" : ""; }
  function getModelApi() {
    if (modelApi) return Promise.resolve(modelApi);
    if (modelLoading) return modelLoading;
    modelLoading = import("./tts-piper.mjs?v=343").then(function (m) { modelApi = m; return m; }).catch(function (e) { modelLoading = null; throw e; });
    return modelLoading;
  }
  function modelVoiceName() {
    var c = modelChoice();
    return c === "plus" ? "TheSmallBook Voice Model Plus" : c === "basic" ? "TheSmallBook Voice Model" : "Phone voice";
  }
  function playModelBlob(blob, text, speedV, done) {
    var u = URL.createObjectURL(blob), audio = new Audio();
    audio.src = u; audio.preload = "auto";
    var ended = false, safety = null;
    function end(ok) {
      if (ended) return; ended = true;
      if (safety) clearTimeout(safety);
      try { URL.revokeObjectURL(u); } catch (e) {}
      if (currentAudio === audio) currentAudio = null;
      clearPosition(); done(ok);
    }
    audio.onended = function () { end(true); };
    audio.onerror = function () { end(false); };
    if (currentAudio && currentAudio !== audio) { try { currentAudio.pause(); } catch (e) {} }
    currentAudio = audio;
    /* Pace is made by the model's duration scale rather than crude browser
       time-stretching, which removes the dragged-out gaps between phrases. */
    try { audio.preservesPitch = true; audio.playbackRate = 1; } catch (e) {}
    routeBoost(audio);
    function position() {
      var d = audio.duration;
      startPosition(d && isFinite(d) ? d : Math.max(5, String(text).length / (15 * (speedV || 1.08))));
    }
    audio.onloadedmetadata = position;
    safety = setTimeout(function () { end(true); }, Math.max(10000, (String(text).length / Math.max(9, 12 * (speedV || 1))) * 1000 + 12000));
    audio.play().then(function () { position(); }).catch(function () { end(false); });
  }
  function playModelStream(api, text, choice, lang, speedV, keep) {
    return new Promise(function (resolve) {
      var blobs = [], active = false, sourceDone = false, heard = 0, finished = false;
      function finish(ok) { if (finished) return; finished = true; if (modelStreamResume === pump) modelStreamResume = null; clearPosition(); resolve(ok); }
      function pump() {
        if (finished || active) return;
        if (keep !== gen || !playing || paused) { finish(false); return; }
        var blob = blobs.shift();
        if (!blob) { if (sourceDone) finish(heard > 0); return; }
        active = true; heard++;
        var url = URL.createObjectURL(blob), audio = new Audio();
        audio.src = url; audio.preload = "auto";
        function close(ok) {
          try { URL.revokeObjectURL(url); } catch (e) {}
          if (currentAudio === audio) currentAudio = null;
          active = false;
          if (!ok) { finish(false); return; }
          pump();
        }
        audio.onended = function () { close(true); };
        audio.onerror = function () { close(false); };
        if (currentAudio && currentAudio !== audio) { try { currentAudio.pause(); } catch (e) {} }
        currentAudio = audio;
        try { audio.preservesPitch = true; audio.playbackRate = 1; } catch (e) {}
        routeBoost(audio);
        function position() { var d = audio.duration; startPosition(d && isFinite(d) ? d : Math.max(5, String(text).length / (15 * (speedV || 1.08)))); }
        audio.onloadedmetadata = position;
        audio.play().then(position).catch(function () { close(false); });
      }
      modelStreamResume = pump;
      /* if the model does not hand back its first phrase quickly, give the
         sentence to the device voice instead of waiting in silence */
      var firstBlob = setTimeout(function () {
        if (!heard && keep === gen) finish(false);
      }, 9000);
      var clearFirst = function () { if (firstBlob) { clearTimeout(firstBlob); firstBlob = null; } };
      api.speakStream(text, { tier: choice, lang: lang, rate: speedV || 1.08 }, function (blob) {
        clearFirst();
        /* Keep work already made while paused. Resuming must never lose the
           rest of a passage just because the worker finished in the pause. */
        if (keep !== gen || !playing) return;
        blobs.push(blob); if (!paused) pump();
      }).then(function () { clearFirst(); sourceDone = true; if (!paused) pump(); }).catch(function () { clearFirst(); sourceDone = true; if (!heard) finish(false); else if (!paused) pump(); });
    });
  }
  function speakModel(text, lang, speedV) {
    var choice = modelChoice(), ml = modelLang(lang);
    if (!choice || !ml) return Promise.resolve(false);
    var keep = gen;
    return getModelApi().then(function (api) {
      return api.status().then(function (all) {
        var row = all.filter(function (x) { return x.tier === choice && x.lang === ml; })[0];
        if (!row || !row.stored) return false;
        provider = "model";
        return playModelStream(api, text, choice, ml, speedV, keep);
      });
    }).catch(function () { return false; });
  }
  function offerVoiceModel() {
    var asked = false;
    try { asked = sessionStorage.getItem("tsb_voice_model_asked") === "1"; } catch (e) {}
    if (asked || document.getElementById("tsbVoiceModel")) return;
    try { sessionStorage.setItem("tsb_voice_model_asked", "1"); } catch (e) {}
    var lang = modelLang(currentLang()) || "en", d = document.createElement("div");
    d.id = "tsbVoiceModel";
    d.style.cssText = "position:fixed;z-index:2147483002;inset:auto 12px calc(env(safe-area-inset-bottom,0px) + 16px);max-width:480px;margin:auto;background:#fffdf8;color:#16130f;border:1px solid #e7dfd0;border-radius:24px;padding:18px;box-shadow:0 24px 70px rgba(22,19,15,.28);font-family:'Space Grotesk',system-ui,sans-serif;animation:tsbVoiceRise .42s cubic-bezier(.16,1,.3,1)";
    d.innerHTML = "<style>@keyframes tsbVoiceRise{from{transform:translateY(24px);opacity:0}}.tvm-p{font:600 12px/1.45 Space Grotesk,system-ui;color:#6e6658;margin:6px 0 0}.tvm-b{border:0;border-radius:999px;padding:12px 15px;background:#ffc800;color:#16130f;font:700 14px Space Grotesk,system-ui;cursor:pointer}.tvm-n{border:0;border-radius:999px;padding:12px 14px;background:#f0eadf;color:#16130f;font:600 14px Space Grotesk,system-ui;cursor:pointer}</style>" +
      "<div style=\"font:700 10px/1 Space Grotesk,system-ui;letter-spacing:.16em;color:#8a6910\">LISTEN ON THIS DEVICE</div>" +
      "<div style=\"font:600 23px/1.12 Newsreader,Georgia,serif;margin:7px 0 0\">Meet TheSmallBook Voice Model</div>" +
      "<p class=\"tvm-p\">A warm reading voice that runs on this device. One download of about 63 MB. Your listening text stays here.</p>" +
      "<div style=\"display:flex;gap:8px;margin-top:14px;align-items:center\"><button type=\"button\" class=\"tvm-b\" data-vm=\"download\">Download voice</button><button type=\"button\" class=\"tvm-n\" data-vm=\"later\">Not now</button></div>" +
      (goldVoice() ? "<button type=\"button\" data-vm=\"plus\" style=\"display:block;width:100%;margin-top:10px;border:0;background:transparent;color:#725a14;text-align:left;font:600 12px Space Grotesk,system-ui;cursor:pointer\">Gold: choose Voice Model Plus instead</button>" : "");
    document.body.appendChild(d);
    d.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-vm");
      if (a === "later") { d.remove(); return; }
      if (a === "plus") { d.remove(); openVoiceModel("plus"); return; }
      b.disabled = true; b.textContent = "Preparing…";
      getModelApi().then(function (api) { return api.download("basic", lang, function (p) { if (p.phase === "model" && p.total) b.textContent = "Downloading " + Math.min(99, Math.round(p.loaded / p.total * 100)) + "%"; else if (p.phase === "engine") b.textContent = "Making it available offline…"; }); }).then(function () {
        setModelChoice("basic"); b.textContent = "Voice ready"; setTimeout(function () { d.remove(); }, 700);
        if (window.TSB && TSB.toast) try { TSB.toast("TheSmallBook Voice Model is ready."); } catch (e2) {}
      }).catch(function (er) { b.disabled = false; b.textContent = "Try download again"; });
    });
  }
  function openVoiceModel(want, onReady) {
    var lang = modelLang(currentLang()) || "en", choice = want === "plus" && goldVoice() ? "plus" : "basic";
    if (document.getElementById("tsbVoiceModel")) document.getElementById("tsbVoiceModel").remove();
    var settled = false;
    function finishVoice(ok) { if (settled) return; settled = true; if (d && d.parentNode) d.remove(); if (onReady) onReady(!!ok); }
    var d = document.createElement("div"); d.id = "tsbVoiceModel";
    d.style.cssText = "position:fixed;z-index:2147483002;inset:0;background:rgba(22,19,15,.42);padding:18px;display:flex;align-items:flex-end;justify-content:center;font-family:'Space Grotesk',system-ui";
    d.innerHTML = "<div style=\"width:min(520px,100%);background:#fffdf8;color:#16130f;border-radius:26px;padding:20px;box-shadow:0 28px 70px rgba(0,0,0,.25)\"><div style=\"font:700 10px/1 Space Grotesk,system-ui;letter-spacing:.16em;color:#8a6910\">YOUR LISTENING VOICE</div><h2 style=\"font:600 27px/1.1 Newsreader,Georgia,serif;margin:8px 0\">TheSmallBook Voice Model</h2><p style=\"font:600 13px/1.45 Space Grotesk,system-ui;color:#6e6658;margin:0 0 15px\">Download once, then listen privately on this device. About 63 MB per language.</p><div data-vm-options></div><button data-vm-phone style=\"width:100%;margin-top:10px;padding:13px;border:1px solid #e7dfd0;border-radius:16px;background:#fff;color:#16130f;font:600 13.5px Space Grotesk,system-ui;cursor:pointer\">Use my phone voice instead</button><button data-vm-close style=\"margin-top:10px;border:0;background:transparent;font:600 13px Space Grotesk,system-ui;color:#6e6658;cursor:pointer;width:100%\">Close</button><p style=\"font:500 11.5px/1.4 Space Grotesk,system-ui;color:#8a8272;margin:10px 0 0;text-align:center\">Downloaded once, it stays on this device until you clear your browser data.</p></div>";
    document.body.appendChild(d);
    var opts = d.querySelector("[data-vm-options]");
    function row(tier, label, note) {
      var allowed = tier !== "plus" || goldVoice(), on = modelChoice() === tier;
      return '<button data-vm-tier="' + tier + '" ' + (allowed ? "" : "disabled") + ' style="width:100%;margin-top:8px;padding:14px;text-align:left;border:1px solid ' + (on ? '#d6ab18' : '#e7dfd0') + ';border-radius:16px;background:' + (on ? '#fff4c6' : '#fff') + ';color:#16130f;font:600 14px Space Grotesk,system-ui;cursor:' + (allowed ? 'pointer' : 'default') + '"><b>' + label + '</b><small style="display:block;margin-top:3px;font:500 12px Space Grotesk,system-ui;color:#6e6658">' + note + '</small></button>';
    }
    opts.innerHTML = row("basic", "TheSmallBook Voice Model", "Warm on-device voice · English and Hindi") + row("plus", "TheSmallBook Voice Model Plus", goldVoice() ? "Gold voice · richer detail, downloaded only when you choose" : "Gold voice · available with Gold") + (goldVoice() ? '<div data-plus-voices style="margin-top:8px"></div>' : "");
    if (goldVoice()) getModelApi().then(function(api){ var host=d.querySelector("[data-plus-voices]"); if(!host) return; host.innerHTML=(api.PLUS_VOICES[lang]||[]).map(function(v){return '<button type="button" data-plus-voice="'+v.id+'" style="margin:5px 5px 0 0;border:1px solid #e7dfd0;border-radius:999px;padding:7px 10px;background:#fff;color:#16130f;font:600 12px Space Grotesk,system-ui;cursor:pointer">'+v.name+'</button>';}).join(""); }).catch(function(){});
    d.addEventListener("click", function (e) {
      if (e.target.closest("[data-vm-phone]")) { setModelChoice(""); skipVoiceFor(30); finishVoice(false); return; }
      if (e.target === d || e.target.closest("[data-vm-close]")) { finishVoice(false); return; }
      var pv = e.target.closest("[data-plus-voice]");
      if (pv) { getModelApi().then(function(api){ api.selectVoice(lang,pv.getAttribute("data-plus-voice")); return api.download("plus",lang); }).then(function(){ setModelChoice("plus"); finishVoice(true); }).catch(function(){}); return; }
      var b = e.target.closest("[data-vm-tier]"); if (!b || b.disabled) return;
      var tier = b.getAttribute("data-vm-tier"); b.disabled = true; b.querySelector("small").textContent = "Checking this device…";
      getModelApi().then(function (api) { return api.status().then(function (a) { var x = a.filter(function (z) { return z.tier === tier && z.lang === lang; })[0]; if (x && x.stored) return null; return api.download(tier, lang, function (p) { if (p.phase === "model" && p.total) b.querySelector("small").textContent = "Downloading " + Math.min(99, Math.round(p.loaded / p.total * 100)) + "%"; else if (p.phase === "engine") b.querySelector("small").textContent = "Making it available offline…"; }); }); }).then(function () {
        setModelChoice(tier); b.querySelector("small").textContent = "Ready on this device"; if (window.TSB && TSB.toast) try { TSB.toast("Voice selected. It will begin on the next passage."); } catch (e2) {}
        setTimeout(function () { finishVoice(true); if (playing && !paused) seekTo(curIdx); }, 250);
      }).catch(function () { b.disabled = false; b.querySelector("small").textContent = "Could not download. Try again when online."; });
    });
  }

  function ensureVoiceModel(lang) {
    var ml = modelLang(lang || currentLang());
    /* A phone voice remains the only possible route for languages for which
       this on-device model has no pronunciation model yet. */
    if (!ml) return Promise.resolve(true);
    return getModelApi().then(function (api) { return api.status(); }).then(function (all) {
      var choice = modelChoice(), stored = function (tier) { var r = all.filter(function (x) { return x.tier === tier && x.lang === ml; })[0]; return !!(r && r.stored); };
      if (choice && stored(choice)) return true;
      return new Promise(function (resolve) { openVoiceModel(choice || "basic", resolve); });
    }).catch(function () { return false; });
  }

  function speakPuter(text, lang, speedV) {
    return new Promise((resolve) => {
      const g = gen;
      if (!goldVoice() || !(window.puter && window.puter.ai && window.puter.ai.txt2speech) || voiceTier() !== "studio" || !signedIn()) { resolve(false); return; }
      let settled = false;
      const giveUp = setTimeout(function () { if (!settled) { settled = true; resolve(false); } }, 12000);
      synth(text, lang).then((audio) => {
        if (settled) return;
        settled = true; clearTimeout(giveUp);
        if (!audio || g !== gen || !playing || paused) { resolve(false); return; }
        let done = false, safetyT = null;
        const end = (ok) => {
          if (!done) { done = true; if (safetyT) clearTimeout(safetyT); if (currentAudio === audio) currentAudio = null; clearPosition(); resolve(ok); }
        };
        const tryEndFromTime = () => {
          try {
            const d = audio.duration;
            if (d && isFinite(d) && d > 0 && audio.currentTime >= d - 0.3) { end(true); return true; }
            if (audio.ended) { end(true); return true; }
          } catch (e) {}
          return false;
        };
        audio.onended = () => end(true);
        audio.onerror = () => end(false);
        try { audio.ontimeupdate = () => { if (!done) tryEndFromTime(); }; } catch (e) {}
        safetyT = setTimeout(function () {
          if (!done) { try { if (!tryEndFromTime()) end(true); } catch (e) { end(true); } }
        }, Math.max(8000, (text.length / (12 * (speedV || 1))) * 1000 + 4000));
        if (currentAudio && currentAudio !== audio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
        currentAudio = audio;
        try { audio.currentTime = 0; } catch (e) {}
        try { audio.volume = 1.0; audio.preservesPitch = true; audio.playbackRate = Math.max(0.5, Math.min(2.5, speedV || 1)); } catch (e) {}
        routeBoost(audio);
        const grabDur = () => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) startPosition(audio.duration / (speedV || 1));
          else startPosition(Math.max(5, text.length / (15 * (speedV || 1))));
        };
        if (audio.readyState >= 1) grabDur(); else { try { audio.onloadedmetadata = grabDur; } catch (e) {} }
        audio.play().then(function () { grabDur(); prefetchNext(); }).catch(() => end(false));
      }).catch(() => { if (!settled) { settled = true; clearTimeout(giveUp); resolve(false); } });
    });
  }

  /* v331: free readers hear the phone voice; once a session, a quiet card
     says natural voices come with Gold. */
  function offerGoldVoice() {
    if (goldVoice() || document.getElementById("tsbStudioAsk")) return;
    try { if (sessionStorage.getItem("tsb_studio_asked")) return; sessionStorage.setItem("tsb_studio_asked", "1"); } catch (e) {}
    const d = document.createElement("div");
    d.id = "tsbStudioAsk";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-label", "Natural voices");
    d.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:100001;max-width:460px;margin:0 auto;background:#16130F;color:#F3EDE2;border-radius:22px;padding:16px 16px 14px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:'Space Grotesk',system-ui,sans-serif;animation:tsbAskIn .45s cubic-bezier(.16,1,.3,1)";
    d.innerHTML = "<style>@keyframes tsbAskIn{from{transform:translateY(24px);opacity:0}}</style>" +
      "<div style=\"font:700 10px/1 'Space Grotesk';letter-spacing:.2em;text-transform:uppercase;color:#E9C46A\">Gold</div>" +
      "<div style=\"font:500 21px/1.2 Newsreader,Georgia,serif;margin:8px 0 6px\">Hear it in a natural voice</div>" +
      "<div style=\"font-size:13.5px;line-height:1.45;opacity:.75\">You are on your phone's voice. Gold reads every book like a real narrator, in English, Hindi and more.</div>" +
      "<div style=\"display:flex;gap:8px;margin-top:12px\"><a href=\"gold.html\" style=\"flex:1;text-align:center;text-decoration:none;border-radius:999px;padding:12px 14px;background:linear-gradient(100deg,#D9AE4E,#F4D98C 50%,#D9AE4E);color:#16130F;font:700 14px 'Space Grotesk'\">See Gold</a>" +
      "<button type=\"button\" data-a=\"no\" style=\"border:0;border-radius:999px;padding:12px 16px;background:rgba(255,255,255,.08);color:inherit;font:600 14px 'Space Grotesk';cursor:pointer\">Not now</button></div>";
    document.body.appendChild(d);
    d.addEventListener("click", function (e) { if (e.target.closest("[data-a=no]")) d.remove(); });
    setTimeout(function () { if (d.parentNode) d.remove(); }, 12000);
  }

  /* one calm, one-time choice instead of a surprise sign-in popup */
  function offerStudio() {
    if (voiceTier() || document.getElementById("tsbStudioAsk")) return;
    try { if (sessionStorage.getItem("tsb_studio_asked")) return; sessionStorage.setItem("tsb_studio_asked", "1"); } catch (e) {}
    const d = document.createElement("div");
    d.id = "tsbStudioAsk";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-label", "Studio voice");
    d.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:100001;max-width:460px;margin:0 auto;background:var(--paper,#FBF8F1);color:var(--ink,#16130F);border-radius:22px;padding:16px 16px 14px;box-shadow:0 18px 50px rgba(22,19,15,.22);font-family:'Space Grotesk',system-ui,sans-serif;animation:tsbAskIn .45s cubic-bezier(.16, 1, .3, 1)";
    d.innerHTML = "<style>@keyframes tsbAskIn{from{transform:translateY(24px);opacity:0}}</style>" +
      "<div style=\"font:600 10px/1 'Space Grotesk';letter-spacing:.2em;text-transform:uppercase;opacity:.6\">Listening now on your phone voice</div>" +
      "<div style=\"font:600 21px/1.2 Newsreader,Georgia,serif;margin:8px 0 6px\">Want the studio voice?</div>" +
      "<div style=\"font-size:13.5px;line-height:1.45;opacity:.78\">Part of your Gold. A natural narrator for English, Hindi, Marathi, Tamil and more, after a one-time Puter sign-in.</div>" +
      "<div style=\"display:flex;gap:8px;margin-top:12px\"><button type=\"button\" data-a=\"yes\" style=\"flex:1;border:0;border-radius:999px;padding:12px 14px;background:#FFC800;color:#16130F;font:700 14px 'Space Grotesk';cursor:pointer\">Turn it on</button>" +
      "<button type=\"button\" data-a=\"no\" style=\"border:0;border-radius:999px;padding:12px 16px;background:rgba(22,19,15,.06);color:inherit;font:600 14px 'Space Grotesk';cursor:pointer\">Not now</button></div>";
    document.body.appendChild(d);
    d.addEventListener("click", function (e) {
      const b = e.target.closest("button"); if (!b) return;
      if (b.getAttribute("data-a") === "yes") {
        const go = function () {
          try {
            Promise.resolve(window.puter.auth.signIn()).then(function () {
              if (signedIn()) { setVoiceTier("studio"); if (window.TSB && window.TSB.toast) { try { window.TSB.toast("Studio voice is on"); } catch (e2) {} } }
            }).catch(function () {});
          } catch (e3) {}
        };
        if (window.puter && window.puter.auth) go(); else loadPuter().then(function () { if (window.puter && window.puter.auth) go(); });
      } else setVoiceTier("device");
      d.remove();
    });
  }

  /* ---------- Web Speech fallback ---------- */
  function voicesList() {
    if (!SPK) return [];
    try { return SPK.getVoices() || []; } catch (e) { return []; }
  }
  function bestVoice(lang) {
    const voices = voicesList();
    if (!voices.length) return null;
    const want = normLang(region(lang));
    const wantBase = baseLang(lang);
    let pool = voices.filter((v) => normLang(v.lang) === want);
    if (!pool.length) pool = voices.filter((v) => baseLang(v.lang) === wantBase);
    if (!pool.length) return null;
    const pref = genderPref();
    const score = (v) => {
      let sc = 0;
      if (/natural|neural|premium|enhanced|wavenet/i.test(v.name)) sc += 0; else sc += 1;
      if (/^Google/i.test(v.name)) sc += 0; else sc += 1;
      if (/^Microsoft/i.test(v.name)) sc += 1;
      if (pref !== "auto" && voiceGenderOf(v.name) === pref) sc -= 2; // strong preference
      return sc;
    };
    return pool.sort((a, b) => score(a) - score(b))[0];
  }
  function voicesReady(timeoutMs) {
    return new Promise(function (resolve) {
      var vs = voicesList();
      if (vs.length) return resolve(vs);
      var t0 = Date.now();
      var iv = setInterval(function () {
        var v2 = voicesList();
        if (v2.length || Date.now() - t0 > (timeoutMs || 2500)) {
          clearInterval(iv); resolve(v2);
        }
      }, 150);
    });
  }

  /* v334 device voice that keeps playing:
     - split into sentence pieces of at most 180 characters (Chrome stops
       long utterances after about 15 s and never fires onend);
     - a watchdog per piece, so a lost onend can never freeze the queue;
     - if the chosen voice fails or never starts, retry once with the
       phone's default voice;
     - clear a stuck "speaking" state before the first piece. */
  function pieces(text) {
    var out = [], parts = String(text || "").replace(/\s+/g, " ").trim().match(/[^.!?\u0964]+[.!?\u0964]*["'\u201d\u2019)]*\s*/g) || [];
    parts.forEach(function (p) {
      p = p.trim(); if (!p) return;
      while (p.length > 180) {
        var cut = p.lastIndexOf(", ", 180); if (cut < 60) cut = p.lastIndexOf(" ", 180); if (cut < 40) cut = 180;
        out.push(p.slice(0, cut + 1).trim()); p = p.slice(cut + 1).trim();
      }
      if (out.length && out[out.length - 1].length + p.length < 120) out[out.length - 1] += " " + p; else if (p) out.push(p);
    });
    return out.length ? out : [String(text || "")];
  }
  var webPrimed = false, webResume = null, webCancel = null, webBusy = false;
  function speakWeb(text, lang, speedV, done) {
    if (!SPK || !window.SpeechSynthesisUtterance) return done(false);
    startPosition(Math.max(5, String(text).length / (15 * (speedV || 1))));
    var list = pieces(text), i = 0, myGen = gen, anyOk = false;
    function step() {
      if (myGen !== gen || !playing || paused) { done(false); return; }
      if (i >= list.length) { done(anyOk); return; }
      one(list[i], true, function (ok) { if (ok) anyOk = true; i++; step(); }, i === 0);
    }
    function one(t, useVoice, cb, isFirst) {
      var u = new SpeechSynthesisUtterance(t);
      utter = u;
      var v = useVoice ? bestVoice(lang) : null;
      if (v) { try { u.voice = v; } catch (e) { v = null; } }
      u.lang = v ? v.lang : region(lang);
      u.rate = Math.min(2, Math.max(0.5, speedV));
      var pref = genderPref();
      var vGender = v ? voiceGenderOf(v.name) : "auto";
      if (pref === "male" && vGender !== "male") u.pitch = 0.72;
      else if (pref === "female" && vGender !== "female") u.pitch = 1.28;
      else u.pitch = 1;
      u.volume = 1;
      var fin = false, began = false;
      webBusy = true;
      var limit = 4000 + (t.length / Math.max(0.5, speedV)) * 110;
      function end(ok) {
        if (fin) return;
        if (paused && myGen === gen && playing) {
          /* paused: remember this piece and say it again on resume */
          fin = true; clearTimeout(t1); clearTimeout(t2);
          webBusy = false;
          webResume = function () { one(t, useVoice, cb); };
          return;
        }
        fin = true; clearTimeout(t1); clearTimeout(t2); webBusy = false;
        if (!ok && useVoice && !began && myGen === gen && playing && !paused) { one(t, false, cb); return; }
        cb(ok);
      }
      /* the very first sentence of a session is the slowest one on Android -
         cancelling it at three seconds was exactly how a book went quiet */
      var startWindow = isFirst ? 7000 : 4000;
      var t1 = setTimeout(function () { if (!began && !(SPK.speaking && !SPK.paused)) { try { SPK.cancel(); } catch (e) {} end(false); } }, startWindow);
      var t2 = setTimeout(function () { if (!paused) { try { SPK.cancel(); } catch (e) {} end(began); } }, limit);
      webCancel = function () { end(false); };
      u.onstart = function () { began = true; clearTimeout(t1); };
      u.onend = function () { end(true); };
      u.onerror = function (e) { if (myGen !== gen) { fin = true; clearTimeout(t1); clearTimeout(t2); return; } end(false); };
      try {
        if (!webPrimed) { webPrimed = true; if (SPK.speaking || SPK.pending) SPK.cancel(); }
        if (SPK.paused && !paused) SPK.resume();
        SPK.speak(u);
      } catch (e) { end(false); }
    }
    /* Android returns an empty voice list at first - wait for it, then
       speak with the correct regional voice (gu-IN, hi-IN...) */
    voicesReady(1500).then(step);
  }

  /* ---------- background keep-alive ----------
     Chrome/Android suspends a tab when NO media is playing - between chunks
     there is a gap with zero audio, so the queue dies on lock screen.
     A looping silent WAV keeps the tab "actively playing media" the whole
     time, so timers + queue keep running with the screen off. */
  function startSilence() {
    try {
      if (!silenceEl) {
        silenceEl = new Audio(SILENCE_SRC);
        silenceEl.loop = true;
        silenceEl.volume = 0;
        silenceEl.setAttribute("playsinline", "");
      }
      const p = silenceEl.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function stopSilence() {
    if (!silenceEl) return;
    try { silenceEl.pause(); } catch (e) {}
    silenceEl = null;
  }

  /* ---------- volume BOOST (louder than max) ----------
     An <audio> element clamps its volume at 1.0 - on many phones that still
     sounds soft. Routing the audio through a Web Audio GainNode lets us go
     to 1.5x/2x - genuinely louder on mobile. */
  function ensureBoost() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = boost;
        gainNode.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") { try { audioCtx.resume(); } catch (e) {} }
      gainNode.gain.value = boost;
      return gainNode;
    } catch (e) { return null; }
  }
  function routeBoost(audio) {
    if (!audio || !audio.play) return;
    try {
      if (!ensureBoost()) return;
      var src = audioCtx.createMediaElementSource(audio);
      src.connect(gainNode);
    } catch (e) {}
  }
  function setBoost(v) {
    boost = v;
    if (gainNode) { try { gainNode.gain.value = v; } catch (e) {} }
    if (player) {
      var b = player.querySelector('[data-act="boost"]');
      if (b) b.textContent = "🔊 " + v.toFixed(2).replace(/\.?0+$/, "") + "x";
    }
  }
  function cycleBoost() {
    var boosts = [1, 1.5, 2];
    var i = boosts.indexOf(boost);
    setBoost(boosts[(i + 1) % boosts.length]);
  }

  /* ---------- speak one item ----------
     RULE: listening never dead-ends.
     The order of preference is the private model, then the studio voice for
     Gold, then the phone's own voice - but a route that produces no sound
     always hands the sentence to the next one. A tap on Listen is a promise
     that something speaks, so no provider is allowed to hold the queue. */
  let modelFails = 0;          // a model that cannot start steps aside this session
  let quietItems = 0;          // sentences that came back with zero audio
  let heardItems = 0;          // sentences that actually played
  let modelHinted = false;     // the download offer appears once, never as a wall
  let prompting = false;       // a download sheet is open right now

  /* v342 · THE VOICE IS A ONE-TIME DOWNLOAD THAT STAYS
     Tapping Listen for the very first time asks for the voice model once. Once
     it is on the device it is kept in browser storage, and every Listen after
     that plays it straight away, with no sheet and no wait. If the reader says
     "phone voice", we respect that for thirty days instead of asking again. */
  const SKIP_KEY = "tsb_voice_skip_until";
  function voiceSkipped() {
    try { return +(localStorage.getItem(SKIP_KEY) || 0) > Date.now(); } catch (e) { return false; }
  }
  function skipVoiceFor(days) {
    try { localStorage.setItem(SKIP_KEY, String(Date.now() + (days || 30) * 864e5)); } catch (e) {}
  }
  function clearVoiceSkip() { try { localStorage.removeItem(SKIP_KEY); } catch (e) {} }

  function hintVoiceModel(laterMs) {
    /* pages outside the player (kids, story) still get one quiet offer */
    if (modelChoice() || modelHinted || prompting || voiceSkipped()) return;
    modelHinted = true;
    setTimeout(function () {
      if (!playing || paused) return;
      if (modelChoice() || prompting || voiceSkipped()) return;
      prompting = true;
      try {
        openVoiceModel("basic", function (ok) {
          prompting = false;
          if (ok) { clearVoiceSkip(); try { if (playing && !paused && !modelChoice()) seekTo(curIdx); } catch (e) {} }
          else skipVoiceFor(30);
        });
      } catch (e) { prompting = false; }
    }, laterMs || 20000);
  }
  function noSoundAtAll() {
    if (heardItems > 0) return;
    if (window.TSB && TSB.toast) {
      try { TSB.toast("This device has no reading voice installed. Install one in your phone's text to speech settings, or download TheSmallBook Voice Model."); } catch (e) {}
    }
    if (!voiceSkipped() && !prompting) { prompting = true; try { openVoiceModel("basic", function () { prompting = false; }); } catch (e) { prompting = false; } }
  }
  function speakItem(item, done) {
    if (window.TSB) { try { window.TSB.achv.award("listener"); } catch (e) {} }
    const g = gen;
    if (!playing || paused) return done(false);
    const lang = item.lang || currentLang();
    const spd = speed;
    const settle = (ok) => {
      if (g !== gen) return done(false);
      if (ok) { heardItems++; quietItems = 0; } else quietItems++;
      /* four silent sentences in a row means the voice is not going to come
         back on its own - say so once instead of turning pages in silence */
      if (quietItems === 4) noSoundAtAll();
      done(ok);
    };
    const device = () => speakWeb(item.text, lang, spd, settle);
    const studio = () => {
      speakPuter(item.text, lang, spd).then((ok) => {
        if (g !== gen) return done(false);
        if (!playing || paused) return done(false);
        if (ok) settle(true); else device();
      });
    };
    /* 1 - the private voice model, when the reader keeps one */
    if (modelChoice() && modelLang(lang) && modelFails < 2) {
      speakModel(item.text, lang, spd).then(function (okModel) {
        if (g !== gen) return done(false);
        if (okModel) return settle(true);
        if (!playing || paused) return done(false);
        modelFails++;
        if (modelFails === 1 && window.TSB && TSB.toast) {
          try { TSB.toast("That voice could not start. Using your device voice instead."); } catch (e) {}
        }
        device();
      });
      return;
    }
    /* 2 - the first Listen on this device asks for the voice once. Download it
       and it lives here for good; choose the phone voice and we stop asking.
       Either answer ends in sound, never in a blank page. */
    if (modelLang(lang) && !voiceSkipped() && !prompting) {
      prompting = true;
      openVoiceModel("basic", function (ok) {
        prompting = false;
        if (g !== gen) return done(false);
        if (ok) {
          clearVoiceSkip();
          /* the model is stored now: speak this very line with it */
          if (playing && !paused) speakItem(item, done);
          else done(false);
        } else {
          skipVoiceFor(30);
          if (playing && !paused) device(); else done(false);
        }
      });
      return;
    }
    /* 3 - studio voice is a Gold extra, and it is never waited on for long */
    if (!puterSpeaks(lang) || !goldVoice() || voiceTier() !== "studio" || !signedIn()) { device(); return; }
    if (puterReady) { studio(); return; }
    var gaveUp = false;
    var t1 = setTimeout(function () {
      gaveUp = true;
      if (g === gen && playing && !paused) device();
    }, 900);
    loadPuter().then(function (ok) {
      clearTimeout(t1);
      if (gaveUp) return;
      if (g !== gen) return done(false);
      if (!playing || paused) return done(false);
      if (ok) studio(); else device();
    });
  }

  /* ---------- queue runner ---------- */
  function next(forcePause) {
    if (!playing) return;
    if (paused) return;
    clearPosition();
    updatePlayer();
    if (curIdx >= queue.length) { finish(); return; }
    const item = queue[curIdx];
    // intro first (separate utterance for cleaner podcast feel)
    const runItem = () => {
      if (!playing || paused) return;
      updatePlayer();
      speakItem(item, (ok) => {
        if (!playing) return;
        if (paused) return;
        if (!ok) { /* skip broken chunk */ }
        /* the device voice already carries its own breath between sentences;
           padding it again is what made listening feel stop-start */
        const base = provider === "web" ? 60 : (item.pause != null ? item.pause : 260);
        const wait = Math.min(base, 420);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { curIdx++; next(); }, wait);
      });
    };
    if (item.intro && item.introSpoken !== true) {
      item.introSpoken = true;
      speakItem({ text: item.intro, lang: item.lang, pause: 0 }, () => {
        if (!playing || paused) return;
        const t2 = setTimeout(runItem, 180);
        if (timer) clearTimeout(timer);
        timer = t2;
      });
    } else runItem();
  }

  function finish() {
    playing = false;
    curIdx = 0;
    if (timer) clearTimeout(timer);
    clearPosition();
    if (SPK) { try { SPK.cancel(); } catch (e) {} }
    hidePlayer();
    clearMediaSession();
    if (onProgress) onProgress(0, 0, false);
  }

  /* ============================================================
     MEDIA SESSION - lock-screen / notification controls (like songs)
     + background-play handling
     ============================================================ */
  function mediaSessionSupported() {
    return !!(navigator.mediaSession && "mediaSession" in navigator);
  }
  /* square branded album-art per book (cache once) - makes the lock screen
     look like a real music app instead of a cropped portrait cover */
  function squareArt(book) {
    return new Promise((resolve) => {
      if (!book || (!book.id && !book.cover)) return resolve("favicon.png");
      const key = book.id || book.cover;
      if (artCache[key]) return resolve(artCache[key]);
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 512;
        const ctx = c.getContext("2d");
        if (!ctx) { artCache[book.id] = "favicon.png"; return resolve(artCache[book.id]); }
        // brand frame: yellow → cream card → black border
        ctx.fillStyle = "#ffc800"; ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = "#f2ede2"; ctx.fillRect(26, 26, 460, 460);
        ctx.strokeStyle = "#111"; ctx.lineWidth = 12; ctx.strokeRect(26, 26, 460, 460);
        const img = new Image();
        img.onload = () => {
          try {
            const h = 330, w = (img.width / img.height) * h;
            const x = (512 - w) / 2, y = (512 - h) / 2 - 14;
            ctx.drawImage(img, x, y, w, h);
            ctx.strokeStyle = "#111"; ctx.lineWidth = 7; ctx.strokeRect(x, y, w, h);
            // bottom brand strip
            ctx.fillStyle = "#111"; ctx.fillRect(0, 452, 512, 60);
            ctx.fillStyle = "#ffc800";
            ctx.font = "bold 24px 'Space Grotesk', Arial";
            ctx.textAlign = "center";
            ctx.fillText("📕 THESMALLBOOK", 256, 490);
          } catch (e) {}
          artCache[key] = c.toDataURL("image/jpeg", 0.85);
          resolve(artCache[key]);
        };
        img.onerror = () => { artCache[key] = "favicon.png"; resolve(artCache[key]); };
        img.src = book.cover;
      } catch (e) { resolve("favicon.png"); }
    });
  }

  /* lock-screen progress bar (like Spotify) - real, moving */
  function setPos(d, p) {
    if (mediaSessionSupported() && navigator.mediaSession.setPositionState) {
      try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(p, d), playbackRate: speed }); } catch (e) {}
    }
  }
  function startPosition(dur) {
    clearPosition();
    posDur = dur || 0;
    posOffset = 0;
    if (!posDur) return;
    posStart = Date.now();
    setPos(posDur, 0);
    posTimer = setInterval(() => {
      if (paused || !playing) return;
      const p = Math.min(posOffset + (Date.now() - posStart) / 1000, posDur);
      setPos(posDur, p);
    }, 1000);
  }
  function freezePosition() {
    if (posTimer) clearInterval(posTimer);
    posTimer = null;
    if (posDur && !paused) {
      posOffset = Math.min(posOffset + (Date.now() - posStart) / 1000, posDur);
    }
    if (posDur) setPos(posDur, posOffset);
  }
  function clearPosition() {
    if (posTimer) clearInterval(posTimer);
    posTimer = null;
  }

  function setMediaMetadata(book, lessonTitle, lessonIdx, totalLessons, author) {
    if (!mediaSessionSupported()) return;
    try {
      const metaKey = (book ? book.id : "") + "|" + (lessonIdx != null ? lessonIdx : "") + "|" + (lessonTitle || "");
      if (metaKey === lastMetaKey && navigator.mediaSession.metadata) return; // already current
      lastMetaKey = metaKey;
      const artist = author ? author + " · TheSmallBook" : "TheSmallBook";
      const artSrc = (book && book.id && artCache[book.id]) ? artCache[book.id] : "favicon.png";
      navigator.mediaSession.metadata = new MediaMetadata({
        title: (lessonTitle || "Podcast Mode") + (book ? " - " + book.title : ""),
        artist: artist,
        album: book ? book.title : "TheSmallBook",
        artwork: [{ src: artSrc, sizes: "512x512", type: "image/jpeg" }]
      });
      if (!mediaSessionSet) {
        mediaSessionSet = true;
        navigator.mediaSession.setActionHandler("play", () => resume());
        navigator.mediaSession.setActionHandler("pause", () => pause());
        navigator.mediaSession.setActionHandler("previoustrack", () => seekTo(prevLessonIdx()));
        navigator.mediaSession.setActionHandler("nexttrack", () => seekTo(nextLessonIdx()));
        navigator.mediaSession.setActionHandler("seekto", (d) => {
          if (d && d.seekTime != null && posDur) {
            posOffset = Math.min(d.seekTime, posDur);
            posStart = Date.now();
            setPos(posDur, posOffset);
          }
        });
      }
    } catch (e) {}
  }
  function setMediaPlaybackState(st) {
    if (mediaSessionSupported()) {
      try { navigator.mediaSession.playbackState = st; } catch (e) {}
    }
  }
  function clearMediaSession() {
    if (mediaSessionSupported()) {
      try { navigator.mediaSession.playbackState = "none"; } catch (e) {}
    }
  }
  function prevLessonIdx() {
    if (!queue.length) return curIdx;
    const curL = (queue[curIdx] && queue[curIdx].meta) ? queue[curIdx].meta.idx : 0;
    for (let i = curIdx - 1; i >= 0; i--) {
      if (queue[i].meta && queue[i].meta.idx < curL) return i;
    }
    return curIdx;
  }
  /* background: Puter audio keeps playing (like songs) on Android/desktop;
     web-speech is best-effort resumed when the tab comes back */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      /* keep playing in background - but never force-unpause user's pause */
      if (playing && !paused && currentAudio && currentAudio.paused) {
        try { currentAudio.play(); } catch (e) {}
      }
    } else {
      if (playing && paused === false) {
        if (SPK && SPK.paused) { try { SPK.resume(); } catch (e) {} }
      }
    }
  });

  /* ---------- public API ---------- */
  function stop() {
    gen++;
    webResume = null; webCancel = null; webBusy = false;                       // ← invalidate every in-flight async start
    playing = false;
    paused = false;
    queue = [];
    curIdx = 0;
    if (timer) clearTimeout(timer);
    if (SPK) { try { SPK.cancel(); } catch (e) {} }
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    stopSilence();
    hidePlayer();
    clearMediaSession();
    if (onProgress) onProgress(0, 0, false);
  }
  function pause() {
    if (!playing) return;
    paused = true;
    /* cancel, never speechSynthesis.pause(): pause is broken on Android */
    if (SPK) { try { SPK.cancel(); } catch (e) {} }
    if (webCancel) { var wc = webCancel; webCancel = null; wc(); }
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} }
    if (silenceEl) { try { silenceEl.pause(); } catch (e) {} }
    freezePosition();
    setMediaPlaybackState("paused");
    updatePlayer();
  }
  function resume() {
    if (!playing) return;
    paused = false;
    var hadPiece = !!webResume, audioLive = !!(currentAudio && !currentAudio.ended);
    if (webResume) { var wr = webResume; webResume = null; wr(); }
    if (currentAudio) { try { currentAudio.play(); } catch (e) {} }
    if (modelStreamResume) modelStreamResume();
    if (silenceEl) { try { silenceEl.play(); } catch (e) {} }
    setMediaPlaybackState("playing");
    if (posDur) { posStart = Date.now(); if (!posTimer) posTimer = setInterval(() => { if (paused || !playing) return; const p = Math.min(posOffset + (Date.now() - posStart) / 1000, posDur); setPos(posDur, p); }, 1000); }
    /* paused in the gap between two items: carry on with the queue */
    if (!hadPiece && !audioLive && !webBusy && !modelStreamResume) { if (timer) clearTimeout(timer); next(); }
    updatePlayer();
  }
  function toggle() { if (playing && !paused) pause(); else if (playing) resume(); }
  function nextLessonIdx() {
    if (!queue.length) return curIdx;
    const curMeta = queue[curIdx] && queue[curIdx].meta;
    const curL = curMeta ? curMeta.idx : 0;
    for (let i = curIdx + 1; i < queue.length; i++) {
      if (queue[i].meta && queue[i].meta.idx > curL) return i;
    }
    return curIdx;
  }
  function seekTo(i) {
    if (!queue.length) return;
    gen++; modelStreamResume = null;
    curIdx = Math.max(0, Math.min(queue.length - 1, i));
    /* kill any currently-playing Puter audio - otherwise the old chunk
       keeps playing over the new one (voice/speed changes sounded broken) */
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    if (SPK) { try { SPK.cancel(); } catch (e) {} }
    if (timer) clearTimeout(timer);
    if (playing) next();
    updatePlayer();
  }
  function setSpeed(v) {
    speed = v;
    if (player) {
      const el = player.querySelector('[data-act="speed"]');
      if (el) el.textContent = v.toFixed(2).replace(/\.?0+$/, "") + "x";
    }
    /* apply the new speed RIGHT AWAY - restart the current chunk */
    if (playing && !paused) seekTo(curIdx);
  }
  function queueBook(book, lang) {
    const parts = [];
    const lessons = book.lessons || [];
    const bookMeta = { book: book.title, lesson: book.title, idx: 0, cover: book.cover, author: book.author };
    /* 1) podcast intro - "You are listening to X by Y." (no duplication) */
    parts.push({
      text: book.oneLiner || book.title,
      intro: "You are listening to " + book.title + (book.author ? " by " + book.author : "") + ".",
      lang: lang, pause: 700, meta: bookMeta
    });
    /* 2) the FULL Big Idea - read properly before any lesson */
    if (book.bigIdea) parts.push({ text: book.bigIdea, lang: lang, pause: 1100, meta: bookMeta });
    /* 3) lessons - intro says only "Lesson X of Y." then the title chunk
          speaks the title once (no double title) */
    lessons.forEach((l, i) => {
      const meta = { book: book.title, lesson: l.title, idx: i, cover: book.cover, author: book.author };
      parts.push({
        text: l.title,
        intro: "Lesson " + (i + 1) + " of " + lessons.length + ".",
        lang: lang, pause: 700, meta: meta
      });
      parts.push({ text: l.summary, lang: lang, pause: 750, meta: meta });
      if (l.example) parts.push({ text: l.example, lang: lang, pause: 750, meta: meta });
      if (l.action) parts.push({ text: l.action, lang: lang, pause: 900, meta: meta });
    });
    return parts;
  }
  function playBook(book, lang) {
    const go = () => { const parts = queueBook(book, lang || currentLang()); startQueue(parts, book); };
    if (window.TSB_LESSONS && book && book.id) TSB_LESSONS.ensure(book.id, go); else go();
  }
  function playParts(parts, startAt) {
    startQueue(parts, null, startAt);
  }
  function startQueue(parts, book, startAt) {
    stop();
    queue = parts;
    /* v341: the queue opens where the reader tapped. Seeking a moment later
       used to bump the generation token and throw away the first phrase that
       the voice model was already synthesising - which is why a downloaded
       model could sound like nothing at all on the first tap. */
    curIdx = Math.max(0, Math.min(parts.length - 1, (startAt | 0) || 0));
    playing = true;
    paused = false;
    modelFails = 0; quietItems = 0; heardItems = 0;
    // Voice downloads are always reader initiated. The phone voice starts at once.
    /* start the silent keep-alive loop - keeps the tab alive on the lock
       screen so the queue never freezes between chunks */
    startSilence();
    ensurePlayer(book);
    updatePlayer();   // paint eq/state immediately (no wait for intro)
    next();
  }

  /* ---------- mini player ---------- */
  function ensurePlayer(book) {
    /* the floating mini-player lives ONLY on book pages -
       on the shelf/library it would just be noise */
    if (!/book\.html/.test(location.pathname)) return;
    if (!player) {
      player = document.createElement("div");
      player.className = "tsb-player";
      player.id = "tsb-player";
      player.innerHTML =
        '<div class="tsb-player__prog"><i></i></div>' +
        '<div class="tsb-player__top">' +
          '<div class="tsb-player__art"><span>📕</span>' +
            '<span class="tsb-player__eq">' +
              '<i></i><i></i><i></i><i></i>' +
            '</span>' +
          '</div>' +
          '<div class="tsb-player__info">' +
            '<div class="tsb-player__title"></div>' +
            '<div class="tsb-player__sub"></div>' +
            '<div class="tsb-player__live"><i></i> LIVE</div>' +
          '</div>' +
          '<button class="tsb-player__close" data-act="close" title="Stop">✕</button>' +
        '</div>' +
        '<div class="tsb-player__row">' +
          '<button class="tsb-player__btn" data-act="prev" title="Previous lesson">⏮</button>' +
          '<button class="tsb-player__btn tsb-player__btn--main" data-act="toggle" title="Play / Pause">⏸</button>' +
          '<button class="tsb-player__btn" data-act="next" title="Next lesson">⏭</button>' +
          '<span class="tsb-player__sp"></span>' +
          '<button class="tsb-player__pill" data-act="speed" title="Speed">1x</button>' +
          '<button class="tsb-player__pill" data-act="voice" title="Voice (male/female)">🎙️ Auto</button>' +
          '<button class="tsb-player__pill" data-act="boost" title="Volume boost">🔊 1.5x</button>' +
        '</div>';
      document.body.appendChild(player);
      player.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-act]");
        if (!btn) return;
        const act = btn.dataset.act;
        if (act === "toggle") toggle();
        else if (act === "prev") seekTo(curIdx - 1);
        else if (act === "next") seekTo(nextLessonIdx());
        else if (act === "speed") {
          const speeds = [1, 1.25, 1.5, 0.8];
          const i = speeds.indexOf(speed);
          setSpeed(speeds[(i + 1) % speeds.length]);
        } else if (act === "voice") {
          cycleVoice();
        } else if (act === "boost") {
          cycleBoost();
        } else if (act === "close") { stop(); hidePlayer(); }
      });
    }
    player.classList.add("tsb-player--show");
    const t = player.querySelector(".tsb-player__title");
    const s = player.querySelector(".tsb-player__sub");
    const sp = player.querySelector('[data-act="speed"]');
    const vb = player.querySelector('[data-act="voice"]');
    const bb = player.querySelector('[data-act="boost"]');
    t.textContent = book ? book.title : "TheSmallBook";
    s.textContent = "Podcast mode";
    if (sp) sp.textContent = speed.toFixed(2).replace(/\.?0+$/, "") + "x";
    if (vb) vb.textContent = voiceLabel();
    if (bb) bb.textContent = "🔊 " + boost.toFixed(2).replace(/\.?0+$/, "") + "x";
  }
  function voiceLabel() { return modelVoiceName(); }
  function cycleVoice() { openVoiceModel(modelChoice() || "basic"); }
  function hidePlayer() {
    if (!player) return;
    const p = player;
    p.classList.remove("tsb-player--show");
    /* after the slide-down transition, REMOVE the element entirely -
       never leave a dead player lying at the bottom */
    setTimeout(() => {
      if (p && p.parentNode && !p.classList.contains("tsb-player--show")) {
        p.parentNode.removeChild(p);
        if (player === p) player = null;
      }
    }, 450);
  }
  function updatePlayer(finished) {
    if (!player || !queue.length) return;
    const item = queue[curIdx] || null;
    const title = player.querySelector(".tsb-player__title");
    const sub = player.querySelector(".tsb-player__sub");
    const bar = player.querySelector(".tsb-player__prog i");
    const main = player.querySelector('[data-act="toggle"]');
    const artEl = player.querySelector(".tsb-player__art");
    /* live feel: equalizer pulses while playing, stills when paused */
    const eq = player.querySelector(".tsb-player__eq");
    if (eq) eq.classList.toggle("tsb-player__eq--on", playing && !paused);
    const live = player.querySelector(".tsb-player__live");
    if (live) live.classList.toggle("tsb-player__live--on", playing && !paused);
    if (item && item.meta) {
      title.textContent = item.meta.book + " - " + item.meta.lesson;
      const totalLessons = Math.max(...queue.map(q => q.meta ? q.meta.idx : 0)) + 1;
      sub.textContent = "Lesson " + (item.meta.idx + 1) + " of " + totalLessons + " · " + (playing && !paused ? "playing" : "paused");
      /* cover art - real book cover in the art tile (fallback 📕) */
      if (artEl && item.meta.cover) {
        if (!artEl.dataset.src || artEl.dataset.src !== item.meta.cover) {
          artEl.dataset.src = item.meta.cover;
          const im = new Image();
          im.onload = () => { artEl.innerHTML = ""; artEl.appendChild(im); };
          im.onerror = () => { artEl.innerHTML = "<span>📕</span>"; };
          im.src = item.meta.cover;
        }
      } else if (artEl && (!item.meta || !item.meta.cover)) {
        artEl.innerHTML = "<span>📕</span>";
      }
      const bookObj = { id: item.meta.cover ? item.meta.cover.split("/").pop().replace(/\.(jpg|jpeg|png|webp)$/i, "") : "", title: item.meta.book, cover: item.meta.cover, author: item.meta.author };
      /* ensure square art is cached, then push metadata so the lock screen
         shows the premium branded artwork */
      squareArt(bookObj).then((art) => {
        if (!artCache[item.meta.cover || item.meta.book]) {
          try { artCache[item.meta.cover || item.meta.book] = art; } catch (e) {}
          lastMetaKey = ""; // force refresh with artwork
          setMediaMetadata(bookObj, item.meta.lesson, item.meta.idx, totalLessons, item.meta.author);
        } else {
          setMediaMetadata(bookObj, item.meta.lesson, item.meta.idx, totalLessons, item.meta.author);
        }
      });
    }
    if (bar) bar.style.width = (queue.length ? ((curIdx + (playing ? 0.4 : 0)) / queue.length) * 100 : 0) + "%";
    if (main) main.textContent = (playing && !paused) ? "⏸" : "▶";
    setMediaPlaybackState(playing && !paused ? "playing" : "paused");
  }

  /* ---------- boot ---------- */
  if (SPK) {
    try {
      SPK.onvoiceschanged = () => {};
      const v = SPK.getVoices();
      if (v && v.length) { /* warm */ }
    } catch (e) {}
  }
  /* TheSmallBook Voice Model is deliberately not preloaded. It is a large,
     reader-owned download, not page weight. */

  /* ---------- translation (for intros/templates) ---------- */
  var trCache = {};
  function trBatch(strings, lang) {
    strings = (strings || []).map(function (s) { return String(s == null ? "" : s); });
    if (!strings.length || lang === "en") return Promise.resolve(strings);
    var key = lang + "\u0001" + strings.join("\u0001");
    if (trCache[key]) return trCache[key];
    var p = new Promise(function (resolve) {
      try {
        var q = strings.join("\n");
        var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
          encodeURIComponent(lang) + "&dt=t&q=" + encodeURIComponent(q);
        fetch(url).then(function (r) { return r.json(); }).then(function (j) {
          var segs = (j && j[0]) || [];
          var out = [], cur = "";
          segs.forEach(function (seg) {
            cur += seg[0] || "";
            if (cur.indexOf("\n") !== -1) { var parts = cur.split("\n"); out.push(parts[0]); cur = parts.slice(1).join("\n"); }
          });
          if (cur !== "" || out.length === 0) out.push(cur);
          while (out.length < strings.length) out.push("");
          resolve(out);
        }).catch(function () { resolve(strings); });
      } catch (e) { resolve(strings); }
    });
    trCache[key] = p;
    return p;
  }

  return {
    voiceTier: voiceTier,
    setVoiceTier: function (v) { setVoiceTier(v === "studio" ? "studio" : "device"); },
    askStudio: function () { openVoiceModel(goldVoice() ? "plus" : "basic"); },
    openVoiceModel: function () { openVoiceModel(modelChoice() || "basic"); },
    voiceModel: function () { return modelChoice(); },
    ensureVoiceModel: ensureVoiceModel,
    hintVoiceModel: hintVoiceModel,
    clearVoiceSkip: clearVoiceSkip,
    voiceDownloaded: function () { return !!modelChoice(); },
    playBook: playBook,
    playParts: playParts,
    /* translate intro/template strings into the target language (cached) */
    translate: function (strings, lang) { return trBatch(strings, lang); },
    stop: stop,
    pause: pause,
    resume: resume,
    toggle: toggle,
    seekTo: seekTo,
    setSpeed: setSpeed,
    get playing() { return playing; },
    get paused() { return paused; },
    get provider() { return provider; },
    onProgress: (fn) => { onProgress = fn; }
  };

  /* v343 · A VOICE THAT IS ALREADY AWAKE
     Reading the 63 MB model into the worker takes a few seconds on a phone.
     Doing it when the reader taps Listen is what made the first sentence late
     even after the download. If this device already owns a voice, wake it in
     the background while the page settles: nothing plays, nothing prompts,
     and the next Listen makes sound in about a second. */
  try {
    if (modelChoice() && !voiceSkipped() && modelLang(currentLang())) {
      var warmIdle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 2200); };
      warmIdle(function () {
        getModelApi().then(function (api) {
          if (api && api.warm) api.warm(modelChoice(), modelLang(currentLang()));
        }).catch(function () {});
      }, { timeout: 6000 });
    }
  } catch (e) {}
})();
