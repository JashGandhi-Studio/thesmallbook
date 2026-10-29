#!/usr/bin/env python3
"""TheSmallBook editions, step 1: read each original cover once and keep only
its colours (background, accent, type colour). Writes tools/editions/editions.jsonl (one cover per line).
The artwork itself is never reused; covers are redrawn by render.py."""
import json, os, re, colorsys, hashlib, subprocess, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COV = os.environ.get('TSB_ORIG_COVERS') or os.path.join(ROOT, 'assets', 'covers')

def books():
    js = r'''const fs=require("fs");const B=new Function(fs.readFileSync("js/data.js","utf8")+";return BOOKS")();
    const P=fs.readFileSync("js/podcast-data.js","utf8");const out={};
    B.forEach(b=>out[b.cover.split("/").pop()]=Object.assign({id:b.id,t:b.title,a:b.author,c:b.category},/^unknown$/i.test(b.author||"")?{keep:true}:{}));
    const re=/"([a-z0-9-]+)":\s*\{([^}]*)\}/g;let m;const g=(s,k)=>{const r=new RegExp(k+':\\s*"([^"]*)"').exec(s);return r?r[1]:"";};
    while((m=re.exec(P))){const t=g(m[2],"title");if(!t)continue;for(const ext of ["jpg","png","webp"]){const f=m[1]+"."+ext;if(!out[f])out[f]={id:m[1],t:t.replace(/ \(Hindi\)$/,""),dev:g(m[2],"dev"),a:g(m[2],"author"),c:"Classics"};}}
    console.log(JSON.stringify(out));'''
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))

def lum(c):
    r, g, b = [x / 255 for x in c]
    f = lambda v: v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)

def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + .05) / (lb + .05)

def hx(c): return '#%02X%02X%02X' % tuple(int(round(v)) for v in c)

def tame(c):
    """Keep the hue, avoid harsh extremes so every edition sits in the calm palette."""
    r, g, b = [x / 255 for x in c]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l > .86 and s < .2: h, l, s = .11, .95, .38   # white or grey paper -> one warm paper white
    elif l > .95: l, s = .945, min(s, .25)
    if l < .07: l = .10                            # pure black -> soft ink
    if s > .92: s = .88
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return (r * 255, g * 255, b * 255)

CAT = {'Self-Improvement': (255, 200, 0), 'Productivity': (31, 58, 95), 'Money & Finance': (47, 125, 91),
       'Psychology & People': (111, 91, 217), 'Business & Startups': (255, 122, 89), 'Power & Strategy': (122, 28, 36),
       'Creativity': (255, 169, 204), 'History': (166, 124, 82), 'Leadership': (37, 199, 156), 'Classics': (239, 230, 211)}

def load(path, size):
    """Open a cover and trim 6% off each edge: scans and photos carry dark rims that are not the cover."""
    im = Image.open(path).convert('RGB')
    # v329: many scraped originals sit on a white (or black) letterbox. Trim that frame first,
    # or the frame's white wins the border vote and a red cover turns into a white edition.
    try:
        from PIL import ImageChops
        corner = im.getpixel((0, 0))
        if (max(corner) - min(corner)) < 24 and (min(corner) > 225 or max(corner) < 30):
            diff = ImageChops.difference(im, Image.new('RGB', im.size, corner)).convert('L').point(lambda v: 255 if v > 34 else 0)
            bb = diff.getbbox()
            if bb and (bb[2] - bb[0]) * (bb[3] - bb[1]) < .9 * im.size[0] * im.size[1] and (bb[2] - bb[0]) > im.size[0] * .3:
                im = im.crop(bb)
    except Exception:
        pass
    w, h = im.size; dx, dy = int(w * .06), int(h * .06)
    return im.crop((dx, dy, w - dx, h - dy)).resize(size)

def signature(path):
    im = load(path, (96, 144))
    bins = {}
    for r, g, b in im.getdata():
        h, sv, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if sv > .32 and .3 < v < .97:
            k = int(h * 24) % 24
            bins.setdefault(k, []).append((r, g, b))
    if not bins: return None
    k, px = max(bins.items(), key=lambda kv: len(kv[1]))
    if len(px) < 96 * 144 * .012: return None
    n = len(px); return tuple(sum(p[i] for p in px) / n for i in range(3))

# v329: originals that are photos (a hand holding the book, a phone, a frame) give the wrong colours.
# These are the true cover colours, set by eye: (ground, accent).
OVR = {
    'rich-dad-poor-dad.jpg': ((90, 45, 130), (244, 196, 48)),
    'subtle-art.jpg': ((242, 102, 42), (251, 243, 230)),
    'alchemist.jpg': ((231, 123, 34), (247, 210, 90)),
    'cant-hurt-me.jpg': ((22, 22, 22), (217, 212, 203)),
    'mindset.jpg': ((245, 242, 234), (44, 123, 182)),
    'limitless.jpg': ((243, 243, 240), (27, 95, 166)),
    'tao-te-ching.jpg': ((233, 230, 224), (58, 58, 58)),
    'zero-to-one.jpg': ((221, 235, 246), (31, 93, 166)), 'zero-to-one.webp': ((221, 235, 246), (31, 93, 166)),
    'thinking-fast-slow.jpg': ((247, 246, 241), (214, 160, 30)), 'thinking-fast-slow.png': ((247, 246, 241), (214, 160, 30)),
    'grit.jpg': ((247, 244, 236), (214, 40, 40)), 'grit.webp': ((247, 244, 236), (214, 40, 40)),
    'psychology-of-money.jpg': ((247, 244, 237), (62, 140, 98)),
    'hooked.jpg': ((214, 212, 48), (40, 40, 36)),
    'ikigai.jpg': ((220, 235, 245), (210, 75, 75)),
    'annihilation-of-caste.jpg': ((247, 244, 237), (44, 44, 44)),
    'fooled-randomness.jpg': ((24, 22, 20), (201, 140, 82)),
    'art-of-war.jpg': ((176, 34, 30), (247, 222, 166)),
    'emotional-intelligence.jpg': ((58, 72, 150), (240, 200, 60)),
    '5-second-rule.jpg': ((26, 26, 26), (226, 170, 120)),
    'extreme-ownership.jpg': ((22, 22, 22), (217, 212, 203)),
    '12-rules.jpg': ((240, 236, 229), (184, 112, 62)),
    '7-habits.jpg': ((178, 38, 40), (247, 240, 226)),
    '12-week-year.jpg': ((240, 238, 233), (196, 40, 36)),
    'random-walk-wall-street.jpg': ((48, 146, 196), (250, 245, 235)),
    'laws-human-nature.jpg': ((196, 48, 42), (247, 236, 220)),
    'toyota-way.jpg': ((206, 50, 56), (247, 240, 226)),
    'richer-wiser-happier.jpg': ((30, 88, 158), (244, 196, 48)),
    'barbarians-gate.jpg': ((210, 36, 52), (247, 240, 226)),
}

def placeholder(path):
    """The old repo used plain white pages with small type for books without art."""
    im = Image.open(path).convert('L').resize((60, 90))
    px = list(im.getdata()); dark = sum(1 for v in px if v < 200)
    return min(px) > 150 or dark < len(px) * .05

def palette(path, cat=''):
    im = load(path, (48, 72))
    q = im.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[:24]
    counts = sorted(q.getcolors(), reverse=True)
    cols = [(n, tuple(pal[i * 3:i * 3 + 3])) for n, i in counts]
    # background: weight the border, it is usually the cover's ground colour
    border = [im.getpixel((x, y)) for x in range(48) for y in (0, 1, 70, 71)] + \
             [im.getpixel((x, y)) for y in range(72) for x in (0, 1, 46, 47)]
    def near(c, p): return sum((a - b) ** 2 for a, b in zip(c, p)) < 2400
    score = {c: n + 3 * sum(1 for p in border if near(c, p)) for n, c in cols}
    bg = max(score, key=score.get)
    def sat(c):
        r, g, b = [x / 255 for x in c]; return colorsys.rgb_to_hls(r, g, b)[2]
    def dist(a, b): return sum((x - y) ** 2 for x, y in zip(a, b)) ** .5
    others = [c for n, c in cols if c != bg]
    accent = max(others, key=lambda c: dist(c, bg) * (.35 + sat(c))) if others else bg
    def lit(c):
        r, g, b = [x / 255 for x in c]; return colorsys.rgb_to_hls(r, g, b)[1]
    name = os.path.basename(path)
    if name in OVR: bg, accent = OVR[name]
    elif placeholder(path): accent, bg = bg, CAT.get(cat, (233, 223, 200))
    elif (max(bg) - min(bg)) / max(1, max(bg)) < .12:
        # v329: a white (or black) cover stays white (or black), so the edition is recognisable.
        # Its signature colour becomes the accent: motif, rule and, when readable, the title.
        sig = signature(path)
        if sig and dist(sig, bg) > 60: accent = sig
    bg = tame(bg); accent = tame(accent)
    ink, cream = (22, 19, 15), (246, 239, 226)
    fg = ink if contrast(bg, ink) >= contrast(bg, cream) else cream
    if dist(accent, bg) < 60:   # accent too close: derive one from the bg
        r, g, b = [x / 255 for x in bg]; h, l, s = colorsys.rgb_to_hls(r, g, b)
        l = l - .22 if l > .5 else l + .25
        accent = tuple(v * 255 for v in colorsys.hls_to_rgb(h, max(0, min(1, l)), s))
    tc = accent if contrast(accent, bg) >= 3.4 else fg
    return hx(bg), hx(fg), hx(accent), hx(tc)

def main():
    meta = books(); out = {}
    for f in sorted(os.listdir(COV)):
        m = meta.get(f)
        if not m:
            stem = re.sub(r'\.[a-z]+$', '', f)
            small = {'to', 'of', 'the', 'a', 'and', 'in', 'on', 'for'}
            ws = stem.split('-'); t = ' '.join(w if (i and w in small) else w.capitalize() for i, w in enumerate(ws))
            m = {'id': stem, 't': t, 'a': '', 'c': 'Classics'}
        bg, fg, ac, tc = palette(os.path.join(COV, f), m['c'])
        w, h = Image.open(os.path.join(COV, f)).size
        hsh = int(hashlib.md5(m['id'].encode()).hexdigest()[:8], 16)
        if m.get('keep'): bg, fg, ac, tc = '#F3EBDD', '#16130F', '#FFC800', '#16130F'
        out[f] = dict(m, bg=bg, fg=fg, ac=ac, tc=tc, sq=False, h=hsh)
    p = os.path.join(os.path.dirname(__file__), 'editions.jsonl')
    with open(p, 'w') as fh:
        for f in sorted(out): fh.write(json.dumps(dict(out[f], file=f), ensure_ascii=False) + '\n')
    print(len(out), 'editions ->', p)

if __name__ == '__main__':
    main()
