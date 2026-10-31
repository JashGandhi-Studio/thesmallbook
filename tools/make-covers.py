#!/usr/bin/env python3
"""
make-covers.py - the Originals cover system, drawn rather than painted.

Every cover is one SVG on the same grid, so the fifty Originals read as one
imprint instead of fifty unrelated JPEGs:

    400 x 596, cream paper, thin black keyline frame, the title set in
    Archivo Black above a heavy rule, one flat cut-paper illustration on a
    single coloured ground band, a red corner and the word UNKNOWN.

Only the ground colour and the scene change, which is exactly how a real
paperback series stays recognisable at thumbnail size.

    python3 tools/make-covers.py            # draw every cover in the list
    python3 tools/make-covers.py the-queue  # draw one

Output: assets/covers/<id>.jpg  (400x596, quality 92, paper grain on top so
the file looks printed and stays above the 40 KB size the test suite wants)
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

INK = "#16130F"
PAPER = "#F4EDDD"
YELLOW = "#FFC800"
RED = "#D7263D"
SAND = "#E6D5B4"
TERRA = "#C4633C"
TEAL = "#2F6F6B"
OLIVE = "#8A9A5B"
INDIGO = "#1E2A4A"
GREY = "#9AA2A0"
W = 400
H = 596
FRAME = 13
TITLE_TOP, TITLE_H = 40, 196
RULE_Y = 252
ILL_TOP = 268
BAND_TOP = 432
BAND_BOT = 552
FOOT_Y = 574


# ---------------------------------------------------------------- primitives
def p(d, fill="none", stroke=INK, sw=5, extra=""):
    return ('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" '
            'stroke-linejoin="round" stroke-linecap="round" %s/>' % (d, fill, stroke, sw, extra))


def r(x, y, w, h, fill="none", stroke=INK, sw=5, rx=0):
    return ('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" '
            'stroke="%s" stroke-width="%s"/>' % (x, y, w, h, rx, fill, stroke, sw))


def c(cx, cy, rad, fill="none", stroke=INK, sw=5):
    return ('<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="%s"/>'
            % (cx, cy, rad, fill, stroke, sw))


def line(x1, y1, x2, y2, stroke=INK, sw=5):
    return ('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s" '
            'stroke-linecap="round"/>' % (x1, y1, x2, y2, stroke, sw))


def person(cx, foot_y, scale=1.0, fill=SAND, flip=False, arms="down"):
    """a cut-paper figure: round head, one confident silhouette, no face"""
    s = scale
    head = c(cx, foot_y - 62 * s, 12 * s, fill=fill, sw=4)
    body = ('<path d="M%s %s q%s %s %s %s l%s %s q%s %s %s %s z"/>' % (
        cx - 17 * s, foot_y - 46 * s, 4 * s, -18 * s, 17 * s, -18 * s,
        17 * s, 0, 4 * s, 18 * s, -17 * s, 46 * s))
    body = body.replace("/>", ' fill="%s" stroke="%s" stroke-width="4" stroke-linejoin="round"/>' % (fill, INK))
    legs = line(cx - 7 * s, foot_y - 2 * s, cx - 8 * s, foot_y, sw=4) + line(cx + 7 * s, foot_y - 2 * s, cx + 8 * s, foot_y, sw=4)
    if arms == "open":
        legs += line(cx - 17 * s, foot_y - 34 * s, cx - 27 * s, foot_y - 26 * s, sw=4)
        legs += line(cx + 17 * s, foot_y - 34 * s, cx + 27 * s, foot_y - 26 * s, sw=4)
    return head + body + legs


def cloud_lights(x1, y1, x2, y2, n=6):
    """a slack string of bulbs between two points"""
    out = ['<path d="M%s %s Q%s %s %s %s" fill="none" stroke="%s" stroke-width="3"/>'
           % (x1, y1, (x1 + x2) / 2, (y1 + y2) / 2 + 26, x2, y2, INK)]
    for i in range(1, n):
        t = i / n
        mx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2
        my = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + 26) + t * t * y2
        out.append(c(mx, my + 7, 5.5, fill=YELLOW, sw=3))
    return "".join(out)


# -------------------------------------------------------------------- scenes
# every scene is drawn on the same stage: objects rest on GL = 512, the
# composition runs 46..354 wide, and the coloured band sits behind the floor

GL = 512


def seated(cx, seat_y=430, fill=SAND):
    """a figure sitting on a bench: head, shoulders, knees"""
    return "".join([
        c(cx, seat_y - 58, 13, fill=fill, sw=4),
        p("M%s %s l%s 30 l%s 0 l%s -30 z" % (cx - 15, seat_y - 44, -6, 30, 12), fill=fill, sw=4),
        p("M%s %s q14 -6 28 0 l0 14 q-14 6 -28 0 z" % (cx - 14, seat_y - 44), fill=fill, sw=4),
        line(cx + 14, seat_y - 30, cx + 30, seat_y - 26, sw=4),
    ])


def picket(x, base, h=86, w=17):
    return p("M%s %s l0 -%s l%s -14 l%s 14 l0 %s z" % (x, base, h - 16, w / 2, w / 2, h - 16),
             fill="#F7F0DE", sw=4)


def table(x, w, top=452, leg=52, fill=SAND):
    return "".join([
        r(x, top, w, 13, fill=fill, sw=6, rx=3),
        line(x + 16, top + 13, x + 16, top + 13 + leg, sw=6),
        line(x + w - 16, top + 13, x + w - 16, top + 13 + leg, sw=6),
    ])


def scene_reset():
    moon = c(186, 336, 24, fill=YELLOW, sw=0) + c(174, 328, 21, fill="#F7F0DE", sw=0)
    stars = "".join(c(x, y, 3.2, fill=YELLOW, sw=0) for x, y in ((92, 330), (216, 402), (108, 420)))
    return "".join([
        r(48, 288, 190, 168, fill="#F8F2E1", sw=6),           # window
        line(143, 288, 143, 456, sw=5), line(48, 372, 238, 372, sw=5),
        moon, stars,
        r(38, 456, 210, 11, fill=SAND, sw=6, rx=3),           # sill
        table(240, 132, top=446, leg=66),
        r(258, 402, 32, 44, fill="#EFE6D0", sw=5, rx=6),      # tumbler
        line(258, 420, 290, 420, stroke=GREY, sw=3),
        r(302, 428, 56, 18, fill=RED, sw=5, rx=3),            # closed notebook
        line(306, 437, 354, 437, stroke="#8C2233", sw=3),
        line(340, 402, 340, 428, sw=6),                       # lamp stem
        p("M318 402 l44 0 l-9 -30 l-26 0 z", fill=YELLOW, sw=5),
        r(330, 432, 22, 8, fill=GREY, sw=4, rx=3),
    ])


def scene_boundary():
    left = "".join(picket(x, GL - 44) for x in (34, 62, 90, 118))
    right = "".join(picket(x, GL - 44) for x in (266, 294, 322, 350))
    rails = (line(30, 424, 140, 424, sw=5) + line(30, 462, 140, 462, sw=5) +
             line(260, 424, 366, 424, sw=5) + line(260, 462, 366, 462, sw=5))
    posts = (p("M146 %d l0 -100 l15 0 l0 100 z" % (GL - 44), fill=SAND, sw=5) +
             p("M243 %d l0 -100 l15 0 l0 100 z" % (GL - 44), fill=SAND, sw=5))
    # the gate, swung open towards us, drawn as the flat leaf of a picket gate
    leaf = "".join([
        p("M164 %d l64 12 l0 -96 l-64 -10 z" % (GL - 40), fill="#F7F0DE", sw=5),
        line(164, 452, 228, 464, sw=4),
        line(180, 420, 180, 458, sw=4), line(198, 424, 198, 461, sw=4), line(215, 427, 215, 463, sw=4),
    ])
    return "".join([
        left, right, rails, posts, leaf,
        r(36, GL - 58, 30, 20, fill=TERRA, sw=5, rx=5),
        p("M51 %s q-20 -16 -4 -38 q20 14 4 38" % (GL - 58), fill=OLIVE, sw=5),
        r(334, GL - 58, 30, 20, fill=TERRA, sw=5, rx=5),
        p("M349 %s q-20 -16 -4 -38 q20 14 4 38" % (GL - 58), fill=OLIVE, sw=5),
        p("M176 %s q22 -10 44 0" % (GL + 24), stroke=INK, sw=4),
    ])

def scene_ledger():
    coins = "".join(r(64, GL - 76 - i * 15, 40, 13, fill=YELLOW, sw=4, rx=6) for i in range(5))
    return "".join([
        table(34, 332, top=430, leg=82),
        p("M112 430 q44 -30 88 0 l0 40 q-44 -26 -88 0 z", fill=PAPER, sw=6),
        p("M200 430 q44 -30 88 0 l0 40 q-44 -26 -88 0 z", fill="#FBF5E6", sw=6),
        line(200, 430, 200, 470, sw=4),
        "".join(line(130, 418 - i * 9, 184, 418 - i * 9, stroke=GREY, sw=3) for i in range(3)),
        "".join(line(218, 418 - i * 9, 272, 418 - i * 9, stroke=GREY, sw=3) for i in range(3)),
        p("M198 404 l8 0 l0 22 l-8 0 z", fill=RED, sw=3),
        coins,
        r(288, 366, 46, 64, fill=YELLOW, sw=5, rx=8),
        r(282, 356, 58, 14, fill=SAND, sw=5, rx=4),
        c(300, 392, 7, fill=TERRA, sw=3), c(322, 404, 7, fill=TERRA, sw=3),
    ])


def scene_neighbourhood():
    def house(x, w, h, roof, body=SAND, glow=True):
        top = GL - h - 26
        return "".join([
            r(x, top, w, h, fill=body, sw=6),
            p("M%s %s l%s -34 l%s 34 z" % (x - 10, top, w / 2 + 10, w / 2 + 10), fill=roof, sw=6),
            r(x + 14, top + 26, 24, 22, fill=YELLOW if glow else "#F8F2E1", sw=4),
            r(x + 14, top + 64, 24, 30, fill="#F8F2E1", sw=4),
            r(x + w - 38, top + 26, 24, 22, fill="#F8F2E1", sw=4),
            line(x + w / 2, top - 34, x + w / 2, top - 52, sw=5),
        ])
    return "".join([
        house(30, 96, 96, TEAL),
        house(146, 108, 132, TERRA),
        house(276, 94, 88, TEAL),
        cloud_lights(30, 356, 152, 330), cloud_lights(152, 330, 276, 356), cloud_lights(276, 356, 370, 336),
        p("M170 512 q30 -18 60 0", stroke=INK, sw=5),
    ])


def scene_bench():
    def fig(cx, body):
        return "".join([
            c(cx, 380, 13, fill=body, sw=4),
            p("M%s 393 l-13 32 l28 0 l-2 -32 z" % cx, fill=body, sw=4),
            p("M%s 425 q-6 22 -16 34" % (cx - 4), sw=4),
            p("M%s 425 q6 22 16 34" % (cx + 4), sw=4),
            line(cx - 12, 402, cx - 26, 414, sw=4),
        ])
    return "".join([
        c(54, 318, 46, fill=OLIVE, sw=6),
        line(54, 364, 54, GL, sw=9),
        r(150, 340, 176, 13, fill=SAND, sw=6, rx=3),
        line(164, 353, 164, 424, sw=6), line(312, 353, 312, 424, sw=6),
        r(132, 424, 212, 14, fill=SAND, sw=6, rx=3),
        line(148, 438, 148, GL, sw=6), line(328, 438, 328, GL, sw=6),
        fig(196, TERRA), fig(256, TEAL),
        p("M222 356 q8 -12 6 -22 M232 358 q-4 -10 -2 -20", sw=3),
    ])


def scene_repair():
    return "".join([
        table(26, 348, top=452, leg=60),
        r(70, 330, 140, 92, fill=TERRA, sw=6, rx=10),                        # radio
        c(98, 366, 19, fill=YELLOW, sw=5), line(98, 366, 106, 352, sw=3),
        "".join(line(132, 348 + i * 14, 190, 348 + i * 14, sw=4) for i in range(4)),
        r(136, 396, 48, 18, fill="#F8F2E1", sw=4, rx=3),
        line(84, 316, 66, 288, sw=4), line(120, 314, 130, 282, sw=4),
        line(238, 448, 272, 392, sw=6), r(272, 372, 16, 24, fill=RED, sw=4, rx=4),
        p("M270 452 q-14 -22 7 -34 q21 12 7 34 z", fill=GREY, sw=5),
        r(306, 360, 50, 84, fill=YELLOW, sw=5, rx=8),                        # parts box
        line(306, 384, 356, 384, sw=4),
        c(331, 338, 9, fill=GREY, sw=4), c(331, 338, 3.5, fill=INK, sw=0),
    ])


def scene_internship():
    return "".join([
        table(24, 352, top=396, leg=100),
        r(60, 314, 122, 70, fill="#FBF5E6", sw=6, rx=4),        # open notebook
        line(121, 314, 121, 384, sw=4),
        "".join(line(82, 340 + i * 15, 114, 340 + i * 15, stroke=GREY, sw=3) for i in range(3)),
        "".join(line(130, 340 + i * 15, 162, 340 + i * 15, stroke=GREY, sw=3) for i in range(3)),
        p("M196 396 l44 -16 l4 8 l-44 16 z", fill=RED, sw=4),   # pen on the desk
        r(266, 322, 50, 52, fill=PAPER, sw=5, rx=8),            # mug
        p("M316 336 q20 10 0 26", sw=5),
        p("M280 306 q10 -14 0 -26 M298 306 q10 -14 0 -26", stroke=GREY, sw=3),
    ])


def scene_classroom():
    return "".join([
        r(40, 300, 320, 130, fill=TEAL, sw=7, rx=8),                          # blackboard
        line(72, 336, 214, 336, stroke="#F4EDDD", sw=5),
        line(72, 360, 268, 360, stroke="#F4EDDD", sw=5),
        line(72, 384, 178, 384, stroke=YELLOW, sw=5),
        r(36, 430, 328, 12, fill=SAND, sw=5, rx=3),                           # ledge
        r(272, 414, 30, 12, fill=YELLOW, sw=4, rx=3),
        r(150, 466, 70, 46, fill=TERRA, sw=5, rx=6),                          # pot
        line(185, 466, 185, 412, sw=6),
        p("M185 432 q-40 -12 -34 -46 q34 6 34 46", fill=OLIVE, sw=5),
        p("M185 414 q40 -14 34 -48 q-34 8 -34 48", fill=OLIVE, sw=5),
        p("M185 452 q-30 -8 -26 -34 q26 4 26 34", fill=OLIVE, sw=5),
    ])


def scene_spotlight():
    chairs = ""
    for i in range(3):
        x = 46 + i * 108
        chairs += r(x, 476, 70, 12, fill=TEAL, sw=5, rx=3)
        chairs += r(x + 13, 440, 44, 38, fill="#F7F0DE", sw=4, rx=5)
        chairs += line(x + 19, 488, x + 19, 502, sw=4) + line(x + 53, 488, x + 53, 502, sw=4)
    return "".join([
        p("M200 272 l-40 0 l-8 22 l96 0 l-8 -22 z", fill=GREY, sw=5),
        p("M182 294 l-30 96 M218 294 l30 96", stroke=YELLOW, sw=7),   # two hard rays
        p("M192 294 l-8 96 M208 294 l8 96", stroke=YELLOW, sw=5),
        r(134, 386, 132, 12, fill=SAND, sw=5, rx=3),                  # stage
        line(146, 398, 146, 434, sw=5), line(254, 398, 254, 434, sw=5),
        person(200, 386, 1.1, fill=TERRA),
        chairs,
    ])


COVERS = [
    dict(id="the-8-pm-reset", lines=["THE 8 PM", "RESET"], band=INDIGO,
         accent=YELLOW, scene=scene_reset),
    dict(id="the-kind-boundary", lines=["THE KIND", "BOUNDARY"], band=YELLOW,
         accent=OLIVE, scene=scene_boundary),
    dict(id="the-family-ledger", lines=["THE FAMILY", "LEDGER"], band=TERRA,
         accent=YELLOW, scene=scene_ledger),
    dict(id="the-neighbourhood-network", lines=["THE", "NEIGHBOURHOOD", "NETWORK"],
         band=TEAL, accent=YELLOW, scene=scene_neighbourhood),
    dict(id="the-listening-bench", lines=["THE LISTENING", "BENCH"], band=OLIVE,
         accent=YELLOW, scene=scene_bench),
    dict(id="the-repair-economy", lines=["THE REPAIR", "ECONOMY"], band=YELLOW,
         accent=TERRA, scene=scene_repair),
    dict(id="the-quiet-internship", lines=["THE QUIET", "INTERNSHIP"], band=SAND,
         accent=TEAL, scene=scene_internship),
    dict(id="the-long-game-classroom", lines=["THE LONG GAME", "CLASSROOM"], band=TEAL,
         accent=YELLOW, scene=scene_classroom),
    dict(id="nobody-is-thinking-about-you", lines=["NOBODY IS", "THINKING", "ABOUT YOU"],
         band=YELLOW, accent=TERRA, scene=scene_spotlight),
]


def svg_for(bk):
    lines = bk["lines"]
    texts = "".join(
        '<text class="ttl" x="200" y="0" text-anchor="middle">%s</text>' % ln for ln in lines)
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 596" width="400" height="596">
  <style>
    @font-face { font-family: 'Archivo Black'; src: url('/assets/fonts/archivoblack.woff2') format('woff2'); font-weight: 400 900; }
    @font-face { font-family: 'Space Grotesk'; src: url('/assets/fonts/spacegrotesk.woff2') format('woff2'); font-weight: 400 700; }
    .ttl { font-family: 'Archivo Black', Arial Black, sans-serif; fill: %(ink)s; %(fontstyle)s }
    .foot { font-family: 'Space Grotesk', Arial, sans-serif; font-weight: 700; font-size: 15px;
            letter-spacing: 3.4px; fill: %(ink)s; }
    .series { font-family: 'Space Grotesk', Arial, sans-serif; font-weight: 700; font-size: 10px;
              letter-spacing: 2.6px; fill: %(red)s; }
  </style>
  <rect width="400" height="596" fill="%(paper)s"/>
  <rect x="%(f)s" y="%(f)s" width="%(fw)s" height="%(fh)s" fill="none" stroke="%(ink)s" stroke-width="3"/>
  <text class="series" x="200" y="30" text-anchor="middle">THE SMALLBOOK ORIGINAL</text>
  %(texts)s
  <line x1="34" y1="%(rule)s" x2="366" y2="%(rule)s" stroke="%(ink)s" stroke-width="6"/>
  <rect x="%(f)s" y="%(bandtop)s" width="%(fw)s" height="%(bandh)s" fill="%(band)s"/>
  %(scene)s
  <path d="M%(brx)s %(bbot)s l0 -34 l34 34 z" fill="%(red)s"/>
  <text class="foot" x="200" y="%(foot)s" text-anchor="middle">UNKNOWN</text>
</svg>""" % dict(
        ink=INK, paper=PAPER, red=RED, f=FRAME, fw=W - FRAME * 2, fh=H - FRAME * 2,
        fontstyle='', texts=texts, rule=RULE_Y, bandtop=BAND_TOP,
        bandh=BAND_BOT - BAND_TOP, band=bk["band"], scene=bk["scene"](),
        brx=W - FRAME - 34, bbot=BAND_BOT, foot=FOOT_Y)


PAGE = """<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:%(paper)s}svg{display:block}</style></head>
<body>%(svg)s
<script>
(async function () {
  await document.fonts.ready;
  const texts = [...document.querySelectorAll('.ttl')];
  const MAXW = 336, TOP = %(top)s, BLOCK = %(block)s;
  let size = 200;
  for (const t of texts) {
    t.setAttribute('font-size', size);
    t.__fit = MAXW / t.getComputedTextLength() * size;
  }
  size = Math.min(...texts.map(t => t.__fit), BLOCK / (0.94 * texts.length));
  const lh = size * 0.94;
  let y = TOP + (BLOCK - lh * texts.length) / 2 + size * 0.80;
  for (const t of texts) { t.setAttribute('font-size', size); t.setAttribute('y', y); y += lh; }
  document.documentElement.setAttribute('data-fit', '1');
})();
</script>
</body></html>"""




SHOOT = """
const { chromium } = require('/home/user/node_modules/playwright');
(async () => {
  const [dir, base, ...files] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: %(w)d, height: %(h)d }, device_scale_factor: 3 });
  for (const f of files) {
    await p.goto(base + f, { waitUntil: 'load' });
    await p.waitForFunction(() => document.documentElement.getAttribute('data-fit') === '1', null, { timeout: 15000 });
    await p.waitForTimeout(80);
    await p.screenshot({ path: dir + '/' + f.replace('.html', '.png') });
  }
  await b.close();
})();
""" % dict(w=W, h=H)


def render(ids):
    """write one page per cover, screenshot it with the same Chromium the
    diag scripts use, and return the PNGs"""
    work = os.path.join(ROOT, "_covers_tmp")
    os.makedirs(work, exist_ok=True)
    names = []
    for bk in COVERS:
        if ids and bk["id"] not in ids:
            continue
        html = PAGE % dict(paper=PAPER, svg=svg_for(bk), top=TITLE_TOP, block=TITLE_H)
        name = bk["id"] + ".html"
        open(os.path.join(work, name), "w", encoding="utf-8").write(html)
        names.append(name)
    if not names:
        return []
    script = os.path.join(work, "_shoot.js")
    open(script, "w", encoding="utf-8").write(SHOOT)
    base = os.environ.get("COVER_BASE", "http://localhost:4321/_covers_tmp/")
    subprocess.run(["node", script, work, base] + names, check=True)
    made = [(n.replace(".html", ""), os.path.join(work, n.replace(".html", ".png"))) for n in names]
    return made


def to_jpg(made):
    from PIL import Image, ImageDraw
    import random
    out = []
    for cid, png in made:
        im = Image.open(png).convert("RGB").resize((W * 2, H * 2), Image.LANCZOS)
        # paper grain: a light print texture, and it keeps the file honest (40 KB+)
        grain = Image.new("L", (W * 2, H * 2))
        rnd = random.Random(cid)
        px = grain.load()
        for y in range(0, H * 2):
            for x in range(0, W * 2):
                px[x, y] = 128 + rnd.randint(-24, 24)
        im = Image.blend(im, Image.merge("RGB", (grain, grain, grain)), 0.075)
        im = im.resize((W, H), Image.LANCZOS)
        path = os.path.join(ROOT, "assets", "covers", cid + ".jpg")
        im.save(path, "JPEG", quality=95, subsampling=0)
        out.append((cid, os.path.getsize(path)))
    return out


if __name__ == "__main__":
    ids = set(sys.argv[1:])
    made = render(ids)
    for cid, size in to_jpg(made):
        print("%-32s %6.1f KB" % (cid, size / 1024.0))
