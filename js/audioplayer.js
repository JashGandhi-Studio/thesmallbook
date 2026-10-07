/* ============================================================
   THESMALLBOOK, 🎧 THE LISTENING MACHINE (audioplayer.js) · v302
   One real player for the whole app, two engines under one dock:
   • TTS QUEUE   : lessons or dive sections, spoken by the app
   • AUDIO QUEUE : real audio - podcast episodes from a show's own
                   public RSS feed, public-domain audiobooks from
                   LibriVox on Archive.org. Credited, free, legal.
   • QUEUE       : tap any line to jump
   • SPEED       : 0.75x to 1.5x, remembered
   • SLEEP TIMER : 5/15/30 minutes, pauses politely mid-queue
   • CONTINUE    : remembers what you were listening and where;
                   every entry point offers "continue"
   • LOCKSCREEN  : MediaSession controls so it keeps playing on a
                   commute. The engine's silent keep-alive holds the
                   TTS queue together on the lock screen.
   The engine's own book-page widget is suppressed while this is
   alive: one player, not two.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_AUDIO) return;

  var SPEEDS = [0.75, 1, 1.25, 1.5];
  var SLEEPS = [0, 5, 15, 30];           /* minutes, 0 = off */
  var LASTKEY = "tsb_audio_last";
  var SPEEDKEY = "tsb_audio_speed";
  var FEEDCACHE = "tsb_feed_";

  function jget(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var T = null;              /* TTS engine */
  var AU = null;             /* HTMLAudio (audio engine) */
  var q = null;              /* active queue */
  var curItem = 0;
  var dock = null, sheet = null;
  var sleepAt = 0, sleepTimer = null;

  /* ================= queue builders ================= */

  function bookQueue(bookId, fromLesson) {
    var B = window.BOOKS || [];
    var b = null;
    for (var i = 0; i < B.length; i++) if (B[i].id === bookId) b = B[i];
    if (!b) return null;
    var parts = [{ text: b.title + ", by " + b.author + ". From TheSmallBook.", pause: 700 }];
    var items = [{ label: "Start", sub: b.title, part: 0 }];
    b.lessons.forEach(function (l, i) {
      items.push({ label: (i + 1) + ". " + l.title, sub: "Lesson " + (i + 1) + " of " + b.lessons.length, part: parts.length });
      parts.push({ text: "Lesson " + (i + 1) + ". " + l.title + ".", pause: 650 });
      parts.push({ text: l.summary, pause: 700 });
      parts.push({ text: "From the book: " + l.example, pause: 700 });
      parts.push({ text: "Do this: " + l.action, pause: 900 });
    });
    return {
      type: "book", bookId: b.id, key: "book:" + b.id,
      title: b.title, sub: b.author + " · " + b.lessons.length + " lessons, spoken",
      parts: parts, items: items, from: fromLesson || 0
    };
  }

  function docQueue(key, title, sub, sections) {
    var parts = [{ text: title + ". From TheSmallBook.", pause: 700 }];
    var items = [{ label: title, sub: sub || "The listening version", part: 0 }];
    sections.forEach(function (s, i) {
      items.push({ label: s.label || s.title, sub: "Part " + (i + 1) + " of " + sections.length, part: parts.length });
      parts.push({ text: (s.label || s.title) + ". ", pause: 500 });
      parts.push({ text: s.text, pause: 800 });
    });
    return { type: "doc", key: key, title: title, sub: sub || "The listening version", parts: parts, items: items, from: 0 };
  }

  /* real audio queue: podcast episodes or audiobook chapters */
  function audioQueue(spec) {
    return {
      type: "audio", key: spec.key, title: spec.title, sub: spec.sub || "",
      items: spec.items, credit: spec.credit || "", art: spec.art || "", glyph: spec.glyph || "",
      ch: spec.ch || 0, seek: spec.seek || 0
    };
  }

  /* ================= dock + sheet ================= */

  function css() {
    if (document.getElementById("tsb-ap-style")) return;
    var st = document.createElement("style");
    st.id = "tsb-ap-style";
    st.textContent =
      "body.tsb-audio-live #tsb-player{display:none!important}" +
      "#tsbAp{position:fixed;left:10px;right:10px;bottom:74px;z-index:255;background:var(--paper);border:3px solid var(--ink);border-radius:18px;box-shadow:4px 4px 0 var(--ink);padding:9px 12px;display:flex;align-items:center;gap:10px}" +
      "#tsbAp .ap-art{flex:0 0 auto;width:38px;height:38px;border:2.5px solid var(--ink);border-radius:12px;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:17px;overflow:hidden}" +
      "#tsbAp .ap-art img{width:100%;height:100%;object-fit:cover}" +
      "#tsbAp .ap-mid{flex:1;min-width:0}" +
      "#tsbAp .ap-t{display:block;font:800 12px/1.25 'Space Grotesk',sans-serif;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "#tsbAp .ap-s{display:block;font:600 10px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      /* the yellow strip rides the dock's top edge, like the book player */
      "#tsbAp .ap-prog{position:absolute;left:2px;right:2px;top:2px;height:5px;border-radius:99px;background:var(--bg);overflow:hidden}" +
      "#tsbAp .ap-prog i{display:block;height:100%;width:0;background:var(--yellow);border-radius:99px;transition:width .4s}" +
      "#tsbAp .ap-prog.loading i{width:38%;transition:none;animation:apLoad 1.1s ease-in-out infinite}" +
      "@keyframes apLoad{0%{margin-left:-38%}100%{margin-left:100%}}" +
      "#tsbAp button{border:2.5px solid var(--ink);background:var(--paper);border-radius:50%;width:38px;height:38px;font:800 14px 'Space Grotesk',sans-serif;color:var(--ink);cursor:pointer;flex:0 0 auto}" +
      "#tsbAp .ap-play{background:var(--yellow);width:44px;height:44px;font-size:16px}" +
      "#tsbAp .ap-list{border-radius:12px}" +
      "#tsbApSheet{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:258;background:var(--paper);border-top:3px solid var(--ink);border-radius:22px 22px 0 0;box-shadow:0 -6px 0 rgba(0,0,0,.08);max-height:76vh;overflow:auto;padding:16px 16px 26px}" +
      "#tsbApSheet h3{font:400 14px 'Archivo Black','Arial Black',sans-serif;color:var(--ink);margin:0 0 10px}" +
      "#tsbApSheet .ap-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}" +
      "#tsbApSheet .ap-chip{border:2px solid var(--ink);background:var(--paper);border-radius:999px;padding:7px 12px;font:800 10.5px 'Space Grotesk',sans-serif;color:var(--ink);cursor:pointer}" +
      "#tsbApSheet .ap-chip.on{background:var(--yellow);box-shadow:2px 2px 0 var(--ink)}" +
      "#tsbApSheet .ap-lab{font:800 9.5px 'Archivo Black','Arial Black',sans-serif;letter-spacing:.7px;color:var(--ink);opacity:.6;margin:12px 0 6px}" +
      "#tsbApSheet .ap-q{display:flex;flex-direction:column;gap:6px}" +
      "#tsbApSheet .ap-qi{display:flex;gap:9px;align-items:center;border:2px solid var(--ink);border-radius:12px;padding:8px 10px;cursor:pointer;background:var(--paper)}" +
      "#tsbApSheet .ap-qi.on{background:var(--yellow);box-shadow:2px 2px 0 var(--ink)}" +
      "#tsbApSheet .ap-qi b{font:800 12px/1.3 'Space Grotesk',sans-serif;color:var(--ink)}" +
      "#tsbApSheet .ap-qi i{display:block;font:600 10px 'Space Grotesk',sans-serif;font-style:normal;opacity:.6;color:var(--ink)}" +
      "#tsbApSheet .ap-num{flex:0 0 auto;width:26px;height:26px;border:2px solid var(--ink);border-radius:8px;display:flex;align-items:center;justify-content:center;font:800 11px 'Archivo Black',sans-serif;color:var(--ink)}" +
      "#tsbApSheet .ap-x{position:absolute;top:12px;right:12px;border:2.5px solid var(--ink);background:var(--paper);border-radius:10px;width:32px;height:32px;font:800 13px 'Space Grotesk',sans-serif;color:var(--ink);cursor:pointer}" +
      "#tsbApSheet .ap-cont{width:100%;border:2.5px solid var(--ink);background:var(--green);border-radius:12px;box-shadow:3px 3px 0 var(--ink);padding:11px;font:800 12px 'Archivo Black','Arial Black',sans-serif;color:var(--ink);cursor:pointer;margin-bottom:12px}" +
      "#tsbApSheet .ap-credit{font:600 10px/1.5 'Space Grotesk',sans-serif;color:var(--ink);opacity:.55;margin:12px 0 0}" +
      /* the dock always parks above the bottom bar, never under it */
      "html.tsb-hasbar #tsbAp{bottom:calc(var(--bar-total) + 22px)}" +
      /* same physics as the book-page player: bar tucks on scroll down, the
         dock glides down with it; scroll up, both glide back. bar.js owns
         the html.tsb-bar-hidden toggle. */
      "#tsbAp{transition:transform .32s cubic-bezier(.22,.9,.35,1);touch-action:pan-y}" +
      /* tucked = exactly the bar's resting spot: dock sits (bar-total + 12) high,
         the bar rests (gap + safe-area) high, so glide the difference */
      "html.tsb-bar-hidden #tsbAp{transform:translateY(calc(var(--bar-total) + 12px))}" +
      "#tsbAp .ap-mid{cursor:pointer}" +
      /* now-playing sheet */
      "#tsbApSheet .ap-hero{display:flex;gap:12px;align-items:center;margin:2px 44px 14px 2px}" +
      "#tsbApSheet .ap-art--big{flex:0 0 auto;width:74px;height:74px;border:3px solid var(--ink);border-radius:16px;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:30px;overflow:hidden;box-shadow:3px 3px 0 var(--ink)}" +
      "#tsbApSheet .ap-art--big img{width:100%;height:100%;object-fit:cover}" +
      "#tsbApSheet .ap-npwrap{flex:1;min-width:0}" +
      "#tsbApSheet .ap-np-t{display:block;font:800 15px/1.3 'Space Grotesk',sans-serif;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "#tsbApSheet .ap-np-s{display:block;font:600 11px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.6;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "#tsbApSheet .ap-np-x{display:block;font:800 9.5px 'Archivo Black',sans-serif;letter-spacing:.6px;color:var(--ink);opacity:.5;margin-top:5px}" +
      "#tsbApSheet .ap-seekrow{display:flex;align-items:center;gap:9px;margin:2px 0 12px}" +
      "#tsbApSheet .ap-time{flex:0 0 auto;font:800 10.5px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.7;min-width:36px}" +
      "#tsbApSheet .ap-time--r{text-align:right}" +
      "#tsbApSheet input.ap-seek{flex:1;appearance:none;-webkit-appearance:none;height:10px;background:var(--bg);border:2px solid var(--ink);border-radius:99px;cursor:pointer;min-width:0}" +
      "#tsbApSheet input.ap-seek::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--yellow);border:3px solid var(--ink)}" +
      "#tsbApSheet input.ap-seek::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--yellow);border:3px solid var(--ink)}" +
      "#tsbApSheet .ap-ctl{display:flex;align-items:center;justify-content:center;gap:13px;margin:4px 0 6px}" +
      "#tsbApSheet .ap-jump{border:2.5px solid var(--ink);background:var(--paper);border-radius:14px;width:48px;height:48px;font-size:16px;color:var(--ink);cursor:pointer;flex:0 0 auto}" +
      "#tsbApSheet .ap-jump:active{transform:translate(1.5px,1.5px)}" +
      "#tsbApSheet .ap-skip{border:2.5px solid var(--ink);background:var(--paper);border-radius:50%;width:48px;height:48px;font:800 9.5px 'Space Grotesk',sans-serif;color:var(--ink);cursor:pointer;flex:0 0 auto}" +
      "#tsbApSheet .ap-skip:active{transform:translate(1.5px,1.5px)}" +
      "#tsbApSheet .ap-playbig{width:68px;height:68px;border-radius:50%;border:3px solid var(--ink);background:var(--yellow);box-shadow:3px 3px 0 var(--ink);font-size:22px;color:var(--ink);cursor:pointer;flex:0 0 auto}" +
      "#tsbApSheet .ap-playbig:active{transform:translate(2px,2px);box-shadow:none}" +
      "#tsbApSheet .ap-part{text-align:center;font:800 10.5px 'Archivo Black',sans-serif;letter-spacing:.7px;color:var(--ink);opacity:.6;margin:2px 0 10px}" +
      "#tsbApSheet .ap-sleepnote{text-align:center;font:800 10px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.6;margin:0 0 10px}" +
      /* sheet entry: rises and settles, like the podcast apps */
      "#tsbApSheet{transform:translateY(70px);opacity:0;animation:apSheetIn .28s cubic-bezier(.22,.9,.35,1) forwards;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:calc(26px + env(safe-area-inset-bottom, 0px))}" +
      "@keyframes apSheetIn{to{transform:none;opacity:1}}" +
      /* queue: quieter rows, the playing one clearly ours */
      "#tsbApSheet .ap-q{max-height:44vh;overflow:auto;padding-bottom:8px}" +
      "#tsbApSheet .ap-qi{border-radius:14px;transition:background .15s}" +
      "#tsbApSheet .ap-qi.on{background:var(--yellow);border-width:2.5px;box-shadow:3px 3px 0 var(--ink)}" +
      "#tsbApSheet .ap-qi.on .ap-num{background:var(--ink);color:var(--yellow)}" +
      "#tsbApSheet h3{letter-spacing:.5px}";
    document.head.appendChild(st);
  }

  function mountDock() {
    if (dock) return;
    css();
    dock = document.createElement("div");
    dock.id = "tsbAp";
    dock.setAttribute("translate", "no");
    dock.innerHTML =
      '<span class="ap-art">🎧</span>' +
      '<span class="ap-mid" role="button" tabindex="0" aria-label="Open the player"><span class="ap-t"></span><span class="ap-s"></span><span class="ap-prog"><i></i></span></span>' +
      '<button class="ap-prev" aria-label="Previous chapter">⏮</button>' +
      '<button class="ap-play" aria-label="Play or pause">⏸</button>' +
      '<button class="ap-next" aria-label="Next chapter">⏭</button>' +
      '<button class="ap-list" aria-label="Queue and settings">☰</button>';
    document.body.appendChild(dock);
    dock.querySelector(".ap-play").addEventListener("click", function () { toggle(); });
    dock.querySelector(".ap-next").addEventListener("click", function () { nextItem(); });
    dock.querySelector(".ap-prev").addEventListener("click", function () { prevItem(); });
    dock.querySelector(".ap-list").addEventListener("click", function () { openSheet(); });
    dock.querySelector(".ap-mid").addEventListener("click", function () { openSheet(); });
    bindSwipe();
    document.body.classList.add("tsb-audio-live");
  }

  /* swipe the dock fully right to cancel: finger follows, past a third of
     the screen it flies out and the player closes (your spot is kept) */
  function bindSwipe() {
    var sx = 0, dx = 0, drag = false;
    dock.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;
      drag = true; sx = e.clientX; dx = 0;
      try { dock.style.transition = "none"; } catch (e2) {}
    });
    dock.addEventListener("pointermove", function (e) {
      if (!drag) return;
      dx = Math.max(0, e.clientX - sx);
      dock.style.transform = "translateX(" + dx + "px)";
    });
    function end() {
      if (!drag) return;
      drag = false;
      dock.style.transition = "";
      if (dx > Math.min(140, window.innerWidth * 0.35)) {
        dock.style.transform = "translateX(" + window.innerWidth + "px)";
        dock.style.opacity = "0";
        setTimeout(function () { stopAll(); toast("Player closed. Your spot is kept."); }, 190);
      } else {
        dock.style.transform = "";
        dock.style.opacity = "";
      }
    }
    dock.addEventListener("pointerup", end);
    dock.addEventListener("pointercancel", end);
    dock.addEventListener("pointerleave", end);
  }

  function unmountDock() {
    if (dock) { dock.remove(); dock = null; }
    closeSheet();
    document.body.classList.remove("tsb-audio-live");
    try { if (navigator.mediaSession) navigator.mediaSession.metadata = null; } catch (e) {}
  }

  function openSheet() {
    if (!q) return;
    closeSheet();
    var last = jget(LASTKEY, null);
    var cont = "";
    if (q.type === "audio") {
      var pos = audioPos(q.key);
      if (pos && pos.ch < q.items.length - 1 && pos.ch !== curItem)
        cont = '<button class="ap-cont" id="apCont">⏩ CONTINUE WHERE YOU LEFT: ' + esc((q.items[pos.ch] || {}).label || "") + '</button>';
    } else if (last && last.key === q.key && last.item > 0 && last.item < q.items.length - 1 && curItem !== last.item) {
      cont = '<button class="ap-cont" id="apCont">⏩ CONTINUE WHERE YOU LEFT: ' + esc((q.items[last.item] || {}).label || "") + '</button>';
    }
    sheet = document.createElement("div");
    sheet.id = "tsbApSheet";
    sheet.setAttribute("translate", "no");
    var speed = jget(SPEEDKEY, 1);
    var sl = sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 60000)) : 0;
    var isAudio = q.type === "audio";
    sheet.innerHTML =
      '<button class="ap-x" aria-label="Close">✕</button>' +
      '<h3>🎧 NOW PLAYING</h3>' + cont +
      '<div class="ap-hero">' +
        '<span class="ap-art--big"' + (q.glyph ? ' style="font-size:15px;line-height:1.4"' : '') + '>' + (q.art ? '<img src="' + esc(q.art) + '" alt="" onerror="this.parentNode.textContent=\'🎧\'">' : (q.glyph || '🎧')) + '</span>' +
        '<span class="ap-npwrap"><span class="ap-np-t" id="apNpT"></span><span class="ap-np-s" id="apNpS"></span><span class="ap-np-x">' + esc(q.title) + '</span></span>' +
      '</div>' +
      (isAudio
        ? '<div class="ap-seekrow"><span class="ap-time" id="apT0">0:00</span><input class="ap-seek" id="apSeek" type="range" min="0" max="1000" value="0" aria-label="Seek"><span class="ap-time ap-time--r" id="apT1">-:--</span></div>'
        : '<div class="ap-part" id="apPart"></div>') +
      '<div class="ap-ctl">' +
        '<button class="ap-jump" id="apPrevC" aria-label="Previous chapter">⏮</button>' +
        (isAudio ? '<button class="ap-skip" id="apBack" aria-label="Back 15 seconds">◀15</button>' : '') +
        '<button class="ap-playbig" id="apBigPlay" aria-label="Play or pause">⏸</button>' +
        (isAudio ? '<button class="ap-skip" id="apFwd" aria-label="Forward 30 seconds">30▶</button>' : '') +
        '<button class="ap-jump" id="apNextC" aria-label="Next chapter">⏭</button>' +
      '</div>' +
      (sl ? '<div class="ap-sleepnote" id="apSleepNote">😴 pausing by itself in ' + sl + ' min</div>' : '') +
      '<div class="ap-lab">SPEED</div><div class="ap-row">' +
        SPEEDS.map(function (s) { return '<button class="ap-chip ap-sp' + (s === speed ? " on" : "") + '" data-sp="' + s + '">' + s + 'x</button>'; }).join("") +
      '</div>' +
      (/^ab:/.test(q.key) ? '<div class="ap-lab">VOLUME BOOST · THE OLD RECORDINGS RUN QUIET</div><div class="ap-row">' +
        [1, 1.5, 2].map(function (m) { return '<button class="ap-chip ap-bo' + (boostPref() === m ? " on" : "") + '" data-bo="' + m + '">' + (m === 1 ? "OFF" : "+" + Math.round((m - 1) * 100) + "%") + '</button>'; }).join("") +
      '</div>' : '') +
      '<div class="ap-lab">SLEEP TIMER</div><div class="ap-row">' +
        SLEEPS.map(function (m) { return '<button class="ap-chip ap-sl" data-sl="' + m + '">' + (m === 0 ? "OFF" : m + " min") + '</button>'; }).join("") +
        (sl ? '<span class="ap-chip on" id="apSleepLeft">' + sl + ' min left</span>' : '') +
      '</div>' +
      '<div class="ap-lab">QUEUE · ' + q.items.length + '</div>' +
      '<div class="ap-q">' +
        q.items.map(function (it, i) {
          return '<div class="ap-qi' + (i === curItem ? " on" : "") + '" data-i="' + i + '"><span class="ap-num">' + (i === curItem ? "▶" : i + 1) + '</span><span style="min-width:0"><b>' + esc(it.label) + '</b><i>' + esc(it.sub || "") + '</i></span></div>';
        }).join("") +
      '</div>' +
      (q.credit ? '<p class="ap-credit">' + q.credit + '</p>' : '');
    document.body.appendChild(sheet);
    /* live repaint: seek slider, times, big play glyph, sleep countdown */
    sheet._apTick = setInterval(function () {
      if (!sheet || !q) return;
      var it2 = q.items[curItem] || {};
      var t2 = sheet.querySelector("#apNpT"); if (t2) t2.textContent = it2.label || q.title;
      var s2 = sheet.querySelector("#apNpS"); if (s2) s2.textContent = q.title + " · " + (curItem + 1) + " of " + q.items.length;
      var bp2 = sheet.querySelector("#apBigPlay"); if (bp2) bp2.textContent = playing() ? "⏸" : "▶";
      if (q.type === "audio" && AU) {
        var d = AU.duration, sk = sheet.querySelector("#apSeek");
        if (sk && !apSeeking && isFinite(d) && d > 0) sk.value = Math.round((AU.currentTime / d) * 1000);
        var t02 = sheet.querySelector("#apT0"); if (t02) t02.textContent = fmtTime(AU.currentTime);
        var t12 = sheet.querySelector("#apT1"); if (t12) t12.textContent = isFinite(d) ? fmtTime(d) : "-:--";
      } else {
        var p2 = sheet.querySelector("#apPart"); if (p2) p2.textContent = "PART " + (curItem + 1) + " OF " + q.items.length;
      }
      var slLeft = sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 60000)) : 0;
      var slEl = sheet.querySelector("#apSleepLeft");
      if (slEl) slEl.textContent = slLeft > 0 ? slLeft + " min left" : "any second now";
      var slNote = sheet.querySelector("#apSleepNote");
      if (slNote) slNote.textContent = slLeft > 0 ? "😴 pausing by itself in " + slLeft + " min" : "";
    }, 1000);
    sheet.querySelector(".ap-x").addEventListener("click", closeSheet);
    var bp = sheet.querySelector("#apBigPlay");
    if (bp) bp.addEventListener("click", function () { toggle(); });
    var pc2 = sheet.querySelector("#apPrevC"); if (pc2) pc2.addEventListener("click", function () { prevItem(); });
    var nc2 = sheet.querySelector("#apNextC"); if (nc2) nc2.addEventListener("click", function () { nextItem(); });
    var bk = sheet.querySelector("#apBack"); if (bk) bk.addEventListener("click", function () { skipSec(-15); });
    var fw = sheet.querySelector("#apFwd"); if (fw) fw.addEventListener("click", function () { skipSec(30); });
    var sk2 = sheet.querySelector("#apSeek");
    if (sk2) {
      sk2.addEventListener("input", function () {
        apSeeking = true;
        var d = AU && isFinite(AU.duration) ? AU.duration : 0;
        if (d) sheet.querySelector("#apT0").textContent = fmtTime((sk2.value / 1000) * d);
      });
      sk2.addEventListener("change", function () {
        var d = AU && isFinite(AU.duration) ? AU.duration : 0;
        if (d && AU) { try { AU.currentTime = (sk2.value / 1000) * d; audioPosSave(q.key, curItem, AU.currentTime); } catch (e) {} }
        apSeeking = false;
      });
    }
    var c = sheet.querySelector("#apCont");
    if (c) c.addEventListener("click", function () {
      var at = q.type === "audio" ? (audioPos(q.key) || {}).ch : (jget(LASTKEY, {}).item || 0);
      if (q.type === "audio") playChapter(at || 0, (audioPos(q.key) || {}).t || 0);
      else seekItem(at || 0);
      closeSheet();
    });
    sheet.querySelectorAll(".ap-sp").forEach(function (b) {
      b.addEventListener("click", function () { setSpeed(parseFloat(this.getAttribute("data-sp"))); openSheet(); });
    });
    sheet.querySelectorAll(".ap-sl").forEach(function (b) {
      b.addEventListener("click", function () { setSleep(parseInt(this.getAttribute("data-sl"), 10)); openSheet(); });
    });
    sheet.querySelectorAll(".ap-bo").forEach(function (b) {
      b.addEventListener("click", function () {
        setBoost(parseFloat(this.getAttribute("data-bo")));
        if (q && q.type === "audio" && AU && AU.paused && boostPref() > 1 && actx && actx.resume) actx.resume();
        openSheet();
        toast("🔊 Boost " + (boostPref() > 1 ? "+" + Math.round((boostPref() - 1) * 100) + "%" : "off") + ".");
      });
    });
    sheet.querySelectorAll(".ap-qi").forEach(function (el) {
      el.addEventListener("click", function () {
        var i = parseInt(this.getAttribute("data-i"), 10);
        if (q.type === "audio") playChapter(i, 0); else seekItem(i);
        closeSheet();
      });
    });
  }
  function closeSheet() { if (sheet) { try { clearInterval(sheet._apTick); } catch (e) {} sheet.remove(); sheet = null; } }

  /* ================= controls (both engines) ================= */

  function playing() {
    if (q && q.type === "audio") return AU && !AU.paused;
    return T && T.playing && !T.paused;
  }
  function toggle() {
    if (q && q.type === "audio") {
      if (!AU) return;
      if (AU.paused) { AU.play().catch(function () {}); } else { AU.pause(); }
      setTimeout(paintPlay, 120);
      return;
    }
    if (!T) return;
    if (T.playing && !T.paused) { T.pause(); paintPlay(); }
    else if (T.paused) { T.resume(); paintPlay(); }
    else { seekItem(curItem); }
  }
  function nextItem() { if (q && curItem < q.items.length - 1) { if (q.type === "audio") playChapter(curItem + 1, 0); else seekItem(curItem + 1); } }
  function skipSec(n) {
    if (!q || q.type !== "audio" || !AU) return;
    try {
      var d = isFinite(AU.duration) ? AU.duration : Number.MAX_VALUE;
      AU.currentTime = Math.max(0, Math.min(d - 0.4, AU.currentTime + n));
      audioPosSave(q.key, curItem, AU.currentTime);
    } catch (e) {}
  }
  function fmtTime(t) {
    if (!isFinite(t) || t < 0) return "-:--";
    var m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }
  var apSeeking = false;
  /* volume boost: real gain via WebAudio. Archive.org serves CORS headers,
     so element-source routing is safe there; other hosts get a clean element. */
  var actx = null, gainNode = null, mediaSrc = null;
  var BOOSTKEY = "tsb_ab_boost", SLEEPKEY = "tsb_sleep_until";

  function boostPref() { return jget(BOOSTKEY, 1); }
  function ensureGraph(el) {
    if (mediaSrc) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !el) return false;
    try {
      actx = new AC();
      mediaSrc = actx.createMediaElementSource(el);
      gainNode = actx.createGain();
      gainNode.gain.value = boostPref();
      mediaSrc.connect(gainNode);
      gainNode.connect(actx.destination);
      if (actx.state === "suspended" && actx.resume) actx.resume();
      return true;
    } catch (e) { actx = null; mediaSrc = null; gainNode = null; return false; }
  }
  function dropGraph() {
    /* a fresh element is the only way to un-route a tainted source */
    mediaSrc = null; gainNode = null;
    try { if (actx && actx.close) actx.close(); } catch (e) {}
    actx = null;
  }
  function setBoost(mult) {
    jset(BOOSTKEY, mult);
    if (!AU) return;
    if (mult > 1) {
      if (ensureGraph(AU)) { gainNode.gain.value = mult; if (actx.resume) actx.resume(); }
    } else if (gainNode) gainNode.gain.value = 1;
  }
  function prevItem() { if (q && curItem > 0) { if (q.type === "audio") playChapter(curItem - 1, 0); else seekItem(curItem - 1); } }
  function seekItem(i) {
    if (!q || !T) return;
    curItem = Math.max(0, Math.min(i, q.items.length - 1));
    try { T.seekTo(q.items[curItem].part); } catch (e) {}
    if (!T.playing) { T.resume(); }
    savePos(); paintAll();
  }
  function setSpeed(v) {
    jset(SPEEDKEY, v);
    try { if (q && q.type === "audio" && AU) AU.playbackRate = v; else T && T.setSpeed(v); } catch (e) {}
  }
  function setSleep(min) {
    clearTimeout(sleepTimer);
    if (!min) { sleepAt = 0; jset(SLEEPKEY, 0); return; }
    sleepAt = Date.now() + min * 60000;
    jset(SLEEPKEY, sleepAt);
    sleepTimer = setTimeout(function () {
      try { if (q && q.type === "audio" && AU) AU.pause(); else if (T) T.pause(); } catch (e) {}
      sleepAt = 0;
      jset(SLEEPKEY, 0);
      toast("😴 Sleep timer done. The player paused; your spot is kept.");
      paintPlay();
    }, min * 60000);
  }
  function rearmSleep() {
    /* the timer outlives the page: if it was set before a reload, keep it */
    var at = jget(SLEEPKEY, 0);
    if (!at) return;
    if (at <= Date.now()) { jset(SLEEPKEY, 0); return; }
    sleepAt = at;
    sleepTimer = setTimeout(function () {
      try { if (q && q.type === "audio" && AU) AU.pause(); else if (T) T.pause(); } catch (e) {}
      sleepAt = 0;
      jset(SLEEPKEY, 0);
      toast("😴 Sleep timer done. The player paused; your spot is kept.");
      paintPlay();
    }, at - Date.now());
  }
  function stopAll() {
    clearTimeout(sleepTimer); sleepAt = 0; jset(SLEEPKEY, 0);
    try { if (T) T.stop(); } catch (e) {}
    try { if (AU) { AU.pause(); AU.src = ""; } } catch (e) {}
    q = null; curItem = 0;
    unmountDock();
  }

  /* ================= painting ================= */

  function paintPlay() {
    if (!dock) return;
    dock.querySelector(".ap-play").textContent = playing() ? "⏸" : "▶";
    try { if (sheet) { var bp2 = sheet.querySelector("#apBigPlay"); if (bp2) bp2.textContent = playing() ? "⏸" : "▶"; } } catch (e) {}
  }
  function paintAll() {
    if (!dock || !q) return;
    var it = q.items[curItem] || {};
    /* real cover art when the queue carries it */
    try {
      var art = dock.querySelector(".ap-art");
      if (q.art && art && !art.querySelector("img")) {
        art.innerHTML = '<img src="' + esc(q.art) + '" alt="" onerror="this.parentNode.textContent=\'🎧\'">';
      } else if (!q.art && q.glyph && art) {
        art.textContent = q.glyph.length > 3 ? q.glyph.slice(0, 3) + "." : q.glyph;
        art.style.fontSize = "11px";
      }
    } catch (e) {}
    dock.querySelector(".ap-t").textContent = it.label || q.title;
    dock.querySelector(".ap-s").textContent = q.title + " · " + (curItem + 1) + "/" + q.items.length + (q.glyph ? "" : "");
    paintPlay();
    /* lesson highlight on book pages */
    try {
      if (q.type === "book") {
        document.querySelectorAll(".lesson.speaking-now").forEach(function (el) { el.classList.remove("speaking-now"); });
        if (curItem >= 1) {
          var el = document.getElementById("lesson-" + (curItem - 1));
          if (el) { el.classList.add("speaking-now"); if (el.classList.contains("lesson")) el.classList.add("open"); }
        }
      }
    } catch (e) {}
    mediaSession();
  }
  function mediaSession() {
    try {
      if (!("mediaSession" in navigator)) return;
      var it = q.items[curItem] || {};
      var md = { title: it.label || q.title, artist: q.title, album: "TheSmallBook" };
      if (q.art) md.artwork = [{ src: q.art, sizes: "512x512", type: "image/jpeg" }];
      navigator.mediaSession.metadata = new MediaMetadata(md);
      navigator.mediaSession.setActionHandler("play", function () { if (!playing()) { toggle(); } });
      navigator.mediaSession.setActionHandler("pause", function () { if (playing()) { toggle(); } });
      navigator.mediaSession.setActionHandler("nexttrack", function () { nextItem(); });
      navigator.mediaSession.setActionHandler("previoustrack", function () { prevItem(); });
      navigator.mediaSession.setActionHandler("seekbackward", function () { skipSec(-15); });
      navigator.mediaSession.setActionHandler("seekforward", function () { skipSec(30); });
      navigator.mediaSession.setActionHandler("stop", function () { stopAll(); });
    } catch (e) {}
  }
  function toast(msg) {
    /* above the player dock when it is up, above the bar otherwise - never
       floating mid-screen over the content */
    var bottom = 24;
    if (dock) {
      try { bottom = (window.innerHeight - dock.getBoundingClientRect().top + 12) + "px"; } catch (e) {}
    } else if (document.documentElement.classList.contains("tsb-hasbar")) {
      bottom = "calc(var(--bar-total) + 24px)";
    }
    var t = document.createElement("div");
    t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:" + bottom + ";z-index:280;background:var(--ink);color:var(--paper);border-radius:999px;padding:10px 16px;font:800 12px 'Space Grotesk',sans-serif;max-width:86vw;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25)";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function savePos() {
    if (!q) return;
    jset(LASTKEY, { key: q.key, item: curItem, type: q.type, bookId: q.bookId || null, title: q.title, at: Date.now() });
  }

  /* ================= engine A: TTS ================= */

  function startTTS(queue) {
    T = window.TSB_TTS || window.TTS_ENGINE;
    if (!T || !T.playParts) { toast("This browser cannot speak yet."); return false; }
    try { if (AU) { AU.pause(); AU.src = ""; } } catch (e) {}
    q = queue;
    curItem = 0;
    var speed = jget(SPEEDKEY, 1);
    try { T.setSpeed(speed); } catch (e) {}
    T.onProgress(function (idx, total, playing2) {
      if (!q) return;
      var item = 0;
      for (var i = 0; i < q.items.length; i++) if (idx >= q.items[i].part) item = i;
      if (item !== curItem) { curItem = item; savePos(); }
      if (dock) {
        var frac = total ? Math.min(1, (idx + 1) / total) : 0;
        dock.querySelector(".ap-prog i").style.width = Math.round(frac * 100) + "%";
        if (!playing2) paintPlay(); else paintAll();
      }
    });
    mountDock();
    var from = q.from || 0;
    if (from > 0) { curItem = from; }
    try { T.playParts(q.parts); } catch (e) { return false; }
    if (from > 0) { try { T.seekTo(q.items[from].part); } catch (e) {} }
    savePos(); paintAll();
    toast("🎧 Playing. Tap the bar for queue, speed and sleep.");
    return true;
  }

  /* ================= engine B: real audio ================= */

  function newAU() {
    var a = new Audio();
    a.preload = "auto";
    a.addEventListener("play", function () { try { if (actx && actx.state === "suspended" && actx.resume) actx.resume(); } catch (e) {} paintPlay(); });
    a.addEventListener("waiting", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.add("loading"); });
    a.addEventListener("stalled", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.add("loading"); });
    a.addEventListener("canplay", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.remove("loading"); });
    a.addEventListener("playing", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.remove("loading"); });
    a.addEventListener("pause", paintPlay);
    a.addEventListener("ended", function () { if (q && curItem < q.items.length - 1) playChapter(curItem + 1, 0); else paintPlay(); });
    a.addEventListener("timeupdate", function () {
      if (!q || q.type !== "audio" || !AU) return;
      var d = AU.duration || 0;
      if (d > 0) {
        if (dock) {
          dock.querySelector(".ap-prog i").style.width = Math.min(100, (AU.currentTime / d) * 100) + "%";
          /* how much is left: this chapter plus the ones still queued */
          q._durs = q._durs || {};
          q._durs[curItem] = d;
          var left = d - AU.currentTime;
          var tot = 0, known = 0;
          for (var di = 0; di < q.items.length; di++) {
            if (q._durs[di]) { tot += q._durs[di]; known++; }
          }
          if (known) tot += ((tot / known) * (q.items.length - known));
          var avg = known ? tot / q.items.length : d;
          left = (d - AU.currentTime) + avg * (q.items.length - 1 - curItem);
          var min = Math.max(1, Math.round(left / 60));
          var subEl = dock.querySelector(".ap-s");
          if (subEl) subEl.textContent = q.title + " · " + (curItem + 1) + "/" + q.items.length + " · " + min + " min left";
        }
        audioPosSave(q.key, curItem, AU.currentTime);
        try {
          if ("mediaSession" in navigator && navigator.mediaSession.setPositionState)
            navigator.mediaSession.setPositionState({ duration: d, position: Math.min(AU.currentTime, d), playbackRate: AU.playbackRate || 1 });
        } catch (e) {}
      }
    });
    a.addEventListener("loadedmetadata", function () {
      if (q && q.type === "audio" && q.seek && q.seekCh === curItem) { try { AU.currentTime = q.seek; } catch (e) {} q.seek = 0; }
    });
    return a;
  }
  function ensureAU() { if (!AU) AU = newAU(); return AU; }
  function rebuildAU() {
    try { if (AU) { AU.pause(); AU.src = ""; } } catch (e) {}
    dropGraph();
    AU = newAU();
  }
  function playChapter(i, seekT) {
    if (!q || q.type !== "audio") return;
    curItem = Math.max(0, Math.min(i, q.items.length - 1));
    var it = q.items[curItem];
    var isAB = /archive\.org/.test(it.src || "");
    /* the boost graph is permanent per element and needs CORS-clean media,
       so podcasts always get a pristine element */
    if (!isAB && mediaSrc) rebuildAU();
    var au = ensureAU();
    q.seek = seekT || 0; q.seekCh = curItem;
    if (isAB) {
      try { au.crossOrigin = "anonymous"; } catch (e) {}
      if (boostPref() > 1) { if (ensureGraph(au)) gainNode.gain.value = boostPref(); }
      else if (gainNode) gainNode.gain.value = 1;
    } else {
      try { au.removeAttribute && au.removeAttribute("crossorigin"); } catch (e) {}
      if (gainNode) gainNode.gain.value = 1;
    }
    au.src = it.src;
    au.playbackRate = jget(SPEEDKEY, 1);
    { var pr0 = dock && dock.querySelector(".ap-prog"); if (pr0) pr0.classList.add("loading"); }
    if (q.autoplay === false) {
      /* restored session: load, park at the saved second, stay quiet */
      paintAll(); paintPlay(); savePos();
      parkNote();
      return;
    }
    au.play().then(function () { paintAll(); savePos(); }).catch(function (err) {
      var name = err && err.name ? err.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        paintAll(); paintPlay(); parkNote();
        toast("Paused where you left it - tap play to continue.");
      } else {
        toast("Could not stream this one. Check the connection.");
      }
    });
    if (!seekT) { audioPosSave(q.key, curItem, 0); paintAll(); savePos(); }
  }
  function parkNote() {
    try {
      if (!dock || !q) return;
      var t = q.seek || (audioPos(q.key) || {}).t || 0;
      if (t > 0) dock.querySelector(".ap-s").textContent += " · ⏸ " + fmtTime(t);
      else dock.querySelector(".ap-s").textContent += " · ⏸ tap play";
    } catch (e) {}
  }
  function audioPos(key) { return jget("tsb_audio_pos_" + key, null); }
  function audioPosSave(key, ch, t) { jset("tsb_audio_pos_" + key, { ch: ch, t: Math.floor(t || 0), at: Date.now() }); }

  function startAudio(queue) {
    try { if (T && T.stop) T.stop(); } catch (e) {}
    q = queue; curItem = queue.ch || 0;
    mountDock();
    playChapter(curItem, queue.seek || 0);
    if (queue.autoplay !== false) toast("🎧 Playing. Tap the bar for chapters, speed and sleep.");
  }

  /* ================= feeds (podcast RSS) ================= */

  function fetchFeed(url, cb) {
    var ck = FEEDCACHE + url.split("").reduce(function (a, c) { return ((a << 5) - a + c.charCodeAt(0)) | 0; }, 0);
    var cached = jget(ck, null);
    if (cached && Date.now() - cached.at < 6 * 36e5 && cached.items.length) { cb(cached.items, cached.showTitle); return; }
    fetch(url).then(function (r) { return r.text(); }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, "text/xml");
      var ch = doc.querySelector("channel") || doc.documentElement;
      var showTitle = ch && ch.querySelector("> title") ? ch.querySelector("> title").textContent : "";
      var out = [];
      doc.querySelectorAll("item").forEach(function (it) {
        if (out.length >= 40) return;
        var en = it.querySelector("enclosure");
        if (!en) return;
        var src = en.getAttribute("url") || "";
        if (!/^https:/.test(src)) return;
        var t = it.querySelector("title") ? it.querySelector("title").textContent : "Episode";
        var d = it.querySelector("pubDate") ? it.querySelector("pubDate").textContent : "";
        var dd = ""; try { dd = new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch (e) {}
        out.push({ label: t, sub: dd || "episode", src: src });
      });
      /* feeds occasionally repeat an entry; the queue never should */
      var seenT = {}, clean = [];
      out.forEach(function (e2) {
        var k = e2.label.toLowerCase().replace(/\s+/g, " ");
        if (seenT[k]) return;
        seenT[k] = true; clean.push(e2);
      });
      out = clean;
      if (out.length) jset(ck, { at: Date.now(), items: out, showTitle: showTitle });
      cb(out, showTitle);
    }).catch(function () { cb([], ""); });
  }

  function playFeed(show) {
    fetchFeed(show.rss, function (items, feedTitle) {
      if (!items.length) { toast("Could not reach the feed. Try the show's own app today."); return; }
      startAudio(audioQueue({
        key: "pod:" + show.id,
        title: show.name,
        sub: "Latest episodes, streaming from the show's own feed",
        items: items,
        credit: "Episodes stream from " + (feedTitle || show.name) + "'s official public feed. All rights with " + (show.host || "the show") + " and their publisher. Show home: " + (show.home || "") +
          " · TheSmallBook does not host or alter this audio.",
        art: show.art || ""
      }));
    });
  }

  /* ================= audiobooks (LibriVox via Archive.org) ================= */

  function fetchAudiobook(rec, cb) {
    var ck = FEEDCACHE + "ab3_" + rec.id;   /* ab3: base-name dedupe, every older doubled cache is ignored */
    var cached = jget(ck, null);
    if (cached && Date.now() - cached.at < 30 * 864e5 && cached.items.length) { cb(cached.items); return; }
    fetch("https://archive.org/metadata/" + rec.id).then(function (r) { return r.json(); }).then(function (d) {
      var mp3s = (d.files || []).filter(function (f) { return (f.name || "").toLowerCase().endsWith(".mp3"); });
      /* LibriVox ships every section in up to three bitrates (plain, 128kb,
         64kb). The queue carries ONE chapter per section: group by the file
         name without its bitrate suffix, prefer the light 64kb for
         streaming, then order by the section number. */
      var byIdx = {};
      mp3s.forEach(function (f) {
        var low = (f.name || "").toLowerCase();
        var base = low.replace(/[_-]?(128kb|64kb|96kb|32kb)?\.mp3$/, "");
        var is64 = /_64kb\.mp3$/.test(low);
        if (!byIdx[base] || (is64 && !byIdx[base].is64)) byIdx[base] = { f: f, is64: is64 };
      });
      mp3s = Object.keys(byIdx).map(function (k) { return byIdx[k].f; });
      mp3s.sort(function (a, b) {
        var la = (a.name || "").toLowerCase(), lb = (b.name || "").toLowerCase();
        var ma = la.match(/(\d+)/), mb = lb.match(/(\d+)/);
        return (ma ? parseInt(ma[1], 10) : 999) - (mb ? parseInt(mb[1], 10) : 999);
      });
      var items = mp3s.map(function (f, i) {
        var label;
        if (f.title) {
          label = String(f.title).replace(/\.mp3$/i, "");
          /* a slug-shaped title like "Premchand-Andher" is still a filename;
             real chapter titles ("Ch 1-2") have spaces and stay untouched */
          if (!/\s/.test(label) && label.indexOf("-") >= 0) label = label.split("-").pop();
        } else {
          /* filename with no title metadata: turn "premchand-idgaah_64kb"
             into "Idgaah", keep it human */
          label = (f.name || "Chapter " + (i + 1)).toLowerCase()
            .replace(/\.mp3$/i, "").replace(/[_-]+/g, " ")
            .replace(/\b(128kb|64kb|96kb|32kb)\b/g, "")
            .replace(/^\s*\d+\s*/, "").trim();
          var parts = label.split(" ").filter(Boolean);
          if (parts.length > 1) label = parts[parts.length - 1];
        }
        label = label.replace(/^\s*\d+\s*[- ]?\s*/, "").trim();
        if (!label) label = "Chapter " + (i + 1);
        label = label.charAt(0).toUpperCase() + label.slice(1);
        return { label: (i + 1) + ". " + label, sub: rec.lang === "hi" ? "kahani" : "chapter", src: "https://archive.org/download/" + rec.id + "/" + encodeURIComponent(f.name) };
      });
      if (items.length) jset(ck, { at: Date.now(), items: items });
      cb(items);
    }).catch(function () { cb([]); });
  }

  function playAudiobook(bookId) {
    var rec = (window.TSB_AUDIOBOOKS || {})[bookId];
    if (!rec) { toast("No audiobook for this one yet."); return; }
    fetchAudiobook(rec, function (items) {
      if (!items.length) { toast("Could not reach the audiobook. Try again online."); return; }
      var B = window.BOOKS || [];
      var b = B.filter(function (x) { return x.id === bookId; })[0] || {};
      var pos = audioPos("ab:" + bookId);
      startAudio(audioQueue({
        key: "ab:" + bookId,
        title: (b.title || rec.title || "Audiobook"),
        sub: rec.lang === "hi" ? "Hindi mein poora audiobook · LibriVox" : "full audiobook · LibriVox",
        glyph: rec.dev || "",
        items: items,
        ch: pos ? pos.ch : 0,
        seek: pos ? pos.t : 0,
        credit: "Read by volunteers for LibriVox (public domain), streamed from Archive.org. TheSmallBook hosts nothing; we just point at the free shelves.",
        art: (b.id ? "assets/covers/" + b.id + ".jpg" : "")
      }));
    });
  }

  /* ================= session restore =================
     Whatever was playing (audiobook or podcast) comes back on every page
     and on every revisit, parked at the saved second. If the sleep timer
     ran out while away, it restores quiet instead of blasting sound. */

  function bootRestore() {
    if (q) return;
    var l = jget(LASTKEY, null);
    if (!l || l.type !== "audio" || !l.key) return;
    var auto = !jget(SLEEPKEY, 0);   /* sleep overdue → restore silent */
    if (jget(SLEEPKEY, 0)) rearmSleep();
    if (l.key.indexOf("ab:") === 0) {
      var bid = l.key.slice(3);
      var rec = (window.TSB_AUDIOBOOKS || {})[bid];
      if (!rec) return;
      fetchAudiobook(rec, function (items) {
        if (q || !items.length) return;
        var pos = audioPos(l.key) || {};
        var B = window.BOOKS || [];
        var b = B.filter(function (x) { return x.id === bid; })[0] || {};
        startAudio(audioQueue({
          key: l.key,
          title: l.title || b.title || rec.title,
          sub: "full audiobook, free · LibriVox",
          items: items,
          ch: Math.min(pos.ch || 0, items.length - 1),
          seek: pos.t || 0,
          autoplay: auto,
          credit: "Read by volunteers for LibriVox (public domain), streamed from Archive.org.",
          art: (b.id ? "assets/covers/" + b.id + ".jpg" : "")
        }));
        if (!auto) toast("😴 Restored where the sleep timer paused it - tap play.");
      });
    } else if (l.key.indexOf("pod:") === 0) {
      var pid = l.key.slice(4);
      var show = ((window.TSB_PODCASTS || {}).shows || []).filter(function (x) { return x.id === pid; })[0];
      if (!show || !show.rss) return;
      fetchFeed(show.rss, function (items) {
        if (q || !items.length) return;
        var pos = audioPos(l.key) || {};
        startAudio(audioQueue({
          key: l.key,
          title: l.title || show.name,
          sub: "Latest episodes, streaming from the show's own feed",
          items: items,
          ch: Math.min(pos.ch || 0, items.length - 1),
          seek: pos.t || 0,
          autoplay: auto,
          credit: "Episodes stream from " + show.name + "'s official public feed. All rights with " + (show.host || "the show") + " and their publisher. Show home: " + (show.home || "") + " · TheSmallBook does not host or alter this audio.",
          art: show.art || ""
        }));
        if (!auto) toast("😴 Restored where the sleep timer paused it - tap play.");
      });
    }
  }
  setTimeout(bootRestore, 500);

  /* ================= boot a queue ================= */

  function start(queue) { startTTS(queue); }

  /* ================= public ================= */
  window.TSB_AUDIO = {
    playBook: function (bookId, fromLesson) {
      var qc = bookQueue(bookId, fromLesson);
      if (qc) startTTS(qc);
    },
    playDoc: function (key, title, sub, sections) {
      var qc = docQueue(key, title, sub, sections);
      if (qc) startTTS(qc);
    },
    playFeed: playFeed,
    playAudiobook: playAudiobook,
    audiobookFor: function (bookId) { return (window.TSB_AUDIOBOOKS || {})[bookId] || null; },
    toggle: toggle, next: nextItem, prev: prevItem, stop: stopAll,
    last: function () { return jget(LASTKEY, null); },
    continueCard: function () {
      var l = jget(LASTKEY, null);
      if (!l || Date.now() - (l.at || 0) > 21 * 864e5) return null;
      var it = "";
      try {
        if (l.type === "audio") {
          var pos = audioPos(l.key.replace(/^pod:/, "pod:").replace(/^ab:/, "ab:"));
          if (pos) it = pos.ch === 0 ? "Chapter 1" : "Part " + (pos.ch + 1);
        } else if (l.type === "book") {
          var qc = bookQueue(l.bookId, 0);
          if (qc && qc.items[l.item]) it = qc.items[l.item].label;
        }
      } catch (e) {}
      if (!it) it = "Part " + ((l.item || 0) + 1);
      return { title: l.title, key: l.key, type: l.type, bookId: l.bookId, item: l.item, itemLabel: it, at: l.at };
    },
    resume: function () {
      var l = jget(LASTKEY, null);
      if (!l) return;
      if (l.type === "book" && l.bookId) {
        var qc = bookQueue(l.bookId, l.item || 0);
        if (qc) startTTS(qc);
      } else if (l.type === "audio") {
        if (/^ab:/.test(l.key)) {
          var bid = l.key.slice(3);
          var rec = (window.TSB_AUDIOBOOKS || {})[bid];
          if (rec) {
            fetchAudiobook(rec, function (items) {
              if (!items.length) return;
              var pos = audioPos("ab:" + bid);
              var hiRec = (window.TSB_AUDIOBOOKS || {})[bid] || {};
              startAudio(audioQueue({ key: "ab:" + bid, title: l.title, sub: hiRec.lang === "hi" ? "Hindi mein poora audiobook · LibriVox" : "full audiobook · LibriVox", glyph: hiRec.dev || "", items: items, ch: pos ? pos.ch : 0, seek: pos ? pos.t : 0, autoplay: auto, credit: "Read by volunteers for LibriVox (public domain), streamed from Archive.org." }));
            });
          }
        } else if (/^pod:/.test(l.key)) {
          var pid = l.key.slice(4);
          var show = ((window.TSB_PODCASTS || {}).shows || []).filter(function (s) { return s.id === pid; })[0];
          if (show && show.rss) playFeed(show);
        }
      }
    },
    __queueForTest: bookQueue,
    __au: function () { return AU; }
  };
})();
