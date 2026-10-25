#!/usr/bin/env python3
"""
tools/render_film.py
Renders a broadcast-quality, recorded motion graphics product film for TheSmallBook.
Features:
- High-resolution 1080p (1920x1080) at 24fps
- 8 cinematic motion-graphics scenes with real B-roll & book covers
- Fully synchronized neural voiceover and ambient soundtrack
- Pulsing golden aura conversion button
- Zero em/en dashes
"""

import os, sys, math, time, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1920, 1080
FPS = 24

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
FONT_BOLD = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")
FONT_REG = os.path.join(FONT_DIR, "DejaVuSans.ttf")

f_hero = ImageFont.truetype(FONT_BOLD, 64)
f_title = ImageFont.truetype(FONT_BOLD, 48)
f_head = ImageFont.truetype(FONT_BOLD, 36)
f_card = ImageFont.truetype(FONT_BOLD, 26)
f_sub = ImageFont.truetype(FONT_REG, 24)
f_sm = ImageFont.truetype(FONT_REG, 18)
f_sm_bold = ImageFont.truetype(FONT_BOLD, 18)
f_metric = ImageFont.truetype(FONT_BOLD, 84)
f_btn = ImageFont.truetype(FONT_BOLD, 34)

# Preload visual assets
ASSETS_DIR = "/home/user/thesmallbook/assets"
IMG_SEARCH_DIR = "/home/user/image-search"

def load_img(path, size=None):
    if os.path.exists(path):
        im = Image.open(path).convert("RGB")
        if size:
            im = im.resize(size, Image.Resampling.LANCZOS)
        return im
    return None

broll_nightstand = load_img(os.path.join(IMG_SEARCH_DIR, "pile-of-thick-books-on-nightstand-aesthe-2.jpg"))
broll_commute = load_img(os.path.join(ASSETS_DIR, "stories/bus-window-commute.jpg"))
broll_founder = load_img(os.path.join(ASSETS_DIR, "stories/hard-things-founder-night.jpg"))
app_icon = load_img(os.path.join(ASSETS_DIR, "icon-192.png"), (80, 80))

cover_names = [
    "psychology-of-money.jpg",
    "atomic-habits.jpg",
    "zero-to-one.jpg",
    "almanack-naval.jpg",
    "deep-work.jpg",
    "the-kirana-ledger.jpg"
]
book_covers = {}
for cn in cover_names:
    p = os.path.join(ASSETS_DIR, "covers", cn)
    if os.path.exists(p):
        book_covers[cn] = Image.open(p).convert("RGB")

def ease_out(t):
    return 1.0 - (1.0 - t) ** 3

def ease_in_out(t):
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        return 1.0 - ((-2.0 * t + 2.0) ** 3) / 2.0

def draw_pill(draw, x, y, text, border_col, fill_col, text_col, font=f_sm_bold):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw, ph = tw + 36, th + 20
    draw.rounded_rectangle([x, y, x + pw, y + ph], radius=ph//2, fill=fill_col, outline=border_col, width=2)
    draw.text((x + 18, y + 10), text, font=font, fill=text_col)
    return pw, ph

# ----------------- SCENE RENDERERS -----------------

def render_scene_1(frame_idx, total_frames):
    """Nightstand Hook & 92% Fluff Problem"""
    t = frame_idx / total_frames
    im = Image.new("RGB", (W, H), (14, 15, 18))
    
    # B-roll Ken Burns zoom
    if broll_nightstand:
        zoom = 1.0 + 0.12 * t
        bw, bh = broll_nightstand.size
        crop_w = int(bw / zoom)
        crop_h = int(bh / zoom)
        cx = int(bw * (0.5 - 0.05 * t))
        cy = int(bh * (0.5 + 0.05 * t))
        x1 = max(0, cx - crop_w // 2)
        y1 = max(0, cy - crop_h // 2)
        x2 = min(bw, x1 + crop_w)
        y2 = min(bh, y1 + crop_h)
        cropped = broll_nightstand.crop((x1, y1, x2, y2)).resize((960, 1080), Image.Resampling.LANCZOS)
        im.paste(cropped, (960, 0))
    
    # Left-to-right shadow gradient
    grad = Image.new("RGBA", (960, 1080), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for x in range(960):
        alpha = int(255 * (1.0 - (x / 960.0) ** 1.6))
        gd.line([(x, 0), (x, 1080)], fill=(14, 15, 18, alpha))
    im.paste(grad, (960, 0), grad)
    
    draw = ImageDraw.Draw(im)
    
    # Text animations
    alpha1 = min(1.0, t / 0.15)
    draw_pill(draw, 100, 100, "THE NIGHTSTAND PROBLEM", (245, 158, 11), (35, 28, 15), (245, 158, 11))
    
    # Headline
    draw.text((100, 180), "How many books did you buy...\nbut never finished?", font=f_hero, fill=(255, 255, 255), spacing=15)
    
    # 92% Counter
    count_t = min(1.0, max(0.0, (t - 0.18) / 0.35))
    current_val = int(ease_out(count_t) * 92)
    draw.text((100, 390), f"{current_val}%", font=f_metric, fill=(245, 158, 11))
    draw.text((360, 410), "OF NON-FICTION BOOKS ARE\n20 PAGES OF INSIGHT WRAPPED IN\n280 PAGES OF FILLER.", font=f_head, fill=(225, 228, 235), spacing=8)
    
    # Thickness breakdown card
    card_t = min(1.0, max(0.0, (t - 0.35) / 0.30))
    card_alpha = ease_out(card_t)
    if card_alpha > 0.05:
        cy_off = int((1.0 - card_alpha) * 40)
        draw.rounded_rectangle([100, 640 + cy_off, 900, 860 + cy_off], radius=18, fill=(22, 23, 28), outline=(55, 58, 70), width=2)
        draw.text((135, 675 + cy_off), "THE TYPICAL 300-PAGE BUSINESS BOOK", font=f_sm_bold, fill=(160, 165, 180))
        
        # Insight bar
        bar_prog = ease_out(min(1.0, max(0.0, (t - 0.45) / 0.35)))
        iw = int(140 * bar_prog)
        if iw > 10:
            draw.rounded_rectangle([135, 730 + cy_off, 135 + iw, 800 + cy_off], radius=10, fill=(245, 158, 11))
            if iw > 80:
                draw.text((150, 750 + cy_off), "20 PAGES", font=f_sm_bold, fill=(15, 16, 20))
        
        # Fluff bar
        fw = int(580 * bar_prog)
        if fw > 10:
            draw.rounded_rectangle([290, 730 + cy_off, 290 + fw, 800 + cy_off], radius=10, fill=(45, 48, 60))
            if fw > 200:
                draw.text((320, 750 + cy_off), "280 PAGES OF REPETITIVE FLUFF", font=f_sm, fill=(180, 185, 200))

    return im

def render_scene_2(frame_idx, total_frames):
    """The Anti-Library & 500 Books"""
    t = frame_idx / total_frames
    im = Image.new("RGB", (W, H), (14, 15, 19))
    draw = ImageDraw.Draw(im)
    
    # Gentle background dot grid
    for gx in range(60, W, 60):
        for gy in range(60, H, 60):
            draw.ellipse([gx, gy, gx+2, gy+2], fill=(32, 34, 44))
    
    draw_pill(draw, 100, 80, "THE WORLD'S ANTI-LIBRARY", (245, 158, 11), (35, 28, 15), (245, 158, 11))
    draw.text((100, 150), "Every Book's Best Lessons.\nNone of the Fluff.", font=f_hero, fill=(255, 255, 255), spacing=12)
    draw.text((100, 290), "5-step action plans, real case studies, and failure caveats you can finish in 4 minutes.", font=f_sub, fill=(160, 165, 180))
    
    # 5 Floating Book Covers in 3D arc
    covers_list = ["psychology-of-money.jpg", "atomic-habits.jpg", "zero-to-one.jpg", "almanack-naval.jpg", "deep-work.jpg"]
    bw, bh = 240, 360
    center_x = 960
    
    for idx, cname in enumerate(covers_list):
        if cname in book_covers:
            offset_idx = idx - 2 # -2, -1, 0, 1, 2
            # Entrance spring
            delay = idx * 0.08
            entry_t = min(1.0, max(0.0, (t - delay) / 0.45))
            entry_y = (1.0 - ease_out(entry_t)) * 500
            
            # Gentle sinusoidal floating bobbing
            float_y = math.sin((t * 2.5 + idx * 0.6) * math.pi) * 8
            
            bx = int(center_x + offset_idx * 215 - bw / 2)
            by = int(450 + abs(offset_idx) * 32 + entry_y + float_y)
            
            # Shadow
            draw.rounded_rectangle([bx + 12, by + 18, bx + bw + 12, by + bh + 18], radius=14, fill=(5, 5, 8))
            
            # Resize and paste
            cov_img = book_covers[cname].resize((bw, bh), Image.Resampling.LANCZOS)
            im.paste(cov_img, (bx, by))
            draw.rectangle([bx, by, bx + bw, by + bh], outline=(255, 255, 255, 100), width=2)
    
    # Bottom Stats Bar
    metrics = [
        ("500+", "CURATED NON-FICTION"),
        ("3,685", "ACTIONABLE LESSONS"),
        ("400", "FAILURE AUTOPSIES"),
        ("4 MIN", "AVERAGE READ TIME")
    ]
    for i, (val, lbl) in enumerate(metrics):
        mx = 140 + i * 420
        draw.text((mx, 920), val, font=f_head, fill=(245, 158, 11))
        draw.text((mx, 970), lbl, font=f_sm_bold, fill=(160, 165, 180))

    return im

def render_scene_3(frame_idx, total_frames):
    """Natural Texting Translation & Hinglish Flow"""
    t = frame_idx / total_frames
    im = Image.new("RGB", (W, H), (14, 15, 19))
    draw = ImageDraw.Draw(im)
    
    draw_pill(draw, 100, 80, "NATURAL TEXTING TRANSLATION", (245, 158, 11), (35, 28, 15), (245, 158, 11))
    draw.text((100, 150), "Real People Don't Talk Like Textbooks.", font=f_hero, fill=(255, 255, 255))
    draw.text((100, 235), "Read non-fiction in the exact conversational flow you use with friends.", font=f_sub, fill=(160, 165, 180))
    
    # Left Card: Formal English Textbook
    left_t = min(1.0, t / 0.30)
    left_x = int(100 - (1.0 - ease_out(left_t)) * 150)
    draw.rounded_rectangle([left_x, 320, left_x + 760, 740], radius=20, fill=(20, 22, 28), outline=(60, 65, 80), width=2)
    draw_pill(draw, left_x + 35, 350, "FORMAL ENGLISH TEXTBOOK", (220, 50, 50), (45, 22, 22), (248, 113, 113))
    draw.text((left_x + 35, 430), "The Psychology of Money - Morgan Housel", font=f_sm, fill=(140, 145, 160))
    draw.text((left_x + 35, 490), "\"Compounding requires an emotional\nfortitude to endure sustained market\nvolatility without succumbing to\nirrational liquidation behaviors.\"", font=f_card, fill=(200, 205, 215), spacing=12)
    
    # Right Card: Hinglish Chat Bubble
    right_t = min(1.0, max(0.0, (t - 0.20) / 0.35))
    right_x = int(920 + (1.0 - ease_out(right_t)) * 150)
    draw.rounded_rectangle([right_x, 320, right_x + 900, 740], radius=20, fill=(16, 26, 22), outline=(34, 197, 94), width=2)
    draw_pill(draw, right_x + 35, 350, "HINGLISH NATURAL CHAT", (34, 197, 94), (18, 45, 28), (74, 222, 128))
    draw.text((right_x + 35, 430), "TheSmallBook Natural Conversational Stream", font=f_sm, fill=(140, 180, 150))
    
    # Green WhatsApp style message bubble
    draw.rounded_rectangle([right_x + 35, 480, right_x + 860, 680], radius=16, fill=(12, 38, 26))
    draw.text((right_x + 65, 515), "\"Bhai simple rule hai:\nThoda patience rakhoge aur panic me sell nahi karoge,\ntoh compounding asli azaadi banayegi!\"", font=f_card, fill=(240, 255, 245), spacing=14)
    draw.text((right_x + 740, 635), "10:42 AM  vv", font=f_sm_bold, fill=(74, 222, 128))
    
    # Moving language pills at bottom
    langs = ["Hinglish", "Gujlish", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Kannada", "Malayalam", "Punjabi", "+ 16 More"]
    scroll_off = int(t * 180)
    lx = 100 - scroll_off
    for l in langs:
        bbox = f_sm_bold.getbbox(l)
        tw = bbox[2] - bbox[0]
        pw = tw + 40
        if lx + pw > 0 and lx < W:
            draw.rounded_rectangle([lx, 820, lx + pw, 875], radius=18, fill=(28, 32, 42), outline=(50, 55, 70), width=1)
            draw.text((lx + 20, 838), l, font=f_sm_bold, fill=(220, 225, 235))
        lx += pw + 18

    return im

def render_scene_4(frame_idx, total_frames):
    """Make Friends & Community"""
    t = frame_idx / total_frames
    im = Image.new("RGB", (W, H), (14, 15, 19))
    
    # Left B-roll commuter with Ken Burns pan
    if broll_commute:
        zoom = 1.0 + 0.08 * t
        bw, bh = broll_commute.size
        cw, ch = int(bw / zoom), int(bh / zoom)
        x1 = int((bw - cw) * (0.3 + 0.1 * t))
        y1 = int((bh - ch) * 0.4)
        crop = broll_commute.crop((x1, y1, x1 + cw, y1 + ch)).resize((780, 1080), Image.Resampling.LANCZOS)
        im.paste(crop, (0, 0))
    
    # Edge gradient
    grad = Image.new("RGBA", (780, 1080), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for x in range(780):
        alpha = int(255 * (x / 780.0) ** 1.8)
        gd.line([(x, 0), (x, 1080)], fill=(14, 15, 19, alpha))
    im.paste(grad, (0, 0), grad)
    
    draw = ImageDraw.Draw(im)
    draw_pill(draw, 820, 80, "MAKE FRIENDS & COMMUNITY", (245, 158, 11), (35, 28, 15), (245, 158, 11))
    draw.text((820, 150), "Never Read in Isolation.", font=f_hero, fill=(255, 255, 255))
    draw.text((820, 235), "Connect with readers across India. Exchange notes and share daily streaks.", font=f_sub, fill=(160, 165, 180))
    
    # Reader Card 1: Aarav Sharma
    c1_t = min(1.0, max(0.0, (t - 0.12) / 0.35))
    c1_y = int(320 + (1.0 - ease_out(c1_t)) * 50)
    draw.rounded_rectangle([820, c1_y, 1820, c1_y + 200], radius=18, fill=(22, 24, 30), outline=(50, 55, 70), width=1)
    # Avatar
    draw.ellipse([850, c1_y + 25, 910, c1_y + 85], fill=(245, 158, 11))
    draw.text((880, c1_y + 55), "AR", font=f_sm_bold, fill=(15, 15, 15), anchor="mm")
    draw.text((930, c1_y + 30), "Aarav Sharma", font=f_card, fill=(255, 255, 255))
    draw.text((930, c1_y + 65), "Bengaluru  ·  Reading Atomic Habits", font=f_sm, fill=(140, 145, 160))
    draw_pill(draw, 1610, c1_y + 30, "STREAK: 14 DAYS", (245, 158, 11), (45, 30, 15), (245, 158, 11))
    draw.text((850, c1_y + 115), "\"Never miss twice. Missing once is an accident. Missing twice is the\nstart of a new bad habit. Just show up, even for 2 minutes.\"", font=f_sub, fill=(220, 225, 235), spacing=6)
    
    # Reader Card 2: Ananya Patel
    c2_t = min(1.0, max(0.0, (t - 0.30) / 0.35))
    c2_y = int(550 + (1.0 - ease_out(c2_t)) * 50)
    draw.rounded_rectangle([820, c2_y, 1820, c2_y + 200], radius=18, fill=(22, 24, 30), outline=(50, 55, 70), width=1)
    draw.ellipse([850, c2_y + 25, 910, c2_y + 85], fill=(168, 85, 247))
    draw.text((880, c2_y + 55), "AP", font=f_sm_bold, fill=(255, 255, 255), anchor="mm")
    draw.text((930, c2_y + 30), "Ananya Patel", font=f_card, fill=(255, 255, 255))
    draw.text((930, c2_y + 65), "Mumbai  ·  Gold VIP Member", font=f_sm, fill=(140, 145, 160))
    draw_pill(draw, 1640, c2_y + 30, "GOLD VIP", (245, 158, 11), (45, 35, 15), (245, 158, 11))
    draw.text((850, c2_y + 115), "\"Room for error is the most under-appreciated force in investing.\nHaving a buffer allows you to survive long enough to win.\"", font=f_sub, fill=(220, 225, 235), spacing=6)
    
    # Bottom ticker
    draw.rounded_rectangle([820, 800, 1820, 870], radius=16, fill=(28, 30, 38), outline=(60, 65, 80), width=1)
    draw.text((850, 835), "1-TO-1 NOTE EXCHANGES   ·   VIRAL QUOTE CARDS   ·   READING CIRCLES", font=f_sm_bold, fill=(245, 158, 11), anchor="lm")

    return im

def render_scene_5(frame_idx, total_frames):
    """The Startup Graveyard (400 Autopsies)"""
    t = frame_idx / total_frames
    im = Image.new("RGB", (W, H), (12, 13, 16))
    draw = ImageDraw.Draw(im)
    
    draw_pill(draw, 100, 80, "THE STARTUP GRAVEYARD", (239, 68, 68), (40, 20, 20), (248, 113, 113))
    draw.text((100, 150), "Biographies teach what to copy.\nThe Graveyard teaches what kills you.", font=f_hero, fill=(255, 255, 255), spacing=12)
    
    cases = [
        ("BYJU'S", "-$22 BILLION", "Aggressive debt financing and\ntoxic high-pressure sales culture.", "The Hard Thing About Hard Things"),
        ("WEWORK", "-$47 BILLION", "Founder hubris and mispriced\nlong-term office lease liabilities.", "The Innovator's Dilemma"),
        ("THERANOS", "-$700 MILLION", "Fabricated clinical trials,\nextreme secrecy, and zero audit.", "Bad Blood")
    ]
    
    for idx, (name, loss, cause, book) in enumerate(cases):
        delay = idx * 0.12
        card_t = min(1.0, max(0.0, (t - delay) / 0.35))
        card_y = int(330 + (1.0 - ease_out(card_t)) * 60)
        cx = 100 + idx * 580
        
        # Card body
        draw.rounded_rectangle([cx, card_y, cx + 540, card_y + 510], radius=18, fill=(20, 21, 26), outline=(65, 30, 30), width=2)
        
        # Forensic badge
        draw.rounded_rectangle([cx + 30, card_y + 30, cx + 220, card_y + 70], radius=8, fill=(60, 20, 20))
        draw.text((cx + 45, card_y + 40), f"FORENSIC CASE #{idx+1}", font=f_sm_bold, fill=(248, 113, 113))
        
        draw.text((cx + 30, card_y + 95), name, font=f_head, fill=(255, 255, 255))
        draw.text((cx + 30, card_y + 145), loss, font=f_head, fill=(239, 68, 68))
        
        draw.text((cx + 30, card_y + 210), "FATAL FLAW:", font=f_sm_bold, fill=(160, 165, 180))
        draw.text((cx + 30, card_y + 245), cause, font=f_sub, fill=(210, 215, 225), spacing=8)
        
        # Antidote box
        draw.rounded_rectangle([cx + 25, card_y + 390, cx + 515, card_y + 475], radius=10, fill=(30, 25, 20), outline=(245, 158, 11), width=1)
        draw.text((cx + 40, card_y + 405), "PRESCRIBED ANTIDOTE:", font=f_sm, fill=(245, 158, 11))
        draw.text((cx + 40, card_y + 435), book, font=f_sm_bold, fill=(255, 255, 255))
    
    # Bottom banner
    draw.rounded_rectangle([560, 910, 1360, 970], radius=30, fill=(25, 26, 32), outline=(50, 52, 64), width=1)
    draw.text((960, 940), "400 STARTUP FAILURE AUTOPSIES  ·  100% OPEN TO ALL", font=f_sm_bold, fill=(245, 158, 11), anchor="mm")

    return im

def render_scene_6(frame_idx, total_frames):
    """3D Discovery Desk & Spring Action Bar"""
    t = frame_idx / total_frames
    im = Image.new("RGB", (W, H), (14, 15, 19))
    draw = ImageDraw.Draw(im)
    
    draw_pill(draw, 100, 80, "PHYSICAL SENSORY READING", (245, 158, 11), (35, 28, 15), (245, 158, 11))
    draw.text((100, 150), "Hold Books in 3D. Spin on Your Desk.", font=f_hero, fill=(255, 255, 255))
    draw.text((100, 235), "Experience realistic physical gravity, page spreads, and spring dock customization.", font=f_sub, fill=(160, 165, 180))
    
    # 3D Book on desk with angle rotation
    cname = "the-kirana-ledger.jpg" if "the-kirana-ledger.jpg" in book_covers else "psychology-of-money.jpg"
    cov_img = book_covers.get(cname)
    if cov_img:
        # Desk surface
        draw.polygon([(100, 840), (680, 840), (620, 980), (160, 980)], fill=(32, 24, 18))
        
        # Book shadow
        draw.ellipse([220, 760, 620, 860], fill=(5, 5, 8))
        
        # Perspective book pages block
        spin_t = math.sin(t * 3.14) * 15
        bw, bh = 320, 480
        cov_resized = cov_img.resize((bw, bh), Image.Resampling.LANCZOS)
        
        bx, by = 240, 340
        # Spine & top edge
        draw.polygon([(bx, by), (bx + 25, by - 20), (bx + bw + 25, by - 20), (bx + bw, by)], fill=(210, 200, 185))
        draw.polygon([(bx + bw, by), (bx + bw + 25, by - 20), (bx + bw + 25, by + bh - 20), (bx + bw, by + bh)], fill=(160, 150, 135))
        im.paste(cov_resized, (bx, by))
        draw.rectangle([bx, by, bx + bw, by + bh], outline=(255, 255, 255, 80), width=2)
    
    # Right: Live Spring Action Bar demonstration
    draw.rounded_rectangle([720, 330, 1820, 840], radius=20, fill=(20, 22, 28), outline=(50, 55, 70), width=2)
    draw.text((760, 370), "SPRING REORDERABLE ACTION BAR", font=f_head, fill=(255, 255, 255))
    draw.text((760, 425), "Long-press any tab to enter edit mode. Smoothly drag and swap slots.", font=f_sub, fill=(160, 165, 180))
    
    # Action bar tabs
    tabs = [
        ("HOME", "Home", False),
        ("3D", "3D Discover", True), # Active drag
        ("SHELF", "My Shelf", False),
        ("GRAVE", "Graveyard", False),
        ("GOLD", "Gold Pass", False)
    ]
    
    bar_x = 760
    drag_prog = math.sin(t * 4.0) * 0.5 + 0.5 # Oscillates slightly
    
    for code, label, is_dragged in tabs:
        sw, sh = 190, 140
        bx = bar_x
        by = 540
        if is_dragged:
            # Lifted slot with gold glow
            dy = int(-25 - 10 * drag_prog)
            draw.rounded_rectangle([bx - 8, by + dy - 8, bx + sw + 8, by + sh + dy + 8], radius=20, outline=(245, 158, 11), width=3)
            draw.rounded_rectangle([bx, by + dy, bx + sw, by + sh + dy], radius=16, fill=(45, 35, 20), outline=(245, 158, 11), width=2)
            draw.text((bx + sw//2, by + dy + 45), code, font=f_head, fill=(245, 158, 11), anchor="mm")
            draw.text((bx + sw//2, by + dy + 105), label, font=f_sm_bold, fill=(245, 158, 11), anchor="mm")
            draw.text((bx + sw//2, by + dy - 30), "DRAGGING LIVE", font=f_sm_bold, fill=(245, 158, 11), anchor="mm")
        else:
            draw.rounded_rectangle([bx, by, bx + sw, by + sh], radius=16, fill=(28, 30, 38), outline=(45, 50, 62), width=1)
            draw.text((bx + sw//2, by + 45), code, font=f_head, fill=(200, 205, 215), anchor="mm")
            draw.text((bx + sw//2, by + 105), label, font=f_sm_bold, fill=(160, 165, 180), anchor="mm")
        bar_x += sw + 25
    
    draw.text((760, 750), "Powered by touch physics  ·  5-slot configuration persists across reloads", font=f_sub, fill=(245, 158, 11))

    return im

def render_scene_7(frame_idx, total_frames):
    """The Gold Pass & Pulsing Glowing Aura Button"""
    t = frame_idx / total_frames
    im = Image.new("RGBA", (W, H), (12, 13, 17, 255))
    
    # VIP Card Container
    card_x1, card_y1, card_x2, card_y2 = 440, 90, 1480, 960
    
    # Golden border on card
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle([card_x1, card_y1, card_x2, card_y2], radius=24, fill=(18, 19, 25), outline=(245, 158, 11), width=2)
    
    # VIP badge
    draw_pill(draw, 875, 130, "VIP MEMBERSHIP", (245, 158, 11), (45, 35, 15), (245, 158, 11))
    
    draw.text((960, 220), "THESMALLBOOK GOLD", font=f_hero, fill=(255, 255, 255), anchor="mt")
    draw.text((960, 300), "The ultimate reading sanctuary for founders and operators.", font=f_sub, fill=(160, 165, 180), anchor="mt")
    
    # Price
    draw.text((960, 370), "INR 99 / MONTH  ·  CANCEL ANYTIME", font=f_head, fill=(245, 158, 11), anchor="mt")
    
    # Perks
    perks = [
        "v  5 Custom Persistent Dock Action Slots",
        "v  100 Exclusive Forensic Startup Autopsies",
        "v  35 In-House Original Books & Deep Audio Dives",
        "v  Instant Zero-Latency Offline Access"
    ]
    py = 460
    for perk in perks:
        draw.text((580, py), perk, font=f_card, fill=(230, 235, 245))
        py += 52
    
    # ---------------- THE GLOWING AURA BUTTON ----------------
    btn_x, btn_y, btn_w, btn_h = 540, 740, 840, 100
    pulse = (math.sin(t * 8.0) + 1.0) / 2.0 # 0 to 1 breathing pulse
    
    # Glow layer
    glow_surf = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_surf)
    
    # Expanding concentric aura rings
    for r in [90, 70, 50, 35, 20, 10]:
        ring_alpha = int((35 + 45 * pulse) * (1.0 - r / 100.0))
        gd.rounded_rectangle([btn_x - r, btn_y - r, btn_x + btn_w + r, btn_y + btn_h + r], radius=btn_h//2 + r, fill=(245, 158, 11, ring_alpha))
    
    glow_surf = glow_surf.filter(ImageFilter.GaussianBlur(14))
    im.alpha_composite(glow_surf)
    
    # Re-draw crisp button over the glow
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=btn_h//2, fill=(245, 158, 11))
    # Top bevel highlight
    draw.rounded_rectangle([btn_x + 6, btn_y + 4, btn_x + btn_w - 6, btn_y + btn_h//2], radius=btn_h//2, fill=(251, 191, 36, 120))
    # Text
    draw.text((btn_x + btn_w//2, btn_y + btn_h//2), "GET GOLD PASS  ·  INR 99 / MO  ->", font=f_btn, fill=(15, 16, 20), anchor="mm")
    
    # Sparkle particles around button
    for p_idx in range(12):
        angle = (t * 2.0 + p_idx * (math.pi / 6)) % (2 * math.pi)
        dist = 80 + 30 * math.sin(t * 6.0 + p_idx)
        px = int(btn_x + btn_w//2 + math.cos(angle) * (btn_w//2 + dist))
        py = int(btn_y + btn_h//2 + math.sin(angle) * (btn_h//2 + dist))
        if card_x1 + 20 < px < card_x2 - 20 and card_y1 + 20 < py < card_y2 - 20:
            draw.ellipse([px - 3, py - 3, px + 3, py + 3], fill=(251, 191, 36, int(180 * pulse)))

    return im.convert("RGB")

def render_scene_8(frame_idx, total_frames):
    """Home Screen Shortcut & App Store Announcement (Outro)"""
    t = frame_idx / total_frames
    im = Image.new("RGB", (W, H), (14, 15, 19))
    draw = ImageDraw.Draw(im)
    
    # Fade to black at end
    fade_black = 1.0
    if t > 0.85:
        fade_black = max(0.0, (1.0 - t) / 0.15)
    
    # Official App Icon + Wordmark
    if app_icon:
        im.paste(app_icon, (760, 95))
    draw.text((860, 135), "THESMALLBOOK", font=f_hero, fill=(255, 255, 255), anchor="lm")
    draw.text((960, 210), "BIG BOOKS  ·  SMALL READS", font=f_head, fill=(245, 158, 11), anchor="mm")
    
    # 3-step shortcut container
    draw.rounded_rectangle([260, 290, 1660, 610], radius=24, fill=(20, 22, 28), outline=(50, 55, 70), width=2)
    draw.text((960, 335), "INSTALL TO HOME SCREEN IN 3 SECONDS", font=f_head, fill=(255, 255, 255), anchor="mm")
    
    steps = [
        ("1", "TAP SHARE", "Tap the Share icon in Safari or Chrome"),
        ("2", "ADD TO HOME", "Select \"Add to Home Screen\" from menu"),
        ("3", "NATIVE SPEED", "Full-screen app with instant offline load")
    ]
    for idx, (num, title, desc) in enumerate(steps):
        sx = 340 + idx * 440
        draw.ellipse([sx + 150, 400, sx + 210, 460], fill=(245, 158, 11))
        draw.text((sx + 180, 430), num, font=f_card, fill=(15, 15, 15), anchor="mm")
        draw.text((sx + 180, 495), title, font=f_card, fill=(255, 255, 255), anchor="mm")
        draw.text((sx + 180, 540), desc, font=f_sm, fill=(160, 165, 180), anchor="mm")
    
    # GRAND STORE ANNOUNCEMENT BANNER
    pulse = (math.sin(t * 6.0) + 1.0) / 2.0
    bx1, by1, bx2, by2 = 320, 680, 1600, 840
    for g in [12, 8, 4]:
        draw.rounded_rectangle([bx1 - g, by1 - g, bx2 + g, by2 + g], radius=30 + g, outline=(245, 158, 11, int(50 + 40 * pulse)), width=2)
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=30, fill=(30, 22, 12), outline=(245, 158, 11), width=3)
    
    draw.text((960, 735), "OFFICIAL STORE ANNOUNCEMENT", font=f_head, fill=(245, 158, 11), anchor="mm")
    draw.text((960, 790), "SOON COMING TO GOOGLE PLAY STORE & APPLE APP STORE", font=f_card, fill=(255, 255, 255), anchor="mm")
    
    draw.text((960, 940), "thesmallbook.in", font=f_sub, fill=(140, 145, 160), anchor="mm")
    
    if fade_black < 1.0:
        darken = Image.new("RGBA", (W, H), (0, 0, 0, int(255 * (1.0 - fade_black))))
        im.paste(Image.composite(Image.new("RGB", (W, H), (0,0,0)), im, darken.convert("L")))
        
    return im

SCENES = [
    ("scene1", 314, render_scene_1),
    ("scene2", 205, render_scene_2),
    ("scene3", 210, render_scene_3),
    ("scene4", 206, render_scene_4),
    ("scene5", 294, render_scene_5),
    ("scene6", 193, render_scene_6),
    ("scene7", 252, render_scene_7),
    ("scene8", 288, render_scene_8),
]

def main():
    out_dir = "/home/user/thesmallbook/assets"
    os.makedirs(out_dir, exist_ok=True)
    out_mp4 = os.path.join(out_dir, "thesmallbook-product-film.mp4")
    
    total_frames = sum(frames for _, frames, _ in SCENES)
    total_sec = total_frames / FPS
    print(f"Rendering TheSmallBook Product Film: {total_frames} frames ({total_sec:.2f}s) @ {FPS}fps...")
    
    # Verify audio file
    audio_path = "/tmp/master_audio.aac"
    if not os.path.exists(audio_path):
        print("ERROR: Master audio not found at", audio_path)
        sys.exit(1)
        
    # Start ffmpeg pipeline
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{W}x{H}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        out_mp4
    ]
    
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    rendered = 0
    
    for s_name, s_frames, s_func in SCENES:
        print(f"Rendering {s_name} ({s_frames} frames)...")
        for f in range(s_frames):
            frame_img = s_func(f, s_frames)
            raw_bytes = frame_img.tobytes()
            proc.stdin.write(raw_bytes)
            rendered += 1
            if rendered % 120 == 0:
                elapsed = time.time() - t0
                fps_act = rendered / elapsed
                print(f"  [{rendered}/{total_frames}] {rendered*100//total_frames}% ({fps_act:.1f} fps)")
                
    proc.stdin.close()
    proc.wait()
    
    elapsed = time.time() - t0
    fsize = os.path.getsize(out_mp4) / (1024 * 1024)
    print(f"Film generated successfully in {elapsed:.1f}s!")
    print(f"File: {out_mp4} ({fsize:.2f} MB)")

if __name__ == "__main__":
    main()
