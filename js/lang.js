/* ============================================================
   THESMALLBOOK — UNIVERSAL LANGUAGE ENGINE 🌐  (v2 — robust)
   Translates the ENTIRE app into 24+ languages using the Google
   Translate page engine — now driven DIRECTLY (not cookie-only):
   we load the widget, wait for its language selector to exist,
   set it programmatically, and fire the change event. Retries
   included. Plus two exclusive modes:

   • HINGLISH — Hindi, transliterated live to Roman letters
     ("tum kya kar rahe ho" style).
   • GUJLISH — Gujarati in Roman letters ("tame shu karo cho").
   ============================================================ */

(function () {
  var LS_KEY = "tsb_lang";

  var LANGUAGES = [
    { code: "en",  name: "English",    native: "English",   flag: "🇬🇧" },
    { code: "hi",  name: "Hindi",      native: "हिन्दी",      flag: "🇮🇳" },
    { code: "hi-Latn", name: "Hinglish", native: "Tum kya kar rahe ho — Hindi in English letters", flag: "🇮🇳", special: true, base: "hi" },
    { code: "gu",  name: "Gujarati",   native: "ગુજરાતી",     flag: "🇮🇳" },
    { code: "gu-Latn", name: "Gujlish", native: "Tame shu karo cho — Gujarati in English letters", flag: "🇮🇳", special: true, base: "gu" },
    { code: "mr",  name: "Marathi",    native: "मराठी",       flag: "🇮🇳" },
    { code: "bn",  name: "Bengali",    native: "বাংলা",       flag: "🇮🇳" },
    { code: "ta",  name: "Tamil",      native: "தமிழ்",       flag: "🇮🇳" },
    { code: "te",  name: "Telugu",     native: "తెలుగు",      flag: "🇮🇳" },
    { code: "kn",  name: "Kannada",    native: "ಕನ್ನಡ",       flag: "🇮🇳" },
    { code: "ml",  name: "Malayalam",  native: "മലയാളം",     flag: "🇮🇳" },
    { code: "pa",  name: "Punjabi",    native: "ਪੰਜਾਬੀ",      flag: "🇮🇳" },
    { code: "ur",  name: "Urdu",       native: "اردو",        flag: "🇮🇳" },
    { code: "or",  name: "Odia",       native: "ଓଡ଼ିଆ",       flag: "🇮🇳" },
    { code: "es",  name: "Spanish",    native: "Español",    flag: "🇪🇸" },
    { code: "fr",  name: "French",     native: "Français",   flag: "🇫🇷" },
    { code: "de",  name: "German",     native: "Deutsch",    flag: "🇩🇪" },
    { code: "pt",  name: "Portuguese", native: "Português",  flag: "🇧🇷" },
    { code: "it",  name: "Italian",    native: "Italiano",   flag: "🇮🇹" },
    { code: "ru",  name: "Russian",    native: "Русский",    flag: "🇷🇺" },
    { code: "ar",  name: "Arabic",     native: "العربية",     flag: "🇸🇦" },
    { code: "zh-CN", name: "Chinese",  native: "中文",        flag: "🇨🇳" },
    { code: "ja",  name: "Japanese",   native: "日本語",      flag: "🇯🇵" },
    { code: "ko",  name: "Korean",     native: "한국어",      flag: "🇰🇷" },
    { code: "id",  name: "Indonesian", native: "Bahasa",     flag: "🇮🇩" },
    { code: "tr",  name: "Turkish",    native: "Türkçe",     flag: "🇹🇷" }
  ];

  // comma list of real google codes (bases for the special modes)
  var GOOGLE_CODES = "hi,gu,mr,bn,ta,te,kn,ml,pa,ur,or,es,fr,de,pt,it,ru,ar,zh-CN,ja,ko,id,tr";

  function getLang() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || "en"; } catch (e) { return "en"; }
  }
  function setLang(code) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(code)); } catch (e) {}
  }
  function findLang(code) {
    for (var i = 0; i < LANGUAGES.length; i++) if (LANGUAGES[i].code === code) return LANGUAGES[i];
    return null;
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  /* ---------- cookie (helps the widget pick up on load) ---------- */
  function setGoogCookie(target) {
    var expire = "; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = "googtrans=" + expire + "; path=/";
    document.cookie = "googtrans=" + expire + "; path=/; domain=" + location.hostname;
    document.cookie = "googtrans=" + expire + "; path=/; domain=." + location.hostname;
    if (target) {
      var v = "/en/" + target;
      document.cookie = "googtrans=" + v + "; path=/";
      document.cookie = "googtrans=" + v + "; path=/; domain=" + location.hostname;
    }
  }

  /* ---------- widget loading ---------- */
  var widgetRequested = false;
  function loadGoogleWidget() {
    if (widgetRequested) return;
    widgetRequested = true;
    var mount = document.getElementById("google_translate_element");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "google_translate_element";
      mount.setAttribute("style", "position:fixed; bottom:-9999px; left:-9999px; height:1px; overflow:hidden;");
      document.body.appendChild(mount);
    }
    window.googleTranslateElementInit = function () {
      try {
        new google.translate.TranslateElement({
          pageLanguage: "en",
          includedLanguages: GOOGLE_CODES,
          autoDisplay: false
        }, "google_translate_element");
      } catch (e) {}
    };
    var s = document.createElement("script");
    s.id = "gt-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.onerror = function () {
      toast("🌐 Translation needs internet — please check your connection");
    };
    document.head.appendChild(s);
  }

  /* ---------- THE FIX: drive the widget's selector directly ---------- */
  function fireTranslate(target, attemptsLeft, onFail) {
    var combo = document.querySelector("select.goog-te-combo");
    if (combo && combo.options && combo.options.length > 1) {
      try {
        combo.value = target;
        combo.dispatchEvent(new Event("change", { bubbles: true }));
        // verify shortly after; retry once if the page didn't translate
        setTimeout(function () {
          if (!document.documentElement.classList.contains("translated-ltr") &&
              !document.documentElement.classList.contains("translated-rtl") &&
              !document.querySelector("font")) {
            try {
              combo.value = target;
              combo.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (e) {}
          }
        }, 1500);
        return;
      } catch (e) {}
    }
    if (attemptsLeft > 0) {
      setTimeout(function () { fireTranslate(target, attemptsLeft - 1, onFail); }, 400);
    } else if (onFail) {
      onFail();
    }
  }

  /* ============================================================
     TRANSLITERATION ENGINES (script → Roman letters)
     ============================================================ */
  var DEV_CONS = { "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"n","च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"n","ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n","त":"t","थ":"th","द":"d","ध":"dh","न":"n","प":"p","फ":"ph","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"v","श":"sh","ष":"sh","स":"s","ह":"h","क़":"q","ख़":"kh","ग़":"g","ज़":"z","ड़":"r","ढ़":"rh","फ़":"f","य़":"y" };
  var DEV_VOW_IND = { "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ऋ":"ri","ए":"e","ऐ":"ai","ओ":"o","औ":"au","ऑ":"o" };
  var DEV_MATRA = { "ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","ृ":"ri","े":"e","ै":"ai","ो":"o","ौ":"au","ॉ":"o" };

  var GUJ_CONS = { "ક":"k","ખ":"kh","ગ":"g","ઘ":"gh","ઙ":"n","ચ":"ch","છ":"chh","જ":"j","ઝ":"jh","ઞ":"n","ટ":"t","ઠ":"th","ડ":"d","ઢ":"dh","ણ":"n","ત":"t","થ":"th","દ":"d","ધ":"dh","ન":"n","પ":"p","ફ":"ph","બ":"b","ભ":"bh","મ":"m","ય":"y","ર":"r","લ":"l","ળ":"l","વ":"v","શ":"sh","ષ":"sh","સ":"s","હ":"h" };
  var GUJ_VOW_IND = { "અ":"a","આ":"aa","ઇ":"i","ઈ":"ee","ઉ":"u","ઊ":"oo","ઋ":"ru","એ":"e","ઐ":"ai","ઓ":"o","ઔ":"au","ઍ":"e","ઑ":"o" };
  var GUJ_MATRA = { "ા":"aa","િ":"i","ી":"ee","ુ":"u","ૂ":"oo","ૃ":"ru","ે":"e","ૈ":"ai","ો":"o","ૌ":"au","ૅ":"e","ૉ":"o" };

  function makeTransliterator(cons, vowInd, matra, virama, nasal, range) {
    return function (text) {
      var out = "";
      var i = 0;
      while (i < text.length) {
        var ch = text[i];
        if (cons[ch] && text[i + 1] === nasal.nukta) {
          var comb = ch + nasal.nukta;
          out += cons[comb] || cons[ch];
          i += 2;
          var nx = text[i];
          if (nx === virama) { i++; continue; }
          if (nx && matra[nx]) { out += matra[nx]; i++; continue; }
          var aft = text[i];
          if (aft && range.test(aft)) out += "a";
          continue;
        }
        if (cons[ch]) {
          out += cons[ch];
          var next = text[i + 1];
          if (next === virama) { i += 2; continue; }
          if (next && matra[next]) { out += matra[next]; i += 2; continue; }
          var after = text[i + 1];
          var isEnd = !after || !range.test(after);
          if (!isEnd) out += "a";
          i++;
          continue;
        }
        if (vowInd[ch]) { out += vowInd[ch]; i++; continue; }
        if (ch === nasal.anusvara) { out += "n"; i++; continue; }
        if (ch === nasal.candrabindu) { out += "n"; i++; continue; }
        if (ch === nasal.visarga) { out += "h"; i++; continue; }
        if (ch === virama || ch === nasal.nukta) { i++; continue; }
        out += ch; i++;
      }
      return out;
    };
  }

  var toHinglish = makeTransliterator(DEV_CONS, DEV_VOW_IND, DEV_MATRA, "्",
    { anusvara: "ं", candrabindu: "ँ", visarga: "ः", nukta: "़" }, /[\u0900-\u097F]/);
  var toGujlish = makeTransliterator(GUJ_CONS, GUJ_VOW_IND, GUJ_MATRA, "્",
    { anusvara: "ં", candrabindu: "ઁ", visarga: "ઃ", nukta: "઼" }, /[\u0A80-\u0AFF]/);

  /* live transliteration scanner */
  var scanTimer = null;
  function startScanner(mode) {
    stopScanner();
    var range = mode === "hi-Latn" ? /[\u0900-\u097F]/ : /[\u0A80-\u0AFF]/;
    var fn = mode === "hi-Latn" ? toHinglish : toGujlish;
    function scan() {
      try {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
          if (range.test(node.nodeValue)) {
            node.nodeValue = fn(node.nodeValue);
          }
        }
      } catch (e) {}
    }
    scan();
    scanTimer = setInterval(scan, 600);
  }
  function stopScanner() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  }

  /* ---------- apply language ---------- */
  function activate(code) {
    var entry = findLang(code);
    if (!entry || code === "en") return;
    var target = entry.special ? entry.base : entry.code;
    setGoogCookie(target);
    loadGoogleWidget();
    // drive the engine directly — up to ~16s of retries for slow networks
    fireTranslate(target, 40, function () {
      toast("🌐 Couldn't reach the translator — check internet & reload");
    });
    if (entry.special) {
      // scanner starts immediately; it simply finds nothing until
      // translated text appears, then converts it continuously.
      startScanner(entry.code);
    }
    // gentle status so users know it's working
    setTimeout(function () { toast("🌐 Translating to " + entry.name + "..."); }, 300);
  }

  function selectLang(code) {
    setLang(code);
    if (code === "en") {
      setGoogCookie(null);
      stopScanner();
      location.reload();
      return;
    }
    // full reload so the cookie is present at widget init AND
    // the direct-fire path runs on a clean page.
    location.reload();
  }

  /* ---------- picker modal ---------- */
  function openLangModal() {
    var modal = document.getElementById("langModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "langModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    var cur = getLang();
    var indian = LANGUAGES.filter(function (l) { return l.flag === "🇮🇳" || l.code === "en"; });
    var world = LANGUAGES.filter(function (l) { return l.flag !== "🇮🇳" && l.code !== "en"; });

    function card(l) {
      return '<button class="langcard ' + (l.code === cur ? "active" : "") + (l.special ? " langcard--special" : "") + '" data-lang="' + l.code + '" translate="no">' +
        '<span class="langcard__flag">' + l.flag + "</span>" +
        '<span class="langcard__name">' + l.name + (l.special ? ' <em class="langcard__badge">EXCLUSIVE</em>' : "") + "</span>" +
        '<span class="langcard__native">' + l.native + "</span></button>";
    }

    modal.innerHTML =
      '<div class="modal__box modal__box--wide">' +
      '<button class="modal__close">✕</button>' +
      '<div class="modal__title" translate="no">🌐 Read in YOUR Language</div>' +
      '<p style="font-weight:600; font-size:.85rem; margin-bottom:14px;">All 100 books, 530+ lessons — translated instantly. ' +
      '<strong>Hinglish &amp; Gujlish</strong> are our special modes: Hindi/Gujarati written in English letters, the way we actually text. 🔥</p>' +
      '<div class="langsection" translate="no">🇮🇳 INDIA</div>' +
      '<div class="langgrid">' + indian.map(card).join("") + "</div>" +
      '<div class="langsection" translate="no">🌍 WORLD</div>' +
      '<div class="langgrid">' + world.map(card).join("") + "</div>" +
      '<p class="support__note">Powered by Google Translate + our own transliteration engine. Needs internet. Takes 2–5 seconds after the page reloads. Search works best in English.</p>' +
      "</div>";
    modal.classList.add("open");
    modal.querySelector(".modal__close").addEventListener("click", function () { modal.classList.remove("open"); });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.classList.remove("open"); });
    var cards = modal.querySelectorAll("[data-lang]");
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener("click", function () {
        selectLang(this.getAttribute("data-lang"));
      });
    }
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var cur = getLang();
    var entry = findLang(cur);
    var mounts = document.querySelectorAll("[data-lang-btn]");
    for (var m = 0; m < mounts.length; m++) {
      mounts[m].innerHTML = "🌐" + (cur !== "en" && entry ? ' <span class="langbtn__label">' + entry.name + "</span>" : "");
      mounts[m].setAttribute("translate", "no");
      mounts[m].addEventListener("click", openLangModal);
    }
    if (cur !== "en") activate(cur);
  });

  window.TSB_LANG = {
    open: openLangModal,
    select: selectLang,
    activate: activate,
    get: getLang,
    toHinglish: toHinglish,
    toGujlish: toGujlish,
    _fire: fireTranslate
  };
})();
