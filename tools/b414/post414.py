#!/usr/bin/env python3
"""Build 414 post-ingest: split data, editions data, SEO pages, sitemap, versions."""
import json, os, re, glob, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
ORIG = {"second-act-advantage", "grandparents-handbook-2", "phone-free-childhood", "loneliness-cure", "slow-web-manifesto"}

src = open("js/data-full.js", encoding="utf-8").read()
arr = json.loads(src[src.index("["):src.index("];\nif") + 1])
byid = {b["id"]: b for b in arr}
failsrc = open("js/failures.js", encoding="utf-8").read()
fails = json.loads(failsrc[failsrc.index("["):failsrc.rindex("]") + 1])
FAIL = {f["id"]: f for f in fails}
NEW_GRAVES = [f["id"] for f in fails[412:]]
NTW = []
cfg = open("js/config.js", encoding="utf-8").read()
m = re.search(r"NEW_THIS_WEEK: \[\n(.*?)\n  \],", cfg, re.S)
NTW = [x.strip().strip(',').strip('"') for x in m.group(1).splitlines() if x.strip()]
new_ids = [i for i in NTW if byid.get(i, {}).get("graveLink") in {f["id"] for f in fails[412:]} or i in ORIG]
# the 50 new books are exactly those whose ids are in NEW_THIS_WEEK minus retained old ones:
base_src = None
new_ids = NTW[:50]
assert len(new_ids) == 50 and all(i in byid for i in new_ids), new_ids[:3]

# ---------- 1. editions-data.js ----------
ej = [json.loads(l) for l in open("tools/editions/editions.jsonl", encoding="utf-8") if l.strip()]
def enc_hex(v): return "".join(chr(97 + int(x, 16)) for x in str(v).lstrip("#").lower())
spines = {e["id"]: enc_hex(e["bg"]) + enc_hex(e["fg"]) + enc_hex(e["ac"]) for e in ej if e.get("bg") and e.get("fg") and e.get("ac")}
open("js/editions-data.js", "w", encoding="utf-8").write(
    "/* TheSmallBook editions: generated from tools/editions/editions.jsonl. */\nwindow.TSB_ED = " +
    json.dumps(spines, separators=(",", ":")) + ";\n")

# ---------- 2. split data.js, preserving the shipped loader tail ----------
BODY = ("summary", "example", "action"); EXTRA = ("caveat", "actionPlan")
lite = []
os.makedirs("data/lessons", exist_ok=True)
keep = set()
for b in arr:
    lb = dict(b); words = 0; ls = []
    for l in b.get("lessons", []):
        ls.append({k: v for k, v in l.items() if k not in BODY})
        words += sum(len(str(l.get(k, "")).split()) for k in BODY)
    lb["lessons"] = ls
    for k in EXTRA: lb.pop(k, None)
    lb["lw"] = words
    lite.append(lb)
    body = [[l.get(k, "") for k in BODY] for l in b.get("lessons", [])]
    fn = os.path.join("data/lessons", b["id"] + ".js")
    keep.add(os.path.abspath(fn))
    ext = {k: b[k] for k in EXTRA if k in b}
    g = FAIL.get(b.get("graveLink") or "")
    if g: ext["grave"] = {k: g.get(k, "") for k in ("id", "name", "title", "emoji", "category", "loss")}
    txt = "TSB_LFILL(" + json.dumps(b["id"]) + "," + json.dumps(body, ensure_ascii=False, separators=(",", ":")) + "," + json.dumps(ext, ensure_ascii=False, separators=(",", ":")) + ");\n"
    if not os.path.exists(fn) or open(fn, encoding="utf-8").read() != txt:
        open(fn, "w", encoding="utf-8").write(txt)
for f in glob.glob("data/lessons/*.js"):
    if os.path.abspath(f) not in keep: os.remove(f)
old = open("js/data.js", encoding="utf-8").read()
lines = old.split("\n")
assert lines[1].startswith('if (typeof window'), lines[1][:60]
tail = "\n".join(lines[2:])
out = "const BOOKS = " + json.dumps(lite, ensure_ascii=False, separators=(",", ":")) + ";\n" + lines[1] + "\n" + tail
open("js/data.js", "w", encoding="utf-8").write(out)
# keep the generator honest for future runs
sp = open("tools/split_data.py", encoding="utf-8").read()
sp = sp.replace('src.index("];\\nif (typeof window")', 'src.index("];\\nif")')
sp = sp.replace('''out = "const BOOKS = " + json.dumps(lite, ensure_ascii=False, separators=(",", ":")) + ";\\nif (typeof window !== \\"undefined\\") window.BOOKS = BOOKS;\\n" + LOADER''',
'''_old = open(os.path.join(ROOT, "js/data.js"), encoding="utf-8").read() if os.path.exists(os.path.join(ROOT, "js/data.js")) else ""
_lines = _old.split("\\n")
_tail = "\\n".join(_lines[2:]) if len(_lines) > 2 and "TSB_LFILL_HOLD" in _old else None
_first = "const BOOKS = " + json.dumps(lite, ensure_ascii=False, separators=(",", ":")) + ";\\nif (typeof window !== \\"undefined\\") window.BOOKS = BOOKS;\\n"
out = _first + (_tail if _tail else LOADER)''')
open("tools/split_data.py", "w", encoding="utf-8").write(sp)

# ---------- 3. SEO pages for the 50 new books ----------
E = lambda s: html.escape(str(s or ""), quote=True)
tpl = open("books/mandi-math.html", encoding="utf-8").read()
head_end = tpl.index('<main class="seopage">'); foot_start = tpl.index("</main>")
def page(b):
    t, a, n = b["title"], b["author"], len(b["lessons"])
    desc = "%s by %s: the small read. %s" % (t, a, b["oneLiner"])
    desc = desc if len(desc) < 158 else desc[:155].rsplit(" ", 1)[0] + "\u2026"
    head = tpl[:head_end]
    head = re.sub(r"<title>.*?</title>", "<title>%s Summary - Key Lessons, Notes &amp; Action Steps | TheSmallBook</title>" % E(t), head, flags=re.S)
    head = re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"', lambda mm: mm.group(1) + E(desc) + '"', head)
    head = re.sub(r'(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*"', lambda mm: mm.group(1) + E(t) + ' Summary - Key Lessons, Notes &amp; Action Steps | TheSmallBook"', head)
    head = head.replace("books/mandi-math.html", "books/%s.html" % b["id"])
    ld = [{"@context": "https://schema.org", "@type": "Article", "headline": t + " - Summary & Key Lessons",
           "about": {"@type": "Book", "name": t, "author": {"@type": "Person", "name": a}, "datePublished": str(b["year"])},
           "author": {"@type": "Person", "name": "Jash Gandhi", "url": "https://thesmallbook.in/about.html"},
           "publisher": {"@type": "Organization", "name": "TheSmallBook", "url": "https://thesmallbook.in"},
           "mainEntityOfPage": "https://thesmallbook.in/books/%s.html" % b["id"]}]
    head = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda mm: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>", head, count=1, flags=re.S)
    m = ['<main class="seopage">\n', '    <header class="seohero">',
         '      <p class="seocrumb"><a href="../index.html">Library</a> \u203a %s</p>' % E(b["category"]),
         "      <h1>%s - Summary &amp; Key Lessons</h1>" % E(t),
         "      <p class=\"seometa\">by %s \u00b7 %s \u00b7 %s \u00b7 \u23f1 %s read \u00b7 %d lessons</p>" % (E(a), b["year"], E(b["category"]), b["readTime"], n)]
    if b["id"] in ORIG:
        m.append('      <div class="origband" style="margin:14px auto 0;"><span class="origband__row">\u2726 THE SMALLBOOK ORIGINAL \u2726</span><small>Written in-house. You will not find this book anywhere else.</small></div>')
    m += ['      <img class="seocover" src="../assets/covers/%s.jpg" alt="%s book cover" width="180" loading="lazy">' % (b["id"], E(t)),
          '      <p class="seotagline">%s</p>' % E(b["tagline"]),
          '      <a class="btn btn--yellow" href="../book.html?id=%s">\U0001f4d6 OPEN THE FULL INTERACTIVE BREAKDOWN \u2192</a>' % b["id"],
          '      <p class="seolang">\U0001f310 Read it in Hindi, Hinglish, Gujarati, Tamil &amp; 22 more languages, with audio.</p>',
          "    </header>", '    <section class="seoblock">', "      <h2>\U0001f4a1 The Big Idea</h2>", "      <p>%s</p>" % E(b["bigIdea"]), "    </section>",
          '    <h2 class="seoh2">\U0001f9e0 The %d Key Lessons</h2>' % n]
    for i, l in enumerate(b["lessons"]):
        m += ['    <section class="seoblock">', "        <h3>Lesson %d: %s</h3>" % (i + 1, E(l["title"])), '        <p class="seochapter">%s</p>' % E(l["chapter"]),
              "        <p>%s</p>" % E(l["summary"]),
              '        <p><strong>\U0001f4d6 Example:</strong> %s <a href="../book.html?id=%s#lesson-%d">Read the full example \u2192</a></p>' % (E(l["example"]), b["id"], i),
              "        <p><strong>\u26a1 Do this:</strong> %s</p>" % E(l["action"]), "      </section>"]
    m += ['    <section class="seoblock">', "      <h2>\u2705 5-Step Action Plan</h2>", "      <ol>%s</ol>" % "".join("<li>%s</li>" % E(x) for x in b["actionPlan"]), "    </section>",
          '    <section class="seoblock seoblock--caveat">', "      <h2>\u26a0\ufe0f When This Doesn't Work</h2>", "      <p>%s</p>" % E(b["caveat"]), "    </section>",
          '    <section class="seoblock seoblock--grave">', "      <h2>\U0001f480 The Graveyard Proves It</h2>",
          '      <p><a href="../graveyard.html#grave=%s">Read the related case study \u2192</a></p>' % b["graveLink"], "    </section>",
          '    <section class="seoblock">', "      <h2>\U0001f4ac Best Quotes from %s</h2>" % E(t), "      <ul>%s</ul>" % "".join("<li>\u201c%s\u201d</li>" % E(q) for q in b["quotes"]), "    </section>",
          '    <section class="seoblock seocta">', '      <a class="btn btn--yellow" href="../book.html?id=%s">\U0001f4d6 READ THE FULL BREAKDOWN</a>' % b["id"],
          "      <p>Interactive version: mark lessons as read, listen in your language, share quote cards.</p>", "    </section>", "  "]
    return head + "\n".join(m) + tpl[foot_start:]
for bid in new_ids:
    open("books/%s.html" % bid, "w", encoding="utf-8").write(page(byid[bid]))

# refresh grave links + deepen sections on existing pages
deepen = {}
for f in ["deepen1", "deepen2", "deepen3"]:
    mod = {}
    exec(open(f"tools/b414/{f}.py", encoding="utf-8").read(), mod)
    for k, v in mod["DEEPEN"].items():
        if v: deepen[k] = v
for bid, ls in deepen.items():
    p = "books/%s.html" % bid
    if not os.path.exists(p): continue
    tx = open(p, encoding="utf-8").read()
    if "Going deeper on" not in tx:
        items = "".join("<li><b>%s</b> %s</li>" % (E(l["title"]), E(l["summary"][:180])) for l in ls)
        sec = '    <section class="seoblock tsb-deep414"><h2>Going deeper on %s</h2><ul>%s</ul></section>' % (E(byid[bid]["title"]), items)
        tx = tx.replace("</main>", sec + "\n  </main>", 1) if "</main>" in tx else tx
    open(p, "w", encoding="utf-8").write(tx)
for b in arr:
    p = "books/%s.html" % b["id"]
    if not os.path.exists(p): continue
    tx = open(p, encoding="utf-8").read()
    new = re.sub(r'(\.\./graveyard\.html#grave=)[a-z0-9\-]+', r"\g<1>" + b["graveLink"], tx)
    new = re.sub(r'(\.\./graveyard/)[a-z0-9\-]+(\.html">The failure this book warns about)', r"\g<1>" + b["graveLink"] + r"\g<2>", new)
    if new != tx: open(p, "w", encoding="utf-8").write(new)

# ---------- 4. build414_seo (counts + subset) ----------
seo = open("tools/build413_seo.py", encoding="utf-8").read()
seo = seo.replace("tsb-seo413", "tsb-seo414").replace("Build 413 SEO", "Build 414 SEO").replace("build413_seo", "build414_seo")
seo = seo.replace("600 books", "650 books").replace("600 free book summaries", "650 free book summaries")
seo = seo.replace("4,343 lessons", "4,853 lessons").replace("4343", "4853")
seo = seo.replace("530 failure case studies", "559 failure case studies").replace("530 autopsies", "559 autopsies")
seo = seo.replace("530 real people", "559 real people").replace("against 530 real corporate failures", "against 559 real corporate failures")
seo = seo.replace("EXPLORE ALL 530 FAILURE CASE STUDIES", "EXPLORE ALL 559 FAILURE CASE STUDIES")
seo = seo.replace("All 600 book summaries", "All 650 book summaries").replace("Browse all 600 book summaries", "Browse all 650 book summaries")
seo = seo.replace("Free Book Summaries: 600 Books", "Free Book Summaries: 650 Books")
seo = seo.replace('"?v=412", "?v=413"', '"?v=413", "?v=414"').replace('"tsb-v412", "tsb-v413"', '"tsb-v413", "tsb-v414"')
seo = seo.replace('var BUILD = \\"412\\"', 'var BUILD = \\"413\\"').replace('BUILD = \\"413\\"', 'BUILD = \\"414\\"')
seo = seo.replace('text.replace("?v=356", "?v=413")', 'text.replace("?v=356", "?v=414")')
seo = seo.replace("""def main():
    build_books_index()
    build_ask_pages()
    made = build_missing_graves()
    build_causes()
    build_learning_topic()
    authors_made = build_missing_authors()
    upgrade_books()
    upgrade_authors_topics()
    upgrade_pseo()
    upgrade_existing_graves()
    upgrade_roots()
    update_robots_and_llms()
    bump_versions()
    print("Build 413 SEO complete. New grave pages:", made, "New author pages:", authors_made)
    print("Books:", len(BOOKS), "Ask:", len(ASK), "Failures:", len(FAILURES))""",
"""def main():
    build_books_index()
    made = build_missing_graves()
    authors_made = build_missing_authors()
    upgrade_books()
    upgrade_roots()
    update_robots_and_llms()
    bump_versions()
    print("Build 414 SEO complete. New grave pages:", made, "New author pages:", authors_made)
    print("Books:", len(BOOKS), "Ask:", len(ASK), "Failures:", len(FAILURES))""")
open("tools/b414/build414_seo.py", "w", encoding="utf-8").write(seo)
print("post414 part 1 done: editions", len(spines), "new pages", len(new_ids), "graves", len(NEW_GRAVES))
