/* ============================================================
   THESMALLBOOK, THE WEEKLY PROMPT (cold-start killor)
   A young community dies of silence: nobody replies to nobody.
   This ships one official question every week, the same for
   every reader, computed from the calendar. There is ALWAYS
   something fresh to answer, even on day one with zero users.

   The Library posts; you answer from write.html?prompt=pw-<week>.
   Answered marks are per reader id, never shared across ids.
   ============================================================ */
(function () {
  "use strict";

  /* 52 prompts, one per week, rotating forever. Real questions,
     the kind that make a story worth writing. */
  var PROMPTS = [
    "Which book rewired something in your head, and what did it change first?",
    "What is one habit you kept for a full year, and what kept you honest?",
    "Which failure of yours later looked like a setup?",
    "What did you stop doing this year, and what got better when you did?",
    "Which advice did you ignore, and what did it cost you?",
    "What is the smallest change that gave you the biggest return?",
    "Describe a day you almost quit. What happened next?",
    "Which sentence from a book do you think about more than you expected?",
    "What are you learning slowly, and why is it worth it?",
    "What did money teach you that no book could?",
    "Which fear did you walk through this year? What was on the other side?",
    "What does your morning actually look like, and what would you change?",
    "Who believed in you before you deserved it, and what did you do with it?",
    "What is one thing you do better than most people, and how did it happen?",
    "Which distraction stole the most from you this month?",
    "What did you read that you disagreed with, and why did it still help?",
    "What is the hardest conversation you have been avoiding?",
    "Which small daily system quietly carries your biggest results?",
    "What did you build that nobody noticed, and why does it still matter?",
    "If your week had one non-negotiable, what would it be and why?",
    "What did you unlearn, and what replaced it?",
    "Describe your worst decision this year. What does it teach now?",
    "Which purchase under a thousand rupees changed your daily life?",
    "What do you do when motivation is gone and the work remains?",
    "Who do you follow, and what have they actually changed in your actions?",
    "What is one promise you kept to yourself, and how?",
    "Which environment change (desk, city, room, app) fixed a habit for you?",
    "What did you say no to this month, and what did it protect?",
    "Which skill did you learn the ugly way, and what would you tell a beginner?",
    "What would you tell the version of you from one year ago?",
    "Which book did you almost put down, and are you glad you finished it?",
    "What is your relationship with rest, honestly?",
    "Where does your focus leak the most, and what plugs the leak?",
    "What is the best thing you watched, read or heard this month, and why?",
    "Which criticism stung, and turned out to be a gift?",
    "What are you building in public right now, and what has it cost?",
    "What did a mentor, teacher or stranger say that you still repeat?",
    "How did you recover a ruined day, week or month?",
    "What is one rule you set for yourself that you never break?",
    "Which comfort are you currently giving up, and what is it making room for?",
    "What did you do with no audience that you would do again?",
    "What did your proudest ordinary day look like?",
    "What is the most useful thing in your bag, desk or pocket, and why?",
    "Which question do you wish someone would ask you?",
    "What did you learn from someone older than you this year?",
    "Where were you wrong this month, and how did you find out?",
    "What is one thing your phone does for you that actually helps?",
    "Which routine survived your worst week, and what does it look like?",
    "What did helping someone else teach you about your own mess?",
    "If you had one free hour every day forever, what would it grow?",
    "What is the boldest thing you can do in the next seven days?",
    "What will you be able to say a year from now if you keep today's promise?"
  ];

  function isoWeek(dt) {
    var d = dt ? new Date(dt.getTime()) : new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var wk = Math.ceil((((d - y0) / 86400000) + 1) / 7);
    return { y: d.getUTCFullYear(), w: wk };
  }

  function weekId(dt) { var p = isoWeek(dt); return "pw-" + p.y + "w" + (p.w < 10 ? "0" + p.w : p.w); }

  function current(dt) {
    var p = isoWeek(dt);
    var q = PROMPTS[(p.w - 1) % PROMPTS.length];
    return { id: weekId(dt), year: p.y, week: p.w, q: q, total: PROMPTS.length };
  }

  function byId(id) {
    var m = String(id || "").match(/^pw-(\d{4})w(\d{2})$/);
    if (!m) return null;
    var y = parseInt(m[1], 10), wk = parseInt(m[2], 10);
    var ref = new Date(Date.UTC(y, 0, 1 + (wk - 1) * 7));
    var c = current(ref);
    return (c.id === id) ? c : { id: id, year: y, week: wk, q: PROMPTS[(wk - 1) % PROMPTS.length], total: PROMPTS.length };
  }

  function replyHref(c) { return "write.html?prompt=" + encodeURIComponent((c || current()).id); }

  /* answered marks: per reader id, last 8 weeks kept, ids never cross */
  function store() { try { return JSON.parse(localStorage.getItem("tsb_weekly_done") || "{}") || {}; } catch (e) { return {}; } }
  function saveStore(s) { try { localStorage.setItem("tsb_weekly_done", JSON.stringify(s)); } catch (e) {} }
  function uid() { try { var m = (window.TSB_COMMUNITY && TSB_COMMUNITY.me && TSB_COMMUNITY.me()) || {}; return m.id || "guest"; } catch (e) { return "guest"; } }
  function markDone(c) {
    var cur = c || current();
    var s = store(); s[cur.id] = s[cur.id] || {};
    s[cur.id][uid()] = Date.now();
    var ids = Object.keys(s).sort();
    while (ids.length > 8) { delete s[ids[0]]; ids.shift(); }
    saveStore(s);
  }
  function done(c) {
    var cur = c || current();
    var s = store()[cur.id];
    return !!(s && s[uid()]);
  }

  window.TSB_WEEKLY = {
    PROMPTS: PROMPTS,
    current: current,
    byId: byId,
    weekId: weekId,
    replyHref: replyHref,
    markDone: markDone,
    done: done
  };
})();
