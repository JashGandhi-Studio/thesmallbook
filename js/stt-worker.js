/* TheSmallBook · on-device speech to text (v334)
   Whisper (OpenAI, MIT) running in the browser through transformers.js
   (Hugging Face, Apache-2.0). The model downloads once (about 40 MB),
   then stays in the browser cache. Audio never leaves the phone and no
   key or account is needed. */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
env.allowLocalModels = false;
let asr = null, loading = null;
const MODEL = "Xenova/whisper-tiny"; /* tiny = about 40 MB, safe on 2 GB phones; base crashed low-memory devices in testing */
function load() {
  if (asr) return Promise.resolve(asr);
  if (!loading) {
    loading = pipeline("automatic-speech-recognition", MODEL, {
      progress_callback: (p) => { if (p && p.status === "progress") self.postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total }); }
    }).then((p) => { asr = p; return p; });
  }
  return loading;
}
self.onmessage = async (e) => {
  const d = e.data || {};
  try {
    await load();
    if (d.type === "load") { self.postMessage({ type: "ready" }); return; }
    const out = await asr(d.audio, { language: d.lang || null, task: "transcribe", chunk_length_s: 30, stride_length_s: 5 });
    self.postMessage({ type: "result", id: d.id, text: String((out && out.text) || "").trim() });
  } catch (err) {
    self.postMessage({ type: "error", id: d.id, message: String((err && err.message) || err) });
  }
};
