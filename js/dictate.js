/* ============================================================
   THESMALLBOOK — 🎙️ VOICE TO TEXT (dictate.js) · v244
   FREE & ANONYMOUS-FIRST — NO SIGN-IN, EVER (like our read-aloud)
   - v244: WEB SPEECH API FIRST — the browser's own speech-to-text.
     No account, no popup, no Puter sign-in. Works on Chrome / Edge /
     Android / Safari 14.5+, on-device or browser service, instantly.
   - Puter AI (GPT-4o-transcribe / Whisper) is only a transparent
     FALLBACK for browsers without Web Speech (e.g. Firefox desktop).
   - Hinglish + 7 Indian languages · smart punctuation retained
   - Auto punctuation + lang memory: EN-IN · Hinglish · HI · TA · BN · MR · GU · KN · TE · EN-US
   - Inserts at cursor in title / hook / story body; editable after
   - Interim recording bar + timer, no cheap popup
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_DICTATE) return;

  var STORAGE_LANG = "tsb_dictate_lang";
  var LANGS = [
    { id: "en-IN", label: "EN · India", puter: "en" },
    { id: "hinglish", label: "Hinglish · Roman", puter: "en" }, // Hinglish best with auto/en for Roman mix
    { id: "hi-IN", label: "HI · हिंदी", puter: "hi" },
    { id: "ta-IN", label: "TA · தமிழ்", puter: "ta" },
    { id: "bn-IN", label: "BN · বাংলা", puter: "bn" },
    { id: "mr-IN", label: "MR · मराठी", puter: "mr" },
    { id: "gu-IN", label: "GU · ગુજરાતી", puter: "gu" },
    { id: "kn-IN", label: "KN · ಕನ್ನಡ", puter: "kn" },
    { id: "te-IN", label: "TE · తెలుగు", puter: "te" },
    { id: "en-US", label: "EN · US", puter: "en" }
  ];
  var PUTER_MAP = {};
  LANGS.forEach(function(l){ PUTER_MAP[l.id]=l.puter; });

  // Web Speech fallback detection
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var HAS_WEB_SPEECH = !!SR;

  var listening = false, targetEl = null, lang = null;
  var interimEl = null, btn = null, langSel = null, timer = null, startAt = 0;

  // Puter recording state
  var mediaRec = null, chunks = [], streamRef = null, transcribeTimer = null;
  var usePuter = true; // you chose Puter-only

  function esc(s){ return String(s).replace(/[&<>\"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function getLang(){
    try { var v = localStorage.getItem(STORAGE_LANG); if (v && LANGS.some(function(l){return l.id===v;})) return v; }catch(e){}
    var nav = (navigator.language||"en-IN").toLowerCase();
    if (nav.indexOf("hi")===0) return "hi-IN";
    if (nav.indexOf("ta")===0) return "ta-IN";
    if (nav.indexOf("bn")===0) return "bn-IN";
    if (nav.indexOf("mr")===0) return "mr-IN";
    if (nav.indexOf("gu")===0) return "gu-IN";
    if (nav.indexOf("kn")===0) return "kn-IN";
    if (nav.indexOf("te")===0) return "te-IN";
    // Mumbai default: offer Hinglish, but start with EN-IN
    return "en-IN";
  }
  function setLang(v){
    lang = v;
    try { localStorage.setItem(STORAGE_LANG, v); }catch(e){}
    if (langSel) langSel.value = v;
  }

  function isPuterReady(){
    return !!(window.puter && window.puter.ai && typeof window.puter.ai.speech2txt === "function");
  }
  function loadPuter(){
    if (isPuterReady()) return Promise.resolve(true);
    return new Promise(function(resolve){
      var s = document.createElement("script");
      s.src = "https://js.puter.com/v2/";
      s.async = true;
      s.onload = function(){ setTimeout(function(){ resolve(isPuterReady()); }, 400); };
      s.onerror = function(){ resolve(false); };
      document.head.appendChild(s);
      // safety timeout 4s
      setTimeout(function(){ resolve(isPuterReady()); }, 4200);
    });
  }

  function smartPunctuate(raw, opts){
    var t = String(raw||"");
    var isFinal = !(opts && opts.interim);
    var hadSpokenPunct = false;
    var repl = [
      [/\b(new paragraph|next paragraph|naya paragraph)\b/gi, "\n\n"],
      [/\b(new line|next line|nayi line)\b/gi, "\n"],
      [/\b(open quote|quote start|start quote|open double quote)\b/gi, "\u201C"],
      [/\b(close quote|quote end|end quote|close double quote)\b/gi, "\u201D"],
      [/\b(question mark|prashn chinha|prashna chinha)\b/gi, "?"],
      [/\b(exclamation mark|exclamation point)\b/gi, "!"],
      [/\b(full stop|period|purn viram|purnaviram|point)\b/gi, "."],
      [/\b(comma|alpviram|alp viram)\b/gi, ","],
      [/\b(colon)\b/gi, ":"],
      [/\b(semicolon)\b/gi, ";"],
      [/\b(dash|hyphen)\b/gi, "\u2014"],
      [/\b(open bracket|open parenthesis|khula bracket)\b/gi, "("],
      [/\b(close bracket|close parenthesis|band bracket)\b/gi, ")"]
    ];
    var lowerRaw = t.toLowerCase();
    if (/\b(full stop|period|purn viram|comma|question mark|new line|new paragraph|open quote|close quote)\b/i.test(lowerRaw)) hadSpokenPunct = true;
    for (var i=0;i<repl.length;i++) t = t.replace(repl[i][0], repl[i][1]);
    t = t.replace(/\s+([.,?!:;])/g, "$1");
    t = t.replace(/([.,?!:;])(?=[A-Za-z0-9\u0900-\u097F\u0A80-\u0AFF\u0980-\u09FF\u201C])/g, "$1 ");
    t = t.replace(/\u2014/g, " \u2014 ");
    t = t.replace(/\s*\(\s*/g, " (");
    t = t.replace(/\s*\)\s*/g, ") ");
    t = t.replace(/[ ]{2,}/g, " ");
    if (!hadSpokenPunct && /^(hi|hello|hey)\b/i.test(t.trim()) && !/^\s*(hi|hello|hey),/i.test(t)) {
      t = t.replace(/^\s*(hi|hello|hey)\b/i, function(m){ return m + ","; });
    }
    t = t.replace(/(^\s*[a-z]|[.!?]\s+[a-z]|\n\s*[a-z])/g, function(c){ return c.toUpperCase(); });
    t = t.replace(/(^|[\s\u201C\(])i([\s.,?!:;\)\u201D\n]|$)/g, "$1I$2");
    t = t.replace(/\u201C\s+/g, "\u201C");
    t = t.replace(/\s+\u201D/g, "\u201D");
    t = t.replace(/ +\n/g, "\n").replace(/\n +/g, "\n");
    t = t.trim();
    if (isFinal && t) {
      var endsWithPunct = /[.!?\u0964\u201D]$/.test(t.trim());
      var hasInternalPunct = /[.!?]/.test(t);
      if (!endsWithPunct) {
        var trimmed = t.trim();
        var lower = trimmed.toLowerCase();
        var isQuestion = /^(what|when|where|who|whom|why|how|is|are|am|was|were|do|does|did|can|could|will|would|should|have|has|had|may|might|shall|kya|kaise|kab|kahan|kaun)\b/i.test(lower);
        if (isQuestion && trimmed.split(/\s+/).length <= 14 && !hadSpokenPunct) {
          t = trimmed + "?";
        } else {
          if (trimmed.length >= 2) {
            if (/[,;:]$/.test(trimmed)) t = trimmed.slice(0,-1) + ".";
            else t = trimmed + ".";
          }
        }
      }
      if (!hasInternalPunct && !hadSpokenPunct && t.length > 42 && isFinal) {
        var m = t.match(/^(.{18,}?)\s+(i am|i\u2019m|i love|it is|it\u2019s|this is|we are|you are|he is|she is|they are)\b/i);
        if (m) {
          var idx = m[1].length;
          if (m[1].split(/\s+/).length >= 4) {
            var before = m[1].trim();
            var after = t.slice(idx).trim();
            if (!/[.!?]$/.test(before)) before += ".";
            after = after.charAt(0).toUpperCase() + after.slice(1);
            t = before + " " + after;
          }
        }
      }
    }
    return t;
  }

  function placeCaretAtEnd(el){
    try {
      el.focus();
      if (el.isContentEditable) {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (typeof el.selectionStart === "number") {
        var len = el.value.length;
        el.setSelectionRange(len, len);
      }
    } catch(e){}
  }

  function insertTextSmart(text){
    if (!text) return;
    // Puter already punctuates, but run light smart to ensure spacing/caps if needed
    var processed = smartPunctuate(text, {interim:false});
    if (!processed) return;
    var ae = document.activeElement;
    var isInput = ae && (ae.id==="wTitle" || ae.id==="wSub" || ae.tagName==="INPUT" || ae.tagName==="TEXTAREA");
    var isBody = ae && ae.id==="wBody";
    if (!isInput && !isBody) {
      var qMode = location.search.indexOf("mode=quote")>=0;
      if (qMode) {
        var t = document.getElementById("wTitle");
        if (t && !t.value) isInput = true, ae = t, targetEl = t;
        else ae = document.getElementById("wBody"), isBody = true;
      } else {
        ae = document.getElementById("wBody");
        isBody = true;
      }
      if (ae) ae.focus();
    }
    targetEl = ae;

    if (isInput && ae && typeof ae.value === "string") {
      var s = ae.selectionStart, e = ae.selectionEnd;
      if (typeof s !== "number" || s===null) { s = ae.value.length; e = s; }
      var before = ae.value.slice(0, s);
      var needsSpace = before && !/\s$/.test(before) && !/^[.,?!:;\)\n]/.test(processed);
      var ins = (needsSpace ? " " : "") + processed;
      ins = ins.replace(/\n+/g, " ");
      ae.value = before + ins + ae.value.slice(e);
      var pos = before.length + ins.length;
      try { ae.setSelectionRange(pos, pos); }catch(err){}
      ae.dispatchEvent(new Event("input", {bubbles:true}));
      ae.dispatchEvent(new Event("change", {bubbles:true}));
    } else if (ae && ae.isContentEditable) {
      var toInsert = processed;
      try {
        var bodyEl = document.getElementById("wBody");
        var txt = bodyEl ? (bodyEl.innerText || bodyEl.textContent || "") : "";
        var lastChar = txt.slice(-1);
        var needsSp = lastChar && !/\s/.test(lastChar) && !/^[.,?!:;)\"\u201D\n]/.test(toInsert);
        if (needsSp) toInsert = " " + toInsert;
      } catch(err2){}
      var parts = toInsert.split(/\n\n/);
      for (var pi=0; pi<parts.length; pi++) {
        var lines = parts[pi].split(/\n/);
        for (var li=0; li<lines.length; li++) {
          var chunk = lines[li];
          if (chunk) {
            try {
              document.execCommand("insertText", false, chunk);
            } catch(ex){
              var sel2 = window.getSelection();
              if (sel2 && sel2.rangeCount) {
                var r = sel2.getRangeAt(0);
                r.deleteContents();
                r.insertNode(document.createTextNode(chunk));
                r.collapse(false);
                sel2.removeAllRanges();
                sel2.addRange(r);
              } else {
                ae.textContent += chunk;
              }
            }
          }
          if (li < lines.length - 1) {
            try { document.execCommand("insertLineBreak"); } catch(e){ document.execCommand("insertHTML", false, "<br>"); }
          }
        }
        if (pi < parts.length - 1) {
          try { document.execCommand("insertParagraph"); } catch(e){ document.execCommand("insertHTML", false, "<p><br></p>"); }
        }
      }
      ae.dispatchEvent(new Event("input", {bubbles:true}));
    } else {
      var bodyF = document.getElementById("wBody");
      if (bodyF) {
        bodyF.focus();
        insertTextSmart(text);
        return;
      }
    }
    try { if (navigator.vibrate) navigator.vibrate(8); }catch(e){}
  }

  function updateBtnState(){
    if (!btn) return;
    if (listening) {
      btn.classList.add("on");
      btn.setAttribute("aria-pressed","true");
      btn.title = "Stop — tap again or press Esc";
      btn.innerHTML = '<span class="wr-dictate__dot on"></span> Stop <small id="dictateTimer">00:00</small>';
    } else {
      btn.classList.remove("on");
      btn.setAttribute("aria-pressed","false");
      btn.title = "Dictate — AI: just speak Hinglish/English naturally, we add full stops";
      btn.innerHTML = '<span class="wr-dictate__dot"></span> Dictate';
    }
  }

  function ensureInterimEl(){
    if (interimEl) return interimEl;
    interimEl = document.getElementById("dictateLive");
    if (!interimEl) {
      var wrap = document.querySelector(".wr-wrap");
      var bar = document.getElementById("wBar");
      interimEl = document.createElement("div");
      interimEl.id = "dictateLive";
      interimEl.className = "wr-dictate__live";
      interimEl.hidden = true;
      interimEl.innerHTML = '<div class="wr-dictate__livehead"><span class="wr-dictate__pulse"></span> <span id="dictateLiveTitle">Listening — just speak</span> • <span id="dictateLangLabel"></span></div><div class="wr-dictate__interim" id="dictateInterim"></div>';
      if (bar && bar.parentNode) bar.parentNode.insertBefore(interimEl, bar.nextSibling);
      else if (wrap) wrap.insertBefore(interimEl, wrap.firstChild);
    }
    return interimEl;
  }

  function showInterim(text, isFinal){
    var el = ensureInterimEl();
    var lab = document.getElementById("dictateLangLabel");
    var title = document.getElementById("dictateLiveTitle");
    var cur = lang || getLang();
    var labTxt = (function(id){
      var f = LANGS.find(function(l){ return l.id===id; });
      return f ? f.label : id;
    })(cur);
    if (lab) lab.textContent = labTxt + " • AI • you can edit after";
    if (title) title.textContent = listening ? (window._puterRecording ? "● Recording — speak Hinglish/English" : "Listening") : "Ready";
    var inter = document.getElementById("dictateInterim");
    if (!text && !listening) {
      el.hidden = true;
      return;
    }
    if (isFinal) {
      if (inter) inter.textContent = "";
      return;
    }
    if (!text) {
      el.hidden = !listening;
      if (inter) inter.textContent = listening ? (window._puterRecording ? "Speak now — Hinglish works, pauses become full stops…" : "Speak now — pauses become full stops…") : "";
      return;
    }
    el.hidden = false;
    if (inter) inter.textContent = smartPunctuate(text, {interim:true});
  }

  function startTimer(){
    startAt = Date.now();
    if (timer) clearInterval(timer);
    timer = setInterval(function(){
      var el = document.getElementById("dictateTimer");
      if (!el) return;
      var s = Math.floor((Date.now()-startAt)/1000);
      var m = Math.floor(s/60), sec = s%60;
      el.textContent = (m<10?"0":"")+m + ":" + (sec<10?"0":"")+sec;
      // auto-stop at 90s (Puter free limit)
      if (s>=88) {
        showInterim("⏱️ 90s limit — stopping, transcribing…", false);
        stop();
      }
    }, 500);
  }
  function stopTimer(){
    if (timer) clearInterval(timer);
    timer = null;
  }

  function toast(msg){
    var t = document.createElement("div");
    t.className = "stu-toast";
    t.textContent = msg;
    t.style.bottom = "84px";
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2800);
  }

  // ---------- PUTER PATH ----------
  async function transcribeWithPuter(blob, langId){
    var puterLang = PUTER_MAP[langId] || "en";
    var mime = blob.type || "audio/webm";
    var file = new File([blob], "dictate-" + Date.now() + (mime.indexOf("mp4")>=0 ? ".m4a" : ".webm"), {type: mime});
    // Hinglish: let Whisper auto-detect for Roman mix (no forced language)
    var opts = { model: "gpt-4o-transcribe" };
    if (langId !== "hinglish") {
      opts.language = puterLang;
    }
    // Try Puter
    try {
      var res = await window.puter.ai.speech2txt(file, opts);
      var txt = (res && (res.text || res.transcript || res.output_text)) || res;
      if (typeof txt === "string" && txt.trim()) return txt.trim();
      if (txt && typeof txt === "object" && txt.text) return String(txt.text).trim();
      // fallback shape
      if (typeof res === "string") return res.trim();
      return "";
    } catch(e){
      // fallback to whisper-1 with explicit language
      try{
        var res2 = await window.puter.ai.speech2txt(file, { model: "whisper-1", language: puterLang });
        var txt2 = (res2 && (res2.text || res2.transcript)) || res2;
        if (typeof txt2 === "string") return txt2.trim();
        if (txt2 && txt2.text) return String(txt2.text).trim();
        return "";
      }catch(e2){
        throw e;
      }
    }
  }

  var _puterStreamCleanup = null;

  async function startPuter(){
    // ensure puter loaded
    var ok = isPuterReady() ? true : await loadPuter();
    if (!ok) {
      toast("AI not ready — using browser dictation");
      return startWebSpeech();
    }
    // check mic
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Mic not supported on this browser — try Chrome");
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true } });
    } catch(e){
      var msg = (e && e.name==="NotAllowedError") ? "Mic blocked — allow microphone, then try again." : "Could not access mic: " + (e.message||e.name);
      toast(msg);
      return;
    }
    streamRef = stream;
    window._puterRecording = true;
    chunks = [];
    var mime = "";
    var candidates = ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus",""];
    for (var i=0;i<candidates.length;i++){
      try{ if (!candidates[i] || MediaRecorder.isTypeSupported(candidates[i])) { mime=candidates[i]; break; } }catch(_){}
    }
    try{
      mediaRec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    }catch(e){
      mediaRec = new MediaRecorder(stream);
    }
    mediaRec.ondataavailable = function(ev){ if (ev.data && ev.data.size) chunks.push(ev.data); };
    mediaRec.onstop = async function(){
      // stop tracks
      try{ stream.getTracks().forEach(function(tr){ tr.stop(); }); }catch(_){}
      window._puterRecording = false;
      var blob = new Blob(chunks, {type: mediaRec.mimeType || "audio/webm"});
      chunks = [];
      if (!blob.size) {
        toast("No audio captured — speak louder and try again");
        showInterim("", true);
        listening = false; updateBtnState(); stopTimer(); if (interimEl) interimEl.hidden=true;
        return;
      }
      // show transcribing
      var el = ensureInterimEl();
      el.hidden = false;
      var inter = document.getElementById("dictateInterim");
      if (inter) inter.textContent = "✨ Transcribing with AI (GPT-4o) — " + (lang==="hinglish" ? "Hinglish + English" : (LANGS.find(function(l){return l.id===lang;})||{}).label||lang) + " — adding full stops…";
      var liveTitle = document.getElementById("dictateLiveTitle");
      if (liveTitle) liveTitle.textContent = "Transcribing…";
      listening = false; updateBtnState(); stopTimer();
      try{
        var txt = await transcribeWithPuter(blob, lang||getLang());
        if (!txt) {
          toast("Could not transcribe — try again, speak clearer");
          if (inter) inter.textContent = "";
          el.hidden = true;
          return;
        }
        // insert with smart spacing
        insertTextSmart(txt);
        if (inter) inter.textContent = "";
        el.hidden = true;
        toast("✓ Added — " + txt.slice(0, 42) + (txt.length>42?"…":""));
      }catch(e){
        console.warn("puter transcribe failed", e);
        toast("AI busy — trying browser fallback");
        // fallback to web speech interim text if any? For now just show error and fallback
        el.hidden = true;
        // Try web speech as fallback for next utterance
        listening = false; updateBtnState();
      }
    };
    // start
    listening = true;
    updateBtnState();
    ensureInterimEl().hidden = false;
    showInterim("", false);
    startTimer();
    mediaRec.start(250);
    // focus
    var ae = document.activeElement;
    if (!ae || (ae.id!=="wTitle" && ae.id!=="wSub" && ae.id!=="wBody")) {
      var body = document.getElementById("wBody");
      if (body) { body.focus(); placeCaretAtEnd(body); }
    }
    toast("● Recording — speak Hinglish/English naturally, tap Stop when done. AI will add full stops.");
  }

  function stopPuter(){
    window._puterRecording = false;
    listening = false;
    updateBtnState();
    stopTimer();
    try{ if (mediaRec && mediaRec.state!=="inactive") mediaRec.stop(); }catch(_){}
    try{ if (streamRef) streamRef.getTracks().forEach(function(t){t.stop();}); }catch(_){}
    // If we stopped before onstop fired, we still need to handle transcribe in onstop
    // interim stays until transcription done
  }

  // ---------- WEB SPEECH FALLBACK (kept) ----------
  var rec = null;
  function startWebSpeech(){
    if (!HAS_WEB_SPEECH) {
      toast("Voice typing needs Chrome / Edge on HTTPS");
      return;
    }
    if (listening) { stopWebSpeech(); return; }
    lang = getLang();
    try{
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = (lang==="hinglish" ? "en-IN" : lang);
    }catch(e){
      toast("Couldn’t start voice typing — try again.");
      return;
    }
    listening = true;
    window._puterRecording = false;
    updateBtnState();
    ensureInterimEl().hidden = false;
    showInterim("", false);
    startTimer();
    var lastFinalNorm = "", lastFinalAt=0;
    rec.onresult = function(ev){
      var interim="", finalChunk="";
      for (var i=ev.resultIndex;i<ev.results.length;i++){
        var r=ev.results[i];
        var txt=r[0].transcript;
        if (r.isFinal) finalChunk += txt + " ";
        else interim += txt + " ";
      }
      if (interim) showInterim(interim, false);
      if (finalChunk){
        var norm = finalChunk.replace(/\s+/g," ").trim();
        if (!norm){ showInterim("", true); return; }
        var now=Date.now();
        var a = norm.toLowerCase().replace(/[.,!?;:"'“”\u2018\u2019]/g,"").replace(/\s+/g," ").trim();
        var b = lastFinalNorm;
        if (b && now-lastFinalAt<1800 && (a===b || b.indexOf(a)!==-1 || a.indexOf(b)!==-1)){ showInterim("",true); return; }
        if (b && now-lastFinalAt<1200 && Math.abs(a.length-b.length)<8){
          if (a.slice(0,14)===b.slice(0,14)){ showInterim("",true); return; }
        }
        lastFinalNorm=a; lastFinalAt=now;
        insertTextSmart(norm);
        showInterim("", true);
      }
    };
    rec.onerror = function(ev){
      var err=(ev&&ev.error)||"";
      if (err==="not-allowed"||err==="service-not-allowed"){ toast("Mic blocked — allow microphone"); stopWebSpeech(); }
      else if (err==="no-speech"){ showInterim("",false); }
      else if (err==="audio-capture"){ toast("No microphone found."); stopWebSpeech(); }
      else if (err==="aborted"){}
    };
    rec.onend = function(){
      if (listening){
        try{ rec.start(); }catch(e){ stopWebSpeech(); }
      } else {
        stopTimer(); showInterim("",true); if (interimEl) interimEl.hidden=true;
      }
    };
    try{
      rec.start();
      var ae2=document.activeElement;
      if (!ae2 || (ae2.id!=="wTitle" && ae2.id!=="wSub" && ae2.id!=="wBody")){
        var b=document.getElementById("wBody");
        if (b){ b.focus(); placeCaretAtEnd(b); }
      }
      toast("Listening — speak naturally (free · no sign-in), we’ll punctuate.");
    }catch(e){ listening=false; updateBtnState(); toast("Couldn’t start — tap Dictate again."); }
  }
  function stopWebSpeech(){
    listening=false;
    updateBtnState();
    stopTimer();
    try{ if (rec) rec.stop(); }catch(e){}
    try{ if (rec) rec.abort && rec.abort(); }catch(e){}
    rec=null;
    var el=document.getElementById("dictateLive");
    if (el) el.hidden=true;
  }

  // Unified start/stop — v244: Web Speech FIRST (free, anonymous, no sign-in). Puter only for browsers without it.
  function start(){
    lang = getLang();
    if (HAS_WEB_SPEECH){
      // the people's path: browser speech-to-text — no account, no popup, starts instantly
      startWebSpeech();
      return;
    }
    // rare fallback (Firefox desktop etc.): load the AI engine transparently
    toast("Starting voice engine…");
    loadPuter().then(function(ok){
      if (ok && !listening) startPuter();
      else if (!ok) toast("Voice typing needs Chrome, Edge or Safari — or allow the microphone.");
    });
  }
  function stop(){
    if (window._puterRecording) {
      stopPuter();
    } else if (mediaRec && mediaRec.state!=="inactive") {
      stopPuter();
    } else {
      stopWebSpeech();
    }
  }

  function buildUI(){
    var top = document.querySelector(".wr-top");
    var bar = document.getElementById("wBar");
    if (!top && !bar) return;
    if (!document.getElementById("wrDictate")) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "wrDictate";
      btn.className = "wr-dictate";
      btn.setAttribute("aria-label","Voice to text — free, no sign-in");
      btn.title = "Voice to text — free & anonymous, no sign-in";
      btn.innerHTML = '<span class="wr-dictate__dot"></span> Dictate';
      btn.addEventListener("click", function(e){
        e.preventDefault();
        if (listening || window._puterRecording) stop(); else start();
      });
      if (top) {
        var pub = document.getElementById("pubBtn");
        if (pub && pub.parentNode===top) top.insertBefore(btn, pub);
        else top.appendChild(btn);
      } else if (bar) {
        bar.appendChild(btn);
      }
    } else {
      btn = document.getElementById("wrDictate");
    }
    if (!document.getElementById("dictateLang")) {
      langSel = document.createElement("select");
      langSel.id = "dictateLang";
      langSel.className = "wr-dictate__lang";
      langSel.title = "Dictation language — free voice typing, Hinglish & 7 Indian languages, no sign-in";
      LANGS.forEach(function(l){
        var o = document.createElement("option");
        o.value = l.id; o.textContent = l.label;
        langSel.appendChild(o);
      });
      langSel.value = getLang();
      langSel.addEventListener("change", function(){ setLang(this.value); toast("Language: " + this.options[this.selectedIndex].textContent + " • free voice typing"); if (listening||window._puterRecording) { stop(); setTimeout(start, 300); } });
      if (btn && btn.parentNode) {
        btn.parentNode.insertBefore(langSel, btn.nextSibling);
      }
    } else {
      langSel = document.getElementById("dictateLang");
    }
    lang = getLang();
    updateBtnState();
    ensureInterimEl();
    ["wTitle","wSub","wBody"].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("focus", function(){ targetEl = el; });
      el.addEventListener("click", function(){ targetEl = el; });
    });
    document.addEventListener("keydown", function(e){
      if (e.key==="Escape" && (listening||window._puterRecording)) {
        e.preventDefault();
        stop();
      }
    });
    // v244: no background Puter preload — Web Speech needs nothing, sign-in popups must never appear
  }

  function init(){
    if (!document.getElementById("wTitle") && !document.getElementById("wBody")) return;
    lang = getLang();
    buildUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 300);
  }
  var tries = 0;
  var iv = setInterval(function(){
    tries++;
    if (document.getElementById("wTitle") && !document.getElementById("wrDictate")) init();
    if (tries>20) clearInterval(iv);
  }, 800);

  window.TSB_DICTATE = { start: start, stop: stop, isListening: function(){ return listening||!!window._puterRecording; }, setLang: setLang, smartPunctuate: smartPunctuate };
})();
