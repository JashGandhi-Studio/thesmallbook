#!/usr/bin/env python3
"""v336: js/data-full.js is the one file you edit (every book, every lesson).
This writes the light files the app actually loads:
  js/data.js              every book + lesson titles (no lesson text) + the loader
  data/lessons/<id>.js    one book's lesson text, loaded only when that book is open
Run after any change to js/data-full.js:  python3 tools/split_data.py"""
import json, os, re, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "js/data-full.js"), encoding="utf-8").read()
arr = json.loads(src[src.index("["): src.index("];\nif (typeof window") + 1])
BODY = ("summary", "example", "action")
EXTRA = ("caveat", "actionPlan")          # only the book page needs these
fsrc = open(os.path.join(ROOT, "js/failures.js"), encoding="utf-8").read()
FAIL = {f["id"]: f for f in json.loads(fsrc[fsrc.index("["): fsrc.rindex("]") + 1])}
lite = []
os.makedirs(os.path.join(ROOT, "data/lessons"), exist_ok=True)
keep = set()
for b in arr:
    lb = dict(b)
    words = 0
    ls = []
    for l in b.get("lessons", []):
        ls.append({k: v for k, v in l.items() if k not in BODY})
        words += sum(len(str(l.get(k, "")).split()) for k in BODY)
    lb["lessons"] = ls
    for k in EXTRA: lb.pop(k, None)
    lb["lw"] = words                       # lesson words, for minutes without the text
    lite.append(lb)
    body = [[l.get(k, "") for k in BODY] for l in b.get("lessons", [])]
    fn = os.path.join(ROOT, "data/lessons", b["id"] + ".js")
    keep.add(os.path.abspath(fn))
    ext = {k: b[k] for k in EXTRA if k in b}
    g = FAIL.get(b.get("graveLink") or "")
    if g: ext["grave"] = {k: g.get(k, "") for k in ("id", "name", "title", "emoji", "category", "loss")}
    txt = "TSB_LFILL(" + json.dumps(b["id"]) + "," + json.dumps(body, ensure_ascii=False, separators=(",", ":")) + "," + json.dumps(ext, ensure_ascii=False, separators=(",", ":")) + ");\n"
    if not os.path.exists(fn) or open(fn, encoding="utf-8").read() != txt:
        open(fn, "w", encoding="utf-8").write(txt)
for f in glob.glob(os.path.join(ROOT, "data/lessons/*.js")):
    if os.path.abspath(f) not in keep: os.remove(f)
LOADER = r'''
/* v336 lesson loader. data.js carries every book and lesson title; the lesson
   text for one book lives in data/lessons/<id>.js and arrives only when needed.
   TSB_LESSONS.ensure(id, cb) runs cb once that book is complete (at once if it is).
   TSB_LESSONS.all(cb) completes every book (search inside lessons, Ask). */
(function () {
  if (typeof window === "undefined") return;
  var V = "336", byId = {}, wait = {}, allCb = null, allState = 0;
  BOOKS.forEach(function (b) { byId[b.id] = b; });
  function full(b) { return !b || b._full === 1; }
  window.TSB_LFILL = function (id, body, ext) {
    var b = byId[id]; if (!b) return;
    if (ext) for (var k in ext) b[k] = ext[k];
    if (!b.actionPlan) b.actionPlan = [];
    b._full = 1;
    b.lessons.forEach(function (l, i) { var x = body[i] || ["", "", ""]; l.summary = x[0]; l.example = x[1]; l.action = x[2]; });
    var w = wait[id]; delete wait[id];
    if (w) w.forEach(function (f) { try { f(b); } catch (e) {} });
  };
  function ensure(id, cb) {
    var b = byId[id];
    if (full(b)) { if (cb) cb(b); return; }
    if (wait[id]) { if (cb) wait[id].push(cb); return; }
    wait[id] = cb ? [cb] : [];
    var s = document.createElement("script");
    s.src = "data/lessons/" + encodeURIComponent(id) + ".js?v=" + V; s.async = true;
    s.onerror = function () { var w = wait[id]; delete wait[id]; if (w) w.forEach(function (f) { try { f(b); } catch (e) {} }); };
    (document.head || document.documentElement).appendChild(s);
  }
  function all(cb) {
    if (allState === 2) { if (cb) cb(); return; }
    (allCb = allCb || []).push(cb || function () {});
    if (allState === 1) return;
    allState = 1;
    var done = function () { allState = 2; var c = allCb; allCb = null; c.forEach(function (f) { try { f(); } catch (e) {} }); };
    try {
      fetch("js/data-full.js?v=" + V).then(function (r) { return r.text(); }).then(function (t) {
        var arr = JSON.parse(t.slice(t.indexOf("["), t.indexOf("];\nif (typeof window") + 1));
        arr.forEach(function (fb) { var b = byId[fb.id]; if (b && !full(b)) window.TSB_LFILL(fb.id, fb.lessons.map(function (l) { return [l.summary || "", l.example || "", l.action || ""]; }), { caveat: fb.caveat || "", actionPlan: fb.actionPlan || [] }); });
        done();
      }).catch(done);
    } catch (e) { done(); }
  }
  var fW = null;
  function failures(cb) {
    if (window.FAILURES && window.FAILURES.length) { if (cb) cb(); return; }
    if (fW) { if (cb) fW.push(cb); return; }
    fW = cb ? [cb] : [];
    var s = document.createElement("script"); s.src = "js/failures.js?v=" + V; s.async = true;
    s.onload = s.onerror = function () { var w = fW; fW = null; w.forEach(function (f) { try { f(); } catch (e) {} }); };
    (document.head || document.documentElement).appendChild(s);
  }
  window.TSB_LESSONS = { ensure: ensure, all: all, failures: failures, ready: function (id) { return full(byId[id]); }, version: V };
  /* the open book's text is written in by the page itself (book and reader) */
})();
'''
out = "const BOOKS = " + json.dumps(lite, ensure_ascii=False, separators=(",", ":")) + ";\nif (typeof window !== \"undefined\") window.BOOKS = BOOKS;\n" + LOADER
open(os.path.join(ROOT, "js/data.js"), "w", encoding="utf-8").write(out)
print("books", len(lite), "data.js %.0f KB" % (len(out.encode()) / 1024), "lesson files", len(keep))
