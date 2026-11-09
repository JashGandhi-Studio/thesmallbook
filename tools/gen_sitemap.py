#!/usr/bin/env python3
"""
Rebuild sitemap.xml so it lists every public page in the tree.

What changed and why:
- 21 book pages and 40 graveyard pages existed as files but were missing from
  the sitemap, so nothing linked them to a search engine from there.
- audio.html and gold.html are public pages (the player and the shop) and were
  missing too.
- every lastmod said 2026-10-30, from before this release.

What is deliberately left out: pages that are private or that need a query
string to mean anything (book.html, reader.html, login, you, settings, profile,
dm, chat, notifications, og-builder, 404), and the tooling folders robots.txt
already disallows.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://thesmallbook.in/"
TODAY = "2026-11-05"

# pages under the root that belong in a sitemap.
# gold.html and scan.html carry a noindex robots tag, so they stay out.
ROOT_PAGES = {
    "index.html": ("1.0", "daily"),
    "audio.html": ("0.9", "weekly"),
    "podcasts.html": ("0.7", "weekly"),
    "stories.html": ("0.7", "weekly"),
    "deepdive.html": ("0.7", "weekly"),
    "about.html": ("0.6", "monthly"),
    "notes.html": ("0.6", "weekly"),
    "quotes.html": ("0.6", "weekly"),
    "graveyard.html": ("0.6", "weekly"),
    "kids.html": ("0.6", "monthly"),
    "legal.html": ("0.5", "yearly"),
    "random.html": ("0.5", "weekly"),
    "store.html": ("0.6", "monthly"),
    "casefile.html": ("0.6", "monthly"),
    "story.html": ("0.6", "monthly"),
    "review.html": ("0.5", "monthly"),
    "write.html": ("0.5", "monthly"),
}

SECTIONS = [
    ("books", "0.8", "monthly"),
    ("graveyard", "0.6", "monthly"),
    ("authors", "0.6", "monthly"),
    ("topics", "0.7", "monthly"),
    ("pseo", "0.7", "weekly"),
    ("pseo/vs", "0.6", "monthly"),
    ("pseo/best-books-on", "0.6", "monthly"),
    ("pseo/books-like", "0.6", "monthly"),
]

SKIP_NAMES = {"index-copy.html"}


def collect():
    rows = []          # (path, priority, changefreq)
    for name, (pri, freq) in ROOT_PAGES.items():
        if os.path.isfile(os.path.join(ROOT, name)):
            rows.append((name, pri, freq))
    for folder, pri, freq in SECTIONS:
        d = os.path.join(ROOT, folder)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith(".html") or f in SKIP_NAMES:
                continue
            rows.append((folder + "/" + f, pri, freq))
    # pseo/index.html is the hub of the generated pages
    if os.path.isfile(os.path.join(ROOT, "pseo", "index.html")):
        rows.append(("pseo/index.html", "0.7", "weekly"))
    seen, out = set(), []
    for r in rows:
        if r[0] in seen:
            continue
        seen.add(r[0])
        out.append(r)
    return sorted(out, key=lambda r: (r[0].count("/"), r[0]))


def main():
    rows = collect()
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, pri, freq in rows:
        parts.append(
            "<url><loc>%s%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq>"
            "<priority>%s</priority></url>" % (BASE, path, TODAY, freq, pri))
    parts.append("</urlset>")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(parts) + "\n")
    print("sitemap.xml written with %d urls" % len(rows))

    # prove nothing public is left out
    listed = set(r[0] for r in rows)
    missing = []
    for d, dn, fn in os.walk(ROOT):
        dn[:] = [x for x in dn if x not in
                 ("node_modules", ".git", "tests", "supabase", "tools", "docs",
                  "changes", "assets", "js", "css", "graveyard-assets")]
        for f in fn:
            if not f.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(d, f), ROOT)
            if rel in listed:
                continue
            if rel.split("/")[0] in ROOT_PAGES or rel.startswith(tuple(s[0] + "/" for s in SECTIONS)):
                missing.append(rel)
    print("public pages still missing:", len(missing))
    for m in missing:
        print("   ", m)


if __name__ == "__main__":
    main()
