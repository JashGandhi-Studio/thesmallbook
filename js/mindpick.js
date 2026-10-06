/* ============================================================
   THESMALLBOOK, 🧠 MINDPICK (mindpick.js) · v300
   Problem-first block for the homepage: readers do not come for
   books, they come for a problem. "What's on your mind?" hands
   back 3 books + one thing to do this week.
   • DAILY CARD: first open of the day only (per user, seeded by
     a persistent uid + the date), a fresh question or quote.
     Dismiss (x) cancels it for the whole day. Never nags.
   • PICKER: accurate key-problem buttons or free typing, both
     land in the same engine: 3 real books from the shelf plus
     one concrete action. No invented books, ever: every id is
     verified against window.BOOKS at render time.
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

    /* the permanent picker mounts instantly */
    var html = '<div class="mp" id="mpPick">' +
      '<div class="mp-tag">🧠 WHAT\'S ON YOUR MIND THIS WEEK?</div>' +
      '<div class="mp-row" id="mpChips">' +
        PROBLEMS.slice(0, 8).map(function (p) {
          return '<button class="mp-chip" data-mppick="' + p.key + '">' + p.emoji + " " + esc(p.label) + "</button>";
        }).join("") +
      '</div>' +
      '<div class="mp-inputrow">' +
        '<input id="mpInput" type="text" maxlength="90" placeholder="or type it in your own words…" autocomplete="off">' +
        '<button id="mpGo" class="mp-go">SHOW ME</button>' +
      '</div>' +
    '</div>' +
    '<div id="mpResult"></div>';
    host.innerHTML = html;

    /* events */
    host.addEventListener("click", function (e) {
      var x = e.target.closest && e.target.closest("#mpDailyX");
      if (x) {
        set("tsb_mindpick_day", todayKey()); /* dismissed: never again today */
        var d = document.getElementById("mpDaily");
        if (d) { d.classList.add("mp--bye"); setTimeout(function () { d.parentNode && d.parentNode.removeChild(d); }, 240); }
        return;
      }
      var chip = e.target.closest && e.target.closest("[data-mppick]");
      if (chip) {
        set("tsb_mindpick_day", todayKey()); /* engaging with the daily also closes it */
        var dd = document.getElementById("mpDaily");
        if (dd) { dd.parentNode && dd.parentNode.removeChild(dd); }
        show(chip.getAttribute("data-mppick"));
      }
    });
    var go = document.getElementById("mpGo");
    var inp = document.getElementById("mpInput");
    function fire() {
      var v = (inp.value || "").trim();
      if (!v) return;
      var p = matchProblem(v);
      if (!p) {
        resultNone(v);
        return;
      }
      show(p.key, p, v);
    }
    if (go) go.addEventListener("click", fire);
    if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") fire(); });

    /* daily card: first open of the day, per user; dismiss = gone all day.
       Waits out the hands-free corner nudge so the two never fight for the
       reader's first glance; the nudge lives at most ~18s, then we land. */
    setTimeout(function maybeDaily(waited) {
      /* the nudge drops at ~2.4s; we check from 2.8s so we never miss it */
      if (document.querySelector(".tss-nudge")) { if (waited < 10) setTimeout(function () { maybeDaily(waited + 1); }, 2000); return; }
      var tKey = todayKey();
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
        '<div class="mp-row">' +
          '<button class="mp-chip mp-chip--go" data-mppick="' + d.pick + '">Show me ' + esc(problemLabel(d.pick).toLowerCase()) + ' &rarr;</button>' +
          '<span class="mp-or">or type it below</span>' +
        '</div>';
      var pick = document.getElementById("mpPick");
      pick.parentNode.insertBefore(card, pick);
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
        '<div class="mp-result__tag">' + p.emoji + " FOR " + esc(p.label.toUpperCase()) + ', THREE READS</div>' +
        '<div class="mp-books">' + cards + "</div>" + action +
        '<div class="mp-result__row">' +
          '<a class="mp-ask" href="chat.html?arg=' + encodeURIComponent(askQ) + '">💬 ASK THE LIBRARY ABOUT THIS</a>' +
          '<button class="mp-again" id="mpAgain">↺ different problem</button>' +
        '</div></div>';
    var again = document.getElementById("mpAgain");
    if (again) again.addEventListener("click", function () {
      document.getElementById("mpResult").innerHTML = "";
      var inp = document.getElementById("mpInput");
      if (inp) { inp.value = ""; inp.focus(); }
      document.getElementById("mpPick").scrollIntoView({ behavior: "smooth", block: "center" });
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
