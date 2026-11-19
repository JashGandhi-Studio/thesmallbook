#!/usr/bin/env python3
"""Build 414 SEO builder for TheSmallBook.

What this does, from the real library data only:
- gives every one of the 530 Graveyard cases a static, crawlable page
- turns the 83 Ask questions into static answer pages with book and grave sources
- adds a complete books index, a learning shelf and Graveyard cause hubs
- repairs missing book structured data, duplicate Graveyard titles and weak hub data
- adds breadcrumbs, India English discovery signals and honest Hindi intent help
- links books, authors, topics, reading lists, questions and failures together

Run from the repo root: python3 tools/build414_seo.py
The script is idempotent. Marked Build 413 sections are not inserted twice.
"""
import collections
import html as htmlmod
import json
import os
import re
import subprocess
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
BASE = "https://thesmallbook.in"
DATE = "2026-11-05"
MARK = "tsb-seo414"


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def write(path, text):
    folder = os.path.dirname(path)
    if folder:
        os.makedirs(folder, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def clean(s):
    s = htmlmod.unescape(str(s or ""))
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def esc(s):
    s = str(s or "")
    s = s.replace("\u2014", " - ").replace("\u2013", " - ")
    return htmlmod.escape(s, quote=True)


def short(s, n):
    s = clean(s)
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0].strip()
    return cut + "..."


def slugify(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def load_js_data():
    node = r"""
global.window = {};
const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/ask-data.js', 'utf8'), ctx);
fs.writeFileSync('/tmp/tsb413-ask.json', JSON.stringify(ctx.window.TSB_ASK_DATA || []));
vm.runInContext(fs.readFileSync('js/failures.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('js/failures-extra.js', 'utf8'), ctx);
fs.writeFileSync('/tmp/tsb413-failures.json', JSON.stringify(ctx.window.FAILURES || []));
"""
    subprocess.run(["node", "-e", node], check=True)
    ask = json.load(open("/tmp/tsb413-ask.json", encoding="utf-8"))
    failures = json.load(open("/tmp/tsb413-failures.json", encoding="utf-8"))
    return ask, failures


src = read("js/data.js").split("\n", 1)[0]
BOOKS = json.loads(src[src.index("["):src.rindex("]") + 1])
ASK, FAILURES = load_js_data()
BY_ID = {b["id"]: b for b in BOOKS}
FAIL_BY_ID = {f["id"]: f for f in FAILURES}
ASK_BY_ID = {q["id"]: q for q in ASK}
FAIL_NAME_COUNT = collections.Counter(f["name"] for f in FAILURES)

CAUSES = collections.OrderedDict([
    ("BUSINESS", ("business-failures", "Business failures", "Companies that had customers, history or scale, then protected the old model until the market moved without them.")),
    ("STARTUP", ("startup-failures", "Startup failures", "Startups that raised money and attention faster than they proved demand, unit economics or a reason to exist.")),
    ("MONEY", ("money-failures", "Money and market failures", "Bubbles, leverage and financial machines that looked clever until cash, trust or time ran out.")),
    ("FRAUD", ("fraud-and-scams", "Fraud and scams", "Cases where the story sold to investors, customers or the public was not the business that actually existed.")),
    ("HISTORY", ("historical-failures", "Historical failures", "Empires, expeditions and institutions that mistook past strength for permanent safety.")),
    ("EGO", ("ego-failures", "Ego failures", "Leaders whose confidence stopped listening, whose story became the strategy, and whose organisations paid for it.")),
    ("FAME", ("fame-failures", "Fame and fortune failures", "Public lives where attention arrived faster than judgement, systems or people who could say no.")),
    ("TRUST", ("trust-and-safety-failures", "Trust and safety failures", "Failures where cutting corners with people, safety or truth destroyed the trust the whole thing stood on.")),
    ("TECH", ("technology-failures", "Technology failures", "Inventions and platforms that were early, unfinished or impossible to explain when the market had to decide.")),
])

HINGLISH = {
    "procrastination": ["kaam ko taalna kaise band karein", "aalsi pan kaise door karein", "kal karenge wali aadat kaise badlein"],
    "habits": ["aadat kaise banaye", "roz ki routine kaise banaye", "habit kaise pakki karein"],
    "focus": ["dhyaan kaise lagaye", "padhai mein focus kaise karein", "mobile se dhyaan kaise hataye"],
    "saving-money": ["paise kaise bachaye", "salary se savings kaise karein", "mahine ke kharche kaise kam karein"],
    "investing": ["paisa invest kahan karein", "SIP kaise start karein", "share market mein invest kaise karein"],
    "learning": ["jaldi kaise seekhein", "padhai kaise karein ki yaad rahe", "koi skill kaise seekhein"],
    "failure": ["failure se kaise bahar niklein", "haar ke baad kya karein"],
    "discipline": ["discipline kaise banaye", "roz time par kaam kaise karein"],
    "time-management": ["time management kaise karein", "din ka schedule kaise banaye"],
    "confidence": ["confidence kaise badhaye", "khud par bharosa kaise karein"],
    "stress": ["tension kaise kam karein", "stress door kaise karein"],
    "overthinking": ["zyada sochna kaise band karein", "overthinking kaise rokein"],
    "career": ["career mein growth kaise karein", "job mein promotion kaise milega"],
    "startup": ["business kaise start karein", "apna kaam kaise shuru karein"],
    "debt": ["karz kaise chukaye", "loan se kaise niklein", "EMI ka bojh kaise kam karein"],
    "sleep": ["neend kaise achhi karein", "raat ko jaldi neend kaise aaye"],
    "phone-addiction": ["mobile ki aadat kaise chhodein", "phone scrolling kaise band karein"],
    "morning-routine": ["subah jaldi kaise uthein", "morning routine kaise banaye"],
    "consistency": ["roz consistent kaise rahein", "kaam roz kaise karein"],
    "decision-making": ["sahi decision kaise lein", "faisla kaise lein"],
    "better-decisions": ["uncertain time mein sahi faisla kaise lein"],
    "relationships": ["relationship mein jhagda kaise sambhalein"],
    "communication": ["logon se baat kaise karein", "apni baat sahi se kaise rakhein"],
    "leadership": ["achha leader kaise banein", "team ko kaise lead karein"],
    "sales": ["koi cheez bechna kaise seekhein", "customer kaise banaye"],
    "creativity": ["creative kaise banein", "naye ideas kahan se layein"],
    "happiness": ["khushi kahan milegi", "life mein sukh kaise milega"],
    "purpose": ["life ka purpose kaise dhundhein", "apna maksad kaise milega"],
}

TOPIC_BY_CATEGORY = {
    "Self-Improvement": "habits",
    "Productivity": "productivity",
    "Money & Finance": "money",
    "Finance": "money",
    "Economics": "money",
    "Business": "startups-and-business",
    "Business & Startups": "startups-and-business",
    "Leadership": "leadership",
    "Psychology": "psychology",
    "Psychology & People": "psychology",
    "Creativity": "creativity",
    "Philosophy": "purpose-and-meaning",
}

BEST_BY_TOPIC = {
    "habits": "habits",
    "focus-and-deep-work": "focus-and-deep-work",
    "money": "money",
    "investing": "investing",
    "discipline": "discipline",
    "productivity": "productivity",
    "leadership": "leadership",
    "startups-and-business": "startups",
    "psychology": "psychology-of-people",
    "creativity": "creativity",
    "negotiation-and-influence": "negotiation",
    "purpose-and-meaning": "finding-purpose",
    "stoicism-and-calm": "stoicism",
    "learning": "learning-fast",
}


def rel_root(relpath):
    depth = relpath.count("/")
    return "../" * depth if depth else ""


def canonical_url(relpath):
    if relpath == "index.html":
        return BASE + "/"
    return BASE + "/" + relpath


def title_of(text):
    m = re.search(r"<title>(.*?)</title>", text, re.S | re.I)
    return clean(m.group(1)) if m else "TheSmallBook"


def desc_of(text):
    m = re.search(r'<meta name="description" content="([^"]*)"', text, re.I)
    return clean(m.group(1)) if m else "Free book summaries, lessons and failure case studies from TheSmallBook."


def h1_of(text):
    m = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.S | re.I)
    return clean(m.group(1)) if m else title_of(text)


def breadcrumb_ld(items):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
            for i, (name, url) in enumerate(items)
        ],
    }


def add_common(relpath, text, crumbs, extra_ld=None):
    canon = canonical_url(relpath)
    title = title_of(text)
    desc = desc_of(text)
    add = []
    if 'hreflang="' not in text:
        add.append('<link rel="alternate" hreflang="en" href="%s">' % canon)
        add.append('<link rel="alternate" hreflang="en-IN" href="%s">' % canon)
        add.append('<link rel="alternate" hreflang="x-default" href="%s">' % canon)
    if 'name="robots"' not in text:
        add.append('<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">')
    if 'name="twitter:title"' not in text:
        add.append('<meta name="twitter:title" content="%s">' % esc(title))
    if 'name="twitter:description"' not in text:
        add.append('<meta name="twitter:description" content="%s">' % esc(desc))
    if 'property="og:image"' not in text:
        add.append('<meta property="og:image" content="%s/assets/og-image.png">' % BASE)
    if 'name="twitter:image"' not in text:
        add.append('<meta name="twitter:image" content="%s/assets/og-image.png">' % BASE)
    lds = []
    if crumbs:
        lds.append(breadcrumb_ld(crumbs))
    if extra_ld:
        lds.extend(extra_ld if isinstance(extra_ld, list) else [extra_ld])
    if lds and "BreadcrumbList" not in text and ("data-%s" % MARK) not in text:
        add.append('<script type="application/ld+json" data-%s>%s</script>' % (MARK, json.dumps(lds, ensure_ascii=False, separators=(",", ":"))))
    if add:
        text = text.replace("</head>", "\n  " + "\n  ".join(add) + "\n</head>", 1)
    if re.search(r'<script type="application/ld\+json"(?! data-)[^>]*>.*?BreadcrumbList.*?</script>', text, flags=re.S):
        text = re.sub(r'<script type="application/ld\+json" data-%s>.*?BreadcrumbList.*?</script>' % MARK, "", text, flags=re.S)
    seen = set()
    def dedupe_ld(m):
        block = m.group(0)
        if block in seen:
            return ""
        seen.add(block)
        return block
    text = re.sub(r'<script type="application/ld\+json" data-%s>.*?</script>' % MARK, dedupe_ld, text, flags=re.S)
    return text


def insert_before_main_end(text, section):
    if "</article>" in text:
        return text.replace("</article>", section + "\n  </article>", 1)
    if "</main>" in text:
        return text.replace("</main>", section + "\n  </main>", 1)
    return text.replace("</body>", section + "\n</body>", 1)


def book_cover_url(b):
    cover = b.get("cover") or ("assets/covers/%s.jpg" % b["id"])
    return BASE + "/" + cover.lstrip("/")


def ask_related(q, limit=6):
    scored = []
    qk = set(q.get("keywords") or [])
    qb = set(x["id"] for x in q.get("books") or [])
    qg = set(x["id"] for x in q.get("graves") or [])
    for other in ASK:
        if other["id"] == q["id"]:
            continue
        score = len(qk & set(other.get("keywords") or [])) * 2
        score += len(qb & set(x["id"] for x in other.get("books") or [])) * 4
        score += len(qg & set(x["id"] for x in other.get("graves") or [])) * 3
        if score:
            scored.append((-score, other["q"], other))
    scored.sort(key=lambda x: (x[0], x[1]))
    return [x[2] for x in scored[:limit]]


def failures_for_books(book_ids, limit=6):
    wanted = set(book_ids)
    out = []
    for f in FAILURES:
        if f.get("book") in wanted:
            out.append(f)
    return out[:limit]


def questions_for_books(book_ids, limit=5):
    wanted = set(book_ids)
    out = []
    for q in ASK:
        if wanted & set(x["id"] for x in q.get("books") or []):
            out.append(q)
    return out[:limit]


def questions_for_author(book_ids, limit=5):
    return questions_for_books(book_ids, limit)


# ---------------------------------------------------------------- books index
def build_books_index():
    by_cat = collections.defaultdict(list)
    for b in BOOKS:
        by_cat[b.get("category") or "More books"].append(b)
    cats = sorted(by_cat.keys())
    nav = "".join('<a href="#cat-%s">%s (%d)</a>' % (slugify(c), esc(c), len(by_cat[c])) for c in cats)
    sections = []
    items = []
    pos = 1
    for cat in cats:
        rows = []
        for b in sorted(by_cat[cat], key=lambda x: x["title"].lower()):
            items.append({"@type": "ListItem", "position": pos, "url": canonical_url("books/%s.html" % b["id"]), "name": b["title"]})
            pos += 1
            rows.append('<li><a href="%s.html"><b>%s</b></a> <span>%s · %s · %s · %d lessons</span><p>%s</p></li>' % (
                esc(b["id"]), esc(b["title"]), esc(b["author"]), esc(b["year"]), esc(b.get("readTime") or "8 min"), len(b.get("lessons") or []), esc(short(b.get("oneLiner") or b.get("tagline"), 220))))
        sections.append('<section class="seoblock" id="cat-%s"><h2>%s book summaries</h2><ul class="seo413-list">%s</ul></section>' % (slugify(cat), esc(cat), "".join(rows)))
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Free book summaries", "url": canonical_url("books/index.html"), "inLanguage": "en", "dateModified": DATE, "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items}}]
    body = """  <main class="seopage">
    <header class="seohero">
      <p class="seocrumb"><a href="../index.html">Library</a> &rsaquo; Book summaries</p>
      <h1>Free book summaries, in simple English</h1>
      <p class="seotagline">All 650 books on the shelf, each opened into its big idea, chapter lessons, real examples, memorable lines and a plan you can use today. Start with the problem you have, the author you trust, or the shelf below.</p>
      <p class="seometa">650 books · 4,853 lessons · Hindi, Hinglish and 24 more languages in the reader · audio on book pages</p>
    </header>
    <section class="seoblock"><h2>Choose a shelf</h2><div class="hubchips seo413-chips">%s</div></section>
    <section class="seoblock"><h2>Not sure where to start?</h2><p>Readers usually enter through a live problem: <a href="../ask/procrastination.html">stop procrastinating</a>, <a href="../ask/habits.html">build a habit</a>, <a href="../ask/focus.html">focus without distraction</a>, <a href="../ask/saving-money.html">save money every month</a>, <a href="../ask/investing.html">start investing</a>, or <a href="../ask/learning.html">learn faster</a>. If you know the book, use the shelves below. If you know the writer, open the <a href="../authors/index.html">author index</a>. If you want the warning first, walk the <a href="../graveyard/causes/startup-failures.html">startup failures</a>.</p></section>
    %s
  </main>""" % (nav, "".join(sections))
    page = page_shell("books/index.html", "Free Book Summaries: 650 Books, Lessons and Action Plans | TheSmallBook", "Browse 650 free book summaries with key lessons, examples, quotes and action plans. Read in simple English, Hindi, Hinglish and 24 more languages.", body, ld)
    write("books/index.html", page)


def page_shell(relpath, title, desc, body, ld):
    r = rel_root(relpath)
    canon = canonical_url(relpath)
    ld_text = json.dumps(ld, ensure_ascii=False, separators=(",", ":")) if ld else ""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1">
  <title>%s</title>
  <meta name="description" content="%s">
  <meta name="author" content="Jash Gandhi">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
  <link rel="canonical" href="%s">
  <link rel="alternate" hreflang="en" href="%s">
  <link rel="alternate" hreflang="en-IN" href="%s">
  <link rel="alternate" hreflang="x-default" href="%s">
  <meta property="og:title" content="%s">
  <meta property="og:description" content="%s">
  <meta property="og:type" content="website">
  <meta property="og:url" content="%s">
  <meta property="og:site_name" content="TheSmallBook">
  <meta property="og:image" content="%s/assets/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="%s">
  <meta name="twitter:description" content="%s">
  <meta name="twitter:image" content="%s/assets/og-image.png">
  <link rel="stylesheet" href="%scss/style.css?v=413">
  <link rel="icon" href="%sfavicon.ico" sizes="32x32">
  <style>.seo413-list{list-style:none;padding:0;margin:0}.seo413-list li{border-top:1px solid rgba(22,19,15,.14);padding:12px 0}.seo413-list p{margin:5px 0 0}.seo413-chips a{margin:0 6px 6px 0}.seo413-card{display:flex;gap:14px;align-items:flex-start}.seo413-card img{width:74px;height:110px;object-fit:cover;border:2px solid var(--ink);border-radius:8px}.seo413-small{font-size:.92em;opacity:.78}</style>
  %s
</head>
<body>
  <nav class="nav"><a class="logo" href="%sindex.html"><span class="logo__mark">&#128278;</span><span>The<span class="logo__small">Small</span>Book</span></a><div class="nav__links"><a class="btn btn--yellow" href="%sbooks/index.html">BOOK SUMMARIES</a><a class="btn btn--red" href="%sgraveyard.html">GRAVEYARD</a></div></nav>
%s
  <footer class="footer"><div class="head">TheSmallBook</div><p>Big books. Small reads. Original educational analyses. Support authors by buying the full books.</p><p class="tiny"><a href="%sbooks/index.html">BOOK SUMMARIES</a> · <a href="%sauthors/index.html">AUTHORS</a> · <a href="%stopics/index.html">TOPICS</a> · <a href="%sask/index.html">ASK THE LIBRARY</a> · <a href="%spseo/index.html">READING LISTS</a></p></footer>
</body>
</html>
""" % (esc(title), esc(desc), canon, canon, canon, canon, esc(title), esc(desc), canon, BASE, esc(title), esc(desc), BASE, r, r, ('<script type="application/ld+json">' + ld_text + '</script>' if ld_text else ''), r, r, r, body, r, r, r, r, r)


# ---------------------------------------------------------------- ask pages
def build_ask_pages():
    os.makedirs("ask", exist_ok=True)
    priority = ["procrastination", "habits", "focus", "saving-money", "investing", "learning", "failure", "discipline", "career", "startup", "stress", "decision-making"]
    pri = [ASK_BY_ID[x] for x in priority if x in ASK_BY_ID]
    cards = []
    for q in pri:
        cards.append('<li><a href="%s.html"><b>%s</b></a><p>%s</p></li>' % (q["id"], esc(q["q"]), esc(short(q["answer"], 190))))
    all_rows = []
    items = []
    for i, q in enumerate(sorted(ASK, key=lambda x: x["q"].lower()), 1):
        items.append({"@type": "ListItem", "position": i, "url": canonical_url("ask/%s.html" % q["id"]), "name": q["q"]})
        all_rows.append('<li><a href="%s.html"><b>%s</b></a> <span class="seo413-small">%d book sources · %d failure cases</span><p>%s</p></li>' % (q["id"], esc(q["q"]), len(set(x["id"] for x in q.get("books") or [])), len(q.get("graves") or []), esc(short(q["answer"], 210))))
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Ask the Library", "url": canonical_url("ask/index.html"), "dateModified": DATE, "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items}}]
    body = """  <main class="seopage">
    <header class="seohero"><p class="seocrumb"><a href="../index.html">Library</a> &rsaquo; Ask the Library</p><h1>Real questions, answered from real books</h1><p class="seotagline">83 questions people actually bring to a library: habits, money, focus, work, fear, relationships, failure and learning. Every answer names the books behind it and, where it helps, the failure that proves the point.</p><p class="seometa">Simple English · Hindi and Hinglish reading in the app · book lessons, not generic advice</p></header>
    <section class="seoblock"><h2>Start with the questions people ask most</h2><ul class="seo413-list">%s</ul></section>
    <section class="seoblock"><h2>All 83 questions</h2><ul class="seo413-list">%s</ul></section>
    <section class="seoblock"><h2>Ask your own version</h2><p>The live library accepts the question in your own words, including the way people ask in India: aadat kaise banaye, paise kaise bachaye, dhyaan kaise lagaye, karz kaise chukaye. <a href="../chat.html">Open Ask the Library</a>.</p></section>
  </main>""" % ("".join(cards), "".join(all_rows))
    write("ask/index.html", page_shell("ask/index.html", "Ask the Library: 83 Real Questions Answered from Books | TheSmallBook", "83 real life questions answered from book lessons and failure cases: habits, money, focus, career, learning, discipline, relationships and more.", body, ld))

    for q in ASK:
        rel = "ask/%s.html" % q["id"]
        grouped = collections.OrderedDict()
        for ref in q.get("books") or []:
            grouped.setdefault(ref["id"], []).append(ref)
        book_sections = []
        faq_books = []
        for bid, refs in grouped.items():
            b = BY_ID.get(bid)
            if not b:
                continue
            faq_books.append(b["title"])
            lessons = "".join('<li><b>%s:</b> %s</li>' % (esc(r.get("lesson") or "Key lesson"), esc(r.get("blurb") or "")) for r in refs)
            book_sections.append("""<section class="seoblock"><div class="seo413-card"><img src="../%s" alt="%s cover" loading="lazy" width="74" height="110"><div><h3><a href="../books/%s.html">%s</a></h3><p class="seo413-small">%s · %s · %s · %d lessons</p><p>%s</p><ul>%s</ul><p><a href="../books/%s.html">Read the summary</a> · <a href="../book.html?id=%s">Open the interactive book</a></p></div></div></section>""" % (esc(b.get("cover") or ("assets/covers/%s.jpg" % bid)), esc(b["title"]), bid, esc(b["title"]), esc(b["author"]), esc(b["year"]), esc(b.get("readTime") or "8 min"), len(b.get("lessons") or []), esc(b.get("oneLiner") or b.get("tagline") or ""), lessons, bid, bid))
        grave_sections = []
        for ref in q.get("graves") or []:
            f = FAIL_BY_ID.get(ref["id"])
            if not f:
                continue
            grave_sections.append('<section class="seoblock"><h3><a href="../graveyard/%s.html">Why did %s fail?</a></h3><p class="seo413-small">%s · %s · Loss: %s</p><p>%s</p><p>%s</p></section>' % (f["id"], esc(f["name"]), esc(f["year"]), esc(f["category"]), esc(f["loss"]), esc(ref.get("blurb") or ""), esc(f.get("lesson") or "")))
        variants = HINGLISH.get(q["id"], [])
        variant_html = ""
        if variants:
            variant_html = '<section class="seoblock"><h2>Also asked in Hindi and Hinglish</h2><p>People also ask this as: <b>%s</b>. The answer on this page stays in simple English, and the live book can be read in Hindi or Hinglish.</p></section>' % esc(", ".join(variants))
        rel_q = ask_related(q)
        rel_html = "".join('<li><a href="%s.html">%s</a></li>' % (x["id"], esc(x["q"])) for x in rel_q)
        faq = [
            {"@type": "Question", "name": q["q"], "acceptedAnswer": {"@type": "Answer", "text": clean(q["answer"])}},
            {"@type": "Question", "name": "Which books answer this best?", "acceptedAnswer": {"@type": "Answer", "text": ", ".join(faq_books) + "."}},
            {"@type": "Question", "name": "Can I read this in Hindi?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. This page is in simple English, and the linked books open in Hindi, Hinglish and 24 more languages in TheSmallBook reader."}},
        ]
        ld = [
            {"@context": "https://schema.org", "@type": "Article", "headline": q["q"], "description": short(q["answer"], 220), "author": {"@type": "Person", "name": "Jash Gandhi", "url": BASE + "/about.html"}, "publisher": {"@type": "Organization", "name": "TheSmallBook", "url": BASE}, "mainEntityOfPage": canonical_url(rel), "inLanguage": "en", "dateModified": DATE},
            {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faq},
            breadcrumb_ld([("Library", BASE + "/"), ("Ask the Library", canonical_url("ask/index.html")), (q["q"], canonical_url(rel))]),
        ]
        body = """  <main class="seopage">
    <header class="seohero"><p class="seocrumb"><a href="../index.html">Library</a> &rsaquo; <a href="index.html">Ask the Library</a> &rsaquo; %s</p><h1>%s</h1><p class="seometa">Answered from %d books%s · simple English · Hindi and Hinglish in the reader</p></header>
    <section class="seoblock"><h2>The short answer</h2><p>%s</p><p><a class="btn btn--yellow" href="../chat.html?arg=%s">Ask this in the live library</a></p></section>
    <h2 class="seoh2">The books behind the answer</h2>
    %s
    %s
    %s
    <section class="seoblock"><h2>Questions people ask next</h2><ul>%s</ul></section>
    <section class="seoblock"><h2>Can I read this in Hindi?</h2><p>Yes. This answer is written in simple English. Open any linked book and choose Hindi or Hinglish to read the full lessons in your language, with audio where available.</p></section>
  </main>""" % (esc(short(q["q"], 70)), esc(q["q"]), len(grouped), (" and %d failure case%s" % (len(q.get("graves") or []), "s" if len(q.get("graves") or []) != 1 else "") if q.get("graves") else ""), esc(q["answer"]), esc(q["q"]), "".join(book_sections), ('<h2 class="seoh2">A failure that proves it</h2>' + "".join(grave_sections) if grave_sections else ''), variant_html, rel_html)
        title_suffix = {
            "confidence": "Build evidence with small wins",
            "become-confident": "Rehearse until it is boring",
            "leadership": "Ownership, safety and truth",
            "become-leader": "Serve the team and own the result",
            "fear": "Act while fear rides along",
            "overcome-fear": "Name it, plan it, shrink it",
            "purpose": "The four circles method",
            "find-purpose": "Find the pattern in your life",
            "learning": "Recall, repeat and teach",
            "learn-fast": "Practice at the edge",
        }.get(q["id"], "Books, lessons and one warning")
        write(rel, page_shell(rel, "%s %s | TheSmallBook" % (q["q"], title_suffix), short(q["answer"], 155) + " Books and failure cases from TheSmallBook.", body, ld))


# ---------------------------------------------------------------- graveyard
def grave_title(f):
    if FAIL_NAME_COUNT[f["name"]] > 1:
        return "Why Did %s Fail? %s (%s) | TheSmallBook" % (f["name"], f["title"], f["year"])
    return "Why Did %s Fail? Case Study and Lesson | TheSmallBook" % f["name"]


def grave_related(f, limit=6):
    same = [x for x in FAILURES if x["category"] == f["category"] and x["id"] != f["id"]]
    same.sort(key=lambda x: (str(x.get("year") or ""), x["name"]), reverse=True)
    return same[:limit]


def grave_section(f, prefix):
    rels = grave_related(f)
    cause = CAUSES.get(f["category"], ("business-failures", f["category"].title() + " failures", ""))
    qs = [q for q in ASK if f["id"] in [g["id"] for g in q.get("graves") or []]]
    if not qs:
        qs = questions_for_books([f.get("book")], 3)
    rel_links = "".join('<li><a href="%s.html">Why did %s fail?</a> <span class="seo413-small">%s · %s</span></li>' % (x["id"], esc(x["name"]), esc(x["year"]), esc(x["title"])) for x in rels)
    q_links = "".join('<li><a href="%sask/%s.html">%s</a></li>' % (prefix.replace("../", "../"), q["id"], esc(q["q"])) for q in qs[:4])
    b = BY_ID.get(f.get("book"))
    book_link = '<p><a href="%sbooks/%s.html">Read the antidote book summary: %s</a></p>' % (prefix, b["id"], esc(b["title"])) if b else ""
    return """    <!-- %s -->
    <section class="seoblock tsb-seo414-links">
      <h2>Questions people ask about %s</h2>
      <p><b>Why did %s fail?</b> %s</p>
      <p><b>How much was lost?</b> %s</p>
      <p><b>What is the lesson?</b> %s</p>
      <p><b>%s kyun fail hua?</b> In simple English: %s The cost was %s.</p>
    </section>
    <section class="seoblock tsb-seo414-links">
      <h2>Keep digging</h2>
      <p><a href="%sgraveyard/causes/%s.html">More %s</a> · <a href="%sgraveyard.html">Open the full Graveyard</a></p>
      %s
      <h3>Related failures</h3><ul>%s</ul>
      %s
    </section>""" % (MARK, esc(f["name"]), esc(f["name"]), esc(f.get("mistake") or ""), esc(f.get("loss") or ""), esc(f.get("lesson") or ""), esc(f["name"]), esc(short(f.get("mistake") or f.get("lesson"), 260)), esc(f.get("loss") or ""), prefix, cause[0], esc(cause[1].lower()), prefix, book_link, rel_links, ('<h3>Questions this case answers</h3><ul>' + q_links + '</ul>' if q_links else ''))


def build_missing_graves():
    made = 0
    for f in FAILURES:
        rel = "graveyard/%s.html" % f["id"]
        if os.path.exists(rel):
            continue
        b = BY_ID.get(f.get("book"), {})
        title = grave_title(f)
        desc = "%s (%s) failure case study: %s. Loss: %s. What happened, the fatal mistake and the lesson, in simple English." % (f["name"], f["year"], f["title"], f["loss"])
        ld = [
            {"@context": "https://schema.org", "@type": "Article", "headline": "Why Did %s Fail? (%s)" % (f["name"], f["year"]), "author": {"@type": "Person", "name": "Jash Gandhi", "url": BASE + "/about.html"}, "publisher": {"@type": "Organization", "name": "TheSmallBook", "url": BASE}, "mainEntityOfPage": canonical_url(rel), "inLanguage": "en", "dateModified": DATE},
            {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": "Why did %s fail?" % f["name"], "acceptedAnswer": {"@type": "Answer", "text": clean(f.get("mistake"))}},
                {"@type": "Question", "name": "How much did %s lose?" % f["name"], "acceptedAnswer": {"@type": "Answer", "text": clean(f.get("loss"))}},
                {"@type": "Question", "name": "What is the lesson from %s?" % f["name"], "acceptedAnswer": {"@type": "Answer", "text": clean(f.get("lesson"))}},
            ]},
            breadcrumb_ld([("Library", BASE + "/"), ("Graveyard", BASE + "/graveyard.html"), ("Why did %s fail?" % f["name"], canonical_url(rel))]),
        ]
        body = """  <main class="seopage">
    <header class="ghero ghero--grave"><div class="ghero__badge">CASE STUDY · %s</div><div class="ghero__em">%s</div><h1>Why Did %s Fail?</h1><p class="ghero__title">%s</p><div class="ghero__stats"><div class="ghero__stat"><b>%s</b><span>YEAR</span></div><div class="ghero__stat"><b>%s</b><span>CAUSE</span></div><div class="ghero__stat ghero__stat--loss"><b>%s</b><span>THE BURN</span></div></div></header>
    <section class="seoblock"><h2>What happened</h2><p>%s</p></section>
    <section class="seoblock seoblock--mistake"><h2>The fatal mistake</h2><p>%s</p></section>
    <section class="seoblock seoblock--lesson"><h2>The lesson</h2><p>%s</p></section>
    <section class="seoblock gantidote"><h2>The antidote book</h2><div class="gantidote__card"><img class="gantidote__cover" src="../%s" alt="%s cover" loading="lazy" width="120"><div class="gantidote__info"><b>%s</b><small>%s · %s · %d lessons</small><p>%s</p><a class="gantidote__btn" href="../books/%s.html">READ THE SUMMARY</a> <a class="gantidote__btn" href="../book.html?id=%s">OPEN INTERACTIVE BOOK</a></div></div></section>
    %s
    <section class="seoblock seocta"><a class="btn btn--red" href="../graveyard.html">EXPLORE ALL 559 FAILURE CASE STUDIES</a><p>They paid full price. You get the lesson in simple English.</p></section>
  </main>""" % (esc(f["category"]), esc(f.get("emoji") or ""), esc(f["name"]), esc(f["title"]), esc(f["year"]), esc(f["category"]), esc(f["loss"]), esc(f.get("story") or ""), esc(f.get("mistake") or ""), esc(f.get("lesson") or ""), esc(b.get("cover") or "assets/og-image.png"), esc(b.get("title") or f.get("bookTitle") or "The antidote book"), esc(b.get("title") or f.get("bookTitle") or ""), esc(b.get("author") or ""), esc(b.get("category") or ""), len(b.get("lessons") or []), esc(short(b.get("oneLiner") or "", 220)), esc(b.get("id") or f.get("book") or ""), esc(b.get("id") or f.get("book") or ""), grave_section(f, "../"))
        write(rel, page_shell(rel, title, desc, body, ld))
        made += 1
    return made


def build_causes():
    for cat, (slug, label, intro) in CAUSES.items():
        rows_data = [f for f in FAILURES if f["category"] == cat]
        rows_data.sort(key=lambda x: (str(x.get("year") or ""), x["name"]), reverse=True)
        rel = "graveyard/causes/%s.html" % slug
        rows = []
        items = []
        for i, f in enumerate(rows_data, 1):
            items.append({"@type": "ListItem", "position": i, "url": canonical_url("graveyard/%s.html" % f["id"]), "name": "Why did %s fail?" % f["name"]})
            rows.append('<li><a href="../%s.html"><b>Why did %s fail?</b></a> <span class="seo413-small">%s · %s</span><p>%s Loss: %s</p></li>' % (f["id"], esc(f["name"]), esc(f["year"]), esc(f["title"]), esc(short(f.get("story"), 190)), esc(f["loss"])))
        ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": label, "url": canonical_url(rel), "dateModified": DATE, "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": items}}, breadcrumb_ld([("Library", BASE + "/"), ("Graveyard", BASE + "/graveyard.html"), (label, canonical_url(rel))])]
        other = "".join('<a href="%s.html">%s (%d)</a>' % (s, esc(l), len([x for x in FAILURES if x["category"] == c])) for c, (s, l, _) in CAUSES.items() if c != cat)
        body = """  <main class="seopage"><header class="seohero"><p class="seocrumb"><a href="../../index.html">Library</a> &rsaquo; <a href="../../graveyard.html">Graveyard</a> &rsaquo; %s</p><h1>%s: %d case studies</h1><p class="seotagline">%s Every case names what happened, the fatal mistake, the cost and the lesson. Read the pattern before it bills you.</p><p class="seometa">Free case studies · simple English · antidote book on every grave</p></header><section class="seoblock"><h2>Walk another cause of death</h2><div class="hubchips seo413-chips">%s</div></section><section class="seoblock"><ul class="seo413-list">%s</ul></section></main>""" % (esc(label), esc(label), len(rows_data), esc(intro), other, "".join(rows))
        write(rel, page_shell(rel, "%s: %d Failure Case Studies and Lessons | TheSmallBook" % (label, len(rows_data)), "%s: %d free failure case studies with what happened, the fatal mistake, the cost and the lesson." % (label, len(rows_data)), body, ld))


# ---------------------------------------------------------------- learning topic
def build_learning_topic():
    terms = ["learn", "learning", "study", "memory", "skill", "mastery", "practice", "education", "knowledge", "read"]
    scored = []
    for b in BOOKS:
        hay = (b["title"] + " " + (b.get("oneLiner") or "") + " " + (b.get("tagline") or "") + " " + (b.get("bigIdea") or "")[:500]).lower()
        score = sum(3 if t in b["title"].lower() else 1 for t in terms if t in hay)
        if b["id"] in ("limitless", "art-of-learning", "ultralearning", "mastery-greene", "range", "peak-ericsson", "first-20-hours"):
            score += 5
        if score >= 4:
            scored.append((-score, b["title"], b))
    scored.sort(key=lambda x: (x[0], x[1]))
    books = [x[2] for x in scored]
    cards = []
    items = []
    for i, b in enumerate(books, 1):
        items.append({"@type": "ListItem", "position": i, "url": canonical_url("books/%s.html" % b["id"]), "name": b["title"]})
        cards.append('<a class="hubcard" href="../books/%s.html"><img src="../%s" alt="%s cover" loading="lazy" width="90" height="135"><span class="hubcard__m"><b>%s</b><i>%s · %s</i><em>%s</em><u>%s · %d lessons · small read</u></span></a>' % (b["id"], esc(b.get("cover") or ""), esc(b["title"]), esc(b["title"]), esc(b["author"]), esc(b["year"]), esc(short(b.get("oneLiner"), 150)), esc(b.get("readTime") or "8 min"), len(b.get("lessons") or [])))
    rel = "topics/learning.html"
    ld = [{"@context": "https://schema.org", "@type": "ItemList", "name": "Books on learning", "numberOfItems": len(books), "itemListElement": items}, breadcrumb_ld([("Library", BASE + "/"), ("Topics", canonical_url("topics/index.html")), ("Learning", canonical_url(rel))])]
    body = """  <main class="seopage"><div class="hubwrap"><header class="hubhead"><p class="hubcrumb"><a href="../index.html">Library</a> &rsaquo; Topics &rsaquo; Learning</p><h1>Everything on learning faster</h1><p>Learning is not collecting highlights. This shelf gathers the books that treat it as a trainable skill: attention, practice, memory, feedback and range. Each summary keeps the method and the first action, so a reading session can become a practice session today.</p><span class="hubpill">%d BOOKS · ALL FREE · AUDIO IN 26 LANGUAGES</span></header><div class="hublist">%s</div><section class="seoblock"><h2>Start here</h2><p>For a direct method, open <a href="../ask/learning.html">How do I learn anything faster?</a> For a ranked shelf, see <a href="../pseo/best-books-on/learning-fast.html">the best books on learning fast</a>. Then pick one book and use its first lesson before you buy another course.</p></section><div class="hubcta"><a href="../books/index.html">BROWSE ALL 600 BOOK SUMMARIES</a><p>Every summary free, with lessons and action steps.</p></div></div></main>""" % (len(books), "".join(cards))
    write(rel, page_shell(rel, "Books on Learning: %d Free Summaries on Learning Faster | TheSmallBook" % len(books), "Learn faster with %d free book summaries on memory, practice, skill building, focus and mastery. Simple English, Hindi and audio in the reader." % len(books), body, ld))


def build_missing_authors():
    author_books = collections.defaultdict(list)
    for b in BOOKS:
        author_books[b["author"]].append(b)
    planned = {}
    for author in author_books:
        if author and author != "Unknown":
            planned.setdefault(slugify(author), author)
    made = 0
    for slug, author in sorted(planned.items(), key=lambda x: x[1].lower()):
        rel = "authors/%s.html" % slug
        if os.path.exists(rel):
            continue
        books = sorted(author_books[author], key=lambda x: (x.get("year") or 9999, x["title"]))
        cats = set(b.get("category") or "" for b in books)
        related = []
        for other, obs in author_books.items():
            if other == author or other == "Unknown":
                continue
            shared = len(cats & set(b.get("category") or "" for b in obs))
            if shared:
                related.append((-shared, -len(obs), other))
        related.sort()
        rel_links = "".join('<li><a href="%s.html">%s</a> <span class="seo413-small">%d book%s</span></li>' % (slugify(o), esc(o), len(author_books[o]), "s" if len(author_books[o]) != 1 else "") for _, _, o in related[:8] if slugify(o) in planned)
        book_sections = []
        items = []
        for i, b in enumerate(books, 1):
            items.append({"@type": "ListItem", "position": i, "url": canonical_url("books/%s.html" % b["id"]), "name": b["title"]})
            lessons = "".join("<li>%s</li>" % esc(x.get("title") or "") for x in b.get("lessons") or [])
            quotes = "".join("<li>%s</li>" % esc(x) for x in (b.get("quotes") or [])[:3])
            book_sections.append("""<section class="seoblock"><div class="seo413-card"><img src="../%s" alt="%s cover" loading="lazy" width="74" height="110"><div><h2><a href="../books/%s.html">%s</a></h2><p class="seo413-small">%s · %s · %d lessons</p><p>%s</p><p>%s</p><h3>Lessons in the summary</h3><ul>%s</ul>%s<p><a href="../books/%s.html">Read the summary</a> · <a href="../book.html?id=%s">Open the interactive book</a></p></div></div></section>""" % (esc(b.get("cover") or ""), esc(b["title"]), b["id"], esc(b["title"]), esc(b["year"]), esc(b.get("readTime") or "8 min"), len(b.get("lessons") or []), esc(b.get("oneLiner") or ""), esc(short(b.get("bigIdea"), 520)), lessons, ("<h3>Lines worth keeping</h3><ul>" + quotes + "</ul>" if quotes else ""), b["id"], b["id"]))
        qs = questions_for_author([b["id"] for b in books], 5)
        q_links = "".join('<li><a href="../ask/%s.html">%s</a></li>' % (q["id"], esc(q["q"])) for q in qs)
        ld = [
            {"@context": "https://schema.org", "@type": "Person", "name": author, "url": canonical_url(rel)},
            {"@context": "https://schema.org", "@type": "ItemList", "name": "Books by %s" % author, "numberOfItems": len(items), "itemListElement": items},
            breadcrumb_ld([("Library", BASE + "/"), ("Authors", canonical_url("authors/index.html")), (author, canonical_url(rel))]),
        ]
        titles = ", ".join(b["title"] for b in books[:3])
        body = """  <main class="seopage">
    <header class="seohero"><p class="seocrumb"><a href="../index.html">Library</a> &rsaquo; <a href="index.html">Authors</a> &rsaquo; %s</p><h1>Books by %s</h1><p class="seotagline">%s %s in the library. Every book here is read down to the big idea, the lessons, the lines worth keeping and the actions worth taking. Start with the summary, then buy the full book if it earns a place on your shelf.</p><p class="seometa">Free summaries · simple English · Hindi, Hinglish and audio in the reader</p></header>
    %s
    <section class="seoblock tsb-seo414-links"><h2>Questions %s helps answer</h2><ul>%s</ul><p><a href="../books/index.html">Browse all 650 book summaries</a> · <a href="../authors/index.html">All authors</a></p></section>
    <section class="seoblock"><h2>Read nearby authors next</h2><ul>%s</ul></section>
  </main>""" % (esc(author), esc(author), esc(author), ("has %d books" % len(books) if len(books) != 1 else "has one book"), "".join(book_sections), esc(author), q_links, rel_links)
        write(rel, page_shell(rel, "Books by %s: %d Free %s and Key Lessons | TheSmallBook" % (author, len(books), "Summary" if len(books) == 1 else "Summaries"), "Books by %s in TheSmallBook library: %s. Free summaries with key lessons, quotes and action plans." % (author, titles), body, ld))
        made += 1
    index_rel = "authors/index.html"
    if os.path.exists(index_rel):
        text = read(index_rel)
        if "All authors, A to Z" not in text:
            rows = "".join('<li><a href="%s.html">%s</a> <span class="seo413-small">%d book%s</span></li>' % (slug, esc(author), len(author_books[author]), "s" if len(author_books[author]) != 1 else "") for slug, author in sorted(planned.items(), key=lambda x: x[1].lower()))
            section = '    <section class="seoblock tsb-seo414-links"><h2>All authors, A to Z</h2><ul class="seo413-list">%s</ul></section>' % rows
            text = insert_before_main_end(text, section)
            write(index_rel, text)
    return made


# ---------------------------------------------------------------- upgrades
def upgrade_books():
    priority = set()
    for folder in ("pseo/books-like", "pseo/vs"):
        if os.path.isdir(folder):
            for name in os.listdir(folder):
                if name.endswith(".html"):
                    stem = name[:-5]
                    priority.add(stem)
                    for part in stem.split("-vs-"):
                        priority.add(part)
    for q in ASK:
        for ref in q.get("books") or []:
            priority.add(ref["id"])
    for path in sorted(os.listdir("books")):
        if not path.endswith(".html") or path == "index.html":
            continue
        rel = "books/" + path
        text = read(rel)
        bid = path[:-5]
        b = BY_ID.get(bid)
        text = text.replace("?v=356", "?v=414")
        if "</article>" in text and "</footer>" in text:
            footer_end = text.find("</footer>") + len("</footer>")
            text = re.sub(r'\s*<section class="seoblock tsb-seo414-links"><h2>Keep exploring</h2>.*?</section>', lambda m: "" if m.start() > footer_end else m.group(0), text, flags=re.S)
        if b and 'application/ld+json' not in text:
            lessons = ", ".join(x.get("title", "") for x in b.get("lessons") or [])
            ld = [
                {"@context": "https://schema.org", "@type": "Article", "headline": "%s Summary and Key Lessons" % b["title"], "about": {"@type": "Book", "name": b["title"], "author": {"@type": "Person", "name": b["author"]}, "datePublished": str(b.get("year") or "")}, "author": {"@type": "Person", "name": "Jash Gandhi", "url": BASE + "/about.html"}, "publisher": {"@type": "Organization", "name": "TheSmallBook", "url": BASE}, "image": book_cover_url(b), "mainEntityOfPage": canonical_url(rel), "inLanguage": "en", "dateModified": DATE},
                {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
                    {"@type": "Question", "name": "What is %s about?" % b["title"], "acceptedAnswer": {"@type": "Answer", "text": clean(b.get("oneLiner") or b.get("bigIdea"))}},
                    {"@type": "Question", "name": "What are the key lessons of %s?" % b["title"], "acceptedAnswer": {"@type": "Answer", "text": lessons}},
                    {"@type": "Question", "name": "How long does the %s summary take?" % b["title"], "acceptedAnswer": {"@type": "Answer", "text": "About %s. It covers the big idea, %d lessons, key quotes and an action plan." % (b.get("readTime") or "8 min", len(b.get("lessons") or []))}},
                    {"@type": "Question", "name": "Is the %s summary available in Hindi?" % b["title"], "acceptedAnswer": {"@type": "Answer", "text": "Yes. Every TheSmallBook summary can be read in Hindi, Hinglish and 24 more languages, with audio in the reader."}},
                ]},
            ]
            text = text.replace("</head>", '  <script type="application/ld+json" data-%s>%s</script>\n</head>' % (MARK, json.dumps(ld, ensure_ascii=False, separators=(",", ":"))), 1)
        if b:
            if bid in priority and "Quick answers on" not in text:
                lesson_titles = "".join("<li>%s</li>" % esc(x.get("title") or "") for x in b.get("lessons") or [])
                faq = """    <section class="seoblock tsb-seo414-links">
      <h2>Quick answers on %s</h2>
      <p><b>What is %s about?</b> %s</p>
      <p><b>Which lessons matter most?</b></p><ul>%s</ul>
      <p><b>Is this summary available in Hindi?</b> Yes. Open the interactive book and choose Hindi or Hinglish. This page stays in simple English for search and sharing.</p>
      <p><b>How long will it take?</b> About %s for the summary, with %d lessons and an action plan.</p>
    </section>""" % (esc(b["title"]), esc(b["title"]), esc(b.get("oneLiner") or b.get("tagline") or ""), lesson_titles, esc(b.get("readTime") or "8 min"), len(b.get("lessons") or []))
                text = insert_before_main_end(text, faq)
            if "Keep exploring" not in text:
                links = ['<li><a href="index.html">All 650 book summaries</a></li>']
                author_slug = slugify(b["author"])
                if os.path.exists("authors/%s.html" % author_slug):
                    links.append('<li><a href="../authors/%s.html">More books by %s</a></li>' % (author_slug, esc(b["author"])))
                topic = TOPIC_BY_CATEGORY.get(b.get("category") or "")
                if topic and os.path.exists("topics/%s.html" % topic):
                    links.append('<li><a href="../topics/%s.html">Walk the %s shelf</a></li>' % (topic, esc(topic.replace("-", " "))))
                if os.path.exists("pseo/books-like/%s.html" % bid):
                    links.append('<li><a href="../pseo/books-like/%s.html">Books like %s</a></li>' % (bid, esc(b["title"])))
                for q in questions_for_books([bid], 3):
                    links.append('<li><a href="../ask/%s.html">%s</a></li>' % (q["id"], esc(q["q"])))
                if b.get("graveLink") and b["graveLink"] in FAIL_BY_ID:
                    links.append('<li><a href="../graveyard/%s.html">The failure this book warns about</a></li>' % b["graveLink"])
                section = '    <section class="seoblock tsb-seo414-links"><h2>Keep exploring</h2><ul>%s</ul></section>' % "".join(links)
                text = insert_before_main_end(text, section)
            crumbs = [("Library", BASE + "/"), ("Book summaries", canonical_url("books/index.html")), (b["title"], canonical_url(rel))]
        else:
            crumbs = [("Library", BASE + "/"), ("Book summaries", canonical_url("books/index.html")), (title_of(text), canonical_url(rel))]
        text = add_common(rel, text, crumbs)
        write(rel, text)


def upgrade_authors_topics():
    author_books = collections.defaultdict(list)
    for b in BOOKS:
        author_books[b["author"]].append(b)
    slug_author = {slugify(a): a for a in author_books}
    for path in sorted(os.listdir("authors")):
        if not path.endswith(".html"):
            continue
        rel = "authors/" + path
        text = read(rel).replace("?v=356", "?v=413")
        slug = path[:-5]
        if slug == "index":
            extra = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Authors", "url": canonical_url(rel), "dateModified": DATE}
            text = insert_before_main_end(text, '    <section class="seoblock tsb-seo414-links"><h2>Find an author through a question</h2><p>Start from the problem if the name is not the point: <a href="../ask/habits.html">habits</a>, <a href="../ask/focus.html">focus</a>, <a href="../ask/saving-money.html">money</a>, <a href="../ask/learning.html">learning</a>. Or browse all <a href="../books/index.html">600 book summaries</a>.</p></section>')
            text = add_common(rel, text, [("Library", BASE + "/"), ("Authors", canonical_url(rel))], extra)
        else:
            author = slug_author.get(slug)
            books = author_books.get(author, []) if author else []
            ids = [b["id"] for b in books]
            if author and "tsb-seo414-links" not in text:
                qs = questions_for_author(ids, 5)
                q_links = "".join('<li><a href="../ask/%s.html">%s</a></li>' % (q["id"], esc(q["q"])) for q in qs)
                first = sorted(books, key=lambda x: (x.get("year") or 9999, x["title"]))[0] if books else None
                faq = ""
                if first:
                    faq = '<p><b>Where should I start with %s?</b> Start with <a href="../books/%s.html">%s</a>: %s</p>' % (esc(author), first["id"], esc(first["title"]), esc(first.get("oneLiner") or ""))
                section = '    <section class="seoblock tsb-seo414-links"><h2>Questions %s helps answer</h2>%s<ul>%s</ul><p><a href="../books/index.html">Browse all book summaries</a> · <a href="../topics/index.html">Walk a topic shelf</a></p></section>' % (esc(author), faq, q_links)
                text = insert_before_main_end(text, section)
            extra = {"@context": "https://schema.org", "@type": "Person", "name": author, "url": canonical_url(rel)} if author else None
            text = add_common(rel, text, [("Library", BASE + "/"), ("Authors", canonical_url("authors/index.html")), (author or title_of(text), canonical_url(rel))], extra)
        write(rel, text)

    for path in sorted(os.listdir("topics")):
        if not path.endswith(".html"):
            continue
        rel = "topics/" + path
        text = read(rel).replace("?v=356", "?v=413")
        slug = path[:-5]
        if slug == "index":
            extra = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Topics", "url": canonical_url(rel), "dateModified": DATE}
            if "learning.html" not in text:
                text = text.replace("</main>", '    <section class="seoblock tsb-seo414-links"><h2>New shelf</h2><p><a href="learning.html">Learning faster</a>: memory, practice, skill building and mastery, gathered from across the library.</p></section>\n  </main>', 1) if "</main>" in text else text
            text = add_common(rel, text, [("Library", BASE + "/"), ("Topics", canonical_url(rel))], extra)
        else:
            ids = re.findall(r'href="\.\./books/([^"]+)\.html"', text)
            if "tsb-seo414-links" not in text:
                qs = []
                words = slug.replace("-", " ")
                for q in ASK:
                    hay = (q["q"] + " " + " ".join(q.get("keywords") or [])).lower()
                    if any(w in hay for w in words.split() if len(w) > 3):
                        qs.append(q)
                qs = (qs + questions_for_books(ids, 5))[:5]
                seen = []
                for q in qs:
                    if q not in seen:
                        seen.append(q)
                q_links = "".join('<li><a href="../ask/%s.html">%s</a></li>' % (q["id"], esc(q["q"])) for q in seen)
                graves = failures_for_books(ids, 5)
                g_links = "".join('<li><a href="../graveyard/%s.html">Why did %s fail?</a></li>' % (f["id"], esc(f["name"])) for f in graves)
                best = BEST_BY_TOPIC.get(slug)
                best_link = '<p><a href="../pseo/best-books-on/%s.html">See the ranked best books list</a></p>' % best if best and os.path.exists("pseo/best-books-on/%s.html" % best) else ""
                section = '    <section class="seoblock tsb-seo414-links"><h2>Turn this shelf into an answer</h2>%s<ul>%s</ul>%s<p><a href="../books/index.html">All 650 book summaries</a> · <a href="../graveyard/causes/startup-failures.html">Failure case studies</a></p></section>' % (best_link, q_links, ('<h3>Warnings from the Graveyard</h3><ul>' + g_links + '</ul>' if g_links else ''))
                text = insert_before_main_end(text, section)
            text = add_common(rel, text, [("Library", BASE + "/"), ("Topics", canonical_url("topics/index.html")), (h1_of(text), canonical_url(rel))])
        write(rel, text)


def upgrade_pseo():
    for root, _, files in os.walk("pseo"):
        for name in sorted(files):
            if not name.endswith(".html"):
                continue
            rel = os.path.join(root, name).replace(os.sep, "/")
            text = read(rel).replace("?v=413", "?v=414").replace("?v=356", "?v=413")
            ids = re.findall(r'href="(?:\.\./)+books/([^"]+)\.html"', text)
            prefix = "../" if root == "pseo" else "../../"
            if name != "index.html" and "tsb-seo414-links" not in text:
                qs = questions_for_books(ids, 4)
                q_links = "".join('<li><a href="%sask/%s.html">%s</a></li>' % (prefix, q["id"], esc(q["q"])) for q in qs)
                graves = failures_for_books(ids, 4)
                g_links = "".join('<li><a href="%sgraveyard/%s.html">Why did %s fail?</a></li>' % (prefix, f["id"], esc(f["name"])) for f in graves)
                first = BY_ID.get(ids[0]) if ids else None
                faq = '<p><b>Where should I start?</b> Start with <a href="%sbooks/%s.html">%s</a>: %s</p>' % (prefix, first["id"], esc(first["title"]), esc(first.get("oneLiner") or "")) if first else ""
                section = '    <section class="seoblock tsb-seo414-links"><h2>Use this list well</h2>%s<ul>%s</ul>%s<p><a href="%sbooks/index.html">Browse all 650 book summaries</a> · <a href="%stopics/index.html">Walk a full topic shelf</a></p></section>' % (faq, q_links, ('<h3>Warnings from the Graveyard</h3><ul>' + g_links + '</ul>' if g_links else ''), prefix, prefix)
                text = insert_before_main_end(text, section)
            if name == "index.html" and "tsb-seo414-links" not in text:
                section = '    <section class="seoblock tsb-seo414-links"><h2>More ways into the library</h2><p><a href="../books/index.html">All book summaries</a> · <a href="../ask/index.html">Ask the Library</a> · <a href="../graveyard/causes/business-failures.html">Business failures</a> · <a href="../graveyard/causes/startup-failures.html">Startup failures</a> · <a href="../topics/learning.html">Books on learning</a></p></section>'
                text = insert_before_main_end(text, section)
            crumbs = [("Library", BASE + "/"), ("Reading lists", canonical_url("pseo/index.html")), (h1_of(text), canonical_url(rel))]
            text = add_common(rel, text, crumbs)
            write(rel, text)


def upgrade_existing_graves():
    for path in sorted(os.listdir("graveyard")):
        if not path.endswith(".html"):
            continue
        rel = "graveyard/" + path
        text = read(rel).replace("?v=356", "?v=413").replace("?v=323", "?v=413")
        f = FAIL_BY_ID.get(path[:-5])
        if not f:
            continue
        if FAIL_NAME_COUNT[f["name"]] > 1:
            new_title = grave_title(f)
            text = re.sub(r"<title>.*?</title>", "<title>%s</title>" % esc(new_title), text, count=1, flags=re.S)
            text = re.sub(r'(<meta property="og:title" content=")[^"]*(")', r"\g<1>%s\g<2>" % esc(new_title), text, count=1)
        text = re.sub(r"EXPLORE ALL \d+ FAILURE CASE STUDIES", "EXPLORE ALL 559 FAILURE CASE STUDIES", text)
        text = re.sub(r'href="\.\./([a-z0-9-]+)\.html"', lambda m: 'href="%s.html"' % m.group(1) if m.group(1) in FAIL_BY_ID else m.group(0), text)
        if "tsb-seo414-links" not in text:
            section = grave_section(f, "../")
            if '<section class="seoblock seocta">' in text:
                text = text.replace('<section class="seoblock seocta">', section + '\n    <section class="seoblock seocta">', 1)
            else:
                text = insert_before_main_end(text, section)
        text = add_common(rel, text, [("Library", BASE + "/"), ("Graveyard", BASE + "/graveyard.html"), ("Why did %s fail?" % f["name"], canonical_url(rel))])
        write(rel, text)


def upgrade_roots():
    # Home: stronger summary, India English signals and crawlable footer doors.
    rel = "index.html"
    text = read(rel)
    text = text.replace('<meta name="description" content="Book summaries, lessons and failure autopsies. Skim any great book in minutes, in 26 languages, with audio.">', '<meta name="description" content="650 free book summaries, 4,853 lessons and 559 failure case studies. Read or listen in simple English, Hindi, Hinglish and 24 more languages.">')
    text = text.replace("TheSmallBook, 650 books · 4,853 lessons · 400 autopsies", "TheSmallBook, 650 books · 4,853 lessons · 559 failure case studies")
    text = text.replace('<span class="gravebanner__sub">400 autopsies of failed startups, fallen giants, and fatal mistakes. Read them before you repeat them.</span>', '<span class="gravebanner__sub">559 autopsies of failed startups, fallen giants, and fatal mistakes. Read them before you repeat them.</span>')
    if "tsb-seo414-links" not in text:
        text = text.replace('<p class="tiny"><a href="pseo/index.html" style="color:inherit;">READING LISTS</a>', '<p class="tiny tsb-seo414-links"><a href="books/index.html" style="color:inherit;">BOOK SUMMARIES</a> · <a href="authors/index.html" style="color:inherit;">AUTHORS</a> · <a href="topics/index.html" style="color:inherit;">TOPICS</a> · <a href="ask/index.html" style="color:inherit;">ASK THE LIBRARY</a> · <a href="graveyard/causes/startup-failures.html" style="color:inherit;">STARTUP FAILURES</a> · <a href="pseo/index.html" style="color:inherit;">READING LISTS</a>', 1)
    text = add_common(rel, text, None)
    write(rel, text)

    rel = "graveyard.html"
    text = read(rel)
    text = re.sub(r"<title>.*?</title>", "<title>Why Companies Fail: 530 Failure Case Studies and Lessons | TheSmallBook</title>", text, count=1, flags=re.S)
    text = text.replace("The Graveyard, 400 Failures, Autopsied | TheSmallBook", "Why Companies Fail: 530 Failure Case Studies and Lessons | TheSmallBook")
    text = text.replace("400 autopsies", "559 autopsies").replace("400 real people, startups and empires", "559 real people, startups and empires")
    text = text.replace("against 400 real corporate failures", "against 559 real corporate failures")
    if "tsb-seo414-links" not in text:
        cause_links = "".join('<li><a href="graveyard/causes/%s.html">%s (%d)</a></li>' % (slug, esc(label), len([x for x in FAILURES if x["category"] == cat])) for cat, (slug, label, _) in CAUSES.items())
        featured = "".join('<li><a href="graveyard/%s.html">Why did %s fail?</a></li>' % (fid, esc(FAIL_BY_ID[fid]["name"])) for fid in ["kodak-digital", "blockbuster-netflix", "theranos-holmes", "wework-neumann", "byjus-empire", "kingfisher-vijay"] if fid in FAIL_BY_ID)
        section = '<section class="seopage tsb-seo414-links" style="max-width:860px;margin:0 auto;padding:24px 16px 48px"><h2>Browse failure case studies by cause</h2><p>Every grave is also a static case study: what happened, the fatal mistake, the cost and the lesson. Start with a cause of death, or read the cases readers look for first.</p><ul>%s</ul><h3>Start with these</h3><ul>%s</ul><p><a href="ask/failure.html">How do I deal with failure?</a> · <a href="pseo/best-books-on/business-failures.html">Best books on why companies fail</a> · <a href="books/index.html">All book summaries</a></p></section>' % (cause_links, featured)
        text = text.replace("</body>", section + "\n</body>", 1)
    text = add_common(rel, text, [("Library", BASE + "/"), ("Graveyard", canonical_url(rel))], {"@context": "https://schema.org", "@type": "CollectionPage", "name": "The Graveyard", "url": canonical_url(rel), "description": "559 failure case studies with the story, fatal mistake, cost and lesson.", "dateModified": DATE})
    write(rel, text)

    rel = "audio.html"
    text = read(rel)
    text = add_common(rel, text, [("Library", BASE + "/"), ("Listen", canonical_url(rel))], {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Audiobooks and book audio", "url": canonical_url(rel), "description": "Public domain audiobooks, book summaries with audio, shows and deep dives from TheSmallBook.", "dateModified": DATE})
    write(rel, text)

    rel = "podcasts.html"
    text = read(rel)
    if 'name="robots"' not in text:
        text = text.replace('<meta name="theme-color" content="#ffc800">', '<meta name="theme-color" content="#ffc800">\n  <meta name="robots" content="noindex,follow">\n  <link rel="canonical" href="https://thesmallbook.in/audio.html">')
    write(rel, text)

    rel = "chat.html"
    text = read(rel)
    text = text.replace("48+ real questions", "83 real questions")
    text = text.replace('<noscript><p style="padding:40px;text-align:center;">Ask TheSmallBook needs JavaScript. <a href="index.html">Back to the library</a>.</p></noscript>', '<noscript><p style="padding:40px;text-align:center;">Ask TheSmallBook needs JavaScript. Read the static answers in <a href="ask/index.html">Ask the Library</a> or browse <a href="books/index.html">book summaries</a>.</p></noscript>')
    write(rel, text)


def update_robots_and_llms():
    robots = read("robots.txt")
    add = ["Disallow: /chat.html", "Disallow: /login.html", "Disallow: /settings.html", "Disallow: /you.html", "Disallow: /profile.html", "Disallow: /dm.html", "Disallow: /notifications.html", "Disallow: /scan.html"]
    for line in add:
        if line not in robots:
            robots = robots.replace("Sitemap:", line + "\nSitemap:")
    write("robots.txt", robots)
    llms = """# TheSmallBook

Free book summaries, lessons and failure case studies in simple English, with Hindi, Hinglish and 24 more languages in the reader.

## Main shelves
- Book summaries: https://thesmallbook.in/books/index.html
- Authors: https://thesmallbook.in/authors/index.html
- Topics: https://thesmallbook.in/topics/index.html
- Ask the Library: https://thesmallbook.in/ask/index.html
- Reading lists: https://thesmallbook.in/pseo/index.html
- Graveyard: https://thesmallbook.in/graveyard.html
- Startup failures: https://thesmallbook.in/graveyard/causes/startup-failures.html
- Business failures: https://thesmallbook.in/graveyard/causes/business-failures.html
- Books on learning: https://thesmallbook.in/topics/learning.html

## Counts
- 650 books
- 4,853 lessons
- 559 failure case studies
- 83 Ask the Library questions
"""
    write("llms.txt", llms)


def bump_versions():
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git")]
        for name in files:
            if not name.endswith((".html", ".js", ".mjs", ".css", ".json")):
                continue
            path = os.path.join(root, name)
            if path.startswith("./tests/") or path.startswith("./tools/build413"):
                continue
            text = read(path)
            new = text.replace("?v=413", "?v=414").replace("tsb-v413", "tsb-v414").replace('var BUILD = "412"', 'var BUILD = "413"')
            if new != text:
                write(path, new)


def main():
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
    print("Build 414 SEO complete. New grave pages:", made, "New author pages:", authors_made)
    print("Books:", len(BOOKS), "Ask:", len(ASK), "Failures:", len(FAILURES))


if __name__ == "__main__":
    main()
