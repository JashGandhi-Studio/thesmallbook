/* ============================================================
   THESMALLBOOK — TTS ENGINE v6 🎧 PODCAST-GRADE LISTENING
   ------------------------------------------------------------
   Providers (auto, in order):
     1. Puter.js  — free cloud TTS (no API key), high-quality
        neural voices, 100+ languages. Loaded lazily.
     2. Web Speech API — fallback (device voices, works offline).

   Features:
     • natural sentence-aware pauses (480ms / 220ms / 750ms)
     • subtle rate + pitch variation (human feel)
     • FULL-BOOK PODCAST MODE: queues every lesson, auto-advances,
       floating mini-player with play/pause/next/prev/speed/progress
     • section intros ("Lesson 3 of 8 — The Power of 1%")
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
  let speed = 1;
  let timer = null;              // web-speech chunk timer
  let utter = null;              // current utterance (GC guard)
  let player = null;             // mini-player DOM
  let onProgress = null;         // callback (idx, total, playing)
  let currentAudio = null;       // Puter audio element (background-friendly)
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
      if (window.puter && window.puter.ai && window.puter.ai.tts) {
        puterReady = true;
        /* fast path (puter already loaded) — still fetch the voice list,
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
          if (puterReady || (window.puter && window.puter.ai && window.puter.ai.tts)) {
            clearInterval(iv); puterReady = true; resolve(true);
          }
        }, 200);
        setTimeout(() => { clearInterval(iv); resolve(puterReady); }, 4000);
        return;
      }
      puterLoading = true;
      const sc = document.createElement("script");
      sc.src = "https://js.puter.com/v2/";
      sc.onload = () => {
        puterReady = !!(window.puter && window.puter.ai && window.puter.ai.tts);
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
          /* mobile networks can be flaky — one retry after 1.5s */
          setTimeout(loadPuter, 1500);
          return;
        }
        puterLoading = false; resolve(false);
      };
      /* HARD TIMEOUT: if the script hangs (no load/error event — common on
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
    if (/\b(male|man|masc)\b/.test(n) || /\b(m)[\s-]/i.test(n)) return "male";
    if (/\b(female|woman|fem)\b/.test(n) || /\b(f)[\s-]/i.test(n)) return "female";
    return "auto";
  }
  function pickPuterVoice(lang) {
    const wantBase = baseLang(lang);
    const pref = genderPref();
    if (!puterVoices.length) return null;
    const norm = (x) => String(x || "").toLowerCase();
    /* lenient match: "en-IN" vs "en" vs "en-US" all match base "en" */
    const byLang = puterVoices.filter((v) => {
      const vl = norm(v.lang || "");
      return vl === norm(lang) || vl === wantBase || vl.indexOf(wantBase) !== -1;
    });
    /* for English, any voice is fine (gender change must be audible);
       for other languages we MUST have a language match (avoid wrong language) */
    const pool = byLang.length ? byLang : (lang === "en" ? puterVoices : []);
    if (!pool.length) return null;
    if (pref !== "auto") {
      const g = pool.filter((v) => voiceGenderOf(v.name || v.id || "") === pref);
      if (g.length) return g[0];
    }
    return pool[0] || null;
  }
  function speakPuter(text, lang, speedV) {
    return new Promise((resolve) => {
      try {
        const g = gen;
        const opts = { language: region(lang), speed: speedV };
        const v = pickPuterVoice(lang);
        if (v) opts.voice = v.name || v.id || v;
        /* CRITICAL: for non-English text we ONLY trust Puter when its voice
           list actually has a matching voice. If the list is empty (couldn't
           load) or has no match, Puter may read in a WRONG language — so we
           hand it to Web Speech, which can pick a correct regional voice
           (e.g. Android Google TTS has ગુજરાતી, हिन्दी…). */
        if (lang && lang !== "en" && !v) {
          resolve(false);
          return;
        }
        const audio = window.puter.ai.tts(text, opts);
        if (audio && audio.play) {
          let done = false;
          const end = (ok) => {
            if (!done) { done = true; if (currentAudio === audio) currentAudio = null; clearPosition(); resolve(ok); }
          };
          audio.onended = () => end(true);
          audio.onerror = () => end(false);
          if (g !== gen || !playing || paused) { end(false); return; }
          /* stop any audio still playing from a previous chunk (seekTo,
             voice/speed change) — otherwise both play at once */
          if (currentAudio && currentAudio !== audio) {
            try { currentAudio.pause(); } catch (e) {}
            currentAudio = null;
          }
          currentAudio = audio;
          /* BOOST: route through Web Audio gain → louder than device max */
          try { audio.volume = 1.0; } catch (e) {}
          routeBoost(audio);
          /* premium lock-screen: real progress from the audio's own duration */
          const grabDur = () => {
            if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
              startPosition(audio.duration);
            } else {
              startPosition(Math.max(5, text.length / (15 * (speed || 1)))); // estimate
            }
          };
          if (audio.readyState >= 1) grabDur();
          else {
            try { audio.onloadedmetadata = grabDur; } catch (e) {}
          }
          audio.play().then(grabDur).catch(() => end(false));
          return;
        }
        resolve(false);
      } catch (e) { resolve(false); }
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

  function speakWeb(text, lang, speedV, done) {
    if (!SPK) return done(false);
    startPosition(Math.max(5, text.length / (15 * (speedV || 1))));
    var u = new SpeechSynthesisUtterance(text);
    utter = u;
    var started = false;
    function start() {
      if (started) return;
      started = true;
      if (!playing || paused) { done(false); return; }
      var v = bestVoice(lang);
      if (v) u.voice = v;
      u.lang = v ? v.lang : region(lang);
      u.rate = Math.min(2, Math.max(0.5, speedV));
      /* GENDER: if no gender-specific voice exists (most mobile devices have
         ONE voice per language), simulate male/female with pitch — this
         guarantees an audible change on every phone */
      var pref = genderPref();
      var vGender = v ? voiceGenderOf(v.name) : "auto";
      if (pref === "male" && vGender !== "male") u.pitch = 0.72;
      else if (pref === "female" && vGender !== "female") u.pitch = 1.28;
      else u.pitch = 1;
      u.volume = 1;
      var finished = false;
      u.onend = function () { if (!finished) { finished = true; done(true); } };
      u.onerror = function () { if (!finished) { finished = true; done(false); } };
      try { SPK.speak(u); } catch (e) { done(false); }
    }
    /* Android returns an empty voice list at first — wait for it, then
       speak once with the correct regional voice (gu-IN, hi-IN…) */
    voicesReady(1500).then(start);
  }

  /* ---------- background keep-alive ----------
     Chrome/Android suspends a tab when NO media is playing — between chunks
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
     An <audio> element clamps its volume at 1.0 — on many phones that still
     sounds soft. Routing the audio through a Web Audio GainNode lets us go
     to 1.5x/2x — genuinely louder on mobile. */
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

  /* ---------- speak one item ---------- */
  function speakItem(item, done) {
    const g = gen;
    if (!playing || paused) return done(false);
    const lang = item.lang || currentLang();
    const spd = speed;
    const tryPuter = () => {
      speakPuter(item.text, lang, spd).then((ok) => {
        if (g !== gen || !playing || paused) return done(false);
        if (!ok) {
          speakWeb(item.text, lang, spd, done);
        } else done(true);
      });
    };
    if (puterReady) tryPuter();
    else {
      /* give Puter a SHORT chance (it was pre-warmed at boot) — this lets
         background/lock-screen playback start with the media element when
         available; otherwise speak instantly with Web Speech */
      var gaveUp = false;
      var t1 = setTimeout(function () {
        gaveUp = true;
        if (g === gen && playing && !paused) speakWeb(item.text, lang, spd, done);
      }, 900);
      loadPuter().then(function (ok) {
        clearTimeout(t1);
        if (gaveUp) return;
        if (g !== gen || !playing || paused) return done(false);
        if (ok) tryPuter(); else speakWeb(item.text, lang, spd, done);
      });
    }
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
        const wait = Math.min(item.pause != null ? item.pause : 480, 900);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { curIdx++; next(); }, wait);
      });
    };
    if (item.intro && item.introSpoken !== true) {
      item.introSpoken = true;
      speakItem({ text: item.intro, lang: item.lang, pause: 0 }, () => {
        if (!playing || paused) return;
        const t2 = setTimeout(runItem, 550);
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
     MEDIA SESSION — lock-screen / notification controls (like songs)
     + background-play handling
     ============================================================ */
  function mediaSessionSupported() {
    return !!(navigator.mediaSession && "mediaSession" in navigator);
  }
  /* square branded album-art per book (cache once) — makes the lock screen
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

  /* lock-screen progress bar (like Spotify) — real, moving */
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
        title: (lessonTitle || "Podcast Mode") + (book ? " — " + book.title : ""),
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
      /* keep playing in background — but never force-unpause user's pause */
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
    gen++;                       // ← invalidate every in-flight async start
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
    if (SPK) { try { SPK.pause(); } catch (e) {} }
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} }
    if (silenceEl) { try { silenceEl.pause(); } catch (e) {} }
    freezePosition();
    setMediaPlaybackState("paused");
    updatePlayer();
  }
  function resume() {
    if (!playing) return;
    paused = false;
    if (SPK) { try { SPK.resume(); } catch (e) {} }
    if (currentAudio) { try { currentAudio.play(); } catch (e) {} }
    if (silenceEl) { try { silenceEl.play(); } catch (e) {} }
    setMediaPlaybackState("playing");
    if (posDur) { posStart = Date.now(); if (!posTimer) posTimer = setInterval(() => { if (paused || !playing) return; const p = Math.min(posOffset + (Date.now() - posStart) / 1000, posDur); setPos(posDur, p); }, 1000); }
    if (!utter && timer) { clearTimeout(timer); next(); }
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
    curIdx = Math.max(0, Math.min(queue.length - 1, i));
    /* kill any currently-playing Puter audio — otherwise the old chunk
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
    /* apply the new speed RIGHT AWAY — restart the current chunk */
    if (playing && !paused) seekTo(curIdx);
  }
  function queueBook(book, lang) {
    const parts = [];
    const lessons = book.lessons || [];
    const bookMeta = { book: book.title, lesson: book.title, idx: 0, cover: book.cover, author: book.author };
    /* 1) podcast intro — "You are listening to X by Y." (no duplication) */
    parts.push({
      text: book.oneLiner || book.title,
      intro: "You are listening to " + book.title + (book.author ? " by " + book.author : "") + ".",
      lang: lang, pause: 700, meta: bookMeta
    });
    /* 2) the FULL Big Idea — read properly before any lesson */
    if (book.bigIdea) parts.push({ text: book.bigIdea, lang: lang, pause: 1100, meta: bookMeta });
    /* 3) lessons — intro says only "Lesson X of Y." then the title chunk
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
    const parts = queueBook(book, lang || currentLang());
    startQueue(parts, book);
  }
  function playParts(parts) {
    startQueue(parts, null);
  }
  function startQueue(parts, book) {
    stop();
    queue = parts;
    curIdx = 0;
    playing = true;
    paused = false;
    // ensure puter loads in background for quality
    loadPuter();
    /* start the silent keep-alive loop — keeps the tab alive on the lock
       screen so the queue never freezes between chunks */
    startSilence();
    ensurePlayer(book);
    updatePlayer();   // paint eq/state immediately (no wait for intro)
    next();
  }

  /* ---------- mini player ---------- */
  function ensurePlayer(book) {
    /* the floating mini-player lives ONLY on book pages —
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
  function voiceLabel() {
    const p = genderPref();
    return p === "male" ? "🎙️ ♂" : p === "female" ? "🎙️ ♀" : "🎙️ Auto";
  }
  function cycleVoice() {
    const cur = genderPref();
    const next = cur === "auto" ? "male" : cur === "male" ? "female" : "auto";
    setGenderPref(next);
    /* refresh the Puter voice list — on mobile it may load late/empty */
    if (window.puter && window.puter.ai && window.puter.ai.listTTSVoices) {
      try {
        window.puter.ai.listTTSVoices().then(function (v) { puterVoices = v || []; }).catch(function () {});
      } catch (e) {}
    }
    if (player) {
      const b = player.querySelector('[data-act="voice"]');
      if (b) b.textContent = voiceLabel();
    }
    /* restart the current chunk so the new voice applies right away —
       but ONLY if still playing (never resurrect after stop) */
    if (playing && !paused) seekTo(curIdx);
  }
  function hidePlayer() {
    if (!player) return;
    const p = player;
    p.classList.remove("tsb-player--show");
    /* after the slide-down transition, REMOVE the element entirely —
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
      title.textContent = item.meta.book + " — " + item.meta.lesson;
      const totalLessons = Math.max(...queue.map(q => q.meta ? q.meta.idx : 0)) + 1;
      sub.textContent = "Lesson " + (item.meta.idx + 1) + " of " + totalLessons + " · " + (playing && !paused ? "playing" : "paused");
      /* cover art — real book cover in the art tile (fallback 📕) */
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
  // pre-warm puter as EARLY as possible — the sooner it's ready, the sooner
  // the background-capable audio element takes over (lock screen playback)
  if (navigator.onLine) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { setTimeout(loadPuter, 300); });
    } else setTimeout(loadPuter, 300);
  }

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
})();
