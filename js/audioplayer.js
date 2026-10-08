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
  var PLAYKEY = "tsb_audio_playing";      /* 1 = it was playing when you left, 0 = you paused it */
  var CANCELKEY = "tsb_audio_cancelled";  /* a swipe-away cancel survives reloads; only Continue lifts it */
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

  /* v314: crisp stroke icons instead of emoji glyphs - the premium pass */
  var IC = {
    play: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8.4 5.3v13.4L19.4 12z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8.5 5.5v13M15.5 5.5v13" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>',
    playBig: '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="M8.6 5.2v13.6L20 12z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    pauseBig: '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="M8.6 5.4v13.2M15.4 5.4v13.2" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6.4 5.6v12.8" stroke-width="3"/><path d="M18.2 6.4v11.2L9.8 12z" fill="currentColor" stroke-width="1.2"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17.6 5.6v12.8" stroke-width="3"/><path d="M5.8 6.4v11.2L14.2 12z" fill="currentColor" stroke-width="1.2"/></svg>',
    list: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h9"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
    back15: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 5v4.5h4.5"/><path d="M4.6 9.2A8.2 8.2 0 1 1 12 20.3"/></svg>',
    fwd30: '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.8 5v4.5h-4.5"/><path d="M19.4 9.2A8.2 8.2 0 1 0 12 20.3"/></svg>',
    cont: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h13.5"/><path d="M12.5 6.8 17.8 12l-5.3 5.2"/></svg>'
  };
  var EQ = '<span class="ap-eq" aria-hidden="true"><i></i><i></i><i></i></span>';

  function css() {
    if (document.getElementById("tsb-ap-style")) return;
    var st = document.createElement("style");
    st.id = "tsb-ap-style";
    st.textContent =
            /* ---------- the dock ---------- */
      "body.tsb-audio-live #tsb-player{display:none!important}" +
      "#tsbAp{position:fixed;left:10px;right:10px;bottom:74px;z-index:255;background:var(--paper);border:3px solid var(--ink);border-radius:22px;box-shadow:5px 6px 0 var(--ink);padding:9px 12px 12px;display:flex;align-items:center;gap:9px;animation:apDockIn .42s cubic-bezier(.18,1.16,.3,1)}" +
      "@keyframes apDockIn{from{transform:translateY(120px);opacity:0}to{transform:none;opacity:1}}" +
      "#tsbAp .ap-artwrap{position:relative;flex:0 0 auto}" +
      "#tsbAp .ap-art{width:48px;height:48px;border:3px solid var(--ink);border-radius:15px;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:20px;overflow:hidden;box-shadow:2.5px 2.5px 0 var(--ink)}" +
      "#tsbAp.ap-on .ap-art{animation:apArtPulse 2.6s ease-in-out infinite}" +
      "@keyframes apArtPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}" +
      "#tsbAp .ap-art img{width:100%;height:100%;object-fit:cover}" +
      /* equalizer: three ink bars, they dance only while playing */
      ".ap-eq{display:inline-flex;align-items:flex-end;gap:2.5px;height:13px}" +
      ".ap-eq i{width:3px;height:5px;border-radius:2px;background:currentColor;transform-origin:bottom;animation:none}" +
      ".ap-playing .ap-eq i{animation:apEq 1s ease-in-out infinite}" +
      "#tsbAp.ap-on .ap-eq i{animation:apEq 1s ease-in-out infinite}" +
      ".ap-eq i:nth-child(2){animation-delay:.18s}" +
      ".ap-eq i:nth-child(3){animation-delay:.36s}" +
      "@keyframes apEq{0%,100%{height:4px}50%{height:13px}}" +
      "#tsbAp .ap-eq--art{position:absolute;right:-7px;bottom:-7px;background:var(--ink);border:2.5px solid var(--ink);border-radius:8px;padding:3.5px 4px;color:var(--yellow);opacity:0;transform:scale(.4);transition:opacity .25s,transform .25s}" +
      "#tsbAp.ap-on .ap-eq--art{opacity:1;transform:none}" +
      "#tsbAp .ap-mid{flex:1;min-width:0;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
      "#tsbAp .ap-t{display:block;font:800 12.5px/1.25 'Space Grotesk',sans-serif;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "#tsbAp .ap-s{display:block;font:600 10px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}" +
      /* the progress hairline rides the dock's bottom edge, full width */
      "#tsbAp .ap-prog{position:absolute;left:4px;right:4px;bottom:4px;height:5px;border-radius:99px;background:var(--bg);overflow:hidden}" +
      "#tsbAp .ap-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--yellow),#ffb300);border-radius:99px;transition:width .4s}" +
      "#tsbAp .ap-prog.loading i{width:38%;transition:none;animation:apLoad 1.1s ease-in-out infinite}" +
      "@keyframes apLoad{0%{margin-left:-38%}100%{margin-left:100%}}" +
      /* dock buttons: quiet prev/next, one heavy yellow play */
      "#tsbAp .ap-prev,#tsbAp .ap-next{border:none;background:transparent;width:38px;height:44px;color:var(--ink);cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;opacity:.85;transition:transform .12s,opacity .15s}" +
      "#tsbAp .ap-prev:active,#tsbAp .ap-next:active{transform:scale(.85)}" +
      "#tsbAp .ap-play{border:3px solid var(--ink);background:var(--yellow);border-radius:50%;width:54px;height:54px;color:var(--ink);cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;box-shadow:3px 3.5px 0 var(--ink);transition:transform .12s,box-shadow .12s}" +
      "#tsbAp .ap-play:active{transform:translate(2px,2.5px);box-shadow:none}" +
      "#tsbAp .ap-list{border:2.5px solid var(--ink);background:var(--paper);border-radius:13px;width:40px;height:44px;color:var(--ink);cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;box-shadow:2.5px 2.5px 0 var(--ink);transition:transform .12s,box-shadow .12s}" +
      "#tsbAp .ap-list:active{transform:translate(1.5px,1.5px);box-shadow:none}" +
      "#tsbAp svg{display:block}" +
      /* ---------- the now-playing sheet ---------- */
      ".ap-backdrop{position:fixed;inset:0;z-index:258;background:rgba(16,11,2,.55);backdrop-filter:blur(2.5px);-webkit-backdrop-filter:blur(2.5px);display:flex;align-items:flex-end;animation:apDim .26s ease}" +
      "@keyframes apDim{from{opacity:0}to{opacity:1}}" +
      ".ap-backdrop.ap-closing{animation:apDimOut .2s ease forwards;pointer-events:none}" +
      "@keyframes apDimOut{to{opacity:0}}" +
      ".ap-card{width:100%;max-height:90vh;overflow:auto;background:var(--paper);border-top:3px solid var(--ink);border-radius:28px 28px 0 0;box-shadow:0 -10px 0 rgba(0,0,0,.10);padding:8px 18px calc(30px + env(safe-area-inset-bottom, 0px));animation:apCardIn .36s cubic-bezier(.18,1.14,.3,1);transition:transform .24s cubic-bezier(.2,1.2,.3,1);overscroll-behavior:contain;-webkit-overflow-scrolling:touch}" +
      "@keyframes apCardIn{from{transform:translateY(100px)}to{transform:none}}" +
      ".ap-backdrop.ap-closing .ap-card{animation:none;transform:translateY(105%);transition:transform .22s ease}" +
      /* the sticky head: grip + NOW PLAYING ribbon + close */
      ".ap-head{position:sticky;top:0;z-index:3;background:var(--paper);margin:0 -18px 4px;padding:8px 16px 9px;touch-action:none}" +
      ".ap-grip{display:block;width:46px;height:5px;border-radius:99px;background:var(--ink);opacity:.25;margin:0 auto 10px}" +
      ".ap-headrow{display:flex;align-items:center;gap:10px}" +
      ".ap-ribbon{display:inline-flex;align-items:center;gap:9px;background:var(--yellow);border:2.5px solid var(--ink);border-radius:999px;padding:8px 14px;font:800 10px 'Archivo Black','Arial Black',sans-serif;letter-spacing:1.2px;color:var(--ink);box-shadow:2.5px 2.5px 0 var(--ink)}" +
      ".ap-ribbon .ap-eq{height:12px}" +
      ".ap-x{margin-left:auto;width:37px;height:37px;border:2.5px solid var(--ink);background:var(--red);border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2.5px 2.5px 0 var(--ink);transition:transform .12s,box-shadow .12s;flex:0 0 auto}" +
      ".ap-x:active{transform:translate(2px,2px);box-shadow:none}" +
      /* continue-where-you-left */
      ".ap-cont{width:100%;border:3px solid var(--ink);background:var(--green);border-radius:16px;box-shadow:4px 4px 0 var(--ink);padding:13px;font:800 11.5px 'Archivo Black','Arial Black',sans-serif;color:var(--ink);cursor:pointer;margin:8px 0 6px;display:flex;align-items:center;justify-content:center;gap:9px;text-align:left}" +
      ".ap-cont:active{transform:translate(2px,2px);box-shadow:none}" +
      /* the hero: big tilted art, big type */
      ".ap-hero{display:flex;gap:16px;align-items:center;margin:14px 2px 14px}" +
      ".ap-art--big{flex:0 0 auto;width:118px;height:118px;border:3.5px solid var(--ink);border-radius:24px;background:var(--yellow);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:5px 6px 0 var(--ink);transform:rotate(-2.5deg)}" +
      ".ap-art--big img{width:100%;height:100%;object-fit:cover}" +
      ".ap-npwrap{flex:1;min-width:0}" +
      ".ap-np-t{display:block;font:800 19px/1.22 'Space Grotesk',sans-serif;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ap-np-s{display:block;font:600 12px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.62;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ap-np-x{display:inline-block;font:800 9px 'Archivo Black','Arial Black',sans-serif;letter-spacing:.8px;color:var(--ink);background:var(--bg);border:2px solid var(--ink);border-radius:999px;padding:4px 9px;margin-top:8px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      /* seek: fat track, yellow fill drawn by the tick */
      ".ap-seekrow{display:flex;align-items:center;gap:11px;margin:4px 0 16px}" +
      ".ap-time{flex:0 0 auto;font:800 11px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.75;min-width:38px;font-variant-numeric:tabular-nums}" +
      ".ap-time--r{text-align:right}" +
      "input.ap-seek{flex:1;appearance:none;-webkit-appearance:none;height:14px;background:var(--bg);border:2.5px solid var(--ink);border-radius:99px;cursor:pointer;min-width:0}" +
      "input.ap-seek::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:var(--yellow);border:3px solid var(--ink);box-shadow:inset 0 0 0 3px var(--paper)}" +
      "input.ap-seek::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--yellow);border:3px solid var(--ink)}" +
      /* transport: quiet jumps, chunky skips, one big play */
      ".ap-ctl{display:flex;align-items:center;justify-content:center;gap:13px;margin:6px 0 8px}" +
      ".ap-jump{border:none;background:transparent;width:46px;height:48px;color:var(--ink);cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;opacity:.85;transition:transform .12s}" +
      ".ap-jump:active{transform:scale(.85)}" +
      ".ap-skip{border:2.5px solid var(--ink);background:var(--paper);border-radius:999px;height:46px;min-width:62px;padding:0 13px;color:var(--ink);font:800 12px 'Space Grotesk',sans-serif;cursor:pointer;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:5px;box-shadow:2.5px 2.5px 0 var(--ink);transition:transform .12s,box-shadow .12s}" +
      ".ap-skip:active{transform:translate(1.5px,1.5px);box-shadow:none}" +
      ".ap-playbig{width:80px;height:80px;border-radius:50%;border:3.5px solid var(--ink);background:var(--yellow);box-shadow:5px 6px 0 var(--ink);color:var(--ink);cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;transition:transform .12s,box-shadow .12s}" +
      ".ap-playbig:active{transform:translate(2.5px,3px);box-shadow:none}" +
      ".ap-part{display:block;width:max-content;margin:2px auto 14px;border:2.5px solid var(--ink);background:var(--bg);border-radius:999px;padding:8px 15px;font:800 10.5px 'Archivo Black','Arial Black',sans-serif;letter-spacing:1px;color:var(--ink)}" +
      ".ap-sleepnote{text-align:center;font:800 10.5px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.65;margin:0 0 10px}" +
      /* section labels as little ink tags */
      ".ap-lab{display:inline-block;font:800 9px 'Archivo Black','Arial Black',sans-serif;letter-spacing:1px;color:var(--ink);background:var(--bg);border:2px solid var(--ink);border-radius:999px;padding:5px 11px;margin:16px 0 9px}" +
      ".ap-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:4px}" +
      ".ap-chip{border:2.5px solid var(--ink);background:var(--paper);border-radius:999px;padding:9px 15px;font:800 11px 'Space Grotesk',sans-serif;color:var(--ink);cursor:pointer;transition:transform .12s,box-shadow .12s,background .15s}" +
      ".ap-chip:active{transform:translate(1.5px,1.5px)}" +
      ".ap-chip.on{background:var(--yellow);box-shadow:2.5px 2.5px 0 var(--ink)}" +
      /* the queue */
      ".ap-q{display:flex;flex-direction:column;gap:7px;max-height:44vh;overflow:auto;padding:2px 2px 8px}" +
      ".ap-qi{display:flex;gap:11px;align-items:center;border:2.5px solid var(--ink);border-radius:15px;padding:10px 12px;cursor:pointer;background:var(--paper);transition:transform .12s,background .15s}" +
      ".ap-qi:active{transform:translate(1.5px,1.5px)}" +
      ".ap-qi b{font:800 12.5px/1.3 'Space Grotesk',sans-serif;color:var(--ink)}" +
      ".ap-qi i{display:block;font:600 10px 'Space Grotesk',sans-serif;font-style:normal;opacity:.6;color:var(--ink)}" +
      ".ap-qi.on{background:var(--yellow);border-width:3px;box-shadow:3px 3px 0 var(--ink)}" +
      ".ap-qi.on b{font-weight:800}" +
      ".ap-num svg{width:14px;height:14px}" +
      ".ap-num{flex:0 0 auto;width:30px;height:30px;border:2.5px solid var(--ink);border-radius:10px;display:flex;align-items:center;justify-content:center;font:800 11.5px 'Archivo Black','Arial Black',sans-serif;color:var(--ink);background:var(--paper)}" +
      ".ap-qi.on .ap-num{background:var(--ink);color:var(--yellow)}" +
      ".ap-qi .ap-eq{margin-left:auto;flex:0 0 auto;color:var(--ink)}" +
      ".ap-credit{font:600 10.5px/1.6 'Space Grotesk',sans-serif;color:var(--ink);opacity:.6;border-top:2.5px dashed var(--ink);margin:16px 0 0;padding:13px 2px 0}" +
      /* small phones: keep the transport comfortable */
      "@media (max-width:360px){.ap-playbig{width:72px;height:72px}.ap-art--big{width:100px;height:100px}.ap-hero{gap:12px}}" +
      /* dark keeps every colour readable */
      "html.dark .ap-card{box-shadow:0 -10px 0 rgba(0,0,0,.45)}" +
      "html.dark .ap-backdrop{background:rgba(0,0,0,.66)}" +
      "html.dark input.ap-seek{background:#16130e}" +
      /* the show browser sheet */
      "#tsbShowSheet{position:fixed;inset:0;z-index:258;background:rgba(20,12,0,.5);display:flex;align-items:flex-end}" +
      "#tsbShowSheet .tsb-showcard{width:100%;max-height:82vh;overflow:auto;background:var(--paper);border-top:3px solid var(--ink);border-radius:22px 22px 0 0;padding:16px 16px calc(26px + env(safe-area-inset-bottom, 0px));animation:apCardIn .28s cubic-bezier(.22,.9,.35,1)}" +
      "#tsbShowSheet .tss-hero{display:flex;gap:12px;align-items:center;margin:2px 44px 12px 2px}" +
      "#tsbShowSheet .tss-art{flex:0 0 auto;width:74px;height:74px;border:3px solid var(--ink);border-radius:16px;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:30px;overflow:hidden}" +
      "#tsbShowSheet .tss-art img{width:100%;height:100%;object-fit:cover}" +
      "#tsbShowSheet .tss-mid{flex:1;min-width:0}" +
      "#tsbShowSheet .tss-mid b{display:block;font:800 15px/1.3 'Space Grotesk',sans-serif;color:var(--ink)}" +
      "#tsbShowSheet .tss-mid i{display:block;font:600 11px 'Space Grotesk',sans-serif;font-style:normal;color:var(--ink);opacity:.6;margin-top:2px}" +
      "#tsbShowSheet .tss-mid p{display:block;font:600 11.5px/1.5 'Space Grotesk',sans-serif;color:var(--ink);opacity:.75;margin:6px 0 0}" +
      "#tsbShowSheet .tss-acts{display:flex;gap:8px;align-items:center;margin-bottom:12px}" +
      "#tsbShowSheet .tss-playlatest{flex:1;border:3px solid var(--ink);background:var(--yellow);border-radius:999px;box-shadow:3px 3px 0 var(--ink);padding:12px 16px;font:800 12px 'Archivo Black',sans-serif;color:var(--ink);cursor:pointer}" +
      "#tsbShowSheet .tss-home{flex:0 0 auto;font:800 11px 'Space Grotesk',sans-serif;color:var(--ink);border-bottom:2px solid var(--yellow);text-decoration:none;padding-bottom:2px}" +
      "#tsbShowSheet .tss-list{display:flex;flex-direction:column;gap:7px}" +
      "#tsbShowSheet .tss-ep{text-align:left;border:2px solid var(--ink);background:var(--paper);border-radius:14px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:2px}" +
      "#tsbShowSheet .tss-ep:active{transform:translate(1.5px,1.5px)}" +
      "#tsbShowSheet .tss-ept{font:800 12.5px/1.35 'Space Grotesk',sans-serif;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "#tsbShowSheet .tss-ep i{font:600 10px 'Space Grotesk',sans-serif;font-style:normal;color:var(--ink);opacity:.55}" +
      "#tsbShowSheet .tss-ep em{align-self:flex-start;font:800 9px 'Archivo Black',sans-serif;font-style:normal;letter-spacing:.6px;color:var(--ink);background:var(--yellow);border:2px solid var(--ink);border-radius:999px;padding:2px 8px;margin-top:5px}" +
      "#tsbShowSheet .tss-more{border:2px dashed var(--ink);background:transparent;border-radius:999px;padding:10px;font:800 11px 'Space Grotesk',sans-serif;color:var(--ink);cursor:pointer;margin-top:4px}" +
      "#tsbShowSheet .tss-note{font:600 11px/1.5 'Space Grotesk',sans-serif;color:var(--ink);opacity:.65;text-align:center;padding:8px 0}" +
      "#tsbShowSheet .tss-note--load{display:flex;align-items:center;justify-content:center;gap:5px;padding:16px 0}" +
      "#tsbShowSheet .tss-dot{width:6px;height:6px;border-radius:50%;background:var(--ink);opacity:.7;animation:tssBounce 1s ease-in-out infinite}" +
      "#tsbShowSheet .tss-dot:nth-child(2){animation-delay:.15s}" +
      "#tsbShowSheet .tss-dot:nth-child(3){animation-delay:.3s}" +
      "@keyframes tssBounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}" +
      /* dock placement rides the bar, tucks when it hides (physics, untouched) */
      "html.tsb-hasbar #tsbAp{bottom:calc(var(--bar-total) + 22px)}" +
      "#tsbAp{transition:transform .32s cubic-bezier(.22,.9,.35,1);touch-action:pan-y}" +
      "html.tsb-bar-hidden #tsbAp{transform:translateY(calc(var(--bar-total) + 12px))}";
    document.head.appendChild(st);
  }

  function mountDock() {
    if (dock) return;
    css();
    dock = document.createElement("div");
    dock.id = "tsbAp";
    dock.setAttribute("translate", "no");
    dock.innerHTML =
      '<span class="ap-artwrap"><span class="ap-art">🎧</span>' + EQ.replace('class="ap-eq"', 'class="ap-eq ap-eq--art"') + '</span>' +
      '<span class="ap-mid" role="button" tabindex="0" aria-label="Open the player"><span class="ap-t"></span><span class="ap-s"></span><span class="ap-prog"><i></i></span></span>' +
      '<button class="ap-prev" aria-label="Previous chapter">' + IC.prev + '</button>' +
      '<button class="ap-play" aria-label="Play or pause">' + IC.pause + '</button>' +
      '<button class="ap-next" aria-label="Next chapter">' + IC.next + '</button>' +
      '<button class="ap-list" aria-label="Queue and settings">' + IC.list + '</button>';
    document.body.appendChild(dock);
    dock.querySelector(".ap-play").addEventListener("click", function () { toggle(); });
    dock.querySelector(".ap-next").addEventListener("click", function () { nextItem(); });
    dock.querySelector(".ap-prev").addEventListener("click", function () { prevItem(); });
    dock.querySelector(".ap-list").addEventListener("click", function () { openSheet(); });
    dock.querySelector(".ap-mid").addEventListener("click", function () { openSheet(); });
    dock.querySelector(".ap-artwrap").addEventListener("click", function () { openSheet(); });   /* v314: the whole left side opens the player */
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
      dock.style.transform = "translateX(" + dx + "px) rotate(" + (dx * 0.03) + "deg)";
    });
    function end(e) {
      if (!drag) return;
      drag = false;
      dock.style.transition = "";
      /* v315: a tap (not a swipe) on the title or art opens the full player */
      if (dx < 8 && e && e.target && !e.target.closest("button")) { openSheet(); return; }
      if (dx > Math.min(140, window.innerWidth * 0.35)) {
        dock.style.transform = "translateX(" + window.innerWidth + "px) rotate(7deg)";
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
        cont = '<button class="ap-cont" id="apCont">' + IC.cont + '<span>CONTINUE WHERE YOU LEFT: ' + esc((q.items[pos.ch] || {}).label || "") + '</span></button>';
    } else if (last && last.key === q.key && last.item > 0 && last.item < q.items.length - 1 && curItem !== last.item) {
      cont = '<button class="ap-cont" id="apCont">' + IC.cont + '<span>CONTINUE WHERE YOU LEFT: ' + esc((q.items[last.item] || {}).label || "") + '</span></button>';
    }
    sheet = document.createElement("div");
    sheet.id = "tsbApSheet";
    sheet.className = "ap-backdrop";   /* v315: fixed dim layer + pinned card - without this the sheet painted as stray content at the page bottom */
    sheet.setAttribute("translate", "no");
    var speed = jget(SPEEDKEY, 1);
    var sl = sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 60000)) : 0;
    var isAudio = q.type === "audio";
    sheet.innerHTML =
      '<div class="ap-card">' +
      '<div class="ap-head" id="apHead"><span class="ap-grip"></span><div class="ap-headrow">' +
        '<span class="ap-ribbon">' + EQ + 'NOW PLAYING</span>' +
        '<button class="ap-x" aria-label="Close">' + IC.x + '</button>' +
      '</div></div>' + cont +
      '<div class="ap-hero">' +
        '<span class="ap-art--big"' + (q.glyph ? ' style="font-size:15px;line-height:1.4"' : '') + '>' + (q.art ? '<img src="' + esc(q.art) + '" alt="" onerror="this.parentNode.textContent=\'🎧\'">' : (q.glyph || '🎧')) + '</span>' +
        '<span class="ap-npwrap"><span class="ap-np-t" id="apNpT"></span><span class="ap-np-s" id="apNpS"></span><span class="ap-np-x">' + esc(q.title) + '</span></span>' +
      '</div>' +
      (isAudio
        ? '<div class="ap-seekrow"><span class="ap-time" id="apT0">0:00</span><input class="ap-seek" id="apSeek" type="range" min="0" max="1000" value="0" aria-label="Seek"><span class="ap-time ap-time--r" id="apT1">-:--</span></div>'
        : '<div class="ap-part" id="apPart"></div>') +
      '<div class="ap-ctl">' +
        '<button class="ap-jump" id="apPrevC" aria-label="Previous chapter">' + IC.prev + '</button>' +
        (isAudio ? '<button class="ap-skip" id="apBack" aria-label="Back 15 seconds">' + IC.back15 + '<b>15</b></button>' : '') +
        '<button class="ap-playbig" id="apBigPlay" aria-label="Play or pause">' + IC.pauseBig + '</button>' +
        (isAudio ? '<button class="ap-skip" id="apFwd" aria-label="Forward 30 seconds"><b>30</b>' + IC.fwd30 + '</button>' : '') +
        '<button class="ap-jump" id="apNextC" aria-label="Next chapter">' + IC.next + '</button>' +
      '</div>' +
      (sl ? '<div class="ap-sleepnote" id="apSleepNote">😴 pausing by itself in ' + sl + ' min</div>' : '') +
      '<div class="ap-lab">SPEED</div><div class="ap-row">' +
        SPEEDS.map(function (s) { return '<button class="ap-chip ap-sp' + (s === speed ? " on" : "") + '" data-sp="' + s + '">' + s + 'x</button>'; }).join("") +
      '</div>' +
      (/^ab:/.test(q.key) ? '<div class="ap-lab">VOLUME BOOST · THE OLD RECORDINGS RUN QUIET</div><div class="ap-row">' +
        BOOSTS.map(function (b) { return '<button class="ap-chip ap-bo' + (boostPref() === b.g ? " on" : "") + '" data-bo="' + b.g + '">' + b.l + '</button>'; }).join("") +
      '</div>' : '') +
      '<div class="ap-lab">SLEEP TIMER</div><div class="ap-row">' +
        SLEEPS.map(function (m) { return '<button class="ap-chip ap-sl" data-sl="' + m + '">' + (m === 0 ? "OFF" : m + " min") + '</button>'; }).join("") +
        (sl ? '<span class="ap-chip on" id="apSleepLeft">' + sl + ' min left</span>' : '') +
      '</div>' +
      '<div class="ap-lab">QUEUE · ' + q.items.length + '</div>' +
      '<div class="ap-q">' +
        q.items.map(function (it, i) {
          return '<div class="ap-qi' + (i === curItem ? " on" : "") + '" data-i="' + i + '"><span class="ap-num">' + (i === curItem ? IC.play : i + 1) + '</span><span style="min-width:0"><b>' + esc(it.label) + '</b><i>' + esc(it.sub || "") + '</i></span>' + (i === curItem ? EQ : '') + '</div>';
        }).join("") +
      '</div>' +
      (q.credit ? '<p class="ap-credit">' + q.credit + '</p>' : '') +
      '</div>';
    document.body.appendChild(sheet);
    sheet.classList.toggle("ap-playing", !!playing());
    /* v314: swipe the head (or the grip) down and the sheet follows your
       finger; let go past 90px and it closes, else it snaps back */
    (function () {
      var head2 = sheet.querySelector(".ap-head"), card2 = sheet.querySelector(".ap-card");
      var sy2 = 0, dy2 = 0, drag2 = false;
      head2.addEventListener("pointerdown", function (e) {
        if (e.target.closest(".ap-x")) return;
        drag2 = true; sy2 = e.clientY; dy2 = 0;
        try { card2.style.transition = "none"; } catch (e3) {}
      });
      head2.addEventListener("pointermove", function (e) {
        if (!drag2) return;
        dy2 = Math.max(0, e.clientY - sy2);
        card2.style.transform = "translateY(" + dy2 + "px)";
      });
      function end2() {
        if (!drag2) return;
        drag2 = false;
        try { card2.style.transition = ""; card2.style.transform = ""; } catch (e3) {}
        if (dy2 > 90) closeSheet();
      }
      head2.addEventListener("pointerup", end2);
      head2.addEventListener("pointercancel", end2);
    })();
    /* live repaint: seek slider, times, big play glyph, sleep countdown */
    sheet._apTick = setInterval(function () {
      if (!sheet || !q) return;
      var it2 = q.items[curItem] || {};
      var t2 = sheet.querySelector("#apNpT"); if (t2) t2.textContent = it2.label || q.title;
      var s2 = sheet.querySelector("#apNpS"); if (s2) s2.textContent = q.title + " · " + (curItem + 1) + " of " + q.items.length;
      sheet.classList.toggle("ap-playing", !!playing());
      var bp2 = sheet.querySelector("#apBigPlay"); if (bp2) bp2.innerHTML = playing() ? IC.pauseBig : IC.playBig;
      if (q.type === "audio" && AU) {
        var d = AU.duration, sk = sheet.querySelector("#apSeek");
        if (sk && !apSeeking && isFinite(d) && d > 0) {
          sk.value = Math.round((AU.currentTime / d) * 1000);
          /* v314: paint the yellow fill up to the thumb, the smooth way */
          sk.style.background = "linear-gradient(90deg, var(--yellow) " + Math.round(sk.value / 10) + "%, var(--bg) " + Math.round(sk.value / 10) + "%)";
        }
        var t02 = sheet.querySelector("#apT0"); if (t02) t02.textContent = fmtTime(AU.currentTime);
        var t12 = sheet.querySelector("#apT1"); if (t12) t12.textContent = isFinite(d) ? fmtTime(d) : "-:--";
      } else {
        var p2 = sheet.querySelector("#apPart"); if (p2) p2.textContent = (/^pod:/.test(q.key) ? "EPISODE " : "PART ") + (curItem + 1) + " OF " + q.items.length;
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
        sk2.style.background = "linear-gradient(90deg, var(--yellow) " + Math.round(sk2.value / 10) + "%, var(--bg) " + Math.round(sk2.value / 10) + "%)";
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
        toast("🔊 Boost " + boostLabel(boostPref()) + ".");
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
  function closeSheet() {
    if (!sheet) return;
    try { clearInterval(sheet._apTick); } catch (e) {}
    var old = sheet; sheet = null;
    old.removeAttribute("id");            /* a rising sheet never shares the id */
    old.classList.add("ap-closing");
    setTimeout(function () { old.remove(); }, 230);
  }

  /* ================= controls (both engines) ================= */

  function playing() {
    if (q && q.type === "audio") return AU && !AU.paused;
    return T && T.playing && !T.paused;
  }
  function toggle() {
    if (q && q.type === "audio") {
      if (!AU) return;
      if (AU.paused) { AU.play().catch(function () { parkNote(); }); } else { AU.pause(); }
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
  /* what the chips say and what they really do: +50% is a true 150%,
     +100% is a true 300% - the compressor keeps 300% loud, not shredded */
  var BOOSTS = [{ g: 1, l: "OFF" }, { g: 1.5, l: "+50%" }, { g: 3, l: "+100%" }];
  function boostLabel(g) { for (var i = 0; i < BOOSTS.length; i++) if (BOOSTS[i].g === g) return BOOSTS[i].l; return g > 1 ? "+" + Math.round((g - 1) * 100) + "%" : "off"; }

  function boostPref() { var v = jget(BOOSTKEY, 1); return v === 2 ? 3 : v; }   /* old 2x becomes the new 300% */
  var comp = null;
  function ensureGraph(el) {
    if (mediaSrc) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !el) return false;
    try {
      actx = new AC();
      mediaSrc = actx.createMediaElementSource(el);
      gainNode = actx.createGain();
      gainNode.gain.value = boostPref();
      /* at 300% raw gain would clip into distortion; the compressor catches
         the peaks so the loudness stays and the voice stays clear */
      comp = actx.createDynamicsCompressor();
      try {
        comp.threshold.value = -20; comp.knee.value = 22; comp.ratio.value = 5;
        comp.attack.value = 0.004; comp.release.value = 0.22;
      } catch (eC) {}
      mediaSrc.connect(gainNode);
      gainNode.connect(comp);
      comp.connect(actx.destination);
      if (actx.state === "suspended" && actx.resume) actx.resume();
      return true;
    } catch (e) { actx = null; mediaSrc = null; gainNode = null; comp = null; return false; }
  }
  function dropGraph() {
    /* a fresh element is the only way to un-route a tainted source */
    mediaSrc = null; gainNode = null; comp = null;
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
    jset(CANCELKEY, Date.now());   /* cancelled is cancelled: no dock on reload */
    clearTimeout(sleepTimer); sleepAt = 0; jset(SLEEPKEY, 0);
    try { if (T) T.stop(); } catch (e) {}
    try { if (AU) { AU.pause(); AU.src = ""; } } catch (e) {}
    q = null; curItem = 0;
    unmountDock();
  }

  /* ================= painting ================= */

  function paintPlay() {
    if (!dock) return;
    dock.classList.toggle("ap-on", !!playing());
    dock.querySelector(".ap-play").innerHTML = playing() ? IC.pause : IC.play;
    try { if (sheet) { var bp2 = sheet.querySelector("#apBigPlay"); if (bp2) bp2.innerHTML = playing() ? IC.pauseBig : IC.playBig; } } catch (e) {}
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
    a.addEventListener("play", function () { jset(PLAYKEY, 1); try { if (actx && actx.state === "suspended" && actx.resume) actx.resume(); } catch (e) {} paintPlay(); });
    a.addEventListener("waiting", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.add("loading"); });
    a.addEventListener("stalled", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.add("loading"); });
    a.addEventListener("canplay", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.remove("loading"); });
    a.addEventListener("playing", function () { var pr = dock && dock.querySelector(".ap-prog"); if (pr) pr.classList.remove("loading"); });
    a.addEventListener("pause", function () { jset(PLAYKEY, 0); paintPlay(); });
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
        /* the first tap anywhere brings the sound back: switching pages
           should feel like the audio never stopped */
        var resume = function () {
          document.removeEventListener("pointerdown", resume);
          try { if (q && q.type === "audio" && AU && AU.paused) AU.play().catch(function () {}); } catch (eR) {}
        };
        document.addEventListener("pointerdown", resume);
      } else if (name === "" || /notsupported|media/i.test(name)) {
        toast("Could not stream this one. Check the connection.");
      } else {
        toast("Paused where you left it - tap play to continue.");
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
    jset(CANCELKEY, 0);   /* starting anything new lifts an old cancel; PLAYKEY follows the element's own play/pause events */
    q = queue; curItem = queue.ch || 0;
    mountDock();
    playChapter(curItem, queue.seek || 0);
    if (queue.autoplay !== false) toast("🎧 Playing. Tap the bar for chapters, speed and sleep.");
  }

  /* ================= feeds (podcast RSS) ================= */

  /* feeds are the one thing we do not host, so fetching must survive a
     flaky network: direct fetch, then the rss2json mirror, then the last
     good copy we ever fetched. Only when all three fail does the reader
     see an error. */
  function feedKey(url) { return url.split("").reduce(function (a, c) { return ((a << 5) - a + c.charCodeAt(0)) | 0; }, 0); }
  function fetchFeed(url, cb) {
    var ck = FEEDCACHE + feedKey(url);
    var goodKey = "tsb_feed_good_" + feedKey(url);
    var cached = jget(ck, null);
    var lastGood = jget(goodKey, null);
    if (cached && Date.now() - cached.at < 6 * 36e5 && cached.items.length) { cb(cached.items, cached.showTitle, false, cached.art); return; }
    function viaMirror() {
      fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url))
        .then(function (r) { return r.json(); }).then(function (d) {
          if (!d || d.status !== "ok" || !d.items || !d.items.length) throw new Error("mirror empty");
          var out = [];
          d.items.forEach(function (it) {
            if (out.length >= 40) return;
            var src = (it.enclosure && it.enclosure.link) || "";
            if (!/^https:/.test(src)) return;
            var dd = ""; try { dd = new Date(it.pubDate).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch (e0) {}
            out.push({ label: it.title || "Episode", sub: dd || "episode", src: src });
          });
          if (!out.length) throw new Error("mirror has no audio");
          var res = { at: Date.now(), items: out, showTitle: (d.feed && d.feed.title) || "", art: (d.feed && d.feed.image) || "" };
          jset(ck, res); jset(goodKey, res);
          cb(out, res.showTitle, false, res.art);
        }).catch(function () {
          if (lastGood && lastGood.items && lastGood.items.length) { cb(lastGood.items, lastGood.showTitle, true, lastGood.art); return; }
          cb([], "", false, "");
        });
    }
    fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, "text/xml");
      var ch = doc.querySelector("channel") || doc.documentElement;
      var showTitle = ch && ch.querySelector("> title") ? ch.querySelector("> title").textContent : "";
      var artEl = "";
      try {
        var imgs = doc.getElementsByTagName("itunes:image");
        if (imgs && imgs.length) artEl = imgs[0].getAttribute("href") || "";
        if (!artEl) { var im = ch.querySelector("image > url"); if (im) artEl = im.textContent || ""; }
      } catch (eArt) {}
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
      if (out.length) {
        var res = { at: Date.now(), items: out, showTitle: showTitle, art: artEl };
        jset(ck, res); jset(goodKey, res);
        cb(out, showTitle, false, artEl);
      } else { viaMirror(); }
    }).catch(function () { viaMirror(); });
  }

  /* ── the show browser: one show, its episodes, play any of them here ── */
  var showSheet = null;
  function showBrowser(show, startAt) {
    closeShowSheet();
    showSheet = document.createElement("div");
    showSheet.id = "tsbShowSheet";
    showSheet.innerHTML =
      '<div class="tsb-showcard">' +
        '<button class="ap-x" aria-label="Close">✕</button>' +
        '<div class="tss-hero"><span class="tss-art">🎙️</span>' +
          '<span class="tss-mid"><b>' + esc(show.name) + '</b><i>with ' + esc(show.host) + '</i>' +
          '<p>' + esc(show.why) + '</p></span></div>' +
        '<div class="tss-acts"><button class="tss-playlatest" id="tssLatest">▶ PLAY THE LATEST</button>' +
          '<a class="tss-home" href="' + esc(show.home || show.url) + '" target="_blank" rel="noopener noreferrer">show home ↗</a></div>' +
        '<div class="ap-lab">EPISODES</div>' +
        '<div class="tss-list" id="tssList"><p class="tss-note tss-note--load"><span class="tss-dot"></span><span class="tss-dot"></span><span class="tss-dot"></span> Fetching the episodes…</p></div>' +
      '</div>';
    document.body.appendChild(showSheet);
    showSheet.querySelector(".ap-x").addEventListener("click", closeShowSheet);
    showSheet.addEventListener("click", function (e) { if (e.target === showSheet) closeShowSheet(); });
    var st = { all: [], shown: 0, art: "" };
    var STEP = 3;
    function paintList(stale) {
      var list = showSheet.querySelector("#tssList");
      if (!list) return;
      var html = stale ? '<p class="tss-note">Offline, showing the episodes saved from last time.</p>' : "";
      var i0 = 0;
      html += st.all.slice(0, st.shown).map(function (ep, i) {
        return '<button class="tss-ep" data-i="' + i + '"><span class="tss-ept">' + esc(ep.label) + '</span><i>' + esc(ep.sub || "") + '</i><em>▶ PLAY</em></button>';
      }).join("");
      if (st.shown < st.all.length) html += '<button class="tss-more" id="tssMore">+' + Math.min(STEP, st.all.length - st.shown) + ' MORE EPISODES</button>';
      list.innerHTML = html;
      var more = list.querySelector("#tssMore");
      if (more) more.addEventListener("click", function () { st.shown += STEP; paintList(false); });
      list.querySelectorAll(".tss-ep").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = Number(b.getAttribute("data-i"));
          closeShowSheet();
          playFeed(show, i);
        });
      });
    }
    if (startAt !== undefined) {
      /* opened to play a specific episode */
    }
    fetchFeed(show.rss, function (items, feedTitle, stale, art) {
      if (!showSheet) return;
      if (!items.length) {
        showSheet.querySelector("#tssList").innerHTML = '<p class="tss-note">Could not reach the feed right now. The show plays fine in its own app: ' + esc(show.home || show.url) + '</p>';
        return;
      }
      st.all = items; st.art = art || "";
      st.shown = Math.max(6, startAt !== undefined ? startAt + 3 : 6);
      var heroArt = showSheet.querySelector(".tss-art");
      if (heroArt && st.art) heroArt.innerHTML = '<img src="' + esc(st.art) + '" alt="" onerror="this.parentNode.textContent=\'🎙️\'">';
      paintList(stale);
    });
  }
  function closeShowSheet() {
    if (showSheet) { showSheet.remove(); showSheet = null; }
  }

  function playFeed(show, startAt) {
    fetchFeed(show.rss, function (items, feedTitle, stale, art) {
      if (!items.length) { toast("Could not reach the feed. Try the show's own app today."); return; }
      var idx = Math.min(startAt !== undefined ? startAt : 0, items.length - 1);
      var pos = audioPos("pod:" + show.id);
      /* a manual episode choice always wins over a remembered position,
         unless the choice IS the same episode */
      var seek = 0, ch = idx;
      if (pos && idx === 0 && pos.t) { ch = pos.ch; seek = pos.t; }
      if (startAt !== undefined) { ch = idx; seek = 0; }
      startAudio(audioQueue({
        key: "pod:" + show.id,
        title: show.name,
        sub: stale ? "Saved episodes from last visit · streaming from the show's feed" : "Latest episodes, streaming from the show's own feed",
        items: items,
        ch: ch,
        seek: seek,
        credit: "Episodes stream from " + (feedTitle || show.name) + "'s official public feed. All rights with " + (show.host || "the show") + " and their publisher. Show home: " + (show.home || "") +
          " · TheSmallBook does not host or alter this audio.",
        art: show.art || art || ""
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
        art: ("assets/covers/" + (b.id || bookId) + ".jpg")
      }));
    });
  }

  /* ================= session restore =================
     Whatever was playing (audiobook or podcast) comes back on every page
     and on every revisit, parked at the saved second. If the sleep timer
     ran out while away, it restores quiet instead of blasting sound. */

  function bootRestore() {
    if (q) return;
    /* you swiped the player away: it stays gone. Only LISTEN TODAY's
       continue (or starting anything new) brings audio back. */
    if (jget(CANCELKEY, 0)) return;
    var l = jget(LASTKEY, null);
    if (!l || l.type !== "audio" || !l.key) return;
    /* the state you left in is the state you get back: paused stays
       parked at the same second, playing picks up where it was */
    var sleepHold = !!jget(SLEEPKEY, 0);   /* sleep ran out while away → restore silent */
    var auto = !sleepHold && jget(PLAYKEY, 0) === 1;
    if (sleepHold) rearmSleep();
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
          art: ("assets/covers/" + (b.id || bid) + ".jpg")
        }));
        if (sleepHold) toast("😴 Restored where the sleep timer paused it - tap play.");
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
        if (sleepHold) toast("😴 Restored where the sleep timer paused it - tap play.");
      });
    }
  }
  window.addEventListener("pagehide", function () {
    try { if (q && q.type === "audio" && AU) jset(PLAYKEY, AU.paused ? 0 : 1); } catch (e) {}
  });
  setTimeout(bootRestore, 150);

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
    showBrowser: showBrowser,
    playAudiobook: playAudiobook,
    audiobookFor: function (bookId) { return (window.TSB_AUDIOBOOKS || {})[bookId] || null; },
    fetchAudiobook: fetchAudiobook,   /* v316: the shelf warms its own cache */
    audiobookCache: function (rec) { return jget(FEEDCACHE + "ab3_" + rec.id, null); },
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
      jset(CANCELKEY, 0);   /* continue is the one key that undoes a cancel */
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
              startAudio(audioQueue({ key: "ab:" + bid, title: l.title, sub: hiRec.lang === "hi" ? "Hindi mein poora audiobook · LibriVox" : "full audiobook · LibriVox", glyph: hiRec.dev || "", items: items, ch: pos ? pos.ch : 0, seek: pos ? pos.t : 0, autoplay: true, credit: "Read by volunteers for LibriVox (public domain), streamed from Archive.org." }));
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
