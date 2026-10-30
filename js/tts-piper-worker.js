/* TheSmallBook Voice Model worker.
   Inference stays off the browser UI thread so gestures, scrolling and page
   transitions remain responsive while a private voice is preparing speech. */
"use strict";
const ROOT = "./vendor/tsb-voice/";
let runtimeReady = false;
let makePhonemizer = null;
let session = null;
let activeKey = "";

function chunks(text, max) {
  const s = String(text || "").trim(); if (!s) return [];
  const lim = max || 220, out = []; let rest = s;
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
  v.setUint32(36, 1635011410, true); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0, p = 44; i < pcm.length; i++, p += 2) v.setInt16(p, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  return out;
}
async function runtime() {
  if (runtimeReady) return;
  importScripts(ROOT + "ort-wasm.min.js");
  if (!self.ort || !ort.env || !ort.env.wasm) throw new Error("Voice runtime unavailable");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = ROOT;
  const mod = await import("./vendor/tsb-voice/piper-phonemize.mjs");
  makePhonemizer = mod.createPiperPhonemize;
  runtimeReady = true;
}
async function initialise(d) {
  if (session && activeKey === d.key) return;
  await runtime();
  if (session && session.release) { try { await session.release(); } catch (_) {} }
  const config = JSON.parse(d.config);
  session = { c: config, s: await ort.InferenceSession.create(d.model, { executionProviders: ["wasm"] }) };
  activeKey = d.key;
}
async function one(text, rate) {
  const create = makePhonemizer;
  const ids = await new Promise(async (resolve, reject) => {
    try {
      const mod = await create({
        print: (line) => { try { resolve(JSON.parse(line).phoneme_ids); } catch (e) { reject(e); } },
        printErr: (m) => reject(new Error(String(m))),
        locateFile: (f) => /\.wasm$/.test(f) ? ROOT + "piper-phonemize.wasm" : /\.data$/.test(f) ? ROOT + "piper-phonemize.data" : f
      });
      mod.callMain(["-l", session.c.espeak.voice, "--input", JSON.stringify([{ text: text.trim() }]), "--espeak_data", "/espeak-ng-data"]);
    } catch (e) { reject(e); }
  });
  const pace = Math.max(.76, Math.min(1.22, Number(rate) || 1.08));
  const feeds = {
    input: new ort.Tensor("int64", ids, [1, ids.length]),
    input_lengths: new ort.Tensor("int64", [ids.length]),
    scales: new ort.Tensor("float32", [session.c.inference.noise_scale, Math.max(.68, Math.min(1.45, session.c.inference.length_scale / pace)), session.c.inference.noise_w])
  };
  if (Object.keys(session.c.speaker_id_map || {}).length) feeds.sid = new ort.Tensor("int64", [0]);
  return (await session.s.run(feeds)).output.data;
}
async function speak(d) {
  if (!session) throw new Error("Voice model has not been prepared");
  const cs = chunks(d.text, 220);
  for (let i = 0; i < cs.length; i++) {
    const out = wav(await one(cs[i], d.rate), session.c.audio.sample_rate);
    /* The first segment can play immediately while this worker prepares the
       following segment. The page never waits for a whole lesson waveform. */
    self.postMessage({ id: d.id, type: "chunk", wav: out, loaded: i + 1, total: cs.length }, [out]);
    self.postMessage({ id: d.id, type: "progress", loaded: i + 1, total: cs.length });
  }
  self.postMessage({ id: d.id, type: "end" });
}
self.onmessage = async (event) => {
  const d = event.data || {};
  try {
    if (d.type === "init") { await initialise(d); self.postMessage({ id: d.id, type: "ready" }); }
    else if (d.type === "speak") await speak(d);
  } catch (e) { self.postMessage({ id: d.id, type: "error", error: String((e && e.message) || e) }); }
};
