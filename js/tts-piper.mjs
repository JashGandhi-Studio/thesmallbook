/*
  TheSmallBook Voice Model
  On-device, opt-in speech. The Piper model is fetched once into OPFS so no
  spoken text leaves the device. This module intentionally says nothing about
  the underlying engine in the UI.

  Runtime: Piper phonemizer (MIT), ONNX Runtime Web (MIT), voice models from
  rhasspy/piper-voices (MIT). A model is about 63 MB, clearly shown before it
  downloads. The app itself stores no voice audio or text.
*/
const ROOT = "./js/vendor/tsb-voice/";
const REPO = "https://huggingface.co/rhasspy/piper-voices/resolve/main/";
const MODELS = {
  basic: {
    en: { id: "en_US-hfc_female-medium", path: "en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx", name: "TheSmallBook Voice Model" },
    hi: { id: "hi_IN-pratham-medium", path: "hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx", name: "TheSmallBook Voice Model" }
  },
  plus: {
    en: { id: "en_US-lessac-high", path: "en/en_US/lessac/high/en_US-lessac-high.onnx", name: "TheSmallBook Voice Model Plus" },
    hi: { id: "hi_IN-priyamvada-medium", path: "hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium.onnx", name: "TheSmallBook Voice Model Plus" }
  }
};
/* Gold readers choose an explicit download. Each route remains on-device. */
const PLUS_VOICES = {
  en: [MODELS.plus.en,
    { id: "en_US-amy-medium", path: "en/en_US/amy/medium/en_US-amy-medium.onnx", name: "Amy" },
    { id: "en_US-joe-medium", path: "en/en_US/joe/medium/en_US-joe-medium.onnx", name: "Joe" }],
  hi: [MODELS.plus.hi,
    { id: "hi_IN-rohan-medium", path: "hi/hi_IN/rohan/medium/hi_IN-rohan-medium.onnx", name: "Rohan" }]
};
const OLD_MODELS = MODELS;
/* catalog is intentionally public so the picker can only show real downloadable voices. */

let phonemize = null;
let ortReady = null;
let session = null;
let sessionKey = "";
const storedCache = new Map();
let voiceWorker = null;
let workerKey = "";
let workerSeq = 0;
const workerWaiters = new Map();

function base(lang) { return String(lang || "en").toLowerCase().split(/[-_]/)[0] === "hi" ? "hi" : "en"; }
function voice(tier, lang) {
  var l = base(lang); if (tier !== "plus") return MODELS.basic[l];
  var key = ""; try { key = localStorage.getItem("tsb_voice_plus_" + l) || ""; } catch (e) {}
  return PLUS_VOICES[l].filter(function (v) { return v.id === key; })[0] || PLUS_VOICES[l][0];
}
function catalog(lang) { var l = base(lang); return [{ tier:"basic", lang:l, voice:MODELS.basic[l] }].concat(PLUS_VOICES[l].map(function(v){ return { tier:"plus", lang:l, voice:v }; })); }
function selectVoice(lang, id) { var l=base(lang), ok=PLUS_VOICES[l].some(function(v){return v.id===id;}); if(ok) try { localStorage.setItem("tsb_voice_plus_"+l,id); } catch(e){} return voice("plus",l); }
function safe(s) { return String(s).replace(/[^a-z0-9_.-]/gi, "_"); }
function rootHandle() {
  if (!navigator.storage || !navigator.storage.getDirectory) return Promise.reject(new Error("This browser cannot save TheSmallBook Voice Model yet."));
  return navigator.storage.getDirectory().then(function (r) { return r.getDirectoryHandle("thesmallbook-voice-model", { create: true }); });
}
function names(v) { return { model: safe(v.id) + ".onnx", config: safe(v.id) + ".onnx.json" }; }
function modelUrl(v) { return REPO + v.path; }
async function read(dir, name) {
  try { return await (await dir.getFileHandle(name)).getFile(); } catch (e) { return null; }
}
async function write(dir, name, blob) {
  const h = await dir.getFileHandle(name, { create: true });
  const w = await h.createWritable();
  await w.write(blob); await w.close();
}
async function exists(v) {
  if (storedCache.has(v.id)) return storedCache.get(v.id);
  try { const dir = await rootHandle(), n = names(v); const yes = !!(await read(dir, n.model)) && !!(await read(dir, n.config)); storedCache.set(v.id, yes); return yes; } catch (e) { storedCache.set(v.id, false); return false; }
}
async function remove(v) {
  const dir = await rootHandle(), n = names(v);
  try { await dir.removeEntry(n.model); } catch (e) {}
  try { await dir.removeEntry(n.config); } catch (e) {}
  storedCache.set(v.id, false);
}
async function fetchBlob(url, progress) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("TheSmallBook Voice Model could not download. Please try again.");
  const total = +res.headers.get("content-length") || 0;
  const reader = res.body.getReader();
  const chunks = []; let loaded = 0;
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    chunks.push(r.value); loaded += r.value.byteLength;
    if (progress) progress({ loaded: loaded, total: total, phase: "model" });
  }
  if (progress) progress({ loaded: total || loaded, total: total || loaded, phase: "model" });
  return new Blob(chunks);
}
async function cacheRuntime() {
  /* The voice lives in OPFS; cache the small local engine alongside it so a
     reader who prepared it once can listen on a train without a network. */
  if (!window.caches) return;
  const files = [
    ROOT + "ort-wasm.min.js", ROOT + "ort-wasm-simd.wasm", ROOT + "ort-wasm.wasm",
    ROOT + "piper-phonemize.mjs", ROOT + "piper-phonemize.wasm", ROOT + "piper-phonemize.data"
  ];
  try { const c = await caches.open("tsb-voice-runtime-v1"); await c.addAll(files); } catch (e) {}
}
async function download(tier, lang, progress) {
  const v = voice(tier, lang), dir = await rootHandle(), n = names(v);
  if (await exists(v)) { if (progress) progress({ loaded: 1, total: 1, phase: "ready" }); return v; }
  const model = await fetchBlob(modelUrl(v), progress);
  const config = await fetchBlob(modelUrl(v) + ".json");
  await write(dir, n.model, model); await write(dir, n.config, config);
  storedCache.set(v.id, true);
  if (progress) progress({ loaded: 1, total: 1, phase: "engine" });
  /* Runtime caching is useful offline but never holds the download sheet or UI. */
  const idle = self.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
  idle(function () { cacheRuntime(); }, { timeout: 4000 });
  if (progress) progress({ loaded: 1, total: 1, phase: "ready" });
  return v;
}
function script(src) {
  return new Promise(function (resolve, reject) {
    const found = document.querySelector('script[data-tsb-voice-runtime]');
    if (found && window.ort) return resolve(window.ort);
    const s = found || document.createElement("script");
    s.setAttribute("data-tsb-voice-runtime", "");
    s.src = src; s.async = true;
    s.onload = function () { resolve(window.ort); };
    s.onerror = function () { reject(new Error("TheSmallBook Voice Model runtime did not load.")); };
    if (!found) document.head.appendChild(s);
  });
}
async function runtime() {
  if (ortReady) return ortReady;
  ortReady = script(ROOT + "ort-wasm.min.js").then(function (ort) {
    if (!ort || !ort.env || !ort.env.wasm) throw new Error("Voice runtime is unavailable.");
    /* one thread avoids a cross-origin-isolation requirement and works safely in every app view */
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = ROOT;
    return ort;
  });
  return ortReady;
}
async function phonemizer() {
  if (phonemize) return phonemize;
  const mod = await import("./vendor/tsb-voice/piper-phonemize.mjs");
  phonemize = mod.createPiperPhonemize;
  return phonemize;
}
function chunks(text, max) {
  const s = String(text || "").trim(); if (!s) return [];
  const lim = max || 360, out = []; let rest = s;
  while (rest.length > lim) {
    let p = Math.max(rest.lastIndexOf(". ", lim), rest.lastIndexOf("! ", lim), rest.lastIndexOf("? ", lim), rest.lastIndexOf(", ", lim));
    if (p < lim * .45) p = rest.lastIndexOf(" ", lim);
    if (p < 1) p = lim;
    out.push(rest.slice(0, p + 1).trim()); rest = rest.slice(p + 1).trim();
  }
  if (rest) out.push(rest); return out;
}
function wav(pcm, rate) {
  const out = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(out);
  v.setUint32(0, 1179011410, true); v.setUint32(4, out.byteLength - 8, true); v.setUint32(8, 1163280727, true);
  v.setUint32(12, 544501094, true); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  v.setUint32(36, 1635017060, true); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0, p = 44; i < pcm.length; i++, p += 2) v.setInt16(p, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  return out;
}
async function buildSession(tier, lang) {
  const v = voice(tier, lang), k = v.id;
  if (session && sessionKey === k) return session;
  if (!(await exists(v))) throw new Error("TheSmallBook Voice Model has not been downloaded.");
  if (session && session.release) { try { await session.release(); } catch (e) {} }
  const dir = await rootHandle(), n = names(v), config = JSON.parse(await (await read(dir, n.config)).text());
  const model = await (await read(dir, n.model)).arrayBuffer();
  const ort = await runtime();
  session = { v: v, c: config, o: ort, s: await ort.InferenceSession.create(model, { executionProviders: ["wasm"] }) };
  sessionKey = k; return session;
}
async function one(text, s) {
  const create = await phonemizer();
  const ids = await new Promise(async function (resolve, reject) {
    try {
      const mod = await create({
        print: function (line) { try { resolve(JSON.parse(line).phoneme_ids); } catch (e) { reject(e); } },
        printErr: function (m) { reject(new Error(String(m))); },
        locateFile: function (f) { if (/\.wasm$/.test(f)) return ROOT + "piper-phonemize.wasm"; if (/\.data$/.test(f)) return ROOT + "piper-phonemize.data"; return f; }
      });
      mod.callMain(["-l", s.c.espeak.voice, "--input", JSON.stringify([{ text: text.trim() }]), "--espeak_data", "/espeak-ng-data"]);
    } catch (e) { reject(e); }
  });
  const feeds = {
    input: new s.o.Tensor("int64", ids, [1, ids.length]),
    input_lengths: new s.o.Tensor("int64", [ids.length]),
    scales: new s.o.Tensor("float32", [s.c.inference.noise_scale, s.c.inference.length_scale, s.c.inference.noise_w])
  };
  if (Object.keys(s.c.speaker_id_map || {}).length) feeds.sid = new s.o.Tensor("int64", [0]);
  return (await s.s.run(feeds)).output.data;
}
function rejectWorkerWaiters(error) {
  workerWaiters.forEach(function (w) { w.reject(error); }); workerWaiters.clear();
}
function workerCall(payload, transfer, onChunk) {
  return new Promise(function (resolve, reject) {
    const id = ++workerSeq; workerWaiters.set(id, { resolve: resolve, reject: reject, progress: payload.progress, chunk: onChunk });
    try { voiceWorker.postMessage(Object.assign({}, payload, { id: id }), transfer || []); } catch (e) { workerWaiters.delete(id); reject(e); }
  });
}
function workerForVoice() {
  if (voiceWorker) return voiceWorker;
  voiceWorker = new Worker(new URL("./tts-piper-worker.js?v=338", import.meta.url));
  voiceWorker.onmessage = function (event) {
    const d = event.data || {}, w = workerWaiters.get(d.id); if (!w) return;
    if (d.type === "progress") { if (w.progress) w.progress({ loaded: d.loaded, total: d.total, phase: "speaking" }); return; }
    if (d.type === "chunk") { if (w.chunk) w.chunk(d.wav, d.loaded, d.total); return; }
    workerWaiters.delete(d.id);
    if (d.type === "error") w.reject(new Error(d.error || "Voice worker failed"));
    else w.resolve(d);
  };
  voiceWorker.onerror = function () { rejectWorkerWaiters(new Error("Voice worker failed")); try { voiceWorker.terminate(); } catch (e) {} voiceWorker = null; workerKey = ""; };
  return voiceWorker;
}
async function prepareWorker(tier, lang) {
  const v = voice(tier, lang), k = v.id;
  if (voiceWorker && workerKey === k) return;
  if (!(await exists(v))) throw new Error("TheSmallBook Voice Model has not been downloaded.");
  const dir = await rootHandle(), n = names(v), model = await (await read(dir, n.model)).arrayBuffer(), config = await (await read(dir, n.config)).text();
  workerForVoice(); await workerCall({ type: "init", key: k, model: model, config: config }, [model]); workerKey = k;
}
async function speakMain(text, opt) {
  const o = opt || {}, s = await buildSession(o.tier === "plus" ? "plus" : "basic", o.lang || "en");
  const ps = []; const cs = chunks(text);
  for (let i = 0; i < cs.length; i++) { if (o.progress) o.progress({ loaded: i, total: cs.length, phase: "speaking" }); ps.push(await one(cs[i], s)); }
  const n = ps.reduce(function (a, p) { return a + p.length; }, 0), all = new Float32Array(n); let at = 0;
  ps.forEach(function (p) { all.set(p, at); at += p.length; });
  if (o.progress) o.progress({ loaded: cs.length, total: cs.length, phase: "speaking" });
  return new Blob([wav(all, s.c.audio.sample_rate)], { type: "audio/wav" });
}
async function speakStream(text, opt, onChunk) {
  const o = opt || {}, tier = o.tier === "plus" ? "plus" : "basic", lang = o.lang || "en";
  try {
    await prepareWorker(tier, lang);
    await workerCall({ type: "speak", text: String(text || ""), rate: o.rate || 1.08, progress: o.progress }, [], function (ab) {
      if (onChunk) onChunk(new Blob([ab], { type: "audio/wav" }));
    });
  } catch (e) {
    /* A restricted browser can still listen. Normal browsers stay entirely
       worker-backed, so model inference never blocks the interface. */
    if (onChunk) onChunk(await speakMain(text, o));
  }
}
async function speak(text, opt) {
  /* Compatibility for internal callers that want one Blob. The player uses
     speakStream so normal reading begins on the first available segment. */
  const blobs = []; await speakStream(text, opt, function (b) { blobs.push(b); });
  if (blobs.length <= 1) return blobs[0] || new Blob([], { type: "audio/wav" });
  const buffers = await Promise.all(blobs.map(function (b) { return b.arrayBuffer(); }));
  const bytes = buffers.reduce(function (n, b) { return n + Math.max(0, b.byteLength - 44); }, 0), header = buffers[0].slice(0, 44), view = new DataView(header);
  view.setUint32(4, 36 + bytes, true); view.setUint32(40, bytes, true);
  return new Blob([header].concat(buffers.slice(0).map(function (b, i) { return i ? b.slice(44) : b.slice(44); })), { type: "audio/wav" });
}
async function status() {
  const all = [];
  for (const tier of ["basic", "plus"]) for (const lang of ["en", "hi"]) { const v = voice(tier, lang); all.push({ tier: tier, lang: lang, id: v.id, name: v.name, stored: await exists(v) }); }
  return all;
}
export { MODELS, PLUS_VOICES, catalog, selectVoice, download, remove, speak, speakStream, status, exists };
