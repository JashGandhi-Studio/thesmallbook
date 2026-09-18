/* ============================================================
   THESMALLBOOK — 🎙️ VOICE (voice.js)  v249
   ------------------------------------------------------------
   Two things live here, both built to feel like a native app:

   1. RECORDER — a push-to-talk mic with a live waveform.
        · press & hold  → records; release → uploads and sends
        · slide up      → "review": Delete or Send, release does
                          NOT auto-send (nothing is lost by accident)
        · quick tap     → hands-free recording (desktop / mouse /
                          accessibility, and long notes on mobile)
        · 2:00 cap, live mm:ss timer, bars driven by a real
          AnalyserNode (not a CSS loop), inline errors instead of
          alert(), correct mime type per browser (Safari records
          mp4, Chrome/Android record webm — the old code stamped
          everything as webm, which broke iOS playback).

   2. PLAYER — replaces the browser's bare <audio controls>.
        circular play button with a progress ring, 44-bar waveform
        you can scrub, elapsed / total time, 1× 1.5× 2× speed.
        Real peaks are decoded lazily in the background; a seeded
        waveform paints instantly so there is never a blank box.

   Degrades to nothing at all when the browser has no MediaRecorder:
   supported() === false and the host page hides the mic.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_VOICE) return;

  var MAX_SEC = 120;           /* hard cap on a voice note            */
  var LONG_PRESS_MS = 220;     /* shorter than this = a tap, not hold */
  var LIFT_PX = 62;            /* slide this far up to reach review   */
  var BARS = 44;               /* waveform bars                       */
  var BAR_MS = 60;             /* one bar per 60 ms of audio          */
  var RATES = [1, 1.5, 2];

  var ICO = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="4.5" width="4" height="15" rx="1.4"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.4"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11.2v.9a6.5 6.5 0 0 0 13 0v-.9"/><path d="M12 18.6V22"/><path d="M8.6 22h6.8"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 11.6 19.4 5a.7.7 0 0 1 .94.94l-6.6 15.2a.7.7 0 0 1-1.3-.06l-2.2-6.1-6.1-2.2a.7.7 0 0 1-.06-1.3z"/><path d="m10.1 13.9 4.6-4.6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.8 6.2h16.4"/><path d="M9.2 6.2V4.4a1.6 1.6 0 0 1 1.6-1.6h2.4a1.6 1.6 0 0 1 1.6 1.6v1.8"/><path d="M18.2 6.2 17.4 19a2 2 0 0 1-2 1.9H8.6a2 2 0 0 1-2-1.9L5.8 6.2"/><path d="M10.2 10.4v6M13.8 10.4v6"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.4"/></svg>',
    wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 12h1.6M7 8.4v7.2M11 5.2v13.6M15 8.9v6.2M19 11.1v1.8M21.6 12H22"/></svg>'
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function mmss(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function supported() {
    return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  /* Safari records mp4, Chrome/Android record webm. Ask the browser
     instead of guessing — the wrong stamp is why iOS notes would not play. */
  function pickMime() {
    var cands = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus",
                 "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/mpeg"];
    if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
      for (var i = 0; i < cands.length; i++) {
        try { if (MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch (e) {}
      }
    }
    return "";
  }
  function extFor(mime) {
    if (!mime) return "webm";
    if (mime.indexOf("mp4") >= 0) return "m4a";
    if (mime.indexOf("ogg") >= 0) return "ogg";
    if (mime.indexOf("mpeg") >= 0) return "mp3";
    return "webm";
  }
  /* upload() wants a File so it can derive a clean path + content-type */
  function toFile(blob, mime, dur) {
    var name = "voice-" + Date.now() + "-" + Math.round(dur || 0) + "s." + extFor(mime);
    try { if (window.File) return new File([blob], name, { type: mime || blob.type || "audio/webm" }); } catch (e) {}
    try { blob.name = name; if (mime) blob.type = mime; } catch (e2) {}
    return blob;
  }

  /* ============================================================
     RECORDER
     ============================================================ */
  var stage = null, els = {};
  var state = "idle";                 /* idle | recording | review | sending | error */
  var mode = "hold";                  /* hold = release sends · tap = hands-free   */
  var rec = null, stream = null, chunks = [], ctx = null, analyser = null, rafId = 0;
  var startedAt = 0, timerId = 0, levels = [], lastBarAt = 0, duration = 0;
  var opts = {};
  /* host veto: while the composer has text the mic pill is Send, not a
     recorder. Declared at module scope on purpose — begin() must see it. */
  var enabled = function () { return true; };

  function buildStage() {
    if (stage) return stage;
    stage = document.createElement("div");
    stage.className = "vstage";
    stage.hidden = true;
    stage.setAttribute("role", "status");
    stage.setAttribute("aria-live", "polite");
    var bars = "";
    for (var i = 0; i < BARS; i++) bars += "<i></i>";
    stage.innerHTML =
      '<div class="vstage__card">' +
        '<div class="vstage__top">' +
          '<span class="vstage__rec"><i></i>REC</span>' +
          '<span class="vstage__time">0:00</span>' +
          '<span class="vstage__max">/ ' + mmss(MAX_SEC) + '</span>' +
        '</div>' +
        '<div class="vstage__wave">' + bars + '</div>' +
        '<div class="vstage__hint">hold to record · release to send · slide up to review</div>' +
        '<div class="vstage__acts" hidden>' +
          '<button class="vstage__del" type="button">' + ICO.trash + '<span>Delete</span></button>' +
          '<button class="vstage__send" type="button"><span>Send</span>' + ICO.send + '</button>' +
        '</div>' +
        '<div class="vstage__busy" hidden><span class="vstage__spin"></span><b>Sending your voice note…</b></div>' +
        '<div class="vstage__err" hidden><b></b><div class="vstage__erracts">' +
          '<button class="vstage__retry" type="button">Try again</button>' +
          '<button class="vstage__drop" type="button">Discard</button></div></div>' +
      '</div>';
    document.body.appendChild(stage);
    els = {
      card: stage.querySelector(".vstage__card"),
      time: stage.querySelector(".vstage__time"),
      wave: stage.querySelector(".vstage__wave"),
      bars: stage.querySelectorAll(".vstage__wave i"),
      hint: stage.querySelector(".vstage__hint"),
      acts: stage.querySelector(".vstage__acts"),
      del: stage.querySelector(".vstage__del"),
      send: stage.querySelector(".vstage__send"),
      busy: stage.querySelector(".vstage__busy"),
      err: stage.querySelector(".vstage__err"),
      errText: stage.querySelector(".vstage__err b"),
      retry: stage.querySelector(".vstage__retry"),
      drop: stage.querySelector(".vstage__drop"),
      rec: stage.querySelector(".vstage__rec")
    };
    els.del.addEventListener("click", function (e) { e.stopPropagation(); cancel(); });
    els.send.addEventListener("click", function (e) { e.stopPropagation(); stopAndSend(); });
    els.retry.addEventListener("click", function (e) { e.stopPropagation(); retrySend(); });
    els.drop.addEventListener("click", function (e) { e.stopPropagation(); cancel(); });
    return stage;
  }

  function paint() {
    if (!stage) return;
    stage.classList.toggle("is-recording", state === "recording");
    stage.classList.toggle("is-review", state === "review");
    stage.classList.toggle("is-busy", state === "sending");
    stage.classList.toggle("is-error", state === "error");
    els.acts.hidden = !(state === "review" || state === "error");
    els.busy.hidden = state !== "sending";
    els.err.hidden = state !== "error";
    els.hint.hidden = state === "review" || state === "sending" || state === "error";
    if (els.rec) els.rec.hidden = state !== "recording";
  }

  /* ---- live waveform: real samples from an AnalyserNode ---- */
  function levelNow() {
    if (!analyser) return 0;
    var buf = new Uint8Array(analyser.fftSize);
    try { analyser.getByteTimeDomainData(buf); } catch (e) { return 0; }
    var sum = 0;
    for (var i = 0; i < buf.length; i++) { var d = (buf[i] - 128) / 128; sum += d * d; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3.1);   /* scale to a usable range */
  }
  function tickWave() {
    rafId = requestAnimationFrame(tickWave);
    var now = Date.now();
    if (now - lastBarAt >= BAR_MS) {
      lastBarAt = now;
      levels.push(levelNow());
      if (levels.length > BARS) levels.shift();
    }
    /* render: newest bar on the right, pad the left so it fills in */
    var pad = BARS - levels.length;
    for (var i = 0; i < BARS; i++) {
      var v = i < pad ? 0 : levels[i - pad];
      var h = 8 + Math.pow(v, 0.72) * 92;                 /* % of the track height */
      var bar = els.bars[i];
      if (bar) {
        bar.style.height = h.toFixed(1) + "%";
        bar.classList.toggle("hot", i === BARS - 1 && v > 0.04);
        bar.classList.toggle("live", v > 0.02);
      }
    }
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(function () {
      duration = (Date.now() - startedAt) / 1000;
      if (els.time) els.time.textContent = mmss(duration);
      if (stage) stage.style.setProperty("--vp", Math.min(1, duration / MAX_SEC));
      if (duration >= MAX_SEC) {
        /* hit the cap: stop, then let the reader choose (never auto-send a cut note) */
        freezeRecorder();
        setReview(true, "2:00 reached — send it or delete it");
      }
    }, 100);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = 0; } }

  async function begin(how) {
    if (state !== "idle") return;
    try { if (!enabled()) return; }
    catch (e) { try { console.warn("TSB_VOICE: isEnabled() threw", e); } catch (e2) {} }
    mode = how;
    buildStage();
    var mime = pickMime();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (e) {
      var denied = e && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError");
      showHostError(denied
        ? "Microphone blocked. Allow mic access for this site in your browser settings, then try again."
        : "Could not reach the microphone on this device.");
      reset();
      return;
    }
    try {
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      try { rec = new MediaRecorder(stream); } catch (e2) {
        showHostError("This browser cannot record audio."); releaseStream(); reset(); return;
      }
    }
    chunks = []; levels = []; lastBarAt = 0; duration = 0;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = function () { showHostError("Recording was interrupted."); hardStop(); };
    rec.onstop = function () { /* handled by the caller: stopAndSend / cancel */ };

    /* analyser for the live bars (optional — recording works without it) */
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctx = new AC();
        if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.6;
        ctx.createMediaStreamSource(stream).connect(analyser);
      }
    } catch (e) { analyser = null; }

    try { rec.start(120); } catch (e) { showHostError("Recording would not start."); releaseStream(); reset(); return; }
    startedAt = Date.now();
    state = "recording";
    stage.hidden = false;
    requestAnimationFrame(function () { stage.classList.add("on"); });
    document.documentElement.classList.add("vstage-open");
    if (els.time) els.time.textContent = "0:00";
    if (els.hint) els.hint.textContent = mode === "hold"
      ? "release to send · slide up to review"
      : "tap the mic again to stop · Delete or Send below";
    paint(); startTimer(); tickWave(); buzz(18);
    try { if (opts.onState) opts.onState("recording"); } catch (e) {}
  }

  function releaseStream() {
    try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    stream = null;
    try { if (ctx && ctx.state !== "closed") ctx.close(); } catch (e) {}
    ctx = null; analyser = null;
  }
  function freezeRecorder() {
    stopTimer();
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    try { if (rec && rec.state !== "inactive") rec.stop(); } catch (e) {}
    releaseStream();
  }
  function hardStop() { freezeRecorder(); closeStage(); reset(); }

  function reset() {
    state = "idle"; mode = "hold"; rec = null; chunks = []; levels = []; duration = 0;
    try { if (opts.onState) opts.onState("idle"); } catch (e) {}
  }
  function closeStage() {
    if (!stage) return;
    stage.classList.remove("on");
    document.documentElement.classList.remove("vstage-open");
    setTimeout(function () { if (stage) stage.hidden = true; }, 220);
  }

  function setReview(on, note) {
    if (state === "sending" || state === "error") return;
    if (on && state === "recording") { freezeRecorder(); state = "review"; buzz(12); }
    else if (!on && state === "review") { state = "review"; }   /* one-way: nothing is lost by sliding back */
    if (els.hint) els.hint.hidden = false;
    if (note && els.del) els.del.setAttribute("title", note);
    paint();
    try { if (opts.onState) opts.onState(state); } catch (e) {}
  }

  function cancel() {
    if (state === "sending") return;
    freezeRecorder();
    closeStage();
    reset();
    paint();
  }

  function blobOf() {
    var mime = (rec && rec.mimeType) || pickMime() || "audio/webm";
    return new Blob(chunks, { type: mime });
  }

  async function stopAndSend() {
    if (state === "sending") return;
    if (state === "recording") freezeRecorder();
    var blob = blobOf();
    if (!blob || blob.size < 900 || duration < 0.45) {
      showStageError("That was too short — hold a little longer.");
      state = "error"; paint(); return;
    }
    state = "sending"; paint();
    try { if (opts.onState) opts.onState("sending"); } catch (e) {}
    pending = { blob: blob, mime: blob.type, duration: duration };
    try {
      await opts.onSend(toFile(blob, blob.type, duration), { duration: duration, mime: blob.type });
      closeStage(); reset(); paint();
    } catch (err) {
      showStageError((err && err.message) ? err.message : String(err));
    }
  }
  var pending = null;
  async function retrySend() {
    if (!pending) { cancel(); return; }
    state = "sending"; paint();
    try {
      await opts.onSend(toFile(pending.blob, pending.mime, pending.duration),
                        { duration: pending.duration, mime: pending.mime });
      pending = null; closeStage(); reset(); paint();
    } catch (err) {
      showStageError((err && err.message) ? err.message : String(err));
    }
  }
  function showStageError(msg) {
    buildStage();
    state = "error";
    if (els.errText) els.errText.textContent = msg || "Voice send failed.";
    stage.hidden = false;
    stage.classList.add("on");
    document.documentElement.classList.add("vstage-open");
    paint();
  }
  function showHostError(msg) {
    /* no alert(): the host page gets a chance to show it inline */
    try { if (opts.onError) { opts.onError(msg); return; } } catch (e) {}
    showStageError(msg);
  }

  /* ---- gesture wiring ---- */
  function attach(o) {
    opts = o || {};
    var btn = opts.micBtn;
    if (!btn) return null;
    /* the host page can veto recording (e.g. while the pill is showing Send) */
    enabled = typeof opts.isEnabled === "function" ? opts.isEnabled : function () { return true; };
    if (!supported()) { btn.hidden = true; try { if (opts.onUnsupported) opts.onUnsupported(); } catch (e) {} return null; }
    btn.style.touchAction = "none";
    btn.classList.add("vsrc");
    if (!btn.querySelector("svg")) btn.innerHTML = '<span class="vsrc__ico">' + ICO.mic + '</span>';

    var start = null, holdTimer = 0;

    btn.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      if (state !== "idle") {
        /* already recording hands-free -> a tap on the mic stops it */
        if (state === "recording" && mode === "tap") { e.preventDefault(); stopAndSend(); }
        return;
      }
      /* vetoed (the pill is Send right now): do NOT preventDefault —
         that would swallow the button's own click and the form submit.
         Behave like an ordinary button and let the page handle it. */
      try { if (!enabled()) return; } catch (e2) {}
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      holdTimer = setTimeout(function () { holdTimer = 0; begin("hold"); }, LONG_PRESS_MS);
    });

    btn.addEventListener("pointermove", function (e) {
      if (!start) return;
      var dy = start.y - e.clientY;
      if (state === "recording" && mode === "hold" && dy > LIFT_PX) setReview(true);
    });

    function endPress(e) {
      if (!start) return;
      var wasHold = holdTimer !== 0;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
      start = null;
      try { btn.releasePointerCapture(e.pointerId); } catch (err) {}
      /* slid up (or hit the 2:00 cap) -> the reader chooses; never auto-send */
      if (state === "review") return;
      /* normal hold-and-release -> upload and send */
      if (state === "recording" && mode === "hold") { stopAndSend(); return; }
      /* released before the long-press threshold -> hands-free recording */
      if (state === "idle" && wasHold) begin("tap");
    }
    btn.addEventListener("pointerup", endPress);
    btn.addEventListener("pointercancel", function (e) {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
      start = null;
      if (state === "recording") cancel();
    });
    /* a desktop user may press SPACE/ENTER on the focused mic */
    btn.addEventListener("keydown", function (e) {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (state === "idle") begin("tap");
      else if (state === "recording" || state === "review") stopAndSend();
    });
    /* never leave a recorder running when the page goes away */
    window.addEventListener("pagehide", function () { if (state === "recording") hardStop(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && state === "recording" && mode === "hold") setReview(true);
    });
    return {
      begin: begin, cancel: cancel, send: stopAndSend,
      state: function () { return state; }, supported: supported,
      setEnabled: function (fn) { if (typeof fn === "function") enabled = fn; },
      mmss: mmss
    };
  }

  /* ============================================================
     PLAYER
     ============================================================ */
  var seq = 0;
  var live = [];                                   /* every mounted player */

  function bars(n) { var s = ""; for (var i = 0; i < n; i++) s += "<i></i>"; return s; }

  /* deterministic pseudo-peaks so the box is never empty while the real
     decode runs; seeded from the src so each note looks different */
  function seedPeaks(src, n) {
    var h = 0, out = [];
    for (var i = 0; i < String(src).length; i++) h = (h * 31 + String(src).charCodeAt(i)) >>> 0;
    for (var j = 0; j < n; j++) {
      h = (h * 1103515245 + 12345) >>> 0;
      var r = ((h >>> 8) & 0xffff) / 0xffff;
      /* speech-like envelope: loud middle, quiet edges */
      var env = Math.sin((j / n) * Math.PI) * 0.72 + 0.28;
      out.push(Math.max(0.09, Math.min(1, (0.26 + r * 0.74) * env)));
    }
    return out;
  }

  function playerHTML(src, o) {
    o = o || {};
    var id = "vp" + (++seq);
    var label = o.label || "Voice message";
    return '<div class="vp" id="' + id + '" data-vsrc="' + esc(src) + '"' + (o.mine ? ' data-mine="1"' : '') + '>' +
      '<button class="vp__play" type="button" aria-label="Play ' + esc(label) + '">' +
        '<svg class="vp__ring" viewBox="0 0 44 44" aria-hidden="true">' +
          '<circle class="vp__ring-bg" cx="22" cy="22" r="19"></circle>' +
          '<circle class="vp__ring-fg" cx="22" cy="22" r="19"></circle>' +
        '</svg>' +
        '<span class="vp__ico">' + ICO.play + ICO.pause + '</span>' +
      '</button>' +
      '<div class="vp__body">' +
        '<div class="vp__wave" role="slider" tabindex="0" aria-label="Seek in ' + esc(label) + '"' +
          ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' + bars(BARS) + '</div>' +
        '<div class="vp__meta">' +
          '<span class="vp__cur">0:00</span>' +
          '<span class="vp__tag">' + ICO.wave + esc(label) + '</span>' +
          '<span class="vp__dur">–:––</span>' +
        '</div>' +
      '</div>' +
      '<button class="vp__rate" type="button" aria-label="Playback speed">1×</button>' +
      '<audio preload="metadata" src="' + esc(src) + '"></audio>' +
    '</div>';
  }

  function mount(root) {
    root = root || document;
    var nodes = root.querySelectorAll ? root.querySelectorAll(".vp:not([data-vp-on])") : [];
    Array.prototype.forEach.call(nodes, wire);
  }

  function wire(el) {
    el.setAttribute("data-vp-on", "1");
    var audio = el.querySelector("audio");
    var playBtn = el.querySelector(".vp__play");
    var wave = el.querySelector(".vp__wave");
    var wbars = el.querySelectorAll(".vp__wave i");
    var cur = el.querySelector(".vp__cur");
    var dur = el.querySelector(".vp__dur");
    var ring = el.querySelector(".vp__ring-fg");
    var rateBtn = el.querySelector(".vp__rate");
    if (!audio || !playBtn) return;

    var src = el.getAttribute("data-vsrc") || audio.getAttribute("src") || "";
    var peaks = seedPeaks(src, BARS);
    var rateIdx = 0, decoded = false, seeking = false, durFix = false;
    var R = 19, CIRC = 2 * Math.PI * R;
    if (ring) { ring.style.strokeDasharray = CIRC.toFixed(2); ring.style.strokeDashoffset = CIRC.toFixed(2); }

    function paintPeaks() {
      for (var i = 0; i < wbars.length; i++) {
        wbars[i].style.height = (10 + peaks[i] * 90).toFixed(1) + "%";
      }
    }
    paintPeaks();

    function total() {
      var d = audio.duration;
      if (!isFinite(d) || d <= 0) return 0;
      return d;
    }
    function progress() {
      var t = total();
      if (!t) return 0;
      return Math.max(0, Math.min(1, audio.currentTime / t));
    }
    function render() {
      var p = progress(), t = total();
      if (ring) ring.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(2);
      var filled = Math.round(p * BARS);
      for (var i = 0; i < wbars.length; i++) wbars[i].classList.toggle("on", i < filled);
      if (cur) cur.textContent = mmss(audio.currentTime);
      if (dur) dur.textContent = t ? mmss(t) : "–:––";
      if (wave) wave.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      el.classList.toggle("is-playing", !audio.paused && !audio.ended);
    }

    /* real peaks, decoded lazily and only once — never blocks first paint */
    function decodePeaks() {
      if (decoded) return;
      decoded = true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !src || src.indexOf("blob:") === 0) return;
      fetch(src).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (buf) {
        if (!buf) return;
        var c = new AC();
        return c.decodeAudioData(buf, function (data) {
          try { c.close(); } catch (e) {}
          var ch = data.getChannelData(0);
          var block = Math.floor(ch.length / BARS) || 1;
          var out = [], max = 0;
          for (var i = 0; i < BARS; i++) {
            var sum = 0, n = 0;
            for (var j = i * block; j < Math.min(ch.length, (i + 1) * block); j += 8) { sum += ch[j] * ch[j]; n++; }
            var v = n ? Math.sqrt(sum / n) : 0;
            out.push(v); if (v > max) max = v;
          }
          if (!max) return;
          peaks = out.map(function (v) { return Math.max(0.09, Math.min(1, Math.pow(v / max, 0.62))); });
          paintPeaks(); render();
        }, function () { try { c.close(); } catch (e) {} });
      }).catch(function () {});
    }

    function pauseOthers() {
      live.forEach(function (p) { if (p !== el) { try { p.querySelector("audio").pause(); } catch (e) {} } });
      try { if (window.TSB_COMMUNITY && TSB_COMMUNITY.pauseAllMedia) TSB_COMMUNITY.pauseAllMedia(); } catch (e) {}
    }

    playBtn.addEventListener("click", function () {
      if (audio.paused) {
        pauseOthers();
        decodePeaks();
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () { el.classList.add("is-blocked"); });
      } else { audio.pause(); }
    });

    audio.addEventListener("play", render);
    audio.addEventListener("pause", render);
    audio.addEventListener("ended", function () { try { audio.currentTime = 0; } catch (e) {} render(); });
    audio.addEventListener("timeupdate", render);
    audio.addEventListener("loadedmetadata", function () {
      /* Android/webm often reports Infinity until it has been played once */
      if (!isFinite(audio.duration) && !durFix) {
        durFix = true;
        var t = audio.currentTime;
        audio.currentTime = 1e6;
        audio.addEventListener("timeupdate", function fix() {
          if (isFinite(audio.duration)) {
            audio.removeEventListener("timeupdate", fix);
            try { audio.currentTime = t; } catch (e) {}
            render();
          }
        });
      }
      render();
    });
    audio.addEventListener("error", function () { el.classList.add("is-error"); });

    /* scrub the waveform */
    function seekTo(clientX) {
      var r = wave.getBoundingClientRect();
      if (!r.width) return;
      var p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      var t = total();
      if (t) { try { audio.currentTime = p * t; } catch (e) {} }
      render();
    }
    wave.addEventListener("pointerdown", function (e) {
      seeking = true;
      try { wave.setPointerCapture(e.pointerId); } catch (err) {}
      decodePeaks();
      seekTo(e.clientX);
      e.preventDefault();
    });
    wave.addEventListener("pointermove", function (e) { if (seeking) seekTo(e.clientX); });
    wave.addEventListener("pointerup", function (e) {
      seeking = false;
      try { wave.releasePointerCapture(e.pointerId); } catch (err) {}
    });
    wave.addEventListener("pointercancel", function () { seeking = false; });
    wave.addEventListener("keydown", function (e) {
      var t = total(); if (!t) return;
      if (e.key === "ArrowRight") { audio.currentTime = Math.min(t, audio.currentTime + 2); render(); e.preventDefault(); }
      if (e.key === "ArrowLeft") { audio.currentTime = Math.max(0, audio.currentTime - 2); render(); e.preventDefault(); }
    });

    rateBtn.addEventListener("click", function () {
      rateIdx = (rateIdx + 1) % RATES.length;
      var r = RATES[rateIdx];
      try { audio.playbackRate = r; } catch (e) {}
      rateBtn.textContent = (r === 1 ? "1×" : r + "×");
      rateBtn.classList.toggle("on", r !== 1);
    });

    /* decode in the background as soon as the player scrolls into view */
    if (window.IntersectionObserver) {
      try {
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (en) { if (en.isIntersecting) { decodePeaks(); io.disconnect(); } });
        }, { rootMargin: "200px" });
        io.observe(el);
      } catch (e) {}
    }

    render();
    live.push(el);
  }

  function pauseAll() {
    live.forEach(function (el) { try { el.querySelector("audio").pause(); } catch (e) {} });
  }

  window.TSB_VOICE = {
    supported: supported, attach: attach, pickMime: pickMime, extFor: extFor,
    playerHTML: playerHTML, mountPlayers: mount, mount: mount, pauseAll: pauseAll,
    mmss: mmss, ICONS: ICO, MAX_SEC: MAX_SEC, BARS: BARS
  };
})();
