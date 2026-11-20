#!/usr/bin/env python3
"""Build 419: redraw the Build 414 batch covers in the library's own
cover language.

Build 417 gave these 49 books designed covers, but in a different
dialect from the rest of the library: heavy saturated grounds, a bold
sans masthead, the title set at the top. The established covers (the
ones readers have always seen) speak differently:

  * muted, desaturated grounds (cream paper, sage, slate, plum)
  * letter-spaced small-caps labels, never bold sans shouting
  * one quiet motif, then a serif display title below it
  * the author in spaced capitals, the imprint letter-spaced
  * three layout families: PAPER (cream, motif above the title),
    DISC (a deep ground, the glyph inside one accent disc, the
    imprint along the bottom), and LETTER (Originals: near-black,
    one giant cropped letter, the title low and left)

This tool keeps the 417 motif drawings (they were drawn per book and
are good) and re-sets every cover inside that system, so the new
books sit on the shelf as family, not as guests. Palettes stay
per-book (a hue from the category family, walked by the book id) but
are pulled back to the library's muted register.

It also rewrites the editions.jsonl colours for these books to match
the new covers and regenerates js/editions-data.js, so the 3D spines
agree with the covers.

Deterministic. Run from the repo root:  python3 tools/covers419.py
"""
import colorsys
import hashlib
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from covers417 import FAMILY, draw_motif, motif_kind, wrap_title  # noqa: E402
from PIL import ImageFont  # noqa: E402

W, H = 500, 750


def _first(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    return paths[0]


SERIF = _first([
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
])
SANS = _first([
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
])
SANS_B = _first([
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
])

ORIGINALS = {
    "second-act-advantage", "grandparents-handbook-2", "phone-free-childhood",
    "loneliness-cure", "slow-web-manifesto",
}


def font(path, size):
    return ImageFont.truetype(path, size)


def hx(rgb):
    return "#%02X%02X%02X" % tuple(int(round(c * 255)) for c in rgb)


def c255(rgb):
    return tuple(int(round(c * 255)) for c in rgb)


def spaced_width(draw, text, fnt, tracking):
    return sum(draw.textlength(ch, font=fnt) for ch in text) + tracking * max(0, len(text) - 1)


def spaced(draw, x, y, text, fnt, fill, tracking=3, anchor="l"):
    """Letter-spaced small caps, the library's label voice.
    anchor: 'l' left, 'c' centre, 'r' right (x is the anchor point)."""
    w = spaced_width(draw, text, fnt, tracking)
    if anchor == "c":
        x -= w / 2
    elif anchor == "r":
        x -= w
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return w


def house_palette(book):
    """The library's muted register: same category hues as 417, pulled
    back in saturation and settled into the three family grounds."""
    h = int(hashlib.md5(book["id"].encode()).hexdigest(), 16)
    lo, hi = FAMILY.get(book["category"], (20, 340))
    if lo > hi:
        hue = ((lo + (h % 40)) % 360) / 360.0
    else:
        hue = (lo + (h % max(8, hi - lo))) / 360.0
    if book["id"] in ORIGINALS:
        fam = "letter"
    else:
        fam = "paper" if (h >> 5) % 2 == 0 else "disc"
    if fam == "paper":
        bg = colorsys.hsv_to_rgb(hue, 0.10, 0.93)
        ink = colorsys.hsv_to_rgb(hue, 0.48, 0.21)
        accent = colorsys.hsv_to_rgb((hue + 0.05) % 1.0, 0.72, 0.52)
        band = colorsys.hsv_to_rgb(hue, 0.35, 0.62)
    elif fam == "disc":
        bg = colorsys.hsv_to_rgb(hue, 0.33, 0.35 + ((h >> 9) % 6) / 100.0)
        ink = colorsys.hsv_to_rgb(hue, 0.07, 0.95)
        accent = colorsys.hsv_to_rgb((hue + 0.07) % 1.0, 0.38, 0.72)
        band = colorsys.hsv_to_rgb(hue, 0.25, 0.55)
    else:  # letter
        bg = colorsys.hsv_to_rgb(hue, 0.36, 0.16)
        ink = colorsys.hsv_to_rgb(hue, 0.08, 0.93)
        accent = colorsys.hsv_to_rgb((hue + 0.05) % 1.0, 0.58, 0.72)
        band = colorsys.hsv_to_rgb(hue, 0.30, 0.45)
    return fam, bg, ink, accent, band


def fit_title(draw, title, maxw, start=56, floor=32):
    size = start
    while size > floor:
        f = font(SERIF, size)
        lines = wrap_title(title, f, maxw, draw)
        if len(lines) <= 3 and max(draw.textlength(l, font=f) for l in lines) <= maxw:
            return f, lines, size
        size -= 3
    f = font(SERIF, floor)
    return f, wrap_title(title, f, maxw, draw)[:3], floor


def author_line(book):
    a = (book.get("author") or "").strip()
    return "THE SMALLBOOK" if (not a or a.lower() == "unknown") else a.upper()


def draw_paper(d, book, bg, ink, accent, band):
    bg255, ink255, acc255, band255 = c255(bg), c255(ink), c255(accent), c255(band)
    d.rectangle([18, 18, W - 19, H - 19], outline=ink255, width=2)
    spaced(d, 42, 40, "THESMALLBOOK", font(SANS_B, 12), ink255, 4)
    spaced(d, W - 42, 40, str(book.get("year") or ""), font(SANS_B, 12), ink255, 3, anchor="r")
    draw_motif(d, motif_kind(book), W / 2, 236, 62, ink255, acc255, band255)
    f, lines, size = fit_title(d, book["title"], W - 120)
    y = 356
    for l in lines:
        d.text((W / 2, y), l, font=f, fill=ink255, anchor="ma")
        y += int(size * 1.14)
    d.line([W / 2 - 23, y + 14, W / 2 + 23, y + 14], fill=acc255, width=4)
    spaced(d, W / 2, y + 34, author_line(book), font(SANS_B, 14), ink255, 3, anchor="c")
    spaced(d, W / 2, H - 58, (book.get("category") or "").upper(), font(SANS, 11), band255, 3, anchor="c")


def draw_disc(d, book, bg, ink, accent, band):
    bg255, ink255, acc255, band255 = c255(bg), c255(ink), c255(accent), c255(band)
    cat = (book.get("category") or "").upper()
    cw = spaced(d, 42, 40, cat, font(SANS_B, 11), ink255, 3)
    yw = spaced_width(d, str(book.get("year") or ""), font(SANS_B, 11), 3)
    d.line([42 + cw + 14, 46, W - 42 - yw - 14, 46], fill=band255, width=1)
    spaced(d, W - 42, 40, str(book.get("year") or ""), font(SANS_B, 11), ink255, 3, anchor="r")
    d.ellipse([W / 2 - 118, 134, W / 2 + 118, 370], fill=acc255)
    draw_motif(d, motif_kind(book), W / 2, 252, 60, bg255, ink255, bg255)
    f, lines, size = fit_title(d, book["title"], W - 110)
    y = 412
    for l in lines:
        d.text((W / 2, y), l, font=f, fill=ink255, anchor="ma")
        y += int(size * 1.14)
    spaced(d, 42, H - 52, author_line(book), font(SANS, 13), ink255, 2)
    spaced(d, W - 42, H - 52, "THESMALLBOOK", font(SANS_B, 11), ink255, 4, anchor="r")


def draw_letter(d, book, bg, ink, accent, band):
    bg255, ink255, acc255, band255 = c255(bg), c255(ink), c255(accent), c255(band)
    title = book["title"]
    letter = next((ch for ch in title if ch.isalpha()), "T").upper()
    big = font(SERIF, 470)
    ghost = tuple(int(bg255[i] + (acc255[i] - bg255[i]) * 0.5) for i in range(3))
    d.text((W + 46, -128), letter, font=big, fill=ghost, anchor="ra")
    draw_motif(d, motif_kind(book), 82, 88, 30, ink255, acc255, band255)
    f, lines, size = fit_title(d, title, W - 130, start=48)
    y = 428
    for l in lines:
        d.text((42, y), l, font=f, fill=ink255, anchor="la")
        y += int(size * 1.14)
    d.line([42, y + 16, 82, y + 16], fill=acc255, width=4)
    d.text((96, y + 6), author_line(book).title() if author_line(book) != "THE SMALLBOOK" else "TheSmallBook",
           font=font(SANS, 15), fill=ink255, anchor="la")
    spaced(d, 42, H - 52, "THESMALLBOOK", font(SANS_B, 11), band255, 4)
    spaced(d, W - 42, H - 52, (book.get("category") or "").upper(), font(SANS, 11), band255, 3, anchor="r")


DRAW = {"paper": draw_paper, "disc": draw_disc, "letter": draw_letter}


def make_cover(book, out_path):
    fam, bg, ink, accent, band = house_palette(book)
    im = Image.new("RGB", (W, H), c255(bg))
    # the same whisper of a vertical gradient the printed covers carry
    px = im.load()
    top = tuple(min(255, int(c * 1.07)) for c in c255(bg))
    bot = tuple(int(c * 0.93) for c in c255(bg))
    for y in range(H):
        k = y / H
        row = tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3))
        for x in range(W):
            px[x, y] = row
    d = ImageDraw.Draw(im, "RGBA")
    DRAW[fam](d, book, bg, ink, accent, band)
    im.save(out_path, "JPEG", quality=90)
    return fam, hx(bg), hx(ink), hx(accent)


def main():
    # the 417 motif artist loads its own font paths; point them at the
    # fonts resolved above so the pair of tools always agree
    import covers417 as _c417
    _c417.SERIF = SERIF
    _c417.SERIF_R = SERIF
    _c417.SANS = SANS
    _c417.SANS_B = SANS_B
    data = open(os.path.join(ROOT, "js/data.js"), encoding="utf-8").read()
    arr = json.loads(data[len("const BOOKS = "):data.index("];\n") + 1])
    by_book = {b["id"]: b for b in arr}
    editions_path = os.path.join(ROOT, "tools/editions/editions.jsonl")
    editions = [json.loads(l) for l in open(editions_path, encoding="utf-8") if l.strip()]
    tail = [e["id"] for e in editions if e.get("kind") in ("standard", "tsb-original")]
    targets = [by_book[i] for i in tail if i in by_book]
    print("house-style redraws:", len(targets))
    by_id = {e["id"]: e for e in editions}
    for b in targets:
        out = os.path.join(ROOT, b.get("cover") or ("assets/covers/%s.jpg" % b["id"]))
        fam, bg, fg, ac = make_cover(b, out)
        e = by_id.get(b["id"])
        if e:
            e["bg"], e["fg"], e["ac"], e["tc"] = bg, fg, ac, fg
        print("drew", b["id"], fam, bg)
    with open(editions_path, "w", encoding="utf-8") as fh:
        for e in editions:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")

    # Match the 3D-spine palette in the same run (same code as add_books.py).
    def enc_hex(v):
        return "".join(chr(97 + int(x, 16)) for x in v.lstrip("#").lower())

    spines = {e["id"]: enc_hex(e["bg"]) + enc_hex(e["fg"]) + enc_hex(e["ac"])
              for e in editions if e.get("bg") and e.get("fg") and e.get("ac")}
    open(os.path.join(ROOT, "js/editions-data.js"), "w", encoding="utf-8").write(
        "/* TheSmallBook editions: generated from tools/editions/editions.jsonl. */\n"
        "window.TSB_ED = " + json.dumps(spines, separators=(",", ":")) + ";\n")
    print("done")


if __name__ == "__main__":
    main()
