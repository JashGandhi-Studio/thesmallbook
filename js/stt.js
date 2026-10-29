/* ============================================================
   TheSmallBook · TSB_SR, speech to text that does not fail (v334)
   A drop-in for the Web Speech API (same start/stop/onresult/onend
   shape), so every mic in the app uses one engine:
     1. the phone's own recogniser (fast, live words) when it works;
     2. if it is missing or fails (Firefox, some in-app browsers, no
        Google service, network errors) it switches, mid-tap, to
        Whisper running ON the phone (js/stt-worker.js). No API key,
        no account, and the audio never leaves the device.
   Recording stops by itself after 1.6 s of quiet or 40 s in total.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_SR) return;
  var Native = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var FALLBACK_ERRORS = { "network": 1, "service-not-allowed": 1, "language-not-supported": 1, "bad-grammar": 1 };
  var worker = null, seq = 0, pending = {};
  var WL = { en: "english", hi: "hindi", ta: "tamil", bn: "bengali", mr: "marathi", gu: "gujarati", kn: "kannada", te: "telugu", ml: "malayalam", pa: "punjabi", ur: "urdu" };

  var scriptSrc = (document.currentScript && document.currentScript.src) || "";
  function workerUrl() { return scriptSrc ? scriptSrc.replace(/stt\.js(\?.*)?$/, "stt-worker.js") : "js/stt-worker.js"; }
  var getWorker = (function () {
    return function () {
      if (worker) return worker;
      worker = new Worker(workerUrl(), { type: "module" });
      worker.onmessage = function (e) {
        var d = e.data || {};
        if (d.type === "progress") { try { window.dispatchEvent(new CustomEvent("tsb:stt-progress", { detail: d })); } catch (er) {} return; }
        var cb = pending[d.id]; if (!cb) return; delete pending[d.id];
        cb(d);
      };
      worker.onerror = function () { for (var k in pending) { pending[k]({ type: "error", message: "worker" }); delete pending[k]; } };
      return worker;
    };
  })();

  function transcribe(float32, lang) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = function (d) { if (d.type === "result") resolve(d.text); else reject(new Error(d.message || "stt")); };
      try { getWorker().postMessage({ type: "run", id: id, audio: float32, lang: lang }, [float32.buffer]); } catch (e) { delete pending[id]; reject(e); }
    });
  }
  async function toMono16k(blob) {
    var buf = await blob.arrayBuffer();
    var AC = window.AudioContext || window.webkitAudioContext;
    var ac = new AC();
    var audio = await new Promise(function (ok, bad) { ac.decodeAudioData(buf, ok, bad); });
    try { ac.close(); } catch (e) {}
    var len = Math.ceil(audio.duration * 16000);
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var off = new OAC(1, Math.max(1, len), 16000);
    var src = off.createBufferSource(); src.buffer = audio; src.connect(off.destination); src.start(0);
    var out = await off.startRendering();
    return new Float32Array(out.getChannelData(0));
  }
  /* first-time download pill: "Setting up voice typing 42%" */
  var pill = null, files = {}, hideT = 0;
  window.addEventListener("tsb:stt-progress", function (e) {
    var d = e.detail || {}; if (!d.file || !d.total) return;
    files[d.file] = [d.loaded || 0, d.total];
    var a = 0, b = 0; for (var k in files) { a += files[k][0]; b += files[k][1]; }
    var pct = b ? Math.min(100, Math.round(a * 100 / b)) : 0;
    if (!pill) {
      pill = document.createElement("div");
      pill.setAttribute("role", "status");
      pill.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);transform:translateX(-50%);z-index:2147483001;background:#16130F;color:#FBF8F1;font:600 13px/1.2 'Space Grotesk',system-ui,sans-serif;padding:10px 16px;border-radius:999px;box-shadow:0 8px 24px rgba(22,19,15,.25);pointer-events:none;transition:opacity .3s";
      document.body.appendChild(pill);
    }
    pill.style.opacity = "1";
    pill.textContent = pct < 100 ? "Setting up voice typing, one time " + pct + "%" : "Voice typing ready";
    clearTimeout(hideT);
    if (pct >= 100) hideT = setTimeout(function () { if (pill) pill.style.opacity = "0"; }, 1400);
  });
  function langCode(l) { return String(l || document.documentElement.lang || "en").toLowerCase().split("-")[0]; }

  function ev(results) { return { resultIndex: 0, results: results }; }
  function res(text, isFinal) { var alt = [{ transcript: text, confidence: 0.9 }]; alt.isFinal = isFinal; return alt; }

  function TSB_SR() {
    this.lang = "en-IN"; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1;
    this.onresult = null; this.onerror = null; this.onend = null; this.onstart = null; this.onaudiostart = null; this.onspeechend = null;
    this._n = null; this._rec = null; this._stopped = false; this._ended = false; this.engine = "";
  }
  TSB_SR.prototype._emit = function (name, arg) { try { var f = this["on" + name]; if (typeof f === "function") f.call(this, arg); } catch (e) {} };
  TSB_SR.prototype._end = function () { if (this._ended) return; this._ended = true; this._emit("end"); };
  TSB_SR.prototype.start = function () {
    var self = this;
    self._stopped = false; self._ended = false; self._aborted = false;
    if (Native && !TSB_SR.forceWhisper) {
      var n = new Native(), got = false, switched = false;
      self._n = n; self.engine = "native";
      n.lang = self.lang; n.continuous = self.continuous; n.interimResults = self.interimResults; n.maxAlternatives = 1;
      var alive = false;
      /* watchdog: some browsers (Chromium without Google keys, some in-app
         WebViews) expose a recogniser that never starts and never errors */
      var dog = setTimeout(function () {
        if (alive || switched || self._stopped) return;
        switched = true; stick();
        n.onend = null; n.onerror = null; n.onresult = null;
        try { n.abort(); } catch (e) {}
        self._whisper();
      }, 3000);
      n.onstart = function () { alive = true; clearTimeout(dog); self._emit("start"); };
      n.onaudiostart = function () { alive = true; clearTimeout(dog); self._emit("audiostart"); };
      n.onspeechend = function () { self._emit("speechend"); };
      n.onresult = function (e) { got = true; self._emit("result", e); };
      n.onerror = function (e) {
        var code = e && e.error;
        clearTimeout(dog);
        if (!got && FALLBACK_ERRORS[code] && !self._stopped) { switched = true; stick(); self._whisper(); return; }
        self._emit("error", e);
      };
      n.onend = function () { clearTimeout(dog); if (!switched) self._end(); };
      try { n.start(); } catch (e) { switched = true; stick(); self._whisper(); }
      return;
    }
    self._whisper();
  };
  TSB_SR.prototype._whisper = async function () {
    var self = this;
    self.engine = "whisper"; self._n = null;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder || !window.Worker) {
      self._emit("error", { error: "not-supported", message: "This browser cannot record audio." }); self._end(); return;
    }
    var stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { self._emit("error", { error: "not-allowed", message: "Microphone permission is off." }); self._end(); return; }
    try { getWorker().postMessage({ type: "load" }); } catch (e) {}
    var chunks = [], rec;
    try { rec = new MediaRecorder(stream); } catch (e) { self._emit("error", { error: "audio-capture" }); self._end(); return; }
    self._rec = rec;
    var AC = window.AudioContext || window.webkitAudioContext, ac = null, an = null, quietSince = 0, heard = false, t0 = Date.now(), raf = 0;
    try { ac = new AC(); var srcN = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 1024; srcN.connect(an); } catch (e) {}
    var data = an ? new Uint8Array(an.fftSize) : null;
    function watch() {
      if (!self._rec || rec.state !== "recording") return;
      if (an) {
        an.getByteTimeDomainData(data);
        var peak = 0; for (var i = 0; i < data.length; i++) { var v = Math.abs(data[i] - 128); if (v > peak) peak = v; }
        if (peak > 10) { heard = true; quietSince = 0; } else if (heard && !quietSince) quietSince = Date.now();
        if (heard && quietSince && Date.now() - quietSince > 1600) { self.stop(); return; }
      }
      if (Date.now() - t0 > 40000) { self.stop(); return; }
      raf = requestAnimationFrame(watch);
    }
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = async function () {
      cancelAnimationFrame(raf);
      if (self._aborted) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} try { if (ac) ac.close(); } catch (e) {} return; }
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { if (ac) ac.close(); } catch (e) {}
      self._emit("speechend");
      if (!chunks.length) { self._end(); return; }
      try {
        if (self.interimResults) self._emit("result", ev([res("\u2026", false)]));
        var pcm = await toMono16k(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        var text = await transcribe(pcm, WL[langCode(self.lang)] || null);
        if (text) self._emit("result", ev([res(text, true)]));
        else self._emit("error", { error: "no-speech" });
      } catch (e) { self._emit("error", { error: "network", message: "Could not turn that into text. Try again." }); }
      self._end();
    };
    rec.start(250);
    self._emit("start"); self._emit("audiostart");
    raf = requestAnimationFrame(watch);
  };
  TSB_SR.prototype.stop = function () {
    this._stopped = true;
    if (this._n) { try { this._n.stop(); } catch (e) {} return; }
    if (this._rec && this._rec.state === "recording") { try { this._rec.stop(); } catch (e) {} }
  };
  TSB_SR.prototype.abort = function () {
    /* stop() then abort() (a common pattern): keep the words already spoken */
    if (this._stopped && this.engine === "whisper") return;
    this._stopped = true; this._aborted = true;
    if (this._n) { try { this._n.abort(); } catch (e) {} return; }
    if (this._rec && this._rec.state === "recording") { this._rec.ondataavailable = null; try { this._rec.stop(); } catch (e) {} }
    this._end();
  };
  /* remember for a week that this browser's own recogniser is broken */
  try { var fw = +(localStorage.getItem("tsb_stt_whisper") || 0); TSB_SR.forceWhisper = fw > Date.now(); } catch (e) { TSB_SR.forceWhisper = false; }
  function stick() { TSB_SR.forceWhisper = true; try { localStorage.setItem("tsb_stt_whisper", String(Date.now() + 7 * 864e5)); } catch (e) {} }
  TSB_SR.transcribe = transcribe;
  window.TSB_SR = TSB_SR;
})();
