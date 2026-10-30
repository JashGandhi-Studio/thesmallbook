#!/usr/bin/env python3
"""v336: add new books from JSON batches into js/data-full.js, plus everything a
book needs around it: editions palette line (cover), SEO page books/<id>.html,
sitemap entry and the Originals list. Idempotent: re-running replaces books
with the same id instead of duplicating them.

Usage: python3 tools/add_books.py <dir-with-json-batches> [--dry]
Then:  python3 tools/split_data.py ; python3 tools/editions/render.py --only <files>
"""
import json, os, re, sys, glob, hashlib, html, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = sys.argv[1]
DRY = '--dry' in sys.argv
os.chdir(ROOT)

def clean(s):
    if isinstance(s, str):
        s = s.replace('\u2014', ', ').replace('\u2013', '-').replace(' ,', ',')
        return re.sub(r'\s+', ' ', s).strip()
    if isinstance(s, list): return [clean(x) for x in s]
    if isinstance(s, dict): return {k: clean(v) for k, v in s.items()}
    return s

def load_full():
    js = 'const fs=require("fs");const B=new Function(fs.readFileSync("js/data-full.js","utf8").replace(/if \\(typeof window[^\\n]*/,"")+";return BOOKS")();console.log(JSON.stringify(B))'
    return json.loads(subprocess.check_output(['node', '-e', js]))

def grave_ids():
    js = 'const fs=require("fs");const s=fs.readFileSync("js/failures.js","utf8");const m=s.match(/"id"\\s*:\\s*"([^"]+)"|\\bid\\s*:\\s*"([^"]+)"/g)||[];console.log(JSON.stringify(m.map(x=>x.replace(/.*"([^"]+)"$/,"$1"))))'
    return set(json.loads(subprocess.check_output(['node', '-e', js])))

new = []
for f in sorted(glob.glob(os.path.join(SRC, '*.json'))):
    for b in json.load(open(f, encoding='utf-8')):
        new.append(clean(b))
books = load_full()
by = {b['id']: i for i, b in enumerate(books)}
graves = grave_ids()
REQ = ['id', 'title', 'author', 'year', 'category', 'tagline', 'oneLiner', 'bigIdea', 'quotes', 'lessons', 'actionPlan', 'caveat', 'graveLink']
errs = []
seen = set()
for b in new:
    for k in REQ:
        if k not in b or b[k] in ('', None, []): errs.append('%s missing %s' % (b.get('id'), k))
    if b['id'] in seen: errs.append('dup in batch ' + b['id'])
    seen.add(b['id'])
    if len(b['lessons']) < 8: errs.append('%s only %d lessons' % (b['id'], len(b['lessons'])))
    for i, l in enumerate(b['lessons']):
        for k in ('title', 'chapter', 'summary', 'example', 'action'):
            if not l.get(k): errs.append('%s lesson %d missing %s' % (b['id'], i, k))
    if b['graveLink'] not in graves: errs.append('%s bad graveLink %s' % (b['id'], b['graveLink']))
    if b['id'] in by and not b.get('_replace', True): errs.append('exists ' + b['id'])
    # same title already in the library under another id?
    for o in books:
        if o['id'] != b['id'] and o['title'].lower() == b['title'].lower(): errs.append('title clash %s vs %s' % (b['id'], o['id']))
if errs:
    print('\n'.join(errs)); sys.exit(1)

def read_time(b):
    words = sum(len((l['summary'] + ' ' + l['example'] + ' ' + l['action']).split()) for l in b['lessons'])
    words += len(b['bigIdea'].split())
    # New editions are designed as long reads. Estimate at a calm, readable pace
    # and never present eight substantial lessons as an 8-minute skim.
    return '%d min' % max(11, round(words / 165))

ORIG = [b['id'] for b in new if b['author'].lower() == 'unknown']
KEYS = ['id', 'title', 'author', 'year', 'category', 'cover', 'readTime', 'tagline', 'oneLiner', 'bigIdea', 'quotes', 'lessons', 'actionPlan', 'caveat', 'graveLink']
for b in new:
    b['cover'] = 'assets/covers/%s.jpg' % b['id']
    b['readTime'] = read_time(b)
    o = {k: b[k] for k in KEYS}
    if b['id'] in by: books[by[b['id']]] = o
    else: by[b['id']] = len(books); books.append(o)

nb = len(books); nl = sum(len(b['lessons']) for b in books)
print('books', nb, 'lessons', nl, 'new', len(new), 'originals', len(ORIG))
if DRY: sys.exit(0)

# 1. data-full.js (same pretty format the repo uses)
out = 'const BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=2).replace('\n', '\n') + ';\nif (typeof window !== "undefined") window.BOOKS = BOOKS;\n'
open('js/data-full.js', 'w', encoding='utf-8').write(out)

# 2. Originals list in config.js
if ORIG:
    c = open('js/config.js', encoding='utf-8').read()
    m = re.search(r'ORIGINALS:\s*\[(.*?)\]', c, re.S)
    have = re.findall(r'"([^"]+)"', m.group(1))
    add = [i for i in ORIG if i not in have]
    if add:
        body = m.group(1).rstrip()
        body = body + ('' if body.endswith(',') else ',') + ''.join('\n    "%s",' % i for i in add)
        body = body.rstrip(',') + '\n  '
        c = c[:m.start(1)] + body + c[m.end(1):]
        open('js/config.js', 'w', encoding='utf-8').write(c)

# 3. editions palette lines (cover renderer). Borrow a palette from the same category.
ep = 'tools/editions/editions.jsonl'
eds = [json.loads(l) for l in open(ep, encoding='utf-8') if l.strip()]
have = {e['id'] for e in eds}
pal = {}
for e in eds:
    if not e.get('keep'): pal.setdefault(e['c'], []).append(e)
allp = [e for e in eds if not e.get('keep')]
for b in new:
    if b['id'] in have: continue
    h = int(hashlib.md5(b['id'].encode()).hexdigest()[:8], 16)
    pool = pal.get(b['category']) or allp
    p = pool[h % len(pool)]
    e = {'id': b['id'], 't': b['title'], 'a': b['author'], 'c': b['category'], 'bg': p['bg'], 'fg': p['fg'], 'ac': p['ac'], 'tc': p['tc'], 'sq': False, 'h': h, 'file': b['id'] + '.jpg'}
    if b['id'] in ORIG: e['keep'] = True
    eds.append(e)
open(ep, 'w', encoding='utf-8').write(''.join(json.dumps(e, ensure_ascii=False) + '\n' for e in eds))
# Match the 3D-spine palette in the same run. Keep it generated, never hand-edit it.
def enc_hex(v): return ''.join(chr(97 + int(x, 16)) for x in v.lstrip('#').lower())
spines = {e['id']: enc_hex(e['bg']) + enc_hex(e['fg']) + enc_hex(e['ac']) for e in eds if e.get('bg') and e.get('fg') and e.get('ac')}
open('js/editions-data.js', 'w', encoding='utf-8').write('/* TheSmallBook editions: generated from tools/editions/editions.jsonl. */\nwindow.TSB_ED = ' + json.dumps(spines, separators=(',', ':')) + ';\n')

# 4. SEO pages, cloned from the shape of an existing page
tpl = open('books/mandi-math.html', encoding='utf-8').read()
head_end = tpl.index('<main class="seopage">')
foot_start = tpl.index('</main>')
E = lambda s: html.escape(str(s), quote=True)
def page(b):
    t = b['title']; a = b['author']; n = len(b['lessons'])
    desc = '%s by %s: the small read. %s' % (t, a, b['oneLiner'])
    desc = desc if len(desc) < 158 else desc[:155].rsplit(' ', 1)[0] + '\u2026'
    head = tpl[:head_end]
    head = re.sub(r'<title>.*?</title>', '<title>%s Summary - Key Lessons, Notes &amp; Action Steps | TheSmallBook</title>' % E(t), head, flags=re.S)
    head = re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"', lambda m: m.group(1) + E(desc) + '"', head)
    head = re.sub(r'(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*"', lambda m: m.group(1) + E(t) + ' Summary - Key Lessons, Notes &amp; Action Steps | TheSmallBook"', head)
    head = head.replace('books/mandi-math.html', 'books/%s.html' % b['id'])
    ld = [{"@context": "https://schema.org", "@type": "Article", "headline": t + " - Summary & Key Lessons",
           "about": {"@type": "Book", "name": t, "author": {"@type": "Person", "name": a}, "datePublished": str(b['year'])},
           "author": {"@type": "Person", "name": "Jash Gandhi", "url": "https://thesmallbook.in/about.html"},
           "publisher": {"@type": "Organization", "name": "TheSmallBook", "url": "https://thesmallbook.in"},
           "mainEntityOfPage": "https://thesmallbook.in/books/%s.html" % b['id']}]
    head = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', head, count=1, flags=re.S)
    orig = b['id'] in ORIG
    m = ['<main class="seopage">\n', '    <header class="seohero">',
         '      <p class="seocrumb"><a href="../index.html">Library</a> \u203a %s</p>' % E(b['category']),
         '      <h1>%s - Summary &amp; Key Lessons</h1>' % E(t),
         '      <p class="seometa">by %s \u00b7 %s \u00b7 %s \u00b7 \u23f1 %s read \u00b7 %d lessons</p>' % (E(a), b['year'], E(b['category']), b['readTime'], n)]
    if orig: m.append('      <div class="origband" style="margin:14px auto 0;"><span class="origband__row">\u2726 THE SMALLBOOK ORIGINAL \u2726</span><small>Written in-house. You will not find this book anywhere else.</small></div>')
    m += ['      <img class="seocover" src="../assets/covers/%s.jpg" alt="%s book cover" width="180" loading="lazy">' % (b['id'], E(t)),
          '      <p class="seotagline">%s</p>' % E(b['tagline']),
          '      <a class="btn btn--yellow" href="../book.html?id=%s">\U0001f4d6 OPEN THE FULL INTERACTIVE BREAKDOWN \u2192</a>' % b['id'],
          '      <p class="seolang">\U0001f310 Read it in Hindi, Hinglish, Gujarati, Tamil &amp; 22 more languages, with audio.</p>',
          '    </header>', '    <section class="seoblock">', '      <h2>\U0001f4a1 The Big Idea</h2>', '      <p>%s</p>' % E(b['bigIdea']), '    </section>',
          '    <h2 class="seoh2">\U0001f9e0 The %d Key Lessons</h2>' % n]
    for i, l in enumerate(b['lessons']):
        m += ['    <section class="seoblock">', '        <h3>Lesson %d: %s</h3>' % (i + 1, E(l['title'])), '        <p class="seochapter">%s</p>' % E(l['chapter']),
              '        <p>%s</p>' % E(l['summary']),
              '        <p><strong>\U0001f4d6 Example:</strong> %s <a href="../book.html?id=%s#lesson-%d">Read the full example \u2192</a></p>' % (E(l['example']), b['id'], i),
              '        <p><strong>\u26a1 Do this:</strong> %s</p>' % E(l['action']), '      </section>']
    m += ['    <section class="seoblock">', '      <h2>\u2705 5-Step Action Plan</h2>', '      <ol>%s</ol>' % ''.join('<li>%s</li>' % E(x) for x in b['actionPlan']), '    </section>',
          '    <section class="seoblock seoblock--caveat">', '      <h2>\u26a0\ufe0f When This Doesn\'t Work</h2>', '      <p>%s</p>' % E(b['caveat']), '    </section>',
          '    <section class="seoblock seoblock--grave">', '      <h2>\U0001f480 The Graveyard Proves It</h2>',
          '      <p><a href="../graveyard.html#grave=%s">Read the related case study \u2192</a></p>' % b['graveLink'], '    </section>',
          '    <section class="seoblock">', '      <h2>\U0001f4ac Best Quotes from %s</h2>' % E(t), '      <ul>%s</ul>' % ''.join('<li>\u201c%s\u201d</li>' % E(q) for q in b['quotes']), '    </section>',
          '    <section class="seoblock seocta">', '      <a class="btn btn--yellow" href="../book.html?id=%s">\U0001f4d6 READ THE FULL BREAKDOWN</a>' % b['id'],
          '      <p>Interactive version: mark lessons as read, listen in your language, share quote cards.</p>', '    </section>', '  ']
    return head + '\n'.join(m) + tpl[foot_start:]
for b in new:
    open('books/%s.html' % b['id'], 'w', encoding='utf-8').write(page(b))

# 5. sitemap
sm = open('sitemap.xml', encoding='utf-8').read()
add = ''.join('<url><loc>https://thesmallbook.in/books/%s.html</loc><lastmod>2026-10-30</lastmod><priority>0.8</priority></url>\n' % b['id'] for b in new if 'books/%s.html' % b['id'] not in sm)
if add:
    sm = sm.replace('</urlset>', add + '</urlset>')
    open('sitemap.xml', 'w', encoding='utf-8').write(sm)
print('done; covers to render:', ','.join(b['id'] + '.jpg' for b in new if b['id'] not in ORIG))
