#!/usr/bin/env python3
"""Build 417: designed covers for the 50 books that shipped with plain
text covers in Build 414. Every book gets its own palette (a hue from
its category family, shifted by a hash of the book id so no two books
share colours) and a motif drawn for the book itself, picked from its
title words with a category fallback. Output is 500x750 JPEG, the same
size and path as the covers the rest of the library already wears, so
no data file changes are needed. Deterministic: reruns redraw the
same covers.

Run from the repo root:  python3 tools/covers417.py
"""
import colorsys
import hashlib
import json
import math
import os
import random
import textwrap

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 500, 750
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_R = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

ORIGINALS = {
    "second-act-advantage", "grandparents-handbook-2", "phone-free-childhood",
    "loneliness-cure", "slow-web-manifesto",
}

# category hue families (degrees); the per book hash walks inside the range
FAMILY = {
    "Love & Relationships": (335, 375),
    "Family & Parenting": (22, 48),
    "Life & Meaning": (255, 300),
    "Mind & Spirit": (225, 262),
    "Nature & Planet": (85, 145),
    "Health & Body": (168, 198),
    "Future & Technology": (198, 228),
    "Psychology & People": (275, 315),
    "Money & Finance": (38, 58),
    "Business & Startups": (200, 232),
    "Self-Improvement": (12, 32),
    "History & Society": (28, 44),
}


def font(path, size):
    return ImageFont.truetype(path, size)


def hx(rgb):
    return "#%02X%02X%02X" % tuple(int(round(c * 255)) for c in rgb)


def palette(book):
    h = int(hashlib.md5(book["id"].encode()).hexdigest(), 16)
    lo, hi = FAMILY.get(book["category"], (20, 340))
    if lo > hi:
        hue = ((lo + (h % 40)) % 360) / 360.0
    else:
        hue = (lo + (h % max(8, hi - lo))) / 360.0
    deep = (h >> 7) % 5 != 0  # most deep, one in five paper
    if deep:
        bg = colorsys.hsv_to_rgb(hue, 0.62, 0.34 + ((h >> 11) % 10) / 100.0)
        ink = colorsys.hsv_to_rgb(hue, 0.10, 0.96)
        accent = colorsys.hsv_to_rgb((hue + 0.09) % 1.0, 0.72, 0.92)
    else:
        bg = colorsys.hsv_to_rgb(hue, 0.16, 0.94)
        ink = colorsys.hsv_to_rgb(hue, 0.55, 0.22)
        accent = colorsys.hsv_to_rgb((hue + 0.05) % 1.0, 0.75, 0.55)
    band = colorsys.hsv_to_rgb(hue, 0.45, 0.55 if deep else 0.75)
    return bg, ink, accent, band


def motif_kind(book):
    t = (" " + book["title"].lower() + " ")
    rules = [
        ("kite", ["kite"]), ("moon", ["night", "midnight", "magical"]),
        ("waves", ["water", "covenant", "river", "sea"]),
        ("peaks", ["thin air", "mountain", "everest", "summit"]),
        ("heart", ["heart", "safekeeping"]),
        ("rings", ["marriage", "dates", "apology", "arranged", "together", "loving", "love", "mating", "affairs", "tight", "captivity"]),
        ("fish", ["fish"]),
        ("stars", ["wonder", "sky"]),
        ("house", ["child", "kids", "father", "parent", "raise", "talk", "house", "grandparent", "whole-brain", "good inside", "phone-free"]),
        ("rings_tree", ["overstory", "tree", "nature", "more"]),
        ("path", ["path", "clouds", "way", "walk"]),
        ("circles", ["stillness", "dhammapada", "spirit", "still", "choice"]),
        ("pulse", ["hurt", "die", "body", "health"]),
        ("sun", ["superhuman", "second act", "yes to life", "life"]),
        ("clock", ["library", "time"]),
        ("ship", ["ship", "magic"]),
        ("letter", ["letters", "letter"]),
        ("question", ["who is", "why"]),
        ("column", ["man", "measure", "morrie"]),
    ]
    for kind, words in rules:
        for w in words:
            if w in t:
                return kind
    return {
        "Love & Relationships": "rings", "Family & Parenting": "house",
        "Nature & Planet": "rings_tree", "Mind & Spirit": "circles",
        "Health & Body": "pulse", "Future & Technology": "sun",
    }.get(book["category"], "sun")


def draw_motif(d, kind, cx, cy, s, ink, accent, band):
    """s is roughly the motif radius in px."""
    if kind == "kite":
        d.polygon([(cx, cy - s), (cx + s * .62, cy - s * .1), (cx, cy + s * .9), (cx - s * .62, cy - s * .1)], outline=ink, width=6)
        d.line([cx - s * .62, cy - s * .1, cx + s * .62, cy - s * .1], fill=accent, width=5)
        d.line([cx, cy + s * .9, cx - s * .25, cy + s * 1.7], fill=ink, width=4)
        for i in range(3):
            yy = cy + s * (1.05 + i * .26)
            d.polygon([(cx - s * .28, yy), (cx - s * .05, yy + 10), (cx - s * .3, yy + 20)], fill=accent)
    elif kind == "moon":
        d.ellipse([cx - s, cy - s, cx + s, cy + s], fill=accent)
        d.ellipse([cx - s * .35, cy - s * 1.05, cx + s * 1.15, cy + s * .45], fill=band)
        for dx, dy, r in [(-1.2, -.8, 5), (1.05, .75, 4), (.75, -1.05, 3), (-1.05, .9, 3)]:
            d.ellipse([cx + dx * s - r, cy + dy * s - r, cx + dx * s + r, cy + dy * s + r], fill=ink)
    elif kind == "waves":
        for i in range(4):
            yy = cy - s * .7 + i * s * .45
            pts = [(cx - s * 1.25 + x, yy + math.sin(x / 34.0 + i) * 13) for x in range(0, int(s * 2.5), 8)]
            d.line(pts, fill=accent if i % 2 == 0 else ink, width=7, joint="curve")
    elif kind == "peaks":
        d.polygon([(cx - s * 1.3, cy + s * .8), (cx - s * .35, cy - s * .75), (cx + s * .3, cy + s * .8)], fill=band)
        d.polygon([(cx - s * .2, cy + s * .8), (cx + s * .55, cy - s * .95), (cx + s * 1.3, cy + s * .8)], fill=accent)
        d.polygon([(cx + s * .55, cy - s * .95), (cx + s * .36, cy - s * .55), (cx + s * .5, cy - s * .68), (cx + s * .62, cy - s * .55), (cx + s * .74, cy - s * .95)], fill=ink)
    elif kind == "heart":
        d.ellipse([cx - s * 1.02, cy - s * .88, cx - s * .04, cy + s * .1], outline=accent, width=9)
        d.ellipse([cx + s * .04, cy - s * .88, cx + s * 1.02, cy + s * .1], outline=accent, width=9)
        d.polygon([(cx - s * .94, cy - s * .18), (cx + s * .94, cy - s * .18), (cx, cy + s * 1.0)], outline=accent, width=9)
    elif kind == "rings":
        d.ellipse([cx - s * 1.05, cy - s * .72, cx + s * .15, cy + s * .72], outline=ink, width=8)
        d.ellipse([cx - s * .15, cy - s * .72, cx + s * 1.05, cy + s * .72], outline=accent, width=8)
    elif kind == "fish":
        d.polygon([(cx - s * 1.25, cy), (cx + s * .35, cy - s * .62), (cx + s * .35, cy + s * .62)], fill=accent)
        d.polygon([(cx + s * .3, cy), (cx + s * 1.3, cy - s * .55), (cx + s * 1.3, cy + s * .55)], fill=band)
        d.ellipse([cx - s * .8, cy - s * .18, cx - s * .58, cy + s * .04], fill=ink)
    elif kind == "stars":
        for dx, dy, r in [(-1.15, -.7, 6), (0, -1.0, 9), (1.1, -.55, 5), (-.7, .55, 5), (.75, .8, 7), (0, .35, 4)]:
            x, y = cx + dx * s, cy + dy * s
            d.polygon([(x, y - r * 2), (x + r * .55, y - r * .55), (x + r * 2, y), (x + r * .55, y + r * .55), (x, y + r * 2), (x - r * .55, y + r * .55), (x - r * 2, y), (x - r * .55, y - r * .55)], fill=accent if r > 5 else ink)
    elif kind == "house":
        d.polygon([(cx - s * 1.15, cy - s * .25), (cx, cy - s * 1.05), (cx + s * 1.15, cy - s * .25)], fill=accent)
        d.rectangle([cx - s * .85, cy - s * .25, cx + s * .85, cy + s * .9], outline=ink, width=7)
        d.rectangle([cx - s * .18, cy + s * .25, cx + s * .22, cy + s * .9], fill=accent)
    elif kind == "rings_tree":
        for i in range(4):
            r = s * (1.05 - i * .24)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=accent if i % 2 else ink, width=6)
        d.rectangle([cx - 7, cy + s * .95, cx + 7, cy + s * 1.3], fill=ink)
    elif kind == "path":
        pts = [(cx - s * 1.2, cy + s), (cx - s * .4, cy + s * .45), (cx + s * .35, cy + s * .55), (cx + s * .15, cy - s * .1), (cx + s * .75, cy - s * .6), (cx + s * .5, cy - s * 1.05)]
        d.line(pts, fill=accent, width=13, joint="curve")
        d.ellipse([cx + s * .3, cy - s * 1.3, cx + s * .72, cy - s * .88], fill=ink)
    elif kind == "circles":
        for i in range(3):
            r = s * (1.0 - i * .3)
            d.arc([cx - r, cy - r, cx + r, cy + r], start=300 + i * 30, end=250 + i * 30, fill=accent if i == 0 else ink, width=7)
    elif kind == "pulse":
        pts = [(cx - s * 1.3, cy), (cx - s * .45, cy), (cx - s * .2, cy - s * .75), (cx + s * .08, cy + s * .7), (cx + s * .32, cy), (cx + s * 1.3, cy)]
        d.line(pts, fill=accent, width=9, joint="curve")
    elif kind == "clock":
        d.ellipse([cx - s, cy - s, cx + s, cy + s], outline=ink, width=7)
        d.line([cx, cy, cx, cy - s * .6], fill=accent, width=8)
        d.line([cx, cy, cx + s * .45, cy + s * .2], fill=accent, width=8)
    elif kind == "ship":
        d.polygon([(cx - s * 1.2, cy + s * .45), (cx + s * 1.2, cy + s * .45), (cx + s * .8, cy + s * .95), (cx - s * .8, cy + s * .95)], fill=accent)
        d.line([cx, cy + s * .45, cx, cy - s * 1.1], fill=ink, width=6)
        d.polygon([(cx + 8, cy - s * 1.05), (cx + 8, cy + s * .3), (cx + s * .85, cy + s * .3)], fill=ink)
    elif kind == "letter":
        d.rectangle([cx - s * 1.2, cy - s * .75, cx + s * 1.2, cy + s * .75], outline=ink, width=7)
        d.line([cx - s * 1.2, cy - s * .75, cx, cy + s * .15, cx + s * 1.2, cy - s * .75], fill=accent, width=6, joint="curve")
    elif kind == "question":
        f = font(SERIF, int(s * 2.6))
        d.text((cx, cy), "?", font=f, fill=accent, anchor="mm")
    elif kind == "column":
        d.polygon([(cx - s * .95, cy - s * .62), (cx, cy - s * 1.12), (cx + s * .95, cy - s * .62)], fill=accent)
        for dx in (-.52, 0, .52):
            d.rectangle([cx + dx * s - 9, cy - s * .42, cx + dx * s + 9, cy + s * .62], fill=ink)
        d.rectangle([cx - s * .95, cy + s * .62, cx + s * .95, cy + s * .82], fill=accent)
        d.rectangle([cx - s * 1.08, cy + s * .88, cx + s * 1.08, cy + s * 1.04], fill=ink)
    else:  # sun
        d.ellipse([cx - s * .62, cy - s * .1, cx + s * .62, cy + s * 1.14], fill=accent)
        d.line([cx - s * 1.3, cy + s * 1.05, cx + s * 1.3, cy + s * 1.05], fill=ink, width=7)
        for a in range(-70, 71, 35):
            import math as _m
            x2 = cx + _m.sin(_m.radians(a)) * s * 1.15
            y2 = cy + s * .45 - _m.cos(_m.radians(a)) * s * 1.15
            d.line([cx + _m.sin(_m.radians(a)) * s * .8, cy + s * .45 - _m.cos(_m.radians(a)) * s * .8, x2, y2], fill=ink, width=5)


def wrap_title(title, fnt, maxw, draw):
    words, lines, cur = title.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:4]


def make_cover(book, out_path):
    bg, ink, accent, band = palette(book)
    rng = random.Random(book["id"])
    im = Image.new("RGB", (W, H), tuple(int(c * 255) for c in bg))
    # soft vertical gradient + a whisper of grain, like the printed covers
    px = im.load()
    top = tuple(min(255, int(c * 255 * 1.09)) for c in bg)
    bot = tuple(int(c * 255 * 0.92) for c in bg)
    for y in range(H):
        k = y / H
        row = tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3))
        for x in range(W):
            px[x, y] = row
    d = ImageDraw.Draw(im, "RGBA")
    for _ in range(2600):
        x, y = rng.randrange(W), rng.randrange(H)
        d.point((x, y), fill=(int(ink[0] * 255), int(ink[1] * 255), int(ink[2] * 255), 10))
    ink255 = tuple(int(c * 255) for c in ink)
    acc255 = tuple(int(c * 255) for c in accent)
    band255 = tuple(int(c * 255) for c in band)

    d.rectangle([16, 16, W - 17, H - 17], outline=ink255, width=3)
    d.text((42, 44), "THE SMALLBOOK", font=font(SANS_B, 17), fill=ink255)
    if book["id"] in ORIGINALS:
        tag = "ORIGINAL"
        tw = d.textlength(tag, font=font(SANS_B, 15))
        d.text((W - 42 - tw, 44), tag, font=font(SANS_B, 15), fill=acc255)

    # title block
    size = 54
    while size > 30:
        f = font(SERIF, size)
        lines = wrap_title(book["title"], f, W - 110, d)
        if len(lines) <= 3 and max(d.textlength(l, font=f) for l in lines) <= W - 110:
            break
        size -= 4
    f = font(SERIF, size)
    y = 128
    for l in lines:
        d.text((W / 2, y), l, font=f, fill=ink255, anchor="ma")
        y += int(size * 1.14)
    d.line([W / 2 - 34, y + 12, W / 2 + 34, y + 12], fill=acc255, width=5)

    draw_motif(d, motif_kind(book), W / 2, 478, 74, ink255, acc255, band255)

    author = book["author"]
    author = "THE SMALLBOOK" if author.lower() == "unknown" else author
    d.text((W / 2, H - 108), author.upper(), font=font(SANS_B, 19), fill=ink255, anchor="ma")
    d.text((W / 2, H - 74), book["category"].upper(), font=font(SANS, 13), fill=acc255, anchor="ma")
    im.save(out_path, "JPEG", quality=90)
    return hx(bg), hx(ink), hx(accent)


def main():
    data = open(os.path.join(ROOT, "js/data.js"), encoding="utf-8").read()
    arr = json.loads(data[len("const BOOKS = "):data.index("];\n") + 1])
    editions_path = os.path.join(ROOT, "tools/editions/editions.jsonl")
    editions = [json.loads(l) for l in open(editions_path, encoding="utf-8")]
    targets = []
    for b in arr:
        p = os.path.join(ROOT, b.get("cover") or "")
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGB")
        if im.size != (400, 600):
            continue
        small = im.resize((40, 60))
        cols = small.getcolors(2400)
        cols.sort(reverse=True)
        if cols[0][0] / 2400 > 0.70:
            targets.append(b)
    if not targets:
        # second run: the covers are already 500x750, so take the same
        # books from the tail of editions.jsonl, where Build 414
        # appended them (kind standard / tsb-original)
        tail = [e["id"] for e in editions if e.get("kind") in ("standard", "tsb-original")]
        by_book = {b["id"]: b for b in arr}
        targets = [by_book[i] for i in tail if i in by_book]
    print("plain covers to redraw:", len(targets))
    by_id = {e["id"]: e for e in editions}
    for b in targets:
        out = os.path.join(ROOT, b.get("cover") or ("assets/covers/%s.jpg" % b["id"]))
        bg, fg, ac = make_cover(b, out)
        e = by_id.get(b["id"])
        if e:
            e["bg"], e["fg"], e["ac"] = bg, fg, ac
        print("drew", b["id"], motif_kind(b), bg)
    with open(editions_path, "w", encoding="utf-8") as fh:
        for e in editions:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")
    print("done")


if __name__ == "__main__":
    main()
