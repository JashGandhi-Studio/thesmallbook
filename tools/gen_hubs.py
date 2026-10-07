#!/usr/bin/env python3
# tools/gen_hubs.py - topic + author hub pages (complete shelves, pSEO)
# Usage: python3 tools/gen_hubs.py   (from repo root)
import json, re, subprocess, html, os, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# ---- pull the library out of data.js via node (source of truth) ----
nodejs = """
global.window={};
const fs=require('fs');
new Function('window', fs.readFileSync('js/data.js','utf8') + ';window.BOOKS=BOOKS;')(window);
const B=window.BOOKS.map(b=>({id:b.id,title:b.title,author:b.author,year:b.year,category:b.category,
  cover:b.cover,readTime:b.readTime,tagline:b.tagline,oneLiner:b.oneLiner,n:b.lessons.length}));
fs.writeFileSync('/tmp/tsb_books.json', JSON.stringify(B));
"""
subprocess.run(["node", "-e", nodejs], check=True)
BOOKS = json.load(open("/tmp/tsb_books.json", encoding="utf-8"))
BY_ID = {b["id"]: b for b in BOOKS}

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s

def e(s): return html.escape(str(s), quote=True)

BASE = "https://thesmallbook.in"
YEAR = "2026"

# ---------------- topics ----------------
# (slug, display name, h1, intro prose, keywords, exact categories)
TOPICS = [
    ("habits", "Habits", "Everything on habits",
     "Every book in the library that earns its place on habit building, breaking bad loops and the daily systems that make change stick - %d of them, each with a free summary, lessons you can act on today, and audio in your language.",
     ["habit", "routine", "ritual", "atomic", "willpower"], ["Self-Improvement"]),
    ("focus-and-deep-work", "Focus & Deep Work", "Everything on focus and deep work",
     "The complete shelf on attention: killing distraction, doing harder things for longer, and why focus became the rarest resource of the century - %d books, all free to read.",
     ["focus", "deep work", "distraction", "attention", "indistractable", "shallow"], ["Productivity"]),
    ("money", "Money", "Everything on money",
     "Every money book the library keeps: earning it, keeping it, letting it compound, and not letting it wreck you - %d free summaries, no paywall.",
     ["money", "wealth", "rich", "millionaire", "finance", "psychology of money"], ["Money & Finance"]),
    ("investing", "Investing", "Everything on investing",
     "From your first SIP to reading a balance sheet: every investing book that made the cut - %d summaries with the lessons that survive contact with a real market.",
     ["invest", "stock", "market", "portfolio", "compounding", "value", "SIP"], ["Money & Finance"]),
    ("discipline", "Discipline", "Everything on discipline",
     "Motivation is weather, discipline is climate. The full shelf on showing up anyway: %d books with honest lessons, not poster quotes.",
     ["discipline", "self-discipline", "consistency", "grit", "no excuses", "can't hurt me", "self-control"], ["Self-Improvement"]),
    ("productivity", "Productivity", "Everything on productivity",
     "Getting the right things done without becoming a spreadsheet of yourself: %d productivity books, summarized free, with the one action each book is really about.",
     ["productiv", "procrastin", "time management", "getting things done", "eat that frog", "efficient"], ["Productivity"]),
    ("leadership", "Leadership", "Everything on leadership",
     "Leading when nobody has to follow you: %d books on trust, teams, hard calls and the quiet work of earning authority.",
     ["leader", "leading", "team", "command", "manage"], ["Leadership"]),
    ("startups-and-business", "Startups & Business", "Everything on startups and business",
     "Every business book in the vault - starting from zero, finding customers, pricing, hiring, and surviving your own success: %d free summaries.",
     ["startup", "business", "entrepreneur", "company", "founder", "lean", "customer"], ["Business & Startups"]),
    ("psychology", "Psychology & People", "Everything on psychology and people",
     "Why humans do the strange things they do, including you: %d books on the mind, bias, habits of thought and the people around you.",
     ["psychology", "mind", "bias", "thinking", "behavior", "people"], ["Psychology & People"]),
    ("stoicism-and-calm", "Stoicism & Calm", "Everything on stoicism and a calm mind",
     "The ancients and the moderns who kept their heads: %d books on equanimity, memento mori, and peace that doesn't depend on things going well.",
     ["stoic", "meditations", "seneca", "calm", "stillness", "equanim", "mindful", "tolle", "still"], ["Self-Improvement"]),
    ("creativity", "Creativity", "Everything on creativity",
     "Where ideas come from and how to keep them coming: %d books on making things, sharing them, and surviving the middle of the work.",
     ["creativ", "artist", "steal", "idea", "write", "show your work"], ["Creativity"]),
    ("negotiation-and-influence", "Negotiation & Influence", "Everything on negotiation and influence",
     "Getting to yes without losing the room - or yourself: %d books on persuasion, negotiation, and the subtle art of being believed.",
     ["negotiat", "influence", "persuas", "charm", "crucial conversation", "never split"], ["Psychology & People"]),
    ("purpose-and-meaning", "Purpose & Meaning", "Everything on purpose and meaning",
     "The big shelf: what a good life is, what work is for, and what to do on a Tuesday when none of it feels like it matters. %d books, free.",
     ["purpose", "meaning", "meaningful", "ikigai", "happy", "happiness", "fulfil", "dying", "death", "monk"], ["Self-Improvement"]),
    ("power-and-strategy", "Power & Strategy", "Everything on power and strategy",
     "The complete shelf on how power actually moves - the 48 laws crowd, the strategy classics, and the histories that prove it: %d books.",
     ["power", "strategy", "laws", "war", "prince", "influence"], ["Power & Strategy"]),
]

def match_books(kws, cats):
    out = []
    for b in BOOKS:
        score = 0
        hay_t = b["title"].lower()
        hay_1 = (b["oneLiner"] or "").lower() + " " + (b["tagline"] or "").lower()
        for k in kws:
            if k.lower() in hay_t: score += 3
            elif k.lower() in hay_1: score += 1
        if b["category"] in cats: score += 2
        if score >= 2: out.append((score, b))
    out.sort(key=lambda t: (-t[0], t[1]["title"]))
    seen, books = set(), []
    for _, b in out:
        if b["id"] in seen: continue
        seen.add(b["id"]); books.append(b)
    return books

def card(b, rel):
    cover = f"../assets/covers/{b['id']}.jpg"
    return (f'<a class="hubcard" href="../books/{b["id"]}.html">'
            f'<img src="{cover}" alt="{e(b["title"])} cover" loading="lazy" width="90" height="135" '
            f'onerror="this.src=\'../assets/cover-fallback.png\'">'
            f'<span class="hubcard__m"><b>{e(b["title"])}</b>'
            f'<i>{e(b["author"])} · {e(b["year"])}</i>'
            f'<em>{e((b["oneLiner"] or "")[:110])}</em>'
            f'<u>{e(b["readTime"] or "")} · {b["n"]} lessons · free summary</u></span></a>')

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="author" content="Jash Gandhi">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="canonical" href="{canon}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{canon}">
  <meta property="og:site_name" content="TheSmallBook">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#ffc800">
  <script>
    try {{
      var tsbDark = localStorage.getItem("tsb_theme") === '"dark"';
      if (tsbDark) document.documentElement.classList.add("dark");
      var tsbTC = document.querySelector('meta[name="theme-color"]');
      if (!tsbTC) {{ tsbTC = document.createElement("meta"); tsbTC.name = "theme-color"; document.head.appendChild(tsbTC); }}
      tsbTC.content = tsbDark ? "#16130e" : "#ffc800";
    }} catch (e) {{}}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css?v=300">
  <style>
    .hubwrap {{ max-width: 860px; margin: 0 auto; padding: 18px 16px 40px; }}
    .hubhead {{ border: 3px solid var(--ink); border-radius: 20px; background: var(--paper); box-shadow: 6px 6px 0 var(--ink); padding: 20px 18px; }}
    .hubcrumb {{ font: 600 11px "Space Grotesk", sans-serif; opacity: .6; margin: 0 0 8px; }}
    .hubcrumb a {{ color: inherit; }}
    .hubhead h1 {{ font: 400 clamp(22px, 5.6vw, 34px) "Archivo Black", "Arial Black", sans-serif; color: var(--ink); margin: 0 0 8px; line-height: 1.12; }}
    .hubhead p {{ font: 600 13.5px/1.55 "Space Grotesk", sans-serif; color: var(--ink); margin: 0; }}
    .hubpill {{ display: inline-block; margin-top: 12px; font: 800 10px "Archivo Black", sans-serif; letter-spacing: .6px; background: var(--yellow); border: 2px solid var(--ink); border-radius: 999px; padding: 6px 11px; color: var(--ink); }}
    .hublist {{ display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }}
    .hubcard {{ display: flex; gap: 12px; align-items: center; border: 2.5px solid var(--ink); border-radius: 16px; background: var(--paper); box-shadow: 3px 3px 0 var(--ink); padding: 10px; text-decoration: none; }}
    .hubcard img {{ width: 90px; height: 135px; object-fit: cover; border: 2px solid var(--ink); border-radius: 8px; flex: 0 0 auto; background: var(--bg); }}
    .hubcard__m {{ min-width: 0; display: flex; flex-direction: column; gap: 3px; }}
    .hubcard__m b {{ font: 800 14px/1.25 "Space Grotesk", sans-serif; color: var(--ink); }}
    .hubcard__m i {{ font: 600 11px "Space Grotesk", sans-serif; font-style: normal; color: var(--ink); opacity: .6; }}
    .hubcard__m em {{ font: 500 12px/1.4 "Space Grotesk", sans-serif; font-style: normal; color: var(--ink); opacity: .85; }}
    .hubcard__m u {{ font: 700 9.5px "Archivo Black", sans-serif; letter-spacing: .4px; text-decoration: none; color: var(--ink); background: var(--yellow); border-radius: 999px; padding: 4px 8px; align-self: flex-start; margin-top: 3px; }}
    .hubmore {{ margin: 22px 0 8px; }}
    .hubmore h2 {{ font: 400 15px "Archivo Black", "Arial Black", sans-serif; color: var(--ink); margin: 0 0 10px; }}
    .hubchips {{ display: flex; flex-wrap: wrap; gap: 8px; }}
    .hubchips a {{ font: 700 12px "Space Grotesk", sans-serif; color: var(--ink); border: 2px solid var(--ink); border-radius: 999px; padding: 7px 12px; text-decoration: none; background: var(--paper); }}
    .hubchips a:hover {{ background: var(--yellow); }}
    .hubcta {{ margin: 26px 0 0; border: 3px solid var(--ink); border-radius: 18px; background: var(--yellow); box-shadow: 5px 5px 0 var(--ink); padding: 18px; text-align: center; }}
    .hubcta a {{ font: 400 14px "Archivo Black", "Arial Black", sans-serif; color: var(--ink); text-decoration: none; }}
    .hubcta p {{ font: 600 11.5px "Space Grotesk", sans-serif; color: var(--ink); margin: 8px 0 0; }}
  </style>
</head>
<body>
  <nav class="nav">
    <a class="logo" href="../index.html">
      <span class="logo__mark">📕</span>
      <span>The<span class="logo__small">Small</span>Book</span>
    </a>
    <div class="nav__links">
      <a class="btn btn--yellow" href="../index.html#library">📚 LIBRARY</a>
      <a class="btn btn--red" href="../graveyard.html">💀 GRAVEYARD</a>
    </div>
  </nav>
"""

FOOT = """  <footer class="footer">
    <div class="head">📕 TheSmallBook</div>
    <p>Big books. Small reads. Original educational analyses - no book text reproduced. Support the authors: buy the full books.</p>
    <p class="affnote">As an Amazon Associate, TheSmallBook earns from qualifying purchases. It keeps the library free. 💛</p>
    <div class="credits">✦ MADE BY JASH GANDHI ✦</div>
    <p class="tiny"><a href="../about.html" style="color:inherit;">ABOUT</a>&nbsp;&nbsp;<strong><a href="../gold.html" style="color:inherit;">👑 TSB GOLD</a></strong>&nbsp;&nbsp;MUMBAI, INDIA&nbsp;&nbsp;<strong>FREE TO READ</strong></p>
  </footer>
</body>
</html>
"""

def itemlist_ld(name, books):
    items = []
    for i, b in enumerate(books, 1):
        items.append({"@type": "ListItem", "position": i, "url": f"{BASE}/books/{b['id']}.html", "name": b["title"]})
    return json.dumps({"@context": "https://schema.org", "@type": "ItemList", "name": name, "numberOfItems": len(books), "itemListElement": items})

def write_page(path, title, desc, body, ld):
    ld = f'  <script type="application/ld+json">{ld}</script>\n' if ld else ""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    canon = BASE + "/" + path
    html_out = HEAD.format(title=e(title), desc=e(desc), canon=canon).replace("</head>", ld + "</head>") + body + FOOT
    open(path, "w", encoding="utf-8").write(html_out)

def main():
    made = {"topics": [], "authors": []}
    # ---- topic hubs ----
    rendered = []
    for slug, name, h1, intro, kws, cats in TOPICS:
        books = match_books(kws, cats)
        if len(books) < 8:
            continue
        made["topics"].append((slug, name, len(books)))
        chips = "".join(f'<a href="{s}.html">{e(n)} ({c})</a>' for s, n, c in made["topics"] if s != slug)
        cards = "".join(card(b, "../books/") for b in books)
        body = f"""  <main class="seopage"><div class="hubwrap">
    <header class="hubhead">
      <p class="hubcrumb"><a href="../index.html">Library</a> › Topics › {e(name)}</p>
      <h1>{e(h1)}</h1>
      <p>{intro.replace("%d", str(len(books)))}</p>
      <span class="hubpill">{len(books)} BOOKS · ALL FREE · AUDIO IN 26 LANGUAGES</span>
    </header>
    <div class="hublist">{cards}</div>
    <div class="hubcta"><a href="../index.html#library">📖 OPEN THE FULL LIBRARY, {len(BOOKS)} BOOKS</a><p>Every summary free. Mark lessons as read, listen in your language, share quote cards.</p></div>
    <section class="hubmore"><h2>More shelves to walk</h2><div class="hubchips">{chips}</div></section>
  </div></main>"""
        write_page(f"topics/{slug}.html",
                   f"Books on {name} - the complete shelf ({len(books)} free summaries) | TheSmallBook",
                   f"{h1}: {len(books)} free book summaries with lessons, quotes and action plans. Read free, listen in your language.",
                   body, itemlist_ld(f"Books on {name}", books))
    # ---- author hubs (2+ books; Unknown gets its own honest shelf) ----
    by_au = {}
    for b in BOOKS:
        by_au.setdefault(b["author"], []).append(b)
    authors = sorted([a for a, bs in by_au.items() if len(bs) >= 2 and a != "Unknown"], key=lambda a: -len(by_au[a]))
    for a in authors:
        bs = sorted(by_au[a], key=lambda b: b["year"] or 0)
        slug = slugify(a)
        made["authors"].append((slug, a, len(bs)))
        cards = "".join(card(b, "../books/") for b in bs)
        chips = "".join(f'<a href="../topics/{s}.html">{e(n)}</a>' for s, n, _ in made["topics"][:8])
        body = f"""  <main class="seopage"><div class="hubwrap">
    <header class="hubhead">
      <p class="hubcrumb"><a href="../index.html">Library</a> › Authors › {e(a)}</p>
      <h1>Every book by {e(a)}, on one shelf</h1>
      <p>{len(bs)} books in the library, each read down to its lessons: the big idea, real examples, the actions worth taking. Free summaries, no paywall, audio in 26 languages.</p>
      <span class="hubpill">{len(bs)} BOOKS BY {e(a.upper())} · ALL FREE</span>
    </header>
    <div class="hublist">{cards}</div>
    <div class="hubcta"><a href="../index.html#library">📖 BROWSE ALL {len(BOOKS)} BOOKS</a><p>Or walk a full shelf: ideas, not just authors.</p></div>
    <section class="hubmore"><h2>Walk a topic instead</h2><div class="hubchips">{chips}</div></section>
  </div></main>"""
        ld = itemlist_ld(f"Books by {a}", bs)
        write_page(f"authors/{slug}.html",
                   f"Books by {a} - every summary ({len(bs)} book{'s' if len(bs)>1 else ''}, free) | TheSmallBook",
                   f"Every book by {a} in TheSmallBook library: {len(bs)} free summaries with key lessons, quotes and action plans.",
                   body, ld)
    # ---- Unknown shelf: ancient & anonymous ----
    unk = sorted(by_au.get("Unknown", []), key=lambda b: b["title"])
    if len(unk) >= 6:
        cards = "".join(card(b, "../books/") for b in unk)
        body = f"""  <main class="seopage"><div class="hubwrap">
    <header class="hubhead">
      <p class="hubcrumb"><a href="../index.html">Library</a> › Authors › Anonymous</p>
      <h1>The anonymous classics</h1>
      <p>{len(unk)} books with no author to thank - folk wisdom, scripture, verse and voice from teachers whose names history did not keep. The lessons kept themselves.</p>
      <span class="hubpill">{len(unk)} BOOKS · ALL FREE</span>
    </header>
    <div class="hublist">{cards}</div>
    <div class="hubcta"><a href="../index.html#library">📖 BROWSE ALL {len(BOOKS)} BOOKS</a><p>Every summary free, forever.</p></div>
  </div></main>"""
        write_page("authors/anonymous.html",
                   f"Anonymous classics - {len(unk)} free summaries | TheSmallBook",
                   "Folk wisdom, scripture and verse with no named author: every anonymous classic in TheSmallBook, summarized free.",
                   body, itemlist_ld("Anonymous classics", unk))
        made["authors"].append(("anonymous", "Anonymous", len(unk)))
    # ---- index pages ----
    tchips = "".join(f'<a href="{s}.html">{e(n)} · {c} books</a>' for s, n, c in made["topics"])
    achips = "".join(f'<a href="{s}.html">{e(n)} ({c})</a>' for s, n, c in made["authors"])
    write_page("topics/index.html", "Topics - every shelf in the library | TheSmallBook",
               f"Walk a whole shelf: {len(made['topics'])} topics, {len(BOOKS)} books, every summary free.",
               f"""  <main class="seopage"><div class="hubwrap">
    <header class="hubhead"><p class="hubcrumb"><a href="../index.html">Library</a> › Topics</p><h1>Walk a whole shelf</h1><p>Not the top 7 - everything we have, sorted by the problem you showed up with. {len(BOOKS)} books across {len(made['topics'])} shelves.</p></header>
    <div class="hubmore"><div class="hubchips">{tchips}</div></div>
  </div></main>""", "")
    write_page("authors/index.html", "Authors - every writer on the shelf | TheSmallBook",
               f"{len(made['authors'])} authors, every book they have in the library, every summary free.",
               f"""  <main class="seopage"><div class="hubwrap">
    <header class="hubhead"><p class="hubcrumb"><a href="../index.html">Library</a> › Authors</p><h1>Read a writer, whole</h1><p>{len(made['authors'])} authors - every book they have here, in one place, free.</p></header>
    <div class="hubmore"><div class="hubchips">{achips}</div></div>
  </div></main>""", "")
    # ---- sitemap ----
    sm = open("sitemap.xml", encoding="utf-8").read()
    add = ""
    for s, _, _ in made["topics"]:
        add += f"  <url><loc>{BASE}/topics/{s}.html</loc><changefreq>weekly</changefreq></url>\n"
    for s, _, _ in made["authors"]:
        add += f"  <url><loc>{BASE}/authors/{s}.html</loc><changefreq>weekly</changefreq></url>\n"
    add += f"  <url><loc>{BASE}/topics/index.html</loc><changefreq>weekly</changefreq></url>\n  <url><loc>{BASE}/authors/index.html</loc><changefreq>weekly</changefreq></url>\n"
    if "/topics/" not in sm:
        sm = sm.replace("</urlset>", add + "</urlset>")
        open("sitemap.xml", "w", encoding="utf-8").write(sm)
        print("sitemap:", add.count("<url>"), "urls added")
    else:
        print("sitemap already has hubs")
    print("topic hubs:", len(made["topics"]), "| author hubs:", len(made["authors"]) )

if __name__ == "__main__":
    main()
