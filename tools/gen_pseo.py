#!/usr/bin/env python3
"""v300 programmatic SEO pages: reading-list pages that answer real searches.

Types:
  like :  books-like/<book>.html   "10 Books Like X That Hit The Same Nerve"
  best :  best-books-on/<topic>.html "The 7 Best Books on <Topic>"
  vs   :  vs/<a>-vs-<b>.html       "X vs Y: Which Should You Actually Read?"

Rules of the house:
  - Every book referenced is pulled live from js/data.js; ids that are
    missing or covers that do not exist are skipped loudly, never linked.
  - Titles and author names carry translate="no" so the runtime translator
    (js/lang.js) renders the page in the reader's language but keeps
    proper nouns intact. Hindi reader in, Hindi page out, real names kept.
  - Honest copy only: free summary pages, no manufactured claims.
"""
import json, os, re, html

REPO = '/home/user/repo'
OUT = os.path.join(REPO, 'pseo')
os.makedirs(OUT, exist_ok=True)
for sub in ('books-like', 'best-books-on', 'vs'):
    os.makedirs(os.path.join(OUT, sub), exist_ok=True)

src = open(REPO + '/js/data.js', encoding='utf-8').read().split('\n', 1)[0]
BOOKS = json.loads(src[src.index('['):src.rindex(']') + 1])
by_id = {b['id']: b for b in BOOKS}

def esc(s):
    """house escape: em/en dashes become the ask.js-style " - " (banned as copy)"""
    s = re.sub(r" ?[\u2014\u2013] ?", " - ", str(s))
    return html.escape(s, quote=False)

def cover_ok(b):
    p = os.path.join(REPO, b['cover'])
    return os.path.exists(p)

def valid(ids, exclude=None, want=None):
    out = []
    for i in ids:
        if i in out or i == exclude: continue
        b = by_id.get(i)
        if b and cover_ok(b): out.append(i)
    if want:
        out = [i for i in out if by_id[i]['category'] == want]
    return out

# ---------------- shared template ----------------
def ld_item_list(name, books):
    return [{"@context": "https://schema.org", "@type": "ItemList",
             "name": name,
             "numberOfItems": len(books),
             "itemListElement": [{"@type": "ListItem", "position": i + 1,
                                   "url": f"https://thesmallbook.in/books/{b['id']}.html",
                                   "name": b['title']} for i, b in enumerate(books)]}]

PSEO_TPL = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1">
  <title>{TITLE}</title>
  <meta name="description" content="{DESC}">
  <meta name="author" content="Jash Gandhi">
  <link rel="canonical" href="{CANON}">
  <meta property="og:title" content="{TITLE}">
  <meta property="og:description" content="{DESC}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{CANON}">
  <meta property="og:site_name" content="TheSmallBook">
  <meta property="og:image" content="https://thesmallbook.in/assets/og-image.png">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#ffc800">
  <script>
    /* theme + phone status bar BEFORE first paint (no flash). */
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
  <link rel="stylesheet" href="{R}css/style.css?v=300">
  <link rel="icon" href="{R}favicon.ico" sizes="32x32">
  <script type="application/ld+json">{LD}</script>
</head>
<body>
  <nav class="nav">
    <a class="logo" href="{R}index.html">
      <span class="logo__mark">&#128278;</span>
      <span>The<span class="logo__small">Small</span>Book</span>
    </a>
    <div class="nav__links">
      <a class="btn btn--yellow" href="../index.html#library">&#128218; LIBRARY</a>
      <a class="btn btn--red" href="{R}graveyard.html">&#128128; GRAVEYARD</a>
    </div>
  </nav>
  <main class="seopage">
    <header class="seohero">
      <p class="seocrumb">{CRUMB}</p>
      <h1>{H1}</h1>
      <p class="seometa">&#128214; free summaries &middot; 26 languages &middot; no paywall</p>
      <p class="seotagline">{INTRO}</p>
    </header>
    <section class="seoblock pseo__listwrap">
{LIST}
    </section>
    <section class="seoblock seocta">
      <a class="btn btn--yellow" href="../index.html#library">&#128218; BROWSE THE FULL 500-BOOK SHELF</a>
      <p>Every summary is free: lessons, examples, action steps, audio in your language.</p>
    </section>
  </main>
  <footer class="footer">
    <div class="head">&#128278; TheSmallBook</div>
    <p>Big books. Small reads. Original educational analyses &mdash; no book text reproduced. Support the authors: buy the full books.</p>
    <p class="affnote">As an Amazon Associate, TheSmallBook earns from qualifying purchases. It keeps the library free. &#128155;</p>
    <div class="credits">&#10022; MADE BY JASH GANDHI &#10022;</div>
    <p class="tiny"><a href="{R}about.html" style="color:inherit;">ABOUT</a>&nbsp;&nbsp;<strong><a href="{R}gold.html" style="color:inherit;">&#128081; TSB GOLD</a></strong>&nbsp;&nbsp;MUMBAI, INDIA&nbsp;&nbsp;<strong>FREE TO READ</strong></p>
  </footer>
  <script src="{R}js/prefs.js?v=300"></script>
  <script src="{R}js/lang.js?v=300"></script>
</body>
</html>'''

# ---------------- seed pools ----------------
FAMOUS = """atomic-habits deep-work psychology-of-money rich-dad-poor-dad think-and-grow-rich
48-laws-of-power how-to-win-friends sapiens ikigai subtle-art mans-search almanack-naval
lean-startup zero-to-one rework mom-test everything-store shoe-dog hard-things working-backwards
meditations art-of-war emotional-intelligence grit mindset flow thinking-fast-slow
power-of-habit eat-that-frog war-of-art gtd essentialism deep-relationships? no
never-split laws-human-nature psycho-cybernetics thinking-big courage-disliked
4-hour-workweek gtd-india? no one-thing ultralearning make-time indistractable
intelligent-investor common-sense-investing? no simple-path-wealth richest-man-babylon
iwt-rich dhandho-investor coffee-can-investing random-walk? no cashflow-quadrant? no
siddhartha brief-history-time guns-germs-steel silk-roads prisoners-geography the-gene
attached games-people-play lost-connections untethered-soul happiness-hypothesis? no
7-habits blackout? no start-with-why elon-musk losing-my-virginity? no sam-walton
chai-stall-ceo the-quiet-leader the-decision-room the-comparison-tax nobody-is-thinking-about-you
daily-stoic letters-from-a-stoic obstacle-is-way practicing-stoic
""".split()
FAMOUS = [f for f in FAMOUS if not f.endswith('?no') and '?' not in f]
seeds = valid(FAMOUS)
HIGH = {"Business & Startups", "Money & Finance", "Power & Strategy", "Self-Improvement", "Psychology & People", "Productivity"}
for b in BOOKS:
    if len(seeds) >= 150: break
    if b['id'] in seeds or b['category'] not in HIGH: continue
    if not cover_ok(b): continue
    seeds.append(b['id'])
print('LIKE seeds:', len(seeds))

CAT_OF = {b['id']: b['category'] for b in BOOKS}

# ---------------- LIKE pages ----------------
made = []
R = '../../'
for sid in seeds:
    s = by_id[sid]
    cat = s['category']
    pool = [b for b in BOOKS if b['id'] != sid and b['category'] == cat and cover_ok(b)]
    # prefer entries whose oneLiner shares a rare keyword with the seed tagline
    key = set(re.findall(r'[a-z]{5,}', (s['oneLiner'] + ' ' + s['tagline']).lower()))
    def score(b):
        k2 = set(re.findall(r'[a-z]{5,}', (b['oneLiner'] + ' ' + b['tagline']).lower()))
        return len(key & k2)
    pool.sort(key=lambda b: (-score(b), b['title']))
    picks = pool[:10]
    if len(picks) < 4: continue
    T = s['title']
    title = f"{T}: 10 Books Like It That Hit the Same Nerve (Free) | TheSmallBook"
    desc = esc(f"Read {T} and want more in the same vein? 10 books that hit the same nerve, all with free chapter-by-chapter summaries on TheSmallBook.")
    rows = []
    for b in picks:
        rows.append(f'''      <li class="pseo__item">
        <a class="pseo__itemlink" href="{R}books/{b['id']}.html">
          <img class="pseo__cover" src="{R}{b['cover']}" alt="{esc(b['title'])} book cover" loading="lazy" width="54" height="81">
          <span class="pseo__ibody">
            <b class="pseo__btitle" translate="no">{esc(b['title'])}</b>
            <span class="pseo__meta">by <span translate="no">{esc(b['author'])}</span> &middot; {b['year']} &middot; {esc(b['category'])} &middot; free summary</span>
            <span class="pseo__why">{esc(b['oneLiner'])}</span>
            <span class="pseo__go">READ THE FREE BREAKDOWN &rarr;</span>
          </span>
        </a>
      </li>''')
    items = '\n'.join(rows)
    page = PSEO_TPL.format(
        TITLE=title, DESC=desc, CANON=f"https://thesmallbook.in/pseo/books-like/{sid}.html",
        H1=f"10 Books Like {esc(T)} That Hit the Same Nerve",
        INTRO=f"You finished <span class=\"notranslate\" translate=\"no\">{esc(T)}</span> by <span class=\"notranslate\" translate=\"no\">{esc(s['author'])}</span> and want the same energy: {esc(s['oneLiner'][:110])}… Here are 10 more that scratch the same itch, each with a free chapter-by-chapter breakdown, key lessons and action steps on this shelf.",
        LIST=items,
        CRUMB=f"<a href=\"{R}index.html\">Library</a> &rsaquo; Books like <span translate=\"no\">{esc(T)}</span>",
        LD=json.dumps(ld_item_list(f"Books like {T}", picks), ensure_ascii=False, separators=(',', ':')), R=R)
    open(f'{OUT}/books-like/{sid}.html', 'w', encoding='utf-8').write(page)
    made.append(('like', sid))

# ---------------- BEST pages ----------------
TOPICS = [
    ("focus-and-deep-work", "Focus and Deep Work", "Productivity", ["deep-work", "indistractable", "make-time", "digital-minimalism", "essentialism", "gtd", "the-one-thing", "ultralearning"]),
    ("habits", "Building Habits That Stick", "Self-Improvement", ["atomic-habits", "power-of-habit", "tiny-habits", "the-compound-effect", "grit", "mindset", "unlimited-power", "eat-that-frog"]),
    ("money", "Money and Personal Finance", "Money & Finance", ["psychology-of-money", "rich-dad-poor-dad", "richest-man-babylon", "iwt-rich", "lets-talk-money", "total-money-makeover", "simple-path-wealth", "money-master-game"]),
    ("investing", "Investing", "Money & Finance", ["intelligent-investor", "common-stocks-and-uncommon-profits", "simple-path-wealth", "coffee-can-investing", "random-walk-down-wall-street", "dhandho-investor", "one-up-on-wall-street", "security-analysis"]),
    ("negotiation", "Negotiation", "Power & Strategy", ["never-split", "getting-to-yes", "48-laws-of-power", "how-to-win-friends", "influence? no", "laws-human-nature"]),
    ("discipline", "Discipline and Self-Control", "Self-Improvement", ["war-of-art", "discipline-is-destiny? no", "eat-that-frog", "atomic-habits", "no-options? no", "grit", "deep-work", "turning-pro"]),
    ("leadership", "Leadership", "Leadership", ["extreme-ownership", "leaders-eat-last", "the-quiet-leader", "turn-the-ship-around", "working-backwards", "seven-habits? no", "7-habits", "the-five-dysfunctions? no", "dysfunctions? no", "radical-candor"]),
    ("startups", "Startups and Building Something New", "Business & Startups", ["lean-startup", "zero-to-one", "rework", "mom-test", "hard-things", "working-backwards", "that-will-never-work", "everything-store"]),
    ("productivity", "Productivity and Getting Things Done", "Productivity", ["gtd", "deep-work", "eat-that-frog", "make-time", "the-one-thing", "essentialism", "ultralearning", "the-first-20-hours"]),
    ("psychology-of-people", "Understanding People", "Psychology & People", ["influence? no", "games-people-play", "laws-human-nature", "48-laws-of-power", "thinking-fast-slow", "how-to-win-friends", "attached", "emotional-intelligence"]),
    ("communication", "Communication That Lands", "Psychology & People", ["how-to-win-friends", "never-split", "nonviolent-communication", "crucial-conversations", "games-people-play", "charisma-myth? no"]),
    ("finding-purpose", "Purpose and Meaning", "Self-Improvement", ["mans-search", "start-with-why", "ikigai", "almanack-naval", "siddhartha", "mastery-greene", "essentialism", "the-defining-decade"]),
    ("career-growth", "Growing a Career", "Self-Improvement", ["so-good", "mastery-greene", "7-habits", "the-defining-decade", "gtd", "range? no", "the-first-20-hours", "deep-work"]),
    ("confidence", "Confidence and Self-Image", "Self-Improvement", ["psycho-cybernetics", "thinking-big", "courage-disliked", "mindset", "unlimited-power", "subtle-art", "the-comparison-tax"]),
    ("relationships", "Love and Relationships", "Psychology & People", ["attached", "5-love-languages? no", "games-people-play", "nonviolent-communication", "7-habits", "hold-me-tight? no", "lost-connections"]),
    ("decisions", "Better Decisions", "Psychology & People", ["thinking-in-bets", "thinking-fast-slow", "art-of-thinking-clearly", "the-decision-room", "super-thinking? no", "influence? no", "zero-to-one", "working-backwards"]),
    ("creativity", "Creativity and Making Things", "Creativity", ["war-of-art", "turning-pro", "the-creative-act", "steal-like-an-artist", "big-magic", "bird-by-bird", "on-writing", "artists-way"]),
    ("stoicism", "Stoicism", "Self-Improvement", ["meditations", "letters-from-a-stoic", "daily-stoic", "obstacle-is-way", "practicing-stoic", "courage-disliked", "stillness-is-key? no"]),
    ("history", "Big-Picture History", "History", ["sapiens", "guns-germs-and-steel", "the-silk-roads", "prisoners-of-geography", "homo-deus", "brief-history-time", "spqr? no", "the-gene"]),
    ("stress-and-anxiety", "Stress and Overthinking", "Psychology & People", ["lost-connections", "untethered-soul", "thinking-fast-slow", "dont-believe-everything? no", "why-we-sleep", "breath? no", "subtle-art", "art-of-thinking-clearly"]),
    ("time-management", "Time Management", "Productivity", ["gtd", "make-time", "the-one-thing", "eat-that-frog", "essentialism", "deep-work", "168-hours? no", "the-first-20-hours"]),
    ("business-failures", "Why Companies Fail", "Business & Startups", ["innovators-dilemma", "the-quiet-giant", "working-backwards", "that-will-never-work", "good-to-great", "built-to-last", "hard-things", "the-moat-map"]),
    ("selling", "Selling and Persuasion", "Business & Startups", ["influence? no", "never-split", "how-to-win-friends", "mom-test", "100m-offers", "100m-leads", "this-is-marketing? no", "made-to-stick? no"]),
    ("sleep-and-health", "Sleep and the Body", "Self-Improvement", ["why-we-sleep", "breath? no", "unlimited-power", "lost-connections", "atomic-habits", "the-upside-of-stress? no"]),
    ("self-improvement-beginners", "Self-Improvement: Where to Start", "Self-Improvement", ["atomic-habits", "psychology-of-money", "subtle-art", "7-habits", "thinking-fast-slow", "deep-work", "mans-search", "almanack-naval"]),
    ("indian-authors", "Books by Indian Authors and India-First Reads", "Business & Startups", ["lets-talk-money", "coffee-can-investing", "dhandho-investor", "chai-stall-ceo", "monsoon-portfolio? no", "india-uncensored? no", "cashflow? no", "tiffin-code? no"]),
    ("learning-fast", "Learning Anything Faster", "Productivity", ["ultralearning", "the-first-20-hours", "make-time", "grit", "mindset", "peak? no", "mastery-greene", "deep-work"]),
    ("beat-procrastination", "Beating Procrastination", "Self-Improvement", ["eat-that-frog", "war-of-art", "the-first-20-hours", "indistractable", "gtd", "atomic-habits", "turning-pro", "the-slight-edge? no"]),
]
made_best = 0
R = '../../'
for slug, label, cat, ids in TOPICS:
    picks = valid([i for i in ids if '? no' not in i])
    picks = [i for i in picks if i in by_id and cover_ok(by_id[i])]
    if len(picks) < 5:
        print('SKIP best', slug, 'only', len(picks)); continue
    picks = picks[:8]
    rows = []
    for n, bid in enumerate(picks, 1):
        b = by_id[bid]
        rows.append(f'''      <li class="pseo__item">
        <a class="pseo__itemlink" href="{R}books/{b['id']}.html">
          <span class="pseo__num">{n}</span>
          <img class="pseo__cover" src="{R}{b['cover']}" alt="{esc(b['title'])} book cover" loading="lazy" width="54" height="81">
          <span class="pseo__ibody">
            <b class="pseo__btitle" translate="no">{esc(b['title'])}</b>
            <span class="pseo__meta">by <span translate="no">{esc(b['author'])}</span> &middot; {b['year']} &middot; {esc(b['readTime'])} read</span>
            <span class="pseo__why">{esc(b['oneLiner'])}</span>
            <span class="pseo__go">READ THE FREE BREAKDOWN &rarr;</span>
          </span>
        </a>
      </li>''')
    items = '\n'.join(rows)
    T = f"The {len(picks)} Best Books on {label}"
    page = PSEO_TPL.format(
        TITLE=f"{T} (Free Summaries) | TheSmallBook",
        DESC=esc(f"The best books on {label.lower()}, chosen from a {len(BOOKS)}-book free library: what each one argues, who wrote it, and which free summary to start with."),
        CANON=f"https://thesmallbook.in/pseo/best-books-on/{slug}.html",
        H1=T,
        INTRO=f"Every list of books on {label.lower()} recommends the same three titles and stops. This one starts from the whole shelf: {len(BOOKS)} books distilled into lessons, examples and action steps. These {len(picks)} are the ones worth your week, and every one is free to read here, right now, in your language.",
        LIST=items,
        CRUMB=f"<a href=\"{R}index.html\">Library</a> &rsaquo; Best books on {esc(label.lower())}",
        LD=json.dumps(ld_item_list(f"Best books on {label}", [by_id[i] for i in picks]), ensure_ascii=False, separators=(',', ':')), R=R)
    open(f'{OUT}/best-books-on/{slug}.html', 'w', encoding='utf-8').write(page)
    made.append(('best', slug)); made_best += 1
print('BEST pages:', made_best)

# ---------------- VS pages ----------------
PAIRS = [
    ("atomic-habits", "power-of-habit"), ("atomic-habits", "tiny-habits"), ("atomic-habits", "the-compound-effect"),
    ("atomic-habits", "grit"), ("atomic-habits", "mindset"), ("atomic-habits", "essentialism"),
    ("deep-work", "indistractable"), ("deep-work", "make-time"), ("deep-work", "digital-minimalism"),
    ("deep-work", "gtd"), ("deep-work", "ultralearning"), ("psychology-of-money", "rich-dad-poor-dad"),
    ("psychology-of-money", "intelligent-investor"), ("psychology-of-money", "richest-man-babylon"),
    ("psychology-of-money", "iwt-rich"), ("psychology-of-money", "simple-path-wealth"),
    ("rich-dad-poor-dad", "think-and-grow-rich"), ("rich-dad-poor-dad", "total-money-makeover"),
    ("intelligent-investor", "common-stocks-and-uncommon-profits"), ("intelligent-investor", "simple-path-wealth"),
    ("intelligent-investor", "coffee-can-investing"), ("richest-man-babylon", "psychology-of-money"),
    ("48-laws-of-power", "how-to-win-friends"), ("48-laws-of-power", "laws-human-nature"),
    ("never-split", "getting-to-yes"), ("never-split", "how-to-win-friends"), ("meditations", "letters-from-a-stoic"),
    ("meditations", "daily-stoic"), ("meditations", "obstacle-is-way"), ("sapiens", "homo-deus"),
    ("sapiens", "guns-germs-and-steel"), ("the-silk-roads", "guns-germs-and-steel"), ("sapiens", "the-silk-roads"),
    ("lean-startup", "zero-to-one"), ("lean-startup", "rework"), ("zero-to-one", "rework"),
    ("mom-test", "lean-startup"), ("hard-things", "working-backwards"), ("working-backwards", "rework"),
    ("everything-store", "that-will-never-work"), ("shoe-dog", "everything-store"), ("shoe-dog", "elon-musk"),
    ("grit", "mindset"), ("grit", "mastery-greene"), ("flow", "deep-work"), ("thinking-fast-slow", "thinking-in-bets"),
    ("thinking-fast-slow", "art-of-thinking-clearly"), ("7-habits", "atomic-habits"), ("7-habits", "12-rules"),
    ("mans-search", "start-with-why"), ("mans-search", "almanack-naval"), ("almanack-naval", "ikigai"),
    ("psycho-cybernetics", "thinking-big"), ("psycho-cybernetics", "unlimited-power"), ("subtle-art", "courage-disliked"),
    ("attached", "games-people-play"), ("eat-that-frog", "gtd"), ("eat-that-frog", "the-one-thing"),
    ("war-of-art", "turning-pro"), ("war-of-art", "the-creative-act"), ("mastery-greene", "so-good"),
    ("so-good", "range"), ("the-defining-decade", "grit"), ("lost-connections", "why-we-sleep"),
    ("ultralearning", "the-first-20-hours"), ("essentialism", "the-one-thing"), ("indistractable", "make-time"),
    ("chai-stall-ceo", "rework"), ("the-quiet-leader", "extreme-ownership"), ("dhandho-investor", "coffee-can-investing"),
    ("lets-talk-money", "iwt-rich"), ("dhandho-investor", "one-up-on-wall-street"),
]
made_vs = 0
R = '../../'
for a, b in PAIRS:
    ba, bb = by_id.get(a), by_id.get(b)
    if not ba or not bb or not cover_ok(ba) or not cover_ok(bb) or ba['category'] != bb['category']:
        print('SKIP vs', a, b); continue
    def readif(x, book):
        return f"<span class=\"notranslate\" translate=\"no\">Read {esc(book['title'])}</span> if {x}"
    slug = f"{a}-vs-{b}"
    title = f"{ba['title']} vs {bb['title']}: Which Should You Actually Read? | TheSmallBook"
    desc = esc(f"{ba['title']} or {bb['title']}? Both, honestly, but in an order. A straight comparison: what each book argues, where they clash, which free summary to read first.")
    page = PSEO_TPL.format(
        TITLE=title, DESC=desc,
        CANON=f"https://thesmallbook.in/pseo/vs/{slug}.html",
        H1=f"{esc(ba['title'])} vs {esc(bb['title'])}: Which Should You Actually Read?",
        INTRO=(f"Both books live on the same shelf: {esc(ba['category'])}. Both are free to read here, in full, right now. "
               f"<span class=\"notranslate\" translate=\"no\">{esc(ba['title'])}</span> ({ba['year']}, {esc(ba['author'])}) argues: {esc(ba['oneLiner'][:100])}… "
               f"<span class=\"notranslate\" translate=\"no\">{esc(bb['title'])}</span> ({bb['year']}, {esc(bb['author'])}) argues: {esc(bb['oneLiner'][:100])}…"),
        LIST=f'''      <div class="pseo__vs">
        <div class="pseo__vcol">
          <img src="{R}%s" alt="%s book cover" loading="lazy" width="90" height="135">
          <h3 translate="no">%s</h3>
          <p class="pseo__meta">by <span translate="no">%s</span> &middot; %s &middot; %s read</p>
          <p>%s</p>
          <a class="pseo__go" href="{R}books/%s.html">READ %s FREE &rarr;</a>
        </div>
        <div class="pseo__vcol">
          <img src="{R}%s" alt="%s book cover" loading="lazy" width="90" height="135">
          <h3 translate="no">%s</h3>
          <p class="pseo__meta">by <span translate="no">%s</span> &middot; %s &middot; %s read</p>
          <p>%s</p>
          <a class="pseo__go" href="{R}books/%s.html">READ %s FREE &rarr;</a>
        </div>
      </div>
      <section class="seoblock">
        <h2>&#9878; The Straight Answer</h2>
        <p>%s</p>
        <p>%s</p>
        <p>%s</p>
      </section>''' % (
            ba['cover'], esc(ba['title']), esc(ba['title']), esc(ba['author']), ba['year'], esc(ba['readTime']), esc(ba['bigIdea'][:260]), ba['id'], esc(ba['title'].upper()),
            bb['cover'], esc(bb['title']), esc(bb['title']), esc(bb['author']), bb['year'], esc(bb['readTime']), esc(bb['bigIdea'][:260]), bb['id'], esc(bb['title'].upper()),
            readif(f"you want {esc(ba['tagline'][:70]).lower()}", ba),
            readif(f"you want {esc(bb['tagline'][:70]).lower()}", bb),
            ("The honest order for most readers: start with <span class=\"notranslate\" translate=\"no\">" + esc((ba if len(ba['title']) <= len(bb['title']) else bb)['title']) + "</span> for the base, then go deeper with the other. Both summaries are free, no paywall, in 26 languages.")),
        CRUMB=f"<a href=\"{R}index.html\">Library</a> &rsaquo; <span translate=\"no\">{esc(ba['title'])}</span> vs <span translate=\"no\">{esc(bb['title'])}</span>",
        R=R,
        LD=json.dumps([
            {"@context": "https://schema.org", "@type": "Article",
             "headline": f"{ba['title']} vs {bb['title']}: Which Should You Actually Read?",
             "author": {"@type": "Person", "name": "Jash Gandhi", "url": "https://thesmallbook.in/about.html"},
             "publisher": {"@type": "Organization", "name": "TheSmallBook", "url": "https://thesmallbook.in"},
             "mainEntityOfPage": f"https://thesmallbook.in/pseo/vs/{slug}.html",
             "about": [{"@type": "Book", "name": ba['title'], "author": {"@type": "Person", "name": ba['author']}},
                        {"@type": "Book", "name": bb['title'], "author": {"@type": "Person", "name": bb['author']}}]},
        ], ensure_ascii=False, separators=(',', ':')))
    open(f'{OUT}/vs/{slug}.html', 'w', encoding='utf-8').write(page)
    made.append(('vs', slug)); made_vs += 1
print('VS pages:', made_vs)

# ---------------- hub ----------------
def group_links(kind, sub, label_fn):
    out = []
    for k, sid in made:
        if k != kind: continue
        if kind == 'like':
            t = by_id[sid]['title']
            out.append(f'<li><a href="{sub}/{sid}.html" translate="no">Books like {esc(t)}</a></li>')
        elif kind == 'best':
            lab = dict((s, l) for s, l, c, i in TOPICS).get(sid, sid)
            out.append(f'<li><a href="{sub}/{sid}.html">{esc(lab)}</a></li>')
        else:
            a, b = sid.split('-vs-')
            out.append(f'<li><a href="{sub}/{sid}.html"><span translate="no">{esc(by_id[a]["title"])}</span> vs <span translate="no">{esc(by_id[b]["title"])}</span></a></li>')
    return '\n'.join(out)

R = '../'
hub = PSEO_TPL.format(
    TITLE="Reading Lists: Books Like X, Best Books On Y, Head-to-Heads | TheSmallBook",
    DESC=esc("Every reading list on TheSmallBook: books like your favourites, the best books by problem, and honest head-to-head comparisons. All free, all in your language."),
    CANON="https://thesmallbook.in/pseo/index.html",
    H1="Reading Lists",
    INTRO="Answering the searches readers actually type: what to read after a book you loved, the best books on a problem you have, and which of two famous books to open first. Every link lands on a free summary.",
    LIST=
      '<section class="seoblock"><h2>&#128218; Books Like&hellip;</h2><ul class="pseo__hub">' + group_links('like', 'books-like', None) + '</ul></section>' +
      '<section class="seoblock"><h2>&#127919; Best Books On&hellip;</h2><ul class="pseo__hub">' + group_links('best', 'best-books-on', None) + '</ul></section>' +
      '<section class="seoblock"><h2>&#9878; Head to Head</h2><ul class="pseo__hub">' + group_links('vs', 'vs', None) + '</ul></section>',
    CRUMB='<a href="{R}index.html">Library</a> &rsaquo; Reading lists',
    R=R,
    LD='{"@context":"https://schema.org","@type":"CollectionPage","name":"Reading Lists","publisher":{"@type":"Organization","name":"TheSmallBook"}}')
open(f'{OUT}/index.html', 'w', encoding='utf-8').write(hub)
made.append(('hub', 'index'))
print('TOTAL pseo pages:', len(made))
