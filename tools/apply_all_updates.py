#!/usr/bin/env python3
"""
tools/apply_all_updates.py
Applies all updates:
1. Appends 40 new failures to js/failures.js
2. Appends 40 entries to js/graveyard-content.js
3. Generates 40 graveyard/[id].html pages
"""
import json, os, re

from forty_failures_data import FORTY_FAILURES

def update_failures():
    with open("js/failures.js", "r", encoding="utf-8") as f:
        src = f.read()
    
    start_bracket = src.find("[")
    end_bracket = src.rfind("]")
    existing = json.loads(src[start_bracket:end_bracket+1])
    print(f"Existing failures in failures.js: {len(existing)}")
    
    # Strip origin and fall from failure object for failures.js
    clean_forty = []
    for x in FORTY_FAILURES:
        item = {k: v for k, v in x.items() if k not in ("origin", "fall")}
        clean_forty.append(item)
    
    all_failures = existing + clean_forty
    print(f"New total failures: {len(all_failures)}")
    
    new_src = "window.FAILURES = " + json.dumps(all_failures, ensure_ascii=False) + ";\n"
    with open("js/failures.js", "w", encoding="utf-8") as f:
        f.write(new_src)
    print("js/failures.js updated successfully!")

def update_graveyard_content():
    with open("js/graveyard-content.js", "r", encoding="utf-8") as f:
        src = f.read()
    
    m = re.search(r"window\.GRAVE_DEEP\s*=\s*(\{[\s\S]*?\});?\s*$", src)
    if not m:
        raise ValueError("Could not find window.GRAVE_DEEP in js/graveyard-content.js")
    
    deep = json.loads(m.group(1))
    print(f"Existing entries in GRAVE_DEEP: {len(deep)}")
    
    for x in FORTY_FAILURES:
        deep[x["id"]] = {
            "origin": x["origin"],
            "fall": x["fall"]
        }
    
    print(f"New total entries in GRAVE_DEEP: {len(deep)}")
    
    header = """/* ============================================================
   THESMALLBOOK, 💀 GRAVEYARD TWO-ACT STORIES (graveyard-content.js) · v323
   Full, honest narrative for every autopsy: HOW IT STARTED
   and THE FALL. Built from the 400 hand-authored case-study pages.
   ============================================================ */
(function () {
  "use strict";
  if (window.GRAVE_DEEP) return;
  window.GRAVE_DEEP = """
    footer = """;
})();
"""
    new_src = header + json.dumps(deep, ensure_ascii=False) + footer
    with open("js/graveyard-content.js", "w", encoding="utf-8") as f:
        f.write(new_src)
    print("js/graveyard-content.js updated successfully!")

def generate_graveyard_html():
    with open("js/data.js", "r", encoding="utf-8") as f:
        b_src = f.read()
        b_src = b_src[b_src.find("["):b_src.rfind("]")+1]
        books = json.loads(b_src)
    bmap = {b["id"]: b for b in books}
    
    template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1">
  <title>Why Did {name} Fail? Case Study &amp; Lesson | TheSmallBook</title>
  <meta name="description" content="{name} ({year}): free case study, no paywall. {title}. Loss: {loss}. What happened, the fatal mistake...">
  <meta name="author" content="Jash Gandhi">
  <link rel="canonical" href="https://thesmallbook.in/graveyard/{id}.html">
  <meta property="og:title" content="Why Did {name} Fail? Case Study &amp; Lesson | TheSmallBook">
  <meta property="og:description" content="{name} ({year}): free case study, no paywall. {title}. Loss: {loss}. What happened, the fatal mistake...">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://thesmallbook.in/graveyard/{id}.html">
  <meta property="og:site_name" content="TheSmallBook">
  <meta property="og:image" content="https://thesmallbook.in/assets/og-image.png">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta name="twitter:image" content="https://thesmallbook.in/assets/og-image.png">
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
  <link rel="stylesheet" href="../css/style.css?v=323">
  <link rel="icon" href="../favicon.ico" sizes="32x32">
  <link rel="icon" type="image/png" sizes="512x512" href="../favicon.png">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <script type="application/ld+json">[{{"@context":"https://schema.org","@type":"Article","headline":"Why Did {name} Fail? ({year})","author":{{"@type":"Person","name":"Jash Gandhi","url":"https://thesmallbook.in/about.html"}},"publisher":{{"@type":"Organization","name":"TheSmallBook","url":"https://thesmallbook.in"}},"mainEntityOfPage":"https://thesmallbook.in/graveyard/{id}.html","inLanguage":"en"}},{{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{{"@type":"Question","name":"Why did {name} fail?","acceptedAnswer":{{"@type":"Answer","text":"{mistake_json}"}}}},{{"@type":"Question","name":"How much did {name} lose?","acceptedAnswer":{{"@type":"Answer","text":"{loss_json}"}}}},{{"@type":"Question","name":"What is the lesson from {name}'s failure?","acceptedAnswer":{{"@type":"Answer","text":"{lesson_json}"}}}}]}}]</script>
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
  <main class="seopage">

    <header class="ghero ghero--grave">
      <div class="ghero__badge">💀 CASE STUDY · {category}</div>
      <div class="ghero__em">{emoji}</div>
      <h1>Why Did {name} Fail?</h1>
      <p class="ghero__title">{title}</p>
      <div class="ghero__stats">
        <div class="ghero__stat"><b>{year}</b><span>YEAR</span></div>
        <div class="ghero__stat"><b>☠️ {category}</b><span>CAUSE</span></div>
        <div class="ghero__stat ghero__stat--loss"><b>💸 {loss}</b><span>THE BURN</span></div>
      </div>
    </header>

    <section class="seoblock">
      <h2>📜 What Happened</h2>
      <p>{story}</p>
    </section>
    <section class="seoblock seoblock--mistake">
      <h2>☠️ The Fatal Mistake</h2>
      <p>{mistake}</p>
    </section>
    <section class="seoblock seoblock--lesson">
      <h2>🧠 The Lesson (Free for You)</h2>
      <p>{lesson}</p>
    </section>
    <section class="seoblock gantidote">
      <h2>📕 The Antidote Book</h2>
      <div class="gantidote__card">
        <img class="gantidote__cover" src="../assets/covers/{book}.jpg?v=323" alt="{bookTitle} cover" loading="lazy" width="120" onerror="this.src='../assets/covers/zero-to-one.webp'">
        <div class="gantidote__info">
          <b>{bookTitle}</b>
          <small>{bookAuthor} · {bookCategory} · {lessonCount} lessons</small>
          <p>{bookOneLiner}</p>
          <a class="gantidote__btn" href="../book.html?id={book}">📖 OPEN THE FULL INTERACTIVE BREAKDOWN →</a>
        </div>
      </div>
    </section>
    <section class="seoblock seocta">
      <a class="btn btn--red" href="../graveyard.html">💀 EXPLORE ALL 400 FAILURE CASE STUDIES</a>
      <p>Searchable, filterable, simple to read - they paid billions; you get the lesson.</p>
    </section>
  </main>
  <footer class="footer">
    <div class="head">📕 TheSmallBook</div>
    <p>Big books. Small reads. Original educational analyses - no book text reproduced. Support the authors: buy the full books.</p>
    <p class="affnote">As an Amazon Associate, TheSmallBook earns from qualifying purchases. It keeps the library going. 💛</p>
    <div class="credits">✦ MADE BY JASH GANDHI ✦</div>
    <p class="tiny"><a href="../about.html" style="color:inherit;">ABOUT</a>&nbsp;&nbsp;<strong><a href="../gold.html" style="color:inherit;">👑 TSB GOLD</a></strong>&nbsp;&nbsp;MUMBAI, INDIA&nbsp;&nbsp;<strong>EIGHT MINUTES A BOOK</strong></p>
  </footer>
  <script src="js/gate.js?v=323" defer></script>
</body>
</html>
"""
    created = 0
    for x in FORTY_FAILURES:
        b = bmap.get(x["book"], {})
        page = template.format(
            name=x["name"],
            year=x["year"],
            title=x["title"],
            loss=x["loss"],
            loss_json=x["loss"].replace('"', '\\"'),
            id=x["id"],
            category=x["category"],
            emoji=x["emoji"],
            story=x["story"],
            mistake=x["mistake"],
            mistake_json=x["mistake"].replace('"', '\\"'),
            lesson=x["lesson"],
            lesson_json=x["lesson"].replace('"', '\\"'),
            book=x["book"],
            bookTitle=x["bookTitle"],
            bookAuthor=b.get("author", "Author"),
            bookCategory=b.get("category", "Business"),
            lessonCount=len(b.get("lessons", [])) or 8,
            bookOneLiner=b.get("oneLiner", "Key insights and strategic models.")[:160] + "..."
        )
        dest = os.path.join("graveyard", f"{x['id']}.html")
        with open(dest, "w", encoding="utf-8") as f:
            f.write(page)
        created += 1
    print(f"Generated {created} graveyard HTML pages!")

if __name__ == "__main__":
    update_failures()
    update_graveyard_content()
    generate_graveyard_html()
