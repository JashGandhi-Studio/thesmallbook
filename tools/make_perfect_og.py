#!/usr/bin/env python3
"""Generate a perfectly aligned, mathematically balanced OG image (1200x630) for TheSmallBook."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 1200, 630
CREAM = (246, 243, 234)
INK = (17, 17, 17)
YELLOW = (255, 200, 0)
RED = (235, 59, 53)
WHITE = (255, 255, 255)
DOT = (220, 215, 202)
MUTED = (95, 95, 95)

img = Image.new("RGBA", (W, H), CREAM + (255,))
draw = ImageDraw.Draw(img)

# Dot grid
for x in range(24, W, 28):
    for y in range(48, H, 28):
        draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=DOT)

# Top Bar
draw.rectangle([0, 0, W, 36], fill=INK)
font_top = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
top_text = "✦ THE ANTI-LIBRARY LIBRARY ✦"
bb_top = draw.textbbox((0, 0), top_text, font=font_top)
top_w = bb_top[2] - bb_top[0]
draw.text(((W - top_w) / 2, 11), top_text, font=font_top, fill=YELLOW)

# Alignment Guide:
# Left margin X = 76 for ALL left-side elements!
LEFT_X = 76

# Top-Left Logo (y = 66, perfectly aligned)
ly = 66
box_size = 44

mark_canvas = Image.new("RGBA", (box_size + 16, box_size + 16), (0, 0, 0, 0))
mdraw = ImageDraw.Draw(mark_canvas)
mdraw.rounded_rectangle([5, 5, box_size + 1, box_size + 1], radius=7, fill=INK)
mdraw.rounded_rectangle([2, 2, box_size - 2, box_size - 2], radius=7, fill=YELLOW, outline=INK, width=3)

loader_path = "assets/loader-logo.png"
if os.path.exists(loader_path):
    loader_icon = Image.open(loader_path).convert("RGBA")
    loader_icon = loader_icon.resize((26, 31), Image.Resampling.LANCZOS)
    mark_canvas.paste(loader_icon, (10, 7), loader_icon)

mark_rot = mark_canvas.rotate(6, expand=True, resample=Image.Resampling.BICUBIC)
img.paste(mark_rot, (LEFT_X, ly - 2), mark_rot)

# Brand word: "THESMALLBOOK" (Single word, Small in red)
font_brand = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 25)
tx = LEFT_X + 58
ty = ly + 9

draw.text((tx, ty), "THE", font=font_brand, fill=INK)
bb_the = draw.textbbox((tx, ty), "THE", font=font_brand)
tx_small = bb_the[2]

draw.text((tx_small, ty), "SMALL", font=font_brand, fill=RED)
bb_small = draw.textbbox((tx_small, ty), "SMALL", font=font_brand)
tx_book = bb_small[2]

draw.text((tx_book, ty), "BOOK", font=font_brand, fill=INK)

# Top Right: Official Tagline pill (symmetric top margin y = 66)
font_pill = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
pill_text = "BIG BOOKS · SMALL READS"
pill_w = 210
draw.rounded_rectangle([1124 - pill_w, ly, 1124, ly + 38], radius=19, fill=INK)
bb_ff = draw.textbbox((0, 0), pill_text, font=font_pill)
ff_w = bb_ff[2] - bb_ff[0]
draw.text((1124 - pill_w + (pill_w - ff_w) / 2, ly + 12), pill_text, font=font_pill, fill=YELLOW)

# =========================================================================
# MAIN HEADLINE (perfectly stacked with 52px line-height)
# =========================================================================
font_h1 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 46)
y_head = 154
lh = 54

# Line 1
draw.text((LEFT_X, y_head), "EVERY BOOK'S", font=font_h1, fill=INK)

# Line 2: with clean highlighter underline UNDER the letters (not over them!)
bb_bl = draw.textbbox((LEFT_X, y_head + lh), "BEST LESSONS.", font=font_h1)
# Yellow highlighter rectangle sitting cleanly under the baseline
draw.rectangle([LEFT_X, bb_bl[3] - 14, bb_bl[2], bb_bl[3] + 2], fill=YELLOW)
draw.text((LEFT_X, y_head + lh), "BEST LESSONS.", font=font_h1, fill=INK)

# Line 3
draw.text((LEFT_X, y_head + lh * 2), "NONE OF THE", font=font_h1, fill=INK)

# Line 4
draw.text((LEFT_X, y_head + lh * 3), "FLUFF.", font=font_h1, fill=INK)

# Subtitle cleanly aligned at LEFT_X
font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
draw.text((LEFT_X, 396), "The world's best books, broken into lessons,", font=font_sub, fill=MUTED)
draw.text((LEFT_X, 422), "stories and action steps you can finish in 4 minutes.", font=font_sub, fill=MUTED)

# Stat chips at bottom-left aligned at LEFT_X, baseline y = 478
font_chip = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)

def draw_chip(x, y, w, h, text, bg=WHITE, text_color=INK):
    draw.rounded_rectangle([x + 3, y + 3, x + w + 3, y + h + 3], radius=h // 2, fill=INK)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=bg, outline=INK, width=2)
    bb = draw.textbbox((0, 0), text, font=font_chip)
    tw = bb[2] - bb[0]
    th = bb[3] - bb[1]
    draw.text((x + (w - tw) / 2, y + (h - th) / 2 - 1), text, font=font_chip, fill=text_color)

CHIP_Y = 478
CHIP_H = 38
draw_chip(LEFT_X, CHIP_Y, 126, CHIP_H, "520 BOOKS", bg=YELLOW, text_color=INK)
draw_chip(LEFT_X + 138, CHIP_Y, 156, CHIP_H, "3,685 LESSONS", bg=WHITE, text_color=INK)
draw_chip(LEFT_X + 306, CHIP_Y, 154, CHIP_H, "400 AUTOPSIES", bg=WHITE, text_color=INK)

# Bottom right: thesmallbook.in pill (ALIGNED ON EXACT SAME CHIP_Y BASELINE!)
pill_site = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
site_text = "thesmallbook.in"
sx = 954
draw.rounded_rectangle([sx + 3, CHIP_Y + 3, sx + 170 + 3, CHIP_Y + CHIP_H + 3], radius=12, fill=YELLOW)
draw.rounded_rectangle([sx, CHIP_Y, sx + 170, CHIP_Y + CHIP_H], radius=12, fill=INK)
bbs = draw.textbbox((0, 0), site_text, font=pill_site)
stw = bbs[2] - bbs[0]
draw.text((sx + (170 - stw) / 2, CHIP_Y + 11), site_text, font=pill_site, fill=YELLOW)

# =========================================================================
# RIGHT SIDE: FANNED-OUT 3D BOOK STACK WITH SOFT GAUSSIAN SHADOWS
# =========================================================================

def render_book_with_soft_shadow(cover_file, w, h, angle_deg, blur_radius=10, shadow_alpha=120):
    if not os.path.exists(cover_file):
        return None
    cov = Image.open(cover_file).convert("RGBA")
    cov = cov.resize((w, h), Image.Resampling.LANCZOS)

    pad = 40
    cw, ch = w + pad * 2, h + pad * 2

    # Book card
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card)
    cdraw.rounded_rectangle([0, 0, w, h], radius=6, fill=INK)
    card.paste(cov, (0, 0))
    # Border
    cdraw.rounded_rectangle([0, 0, w, h], radius=6, outline=INK, width=2)
    # Spine highlight
    cdraw.line([6, 2, 6, h - 2], fill=(255, 255, 255, 75), width=2)

    # Master canvas with shadow
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    # Draw soft shadow mask
    smask = Image.new("L", (cw, ch), 0)
    sdraw = ImageDraw.Draw(smask)
    sdraw.rounded_rectangle([pad + 8, pad + 10, pad + w + 8, pad + h + 10], radius=8, fill=shadow_alpha)
    smask = smask.filter(ImageFilter.GaussianBlur(blur_radius))

    # Paste black with shadow mask
    sblack = Image.new("RGBA", (cw, ch), (15, 15, 15, 255))
    canvas.paste(sblack, (0, 0), smask)

    # Paste book card
    canvas.paste(card, (pad, pad), card)

    # Rotate
    rot = canvas.rotate(angle_deg, expand=True, resample=Image.Resampling.BICUBIC)
    return rot

# 1. Back Left: Atomic Habits (angled 13 deg left)
b_left = render_book_with_soft_shadow("assets/covers/atomic-habits.jpg", 230, 335, 13, blur_radius=10, shadow_alpha=110)
if b_left:
    img.paste(b_left, (640, 95), b_left)

# 2. Back Right: Good to Great (angled 14 deg right)
b_right = render_book_with_soft_shadow("assets/covers/good-to-great.jpg", 230, 335, -14, blur_radius=10, shadow_alpha=110)
if b_right:
    img.paste(b_right, (875, 105), b_right)

# 3. Back Center: Deep Work (tilted -2 deg)
b_mid = render_book_with_soft_shadow("assets/covers/deep-work.jpg", 225, 330, 2, blur_radius=8, shadow_alpha=100)
if b_mid:
    img.paste(b_mid, (770, 72), b_mid)

# 4. Front Centerpiece: The Psychology of Money (prominent, tilted 2 deg)
front_cov = Image.open("assets/covers/psychology-of-money.jpg").convert("RGBA")
fw, fh = 270, 395
front_cov = front_cov.resize((fw, fh), Image.Resampling.LANCZOS)

fpad = 50
fcw, fch = fw + fpad * 2, fh + fpad * 2

front_card = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
fcdraw = ImageDraw.Draw(front_card)
front_card.paste(front_cov, (0, 0))
fcdraw.rounded_rectangle([0, 0, fw, fh], radius=8, outline=INK, width=3)
fcdraw.line([7, 2, 7, fh - 2], fill=(255, 255, 255, 85), width=2)

front_canvas = Image.new("RGBA", (fcw, fch), (0, 0, 0, 0))
fsmask = Image.new("L", (fcw, fch), 0)
fsdraw = ImageDraw.Draw(fsmask)
fsdraw.rounded_rectangle([fpad + 10, fpad + 14, fpad + fw + 10, fpad + fh + 14], radius=10, fill=160)
fsmask = fsmask.filter(ImageFilter.GaussianBlur(12))

fsblack = Image.new("RGBA", (fcw, fch), (10, 10, 10, 255))
front_canvas.paste(fsblack, (0, 0), fsmask)
front_canvas.paste(front_card, (fpad, fpad), front_card)

front_rot = front_canvas.rotate(2, expand=True, resample=Image.Resampling.BICUBIC)
img.paste(front_rot, (735, 120), front_rot)

# Yellow Badge: "READ IN 4 MIN" on front cover
badge = Image.new("RGBA", (186, 44), (0, 0, 0, 0))
bdraw = ImageDraw.Draw(badge)
bdraw.rounded_rectangle([3, 3, 183, 41], radius=20, fill=INK)
bdraw.rounded_rectangle([0, 0, 180, 38], radius=20, fill=YELLOW, outline=INK, width=2)
font_badge = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
b_text = "READ IN 4 MIN"
bbb = bdraw.textbbox((0, 0), b_text, font=font_badge)
btw = bbb[2] - bbb[0]
bdraw.text(((180 - btw) / 2, 10), b_text, font=font_badge, fill=INK)

badge_rot = badge.rotate(-4, expand=True, resample=Image.Resampling.BICUBIC)
img.paste(badge_rot, (875, 475), badge_rot)

# Convert to RGB and save
final_img = img.convert("RGB")
final_img.save("assets/og-image.png", "PNG", optimize=True)
print("Saved mathematically aligned OG image: assets/og-image.png (1200x630)")
