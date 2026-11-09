/* v406 · Kokoro English: the best quality on-device English voice.
   Kokoro-82M runs fully in the browser (WebAssembly). The engine is
   shipped with the app; the voice model itself is downloaded once,
   only when a reader chooses it, and is then cached by the browser
   so listening works offline. Hindi keeps the Piper voices, which
   Kokoro does not speak. Model: onnx-community/Kokoro-82M-v1.0-ONNX
   (Apache 2.0). Engine: kokoro-js (Apache 2.0), vendored at
   js/vendor/kokoro.web.js. */
let tts = null;
let loading = null;

export function kokoroReadyFlag() {
  try { return localStorage.getItem("tsb_kokoro_ready") === "1"; } catch (e) { return false; }
}
function markReady() {
  try { localStorage.setItem("tsb_kokoro_ready", "1"); } catch (e) {}
}

export function loadKokoro(progress) {
  if (tts) return Promise.resolve(tts);
  if (loading) return loading;
  loading = import("./vendor/kokoro.web.js").then(function (m) {
    return m.KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device: "wasm",
      progress_callback: function (p) {
        if (!progress || !p) return;
        try {
          if (p.status === "progress" && p.total) progress({ phase: "model", loaded: p.loaded || 0, total: p.total || 0 });
          else progress({ phase: "engine", loaded: 0, total: 0 });
        } catch (e) {}
      }
    });
  }).then(function (t) {
    tts = t;
    markReady();
    return t;
  }).catch(function (err) {
    loading = null;
    throw err;
  });
  return loading;
}

/* Speak one passage and hand back a WAV blob for the shared player
   plumbing in tts-engine.js. Voice: af_heart, the highest rated
   Kokoro English voice. */
export function kokoroSpeak(text, speed) {
  return loadKokoro(null).then(function (t) {
    return t.generate(String(text || ""), { voice: "af_heart", speed: Math.min(1.6, Math.max(0.6, speed || 1)) });
  }).then(function (audio) {
    return audio.toBlob();
  });
}
