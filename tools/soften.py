"""
v324 SOFT NEO converter.
Turns the hard neo-brutalist primitives (thick ink borders, hard offset
shadows, tight radii) into soft-neo tokens defined in css/style.css:
  --bw      border width (1.5px)
  --edge    soft ink edge colour (flips in dark mode)
  --sh-1/2/3  soft layered shadows by size, --sh-y for yellow glow
Runs over CSS files, inline style attributes / <style> blocks in HTML and
CSS strings inside JS. Idempotent: running it twice changes nothing.
usage: python3 tools/soften.py            (whole repo)
"""
import re, sys, os, glob

INK = r"(?:var\(--ink(?:,\s*#[0-9a-fA-F]{3,6})?\)|var\(--line\)|var\(--chip\)|#111111|#111|#000000|#000|#16130e|#14110c|#1a1a1a|black)"
COLOR_ANY = r"(?:var\(--[a-z0-9-]+(?:,\s*[^)]+)?\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|black|white)"

def border_sub(m):
    prop, w = m.group(1), float(m.group(3))
    return f"{prop}{m.group('sp')}{'var(--bw)' if w >= 2 else '1px'} solid var(--edge)"

def shadow_part(m):
    pre, x, y, col = m.group('pre'), float(m.group('x')), float(m.group('y')), m.group('col')
    if pre.strip().endswith('inset'):
        return m.group(0)
    a = max(abs(x), abs(y))
    if a == 0:
        return m.group(0)
    if re.match(r"(?i)#ffc800|var\(--yellow\)", col):
        return pre + 'var(--sh-y)'
    tok = 'var(--sh-1)' if a <= 2 else 'var(--sh-2)' if a <= 4 else 'var(--sh-3)'
    return pre + tok

def radius_sub(m):
    v = float(m.group(2))
    if 4 <= v <= 16:
        v = min(22, round(v * 1.45))
    return f"{m.group(1)}{int(v)}px"

RX_BORDER = re.compile(r"(border(?:-top|-bottom|-left|-right)?)(?P<sp>\s*:\s*)(\d+(?:\.\d+)?)px\s+solid\s+(" + INK + r")(?=\s*(?:!important)?\s*[;\"'}`,]|\s*$)", re.I)
RX_BORDER_TOKEN = re.compile(r"(--border\s*:\s*)\d+(?:\.\d+)?px solid var\(--ink\)")
RX_SHADOW_DECL = re.compile(r"(box-shadow\s*:\s*)([^;\"'`}]+)", re.I)
RX_SHADOW_PART = re.compile(r"(?P<pre>(?:^|,)\s*(?:inset\s+)?)(?P<x>-?\d*\.?\d+)(?:px)?\s+(?P<y>-?\d*\.?\d+)(?:px)?\s+0(?:px)?(?:\s+0(?:px)?)?\s+(?P<col>" + COLOR_ANY + r")(?=\s*(?:,|$|!important))", re.I)
RX_TEXT_SHADOW = re.compile(r"(text-shadow\s*:\s*)(-?\d+)px\s+(-?\d+)px\s+0(?:px)?\s+(" + INK + r")", re.I)
RX_RADIUS = re.compile(r"(border-radius\s*:\s*)(\d+(?:\.\d+)?)px(?=\s*[;\"'}`!])", re.I)
RX_SHADOW_TOKENS = re.compile(r"(--shadow(?:-sm|-lg)?\s*:\s*)\d+px \d+px 0 var\(--ink\)")

def soften_css_text(s):
    s = RX_BORDER_TOKEN.sub(lambda m: m.group(1) + "var(--bw) solid var(--edge)", s)
    s = RX_SHADOW_TOKENS.sub(lambda m: m.group(1) + {"--shadow": "var(--sh-2)", "--shadow-sm": "var(--sh-1)", "--shadow-lg": "var(--sh-3)"}[m.group(1).split(':')[0].strip()], s)
    s = RX_BORDER.sub(border_sub, s)
    s = RX_SHADOW_DECL.sub(lambda m: m.group(1) + RX_SHADOW_PART.sub(shadow_part, m.group(2)), s)
    s = RX_TEXT_SHADOW.sub(lambda m: m.group(1) + "0 2px 12px rgba(22,19,15,.10)", s)
    s = RX_RADIUS.sub(radius_sub, s)
    return s

def run(paths):
    changed = 0
    for p in paths:
        try:
            src = open(p, encoding='utf-8').read()
        except Exception:
            continue
        out = soften_css_text(src)
        if out != src:
            open(p, 'w', encoding='utf-8').write(out); changed += 1
    return changed

if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    files = glob.glob('css/*.css') + glob.glob('*.html') + glob.glob('js/*.js') + glob.glob('authors/*.html') + glob.glob('topics/*.html')
    files = [f for f in files if 'Copy' not in f and not f.endswith('og-builder.html')]
    print('softened', run(files), 'files')
