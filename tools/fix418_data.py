#!/usr/bin/env python3
"""Build 418 data repairs:
- theranos-board was a Katerra duplicate wearing a Theranos id. It is
  rewritten as the real Theranos board case, in failures.js and in
  GRAVE_DEEP (whose 'fall' held a second Katerra telling).
- Six more duplicate pairs (GoMechanic, General Magic, Dunzo,
  RadioShack, Byju's, MC Hammer) lose their second copy to six real,
  distinct cases that were missing: DeLorean, Zynga, Fitbit, GoPro,
  Faraday Future and Zirtual. The case count stays 559.
- Five Ask questions existed twice with different answers. They are
  merged: richer answer, union of keywords, books and graves.
Run from the repo root: python3 tools/fix418_data.py
Then regenerate shelves: python3 tools/regen418.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

BOOKS = json.loads(open("js/data.js", encoding="utf-8").read().split("\n", 1)[0].split("=", 1)[1].strip().rstrip(";"))
BY_ID = {b["id"]: b for b in BOOKS}


def pick_book(prefs):
    for p in prefs:
        if p in BY_ID:
            return p, BY_ID[p]["title"]
    raise SystemExit("no book found in " + str(prefs))


def load_failures():
    t = open("js/failures.js", encoding="utf-8").read()
    return t, json.loads(t[t.index("["):t.rindex("]") + 1])


def save_failures(t, arr):
    head = t[:t.index("[")]
    out = head + json.dumps(arr, ensure_ascii=False) + ";\n"
    open("js/failures.js", "w", encoding="utf-8").write(out)


CASES = {
    "delorean-motor": {
        "name": "DeLorean", "title": "The Stainless Steel Dream That Ran Out of Road",
        "year": "1982", "category": "BUSINESS", "emoji": "\U0001F697",
        "loss": "About $175M of other people's money, and the company in three years",
        "story": "John DeLorean walked out of General Motors to build the car of the future: stainless steel, gullwing doors, a factory in Northern Ireland paid for by the British government. The DMC-12 arrived late, underpowered and expensive to fix. DeLorean needed to sell about 25,000 cars a year and sold half that. With cash gone in 1982, John DeLorean was arrested in an FBI drug sting, acquitted later, but the company was already dead. The car became a star in Back to the Future in 1985, three years too late to save its maker.",
        "mistake": "Building the factory and the legend before proving that enough people would buy the car at the price it cost to make.",
        "lesson": "A famous founder and a beautiful product cannot outrun unit economics. Prove people will pay, at volume, before you build the cathedral.",
        "books": ["zero-to-one", "shoe-dog", "e-myth"],
        "origin": "John DeLorean was the youngest division head in GM history, the man behind the Pontiac GTO. In 1975 he left to found the DeLorean Motor Company, raised money on his name alone, and took British government funds to build a gleaming factory in Belfast, Northern Ireland. The DMC-12, styled by Giorgetto Giugiaro with gullwing doors and a stainless body, was unveiled to enormous press.",
        "fall": "The car cost far more to build than planned, its engine made 130 horsepower in a body that promised a sports car, and early build quality was poor. Sales ran at half the break-even rate. By October 1982 the money was gone; DeLorean was arrested in an FBI cocaine sting, and though a jury acquitted him on entrapment grounds, the company entered receivership and died with about 9,000 cars built.",
    },
    "zynga-games": {
        "name": "Zynga", "title": "The FarmVille King That Rented Its Land",
        "year": "2013", "category": "TECH", "emoji": "\U0001F33E",
        "loss": "About 85% of a $10B valuation in a single year",
        "story": "FarmVille put 80 million farmers inside Facebook in 2009, and Zynga's 2011 IPO valued the company near $10 billion. But Zynga owned no land: its players, its payments and its free advertising all lived inside Facebook's feed. When Facebook changed the rules in 2012 and players moved to phones, where Zynga was late, the crops died in a season. The stock lost most of its value in a year, studios closed, and the king of social games became a tenant farmer with no farm.",
        "mistake": "Confusing distribution borrowed from a platform with a business of its own, then failing to follow its players to mobile.",
        "lesson": "If one partner controls your customers, your growth is a loan, not an asset. Build on rented land only while you buy your own.",
        "books": ["innovators-dilemma", "the-innovators-dilemma", "hooked", "lean-startup"],
        "origin": "Founded in 2007, Zynga industrialised the Facebook game: FarmVille, CityVille and Words With Friends turned friend lists into distribution, and 'social virality' into hundreds of millions of players. At its 2011 IPO Zynga was valued around $10 billion and at one point drove a double-digit share of Facebook's entire revenue through its games and payment fees.",
        "fall": "In 2012 Facebook throttled game spam in the feed and players moved to smartphones, where Zynga's web-first games arrived late and weak. Player counts and bookings fell off a cliff; the share price dropped from about $15 to under $3 within a year of the IPO. Zynga closed studios, laid off staff in waves, and never again owned its audience, eventually selling to Take-Two in 2022 for $12.7 billion as a much smaller mobile studio.",
    },
    "fitbit-fade": {
        "name": "Fitbit", "title": "The Wrist King Squeezed From Both Ends",
        "year": "2021", "category": "TECH", "emoji": "\u231A",
        "loss": "Over 90% of its peak value before selling to Google",
        "story": "Fitbit created the fitness tracker, sold 100 million devices and reached the New York Stock Exchange in 2015 worth billions. Then the squeeze came from both ends: the Apple Watch took the premium wrist with a real platform and app store, while Xiaomi took the cheap wrist for a tenth of the price. Fitbit's answer, its own smartwatch and subscription, arrived late and thin. The stock fell over 90% from its peak, and Google bought what was left in 2021 for $2.1 billion.",
        "mistake": "Owning a feature, not a platform: a step counter is one sensor in someone else's computer, and features get absorbed.",
        "lesson": "When your whole product can become one icon on a bigger device, your lead is a countdown. Move up into services and software before the platform arrives.",
        "books": ["crossing-the-chasm", "competing-against-luck", "innovators-dilemma", "the-innovators-dilemma"],
        "origin": "Fitbit launched its first tracker in 2009 and effectively invented the modern wearable: clip it on, count steps, sync the graph. By its 2015 IPO it had sold tens of millions of devices, owned most of the fitness band market, and its shares nearly doubled on debut as investors crowned it the king of the wrist.",
        "fall": "The Apple Watch launched the same year and climbed from above, while Xiaomi's $15 bands climbed from below. Fitbit's smartwatch push stumbled (its Ionic was recalled after burn reports years later), its app ecosystem stayed thin, and device margins shrank. From a peak above $50 the stock slid under $5; Google acquired Fitbit in 2021 for $2.1 billion, a fraction of what the wrist had once been worth.",
    },
    "gopro-peak": {
        "name": "GoPro", "title": "The Action Camera That Tried to Be Everything",
        "year": "2016", "category": "TECH", "emoji": "\U0001F4F9",
        "loss": "Roughly 90% of its market value in two years",
        "story": "Nick Woodman printed money with HERO cameras: surfers, skiers and skydivers filmed themselves, and the footage sold the next camera. GoPro's 2014 IPO valued it near $10 billion. Then phones learned to swim, every new HERO looked like the last one, and GoPro spent its profit chasing a media empire and a drone, Karma, which was recalled in 2016 after drones fell from the sky. The stock lost about 90% in two years. GoPro survived, smaller and humbler, as a camera company again.",
        "mistake": "Believing the brand entitled it to new categories (media, drones) while its one great product quietly commoditised.",
        "lesson": "A beloved niche product is a business, not a launchpad by default. Defend the core first; expansion spends the trust the core earned.",
        "books": ["shoe-dog", "e-myth", "the-lean-startup", "lean-startup"],
        "origin": "Nick Woodman, a surfer who sewed prototype camera straps in his van, turned GoPro into the defining action camera of the 2010s. User footage was free marketing of the best kind, margins were fat, and the 2014 IPO briefly valued the company around $10 billion with Nick Woodman celebrated as America's best-paid CEO.",
        "fall": "Smartphone cameras got waterproof, rivals got cheap, and HERO upgrades gave owners little reason to rebuy. GoPro poured money into a media division that never made media money, then recalled its Karma drone in November 2016 after units lost power mid-flight. Layoffs followed in waves, the entertainment unit closed, and the shares fell from over $90 to single digits. GoPro lived, but as a focused camera firm, not an empire.",
    },
    "faraday-future": {
        "name": "Faraday Future", "title": "The Billion Dollar Unveiling With No Factory",
        "year": "2023", "category": "STARTUP", "emoji": "\u26A1",
        "loss": "Billions raised; a few hundred cars delivered in a decade",
        "story": "Faraday Future unveiled concept cars like spaceships, promised a $1 billion Nevada factory and hired talent from Tesla, BMW and Apple. The money came from Jia Yueting, whose own LeEco empire then imploded, taking Faraday's funding with it. The factory was cancelled, executives fled, the SEC came asking questions, and the company spent years one payroll from death. Its FF 91 finally reached a handful of buyers in 2023, priced at $309,000, nearly a decade and billions of dollars after the fireworks.",
        "mistake": "Spending on spectacle, scale and salaries before a single production car existed to sell.",
        "lesson": "In hardware, theatre is not progress. The only milestone that pays is a product a customer can buy, everything before that is debt wearing a costume.",
        "books": ["the-hard-thing", "zero-to-one", "measure-what-matters"],
        "origin": "Founded in California in 2014 and bankrolled by Chinese billionaire Jia Yueting, Faraday Future promised to out-Tesla Tesla: a variable platform, a 1,050 horsepower FF 91, and a $1 billion factory in Nevada. Its CES spectacles drew global press, and it hired hundreds of engineers from incumbent carmakers and Silicon Valley.",
        "fall": "Jia Yueting's LeEco collapsed in 2017 and the money stopped. Nevada kept its incentives, the factory site stayed desert, suppliers sued, executives left in rotation, and the SEC investigated the SPAC merger that had briefly refilled the till. Faraday delivered its first FF 91s in 2023 at $309,000 apiece, in double-digit numbers, the most expensive slow-motion launch in EV history.",
    },
    "zirtual-vanish": {
        "name": "Zirtual", "title": "The Startup That Switched Off Overnight",
        "year": "2015", "category": "STARTUP", "emoji": "\U0001F4CB",
        "loss": "About 400 jobs in a day; clients locked out overnight",
        "story": "Zirtual gave busy founders a US-based virtual assistant for a monthly fee, grew to about 400 staff, and looked like the tidy future of remote work. Then, on August 10 2015, clients got an email: operations were 'paused', effective immediately. The books showed the company was burning far more than its founders believed, payroll could not be met, and years of growth had been financed by hope. Startups.co bought the pieces and relaunched Zirtual smaller, with the same name and a hard lesson attached.",
        "mistake": "Growing headcount on vanity numbers while nobody reconciled what each assistant actually cost to deliver.",
        "lesson": "Know your burn multiple every single week. Companies rarely die from one bad month; they die from twelve months nobody added up.",
        "books": ["e-myth", "the-lean-startup", "lean-startup", "built-to-sell"],
        "origin": "Maren Kate Donovan founded Zirtual in 2011 to give entrepreneurs trained, US-based virtual assistants by subscription. It raised several million dollars, hired to roughly 400 people, won glowing press as a flagship of the remote-work wave, and expanded into new service lines while its founders spoke the language of inevitable scale.",
        "fall": "Behind the growth, Zirtual's delivered hours cost more than its subscriptions collected, and its books mixed up burn in ways nobody caught for months. In August 2015 the company emailed clients that it was pausing all operations immediately; staff lost their jobs the same week. Acquired by Startups.co, Zirtual relaunched at a fraction of its size. The category was real. The arithmetic was not.",
    },
}

REPLACE = {
    "gomechanic-fraud": "delorean-motor",
    "gowork-gm": "zynga-games",
    "dunzo-collapse": "fitbit-fade",
    "colonial-parkinson": "gopro-peak",
    "byjus-empire": "faraday-future",
    "hammer-broke": "zirtual-vanish",
}


def main():
    t, arr = load_failures()
    byid = {f["id"]: f for f in arr}

    # --- Theranos: the board case was real, its story was Katerra's ---
    th = byid["theranos-board"]
    th["name"] = "Theranos"
    th["title"] = "A Board of Generals With Not One Scientist"
    th["story"] = ("Theranos promised 200 blood tests from one drop of blood, and Elizabeth Holmes "
                   "filled her board with two secretaries of state, two senators, generals and a former CDC director, "
                   "prestige instead of expertise. The Edison machines rarely worked; most tests quietly ran on "
                   "modified Siemens analysers, and results sent to real patients were sometimes dangerously wrong. "
                   "John Carreyrou's 2015 Wall Street Journal investigation, and whistleblowers Tyler Shultz and "
                   "Erika Cheung, pulled the thread. The SEC charged fraud in 2018, Theranos dissolved, and Holmes "
                   "was convicted in 2022 and sentenced to over 11 years in prison.")
    th["year"] = "2018"
    th["category"] = "FRAUD"
    th["emoji"] = "\U0001FA78"
    th["loss"] = "A $9B valuation to zero; Holmes jailed for 11+ years"
    th["mistake"] = "Governance as decoration: a board hired to impress investors instead of directors able to test the one claim the company stood on."
    th["lesson"] = "Ask who in the room can say 'show me'. A board that cannot interrogate the core technology is not oversight, it is marketing."
    if "book" in th:
        bid, bt = pick_book(["bad-blood", "the-innovators-dilemma", "innovators-dilemma"])
        th["book"], th["bookTitle"] = bid, bt

    # --- six second copies become six real cases ---
    for old, new in REPLACE.items():
        c = CASES[new]
        if old not in byid:
            continue
        e = byid[old]
        bid, bt = pick_book(c["books"])
        e.clear()
        e.update({"id": new, "name": c["name"], "title": c["title"], "year": c["year"],
                  "category": c["category"], "emoji": c["emoji"], "loss": c["loss"],
                  "story": c["story"], "mistake": c["mistake"], "lesson": c["lesson"],
                  "book": bid, "bookTitle": bt})
    save_failures(t, arr)

    # --- GRAVE_DEEP: fix theranos fall, rename the six keys ---
    gt = open("js/graveyard-content.js", encoding="utf-8").read()
    i = gt.index("window.GRAVE_DEEP")
    j = gt.index("{", i)
    depth, k = 0, j
    while True:
        ch = gt[k]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    deep = json.loads(gt[j:k + 1])
    deep["theranos-board"]["fall"] = (
        "The machines never did what the demos claimed. Internal lab staff raised alarms about "
        "inaccurate results while patients received real diagnoses from diluted samples run on "
        "other companies' equipment. After the 2015 Journal expose, Walgreens and Safeway walked, "
        "regulators banned Elizabeth Holmes from the lab business, the SEC charged securities fraud in 2018, "
        "and Theranos dissolved that September. Holmes was convicted on four fraud counts in 2022; "
        "partner Sunny Balwani on twelve. The $9 billion valuation became zero.")
    for old, new in REPLACE.items():
        c = CASES[new]
        deep.pop(old, None)
        deep[new] = {"origin": c["origin"], "fall": c["fall"]}
    tail = gt[k + 1:]
    out = gt[:j] + json.dumps(deep, ensure_ascii=False, separators=(",", ":")) + tail
    open("js/graveyard-content.js", "w", encoding="utf-8").write(out)

    # --- Ask: five questions, asked twice, answered twice. Merge them. ---
    at = open("js/ask-data.js", encoding="utf-8").read()
    ask = json.loads(at[at.index("["):at.rindex("]") + 1])
    pairs = [("confidence", "become-confident"), ("leadership", "become-leader"),
             ("fear", "overcome-fear"), ("purpose", "find-purpose"), ("learning", "learn-fast")]
    aq = {q["id"]: q for q in ask}
    drop = set()
    for keep, dupe in pairs:
        if keep not in aq or dupe not in aq:
            continue
        a, b = aq[keep], aq[dupe]
        if len(b.get("answer", "")) > len(a.get("answer", "")):
            a["answer"] = b["answer"]
        seen = []
        for src in (a, b):
            for kw in src.get("keywords") or []:
                if kw not in seen:
                    seen.append(kw)
        a["keywords"] = seen
        bks, seenb = [], set()
        for src in (a, b):
            for bk in src.get("books") or []:
                bid = bk.get("id") if isinstance(bk, dict) else bk
                if bid not in seenb:
                    seenb.add(bid)
                    bks.append(bk)
        a["books"] = bks
        grv, seeng = [], set()
        for src in (a, b):
            for g in src.get("graves") or []:
                gid = REPLACE.get(g.get("id"), g.get("id"))
                if gid not in seeng:
                    seeng.add(gid)
                    grv.append({"id": gid, "blurb": g.get("blurb") or ""})
        if grv:
            a["graves"] = grv
        drop.add(dupe)
    ask = [q for q in ask if q["id"] not in drop]
    open("js/ask-data.js", "w", encoding="utf-8").write(
        "window.TSB_ASK_DATA = " + json.dumps(ask, ensure_ascii=False, indent=1) + ";\n")

    print("failures:", len(arr), "deep:", len(deep), "ask:", len(ask))
    print("renamed:", REPLACE)


if __name__ == "__main__":
    main()
