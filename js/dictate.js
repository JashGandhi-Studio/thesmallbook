/* ============================================================
   THESMALLBOOK — 🎙️ VOICE TO TEXT (dictate.js) · v229
   Professional, accurate dictation for the Write page.
   - Web Speech API (on-device, no upload) — continuous + interim
   - Auto punctuation: pauses become sentences — no need to say “full stop”
   - Spoken punctuation still works: say “comma”, “new line”, etc. if you want
   - Auto-capitalize + fix spacing; dialog via “open quote / close quote”
   - Lang-aware: en-IN · hi-IN · gu-IN · mr-IN · bn-IN · en-US
   - Inserts at cursor in title / hook / story body; you can edit after
   - Interim preview bar, pulsing mic, language memory
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_DICTATE) return;

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var SUPPORTED = !!SR;
  var STORAGE_LANG = "tsb_dictate_lang";
  var LANGS = [
    { id: "en-IN", label: "EN · India" },
    { id: "hi-IN", label: "HI · हिंदी" },
    { id: "gu-IN", label: "GU · ગુજરાતી" },
    { id: "mr-IN", label: "MR · मराठी" },
    { id: "bn-IN", label: "BN · বাংলা" },
    { id: "en-US", label: "EN · US" }
  ];

  var rec = null, listening = false, targetEl = null, lang = null;
  var interimEl = null, btn = null, langSel = null, timer = null, startAt = 0;

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function getLang(){
    try { var v = localStorage.getItem(STORAGE_LANG); if (v && LANGS.some(function(l){return l.id===v;})) return v; }catch(e){}
    // default to en-IN for Mumbai user, fallback to browser lang
    var nav = (navigator.language||"en-IN").toLowerCase();
    if (nav.indexOf("hi")===0) return "hi-IN";
    if (nav.indexOf("gu")===0) return "gu-IN";
    if (nav.indexOf("mr")===0) return "mr-IN";
    if (nav.indexOf("bn")===0) return "bn-IN";
    return "en-IN";
  }
  function setLang(v){
    lang = v;
    try { localStorage.setItem(STORAGE_LANG, v); }catch(e){}
    if (langSel) langSel.value = v;
    if (rec) try { rec.lang = v; }catch(e){}
  }

  function smartPunctuate(raw, opts){
    var t = String(raw||"");
    var isFinal = !(opts && opts.interim);
    var hadSpokenPunct = false;
    // check if raw already contains spoken punctuation words — if so we already have explicit punctuation
    // spoken punctuation — case-insensitive, word-bound (still works, but not required)
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
    // detect if spoken punctuation was present before replace (to avoid double auto-punct)
    var lowerRaw = t.toLowerCase();
    if (/\b(full stop|period|purn viram|comma|question mark|new line|new paragraph|open quote|close quote)\b/i.test(lowerRaw)) hadSpokenPunct = true;
    for (var i=0;i<repl.length;i++) t = t.replace(repl[i][0], repl[i][1]);
    // tidy spacing around punctuation (but keep quotes tight)
    t = t.replace(/\s+([.,?!:;])/g, "$1");
    t = t.replace(/([.,?!:;])(?=[A-Za-z0-9\u0900-\u097F\u0A80-\u0AFF\u0980-\u09FF\u201C])/g, "$1 ");
    t = t.replace(/\u2014/g, " \u2014 ");
    t = t.replace(/\s*\(\s*/g, " (");
    t = t.replace(/\s*\)\s*/g, ") ");
    t = t.replace(/[ ]{2,}/g, " ");
    // greeting comma — "hi my name" -> "Hi, my name" (only when not already punctuated explicitly)
    if (!hadSpokenPunct && /^(hi|hello|hey)\b/i.test(t.trim()) && !/^\s*(hi|hello|hey),/i.test(t)) {
      t = t.replace(/^\s*(hi|hello|hey)\b/i, function(m){ return m + ","; });
    }
    // smart capitalisation — first char + after .!? + after newlines
    t = t.replace(/(^\s*[a-z]|[.!?]\s+[a-z]|\n\s*[a-z])/g, function(c){ return c.toUpperCase(); });
    // pronoun I — always capital
    t = t.replace(/(^|[\s\u201C\(])i([\s.,?!:;\)\u201D\n]|$)/g, "$1I$2");
    // fix quote spacing: no space after opening, no space before closing
    t = t.replace(/\u201C\s+/g, "\u201C");
    t = t.replace(/\s+\u201D/g, "\u201D");
    // Trim but keep paragraph breaks
    t = t.replace(/ +\n/g, "\n").replace(/\n +/g, "\n");
    t = t.trim();
    // AUTO PUNCTUATION — the main fix for natural speech
    // If this is a FINAL chunk and user did NOT say explicit punctuation,
    // detect sentence end and add . or ? automatically.
    if (isFinal && t) {
      var endsWithPunct = /[.!?\u0964\u201D]$/.test(t.trim());
      var hasInternalPunct = /[.!?]/.test(t);
      if (!endsWithPunct) {
        // strip trailing spaces for check
        var trimmed = t.trim();
        var lower = trimmed.toLowerCase();
        // question detection — starts with question word and is reasonably short or ends with rising tone
        var isQuestion = /^(what|when|where|who|whom|why|how|is|are|am|was|were|do|does|did|can|could|will|would|should|have|has|had|may|might|shall|kya|kaise|kab|kahan|kaun)\b/i.test(lower);
        // also treat "my name is ?" style as not question, but "what is your name" as question
        // If user said a long paragraph with multiple clauses but no punctuation, we add period at end
        // and try to split internal sentences by heuristics if length > 60 chars and no punctuation — add period before conjunctions?
        // Simple: just add ? or .
        if (isQuestion && trimmed.split(/\s+/).length <= 14 && !hadSpokenPunct) {
          t = trimmed + "?";
        } else {
          // avoid adding . after a single word like "Hi," — keep as is for very short greetings?
          // But "Hi my name is Jash Gandhi" -> should be "Hi, my name is Jash Gandhi."
          if (trimmed.length >= 2) {
            // don't double punctuate if last char is comma
            if (/[,;:]$/.test(trimmed)) t = trimmed.slice(0,-1) + ".";
            else t = trimmed + ".";
          }
        }
        // re-capitalise after auto period addition (in case next chunk will be capitalised on insert)
      } else {
        // already has punctuation from spoken words — just ensure spacing is clean
      }
      // If long chunk without internal punctuation but has clear sentence boundary (e.g., "hi my name is Jash Gandhi i am from Mumbai")
      // Try to insert period between obvious sentences: heuristic — split on " i am", " i love", " this is", " we are", " you are"
      // Only if no internal .?! and length > 40 chars
      if (!hasInternalPunct && !hadSpokenPunct && t.length > 42 && isFinal) {
        // Look for second clause starting with "I am", "I'm", "I love", "It is", "This is", "We are", "You are"
        // Replace " i am" / " i " at mid-point with ". I am"
        // We do a single split at the first strong boundary past 18 chars
        var m = t.match(/^(.{18,}?)\s+(i am|i\u2019m|i love|it is|it\u2019s|this is|we are|you are|he is|she is|they are)\b/i);
        if (m) {
          var idx = m[1].length;
          // ensure we don't break inside a name
          if (m[1].split(/\s+/).length >= 4) {
            var before = m[1].trim();
            var after = t.slice(idx).trim();
            // ensure before ends with punctuation, after starts capital
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
    var processed = smartPunctuate(text, {interim:false});
    if (!processed) return;
    // honour new lines: for inputs (title/sub) turn newlines into spaces
    var ae = document.activeElement;
    var isInput = ae && (ae.id==="wTitle" || ae.id==="wSub" || ae.tagName==="INPUT" || ae.tagName==="TEXTAREA");
    var isBody = ae && ae.id==="wBody";
    // if nothing focused, target the body (story) by default, or title in quote mode
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
      // ensure spacing: add a space if needed between before and new text
      var needsSpace = before && !/\s$/.test(before) && !/^[.,?!:;)\n]/.test(processed);
      var ins = (needsSpace ? " " : "") + processed;
      // for inputs, flatten newlines to space
      ins = ins.replace(/\n+/g, " ");
      ae.value = before + ins + ae.value.slice(e);
      var pos = before.length + ins.length;
      try { ae.setSelectionRange(pos, pos); }catch(err){}
      ae.dispatchEvent(new Event("input", {bubbles:true}));
      ae.dispatchEvent(new Event("change", {bubbles:true}));
    } else if (ae && ae.isContentEditable) {
      // for contenteditable, use execCommand/insertText with paragraph handling
      var toInsert = processed;
      // if last char in body is not space/newline and new text doesn't start with punctuation/space, add a space
      try {
        var sel = window.getSelection();
        var atEnd = true;
        if (sel && sel.rangeCount) {
          var range = sel.getRangeAt(0);
          var container = range.commonAncestorContainer;
          // simple check: if body text ends without space and we are at end, we need space
        }
        // check body text end
        var bodyEl = document.getElementById("wBody");
        var txt = bodyEl ? (bodyEl.innerText || bodyEl.textContent || "") : "";
        var lastChar = txt.slice(-1);
        var needsSp = lastChar && !/\s/.test(lastChar) && !/^[.,?!:;)"\u201D\n]/.test(toInsert);
        if (needsSp) toInsert = " " + toInsert;
      } catch(err2){}
      // Insert: handle newlines as <br> via execCommand
      // We'll split on \n\n for paragraphs
      var parts = toInsert.split(/\n\n/);
      for (var pi=0; pi<parts.length; pi++) {
        var lines = parts[pi].split(/\n/);
        for (var li=0; li<lines.length; li++) {
          var chunk = lines[li];
          if (chunk) {
            try {
              document.execCommand("insertText", false, chunk);
            } catch(ex){
              // fallback: insert via range
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
      // ensure a trailing space for next dictation to be spaced
      // dispatch input so autosave fires
      ae.dispatchEvent(new Event("input", {bubbles:true}));
    } else {
      // fallback: append to body
      var bodyF = document.getElementById("wBody");
      if (bodyF) {
        bodyF.focus();
        insertTextSmart(text); // re-enter with body focused
        return;
      }
    }
    // haptic + small flash
    try { if (navigator.vibrate) navigator.vibrate(8); }catch(e){}
  }

  function updateBtnState(){
    if (!btn) return;
    if (!SUPPORTED) {
      btn.disabled = true;
      btn.title = "Voice typing needs Chrome / Edge on HTTPS";
      btn.innerHTML = '<span class="wr-dictate__dot" style="background:#999"></span> Dictate <small style="opacity:.6">unsupported</small>';
      btn.classList.add("is-unsupported");
      return;
    }
    if (listening) {
      btn.classList.add("on");
      btn.setAttribute("aria-pressed","true");
      btn.title = "Stop dictation — tap again or press Esc";
      btn.innerHTML = '<span class="wr-dictate__dot on"></span> Stop <small id="dictateTimer">00:00</small>';
    } else {
      btn.classList.remove("on");
      btn.setAttribute("aria-pressed","false");
      btn.title = "Dictate — just speak naturally, we add punctuation. You can still say \u2018full stop\u2019 if you want";
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
      interimEl.innerHTML = '<div class="wr-dictate__livehead"><span class="wr-dictate__pulse"></span> Listening — just speak, we punctuate • <span id="dictateLangLabel"></span></div><div class="wr-dictate__interim" id="dictateInterim"></div>';
      if (bar && bar.parentNode) bar.parentNode.insertBefore(interimEl, bar.nextSibling);
      else if (wrap) wrap.insertBefore(interimEl, wrap.firstChild);
    }
    return interimEl;
  }

  function showInterim(text, isFinal){
    var el = ensureInterimEl();
    var lab = document.getElementById("dictateLangLabel");
    if (lab) lab.textContent = (lang||getLang()) + " • you can edit after";
    var inter = document.getElementById("dictateInterim");
    if (!text && !isFinal) {
      el.hidden = !listening;
      if (inter) inter.textContent = listening ? "Speak now — pauses become full stops…" : "";
      return;
    }
    if (isFinal) {
      el.hidden = !listening; // keep visible while listening
      if (inter) inter.textContent = "";
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
    }, 500);
  }
  function stopTimer(){
    if (timer) clearInterval(timer);
    timer = null;
  }

  function start(){
    if (!SUPPORTED) {
      toast("Voice typing needs Chrome or Edge on HTTPS. Try Chrome on Android/desktop.");
      return;
    }
    if (listening) { stop(); return; }
    lang = getLang();
    try {
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = lang;
    } catch(e){
      toast("Couldn\u2019t start voice typing — try again.");
      return;
    }
    listening = true;
    updateBtnState();
    ensureInterimEl().hidden = false;
    showInterim("", false);
    startTimer();
    var finalSeen = "";
    rec.onresult = function(ev){
      var interim = "", finalChunk = "";
      for (var i=ev.resultIndex; i<ev.results.length; i++){
        var res = ev.results[i];
        var txt = res[0].transcript;
        if (res.isFinal) finalChunk += txt + " ";
        else interim += txt + " ";
      }
      if (interim) showInterim(interim, false);
      if (finalChunk) {
        finalChunk = finalChunk.trim();
        if (finalChunk && finalChunk !== finalSeen) {
          finalSeen = finalChunk;
          // small debounce to avoid duplicate inserts from overlapping finals
          insertTextSmart(finalChunk);
          showInterim("", true);
        }
      }
    };
    rec.onerror = function(ev){
      var err = (ev && ev.error) || "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast("Mic blocked — allow microphone in browser settings, then try again.");
        stop();
      } else if (err === "no-speech") {
        // keep listening, just show hint
        showInterim("", false);
      } else if (err === "audio-capture") {
        toast("No microphone found.");
        stop();
      } else if (err === "aborted") {
        // stopped intentionally
      } else {
        // keep going for network etc
        // console.log("dictate error", err)
      }
    };
    rec.onend = function(){
      if (listening) {
        // Chrome ends after ~60s of silence — auto-restart if still meant to listen
        try { rec.start(); } catch(e){ stop(); }
      } else {
        // fully stopped
        stopTimer();
        showInterim("", true);
        if (interimEl) interimEl.hidden = true;
      }
    };
    try {
      rec.start();
      // focus current field so insert target is clear
      var ae = document.activeElement;
      if (!ae || (ae.id!=="wTitle" && ae.id!=="wSub" && ae.id!=="wBody")) {
        var body = document.getElementById("wBody");
        if (body) { body.focus(); placeCaretAtEnd(body); }
      }
      toast("Listening — just speak naturally, we\u2019ll punctuate.");
    } catch(e){
      listening = false;
      updateBtnState();
      toast("Couldn\u2019t start — try tapping Dictate again.");
    }
  }

  function stop(){
    listening = false;
    updateBtnState();
    stopTimer();
    try { if (rec) rec.stop(); }catch(e){}
    try { if (rec) rec.abort && rec.abort(); }catch(e){}
    rec = null;
    var el = document.getElementById("dictateLive");
    if (el) el.hidden = true;
  }

  function toast(msg){
    var t = document.createElement("div");
    t.className = "stu-toast";
    t.textContent = msg;
    t.style.bottom = "84px";
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2600);
  }

  function buildUI(){
    // find places to inject: wr-top and wr-bar
    var top = document.querySelector(".wr-top");
    var bar = document.getElementById("wBar");
    if (!top && !bar) return;

    // create dictate button if not exists
    if (!document.getElementById("wrDictate")) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "wrDictate";
      btn.className = "wr-dictate";
      btn.setAttribute("aria-label","Voice to text");
      btn.innerHTML = '<span class="wr-dictate__dot"></span> Dictate';
      btn.addEventListener("click", function(e){
        e.preventDefault();
        if (listening) stop(); else start();
      });
      // place in top bar: before publish button, or after saveState
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

    // language picker (compact)
    if (!document.getElementById("dictateLang")) {
      langSel = document.createElement("select");
      langSel.id = "dictateLang";
      langSel.className = "wr-dictate__lang";
      langSel.title = "Dictation language";
      LANGS.forEach(function(l){
        var o = document.createElement("option");
        o.value = l.id; o.textContent = l.label;
        langSel.appendChild(o);
      });
      langSel.value = getLang();
      langSel.addEventListener("change", function(){ setLang(this.value); toast("Language: " + this.options[this.selectedIndex].textContent); if (listening) { stop(); setTimeout(start, 240); } });
      // place after button
      if (btn && btn.parentNode) {
        btn.parentNode.insertBefore(langSel, btn.nextSibling);
      }
    } else {
      langSel = document.getElementById("dictateLang");
    }
    lang = getLang();
    updateBtnState();
    ensureInterimEl();
    // track focus for target
    ["wTitle","wSub","wBody"].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("focus", function(){ targetEl = el; });
      el.addEventListener("click", function(){ targetEl = el; });
    });
    // Esc to stop
    document.addEventListener("keydown", function(e){
      if (e.key==="Escape" && listening) {
        e.preventDefault();
        stop();
      }
    });
  }

  function init(){
    if (!document.getElementById("wTitle") && !document.getElementById("wBody")) return;
    lang = getLang();
    buildUI();
    // if permission already granted, we don't auto-start — user taps
  }

  // auto-init when DOM ready and when write page signals signed-in
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 300);
  }
  // also re-init after community ready (write page defers init)
  var tries = 0;
  var iv = setInterval(function(){
    tries++;
    if (document.getElementById("wTitle") && !document.getElementById("wrDictate")) init();
    if (tries>20) clearInterval(iv);
  }, 800);

  window.TSB_DICTATE = { start: start, stop: stop, isListening: function(){ return listening; }, setLang: setLang, smartPunctuate: smartPunctuate };
})();
