"""v324: apply the soft-neo design system (idempotent). python3 tools/apply_soft.py"""
import re, os, glob, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import soften
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(root)
DONE = 'SOFT NEO v324 START' in open('css/style.css', encoding='utf-8').read()
if not DONE: print('soften:', soften.run([f for f in glob.glob('css/*.css') + glob.glob('*.html') + glob.glob('js/*.js') + glob.glob('authors/*.html') + glob.glob('topics/*.html') if 'Copy' not in f and 'og-builder' not in f and 'soft-layer' not in f]))
# 1b. Georgia-led reading faces become Newsreader (Georgia stays as fallback)
GEORGIA = re.compile(r"(font-family\s*:\s*|font\s*:\s*[^;\"'{}]*?\d(?:px|rem|em)(?:/[\d.]+(?:px|rem|em)?)?\s+)(Georgia\b)")
for f in ([] if DONE else glob.glob('css/*.css') + glob.glob('*.html') + glob.glob('js/*.js')):
    if 'soft-layer' in f or 'og-builder' in f or 'Copy' in f or 'kids' in f: continue
    s0 = open(f, encoding='utf-8').read(); s1 = GEORGIA.sub(lambda m: m.group(1) + "Newsreader, Georgia", s0)
    if s1 != s0: open(f, 'w', encoding='utf-8').write(s1)
# 1. fonts: Archivo Black only for the wordmark
AB = re.compile(r"(font(?:-family)?\s*:\s*[^;\"'`{}]*?)'Archivo Black'")
n = 0
for f in ([] if DONE else glob.glob('css/*.css') + glob.glob('*.html') + glob.glob('js/*.js')):
    if 'soft-layer' in f or 'og-builder' in f or 'Copy' in f: continue
    s = open(f, encoding='utf-8').read(); o = s
    for _ in range(3): s = AB.sub(lambda m: m.group(1) + "'Space Grotesk'", s)
    s = s.replace("--font-head: 'Archivo Black',", "--font-head: 'Space Grotesk',")
    if s != o: open(f, 'w', encoding='utf-8').write(s); n += 1
print('font swaps in', n, 'files')
# 2. style.css: Newsreader import + palette + layer
p = 'css/style.css'; s = open(p, encoding='utf-8').read()
IMP = "@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap');\n"
if not s.startswith('@import'): s = IMP + s
s = s.replace('--bg: #f2ede2;', '--bg: #f6f1e7;').replace('--radius: 10px;', '--radius: 18px;')
layer = open('css/soft-layer.css', encoding='utf-8').read()
s = re.sub(r"/\* ==== SOFT NEO v324 START ==== \*/.*?/\* ==== SOFT NEO v324 END ==== \*/\n?", '', s, flags=re.S)
s = s.rstrip() + '\n\n' + layer
open(p, 'w', encoding='utf-8').write(s); print('style.css', len(s)//1024, 'KB')
