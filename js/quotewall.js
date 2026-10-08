/* ============================================================
   THESMALLBOOK, 📌 THE QUOTE WALL (quotewall.js) · v300
   A public soft board with pins. Readers pin:
   • a line worth keeping (sticky notes, four colours, infinite)
   • a photo (pinned like a polaroid, caption underneath)
   The board pans with a finger, zooms with a pinch or the wheel,
   and grows as people pin. Built on the community posts table
   (kind: wall-note / wall-photo), so every wall note is a real
   post: reportable, deletable by its author, and safe.
   The writing section stays exactly what it was; this is the
   little sibling that lives beside it.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_QUOTEWALL) return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ago(t) { var d = Date.now() - t; if (d < 6e4) return "just now"; if (d < 36e5) return Math.floor(d / 6e4) + " min ago"; if (d < 864e5) return Math.floor(d / 36e5) + " h ago"; return new Date(t).toLocaleDateString(); }
  function hash(s) { var h = 5381; s = String(s || ""); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; }
  function me() { try { return (window.TSB_COMMUNITY && TSB_COMMUNITY.me && TSB_COMMUNITY.me()) || null; } catch (e) { return null; } }

  var COLORS = ["#fff8b8", "#d8f5c0", "#ffd9e2", "#d9e8ff", "#ffe3a3", "#e2d3ff", "#c2f0e4", "#ffd9c4"]; /* sticky pastels */

  /* a small open shelf of lines (old, public-domain voices) so a reader
     can pin a great line even when no words come. Tap one, it fills
     the note; edit it or add your own spin, then pin. */
  var SHELF = [
    { t: "It is not that we have a short time to live, but that we waste a lot of it.", a: "Seneca", k: "life" },
    { t: "Waste no more time arguing about what a good person should be. Be one.", a: "Marcus Aurelius", k: "life" },
    { t: "You have power over your mind, not outside events. Realise this, and you will find strength.", a: "Marcus Aurelius", k: "calm" },
    { t: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", a: "Marcus Aurelius", k: "calm" },
    { t: "The impediment to action advances action. What stands in the way becomes the way.", a: "Marcus Aurelius", k: "courage" },
    { t: "He who is brave is free.", a: "Seneca", k: "courage" },
    { t: "Difficulties strengthen the mind, as labour does the body.", a: "Seneca", k: "discipline" },
    { t: "Luck is what happens when preparation meets opportunity.", a: "Seneca", k: "life" },
    { t: "Every new beginning comes from some other beginning's end.", a: "Seneca", k: "life" },
    { t: "We suffer more often in imagination than in reality.", a: "Seneca", k: "calm" },
    { t: "The man who moves a mountain begins by carrying away small stones.", a: "Confucius", k: "habits" },
    { t: "It does not matter how slowly you go as long as you do not stop.", a: "Confucius", k: "discipline" },
    { t: "Our greatest glory is not in never falling, but in rising every time we fall.", a: "Confucius", k: "courage" },
    { t: "The man who asks a question is a fool for a minute, the man who does not ask is a fool for life.", a: "Confucius", k: "life" },
    { t: "Choose a job you love, and you will never have to work a day in your life.", a: "Confucius", k: "life" },
    { t: "You do not rise to the level of your goals. You fall to the level of your systems.", a: "James Clear", k: "habits" },
    { t: "Every action you take is a vote for the type of person you wish to become.", a: "James Clear", k: "habits" },
    { t: "You should be far more concerned with your current trajectory than with your current results.", a: "James Clear", k: "habits" },
    { t: "Tell me where I'm going to be in five years and I'll tell you the habits I'm building today.", a: "after James Clear", k: "habits" },
    { t: "The successful warrior is the average person, with laser-like focus.", a: "Bruce Lee", k: "focus" },
    { t: "The individual who says it is not possible should move out of the way of those doing it.", a: "after Bruce Lee", k: "focus" },
    { t: "Concentrate all your thoughts upon the work in hand.", a: "after Alexander Graham Bell", k: "focus" },
    { t: "I fear not the person who has practiced 10,000 kicks once, but the one who has practiced one kick 10,000 times.", a: "Bruce Lee", k: "discipline" },
    { t: "Deep work is the ability to focus without distraction on a cognitively demanding task.", a: "Cal Newport", k: "focus" },
    { t: "Clarity about what matters provides clarity about what does not.", a: "Cal Newport", k: "focus" },
    { t: "Do the hard jobs first. The easy jobs will take care of themselves.", a: "Dale Carnegie", k: "discipline" },
    { t: "Discipline is choosing between what you want now and what you want most.", a: "Abraham Lincoln", k: "discipline" },
    { t: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", a: "Abraham Lincoln", k: "focus" },
    { t: "Whatever you are, be a good one.", a: "Abraham Lincoln", k: "life" },
    { t: "The best way to predict your future is to create it.", a: "Abraham Lincoln", k: "life" },
    { t: "Energy and persistence conquer all things.", a: "Benjamin Franklin", k: "discipline" },
    { t: "You may delay, but time will not.", a: "Benjamin Franklin", k: "habits" },
    { t: "An investment in knowledge pays the best interest.", a: "Benjamin Franklin", k: "money" },
    { t: "Beware of little expenses; a small leak will sink a great ship.", a: "Benjamin Franklin", k: "money" },
    { t: "A penny saved is a penny earned.", a: "Benjamin Franklin", k: "money" },
    { t: "Do not put all your eggs in one basket.", a: "after Benjamin Franklin", k: "money" },
    { t: "The rich invest in time; the poor invest in money.", a: "old proverb", k: "money" },
    { t: "A budget is telling your money where to go instead of wondering where it went.", a: "old money advice", k: "money" },
    { t: "Do not save what is left after spending, but spend what is left after saving.", a: "Warren Buffett", k: "money" },
    { t: "The Chains of habit are too light to be felt until they are too heavy to be broken.", a: "Warren Buffett", k: "habits" },
    { t: "It is not that I'm so smart. But I stay with the questions much longer.", a: "Albert Einstein", k: "focus" },
    { t: "In the middle of difficulty lies opportunity.", a: "Albert Einstein", k: "courage" },
    { t: "Arise, awake, and stop not till the goal is reached.", a: "Swami Vivekananda", k: "discipline" },
    { t: "Take up one idea. Make that one idea your life; think of it, dream of it, live on that idea.", a: "Swami Vivekananda", k: "focus" },
    { t: "All power is within you; you can do anything and everything.", a: "Swami Vivekananda", k: "courage" },
    { t: "You cannot believe in the divine until you believe in yourself first.", a: "after Swami Vivekananda", k: "courage" },
    { t: "The best time to plant a tree was twenty years ago. The second best time is now.", a: "old proverb", k: "habits" },
    { t: "A calm mind brings inner strength and self-confidence.", a: "after the Dhammapada", k: "calm" },
    { t: "Rule your mind or it will rule you.", a: "old proverb", k: "calm" },
    { t: "Almost everything will work again if you unplug it for a few minutes, including you.", a: "after Anne Lamott", k: "calm" },
    { t: "Rest is not idleness; to lie sometimes on the grass under trees is not a waste of time.", a: "after John Lubbock", k: "calm" },
    { t: "Courage is not the absence of fear, but the triumph over it.", a: "Nelson Mandela", k: "courage" },
    { t: "Do one thing every day that scares you.", a: "after Eleanor Roosevelt", k: "courage" },
    { t: "Twenty years from now you will be more disappointed by the things you did not do than by the ones you did.", a: "after Mark Twain", k: "life" },
    { t: "The secret of getting ahead is getting started.", a: "Mark Twain", k: "habits" },
    { t: "Continuous improvement is better than delayed perfection.", a: "Mark Twain", k: "discipline" },
    { t: "What you seek is seeking you.", a: "Rumi", k: "life" },
    { t: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", a: "Rumi", k: "life" },
    { t: "Silence is the language of the calm; it needs no translation.", a: "after Rumi", k: "calm" },
    { t: "The mind is everything. What you think you become.", a: "after the Dhammapada", k: "calm" }
  ];
  var TOPICS = [["all", "ALL"], ["habits", "HABITS"], ["focus", "FOCUS"], ["money", "MONEY"], ["courage", "COURAGE"], ["calm", "CALM"], ["discipline", "DISCIPLINE"], ["life", "LIFE"]];

  /* house pins: lines from the shelf, on the wall so a first visit
     feels like a board readers actually use. Real quotes, real books,
     signed like a reader would sign. */
  var SEEDS = [
    { id: "hw-seed-01", txt: "You do not rise to the level of your goals. You fall to the level of your systems.", by: "a reader, on Atomic Habits" },
    { id: "hw-seed-02", txt: "You have power over your mind - not outside events. Realise this, and you will find strength.", by: "a reader, on Meditations" },
    { id: "hw-seed-03", txt: "It is not that we have a short time to live, but that we waste a lot of it.", by: "a reader, on Seneca" },
    { id: "hw-seed-04", txt: "Whatever you are, be a good one.", by: "a reader, on Lincoln" },
    { id: "hw-seed-05", txt: "The man who moves a mountain begins by carrying away small stones.", by: "a reader, on Confucius" },
    { id: "hw-seed-06", txt: "Do the hard jobs first. The easy jobs will take care of themselves.", by: "a reader, on Carnegie" },
    { id: "hw-seed-07", txt: "A budget is telling your money where to go instead of wondering where it went.", by: "a reader, on money" },
    { id: "hw-seed-08", txt: "When you were made a leader you weren't given a crown, you were given the responsibility to bring out the best in others.", by: "a reader, on leadership" },
    { id: "hw-seed-09", txt: "Peace is this moment without judgment. That is all. This moment, without judgment.", by: "a reader, on calm" },
    { id: "hw-seed-10", txt: "Deep work is the ability to focus without distraction on a cognitively demanding task.", by: "a reader, on Deep Work" },
    { id: "hw-seed-11", txt: "The best time to plant a tree was twenty years ago. The second best time is now.", by: "a reader, on starting" },
    { id: "hw-seed-12", txt: "Waste no more time arguing about what a good person should be. Be one.", by: "a reader, on Marcus Aurelius" },
    { id: "hw-seed-13", txt: "Small daily improvements are the key to staggering long-term results.", by: "a reader, on habits" },
    { id: "hw-seed-14", txt: "Energy and persistence conquer all things.", by: "a reader, on Franklin" }
  ];
  var KINDS = "(wall-note,wall-photo)";
  var notes = [];
  var view = { x: 0, y: 0, s: 0.85 }; /* start a touch zoomed out: a wall, not one note */
  var board = null, vp = null;

  /* ---------- layout: deterministic scatter, columns that grow ---------- */
  function layout(n) {
    var cols = Math.max(3, Math.min(6, Math.round(Math.sqrt(Math.max(4, n)) * 1.15)));
    var colH = []; for (var i = 0; i < cols; i++) colH.push(i === 0 ? 122 : 30); /* row 1 keeps clear for the board sign */
    return function (id) {
      var h = hash(id);
      var c = h % cols;
      var x = 26 + c * 236 + ((h >> 4) % 26);
      var y = colH[c] + ((h >> 7) % 40);
      colH[c] = y + 232 + ((h >> 11) % 46);
      var rot = ((h >> 3) % 13) - 6; /* any direction, minus six to plus six degrees */
      return { x: x, y: y, rot: rot };
    };
  }

  function noteColor(p) {
    try {
      var tags = p.tags || [];
      for (var i = 0; i < tags.length; i++) {
        var t = String(tags[i]);
        if (t.indexOf("c:") === 0 && /^c:[0-9a-fA-F]{6}$/.test(t)) return "#" + t.slice(2);
      }
    } catch (e) {}
    return null;
  }
  function isMine(p) { var u = me(); return !!(u && p.author_id === u.id); }
  function noteHTML(p, pos) {
    if (p.by) {
      var ci2 = hash(p.id) % COLORS.length;
      return '<div class="qw-note" style="left:' + pos.x + 'px;top:' + pos.y + 'px;background:' + COLORS[ci2] + ';transform:rotate(' + pos.rot + 'deg)" data-p="' + esc(p.id) + '">' +
        '<span class="qw-pin"></span>' +
        '<p class="qw-txt">' + esc(p.txt) + '</p>' +
        '<span class="qw-by">- ' + esc(p.by) + '</span>' +
        '</div>';
    }
    var mine = isMine(p);
    var ci = hash(p.id) % COLORS.length;
    var col = noteColor(p) || COLORS[ci];
    if (p.kind === "wall-photo") {
      return '<div class="qw-photo" style="left:' + pos.x + 'px;top:' + pos.y + 'px;transform:rotate(' + pos.rot + 'deg)" data-p="' + esc(p.id) + '">' +
        '<span class="qw-pin qw-pin--red"></span>' +
        (mine ? '<button class="qw-del" data-del="' + esc(p.id) + '" aria-label="Remove">✕</button>' : '') +
        '<img src="' + esc(p.cover_url || "") + '" alt="pinned photo" loading="lazy">' +
        (p.body ? '<span class="qw-cap">' + esc(p.body) + '</span>' : '') +
        '<span class="qw-by">' + esc(p.author_name || "A reader") + ' · ' + ago(Date.parse(p.created_at) || 0) + '</span>' +
        '</div>';
    }
    var txt = String(p.body || "").slice(0, 320);
    return '<div class="qw-note" data-own="' + (mine ? "1" : "0") + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px;background:' + col + ';transform:rotate(' + pos.rot + 'deg)" data-p="' + esc(p.id) + '">' +
      '<span class="qw-pin"></span>' +
      (mine ? '<button class="qw-del" data-del="' + esc(p.id) + '" aria-label="Remove">✕</button>' : '') +
      '<p class="qw-txt">' + esc(txt) + '</p>' +
      '<span class="qw-by"> -  ' + esc(p.author_name || "A reader") + ' · ' + ago(Date.parse(p.created_at) || 0) + '</span>' +
      '</div>';
  }

  function posOverride(id) {
    try { return JSON.parse(localStorage.getItem("tsb_wall_pos_" + id) || "null"); } catch (e) { return null; }
  }
  function paint() {
    if (!board) return;
    var all = SEEDS.concat(notes);
    var base = layout(all.length + 3);
    var pos = function (id) { var o = posOverride(id); return o ? { x: o.x, y: o.y, rot: o.rot || 0 } : base(id); };
    var html = "";
    all.forEach(function (p) {
      html += noteHTML(p, pos(p.id));
    });
    board.innerHTML = html +
      '<div class="qw-corner">📌 pin something, the board never runs out of space</div>';
    board.style.width = (26 * 2 + Math.min(6, Math.max(3, Math.round(Math.sqrt(Math.max(4, all.length)) * 1.15))) * 236 + 40) + "px";
    board.style.height = "1350px";
    board.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = this.getAttribute("data-del");
        var C = window.TSB_COMMUNITY;
        if (!confirm("Take your pin off the wall?")) return;
        C.deletePost(id).then(load).catch(function () { alert("Could not remove it, try again."); });
      });
    });
  }

  /* ---------- pan + zoom ---------- */
  function apply() {
    if (!board) return;
    board.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.s + ")";
  }
  function shareNote(txt, by) {
    var text = '"' + txt + '"' + (by ? " - " + by : "") + " · TheSmallBook quote wall";
    if (navigator.share) {
      navigator.share({ title: "A line worth keeping", text: text }).catch(function () {});
      return;
    }
    function done() { toast("📋 Copied. Paste it anywhere."); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }
  function bindGestures() {
    var pts = {}, lastMid = null, lastDist = 0, panning = false, sx = 0, sy = 0, vx0 = 0, vy0 = 0, moved = false;
    /* tap a note to share it · drag YOUR own note to move it */
    var tapNote = null, tapX = 0, tapY = 0, draggingNote = null;
    vp.addEventListener("pointerdown", function (e) {
      var n = e.target.closest(".qw-note");
      tapNote = n; tapX = e.clientX; tapY = e.clientY; draggingNote = null;
      if (n && n.getAttribute("data-own") === "1" && !e.target.closest(".qw-del")) {
        try { n.setPointerCapture(e.pointerId); } catch (e0) {}
      }
    }, true);
    vp.addEventListener("pointermove", function (e) {
      if (!tapNote) return;
      var dx2 = e.clientX - tapX, dy2 = e.clientY - tapY;
      if (!draggingNote && tapNote.getAttribute("data-own") === "1" && Math.abs(dx2) + Math.abs(dy2) > 10) {
        draggingNote = tapNote;
        draggingNote.style.transition = "none";
        draggingNote.style.zIndex = 50;
      }
      if (draggingNote) {
        e.stopPropagation();
        var r = vp.getBoundingClientRect();
        var bx = (e.clientX - r.left - view.x) / view.s - 110;
        var by = (e.clientY - r.top - view.y) / view.s - 60;
        draggingNote.style.left = Math.max(4, bx) + "px";
        draggingNote.style.top = Math.max(4, by) + "px";
      }
    }, true);
    vp.addEventListener("pointerup", function (e) {
      if (draggingNote) {
        var id2 = draggingNote.getAttribute("data-p");
        var r2 = vp.getBoundingClientRect();
        var bx2 = Math.max(4, (e.clientX - r2.left - view.x) / view.s - 110);
        var by2 = Math.max(4, (e.clientY - r2.top - view.y) / view.s - 60);
        var prev = posOverride(id2) || {};
        try { localStorage.setItem("tsb_wall_pos_" + id2, JSON.stringify({ x: Math.round(bx2), y: Math.round(by2), rot: prev.rot || 0 })); } catch (e1) {}
        draggingNote.style.transition = ""; draggingNote.style.zIndex = "";
        draggingNote = null; tapNote = null;
        return;
      }
      if (tapNote && Math.abs(e.clientX - tapX) + Math.abs(e.clientY - tapY) < 9 && !e.target.closest(".qw-del") && !e.target.closest("button")) {
        var p3 = null;
        var id3 = tapNote.getAttribute("data-p");
        SEEDS.concat(notes).forEach(function (x) { if (x.id === id3) p3 = x; });
        if (p3) shareNote(p3.by ? p3.txt : String(p3.body || "").slice(0, 320), p3.by || p3.author_name || "");
      }
      tapNote = null;
    }, true);
    vp.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length === 1) { panning = true; moved = false; sx = e.clientX; sy = e.clientY; vx0 = view.x; vy0 = view.y; }
      else if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        lastDist = Math.hypot(a.x - b.x, a.y - b.y); lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        panning = false;
      }
    });
    vp.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length >= 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (lastDist > 10) {
          var ns = Math.max(0.45, Math.min(2.6, view.s * (d / lastDist)));
          view.x = mid.x - (mid.x - view.x) * (ns / view.s);
          view.y = mid.y - (mid.y - view.y) * (ns / view.s);
          view.s = ns; apply();
        }
        lastDist = d; lastMid = mid;
        return;
      }
      if (!panning) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      view.x = vx0 + dx; view.y = vy0 + dy; apply();
    });
    function drop(e) {
      delete pts[e.pointerId];
      if (Object.keys(pts).length < 2) lastDist = 0;
      if (Object.keys(pts).length === 0) panning = false;
    }
    vp.addEventListener("pointerup", drop);
    vp.addEventListener("pointercancel", drop);
    vp.addEventListener("wheel", function (e) {
      e.preventDefault();
      var ns = Math.max(0.45, Math.min(2.6, view.s * (e.deltaY < 0 ? 1.12 : 0.89)));
      view.x = e.clientX - (e.clientX - view.x) * (ns / view.s);
      view.y = e.clientY - (e.clientY - view.y) * (ns / view.s);
      view.s = ns; apply();
    }, { passive: false });
    $("qwZin").addEventListener("click", function () { view.s = Math.min(2.6, view.s * 1.2); apply(); });
    $("qwZout").addEventListener("click", function () { view.s = Math.max(0.45, view.s / 1.2); apply(); });
    $("qwZfit").addEventListener("click", function () { view.s = 1; view.x = 0; view.y = 0; apply(); });
  }

  /* ---------- data ---------- */
  var C = null;
  function load() {
    C = window.TSB_COMMUNITY;
    if (!C || !C.api) { setTimeout(load, 500); return; }
    C.whenReady(async function () {
      try {
        var rows = await C.api("posts?kind=in." + KINDS + "&select=*&order=created_at.desc&limit=200");
        notes = rows || [];
      } catch (e) { notes = []; }
      $("qwCount").textContent = notes.length
        ? (SEEDS.length + notes.length) + " PINS"
        : SEEDS.length + " PINS · BE THE NEXT TO PIN";
      paint();
    });
  }

  /* ---------- composer ---------- */
  function openCompose() {
    var u = me();
    if (!u) { location.href = "login.html?next=quotes.html"; return; }
    if ($("qwSheet")) return;
    var sh = document.createElement("div");
    sh.id = "qwSheet";
    sh.innerHTML =
      '<div class="qw-sheet__card">' +
        '<div class="qw-sheet__top"><b>📌 PIN TO THE WALL</b><button id="qwSheetX" aria-label="Close">✕</button></div>' +
        '<div class="qw-tabs"><button class="qw-tab on" data-t="note">✍️ WRITE A LINE</button><button class="qw-tab" data-t="photo">📷 PIN A PHOTO</button></div>' +
        '<div class="qw-pane" id="qwPaneNote">' +
          '<button class="qw-find" id="qwFind" type="button">📚 Find a line first</button>' +
          '<div id="qwFindBox" hidden>' +
            '<input id="qwSearch" type="text" maxlength="40" placeholder="Search a word or an author…">' +
            '<div class="qw-topics">' + TOPICS.map(function (tp) { return '<button type="button" class="qw-tp' + (tp[0] === "all" ? " on" : "") + '" data-k="' + tp[0] + '">' + tp[1] + '</button>'; }).join("") + '</div>' +
            '<div class="qw-qlist" id="qwQList"></div>' +
          '</div>' +
          '<textarea id="qwText" maxlength="300" placeholder="The line, the lesson, the thing you keep repeating to people…"></textarea>' +
          '<div class="qw-colors">' + COLORS.map(function (c, i) { return '<button class="qw-c' + (i === 0 ? " on" : "") + '" data-c="' + c + '" style="background:' + c + '" aria-label="sticky colour"></button>'; }).join("") +
            '<label class="qw-c qw-c--custom" aria-label="custom colour" style="background:conic-gradient(#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#b28dff,#ff6b6b)"><input type="color" id="qwCustom" value="#fff8b8"></label>' +
            '<button class="qw-c qw-c--share" id="qwShareAfter" type="button" aria-label="share after pinning" title="share after pinning">📎</button>' +
          '</div>' +
          '<div class="qw-anonrow"><button class="qw-anon" id="qwAnon">🕵️ POST AS ' + esc((u.name || "READER").toUpperCase()) + '</button><span>tap to switch to anonymous</span></div>' +
          '<button class="qw-go" id="qwPinNote">📌 PIN IT</button>' +
        '</div>' +
        '<div class="qw-pane" id="qwPanePhoto" hidden>' +
          '<button class="qw-pick" id="qwPick">📷 CHOOSE A PHOTO</button>' +
          '<img id="qwPrev" hidden alt="">' +
          '<input id="qwCap" maxlength="120" placeholder="One line under it (optional)">' +
          '<button class="qw-go" id="qwPinPhoto">📌 PIN THE PHOTO</button>' +
        '</div>' +
        '<p class="qw-fine">Kind words travel far. Keep it yours, keep it original; the wall is public and every pin carries your reader name.</p>' +
      '</div>';
    document.body.appendChild(sh);
    var color = COLORS[0], file = null, anon = false, shareAfter = false;
    var anonBtn = sh.querySelector("#qwAnon");
    anonBtn.addEventListener("click", function () {
      anon = !anon;
      anonBtn.textContent = anon ? "🕵️ POST ANONYMOUSLY" : "🕵️ POST AS " + ((u.name || "READER").toUpperCase());
      anonBtn.classList.toggle("on", anon);
    });
    sh.querySelector("#qwSheetX").addEventListener("click", function () { sh.remove(); });
    /* find-a-line: search + topic chips over the little open shelf */
    var qTopic = "all", qTerm = "";
    function paintQList() {
      var list = sh.querySelector("#qwQList");
      var term = qTerm.trim().toLowerCase();
      var rows = SHELF.filter(function (q) {
        if (qTopic !== "all" && q.k !== qTopic) return false;
        if (term && (q.t + " " + q.a).toLowerCase().indexOf(term) < 0) return false;
        return true;
      });
      list.innerHTML = rows.slice(0, 12).map(function (q, i) {
        return '<button type="button" class="qw-qi" data-i="' + SHELF.indexOf(q) + '"><span>' + esc(q.t) + '</span><i>' + esc(q.a) + '</i></button>';
      }).join("") +
      (rows.length > 12 ? '<p class="qw-qmore">Showing 12 of ' + rows.length + ', refine the search to see more</p>' : '') +
      (rows.length ? "" : '<p class="qw-qmore">Nothing matched. Type your own below.</p>');
    }
    sh.querySelector("#qwFind").addEventListener("click", function () {
      var box = sh.querySelector("#qwFindBox");
      box.hidden = !box.hidden;
      this.textContent = box.hidden ? "📚 Find a line first" : "✕ Hide the shelf";
      if (!box.hidden) { paintQList(); sh.querySelector("#qwSearch").focus(); }
    });
    sh.querySelector("#qwSearch").addEventListener("input", function () { qTerm = this.value; paintQList(); });
    sh.querySelector(".qw-topics").addEventListener("click", function (e) {
      var b = e.target.closest(".qw-tp"); if (!b) return;
      sh.querySelectorAll(".qw-tp").forEach(function (x) { x.classList.toggle("on", x === b); });
      qTopic = b.getAttribute("data-k"); paintQList();
    });
    sh.querySelector("#qwQList").addEventListener("click", function (e) {
      var b = e.target.closest(".qw-qi"); if (!b) return;
      var q = SHELF[Number(b.getAttribute("data-i"))];
      var ta = sh.querySelector("#qwText");
      ta.value = '"' + q.t + '" - ' + q.a;
      ta.focus();
      sh.querySelector("#qwFindBox").hidden = true;
      sh.querySelector("#qwFind").textContent = "📚 Find a line first";
    });
    sh.querySelectorAll(".qw-tab").forEach(function (t) {
      t.addEventListener("click", function () {
        sh.querySelectorAll(".qw-tab").forEach(function (x) { x.classList.toggle("on", x === t); });
        $("qwPaneNote").hidden = t.getAttribute("data-t") !== "note";
        $("qwPanePhoto").hidden = t.getAttribute("data-t") !== "photo";
      });
    });
    sh.querySelectorAll(".qw-c").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.id === "qwShareAfter") return;
        sh.querySelectorAll(".qw-c").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        color = b.getAttribute("data-c") || sh.querySelector("#qwCustom").value;
      });
    });
    sh.querySelector("#qwCustom").addEventListener("input", function () {
      color = this.value;
      sh.querySelectorAll(".qw-c").forEach(function (x) { x.classList.remove("on"); });
      var lab = sh.querySelector(".qw-c--custom");
      lab.classList.add("on");
      lab.style.background = color;
    });
    sh.querySelector("#qwShareAfter").addEventListener("click", function () {
      shareAfter = !shareAfter;
      this.classList.toggle("on", shareAfter);
      toast(shareAfter ? "📎 Will copy it for sharing after pinning." : "📎 Sharing off.");
    });
    $("qwPick").addEventListener("click", function () {
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        file = f;
        var pr = $("qwPrev");
        pr.src = URL.createObjectURL(f); pr.hidden = false;
      });
      inp.click();
    });
    $("qwPinNote").addEventListener("click", async function () {
      var txt = ($("qwText").value || "").trim();
      if (!txt) { $("qwText").focus(); return; }
      this.textContent = "📌 pinning…"; this.disabled = true;
      try {
        var tags = ["wall", "c:" + String(color).replace("#", "")];
        await C.publish({ title: "", subtitle: "", body: txt, kind: "wall-note", tags: tags, cover_url: "", audio_url: "", anon: anon });
        sh.remove();
        toast("📌 Pinned. The whole library can see it now.");
        if (shareAfter) shareNote(txt, (anon ? "a reader" : (u.name || "")));
        load();
      } catch (e) {
        this.textContent = "📌 PIN IT"; this.disabled = false;
        if (/sign-in/i.test(String(e && e.message))) location.href = "login.html?next=quotes.html";
        else toast("Could not pin: " + String(e && e.message || "").slice(0, 80));
      }
    });
    $("qwPinPhoto").addEventListener("click", async function () {
      if (!file) { $("qwPick").click(); return; }
      this.textContent = "📌 pinning…"; this.disabled = true;
      try {
        var small = await new Promise(function (res) {
          var r = new FileReader();
          r.onload = function () { res(r.result); };
          r.readAsDataURL(file);
        });
        var blob = await (await fetch(small)).blob();
        var f2 = new File([blob], "wall-" + Date.now() + ".jpg", { type: "image/jpeg" });
        var url = await C.upload(f2, "tsb-covers");
        await C.publish({ title: "", subtitle: "", body: ($("qwCap").value || "").trim(), kind: "wall-photo", tags: ["wall"], cover_url: url, audio_url: "", anon: anon });
        sh.remove(); toast("📌 Pinned."); load();
      } catch (e) {
        this.textContent = "📌 PIN THE PHOTO"; this.disabled = false;
        toast("Could not pin: " + String(e && e.message || "").slice(0, 80));
      }
    });
  }
  function toast(msg) {
    var t = document.createElement("div");
    t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:120;background:var(--ink);color:var(--paper);border-radius:999px;padding:11px 18px;font:800 12px 'Space Grotesk',sans-serif";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- boot ---------- */
  function boot() {
    vp = $("qwVp"); board = $("qwBoard");
    if (!vp || !board) return;
    bindGestures();
    $("qwAdd").addEventListener("click", openCompose);
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.TSB_QUOTEWALL = { reload: load };
})();
