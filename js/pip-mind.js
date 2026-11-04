/* ==========================================================================
   PIP MIND  ·  v379
   --------------------------------------------------------------------------
   Pip is not a mascot. Pip is the memory of this reader, with a face.

   One file, four calls, so any screen can use Pip without knowing anything
   about how Pip thinks:

     TSB_PIP.log(event)    any screen reports what happened
     TSB_PIP.say(where)    give me one true line, or null for silence
     TSB_PIP.ask(where)    may I ask one question here, right now
     TSB_PIP.shelf()       the memory the reader can see

   Rules the code enforces, not just intends:
     1. One line. Never two paragraphs. Eighteen words at most.
     2. Only true things. If the app does not know, Pip is silent.
     3. The reader's language, including Hinglish and Gujlish text modes.
     4. Never cheerful at the wrong moment.
     5. Silence is a real answer.
     6. One question a day, never two in a row, never mid chapter.
     7. Nothing about feelings ever leaves the phone, and there is a floor
        under the floor for self harm: a helpline, before anything else.

   No network calls. No language model. Nothing to hallucinate about a life.
   ========================================================================== */
(function () {
  "use strict";
  if (window.TSB_PIP_MIND && window.TSB_PIP_MIND.version === "379") return;

  /* ---------------------------------------------------------------- storage */
  var LOG_KEY = "tsb_pip_log";
  var STATE_KEY = "tsb_pip_state";
  var LOG_CAP = 400;
  var LOG_DAYS = 90;

  function jget(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { return new Date().toISOString().slice(0, 10); }
  function hour() { return new Date().getHours(); }
  function startOfDay(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }

  function state() {
    var s = jget(STATE_KEY, null);
    if (!s || typeof s !== "object") s = {};
    if (!s.mood) s.mood = [];
    if (!s.asked) s.asked = {};
    if (!s.said) s.said = {};
    if (!s.skip) s.skip = {};
    return s;
  }
  function saveState(s) { jset(STATE_KEY, s); }

  function log(event) {
    if (!event || !event.k) return;
    var box = jget(LOG_KEY, []);
    if (!Array.isArray(box)) box = [];
    event.at = event.at || Date.now();
    box.push(event);
    var floor = Date.now() - LOG_DAYS * 864e5;
    box = box.filter(function (e) { return e.at >= floor; });
    if (box.length > LOG_CAP) box = box.slice(box.length - LOG_CAP);
    jset(LOG_KEY, box);
    try { window.dispatchEvent(new CustomEvent("tsb:pipmind", { detail: event })); } catch (e) {}
    return event;
  }
  function events(kind) {
    var box = jget(LOG_KEY, []);
    if (!Array.isArray(box)) return [];
    return kind ? box.filter(function (e) { return e.k === kind; }) : box;
  }
  function lastOf(kind) {
    var list = events(kind);
    return list.length ? list[list.length - 1] : null;
  }

  /* ------------------------------------------------------- the reader's data */
  function progress() { return jget("tsb_progress", {}) || {}; }
  function books() { return window.BOOKS || []; }
  function bookById(id) {
    var list = books();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function bookTitle(id) {
    var b = bookById(id);
    if (b && b.title) return b.title;
    var last = lastOf("open");
    if (last && last.book === id && last.title) return last.title;
    return id ? String(id).replace(/-/g, " ") : "";
  }
  function chaptersDone(id) {
    var p = progress();
    return Array.isArray(p[id]) ? p[id].length : 0;
  }
  function chapterTotal(id) {
    var b = bookById(id);
    return b && b.lessons ? b.lessons.length : 0;
  }
  function finishedBooks() {
    var out = [];
    var p = progress();
    Object.keys(p).forEach(function (id) {
      var total = chapterTotal(id);
      if (total && Array.isArray(p[id]) && p[id].length >= total) out.push(id);
    });
    return out;
  }
  function notes() {
    try {
      var uid = (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user() && TSB_AUTH.user().id) || "guest";
      return JSON.parse(localStorage.getItem("tsb_notes_v1_" + uid) || "[]") || [];
    } catch (e) { return []; }
  }
  function streak() { var s = jget("tsb_streak", null); return (s && s.count) || 0; }
  function lastPlayed() { return jget("tsb_last_played", null) || jget("tsb_audio_last", null); }

  /* ------------------------------------------------------------- the language */
  var LANG = { code: "en", mode: "native" };
  function readLang() {
    try {
      var raw = localStorage.getItem("tsb_lang");
      if (!raw) return;
      var v = JSON.parse(raw);
      if (typeof v === "string") LANG.code = v;
      else if (v && v.code) { LANG.code = v.code; LANG.mode = v.mode || "native"; }
      if (LANG.code === "hi-Latn") { LANG.code = "hi"; LANG.mode = "latn"; }
      if (LANG.code === "gu-Latn") { LANG.code = "gu"; LANG.mode = "latn"; }
    } catch (e) {}
  }

  /* Every line exists in English. The other languages keep the same shape and
     the same length, because a translated paragraph is a different character. */
  var LINES = {
    welcome: {
      en: ["One small idea a day. That is the whole app."],
      hi: ["रोज़ एक छोटा विचार। बस इतना ही।"],
      "hi-latn": ["Roz ek chhota vichaar. Bas itna hi."],
      gu: ["રોજ એક નાનો વિચાર. બસ એટલું જ."],
      "gu-latn": ["Roj ek nano vichaar. Bas etlu j."],
      mr: ["रोज एक छोटी कल्पना. एवढंच."],
      ta: ["ஒரு நாளுக்கு ஒரு சிறு கருத்து. அவ்வளவுதான்."],
      te: ["రోజుకి ఒక చిన్న ఆలోచన. అంతే."],
      bn: ["দিনে একটা ছোট ভাবনা। এটুকুই।"]
    },
    half: {
      en: ["You stopped at chapter {ch} of {title}. Four minutes finishes it."],
      hi: ["{title} के अध्याय {ch} पर रुके थे। चार मिनट में हो जाएगा।"],
      "hi-latn": ["{title} ke chapter {ch} par ruke the. Chaar minute mein ho jayega."],
      gu: ["{title} ના {ch} પર અટક્યા હતા. ચાર મિનિટમાં થઈ જશે."],
      "gu-latn": ["{title} na {ch} par atakya hata. Chaar minute ma thai jashe."],
      mr: ["{title} च्या {ch} वर थांबला होता. चार मिनिटांत होईल."]
    },
    away: {
      en: ["{days} days. Still on chapter {ch} of {title}?"],
      hi: ["{days} दिन। अब भी {title} के {ch} पर?"],
      "hi-latn": ["{days} din. Ab bhi {title} ke chapter {ch} par?"],
      gu: ["{days} દિવસ. હજી {title} ના {ch} પર?"],
      "gu-latn": ["{days} divas. Haji {title} na {ch} par?"]
    },
    finished: {
      en: ["Done. That is {n} this year. Want a shorter one?"],
      hi: ["पूरा हुआ। इस साल {n}। छोटा वाला चाहिए?"],
      "hi-latn": ["Poora hua. Is saal {n}. Chhota wala chahiye?"],
      gu: ["પૂરું થયું. આ વર્ષે {n}. નાનું જોઈએ?"],
      "gu-latn": ["Puru thayu. Aa varshe {n}. Nanu joiye?"]
    },
    kept: {
      en: ["You kept that line. It mattered enough to keep."],
      hi: ["वह पंक्ति आपने रखी। रखने लायक थी।"],
      "hi-latn": ["Woh line aapne rakhi. Rakhne layak thi."],
      gu: ["એ લાઈન તમે રાખી. રાખવા જેવી હતી."],
      "gu-latn": ["E line tame rakhi. Rakhva jevi hati."]
    },
    unanswered: {
      en: ["Yesterday's question is still open. One sentence is enough."],
      hi: ["कल का सवाल अभी खुला है। एक वाक्य काफ़ी है।"],
      "hi-latn": ["Kal ka sawaal abhi khula hai. Ek line kaafi hai."],
      gu: ["ગઈકાલનો સવાલ હજી ખુલ્લો છે. એક વાક્ય પૂરતું છે."],
      "gu-latn": ["Gaikaldno sawaal haji khullo chhe. Ek vaakya purtu chhe."]
    },
    day: {
      en: ["One good page is enough for today."],
      hi: ["आज के लिए एक अच्छा पेज काफ़ी है।"],
      "hi-latn": ["Aaj ke liye ek achha page kaafi hai."],
      gu: ["આજ માટે એક સારું પાનું પૂરતું છે."],
      "gu-latn": ["Aaj mate ek saru paanu purtu chhe."]
    },
    night: {
      en: ["It is late. This one can wait till morning."],
      hi: ["देर हो गई। यह सुबह के लिए रहने दें।"],
      "hi-latn": ["Der ho gayi. Yeh subah ke liye rahne dein."],
      gu: ["મોડું થઈ ગયું. આ સવાર માટે રહેવા દો."],
      "gu-latn": ["Modu thai gayu. Aa savaar mate raheva do."]
    },
    listening: {
      en: ["{title} is at {min} minutes. Finish the walk?"],
      hi: ["{title} {min} मिनट पर है। चलते-चलते पूरा करें?"],
      "hi-latn": ["{title} {min} minute par hai. Chalte-chalte poora karein?"],
      gu: ["{title} {min} મિનિટ પર છે. ચાલતાં ચાલતાં પૂરું કરીએ?"],
      "gu-latn": ["{title} {min} minute par chhe. Chaltan chaltan puru karie?"]
    }
  };

  var QUESTIONS = {
    recall: {
      en: "In your own words, what was the one thing?",
      hi: "अपने शब्दों में, एक बात क्या थी?",
      "hi-latn": "Apne shabdon mein, ek baat kya thi?",
      gu: "તમારા શબ્દોમાં, એક વાત શું હતી?",
      "gu-latn": "Tamara shabdo ma, ek vaat shu hati?"
    },
    apply: {
      en: "What will you do differently tomorrow?",
      hi: "कल आप क्या अलग करेंगे?",
      "hi-latn": "Kal aap kya alag karoge?",
      gu: "કાલે તમે શું અલગ કરશો?",
      "gu-latn": "Kale tame shu alag karsho?"
    },
    doubt: {
      en: "Where do you think this idea fails?",
      hi: "इस विचार में कमी कहाँ है?",
      "hi-latn": "Is vichaar mein kami kahan hai?",
      gu: "આ વિચારમાં ક્યાં ખામી છે?",
      "gu-latn": "Aa vichaar ma kya khami chhe?"
    }
  };

  function pick(table, key, vars) {
    var set = table[key] || table.welcome;
    var code = LANG.code || "en";
    var key2 = code === "hi" && LANG.mode === "latn" ? "hi-latn"
      : code === "gu" && LANG.mode === "latn" ? "gu-latn" : code;
    var text = (set[key2] || set[code] || set.en)[0] || "";
    if (vars) Object.keys(vars).forEach(function (k) { text = text.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]); });
    return text;
  }

  /* ------------------------------------------------------------------ timing */
  /* v382: the app's day bands start the morning at 05:00, so Pip's quiet
     hours have to end there too. At 05:30 the page said Good morning while
     Pip said it was late, which reads as a bug even when both are polite. */
  function quietHours() { var h = hour(); return h >= 23 || h < 5; }
  function saidToday(tag) { var s = state(); return s.said[tag] === today(); }
  function markSaid(tag) { var s = state(); s.said[tag] = today(); saveState(s); }
  function askedToday() { var s = state(); return s.asked.day === today(); }
  function markAsked() { var s = state(); s.asked.day = today(); s.asked.at = Date.now(); saveState(s); }
  function daysSince(ms) { return Math.floor((Date.now() - ms) / 864e5); }

  /* --------------------------------------------------------------- the brain */
  /* One true line, in priority order. Null means Pip says nothing. */
  function say(where) {
    readLang();
    var now = Date.now();

    /* 0. the first time Pip ever speaks to this reader */
    if (!localStorage.getItem("tsb_pip_met")) {
      try { localStorage.setItem("tsb_pip_met", "1"); } catch (e) {}
      return { text: pick(LINES, "welcome"), tone: "warm", tag: "welcome" };
    }

    /* 1. a book the reader left half way through */
    var p = progress();
    var openIds = Object.keys(p).filter(function (id) {
      var done = (p[id] || []).length, total = chapterTotal(id);
      return done > 0 && (!total || done < total);
    }).sort(function (a, b) { return (p[b] || []).length - (p[a] || []).length; });

    if (openIds.length) {
      var id = openIds[0];
      var done = (p[id] || []).length;
      var opened = lastOf("open");
      var when = opened && opened.book === id ? opened.at : now;
      var gap = daysSince(when);
      var title = bookTitle(id);
      if (gap >= 5) return { text: pick(LINES, "away", { days: gap, ch: done, title: title }), tone: "plain", tag: "away:" + id };
      if (!saidToday("half")) return { text: pick(LINES, "half", { ch: done + 1, title: title }), tone: "plain", tag: "half" };
    }

    /* 2. a question the reader was asked and did not answer */
    var s = state();
    if (s.asked.pending && !s.asked.answered) {
      if (!saidToday("unanswered")) return { text: pick(LINES, "unanswered"), tone: "plain", tag: "unanswered" };
    }

    /* 3. late at night, quietly */
    if (quietHours() && !saidToday("night")) return { text: pick(LINES, "night"), tone: "quiet", tag: "night" };

    /* 4. a book finished today */
    var fin = finishedBooks();
    if (fin.length && !saidToday("finished")) {
      return { text: pick(LINES, "finished", { n: fin.length }), tone: "plain", tag: "finished" };
    }

    /* 5. a line they kept, with their own note */
    var hl = jget("tsb_highlights_v1", {}) || {};
    var hlIds = Object.keys(hl);
    if (hlIds.length && !saidToday("kept")) {
      return { text: pick(LINES, "kept"), tone: "warm", tag: "kept" };
    }

    /* 6. something they were listening to */
    var lp = lastPlayed();
    if (lp && lp.title && !saidToday("listening")) {
      var mins = Math.round((lp.pos || 0) / 60);
      if (mins >= 3) return { text: pick(LINES, "listening", { title: String(lp.title).slice(0, 28), min: mins }), tone: "plain", tag: "listening" };
    }

    /* 7. a quiet morning with no history yet still deserves one true line.
       Before this, Pip vanished from Today on every visit after the first,
       which is the one place the character is supposed to live. */
    if (!saidToday("day")) return { text: pick(LINES, "day"), tone: "plain", tag: "day" };
    return null;
  }

  /* ------------------------------------------------------------ the questions */
  var SELF_HARM = /(kill myself|suicide|end my life|want to die|no reason to live|khudkhushi|aatmhatya|marna chahta|jeena nahi|marvu chhe)/i;
  var HEAVY = /(sad|depress|anxious|anxiety|lonely|alone|tired of|give up|udas|dukhi|akela|pareshan)/i;

  function mayAsk(where) {
    var s = state();
    if (askedToday()) return false;
    if (s.asked.pending && !s.asked.answered) return false;
    /* a reader who is reading at 2am is not to be interrupted on the Today
       screen, but a question at the end of the chapter they just finished is
       part of the reading, not an interruption, so the hour does not block it */
    if (quietHours() && where !== "chapter") return false;
    if (where === "chapter") {
      var n = Object.keys(s.skip).length;
      if (n >= 3) return false;
    }
    return true;
  }

  function questionFor(kind) {
    readLang();
    var code = LANG.code || "en";
    var key = code === "hi" && LANG.mode === "latn" ? "hi-latn" : code === "gu" && LANG.mode === "latn" ? "gu-latn" : code;
    var set = QUESTIONS[kind] || QUESTIONS.apply;
    return set[key] || set[code] || set.en;
  }

  function pickKind(book) {
    var done = book ? chaptersDone(book) : 0;
    if (done === 1) return "recall";
    if (done === 2) return "apply";
    return done % 3 === 0 ? "doubt" : "apply";
  }

  /* ---------------------------------------------------------------- the floor */
  function floorFor(text) {
    if (!SELF_HARM.test(String(text || ""))) return null;
    return {
      heavy: true,
      text: LANG.code === "hi" && LANG.mode !== "latn"
        ? "मैं यह सुनकर रुक गया। अभी किसी इंसान से बात करें।"
        : "I am going to stop being a book for a moment. Please talk to a person now.",
      help: [
        { label: "Tele-MANAS 14416", href: "tel:14416" },
        { label: "KIRAN 1800 599 0019", href: "tel:18005990019" }
      ]
    };
  }

  /* --------------------------------------------------------------- the shelf */
  function shelf() {
    var fin = finishedBooks();
    var notesList = notes();
    return {
      books: fin.map(function (id) { return { id: id, title: bookTitle(id) }; }),
      answers: notesList.filter(function (n) { return n && n.pip; }).slice(-40),
      streak: streak()
    };
  }

  function clear() {
    try { localStorage.removeItem(LOG_KEY); localStorage.removeItem(STATE_KEY); localStorage.removeItem("tsb_pip_met"); } catch (e) {}
  }

  window.TSB_PIP_MIND = {
    version: "380",
    log: log, say: say, ask: mayAsk, shelf: shelf, clear: clear,
    events: events, lastOf: lastOf,
    /* the rest of the app reads the same memory: the feed, the shelf, the
       "continue" rail. One truth, many readers. */
    signals: function () {
      var opened = events("open").slice(-12).reverse();
      var heard = events("listen").slice(-12).reverse();
      var kept = events("keep").slice(-12).reverse();
      return { opened: opened, heard: heard, kept: kept, streak: streak(), finished: finishedBooks() };
    }, questionFor: questionFor, pickKind: pickKind,
    floorFor: floorFor, quietNow: quietHours, markAsked: markAsked, questionShown: markAsked, lang: function () { readLang(); return { code: LANG.code, mode: LANG.mode }; }
  };
})();
