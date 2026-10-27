import os
import html

shows = [
  {"id": "wtf-nikhil", "name": "WTF is with Nikhil Kamath", "host": "Nikhil Kamath", "tag": "INDIA - FOUNDERS", "bg": "#12110f", "accent": "#ffc800", "sub": "#d6ccba"},
  {"id": "figuring-out", "name": "Figuring Out", "host": "Raj Shamani", "tag": "INDIA - FOUNDERS", "bg": "#191528", "accent": "#a78bfa", "sub": "#d6ccba"},
  {"id": "barbershop", "name": "The Barbershop", "host": "Shantanu Deshmukh", "tag": "INDIA - CONVERSATIONS", "bg": "#1f140e", "accent": "#fb923c", "sub": "#d6ccba"},
  {"id": "founders-senra", "name": "Founders", "host": "David Senra", "tag": "BOOKS - BIOGRAPHIES", "bg": "#0f172a", "accent": "#38bdf8", "sub": "#d6ccba"},
  {"id": "knowledge-project", "name": "The Knowledge Project", "host": "Shane Parrish", "tag": "BOOKS - DECISIONS", "bg": "#161b22", "accent": "#34d399", "sub": "#d6ccba"},
  {"id": "tim-ferriss", "name": "The Tim Ferriss Show", "host": "Tim Ferriss", "tag": "AUTHORS - CRAFT", "bg": "#1a1614", "accent": "#fbbf24", "sub": "#d6ccba"},
  {"id": "book-review", "name": "The Book Review", "host": "The New York Times", "tag": "BOOKS - WEEKLY", "bg": "#111827", "accent": "#fb7185", "sub": "#d6ccba"},
  {"id": "invest-best", "name": "Invest Like the Best", "host": "Patrick O'Shaughnessy", "tag": "MONEY - INVESTING", "bg": "#0a192f", "accent": "#60a5fa", "sub": "#d6ccba"},
  {"id": "paisa-waisa", "name": "Paisa Vaisa", "host": "Anupam Gupta", "tag": "INDIA - MONEY", "bg": "#141f17", "accent": "#4ade80", "sub": "#d6ccba"},
  {"id": "the-neon-show", "name": "The Neon Show", "host": "Siddhartha Ahluwalia", "tag": "INDIA - FOUNDERS", "bg": "#210926", "accent": "#e879f9", "sub": "#d6ccba"},
  {"id": "dreamers-unicorns", "name": "Dreamers and Unicorns", "host": "Nitin Pai", "tag": "INDIA - STARTUPS", "bg": "#131a29", "accent": "#22d3ee", "sub": "#d6ccba"},
  {"id": "how-i-built-this", "name": "How I Built This", "host": "Guy Raz", "tag": "FOUNDERS - GLOBAL", "bg": "#261517", "accent": "#f87171", "sub": "#d6ccba"},
  {"id": "diary-of-a-ceo", "name": "The Diary Of A CEO", "host": "Steven Bartlett", "tag": "FOUNDERS - GLOBAL", "bg": "#0d0d0d", "accent": "#ffffff", "sub": "#a3a3a3"},
  {"id": "modern-wisdom", "name": "Modern Wisdom", "host": "Chris Williamson", "tag": "BOOKS - IDEAS", "bg": "#171717", "accent": "#fbbf24", "sub": "#d6ccba"},
  {"id": "naval", "name": "Naval", "host": "Naval Ravikant", "tag": "WEALTH - WISDOM", "bg": "#0f172a", "accent": "#93c5fd", "sub": "#d6ccba"},
  {"id": "the-ranveer-show", "name": "The Ranveer Show", "host": "Ranveer Allahbadia", "tag": "INDIA - CONVERSATIONS", "bg": "#1e130a", "accent": "#fdba74", "sub": "#d6ccba"},
  {"id": "huberman-lab", "name": "Huberman Lab", "host": "Andrew Huberman", "tag": "SCIENCE - HEALTH", "bg": "#0b192c", "accent": "#38bdf8", "sub": "#d6ccba"},
  {"id": "hidden-brain", "name": "Hidden Brain", "host": "Shankar Vedantam", "tag": "SCIENCE - MIND", "bg": "#1a1226", "accent": "#c084fc", "sub": "#d6ccba"},
  {"id": "on-purpose", "name": "On Purpose", "host": "Jay Shetty", "tag": "MIND - HABITS", "bg": "#191c14", "accent": "#a3e635", "sub": "#d6ccba"}
]

os.makedirs("/home/user/thesmallbook/assets/podcasts", exist_ok=True)

for s in shows:
    name_esc = html.escape(s["name"])
    host_esc = html.escape(s["host"])
    tag_esc = html.escape(s["tag"])
    accent = s["accent"]
    bg = s["bg"]
    sub = s["sub"]
    
    words = s["name"].split()
    if len(words) > 3:
        mid = len(words) // 2
        line1 = html.escape(" ".join(words[:mid]))
        line2 = html.escape(" ".join(words[mid:]))
        title_svg = (
            f'<text x="32" y="215" font-family="\'Space Grotesk\', sans-serif" font-weight="900" font-size="28" fill="#ffffff">{line1}</text>\n'
            f'<text x="32" y="255" font-family="\'Space Grotesk\', sans-serif" font-weight="900" font-size="28" fill="{accent}">{line2}</text>'
        )
    else:
        title_svg = f'<text x="32" y="235" font-family="\'Space Grotesk\', sans-serif" font-weight="900" font-size="34" fill="#ffffff">{name_esc}</text>'

    badge_width = int(len(s["tag"]) * 8.2 + 24)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <radialGradient id="glow_{s['id']}" cx="75%" cy="25%" r="65%">
      <stop offset="0%" stop-color="{accent}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="{bg}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="{bg}"/>
  <rect width="400" height="400" fill="url(#glow_{s['id']})"/>
  
  <rect x="12" y="12" width="376" height="376" fill="none" stroke="{accent}" stroke-width="3" rx="16"/>
  
  <rect x="32" y="36" width="{badge_width}" height="26" rx="13" fill="{accent}"/>
  <text x="44" y="53" font-family="'Space Grotesk', sans-serif" font-weight="800" font-size="10" fill="#0d0d0d" letter-spacing="1">{tag_esc}</text>
  
  <g transform="translate(320, 36)">
    <circle cx="18" cy="18" r="18" fill="rgba(255,255,255,0.08)" stroke="{accent}" stroke-width="1.5"/>
    <path d="M18 10a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0v-4a4 4 0 0 0-4-4z" fill="{accent}"/>
    <path d="M11 17a7 7 0 0 0 14 0M18 24v4M14 28h8" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round"/>
  </g>
  
  {title_svg}
  
  <line x1="32" y1="295" x2="368" y2="295" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
  
  <text x="32" y="328" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="11" fill="{sub}" letter-spacing="1">HOST</text>
  <text x="32" y="356" font-family="'Space Grotesk', sans-serif" font-weight="800" font-size="18" fill="{accent}">{host_esc}</text>
</svg>"""

    p = f"/home/user/thesmallbook/assets/podcasts/{s['id']}.svg"
    with open(p, "w", encoding="utf-8") as f:
        f.write(svg)

print("Generated all 19 podcast SVGs successfully.")
