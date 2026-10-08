/* ============================================================
   THESMALLBOOK, 🧠 MINDPICK (mindpick.js) · v316
   One quiet daily card, nothing else. First open of the day
   (seeded per reader + date) lands a fresh question - some days
   it opens with a quote from a real book, some days it is a bare
   one-line ask. Tap it and the engine hands back 3 real books
   plus one thing to do this week. No invented books, ever: every
   id is verified against window.BOOKS at render time.
   (v316: the "what's on your mind?" picker is retired - the daily
   question is the whole mindpick now.)
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_MINDPICK) return;

  /* ---------- the problem bank (ids verified against BOOKS) ---------- */
  var PROBLEMS = [
    { key: "focus", emoji: "🎯", label: "I can't focus",
      words: ["focus", "distract", "concentrat", "phone addict", "scroll", "attention", "deep work", "social media"],
      ids: ["deep-work", "indistractable", "make-time", "digital-minimalism"],
      action: "Pick your one important task tonight. Tomorrow, 50 minutes on it before you open any app. Phone in another room, timer running." },
    { key: "habits", emoji: "🔁", label: "My habits don't stick",
      words: ["habit", "routine", "consisten", "gym regular", "streak", "discipline", "wake up early"],
      ids: ["atomic-habits", "power-of-habit", "tiny-habits", "grit"],
      action: "Shrink one habit until it takes under 2 minutes and do it right after something you already do daily. Never miss twice." },
    { key: "money", emoji: "💸", label: "Money worries me",
      words: ["money", "save", "invest", "debt", "salary", "rich", "expense", "budget", "finance", "loan", "emi"],
      ids: ["psychology-of-money", "richest-man-babylon", "iwt-rich", "lets-talk-money"],
      action: "Tonight, set one automatic transfer for the day after your salary lands. Even 10 percent. You never see it, you never miss it." },
    { key: "delay", emoji: "🐸", label: "I keep procrastinating",
      words: ["procrastinat", "lazy", "delay", "putting off", "postpone", "start", "motivation", "can't begin"],
      ids: ["eat-that-frog", "war-of-art", "the-first-20-hours", "gtd"],
      action: "Write the task you have been avoiding. Do its first 10 ugly minutes right now. Starting is a skill, not a mood." },
    { key: "career", emoji: "🧗", label: "My career feels stuck",
      words: ["career", "job", "promotion", "stuck", "skill", "interview", "resume", "switch", "growth at work", "boss"],
      ids: ["so-good", "mastery-greene", "7-habits", "the-defining-decade"],
      action: "Name the one skill your market pays most for. Book three practice hours for it this week, with feedback, before the fun work." },
    { key: "overthink", emoji: "🌀", label: "I overthink everything",
      words: ["overthink", "anxiety", "worry", "stress", "spiral", "can't sleep", "ruminate", "doubt", "nervous"],
      ids: ["thinking-fast-slow", "art-of-thinking-clearly", "lost-connections", "untethered-soul"],
      action: "Take the decision you are looping on. Write the worst case, the likely case and one step that survives both. Decide by Friday." },
    { key: "people", emoji: "♟️", label: "People and office politics",
      words: ["office politics", "colleague", "negotiat", "difficult person", "boss", "say no", "argument", "influence", "friends", "family fight"],
      ids: ["never-split", "48-laws-of-power", "how-to-win-friends", "games-people-play"],
      action: "In your next hard conversation, say their view back to them until you hear 'that's right'. Only then make your point." },
    { key: "start", emoji: "🚀", label: "I want to start something",
      words: ["startup", "business", "idea", "side project", "freelance", "build", "launch", "founder", "sell"],
      ids: ["mom-test", "lean-startup", "rework", "that-will-never-work"],
      action: "Write the one belief your idea cannot survive without. Test it this week with the cheapest possible experiment, ugliness included." },
    { key: "meaning", emoji: "🧭", label: "I feel lost / no purpose",
      words: ["purpose", "lost", "meaning", "empty", "why", "direction", "bored with life", "passion", "unhappy"],
      ids: ["mans-search", "almanack-naval", "ikigai", "siddhartha"],
      action: "Write your one-sentence why tonight and put it where mornings start. Then check this week's calendar against it and cut one thing that fails." },
    { key: "confidence", emoji: "🪞", label: "I doubt myself",
      words: ["confidence", "shy", "self esteem", "insecure", "compare", "comparison", "imposter", "fear of judgment", "bold"],
      ids: ["psycho-cybernetics", "thinking-big", "courage-disliked", "mindset"],
      action: "Do the one small thing you have been rehearsing in your head, today, at like 40 percent quality. Evidence beats affirmations." },
    { key: "relationships", emoji: "💞", label: "Relationships feel hard",
      words: ["relationship", "partner", "marriage", "love", "lonely", "girlfriend", "boyfriend", "spouse", "dating", "breakup"],
      ids: ["attached", "games-people-play", "nonviolent-communication", "7-habits"],
      action: "Say one real need out loud this week, plainly, no hints: 'I feel X when Y. Can we Z?' Then just listen to the answer." },
    { key: "health", emoji: "🫀", label: "My health is slipping",
      words: ["health", "fitness", "weight", "sleep", "tired", "energy", "diet", "exercise", "fit"],
      ids: ["atomic-habits", "power-of-habit", "unlimited-power", "lost-connections"],
      action: "Book exercise into your calendar as a named appointment this week, 20 minutes, three times. Treat it like a meeting with your boss." }
  ];

  /* ---------- the daily bank: question or quote, first open of the day ---------- */
  var DAILY = [
    { kind: "q", text: "If your days kept running exactly as they are, what would be gone in ten years?", pick: "meaning" },
    { kind: "quote", who: "Atomic Habits", text: "You do not rise to the level of your goals. You fall to the level of your systems.", pick: "habits" },
    { kind: "q", text: "Where did your money actually go last month? Could you say without opening the app?", pick: "money" },
    { kind: "quote", who: "The War of Art", text: "Resistance is fear. And fear is a compass: it points at the work worth doing.", pick: "delay" },
    { kind: "q", text: "What is the one task you have postponed longest, and what is it really costing you?", pick: "delay" },
    { kind: "quote", who: "Deep Work", text: "Clarity about what matters provides clarity about what does not.", pick: "focus" },
    { kind: "q", text: "If your boss read your browser history from yesterday, what would they think your job is?", pick: "focus" },
    { kind: "q", text: "Which conversation are you dreading, and what would 'that's right' sound like from them?", pick: "people" },
    { kind: "quote", who: "Man's Search for Meaning", text: "When we are no longer able to change a situation, we are challenged to change ourselves.", pick: "meaning" },
    { kind: "q", text: "You get 5 free hours this week, no duties. What would you finally start?", pick: "start" },
    { kind: "q", text: "What did you avoid this year because of what people might think, and did those people even notice?", pick: "confidence" },
    { kind: "quote", who: "The Psychology of Money", text: "Doing well with money has little to do with how smart you are and a lot to do with how you behave.", pick: "money" },
    { kind: "q", text: "Who is the person you keep meaning to message back? What is the real reason you have not?", pick: "relationships" },
    { kind: "q", text: "When did you last feel genuinely absorbed in something, and how long has it been?", pick: "career" }
  ];

  /* ---------- tiny utils ---------- */
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() {
    var u = get("tsb_uid", null);
    if (!u) { u = Math.random().toString(36).slice(2, 10); set("tsb_uid", u); }
    return u;
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; } return h; }
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function bookIndex() { var m = {}; (window.BOOKS || []).forEach(function (b) { m[b.id] = b; }); return m; }

  /* ---------- matching ---------- */
  function matchProblem(text) {
    var t = String(text || "").toLowerCase();
    var best = null, bestScore = 0;
    PROBLEMS.forEach(function (p) {
      var score = 0;
      p.words.forEach(function (w) { if (t.indexOf(w) >= 0) score += 1; });
      p.ids.forEach(function (id) { var b = bookIndex()[id]; if (b && t.indexOf(b.title.toLowerCase()) >= 0) score += 2; });
      if (score > bestScore) { best = p; bestScore = score; }
    });
    if (best) return best;
    /* fallback: search the shelf by title, route to "start" only if nothing */
    var bi = bookIndex();
    for (var id in bi) {
      if (t.length > 2 && bi[id].title.toLowerCase().indexOf(t) >= 0) {
        return { key: "shelf", emoji: "📖", label: bi[id].title, ids: [id], action: null, direct: bi[id] };
      }
    }
    return null;
  }
  function pickThree(p, seed) {
    var pool = p.ids.filter(function (id) { return !!bookIndex()[id]; });
    var out = [];
    for (var i = 0; i < pool.length && out.length < 3; i++) out.push(pool[(seed + i) % pool.length]);
    return out;
  }

  /* ---------- render ---------- */
  var mounted = false;
  function mount() {
    if (mounted) return;
    var host = document.getElementById("mindpick");
    if (!host) return;
    mounted = true;
    /* settings: the reader can switch off the picker card, the daily
       question, or both (Settings > daily prompts) */
    var showDaily = get("tsb_show_mp_daily", true) !== false;

    /* the permanent picker mounts instantly.
       v300: the chips rotate, a day-seeded shuffle means tomorrow opens
       with a different spread, so the card never turns into wallpaper. */
    var today = todayKey();
    var rot = PROBLEMS.slice();
    (function shuffle(arr) {
      var sd = hash(uid() + "|rot|" + today);
      for (var i = arr.length - 1; i > 0; i--) {
        sd = (sd * 1664525 + 1013904223) >>> 0;
        var j = sd % (i + 1);
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
    })(rot);
    /* v316: the "what's on your mind?" picker is retired - the daily
       card below is the whole mindpick now. */
    host.innerHTML = '<div id="mpResult"></div>';


    /* daily card: first open of the day, per user; dismiss = gone all day.
       Waits out the hands-free corner nudge so the two never fight for the
       reader's first glance; the nudge lives at most ~18s, then we land. */
    setTimeout(function maybeDaily(waited) {
      /* the nudge drops at ~2.4s; we check from 2.8s so we never miss it */
      var tKey = todayKey();
      if (get("tsb_show_mp_daily", true) === false) return;
      if (get("tsb_mindpick_day", "") === tKey) return;
      var dIdx = hash(uid() + "|" + tKey) % DAILY.length;
      var d = DAILY[dIdx];
      var lead = d.kind === "quote"
        ? '<div class="mp-quote">' + esc(d.text) + '<span class="mp-quote__who">' + esc(d.who) + '</span></div><div class="mp-q">That is today\'s page. So, honestly:</div>'
        : '<div class="mp-q">' + esc(d.text) + '</div>';
      var card = document.createElement("div");
      card.className = "mp mp--daily";
      card.id = "mpDaily";
      card.innerHTML =
        '<button class="mp-x" id="mpDailyX" aria-label="Close today\'s question">✕</button>' +
        '<div class="mp-daily__tag">⏳ TODAY, ONE QUESTION</div>' + lead +
        /* v317: the question is the best conversion point there is - so it
           leads somewhere. First door: your own notebook, the question
           already written at the top. Second: answer it publicly as a
           story. Third: the books, as always. */
        '<div class="mp-row mp-row--go">' +
          '<a class="mp-chip mp-chip--note" href="notes.html?about=' + encodeURIComponent(d.text) + '">📓 WRITE ON THIS, FOR YOURSELF</a>' +
          '<a class="mp-chip mp-chip--story" href="write.html?about=' + encodeURIComponent(d.text) + '">📣 ANSWER IT AS A STORY</a>' +
        '</div>' +
        '<div class="mp-row">' +
          '<button class="mp-chip mp-chip--go" data-mppick="' + d.pick + '">Show me ' + esc(problemLabel(d.pick).toLowerCase()) + ' &rarr;</button>' +
        '</div>';
      var pick = document.getElementById("mpPick");
      if (pick && pick.parentNode) pick.parentNode.insertBefore(card, pick);
      else if (host) host.insertBefore(card, host.firstChild);
      var go = card.querySelector("[data-mppick]");
      if (go) go.addEventListener("click", function () { show(d.pick); });
      var x = document.getElementById("mpDailyX");
      if (x) x.addEventListener("click", function () {
        card.classList.add("mp--bye");
        setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 240);
      });
      /* the day is consumed the moment the card actually shows */
      set("tsb_mindpick_day", tKey);
    }.bind(null, 0), 2800);
  }

  function problemLabel(key) {
    for (var i = 0; i < PROBLEMS.length; i++) if (PROBLEMS[i].key === key) return PROBLEMS[i].label;
    return "it";
  }

  /* ---------- result: 3 books + one thing to do this week ---------- */
  function show(key, prematched, typed) {
    var p = prematched;
    if (!p) { for (var i = 0; i < PROBLEMS.length; i++) if (PROBLEMS[i].key === key) p = PROBLEMS[i]; }
    if (!p) return;
    var seed = hash(uid() + "|" + todayKey() + "|" + p.key);
    var ids = pickThree(p, seed);
    var bi = bookIndex();
    var cards = ids.map(function (id, i) {
      var b = bi[id];
      if (!b) return "";
      return '<a class="mp-book mp-book--' + (i % 3) + '" href="book.html?id=' + esc(b.id) + '">' +
        '<img src="' + esc(b.cover) + '" alt="' + esc(b.title) + ' cover" loading="lazy" width="54" height="81">' +
        '<span class="mp-book__t">' + esc(b.title) + "</span>" +
        '<span class="mp-book__a">' + esc(b.author) + "</span>" +
        '<span class="mp-book__w">' + esc(b.oneLiner).slice(0, 86) + "…</span>" +
        '<span class="mp-book__go">READ FREE &rarr;</span></a>';
    }).join("");
    var askQ = typed || p.label;
    var action = p.action
      ? '<div class="mp-action"><div class="mp-action__tag">✅ ONE THING TO DO THIS WEEK</div><div class="mp-action__body">' + esc(p.action) + "</div></div>"
      : "";
    document.getElementById("mpResult").innerHTML =
      '<div class="mp mp--result">' +
        '<button class="mp-x" id="mpResultX" aria-label="Close results">✕</button>' +
        '<div class="mp-result__tag">' + p.emoji + " FOR " + esc(p.label.toUpperCase()) + ', THREE READS</div>' +
        '<div class="mp-books">' + cards + "</div>" + action +
        '<div class="mp-result__row">' +
          '<a class="mp-ask" href="chat.html?arg=' + encodeURIComponent(askQ) + '">💬 ASK THE LIBRARY ABOUT THIS</a>' +
          '<button class="mp-again" id="mpAgain">↺ different problem</button>' +
        '</div></div>';
    var rx = document.getElementById("mpResultX");
    if (rx) rx.addEventListener("click", function () {
      document.getElementById("mpResult").innerHTML = "";
    });
    var again = document.getElementById("mpAgain");
    if (again) again.addEventListener("click", function () {
      document.getElementById("mpResult").innerHTML = "";
    });
    var res = document.getElementById("mpResult");
    if (res && res.firstElementChild) res.firstElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function resultNone(v) {
    document.getElementById("mpResult").innerHTML =
      '<div class="mp mp--result"><div class="mp-result__tag">🔍 NOTHING MATCHED "' + esc(v) + '"</div>' +
      '<div class="mp-action__body" style="padding:0 4px 10px">Try one of the buttons above, or search the shelf for a title.</div>' +
      '<div class="mp-result__row"><a class="mp-ask" href="chat.html?arg=' + encodeURIComponent(v) + '">💬 ASK THE LIBRARY</a></div></div>';
  }

  function init() {
    if (!document.getElementById("mindpick")) return;
    mount();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.TSB_MINDPICK = { matchProblem: matchProblem, show: show, problems: PROBLEMS, daily: DAILY };
})();
