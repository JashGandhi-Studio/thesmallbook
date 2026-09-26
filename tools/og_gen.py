#!/usr/bin/env python3
"""Regenerates assets/og-image.png (1200x630). v291: 460 books / 3,138 lessons / 315 autopsies.
Run from repo root:  python3 tools/og_gen.py"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
CREAM = (242, 239, 228)
INK = (23, 19, 16)
YELLOW = (247, 195, 45)
RED = (238, 111, 104)
PINK = (243, 184, 221)
DOTGRID = (219, 214, 198)

F = "/home/user/fonts/"
def arch(sz): return ImageFont.truetype(F + "ArchivoBlack.ttf", sz)

img = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(img)
for x in range(30, W, 30):
    for y in range(30, H, 30):
        d.ellipse([x-1, y-1, x+1, y+1], fill=DOTGRID)

def ctext(cx, y, s, font, fill):
    bb = d.textbbox((0, 0), s, font=font)
    w = bb[2] - bb[0]
    d.text((cx - w/2 - bb[0], y), s, font=font, fill=fill)
    return bb[2] - bb[0]

def chip(cx, y, s, font, bg, pad=18, shadow=8):
    bb = d.textbbox((0, 0), s, font=font)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    x0, y0 = cx - tw/2 - pad, y - pad
    x1, y1 = cx + tw/2 + pad, y + th + pad + bb[1]
    d.rectangle([x0+shadow, y0+shadow, x1+shadow, y1+shadow], fill=INK)
    d.rectangle([x0, y0, x1, y1], fill=bg)
    d.text((cx - tw/2 - bb[0], y - bb[1]), s, font=font, fill=INK)
    return y1

def booklogo(x, y, s):
    d.rounded_rectangle([x, y, x+s*0.82, y+s], radius=s*0.12, fill=INK)
    d.rounded_rectangle([x+s*0.06, y+s*0.06, x+s*0.76, y+s*0.94], radius=s*0.10, fill=RED)
    d.rectangle([x+s*0.28, y+s*0.14, x+s*0.44, y+s*0.86], fill=INK)
    d.rectangle([x+s*0.48, y+s*0.14, x+s*0.54, y+s*0.86], fill=INK)

# header
booklogo(70, 52, 58)
d.text((150, 62), "TheSmallBook", font=arch(40), fill=INK)
hb = d.textbbox((0, 0), "FREE FOREVER · NO ADS", font=arch(19))
htw = hb[2]-hb[0]
hx1 = W - 70
hx0 = hx1 - (htw + 36)
d.rectangle([hx0+8, 68, hx1+8, 126], fill=INK)
d.rectangle([hx0, 60, hx1, 118], fill=YELLOW)
d.text((hx0 + 18 - hb[0], 60 + (58 - (hb[3]-hb[1]))/2 - hb[1]), "FREE FOREVER · NO ADS", font=arch(19), fill=INK)

# kicker with flanking dot-trios (draw text first, use its width)
kick = "EVERY BOOK'S LESSONS · NONE OF THE FLUFF"
kw = ctext(W/2, 148, kick, arch(17), INK)
lx = W/2 - kw/2 - 28   # right edge of left trio
rx = W/2 + kw/2 + 28   # left edge of right trio
for i, col in enumerate([YELLOW, PINK, PINK]):
    d.ellipse([lx - (2-i)*20 - 6, 154, lx - (2-i)*20 + 6, 166], fill=col, outline=INK, width=2)
    d.ellipse([rx + i*20 - 6, 154, rx + i*20 + 6, 166], fill=col, outline=INK, width=2)

# headline
ctext(W/2, 196, "READ ANY GREAT BOOK", arch(64), INK)
cb = d.textbbox((0, 0), "30 SECONDS", font=arch(52))
ctw = cb[2]-cb[0]
inw = d.textbbox((0, 0), "IN", font=arch(52))
gap = 26
grp = inw[2]-inw[0] + gap + ctw + 36
gx = W/2 - grp/2
d.text((gx - inw[0], 300 - inw[1]), "IN", font=arch(52), fill=INK)
px0 = gx + (inw[2]-inw[0]) + gap
d.rectangle([px0+8, 296, px0+ctw+36+8, 368], fill=INK)
d.rectangle([px0, 288, px0+ctw+36, 360], fill=YELLOW)
d.text((px0 + 18 - cb[0], 288 + (72 - (cb[3]-cb[1]))/2 - cb[1]), "30 SECONDS", font=arch(52), fill=INK)

# tiles
tiles = [("460", "BOOKS", YELLOW), ("3,138", "LESSONS", RED), ("315", "AUTOPSIES", PINK)]
tw, th, gap = 340, 138, 30
x0 = (W - 3*tw - 2*gap)/2
y0 = 398
for i, (num, lab, col) in enumerate(tiles):
    x = x0 + i*(tw+gap)
    d.rectangle([x+9, y0+9, x+tw+9, y0+th+9], fill=INK)
    d.rectangle([x, y0, x+tw, y0+th], fill=col)
    nb = d.textbbox((0, 0), num, font=arch(56))
    d.text((x + tw/2 - (nb[2]-nb[0])/2 - nb[0], y0 + 14 - nb[1]), num, font=arch(56), fill=INK)
    lb = d.textbbox((0, 0), lab, font=arch(20))
    d.text((x + tw/2 - (lb[2]-lb[0])/2 - lb[0], y0 + 96 - lb[1]), lab, font=arch(20), fill=INK)

# footer
d.line([70, 578, W-70, 578], fill=INK, width=4)
booklogo(70, 596, 24)
d.text((110, 596), "thesmallbook.in", font=arch(22), fill=INK)
fb = d.textbbox((0, 0), "big books, small reads", font=arch(22))
d.text((W-70-(fb[2]-fb[0]), 596), "big books, small reads", font=arch(22), fill=(140, 133, 120))

img.save("assets/og-image.png", optimize=True)
print("og-image.png regenerated: 460 / 3,138 / 315")
