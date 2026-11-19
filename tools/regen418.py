#!/usr/bin/env python3
"""Build 418 page regeneration, run AFTER tools/fix418_data.py:
- rewrites the 7 touched graveyard pages in their own baked template
  (theranos-board becomes the true Theranos case; six second-copy pages
  are moved to the six new case ids and rewritten; old files deleted)
- refreshes injected link blocks on any grave page that pointed at a
  removed id, rebuilds cause shelves, Ask pages and the learning topic
  (richer shelf scorer: title + oneLiner + tagline + bigIdea + category
  + lesson titles, threshold 4), and resyncs sitemap URLs.
Run from the repo root: python3 tools/regen418.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import build413_seo as B  # noqa: E402  (reads the already-fixed data files)

esc, short = B.esc, B.short
FAIL = {f["id"]: f for f in B.FAILURES}
BOOK = B.BY_ID
RENAME = {"gomechanic-fraud": "delorean-motor", "gowork-gm": "zynga-games",
          "dunzo-collapse": "fitbit-fade", "colonial-parkinson": "gopro-peak",
          "byjus-empire": "faraday-future", "hammer-broke": "zirtual-vanish"}
TOUCHED = ["theranos-board"] + list(RENAME.values())


def sub1(pat, rep, text, label):
    out, n = re.subn(pat, rep, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit("region not found once (%s): %s" % (label, pat[:60]))
    return out


def rewrite_grave(path, f):
    t = open(path, encoding="utf-8").read()
    b = BOOK.get(f.get("book"), {})
    rel = "graveyard/%s.html" % f["id"]
    title = B.grave_title(f)
    desc = "%s (%s) failure case study: %s. Loss: %s. What happened, the fatal mistake and the lesson, in simple English." % (
        f["name"], f["year"], f["title"], f["loss"])

    old_title = re.search(r"<title>(.*?)</title>", t, re.S).group(1)
    t = t.replace(old_title, esc(title))
    old_desc = re.search(r'<meta name="description" content="([^"]*)">', t).group(1)
    t = t.replace(old_desc, esc(short(desc, 320)))

    ld = [
        {"@context": "https://schema.org", "@type": "Article", "headline": "Why Did %s Fail? (%s)" % (f["name"], f["year"]), "author": {"@type": "Person", "name": "Jash Gandhi", "url": B.BASE + "/about.html"}, "publisher": {"@type": "Organization", "name": "TheSmallBook", "url": B.BASE}, "mainEntityOfPage": B.canonical_url(rel), "inLanguage": "en", "dateModified": B.DATE},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": "Why did %s fail?" % f["name"], "acceptedAnswer": {"@type": "Answer", "text": B.clean(f.get("mistake"))}},
            {"@type": "Question", "name": "How much did %s lose?" % f["name"], "acceptedAnswer": {"@type": "Answer", "text": B.clean(f.get("loss"))}},
            {"@type": "Question", "name": "What is the lesson from %s?" % f["name"], "acceptedAnswer": {"@type": "Answer", "text": B.clean(f.get("lesson"))}},
        ]},
        B.breadcrumb_ld([("Library", B.BASE + "/"), ("Graveyard", B.BASE + "/graveyard.html"), ("Why did %s fail?" % f["name"], B.canonical_url(rel))]),
    ]
    ld_json = json.dumps(ld, ensure_ascii=False).replace("</", "<\\/")
    t = sub1(r'<script type="application/ld\+json">\[.*?\]</script>',
             '<script type="application/ld+json">%s</script>' % ld_json, t, "ld")

    t = sub1(r'(<div class="ghero__badge">).*?(</div>)', r"\g<1>💀 CASE STUDY · %s\g<2>" % esc(f["category"]), t, "badge")
    t = sub1(r'(<div class="ghero__em">).*?(</div>)', r"\g<1>%s\g<2>" % esc(f.get("emoji") or "💀"), t, "emoji")
    t = sub1(r"<h1>.*?</h1>", "<h1>Why Did %s Fail?</h1>" % esc(f["name"]), t, "h1")
    t = sub1(r'(<p class="ghero__title">).*?(</p>)', r"\g<1>%s\g<2>" % esc(f["title"]), t, "subtitle")
    if "<span>YEAR</span>" not in t:
        t = t.replace('<div class="ghero__stat"><b>', '<div class="ghero__stat"><b>%s</b><span>YEAR</span></div>\n        <div class="ghero__stat"><b>' % esc(f["year"]), 1)
    t = sub1(r'(<div class="ghero__stat"><b>)[^<]*(</b><span>YEAR</span>)', r"\g<1>%s\g<2>" % esc(f["year"]), t, "year")
    t = sub1(r'(<div class="ghero__stat"><b>)[^<]*(</b><span>CAUSE</span>)', r"\g<1>☠️ %s\g<2>" % esc(f["category"]), t, "cause")
    t = sub1(r'(<div class="ghero__stat ghero__stat--loss"><b>)[^<]*(</b><span>THE BURN</span>)', r"\g<1>💸 %s\g<2>" % esc(f["loss"]), t, "loss")
    t = sub1(r"(<h2>📜 What Happened</h2>\s*<p>).*?(</p>)", r"\g<1>%s\g<2>" % esc(f.get("story") or ""), t, "story")
    t = sub1(r"(<h2>☠️ The Fatal Mistake</h2>\s*<p>).*?(</p>)", r"\g<1>%s\g<2>" % esc(f.get("mistake") or ""), t, "mistake")
    t = sub1(r"(<h2>🧠 The Lesson \(Free for You\)</h2>\s*<p>).*?(</p>)", r"\g<1>%s\g<2>" % esc(f.get("lesson") or ""), t, "lesson")

    cover = "../" + (b.get("cover") or "assets/og-image.png")
    t = sub1(r'<img class="gantidote__cover" src="[^"]*" alt="[^"]*"', '<img class="gantidote__cover" src="%s" alt="%s cover"' % (esc(cover), esc(b.get("title") or "")), t, "cover")
    info = ('<b>%s</b>\n          <small>%s · %s · %d lessons</small>\n          <p>%s</p>\n          <a class="gantidote__btn" href="../book.html?id=%s">📖 OPEN THE FULL INTERACTIVE BREAKDOWN →</a>'
            % (esc(b.get("title") or f.get("bookTitle") or ""), esc(b.get("author") or ""), esc(b.get("category") or ""), len(b.get("lessons") or []), esc(short(b.get("oneLiner") or "", 220)), esc(b.get("id") or f.get("book") or "")))
    t = sub1(r'(<div class="gantidote__info">).*?(</div>\s*</section>)', lambda m: m.group(1) + "\n          " + info + "\n        " + m.group(2), t, "antidote")

    fresh = B.grave_section(f, "../")
    span = re.compile(r"\s*<!-- tsb-seo413 -->.*?(?=\s*<section class=\"seoblock seocta\">)", re.S)
    t2, n = span.subn("\n" + fresh + "\n", t, count=1)
    if n != 1:
        raise SystemExit("injected block span not found in " + path)
    t = t2
    open(path, "w", encoding="utf-8").write(t)


def refresh_links(path):
    """Replace the injected 413+414 link blocks with one fresh block."""
    t = open(path, encoding="utf-8").read()
    fid = os.path.basename(path)[:-5]
    f = FAIL.get(fid)
    if not f:
        return False
    span = re.compile(r"\s*<!-- tsb-seo413 -->.*?(?=\s*<section class=\"seoblock seocta\">)", re.S)
    if not span.search(t):
        return False
    t = span.sub("\n" + B.grave_section(f, "../") + "\n", t, count=1)
    open(path, "w", encoding="utf-8").write(t)
    return True


def build_learning_topic_rich():
    terms = ["learn", "learning", "study", "memory", "skill", "mastery", "practice", "education", "knowledge", "read"]
    core = ["learn", "study", "memory", "mastery", "education", "skill"]
    scored = []
    for b in B.BOOKS:
        lesson_titles = " ".join(((l.get("title") or "") + " " + (l.get("chapter") or "")) for l in (b.get("lessons") or []))
        hay = ((b.get("oneLiner") or "") + " " + (b.get("tagline") or "") + " " + (b.get("bigIdea") or "") + " "
               + (b.get("category") or "") + " " + lesson_titles).lower()
        score = sum((3 if x in b["title"].lower() else 0) + min(hay.count(x), 3) for x in terms)
        if b["id"] in ("limitless", "art-of-learning", "ultralearning", "mastery-greene", "range", "peak-ericsson", "first-20-hours"):
            score += 5
        front = (b["title"] + " " + (b.get("oneLiner") or "") + " " + (b.get("tagline") or "")).lower()
        distinct = sum(1 for x in terms if x in hay)
        if score >= 5 and (any(x in front for x in core) or distinct >= 4):
            scored.append((-score, b["title"], b))
    scored.sort(key=lambda x: (x[0], x[1]))
    books = [x[2] for x in scored]
    cards, items = [], []
    for i, b in enumerate(books, 1):
        items.append({"@type": "ListItem", "position": i, "url": B.canonical_url("books/%s.html" % b["id"]), "name": b["title"]})
        cards.append('<a class="hubcard" href="../books/%s.html"><img src="../%s" alt="%s cover" loading="lazy" width="90" height="135"><span class="hubcard__m"><b>%s</b><i>%s · %s</i><em>%s</em><u>%s · %d lessons · small read</u></span></a>' % (b["id"], esc(b.get("cover") or ""), esc(b["title"]), esc(b["title"]), esc(b["author"]), esc(b["year"]), esc(short(b.get("oneLiner"), 150)), esc(b.get("readTime") or "8 min"), len(b.get("lessons") or [])))
    rel = "topics/learning.html"
    ld = [{"@context": "https://schema.org", "@type": "ItemList", "name": "Books on learning", "numberOfItems": len(books), "itemListElement": items}, B.breadcrumb_ld([("Library", B.BASE + "/"), ("Topics", B.canonical_url("topics/index.html")), ("Learning", B.canonical_url(rel))])]
    body = """  <main class="seopage"><div class="hubwrap"><header class="hubhead"><p class="hubcrumb"><a href="../index.html">Library</a> &rsaquo; Topics &rsaquo; Learning</p><h1>Everything on learning faster</h1><p>Learning is not collecting highlights. This shelf gathers the books that treat it as a trainable skill: attention, practice, memory, feedback and range. Each summary keeps the method and the first action, so a reading session can become a practice session today.</p><span class="hubpill">%d BOOKS · ALL FREE · AUDIO IN 26 LANGUAGES</span></header><div class="hublist">%s</div><section class="seoblock"><h2>Start here</h2><p>For a direct method, open <a href="../ask/learning.html">How do I learn anything faster?</a> For a ranked shelf, see <a href="../pseo/best-books-on/learning-fast.html">the best books on learning fast</a>. Then pick one book and use its first lesson before you buy another course.</p></section><div class="hubcta"><a href="../books/index.html">BROWSE ALL 650 BOOK SUMMARIES</a><p>Every summary free, with lessons and action steps.</p></div></div></main>""" % (len(books), "".join(cards))
    B.write(rel, B.page_shell(rel, "Books on Learning: %d Free Summaries on Learning Faster | TheSmallBook" % len(books), "Learn faster with %d free book summaries on memory, practice, skill building, focus and mastery. Simple English, Hindi and audio in the reader." % len(books), body, ld))
    return len(books)


def main():
    # move + rewrite the six renamed pages, rewrite theranos in place
    for old, new in RENAME.items():
        src = "graveyard/%s.html" % old
        dst = "graveyard/%s.html" % new
        if os.path.exists(src):
            os.rename(src, dst)
        rewrite_grave(dst, FAIL[new])
        print("renamed", old, "->", new)
    rewrite_grave("graveyard/theranos-board.html", FAIL["theranos-board"])
    print("rewrote theranos-board")

    # any other grave page still linking to a removed id gets fresh blocks
    stale = 0
    for name in os.listdir("graveyard"):
        if not name.endswith(".html"):
            continue
        p = os.path.join("graveyard", name)
        if name[:-5] in TOUCHED:
            continue
        t = open(p, encoding="utf-8").read()
        if any(("%s.html" % o) in t for o in RENAME):
            if refresh_links(p):
                stale += 1
    print("refreshed stale grave pages:", stale)

    B.build_causes()
    B.build_ask_pages()
    n_ask = len(B.ASK)
    idx = open("ask/index.html", encoding="utf-8").read()
    idx = idx.replace("83 questions", "%d questions" % n_ask).replace("All 83 questions", "All %d questions" % n_ask)
    idx = idx.replace("Ask the Library: 83 Real Questions", "Ask the Library: %d Real Questions" % n_ask)
    idx = idx.replace("83 real life questions", "%d real life questions" % n_ask)
    open("ask/index.html", "w", encoding="utf-8").write(idx)
    for dupe in ["become-confident", "become-leader", "overcome-fear", "find-purpose", "learn-fast"]:
        p = "ask/%s.html" % dupe
        if os.path.exists(p):
            os.remove(p)
    print("ask pages rebuilt:", n_ask)

    n_books = build_learning_topic_rich()
    print("learning shelf books:", n_books)

    sm = open("sitemap.xml", encoding="utf-8").read()
    for old, new in RENAME.items():
        sm = sm.replace("/graveyard/%s.html" % old, "/graveyard/%s.html" % new)
    for dupe in ["become-confident", "become-leader", "overcome-fear", "find-purpose", "learn-fast"]:
        sm = re.sub(r"\s*<url>\s*<loc>https://thesmallbook\.in/ask/%s\.html</loc>.*?</url>" % dupe, "", sm, flags=re.S)
    open("sitemap.xml", "w", encoding="utf-8").write(sm)
    print("sitemap locs:", sm.count("<loc>"))


if __name__ == "__main__":
    main()
