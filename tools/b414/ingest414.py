#!/usr/bin/env python3
"""Build 414 ingest: 50 new books, 29 new graves, de-repetition, deepening.
Idempotent: safe to re-run; asserts the full contract at the end."""
import json, os, re, sys, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
MODS = {}
def load(name):
    mod = {}
    exec(open(f"tools/b414/{name}.py", encoding="utf-8").read(), mod)
    return mod

# ---------------- candidate books (50 final) ----------------
EXCLUDE = {"when-breath-becomes-air", "being-mortal", "alchemist", "daring-greatly",
           "nonviolent-communication", "prophet", "mans-search-for-meaning",
           "essential-rumi", "difficult-conversations"}
books = {}
for f in sorted(glob.glob("tools/b414/books_*.py")):
    fname = os.path.basename(f)
    mod = {}
    code = open(f, encoding="utf-8").read()
    assert "\u2014" not in code and "\u2013" not in code, f"dash in {fname}"
    exec(code, mod)
    MODS[fname] = mod
    for b in mod.get("BOOKS", []):
        if b["id"] not in EXCLUDE:
            books.setdefault(b["id"], b)
    for bid, ls in mod.get("EXTRA", {}).items():
        if bid in books and bid not in EXCLUDE:
            books[bid]["lessons"].extend(ls)
for f in ["topup1", "topup2", "topups_originals"]:
    mod = load(f)
    for bid, ls in mod["TOPUP"].items():
        assert bid in books, f"topup for unknown book {bid}"
        books[bid]["lessons"].extend(ls)

DELETES = {
 "attached": ["Attachment Is a Dance, Not a Diagnosis", "Jealousy Is Information, Not a Verdict"],
 "men-are-from-mars": ["The Martian and Venusian Phrasebook", "Martian and Venusian Communication Styles", "Why the Metaphor Breaks and Where It Still Helps"],
 "love-languages": ["How to Discover Your Language Without a Quiz", "When Languages Mismatch: The Translation Problem"],
}
for bid, titles in DELETES.items():
    if bid in books:
        before = len(books[bid]["lessons"])
        books[bid]["lessons"] = [l for l in books[bid]["lessons"] if l["title"] not in titles]
        got = before - len(books[bid]["lessons"])
        assert got == len(titles), f"{bid}: deleted {got} of {len(titles)}"
for b in books.values():
    assert len(b["lessons"]) == 8, f'{b["id"]}: {len(b["lessons"])} lessons'
assert len(books) == 50, f"{len(books)} candidate books"
ORIGINALS = {"second-act-advantage", "grandparents-handbook-2", "phone-free-childhood", "loneliness-cure", "slow-web-manifesto"}
REPL = {"seven-principles-marriage", "into-thin-air", "yes-to-life", "atlas-of-the-heart", "this-is-going-to-hurt", "year-of-magical-thinking", "midnight-library"}

# ---------------- data-full.js ----------------
src = open("js/data-full.js", encoding="utf-8").read()
arr = json.loads(src[src.index("["):src.index("];\nif") + 1])
byid = {b["id"]: b for b in arr}
assert len(arr) == 600, len(arr)
for bid, titles in DELETES.items():
    if bid in byid:  # book-you-wish lives in the base library
        byid[bid]["lessons"] = [l for l in byid[bid]["lessons"] if l["title"] not in titles]
# deepen 55 thin books
deepen = {}
for f in ["deepen1", "deepen2", "deepen3"]:
    mod = load(f)
    for bid, ls in mod["DEEPEN"].items():
        if ls: deepen[bid] = ls
assert len(deepen) == 55, len(deepen)
for bid, ls in deepen.items():
    assert bid in byid, bid
    have = {l["title"] for l in byid[bid]["lessons"]}
    byid[bid]["lessons"].extend(l for l in ls if l["title"] not in have)
new_ids = []
for b in books.values():
    b = dict(b)
    b.setdefault("cover", f'assets/covers/{b["id"]}.jpg')
    b.setdefault("edition", "Standard")
    if b["id"] in byid:
        byid[b["id"]].update(b)
    else:
        arr.append(b); byid[b["id"]] = b; new_ids.append(b["id"])
assert len(arr) == 650, len(arr)
lessons = sum(len(b["lessons"]) for b in arr)
assert lessons == 4853, lessons
out = "const BOOKS = " + json.dumps(arr, ensure_ascii=False, indent=2) + ";\nif (typeof window !== \"undefined\") window.BOOKS = BOOKS;\n"
open("js/data-full.js", "w", encoding="utf-8").write(out)

# ---------------- graves: failures.js + graveyard-content.js ----------------
graves = []
for f in ["graves_new", "graves_origin_fall", "graves_more"]:
    mod = load(f)
    graves.extend(mod["GRAVES"])
assert len(graves) == 29, len(graves)
CAT = {"ashley-madison-hack":"TRUST","playboy-decline":"FAME","gucci-family-war":"BUSINESS","medical-error":"TRUST","titanic-unsinkable":"HISTORY","holi-muzzafarnagar":"HISTORY","kumbh-mela-1954-stampede":"HISTORY","afghanistan-withdrawal":"HISTORY","rajneeshpuram-collapse":"TRUST","thalidomide":"TRUST","eugenics":"HISTORY","holocaust":"HISTORY","kerala-floods":"HISTORY","kashmir-widows":"HISTORY","colonial-famine":"HISTORY","slavery-abolition":"HISTORY","arctic-sea-ice":"HISTORY","marathon-cheaters":"EGO","harvey-weinstein":"FAME","lead-poisoning-children":"TRUST","blockbuster-late-fee":"BUSINESS","everest-1996-disaster":"HISTORY","grenfell-tower-2017":"TRUST","rana-plaza-2013":"BUSINESS","triangle-shirtwaist-1911":"HISTORY","dust-bowl-1930s":"HISTORY","great-smog-london-1952":"HISTORY","minamata-disease":"TRUST","takata-airbags":"BUSINESS"}
EMOJI = {"ashley-madison-hack":"🔓","playboy-decline":"🐰","gucci-family-war":"👞","medical-error":"🏥","titanic-unsinkable":"🚢","holi-muzzafarnagar":"🎨","kumbh-mela-1954-stampede":"🕉","afghanistan-withdrawal":"🛫","rajneeshpuram-collapse":"🧘","thalidomide":"💊","eugenics":"🧬","holocaust":"🕯","kerala-floods":"🌧","kashmir-widows":"🏔","colonial-famine":"🌾","slavery-abolition":"⛓","arctic-sea-ice":"🧊","marathon-cheaters":"🏃","harvey-weinstein":"🎬","lead-poisoning-children":"🎨","blockbuster-late-fee":"📼","everest-1996-disaster":"🏔","grenfell-tower-2017":"🏢","rana-plaza-2013":"👕","triangle-shirtwaist-1911":"🧵","dust-bowl-1930s":"🌪","great-smog-london-1952":"🌫","minamata-disease":"🐟","takata-airbags":"🚗"}
TITLE = {"ashley-madison-hack":"The Secret That Was Never Secret","playboy-decline":"The Empire the Internet Retired","gucci-family-war":"A Family Name at War With Itself","medical-error":"The Third Leading Cause Nobody Charts","titanic-unsinkable":"Unsinkable Was a Marketing Word","holi-muzzafarnagar":"When a Festival Turned on Its Neighbours","kumbh-mela-1954-stampede":"The Day the Pilgrims Ran Out of Road","afghanistan-withdrawal":"Twenty Years, One Runway","rajneeshpuram-collapse":"The Commune That Became a Crime Scene","thalidomide":"The Pill That Trusted the Market","eugenics":"When Science Gave Bigotry a Lab Coat","holocaust":"The Machinery of Murder, Administered","kerala-floods":"The Year the Rains Stopped Asking","kashmir-widows":"The Half-Widows Nobody Counts","colonial-famine":"Hunger, Administered by Policy","slavery-abolition":"The Property That Was People","arctic-sea-ice":"The White Map Shrinks","marathon-cheaters":"The Finishing Line They Never Crossed","harvey-weinstein":"The Open Secret With an Office","lead-poisoning-children":"The Poison in the Paint and the Petrol","blockbuster-late-fee":"The Late Fee That Ate an Empire","everest-1996-disaster":"Eight Lives Above 8,000 Metres","grenfell-tower-2017":"The Tower Everyone Was Warned About","rana-plaza-2013":"The Cheapest T-Shirt Ever Made","triangle-shirtwaist-1911":"Locked Doors, 146 Dead","dust-bowl-1930s":"The Decade the Sky Rained Dirt","great-smog-london-1952":"Five Days the City Could Not Breathe","minamata-disease":"The Cat Danced, Then the Town Understood","takata-airbags":"The Safety Device That Killed"}
LOSS = {"ashley-madison-hack":"37 million accounts dumped; lives and marriages destroyed","playboy-decline":"A 7 million circulation empire ended as a licensing logo","gucci-family-war":"One dynasty, one murder, a brand nearly buried by its owners","medical-error":"Hundreds of thousands of preventable deaths a year, mostly uncounted","titanic-unsinkable":"1,517 lives, and the word unsinkable retired forever","holi-muzzafarnagar":"A festival stained by communal violence","kumbh-mela-1954-stampede":"Hundreds of pilgrims crushed at the world's largest gathering","afghanistan-withdrawal":"Twenty years of war ended in thirteen days of chaos","rajneeshpuram-collapse":"751 poisoned, a city dissolved, a guru deported","thalidomide":"10,000 babies across 46 countries","eugenics":"Forced sterilisations blessed by courts and universities","holocaust":"Six million Jews and millions more murdered by a modern state","kerala-floods":"483 lives and a state's drainage exposed in one monsoon","kashmir-widows":"Thousands of women suspended between wifehood and widowhood","colonial-famine":"Tens of millions starved under administered scarcity","slavery-abolition":"Centuries of human beings held as property","arctic-sea-ice":"A summer sea disappearing within living memory","marathon-cheaters":"Finish lines crossed by subway, car and borrowed bibs","harvey-weinstein":"A studio system that protected its predator for decades","lead-poisoning-children":"A century of children poisoned by paint and petrol","blockbuster-late-fee":"9,000 stores and 60 million members, gone in a decade","everest-1996-disaster":"Eight climbers dead in one night, including both lead guides","grenfell-tower-2017":"72 lives in one tower, every warning on file","rana-plaza-2013":"1,134 garment workers dead in a building that had been evacuated the day before","triangle-shirtwaist-1911":"146 workers, mostly young women, behind locked doors","dust-bowl-1930s":"300,000 people driven off the plains by the sky itself","great-smog-london-1952":"Thousands dead in five days of manufactured fog","minamata-disease":"A town poisoned by its own factory for 36 years","takata-airbags":"Millions of airbags recalled; drivers killed by the device meant to save them"}
linked = {}
for b in arr:
    linked.setdefault(b.get("graveLink"), []).append(b)
new_grave_ids = {g["id"] for g in graves}
for gid, bs in linked.items():
    if gid in new_grave_ids and len(bs) > 5:
        print(f"note: {gid} linked by {len(bs)} books")
failsrc = open("js/failures.js", encoding="utf-8").read()
fails = json.loads(failsrc[failsrc.index("["):failsrc.rindex("]") + 1])
have_fail = {f["id"] for f in fails}
assert len(fails) == 412, len(fails)
def sents(text, n):
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(parts[:n])
for g in graves:
    if g["id"] in have_fail: continue
    bs = linked.get(g["id"], [])
    first = bs[0] if bs else {}
    fails.append({"id": g["id"], "name": g["name"], "title": TITLE[g["id"]], "year": str(g["failed"]),
                  "category": CAT[g["id"]], "emoji": EMOJI[g["id"]], "loss": LOSS[g["id"]],
                  "story": g["summary"], "mistake": g["mistakes"], "lesson": g["lessons"],
                  "book": first.get("id", ""), "bookTitle": first.get("title", "")})
assert len(fails) == 441, len(fails)
open("js/failures.js", "w", encoding="utf-8").write(
    "window.FAILURES = " + json.dumps(fails, ensure_ascii=False) + ";\n")
# GRAVE_DEEP origin/fall for the 29
gc = open("js/graveyard-content.js", encoding="utf-8").read()
def balanced(text, start):
    depth, instr, esc = 0, False, False
    for i in range(start, len(text)):
        c = text[i]
        if instr:
            if esc: esc = False
            elif c == chr(92): esc = True
            elif c == '"': instr = False
        elif c == '"': instr = True
        elif c in "{[": depth += 1
        elif c in "}]":
            depth -= 1
            if depth == 0: return text[start:i + 1]
    raise ValueError("unbalanced")
deep = json.loads(balanced(gc, gc.index("{", gc.index("window.GRAVE_DEEP"))))
assert len(deep) == 530, len(deep)
for g in graves:
    if g["id"] in deep: continue
    origin = sents(g["summary"], 4)
    fall = sents(g["summary"], 99)[len(sents(g["summary"], 4)):].strip() + " " + sents(g["mistakes"], 3)
    deep[g["id"]] = {"origin": origin, "fall": fall}
assert len(deep) == 559, len(deep)
open("js/graveyard-content.js", "w", encoding="utf-8").write(
    "window.GRAVE_DEEP = " + json.dumps(deep, ensure_ascii=False, separators=(",", ":")) + ";\n")

# ---------------- graveLink de-repetition ----------------
failids = {f["id"] for f in fails}
byname = sorted(fails, key=lambda f: f["name"].lower())
score = {b["id"]: b for b in arr}
def themes(text):
    words = {w for w in re.findall(r"[a-z]{5,}", text.lower()) if len(w) >= 5}
    stop = {"about", "after", "their", "there", "these", "those", "which", "would", "could", "should", "because", "through", "between", "people", "really", "little", "always", "never", "every", "first", "other", "being", "where", "while", "years", "world", "story", "learn", "learns"}
    return words - stop
grave_text = {}
for f in fails:
    d = deep.get(f["id"], {})
    grave_text[f["id"]] = themes(f["name"] + " " + f["title"] + " " + f["story"] + " " + (d.get("origin", "") + " " + d.get("fall", "")))
from collections import Counter
cnt = Counter(b["graveLink"] for b in arr)
def btext(b):
    return themes(b["title"] + " " + b.get("tagline", "") + " " + b.get("oneLiner", "") + " " + b.get("bigIdea", "") + " " + " ".join(l["title"] for l in b["lessons"]))
def fit(b, gid):
    return len(btext(b) & grave_text[gid])
MANUAL = {"alchemy-rory-sutherland":"ceasefire-fade","the-sovereign-individual":"india-1991","the-reputation-audit":"alma-mater","animal-farm":"stalin-gulag","siddhartha":"kerala-floods"}
used_new = set(new_ids) | REPL
for b in arr:
    pass
def remap():
    eligible = [b for b in arr if b["id"] not in used_new]
    order = sorted(eligible, key=lambda b: (fit(b, b["graveLink"]), b["id"]))
    remapped = 0
    for b in order:
        if cnt[b["graveLink"]] > 2:
            cur = b["graveLink"]
            cands = sorted(failids, key=lambda g: (-fit(b, g), g))
            target = None
            for g in cands:
                if g != cur and cnt[g] < 2 and fit(b, g) > 0:
                    target = g; break
            if target is None:
                for g in cands:
                    if g != cur and cnt[g] < 2:
                        target = g; break
            if target is None: continue
            cnt[cur] -= 1; cnt[target] += 1
            b["graveLink"] = target; remapped += 1
    return remapped
n_remap = remap()
# pass 2: cap every grave at 2 books, new books included; move the weakest fits
moved2 = 0
while True:
    over = [g for g, c in cnt.items() if c > 2]
    if not over: break
    progress = False
    for gid in over:
        holders = [b for b in arr if b["graveLink"] == gid]
        holders.sort(key=lambda b: fit(b, gid))
        for b in holders:
            if cnt[gid] <= 2: break
            cands = sorted(failids, key=lambda g: (-fit(b, g), g))
            target = None
            for g in cands:
                if g != gid and cnt[g] < 2 and fit(b, g) > 0:
                    target = g; break
            if target is None: continue
            cnt[gid] -= 1; cnt[target] += 1
            b["graveLink"] = target; moved2 += 1; progress = True
    if not progress: break
print(f"pass2 moved {moved2}; graves still over cap: {[g for g, c in cnt.items() if c > 2]}")
for bid, gid in MANUAL.items():
    if bid in byid and gid in failids:
        old = byid[bid]["graveLink"]
        cnt[old] -= 1; cnt[gid] += 1; byid[bid]["graveLink"] = gid
# ensure first-linked book in grave book/bookTitle uses a real book when empty
for f in fails:
    if not f.get("book"):
        bs = linked.get(f["id"]) or [b for b in arr if b["graveLink"] == f["id"]]
        if bs: f["book"], f["bookTitle"] = bs[0]["id"], bs[0]["title"]
open("js/failures.js", "w", encoding="utf-8").write("window.FAILURES = " + json.dumps(fails, ensure_ascii=False) + ";\n")
out = "const BOOKS = " + json.dumps(arr, ensure_ascii=False, indent=2) + ";\nif (typeof window !== \"undefined\") window.BOOKS = BOOKS;\n"
open("js/data-full.js", "w", encoding="utf-8").write(out)

# ---------------- config.js freshness ----------------
cfg = open("js/config.js", encoding="utf-8").read()
def arr_block(text, key):
    m = re.search(re.escape(key) + r": \[\n(.*?)\n  \],", text, re.S)
    return [x.strip().strip(',').strip('"') for x in m.group(1).splitlines() if x.strip()]
ntw_old = arr_block(cfg, "NEW_THIS_WEEK")
keep = [x for x in ntw_old if x in byid and x not in new_ids]
def fmt(vals):
    return ",\n".join(f'    "{v}"' for v in vals)
V290_KEEP = ["barbarians-gate","bhujia-barons","cold-start-problem","delivering-happiness","den-of-thieves","desi-disruptors","dhandha","first-90-days","for-the-love-of-india","hooked-nir-eyal","hp-way","iacocca","india-uninc","inspired-product","it-happened-in-india","jack-straight-from-the-gut","liars-poker","losing-my-virginity","lost-and-founder","made-in-japan","my-years-with-general-motors","obviously-awesome","onward","smartest-guys","the-marwaris","too-big-to-fail","toyota-way","turn-the-ship-around"]
V291_KEEP = ["chai-stall-ceo","crickets-balance-sheet","mandi-math","monsoon-portfolio","quiet-giant","rented-kingdom","right-idea-wrong-decade","tiffin-code","the-queue","wedding-economy"]
CARRY_KEEP = ["the-kirana-ledger","the-zero-discount-diner","the-first-hundred-patrons","the-midnight-dispatch","the-silent-partner-tax","the-unclaimed-shelf","the-reputation-audit","the-apprentice-hour","the-founders-warranty","the-patient-capitalist","the-intellectuals-and-society","zen-mind-beginners-mind"]
ntw = (new_ids + [x for x in V291_KEEP + V290_KEEP + CARRY_KEEP if x in byid and x not in new_ids] + keep)[:100]
cfg = re.sub(r'(NEW_THIS_WEEK: \[\n).*?(\n  \],)', lambda m: m.group(1) + fmt(ntw) + m.group(2), cfg, flags=re.S, count=1)
cfg = re.sub(r'(NEW_GRAVES_THIS_WEEK: \[\n).*?(\n  \],)', lambda m: m.group(1) + fmt([g["id"] for g in graves]) + m.group(2), cfg, flags=re.S, count=1)
m = re.search(r"(ORIGINALS: \[\n)(.*?)(\n  \],)", cfg, re.S)
orig = [x.strip().strip(',').strip('"') for x in m.group(2).splitlines() if x.strip()]
orig = orig + [o for o in sorted(ORIGINALS) if o not in orig]
cfg = cfg[:m.start()] + m.group(1) + fmt(orig) + m.group(3) + cfg[m.end():]
open("js/config.js", "w", encoding="utf-8").write(cfg)
assert len(orig) == 55 and len(ntw) == 100

# ---------------- scan titles + editions ----------------
open("js/scan-titles.js", "w", encoding="utf-8").write(
    "window.TSB_TITLES = " + json.dumps({b["id"]: b["title"] for b in arr}, ensure_ascii=False) + ";\n")
ej = [json.loads(l) for l in open("tools/editions/editions.jsonl", encoding="utf-8") if l.strip()]
have_e = {e["id"] for e in ej}
PAL = [("#8E0FF0", "#F6EFE2"), ("#F4F4ED", "#16130F"), ("#1967B1", "#F6EFE2"), ("#E5484D", "#FFF6E8"), ("#0B6B4F", "#F2FFF8"), ("#8A5A2B", "#FFF6E8")]
for b in arr:
    if b["id"] in have_e: continue
    bg, fg = PAL[sum(ord(c) for c in b["id"]) % len(PAL)]
    import zlib
    ej.append({"id": b["id"], "t": b["title"], "a": b["author"], "c": b["category"], "bg": bg, "fg": fg,
               "ac": bg, "tc": fg, "sq": False, "h": zlib.crc32(b["id"].encode()) % 2000000000,
               "file": b["id"] + ".jpg", "kind": "tsb-original" if b["id"] in ORIGINALS else "standard"})
with open("tools/editions/editions.jsonl", "w", encoding="utf-8") as fh:
    for e in ej: fh.write(json.dumps(e, ensure_ascii=False) + "\n")
cover_of = {e["id"]: e for e in ej}
assert all(b["id"] in cover_of for b in arr), [b["id"] for b in arr if b["id"] not in cover_of][:5]

# ---------------- covers: draw any missing cover from its edition palette ----------------
try:
    from PIL import Image, ImageDraw, ImageFont
    import textwrap as _tw
    _F1 = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; _F2 = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    def _font(sz, bold=True): return ImageFont.truetype(_F1 if bold else _F2, sz)
    for b in arr:
        path = b.get("cover") or f'assets/covers/{b["id"]}.jpg'
        if os.path.exists(path): continue
        e = cover_of[b["id"]]
        bg, fg = e.get("bg", "#F4F4ED"), e.get("fg", "#16130F")
        im = Image.new("RGB", (400, 600), bg); d = ImageDraw.Draw(im)
        d.text((30, 30), "THE SMALLBOOK", font=_font(10), fill=fg)
        y = 120
        for line in _tw.wrap(b["title"].upper(), 16)[:5]:
            d.text((30, y), line, font=_font(27), fill=fg); y += 34
        d.line((30, y + 14, 90, y + 14), fill=fg, width=4)
        au = b["author"] if not (b["author"].lower() == "unknown") else "THE SMALLBOOK ORIGINAL"
        d.text((30, 500), au.upper()[:26], font=_font(13), fill=fg)
        d.text((30, 528), b["category"].upper()[:26], font=_font(10, False), fill=fg)
        im.save(path, "JPEG", quality=90)
except Exception as ex:
    print("cover draw skipped:", ex)

# ---------------- covers for the 5 Originals (simple in-house art) ----------------
try:
    from PIL import Image, ImageDraw, ImageFont
    F1 = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; F2 = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    def font(sz, bold=True): return ImageFont.truetype(F1 if bold else F2, sz)
    art = {"second-act-advantage": ("THE\nSECOND ACT\nADVANTAGE", "#F6E9C8", "#181713", "#E5A83B", "sun"),
           "grandparents-handbook-2": ("THE\nGRANDPARENTS\nHANDBOOK", "#F7E3D4", "#241A15", "#BF6548", "houses"),
           "phone-free-childhood": ("THE PHONE-FREE\nCHILDHOOD", "#DFE8F4", "#162236", "#5278B8", "bench"),
           "loneliness-cure": ("THE\nLONELINESS\nCURE", "#F8DCE0", "#321921", "#C44F70", "line"),
           "slow-web-manifesto": ("THE SLOW WEB\nMANIFESTO", "#E0EDD6", "#172318", "#4F8E53", "garden")}
    for bid, (title, bg, ink, ac, kind) in art.items():
        path = f"assets/covers/{bid}.jpg"
        if os.path.exists(path): continue
        im = Image.new("RGB", (400, 600), bg); d = ImageDraw.Draw(im)
        d.rectangle((12, 12, 388, 588), outline=ink, width=5); d.rectangle((22, 22, 378, 578), outline=ink, width=1)
        d.text((36, 38), "THE SMALLBOOK", font=font(10), fill=ink); d.text((312, 38), "ORIGINAL", font=font(9), fill=ink)
        y = 92
        for line in title.split("\n"):
            d.text((36, y), line, font=font(30), fill=ink); y += 38
        d.line((36, y + 11, 104, y + 11), fill=ac, width=5)
        if kind == "sun":
            d.ellipse((150, 330, 250, 430), fill=ac)
        elif kind == "houses":
            d.rectangle((140, 370, 260, 460), fill="#FFF8E8", outline=ink, width=3); d.polygon([(130, 372), (200, 322), (270, 372)], fill=ac, outline=ink)
        elif kind == "bench":
            d.rounded_rectangle((110, 390, 290, 414), 5, fill=ac, outline=ink, width=3)
        elif kind == "line":
            d.line([(75, 400), (150, 350), (220, 410), (300, 360)], fill=ac, width=12, joint="curve")
        else:
            d.line((90, 460, 310, 460), fill=ink, width=3); d.ellipse((180, 350, 230, 400), fill=ac, outline=ink)
        d.text((36, 542), "WRITTEN IN-HOUSE", font=font(10), fill=ink); d.text((312, 542), "2026", font=font(10), fill=ink)
        im.save(path, "JPEG", quality=92)
except Exception as e:
    print("cover art skipped:", e)

# ---------------- final asserts ----------------
def depth(b): return sum(len((l.get("summary", "") + " " + l.get("example", "") + " " + l.get("action", "")).split()) for l in b["lessons"])
thin = [b["id"] for b in arr if depth(b) < 600]
print(f"books={len(arr)} lessons={lessons} fails={len(fails)} deep={len(deep)} new={len(new_ids)} remapped={n_remap} thin_below_600={len(thin)} {thin[:5]}")
print(f"max_books_per_grave={max(cnt.values())} graves_used={sum(1 for v in cnt.values() if v)}")
print(f"NTW={len(ntw)} NGW=29 ORIGINALS={len(orig)} editions={len(ej)}")
