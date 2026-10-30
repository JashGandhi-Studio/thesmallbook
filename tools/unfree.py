"""v336: say less about price. The access model is unchanged; the copy just
stops leaning on the word "free". Safe to re-run (every swap is exact)."""
import os, re, sys
MAP = [
 ("Searchable, filterable, free to read - they paid billions; your lesson is free.", "Searchable, filterable, simple to read - they paid billions; you get the lesson."),
 ("<strong>FREE TO READ</strong>", "<strong>EIGHT MINUTES A BOOK</strong>"),
 ("It keeps the library free.", "It keeps the library going."),
 (" languages, free, with audio.", " languages, with audio."),
 (" languages - free, with audio.", " languages, with audio."),
 (" languages  -  free, with audio.", " languages, with audio."),
 ("&middot; free summary</span>", "&middot; small read</span>"),
 ("· free summary</u>", "· small read</u>"),
 ("The free summary covers", "The summary covers"),
 ("Every summary is free: lessons,", "Every summary has it all: lessons,"),
 ("free summaries &middot;", "8-minute summaries &middot;"),
 ("which free summary to read first", "which summary to read first"),
 ("which free summary to start with", "which summary to start with"),
 ("Free summaries, no paywall, audio in", "Clear summaries, audio in"),
 ("Both summaries are free, no paywall, in", "Both summaries are here, in"),
 ("Read free, listen in your language.", "Read simply, listen in your language."),
 ("every one is free to read here, right now", "every one is ready to read here, right now"),
 ("Both are free to read here, in full, right now.", "Both are here to read, in full, right now."),
 ("the fatal mistake and the free lesson", "the fatal mistake and the lesson"),
 ("Every summary free.", "Every summary, eight minutes."),
 (" · Free to read</p>", " · Simple to read</p>"),
]
SKIP_DIRS = {"node_modules", ".git", "tests", "data"}
SKIP_FILES = {"js/data-full.js", "js/data.js", "tools/unfree.py"}
def files(root):
    for d, ds, fs in os.walk(root):
        ds[:] = [x for x in ds if x not in SKIP_DIRS]
        for f in fs:
            if f.endswith((".html", ".js", ".py", ".json", ".webmanifest", ".xml", ".txt")):
                p = os.path.relpath(os.path.join(d, f), root)
                if p not in SKIP_FILES: yield p
def run(root, maps=MAP, verbose=True):
    tot = {}
    for p in files(root):
        fp = os.path.join(root, p)
        try: s = open(fp, encoding="utf-8").read()
        except Exception: continue
        o = s
        for a, b in maps:
            n = s.count(a)
            if n: s = s.replace(a, b); tot[a] = tot.get(a, 0) + n
        if s != o: open(fp, "w", encoding="utf-8").write(s)
    if verbose:
        for a, n in sorted(tot.items(), key=lambda x: -x[1]): print("%6d  %s" % (n, a[:70]))
    return tot
if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else ".")

MAP2 = [
 # app.js / film / auth
 ("they paid full price · your lesson is free", "they paid full price · you keep the lesson"),
 ("synced. Free, 1 tap.</p>", "synced. One tap.</p>"),
 ("<p class=\"tsb-sheet__fine\">Free to read. No card.</p>", "<p class=\"tsb-sheet__fine\">No card. One tap.</p>"),
 ("honest, warm and free to read.</p>", "honest, warm and easy to read.</p>"),
 ("(signed ? \"Manage\" : \"Free\")", "(signed ? \"Manage\" : \"1 tap\")"),
 ("Thank you for keeping the library free for everyone.", "Thank you for keeping the library going for everyone."),
 ("[\"Free to read\", \"Every book and every lesson.", "[\"Open to read\", \"Every book and every lesson."),
 ("It helps keep the library free to read.", "It helps keep the library going."),
 # ask
 ("The library itself stays free, every book, every lesson, forever.", "The library itself stays open, every book, every lesson."),
 ("The books stay free, every page, every lesson, forever.", "The books stay open, every page, every lesson."),
 ("'<h3>THE FREE DAY\\u2019S '", "'<h3>TODAY\\u2019S '"),
 ("so the free window is '", "so the daily window is '"),
 ("\" free today\"", "\" left today\""),
 ("\"free window used\"", "\"today's window used\""),
 # cheat sheets
 ("You have used your \" + allowance() + \" free cheat-sheets this month.", "You have used your \" + allowance() + \" cheat-sheets this month."),
 ("+ \" free sheets left (weekend bonus on)\"", "+ \" sheets left (weekend bonus on)\""),
 ("+ \" free sheets left\"", "+ \" sheets left this month\""),
 # book page / share
 (": free summary, no paywall. ", ": the 8-minute summary. "),
 (" Read online free.`", " Read it in 8 minutes.`"),
 ("+ LESSONS · FREE TO READ\"", "+ LESSONS · 8 MINUTES A BOOK\""),
 (", \"FREE\"];", ", \"8 MIN\"];"),
 ("\"📖 READ THE FULL BREAKDOWN - FREE\"", "\"📖 READ THE FULL BREAKDOWN\""),
 ("Experience the 3D book and free breakdown (", "Experience the 3D book and the breakdown ("),
 ("Drop a chai. Keeps the next lesson free.", "Drop a chai. Keeps the next lesson coming."),
 ("<b class=\"dd-card__free\">FREE SAMPLE</b>", "<b class=\"dd-card__free\">SAMPLE</b>"),
 (" · the library stays free, always</div>", " · the library stays open</div>"),
 ("A whole book in five honest lessons, free, offline-ready, in your language.", "A whole book in five honest lessons, offline-ready, in your language."),
 ("content=\"Free book summaries with lessons, examples and action ", "content=\"Book summaries with lessons, examples and action "),
 (" · 360 autopsies · free to read\"", " · 360 autopsies · 8 minutes a book\""),
 (" · 400 autopsies · Free to read", " · 400 autopsies · 8 minutes a book"),
 ("in your language, free, with audio.", "in your language, with audio."),
 # deep dives
 ("'· <b class=\"free\">FREE SAMPLE</b>'", "'· <b class=\"free\">SAMPLE</b>'"),
 ("Gold reads them all; the sample is free.", "Gold reads them all; anyone can read the sample."),
 ("The sample is free.\"", "Anyone can read the sample.\""),
 ("READ THE FREE SAMPLE FIRST", "READ THE SAMPLE FIRST"),
 ("The 600 books stay free, every lesson.", "The 600 books stay open, every lesson."),
 ("'<span class=\"dd-chip dd-chip--free\">Free sample</span>'", "'<span class=\"dd-chip dd-chip--free\">Sample</span>'"),
 ("Read the full breakdown free &rarr;", "Read the full breakdown &rarr;"),
 # dictate (visible)
 ("Listening, speak naturally (free · no sign-in), we’ll punctuate.", "Listening, speak naturally, we’ll punctuate."),
 ("\"Voice to text, free, no sign-in\"", "\"Voice to text, no sign-in\""),
 ("\"Voice to text, free & anonymous, no sign-in\"", "\"Voice to text, private, no sign-in\""),
 ("\"Dictation language, free voice typing,", "\"Dictation language, voice typing,"),
 ("\" • free voice typing\"", "\" • voice typing\""),
 # audio
 ("sub: \"full audiobook, free · LibriVox\"", "sub: \"full audiobook · LibriVox\""),
 ("we just point at the free shelves.", "we just point at the public shelves."),
 # dm / 404
 ("Sign in, it’s free<svg", "Sign in<svg"),
 ("Scurry back, the shelf is free to read.", "Scurry back, the shelf is waiting."),
 # gold page
 ("The free library stays free.\">", "The library stays open.\">"),
 ("The library stays <b>free to read</b>.", "The library stays <b>open to read</b>."),
 ("<b>Free to read</b> stays free.</p>", "The library stays open.</p>"),
 ("Free readers hear their phone's own voice.", "Everyone else hears their phone's own voice."),
 ("every one is a Gold read, the sample is free.", "every one is a Gold read, the sample is open."),
 (">FREE WITH GOLD</b>", ">INCLUDED WITH GOLD</b>"),
 ("▶</span> READ THE FREE SAMPLE</a>", "▶</span> READ THE SAMPLE</a>"),
 ("before free library.", "before everyone else."),
 ("🌊 FREE SAMPLE DEEP DIVE</span>", "🌊 SAMPLE DEEP DIVE</span>"),
 ("📖 READ FREE SAMPLE DEEP DIVE →", "📖 READ THE SAMPLE DEEP DIVE →"),
 (">2 FREE / MONTH</span>", ">2 A MONTH</span>"),
 ("Free users get 2 free sheets every month;", "Everyone gets 2 sheets every month;"),
 ("💎 FREE vs GOLD, SIDE BY SIDE", "💎 BASIC vs GOLD, SIDE BY SIDE"),
 # about (live copy, not the release log)
 ("TheSmallBook is a free library of 600 book summaries", "TheSmallBook is a library of 600 book summaries"),
 (" Free to read, no ads.\">", " No ads.\">"),
 ("The story behind the free library:", "The story behind the library:"),
 ("\"description\": \"Free library of 600 book summaries", "\"description\": \"A library of 600 book summaries"),
 ("Big books. Small reads. <strong>Free to read.</strong>", "Big books. Small reads. <strong>Eight minutes each.</strong>"),
 (">100% FREE</span>", ">8 MIN READS</span>"),
 ("<p>A <strong>free library of the world's best", "<p>A <strong>library of the world's best"),
 ("No paywall. A free account, only so your shelf and progress save.", "An account, only so your shelf and progress save."),
 ("Here, your tuition is free.</p>", "Here, you keep the lesson.</p>"),
 ("every lesson free, readable in a chai break,", "every lesson readable in a chai break,"),
 ("Everything inside <span class=\"hl\">(all free)</span>", "Everything inside"),
 ("our buy buttons keep this free.</p>", "our buy buttons keep this going.</p>"),
 ("📚 START READING, IT'S FREE</a>", "📚 START READING</a>"),
 ("MUMBAI, INDIA · FREE TO READ ·", "MUMBAI, INDIA · EIGHT MINUTES A BOOK ·"),
 ("<strong>Free to read.</strong> Every book, every lesson, every", "<strong>Open to read.</strong> Every book, every lesson, every"),
 ("the free account just saves your shelf.", "the account just saves your shelf."),
 ("The buy buttons keep this library free.", "The buy buttons keep this library going."),
]
if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else ".", MAP2)
